/*global i8ln, L, markers, markersnotify*/
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
            return parseInt(str, 10)
        },
        stringify: function (number) {
            return number.toString()
        }
    }
}

// set the default parameters for you map here
var StoreOptions = {
    'map_style': {
        default: 'stylemapnik', // stylemapnik, styleblackandwhite, styletopo, stylesatellite, stylewikipedia
        type: StoreTypes.String
    },
    'remember_select_exclude': {
        default: [],
        type: StoreTypes.JSON
    },
    'remember_select_notify': {
        default: [],
        type: StoreTypes.JSON
    },
    'prioNotify': {
        default: false,
        type: StoreTypes.Boolean
    },
    'remember_select_rarity_notify': {
        default: [], // Common, Uncommon, Rare, Very Rare, Ultra Rare
        type: StoreTypes.JSON
    },
    'remember_text_perfection_notify': {
        default: '',
        type: StoreTypes.Number
    },
    'remember_text_level_notify': {
        default: '',
        type: StoreTypes.Number
    },
    'excludedRarity': {
        default: 0, // 0: none, 1: <=Common, 2: <=Uncommon, 3: <=Rare, 4: <=Very Rare, 5: <=Ultra Rare
        type: StoreTypes.Number
    },
    'showRaids': {
        default: true,
        type: StoreTypes.Boolean
    },
    'showParkRaidsOnly': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showActiveRaidsOnly': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showRaidMinLevel': {
        default: 1,
        type: StoreTypes.Number
    },
    'showRaidMaxLevel': {
        default: 5,
        type: StoreTypes.Number
    },
    'showGyms': {
        default: false,
        type: StoreTypes.Boolean
    },
    'useGymSidebar': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showParkGymsOnly': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showOpenGymsOnly': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showTeamGymsOnly': {
        default: 0,
        type: StoreTypes.Number
    },
    'showLastUpdatedGymsOnly': {
        default: 0,
        type: StoreTypes.Number
    },
    'minGymLevel': {
        default: 0,
        type: StoreTypes.Number
    },
    'maxGymLevel': {
        default: 6,
        type: StoreTypes.Number
    },
    'showPokemon': {
        default: true,
        type: StoreTypes.Boolean
    },
    'showPokemonStats': {
        default: true,
        type: StoreTypes.Boolean
    },
    'showPokestops': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showLuredPokestopsOnly': {
        default: 0,
        type: StoreTypes.Number
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
    'showWeatherCells': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showS2Cells': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showWeatherAlerts': {
        default: false,
        type: StoreTypes.Boolean
    },
    'hideNotNotified': {
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
    'lockMarker': {
        default: isTouchDevice(), // default to true if touch device
        type: StoreTypes.Boolean
    },
    'startAtUserLocation': {
        default: false,
        type: StoreTypes.Boolean
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
    'iconSizeModifier': {
        default: 0,
        type: StoreTypes.Number
    },
    'scaleByRarity': {
        default: true,
        type: StoreTypes.Boolean
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
    'processPokemonChunkSize': {
        default: 100,
        type: StoreTypes.Number
    },
    'processPokemonIntervalMs': {
        default: 100,
        type: StoreTypes.Number
    },
    'mapServiceProvider': {
        default: 'googlemaps',
        type: StoreTypes.String
    },
    'isBounceDisabled': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showLocationMarker': {
        default: true,
        type: StoreTypes.Boolean
    },
    'isLocationMarkerMovable': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showSearchMarker': {
        default: true,
        type: StoreTypes.Boolean
    },
    'isSearchMarkerMovable': {
        default: false,
        type: StoreTypes.Boolean
    },
    'hidepresets': {
        default: [],
        type: StoreTypes.JSON
    },
    'showMedalRattata': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showMedalMagikarp': {
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

var mapData = {
    pokemons: {},
    gyms: {},
    pokestops: {},
    lurePokemons: {},
    scanned: {},
    spawnpoints: {},
    weather: {},
    s2cells: {},
    weatherAlerts: {}
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

// Populated by a JSON request.
var pokemonRarities = {}

function updatePokemonRarities() {
    $.getJSON('static/dist/data/' + rarityFileName + '.json').done(function (data) {
        pokemonRarities = data
    }).fail(function () {
        // Could be disabled/removed.
        console.log("Couldn't load dynamic rarity JSON.")
    })
}

function getPokemonRarity(pokemonId) {
    if (pokemonRarities.hasOwnProperty(pokemonId)) {
        return i8ln(pokemonRarities[pokemonId])
    }

    return i8ln('New Spawn')
}

function getPokemonRarityNoi8(pokemonId) {
    if (pokemonRarities.hasOwnProperty(pokemonId)) {
        return pokemonRarities[pokemonId]
    }

    return 'New Spawn'
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

function setupPokemonMarkerDetails(item, map, scaleByRarity = true, isNotifyPkmn = false) {
    const pokemonIndex = item['pokemon_id']
    const sprite = pokemonSprites(pokemonIndex)

    var markerDetails = {
        sprite: sprite
    }
    var iconSize = (12) * (12) * 0.2 + Store.get('iconSizeModifier')
    rarityValue = 2

    if (Store.get('upscalePokemon')) {
        const upscaledPokemon = Store.get('upscaledPokemon')
        var rarityValue = isNotifyPkmn || (upscaledPokemon.indexOf(item['pokemon_id']) !== -1) ? 29 : 2
    }

    if (scaleByRarity) {
        const rarityValues = {
            'new spawn': 20,
            'very rare': 20,
            'ultra rare': 25,
            'legendary': 30
        }

        const pokemonRarity = getPokemonRarity(item['pokemon_id']).toLowerCase()
        if (rarityValues.hasOwnProperty(pokemonRarity)) {
            rarityValue = rarityValues[pokemonRarity]
        }
    }

    iconSize += rarityValue
    markerDetails.rarityValue = rarityValue
    markerDetails.icon = generateImages
        ? getPokemonIcon(item, sprite, iconSize)
        : getGoogleSprite(pokemonIndex, sprite, iconSize)
    markerDetails.iconSize = iconSize

    return markerDetails
}

function updatePokemonMarker(item, map, scaleByRarity = true, isNotifyPkmn = false) {
    // Scale icon size up with the map exponentially, also size with rarity.
    const markerDetails = setupPokemonMarkerDetails(item, map, scaleByRarity, isNotifyPkmn)
    const icon = L.icon(markerDetails.icon)
    const marker = item.marker

    marker.setIcon(icon)
}

function setupPokemonMarker(item, map, isBounceDisabled, scaleByRarity = true, isNotifyPkmn = false) {
    // Scale icon size up with the map exponentially, also size with rarity.
    const markerDetails = setupPokemonMarkerDetails(item, map, scaleByRarity, isNotifyPkmn)
    const icon = L.icon(markerDetails.icon)
    var pokemonMarker
    if (!isNotifyPkmn) {
        pokemonMarker = L.marker([item['latitude'], item['longitude']], {icon: icon, zIndexOffset: 100 + markerDetails.rarityValue}).addTo(markers)
    } else {
        pokemonMarker = L.marker([item['latitude'], item['longitude']], {icon: icon, zIndexOffset: 1000 + markerDetails.rarityValue}).addTo(markersnotify)
    }
    return pokemonMarker
}


function updatePokemonLabel(item) {
    // Only update label when Pokémon has been encountered.
    if (item['cp'] !== null && item['cpMultiplier'] !== null) {
        item.marker.infoWindow.setContent(pokemonLabel(item))
    }
}

function updatePokemonLabels(pokemonList) {
    $.each(pokemonList, function (key, value) {
        var item = pokemonList[key]

        updatePokemonLabel(item)
    })
}

function isTouchDevice() {
    // Should cover most browsers
    return 'ontouchstart' in window || navigator.maxTouchPoints
}

function isMobileDevice() {
    //  Basic mobile OS (not browser) detection
    return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
}

function cssPercentageCircle(text, value, perfectVal, goodVal, okVal, mehVal) {
    // Ring color
    var ringColor
    if (value === perfectVal) {
        ringColor = 'lime'
    } else if (value >= goodVal) {
        ringColor = 'green'
    } else if (value >= okVal) {
        ringColor = 'olive'
    } else if (value >= mehVal) {
        ringColor = 'orange'
    } else {
        ringColor = 'red'
    }

    // CSS styles
    var percentage = value * 100 / perfectVal
    var deg = 360 * percentage / 100
    var circleStyles
    if (deg <= 180) {
        circleStyles = `background-color: ${ringColor};
            background-image: linear-gradient(${90 + deg}deg, transparent 50%, Gainsboro 50%),
                              linear-gradient(90deg, Gainsboro 50%, transparent 50%)');`
    } else {
        circleStyles = `background-color: ${ringColor};
            background-image: linear-gradient(${deg - 90}deg, transparent 50%, ${ringColor} 50%),
                              linear-gradient(90deg, Gainsboro 50%, transparent 50%)');`
    }

    // HTML output
    return `<div class="active-border" style='${circleStyles}'>
                <div class="circle">
                    <span class="prec" id="prec">${text}</span>
                </div>
            </div>`
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
