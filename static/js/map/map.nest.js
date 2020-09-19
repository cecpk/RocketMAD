/* globals addListeners, autoPanPopup, mapData, markers, settings */
/* exported nestLabel, processNest, updateNestLabel, updateNests */

function setupNestMarker(nest) {
    const marker = L.marker([nest.latitude, nest.longitude]).bindPopup('', { autoPan: autoPanPopup() })
    updateNestMarker(nest, marker)
    markers.addLayer(marker)
    addListeners(marker, 'nest')
    marker.nest_id = nest.nest_id

    return marker
}

function updateNestMarker(nest, marker) {
    var icon = L.icon({
        shadowUrl: 'https://i.imgur.com/46zb5y8.png',
        iconUrl: 'pkm_img?pkm=' + nest.pokemon_id,
        shadowSize: [40, 40],
        iconSize: [40, 40]
    })
    marker.setIcon(icon)
}

function nestLabel(nest) {
    return 'test123'
}

function updateNestLabel(nest, marker) {
    marker.getPopup().setContent(nestLabel(nest))
}

function processNest(nest) {
    if (!settings.showNests) {
        return false
    }

    const id = nest.nest_id
    if (!(id in mapData.nests)) {
        nest.marker = setupNestMarker(nest)
        nest.updated = true
        mapData.nests[id] = nest
    } else {
        updateNest(id, nest)
    }

    return true
}

function updateNest(id, nest) {

}

function updateNests() {

}


/*

function getNestData(pokemonNestData) {
    nestData = pokemonNestData
    if (settings.showNests) {
        updatePokemonNests()
    }
    return true
}

function updatePokemonNests() {
    var data = nestData
    var i
    var iconSize = 32 * (settings.pokemonIconSizeModifier / 100)
    var smallIcon = iconSize

    pokemonNestsLayerGroup.clearLayers()

    for (i = 0; i < data.length; i++) {
        var myIcon = L.icon({
            shadowUrl: 'https://i.imgur.com/46zb5y8.png',
            iconUrl: 'pkm_img?pkm=' + data[i].pokemon_id,
            shadowSize: [iconSize, iconSize],
            iconSize: [smallIcon, smallIcon] // size of the shadow
        })
        var inarea = map.getBounds().contains([data[i].lat, data[i].lon])

        var lastUpdated = timeConverter(data[i].updated)

        var popup = L.popup({ autoClose: false })
            .setContent(`
                        <div>
                          <div id='pokemon-container'>
                            <div id='pokemon-container-left'>
                              <div id='types'>
                                <strong>` + getPokemonName(data[i].pokemon_id) + `</strong>
                              </div>
                              <div id='pokemon-image'>
                                <img src='pkm_img?pkm=` + data[i].pokemon_id + `' width='64'>
                              </div>
                            </div>
                            <div id='pokemon-container-right'>
                              <div class="parkname"><span style="text-decoration: underline;"><strong>` + data[i].name + `</strong></span></div>
                              <div class='street'>
                                <br><strong>Street :</strong> ` + data[i].street + ` <br>
                                <strong>Suburb :</strong> ` + data[i].suburb + `<br>
                              </div>
                              <div class='average'>
                                <br><strong>Average Per Hour :</strong> ` + data[i].pokemon_avg + `
                              </div>
                              <div class='lastupdated'>
                                <br><strong>Last Updated :</strong> ` + lastUpdated + `
                              </div>
                            <div>
                          </div>
                        </div>`)

        if (inarea === true) { L.marker([data[i].lat, data[i].lon], { icon: myIcon }).bindPopup(popup).openPopup().addTo(pokemonNestsLayerGroup) }
    }
}
*/
