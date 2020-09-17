#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import logging

from flask import request, session, url_for

from .auth import AuthBase
from ..utils import get_args

log = logging.getLogger(__name__)
args = get_args()


class BasicAuth(AuthBase):

    def __init__(self):
        self.credentials = {}
        self.access_configs = {}

        for cred in args.basic_auth_credentials:
            username = cred.split(':')[0]
            if not args.basic_auth_case_sensitive:
                username = username.lower()
            password = cred.split(':')[1]
            self.credentials[username] = password

        for elem in args.basic_auth_access_configs:
            username = elem.split(':')[0]
            config_name = elem.split(':')[1]
            self.access_configs[username] = config_name

    def authorize(self):
        username = request.args.get('un')
        password = request.args.get('pw')
        if not username or not password:
            return False
        if not args.basic_auth_case_sensitive:
            username = username.lower()
        if (username not in self.credentials
                or password != self.credentials[username]):
            return False

        session['auth_type'] = 'basic'
        session['id'] = username
        session['username'] = username
        session['password'] = password

        log.debug('User (%s) succesfully logged in.', username)

        return True

    def end_session(self):
        log.debug('User (%s) succesfully logged out.', session['username'])
        session.clear()

    def get_access_data(self):
        username = session['username']
        if (username not in self.credentials
                or session['password'] != self.credentials[username]):
            return False, url_for('login_page'), None

        session['access_config_name'] = self.access_configs.get(username)

        return True, None, session['access_config_name']

    def _update_access_data(self):
        pass

    def _add_user(self, data):
        pass
