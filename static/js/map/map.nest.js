/* globals addListeners, autoPanPopup, mapData, markers, removeMarker, settings */
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
        shadowUrl: 'static/images/nest_grass.png',
        iconUrl: 'pkm_img?pkm=' + nest.pokemon_id,
        shadowSize: [40, 40],
        iconSize: [40, 40]
    })
    marker.setIcon(icon)
}

function nestLabel(nest) {
    return `
        <div>
          <div class='nest-container'>
            <div class='nest-container-left'>
              <div class='nest-pokemon-image'>
                <img src='pkm_img?pkm=${nest.pokemon_id}' width='64'>
              </div>
            </div>
            <div class='nest-container-right'>
              <div class='title'>
                <strong>${getPokemonName(nest.pokemon_id)} ${i18n('Nest')}</strong>
              </div>
              <div class='info-container'>
                <div>
                  ${i18n('Park name')}: <strong>${i18n(nest.name)}</strong>
                </div>
                <div>
                  ${i18n('Spawns per hour')}: <strong>${nest.pokemon_avg}</strong>
                </div>
                <div>
				  ${i18n('Last updated')}: <strong>${timestampToDateTime(nest.last_updated)}</strong>
                </div>
              </div>
            <div>
          </div>
        </div>`
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

function updateNest(id, nest = null) {
    if (id == null || !(id in mapData.nests)) {
        return true
    }

    const isNestNull = nest === null
    if (isNestNull) {
        nest = mapData.nests[id]
    }

    if (!settings.showNests) {
        removeNest(nest)
        return true
    }

    if (!isNestNull) {
        if (nest.last_updated !== mapData.nests[id].last_updated) {
            nest.marker = updateNestMarker(nest, mapData.nests[id].marker)
        } else {
            nest.marker = mapData.nests[id].marker
        }
        mapData.nests[id] = nest

        if (nest.marker.isPopupOpen()) {
            updateNestLabel(nest, mapData.nests[id].marker)
        } else {
            // Make sure label is updated next time it's opened.
            mapData.nests[id].updated = true
        }
    } else {
        updateNestMarker(nest, mapData.nests[id].marker)

        if (nest.marker.isPopupOpen()) {
            updateNestLabel(nest, mapData.nests[id].marker)
        } else {
            // Make sure label is updated next time it's opened.
            mapData.nests[id].updated = true
        }
    }

    return true
}

function updateNests() {
    $.each(mapData.nests, function (id, nest) {
        updateNest(id)
    })
}

function removeNest(nest) {
    const id = nest.nest_id
    if (id in mapData.nests) {
        removeMarker(mapData.nests[id].marker)
        delete mapData.nests[id]
    }
}
