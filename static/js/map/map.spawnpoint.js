function getSpawnpointColor(spawnpoint) {
    if (spawnpoint.spawn_time) {
        if (isNowBetween(spawnpoint.spawn_time, spawnpoint.despawn_time)) {
            return 'green'
        } else {
            return 'blue'
        }
    } else {
        return 'red'
    }
}

function isSpawnpointRangesActive() {
    return settings.showRanges && settings.includedRangeTypes.includes(4)
}

function setupSpawnpointMarker(spawnpoint) {
    var marker = L.circle([spawnpoint.latitude, spawnpoint.longitude], {
        radius: 2,
        weight: 1,
        opacity: 0.7,
        fillOpacity: 0.5,
    }).bindPopup()
    updateSpawnpointMarker(spawnpoint, marker)
    markers.addLayer(marker)
    addListeners(marker, 'spawnpoint')
    marker.spawnpoint_id = spawnpoint.spawnpoint_id

    return marker
}

function updateSpawnpointMarker(spawnpoint, marker) {
    const color = getSpawnpointColor(spawnpoint)
    marker.setStyle({color: color})

    return marker
}

function spawnpointLabel(spawnpoint) {
    if (spawnpoint.spawn_time) {
        if (spawnpoint.spawndef == 15) {
          var type = '1h'
        } else {
          var type = '30m'
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
          <a href='javascript:void(0);' onclick='javascript:openMapDirections(${spawnpoint.latitude},${spawnpoint.longitude},"${settings.mapServiceProvider}");' class='link-button' title='Open in ${mapServiceProviderNames[settings.mapServiceProvider]}'><i class="fas fa-map-marked-alt"></i> ${spawnpoint.latitude.toFixed(5)}, ${spawnpoint.longitude.toFixed(5)}</a>
        </div>`
}

function updateSpawnpointLabel(spawnpoint, marker) {
    marker.getPopup().setContent(spawnpointLabel(spawnpoint))
    if (marker.isPopupOpen()) {
        // Update countdown time to prevent a countdown time of 0.
        updateLabelDiffTime()
    }
}

function processSpawnpoint(spawnpoint) {
    if (!settings.showSpawnpoints) {
        return false
    }

    const id = spawnpoint.spawnpoint_id
    if (!mapData.spawnpoints.hasOwnProperty(id)) {
        spawnpoint.marker = setupSpawnpointMarker(spawnpoint)
        if (isSpawnpointRangesActive()) {
            spawnpoint.rangeCircle = setupRangeCircle(spawnpoint, 'spawnpoint', true)
        }
        spawnpoint.updated = true
        mapData.spawnpoints[id] = spawnpoint
    } else {
        updateSpawnpoint(id, spawnpoint)
    }

    return true
}

function updateSpawnpoint(id, spawnpoint = null) {
    if (id === undefined || id === null || !mapData.spawnpoints.hasOwnProperty(id)) {
        return true
    }

    const isSpawnpointNull = spawnpoint === null
    if (isSpawnpointNull) {
        spawnpoint = mapData.spawnpoints[id]
    }

    if (!settings.showSpawnpoints) {
        removeSpawnpoint(spawnpoint)
        return true
    }

    if (!isSpawnpointNull) {
        if (spawnpoint.spawn_time !== mapData.spawnpoints[id].spawn_time) {
            spawnpoint.marker = updateSpawnpointMarker(spawnpoint, mapData.spawnpoints[id].marker)
        } else {
            spawnpoint.marker = mapData.spawnpoints[id].marker
        }
        if (mapData.spawnpoints[id].rangeCircle) {
            spawnpoint.rangeCircle = mapData.spawnpoints[id].rangeCircle
        }
        mapData.spawnpoints[id] = spawnpoint

        if (spawnpoint.marker.isPopupOpen()) {
            updateSpawnpointLabel(spawnpoint, mapData.spawnpoints[id].marker)
        } else {
            // Make sure label is updated next time it's opened.
            mapData.spawnpoints[id].updated = true
        }
    } else {
        updateSpawnpointMarker(spawnpoint, mapData.spawnpoints[id].marker)
        if (isSpawnpointRangesActive() && !spawnpoint.rangeCircle) {
            mapData.spawnpoints[id].rangeCircle = setupRangeCircle(spawnpoint, 'spawnpoint', true)
        } else {
            updateRangeCircle(mapData.spawnpoints[id], 'spawnpoint', true)
        }

        if (spawnpoint.marker.isPopupOpen()) {
            updateSpawnpointLabel(spawnpoint, mapData.spawnpoints[id].marker)
        } else {
            // Make sure label is updated next time it's opened.
            mapData.spawnpoints[id].updated = true
        }
    }

    return true
}

function updateSpawnpoints() {
    $.each(mapData.spawnpoints, function (id, spawnpoint) {
        updateSpawnpoint(id)
    })
}

function removeSpawnpoint(spawnpoint) {
    const id = spawnpoint.spawnpoint_id
    if (mapData.spawnpoints.hasOwnProperty(id)) {
        if (mapData.spawnpoints[id].rangeCircle) {
            removeRangeCircle(mapData.spawnpoints[id].rangeCircle)
        }
        removeMarker(mapData.spawnpoints[id].marker)
        delete mapData.spawnpoints[id]
    }
}
