function getColorByTime(value) {
    // Changes the color from red to green over 15 mins
    var diff = (Date.now() - value) / 1000 / 60 / 15

    if (diff > 1) {
        diff = 1
    }

    // value from 0 to 1 - Green to Red
    var hue = ((1 - diff) * 120).toString(10)
    return ['hsl(', hue, ',100%,50%)'].join('')
}

function setupScannedLocationMarker(scannedLoc) {
    var marker = L.circle([scannedLoc.latitude, scannedLoc.longitude], {
        interactive: false,
        opacity: 0.6,
        fillOpacity: 0.2
    })
    updateScannedLocationMarker(scannedLoc, marker)
    markersNoCluster.addLayer(marker)

    return marker
}

function updateScannedLocationMarker(scannedLoc, marker) {
    const radius = serverSettings.pokemons ? 70 : 450 // Meters.
    marker.setRadius(radius)
    const color = getColorByTime(scannedLoc.last_modified)
    marker.setStyle({color: color})

    return marker
}

function processScannedLocation(scannedLoc) {
    if (!settings.showScannedLocations) {
        return false
    }

    const id = scannedLoc.latitude + '_' + scannedLoc.longitude
    if (!mapData.scannedLocs.hasOwnProperty(id)) {
        scannedLoc.scanned_loc_id = id
        scannedLoc.marker = setupScannedLocationMarker(scannedLoc)
        mapData.scannedLocs[id] = scannedLoc
    } else {
        updateScannedLocation(id, scannedLoc)
    }

    return true
}

function updateScannedLocation(id, scannedLoc = null) {
    if (id === undefined || id === null || !mapData.scannedLocs.hasOwnProperty(id)) {
        return true
    }

    const isLocationNull = scannedLoc === null
    if (isLocationNull) {
        scannedLoc = mapData.scannedLocs[id]
    }

    if (!settings.showScannedLocations) {
        removeScannedLocation(scannedLoc)
        return true
    }

    if (!isLocationNull) {
        mapData.scannedLocs[id].last_modified = scannedLoc.last_modified
    }
    updateScannedLocationMarker(scannedLoc, mapData.scannedLocs[id].marker)

    return true
}

function updateScannedLocations() {
    $.each(mapData.scannedLocs, function (id, scannedLoc) {
        updateScannedLocation(id)
    })
}

function removeScannedLocation(scannedLoc) {
    const id = scannedLoc.scanned_loc_id
    if (mapData.scannedLocs.hasOwnProperty(id)) {
        removeMarker(mapData.scannedLocs[id].marker)
        delete mapData.scannedLocs[id]
    }
}
