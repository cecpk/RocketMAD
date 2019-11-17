/* global showAllZoomLevel getS2CellBounds processWeather processWeatherAlerts updateMainCellWeather getPercentageCssColor getPokemonGen getPokemonRawIconUrl timestampToTime timestampToDateTime */

//
// Global map.js variables
//

var $selectIncludeInvasions
var $selectIncludeQuestItems
var $selectNotifyPokemon
var $selectNotifyRaidPokemon
var $selectNotifyEggs
var $selectNotifyInvasions
var $selectStyle
var $selectSearchIconMarker
var $selectLocationIconMarker
var $switchGymSidebar
var $gymNameFilter = ''
var $pokestopNameFilter = ''

var idToInvasion = {}

var searchMarkerStyles

var settings = {
    showPokemon: null,
    excludedPokemon: null,
    showPokemonValues: null,
    filterValues: null,
    minIvs: null,
    maxIvs: null,
    showZeroIvsPokemon: null,
    minLevel: null,
    maxLevel: null,
    scaleByRarity: null,
    useGymSidebar: null,
    showGyms: null,
    includedGymTeams: null,
    minGymLevel: null,
    maxGymLevel: null,
    showOpenSpotGymsOnly: null,
    showExGymsOnly: null,
    showInBattleGymsOnly: null,
    gymLastScannedHours: null,
    showRaids: null,
    excludedRaidPokemon: null,
    showActiveRaidsOnly: null,
    showExEligibleRaidsOnly: null,
    includedRaidLevels: null,
    showPokestops: null,
    showQuests: null,
    excludedQuestPokemon: null,
    excludedQuestItems: null,
    showPokestopsNoEvent: true,
    showInvasions: true,
    showExParks: false,
    showNestParks: false
}

var timestamp
var includedInvasions = []
var includedQuestItems = []
var excludedPokemonByRarity = []

var notifyPokemon = []
var notifyRaidPokemon = []
var notifyEggs = []
var notifyInvasions = []

var notifiedPokemonData = {}
var notifiedGymData = {}
var notifiedPokestopData = {}

var reincludedPokemon = []
var reids = []

var luredPokestopIds = new Set()
var invadedPokestopIds = new Set()
var raidids = new Set()
var upcomingRaidids = new Set() // Contains only raids with known raid boss.

// var map
var rawDataIsLoading = false
var startLocationMarker
var userLocationMarker
const rangeMarkers = ['pokemon', 'pokestop', 'gym']
var storeZoom = true

var oSwLat
var oSwLng
var oNeLat
var oNeLng

var lastpokemon
var lastgyms
var lastpokestops
var lastspawns
var lastslocs

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

var exParksLayerGroup = new L.LayerGroup()
var nestParksLayerGroup = new L.LayerGroup()

// Z-index values for various markers.
const userLocationMarkerZIndex = 0
const pokestopZIndex = 0
const gymZIndex = 1000
const pokemonZIndex = 2000
const pokemonUncommonZIndex = 3000
const pokemonRareZIndex = 4000
const pokestopQuestZIndex = 5000
const gymEggZIndex = 6000
const pokestopLureZIndex = 7000
const pokestopInvasionZIndex = 8000
const gymRaidBossZIndex = 9000
const pokemonVeryRareZIndex = 10000
const pokemonUltraRareZIndex = 11000
const pokemonNewSpawnZIndex = 120000
const pokestopNotifiedZIndex = 13000
const gymNotifiedZIndex = 14000
const pokemonNotifiedZIndex = 15000
const startLocationMarkerZIndex = 20000 // Highest value so it doesn't get stuck behind other markers.

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

// FontAwesome gender classes.
const genderClasses = ['fa-mars', 'fa-venus', 'fa-neuter']

const ActiveFortModifierEnum = Object.freeze({'normal':501, 'glacial':502, 'mossy':503, 'magnetic':504})

const lureTypes = {
    501: 'Normal',
    502: 'Glacial',
    503: 'Mossy',
    504: 'Magnetic'
}

const raidEggImages = {
    1: 'egg_normal.png',
    2: 'egg_normal.png',
    3: 'egg_rare.png',
    4: 'egg_rare.png',
    5: 'egg_legendary.png'
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

//
// Functions
//

function isShowAllZoom() {
    return showAllZoomLevel > 0 && map.getZoom() >= showAllZoomLevel
}

function getExcludedPokemon() {
    return isShowAllZoom() ? [] : settings.excludedPokemon
}

function excludePokemon(id, encounterId) { // eslint-disable-line no-unused-vars
    $('label[for="include-pokemon"] .pokemon-filter-list .filter-button[data-id="' + id + '"]').click()
}

function notifyAboutPokemon(id, encounterId) { // eslint-disable-line no-unused-vars
    $('label[for="notify-pokemon"] .pokemon-filter-list .filter-button[data-id="' + id + '"]').click()
}

function excludeEgg(level) { // eslint-disable-line no-unused-vars
    var temp = settings.includedEggLevels
    const index = temp.indexOf(level)
    if (index > -1) {
        temp.splice(index, 1)
        $('#egg-levels-select').val(temp).trigger('change')
    }
}

function notifyAboutEgg(level) { // eslint-disable-line no-unused-vars
    var temp = notifyEggs
    if (!temp.includes(level)) {
        temp.push(level)
        $('#notify-eggs').val(temp).trigger('change')
    }
}

function unnotifyAboutEgg(level) { // eslint-disable-line no-unused-vars
    var temp = notifyEggs
    const index = temp.indexOf(level)
    if (index > -1) {
        temp.splice(index, 1)
        $('#notify-eggs').val(temp).trigger('change')
    }
}

function excludeRaidPokemon(id) { // eslint-disable-line no-unused-vars
    $('label[for="include-raid-pokemon"] .pokemon-filter-list .filter-button[data-id="' + id + '"]').click()
}

function notifyAboutRaidPokemon(id) { // eslint-disable-line no-unused-vars
    $('label[for="notify-raid-pokemon"] .pokemon-filter-list .filter-button[data-id="' + id + '"]').click()
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
    const ip = Store.get('remember_select_include_pokemon')
    const irp = Store.get('remember_select_include_raid_pokemon')
    const ii = Store.get('remember_select_include_invasions')
    //const iqp = Store.get('remember_select_include_quest_pokemon')
    const iqi = Store.get('remember_select_include_quest_items')
    const np = Store.get('remember_select_notify_pokemon')
    const nrp = Store.get('remember_select_notify_raid_pokemon')
    const ni = Store.get('remember_select_notify_invasions')

    $('label[for="include-pokemon"] .pokemon-list .filter-button').removeClass('active')
    $('label[for="include-pokemon"] .pokemon-list .filter-button').each(function () {
        if (ip.includes($(this).data('value'))) {
            $(this).addClass('active')
        }
    })

    $('label[for="include-raid-pokemon"] .pokemon-list .filter-button').removeClass('active')
    $('label[for="include-raid-pokemon"] .pokemon-list .filter-button').each(function () {
        if (irp.includes($(this).data('value'))) {
            $(this).addClass('active')
        }
    })

    $('label[for="include-invasions"] .invasion-list .invasion-sprite').removeClass('active')
    $('label[for="include-invasions"] .invasion-list .invasion-sprite').each(function () {
        if (ii.includes($(this).data('value'))) {
            $(this).addClass('active')
        }
    })

    $('label[for="include-quest-pokemon"] .pokemon-list .filter-button').removeClass('active')
    $('label[for="include-quest-pokemon"] .pokemon-list .filter-button').each(function () {
        if (iqp.includes($(this).data('value'))) {
            $(this).addClass('active')
        }
    })

    $('label[for="include-quest-items"] .quest-item-list .quest-item-sprite').removeClass('active')
    $('label[for="include-quest-items"] .quest-item-list .quest-item-sprite').each(function () {
        if (iqi.includes($(this).data('value'))) {
            $(this).addClass('active')
        }
    })

    $('label[for="notify-pokemon"] .pokemon-list .filter-button').removeClass('active')
    $('label[for="notify-pokemon"] .pokemon-list .filter-button').each(function () {
        if (np.includes($(this).data('value'))) {
            $(this).addClass('active')
        }
    })

    $('label[for="notify-raid-pokemon"] .pokemon-list .filter-button').removeClass('active')
    $('label[for="notify-raid-pokemon"] .pokemon-list .filter-button').each(function () {
        if (nrp.includes($(this).data('value'))) {
            $(this).addClass('active')
        }
    })

    $('label[for="notify-invasions"] .invasion-list .invasion-sprite').removeClass('active')
    $('label[for="notify-invasions"] .invasion-list .invasion-sprite').each(function () {
        if (ni.includes($(this).data('value'))) {
            $(this).addClass('active')
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
        layers: [s2Level10LayerGroup, s2Level13LayerGroup, s2Level14LayerGroup, s2Level17LayerGroup, exParksLayerGroup, nestParksLayerGroup]
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

    initSettings()

    if (showConfig.rarity) {
        updatePokemonRarities(rarityFileName, function () {
            updateMap()
        })
    } else {
        updateMap()
    }

    initI8lnDictionary(function () {
        initPokemonData(function () {
            initPokemonFilters()
        })
    })

    initMoveData(function () {})

    if (showConfig.quests) {
        initItemData(function () {
            initItemFilters()
        })
    }

    L.control.zoom({
        position: 'bottomright'
    }).addTo(map)

    map.on('zoom', function () {
        if (storeZoom === true) {
            Store.set('zoomLevel', map.getZoom())
        } else {
            storeZoom = true
        }
    })

    map.on('zoomend', function () {
        if ($('#stats').hasClass('visible')) {
            countMarkers(map)
        }
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

    // Initialize materialize components.
    $('.dropdown-trigger').dropdown({
      constrainWidth: false,
      coverTrigger: false
    })
    $('.sidenav').sidenav({
        draggable: false
    })
    $('.collapsible').collapsible()
    $('.tabs').tabs()
    $('.modal').modal()
    $('#quest-filter-modal').modal({
        onOpenEnd: function () {
            $('#quest-filter-tabs').tabs('updateTabIndicator')
        }
    })
    $('.tooltipped').tooltip()

    initSidebar()

    if (Push._agents.chrome.isSupported()) {
        createServiceWorkerReceiver()
    }

    updateS2Overlay()
    getAllParks()

    map.on('moveend', function () {
        updateS2Overlay()
        updateParks()

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
    marker.setZIndexOffset(startLocationMarkerZIndex)
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

function initSettings() {
    settings.showPokemon = showConfig.pokemons && Store.get('showPokemon')
    settings.excludedPokemon = showConfig.pokemons ? Store.get('excludedPokemon') : []
    if (showConfig.pokemons) {
        settings.showPokemonValues = showConfig.pokemon_values && Store.get('showPokemonValues')
    }
    if (showConfig.pokemon_values) {
        settings.filterValues = Store.get('filterValues')
        settings.minIvs = Store.get('minIvs')
        settings.maxIvs = Store.get('maxIvs')
        settings.showZeroIvsPokemon = Store.get('showZeroIvsPokemon')
        settings.minLevel = Store.get('minLevel')
        settings.maxLevel = Store.get('maxLevel')
    }
    if (showConfig.rarity) {
        settings.includedRarities = Store.get('includedRarities')
        settings.scaleByRarity = showConfig.rarity && Store.get('scaleByRarity')
    }

    settings.showGyms = showConfig.gyms && Store.get('showGyms')
    settings.useGymSidebar = showConfig.gym_sidebar && Store.get('useGymSidebar')
    if (showConfig.gym_filters) {
        settings.includedGymTeams = Store.get('includedGymTeams')
        settings.minGymLevel = Store.get('minGymLevel')
        settings.maxGymLevel = Store.get('maxGymLevel')
        settings.showOpenSpotGymsOnly = Store.get('showOpenSpotGymsOnly')
        settings.showExGymsOnly = Store.get('showExGymsOnly')
        settings.showInBattleGymsOnly = Store.get('showInBattleGymsOnly')
        settings.gymLastScannedHours = Store.get('gymLastScannedHours')
    }
    settings.showRaids = showConfig.raids && Store.get('showRaids')
    if (showConfig.raid_filters) {
        settings.excludedRaidPokemon = Store.get('excludedRaidPokemon')
        settings.showActiveRaidsOnly = Store.get('showActiveRaidsOnly')
        settings.showExEligibleRaidsOnly = Store.get('showExEligibleRaidsOnly')
        settings.includedRaidLevels = Store.get('includedRaidLevels')
    }

    settings.showPokestops = showConfig.pokestops && Store.get('showPokestops')
    if (showConfig.pokestops) {
        settings.showQuests = showConfig.quests && Store.get('showQuests')
    }
    if (showConfig.quests) {
        settings.excludedQuestPokemon = Store.get('excludedQuestPokemon')
    }

    settings.showPokestopsNoEvent = showConfig.pokestops && Store.get('showPokestopsNoEvent')
    settings.showInvasions = showConfig.pokestops && Store.get('showInvasions')


    settings.showExParks = showConfig.ex_parks && Store.get('showExParks')
    settings.showNestParks = showConfig.nest_parks && Store.get('showNestParks')
}

function initSidebar() {
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

    // Setup UI element interactions.

    if (showConfig.pokemons) {
        $('#pokemon-switch').change(function () {
            settings.showPokemon = this.checked
            const filtersWrapper = $('#pokemon-filters-wrapper')
            const filterButton = $('a[data-target="pokemon-filter-modal"]')
            if (this.checked) {
                filterButton.show()
                filtersWrapper.show()
                lastpokemon = false
                updateMap()
            } else {
                filterButton.hide()
                filtersWrapper.hide()
                reprocessPokemons()
            }
            Store.set('showPokemon', this.checked)
        })
    }

    if (showConfig.pokemon_values) {
        $('#pokemon-values-switch').change(function () {
            settings.showPokemonValues = this.checked
            const filterValuesWrapper = $('#filter-pokemon-values-wrapper')
            if (this.checked) {
                filterValuesWrapper.show()
                reprocessPokemons()
            } else {
                filterValuesWrapper.hide()
                reprocessPokemons([], true)
                if (settings.filterValues) {
                    lastpokemon = false
                    updateMap()
                }
            }
            Store.set('showPokemonValues', this.checked)
        })

        $('#filter-values-switch').change(function () {
            settings.filterValues = this.checked
            const filtersWrapper = $('#pokemon-values-filters-wrapper')
            if (this.checked) {
                filtersWrapper.show()
                reprocessPokemons()
            } else {
                filtersWrapper.hide()
                lastpokemon = false
                updateMap()
            }
            Store.set('filterValues', this.checked)
        })

        var pokemonIvsSlider = document.getElementById('pokemon-ivs-slider')
        noUiSlider.create(pokemonIvsSlider, {
            start: [settings.minIvs, settings.maxIvs],
            connect: true,
            step: 1,
            range: {
                'min': 0,
                'max': 100
            },
            format: {
                to: function (value) {
                    return Math.round(value)
                },
                from: function (value) {
                    return Number(value)
                }
            }
        })
        pokemonIvsSlider.noUiSlider.on('change', function () {
            const oldMinIvs = settings.minIvs
            const oldMaxIvs = settings.maxIvs
            settings.minIvs = this.get()[0]
            settings.maxIvs = this.get()[1]

            $('#pokemon-ivs-slider-title').text(`IVs (${settings.minIvs}% - ${settings.maxIvs}%)`)
            const zeroIvsWrapper = $('#zero-ivs-pokemon-switch-wrapper')
            if (settings.minIvs > 0) {
                zeroIvsWrapper.show()
            } else {
                zeroIvsWrapper.hide()
            }

            if (settings.minIvs > oldMinIvs || settings.maxIvs < oldMaxIvs) {
                reprocessPokemons()
            } else {
                lastpokemon = false
                updateMap()
            }

            Store.set('minIvs', settings.minIvs)
            Store.set('maxIvs', settings.maxIvs)
        })

        $('#zero-ivs-pokemon-switch').change(function () {
            settings.showZeroIvsPokemon = this.checked
            if (this.checked) {
                lastpokemon = false
                updateMap()
            } else {
                reprocessPokemons()
            }
            Store.set('showZeroIvsPokemon', this.checked)
        })

        var pokemonLevelSlider = document.getElementById('pokemon-level-slider')
        noUiSlider.create(pokemonLevelSlider, {
            start: [settings.minLevel, settings.maxLevel],
            connect: true,
            step: 1,
            range: {
                'min': 1,
                'max': 35
            },
            format: {
                to: function (value) {
                    return Math.round(value)
                },
                from: function (value) {
                    return Number(value)
                }
            }
        })
        pokemonLevelSlider.noUiSlider.on('change', function () {
            const oldMinLevel = settings.minLevel
            const oldMaxLevel = settings.maxLevel
            settings.minLevel = this.get()[0]
            settings.maxLevel = this.get()[1]
            $('#pokemon-level-slider-title').text(`Levels (${settings.minLevel} - ${settings.maxLevel})`)

            if (settings.minLevel > oldMinLevel || settings.maxLevel < oldMaxLevel) {
                reprocessPokemons()
            } else {
                lastpokemon = false
                updateMap()
            }

            Store.set('minLevel', settings.minLevel)
            Store.set('maxLevel', settings.maxLevel)
        })
    }

    if (showConfig.rarity) {
        $('#rarity-select').on('change', function () {
            const oldIncludedRarities = settings.includedRarities
            settings.includedRarities = $(this).val().map(Number)
            reincludedPokemon = reincludedPokemon.concat(excludedPokemonByRarity)
            excludedPokemonByRarity = []
            if (settings.includedRarities.length < oldIncludedRarities.length) {
                reprocessPokemons()
            } else {
                // Don't set lastgyms to false since we add the reids to the request.
                updateMap()
            }
            Store.set('includedRarities', settings.includedRarities)
        })

        $('#scale-rarity-switch').change(function () {
            settings.scaleByRarity = this.checked
            reprocessPokemons()
            Store.set('scaleByRarity', this.checked)
        })
    }

    if (showConfig.gyms) {
        $('#gym-switch').change(function () {
            settings.showGyms = this.checked
            const filtersWrapper = $('#gym-filters-wrapper')
            const nameFilterSidebarWrapper = $('#gym-name-filter-sidebar-wrapper')
            if (this.checked) {
                if (showConfig.gym_filters) {
                    filtersWrapper.show()
                }
                if (!settings.showRaids) {
                    nameFilterSidebarWrapper.show()
                }
                lastgyms = false
                updateMap()
            } else {
                if (showConfig.gym_filters) {
                    filtersWrapper.hide()
                }
                if (!settings.showRaids) {
                    nameFilterSidebarWrapper.hide()
                }
                reprocessGyms()
            }
            Store.set('showGyms', this.checked)
        })
    }

    if (showConfig.gym_sidebar) {
        $('#gym-sidebar-switch').on('change', function () {
            settings.useGymSidebar = this.checked
            reprocessGyms()
            /*lastgyms = false
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
            updateMap()*/
            Store.set('useGymSidebar', this.checked)
        })
    }

    if (showConfig.gym_filters) {
        $('#gym-name-filter').on('keyup', function () {
            $gymNameFilter = this.value.match(/[.*+?^${}()|[\]\\]/g) ? this.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : this.value
            reprocessGyms()
            lastgyms = false
            updateMap()
        })

        $('#gym-team-select').on('change', function () {
            const oldIncludedGymTeams = settings.includedGymTeams
            settings.includedGymTeams = $(this).val().map(Number)
            if (settings.includedGymTeams.length < oldIncludedGymTeams.length) {
                reprocessGyms()
            } else {
                lastgyms = false
                updateMap()
            }
            Store.set('includedGymTeams', settings.includedGymTeams)
        })

        var gymLevelSlider = document.getElementById('gym-level-slider')
        noUiSlider.create(gymLevelSlider, {
            start: [settings.minGymLevel, settings.maxGymLevel],
            connect: true,
            step: 1,
            range: {
                'min': 0,
                'max': 6
            },
            format: {
                to: function (value) {
                    return Math.round(value)
                },
                from: function (value) {
                    return Number(value)
                }
            }
        })
        gymLevelSlider.noUiSlider.on('change', function () {
            const oldMinLevel = settings.minGymLevel
            const oldMaxLevel = settings.maxGymLevel
            settings.minGymLevel = this.get()[0]
            settings.maxGymLevel = this.get()[1]
            $('#gym-level-slider-title').text(`Gym levels (${settings.minGymLevel} - ${settings.maxGymLevel})`)

            if (settings.minGymLevel > oldMinLevel || settings.maxGymLevel < oldMaxLevel) {
                reprocessGyms()
            } else {
                lastgyms = false
                updateMap()
            }

            Store.set('minGymLevel', settings.minGymLevel)
            Store.set('maxGymLevel', settings.maxGymLevel)
        })

        $('#gym-open-spot-switch').on('change', function () {
            settings.showOpenSpotGymsOnly = this.checked
            if (this.checked) {
                reprocessGyms()
            } else {
                lastgyms = false
                updateMap()
            }
            Store.set('showOpenSpotGymsOnly', this.checked)
        })

        $('#gym-ex-eligible-switch').on('change', function () {
            settings.showExGymsOnly = this.checked
            if (this.checked) {
                reprocessGyms()
            } else {
                lastgyms = false
                updateMap()
            }
            Store.set('showExGymsOnly', this.checked)
        })

        $('#gym-in-battle-switch').on('change', function () {
            settings.showInBattleGymsOnly = this.checked
            if (this.checked) {
                reprocessGyms()
            } else {
                lastgyms = false
                updateMap()
            }
            Store.set('showInBattleGymsOnly', this.checked)
        })

        $('#gym-last-scanned-select').on('change', function () {
            const oldGymLastScannedHours = settings.gymLastScannedHours
            settings.gymLastScannedHours = this.value
            if ((settings.gymLastScannedHours < oldGymLastScannedHours && !settings.gymLastScannedHours === 0)
                    || oldGymLastScannedHours === 0) {
                reprocessGyms()
            } else {
                lastgyms = false
                updateMap()
            }
            Store.set('gymLastScannedHours', this.value)
        })
    }

    if (showConfig.raids) {
        $('#raid-switch').change(function () {
            settings.showRaids = this.checked
            const filtersWrapper = $('#raid-filters-wrapper')
            const nameFilterSidebarWrapper = $('#gym-name-filter-sidebar-wrapper')
            const filterButton = $('a[data-target="raid-pokemon-filter-modal"]')
            if (this.checked) {
                if (showConfig.raid_filters) {
                    filtersWrapper.show()
                    filterButton.show()
                }
                if (!settings.showGyms) {
                    nameFilterSidebarWrapper.show()
                }
                lastgyms = false
                updateMap()
            } else {
                if (showConfig.raid_filters) {
                    filtersWrapper.hide()
                    filterButton.hide()
                }
                if (!settings.showGyms) {
                    nameFilterSidebarWrapper.hide()
                }
                reprocessGyms()
            }
            Store.set('showRaids', this.checked)
        })
    }

    if (showConfig.raid_filters) {
        $('#raid-active-switch').on('change', function () {
            settings.showActiveRaidsOnly = this.checked
            if (this.checked) {
                reprocessGyms()
            } else {
                lastgyms = false
                updateMap()
            }
            Store.set('showActiveRaidsOnly', this.checked)
        })

        $('#raid-ex-eligible-switch').on('change', function () {
            settings.showExEligibleRaidsOnly = this.checked
            if (this.checked) {
                reprocessGyms()
            } else {
                lastgyms = false
                updateMap()
            }
            Store.set('showExEligibleRaidsOnly', this.checked)
        })

        $('#raid-level-select').on('change', function () {
            const oldIncludedRaidLevels = settings.includedRaidLevels
            settings.includedRaidLevels = $(this).val().map(Number)
            if (settings.includedRaidLevels.length < oldIncludedRaidLevels.length) {
                reprocessGyms()
            } else {
                lastgyms = false
                updateMap()
            }
            Store.set('includedRaidLevels', settings.includedRaidLevels)
        })
    }

    if (showConfig.pokestops) {
        $('#pokestop-switch').change(function () {
            settings.showPokestops = this.checked
            const filtersWrapper = $('#pokestop-filters-wrapper')
            if (this.checked) {
                filtersWrapper.show()
                lastpokestops = false
                updateMap()
            } else {
                filtersWrapper.hide()
                reprocessPokestops()
            }
            Store.set('showPokestops', this.checked)
        })
    }

    if (showConfig.quests) {
        $('#quest-switch').change(function () {
            settings.showQuests = this.checked
            var filterButton = $($('a[data-target="quest-filter-modal"]').toggle(settings.showPokemon))
            if (this.checked) {
                filterButton.show()
                lastpokestops = false
                updateMap()
            } else {
                filterButton.hide()
                reprocessPokestops()
            }
            Store.set('showQuests', this.checked)
        })
    }




    $('#scanned-switch').change(function () {
        buildSwitchChangeListener(mapData, ['scanned'], 'showScanned').bind(this)()
    })

    $('#spawnpoints-switch').change(function () {
        Store.set('showSpawnpoints', this.checked)
        reprocessSpawnpoints()
        lastspawns = false
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

    $('#ex-parks-switch').change(function () {
        settings.showExParks = this.checked
        if (this.checked) {
            updateParks()
        } else {
            exParksLayerGroup.clearLayers()
        }
        Store.set('showExParks', this.checked)
    })

    $('#nest-parks-switch').change(function () {
        settings.showNestParks = this.checked
        if (this.checked) {
            updateParks()
        } else {
            nestParksLayerGroup.clearLayers()
        }
        Store.set('showNestParks', this.checked)
    })

    $('#weather-cells-switch').change(function () {
        buildSwitchChangeListener(mapData, ['weather'], 'showWeatherCells').bind(this)()
    })

    $('#weather-alerts-switch').change(function () {
        buildSwitchChangeListener(mapData, ['weatherAlerts'], 'showWeatherAlerts').bind(this)()
    })

    $('#pokestop-name-filter').on('keyup', function () {
        $pokestopNameFilter = this.value.match(/[.*+?^${}()|[\]\\]/g) ? this.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : this.value
        reprocessPokestops()
        lastpokestops = false
        updateMap()
    })

    $('#pokestops-no-event-switch').change(function () {
        settings.showPokestopsNoEvent = this.checked
        reprocessPokestops()
        lastpokestops = false
        updateMap()
        Store.set('showPokestopsNoEvent', this.checked)
    })

    $('#invasions-switch').change(function () {
        var wrapper = $('#invasions-filter-wrapper')
        if (this.checked) {
            wrapper.show()
        } else {
            wrapper.hide()
        }
        settings.showInvasions = this.checked
        reprocessPokestops()
        lastpokestops = false
        updateMap()
        Store.set('showInvasions', this.checked)
    })

    $('#normal-lures-switch').change(function () {
        Store.set('showNormalLures', this.checked)
        reprocessPokestops()
        lastpokestops = false
        updateMap()
    })

    $('#glacial-lures-switch').change(function () {
        Store.set('showGlacialLures', this.checked)
        reprocessPokestops()
        lastpokestops = false
        updateMap()
    })

    $('#magnetic-lures-switch').change(function () {
        Store.set('showMagneticLures', this.checked)
        reprocessPokestops()
        lastpokestops = false
        updateMap()
    })

    $('#mossy-lures-switch').change(function () {
        Store.set('showMossyLures', this.checked)
        reprocessPokestops()
        lastpokestops = false
        updateMap()
    })

    $('#sound-switch').change(function () {
        Store.set('playSound', this.checked)
        var criesWrapper = $('#cries-wrapper')
        if (this.checked) {
            criesWrapper.show()
        } else {
            criesWrapper.hide()
        }
    })

    $('#pokemon-bounce-switch').change(function () {
        Store.set('bouncePokemon', this.checked)
        reprocessPokemons()
    })

    $('#gym-bounce-switch').change(function () {
        Store.set('bounceGyms', this.checked)
        reprocessGyms()
    })

    $('#pokestop-bounce-switch').change(function () {
        Store.set('bouncePokestops', this.checked)
        reprocessPokestops()
    })

    $('#pokemon-upscale-switch').change(function () {
        Store.set('upscaleNotifyPokemon', this.checked)
        reprocessPokemons()
    })

    $('#gym-upscale-switch').change(function () {
        Store.set('upscaleGyms', this.checked)
        reprocessGyms()
    })

    $('#pokestop-upscale-switch').change(function () {
        Store.set('upscalePokestops', this.checked)
        reprocessPokestops()
    })

    $('#notify-pokemon-switch').change(function () {
        var wrapper = $('#notify-pokemon-filter-wrapper')
        this.checked ? wrapper.show() : wrapper.hide()
        Store.set('notifyPokemon', this.checked)
        reprocessPokemons()
    })

    $('#notify-gyms-switch').change(function () {
        var wrapper = $('#notify-gyms-filter-wrapper')
        this.checked ? wrapper.show() : wrapper.hide()
        Store.set('notifyGyms', this.checked)
        reprocessGyms()
    })

    $('#notify-pokestops-switch').change(function () {
        var wrapper = $('#notify-pokestops-filter-wrapper')
        this.checked ? wrapper.show() : wrapper.hide()
        Store.set('notifyPokestops', this.checked)
        reprocessPokestops()
    })

    $('#notify-normal-lures-switch').change(function () {
        Store.set('notifyNormalLures', this.checked)
        reprocessPokestops()
    })

    $('#notify-glacial-lures-switch').change(function () {
        Store.set('notifyGlacialLures', this.checked)
        reprocessPokestops()
    })

    $('#notify-magnetic-lures-switch').change(function () {
        Store.set('notifyMagneticLures', this.checked)
        reprocessPokestops()
    })

    $('#notify-mossy-lures-switch').change(function () {
        Store.set('notifyMossyLures', this.checked)
        reprocessPokestops()
    })

    $('#popups-switch').change(function () {
        Store.set('showPopups', this.checked)
        location.reload()
    })

    $('#cries-switch').change(function () {
        Store.set('playCries', this.checked)
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

    $('#notify-ivs-text').change(function () {
        let notifyIvsPercentage = parseFloat(this.value)
        if (isNaN(notifyIvsPercentage) || notifyIvsPercentage <= 0) {
            this.value = ''
            notifyIvsPercentage = -1
        } else if (notifyIvsPercentage > 100) {
            this.value = notifyIvsPercentage = 100
        } else {
            // Round to 1 decimal place.
            this.value = notifyIvsPercentage = Math.round(notifyIvsPercentage * 10) / 10
        }
        Store.set('notifyIvsPercentage', notifyIvsPercentage)
        if (Store.get('showNotifiedPokemonAlways') || Store.get('showNotifiedPokemonOnly')) {
            lastpokemon = false
        }
        reprocessPokemons([], true)
    })

    $('#notify-level-text').change(function () {
        let notifyLevel = parseInt(this.value, 10)
        if (isNaN(notifyLevel) || notifyLevel <= 0) {
            this.value = ''
            notifyLevel = -1
        } else if (notifyLevel > 40) {
            this.value = notifyLevel = 40
        } else {
            this.value = notifyLevel
        }
        if (Store.get('showNotifiedPokemonAlways') || Store.get('showNotifiedPokemonOnly')) {
            lastpokemon = false
        }
        Store.set('notifyLevel', notifyLevel)
        reprocessPokemons([], true)
    })

    /*$('#notify-rarities-select').select2({
        placeholder: i8ln('Select rarity'),
        data: [i8ln('Common'), i8ln('Uncommon'), i8ln('Rare'), i8ln('Very Rare'), i8ln('Ultra Rare'), i8ln('New Spawn')],
        templateResult: formatRarityState
    })*/
    $('#notify-rarities-select').on('change', function (e) {
        if (Store.get('showNotifiedPokemonAlways') || Store.get('showNotifiedPokemonOnly')) {
            lastpokemon = false
        }
        Store.set('notifyRarities', $('#notify-rarities-select').val())
        reprocessPokemons()
    })

    $('#notify-tiny-rattata-switch').change(function () {
        if (this.checked && (Store.get('showNotifiedPokemonAlways') || Store.get('showNotifiedPokemonOnly'))) {
            reincludedPokemon.push(19)
        }
        Store.set('notifyTinyRattata', this.checked)
        if (!(Store.get('showNotifiedPokemonOnly') && this.checked)) {
            reprocessPokemons([19], true)
        }
    })

    $('#notify-big-magikarp-switch').change(function () {
        if (this.checked && (Store.get('showNotifiedPokemonAlways') || Store.get('showNotifiedPokemonOnly'))) {
            reincludedPokemon.push(129)
        }
        Store.set('notifyBigMagikarp', this.checked)
        if (!(Store.get('showNotifiedPokemonOnly') && this.checked)) {
            reprocessPokemons([129], true)
        }
    })

    $('#notified-pokemon-priority-switch').change(function () {
        Store.set('showNotifiedPokemonAlways', this.checked)
        if (!this.checked) {
            lastpokemon = false
        }
        reprocessPokemons()
    })

    $('#notified-pokemon-only-switch').change(function () {
        Store.set('showNotifiedPokemonOnly', this.checked)
        if (!this.checked) {
            lastpokemon = false
        }
        reprocessPokemons()
    })

    $('#pokemon-icon-size').on('change', function () {
        Store.set('pokemonIconSizeModifier', this.value)
        reprocessPokemons()
    })

    /*$('#map-service-provider').select2({
        placeholder: 'Select map provider',
        data: ['googlemaps', 'applemaps'],
        minimumResultsForSearch: Infinity
    })*/
    $('#map-service-provider').change(function () {
        Store.set('mapServiceProvider', this.value)
    })

    // Pokemon.
    if (showConfig.pokemons) {
        $('#pokemon-switch').prop('checked', settings.showPokemon)
        $('a[data-target="pokemon-filter-modal"]').toggle(settings.showPokemon)
        $('#pokemon-filters-wrapper').toggle(settings.showPokemon)
    }
    if (showConfig.pokemon_values) {
        $('#pokemon-values-switch').prop('checked', settings.showPokemonValues)
        $('#filter-pokemon-values-wrapper').toggle(settings.showPokemonValues)
        $('#filter-values-switch').prop('checked', settings.filterValues)
        $('#pokemon-values-filters-wrapper').toggle(settings.filterValues)
        $('#pokemon-ivs-slider-title').text(`IVs (${settings.minIvs}% - ${settings.maxIvs}%)`)
        $('#pokemon-ivs-slider-wrapper').toggle(settings.filterValues)
        $('#zero-ivs-pokemon-switch').prop('checked', settings.showZeroIvsPokemon)
        $('#zero-ivs-pokemon-switch-wrapper').toggle(settings.minIvs > 0)
        $('#pokemon-level-slider-title').text(`Levels (${settings.minLevel} - ${settings.maxLevel})`)
        $('#pokemon-level-slider-wrapper').toggle(settings.filterValues)
    }
    if (showConfig.rarity) {
        $('#rarity-select').val(settings.includedRarities)
        $('#rarity-select').formSelect()
        $('#scale-rarity-switch').prop('checked', settings.scaleByRarity)
    }

    // Gyms and Raids.
    if (showConfig.gyms || showConfig.raids) {
        $('#gym-name-filter-sidebar-wrapper').toggle(settings.showGyms || settings.showRaids)
        if (showConfig.gym_sidebar) {
            $('#gym-sidebar-switch').prop('checked', settings.useGymSidebar)
        }
    }
    if (showConfig.gyms) {
        $('#gym-switch').prop('checked', settings.showGyms)
    }
    if (showConfig.gym_filters) {
        $('#gym-filters-wrapper').toggle(settings.showGyms)
        $('#gym-team-select').val(settings.includedGymTeams)
        $('#gym-team-select').formSelect()
        $('#gym-level-slider-title').text(`Gym levels (${settings.minGymLevel} - ${settings.maxGymLevel})`)
        $('#gym-open-spot-switch').prop('checked', settings.showOpenSpotGymsOnly)
        $('#gym-ex-eligible-switch').prop('checked', settings.showExGymsOnly)
        $('#gym-in-battle-switch').prop('checked', settings.showInBattleGymsOnly)
        $('#gym-last-scanned-select').val(settings.gymLastScannedHours)
        $('#gym-last-scanned-select').formSelect()
    }
    if (showConfig.raids) {
        $('#raid-switch').prop('checked', settings.showRaids)
    }
    if (showConfig.raid_filters) {
        $('a[data-target="raid-pokemon-filter-modal"]').toggle(settings.showRaids)
        $('#raid-filters-wrapper').toggle(settings.showRaids)
        $('#raid-active-switch').prop('checked', settings.showActiveRaidsOnly)
        $('#raid-ex-eligible-switch').prop('checked', settings.showExEligibleRaidsOnly)
        $('#raid-level-select').val(settings.includedRaidLevels)
        $('#raid-level-select').formSelect()
    }

    // Pokestops.
    if (showConfig.pokestops) {
        $('#pokestop-switch').prop('checked', settings.showPokestops)
    }
    if (showConfig.quests) {
        $('#quest-switch').prop('checked', settings.showQuests)
        $('a[data-target="quest-filter-modal"]').toggle(settings.showQuests)
    }


    $('#pokestops-switch').prop('checked', settings.showPokestops)
    $('#pokestops-filter-wrapper').toggle(settings.showPokestops)
    $('#pokestops-no-event-switch').prop('checked', settings.showPokestopsNoEvent)
    $('#invasions-switch').prop('checked', settings.showInvasions)
    $('#invasions-filter-wrapper').toggle(settings.showInvasions)
    $('#normal-lures-switch').prop('checked', Store.get('showNormalLures'))
    $('#glacial-lures-switch').prop('checked', Store.get('showGlacialLures'))
    $('#magnetic-lures-switch').prop('checked', Store.get('showMagneticLures'))
    $('#mossy-lures-switch').prop('checked', Store.get('showMossyLures'))
    $('#quests-switch').prop('checked', settings.showQuests)
    $('#quests-filter-wrapper').toggle(settings.showQuests)

    // Weather.
    $('#weather-cells-switch').prop('checked', Store.get('showWeatherCells'))
    $('#weather-alerts-switch').prop('checked', Store.get('showWeatherAlerts'))

    // Map.
    $('#spawnpoints-switch').prop('checked', Store.get('showSpawnpoints'))
    $('#scanned-switch').prop('checked', Store.get('showScanned'))
    $('#ranges-switch').prop('checked', Store.get('showRanges'))
    $('#s2-cells-switch').prop('checked', Store.get('showS2Cells'))
    $('#s2-cells-wrapper').toggle(Store.get('showS2Cells'))
    $('#s2-level10-switch').prop('checked', Store.get('showS2CellsLevel10'))
    $('#s2-level13-switch').prop('checked', Store.get('showS2CellsLevel13'))
    $('#s2-level14-switch').prop('checked', Store.get('showS2CellsLevel14'))
    $('#s2-level17-switch').prop('checked', Store.get('showS2CellsLevel17'))
    $('#ex-parks-switch').prop('checked', settings.showExParks)
    $('#nest-parks-switch').prop('checked', settings.showNestParks)

    // Location.
    $('#start-at-user-location-switch').prop('checked', Store.get('startAtUserLocation'))
    $('#start-at-last-location-switch').prop('checked', Store.get('startAtLastLocation'))
    $('#lock-start-marker-switch').prop('checked', Store.get('lockStartLocationMarker'))
    $('#follow-my-location-switch').prop('checked', Store.get('followMyLocation'))

    // Notifications.
    $('#notify-pokemon-switch-wrapper').toggle(settings.showPokemon)
    $('#notify-pokemon-switch').prop('checked', Store.get('notifyPokemon'))
    $('#notify-pokemon-filter-wrapper').toggle(Store.get('notifyPokemon'))
    $('#notify-ivs-text').val(Store.get('notifyIvsPercentage')).trigger('change')
    $('#notify-level-text').val(Store.get('notifyLevel')).trigger('change')
    $('#notify-rarities-select').val(Store.get('notifyRarities'))
    $('#notify-tiny-rattata-switch').prop('checked', Store.get('notifyTinyRattata'))
    $('#notify-big-magikarp-switch').prop('checked', Store.get('notifyBigMagikarp'))
    $('#notified-pokemon-priority-switch').prop('checked', Store.get('showNotifiedPokemonAlways'))
    $('#notified-pokemon-only-switch').prop('checked', Store.get('showNotifiedPokemonOnly'))
    $('#cries-switch').prop('checked', Store.get('playCries'))
    $('#cries-wrapper').toggle(Store.get('playSound'))
    $('#pokemon-bounce-switch').prop('checked', Store.get('bouncePokemon'))
    $('#pokemon-upscale-switch').prop('checked', Store.get('upscaleNotifyPokemon'))
    $('#notify-gyms-switch-wrapper').toggle(settings.showRaids)
    $('#notify-gyms-switch').prop('checked', Store.get('notifyGyms'))
    $('#notify-gyms-filter-wrapper').toggle(Store.get('notifyGyms'))
    $('#gym-bounce-switch').prop('checked', Store.get('bounceGyms'))
    $('#gym-upscale-switch').prop('checked', Store.get('upscaleGyms'))
    $('#notify-pokestops-switch-wrapper').toggle(settings.showPokestops)
    $('#notify-pokestops-switch').prop('checked', Store.get('notifyPokestops'))
    $('#notify-pokestops-filter-wrapper').toggle(Store.get('notifyPokestops'))
    $('#notify-normal-lures-switch').prop('checked', Store.get('notifyNormalLures'))
    $('#notify-glacial-lures-switch').prop('checked', Store.get('notifyGlacialLures'))
    $('#notify-magnetic-lures-switch').prop('checked', Store.get('notifyMagneticLures'))
    $('#notify-mossy-lures-switch').prop('checked', Store.get('notifyMossyLures'))
    $('#pokestop-bounce-switch').prop('checked', Store.get('bouncePokestops'))
    $('#pokestop-upscale-switch').prop('checked', Store.get('upscalePokestops'))
    $('#popups-switch').prop('checked', Store.get('showPopups'))
    $('#sound-switch').prop('checked', Store.get('playSound'))

    // Style.
    $('#map-service-provider').val(Store.get('mapServiceProvider'))
    $('#pokemon-icon-size').val(Store.get('pokemonIconSizeModifier'))

    // Stats sidebar.
    $('#pokemon-stats-container').toggle(settings.showPokemon)
    $('#gym-stats-container').toggle(settings.showGyms)
    $('#pokestop-stats-container').toggle(settings.showPokestops)

    /*$('select:not([multiple])').select2({
        minimumResultsForSearch: Infinity
    })

    $('select[multiple]').select2()
    $('select[multiple]').parent().find('.select2-search__field').remove()
    $('select[multiple]').on('select2:opening select2:closing', function(event) {
        $(this).parent().find('.select2-search__field').remove()
    })*/
}

function initPokemonFilters() {
    var pokemonIds = []
    for (var i = 1; i <= availablePokemonCount; i++) {
        pokemonIds.push(i)
    }
    // Meltan and Melmetal.
    pokemonIds.push(808)
    pokemonIds.push(809)

    $.each(pokemonIds, function(idx, id) {
        var pokemonIcon
        if (generateImages) {
            pokemonIcon = `<img src='${getPokemonRawIconUrl({'pokemon_id': id})}' width='32'>`
        } else {
            pokemonIcon = `<i class='pokemon-sprite n${id}' width='32'></i>`
        }
        $('.pokemon-filter-list').append(
            `<div class='filter-button' data-id='${id}'>
              <div class='filter-button-content'>
                <div>#${id}</div>
                <div>${pokemonIcon}</div>
                <div>${getPokemonName(id)}</div>
              </div>
            </div>`)
    })

    $('.pokemon-filter-list').on('click', '.filter-button', function () {
        var img = $(this)
        var inputElement = $(this).parent().parent().find('input[id$=pokemon]')
        var value = inputElement.val().length > 0 ? inputElement.val().split(',') : []
        var id = img.data('id').toString()
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

    $('.pokemon-select-all').on('click', function (e) {
        e.preventDefault()
        var parent = $(this).parent().parent().parent()
        parent.find('.pokemon-filter-list .filter-button:visible').addClass('active')
        parent.find('input[id$=pokemon]').val(pokemonIds.join(',')).trigger('change')
    })

    $('.pokemon-deselect-all').on('click', function (e) {
        e.preventDefault()
        var parent = $(this).parent().parent().parent()
        parent.find('.pokemon-filter-list .filter-button:visible').removeClass('active')
        parent.find('input[id$=pokemon]').val('').trigger('change')
    })

    $('.pokemon-select-filtered').on('click', function (e) {
        e.preventDefault()
        var parent = $(this).parent().parent().parent()
        var inputElement = parent.find('input[id$=pokemon]')
        var selectedPokemons = inputElement.val().length > 0 ? inputElement.val().split(',') : []
        var visibleNotActiveIconElements = parent.find('.filter-button:visible:not(.active)')
        visibleNotActiveIconElements.addClass('active')
        $.each(visibleNotActiveIconElements, function (i, item) {
            selectedPokemons.push($(this).data('id'))
        })
        inputElement.val(selectedPokemons.join(',')).trigger('change')
    })

    $('.pokemon-deselect-filtered').on('click', function (e) {
        e.preventDefault()
        var parent = $(this).parent().parent().parent()
        var inputElement = parent.find('input[id$=pokemon]')
        var selectedPokemons = inputElement.val().length > 0 ? inputElement.val().split(',') : []
        var visibleActiveIconElements = parent.find('.filter-button:visible.active')
        visibleActiveIconElements.removeClass('active')
        $.each(visibleActiveIconElements, function (i, item) {
            var id = $(this).data('id').toString()
            selectedPokemons = selectedPokemons.filter(function (item) {
                return item !== id
            })
        })
        inputElement.val(selectedPokemons.join(',')).trigger('change')
    })

    $('.search').on('input', function () {
        var searchtext = $(this).val().toString()
        var parent = $(this)
        var foundPokemon = []
        var pokeselectlist = $(this).parent().parent().prev('.pokemon-filter-list').find('.filter-button')
        if (searchtext === '') {
            parent.parent().parent().find('.pokemon-select-filtered, .pokemon-deselect-filtered').hide()
            parent.parent().parent().find('.pokemon-select-all, .pokemon-deselect-all').show()
            pokeselectlist.show()
        } else {
            pokeselectlist.hide()
            parent.parent().parent().find('.pokemon-select-filtered, .pokemon-deselect-filtered').show()
            parent.parent().parent().find('.pokemon-select-all, .pokemon-deselect-all').hide()
            foundPokemon = searchPokemon(searchtext.replace(/\s/g, ''))
        }

        $.each(foundPokemon, function (i, item) {
            parent.parent().parent().prev('.pokemon-filter-list').find('.filter-button[data-id="' + foundPokemon[i] + '"]').show()
        })
    })

    if (showConfig.pokemons) {
        const includedPokemon = pokemonIds.filter(id => !settings.excludedPokemon.includes(id))
        $('#include-pokemon').val(includedPokemon)
        if (includedPokemon.length === pokemonIds.length) {
            $('#include-pokemon-title').text('Pokémon (All)')
        } else {
            $('#include-pokemon-title').text(`Pokémon (${includedPokemon.length})`)
        }

        $('label[for="include-pokemon"] .pokemon-filter-list .filter-button').each(function () {
            if (includedPokemon.includes($(this).data('id'))) {
                $(this).addClass('active')
            }
        })

        $('#include-pokemon').on('change', function (e) {
            const oldExcludedPokemon = settings.excludedPokemon

            const includedPokemon = $(this).val().length > 0 ? $(this).val().split(',').map(Number) : []
            settings.excludedPokemon = pokemonIds.filter(id => !includedPokemon.includes(id))

            const newExcludedPokemon = settings.excludedPokemon.filter(id => !oldExcludedPokemon.includes(id))
            if (newExcludedPokemon.length > 0) {
                reprocessPokemons(newExcludedPokemon)
            }

            const newReincludedPokemon = oldExcludedPokemon.filter(id => !settings.excludedPokemon.includes(id))
            reincludedPokemon = reincludedPokemon.concat(newReincludedPokemon)
            if (reincludedPokemon.length > 0) {
                updateMap()
            }

            if (includedPokemon.length === pokemonIds.length) {
                $('#include-pokemon-title').text('Pokémon (All)')
            } else {
                $('#include-pokemon-title').text(`Pokémon (${includedPokemon.length})`)
            }

            Store.set('excludedPokemon', settings.excludedPokemon)
        })
    }

    if (showConfig.raid_filters) {
        const includedPokemon = pokemonIds.filter(id => !settings.excludedRaidPokemon.includes(id))
        $('#include-raid-pokemon').val(includedPokemon)
        if (includedPokemon.length === pokemonIds.length) {
            $('#include-raid-pokemon-title').text('Raid Bosses (All)')
        } else {
            $('#include-raid-pokemon-title').text(`Raid Bosses (${includedPokemon.length})`)
        }

        $('label[for="include-raid-pokemon"] .pokemon-filter-list .filter-button').each(function () {
            if (includedPokemon.includes($(this).data('id'))) {
                $(this).addClass('active')
            }
        })

        $('#include-raid-pokemon').on('change', function (e) {
            const includedPokemon = $(this).val().length > 0 ? $(this).val().split(',').map(Number) : []
            const oldExcludedPokemon = settings.excludedRaidPokemon
            settings.excludedRaidPokemon = pokemonIds.filter(id => !includedPokemon.includes(id))

            if (settings.excludedRaidPokemon > oldExcludedPokemon) {
                reprocessGyms()
            } else {
                lastgyms = false
                updateMap()
            }

            if (includedPokemon.length === pokemonIds.length) {
                $('#include-raid-pokemon-title').text('Raid Bosses (All)')
            } else {
                $('#include-raid-pokemon-title').text(`Raid Bosses (${includedPokemon.length})`)
            }

            Store.set('excludedRaidPokemon', settings.excludedRaidPokemon)
        })
    }

    if (showConfig.quests) {
        const includedPokemon = pokemonIds.filter(id => !settings.excludedQuestPokemon.includes(id))
        $('#include-quest-pokemon').val(includedPokemon)
        if (includedPokemon.length === pokemonIds.length) {
            $('a[href="#quest-pokemon-tab"]').text('Quest Pokémon (All)')
        } else {
            $('a[href="#quest-pokemon-tab"]').text(`Quest Pokémon (${includedPokemon.length})`)
        }

        $('label[for="include-quest-pokemon"] .pokemon-filter-list .filter-button').each(function () {
            if (includedPokemon.includes($(this).data('id'))) {
                $(this).addClass('active')
            }
        })

        $('#include-quest-pokemon').on('change', function (e) {
            const includedPokemon = $(this).val().length > 0 ? $(this).val().split(',').map(Number) : []
            const oldExcludedPokemon = settings.excludedQuestPokemon
            settings.excludedQuestPokemon = pokemonIds.filter(id => !includedPokemon.includes(id))

            if (settings.excludedQuestPokemon > oldExcludedPokemon) {
                reprocessPokestops()
            } else {
                lastpokestops = false
                updateMap()
            }

            if (includedPokemon.length === pokemonIds.length) {
                $('a[href="#quest-pokemon-tab"]').text('Quest Pokémon (All)')
            } else {
                $('a[href="#quest-pokemon-tab"]').text(`Quest Pokémon (${includedPokemon.length})`)
            }
            $('#quest-filter-tabs').tabs('updateTabIndicator')

            Store.set('excludedQuestPokemon', settings.excludedQuestPokemon)
        })
    }
}

function initItemFilters() {
    if (showConfig.quests) {
        const excludeFromFilter = [0, 4, 5, 301, 401, 402, 403, 404, 501, 602, 603, 604, 702, 704, 707, 801, 901, 902, 903, 1001, 1002, 1101, 1102, 1103, 1104, 1105, 1106, 1401, 1402, 1403, 1404, 1405, 1406, 1501, 1502, 1503, 1600]
        $.each(itemData, function(id, value) {
            id = parseInt(id)
            if (excludeFromFilter.includes(id)) {
                return
            }

            const iconUrl = getItemImageUrl(id)
            const questBundles = getQuestBundles(id)
            if (questBundles.length > 0) {
                $.each(questBundles, function(idx, bundleAmount) {
                    $('.quest-item-filter-list').append(
                        `<div class='filter-button' data-id='${id}' data-bundle='${bundleAmount}'>
                        <div class='filter-button-content'>
                        <div>${value.name}</div>
                        <div><img src='${iconUrl}' width='32'></div>
                        <div>x${bundleAmount}</div>
                        </div>
                        </div>`)
                    })
            } else {
                $('.quest-item-filter-list').append(
                    `<div class='filter-button' data-id='${id}'>
                    <div class='filter-button-content'>
                    <div>${value.name}</div>
                    <div><img src='${iconUrl}' width='32'></div>
                    </div>
                    </div>`)
                }
            })
    }
}

function pokemonLabel(item) {
    var name = item['pokemon_name']
    var types = getPokemonTypesNoI8ln(item.pokemon_id, item.form)
    var encounterId = item['encounter_id']
    var id = item['pokemon_id']
    var latitude = item['latitude']
    var longitude = item['longitude']
    var disappearTime = item['disappear_time']
    var atk = item['individual_attack']
    var def = item['individual_defense']
    var sta = item['individual_stamina']
    var move1Name = getMoveName(item.move_1)
    var move2Name = getMoveName(item.move_2)
    var move1Type = getMoveTypeNoI8ln(item.move_1)
    var move2Type = getMoveTypeNoI8ln(item.move_2)
    var weight = item['weight'] !== null ? item['weight'].toFixed(2) : '?'
    var height = item['height'] !== null ? item['height'].toFixed(2) : '?'
    var gender = item['gender']
    var form = item['form']
    var cp = item['cp']
    var cpMultiplier = item['cp_multiplier']
    var weatherBoostedCondition = item['weather_boosted_condition']

    var pokemonIcon = getPokemonRawIconUrl(item)
    var gen = getPokemonGen(id)

    var formDisplay = ''
    var genRarityDisplayLeft = ''
    var genRarityDisplayRight = ''
    var weatherBoostDisplay = ''
    var verifiedDisplay = ''
    var typesDisplay = ''
    var statsDisplay = ''

    if (id === 29 || id === 32) {
        name = name.slice(0, -1)
    }

    const formName = form ? getFormName(id, form) : false
    if (formName) {
        formDisplay = `(${formName})`
    }

    if (weatherBoostedCondition > 0) {
        weatherBoostDisplay = `<img id='weather-icon' src='static/images/weather/${weatherImages[weatherBoostedCondition]}' width='24'>`
    }

    if (item.verified_disappear_time) {
        verifiedDisplay = `<i id='despawn-verified' class='fas fa-check-square' title='Despawn time verified'></i>`
    } else if (item.verified_disappear_time === null) {
        verifiedDisplay = `<i id='despawn-unverified' class='fas fa-exclamation-triangle' title='Despawn time not verified'></i>`
    }

    $.each(types, function (idx, type) {
        if (idx === 1) {
            typesDisplay += `<img src='static/images/types/${type.type.toLowerCase()}.png' title='${i8ln(type.type)}' width='16' style='margin-left:4px;'>`
        } else {
            typesDisplay += `<img src='static/images/types/${type.type.toLowerCase()}.png' title='${i8ln(type.type)}' width='16'>`
        }
    })

    if (settings.showPokemonValues && cp !== null && cpMultiplier !== null) {
        var iv = 0
        if (atk !== null && def !== null && sta !== null) {
            iv = getIvsPercentage(item)
        }
        var ivColor = getPercentageCssColor(iv, 100, 82, 66, 51)
        var level = getPokemonLevel(item)

        statsDisplay = `
            <div class='info-container'>
              <div>
                IV: <strong><span style='color: ${ivColor};'>${iv}%</span></strong> (A<strong>${atk}</strong> | D<strong>${def}</strong> | S<strong>${sta}</strong>)
              </div>
              <div>
                CP: <strong>${cp}</strong> | Level: <strong>${level}</strong>
              </div>
              <div>
               Fast: <strong>${move1Name}</strong> <img class='move-type-icon' src='static/images/types/${move1Type.toLowerCase()}.png' title='${i8ln(move1Type)}' width='15'>
              </div>
              <div>
               Charge: <strong>${move2Name}</strong> <img class='move-type-icon' src='static/images/types/${move2Type.toLowerCase()}.png' title='${i8ln(move2Type)}' width='15'>
              </div>
              <div>
                Weight: <strong>${weight}kg</strong> | Height: <strong>${height}m</strong>
              </div>
            </div>`

        let rarityDisplay = ''
        if (showConfig.rarity) {
            const rarityName = getPokemonRarityName(item['pokemon_id'])
            rarityDisplay = `
                <div>
                  <strong>${rarityName}</strong>
                </div>`
        }

        genRarityDisplayLeft = `
            ${rarityDisplay}
            <div>
              <strong>Gen ${gen}</strong>
            </div>`
    } else {
        let rarityDisplay = ''
        if (showConfig.rarity) {
            const rarityName = getPokemonRarityName(item['pokemon_id'])
            rarityDisplay = `<strong>${rarityName}</strong> | `
        }

        genRarityDisplayRight = `
            <div class='info-container'>
              ${rarityDisplay}<strong>Gen ${gen}</strong>
            </div>`
    }

    const mapLabel = Store.get('mapServiceProvider') === 'googlemaps' ? 'Google' : 'Apple'

    const notifyText = notifyPokemon.includes(id) ? 'Unnotify' : 'Notify'
    const notifyIconClass = notifyPokemon.includes(id) ? 'fas fa-bell-slash' : 'fas fa-bell'

    return `
        <div>
          <div id='pokemon-container'>
            <div id='pokemon-container-left'>
              <div id='pokemon-image'>
                <img src='${pokemonIcon}' width='64'>
              </div>
              <div id='types'>
                ${typesDisplay}
              </div>
              ${genRarityDisplayLeft}
            </div>
            <div id='pokemon-container-right'>
              <div class='title'>
                <span>${name} ${formDisplay} <i class="fas ${genderClasses[gender - 1]}"></i> #${id}</span> ${weatherBoostDisplay}
              </div>
              <div class='disappear'>
                ${timestampToTime(disappearTime)} (<span class='label-countdown' disappears-at='${disappearTime}'>00m00s</span>) ${verifiedDisplay}
              </div>
              ${statsDisplay}
              ${genRarityDisplayRight}
              <div class='coordinates'>
                <a href='javascript:void(0);' onclick='javascript:openMapDirections(${latitude},${longitude});' class='link-button' title='Open in ${mapLabel} Maps'><i class="fas fa-map-marked-alt"></i> ${latitude.toFixed(5)}, ${longitude.toFixed(5)}</a>
              </div>
              <div>
                <a href='javascript:notifyAboutPokemon(${id}, "${encounterId}")' class='link-button' title='${notifyText}'><i class="${notifyIconClass}"></i></a>
                <a href='javascript:excludePokemon(${id}, "${encounterId}")' class='link-button' title='Hide'><i class="fas fa-eye-slash"></i></a>
                <a href='javascript:removePokemonMarker("${encounterId}")' class='link-button' title='Remove'><i class="fas fa-trash"></i></a>
                <a href='https://pokemongo.gamepress.gg/pokemon/${id}' class='link-button' target='_blank' title='View on GamePress'><i class="fas fa-info-circle"></i></a>
              </div>
            </div>
          </div>
        </div>`
}

function updatePokemonLabel(pokemon, marker) {
    marker.getPopup().setContent(pokemonLabel(pokemon))
    if (marker.isPopupOpen()) {
        // Update countdown time to prevent a countdown time of 0.
        updateLabelDiffTime()
    }
}

function gymLabel(gym) {
    const teamName = gymTypes[gym.team_id]
    const titleText = gym.name !== null && gym.name !== '' ? gym.name : (gym.team_id === 0 ? teamName : teamName + ' Gym')
    const mapLabel = Store.get('mapServiceProvider') === 'googlemaps' ? 'Google' : 'Apple'

    var exDisplay = ''
    var gymImageDisplay = ''
    var strenghtDisplay = ''
    var gymLeaderDisplay = ''
    var raidDisplay = ''

    if (gym.is_ex_raid_eligible) {
        exDisplay = `<img id='ex-icon' src='static/images/gym/ex.png' width='22'>`
    }

    if (gym.url) {
        const url = gym.url.replace(/^http:\/\//i, '//')
        gymImageDisplay = `
            <div>
              <img class='gym-image ${teamName.toLowerCase()}' src='${url}' onclick='showImageModal("${url}", "${titleText.replace(/"/g, '\\&quot;').replace(/'/g, '\\&#39;')}")' width='64' height='64'>
            </div>`
    } else {
        let gymUrl = `gym_img?team=${teamName}&level=${getGymLevel(gym)}`
        if (gym.is_in_battle) {
            gymUrl += '&in_battle=1'
        }
        gymImageDisplay = `
            <div>
              <img class='gym-icon' src='${gymUrl}' width='64'>
            </div>`
    }

    if (gym.team_id !== 0) {
        /* strenghtDisplay = `
            <div>
              Strength: <span class='info'>${gym.total_cp}</span>
            </div>` */

        gymLeaderDisplay = `
            <div>
              Gym leader: <strong>${getPokemonName(gym.guard_pokemon_id)} <a href='https://pokemongo.gamepress.gg/pokemon/${gym.guard_pokemon_id}' target='_blank' title='View on GamePress'>#${gym.guard_pokemon_id}</a></strong>
            </div>`
    }

    if (isGymMeetsRaidFilters(gym)) {
        const raid = gym.raid
        const raidColor = ['252,112,176', '255,158,22', '184,165,221']
        const levelStr = '★'.repeat(raid.level)

        if (isOngoingRaid(raid) && raid.pokemon_id !== null) {
            const pokemonIconUrl = getPokemonRawIconUrl(raid)

            let typesDisplay = ''
            const types = getPokemonTypesNoI8ln(raid.pokemon_id, raid.form)
            $.each(types, function (index, type) {
                if (index === 1) {
                    typesDisplay += `<img src='static/images/types/${type.type.toLowerCase()}.png' title='${i8ln(type.type)}' width='16' style='margin-left:4px;'>`
                } else {
                    typesDisplay += `<img src='static/images/types/${type.type.toLowerCase()}.png' title='${i8ln(type.type)}' width='16'>`
                }
            })

            let pokemonName = raid.pokemon_name
            const formName = raid.form ? getFormName(raid.pokemon_id, raid.form) : false
            if (formName) {
                pokemonName += ` (${formName})`
            }

            let fastMoveName = getMoveName(raid.move_1)
            let chargeMoveName = getMoveName(raid.move_2)
            let fastMoveType = getMoveTypeNoI8ln(raid.move_1)
            let chargeMoveType = getMoveTypeNoI8ln(raid.move_2)

            const notifyText = notifyRaidPokemon.includes(raid.pokemon_id) ? 'Unnotify' : 'Notify'
            const notifyIconClass = notifyRaidPokemon.includes(raid.pokemon_id) ? 'fas fa-bell-slash' : 'fas fa-bell'

            raidDisplay = `
                <div class='section-divider'></div>
                <div id='raid-container'>
                  <div id='raid-container-left'>
                    <div>
                      <img src='${pokemonIconUrl}' width='64px'>
                    </div>
                    <div>
                     ${typesDisplay}
                    </div>
                    <div>
                      <strong><span style='color:rgb(${raidColor[Math.floor((raid.level - 1) / 2)]})'>${levelStr}</span></strong>
                    </div>
                  </div>
                  <div id='raid-container-right'>
                    <div class='title ongoing'>
                      <div>
                        ${pokemonName} <i class="fas ${genderClasses[raid.gender - 1]}"></i> #${raid.pokemon_id} Raid
                      </div>
                    </div>
                    <div class='disappear'>
                      ${timestampToTime(raid.end)} (<span class='label-countdown' disappears-at='${raid.end}'>00m00s</span>)
                    </div>
                    <div class='info-container'>
                      <div>
                        CP: <strong>${raid.cp}</strong>
                      </div>
                      <div>
                        Fast: <strong>${fastMoveName}</strong> <img class='move-type-icon' src='static/images/types/${fastMoveType.toLowerCase()}.png' title='${i8ln(fastMoveType)}' width='15'>
                      </div>
                      <div>
                        Charge: <strong>${chargeMoveName}</strong> <img class='move-type-icon' src='static/images/types/${chargeMoveType.toLowerCase()}.png' title='${i8ln(chargeMoveType)}' width='15'>
                      </div>
                    </div>
                    <div>
                      <a href='javascript:notifyAboutRaidPokemon(${raid.pokemon_id})' class='link-button' title='${notifyText}'><i class="${notifyIconClass}"></i></a>
                      <a href='javascript:excludeRaidPokemon(${raid.pokemon_id})' class='link-button' title='Hide'><i class="fas fa-eye-slash"></i></a>
                      <a href='https://pokemongo.gamepress.gg/pokemon/${raid.pokemon_id}' class='link-button' target='_blank' title='View on GamePress'><i class="fas fa-info-circle"></i></a>
                    </div>
                  </div>
                </div>`
        } else {
            const isNotifyEgg = notifyEggs.includes(raid.level)
            const notifyText = isNotifyEgg ? 'Unnotify' : 'Notify'
            const notifyIconClass = isNotifyEgg ? 'fas fa-bell-slash' : 'fas fa-bell'
            const notifyFunction = isNotifyEgg ? 'unnotifyAboutEgg' : 'notifyAboutEgg'

            raidDisplay = `
                <div class='section-divider'></div>
                <div id='raid-container'>
                  <div id='raid-container-left'>
                    <img id='egg-image' src='static/images/gym/${raidEggImages[raid.level]}' width='64'>
                  </div>
                  <div id='raid-container-right'>
                    <div class='title upcoming'>
                      Raid <span style='color:rgb(${raidColor[Math.floor((raid.level - 1) / 2)]})'>${levelStr}</span>
                    </div>
                    <div class='info-container'>
                      <div>
                        Start: <strong>${timestampToTime(raid.start)} (<span class='label-countdown' disappears-at='${raid.start}'>00m00s</span>)</strong>
                      </div>
                      <div>
                        End: <strong>${timestampToTime(raid.end)} (<span class='label-countdown' disappears-at='${raid.end}'>00m00s</span>)</strong>
                      </div>
                    </div>
                    <div>
                      <a href='javascript:${notifyFunction}(${raid.level})' class='link-button' title='${notifyText}'><i class="${notifyIconClass}"></i></a>
                      <a href='javascript:excludeEgg(${raid.level})' class='link-button' title='Hide'><i class="fas fa-eye-slash"></i></a>
                    </div>
                  </div>
                </div>`
        }
    }

    return `
        <div>
          <div id='gym-container'>
            <div id='gym-container-left'>
              ${gymImageDisplay}
              <div class='team-name ${teamName.toLowerCase()}'>
                <strong>${teamName}</strong>
              </div>
            </div>
            <div id='gym-container-right'>
              <div class='title'>
                ${titleText} ${exDisplay}
              </div>
              <div class='info-container'>
                ${strenghtDisplay}
                <div>
                  Free slots: <strong>${gym.slots_available}</strong>
                </div>
                ${gymLeaderDisplay}
                <div>
                  Last scanned: <strong>${timestampToDateTime(gym.last_scanned)}</strong>
                </div>
                <div>
                  Last modified: <strong>${timestampToDateTime(gym.last_modified)}</strong>
                </div>
              </div>
              <div>
                <a href='javascript:void(0);' onclick='javascript:openMapDirections(${gym.latitude},${gym.longitude});' title='Open in ${mapLabel} Maps'><i class="fas fa-map-marked-alt"></i> ${gym.latitude.toFixed(5)}, ${gym.longitude.toFixed(5)}</a>
              </div>
            </div>
          </div>
          ${raidDisplay}
        </div>`
}

function updateGymLabel(gym, marker) {
    marker.getPopup().setContent(gymLabel(gym))
    if (marker.isPopupOpen() && isValidRaid(gym.raid)) {
        // Update countdown time to prevent a countdown time of 0.
        updateLabelDiffTime()
    }
}

function pokestopLabel(pokestop) {
    const pokestopName = pokestop.name != null && pokestop.name != '' ? pokestop.name : 'PokéStop'
    const mapLabel = Store.get('mapServiceProvider') === 'googlemaps' ? 'Google' : 'Apple'
    var imageUrl = ''
    var imageClass = ''
    var imageOnclick = ''
    var lureDisplay = ''
    var lureClass = ''
    var invasionDisplay = ''
    var questDisplay = ''

    if (pokestop.image != null && pokestop.image != '') {
        imageUrl = pokestop.image.replace(/^http:\/\//i, '//')
        imageOnclick = `onclick='showImageModal("${imageUrl}", "${pokestopName.replace(/"/g, '\\&quot;').replace(/'/g, '\\&#39;')}")'`
        imageClass = 'pokestop-image'
    } else {
        imageUrl = getPokestopIconUrlFiltered(pokestop)
        imageClass = 'pokestop-icon'
    }

    if (isPokestopMeetsQuestFilters(pokestop)) {
        const quest = pokestop.quest
        let rewardImageUrl = ''
        let rewardText = ''

        switch (quest.reward_type) {
            case 2:
                rewardImageUrl = 'static/images/quest/reward_' + quest.item_id + '_1.png'
                rewardText = quest.item_amount + ' ' + i8ln(questItemNames[quest.item_id])
                break
            case 3:
                rewardImageUrl = 'static/images/quest/reward_stardust.png'
                rewardText = quest.stardust + ' Stardust'
                break
            case 7:
                rewardImageUrl = getPokemonRawIconUrl(quest)
                rewardText = `${getPokemonName(quest.pokemon_id)} <a href='https://pokemongo.gamepress.gg/pokemon/${quest.pokemon_id}' target='_blank' title='View on GamePress'>#${quest.pokemon_id}</a>`
                break
        }

        questDisplay = `
            <div class='section-divider'></div>
            <div class='pokestop-container'>
              <div class='pokestop-container-left'>
                <div>
                  <img class='quest-image' src="${rewardImageUrl}" width='64'/>
                </div>
              </div>
              <div class='pokestop-container-right'>
                <div class='title'>
                  Quest
                </div>
                <div>
                  Task: <strong>${quest.task}</strong>
                </div>
                <div>
                  Reward: <strong>${rewardText}</strong>
                </div>
              </div>
            </div>`
    }

    if (isPokestopMeetsInvasionFilters(pokestop)) {
        const invasionId = pokestop.incident_grunt_type
        const invasionExpireTime = pokestop.incident_expiration
        invasionDisplay = `
            <div class='section-divider'></div>
            <div class='pokestop-container'>
              <div class='pokestop-container-left'>
                <div>
                  <img class='invasion-image' src="static/images/invasion/${invasionId}.png" width='64'/>
                </div>
              </div>
              <div class='pokestop-container-right'>
                <div class='title invasion'>
                  <div>
                    Team Rocket Invasion
                  </div>
                </div>
                <div class='disappear'>
                  ${timestampToTime(invasionExpireTime)} (<span class='label-countdown' disappears-at='${invasionExpireTime}'>00m00s</span>)
                </div>
                <div>
                  Invasion type: <strong>${idToInvasion[invasionId].type}</strong>
                </div>
                <div>
                  Grunt gender: <strong>${idToInvasion[invasionId].gruntGender}</strong>
                </div>
              </div>
            </div>`
    }

    if (isPokestopMeetsLureFilters(pokestop)) {
        const lureExpireTime = pokestop.lure_expiration
        lureClass = 'lure-' + lureTypes[pokestop.active_fort_modifier].toLowerCase()
        lureDisplay = `
            <div class='lure-container ${lureClass}'>
              <div class='title'>
                ${lureTypes[pokestop.active_fort_modifier]} Lure
              </div>
              <div class='disappear'>
                ${timestampToTime(lureExpireTime)} (<span class='label-countdown' disappears-at='${lureExpireTime}'>00m00s</span>)
              </div>
            </div>`
    } else {
        lureClass = 'no-lure'
    }

    return `
        <div>
          <div class='pokestop-container'>
            <div class='pokestop-container-left'>
              <div>
                <img class='${imageClass} ${lureClass}' src='${imageUrl}' ${imageOnclick} width='64' height='64'>
              </div>
            </div>
            <div class='pokestop-container-right'>
              <div class='title'>
                ${pokestopName}
              </div>
              ${lureDisplay}
              <div>
                Last scanned: <strong>${timestampToDateTime(pokestop.last_updated)}</strong>
              </div>
              <div>
                <a href='javascript:void(0);' onclick='javascript:openMapDirections(${pokestop.latitude},${pokestop.longitude});' title='Open in ${mapLabel} Maps'><i class="fas fa-map-marked-alt"></i> ${pokestop.latitude.toFixed(5)}, ${pokestop.longitude.toFixed(5)}</a>
              </div>
            </div>
          </div>
          ${invasionDisplay}
          ${questDisplay}
        </div>`
}

function updatePokestopLabel(pokestop, marker) {
    marker.getPopup().setContent(pokestopLabel(pokestop))
    const now = Date.now()
    if (marker.isPopupOpen() && ((pokestop.lure_expiration && pokestop.lure_expiration > now) ||
            (pokestop.incident_expiration && pokestop.incident_expiration > now))) {
        // Update countdown time to prevent a countdown time of 0.
        updateLabelDiffTime()
    }
}

function spawnpointLabel(spawnpoint) {
    if (spawnpoint.spawn_time) {
        if (spawnpoint.spawndef == 15) {
          var type = '1h';
          var timeshift = 60;
        } else {
          var type = '30m';
          var timeshift = 30;
        }

        if (spawnpoint.spawn_time > Date.now()) {
            var spawnTime = `${timestampToTime(spawnpoint.spawn_time)} (<span class='label-countdown' disappears-at='${spawnpoint.spawn_time}'>00m00s</span>)`
        } else {
            var spawnTime = timestampToTime(spawnpoint.spawn_time)
        }
        var despawnTime = `${timestampToTime(spawnpoint.despawn_time)} (<span class='label-countdown' disappears-at='${spawnpoint.despawn_time}'>00m00s</span>)`
        var lastConfirmation = timestampToDateTime(spawnpoint.last_scanned)
    }

    const lastScanned = spawnpoint.last_scanned > spawnpoint.last_non_scanned ? spawnpoint.last_scanned : spawnpoint.last_non_scanned
    const mapLabel = Store.get('mapServiceProvider') === 'googlemaps' ? 'Google' : 'Apple'

    return `
        <div class='title'>
          <strong>Spawn Point</strong>
        </div>
        <div class='info-container'>
          <div>
            Type: <strong>${type || 'Unknown'}</strong>
          </div>
          <div>
              Spawn: <strong>${spawnTime || 'Unknown'}</strong>
          </div>
          <div>
              Despawn: <strong>${despawnTime || 'Unknown'}</strong>
          </div>
        </div>
        <div class='info-container'>
          <div>
            First seen: <strong>${timestampToDateTime(spawnpoint.first_detection)}</strong>
          </div>
          <div>
            Last seen: <strong>${timestampToDateTime(lastScanned)}</strong>
          </div>
          <div>
            Last confirmation: <strong>${lastConfirmation || 'None'}</strong>
          </div>
        </div>
        <div>
          <a href='javascript:void(0);' onclick='javascript:openMapDirections(${spawnpoint.latitude},${spawnpoint.longitude});' class='link-button' title='Open in ${mapLabel} Maps'><i class="fas fa-map-marked-alt"></i> ${spawnpoint.latitude.toFixed(5)}, ${spawnpoint.longitude.toFixed(5)}</a>
        </div>`
}

function updateSpawnpointLabel(spawnpoint, marker) {
    marker.getPopup().setContent(spawnpointLabel(spawnpoint))
    if (marker.isPopupOpen()) {
        // Update countdown time to prevent a countdown time of 0.
        updateLabelDiffTime()
    }
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

function lpad(str, len, padstr) {
    return Array(Math.max(len - String(str).length + 1, 0)).join(padstr) + str
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

function sizeRatio(height, weight, baseHeight, baseWeight) {
    var heightRatio = height / baseHeight
    var weightRatio = weight / baseWeight

    return heightRatio + weightRatio
}

function customizePokemonMarker(pokemon, marker, isNotifyPokemon) {
    marker.setBouncingOptions({
        bounceHeight: 20,
        bounceSpeed: 80,
        elastic: false,
        shadowAngle: null
    })

    marker.encounter_id = pokemon.encounter_id
    updatePokemonMarker(pokemon, marker, isNotifyPokemon)
    marker.bindPopup()

    if (!marker.rangeCircle && isRangeActive(map)) {
        marker.rangeCircle = addRangeCircle(marker, map, 'pokemon')
    }

    addListeners(marker, 'pokemon')

    return marker
}

function updatePokemonMarker(pokemon, marker, isNotifyPokemon) {
    var iconSize = 32 * (Store.get('pokemonIconSizeModifier') / 100)
    var upscaleModifier = 1
    if (isNotifyPokemon && Store.get('upscaleNotifyPokemon')) {
        upscaleModifier = 1.3
    } else if (Store.get('upscalePokemon')) {
        const upscaledPokemon = Store.get('upscaledPokemon')
        if (upscaledPokemon.includes(pokemon.pokemon_id)) {
            upscaleModifier = 1.3
        }
    }
    if (settings.scaleByRarity) {
        const pokemonRarity = getPokemonRarity(pokemon.pokemon_id)
        switch (pokemonRarity) {
            case 4:
                upscaleModifier = 1.3
                break
            case 5:
                upscaleModifier = 1.4
                break
            case 6:
                upscaleModifier = 1.5
        }
    }
    iconSize *= upscaleModifier

    var icon = marker.options.icon
    icon.options.iconSize = [iconSize, iconSize]
    marker.setIcon(icon)

    if (isNotifyPokemon) {
        marker.setZIndexOffset(pokemonNotifiedZIndex)
    } else if (showConfig.rarity) {
        const pokemonRarity = getPokemonRarity(pokemon.pokemon_id)
        switch (pokemonRarity) {
            case 2:
                marker.setZIndexOffset(pokemonUncommonZIndex)
                break
            case 3:
                marker.setZIndexOffset(pokemonRareZIndex)
                break
            case 4:
                marker.setZIndexOffset(pokemonVeryRareZIndex)
                break
            case 5:
                marker.setZIndexOffset(pokemonUltraRareZIndex)
                break
            case 6:
                marker.setZIndexOffset(pokemonNewSpawnZIndex)
                break
            default:
                marker.setZIndexOffset(pokemonZIndex)
        }
    } else {
        marker.setZIndexOffset(pokemonZIndex)
    }

    if (Store.get('bouncePokemon') && isNotifyPokemon && !notifiedPokemonData[pokemon.encounter_id].animationDisabled && !marker.isBouncing()) {
        marker.bounce()
    } else if (marker.isBouncing() && (!Store.get('bouncePokemon') || !isNotifyPokemon)) {
        marker.stopBouncing()
    }

    if (isNotifyPokemon && markers.hasLayer(marker)) {
        // Marker in wrong layer, move to other layer.
        markers.removeLayer(marker)
        markersNoCluster.addLayer(marker)
    } else if (!isNotifyPokemon && markersNoCluster.hasLayer(marker)) {
        // Marker in wrong layer, move to other layer.
        markersNoCluster.removeLayer(marker)
        markers.addLayer(marker)
    }

    return marker
}

function setupGymMarker(gym, isNotifyGym) {
    var marker = L.marker([gym.latitude, gym.longitude])
    if (isNotifyGym) {
        markersNoCluster.addLayer(marker)
    } else {
        markers.addLayer(marker)
    }

    marker.setBouncingOptions({
        bounceHeight: 20,
        bounceSpeed: 80,
        elastic: false,
        shadowAngle: null
    })

    marker.gym_id = gym.gym_id
    updateGymMarker(gym, marker, isNotifyGym)
    if (!settings.useGymSidebar) {
        marker.bindPopup()
    }

    if (!marker.rangeCircle && isRangeActive(map)) {
        marker.rangeCircle = addRangeCircle(marker, map, 'gym', gym.team_id)
    }

    if (settings.useGymSidebar) {
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

function updateGymMarker(gym, marker, isNotifyGym) {
    var markerImage = ''
    const upscaleModifier = Store.get('upscaleGyms') && isNotifyGym ? 1.2 : 1
    const gymLevel = getGymLevel(gym)

    if (isGymMeetsRaidFilters(gym)) {
        const raid = gym.raid
        if (isOngoingRaid(raid) && raid.pokemon_id !== null) {
            markerImage = 'gym_img?team=' + gymTypes[gym.team_id] + '&level=' + gymLevel + '&raidlevel=' + raid.level + '&pkm=' + raid.pokemon_id
            if (raid.form != null && raid.form > 0) {
                markerImage += '&form=' + raid.form
            }
            marker.setZIndexOffset(gymRaidBossZIndex)
        } else { // Upcoming raid.
            markerImage = 'gym_img?team=' + gymTypes[gym.team_id] + '&level=' + gymLevel + '&raidlevel=' + raid.level
            marker.setZIndexOffset(gymEggZIndex)
        }
    } else {
        markerImage = 'gym_img?team=' + gymTypes[gym.team_id] + '&level=' + gymLevel
        marker.setZIndexOffset(gymZIndex)
    }

    if (gym.is_in_battle) {
        markerImage += '&in_battle=1'
    }

    if (gym.is_ex_raid_eligible) {
        markerImage += '&is_ex_raid_eligible=1'
    }

    var GymIcon = new L.Icon({
        iconUrl: markerImage,
        iconSize: [48 * upscaleModifier, 48 * upscaleModifier]
    })
    marker.setIcon(GymIcon)

    if (isNotifyGym) {
        marker.setZIndexOffset(gymNotifiedZIndex)
    }

    if (Store.get('bounceGyms') && isNotifyGym && !notifiedGymData[gym.gym_id].animationDisabled && !marker.isBouncing()) {
        marker.bounce()
    } else if (marker.isBouncing() && (!Store.get('bounceGyms') || !isNotifyGym)) {
        marker.stopBouncing()
    }

    if (isNotifyGym && markers.hasLayer(marker)) {
        // Marker in wrong layer, move to other layer.
        markers.removeLayer(marker)
        markersNoCluster.addLayer(marker)
    } else if (!isNotifyGym && markersNoCluster.hasLayer(marker)) {
        // Marker in wrong layer, move to other layer.
        markersNoCluster.removeLayer(marker)
        markers.addLayer(marker)
    }

    return marker
}

function setupPokestopMarker(pokestop, isNotifyPokestop) {
    var marker = L.marker([pokestop.latitude, pokestop.longitude])
    if (isNotifyPokestop) {
        markersNoCluster.addLayer(marker)
    } else {
        markers.addLayer(marker)
    }

    marker.setBouncingOptions({
        bounceHeight: 20,
        bounceSpeed: 80,
        elastic: false,
        shadowAngle: Math.PI * 1.5
    })

    marker.pokestop_id = pokestop.pokestop_id
    updatePokestopMarker(pokestop, marker, isNotifyPokestop)
    marker.bindPopup()

    if (!marker.rangeCircle && isRangeActive(map)) {
        marker.rangeCircle = addRangeCircle(marker, map, 'pokestop')
    }

    addListeners(marker, 'pokestop')

    return marker
}

function updatePokestopMarker(pokestop, marker, isNotifyPokestop) {
    var shadowImage = null
    var shadowSize = null
    var shadowAnchor = null
    const upscaleModifier = Store.get('upscalePokestops') && isNotifyPokestop ? 1.3 : 1

    if (isPokestopMeetsQuestFilters(pokestop)) {
        const quest = pokestop.quest
        shadowAnchor = [30, 30]
        switch (quest.reward_type) {
            case 2:
                shadowImage = 'static/images/quest/reward_' + quest.item_id + '_1.png'
                shadowSize = [30, 30]
                break
            case 3:
                shadowImage = 'static/images/quest/reward_stardust.png'
                shadowSize = [30, 30]
                break
            case 7:
                if (generateImages) {
                    shadowImage = `pkm_img?pkm=${quest.pokemon_id}`
                    shadowSize = [35, 35]
                } else {
                    shadowImage = pokemonSprites(quest.pokemon_id).filename
                    shadowSize = [40, 40]
                }
                break
        }
    }

    var PokestopIcon = new L.icon({ // eslint-disable-line new-cap
        iconUrl: getPokestopIconUrlFiltered(pokestop),
        iconSize: [32 * upscaleModifier, 32 * upscaleModifier],
        iconAnchor: [16 * upscaleModifier, 32 * upscaleModifier],
        popupAnchor: [0, -16 * upscaleModifier],
        shadowUrl: shadowImage,
        shadowSize: shadowSize,
        shadowAnchor: shadowAnchor
    })
    marker.setIcon(PokestopIcon)

    if (isNotifyPokestop) {
        marker.setZIndexOffset(pokestopNotifiedZIndex)
    } else if (isInvadedPokestop(pokestop)) {
        marker.setZIndexOffset(pokestopInvasionZIndex)
    } else if (isLuredPokestop(pokestop)) {
        marker.setZIndexOffset(pokestopLureZIndex)
    } else if (shadowImage !== null) {
        marker.setZIndexOffset(pokestopQuestZIndex)
    } else {
        marker.setZIndexOffset(pokestopZIndex)
    }


    if (Store.get('bouncePokestops') && isNotifyPokestop && !notifiedPokestopData[pokestop.pokestop_id].animationDisabled && !marker.isBouncing()) {
        marker.bounce()
    } else if (marker.isBouncing() && (!Store.get('bouncePokestops') || !isNotifyPokestop)) {
        marker.stopBouncing()
    }

    if (isNotifyPokestop && markers.hasLayer(marker)) {
        // Marker in wrong layer, move to other layer.
        markers.removeLayer(marker)
        markersNoCluster.addLayer(marker)
    } else if (!isNotifyPokestop && markersNoCluster.hasLayer(marker)) {
        // Marker in wrong layer, move to other layer.
        markersNoCluster.removeLayer(marker)
        markers.addLayer(marker)
    }

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
        opacity: 0.6,
        fillOpacity: 0.2,
        interactive: false
    }

    var circle = L.circle([item['latitude'], item['longitude']], rangeCircleOpts)
    markersNoCluster.addLayer(circle)
    return circle
}

function getSpawnpointColor(spawnpoint) {
    if (spawnpoint.spawn_time) {
        const spawnTime = moment(spawnpoint.spawn_time)
        const despawnTime = moment(spawnpoint.despawn_time)
        const now = moment()
        if (now.isBetween(spawnTime, despawnTime)) {
            return 'green'
        } else {
            return 'blue'
        }
    } else {
        return 'red'
    }
}

function setupSpawnpointMarker(spawnpoint) {
    const color = getSpawnpointColor(spawnpoint)

    var marker = L.circle([spawnpoint.latitude, spawnpoint.longitude], {
        radius: 2,
        color: color,
        fillColor: color,
        weight: 1,
        opacity: 0.7,
        fillOpacity: 0.5,
    }).bindPopup()

    marker.spawnpoint_id = spawnpoint.spawnpoint_id
    addListeners(marker, 'spawnpoint')
    markers.addLayer(marker)
    return marker
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
        const poly = L.polygon(vertices, {
            color: color,
            opacity: 0.5,
            weight: weight,
            fillOpacity: 0.0,
            interactive: false
        })
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
                showS2Cells(10, 'red', 7)
            } else {
                toastr['error'](i8ln('Zoom in more to show them.'), i8ln('Weather cells are currently hidden'))
                toastr.options = toastrOptions
            }
        }

        if (Store.get('showS2CellsLevel13')) {
            s2Level13LayerGroup.clearLayers()
            if (map.getZoom() > 10) {
                showS2Cells(13, 'black', 5)
            } else {
                toastr['error'](i8ln('Zoom in more to show them.'), i8ln('Ex trigger cells are currently hidden'))
                toastr.options = toastrOptions
            }
        }

        if (Store.get('showS2CellsLevel14')) {
            s2Level14LayerGroup.clearLayers()
            if (map.getZoom() > 11) {
                showS2Cells(14, 'yellow', 3)
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

function addListeners(marker, type) {
    marker.on('click', function () {
        switch (type) {
            case 'pokemon':
                if (mapData.pokemons[marker.encounter_id].updated) {
                    updatePokemonLabel(mapData.pokemons[marker.encounter_id], marker)
                }
                if (marker.isBouncing()) {
                    marker.stopBouncing()
                    notifiedPokemonData[marker.encounter_id].animationDisabled = true
                }
                break
            case 'gym':
                if (mapData.gyms[marker.gym_id].updated) {
                    updateGymLabel(mapData.gyms[marker.gym_id], marker)
                }
                if (marker.isBouncing()) {
                    marker.stopBouncing()
                    notifiedGymData[marker.gym_id].animationDisabled = true
                }
                break
            case 'pokestop':
                if (mapData.pokestops[marker.pokestop_id].updated) {
                    updatePokestopLabel(mapData.pokestops[marker.pokestop_id], marker)
                }
                if (marker.isBouncing()) {
                    marker.stopBouncing()
                    notifiedPokestopData[marker.pokestop_id].animationDisabled = true
                }
                break
            case 'spawnpoint':
                if (mapData.spawnpoints[marker.spawnpoint_id].updated) {
                    updateSpawnpointLabel(mapData.spawnpoints[marker.spawnpoint_id], marker)
                }
                break
        }

        marker.openPopup()
        updateLabelDiffTime()
        marker.options.persist = true
    })

    if (!isMobileDevice() && !isTouchDevice()) {
        marker.on('mouseover', function (e) {
            if (marker.isPopupOpen()) {
                return true
            }

            switch (type) {
                case 'pokemon':
                    if (mapData.pokemons[marker.encounter_id].updated) {
                        updatePokemonLabel(mapData.pokemons[marker.encounter_id], marker)
                    }
                    if (marker.isBouncing()) {
                        marker.stopBouncing()
                        notifiedPokemonData[marker.encounter_id].animationDisabled = true
                    }
                    break
                case 'gym':
                    if (mapData.gyms[marker.gym_id].updated) {
                        updateGymLabel(mapData.gyms[marker.gym_id], marker)
                    }
                    if (marker.isBouncing()) {
                        marker.stopBouncing()
                        notifiedGymData[marker.gym_id].animationDisabled = true
                    }
                    break
                case 'pokestop':
                    if (mapData.pokestops[marker.pokestop_id].updated) {
                        updatePokestopLabel(mapData.pokestops[marker.pokestop_id], marker)
                    }
                    if (marker.isBouncing()) {
                        marker.stopBouncing()
                        notifiedPokestopData[marker.pokestop_id].animationDisabled = true
                    }
                    break
                case 'spawnpoint':
                    if (mapData.spawnpoints[marker.spawnpoint_id].updated) {
                        updateSpawnpointLabel(mapData.spawnpoints[marker.spawnpoint_id], marker)
                    }
                    break
            }

            marker.openPopup()
            updateLabelDiffTime()
        })
    }

    marker.on('mouseout', function (e) {
        if (!marker.options.persist) {
            marker.closePopup()
        }
    })

    marker.on('popupclose', function(e) {
        switch (type) {
            case 'pokemon':
                mapData.pokemons[marker.encounter_id].updated = false
                break
            case 'gym':
                mapData.gyms[marker.gym_id].updated = false
                break
            case 'pokestop':
                mapData.pokestops[marker.pokestop_id].updated = false
                break
            case 'spawnpoint':
                mapData.spawnpoints[marker.spawnpoint_id].updated = false
                break
        }
        marker.options.persist = false
    })

    return marker
}

function updateStaleMarkers() {
    var markerChange = false

    $.each(mapData.pokemons, function (encounterId, pokemon) {
        if (pokemon.disappear_time <= Date.now()) {
            removePokemon(pokemon)
            markerChange = true
        }
    })

    for (let id of raidids) {
        if (!isValidRaid(mapData.gyms[id].raid)) {
            mapData.gyms[id].raid = null
            processGym(id)
            raidids.delete(id)
        }
    }

    for (let id of upcomingRaidids) {
        if (isOngoingRaid(mapData.gyms[id].raid)) {
            processGym(id)
            upcomingRaidids.delete(id)
        }
    }

    for (let id of invadedPokestopIds) {
        if (!isInvadedPokestop(mapData.pokestops[id])) {
            processPokestop(id)
            invadedPokestopIds.delete(id)
        }
    }

    for (let id of luredPokestopIds) {
        if (!isLuredPokestop(mapData.pokestops[id])) {
            processPokestop(id)
            luredPokestopIds.delete(id)
            markerChange = true
        }
    }

    $.each(mapData.spawnpoints, function (id, spawnpoint) {
        if (spawnpoint.spawn_time) {
            const now = Date.now()
            if (spawnpoint.despawn_time < now) {
                const diffhours = Math.ceil((now - spawnpoint.despawn_time) / 3600000)
                mapData.spawnpoints[id].spawn_time += diffhours * 3600000
                mapData.spawnpoints[id].despawn_time += diffhours * 3600000
            }
            if ((spawnpoint.marker.options.color === 'green' && !nowIsBetween(mapData.spawnpoints[id].spawn_time, mapData.spawnpoints[id].despawn_time)) ||
                    spawnpoint.marker.options.color === 'blue' && nowIsBetween(mapData.spawnpoints[id].spawn_time, mapData.spawnpoints[id].despawn_time)) {
                // Spawn point became active/inactive, update it.
                processSpawnpoint(id)
            }
        }
    })

    $.each(mapData.scanned, function (key, scanned) {
        // Remove if older than 15 minutes.
        if (scanned.last_modified < (new Date().getTime() - 15 * 60 * 1000)) {
            markersNoCluster.removeLayer(scanned.marker)
            delete mapData.scanned[key]
        }
    })

    if ($('#stats').hasClass('visible') && markerChange) {
        // Update stats sidebar.
        countMarkers(map)
    }
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

function isPokemonRarityExcluded(pokemon) {
    if (showConfig.rarity) {
        const pokemonRarity = getPokemonRarity(pokemon.pokemon_id)
        if (!settings.includedRarities.includes(pokemonRarity)) {
            return true
        }
    }

    return false
}

function isPokemonMeetsFilters(pokemon, isNotifyPokemon) {
    if (!settings.showPokemon) {
        return false
    }

    if (Store.get('showNotifiedPokemonAlways') && isNotifyPokemon) {
        return true
    }

    if (getExcludedPokemon().includes(pokemon.pokemon_id) || isPokemonRarityExcluded(pokemon) || (Store.get('showNotifiedPokemonOnly') && !isNotifyPokemon)) {
        return false
    }

    if (settings.showPokemonValues && settings.filterValues) {
        if (pokemon.individual_attack !== null) {
            const ivsPercentage = getIvsPercentage(pokemon)
            if (ivsPercentage < settings.minIvs && !(settings.showZeroIvsPokemon && ivsPercentage === 0)) {
                return false
            }
            if (ivsPercentage > settings.maxIvs) {
                return false
            }

            const level = getPokemonLevel(pokemon)
            if (level < settings.minLevel || level > settings.maxLevel) {
                return false
            }
        } else {
            // Pokemon is not encountered.
            return false
        }
    }

    return true
}

function isGymMeetsGymFilters(gym) {
    if (!settings.showGyms) {
        return false
    }

    if (showConfig.gym_filters) {
        if ($gymNameFilter) {
            const gymRegex = new RegExp($gymNameFilter, 'gi')
            if (!gym.name.match(gymRegex)) {
                return false
            }
        }

        if (!settings.includedGymTeams.includes(gym.team_id)) {
            return false
        }

        const gymLevel = getGymLevel(gym)
        if (gymLevel < settings.minGymLevel || gymLevel > settings.maxGymLevel) {
            return false
        }

        if (settings.showOpenSpotGymsOnly && gym.slots_available === 0) {
            return false
        }

        if (settings.showExGymsOnly && !gym.is_ex_raid_eligible) {
            return false
        }

        if (settings.showInBattleGymsOnly && !gym.is_in_battle) {
            return false
        }

        if (settings.gymLastScannedHours > 0 && gym.last_scanned < Date.now() - settings.gymLastScannedHours * 3600 * 1000) {
            return false
        }
    }

    return true
}

function isGymMeetsRaidFilters(gym) {
    const raid = gym.raid

    if (!settings.showRaids || !isValidRaid(raid)) {
        return false
    }

    if (showConfig.raid_filters) {
        if ($gymNameFilter) {
            const gymRegex = new RegExp($gymNameFilter, 'gi')
            if (!gym.name.match(gymRegex)) {
                return false
            }
        }

        if (isUpcomingRaid(raid)) {
            if (settings.showActiveRaidsOnly) {
                return false
            }
        } else { // Ongoing raid.
            if (raid.pokemon_id && settings.excludedRaidPokemon.includes(raid.pokemon_id)) {
                return false
            }
        }

        if (!settings.includedRaidLevels.includes(raid.level)) {
            return false
        }

        if (settings.showExEligibleRaidsOnly && !gym.is_ex_raid_eligible) {
            return false
        }
    }

    return true
}

function isGymMeetsFilters(gym) {
    return isGymMeetsGymFilters(gym) || isGymMeetsRaidFilters(gym)
}

function isPokestopMeetsQuestFilters(pokestop) {
    if (settings.showQuests && pokestop.quest !== null) {
        switch (pokestop.quest.reward_type) {
            case 2:
                return includedQuestItems.includes(parseInt(pokestop.quest.item_id))
            case 3:
                return includedQuestItems.includes(6)
            case 7:
                return !settings.excludedQuestPokemon.includes(parseInt(pokestop.quest.pokemon_id))
        }
    }

    return false
}

function isPokestopMeetsInvasionFilters(pokestop) {
    return settings.showInvasions && isInvadedPokestop(pokestop) && includedInvasions.includes(pokestop.incident_grunt_type)
}

function isPokestopMeetsLureFilters(pokestop) {
    if (isLuredPokestop(pokestop)) {
        switch (pokestop.active_fort_modifier) {
            case ActiveFortModifierEnum.normal:
                return Store.get('showNormalLures')
            case ActiveFortModifierEnum.glacial:
                return Store.get('showGlacialLures')
            case ActiveFortModifierEnum.magnetic:
                return Store.get('showMagneticLures')
            case ActiveFortModifierEnum.mossy:
                return Store.get('showMossyLures')
        }
    }

    return false
}

function isPokestopMeetsFilters(pokestop) {
    const pokestopRegexp = new RegExp($pokestopNameFilter, 'gi')
    return settings.showPokestops && ($pokestopNameFilter && pokestop.name ? pokestop.name.match(pokestopRegexp) : !$pokestopNameFilter || pokestop.name) &&
        (settings.showPokestopsNoEvent || isPokestopMeetsQuestFilters(pokestop) || isPokestopMeetsInvasionFilters(pokestop) || isPokestopMeetsLureFilters(pokestop))
}

function isNotifyPokemon(pokemon) {
    if (Store.get('notifyPokemon')) {
        if (notifyPokemon.includes(pokemon.pokemon_id)) {
            return true
        }

        if (pokemon.individual_attack !== null && settings.showPokemonValues) {
            const notifyIvsPercentage = Store.get('notifyIvsPercentage')
            if (notifyIvsPercentage > 0) {
                const ivsPercentage = getIvsPercentage(pokemon)
                if (ivsPercentage >= notifyIvsPercentage) {
                    return true
                }
            }

            const notifyLevel = Store.get('notifyLevel')
            if (notifyLevel > 0) {
                const level = getPokemonLevel(pokemon)
                if (level >= notifyLevel) {
                    return true
                }
            }

            if (showConfig.medalpokemon) {
                if (Store.get('notifyTinyRattata') && pokemon.pokemon_id === 19) {
                    const baseHeight = 0.30
                    const baseWeight = 3.50
                    const ratio = sizeRatio(pokemon.height, pokemon.weight, baseHeight, baseWeight)
                    if (ratio < 1.5) {
                        return true
                    }
                }
                if (Store.get('notifyBigMagikarp') && pokemon.pokemon_id === 129) {
                    const baseHeight = 0.90
                    const baseWeight = 10.00
                    const ratio = sizeRatio(pokemon.height, pokemon.weight, baseHeight, baseWeight)
                    if (ratio > 2.5) {
                        return true
                    }
                }
            }

            if (showConfig.rarity) {
                const pokemonRarity = getPokemonRarity(pokemon.pokemon_id)
                const notifyRarities = Store.get('notifyRarities')
                if (notifyRarities.includes(pokemonRarity)) {
                    return true
                }
            }
        }
    }

    return false
}

function hasSentPokemonNotification(pokemon) {
    const id = pokemon.encounter_id
    return notifiedPokemonData.hasOwnProperty(id) && pokemon.disappear_time === notifiedPokemonData[id].disappear_time &&
        pokemon.cp_multiplier === notifiedPokemonData[id].cp_multiplier && pokemon.individual_attack === notifiedPokemonData[id].individual_attack &&
        pokemon.individual_defense === notifiedPokemonData[id].individual_defense && pokemon.individual_stamina === notifiedPokemonData[id].individual_stamina &&
        pokemon.weight === notifiedPokemonData[id].weight && pokemon.height === notifiedPokemonData[id].height
}

function getGymNotificationInfo(gym) {
    var isEggNotifyGym = false
    var isRaidPokemonNotifyGym = false
    var isNewNotifyGym = false
    if (Store.get('notifyGyms') && isGymMeetsRaidFilters(gym)) {
        const id = gym.gym_id
        if (isUpcomingRaid(gym.raid) && notifyEggs.includes(gym.raid.level)) {
            isEggNotifyGym = true
            isNewNotifyGym = !notifiedGymData.hasOwnProperty(id) || !notifiedGymData[id].hasSentEggNotification || gym.raid.end > notifiedGymData[id].raidEnd
        } else if (isOngoingRaid(gym.raid) && notifyRaidPokemon.includes(gym.raid.pokemon_id)) {
            isRaidPokemonNotifyGym = true
            isNewNotifyGym = !notifiedGymData.hasOwnProperty(id) || !notifiedGymData[id].hasSentRaidPokemonNotification || gym.raid.end > notifiedGymData[id].raidEnd
        }
    }

    return {
        'isEggNotifyGym': isEggNotifyGym,
        'isRaidPokemonNotifyGym': isRaidPokemonNotifyGym,
        'isNewNotifyGym': isNewNotifyGym
    }
}

function getPokestopNotificationInfo(pokestop) {
    var isInvasionNotifyPokestop = false
    var isLureNotifyPokestop = false
    var isNewNotifyPokestop = false
    if (Store.get('notifyPokestops')) {
        const id = pokestop.pokestop_id
        if (isPokestopMeetsInvasionFilters(pokestop) && notifyInvasions.includes(pokestop.incident_grunt_type)) {
            isInvasionNotifyPokestop = true
        }
        if (isPokestopMeetsLureFilters(pokestop)) {
            switch (pokestop.active_fort_modifier) {
                case ActiveFortModifierEnum.normal:
                    isLureNotifyPokestop = Store.get('notifyNormalLures')
                    break
                case ActiveFortModifierEnum.glacial:
                    isLureNotifyPokestop = Store.get('notifyGlacialLures')
                    break
                case ActiveFortModifierEnum.magnetic:
                    isLureNotifyPokestop = Store.get('notifyMagneticLures')
                    break
                case ActiveFortModifierEnum.mossy:
                    isLureNotifyPokestop = Store.get('notifyMossyLures')
                    break
            }
        }

        isNewNotifyPokestop = !notifiedPokestopData.hasOwnProperty(id) ||
            (isInvasionNotifyPokestop && (!notifiedPokestopData[id].hasSentInvasionNotification || pokestop.incident_expiration > notifiedPokestopData[id].invasionEnd)) ||
            (isLureNotifyPokestop && (!notifiedPokestopData[id].hasSentLureNotification || pokestop.lure_expiration > notifiedPokestopData[id].lureEnd))
    }

    return {
        'isInvasionNotifyPokestop': isInvasionNotifyPokestop,
        'isLureNotifyPokestop': isLureNotifyPokestop,
        'isNewNotifyPokestop': isNewNotifyPokestop
    }
}

function removePokemon(pokemon) {
    const id = pokemon.encounter_id
    if (mapData.pokemons.hasOwnProperty(id)) {
        const marker = mapData.pokemons[id].marker
        if (marker.rangeCircle != null) {
            if (markers.hasLayer(marker.rangeCircle)) {
                markers.removeLayer(marker.rangeCircle)
            } else {
                markersNoCluster.removeLayer(marker.rangeCircle)
            }
        }

        if (markers.hasLayer(marker)) {
            markers.removeLayer(marker)
        } else {
            markersNoCluster.removeLayer(marker)
        }

        delete mapData.pokemons[id]
    }
}

function removePokemonMarker(id) { // eslint-disable-line no-unused-vars
    const marker = mapData.pokemons[id].marker
    if (marker.rangeCircle != null) {
        if (markers.hasLayer(marker.rangeCircle)) {
            markers.removeLayer(marker.rangeCircle)
        } else {
            markersNoCluster.removeLayer(marker.rangeCircle)
        }
        delete mapData.pokemons[id].marker.rangeCircle
    }

    if (markers.hasLayer(marker)) {
        markers.removeLayer(marker)
    } else {
        markersNoCluster.removeLayer(marker)
    }
}

function removeGym(gym) {
    const id = gym.gym_id
    if (mapData.gyms.hasOwnProperty(id)) {
        const marker = mapData.gyms[id].marker
        if (marker.rangeCircle != null) {
            if (markers.hasLayer(marker.rangeCircle)) {
                markers.removeLayer(marker.rangeCircle)
            } else {
                markersNoCluster.removeLayer(marker.rangeCircle)
            }
        }

        if (markers.hasLayer(marker)) {
            markers.removeLayer(marker)
        } else {
            markersNoCluster.removeLayer(marker)
        }

        delete mapData.gyms[id]

        if (raidids.has(id)) {
            raidids.delete(id)
        }
        if (upcomingRaidids.has(id)) {
            upcomingRaidids.delete(id)
        }
    }
}

function removePokestop(pokestop) {
    const id = pokestop.pokestop_id
    if (mapData.pokestops.hasOwnProperty(id)) {
        const marker = mapData.pokestops[id].marker
        if (marker.rangeCircle != null) {
            if (markers.hasLayer(marker.rangeCircle)) {
                markers.removeLayer(marker.rangeCircle)
            } else {
                markersNoCluster.removeLayer(marker.rangeCircle)
            }
        }

        if (markers.hasLayer(marker)) {
            markers.removeLayer(marker)
        } else {
            markersNoCluster.removeLayer(marker)
        }

        delete mapData.pokestops[id]

        if (invadedPokestopIds.has(id)) {
            invadedPokestopIds.delete(id)
        }
        if (luredPokestopIds.has(id)) {
            luredPokestopIds.delete(id)
        }
    }
}

function removeSpawnpoint(spawnpoint) {
    const id = spawnpoint.spawnpoint_id
    if (mapData.spawnpoints.hasOwnProperty(id)) {
        const marker = mapData.spawnpoints[id].marker
        if (marker.rangeCircle != null) {
            if (markers.hasLayer(marker.rangeCircle)) {
                markers.removeLayer(marker.rangeCircle)
            } else {
                markersNoCluster.removeLayer(marker.rangeCircle)
            }
        }

        if (markers.hasLayer(marker)) {
            markers.removeLayer(marker)
        } else {
            markersNoCluster.removeLayer(marker)
        }

        delete mapData.spawnpoints[id]
    }
}

function processPokemon(id, pokemon = null) { // id is encounter_id.
    if (id === null || id === undefined) {
        return false
    }

    if (pokemon !== null) {
        if (!mapData.pokemons.hasOwnProperty(id)) {
            // New pokemon, add marker to map and item to dict.
            const isNotifyPoke = isNotifyPokemon(pokemon)
            if (!isPokemonMeetsFilters(pokemon, isNotifyPoke) || pokemon.disappear_time <= Date.now() + 3000) {
                if (isPokemonRarityExcluded(pokemon)) {
                    excludedPokemonByRarity.push(pokemon.pokemon_id)
                }
                return true
            }

            if (isNotifyPoke && !hasSentPokemonNotification(pokemon)) {
                sendPokemonNotification(pokemon)
            }

            pokemon.marker = setupPokemonMarker(pokemon, markers)
            customizePokemonMarker(pokemon, pokemon.marker, isNotifyPoke)
            pokemon.updated = true
            mapData.pokemons[id] = pokemon
        } else {
            // Existing pokemon, update marker and dict item if necessary.
            const isNotifyPoke = isNotifyPokemon(pokemon)
            if (!isPokemonMeetsFilters(pokemon, isNotifyPoke)) {
                if (isPokemonRarityExcluded(pokemon)) {
                    excludedPokemonByRarity.push(pokemon.pokemon_id)
                }
                removePokemon(pokemon)
                return true
            }

            const oldPokemon = mapData.pokemons[id]
            if (pokemon.pokemon_id !== oldPokemon.pokemon_id || pokemon.disappear_time !== oldPokemon.disappear_time ||
                    pokemon.cp_multiplier !== oldPokemon.cp_multiplier || pokemon.individual_attack !== oldPokemon.individual_attack ||
                    pokemon.individual_defense !== oldPokemon.individual_defense || pokemon.individual_stamina !== oldPokemon.individual_stamina ||
                    pokemon.weight !== oldPokemon.weight || pokemon.height !== oldPokemon.height) {
                if (isNotifyPoke && !hasSentPokemonNotification(pokemon)) {
                    sendPokemonNotification(pokemon)
                }

                pokemon.marker = updatePokemonMarker(pokemon, mapData.pokemons[id].marker, isNotifyPoke)
                if (pokemon.marker.isPopupOpen()) {
                    updatePokemonLabel(pokemon, pokemon.marker)
                } else {
                    // Make sure label is updated next time it's opened.
                    pokemon.updated = true
                }

                mapData.pokemons[id] = pokemon
            }
        }
    } else {
        if (!mapData.pokemons.hasOwnProperty(id)) {
            return true
        }

        const isNotifyPoke = isNotifyPokemon(mapData.pokemons[id])
        if (!isPokemonMeetsFilters(mapData.pokemons[id], isNotifyPoke)) {
            if (isPokemonRarityExcluded(mapData.pokemons[id])) {
                excludedPokemonByRarity.push(mapData.pokemons[id].pokemon_id)
            }
            removePokemon(mapData.pokemons[id])
            return true
        }

        if (isNotifyPoke && !hasSentPokemonNotification(mapData.pokemons[id])) {
            sendPokemonNotification(mapData.pokemons[id])
        }

        updatePokemonMarker(mapData.pokemons[id], mapData.pokemons[id].marker, isNotifyPoke)
        if (mapData.pokemons[id].marker.isPopupOpen()) {
            updatePokemonLabel(mapData.pokemons[id],  mapData.pokemons[id].marker)
        } else {
            // Make sure label is updated next time it's opened.
             mapData.pokemons[id].updated = true
        }
    }
}

function reprocessPokemons(pokemonIds = [], encounteredOnly = false) {
    if (pokemonIds.length > 0 && encounteredOnly) {
        $.each(mapData.pokemons, function (encounterId, pokemon) {
            if (pokemonIds.includes(pokemon.pokemon_id) && pokemon.individual_attack !== null) {
                processPokemon(encounterId)
            }
        })
    } else if (pokemonIds.length > 0) {
        $.each(mapData.pokemons, function (encounterId, pokemon) {
            if (pokemonIds.includes(pokemon.pokemon_id)) {
                processPokemon(encounterId)
            }
        })
    } else if (encounteredOnly) {
        $.each(mapData.pokemons, function (encounterId, pokemon) {
            if (pokemon.individual_attack !== null) {
                processPokemon(encounterId)
            }
        })
    } else {
        $.each(mapData.pokemons, function (encounterId, pokemon) {
            processPokemon(encounterId)
        })
    }

    if ($('#stats').hasClass('visible')) {
        // Update stats sidebar.
        countMarkers(map)
    }
}

function processGym(id, gym = null) {
    if (id === null || id === undefined) {
        return false
    }

    if (gym !== null) {
        if (!mapData.gyms.hasOwnProperty(id)) {
            // New gym, add marker to map and item to dict.
            if (!isGymMeetsFilters(gym)) {
                return true
            }

            const {isEggNotifyGym, isRaidPokemonNotifyGym, isNewNotifyGym} = getGymNotificationInfo(gym)
            if (isNewNotifyGym) {
                sendGymNotification(gym, isEggNotifyGym, isRaidPokemonNotifyGym)
            }

            gym.marker = setupGymMarker(gym, isEggNotifyGym || isRaidPokemonNotifyGym)
            gym.updated = true
            mapData.gyms[id] = gym

            if (isValidRaid(gym.raid)) {
                raidids.add(id)
                if (isUpcomingRaid(gym.raid) && gym.raid.pokemon_id !== null) {
                    upcomingRaidids.add(id)
                }
            }
        } else {
            // Existing gym, update marker and dict item if necessary.
            if (!isGymMeetsFilters(gym)) {
                removeGym(gym)
                return true
            }

            const oldGym = mapData.gyms[id]

            var hasNewRaid = false
            var hasNewUpComingRaid = false
            var hasNewOngoingRaid = false
            if (isValidRaid(gym.raid)) {
                const isNewRaidPokemon = gym.raid.pokemon_id !== null && (oldGym.raid === null || oldGym.raid.pokemon_id === null)
                hasNewRaid = oldGym.raid === null
                hasNewUpComingRaid = isUpcomingRaid(gym.raid) && isNewRaidPokemon
                hasNewOngoingRaid = isOngoingRaid(gym.raid) && isNewRaidPokemon
            }

            if (gym.last_modified > oldGym.last_modified || hasNewRaid || hasNewOngoingRaid || gym.is_in_battle !== oldGym.is_in_battle) {
                // Visual change, send notification if necessary and update marker.
                const {isEggNotifyGym, isRaidPokemonNotifyGym, isNewNotifyGym} = getGymNotificationInfo(gym)
                if (isNewNotifyGym) {
                    sendGymNotification(gym, isEggNotifyGym, isRaidPokemonNotifyGym)
                }

                gym.marker = updateGymMarker(gym, oldGym.marker, isEggNotifyGym || isRaidPokemonNotifyGym)
            } else {
                gym.marker = oldGym.marker
            }

            if (gym.marker.isPopupOpen()) {
                updateGymLabel(gym, gym.marker)
            } else {
                // Make sure label is updated next time it's opened.
                gym.updated = true
            }

            mapData.gyms[id] = gym

            if (hasNewRaid) {
                raidids.add(id)
            }
            if (hasNewUpComingRaid) {
                upcomingRaidids.add(id)
            }
        }
    } else {
        if (!mapData.gyms.hasOwnProperty(id)) {
            return true
        }

        if (!isGymMeetsFilters(mapData.gyms[id])) {
            removeGym(mapData.gyms[id])
            return true
        }

        const {isEggNotifyGym, isRaidPokemonNotifyGym, isNewNotifyGym} = getGymNotificationInfo(mapData.gyms[id])
        if (isNewNotifyGym) {
            sendGymNotification(mapData.gyms[id], isEggNotifyGym, isRaidPokemonNotifyGym)
        }

        updateGymMarker(mapData.gyms[id], mapData.gyms[id].marker, isEggNotifyGym || isRaidPokemonNotifyGym)

        if (mapData.gyms[id].marker.isPopupOpen()) {
            updateGymLabel(mapData.gyms[id], mapData.gyms[id].marker)
        } else {
            // Make sure label is updated next time it's opened.
            mapData.gyms[id].updated = true
        }
    }
}

function reprocessGyms() {
    $.each(mapData.gyms, function (id, gym) {
        processGym(id)
    })

    if ($('#stats').hasClass('visible')) {
        countMarkers(map)
    }
}

function processPokestop(id, pokestop = null) {
    if (id === null || id === undefined) {
        return false
    }

    if (pokestop !== null) {
        if (!mapData.pokestops.hasOwnProperty(id)) {
            // New pokestop, add marker to map and item to dict.
            if (!isPokestopMeetsFilters(pokestop)) {
                return true
            }

            const {isInvasionNotifyPokestop, isLureNotifyPokestop, isNewNotifyPokestop} = getPokestopNotificationInfo(pokestop)
            if (isNewNotifyPokestop) {
                sendPokestopNotification(pokestop, isInvasionNotifyPokestop, isLureNotifyPokestop)
            }

            pokestop.marker = setupPokestopMarker(pokestop, isInvasionNotifyPokestop || isLureNotifyPokestop)
            pokestop.updated = true
        } else {
            // Existing pokestop, update marker and dict item if necessary.
            if (!isPokestopMeetsFilters(pokestop)) {
                removePokestop(pokestop)
                return true
            }

            const oldPokestop = mapData.pokestops[id]

            const newInvasion = !isInvadedPokestop(oldPokestop) && isInvadedPokestop(pokestop)
            const newLure = !isLuredPokestop(oldPokestop) && isLuredPokestop(pokestop)
            const questChange = JSON.stringify(oldPokestop.quest) !== JSON.stringify(pokestop.quest)
            if (newInvasion || newLure || questChange) {
                const {isInvasionNotifyPokestop, isLureNotifyPokestop, isNewNotifyPokestop} = getPokestopNotificationInfo(pokestop)
                if (isNewNotifyPokestop) {
                    sendPokestopNotification(pokestop, isInvasionNotifyPokestop, isLureNotifyPokestop)
                }

                pokestop.marker = updatePokestopMarker(pokestop, oldPokestop.marker, isInvasionNotifyPokestop || isLureNotifyPokestop)
            } else {
                pokestop.marker = oldPokestop.marker
            }

            if (pokestop.marker.isPopupOpen()) {
                updatePokestopLabel(pokestop, pokestop.marker)
            } else {
                // Make sure label is updated next time it's opened.
                pokestop.updated = true
            }
        }

        mapData.pokestops[id] = pokestop

        if (isInvadedPokestop(pokestop)) {
            invadedPokestopIds.add(id)
        }
        if (isLuredPokestop(pokestop)) {
            luredPokestopIds.add(id)
        }
    } else {
        if (!mapData.pokestops.hasOwnProperty(id)) {
            return true
        }

        if (!isPokestopMeetsFilters(mapData.pokestops[id])) {
            removePokestop(mapData.pokestops[id])
            return true
        }

        const {isInvasionNotifyPokestop, isLureNotifyPokestop, isNewNotifyPokestop} = getPokestopNotificationInfo(mapData.pokestops[id])
        if (isNewNotifyPokestop) {
            sendPokestopNotification(mapData.pokestops[id], isInvasionNotifyPokestop, isLureNotifyPokestop)
        }

        updatePokestopMarker(mapData.pokestops[id], mapData.pokestops[id].marker, isInvasionNotifyPokestop || isLureNotifyPokestop)

        if (mapData.pokestops[id].marker.isPopupOpen()) {
            updatePokestopLabel(mapData.pokestops[id], mapData.pokestops[id].marker)
        } else {
            // Make sure label is updated next time it's opened.
            mapData.pokestops[id].updated = true
        }
    }
}

function reprocessPokestops() {
    $.each(mapData.pokestops, function (id, pokestop) {
        processPokestop(id)
    })

    if ($('#stats').hasClass('visible')) {
        countMarkers(map)
    }
}

function processSpawnpoint(id, spawnpoint = null) {
    if (id === null || id === undefined) {
        return false
    }

    if (!Store.get('showSpawnpoints')) {
        if (mapData.spawnpoints.hasOwnProperty(id)) {
            removeSpawnpoint(mapData.spawnpoints[id])
        }
        return true
    }

    if (spawnpoint !== null) {
        if (!mapData.spawnpoints.hasOwnProperty(id)) {
            // New spawnpoint, add marker to map and item to dict.
            spawnpoint.marker = setupSpawnpointMarker(spawnpoint)
            spawnpoint.updated = true
            mapData.spawnpoints[id] = spawnpoint
        } else {
            // Existing spawnpoint, update marker and dict item if necessary.
            if (spawnpoint.spawn_time !== mapData.spawnpoints[id].spawn_time) {
                const color = getSpawnpointColor(spawnpoint)
                mapData.spawnpoints[id].marker.setStyle({color: color, fillColor: color})
                mapData.spawnpoints[id].spawn_time = spawnpoint.spawn_time
                mapData.spawnpoints[id].despawn_time = spawnpoint.despawn_time
            }
            if (mapData.spawnpoints[id].marker.isPopupOpen()) {
                updateSpawnpointLabel(mapData.spawnpoints[id], mapData.spawnpoints[id].marker)
            } else {
                // Make sure label is updated next time it's opened.
                mapData.spawnpoints[id].updated = true
            }
            mapData.spawnpoints[id].last_non_scanned = spawnpoint.last_non_scanned
            mapData.spawnpoints[id].last_scanned = spawnpoint.last_scanned
        }
    } else if (mapData.spawnpoints.hasOwnProperty(id)) {
        // Update marker and popup.
        const color = getSpawnpointColor(mapData.spawnpoints[id])
        mapData.spawnpoints[id].marker.setStyle({color: color, fillColor: color})
        if (mapData.spawnpoints[id].marker.isPopupOpen()) {
            updateSpawnpointLabel(mapData.spawnpoints[id], mapData.spawnpoints[id].marker)
        } else {
            // Make sure label is updated next time it's opened.
            mapData.spawnpoints[id].updated = true
        }
    }
}

function reprocessSpawnpoints() {
    $.each(mapData.spawnpoints, function (spawnpointId, spawnpoint) {
        processSpawnpoint(spawnpointId)
    })
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

function loadRawData() {
    var userAuthCode = localStorage.getItem('userAuthCode')
    var loadPokemon = settings.showPokemon
    var loadGyms = settings.showGyms
    var loadRaids = settings.showRaids
    var loadPokestops = settings.showPokestops
    var loadPokestopsNoEvent = settings.showPokestopsNoEvent
    var loadQuests = settings.showQuests
    var loadInvasions = settings.showInvasions
    var loadLures = Store.get('showNormalLures') || Store.get('showGlacialLures') || Store.get('showMagneticLures') || Store.get('showMossyLures')
    var loadScanned = Store.get('showScanned')
    var loadSpawnpoints = Store.get('showSpawnpoints')
    var loadWeather = Store.get('showWeatherCells')
    var loadWeatherAlerts = Store.get('showWeatherAlerts')
    var prionotifyactiv = Store.get('showNotifiedPokemonAlways')

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
            'raids': loadRaids,
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
            'reids': String(isShowAllZoom() ? settings.excludedPokemon : reincludedPokemon),
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

function updateMap() {
    loadRawData().done(function (result) {
        $.each(result.pokemons, function (i, pokemon) {
            processPokemon(pokemon.encounter_id, pokemon)
        })
        $.each(result.gyms, processGym)
        $.each(result.pokestops, processPokestop)
        $.each(result.spawnpoints, function (i, spawnpoint) {
            processSpawnpoint(spawnpoint.spawnpoint_id, spawnpoint)
        })
        $.each(result.scanned, processScanned)
        //$.each(result.weather, processWeather)
        //processWeatherAlerts(result.weatherAlerts)
        //updateMainCellWeather()
        showInBoundsMarkers(mapData.lurePokemons, 'pokemon')
        showInBoundsMarkers(mapData.gyms, 'gym')
        showInBoundsMarkers(mapData.pokestops, 'pokestop')
        showInBoundsMarkers(mapData.scanned, 'scanned')
        showInBoundsMarkers(mapData.spawnpoints, 'inbound')
        showInBoundsMarkers(mapData.weather, 'weather')
        showInBoundsMarkers(mapData.weatherAlerts, 's2cell')

        // TODO: maybe move this to updateStaleMarkers
        updateScanned()

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

function getAllParks() {
    if (showConfig.ex_parks) {
        $.getJSON('static/data/parks/' + exParksFileName + '.json').done(function (response) {
            if (!response || !('parks' in response)) {
                return
            }

            mapData.exParks = response.parks.map(parkPoints => parkPoints.map(point => L.latLng(point[0], point[1])))

            if (settings.showExParks) {
                updateParks()
            }
        }).fail(function () {
            console.error("Couldn't load ex parks JSON file.")
        })
    }

    if (showConfig.nest_parks) {
        $.getJSON('static/data/parks/' + nestParksFileName + '.json').done(function (response) {
            if (!response || !('parks' in response)) {
                return
            }

            mapData.nestParks = response.parks.map(parkPoints => parkPoints.map(point => L.latLng(point[0], point[1])))

            if (settings.showNestParks) {
                updateParks()
            }
        }).fail(function () {
            console.error("Couldn't load nest parks JSON file.")
        })
    }
}

function updateParks() {
    if (settings.showExParks) {
        const inBoundParks = mapData.exParks.filter(parkPoints => {
            return parkPoints.some(point => {
                return map.getBounds().contains(point)
            })
        })

        exParksLayerGroup.clearLayers()

        inBoundParks.forEach(function (park) {
            L.polygon(park, {color: 'black', interactive: false}).addTo(exParksLayerGroup)
        })
    }

    if (settings.showNestParks) {
        const inBoundParks = mapData.nestParks.filter(parkPoints => {
            return parkPoints.some(point => {
                return map.getBounds().contains(point)
            })
        })

        nestParksLayerGroup.clearLayers()

        inBoundParks.forEach(function (park) {
            L.polygon(park, {color: 'limegreen', interactive: false}).addTo(nestParksLayerGroup)
        })
    }
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

function sendPokemonNotification(pokemon) {
    playPokemonSound(pokemon.pokemon_id, cryFileTypes)

    if (Store.get('showPopups')) {
        var notifyTitle = pokemon.pokemon_name
        var notifyText = ''

        const formName = pokemon.form ? getFormName(pokemon.pokemon_id, pokemon.form) : false
        if (formName) {
            notifyTitle += ` (${formName})`
        }

        let expireTime = timestampToTime(pokemon.disappear_time)
        let timeUntil = getTimeUntil(pokemon.disappear_time)
        let expireTimeCountdown = timeUntil.hour > 0 ? timeUntil.hour + 'h' : ''
        expireTimeCountdown += `${lpad(timeUntil.min, 2, 0)}m${lpad(timeUntil.sec, 2, 0)}s`

        notifyText = `Disappears at ${expireTime} (${expireTimeCountdown})`

        if (settings.showPokemonValues && pokemon.individual_attack !== null) {
            notifyTitle += ` ${getIvsPercentage(pokemon)}% (${pokemon.individual_attack}/${pokemon.individual_defense}/${pokemon.individual_stamina}) L${getPokemonLevel(pokemon)}`
            const move1 = getMoveName(pokemon.move_1)
            const move2 = getMoveName(pokemon.move_2)
            notifyText += `\nMoves: ${move1} / ${move2}`
        }

        sendNotification(notifyTitle, notifyText, getPokemonRawIconUrl(pokemon), pokemon.latitude, pokemon.longitude)
    }

    var notificationData = {}
    notificationData.disappear_time = pokemon.disappear_time
    notificationData.individual_attack = pokemon.individual_attack
    notificationData.individual_defense = pokemon.individual_defense
    notificationData.individual_stamina = pokemon.individual_stamina
    notificationData.cp_multiplier = pokemon.cp_multiplier
    notificationData.weight = pokemon.weight
    notificationData.height = pokemon.height
    notifiedPokemonData[pokemon.encounter_id] = notificationData
}

function sendGymNotification(gym, isEggNotifyGym, isRaidPokemonNotifyGym) {
    const raid = gym.raid
    if (!isValidRaid(raid) || (!isEggNotifyGym && !isRaidPokemonNotifyGym)) {
        return
    }

    if (Store.get('playSound')) {
        audio.play()
    }

    if (Store.get('showPopups')) {
        const gymName = gym.name !== null && gym.name !== '' ? gym.name : 'unknown'
        var notifyTitle = ''
        var notifyText = ''
        var iconUrl = ''
        if (isEggNotifyGym) {
            let expireTime = timestampToTime(raid.start)
            let timeUntil = getTimeUntil(raid.start)
            let expireTimeCountdown = timeUntil.hour > 0 ? timeUntil.hour + 'h' : ''
            expireTimeCountdown += `${lpad(timeUntil.min, 2, 0)}m${lpad(timeUntil.sec, 2, 0)}s`

            notifyTitle = `Level ${raid.level} Raid`
            notifyText = `Gym: ${gymName}\nStarts at ${expireTime} (${expireTimeCountdown})`
            iconUrl = 'static/images/gym/' + raidEggImages[raid.level]
        } else {
            let expireTime = timestampToTime(raid.end)
            let timeUntil = getTimeUntil(raid.end)
            let expireTimeCountdown = timeUntil.hour > 0 ? timeUntil.hour + 'h' : ''
            expireTimeCountdown += `${lpad(timeUntil.min, 2, 0)}m${lpad(timeUntil.sec, 2, 0)}s`

            var fastMoveName = getMoveName(raid.move_1)
            var chargeMoveName = getMoveName(raid.move_2)

            var pokemonName = raid.pokemon_name
            const formName = raid.form ? getFormName(raid.pokemon_id, raid.form) : false
            if (formName) {
                pokemonName += ` (${formName})`
            }

            notifyTitle = `${pokemonName} Raid (L${raid.level})`
            notifyText = `Gym: ${gymName}\nEnds at ${expireTime} (${expireTimeCountdown})\nMoves: ${fastMoveName} / ${chargeMoveName}`
            iconUrl = getPokemonRawIconUrl(raid)
        }

        sendNotification(notifyTitle, notifyText, iconUrl, gym.latitude, gym.longitude)
    }

    var notificationData = {}
    notificationData.raidEnd = gym.raid.end
    if (isEggNotifyGym) {
        notificationData.hasSentEggNotification = true
    } else if (isRaidPokemonNotifyGym) {
        notificationData.hasSentRaidPokemonNotification = true
    }
    notifiedGymData[gym.gym_id] = notificationData
}

function sendPokestopNotification(pokestop, isInvasionNotifyPokestop, isLureNotifyPokestop) {
    if (!isInvasionNotifyPokestop && !isLureNotifyPokestop) {
        return
    }

    if (Store.get('playSound')) {
        audio.play()
    }

    if (Store.get('showPopups')) {
        const pokestopName = pokestop.name !== null && pokestop.name !== '' ? pokestop.name : 'unknown'
        var notifyTitle = ''
        var notifyText = 'PokéStop: ' + pokestopName
        if (isInvasionNotifyPokestop) {
            let expireTime = timestampToTime(pokestop.incident_expiration)
            let timeUntil = getTimeUntil(pokestop.incident_expiration)
            let expireTimeCountdown = timeUntil.hour > 0 ? timeUntil.hour + 'h' : ''
            expireTimeCountdown += `${lpad(timeUntil.min, 2, 0)}m${lpad(timeUntil.sec, 2, 0)}s`

            notifyText += `\nInvasion ends at ${expireTime} (${expireTimeCountdown})`
            notifyTitle += `${idToInvasion[pokestop.incident_grunt_type].type} (${idToInvasion[pokestop.incident_grunt_type].gruntGender}) Invasion`
        }
        if (isLureNotifyPokestop) {
            let expireTime = timestampToTime(pokestop.lure_expiration)
            let timeUntil = getTimeUntil(pokestop.lure_expiration)
            let expireTimeCountdown = timeUntil.hour > 0 ? timeUntil.hour + 'h' : ''
            expireTimeCountdown += `${lpad(timeUntil.min, 2, 0)}m${lpad(timeUntil.sec, 2, 0)}s`

            if (isInvasionNotifyPokestop) {
                notifyTitle += ' & '
            }
            notifyTitle += `${lureTypes[pokestop.active_fort_modifier]} Lure`
            notifyText += `\nLure ends at ${expireTime} (${expireTimeCountdown})`
        }

        sendNotification(notifyTitle, notifyText, getPokestopIconUrlFiltered(pokestop), pokestop.latitude, pokestop.longitude)
    }

    var notificationData = {}
    if (isInvasionNotifyPokestop) {
        notificationData.hasSentInvasionNotification = true
        notificationData.invasionEnd = pokestop.incident_expiration
    }
    if (isLureNotifyPokestop) {
        notificationData.hasSentLureNotification = true
        notificationData.lureEnd = pokestop.lure_expiration
    }
    notifiedPokestopData[pokestop.pokestop_id] = notificationData
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
    var perfectPercent = getIvsPercentage(pokemon)
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
        /*$selectStyle.select2({
            placeholder: 'Select Style',
            data: styleList,
            minimumResultsForSearch: Infinity
        })*/

        // setup the list change behavior
        $selectStyle.on('change', function (e) {
            selectedStyle = $selectStyle.val()
            setTitleLayer(selectedStyle)
            Store.set('map_style', selectedStyle)
        })

        // recall saved mapstyle
        $selectStyle.val(Store.get('map_style')).trigger('change')
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

        /*$selectSearchIconMarker.select2({
            placeholder: 'Select Icon Marker',
            data: searchMarkerStyleList,
            minimumResultsForSearch: Infinity
        })*/

        $selectSearchIconMarker.on('change', function (e) {
            var selectSearchIconMarker = $selectSearchIconMarker.val()
            Store.set('searchMarkerStyle', selectSearchIconMarker)
            setTimeout(function () { updateStartLocationMarker(selectSearchIconMarker) }, 300)
        })

        $selectSearchIconMarker.val(Store.get('searchMarkerStyle')).trigger('change')

        /*$selectLocationIconMarker.select2({
            placeholder: 'Select Location Marker',
            data: searchMarkerStyleList,
            minimumResultsForSearch: Infinity
        })*/

        $selectLocationIconMarker.on('change', function (e) {
            var locStyle = this.value
            Store.set('locationMarkerStyle', locStyle)
            setTimeout(function () { updateUserLocationMarker(locStyle) }, 300)
        })

        $selectLocationIconMarker.val(Store.get('locationMarkerStyle')).trigger('change')
    })
})

$(function () {
    moment.locale(language)

    if (Store.get('startAtUserLocation') && getParameterByName('lat') == null && getParameterByName('lon') == null) {
        centerMapOnLocation()
    }

    $selectIncludeInvasions = $('#include-invasions')
    $selectIncludeQuestItems = $('#include-quest-items')
    $selectNotifyPokemon = $('#notify-pokemon')
    $selectNotifyRaidPokemon = $('#notify-raid-pokemon')
    $selectNotifyEggs = $('#notify-eggs')
    $selectNotifyInvasions = $('#notify-invasions')

    /*$.each(questItemIds, function (key, id) {
        $('.quest-item-list').append(`<div class='quest-item-sprite' data-value='${id}'><img class='quest-item-select-icon' src='static/images/quest/reward_${id}_1.png'></div>`)
    })
    $('.quest-item-list').append(`<div class='quest-item-sprite' data-value='6'><img class='quest-item-select-icon' src='static/images/quest/reward_stardust.png'></div>`)*/

    // Load pokemon names and populate lists
    $.getJSON('static/dist/data/pokemon.min.json').done(function (data) {
        var pokemonIcon
        var typestring = []
        var pokemonIds = []

        function populateLists(id, pokemonData) {
            /*if (generateImages) {
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
            $('.pokemon-list').append('<div class=filter-button data-gen=gen' + pokemonData['gen'] + ' data-pkm=' + i8ln(pokemonData['name']) + ' data-value=' + id + ' data-type1=' + typestring[0] + ' data-type2=' + typestring[1] + '><div id=pkid_list>#' + id + '</div>' + pokemonIcon + '<div id=pkname_list>' + i8ln(pokemonData['name']) + '</div></div>')
            idToPokemon[id] = pokemonData
            pokeSearchList.push({
                value: id,
                pkm: i8ln(pokemonData['name']),
                gen: 'gen' + pokemonData['gen'],
                type1: typestring[0],
                type2: typestring[1],
                allpokemon: 'allpokemon'
            })*/
        }

        var id
        for (id = 1; id <= availablePokemonCount; id++) {
            populateLists(id, data[id])
            pokemonIds.push(id)
        }
        // Meltan and Melmetal
        populateLists(808, data[808])
        populateLists(809, data[809])
        pokemonIds.push(808)
        pokemonIds.push(809)



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



        /*$('.quest-item-select-all').on('click', function (e) {
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
            reprocessPokestops()
            lastpokestops = false
            updateMap()
            Store.set('remember_select_include_quest_items', includedQuestItems)
        })*/

        $selectNotifyPokemon.on('change', function (e) {
            const oldNotifyPokemon = notifyPokemon
            notifyPokemon = $selectNotifyPokemon.val().length > 0 ? $selectNotifyPokemon.val().split(',').map(Number) : []
            const newNotifyPokemon = notifyPokemon.filter(id => !oldNotifyPokemon.includes(id))
            const newNotNotifyPokemon = oldNotifyPokemon.filter(id => !notifyPokemon.includes(id))

            if (Store.get('showNotifiedPokemonAlways') || Store.get('showNotifiedPokemonOnly')) {
                reincludedPokemon = reincludedPokemon.concat(newNotifyPokemon)
                if (!Store.get('showNotifiedPokemonOnly')) {
                    reprocessPokemons(newNotifyPokemon)
                }
                reprocessPokemons(newNotNotifyPokemon)
            } else {
                reprocessPokemons(newNotifyPokemon.concat(newNotNotifyPokemon))
            }

            if (notifyPokemon.length === pokemonIds.length) {
                $('a[href$="#tabs_notify-10"]').text('Pokémon (All)')
            } else {
                $('a[href$="#tabs_notify-10"]').text(`Pokémon (${notifyPokemon.length})`)
            }
            Store.set('remember_select_notify_pokemon', notifyPokemon)
        })

        $selectNotifyRaidPokemon.on('change', function (e) {
            if ($selectNotifyRaidPokemon.val().length > 0) {
                notifyRaidPokemon = $selectNotifyRaidPokemon.val().split(',').map(Number).sort(function (a, b) {
                    return a - b
                })
            } else {
                notifyRaidPokemon = []
            }
            if (notifyRaidPokemon.length === pokemonIds.length) {
                $('a[href$="#tabs_notify_raid_pokemon-1"]').text('Raid Bosses (All)')
            } else {
                $('a[href$="#tabs_notify_raid_pokemon-1"]').text(`Raid Bosses (${notifyRaidPokemon.length})`)
            }
            reprocessGyms()
            Store.set('remember_select_notify_raid_pokemon', notifyRaidPokemon)
        })

        $selectNotifyEggs.on('change', function (e) {
            notifyEggs = $selectNotifyEggs.val().map(Number)
            reprocessGyms()
            Store.set('remember_select_notify_eggs', notifyEggs)
        })

        // Recall saved lists.
        $selectIncludeQuestItems.val(Store.get('remember_select_include_quest_items')).trigger('change')
        $selectNotifyPokemon.val(Store.get('remember_select_notify_pokemon')).trigger('change')
        $selectNotifyRaidPokemon.val(Store.get('remember_select_notify_raid_pokemon')).trigger('change')
        $selectNotifyEggs.val(Store.get('remember_select_notify_eggs')).trigger('change')

        /*if (isTouchDevice() && isMobileDevice()) {
            $('.select2-search input').prop('readonly', true)
        }*/
    })

    // Load invasion data and populate list.
    $.getJSON('static/dist/data/invasions.min.json').done(function (data) {
        let invasionIds = []
        for (var id in data) {
            idToInvasion[id] = data[id]
            $('.invasion-list').append(`<div class='invasion-sprite' data-value='${id}'><div id='invasion-type-list'>${idToInvasion[id].type}</div><img class='invasion-select-icon' src='static/images/invasion/${id}.png' width='32px'><div id='invasion-gender-list'>${idToInvasion[id].gruntGender} Grunt</div></div>`)
            invasionIds.push(id)
        }

        $('.invasion-list').on('click', '.invasion-sprite', function () {
            var img = $(this)
            var inputElement = $(this).parent().parent().find('input[id$=invasions]')
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

        $('.invasion-select-all').on('click', function (e) {
            e.preventDefault()
            var parent = $(this).parent().parent()
            parent.find('.invasion-list .invasion-sprite').addClass('active')
            parent.find('input[id$=invasions]').val(invasionIds.join(',')).trigger('change')
        })

        $('.invasion-deselect-all').on('click', function (e) {
            e.preventDefault()
            var parent = $(this).parent().parent()
            parent.find('.invasion-list .invasion-sprite').removeClass('active')
            parent.find('input[id$=invasions]').val('').trigger('change')
        })

        $selectIncludeInvasions.on('change', function (e) {
            if ($selectIncludeInvasions.val().length > 0) {
                includedInvasions = $selectIncludeInvasions.val().split(',').map(Number).sort(function (a, b) {
                    return a - b
                })
            } else {
                includedInvasions = []
            }
            if (includedInvasions.length === invasionIds.length) {
                $('a[href$="#tabs_invasion-1"]').text('Invasions (All)')
            } else {
                $('a[href$="#tabs_invasion-1"]').text(`Invasions (${includedInvasions.length})`)
            }
            reprocessPokestops()
            lastpokestops = false
            updateMap()
            Store.set('remember_select_include_invasions', includedInvasions)
        })

        $selectNotifyInvasions.on('change', function (e) {
            if ($selectNotifyInvasions.val().length > 0) {
                notifyInvasions = $selectNotifyInvasions.val().split(',').map(Number).sort(function (a, b) {
                    return a - b
                })
            } else {
                notifyInvasions = []
            }
            if (notifyInvasions.length === invasionIds.length) {
                $('a[href$="#tabs_notify_invasion-1"]').text('Invasions (All)')
            } else {
                $('a[href$="#tabs_notify_invasion-1"]').text(`Invasions (${notifyInvasions.length})`)
            }
            reprocessPokestops()
            Store.set('remember_select_notify_invasions', notifyInvasions)
        })

        $selectIncludeInvasions.val(Store.get('remember_select_include_invasions')).trigger('change')
        $selectNotifyInvasions.val(Store.get('remember_select_notify_invasions')).trigger('change')
    })

    // run interval timers to regularly update map, rarity and timediffs
    window.setInterval(updateLabelDiffTime, 1000)
    window.setInterval(updateMap, 2000)
    window.setInterval(updateStaleMarkers, 2500)
    if (showConfig.rarity) {
        window.setInterval(updatePokemonRarities(rarityFileName, function () {}), 300000)
    }
    window.setInterval(updateGeoLocation, 1000)

    createUpdateWorker()


    // Initialize dataTable in statistics sidebar
    //   - turn off sorting for the 'icon' column
    //   - initially sort 'name' column alphabetically

    /*$('#pokemon-table').DataTable({
        paging: false,
        searching: false,
        info: false,
        'scrollX': true,
        errMode: 'throw',
        'language': {
            'emptyTable': ''
        },
        'columns': [
            { 'orderable': false },
            null,
            null,
            null,
            null
        ]
    }).order([1, 'asc'])

    $('#gym-table').DataTable({
        paging: false,
        searching: false,
        info: false,
        'scrollX': true,
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

    $('#pokestop-table').DataTable({
        paging: false,
        searching: false,
        info: false,
        'scrollX': true,
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
    }).order([1, 'asc'])*/
})
