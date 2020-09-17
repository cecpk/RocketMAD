var invasionData = {}

function initInvasionData() {
    if (!$.isEmptyObject(invasionData)) {
        return Promise.resolve()
    }

    return $.getJSON('static/dist/data/invasions.min.json').done(function (data) {
        invasionData = data
    }).fail(function () {
        console.log('Error loading invasion data.')
    })
}

function getInvasionType(id) {
    return i8ln(invasionData[id].type)
}

function getInvasionGrunt(id) {
    return i8ln(invasionData[id].grunt)
}

function getInvasionImageUrl(id) {
    return 'static/images/invasion/' + id + '.png'
}

function getPokestopIconUrl(pokestop) {
    var imageName = 'stop'
    if (pokestop.quest != null) {
        imageName += '_q'
    }
    if (isInvadedPokestop(pokestop)) {
        imageName += '_i_' + pokestop.incident_grunt_type
    }
    if (isLuredPokestop(pokestop)) {
        imageName += '_l_' + pokestop.active_fort_modifier
    }

    return 'static/images/pokestop/' + imageName + '.png'
}

function isInvadedPokestop(pokestop) {
    return pokestop.incident_expiration !== null && pokestop.incident_expiration > Date.now()
}

function isLuredPokestop(pokestop) {
    return pokestop.lure_expiration !== null && pokestop.lure_expiration > Date.now()
}
