#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
py_version = sys.version_info
if py_version.major < 3 or (py_version.major < 3 and py_version.minor < 6):
    print("RocketMap requires at least python 3.6! " +
          "Your version: {}.{}"
          .format(py_version.major, py_version.minor))
    sys.exit(1)
import os
import logging
import re
import ssl
import requests

from threading import Thread

from queue import Queue
from flask_cors import CORS
from flask_cachebuster import CacheBuster
from flask_mobility import Mobility

from colorlog import ColoredFormatter

from pogom.app import Pogom
from pogom.utils import (get_args, now, init_dynamic_images,
                         log_resource_usage_loop, get_debug_dump_link,
                         dynamic_rarity_refresher, get_pos_by_name)
from pogom.parks import download_ex_parks, download_nest_parks

from pogom.models import (init_database, create_tables, drop_tables,
                          clean_db_loop, verify_table_encoding,
                          verify_database_schema)

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
    ('%(log_color)s [%(asctime)s] [%(threadName)16s] [%(module)14s]'
     ' [%(levelname)8s] %(message)s'),
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
            print(repr(sys.exc_info()))

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

def validate_js_files(path, last_gen_time):
    for file in os.listdir(path):
        source_path = os.path.join(path, file)
        if os.path.isdir(source_path):
            if not validate_js_files(source_path, last_gen_time):
                return False
        elif file.endswith(".js"):
            if os.path.getmtime(source_path) > last_gen_time:
                return False

    return True

def validate_assets(args):
    assets_error_log = (
        'Missing front-end assets (static/dist) -- please run '
        '"npm install && npm run build" before starting the server.')

    root_path = os.path.dirname(__file__)
    if not os.path.exists(os.path.join(root_path, 'static/dist')):
        log.critical(assets_error_log)
        return False

    generated_js_path = os.path.join(root_path, 'static/dist/js')
    last_js_gen_time = 0
    for file in os.listdir(generated_js_path):
        gen_time = os.path.getmtime(os.path.join(generated_js_path, file))
        if gen_time > last_js_gen_time:
            last_js_gen_time = gen_time
    
    js_path = os.path.join(root_path, 'static/js')
    if not validate_js_files(js_path, last_js_gen_time):
        log.critical(assets_error_log)
        return False

    return True


def startup_db(app, clear_db):
    db = init_database(app)
    if clear_db:
        log.info('Clearing database')
        #drop_tables(db)

    #verify_database_schema(db)

    #create_tables(db)

    # Fix encoding on present and future tables.
    #verify_table_encoding(db)

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
        position = get_pos_by_name(location)

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
    init_dynamic_images(args)

    # Stop if we're just looking for a debug dump.
    if args.dump:
        log.info('Retrieving environment info...')
        hastebin_id = get_debug_dump_link()
        log.info('Done! Your debug link: https://hastebin.com/%s.txt',
                 hastebin_id)
        sys.exit(1)

    # Let's not forget to run Grunt.
    if not validate_assets(args):
        sys.exit(1)

    position = extract_coordinates(args.location)

    log.info('Parsed location is: %.4f/%.4f/%.4f (lat/lng/alt).',
             position[0], position[1], position[2])

    # Scanning toggles.
    log.info('Parsing of Pokemon %s.',
             'disabled' if args.no_pokemon else 'enabled')
    log.info('Parsing of Pokestops %s.',
             'disabled' if args.no_pokestops else 'enabled')
    log.info('Parsing of Gyms %s.',
             'disabled' if args.no_gyms else 'enabled')
    log.info('Pokemon values %s.',
             'disabled' if args.no_pokemon_values else 'enabled')

    app = None
    if not args.clear_db:
        app = Pogom(__name__,
                    root_path=os.path.dirname(
                        os.path.abspath(__file__)))
        Mobility(app)
        app.before_request(app.validate_request)
        app.set_location(position)

    db = startup_db(app, args.clear_db)

    # Database cleaner; really only need one ever.
    if args.db_cleanup:
        t = Thread(target=clean_db_loop, name='db-cleaner', args=(args,))
        t.daemon = True
        t.start()

    # Dynamic rarity.
    if args.rarity_update_frequency:
        t = Thread(target=dynamic_rarity_refresher, name='dynamic-rarity')
        t.daemon = True
        log.info('Dynamic rarity is enabled.')
        t.start()
    else:
        log.info('Dynamic rarity is disabled.')

    # Parks downloading
    if args.ex_parks:
        log.info('EX park downloading is enabled.')
        t = Thread(target=download_ex_parks, name='ex-parks')
        t.daemon = True
        t.start()
    else:
        log.info('EX park downloading is disabled.')

    if args.nest_parks:
        log.info('Nest park downloading is enabled.')
        t = Thread(target=download_nest_parks, name='nest-parks')
        t.daemon = True
        t.start()
    else:
        log.info('Nest park downloading is disabled.')

    if args.cors:
        CORS(app)

    # No more stale JS.
    cache_buster = CacheBuster()
    cache_buster.init_app(app)

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
        filename = os.path.join(args.log_path, args.log_filename)
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
    logging.getLogger('werkzeug').setLevel(logging.ERROR)

    # This sneaky one calls log.warning() on every retry.
    urllib3_logger = logging.getLogger(requests.packages.urllib3.__package__)
    urllib3_logger.setLevel(logging.ERROR)

    # Turn these back up if debugging.
    if args.verbose >= 2:
        logging.getLogger('requests').setLevel(logging.DEBUG)
        urllib3_logger.setLevel(logging.INFO)

    if args.verbose >= 3:
        logging.getLogger('peewee').setLevel(logging.DEBUG)
        logging.getLogger('werkzeug').setLevel(logging.DEBUG)
        logging.addLevelName(5, 'TRACE')

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
