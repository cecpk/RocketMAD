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
          <a href='javascript:void(0);' onclick='javascript:openMapDirections(${spawnpoint.latitude},${spawnpoint.longitude},${Store.get('mapServiceProvider')});' class='link-button' title='Open in ${mapLabel} Maps'><i class="fas fa-map-marked-alt"></i> ${spawnpoint.latitude.toFixed(5)}, ${spawnpoint.longitude.toFixed(5)}</a>
        </div>`
}

function updateSpawnpointLabel(spawnpoint, marker) {
    marker.getPopup().setContent(spawnpointLabel(spawnpoint))
    if (marker.isPopupOpen()) {
        // Update countdown time to prevent a countdown time of 0.
        updateLabelDiffTime()
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
