/* global showAllZoomLevel getS2CellBounds processWeather processWeatherAlerts getIvsPercentageCssColor getPokemonGen getPokemonRawIconUrl timestampToTime timestampToDateTime */

//
// Global map.js variables
//

var $gymNameFilter = ''
var $pokestopNameFilter = ''
var settingsSideNav
var statsSideNav
var gymSidebar
var openGymSidebarId = ''

var settings = {
    showPokemon: null,
    filterPokemonById: null,
    excludedPokemon: null,
    pokemonIconSizeModifier: null,
    showPokemonValues: null,
    filterPokemonByValues: null,
    noFilterValuesPokemon: null,
    minIvs: null,
    maxIvs: null,
    showZeroIvsPokemon: null,
    showHundoIvsPokemon: null,
    minLevel: null,
    maxLevel: null,
    includedRarities: null,
    scaleByRarity: null,
    pokemonNotifs: null,
    pokemonIdNotifs: null,
    notifPokemon: null,
    pokemonValuesNotifs: null,
    notifValuesPokemon: null,
    zeroIvsPokemonNotifs: null,
    hundoIvsPokemonNotifs: null,
    minNotifIvs: null,
    maxNotifIvs: null,
    minNotifLevel: null,
    maxNotifLevel: null,
    notifRarities: null,
    tinyRattataNotifs: null,
    bigMagikarpNotifs: null,
    showNotifPokemonOnly: null,
    showNotifPokemonAlways: null,
    playCries: null,
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
    filterRaidPokemon: null,
    excludedRaidPokemon: null,
    showActiveRaidsOnly: null,
    showExEligibleRaidsOnly: null,
    includedRaidLevels: null,
    raidNotifs: null,
    raidPokemonNotifs: null,
    notifRaidPokemon: null,
    notifEggs: null,
    showPokestops: null,
    showPokestopsNoEvent: null,
    showQuests: null,
    filterQuests: null,
    excludedQuestPokemon: null,
    excludedQuestItems: null,
    showInvasions: null,
    filterInvasions: null,
    includedLureTypes: null,
    excludedInvasions: null,
    pokestopNotifs: null,
    questNotifs: null,
    notifQuestPokemon: null,
    notifQuestItems: null,
    invasionNotifs: null,
    notifInvasions: null,
    notifLureTypes: null,
    showWeather: null,
    showWeatherCells: null,
    showMainWeather: null,
    showSpawnpoints: null,
    showScannedLocations: null,
    showPokemonNests: null,
    showExParks: null,
    showNestParks: null,
    showS2Cells: null,
    showS2CellsLevel10: null,
    showS2CellsLevel13: null,
    showS2CellsLevel14: null,
    showS2CellsLevel17: null,
    warnHiddenS2Cells: null,
    showRanges: null,
    includedRangeTypes: null,
    startAtUserLocation: null,
    startAtLastLocation: null,
    isStartLocationMarkerMovable: null,
    followUserLocation: null,
    showBrowserPopups: null,
    playSound: null,
    upscaleNotifMarkers: null,
    bounceNotifMarkers: null,
    mapServiceProvider: null,
    startLocationMarkerStyle: null,
    userLocationMarkerStyle: null,
    darkMode: null,
    clusterZoomLevel: null
}

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
    pokemonNests: {},
    exParks: [],
    nestParks: []
}

var markerStyles
var startLocationMarker
var userLocationMarker
var followUserHandle
const gymRangeColors = ['#999999', '#0051CF', '#FF260E', '#FECC23'] // 'Uncontested', 'Mystic', 'Valor', 'Instinct'

var timestamp
var rawDataIsLoading = false
var reincludedPokemon = new Set()

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

var map
var markers
var markersNoCluster

var pokemonNestsLayerGroup
var nestParksLayerGroup
var exParksLayerGroup
var s2CellsLayerGroup
var rangesLayerGroup

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

var updateWorker
var lastUpdateTime

const gymTypes = ['Uncontested', 'Mystic', 'Valor', 'Instinct']

const audio = new Audio('static/sounds/ding.mp3')
const cryFileTypes = ['wav', 'mp3']

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
    return serverSettings.showAllZoomLevel > 0 && map.getZoom() >= serverSettings.showAllZoomLevel
}

function loadData(file, onLoad, onError) {
    var reader = new FileReader()
    reader.readAsText(file)
    reader.onload = onLoad
    reader.onerror = onError
}

function downloadData(fileName, data) {
    var a = document.createElement('a')
    a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(data))
    a.setAttribute('download', fileName + '_' + moment().format('DD-MM-YYYY HH:mm'))
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

function initMap() { // eslint-disable-line no-unused-vars
    // URL query parameters.
    const paramLat = Number(getParameterByName('lat'))
    const paramLng = Number(getParameterByName('lon'))
    const paramZoom = Number(getParameterByName('zoom'))

    if (settings.startAtLastLocation) {
        var position = Store.get('startAtLastLocationPosition')
        var lat = position.lat
        var lng = position.lng
    } else {
        position = Store.get('startLocationPosition')
        const useStartLocation = 'lat' in position && 'lng' in position
        lat = useStartLocation ? position.lat : serverSettings.centerLat
        lng = useStartLocation ? position.lng : serverSettings.centerLng
    }

    map = L.map('map', {
        center: [paramLat || lat, paramLng || lng],
        zoom: paramZoom || Store.get('zoomLevel'),
        minZoom: serverSettings.maxZoomLevel,
        zoomControl: false,
        preferCanvas: true
    })

    setTileLayer(Store.get('mapStyle'), map)

    L.control.zoom({
        position: 'bottomright'
    }).addTo(map)

    if (hasLocationSupport()) {
        createUserLocationButton()
    }

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

    map.on('moveend', function () {
        updateMainS2CellId()
        updateWeatherButton()
        updateAllParks()
        updateS2Overlay()

        const position = map.getCenter()
        Store.set('startAtLastLocationPosition', {
            lat: position.lat,
            lng: position.lng
        })
    })

    map.on('zoom', function () {
        Store.set('zoomLevel', map.getZoom())
    })

    map.on('zoomend', function () {
        if (settings.showRanges) {
            if (map.getZoom() > settings.clusterZoomLevel) {
                if (!map.hasLayer(rangesLayerGroup)) {
                    map.addLayer(rangesLayerGroup)
                }
            } else {
                if (map.hasLayer(rangesLayerGroup)) {
                    map.removeLayer(rangesLayerGroup)
                }
            }
        }
    })

    markers = L.markerClusterGroup({
        disableClusteringAtZoom: settings.clusterZoomLevel + 1,
        maxClusterRadius: serverSettings.maxClusterRadius,
        spiderfyOnMaxZoom: serverSettings.spiderfyClusters
    }).addTo(map)
    markersNoCluster = L.layerGroup().addTo(map)

    if (serverSettings.pokemonNests) {
        pokemonNestsLayerGroup = L.layerGroup().addTo(map)
    }
    
    if (serverSettings.nestParks) {
        nestParksLayerGroup = L.layerGroup().addTo(map)
    }
    if (serverSettings.exParks) {
        exParksLayerGroup = L.layerGroup().addTo(map)
    }
    if (serverSettings.s2Cells) {
        s2CellsLayerGroup = L.layerGroup().addTo(map)
    }
    if (serverSettings.ranges) {
        rangesLayerGroup = L.layerGroup()
        if (map.getZoom() > settings.clusterZoomLevel) {
            map.addLayer(rangesLayerGroup)
        }
    }

    startLocationMarker = createStartLocationMarker()
    if (hasLocationSupport()) {
        userLocationMarker = createUserLocationMarker()
    }

    if (settings.startAtUserLocation && !paramLat && !paramLng) {
        centerMapOnUserLocation()
    }

    if (settings.followUserLocation) {
        startFollowingUser()
    }
}

function createStartLocationMarker() {
    const pos = Store.get('startLocationPosition')
    const useStoredPosition = 'lat' in pos && 'lng' in pos
    const lat = useStoredPosition ? pos.lat : serverSettings.centerLat
    const lng = useStoredPosition ? pos.lng : serverSettings.centerLng

    var marker = L.marker([lat, lng], {draggable: settings.isStartLocationMarkerMovable}).addTo(markersNoCluster)
    marker.bindPopup(`<div><b>${i8ln('Start location')}</b></div>`)
    marker.setZIndexOffset(startLocationMarkerZIndex)
    updateStartLocationMarker()
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

function updateStartLocationMarker() {
    // Don't do anything if it's disabled.
    if (!startLocationMarker) {
        return
    }

    if (markerStyles.hasOwnProperty(settings.startLocationMarkerStyle)) {
        let iconUrl = markerStyles[settings.startLocationMarkerStyle].icon
        if (iconUrl) {
            let icon = L.icon({
                iconUrl: iconUrl,
                iconSize: [24, 24]
            })
            startLocationMarker.setIcon(icon)
        } else {
            startLocationMarker.setIcon(new L.Icon.Default())
        }
    }

    return startLocationMarker
}

function createUserLocationMarker() {
    const pos = Store.get('lastUserLocation')
    const useStoredPosition = 'lat' in pos && 'lng' in pos
    const lat = useStoredPosition ? pos.lat : serverSettings.centerLat
    const lng = useStoredPosition ? pos.lng : serverSettings.centerLng

    var marker = L.marker([lat, lng]).addTo(markersNoCluster)
    marker.bindPopup(`<div><b>${i8ln('My location')}</b></div>`)
    marker.setZIndexOffset(userLocationMarkerZIndex)
    updateUserLocationMarker()
    addListeners(marker)

    return marker
}

function updateUserLocationMarker(style) {
    // Don't do anything if it's disabled.
    if (!userLocationMarker) {
        return
    }

    if (markerStyles.hasOwnProperty(settings.userLocationMarkerStyle)) {
        let url = markerStyles[settings.userLocationMarkerStyle].icon
        if (url) {
            let locationIcon = L.icon({
                iconUrl: url,
                iconSize: [24, 24]
            })
            userLocationMarker.setIcon(locationIcon)
        } else {
            userLocationMarker.setIcon(new L.Icon.Default())
        }
    }

    return userLocationMarker
}

function enableDarkMode() {
    $('body').addClass('dark')
    $('meta[name="theme-color"]').attr('content', '#212121')
}

function disableDarkMode() {
    $('body').removeClass('dark')
    $('meta[name="theme-color"]').attr('content', '#ffffff')
}

function initSettings() {
    settings.showPokemon = serverSettings.pokemons && Store.get('showPokemon')
    settings.filterPokemonById = serverSettings.pokemons && Store.get('filterPokemonById')
    settings.excludedPokemon = serverSettings.pokemons ? Store.get('excludedPokemon') : new Set()
    settings.pokemonNotifs = serverSettings.pokemons && Store.get('pokemonNotifs')
    if (serverSettings.pokemons) {
        settings.pokemonIconSizeModifier = Store.get('pokemonIconSizeModifier')
        settings.showPokemonValues = serverSettings.pokemonValues && Store.get('showPokemonValues')
        settings.pokemonIdNotifs = Store.get('pokemonIdNotifs')
        settings.notifPokemon = Store.get('notifPokemon')
        settings.showNotifPokemonOnly = Store.get('showNotifPokemonOnly')
        settings.showNotifPokemonAlways = Store.get('showNotifPokemonAlways')
        settings.playCries = serverSettings.pokemonCries && Store.get('playCries')
    }
    if (serverSettings.pokemonValues) {
        settings.filterPokemonByValues = Store.get('filterPokemonByValues')
        settings.noFilterValuesPokemon = Store.get('noFilterValuesPokemon')
        settings.minIvs = Store.get('minIvs')
        settings.maxIvs = Store.get('maxIvs')
        settings.showZeroIvsPokemon = Store.get('showZeroIvsPokemon')
        settings.showHundoIvsPokemon = Store.get('showHundoIvsPokemon')
        settings.minLevel = Store.get('minLevel')
        settings.maxLevel = Store.get('maxLevel')
        settings.pokemonValuesNotifs = Store.get('pokemonValuesNotifs')
        settings.notifValuesPokemon = Store.get('notifValuesPokemon')
        settings.zeroIvsPokemonNotifs = Store.get('zeroIvsPokemonNotifs')
        settings.hundoIvsPokemonNotifs = Store.get('hundoIvsPokemonNotifs')
        settings.minNotifIvs = Store.get('minNotifIvs')
        settings.maxNotifIvs = Store.get('maxNotifIvs')
        settings.minNotifLevel = Store.get('minNotifLevel')
        settings.maxNotifLevel = Store.get('maxNotifLevel')
        settings.tinyRattataNotifs = Store.get('tinyRattataNotifs')
        settings.bigMagikarpNotifs = Store.get('bigMagikarpNotifs')
    }
    settings.scaleByRarity = serverSettings.rarity && Store.get('scaleByRarity')
    if (serverSettings.rarity) {
        settings.includedRarities = Store.get('includedRarities')
        settings.notifRarities = Store.get('notifRarities')
    }

    settings.showGyms = serverSettings.gyms && Store.get('showGyms')
    settings.useGymSidebar = serverSettings.gymSidebar && Store.get('useGymSidebar')
    if (serverSettings.gymFilters) {
        settings.includedGymTeams = Store.get('includedGymTeams')
        settings.minGymLevel = Store.get('minGymLevel')
        settings.maxGymLevel = Store.get('maxGymLevel')
        settings.showOpenSpotGymsOnly = Store.get('showOpenSpotGymsOnly')
        settings.showExGymsOnly = Store.get('showExGymsOnly')
        settings.showInBattleGymsOnly = Store.get('showInBattleGymsOnly')
        settings.gymLastScannedHours = Store.get('gymLastScannedHours')
    }
    settings.showRaids = serverSettings.raids && Store.get('showRaids')
    settings.raidNotifs = serverSettings.raids && Store.get('raidNotifs')
    if (serverSettings.raidFilters) {
        settings.filterRaidPokemon = Store.get('filterRaidPokemon')
        settings.excludedRaidPokemon = Store.get('excludedRaidPokemon')
        settings.showActiveRaidsOnly = Store.get('showActiveRaidsOnly')
        settings.showExEligibleRaidsOnly = Store.get('showExEligibleRaidsOnly')
        settings.includedRaidLevels = Store.get('includedRaidLevels')
        settings.raidPokemonNotifs = Store.get('raidPokemonNotifs')
        settings.notifRaidPokemon = Store.get('notifRaidPokemon')
        settings.notifEggs = Store.get('notifEggs')
    }

    settings.showPokestops = serverSettings.pokestops && Store.get('showPokestops')
    settings.pokestopNotifs = (serverSettings.quests || serverSettings.invasions || serverSettings.lures) && Store.get('pokestopNotifs')
    if (serverSettings.pokestops) {
        settings.showPokestopsNoEvent = Store.get('showPokestopsNoEvent')
        settings.showQuests = serverSettings.quests && Store.get('showQuests')
        settings.showInvasions = serverSettings.invasions && Store.get('showInvasions')
        settings.includedLureTypes = serverSettings.lures ? Store.get('includedLureTypes') : []
    }
    if (serverSettings.quests) {
        settings.filterQuests = Store.get('filterQuests')
        settings.excludedQuestPokemon = Store.get('excludedQuestPokemon')
        settings.excludedQuestItems = Store.get('excludedQuestItems')
        settings.questNotifs = Store.get('questNotifs')
        settings.notifQuestPokemon = Store.get('notifQuestPokemon')
        settings.notifQuestItems = Store.get('notifQuestItems')
    }
    if (serverSettings.invasions) {
        settings.filterInvasions = Store.get('filterInvasions')
        settings.excludedInvasions = Store.get('excludedInvasions')
        settings.invasionNotifs = Store.get('invasionNotifs')
        settings.notifInvasions = Store.get('notifInvasions')
    }
    if (serverSettings.lures) {
        settings.notifLureTypes = Store.get('notifLureTypes')
    }

    settings.showWeather = serverSettings.weather && Store.get('showWeather')
    if (serverSettings.weather) {
        settings.showMainWeather = Store.get('showMainWeather')
        settings.showWeatherCells = Store.get('showWeatherCells')
    }

    settings.showSpawnpoints = serverSettings.spawnpoints && Store.get('showSpawnpoints')
    settings.showScannedLocations = serverSettings.scannedLocs && Store.get('showScannedLocations')

    settings.showPokemonNests = serverSettings.pokemonNests && Store.get('showPokemonNests')
    settings.showNestParks = serverSettings.nestParks && Store.get('showNestParks')
    settings.showExParks = serverSettings.exParks && Store.get('showExParks')

    settings.showS2Cells = serverSettings.s2Cells && Store.get('showS2Cells')
    if (serverSettings.s2Cells) {
        settings.showS2CellsLevel10 = Store.get('showS2CellsLevel10')
        settings.showS2CellsLevel13 = Store.get('showS2CellsLevel13')
        settings.showS2CellsLevel14 = Store.get('showS2CellsLevel14')
        settings.showS2CellsLevel17 = Store.get('showS2CellsLevel17')
        settings.warnHiddenS2Cells = Store.get('warnHiddenS2Cells')
    }

    settings.showRanges = serverSettings.ranges && Store.get('showRanges')
    if (serverSettings.ranges) {
        settings.includedRangeTypes = Store.get('includedRangeTypes')
    }

    settings.startAtUserLocation = hasLocationSupport() && Store.get('startAtUserLocation')
    settings.startAtLastLocation = Store.get('startAtLastLocation')
    settings.isStartLocationMarkerMovable = serverSettings.isStartMarkerMovable && Store.get('isStartLocationMarkerMovable')
    settings.followUserLocation = hasLocationSupport() && Store.get('followUserLocation')

    settings.showBrowserPopups = Store.get('showBrowserPopups')
    settings.playSound = Store.get('playSound')
    settings.upscaleNotifMarkers = Store.get('upscaleNotifMarkers')
    settings.bounceNotifMarkers = Store.get('bounceNotifMarkers')

    settings.mapServiceProvider = Store.get('mapServiceProvider')
    settings.startLocationMarkerStyle = Store.get('startLocationMarkerStyle')
    settings.userLocationMarkerStyle = Store.get('userLocationMarkerStyle')
    settings.darkMode = Store.get('darkMode')

    settings.clusterZoomLevel = isMobileDevice() ? serverSettings.clusterZoomLevelMobile : serverSettings.clusterZoomLevel
}

function initSettingsSidebar() {
    $('#settings-sidenav').sidenav({
        draggable: false
    })
    $('.collapsible').collapsible()

    let settingsSideNavElem = document.getElementById('settings-sidenav')
    settingsSideNav = M.Sidenav.getInstance(settingsSideNavElem)
    $('.sidenav-trigger[data-target="settings-sidenav"]').on('click', function (e) {
        if (settingsSideNav.isOpen) {
            settingsSideNav.close()
            e.stopPropagation()
        }
    })

    if (serverSettings.pokemons) {
        $('#pokemon-switch').on('change', function () {
            settings.showPokemon = this.checked
            const filtersWrapper = $('.pokemon-filters-wrapper')
            if (this.checked) {
                filtersWrapper.show()
                lastpokemon = false
                updateMap()
            } else {
                filtersWrapper.hide()
                updatePokemons()
            }
            Store.set('showPokemon', this.checked)
        })

        $('#filter-pokemon-switch').on('change', function () {
            settings.filterPokemonById = this.checked
            const filterButton = $('a[data-target="pokemon-filter-modal"]')
            if (this.checked) {
                filterButton.show()
                updatePokemons()
            } else {
                filterButton.hide()
                reincludedPokemon = union(reincludedPokemon, settings.excludedPokemon)
                updateMap()
            }
            Store.set('filterPokemonById', this.checked)
        })

        $('#pokemon-icon-size-select').on('change', function () {
            const iconSize = Number(this.value)
            settings.pokemonIconSizeModifier = iconSize
            updatePokemons()
            Store.set('pokemonIconSizeModifier', iconSize)
        })
    }

    if (serverSettings.pokemonValues) {
        $('#pokemon-values-switch').on('change', function () {
            settings.showPokemonValues = this.checked
            const filterValuesWrapper = $('#filter-pokemon-values-wrapper')
            if (this.checked) {
                filterValuesWrapper.show()
            } else {
                filterValuesWrapper.hide()
                if (settings.filterPokemonByValues) {
                    lastpokemon = false
                    updateMap()
                }
            }
            updatePokemons()
            Store.set('showPokemonValues', this.checked)
        })

        $('#filter-values-switch').on('change', function () {
            settings.filterPokemonByValues = this.checked
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
            Store.set('filterPokemonByValues', this.checked)
        })

        $('#zero-ivs-pokemon-switch').on('change', function () {
            settings.showZeroIvsPokemon = this.checked
            if (this.checked) {
                lastpokemon = false
                updateMap()
            } else {
                updatePokemons(new Set(), true)
            }
            Store.set('showZeroIvsPokemon', this.checked)
        })

        $('#hundo-ivs-pokemon-switch').on('change', function () {
            settings.showHundoIvsPokemon = this.checked
            if (this.checked) {
                lastpokemon = false
                updateMap()
            } else {
                updatePokemons(new Set(), true)
            }
            Store.set('showHundoIvsPokemon', this.checked)
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

            $('#pokemon-ivs-slider-title').text(`${i8ln('IVs')} (${settings.minIvs}% - ${settings.maxIvs}%)`)
            const zeroIvsWrapper = $('#zero-ivs-pokemon-switch-wrapper')
            const hundoIvsWrapper = $('#hundo-ivs-pokemon-switch-wrapper')
            if (settings.minIvs > 0) {
                zeroIvsWrapper.show()
            } else {
                zeroIvsWrapper.hide()
            }
            if (settings.maxIvs < 100) {
                hundoIvsWrapper.show()
            } else {
                hundoIvsWrapper.hide()
            }

            if (settings.minIvs > oldMinIvs || settings.maxIvs < oldMaxIvs) {
                updatePokemons(new Set(), true)
            } else {
                lastpokemon = false
                updateMap()
            }

            Store.set('minIvs', settings.minIvs)
            Store.set('maxIvs', settings.maxIvs)
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
            $('#pokemon-level-slider-title').text(`${i8ln('Levels')} (${settings.minLevel} - ${settings.maxLevel})`)

            if (settings.minLevel > oldMinLevel || settings.maxLevel < oldMaxLevel) {
                updatePokemons()
            } else {
                lastpokemon = false
                updateMap([], true)
            }

            Store.set('minLevel', settings.minLevel)
            Store.set('maxLevel', settings.maxLevel)
        })
    }

    if (serverSettings.rarity) {
        $('#rarity-select').on('change', function () {
            const oldIncludedRarities = settings.includedRarities
            settings.includedRarities = $(this).val().map(Number)
            if (settings.includedRarities.length < oldIncludedRarities.length) {
                updatePokemons()
            } else {
                lastpokemon = false
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

    if (serverSettings.gyms) {
        $('#gym-switch').on('change', function () {
            settings.showGyms = this.checked
            const filtersWrapper = $('#gym-filters-wrapper')
            const nameFilterSidebarWrapper = $('#gym-name-filter-sidebar-wrapper')
            if (this.checked) {
                if (serverSettings.gymFilters) {
                    filtersWrapper.show()
                }
                if (!settings.showRaids) {
                    nameFilterSidebarWrapper.show()
                }
                lastgyms = false
                updateMap()
            } else {
                if (serverSettings.gymFilters) {
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

    if (serverSettings.gymSidebar) {
        $('#gym-sidebar-switch').on('change', function () {
            settings.useGymSidebar = this.checked
            if (!this.checked && gymSidebar.isOpen) {
                gymSidebar.close()
            }
            readdGymMarkers()
            Store.set('useGymSidebar', this.checked)
        })
    }

    if (serverSettings.gymFilters) {
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
            $('#gym-level-slider-title').text(`${i8ln('Gym levels')} (${settings.minGymLevel} - ${settings.maxGymLevel})`)

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

    if (serverSettings.raids) {
        $('#raid-switch').on('change', function () {
            settings.showRaids = this.checked
            const filtersWrapper = $('#raid-filters-wrapper')
            const nameFilterSidebarWrapper = $('#gym-name-filter-sidebar-wrapper')
            if (this.checked) {
                if (serverSettings.raidFilters) {
                    filtersWrapper.show()
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
                if (serverSettings.raidFilters) {
                    filtersWrapper.hide()
                }
                if (!settings.showGyms) {
                    nameFilterSidebarWrapper.hide()
                }
                updateGyms()
            }
            Store.set('showRaids', this.checked)
        })
    }

    if (serverSettings.raidFilters) {
        $('#filter-raid-pokemon-switch').on('change', function () {
            settings.filterRaidPokemon = this.checked
            const filterButton = $('a[data-target="raid-pokemon-filter-modal"]')
            if (this.checked) {
                filterButton.show()
                updateGyms()
            } else {
                filterButton.hide()
                if (settings.showGyms) {
                    updateGyms()
                }
                lastgyms = false
                updateMap()
            }
            Store.set('filterRaidPokemon', this.checked)
        })

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

    if (serverSettings.pokestops) {
        $('#pokestop-switch').on('change', function () {
            settings.showPokestops = this.checked
            const filtersWrapper = $('.pokestop-filters-wrapper')
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

    if (serverSettings.quests) {
        $('#quest-switch').on('change', function () {
            settings.showQuests = this.checked
            let wrapper = $('#filter-quests-switch-wrapper')
            if (this.checked) {
                wrapper.show()
            } else {
                wrapper.hide()
            }
            updatePokestops()
            lastpokestops = false
            updateMap()
            Store.set('showQuests', this.checked)
        })

        $('#filter-quests-switch').on('change', function () {
            settings.filterQuests = this.checked
            let filterButton = $('a[data-target="quest-filter-modal"]')
            if (this.checked) {
                filterButton.show()
            } else {
                filterButton.hide()
            }
            updatePokestops()
            lastpokestops = false
            updateMap()
            Store.set('filterQuests', this.checked)
        })
    }

    if (serverSettings.invasions) {
        $('#invasion-switch').on('change', function () {
            settings.showInvasions = this.checked
            let wrapper = $('#filter-invasions-switch-wrapper')
            if (this.checked) {
                wrapper.show()
            } else {
                wrapper.hide()
            }
            updatePokestops()
            lastpokestops = false
            updateMap()
            Store.set('showInvasions', this.checked)
        })

        $('#filter-invasions-switch').on('change', function () {
            settings.filterInvasions = this.checked
            let filterButton = $('a[data-target="invasion-filter-modal"]')
            if (this.checked) {
                filterButton.show()
            } else {
                filterButton.hide()
            }
            updatePokestops()
            lastpokestops = false
            updateMap()
            Store.set('filterInvasions', this.checked)
        })
    }

    if (serverSettings.lures) {
        $('#lure-type-select').on('change', function () {
            settings.includedLureTypes = $(this).val().map(Number)
            updatePokestops()
            lastpokestops = false
            updateMap()
            Store.set('includedLureTypes', settings.includedLureTypes)
        })
    }

    if (serverSettings.weather) {
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

    if (serverSettings.spawnpoints) {
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

    if (serverSettings.scannedLocs) {
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
    
    if (serverSettings.pokemonNests) {
        $('#pokemon-nests-park-switch').on('change', function () {
            settings.showPokemonNests = this.checked
            if (this.checked) {
                updatePokemonNests()
            } else {
                pokemonNestsLayerGroup.clearLayers()
            }
            Store.set('showPokemonNests', this.checked)
        })
    }

    if (serverSettings.nestParks) {
        $('#nest-park-switch').on('change', function () {
            settings.showNestParks = this.checked
            if (this.checked) {
                updateNestParks()
            } else {
                nestParksLayerGroup.clearLayers()
            }
            Store.set('showNestParks', this.checked)
        })
    }

    if (serverSettings.exParks) {
        $('#ex-park-switch').on('change', function () {
            settings.showExParks = this.checked
            if (this.checked) {
                updateExParks()
            } else {
                exParksLayerGroup.clearLayers()
            }
            Store.set('showExParks', this.checked)
        })
    }

    if (serverSettings.s2Cells) {
        $('#s2-cell-switch').on('change', function () {
            settings.showS2Cells = this.checked
            const filtersWrapper = $('#s2-filters-wrapper')
            if (this.checked) {
                filtersWrapper.show()
                updateS2Overlay()
            } else {
                filtersWrapper.hide()
                s2CellsLayerGroup.clearLayers()
            }
            Store.set('showS2Cells', this.checked)
        })

        $('#s2-level10-switch').on('change', function () {
            settings.showS2CellsLevel10 = this.checked
            updateS2Overlay()
            Store.set('showS2CellsLevel10', this.checked)
        })

        $('#s2-level13-switch').on('change', function () {
            settings.showS2CellsLevel13 = this.checked
            updateS2Overlay()
            Store.set('showS2CellsLevel13', this.checked)
        })

        $('#s2-level14-switch').on('change', function () {
            settings.showS2CellsLevel14 = this.checked
            updateS2Overlay()
            Store.set('showS2CellsLevel14', this.checked)
        })

        $('#s2-level17-switch').on('change', function () {
            settings.showS2CellsLevel17 = this.checked
            updateS2Overlay()
            Store.set('showS2CellsLevel17', this.checked)
        })

        $('#s2-cells-warning-switch').on('change', function () {
            settings.warnHiddenS2Cells = this.checked
            Store.set('warnHiddenS2Cells', this.checked)
        })
    }

    if (serverSettings.ranges) {
        $('#ranges-switch').on('change', function () {
            settings.showRanges = this.checked
            const rangeTypeWrapper = $('#range-type-select-wrapper')
            if (this.checked) {
                rangeTypeWrapper.show()
            } else {
                rangeTypeWrapper.hide()
            }
            if (settings.includedRangeTypes.includes(1)) {
                updatePokemons()
            }
            if (settings.includedRangeTypes.includes(2)) {
                updateGyms()
            }
            if (settings.includedRangeTypes.includes(3)) {
                updatePokestops()
            }
            if (settings.includedRangeTypes.includes(4)) {
                updateSpawnpoints()
            }
            Store.set('showRanges', this.checked)
        })

        $('#range-type-select').on('change', function () {
            const oldIncludedRangeTypes = settings.includedRangeTypes
            settings.includedRangeTypes = $(this).val().map(Number)
            if (settings.includedRangeTypes.includes(1) !== oldIncludedRangeTypes.includes(1)) {
                updatePokemons()
            } else if (settings.includedRangeTypes.includes(2) !== oldIncludedRangeTypes.includes(2)) {
                updateGyms()
            } else if (settings.includedRangeTypes.includes(3) !== oldIncludedRangeTypes.includes(3)) {
                updatePokestops()
            } else if (settings.includedRangeTypes.includes(4) !== oldIncludedRangeTypes.includes(4)) {
                updateSpawnpoints()
            }
            Store.set('includedRangeTypes', settings.includedRangeTypes)
        })
    }

    if (hasLocationSupport()) {
        $('#start-at-user-location-switch').on('change', function () {
            settings.startAtUserLocation = this.checked
            if (settings.startAtLastLocation && this.checked) {
                $('#start-at-last-location-switch').prop('checked', false)
                settings.startAtLastLocation = false
                Store.set('startAtLastLocation', false)
            }
            Store.set('startAtUserLocation', this.checked)
        })
    } else {
        $('#start-at-user-location-wrapper').hide()
    }

    $('#start-at-last-location-switch').on('change', function () {
        settings.startAtLastLocation = this.checked
        if (this.checked) {
            if (settings.startAtUserLocation) {
                $('#start-at-user-location-switch').prop('checked', false)
                settings.startAtUserLocation = false
                Store.set('startAtUserLocation', false)
            }

            const position = map.getCenter()
            Store.set('startAtLastLocationPosition', {
                lat: position.lat,
                lng: position.lng
            })
        }
        Store.set('startAtLastLocation', this.checked)
    })

    if (serverSettings.isStartMarkerMovable) {
        $('#lock-start-marker-switch').on('change', function () {
            settings.isStartLocationMarkerMovable = !this.checked
            if (startLocationMarker) {
                if (this.checked) {
                    startLocationMarker.dragging.disable()
                } else {
                    startLocationMarker.dragging.enable()
                }
            }
            Store.set('isStartLocationMarkerMovable', !this.checked)
        })
    }

    if (hasLocationSupport()) {
        $('#follow-user-location-switch').on('change', function () {
            settings.followUserLocation = this.checked
            if (this.checked) {
                startFollowingUser()
            } else {
                stopFollowingUser()
            }
            Store.set('followUserLocation', this.checked)
        })
    } else {
        $('#follow-user-location-wrapper').hide()
    }

    if (serverSettings.pokemons) {
        $('#pokemon-notifs-switch').on('change', function () {
            settings.pokemonNotifs = this.checked
            let wrapper = $('#pokemon-notif-filters-wrapper')
            if (this.checked) {
                wrapper.show()
                if (settings.showNotifPokemonAlways) {
                    lastpokemon = false
                    updateMap()
                }
            } else {
                wrapper.hide()
                if (settings.showNotifPokemonOnly) {
                    lastpokemon = false
                    updateMap()
                }
            }
            updatePokemons()
            Store.set('pokemonNotifs', this.checked)
        })

        $('#pokemon-id-notifs-switch').on('change', function () {
            settings.pokemonIdNotifs = this.checked
            let filterButton = $('a[data-target="notif-pokemon-filter-modal"]')
            if (this.checked) {
                filterButton.show()
                if (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways) {
                    lastpokemon = false
                    updateMap()
                }
            } else {
                filterButton.hide()
            }
            updatePokemons()
            Store.set('pokemonIdNotifs', this.checked)
        })
    }

    if (serverSettings.pokemonValues) {
        $('#pokemon-values-notifs-switch').on('change', function () {
            settings.pokemonValuesNotifs = this.checked
            let wrapper = $('#pokemon-values-notif-filters-wrapper')
            let filterButton = $('a[data-target="notif-pokemon-values-filter-modal"]')
            if (this.checked) {
                wrapper.show()
                filterButton.show()
                if (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways) {
                    lastpokemon = false
                    updateMap()
                }
            } else {
                wrapper.hide()
                filterButton.hide()
            }
            updatePokemons(new Set(), true)
            Store.set('pokemonValuesNotifs', this.checked)
        })

        $('#zero-ivs-pokemon-notifs-switch').on('change', function () {
            settings.zeroIvsPokemonNotifs = this.checked
            if (this.checked && (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways)) {
                lastpokemon = false
                updateMap()
            }
            updatePokemons(new Set(), true)
            Store.set('zeroIvsPokemonNotifs', this.checked)
        })

        $('#hundo-ivs-pokemon-notifs-switch').on('change', function () {
            settings.hundoIvsPokemonNotifs = this.checked
            if (this.checked && (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways)) {
                lastpokemon = false
                updateMap()
            }
            updatePokemons(new Set(), true)
            Store.set('hundoIvsPokemonNotifs', this.checked)
        })

        var pokemonIvsNotifsSlider = document.getElementById('pokemon-ivs-notifs-slider')
        noUiSlider.create(pokemonIvsNotifsSlider, {
            start: [settings.minNotifIvs, settings.maxNotifIvs],
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
        pokemonIvsNotifsSlider.noUiSlider.on('change', function () {
            const oldMinIvs = settings.minNotifIvs
            const oldMaxIvs = settings.maxNotifIvs
            settings.minNotifIvs = this.get()[0]
            settings.maxNotifIvs = this.get()[1]

            $('#pokemon-ivs-notifs-slider-title').text(`${i8ln('Notif IVs')} (${settings.minNotifIvs}% - ${settings.maxNotifIvs}%)`)
            const zeroIvsWrapper = $('#zero-ivs-pokemon-notifs-switch-wrapper')
            const hundoIvsWrapper = $('#hundo-ivs-pokemon-notifs-switch-wrapper')
            if (settings.minNotifIvs > 0) {
                zeroIvsWrapper.show()
            } else {
                zeroIvsWrapper.hide()
            }
            if (settings.maxNotifIvs < 100) {
                hundoIvsWrapper.show()
            } else {
                hundoIvsWrapper.hide()
            }

            if ((settings.minNotifIvs < oldMinIvs || settings.maxNotifIvs > oldMaxIvs) &&
                    (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways)) {
                lastpokemon = false
                updateMap()
            }
            updatePokemons(new Set(), true)

            Store.set('minNotifIvs', settings.minNotifIvs)
            Store.set('maxNotifIvs', settings.maxNotifIvs)
        })

        var pokemonLevelNotifsSlider = document.getElementById('pokemon-level-notifs-slider')
        noUiSlider.create(pokemonLevelNotifsSlider, {
            start: [settings.minNotifLevel, settings.maxNotifLevel],
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
        pokemonLevelNotifsSlider.noUiSlider.on('change', function () {
            const oldMinLevel = settings.minNotifLevel
            const oldMaxLevel = settings.maxNotifLevel
            settings.minNotifLevel = this.get()[0]
            settings.maxNotifLevel = this.get()[1]
            $('#pokemon-level-notifs-slider-title').text(`${i8ln('Notif Levels')} (${settings.minNotifLevel} - ${settings.maxNotifLevel})`)

            if ((settings.minNotifLevel < oldMinLevel || settings.maxNotifLevel > oldMaxLevel) &&
                    (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways)) {
                lastpokemon = false
                updateMap()
            }
            updatePokemons(new Set(), true)

            Store.set('minNotifLevel', settings.minNotifLevel)
            Store.set('maxNotifLevel', settings.maxNotifLevel)
        })

        $('#tiny-rattata-notifs-switch').on('change', function () {
            settings.tinyRattataNotifs = this.checked
            if (this.checked && (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways)) {
                reincludedPokemon.add(19)
                updateMap()
            }
            updatePokemons(new Set([19]), true)
            Store.set('tinyRattataNotifs', this.checked)
        })

        $('#big-magikarp-notifs-switch').on('change', function () {
            settings.bigMagikarpNotifs = this.checked
            if (this.checked && (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways)) {
                reincludedPokemon.add(129)
                updateMap()
            }
            updatePokemons(new Set([129]), true)
            Store.set('bigMagikarpNotifs', this.checked)
        })
    }

    if (serverSettings.rarity) {
        $('#rarity-notifs-select').on('change', function () {
            const oldNotifRarities = settings.notifRarities
            settings.notifRarities = $(this).val().map(Number)
            if (settings.notifRarities.length > oldNotifRarities.length &&
                    (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways)) {
                lastpokemon = false
                updateMap()
            }
            updatePokemons()
            Store.set('notifRarities', settings.notifRarities)
        })
    }

    if (serverSettings.pokemons) {
        $('#notif-pokemon-only-switch').on('change', function () {
            settings.showNotifPokemonOnly = this.checked
            if (this.checked) {
                updatePokemons()
            } else {
                lastpokemon = false
                updateMap()
            }
            Store.set('showNotifPokemonOnly', this.checked)
        })

        $('#notif-pokemon-always-switch').on('change', function () {
            settings.showNotifPokemonAlways = this.checked
            if (this.checked) {
                lastpokemon = false
                updateMap()
            } else {
                updatePokemons()
            }
            Store.set('showNotifPokemonAlways', this.checked)
        })
    }

    if (serverSettings.pokemonCries) {
        $('#pokemon-cries-switch').on('change', function () {
            settings.playCries = this.checked
            Store.set('playCries', this.checked)
        })
    }

    if (serverSettings.raids) {
        $('#raid-notifs-switch').on('change', function () {
            settings.raidNotifs = this.checked
            let wrapper = $('#raid-notif-filters-wrapper')
            if (this.checked) {
                wrapper.show()
            } else {
                wrapper.hide()
            }
            updateGyms()
            Store.set('raidNotifs', this.checked)
        })

        $('#raid-pokemon-notifs-switch').on('change', function () {
            settings.raidPokemonNotifs = this.checked
            let filterButton = $('a[data-target="notif-raid-pokemon-filter-modal"]')
            if (this.checked) {
                filterButton.show()
            } else {
                filterButton.hide()
            }
            updateGyms()
            Store.set('raidPokemonNotifs', this.checked)
        })

        $('#egg-notifs-select').on('change', function () {
            settings.notifEggs = $(this).val().map(Number)
            updateGyms()
            Store.set('notifEggs', settings.notifEggs)
        })
    }

    if (serverSettings.quests || serverSettings.invasions || serverSettings.lures) {
        $('#pokestop-notifs-switch').on('change', function () {
            settings.pokestopNotifs = this.checked
            let wrapper = $('#pokestop-notif-filters-wrapper')
            if (this.checked) {
                wrapper.show()
            } else {
                wrapper.hide()
            }
            updatePokestops()
            Store.set('pokestopNotifs', this.checked)
        })
    }

    if (serverSettings.quests) {
        $('#quest-notifs-switch').on('change', function () {
            settings.questNotifs = this.checked
            let filterButton = $('a[data-target="notif-quest-filter-modal"]')
            if (this.checked) {
                filterButton.show()
            } else {
                filterButton.hide()
            }
            updatePokestops()
            Store.set('questNotifs', this.checked)
        })
    }

    if (serverSettings.invasions) {
        $('#invasion-notifs-switch').on('change', function () {
            settings.invasionNotifs = this.checked
            let filterButton = $('a[data-target="notif-invasion-filter-modal"]')
            if (this.checked) {
                filterButton.show()
            } else {
                filterButton.hide()
            }
            updatePokestops()
            Store.set('invasionNotifs', this.checked)
        })
    }

    if (serverSettings.lures) {
        $('#lure-notifs-select').on('change', function () {
            settings.notifLureTypes = $(this).val().map(Number)
            updatePokestops()
            Store.set('notifLureTypes', settings.notifLureTypes)
        })
    }

    $('#browser-popups-switch').on('change', function () {
        settings.showBrowserPopups = this.checked
        Store.set('showBrowserPopups', this.checked)
    })

    $('#notif-sound-switch').on('change', function () {
        settings.playSound = this.checked
        let criesWrapper = $('#pokemon-cries-switch-wrapper')
        if (this.checked) {
            criesWrapper.show()
        } else {
            criesWrapper.hide()
        }
        Store.set('playSound', this.checked)
    })

    $('#upscale-notif-markers-switch').on('change', function () {
        settings.upscaleNotifMarkers = this.checked
        if (settings.pokemonNotifs) {
            updatePokemons()
        }
        if (settings.raidNotifs) {
            updateGyms()
        }
        if (settings.pokestopNotifs) {
            updatePokestops()
        }
        Store.set('upscaleNotifMarkers', this.checked)
    })

    $('#bounce-notif-markers-switch').on('change', function () {
        settings.bounceNotifMarkers = this.checked
        if (settings.pokemonNotifs) {
            updatePokemons()
        }
        if (settings.raidNotifs) {
            updateGyms()
        }
        if (settings.pokestopNotifs) {
            updatePokestops()
        }
        Store.set('bounceNotifMarkers', this.checked)
    })

    $('#map-style-select').on('change', function () {
        setTileLayer(this.value, map)
        Store.set('mapStyle', this.value)
    })

    $('#map-service-provider-select').on('change', function () {
        settings.mapServiceProvider = this.value
        if (settings.showPokemon) {
            updatePokemons()
        }
        if (settings.showGyms || settings.showRaids) {
            updateGyms()
        }
        if (settings.showPokestops) {
            updatePokestops()
        }
        if (settings.showSpawnpoints) {
            updateSpawnpoints()
        }
        Store.set('mapServiceProvider', this.value)
    })

    $('#start-location-marker-icon-select').on('change', function () {
        settings.startLocationMarkerStyle = this.value
        updateStartLocationMarker()
        Store.set('startLocationMarkerStyle', this.value)
    })

    $('#user-location-marker-icon-select').on('change', function () {
        settings.userLocationMarkerStyle = this.value
        updateUserLocationMarker()
        Store.set('userLocationMarkerStyle', this.value)
    })

    $('#dark-mode-switch').on('change', function () {
        settings.darkMode = this.checked
        if (this.checked) {
            enableDarkMode()
        } else {
            disableDarkMode()
        }
        Store.set('darkMode', this.checked)
    })

    $('#settings-file-input').on('change', function () {
        function loaded(e) {
            const confirmed = confirm('Are you sure you want to import settings?')
            if (!confirmed) {
                return
            }

            let fileString = e.target.result
            Object.assign(localStorage, JSON.parse(fileString))
            window.location.reload()
        }

        function error(e) {
            console.error('Error while loading settings file: ' + e)
            toastError(i8ln('Error while loading settings file!'), i8ln('Please try again.'))
        }

        let elem = document.getElementById('settings-file-input')
        if (elem.value != '') {
            let file = elem.files[0]
            loadData(file, loaded, error)
            // Reset file input.
            $(this).val('')
        }
    })

    $('#export-settings-button').on('click', function () {
        downloadData('rocketmad_settings', JSON.stringify(localStorage))
    })

    $('#reset-settings-button').on('click', function () {
        const confirmed = confirm('Are you sure you want to reset all settings to default values?')
        if (confirmed) {
            localStorage.clear()
            window.location.reload()
        }
    })

    // Pokemon.
    if (serverSettings.pokemons) {
        $('#pokemon-switch').prop('checked', settings.showPokemon)
        $('.pokemon-filters-wrapper').toggle(settings.showPokemon)
        $('#filter-pokemon-switch').prop('checked', settings.filterPokemonById)
        $('a[data-target="pokemon-filter-modal"]').toggle(settings.filterPokemonById)
        $('#pokemon-icon-size-select').val(settings.pokemonIconSizeModifier)
    }
    if (serverSettings.pokemonValues) {
        $('#pokemon-values-switch').prop('checked', settings.showPokemonValues)
        $('#filter-pokemon-values-wrapper').toggle(settings.showPokemonValues)
        $('#filter-values-switch').prop('checked', settings.filterPokemonByValues)
        $('a[data-target="pokemon-values-filter-modal"]').toggle(settings.filterPokemonByValues)
        $('#pokemon-values-filters-wrapper').toggle(settings.filterPokemonByValues)
        $('#pokemon-ivs-slider-title').text(`${i8ln('IVs')} (${settings.minIvs}% - ${settings.maxIvs}%)`)
        $('#pokemon-ivs-slider-wrapper').toggle(settings.filterPokemonByValues)
        $('#zero-ivs-pokemon-switch').prop('checked', settings.showZeroIvsPokemon)
        $('#zero-ivs-pokemon-switch-wrapper').toggle(settings.minIvs > 0)
        $('#hundo-ivs-pokemon-switch').prop('checked', settings.showHundoIvsPokemon)
        $('#hundo-ivs-pokemon-switch-wrapper').toggle(settings.maxIvs < 100)
        $('#pokemon-level-slider-title').text(`${i8ln('Levels')} (${settings.minLevel} - ${settings.maxLevel})`)
        $('#pokemon-level-slider-wrapper').toggle(settings.filterPokemonByValues)
    }
    if (serverSettings.rarity) {
        $('#rarity-select').val(settings.includedRarities)
        $('#rarity-notifs-select').val(settings.notifRarities)
        $('#scale-rarity-switch').prop('checked', settings.scaleByRarity)
    }

    // Gyms and Raids.
    if (serverSettings.gyms || serverSettings.raids) {
        $('#gym-name-filter-sidebar-wrapper').toggle(settings.showGyms || settings.showRaids)
        if (serverSettings.gym_sidebar) {
            $('#gym-sidebar-switch').prop('checked', settings.useGymSidebar)
        }
    }
    if (serverSettings.gymSidebar) {
        $('#gym-sidebar-switch').prop('checked', settings.useGymSidebar)
    }
    if (serverSettings.gyms) {
        $('#gym-switch').prop('checked', settings.showGyms)
    }
    if (serverSettings.gymFilters) {
        $('#gym-filters-wrapper').toggle(settings.showGyms)
        $('#gym-team-select').val(settings.includedGymTeams)
        $('#gym-level-slider-title').text(`${i8ln('Gym levels')} (${settings.minGymLevel} - ${settings.maxGymLevel})`)
        $('#gym-open-spot-switch').prop('checked', settings.showOpenSpotGymsOnly)
        $('#gym-ex-eligible-switch').prop('checked', settings.showExGymsOnly)
        $('#gym-in-battle-switch').prop('checked', settings.showInBattleGymsOnly)
        $('#gym-last-scanned-select').val(settings.gymLastScannedHours)
    }
    if (serverSettings.raids) {
        $('#raid-switch').prop('checked', settings.showRaids)
    }
    if (serverSettings.raidFilters) {
        $('#filter-raid-pokemon-switch').prop('checked', settings.filterRaidPokemon)
        $('a[data-target="raid-pokemon-filter-modal"]').toggle(settings.filterRaidPokemon)
        $('#raid-filters-wrapper').toggle(settings.showRaids)
        $('#raid-active-switch').prop('checked', settings.showActiveRaidsOnly)
        $('#raid-ex-eligible-switch').prop('checked', settings.showExEligibleRaidsOnly)
        $('#raid-level-select').val(settings.includedRaidLevels)
    }

    // Pokestops.
    if (serverSettings.pokestops) {
        $('#pokestop-switch').prop('checked', settings.showPokestops)
        $('.pokestop-filters-wrapper').toggle(settings.showPokestops)
        $('#pokestop-no-event-switch').prop('checked', settings.showPokestopsNoEvent)
    }
    if (serverSettings.quests) {
        $('#quest-switch').prop('checked', settings.showQuests)
        $('#filter-quests-switch-wrapper').toggle(settings.showQuests)
        $('#filter-quests-switch').prop('checked', settings.filterQuests)
        $('a[data-target="quest-filter-modal"]').toggle(settings.filterQuests)
    }
    if (serverSettings.invasions) {
        $('#invasion-switch').prop('checked', settings.showInvasions)
        $('#filter-invasions-switch-wrapper').toggle(settings.showInvasions)
        $('#filter-invasions-switch').prop('checked', settings.filterInvasions)
        $('a[data-target="invasion-filter-modal"]').toggle(settings.filterInvasions)
    }
    if (serverSettings.lures) {
        $('#lure-type-select').val(settings.includedLureTypes)
    }

    // Weather.
    if (serverSettings.weather) {
        $('#weather-switch').prop('checked', settings.showWeather)
        $('#weather-forms-wrapper').toggle(settings.showWeather)
        $('#weather-cells-switch').prop('checked', settings.showWeatherCells)
        $('#main-weather-switch').prop('checked', settings.showMainWeather)
    }

    // Map.
    if (serverSettings.spawnpoints) {
        $('#spawnpoint-switch').prop('checked', settings.showSpawnpoints)
    }
    if (serverSettings.scannedLocs) {
        $('#scanned-locs-switch').prop('checked', settings.showScannedLocations)
    }
    if (serverSettings.pokemonNests) {
        $('#pokemon-nests-park-switch').prop('checked', settings.showPokemonNests)
    }
    if (serverSettings.nestParks) {
        $('#nest-park-switch').prop('checked', settings.showNestParks)
    }
    if (serverSettings.exParks) {
        $('#ex-park-switch').prop('checked', settings.showExParks)
    }
    if (serverSettings.s2Cells) {
        $('#s2-cell-switch').prop('checked', settings.showS2Cells)
        $('#s2-filters-wrapper').toggle(settings.showS2Cells)
        $('#s2-level10-switch').prop('checked', settings.showS2CellsLevel10)
        $('#s2-level13-switch').prop('checked', settings.showS2CellsLevel13)
        $('#s2-level14-switch').prop('checked', settings.showS2CellsLevel14)
        $('#s2-level17-switch').prop('checked', settings.showS2CellsLevel17)
        $('#s2-cells-warning-switch').prop('checked', settings.warnHiddenS2Cells)
    }
    if (serverSettings.ranges) {
        $('#ranges-switch').prop('checked', settings.showRanges)
        $('#range-type-select-wrapper').toggle(settings.showRanges)
        $('#range-type-select').val(settings.includedRangeTypes)
    }

    // Location.
    if (hasLocationSupport()) {
        $('#start-at-user-location-switch').prop('checked', settings.startAtUserLocation)
    }
    $('#start-at-last-location-switch').prop('checked', settings.startAtLastLocation)
    if (serverSettings.isStartLocationMarkerMovable) {
        $('#lock-start-marker-switch').prop('checked', !settings.isStartLocationMarkerMovable)
    }
    if (hasLocationSupport()) {
        $('#follow-user-location-switch').prop('checked', settings.followUserLocation)
    }

    // Notifications.
    if (serverSettings.pokemons) {
        $('#pokemon-notifs-switch').prop('checked', settings.pokemonNotifs)
        $('#pokemon-id-notifs-switch').prop('checked', settings.pokemonIdNotifs)
        $('a[data-target="notif-pokemon-filter-modal"]').toggle(settings.pokemonIdNotifs)
        $('#pokemon-notif-filters-wrapper').toggle(settings.pokemonNotifs)
        $('#notif-pokemon-only-switch').prop('checked', settings.showNotifPokemonOnly)
        $('#notif-pokemon-always-switch').prop('checked', settings.showNotifPokemonAlways)
    }
    if (serverSettings.pokemonValues) {
        $('#pokemon-values-notifs-switch').prop('checked', settings.pokemonValuesNotifs)
        $('a[data-target="notif-pokemon-values-filter-modal"]').toggle(settings.pokemonValuesNotifs)
        $('#pokemon-values-notif-filters-wrapper').toggle(settings.pokemonValuesNotifs)
        $('#zero-ivs-pokemon-notifs-switch-wrapper').toggle(settings.minNotifIvs > 0)
        $('#zero-ivs-pokemon-notifs-switch').prop('checked', settings.zeroIvsPokemonNotifs)
        $('#hundo-ivs-pokemon-notifs-switch-wrapper').toggle(settings.maxNotifIvs < 100)
        $('#hundo-ivs-pokemon-notifs-switch').prop('checked', settings.hundoIvsPokemonNotifs)
        $('#pokemon-ivs-notifs-slider-title').text(`${i8ln('Notif IVs')} (${settings.minNotifIvs}% - ${settings.maxNotifIvs}%)`)
        $('#pokemon-level-notifs-slider-title').text(`${i8ln('Notif Levels')} (${settings.minNotifLevel} - ${settings.maxNotifLevel})`)
        $('#tiny-rattata-notifs-switch').prop('checked', settings.tinyRattataNotifs)
        $('#big-magikarp-notifs-switch').prop('checked', settings.bigMagikarpNotifs)
    }
    if (serverSettings.pokemonCries) {
        $('#pokemon-cries-switch').prop('checked', settings.playCries)
        $('#pokemon-cries-switch-wrapper').toggle(settings.playSound)
    }
    if (serverSettings.raids) {
        $('#raid-notifs-switch').prop('checked', settings.raidNotifs)
        $('#raid-notif-filters-wrapper').toggle(settings.raidNotifs)
        $('#raid-pokemon-notifs-switch').prop('checked', settings.raidPokemonNotifs)
        $('a[data-target="notif-raid-pokemon-filter-modal"]').toggle(settings.raidPokemonNotifs)
        $('#egg-notifs-select').val(settings.notifEggs)
    }
    if (serverSettings.quests || serverSettings.invasions || serverSettings.lures) {
        $('#pokestop-notifs-switch').prop('checked', settings.pokestopNotifs)
        $('#pokestop-notif-filters-wrapper').toggle(settings.pokestopNotifs)
    }
    if (serverSettings.quests) {
        $('#quest-notifs-switch').prop('checked', settings.questNotifs)
        $('a[data-target="notif-quest-filter-modal"]').toggle(settings.questNotifs)
    }
    if (serverSettings.invasions) {
        $('#invasion-notifs-switch').prop('checked', settings.invasionNotifs)
        $('a[data-target="notif-invasion-filter-modal"]').toggle(settings.invasionNotifs)
    }
    if (serverSettings.lures) {
        $('#lure-notifs-select').val(settings.notifLureTypes)
    }
    $('#browser-popups-switch').prop('checked', settings.showBrowserPopups)
    $('#notif-sound-switch').prop('checked', settings.playSound)
    $('#upscale-notif-markers-switch').prop('checked', settings.upscaleNotifMarkers)
    $('#bounce-notif-markers-switch').prop('checked', settings.bounceNotifMarkers)

    // Style.
    $('#map-style-select').val(Store.get('mapStyle'))
    $('#map-service-provider-select').val(settings.mapServiceProvider)
    $('#dark-mode-switch').prop('checked', settings.darkMode)

    $.getJSON('static/dist/data/markerstyles.min.json').done(function (data) {
        markerStyles = data
        updateStartLocationMarker()
        updateUserLocationMarker()
        $.each(data, function(id, value) {
            let dataIconStr = value.icon ? `data-icon="${value.icon}"` : ''
            const option = `<option value="${id}" ${dataIconStr}>${i8ln(value.name)}</option>`
            $('#start-location-marker-icon-select').append(option)
            $('#user-location-marker-icon-select').append(option)
        })
        $('#start-location-marker-icon-select').val(settings.startLocationMarkerStyle)
        $('#user-location-marker-icon-select').val(settings.userLocationMarkerStyle)
        $('#start-location-marker-icon-select').formSelect()
        $('#user-location-marker-icon-select').formSelect()
    }).fail(function () {
        console.log('Error loading search marker styles JSON.')
    })

    // Initialize select elements.
    $('select').formSelect()
}

function initPokemonFilters() {
    const pokemonIds = getPokemonIds()

    let list = ''
    for (let id of pokemonIds) {
        let pokemonIcon
        if (serverSettings.generateImages) {
            pokemonIcon = `<img class='lazy' src='static/images/placeholder.png' data-src='${getPokemonRawIconUrl({'pokemon_id': id})}' width='32'>`
        } else {
            pokemonIcon = `<i class='pokemon-sprite n${id}' width='32'></i>`
        }
        list += `
            <div class='filter-button' data-id='${id}'>
              <div class='filter-button-content'>
                <div>#${id}</div>
                <div>${pokemonIcon}</div>
                <div>${getPokemonName(id)}</div>
              </div>
            </div>`
    }
    $('.pokemon-filter-list').html(list)

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
        parent.find('input[id$=pokemon]').val(Array.from(pokemonIds).join(',')).trigger('change')
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

    if (serverSettings.pokemons) {
        $('#exclude-pokemon').val(Array.from(settings.excludedPokemon))
        if (settings.excludedPokemon.size === 0) {
            $('#filter-pokemon-title').text(`${i8ln('Pokémon')} (${i8ln('All')})`)
        } else {
            $('#filter-pokemon-title').text(`${i8ln('Pokémon')} (${pokemonIds.size - settings.excludedPokemon.size})`)
        }

        $('label[for="exclude-pokemon"] .pokemon-filter-list .filter-button').each(function () {
            if (!settings.excludedPokemon.has($(this).data('id'))) {
                $(this).addClass('active')
            }
        })

        $('#exclude-pokemon').on('change', function (e) {
            const prevExcludedPokemon = settings.excludedPokemon
            settings.excludedPokemon = $(this).val().length > 0 ? new Set($(this).val().split(',').map(Number)) : new Set()

            const newExcludedPokemon = difference(settings.excludedPokemon, prevExcludedPokemon)
            if (newExcludedPokemon.size > 0) {
                updatePokemons(newExcludedPokemon)
            }

            const newReincludedPokemon = difference(prevExcludedPokemon, settings.excludedPokemon)
            reincludedPokemon = union(reincludedPokemon, newReincludedPokemon)
            if (reincludedPokemon.size > 0) {
                updateMap()
            }

            if (settings.excludedPokemon.size === 0) {
                $('#filter-pokemon-title').text(`${i8ln('Pokémon')} (${i8ln('All')})`)
            } else {
                $('#filter-pokemon-title').text(`${i8ln('Pokémon')} (${pokemonIds.size - settings.excludedPokemon.size})`)
            }

            Store.set('excludedPokemon', settings.excludedPokemon)
        })
    }

    if (serverSettings.pokemonValues) {
        $('#unfiltered-pokemon').val(Array.from(settings.noFilterValuesPokemon))
        if (settings.noFilterValuesPokemon.size === 0) {
            $('#filter-values-pokemon-title').text(`${i8ln('Pokémon filtered by values')} (${i8ln('All')})`)
        } else {
            $('#filter-values-pokemon-title').text(`${i8ln('Pokémon filtered by values')} (${pokemonIds.size - settings.noFilterValuesPokemon.size})`)
        }

        $('label[for="unfiltered-pokemon"] .pokemon-filter-list .filter-button').each(function () {
            if (!settings.noFilterValuesPokemon.has($(this).data('id'))) {
                $(this).addClass('active')
            }
        })

        $('#unfiltered-pokemon').on('change', function (e) {
            const prevNoFilterValuesPokemon = settings.noFilterValuesPokemon
            settings.noFilterValuesPokemon = $(this).val().length > 0 ? new Set($(this).val().split(',').map(Number)) : new Set()

            const newFilterValuesPokemon = difference(prevNoFilterValuesPokemon, settings.noFilterValuesPokemon)
            if (newFilterValuesPokemon.size > 0) {
                updatePokemons(newFilterValuesPokemon)
            }

            const newNoFilterValuesPokemon = difference(settings.noFilterValuesPokemon, prevNoFilterValuesPokemon)
            reincludedPokemon = union(reincludedPokemon, newNoFilterValuesPokemon)
            if (reincludedPokemon.size > 0) {
                updateMap()
            }

            if (settings.noFilterValuesPokemon.size === 0) {
                $('#filter-values-pokemon-title').text(`${i8ln('Pokémon filtered by values')} (${i8ln('All')})`)
            } else {
                $('#filter-values-pokemon-title').text(`${i8ln('Pokémon filtered by values')} (${pokemonIds.size - settings.noFilterValuesPokemon.size})`)
            }

            Store.set('noFilterValuesPokemon', settings.noFilterValuesPokemon)
        })
    }

    if (serverSettings.raidFilters) {
        $('#exclude-raid-pokemon').val(Array.from(settings.excludedRaidPokemon))
        if (settings.excludedRaidPokemon.size === 0) {
            $('#filter-raid-pokemon-title').text(`${i8ln('Raid Bosses')} (${i8ln('All')})`)
        } else {
            $('#filter-raid-pokemon-title').text(`${i8ln('Raid Bosses')} (${pokemonIds.size - settings.excludedRaidPokemon.size})`)
        }

        $('label[for="exclude-raid-pokemon"] .pokemon-filter-list .filter-button').each(function () {
            if (!settings.excludedRaidPokemon.has($(this).data('id'))) {
                $(this).addClass('active')
            }
        })

        $('#exclude-raid-pokemon').on('change', function (e) {
            const prevExcludedPokemon = settings.excludedRaidPokemon
            settings.excludedRaidPokemon = $(this).val().length > 0 ? new Set($(this).val().split(',').map(Number)) : new Set()

            const newExcludedPokemon = difference(settings.excludedRaidPokemon, prevExcludedPokemon)
            if (newExcludedPokemon.size > 0 || settings.showGyms) {
                updateGyms()
            }

            const newIncludedPokemon = difference(prevExcludedPokemon, settings.excludedRaidPokemon)
            if (newIncludedPokemon.size > 0) {
                lastgyms = false
                updateMap()
            }

            if (settings.excludedRaidPokemon.size === 0) {
                $('#filter-raid-pokemon-title').text(`${i8ln('Raid Bosses')} (${i8ln('All')})`)
            } else {
                $('#filter-raid-pokemon-title').text(`${i8ln('Raid Bosses')} (${pokemonIds.size - settings.excludedRaidPokemon.size})`)
            }

            Store.set('excludedRaidPokemon', settings.excludedRaidPokemon)
        })
    }

    if (serverSettings.quests) {
        $('#exclude-quest-pokemon').val(Array.from(settings.excludedQuestPokemon))
        if (settings.excludedQuestPokemon.size === 0) {
            $('a[href="#quest-pokemon-tab"]').text(`${i8ln('Quest Pokémon')} (${i8ln('All')})`)
        } else {
            $('a[href="#quest-pokemon-tab"]').text(`${i8ln('Quest Pokémon')} (${pokemonIds.size - settings.excludedQuestPokemon.size})`)
        }

        $('label[for="exclude-quest-pokemon"] .pokemon-filter-list .filter-button').each(function () {
            if (!settings.excludedQuestPokemon.has($(this).data('id'))) {
                $(this).addClass('active')
            }
        })

        $('#exclude-quest-pokemon').on('change', function (e) {
            const prevExcludedPokemon = settings.excludedQuestPokemon
            settings.excludedQuestPokemon = $(this).val().length > 0 ? new Set($(this).val().split(',').map(Number)) : new Set()

            const newExcludedPokemon = difference(settings.excludedQuestPokemon, prevExcludedPokemon)
            if (newExcludedPokemon.size > 0) {
                updatePokestops()
            }

            const newIncludedPokemon = difference(prevExcludedPokemon, settings.excludedQuestPokemon)
            if (newIncludedPokemon.size > 0) {
                lastpokestops = false
                updateMap()
            }

            if (settings.excludedQuestPokemon.size === 0) {
                $('a[href="#quest-pokemon-tab"]').text(`${i8ln('Quest Pokémon')} (${i8ln('All')})`)
            } else {
                $('a[href="#quest-pokemon-tab"]').text(`${i8ln('Quest Pokémon')} (${pokemonIds.size - settings.excludedQuestPokemon.size})`)
            }
            $('#quest-filter-tabs').tabs('updateTabIndicator')

            Store.set('excludedQuestPokemon', settings.excludedQuestPokemon)
        })
    }

    if (serverSettings.pokemons) {
        const noNotifPoke = difference(pokemonIds, settings.notifPokemon)
        $('#no-notif-pokemon').val(Array.from(noNotifPoke))
        if (settings.notifPokemon.size === pokemonIds.size) {
            $('#notif-pokemon-filter-title').text(`${i8ln('Notif Pokémon')} (${i8ln('All')})`)
        } else {
            $('#notif-pokemon-filter-title').text(`${i8ln('Notif Pokémon')} (${settings.notifPokemon.size})`)
        }

        $('label[for="no-notif-pokemon"] .pokemon-filter-list .filter-button').each(function () {
            if (settings.notifPokemon.has($(this).data('id'))) {
                $(this).addClass('active')
            }
        })

        $('#no-notif-pokemon').on('change', function (e) {
            const prevNotifPokemon = settings.notifPokemon
            const noNotifPokemon = $(this).val().length > 0 ? new Set($(this).val().split(',').map(Number)) : new Set()
            settings.notifPokemon = difference(pokemonIds, noNotifPokemon)

            const newNotifPokemon = difference(settings.notifPokemon, prevNotifPokemon)
            const newNoNotifPokemon = intersection(noNotifPokemon, prevNotifPokemon)

            updatePokemons(union(newNotifPokemon, newNoNotifPokemon))

            if (newNotifPokemon.size > 0 && (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways)) {
                lastpokemon = false
                updateMap()
            }

            if (settings.notifPokemon.size === pokemonIds.size) {
                $('#notif-pokemon-filter-title').text(`${i8ln('Notif Pokémon')} (${i8ln('All')})`)
            } else {
                $('#notif-pokemon-filter-title').text(`${i8ln('Notif Pokémon')} (${settings.notifPokemon.size})`)
            }

            Store.set('notifPokemon', settings.notifPokemon)
        })
    }

    if (serverSettings.pokemonValues) {
        const noNotifPoke = difference(pokemonIds, settings.notifValuesPokemon)
        $('#no-notif-values-pokemon').val(Array.from(noNotifPoke))
        if (settings.notifValuesPokemon.size === pokemonIds.size) {
            $('#notif-pokemon-values-filter-title').text(`${i8ln('Notif Pokémon filtered by values')} (${i8ln('All')})`)
        } else {
            $('#notif-pokemon-values-filter-title').text(`${i8ln('Notif Pokémon filtered by values')} (${settings.notifValuesPokemon.size})`)
        }

        $('label[for="no-notif-values-pokemon"] .pokemon-filter-list .filter-button').each(function () {
            if (settings.notifValuesPokemon.has($(this).data('id'))) {
                $(this).addClass('active')
            }
        })

        $('#no-notif-values-pokemon').on('change', function (e) {
            const oldValues = settings.notifValuesPokemon
            const noNotifPokemon = $(this).val().length > 0 ? new Set($(this).val().split(',').map(Number)) : new Set()
            settings.notifValuesPokemon = difference(pokemonIds, noNotifPokemon)

            const newValues = difference(settings.notifValuesPokemon, oldValues)
            const removedValues = intersection(oldValues, settings.notifValuesPokemon)

            updatePokemons(union(newValues, removedValues))

            if (newValues.size > 0 && (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways)) {
                lastpokemon = false
                updateMap()
            }

            if (settings.notifValuesPokemon.size === pokemonIds.size) {
                $('#notif-pokemon-values-filter-title').text(`${i8ln('Notif Pokémon filtered by values')} (${i8ln('All')})`)
            } else {
                $('#notif-pokemon-values-filter-title').text(`${i8ln('Notif Pokémon filtered by values')} (${settings.notifValuesPokemon.size})`)
            }

            Store.set('notifValuesPokemon', settings.notifValuesPokemon)
        })
    }

    if (serverSettings.raids) {
        const noNotifPoke = difference(pokemonIds, settings.notifRaidPokemon)
        $('#no-notif-raid-pokemon').val(Array.from(noNotifPoke))
        if (settings.notifRaidPokemon.size === pokemonIds.size) {
            $('#notif-raid-pokemon-filter-title').text(`${i8ln('Notif Raid Bosses')} (${i8ln('All')})`)
        } else {
            $('#notif-raid-pokemon-filter-title').text(`${i8ln('Notif Raid Bosses')} (${settings.notifRaidPokemon.size})`)
        }

        $('label[for="no-notif-raid-pokemon"] .pokemon-filter-list .filter-button').each(function () {
            if (settings.notifRaidPokemon.has($(this).data('id'))) {
                $(this).addClass('active')
            }
        })

        $('#no-notif-raid-pokemon').on('change', function (e) {
            const prevNotifPokemon = settings.notifRaidPokemon
            const noNotifPokemon = $(this).val().length > 0 ? new Set($(this).val().split(',').map(Number)) : new Set()
            settings.notifRaidPokemon = difference(pokemonIds, noNotifPokemon)

            updateGyms()

            if (settings.notifRaidPokemon.size === pokemonIds.size) {
                $('#notif-raid-pokemon-filter-title').text(`${i8ln('Notif Raid Bosses')} (${i8ln('All')})`)
            } else {
                $('#notif-raid-pokemon-filter-title').text(`${i8ln('Notif Raid Bosses')} (${settings.notifRaidPokemon.size})`)
            }

            Store.set('notifRaidPokemon', settings.notifRaidPokemon)
        })
    }

    if (serverSettings.quests) {
        const noNotifPoke = difference(pokemonIds, settings.notifQuestPokemon)
        $('#no-notif-quest-pokemon').val(Array.from(noNotifPoke))
        if (settings.notifQuestPokemon.size === pokemonIds.size) {
            $('a[href="#notif-quest-pokemon-tab"]').text(`${i8ln('Notif Quest Pokémon')} (${i8ln('All')})`)
        } else {
            $('a[href="#notif-quest-pokemon-tab"]').text(`${i8ln('Notif Quest Pokémon')} (${settings.notifQuestPokemon.size})`)
        }

        $('label[for="no-notif-quest-pokemon"] .pokemon-filter-list .filter-button').each(function () {
            if (settings.notifQuestPokemon.has($(this).data('id'))) {
                $(this).addClass('active')
            }
        })

        $('#no-notif-quest-pokemon').on('change', function (e) {
            const prevNotifPokemon = settings.notifQuestPokemon
            const noNotifPokemon = $(this).val().length > 0 ? new Set($(this).val().split(',').map(Number)) : new Set()
            settings.notifQuestPokemon = difference(pokemonIds, noNotifPokemon)

            updatePokestops()

            if (settings.notifQuestPokemon.size === pokemonIds.size) {
                $('a[href="#notif-quest-pokemon-tab"]').text(`${i8ln('Notif Quest Pokémon')} (${i8ln('All')})`)
            } else {
                $('a[href="#notif-quest-pokemon-tab"]').text(`${i8ln('Notif Quest Pokémon')} (${settings.notifQuestPokemon.size})`)
            }
            $('#notif-quest-filter-tabs').tabs('updateTabIndicator')

            Store.set('notifQuestPokemon', settings.notifQuestPokemon)
        })
    }
}

function initItemFilters() {
    $('.quest-filter-modal').modal({
        onOpenEnd: function () {
            $('.quest-filter-tabs').tabs('updateTabIndicator')
        }
    })

    let questItemIds = []
    const includeInFilter = [6, 1, 2, 3, 701, 703, 705, 706, 708, 101, 102, 103, 104, 201, 202, 1301, 1201, 1202, 501, 502, 503, 504, 1101, 1102, 1103, 1104, 1105, 1106, 1107]

    let list = ''
    for (let i = 0; i < includeInFilter.length; i++) {
        const id = includeInFilter[i]
        const iconUrl = getItemImageUrl(id)
        const name = getItemName(id)
        const questBundles = getQuestBundles(id)
        if (questBundles.length === 0) {
            questBundles.push(1)
        }
        $.each(questBundles, function (idx, bundleAmount) {
            questItemIds.push(id + '_' + bundleAmount)
            list += `
                <div class='filter-button' data-id='${id}' data-bundle='${bundleAmount}'>
                  <div class='filter-button-content'>
                    <div>${name}</div>
                    <div><img class='lazy' src='static/images/placeholder.png' data-src='${iconUrl}' width='32'></div>
                    <div>x${bundleAmount}</div>
                  </div>
                </div>`
        })
    }
    $('.quest-item-filter-list').html(list)

    $('.quest-item-filter-list').on('click', '.filter-button', function () {
        let inputElement = $(this).parent().parent().find('input[id$=items]')
        let value = inputElement.val().length > 0 ? inputElement.val().split(',') : []
        let id = $(this).data('id').toString()
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
        let parent = $(this).parent().parent().parent()
        parent.find('.quest-item-filter-list .filter-button:visible').addClass('active')
        parent.find('input[id$=items]').val('').trigger('change')
    })

    $('.quest-item-deselect-all').on('click', function (e) {
        let parent = $(this).parent().parent().parent()
        parent.find('.quest-item-filter-list .filter-button:visible').removeClass('active')
        parent.find('input[id$=items]').val(questItemIds.join(',')).trigger('change')
    })

    $('#exclude-quest-items').val(settings.excludedQuestItems)
    if (settings.excludedQuestItems.length === 0) {
        $('a[href="#quest-item-tab"]').text(`${i8ln('Quest Items')} (${i8ln('All')})`)
    } else {
        $('a[href="#quest-item-tab"]').text(`${i8ln('Quest Items')} (${questItemIds.length - settings.excludedQuestItems.length})`)
    }

    $('label[for="exclude-quest-items"] .quest-item-filter-list .filter-button').each(function () {
        let id = $(this).data('id').toString()
        if ($(this).data('bundle')) {
            id += '_' + $(this).data('bundle')
        }
        if (!settings.excludedQuestItems.includes(id)) {
            $(this).addClass('active')
        }
    })

    $('#exclude-quest-items').on('change', function () {
        settings.excludedQuestItems = $(this).val().length > 0 ? $(this).val().split(',') : []

        updatePokestops()
        lastpokestops = false
        updateMap()

        if (settings.excludedQuestItems.length === 0) {
            $('a[href="#quest-item-tab"]').text(`${i8ln('Quest Items')} (${i8ln('All')})`)
        } else {
            $('a[href="#quest-item-tab"]').text(`${i8ln('Quest Items')} (${questItemIds.length - settings.excludedQuestItems.length})`)
        }
        $('#quest-filter-tabs').tabs('updateTabIndicator')

        Store.set('excludedQuestItems', settings.excludedQuestItems)
    })

    const noNotifItems = questItemIds.filter(id => !settings.notifQuestItems.includes(id))
    $('#no-notif-quest-items').val(noNotifItems)
    if (settings.notifQuestItems.length === questItemIds.length) {
        $('a[href="#notif-quest-item-tab"]').text(`${i8ln('Notif Quest Items')} (${i8ln('All')})`)
    } else {
        $('a[href="#notif-quest-item-tab"]').text(`${i8ln('Notif Quest Items')} (${settings.notifQuestItems.length})`)
    }

    $('label[for="no-notif-quest-items"] .quest-item-filter-list .filter-button').each(function () {
        let id = $(this).data('id').toString()
        if ($(this).data('bundle')) {
            id += '_' + $(this).data('bundle')
        }
        if (settings.notifQuestItems.includes(id)) {
            $(this).addClass('active')
        }
    })

    $('#no-notif-quest-items').on('change', function () {
        const noNotifQuestItems = $(this).val().length > 0 ? $(this).val().split(',') : []
        settings.notifQuestItems = questItemIds.filter(id => !noNotifQuestItems.includes(id))

        updatePokestops()

        if (settings.notifQuestItems.length === questItemIds.length) {
            $('a[href="#notif-quest-item-tab"]').text(`${i8ln('Notif Quest Items')} (${i8ln('All')})`)
        } else {
            $('a[href="#notif-quest-item-tab"]').text(`${i8ln('Notif Quest Items')} (${settings.notifQuestItems.length})`)
        }
        $('#notif-quest-filter-tabs').tabs('updateTabIndicator')

        Store.set('notifQuestItems', settings.notifQuestItems)
    })
}

function initInvasionFilters() {
    const invasionIds = [41, 42, 43, 44, 5, 4, 6, 7, 10, 11, 12, 13, 49, 50, 14, 15, 16, 17, 18, 19, 20, 21, 47, 48, 22, 23, 24, 25, 26, 27, 30, 31, 32, 33, 34, 35, 36, 37, 28, 29, 38, 39]

    let list = ''
    for (var i = 0; i < invasionIds.length; i++) {
        const id = invasionIds[i]
        const iconUrl = getInvasionImageUrl(id)
        const type = getInvasionType(id)
        const grunt = getInvasionGrunt(id)
        list += `
            <div class='filter-button' data-id='${id}'>
              <div class='filter-button-content'>
                <div>${type}</div>
                <div><img class='lazy' src='static/images/placeholder.png' data-src='${iconUrl}' width='32'></div>
                <div>${grunt}</div>
              </div>
            </div>`
    }
    $('.invasion-filter-list').html(list)

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

    $('#exclude-invasions').val(settings.excludedInvasions)
    if (settings.excludedInvasions.length === 0) {
        $('#filter-invasion-title').text(`${i8ln('Rocket Invasions')} (${i8ln('All')})`)
    } else {
        $('#filter-invasion-title').text(`${i8ln('Rocket Invasions')} (${invasionIds.length - settings.excludedInvasions.length})`)
    }

    $('label[for="exclude-invasions"] .invasion-filter-list .filter-button').each(function () {
        if (!settings.excludedInvasions.includes($(this).data('id'))) {
            $(this).addClass('active')
        }
    })

    $('#exclude-invasions').on('change', function () {
        settings.excludedInvasions = $(this).val().length > 0 ? $(this).val().split(',').map(Number) : []

        updatePokestops()
        lastpokestops = false
        updateMap()

        if (settings.excludedInvasions.length === 0) {
            $('#filter-invasion-title').text(`${i8ln('Rocket Invasions')} (${i8ln('All')})`)
        } else {
            $('#filter-invasion-title').text(`${i8ln('Rocket Invasions')} (${invasionIds.length - settings.excludedInvasions.length})`)
        }

        Store.set('excludedInvasions', settings.excludedInvasions)
    })

    const noNotifInvasions = invasionIds.filter(id => !settings.notifInvasions.includes(id))
    $('#no-notif-invasions').val(noNotifInvasions)
    if (settings.notifInvasions.length === invasionIds.length) {
        $('#notif-invasion-filter-title').text(`${i8ln('Notif Rocket Invasions')} (${i8ln('All')})`)
    } else {
        $('#notif-invasion-filter-title').text(`${i8ln('Notif Rocket Invasions')} (${settings.notifInvasions.length})`)
    }

    $('label[for="no-notif-invasions"] .invasion-filter-list .filter-button').each(function () {
        if (settings.notifInvasions.includes($(this).data('id'))) {
            $(this).addClass('active')
        }
    })

    $('#no-notif-invasions').on('change', function () {
        const noNotifInvasions = $(this).val().length > 0 ? $(this).val().split(',').map(Number) : []
        settings.notifInvasions = invasionIds.filter(id => !noNotifInvasions.includes(id))

        updatePokestops()

        if (settings.notifInvasions.length === invasionIds.length) {
            $('#notif-invasion-filter-title').text(`${i8ln('Notif Rocket Invasions')} (${i8ln('All')})`)
        } else {
            $('#notif-invasion-filter-title').text(`${i8ln('Notif Rocket Invasions')} (${settings.notifInvasions.length})`)
        }

        Store.set('notifInvasions', settings.notifInvasions)
    })
}

function initBackupModals() {
    const pokemonIds = getPokemonIds()

    if (serverSettings.pokemons) {
        $('#export-pokemon-button').on('click',  function () {
            const pokemon = difference(pokemonIds, settings.excludedPokemon)
            downloadData('pokemon', JSON.stringify(Array.from(pokemon)))
        })
    }

    if (serverSettings.pokemonValues) {
        $('#export-values-pokemon-button').on('click',  function () {
            const pokemon = difference(pokemonIds, settings.noFilterValuesPokemon)
            downloadData('values_pokemon', JSON.stringify(Array.from(pokemon)))
        })
    }

    if (serverSettings.raids) {
        $('#export-raid-pokemon-button').on('click',  function () {
            const pokemon = difference(pokemonIds, settings.excludedRaidPokemon)
            downloadData('raid_pokemon', JSON.stringify(Array.from(pokemon)))
        })
    }

    if (serverSettings.quests) {
        $('#export-quest-pokemon-button').on('click',  function () {
            const pokemon = difference(pokemonIds, settings.excludedQuestPokemon)
            downloadData('quest_pokemon', JSON.stringify(Array.from(pokemon)))
        })
    }

    if (serverSettings.pokemons) {
        $('#export-notif-pokemon-button').on('click',  function () {
            downloadData('notif_pokemon', JSON.stringify(Array.from(pokemonsettings.notifPokemon)))
        })
    }

    if (serverSettings.pokemonValues) {
        $('#export-notif-values-pokemon-button').on('click',  function () {
            const pokemon = difference(pokemonIds, settings.noNotifValuesPokemon)
            downloadData('notif_values_pokemon', JSON.stringify(Array.from(pokemon)))
        })
    }

    if (serverSettings.raids) {
        $('#export-notif-raid-pokemon-button').on('click',  function () {
            downloadData('raid_pokemon', JSON.stringify(Array.from(settings.notifRaidPokemon)))
        })
    }

    if (serverSettings.quests) {
        $('#export-notif-quest-pokemon-button').on('click',  function () {
            downloadData('quest_pokemon', JSON.stringify(Array.from(settings.notifQuestPokemon)))
        })
    }

    function loaded(e) {
        var fileString = e.target.result
        var checkBoxSelected = false

        var pokemons = null
        try {
            pokemons = JSON.parse(fileString)
        } catch (e) {
            console.error('Error while parsing pokemon list: ' + e)
        }
        if (pokemons === null || !Array.isArray(pokemons)) {
            toastError(i8ln('Error while reading Pokémon list file!'), i8ln('Check your Pokémon list file.'))
            return
        }
        for (var i = 0; i < pokemons.length; i++) {
            if (!Number.isInteger(pokemons[i])) {
                toastError(i8ln('Unexpected character found in Pokémon list file!'), i8ln('Check your Pokémon list file.'))
                return
            }
        }

        const excludedPokemon = Array.from(pokemonIds).filter(id => !pokemons.includes(id))

        if (serverSettings.pokemons && $('#import-pokemon-checkbox').is(':checked')) {
            checkBoxSelected = true
            $('#exclude-pokemon').val(excludedPokemon).trigger('change')

            $('label[for="exclude-pokemon"] .pokemon-filter-list .filter-button').each(function () {
                if (!settings.excludedPokemon.has($(this).data('id'))) {
                    $(this).addClass('active')
                } else {
                    $(this).removeClass('active')
                }
            })
        }

        if (serverSettings.pokemonValues && $('#import-values-pokemon-checkbox').is(':checked')) {
            checkBoxSelected = true
            $('#unfiltered-pokemon').val(excludedPokemon).trigger('change')

            $('label[for="unfiltered-pokemon"] .pokemon-filter-list .filter-button').each(function () {
                if (!settings.noFilterValuesPokemon.has($(this).data('id'))) {
                    $(this).addClass('active')
                } else {
                    $(this).removeClass('active')
                }
            })
        }

        if (serverSettings.raids && $('#import-raid-pokemon-checkbox').is(':checked')) {
            checkBoxSelected = true
            $('#exclude-raid-pokemon').val(excludedPokemon).trigger('change')

            $('label[for="exclude-raid-pokemon"] .pokemon-filter-list .filter-button').each(function () {
                if (!settings.excludedRaidPokemon.has($(this).data('id'))) {
                    $(this).addClass('active')
                } else {
                    $(this).removeClass('active')
                }
            })
        }

        if (serverSettings.quests && $('#import-quest-pokemon-checkbox').is(':checked')) {
            checkBoxSelected = true
            $('#exclude-quest-pokemon').val(excludedPokemon).trigger('change')

            $('label[for="exclude-quest-pokemon"] .pokemon-filter-list .filter-button').each(function () {
                if (!settings.excludedQuestPokemon.has($(this).data('id'))) {
                    $(this).addClass('active')
                } else {
                    $(this).removeClass('active')
                }
            })
        }

        if (serverSettings.pokemons && $('#import-notif-pokemon-checkbox').is(':checked')) {
            checkBoxSelected = true
            $('#no-notif-pokemon').val(excludedPokemon).trigger('change')

            $('label[for="no-notif-pokemon"] .pokemon-filter-list .filter-button').each(function () {
                if (settings.notifPokemon.has($(this).data('id'))) {
                    $(this).addClass('active')
                } else {
                    $(this).removeClass('active')
                }
            })
        }

        if (serverSettings.pokemonValues && $('#import-notif-values-pokemon-checkbox').is(':checked')) {
            checkBoxSelected = true
            $('#no-notif-values-pokemon').val(excludedPokemon).trigger('change')

            $('label[for="no-notif-values-pokemon"] .pokemon-filter-list .filter-button').each(function () {
                if (!settings.noNotifValuesPokemon.has($(this).data('id'))) {
                    $(this).addClass('active')
                } else {
                    $(this).removeClass('active')
                }
            })
        }

        if (serverSettings.raids && $('#import-notif-raid-pokemon-checkbox').is(':checked')) {
            checkBoxSelected = true
            $('#no-notif-raid-pokemon').val(excludedPokemon).trigger('change')

            $('label[for="no-notif-raid-pokemon"] .pokemon-filter-list .filter-button').each(function () {
                if (settings.notifRaidPokemon.has($(this).data('id'))) {
                    $(this).addClass('active')
                } else {
                    $(this).removeClass('active')
                }
            })
        }

        if (serverSettings.quests && $('#import-notif-quest-pokemon-checkbox').is(':checked')) {
            checkBoxSelected = true
            $('#no-notif-quest-pokemon').val(excludedPokemon).trigger('change')

            $('label[for="no-notif-quest-pokemon"] .pokemon-filter-list .filter-button').each(function () {
                if (settings.notifQuestPokemon.has($(this).data('id'))) {
                    $(this).addClass('active')
                } else {
                    $(this).removeClass('active')
                }
            })
        }

        if (checkBoxSelected) {
            toastSuccess(i8ln('Pokémon list imported.'), '')
        } else {
            toastWarning(i8ln('Please select a filter to import to first.'), '')
        }
    }

    function error(e) {
        console.error('Error while loading Pokémon list file: ' + e)
        toastError(i8ln('Error while loading Pokémon list file!'), i8ln('Please try again.'))
    }

    $('#import-pokemon-list').on('click', function () {
        let elem = document.getElementById('pokemon-list-file')
        if (elem.value != '') {
            var file = elem.files[0]
            loadData(file, loaded, error)
        } else {
            toastWarning(i8ln('Please select a Pokémon list first!'), '')
        }
    })
}

function setupRangeCircle(item, type, cluster) {
    var range
    var circleColor

    switch (type) {
        case 'pokemon':
            circleColor = '#C233F2'
            range = 50 // Pokemon appear at 50m, but disappear at 70m.
            break
        case 'gym':
            circleColor = gymRangeColors[item.team_id]
            range = 40
            break
        case 'pokestop':
            circleColor = '#3EB0FF'
            range = 40
            break
        case 'spawnpoint':
            circleColor = '#C233F2'
            range = 50
            break
        default:
            return
    }

    const rangeCircle = L.circle([item.latitude, item.longitude], {
        radius: range, // Meters.
        interactive: false,
        weight: 1,
        color: circleColor,
        opacity: 0.9,
        fillOpacity: 0.3
    })
    rangesLayerGroup.addLayer(rangeCircle)

    return rangeCircle
}

function updateRangeCircle(item, type, cluster) {
    if (!item.rangeCircle) {
        return
    }

    var isRangeActive
    switch (type) {
        case 'pokemon':
            isRangeActive = isPokemonRangesActive()
            break
        case 'gym':
            isRangeActive = isGymRangesActive()
            break
        case 'pokestop':
            isRangeActive = isPokestopRangesActive()
            break
        case 'spawnpoint':
            isRangeActive = isSpawnpointRangesActive()
            break
        default:
            isRangeActive = false
    }

    if (!isRangeActive) {
        removeRangeCircle(item.rangeCircle)
        delete item.rangeCircle
        return
    }

    if (type === 'gym') {
        item.rangeCircle.setStyle({color: gymRangeColors[item.team_id]})
    }

    return item.rangeCircle
}

function removeRangeCircle(rangeCircle) {
    rangesLayerGroup.removeLayer(rangeCircle)
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
            markerChange = true
        }
    }

    for (let id of upcomingRaidIds) {
        if (isOngoingRaid(mapData.gyms[id].raid)) {
            updateGym(id)
            upcomingRaidIds.delete(id)
            markerChange = true
        }
    }

    for (let id of invadedPokestopIds) {
        if (!isInvadedPokestop(mapData.pokestops[id])) {
            updatePokestop(id)
            invadedPokestopIds.delete(id)
            markerChange = true
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

    if (markerChange) {
        updateStatsTable()
    }
}

function removeMarker(marker) {
    if (markers.hasLayer(marker)) {
        markers.removeLayer(marker)
    } else {
        markersNoCluster.removeLayer(marker)
    }
}

function loadRawData() {
    const loadPokemon = settings.showPokemon
    const eids = String(Array.from(getExcludedPokemon()))
    const reids = String(Array.from(isShowAllZoom() ? settings.excludedPokemon : reincludedPokemon))
    const prioNotif = settings.pokemonNotifs && settings.showNotifPokemonAlways
    const loadGyms = settings.showGyms
    const loadRaids = settings.showRaids
    const loadPokestops = settings.showPokestops
    const loadPokestopsNoEvent = settings.showPokestopsNoEvent
    const loadQuests = settings.showQuests
    const loadInvasions = settings.showInvasions
    const loadLures = settings.includedLureTypes.length > 0
    const loadWeather = settings.showWeather
    const loadSpawnpoints = settings.showSpawnpoints
    const loadScannedLocs = settings.showScannedLocations
    const loadPokemonNests = settings.showPokemonNests

    const bounds = map.getBounds()
    const swPoint = bounds.getSouthWest()
    const nePoint = bounds.getNorthEast()
    const swLat = swPoint.lat
    const swLng = swPoint.lng
    const neLat = nePoint.lat
    const neLng = nePoint.lng

    return $.ajax({
        url: 'raw_data',
        type: 'GET',
        data: {
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
            'eids': eids,
            'reids': reids,
            'prionotif': prioNotif,
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
            'lastscannedlocs': lastscannedlocs,
            'pokemonNests': loadPokemonNests
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
            toastError(i8ln('Error getting data!'), i8ln('Please check your connection.'))
        },
        complete: function () {
            rawDataIsLoading = false
        }
        
    })
}

function updateMap() {
    return loadRawData().done(function (result) {
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
        
        getNestData(result.pokemonNests)
        
        updateStatsTable()

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
            reincludedPokemon = difference(reincludedPokemon, new Set(result.reids))
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

function initPushJS() {
    /* If push.js is unsupported or disabled, fall back on materialize toast
     * notifications. */
    Push.config({
        serviceWorker: 'static/dist/js/serviceWorker.min.js',
        fallback: function (payload) {
            sendToastNotification(
                payload.title,
                payload.body,
                payload.icon,
                payload.data.lat,
                payload.data.lng
            )
        }
    })
}

function createServiceWorkerReceiver() {
    navigator.serviceWorker.addEventListener('message', function (event) {
        const data = JSON.parse(event.data)
        if (data.action === 'centerMap' && data.lat && data.lng) {
            centerMap(data.lat, data.lng, 18)
        }
    })
}

function sendNotification(title, text, icon, lat, lng) {
   var notificationDetails = {
        icon: icon,
        body: text,
        data: {
            lat: lat,
            lng: lng
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
                map.setView(L.latLng(lat, lng), 18)
            }
        }
    }

    /* Push.js requests the Notification permission automatically if
     * necessary. */
    Push.create(title, notificationDetails).catch(function () {
        // Fall back on materialize toast if something goes wrong.
        sendToastNotification(title, text, icon, lat, lng)
    })
}

function sendToastNotification(title, text, iconUrl, lat, lng) {
    var toastId = 'toast' + lat + '_' + lng
    toastId = toastId.replace(/\./gi, '') // Remove all dots.
    text = text.replace(/\n/gi, '<br>')
    const toastHTML = `<div id='${toastId}'style='margin-right:15px;'><img src='${iconUrl}' width='48'></div><div><strong>${title}</strong><br>${text}</div>`
    M.toast({html: toastHTML, displayLength: 10000})

    var $toast = $('#' + toastId).parent()
    $toast.css('cursor', 'pointer')
    $toast.on('click', function () {
        map.setView(L.latLng(lat, lng), 18)
        var toastChildElement = document.getElementById(toastId)
        var toastElement = toastChildElement.closest('.toast') // Get parent.
        var toastInstance = M.Toast.getInstance(toastElement)
        toastInstance.dismiss()
    })
}

function createUserLocationButton() {
    var locationMarker = L.control({position: 'bottomright'})
    locationMarker.onAdd = function (map) {
        var locationContainer = L.DomUtil.create('div', 'leaflet-control-locate leaflet-control-custom leaflet-bar')

        var locationButton = document.createElement('a')
        locationButton.innerHTML = '<i class="material-icons">my_location</i>'
        locationButton.title = 'My location'
        locationButton.href = 'javascript:void(0);'
        locationContainer.appendChild(locationButton)
        locationButton.addEventListener('click', centerMapOnUserLocation)

        return locationContainer
    }

    locationMarker.addTo(map)
}

function centerMapOnUserLocation() {
    if (!hasLocationSupport()) {
        return
    }

    var locationIcon = document.getElementsByClassName('leaflet-control-locate')[0].firstChild.firstChild
    var animationInterval = setInterval(function () {
        if (locationIcon.innerHTML === 'my_location') {
            locationIcon.innerHTML = 'location_searching'
        } else {
            locationIcon.innerHTML = 'my_location'
        }
    }, 500)

    function succes(pos) {
        const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude)
        if (userLocationMarker) {
            userLocationMarker.setLatLng(latlng)
        }
        map.panTo(latlng)
        clearInterval(animationInterval)
        locationIcon.innerHTML = 'my_location'
        Store.set('lastUserLocation', {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
        })
    }

    function error(e) {
        toastError(i8ln('Error getting your location!'), e.message)
        clearInterval(animationInterval)
        locationIcon.innerHTML = 'my_location'
    }

    navigator.geolocation.getCurrentPosition(succes, error, {enableHighAccuracy: true})
}

function startFollowingUser() {
    centerMapOnUserLocation()
    followUserHandle = setInterval(centerMapOnUserLocation, 3000)
}

function stopFollowingUser() {
    clearInterval(followUserHandle)
    followUserHandle = null
}

function changeLocation(lat, lng) {
    const loc = L.latLng(lat, lng)
    map.panTo(loc)
}

function centerMap(lat, lng, zoom) {
    changeLocation(lat, lng)
    if (zoom) {
        map.setZoom(zoom)
    }
}

function createUpdateWorker() {
    try {
        if (isMobileDevice() && window.Worker) {
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

//
// Page Ready Execution
//

$(function () {
    initSettings()

    if (settings.darkMode) {
        enableDarkMode()
    }

    initMap()

    moment.locale(language)

    initPushJS()
    if (Push._agents.chrome.isSupported()) {
        createServiceWorkerReceiver()
    }

    const promiseRarity = serverSettings.rarity ? updatePokemonRarities(serverSettings.rarityFileName) : Promise.resolve()
    initI8lnDictionary().then(function () {
        const promisePokemon = initPokemonData()
        const promiseMove = initMoveData()
        const promiseItem = serverSettings.quests ? initItemData() : Promise.resolve()
        const promiseInvasion = serverSettings.invasions ? initInvasionData() : Promise.resolve()
        return Promise.all([promisePokemon, promiseMove, promiseItem, promiseInvasion, promiseRarity])
    }).then(function () {
        // Initial load.
        return updateMap()
    }).catch(function(error) {
        // updateMap() failed... ¯\_(ツ)_/¯
    }).then(function () {
        initPokemonFilters()
        if (serverSettings.quests) {
            initItemFilters()
        }
        if (serverSettings.invasions) {
            initInvasionFilters()
        }
        lazyLoadImages()
    })

    getAllParks()
    updateS2Overlay()

    $('.modal').modal()

    if (serverSettings.motd) {
        showMotd(serverSettings.motdTitle, serverSettings.motdText, serverSettings.motdPages, serverSettings.showMotdAlways)
    }

    $('.dropdown-trigger').dropdown({
        constrainWidth: false,
        coverTrigger: false
    })

    initSettingsSidebar()

    if (serverSettings.statsSidebar) {
        $('#stats-sidenav').sidenav({
            edge: 'right',
            draggable: false,
            onOpenStart: updateStatsTable
        })
        let statsSideNavElem = document.getElementById('stats-sidenav')
        statsSideNav = M.Sidenav.getInstance(statsSideNavElem)
        $('.sidenav-trigger[data-target="stats-sidenav"]').on('click', function (e) {
            if (statsSideNav.isOpen) {
                statsSideNav.close()
                e.stopPropagation()
            }
        })
    }

    if (serverSettings.gymSidebar) {
        $('#gym-sidebar').sidenav({
            edge: 'right',
            draggable: false,
            onCloseEnd: function () {
                // Make sure label/sidebar is updated next time it's opened.
                mapData.gyms[openGymSidebarId].updated = true
            }
        })
        let gymSidebarElem = document.getElementById('gym-sidebar')
        gymSidebar = M.Sidenav.getInstance(gymSidebarElem)
    }

    $('.tabs').tabs()
    $('#stats-tabs').tabs({
        onShow: updateStatsTable
    })

    $('#weather-modal').modal({
        onOpenStart: setupWeatherModal
    })

    $('.tooltipped').tooltip()

    initBackupModals()

    // Init data tables.
    if (serverSettings.pokemons) {
        $('#pokemon-table').DataTable({
            paging: false,
            searching: false,
            info: false,
            "scrollX": true,
            "columnDefs": [
                { "orderable": false, "targets": 0 },
                {
                    'targets': 1,
                    'render': function (data, type, row) {
                        if (type === 'display') {
                            return `<a href="http://pokemon.gameinfo.io/en/pokemon/${row[1]}" target="_blank" title="View on GamePress">#${row[1]}</a>`
                        }
                        return row[1]
                    }
                },
                {
                    'targets': 3,
                    'render': function (data, type, row) {
                        if (type === 'display') {
                            return row[3].toLocaleString()
                        }
                        return row[3]
                    }
                },
                {
                    'targets': 4,
                    'render': function (data, type, row) {
                        if (type === 'display') {
                            return row[4].toLocaleString(undefined, {maximumFractionDigits: 1}) + '%'
                        }
                        return row[4]
                    }
                }
            ],
            "order": [[ 3, "desc" ]]
        })
    }

    if (serverSettings.gyms) {
        $('#gym-table').DataTable({
            paging: false,
            searching: false,
            info: false,
            "scrollX": true,
            "columnDefs": [
                { "orderable": false, "targets": 0 },
                {
                    'targets': 2,
                    'render': function (data, type, row) {
                        if (type === 'display') {
                            return row[2].toLocaleString()
                        }
                        return row[2]
                    }
                },
                {
                    'targets': 3,
                    'render': function (data, type, row) {
                        if (type === 'display') {
                            return row[3].toLocaleString(undefined, {maximumFractionDigits: 1}) + '%'
                        }
                        return row[3]
                    }
                }
            ],
            "order": [[ 2, "desc" ]]
        })
    }

    if (serverSettings.raids) {
        $('#egg-table').DataTable({
            paging: false,
            searching: false,
            info: false,
            "scrollX": true,
            "columnDefs": [
                { "orderable": false, "targets": 0 },
                {
                    'targets': 2,
                    'render': function (data, type, row) {
                        if (type === 'display') {
                            return row[2].toLocaleString()
                        }
                        return row[2]
                    }
                },
                {
                    'targets': 3,
                    'render': function (data, type, row) {
                        if (type === 'display') {
                            return row[3].toLocaleString(undefined, {maximumFractionDigits: 1}) + '%'
                        }
                        return row[3]
                    }
                }
            ],
            "order": [[ 2, "desc" ]]
        })

        $('#raid-pokemon-table').DataTable({
            paging: false,
            searching: false,
            info: false,
            "scrollX": true,
            "columnDefs": [
                { "orderable": false, "targets": 0 },
                {
                    'targets': 2,
                    'render': function (data, type, row) {
                        if (type === 'display') {
                            return `<a href="http://pokemon.gameinfo.io/en/pokemon/${row[2]}" target="_blank" title="View on GamePress">#${row[2]}</a>`
                        }
                        return row[2]
                    }
                },
                {
                    'targets': 4,
                    'render': function (data, type, row) {
                        if (type === 'display') {
                            return row[4].toLocaleString()
                        }
                        return row[4]
                    }
                },
                {
                    'targets': 5,
                    'render': function (data, type, row) {
                        if (type === 'display') {
                            return row[5].toLocaleString(undefined, {maximumFractionDigits: 1}) + '%'
                        }
                        return row[5]
                    }
                }
            ],
            "order": [[ 4, "desc" ]]
        })
    }

    if (serverSettings.pokestops) {
        $('#pokestop-table').DataTable({
            paging: false,
            searching: false,
            info: false,
            "scrollX": true,
            "columnDefs": [
                { "orderable": false, "targets": 0 },
                {
                    'targets': 2,
                    'render': function (data, type, row) {
                        if (type === 'display') {
                            return row[2].toLocaleString()
                        }
                        return row[2]
                    }
                },
                {
                    'targets': 3,
                    'render': function (data, type, row) {
                        if (type === 'display') {
                            return row[3].toLocaleString(undefined, {maximumFractionDigits: 1}) + '%'
                        }
                        return row[3]
                    }
                }
            ],
            "order": [[ 2, "desc" ]]
        })
    }

    window.setInterval(updateMap, serverSettings.mapUpdateInverval)
    window.setInterval(updateLabelDiffTime, 1000)
    window.setInterval(updateStaleMarkers, 2500)
    if (serverSettings.rarity) {
        window.setInterval(updatePokemonRarities, 300000, serverSettings.rarityFileName)
    }

    createUpdateWorker()
})
