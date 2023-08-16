/* globals addListeners, autoPanPopup, mapData, markers, settings,
   updateMarkerLayer, pokestopQuestZIndex, pokestopZIndex
 */
/* exported processRoute, removeRoutes, updateRouteLabel */

function setupRouteMarker(route, start = true) {
    /* create marker for start point (start = true)
       or end point (start = false) */

    let lat = 0.0
    let lng = 0.0
    if (start === true) {
        lat = route.start_poi_latitude
        lng = route.start_poi_longitude
    } else {
        lat = route.end_poi_latitude
        lng = route.end_poi_longitude
    }

    const marker = L.marker([lat, lng])
    marker.start = start
    marker.route_id = route.route_id
    updateRouteMarker(marker)
    marker.bindPopup('', { autoPan: autoPanPopup() })
    addListeners(marker, 'route')
    updateRouteLabel(route, marker)

    markers.addLayer(marker)

    return marker
}

function updateRouteMarker(marker) {
    const routeIcon = L.icon({
        iconUrl: `static/images/routes/route_${marker.start ? 'start' : 'end'}.png`,
        iconSize: [24, 24],
        iconAnchor: marker.start ? [-12, 20] : [-12, 12],
        popupAnchor: marker.start ? [24, -5] : [24, 3]
    })
    marker.setIcon(routeIcon)

    if (marker.start === true) {
        marker.setZIndexOffset(pokestopQuestZIndex)
    } else {
        marker.setZIndexOffset(pokestopZIndex)
    }

    return marker
}

function setupRoutePath(route) {
    const routePoints = []

    const wp = JSON.parse(route.waypoints)
    for (let i = 0; i < wp.length; i++) {
        if (!wp[i].lat_degrees || !wp[i].lng_degrees) {
            console.log('Unknown route waypoint: ', JSON.stringify(wp[i]))
            continue
        }
        const pointLL = new L.latLng(wp[i].lat_degrees, wp[i].lng_degrees)
        routePoints.push(pointLL)
    }

    L.ClusterablePolyline = L.Polyline.extend({
        _originalInitialize: L.Polyline.prototype.initialize,

        initialize: function (bounds, options) {
            this._originalInitialize(bounds, options);
            this._latlng = this.getBounds().getCenter();
        },

        getLatLng: function () {
            return this._latlng;
        },

        // dummy method.
        setLatLng: function () {
        }
    })

    const routePath = new L.ClusterablePolyline(routePoints, {
        color: '#999999',
        weight: 3,
        smoothFactor: 1
    })
    routePath.route_id = route.route_id

    markers.addLayer(routePath)

    return routePath
}

function routeLabel(route, marker) {
    const imageUrl = 'static/images/routes/route_icon.png'
    const iconUrl = `static/images/routes/route_${marker.start ? 'start' : 'end'}.png`
    const routeTitle = `Route ${marker.start ? 'start' : 'end'}`

    const routeDisplay = `
        <div class='section-divider'></div>
        <div class='pokestop-container'>
          <div class='pokestop-container-left'>
            <div>
              <img class='quest-image' src="${iconUrl}" width='64'/>
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

    removeRoute(id)
    route.marker1 = setupRouteMarker(route)
    route.marker2 = setupRouteMarker(route, false)
    route.routePath = setupRoutePath(route)
    mapData.routes[id] = route

    return true
}

function removeRoutes() {
    $.each(mapData.routes, function (id, route) {
        removeRoute(id)
    })
}

function removeRoute(id) {
    if (id in mapData.routes) {
        if (mapData.routes[id].marker1) {
            markers.removeLayer(mapData.routes[id].marker1)
        }
        if (mapData.routes[id].marker2) {
            markers.removeLayer(mapData.routes[id].marker2)
        }
        if (mapData.routes[id].routePath) {
            markers.removeLayer(mapData.routes[id].routePath)
        }
        delete mapData.routes[id]
    }
}
