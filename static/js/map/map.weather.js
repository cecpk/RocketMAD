/* global L markersNoCluster map jsts weatherImages weatherNames */
/* eslint no-unused-vars: "off" */

var mainS2CellId = null

const weatherNames = {
    1: 'Clear',
    2: 'Rain',
    3: 'Partly Cloudy',
    4: 'Cloudy',
    5: 'Windy',
    6: 'Snow',
    7: 'Fog'
}

// FontAwesome weather icon classes.
const weatherClassesDay = {
    1: 'fas fa-sun',
    2: 'fas fa-cloud-showers-heavy',
    3: 'fas fa-cloud-sun',
    4: 'fas fa-cloud',
    5: 'fas fa-wind',
    6: 'far fa-snowflake',
    7: 'fas fa-smog'
}

const weatherClassesNight = {
    1: 'fas fa-moon',
    2: 'fas fa-cloud-showers-heavy',
    3: 'fas fa-cloud-moon',
    4: 'fas fa-cloud',
    5: 'fas fa-wind',
    6: 'far fa-snowflake',
    7: 'fas fa-smog'
}

const weatherIconsDay = {
    1: 'weather_clear.png',
    2: 'weather_rain.png',
    3: 'weather_partlycloudy.png',
    4: 'weather_cloudy.png',
    5: 'weather_windy.png',
    6: 'weather_snow.png',
    7: 'weather_fog.png',
}

const weatherIconsNight = {
    1: 'weather_clear_night.png',
    2: 'weather_rain.png',
    3: 'weather_partlycloudy_night.png',
    4: 'weather_cloudy.png',
    5: 'weather_windy.png',
    6: 'weather_snow.png',
    7: 'weather_fog.png',
}

const weatherImagesDay = {
    1: 'weather_image_clear.png',
    2: 'weather_image_rain.png',
    3: 'weather_image_partlycloudy.png',
    4: 'weather_image_cloudy.png',
    5: 'weather_image_windy.png',
    6: 'weather_image_snow.png',
    7: 'weather_image_fog.png',
}

const weatherImagesNight = {
    1: 'weather_image_clear_night.png',
    2: 'weather_image_rain_night.png',
    3: 'weather_image_partlycloudy_night.png',
    4: 'weather_image_cloudy_night.png',
    5: 'weather_image_windy_night.png',
    6: 'weather_image_snow_night.png',
    7: 'weather_image_fog_night.png',
}

function getWeatherIconUrl(weather, dark = true) {
    var imageUrl
    if (weather.world_time === 2) { // Night time.
        imageUrl = 'static/images/weather/' + weatherIconsNight[weather.gameplay_weather]
    } else {
        imageUrl = 'static/images/weather/' + weatherIconsDay[weather.gameplay_weather]
    }
    if (!dark) {
        imageUrl = imageUrl.replace('weather_', 'weather_light_')
    }
    return imageUrl
}

function getWeatherImageUrl(weather) {
    var imageUrl
    if (weather.world_time === 2) { // Night time.
        imageUrl = 'static/images/weather/' + weatherImagesNight[weather.gameplay_weather]
    } else {
        imageUrl = 'static/images/weather/' + weatherImagesDay[weather.gameplay_weather]
    }
    return imageUrl
}

function setupWeatherMarker(weather) {
    var marker = L.marker([weather.latitude, weather.longitude], {
        interactive: false
    })
    markersNoCluster.addLayer(marker)
    updateWeatherMarker(weather, marker)

    return marker
}

function updateWeatherMarker(weather, marker) {
    var Icon = new L.icon({
        iconUrl: getWeatherIconUrl(weather),
        iconSize: [32, 32],
    })
    marker.setIcon(Icon)

    return marker
}

function processWeather(id, weather = null) {
    if (weather !== null) {
        if (!mapData.weather.hasOwnProperty(id)) {
            if (!settings.showWeather) {
                return true
            }

            weather.marker = setupWeatherMarker(weather)
            mapData.weather[id] = weather

            if (weather.s2_cell_id === mainS2CellId) {
                updateWeatherButton()
            }
        } else {
            if (!settings.showWeather) {
                removeWeather(weather)
                return true
            }

            const isNewWeather = weather.gameplay_weather !== mapData.weather[id].gameplay_weather ||
                weather.world_time !== mapData.weather[id].world_time
            if (isNewWeather) {
                weather.marker = updateWeatherMarker(weather, mapData.weather[id].marker)
            } else {
                weather.marker = mapData.weather[id].marker
            }
            mapData.weather[id] = weather

            if (isNewWeather && weather.s2_cell_id === mainS2CellId) {
                updateWeatherButton()
            }
        }
    } else {
        if (!mapData.weather.hasOwnProperty(id)) {
            return true
        }

        if (!settings.showWeather) {
            removeWeather(mapData.weather[id])
            return true
        }

        updateWeatherMarker(mapData.weather[id], mapData.weather[id].marker)
    }
}

function reprocessWeather() {
    $.each(mapData.weather, function (id, weather) {
        processWeather(id)
    })
}

function removeWeather(weather) {
    const id = weather.s2_cell_id
    if (mapData.weather.hasOwnProperty(id)) {
        markersNoCluster.removeLayer(mapData.weather[id].marker)
        delete mapData.weather[id]
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

var $weatherButton = $('#weather-button')
var $weatherButtonIcon = $('#weather-button > i')

/**
 * Update weather icon on top bar if there is single cell on the screen
 */
function updateWeatherButton() {
    if (!settings.showWeather || !settings.showMainWeather) {
        return
    }

    if (mainS2CellId !== null && mapData.weather[mainS2CellId]) {
        const weather = mapData.weather[mainS2CellId]
        var weatherClass
        if (weather.world_time === 2) { // Night time.
            weatherClass = weatherClassesNight[weather.gameplay_weather]
        } else {
            weatherClass = weatherClassesDay[weather.gameplay_weather]
        }
        $weatherButtonIcon.removeClass()
        $weatherButtonIcon.addClass(`material-icons ${weatherClass}`)
        $weatherButton.show()
        const weatherName = i8ln(weatherNames[weather.gameplay_weather])
        $weatherButton.prop('title', weatherName)
    } else {
        $weatherButton.hide()
    }
}

function setupWeatherModal() {
    const weather = mapData.weather[mainS2CellId]
    if (!weather) {
        return
    }
    const weatherName = i8ln(weatherNames[weather.gameplay_weather])
    $('#weather-modal > .modal-content > h4').text(weatherName)
    $('#weather-modal-image > img').attr("src", getWeatherImageUrl(weather))
}


/**
 * Do main work with array of weather alerts
 * @param weatherAlerts
 */
function processWeatherAlerts(weatherAlerts) {
    deleteObsoleteWeatherAlerts(weatherAlerts)
    $.each(weatherAlerts, processWeatherAlert)
}


/**
 * Draws colored polygon for weather severity condition
 * @param i
 * @param item s2cell data
 * @returns {boolean}
 */
function processWeatherAlert(i, item) {
    if (!Store.get('showWeatherAlerts') || item.severity == null) {
        return false
    }

    var s2CellId = item.s2_cell_id
    var itemOld = mapData.weatherAlerts[s2CellId]
    if (itemOld == null) {
        safeDelMarker(item)
        item.marker = createCellAlert(item)
        mapData.weatherAlerts[s2CellId] = item
    } else if (itemOld.severity !== item.severity) {
        markersNoCluster.removeLayer(itemOld)
        item.marker = createCellAlert(item)
        mapData.weatherAlerts[s2CellId] = item
    }
}


/**
 * If drawn cell not exist in new alert array, it should be removed
 * @param newAlerts
 */
function deleteObsoleteWeatherAlerts(newAlerts) {
    var toRemove = []
    $.each(mapData.weatherAlerts, function (i, item) {
        if (!(item['s2_cell_id'] in newAlerts)) {
            safeDelMarker(item)
            toRemove.push(i)
        }
    })
    $.each(toRemove, function (i, id) {
        delete mapData.weatherAlerts[id]
    })
}


/**
 * safe setMap(null)
 * @param item
 */
function safeDelMarker(item) {
    if (item.marker) {
        markersNoCluster.removeLayer(item.marker)
    }
}




/**
 * Creates Polygon for s2cell
 * @param item
 * @returns {google.maps.Polygon}
 */
function setupS2CellPolygon(item) {
    var s2CellPolygon = L.polygon(item.vertices, {
        color: '#000000',
        opacity: 0.8,
        weight: 1,
        fillOpacity: 0,
        fillColor: '#00ff00',
        interactive: false
    })
    markersNoCluster.addLayer(s2CellPolygon)
    return s2CellPolygon
}


/**
 * Adds fillColor for s2cell polygon
 * @param item
 * @returns {google.maps.Polygon}
 */
function createCellAlert(item) {
    var cell = setupS2CellPolygon(item)
    cell.strokeOpacity = 0
    if (item.severity === 0) {
        cell.fillOpacity = 0.0
    } else if (item.severity === 1) {
        cell.fillOpacity = 0.2
        cell.fillColor = '#ffff00'
    } else if (item.severity === 2) {
        cell.fillOpacity = 0.2
        cell.fillColor = '#ff0000'
    }
    return cell
}


/**
 * Calculates square bound for s2cell
 * @param s2Cell
 * @returns {google.maps.LatLngBounds}
 */
function getS2CellBounds(s2Cell) {
    var bounds = new L.LatLngBounds()
    // iterate over the vertices
    $.each(s2Cell.vertices, function (i, latLng) {
        // extend the bounds
        bounds.extend(latLng)
    })
    return bounds
}





function degreesToCardinal(d) {
    var dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
        'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
    var ix = Math.floor((d + 11.25) / 22.5 - 0.02)
    return dirs[ix % 16]
}

/**
 * Finds weather data for s2cell, that covers more than a half of the screen
 * @returns {*}
 */
function getMainS2Cell() {
    if (typeof window.orientation !== 'undefined' || isMobileDevice()) {
        if (map.getZoom() < 12) { // viewport may contain many cells
            return
        }
    } else {
        if (map.getZoom() < 13) { // viewport may contain many cells
            return
        }
    }

    var geometryFactory = new jsts.geom.GeometryFactory()

    var bounds = map.getBounds()
    var viewportPath = [
        {'lat': bounds.getNorthEast().lat, 'lng': bounds.getNorthEast().lng},
        {'lat': bounds.getNorthEast().lat, 'lng': bounds.getSouthWest().lng},
        {'lat': bounds.getSouthWest().lat, 'lng': bounds.getSouthWest().lng},
        {'lat': bounds.getSouthWest().lat, 'lng': bounds.getNorthEast().lng}
    ]
    var jstsViewport = createJstsPolygon(geometryFactory, viewportPath)
    var viewportArea = jstsViewport.getArea()
    var maxCoverageData
    $.each(mapData.weather, function (i, s2cell) {
        var jstsS2cell = createJstsPolygon(geometryFactory, s2cell.vertices)
        var area = jstsViewport.intersection(jstsS2cell).getArea()
        if (viewportArea < area * 2) {  // more then a half of the screen covered by cell
            maxCoverageData = s2cell
        }
    })
    return maxCoverageData
}


/**
 * Creates jsts polygon from coordinates array
 * @param geometryFactory
 * @param path
 * @returns {*}
 */
function createJstsPolygon(geometryFactory, path) {
    var coordinates = path.map(function name(coord) {
        return new jsts.geom.Coordinate(coord.lat, coord.lng)
    })
    if (coordinates[0].compareTo(coordinates[coordinates.length - 1]) !== 0) {
        coordinates.push(coordinates[0])
    }
    var shell = geometryFactory.createLinearRing(coordinates)
    return geometryFactory.createPolygon(shell)
}
