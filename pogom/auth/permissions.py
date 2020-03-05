#!/usr/bin/env python3
# -*- coding: utf-8 -*-

class Permissions():

    def __init__(self):
        self._pokemon = True
        self._pokemon_values = True
        self._gyms = True
        self._raids = True
        self._pokestops = True
        self._quests = True
        self._invasions = True
        self._lures = True
        self._weather = True
        self._spawnpoints = True
        self._scanned_locations = True
        self._parks = True

        self._map_page = True
        self._mobile_page = True
        self._pokemon_history_page = True
        self._quest_page = True

        self._full_access = True

    @property
    def pokemon(self):
        return self._pokemon

    @pokemon.setter
    def pokemon(self, value):
        self._pokemon = value if type(value) == bool else False
        update_full_access()

    def update_full_access(self):
        self._full_access = (self._pokemon and self._pokemon_values and
            self._gyms and self._raids and self._pokestops and self._quests and
            self._invasions and self._lures and self._weather and
            self._spawnpoints and self._scanned_locations and self._parks and
            self._map_page and self._mobile_page and
            self.pokemon_history_page and self._quest_page)
