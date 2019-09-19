#!/usr/bin/python
# -*- coding: utf-8 -*-

import sys
from threading import Thread

import configargparse
import os
import json
import logging
import time
import socket
import struct
import psutil
import subprocess
import requests

from collections import OrderedDict
from s2sphere import CellId, LatLng
from geopy.geocoders import Nominatim
from requests import Session
from requests.packages.urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter
from cHaversine import haversine
from pprint import pformat
from time import strftime
from timeit import default_timer

from . import dyn_img

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
    parser.add_argument('-l', '--location',
                        help='Location, can be an address or coordinates.')
    parser.add_argument('-al', '--access-logs',
                        help=("Write web logs to access.log."),
                        action='store_true', default=False)
    parser.add_argument('-enc', '--encounter',
                        help='Start an encounter to gather IVs and moves.',
                        action='store_true', default=False)
    parser.add_argument('-mpm', '--medalpokemon',
                        help='Show notify for tiny rattata and big magikarp.',
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
    parser.add_argument('-C', '--cors', help='Enable CORS on web server.',
                        action='store_true', default=False)
    parser.add_argument('-cd', '--clear-db',
                        help=('Deletes the existing database before ' +
                              'starting the Webserver.'),
                        action='store_true', default=False)
    parser.add_argument('-np', '--no-pokemon',
                        help=('Disables Pokemon from the map.'),
                        action='store_true', default=False)
    parser.add_argument('-ng', '--no-gyms',
                        help=('Disables Gyms from the map.'),
                        action='store_true', default=False)
    parser.add_argument('-nr', '--no-raids',
                        help=('Disables Raids from the map.'),
                        action='store_true', default=False)
    parser.add_argument('-ns', '--no-pokestops',
                        help=('Disables PokeStops from the map.'),
                        action='store_true', default=False)
    parser.add_argument('-nq', '--no-quests',
                        help=('Disables quests from the map.'),
                        action='store_true', default=False)
    parser.add_argument('-ngs', '--no-gym-sidebar',
                        help=('Disable the gym sidebar and toggle.'),
                        action='store_true', default=False)
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
    group.add_argument('--db-threads',
                       help=('Number of db threads; increase if the db ' +
                             'queue falls behind.'), type=int, default=1)
    group = parser.add_argument_group('Database Cleanup')
    group.add_argument('-DC', '--db-cleanup',
                       help='Enable regular database cleanup thread.',
                       action='store_true', default=False)
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
    parser.add_argument('--ssl-certificate',
                        help='Path to SSL certificate file.')
    parser.add_argument('--ssl-privatekey',
                        help='Path to SSL private key file.')
    parser.add_argument('-sn', '--status-name', default=str(os.getpid()),
                        help=('Enable status page database update using ' +
                              'STATUS_NAME as main worker name.'))
    parser.add_argument('--disable-blacklist',
                        help=('Disable the global anti-scraper IP blacklist.'),
                        action='store_true', default=False)
    parser.add_argument('-tp', '--trusted-proxies', default=[],
                        action='append',
                        help=('Enables the use of X-FORWARDED-FOR headers ' +
                              'to identify the IP of clients connecting ' +
                              'through these trusted proxies.'))
    parser.add_argument('--no-file-logs',
                        help=('Disable logging to files. ' +
                              'Does not disable --access-logs.'),
                        action='store_true', default=False)
    parser.add_argument('--log-path',
                        help=('Defines directory to save log files to.'),
                        default='logs/')
    parser.add_argument('--log-filename',
                        help=('Defines the log filename to be saved. ' +
                              'Allows date formatting, and replaces <SN> ' +
                              'with the instance\'s status name. Read the ' +
                              'python time module docs for details. ' +
                              'Default: %%Y%%m%%d_%%H%%M_<SN>.log.'),
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
    parser.add_argument('-gen', '--generate-images',
                        help=('Use ImageMagick to generate dynamic' +
                              'icons on demand.'),
                        action='store_true', default=False)
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
    parser.add_argument('-mt', '--map-title',
                        help=('The title of the map. Default: RocketMap'),
                        default='RocketMap')
    parser.add_argument('-hi', '--header-image',
                         help='Image in header.',
                         default='rocket.png')
    parser.add_argument('-mu', '--madmin-url', help='MADmin server URL.',
                        default=None)
    parser.add_argument('-dtu', '--donate-url', help='Donation link, e.g.' +
                        ' PayPal.', default=None)
    parser.add_argument('-pu', '--patreon-url', help='Patreon page link.',
                        default=None)
    parser.add_argument('-du', '--discord-url', help='Discord server invite' +
                        ' link.', default=None)
    parser.add_argument('-mru', '--messenger-url', help='Messenger group'
                        ' invite link.', default=None)
    parser.add_argument('-tu', '--telegram-url', help='Telegram group invite' +
                        ' link.', default=None)
    parser.add_argument('-wu', '--whatsapp-url', help='WhatsApp group invite' +
                        ' link.', default=None)
    parser.add_argument('-bwb', '--black-white-badges',
                        help='Use black/white background with white/black' +
                        ' text for gym/raid level badge in gym icons.',
                        action='store_true', default=False)
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

    parser.set_defaults(DEBUG=False)

    args = parser.parse_args()

    # Allow status name and date formatting in log filename.
    args.log_filename = strftime(args.log_filename)
    args.log_filename = args.log_filename.replace('<sn>', '<SN>')
    args.log_filename = args.log_filename.replace('<SN>', args.status_name)

    if args.location is None:
        parser.print_usage()
        print((sys.argv[0] +
               ": error: arguments -l/--location is required."))
        sys.exit(1)

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
                                               'pokemon_icons')
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
        return "ImageMagick" in out.decode('utf8')
    except Exception as e:
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


def now():
    # The fact that you need this helper...
    return int(time.time())


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
    return i8ln(get_pokemon_data(pokemon_id)['name'])


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


def calc_pokemon_level(cp_multiplier):
    if cp_multiplier < 0.734:
        pokemon_level = (58.35178527 * cp_multiplier * cp_multiplier -
                         2.838007664 * cp_multiplier + 0.8539209906)
    else:
        pokemon_level = 171.0112688 * cp_multiplier - 95.20425243
    pokemon_level = int((round(pokemon_level) * 2) / 2)
    return pokemon_level


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
