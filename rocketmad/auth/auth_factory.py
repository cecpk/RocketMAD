#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from .discord_auth import DiscordAuth


class AuthFactory():

    def __init__(self):
        self.discord_auth = DiscordAuth()

    def get_authenticator(self, auth_type):
        if auth_type == 'discord':
            return self.discord_auth
