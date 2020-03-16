#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import calendar
import gc
import logging
import os
import redis

from authlib.integrations.flask_client import OAuth
from datetime import datetime
from s2sphere import LatLng
from bisect import bisect_left
from flask import (abort, Flask, jsonify, make_response, redirect,
                   render_template, request, send_from_directory, send_file,
                   session, url_for)
from flask_cors import CORS
from flask_cachebuster import CacheBuster
from flask.json import JSONEncoder
from flask_caching import Cache
from flask_compress import Compress
from flask_session import Session
from functools import wraps
from .dyn_img import (get_gym_icon, get_pokemon_map_icon,
                      get_pokemon_raw_icon)
from .weather import (get_weather_cells, get_weather_alerts)
from .models import (db, Pokemon, Gym, Pokestop, ScannedLocation, Trs_Spawn,
                     Weather)
from .utils import (i8ln, get_args, get_pokemon_name, get_pokemon_types, now,
                    dottedQuadToNum)
from .auth.auth_factory import AuthFactory
from .auth.discord_auth import DiscordAuth
from .transform import transform_from_wgs_to_gcj
from .blacklist import fingerprints, get_ip_blacklist

log = logging.getLogger(__name__)
args = get_args()

auth_factory = AuthFactory()
accepted_auth_types = []

ip_blacklist = []
ip_blacklist_keys = []

db_conn_endpoint_blacklist = [
    'static', 'login_page', 'map_page', 'pokemon_history_page', 'quest_page',
    'render_robots_txt', 'render_service_worker_js', 'pokemon_img', 'gym_img'
]


class CustomJSONEncoder(JSONEncoder):

    def default(self, obj):
        try:
            if isinstance(obj, datetime):
                if obj.utcoffset() is not None:
                    obj = obj - obj.utcoffset()
                millis = int(
                    calendar.timegm(obj.timetuple()) * 1000 +
                    obj.microsecond / 1000
                )
                return millis
            iterable = iter(obj)
        except TypeError:
            pass
        else:
            return list(iterable)
        return JSONEncoder.default(self, obj)


def ip_is_blacklisted(ip):
    if not ip_blacklist:
        return False

    # Get the nearest IP range
    pos = max(bisect_left(ip_blacklist_keys, dottedQuadToNum(ip)) - 1, 0)
    ip_range = ip_blacklist[pos]

    start = dottedQuadToNum(ip_range[0])
    end = dottedQuadToNum(ip_range[1])

    return start <= dottedQuadToNum(ip) <= end


def convert_pokemon_list(pokemon):
    # Performance:  disable the garbage collector prior to creating a
    # (potentially) large dict with append().
    gc.disable()

    pokemon_result = []
    for p in pokemon:
        p['encounter_id'] = str(p['encounter_id'])
        if args.china:
            p['latitude'], p['longitude'] = \
                transform_from_wgs_to_gcj(p['latitude'], p['longitude'])
        pokemon_result.append(p)

    # Re-enable the GC.
    gc.enable()
    return pokemon


def is_logged_in():
    return 'auth_type' in session


def auth_required(f):
    @wraps(f)
    def decorated_function(*_args, **kwargs):
        if not args.client_auth:
            return f(*_args, **kwargs)

        if args.login_required and not is_logged_in():
            return redirect(url_for('login_page'))

        if is_logged_in():
            auth_type = session['auth_type']
            authenticator = auth_factory.get_authenticator(auth_type)
            access_data = authenticator.get_access_data()
            if not access_data[0]:
                return redirect(access_data[2])
            kwargs['access_config'] = access_data[1]

        return f(*_args, **kwargs)
    return decorated_function


def create_app():
    app = Flask(__name__,
                template_folder='../templates',
                static_folder='../static')
    app.json_encoder = CustomJSONEncoder
    cache = Cache(app,
                  config={'CACHE_TYPE': 'simple', 'CACHE_DEFAULT_TIMEOUT': 0})
    cache_buster = CacheBuster(config={'extensions': ['.js', '.css']})
    cache_buster.init_app(app)
    Compress(app)
    if args.cors:
        CORS(app)

    if args.client_auth:
        app.config['SESSION_TYPE'] = 'redis'
        redis_url = 'redis://' + args.redis_host + ':' + str(args.redis_port)
        app.config['SESSION_REDIS'] = redis.from_url(redis_url)
        app.config['SESSION_USE_SIGNER'] = True
        app.secret_key = args.secret_key
        Session(app)
        if args.discord_auth:
            accepted_auth_types.append('discord')

    if not args.disable_blacklist:
        log.info('Retrieving blacklist...')
        ip_blacklist = get_ip_blacklist()
        # Sort & index for binary search
        ip_blacklist.sort(key=lambda r: r[0])
        ip_blacklist_keys = [
            dottedQuadToNum(r[0]) for r in ip_blacklist
        ]
    else:
        log.info('Blacklist disabled for this session.')

    @app.before_request
    def validate_request():
        # Get real IP behind trusted reverse proxy.
        ip_addr = request.remote_addr
        if ip_addr in args.trusted_proxies:
            ip_addr = request.headers.get('X-Forwarded-For', ip_addr)

        # Make sure IP isn't blacklisted.
        if ip_is_blacklisted(ip_addr):
            log.debug('Denied access to %s: blacklisted IP.', ip_addr)
            abort(403)

    @app.before_request
    def db_connect():
        if request.endpoint not in db_conn_endpoint_blacklist:
            db.connect()

    @app.teardown_request
    def db_close(exc):
        if request.endpoint not in db_conn_endpoint_blacklist:
            if not db.is_closed():
                db.close()

    @app.route('/')
    @auth_required
    def map_page(*_args, **kwargs):
        if 'access_config' in kwargs:
            user_args = get_args(kwargs['access_config'])
        else:
            user_args = args

        settings = {
            'centerLat': user_args.center_lat,
            'centerLng': user_args.center_lng,
            'maxZoomLevel': user_args.max_zoom_level,
            'showAllZoomLevel': user_args.show_all_zoom_level,
            'clusterZoomLevel': user_args.cluster_zoom_level,
            'clusterZoomLevelMobile': user_args.cluster_zoom_level_mobile,
            'maxClusterRadius': user_args.max_cluster_radius,
            'spiderfyClusters': user_args.spiderfy_clusters,
            'isStartMarkerMovable': not user_args.lock_start_marker,
            'generateImages': user_args.generate_images,
            'statsSidebar': not user_args.no_stats_sidebar,
            'twelveHourClock': user_args.twelve_hour_clock,
            'mapUpdateInverval': user_args.map_update_interval,
            'motd': user_args.motd,
            'motdTitle': user_args.motd_title,
            'motdText': user_args.motd_text,
            'motdPages': user_args.motd_pages,
            'showMotdAlways': user_args.show_motd_always,
            'pokemons': not user_args.no_pokemon,
            'upscaledPokemon': (
                [int(i) for i in user_args.upscaled_pokemon.split(',')]
                if user_args.upscaled_pokemon is not None else []),
            'pokemonValues': (not user_args.no_pokemon and
                              not user_args.no_pokemon_values),
            'rarity': (not user_args.no_pokemon and not user_args.no_rarity and
                       user_args.rarity_update_frequency),
            'rarityFileName': user_args.rarity_filename,
            'pokemonCries': (not user_args.no_pokemon and
                             user_args.pokemon_cries),
            'gyms': not user_args.no_gyms,
            'gymSidebar': ((not user_args.no_gyms or not user_args.no_raids)
                           and not user_args.no_gym_sidebar),
            'gymFilters': (not user_args.no_gyms and
                           not user_args.no_gym_filters),
            'raids': not user_args.no_raids,
            'raidFilters': (not user_args.no_raids and
                            not user_args.no_raid_filters),
            'pokestops': not user_args.no_pokestops,
            'quests': not user_args.no_pokestops and not user_args.no_quests,
            'invasions': (not user_args.no_pokestops and
                          not user_args.no_invasions),
            'lures': not user_args.no_pokestops and not user_args.no_lures,
            'weather': not user_args.no_weather,
            'spawnpoints': not user_args.no_spawnpoints,
            'scannedLocs': not user_args.no_scanned_locs,
            's2Cells': not user_args.no_s2_cells,
            'ranges': not user_args.no_ranges,
            'nestParks': user_args.nest_parks,
            'nestParksFileName': user_args.nest_parks_filename,
            'exParks': user_args.ex_parks,
            'exParksFileName': user_args.ex_parks_filename
        }

        return render_template(
            'map.html',
            lang=user_args.locale,
            map_title=user_args.map_title,
            header_image=not user_args.no_header_image,
            header_image_name=user_args.header_image,
            client_auth=user_args.client_auth,
            logged_in=is_logged_in(),
            madmin_url=user_args.madmin_url,
            donate_url=user_args.donate_url,
            patreon_url=user_args.patreon_url,
            discord_url=user_args.discord_url,
            messenger_url=user_args.messenger_url,
            telegram_url=user_args.telegram_url,
            whatsapp_url=user_args.whatsapp_url,
            pokemon_history_page=(settings['pokemons'] and
                                  not user_args.no_pokemon_history_page),
            quest_page=settings['quests'] and not user_args.no_quest_page,
            analytics_id=user_args.analytics_id,
            settings=settings,
            i18n=i8ln
        )

    @app.route('/pokemon-history')
    @auth_required
    def pokemon_history_page(*_args, **kwargs):
        if 'access_config' in kwargs:
            user_args = get_args(kwargs['access_config'])
        else:
            user_args = args

        if user_args.no_pokemon or user_args.no_pokemon_history_page:
            abort(403)

        settings = {
            'centerLat': user_args.center_lat,
            'centerLng': user_args.center_lng,
            'generateImages': user_args.generate_images,
            'motd': user_args.motd,
            'motdTitle': user_args.motd_title,
            'motdText': user_args.motd_text,
            'motdPages': user_args.motd_pages,
            'showMotdAlways': user_args.show_motd_always
        }

        return render_template(
            'pokemon-history.html',
            lang=user_args.locale,
            map_title=user_args.map_title,
            header_image=not user_args.no_header_image,
            header_image_name=user_args.header_image,
            client_auth=user_args.client_auth,
            logged_in=is_logged_in(),
            madmin_url=user_args.madmin_url,
            donate_url=user_args.donate_url,
            patreon_url=user_args.patreon_url,
            discord_url=user_args.discord_url,
            messenger_url=user_args.messenger_url,
            telegram_url=user_args.telegram_url,
            whatsapp_url=user_args.whatsapp_url,
            quest_page=(not user_args.no_pokestops and not args.no_quests and
                        not user_args.no_quest_page),
            analytics_id=user_args.analytics_id,
            settings=settings
        )

    @app.route('/quests')
    @auth_required
    def quest_page(*_args, **kwargs):
        if 'access_config' in kwargs:
            user_args = get_args(kwargs['access_config'])
        else:
            user_args = args

        if args.no_pokestops or args.no_quests or args.no_quest_page:
            abort(403)

        settings = {
            'generateImages': user_args.generate_images,
            'motd': user_args.motd,
            'motdTitle': user_args.motd_title,
            'motdText': user_args.motd_text,
            'motdPages': user_args.motd_pages,
            'showMotdAlways': user_args.show_motd_always
        }

        return render_template(
            'quest.html',
            lang=user_args.locale,
            map_title=user_args.map_title,
            header_image=not user_args.no_header_image,
            header_image_name=user_args.header_image,
            client_auth=user_args.client_auth,
            logged_in=is_logged_in(),
            madmin_url=user_args.madmin_url,
            donate_url=user_args.donate_url,
            patreon_url=user_args.patreon_url,
            discord_url=user_args.discord_url,
            messenger_url=user_args.messenger_url,
            telegram_url=user_args.telegram_url,
            whatsapp_url=user_args.whatsapp_url,
            pokemon_history_page=(not user_args.no_pokemon and
                                  not user_args.no_pokemon_history_page),
            analytics_id=user_args.analytics_id,
            settings=settings
        )

    @app.route('/mobile')
    @auth_required
    def mobile_page(*_args, **kwargs):
        if 'access_config' in kwargs:
            user_args = get_args(kwargs['access_config'])
        else:
            user_args = args

        # todo: Check if client is Android/iOS/Desktop for geolink, currently
        # only supports Android.
        pokemon_list = []

        settings = {
            'motd': user_args.motd,
            'motdTitle': user_args.motd_title,
            'motdText': user_args.motd_text,
            'motdPages': user_args.motd_pages,
            'showMotdAlways': user_args.show_motd_always
        }

        # Allow client to specify location.
        lat = request.args.get('lat', self.location[0], type=float)
        lon = request.args.get('lon', self.location[1], type=float)
        origin_point = LatLng.from_degrees(lat, lon)

        for pokemon in convert_pokemon_list(
                Pokemon.get_active(None, None, None, None)):
            pokemon_point = LatLng.from_degrees(pokemon['latitude'],
                                                pokemon['longitude'])
            diff = pokemon_point - origin_point
            diff_lat = diff.lat().degrees
            diff_lng = diff.lng().degrees
            direction = (('N' if diff_lat >= 0 else 'S')
                         if abs(diff_lat) > 1e-4 else '') +\
                        (('E' if diff_lng >= 0 else 'W')
                         if abs(diff_lng) > 1e-4 else '')
            entry = {
                'id': pokemon['pokemon_id'],
                'name': get_pokemon_name(pokemon['pokemon_id']),
                'card_dir': direction,
                'distance': int(origin_point.get_distance(
                    pokemon_point).radians * 6366468.241830914),
                'time_to_disappear': '%d min %d sec' % (divmod(
                    (pokemon['disappear_time'] - datetime.utcnow()).seconds,
                    60)),
                'disappear_time': pokemon['disappear_time'],
                'disappear_sec': (
                    pokemon['disappear_time'] - datetime.utcnow()).seconds,
                'latitude': pokemon['latitude'],
                'longitude': pokemon['longitude']
            }
            pokemon_list.append((entry, entry['distance']))
        pokemon_list = [y[0] for y in sorted(pokemon_list, key=lambda x: x[1])]

        return render_template(
            'mobile.html',
            pokemon_list=pokemon_list,
            origin_lat=lat,
            origin_lng=lon,
            analytics_id=user_args.analytics_id,
            settings=settings
        )

    @app.route('/login')
    @cache.cached()
    def login_page():
        if is_logged_in():
            return redirect(url_for('map_page'))

        settings = {
            'motd': args.motd,
            'motdTitle': args.motd_title,
            'motdText': args.motd_text,
            'motdPages': args.motd_pages,
            'showMotdAlways': args.show_motd_always
        }

        return render_template(
            'login.html',
            lang=args.locale,
            map_title=args.map_title,
            header_image=not args.no_header_image,
            header_image_name=args.header_image,
            madmin_url=args.madmin_url,
            donate_url=args.donate_url,
            patreon_url=args.patreon_url,
            discord_url=args.discord_url,
            messenger_url=args.messenger_url,
            telegram_url=args.telegram_url,
            whatsapp_url=args.whatsapp_url,
            analytics_id=args.analytics_id,
            settings=settings
        )

    @app.route('/login/<auth_type>')
    def login(auth_type):
        if is_logged_in():
            return redirect(url_for('map_page'))
        if auth_type not in accepted_auth_types:
            return redirect(url_for('login_page'))
        authenticator = auth_factory.get_authenticator(auth_type)
        auth_uri = authenticator.get_authorization_url()
        return redirect(auth_uri)

    @app.route('/auth/<auth_type>')
    def auth(auth_type):
        if is_logged_in():
            return redirect(url_for('map_page'))
        if auth_type not in accepted_auth_types:
            return redirect(url_for('login_page'))
        auth_factory.get_authenticator(auth_type).authorize()
        return redirect(url_for('map_page'))

    @app.route('/logout')
    def logout():
        if is_logged_in():
            auth_factory.get_authenticator(session['auth_type']).end_session()
        return redirect(url_for('map_page'))

    @app.route('/raw_data')
    @auth_required
    def raw_data(*_args, **kwargs):
        if 'access_config' in kwargs:
            user_args = get_args(kwargs['access_config'])
        else:
            user_args = args

        # Make sure fingerprint isn't blacklisted.
        fingerprint_blacklisted = any([
            fingerprints['no_referrer'](request),
            fingerprints['iPokeGo'](request)
        ])

        if fingerprint_blacklisted:
            log.debug('User denied access: blacklisted fingerprint.')
            abort(403)

        d = {}

        # Request time of this request.
        d['timestamp'] = datetime.utcnow()

        # Request time of previous request.
        if request.args.get('timestamp'):
            timestamp = int(request.args.get('timestamp'))
            timestamp -= 1000  # Overlap, for rounding errors.
        else:
            timestamp = 0

        swLat = request.args.get('swLat')
        swLng = request.args.get('swLng')
        neLat = request.args.get('neLat')
        neLng = request.args.get('neLng')

        oSwLat = request.args.get('oSwLat')
        oSwLng = request.args.get('oSwLng')
        oNeLat = request.args.get('oNeLat')
        oNeLng = request.args.get('oNeLng')

        # Previous switch settings.
        lastpokemon = request.args.get('lastpokemon')
        lastgyms = request.args.get('lastgyms')
        lastpokestops = request.args.get('lastpokestops')
        lastspawns = request.args.get('lastspawns')
        lastscannedlocs = request.args.get('lastscannedlocs')
        lastweather = request.args.get('lastweather')

        # Current switch settings saved for next request.
        if request.args.get('pokemon', 'true') == 'true':
            d['lastpokemon'] = True

        if (request.args.get('gyms', 'true') == 'true' or
                request.args.get('raids', 'true') == 'true'):
            d['lastgyms'] = True

        if (request.args.get('pokestops', 'true') == 'true' and (
                request.args.get('pokestopsNoEvent', 'true') == 'true' or
                request.args.get('quests', 'true') == 'true' or
                request.args.get('invasions', 'true') == 'true' or
                request.args.get('lures', 'true') == 'true')):
            d['lastpokestops'] = True

        if request.args.get('spawnpoints', 'false') == 'true':
            d['lastspawns'] = True

        if request.args.get('scannedLocs', 'false') == 'true':
            d['lastscannedlocs'] = True

        if request.args.get('weather', 'false') == 'true':
            d['lastweather'] = True

        if (oSwLat is not None and oSwLng is not None and
                oNeLat is not None and oNeLng is not None):
            # If old coords are not equal to current coords we have
            # moved/zoomed!
            if (oSwLng < swLng and oSwLat < swLat and
                    oNeLat > neLat and oNeLng > neLng):
                newArea = False  # We zoomed in no new area uncovered.
            elif not (oSwLat == swLat and oSwLng == swLng and
                      oNeLat == neLat and oNeLng == neLng):
                newArea = True
            else:
                newArea = False

        # Pass current coords as old coords.
        d['oSwLat'] = swLat
        d['oSwLng'] = swLng
        d['oNeLat'] = neLat
        d['oNeLng'] = neLng

        if (request.args.get('pokemon', 'true') == 'true' and
                not user_args.no_pokemon):
            verified_despawn = user_args.verified_despawn_time
            eids = None
            ids = None
            if (request.args.get('eids') and
                    request.args.get('prionotif', 'false') == 'false'):
                request_eids = request.args.get('eids').split(',')
                eids = [int(i) for i in request_eids]
            elif not request.args.get('eids') and request.args.get('ids'):
                request_ids = request.args.get('ids').split(',')
                ids = [int(i) for i in request_ids]

            if lastpokemon != 'true':
                # If this is first request since switch on, load
                # all pokemon on screen.
                d['pokemons'] = convert_pokemon_list(
                    Pokemon.get_active(
                        swLat, swLng, neLat, neLng, eids=eids, ids=ids,
                        verified_despawn_time=verified_despawn))
            else:
                # If map is already populated only request modified Pokemon
                # since last request time.
                d['pokemons'] = convert_pokemon_list(
                    Pokemon.get_active(
                        swLat, swLng, neLat, neLng, timestamp=timestamp,
                        eids=eids, ids=ids,
                        verified_despawn_time=verified_despawn))

                if newArea:
                    # If screen is moved add newly uncovered Pokemon to the
                    # ones that were modified since last request time.
                    d['pokemons'] += (
                        convert_pokemon_list(
                            Pokemon.get_active(
                                swLat, swLng, neLat, neLng, oSwLat=oSwLat,
                                oSwLng=oSwLng, oNeLat=oNeLat, oNeLng=oNeLng,
                                eids=eids, ids=ids,
                                verified_despawn_time=verified_despawn)))

            if request.args.get('reids'):
                request_reids = request.args.get('reids').split(',')
                reids = [int(x) for x in request_reids]
                d['pokemons'] += convert_pokemon_list(
                    Pokemon.get_active(swLat, swLng, neLat, neLng, ids=ids,
                                       verified_despawn_time=verified_despawn))
                d['reids'] = reids

        if request.args.get('seen', 'false') == 'true':
            d['seen'] = Pokemon.get_seen(int(request.args.get('duration')))

        if request.args.get('appearances', 'false') == 'true':
            d['appearances'] = Pokemon.get_appearances(
                request.args.get('pokemonid'),
                request.args.get('formid'),
                int(request.args.get('duration')))

        if request.args.get('appearancesDetails', 'false') == 'true':
            d['appearancesTimes'] = (
                Pokemon.get_appearances_times_by_spawnpoint(
                    request.args.get('pokemonid'),
                    request.args.get('formid'),
                    request.args.get('spawnpoint_id'),
                    int(request.args.get('duration'))))

        gyms = (request.args.get('gyms', 'true') == 'true' and
                not user_args.no_gyms)
        raids = (request.args.get('raids', 'true') == 'true' and
                 not user_args.no_raids)
        if gyms or raids:
            if lastgyms != 'true':
                d['gyms'] = Gym.get_gyms(swLat, swLng, neLat, neLng,
                                         raids=raids)
            else:
                d['gyms'] = Gym.get_gyms(swLat, swLng, neLat, neLng,
                                         timestamp=timestamp, raids=raids)
                if newArea:
                    d['gyms'].update(
                        Gym.get_gyms(swLat, swLng, neLat, neLng,
                                     oSwLat=oSwLat, oSwLng=oSwLng,
                                     oNeLat=oNeLat, oNeLng=oNeLng,
                                     raids=raids))

        pokestops = (request.args.get('pokestops', 'true') == 'true' and
                     not user_args.no_pokestops)
        pokestopsNoEvent = (request.args.get(
            'pokestopsNoEvent', 'true') == 'true')
        quests = (request.args.get('quests', 'true') == 'true' and
                  not user_args.no_quests)
        invasions = (request.args.get('invasions', 'true') == 'true' and
                     not user_args.no_invasions)
        lures = (request.args.get('lures', 'true') == 'true' and
                 not user_args.no_lures)
        if (pokestops and (pokestopsNoEvent or quests or invasions or lures)):
            if lastpokestops != 'true':
                d['pokestops'] = Pokestop.get_stops(
                    swLat, swLng, neLat, neLng,
                    pokestopsNoEvent=pokestopsNoEvent, quests=quests,
                    invasions=invasions, lures=lures)
            else:
                d['pokestops'] = Pokestop.get_stops(
                    swLat, swLng, neLat, neLng, timestamp=timestamp,
                    pokestopsNoEvent=pokestopsNoEvent, quests=quests,
                    invasions=invasions, lures=lures)
                if newArea:
                    d['pokestops'].update(
                        Pokestop.get_stops(swLat, swLng, neLat, neLng,
                                           oSwLat=oSwLat, oSwLng=oSwLng,
                                           oNeLat=oNeLat, oNeLng=oNeLng,
                                           pokestopsNoEvent=pokestopsNoEvent,
                                           quests=quests, invasions=invasions,
                                           lures=lures))

        if (request.args.get('weather', 'false') == 'true' and
                not user_args.no_weather):
            if lastweather != 'true':
                d['weather'] = Weather.get_weather(swLat, swLng, neLat, neLng)
            else:
                d['weather'] = Weather.get_weather(swLat, swLng, neLat, neLng,
                                                   timestamp=timestamp)
                if newArea:
                    d['weather'] += Weather.get_weather(
                        swLat, swLng, neLat, neLng, oSwLat=oSwLat,
                        oSwLng=oSwLng, oNeLat=oNeLat, oNeLng=oNeLng)

        if (request.args.get('spawnpoints', 'false') == 'true' and
                not user_args.no_spawnpoints):
            if lastspawns != 'true':
                d['spawnpoints'] = Trs_Spawn.get_spawnpoints(
                    swLat=swLat, swLng=swLng, neLat=neLat, neLng=neLng)
            else:
                d['spawnpoints'] = Trs_Spawn.get_spawnpoints(
                    swLat=swLat, swLng=swLng, neLat=neLat, neLng=neLng,
                    timestamp=timestamp)
                if newArea:
                    d['spawnpoints'] += Trs_Spawn.get_spawnpoints(
                        swLat, swLng, neLat, neLng, oSwLat=oSwLat,
                        oSwLng=oSwLng, oNeLat=oNeLat, oNeLng=oNeLng)

        if (request.args.get('scannedLocs', 'false') == 'true' and
                not user_args.no_scanned_locs):
            if lastscannedlocs != 'true':
                d['scannedlocs'] = ScannedLocation.get_recent(
                    swLat, swLng, neLat, neLng)
            else:
                d['scannedlocs'] = ScannedLocation.get_recent(
                    swLat, swLng, neLat, neLng, timestamp=timestamp)
                if newArea:
                    d['scannedlocs'] += ScannedLocation.get_recent(
                        swLat, swLng, neLat, neLng, oSwLat=oSwLat,
                        oSwLng=oSwLng, oNeLat=oNeLat, oNeLng=oNeLng)

        return jsonify(d)

    @app.route('/pkm_img')
    def pokemon_img():
        raw = 'raw' in request.args
        pkm = int(request.args.get('pkm'))
        weather = int(
            request.args.get('weather')) if 'weather' in request.args else 0
        gender = int(
            request.args.get('gender')) if 'gender' in request.args else None
        form = int(
            request.args.get('form')) if 'form' in request.args else None
        costume = int(
            request.args.get('costume')) if 'costume' in request.args else None
        shiny = 'shiny' in request.args

        if raw:
            filename = get_pokemon_raw_icon(
                pkm, gender=gender, form=form,
                costume=costume, weather=weather, shiny=shiny)
        else:
            filename = get_pokemon_map_icon(
                pkm, weather=weather,
                gender=gender, form=form, costume=costume)
        return send_file(filename, mimetype='image/png')

    @app.route('/gym_img')
    def gym_img():
        team = request.args.get('team')
        level = request.args.get('level')
        raidlevel = request.args.get('raidlevel')
        pkm = request.args.get('pkm')
        form = request.args.get('form')
        costume = int(
            request.args.get('costume')) if 'costume' in request.args else None
        is_in_battle = 'in_battle' in request.args
        is_ex_raid_eligible = 'is_ex_raid_eligible' in request.args

        if level is None or raidlevel is None:
            return send_file(
                get_gym_icon(team, level, raidlevel, pkm, is_in_battle, form,
                             costume, is_ex_raid_eligible),
                mimetype='image/png'
            )

        elif (int(level) < 0 or int(level) > 6 or int(raidlevel) < 0 or
              int(raidlevel) > 5):
            return abort(416)

        else:
            return send_file(
                get_gym_icon(team, level, raidlevel, pkm, is_in_battle, form,
                             costume, is_ex_raid_eligible),
                mimetype='image/png'
            )

    @app.route('/robots.txt')
    def render_robots_txt():
        return render_template('robots.txt')

    @app.route('/serviceWorker.min.js')
    def render_service_worker_js():
        return send_from_directory('../static/dist/js', 'serviceWorker.min.js')

    return app


class Pogom(Flask):

    def __init__(self, import_name, **kwargs):
        super(Pogom, self).__init__(import_name, **kwargs)
        args = get_args()
        cache.init_app(self)
        cache_buster.init_app(self)  # No more stale CSS/JS.
        compress.init_app(self)
        if args.cors:
            CORS(self)
        if args.client_auth:
            self.config['SESSION_TYPE'] = 'redis'
            redis_url = ('redis://' + args.redis_host + ':' +
                         str(args.redis_port))
            self.config['SESSION_REDIS'] = redis.from_url(redis_url)
            self.config['SESSION_USE_SIGNER'] = True
            self.secret_key = args.secret_key
            sess.init_app(self)
            self.accepted_auth_types = []
            if args.discord_auth:
                self.discord_auth = DiscordAuth()
                self.accepted_auth_types.append('discord')

        # Global blist
        if not args.disable_blacklist:
            log.info('Retrieving blacklist...')
            self.blacklist = get_ip_blacklist()
            # Sort & index for binary search
            self.blacklist.sort(key=lambda r: r[0])
            self.blacklist_keys = [
                dottedQuadToNum(r[0]) for r in self.blacklist
            ]
        else:
            log.info('Blacklist disabled for this session.')
            self.blacklist = []
            self.blacklist_keys = []

        self.db_conn_endpoint_blacklist = [
            'static', 'login_page', 'map_page', 'pokemon_history_page',
            'quest_page', 'render_robots_txt', 'render_service_worker_js',
            'pokemon_img', 'gym_img'
        ]
        self.before_request(self.db_connect)
        self.teardown_request(self.db_close)

        # Routes
        self.json_encoder = CustomJSONEncoder
        if args.client_auth:
            self.route("/login", methods=['GET'])(self.login_page)
            self.route("/logout", methods=['GET'])(self.logout)
            self.route("/login/<auth_type>", methods=['GET'])(self.login)
            self.route("/auth/<auth_type>", methods=['GET'])(self.auth)
        self.route("/", methods=['GET'])(self.map_page)
        self.route("/raw_data", methods=['GET'])(self.raw_data)
        self.route("/mobile", methods=['GET'])(self.list_pokemon)
        self.route("/pokemon-history", methods=['GET'])(
            self.pokemon_history_page)
        self.route("/quests", methods=['GET'])(self.quest_page)
        self.route("/gym_data", methods=['GET'])(self.get_gymdata)
        self.route("/robots.txt", methods=['GET'])(self.render_robots_txt)
        self.route("/serviceWorker.min.js", methods=['GET'])(
            self.render_service_worker_js)
        self.route("/gym_img", methods=['GET'])(self.gym_img)
        self.route("/pkm_img", methods=['GET'])(self.pokemon_img)

    def db_connect(self):
        if request.endpoint not in self.db_conn_endpoint_blacklist:
            db.connect()

    def db_close(self, exc):
        if request.endpoint not in self.db_conn_endpoint_blacklist:
            if not db.is_closed():
                db.close()

    def get_authenticator(self, auth_type):
        if auth_type == 'discord':
            return self.discord_auth

    def is_logged_in(self):
        return 'auth_type' in session

    def login_required(f):
        @wraps(f)
        def decorated_function(*_args, **kwargs):
            args = get_args()
            if not args.client_auth:
                return f(*_args, **kwargs)

            if args.login_required and not _args[0].is_logged_in():
                return redirect(url_for('login_page'))

            if _args[0].is_logged_in():
                auth_type = session['auth_type']
                authenticator = _args[0].get_authenticator(auth_type)
                access_data = authenticator.get_access_data()
                if not access_data[0]:
                    return redirect(access_data[2])
                kwargs['access_config'] = access_data[1]

            return f(*_args, **kwargs)
        return decorated_function

    def login_page(self):
        args = get_args()

        if self.is_logged_in():
            return redirect(url_for('map_page'))

        settings = {
            'motd': args.motd,
            'motdTitle': args.motd_title,
            'motdText': args.motd_text,
            'motdPages': args.motd_pages,
            'showMotdAlways': args.show_motd_always
        }

        return render_template(
            'login.html',
            lang=args.locale,
            map_title=args.map_title,
            header_image=not args.no_header_image,
            header_image_name=args.header_image,
            madmin_url=args.madmin_url,
            donate_url=args.donate_url,
            patreon_url=args.patreon_url,
            discord_url=args.discord_url,
            messenger_url=args.messenger_url,
            telegram_url=args.telegram_url,
            whatsapp_url=args.whatsapp_url,
            analytics_id=args.analytics_id,
            settings=settings
        )

    def login(self, auth_type):
        if self.is_logged_in():
            return redirect(url_for('map_page'))
        if auth_type not in self.accepted_auth_types:
            return redirect(url_for('login_page'))
        auth_uri = self.get_authenticator(auth_type).get_authorization_url()
        return redirect(auth_uri)

    def auth(self, auth_type):
        if self.is_logged_in():
            return redirect(url_for('map_page'))
        if auth_type not in self.accepted_auth_types:
            return redirect(url_for('login_page'))
        self.get_authenticator(auth_type).authorize()
        return redirect(url_for('map_page'))

    def logout(self):
        if self.is_logged_in():
            self.get_authenticator(session['auth_type']).end_session()
        return redirect(url_for('map_page'))

    def gym_img(self):
        team = request.args.get('team')
        level = request.args.get('level')
        raidlevel = request.args.get('raidlevel')
        pkm = request.args.get('pkm')
        form = request.args.get('form')
        costume = int(
            request.args.get('costume')) if 'costume' in request.args else None
        is_in_battle = 'in_battle' in request.args
        is_ex_raid_eligible = 'is_ex_raid_eligible' in request.args

        if level is None or raidlevel is None:
            return send_file(
                get_gym_icon(team, level, raidlevel, pkm, is_in_battle, form,
                             costume, is_ex_raid_eligible),
                mimetype='image/png'
            )

        elif (int(level) < 0 or int(level) > 6 or int(raidlevel) < 0 or
              int(raidlevel) > 5):
            return abort(416)

        else:
            return send_file(
                get_gym_icon(team, level, raidlevel, pkm, is_in_battle, form,
                             costume, is_ex_raid_eligible),
                mimetype='image/png'
            )

    def pokemon_img(self):
        raw = 'raw' in request.args
        pkm = int(request.args.get('pkm'))
        weather = int(
            request.args.get('weather')) if 'weather' in request.args else 0
        gender = int(
            request.args.get('gender')) if 'gender' in request.args else None
        form = int(
            request.args.get('form')) if 'form' in request.args else None
        costume = int(
            request.args.get('costume')) if 'costume' in request.args else None
        shiny = 'shiny' in request.args

        if raw:
            filename = get_pokemon_raw_icon(
                pkm, gender=gender, form=form,
                costume=costume, weather=weather, shiny=shiny)
        else:
            filename = get_pokemon_map_icon(
                pkm, weather=weather,
                gender=gender, form=form, costume=costume)
        return send_file(filename, mimetype='image/png')

    def render_robots_txt(self):
        return render_template('robots.txt')

    def render_service_worker_js(self):
        return send_from_directory('static/dist/js', 'serviceWorker.min.js')

    @login_required
    def map_page(self, *_args, **kwargs):
        if 'access_config' in kwargs:
            args = get_args(kwargs['access_config'])
        else:
            args = get_args()

        settings = {
            'centerLat': args.center_lat,
            'centerLng': args.center_lng,
            'maxZoomLevel': args.max_zoom_level,
            'showAllZoomLevel': args.show_all_zoom_level,
            'clusterZoomLevel': args.cluster_zoom_level,
            'clusterZoomLevelMobile': args.cluster_zoom_level_mobile,
            'maxClusterRadius': args.max_cluster_radius,
            'spiderfyClusters': args.spiderfy_clusters,
            'isStartMarkerMovable': not args.lock_start_marker,
            'generateImages': args.generate_images,
            'statsSidebar': not args.no_stats_sidebar,
            'twelveHourClock': args.twelve_hour_clock,
            'mapUpdateInverval': args.map_update_interval,
            'motd': args.motd,
            'motdTitle': args.motd_title,
            'motdText': args.motd_text,
            'motdPages': args.motd_pages,
            'showMotdAlways': args.show_motd_always,
            'pokemons': not args.no_pokemon,
            'upscaledPokemon': (
                [int(i) for i in args.upscaled_pokemon.split(',')]
                if args.upscaled_pokemon is not None else []),
            'pokemonValues': (not args.no_pokemon and
                              not args.no_pokemon_values),
            'rarity': (not args.no_pokemon and not args.no_rarity and
                       args.rarity_update_frequency),
            'rarityFileName': args.rarity_filename,
            'pokemonCries': not args.no_pokemon and args.pokemon_cries,
            'gyms': not args.no_gyms,
            'gymSidebar': ((not args.no_gyms or not args.no_raids) and
                           not args.no_gym_sidebar),
            'gymFilters': not args.no_gyms and not args.no_gym_filters,
            'raids': not args.no_raids,
            'raidFilters': not args.no_raids and not args.no_raid_filters,
            'pokestops': not args.no_pokestops,
            'quests': not args.no_pokestops and not args.no_quests,
            'invasions': not args.no_pokestops and not args.no_invasions,
            'lures': not args.no_pokestops and not args.no_lures,
            'weather': not args.no_weather,
            'spawnpoints': not args.no_spawnpoints,
            'scannedLocs': not args.no_scanned_locs,
            's2Cells': not args.no_s2_cells,
            'ranges': not args.no_ranges,
            'nestParks': args.nest_parks,
            'nestParksFileName': args.nest_parks_filename,
            'exParks': args.ex_parks,
            'exParksFileName': args.ex_parks_filename
        }

        return render_template(
            'map.html',
            lang=args.locale,
            map_title=args.map_title,
            header_image=not args.no_header_image,
            header_image_name=args.header_image,
            client_auth=args.client_auth,
            logged_in=self.is_logged_in(),
            madmin_url=args.madmin_url,
            donate_url=args.donate_url,
            patreon_url=args.patreon_url,
            discord_url=args.discord_url,
            messenger_url=args.messenger_url,
            telegram_url=args.telegram_url,
            whatsapp_url=args.whatsapp_url,
            pokemon_history_page=(settings['pokemons'] and
                                  not args.no_pokemon_history_page),
            quest_page=settings['quests'] and not args.no_quest_page,
            analytics_id=args.analytics_id,
            settings=settings,
            i18n=i8ln
        )

    @login_required
    def pokemon_history_page(self, *_args, **kwargs):
        if 'access_config' in kwargs:
            args = get_args(kwargs['access_config'])
        else:
            args = get_args()

        if args.no_pokemon or args.no_pokemon_history_page:
            abort(403)

        settings = {
            'centerLat': args.center_lat,
            'centerLng': args.center_lng,
            'generateImages': args.generate_images,
            'motd': args.motd,
            'motdTitle': args.motd_title,
            'motdText': args.motd_text,
            'motdPages': args.motd_pages,
            'showMotdAlways': args.show_motd_always
        }

        return render_template(
            'pokemon-history.html',
            lang=args.locale,
            map_title=args.map_title,
            header_image=not args.no_header_image,
            header_image_name=args.header_image,
            client_auth=args.client_auth,
            logged_in=self.is_logged_in(),
            madmin_url=args.madmin_url,
            donate_url=args.donate_url,
            patreon_url=args.patreon_url,
            discord_url=args.discord_url,
            messenger_url=args.messenger_url,
            telegram_url=args.telegram_url,
            whatsapp_url=args.whatsapp_url,
            quest_page=(not args.no_pokestops and not args.no_quests and
                        not args.no_quest_page),
            analytics_id=args.analytics_id,
            settings=settings
        )

    @login_required
    def quest_page(self, *_args, **kwargs):
        if 'access_config' in kwargs:
            args = get_args(kwargs['access_config'])
        else:
            args = get_args()

        if args.no_pokestops or args.no_quests or args.no_quest_page:
            abort(403)

        settings = {
            'generateImages': args.generate_images,
            'motd': args.motd,
            'motdTitle': args.motd_title,
            'motdText': args.motd_text,
            'motdPages': args.motd_pages,
            'showMotdAlways': args.show_motd_always
        }

        return render_template(
            'quest.html',
            lang=args.locale,
            map_title=args.map_title,
            header_image=not args.no_header_image,
            header_image_name=args.header_image,
            client_auth=args.client_auth,
            logged_in=self.is_logged_in(),
            madmin_url=args.madmin_url,
            donate_url=args.donate_url,
            patreon_url=args.patreon_url,
            discord_url=args.discord_url,
            messenger_url=args.messenger_url,
            telegram_url=args.telegram_url,
            whatsapp_url=args.whatsapp_url,
            pokemon_history_page=(not args.no_pokemon and
                                  not args.no_pokemon_history_page),
            analytics_id=args.analytics_id,
            settings=settings
        )

    @login_required
    def list_pokemon(self):
        if 'access_config' in kwargs:
            args = get_args(kwargs['access_config'])
        else:
            args = args

        # todo: Check if client is Android/iOS/Desktop for geolink, currently
        # only supports Android.
        pokemon_list = []

        settings = {
            'motd': args.motd,
            'motdTitle': args.motd_title,
            'motdText': args.motd_text,
            'motdPages': args.motd_pages,
            'showMotdAlways': args.show_motd_always
        }

        # Allow client to specify location.
        lat = request.args.get('lat', self.location[0], type=float)
        lon = request.args.get('lon', self.location[1], type=float)
        origin_point = LatLng.from_degrees(lat, lon)

        for pokemon in convert_pokemon_list(
                Pokemon.get_active(None, None, None, None)):
            pokemon_point = LatLng.from_degrees(pokemon['latitude'],
                                                pokemon['longitude'])
            diff = pokemon_point - origin_point
            diff_lat = diff.lat().degrees
            diff_lng = diff.lng().degrees
            direction = (('N' if diff_lat >= 0 else 'S')
                         if abs(diff_lat) > 1e-4 else '') +\
                        (('E' if diff_lng >= 0 else 'W')
                         if abs(diff_lng) > 1e-4 else '')
            entry = {
                'id': pokemon['pokemon_id'],
                'name': get_pokemon_name(pokemon['pokemon_id']),
                'card_dir': direction,
                'distance': int(origin_point.get_distance(
                    pokemon_point).radians * 6366468.241830914),
                'time_to_disappear': '%d min %d sec' % (divmod(
                    (pokemon['disappear_time'] - datetime.utcnow()).seconds,
                    60)),
                'disappear_time': pokemon['disappear_time'],
                'disappear_sec': (
                    pokemon['disappear_time'] - datetime.utcnow()).seconds,
                'latitude': pokemon['latitude'],
                'longitude': pokemon['longitude']
            }
            pokemon_list.append((entry, entry['distance']))
        pokemon_list = [y[0] for y in sorted(pokemon_list, key=lambda x: x[1])]

        return render_template(
            'mobile.html',
            pokemon_list=pokemon_list,
            origin_lat=lat,
            origin_lng=lon,
            analytics_id=args.analytics_id,
            settings=settings
        )

    def raw_data(self):
        args = get_args()

        # Make sure fingerprint isn't blacklisted.
        fingerprint_blacklisted = any([
            fingerprints['no_referrer'](request),
            fingerprints['iPokeGo'](request)
        ])

        if fingerprint_blacklisted:
            log.debug('User denied access: blacklisted fingerprint.')
            abort(403)

        if args.login_required and not self.is_logged_in():
            abort(403)

        if args.client_auth and self.is_logged_in():
            a = self.get_authenticator(session['auth_type'])
            permission, access_config, redirect_uri = a.get_access_data()
            if not permission:
                abort(403)
            args = get_args(access_config)

        d = {}

        # Request time of this request.
        d['timestamp'] = datetime.utcnow()

        # Request time of previous request.
        if request.args.get('timestamp'):
            timestamp = int(request.args.get('timestamp'))
            timestamp -= 1000  # Overlap, for rounding errors.
        else:
            timestamp = 0

        swLat = request.args.get('swLat')
        swLng = request.args.get('swLng')
        neLat = request.args.get('neLat')
        neLng = request.args.get('neLng')

        oSwLat = request.args.get('oSwLat')
        oSwLng = request.args.get('oSwLng')
        oNeLat = request.args.get('oNeLat')
        oNeLng = request.args.get('oNeLng')

        # Previous switch settings.
        lastpokemon = request.args.get('lastpokemon')
        lastgyms = request.args.get('lastgyms')
        lastpokestops = request.args.get('lastpokestops')
        lastspawns = request.args.get('lastspawns')
        lastscannedlocs = request.args.get('lastscannedlocs')
        lastweather = request.args.get('lastweather')

        # Current switch settings saved for next request.
        if request.args.get('pokemon', 'true') == 'true':
            d['lastpokemon'] = True

        if (request.args.get('gyms', 'true') == 'true' or
                request.args.get('raids', 'true') == 'true'):
            d['lastgyms'] = True

        if (request.args.get('pokestops', 'true') == 'true' and (
                request.args.get('pokestopsNoEvent', 'true') == 'true' or
                request.args.get('quests', 'true') == 'true' or
                request.args.get('invasions', 'true') == 'true' or
                request.args.get('lures', 'true') == 'true')):
            d['lastpokestops'] = True

        if request.args.get('spawnpoints', 'false') == 'true':
            d['lastspawns'] = True

        if request.args.get('scannedLocs', 'false') == 'true':
            d['lastscannedlocs'] = True

        if request.args.get('weather', 'false') == 'true':
            d['lastweather'] = True

        if (oSwLat is not None and oSwLng is not None and
                oNeLat is not None and oNeLng is not None):
            # If old coords are not equal to current coords we have
            # moved/zoomed!
            if (oSwLng < swLng and oSwLat < swLat and
                    oNeLat > neLat and oNeLng > neLng):
                newArea = False  # We zoomed in no new area uncovered.
            elif not (oSwLat == swLat and oSwLng == swLng and
                      oNeLat == neLat and oNeLng == neLng):
                newArea = True
            else:
                newArea = False

        # Pass current coords as old coords.
        d['oSwLat'] = swLat
        d['oSwLng'] = swLng
        d['oNeLat'] = neLat
        d['oNeLng'] = neLng

        if (request.args.get('pokemon', 'true') == 'true' and
                not args.no_pokemon):
            verified_despawn = args.verified_despawn_time
            eids = None
            ids = None
            if (request.args.get('eids') and
                    request.args.get('prionotif', 'false') == 'false'):
                request_eids = request.args.get('eids').split(',')
                eids = [int(i) for i in request_eids]
            elif not request.args.get('eids') and request.args.get('ids'):
                request_ids = request.args.get('ids').split(',')
                ids = [int(i) for i in request_ids]

            if lastpokemon != 'true':
                # If this is first request since switch on, load
                # all pokemon on screen.
                d['pokemons'] = convert_pokemon_list(
                    Pokemon.get_active(
                        swLat, swLng, neLat, neLng, eids=eids, ids=ids,
                        verified_despawn_time=verified_despawn))
            else:
                # If map is already populated only request modified Pokemon
                # since last request time.
                d['pokemons'] = convert_pokemon_list(
                    Pokemon.get_active(
                        swLat, swLng, neLat, neLng, timestamp=timestamp,
                        eids=eids, ids=ids,
                        verified_despawn_time=verified_despawn))

                if newArea:
                    # If screen is moved add newly uncovered Pokemon to the
                    # ones that were modified since last request time.
                    d['pokemons'] += (
                        convert_pokemon_list(
                            Pokemon.get_active(
                                swLat, swLng, neLat, neLng, oSwLat=oSwLat,
                                oSwLng=oSwLng, oNeLat=oNeLat, oNeLng=oNeLng,
                                eids=eids, ids=ids,
                                verified_despawn_time=verified_despawn)))

            if request.args.get('reids'):
                request_reids = request.args.get('reids').split(',')
                reids = [int(x) for x in request_reids]
                d['pokemons'] += convert_pokemon_list(
                    Pokemon.get_active(swLat, swLng, neLat, neLng, ids=ids,
                                       verified_despawn_time=verified_despawn))
                d['reids'] = reids

        if request.args.get('seen', 'false') == 'true':
            d['seen'] = Pokemon.get_seen(int(request.args.get('duration')))

        if request.args.get('appearances', 'false') == 'true':
            d['appearances'] = Pokemon.get_appearances(
                request.args.get('pokemonid'),
                request.args.get('formid'),
                int(request.args.get('duration')))

        if request.args.get('appearancesDetails', 'false') == 'true':
            d['appearancesTimes'] = (
                Pokemon.get_appearances_times_by_spawnpoint(
                    request.args.get('pokemonid'),
                    request.args.get('formid'),
                    request.args.get('spawnpoint_id'),
                    int(request.args.get('duration'))))

        gyms = (request.args.get('gyms', 'true') == 'true' and
                not args.no_gyms)
        raids = (request.args.get('raids', 'true') == 'true' and
                 not args.no_raids)
        if gyms or raids:
            if lastgyms != 'true':
                d['gyms'] = Gym.get_gyms(swLat, swLng, neLat, neLng,
                                         raids=raids)
            else:
                d['gyms'] = Gym.get_gyms(swLat, swLng, neLat, neLng,
                                         timestamp=timestamp, raids=raids)
                if newArea:
                    d['gyms'].update(
                        Gym.get_gyms(swLat, swLng, neLat, neLng,
                                     oSwLat=oSwLat, oSwLng=oSwLng,
                                     oNeLat=oNeLat, oNeLng=oNeLng,
                                     raids=raids))

        pokestops = (request.args.get('pokestops', 'true') == 'true' and
                     not args.no_pokestops)
        pokestopsNoEvent = (request.args.get(
            'pokestopsNoEvent', 'true') == 'true')
        quests = (request.args.get('quests', 'true') == 'true' and
                  not args.no_quests)
        invasions = (request.args.get('invasions', 'true') == 'true' and
                     not args.no_invasions)
        lures = (request.args.get('lures', 'true') == 'true' and
                 not args.no_lures)
        if (pokestops and (pokestopsNoEvent or quests or invasions or lures)):
            if lastpokestops != 'true':
                d['pokestops'] = Pokestop.get_stops(
                    swLat, swLng, neLat, neLng,
                    pokestopsNoEvent=pokestopsNoEvent, quests=quests,
                    invasions=invasions, lures=lures)
            else:
                d['pokestops'] = Pokestop.get_stops(
                    swLat, swLng, neLat, neLng, timestamp=timestamp,
                    pokestopsNoEvent=pokestopsNoEvent, quests=quests,
                    invasions=invasions, lures=lures)
                if newArea:
                    d['pokestops'].update(
                        Pokestop.get_stops(swLat, swLng, neLat, neLng,
                                           oSwLat=oSwLat, oSwLng=oSwLng,
                                           oNeLat=oNeLat, oNeLng=oNeLng,
                                           pokestopsNoEvent=pokestopsNoEvent,
                                           quests=quests, invasions=invasions,
                                           lures=lures))

        if (request.args.get('weather', 'false') == 'true' and
                not args.no_weather):
            if lastweather != 'true':
                d['weather'] = Weather.get_weather(swLat, swLng, neLat, neLng)
            else:
                d['weather'] = Weather.get_weather(swLat, swLng, neLat, neLng,
                                                   timestamp=timestamp)
                if newArea:
                    d['weather'] += Weather.get_weather(
                        swLat, swLng, neLat, neLng, oSwLat=oSwLat,
                        oSwLng=oSwLng, oNeLat=oNeLat, oNeLng=oNeLng)

        if (request.args.get('spawnpoints', 'false') == 'true' and
                not args.no_spawnpoints):
            if lastspawns != 'true':
                d['spawnpoints'] = Trs_Spawn.get_spawnpoints(
                    swLat=swLat, swLng=swLng, neLat=neLat, neLng=neLng)
            else:
                d['spawnpoints'] = Trs_Spawn.get_spawnpoints(
                    swLat=swLat, swLng=swLng, neLat=neLat, neLng=neLng,
                    timestamp=timestamp)
                if newArea:
                    d['spawnpoints'] += Trs_Spawn.get_spawnpoints(
                        swLat, swLng, neLat, neLng, oSwLat=oSwLat,
                        oSwLng=oSwLng, oNeLat=oNeLat, oNeLng=oNeLng)

        if (request.args.get('scannedLocs', 'false') == 'true' and
                not args.no_scanned_locs):
            if lastscannedlocs != 'true':
                d['scannedlocs'] = ScannedLocation.get_recent(
                    swLat, swLng, neLat, neLng)
            else:
                d['scannedlocs'] = ScannedLocation.get_recent(
                    swLat, swLng, neLat, neLng, timestamp=timestamp)
                if newArea:
                    d['scannedlocs'] += ScannedLocation.get_recent(
                        swLat, swLng, neLat, neLng, oSwLat=oSwLat,
                        oSwLng=oSwLng, oNeLat=oNeLat, oNeLng=oNeLng)

        return jsonify(d)

    def get_gymdata(self):
        gym_id = request.args.get('id')
        gym = Gym.get_gym(gym_id)

        return jsonify(gym)
