#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from .basic_auth import BasicAuth
from .discord_auth import DiscordAuth
from .telegram_auth import TelegramAuth
from ..utils import get_args

args = get_args()


class AuthFactory():

    def __init__(self):
        if args.basic_auth:
            self.basic_auth = BasicAuth()
        if args.discord_auth:
            self.discord_auth = DiscordAuth()
        if args.telegram_auth:
            self.telegram_auth = TelegramAuth()

    def get_authenticator(self, auth_type):
        if auth_type == 'basic':
            return self.basic_auth
        elif auth_type == 'discord':
            return self.discord_auth
        elif auth_type == 'telegram':
            return self.telegram_auth
