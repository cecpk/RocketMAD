#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys

import configargparse
import configparser
import json
import logging
import math
import multiprocessing
import os
import pickle
import psutil
import re
import requests
import socket
import struct
import subprocess
import time

from collections import OrderedDict
from s2sphere import CellId, LatLng
from geopy.geocoders import Nominatim
from pathlib import Path
from requests import Session
from requests.packages.urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter
from haversine import haversine
from pprint import pformat
from time import strftime
from timeit import default_timer

log = logging.getLogger(__name__)


def read_pokemon_ids_from_file(f):
    pokemon_ids = set()
    for name in f:
        name = name.strip()
        # Lines starting with # or - mean: skip this Pokemon
        if name[0] in ('#', '-'):
            continue
        try:
            # Pokemon can be given as Pokedex ID
            pid = int(name)
        except ValueError:
            # Perform the usual name -> ID lookup
            pid = get_pokemon_id(str(name, 'utf-8'))
        if pid and not pid == -1:
            pokemon_ids.add(pid)
    return sorted(pokemon_ids)


def memoize(function):
    memo = {}

    def wrapper(*args):
        if args in memo:
            return memo[args]
        else:
            rv = function(*args)
            memo[args] = rv
            return rv
    return wrapper


@memoize
def get_args(access_config=None):
    # Pre-check to see if the -cf or --config flag is used on the command line.
    # If not, we'll use the env var or default value. This prevents layering of
    # config files as well as a missing config.ini.
    default_config_files = []
    if '-cf' not in sys.argv and '--config' not in sys.argv:
        default_config_files = [os.getenv('POGOMAP_CONFIG', os.path.join(
            os.path.dirname(__file__), '../config/config.ini'))]
    parser = configargparse.ArgParser(
        default_config_files=default_config_files,
        auto_env_var_prefix='POGOMAP_')

    parser.add_argument('-cf', '--config',
                        is_config_file=True, help='Set a configuration file.')
    parser.add_argument('-scf', '--shared-config',
                        is_config_file=True, help='Set a shared config file.')
    parser.add_argument('-acf', '--access-config',
                        help='Set a default access config file.')
    parser.add_argument('-al', '--access-logs',
                        help=("Write web logs to access.log."),
                        action='store_true', default=False)
    parser.add_argument('-H', '--host', help='Set web server listening host.',
                        default='127.0.0.1')
    parser.add_argument('-P', '--port', type=int,
                        help='Set web server listening port.', default=5000)
    parser.add_argument('-w', '--workers',
                        type=int, default=multiprocessing.cpu_count() * 2 + 1,
                        help='The number of worker processes for handling '
                             'requests. Generally in the 2-4 x {NUM_CORES} '
                             'range.')
    parser.add_argument('-ds', '--development-server',
                        action='store_true', default=False,
                        help='Use Flask’s built-in development server. '
                             'Don\'t use this in production.')
    parser.add_argument('-L', '--locale',
                        help=('Locale for Pokemon names (check '
                              'static/dist/locales for more).'),
                        default='en')
    parser.add_argument('-c', '--china',
                        help='Coordinates transformer for China.',
                        action='store_true')
    parser.add_argument('-C', '--cors', help='Enable CORS on web server.',
                        action='store_true', default=False)
    parser.add_argument('-cd', '--clear-db',
                        help=('Deletes the existing database before '
                              'starting the Webserver.'),
                        action='store_true', default=False)
    parser.add_argument('-l', '--location', required=True,
                        help='Location, can be an address or coordinates.')
    parser.add_argument('-np', '--no-pokemon',
                        help=('Disables Pokémon.'),
                        action='store_true', default=False)
    parser.add_argument('-npv', '--no-pokemon-values',
                        help='Disables pokemon values.',
                        action='store_true', default=False)
    parser.add_argument('-cr', '--catch-rates',
                        action='store_true',
                        help='Show catch rates for all three balls.')
    parser.add_argument('-sazl', '--show-all-zoom-level',
                        help=('Show all Pokemon, even excluded, at this map '
                              'zoom level. Set to 0 to disable this feature. '
                              'Set to 19 or higher for nice results.'),
                        type=int, default=0)
    parser.add_argument('-up', '--upscaled-pokemon',
                        default=None,
                        help='Pokémon IDs to upscale icons for. '
                             'Seperate IDs with commas.')
    parser.add_argument('-nphp', '--no-pokemon-history-page',
                        help='Disables pokemon history page.',
                        action='store_true', default=False)
    parser.add_argument('-ng', '--no-gyms',
                        help=('Disables Gyms.'),
                        action='store_true', default=False)
    parser.add_argument('-ngs', '--no-gym-sidebar',
                        help=('Disable the gym sidebar and toggle.'),
                        action='store_true', default=False)
    parser.add_argument('-ngf', '--no-gym-filters',
                        help=('Disables gym filters in side nav.'),
                        action='store_true', default=False)
    parser.add_argument('-nr', '--no-raids',
                        help=('Disables Raids.'),
                        action='store_true', default=False)
    parser.add_argument('-nrf', '--no-raid-filters',
                        help=('Disables raid filters in side nav.'),
                        action='store_true', default=False)
    parser.add_argument('-bwb', '--black-white-badges',
                        help='Use black/white background with white/black'
                             ' text for gym/raid level badge in gym icons.',
                        action='store_true', default=False)
    parser.add_argument('-nps', '--no-pokestops',
                        help=('Disables PokéStops.'),
                        action='store_true', default=False)
    parser.add_argument('-nq', '--no-quests',
                        help=('Disables Quests.'),
                        action='store_true', default=False)
    parser.add_argument('-qr', '--quest-reset-time',
                        default='00:00',
                        help='Only show quests scanned after this time.')
    parser.add_argument('-nqp', '--no-quest-page',
                        help='Disables quest page.',
                        action='store_true', default=False)
    parser.add_argument('-ni', '--no-invasions',
                        help=('Disables Team Rocket Invasions.'),
                        action='store_true', default=False)
    parser.add_argument('-nl', '--no-lures',
                        help=('Disables Lures.'),
                        action='store_true', default=False)
    parser.add_argument('-nw', '--no-weather',
                        help=('Disables Weather.'),
                        action='store_true', default=False)
    parser.add_argument('-ns', '--no-spawnpoints',
                        help=('Disables spawn points.'),
                        action='store_true', default=False)
    parser.add_argument('-nsl', '--no-scanned-locs',
                        help=('Disables scanned locations.'),
                        action='store_true', default=False)
    parser.add_argument('-nsc', '--no-s2-cells',
                        help=('Disables s2 cells.'),
                        action='store_true', default=False)
    parser.add_argument('-nrs', '--no-ranges',
                        help=('Disables user to show ranges.'),
                        action='store_true', default=False)
    parser.add_argument('-vdt', '--verified-despawn-time',
                        help='Show if pokemon despawn time is verified.',
                        action='store_true', default=False)
    parser.add_argument('-nss', '--no-stats-sidebar',
                        help=('Hides stats sidebar.'),
                        action='store_true', default=False)
    parser.add_argument('-thc', '--twelve-hour-clock',
                        help=('Display time with the 12-hour clock format.'),
                        action='store_true', default=False)
    parser.add_argument('-MO', '--motd',
                        action='store_true', default=False,
                        help='Shows a MOTD (Message of the Day) on visit.')
    parser.add_argument('-MOt', '--motd-title',
                        default='MOTD',
                        help='MOTD title, can be HTML.')
    parser.add_argument('-MOtxt', '--motd-text',
                        default=('Hi there! This is an easily customizable '
                                 'MOTD.'),
                        help='MOTD text, can be HTML.')
    parser.add_argument('-MOp', '--motd-pages',
                        nargs='+', default=['/', '/mobile'],
                        help='Pages the MOTD should be shown on.')
    parser.add_argument('-MOa', '--show-motd-always',
                        action='store_true', default=False,
                        help=('Show MOTD on every visit. If disabled, the '
                              'MOTD will only be shown when its title or '
                              'text has changed.'))
    parser.add_argument('-mzl', '--max-zoom-level', type=int,
                        help=('Maximum level a user can zoom out. '
                              'Range: [0,18]. 0 means the user can zoom out '
                              'completely.'), default=10)
    parser.add_argument('-czl', '--cluster-zoom-level', type=int,
                        help=('Zoom level from which markers should be '
                              'clustered. Range: [0,18]. -1 to disable '
                              'clustering.'), default=14)
    parser.add_argument('-czlm', '--cluster-zoom-level-mobile', type=int,
                        help=('Zoom level from which markers should be '
                              'clustered on mobile. Range: [0,18]. -1 to '
                              'disable clustering on mobile.'), default=14)
    parser.add_argument('-mcr', '--max-cluster-radius', type=int,
                        help=('The maximum radius that a cluster will cover '
                              'from the central marker '
                              '(in pixels).'), default=60)
    parser.add_argument('-sc', '--spiderfy-clusters',
                        help='Spiderfy clusters at the bottom zoom level.',
                        action='store_true', default=False)
    parser.add_argument('-mov', '--markers-outside-viewport',
                        action='store_true', default=False,
                        help='Do not remove markers outside visible bounds.')
    parser.add_argument('-nap', '--no-autopan-popup',
                        action='store_true', default=False,
                        help='Enable if you don\'t want the map to do a '
                             'panning animation to fit opened popups on '
                             'mobile devices.')
    parser.add_argument('-lsm', '--lock-start-marker',
                        help='Disables dragging the start marker and hence '
                             'disables changing the start position.',
                        action='store_true', default=False)
    parser.add_argument('-ngc', '--no-geocoder',
                        action='store_true', default=False,
                        help='Do not add the geocoder (location search bar) '
                             'to the map.')
    parser.add_argument('-pc', '--pokemon-cries',
                        help='Play cries for pokemon notifications.',
                        action='store_true', default=False)

    parser.add_argument('-hp', '--highlight-pokemon', default='',
                        help='Highlight pokemon on the map using the stated way. Options: svg / css')
    parser.add_argument('-pfc', '--perfect-circle',
                        help='Add circle symbol with "100" similar to the weather one for perfect IV pokemon.',
                        action='store_true', default=False)

    parser.add_argument('-mt', '--map-title', default='RocketMAD',
                        help=('The title of the map. Default: RocketMAD'))
    parser.add_argument('-cfi', '--custom-favicon',
                        action='store_true',
                        help='Use a custom favicon. Generate your custom '
                             'favicon files here: '
                             'https://realfavicongenerator.net and place them '
                             'in /static/images/appicons/custom. Set the path '
                             'under Favicon Generator Options to '
                             '/static/images/appicons/custom.')
    parser.add_argument('-nhi', '--no-header-image',
                        help=('Hides header image.'),
                        action='store_true', default=False)
    parser.add_argument('-hi', '--header-image',
                        help='Image in header.',
                        default='rocket.png')
    parser.add_argument('-mu', '--madmin-url', help='MADmin server URL.',
                        default=None)
    parser.add_argument('-dtu', '--donate-url', help='Donation link, e.g.'
                                                     ' PayPal.', default=None)
    parser.add_argument('-pu', '--patreon-url', help='Patreon page link.',
                        default=None)
    parser.add_argument('-du', '--discord-url', help='Discord server invite'
                                                     ' link.', default=None)
    parser.add_argument('-mru', '--messenger-url',
                        help='Messenger group invite link.', default=None)
    parser.add_argument('-tu', '--telegram-url', help='Telegram group invite'
                                                      ' link.', default=None)
    parser.add_argument('-wu', '--whatsapp-url', help='WhatsApp group invite'
                                                      ' link.', default=None)
    parser.add_argument('-ai', '--analytics-id',
                        default=None,
                        help='Google Analytics Tracking-ID.'),
    parser.add_argument('-mui', '--map-update-interval',
                        type=int, default=2500,
                        help='Interval between raw-data requests (map '
                             'updates) in milliseconds.'),

    group = parser.add_argument_group('Tile server')
    group.add_argument('-TSc', '--custom-tile-servers',
                       nargs='+', default=[],
                       help='Use your own tile server(s). Accepts list of '
                            'names and urls separated by \':\'. '
                            'Names should be unique. Example: '
                            '[tile_server_name1:tile_server_url1, '
                            'tile_server_name2:tile_server_url2]')

    group = parser.add_argument_group('Geofences')
    group.add_argument('-Gf', '--geofence-file',
                       help='Geofence file to define outer borders of the '
                            'area for which data is to be retrieved.')
    group.add_argument('-Gef', '--geofence-exclude-file',
                       help='File to exclude areas. Regard this as an '
                            'inverted geofence. Can be combined with '
                            '--geofence-file.')

    group = parser.add_argument_group('Nests')
    group.add_argument('-n', '--nests',
                       action='store_true',
                       help='Show nests on the map.')

    group = parser.add_argument_group('Parks')
    group.add_argument('-EP', '--ex-parks',
                       action='store_true',
                       help='Display ex raid eligible parks.')
    group.add_argument('-NP', '--nest-parks',
                       action='store_true',
                       help='Display nest parks.')
    group.add_argument('-EPd', '--ex-parks-downloading',
                       action='store_true',
                       help='Enables ex raid eligible parks downloading.')
    group.add_argument('-NPd', '--nest-parks-downloading',
                       action='store_true',
                       help='Enables nest parks downloading.')
    group.add_argument('-EPg', '--ex-parks-geofence-file',
                       help='Geofence file to define outer borders of the '
                            'ex park area to download.')
    group.add_argument('-NPg', '--nest-parks-geofence-file',
                       help='Geofence file to define outer borders of the '
                            'nest park area to download.')
    group.add_argument('-EPf', '--ex-parks-filename',
                       default='parks-ex',
                       help='Filename (without .json) of ex parks JSON '
                            'file. Useful when running multiple '
                            'instances. Default: parks-ex-raids')
    group.add_argument('-NPf', '--nest-parks-filename',
                       default='parks-nest',
                       help='Filename (without .json) of nest parks JSON '
                            'file. Useful when running multiple '
                            'instances. Default: parks-nests')
    group.add_argument('-Pt', '--parks-query-timeout',
                       type=int, default=86400,
                       help='The maximum allowed runtime for the parks query '
                            'in seconds.')

    group = parser.add_argument_group('Database')
    group.add_argument('--db-name',
                       help='Name of the database to be used.', required=True)
    group.add_argument('--db-user',
                       help='Username for the database.', required=True)
    group.add_argument('--db-pass',
                       help='Password for the database.', required=True)
    group.add_argument('--db-host',
                       help='IP or hostname for the database.',
                       default='127.0.0.1')
    group.add_argument('--db-port',
                       help='Port for the database.', type=int, default=3306)
    group.add_argument('--db-pool-recycle',
                       type=int, default=7200,
                       help='Number of seconds after which a connection is '
                            'automatically recycled.')
    group = parser.add_argument_group('Database Cleanup')
    group.add_argument('-DCi', '--db-cleanup-interval',
                       type=int, default=600,
                       help='Time between database cleanups in seconds.')
    group.add_argument('-DCp', '--db-cleanup-pokemon',
                       help=('Clear pokemon from database X hours '
                             'after they disappeared. '
                             'Default: 0, 0 to disable.'),
                       type=int, default=0)
    group.add_argument('-DCg', '--db-cleanup-gym',
                       help=('Clear gym details (including raids) from '
                             'database X hours after last gym scan. '
                             'Default: 0, 0 to disable.'),
                       type=int, default=0)
    group.add_argument('-DCps', '--db-cleanup-pokestop',
                       action='store_true',
                       help='Clear lure data, invasion data, and quests when '
                            'no longer active. Default: False')
    group.add_argument('-DCf', '--db-cleanup-forts',
                       help=('Clear gyms and pokestops from '
                             'database X hours '
                             'after last valid scan. '
                             'Default: 0, 0 to disable.'),
                       type=int, default=0)
    group.add_argument('-DCs', '--db-cleanup-spawnpoint',
                       help=('Clear spawnpoint from database X hours '
                             'after last valid scan. '
                             'Default: 0, 0 to disable.'),
                       type=int, default=0)

    parser.add_argument('--ssl-certificate',
                        help='Path to SSL certificate file.')
    parser.add_argument('--ssl-privatekey',
                        help='Path to SSL private key file.')
    parser.add_argument('-sn', '--status-name', default=str(os.getpid()),
                        help=('Enable status page database update using '
                              'STATUS_NAME as main worker name.'))
    parser.add_argument('-tp', '--trusted-proxies', default=[],
                        action='append',
                        help=('Enables the use of X-FORWARDED-FOR headers '
                              'to identify the IP of clients connecting '
                              'through these trusted proxies.'))
    parser.add_argument('--no-file-logs',
                        help=('Disable logging to files. '
                              'Does not disable --access-logs.'),
                        action='store_true', default=False)
    parser.add_argument('--log-path',
                        help=('Defines directory to save log files to.'),
                        default='logs/')
    parser.add_argument('--log-filename',
                        help=('Defines the log filename to be saved. '
                              'Allows date formatting, and replaces <SN> '
                              'with the instance\'s status name. Read the '
                              'python time module docs for details. '
                              'Default: %%Y%%m%%d_%%H%%M_<SN>.log.'),
                        default='%Y%m%d_%H%M_<SN>.log'),
    parser.add_argument('--dump',
                        help=('Dump censored debug info about the '
                              'environment and auto-upload to '
                              'hastebin.com.'),
                        action='store_true', default=False)

    verbose = parser.add_mutually_exclusive_group()
    verbose.add_argument('-v',
                         help=('Show debug messages from RocketMap. '
                               'Can be repeated up to 3 times.'),
                         action='count', default=0, dest='verbose')
    verbose.add_argument('--verbosity',
                         help=('Show debug messages from RocketMap.'),
                         type=int, dest='verbose')

    parser.add_argument('-gen', '--generate-images',
                        help=('Use ImageMagick to generate dynamic '
                              'icons on demand.'),
                        action='store_true', default=False)
    parser.add_argument('-pa', '--pogo-assets', default=None,
                        help=('Directory pointing to optional '
                              'PogoAssets root directory.'))

    group = parser.add_argument_group('Client Auth')
    group.add_argument('-CAsu', '--server-uri', default=None,
                       help='URI of your website/server. Authentication apps '
                            'will use this to redirect the user to.')
    group.add_argument('-CAsk', '--secret-key', default=None,
                       help='Secret key used to sign sessions. '
                            'Must be at least 16 characters long.')
    group.add_argument('-CArh', '--redis-host', default='127.0.0.1',
                       help='Address of Redis server '
                            '(Redis is used to store session data).')
    group.add_argument('-CArp', '--redis-port',
                       type=int, default=6379,
                       help='Port of Redis server.')
    group.add_argument('-CAlr', '--login-required',
                       action='store_true',
                       help='If enabled, user must be logged in with any '
                            'auth system before one can access the map.')
    group.add_argument('-CAnl', '--no-multiple-logins',
                       action='store_true',
                       help='Do not allow more than one login per account.')
    group.add_argument('-CAsd', '--session-duration',
                       type=int, default=7,
                       help='Number of days before the session expires and '
                            'the user is logged out.')

    group = parser.add_argument_group('Basic Auth')
    group.add_argument('-BA', '--basic-auth',
                       action='store_true', default=False,
                       help='Authenticate users with a username and password.')
    group.add_argument('-BAc', '--basic-auth-credentials',
                       nargs='+', default=[],
                       help='List of username and password combinations. '
                            'Example: [un1:pw1, un2:pw2]')
    group.add_argument('-BAcs', '--basic-auth-case-sensitive',
                       action='store_true', default=False,
                       help='Use case sensitive usernames.')
    group.add_argument('-BAac', '--basic-auth-access-configs',
                       nargs='+', default=[],
                       help='Use different config file based on username. '
                            'Example: [un1:access_config_name1, '
                            'un2:access_config_name2]')
    group.add_argument('-BAa', '--basic-auth-admins',
                       nargs='+', default=[],
                       help='Users that have admin rights. '
                            'Accepts list of usernames.')
    group = parser.add_argument_group('Discord Auth')
    group.add_argument('-DA', '--discord-auth',
                       action='store_true', default=False,
                       help='Authenticate users with Discord OAuth2.')
    group.add_argument('-DAci', '--discord-client-id', default=None,
                       help='OAuth2 client ID.')
    group.add_argument('-DAcs', '--discord-client-secret', default=None,
                       help='OAuth2 client secret.')
    group.add_argument('-DAbt', '--discord-bot-token', default=None,
                       help='Token for bot with access to your guild. '
                            'Only required for required/blacklisted roles '
                            'feature.')
    group.add_argument('-DAbu', '--discord-blacklisted-users',
                       nargs='+', default=[],
                       help='List of user ID\'s that are always blocked from '
                            'accessing the map.')
    group.add_argument('-DAwu', '--discord-whitelisted-users',
                       nargs='+', default=[],
                       help='List of user ID\'s that are always allowed to '
                            'access the map.')
    group.add_argument('-DArg', '--discord-required-guilds',
                       nargs='+', default=[],
                       help='If guild ID(s) are specified, user must be in at '
                            'least one discord guild (server) to access map. '
                            'Comma separated list if multiple.')
    group.add_argument('-DAbg', '--discord-blacklisted-guilds',
                       nargs='+', default=[],
                       help='If guild ID(s) are specified, user must not be '
                            'in at least one discord guild (server) to access '
                            'map. Comma separated list if multiple.')
    group.add_argument('-DArr', '--discord-required-roles',
                       nargs='+', default=[],
                       help='If specified, user must have one of these '
                            'discord roles (from a specific guild) to access '
                            'map. Accepts list of role IDs, or list of guild '
                            'IDs and roles IDs separated by \':\'. Example: '
                            '[<guild1>:<role1>, <guild2>:<role2>].')
    group.add_argument('-DAbr', '--discord-blacklisted-roles',
                       nargs='+', default=[],
                       help='If specified, user must NOT have any of these '
                            'discord roles (from a specific guild).')
    group.add_argument('-DAr', '--discord-no-permission-redirect',
                       default=None,
                       help='Link to redirect user to if user has no '
                            'permission. Typically this would be your discord '
                            'guild invite link.')
    group.add_argument('-DAac', '--discord-access-configs',
                       nargs='+', default=[],
                       help='Use different config file based on discord role '
                            '(or guild). Accepts list with elements in this '
                            'format: <guild_id>:<role_id>:'
                            '<access_config_name> You can also only use '
                            'guilds. If multiple config files correspond to '
                            'one user, only the first file is used.')
    group.add_argument('-DAa', '--discord-admins',
                       nargs='+', default=[],
                       help='Discord users that have admin rights. '
                            'Accepts list of Discord user IDs.')

    group = parser.add_argument_group('Telegram Auth')
    group.add_argument('-TA', '--telegram-auth',
                       action='store_true',
                       help='Authenticate users with Telegram.')
    group.add_argument('-TAbt', '--telegram-bot-token',
                       help='Telegram bot token.')
    group.add_argument('-TAbu', '--telegram-bot-username',
                       help='Telegram bot username.')
    group.add_argument('-TAu', '--telegram-blacklisted-users',
                       action='append', default=[],
                       help='List of user ID\'s that are always blocked from '
                            'accessing the map.')
    group.add_argument('-TArc', '--telegram-required-chats',
                       action='append', default=[],
                       help='If chat ID(s) are specified, user must be in at '
                            'least one telegram group chat to access map. '
                            'Comma separated list if multiple.')
    group.add_argument('-TAr', '--telegram-no-permission-redirect',
                       default=None,
                       help='Link to redirect user to if user has no '
                            'permission. Typically this would be your '
                            'telegram group chat invite link.')
    group.add_argument('-TAac', '--telegram-access-configs',
                       action='append', default=[],
                       help='Use different config file based on telegram '
                            'chat. Accepts list with elements in this format: '
                            '<chat_id>:<access_config_name> If multiple '
                            'config files correspond to one user, only the '
                            'first file is used.')
    group.add_argument('-TAa', '--telegram-admins',
                       action='append', default=[],
                       help='Telegram users that have admin rights. '
                            'Accepts list of Telegram user IDs.')

    group = parser.add_argument_group('Dynamic Rarity')
    group.add_argument('-R', '--rarity',
                       action='store_true',
                       help='Display Pokémon rarity.')
    group.add_argument('-Rh', '--rarity-hours',
                       type=float, default=48,
                       help='Number of hours of Pokemon data to use '
                            'to calculate dynamic rarity, decimals allowed. '
                            'Default: 48. 0 to use all data.')
    group.add_argument('-Rf', '--rarity-update-frequency',
                       type=float, default=0,
                       help='How often (in minutes) the dynamic rarity '
                            'should be updated, decimals allowed. '
                            'Default: 0. 0 to disable.')
    group.add_argument('-Rfn', '--rarity-filename',
                       default='rarity',
                       help='Filename (without .json) of rarity JSON '
                            'file. Useful when running multiple '
                            'instances. Default: rarity')

    args = parser.parse_args()
    dargs = vars(args)

    if access_config is not None:
        valid_access_args = [
            'location',
            'map_title',
            'custom_favicon',
            'no_header_image',
            'header_image',
            'madmin_url',
            'donate_url',
            'patreon_url',
            'discord_url',
            'messenger_url',
            'telegram_url',
            'whatsapp_url',
            'custom_tile_servers',
            'max_zoom_level',
            'cluster_zoom_level',
            'cluster_zoom_level_mobile',
            'max_cluster_radius',
            'spiderfy_clusters',
            'markers_outside_viewport',
            'no_autopan_popup',
            'lock_start_marker',
            'no_geocoder',
            'no_pokemon',
            'no_pokemon_values',
            'catch_rates',
            'rarity',
            'upscaled_pokemon',
            'no_pokemon_history_page',
            'verified_despawn_time',
            'show_all_zoom_level',
            'pokemon_cries',
            'highlight_pokemon',
            'perfect_circle',
            'no_gyms',
            'no_gym_sidebar',
            'no_gym_filters',
            'no_raids',
            'no_raid_filters',
            'black_white_badges',
            'no_pokestops',
            'no_quests',
            'no_quest_page',
            'no_invasions',
            'no_lures',
            'no_weather',
            'no_spawnpoints',
            'no_scanned_locs',
            'no_s2_cells',
            'no_ranges',
            'nests',
            'ex_parks',
            'nest_parks',
            'ex_parks_filename',
            'nest_parks_filename',
            'no_stats_sidebar',
            'twelve_hour_clock',
            'analytics_id',
            'map_update_interval',
            'motd',
            'motd_title',
            'motd_text',
            'motd_pages',
            'show_motd_always',
            'geofence_file',
            'geofence_exclude_file'
        ]

        access_parser = configparser.ConfigParser(allow_no_value=True,
                                                  inline_comment_prefixes='#')
        current_path = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.abspath(os.path.join(current_path, os.pardir,
                                                   'config', access_config))
        with open(config_path) as stream:
            access_parser.read_string('[DEFAULT]\n' + stream.read())
        access_args = access_parser['DEFAULT']

        for arg, value in access_args.items():
            arg = arg.replace('-', '_')
            value = 'True' if value is None else value
            if arg not in valid_access_args:
                log.warning('Argument %s is not a valid access argument.', arg)
                continue
            default = parser.get_default(arg)
            if value == 'None':
                dargs[arg] = None
            elif isinstance(default, bool):
                if value in ['True', 'true', '1']:
                    dargs[arg] = True
                elif value in ['False', 'false', '0']:
                    dargs[arg] = False
            elif isinstance(default, int):
                dargs[arg] = int(value)
            elif isinstance(default, float):
                dargs[arg] = float(value)
            elif isinstance(default, list):
                dargs[arg] = value.strip('][').split(', ')
            else:
                dargs[arg] = value

    current_path = os.path.dirname(os.path.abspath(__file__))
    args.root_path = os.path.abspath(os.path.join(current_path, os.pardir))
    args.data_dir = 'static/dist/data'
    args.locales_dir = 'static/dist/locales'

    # Allow status name and date formatting in log filename.
    args.log_filename = strftime(args.log_filename)
    args.log_filename = args.log_filename.replace('<sn>', '<SN>')
    args.log_filename = args.log_filename.replace('<SN>', args.status_name)

    position = extract_coordinates(args.location)
    args.center_lat = position[0]
    args.center_lng = position[1]

    if args.custom_tile_servers:
        tile_servers = []
        for item in args.custom_tile_servers:
            name = item.split(':')[0]
            url = item[len(name) + 1:]
            key = name.replace(' ', '').lower()
            tile_servers.append([key, name, url])
        args.custom_tile_servers = tile_servers

    if (args.db_cleanup_pokemon > 0 or args.db_cleanup_gym > 0
            or args.db_cleanup_pokestop or args.db_cleanup_forts > 0
            or args.db_cleanup_spawnpoint > 0):
        args.db_cleanup = True
    else:
        args.db_cleanup = False

    if args.basic_auth or args.discord_auth or args.telegram_auth:
        if args.server_uri is None:
            parser.print_usage()
            print(sys.argv[0] + ': error: -CAsu/--server-uri parameter is '
                                'required for Discord/Telegram auth.')
            sys.exit(1)

        args.server_uri = args.server_uri.rstrip('/')
        if args.secret_key is None or len(args.secret_key) < 16:
            parser.print_usage()
            print(sys.argv[0] + ': error: argument -CAs/--secret-key must be '
                                'at least 16 characters long.')
            sys.exit(1)
        args.client_auth = True
    else:
        args.client_auth = False

    if args.basic_auth and not args.basic_auth_credentials:
        parser.print_usage()
        print(sys.argv[0] + ': error: -BAc/--basic-auth-credentials parameter '
                            'is required for basic auth.')
        sys.exit(1)

    if args.discord_auth and not args.discord_no_permission_redirect and (
            args.discord_blacklisted_users or args.discord_whitelisted_users
            or args.discord_required_guilds or args.discord_blacklisted_guilds
            or args.discord_required_roles or args.discord_blacklisted_roles):
        parser.print_usage()
        print(sys.argv[0] + ': error: -DAr/--discord-no-permission-redirect '
                            'parameter is required for Discord auth.')
        sys.exit(1)

    if args.telegram_auth and not args.telegram_no_permission_redirect and (
            args.telegram_blacklisted_users or args.telegram_required_chats):
        parser.print_usage()
        print(sys.argv[0] + ': error: -TAr/--telegram-no-permission-redirect '
                            'parameter is required for Telegram auth.')
        sys.exit(1)

    return args


def now():
    # The fact that you need this helper...
    return int(time.time())


# Gets the total seconds past the hour for a given date.
def date_secs(d):
    return d.minute * 60 + d.second


# Checks to see if test is between start and end accounting for hour
# wraparound.
def clock_between(start, test, end):
    return ((start <= test <= end and start < end)
            or (not (end <= test <= start) and start > end))


def extract_coordinates(location):
    # Use lat/lng directly if matches such a pattern.
    prog = re.compile(r"^(\-?\d+\.\d+),?\s?(\-?\d+\.\d+)$")
    res = prog.match(location)
    if res:
        log.debug('Using coordinates from CLI directly')
        position = (float(res.group(1)), float(res.group(2)), 0)
    else:
        log.debug('Looking up coordinates in API')
        position = get_pos_by_name(location)

    if position is None or not any(position):
        log.error("Location not found: '{}'".format(location))
        sys.exit()
    return position


# Return the s2sphere cellid token from a location.
def cellid(loc):
    return int(
        CellId.from_lat_lng(LatLng.from_degrees(loc[0], loc[1])).to_token(),
        16)


# Return approximate distance in meters.
def distance(pos1, pos2):
    return haversine((tuple(pos1))[0:2], (tuple(pos2))[0:2])


# Return True if distance between two locs is less than distance in meters.
def in_radius(loc1, loc2, radius):
    return distance(loc1, loc2) < radius


def i18n(word):
    if not hasattr(i18n, 'dictionary'):
        args = get_args()
        file_path = os.path.join(
            args.root_path,
            args.locales_dir,
            '{}.min.json'.format(args.locale))
        if os.path.isfile(file_path):
            with open(file_path, 'r') as f:
                i18n.dictionary = json.loads(f.read())
        else:
            # If locale file is not found we set an empty dict to avoid
            # checking the file every time, we skip the warning for English as
            # it is not expected to exist.
            if not args.locale == 'en':
                log.warning(
                    'Skipping translations - unable to find locale file: %s',
                    file_path)
            i18n.dictionary = {}
    if word in i18n.dictionary:
        return i18n.dictionary[word]
    else:
        return word


def get_pokemon_data(pokemon_id):
    if not hasattr(get_pokemon_data, 'pokemon'):
        args = get_args()
        file_path = os.path.join(
            args.root_path,
            args.data_dir,
            'pokemon.min.json')

        with open(file_path, 'r') as f:
            get_pokemon_data.pokemon = json.loads(
                f.read(), object_pairs_hook=OrderedDict)
    return get_pokemon_data.pokemon[str(pokemon_id)]


def get_pokemon_id(pokemon_name):
    if not hasattr(get_pokemon_id, 'ids'):
        if not hasattr(get_pokemon_data, 'pokemon'):
            # initialize from file
            get_pokemon_data(1)

        get_pokemon_id.ids = {}
        for pokemon_id, data in get_pokemon_data.pokemon.items():
            get_pokemon_id.ids[data['name']] = int(pokemon_id)

    return get_pokemon_id.ids.get(pokemon_name, -1)


def get_pokemon_name(pokemon_id):
    return i18n(get_pokemon_data(pokemon_id)['name'])


def get_pokemon_types(pokemon_id):
    pokemon_types = get_pokemon_data(pokemon_id)['types']
    return [{"type": x['type'], "color": x['color']} for x in
            pokemon_types]


def get_moves_data(move_id):
    if not hasattr(get_moves_data, 'moves'):
        args = get_args()
        file_path = os.path.join(
            args.root_path,
            args.data_dir,
            'moves.min.json')

        with open(file_path, 'r') as f:
            get_moves_data.moves = json.loads(f.read())
    return get_moves_data.moves[str(move_id)]


def get_move_name(move_id):
    return i18n(get_moves_data(move_id)['name'])


def get_move_damage(move_id):
    return i18n(get_moves_data(move_id)['damage'])


def get_move_energy(move_id):
    return i18n(get_moves_data(move_id)['energy'])


def get_move_type(move_id):
    move_type = get_moves_data(move_id)['type']
    return {'type': i18n(move_type), 'type_en': move_type}


def dottedQuadToNum(ip):
    return struct.unpack("!L", socket.inet_aton(ip))[0]


def calc_pokemon_level(cp_multiplier):
    if cp_multiplier < 0.734:
        pokemon_level = (58.35178527 * cp_multiplier * cp_multiplier
                         - 2.838007664 * cp_multiplier + 0.8539209906)
    else:
        pokemon_level = 171.0112688 * cp_multiplier - 95.20425243
    pokemon_level = int((round(pokemon_level) * 2) / 2)
    return pokemon_level


def calc_pokemon_cp(pokemon, base_attack, base_defense, base_stamina):
    if pokemon['individual_attack'] is None:
        return 0
    attack = base_attack + pokemon['individual_attack']
    defense = base_defense + pokemon['individual_defense']
    stamina = base_stamina + pokemon['individual_stamina']
    cp = ((attack * math.sqrt(defense) * math.sqrt(stamina)
           * pokemon['cp_multiplier'] * pokemon['cp_multiplier']) / 10)
    return int(cp) if cp > 10 else 10


def get_pos_by_name(location_name):
    geolocator = Nominatim()
    loc = geolocator.geocode(location_name, timeout=10)
    if not loc:
        return None

    log.info("Location for '%s' found: %s", location_name, loc.address)
    log.info('Coordinates (lat/long/alt) for location: %s %s %s', loc.latitude,
             loc.longitude, loc.altitude)

    return (loc.latitude, loc.longitude, loc.altitude)


# Setting up a persistent session that is re-used by multiple requests can
# speed up requests to the same host, as it'll re-use the underlying TCP
# connection.
def get_async_requests_session(num_retries, backoff_factor, pool_size,
                               status_forcelist=None):
    # Use requests & urllib3 to auto-retry.
    # If the backoff_factor is 0.1, then sleep() will sleep for [0.1s, 0.2s,
    # 0.4s, ...] between retries. It will also force a retry if the status
    # code returned is in status_forcelist.
    if status_forcelist is None:
        status_forcelist = [500, 502, 503, 504]
    session = Session(max_workers=pool_size)

    # If any regular response is generated, no retry is done. Without using
    # the status_forcelist, even a response with status 500 will not be
    # retried.
    retries = Retry(total=num_retries, backoff_factor=backoff_factor,
                    status_forcelist=status_forcelist)

    # Mount handler on both HTTP & HTTPS.
    session.mount('http://', HTTPAdapter(max_retries=retries,
                                         pool_connections=pool_size,
                                         pool_maxsize=pool_size))
    session.mount('https://', HTTPAdapter(max_retries=retries,
                                          pool_connections=pool_size,
                                          pool_maxsize=pool_size))

    return session


# Get common usage stats.
def resource_usage():
    platform = sys.platform
    proc = psutil.Process()

    with proc.oneshot():
        cpu_usage = psutil.cpu_times_percent()
        mem_usage = psutil.virtual_memory()
        net_usage = psutil.net_io_counters()

        usage = {
            'platform': platform,
            'PID': proc.pid,
            'MEM': {
                'total': mem_usage.total,
                'available': mem_usage.available,
                'used': mem_usage.used,
                'free': mem_usage.free,
                'percent_used': mem_usage.percent,
                'process_percent_used': proc.memory_percent()
            },
            'CPU': {
                'user': cpu_usage.user,
                'system': cpu_usage.system,
                'idle': cpu_usage.idle,
                'process_percent_used': proc.cpu_percent(interval=1)
            },
            'NET': {
                'bytes_sent': net_usage.bytes_sent,
                'bytes_recv': net_usage.bytes_recv,
                'packets_sent': net_usage.packets_sent,
                'packets_recv': net_usage.packets_recv,
                'errin': net_usage.errin,
                'errout': net_usage.errout,
                'dropin': net_usage.dropin,
                'dropout': net_usage.dropout
            },
            'connections': {
                'ipv4': len(proc.connections('inet4')),
                'ipv6': len(proc.connections('inet6'))
            },
            'thread_count': proc.num_threads(),
            'process_count': len(psutil.pids())
        }

        # Linux only.
        if platform == 'linux' or platform == 'linux2':
            usage['sensors'] = {
                'temperatures': psutil.sensors_temperatures(),
                'fans': psutil.sensors_fans()
            }
            usage['connections']['unix'] = len(proc.connections('unix'))
            usage['num_handles'] = proc.num_fds()
        elif platform == 'win32':
            usage['num_handles'] = proc.num_handles()

    return usage


# Log resource usage to any logger.
def log_resource_usage(log_method):
    usage = resource_usage()
    log_method('Resource usage: %s.', usage)


# Generic method to support periodic background tasks. Thread sleep could be
# replaced by a tiny sleep, and time measuring, but we're using sleep() for
# now to keep resource overhead to an absolute minimum.
def periodic_loop(f, loop_delay_ms):
    while True:
        # Do the thing.
        f()
        # zZz :bed:
        time.sleep(loop_delay_ms / 1000)


# Periodically log resource usage every 'loop_delay_ms' ms.
def log_resource_usage_loop(loop_delay_ms=60000):
    # Helper method to log to specific log level.
    def log_resource_usage_to_debug():
        log_resource_usage(log.debug)

    periodic_loop(log_resource_usage_to_debug, loop_delay_ms)


# Return shell call output as string, replacing any errors with the
# error's string representation.
def check_output_catch(command):
    try:
        result = subprocess.check_output(command,
                                         stderr=subprocess.STDOUT,
                                         shell=True)
    except Exception as ex:
        result = 'ERROR: ' + ex.output.replace(os.linesep, ' ')
    finally:
        return result.strip()


# Automatically censor all necessary fields. Lists will return their
# length, all other items will return 'empty_tag' if they're empty
# or 'censored_tag' if not.
def _censor_args_namespace(args, censored_tag, empty_tag):
    fields_to_censor = [
        'config',
        'db',
        'log_path',
        'log_filename',
        'ssl_certificate',
        'ssl_privatekey',
        'location',
        'host',
        'port',
        'db_name',
        'db_user',
        'db_pass',
        'db_host',
        'db_port',
        'status_name',
        'trusted_proxies',
        'data_dir',
        'locales_dir',
        'shared_config'
    ]

    for field in fields_to_censor:
        # Do we have the field?
        if field in args:
            value = args[field]

            # Replace with length of list or censored tag.
            if isinstance(value, list):
                args[field] = len(value)
            else:
                if args[field]:
                    args[field] = censored_tag
                else:
                    args[field] = empty_tag

    return args


# Get censored debug info about the environment we're running in.
def get_censored_debug_info():
    CENSORED_TAG = '<censored>'
    EMPTY_TAG = '<empty>'
    args = _censor_args_namespace(vars(get_args()), CENSORED_TAG, EMPTY_TAG)

    # Get git status.
    status = check_output_catch('git status')
    log = check_output_catch('git log -1')
    remotes = check_output_catch('git remote -v')

    # Python, pip, node, npm.
    python = sys.version.replace(os.linesep, ' ').strip()
    pip = check_output_catch('pip -V')
    node = check_output_catch('node -v')
    npm = check_output_catch('npm -v')

    return {
        'args': args,
        'git': {
            'status': status,
            'log': log,
            'remotes': remotes
        },
        'versions': {
            'python': python,
            'pip': pip,
            'node': node,
            'npm': npm
        }
    }


# Post a string of text to a hasteb.in and retrieve the URL.
def upload_to_hastebin(text):
    log.info('Uploading info to hastebin.com...')
    response = requests.post('https://hastebin.com/documents', data=text)
    return response.json()['key']


# Get censored debug info & auto-upload to hasteb.in.
def get_debug_dump_link():
    debug = get_censored_debug_info()
    args = debug['args']
    git = debug['git']
    versions = debug['versions']

    # Format debug info for text upload.
    result = '''#######################
### RocketMap debug ###
#######################

## Versions:
'''

    # Versions first, for readability.
    result += '- Python: ' + versions['python'] + '\n'
    result += '- pip: ' + versions['pip'] + '\n'
    result += '- Node.js: ' + versions['node'] + '\n'
    result += '- npm: ' + versions['npm'] + '\n'

    # Next up is git.
    result += '\n\n' + '## Git:' + '\n'
    result += git['status'] + '\n'
    result += '\n\n' + git['remotes'] + '\n'
    result += '\n\n' + git['log'] + '\n'

    # And finally, our censored args.
    result += '\n\n' + '## Settings:' + '\n'
    result += pformat(args, width=1)

    # Upload to hasteb.in.
    return upload_to_hastebin(result)


def get_pokemon_rarity(total_spawns_all, total_spawns_pokemon):
    spawn_group = 1  # Common

    spawn_rate_pct = total_spawns_pokemon / float(total_spawns_all)
    spawn_rate_pct = round(100 * spawn_rate_pct, 4)

    if spawn_rate_pct == 0:
        spawn_group = 6  # New Spawn
    elif spawn_rate_pct < 0.01:
        spawn_group = 5  # Ultra Rare
    elif spawn_rate_pct < 0.03:
        spawn_group = 4  # Very Rare
    elif spawn_rate_pct < 0.5:
        spawn_group = 3  # Rare
    elif spawn_rate_pct < 1:
        spawn_group = 2  # Uncommon

    return spawn_group


def dynamic_rarity_refresher(app):
    args = get_args()

    # If we import at the top, rocketmad.models will import rocketmad.utils,
    # causing the cyclic import to make some things unavailable.
    from .models import Pokemon

    # Refresh every x hours.
    hours = args.rarity_hours
    update_frequency_mins = args.rarity_update_frequency
    refresh_time_sec = update_frequency_mins * 60

    rarity_dir = Path(args.root_path + '/static/dist/data/rarity')
    rarity_dir.mkdir(parents=True, exist_ok=True)
    rarity_file = rarity_dir / (args.rarity_filename + '.min.json')

    while True:
        log.info('Updating dynamic rarity...')

        start = default_timer()
        with app.app_context():
            db_rarities = Pokemon.get_spawn_counts(hours)
        total = db_rarities['total']
        pokemon = db_rarities['pokemon']

        # Store as an easy lookup table for front-end.
        rarities = {}

        for poke in pokemon:
            id = poke['pokemon_id']
            count = poke['count']
            rarities[id] = get_pokemon_rarity(total, count)

        # Save to file.
        with open(rarity_file, 'w') as outfile:
            json.dump(rarities, outfile, separators=(',', ':'))

        duration = default_timer() - start
        log.info('Updated dynamic rarity. It took %.2fs for %d entries.',
                 duration,
                 total)

        # Wait x seconds before next refresh.
        log.debug('Waiting %d minutes before next dynamic rarity update.',
                  refresh_time_sec / 60)
        time.sleep(refresh_time_sec)


@memoize
def parse_geofence_file(geofence_file):
    geofences = []
    # Read coordinates from file.
    if geofence_file:
        with open(geofence_file) as f:
            for line in f:
                line = line.strip()
                if len(line) == 0:  # Empty line.
                    continue
                elif line.startswith("["):  # Name line.
                    name = line.replace("[", "").replace("]", "")
                    geofences.append({
                        'name': name,
                        'polygon': []
                    })
                    log.debug('Found geofence: %s.', name)
                else:  # Coordinate line.
                    lat, lon = line.split(",")
                    coord = (float(lat), float(lon))
                    geofences[-1]['polygon'].append(coord)

    return geofences


def get_geofence_box(geofence):
    sw_lat = 90
    sw_lon = 180
    ne_lat = -90
    ne_lon = -180
    for coord in geofence['polygon']:
        lat, lon = coord
        if lat < sw_lat:
            sw_lat = lat
        elif lat > ne_lat:
            ne_lat = lat
        if lon < sw_lon:
            sw_lon = lon
        elif lon > ne_lon:
            ne_lon = lon

    return {
        'sw': (sw_lat, sw_lon),
        'ne': (ne_lat, ne_lon)
    }


def get_sessions(redis_server):
    session_keys = redis_server.keys('session:*')
    sessions = []
    for key in session_keys:
        data = pickle.loads(redis_server.get(key))
        session_id = str(key, 'utf-8').split(':')[1]
        data['session_id'] = session_id
        sessions.append(data)

    return sessions
