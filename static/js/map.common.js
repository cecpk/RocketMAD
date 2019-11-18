/* global i8ln, L, markers, markersNoCluster, pokemonGen */
/* eslint no-unused-vars: "off" */

function pokemonSprites(pokemonID) {
    var sprite = {
        columns: 28,
        iconWidth: 80,
        iconHeight: 80,
        spriteWidth: 2240,
        spriteHeight: 1440,
        filename: 'static/icons/' + (pokemonID) + '.png',
        name: 'High-Res'
    }

    return sprite
}

//
// LocalStorage helpers
//

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

// set the default parameters for you map here
var StoreOptions = {
    'map_style': {
        default: 'stylemapnik', // stylemapnik, styleblackandwhite, styletopo, stylesatellite, stylewikimedia
        type: StoreTypes.String
    },
    'remember_select_include_invasions': {
        default: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
        type: StoreTypes.JSON
    },
    'remember_select_notify_pokemon': {
        default: [],
        type: StoreTypes.JSON
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
    'showNormalLures': {
        default: true,
        type: StoreTypes.Boolean
    },
    'showGlacialLures': {
        default: true,
        type: StoreTypes.Boolean
    },
    'showMagneticLures': {
        default: true,
        type: StoreTypes.Boolean
    },
    'showMossyLures': {
        default: true,
        type: StoreTypes.Boolean
    },
    'showScanned': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showSpawnpoints': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showRanges': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showS2Cells': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showS2CellsLevel10': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showS2CellsLevel13': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showS2CellsLevel14': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showS2CellsLevel17': {
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
    'showWeatherCells': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showWeatherAlerts': {
        default: false,
        type: StoreTypes.Boolean
    },
    'notifyPokemon': {
        default: false,
        type: StoreTypes.Boolean
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
    'startAtLastLocation': {
        default: false,
        type: StoreTypes.Boolean
    },
    'startAtLastLocationPosition': {
        default: [],
        type: StoreTypes.JSON
    },
    'startAtUserLocation': {
        default: false,
        type: StoreTypes.Boolean
    },
    'startLocationPosition': {
        default: [],
        type: StoreTypes.JSON
    },
    'followMyLocation': {
        default: false,
        type: StoreTypes.Boolean
    },
    'followMyLocationPosition': {
        default: [],
        type: StoreTypes.JSON
    },
    'scanHere': {
        default: false,
        type: StoreTypes.Boolean
    },
    'scanHereAlerted': {
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
    'maxClusterZoomLevel': {
        default: 14,
        type: StoreTypes.Number
    },
    'clusterZoomOnClick': {
        default: false,
        type: StoreTypes.Boolean
    },
    'clusterGridSize': {
        default: 60,
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
    'showStartLocationMarker': {
        default: true,
        type: StoreTypes.Boolean
    },
    'lockStartLocationMarker': {
        default: false,
        type: StoreTypes.Boolean
    },
    'isStartLocationMarkerMovable': {
        default: true,
        type: StoreTypes.Boolean
    },
    'showLocationMarker': {
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

function getPokemonIcon(item, sprite, displayHeight) {
    displayHeight = Math.max(displayHeight, 3)
    var scale = displayHeight / sprite.iconHeight
    var scaledIconSize = [scale * sprite.iconWidth, scale * sprite.iconHeigt]
    var scaledIconOffset = [0, 0]
    var scaledIconCenterOffset = [scale * sprite.iconWidth / 2, scale * sprite.iconHeight / 2]

    let genderParam = item['gender'] ? `&gender=${item['gender']}` : ''
    let formParam = item['form'] ? `&form=${item['form']}` : ''
    let costumeParam = item['costume'] ? `&costume=${item['costume']}` : ''
    let weatherParam = item['weather_boosted_condition'] ? `&weather=${item['weather_boosted_condition']}` : ''
    let iconUrl = `pkm_img?pkm=${item['pokemon_id']}${genderParam}${formParam}${costumeParam}${weatherParam}`

    return {
        iconUrl: iconUrl,
        iconSize: scaledIconSize,
        iconAnchor: scaledIconCenterOffset
    }
}

function getGoogleSprite(index, sprite, displayHeight) {
    displayHeight = Math.max(displayHeight, 3)
    var scale = displayHeight / sprite.iconHeight
    // Crop icon just a tiny bit to avoid bleedover from neighbor
    var scaledIconSize = (scale * sprite.iconWidth - 1, scale * sprite.iconHeight - 1)
    var scaledIconOffset = (
        (index % sprite.columns) * sprite.iconWidth * scale + 0.5,
        Math.floor(index / sprite.columns) * sprite.iconHeight * scale + 0.5)
    var scaledSpriteSize = (scale * sprite.spriteWidth, scale * sprite.spriteHeight)
    var scaledIconCenterOffset = (scale * sprite.iconWidth / 2, scale * sprite.iconHeight / 2)

    return {
        iconUrl: sprite.filename,
        iconSize: scaledIconSize,
        iconAnchor: scaledIconCenterOffset,
        scaledSize: scaledSpriteSize,
        origin: scaledIconOffset
    }
}

function getIvsPercentage(pokemon) {
    // Round to 1 decimal place.
    return Math.round(1000 * (pokemon.individual_attack + pokemon.individual_defense + pokemon.individual_stamina) / 45) / 10
}

function getPokemonLevel(pokemon) {
    if (pokemon.cp_multiplier < 0.734) {
        var pokemonLevel = (58.35178527 * pokemon.cp_multiplier * pokemon.cp_multiplier -
        2.838007664 * pokemon.cp_multiplier + 0.8539209906)
    } else {
        pokemonLevel = 171.0112688 * pokemon.cp_multiplier - 95.20425243
    }
    pokemonLevel = (Math.round(pokemonLevel) * 2) / 2

    return pokemonLevel
}

function getGymLevel(gym) {
    return 6 - gym.slots_available
}

function isValidRaid(raid) {
    return raid && raid.end > Date.now()
}

function isUpcomingRaid(raid) {
    return raid.start > Date.now()
}

function isOngoingRaid(raid) {
    const now = Date.now()
    return raid.start <= now && raid.end > now
}

function isInvadedPokestop(pokestop) {
    return pokestop.incident_expiration !== null && pokestop.incident_expiration > Date.now()
}

function isLuredPokestop(pokestop) {
    return pokestop.lure_expiration !== null && pokestop.lure_expiration > Date.now()
}

function setupPokemonMarker(pokemon, layerGroup) {
    var PokemonIcon = new L.icon({ // eslint-disable-line new-cap
        iconUrl: getPokemonMapIconUrl(pokemon),
        iconSize: [32, 32]
    })

    return L.marker([pokemon.latitude, pokemon.longitude], {icon: PokemonIcon}).addTo(layerGroup)
}

function isTouchDevice() {
    // Should cover most browsers
    return 'ontouchstart' in window || navigator.maxTouchPoints
}

function isMobileDevice() {
    //  Basic mobile OS (not browser) detection
    return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
}

function getPercentageCssColor(value, perfectVal, goodVal, okVal, mehVal) {
    if (value === perfectVal) {
        return 'lime'
    } else if (value >= goodVal) {
        return 'green'
    } else if (value >= okVal) {
        return 'olive'
    } else if (value >= mehVal) {
        return 'orange'
    } else {
        return 'red'
    }
}

function getPokemonRawIconUrl(p) {
    if (!generateImages) {
        return `static/icons/${p.pokemon_id}.png`
    }
    var url = 'pkm_img?raw=1&pkm=' + p.pokemon_id
    var props = ['gender', 'form', 'costume', 'shiny']
    for (var i = 0; i < props.length; i++) {
        var prop = props[i]
        if (prop in p && p[prop] != null && p[prop]) {
            url += '&' + prop + '=' + p[prop]
        }
    }
    return url
}

function getPokemonMapIconUrl(pokemon) {
    if (!generateImages) {
        return `static/icons/${pokemon.pokemon_id}.png`
    }

    let genderParam = pokemon.gender ? `&gender=${pokemon.gender}` : ''
    let formParam = pokemon.form ? `&form=${pokemon.form}` : ''
    let costumeParam = pokemon.costume ? `&costume=${pokemon.costume}` : ''
    let weatherParam = pokemon.weather_boosted_condition ? `&weather=${pokemon.weather_boosted_condition}` : ''

    return `pkm_img?pkm=${pokemon.pokemon_id}${genderParam}${formParam}${costumeParam}${weatherParam}`
}

function getPokestopIconUrl(pokestop) {
    var imageName = 'stop'
    if (pokestop.quest != null) {
        imageName += '_q'
    }
    if (isInvadedPokestop(pokestop)) {
        imageName += '_i_' + pokestop.incident_grunt_type
    }
    if (isLuredPokestop(pokestop)) {
        imageName += '_l_' + pokestop.active_fort_modifier
    }

    return 'static/images/pokestop/' + imageName + '.png'
}

function getPokestopIconUrlFiltered(pokestop) {
    var imageName = 'stop'
    if (isPokestopMeetsQuestFilters(pokestop)) {
        imageName += '_q'
    }
    if (isPokestopMeetsInvasionFilters(pokestop)) {
        imageName += '_i_' + pokestop.incident_grunt_type
    }
    if (isPokestopMeetsLureFilters(pokestop)) {
        imageName += '_l_' + pokestop.active_fort_modifier
    }

    return 'static/images/pokestop/' + imageName + '.png'
}

// Converts timestamp to readable time String.
function timestampToTime(timestamp) {
    var timeStr = 'Unknown'
    if (timestamp) {
        timeStr = Store.get('twelveHourTime') ? moment(timestamp).format('hh:mm:ss A') : moment(timestamp).format('HH:mm:ss')
    }
    return timeStr
}

// Converts timestamp to readable date String.
function timestampToDate(timestamp) {
    var dateStr = 'Unknown'
    if (timestamp) {
        if (moment(timestamp).isSame(moment(), 'day')) {
            dateStr = 'Today'
        } else if (moment(timestamp).isSame(moment().subtract(1, 'days'), 'day')) {
            dateStr = 'Yesterday'
        } else {
            dateStr = moment(timestamp).format('YYYY-MM-DD')
        }
    }
    return dateStr
}

// Converts timestamp to readable date and time String.
function timestampToDateTime(timestamp) {
    var dateStr = 'Unknown'
    if (timestamp) {
        var time = Store.get('twelveHourTime') ? moment(timestamp).format('hh:mm:ss A') : moment(timestamp).format('HH:mm:ss')
        if (moment(timestamp).isSame(moment(), 'day')) {
            dateStr = 'Today ' + time
        } else if (moment(timestamp).isSame(moment().subtract(1, 'days'), 'day')) {
            dateStr = 'Yesterday ' + time
        } else {
            dateStr = moment(timestamp).format('YYYY-MM-DD') + ' ' + time
        }
    }
    return dateStr
}

function nowIsBetween(timestamp1, timestamp2) {
    const now = Date.now()
    return timestamp1 <= now && now <= timestamp2
}

function openMapDirections(lat, lng) { // eslint-disable-line no-unused-vars
    var url = ''
    if (Store.get('mapServiceProvider') === 'googlemaps') {
        url = 'http://maps.google.com/maps?q=' + lat + ',' + lng
        window.open(url, '_blank')
    } else if (Store.get('mapServiceProvider') === 'applemaps') {
        url = 'https://maps.apple.com/maps?daddr=' + lat + ',' + lng
        window.open(url, '_self')
    }
}
