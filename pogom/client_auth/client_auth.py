#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import logging
import requests
import time

from authlib.integrations.flask_client import OAuth
from authlib.common.errors import AuthlibBaseError
from base64 import b64encode
from flask import session
from ..utils import get_args

log = logging.getLogger(__name__)
args = get_args()


class ClientAuth():

    def __init__(self, app):
        self.auth_types = ['discord']
        self.oauth = OAuth(app, fetch_token=self._fetch_token)
        self.oauth.register(
            name='discord',
            client_id=args.uas_client_id,
            client_secret=args.uas_client_secret,
            api_base_url='https://discordapp.com/api/v6',
            access_token_url='https://discordapp.com/api/oauth2/token',
            authorize_url='https://discordapp.com/api/oauth2/authorize',
            authorize_params={ 'scope' : 'identify guilds' }
        )
        self.redirect_uri = args.auth_redirect_uri

    def _fetch_token(self, name):
        if name == 'discord':
            return session['token']

    def is_valid_auth_type(self, auth_type):
        return auth_type in self.auth_types

    def start_session(self, auth_type):
        if not self.is_valid_auth_type(auth_type):
            return
        session['auth_type'] = auth_type

    def end_session(self):
        auth_type = session.get('auth_type')
        if auth_type == 'discord':
            data = (self.oauth.discord.client_id + ':' +
                    self.oauth.discord.client_secret)
            bytes = b64encode(data.encode("utf-8"))
            encoded_creds = str(bytes, "utf-8")
            headers = {
              'Authorization': 'Basic ' + encoded_creds,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
            data = 'token=' + session['token']['access_token']
            r = requests.post('https://discordapp.com/api/oauth2/token/revoke',
                              data=data, headers=headers)
            try:
                r.raise_for_status()
            except Exception:
                log.error(str(r.status_code) + ' returned from Discord revoke '
                          'access token attempt: ' + r.text)
        session.clear()

    def has_permission(self):
        for keys,values in session.items():
            print(keys)
            print(values)
        if not 'logged_in' in session:
            return False, None

        auth_type = session.get('auth_type')
        if auth_type == 'discord':
            if session['resources']['expires_at'] < time.time():
                self.update_resources()

        return True, None

    def get_authorize_redirect(self):
        auth_type = session.get('auth_type')
        if auth_type == 'discord':
            return self.oauth.discord.authorize_redirect(self.redirect_uri)
        return None

    def process_credentials(self):
        auth_type = session.get('auth_type')
        if auth_type == 'discord':
            token = None
            try:
                token = self.oauth.discord.authorize_access_token()
            except AuthlibBaseError as e:
                log.warning(e)
                return
            session['token'] = token
            print(token)
            session['logged_in'] = True
            self.update_resources()

    def update_resources(self):
        auth_type = session.get('auth_type')
        if auth_type == 'discord':
            session['resources'] = {}
            resp = self.oauth.discord.get('users/@me')
            session['resources']['user'] = resp.json()
            resp = self.oauth.discord.get('users/@me/guilds')
            session['resources']['guilds'] = resp.json()
            session['resources']['expires_at'] = time.time() + 3600
