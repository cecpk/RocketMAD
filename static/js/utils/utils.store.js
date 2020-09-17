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
    },
    Set: {
        parse: function (str) {
            return new Set(JSON.parse(str))
        },
        stringify: function (set) {
            return JSON.stringify(Array.from(set))
        }
    }
}

var StoreOptions = {
    'showPokemon': {
        default: true,
        type: StoreTypes.Boolean
    },
    'filterPokemonById': {
        default: false,
        type: StoreTypes.Boolean
    },
    'excludedPokemon': {
        default: new Set(),
        type: StoreTypes.Set
    },
    'pokemonIconSizeModifier': {
        default: 100,
        type: StoreTypes.Number
    },
    'showPokemonValues': {
        default: true,
        type: StoreTypes.Boolean
    },
    'filterPokemonByValues': {
        default: false,
        type: StoreTypes.Boolean
    },
    'noFilterValuesPokemon': {
        default: new Set(),
        type: StoreTypes.Set
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
    'showHundoIvsPokemon': {
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
    'pokemonNotifs': {
        default: false,
        type: StoreTypes.Boolean
    },
    'pokemonIdNotifs': {
        default: false,
        type: StoreTypes.Boolean
    },
    'notifPokemon': {
        default: new Set(),
        type: StoreTypes.Set
    },
    'pokemonValuesNotifs': {
        default: false,
        type: StoreTypes.Boolean
    },
    'notifValuesPokemon': {
        default: new Set(),
        type: StoreTypes.Set
    },
    'zeroIvsPokemonNotifs': {
        default: true,
        type: StoreTypes.Boolean
    },
    'hundoIvsPokemonNotifs': {
        default: true,
        type: StoreTypes.Boolean
    },
    'minNotifIvs': {
        default: 0,
        type: StoreTypes.Number
    },
    'maxNotifIvs': {
        default: 100,
        type: StoreTypes.Number
    },
    'minNotifLevel': {
        default: 1,
        type: StoreTypes.Number
    },
    'maxNotifLevel': {
        default: 35,
        type: StoreTypes.Number
    },
    'notifRarities': {
        default: [],
        type: StoreTypes.JSON
    },
    'tinyRattataNotifs': {
        default: false,
        type: StoreTypes.Boolean
    },
    'bigMagikarpNotifs': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showNotifPokemonOnly': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showNotifPokemonAlways': {
        default: false,
        type: StoreTypes.Boolean
    },
    'playCries': {
        default: false,
        type: StoreTypes.Boolean
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
    'filterRaidPokemon': {
        default: false,
        type: StoreTypes.Boolean
    },
    'excludedRaidPokemon': {
        default: new Set(),
        type: StoreTypes.Set
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
    'raidNotifs': {
        default: false,
        type: StoreTypes.Boolean
    },
    'raidPokemonNotifs': {
        default: false,
        type: StoreTypes.Boolean
    },
    'notifRaidPokemon': {
        default: new Set(),
        type: StoreTypes.Set
    },
    'notifEggs': {
        default: [],
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
    'filterQuests': {
        default: false,
        type: StoreTypes.Boolean
    },
    'excludedQuestPokemon': {
        default: new Set(),
        type: StoreTypes.Set
    },
    'excludedQuestItems': {
        default: [],
        type: StoreTypes.JSON
    },
    'showInvasions': {
        default: true,
        type: StoreTypes.Boolean
    },
    'filterInvasions': {
        default: false,
        type: StoreTypes.Boolean
    },
    'excludedInvasions': {
        default: [],
        type: StoreTypes.JSON
    },
    'includedLureTypes': {
        default: [501, 502, 503, 504],
        type: StoreTypes.JSON
    },
    'pokestopNotifs': {
        default: false,
        type: StoreTypes.Boolean
    },
    'questNotifs': {
        default: false,
        type: StoreTypes.Boolean
    },
    'notifQuestPokemon': {
        default: new Set(),
        type: StoreTypes.Set
    },
    'notifQuestItems': {
        default: [],
        type: StoreTypes.JSON
    },
    'invasionNotifs': {
        default: false,
        type: StoreTypes.Boolean
    },
    'notifInvasions': {
        default: [],
        type: StoreTypes.JSON
    },
    'notifLureTypes': {
        default: [],
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
    'showPokemonNests': {
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
    'showBrowserPopups': {
        default: true,
        type: StoreTypes.Boolean
    },
    'playSound': {
        default: false,
        type: StoreTypes.Boolean
    },
    'upscaleNotifMarkers': {
        default: true,
        type: StoreTypes.Boolean
    },
    'bounceNotifMarkers': {
        default: true,
        type: StoreTypes.Boolean
    },
    'mapStyle': {
        default: 'mapnik',
        type: StoreTypes.String
    },
    'mapServiceProvider': {
        default: 'googlemaps',
        type: StoreTypes.String
    },
    'startLocationMarkerStyle': {
        default: 'pokesition',
        type: StoreTypes.String
    },
    'userLocationMarkerStyle': {
        default: 'mobile',
        type: StoreTypes.String
    },
    'darkMode': {
        default: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches,
        type: StoreTypes.Boolean
    },
    'pokemonHistoryDuration': {
        default: 24,
        type: StoreTypes.Number
    },
    'zoomLevel': {
        default: 16,
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
