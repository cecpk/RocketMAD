/* exported setTileLayer */

var customTileserverURL
var customTileserverName
var tileLayers = {}
var i
var splitInput

console.log(serverSettings.custom_tileserver)

if (serverSettings.custom_tileserver) {

	for( i = 0;i < serverSettings.custom_tileserver.length; i++) {
		splitInput = serverSettings.custom_tileserver[i].split(';')
		customTileserverURL = splitInput[1]
		customTileserverName = splitInput[0]

		if (i === 0) {
			tileLayers[customTileserverName] = L.tileLayer(customTileserverURL , { maxZoom: 19 })
		} else {
			tileLayers[customTileserverName] = L.tileLayer(customTileserverURL , { maxZoom: 19 })
		}
	}

}
if (serverSettings.custom_tileserver.length === 0 ) {

	tileLayers = {
    		mapnik: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>' }),
    		topomap: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>' }),
    		cartodbdarkmatter: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' }),
    		cartodbdarkmatternolabels: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', { maxZoom: 19, attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' }),
    		cartodbpositron: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' }),
    		cartodbpositronnolabels: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/light_nolabels/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' }),
    		satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 20, attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community' })
	}
}

function setTileLayer(layerName, map) {
    // Fallback in case layername does not exist (anymore).
    if (!(layerName in tileLayers)) {
        layerName = Object.keys(tileLayers)[0]
    }

    if (map.hasLayer(tileLayers[map.tileLayerName])) {
        map.removeLayer(tileLayers[map.tileLayerName])
    }
    map.addLayer(tileLayers[layerName])
    map.tileLayerName = layerName
}
