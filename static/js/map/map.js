/*
globals getAllParks, getExcludedPokemon, initBackupModals, initInvasionFilters,
initInvasionFilters, initItemFilters, initPokemonFilters, initSettings,
initSettingsSidebar, initStatsSidebar, isGymRangesActive, isPokemonRangesActive,
isPokestopRangesActive, isSpawnpointRangesActive, processGym, processNest,
processPokemon, processPokestop, processScannedLocation, processSpawnpoint,
processSpawnpoint, processWeather, removePokemon, removeScannedLocation,
setupWeatherModal, updateAllParks, updateGym, updateGymLabel, updateGymLabel,
updateNestLabel, updatePokemonLabel, updatePokemonLabel, updatePokestop,
updatePokestopLabel, updatePokestopLabel, updateS2Overlay, updateS2Overlay,
updateScannedLocation, updateSpawnpoint, updateSpawnpointLabel,
updateSpawnpointLabel, updateStatsTable, updateStatsTable, updateStatsTable,
updateStatsTable, updateWeatherButton, updateWeatherLabel, updateWeatherLabel
*/
/*
exported $gymNameFilter, $pokestopNameFilter, ActiveFortModifierEnum, audio,
cryFileTypes, downloadData, exParksLayerGroup, genderClasses, gymEggZIndex,
gymNotifiedZIndex, gymRaidBossZIndex, gymSidebar, gymTypes, gymZIndex,
loadData, lureTypes, mainS2CellId, nestParksLayerGroup, pokemonNewSpawnZIndex,
pokemonNotifiedZIndex, pokemonRareZIndex, pokemonUltraRareZIndex,
pokemonUncommonZIndex, pokemonVeryRareZIndex, pokemonZIndex,
pokestopInvasionZIndex, pokestopLureZIndex, pokestopNotifiedZIndex,
pokestopQuestZIndex, pokestopZIndex, raidEggImages, removeMarker,
s2CellsLayerGroup, sendNotification, settingsSideNav, setupRangeCircle,
stopFollowingUser, updateRangeCircle, updateMarkerLayer
*/

//
// Global map variables
//

let $gymNameFilter
let $pokestopNameFilter
let settingsSideNav
let gymSidebar
let openGymSidebarId

const settings = {
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
    showInvasionPokemon: null,
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
    showNests: null,
    showExParks: null,
    showNestParks: null,
    showS2Cells: null,
    showS2CellsLevel10: null,
    showS2CellsLevel11: null,
    showS2CellsLevel12: null,
    showS2CellsLevel13: null,
    showS2CellsLevel14: null,
    showS2CellsLevel15: null,
    showS2CellsLevel16: null,
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

const notifiedPokemonData = {}
const notifiedGymData = {}
const notifiedPokestopData = {}

const luredPokestopIds = new Set()
const invadedPokestopIds = new Set()
const raidIds = new Set()
const upcomingRaidIds = new Set() // Contains only raids with known raid boss.

// var map
const mapData = {
    pokemons: {},
    gyms: {},
    pokestops: {},
    lurePokemons: {},
    weather: {},
    scannedLocs: {},
    spawnpoints: {},
    nests: {},
    exParks: [],
    nestParks: []
}

let markerStyles
let startLocationMarker
let userLocationMarker
let followUserHandle

let timestamp
let rawDataIsLoading = false
let reincludedPokemon = new Set()

let oSwLat
let oSwLng
let oNeLat
let oNeLng

let getAllPokemon
let getAllGyms
let getAllPokestops
let getAllWeather
let getAllSpawnpoints
let getAllScannedLocs
let getAllNests

let getAllPokemonTimestamp
let getAllGymsTimestamp
let getAllPokestopsTimestamp
let getAllWeatherTimestamp
let getAllSpawnpointsTimestamp
let getAllScannedLocsTimestamp
let getAllNestsTimestamp

let map
let markers
let markersNoCluster

let nestParksLayerGroup
let exParksLayerGroup
let s2CellsLayerGroup
let rangesLayerGroup

let mainS2CellId = null

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

let updateWorker
let lastUpdateTime

const gymRangeColors = ['#999999', '#0051CF', '#FF260E', '#FECC23'] // 'Uncontested', 'Mystic', 'Valor', 'Instinct'
const cryFileTypes = ['wav', 'mp3']

//
// Functions
//

function isShowAllZoom() {
    return serverSettings.showAllZoomLevel > 0 && map.getZoom() >= serverSettings.showAllZoomLevel
}

function loadData(file, onLoad, onError) {
    const reader = new FileReader()
    reader.readAsText(file)
    reader.onload = onLoad
    reader.onerror = onError
}

function downloadData(fileName, data) {
    const a = document.createElement('a')
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

    setCustomTileServers(serverSettings.customTileServers)
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

    if (serverSettings.geocoder) {
        L.Control.geocoder({
            defaultMarkGeocode: false
        }).on('markgeocode', function (e) {
            changeLocation(e.geocode.center.lat, e.geocode.center.lng)
        }).addTo(map)
    }

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
        spiderfyOnMaxZoom: serverSettings.spiderfyClusters,
        removeOutsideVisibleBounds: serverSettings.removeMarkersOutsideViewport
    }).addTo(map)
    markersNoCluster = L.layerGroup().addTo(map)

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

    var marker = L.marker([lat, lng], { draggable: settings.isStartLocationMarkerMovable }).addTo(markersNoCluster)
    marker.bindPopup(function () { return `<div><b>${i18n('Start location')}</b></div>` }, { autoPan: autoPanPopup() })
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

    if (settings.startLocationMarkerStyle in markerStyles) {
        const iconUrl = markerStyles[settings.startLocationMarkerStyle].icon
        if (iconUrl) {
            const icon = L.icon({
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
    marker.bindPopup(function () { return `<div><b>${i18n('My location')}</b></div>` }, { autoPan: autoPanPopup() })
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

    if (settings.userLocationMarkerStyle in markerStyles) {
        const url = markerStyles[settings.userLocationMarkerStyle].icon
        if (url) {
            const locationIcon = L.icon({
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
            range = 80
            break
        case 'pokestop':
            circleColor = '#3EB0FF'
            range = 80
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
        item.rangeCircle.setStyle({ color: gymRangeColors[item.team_id] })
    }

    return item.rangeCircle
}

function removeRangeCircle(rangeCircle) {
    rangesLayerGroup.removeLayer(rangeCircle)
}

function autoPanPopup() {
    return (!hasFinePrimaryPointer() || !canPrimaryInputHover()) && serverSettings.autoPanPopup
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
            case 'nest':
                if (mapData.nests[marker.nest_id].updated) {
                    updateNestLabel(mapData.nests[marker.nest_id], marker)
                }
        }

        marker.openPopup()
        updateLabelDiffTime()
        marker.options.persist = true
    })

    if (hasFinePrimaryPointer() && canPrimaryInputHover()) {
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
                case 'nest':
                    if (mapData.nests[marker.nest_id].updated) {
                        updateNestLabel(mapData.nests[marker.nest_id], marker)
                    }
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

    for (const id of raidIds) {
        if (!isValidRaid(mapData.gyms[id].raid)) {
            mapData.gyms[id].raid = null
            updateGym(id)
            raidIds.delete(id)
            markerChange = true
        }
    }

    for (const id of upcomingRaidIds) {
        if (isOngoingRaid(mapData.gyms[id].raid)) {
            updateGym(id)
            upcomingRaidIds.delete(id)
            markerChange = true
        }
    }

    for (const id of invadedPokestopIds) {
        if (!isInvadedPokestop(mapData.pokestops[id])) {
            updatePokestop(id)
            invadedPokestopIds.delete(id)
            markerChange = true
        }
    }

    for (const id of luredPokestopIds) {
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

function updateMarkerLayer(marker, isNotif, notifiedData) {
    // Move marker to right layer
    const [targetMarkers, nonTargetMarkers] = isNotif ? [markersNoCluster, markers] : [markers, markersNoCluster]
    if (!targetMarkers.hasLayer(marker)) {
        nonTargetMarkers.removeLayer(marker)
        targetMarkers.addLayer(marker)
    }

    if (settings.bounceNotifMarkers && isNotif && !notifiedData.animationDisabled && !marker.isBouncing()) {
        marker.bounce()
    } else if (marker.isBouncing() && (!settings.bounceNotifMarkers || !isNotif)) {
        marker.stopBouncing()
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
    const loadLures = settings.includedLureTypes && settings.includedLureTypes.length > 0
    const loadWeather = settings.showWeather
    const loadSpawnpoints = settings.showSpawnpoints
    const loadScannedLocs = settings.showScannedLocations
    const loadNests = settings.showNests

    const bounds = map.getBounds()
    const swPoint = bounds.getSouthWest()
    const nePoint = bounds.getNorthEast()
    const swLat = swPoint.lat
    const swLng = swPoint.lng
    const neLat = nePoint.lat
    const neLng = nePoint.lng

    return $.ajax({
        url: 'raw-data',
        type: 'GET',
        data: {
            timestamp: timestamp,
            swLat: swLat,
            swLng: swLng,
            neLat: neLat,
            neLng: neLng,
            oSwLat: oSwLat,
            oSwLng: oSwLng,
            oNeLat: oNeLat,
            oNeLng: oNeLng,
            pokemon: loadPokemon,
            eids: eids,
            reids: reids,
            prionotif: prioNotif,
            pokestops: loadPokestops,
            eventlessPokestops: loadPokestopsNoEvent,
            quests: loadQuests,
            invasions: loadInvasions,
            lures: loadLures,
            gyms: loadGyms,
            raids: loadRaids,
            nests: loadNests,
            weather: loadWeather,
            spawnpoints: loadSpawnpoints,
            scannedLocs: loadScannedLocs,
            allPokemon: getAllPokemon,
            allGyms: getAllGyms,
            allPokestops: getAllPokestops,
            allWeather: getAllWeather,
            allSpawnpoints: getAllSpawnpoints,
            allScannedLocs: getAllScannedLocs,
            allNests: getAllNests
        },
        dataType: 'json',
        cache: false,
        timeout: 30000,
        beforeSend: function () {
            if (rawDataIsLoading) {
                return false
            } else {
                rawDataIsLoading = true
            }
        },
        error: function () {
            toastError(i18n('Error getting data!'), i18n('Please check your connection.'))
        },
        complete: function () {
            rawDataIsLoading = false
        }
    })
}

function updateMap({
    loadAllPokemon = false,
    loadAllGyms = false,
    loadAllPokestops = false,
    loadAllWeather = false,
    loadAllSpawnpoints = false,
    loadAllScannedLocs = false,
    loadAllNests = false
} = {}) {
    if (loadAllPokemon) {
        getAllPokemonTimestamp = Date.now()
        getAllPokemon = true
    }
    if (loadAllGyms) {
        getAllGymsTimestamp = Date.now()
        getAllGyms = true
    }
    if (loadAllPokestops) {
        getAllPokestopsTimestamp = Date.now()
        getAllPokestops = true
    }
    if (loadAllWeather) {
        getAllWeatherTimestamp = Date.now()
        getAllWeather = true
    }
    if (loadAllSpawnpoints) {
        getAllSpawnpointsTimestamp = Date.now()
        getAllSpawnpoints = true
    }
    if (loadAllScannedLocs) {
        getAllScannedLocsTimestamp = Date.now()
        getAllScannedLocs = true
    }
    if (loadAllNests) {
        getAllNestsTimestamp = Date.now()
        getAllNests = true
    }

    const requestTimestamp = Date.now()

    return loadRawData().done(function (result) {
        // Leaflet.markercluster will refresh the clusters on each icon added. Let's add many and refresh only once.
        const originalRefreshClustersIcons = markers._refreshClustersIcons
        let mustRefreshClustersIcons = false
        markers._refreshClustersIcons = function () {
            mustRefreshClustersIcons = true
        }

        try {
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
            $.each(result.nests, function (idx, nest) {
                processNest(nest)
            })
        } finally {
            markers._refreshClustersIcons = originalRefreshClustersIcons
            if (mustRefreshClustersIcons && typeof originalRefreshClustersIcons === 'function') {
                originalRefreshClustersIcons.call(markers)
            }
        }

        updateStatsTable()

        oSwLat = result.oSwLat
        oSwLng = result.oSwLng
        oNeLat = result.oNeLat
        oNeLng = result.oNeLng

        if (result.allPokemon && getAllPokemonTimestamp <= requestTimestamp) {
            getAllPokemon = false
        }
        if (result.allGyms && getAllGymsTimestamp <= requestTimestamp) {
            getAllGyms = false
        }
        if (result.allPokestops && getAllPokestopsTimestamp <= requestTimestamp) {
            getAllPokestops = false
        }
        if (result.allWeather && getAllWeatherTimestamp <= requestTimestamp) {
            getAllWeather = false
        }
        if (result.allSpawnpoints && getAllSpawnpointsTimestamp <= requestTimestamp) {
            getAllSpawnpoints = false
        }
        if (result.allScannedLocs && getAllScannedLocsTimestamp <= requestTimestamp) {
            getAllScannedLocs = false
        }
        if (result.allNests && getAllNestsTimestamp <= requestTimestamp) {
            getAllNests = false
        }

        if (result.reids) {
            reincludedPokemon = difference(reincludedPokemon, new Set(result.reids))
        }

        timestamp = result.timestamp
        lastUpdateTime = Date.now()
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
    const notificationDetails = {
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
    M.toast({ html: toastHTML, displayLength: 10000 })

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
    var locationMarker = L.control({ position: 'bottomright' })
    locationMarker.onAdd = function (map) {
        var locationContainer = L.DomUtil.create('div', 'leaflet-control-locate leaflet-control-custom leaflet-bar')

        var locationButton = document.createElement('a')
        locationButton.innerHTML = '<i class="material-icons">my_location</i>'
        locationButton.title = i18n('My location')
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
        toastError(i18n('Error getting your location!'), e.message)
        clearInterval(animationInterval)
        locationIcon.innerHTML = 'my_location'
    }

    navigator.geolocation.getCurrentPosition(succes, error, { enableHighAccuracy: true })
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

function updateMainS2CellId() {
    if (typeof window.orientation !== 'undefined' || isMobileDevice()) {
        if (map.getZoom() < 12) {
            mainS2CellId = null
            return
        }
    } else {
        if (map.getZoom() < 13) {
            mainS2CellId = null
            return
        }
    }

    const center = map.getCenter()
    const key = S2.latLngToKey(center.lat, center.lng, 10)
    mainS2CellId = S2.keyToId(key)
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
/*
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
        const deploymentTime = moment(pokemon.deployment_time)
        relativeTime = deploymentTime.fromNow()
        // Append as string so we show nothing when the time is Unknown.
        absoluteTime = '<div class="gym pokemon">(' + deploymentTime.format('Do MMM HH:mm') + ')</div>'
    }

    var pokemonImage = getPokemonRawIconUrl(pokemon, serverSettings.generateImages)
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
*/

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
    initI18nDictionary().then(function () {
        const promisePokemon = initPokemonData()
        const promiseMove = initMoveData()
        const promiseItem = serverSettings.quests ? initItemData() : Promise.resolve()
        const promiseInvasion = serverSettings.invasions ? initInvasionData() : Promise.resolve()
        return Promise.all([promisePokemon, promiseMove, promiseItem, promiseInvasion, promiseRarity])
    }).then(function () {
        // Initial load.
        return updateMap()
    }).catch(function () {
        // updateMap() failed... ¯\_(ツ)_/¯
    }).then(function () {
        initPokemonFilters()
        if (serverSettings.quests) {
            initItemFilters()
        }
        if (serverSettings.invasions) {
            initInvasionFilters()
        }
    })

    getAllParks()
    updateS2Overlay()
    updateMainS2CellId()

    $('.modal').modal()
    $('.tabs').tabs()

    if (serverSettings.motd) {
        showMotd(serverSettings.motdTitle, serverSettings.motdText, serverSettings.motdPages, serverSettings.showMotdAlways)
    }

    $('.dropdown-trigger').dropdown({
        constrainWidth: false,
        coverTrigger: false
    })

    initSettingsSidebar()
    initStatsSidebar()

    if (serverSettings.gymSidebar) {
        $('#gym-sidebar').sidenav({
            edge: 'right',
            draggable: false,
            onCloseEnd: function () {
                // Make sure label/sidebar is updated next time it's opened.
                if (openGymSidebarId in mapData.gyms) {
                    mapData.gyms[openGymSidebarId].updated = true
                }
            }
        })
        const gymSidebarElem = document.getElementById('gym-sidebar')
        gymSidebar = M.Sidenav.getInstance(gymSidebarElem)
    }

    $('#weather-modal').modal({
        onOpenStart: setupWeatherModal
    })

    $('.tooltipped').tooltip()

    initBackupModals()

    window.setInterval(updateMap, serverSettings.mapUpdateInverval)
    window.setInterval(updateLabelDiffTime, 1000)
    window.setInterval(updateStaleMarkers, 2500)
    if (serverSettings.rarity) {
        window.setInterval(updatePokemonRarities, 300000, serverSettings.rarityFileName)
    }

    createUpdateWorker()
})
