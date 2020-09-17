#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)


# Fingerprinting methods. They receive Flask's request object as
# argument and return True when a blacklisted fingerprint
# matches.


# No referrer = request w/o being on a website.
def _no_referrer(request):
    return not request.referrer


# Fingerprints dict for easy scoping on imports.
fingerprints = {
    'no_referrer': _no_referrer
}
