/* global showAllZoomLevel getS2CellBounds processWeather processWeatherAlerts getIvsPercentageCssColor getPokemonGen getPokemonRawIconUrl timestampToTime timestampToDateTime */

//
// Global map.js variables
//

var $selectNotifyPokemon
var $selectNotifyRaidPokemon
var $selectNotifyEggs
var $selectNotifyInvasions
var $selectStyle
var $selectSearchIconMarker
var $selectLocationIconMarker
var $gymNameFilter = ''
var $pokestopNameFilter = ''

var searchMarkerStyles

var settings = {
    showPokemon: null,
    excludedPokemon: null,
    showPokemonValues: null,
    filterValues: null,
    unfilteredPokemon: null,
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
    showPokestopsNoEvent: null,
    showQuests: null,
    excludedQuestPokemon: null,
    excludedQuestItems: null,
    showInvasions: null,
    showLures: null,
    includedLureTypes: null,
    excludedInvasions: null,
    showWeather: null,
    showWeatherCells: null,
    showMainWeather: null,
    showSpawnpoints: null,
    showScannedLocationsLocations: null,
    showExParks: false,
    showNestParks: false
}

var timestamp
var reincludedPokemon = []
var excludedPokemonByRarity = []

var notifyPokemon = []
var notifyRaidPokemon = []
var notifyEggs = []
var notifyInvasions = []

var notifiedPokemonData = {}
var notifiedGymData = {}
var notifiedPokestopData = {}

var luredPokestopIds = new Set()
var invadedPokestopIds = new Set()
var raidIds = new Set()
var upcomingRaidIds = new Set() // Contains only raids with known raid boss.

// var map
var mapData = {
    pokemons: {},
    gyms: {},
    pokestops: {},
    lurePokemons: {},
    weather: {},
    scannedLocs: {},
    spawnpoints: {},
    exParks: [],
    nestParks: []
}
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
var lastscannedlocs
var lastweather

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

//
// Functions
//

function isShowAllZoom() {
    return showAllZoomLevel > 0 && map.getZoom() >= showAllZoomLevel
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

    if (showConfig.invasions) {
        initInvasionData(function () {
            initInvasionFilters()
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
    $('#weather-modal').modal({
        onOpenStart: function () {
            setupWeatherModal()
        }
    })
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

    updateMainS2CellId()
    updateS2Overlay()
    getAllParks()

    map.on('moveend', function () {
        updateMainS2CellId()
        updateWeatherButton()
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
        settings.unfilteredPokemon = Store.get('unfilteredPokemon')
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
        settings.showPokestopsNoEvent = Store.get('showPokestopsNoEvent')
        settings.showQuests = showConfig.quests && Store.get('showQuests')
        settings.showInvasions = showConfig.invasions && Store.get('showInvasions')
        settings.showLures = showConfig.lures && Store.get('showLures')
    }
    if (showConfig.quests) {
        settings.excludedQuestPokemon = Store.get('excludedQuestPokemon')
        settings.excludedQuestItems = Store.get('excludedQuestItems')
    }
    if (showConfig.invasions) {
        settings.excludedInvasions = Store.get('excludedInvasions')
    }
    if (showConfig.lures) {
        settings.includedLureTypes = Store.get('includedLureTypes')
    }

    settings.showWeather = showConfig.weather && Store.get('showWeather')
    if (showConfig.weather) {
        settings.showMainWeather = Store.get('showMainWeather')
        settings.showWeatherCells = Store.get('showWeatherCells')
    }

    settings.showSpawnpoints = showConfig.spawnpoints && Store.get('showSpawnpoints')
    settings.showScannedLocations = showConfig.scanned_locs && Store.get('showScannedLocations')


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
                } else if (storageKey === 'showScannedLocations') {
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
        $('#pokemon-switch').on('change', function () {
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
                updatePokemons()
            }
            Store.set('showPokemon', this.checked)
        })
    }

    if (showConfig.pokemon_values) {
        $('#pokemon-values-switch').on('change', function () {
            settings.showPokemonValues = this.checked
            const filterValuesWrapper = $('#filter-pokemon-values-wrapper')
            if (this.checked) {
                filterValuesWrapper.show()
                updatePokemons()
            } else {
                filterValuesWrapper.hide()
                updatePokemons([], true)
                if (settings.filterValues) {
                    lastpokemon = false
                    updateMap()
                }
            }
            Store.set('showPokemonValues', this.checked)
        })

        $('#filter-values-switch').on('change', function () {
            settings.filterValues = this.checked
            const filtersWrapper = $('#pokemon-values-filters-wrapper')
            const filterButton = $('a[data-target="pokemon-values-filter-modal"]')
            if (this.checked) {
                filterButton.show()
                filtersWrapper.show()
                updatePokemons()
            } else {
                filterButton.hide()
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
                updatePokemons()
            } else {
                lastpokemon = false
                updateMap()
            }

            Store.set('minIvs', settings.minIvs)
            Store.set('maxIvs', settings.maxIvs)
        })

        $('#zero-ivs-pokemon-switch').on('change', function () {
            settings.showZeroIvsPokemon = this.checked
            if (this.checked) {
                lastpokemon = false
                updateMap()
            } else {
                updatePokemons()
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
                updatePokemons()
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
                updatePokemons()
            } else {
                // Don't set lastgyms to false since we add the reids to the request.
                updateMap()
            }
            Store.set('includedRarities', settings.includedRarities)
        })

        $('#scale-rarity-switch').on('change', function () {
            settings.scaleByRarity = this.checked
            updatePokemons()
            Store.set('scaleByRarity', this.checked)
        })
    }

    if (showConfig.gyms) {
        $('#gym-switch').on('change', function () {
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
                updateGyms()
            }
            Store.set('showGyms', this.checked)
        })
    }

    if (showConfig.gym_sidebar) {
        $('#gym-sidebar-switch').on('change', function () {
            settings.useGymSidebar = this.checked
            updateGyms()
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
            updateGyms()
            lastgyms = false
            updateMap()
        })

        $('#gym-team-select').on('change', function () {
            const oldIncludedGymTeams = settings.includedGymTeams
            settings.includedGymTeams = $(this).val().map(Number)
            if (settings.includedGymTeams.length < oldIncludedGymTeams.length) {
                updateGyms()
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
                updateGyms()
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
                updateGyms()
            } else {
                lastgyms = false
                updateMap()
            }
            Store.set('showOpenSpotGymsOnly', this.checked)
        })

        $('#gym-ex-eligible-switch').on('change', function () {
            settings.showExGymsOnly = this.checked
            if (this.checked) {
                updateGyms()
            } else {
                lastgyms = false
                updateMap()
            }
            Store.set('showExGymsOnly', this.checked)
        })

        $('#gym-in-battle-switch').on('change', function () {
            settings.showInBattleGymsOnly = this.checked
            if (this.checked) {
                updateGyms()
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
                updateGyms()
            } else {
                lastgyms = false
                updateMap()
            }
            Store.set('gymLastScannedHours', this.value)
        })
    }

    if (showConfig.raids) {
        $('#raid-switch').on('change', function () {
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
                if (settings.showGyms) {
                    updateGyms()
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
                updateGyms()
            }
            Store.set('showRaids', this.checked)
        })
    }

    if (showConfig.raid_filters) {
        $('#raid-active-switch').on('change', function () {
            settings.showActiveRaidsOnly = this.checked
            if (this.checked) {
                updateGyms()
            } else {
                if (settings.showGyms) {
                    updateGyms()
                }
                lastgyms = false
                updateMap()
            }
            Store.set('showActiveRaidsOnly', this.checked)
        })

        $('#raid-ex-eligible-switch').on('change', function () {
            settings.showExEligibleRaidsOnly = this.checked
            if (this.checked) {
                updateGyms()
            } else {
                if (settings.showGyms) {
                    updateGyms()
                }
                lastgyms = false
                updateMap()
            }
            Store.set('showExEligibleRaidsOnly', this.checked)
        })

        $('#raid-level-select').on('change', function () {
            const oldIncludedRaidLevels = settings.includedRaidLevels
            settings.includedRaidLevels = $(this).val().map(Number)
            if (settings.includedRaidLevels.length < oldIncludedRaidLevels.length) {
                updateGyms()
            } else {
                if (settings.showGyms) {
                    updateGyms()
                }
                lastgyms = false
                updateMap()
            }
            Store.set('includedRaidLevels', settings.includedRaidLevels)
        })
    }

    if (showConfig.pokestops) {
        $('#pokestop-switch').on('change', function () {
            settings.showPokestops = this.checked
            const filtersWrapper = $('#pokestop-filters-wrapper')
            if (this.checked) {
                filtersWrapper.show()
                lastpokestops = false
                updateMap()
            } else {
                filtersWrapper.hide()
                updatePokestops()
            }
            Store.set('showPokestops', this.checked)
        })

        $('#pokestop-no-event-switch').on('change', function () {
            settings.showPokestopsNoEvent = this.checked
            if (this.checked) {
                lastpokestops = false
                updateMap()
            } else {
                updatePokestops()
            }
            Store.set('showPokestopsNoEvent', this.checked)
        })

        $('#pokestop-name-filter').on('keyup', function () {
            $pokestopNameFilter = this.value.match(/[.*+?^${}()|[\]\\]/g) ? this.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : this.value
            updatePokestops()
            lastpokestops = false
            updateMap()
        })
    }

    if (showConfig.quests) {
        $('#quest-switch').on('change', function () {
            settings.showQuests = this.checked
            var filterButton = $('a[data-target="quest-filter-modal"]')
            if (this.checked) {
                filterButton.show()
            } else {
                filterButton.hide()
            }
            updatePokestops()
            lastpokestops = false
            updateMap()
            Store.set('showQuests', this.checked)
        })
    }

    if (showConfig.invasions) {
        $('#invasion-switch').on('change', function () {
            settings.showInvasions = this.checked
            var filterButton = $('a[data-target="invasion-filter-modal"]')
            if (this.checked) {
                filterButton.show()
            } else {
                filterButton.hide()
            }
            updatePokestops()
            lastpokestops = false
            updateMap()
            Store.set('showInvasions', this.checked)
        })
    }

    if (showConfig.lures) {
        $('#lure-switch').on('change', function () {
            settings.showLures = this.checked
            const lureTypeWrapper = $('#lure-type-select-wrapper')
            if (this.checked) {
                lureTypeWrapper.show()
            } else {
                lureTypeWrapper.hide()
            }
            updatePokestops()
            lastpokestops = false
            updateMap()
            Store.set('showLures', this.checked)
        })

        $('#lure-type-select').on('change', function () {
            settings.includedLureTypes = $(this).val().map(Number)
            updateGyms()
            lastpokestops = false
            updateMap()
            Store.set('includedLureTypes', settings.includedLureTypes)
        })
    }

    if (showConfig.weather) {
        $('#weather-switch').on('change', function () {
            settings.showWeather = this.checked
            const formsWrapper = $('#weather-forms-wrapper')
            if (this.checked) {
                formsWrapper.show()
                lastweather = false
                updateMap()
            } else {
                formsWrapper.hide()
                updateWeathers()
                if (settings.showMainWeather) {
                    $('#weather-button').hide()
                }
            }
            Store.set('showWeather', this.checked)
        })

        $('#main-weather-switch').on('change', function () {
            settings.showMainWeather = this.checked
            if (this.checked) {
                updateWeatherButton()
            } else {
                $('#weather-button').hide()
            }
            Store.set('showMainWeather', this.checked)
        })

        $('#weather-cells-switch').on('change', function () {
            settings.showWeatherCells = this.checked
            updateWeathers()
            Store.set('showWeatherCells', this.checked)
        })
    }

    if (showConfig.spawnpoints) {
        $('#spawnpoint-switch').on('change', function () {
            settings.showSpawnpoints = this.checked
            if (this.checked) {
                lastspawns = false
                updateMap()
            } else {
                updateSpawnpoints()
            }
            Store.set('showSpawnpoints', this.checked)
        })
    }

    if (showConfig.scanned_locs) {
        $('#scanned-locs-switch').on('change', function () {
            settings.showScannedLocations = this.checked
            if (this.checked) {
                lastscannedlocs = false
                updateMap()
            } else {
                updateScannedLocations()
            }
            Store.set('showScannedLocations', this.checked)
        })
    }


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
        updatePokemons()
    })

    $('#gym-bounce-switch').change(function () {
        Store.set('bounceGyms', this.checked)
        updateGyms()
    })

    $('#pokestop-bounce-switch').change(function () {
        Store.set('bouncePokestops', this.checked)
        updatePokestops()
    })

    $('#pokemon-upscale-switch').change(function () {
        Store.set('upscaleNotifyPokemon', this.checked)
        updatePokemons()
    })

    $('#gym-upscale-switch').change(function () {
        Store.set('upscaleGyms', this.checked)
        updateGyms()
    })

    $('#pokestop-upscale-switch').change(function () {
        Store.set('upscalePokestops', this.checked)
        updatePokestops()
    })

    $('#notify-pokemon-switch').change(function () {
        var wrapper = $('#notify-pokemon-filter-wrapper')
        this.checked ? wrapper.show() : wrapper.hide()
        Store.set('notifyPokemon', this.checked)
        updatePokemons()
    })

    $('#notify-gyms-switch').change(function () {
        var wrapper = $('#notify-gyms-filter-wrapper')
        this.checked ? wrapper.show() : wrapper.hide()
        Store.set('notifyGyms', this.checked)
        updateGyms()
    })

    $('#notify-pokestops-switch').change(function () {
        var wrapper = $('#notify-pokestops-filter-wrapper')
        this.checked ? wrapper.show() : wrapper.hide()
        Store.set('notifyPokestops', this.checked)
        updatePokestops()
    })

    $('#notify-normal-lures-switch').change(function () {
        Store.set('notifyNormalLures', this.checked)
        updatePokestops()
    })

    $('#notify-glacial-lures-switch').change(function () {
        Store.set('notifyGlacialLures', this.checked)
        updatePokestops()
    })

    $('#notify-magnetic-lures-switch').change(function () {
        Store.set('notifyMagneticLures', this.checked)
        updatePokestops()
    })

    $('#notify-mossy-lures-switch').change(function () {
        Store.set('notifyMossyLures', this.checked)
        updatePokestops()
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
        updatePokemons([], true)
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
        updatePokemons([], true)
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
        updatePokemons()
    })

    $('#notify-tiny-rattata-switch').change(function () {
        if (this.checked && (Store.get('showNotifiedPokemonAlways') || Store.get('showNotifiedPokemonOnly'))) {
            reincludedPokemon.push(19)
        }
        Store.set('notifyTinyRattata', this.checked)
        if (!(Store.get('showNotifiedPokemonOnly') && this.checked)) {
            updatePokemons([19], true)
        }
    })

    $('#notify-big-magikarp-switch').change(function () {
        if (this.checked && (Store.get('showNotifiedPokemonAlways') || Store.get('showNotifiedPokemonOnly'))) {
            reincludedPokemon.push(129)
        }
        Store.set('notifyBigMagikarp', this.checked)
        if (!(Store.get('showNotifiedPokemonOnly') && this.checked)) {
            updatePokemons([129], true)
        }
    })

    $('#notified-pokemon-priority-switch').change(function () {
        Store.set('showNotifiedPokemonAlways', this.checked)
        if (!this.checked) {
            lastpokemon = false
        }
        updatePokemons()
    })

    $('#notified-pokemon-only-switch').change(function () {
        Store.set('showNotifiedPokemonOnly', this.checked)
        if (!this.checked) {
            lastpokemon = false
        }
        updatePokemons()
    })

    $('#pokemon-icon-size').on('change', function () {
        Store.set('pokemonIconSizeModifier', this.value)
        updatePokemons()
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
        $('a[data-target="pokemon-values-filter-modal"]').toggle(settings.filterValues)
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
        $('#pokestop-filters-wrapper').toggle(settings.showPokestops)
        $('#pokestop-no-event-switch').prop('checked', settings.showPokestopsNoEvent)
    }
    if (showConfig.quests) {
        $('#quest-switch').prop('checked', settings.showQuests)
        $('a[data-target="quest-filter-modal"]').toggle(settings.showQuests)
    }
    if (showConfig.invasions) {
        $('#invasion-switch').prop('checked', settings.showInvasions)
        $('a[data-target="invasion-filter-modal"]').toggle(settings.showInvasions)
    }
    if (showConfig.lures) {
        $('#lure-switch').prop('checked', settings.showLures)
        $('#lure-type-select-wrapper').toggle(settings.showLures)
        $('#lure-type-select').val(settings.includedLureTypes)
        $('#lure-type-select').formSelect()
    }

    // Weather.
    if (showConfig.weather) {
        $('#weather-switch').prop('checked', settings.showWeather)
        $('#weather-forms-wrapper').toggle(settings.showWeather)
        $('#weather-cells-switch').prop('checked', settings.showWeatherCells)
        $('#main-weather-switch').prop('checked', settings.showMainWeather)
    }

    // Map.
    if (showConfig.spawnpoints) {
        $('#spawnpoint-switch').prop('checked', settings.showSpawnpoints)
    }
    if (showConfig.scanned_locs) {
        $('#scanned-locs-switch').prop('checked', settings.showScannedLocations)
    }



    $('#scanned-switch').prop('checked', Store.get('showScannedLocations'))
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
        $('.pokemon-filter-list').append(`
            <div class='filter-button' data-id='${id}'>
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
            inputElement.val((value.concat(id).join(','))).trigger('change')
            img.removeClass('active')
        } else {
            inputElement.val(value.filter(function (elem) {
                return elem !== id
            }).join(',')).trigger('change')
            img.addClass('active')
        }
    })

    $('.pokemon-select-all').on('click', function (e) {
        e.preventDefault()
        var parent = $(this).parent().parent().parent()
        parent.find('.pokemon-filter-list .filter-button:visible').addClass('active')
        parent.find('input[id$=pokemon]').val('').trigger('change')
    })

    $('.pokemon-deselect-all').on('click', function (e) {
        e.preventDefault()
        var parent = $(this).parent().parent().parent()
        parent.find('.pokemon-filter-list .filter-button:visible').removeClass('active')
        parent.find('input[id$=pokemon]').val(pokemonIds.join(',')).trigger('change')
    })

    $('.pokemon-select-filtered').on('click', function (e) {
        e.preventDefault()
        var parent = $(this).parent().parent().parent()
        var inputElement = parent.find('input[id$=pokemon]')
        var deselectedPokemons = inputElement.val().length > 0 ? inputElement.val().split(',') : []
        var visibleNotActiveIconElements = parent.find('.filter-button:visible:not(.active)')
        visibleNotActiveIconElements.addClass('active')
        $.each(visibleNotActiveIconElements, function (i, item) {
            var id = $(this).data('id').toString()
            deselectedPokemons = deselectedPokemons.filter(function (item) {
                return item !== id
            })
        })
        inputElement.val(deselectedPokemons.join(',')).trigger('change')
    })

    $('.pokemon-deselect-filtered').on('click', function (e) {
        e.preventDefault()
        var parent = $(this).parent().parent().parent()
        var inputElement = parent.find('input[id$=pokemon]')
        var deselectedPokemons = inputElement.val().length > 0 ? inputElement.val().split(',') : []
        var visibleActiveIconElements = parent.find('.filter-button:visible.active')
        visibleActiveIconElements.removeClass('active')
        $.each(visibleActiveIconElements, function (i, item) {
            deselectedPokemons.push($(this).data('id'))
        })
        inputElement.val(deselectedPokemons.join(',')).trigger('change')
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
        $('#exclude-pokemon').val(settings.excludedPokemon)
        if (settings.excludedPokemon.length === 0) {
            $('#filter-pokemon-title').text('Pokémon (All)')
        } else {
            $('#filter-pokemon-title').text(`Pokémon (${pokemonIds.length - settings.excludedPokemon.length})`)
        }

        $('label[for="exclude-pokemon"] .pokemon-filter-list .filter-button').each(function () {
            if (!settings.excludedPokemon.includes($(this).data('id'))) {
                $(this).addClass('active')
            }
        })

        $('#exclude-pokemon').on('change', function (e) {
            const oldExcludedPokemon = settings.excludedPokemon
            settings.excludedPokemon = $(this).val().length > 0 ? $(this).val().split(',').map(Number) : []

            const newExcludedPokemon = settings.excludedPokemon.filter(id => !oldExcludedPokemon.includes(id))
            if (newExcludedPokemon.length > 0) {
                updatePokemons(newExcludedPokemon)
            }

            const newReincludedPokemon = oldExcludedPokemon.filter(id => !settings.excludedPokemon.includes(id))
            reincludedPokemon = reincludedPokemon.concat(newReincludedPokemon)
            if (reincludedPokemon.length > 0) {
                updateMap()
            }

            if (settings.excludedPokemon.length === 0) {
                $('#filter-pokemon-title').text('Pokémon (All)')
            } else {
                $('#filter-pokemon-title').text(`Pokémon (${pokemonIds.length - settings.excludedPokemon.length})`)
            }

            Store.set('excludedPokemon', settings.excludedPokemon)
        })
    }

    if (showConfig.pokemon_values) {
        $('#unfiltered-pokemon').val(settings.unfilteredPokemon)
        if (settings.unfilteredPokemon.length === 0) {
            $('#filter-values-pokemon-title').text('Pokémon to be filtered (All)')
        } else {
            $('#filter-values-pokemon-title').text(`Pokémon to be filtered (${pokemonIds.length - settings.unfilteredPokemon.length})`)
        }

        $('label[for="unfiltered-pokemon"] .pokemon-filter-list .filter-button').each(function () {
            if (!settings.unfilteredPokemon.includes($(this).data('id'))) {
                $(this).addClass('active')
            }
        })

        $('#unfiltered-pokemon').on('change', function (e) {
            const oldUnfilteredPokemon = settings.unfilteredPokemon
            settings.unfilteredPokemon = $(this).val().length > 0 ? $(this).val().split(',').map(Number) : []

            const newFilterdPokemon = oldUnfilteredPokemon.filter(id => !settings.unfilteredPokemon.includes(id))
            if (newFilterdPokemon.length > 0) {
                updatePokemons(newFilterdPokemon)
            }

            const newUnfilterdPokemon = settings.unfilteredPokemon.filter(id => !oldUnfilteredPokemon.includes(id))
            reincludedPokemon = reincludedPokemon.concat(newUnfilterdPokemon)
            if (reincludedPokemon.length > 0) {
                updateMap()
            }

            if (settings.unfilteredPokemon.length === 0) {
                $('#filter-values-pokemon-title').text('Pokémon to be filtered (All)')
            } else {
                $('#filter-values-pokemon-title').text(`Pokémon to be filtered (${pokemonIds.length - settings.unfilteredPokemon.length})`)
            }

            Store.set('unfilteredPokemon', settings.unfilteredPokemon)
        })
    }

    if (showConfig.raid_filters) {
        $('#exclude-raid-pokemon').val(settings.excludedRaidPokemon)
        if (settings.excludedRaidPokemon.length === 0) {
            $('#filter-raid-pokemon-title').text('Raid Bosses (All)')
        } else {
            $('#filter-raid-pokemon-title').text(`Raid Bosses (${pokemonIds.length - settings.excludedRaidPokemon.length})`)
        }

        $('label[for="exclude-raid-pokemon"] .pokemon-filter-list .filter-button').each(function () {
            if (!settings.excludedRaidPokemon.includes($(this).data('id'))) {
                $(this).addClass('active')
            }
        })

        $('#exclude-raid-pokemon').on('change', function (e) {
            const oldExcludedPokemon = settings.excludedRaidPokemon
            settings.excludedRaidPokemon = $(this).val().length > 0 ? $(this).val().split(',').map(Number) : []

            if (settings.excludedRaidPokemon.length > oldExcludedPokemon.length) {
                updateGyms()
            } else {
                lastgyms = false
                updateMap()
            }

            if (settings.excludedRaidPokemon.length === 0) {
                $('#filter-raid-pokemon-title').text('Raid Bosses (All)')
            } else {
                $('#filter-raid-pokemon-title').text(`Raid Bosses (${pokemonIds.length - settings.excludedRaidPokemon.length})`)
            }

            Store.set('excludedRaidPokemon', settings.excludedRaidPokemon)
        })
    }

    if (showConfig.quests) {
        $('#exclude-quest-pokemon').val(settings.excludedQuestPokemon)
        if (settings.excludedQuestPokemon.length === 0) {
            $('a[href="#quest-pokemon-tab"]').text('Quest Pokémon (All)')
        } else {
            $('a[href="#quest-pokemon-tab"]').text(`Quest Pokémon (${pokemonIds.length - settings.excludedQuestPokemon.length})`)
        }

        $('label[for="exclude-quest-pokemon"] .pokemon-filter-list .filter-button').each(function () {
            if (!settings.excludedQuestPokemon.includes($(this).data('id'))) {
                $(this).addClass('active')
            }
        })

        $('#exclude-quest-pokemon').on('change', function (e) {
            const oldExcludedPokemon = settings.excludedQuestPokemon
            settings.excludedQuestPokemon = $(this).val().length > 0 ? $(this).val().split(',').map(Number) : []

            if (settings.excludedQuestPokemon.length > oldExcludedPokemon.length) {
                updatePokestops()
            } else {
                lastpokestops = false
                updateMap()
            }

            if (settings.excludedQuestPokemon.length === 0) {
                $('a[href="#quest-pokemon-tab"]').text('Quest Pokémon (All)')
            } else {
                $('a[href="#quest-pokemon-tab"]').text(`Quest Pokémon (${pokemonIds.length - settings.excludedQuestPokemon.length})`)
            }
            $('#quest-filter-tabs').tabs('updateTabIndicator')

            Store.set('excludedQuestPokemon', settings.excludedQuestPokemon)
        })
    }
}

function initItemFilters() {
    var questItemIds = []
    const includeInFilter = [6, 1, 2, 3, 701, 703, 705, 706, 708, 101, 102, 103, 104, 201, 202, 1301, 1201, 1202]
    for (var i = 0; i < includeInFilter.length; i++) {
        const id = includeInFilter[i]
        const iconUrl = getItemImageUrl(id)
        const name = getItemName(id)
        const questBundles = getQuestBundles(id)
        if (questBundles.length === 0) {
            questBundles.push(1)
        }
        $.each(questBundles, function (idx, bundleAmount) {
            questItemIds.push(id + '_' + bundleAmount)
            $('.quest-item-filter-list').append(`
                <div class='filter-button' data-id='${id}' data-bundle='${bundleAmount}'>
                <div class='filter-button-content'>
                <div>${name}</div>
                <div><img src='${iconUrl}' width='32'></div>
                <div>x${bundleAmount}</div>
                </div>
                </div>`)
        })
    }

    $('#exclude-quest-items').val(settings.excludedQuestItems)
    if (settings.excludedQuestItems.length === 0) {
        $('a[href="#quest-item-tab"]').text('Quest Items (All)')
    } else {
        $('a[href="#quest-item-tab"]').text(`Quest Items (${questItemIds.length - settings.excludedQuestItems.length})`)
    }

    $('label[for="exclude-quest-items"] .quest-item-filter-list .filter-button').each(function () {
        var id = $(this).data('id').toString()
        if ($(this).data('bundle')) {
            id += '_' + $(this).data('bundle')
        }
        if (!settings.excludedQuestItems.includes(id)) {
            $(this).addClass('active')
        }
    })

    $('.quest-item-filter-list').on('click', '.filter-button', function () {
        var inputElement = $(this).parent().parent().find('input[id$=items]')
        var value = inputElement.val().length > 0 ? inputElement.val().split(',') : []
        var id = $(this).data('id').toString()
        if ($(this).data('bundle')) {
            id += '_' + $(this).data('bundle')
        }
        if ($(this).hasClass('active')) {
            inputElement.val((value.concat(id).join(','))).trigger('change')
            $(this).removeClass('active')
        } else {
            inputElement.val(value.filter(function (elem) {
                return elem !== id
            }).join(',')).trigger('change')
            $(this).addClass('active')
        }
    })

    $('.quest-item-select-all').on('click', function (e) {
        var parent = $(this).parent().parent().parent()
        parent.find('.quest-item-filter-list .filter-button:visible').addClass('active')
        parent.find('input[id$=items]').val('').trigger('change')
    })

    $('.quest-item-deselect-all').on('click', function (e) {
        var parent = $(this).parent().parent().parent()
        parent.find('.quest-item-filter-list .filter-button:visible').removeClass('active')
        parent.find('input[id$=items]').val(questItemIds.join(',')).trigger('change')
    })

    $('#exclude-quest-items').on('change', function () {
        const oldExcludedQuestItems = settings.excludedQuestItems
        settings.excludedQuestItems = $(this).val().length > 0 ? $(this).val().split(',') : []

        updatePokestops()
        lastpokestops = false
        updateMap()

        if (settings.excludedQuestItems.length === 0) {
            $('a[href="#quest-item-tab"]').text('Quest Items (All)')
        } else {
            $('a[href="#quest-item-tab"]').text(`Quest Items (${questItemIds.length - settings.excludedQuestItems.length})`)
        }
        $('#quest-filter-tabs').tabs('updateTabIndicator')

        Store.set('excludedQuestItems', settings.excludedQuestItems)
    })
}

function initInvasionFilters() {
    const invasionIds = [41, 42, 43, 44, 5, 4, 6, 7, 10, 11, 12, 13, 49, 50, 14, 15, 16, 17, 18, 19, 20, 21, 47, 48, 22, 23, 24, 25, 26, 27, 30, 31, 32, 33, 34, 35, 36, 37, 28, 29, 38, 39]
    for (var i = 0; i < invasionIds.length; i++) {
        const id = invasionIds[i]
        const iconUrl = getInvasionImageUrl(id)
        const type = getInvasionType(id)
        const grunt = getInvasionGrunt(id)
        $('.invasion-filter-list').append(`
            <div class='filter-button' data-id='${id}'>
              <div class='filter-button-content'>
                <div>${type}</div>
                <div><img src='${iconUrl}' width='32'></div>
                <div>${grunt}</div>
              </div>
            </div>`)
    }

    $('#exclude-invasions').val(settings.excludedInvasions)
    if (settings.excludedInvasions.length === 0) {
        $('#filter-invasion-title').text('Team Rocket Invasions (All)')
    } else {
        $('#filter-invasion-title').text(`Team Rocket Invasions (${invasionIds.length - settings.excludedInvasions.length})`)
    }

    $('label[for="exclude-invasions"] .invasion-filter-list .filter-button').each(function () {
        if (!settings.excludedInvasions.includes($(this).data('id'))) {
            $(this).addClass('active')
        }
    })

    $('.invasion-filter-list').on('click', '.filter-button', function () {
        var inputElement = $(this).parent().parent().find('input[id$=invasions]')
        var value = inputElement.val().length > 0 ? inputElement.val().split(',') : []
        var id = $(this).data('id').toString()
        if ($(this).hasClass('active')) {
            inputElement.val((value.concat(id).join(','))).trigger('change')
            $(this).removeClass('active')
        } else {
            inputElement.val(value.filter(function (elem) {
                return elem !== id
            }).join(',')).trigger('change')
            $(this).addClass('active')
        }
    })

    $('.invasion-select-all').on('click', function (e) {
        var parent = $(this).parent().parent().parent()
        parent.find('.invasion-filter-list .filter-button:visible').addClass('active')
        parent.find('input[id$=invasions]').val('').trigger('change')
    })

    $('.invasion-deselect-all').on('click', function (e) {
        var parent = $(this).parent().parent().parent()
        parent.find('.invasion-filter-list .filter-button:visible').removeClass('active')
        parent.find('input[id$=invasions]').val(invasionIds.join(',')).trigger('change')
    })

    $('#exclude-invasions').on('change', function () {
        const oldExcludedinvasions = settings.excludedInvasions
        settings.excludedInvasions = $(this).val().length > 0 ? $(this).val().split(',').map(Number) : []

        updatePokestops()
        lastpokestops = false
        updateMap()

        if (settings.excludedInvasions.length === 0) {
            $('#filter-invasion-title').text('Team Rocket Invasions (All)')
        } else {
            $('#filter-invasion-title').text(`Team Rocket Invasions (${invasionIds.length - settings.excludedInvasions.length})`)
        }

        Store.set('excludedInvasions', settings.excludedInvasions)
    })
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

    var processedCells = {}
    var stack = []

    const centerCell = S2.S2Cell.FromLatLng(bounds.getCenter(), level)
    processedCells[centerCell.toString()] = true
    stack.push(centerCell)
    addPoly(centerCell)

    // Find all cells within view with a slighty modified version of the BFS algorithm.
    while (stack.length > 0) {
        const cell = stack.pop()
        const neighbors = cell.getNeighbors()
        neighbors.forEach(function (ncell, index) {
            if (!processedCells[ncell.toString()]) {
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
            case 'weather':
                // Always update label before opening since weather might have become outdated.
                updateWeatherLabel(mapData.weather[marker.s2_cell_id], marker)
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
                case 'weather':
                    // Always update label before opening since weather might have become outdated.
                    updateWeatherLabel(mapData.weather[marker.s2_cell_id], marker)
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

    marker.on('popupclose', function (e) {
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

    for (let id of raidIds) {
        if (!isValidRaid(mapData.gyms[id].raid)) {
            mapData.gyms[id].raid = null
            updateGym(id)
            raidIds.delete(id)
        }
    }

    for (let id of upcomingRaidIds) {
        if (isOngoingRaid(mapData.gyms[id].raid)) {
            updateGym(id)
            upcomingRaidIds.delete(id)
        }
    }

    for (let id of invadedPokestopIds) {
        if (!isInvadedPokestop(mapData.pokestops[id])) {
            updatePokestop(id)
            invadedPokestopIds.delete(id)
        }
    }

    for (let id of luredPokestopIds) {
        if (!isLuredPokestop(mapData.pokestops[id])) {
            updatePokestop(id)
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
            const isActive = isNowBetween(mapData.spawnpoints[id].spawn_time, mapData.spawnpoints[id].despawn_time)
            if ((spawnpoint.marker.options.color === 'green' && !isActive) ||
                    (spawnpoint.marker.options.color === 'blue' && isActive)) {
                // Spawn point became active/inactive, update it.
                updateSpawnpoint(id)
            }
        }
    })

    $.each(mapData.scannedLocs, function (id, scannedLoc) {
        if (scannedLoc.last_modified < (Date.now() - 15 * 60 * 1000)) {
            // Remove if older than 15 minutes.
            removeScannedLocation(scannedLoc)
        } else if (map.getBounds().contains(scannedLoc.marker.getLatLng())) {
            updateScannedLocation(id)
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

function loadRawData() {
    var userAuthCode = localStorage.getItem('userAuthCode')
    var loadPokemon = settings.showPokemon
    var loadGyms = settings.showGyms
    var loadRaids = settings.showRaids
    var loadPokestops = settings.showPokestops
    var loadPokestopsNoEvent = settings.showPokestopsNoEvent
    var loadQuests = settings.showQuests
    var loadInvasions = settings.showInvasions
    var loadLures = settings.showLures
    var loadWeather = settings.showWeather
    var loadSpawnpoints = settings.showSpawnpoints
    var loadScannedLocs = settings.showScannedLocations
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
            'swLat': swLat,
            'swLng': swLng,
            'neLat': neLat,
            'neLng': neLng,
            'oSwLat': oSwLat,
            'oSwLng': oSwLng,
            'oNeLat': oNeLat,
            'oNeLng': oNeLng,
            'pokemon': loadPokemon,
            'eids': String(getExcludedPokemon()),
            'reids': String(isShowAllZoom() ? settings.excludedPokemon : reincludedPokemon),
            'prionotify': prionotifyactiv,
            'pokestops': loadPokestops,
            'pokestopsNoEvent': loadPokestopsNoEvent,
            'quests': loadQuests,
            'invasions': loadInvasions,
            'lures': loadLures,
            'gyms': loadGyms,
            'raids': loadRaids,
            'weather': loadWeather,
            'spawnpoints': loadSpawnpoints,
            'scannedLocs': loadScannedLocs,
            'lastpokemon': lastpokemon,
            'lastgyms': lastgyms,
            'lastpokestops': lastpokestops,
            'lastweather': lastweather,
            'lastspawns': lastspawns,
            'lastscannedlocs': lastscannedlocs
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
        $.each(result.pokemons, function (idx, pokemon) {
            processPokemon(pokemon)
        })
        $.each(result.gyms, function (id, gym) {
            processGym(gym)
        })
        $.each(result.pokestops, function (id, pokestop) {
            processPokestop(pokestop)
        })
        $.each(result.weather, function (idx, weather) {
            processWeather(weather)
        })
        $.each(result.spawnpoints, function (idx, spawnpoint) {
            processSpawnpoint(spawnpoint)
        })
        $.each(result.scannedlocs, function (idx, scannedLoc) {
            processScannedLocation(scannedLoc)
        })

        showInBoundsMarkers(mapData.lurePokemons, 'pokemon')
        showInBoundsMarkers(mapData.gyms, 'gym')
        showInBoundsMarkers(mapData.pokestops, 'pokestop')
        //showInBoundsMarkers(mapData.scanned, 'scanned')
        showInBoundsMarkers(mapData.spawnpoints, 'inbound')
        showInBoundsMarkers(mapData.weather, 'weather')
        showInBoundsMarkers(mapData.weatherAlerts, 's2cell')

        if ($('#stats').hasClass('visible')) {
            countMarkers(map)
        }

        oSwLat = result.oSwLat
        oSwLng = result.oSwLng
        oNeLat = result.oNeLat
        oNeLng = result.oNeLng

        lastpokemon = result.lastpokemon
        lastgyms = result.lastgyms
        lastpokestops = result.lastpokestops
        lastspawns = result.lastspawns
        lastscannedlocs = result.lastscannedlocs
        lastweather = result.lastweather

        if (result.reids instanceof Array) {
            reincludedPokemon = result.reids.filter(function (e) {
                return this.indexOf(e) < 0
            }, reincludedPokemon)
        }
        timestamp = result.timestamp
        lastUpdateTime = Date.now()
    })
}

function updateLabelDiffTime() {
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

// TODO: maybe delete.
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

// TODO: maybe delete.
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
        var pokemonIds = []

        var id
        for (id = 1; id <= availablePokemonCount; id++) {
            pokemonIds.push(id)
        }
        // Meltan and Melmetal
        pokemonIds.push(808)
        pokemonIds.push(809)

        $selectNotifyPokemon.on('change', function (e) {
            const oldNotifyPokemon = notifyPokemon
            notifyPokemon = $selectNotifyPokemon.val().length > 0 ? $selectNotifyPokemon.val().split(',').map(Number) : []
            const newNotifyPokemon = notifyPokemon.filter(id => !oldNotifyPokemon.includes(id))
            const newNotNotifyPokemon = oldNotifyPokemon.filter(id => !notifyPokemon.includes(id))

            if (Store.get('showNotifiedPokemonAlways') || Store.get('showNotifiedPokemonOnly')) {
                reincludedPokemon = reincludedPokemon.concat(newNotifyPokemon)
                if (!Store.get('showNotifiedPokemonOnly')) {
                    updatePokemons(newNotifyPokemon)
                }
                updatePokemons(newNotNotifyPokemon)
            } else {
                updatePokemons(newNotifyPokemon.concat(newNotNotifyPokemon))
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
            updateGyms()
            Store.set('remember_select_notify_raid_pokemon', notifyRaidPokemon)
        })

        $selectNotifyEggs.on('change', function (e) {
            notifyEggs = $selectNotifyEggs.val().map(Number)
            updateGyms()
            Store.set('remember_select_notify_eggs', notifyEggs)
        })

        // Recall saved lists.
        $selectNotifyPokemon.val(Store.get('remember_select_notify_pokemon')).trigger('change')
        $selectNotifyRaidPokemon.val(Store.get('remember_select_notify_raid_pokemon')).trigger('change')
        $selectNotifyEggs.val(Store.get('remember_select_notify_eggs')).trigger('change')

        /*if (isTouchDevice() && isMobileDevice()) {
            $('.select2-search input').prop('readonly', true)
        }*/
    })

    /*// Load invasion data and populate list.
    $.getJSON('static/dist/data/invasions.min.json').done(function (data) {
        let invasionIds = []
        for (var id in data) {
            idToInvasion[id] = data[id]
            $('.invasion-list').append(`<div class='invasion-sprite' data-value='${id}'><div id='invasion-type-list'>${idToInvasion[id].type}</div><img class='invasion-select-icon' src='static/images/invasion/${id}.png' width='32px'><div id='invasion-gender-list'>${idToInvasion[id].grunt}</div></div>`)
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
            updatePokestops()
            Store.set('remember_select_notify_invasions', notifyInvasions)
        })

        $selectNotifyInvasions.val(Store.get('remember_select_notify_invasions')).trigger('change')
    })*/

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
