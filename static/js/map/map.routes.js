/* globals addListeners, autoPanPopup, mapData, markers, settings,
   updateMarkerLayer, pokestopQuestZIndex, pokestopZIndex
 */
/* exported processRoute, updateRoutes, updateRouteLabel */

function setupRouteMarker(route, start = true) {
    /* create marker for start point (start = true)
       or end point (start = false) */

    var lat = 0.0
    var lng = 0.0
    if (start === true) {
        lat = route.start_poi_latitude
        lng = route.start_poi_longitude
    } else {
        lat = route.end_poi_latitude
        lng = route.end_poi_longitude
    }

    var marker = L.marker([lat, lng])

    marker.start = start
    marker.route_id = route.route_id
    updateRouteMarker(route, marker)
    marker.bindPopup('', { autoPan: autoPanPopup() })
    addListeners(marker, 'routes')

    return marker
}

function updateRouteMarker(route, marker) {

    var start = marker.start
    var routeAnchor = [20, 20]
    if (start === false) {
        routeAnchor = [20, -40]
    }

    const routeIcon = L.icon({
        iconUrl: getRouteIconUrl(route, start),
        iconSize: [32, 32],
        iconAnchor: routeAnchor,
        popupAnchor: [0, -16],
    })
    marker.setIcon(routeIcon)

    if (start === true) {
        marker.setZIndexOffset(pokestopQuestZIndex)
    } else {
        marker.setZIndexOffset(pokestopZIndex)
    }

    updateMarkerLayer(marker, false, {})

    return marker
}

function getRouteIconUrl(route, start) {
    var icon_url = 'static/images/routes/route_start.png'
    if (start === false) {
        icon_url = 'static/images/routes/route_end.png'
    }
    return icon_url
}

function setupRoutePath(route) {
    var routePoints = []
    for (const waypoint in route.waypoints) {
        if (!waypoint['lat_degrees'] || !waypoint['lng_degrees']) {
            console.log(waypoint)
        }
        var wp = new L.LatLng(waypoint['lat_degrees'], waypoint['lng_degrees'])
        routePoints.push(wp)
    }

    var routePath = new L.Polyline(routePoints, {
        color: '#999999',
        weight: 3,
        smoothFactor: 1
    });
    routePath.route_id = route.route_id

    markers.addLayer(routePath)

    return routePath
}


function routeLabel(route, marker) {
    var start = marker.start
    var imageUrl = 'static/images/routes/route_icon.png'
    var icon_url = 'static/images/routes/route_start.png'
    var routeTitle = 'Route start'

    if (start === false) {
        icon_url = 'static/images/routes/route_end.png'
        routeTitle = 'Route end'
    }

    var routeDisplay = `
        <div class='section-divider'></div>
        <div class='pokestop-container'>
          <div class='pokestop-container-left'>
            <div>
              <img class='quest-image' src="${icon_url}" width='64'/>
            </div>
          </div>
          <div class='pokestop-container-right'>
            <div class='title'>
              ${i18n(routeTitle)}
            </div>
            <div class='info-container'>
              <div>
                ${i18n('Distance')}: <strong>${route.route_distance_meters} ${i18n('meters')}</strong>
              </div>
              <div>
                ${i18n('Duration')}: <strong>${route.route_duration_seconds} ${i18n('seconds')}</strong>
              </div>
              <div>
                ${i18n('Reversible')}: <strong>${route.reversible}</strong>
              </div>
            </div>
          </div>
        </div>`

    return `
        <div>
          <div class='pokestop-container'>
            <div class='pokestop-container-left'>
              <div>
                <img class='pokestop-icon' src='${imageUrl}' width='64' height='64'>
              </div>
            </div>
            <div class='pokestop-container-right'>
              <div class='title'>
                ${route.name}
              </div>
              <div>
                ${i18n('Last scanned')}: <strong>${timestampToDateTime(route.last_updated)}</strong>
              </div>
              <div>
                <a href='javascript:void(0);' onclick='javascript:openMapDirections(${route.start_poi_latitude},${route.start_poi_longitude},"${settings.mapServiceProvider}");' title='${i18n('Open in')} ${mapServiceProviderNames[settings.mapServiceProvider]}'><i class="fas fa-map-marked-alt"></i> ${route.start_poi_latitude.toFixed(5)}, ${route.start_poi_longitude.toFixed(5)}</a>
              </div>
            </div>
          </div>
          ${routeDisplay}
        </div>`
}

function updateRouteLabel(route, marker) {
    marker.getPopup().setContent(routeLabel(route, marker))
}

function processRoute(route) {
    if (!settings.showRoutes) {
        return false
    }

    const id = route.route_id
    if (!(id in mapData.routes)) {
        route.marker1 = setupRouteMarker(route)
        route.marker2 = setupRouteMarker(route, false)
        route.routePath = setupRoutePath(route)
        mapData.routes[id] = route
    } else {
        updateRoute(id, route)
    }

    return true
}

function updateRoute(id, route = null) {
    if (id == null || !(id in mapData.routes)) {
        return true
    }

    const isRouteNull = route === null
    if (isRouteNull) {
        route = mapData.routes[id]
    }

    if (!settings.showRoutes) {
        removeRoute(route)
        return true
    }

    if (!isRouteNull) {
        mapData.routes[id] = route

        if (route.marker1.isPopupOpen()) {
            updateRouteLabel(route, route.marker1)
        } else {
            // Make sure label is updated next time it's opened.
            route.marker1.updated = true
        }
        if (route.marker2.isPopupOpen()) {
            updateRouteLabel(route, route.marker2)
        } else {
            // Make sure label is updated next time it's opened.
            route.marker2.updated = true
        }
    } else {
        updateRouteMarker(mapData.routes[id], mapData.routes[id].marker1)
        updateRouteMarker(mapData.routes[id], mapData.routes[id].marker2)
        mapData.routes[id].routePath = setupRoutePath(mapData.routes[id])
    }

    return true
}

function updateRoutes() {
    $.each(mapData.routes, function (id, route) {
        updateRoute(id)
    })
}

function removeRoute(route) {
    const id = route.route_id
    if (id in mapData.routes) {
        markers.removeLayer(mapData.routes[id].marker1)
        markers.removeLayer(mapData.routes[id].marker2)
        markers.removeLayer(mapData.routes[id].routePath)
        delete mapData.routes[id]
    }
}
