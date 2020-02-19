#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import time

from authlib.integrations.flask_client import OAuth
from flask import session
from ..utils import get_args

args = get_args()


class OAuth2():

    def __init__(self, app, redirect_uri):
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

    def get_authorize_redirect(self):
        if session['auth_type'] == 'discord':
            return self.oauth.discord.authorize_redirect(self.redirect_uri)

    def set_token(self):
        token = None
        if session['auth_type'] == 'discord':
            token = self.oauth.discord.authorize_access_token()
        session['access_token'] = token

    def update_resources(self):
        if session['auth_type'] == 'discord':
            resp = self.oauth.discord.get('users/@me')
            session['user'] = resp.json()
            resp = self.oauth.discord.get('users/@me/guilds')
            session['guilds'] = resp.json()
            session['resources_expire_at'] = time.time() + 3600

    def is_authenticated(self):
        if not 'access_token' in session:
            return False

        if session['auth_type'] == 'discord':
            if session['access_token']['expires_at'] < time.time():
                return False
            if session['resources_expire_at'] < time.time():
                self.update_resources()

        return True
