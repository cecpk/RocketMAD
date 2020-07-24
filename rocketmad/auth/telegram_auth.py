#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import hashlib
import hmac
import logging
import requests
import time

from flask import request, session
from hashlib import sha256

from .auth import AuthBase
from ..utils import get_args

log = logging.getLogger(__name__)
args = get_args()


class TelegramAuth(AuthBase):

    def __init__(self):
        self.api_base_url = ('https://api.telegram.org/bot' +
                             args.telegram_bot_token)

        self.telegram_access_configs = []
        for elem in args.telegram_access_configs:
            if elem[0] != '-':
                elem = '-' + elem
            self.telegram_access_configs.append(elem)

        self.telegram_required_chats = []
        self.chats_to_fetch = []
        for chat_id in args.telegram_required_chats:
            if chat_id[0] != '-':
                chat_id = '-' + chat_id
            self.telegram_required_chats.append(chat_id)
            self.chats_to_fetch.append(chat_id)

        for elem in self.telegram_access_configs:
            chat_id = elem.split(':')[0]
            if chat_id not in self.chats_to_fetch:
                self.chats_to_fetch.append(chat_id)

    def authorize(self):
        if not request.args.get('hash'):
            log.warning('Invalid Telegram authorization attempt: '
                        'hash missing.')
            return False

        query_params = []
        for key, value in request.args.items():
            if key != 'hash':
                query_params.append(key + '=' + value)
        data_check_string = '\n'.join(sorted(query_params))
        secret_key = hashlib.sha256(args.telegram_bot_token.encode()).digest()
        hash = hmac.new(secret_key, msg=data_check_string.encode(),
                        digestmod=hashlib.sha256).hexdigest()
        if request.args.get('hash') != hash:
            log.warning('Invalid Telegram authorization attempt: '
                        'data is NOT from Telegram.')
            return False
        if int(time.time()) - int(request.args.get('auth_date')) > 60:
            log.warning('Invalid Telegram authorization attempt: '
                        'data is outdated.')
            return False

        data = {
            'id': request.args.get('id'),
            'first_name': request.args.get('first_name'),
            'username': request.args.get('username')
        }
        self._add_user(data)
        session['auth_type'] = 'telegram'
        log.debug('Telegram user %s (%s) succesfully logged in.',
                  data['first_name'], data['username'])

        return True

    def end_session(self):
        log.debug('Telegram user %s (%s) succesfully logged out.',
                  session['first_name'], session['username'])
        session.clear()

    def get_access_data(self):
        if session.get('access_data_updated_at', 0) + 900 < time.time():
            try:
                self._update_access_data()
            except requests.exceptions.HTTPError as e:
                log.warning('Exception while retrieving Telegram data: %s', e)
                if 'has_permission' not in session:
                    time.sleep(2)
                    return self.get_access_data()

        has_permission = session['has_permission']
        redirect_uri = (args.telegram_no_permission_redirect
                        if not has_permission else None)
        access_config_name = session['access_config_name']

        return has_permission, redirect_uri, access_config_name

    def _update_access_data(self):
        if session['id'] in args.telegram_blacklisted_users:
            session['has_permission'] = False
            session['access_config_name'] = None
            return

        user_chats = []
        for chat_id in self.chats_to_fetch:
            if self._is_chat_member(chat_id, session['id']):
                user_chats.append(chat_id)

        # Admins bypass other whitelists/blacklists.
        if session['id'] in args.telegram_admins:
            session['has_permission'] = True
            config_name = self._get_access_config_name(user_chats)
            session['access_config_name'] = config_name
            session['access_data_updated_at'] = time.time()
            return

        in_required_chat = any(chat_id in user_chats
                               for chat_id in self.telegram_required_chats)
        if self.telegram_required_chats and not in_required_chat:
            session['has_permission'] = False
            session['access_config_name'] = None
            return

        session['has_permission'] = True
        config_name = self._get_access_config_name(user_chats)
        session['access_config_name'] = config_name
        session['access_data_updated_at'] = time.time()

    def _get_access_config_name(self, chats):
        access_config_name = None
        for elem in self.telegram_access_configs:
            chat_id = elem.split(':')[0]
            config_name = elem.split(':')[1]
            if chat_id in chats:
                access_config_name = config_name
                break

        return access_config_name

    def _add_user(self, data):
        session['id'] = data['id']
        session['first_name'] = data['first_name']
        session['username'] = data['username']

    def _is_chat_member(self, chat_id, user_id):
        data = {
            'chat_id': chat_id,
            'user_id': user_id
        }
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        r = requests.get(
            self.api_base_url + '/getChatMember', data=data, headers=headers
        )

        result = r.json()
        if r.status_code == 400 and 'user not found' in result['description']:
            return False

        r.raise_for_status()

        return ('left' not in result['result']['status'] and
                'kicked' not in result['result']['status'])
