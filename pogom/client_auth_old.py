#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import logging
import requests
import urllib.request
import urllib.parse
import urllib.error
import datetime

from authlib.integrations.flask_client import OAuth
from flask import jsonify, session
from requests.exceptions import HTTPError

from .utils import get_args

log = logging.getLogger(__name__)
args = get_args()

auth_cache = {}

required_guilds = []
blacklisted_guilds = []
required_roles = []
if args.uas_discord_required_guilds:
    required_guilds = [x.strip() for x in
                       args.uas_discord_required_guilds.split(',')]
if args.uas_discord_blacklisted_guilds:
    blacklisted_guilds = [x.strip() for x in
                          args.uas_discord_blacklisted_guilds.split(',')]
if args.uas_discord_required_roles:
    for role in args.uas_discord_required_roles.split(','):
        if ':' in role:
            guild_id = role.split(':')[0].strip()
            role_id = role.split(':')[1].strip()
            required_roles.append((guild_id, role_id))
        elif required_guilds:
            guild_id = required_guilds[0]
            role_id = role.strip()
            required_roles.append((guild_id, role_id))


class OAuth2:

    def __init__(self, app):
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


    def get_authorize_redirect(self, redirect_uri):
        return self.oauth.discord.authorize_redirect(redirect_uri)


    def set_token(self):
        token = self.oauth.discord.authorize_access_token()
        session['access_token'] = token


    def get_resources(self):
        resp = self.oauth.discord.get('users/@me')
        user = resp.json()


def check_auth(request):
    return False
    if args.user_auth_service == "Discord":
        auth_code = request.args.get('userAuthCode')

        host = args.uas_host_override
        if not host:
            host = request.url_root

        if not _valid_auth(auth_code, host):
            return _redirect_client_to_auth(host)

        if required_guilds:
            if not _is_in_guild(auth_code, required_guilds):
                log.debug('User not in required guild.')
                del auth_cache[auth_code]['guilds']
                return _not_in_required_guild_redirect()

        if blacklisted_guilds:
            if _is_in_guild(auth_code, blacklisted_guilds):
                log.debug('User in blacklisted guild.')
                del auth_cache[auth_code]['guilds']
                return _in_blacklisted_guild_redirect()

        if required_roles and not _has_role(auth_code, required_roles):
            log.debug("User not in required discord guild role.")
            del auth_cache[auth_code]['roles']
            return _not_in_required_guild_redirect()

    return False


def _redirect_client_to_auth(host):
    d = {}
    d['auth_redirect'] = (
        'https://discordapp.com/api/oauth2/authorize?client_id=' +
        args.uas_client_id + '&redirect_uri=' +
        urllib.parse.quote(host + 'auth_callback') +
        '&response_type=code&scope=identify%20guilds')
    return jsonify(d)


def _valid_auth(auth_code, host):
    if not auth_code:
        return False

    oauth2_response = auth_cache.get(auth_code)
    if not oauth2_response:
        oauth2_response = _exchange_code(auth_code, host)
        if (not oauth2_response):
            return False
        auth_cache[auth_code] = oauth2_response
        auth_cache[auth_code]['expires'] = (
            datetime.datetime.now() +
            datetime.timedelta(0, int(oauth2_response.get('expires_in'))))

    if auth_cache[auth_code]['expires'] < datetime.datetime.now():
        log.debug("Oauth2 expired.")
        del auth_cache[auth_code]
        return False

    return True


def _is_in_guild(auth_code, guilds):
    user_guilds = auth_cache[auth_code].get('guilds')

    if 'guilds_expires' not in auth_cache[auth_code] or auth_cache[auth_code]['guilds_expires'] < datetime.datetime.now():
        user_guilds = []

    if not user_guilds:
        user_guilds = _get_user_guilds(auth_code)
        auth_cache[auth_code]['guilds'] = user_guilds
        auth_cache[auth_code]['guilds_expires'] = (
            datetime.datetime.now() +
            datetime.timedelta(0, 3600))

    for g in user_guilds:
        if g['id'] in guilds:
            return True
    return False


def _has_role(auth_code, roles):
    user_roles = auth_cache[auth_code].get('roles')

    if 'roles_expires' not in auth_cache[auth_code] or auth_cache[auth_code]['roles_expires'] < datetime.datetime.now():
        user_roles = []

    if not user_roles:
        user_roles = _get_user_guild_roles(auth_code, required_guilds)
        auth_cache[auth_code]['roles'] = user_roles
        auth_cache[auth_code]['roles_expires'] = (
            datetime.datetime.now() +
            datetime.timedelta(0, 3600))

    for guild in user_roles:
        for r in user_roles[guild]:
            role = (guild, r)
            if role in roles:
                return True
    return False


def _not_in_required_guild_redirect():
    d = {}
    d['auth_redirect'] = args.uas_discord_redirect
    return jsonify(d)


def _in_blacklisted_guild_redirect():
    d = {}
    d['auth_redirect'] = args.uas_discord_blacklisted_redirect
    return jsonify(d)


def _exchange_code(code, host):
    data = {
      'client_id': args.uas_client_id,
      'client_secret': args.uas_client_secret,
      'grant_type': 'authorization_code',
      'code': code,
      'redirect_uri': host + "auth_callback"
    }
    headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    }

    r = requests.post(
        '%s/oauth2/token' % 'https://discordapp.com/api/v6', data, headers)
    try:
        r.raise_for_status()
    except HTTPError:
        log.debug('' + str(r.status_code) +
                  ' returned from OAuth attempt: ' +
                  r.text)
        return False
    return r.json()


def _get_user_id(auth_code):
    headers = {
      'Authorization': 'Bearer ' + auth_cache[auth_code]['access_token']
    }
    r = requests.get('https://discordapp.com/api/v6/users/@me',
                     headers=headers)
    try:
        r.raise_for_status()
    except Exception:
        log.error('' + str(r.status_code) +
                  ' returned from Discord @me attempt: ' +
                  r.text)
        return False

    return r.json()['id']


def _get_user_guilds(auth_code):
    headers = {
      'Authorization': 'Bearer ' + auth_cache[auth_code]['access_token']
    }
    r = requests.get('https://discordapp.com/api/v6/users/@me/guilds',
                     headers=headers)
    try:
        r.raise_for_status()
    except Exception:
        log.error('' + str(r.status_code) +
                  ' returned from guild list attempt: ' +
                  r.text)
        return False
    return r.json()


def _get_user_guild_roles(auth_code, guilds):
    user_id = auth_cache[auth_code].get('user_id')
    if not user_id:
        user_id = _get_user_id(auth_code)
        auth_cache[auth_code]['user_id'] = user_id

    headers = {
      'Authorization': 'Bot ' + args.uas_discord_bot_token
    }
    roles = {}
    for guild in guilds:
        r = requests.get('https://discordapp.com/api/v6/guilds/' + guild +
                         '/members/' + user_id, headers=headers)
        try:
            r.raise_for_status()
            roles[guild] = r.json()['roles']
        except Exception:
            log.error('' + str(r.status_code) +
                      ' returned from Discord guild member attempt: ' +
                      r.text)
    return roles
