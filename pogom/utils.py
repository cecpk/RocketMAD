#!/usr/bin/python
# -*- coding: utf-8 -*-

import sys
from threading import Thread

import configargparse
import os
import json
import logging
import random
import time
import socket
import struct
import psutil
import subprocess
import requests

from s2sphere import CellId, LatLng
from geopy.geocoders import GoogleV3
from requests_futures.sessions import FuturesSession
from requests.packages.urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter
from cHaversine import haversine
from pprint import pformat
from time import strftime
from timeit import default_timer

from pogom import dyn_img
from pogom.pgpool import pgpool_request_accounts

log = logging.getLogger(__name__)


def parse_unicode(bytestring):
    decoded_string = bytestring.decode(sys.getfilesystemencoding())
    return decoded_string


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
            pid = get_pokemon_id(unicode(name, 'utf-8'))
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
def get_args():
    # Pre-check to see if the -cf or --config flag is used on the command line.
    # If not, we'll use the env var or default value. This prevents layering of
    # config files as well as a missing config.ini.
    defaultconfigfiles = []
    if '-cf' not in sys.argv and '--config' not in sys.argv:
        defaultconfigfiles = [os.getenv('POGOMAP_CONFIG', os.path.join(
            os.path.dirname(__file__), '../config/config.ini'))]
    parser = configargparse.ArgParser(
        default_config_files=defaultconfigfiles,
        auto_env_var_prefix='POGOMAP_')
    parser.add_argument('-cf', '--config',
                        is_config_file=True, help='Set configuration file')
    parser.add_argument('-scf', '--shared-config',
                        is_config_file=True, help='Set a shared config')
    parser.add_argument('-a', '--auth-service', type=str.lower,
                        action='append', default=[],
                        help=('Auth Services, either one for all accounts ' +
                              'or one per account: ptc or google. Defaults ' +
                              'all to ptc.'))
    parser.add_argument('-u', '--username', action='append', default=[],
                        help='Usernames, one per account.')
    parser.add_argument('-p', '--password', action='append', default=[],
                        help=('Passwords, either single one for all ' +
                              'accounts or one per account.'))
    parser.add_argument('-w', '--workers', type=int,
                        help=('Number of search worker threads to start. ' +
                              'Defaults to the number of accounts specified.'))
    parser.add_argument('-hw', '--highlvl-workers', type=int,
                        default=0,
                        help=('Load this many high level' +
                              'workers from PGPool. This requires ' +
                              '--pgpool-url to be set.'))
    parser.add_argument('-asi', '--account-search-interval', type=int,
                        default=0,
                        help=('Seconds for accounts to search before ' +
                              'switching to a new account. 0 to disable.'))
    parser.add_argument('-ari', '--account-rest-interval', type=int,
                        default=7200,
                        help=('Seconds for accounts to rest when they fail ' +
                              'or are switched out.'))
    parser.add_argument('-ac', '--accountcsv',
                        help=('Load accounts from CSV file containing ' +
                              '"auth_service,username,password" lines.'))
    parser.add_argument('-hlvl', '--high-lvl-accounts',
                        help=('Load high level accounts from CSV file '
                              + ' containing '
                              + '"auth_service,username,password"'
                              + ' lines.'))
    parser.add_argument('-bh', '--beehive',
                        help=('Use beehive configuration for multiple ' +
                              'accounts, one account per hex.  Make sure ' +
                              'to keep -st under 5, and -w under the total ' +
                              'amount of accounts available.'),
                        action='store_true', default=False)
    parser.add_argument('-wph', '--workers-per-hive',
                        help=('Only referenced when using --beehive. Sets ' +
                              'number of workers per hive. Default value ' +
                              'is 1.'),
                        type=int, default=1)
    parser.add_argument('-l', '--location', type=parse_unicode,
                        help='Location, can be an address or coordinates.')
    # Default based on the average elevation of cities around the world.
    # Source: https://www.wikiwand.com/en/List_of_cities_by_elevation
    parser.add_argument('-alt', '--altitude',
                        help='Default altitude in meters.',
                        type=int, default=507)
    parser.add_argument('-altv', '--altitude-variance',
                        help='Variance for --altitude in meters',
                        type=int, default=1)
    parser.add_argument('-uac', '--use-altitude-cache',
                        help=('Query the Elevation API for each step,' +
                              ' rather than only once, and store results in' +
                              ' the database.'),
                        action='store_true', default=False)
    parser.add_argument('-j', '--jitter',
                        help=('Apply random -5m to +5m jitter to ' +
                              'location.'),
                        action='store_true', default=False)
    parser.add_argument('-al', '--access-logs',
                        help=("Write web logs to access.log."),
                        action='store_true', default=False)
    parser.add_argument('-st', '--step-limit', help='Steps.', type=int,
                        default=12)
    parser.add_argument('-gf', '--geofence-file',
                        help=('Geofence file to define outer borders of the ' +
                              'scan area.'),
                        default='')
    parser.add_argument('-gef', '--geofence-excluded-file',
                        help=('File to define excluded areas inside scan ' +
                              'area. Regarded this as inverted geofence. ' +
                              'Can be combined with geofence-file.'),
                        default='')
    parser.add_argument('-sd', '--scan-delay',
                        help='Time delay between requests in scan threads.',
                        type=float, default=10)
    parser.add_argument('--spawn-delay',
                        help=('Number of seconds after spawn time to wait ' +
                              'before scanning to be sure the Pokemon ' +
                              'is there.'),
                        type=float, default=10)
    parser.add_argument('-enc', '--encounter',
                        help='Start an encounter to gather IVs and moves.',
                        action='store_true', default=False)
    parser.add_argument('-mpm', '--medalpokemon',
                        help='Show notify for tiny rattata and big magikarp.',
                        action='store_true', default=False)
    parser.add_argument('-cs', '--captcha-solving',
                        help='Enables captcha solving.',
                        action='store_true', default=False)
    parser.add_argument('-ck', '--captcha-key',
                        help='2Captcha API key.')
    parser.add_argument('-cds', '--captcha-dsk',
                        help='Pokemon Go captcha data-sitekey.',
                        default="6LeeTScTAAAAADqvhqVMhPpr_vB9D364Ia-1dSgK")
    parser.add_argument('-mcd', '--manual-captcha-domain',
                        help='Domain to where captcha tokens will be sent.',
                        default="http://127.0.0.1:5000")
    parser.add_argument('-mcr', '--manual-captcha-refresh',
                        help='Time available before captcha page refreshes.',
                        type=int, default=30)
    parser.add_argument('-mct', '--manual-captcha-timeout',
                        help='Maximum time captchas will wait for manual ' +
                        'captcha solving. On timeout, if enabled, 2Captcha ' +
                        'will be used to solve captcha. Default is 0.',
                        type=int, default=0)
    parser.add_argument('-ed', '--encounter-delay',
                        help=('Time delay between encounter pokemon ' +
                              'in scan threads.'),
                        type=float, default=1)
    parser.add_argument('-ignf', '--ignorelist-file',
                        default='', help='File containing a list of ' +
                        'Pokemon IDs to ignore, one line per ID. ' +
                        'Spawnpoints will be saved, but ignored ' +
                        'Pokemon won\'t be encountered, sent to ' +
                        'webhooks or saved to the DB.')
    parser.add_argument('-encwf', '--enc-whitelist-file',
                        default='', help='File containing a list of '
                        'Pokemon IDs or names to encounter for'
                        ' IV/CP scanning. One line per ID.')
    parser.add_argument('-nostore', '--no-api-store',
                        help=("Don't store the API objects used by the high"
                              + ' level accounts in memory. This will increase'
                              + ' the number of logins per account, but '
                              + ' decreases memory usage.'),
                        action='store_true', default=False)
    parser.add_argument('-apir', '--api-retries',
                        help=('Number of times to retry an API request.'),
                        type=int, default=3)
    webhook_list = parser.add_mutually_exclusive_group()
    webhook_list.add_argument('-wwhtf', '--webhook-whitelist-file',
                              default='', help='File containing a list of '
                                               'Pokemon IDs or names to be '
                                               'sent to webhooks.')
    parser.add_argument('-ld', '--login-delay',
                        help='Time delay between each login attempt.',
                        type=float, default=6)
    parser.add_argument('-lr', '--login-retries',
                        help=('Number of times to retry the login before ' +
                              'refreshing a thread.'),
                        type=int, default=3)
    parser.add_argument('-mf', '--max-failures',
                        help=('Maximum number of failures to parse ' +
                              'locations before an account will go into a ' +
                              'sleep for -ari/--account-rest-interval ' +
                              'seconds.'),
                        type=int, default=5)
    parser.add_argument('-me', '--max-empty',
                        help=('Maximum number of empty scans before an ' +
                              'account will go into a sleep for ' +
                              '-ari/--account-rest-interval seconds.' +
                              'Reasonable to use with proxies.'),
                        type=int, default=0)
    parser.add_argument('-bsr', '--bad-scan-retry',
                        help=('Number of bad scans before giving up on a ' +
                              'step. Default 2, 0 to disable.'),
                        type=int, default=2)
    parser.add_argument('-msl', '--min-seconds-left',
                        help=('Time that must be left on a spawn before ' +
                              'considering it too late and skipping it. ' +
                              'For example 600 would skip anything with ' +
                              '< 10 minutes remaining. Default 0.'),
                        type=int, default=0)
    parser.add_argument('-dc', '--display-in-console',
                        help='Display Found Pokemon in Console.',
                        action='store_true', default=False)
    parser.add_argument('-H', '--host', help='Set web server listening host.',
                        default='127.0.0.1')
    parser.add_argument('-P', '--port', type=int,
                        help='Set web server listening port.', default=5000)
    parser.add_argument('-L', '--locale',
                        help=('Locale for Pokemon names (check' +
                              ' static/dist/locales for more).'),
                        default='en')
    parser.add_argument('-c', '--china',
                        help='Coordinates transformer for China.',
                        action='store_true')
    parser.add_argument('-m', '--mock', type=str,
                        help=('Mock mode - point to a fpgo endpoint instead ' +
                              'of using the real PogoApi, ec: ' +
                              'http://127.0.0.1:9090'),
                        default='')
    parser.add_argument('-ns', '--no-server',
                        help=('No-Server Mode. Starts the searcher but not ' +
                              'the Webserver.'),
                        action='store_true', default=False)
    parser.add_argument('-os', '--only-server',
                        help=('Server-Only Mode. Starts only the Webserver ' +
                              'without the searcher.'),
                        action='store_true', default=False)
    parser.add_argument('-sc', '--search-control',
                        help='Enables search control.',
                        action='store_true', dest='search_control',
                        default=False)
    parser.add_argument('-nfl', '--no-fixed-location',
                        help='Disables a fixed map location and shows the ' +
                        'search bar for use in shared maps.',
                        action='store_false', dest='fixed_location',
                        default=True)
    parser.add_argument('-k', '--gmaps-key',
                        help='Google Maps Javascript API Key.',
                        required=True)
    parser.add_argument('--skip-empty',
                        help=('Enables skipping of empty cells in normal ' +
                              'scans - requires previously populated ' +
                              'database (not to be used with -ss)'),
                        action='store_true', default=False)
    parser.add_argument('-C', '--cors', help='Enable CORS on web server.',
                        action='store_true', default=False)
    parser.add_argument('-cd', '--clear-db',
                        help=('Deletes the existing database before ' +
                              'starting the Webserver.'),
                        action='store_true', default=False)
    parser.add_argument('-np', '--no-pokemon',
                        help=('Disables Pokemon from the map (including ' +
                              'parsing them into local db.)'),
                        action='store_true', default=False)
    parser.add_argument('-ng', '--no-gyms',
                        help=('Disables Gyms from the map (including ' +
                              'parsing them into local db).'),
                        action='store_true', default=False)
    parser.add_argument('-nr', '--no-raids',
                        help=('Disables Raids from the map (including ' +
                              'parsing them into local db).'),
                        action='store_true', default=False)
    parser.add_argument('-nk', '--no-pokestops',
                        help=('Disables PokeStops from the map (including ' +
                              'parsing them into local db).'),
                        action='store_true', default=False)
    parser.add_argument('-ss', '--spawnpoint-scanning',
                        help=('Use spawnpoint scanning (instead of hex ' +
                              'grid). Scans in a circle based on step_limit ' +
                              'when on DB.'),
                        action='store_true', default=False)
    parser.add_argument('-ssct', '--ss-cluster-time',
                        help=('Time threshold in seconds for spawn point ' +
                              'clustering (0 to disable).'),
                        type=int, default=0)
    parser.add_argument('-speed', '--speed-scan',
                        help=('Use speed scanning to identify spawn points ' +
                              'and then scan closest spawns.'),
                        action='store_true', default=False)
    parser.add_argument('-spin', '--pokestop-spinning',
                        help=('Spin Pokestops with 50%% probability.'),
                        action='store_true', default=False)
    parser.add_argument('-ams', '--account-max-spins',
                        help='Maximum number of Pokestop spins per hour.',
                        type=int, default=20)
    parser.add_argument('-kph', '--kph',
                        help=('Set a maximum speed in km/hour for scanner ' +
                              'movement. 0 to disable. Default: 35.'),
                        type=int, default=35)
    parser.add_argument('-hkph', '--hlvl-kph',
                        help=('Set a maximum speed in km/hour for scanner ' +
                              'movement, for high-level (L30) accounts. ' +
                              '0 to disable. Default: 25.'),
                        type=int, default=25)
    parser.add_argument('-ldur', '--lure-duration',
                        help=('Change duration for lures set on pokestops. ' +
                              'This is useful for events that extend lure ' +
                              'duration.'), type=int, default=30)
    parser.add_argument('-px', '--proxy',
                        help='Proxy url (e.g. socks5://127.0.0.1:9050)',
                        action='append')
    parser.add_argument('-pxsc', '--proxy-skip-check',
                        help='Disable checking of proxies before start.',
                        action='store_true', default=False)
    parser.add_argument('-pxt', '--proxy-test-timeout',
                        help='Timeout settings for proxy checker in seconds.',
                        type=int, default=5)
    parser.add_argument('-pxre', '--proxy-test-retries',
                        help=('Number of times to retry sending proxy ' +
                              'test requests on failure.'),
                        type=int, default=0)
    parser.add_argument('-pxbf', '--proxy-test-backoff-factor',
                        help=('Factor (in seconds) by which the delay ' +
                              'until next retry will increase.'),
                        type=float, default=0.25)
    parser.add_argument('-pxc', '--proxy-test-concurrency',
                        help=('Async requests pool size.'), type=int,
                        default=0)
    parser.add_argument('-pxd', '--proxy-display',
                        help=('Display info on which proxy being used ' +
                              '(index or full). To be used with -ps.'),
                        type=str, default='index')
    parser.add_argument('-pxf', '--proxy-file',
                        help=('Load proxy list from text file (one proxy ' +
                              'per line), overrides -px/--proxy.'))
    parser.add_argument('-pxr', '--proxy-refresh',
                        help=('Period of proxy file reloading, in seconds. ' +
                              'Works only with -pxf/--proxy-file. ' +
                              '(0 to disable).'),
                        type=int, default=0)
    parser.add_argument('-pxo', '--proxy-rotation',
                        help=('Enable proxy rotation with account changing ' +
                              'for search threads (none/round/random).'),
                        type=str, default='round')
    group = parser.add_argument_group('Database')
    group.add_argument(
        '--db-name', help='Name of the database to be used.', required=True)
    group.add_argument(
        '--db-user', help='Username for the database.', required=True)
    group.add_argument(
        '--db-pass', help='Password for the database.', required=True)
    group.add_argument(
        '--db-host',
        help='IP or hostname for the database.',
        default='127.0.0.1')
    group.add_argument(
         '--db-port', help='Port for the database.', type=int, default=3306)
    group.add_argument(
        '--db-threads',
        help=('Number of db threads; increase if the db ' +
              'queue falls behind.'),
        type=int,
        default=1)
    group = parser.add_argument_group('Database Cleanup')
    group.add_argument('-DC', '--db-cleanup',
                       help='Enable regular database cleanup thread.',
                       action='store_true', default=False)
    group.add_argument('-DCw', '--db-cleanup-worker',
                       help=('Clear worker status from database after X ' +
                             'minutes of inactivity. ' +
                             'Default: 30, 0 to disable.'),
                       type=int, default=30)
    group.add_argument('-DCp', '--db-cleanup-pokemon',
                       help=('Clear pokemon from database X hours ' +
                             'after they disappeared. ' +
                             'Default: 0, 0 to disable.'),
                       type=int, default=0)
    group.add_argument('-DCg', '--db-cleanup-gym',
                       help=('Clear gym details from database X hours ' +
                             'after last gym scan. ' +
                             'Default: 8, 0 to disable.'),
                       type=int, default=8)
    group.add_argument('-DCs', '--db-cleanup-spawnpoint',
                       help=('Clear spawnpoint from database X hours ' +
                             'after last valid scan. ' +
                             'Default: 720, 0 to disable.'),
                       type=int, default=720)
    group.add_argument('-DCf', '--db-cleanup-forts',
                       help=('Clear gyms and pokestops from ' +
                             'database X hours ' +
                             'after last valid scan. ' +
                             'Default: 0, 0 to disable.'),
                       type=int, default=0)
    parser.add_argument(
        '-wh',
        '--webhook',
        help='Define URL(s) to POST webhook information to.',
        default=None,
        dest='webhooks',
        action='append')
    parser.add_argument('-gi', '--gym-info',
                        help=('Get all details about gyms (causes '
                              'an additional API hit for ' +
                              'every gym).'),
                        action='store_true', default=False)
    parser.add_argument(
        '--wh-types',
        help=('Defines the type of messages to send to webhooks.'),
        choices=[
            'pokemon', 'gym', 'raid', 'egg', 'tth', 'gym-info',
            'pokestop', 'lure', 'captcha'
        ],
        action='append',
        default=[])
    parser.add_argument('--wh-threads',
                        help=('Number of webhook threads; increase if the ' +
                              'webhook queue falls behind.'),
                        type=int, default=1)
    parser.add_argument('-whc', '--wh-concurrency',
                        help=('Async requests pool size.'), type=int,
                        default=25)
    parser.add_argument('-whr', '--wh-retries',
                        help=('Number of times to retry sending webhook ' +
                              'data on failure.'),
                        type=int, default=3)
    parser.add_argument('-whct', '--wh-connect-timeout',
                        help=('Connect timeout (in seconds) for webhook' +
                              ' requests.'),
                        type=float, default=1.0)
    parser.add_argument('-whrt', '--wh-read-timeout',
                        help=('Read timeout (in seconds) for webhook ' +
                              'requests.'),
                        type=float, default=1.0)
    parser.add_argument('-whbf', '--wh-backoff-factor',
                        help=('Factor (in seconds) by which the delay ' +
                              'until next retry will increase.'),
                        type=float, default=0.25)
    parser.add_argument('-whlfu', '--wh-lfu-size',
                        help='Webhook LFU cache max size.', type=int,
                        default=2500)
    parser.add_argument('-whfi', '--wh-frame-interval',
                        help=('Minimum time (in ms) to wait before sending the'
                              + ' next webhook data frame.'), type=int,
                        default=500)
    parser.add_argument('--ssl-certificate',
                        help='Path to SSL certificate file.')
    parser.add_argument('--ssl-privatekey',
                        help='Path to SSL private key file.')
    parser.add_argument('-ps', '--print-status',
                        help=('Show a status screen instead of log ' +
                              'messages. Can switch between status and ' +
                              'logs by pressing enter.  Optionally specify ' +
                              '"logs" to startup in logging mode.'),
                        nargs='?', const='status', default=False,
                        metavar='logs')
    parser.add_argument('-slt', '--stats-log-timer',
                        help='In log view, list per hr stats every X seconds',
                        type=int, default=0)
    parser.add_argument('-sn', '--status-name', default=str(os.getpid()),
                        help=('Enable status page database update using ' +
                              'STATUS_NAME as main worker name.'))
    parser.add_argument('-hk', '--hash-key', default=None, action='append',
                        help='Key for hash server')
    parser.add_argument('-novc', '--no-version-check', action='store_true',
                        help='Disable API version check.',
                        default=False)
    parser.add_argument('-vci', '--version-check-interval', type=int,
                        help='Interval to check API version in seconds ' +
                        '(Default: in [60, 300]).',
                        default=random.randint(60, 300))
    parser.add_argument('-el', '--encrypt-lib',
                        help=('Path to encrypt lib to be used instead of ' +
                              'the shipped ones.'))
    parser.add_argument('-odt', '--on-demand_timeout',
                        help=('Pause searching while web UI is inactive ' +
                              'for this timeout (in seconds).'),
                        type=int, default=0)
    parser.add_argument('--disable-blacklist',
                        help=('Disable the global anti-scraper IP blacklist.'),
                        action='store_true', default=False)
    parser.add_argument('-tp', '--trusted-proxies', default=[],
                        action='append',
                        help=('Enables the use of X-FORWARDED-FOR headers ' +
                              'to identify the IP of clients connecting ' +
                              'through these trusted proxies.'))
    parser.add_argument('--api-version', default='0.91.2',
                        help=('API version currently in use.'))
    parser.add_argument('--no-file-logs',
                        help=('Disable logging to files. ' +
                              'Does not disable --access-logs.'),
                        action='store_true', default=False)
    parser.add_argument('--log-path',
                        help=('Defines directory to save log files to.'),
                        default='logs/')
    parser.add_argument('--log-filename',
                        help=('Defines the log filename to be saved.'
                              ' Allows date formatting, and replaces <SN>'
                              " with the instance's status name. Read the"
                              ' python time module docs for details.'
                              ' Default: %%Y%%m%%d_%%H%%M_<SN>.log.'),
                        default='%Y%m%d_%H%M_<SN>.log'),
    parser.add_argument('--dump',
                        help=('Dump censored debug info about the ' +
                              'environment and auto-upload to ' +
                              'hastebin.com.'),
                        action='store_true', default=False)
    parser.add_argument('-sazl', '--show-all-zoom-level',
                        help=('Show all Pokemon, even excluded, at this map '
                              'zoom level. Set to 0 to disable this feature. '
                              'Set to 19 or higher for nice results.'),
                        type=int, default=0)
    verbose = parser.add_mutually_exclusive_group()
    verbose.add_argument('-v',
                         help=('Show debug messages from RocketMap ' +
                               'and pgoapi. Can be repeated up to 3 times.'),
                         action='count', default=0, dest='verbose')
    verbose.add_argument('--verbosity',
                         help=('Show debug messages from RocketMap ' +
                               'and pgoapi.'),
                         type=int, dest='verbose')
    parser.add_argument('-rst', '--rareless-scans-threshold',
                        help=('Mark an account as blind/shadowbanned after '
                              'this many scans without finding any rare '
                              'Pokemon.'),
                        type=int, default=10)
    parser.add_argument('-rb', '--rotate-blind',
                        help='Rotate out blinded accounts.',
                        action='store_true', default=False)
    parser.add_argument('-pgpu', '--pgpool-url', default=None,
                        help='URL of PGPool account manager.')
    parser.add_argument('-gxp', '--gain-xp',
                        help='Do various things to let map accounts gain XP.',
                        action='store_true', default=False)
    parser.add_argument('-gen', '--generate-images',
                        help=('Use ImageMagick to generate dynamic' +
                              'icons on demand.'),
                        action='store_true', default=False)
    parser.add_argument('-pgsu', '--pgscout-url', default=None,
                        help='URL to query PGScout for Pokemon IV/CP.')
    parser.add_argument('-lurl', '--lure-url', default=None,
                        help='URL to query lure.')
    parser.add_argument('-pa', '--pogo-assets', default=None,
                        help=('Directory pointing to optional ' +
                              'PogoAssets root directory.'))
    parser.add_argument('-uas', '--user-auth-service', default=None,
                        help='Force end users to auth to an external service.')
    parser.add_argument('-uascid', '--uas-client-id', default=None,
                        help='Client ID for user external authentication.')
    parser.add_argument('-uascs', '--uas-client-secret', default=None,
                        help='Client Secret for user external authentication.')
    parser.add_argument('-uasho', '--uas-host-override', default=None,
                        help='Host override for user external authentication.')
    parser.add_argument('-uasdrg', '--uas-discord-required-guilds',
                        default=None,
                        help=('Required Discord Guild(s) for user ' +
                              'external authentication.'))
    parser.add_argument('-uasdgi', '--uas-discord-guild-invite', default=None,
                        help='Link for users not in required guild.')
    parser.add_argument('-uasdrr', '--uas-discord-required-roles',
                        default=None,
                        help=('Required Discord Guild Role(s) ' +
                              'for user external authentication.'))
    parser.add_argument('-uasdbt', '--uas-discord-bot-token', default=None,
                        help=('Discord Bot Token for user ' +
                              'external authentication.'))
    rarity = parser.add_argument_group('Dynamic Rarity')
    rarity.add_argument('-Rh', '--rarity-hours',
                        help=('Number of hours of Pokemon data to use' +
                              ' to calculate dynamic rarity. Decimals' +
                              ' allowed. Default: 48. 0 to use all data.'),
                        type=float, default=48)
    rarity.add_argument('-Rf', '--rarity-update-frequency',
                        help=('How often (in minutes) the dynamic rarity' +
                              ' should be updated. Decimals allowed.' +
                              ' Default: 0. 0 to disable.'),
                        type=float, default=0)
    parser.add_argument('-Rfn', '--rarity-filename', type=str,
                        help=('Filename of rarity json for different ' +
                              'databases (without .json) Default: rarity'),
                        default='rarity')
    statusp = parser.add_argument_group('Status Page')
    statusp.add_argument('-SPp', '--status-page-password', default=None,
                         help='Set the status page password.')
    statusp.add_argument('-SPf', '--status-page-filter',
                         help=('Filter worker status that are inactive for ' +
                               'X minutes. Default: 30, 0 to disable.'),
                         type=int, default=30)

    parser.set_defaults(DEBUG=False)

    args = parser.parse_args()

    # Allow status name and date formatting in log filename.
    args.log_filename = strftime(args.log_filename)
    args.log_filename = args.log_filename.replace('<sn>', '<SN>')
    args.log_filename = args.log_filename.replace('<SN>', args.status_name)

    if args.only_server:
        if args.location is None:
            parser.print_usage()
            print(sys.argv[0] +
                  ": error: arguments -l/--location is required.")
            sys.exit(1)
    else:
        # If using a CSV file, add the data where needed into the username,
        # password and auth_service arguments.
        # CSV file should have lines like "ptc,username,password",
        # "username,password" or "username".
        if args.accountcsv is not None and args.pgpool_url is None:
            # Giving num_fields something it would usually not get.
            num_fields = -1
            with open(args.accountcsv, 'r') as f:
                for num, line in enumerate(f, 1):

                    fields = []

                    # First time around populate num_fields with current field
                    # count.
                    if num_fields < 0:
                        num_fields = line.count(',') + 1

                    csv_input = []
                    csv_input.append('')
                    csv_input.append('<username>')
                    csv_input.append('<username>,<password>')
                    csv_input.append('<ptc/google>,<username>,<password>')

                    # If the number of fields is different,
                    # then this is not a CSV.
                    if num_fields != line.count(',') + 1:
                        print(sys.argv[0] +
                              ": Error parsing CSV file on line " + str(num) +
                              ". Your file started with the following " +
                              "input, '" + csv_input[num_fields] +
                              "' but now you gave us '" +
                              csv_input[line.count(',') + 1] + "'.")
                        sys.exit(1)

                    field_error = ''
                    line = line.strip()

                    # Ignore blank lines and comment lines.
                    if len(line) == 0 or line.startswith('#'):
                        continue

                    # If number of fields is more than 1 split the line into
                    # fields and strip them.
                    if num_fields > 1:
                        fields = line.split(",")
                        fields = map(str.strip, fields)

                    # If the number of fields is one then assume this is
                    # "username". As requested.
                    if num_fields == 1:
                        # Empty lines are already ignored.
                        args.username.append(line)

                    # If the number of fields is two then assume this is
                    # "username,password". As requested.
                    if num_fields == 2:
                        # If field length is not longer than 0 something is
                        # wrong!
                        if len(fields[0]) > 0:
                            args.username.append(fields[0])
                        else:
                            field_error = 'username'

                        # If field length is not longer than 0 something is
                        # wrong!
                        if len(fields[1]) > 0:
                            args.password.append(fields[1])
                        else:
                            field_error = 'password'

                    # If the number of fields is three then assume this is
                    # "ptc,username,password". As requested.
                    if num_fields >= 3:
                        # If field 0 is not ptc or google something is wrong!
                        if (fields[0].lower() == 'ptc' or
                                fields[0].lower() == 'google'):
                            args.auth_service.append(fields[0])
                        else:
                            field_error = 'method'

                        # If field length is not longer then 0 something is
                        # wrong!
                        if len(fields[1]) > 0:
                            args.username.append(fields[1])
                        else:
                            field_error = 'username'

                        # If field length is not longer then 0 something is
                        # wrong!
                        if len(fields[2]) > 0:
                            args.password.append(fields[2])
                        else:
                            field_error = 'password'

                    # If something is wrong display error.
                    if field_error != '':
                        type_error = 'empty!'
                        if field_error == 'method':
                            type_error = (
                                'not ptc or google instead we got \'' +
                                fields[0] + '\'!')
                        print(sys.argv[0] +
                              ": Error parsing CSV file on line " + str(num) +
                              ". We found " + str(num_fields) + " fields, " +
                              "so your input should have looked like '" +
                              csv_input[num_fields] + "'\nBut you gave us '" +
                              line + "', your " + field_error +
                              " was " + type_error)
                        sys.exit(1)

        errors = []

        if args.pgpool_url is None:
            num_auths = len(args.auth_service)
            num_usernames = 0
            num_passwords = 0

            if len(args.username) == 0:
                errors.append(
                    'Missing `username` either as -u/--username, csv file ' +
                    'using -ac, or in config.')
            else:
                num_usernames = len(args.username)

            if len(args.password) == 0:
                errors.append(
                    'Missing `password` either as -p/--password, csv file, ' +
                    'or in config.')
            else:
                num_passwords = len(args.password)

            if num_auths == 0:
                args.auth_service = ['ptc']

            num_auths = len(args.auth_service)

            if num_usernames > 1:
                if num_passwords > 1 and num_usernames != num_passwords:
                    errors.append((
                        'The number of provided ' +
                        'passwords ({}) must match the ' +
                        'username count ({})').format(num_passwords,
                                                      num_usernames))
                if num_auths > 1 and num_usernames != num_auths:
                    errors.append((
                        'The number of provided auth ({}) must match the ' +
                        'username count ({}).').format(num_auths,
                                                       num_usernames))
        elif args.workers is None:
            errors.append(
                'Missing `workers` either as -w/--workers or in config. ' +
                'Required when using PGPool.')

        if args.location is None:
            errors.append(
                'Missing `location` either as -l/--location or in config.')

        if args.step_limit is None:
            errors.append(
                'Missing `step_limit` either as -st/--step-limit or ' +
                'in config.')

        if len(errors) > 0:
            parser.print_usage()
            print(sys.argv[0] + ": errors: \n - " + "\n - ".join(errors))
            sys.exit(1)

        # Make the accounts list.
        args.accounts = []
        args.accounts_L30 = []
        if args.pgpool_url:
            # Request initial number of workers from PGPool
            args.pgpool_initial_accounts = (
                pgpool_request_accounts(args, initial=True))
            # Request L30 accounts from PGPool
            if args.highlvl_workers > 0:
                args.accounts_L30 = (
                    pgpool_request_accounts(args, highlvl=True, initial=True))
        else:
            # Fill the pass/auth if set to a single value.
            if num_passwords == 1:
                args.password = [args.password[0]] * num_usernames
            if num_auths == 1:
                args.auth_service = [args.auth_service[0]] * num_usernames

            # Fill the accounts list.
            args.accounts = []
            for i, username in enumerate(args.username):
                args.accounts.append({'username': username,
                                      'password': args.password[i],
                                      'auth_service': args.auth_service[i]})

            # Prepare the L30 accounts for the account sets.
            if args.high_lvl_accounts:
                # Context processor.
                with open(args.high_lvl_accounts, 'r') as accs:
                    for line in accs:
                        # Make sure it's not an empty line.
                        if not line.strip():
                            continue

                        line = line.split(',')

                        # We need "service, username, password".
                        if len(line) < 3:
                            raise Exception('L30 account is missing a'
                                            + ' field. Each line requires: '
                                            + '"service,user,pass".')

                        # Let's remove trailing whitespace.
                        service = line[0].strip()
                        username = line[1].strip()
                        password = line[2].strip()

                        hlvl_account = {
                            'auth_service': service,
                            'username': username,
                            'password': password,
                            'captcha': False
                        }

                        args.accounts_L30.append(hlvl_account)

        # Prepare the IV/CP scanning filters.
        args.enc_whitelist = []

        # Make max workers equal number of accounts if unspecified, and disable
        # account switching.
        if args.pgpool_url is None:
            if args.workers is None:
                args.workers = len(args.accounts)
                args.account_search_interval = None

        # Disable search interval if 0 specified.
        if args.account_search_interval == 0:
            args.account_search_interval = None

        # Make sure we don't have an empty account list after adding command
        # line and CSV accounts.
        if args.pgpool_url is None:
            if len(args.accounts) == 0:
                print(sys.argv[0] +
                      ': Error: no accounts specified. Use -a, ' +
                      '-u, and -p or ' +
                      '--accountcsv to add accounts. Or use ' +
                      '-pgpu/--pgpool-url to ' +
                      'specify the URL of PGPool.')
                sys.exit(1)

        # create an empty set
        args.ignorelist = []
        if args.ignorelist_file:
            with open(args.ignorelist_file) as f:
                args.ignorelist = frozenset([int(l.strip()) for l in f])

        # Decide which scanning mode to use.
        if args.spawnpoint_scanning:
            args.scheduler = 'SpawnScan'
        elif args.skip_empty:
            args.scheduler = 'HexSearchSpawnpoint'
        elif args.speed_scan:
            args.scheduler = 'SpeedScan'
        else:
            args.scheduler = 'HexSearch'

        # Disable webhook scheduler updates if webhooks are disabled
        if args.webhooks is None:
            args.wh_types = frozenset()
        else:
            args.wh_types = frozenset([i for i in args.wh_types])

    # Normalize PGScout URL
    if args.pgscout_url:
        # Remove trailing slashes
        if args.pgscout_url.endswith('/'):
            args.pgscout_url = args.pgscout_url[:len(args.pgscout_url) - 1]
        # Add /iv if needed
        if not args.pgscout_url.endswith('/iv'):
            args.pgscout_url = '{}/iv'.format(args.pgscout_url)

    args.locales_dir = 'static/dist/locales'
    args.data_dir = 'static/dist/data'

    return args


def init_dynamic_images(args):
    if args.generate_images:
        executable = determine_imagemagick_binary()
        if executable:
            dyn_img.generate_images = True
            dyn_img.imagemagick_executable = executable
            log.info("Generating icons using ImageMagick " +
                     "executable '{}'.".format(executable))

            if args.pogo_assets:
                decr_assets_dir = os.path.join(args.pogo_assets,
                                               'decrypted_assets')
                if os.path.isdir(decr_assets_dir):
                    log.info("Using PogoAssets repository at '{}'".format(
                        args.pogo_assets))
                    dyn_img.pogo_assets = args.pogo_assets
                else:
                    log.error(("Could not find PogoAssets repository at '{}'. "
                               "Clone via 'git clone -depth 1 "
                               "https://github.com/ZeChrales/PogoAssets.git'")
                              .format(args.pogo_assets))
        else:
            log.error("Could not find ImageMagick executable. Make sure "
                      "you can execute either 'magick' (ImageMagick 7)"
                      " or 'convert' (ImageMagick 6) from the commandline. "
                      "Otherwise you cannot use --generate-images")
            sys.exit(1)


def is_imagemagick_binary(binary):
    try:
        process = subprocess.Popen([binary, '-version'],
                                   stdout=subprocess.PIPE)
        out, err = process.communicate()
        return "ImageMagick" in out
    except Exception:
        return False


def determine_imagemagick_binary():
    candidates = {
        'magick': 'magick convert',
        'convert': None
    }
    for c in candidates:
        if is_imagemagick_binary(c):
            return candidates[c] if candidates[c] else c
    return None


def init_args(args):
    """
    Initialize commandline arguments after parsing.
    Some things need to happen after parsing.
    :param args: The parsed commandline arguments
    """

    watchercfg = {}
    # IV/CP scanning.
    if args.enc_whitelist_file:
        log.info("Watching encounter whitelist file {} for changes.".format(
            args.enc_whitelist_file))
        watchercfg['enc_whitelist'] = (args.enc_whitelist_file, None)

    # Prepare webhook whitelist - empty list means no restrictions
    args.webhook_whitelist = []
    if args.webhook_whitelist_file:
        log.info("Watching webhook whitelist file {} for changes.".format(
            args.webhook_whitelist_file))
        watchercfg['webhook_whitelist'] = (args.webhook_whitelist_file, None)

    t = Thread(target=watch_pokemon_lists, args=(args, watchercfg))
    t.daemon = True
    t.start()

    init_dynamic_images(args)


def watch_pokemon_lists(args, cfg):
    while True:
        for args_key in cfg:
            filename, tstamp = cfg[args_key]

            statbuf = os.stat(filename)
            current_mtime = statbuf.st_mtime

            if current_mtime != tstamp:
                with open(filename) as f:
                    setattr(args, args_key, read_pokemon_ids_from_file(f))
                    log.info("File {} changed on disk. Re-read as {}.".format(
                        filename, args_key))
                cfg[args_key] = (filename, current_mtime)

        time.sleep(5)


def now():
    # The fact that you need this helper...
    return int(time.time())


# Gets the seconds past the hour.
def cur_sec():
    return (60 * time.gmtime().tm_min) + time.gmtime().tm_sec


# Gets the total seconds past the hour for a given date.
def date_secs(d):
    return d.minute * 60 + d.second


# Checks to see if test is between start and end accounting for hour
# wraparound.
def clock_between(start, test, end):
    return ((start <= test <= end and start < end) or
            (not (end <= test <= start) and start > end))


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


def i8ln(word):
    if not hasattr(i8ln, 'dictionary'):
        args = get_args()
        file_path = os.path.join(
            args.root_path,
            args.locales_dir,
            '{}.min.json'.format(args.locale))
        if os.path.isfile(file_path):
            with open(file_path, 'r') as f:
                i8ln.dictionary = json.loads(f.read())
        else:
            # If locale file is not found we set an empty dict to avoid
            # checking the file every time, we skip the warning for English as
            # it is not expected to exist.
            if not args.locale == 'en':
                log.warning(
                    'Skipping translations - unable to find locale file: %s',
                    file_path)
            i8ln.dictionary = {}
    if word in i8ln.dictionary:
        return i8ln.dictionary[word]
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
            get_pokemon_data.pokemon = json.loads(f.read())
    return get_pokemon_data.pokemon[str(pokemon_id)]


def get_pokemon_id(pokemon_name):
    if not hasattr(get_pokemon_id, 'ids'):
        if not hasattr(get_pokemon_data, 'pokemon'):
            # initialize from file
            get_pokemon_data(1)

        get_pokemon_id.ids = {}
        for pokemon_id, data in get_pokemon_data.pokemon.iteritems():
            get_pokemon_id.ids[data['name']] = int(pokemon_id)

    return get_pokemon_id.ids.get(pokemon_name, -1)


def get_pokemon_name(pokemon_id):
    return i8ln(get_pokemon_data(pokemon_id)['name'])


def get_pokemon_types(pokemon_id):
    pokemon_types = get_pokemon_data(pokemon_id)['types']
    return map(lambda x: {"type": i8ln(x['type']), "color": x['color']},
               pokemon_types)


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
    return i8ln(get_moves_data(move_id)['name'])


def get_move_damage(move_id):
    return i8ln(get_moves_data(move_id)['damage'])


def get_move_energy(move_id):
    return i8ln(get_moves_data(move_id)['energy'])


def get_move_type(move_id):
    move_type = get_moves_data(move_id)['type']
    return {'type': i8ln(move_type), 'type_en': move_type}


def dottedQuadToNum(ip):
    return struct.unpack("!L", socket.inet_aton(ip))[0]


def clear_dict_response(response):
    responses = [
        'GET_HATCHED_EGGS', 'GET_INVENTORY', 'CHECK_AWARDED_BADGES',
        'DOWNLOAD_SETTINGS', 'GET_BUDDY_WALKED', 'GET_INBOX'
    ]
    for item in responses:
        if item in response:
            del response[item]
    return response


def calc_pokemon_level(cp_multiplier):
    if cp_multiplier < 0.734:
        pokemon_level = (58.35178527 * cp_multiplier * cp_multiplier -
                         2.838007664 * cp_multiplier + 0.8539209906)
    else:
        pokemon_level = 171.0112688 * cp_multiplier - 95.20425243
    pokemon_level = int((round(pokemon_level) * 2) / 2)
    return pokemon_level


@memoize
def gmaps_reverse_geolocate(gmaps_key, locale, location):
    # Find the reverse geolocation
    geolocator = GoogleV3(api_key=gmaps_key)

    player_locale = {
        'country': 'US',
        'language': locale,
        'timezone': 'America/Denver'
    }

    try:
        reverse = geolocator.reverse(location)
        address = reverse[-1].raw['address_components']
        country_code = 'US'

        # Find country component.
        for component in address:
            # Look for country.
            component_is_country = any([t == 'country'
                                        for t in component.get('types', [])])

            if component_is_country:
                country_code = component['short_name']
                break

        try:
            timezone = geolocator.timezone(location)
            player_locale.update({
                'country': country_code,
                'timezone': str(timezone)
            })
        except Exception as e:
            log.exception('Exception on Google Timezone API. '
                          + 'Please check that you have Google Timezone API'
                          + ' enabled for your API key'
                          + ' (https://developers.google.com/maps/'
                          + 'documentation/timezone/intro): %s.', e)
    except Exception as e:
        log.exception('Exception while obtaining player locale: %s.'
                      + ' Using default locale.', e)

    return player_locale


# Get a future_requests FuturesSession that supports asynchronous workers
# and retrying requests on failure.
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
    session = FuturesSession(max_workers=pool_size)

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
        'accounts',
        'accounts_L30',
        'username',
        'password',
        'auth_service',
        'proxy',
        'webhooks',
        'webhook_blacklist',
        'webhook_whitelist',
        'config',
        'accountcsv',
        'high_lvl_accounts',
        'geofence_file',
        'geofence_excluded_file',
        'ignorelist_file',
        'enc_whitelist_file',
        'webhook_whitelist_file',
        'webhook_blacklist_file',
        'db',
        'proxy_file',
        'log_path',
        'log_filename',
        'encrypt_lib',
        'ssl_certificate',
        'ssl_privatekey',
        'location',
        'captcha_key',
        'captcha_dsk',
        'manual_captcha_domain',
        'host',
        'port',
        'gmaps_key',
        'db_name',
        'db_user',
        'db_pass',
        'db_host',
        'db_port',
        'status_name',
        'status_page_password',
        'hash_key',
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
    spawn_group = 'Common'

    spawn_rate_pct = total_spawns_pokemon / float(total_spawns_all)
    spawn_rate_pct = round(100 * spawn_rate_pct, 4)

    if spawn_rate_pct == 0:
        spawn_group = 'New Spawn'
    elif spawn_rate_pct < 0.01:
        spawn_group = 'Ultra Rare'
    elif spawn_rate_pct < 0.03:
        spawn_group = 'Very Rare'
    elif spawn_rate_pct < 0.5:
        spawn_group = 'Rare'
    elif spawn_rate_pct < 1:
        spawn_group = 'Uncommon'

    return spawn_group


def dynamic_rarity_refresher():
    # If we import at the top, pogom.models will import pogom.utils,
    # causing the cyclic import to make some things unavailable.
    from pogom.models import Pokemon

    # Refresh every x hours.
    args = get_args()
    hours = args.rarity_hours
    root_path = args.root_path

    rarities_path = os.path.join(
        root_path, 'static/dist/data/' + args.rarity_filename + '.json')

    update_frequency_mins = args.rarity_update_frequency
    refresh_time_sec = update_frequency_mins * 60

    while True:
        log.info('Updating dynamic rarity...')

        start = default_timer()
        db_rarities = Pokemon.get_spawn_counts(hours)
        total = db_rarities['total']
        pokemon = db_rarities['pokemon']

        # Store as an easy lookup table for front-end.
        rarities = {}

        for poke in pokemon:
            rarities[poke['pokemon_id']] = get_pokemon_rarity(total,
                                                              poke['count'])

        # Save to file.
        with open(rarities_path, 'w') as outfile:
            json.dump(rarities, outfile)

        duration = default_timer() - start
        log.info('Updated dynamic rarity. It took %.2fs for %d entries.',
                 duration,
                 total)

        # Wait x seconds before next refresh.
        log.debug('Waiting %d minutes before next dynamic rarity update.',
                  refresh_time_sec / 60)
        time.sleep(refresh_time_sec)


# Translate peewee model class attribute to database column name.
def peewee_attr_to_col(cls, field):
    field_column = getattr(cls, field)

    # Only try to do it on populated fields.
    if field_column is not None:
        field_column = field_column.db_column
    else:
        field_column = field

    return field_column
