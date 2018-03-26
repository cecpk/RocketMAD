import logging
import sys

import requests

from pogom.utils import get_args

log = logging.getLogger(__name__)


def scout_error(error_msg):
    log.error(error_msg)
    return {
        "success": False,
        "error": error_msg
    }


def pgscout_encounter(p, forced=False):
    args = get_args()
    spawn_id = format(p.spawnpoint_id, 'x')
    # Assemble PGScout request
    params = {
        'pokemon_id': p.pokemon_id,
        'encounter_id': p.encounter_id,
        'spawn_point_id': spawn_id,
        'latitude': p.latitude,
        'longitude': p.longitude,
        'weather': p.weather_boosted_condition
    }
    if forced:
        params['forced'] = '1'
    try:
        r = requests.get(args.pgscout_url, params=params)
    except Exception:
        return scout_error(
            "Exception on scout: {}".format(repr(sys.exc_info()[1])))

    return r.json() if r.status_code == 200 else scout_error(
        "Got error {} from scout service.".format(r.status_code))


def perform_lure(p):
    args = get_args()
    # Assemble request
    params = {
        'pokestop_id': p["pokestop_id"],
        'latitude': p["latitude"],
        'longitude': p["longitude"]
    }
    try:
        r = requests.get(args.lure_url, params=params)
    except Exception:
        return scout_error(
            "Exception on request: {}".format(repr(sys.exc_info()[1])))

    return r.json() if r.status_code == 200 else scout_error(
        "Got error {} from service.".format(r.status_code))
