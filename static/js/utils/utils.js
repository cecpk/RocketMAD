var touchDevice = null
var mobileDevice = null

function isTouchDevice() {
    if (touchDevice === null) {
        // Should cover most browsers.
        touchDevice = 'ontouchstart' in window || navigator.maxTouchPoints
    }

    return touchDevice
}

function isMobileDevice() {
    if (mobileDevice === null) {
        mobileDevice = /Mobi|Android/i.test(navigator.userAgent)
    }

    return mobileDevice
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

function openMapDirections(lat, lng, mapServiceProvider) { // eslint-disable-line no-unused-vars
    var url = ''
    if (mapServiceProvider === 'googlemaps') {
        url = 'http://maps.google.com/maps?q=' + lat + ',' + lng
        window.open(url, '_blank')
    } else if (mapServiceProvider === 'applemaps') {
        url = 'https://maps.apple.com/maps?daddr=' + lat + ',' + lng
        window.open(url, '_self')
    }
}

// Converts timestamp to readable time String.
function timestampToTime(timestamp) {
    var timeStr = 'Unknown'
    if (timestamp) {
        timeStr = Store.get('twelveHourTime') ? moment(timestamp).format('hh:mm:ss A') : moment(timestamp).format('HH:mm:ss')
    }
    return timeStr
}

// Converts timestamp to readable date String.
function timestampToDate(timestamp) {
    var dateStr = 'Unknown'
    if (timestamp) {
        if (moment(timestamp).isSame(moment(), 'day')) {
            dateStr = 'Today'
        } else if (moment(timestamp).isSame(moment().subtract(1, 'days'), 'day')) {
            dateStr = 'Yesterday'
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
        var time = Store.get('twelveHourTime') ? moment(timestamp).format('hh:mm:ss A') : moment(timestamp).format('HH:mm:ss')
        if (moment(timestamp).isSame(moment(), 'day')) {
            dateStr = 'Today ' + time
        } else if (moment(timestamp).isSame(moment().subtract(1, 'days'), 'day')) {
            dateStr = 'Yesterday ' + time
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

function toast(title, text, imageUrl, iconClass, classes) {
    var image = ''
    if (imageUrl) {
        image = `<img src='${imageUrl}' width='48'>`
    } else if (iconClass) {
        image = ` <i class='material-icons'>${iconClass}</i>`
    }
    const style = imageUrl || iconClass ? 'style="margin-right:15px;"' : ''
    const toastHTML = `<div ${style}>${image}</div><div><strong>${title}</strong><br>${text}</div>`
    M.toast({html: toastHTML, classes: classes})
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
