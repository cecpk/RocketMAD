/*global showAllZoomLevel cssPercentageCircle getS2CellBounds processWeather processS2Cell processWeatherAlerts updateMainCellWeather getPokemonRawIconUrl*/
/* eslint no-unused-vars: "off" */
//
// Global map.js variables
//

var $selectExclude
var $selectPokemonNotify
var $selectRarityNotify
var $textPerfectionNotify
var $textLevelNotify
var $selectStyle
var $selectIconSize
var $switchOpenGymsOnly
var $switchParkGymsOnly
var $switchParkRaidGymsOnly
var $switchGymInBattle
var $switchActiveRaidGymsOnly
var $switchRaidMinLevel
var $switchRaidMaxLevel
var $selectTeamGymsOnly
var $selectLastUpdateGymsOnly
var $selectMinGymLevel
var $selectMaxGymLevel
var $selectLuredPokestopsOnly
var $selectSearchIconMarker
var $selectLocationIconMarker
var $switchGymSidebar
var $selectExcludeRarity
var pokeSearchList = []
var pokemonGen = new Array(808)
pokemonGen.fill(1, 1, 152)
pokemonGen.fill(2, 152, 252)
pokemonGen.fill(3, 252, 387)
pokemonGen.fill(4, 387, 494)
pokemonGen.fill(5, 494, 650)
pokemonGen.fill(6, 650, 722)
pokemonGen.fill(7, 722, 808)

const language = document.documentElement.lang === '' ? 'en' : document.documentElement.lang
var idToPokemon = {}
var i8lnDictionary = {}
var languageLookups = 0
var languageLookupThreshold = 3

var searchMarkerStyles

var timestamp
var excludedPokemon = []
var excludedPokemonByRarity = []
var excludedRarity

var notifiedPokemon = []
var notifiedRarity = []
var notifiedMinPerfection = null
var notifiedMinLevel = null

var buffer = []
var reincludedPokemon = []
var reids = []

// var map
var markerCluster = window.markerCluster = {}
var rawDataIsLoading = false
var locationMarker
const rangeMarkers = ['pokemon', 'pokestop', 'gym']
var searchMarker
var storeZoom = true
var moves

var oSwLat
var oSwLng
var oNeLat
var oNeLng

var L
var map
var markers
var markersnotify
var _oldlayer = 'stylemapnik'

var lastpokestops
var lastgyms
var lastpokemon
var lastslocs
var lastspawns

var selectedStyle = 'stylemapnik'

var updateWorker
var lastUpdateTime
var redrawTimeout = null

const gymTypes = ['Uncontested', 'Mystic', 'Valor', 'Instinct']

const audio = new Audio('static/sounds/ding.mp3')
const cryFileTypes = ['wav', 'mp3']

const genderType = ['♂', '♀', '⚲']
const unownForm = ['unset', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '!', '?']

const weatherImages = {
    1: 'weather_sunny.png',
    2: 'weather_rain.png',
    3: 'weather_partlycloudy_day.png',
    4: 'weather_cloudy.png',
    5: 'weather_windy.png',
    6: 'weather_snow.png',
    7: 'weather_fog.png',
    11: 'weather_clear_night.png',
    13: 'weather_partlycloudy_night.png',
    15: 'weather_moderate.png',
    16: 'weather_extreme.png'
}

const weatherNames = {
    1: 'Clear',
    2: 'Rain',
    3: 'Partly Cloudy',
    4: 'Cloudy',
    5: 'Windy',
    6: 'Snow',
    7: 'Fog'
}

const alertTexts = {
    1: 'Moderate',
    2: 'Extreme'
}

const excludedRaritiesList = [
  [],
  [i8ln('Common')],
  [i8ln('Common'), i8ln('Uncommon')],
  [i8ln('Common'), i8ln('Uncommon'), i8ln('Rare')],
  [i8ln('Common'), i8ln('Uncommon'), i8ln('Rare'), i8ln('Very Rare')],
  [i8ln('Common'), i8ln('Uncommon'), i8ln('Rare'), i8ln('Very Rare'), i8ln('Ultra Rare')]
]


/*
 text place holders:
 <pkm> - pokemon name
 <prc> - iv in percent without percent symbol
 <atk> - attack as number
 <def> - defense as number
 <sta> - stamnia as number
 <lvl> - level as number
 */
var notifyIvTitle = '<pkm> <prc>% (<atk>/<def>/<sta>) L<lvl>'
var notifyNoIvTitle = '<pkm>'

/*
 text place holders:
 <dist>  - disappear time
 <udist> - time until disappear
 */
var notifyText = 'disappears at <dist> (<udist>)'

//
// Functions
//

function isShowAllZoom() {
    return showAllZoomLevel > 0 && map.getZoom() >= showAllZoomLevel
}

function getExcludedPokemon() {
    return isShowAllZoom() ? [] : excludedPokemon
}

function toggleSelectItem($select, id) {
    var values = $select.val()
    var idx = values.indexOf(id.toString())
    if (idx >= 0) {
        values.splice(idx, 1)
    } else {
        values = values.concat(id)
    }
    $select.val(values).change()
}

function excludePokemon(id, encounterId) { // eslint-disable-line no-unused-vars
    $('label[for="exclude-pokemon"] .list .pokemon-icon-sprite[data-value="' + id + '"]').click()
}

function notifyAboutPokemon(id, encounterId) { // eslint-disable-line no-unused-vars
    $('label[for="notify-pokemon"] .list .pokemon-icon-sprite[data-value="' + id + '"]').click()
}

function removePokemonMarker(encounterId) { // eslint-disable-line no-unused-vars
    if (mapData.pokemons[encounterId].marker.rangeCircle) {
        markers.removeLayer(mapData.pokemons[encounterId].marker.rangeCircle)
        markersnotify.removeLayer(mapData.pokemons[encounterId].marker.rangeCircle)
        delete mapData.pokemons[encounterId].marker.rangeCircle
    }
    if (mapData.pokemons[encounterId].marker.infoWindowIsOpen) {
        mapData.pokemons[encounterId].marker.infoWindowIsOpen = false
    }
    markers.removeLayer(mapData.pokemons[encounterId].marker)
    markersnotify.removeLayer(mapData.pokemons[encounterId].marker)
}

function createServiceWorkerReceiver() {
    navigator.serviceWorker.addEventListener('message', function (event) {
        const data = JSON.parse(event.data)
        if (data.action === 'centerMap' && data.lat && data.lon) {
            centerMap(data.lat, data.lon, 20)
        }
    })
}

function downloadSettings(name, settings) { // eslint-disable-line no-unused-vars
    var a = document.createElement('a')
    a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(settings))
    a.setAttribute('download', name + '_' + moment().format('DD-MM-YYYY HH:mm'))
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

function loadSettingsFile(file) { // eslint-disable-line no-unused-vars
    var reader = new FileReader()
    reader.onload = function () {
        Object.assign(localStorage, JSON.parse(reader.result))
    }
    reader.readAsText(file.target.files[0])
    window.location.reload()
}

function loadDefaultImages() {
    var ep = Store.get('remember_select_exclude')
    var en = Store.get('remember_select_notify')
    $('label[for="exclude-pokemon"] .list .pokemon-icon-sprite').removeClass('active')
    $('label[for="exclude-pokemon"] .list .pokemon-icon-sprite').each(function () {
        if (ep.indexOf($(this).data('value')) !== -1) {
            $(this).addClass('active')
            $('.hidefilteractiv').css('color', 'red')
            $('.hidefilteractiv').text('*** active Filter  ***')
        }
    })
    $('label[for="notify-pokemon"] .list .pokemon-icon-sprite').removeClass('active')
    $('label[for="notify-pokemon"] .list .pokemon-icon-sprite').each(function () {
        if (en.indexOf($(this).data('value')) !== -1) {
            $(this).addClass('active')
            $('.notifyfilteractiv').css('color', 'red')
            $('.notifyfilteractiv').text('*** active Filter  ***')
        }
    })
}


function initMap() { // eslint-disable-line no-unused-vars
    map = L.map('map', {
        center: [Number(getParameterByName('lat')) || centerLat, Number(getParameterByName('lon')) || centerLng],
        zoom: Number(getParameterByName('zoom')) || Store.get('zoomLevel'),
        maxZoom: 18,
        zoomControl: false
    })

    setTitleLayer(Store.get('map_style'))

    markers = L.markerClusterGroup({
        disableClusteringAtZoom: Store.get('maxClusterZoomLevel'),
        spiderfyOnMaxZoom: false,
        zoomToBoundsOnClick: Store.get('clusterZoomOnClick'),
        showCoverageOnHover: false,
        maxClusterRadius: Store.get('clusterGridSize'),
        removeOutsideVisibleBounds: true
    })

    L.control.zoom({
        position: 'bottomright'
    }).addTo(map)

    map.addLayer(markers)
    markersnotify = L.layerGroup().addTo(map)

    if (showConfig.fixed_display) {
        var GeoSearchControl = window.GeoSearch.GeoSearchControl
        var OpenStreetMapProvider = window.GeoSearch.OpenStreetMapProvider
        var provider = new OpenStreetMapProvider()

        const search = new GeoSearchControl({
            provider: provider,
            position: 'bottomright',
            autoClose: true,
            keepResult: false,
            showMarker: false
        })

        map.addControl(search)

        map.on('geosearch/showlocation', function (e) {
            changeLocation(e.location.y, e.location.x)
        })
    }

    map.on('zoom', function () {
        if (storeZoom === true) {
            Store.set('zoomLevel', map.getZoom())
        } else {
            storeZoom = true
        }

        // User scrolled again, reset our timeout.
        if (redrawTimeout) {
            clearTimeout(redrawTimeout)
            redrawTimeout = null
        }
        // Don't redraw constantly even if the user scrolls multiple times,
        // just add it on a timer.
        redrawTimeout = setTimeout(function () {
            redrawPokemon(mapData.pokemons)
            redrawPokemon(mapData.lurePokemons)

            // We're done processing the list. Repaint.
            markers.refreshClusters()
        }, 500)
    })

    const showSearchMarker = Store.get('showSearchMarker')
    const showLocationMarker = Store.get('showLocationMarker')
    const isLocationMarkerMovable = Store.get('isLocationMarkerMovable')

    if (showSearchMarker) {
        // Whether marker is draggable or not is set in createSearchMarker().
        searchMarker = createSearchMarker()
    }

    if (showLocationMarker) {
        locationMarker = createLocationMarker()
        locationMarker.draggable = isLocationMarkerMovable
    }
    createMyLocationButton()
    initSidebar()

    $('#scan-here').on('click', function () {
        var loc = map.getCenter()
        changeLocation(loc.lat, loc.lng)

        if (!$('#search-switch').checked) {
            $('#search-switch').prop('checked', true)
            searchControl('on')
        }
    })

    $('#tabs_marker').tabs()
    $('#tabs_notify').tabs()

    if (Push._agents.chrome.isSupported()) {
        createServiceWorkerReceiver()
    }
}

var stylemapnik = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'})
var styleblackandwhite = L.tileLayer('https://korona.geog.uni-heidelberg.de/tiles/roadsg/x={x}&y={y}&z={z}', {attribution: 'Imagery from <a href="http://giscience.uni-hd.de/">GIScience Research Group @ University of Heidelberg</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'})
var styletopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'})
var stylesatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'})
var stylewikipedia = L.tileLayer('https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}{r}.png', {attribution: '<a href="https://wikimediafoundation.org/wiki/Maps_Terms_of_Use">Wikimedia</a>'})
var stylecartodbdark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'})
var stylecartodbdarknolabels = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'})

function setTitleLayer(layername) {
    if (map.hasLayer(window[_oldlayer])) { map.removeLayer(window[_oldlayer]) }
    map.addLayer(window[layername])
    _oldlayer = layername
}

function updateLocationMarker(style) {
    // Don't do anything if it's disabled.
    if (!locationMarker) {
        return
    }
    var locationIcon
    if (style in searchMarkerStyles) {
        var url = searchMarkerStyles[style].icon
        if (url) {
            locationIcon = L.icon({
                iconUrl: url,
                iconSize: [24, 24]
            })
            locationMarker.setIcon(locationIcon)
        } else {
            locationIcon = new L.Icon.Default()
            locationMarker.setIcon(locationIcon)
        }
        Store.set('locationMarkerStyle', style)
    }
    // Return value is currently unused.
    return locationMarker
}

function createLocationMarker() {
    var position = Store.get('followMyLocationPosition')
    var lat = ('lat' in position) ? position.lat : centerLat
    var lng = ('lng' in position) ? position.lng : centerLng

    var locationMarker = L.marker([lat, lng]).addTo(markersnotify).bindPopup('<div><b>My Location</b></div>')
    addListeners(locationMarker)

    locationMarker.on('dragend', function () {
        var newLocation = locationMarker.getLatLng()
        Store.set('followMyLocationPosition', {
            lat: newLocation.lat,
            lng: newLocation.lng
        })
    })

    return locationMarker
}

function updateSearchMarker(style) {
    if (style in searchMarkerStyles) {
        Store.set('searchMarkerStyle', style)

        // If it's disabled, stop.
        if (!searchMarker) {
            return
        }

        var url = searchMarkerStyles[style].icon
        if (url) {
            var SearchIcon = L.icon({
                iconUrl: url,
                iconSize: [24, 24]
            })
            searchMarker.setIcon(SearchIcon)
        } else {
            SearchIcon = new L.Icon.Default()
            searchMarker.setIcon(SearchIcon)
        }
    }

    return searchMarker
}

function createSearchMarker() {
    const isSearchMarkerMovable = Store.get('isSearchMarkerMovable')
    var searchMarker = L.marker([centerLat, centerLng], {draggable: !Store.get('lockMarker') && isSearchMarkerMovable}).addTo(markersnotify).bindPopup('<div><b>Search Location</b></div>')
    addListeners(searchMarker)
    var oldLocation = null
    searchMarker.on('dragstart', function () {
        oldLocation = searchMarker.getLatLng()
    })

    searchMarker.on('dragend', function () {
        var newLocation = searchMarker.getLatLng()
        changeSearchLocation(newLocation.lat, newLocation.lng)
            .done(function () {
                oldLocation = null
            })
            .fail(function () {
                if (oldLocation) {
                    searchMarker.setLatLng(oldLocation)
                }
            })
    })

    return searchMarker
}

var searchControlURI = 'search_control'

function searchControl(action) {
    $.post(searchControlURI + '?action=' + encodeURIComponent(action))
    $('#scan-here').toggleClass('disabled', action === 'off')
}

function updateSearchStatus() {
    $.getJSON(searchControlURI).then(function (data) {
        $('#search-switch').prop('checked', data.status)
        $('#scan-here').toggleClass('disabled', !data.status)
    })
}

function initSidebar() {
    $('#gyms-switch').prop('checked', Store.get('showGyms'))
    $('#gym-sidebar-switch').prop('checked', Store.get('useGymSidebar'))
    $('#gym-sidebar-wrapper').toggle(Store.get('showGyms') || Store.get('showRaids'))
    $('#gyms-filter-wrapper').toggle(Store.get('showGyms'))
    $('#team-gyms-only-switch').val(Store.get('showTeamGymsOnly'))
    $('#raids-switch').prop('checked', Store.get('showRaids'))
    $('#raid-park-gym-switch').prop('checked', Store.get('showParkRaidsOnly'))
    $('#raid-active-gym-switch').prop('checked', Store.get('showActiveRaidsOnly'))
    $('#raid-min-level-only-switch').val(Store.get('showRaidMinLevel'))
    $('#raid-max-level-only-switch').val(Store.get('showRaidMaxLevel'))
    $('#raids-filter-wrapper').toggle(Store.get('showRaids'))
    $('#open-gyms-only-switch').prop('checked', Store.get('showOpenGymsOnly'))
    $('#park-gyms-only-switch').prop('checked', Store.get('showParkGymsOnly'))
    $('#gym-in-battle-switch').prop('checked', Store.get('showGymInBattle'))
    $('#min-level-gyms-filter-switch').val(Store.get('minGymLevel'))
    $('#max-level-gyms-filter-switch').val(Store.get('maxGymLevel'))
    $('#last-update-gyms-switch').val(Store.get('showLastUpdatedGymsOnly'))
    $('#pokemon-stats-switch').prop('checked', Store.get('showPokemonStats'))
    $('#pokemon-switch').prop('checked', Store.get('showPokemon'))
    $('#pokestops-switch').prop('checked', Store.get('showPokestops'))
    $('#lured-pokestops-only-switch').val(Store.get('showLuredPokestopsOnly'))
    $('#lured-pokestops-only-wrapper').toggle(Store.get('showPokestops'))
    $('#geoloc-switch').prop('checked', Store.get('geoLocate'))
    $('#lock-marker-switch').prop('checked', Store.get('lockMarker'))
    $('#start-at-user-location-switch').prop('checked', Store.get('startAtUserLocation'))
    $('#follow-my-location-switch').prop('checked', Store.get('followMyLocation'))
    $('#scan-here-switch').prop('checked', Store.get('scanHere'))
    $('#scan-here').toggle(Store.get('scanHere'))
    $('#scanned-switch').prop('checked', Store.get('showScanned'))
    $('#spawnpoints-switch').prop('checked', Store.get('showSpawnpoints'))
    $('#ranges-switch').prop('checked', Store.get('showRanges'))
    $('#notify-perfection-wrapper').toggle(Store.get('showPokemonStats'))
    $('#hideunnotified-switch').prop('checked', Store.get('hideNotNotified'))
    $('#popups-switch').prop('checked', Store.get('showPopups'))
    $('#bounce-switch').prop('checked', Store.get('isBounceDisabled'))
    $('#sound-switch').prop('checked', Store.get('playSound'))
    $('#pokemoncries').toggle(Store.get('playSound'))
    $('#cries-switch').prop('checked', Store.get('playCries'))
    $('#map-service-provider').val(Store.get('mapServiceProvider'))
    $('#weather-cells-switch').prop('checked', Store.get('showWeatherCells'))
    $('#s2cells-switch').prop('checked', Store.get('showS2Cells'))
    $('#weather-alerts-switch').prop('checked', Store.get('showWeatherAlerts'))
    $('#prio-notify-switch').prop('checked', Store.get('prioNotify'))
    $('#medal-rattata-switch').prop('checked', Store.get('showMedalRattata'))
    $('#medal-magikarp-switch').prop('checked', Store.get('showMedalMagikarp'))

    $('select').each(
        function (id, element) {
            $(element).select2()
        }
    )

    $('select').select2({
        minimumResultsForSearch: -1
    })

    if ($('#search-switch').length) {
        updateSearchStatus()
        setInterval(updateSearchStatus, 5000)
    }

    $('#pokemon-icon-size').val(Store.get('iconSizeModifier'))
}

function getTypeSpan(type) {
    return `<span style='padding: 2px 5px; text-transform: uppercase; color: white; margin-right: 2px; border-radius: 4px; font-size: 0.6em; vertical-align: middle; background-color: ${type['color']}'>${type['type']}</span>`
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

// Converts timestamp to readable String
function getDateStr(t) {
    var dateStr = 'Unknown'
    if (t) {
        dateStr = moment(t).fromNow()
    }
    return dateStr
}

function scout(encounterId) { // eslint-disable-line no-unused-vars
    var infoEl = $('#scoutInfo' + encounterId)
    $.ajax({
        url: 'scout',
        type: 'GET',
        data: {
            'encounter_id': encounterId
        },
        dataType: 'json',
        cache: false,
        beforeSend: function () {
            infoEl.text('Scouting, please wait...')
            infoEl.show()
        },
        error: function () {
            infoEl.text('Error scouting, try again?')
        },
        success: function (data, textStatus, jqXHR) {
            if (data.success) {
                // update local values
                var pkm = mapData.pokemons[encounterId]
                pkm['individual_attack'] = data.iv_attack
                pkm['individual_defense'] = data.iv_defense
                pkm['individual_stamina'] = data.iv_stamina
                pkm['move_1'] = data.move_1
                pkm['move_2'] = data.move_2
                pkm['weight'] = data.weight
                pkm['height'] = data.height
                pkm['gender'] = data.gender
                pkm['cp'] = data.cp
                pkm['cp_multiplier'] = data.cp_multiplier
                pkm['catch_prob_1'] = data.catch_prob_1
                pkm['catch_prob_2'] = data.catch_prob_2
                pkm['catch_prob_3'] = data.catch_prob_3
                pkm['rating_attack'] = data.rating_attack
                pkm['rating_defense'] = data.rating_defense
                pkm.marker.infoWindow.setContent(pokemonLabel(pkm))
            } else {
                infoEl.text(data.error)
            }
        }
    })
}

function pokemonLabel(item) {
    const pokemonRarity = getPokemonRarity(item['pokemon_id'])
    var name = item['pokemon_name']
    var rarityDisplay = pokemonRarity ? '(' + pokemonRarity + ')' : ''
    var types = item['pokemon_types']
    var typesDisplay = ''
    var encounterId = item['encounter_id']
    var id = item['pokemon_id']
    var latitude = item['latitude']
    var longitude = item['longitude']
    var disappearTime = item['disappear_time']
    var atk = item['individual_attack']
    var def = item['individual_defense']
    var sta = item['individual_stamina']
    var pMove1 = (moves[item['move_1']] !== undefined) ? i8ln(moves[item['move_1']]['name']) : 'gen/unknown'
    var pMove2 = (moves[item['move_2']] !== undefined) ? i8ln(moves[item['move_2']]['name']) : 'gen/unknown'
    var weight = item['weight']
    var height = item['height']
    var gender = item['gender']
    var form = item['form']
    var cp = item['cp']
    var cpMultiplier = item['cp_multiplier']
    const showStats = Store.get('showPokemonStats')
    var prob1 = item['catch_prob_1']
    var prob2 = item['catch_prob_2']
    var prob3 = item['catch_prob_3']
    var ratingAttack = item['rating_attack']
    var ratingDefense = item['rating_defense']
    var encounterIdLong = encounterId
    var weatherBoostedCondition = item['weather_boosted_condition']
    var gen = getPokemonGen(id)

    $.each(types, function (index, type) {
        typesDisplay += getTypeSpan(type)
    })

    var details = ''

    var contentstring = ''
    var formString = ''

    if (id === 201 && form !== null && form > 0) {
        formString += `(${unownForm[item['form']]})`
    }

    contentstring += `
    <div class='pokemon name'>
      ${name} <span class='pokemon name pokedex'><a href='http://pokemon.gameinfo.io/en/pokemon/${id}' target='_blank' title='View in Pokédex'>#${id}</a></span> ${formString} <span class='pokemon gender rarity'>${genderType[gender - 1]} ${rarityDisplay}</span> ${typesDisplay}
    </div>`

    var weatherBoost = ''
    if (weatherBoostedCondition) {
        weatherBoost = `<div class='pokemon big'>Boosted by:
            <img src='static/images/weather/${weatherImages[weatherBoostedCondition]}' style="width: 24px; vertical-align: middle;">&nbsp;${weatherNames[weatherBoostedCondition]}
            </div>`
    }

    var movesetRating = ''
    if (ratingAttack !== null) {
        movesetRating = `
          <div class='pokemon'>
            Moveset Rating:
            Attack <span class='pokemon encounter'>${ratingAttack}</span> |
            Defense <span class='pokemon encounter'>${ratingDefense}</span>
          </div>`
    }

    var catchProbs = ''
    if (prob1 !== null) {
        catchProbs = `
          <div class='pokemon'>
            Probs:
            <img class='pokemon ball' src='static/images/markers/pokeball.png'> ${(prob1 * 100).toFixed(1)}%
            <img class='pokemon ball' src='static/images/markers/greatball.png'> ${(prob2 * 100).toFixed(1)}%
            <img class='pokemon ball' src='static/images/markers/ultraball.png'> ${(prob3 * 100).toFixed(1)}%
          </div>`
    }

    var hideLabel = excludedPokemon.indexOf(id) < 0 ? 'Hide' : 'Unhide'
    var notifyLabel = notifiedPokemon.indexOf(id) < 0 ? 'Notify' : 'Unnotify'

    var pokemonIcon = getPokemonRawIconUrl(item)

    if (showStats && cp !== null && cpMultiplier !== null) {
        var pokemonLevel = getPokemonLevel(cpMultiplier)

        if (atk !== null && def !== null && sta !== null) {
            var iv = getIv(atk, def, sta)
        }

        var ivCircle = cssPercentageCircle(`${iv.toFixed(0)}<br>%`, iv, 100, 82, 66, 51)
        var levelCircle = cssPercentageCircle(`Lvl<br>${pokemonLevel}`, pokemonLevel, 35, 30, 20, 10)

        contentstring += `
            <div class='pokemon container'>
            <div class='pokemon container content-left'>
              <div>
                <img class='pokemon sprite' src='${pokemonIcon}'>
                <div class='pokemon cp big'>
                  CP <span class='pokemon encounter big'>${cp}</span><br>
                  GEN: <span class='pokemon encounter big'>${gen}</span>
                </div>
                <div class='pokemon links'>
                  <i class='fa fa-lg fa-fw fa-eye-slash'></i> <a href='javascript:excludePokemon(${id}, "${encounterId}")'>${hideLabel}</a>
                </div>
                <div class='pokemon links'>
                  <i class='fa fa-lg fa-fw fa-bullhorn'></i> <a href='javascript:notifyAboutPokemon(${id}, "${encounterId}")'>${notifyLabel}</a>
                </div>
                <div class='pokemon links'>
                  <i class='fa fa-lg fa-fw fa-trash-o'></i> <a href='javascript:removePokemonMarker("${encounterId}")'>Remove</a>
                </div>
                <div class='pokemon links'>
                  <i class='fa fa-lg fa-fw fa-binoculars'></i> <a href='javascript:scout("${encounterId}")'>Scout</a>
                </div>
              </div>
          </div>
          <div class='pokemon container content-right'>
            <div>
              <div class='pokemon disappear'>
                <span class='label-countdown' disappears-at='${disappearTime}'>00m00s</span> left (${moment(disappearTime).format('HH:mm')})
              </div>
              ${weatherBoost}
              <div class='pokemon'>
                ${ivCircle}
                (A <span class='pokemon encounter'>${atk}</span> &nbsp;&nbsp; D <span class='pokemon encounter'>${def}</span> &nbsp;&nbsp; S <span class='pokemon encounter'>${sta}</span>)
                ${levelCircle}
              </div>
              <div class='pokemon'>
                Moveset: <span class='pokemon encounter'>${pMove1}</span> / <span class='pokemon encounter'>${pMove2}</span>
              </div>
              ${movesetRating}
              <div class='pokemon'>
                Weight: ${weight.toFixed(2)}kg | Height: ${height.toFixed(2)}m
              </div>
              ${catchProbs}
              <div class='pokemon'>
                <span class='pokemon navigate'><a href='javascript:void(0);' onclick='javascript:openMapDirections(${latitude},${longitude});' title='Open in Google Maps'>${latitude.toFixed(6)}, ${longitude.toFixed(7)}</a></span>
              </div>
          </div>
        </div>
      </div>`
    } else if (!showStats && cp !== null && cpMultiplier !== null) {
        contentstring += `
            <div class='pokemon container'>
                <div class='pokemon container content-left'>
                    <div>
                        <img class='pokemon sprite' src='${pokemonIcon}'>
                        <div class='pokemon cp big'>
                          GEN: <span class='pokemon encounter big'>${gen}</span>
                        </div>
                        <div class='pokemon links'>
                          <i class='fa fa-lg fa-fw fa-eye-slash'></i> <a href='javascript:excludePokemon(${id}, "${encounterId}")'>${hideLabel}</a>
                        </div>
                        <div class='pokemon links'>
                          <i class='fa fa-lg fa-fw fa-bullhorn'></i> <a href='javascript:notifyAboutPokemon(${id}, "${encounterId}")'>${notifyLabel}</a>
                        </div>
                        <div class='pokemon links'>
                          <i class='fa fa-lg fa-fw fa-trash-o'></i> <a href='javascript:removePokemonMarker("${encounterId}")'>Remove</a>
                        </div>
                    </div>
                </div>
                <div class='pokemon container content-right'>
                    <div>
                        <div class='pokemon disappear'>
                            <span class='label-countdown' disappears-at='${disappearTime}'>00m00s</span> left (${moment(disappearTime).format('HH:mm')})
                        </div>
                        <div class='pokemon'>
                            <span class='pokemon navigate'><a href='javascript:void(0);' onclick='javascript:openMapDirections(${latitude},${longitude});' title='Open in Google Maps'>${latitude.toFixed(6)}, ${longitude.toFixed(7)}</a></span>
                        </div>
                        <div id='scoutInfo${encounterIdLong}' class='pokemon scoutinfo'></div>
                    </div>
                </div>
            </div>`
    } else {
        contentstring += `
              <div class='pokemon container'>
                <div class='pokemon container content-left'>
                  <div>
                    <img class='pokemon sprite' src='${pokemonIcon}'>
                    <div class='pokemon cp big'>
                      GEN: <span class='pokemon encounter big'>${gen}</span>
                    </div>
                    <div class='pokemon links'>
                      <i class='fa fa-lg fa-fw fa-eye-slash'></i> <a href='javascript:excludePokemon(${id}, "${encounterId}")'>${hideLabel}</a>
                    </div>
                    <div class='pokemon links'>
                      <i class='fa fa-lg fa-fw fa-bullhorn'></i> <a href='javascript:notifyAboutPokemon(${id}, "${encounterId}")'>${notifyLabel}</a>
                    </div>
                    <div class='pokemon links'>
                      <i class='fa fa-lg fa-fw fa-trash-o'></i> <a href='javascript:removePokemonMarker("${encounterId}")'>Remove</a>
                    </div>
                  </div>
              </div>
              <div class='pokemon container content-right'>
                <div>
                  <div class='pokemon disappear'>
                    <span class='label-countdown' disappears-at='${disappearTime}'>00m00s</span> left (${moment(disappearTime).format('HH:mm')})
                  </div>
                  ${weatherBoost}
                  <div class='pokemon links'>
                    <i class='fa fa-2x fa-binoculars'></i>&nbsp; <a href='javascript:scout("${encounterId}")'>Scout for IV / CP / Moves</a>
                  </div>
                  <div class='pokemon'>
                    <span class='pokemon navigate'><a href='javascript:void(0);' onclick='javascript:openMapDirections(${latitude},${longitude});' title='Open in Google Maps'>${latitude.toFixed(6)}, ${longitude.toFixed(7)}</a></span>
                  </div>
                  <div id='scoutInfo${encounterIdLong}' class='pokemon scoutinfo'></div>
              </div>
            </div>
        </div>`
    }

    contentstring += `
      ${details}`

    return contentstring
}

function isOngoingRaid(raid) {
    return raid && Date.now() < raid.end && Date.now() > raid.start
}

function isValidRaid(raid) {
    return raid && Date.now() < raid.end
    // && Date.now() > raid.spawn
}

function isGymSatisfiesRaidMinMaxFilter(raid) {
    if (raid) {
        return (raid['level'] <= Store.get('showRaidMaxLevel') && raid['level'] >= Store.get('showRaidMinLevel')) ? 1 : 0
    } else {
        return 0
    }
}

function gymLabel(gym, includeMembers = true) {
    const raid = gym.raid
    var raidStr = ''
    if (raid && raid.end > Date.now()) {
        if (raid.pokemon_id !== null) {
            let pMove1 = (moves[raid['move_1']] !== undefined) ? i8ln(moves[raid['move_1']]['name']) : 'unknown'
            let pMove2 = (moves[raid['move_2']] !== undefined) ? i8ln(moves[raid['move_2']]['name']) : 'unknown'

            raidStr += `
                    <div class='move'>
                      <span class='name'>${pMove1}</span><span class='type ${moves[raid['move_1']]['type'].toLowerCase()}'>${i8ln(moves[raid['move_1']]['type'])}</span>
                    </div>
                    <div class='move'>
                      <span class='name'>${pMove2}</span><span class='type ${moves[raid['move_2']]['type'].toLowerCase()}'>${i8ln(moves[raid['move_2']]['type'])}</span>
                    </div>`
        }
    }
    const lastScannedStr = getDateStr(gym.last_scanned)
    const lastModifiedStr = getDateStr(gym.last_modified)
    const slotsString = gym.slots_available ? (gym.slots_available === 1 ? '1 Free Slot' : `${gym.slots_available} Free Slots`) : 'No Free Slots'
    const teamName = gymTypes[gym.team_id]
    const isUpcomingRaid = raid != null && Date.now() < raid.start
    const isRaidStarted = isOngoingRaid(raid)
    const isRaidFilterOn = Store.get('showRaids')
    const gymImage = gym.url.url

    var park = ''
	var subtitle = ''
    var image = ''
    var imageLbl = ''
    var navInfo = ''
    var memberStr = ''

    const gymPoints = gym.total_cp
    const titleText = gym.name ? gym.name : (gym.team_id === 0 ? teamName : 'Team ' + teamName)
    const title = `
      <div class='gym name'>
        <span class='team ${gymTypes[gym.team_id].toLowerCase()}'>${titleText}</span>
      </div>`

    if (gym.team_id !== 0) {
        subtitle = `
        <div>
            <img class='gym info strength' src='static/images/gym/Strength.png'>
            <span class='gym info strength'>
              Strength: ${gymPoints} (${slotsString})
            </span>
        </div>`
    }

    if (gym.park == 1) {
        park = `
        <div class='gym info park'>
            <img class='gym info park' src='static/images/gym/exraidgym.png'>
        </div>`
    }

    if ((isUpcomingRaid || isRaidStarted) && isRaidFilterOn && isGymSatisfiesRaidMinMaxFilter(raid)) {
        const raidColor = ['252,112,176', '255,158,22', '184,165,221']
        const levelStr = '★'.repeat(raid['level'])

        if (isRaidStarted) {
            // Use Pokémon-specific image.
            var pokemonIcon = getPokemonRawIconUrl(raid)
            if (raid.pokemon_id !== null) {
                image = `
                    <div class='raid container'>
                    <div class='raid container content-left'>
                        <img class='gym sprite' src='${pokemonIcon}'>
                    </div>
                    <div class='raid container content-right'>
                        <div>
                        <div class='raid pokemon'>
                            ${raid['pokemon_name']} <a href='http://pokemon.gameinfo.io/en/pokemon/${raid['pokemon_id']}' target='_blank' title='View in Pokédex'>#${raid['pokemon_id']}</a> | CP: ${raid['cp']}
                    </div>
                        ${raidStr}
                    </div>
                    </div>
                </div>
                    <div class='raid'>
                    <span style='color:rgb(${raidColor[Math.floor((raid.level - 1) / 2)]})'>
                    ${levelStr}
                    </span>
                    <span class='raid countdown label-countdown' disappears-at='${raid.end}'></span> left (${moment(raid.end).format('HH:mm')})
                    </div>
                `
            }
        } else if (gymImage !== '') {
            image = `<img class='gym sprite' src='${gymImage}'>`
        
        } else {
            let gymUrl = `gym_img?team=${gymTypes[gym.team_id]}&level=${getGymLevel(gym)}&raidlevel=${raid.level}`
            if (gym.is_in_battle) {
                gymUrl += '&in_battle=1'
            }
            image = `<img class='gym sprite' src='${gymUrl}'>`
        }

        if (isUpcomingRaid) {
            imageLbl = `
                <div class='raid'>
                  <span style='color:rgb(${raidColor[Math.floor((raid.level - 1) / 2)]})'>
                  ${levelStr}
                  </span>
                  Raid in <span class='raid countdown label-countdown' disappears-at='${raid.start}'></span> (${moment(raid.start).format('HH:mm')})
                </div>`
        }
    } else if (gymImage !== '') {
        image = `<img class='gym sprite' src='${gymImage}'>`

    } else {
        let gymUrl = `gym_img?team=${teamName}&level=${getGymLevel(gym)}`
        if (gym.is_in_battle) {
            gymUrl += '&in_battle=1'
        }
        image = `<img class='gym sprite' src='${gymUrl}'>`
    }

    navInfo = `
            <div class='gym container'>
                <div>
                  <span class='gym info navigate'>
                    <a href='javascript:void(0);' onclick='javascript:openMapDirections(${gym.latitude},${gym.longitude});' title='Open in Google Maps'>
                      ${gym.latitude.toFixed(6)}, ${gym.longitude.toFixed(7)}
                    </a>
                  </span>
                </div>
                <div class='gym info last-scanned'>
                    Last Scanned: ${lastScannedStr}
                </div>
                <div class='gym info last-modified'>
                    Last Modified: ${lastModifiedStr}
                </div>
            </div>`


    if (includeMembers) {
        memberStr = '<div>'

        gym.pokemon.forEach((member) => {
            var pokemonIcon = generateImages ? `<img class='pokemon-icon' src='${getPokemonRawIconUrl(member)}'>` : `<i class='pokemon-sprite n${member.pokemon_id}'></i>`
            memberStr += `
            <span class='gym member'>
              <center>
                <div>
                  <div>
                    ${pokemonIcon}
                  </div>
                  <div>
                    <span class='gym pokemon'>${member.pokemon_name}</span>
                  </div>
                  <div>
                    <img class='gym pokemon motivation heart' src='static/images/gym/Heart.png'> <span class='gym pokemon motivation'>${member.cp_decayed}</span>
                  </div>
                </div>
              </center>
            </span>`
        })

        memberStr += '</div>'
    }

    return `
        <div>
            <center>
                ${title}
                ${park}
                ${subtitle}
                ${image}
                ${imageLbl}
            </center>
            ${navInfo}
            <center class="gym member_list">
                ${memberStr}
            </center>
        </div>`
}

function pokestopLabel(pokestop) {
    let questText = ''
    let pokestopImg = '<img class=\'pokestop sprite\' src=\'static/images/pokestop/Pokestop.png\'>'
    let pokestopExpiration = ''
    const expireTime = pokestop.lure_expiration
    const latitude = pokestop.latitude
    const longitude = pokestop.longitude
    const luredClass = expireTime ? 'lure' : 'nolure'
    const pokestopNavigation = `
      <div class="pokestop">
        <a href='#!' onclick='javascript:openMapDirections(${latitude},${longitude});' title='Open in Google Maps' class='pokestop navigate ${luredClass}'>${latitude.toFixed(6)}, ${longitude.toFixed(7)}</a>
      </div>
    `
    const pokestopName = pokestop.name ? pokestop.name : 'Pokéstop'

    if (expireTime) {
        pokestopExpiration = `
          <div class='pokestop-expire'>
            <span class='label-countdown' disappears-at='${expireTime}'>00m00s</span> left (${moment(expireTime).format('HH:mm')})
          </div>
        `
    }

    if (typeof pokestop.image !== 'undefined' && pokestop.image !== null && pokestop.image !== '') {
        pokestopImg = `<img class='pokestop imgcircle ${luredClass}' src='${pokestop.image}'>`
    }

    const quest = pokestop.quest_raw
    if (quest['is_quest']) {
        let image = ''
        let rewardText = ''
        let width = 40

        switch (quest['quest_reward_type_raw']) {
            case '2':
                image = 'static/quest/reward_' + quest['item_id'] + '_1.png'
                rewardText = quest['item_amount'] + ' ' + i8ln(quest['item_type'])
                width = 40
                break
            case '3':
                image = 'static/quest/reward_stardust.png'
                rewardText = quest['item_amount'] + ' ' + i8ln(quest['item_type'])
                width = 40
                break
            case '7':
                const pokemonId = quest['pokemon_id']
                if (generateImages) {
                    image = `pkm_img?pkm=${pokemonId}`
                } else {
                    image = pokemonSprites(quest['pokemon_id']).filename
                }
                rewardText = quest['quest_pokemon_name']
                width = 40
                break
        }

        questText = `
          <div class="pokestop-quest">
            <div class="pokestop-quest__reward">
              <div class="pokestop-quest__reward-image"><img src="${image}" width="${width}" /></div>
              <div class="pokestop-quest__reward-text">${rewardText}</div>
            </div>
            <div class="pokestop-quest__task">${quest['quest_task']}</div>
          </div>`
    }

    return `
      <div>
        <div class='pokestop ${luredClass}'>
          ${pokestopName}
        </div>
        ${pokestopExpiration}
        <div>
          ${pokestopImg}
        </div>
        <div>
          ${questText}
        </div>
        ${pokestopNavigation}
      </div>`
}

function formatSpawnTime(seconds) {
    // the addition and modulo are required here because the db stores when a spawn disappears
    // the subtraction to get the appearance time will knock seconds under 0 if the spawn happens in the previous hour
    return ('0' + Math.floor(((seconds + 3600) % 3600) / 60)).substr(-2) + ':' + ('0' + seconds % 60).substr(-2)
}

function spawnpointLabel(item) {
    var str = `
        <div>
            <b>Spawn Point</b>
        </div>`

    if (item.uncertain) {
        str += `
            <div>
                Spawn times not yet determined. Current guess ${formatSpawnTime(item.appear_time)} until ${formatSpawnTime(item.disappear_time)}
            </div>`
    } else {
        str += `
            <div>
                Every hour from ${formatSpawnTime(item.appear_time)} to ${formatSpawnTime(item.disappear_time)}
            </div>`
    }
    return str
}

function addRangeCircle(marker, map, type, teamId) {
    var targetmap = null
    var markerPos = marker.getLatLng()
    var lat = markerPos.lat
    var lng = markerPos.lng
    var circleCenter = L.latLng(lat, lng)
    var gymColors = ['#999999', '#0051CF', '#FF260E', '#FECC23'] // 'Uncontested', 'Mystic', 'Valor', 'Instinct']
    var teamColor = gymColors[0]
    if (teamId) teamColor = gymColors[teamId]

    var range
    var circleColor

    // handle each type of marker and be explicit about the range circle attributes
    switch (type) {
        case 'pokemon':
            circleColor = '#C233F2'
            range = 40 // pokemon appear at 40m and then you can move away. still have to be 40m close to see it though, so ignore the further disappear distance
            break
        case 'pokestop':
            circleColor = '#3EB0FF'
            range = 40
            break
        case 'gym':
            circleColor = teamColor
            range = 40
            break
    }

    if (map) targetmap = map

    var rangeCircleOpts = {
        radius: range, // meters
        weight: 1,
        color: circleColor,
        opacity: 0.9,
        center: circleCenter,
        fillColor: circleColor,
        fillOpacity: 0.3
    }

    var rangeCircle = L.circle(circleCenter, rangeCircleOpts)
    markers.addLayer(rangeCircle)
    return rangeCircle
}

function isRangeActive(map) {
    if (map.getZoom() < 16) return false
    return Store.get('showRanges')
}

function getIv(atk, def, stm) {
    if (atk !== null) {
        return 100.0 * (atk + def + stm) / 45
    }

    return false
}

function getPokemonLevel(cpMultiplier) {
    if (cpMultiplier < 0.734) {
        var pokemonLevel = (58.35178527 * cpMultiplier * cpMultiplier -
        2.838007664 * cpMultiplier + 0.8539209906)
    } else {
        pokemonLevel = 171.0112688 * cpMultiplier - 95.20425243
    }
    pokemonLevel = (Math.round(pokemonLevel) * 2) / 2

    return pokemonLevel
}

function getGymLevel(gym) {
    return 6 - gym['slots_available']
}

function getRaidLevel(raid) {
    if (raid) {
        return raid['level']
    } else {
        return 0
    }
}

function lpad(str, len, padstr) {
    return Array(Math.max(len - String(str).length + 1, 0)).join(padstr) + str
}

function repArray(text, find, replace) {
    for (var i = 0; i < find.length; i++) {
        text = text.replace(find[i], replace[i])
    }

    return text
}

function getTimeUntil(time) {
    var now = Date.now()
    var tdiff = time - now

    var sec = Math.floor((tdiff / 1000) % 60)
    var min = Math.floor((tdiff / 1000 / 60) % 60)
    var hour = Math.floor((tdiff / (1000 * 60 * 60)) % 24)

    return {
        'total': tdiff,
        'hour': hour,
        'min': min,
        'sec': sec,
        'now': now,
        'ttime': time
    }
}

function getNotifyText(item) {
    var iv = getIv(item['individual_attack'], item['individual_defense'], item['individual_stamina'])
    var find = ['<prc>', '<pkm>', '<atk>', '<def>', '<sta>', '<lvl>']
    iv = Math.round(iv)
    var pokemonlevel = (item['cp_multiplier'] !== null) ? getPokemonLevel(item['cp_multiplier']) : 0
    var replace = [(iv || ''), item['pokemon_name'], item['individual_attack'],
        item['individual_defense'], item['individual_stamina'], pokemonlevel]
    const showStats = Store.get('showPokemonStats')
    var ntitle = repArray(((showStats && iv) ? notifyIvTitle : notifyNoIvTitle), find, replace)
    var dist = moment(item['disappear_time']).format('HH:mm:ss')
    var until = getTimeUntil(item['disappear_time'])
    var udist = (until.hour > 0) ? until.hour + ':' : ''
    udist += lpad(until.min, 2, 0) + 'm' + lpad(until.sec, 2, 0) + 's'
    find = ['<dist>', '<udist>']
    replace = [dist, udist]
    var ntext = repArray(notifyText, find, replace)

    return {
        'fav_title': ntitle,
        'fav_text': ntext
    }
}

function playPokemonSound(pokemonID, cryFileTypes) {
    if (!Store.get('playSound')) {
        return
    }

    if (!Store.get('playCries')) {
        audio.play()
    } else {
        // Stop if we don't have any supported filetypes left.
        if (cryFileTypes.length === 0) {
            return
        }

        // Try to load the first filetype in the list.
        const filetype = cryFileTypes.shift()
        const audioCry = new Audio('static/sounds/cries/' + pokemonID + '.' + filetype)

        audioCry.play().catch(function (err) {
            // Try a different filetype.
            if (err) {
                console.log('Sound filetype %s for Pokémon %s is missing.', filetype, pokemonID)

                // If there's more left, try something else.
                playPokemonSound(pokemonID, cryFileTypes)
            }
        })
    }
}

function isNotifyPerfectionPoke(poke) {
    var hasHighAttributes = false
    var hasHighIV = false
    var baseHeight = 0
    var baseWeight = 0
    var ratio = 0

    // Notify for IV.
    if (poke['individual_attack'] != null) {
        const perfection = getIv(poke['individual_attack'], poke['individual_defense'], poke['individual_stamina'])
        hasHighIV = notifiedMinPerfection > 0 && perfection >= notifiedMinPerfection
        const shouldNotifyForIV = (hasHighIV && notifiedMinLevel <= 0)

        hasHighAttributes = shouldNotifyForIV
    }

    // Or notify for level. If IV filter is enabled, this is an AND relation.
    if (poke['cp_multiplier'] !== null) {
        const level = getPokemonLevel(poke['cp_multiplier'])
        const hasHighLevel = notifiedMinLevel > 0 && level >= notifiedMinLevel
        const shouldNotifyForLevel = (hasHighLevel && (hasHighIV || notifiedMinPerfection <= 0))

        hasHighAttributes = hasHighAttributes || shouldNotifyForLevel
    }

    if (poke['cp_multiplier'] !== null) {
        if (Store.get('showMedalMagikarp') && poke['pokemon_id'] === 129) {
            baseHeight = 0.90
            baseWeight = 10.00
            ratio = sizeRatio(poke['height'], poke['weight'], baseHeight, baseWeight)
            if (ratio > 2.5) {
                hasHighAttributes = true
            }
        } else if (Store.get('showMedalRattata') && poke['pokemon_id'] === 19) {
            baseHeight = 0.30
            baseWeight = 3.50
            ratio = sizeRatio(poke['height'], poke['weight'], baseHeight, baseWeight)
            if (ratio < 1.5) {
                hasHighAttributes = true
            }
        }
    }

    return hasHighAttributes
}

function sizeRatio(height, weight, baseHeight, baseWeight) {
    var heightRatio = height / baseHeight
    var weightRatio = weight / baseWeight

    return heightRatio + weightRatio
}

function isNotifyPoke(poke) {
    const isOnNotifyList = notifiedPokemon.indexOf(poke['pokemon_id']) > -1 || notifiedRarity.indexOf(poke['pokemon_rarity']) > -1
    const isNotifyPerfectionPkmn = isNotifyPerfectionPoke(poke)
    const showStats = Store.get('showPokemonStats')

    return isOnNotifyList || (showStats && isNotifyPerfectionPkmn)
}

function getNotifyPerfectionPokemons(pokemonList) {
    var notifyPerfectionPkmn = []
    $.each(pokemonList, function (key, value) {
        var item = pokemonList[key]

        if (isNotifyPerfectionPoke(item)) {
            notifyPerfectionPkmn.push(item)
        }
    })

    return notifyPerfectionPkmn
}

function customizePokemonMarker(marker, item, skipNotification) {
    var notifyText = getNotifyText(item)
    marker.setBouncingOptions({
        bounceHeight: 20,   // height of the bouncing
        bounceSpeed: 80,   // bouncing speed coefficient
        elastic: false,
        shadowAngle: null
    })
    marker.on('mouseover', function () {
        this.stopBouncing()
        this.animationDisabled = true
    })

    if (!marker.rangeCircle && isRangeActive(map)) {
        marker.rangeCircle = addRangeCircle(marker, map, 'pokemon')
    }
    marker.bindPopup(pokemonLabel(item))

    if (isNotifyPoke(item)) {
        if (!skipNotification) {
            playPokemonSound(item['pokemon_id'], cryFileTypes)
            sendNotification(notifyText.fav_title, notifyText.fav_text, getPokemonRawIconUrl(item), item['latitude'], item['longitude'])
        }
        if (marker.animationDisabled !== true) {
            marker.bounce()
        }
    }

    addListeners(marker)
}

function setupGymMarker(item) {
    var marker = L.marker([item['latitude'], item['longitude']])
    markers.addLayer(marker)
    updateGymMarker(item, marker)
    if (!marker.rangeCircle && isRangeActive(map)) {
        marker.rangeCircle = addRangeCircle(marker, map, 'gym', item['team_id'])
    }

    if (Store.get('useGymSidebar')) {
        marker.on('click', function () {
            var gymSidebar = document.querySelector('#gym-details')
            if (gymSidebar.getAttribute('data-id') === item['gym_id'] && gymSidebar.classList.contains('visible')) {
                gymSidebar.classList.remove('visible')
            } else {
                gymSidebar.setAttribute('data-id', item['gym_id'])
                showGymDetails(item['gym_id'])
            }
        })

        if (!isMobileDevice() && !isTouchDevice()) {
            marker.on('mouseover', function () {
                marker.openPopup()
                clearSelection()
                updateLabelDiffTime()
            })
        }

        marker.on('mouseout', function () {
            marker.closePopup()
            clearSelection()
            updateLabelDiffTime()
        })
    } else {
        addListeners(marker)
    }

    return marker
}

function updateGymMarker(item, marker) {
    let raidLevel = getRaidLevel(item.raid)
    let markerImage = ''
    var zIndexOffset
    if (item.raid && isOngoingRaid(item.raid) && Store.get('showRaids') && raidLevel >= Store.get('showRaidMinLevel') && raidLevel <= Store.get('showRaidMaxLevel')) {
        markerImage = 'gym_img?team=' + gymTypes[item.team_id] + '&level=' + getGymLevel(item) + '&raidlevel=' + item['raid']['level'] + '&pkm=' + item['raid']['pokemon_id']
        zIndexOffset = 100
    } else if (item.raid && item.raid.end > Date.now() && Store.get('showRaids') && !Store.get('showActiveRaidsOnly') && raidLevel >= Store.get('showRaidMinLevel') && raidLevel <= Store.get('showRaidMaxLevel')) {
        markerImage = 'gym_img?team=' + gymTypes[item.team_id] + '&level=' + getGymLevel(item) + '&raidlevel=' + item['raid']['level']
        zIndexOffset = 20
    } else {
        markerImage = 'gym_img?team=' + gymTypes[item.team_id] + '&level=' + getGymLevel(item)
        zIndexOffset = 10
    }
    if (item['is_in_battle']) {
        markerImage += '&in_battle=1'
    }
    var GymIcon = new L.Icon({
        iconUrl: markerImage,
        iconSize: [48, 48]
    })
    marker.setIcon(GymIcon)
    marker.setZIndexOffset = zIndexOffset
    if (!Store.get('useGymSidebar')) { marker.bindPopup(gymLabel(item)) }
    return marker
}

function setupPokestopMarker(item) {

    var icon = build_quest_small(item['quest_raw']['quest_reward_type_raw'], item['quest_raw']['item_id'], item['quest_raw']['pokemon_id'], item['lure_expiration'])	
    var marker = L
        .marker([item['latitude'], item['longitude']], {icon: icon, zIndexOffset: item['lure_expiration'] ? 3 : 2})
        .bindPopup(pokestopLabel(item))
    markers.addLayer(marker)
    if (!marker.rangeCircle && isRangeActive(map)) {
        marker.rangeCircle = addRangeCircle(marker, map, 'pokestop')
    }
    addListeners(marker)
    return marker
}

function build_quest_small(quest_reward_type_raw, quest_item_id, quest_pokemon_id, lure){

	var image
	var size
	var anchor
	
	if (quest_reward_type_raw == null) {
		quest_reward_type_raw == '0'
	}
	
	switch(quest_reward_type_raw) {
		
	case '2':
		image = 'static/quest/reward_' + quest_item_id + '_1.png'
		size = [30, 30]
		anchor = [30, 20]
		break
	case '3':
		image = 'static/quest/reward_stardust.png'
		size = [30, 30]
		anchor = [30, 20]
		break
	case '7':
		var formParam = '';
		if (quest_pokemon_id === '327') {
			let formParam = `&form=11`

		}
		if (generateImages) {
			image = `pkm_img?pkm=${quest_pokemon_id}${formParam}`
			size = [35, 35]
			anchor = [30, 30]
		} else {
			image = pokemonSprites(quest_pokemon_id).filename
			size = [40, 40]
			anchor = [30, 30]
		}
		break
	}
	
	var imagename = quest_reward_type_raw ? 'PokestopQuest' : 'Pokestop'
	var imagename = lure ? 'PokestopLured' : imagename
	
	var icon =  L.icon({
        iconUrl: 'static/images/pokestop/' + imagename + '.png',
        iconSize: [32, 32],
		shadowUrl: image,
		shadowSize: size,
		shadowAnchor: anchor
	})
	
	return icon;
}


function getColorByDate(value) {
    // Changes the color from red to green over 15 mins
    var diff = (Date.now() - value) / 1000 / 60 / 15

    if (diff > 1) {
        diff = 1
    }

    // value from 0 to 1 - Green to Red
    var hue = ((1 - diff) * 120).toString(10)
    return ['hsl(', hue, ',100%,50%)'].join('')
}

function setupScannedMarker(item) {
    var rangeCircleOpts = {
        clickable: false,
        center: [item['latitude'], item['longitude']],
        radius: (showConfig.pokemons === true ? 70 : 450), // metres
        color: getColorByDate(item['last_modified']),
        opacity: 0.1,
        strokeWeight: 1,
        strokeOpacity: 0.5
    }

    var circle = L.circle([item['latitude'], item['longitude']], rangeCircleOpts)
    markersnotify.addLayer(circle)
    return circle
}

function getColorBySpawnTime(value) {
    var now = new Date()
    var seconds = now.getMinutes() * 60 + now.getSeconds()

    // account for hour roll-over
    if (seconds < 900 && value > 2700) {
        seconds += 3600
    } else if (seconds > 2700 && value < 900) {
        value += 3600
    }

    var diff = (seconds - value)
    // hue, 100% saturation, 50% lightness
    var hue = 275 // light purple when spawn is neither about to spawn nor active
    if (diff >= 0 && diff <= 1800) { // green to red over 30 minutes of active spawn
        hue = (1 - (diff / 60 / 30)) * 120
    } else if (diff < 0 && diff > -300) { // light blue to dark blue over 5 minutes til spawn
        hue = ((1 - (-diff / 60 / 5)) * 50) + 200
    }

    hue = Math.round(hue / 5) * 5

    return colourConversion.hsvToHex(hue, 1.0, 1.0)
}

var colourConversion = (function () {
    var self = {}

    self.hsvToHex = function (hue, sat, val) {
        if (hue > 360 || hue < 0 || sat > 1 || sat < 0 || val > 1 || val < 0) {
            console.log('{colourConverion.hsvToHex} illegal input')
            return '#000000'
        }
        let rgbArray = hsvToRgb(hue, sat, val)
        return rgbArrayToHexString(rgbArray)
    }

    function rgbArrayToHexString(rgbArray) {
        let hexString = '#'
        for (var i = 0; i < rgbArray.length; i++) {
            let hexOfNumber = rgbArray[i].toString(16)
            if (hexOfNumber.length === 1) {
                hexOfNumber = '0' + hexOfNumber
            }
            hexString += hexOfNumber
        }
        if (hexString.length !== 7) {
            console.log('Hexstring not complete for colours...')
        }
        return hexString
    }

    function mod(n, m) {
        return ((n % m) + m) % m
    }

    function hsvToRgb(hue, sat, val) {
        let hder = Math.floor(hue / 60)
        let f = hue / 60 - hder
        let p = val * (1 - sat)
        let q = val * (1 - sat * f)
        let t = val * (1 - sat * (1 - f))
        var rgb
        if (sat === 0) {
            rgb = [val, val, val]
        } else if (hder === 0 || hder === 6) {
            rgb = [val, t, p]
        } else if (hder === 1) {
            rgb = [q, val, p]
        } else if (hder === 2) {
            rgb = [p, val, t]
        } else if (hder === 3) {
            rgb = [p, q, val]
        } else if (hder === 4) {
            rgb = [t, p, val]
        } else if (hder === 5) {
            rgb = [val, p, q]
        } else {
            console.log('Failed converting HSV to RGB')
        }
        for (var i = 0; i < rgb.length; i++) {
            rgb[i] = Math.round(rgb[i] * 255)
        }
        return rgb
    }
    return self
})()

function changeSpawnIcon(color, zoom) {
    var urlColor = ''
    if (color === 275) {
        urlColor = './static/icons/hsl-275-light.png'
    } else {
        urlColor = './static/icons/hsl-' + color + '.png'
    }
    var zoomScale = 1.6 // adjust this value to change the size of the spawnpoint icons
    var minimumSize = 1
    var newSize = Math.round(zoomScale * (zoom - 10)) // this scales the icon based on zoom
    if (newSize < minimumSize) {
        newSize = minimumSize
    }

    var newIcon = L.icon({
        iconUrl: urlColor,
        iconSize: [newSize, newSize],
        iconAnchor: [newSize / 2, newSize / 2]
    })

    return newIcon
}

function spawnPointIndex(color) {
    var newIndex = 1
    var scale = 0
    if (color >= 0 && color <= 120) { // high to low over 15 minutes of active spawn
        scale = color / 120
        newIndex = 100 + scale * 100
    } else if (color >= 200 && color <= 250) { // low to high over 5 minutes til spawn
        scale = (color - 200) / 50
        newIndex = scale * 100
    }

    return newIndex
}

function rgbToHex(r, g, b) {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

function setupSpawnpointMarker(item) {
    var hue = getColorBySpawnTime(item.appear_time)
    var rangeCircleOpts = {
        radius: 4, // meters
        weight: 1,
        color: hue,
        opacity: 1,
        center: [item['latitude'], item['longitude']],
        fillColor: hue,
        fillOpacity: 1
    }

    var circle = L.circle([item['latitude'], item['longitude']], rangeCircleOpts).bindPopup(spawnpointLabel(item))
    addListeners(circle)
    markersnotify.addLayer(circle)
    return circle
}

function clearSelection() {
    if (document.selection) {
        document.selection.empty()
    } else if (window.getSelection) {
        window.getSelection().removeAllRanges()
    }
}

function addListeners(marker) {
    marker.on('click', function () {
        if (!marker.infoWindowIsOpen) {
            marker.openPopup()
            clearSelection()
            updateLabelDiffTime()
            marker.persist = true
            marker.infoWindowIsOpen = true
        } else {
            marker.persist = null
            marker.closePopup()
            marker.infoWindowIsOpen = false
        }
    })

    if (!isMobileDevice() && !isTouchDevice()) {
        marker.on('mouseover', function () {
            marker.openPopup()
            clearSelection()
            updateLabelDiffTime()
        })
    }

    marker.on('mouseout', function () {
        if (!marker.persist) {
            marker.closePopup()
        }
    })

    return marker
}

function clearStaleMarkers() {
    $.each(mapData.pokemons, function (key, pokemon) {
        const pokemonId = pokemon['pokemon_id']
        const isPokeExpired = pokemon['disappear_time'] < Date.now()
        const isPokeExcluded = getExcludedPokemon().indexOf(pokemonId) !== -1
        // Limit choice to our options [0, 5].
        const excludedRarityOption = Math.min(Math.max(Store.get('excludedRarity'), 0), 5)
        const excludedRarity = excludedRaritiesList[excludedRarityOption]
        const pokemonRarity = getPokemonRarity(pokemon['pokemon_id'])
        const isRarityExcluded = excludedRarity.indexOf(pokemonRarity) !== -1
        const isNotifyPkmn = isNotifyPoke(pokemon)
        var prionotifyactiv = Store.get('prioNotify')

        if (isPokeExpired || isPokeExcluded || isRarityExcluded) {
            if ((isNotifyPkmn && !prionotifyactiv) || (!isNotifyPkmn)) {
                const oldMarker = pokemon.marker
                const isPokeExcludedByRarity = excludedPokemonByRarity.indexOf(pokemonId) !== -1

                if (isRarityExcluded && !isPokeExcludedByRarity) {
                    excludedPokemonByRarity.push(pokemonId)
                }

                if (oldMarker.rangeCircle) {
                    markers.removeLayer(oldMarker.rangeCircle)
                    markersnotify.removeLayer(oldMarker.rangeCircle)
                    delete oldMarker.rangeCircle
                }

                markers.removeLayer(oldMarker)
                markersnotify.removeLayer(oldMarker)
                delete mapData.pokemons[key]
            }
        }
    })

    $.each(mapData.lurePokemons, function (key, lurePokemon) {
        if (lurePokemon['lure_expiration'] < new Date().getTime() ||
            getExcludedPokemon().indexOf(lurePokemon['pokemon_id']) >= 0) {
            markers.removeLayer(lurePokemon.marker)
            markersnotify.removeLayer(lurePokemon.marker)
            delete mapData.lurePokemons[key]
        }
    })

    $.each(mapData.scanned, function (key, scanned) {
        // If older than 15mins remove
        if (scanned['last_modified'] < (new Date().getTime() - 15 * 60 * 1000)) {
            markersnotify.removeLayer(scanned.marker)
            delete mapData.scanned[key]
        }
    })
}

function showInBoundsMarkers(markersInput, type) {
    $.each(markersInput, function (key, value) {
        const item = markersInput[key]
        const marker = item.marker
        var show = false

        if (!item.hidden) {
            if (typeof marker.getLatLng === 'function') {
                if (map.getBounds().contains(marker.getLatLng())) {
                    show = true
                }
            } else if (type === 's2cell') {
                if (map.getBounds().intersects(getS2CellBounds(item))) {
                    show = true
                }
            }
        }
        // Marker has an associated range.
        if (show && rangeMarkers.indexOf(type) !== -1) {
            // No range circle yet... let's create one.
            if (!marker.rangeCircle) {
                // But only if range is active.
                if (isRangeActive(map)) {
                    if (type === 'gym') marker.rangeCircle = addRangeCircle(marker, map, type, item.team_id)
                    else marker.rangeCircle = addRangeCircle(marker, map, type)
                }
            } else { // There's already a range circle.
                if (isRangeActive(map)) {
                    markers.addLayer(marker.rangeCircle)
                } else {
                    markers.removeLayer(marker.rangeCircle)
                    markersnotify.removeLayer(marker.rangeCircle)
                    delete marker.rangeCircle
                }
            }
        }
    })
}

function loadRawData() {
    var userAuthCode = localStorage.getItem('userAuthCode')
    var loadPokemon = Store.get('showPokemon')
    var loadGyms = (Store.get('showGyms') || Store.get('showRaids'))
    var loadPokestops = Store.get('showPokestops')
    var loadScanned = Store.get('showScanned')
    var loadSpawnpoints = Store.get('showSpawnpoints')
    var loadLuredOnly = Store.get('showLuredPokestopsOnly')
    var loadWeather = Store.get('showWeatherCells')
    var loadS2Cells = Store.get('showS2Cells')
    var loadWeatherAlerts = Store.get('showWeatherAlerts')
    var prionotifyactiv = Store.get('prioNotify')

    var bounds = map.getBounds()
    var swPoint = bounds.getSouthWest()
    var nePoint = bounds.getNorthEast()
    var swLat = swPoint.lat
    var swLng = swPoint.lng
    var neLat = nePoint.lat
    var neLng = nePoint.lng

    return $.ajax({
        url: 'raw_data',
        type: 'GET',
        data: {
            'userAuthCode': userAuthCode,
            'timestamp': timestamp,
            'pokemon': loadPokemon,
            'lastpokemon': lastpokemon,
            'pokestops': loadPokestops,
            'lastpokestops': lastpokestops,
            'luredonly': loadLuredOnly,
            'gyms': loadGyms,
            'lastgyms': lastgyms,
            'scanned': loadScanned,
            'lastslocs': lastslocs,
            'spawnpoints': loadSpawnpoints,
            'weather': loadWeather,
            's2cells': loadS2Cells,
            'weatherAlerts': loadWeatherAlerts,
            'lastspawns': lastspawns,
            'swLat': swLat,
            'swLng': swLng,
            'neLat': neLat,
            'neLng': neLng,
            'oSwLat': oSwLat,
            'oSwLng': oSwLng,
            'oNeLat': oNeLat,
            'oNeLng': oNeLng,
            'reids': String(isShowAllZoom() ? excludedPokemon : reincludedPokemon),
            'eids': String(getExcludedPokemon()),
            'prionotify': prionotifyactiv
        },
        dataType: 'json',
        cache: false,
        beforeSend: function () {
            if (rawDataIsLoading) {
                return false
            } else {
                rawDataIsLoading = true
            }
        },
        error: function () {
            // Display error toast
            toastr['error']('Please check connectivity or reduce marker settings.', 'Error getting data')
            toastr.options = {
                'closeButton': true,
                'debug': false,
                'newestOnTop': true,
                'progressBar': false,
                'positionClass': 'toast-top-right',
                'preventDuplicates': true,
                'onclick': null,
                'showDuration': '300',
                'hideDuration': '1000',
                'timeOut': '25000',
                'extendedTimeOut': '1000',
                'showEasing': 'swing',
                'hideEasing': 'linear',
                'showMethod': 'fadeIn',
                'hideMethod': 'fadeOut'
            }
        },
        success: function (data) {
            if (data.auth_redirect) {
                window.location = data.auth_redirect
            }
        },
        complete: function () {
            rawDataIsLoading = false
        }
    })
}

function processPokemons(pokemon) {
    if (!Store.get('showPokemon')) {
        return false // In case the checkbox was unchecked in the meantime.
    }
    // Process Pokémon per chunk of total so we don't overwhelm the client and
    // allow redraws in between. We enable redraw in addMarkers, which doesn't
    // repaint/reset all previous markers but only draws new ones.
    processPokemonChunked(pokemon, Store.get('processPokemonChunkSize'))
}

function getPokemonGen(p) {
    return pokemonGen[p] || '?'
}

function processPokemonChunked(pokemon, chunkSize) {
    // Early skip if we have nothing to process.
    if (typeof pokemon === 'undefined' || pokemon.length === 0) {
        return
    }
    const oldMarkers = []
    const newMarkers = []
    const chunk = pokemon.splice(-1 * chunkSize)

    $.each(chunk, function (i, poke) {
        // Early skip if we've already stored this spawn or if it's expiring
        // too soon.
        const encounterId = poke.encounter_id
        const expiringSoon = (poke.disappear_time < (Date.now() + 3000))
        if (mapData.pokemons.hasOwnProperty(encounterId) || expiringSoon) {
            return
        }
        const _markers = processPokemon(poke)
        const newMarker = _markers[0]
        const oldMarker = _markers[1]
        const isNotifyPkmn = isNotifyPoke(poke)

        if (newMarker) {
            if (isNotifyPkmn) {
                markersnotify.addLayer(newMarker)
            } else {
                markers.addLayer(newMarker)
            }
        }

        if (oldMarker) {
            markers.removeLayer(oldMarker)
            markersnotify.removeLayer(oldMarker)
        }
    })

    if (pokemon.length > 0) {
        setTimeout(function () {
            processPokemonChunked(pokemon, chunkSize)
        }, Store.get('processPokemonIntervalMs'))
    }
}

function processPokemon(item) {
    const isPokeExcluded = getExcludedPokemon().indexOf(item['pokemon_id']) !== -1
    const isPokeAlive = item['disappear_time'] > Date.now()

    // Limit choice to our options [0, 5].
    const excludedRarityOption = Math.min(Math.max(Store.get('excludedRarity'), 0), 5)
    const excludedRarity = excludedRaritiesList[excludedRarityOption]
    const pokemonRarity = getPokemonRarity(item['pokemon_id'])
    const isRarityExcluded = (excludedRarity.indexOf(pokemonRarity) !== -1)
    const isPokeExcludedByRarity = excludedPokemonByRarity.indexOf(item['pokemon_id']) !== -1
    const isNotifyPkmn = isNotifyPoke(item)
    var prionotifyactiv = Store.get('prioNotify')
    var oldMarker = null
    var newMarker = null
    if ((!(item['encounter_id'] in mapData.pokemons) &&
         !isPokeExcluded && !isRarityExcluded && isPokeAlive) || (!(item['encounter_id'] in mapData.pokemons) && isNotifyPkmn && prionotifyactiv)) {
    // Add marker to map and item to dict.
        const isNotifyPkmn = isNotifyPoke(item)
        if (!item.hidden && (!Store.get('hideNotNotified') || isNotifyPkmn)) {
            const isBounceDisabled = Store.get('isBounceDisabled')
            const scaleByRarity = Store.get('scaleByRarity')
            if (item.marker) {
                markers.removeLayer(item)
                markersnotify.removeLayer(item)
            }
            newMarker = setupPokemonMarker(item, map, isBounceDisabled, scaleByRarity, isNotifyPkmn)
            customizePokemonMarker(newMarker, item, !Store.get('showPopups'))
            item.marker = newMarker

            mapData.pokemons[item['encounter_id']] = item
        } else {
            oldMarker = item.marker
        }
    } else if (isRarityExcluded && !isPokeExcludedByRarity) {
        excludedPokemonByRarity.push(item['pokemon_id'])
    }

    return [newMarker, oldMarker]
}

function processPokestop(i, item) {
    if (!Store.get('showPokestops')) {
        return false
    }

    if (Store.get('showLuredPokestopsOnly') == 1 && !item['lure_expiration']) {
        return true
	}
    if (Store.get('showLuredPokestopsOnly') == 3){
	return false
	}
    if (Store.get('showLuredPokestopsOnly') == 4){
        return false
        }
    if (Store.get('showLuredPokestopsOnly') == 5){
        return false
        }

    //if (Store.get('showLuredPokestopsOnly') == 2 && !item['quest_raw']) {
    //    return true
		//}

    if (!mapData.pokestops[item['pokestop_id']]) { // new pokestop, add marker to map and item to dict
        if (item.marker && item.marker.rangeCircle) {
            markers.removeLayer(item.marker.rangeCircle)
        }
        if (item.marker) {
            markers.removeLayer(item.marker)
        }
        item.marker = setupPokestopMarker(item)
        mapData.pokestops[item['pokestop_id']] = item
    } else { // change existing pokestop marker to unlured/lured
        var item2 = mapData.pokestops[item['pokestop_id']]
        if (!!item['lure_expiration'] !== !!item2['lure_expiration']) {
            if (item2.marker && item2.marker.rangeCircle) {
                markers.removeLayer(item2.marker.rangeCircle)
            }
            markers.removeLayer(item2.marker)
            item.marker = setupPokestopMarker(item)
            mapData.pokestops[item['pokestop_id']] = item
        }
    }
}

function updatePokestops() {
    if (!Store.get('showPokestops')) {
        return false
    }

    var removeStops = []
    var currentTime = new Date().getTime()

    // change lured pokestop marker to unlured when expired
    $.each(mapData.pokestops, function (key, value) {
        if (value['lure_expiration'] && value['lure_expiration'] < currentTime) {
            value['lure_expiration'] = null
            if (value.marker && value.marker.rangeCircle) {
                markers.removeLayer(value.marker.rangeCircle)
            }
            markers.removeLayer(value.marker)
            value.marker = setupPokestopMarker(value)
        }
    })

    // remove unlured stops if show lured only is selected
    if (Store.get('showLuredPokestopsOnly') == 1) {
        $.each(mapData.pokestops, function (key, value) {
            if (!value['lure_expiration']) {
                removeStops.push(key)
            }
        })
        $.each(removeStops, function (key, value) {
            if (mapData.pokestops[value] && mapData.pokestops[value].marker) {
                if (mapData.pokestops[value].marker.rangeCircle) {
                    markers.removeLayer(mapData.pokestops[value].marker.rangeCircle)
                }
                markers.removeLayer(mapData.pokestops[value].marker)
                delete mapData.pokestops[key]
            }
        })
    }
    if (Store.get('showLuredPokestopsOnly') == 2) {
        $.each(mapData.pokestops, function (key, value) {
            if (!value['quest_raw']['is_quest']) {
                removeStops.push(key)
            }
        })
        $.each(removeStops, function (key, value) {
            if (mapData.pokestops[value] && mapData.pokestops[value].marker) {
                if (mapData.pokestops[value].marker.rangeCircle) {
                    markers.removeLayer(mapData.pokestops[value].marker.rangeCircle)
                }
                markers.removeLayer(mapData.pokestops[value].marker)
                delete mapData.pokestops[key]
            }
        })
    }
    if (Store.get('showLuredPokestopsOnly') == 3) {
        $.each(mapData.pokestops, function (key, value) {
	    if (!value['quest_raw']['item_type']){
		removeStops.push(key)
	    }
            else if (value['quest_raw']['item_type'] !== "Rare Candy") {
                removeStops.push(key)
            }
	
        })
        $.each(removeStops, function (key, value) {
            if (mapData.pokestops[value] && mapData.pokestops[value].marker) {
                if (mapData.pokestops[value].marker.rangeCircle) {
                    markers.removeLayer(mapData.pokestops[value].marker.rangeCircle)
                }
                markers.removeLayer(mapData.pokestops[value].marker)
                delete mapData.pokestops[key]
            }
        })
    }
    if (Store.get('showLuredPokestopsOnly') == 4) {
        $.each(mapData.pokestops, function (key, value) {
            if (!value['quest_raw']['item_type']){
                removeStops.push(key)
            }
            else if (value['quest_raw']['item_type'] !== "Silver Pinap") {
                removeStops.push(key)
            }

        })
        $.each(removeStops, function (key, value) {
            if (mapData.pokestops[value] && mapData.pokestops[value].marker) {
                if (mapData.pokestops[value].marker.rangeCircle) {
                    markers.removeLayer(mapData.pokestops[value].marker.rangeCircle)
                }
                markers.removeLayer(mapData.pokestops[value].marker)
                delete mapData.pokestops[key]
            }
        })
    }
}

function processGym(i, item) {
    var gymLevel = getGymLevel(item)
    var raidLevel = getRaidLevel(item.raid)

    if (!Store.get('showGyms') && !Store.get('showRaids')) {
        return false // in case the checkbox was unchecked in the meantime.
    }

    var removeGymFromMap = function (gymid) {
        if (mapData.gyms[gymid] && mapData.gyms[gymid].marker) {
            if (mapData.gyms[gymid].marker.rangeCircle) {
                markers.removeLayer(mapData.gyms[gymid].marker.rangeCircle)
            }
            markers.removeLayer(mapData.gyms[gymid].marker)
            delete mapData.gyms[gymid]
        }
    }

    if (Store.get('showOpenGymsOnly')) {
        if (item.slots_available === 0) {
            removeGymFromMap(item['gym_id'])
            return true
        }
    }
     
    if (Store.get('showParkGymsOnly')) {
        if (!item.park) {
            removeGymFromMap(item['gym_id'])
            return true
        }
    }

    if (!Store.get('showGyms')) {
        if (Store.get('showRaids') && !isValidRaid(item.raid)) {
            removeGymFromMap(item['gym_id'])
            return true
        }
        
        if (Store.get('showParkRaidsOnly')) {
            if (!item.park) {
                removeGymFromMap(item['gym_id'])
                return true
            }
        }

        if (Store.get('showActiveRaidsOnly')) {
            if (!isOngoingRaid(item.raid)) {
                removeGymFromMap(item['gym_id'])
                return true
            }
        }

        if (raidLevel > Store.get('showRaidMaxLevel') || raidLevel < Store.get('showRaidMinLevel')) {
            removeGymFromMap(item['gym_id'])
            return true
        }
    }

    if (Store.get('showTeamGymsOnly') && Store.get('showTeamGymsOnly') !== item.team_id) {
        removeGymFromMap(item['gym_id'])
        return true
    }

    if (Store.get('showGymInBattle')) {
        if (!item.is_in_battle) {
            removeGymFromMap(item['gym_id'])
            return true
        }
    }

    if (Store.get('showLastUpdatedGymsOnly')) {
        var now = new Date()
        if ((Store.get('showLastUpdatedGymsOnly') * 3600 * 1000) + item.last_scanned < now.getTime()) {
            removeGymFromMap(item['gym_id'])
            return true
        }
    }

    if (gymLevel < Store.get('minGymLevel')) {
        removeGymFromMap(item['gym_id'])
        return true
    }

    if (gymLevel > Store.get('maxGymLevel')) {
        removeGymFromMap(item['gym_id'])
        return true
    }

    if (item['gym_id'] in mapData.gyms) {
        item.marker = updateGymMarker(item, mapData.gyms[item['gym_id']].marker)
    } else { // add marker to map and item to dict
        item.marker = setupGymMarker(item)
    }
    mapData.gyms[item['gym_id']] = item
}

function processScanned(i, item) {
    if (!Store.get('showScanned')) {
        return false
    }

    var scanId = item['latitude'] + '|' + item['longitude']

    if (!(scanId in mapData.scanned)) { // add marker to map and item to dict
        if (item.marker) {
            markersnotify.removeLayer(item.marker)
        }
        item.marker = setupScannedMarker(item)
        mapData.scanned[scanId] = item
    } else {
        mapData.scanned[scanId].last_modified = item['last_modified']
    }
}

function updateScanned() {
    if (!Store.get('showScanned')) {
        return false
    }

    $.each(mapData.scanned, function (key, value) {
        if (map.getBounds().contains(value.marker.getLatLng())) {
            var color = getColorByDate(value['last_modified'])
            value.marker.setStyle({color: color, fillColor: color})
        }
    })
}

function processSpawnpoint(i, item) {
    if (!Store.get('showSpawnpoints')) {
        return false
    }

    var id = item['id']

    if (!(id in mapData.spawnpoints)) { // add marker to map and item to dict
        if (item.marker) {
            markersnotify.removeLayer(item.marker)
        }
        item.marker = setupSpawnpointMarker(item)
        mapData.spawnpoints[id] = item
    }
}

function updateSpawnPoints() {
    if (!Store.get('showSpawnpoints')) {
        return false
    }

    $.each(mapData.spawnpoints, function (key, value) {
        if (map.getBounds().contains(value.marker.getLatLng())) {
            var hue = getColorBySpawnTime(value['appear_time'])
            value.marker.setStyle({color: hue, fillColor: hue})
        }
    })
}

function updateMap() {
    loadRawData().done(function (result) {
        processPokemons(result.pokemons)
        $.each(result.pokestops, processPokestop)
        $.each(result.gyms, processGym)
        $.each(result.scanned, processScanned)
        $.each(result.spawnpoints, processSpawnpoint)
        $.each(result.weather, processWeather)
        $.each(result.s2cells, processS2Cell)
        processWeatherAlerts(result.weatherAlerts)
        updateMainCellWeather()
        showInBoundsMarkers(mapData.lurePokemons, 'pokemon')
        showInBoundsMarkers(mapData.gyms, 'gym')
        showInBoundsMarkers(mapData.pokestops, 'pokestop')
        showInBoundsMarkers(mapData.scanned, 'scanned')
        showInBoundsMarkers(mapData.spawnpoints, 'inbound')
        showInBoundsMarkers(mapData.weather, 'weather')
        showInBoundsMarkers(mapData.s2cells, 's2cell')
        showInBoundsMarkers(mapData.weatherAlerts, 's2cell')
        clearStaleMarkers()

        // We're done processing. Redraw.
        markers.refreshClusters()

        updateScanned()
        updateSpawnPoints()
        updatePokestops()

        if ($('#stats').hasClass('visible')) {
            countMarkers(map)
        }

        oSwLat = result.oSwLat
        oSwLng = result.oSwLng
        oNeLat = result.oNeLat
        oNeLng = result.oNeLng

        lastgyms = result.lastgyms
        lastpokestops = result.lastpokestops
        lastpokemon = result.lastpokemon
        lastslocs = result.lastslocs
        lastspawns = result.lastspawns

        reids = result.reids
        if (reids instanceof Array) {
            reincludedPokemon = reids.filter(function (e) {
                return this.indexOf(e) < 0
            }, reincludedPokemon)
        }
        timestamp = result.timestamp
        lastUpdateTime = Date.now()
    })
}

function redrawPokemon(pokemonList) {
    $.each(pokemonList, function (key, value) {
        var item = pokemonList[key]

        if (!item.hidden) {
            const scaleByRarity = Store.get('scaleByRarity')
            const isNotifyPkmn = isNotifyPoke(item)
            updatePokemonMarker(item, map, scaleByRarity, isNotifyPkmn)
        }
    })
}

var updateLabelDiffTime = function () {
    $('.label-countdown').each(function (index, element) {
        var disappearsAt = getTimeUntil(parseInt(element.getAttribute('disappears-at')))

        var hours = disappearsAt.hour
        var minutes = disappearsAt.min
        var seconds = disappearsAt.sec
        var timestring = ''

        if (disappearsAt.ttime < disappearsAt.now) {
            timestring = '(expired)'
        } else {
            timestring = lpad(hours, 2, 0) + ':' + lpad(minutes, 2, 0) + ':' + lpad(seconds, 2, 0)
        }

        $(element).text(timestring)
    })
}

function getPointDistance(origin, destination) {
    // return distance in meters
    var lon1 = toRadian(origin.lng)
    var lat1 = toRadian(origin.lat)
    var lon2 = toRadian(destination.lng)
    var lat2 = toRadian(destination.lat)
    var deltaLat = lat2 - lat1
    var deltaLon = lon2 - lon1

    var a = Math.pow(Math.sin(deltaLat / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(deltaLon / 2), 2)
    var c = 2 * Math.asin(Math.sqrt(a))
    var EARTH_RADIUS = 6371
    return c * EARTH_RADIUS * 1000
}

function toRadian(degree) {
    return degree * Math.PI / 180
}

function sendNotification(title, text, icon, lat, lon) {
    var notificationDetails = {
        icon: icon,
        body: text,
        data: {
            lat: lat,
            lon: lon
        }
    }

    if (Push._agents.desktop.isSupported()) {
        /* This will only run in browsers which support the old
         * Notifications API. Browsers supporting the newer Push API
         * are handled by serviceWorker.js. */
        notificationDetails.onClick = function (event) {
            if (Push._agents.desktop.isSupported()) {
                window.focus()
                event.currentTarget.close()
                map.setView(new L.LatLng(lat, lon), 20)
            }
        }
    }

    /* Push.js requests the Notification permission automatically if
     * necessary. */
    Push.create(title, notificationDetails).catch(function () {
        /* Don't do anything if the user denies the Notifications
         * permission, it means they don't want notifications. Push.js
         * will fall back to toastr if Notifications are not supported. */
    })
}

function sendToastrPokemonNotification(title, text, icon, lat, lon) {
    var notification = toastr.info(text, title, {
        closeButton: true,
        positionClass: 'toast-top-right',
        preventDuplicates: true,
        onclick: function () {
            map.setView(new L.LatLng(lat, lon), 20)
        },
        showDuration: '300',
        hideDuration: '500',
        timeOut: '6000',
        extendedTimeOut: '1500',
        showEasing: 'swing',
        hideEasing: 'linear',
        showMethod: 'fadeIn',
        hideMethod: 'fadeOut'
    })
    notification.removeClass('toast-info')
    notification.css({
        'padding-left': '74px',
        'background-image': `url('./${icon}')`,
        'background-size': '48px',
        'background-color': '#0c5952'
    })
}

function createMyLocationButton() {
    var _locationMarker = L.control({position: 'bottomright'})
    var locationContainer

    _locationMarker.onAdd = function (map) {
        locationContainer = L.DomUtil.create('div', '_locationMarker')

        var locationButton = document.createElement('button')
        locationButton.style.backgroundColor = '#fff'
        locationButton.style.border = '2px solid rgba(0,0,0,0.2)'
        locationButton.style.outline = 'none'
        locationButton.style.width = '34px'
        locationButton.style.height = '34px'
        locationButton.style.cursor = 'pointer'
        locationButton.style.padding = '0px'
        locationButton.title = 'My Location'
        locationContainer.appendChild(locationButton)

        var locationIcon = document.createElement('div')
        locationIcon.style.margin = '5px'
        locationIcon.style.width = '18px'
        locationIcon.style.height = '18px'
        locationIcon.style.backgroundImage = 'url(static/mylocation-sprite-1x.png)'
        locationIcon.style.backgroundSize = '200px 19px'
        locationIcon.style.backgroundPosition = '0px 0px'
        locationIcon.style.backgroundRepeat = 'no-repeat'
        locationIcon.id = 'current-location'
        locationButton.appendChild(locationIcon)

        locationButton.addEventListener('click', function () {
            centerMapOnLocation()
        })

        return locationContainer
    }

    _locationMarker.addTo(map)
    locationContainer.index = 1

    map.on('dragend', function () {
        var currentLocation = document.getElementById('current-location')
        currentLocation.style.backgroundPosition = '0px 0px'
    })
}

function centerMapOnLocation() {
    var currentLocation = document.getElementById('current-location')
    var imgX = '0'
    var animationInterval = setInterval(function () {
        if (imgX === '-20') {
            imgX = '0'
        } else {
            imgX = '-20'
        }
        currentLocation.style.backgroundPosition = imgX + 'px 0'
    }, 500)
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            var latlng = new L.LatLng(position.coords.latitude, position.coords.longitude)
            if (locationMarker) {
                locationMarker.setLatLng(latlng)
            }
            map.panTo(latlng)
            Store.set('followMyLocationPosition', {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            })
            clearInterval(animationInterval)
        })
    } else {
        clearInterval(animationInterval)
        currentLocation.style.backgroundPosition = '0px 0px'
    }
}

function changeLocation(lat, lng) {
    var loc = new L.LatLng(lat, lng)
    changeSearchLocation(lat, lng).done(function () {
        map.panTo(loc)
        if (searchMarker) {
            searchMarker.setLatLng(loc)
        }
    })
}

function changeSearchLocation(lat, lng) {
    return $.post('next_loc?lat=' + lat + '&lon=' + lng, {})
}

function centerMap(lat, lng, zoom) {
    var loc = new L.LatLng(lat, lng)

    map.panTo(loc)

    if (zoom) {
        storeZoom = false
        map.setZoom(zoom)
    }
}

function i8ln(word) {
    if ($.isEmptyObject(i8lnDictionary) && language !== 'en' && languageLookups < languageLookupThreshold) {
        $.ajax({
            url: 'static/dist/locales/' + language + '.min.json',
            dataType: 'json',
            async: false,
            success: function (data) {
                i8lnDictionary = data
            },
            error: function (jqXHR, status, error) {
                console.log('Error loading i8ln dictionary: ' + error)
                languageLookups++
            }
        })
    }
    if (word in i8lnDictionary) {
        return i8lnDictionary[word]
    } else {
        // Word doesn't exist in dictionary return it as is
        return word
    }
}

function updateGeoLocation() {
    if (navigator.geolocation && (Store.get('geoLocate') || Store.get('followMyLocation'))) {
        navigator.geolocation.getCurrentPosition(function (position) {
            var lat = position.coords.latitude
            var lng = position.coords.longitude
            var center = new L.LatLng(lat, lng)

            if (Store.get('geoLocate')) {
                // The search function makes any small movements cause a loop. Need to increase resolution.
                if ((typeof searchMarker !== 'undefined') && (getPointDistance(searchMarker.getLatLng(), center) > 40)) {
                    $.post('next_loc?lat=' + lat + '&lon=' + lng).done(function () {
                        map.panTo(center)
                        searchMarker.setLatLng(center)
                    })
                }
            }
            if (Store.get('followMyLocation')) {
                if ((typeof locationMarker !== 'undefined') && (getPointDistance(locationMarker.getLatLng(), center) >= 5)) {
                    map.panTo(center)
                    locationMarker.setLatLng(center)
                    Store.set('followMyLocationPosition', {
                        lat: lat,
                        lng: lng
                    })
                }
            }
        })
    }
}

function createUpdateWorker() {
    try {
        if (isMobileDevice() && (window.Worker)) {
            var updateBlob = new Blob([`onmessage = function(e) {
                var data = e.data
                if (data.name === 'backgroundUpdate') {
                    self.setInterval(function () {self.postMessage({name: 'backgroundUpdate'})}, 5000)
                }
            }`])

            var updateBlobURL = window.URL.createObjectURL(updateBlob)

            updateWorker = new Worker(updateBlobURL)

            updateWorker.onmessage = function (e) {
                var data = e.data
                if (document.hidden && data.name === 'backgroundUpdate' && Date.now() - lastUpdateTime > 2500) {
                    updateMap()
                    updateGeoLocation()
                }
            }

            updateWorker.postMessage({
                name: 'backgroundUpdate'
            })
        }
    } catch (ex) {
        console.log('Webworker error: ' + ex.message)
    }
}

function showGymDetails(id) { // eslint-disable-line no-unused-vars
    var sidebar = document.querySelector('#gym-details')
    var sidebarClose

    sidebar.classList.add('visible')

    var data = $.ajax({
        url: 'gym_data',
        type: 'GET',
        data: {
            'id': id
        },
        dataType: 'json',
        cache: false
    })

    data.done(function (result) {
        var pokemonHtml = ''
        if (result.pokemon.length) {
            result.pokemon.forEach((pokemon) => {
                pokemonHtml += getSidebarGymMember(pokemon)
            })

            pokemonHtml = `<table><tbody>${pokemonHtml}</tbody></table>`
        } else if (result.team_id === 0) {
            pokemonHtml = ''
        } else {
            var pokemonIcon
            if (generateImages) {
                result.pokemon_id = result.guard_pokemon_id
                pokemonIcon = `<img class='guard-pokemon-icon' src='${getPokemonRawIconUrl(result)}'>`
            } else {
                pokemonIcon = `<i class="pokemon-large-sprite n${result.guard_pokemon_id}"></i>`
            }
            pokemonHtml = `
                <center>
                    Gym Leader:<br>
                    ${pokemonIcon}<br>
                    <b>${result.guard_pokemon_name}</b>
                    <p style="font-size: .75em; margin: 5px;">
                        No additional gym information is available for this gym. Make sure you are collecting <a href="https://rocketmap.readthedocs.io/en/develop/extras/gyminfo.html">detailed gym info.</a>
                        If you have detailed gym info collection running, this gym's Pokemon information may be out of date.
                    </p>
                </center>
            `
        }

        var topPart = gymLabel(result, false)
        sidebar.innerHTML = `${topPart}${pokemonHtml}`

        sidebarClose = document.createElement('a')
        sidebarClose.href = '#'
        sidebarClose.className = 'close'
        sidebarClose.tabIndex = 0
        sidebar.appendChild(sidebarClose)

        sidebarClose.addEventListener('click', function (event) {
            event.preventDefault()
            event.stopPropagation()
            sidebar.classList.remove('visible')
        })
    })
}

function getSidebarGymMember(pokemon) {
    var perfectPercent = getIv(pokemon.iv_attack, pokemon.iv_defense, pokemon.iv_stamina)
    var moveEnergy = Math.round(100 / pokemon.move_2_energy)
    const motivationZone = ['Good', 'Average', 'Bad']
    const motivationPercentage = (pokemon.cp_decayed / pokemon.pokemon_cp) * 100
    var colorIdx = 0
    if (motivationPercentage <= 46.66) {
        colorIdx = 2
    } else if ((motivationPercentage > 46.66) && (motivationPercentage < 73.33)) {
        colorIdx = 1
    }
    // Skip getDateStr() so we can re-use the moment.js object.
    var relativeTime = 'Unknown'
    var absoluteTime = ''

    if (pokemon.deployment_time) {
        let deploymentTime = moment(pokemon.deployment_time)
        relativeTime = deploymentTime.fromNow()
        // Append as string so we show nothing when the time is Unknown.
        absoluteTime = '<div class="gym pokemon">(' + deploymentTime.format('Do MMM HH:mm') + ')</div>'
    }

    var pokemonImage = getPokemonRawIconUrl(pokemon)
    return `
                    <tr onclick=toggleGymPokemonDetails(this)>
                        <td width="30px">
                            <img class="gym pokemon sprite" src="${pokemonImage}">
                        </td>
                        <td>
                            <div class="gym pokemon"><span class="gym pokemon name">${pokemon.pokemon_name}</span></div>
                            <div>
                                <span class="gym pokemon motivation decayed zone ${motivationZone[colorIdx].toLowerCase()}">${pokemon.cp_decayed}</span>
                            </div>
                        </td>
                        <td width="190" align="center">
                            <div class="gym pokemon">${pokemon.trainer_name} (${pokemon.trainer_level})</div>
                            <div class="gym pokemon">Deployed ${relativeTime}</div>
                            ${absoluteTime}
                        </td>
                        <td width="10">
                            <!--<a href="#" onclick="toggleGymPokemonDetails(this)">-->
                                <i class="fa fa-angle-double-down"></i>
                            <!--</a>-->
                        </td>
                    </tr>
                    <tr class="details">
                        <td colspan="2">
                            <div class="ivs">
                                <div class="iv">
                                    <div class="type">ATK</div>
                                    <div class="value">
                                        ${pokemon.iv_attack}
                                    </div>
                                </div>
                                <div class="iv">
                                    <div class="type">DEF</div>
                                    <div class="value">
                                        ${pokemon.iv_defense}
                                    </div>
                                </div>
                                <div class="iv">
                                    <div class="type">STA</div>
                                    <div class="value">
                                        ${pokemon.iv_stamina}
                                    </div>
                                </div>
                                <div class="iv" style="width: 36px;"">
                                    <div class="type">PERFECT</div>
                                    <div class="value">
                                        ${perfectPercent.toFixed(0)}<span style="font-size: .6em;">%</span>
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td colspan="2">
                            <div class="moves">
                                <div class="move">
                                    <div class="name">
                                        ${pokemon.move_1_name}
                                        <div class="type ${pokemon.move_1_type['type_en'].toLowerCase()}">${pokemon.move_1_type['type']}</div>
                                    </div>
                                    <div class="damage">
                                        ${pokemon.move_1_damage}
                                    </div>
                                </div>
                                <br>
                                <div class="move">
                                    <div class="name">
                                        ${pokemon.move_2_name}
                                        <div class="type ${pokemon.move_2_type['type_en'].toLowerCase()}">${pokemon.move_2_type['type']}</div>
                                        <div>
                                            <i class="move-bar-sprite move-bar-sprite-${moveEnergy}"></i>
                                        </div>
                                    </div>
                                    <div class="damage">
                                        ${pokemon.move_2_damage}
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                    `
}

function toggleGymPokemonDetails(e) { // eslint-disable-line no-unused-vars
    e.lastElementChild.firstElementChild.classList.toggle('fa-angle-double-up')
    e.lastElementChild.firstElementChild.classList.toggle('fa-angle-double-down')
    e.nextElementSibling.classList.toggle('visible')
}

function getParameterByName(name, url) {
    if (!url) {
        url = window.location.search
    }
    name = name.replace(/[[\]]/g, '\\$&')
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)')
    var results = regex.exec(url)
    if (!results) {
        return null
    }
    if (!results[2]) {
        return ''
    }
    return decodeURIComponent(results[2].replace(/\+/g, ' '))
}


//
// Page Ready Execution
//

$(function () {
    /* If push.js is unsupported or disabled, fall back to toastr
     * notifications. */
    Push.config({
        serviceWorker: 'serviceWorker.min.js',
        fallback: function (notification) {
            sendToastrPokemonNotification(
                notification.title,
                notification.body,
                notification.icon,
                notification.data.lat,
                notification.data.lon
            )
        }
    })
})

$(function () {
   /* TODO: Some items are being loaded asynchronously, but synchronous code
    * depends on it. Restructure to make sure these "loading" tasks are
    * completed before continuing. Right now it "works" because the first
    * map update is scheduled after 5s. */

    // populate Navbar Style menu
    $selectStyle = $('#map-style')

    // Load dynamic rarity.
    updatePokemonRarities()

    // Load Stylenames, translate entries, and populate lists
    $.getJSON('static/dist/data/mapstyle.min.json').done(function (data) {
        var styleList = []

        $.each(data, function (key, value) {
            styleList.push({
                id: key,
                text: i8ln(value)
            })
        })

        // setup the stylelist
        $selectStyle.select2({
            placeholder: 'Select Style',
            data: styleList,
            minimumResultsForSearch: Infinity
        })

        // setup the list change behavior
        $selectStyle.on('change', function (e) {
            selectedStyle = $selectStyle.val()
            setTitleLayer(selectedStyle)
            Store.set('map_style', selectedStyle)
        })

        // recall saved mapstyle
        $selectStyle.val(Store.get('map_style')).trigger('change')
    })

    var mapServiceProvider = $('#map-service-provider')

    mapServiceProvider.select2({
        placeholder: 'Select map provider',
        data: ['googlemaps', 'applemaps'],
        minimumResultsForSearch: Infinity
    })

    mapServiceProvider.on('change', function (e) {
        var selectedVal = mapServiceProvider.val()
        Store.set('mapServiceProvider', selectedVal)
    })

    $selectIconSize = $('#pokemon-icon-size')

    $selectIconSize.select2({
        placeholder: 'Select Icon Size',
        minimumResultsForSearch: Infinity
    })

    $selectIconSize.on('change', function () {
        Store.set('iconSizeModifier', this.value)
        redrawPokemon(mapData.pokemons)
        redrawPokemon(mapData.lurePokemons)

        // We're done processing the list. Repaint.
        markers.refreshClusters()
    })

    $switchOpenGymsOnly = $('#open-gyms-only-switch')

    $switchOpenGymsOnly.on('change', function () {
        Store.set('showOpenGymsOnly', this.checked)
        lastgyms = false
        updateMap()
    })


    $switchParkGymsOnly = $('#park-gyms-only-switch')

    $switchParkGymsOnly.on('change', function () {
        Store.set('showParkGymsOnly', this.checked)
        lastgyms = false
        updateMap()
    })

    $switchParkRaidGymsOnly = $('#raid-park-gym-switch')

    $switchParkRaidGymsOnly.on('change', function () {
        Store.set('showParkRaidsOnly', this.checked)
    })
  
    $switchGymInBattle = $('#gym-in-battle-switch')

    $switchGymInBattle.on('change', function () {
        Store.set('showGymInBattle', this.checked)
        lastgyms = false
        updateMap()
    })

    $switchActiveRaidGymsOnly = $('#raid-active-gym-switch')

    $switchActiveRaidGymsOnly.on('change', function () {
        Store.set('showActiveRaidsOnly', this.checked)
        lastgyms = false
        updateMap()
    })

    $switchRaidMinLevel = $('#raid-min-level-only-switch')

    $switchRaidMinLevel.select2({
        placeholder: 'Minimum raid level',
        minimumResultsForSearch: Infinity
    })

    $switchRaidMinLevel.on('change', function () {
        Store.set('showRaidMinLevel', this.value)
        lastgyms = false
        updateMap()
    })

    $switchRaidMaxLevel = $('#raid-max-level-only-switch')

    $switchRaidMaxLevel.select2({
        placeholder: 'Maximum raid level',
        minimumResultsForSearch: Infinity
    })

    $switchRaidMaxLevel.on('change', function () {
        Store.set('showRaidMaxLevel', this.value)
        lastgyms = false
        updateMap()
    })


    $selectTeamGymsOnly = $('#team-gyms-only-switch')

    $selectTeamGymsOnly.select2({
        placeholder: 'Only Show Gyms For Team',
        minimumResultsForSearch: Infinity
    })

    $selectTeamGymsOnly.on('change', function () {
        Store.set('showTeamGymsOnly', this.value)
        lastgyms = false
        updateMap()
    })

    $selectLastUpdateGymsOnly = $('#last-update-gyms-switch')

    $selectLastUpdateGymsOnly.select2({
        placeholder: 'Only Show Gyms Last Updated',
        minimumResultsForSearch: Infinity
    })

    $selectLastUpdateGymsOnly.on('change', function () {
        Store.set('showLastUpdatedGymsOnly', this.value)
        lastgyms = false
        updateMap()
    })

    $selectMinGymLevel = $('#min-level-gyms-filter-switch')

    $selectMinGymLevel.select2({
        placeholder: 'Minimum Gym Level',
        minimumResultsForSearch: Infinity
    })

    $selectMinGymLevel.on('change', function () {
        Store.set('minGymLevel', this.value)
        lastgyms = false
        updateMap()
    })

    $selectMaxGymLevel = $('#max-level-gyms-filter-switch')

    $selectMaxGymLevel.select2({
        placeholder: 'Maximum Gym Level',
        minimumResultsForSearch: Infinity
    })

    $selectMaxGymLevel.on('change', function () {
        Store.set('maxGymLevel', this.value)
        lastgyms = false
        updateMap()
    })

    $selectLuredPokestopsOnly = $('#lured-pokestops-only-switch')

    $selectLuredPokestopsOnly.select2({
        placeholder: 'Only Show Lured Pokestops',
        minimumResultsForSearch: Infinity
    })

    $selectLuredPokestopsOnly.on('change', function () {
        Store.set('showLuredPokestopsOnly', this.value)
        lastpokestops = false
        updateMap()
    })
    $switchGymSidebar = $('#gym-sidebar-switch')

    $switchGymSidebar.on('change', function () {
        Store.set('useGymSidebar', this.checked)
        lastgyms = false
        $.each(['gyms'], function (d, dType) {
            $.each(mapData[dType], function (key, value) {
                // for any marker you're turning off, you'll want to wipe off the range
                if (mapData[dType][key].marker.rangeCircle) {
                    markers.removeLayer(mapData[dType][key].marker.rangeCircle)
                    delete mapData[dType][key].marker.rangeCircle
                }
                markers.removeLayer(mapData[dType][key].marker)
            })
            mapData[dType] = {}
        })
        updateMap()
    })

    $selectExcludeRarity = $('#exclude-rarity')

    $selectExcludeRarity.select2({
        placeholder: 'None',
        minimumResultsForSearch: Infinity
    })

    $selectExcludeRarity.on('change', function () {
        Store.set('excludedRarity', this.value)
        updateMap()
    })

    $selectSearchIconMarker = $('#iconmarker-style')
    $selectLocationIconMarker = $('#locationmarker-style')

    $.getJSON('static/dist/data/searchmarkerstyle.min.json').done(function (data) {
        searchMarkerStyles = data
        var searchMarkerStyleList = []

        $.each(data, function (key, value) {
            searchMarkerStyleList.push({
                id: key,
                text: value.name
            })
        })

        $selectSearchIconMarker.select2({
            placeholder: 'Select Icon Marker',
            data: searchMarkerStyleList,
            minimumResultsForSearch: Infinity
        })

        $selectSearchIconMarker.on('change', function (e) {
            var selectSearchIconMarker = $selectSearchIconMarker.val()
            Store.set('searchMarkerStyle', selectSearchIconMarker)
            setTimeout(function () { updateSearchMarker(selectSearchIconMarker) }, 300)
        })

        $selectSearchIconMarker.val(Store.get('searchMarkerStyle')).trigger('change')

        updateSearchMarker(Store.get('lockMarker'))

        $selectLocationIconMarker.select2({
            placeholder: 'Select Location Marker',
            data: searchMarkerStyleList,
            minimumResultsForSearch: Infinity
        })

        $selectLocationIconMarker.on('change', function (e) {
            var locStyle = this.value
            Store.set('locationMarkerStyle', locStyle)
            setTimeout(function () { updateLocationMarker(locStyle) }, 300)
        })

        $selectLocationIconMarker.val(Store.get('locationMarkerStyle')).trigger('change')
        loadDefaultImages()
    })
})
$(function () {
    moment.locale(language)
    function formatState(state) {
        if (!state.id) {
            return state.text
        }
        var pokemonIcon
        if (generateImages) {
            pokemonIcon = `<img class='pokemon-select-icon' src='${getPokemonRawIconUrl({'pokemon_id': state.element.value.toString()})}'>`
        } else {
            pokemonIcon = `<i class="pokemon-sprite n${state.element.value.toString()}"></i>`
        }
        var $state = $(
            `<span>${pokemonIcon} ${state.text}</span>`
        )
        return $state
    }

    function formatRarityState(state) {
        if (!state.id) {
            return state.text
        }
        var pokemonId
        switch (state.element.value.toString()) {
            case i8ln('Common'):
                pokemonId = Store.get('rarityCommon')
                break
            case i8ln('Uncommon'):
                pokemonId = Store.get('rarityUncommon')
                break
            case i8ln('Rare'):
                pokemonId = Store.get('rarityRare')
                break
            case i8ln('Very Rare'):
                pokemonId = Store.get('rarityVeryRare')
                break
            case i8ln('Ultra Rare'):
                pokemonId = Store.get('rarityUltraRare')
                break
            case i8ln('New Spawn'):
                pokemonId = Store.get('rarityNewSpawn')
                break
            default:
                pokemonId = 1
        }
        var pokemonIcon
        if (generateImages) {
            pokemonIcon = `<img class='pokemon-select-icon' src='${getPokemonRawIconUrl({'pokemon_id': pokemonId})}'>`
        } else {
            pokemonIcon = `<i class="pokemon-sprite n${pokemonId}"></i>`
        }
        var $state = $(
            `<span>${pokemonIcon} ${state.text}</span>`
        )
        return $state
    }

    if (Store.get('startAtUserLocation') && getParameterByName('lat') == null && getParameterByName('lon') == null) {
        centerMapOnLocation()
    }
    $.getJSON('static/dist/data/moves.min.json').done(function (data) {
        moves = data
    })

    $selectExclude = $('#exclude-pokemon')
    $selectExcludeRarity = $('#exclude-rarity')
    $selectPokemonNotify = $('#notify-pokemon')
    $selectRarityNotify = $('#notify-rarity')
    $textPerfectionNotify = $('#notify-perfection')
    $textLevelNotify = $('#notify-level')
    var numberOfPokemon = 492

    $('.list').before('<input type="search" class="search" placeholder="Search for Name, ID or Type...">')
    const hidepresets = Store.get('hidepresets')

    $.each(hidepresets, function (key, value) {
        var pokemonIcon
        var iconid = value['PokemonID']
        if (generateImages) {
            pokemonIcon = `<img class='pokemon-select-icon' src='${getPokemonRawIconUrl({'pokemon_id': iconid})}'>`
        } else {
            pokemonIcon = `<i class="pokemon-sprite n${iconid}"></i>`
        }
        $('.exclude_templates').append('<div class="hidepreset" data-key=' + key + '><div class="hideicon">' + pokemonIcon + '</div><div class="hidetext">' + value['Name'] + '</div></div>')
    })
    // Load pokemon names and populate lists
    $.getJSON('static/dist/data/pokemon.min.json').done(function (data) {
        var pokemonIcon
        var typestring = []
        var pokeList = []
        $.each(data, function (key, value) {
            if (key > numberOfPokemon) {
                return false
            }
            if (generateImages) {
                pokemonIcon = `<img class='pokemon-select-icon' src='${getPokemonRawIconUrl({'pokemon_id': key})}'>`
            } else {
                pokemonIcon = `<i class="pokemon-sprite n${key}"></i>`
            }
            value['name'] = i8ln(value['name'])
            $.each(value['types'], function (key, pokemonType) {
                typestring[key] = i8ln(pokemonType['type'])
                if (key < 1) {
                    typestring[key+1] = i8ln(pokemonType['type'])
                }
            })
            value['gen'] = getPokemonGen(key)
            $('.list').append('<div class=pokemon-icon-sprite data-gen=gen' + value['gen'] + ' data-pkm=' + i8ln(value['name']) + ' data-value=' + key + ' data-type1=' + typestring[0] + ' data-type2=' + typestring[1] + '><div id=pkid_list>#' + key + '</div>' + pokemonIcon + '<div id=pkname_list>' + i8ln(value['name']) + '</div></div>')
            idToPokemon[key] = value
            pokeSearchList.push({
                value: key,
                pkm: i8ln(value['name']),
                gen: 'gen' + value['gen'],
                type1: typestring[0],
                type2: typestring[1],
                allpokemon: 'allpokemon'
            })
        })

        $selectRarityNotify.select2({
            placeholder: i8ln('Select Rarity'),
            data: [i8ln('Common'), i8ln('Uncommon'), i8ln('Rare'), i8ln('Very Rare'), i8ln('Ultra Rare'), i8ln('New Spawn')],
            templateResult: formatRarityState
        })

        $('.list').on('click', '.pokemon-icon-sprite', function () {
            var img = $(this)
            var select = $(this).parent().parent().find('input[id$=pokemon]')
            var value = select.val().split(',')
            $(this).find('.hidepreset').removeClass('active')
            var id = img.data('value').toString()
            $('.hidepreset').removeClass('active')
            if (img.hasClass('active')) {
                select.val(value.filter(function (elem) {
                    return elem !== id
                }).join(',')).trigger('change')
                img.removeClass('active')
            } else {
                select.val((value.concat(id).join(','))).trigger('change')
                img.addClass('active')
            }
        })

        $('.exclude_templates').on('click', '.hidepreset', function () {
            const hidepresets = Store.get('hidepresets')
            var img = $(this)
            var id = img.data('key').toString()
            $('.hidepreset').removeClass('active')
            img.addClass('active')
            generatePokemonExclude(i8ln(hidepresets[id]['Searchstring']), hidepresets[id]['Invert'])
        })

        $('.search').on('input', function () {
            var searchtext = $(this).val().toString()
            var parent = $(this)
            var foundpokemon = []
            var pokeselectlist = $(this).next('.list').find('.pokemon-icon-sprite')
            if (searchtext === '') {
                parent.parent().find('.select-all, .select-reverse').hide()
                parent.parent().find('.hide-all').show()
                pokeselectlist.show()
            } else {
                pokeselectlist.hide()
                parent.parent().find('.select-all, .select-reverse').show()
                parent.parent().find('.hide-all').hide()
                foundpokemon = filterpokemon(pokeSearchList, searchtext.replace(/\s/g, ''))
            }

            $.each(foundpokemon, function (i, item) {
                parent.next('.list').find('.pokemon-icon-sprite[data-value="' + foundpokemon[i] + '"]').show()
            })
            foundpokemon = []
        })

        loadDefaultImages()

        $('.select-reverse').on('click', function (e) {
            e.preventDefault()
            var selectlist = []
            var parent = $(this).parent().parent()
            var pokeselectlist = parent.find('.pokemon-icon-sprite')
            pokeselectlist.removeClass('active')
            pokeselectlist = parent.find('.pokemon-icon-sprite:hidden')
            pokeselectlist.addClass('active')
            $('.hidepreset').removeClass('active')

            $.each(pokeselectlist, function (i, item) {
                var pokemonicon = $(this)
                selectlist.push(pokemonicon.data('value'))
            })
            parent.find('input[id$=pokemon]').val(selectlist.join(',')).trigger('change')
        })

        $('.select-all').on('click', function (e) {
            e.preventDefault()
            var selectlist = []
            var parent = $(this).parent().parent()
            var pokeselectlist = parent.find('.pokemon-icon-sprite')
            pokeselectlist.removeClass('active')
            pokeselectlist = parent.find('.pokemon-icon-sprite:visible')
            pokeselectlist.addClass('active')
            $('.hidepreset').removeClass('active')

            $.each(pokeselectlist, function (i, item) {
                var pokemonicon = $(this)
                selectlist.push(pokemonicon.data('value'))
            })
            parent.find('input[id$=pokemon]').val(selectlist.join(',')).trigger('change')
        })
        $('.hide-all').on('click', function (e) {
            e.preventDefault()
            var parent = $(this).parent().parent()
            $('.hidepreset').removeClass('active')
            parent.find('.list .pokemon-icon-sprite:visible').removeClass('active')
            parent.find('input[id$=pokemon]').val('').trigger('change')
        })
        $selectExclude.on('change', function (e) {
            buffer = excludedPokemon
            excludedPokemon = $selectExclude.val().split(',').map(Number).sort(function (a, b) {
                return parseInt(a) - parseInt(b)
            })
            buffer = buffer.filter(function (e) {
                return this.indexOf(e) < 0
            }, excludedPokemon)
            reincludedPokemon = reincludedPokemon.concat(buffer).map(String)
            clearStaleMarkers()
            if (excludedPokemon.length === 1) {
                $('.hidefilteractiv').text('*** No active Filter ***')
                $('.hidefilteractiv').css('color', 'black')
            } else {
                $('.hidefilteractiv').text('*** active Filter ***')
                $('.hidefilteractiv').css('color', 'red')
            }
            Store.set('remember_select_exclude', excludedPokemon)
        })
        $selectExcludeRarity.on('change', function (e) {
            excludedRarity = $selectExcludeRarity.val()
            reincludedPokemon = reincludedPokemon.concat(excludedPokemonByRarity)
            excludedPokemonByRarity = []
            clearStaleMarkers()
            Store.set('excludedRarity', excludedRarity)
        })
        $selectPokemonNotify.on('change', function (e) {
            buffer = notifiedPokemon
            notifiedPokemon = $selectPokemonNotify.val().split(',').map(Number).sort(function (a, b) {
                return parseInt(a) - parseInt(b)
            })
            buffer = buffer.filter(function (e) {
                return this.indexOf(e) < 0
            }, notifiedPokemon)
            reincludedPokemon = reincludedPokemon.concat(buffer).map(String)
            clearStaleMarkers()
            if (notifiedPokemon.length === 1) {
                $('.notifyfilteractiv').text('*** No active Filter ***')
                $('.notifyfilteractiv').css('color', 'black')
            } else {
                $('.notifyfilteractiv').text('*** active Filter ***')
                $('.notifyfilteractiv').css('color', 'red')
            }
            Store.set('remember_select_notify', notifiedPokemon)
        })
        $selectRarityNotify.on('change', function (e) {
            notifiedRarity = $selectRarityNotify.val().map(String)
            Store.set('remember_select_rarity_notify', notifiedRarity)
        })
        $textPerfectionNotify.on('change', function (e) {
            notifiedMinPerfection = parseInt($textPerfectionNotify.val(), 10)
            if (isNaN(notifiedMinPerfection) || notifiedMinPerfection <= 0) {
                notifiedMinPerfection = ''
            }
            if (notifiedMinPerfection > 100) {
                notifiedMinPerfection = 100
            }
            $textPerfectionNotify.val(notifiedMinPerfection)
            Store.set('remember_text_perfection_notify', notifiedMinPerfection)
        })
        $textLevelNotify.on('change', function (e) {
            notifiedMinLevel = parseInt($textLevelNotify.val(), 10)
            if (isNaN(notifiedMinLevel) || notifiedMinLevel <= 0) {
                notifiedMinLevel = ''
            }
            if (notifiedMinLevel > 40) {
                notifiedMinLevel = 40
            }
            $textLevelNotify.val(notifiedMinLevel)
            Store.set('remember_text_level_notify', notifiedMinLevel)
        })

        // recall saved lists
        $selectExclude.val(Store.get('remember_select_exclude')).trigger('change')
        $selectPokemonNotify.val(Store.get('remember_select_notify')).trigger('change')
        $selectRarityNotify.val(Store.get('remember_select_rarity_notify')).trigger('change')
        $textPerfectionNotify.val(Store.get('remember_text_perfection_notify')).trigger('change')
        $textLevelNotify.val(Store.get('remember_text_level_notify')).trigger('change')

        if (isTouchDevice() && isMobileDevice()) {
            $('.select2-search input').prop('readonly', true)
        }
        $selectExcludeRarity.val(Store.get('excludedRarity')).trigger('change')
    })

    // run interval timers to regularly update map, rarity and timediffs
    window.setInterval(updateLabelDiffTime, 1000)
    window.setInterval(updateMap, 2000)
    window.setInterval(updatePokemonRarities, 300000)
    window.setInterval(updateGeoLocation, 1000)

    createUpdateWorker()

    function isNumber(n) { return !isNaN(parseFloat(n)) && !isNaN(n - 0) }

    function filterpokemon(pokemonarray, searchtext) {
        if (searchtext.substring(0, 1) === '-') { searchtext = 'allpokemon,' + searchtext }
        var searchsplit = searchtext.split(',')
        var foundpokemon = []
        var operator = 'add'
        $.each(searchsplit, function (k, searchstring) {
            if (searchstring.substring(0, 1) === '+') {
                searchstring = searchstring.substring(1)
                operator = 'add'
            } else if (searchstring.substring(0, 1) === '-') {
                searchstring = searchstring.substring(1)
                operator = 'remove'
            } else {
                operator = 'add'
            }
            if (isNumber(searchstring)) {
                if (operator === 'add') {
                    foundpokemon.push(searchstring)
                } else {
                    delete foundpokemon[foundpokemon.indexOf(searchstring)]
                }
            } else if (searchstring.length > 0 && searchstring !== '-' && searchstring !== '+') {
                $.each(pokemonarray, function (i, item) {
                    if ((item['pkm'].toLowerCase().indexOf(searchstring.toLowerCase()) !== -1) || (i8ln(item['type1'].toLowerCase()).indexOf(i8ln(searchstring).toLowerCase()) !== -1) || (i8ln(item['type2'].toLowerCase()).indexOf(i8ln(searchstring).toLowerCase()) !== -1) || (item['gen'].toString() === searchstring.toLowerCase()) || (item['value'].toString() === searchstring.toString()) || (item['allpokemon'].toString() === searchstring.toString())) {
                        if (operator === 'add') {
                            foundpokemon.push(item['value'])
                        } else {
                            delete foundpokemon[foundpokemon.indexOf(item['value'])]
                        }
                    }
                })
            }
        })
        return foundpokemon
    }
    // Wipe off/restore map icons when switches are toggled
    function buildSwitchChangeListener(data, dataType, storageKey) {
        return function () {
            Store.set(storageKey, this.checked)

            if (this.checked) {
                // When switch is turned on we asume it has been off, makes sure we dont end up in limbo
                // Without this there could've been a situation where no markers are on map and only newly modified ones are loaded
                if (storageKey === 'showPokemon') {
                    lastpokemon = false
                } else if (storageKey === 'showPokestops') {
                    lastpokestops = false
                } else if (storageKey === 'showScanned') {
                    lastslocs = false
                } else if (storageKey === 'showSpawnpoints') {
                    lastspawns = false
                }
                updateMap()
            } else if (storageKey === 'showGyms' || storageKey === 'showRaids') {
                // if any of switch is enable then do not remove gyms markers, only update them
                if (Store.get('showGyms') || Store.get('showRaids')) {
                    lastgyms = false
                    updateMap()
                } else {
                    $.each(dataType, function (d, dType) {
                        $.each(data[dType], function (key, value) {
                            // for any marker you're turning off, you'll want to wipe off the range
                            if (data[dType][key].marker.rangeCircle) {
                                markers.removeLayer(data[dType][key].marker.rangeCircle)
                                markersnotify.removeLayer(data[dType][key].marker.rangeCircle)
                                delete data[dType][key].marker.rangeCircle
                            }
                            markers.removeLayer(data[dType][key].marker)
                            markersnotify.removeLayer(data[dType][key].marker)
                            delete data[dType][key].marker
                        })
                        data[dType] = {}
                    })
                }
            } else {
                $.each(dataType, function (d, dType) {
                    var oldPokeMarkers = []
                    $.each(data[dType], function (key, value) {
                        // for any marker you're turning off, you'll want to wipe off the range
                        if (data[dType][key].marker.rangeCircle) {
                            markers.removeLayer(data[dType][key].marker.rangeCircle)
                            markersnotify.removeLayer(data[dType][key].marker.rangeCircle)
                            delete data[dType][key].marker.rangeCircle
                        }
                        if (storageKey !== 'showRanges') {
                            markers.removeLayer(data[dType][key].marker)
                            markersnotify.removeLayer(data[dType][key].marker)
                            if (dType === 'pokemons') {
                                oldPokeMarkers.push(data[dType][key].marker)
                            }
                        }
                    })
                    // If the type was "pokemons".
                    if (oldPokeMarkers.length > 0) {
                        markers.removeLayer(oldPokeMarkers)
                        markersnotify.removeLayer(oldPokeMarkers)
                    }
                    if (storageKey !== 'showRanges') data[dType] = {}
                })
                if (storageKey === 'showRanges') {
                    updateMap()
                }
            }
        }
    }

    function diffPokemon(array1, array2) {
        var temp = []
        array1 = array1.toString().split(',').map(Number)
        array2 = array2.toString().split(',').map(Number)
        for (var i in array1) {
            if (array2.indexOf(array1[i]) === -1) temp.push(array1[i])
        }
        for (i in array2) {
            if (array1.indexOf(array2[i]) === -1) temp.push(array2[i])
        }
        return temp.sort((a, b) => a - b)
    }

    function generatePokemonExclude(value, invert) {
        var allpokemon = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386]
        value = value.toString()
        allpokemon = allpokemon.map(String)
        if (invert === false) {
            $selectExclude.val(filterpokemon(pokeSearchList, value.replace(/\s/g, ''))).trigger('change')
        } else {
            $selectExclude.val(diffPokemon(allpokemon, filterpokemon(pokeSearchList, value.replace(/\s/g, '')).map(String))).trigger('change')
        }
        loadDefaultImages()
        redrawPokemon(mapData.pokemons)
        redrawPokemon(mapData.lurePokemons)
    }


    function resetGymFilter() {
        Store.set('showTeamGymsOnly', 0)
        Store.set('minGymLevel', 0)
        Store.set('maxGymLevel', 6)
        Store.set('showOpenGymsOnly', false)
        Store.set('showGymInBattle', false)
        Store.set('showParkGymsOnly', false)
        Store.set('showParkRaidsOnly', false)

        $('#team-gyms-only-switch').val(Store.get('showTeamGymsOnly'))
        $('#open-gyms-only-switch').prop('checked', Store.get('showOpenGymsOnly'))
        $('#park-gyms-only-switch').prop('checked', Store.get('showParkGymsOnly'))
        $('#raid-park-gym-switch').prop('checked', Store.get('showParkRaidsOnly'))

        $('#team-gyms-only-switch').val(Store.get('showTeamGymsOnly'))
        $('#open-gyms-only-switch').prop('checked', Store.get('showOpenGymsOnly'))
        $('#gym-in-battle-switch').prop('checked', Store.get('showGymInBattle'))
        $('#min-level-gyms-filter-switch').val(Store.get('minGymLevel'))
        $('#max-level-gyms-filter-switch').val(Store.get('maxGymLevel'))

        $('#team-gyms-only-switch').trigger('change')
        $('#min-level-gyms-filter-switch').trigger('change')
        $('#max-level-gyms-filter-switch').trigger('change')
    }

    // Setup UI element interactions


    $('#gyms-switch').change(function () {
        var options = {
            'duration': 500
        }
        resetGymFilter()
        var wrapperGyms = $('#gyms-filter-wrapper')
        var switchRaids = $('#raids-switch')
        var wrapperSidebar = $('#gym-sidebar-wrapper')
        if (this.checked) {
            lastgyms = false
            wrapperGyms.show(options)
            wrapperSidebar.show(options)
        } else {
            lastgyms = false
            wrapperGyms.hide(options)
            if (!switchRaids.prop('checked')) {
                wrapperSidebar.hide(options)
            }
        }
        buildSwitchChangeListener(mapData, ['gyms'], 'showGyms').bind(this)()
    })
    $('#raids-switch').change(function () {
        var options = {
            'duration': 500
        }
        var wrapperRaids = $('#raids-filter-wrapper')
        var switchGyms = $('#gyms-switch')
        var wrapperSidebar = $('#gym-sidebar-wrapper')
        if (this.checked) {
            lastgyms = false
            wrapperRaids.show(options)
            wrapperSidebar.show(options)
        } else {
            lastgyms = false
            wrapperRaids.hide(options)
            if (!switchGyms.prop('checked')) {
                wrapperSidebar.hide(options)
            }
        }
        buildSwitchChangeListener(mapData, ['gyms'], 'showRaids').bind(this)()
    })
    $('#pokemon-switch').change(function () {
        buildSwitchChangeListener(mapData, ['pokemons'], 'showPokemon').bind(this)()
        markers.refreshClusters()
    })
    $('#pokemon-stats-switch').change(function () {
        Store.set('showPokemonStats', this.checked)
        var options = {
            'duration': 500
        }
        const $wrapper = $('#notify-perfection-wrapper')
        if (this.checked) {
            $wrapper.show(options)
        } else {
            $wrapper.hide(options)
        }
        updatePokemonLabels(mapData.pokemons)
        // Only redraw Pokémon which are notified of perfection.
        var notifyPerfectionPkmn = getNotifyPerfectionPokemons(mapData.pokemons)
        redrawPokemon(notifyPerfectionPkmn)

        markerCluster.redraw()
    })
    $('#scanned-switch').change(function () {
        buildSwitchChangeListener(mapData, ['scanned'], 'showScanned').bind(this)()
    })
    $('#spawnpoints-switch').change(function () {
        buildSwitchChangeListener(mapData, ['spawnpoints'], 'showSpawnpoints').bind(this)()
    })
    $('#ranges-switch').change(buildSwitchChangeListener(mapData, ['gyms', 'pokemons', 'pokestops'], 'showRanges'))

    $('#weather-cells-switch').change(function () {
        buildSwitchChangeListener(mapData, ['weather'], 'showWeatherCells').bind(this)()
    })

    $('#s2cells-switch').change(function () {
        buildSwitchChangeListener(mapData, ['s2cells'], 'showS2Cells').bind(this)()
    })

    $('#weather-alerts-switch').change(function () {
        buildSwitchChangeListener(mapData, ['weatherAlerts'], 'showWeatherAlerts').bind(this)()
    })


    $('#pokestops-switch').change(function () {
        var options = {
            'duration': 500
        }
        var wrapper = $('#lured-pokestops-only-wrapper')
        if (this.checked) {
            lastpokestops = false
            wrapper.show(options)
        } else {
            lastpokestops = false
            wrapper.hide(options)
        }
        return buildSwitchChangeListener(mapData, ['pokestops'], 'showPokestops').bind(this)()
    })

    $('#sound-switch').change(function () {
        Store.set('playSound', this.checked)
        var options = {
            'duration': 500
        }
        var criesWrapper = $('#pokemoncries')
        if (this.checked) {
            criesWrapper.show(options)
        } else {
            criesWrapper.hide(options)
        }
    })

    $('#bounce-switch').change(function () {
        Store.set('isBounceDisabled', this.checked)
        location.reload()
    })

    $('#prio-notify-switch').change(function () {
        Store.set('prioNotify', this.checked)
        location.reload()
    })

    $('#hideunnotified-switch').change(function () {
        Store.set('hideNotNotified', this.checked)
        location.reload()
    })

    $('#popups-switch').change(function () {
        Store.set('showPopups', this.checked)
        location.reload()
    })

    $('#cries-switch').change(function () {
        Store.set('playCries', this.checked)
    })

    $('#medal-rattata-switch').change(function () {
        Store.set('showMedalRattata', this.checked)
        updateMap()
    })

    $('#medal-magikarp-switch').change(function () {
        Store.set('showMedalMagikarp', this.checked)
        updateMap()
    })


    $('#geoloc-switch').change(function () {
        $('#next-location').prop('disabled', this.checked)
        $('#next-location').css('background-color', this.checked ? '#e0e0e0' : '#ffffff')
        if (!navigator.geolocation) {
            this.checked = false
        } else {
            Store.set('geoLocate', this.checked)
        }
    })

    $('#lock-marker-switch').change(function () {
        Store.set('lockMarker', this.checked)
        if (searchMarker) {
            searchMarker.draggable = (!this.checked)
        }
    })

    $('#search-switch').change(function () {
        searchControl(this.checked ? 'on' : 'off')
    })

    $('#start-at-user-location-switch').change(function () {
        Store.set('startAtUserLocation', this.checked)
    })

    $('#follow-my-location-switch').change(function () {
        if (!navigator.geolocation) {
            this.checked = false
        } else {
            Store.set('followMyLocation', this.checked)
        }
        if (locationMarker) {
            if (this.checked) {
                // Follow our position programatically, so no dragging.
                locationMarker.draggable = false
            } else {
                // Go back to default non-follow.
                const isMarkerMovable = Store.get('isLocationMarkerMovable')
                locationMarker.draggable = isMarkerMovable
            }
        }
    })

    $('#scan-here-switch').change(function () {
        if (this.checked && !Store.get('scanHereAlerted')) {
            alert('Use this feature carefully ! This button will set the current map center as new search location. This may cause worker to teleport long range.')
            Store.set('scanHereAlerted', true)
        }
        $('#scan-here').toggle(this.checked)
        Store.set('scanHere', this.checked)
    })

    if ($('#nav-accordion').length) {
        $('#nav-accordion').accordion({
            active: 0,
            collapsible: true,
            heightStyle: 'content'
        })
    }

    // Initialize dataTable in statistics sidebar
    //   - turn off sorting for the 'icon' column
    //   - initially sort 'name' column alphabetically

    $('#pokemonList_table').DataTable({
        paging: false,
        searching: false,
        info: false,
        errMode: 'throw',
        'language': {
            'emptyTable': ''
        },
        'columns': [
            { 'orderable': false },
            null,
            null,
            null
        ]
    }).order([1, 'asc'])
})
