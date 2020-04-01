#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
py_version = sys.version_info
if py_version.major < 3 or (py_version.major < 3 and py_version.minor < 6):
    print("RocketMAD requires at least python 3.6! " +
          "Your version: {}.{}"
          .format(py_version.major, py_version.minor))
    sys.exit(1)

import logging

from colorlog import ColoredFormatter
from threading import Thread

from rocketmad.app import create_app
from rocketmad.models import clean_db_loop
from rocketmad.parks import download_ex_parks, download_nest_parks
from rocketmad.utils import dynamic_rarity_refresher, get_args

log = logging.getLogger()
args = get_args()


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

    if args.verbose:
        log.setLevel(logging.DEBUG)
    else:
        log.setLevel(logging.INFO)


if __name__ == '__main__':
    set_log_and_verbosity(log)

    app = create_app()

    # Database cleanup.
    if args.db_cleanup:
        log.info('Database cleanup is enabled.')
        t = Thread(target=clean_db_loop, name='db-cleaner', args=(app,))
        t.start()
    else:
        log.info('Database cleanup is disabled.')

    # Dynamic rarity.
    if args.rarity_update_frequency:
        log.info('Dynamic rarity updating is enabled.')
        t = Thread(target=dynamic_rarity_refresher, name='dynamic-rarity',
                   args=(app,))
        t.start()
    else:
        log.info('Dynamic rarity updating is disabled.')

    # Parks downloading.
    if args.ex_parks_downloading:
        log.info('EX park downloading is enabled.')
        t = Thread(target=download_ex_parks, name='ex-parks')
        t.start()
    else:
        log.info('EX park downloading is disabled.')

    if args.nest_parks_downloading:
        log.info('Nest park downloading is enabled.')
        t = Thread(target=download_nest_parks, name='nest-parks')
        t.start()
    else:
        log.info('Nest park downloading is disabled.')
