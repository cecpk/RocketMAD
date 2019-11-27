function getAllParks() {
    if (showConfig.ex_parks) {
        $.getJSON('static/data/parks/' + exParksFileName + '.json').done(function (response) {
            if (!response || !('parks' in response)) {
                return
            }

            mapData.exParks = response.parks.map(parkPoints => parkPoints.map(point => L.latLng(point[0], point[1])))

            if (settings.showExParks) {
                updateParks()
            }
        }).fail(function () {
            console.error("Couldn't load ex parks JSON file.")
        })
    }

    if (showConfig.nest_parks) {
        $.getJSON('static/data/parks/' + nestParksFileName + '.json').done(function (response) {
            if (!response || !('parks' in response)) {
                return
            }

            mapData.nestParks = response.parks.map(parkPoints => parkPoints.map(point => L.latLng(point[0], point[1])))

            if (settings.showNestParks) {
                updateParks()
            }
        }).fail(function () {
            console.error("Couldn't load nest parks JSON file.")
        })
    }
}

function updateParks() {
    if (settings.showExParks) {
        const inBoundParks = mapData.exParks.filter(parkPoints => {
            return parkPoints.some(point => {
                return map.getBounds().contains(point)
            })
        })

        exParksLayerGroup.clearLayers()

        inBoundParks.forEach(function (park) {
            L.polygon(park, {color: 'black', interactive: false}).addTo(exParksLayerGroup)
        })
    }

    if (settings.showNestParks) {
        const inBoundParks = mapData.nestParks.filter(parkPoints => {
            return parkPoints.some(point => {
                return map.getBounds().contains(point)
            })
        })

        nestParksLayerGroup.clearLayers()

        inBoundParks.forEach(function (park) {
            L.polygon(park, {color: 'limegreen', interactive: false}).addTo(nestParksLayerGroup)
        })
    }
}
