#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import gevent.monkey
gevent.monkey.patch_all()

import sys
py_version = sys.version_info
if py_version.major < 3 or (py_version.major < 3 and py_version.minor < 6):
    print("RocketMAD requires at least python 3.6! " +
          "Your version: {}.{}"
          .format(py_version.major, py_version.minor))
    sys.exit(1)

import logging
import os
import re
import requests
import ssl
import time

from colorlog import ColoredFormatter
from time import strftime

from rocketmad.app import create_app
from rocketmad.gunicorn import GunicornApplication
from rocketmad.models import (create_rm_tables, db, drop_rm_tables,
                              verify_database_schema)
from rocketmad.utils import get_args, get_debug_dump_link

log = logging.getLogger()
args = get_args()


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


def startup_db(clear_db):
    log.info('Connecting to MySQL database on %s:%i...',
             args.db_host, args.db_port)

    if clear_db:
        log.info('Clearing RocketMAD tables')
        drop_rm_tables()

    create_rm_tables()
    verify_database_schema()

    if clear_db:
        log.info('Drop and recreate is complete. Now remove -cd and restart.')
        sys.exit(0)


def set_log_and_verbosity(log):
    class LogFilter(logging.Filter):

        def __init__(self, level):
            self.level = level

        def filter(self, record):
            return record.levelno < self.level

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

    console = logging.StreamHandler()
    if not args.verbose:
        console.setLevel(logging.INFO)
    console.setFormatter(formatter)

    # Redirect messages lower than WARNING to stdout.
    stdout_hdlr = logging.StreamHandler(sys.stdout)
    stdout_hdlr.setFormatter(formatter)
    log_filter = LogFilter(logging.WARNING)
    stdout_hdlr.addFilter(log_filter)
    stdout_hdlr.setLevel(5)

    # Redirect messages equal or higher than WARNING to stderr.
    stderr_hdlr = logging.StreamHandler(sys.stderr)
    stderr_hdlr.setFormatter(formatter)
    stderr_hdlr.setLevel(logging.WARNING)

    log.addHandler(stdout_hdlr)
    log.addHandler(stderr_hdlr)

    # Always write to log file.
    # Create directory for log files.
    if not os.path.exists(args.log_path):
        os.mkdir(args.log_path)
    if not args.no_file_logs:
        filename = os.path.join(args.log_path, args.log_filename)
        filelog = logging.FileHandler(filename)
        filelog.setFormatter(logging.Formatter(
            '%(asctime)s [%(threadName)18s][%(module)14s][%(levelname)8s] '
            '%(message)s'))
        log.addHandler(filelog)

    if args.verbose:
        log.setLevel(logging.DEBUG)
    else:
        log.setLevel(logging.INFO)

    # These are very noisy, let's shush them up a bit.
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
        logging.getLogger('werkzeug').setLevel(logging.DEBUG)
        logging.addLevelName(5, 'TRACE')

    # Web access logs.
    if args.development_server and args.access_logs:
        date = strftime('%Y%m%d_%H%M')
        filename = os.path.join(
            args.log_path, '{}_{}_access.log'.format(date, args.status_name))

        logger = logging.getLogger('werkzeug')
        handler = logging.FileHandler(filename)
        logger.setLevel(logging.INFO)
        logger.addHandler(handler)


if __name__ == '__main__':
    # Make sure exceptions get logged.
    sys.excepthook = handle_exception

    # Abort if status name is not valid.
    regexp = re.compile('^([\w\s\-.]+)$')
    if not regexp.match(args.status_name):
        log.critical('Status name contains illegal characters.')
        sys.exit(1)

    set_log_and_verbosity(log)

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

    app = create_app()
    with app.app_context():
        startup_db(args.clear_db)

    def post_fork(server, worker):
        with app.app_context():
            db.engine.dispose()

    use_ssl = (args.ssl_certificate and args.ssl_privatekey and
               os.path.exists(args.ssl_certificate) and
               os.path.exists(args.ssl_privatekey))
    if use_ssl:
        log.info('Web server in SSL mode.')

    if not args.development_server:
        options = {
            'bind': '%s:%s' % (args.host, args.port),
            'worker_class': 'gevent',
            'workers': args.workers,
            'post_fork': post_fork,
            'keyfile': args.ssl_privatekey if use_ssl else None,
            'certfile': args.ssl_certificate if use_ssl else None,
            'logger_class': 'rocketmad.gunicorn.GunicornLogger',
            'loglevel': 'debug' if args.verbose else 'info',
            'accesslog': '-' if args.access_logs else None,
            'limit_request_line': 8190
        }
        GunicornApplication(app, options).run()
    else:
        ssl_context = None
        if use_ssl:
            ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
            ssl_context.load_cert_chain(
                args.ssl_certificate, args.ssl_privatekey)
        debug = args.verbose > 0
        app.run(threaded=True, use_reloader=False, debug=debug,
                host=args.host, port=args.port, ssl_context=ssl_context)
