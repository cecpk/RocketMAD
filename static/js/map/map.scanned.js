function getColorByDate(value) {
    // Changes the color from red to green over 15 mins
    var diff = (Date.now() - value) / 1000 / 60 / 15

    if (diff > 1) {
        diff = 1
    }

    // value from 0 to 1 - Green to Red
    var hue = ((1 - diff) * 120).toString(10)
    return ['hsl(', hue, ',100%,50%)'].join('')
}

function setupScannedMarker(item) {
    var rangeCircleOpts = {
        clickable: false,
        center: [item['latitude'], item['longitude']],
        radius: (showConfig.pokemons === true ? 70 : 450), // metres
        color: getColorByDate(item['last_modified']),
        opacity: 0.6,
        fillOpacity: 0.2,
        interactive: false
    }

    var circle = L.circle([item['latitude'], item['longitude']], rangeCircleOpts)
    markersNoCluster.addLayer(circle)
    return circle
}

function processScanned(i, item) {
    if (!Store.get('showScanned')) {
        return false
    }

    var scanId = item['latitude'] + '|' + item['longitude']

    if (!(scanId in mapData.scanned)) { // add marker to map and item to dict
        if (item.marker) {
            markersNoCluster.removeLayer(item.marker)
        }
        item.marker = setupScannedMarker(item)
        mapData.scanned[scanId] = item
    } else {
        mapData.scanned[scanId].last_modified = item['last_modified']
    }
}

function updateScanned() {
    if (!Store.get('showScanned')) {
        return false
    }

    $.each(mapData.scanned, function (key, value) {
        if (map.getBounds().contains(value.marker.getLatLng())) {
            var color = getColorByDate(value['last_modified'])
            value.marker.setStyle({color: color, fillColor: color})
        }
    })
}
