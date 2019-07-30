#!/usr/bin/python
# -*- coding: utf-8 -*-

import logging
import itertools
import sys
import gc
import time

from peewee import (Check, SmallIntegerField, IntegerField, CharField,
                    DoubleField, BooleanField, DateTimeField, fn, FloatField,
                    TextField, BigIntegerField, JOIN, OperationalError,
                    __exception_wrapper__)
from playhouse.flask_utils import FlaskDB
from playhouse.pool import PooledMySQLDatabase
from playhouse.migrate import migrate, MySQLMigrator
from datetime import datetime, timedelta
from cachetools import TTLCache
from cachetools import cached
from functools import reduce
from timeit import default_timer

from .utils import (get_pokemon_name, get_pokemon_types,
                    get_args, cellid, get_move_name, get_move_damage,
                    get_move_energy, get_move_type)
from .transform import transform_from_wgs_to_gcj

log = logging.getLogger(__name__)

args = get_args()
flaskDb = FlaskDB()
cache = TTLCache(maxsize=100, ttl=60 * 5)

db_schema_version = 35


class RetryOperationalError(object):
    def execute_sql(self, sql, params=None, commit=True):
        try:
            cursor = super(RetryOperationalError, self).execute_sql(
                sql, params, commit)
        except OperationalError:
            if not self.is_closed():
                self.close()
            with __exception_wrapper__:
                cursor = self.cursor()
                cursor.execute(sql, params or ())
                if commit and not self.in_transaction():
                    self.commit()
        return cursor


class MyRetryDB(RetryOperationalError, PooledMySQLDatabase):
    pass


# Reduction of CharField to fit max length inside 767 bytes for utf8mb4 charset
class Utf8mb4CharField(CharField):
    def __init__(self, max_length=191, *args, **kwargs):
        self.max_length = max_length
        super(CharField, self).__init__(*args, **kwargs)


class TinyIntegerField(IntegerField):
    field_type = 'tinyint'


class UBigIntegerField(BigIntegerField):
    db_field = 'bigint unsigned'


def init_database(app):
    log.info('Connecting to MySQL database on %s:%i...',
             args.db_host, args.db_port)
    db = MyRetryDB(
        args.db_name,
        user=args.db_user,
        password=args.db_pass,
        host=args.db_host,
        port=args.db_port,
        stale_timeout=30,
        max_connections=None,
        charset='utf8mb4')

    # Using internal method as the other way would be using internal var, we
    # could use initializer but db is initialized later
    flaskDb._load_database(app, db)
    if app is not None:
        flaskDb._register_handlers(app)
    return db


class BaseModel(flaskDb.Model):

    @classmethod
    def database(cls):
        return cls._meta.database

    @classmethod
    def get_all(cls):
        return [m for m in cls.select().dicts()]


class LatLongModel(BaseModel):

    @classmethod
    def get_all(cls):
        results = [m for m in cls.select().dicts()]
        if args.china:
            for result in results:
                result['latitude'], result['longitude'] = \
                    transform_from_wgs_to_gcj(
                        result['latitude'], result['longitude'])
        return results


class Pokemon(LatLongModel):
    # We are base64 encoding the ids delivered by the api
    # because they are too big for sqlite to handle.
    encounter_id = UBigIntegerField(primary_key=True)
    spawnpoint_id = UBigIntegerField(index=True)
    pokemon_id = SmallIntegerField(index=True)
    latitude = DoubleField()
    longitude = DoubleField()
    disappear_time = DateTimeField()
    individual_attack = SmallIntegerField(null=True)
    individual_defense = SmallIntegerField(null=True)
    individual_stamina = SmallIntegerField(null=True)
    move_1 = SmallIntegerField(null=True)
    move_2 = SmallIntegerField(null=True)
    cp = SmallIntegerField(null=True)
    cp_multiplier = FloatField(null=True)
    weight = FloatField(null=True)
    height = FloatField(null=True)
    gender = SmallIntegerField(null=True)
    form = SmallIntegerField(null=True)
    costume = SmallIntegerField(null=True)
    catch_prob_1 = DoubleField(null=True)
    catch_prob_2 = DoubleField(null=True)
    catch_prob_3 = DoubleField(null=True)
    rating_attack = CharField(null=True, max_length=2)
    rating_defense = CharField(null=True, max_length=2)
    weather_boosted_condition = SmallIntegerField(null=True)
    last_modified = DateTimeField(
        null=True, index=True, default=datetime.utcnow)

    class Meta:
        indexes = (
            (('latitude', 'longitude'), False),
            (('disappear_time', 'pokemon_id'), False)
        )

    @staticmethod
    def get_active(swLat, swLng, neLat, neLng, timestamp=0, oSwLat=None,
                   oSwLng=None, oNeLat=None, oNeLng=None, exclude=None):
        now_date = datetime.utcnow()
        query = Pokemon.select()

        if exclude:
            query = query.where(Pokemon.pokemon_id.not_in(list(exclude)))

        if not (swLat and swLng and neLat and neLng):
            query = (query
                     .where(Pokemon.disappear_time > now_date)
                     .dicts())
        elif timestamp > 0:
            # If timestamp is known only load modified Pokemon.
            query = (query
                     .where(((Pokemon.last_modified >
                              datetime.utcfromtimestamp(timestamp / 1000)) &
                             (Pokemon.disappear_time > now_date)) &
                            ((Pokemon.latitude >= swLat) &
                             (Pokemon.longitude >= swLng) &
                             (Pokemon.latitude <= neLat) &
                             (Pokemon.longitude <= neLng)))
                     .dicts())
        elif oSwLat and oSwLng and oNeLat and oNeLng:
            # Send Pokemon in view but exclude those within old boundaries.
            # Only send newly uncovered Pokemon.
            query = (query
                     .where((Pokemon.disappear_time > now_date) &
                            ((Pokemon.latitude >= swLat) &
                             (Pokemon.longitude >= swLng) &
                             (Pokemon.latitude <= neLat) &
                             (Pokemon.longitude <= neLng)) & ~
                            ((Pokemon.latitude >= oSwLat) &
                             (Pokemon.longitude >= oSwLng) &
                             (Pokemon.latitude <= oNeLat) &
                             (Pokemon.longitude <= oNeLng)))
                     .dicts())
        else:
            query = (query
                     # Add 1 hour buffer to include spawnpoints that persist
                     # after tth, like shsh.
                     .where((Pokemon.disappear_time > now_date) &
                            (((Pokemon.latitude >= swLat) &
                              (Pokemon.longitude >= swLng) &
                              (Pokemon.latitude <= neLat) &
                              (Pokemon.longitude <= neLng))))
                     .dicts())
        return list(query)

    @staticmethod
    def get_active_by_id(ids, swLat, swLng, neLat, neLng):
        if not (swLat and swLng and neLat and neLng):
            query = (Pokemon
                     .select()
                     .where((Pokemon.pokemon_id << ids) &
                            (Pokemon.disappear_time > datetime.utcnow()))
                     .dicts())
        else:
            query = (Pokemon
                     .select()
                     .where((Pokemon.pokemon_id << ids) &
                            (Pokemon.disappear_time > datetime.utcnow()) &
                            (Pokemon.latitude >= swLat) &
                            (Pokemon.longitude >= swLng) &
                            (Pokemon.latitude <= neLat) &
                            (Pokemon.longitude <= neLng))
                     .dicts())
        return list(query)

    # Get all Pokémon spawn counts based on the last x hours.
    # More efficient than get_seen(): we don't do any unnecessary mojo.
    # Returns a dict:
    #   { 'pokemon': [ {'pokemon_id': '', 'count': 1} ], 'total': 1 }.
    @staticmethod
    def get_spawn_counts(hours):
        query = (Pokemon
                 .select(Pokemon.pokemon_id,
                         fn.Count(Pokemon.pokemon_id).alias('count')))

        # Allow 0 to query everything.
        if hours:
            hours = datetime.utcnow() - timedelta(hours=hours)
            # Not using WHERE speeds up the query.
            query = query.where(Pokemon.disappear_time > hours)

        query = query.group_by(Pokemon.pokemon_id).dicts()

        # We need a total count. Use reduce() instead of sum() for O(n)
        # instead of O(2n) caused by list comprehension.
        total = reduce(lambda x, y: x + y['count'], query, 0)

        return {'pokemon': query, 'total': total}

    @staticmethod
    @cached(cache)
    def get_seen(timediff):
        if timediff:
            timediff = datetime.utcnow() - timedelta(hours=timediff)

        # Note: pokemon_id+0 forces SQL to ignore the pokemon_id index
        # and should use the disappear_time index and hopefully
        # improve performance
        pokemon_count_query = (Pokemon
                               .select((Pokemon.pokemon_id + 0).alias(
                                   'pokemon_id'),
                                   fn.COUNT((Pokemon.pokemon_id + 0)).alias(
                                       'count'),
                                   fn.MAX(Pokemon.disappear_time).alias(
                                       'lastappeared'))
                               .where(Pokemon.disappear_time > timediff)
                               .group_by((Pokemon.pokemon_id + 0))
                               .alias('counttable')
                               )
        query = (Pokemon
                 .select(Pokemon.pokemon_id,
                         Pokemon.disappear_time,
                         Pokemon.latitude,
                         Pokemon.longitude,
                         pokemon_count_query.c.count)
                 .join(pokemon_count_query,
                       on=(Pokemon.pokemon_id ==
                           pokemon_count_query.c.pokemon_id))
                 .distinct()
                 .where(Pokemon.disappear_time ==
                        pokemon_count_query.c.lastappeared)
                 .dicts()
                 )

        # Performance:  disable the garbage collector prior to creating a
        # (potentially) large dict with append().
        gc.disable()

        pokemon = []
        total = 0
        for p in query:
            p['pokemon_name'] = get_pokemon_name(p['pokemon_id'])
            pokemon.append(p)
            total += p['count']

        # Re-enable the GC.
        gc.enable()

        return {'pokemon': pokemon, 'total': total}

    @staticmethod
    def get_appearances(pokemon_id, timediff):
        '''
        :param pokemon_id: id of Pokemon that we need appearances for
        :param timediff: limiting period of the selection
        :return: list of Pokemon appearances over a selected period
        '''
        if timediff:
            timediff = datetime.utcnow() - timedelta(hours=timediff)
        query = (Pokemon
                 .select(Pokemon.latitude, Pokemon.longitude,
                         Pokemon.pokemon_id,
                         fn.Count(Pokemon.spawnpoint_id).alias('count'),
                         Pokemon.spawnpoint_id)
                 .where((Pokemon.pokemon_id == pokemon_id) &
                        (Pokemon.disappear_time > timediff)
                        )
                 .group_by(Pokemon.latitude, Pokemon.longitude,
                           Pokemon.pokemon_id, Pokemon.spawnpoint_id)
                 .dicts()
                 )

        return list(query)

    @staticmethod
    def get_appearances_times_by_spawnpoint(pokemon_id, spawnpoint_id,
                                            timediff):

        '''
        :param pokemon_id: id of Pokemon that we need appearances times for.
        :param spawnpoint_id: spawnpoint id we need appearances times for.
        :param timediff: limiting period of the selection.
        :return: list of time appearances over a selected period.
        '''
        if timediff:
            timediff = datetime.utcnow() - timedelta(hours=timediff)
        query = (Pokemon
                 .select(Pokemon.disappear_time)
                 .where((Pokemon.pokemon_id == pokemon_id) &
                        (Pokemon.spawnpoint_id == spawnpoint_id) &
                        (Pokemon.disappear_time > timediff)
                        )
                 .order_by(Pokemon.disappear_time.asc())
                 .tuples()
                 )

        return list(itertools.chain(*query))


class Pokestop(LatLongModel):
    pokestop_id = Utf8mb4CharField(primary_key=True, max_length=50)
    enabled = BooleanField()
    latitude = DoubleField()
    longitude = DoubleField()
    name = Utf8mb4CharField(null=True, max_length=128)
    image = Utf8mb4CharField(null=True, max_length=255)
    last_modified = DateTimeField(index=True)
    lure_expiration = DateTimeField(null=True, index=True)
    active_fort_modifier = SmallIntegerField(null=True, index=True)
    incident_start = DateTimeField(null=True)
    incident_expiration = DateTimeField(null=True)
    incident_grunt_type = SmallIntegerField(null=True, index=True)
    last_updated = DateTimeField(
        null=True, index=True, default=datetime.utcnow)

    class Meta:
        indexes = ((('latitude', 'longitude'), False),)

    @staticmethod
    def get_stops(swLat, swLng, neLat, neLng, timestamp=0, oSwLat=None,
                  oSwLng=None, oNeLat=None, oNeLng=None, pokestopsNoEvent=False,
                  quests=False, invasions=False, lures=False):
        if invasions and lures:
            query = (Pokestop
                     .select(Pokestop.pokestop_id, Pokestop.name,
                             Pokestop.image, Pokestop.latitude,
                             Pokestop.longitude, Pokestop.last_updated,
                             Pokestop.incident_expiration,
                             Pokestop.incident_grunt_type,
                             Pokestop.active_fort_modifier,
                             Pokestop.lure_expiration))
        elif invasions:
            query = (Pokestop
                     .select(Pokestop.pokestop_id, Pokestop.name,
                             Pokestop.image, Pokestop.latitude,
                             Pokestop.longitude, Pokestop.last_updated,
                             Pokestop.incident_expiration,
                             Pokestop.incident_grunt_type))
        elif lures:
            query = (Pokestop
                     .select(Pokestop.pokestop_id, Pokestop.name,
                             Pokestop.image, Pokestop.latitude,
                             Pokestop.longitude, Pokestop.last_updated,
                             Pokestop.active_fort_modifier,
                             Pokestop.lure_expiration))
        else:
            query = (Pokestop
                     .select(Pokestop.pokestop_id, Pokestop.name,
                             Pokestop.image, Pokestop.latitude,
                             Pokestop.longitude, Pokestop.last_updated))

        if swLat and swLng and neLat and neLng:
            query = (query
                     .where((Pokestop.latitude >= swLat) &
                            (Pokestop.longitude >= swLng) &
                            (Pokestop.latitude <= neLat) &
                            (Pokestop.longitude <= neLng)))

            if oSwLat and oSwLng and oNeLat and oNeLng:
                # Send stops in view, but exclude those within old boundaries.
                query = (query
                         .where(~((Pokestop.latitude >= oSwLat) &
                                  (Pokestop.longitude >= oSwLng) &
                                  (Pokestop.latitude <= oNeLat) &
                                  (Pokestop.longitude <= oNeLng))))
            elif timestamp > 0:
                query = (query
                         .where(Pokestop.last_updated >
                                datetime.utcfromtimestamp(timestamp / 1000)))

                expression = None
                if quests:
                    quest_query = (Trs_Quest
                                   .select(Trs_Quest.GUID)
                                   .where(Trs_Quest.quest_timestamp >
                                        timestamp / 1000))
                    expression = Pokestop.pokestop_id << quest_query
                if invasions:
                    if expression is None:
                        expression = Pokestop.incident_start.is_null(False)
                    else:
                        expression |= Pokestop.incident_start.is_null(False)
                if lures:
                    if expression is None:
                        expression = Pokestop.active_fort_modifier.is_null(
                            False)
                    else:
                        expression |= Pokestop.active_fort_modifier.is_null(
                            False)

                if expression is not None:
                    query = query.where(expression)
                else:
                    return {}
            else:
                if not pokestopsNoEvent:
                    expression = None
                    if quests:
                        expression = Pokestop.pokestop_id << Trs_Quest.select(
                            Trs_Quest.GUID)
                    if invasions:
                        if expression is None:
                            expression = Pokestop.incident_expiration.is_null(
                                False)
                        else:
                            expression |= Pokestop.incident_expiration.is_null(
                                False)
                    if lures:
                        if expression is None:
                            expression = Pokestop.active_fort_modifier.is_null(
                                False)
                        else:
                            expression |= (Pokestop.active_fort_modifier
                                           .is_null(False))

                    if expression is not None:
                        query = query.where(expression)


        # Performance:  disable the garbage collector prior to creating a
        # (potentially) large dict with append().
        gc.disable()

        pokestops = {}
        pokestop_ids = []
        for p in query.dicts():
            if args.china:
                p['latitude'], p['longitude'] = \
                    transform_from_wgs_to_gcj(p['latitude'], p['longitude'])
            p['quest'] = None
            pokestops[p['pokestop_id']] = p
            pokestop_ids.append(p['pokestop_id'])

        if quests and len(pokestop_ids) > 0:
            today = datetime.today() # Local time.
            today_timestamp = datetime.timestamp(
                datetime.combine(today, datetime.min.time()))
            quests = (Trs_Quest
                      .select(Trs_Quest.GUID.alias('pokestop_id'),
                              Trs_Quest.quest_task.alias('task'),
                              Trs_Quest.quest_type.alias('type'),
                              Trs_Quest.quest_stardust.alias('stardust'),
                              Trs_Quest.quest_pokemon_id.alias('pokemon_id'),
                              Trs_Quest.quest_reward_type.alias('reward_type'),
                              Trs_Quest.quest_item_id.alias('item_id'),
                              Trs_Quest.quest_item_amount.alias('item_amount'))
                      .where((Trs_Quest.GUID << pokestop_ids) &
                             (Trs_Quest.quest_timestamp >= today_timestamp))
                      .dicts())

            for q in quests:
                pokestops[q['pokestop_id']]['quest'] = q

        # Re-enable the GC.
        gc.enable()
        return pokestops


class Gym(LatLongModel):
    gym_id = Utf8mb4CharField(primary_key=True, max_length=50)
    team_id = SmallIntegerField(default=0)
    guard_pokemon_id = SmallIntegerField(default=0)
    slots_available = SmallIntegerField(default=6)
    enabled = BooleanField(default=True)
    is_ex_raid_eligible = BooleanField(default=False)
    latitude = DoubleField()
    longitude = DoubleField()
    total_cp = SmallIntegerField(default=0)
    is_in_battle = BooleanField(default=False)
    gender = SmallIntegerField(null=True)
    form = SmallIntegerField(null=True)
    costume = SmallIntegerField(null=True)
    weather_boosted_condition = SmallIntegerField(null=True)
    shiny = BooleanField(null=True)
    last_modified = DateTimeField(index=True)
    last_scanned = DateTimeField(default=datetime.utcnow, index=True)

    class Meta:
        indexes = ((('latitude', 'longitude'), False),)

    @staticmethod
    def get_gyms(swLat, swLng, neLat, neLng, timestamp=0, oSwLat=None,
                 oSwLng=None, oNeLat=None, oNeLng=None):
        if not (swLat and swLng and neLat and neLng):
            results = (Gym
                       .select()
                       .dicts())
        elif timestamp > 0:
            # If timestamp is known only send last scanned Gyms.
            results = (Gym
                       .select()
                       .where(((Gym.last_scanned >
                                datetime.utcfromtimestamp(timestamp / 1000)) &
                               (Gym.latitude >= swLat) &
                               (Gym.longitude >= swLng) &
                               (Gym.latitude <= neLat) &
                               (Gym.longitude <= neLng)))
                       .dicts())
        elif oSwLat and oSwLng and oNeLat and oNeLng:
            # Send gyms in view but exclude those within old boundaries. Only
            # send newly uncovered gyms.
            results = (Gym
                       .select()
                       .where(((Gym.latitude >= swLat) &
                               (Gym.longitude >= swLng) &
                               (Gym.latitude <= neLat) &
                               (Gym.longitude <= neLng)) &
                              ~((Gym.latitude >= oSwLat) &
                                (Gym.longitude >= oSwLng) &
                                (Gym.latitude <= oNeLat) &
                                (Gym.longitude <= oNeLng)))
                       .dicts())

        else:
            results = (Gym
                       .select()
                       .where((Gym.latitude >= swLat) &
                              (Gym.longitude >= swLng) &
                              (Gym.latitude <= neLat) &
                              (Gym.longitude <= neLng))
                       .dicts())

        # Performance:  disable the garbage collector prior to creating a
        # (potentially) large dict with append().
        gc.disable()

        gyms = {}
        gym_ids = []
        for g in results:
            g['name'] = None
            g['url'] = None
            g['pokemon'] = []
            g['raid'] = None
            gyms[g['gym_id']] = g
            gym_ids.append(g['gym_id'])

        if len(gym_ids) > 0:
            details = (GymDetails
                       .select(
                           GymDetails.gym_id,
                           GymDetails.name,
                           GymDetails.url,)
                       .where(GymDetails.gym_id << gym_ids)
                       .dicts())

            for d in details:
                gyms[d['gym_id']]['name'] = d['name']
                gyms[d['gym_id']]['url'] = d['url']

            raids = (Raid
                     .select()
                     .where(Raid.gym_id << gym_ids)
                     .dicts())

            for r in raids:
                if r['pokemon_id']:
                    r['pokemon_name'] = get_pokemon_name(r['pokemon_id'])
                    r['pokemon_types'] = get_pokemon_types(r['pokemon_id'])
                gyms[r['gym_id']]['raid'] = r

        # Re-enable the GC.
        gc.enable()

        return gyms

    @staticmethod
    def get_gym(id):
        try:
            result = (Gym
                      .select(Gym.gym_id,
                              Gym.team_id,
                              GymDetails.name,
                              GymDetails.url,
                              GymDetails.description,
                              Gym.guard_pokemon_id,
                              Gym.gender,
                              Gym.form,
                              Gym.costume,
                              Gym.weather_boosted_condition,
                              Gym.shiny,
                              Gym.slots_available,
                              Gym.latitude,
                              Gym.longitude,
                              Gym.last_modified,
                              Gym.last_scanned,
                              Gym.total_cp,
                              Gym.is_in_battle,
                              Gym.is_ex_raid_eligible)
                      .join(GymDetails, JOIN.LEFT_OUTER,
                            on=(Gym.gym_id == GymDetails.gym_id))
                      .where(Gym.gym_id == id)
                      .dicts()
                      .get())
        except Gym.DoesNotExist:
            return None

        result['guard_pokemon_name'] = get_pokemon_name(
            result['guard_pokemon_id']) if result['guard_pokemon_id'] else ''

        try:
            raid = Raid.select(Raid).where(Raid.gym_id == id).dicts().get()
            if raid['pokemon_id']:
                raid['pokemon_name'] = get_pokemon_name(raid['pokemon_id'])
                raid['pokemon_types'] = get_pokemon_types(raid['pokemon_id'])
            result['raid'] = raid
        except Raid.DoesNotExist:
            pass

        return result


class Raid(BaseModel):
    gym_id = Utf8mb4CharField(primary_key=True, max_length=50)
    level = IntegerField(index=True)
    spawn = DateTimeField(index=True)
    start = DateTimeField(index=True)
    end = DateTimeField(index=True)
    pokemon_id = SmallIntegerField(null=True)
    cp = IntegerField(null=True)
    move_1 = SmallIntegerField(null=True)
    move_2 = SmallIntegerField(null=True)
    last_scanned = DateTimeField(default=datetime.utcnow, index=True)
    form = SmallIntegerField(null=True)
    is_exclusive = BooleanField(null=True)
    gender = SmallIntegerField(null=True)


class Trs_Quest(BaseModel):
    GUID = Utf8mb4CharField(primary_key=True, max_length=50, index=True)
    quest_condition = Utf8mb4CharField(max_length=500, null=True)
    quest_reward = Utf8mb4CharField(max_length=1000, null=True)
    quest_task = Utf8mb4CharField(max_length=150, null=True)
    quest_type = TinyIntegerField()
    quest_stardust = SmallIntegerField()
    quest_pokemon_id = SmallIntegerField()
    quest_reward_type = SmallIntegerField()
    quest_item_id = SmallIntegerField()
    quest_item_amount = TinyIntegerField()
    quest_target = TinyIntegerField()
    quest_timestamp = IntegerField()


class ScannedLocation(LatLongModel):
    cellid = UBigIntegerField(primary_key=True)
    latitude = DoubleField()
    longitude = DoubleField()
    last_modified = DateTimeField(
        index=True, default=datetime.utcnow, null=True)
    # Marked true when all five bands have been completed.
    done = BooleanField(default=False)

    # Five scans/hour is required to catch all spawns.
    # Each scan must be at least 12 minutes from the previous check,
    # with a 2 minute window during which the scan can be done.

    # Default of -1 is for bands not yet scanned.
    band1 = SmallIntegerField(default=-1)
    band2 = SmallIntegerField(default=-1)
    band3 = SmallIntegerField(default=-1)
    band4 = SmallIntegerField(default=-1)
    band5 = SmallIntegerField(default=-1)

    # midpoint is the center of the bands relative to band 1.
    # If band 1 is 10.4 minutes, and band 4 is 34.0 minutes, midpoint
    # is -0.2 minutes in minsec.  Extra 10 seconds in case of delay in
    # recording now time.
    midpoint = SmallIntegerField(default=0)

    # width is how wide the valid window is. Default is 0, max is 2 minutes.
    # If band 1 is 10.4 minutes, and band 4 is 34.0 minutes, midpoint
    # is 0.4 minutes in minsec.
    width = SmallIntegerField(default=0)

    class Meta:
        indexes = ((('latitude', 'longitude'), False),)
        constraints = [Check('band1 >= -1'), Check('band1 < 3600'),
                       Check('band2 >= -1'), Check('band2 < 3600'),
                       Check('band3 >= -1'), Check('band3 < 3600'),
                       Check('band4 >= -1'), Check('band4 < 3600'),
                       Check('band5 >= -1'), Check('band5 < 3600'),
                       Check('midpoint >= -130'), Check('midpoint <= 130'),
                       Check('width >= 0'), Check('width <= 130')]

    @staticmethod
    def get_recent(swLat, swLng, neLat, neLng, timestamp=0, oSwLat=None,
                   oSwLng=None, oNeLat=None, oNeLng=None):
        activeTime = (datetime.utcnow() - timedelta(minutes=15))
        if timestamp > 0:
            query = (ScannedLocation
                     .select()
                     .where(((ScannedLocation.last_modified >=
                              datetime.utcfromtimestamp(timestamp / 1000))) &
                            (ScannedLocation.latitude >= swLat) &
                            (ScannedLocation.longitude >= swLng) &
                            (ScannedLocation.latitude <= neLat) &
                            (ScannedLocation.longitude <= neLng))
                     .dicts())
        elif oSwLat and oSwLng and oNeLat and oNeLng:
            # Send scannedlocations in view but exclude those within old
            # boundaries. Only send newly uncovered scannedlocations.
            query = (ScannedLocation
                     .select()
                     .where((((ScannedLocation.last_modified >= activeTime)) &
                             (ScannedLocation.latitude >= swLat) &
                             (ScannedLocation.longitude >= swLng) &
                             (ScannedLocation.latitude <= neLat) &
                             (ScannedLocation.longitude <= neLng)) &
                            ~(((ScannedLocation.last_modified >= activeTime)) &
                              (ScannedLocation.latitude >= oSwLat) &
                              (ScannedLocation.longitude >= oSwLng) &
                              (ScannedLocation.latitude <= oNeLat) &
                              (ScannedLocation.longitude <= oNeLng)))
                     .dicts())
        else:
            query = (ScannedLocation
                     .select()
                     .where((ScannedLocation.last_modified >= activeTime) &
                            (ScannedLocation.latitude >= swLat) &
                            (ScannedLocation.longitude >= swLng) &
                            (ScannedLocation.latitude <= neLat) &
                            (ScannedLocation.longitude <= neLng))
                     .order_by(ScannedLocation.last_modified.asc())
                     .dicts())

        return list(query)


class SpawnPoint(LatLongModel):
    id = UBigIntegerField(primary_key=True)
    latitude = DoubleField()
    longitude = DoubleField()
    last_scanned = DateTimeField(index=True)
    # kind gives the four quartiles of the spawn, as 's' for seen
    # or 'h' for hidden.  For example, a 30 minute spawn is 'hhss'.
    kind = Utf8mb4CharField(max_length=4, default='hhhs')

    # links shows whether a Pokemon encounter id changes between quartiles or
    # stays the same.  Both 1x45 and 1x60h3 have the kind of 'sssh', but the
    # different links shows when the encounter id changes.  Same encounter id
    # is shared between two quartiles, links shows a '+'.  A different
    # encounter id between two quartiles is a '-'.
    #
    # For the hidden times, an 'h' is used.  Until determined, '?' is used.
    # Note index is shifted by a half. links[0] is the link between
    # kind[0] and kind[1] and so on. links[3] is the link between
    # kind[3] and kind[0]
    links = Utf8mb4CharField(max_length=4, default='????')

    # Count consecutive times spawn should have been seen, but wasn't.
    # If too high, will not be scheduled for review, and treated as inactive.
    missed_count = IntegerField(default=0)

    # Next 2 fields are to narrow down on the valid TTH window.
    # Seconds after the hour of the latest Pokemon seen time within the hour.
    latest_seen = SmallIntegerField()

    # Seconds after the hour of the earliest time Pokemon wasn't seen after an
    # appearance.
    earliest_unseen = SmallIntegerField()

    class Meta:
        indexes = ((('latitude', 'longitude'), False),)
        constraints = [Check('earliest_unseen >= 0'),
                       Check('earliest_unseen <= 3600'),
                       Check('latest_seen >= 0'),
                       Check('latest_seen <= 3600')]

    @staticmethod
    def get_spawnpoints(swLat, swLng, neLat, neLng, timestamp=0,
                        oSwLat=None, oSwLng=None, oNeLat=None, oNeLng=None):
        spawnpoints = {}
        with SpawnPoint.database():
            query = (trs_spawn.select(
                trs_spawn.latitude, trs_spawn.longitude,
                trs_spawn.spawnpoint.alias('id'),
                trs_spawn.calc_endminsec.alias('latest_seen'),
                trs_spawn.calc_endminsec.alias('earliest_unseen')).dicts())

            if timestamp > 0:
                query = (
                    query.where(((trs_spawn.last_scanned >
                                  datetime.utcfromtimestamp(timestamp / 1000)))
                                & ((trs_spawn.latitude >= swLat) &
                                   (trs_spawn.longitude >= swLng) &
                                   (trs_spawn.latitude <= neLat) &
                                   (trs_spawn.longitude <= neLng))).dicts())
            elif oSwLat and oSwLng and oNeLat and oNeLng:
                # Send spawnpoints in view but exclude those within old
                # boundaries. Only send newly uncovered spawnpoints.
                query = (query
                         .where((((trs_spawn.latitude >= swLat) &
                                  (trs_spawn.longitude >= swLng) &
                                  (trs_spawn.latitude <= neLat) &
                                  (trs_spawn.longitude <= neLng))) &
                                ~((trs_spawn.latitude >= oSwLat) &
                                  (trs_spawn.longitude >= oSwLng) &
                                  (trs_spawn.latitude <= oNeLat) &
                                  (trs_spawn.longitude <= oNeLng)))
                         .dicts())
            elif swLat and swLng and neLat and neLng:
                query = (query
                         .where((trs_spawn.latitude <= neLat) &
                                (trs_spawn.latitude >= swLat) &
                                (trs_spawn.longitude >= swLng) &
                                (trs_spawn.longitude <= neLng)))

            query = (query.where(trs_spawn.calc_endminsec.is_null(False)))

            queryDict = query.dicts()
            for sp in queryDict:
                key = sp['id']
                sp['links'] = 'hh??'
                sp['kind'] = 'hhss'
                sp['earliest_unseen'] = (int(sp['earliest_unseen'].split(':')[0]) * 60
                    + int(sp['earliest_unseen'].split(':')[1]))
                sp['latest_seen'] = sp['earliest_unseen']
                appear_time, disappear_time = SpawnPoint.start_end(sp)
                spawnpoints[key] = sp
                spawnpoints[key]['disappear_time'] = disappear_time
                spawnpoints[key]['appear_time'] = appear_time

        # Helping out the GC.
        for sp in list(spawnpoints.values()):
            del sp['kind']
            del sp['links']
            del sp['latest_seen']
            del sp['earliest_unseen']

        return list(spawnpoints.values())

    # Confirm if tth has been found.
    @staticmethod
    def tth_found(sp):
        # Fully identified if no '?' in links and
        # latest_seen % 3600 == earliest_unseen % 3600.
        # Warning: python uses modulo as the least residue, not as
        # remainder, so we don't apply it to the result.
        latest_seen = (sp['latest_seen'] % 3600)
        earliest_unseen = (sp['earliest_unseen'] % 3600)
        return latest_seen - earliest_unseen == 0

    # Return [start, end] in seconds after the hour for the spawn, despawn
    # time of a spawnpoint.
    @staticmethod
    def start_end(sp, spawn_delay=0, links=False):
        links_arg = links
        links = links if links else str(sp['links'])

        if links == '????':  # Clean up for old data.
            links = str(sp['kind'].replace('s', '?'))

        # Make some assumptions if link not fully identified.
        if links.count('-') == 0:
            links = links[:-1] + '-'

        links = links.replace('?', '+')

        links = links[:-1] + '-'
        plus_or_minus = links.index('+') if links.count('+') else links.index(
            '-')
        start = sp['earliest_unseen'] - (4 - plus_or_minus) * 900 + spawn_delay
        no_tth_adjust = 60 if not links_arg and not SpawnPoint.tth_found(
            sp) else 0
        end = sp['latest_seen'] - (3 - links.index('-')) * 900 + no_tth_adjust
        return [start % 3600, end % 3600]


class trs_spawn(BaseModel):
     spawnpoint = Utf8mb4CharField(primary_key=True, max_length=16, index=True)
     latitude = DoubleField()
     longitude = DoubleField()
     spawndef = IntegerField(default=240)
     earliest_unseen = IntegerField()
     last_scanned = DateTimeField(null=True)
     first_detection = DateTimeField(default=datetime.utcnow)
     last_non_scanned = DateTimeField(null=True)
     calc_endminsec = Utf8mb4CharField(max_length=5, null=True)


class Versions(BaseModel):
    key = Utf8mb4CharField()
    val = SmallIntegerField()

    class Meta:
        primary_key = False


class GymDetails(BaseModel):
    gym_id = Utf8mb4CharField(primary_key=True, max_length=50)
    name = Utf8mb4CharField()
    description = TextField(null=True, default="")
    url = Utf8mb4CharField()
    last_scanned = DateTimeField(default=datetime.utcnow)


class Weather(BaseModel):
    s2_cell_id = Utf8mb4CharField(primary_key=True, max_length=50)
    latitude = DoubleField()
    longitude = DoubleField()
    cloud_level = SmallIntegerField(null=True, index=True)
    rain_level = SmallIntegerField(null=True, index=True)
    wind_level = SmallIntegerField(null=True, index=True)
    snow_level = SmallIntegerField(null=True, index=True)
    fog_level = SmallIntegerField(null=True, index=True)
    wind_direction = SmallIntegerField(null=True, index=True)
    gameplay_weather = SmallIntegerField(null=True, index=True)
    severity = SmallIntegerField(null=True, index=True)
    warn_weather = SmallIntegerField(null=True, index=True)
    world_time = SmallIntegerField(null=True, index=True)
    last_updated = DateTimeField(default=datetime.utcnow,
                                 null=True, index=True)

    @staticmethod
    def get_weather_by_location(swLat, swLng, neLat, neLng, alert):
        # We can filter by the center of a cell,
        # this deltas can expand the viewport bounds
        # So cells with center outside the viewport,
        # but close to it can be rendered
        # otherwise edges of cells that intersects
        # with viewport won't be rendered
        lat_delta = 0.15
        lng_delta = 0.4
        if not alert:
            query = Weather.select().where((
                Weather.latitude >= float(swLat) - lat_delta) &
                (Weather.longitude >= float(swLng) - lng_delta) &
                (Weather.latitude <= float(neLat) + lat_delta) &
                (Weather.longitude <= float(neLng) + lng_delta)).dicts()
        else:
            query = Weather.select().where((
                Weather.latitude >= float(swLat) - lat_delta) &
                (Weather.longitude >= float(swLng) - lng_delta) &
                (Weather.latitude <= float(neLat) + lat_delta) &
                (Weather.longitude <= float(neLng) + lng_delta) &
                (Weather.severity.is_null(False))).dicts()
        weathers = []
        for w in query:
            weathers.append(w)

        return weathers


def clean_db_loop(args):
    # Run regular database cleanup once every minute.
    regular_cleanup_secs = 60
    # Run full database cleanup once every 10 minutes.
    full_cleanup_timer = default_timer()
    full_cleanup_secs = 600
    while True:
        try:
            db_cleanup_regular()

            # Check if it's time to run full database cleanup.
            now = default_timer()
            if now - full_cleanup_timer > full_cleanup_secs:
                # Remove old pokemon spawns.
                if args.db_cleanup_pokemon > 0:
                    db_clean_pokemons(args.db_cleanup_pokemon)

                # Remove old gym data.
                if args.db_cleanup_gym > 0:
                    db_clean_gyms(args.db_cleanup_gym)

                # Remove old and extinct spawnpoint data.
                if args.db_cleanup_spawnpoint > 0:
                    db_clean_spawnpoints(args.db_cleanup_spawnpoint)

                # Remove old pokestop and gym locations.
                if args.db_cleanup_forts > 0:
                    db_clean_forts(args.db_cleanup_forts)

                # Clean weather... only changes at full hours anyway...
                query = (Weather
                         .delete()
                         .where((Weather.last_updated <
                                 (datetime.utcnow() - timedelta(minutes=15)))))
                query.execute()

                log.info('Full database cleanup completed.')
                full_cleanup_timer = now

            time.sleep(regular_cleanup_secs)
        except Exception as e:
            log.exception('Database cleanup failed: %s.', e)


def db_cleanup_regular():
    log.debug('Regular database cleanup started.')
    start_timer = default_timer()

    now = datetime.utcnow()
    # http://docs.peewee-orm.com/en/latest/peewee/database.html#advanced-connection-management
    # When using an execution context, a separate connection from the pool
    # will be used inside the wrapped block and a transaction will be started.
    with Pokestop.database():
        # Remove active modifier from expired lured pokestops.
        query = (Pokestop
                 .update(lure_expiration=None, active_fort_modifier=None)
                 .where(Pokestop.lure_expiration < now))
        query.execute()

    time_diff = default_timer() - start_timer
    log.debug('Completed regular cleanup in %.6f seconds.', time_diff)


def db_clean_pokemons(age_hours):
    log.debug('Beginning cleanup of old pokemon spawns.')
    start_timer = default_timer()
    pokemon_timeout = datetime.utcnow() - timedelta(hours=age_hours)
    with Pokemon.database():
        query = (Pokemon
                 .delete()
                 .where(Pokemon.disappear_time < pokemon_timeout))
        rows = query.execute()
        log.debug('Deleted %d old Pokemon entries.', rows)

    time_diff = default_timer() - start_timer
    log.debug('Completed cleanup of old pokemon spawns in %.6f seconds.',
              time_diff)


def db_clean_gyms(age_hours, gyms_age_days=30):
    log.debug('Beginning cleanup of old gym data.')
    start_timer = default_timer()

    gym_info_timeout = datetime.utcnow() - timedelta(hours=age_hours)

    with Gym.database():
        # Remove old GymDetails entries.
        query = (GymDetails
                 .delete()
                 .where(GymDetails.last_scanned < gym_info_timeout))
        rows = query.execute()
        log.debug('Deleted %d old GymDetails entries.', rows)

        # Remove old Raid entries.
        query = (Raid
                 .delete()
                 .where(Raid.end < gym_info_timeout))
        rows = query.execute()
        log.debug('Deleted %d old Raid entries.', rows)

    time_diff = default_timer() - start_timer
    log.debug('Completed cleanup of old gym data in %.6f seconds.',
              time_diff)


def db_clean_spawnpoints(age_hours, missed=5):
    log.debug('Beginning cleanup of old spawnpoint data.')
    start_timer = default_timer()
    # Maximum number of variables to include in a single query.
    step = 500

    spawnpoint_timeout = datetime.utcnow() - timedelta(hours=age_hours)

    with SpawnPoint.database():
        # Select old SpawnPoint entries.
        query = (SpawnPoint
                 .select(SpawnPoint.id)
                 .where((SpawnPoint.last_scanned < spawnpoint_timeout) &
                        (SpawnPoint.missed_count > missed))
                 .dicts())
        old_sp = [(sp['id']) for sp in query]

        num_records = len(old_sp)
        log.debug('Found %d old SpawnPoint entries.', num_records)

        # Remove old and invalid SpawnPoint entries.
        num_rows = 0
        for i in range(0, num_records, step):
            query = (SpawnPoint
                     .delete()
                     .where((SpawnPoint.id <<
                             old_sp[i:min(i + step, num_records)])))
            num_rows += query.execute()
        log.debug('Deleted %d old SpawnPoint entries.', num_rows)

    time_diff = default_timer() - start_timer
    log.debug('Completed cleanup of old spawnpoint data in %.6f seconds.',
              time_diff)


def db_clean_forts(age_hours):
    log.debug('Beginning cleanup of old forts.')
    start_timer = default_timer()

    fort_timeout = datetime.utcnow() - timedelta(hours=age_hours)

    with Gym.database():
        # Remove old Gym entries.
        query = (Gym
                 .delete()
                 .where(Gym.last_scanned < fort_timeout))
        rows = query.execute()
        log.debug('Deleted %d old Gym entries.', rows)

        # Remove old Pokestop entries.
        query = (Pokestop
                 .delete()
                 .where(Pokestop.last_updated < fort_timeout))
        rows = query.execute()
        log.debug('Deleted %d old Pokestop entries.', rows)

    time_diff = default_timer() - start_timer
    log.debug('Completed cleanup of old forts in %.6f seconds.',
              time_diff)


def create_tables(db):
    tables = [Pokemon, Gym, GymDetails, Raid, Pokestop, Trs_Quest, SpawnPoint,
              ScannedLocation, Weather]
    with db:
        for table in tables:
            if not table.table_exists():
                log.info('Creating table: %s', table.__name__)
                db.create_tables([table], safe=True)
            else:
                log.debug('Skipping table %s, it already exists.',
                          table.__name__)


def drop_tables(db):
    tables = [Pokemon, Gym, GymDetails, Raid, Pokestop, SpawnPoint,
              ScannedLocation, Weather, Versions]
    with db:
        db.execute_sql('SET FOREIGN_KEY_CHECKS=0;')
        for table in tables:
            if table.table_exists():
                log.info('Dropping table: %s', table.__name__)
                db.drop_tables([table], safe=True)

        db.execute_sql('SET FOREIGN_KEY_CHECKS=1;')


def does_column_exist(db, table_name, column_name):
    columns = db.get_columns(table_name)

    return any(column.name == column_name for column in columns)


def verify_table_encoding(db):
    with db:
        cmd_sql = '''
            SELECT table_name FROM information_schema.tables WHERE
            table_collation != "utf8mb4_unicode_ci"
            AND table_schema = "%s";
            ''' % args.db_name
        change_tables = db.execute_sql(cmd_sql)

        cmd_sql = "SHOW tables;"
        tables = db.execute_sql(cmd_sql)

        if change_tables.rowcount > 0:
            log.info('Changing collation and charset on %s tables.',
                     change_tables.rowcount)

            if change_tables.rowcount == tables.rowcount:
                log.info('Changing whole database,' +
                         ' this might a take while.')

            db.execute_sql('SET FOREIGN_KEY_CHECKS=0;')
            for table in change_tables:
                log.debug('Changing collation and charset on table %s.',
                          table[0])
                cmd_sql = '''ALTER TABLE %s CONVERT TO CHARACTER SET utf8mb4
                            COLLATE utf8mb4_unicode_ci;''' % str(table[0])
                db.execute_sql(cmd_sql)
            db.execute_sql('SET FOREIGN_KEY_CHECKS=1;')


def verify_database_schema(db):
    if not Versions.table_exists():
        db.create_tables([Versions])

        if ScannedLocation.table_exists():
            # Versions table doesn't exist, but there are tables. This must
            # mean the user is coming from a database that existed before we
            # started tracking the schema version. Perform a full upgrade.
            Versions.insert({Versions.key: 'schema_version',
                             Versions.val: 0}).execute()
            database_migrate(db, 0)
        else:
            Versions.insert({Versions.key: 'schema_version',
                             Versions.val: db_schema_version}).execute()

    else:
        db_ver = Versions.get(Versions.key == 'schema_version').val

        if db_ver < db_schema_version:
            if not database_migrate(db, db_ver):
                log.error('Error migrating database')
                sys.exit(1)
        elif db_ver > db_schema_version:
            log.error('Your database version (%i) appears to be newer than '
                      'the code supports (%i).', db_ver, db_schema_version)
            log.error('Please upgrade your code base or drop all tables in '
                      'your database.')
            sys.exit(1)
    db.close()


def database_migrate(db, old_ver):
    # Update database schema version.
    Versions.update(val=db_schema_version).where(
        Versions.key == 'schema_version').execute()

    log.info('Detected database version %i, updating to %i...',
             old_ver, db_schema_version)

    # Perform migrations here.
    migrator = MySQLMigrator(db)

    if old_ver < 2:
        migrate(migrator.add_column('pokestop', 'encounter_id',
                                    Utf8mb4CharField(max_length=50,
                                                     null=True)))

    if old_ver < 3:
        migrate(
            migrator.add_column('pokestop', 'active_fort_modifier',
                                Utf8mb4CharField(max_length=50, null=True)),
            migrator.drop_column('pokestop', 'encounter_id'),
            migrator.drop_column('pokestop', 'active_pokemon_id')
        )

    if old_ver < 4:
        db.drop_tables([ScannedLocation])

    if old_ver < 5:
        # Some Pokemon were added before the 595 bug was "fixed".
        # Clean those up for a better UX.
        query = (Pokemon
                 .delete()
                 .where(Pokemon.disappear_time >
                        (datetime.utcnow() - timedelta(hours=24))))
        query.execute()

    if old_ver < 6:
        migrate(
            migrator.add_column('gym', 'last_scanned',
                                DateTimeField(null=True)),
        )

    if old_ver < 7:
        migrate(
            migrator.drop_column('gymdetails', 'description'),
            migrator.add_column('gymdetails', 'description',
                                TextField(null=True, default=""))
        )

    if old_ver < 8:
        migrate(
            migrator.add_column('pokemon', 'individual_attack',
                                IntegerField(null=True, default=0)),
            migrator.add_column('pokemon', 'individual_defense',
                                IntegerField(null=True, default=0)),
            migrator.add_column('pokemon', 'individual_stamina',
                                IntegerField(null=True, default=0)),
            migrator.add_column('pokemon', 'move_1',
                                IntegerField(null=True, default=0)),
            migrator.add_column('pokemon', 'move_2',
                                IntegerField(null=True, default=0))
        )

    if old_ver < 9:
        migrate(
            migrator.add_column('pokemon', 'last_modified',
                                DateTimeField(null=True, index=True)),
            migrator.add_column('pokestop', 'last_updated',
                                DateTimeField(null=True, index=True))
        )

    if old_ver < 10:
        # Information in ScannedLocation and Member Status is probably
        # out of date.  Drop and recreate with new schema.

        db.drop_tables([ScannedLocation])
        db.drop_tables([WorkerStatus])

    if old_ver < 11:

        db.drop_tables([ScanSpawnPoint])

    if old_ver < 13:

        db.drop_tables([WorkerStatus])
        db.drop_tables([MainWorker])

    if old_ver < 14:
        migrate(
            migrator.add_column('pokemon', 'weight',
                                DoubleField(null=True, default=0)),
            migrator.add_column('pokemon', 'height',
                                DoubleField(null=True, default=0)),
            migrator.add_column('pokemon', 'gender',
                                IntegerField(null=True, default=0))
        )

    if old_ver < 15:
        # we don't have to touch sqlite because it has REAL and INTEGER only
        db.execute_sql('ALTER TABLE `pokemon` '
                       'MODIFY COLUMN `weight` FLOAT NULL DEFAULT NULL,'
                       'MODIFY COLUMN `height` FLOAT NULL DEFAULT NULL,'
                       'MODIFY COLUMN `gender` SMALLINT NULL DEFAULT NULL'
                       ';')

    if old_ver < 16:
        log.info('This DB schema update can take some time. '
                 'Please be patient.')

        # change some column types from INT to SMALLINT
        # we don't have to touch sqlite because it has INTEGER only
        db.execute_sql(
            'ALTER TABLE `pokemon` '
            'MODIFY COLUMN `pokemon_id` SMALLINT NOT NULL,'
            'MODIFY COLUMN `individual_attack` SMALLINT '
            'NULL DEFAULT NULL,'
            'MODIFY COLUMN `individual_defense` SMALLINT '
            'NULL DEFAULT NULL,'
            'MODIFY COLUMN `individual_stamina` SMALLINT '
            'NULL DEFAULT NULL,'
            'MODIFY COLUMN `move_1` SMALLINT NULL DEFAULT NULL,'
            'MODIFY COLUMN `move_2` SMALLINT NULL DEFAULT NULL;'
        )
        db.execute_sql(
            'ALTER TABLE `gym` '
            'MODIFY COLUMN `team_id` SMALLINT NOT NULL,'
            'MODIFY COLUMN `guard_pokemon_id` SMALLINT NOT NULL;'
        )
        db.execute_sql(
            'ALTER TABLE `scannedlocation` '
            'MODIFY COLUMN `band1` SMALLINT NOT NULL,'
            'MODIFY COLUMN `band2` SMALLINT NOT NULL,'
            'MODIFY COLUMN `band3` SMALLINT NOT NULL,'
            'MODIFY COLUMN `band4` SMALLINT NOT NULL,'
            'MODIFY COLUMN `band5` SMALLINT NOT NULL,'
            'MODIFY COLUMN `midpoint` SMALLINT NOT NULL,'
            'MODIFY COLUMN `width` SMALLINT NOT NULL;'
        )
        db.execute_sql(
            'ALTER TABLE `spawnpoint` '
            'MODIFY COLUMN `latest_seen` SMALLINT NOT NULL,'
            'MODIFY COLUMN `earliest_unseen` SMALLINT NOT NULL;'
        )
        db.execute_sql(
            'ALTER TABLE `spawnpointdetectiondata` '
            'MODIFY COLUMN `tth_secs` SMALLINT NULL DEFAULT NULL;'
        )
        db.execute_sql(
            'ALTER TABLE `versions` '
            'MODIFY COLUMN `val` SMALLINT NOT NULL;'
        )
        db.execute_sql(
            'ALTER TABLE `gympokemon` '
            'MODIFY COLUMN `pokemon_id` SMALLINT NOT NULL,'
            'MODIFY COLUMN `cp` SMALLINT NOT NULL,'
            'MODIFY COLUMN `num_upgrades` SMALLINT NULL DEFAULT NULL,'
            'MODIFY COLUMN `move_1` SMALLINT NULL DEFAULT NULL,'
            'MODIFY COLUMN `move_2` SMALLINT NULL DEFAULT NULL,'
            'MODIFY COLUMN `stamina` SMALLINT NULL DEFAULT NULL,'
            'MODIFY COLUMN `stamina_max` SMALLINT NULL DEFAULT NULL,'
            'MODIFY COLUMN `iv_defense` SMALLINT NULL DEFAULT NULL,'
            'MODIFY COLUMN `iv_stamina` SMALLINT NULL DEFAULT NULL,'
            'MODIFY COLUMN `iv_attack` SMALLINT NULL DEFAULT NULL;'
        )
        db.execute_sql(
            'ALTER TABLE `trainer` '
            'MODIFY COLUMN `team` SMALLINT NOT NULL,'
            'MODIFY COLUMN `level` SMALLINT NOT NULL;'
        )

        # add some missing indexes
        migrate(
            migrator.add_index('gym', ('last_scanned',), False),
            migrator.add_index('gymmember', ('last_scanned',), False),
            migrator.add_index('gymmember', ('pokemon_uid',), False),
            migrator.add_index('gympokemon', ('trainer_name',), False),
            migrator.add_index('pokestop', ('active_fort_modifier',), False),
            migrator.add_index('spawnpointdetectiondata', ('spawnpoint_id',),
                               False),
            migrator.add_index('token', ('last_updated',), False)
        )
        # pokestop.last_updated was missing in a previous migration
        # check whether we have to add it
        has_last_updated_index = False
        for index in db.get_indexes('pokestop'):
            if index.columns[0] == 'last_updated':
                has_last_updated_index = True
                break
        if not has_last_updated_index:
            log.debug('pokestop.last_updated index is missing. Creating now.')
            migrate(
                migrator.add_index('pokestop', ('last_updated',), False)
            )

    if old_ver < 17:
        migrate(
            migrator.add_column('pokemon', 'form',
                                SmallIntegerField(null=True))
        )

    if old_ver < 18:
        migrate(
            migrator.add_column('pokemon', 'cp',
                                SmallIntegerField(null=True))
        )

    if old_ver < 19:
        migrate(
            migrator.add_column('pokemon', 'cp_multiplier',
                                FloatField(null=True))
        )

    if old_ver < 20:
        migrate(
            migrator.drop_column('gym', 'gym_points'),
            migrator.add_column('gym', 'slots_available',
                                SmallIntegerField(null=False, default=0)),
            migrator.add_column('gymmember', 'cp_decayed',
                                SmallIntegerField(null=False, default=0)),
            migrator.add_column('gymmember', 'deployment_time',
                                DateTimeField(
                                    null=False, default=datetime.utcnow())),
            migrator.add_column('gym', 'total_cp',
                                SmallIntegerField(null=False, default=0)))

    if old_ver < 21:
        migrate(
            migrator.add_column('pokemon', 'catch_prob_1',
                                DoubleField(null=True)),
            migrator.add_column('pokemon', 'catch_prob_2',
                                DoubleField(null=True)),
            migrator.add_column('pokemon', 'catch_prob_3',
                                DoubleField(null=True)),
            migrator.add_column('pokemon', 'rating_attack',
                                CharField(null=True, max_length=2)),
            migrator.add_column('pokemon', 'rating_defense',
                                CharField(null=True, max_length=2))
        )

    if old_ver < 22:
        migrate(
            migrator.add_column('gym', 'is_in_battle',
                                BooleanField(null=False, default=False)))

    if old_ver < 23:
        migrate(
            migrator.add_column('pokemon', 'weather_boosted_condition',
                                SmallIntegerField(null=True))
        )

    if old_ver < 24:
        migrate(
            migrator.add_column('pokemon', 'costume',
                                SmallIntegerField(null=True))
        )

    if old_ver < 25:
        migrate(
            migrator.add_column('gympokemon', 'gender',
                                SmallIntegerField(null=True)),
            migrator.add_column('gympokemon', 'form',
                                SmallIntegerField(null=True)),
            migrator.add_column('gympokemon', 'costume',
                                SmallIntegerField(null=True)),
            migrator.add_column('gympokemon', 'weather_boosted_condition',
                                SmallIntegerField(null=True)),
            migrator.add_column('gympokemon', 'shiny',
                                BooleanField(null=True)),
            migrator.add_column('gym', 'gender',
                                SmallIntegerField(null=True)),
            migrator.add_column('gym', 'form',
                                SmallIntegerField(null=True)),
            migrator.add_column('gym', 'costume',
                                SmallIntegerField(null=True)),
            migrator.add_column('gym', 'weather_boosted_condition',
                                SmallIntegerField(null=True)),
            migrator.add_column('gym', 'shiny',
                                BooleanField(null=True))
        )
    if old_ver < 26:
        # First rename all tables being modified.
        db.execute_sql('RENAME TABLE `pokemon` TO `pokemon_old`;')
        db.execute_sql(
            'RENAME TABLE `locationaltitude` TO `locationaltitude_old`;')
        db.execute_sql(
            'RENAME TABLE `scannedlocation` TO `scannedlocation_old`;')
        db.execute_sql('RENAME TABLE `spawnpoint` TO `spawnpoint_old`;')
        db.execute_sql('RENAME TABLE `spawnpointdetectiondata` TO ' +
                       '`spawnpointdetectiondata_old`;')
        db.execute_sql('RENAME TABLE `gymmember` TO `gymmember_old`;')
        db.execute_sql('RENAME TABLE `gympokemon` TO `gympokemon_old`;')
        db.execute_sql(
            'RENAME TABLE `scanspawnpoint`  TO `scanspawnpoint_old`;')
        # Then create all tables that we renamed with the proper fields.
        create_tables(db)
        # Insert data back with the correct format
        db.execute_sql(
            'INSERT INTO `pokemon` SELECT ' +
            'FROM_BASE64(encounter_id) as encounter_id, ' +
            'CONV(spawnpoint_id, 16,10) as spawnpoint_id, ' +
            'pokemon_id, latitude, longitude, disappear_time, ' +
            'individual_attack, individual_defense, individual_stamina, ' +
            'move_1, move_2, cp, cp_multiplier, weight, height, gender, ' +
            'form, costume, catch_prob_1, catch_prob_2, ' +
            'catch_prob_3, rating_attack, ' +
            'rating_defense, weather_boosted_condition ,last_modified ' +
            'FROM `pokemon_old`;')
        db.execute_sql(
            'INSERT INTO `locationaltitude` SELECT ' +
            'CONV(cellid, 16,10) as cellid, ' +
            'latitude, longitude, last_modified, altitude ' +
            'FROM `locationaltitude_old`;')
        db.execute_sql(
            'INSERT INTO `scannedlocation` SELECT ' +
            'CONV(cellid, 16,10) as cellid, ' +
            'latitude, longitude, last_modified, done, band1, band2, band3, ' +
            'band4, band5, midpoint, width ' +
            'FROM `scannedlocation_old`;')
        db.execute_sql(
            'INSERT INTO `spawnpoint` SELECT ' +
            'CONV(id, 16,10) as id, ' +
            'latitude, longitude, last_scanned, kind, links, missed_count, ' +
            'latest_seen, earliest_unseen ' +
            'FROM `spawnpoint_old`;')
        db.execute_sql(
            'INSERT INTO `spawnpointdetectiondata` ' +
            '(encounter_id, spawnpoint_id, scan_time, tth_secs) SELECT ' +
            'FROM_BASE64(encounter_id) as encounter_id, ' +
            'CONV(spawnpoint_id, 16,10) as spawnpoint_id, ' +
            'scan_time, tth_secs ' +
            'FROM `spawnpointdetectiondata_old`;')
        # A simple alter table does not work ¯\_(ツ)_/¯
        db.execute_sql(
            'INSERT INTO `gymmember` ' +
            'SELECT * FROM `gymmember_old`;')
        db.execute_sql(
            'INSERT INTO `gympokemon` ' +
            'SELECT pokemon_uid, pokemon_id, cp,trainer_name, ' +
            'num_upgrades ,move_1, move_2, height, weight, stamina,'
            'stamina_max, cp_multiplier, additional_cp_multiplier,' +
            'iv_defense, iv_stamina, iv_attack, gender, ' +
            'form,costume, weather_boosted_condition, shiny, last_seen ' +
            'FROM `gympokemon_old`;')
        db.execute_sql(
            'INSERT INTO `scanspawnpoint` SELECT ' +
            'CONV(scannedlocation_id, 16,10) as scannedlocation_id, ' +
            'CONV(spawnpoint_id, 16,10) as spawnpoint_id ' +
            'FROM `scanspawnpoint_old`;')
        db.execute_sql(
            'ALTER TABLE `pokestop` MODIFY active_fort_modifier SMALLINT(6);')
        # Drop all _old tables
        db.execute_sql('DROP TABLE `scanspawnpoint_old`;')
        db.execute_sql('DROP TABLE `pokemon_old`;')
        db.execute_sql('DROP TABLE `locationaltitude_old`;')
        db.execute_sql('DROP TABLE `spawnpointdetectiondata_old`;')
        db.execute_sql('DROP TABLE `scannedlocation_old`;')
        db.execute_sql('DROP TABLE `spawnpoint_old`;')
        db.execute_sql('DROP TABLE `gymmember_old`;')
        db.execute_sql('DROP TABLE `gympokemon_old`;')

    if old_ver < 27:
        migrate(
            migrator.drop_index('pokemon', 'pokemon_disappear_time'),
            migrator.add_index('pokemon',
                               ('disappear_time', 'pokemon_id'), False)
        )

    if old_ver < 28:
        db.drop_tables([WorkerStatus])
        db.drop_tables([MainWorker])

    if old_ver < 29:
        # Drop and add CONSTRAINT_2 with the <= fix.
        db.execute_sql('ALTER TABLE `spawnpoint` '
                       'DROP CONSTRAINT CONSTRAINT_2;')
        db.execute_sql('ALTER TABLE `spawnpoint` '
                       'ADD CONSTRAINT CONSTRAINT_2 ' +
                       'CHECK (`earliest_unseen` <= 3600);')

        # Drop and add CONSTRAINT_4 with the <= fix.
        db.execute_sql('ALTER TABLE `spawnpoint` '
                       'DROP CONSTRAINT CONSTRAINT_4;')
        db.execute_sql('ALTER TABLE `spawnpoint` '
                       'ADD CONSTRAINT CONSTRAINT_4 CHECK ' +
                       '(`latest_seen` <= 3600);')

    if old_ver < 30:
        # Column might already exist if created by MAD.
        if not does_column_exist(db, 'gym', 'is_ex_raid_eligible'):
            migrate(
                migrator.add_column(
                    'gym',
                    'is_ex_raid_eligible',
                    BooleanField(null=False, default=0)
                )
            )

    if old_ver < 31:
        # Column might already exist if created by MAD.
        if not does_column_exist(db, 'raid', 'form'):
            migrate(
                migrator.add_column(
                    'raid',
                    'form',
                    SmallIntegerField(null=True)
                )
            )

        # Column might already exist if created by MAD.
        if not does_column_exist(db, 'raid', 'is_exclusive'):
            migrate(
                migrator.add_column(
                    'raid',
                    'is_exclusive',
                    BooleanField(null=True)
                )
            )

    if old_ver < 32:
        # Column might already exist if created by MAD.
        if not does_column_exist(db, 'raid', 'gender'):
            migrate(
                migrator.add_column(
                    'raid',
                    'gender',
                    SmallIntegerField(null=True)
                )
            )

    if old_ver < 33:
        # Don't use drop_tables() because model classes have been removed.
        db.execute_sql('DROP TABLE `locationaltitude`;')
        db.execute_sql('DROP TABLE `playerlocale`;')
        db.execute_sql('DROP TABLE `mainworker`;')
        db.execute_sql('DROP TABLE `workerstatus`;')
        db.execute_sql('DROP TABLE `scanspawnpoint`;')
        db.execute_sql('DROP TABLE `spawnpointdetectiondata`;')
        db.execute_sql('DROP TABLE `gymmember`;')
        db.execute_sql('DROP TABLE `gympokemon`;')
        db.execute_sql('DROP TABLE `trainer`;')
        db.execute_sql('DROP TABLE `token`;')
        db.execute_sql('DROP TABLE `hashkeys`;')

    if old_ver < 34:
        # Column might already exist if created by MAD.
        if not does_column_exist(db, 'pokestop', 'incident_start'):
            migrate(
                migrator.add_column(
                    'pokestop',
                    'incident_start',
                    DateTimeField(null=True)
                )
            )

        # Column might already exist if created by MAD.
        if not does_column_exist(db, 'pokestop', 'incident_expiration'):
            migrate(
                migrator.add_column(
                    'pokestop',
                    'incident_expiration',
                    DateTimeField(null=True)
                )
            )

    if old_ver < 35:
        # Column might already exist if created by MAD.
        if not does_column_exist(db, 'pokestop', 'incident_grunt_type'):
            migrate(
                migrator.add_column(
                    'pokestop',
                    'incident_grunt_type',
                    SmallIntegerField(null=True)
                )
            )
    # Always log that we're done.
    log.info('Schema upgrade complete.')
    return True
