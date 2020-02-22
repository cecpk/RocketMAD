#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import logging
import requests
import time

from authlib.common.errors import AuthlibBaseError
from base64 import b64encode
from flask import session
from .auth import AuthBase
from ..utils import get_args

log = logging.getLogger(__name__)
args = get_args()


class DiscordAuth(AuthBase):

    def __init__(self, oauth, redirect_uri):
        super().__init__(oauth, redirect_uri)
        self.oauth.register(
            name='discord',
            client_id=args.discord_client_id,
            client_secret=args.discord_client_secret,
            api_base_url='https://discordapp.com/api/v6',
            access_token_url='https://discordapp.com/api/oauth2/token',
            authorize_url='https://discordapp.com/api/oauth2/authorize',
            authorize_params={'scope': 'identify guilds'},
            fetch_token=self._fetch_token,
            update_token=self._update_token
        )

    def _fetch_token(self):
        return session['token']

    def _update_token(self, token, refresh_token=None, access_token=None):
        session['token']['access_token'] = token['access_token']
        session['token']['refresh_token'] = token.get('refresh_token')
        session['token']['expires_at'] = token['expires_at']

    def has_permission(self):
        resources = session.get('resources')
        if (not session.get('has_permission', False) or resources is None or
                resources.get('expires_at', 0) < time.time()):
            self.update_resources()

        if session.get('has_permission', False):
            return True, None

        # Check required guilds.
        in_required_guild = False
        for guild in args.discord_required_guilds:
            if guild in session['resources']['guilds']:
                in_required_guild = True
                break
        if len(args.discord_required_guilds) > 0 and not in_required_guild:
            log.debug('Permission denied for Discord user %s. '
                      'Reason: not a member of required Discord guilds.',
                      session['resources']['user']['username'])
            return False, args.discord_no_permission_redirect

        # Check blacklisted guilds.
        for guild in args.discord_blacklisted_guilds:
            if guild in session['resources']['guilds']:
                log.debug('Permission denied for Discord user %s. '
                          'Reason: member of blacklisted Discord guild '
                          '\'%s\'.',
                          session['resources']['user']['username'],
                          session['resources']['guilds'][guild]['name'])
                return False, args.discord_no_permission_redirect

        # Check required roles.
        has_required_role = False
        for role in args.discord_required_roles:
            if ':' in role:
                guild_id = role.split(':')[0]
                role_id = role.split(':')[1]
            else:
                # No guild specified, use first required guild.
                guild_id = args.discord_required_guilds[0]
                role_id = role

            if guild_id not in session['resources']['guilds']:
                continue

            roles = session['resources']['guilds'][guild_id].get('roles')
            if roles is not None and role_id in roles:
                has_required_role = True
                break

        if len(args.discord_required_roles) > 0 and not has_required_role:
            log.debug('Permission denied for Discord user %s. '
                      'Reason: does not have required role '
                      'for Discord guild \'%s\'.',
                      session['resources']['user']['username'],
                      session['resources']['guilds'][guild_id]['name'])
            return False, args.discord_no_permission_redirect

        # Check blacklisted roles.
        for role in args.discord_blacklisted_roles:
            if ':' in role:
                guild_id = role.split(':')[0]
                role_id = role.split(':')[1]
            else:
                # No guild specified, use first required guild.
                guild_id = args.discord_required_guilds[0]
                role_id = role

            if guild_id not in session['resources']['guilds']:
                continue

            roles = session['resources']['guilds'][guild_id].get('roles')
            if roles is not None and role_id in roles:
                log.debug('Permission denied for Discord user %s. '
                          'Reason: has blacklisted role '
                          'for Discord guild \'%s\'.',
                          session['resources']['user']['username'],
                          session['resources']['guilds'][guild_id]['name'])
                return False, args.discord_no_permission_redirect

        session['has_permission'] = True
        return True, None

    def get_authorize_redirect(self):
        return self.oauth.discord.authorize_redirect(self.redirect_uri)

    def process_credentials(self):
        token = None
        try:
            token = self.oauth.discord.authorize_access_token()
        except AuthlibBaseError as e:
            log.warning(e)
            return
        session['token'] = token
        session['auth_type'] = 'discord'
        self.update_resources()
        log.debug('Discord user %s succesfully logged in.',
                  session['resources']['user']['username'])

    def update_resources(self):
        # Abort if last update was done less than 5 seconds ago
        # to prevent rate limiting.
        resources = session.get('resources')
        if resources is not None:
            last_updated_at = resources.get('last_updated_at', 0)
            if last_updated_at + 5000 > time.time():
                return

        session['resources'] = {}

        resp = self.oauth.discord.get('users/@me')
        user = resp.json()
        session['resources']['user'] = {}
        session['resources']['user']['id'] = user.get('id')
        session['resources']['user']['username'] = user.get('username')

        if (len(args.discord_required_guilds) > 0 or
                len(args.discord_blacklisted_guilds) > 0 or
                len(args.discord_required_roles) > 0):
            resp = self.oauth.discord.get('users/@me/guilds')
            guilds = resp.json()
            session['resources']['guilds'] = {}
            for guild in guilds:
                id = guild.get('id')
                if id is not None:
                    name = guild.get('name')
                    session['resources']['guilds'][id] = {}
                    session['resources']['guilds'][id]['name'] = name

        if len(args.discord_required_roles) > 0:
            headers = {
              'Authorization': 'Bot ' + args.discord_bot_token
            }
            user_id = session['resources']['user']['id']
            for role in args.discord_required_roles:
                if ':' in role:
                    guild_id = role.split(':')[0]
                else:
                    # No guild specified, use first required guild.
                    guild_id = args.discord_required_guilds[0]

                if guild_id not in session['resources']['guilds']:
                    continue

                r = requests.get(self.oauth.discord.api_base_url + '/guilds/' +
                                 guild_id + '/members/' + user_id,
                                 headers=headers)
                try:
                    r.raise_for_status()
                except Exception:
                    log.error('%s returned from Discord guild member atempt: '
                              '%s.', str(r.status_code), r.text)

                roles = r.json()['roles']
                session['resources']['guilds'][guild_id]['roles'] = roles

        if len(args.discord_blacklisted_roles) > 0:
            headers = {
              'Authorization': 'Bot ' + args.discord_bot_token
            }
            user_id = session['resources']['user']['id']
            for role in args.discord_blacklisted_roles:
                if ':' in role:
                    guild_id = role.split(':')[0]
                else:
                    # No guild specified, use first required guild.
                    guild_id = args.discord_required_guilds[0]

                if guild_id not in session['resources']['guilds']:
                    continue

                r = requests.get(self.oauth.discord.api_base_url + '/guilds/' +
                                 guild_id + '/members/' + user_id,
                                 headers=headers)
                try:
                    r.raise_for_status()
                except Exception:
                    log.error('%s returned from Discord guild member atempt: '
                              '%s.', str(r.status_code), r.text)

                roles = r.json()['roles']
                session['resources']['guilds'][guild_id]['roles'] = roles

        session['resources']['expires_at'] = time.time() + 3600
        session['resources']['last_updated_at'] = time.time()
        session['has_permission'] = False

    def end_session(self):
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
            log.error('%s returned from Discord revoke access token atempt: '
                      '%s.', str(r.status_code), r.text)

        log.debug('Discord user %s succesfully logged out.',
                  session['resources']['user']['username'])
        session.clear()
