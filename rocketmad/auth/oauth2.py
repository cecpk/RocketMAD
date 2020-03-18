#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from abc import abstractmethod
from .auth import AuthBase


class OAuth2Base(AuthBase):

    @abstractmethod
    def get_authorization_url(self):
        pass

    @abstractmethod
    def _exchange_code(self, code):
        pass

    @abstractmethod
    def _refresh_token(self, refresh_token):
        pass

    @abstractmethod
    def _revoke_token(self, access_token):
        pass
