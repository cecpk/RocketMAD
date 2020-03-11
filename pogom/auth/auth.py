#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from abc import ABC, abstractmethod


class AuthBase(ABC):

    @abstractmethod
    def authorize(self):
        pass

    @abstractmethod
    def end_session(self):
        pass

    @abstractmethod
    def get_access_data(self):
        pass

    @abstractmethod
    def _update_access_data(self):
        pass

    '''
    @abstractmethod
    def get_permissions(self):
        pass

    @abstractmethod
    def _update_permissions(self):
        pass
    '''

    @abstractmethod
    def _add_user(self, data):
        pass
