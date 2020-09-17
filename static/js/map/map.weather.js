/* global L markersNoCluster map jsts weatherImages weatherNames */
/* eslint no-unused-vars: "off" */

var mainS2CellId = null

var $weatherButton = $('#weather-button')
var $weatherButtonIcon = $('#weather-button > i')

const weatherNames = {
    1: 'Clear',
    2: 'Rain',
    3: 'Partly Cloudy',
    4: 'Cloudy',
    5: 'Windy',
    6: 'Snow',
    7: 'Fog'
}

const weatherIconNames = {
    1: 'clear',
    2: 'rain',
    3: 'partlycloudy',
    4: 'cloudy',
    5: 'windy',
    6: 'snow',
    7: 'fog'
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

const boostedTypes = {
    1: ['Grass', 'Ground', 'Fire'],
    2: ['Water', 'Electric', 'Bug'],
    3: ['Normal', 'Rock'],
    4: ['Fairy', 'Fighting', 'Poison'],
    5: ['Dragon', 'Flying', 'Psychic'],
    6: ['Ice', 'Steel'],
    7: ['Dark', 'Ghost']
}

function getWeatherIconUrl(weather, light = false) {
    var imageUrl = 'static/images/weather/weather_icon_' + weatherIconNames[weather.gameplay_weather]
    if (weather.world_time === 2 && (weather.gameplay_weather === 1 || weather.gameplay_weather === 3)) {
        imageUrl += '_night'
    }
    if (weather.severity === 1) {
        imageUrl += '_moderate'
    } else if (weather.severity === 2) {
        imageUrl += '_extreme'
    }
    if (light) {
        imageUrl += '_light'
    }
    return imageUrl + '.png'
}

function getWeatherImageUrl(weather) {
    var imageUrl = 'static/images/weather/weather_img_' + weatherIconNames[weather.gameplay_weather]
    if (weather.world_time === 2) {
        imageUrl += '_night'
    }
    return imageUrl + '.png'
}

function isUpToDateWeather(weather) {
    var hourStartTime = moment() // Local time.
    hourStartTime.minutes(0)
    hourStartTime.seconds(0)
    hourStartTime.milliseconds(0)
    const timestamp = moment.utc(hourStartTime).unix() * 1000
    return weather.last_updated >= timestamp
}

function setupWeatherMarker(weather) {
    var marker = L.marker([weather.latitude, weather.longitude])
    markersNoCluster.addLayer(marker)
    updateWeatherMarker(weather, marker)
    marker.bindPopup()
    marker.s2_cell_id = weather.s2_cell_id
    addListeners(marker, 'weather')

    return marker
}

function updateWeatherMarker(weather, marker) {
    var icon = L.icon({
        iconUrl: getWeatherIconUrl(weather),
        iconSize: [32, 32],
    })
    marker.setIcon(icon)

    return marker
}

function setupWeatherCell(weather) {
    const vertices = S2.idToCornerLatLngs(weather.s2_cell_id)
    var polygon = L.polygon(vertices, {
        color: '#256377',
        weight: 1.5,
        fillOpacity: 0,
        interactive: false
    })
    markersNoCluster.addLayer(polygon)

    return polygon
}

function weatherLabel(weather) {
    var weatherTitle = i8ln(weatherNames[weather.gameplay_weather])
    var lastUpdated
    if (!isUpToDateWeather(weather)) {
        weatherTitle += ` <span class='weather-outdated'>(${i8ln('outdated')})</span>`
        lastUpdated = `<span class='weather-outdated'>${timestampToDateTime(weather.last_updated)}</span>`
    } else {
        lastUpdated = timestampToDateTime(weather.last_updated)
    }
    var alertDisplay = ''
    if (weather.severity > 0) {
        const level = weather.severity === 1 ? 'Moderate' : 'Extreme'
        alertDisplay = `
            <div>
              ${i8ln('Weather alert')}: <span class='weather-${level.toLowerCase()}'>${i8ln(level + ' level')}</span>
            </div>`
    }
    var time = weather.world_time === 1 ? 'Daytime' : 'Nighttime'

    return `
        <div class='title'>${weatherTitle}</div>
        ${alertDisplay}
        <div>${i8ln('Time of day')}: <strong>${i8ln(time)}</strong></div>
        <div>${i8ln('Last updated')}: <strong>${lastUpdated}</strong></div>`
}

function updateWeatherLabel(weather, marker) {
    marker.getPopup().setContent(weatherLabel(weather))
}

function processWeather(weather) {
    if (!settings.showWeather) {
        return false
    }

    const id = weather.s2_cell_id
    if (!mapData.weather.hasOwnProperty(id)) {
        weather.marker = setupWeatherMarker(weather)
        if (settings.showWeatherCells) {
            weather.polygon = setupWeatherCell(weather)
        }
        mapData.weather[id] = weather

        if (mainS2CellId === null) {
            updateMainS2CellId()
        }
        if (weather.s2_cell_id === mainS2CellId) {
            updateWeatherButton()
        }
    } else {
        updateWeather(id, weather)
    }

    return true
}

function updateWeather(id, weather = null) {
    if (id === undefined || id === null || !mapData.weather.hasOwnProperty(id)) {
        return true
    }

    const isWeatherNull = weather === null
    if (isWeatherNull) {
        weather = mapData.weather[id]
    }

    if (!settings.showWeather) {
        removeWeather(weather)
        return true
    }

    if (!isWeatherNull) {
        const oldWeather = mapData.weather[id]
        const isNewWeather = weather.gameplay_weather !== oldWeather.gameplay_weather ||
            weather.world_time !== oldWeather.world_time || weather.severity !== oldWeather.severity
        if (isNewWeather) {
            weather.marker = updateWeatherMarker(weather, mapData.weather[id].marker)
        } else {
            weather.marker = mapData.weather[id].marker
        }
        if (mapData.weather[id].polygon) {
            weather.polygon = mapData.weather[id].polygon
        }
        mapData.weather[id] = weather

        if (weather.marker.isPopupOpen()) {
            updateWeatherLabel(weather, weather.marker)
        }

        if (isNewWeather && weather.s2_cell_id === mainS2CellId) {
            updateWeatherButton()
        }
    } else {
        updateWeatherMarker(mapData.weather[id], mapData.weather[id].marker)

        if (settings.showWeatherCells && !mapData.weather[id].polygon) {
            mapData.weather[id].polygon = setupWeatherCell(mapData.weather[id])
        } else if (!settings.showWeatherCells && mapData.weather[id].polygon) {
            markersNoCluster.removeLayer(mapData.weather[id].polygon)
            delete mapData.weather[id].polygon
        }
    }

    return true
}

function updateWeathers() {
    $.each(mapData.weather, function (id, weather) {
        updateWeather(id)
    })
}

function removeWeather(weather) {
    const id = weather.s2_cell_id
    if (mapData.weather.hasOwnProperty(id)) {
        markersNoCluster.removeLayer(mapData.weather[id].marker)
        if (mapData.weather[id].polygon) {
            markersNoCluster.removeLayer(mapData.weather[id].polygon)
        }
        delete mapData.weather[id]
    }
}

function updateMainS2CellId() {
    if (typeof window.orientation !== 'undefined' || isMobileDevice()) {
        if (map.getZoom() < 12) {
            mainS2CellId = 0
            return
        }
    } else {
        if (map.getZoom() < 13) {
            mainS2CellId = 0
            return
        }
    }

    const center = map.getCenter()
    const key = S2.latLngToKey(center.lat, center.lng, 10)
    mainS2CellId = S2.keyToId(key)
}

function updateWeatherButton() {
    if (!settings.showWeather || !settings.showMainWeather) {
        return
    }

    if (mainS2CellId && mapData.weather[mainS2CellId]) {
        const weather = mapData.weather[mainS2CellId]
        var weatherClass
        if (weather.world_time === 1) { // Daytime.
            weatherClass = weatherClassesDay[weather.gameplay_weather]
        } else { // Nighttime.
            weatherClass = weatherClassesNight[weather.gameplay_weather]
        }
        $weatherButtonIcon.removeClass()
        $weatherButtonIcon.addClass(`material-icons ${weatherClass}`)
        $weatherButton.prop('title', i8ln(weatherNames[weather.gameplay_weather]))
        $weatherButton.show()
    } else {
        $weatherButton.hide()
    }
}

function setupWeatherModal() {
    const weather = mapData.weather[mainS2CellId]
    if (!weather) {
        return
    }
    var weatherTitle = i8ln(weatherNames[weather.gameplay_weather])
    if (weather.severity === 1) {
        weatherTitle += ` <img id='alert-icon' src='static/images/weather/weather_moderate.png' title='${i8ln('Moderate weather alert')}' width="60">`
    } else if (weather.severity === 2) {
        weatherTitle += ` <img id='alert-icon' src='static/images/weather/weather_extreme.png' title='${i8ln('Extreme weather alert')}' width="60">`
    }
    if (!isUpToDateWeather(weather)) {
        weatherTitle += ` <span class='weather-outdated'>(${i8ln('outdated')})</span>`
    }
    $('#weather-modal > .modal-content > h4').html(weatherTitle)
    $('#weather-modal-image > img').attr('src', getWeatherImageUrl(weather))
    $('#boosted-types-container').empty()
    $.each(boostedTypes[weather.gameplay_weather], function(idx, type) {
        $('#boosted-types-container').append(`
            <div class='type'>
              <div><img src='static/images/types/${type.toLowerCase()}.png' width='48'></div>
              <div>${i8ln(type)}</div>
            </div>`)
    })
}
