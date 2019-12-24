var StoreTypes = {
    Boolean: {
        parse: function (str) {
            switch (str.toLowerCase()) {
                case '1':
                case 'true':
                case 'yes':
                    return true
                default:
                    return false
            }
        },
        stringify: function (b) {
            return b ? 'true' : 'false'
        }
    },
    JSON: {
        parse: function (str) {
            return JSON.parse(str)
        },
        stringify: function (json) {
            return JSON.stringify(json)
        }
    },
    String: {
        parse: function (str) {
            return str
        },
        stringify: function (str) {
            return str
        }
    },
    Number: {
        parse: function (str) {
            return parseFloat(str)
        },
        stringify: function (number) {
            return number.toString()
        }
    }
}

var StoreOptions = {
    'map_style': {
        default: 'stylemapnik', // stylemapnik, styleblackandwhite, styletopo, stylesatellite, stylewikimedia
        type: StoreTypes.String
    },
    'remember_select_notify_raid_pokemon': {
        default: [],
        type: StoreTypes.JSON
    },
    'remember_select_notify_eggs': {
        default: [],
        type: StoreTypes.JSON
    },
    'remember_select_notify_invasions': {
        default: [],
        type: StoreTypes.JSON
    },
    'showNotifiedPokemonAlways': {
        default: false,
        type: StoreTypes.Boolean
    },
    'notifyIvsPercentage': {
        default: '-1',
        type: StoreTypes.Number
    },
    'notifyLevel': {
        default: '-1',
        type: StoreTypes.Number
    },
    'notifyRarities': {
        default: [], // Common, Uncommon, Rare, Very Rare, Ultra Rare
        type: StoreTypes.JSON
    },
    'showPokemon': {
        default: true,
        type: StoreTypes.Boolean
    },
    'excludedPokemon': {
        default: [],
        type: StoreTypes.JSON
    },
    'showPokemonValues': {
        default: true,
        type: StoreTypes.Boolean
    },
    'filterValues': {
        default: false,
        type: StoreTypes.Boolean
    },
    'noFilterValuesPokemon': {
        default: [],
        type: StoreTypes.JSON
    },
    'minIvs': {
        default: 0,
        type: StoreTypes.Number
    },
    'maxIvs': {
        default: 100,
        type: StoreTypes.Number
    },
    'showZeroIvsPokemon': {
        default: true,
        type: StoreTypes.Boolean
    },
    'minLevel': {
        default: 1,
        type: StoreTypes.Number
    },
    'maxLevel': {
        default: 35,
        type: StoreTypes.Number
    },
    'includedRarities': {
        default: [1, 2, 3, 4, 5, 6], // Common ... New Spawn
        type: StoreTypes.JSON
    },
    'scaleByRarity': {
        default: true,
        type: StoreTypes.Boolean
    },
    'pokemonNotifications': {
        default: false,
        type: StoreTypes.Boolean
    },
    'notifyPokemon': {
        default: [],
        type: StoreTypes.JSON
    },
    'filterNotifyValues': {
        default: false,
        type: StoreTypes.Boolean
    },
    'noFilterValuesNotifyPokemon': {
        default: [],
        type: StoreTypes.JSON
    },
    'notifyZeroIvsPokemon': {
        default: true,
        type: StoreTypes.Boolean
    },
    'notifyHundoIvsPokemon': {
        default: true,
        type: StoreTypes.Boolean
    },
    'minNotifyIvs': {
        default: 0,
        type: StoreTypes.Number
    },
    'maxNotifyIvs': {
        default: 100,
        type: StoreTypes.Number
    },
    'minNotifyLevel': {
        default: 1,
        type: StoreTypes.Number
    },
    'maxNotifyLevel': {
        default: 35,
        type: StoreTypes.Number
    },
    'showGyms': {
        default: true,
        type: StoreTypes.Boolean
    },
    'useGymSidebar': {
        default: false,
        type: StoreTypes.Boolean
    },
    'includedGymTeams': {
        default: [0, 1, 2, 3],
        type: StoreTypes.JSON
    },
    'minGymLevel': {
        default: 0,
        type: StoreTypes.Number
    },
    'maxGymLevel': {
        default: 6,
        type: StoreTypes.Number
    },
    'showOpenSpotGymsOnly': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showExGymsOnly': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showInBattleGymsOnly': {
        default: false,
        type: StoreTypes.Boolean
    },
    'gymLastScannedHours': {
        default: 0,
        type: StoreTypes.Number
    },
    'showRaids': {
        default: true,
        type: StoreTypes.Boolean
    },
    'excludedRaidPokemon': {
        default: [],
        type: StoreTypes.JSON
    },
    'showActiveRaidsOnly': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showExEligibleRaidsOnly': {
        default: false,
        type: StoreTypes.Boolean
    },
    'includedRaidLevels': {
        default: [1, 2, 3, 4, 5],
        type: StoreTypes.JSON
    },
    'showPokestops': {
        default: true,
        type: StoreTypes.Boolean
    },
    'showPokestopsNoEvent': {
        default: true,
        type: StoreTypes.Boolean
    },
    'showQuests': {
        default: true,
        type: StoreTypes.Boolean
    },
    'excludedQuestPokemon': {
        default: [],
        type: StoreTypes.JSON
    },
    'excludedQuestItems': {
        default: [],
        type: StoreTypes.JSON
    },
    'showInvasions': {
        default: true,
        type: StoreTypes.Boolean
    },
    'excludedInvasions': {
        default: [],
        type: StoreTypes.JSON
    },
    'showLures': {
        default: true,
        type: StoreTypes.Boolean
    },
    'includedLureTypes': {
        default: [501, 502, 503, 504],
        type: StoreTypes.JSON
    },
    'showWeather': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showWeatherCells': {
        default: true,
        type: StoreTypes.Boolean
    },
    'showMainWeather': {
        default: true,
        type: StoreTypes.Boolean
    },
    'showSpawnpoints': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showScannedLocations': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showExParks': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showNestParks': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showS2Cells': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showS2CellsLevel10': {
        default: true,
        type: StoreTypes.Boolean
    },
    'showS2CellsLevel13': {
        default: true,
        type: StoreTypes.Boolean
    },
    'showS2CellsLevel14': {
        default: true,
        type: StoreTypes.Boolean
    },
    'showS2CellsLevel17': {
        default: true,
        type: StoreTypes.Boolean
    },
    'warnHiddenS2Cells': {
        default: true,
        type: StoreTypes.Boolean
    },
    'showRanges': {
        default: false,
        type: StoreTypes.Boolean
    },
    'includedRangeTypes': {
        default: [1, 2, 3, 4], // Pokemon, Gyms, Pokestops, Spawn points
        type: StoreTypes.JSON
    },
    'startAtUserLocation': {
        default: false,
        type: StoreTypes.Boolean
    },
    'startAtLastLocation': {
        default: false,
        type: StoreTypes.Boolean
    },
    'startAtLastLocationPosition': {
        default: [],
        type: StoreTypes.JSON
    },
    'startLocationPosition': {
        default: [],
        type: StoreTypes.JSON
    },
    'isStartLocationMarkerMovable': {
        default: true,
        type: StoreTypes.Boolean
    },
    'followUserLocation': {
        default: false,
        type: StoreTypes.Boolean
    },
    'lastUserLocation': {
        default: [],
        type: StoreTypes.JSON
    },
    'showNotifiedPokemonOnly': {
        default: false,
        type: StoreTypes.Boolean
    },
    'notifyPokestops': {
        default: false,
        type: StoreTypes.Boolean
    },
    'notifyGyms': {
        default: false,
        type: StoreTypes.Boolean
    },
    'notifyNormalLures': {
        default: false,
        type: StoreTypes.Boolean
    },
    'notifyGlacialLures': {
        default: false,
        type: StoreTypes.Boolean
    },
    'notifyMagneticLures': {
        default: false,
        type: StoreTypes.Boolean
    },
    'notifyMossyLures': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showPopups': {
        default: true,
        type: StoreTypes.Boolean
    },
    'playSound': {
        default: false,
        type: StoreTypes.Boolean
    },
    'playCries': {
        default: false,
        type: StoreTypes.Boolean
    },
    'geoLocate': {
        default: false,
        type: StoreTypes.Boolean
    },
    'pokemonIcons': {
        default: 'highres',
        type: StoreTypes.String
    },
    'pokemonIconSizeModifier': {
        default: 100,
        type: StoreTypes.Number
    },
    'upscalePokemon': {
        default: false,
        type: StoreTypes.Boolean
    },
    'upscaledPokemon': {
        default: [],
        type: StoreTypes.JSON
    },
    'searchMarkerStyle': {
        default: 'pokesition',
        type: StoreTypes.String
    },
    'locationMarkerStyle': {
        default: 'mobile',
        type: StoreTypes.String
    },
    'zoomLevel': {
        default: 16,
        type: StoreTypes.Number
    },
    'mapServiceProvider': {
        default: 'googlemaps',
        type: StoreTypes.String
    },
    'bouncePokemon': {
        default: true,
        type: StoreTypes.Boolean
    },
    'bounceGyms': {
        default: true,
        type: StoreTypes.Boolean
    },
    'bouncePokestops': {
        default: true,
        type: StoreTypes.Boolean
    },
    'upscaleNotifyPokemon': {
        default: true,
        type: StoreTypes.Boolean
    },
    'upscaleGyms': {
        default: true,
        type: StoreTypes.Boolean
    },
    'upscalePokestops': {
        default: true,
        type: StoreTypes.Boolean
    },
    'twelveHourTime': {
        default: false,
        type: StoreTypes.Boolean
    },
    'notifyTinyRattata': {
        default: false,
        type: StoreTypes.Boolean
    },
    'notifyBigMagikarp': {
        default: false,
        type: StoreTypes.Boolean
    },
    'rarityCommon': {
        default: 1,
        type: StoreTypes.Number
    },
    'rarityUncommon': {
        default: 1,
        type: StoreTypes.Number
    },
    'rarityRare': {
        default: 1,
        type: StoreTypes.Number
    },
    'rarityVeryRare': {
        default: 1,
        type: StoreTypes.Number
    },
    'rarityUltraRare': {
        default: 1,
        type: StoreTypes.Number
    },
    'rarityNewSpawn': {
        default: 1,
        type: StoreTypes.Number
    }

}

var Store = {
    getOption: function (key) {
        var option = StoreOptions[key]
        if (!option) {
            throw new Error('Store key was not defined ' + key)
        }
        return option
    },
    get: function (key) {
        var option = this.getOption(key)
        var optionType = option.type
        var rawValue = localStorage[key]
        if (rawValue === null || rawValue === undefined) {
            return option.default
        }
        var value = optionType.parse(rawValue)
        return value
    },
    set: function (key, value) {
        var option = this.getOption(key)
        var optionType = option.type || StoreTypes.String
        var rawValue = optionType.stringify(value)
        localStorage[key] = rawValue
    },
    reset: function (key) {
        localStorage.removeItem(key)
    }
}
