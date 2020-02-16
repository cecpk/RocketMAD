#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import gunicorn.app.base
import logging
import multiprocessing
import os

from colorlog import ColoredFormatter
from gunicorn import glogging
from pogom.utils import get_args
from time import strftime

args = get_args()


class GunicornApplication(gunicorn.app.base.BaseApplication):

    def __init__(self, app, options=None):
        self.options = options or {}
        self.application = app
        super().__init__()

    def load_config(self):
        config = {key: value for key, value in self.options.items()
                  if key in self.cfg.settings and value is not None}
        for key, value in config.items():
            self.cfg.set(key.lower(), value)

    def load(self):
        return self.application


class GunicornLogger(glogging.Logger):

    def setup(self, cfg):
        super().setup(cfg)

        formatter = ColoredFormatter(
            ('%(log_color)s [%(asctime)s] [%(threadName)16s] [%(process)14s]'
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

        # Override Gunicorn's `error_log` configuration.
        self._set_handler(
            self.error_log, cfg.errorlog, formatter
        )

        # Override Gunicorn's `access_log` configuration.
        if cfg.accesslog is not None:
            self._set_handler(
                self.access_log, cfg.accesslog, formatter
            )

        if not args.no_file_logs:
            filename = os.path.join(args.log_path, args.log_filename)
            handler = logging.FileHandler(filename)
            handler.setFormatter(logging.Formatter(
                '%(asctime)s [%(threadName)18s][%(process)14s][%(levelname)8s]'
                ' %(message)s'))
            self.error_log.addHandler(handler)

            if cfg.accesslog is not None:
                self.access_log.addHandler(handler)

        if cfg.accesslog is not None:
            date = strftime('%Y%m%d_%H%M')
            filename = os.path.join(
                args.log_path,
                '{}_{}_access.log'.format(date, args.status_name)
            )

            handler = logging.FileHandler(filename)
            self.access_log.addHandler(handler)
