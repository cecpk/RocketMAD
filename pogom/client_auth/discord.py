#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from authlib.integrations.flask_client import OAuth
from ..utils import get_args

args = get_args()


def is_in_guild(auth_code, guilds):
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
