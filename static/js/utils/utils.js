/*
exported canPrimaryInputHover, deviceCanHover, difference, ding,
disableDarkMode, enableDarkMode, getDecimalSeparator, getParameterByName,
getPointDistance, getThousandsSeparator, hasCoarsePrimaryPointer,
hasFinePrimaryPointer, hasLocationSupport, intersection, isMobileDevice,
isNowBetween, mapServiceProviderNames, removeLastDirsFromUrl,
showImageModal, symmetricDifference, timestampToDate, timestampToDateTime,
timestampToTime, toastError, toastInfo, toastSuccess, toastWarning, union,
updateLabelDiffTime
*/

let mobileDevice = null
let primaryPointerAccuracy = null
let primaryInputCanHover = null
let locationSupport = null
let decimalSeparator = null
let thousandsSeparator = null
const mapServiceProviderNames = {
    googlemaps: 'Google Maps',
    applemaps: 'Apple Maps',
    bingmaps: 'Bing Maps',
    openstreetmap: 'OpenStreetMap',
    waze: 'Waze'
}
const ding = new Audio('static/sounds/ding.mp3')

function isMobileDevice() {
    if (mobileDevice === null) {
        mobileDevice = /Mobi|Android/i.test(navigator.userAgent)
    }
    return mobileDevice
}

function setPrimaryPointerAccuracy() {
    if (primaryPointerAccuracy === null) {
        if (window.matchMedia('(pointer: coarse)').matches) {
            primaryPointerAccuracy = 'coarse'
        } else if (window.matchMedia('(pointer: fine)').matches) {
            primaryPointerAccuracy = 'fine'
        } else {
            primaryPointerAccuracy = 'none'
        }
    }
}

function hasCoarsePrimaryPointer() {
    setPrimaryPointerAccuracy()
    return primaryPointerAccuracy === 'coarse'
}

function hasFinePrimaryPointer() {
    setPrimaryPointerAccuracy()
    return primaryPointerAccuracy === 'fine'
}

function canPrimaryInputHover() {
    if (primaryInputCanHover === null) {
        primaryInputCanHover = window.matchMedia('(hover: hover)').matches
    }
    return primaryInputCanHover
}

function hasLocationSupport() {
    if (locationSupport === null) {
        locationSupport = navigator.geolocation && window.isSecureContext
    }
    return locationSupport
}

function getDecimalSeparator() {
    if (decimalSeparator === null) {
        const n = 1.1
        decimalSeparator = n.toLocaleString().substring(1, 2)
    }
    return decimalSeparator
}

function getThousandsSeparator() {
    if (thousandsSeparator === null) {
        const n = 1000
        thousandsSeparator = n.toLocaleString().substring(1, 2)
    }
    return thousandsSeparator
}

function getParameterByName(name, url) {
    if (!url) {
        url = window.location.search
    }
    name = name.replace(/[[\]]/g, '\\$&')
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)')
    var results = regex.exec(url)
    if (!results) {
        return null
    }
    if (!results[2]) {
        return ''
    }
    return decodeURIComponent(results[2].replace(/\+/g, ' '))
}

function removeLastDirsFromUrl(url, count) {
    if (url.charAt(url.length - 1) === '/') {
        url = url.slice(0, -1)
    }
    for (let i = 0; i < count; i++) {
        url = url.substring(0, url.lastIndexOf('/'))
    }
    return url
}

function enableDarkMode() {
    $('body').addClass('dark')
    $('meta[name="theme-color"]').attr('content', '#212121')
}

function disableDarkMode() {
    $('body').removeClass('dark')
    $('meta[name="theme-color"]').attr('content', '#ffffff')
}

function showImageModal(url, title) {
    $('#image-modal > .modal-content > h5').text(title)
    $('#image-modal > .modal-content > img').attr('src', url)
    const elem = document.getElementById('image-modal')
    const instance = M.Modal.getInstance(elem)
    instance.open()
}

function openMapDirections(lat, lng, mapServiceProvider) { // eslint-disable-line no-unused-vars
    let url = ''
    switch (mapServiceProvider) {
        case 'googlemaps':
            url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&zoom=16`
            break
        case 'applemaps':
            url = `https://maps.apple.com/maps?daddr=${lat},${lng}`
            break
        case 'bingmaps':
            url = `https://www.bing.com/maps/?v=2&lvl=16&where1=${lat},${lng}`
            break
        case 'openstreetmap':
            url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
            break
        case 'waze':
            url = `https://www.waze.com/ul?ll=${lat}%2C${lng}&zoom=16`
            break
    }
    window.open(url, '_blank')
}

// Converts timestamp to readable time String.
function timestampToTime(timestamp) {
    var timeStr = 'Unknown'
    if (timestamp) {
        timeStr = serverSettings.twelveHourClock ? moment(timestamp).format('hh:mm:ss A') : moment(timestamp).format('HH:mm:ss')
    }
    return timeStr
}

// Converts timestamp to readable date String.
function timestampToDate(timestamp) {
    var dateStr = 'Unknown'
    if (timestamp) {
        if (moment(timestamp).isSame(moment(), 'day')) {
            dateStr = i18n('Today')
        } else if (moment(timestamp).isSame(moment().subtract(1, 'days'), 'day')) {
            dateStr = i18n('Yesterday')
        } else {
            dateStr = moment(timestamp).format('YYYY-MM-DD')
        }
    }
    return dateStr
}

// Converts timestamp to readable date and time String.
function timestampToDateTime(timestamp) {
    var dateStr = 'Unknown'
    if (timestamp) {
        var time = serverSettings.twelveHourClock ? moment(timestamp).format('hh:mm:ss A') : moment(timestamp).format('HH:mm:ss')
        if (moment(timestamp).isSame(moment(), 'day')) {
            dateStr = i18n('Today') + ' ' + time
        } else if (moment(timestamp).isSame(moment().subtract(1, 'days'), 'day')) {
            dateStr = i18n('Yesterday') + ' ' + time
        } else {
            dateStr = moment(timestamp).format('YYYY-MM-DD') + ' ' + time
        }
    }
    return dateStr
}

function isNowBetween(timestamp1, timestamp2) {
    const now = Date.now()
    return timestamp1 <= now && now <= timestamp2
}

function getTimeUntil(time) {
    var now = Date.now()
    var tdiff = time - now

    var sec = Math.floor((tdiff / 1000) % 60)
    var min = Math.floor((tdiff / 1000 / 60) % 60)
    var hour = Math.floor((tdiff / (1000 * 60 * 60)) % 24)

    return {
        total: tdiff,
        hour: hour,
        min: min,
        sec: sec,
        now: now,
        time: time
    }
}

function lpad(str, len, padstr) {
    return Array(Math.max(len - String(str).length + 1, 0)).join(padstr) + str
}

function updateLabelDiffTime() {
    $('.label-countdown').each(function (index, element) {
        var disappearsAt = getTimeUntil(parseInt(element.getAttribute('disappears-at')))

        var hours = disappearsAt.hour
        var minutes = disappearsAt.min
        var seconds = disappearsAt.sec
        var timestring = ''

        if (disappearsAt.time < disappearsAt.now) {
            timestring = 'expired'
        } else if (hours > 0) {
            timestring = lpad(hours, 2, 0) + 'h' + lpad(minutes, 2, 0) + 'm' + lpad(seconds, 2, 0) + 's'
        } else {
            timestring = lpad(minutes, 2, 0) + 'm' + lpad(seconds, 2, 0) + 's'
        }

        $(element).text(timestring)
    })
}

function toast(title, text, imageUrl, iconClass, classes) {
    var image = ''
    if (imageUrl) {
        image = `<img src='${imageUrl}' width='48'>`
    } else if (iconClass) {
        image = `<i class='material-icons'>${iconClass}</i>`
    }
    const style = imageUrl || iconClass ? 'style="margin-right:15px;"' : ''
    const toastHTML = `<div ${style}>${image}</div><div><strong>${title}</strong><br>${text}</div>`
    M.toast({ html: toastHTML, classes: classes })
}

function toastInfo(title, text) {
    toast(title, text, null, 'info', 'blue')
}

function toastSuccess(title, text) {
    toast(title, text, null, 'done', 'green')
}

function toastWarning(title, text) {
    toast(title, text, null, 'warning', 'orange')
}

function toastError(title, text) {
    toast(title, text, null, 'error', 'red')
}

function toRadian(degree) {
    return degree * Math.PI / 180
}

function getPointDistance(origin, destination) {
    const lon1 = toRadian(origin.lng)
    const lat1 = toRadian(origin.lat)
    const lon2 = toRadian(destination.lng)
    const lat2 = toRadian(destination.lat)
    const deltaLat = lat2 - lat1
    const deltaLon = lon2 - lon1

    const a = Math.pow(Math.sin(deltaLat / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(deltaLon / 2), 2)
    const c = 2 * Math.asin(Math.sqrt(a))
    const EARTH_RADIUS = 6371
    return c * EARTH_RADIUS * 1000 // Distance in meters.
}

function union(setA, setB) {
    const union = new Set(setA)
    for (const elem of setB) {
        union.add(elem)
    }
    return union
}

function intersection(setA, setB) {
    const intersection = new Set()
    if (setA.size >= setB.size) {
        for (const elem of setB) {
            if (setA.has(elem)) {
                intersection.add(elem)
            }
        }
    } else {
        for (const elem of setA) {
            if (setB.has(elem)) {
                intersection.add(elem)
            }
        }
    }
    return intersection
}

function difference(setA, setB) {
    const difference = new Set(setA)
    if (setA.size >= setB.size) {
        for (const elem of setB) {
            difference.delete(elem)
        }
    } else {
        for (const elem of setA) {
            if (setB.has(elem)) {
                difference.delete(elem)
            }
        }
    }
    return difference
}

function symmetricDifference(setA, setB) {
    let difference
    if (setA.size >= setB.size) {
        difference = new Set(setA)
        for (const elem of setB) {
            if (difference.has(elem)) {
                difference.delete(elem)
            } else {
                difference.add(elem)
            }
        }
    } else {
        difference = new Set(setB)
        for (const elem of setA) {
            if (difference.has(elem)) {
                difference.delete(elem)
            } else {
                difference.add(elem)
            }
        }
    }
    return difference
}
