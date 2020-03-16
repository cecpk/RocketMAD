#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import logging
import s2sphere

from rocketmad.models import Weather

log = logging.getLogger(__name__)


def get_weather_cells(swLat, swLng, neLat, neLng):
    return get_weather_cels(
        Weather.get_weather_by_location(
            swLat, swLng, neLat, neLng, False))


def get_weather_alerts(swLat, swLng, neLat, neLng):
    return get_weather_cels(
        Weather.get_weather_by_location(
            swLat, swLng, neLat, neLng, True))


def get_weather_cels(db_weathers):
    for i in range(0, len(db_weathers)):
        cell = get_cell_from_string(db_weathers[i]['s2_cell_id'])
        center = s2sphere.LatLng.from_point(cell.get_center())
        db_weathers[i]['center'] = {
            'lat': center.lat().degrees,
            'lng': center.lng().degrees
        }
        db_weathers[i]['vertices'] = get_vertices_from_s2cell(cell)
        db_weathers[i]['s2_cell_id'] = str(cell.id().id())

    return db_weathers


# workaround due a bug in POGOprotos
def get_cell_from_string(str_id):
    raw_id = int(str_id)
    if raw_id < 0:  # overflow
        cell_id = s2sphere.CellId(raw_id)
        return s2sphere.Cell.from_face_pos_level(
            cell_id.face(), cell_id.pos(), 10)
    else:
        return s2sphere.Cell(s2sphere.CellId(raw_id))


# convert s2cell vertices to google map api format
def get_vertices_from_s2cell(rect_bound):
    vertices = []
    for i in range(0, 4):
        vertex = s2sphere.LatLng.from_point(rect_bound.get_vertex(i))
        vertices.append({
            'lat': vertex.lat().degrees,
            'lng': vertex.lng().degrees
        })
    return vertices
