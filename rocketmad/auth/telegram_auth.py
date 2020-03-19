#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import logging

from flask import request

from .auth import AuthBase
from ..utils import get_args

log = logging.getLogger(__name__)
args = get_args()


class TelegramAuth(AuthBase):

    def __init__(self):
        pass

    def authorize(self):
        id = request.args.get('id')
        print(id)

    def end_session(self):
        pass

    def get_access_data(self):
        return True, None, None

    def _update_access_data(self):
        pass

    def _add_user(self, token):
        pass
