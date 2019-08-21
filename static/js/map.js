/* global showAllZoomLevel getS2CellBounds processWeather processWeatherAlerts updateMainCellWeather getPercentageCssColor getPokemonGen getPokemonRawIconUrl timestampToTime timestampToDateTime */

//
// Global map.js variables
//

var $selectIncludePokemon
var $selectIncludeQuestPokemon
var $selectIncludeQuestItems
var $selectNotifyPokemon
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
var idToInvasion = {}
var i8lnDictionary = {}
var languageLookups = 0
var languageLookupThreshold = 3

var searchMarkerStyles

var timestamp
var excludedPokemon = []
var includedQuestPokemon = []
var includedQuestItems = []
var excludedPokemonByRarity = []
var excludedRarity

var notifiedPokemon = []
var notifiedRarity = []
var notifiedMinPerfection = null
var notifiedMinLevel = null

var buffer = []
var reincludedPokemon = []
var reids = []

var luredPokestops = {}
var invadedPokestops = {}
var onGoingRaidGyms = {}

// var map
var rawDataIsLoading = false
var startLocationMarker
var userLocationMarker
const rangeMarkers = ['pokemon', 'pokestop', 'gym']
var storeZoom = true
var moves

var oSwLat
var oSwLng
var oNeLat
var oNeLng

var L
var map
var markers
var markersNoCluster
var _oldlayer = 'stylemapnik'

var S2
var s2Level10LayerGroup = new L.LayerGroup()
var s2Level13LayerGroup = new L.LayerGroup()
var s2Level14LayerGroup = new L.LayerGroup()
var s2Level17LayerGroup = new L.LayerGroup()

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

const toastrOptions = {
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

const genderType = ['♂', '♀', '⚲']

const questItemIds = [1, 2, 3, 101, 102, 103, 104, 201, 202, 701, 703, 705, 1101, 1102, 1103, 1104, 1105, 1106, 706, 708, 1405, 301, 401, 501, 1404, 902, 903, 1201, 1202, 1301, 1402]
const questItemNames = {
    1: 'Poké Ball',
    2: 'Great Ball',
    3: 'Ultra Ball',
    101: 'Potion',
    102: 'Super Potion',
    103: 'Hyper Potion',
    104: 'Max Potion',
    201: 'Revive',
    202: 'Max Revive',
    301: 'Lucky Egg',
    401: 'Incense',
    501: 'Lure Module',
    701: 'Razz Berry',
    703: 'Nanab Berry',
    705: 'Pinap Berry',
    706: 'Golden Razz Berry',
    708: 'Silver Pinap Berry',
    902: 'Egg Incubator',
    903: 'Super Incubator',
    1101: 'Sun Stone',
    1102: 'Kings Rock',
    1103: 'Metal Coat',
    1104: 'Dragon Scale',
    1105: 'Up-Grade',
    1106: 'Sinnoh Stone',
    1201: 'Fast TM',
    1202: 'Charged TM',
    1301: 'Rare Candy',
    1402: 'Premium Raid Pass',
    1404: 'Star Piece',
    1405: 'Gift'
}

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

/* eslint-disable no-unused-vars */
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
/* eslint-enable no-unused-vars */

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

function excludePokemon(id, encounterId) { // eslint-disable-line no-unused-vars
    $('label[for="include-pokemon"] .list .pokemon-icon-sprite[data-value="' + id + '"]').click()
}

function notifyAboutPokemon(id, encounterId) { // eslint-disable-line no-unused-vars
    $('label[for="notify-pokemon"] .list .pokemon-icon-sprite[data-value="' + id + '"]').click()
}

function removePokemonMarker(encounterId) { // eslint-disable-line no-unused-vars
    if (mapData.pokemons[encounterId].marker.rangeCircle) {
        markers.removeLayer(mapData.pokemons[encounterId].marker.rangeCircle)
        markersNoCluster.removeLayer(mapData.pokemons[encounterId].marker.rangeCircle)
        delete mapData.pokemons[encounterId].marker.rangeCircle
    }
    if (mapData.pokemons[encounterId].marker.infoWindowIsOpen) {
        mapData.pokemons[encounterId].marker.infoWindowIsOpen = false
    }
    markers.removeLayer(mapData.pokemons[encounterId].marker)
    markersNoCluster.removeLayer(mapData.pokemons[encounterId].marker)
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
    var ep = Store.get('remember_select_include_pokemon')
    var eqp = Store.get('remember_select_include_quest_pokemon')
    var eqi = Store.get('remember_select_include_quest_items')
    var en = Store.get('remember_select_notify_pokemon')
    $('label[for="include-pokemon"] .list .pokemon-icon-sprite').removeClass('active')
    $('label[for="include-pokemon"] .list .pokemon-icon-sprite').each(function () {
        if (ep.indexOf($(this).data('value')) !== -1) {
            $(this).addClass('active')
        }
    })
    $('label[for="include-quest-pokemon"] .list .pokemon-icon-sprite').removeClass('active')
    $('label[for="include-quest-pokemon"] .list .pokemon-icon-sprite').each(function () {
        if (eqp.indexOf($(this).data('value')) !== -1) {
            $(this).addClass('active')
        }
    })
    $('label[for="include-quest-items"] .quest-item-list .quest-item-sprite').removeClass('active')
    $('label[for="include-quest-items"] .quest-item-list .quest-item-sprite').each(function () {
        if (eqi.indexOf($(this).data('value')) !== -1) {
            $(this).addClass('active')
        }
    })
    $('label[for="notify-pokemon"] .list .pokemon-icon-sprite').removeClass('active')
    $('label[for="notify-pokemon"] .list .pokemon-icon-sprite').each(function () {
        if (en.indexOf($(this).data('value')) !== -1) {
            $(this).addClass('active')
            $('.notify-filter-active').css('color', 'limegreen')
            $('.notify-filter-active').text('*** Active Filter  ***')
        }
    })
}


function initMap() { // eslint-disable-line no-unused-vars
    if (Store.get('startAtLastLocation')) {
        var position = Store.get('startAtLastLocationPosition')
        var lat = position.lat
        var lng = position.lng
    } else {
        position = Store.get('startLocationPosition')
        const useStartLocation = Store.get('showStartLocationMarker') && 'lat' in position && 'lng' in position
        lat = useStartLocation ? position.lat : centerLat
        lng = useStartLocation ? position.lng : centerLng
    }

    map = L.map('map', {
        center: [Number(getParameterByName('lat')) || lat, Number(getParameterByName('lon')) || lng],
        zoom: Number(getParameterByName('zoom')) || Store.get('zoomLevel'),
        maxZoom: 18,
        zoomControl: false,
        layers: [s2Level10LayerGroup, s2Level13LayerGroup, s2Level14LayerGroup, s2Level17LayerGroup]
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

    map.addLayer(markers)
    markersNoCluster = L.layerGroup().addTo(map)

    L.control.zoom({
        position: 'bottomright'
    }).addTo(map)

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

    if (Store.get('showStartLocationMarker')) {
        // Whether marker is draggable or not is set in createStartLocationMarker().
        startLocationMarker = createStartLocationMarker()
    }

    if (Store.get('showLocationMarker')) {
        userLocationMarker = createUserLocationMarker()
    }

    createMyLocationButton()

    map.addControl(new L.Control.Fullscreen({
        position: 'topright'
    }))

    var GeoSearchControl = window.GeoSearch.GeoSearchControl
    var OpenStreetMapProvider = window.GeoSearch.OpenStreetMapProvider
    var provider = new OpenStreetMapProvider()
    const search = new GeoSearchControl({
        provider: provider,
        position: 'topright',
        autoClose: true,
        keepResult: false,
        showMarker: false
    })
    map.addControl(search)

    map.on('geosearch/showlocation', function (e) {
        changeLocation(e.location.y, e.location.x)
    })

    initSidebar()

    $('#tabs_marker').tabs()
    $('#tabs_quest').tabs()
    $('#tabs_notify').tabs()

    if (Push._agents.chrome.isSupported()) {
        createServiceWorkerReceiver()
    }

    updateS2Overlay()

    map.on('moveend', function () {
        updateS2Overlay()
        const position = map.getCenter()
        Store.set('startAtLastLocationPosition', {
            lat: position.lat,
            lng: position.lng
        })
    })
}

/* eslint-disable no-unused-vars */
var stylemapnik = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'})
var styletopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'})
var stylesatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'})
var stylewikimedia = L.tileLayer('https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}{r}.png', {attribution: '<a href="https://wikimediafoundation.org/wiki/Maps_Terms_of_Use">Wikimedia</a>'})
var stylecartodbdarkmatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'})
var stylecartodbdarkmatternolabels = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'})
var stylecartodbpositron = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png', {attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'})
var stylecartodbpositronnolabels = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/light_nolabels/{z}/{x}/{y}.png', {attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'})
var stylecartodbvoyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'})
/* eslint-enable no-unused-vars */

function setTitleLayer(layername) {
    // fallback in case layername does not exist (anymore)
    if (!window.hasOwnProperty(layername)) {
        layername = 'stylemapnik'
    }

    if (map.hasLayer(window[_oldlayer])) { map.removeLayer(window[_oldlayer]) }
    map.addLayer(window[layername])
    _oldlayer = layername
}

function updateUserLocationMarker(style) {
    // Don't do anything if it's disabled.
    if (!userLocationMarker) {
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
            userLocationMarker.setIcon(locationIcon)
        } else {
            locationIcon = new L.Icon.Default()
            userLocationMarker.setIcon(locationIcon)
        }
        Store.set('locationMarkerStyle', style)
    }
    // Return value is currently unused.
    return userLocationMarker
}

function createUserLocationMarker() {
    var position = Store.get('followMyLocationPosition')
    var lat = ('lat' in position) ? position.lat : centerLat
    var lng = ('lng' in position) ? position.lng : centerLng

    var marker = L.marker([lat, lng]).addTo(markersNoCluster).bindPopup('<div><b>My Location</b></div>')
    addListeners(marker)

    marker.on('dragend', function () {
        var newLocation = marker.getLatLng()
        Store.set('followMyLocationPosition', {
            lat: newLocation.lat,
            lng: newLocation.lng
        })
    })

    return marker
}

function updateStartLocationMarker(style) {
    if (style in searchMarkerStyles) {
        Store.set('searchMarkerStyle', style)

        // If it's disabled, stop.
        if (!startLocationMarker) {
            return
        }

        var url = searchMarkerStyles[style].icon
        if (url) {
            var SearchIcon = L.icon({
                iconUrl: url,
                iconSize: [24, 24]
            })
            startLocationMarker.setIcon(SearchIcon)
        } else {
            SearchIcon = new L.Icon.Default()
            startLocationMarker.setIcon(SearchIcon)
        }
    }

    return startLocationMarker
}

function createStartLocationMarker() {
    var position = Store.get('startLocationPosition')
    var useStartLocation = 'lat' in position && 'lng' in position
    var lat = useStartLocation ? position.lat : centerLat
    var lng = useStartLocation ? position.lng : centerLng

    var isMovable = !Store.get('lockStartLocationMarker') && Store.get('isStartLocationMarkerMovable')
    var marker = L.marker([lat, lng], {draggable: isMovable}).addTo(markersNoCluster).bindPopup('<div><b>Start Location</b></div>')
    // Display marker on top of everything else so it doesn't get stuck.
    marker.setZIndexOffset(1000)
    addListeners(marker)

    marker.on('dragend', function () {
        var newLocation = marker.getLatLng()
        Store.set('startLocationPosition', {
            lat: newLocation.lat,
            lng: newLocation.lng
        })
    })

    return marker
}

function initSidebar() {
    $('#gyms-switch').prop('checked', Store.get('showGyms'))
    $('#gym-sidebar-switch').prop('checked', Store.get('useGymSidebar'))
    $('#gym-sidebar-wrapper').toggle(Store.get('showGyms') || Store.get('showRaids'))
    if (Store.get('showGymFilter')) $('#gyms-filter-wrapper').toggle(Store.get('showGyms'))
    $('#team-gyms-only-switch').val(Store.get('showTeamGymsOnly'))
    $('#raids-switch').prop('checked', Store.get('showRaids'))
    $('#raid-park-gym-switch').prop('checked', Store.get('showParkRaidsOnly'))
    $('#raid-active-gym-switch').prop('checked', Store.get('showActiveRaidsOnly'))
    $('#raid-min-level-only-switch').val(Store.get('showRaidMinLevel'))
    $('#raid-max-level-only-switch').val(Store.get('showRaidMaxLevel'))
    if (Store.get('showRaidFilter')) $('#raids-filter-wrapper').toggle(Store.get('showRaids'))
    $('#open-gyms-only-switch').prop('checked', Store.get('showOpenGymsOnly'))
    $('#park-gyms-only-switch').prop('checked', Store.get('showParkGymsOnly'))
    $('#gym-in-battle-switch').prop('checked', Store.get('showGymInBattle'))
    $('#min-level-gyms-filter-switch').val(Store.get('minGymLevel'))
    $('#max-level-gyms-filter-switch').val(Store.get('maxGymLevel'))
    $('#last-update-gyms-switch').val(Store.get('showLastUpdatedGymsOnly'))
    $('#pokemon-stats-switch').prop('checked', Store.get('showPokemonStats'))
    $('#pokemon-switch').prop('checked', Store.get('showPokemon'))
    $('#pokemons-filter-wrapper').toggle(Store.get('showPokemon'))
    $('#pokestops-switch').prop('checked', Store.get('showPokestops'))
    $('#pokestops-filter-wrapper').toggle(Store.get('showPokestops'))
    $('#pokestops-no-event-switch').prop('checked', Store.get('showPokestopsNoEvent'))
    $('#quests-switch').prop('checked', Store.get('showQuests'))
    $('#invasions-switch').prop('checked', Store.get('showInvasions'))
    $('#normal-lures-switch').prop('checked', Store.get('showNormalLures'))
    $('#glacial-lures-switch').prop('checked', Store.get('showGlacialLures'))
    $('#magnetic-lures-switch').prop('checked', Store.get('showMagneticLures'))
    $('#mossy-lures-switch').prop('checked', Store.get('showMossyLures'))
    $('#quests-filter-wrapper').toggle(Store.get('showQuests'))
    $('#geoloc-switch').prop('checked', Store.get('geoLocate'))
    $('#start-at-user-location-switch').prop('checked', Store.get('startAtUserLocation'))
    $('#start-at-last-location-switch').prop('checked', Store.get('startAtLastLocation'))
    $('#lock-start-marker-switch').prop('checked', Store.get('lockStartLocationMarker'))
    $('#follow-my-location-switch').prop('checked', Store.get('followMyLocation'))
    $('#scanned-switch').prop('checked', Store.get('showScanned'))
    $('#spawnpoints-switch').prop('checked', Store.get('showSpawnpoints'))
    $('#ranges-switch').prop('checked', Store.get('showRanges'))
    $('#s2-cells-switch').prop('checked', Store.get('showS2Cells'))
    $('#s2-cells-wrapper').toggle(Store.get('showS2Cells'))
    $('#s2-level10-switch').prop('checked', Store.get('showS2CellsLevel10'))
    $('#s2-level13-switch').prop('checked', Store.get('showS2CellsLevel13'))
    $('#s2-level14-switch').prop('checked', Store.get('showS2CellsLevel14'))
    $('#s2-level17-switch').prop('checked', Store.get('showS2CellsLevel17'))
    $('#notify-perfection-wrapper').toggle(Store.get('showPokemonStats'))
    $('#hideunnotified-switch').prop('checked', Store.get('hideNotNotified'))
    $('#popups-switch').prop('checked', Store.get('showPopups'))
    $('#bounce-switch').prop('checked', Store.get('isBounceDisabled'))
    $('#sound-switch').prop('checked', Store.get('playSound'))
    $('#pokemoncries').toggle(Store.get('playSound'))
    $('#cries-switch').prop('checked', Store.get('playCries'))
    $('#map-service-provider').val(Store.get('mapServiceProvider'))
    $('#weather-cells-switch').prop('checked', Store.get('showWeatherCells'))
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

    $('#pokemon-icon-size').val(Store.get('iconSizeModifier'))
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

function pokemonLabel(item) {
    var name = item['pokemon_name']
    var types = item['pokemon_types']
    var encounterId = item['encounter_id']
    var id = item['pokemon_id']
    var latitude = item['latitude']
    var longitude = item['longitude']
    var disappearTime = item['disappear_time']
    var atk = item['individual_attack']
    var def = item['individual_defense']
    var sta = item['individual_stamina']
    var move1 = (moves[item['move_1']] !== undefined) ? i8ln(moves[item['move_1']]['name']) : 'gen/unknown'
    var move2 = (moves[item['move_2']] !== undefined) ? i8ln(moves[item['move_2']]['name']) : 'gen/unknown'
    var weight = item['weight']
    var height = item['height']
    var gender = item['gender']
    var form = item['form']
    var cp = item['cp']
    var cpMultiplier = item['cp_multiplier']
    var weatherBoostedCondition = item['weather_boosted_condition']

    var pokemonIcon = getPokemonRawIconUrl(item)
    var gen = getPokemonGen(id)
    const showStats = Store.get('showPokemonStats')

    var formDisplay = ''
    var rarityDisplay = ''
    var weatherBoostDisplay = ''
    var typesDisplay = ''
    var statsDisplay = ''

    if (id === 29 || id === 32) {
        name = name.slice(0, -1)
    }

    if (form && 'forms' in idToPokemon[id] && form in idToPokemon[id].forms && idToPokemon[id].forms[form].formName !== '') {
        formDisplay += `(${i8ln(idToPokemon[id].forms[form].formName)})`
    }

    if (showConfig.rarity) {
        const rarity = getPokemonRarity(item['pokemon_id'])
        if (rarity) {
            rarityDisplay = `
                <div class='pokemon rarity'>
                 ${rarity}
               </div>`
        }
    }

    if (weatherBoostedCondition) {
        weatherBoostDisplay = `<img class='title-text' src='static/images/weather/${weatherImages[weatherBoostedCondition]}' width='24px'>`
    }

    typesDisplay = `<div class='pokemon types'>`
    $.each(types, function (index, type) {
        if (index === 1) {
            typesDisplay += `<img src='static/images/types/${type.type.toLowerCase()}.png' width='14' style='margin-left:4px;'>`
        } else {
            typesDisplay += `<img src='static/images/types/${type.type.toLowerCase()}.png' width='14'>`
        }
    })
    typesDisplay += `</div>`

    if (showStats && cp !== null && cpMultiplier !== null) {
        var iv = 0
        if (atk !== null && def !== null && sta !== null) {
            iv = getIv(atk, def, sta)
        }

        var ivColor = getPercentageCssColor(iv, 100, 82, 66, 51)

        var level = getPokemonLevel(cpMultiplier)

        statsDisplay = `
            <div>
              IV: <span class='pokemon encounter' style='color: ${ivColor};'>${iv.toFixed(1)}%</span> (A<span class='pokemon encounter'>${atk}</span> | D<span class='pokemon encounter'>${def}</span> | S<span class='pokemon encounter'>${sta}</span>)
            </div>
            <div class='pokemon cp-level'>
              CP: <span class='pokemon encounter'>${cp}</span> | Level: <span class='pokemon encounter'>${level}</span>
            </div>
            <div>
             Moves: <span class='pokemon encounter'>${move1}</span> / <span class='pokemon encounter'>${move2}</span>
            </div>`

        if (weight !== null && height !== null) {
            statsDisplay += `
                <div class='pokemon weight-height'>
                  Weight: <span class='pokemon encounter'>${weight.toFixed(2)}kg</span> | Height: <span class='pokemon encounter'>${height.toFixed(2)}m</span>
                </div>`
        }
    }

    const mapLabel = Store.get('mapServiceProvider') === 'googlemaps' ? 'Google' : 'Apple'

    const notifyLabel = notifiedPokemon.indexOf(id) < 0 ? 'Notify' : 'Unnotify'

    return `
    <div class='pokemon container'>
      <div class='pokemon container content-left'>
        <div>
          <img class='pokemon sprite' src='${pokemonIcon}'>
          ${typesDisplay}
          ${rarityDisplay}
          <div>
            <span class='pokemon gen'>Gen ${gen}</span>
          </div>
        </div>
      </div>
      <div class='pokemon container content-right'>
        <div>
          <div class='pokemon title'>
            <span class='title-text'>${name} ${formDisplay} ${genderType[gender - 1]} <a href='https://pokemongo.gamepress.gg/pokemon/${id}' target='_blank' title='View on GamePress'>#${id}</a></span>${weatherBoostDisplay}
          </div>
          <div class='pokemon disappear'>
            ${timestampToTime(disappearTime)} (<span class='label-countdown' disappears-at='${disappearTime}'>00m00s</span>)
          </div>
          ${statsDisplay}
          <div class='pokemon coords'>
            <a href='javascript:void(0);' onclick='javascript:openMapDirections(${latitude},${longitude});' title='Open in ${mapLabel} Maps'>${latitude.toFixed(7)}, ${longitude.toFixed(7)}</a>
          </div>
          <a href='javascript:excludePokemon(${id}, "${encounterId}")'>Hide</a> |
          <a href='javascript:notifyAboutPokemon(${id}, "${encounterId}")'>${notifyLabel}</a> |
          <a href='javascript:removePokemonMarker("${encounterId}")'>Remove</a>
        </div>
      </div>
    </div>`
}

function isUpcomingRaid(raid) {
    return raid && Date.now() < raid.start
}

function isOngoingRaid(raid) {
    return raid && Date.now() > raid.start && Date.now() < raid.end
}

function isValidRaid(raid) {
    return raid && Date.now() < raid.end
    // && Date.now() > raid.spawn
}

function isRaidSatisfiesRaidMinMaxFilter(raid) {
    return raid && raid['level'] <= Store.get('showRaidMaxLevel') && raid['level'] >= Store.get('showRaidMinLevel')
}

function isGymSatisfiesRaidExEligibleFilter(gym) {
    return gym.raid && (!Store.get('showParkRaidsOnly') || gym.is_ex_raid_eligible)
}

function gymLabel(gym) {
    const raid = gym.raid
    const teamName = gymTypes[gym.team_id]
    const titleText = gym.name ? gym.name : (gym.team_id === 0 ? teamName : 'Team ' + teamName)
    const mapLabel = Store.get('mapServiceProvider') === 'googlemaps' ? 'Google' : 'Apple'
    const isRaidUpcoming = isUpcomingRaid(raid)
    const isRaidOngoing = isOngoingRaid(raid)
    const isRaidFilterOn = Store.get('showRaids')

    var exRaidDisplay = ''
    var gymImageDisplay = ''
    var teamDisplay = ''
    var strenghtDisplay = ''
    var gymLeaderDisplay = ''
    var raidDisplay = ''

    if (gym.is_ex_raid_eligible) {
        exRaidDisplay = `
            <div class='gym ex-gym'>
              Ex Gym
            </div>`
    }

    if (gym.url) {
        gymImageDisplay = `
            <div>
              <img class='gym image ${teamName.toLowerCase()}' src='${gym.url}' width='64px' height='64px'>
            </div>`
    } else {
        let gymUrl = `gym_img?team=${teamName}&level=${getGymLevel(gym)}`
        if (gym.is_in_battle) {
            gymUrl += '&in_battle=1'
        }
        gymImageDisplay = `
            <div>
              <img class='gym sprite' src='${gymUrl}' width='64px'>
            </div>`
    }

    if (gym.team_id !== 0) {
        /* strenghtDisplay = `
            <div>
              Strength: <span class='info'>${gym.total_cp}</span>
            </div>` */

        gymLeaderDisplay = `
            <div>
              Gym leader: <span class='info'>${idToPokemon[gym.guard_pokemon_id].name}</span>
              <a class='info' href='https://pokemongo.gamepress.gg/pokemon/${gym.guard_pokemon_id}' target='_blank' title='View on GamePress'>#${gym.guard_pokemon_id}</a>
            </div>`

        teamDisplay = `
            <div class='gym team ${teamName.toLowerCase()}'>
              ${teamName}
            </div>`
    }

    if ((isRaidUpcoming || isRaidOngoing) && isRaidFilterOn && isRaidSatisfiesRaidMinMaxFilter(raid)) {
        const raidColor = ['252,112,176', '255,158,22', '184,165,221']
        const levelStr = '★'.repeat(raid.level)

        if (isRaidOngoing && raid.pokemon_id) {
            const pokemonIconUrl = getPokemonRawIconUrl(raid)

            let pokemonName = raid.pokemon_name
            if (raid.form && 'forms' in idToPokemon[raid.pokemon_id] && raid.form in idToPokemon[raid.pokemon_id].forms && idToPokemon[raid.pokemon_id].forms[raid.form].formName !== '') {
                pokemonName += ` (${i8ln(idToPokemon[raid.pokemon_id].forms[raid.form].formName)})`
            }

            let fastMoveName = 'unknown'
            let chargeMoveName = 'unknown'
            let fastMoveType = ''
            let chargeMoveType = ''

            if (raid.move_1 in moves) {
                fastMoveName = i8ln(moves[raid.move_1].name)
                fastMoveType = moves[raid.move_1].type
            }

            if (raid.move_2 in moves) {
                chargeMoveName = i8ln(moves[raid.move_2].name)
                chargeMoveType = moves[raid.move_2].type
            }

            raidDisplay = `
                <div class='section-divider'></div>
                <div class='raid container'>
                  <div class='raid container content-left'>
                    <div>
                      <div>
                        <img src='${pokemonIconUrl}' width='64px'>
                      </div>
                      <div class='raid stars'>
                        <span style='color:rgb(${raidColor[Math.floor((raid.level - 1) / 2)]})'>${levelStr}</span>
                      </div>
                    </div>
                  </div>
                  <div class='raid container content-right'>
                      <div>
                      <div class='raid title'>
                        <div>
                          ${pokemonName} ${genderType[raid.gender - 1]} <a href='https://pokemongo.gamepress.gg/pokemon/${raid.pokemon_id}' target='_blank' title='View on GamePress'>#${raid.pokemon_id}</a>
                        </div>
                        <div>
                          ${timestampToTime(raid.end)} (<span class='label-countdown' disappears-at='${raid.end}'>00m00s</span>)
                        </div>
                      </div>
                      <div>
                        CP: <span class='info'>${raid.cp}</span>
                      </div>
                      <div class='move container'>
                        <div class='move container content-left'>
                          <div>
                            <div>
                              ${fastMoveName}
                            </div>
                            <div>
                              ${chargeMoveName}
                            </div>
                          </div>
                        </div>
                        <div class='move container content-right'>
                          <div>
                            <div style='margin-bottom: 1px;'>
                              <span class='move type ${fastMoveType.toLowerCase()}'>${i8ln(fastMoveType)}</span>
                            </div>
                            <div>
                              <span class='move type ${chargeMoveType.toLowerCase()}'>${i8ln(chargeMoveType)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>`
        } else if (isRaidUpcoming) {
            raidDisplay = `
                <div class='section-divider'></div>
                <div class='raid title upcoming'>
                  <div>
                    <span style='color:rgb(${raidColor[Math.floor((raid.level - 1) / 2)]})'>${levelStr}</span> Raid
                  </div>
                  <div>
                    Starts at ${timestampToTime(raid.start)} (<span class='label-countdown' disappears-at='${raid.start}'>00m00s</span>)
                </div>`
        }
    }

    return `
        <div>
          <div class='gym container'>
            <div class='gym container content-left'>
              <div>
                ${gymImageDisplay}
                ${teamDisplay}
                ${exRaidDisplay}
              </div>
            </div>
            <div class='gym container content-right'>
              <div>
                <div class='gym title ${teamName.toLowerCase()}'>
                  ${titleText}
                </div>
                <div class='gym gym-info'>
                  ${strenghtDisplay}
                  <div>
                    Free slots: <span class='info'>${gym.slots_available}</span>
                  </div>
                  ${gymLeaderDisplay}
                </div>
                <div class='gym gym-info'>
                  <div>
                    Last scanned: <span class='info'>${timestampToDateTime(gym.last_scanned)}</span>
                  </div>
                  <div>
                    Last modified: <span class='info'>${timestampToDateTime(gym.last_modified)}</span>
                  </div>
                </div>
                <div>
                  <a href='javascript:void(0);' onclick='javascript:openMapDirections(${gym.latitude},${gym.longitude});' title='Open in ${mapLabel} Maps'>${gym.latitude.toFixed(7)}, ${gym.longitude.toFixed(7)}</a>
                </div>
              </div>
            </div>
          </div>
          ${raidDisplay}
        </div>`
}

function updateGymLabel(gym, marker) {
    marker._popup.setContent(gymLabel(gym))
    if (marker.infoWindowIsOpen && gym.raid != null) {
        // Update countdown time to prevent a countdown time of 0.
        updateLabelDiffTime()
    }
}

function pokestopLabel(pokestop) {
    const pokestopName = pokestop.name ? pokestop.name : 'PokéStop'
    const lureExpireTime = pokestop.lure_expiration
    const invasionExpireTime = pokestop.incident_expiration
    const invasionId = pokestop.incident_grunt_type
    const quest = pokestop.quest
    const mapLabel = Store.get('mapServiceProvider') === 'googlemaps' ? 'Google' : 'Apple'
    var pokestopImageSource = ''
    var pokestopImage = 'stop'
    var pokestopImageClass = ''
    var lureDisplay = ''
    var lureClass = ''
    var invasionDisplay = ''
    var questDisplay = ''
    var now = Date.now()

    if (Store.get('showQuests') && quest) {
        let rewardImageSource = ''
        let rewardText = ''

        switch (quest.reward_type) {
            case 2:
                if (includedQuestItems.includes(parseInt(quest.item_id))) {
                    rewardImageSource = 'static/images/quest/reward_' + quest.item_id + '_1.png'
                    rewardText = quest.item_amount + ' ' + i8ln(questItemNames[quest.item_id])
                }
                break
            case 3:
                if (includedQuestItems.includes(6)) {
                    rewardImageSource = 'static/images/quest/reward_stardust.png'
                    rewardText = quest.stardust + ' Stardust'
                }
                break
            case 7:
                if (includedQuestPokemon.includes(parseInt(quest.pokemon_id))) {
                    rewardImageSource = getPokemonRawIconUrl(quest)
                    rewardText = `${idToPokemon[quest.pokemon_id].name} <a href='https://pokemongo.gamepress.gg/pokemon/${quest.pokemon_id}' target='_blank' title='View on GamePress'>#${quest.pokemon_id}</a>`
                }
                break
        }

        if (rewardText) {
            pokestopImage += '_q'
            questDisplay = `
                <div class='section-divider'></div>
                <div class='pokestop container'>
                  <div class='pokestop container content-left'>
                    <div>
                      <div>
                        <img class='pokestop quest-image' src="${rewardImageSource}" width='64px' height='64px'/>
                      </div>
                    </div>
                  </div>
                  <div class='pokestop container content-right'>
                    <div>
                      <div class='pokestop title'>
                        Quest
                      </div>
                      <div>
                        Task: <span class='info'>${quest.task}</span>
                      </div>
                      <div>
                        Reward: <span class='info'>${rewardText}</span>
                      </div>
                    </div>
                  </div>
                </div>`
        }
    }

    if (Store.get('showInvasions') && invasionExpireTime && invasionExpireTime > now) {
        if (invasionId === 4 || invasionId === 5) {
            pokestopImage += '_i'
        } else {
            pokestopImage += '_i_' + idToInvasion[invasionId].type.toLowerCase()
        }

        invasionDisplay = `
            <div class='section-divider'></div>
            <div class='pokestop container'>
              <div class='pokestop container content-left'>
                <div>
                  <div>
                    <img class='pokestop rocket-image' src="static/images/pokestop/rocket_r.png" width='64px' height='64px'/>
                  </div>
                </div>
              </div>
              <div class='pokestop container content-right'>
                <div>
                  <div class='pokestop title'>
                    <div>
                      Team Rocket Invasion
                    </div>
                    <div>
                      ${timestampToTime(invasionExpireTime)} (<span class='label-countdown' disappears-at='${invasionExpireTime}'>00m00s</span>)
                    </div>
                  </div>
                  <div>
                    Invasion type: <span class='info'>${idToInvasion[invasionId].type}<span>
                  </div>
                  <div>
                    Grunt gender: <span class='info'>${idToInvasion[invasionId].gruntGender}<span>
                  </div>
                </div>
              </div>
            </div>`
    }

    if (lureExpireTime && lureExpireTime > now) {
        let lureTypeText = ''
        switch (pokestop.active_fort_modifier) {
            case 501:
                if (Store.get('showNormalLures')) {
                    lureTypeText = 'Normal Lure'
                    lureClass = 'lure-normal'
                }
                break
            case 502:
                if (Store.get('showGlacialLures')) {
                    lureTypeText = 'Glacial Lure'
                    lureClass = 'lure-glacial'
                }
                break
            case 503:
                if (Store.get('showMossyLures')) {
                    lureTypeText = 'Mossy Lure'
                    lureClass = 'lure-mossy'
                }
                break
            case 504:
                if (Store.get('showMagneticLures')) {
                    lureTypeText = 'Magnetic Lure'
                    lureClass = 'lure-magnetic'
                }
                break
        }

        if (lureTypeText) {
            pokestopImage += '_l_' + pokestop.active_fort_modifier
            lureDisplay = `
                <div class='pokestop lure-container ${lureClass}'>
                  <div>
                    ${lureTypeText}
                  </div>
                  <div>
                    ${timestampToTime(lureExpireTime)} (<span class='label-countdown' disappears-at='${lureExpireTime}'>00m00s</span>)
                  </div>
                </div>`
        }
    }

    if (!lureDisplay) {
        lureClass = 'no-lure'
    }

    if (pokestop.image) {
        pokestopImageSource = pokestop.image
        pokestopImageClass = 'image'
    } else {
        pokestopImageSource = 'static/images/pokestop/' + pokestopImage + '.png'
        pokestopImageClass = 'sprite'
    }

    return `
        <div>
          <div class='pokestop container'>
            <div class='pokestop container content-left'>
              <div>
                <div>
                  <img class='pokestop ${pokestopImageClass} ${lureClass}' src='${pokestopImageSource}' width='64px' height='64px'>
                </div>
              </div>
            </div>
            <div class='pokestop container content-right'>
              <div>
                <div class='pokestop title ${lureClass}'>
                  ${pokestopName}
                </div>
                ${lureDisplay}
                <div>
                  Last scanned: <span class='info'>${timestampToDateTime(pokestop.last_updated)}</span>
                </div>
                <div>
                  <a href='javascript:void(0);' onclick='javascript:openMapDirections(${pokestop.latitude},${pokestop.longitude});' title='Open in ${mapLabel} Maps'>${pokestop.latitude.toFixed(7)}, ${pokestop.longitude.toFixed(7)}</a>
                </div>
              </div>
            </div>
          </div>
          ${invasionDisplay}
          ${questDisplay}
        </div>`
}

function updatePokestopLabel(pokestop, marker) {
    marker._popup.setContent(pokestopLabel(pokestop))
    const now = Date.now()
    if (marker.infoWindowIsOpen && ((pokestop.lure_expiration && pokestop.lure_expiration > now) ||
            (pokestop.incident_expiration && pokestop.incident_expiration > now))) {
        // Update countdown time to prevent a countdown time of 0.
        updateLabelDiffTime()
    }
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
    return 6 - gym.slots_available
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

function isNotifyPoke(pokemon) {
    const pokemonRarity = getPokemonRarity(pokemon['pokemon_id'])
    const isOnNotifyList = notifiedPokemon.indexOf(pokemon['pokemon_id']) > -1 || (showConfig.rarity && notifiedRarity.includes(pokemonRarity))
    const isNotifyPerfectionPkmn = isNotifyPerfectionPoke(pokemon)
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
        if (!marker.animationDisabled && !Store.get('isBounceDisabled')) {
            marker.bounce()
        }
    }

    addListeners(marker)
}

function setupGymMarker(gym) {
    var marker = L.marker([gym.latitude, gym.longitude])
    updateGymMarker(gym, marker)
    if (!Store.get('useGymSidebar') || !showConfig.gym_sidebar) {
        marker.bindPopup()
    }
    markers.addLayer(marker)

    if (!marker.rangeCircle && isRangeActive(map)) {
        marker.rangeCircle = addRangeCircle(marker, map, 'gym', gym.team_id)
    }

    marker.gym_id = gym.gym_id
    gym.isUpdated = true

    if (Store.get('useGymSidebar') && showConfig.gym_sidebar) {
        marker.on('click', function () {
            var gymSidebar = document.querySelector('#gym-details')
            if (gymSidebar.getAttribute('data-id') === gym.gym_id && gymSidebar.classList.contains('visible')) {
                gymSidebar.classList.remove('visible')
            } else {
                gymSidebar.setAttribute('data-id', gym.gym_id)
                showGymDetails(gym.gym_id)
            }
        })

        if (!isMobileDevice() && !isTouchDevice()) {
            marker.on('mouseover', function () {
                marker.openPopup()
                updateLabelDiffTime()
            })
        }

        marker.on('mouseout', function () {
            marker.closePopup()
            updateLabelDiffTime()
        })
    } else {
        addListeners(marker, 'gym')
    }

    return marker
}

function updateGymMarker(gym, marker) {
    var markerImage = ''
    var zIndexOffset
    const gymLevel = getGymLevel(gym)

    if (gym.raid != null && isGymSatisfiesRaidFilters(gym)) {
        const raid = gym.raid
        const now = Date.now()

        if (raid.start < now && raid.end > now) {
            markerImage = 'gym_img?team=' + gymTypes[gym.team_id] + '&level=' + gymLevel + '&raidlevel=' + raid.level + '&pkm=' + raid.pokemon_id
            if (raid.form != null && raid.form > 0) {
                markerImage += '&form=' + raid.form
            }
            zIndexOffset = 100
        } else if (raid.end > now) {
            markerImage = 'gym_img?team=' + gymTypes[gym.team_id] + '&level=' + gymLevel + '&raidlevel=' + raid.level
            zIndexOffset = 20
        } else {
            markerImage = 'gym_img?team=' + gymTypes[gym.team_id] + '&level=' + gymLevel
            zIndexOffset = 10
        }
    }

    if (gym.is_in_battle) {
        markerImage += '&in_battle=1'
    }

    var GymIcon = new L.Icon({
        iconUrl: markerImage,
        iconSize: [48, 48]
    })

    marker.setIcon(GymIcon)
    marker.setZIndexOffset = zIndexOffset

    return marker
}

function setupPokestopMarker(pokestop) {
    var marker = L.marker([pokestop.latitude, pokestop.longitude])
    updatePokestopMarker(pokestop, marker)
    marker.bindPopup()
    markers.addLayer(marker)

    if (!marker.rangeCircle && isRangeActive(map)) {
        marker.rangeCircle = addRangeCircle(marker, map, 'pokestop')
    }

    marker.pokestop_id = pokestop.pokestop_id
    pokestop.isUpdated = true

    addListeners(marker, 'pokestop')

    return marker
}

function updatePokestopMarker(pokestop, marker) {
    const quest = pokestop.quest
    const activeFortModifier = pokestop.active_fort_modifier
    const lureExpireTime = pokestop.lure_expiration
    const invasionId = pokestop.incident_grunt_type
    const invasionExpireTime = pokestop.incident_expiration
    var markerImage = 'stop'
    var shadowImage
    var shadowSize
    var shadowAnchor
    var now = new Date()

    if (Store.get('showQuests') && quest) {
        const questItemId = quest.item_id
        const questPokemonId = quest.pokemon_id
        const questRewardType = quest.reward_type

        switch (questRewardType) {
            case 2:
                if (includedQuestItems.includes(parseInt(questItemId))) {
                    shadowImage = 'static/images/quest/reward_' + questItemId + '_1.png'
                    shadowSize = [30, 30]
                    shadowAnchor = [30, 30]
                    markerImage += '_q'
                }
                break
            case 3:
                if (includedQuestItems.includes(6)) {
                    shadowImage = 'static/images/quest/reward_stardust.png'
                    shadowSize = [30, 30]
                    shadowAnchor = [30, 30]
                    markerImage += '_q'
                }
                break
            case 7:
                if (includedQuestPokemon.includes(parseInt(questPokemonId))) {
                    if (generateImages) {
                        shadowImage = `pkm_img?pkm=${questPokemonId}`
                        shadowSize = [35, 35]
                        shadowAnchor = [30, 30]
                    } else {
                        shadowImage = pokemonSprites(questPokemonId).filename
                        shadowSize = [40, 40]
                        shadowAnchor = [30, 30]
                    }
                    markerImage += '_q'
                }
        }
    }

    if (Store.get('showInvasions') && invasionExpireTime && invasionExpireTime > now) {
        if (invasionId === 4 || invasionId === 5) {
            markerImage += '_i'
        } else {
            markerImage += '_i_' + idToInvasion[invasionId].type.toLowerCase()
        }
    }

    if (lureExpireTime && lureExpireTime > now) {
        switch (activeFortModifier) {
            case 501:
                if (Store.get('showNormalLures')) {
                    markerImage += '_l_501'
                }
                break
            case 502:
                if (Store.get('showGlacialLures')) {
                    markerImage += '_l_502'
                }
                break
            case 503:
                if (Store.get('showMossyLures')) {
                    markerImage += '_l_503'
                }
                break
            case 504:
                if (Store.get('showMagneticLures')) {
                    markerImage += '_l_504'
                }
                break
        }
    }

    var PokestopIcon = new L.icon({ // eslint-disable-line new-cap
        iconUrl: 'static/images/pokestop/' + markerImage + '.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -16],
        shadowUrl: shadowImage,
        shadowSize: shadowSize,
        shadowAnchor: shadowAnchor
    })

    marker.setIcon(PokestopIcon)
    marker.setZIndexOffset = lureExpireTime ? 3 : 2

    return marker
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
    markersNoCluster.addLayer(circle)
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
    markersNoCluster.addLayer(circle)
    return circle
}

function showS2Cells(level, color, weight) {
    const bounds = map.getBounds()
    const swPoint = bounds.getSouthWest()
    const nePoint = bounds.getNorthEast()
    const swLat = swPoint.lat
    const swLng = swPoint.lng
    const neLat = nePoint.lat
    const neLng = nePoint.lng

    function addPoly(cell) {
        const vertices = cell.getCornerLatLngs()
        const poly = L.polygon(vertices,
            Object.assign({color: color, opacity: 0.5, weight: weight, fillOpacity: 0.0}))
        if (cell.level === 10) {
            s2Level10LayerGroup.addLayer(poly)
        } else if (cell.level === 13) {
            s2Level13LayerGroup.addLayer(poly)
        } else if (cell.level === 14) {
            s2Level14LayerGroup.addLayer(poly)
        } else if (cell.level === 17) {
            s2Level17LayerGroup.addLayer(poly)
        }
    }

    let processedCells = {}
    let stack = []

    const centerCell = S2.S2Cell.FromLatLng(bounds.getCenter(), level)
    processedCells[centerCell.toString()] = true
    stack.push(centerCell)
    addPoly(centerCell)

    // Find all cells within view with a slighty modified version of the BFS algorithm.
    while (stack.length > 0) {
        const cell = stack.pop()
        const neighbors = cell.getNeighbors()
        neighbors.forEach(function (ncell, index) {
            if (processedCells[ncell.toString()] !== true) {
                const cornerLatLngs = ncell.getCornerLatLngs()
                for (let i = 0; i < 4; i++) {
                    const item = cornerLatLngs[i]
                    if (item.lat >= swLat && item.lng >= swLng &&
                            item.lat <= neLat && item.lng <= neLng) {
                        processedCells[ncell.toString()] = true
                        stack.push(ncell)
                        addPoly(ncell)
                        break
                    }
                }
            }
        })
    }
}

function updateS2Overlay() {
    if (Store.get('showS2Cells')) {
        if (Store.get('showS2CellsLevel10')) {
            s2Level10LayerGroup.clearLayers()
            if (map.getZoom() > 7) {
                showS2Cells(10, 'black', 7)
            } else {
                toastr['error'](i8ln('Zoom in more to show them.'), i8ln('Weather cells are currently hidden'))
                toastr.options = toastrOptions
            }
        }

        if (Store.get('showS2CellsLevel13')) {
            s2Level13LayerGroup.clearLayers()
            if (map.getZoom() > 10) {
                showS2Cells(13, 'red', 5)
            } else {
                toastr['error'](i8ln('Zoom in more to show them.'), i8ln('Ex trigger cells are currently hidden'))
                toastr.options = toastrOptions
            }
        }

        if (Store.get('showS2CellsLevel14')) {
            s2Level14LayerGroup.clearLayers()
            if (map.getZoom() > 11) {
                showS2Cells(14, 'green', 3)
            } else {
                toastr['error'](i8ln('Zoom in more to show them.'), i8ln('Gym cells are currently hidden'))
                toastr.options = toastrOptions
            }
        }

        if (Store.get('showS2CellsLevel17')) {
            s2Level17LayerGroup.clearLayers()
            if (map.getZoom() > 14) {
                showS2Cells(17, 'blue', 1)
            } else {
                toastr['error'](i8ln('Zoom in more to show them.'), i8ln('PokéStop cells are currently hidden'))
                toastr.options = toastrOptions
            }
        }
    }
}

function clearSelection() {
    if (document.selection) {
        document.selection.empty()
    } else if (window.getSelection) {
        window.getSelection().removeAllRanges()
    }
}

function addListeners(marker, type) {
    marker.on('click', function () {
        if (!marker.infoWindowIsOpen) {
            switch (type) {
                case 'gym':
                    if (mapData.gyms[marker.gym_id].isUpdated) {
                        updateGymLabel(mapData.gyms[marker.gym_id], marker)
                    }
                    break
                case 'pokestop':
                    if (mapData.pokestops[marker.pokestop_id].isUpdated) {
                        updatePokestopLabel(mapData.pokestops[marker.pokestop_id], marker)
                    }
                    break
            }
            marker.openPopup()
            updateLabelDiffTime()
            marker.persist = true
            marker.infoWindowIsOpen = true
        } else {
            marker.closePopup()
            switch (type) {
                case 'gym':
                    mapData.gyms[marker.gym_id].isUpdated = false
                    break
                case 'pokestop':
                    mapData.pokestops[marker.pokestop_id].isUpdated = false
                    break
            }
            marker.persist = null
            marker.infoWindowIsOpen = false
        }
    })

    if (!isMobileDevice() && !isTouchDevice()) {
        marker.on('mouseover', function () {
            switch (type) {
                case 'gym':
                    if (mapData.gyms[marker.gym_id].isUpdated) {
                        updateGymLabel(mapData.gyms[marker.gym_id], marker)
                    }
                    break
                case 'pokestop':
                    if (mapData.pokestops[marker.pokestop_id].isUpdated) {
                        updatePokestopLabel(mapData.pokestops[marker.pokestop_id], marker)
                    }
                    break
            }
            marker.openPopup()
            updateLabelDiffTime()
            marker.infoWindowIsOpen = true
        })
    }

    marker.on('mouseout', function () {
        if (!marker.persist) {
            marker.closePopup()
            switch (type) {
                case 'gym':
                    mapData.gyms[marker.gym_id].isUpdated = false
                    break
                case 'pokestop':
                    mapData.pokestops[marker.pokestop_id].isUpdated = false
                    break
            }
            marker.infoWindowIsOpen = false
        }
    })

    return marker
}

function updateStaleMarkers() {
    const now = new Date()

    $.each(onGoingRaidGyms, function (key, gym) {
        if (gym.raid.end <= now) {
            if (isGymSatisfiesFilters(pokestop)) {
                mapData.gyms[gym.gym_id].raid = null
                updateGymMarker(mapData.gyms[gym.gym_id], mapData.gyms[gym.gym_id].marker)
                if (mapData.gyms[gym.gym_id].marker.infoWindowIsOpen) {
                    updateGymLabel(gym, mapData.gyms[gym.gym_id].marker)
                }
                // Set isUpdated to true so label gets updated next time it's opened.
                mapData.gyms[gym.gym_id].isUpdated = true
                delete onGoingRaidGyms[gym.pokestop_id]
            } else {
                removeGym(gym)
            }
        }
    })

    $.each(luredPokestops, function (key, pokestop) {
        if (pokestop.lure_expiration <= now) {
            if (isPokestopSatisfiesFilters(pokestop)) {
                mapData.pokestops[pokestop.pokestop_id].lure_expiration = null
                mapData.pokestops[pokestop.pokestop_id].active_fort_modifier = null
                updatePokestopMarker(mapData.pokestops[pokestop.pokestop_id], mapData.pokestops[pokestop.pokestop_id].marker)
                if (mapData.pokestops[pokestop.pokestop_id].marker.infoWindowIsOpen) {
                    updatePokestopLabel(pokestop, mapData.pokestops[pokestop.pokestop_id].marker)
                }
                // Set isUpdated to true so label gets updated next time it's opened.
                mapData.pokestops[pokestop.pokestop_id].isUpdated = true
                delete luredPokestops[pokestop.pokestop_id]
            } else {
                removePokestop(pokestop)
            }
        }
    })

    $.each(invadedPokestops, function (key, pokestop) {
        if (pokestop.incident_expiration <= now) {
            if (isPokestopSatisfiesFilters(pokestop)) {
                mapData.pokestops[pokestop.pokestop_id].incident_expiration = null
                mapData.pokestops[pokestop.pokestop_id].incident_grunt_type = null
                updatePokestopMarker(mapData.pokestops[pokestop.pokestop_id], mapData.pokestops[pokestop.pokestop_id].marker)
                if (mapData.pokestops[pokestop.pokestop_id].marker.infoWindowIsOpen) {
                    updatePokestopLabel(pokestop, mapData.pokestops[pokestop.pokestop_id].marker)
                }
                // Set isUpdated to true so label gets updated next time it's opened.
                mapData.pokestops[pokestop.pokestop_id].isUpdated = true
                delete invadedPokestops[pokestop.pokestop_id]
            } else {
                removePokestop(pokestop)
            }
        }
    })
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
        const isRarityExcluded = showConfig.rarity && excludedRarity.indexOf(pokemonRarity) !== -1
        const isNotifyPkmn = isNotifyPoke(pokemon)
        const prionotifyactiv = Store.get('prioNotify')

        if (isPokeExpired || isPokeExcluded || isRarityExcluded) {
            if ((isNotifyPkmn && !prionotifyactiv) || (!isNotifyPkmn)) {
                const oldMarker = pokemon.marker
                const isPokeExcludedByRarity = excludedPokemonByRarity.indexOf(pokemonId) !== -1

                if (isRarityExcluded && !isPokeExcludedByRarity) {
                    excludedPokemonByRarity.push(pokemonId)
                }

                if (oldMarker.rangeCircle) {
                    markers.removeLayer(oldMarker.rangeCircle)
                    markersNoCluster.removeLayer(oldMarker.rangeCircle)
                    delete oldMarker.rangeCircle
                }

                markers.removeLayer(oldMarker)
                markersNoCluster.removeLayer(oldMarker)
                delete mapData.pokemons[key]
            }
        }
    })

    $.each(mapData.lurePokemons, function (key, lurePokemon) {
        if (lurePokemon['lure_expiration'] < new Date().getTime() ||
            getExcludedPokemon().indexOf(lurePokemon['pokemon_id']) >= 0) {
            markers.removeLayer(lurePokemon.marker)
            markersNoCluster.removeLayer(lurePokemon.marker)
            delete mapData.lurePokemons[key]
        }
    })

    $.each(mapData.scanned, function (key, scanned) {
        // If older than 15mins remove
        if (scanned['last_modified'] < (new Date().getTime() - 15 * 60 * 1000)) {
            markersNoCluster.removeLayer(scanned.marker)
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
                    markersNoCluster.removeLayer(marker.rangeCircle)
                    delete marker.rangeCircle
                }
            }
        }
    })
}

function loadRawData() {
    var userAuthCode = localStorage.getItem('userAuthCode')
    var loadPokemon = Store.get('showPokemon')
    var loadGyms = Store.get('showGyms') || Store.get('showRaids')
    var loadPokestops = Store.get('showPokestops')
    var loadPokestopsNoEvent = Store.get('showPokestopsNoEvent')
    var loadQuests = Store.get('showQuests')
    var loadInvasions = Store.get('showInvasions')
    var loadLures = Store.get('showNormalLures') || Store.get('showGlacialLures') || Store.get('showMagneticLures') || Store.get('showMossyLures')
    var loadScanned = Store.get('showScanned')
    var loadSpawnpoints = Store.get('showSpawnpoints')
    var loadWeather = Store.get('showWeatherCells')
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
            'pokestopsNoEvent': loadPokestopsNoEvent,
            'lastpokestops': lastpokestops,
            'quests': loadQuests,
            'invasions': loadInvasions,
            'lures': loadLures,
            'gyms': loadGyms,
            'lastgyms': lastgyms,
            'scanned': loadScanned,
            'lastslocs': lastslocs,
            'spawnpoints': loadSpawnpoints,
            'weather': loadWeather,
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
            toastr.options = toastrOptions
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

function processPokemonChunked(pokemon, chunkSize) {
    // Early skip if we have nothing to process.
    if (typeof pokemon === 'undefined' || pokemon.length === 0) {
        return
    }
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
                markersNoCluster.addLayer(newMarker)
            } else {
                markers.addLayer(newMarker)
            }
        }

        if (oldMarker) {
            markers.removeLayer(oldMarker)
            markersNoCluster.removeLayer(oldMarker)
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
    const isRarityExcluded = showConfig.rarity && excludedRarity.indexOf(pokemonRarity) !== -1
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
            const scaleByRarity = Store.get('scaleByRarity')
            if (item.marker) {
                markers.removeLayer(item)
                markersNoCluster.removeLayer(item)
            }
            newMarker = setupPokemonMarker(item, map, scaleByRarity, isNotifyPkmn)
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

function isPokestopSatisfiesFilters(pokestop) {
    if (!Store.get('showPokestops') || pokestop == null) {
        return false
    }

    if (Store.get('showPokestopsNoEvent')) {
        return true
    }

    if (Store.get('showQuests') && pokestop.quest) {
        switch (pokestop.quest.reward_type) {
            case 2:
                if (includedQuestItems.includes(parseInt(pokestop.quest.item_id))) {
                    return true
                }
                break
            case 3:
                if (includedQuestItems.includes(6)) {
                    return true
                }
                break
            case 7:
                if (includedQuestPokemon.includes(parseInt(pokestop.quest.pokemon_id))) {
                    return true
                }
                break
        }
    }

    const now = Date.now()

    if (Store.get('showInvasions') && pokestop.incident_expiration && pokestop.incident_expiration > now) {
        return true
    }

    if (pokestop.lure_expiration && pokestop.lure_expiration > now) {
        switch (pokestop.active_fort_modifier) {
            case 501:
                return Store.get('showNormalLures')
            case 502:
                return Store.get('showGlacialLures')
            case 503:
                return Store.get('showMossyLures')
            case 504:
                return Store.get('showMagneticLures')
        }
    }

    return false
}

function processPokestop(i, pokestop) {
    const now = Date.now()

    if (!mapData.pokestops.hasOwnProperty(pokestop.pokestop_id)) {
        if (!isPokestopSatisfiesFilters(pokestop)) {
            return true
        }
        // New pokestop, add marker to map and item to dict.
        pokestop.marker = setupPokestopMarker(pokestop)
        mapData.pokestops[pokestop.pokestop_id] = pokestop
        if (pokestop.lure_expiration && pokestop.lure_expiration > now) {
            luredPokestops[pokestop.pokestop_id] = pokestop
        }
        if (pokestop.incident_expiration && pokestop.incident_expiration > now) {
            invadedPokestops[pokestop.pokestop_id] = pokestop
        }
    } else {
        // Existing pokestop, update marker and dict item if necessary.
        const pokestop2 = mapData.pokestops[pokestop.pokestop_id]
        const newLure = pokestop.lure_expiration && pokestop.lure_expiration > now && !pokestop2.lure_expiration
        const newInvasion = pokestop.incident_expiration && pokestop.incident_expiration > now && !pokestop2.incident_expiration
        const questChange = !!pokestop.quest !== !!pokestop2.quest

        if (newLure || newInvasion || questChange) {
            if (isPokestopSatisfiesFilters(pokestop)) {
                if (mapData.pokestops[pokestop.pokestop_id].marker.infoWindowIsOpen) {
                    updatePokestopLabel(pokestop, mapData.pokestops[pokestop.pokestop_id].marker)
                }
                updatePokestopMarker(pokestop, mapData.pokestops[pokestop.pokestop_id].marker)
                if (newLure) {
                    mapData.pokestops[pokestop.pokestop_id].lure_expiration = pokestop.lure_expiration
                    mapData.pokestops[pokestop.pokestop_id].active_fort_modifier = pokestop.active_fort_modifier
                    luredPokestops[pokestop.pokestop_id] = pokestop
                }
                if (newInvasion) {
                    mapData.pokestops[pokestop.pokestop_id].incident_expiration = pokestop.incident_expiration
                    mapData.pokestops[pokestop.pokestop_id].incident_grunt_type = pokestop.incident_grunt_type
                    invadedPokestops[pokestop.pokestop_id] = pokestop
                }
                if (questChange) {
                    mapData.pokestops[pokestop.pokestop_id].quest = pokestop.quest
                }
                mapData.pokestops[pokestop.pokestop_id].last_updated = pokestop.last_updated
                mapData.pokestops[pokestop.pokestop_id].isUpdated = true
            } else {
                removePokestop(pokestop)
            }
            return true
        }

        if (pokestop.last_updated > pokestop2.last_updated) {
            if (mapData.pokestops[pokestop.pokestop_id].marker.infoWindowIsOpen) {
                updatePokestopLabel(pokestop, mapData.pokestops[pokestop.pokestop_id].marker)
            }
            mapData.pokestops[pokestop.pokestop_id].last_updated = pokestop.last_updated
            mapData.pokestops[pokestop.pokestop_id].isUpdated = true
        }
    }
}

function removePokestop(pokestop) {
    if (mapData.pokestops[pokestop.pokestop_id] && mapData.pokestops[pokestop.pokestop_id].marker) {
        if (mapData.pokestops[pokestop.pokestop_id].marker.rangeCircle) {
            markers.removeLayer(mapData.pokestops[pokestop.pokestop_id].marker.rangeCircle)
        }
        markers.removeLayer(mapData.pokestops[pokestop.pokestop_id].marker)
        delete mapData.pokestops[pokestop.pokestop_id]
        if (luredPokestops[pokestop.pokestop_id]) {
            delete luredPokestops[pokestop.pokestop_id]
        }
    }
}

function updatePokestops() {
    $.each(mapData.pokestops, function (key, pokestop) {
        if (isPokestopSatisfiesFilters(pokestop)) {
            updatePokestopMarker(pokestop, mapData.pokestops[pokestop.pokestop_id].marker)
            updatePokestopLabel(pokestop, mapData.pokestops[pokestop.pokestop_id].marker)
        } else {
            removePokestop(pokestop)
        }
    })
    lastpokestops = false
    updateMap()
}

// For each invaded/lured pokestop update the marker if the invasion/lure has expired.
function updateEventPokestops() {
    const now = new Date()

    $.each(luredPokestops, function (key, pokestop) {
        if (pokestop.lure_expiration && pokestop.lure_expiration <= now) {
            if (isPokestopSatisfiesFilters(pokestop)) {
                mapData.pokestops[pokestop.pokestop_id].lure_expiration = null
                mapData.pokestops[pokestop.pokestop_id].active_fort_modifier = null
                updatePokestopMarker(mapData.pokestops[pokestop.pokestop_id], mapData.pokestops[pokestop.pokestop_id].marker)
                if (mapData.pokestops[pokestop.pokestop_id].marker.infoWindowIsOpen) {
                    updatePokestopLabel(pokestop, mapData.pokestops[pokestop.pokestop_id].marker)
                }
                // Set isUpdated to true so label gets updated next time it's opened.
                mapData.pokestops[pokestop.pokestop_id].isUpdated = true
                delete luredPokestops[pokestop.pokestop_id]
            } else {
                removePokestop(pokestop)
            }
        }
    })

    $.each(invadedPokestops, function (key, pokestop) {
        if (pokestop.incident_expiration && pokestop.incident_expiration <= now) {
            if (isPokestopSatisfiesFilters(pokestop)) {
                mapData.pokestops[pokestop.pokestop_id].incident_expiration = null
                mapData.pokestops[pokestop.pokestop_id].incident_grunt_type = null
                updatePokestopMarker(mapData.pokestops[pokestop.pokestop_id], mapData.pokestops[pokestop.pokestop_id].marker)
                if (mapData.pokestops[pokestop.pokestop_id].marker.infoWindowIsOpen) {
                    updatePokestopLabel(pokestop, mapData.pokestops[pokestop.pokestop_id].marker)
                }
                // Set isUpdated to true so label gets updated next time it's opened.
                mapData.pokestops[pokestop.pokestop_id].isUpdated = true
                delete invadedPokestops[pokestop.pokestop_id]
            } else {
                removePokestop(pokestop)
            }
        }
    })
}

function processGym(i, gym) {
    if (!Store.get('showGyms') && !Store.get('showRaids')) {
        return false // in case the checkbox was unchecked in the meantime.
    }

    const now = Date.now()

    if (!mapData.gyms.hasOwnProperty(gym.gym_id)) {
        if (!isGymSatisfiesFilters(gym)) {
            return true
        }

        // New gym, add marker to map and item to dict.
        gym.marker = setupGymMarker(gym)
        mapData.gyms[gym.gym_id] = gym
        if (gym.raid != null && gym.raid.start < now && gym.raid.end > now) {
            onGoingRaidGyms[gym.gym_id] = gym
        }
    } else {
        // Existing gym, update marker and dict item if necessary.
        const gym2 = mapData.gyms[gym.gym_id]
        if ((gym.last_modified !== gym2.last_modified) ||
                (gym.raid != null && gym2.raid != null && gym.raid.cp > 0 && gym2.raid.cp === 0 && gym.raid.end > now) ||
                (gym.is_in_battle !== gym2.is_in_battle)) {
            if (isGymSatisfiesFilters(gym)) {
                gym.marker = updateGymMarker(gym, mapData.gyms[gym.gym_id].marker)
                mapData.gyms[gym.gym_id] = gym
            } else {
                removeGym(gym)
            }
        }

        if (mapData.gyms[gym.gym_id].marker.infoWindowIsOpen) {
            updateGymLabel(gym, mapData.gyms[gym.gym_id].marker)
        }
        mapData.gyms[gym.gym_id].last_scanned = gym.last_scanned
        mapData.gyms[gym.gym_id].isUpdated = true
    }
}

function removeGym(gym) {
    if (mapData.gyms.hasOwnProperty(gym.gym_id) && mapData.gyms[gym.gym_id].marker != null) {
        if (mapData.gyms[gym.gym_id].marker.rangeCircle != null) {
            markers.removeLayer(mapData.gyms[gym.gym_id].marker.rangeCircle)
        }
        markers.removeLayer(mapData.gyms[gym.gym_id].marker)
        delete mapData.gyms[gym.gym_id]
        if (onGoingRaidGyms.hasOwnProperty(gym.gym_id)) {
            delete onGoingRaidGyms[gym.gym_id]
        }
    }
}

function processScanned(i, item) {
    if (!Store.get('showScanned')) {
        return false
    }

    var scanId = item['latitude'] + '|' + item['longitude']

    if (!(scanId in mapData.scanned)) { // add marker to map and item to dict
        if (item.marker) {
            markersNoCluster.removeLayer(item.marker)
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
            markersNoCluster.removeLayer(item.marker)
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
        processWeatherAlerts(result.weatherAlerts)
        updateMainCellWeather()
        showInBoundsMarkers(mapData.lurePokemons, 'pokemon')
        showInBoundsMarkers(mapData.gyms, 'gym')
        showInBoundsMarkers(mapData.pokestops, 'pokestop')
        showInBoundsMarkers(mapData.scanned, 'scanned')
        showInBoundsMarkers(mapData.spawnpoints, 'inbound')
        showInBoundsMarkers(mapData.weather, 'weather')
        showInBoundsMarkers(mapData.weatherAlerts, 's2cell')
        clearStaleMarkers()

        // We're done processing. Redraw.
        markers.refreshClusters()

        updateScanned()
        updateSpawnPoints()

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
            timestring = 'expired'
        } else if (hours > 0) {
            timestring = lpad(hours, 2, 0) + 'h' + lpad(minutes, 2, 0) + 'm' + lpad(seconds, 2, 0) + 's'
        } else {
            timestring = lpad(minutes, 2, 0) + 'm' + lpad(seconds, 2, 0) + 's'
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
            if (userLocationMarker) {
                userLocationMarker.setLatLng(latlng)
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
    map.panTo(loc)
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

            if (Store.get('followMyLocation')) {
                if ((typeof userLocationMarker !== 'undefined') && (getPointDistance(userLocationMarker.getLatLng(), center) >= 5)) {
                    map.panTo(center)
                    userLocationMarker.setLatLng(center)
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
        var pokemonIcon
        if (generateImages) {
            result.pokemon_id = result.guard_pokemon_id
            pokemonIcon = `<img class='guard-pokemon-icon' src='${getPokemonRawIconUrl(result)}'>`
        } else {
            pokemonIcon = `<i class="pokemon-large-sprite n${result.guard_pokemon_id}"></i>`
        }
        pokemonHtml = `
            <div class='section-divider'></div>
              <center>
                Gym Leader:<br>
                ${pokemonIcon}<br>
                <b>${result.guard_pokemon_name}</b>
              </center>`

        var topPart = gymLabel(result)
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

function getSidebarGymMember(pokemon) { // eslint-disable-line no-unused-vars
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
    if (showConfig.rarity) {
        updatePokemonRarities()
    }

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
        lastgyms = false
        updateMap()
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
            setTimeout(function () { updateStartLocationMarker(selectSearchIconMarker) }, 300)
        })

        $selectSearchIconMarker.val(Store.get('searchMarkerStyle')).trigger('change')

        $selectLocationIconMarker.select2({
            placeholder: 'Select Location Marker',
            data: searchMarkerStyleList,
            minimumResultsForSearch: Infinity
        })

        $selectLocationIconMarker.on('change', function (e) {
            var locStyle = this.value
            Store.set('locationMarkerStyle', locStyle)
            setTimeout(function () { updateUserLocationMarker(locStyle) }, 300)
        })

        $selectLocationIconMarker.val(Store.get('locationMarkerStyle')).trigger('change')

        loadDefaultImages()
    })
})
$(function () {
    moment.locale(language)

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

    $selectIncludePokemon = $('#include-pokemon')
    $selectIncludeQuestPokemon = $('#include-quest-pokemon')
    $selectIncludeQuestItems = $('#include-quest-items')
    $selectExcludeRarity = $('#exclude-rarity')
    $selectNotifyPokemon = $('#notify-pokemon')
    $selectRarityNotify = $('#notify-rarity')
    $textPerfectionNotify = $('#notify-perfection')
    $textLevelNotify = $('#notify-level')
    var numberOfPokemon = 493

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

    $.each(questItemIds, function (key, id) {
        $('.quest-item-list').append(`<div class='quest-item-sprite' data-value='${id}'><img class='quest-item-select-icon' src='static/images/quest/reward_${id}_1.png'></div>`)
    })
    $('.quest-item-list').append(`<div class='quest-item-sprite' data-value='6'><img class='quest-item-select-icon' src='static/images/quest/reward_stardust.png'></div>`)

    // Load pokemon names and populate lists
    $.getJSON('static/dist/data/pokemon.min.json').done(function (data) {
        var pokemonIcon
        var typestring = []
        var pokemonIds = []

        function populateLists(id, pokemonData) {
            if (generateImages) {
                pokemonIcon = `<img class='pokemon-select-icon' src='${getPokemonRawIconUrl({'pokemon_id': id})}'>`
            } else {
                pokemonIcon = `<i class="pokemon-sprite n${id}"></i>`
            }
            pokemonData['name'] = i8ln(pokemonData['name'])
            $.each(pokemonData['types'], function (id, pokemonType) {
                typestring[id] = i8ln(pokemonType['type'])
                if (id < 1) {
                    typestring[id + 1] = i8ln(pokemonType['type'])
                }
            })
            pokemonData['gen'] = getPokemonGen(id)
            $('.list').append('<div class=pokemon-icon-sprite data-gen=gen' + pokemonData['gen'] + ' data-pkm=' + i8ln(pokemonData['name']) + ' data-value=' + id + ' data-type1=' + typestring[0] + ' data-type2=' + typestring[1] + '><div id=pkid_list>#' + id + '</div>' + pokemonIcon + '<div id=pkname_list>' + i8ln(pokemonData['name']) + '</div></div>')
            idToPokemon[id] = pokemonData
            pokeSearchList.push({
                value: id,
                pkm: i8ln(pokemonData['name']),
                gen: 'gen' + pokemonData['gen'],
                type1: typestring[0],
                type2: typestring[1],
                allpokemon: 'allpokemon'
            })
        }

        var id
        for (id = 1; id <= numberOfPokemon; id++) {
            populateLists(id, data[id])
            pokemonIds.push(id)
        }
        // Meltan and Melmetal
        populateLists(808, data[808])
        populateLists(809, data[809])
        pokemonIds.push(808)
        pokemonIds.push(809)

        $selectRarityNotify.select2({
            placeholder: i8ln('Select Rarity'),
            data: [i8ln('Common'), i8ln('Uncommon'), i8ln('Rare'), i8ln('Very Rare'), i8ln('Ultra Rare'), i8ln('New Spawn')],
            templateResult: formatRarityState
        })

        $('.list').on('click', '.pokemon-icon-sprite', function () {
            var img = $(this)
            var inputElement = $(this).parent().parent().find('input[id$=pokemon]')
            var value = inputElement.val().length > 0 ? inputElement.val().split(',') : []
            var id = img.data('value').toString()
            if (img.hasClass('active')) {
                inputElement.val(value.filter(function (elem) {
                    return elem !== id
                }).join(',')).trigger('change')
                img.removeClass('active')
            } else {
                inputElement.val((value.concat(id).join(','))).trigger('change')
                img.addClass('active')
            }

            var hidePresetElements = $(this).parent().parent().parent().parent().parent().parent().find('.hidepreset')
            hidePresetElements.removeClass('active')
        })

        $('.quest-item-list').on('click', '.quest-item-sprite', function () {
            var img = $(this)
            var inputElement = $(this).parent().parent().find('input[id$=items]')
            var value = inputElement.val().length > 0 ? inputElement.val().split(',') : []
            var id = img.data('value').toString()
            if (img.hasClass('active')) {
                inputElement.val(value.filter(function (elem) {
                    return elem !== id
                }).join(',')).trigger('change')
                img.removeClass('active')
            } else {
                inputElement.val((value.concat(id).join(','))).trigger('change')
                img.addClass('active')
            }
        })

        $('.exclude_templates').on('click', '.hidepreset', function () {
            const hidepresets = Store.get('hidepresets')
            var img = $(this)
            var id = img.data('key').toString()
            $('.hidepreset').removeClass('active')
            img.addClass('active')
            generatePokemonInclude(i8ln(hidepresets[id]['Searchstring']), hidepresets[id]['Invert'])
        })

        $('.search').on('input', function () {
            var searchtext = $(this).val().toString()
            var parent = $(this)
            var foundpokemon = []
            var pokeselectlist = $(this).next('.list').find('.pokemon-icon-sprite')
            if (searchtext === '') {
                parent.parent().find('.pokemon-select-filtered, .pokemon-deselect-filtered').hide()
                parent.parent().find('.pokemon-select-all, .pokemon-deselect-all').show()
                pokeselectlist.show()
            } else {
                pokeselectlist.hide()
                parent.parent().find('.pokemon-select-filtered, .pokemon-deselect-filtered').show()
                parent.parent().find('.pokemon-select-all, .pokemon-deselect-all').hide()
                foundpokemon = filterpokemon(pokeSearchList, searchtext.replace(/\s/g, ''))
            }

            $.each(foundpokemon, function (i, item) {
                parent.next('.list').find('.pokemon-icon-sprite[data-value="' + foundpokemon[i] + '"]').show()
            })
            foundpokemon = []
        })

        loadDefaultImages()

        $('.pokemon-select-filtered').on('click', function (e) {
            e.preventDefault()
            var parent = $(this).parent().parent()
            var inputElement = $(this).parent().parent().find('input[id$=pokemon]')
            var selectedPokemons = inputElement.val().length > 0 ? inputElement.val().split(',') : []
            var visibleNotActiveIconElements = parent.find('.pokemon-icon-sprite:visible:not(.active)')
            visibleNotActiveIconElements.addClass('active')
            $.each(visibleNotActiveIconElements, function (i, item) {
                selectedPokemons.push($(this).data('value'))
            })
            parent.find('input[id$=pokemon]').val(selectedPokemons.join(',')).trigger('change')

            var hidePresetElements = parent.parent().parent().parent().find('.hidepreset')
            hidePresetElements.removeClass('active')
        })

        $('.pokemon-deselect-filtered').on('click', function (e) {
            e.preventDefault()
            var parent = $(this).parent().parent()
            var inputElement = $(this).parent().parent().find('input[id$=pokemon]')
            var selectedPokemons = inputElement.val().length > 0 ? inputElement.val().split(',') : []
            var visibleActiveIconElements = parent.find('.pokemon-icon-sprite:visible.active')
            visibleActiveIconElements.removeClass('active')
            $.each(visibleActiveIconElements, function (i, item) {
                var id = $(this).data('value').toString()
                selectedPokemons = selectedPokemons.filter(function (item) {
                    return item !== id
                })
            })
            parent.find('input[id$=pokemon]').val(selectedPokemons.join(',')).trigger('change')

            var hidePresetElements = parent.parent().parent().parent().find('.hidepreset')
            hidePresetElements.removeClass('active')
        })

        $('.pokemon-select-unfiltered').on('click', function (e) {
            e.preventDefault()
            var parent = $(this).parent().parent()
            var selectedPokemons = []
            var visibleActiveIconElements = parent.find('.pokemon-icon-sprite:visible.active')
            var hiddenIconElements = parent.find('.pokemon-icon-sprite:hidden')
            hiddenIconElements.addClass('active')
            $.each(visibleActiveIconElements, function (i, item) {
                selectedPokemons.push($(this).data('value'))
            })
            $.each(hiddenIconElements, function (i, item) {
                selectedPokemons.push($(this).data('value'))
            })
            parent.find('input[id$=pokemon]').val(selectedPokemons.join(',')).trigger('change')

            var hidePresetElements = parent.parent().parent().parent().find('.hidepreset')
            hidePresetElements.removeClass('active')
        })

        $('.pokemon-deselect-unfiltered').on('click', function (e) {
            e.preventDefault()
            var parent = $(this).parent().parent()
            var selectedPokemons = []
            var visibleActiveIconElements = parent.find('.pokemon-icon-sprite:visible.active')
            var hiddenIconElements = parent.find('.pokemon-icon-sprite:hidden')
            hiddenIconElements.removeClass('active')
            $.each(visibleActiveIconElements, function (i, item) {
                selectedPokemons.push($(this).data('value'))
            })
            parent.find('input[id$=pokemon]').val(selectedPokemons.join(',')).trigger('change')

            var hidePresetElements = parent.parent().parent().parent().find('.hidepreset')
            hidePresetElements.removeClass('active')
        })

        $('.pokemon-select-all').on('click', function (e) {
            e.preventDefault()
            var parent = $(this).parent().parent()
            parent.find('.list .pokemon-icon-sprite:visible').addClass('active')
            parent.find('input[id$=pokemon]').val(pokemonIds.join(',')).trigger('change')
            $('.hidepreset').removeClass('active')

            var hidePresetElements = parent.parent().parent().parent().find('.hidepreset')
            hidePresetElements.removeClass('active')
        })

        $('.pokemon-deselect-all').on('click', function (e) {
            e.preventDefault()
            var parent = $(this).parent().parent()
            parent.find('.list .pokemon-icon-sprite:visible').removeClass('active')
            parent.find('input[id$=pokemon]').val('').trigger('change')

            var hidePresetElements = parent.parent().parent().parent().find('.hidepreset')
            hidePresetElements.removeClass('active')
        })

        $('.quest-item-select-all').on('click', function (e) {
            e.preventDefault()
            var parent = $(this).parent().parent()
            parent.find('.quest-item-list .quest-item-sprite').addClass('active')
            parent.find('input[id$=items]').val(questItemIds.concat(new Array('6')).join(',')).trigger('change')
        })

        $('.quest-item-deselect-all').on('click', function (e) {
            e.preventDefault()
            var parent = $(this).parent().parent()
            parent.find('.quest-item-list .quest-item-sprite').removeClass('active')
            parent.find('input[id$=items]').val('').trigger('change')
        })

        $selectIncludePokemon.on('change', function (e) {
            buffer = excludedPokemon
            let includedPokemon = []
            if ($selectIncludePokemon.val().length > 0) {
                includedPokemon = $selectIncludePokemon.val().split(',').map(Number).sort(function (a, b) {
                    return a - b
                })
            }
            excludedPokemon = pokemonIds.filter(function (e) {
                return this.indexOf(e) < 0
            }, includedPokemon)
            buffer = buffer.filter(function (e) {
                return this.indexOf(e) < 0
            }, excludedPokemon)
            reincludedPokemon = reincludedPokemon.concat(buffer).map(String)
            clearStaleMarkers()
            if (includedPokemon.length === pokemonIds.length) {
                $('a[href$="#tabs_marker-1"]').text('Pokémon (All)')
            } else {
                $('a[href$="#tabs_marker-1"]').text(`Pokémon (${includedPokemon.length})`)
            }
            Store.set('remember_select_include_pokemon', includedPokemon)
        })

        $selectIncludeQuestPokemon.on('change', function (e) {
            if ($selectIncludeQuestPokemon.val().length > 0) {
                includedQuestPokemon = $selectIncludeQuestPokemon.val().split(',').map(Number).sort(function (a, b) {
                    return a - b
                })
            } else {
                includedQuestPokemon = []
            }
            if (includedQuestPokemon.length === pokemonIds.length) {
                $('a[href$="#tabs_quest-1"]').text('Quest Pokémon (All)')
            } else {
                $('a[href$="#tabs_quest-1"]').text(`Quest Pokémon (${includedQuestPokemon.length})`)
            }
            updatePokestops()
            Store.set('remember_select_include_quest_pokemon', includedQuestPokemon)
        })

        $selectIncludeQuestItems.on('change', function (e) {
            if ($selectIncludeQuestItems.val().length > 0) {
                includedQuestItems = $selectIncludeQuestItems.val().split(',').map(Number).sort(function (a, b) {
                    return a - b
                })
            } else {
                includedQuestItems = []
            }
            if (includedQuestItems.length === questItemIds.length + 1) {
                $('a[href$="#tabs_quest-2"]').text('Quest Items (All)')
            } else {
                $('a[href$="#tabs_quest-2"]').text(`Quest Items (${includedQuestItems.length})`)
            }
            updatePokestops()
            Store.set('remember_select_include_quest_items', includedQuestItems)
        })

        $selectExcludeRarity.on('change', function (e) {
            excludedRarity = $selectExcludeRarity.val()
            reincludedPokemon = reincludedPokemon.concat(excludedPokemonByRarity)
            excludedPokemonByRarity = []
            clearStaleMarkers()
            Store.set('excludedRarity', excludedRarity)
        })

        $selectNotifyPokemon.on('change', function (e) {
            buffer = notifiedPokemon
            if ($selectNotifyPokemon.val().length > 0) {
                notifiedPokemon = $selectNotifyPokemon.val().split(',').map(Number).sort(function (a, b) {
                    return a - b
                })
            } else {
                notifiedPokemon = []
            }
            buffer = buffer.filter(function (e) {
                return this.indexOf(e) < 0
            }, notifiedPokemon)
            reincludedPokemon = reincludedPokemon.concat(buffer).map(String)
            clearStaleMarkers()
            if (notifiedPokemon.length === pokemonIds.length) {
                $('a[href$="#tabs_notify-10"]').text('Notify of Pokémon (All)')
            } else {
                $('a[href$="#tabs_notify-10"]').text(`Notify of Pokémon (${notifiedPokemon.length})`)
            }
            Store.set('remember_select_notify_pokemon', notifiedPokemon)
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

        // Recall saved lists.
        $selectIncludePokemon.val(Store.get('remember_select_include_pokemon')).trigger('change')
        $selectIncludeQuestPokemon.val(Store.get('remember_select_include_quest_pokemon')).trigger('change')
        $selectIncludeQuestItems.val(Store.get('remember_select_include_quest_items')).trigger('change')
        $selectNotifyPokemon.val(Store.get('remember_select_notify_pokemon')).trigger('change')
        $selectRarityNotify.val(Store.get('remember_select_rarity_notify')).trigger('change')
        $textPerfectionNotify.val(Store.get('remember_text_perfection_notify')).trigger('change')
        $textLevelNotify.val(Store.get('remember_text_level_notify')).trigger('change')
        $selectExcludeRarity.val(Store.get('excludedRarity')).trigger('change')

        if (isTouchDevice() && isMobileDevice()) {
            $('.select2-search input').prop('readonly', true)
        }
    })

    // Load invasion data.
    $.getJSON('static/dist/data/invasions.min.json').done(function (data) {
        for (var id in data) {
            idToInvasion[id] = data[id]
        }
    })

    // run interval timers to regularly update map, rarity and timediffs
    window.setInterval(updateLabelDiffTime, 1000)
    window.setInterval(updateMap, 2000)
    window.setInterval(updateStaleMarkers, 2500)
    if (showConfig.rarity) {
        window.setInterval(updatePokemonRarities, 300000)
    }
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
                                markersNoCluster.removeLayer(data[dType][key].marker.rangeCircle)
                                delete data[dType][key].marker.rangeCircle
                            }
                            markers.removeLayer(data[dType][key].marker)
                            markersNoCluster.removeLayer(data[dType][key].marker)
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
                            markersNoCluster.removeLayer(data[dType][key].marker.rangeCircle)
                            delete data[dType][key].marker.rangeCircle
                        }
                        if (storageKey !== 'showRanges') {
                            markers.removeLayer(data[dType][key].marker)
                            markersNoCluster.removeLayer(data[dType][key].marker)
                            if (dType === 'pokemons') {
                                oldPokeMarkers.push(data[dType][key].marker)
                            }
                        }
                    })
                    // If the type was "pokemons".
                    if (oldPokeMarkers.length > 0) {
                        markers.removeLayer(oldPokeMarkers)
                        markersNoCluster.removeLayer(oldPokeMarkers)
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

    function generatePokemonInclude(value, invert) {
        var pokemonIds = []
        for (var id = 1; id <= 493; id++) {
            pokemonIds.push(id.toString())
        }
        // Meltan and Melmetal.
        pokemonIds.push('808')
        pokemonIds.push('809')

        value = value.toString()
        if (invert === false) {
            $selectIncludePokemon.val(filterpokemon(pokeSearchList, value.replace(/\s/g, ''))).trigger('change')
        } else {
            $selectIncludePokemon.val(diffPokemon(pokemonIds, filterpokemon(pokeSearchList, value.replace(/\s/g, '')).map(String))).trigger('change')
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
        $('#gym-in-battle-switch').prop('checked', Store.get('showGymInBattle'))
        $('#min-level-gyms-filter-switch').val(Store.get('minGymLevel'))
        $('#max-level-gyms-filter-switch').val(Store.get('maxGymLevel'))

        $('#team-gyms-only-switch').trigger('change')
        $('#min-level-gyms-filter-switch').trigger('change')
        $('#max-level-gyms-filter-switch').trigger('change')
    }

    // Setup UI element interactions

    $('#gyms-switch').change(function () {
        resetGymFilter()
        var wrapperGyms = $('#gyms-filter-wrapper')
        var switchRaids = $('#raids-switch')
        var wrapperSidebar = $('#gym-sidebar-wrapper')
        if (this.checked) {
            lastgyms = false
            if (Store.get('showGymFilter')) {
                wrapperGyms.show()
            }
            wrapperSidebar.show()
        } else {
            lastgyms = false
            wrapperGyms.hide()
            if (!switchRaids.prop('checked')) {
                wrapperSidebar.hide()
            }
        }
        buildSwitchChangeListener(mapData, ['gyms'], 'showGyms').bind(this)()
    })
    $('#raids-switch').change(function () {
        var wrapperRaids = $('#raids-filter-wrapper')
        var switchGyms = $('#gyms-switch')
        var wrapperSidebar = $('#gym-sidebar-wrapper')
        if (this.checked) {
            lastgyms = false
            if (Store.get('showRaidFilter')) {
                wrapperRaids.show()
            }
            wrapperSidebar.show()
        } else {
            lastgyms = false
            wrapperRaids.hide()
            if (!switchGyms.prop('checked')) {
                wrapperSidebar.hide()
            }
        }
        buildSwitchChangeListener(mapData, ['gyms'], 'showRaids').bind(this)()
    })
    $('#pokemon-switch').change(function () {
        var wrapper = $('#pokemons-filter-wrapper')
        this.checked ? wrapper.show() : wrapper.hide()
        buildSwitchChangeListener(mapData, ['pokemons'], 'showPokemon').bind(this)()
        markers.refreshClusters()
    })
    $('#pokemon-stats-switch').change(function () {
        Store.set('showPokemonStats', this.checked)
        const $wrapper = $('#notify-perfection-wrapper')
        if (this.checked) {
            $wrapper.show()
        } else {
            $wrapper.hide()
        }
        updatePokemonLabels(mapData.pokemons)
        // Only redraw Pokémon which are notified of perfection.
        var notifyPerfectionPkmn = getNotifyPerfectionPokemons(mapData.pokemons)
        redrawPokemon(notifyPerfectionPkmn)
    })
    $('#scanned-switch').change(function () {
        buildSwitchChangeListener(mapData, ['scanned'], 'showScanned').bind(this)()
    })
    $('#spawnpoints-switch').change(function () {
        buildSwitchChangeListener(mapData, ['spawnpoints'], 'showSpawnpoints').bind(this)()
    })
    $('#ranges-switch').change(buildSwitchChangeListener(mapData, ['gyms', 'pokemons', 'pokestops'], 'showRanges'))

    $('#s2-cells-switch').change(function () {
        Store.set('showS2Cells', this.checked)
        var wrapper = $('#s2-cells-wrapper')
        if (this.checked) {
            wrapper.show()
            updateS2Overlay()
        } else {
            wrapper.hide()
            s2Level10LayerGroup.clearLayers()
            s2Level13LayerGroup.clearLayers()
            s2Level14LayerGroup.clearLayers()
            s2Level17LayerGroup.clearLayers()
        }
    })

    $('#s2-level10-switch').change(function () {
        Store.set('showS2CellsLevel10', this.checked)
        if (this.checked) {
            updateS2Overlay()
        } else {
            s2Level10LayerGroup.clearLayers()
        }
    })

    $('#s2-level13-switch').change(function () {
        Store.set('showS2CellsLevel13', this.checked)
        if (this.checked) {
            updateS2Overlay()
        } else {
            s2Level13LayerGroup.clearLayers()
        }
    })

    $('#s2-level14-switch').change(function () {
        Store.set('showS2CellsLevel14', this.checked)
        if (this.checked) {
            updateS2Overlay()
        } else {
            s2Level14LayerGroup.clearLayers()
        }
    })

    $('#s2-level17-switch').change(function () {
        Store.set('showS2CellsLevel17', this.checked)
        if (this.checked) {
            updateS2Overlay()
        } else {
            s2Level17LayerGroup.clearLayers()
        }
    })

    $('#weather-cells-switch').change(function () {
        buildSwitchChangeListener(mapData, ['weather'], 'showWeatherCells').bind(this)()
    })

    $('#weather-alerts-switch').change(function () {
        buildSwitchChangeListener(mapData, ['weatherAlerts'], 'showWeatherAlerts').bind(this)()
    })

    $('#pokestops-switch').change(function () {
        var wrapper = $('#pokestops-filter-wrapper')
        this.checked ? wrapper.show() : wrapper.hide()

        Store.set('showPokestops', this.checked)
        updatePokestops()
    })

    $('#pokestops-no-event-switch').change(function () {
        Store.set('showPokestopsNoEvent', this.checked)
        updatePokestops()
    })

    $('#quests-switch').change(function () {
        var wrapper = $('#quests-filter-wrapper')
        this.checked ? wrapper.show() : wrapper.hide()

        Store.set('showQuests', this.checked)
        updatePokestops()
    })

    $('#invasions-switch').change(function () {
        Store.set('showInvasions', this.checked)
        updatePokestops()
    })

    $('#normal-lures-switch').change(function () {
        Store.set('showNormalLures', this.checked)
        updatePokestops()
    })

    $('#glacial-lures-switch').change(function () {
        Store.set('showGlacialLures', this.checked)
        updatePokestops()
    })

    $('#magnetic-lures-switch').change(function () {
        Store.set('showMagneticLures', this.checked)
        updatePokestops()
    })

    $('#mossy-lures-switch').change(function () {
        Store.set('showMossyLures', this.checked)
        updatePokestops()
    })

    $('#sound-switch').change(function () {
        Store.set('playSound', this.checked)
        var criesWrapper = $('#pokemoncries')
        if (this.checked) {
            criesWrapper.show()
        } else {
            criesWrapper.hide()
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

    $('#lock-start-marker-switch').change(function () {
        Store.set('lockStartLocationMarker', this.checked)
        if (startLocationMarker) {
            this.checked ? startLocationMarker.dragging.disable() : startLocationMarker.dragging.enable()
        }
    })

    $('#start-at-user-location-switch').change(function () {
        if (Store.get('startAtLastLocation') && this.checked) {
            $('#start-at-last-location-switch').prop('checked', false)
            Store.set('startAtLastLocation', false)
        }
        Store.set('startAtUserLocation', this.checked)
    })

    $('#start-at-last-location-switch').change(function () {
        if (this.checked) {
            const position = map.getCenter()
            Store.set('startAtLastLocationPosition', {
                lat: position.lat,
                lng: position.lng
            })

            if (Store.get('startAtUserLocation')) {
                $('#start-at-user-location-switch').prop('checked', false)
                Store.set('startAtUserLocation', false)
            }
        }
        Store.set('startAtLastLocation', this.checked)
    })

    $('#follow-my-location-switch').change(function () {
        if (!navigator.geolocation) {
            this.checked = false
        } else {
            Store.set('followMyLocation', this.checked)
        }
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
