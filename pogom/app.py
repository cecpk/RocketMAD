#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import calendar
import logging
import gc

from datetime import datetime
from s2sphere import LatLng
from bisect import bisect_left
from flask import (Flask, abort, jsonify, render_template, request,
                   make_response, send_from_directory, send_file)
from flask.json import JSONEncoder
from flask_compress import Compress
from pogom.dyn_img import (get_gym_icon, get_pokemon_map_icon,
                           get_pokemon_raw_icon)
from pogom.weather import (get_weather_cells, get_weather_alerts)
from .models import (Pokemon, Gym, Pokestop, ScannedLocation, Trs_Spawn,
                     Weather)
from .utils import (get_args, get_pokemon_name, get_pokemon_types, now,
                    dottedQuadToNum)
from .client_auth import check_auth
from .transform import transform_from_wgs_to_gcj
from .blacklist import fingerprints, get_ip_blacklist

log = logging.getLogger(__name__)
compress = Compress()

args = get_args()


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


class Pogom(Flask):

    def __init__(self, import_name, **kwargs):
        super(Pogom, self).__init__(import_name, **kwargs)
        compress.init_app(self)

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

        # Routes
        self.json_encoder = CustomJSONEncoder
        self.route("/", methods=['GET'])(self.fullmap)
        self.route("/auth_callback", methods=['GET'])(self.auth_callback)
        self.route("/raw_data", methods=['GET'])(self.raw_data)
        self.route("/mobile", methods=['GET'])(self.list_pokemon)
        self.route("/stats", methods=['GET'])(self.get_stats)
        self.route("/quests", methods=['GET'])(self.get_quests)
        self.route("/gym_data", methods=['GET'])(self.get_gymdata)
        self.route("/submit_token", methods=['POST'])(self.submit_token)
        self.route("/robots.txt", methods=['GET'])(self.render_robots_txt)
        self.route("/serviceWorker.min.js", methods=['GET'])(
            self.render_service_worker_js)
        self.route("/gym_img", methods=['GET'])(self.gym_img)
        self.route("/pkm_img", methods=['GET'])(self.pokemon_img)

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

    def submit_token(self):
        response = 'error'
        if request.form:
            token = request.form.get('token')
            query = Token.insert(token=token, last_updated=datetime.utcnow())
            query.execute()
            response = 'ok'
        r = make_response(response)
        r.headers.add('Access-Control-Allow-Origin', '*')
        return r

    def validate_request(self):
        # Get real IP behind trusted reverse proxy.
        ip_addr = request.remote_addr
        if ip_addr in args.trusted_proxies:
            ip_addr = request.headers.get('X-Forwarded-For', ip_addr)

        # Make sure IP isn't blacklisted.
        if self._ip_is_blacklisted(ip_addr):
            log.debug('Denied access to %s: blacklisted IP.', ip_addr)
            abort(403)

    def _ip_is_blacklisted(self, ip):
        if not self.blacklist:
            return False

        # Get the nearest IP range
        pos = max(bisect_left(self.blacklist_keys, dottedQuadToNum(ip)) - 1, 0)
        ip_range = self.blacklist[pos]

        start = dottedQuadToNum(ip_range[0])
        end = dottedQuadToNum(ip_range[1])

        return start <= dottedQuadToNum(ip) <= end

    def set_location(self, location):
        self.location = location

    def auth_callback(self):
        return render_template('auth_callback.html')

    def fullmap(self):
        settings = {
            'centerLat': self.location[0],
            'centerLng': self.location[1],
            'maxZoomLevel': args.max_zoom_level,
            'showAllZoomLevel': args.show_all_zoom_level,
            'clusterZoomLevel': (
                args.cluster_zoom_level_mobile if request.MOBILE else
                args.cluster_zoom_level),
            'maxClusterRadius': args.max_cluster_radius,
            'spiderfyClusters': args.spiderfy_clusters,
            'isStartMarkerMovable': not args.lock_start_marker,
            'generateImages': args.generate_images,
            'statsSidebar': not args.no_stats_sidebar,
            'twelveHourClock': args.twelve_hour_clock,
            'pokemons': not args.no_pokemon,
            'pokemonValues': not args.no_pokemon and
                not args.no_pokemon_values,
            'rarity': not args.no_pokemon and
                args.rarity_update_frequency > 0,
            'rarityFileName': args.rarity_filename,
            'pokemonCries': not args.no_pokemon and args.pokemon_cries,
            'gyms': not args.no_gyms,
            'gymSidebar': (not args.no_gyms or not args.no_raids) and
                not args.no_gym_sidebar,
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
            madmin_url=args.madmin_url,
            donate_url=args.donate_url,
            patreon_url=args.patreon_url,
            discord_url=args.discord_url,
            messenger_url=args.messenger_url,
            telegram_url=args.telegram_url,
            whatsapp_url=args.whatsapp_url,
            settings=settings
        )


    def raw_data(self):
        # Make sure fingerprint isn't blacklisted.
        fingerprint_blacklisted = any([
            fingerprints['no_referrer'](request),
            fingerprints['iPokeGo'](request)
        ])

        if fingerprint_blacklisted:
            log.debug('User denied access: blacklisted fingerprint.')
            abort(403)

        auth_redirect = check_auth(request)
        if (auth_redirect):
            return auth_redirect

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
                        swLat, swLng, neLat, neLng, eids=eids, ids=ids))
            else:
                # If map is already populated only request modified Pokemon
                # since last request time.
                d['pokemons'] = convert_pokemon_list(
                    Pokemon.get_active(
                        swLat, swLng, neLat, neLng, timestamp=timestamp,
                        eids=eids, ids=ids))

                if newArea:
                    # If screen is moved add newly uncovered Pokemon to the
                    # ones that were modified since last request time.
                    d['pokemons'] += (
                        convert_pokemon_list(
                            Pokemon.get_active(
                                swLat, swLng, neLat, neLng, oSwLat=oSwLat,
                                oSwLng=oSwLng, oNeLat=oNeLat, oNeLng=oNeLng,
                                eids=eids, ids=ids)))

            if request.args.get('reids'):
                request_reids = request.args.get('reids').split(',')
                reids = [int(x) for x in request_reids]
                d['pokemons'] += convert_pokemon_list(
                    Pokemon.get_active(swLat, swLng, neLat, neLng, ids=ids))
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

        gyms = request.args.get('gyms', 'true') == 'true' and not args.no_gyms
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
                d['scannedlocs'] = ScannedLocation.get_recent(swLat, swLng,
                                                          neLat, neLng)
            else:
                d['scannedlocs'] = ScannedLocation.get_recent(swLat, swLng,
                                                          neLat, neLng,
                                                          timestamp=timestamp)
                if newArea:
                    d['scannedlocs'] += ScannedLocation.get_recent(
                        swLat, swLng, neLat, neLng, oSwLat=oSwLat,
                        oSwLng=oSwLng, oNeLat=oNeLat, oNeLng=oNeLng)



        #if request.args.get('weatherAlerts', 'false') == 'true':
        #    d['weatherAlerts'] = get_weather_alerts(swLat, swLng, neLat, neLng)

        return jsonify(d)

    def list_pokemon(self):
        # todo: Check if client is Android/iOS/Desktop for geolink, currently
        # only supports Android.
        pokemon_list = []

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
                'name': pokemon['pokemon_name'],
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
            'mobile_list.html',
            pokemon_list=pokemon_list,
            origin_lat=lat,
            origin_lng=lon,
        )

    def get_stats(self):
        return render_template(
            'statistics.html',
            lat=self.location[0],
            lng=self.location[1],
            lang=args.locale,
            mapTitle=args.map_title,
            headerImage=args.header_image,
            madminUrl=args.madmin_url,
            donateUrl=args.donate_url,
            patreonUrl=args.patreon_url,
            discordUrl=args.discord_url,
            messengerUrl=args.messenger_url,
            telegramUrl=args.telegram_url,
            whatsappUrl=args.whatsapp_url,
            generateImages=str(args.generate_images).lower()
        )

    def get_quests(self):
        if args.no_quests:
            abort(404)

        return render_template(
            'quests.html',
            lat=self.location[0],
            lng=self.location[1],
            lang=args.locale,
            mapTitle=args.map_title,
            headerImage=args.header_image,
            madminUrl=args.madmin_url,
            donateUrl=args.donate_url,
            patreonUrl=args.patreon_url,
            discordUrl=args.discord_url,
            messengerUrl=args.messenger_url,
            telegramUrl=args.telegram_url,
            whatsappUrl=args.whatsapp_url,
            generateImages=str(args.generate_images).lower()
        )

    def get_gymdata(self):
        gym_id = request.args.get('id')
        gym = Gym.get_gym(gym_id)

        return jsonify(gym)


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
