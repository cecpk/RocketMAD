#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import gc
import itertools
import logging
import os
import sys
import time

from datetime import datetime, timedelta
from flask_sqlalchemy import SQLAlchemy
from functools import reduce
from peewee import (Check, SQL, SmallIntegerField, IntegerField, CharField,
                    DoubleField, BooleanField, DateTimeField, fn, FloatField,
                    TextField, BigIntegerField, JOIN, OperationalError,
                    __exception_wrapper__, Model, DatabaseProxy)
from playhouse.flask_utils import FlaskDB
from playhouse.migrate import migrate, MySQLMigrator
from playhouse.pool import PooledMySQLDatabase
from sqlalchemy import func, Index
from sqlalchemy.dialects.mysql import BIGINT, DOUBLE, LONGTEXT, TINYINT
from sqlalchemy.orm import Load, load_only
from sqlalchemy.sql.expression import and_
from timeit import default_timer

from .transform import transform_from_wgs_to_gcj
from .utils import (get_pokemon_name, get_pokemon_types, get_args, cellid,
                    get_utc_timedelta)

log = logging.getLogger(__name__)
args = get_args()

db = SQLAlchemy()

_db = PooledMySQLDatabase(
    args.db_name,
    user=args.db_user,
    password=args.db_pass,
    host=args.db_host,
    port=args.db_port,
    stale_timeout=30,
    max_connections=None,
    charset='utf8mb4'
)

db_schema_version = 0


# Reduction of CharField to fit max length inside 767 bytes for utf8mb4 charset
class Utf8mb4CharField(CharField):
    def __init__(self, max_length=191, *args, **kwargs):
        self.max_length = max_length
        super(CharField, self).__init__(*args, **kwargs)


class TinyIntegerField(IntegerField):
    field_type = 'tinyint'


class UBigIntegerField(BigIntegerField):
    field_type = 'bigint unsigned'


class BaseModel(Model):

    class Meta:
        database = db

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


class Pokemon(db.Model):
    encounter_id = db.Column(BIGINT(unsigned=True), primary_key=True)
    spawnpoint_id = db.Column(BIGINT(unsigned=True), nullable=False)
    pokemon_id = db.Column(db.SmallInteger, nullable=False)
    latitude = db.Column(DOUBLE(asdecimal=False), nullable=False)
    longitude = db.Column(DOUBLE(asdecimal=False), nullable=False)
    disappear_time = db.Column(db.DateTime, nullable=False)
    individual_attack = db.Column(db.SmallInteger)
    individual_defense = db.Column(db.SmallInteger)
    individual_stamina = db.Column(db.SmallInteger)
    move_1 = db.Column(db.SmallInteger)
    move_2 = db.Column(db.SmallInteger)
    cp = db.Column(db.SmallInteger)
    cp_multiplier = db.Column(db.Float)
    weight = db.Column(db.Float)
    height = db.Column(db.Float)
    gender = db.Column(db.SmallInteger)
    form = db.Column(db.SmallInteger)
    costume = db.Column(db.SmallInteger)
    catch_prob_1 = db.Column(DOUBLE)
    catch_prob_2 = db.Column(DOUBLE)
    catch_prob_3 = db.Column(DOUBLE)
    rating_attack = db.Column(
        db.String(length=2, collation='utf8mb4_unicode_ci'))
    rating_defense = db.Column(
        db.String(length=2, collation='utf8mb4_unicode_ci'))
    weather_boosted_condition = db.Column(db.SmallInteger)
    last_modified = db.Column(db.DateTime)

    __table_args__ = (
        Index('pokemon_spawnpoint_id', 'spawnpoint_id'),
        Index('pokemon_pokemon_id', 'pokemon_id'),
        Index('pokemon_last_modified', 'last_modified'),
        Index('pokemon_latitude_longitude', 'latitude', 'longitude'),
        Index('pokemon_disappear_time_pokemon_id', 'disappear_time',
              'pokemon_id')
    )

    @staticmethod
    def get_active(swLat, swLng, neLat, neLng, oSwLat=None, oSwLng=None,
                   oNeLat=None, oNeLng=None, timestamp=0, eids=None, ids=None,
                   verified_despawn_time=False):
        columns = [
            'encounter_id', 'pokemon_id', 'latitude', 'longitude',
            'disappear_time', 'individual_attack', 'individual_defense',
            'individual_stamina', 'move_1', 'move_2', 'cp', 'cp_multiplier',
            'weight', 'height', 'gender', 'form', 'costume',
            'weather_boosted_condition', 'last_modified'
        ]

        if verified_despawn_time:
            query = (
                db.session.query(Pokemon, TrsSpawn)
                .outerjoin(TrsSpawn,
                           Pokemon.spawnpoint_id == TrsSpawn.spawnpoint)
                .options(
                    Load(Pokemon).load_only(*columns),
                    Load(TrsSpawn).load_only('calc_endminsec'))
            )
        else:
            query = Pokemon.query.options(load_only(*columns))

        if eids:
            query = query.filter(Pokemon.pokemon_id.notin_(eids))
        elif ids:
            query = query.filter(Pokemon.pokemon_id.in_(ids))

        if not (swLat and swLng and neLat and neLng):
            query = query.filter(Pokemon.disappear_time > datetime.utcnow())
        elif timestamp > 0:
            # If timestamp is known only load modified Pokémon.
            query = query.filter(
                Pokemon.last_modified > datetime.utcfromtimestamp(
                    timestamp / 1000),
                Pokemon.disappear_time > datetime.utcnow(),
                Pokemon.latitude >= swLat,
                Pokemon.longitude >= swLng,
                Pokemon.latitude <= neLat,
                Pokemon.longitude <= neLng
            )
        elif oSwLat and oSwLng and oNeLat and oNeLng:
            # Send Pokémon in view but exclude those within old boundaries.
            # Only send newly uncovered Pokemon.
            query = query.filter(
                Pokemon.disappear_time > datetime.utcnow(),
                Pokemon.latitude >= swLat,
                Pokemon.longitude >= swLng,
                Pokemon.latitude <= neLat,
                Pokemon.longitude <= neLng,
                ~and_(
                    Pokemon.latitude >= oSwLat,
                    Pokemon.longitude >= oSwLng,
                    Pokemon.latitude <= oNeLat,
                    Pokemon.longitude <= oNeLng
                )
            )
        else:
            query = query.filter(
                Pokemon.disappear_time > datetime.utcnow(),
                Pokemon.latitude >= swLat,
                Pokemon.longitude >= swLng,
                Pokemon.latitude <= neLat,
                Pokemon.longitude <= neLng
            )

        result = query.all()
        if verified_despawn_time:
            pokemons = []
            for r in result:
                pokemon = r[0]
                spawnpoint = r[1]
                pokemon.verified_disappear_time = spawnpoint.calc_endminsec
                pokemons.append(orm_to_dict(pokemon))
        else:
            pokemons = orm_to_dict(result)

        return pokemons

    # Get all Pokémon spawn counts based on the last x hours.
    # More efficient than get_seen(): we don't do any unnecessary mojo.
    # Returns a dict:
    #   { 'pokemon': [ (1, 2), (2, 3) ], 'total': 5 }.
    @staticmethod
    def get_spawn_counts(hours):
        query = Pokemon.query.with_entities(
            Pokemon.pokemon_id, func.count(Pokemon.pokemon_id))

        # Allow 0 to query everything.
        if hours:
            hours = datetime.utcnow() - timedelta(hours=hours)
            query = query.filter(Pokemon.disappear_time > hours)

        result = query.group_by(Pokemon.pokemon_id).all()

        total = sum(count for id, count in result)

        return {'pokemon': result, 'total': total}

    @staticmethod
    def get_seen(timediff=0):
        if timediff:
            timediff = datetime.utcnow() - timedelta(hours=timediff)

        query = (
            db.session.query(Pokemon, func.count(Pokemon.pokemon_id),
                             func.max(Pokemon.disappear_time))
            .options(load_only('pokemon_id', 'form'))
            .filter(Pokemon.disappear_time > timediff)
            .group_by(Pokemon.pokemon_id, Pokemon.form)
        )

        result = query.all()
        pokemon = []
        total = 0
        for p in result:
            poke = p[0]
            count = p[1]
            disappear_time = p[2]
            poke.count = count
            poke.disappear_time = disappear_time
            pokemon.append(orm_to_dict(poke))
            total += count

        return { 'pokemon': pokemon, 'total': total }

    @staticmethod
    def get_appearances(pokemon_id, form_id=None, timediff=0):
        '''
        :param pokemon_id: id of Pokémon that we need appearances for
        :param form_id: id of form that we need appearances for
        :param timediff: limiting period of the selection
        :return: list of Pokémon appearances over a selected period
        '''
        if timediff:
            timediff = datetime.utcnow() - timedelta(hours=timediff)

        columns = ['latitude', 'longitude', 'pokemon_id', 'form',
                   'spawnpoint_id']
        query = (
            db.session.query(Pokemon, func.count(Pokemon.pokemon_id))
            .options(load_only(*columns))
            .filter(
                Pokemon.pokemon_id == pokemon_id,
                Pokemon.disappear_time > timediff
            )
        )
        if form_id is not None:
            query = query.filter(Pokemon.form == form_id)
        query = query.group_by(
            Pokemon.latitude, Pokemon.longitude, Pokemon.pokemon_id,
            Pokemon.form, Pokemon.spawnpoint_id
        )

        result = query.all()
        appearances = []
        for r in result:
            pokemon = r[0]
            count = r[1]
            pokemon.count = count
            appearances.append(orm_to_dict(pokemon))

        return appearances

    @staticmethod
    def get_appearances_times_by_spawnpoint(pokemon_id, spawnpoint_id,
                                            form_id=None, timediff=0):
        '''
        :param pokemon_id: id of Pokemon that we need appearances times for.
        :param spawnpoint_id: spawnpoint id we need appearances times for.
        :param timediff: limiting period of the selection.
        :return: list of time appearances over a selected period.
        '''
        if timediff:
            timediff = datetime.utcnow() - timedelta(hours=timediff)

        query = (
            Pokemon.query.with_entities(Pokemon.disappear_time)
            .filter(
                Pokemon.pokemon_id == pokemon_id,
                Pokemon.spawnpoint_id == spawnpoint_id,
                Pokemon.disappear_time > timediff
            )
        )
        if form_id is not None:
            query = query.filter_by(form = form_id)
        query = query.order_by(Pokemon.disappear_time)

        result = query.all()
        appearances = [a[0] for a in result]

        return appearances


class Gym(db.Model):
    gym_id = db.Column(
        db.String(length=50, collation='utf8mb4_unicode_ci'), primary_key=True)
    team_id = db.Column(db.SmallInteger, default=0, nullable=False)
    guard_pokemon_id = db.Column(db.SmallInteger, default=0, nullable=False)
    slots_available = db.Column(db.SmallInteger, default=6, nullable=False)
    enabled = db.Column(TINYINT, default=1, nullable=False)
    latitude = db.Column(DOUBLE(asdecimal=False), nullable=False)
    longitude = db.Column(DOUBLE(asdecimal=False), nullable=False)
    total_cp = db.Column(db.SmallInteger, default=0, nullable=False)
    is_in_battle = db.Column(TINYINT, default=0, nullable=False)
    gender = db.Column(db.SmallInteger)
    form = db.Column(db.SmallInteger)
    costume = db.Column(db.SmallInteger)
    weather_boosted_condition = db.Column(db.SmallInteger)
    shiny = db.Column(TINYINT)
    last_modified = db.Column(
        db.DateTime, default=datetime.utcnow(), nullable=False)
    last_scanned = db.Column(
        db.DateTime, default=datetime.utcnow(), nullable=False)
    is_ex_raid_eligible = db.Column(TINYINT, default=0, nullable=False)

    gym_details = db.relationship(
        'GymDetails', uselist=False, backref='gym', lazy='joined',
        cascade='delete')

    __table_args__ = (
        Index('gym_last_modified', 'last_modified'),
        Index('gym_last_scanned', 'last_scanned'),
        Index('gym_latitude_longitude', 'latitude', 'longitude')
    )

    @staticmethod
    def get_gyms(swLat, swLng, neLat, neLng, oSwLat=None, oSwLng=None,
                 oNeLat=None, oNeLng=None, timestamp=0, raids=True):
        if raids:
            query = (
                db.session.query(Gym, Raid)
                .outerjoin(Raid, Gym.gym_id == Raid.gym_id)
            )
        else:
            query = Gym.query

        if not (swLat and swLng and neLat and neLng):
            pass
        elif timestamp > 0:
            # If timestamp is known only send last scanned Gyms.
            query = query.filter(
                Gym.last_scanned > datetime.utcfromtimestamp(timestamp / 1000),
                Gym.latitude >= swLat,
                Gym.longitude >= swLng,
                Gym.latitude <= neLat,
                Gym.longitude <= neLng
            )
        elif oSwLat and oSwLng and oNeLat and oNeLng:
            # Send gyms in view but exclude those within old boundaries.
            # Only send newly uncovered gyms.
            query = query.filter(
                Gym.latitude >= swLat,
                Gym.longitude >= swLng,
                Gym.latitude <= neLat,
                Gym.longitude <= neLng,
                ~and_(
                    Gym.latitude >= oSwLat,
                    Gym.longitude >= oSwLng,
                    Gym.latitude <= oNeLat,
                    Gym.longitude <= oNeLng
                )
            )
        else:
            query = query.filter(
                Gym.latitude >= swLat,
                Gym.longitude >= swLng,
                Gym.latitude <= neLat,
                Gym.longitude <= neLng
            )

        result = query.all()
        gyms = {}
        for r in result:
            if raids:
                gym = r[0]
                raid = r[1]
            else:
                gym = r
                raid = None
            gym.name = gym.gym_details.name
            gym.url = gym.gym_details.url
            del gym.gym_details
            if raid is not None:
                gym.raid = orm_to_dict(raid)
            else:
                gym.raid = None
            gyms[gym.gym_id] = orm_to_dict(gym)

        return gyms


class GymDetails(db.Model):
    __tablename__ = 'gymdetails'

    gym_id = db.Column(
        db.String(length=50, collation='utf8mb4_unicode_ci'),
        db.ForeignKey('gym.gym_id', name='fk_gd_gym_id'), primary_key=True)
    name = db.Column(
        db.String(length=191, collation='utf8mb4_unicode_ci'), nullable=False)
    description = db.Column(LONGTEXT(collation='utf8mb4_unicode_ci'))
    url = db.Column(
        db.String(length=191, collation='utf8mb4_unicode_ci'), nullable=False)
    last_scanned = db.Column(
        db.DateTime, default=datetime.utcnow(), nullable=False)


class Raid(db.Model):
    gym_id = db.Column(
        db.String(length=50, collation='utf8mb4_unicode_ci'), primary_key=True)
    level = db.Column(db.Integer, nullable=False)
    spawn = db.Column(db.DateTime, nullable=False)
    start = db.Column(db.DateTime, nullable=False)
    end = db.Column(db.DateTime, nullable=False)
    pokemon_id = db.Column(db.SmallInteger)
    cp = db.Column(db.Integer)
    move_1 = db.Column(db.SmallInteger)
    move_2 = db.Column(db.SmallInteger)
    last_scanned = db.Column(db.DateTime, nullable=False)
    form = db.Column(db.SmallInteger)
    is_exclusive = db.Column(TINYINT)
    gender = db.Column(TINYINT)
    costume = db.Column(TINYINT)

    __table_args__ = (
        Index('raid_level', 'level'),
        Index('raid_spawn', 'spawn'),
        Index('raid_start', 'start'),
        Index('raid_end', 'end'),
        Index('raid_last_scanned', 'last_scanned')
    )

class TrsSpawn(db.Model):
    spawnpoint = db.Column(
        db.String(length=16, collation='utf8mb4_unicode_ci'), primary_key=True)
    latitude = db.Column(DOUBLE(asdecimal=False), nullable=False)
    longitude = db.Column(DOUBLE(asdecimal=False), nullable=False)
    spawndef = db.Column(db.Integer, default=240, nullable=False)
    earliest_unseen = db.Column(db.Integer, nullable=False)
    last_scanned = db.Column(db.DateTime)
    first_detection = db.Column(
        db.DateTime, default=datetime.utcnow(), nullable=False)
    last_non_scanned = db.Column(db.DateTime)
    calc_endminsec = db.Column(
        db.String(length=5, collation='utf8mb4_unicode_ci'))
    eventid = db.Column(db.Integer, default=1, nullable=False)

    __table_args__ = (
        Index('spawnpoint_2', 'spawnpoint', unique=True),
        Index('spawnpoint', 'spawnpoint')
    )


class PokemonOld(LatLongModel):
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
    def get_active(swLat, swLng, neLat, neLng, oSwLat=None, oSwLng=None,
                   oNeLat=None, oNeLng=None, timestamp=0, eids=None, ids=None,
                   verified_despawn_time=False):
        now_utc = datetime.utcnow()

        if verified_despawn_time:
            query = (Pokemon
                     .select(Pokemon.encounter_id, Pokemon.pokemon_id,
                             Pokemon.latitude, Pokemon.longitude,
                             Pokemon.disappear_time, Pokemon.individual_attack,
                             Pokemon.individual_defense,
                             Pokemon.individual_stamina, Pokemon.move_1,
                             Pokemon.move_2, Pokemon.cp, Pokemon.cp_multiplier,
                             Pokemon.weight, Pokemon.height, Pokemon.gender,
                             Pokemon.form, Pokemon.costume,
                             Pokemon.weather_boosted_condition,
                             Pokemon.last_modified,
                             Trs_Spawn.calc_endminsec.alias(
                                 'verified_disappear_time'))
                     .join(Trs_Spawn, JOIN.LEFT_OUTER,
                           on=(Pokemon.spawnpoint_id == Trs_Spawn.spawnpoint)))
        else:
            query = (Pokemon
                     .select(Pokemon.encounter_id, Pokemon.pokemon_id,
                             Pokemon.latitude, Pokemon.longitude,
                             Pokemon.disappear_time, Pokemon.individual_attack,
                             Pokemon.individual_defense,
                             Pokemon.individual_stamina, Pokemon.move_1,
                             Pokemon.move_2, Pokemon.cp, Pokemon.cp_multiplier,
                             Pokemon.weight, Pokemon.height, Pokemon.gender,
                             Pokemon.form, Pokemon.costume,
                             Pokemon.weather_boosted_condition,
                             Pokemon.last_modified))

        if eids is not None:
            query = query.where(Pokemon.pokemon_id.not_in(eids))
        elif ids is not None:
            query = query.where(Pokemon.pokemon_id.in_(ids))

        if not (swLat and swLng and neLat and neLng):
            query = query.where(Pokemon.disappear_time > now_utc)
        elif timestamp > 0:
            # If timestamp is known only load modified Pokemon.
            query = (query
                     .where(((Pokemon.last_modified >
                              datetime.utcfromtimestamp(timestamp / 1000)) &
                             (Pokemon.disappear_time > now_utc)) &
                            ((Pokemon.latitude >= swLat) &
                             (Pokemon.longitude >= swLng) &
                             (Pokemon.latitude <= neLat) &
                             (Pokemon.longitude <= neLng))))
        elif oSwLat and oSwLng and oNeLat and oNeLng:
            # Send Pokemon in view but exclude those within old boundaries.
            # Only send newly uncovered Pokemon.
            query = (query
                     .where((Pokemon.disappear_time > now_utc) &
                            ((Pokemon.latitude >= swLat) &
                             (Pokemon.longitude >= swLng) &
                             (Pokemon.latitude <= neLat) &
                             (Pokemon.longitude <= neLng)) & ~
                            ((Pokemon.latitude >= oSwLat) &
                             (Pokemon.longitude >= oSwLng) &
                             (Pokemon.latitude <= oNeLat) &
                             (Pokemon.longitude <= oNeLng))))
        else:
            query = (query
                     .where((Pokemon.disappear_time > now_utc) &
                            (((Pokemon.latitude >= swLat) &
                              (Pokemon.longitude >= swLng) &
                              (Pokemon.latitude <= neLat) &
                              (Pokemon.longitude <= neLng)))))

        return list(query.dicts())

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
    def get_seen(timediff):
        if timediff:
            timediff = datetime.utcnow() - timedelta(hours=timediff)

        # Note: pokemon_id+0 forces SQL to ignore the pokemon_id index
        # and should use the disappear_time index and hopefully
        # improve performance
        query = (Pokemon
                 .select((Pokemon.pokemon_id + 0).alias('pokemon_id'),
                         Pokemon.form,
                         fn.COUNT((Pokemon.pokemon_id + 0)).alias('count'),
                         fn.MAX(Pokemon.disappear_time).alias(
                             'disappear_time'))
                 .where(Pokemon.disappear_time > timediff)
                 .group_by((Pokemon.pokemon_id + 0), Pokemon.form)
                 .dicts())

        # Performance: disable the garbage collector prior to creating a
        # (potentially) large dict with append().
        gc.disable()

        pokemon = []
        total = 0
        for p in query:
            pokemon.append(p)
            total += p['count']

        gc.enable()

        return { 'pokemon': pokemon, 'total': total }

    @staticmethod
    def get_appearances(pokemon_id, form_id, timediff):
        '''
        :param pokemon_id: id of Pokemon that we need appearances for
        :param timediff: limiting period of the selection
        :return: list of Pokemon appearances over a selected period
        '''
        if timediff:
            timediff = datetime.utcnow() - timedelta(hours=timediff)
        query = (Pokemon
                 .select(Pokemon.latitude, Pokemon.longitude,
                         Pokemon.pokemon_id, Pokemon.form,
                         fn.Count(Pokemon.spawnpoint_id).alias('count'),
                         Pokemon.spawnpoint_id)
                 .where((Pokemon.pokemon_id == pokemon_id) &
                        (Pokemon.form == form_id) &
                        (Pokemon.disappear_time > timediff))
                 .group_by(Pokemon.latitude, Pokemon.longitude,
                           Pokemon.pokemon_id, Pokemon.form,
                           Pokemon.spawnpoint_id)
                 .dicts())

        return list(query)

    @staticmethod
    def get_appearances_times_by_spawnpoint(pokemon_id, form_id, spawnpoint_id,
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
                        (Pokemon.form == form_id) &
                        (Pokemon.spawnpoint_id == spawnpoint_id) &
                        (Pokemon.disappear_time > timediff))
                 .order_by(Pokemon.disappear_time.asc())
                 .tuples())

        return list(itertools.chain(*query))


class GymOld(LatLongModel):
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
    def get_gyms(swLat, swLng, neLat, neLng, oSwLat=None, oSwLng=None,
                 oNeLat=None, oNeLng=None, timestamp=0, raids=True):
        if not (swLat and swLng and neLat and neLng):
            query = Gym.select()
        elif timestamp > 0:
            # If timestamp is known only send last scanned Gyms.
            query = (Gym
                     .select()
                     .where(((Gym.last_scanned >
                              datetime.utcfromtimestamp(timestamp / 1000)) &
                             (Gym.latitude >= swLat) &
                             (Gym.longitude >= swLng) &
                             (Gym.latitude <= neLat) &
                             (Gym.longitude <= neLng))))
        elif oSwLat and oSwLng and oNeLat and oNeLng:
            # Send gyms in view but exclude those within old boundaries. Only
            # send newly uncovered gyms.
            query = (Gym
                     .select()
                     .where(((Gym.latitude >= swLat) &
                             (Gym.longitude >= swLng) &
                             (Gym.latitude <= neLat) &
                             (Gym.longitude <= neLng)) & ~
                            ((Gym.latitude >= oSwLat) &
                             (Gym.longitude >= oSwLng) &
                             (Gym.latitude <= oNeLat) &
                             (Gym.longitude <= oNeLng))))

        else:
            query = (Gym
                     .select()
                     .where((Gym.latitude >= swLat) &
                            (Gym.longitude >= swLng) &
                            (Gym.latitude <= neLat) &
                            (Gym.longitude <= neLng)))

        # Performance:  disable the garbage collector prior to creating a
        # (potentially) large dict with append().
        gc.disable()

        gyms = {}
        gym_ids = []
        for g in query.dicts():
            g['name'] = None
            g['url'] = None
            g['pokemon'] = []
            g['raid'] = None
            gyms[g['gym_id']] = g
            gym_ids.append(g['gym_id'])

        if len(gym_ids) > 0:
            details_query = (GymDetails
                             .select(GymDetails.gym_id, GymDetails.name,
                                     GymDetails.url)
                             .where(GymDetails.gym_id << gym_ids)
                             .dicts())

            for d in details_query:
                gyms[d['gym_id']]['name'] = d['name']
                gyms[d['gym_id']]['url'] = d['url']

            if raids:
                raids_query = (Raid
                               .select()
                               .where((Raid.gym_id << gym_ids) &
                                      (Raid.end > datetime.utcnow()))
                               .dicts())

                for r in raids_query:
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


class RaidOld(BaseModel):
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
    costume = SmallIntegerField(null=True)


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
                  oSwLng=None, oNeLat=None, oNeLng=None,
                  pokestopsNoEvent=False, quests=False, invasions=False,
                  lures=False):
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

                if not pokestopsNoEvent:
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
                            expression |= (Pokestop.incident_start
                                                   .is_null(False))
                    if lures:
                        if expression is None:
                            expression = (Pokestop.active_fort_modifier
                                                  .is_null(False))
                        else:
                            expression |= (Pokestop.active_fort_modifier
                                                   .is_null(False))

                    if expression is not None:
                        query = query.where(expression)
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
            today = datetime.today().replace(hour=0, minute=0, second=0, microsecond=0)  # Local time.
            today_timestamp = datetime.timestamp(today)
            quests = (Trs_Quest
                      .select(Trs_Quest.GUID.alias('pokestop_id'),
                              Trs_Quest.quest_timestamp.alias('timestamp'),
                              Trs_Quest.quest_task.alias('task'),
                              Trs_Quest.quest_type.alias('type'),
                              Trs_Quest.quest_stardust.alias('stardust'),
                              Trs_Quest.quest_pokemon_id.alias('pokemon_id'),
                              Trs_Quest.quest_pokemon_form_id.alias('form_id'),
                              Trs_Quest.quest_pokemon_costume_id.alias(
                                  'costume_id'),
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


class Trs_Quest(BaseModel):
    GUID = Utf8mb4CharField(primary_key=True, max_length=50, index=True)
    quest_condition = Utf8mb4CharField(max_length=500, null=True)
    quest_reward = Utf8mb4CharField(max_length=1000, null=True)
    quest_task = Utf8mb4CharField(max_length=150, null=True)
    quest_type = TinyIntegerField()
    quest_stardust = SmallIntegerField()
    quest_pokemon_id = SmallIntegerField()
    quest_pokemon_form_id = SmallIntegerField()
    quest_pokemon_costume_id = SmallIntegerField()
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
                             (ScannedLocation.longitude <= neLng)) & ~
                            (((ScannedLocation.last_modified >= activeTime)) &
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


class Trs_SpawnOld(LatLongModel):
    spawnpoint = Utf8mb4CharField(primary_key=True, max_length=16, index=True)
    latitude = DoubleField()
    longitude = DoubleField()
    spawndef = IntegerField(default=240)
    earliest_unseen = IntegerField()
    last_scanned = DateTimeField(null=True)
    first_detection = DateTimeField(
        constraints=[SQL('DEFAULT CURRENT_TIMESTAMP')])
    last_non_scanned = DateTimeField(null=True)
    calc_endminsec = Utf8mb4CharField(max_length=5, null=True)

    @staticmethod
    def get_spawnpoints(swLat, swLng, neLat, neLng, timestamp=0,
                        oSwLat=None, oSwLng=None, oNeLat=None, oNeLng=None):
        query = (Trs_Spawn
                 .select(Trs_Spawn.latitude, Trs_Spawn.longitude,
                         Trs_Spawn.spawnpoint.alias('spawnpoint_id'),
                         Trs_Spawn.spawndef, Trs_Spawn.first_detection,
                         Trs_Spawn.last_non_scanned, Trs_Spawn.last_scanned,
                         Trs_Spawn.calc_endminsec.alias('end_time')))

        if not (swLat and swLng and neLat and neLng):
            pass
        elif timestamp > 0:
            query = (query
                     .where(((Trs_Spawn.last_scanned >
                              datetime.fromtimestamp(timestamp / 1000)) |
                             (Trs_Spawn.last_non_scanned >
                              datetime.fromtimestamp(timestamp / 1000))) &
                            ((Trs_Spawn.latitude >= swLat) &
                             (Trs_Spawn.longitude >= swLng) &
                             (Trs_Spawn.latitude <= neLat) &
                             (Trs_Spawn.longitude <= neLng))))
        elif oSwLat and oSwLng and oNeLat and oNeLng:
            # Send spawnpoints in view but exclude those within old
            # boundaries. Only send newly uncovered spawnpoints.
            query = (query
                     .where((((Trs_Spawn.latitude >= swLat) &
                              (Trs_Spawn.longitude >= swLng) &
                              (Trs_Spawn.latitude <= neLat) &
                              (Trs_Spawn.longitude <= neLng))) & ~
                            ((Trs_Spawn.latitude >= oSwLat) &
                             (Trs_Spawn.longitude >= oSwLng) &
                             (Trs_Spawn.latitude <= oNeLat) &
                             (Trs_Spawn.longitude <= oNeLng))))
        else:
            query = (query
                     .where((Trs_Spawn.latitude <= neLat) &
                            (Trs_Spawn.latitude >= swLat) &
                            (Trs_Spawn.longitude >= swLng) &
                            (Trs_Spawn.longitude <= neLng)))

        spawnpoints = []
        offset = get_utc_timedelta()
        for sp in query.dicts():
            # Convert local time to UTC.
            sp['first_detection'] = sp['first_detection'] - offset
            if sp['last_non_scanned'] is not None:
                sp['last_non_scanned'] = sp['last_non_scanned'] - offset
            if sp['end_time'] is not None:
                if sp['last_scanned'] is not None:
                    sp['last_scanned'] = sp['last_scanned'] - offset
                end_time_split = sp['end_time'].split(':')
                end_time_seconds = int(end_time_split[1])
                end_time_minutes = int(end_time_split[0])
                despawn_time = datetime.today().replace(
                    minute=end_time_minutes, second=end_time_seconds)
                if despawn_time <= datetime.today():
                    despawn_time += timedelta(hours=1)
                ts = int(despawn_time.timestamp())
                despawn_time = datetime.fromtimestamp(ts)
                sp['despawn_time'] = despawn_time - offset
                if sp['spawndef'] == 15:
                    sp['spawn_time'] = sp['despawn_time'] - timedelta(hours=1)
                else:
                    sp['spawn_time'] = (sp['despawn_time'] -
                                        timedelta(minutes=30))
                del sp['end_time']

            spawnpoints.append(sp)

        return spawnpoints


class GymDetailsOld(BaseModel):
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
    def get_weather(swLat, swLng, neLat, neLng, oSwLat=None, oSwLng=None,
                    oNeLat=None, oNeLng=None, timestamp=0):
        # We can filter by the center of a cell,
        # this deltas can expand the viewport bounds
        # So cells with center outside the viewport,
        # but close to it can be rendered
        # otherwise edges of cells that intersects
        # with viewport won't be rendered
        lat_delta = 0.15
        lng_delta = 0.4

        query = (Weather
                 .select(Weather.s2_cell_id, Weather.latitude,
                         Weather.longitude, Weather.gameplay_weather,
                         Weather.severity, Weather.world_time,
                         Weather.last_updated))

        if not (swLat and swLng and neLat and neLng):
            pass
        elif timestamp > 0:
            # If timestamp is known only send last scanned Weather.
            query = (query
                     .where((Weather.last_updated >
                             datetime.utcfromtimestamp(timestamp / 1000)) &
                            (Weather.latitude >= float(swLat) - lat_delta) &
                            (Weather.longitude >= float(swLng) - lng_delta) &
                            (Weather.latitude <= float(neLat) + lat_delta) &
                            (Weather.longitude <= float(neLng) + lng_delta)))
        elif oSwLat and oSwLng and oNeLat and oNeLng:
            # Send weather in view but exclude those within old boundaries.
            # Only send newly uncovered weather.
            query = (query
                     .where(
                         ((Weather.latitude >= float(swLat) - lat_delta) &
                          (Weather.longitude >= float(swLng) - lng_delta) &
                          (Weather.latitude <= float(neLat) + lat_delta) &
                          (Weather.longitude <= float(neLng) + lng_delta)) & ~
                         ((Weather.latitude >= float(oSwLat) - lat_delta) &
                          (Weather.longitude >= float(oSwLng) - lng_delta) &
                          (Weather.latitude <= float(oNeLat) + lat_delta) &
                          (Weather.longitude <= float(oNeLng) + lng_delta))))

        else:
            query = (query
                     .where((Weather.latitude >= float(swLat) - lat_delta) &
                            (Weather.longitude >= float(swLng) - lng_delta) &
                            (Weather.latitude <= float(neLat) + lat_delta) &
                            (Weather.longitude <= float(neLng) + lng_delta)))

        return list(query.dicts())


class RmVersions(BaseModel):
    key = Utf8mb4CharField()
    val = SmallIntegerField()

    class Meta:
        primary_key = False


class Versions(BaseModel):
    key = Utf8mb4CharField()
    val = SmallIntegerField()

    class Meta:
        primary_key = False


def orm_to_dict(orm_result):
    if isinstance(orm_result, list):
        result = []
        for r in orm_result:
            dict = r.__dict__
            del dict['_sa_instance_state']
            result.append(dict)
    else:
        result = orm_result.__dict__
        del result['_sa_instance_state']
    return result


def clean_db_loop():
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
                with db:
                    query = (Weather
                             .delete()
                             .where(Weather.last_updated <
                                    datetime.utcnow() - timedelta(minutes=15)))
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
    with db:
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
    with db:
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

    with db:
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


def db_clean_spawnpoints(age_hours):
    log.debug('Beginning cleanup of old spawnpoint data.')
    start_timer = default_timer()
    # Maximum number of variables to include in a single query.
    step = 500

    spawnpoint_timeout = datetime.now() - timedelta(hours=age_hours)

    with db:
        # Select old Trs_Spawn entries.
        query = (Trs_Spawn
                 .select(Trs_Spawn.spawnpoint)
                 .where((Trs_Spawn.last_scanned < spawnpoint_timeout) &
                        (Trs_Spawn.last_non_scanned < spawnpoint_timeout))
                 .dicts())
        old_sp = [(sp['spawnpoint']) for sp in query]

        num_records = len(old_sp)
        log.debug('Found %d old Trs_Spawn entries.', num_records)

        # Remove old and invalid Trs_Spawn entries.
        num_rows = 0
        for i in range(0, num_records, step):
            query = (Trs_Spawn
                     .delete()
                     .where((Trs_Spawn.spawnpoint <<
                             old_sp[i:min(i + step, num_records)])))
            num_rows += query.execute()
        log.debug('Deleted %d old Trs_Spawn entries.', num_rows)

    time_diff = default_timer() - start_timer
    log.debug('Completed cleanup of old spawnpoint data in %.6f seconds.',
              time_diff)


def db_clean_forts(age_hours):
    log.debug('Beginning cleanup of old forts.')
    start_timer = default_timer()

    fort_timeout = datetime.utcnow() - timedelta(hours=age_hours)

    with db:
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


def create_tables():
    tables = []
    with db:
        for table in tables:
            if not table.table_exists():
                log.info('Creating table: %s', table.__name__)
                db.create_tables([table], safe=True)
            else:
                log.debug('Skipping table %s, it already exists.',
                table.__name__)


def drop_tables():
    tables = []
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


def verify_database_schema():
    if not RmVersions.table_exists():
        with db:
            db.create_tables([RmVersions])
            RmVersions.create(key='schema_version', val=0)
        database_migrate(0)
    else:
        with db:
            db_ver = RmVersions.get(RmVersions.key == 'schema_version').val

        if db_ver < db_schema_version:
            if not database_migrate(db_ver):
                log.error('Error migrating database.')
                sys.exit(1)
        elif db_ver > db_schema_version:
            log.error('Your database version (%i) appears to be newer than '
                      'the code supports (%i).', db_ver, db_schema_version)
            log.error('Please upgrade your code base or drop all tables in '
                      'your database.')
            sys.exit(1)


def database_migrate(old_ver):
    # Update database schema version.
    with db:
        RmVersions.update(val=db_schema_version).where(
            RmVersions.key == 'schema_version').execute()

    log.info('Detected database version %i, updating to %i...',
             old_ver, db_schema_version)

    # Perform migrations here.
    migrator = MySQLMigrator(db)

    # Always log that we're done.
    log.info('Schema upgrade complete.')
    return True
