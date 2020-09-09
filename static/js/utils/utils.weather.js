/* exported boostedTypes, getWeatherIconUrl, getWeatherImageUrl, isUpToDateWeather, weatherClassesDay, weatherClassesNight, weatherIconNames, weatherNames */

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
