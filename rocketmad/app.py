#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import gc
import logging
import redis
import time

from datetime import datetime, timezone, timedelta
from flask import (abort, Flask, jsonify, redirect, render_template, request,
                   send_file, send_from_directory, session, url_for)
from flask.json import JSONEncoder
from flask_cachebuster import CacheBuster
from flask_compress import Compress
from flask_cors import CORS
from flask_session import Session
from functools import wraps
from s2sphere import LatLng

from .auth.auth_factory import AuthFactory
from .blacklist import fingerprints
from .dyn_img import ImageGenerator
from .models import (db, Pokemon, Gym, Pokestop, Nest, ScannedLocation,
                     TrsSpawn, Weather)
from .transform import transform_from_wgs_to_gcj
from .utils import (get_args, get_pokemon_name, get_sessions, i18n,
                    parse_geofence_file)

log = logging.getLogger(__name__)
args = get_args()

auth_factory = AuthFactory()
accepted_auth_types = []
valid_access_configs = []

version = int(time.time())  # Used for cache busting.


class CustomJSONEncoder(JSONEncoder):

    def default(self, obj):
        try:
            if isinstance(obj, datetime):
                if obj.utcoffset() is not None:
                    obj = obj - obj.utcoffset()
                # Convert datetime to POSIX timestamp in milliseconds.
                return int(obj.replace(tzinfo=timezone.utc).timestamp() * 1000)
            iterable = iter(obj)
        except TypeError:
            pass
        else:
            return list(iterable)
        return JSONEncoder.default(self, obj)


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


def is_admin():
    if not args.client_auth or not is_logged_in():
        return False

    auth_type = session['auth_type']
    if auth_type == 'basic':
        return session['username'] in args.basic_auth_admins
    elif auth_type == 'discord':
        return session['id'] in args.discord_admins
    elif auth_type == 'telegram':
        return session['id'] in args.telegram_admins


def auth_required(f):
    @wraps(f)
    def decorated_function(*_args, **kwargs):
        if args.client_auth and args.login_required and not is_logged_in():
            kwargs['has_permission'] = False
            kwargs['redirect_uri'] = url_for('login_page')
        elif args.client_auth and is_logged_in():
            auth_type = session['auth_type']
            if auth_type not in accepted_auth_types:
                session.clear()
                kwargs['has_permission'] = False
                kwargs['redirect_uri'] = url_for('login_page')
                return f(*_args, **kwargs)
            a = auth_factory.get_authenticator(auth_type)
            has_permission, redirect_uri, access_config = a.get_access_data()
            if not has_permission or (
                    access_config is not None
                    and access_config not in valid_access_configs):
                session.clear()
            kwargs['has_permission'] = has_permission
            kwargs['redirect_uri'] = redirect_uri
            kwargs['access_config'] = access_config
        else:
            kwargs['has_permission'] = True
            kwargs['redirect_uri'] = None
            kwargs['access_config'] = None
        return f(*_args, **kwargs)
    return decorated_function


def create_app():
    app = Flask(__name__,
                template_folder='../templates',
                static_folder='../static')
    app.json_encoder = CustomJSONEncoder
    cache_buster = CacheBuster(config={'extensions': ['.js', '.css']})
    cache_buster.init_app(app)
    Compress(app)
    if args.cors:
        CORS(app)

    db_uri = 'mysql+pymysql://{}:{}@{}:{}/{}?charset=utf8mb4'.format(
        args.db_user, args.db_pass, args.db_host, args.db_port, args.db_name)
    app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_size': 0  # No limit.
    }
    app.config['SQLALCHEMY_POOL_RECYCLE'] = args.db_pool_recycle
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)

    if args.client_auth:
        app.config['SESSION_TYPE'] = 'redis'
        r = redis.Redis(args.redis_host, args.redis_port)
        app.config['SESSION_REDIS'] = r
        app.config['SESSION_USE_SIGNER'] = True
        app.config['PERMANENT_SESSION_LIFETIME'] = \
            timedelta(days=args.session_duration)
        app.secret_key = args.secret_key
        Session(app)
        if args.basic_auth:
            accepted_auth_types.append('basic')
            for config in args.basic_auth_access_configs:
                name = config.split(':')[1]
                if name not in valid_access_configs:
                    valid_access_configs.append(name)
        if args.discord_auth:
            accepted_auth_types.append('discord')
            for config in args.discord_access_configs:
                length = len(config.split(':'))
                name = (config.split(':')[2] if length == 3 else
                        config.split(':')[1])
                if name not in valid_access_configs:
                    valid_access_configs.append(name)
        if args.telegram_auth:
            accepted_auth_types.append('telegram')
            for config in args.telegram_access_configs:
                name = config.split(':')[1]
                if name not in valid_access_configs:
                    valid_access_configs.append(name)

    image_generator = ImageGenerator()

    @app.before_request
    def validate_request():
        # Get real IP behind trusted reverse proxy.
        ip_addr = request.remote_addr
        if ip_addr in args.trusted_proxies:
            ip_addr = request.headers.get('X-Forwarded-For', ip_addr)

        if args.client_auth:
            session['ip'] = ip_addr
            session['last_active'] = datetime.utcnow()

    @app.route('/')
    @auth_required
    def map_page(*_args, **kwargs):
        if not kwargs['has_permission']:
            return redirect(kwargs['redirect_uri'])

        user_args = get_args(kwargs['access_config'])

        settings = {
            'centerLat': user_args.center_lat,
            'centerLng': user_args.center_lng,
            'customTileServers': user_args.custom_tile_servers,
            'maxZoomLevel': user_args.max_zoom_level,
            'showAllZoomLevel': user_args.show_all_zoom_level,
            'clusterZoomLevel': user_args.cluster_zoom_level,
            'clusterZoomLevelMobile': user_args.cluster_zoom_level_mobile,
            'maxClusterRadius': user_args.max_cluster_radius,
            'spiderfyClusters': user_args.spiderfy_clusters,
            'removeMarkersOutsideViewport': (
                not user_args.markers_outside_viewport),
            'autoPanPopup': not user_args.no_autopan_popup,
            'geocoder': not user_args.no_geocoder,
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
            'pokemonValues': (not user_args.no_pokemon
                              and not user_args.no_pokemon_values),
            'catchRates': user_args.catch_rates,
            'rarity': (not user_args.no_pokemon and user_args.rarity
                       and user_args.rarity_update_frequency),
            'rarityFileName': user_args.rarity_filename,
            'pokemonCries': (not user_args.no_pokemon
                             and user_args.pokemon_cries),
            'gyms': not user_args.no_gyms,
            'gymSidebar': ((not user_args.no_gyms or not user_args.no_raids)
                           and not user_args.no_gym_sidebar),
            'gymFilters': (not user_args.no_gyms
                           and not user_args.no_gym_filters),
            'raids': not user_args.no_raids,
            'raidFilters': (not user_args.no_raids
                            and not user_args.no_raid_filters),
            'pokestops': not user_args.no_pokestops,
            'quests': not user_args.no_pokestops and not user_args.no_quests,
            'invasions': (not user_args.no_pokestops
                          and not user_args.no_invasions),
            'lures': not user_args.no_pokestops and not user_args.no_lures,
            'weather': not user_args.no_weather,
            'spawnpoints': not user_args.no_spawnpoints,
            'scannedLocs': not user_args.no_scanned_locs,
            's2Cells': not user_args.no_s2_cells,
            'ranges': not user_args.no_ranges,
            'nests': user_args.nests,
            'nestParks': user_args.nest_parks,
            'nestParksFileName': user_args.nest_parks_filename,
            'exParks': user_args.ex_parks,
            'exParksFileName': user_args.ex_parks_filename
        }

        return render_template(
            'map.html',
            version=version,
            lang=user_args.locale,
            map_title=user_args.map_title,
            custom_favicon=user_args.custom_favicon,
            header_image=not user_args.no_header_image,
            header_image_name=user_args.header_image,
            client_auth=user_args.client_auth,
            logged_in=is_logged_in(),
            admin=is_admin(),
            madmin_url=user_args.madmin_url,
            donate_url=user_args.donate_url,
            patreon_url=user_args.patreon_url,
            discord_url=user_args.discord_url,
            messenger_url=user_args.messenger_url,
            telegram_url=user_args.telegram_url,
            whatsapp_url=user_args.whatsapp_url,
            pokemon_history_page=(settings['pokemons']
                                  and not user_args.no_pokemon_history_page),
            quest_page=settings['quests'] and not user_args.no_quest_page,
            analytics_id=user_args.analytics_id,
            settings=settings,
            i18n=i18n
        )

    @app.route('/pokemon-history')
    @auth_required
    def pokemon_history_page(*_args, **kwargs):
        if not kwargs['has_permission']:
            return redirect(kwargs['redirect_uri'])

        user_args = get_args(kwargs['access_config'])

        if user_args.no_pokemon or user_args.no_pokemon_history_page:
            if args.client_auth:
                if is_logged_in():
                    abort(403)
                else:
                    return redirect(url_for('login_page'))
            else:
                abort(404)

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
            version=version,
            lang=user_args.locale,
            map_title=user_args.map_title,
            custom_favicon=user_args.custom_favicon,
            header_image=not user_args.no_header_image,
            header_image_name=user_args.header_image,
            client_auth=user_args.client_auth,
            logged_in=is_logged_in(),
            admin=is_admin(),
            madmin_url=user_args.madmin_url,
            donate_url=user_args.donate_url,
            patreon_url=user_args.patreon_url,
            discord_url=user_args.discord_url,
            messenger_url=user_args.messenger_url,
            telegram_url=user_args.telegram_url,
            whatsapp_url=user_args.whatsapp_url,
            quest_page=(not user_args.no_pokestops
                        and not user_args.no_quests
                        and not user_args.no_quest_page),
            analytics_id=user_args.analytics_id,
            settings=settings,
            i18n=i18n
        )

    @app.route('/quests')
    @auth_required
    def quest_page(*_args, **kwargs):
        if not kwargs['has_permission']:
            return redirect(kwargs['redirect_uri'])

        user_args = get_args(kwargs['access_config'])

        if (user_args.no_pokestops or user_args.no_quests
                or user_args.no_quest_page):
            if args.client_auth:
                if is_logged_in():
                    abort(403)
                else:
                    return redirect(url_for('login_page'))
            else:
                abort(404)

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
            version=version,
            lang=user_args.locale,
            map_title=user_args.map_title,
            custom_favicon=user_args.custom_favicon,
            header_image=not user_args.no_header_image,
            header_image_name=user_args.header_image,
            client_auth=user_args.client_auth,
            logged_in=is_logged_in(),
            admin=is_admin(),
            madmin_url=user_args.madmin_url,
            donate_url=user_args.donate_url,
            patreon_url=user_args.patreon_url,
            discord_url=user_args.discord_url,
            messenger_url=user_args.messenger_url,
            telegram_url=user_args.telegram_url,
            whatsapp_url=user_args.whatsapp_url,
            pokemon_history_page=(not user_args.no_pokemon
                                  and not user_args.no_pokemon_history_page),
            analytics_id=user_args.analytics_id,
            settings=settings,
            i18n=i18n
        )

    @app.route('/mobile')
    @auth_required
    def mobile_page(*_args, **kwargs):
        if not kwargs['has_permission']:
            return redirect(kwargs['redirect_uri'])

        user_args = get_args(kwargs['access_config'])

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
        lat = request.args.get('lat', user_args.center_lat, type=float)
        lon = request.args.get('lon', user_args.center_lng, type=float)
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
            version=version,
            custom_favicon=user_args.custom_favicon,
            pokemon_list=pokemon_list,
            origin_lat=lat,
            origin_lng=lon,
            analytics_id=user_args.analytics_id,
            settings=settings,
            i18n=i18n
        )

    @app.route('/login')
    def login_page():
        if not args.client_auth:
            abort(404)

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
            version=version,
            lang=args.locale,
            map_title=args.map_title,
            custom_favicon=args.custom_favicon,
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
            basic_auth=args.basic_auth,
            discord_auth=args.discord_auth,
            telegram_auth=args.telegram_auth,
            pokemon_history_page=(not args.no_pokemon
                                  and not args.no_pokemon_history_page),
            quest_page=(not args.no_pokestops and not args.no_quests
                        and not args.no_quest_page),
            settings=settings,
            i18n=i18n
        )

    @app.route('/login/<auth_type>')
    def login(auth_type):
        if not args.client_auth:
            abort(404)

        if is_logged_in():
            return redirect(url_for('map_page'))

        if auth_type not in accepted_auth_types:
            abort(404)

        authenticator = auth_factory.get_authenticator(auth_type)
        auth_uri = authenticator.get_authorization_url()

        return redirect(auth_uri)

    @app.route('/login/basic')
    def basic_login_page():
        if not args.basic_auth:
            abort(404)

        settings = {
            'motd': args.motd,
            'motdTitle': args.motd_title,
            'motdText': args.motd_text,
            'motdPages': args.motd_pages,
            'showMotdAlways': args.show_motd_always
        }

        return render_template(
            'basic-login.html',
            version=version,
            lang=args.locale,
            map_title=args.map_title,
            custom_favicon=args.custom_favicon,
            header_image=not args.no_header_image,
            header_image_name=args.header_image,
            madmin_url=args.madmin_url,
            donate_url=args.donate_url,
            patreon_url=args.patreon_url,
            discord_url=args.discord_url,
            messenger_url=args.messenger_url,
            telegram_url=args.telegram_url,
            whatsapp_url=args.whatsapp_url,
            pokemon_history_page=(not args.no_pokemon
                                  and not args.no_pokemon_history_page),
            quest_page=(not args.no_pokestops and not args.no_quests
                        and not args.no_quest_page),
            analytics_id=args.analytics_id,
            settings=settings,
            i18n=i18n
        )

    @app.route('/login/telegram')
    def telegram_login_page():
        if not args.telegram_auth:
            abort(404)

        settings = {
            'motd': args.motd,
            'motdTitle': args.motd_title,
            'motdText': args.motd_text,
            'motdPages': args.motd_pages,
            'showMotdAlways': args.show_motd_always
        }

        return render_template(
            'telegram.html',
            version=version,
            lang=args.locale,
            map_title=args.map_title,
            custom_favicon=args.custom_favicon,
            header_image=not args.no_header_image,
            header_image_name=args.header_image,
            madmin_url=args.madmin_url,
            donate_url=args.donate_url,
            patreon_url=args.patreon_url,
            discord_url=args.discord_url,
            messenger_url=args.messenger_url,
            telegram_url=args.telegram_url,
            whatsapp_url=args.whatsapp_url,
            pokemon_history_page=(not args.no_pokemon
                                  and not args.no_pokemon_history_page),
            quest_page=(not args.no_pokestops and not args.no_quests
                        and not args.no_quest_page),
            analytics_id=args.analytics_id,
            telegram_bot_username=args.telegram_bot_username,
            server_uri=args.server_uri,
            settings=settings,
            i18n=i18n
        )

    @app.route('/auth/<auth_type>')
    def auth(auth_type):
        if not args.client_auth:
            abort(404)

        if is_logged_in():
            return redirect(url_for('map_page'))

        if auth_type not in accepted_auth_types:
            abort(404)

        success = auth_factory.get_authenticator(auth_type).authorize()
        if not success:
            if auth_type == 'basic':
                return redirect(url_for('basic_login_page') + '?success=false')
            elif auth_type == 'discord':
                return redirect(url_for('login_page'))
            elif auth_type == 'telegram':
                return redirect(url_for('telegram_login_page'))

        if args.no_multiple_logins:
            r = app.config['SESSION_REDIS']
            sessions = get_sessions(r)
            for s in sessions:
                if ('auth_type' in s
                        and s['auth_type'] == session['auth_type']
                        and s['id'] == session['id']):
                    r.delete('session:' + s['session_id'])

        return redirect(url_for('map_page'))

    @app.route('/logout')
    def logout():
        if not args.client_auth:
            abort(404)

        if is_logged_in():
            if session['auth_type'] in accepted_auth_types:
                a = auth_factory.get_authenticator(session['auth_type'])
                a.end_session()
            else:
                session.clear()

        return redirect(url_for('map_page'))

    @app.route('/admin')
    def admin_page():
        return redirect(url_for('users_page'))

    @app.route('/admin/users')
    @auth_required
    def users_page(*_args, **kwargs):
        if not args.client_auth:
            abort(404)

        if not kwargs['has_permission']:
            return redirect(kwargs['redirect_uri'])

        if not is_admin():
            abort(403)

        user_args = get_args(kwargs['access_config'])

        settings = {
            'motd': user_args.motd,
            'motdTitle': user_args.motd_title,
            'motdText': user_args.motd_text,
            'motdPages': user_args.motd_pages,
            'showMotdAlways': user_args.show_motd_always
        }

        return render_template(
            'users.html',
            version=version,
            lang=user_args.locale,
            map_title=user_args.map_title,
            custom_favicon=user_args.custom_favicon,
            header_image=not user_args.no_header_image,
            header_image_name=user_args.header_image,
            madmin_url=user_args.madmin_url,
            donate_url=user_args.donate_url,
            patreon_url=user_args.patreon_url,
            discord_url=user_args.discord_url,
            messenger_url=user_args.messenger_url,
            telegram_url=user_args.telegram_url,
            whatsapp_url=user_args.whatsapp_url,
            analytics_id=user_args.analytics_id,
            pokemon_history_page=(not user_args.no_pokemon
                                  and not user_args.no_pokemon_history_page),
            quest_page=(not user_args.no_pokestops
                        and not user_args.no_quests
                        and not user_args.no_quest_page),
            settings=settings,
            i18n=i18n
        )

    @app.route('/raw-data')
    @auth_required
    def raw_data(*_args, **kwargs):
        if not kwargs['has_permission']:
            abort(401)

        user_args = get_args(kwargs['access_config'])

        # Make sure fingerprint isn't blacklisted.
        fingerprint_blacklisted = any([
            fingerprints['no_referrer'](request)
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

        # Pass current coords as old coords.
        d['oSwLat'] = swLat
        d['oSwLng'] = swLng
        d['oNeLat'] = neLat
        d['oNeLng'] = neLng

        if (oSwLat is not None and oSwLng is not None
                and oNeLat is not None and oNeLng is not None):
            # If old coords are not equal to current coords we have
            # moved/zoomed!
            if (oSwLng < swLng and oSwLat < swLat
                    and oNeLat > neLat and oNeLng > neLng):
                new_area = False  # We zoomed in no new area uncovered.
            elif not (oSwLat == swLat and oSwLng == swLng
                      and oNeLat == neLat and oNeLng == neLng):
                new_area = True
            else:
                new_area = False

        pokemon = (request.args.get('pokemon') == 'true'
                   and not user_args.no_pokemon)
        seen = request.args.get('seen') == 'true'
        appearances = request.args.get('appearances') == 'true'
        appearances_details = request.args.get('appearancesDetails') == 'true'
        gyms = request.args.get('gyms') == 'true' and not user_args.no_gyms
        raids = request.args.get('raids') == 'true' and not user_args.no_raids
        pokestops = (request.args.get('pokestops') == 'true'
                     and not user_args.no_pokestops)
        eventless_pokestops = request.args.get('eventlessPokestops') == 'true'
        quests = (request.args.get('quests') == 'true'
                  and not user_args.no_quests)
        invasions = (request.args.get('invasions') == 'true'
                     and not user_args.no_invasions)
        lures = request.args.get('lures') == 'true' and not user_args.no_lures
        weather = (request.args.get('weather') == 'true'
                   and not user_args.no_weather)
        spawnpoints = (request.args.get('spawnpoints') == 'true'
                       and not user_args.no_spawnpoints)
        scanned_locs = (request.args.get('scannedLocs') == 'true'
                        and not user_args.no_scanned_locs)
        nests = request.args.get('nests') == 'true' and user_args.nests
        exclude_nearby_cells = request.args.get('excludeNearbyCells') == 'true'

        all_pokemon = request.args.get('allPokemon') == 'true'
        all_gyms = request.args.get('allGyms') == 'true'
        all_pokestops = request.args.get('allPokestops') == 'true'
        all_weather = request.args.get('allWeather') == 'true'
        all_spawnpoints = request.args.get('allSpawnpoints') == 'true'
        all_scanned_locs = request.args.get('allScannedLocs') == 'true'
        all_nests = request.args.get('allNests') == 'true'

        if all_pokemon:
            d['allPokemon'] = True
        if all_gyms:
            d['allGyms'] = True
        if all_pokestops:
            d['allPokestops'] = True
        if all_weather:
            d['allWeather'] = True
        if all_spawnpoints:
            d['allSpawnpoints'] = True
        if all_scanned_locs:
            d['allScannedLocs'] = True
        if all_nests:
            d['allNests'] = True
        if exclude_nearby_cells:
            d['excludeNearbyCells'] = True

        geofences = (
            parse_geofence_file('geofences/' + user_args.geofence_file)
            if user_args.geofence_file else None
        )
        exclude_geofences = (
            parse_geofence_file('geofences/' + user_args.geofence_exclude_file)
            if user_args.geofence_exclude_file else None
        )

        if pokemon:
            verified_despawn = user_args.verified_despawn_time
            eids = None
            ids = None
            if (request.args.get('eids')
                    and request.args.get('prionotif', 'false') == 'false'):
                request_eids = request.args.get('eids').split(',')
                eids = [int(i) for i in request_eids]
            elif not request.args.get('eids') and request.args.get('ids'):
                request_ids = request.args.get('ids').split(',')
                ids = [int(i) for i in request_ids]

            if timestamp == 0 or all_pokemon:
                # If this is first request since switch on, load
                # all pokemon on screen.
                d['pokemons'] = convert_pokemon_list(
                    Pokemon.get_active(
                        swLat, swLng, neLat, neLng, eids=eids, ids=ids,
                        geofences=geofences,
                        exclude_geofences=exclude_geofences,
                        verified_despawn_time=verified_despawn,
                        exclude_nearby_cells=exclude_nearby_cells))
            else:
                # If map is already populated only request modified Pokemon
                # since last request time.
                d['pokemons'] = convert_pokemon_list(
                    Pokemon.get_active(
                        swLat, swLng, neLat, neLng, timestamp=timestamp,
                        eids=eids, ids=ids, geofences=geofences,
                        exclude_geofences=exclude_geofences,
                        verified_despawn_time=verified_despawn,
                        exclude_nearby_cells=exclude_nearby_cells))

                if new_area:
                    # If screen is moved add newly uncovered Pokemon to the
                    # ones that were modified since last request time.
                    d['pokemons'].extend(
                        convert_pokemon_list(
                            Pokemon.get_active(
                                swLat, swLng, neLat, neLng, oSwLat=oSwLat,
                                oSwLng=oSwLng, oNeLat=oNeLat, oNeLng=oNeLng,
                                eids=eids, ids=ids, geofences=geofences,
                                exclude_geofences=exclude_geofences,
                                verified_despawn_time=verified_despawn,
                                exclude_nearby_cells=exclude_nearby_cells)))

            if request.args.get('reids'):
                request_reids = request.args.get('reids').split(',')
                reids = [int(x) for x in request_reids]
                d['pokemons'] += convert_pokemon_list(
                    Pokemon.get_active(swLat, swLng, neLat, neLng, ids=reids,
                                       geofences=geofences,
                                       exclude_geofences=exclude_geofences,
                                       verified_despawn_time=verified_despawn,
                                       exclude_nearby_cells=exclude_nearby_cells))
                d['reids'] = reids

        if seen:
            d['seen'] = Pokemon.get_seen(int(request.args.get('duration')),
                                         geofences=geofences,
                                         exclude_geofences=exclude_geofences)

        if appearances:
            d['appearances'] = Pokemon.get_appearances(
                request.args.get('pokemonid'),
                request.args.get('formid'),
                int(request.args.get('duration')),
                geofences=geofences,
                exclude_geofences=exclude_geofences)

        if appearances_details:
            d['appearancesTimes'] = (
                Pokemon.get_appearances_times_by_spawnpoint(
                    request.args.get('pokemonid'),
                    request.args.get('spawnpoint_id'),
                    request.args.get('formid'),
                    int(request.args.get('duration')),
                    geofences=geofences,
                    exclude_geofences=exclude_geofences))

        if gyms or raids:
            if timestamp == 0 or all_gyms:
                d['gyms'] = Gym.get_gyms(swLat, swLng, neLat, neLng,
                                         raids=raids, geofences=geofences,
                                         exclude_geofences=exclude_geofences)
            else:
                d['gyms'] = Gym.get_gyms(swLat, swLng, neLat, neLng,
                                         timestamp=timestamp, raids=raids,
                                         geofences=geofences,
                                         exclude_geofences=exclude_geofences)
                if new_area:
                    d['gyms'].extend(
                        Gym.get_gyms(swLat, swLng, neLat, neLng,
                                     oSwLat=oSwLat, oSwLng=oSwLng,
                                     oNeLat=oNeLat, oNeLng=oNeLng,
                                     raids=raids, geofences=geofences,
                                     exclude_geofences=exclude_geofences))

        if pokestops and (eventless_pokestops or quests or invasions or lures):
            if timestamp == 0 or all_pokestops:
                d['pokestops'] = Pokestop.get_pokestops(
                    swLat, swLng, neLat, neLng,
                    eventless_stops=eventless_pokestops, quests=quests,
                    invasions=invasions, lures=lures, geofences=geofences,
                    exclude_geofences=exclude_geofences
                )
            else:
                d['pokestops'] = Pokestop.get_pokestops(
                    swLat, swLng, neLat, neLng, timestamp=timestamp,
                    eventless_stops=eventless_pokestops, quests=quests,
                    invasions=invasions, lures=lures, geofences=geofences,
                    exclude_geofences=exclude_geofences
                )
                if new_area:
                    d['pokestops'].extend(Pokestop.get_pokestops(
                        swLat, swLng, neLat, neLng, oSwLat=oSwLat,
                        oSwLng=oSwLng, oNeLat=oNeLat, oNeLng=oNeLng,
                        eventless_stops=eventless_pokestops, quests=quests,
                        invasions=invasions, lures=lures, geofences=geofences,
                        exclude_geofences=exclude_geofences
                    ))

        if weather:
            if timestamp == 0 or all_weather:
                d['weather'] = Weather.get_weather(
                    swLat, swLng, neLat, neLng, geofences=geofences,
                    exclude_geofences=exclude_geofences
                )
            else:
                d['weather'] = Weather.get_weather(
                    swLat, swLng, neLat, neLng, timestamp=timestamp,
                    geofences=geofences, exclude_geofences=exclude_geofences
                )
                if new_area:
                    d['weather'] += Weather.get_weather(
                        swLat, swLng, neLat, neLng, oSwLat=oSwLat,
                        oSwLng=oSwLng, oNeLat=oNeLat, oNeLng=oNeLng,
                        geofences=geofences,
                        exclude_geofences=exclude_geofences
                    )

        if spawnpoints:
            if timestamp == 0 or all_spawnpoints:
                d['spawnpoints'] = TrsSpawn.get_spawnpoints(
                    swLat=swLat, swLng=swLng, neLat=neLat, neLng=neLng,
                    geofences=geofences,
                    exclude_geofences=exclude_geofences
                )
            else:
                d['spawnpoints'] = TrsSpawn.get_spawnpoints(
                    swLat=swLat, swLng=swLng, neLat=neLat, neLng=neLng,
                    timestamp=timestamp, geofences=geofences,
                    exclude_geofences=exclude_geofences
                )
                if new_area:
                    d['spawnpoints'] += TrsSpawn.get_spawnpoints(
                        swLat, swLng, neLat, neLng, oSwLat=oSwLat,
                        oSwLng=oSwLng, oNeLat=oNeLat, oNeLng=oNeLng,
                        geofences=geofences,
                        exclude_geofences=exclude_geofences
                    )

        if scanned_locs:
            if timestamp == 0 or all_scanned_locs:
                d['scannedlocs'] = ScannedLocation.get_recent(
                    swLat, swLng, neLat, neLng, geofences=geofences,
                    exclude_geofences=exclude_geofences
                )
            else:
                d['scannedlocs'] = ScannedLocation.get_recent(
                    swLat, swLng, neLat, neLng, timestamp=timestamp,
                    geofences=geofences,
                    exclude_geofences=exclude_geofences
                )
                if new_area:
                    d['scannedlocs'] += ScannedLocation.get_recent(
                        swLat, swLng, neLat, neLng, oSwLat=oSwLat,
                        oSwLng=oSwLng, oNeLat=oNeLat, oNeLng=oNeLng,
                        geofences=geofences,
                        exclude_geofences=exclude_geofences
                    )

        if nests:
            if timestamp == 0 or all_nests:
                d['nests'] = Nest.get_nests(
                    swLat, swLng, neLat, neLng, geofences=geofences,
                    exclude_geofences=exclude_geofences
                )
            else:
                d['nests'] = Nest.get_nests(
                    swLat, swLng, neLat, neLng, timestamp=timestamp,
                    geofences=geofences,
                    exclude_geofences=exclude_geofences
                )
                if new_area:
                    d['nests'] += Nest.get_nests(
                        swLat, swLng, neLat, neLng, oSwLat=oSwLat,
                        oSwLng=oSwLng, oNeLat=oNeLat, oNeLng=oNeLng,
                        geofences=geofences,
                        exclude_geofences=exclude_geofences
                    )

        return jsonify(d)

    @app.route('/raw-data/users')
    def users_data():
        if not args.client_auth:
            abort(404)

        if not is_admin():
            abort(403)

        sessions = get_sessions(app.config['SESSION_REDIS'])
        users = []
        for s in sessions:
            if 'auth_type' in s:
                del s['_permanent']
                users.append(s)

        return jsonify(users)

    @app.route('/pkm_img')
    def pokemon_img():
        raw = 'raw' in request.args
        pkm = int(request.args.get('pkm'))
        gender = int(request.args.get('gender', '0'))
        form = int(request.args.get('form', '0'))
        costume = int(request.args.get('costume', '0'))
        evolution = int(request.args.get('evolution', '0'))
        shiny = 'shiny' in request.args
        weather = int(request.args.get('weather', '0'))

        if raw:
            filename = image_generator.get_pokemon_raw_icon(
                pkm, gender=gender, form=form, costume=costume,
                evolution=evolution, shiny=shiny, weather=weather)
        else:
            filename = image_generator.get_pokemon_map_icon(
                pkm, gender=gender, form=form, costume=costume,
                evolution=evolution, weather=weather)
        return send_file(filename, mimetype='image/png')

    @app.route('/gym_img')
    def gym_img():
        team = request.args.get('team')
        level = int(request.args.get('level'))
        raid_level = int(request.args.get('raid-level', '0'))
        pkm = int(request.args.get('pkm', '0'))
        form = int(request.args.get('form', '0'))
        costume = int(request.args.get('costume', '0'))
        evolution = int(request.args.get('evolution', '0'))
        in_battle = 'in-battle' in request.args
        ex_raid_eligible = 'ex-raid-eligible' in request.args

        if level < 0 or level > 6 or (pkm > 0 and raid_level == 0):
            abort(400)

        return send_file(
            image_generator.get_gym_icon(
                team, level, raid_level, pkm, form, costume, evolution,
                ex_raid_eligible, in_battle),
            mimetype='image/png'
        )

    @app.route('/robots.txt')
    def render_robots_txt():
        return render_template('robots.txt')

    @app.route('/serviceWorker.min.js')
    def render_service_worker_js():
        return send_from_directory('../static/dist/js', 'serviceWorker.min.js')

    return app
