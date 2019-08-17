/* global i8ln, L, markers, markersnotify, pokemonGen */
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
        default: 'stylemapnik', // stylemapnik, styleblackandwhite, styletopo, stylesatellite, stylewikimedia
        type: StoreTypes.String
    },
    'remember_select_include_pokemon': {
        default: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43,
            44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84,
            85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120,
            121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153,
            154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186,
            187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219,
            220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252,
            253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285,
            286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318,
            319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351,
            352, 353, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, 380, 381, 382, 383, 384,
            385, 386, 387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417,
            418, 419, 420, 421, 422, 423, 424, 425, 426, 427, 428, 429, 430, 431, 432, 433, 434, 435, 436, 437, 438, 439, 440, 441, 442, 443, 444, 445, 446, 447, 448, 449, 450,
            451, 452, 453, 454, 455, 456, 457, 458, 459, 460, 461, 462, 463, 464, 465, 466, 467, 468, 469, 470, 471, 472, 473, 474, 475, 476, 477, 478, 479, 480, 481, 482, 483,
            484, 485, 486, 487, 488, 489, 490, 491, 492, 493, 808, 809],
        type: StoreTypes.JSON
    },
    'remember_select_include_quest_pokemon': {
        default: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43,
            44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84,
            85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120,
            121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153,
            154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186,
            187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219,
            220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252,
            253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285,
            286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318,
            319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351,
            352, 353, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, 380, 381, 382, 383, 384,
            385, 386, 387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417,
            418, 419, 420, 421, 422, 423, 424, 425, 426, 427, 428, 429, 430, 431, 432, 433, 434, 435, 436, 437, 438, 439, 440, 441, 442, 443, 444, 445, 446, 447, 448, 449, 450,
            451, 452, 453, 454, 455, 456, 457, 458, 459, 460, 461, 462, 463, 464, 465, 466, 467, 468, 469, 470, 471, 472, 473, 474, 475, 476, 477, 478, 479, 480, 481, 482, 483,
            484, 485, 486, 487, 488, 489, 490, 491, 492, 493, 808, 809],
        type: StoreTypes.JSON
    },
    'remember_select_include_quest_items': {
        default: [1, 2, 3, 6, 101, 102, 103, 104, 201, 202, 701, 703, 705, 1101, 1102, 1103, 1104, 1105, 1106, 706, 708, 1405, 301, 401, 501, 1404, 902, 903, 1201, 1202, 1301, 1402],
        type: StoreTypes.JSON
    },
    'remember_select_notify_pokemon': {
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
    'showRaidFilter': {
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
    'showParkGymsOnly': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showOpenGymsOnly': {
        default: false,
        type: StoreTypes.Boolean
    },
    'showGymInBattle': {
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
    'showGymFilter': {
        default: true,
        type: StoreTypes.Boolean
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
    'showWeatherCells': {
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
    'hidepresets': {
        default: [],
        type: StoreTypes.JSON
    },
    'twelveHourTime': {
        default: false,
        type: StoreTypes.Boolean
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

function getPokemonGen(p) {
    return pokemonGen[p] || '?'
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
    var rarityValue = 2

    if (Store.get('upscalePokemon')) {
        const upscaledPokemon = Store.get('upscaledPokemon')
        rarityValue = isNotifyPkmn || (upscaledPokemon.indexOf(item['pokemon_id']) !== -1) ? 29 : 2
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

function setupPokemonMarker(item, map, scaleByRarity = true, isNotifyPkmn = false) {
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
