#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import logging
import time
import re
import ssl
import requests

from distutils.version import StrictVersion

from threading import Thread, Event

from mrmime import init_mr_mime
from queue import Queue
from flask_cors import CORS
from flask_cache_bust import init_cache_busting

from colorlog import ColoredFormatter

from pogom.app import Pogom
from pogom.utils import (get_args, now, gmaps_reverse_geolocate, init_args,
                         log_resource_usage_loop, get_debug_dump_link,
                         dynamic_rarity_refresher)
from pogom.altitude import get_gmaps_altitude

from pogom.models import (init_database, create_tables, drop_tables,
                          PlayerLocale, db_updater, clean_db_loop,
                          verify_table_encoding, verify_database_schema)
from pogom.webhook import wh_updater

from pogom.proxy import initialize_proxies
from pogom.search import search_overseer_thread
from time import strftime


class LogFilter(logging.Filter):

    def __init__(self, level):
        self.level = level

    def filter(self, record):
        return record.levelno < self.level


# Moved here so logger is configured at load time.
console = logging.StreamHandler()
args = get_args()
if not (args.verbose):
    console.setLevel(logging.INFO)

formatter = ColoredFormatter(
    #'%(asctime)s [%(threadName)16s][%(levelname)8s] %(message)s',

    '%(log_color)s [%(asctime)s] [%(threadName)16s] [%(module)14s] [%(levelname)8s] %(message)s',
    datefmt='%m-%d %H:%M:%S',
    reset=True,
    log_colors={
        'DEBUG': 'purple',
        'INFO': 'cyan',
        'WARNING': 'yellow',
        'ERROR': 'red',
        'CRITICAL': 'red,bg_white',
    },
    secondary_log_colors={},
    style='%'
    )

console.setFormatter(formatter)

# Redirect messages lower than WARNING to stdout
stdout_hdlr = logging.StreamHandler(sys.stdout)
stdout_hdlr.setFormatter(formatter)
log_filter = LogFilter(logging.WARNING)
stdout_hdlr.addFilter(log_filter)
stdout_hdlr.setLevel(5)

# Redirect messages equal or higher than WARNING to stderr
stderr_hdlr = logging.StreamHandler(sys.stderr)
stderr_hdlr.setFormatter(formatter)
stderr_hdlr.setLevel(logging.WARNING)

log = logging.getLogger()
log.addHandler(stdout_hdlr)
log.addHandler(stderr_hdlr)


# Assert pgoapi is installed.
try:
    import pgoapi
    from pgoapi import PGoApi, utilities as util
except ImportError:
    log.critical(
        "It seems `pgoapi` is not installed. Try running " +
        "pip install --upgrade -r requirements.txt.")
    sys.exit(1)


# Patch to make exceptions in threads cause an exception.
def install_thread_excepthook():
    """
    Workaround for sys.excepthook thread bug
    (https://sourceforge.net/tracker/?func=detail&atid=105470&aid=1230540&group_id=5470).
    Call once from __main__ before creating any threads.
    If using psyco, call psycho.cannotcompile(threading.Thread.run)
    since this replaces a new-style class method.
    """
    import sys
    run_old = Thread.run

    def run(*args, **kwargs):
        try:
            run_old(*args, **kwargs)
        except (KeyboardInterrupt, SystemExit):
            raise
        except Exception:
            exc_type, exc_value, exc_trace = sys.exc_info()
            print repr(sys.exc_info())

            # Handle Flask's broken pipe when a client prematurely ends
            # the connection.
            if str(exc_value) == '[Errno 32] Broken pipe':
                pass
            else:
                log.critical('Unhandled patched exception (%s): "%s".',
                             exc_type, exc_value)
                sys.excepthook(exc_type, exc_value, exc_trace)
    Thread.run = run


# Exception handler will log unhandled exceptions.
def handle_exception(exc_type, exc_value, exc_traceback):
    if issubclass(exc_type, KeyboardInterrupt):
        sys.__excepthook__(exc_type, exc_value, exc_traceback)
        return

    log.error("Uncaught exception", exc_info=(
        exc_type, exc_value, exc_traceback))


def validate_assets(args):
    assets_error_log = (
        'Missing front-end assets (static/dist) -- please run ' +
        '"npm install && npm run build" before starting the server.')

    root_path = os.path.dirname(__file__)
    if not os.path.exists(os.path.join(root_path, 'static/dist')):
        log.critical(assets_error_log)
        return False

    static_path = os.path.join(root_path, 'static/js')
    for file in os.listdir(static_path):
        if file.endswith(".js"):
            generated_path = os.path.join(static_path, '../dist/js/',
                                          file.replace(".js", ".min.js"))
            source_path = os.path.join(static_path, file)
            if not os.path.exists(generated_path) or (
                    os.path.getmtime(source_path) >
                    os.path.getmtime(generated_path)):
                log.critical(assets_error_log)
                return False

    # You need custom image files now.
    if not os.path.isfile(
            os.path.join(root_path, 'static/icons-sprite.png')):
        log.critical(assets_error_log)
        return False

    # Check if custom.css is used otherwise fall back to default.
    if os.path.exists(os.path.join(root_path, 'static/css/custom.css')):
        args.custom_css = True
        log.info(
            'File \"custom.css\" found, applying user-defined settings.')
    else:
        args.custom_css = False
        log.info('No file \"custom.css\" found, using default settings.')

    # Check if custom.js is used otherwise fall back to default.
    if os.path.exists(os.path.join(root_path, 'static/js/custom.js')):
        args.custom_js = True
        log.info(
            'File \"custom.js\" found, applying user-defined settings.')
    else:
        args.custom_js = False
        log.info('No file \"custom.js\" found, using default settings.')

    return True


def can_start_scanning(args):
    # Currently supported pgoapi.
    pgoapi_version = "1.2.0"
    api_version_error = (
        'The installed pgoapi is out of date. Please refer to ' +
        'http://rocketmap.readthedocs.io/en/develop/common-issues/' +
        'faq.html#i-get-an-error-about-pgoapi-version'
    )

    # Assert pgoapi >= pgoapi_version.
    if (not hasattr(pgoapi, "__version__") or
            StrictVersion(pgoapi.__version__) < StrictVersion(pgoapi_version)):
        log.critical(api_version_error)
        return False

    # Abort if we don't have a hash key set.
    if not args.hash_key:
        log.critical('Hash key is required for scanning. Exiting.')
        return False

    # Check the PoGo api pgoapi implements against what RM is expecting.
    # Some API versions have a non-standard version int, so we map them
    # to the correct one.
    api_version_int = int(args.api_version.replace('.', '0'))
    api_version_map = {
        8302: 8300,
        8501: 8500,
        8705: 8700,
        8901: 8900,
        9101: 9100,
        9102: 9100
    }
    mapped_version_int = api_version_map.get(api_version_int, api_version_int)

    try:
        if PGoApi.get_api_version() != mapped_version_int:
            log.critical(api_version_error)
            return False
    except AttributeError:
        log.critical(api_version_error)
        return False

    return True


def startup_db(app, clear_db):
    db = init_database(app)
    if clear_db:
        log.info('Clearing database')
        drop_tables(db)

    verify_database_schema(db)

    create_tables(db)

    # Fix encoding on present and future tables.
    verify_table_encoding(db)

    if clear_db:
        log.info(
            'Drop and recreate is complete. Now remove -cd and restart.')
        sys.exit()
    return db


def extract_coordinates(location):
    # Use lat/lng directly if matches such a pattern.
    prog = re.compile("^(\-?\d+\.\d+),?\s?(\-?\d+\.\d+)$")
    res = prog.match(location)
    if res:
        log.debug('Using coordinates from CLI directly')
        position = (float(res.group(1)), float(res.group(2)), 0)
    else:
        log.debug('Looking up coordinates in API')
        position = util.get_pos_by_name(location)

    if position is None or not any(position):
        log.error("Location not found: '{}'".format(location))
        sys.exit()
    return position

def main():
    # Patch threading to make exceptions catchable.
    install_thread_excepthook()

    # Make sure exceptions get logged.
    sys.excepthook = handle_exception

    args = get_args()

    # Abort if status name is not valid.
    regexp = re.compile('^([\w\s\-.]+)$')
    if not regexp.match(args.status_name):
        log.critical('Status name contains illegal characters.')
        sys.exit(1)

    set_log_and_verbosity(log)

    args.root_path = os.path.dirname(os.path.abspath(__file__))
    init_args(args)

    # Initialize Mr. Mime library
    mrmime_cfg = {
        # We don't want exceptions on captchas because we handle them differently.
        'exception_on_captcha': False,
        # MrMime shouldn't jitter
        'jitter_gmo': False,
        'pgpool_system_id': args.status_name
    }
    # Don't clear PGPool URL if it's not given in config but set in MrMime config JSON
    if args.pgpool_url:
        mrmime_cfg['pgpool_url'] = args.pgpool_url
    mrmime_config_file = os.path.join(os.path.dirname(__file__), 'config/mrmime_config.json')
    init_mr_mime(config_file=mrmime_config_file, user_cfg=mrmime_cfg)

    # Abort if only-server and no-server are used together
    if args.only_server and args.no_server:
        log.critical(
            "You can't use no-server and only-server at the same time, silly.")
        sys.exit(1)

    # Stop if we're just looking for a debug dump.
    if args.dump:
        log.info('Retrieving environment info...')
        hastebin_id = get_debug_dump_link()
        log.info('Done! Your debug link: https://hastebin.com/%s.txt',
                 hastebin_id)
        sys.exit(1)

    # Let's not forget to run Grunt / Only needed when running with webserver.
    if not args.no_server and not validate_assets(args):
        sys.exit(1)

    if args.no_version_check and not args.only_server:
        log.warning('You are running RocketMap in No Version Check mode. '
                    "If you don't know what you're doing, this mode "
                    'can have negative consequences, and you will not '
                    'receive support running in NoVC mode. '
                    'You have been warned.')


    position = extract_coordinates(args.location)
    # Use the latitude and longitude to get the local altitude from Google.
    (altitude, status) = get_gmaps_altitude(position[0], position[1],
                                            args.gmaps_key)
    if altitude is not None:
        log.debug('Local altitude is: %sm.', altitude)
        position = (position[0], position[1], altitude)
    else:
        if status == 'REQUEST_DENIED':
            log.error(
                'Google API Elevation request was denied. You probably ' +
                'forgot to enable elevation api in https://console.' +
                'developers.google.com/apis/api/elevation_backend/')
            sys.exit()
        else:
            log.error('Unable to retrieve altitude from Google APIs' +
                      'setting to 0')

    log.info('Parsed location is: %.4f/%.4f/%.4f (lat/lng/alt).',
             position[0], position[1], position[2])

    # Scanning toggles.
    log.info('Parsing of Pokemon %s.',
             'disabled' if args.no_pokemon else 'enabled')
    log.info('Parsing of Pokestops %s.',
             'disabled' if args.no_pokestops else 'enabled')
    log.info('Parsing of Gyms %s.',
             'disabled' if args.no_gyms else 'enabled')
    log.info('Pokemon encounters %s.',
             'enabled' if args.encounter else 'disabled')

    app = None
    if not args.no_server and not args.clear_db:
        app = Pogom(__name__,
                    root_path=os.path.dirname(
                              os.path.abspath(__file__)).decode('utf8'))
        app.before_request(app.validate_request)
        app.set_current_location(position)

    db = startup_db(app, args.clear_db)


    # Control the search status (running or not) across threads.
    control_flags = {
      'on_demand': Event(),
      'api_watchdog': Event(),
      'search_control': Event()
    }

    for flag in control_flags.values():
        flag.clear()

    if args.on_demand_timeout > 0:
        control_flags['on_demand'].set()

    heartbeat = [now()]

    # Setup the location tracking queue and push the first location on.
    new_location_queue = Queue()
    new_location_queue.put(position)

    # DB Updates
    db_updates_queue = Queue()
    if app:
        app.set_db_updates_queue(db_updates_queue)

    # Thread(s) to process database updates.
    for i in range(args.db_threads):
        log.debug('Starting db-updater worker thread %d', i)
        t = Thread(target=db_updater, name='db-updater-{}'.format(i),
                   args=(db_updates_queue, db))
        t.daemon = True
        t.start()

    # Database cleaner; really only need one ever.
    if args.db_cleanup:
        t = Thread(target=clean_db_loop, name='db-cleaner', args=(args,))
        t.daemon = True
        t.start()

    # WH updates queue & WH unique key LFU caches.
    # The LFU caches will stop the server from resending the same data an
    # infinite number of times. The caches will be instantiated in the
    # webhook's startup code.
    wh_updates_queue = Queue()
    wh_key_cache = {}

    if not args.wh_types:
        log.info('Webhook disabled.')
    else:
        log.info('Webhook enabled for events: sending %s to %s.',
                 args.wh_types,
                 args.webhooks)

        # Thread to process webhook updates.
        for i in range(args.wh_threads):
            log.debug('Starting wh-updater worker thread %d', i)
            t = Thread(target=wh_updater, name='wh-updater-{}'.format(i),
                       args=(args, wh_updates_queue, wh_key_cache))
            t.daemon = True
            t.start()

    if not args.only_server:
        # Speed limit.
        log.info('Scanning speed limit %s.',
                 'set to {} km/h'.format(args.kph)
                 if args.kph > 0 else 'disabled')
        log.info('High-level speed limit %s.',
                 'set to {} km/h'.format(args.hlvl_kph)
                 if args.hlvl_kph > 0 else 'disabled')

        # Check if we are able to scan.
        if not can_start_scanning(args):
            sys.exit(1)

        initialize_proxies(args)

        # Update player locale if not set correctly, yet.
        args.player_locale = PlayerLocale.get_locale(args.location)
        if not args.player_locale:
            args.player_locale = gmaps_reverse_geolocate(
                args.gmaps_key,
                args.locale,
                str(position[0]) + ', ' + str(position[1]))
            db_player_locale = {
                'location': args.location,
                'country': args.player_locale['country'],
                'language': args.player_locale['country'],
                'timezone': args.player_locale['timezone'],
            }
            db_updates_queue.put((PlayerLocale, {0: db_player_locale}))
        else:
            log.debug(
                'Existing player locale has been retrieved from the DB.')

        # Gather the Pokemon!


        argset = (args, new_location_queue, control_flags,
                  heartbeat, db_updates_queue, wh_updates_queue)

        log.debug('Starting a %s search thread', args.scheduler)
        search_thread = Thread(target=search_overseer_thread,
                               name='search-overseer', args=argset)
        search_thread.daemon = True
        search_thread.start()

    if args.no_server:
        # This loop allows for ctrl-c interupts to work since flask won't be
        # holding the program open.
        while search_thread.is_alive():
            time.sleep(60)
    else:
        # Dynamic rarity.
        if args.rarity_update_frequency:
            t = Thread(target=dynamic_rarity_refresher,
                       name='dynamic-rarity')
            t.daemon = True
            t.start()
            log.info('Dynamic rarity is enabled.')
        else:
            log.info('Dynamic rarity is disabled.')

        if args.cors:
            CORS(app)

        # No more stale JS.
        init_cache_busting(app)

        app.set_control_flags(control_flags)
        app.set_heartbeat_control(heartbeat)
        app.set_location_queue(new_location_queue)
        ssl_context = None
        if (args.ssl_certificate and args.ssl_privatekey and
                os.path.exists(args.ssl_certificate) and
                os.path.exists(args.ssl_privatekey)):
            ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
            ssl_context.load_cert_chain(
                args.ssl_certificate, args.ssl_privatekey)
            log.info('Web server in SSL mode.')
        if args.verbose:
            app.run(threaded=True, use_reloader=False, debug=True,
                    host=args.host, port=args.port, ssl_context=ssl_context)
        else:
            app.run(threaded=True, use_reloader=False, debug=False,
                    host=args.host, port=args.port, ssl_context=ssl_context)


def set_log_and_verbosity(log):
    # Always write to log file.
    args = get_args()
    # Create directory for log files.
    if not os.path.exists(args.log_path):
        os.mkdir(args.log_path)
    if not args.no_file_logs:
        date = strftime('%Y%m%d_%H%M')
        filename = os.path.join(
            args.log_path, '{}_{}.log'.format(date, args.status_name))
        filelog = logging.FileHandler(filename)
        filelog.setFormatter(logging.Formatter(
            '%(asctime)s [%(threadName)18s][%(module)14s][%(levelname)8s] ' +
            '%(message)s'))
        log.addHandler(filelog)

    if args.verbose:
        log.setLevel(logging.DEBUG)

        # Let's log some periodic resource usage stats.
        t = Thread(target=log_resource_usage_loop, name='res-usage')
        t.daemon = True
        t.start()
    else:
        log.setLevel(logging.INFO)

    # These are very noisy, let's shush them up a bit.
    logging.getLogger('peewee').setLevel(logging.INFO)
    logging.getLogger('requests').setLevel(logging.WARNING)
    logging.getLogger('pgoapi.pgoapi').setLevel(logging.WARNING)
    logging.getLogger('pgoapi.rpc_api').setLevel(logging.INFO)
    logging.getLogger('werkzeug').setLevel(logging.ERROR)
    logging.getLogger('pogom.apiRequests').setLevel(logging.INFO)

    # This sneaky one calls log.warning() on every retry.
    urllib3_logger = logging.getLogger(requests.packages.urllib3.__package__)
    urllib3_logger.setLevel(logging.ERROR)

    # Turn these back up if debugging.
    if args.verbose >= 2:
        logging.getLogger('pgoapi').setLevel(logging.DEBUG)
        logging.getLogger('pgoapi.pgoapi').setLevel(logging.DEBUG)
        logging.getLogger('requests').setLevel(logging.DEBUG)
        urllib3_logger.setLevel(logging.INFO)

    if args.verbose >= 3:
        logging.getLogger('peewee').setLevel(logging.DEBUG)
        logging.getLogger('rpc_api').setLevel(logging.DEBUG)
        logging.getLogger('pgoapi.rpc_api').setLevel(logging.DEBUG)
        logging.getLogger('werkzeug').setLevel(logging.DEBUG)
        logging.addLevelName(5, 'TRACE')
        logging.getLogger('pogom.apiRequests').setLevel(5)

    # Web access logs.
    if args.access_logs:
        date = strftime('%Y%m%d_%H%M')
        filename = os.path.join(
            args.log_path, '{}_{}_access.log'.format(date, args.status_name))

        logger = logging.getLogger('werkzeug')
        handler = logging.FileHandler(filename)
        logger.setLevel(logging.INFO)
        logger.addHandler(handler)


if __name__ == '__main__':
    main()
