#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import logging
import os
import overpy
import time

from datetime import datetime
from matplotlib.path import Path
from timeit import default_timer

from .utils import get_args, parse_geofence_file

log = logging.getLogger(__name__)
args = get_args()


def _build_overpass_query(lower_left_coord, upper_right_coord,
                          nest_parks=False):
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

    return ('[bbox:{},{}][timeout:{}][maxsize:2147483648][date:"{}"];'
            '({});out;>;out skel qt;').format(
        lower_left_coord,
        upper_right_coord,
        args.parks_query_timeout,
        date,
        tags
    )


def _query_overpass_api(lower_left_point, upper_right_point, nest_parks=False):
    parks = []

    api = overpy.Overpass()
    request = _build_overpass_query(lower_left_point, upper_right_point,
                                    nest_parks)

    while True:
        try:
            start = default_timer()
            log.debug('Overpass API request: `%s`', request)
            response = api.query(request)
            break
        except overpy.exception.OverpassTooManyRequests:
            log.warning(
                'Overpass API quota reached. Trying again in 5 minutes...')
            time.sleep(300)

    duration = default_timer() - start
    log.info('Overpass API park response received in %.2fs.', duration)

    for way in response.ways:
        parks.append(
            [[float(node.lat), float(node.lon)] for node in way.nodes])

    return parks


def _download_parks(file_path, geofences, nest_parks=False):
    parks = []

    for geofence in geofences:
        lower_left_lat = 100
        lower_left_lon = 200
        upper_right_lat = -100
        upper_right_lon = -200
        for coord in geofence['polygon']:
            if coord['lat'] < lower_left_lat:
                lower_left_lat = coord['lat']
            elif coord['lat'] > upper_right_lat:
                upper_right_lat = coord['lat']

            if coord['lon'] < lower_left_lon:
                lower_left_lon = coord['lon']
            elif coord['lon'] > upper_right_lon:
                upper_right_lon = coord['lon']

        log.info('Downloading parks in geofence %s...', geofence['name'])
        lower_left_coord = '{}, {}'.format(lower_left_lat, lower_left_lon)
        upper_right_coord = '{}, {}'.format(upper_right_lat, upper_right_lon)
        parks_in_box = _query_overpass_api(lower_left_coord, upper_right_coord,
                                           nest_parks)

        polygon_tuple_list = []
        for coord in geofence['polygon']:
            coordinate_tuple = (coord['lat'], coord['lon'])
            polygon_tuple_list.append(coordinate_tuple)
        polygon_tuple_list.append(polygon_tuple_list[0])
        path = Path(polygon_tuple_list)

        parks_in_geofence = []
        for park in parks_in_box:
            for coord in park:
                coordinate_tuple = (coord[0], coord[1])
                if path.contains_point(coordinate_tuple):
                    parks_in_geofence.append(park)
                    break
        log.info('%d parks found in geofence %s.', len(parks_in_geofence),
                 geofence['name'])

        parks.extend(parks_in_geofence)

    output = {
        "date": str(datetime.now()),
        "parks": parks
    }

    if len(output['parks']) > 0:
        with open(file_path, 'w') as file:
            json.dump(output, file)

        log.info('%d parks downloaded to %s.', len(output['parks']), file_path)
    else:
        log.info('0 parks downloaded. Skipping saving to %s', file_path)


def download_ex_parks():
    file_path = os.path.join(
        args.root_path,
        'static/data/parks/' + args.ex_parks_filename + '.json')
    if not os.path.isfile(file_path):
        geofence_file = os.path.join(
            args.root_path, 'geofences/' + args.ex_parks_geofence_file)
        geofences = parse_geofence_file(geofence_file)
        _download_parks(file_path, geofences)
    else:
        log.info('EX parks already downloaded.')


def download_nest_parks():
    file_path = os.path.join(
        args.root_path,
        'static/data/parks/' + args.nest_parks_filename + '.json')
    if not os.path.isfile(file_path):
        geofence_file = os.path.join(
            args.root_path, 'geofences/' + args.nest_parks_geofence_file)
        geofences = parse_geofence_file(geofence_file)
        _download_parks(file_path, geofences, True)
    else:
        log.info('Nest parks already downloaded.')
