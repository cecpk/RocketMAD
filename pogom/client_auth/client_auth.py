#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import logging
import time

from authlib.integrations.flask_client import OAuth
from authlib.common.errors import AuthlibBaseError
from flask import session
from ..utils import get_args

log = logging.getLogger(__name__)
args = get_args()


class ClientAuth():

    def __init__(self, app, redirect_uri):
        self.auth_types = ['discord']
        self.oauth = OAuth(app)
        self.oauth.register(
            name='discord',
            client_id=args.uas_client_id,
            client_secret=args.uas_client_secret,
            api_base_url='https://discordapp.com/api/v6',
            access_token_url='https://discordapp.com/api/oauth2/token',
            authorize_url='https://discordapp.com/api/oauth2/authorize',
            authorize_params={ 'scope' : 'identify guilds' }
        )
        self.redirect_uri = redirect_uri

    def is_valid_auth_type(self, auth_type):
        return auth_type in self.auth_types

    def get_authorize_redirect(self):
        if session['auth_type'] == 'discord':
            return self.oauth.discord.authorize_redirect(self.redirect_uri)

    def process_credentials(self):
        if session['auth_type'] == 'discord':
            token = None
            try:
                token = self.oauth.discord.authorize_access_token()
            except AuthlibBaseError as e:
                log.warning(e)
                return
            session['access_token'] = token
            session['logged_in'] = True
            self.update_resources()

    def update_resources(self):
        if session['auth_type'] == 'discord':
            resp = self.oauth.discord.get('users/@me')
            session['user'] = resp.json()
            resp = self.oauth.discord.get('users/@me/guilds')
            session['guilds'] = resp.json()
            session['resources_expire_at'] = time.time() + 3600

    def has_permission(self):
        return (True, None)
