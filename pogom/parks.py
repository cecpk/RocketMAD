#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import logging
import os
import overpy

from datetime import datetime
from timeit import default_timer

from .utils import get_args, parse_geofence_file

log = logging.getLogger(__name__)


def _build_overpass_query(lower_left_point, upper_right_point,
                          nest_parks=False):
    args = get_args()

    # Tags used for both EX and nest parks.
    tags = """
    way[leisure=park];
    way[landuse=recreation_ground];
    way[leisure=recreation_ground];
    way[leisure=pitch];
    way[leisure=garden];
    way[leisure=golf_course];
    way[leisure=playground];
    way[landuse=meadow];
    way[landuse=grass];
    way[landuse=greenfield];
    way[natural=scrub];
    way[natural=heath];
    way[natural=grassland];
    way[landuse=farmyard];
    way[landuse=vineyard];
    way[landuse=farmland];
    way[landuse=orchard];
    way(poly:"53.063422 6.451935 53.068882 6.459069 53.063512 6.465263");
    """

    # Tags used only for nests.
    nest_tags = """
    way[natural=plateau];
    way[natural=valley];
    way[natural=moor];
    rel[leisure=park];
    rel[landuse=recreation_ground];
    rel[leisure=recreation_ground];
    rel[leisure=pitch];
    rel[leisure=garden];
    rel[leisure=golf_course];
    rel[leisure=playground];
    rel[landuse=meadow];
    rel[landuse=grass];
    rel[landuse=greenfield];
    rel[natural=scrub];
    rel[natural=heath];
    rel[natural=grassland];
    rel[landuse=farmyard];
    rel[landuse=vineyard];
    rel[landuse=farmland];
    rel[landuse=orchard];
    rel[natural=plateau];
    rel[natural=valley];
    rel[natural=moor];
    """

    if nest_parks:
        tags += nest_tags

    date = '2019-02-25T01:30:00Z' if nest_parks else '2016-07-16T00:00:00Z'

    geofence_file = os.path.join(
        args.root_path, 'geofences/' + args.ex_parks_geofence_file)
    geofences = parse_geofence_file(geofence_file)


    return ('[timeout:{}][date:"{}"];'
            '({});out;>;out skel qt;').format(
        args.parks_query_timeout,
        date,
        tags
    )


def _query_overpass_api(lower_left_point, upper_right_point, nest_parks=False):
    start = default_timer()
    parks = []

    api = overpy.Overpass()
    request = _build_overpass_query(lower_left_point, upper_right_point,
                                    nest_parks)
    log.debug('Park request: `%s`', request)

    response = api.query(request)

    duration = default_timer() - start
    log.info('Park response received in %.2fs', duration)

    for way in response.ways:
        parks.append(
            [[float(node.lat), float(node.lon)] for node in way.nodes])

    return parks


def _download_parks(file_path, lower_left_point, upper_right_point,
                    nest_parks=False):
    log.info('Downloading parks between %s and %s', lower_left_point,
             upper_right_point)

    output = {
        "date": str(datetime.now()),
        "parks": _query_overpass_api(lower_left_point, upper_right_point,
                                     nest_parks)
    }

    if len(output['parks']) > 0:
        with open(file_path, 'w') as file:
            json.dump(output, file)

        log.info('%d parks downloaded to %s.', len(output['parks']), file_path)
    else:
        log.info('0 parks downloaded. Skipping saving to %s', file_path)


def download_ex_parks():
    args = get_args()

    #geofence_file = os.path.join(
    #    args.root_path, 'geofences/' + args.ex_parks_geofence_file)
    #geofences = parse_geofence_file(geofence_file)

    lower_left_point = args.parks_lower_left_point
    upper_right_point = args.parks_upper_right_point

    file_path = os.path.join(args.root_path, 'static/data/parks-ex-raids.json')
    if not os.path.isfile(file_path):
        _download_parks(file_path, lower_left_point, upper_right_point)
    else:
        log.info('EX parks already downloaded... Skipping')


def download_nest_parks():
    args = get_args()

    lower_left_point = args.parks_lower_left_point
    upper_right_point = args.parks_upper_right_point

    file_path = os.path.join(args.root_path, 'static/data/parks-nests.json')
    if not os.path.isfile(file_path):
        _download_parks(file_path, lower_left_point, upper_right_point, True)
    else:
        log.info('Nest parks already downloaded... Skipping')
