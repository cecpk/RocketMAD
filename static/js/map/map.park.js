function getAllParks() {
    if (serverSettings.nestParks) {
        $.getJSON('static/data/parks/' + serverSettings.nestParksFileName + '.json?v=' + version).done(function (response) {
            if (!response || !('parks' in response)) {
                return
            }

            mapData.nestParks = response.parks.map(parkPoints => parkPoints.map(point => L.latLng(point[0], point[1])))

            if (settings.showNestParks) {
                updateNestParks()
            }
        }).fail(function () {
            console.error("Couldn't load nest parks JSON file.")
        })
    }

    if (serverSettings.exParks) {
        $.getJSON('static/data/parks/' + serverSettings.exParksFileName + '.json?v=' + version).done(function (response) {
            if (!response || !('parks' in response)) {
                return
            }

            mapData.exParks = response.parks.map(parkPoints => parkPoints.map(point => L.latLng(point[0], point[1])))

            if (settings.showExParks) {
                updateExParks()
            }
        }).fail(function () {
            console.error("Couldn't load ex parks JSON file.")
        })
    }
}

function updateNestParks() {
    if (settings.showNestParks) {
        const bounds = map.getBounds()
        const inBoundParks = mapData.nestParks.filter(parkPoints => {
            return parkPoints.some(point => {
                return bounds.contains(point)
            })
        })

        nestParksLayerGroup.clearLayers()

        inBoundParks.forEach(function (park) {
            L.polygon(park, {color: 'limegreen', interactive: false}).addTo(nestParksLayerGroup)
        })
    }
}

function updateExParks() {
    if (settings.showExParks) {
        const bounds = map.getBounds()
        const inBoundParks = mapData.exParks.filter(parkPoints => {
            return parkPoints.some(point => {
                return bounds.contains(point)
            })
        })

        exParksLayerGroup.clearLayers()

        inBoundParks.forEach(function (park) {
            L.polygon(park, {color: 'black', interactive: false}).addTo(exParksLayerGroup)
        })
    }
}

function updateAllParks() {
    updateNestParks()
    updateExParks()
}
