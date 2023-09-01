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
        iconAnchor: marker.start ? [12, 20] : [12, 12],
        popupAnchor: marker.start ? [0, -5] : [0, 3]
    })
    marker.setIcon(routeIcon)

    if (marker.start === true) {
        marker.setZIndexOffset(pokestopQuestZIndex)
    } else {
        marker.setZIndexOffset(pokestopZIndex)
    }

    return marker
}

function getRouteColor(route) {
    const colorTable = ['#DA051B',
                        '#E84921',
                        '#EF7D1D',
                        '#F8B310',
                        '#F3E500',
                        '#8EB71B',
                        '#229548',
                        '#0094AA',
                        '#1F4995',
                        '#172C85',
                        '#4F2577',
                        '#A0077C',
                        '#F5B3F9']

    if (route.route_id) {
        return colorTable[parseInt(route.route_id.slice(-5,-3),16)%colorTable.length]
    }
    return colorTable[Math.floor(Math.random() * colorTable.length)]
}

function addPopup(route, marker) {
    const popupContent = routeLabel(route, null)
    marker.bindPopup(popupContent, { autoPan: autoPanPopup() })

    marker.on('click', function (e) {
        this.openPopup(e.latlng)
        this.setStyle({
            weight: 6
        })
    })
    marker.on('mouseover', function (e) {
        this.openPopup(e.latlng)
        this.setStyle({
            weight: 6
        })
    })
    marker.on('mouseout', function (e) {
        this.closePopup()
        this.setStyle({
            weight: 3
        })
    })
    marker.on('mousemove', function (e) {
        this.closePopup()
        this.openPopup(map.mouseEventToLatLng(e.originalEvent))
        this.setStyle({
            weight: 6
        })
    })
}

function setupRoutePath(route) {
    let pointLL = new L.latLng(route.start_poi_latitude, route.start_poi_longitude)
    let routePoints = [pointLL]

    const wp = JSON.parse(route.waypoints)
    for (let i = 0; i < wp.length; i++) {
        if (!wp[i].lat_degrees || !wp[i].lng_degrees) {
            console.log('Unknown route waypoint: ', JSON.stringify(wp[i]))
            continue
        }
        pointLL = new L.latLng(wp[i].lat_degrees, wp[i].lng_degrees)
        routePoints.push(pointLL)
    }
    pointLL = new L.latLng(route.end_poi_latitude, route.end_poi_longitude)
    routePoints.push(pointLL)

    L.ClusterablePolyline = L.Polyline.extend({
        _originalInitialize: L.Polyline.prototype.initialize,

        initialize: function (bounds, options) {
            this._originalInitialize(bounds, options)
            this._latlng = this.getBounds().getCenter()
        },

        //getLatLng: function () {
            //return this._latlng
        //},

        // dummy method.
        setLatLng: function () {
        }
    })

    const routePath = new L.ClusterablePolyline(routePoints, {
        color: getRouteColor(route),
        weight: 3,
        smoothFactor: 1
    })
    routePath.route_id = route.route_id
    addPopup(route, routePath)
    markers.addLayer(routePath)

    return routePath
}

function routeLabel(route, marker) {
    let imageUrl = 'static/images/routes/route_icon.png'
    let iconUrl = 'static/images/routes/route_icon.png'
    let routeTitle = 'Route path'
    let imageClass = 'pokestop-icon'
    let imageOnclick = ''
    let imageStyle = ''

    if (marker) {
        if (marker.start) {
            if (route.start_poi_image_url) {
                imageUrl = route.start_poi_image_url.replace(/^http:\/\//i, '//')
                imageClass = 'pokestop-image'
                imageOnclick = `onclick='showImageModal("${imageUrl}", "${route.name.replace(/"/g, '\\&quot;').replace(/'/g, '\\&#39;')}")'`
                imageStyle = `style="border-width: 3px; border-color: #${route.image_border_color_hex}; border-style: solid;"`
            } // else keep default route_icon image
        } else {
            if (route.end_poi_image_url) {
                imageUrl = route.end_poi_image_url.replace(/^http:\/\//i, '//')
                imageClass = 'pokestop-image'
                imageOnclick = `onclick='showImageModal("${imageUrl}", "${route.name.replace(/"/g, '\\&quot;').replace(/'/g, '\\&#39;')}")'`
                imageStyle = `style="border-width: 3px; border-color: #${route.image_border_color_hex}; border-style: solid;"`
            } // else keep default route_icon image
        }
        iconUrl = `static/images/routes/route_${marker.start ? 'start' : 'end'}.png`
        routeTitle = `Route ${marker.start ? 'start' : 'end'}`
    } else {
        if (route.image) {
            imageUrl = route.image.replace(/^http:\/\//i, '//')
            imageClass = 'pokestop-image'
            imageOnclick = `onclick='showImageModal("${imageUrl}", "${route.name.replace(/"/g, '\\&quot;').replace(/'/g, '\\&#39;')}")'`
            imageStyle = `style="border-width: 3px; border-color: #${route.image_border_color_hex}; border-style: solid;"`
        } // else keep default route_icon image
    }
    const rDS = parseInt(route.route_duration_seconds,10)
    const duration = `${Math.floor(rDS / 3600)}h ${lpad( Math.floor((rDS % 3600)/60), 2, '0')}m ${lpad( Math.floor(rDS % 60), 2, '0')}s`

    const color = getRouteColor(route)
    const routeDisplay = `
        <hr style="height:5px;border-width:0;color:${color};background-color:${color}">
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
                ${i18n('Duration')}: <strong>${duration}</strong>
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
                <img class='${imageClass}' ${imageStyle} src='${imageUrl}' ${imageOnclick} width='64' height='64'>
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
                ${i18n('Start POI')}: <a href='javascript:void(0);' onclick='javascript:openMapDirections(${route.start_poi_latitude},${route.start_poi_longitude},"${settings.mapServiceProvider}");' title='${i18n('Open in')} ${mapServiceProviderNames[settings.mapServiceProvider]}'><i class="fas fa-map-marked-alt"></i> ${route.start_poi_latitude.toFixed(5)}, ${route.start_poi_longitude.toFixed(5)}</a>
              </div>
              <div>
                ${i18n('End POI')}: <a href='javascript:void(0);' onclick='javascript:openMapDirections(${route.end_poi_latitude},${route.end_poi_longitude},"${settings.mapServiceProvider}");' title='${i18n('Open in')} ${mapServiceProviderNames[settings.mapServiceProvider]}'><i class="fas fa-map-marked-alt"></i> ${route.end_poi_latitude.toFixed(5)}, ${route.end_poi_longitude.toFixed(5)}</a>
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
