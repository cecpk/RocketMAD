#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from .discord_auth import DiscordAuth
from .telegram_auth import TelegramAuth


class AuthFactory():

    def __init__(self):
        self.discord_auth = DiscordAuth()
        self.telegram_auth = TelegramAuth()

    def get_authenticator(self, auth_type):
        if auth_type == 'discord':
            return self.discord_auth
        elif auth_type == 'telegram':
            return self.telegram_auth
