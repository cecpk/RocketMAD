#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from abc import ABC, abstractmethod


class AuthBase(ABC):

    def __init__(self, oauth, redirect_uri):
        self.oauth = oauth
        self.redirect_uri = redirect_uri
        self.resources = {}
        self.permissions = {}

    @abstractmethod
    def get_authorize_redirect(self):
        pass

    @abstractmethod
    def process_credentials(self):
        pass

    @abstractmethod
    def get_permissions(self):
        pass

    @abstractmethod
    def update_permissions(self):
        pass

    @abstractmethod
    def update_resources(self):
        pass

    @abstractmethod
    def end_session(self):
        pass
