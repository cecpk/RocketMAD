/* globals addListeners, mainS2CellId, mapData, markersNoCluster, settings */
/* exported processWeather, setupWeatherModal, updateWeathers */

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
        iconSize: [32, 32]
    })
    marker.setIcon(icon)

    return marker
}

function setupWeatherCell(weather) {
    const key = S2.idToKey(weather.s2_cell_id)
    const s2Cell = S2.S2Cell.FromHilbertQuadKey(key)
    const vertices = s2Cell.getCornerLatLngs()
    const polygon = L.polygon(vertices, {
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
    if (!(id in mapData.weather)) {
        weather.marker = setupWeatherMarker(weather)
        if (settings.showWeatherCells) {
            weather.polygon = setupWeatherCell(weather)
        }
        mapData.weather[id] = weather

        if (weather.s2_cell_id === mainS2CellId) {
            updateWeatherButton()
        }
    } else {
        updateWeather(id, weather)
    }

    return true
}

function updateWeather(id, weather = null) {
    if (id == null || !(id in mapData.weather)) {
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
    if (id in mapData.weather) {
        markersNoCluster.removeLayer(mapData.weather[id].marker)
        if (mapData.weather[id].polygon) {
            markersNoCluster.removeLayer(mapData.weather[id].polygon)
        }
        delete mapData.weather[id]
    }
}

function updateWeatherButton() {
    if (!settings.showWeather || !settings.showMainWeather) {
        return
    }

    const $weatherButton = $('#weather-button')
    if (mainS2CellId && mapData.weather[mainS2CellId]) {
        const weather = mapData.weather[mainS2CellId]
        const $weatherButtonIcon = $('#weather-button > i')
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
    $.each(boostedTypes[weather.gameplay_weather], function (idx, type) {
        $('#boosted-types-container').append(`
            <div class='type'>
              <div><img src='static/images/types/${type.toLowerCase()}.png' width='48'></div>
              <div>${i8ln(type)}</div>
            </div>`)
    })
}
