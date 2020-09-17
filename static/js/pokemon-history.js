let table
let rawDataIsLoading = false
let detailsLoading = false
let appearancesTimesLoading = false
let mapLoaded = false
let mapData = {
    appearances: {}
}
let map
let markers
let heatLayer
let detailsPersist = false

function enableDarkMode() {
    $('body').addClass('dark')
    $('meta[name="theme-color"]').attr('content', '#212121')
}

function disableDarkMode() {
    $('body').removeClass('dark')
    $('meta[name="theme-color"]').attr('content', '#ffffff')
}

function initSidebar() {
    $('#duration-select').on('change', function () {
        Store.set('pokemonHistoryDuration', parseInt(this.value))
        updateHistory()
    })

    $('#map-style-select').on('change', function () {
        if (mapLoaded) {
            setTileLayer(this.value, map)
        }
        Store.set('mapStyle', this.value)
    })

    $('#dark-mode-switch').on('change', function () {
        if (this.checked) {
            enableDarkMode()
        } else {
            disableDarkMode()
        }
        Store.set('darkMode', this.checked)
    })

    $('#duration-select').val(Store.get('pokemonHistoryDuration'))
    $('#map-style-select').val(Store.get('mapStyle'))
    $('#dark-mode-switch').prop('checked', Store.get('darkMode'))

    $('select').formSelect()
}

function loadRawData() {
    return $.ajax({
        url: 'raw_data',
        type: 'GET',
        data: {
            'pokemon': false,
            'pokestops': false,
            'gyms': false,
            'raids': false,
            'scanned': false,
            'seen': true,
            'duration': Store.get('pokemonHistoryDuration')
        },
        dataType: 'json',
        beforeSend: function () {
            if (rawDataIsLoading) {
                return false
            } else {
                rawDataIsLoading = true
            }
        },
        complete: function () {
            rawDataIsLoading = false
        },
        error: function () {
            toastError(i8ln('Error getting data!'), i8ln('Please check your connection.'))
        },
        success: function (data) {
            if (data.auth_redirect) {
                window.location = data.auth_redirect
            }
        }
    })
}

function loadDetails(pokemonId, formId) {
    return $.ajax({
        url: 'raw_data',
        type: 'GET',
        data: {
            'pokemon': false,
            'pokestops': false,
            'gyms': false,
            'raids': false,
            'scanned': false,
            'appearances': true,
            'pokemonid': pokemonId,
            'formid': formId,
            'duration': Store.get('pokemonHistoryDuration')
        },
        dataType: 'json',
        beforeSend: function () {
            if (detailsLoading) {
                return false
            } else {
                detailsLoading = true
            }
        },
        complete: function () {
            detailsLoading = false
        },
        error: function () {
            toastError(i8ln('Error getting data!'), i8ln('Please check your connection.'))
        },
        success: function (data) {
            if (data.auth_redirect) {
                window.location = data.auth_redirect
            }
        }
    })
}

function loadAppearancesTimes(pokemonId, formId, spawnpointId) {
    return $.ajax({
        url: 'raw_data',
        type: 'GET',
        data: {
            'pokemon': false,
            'pokestops': false,
            'gyms': false,
            'raids': false,
            'scanned': false,
            'appearances': false,
            'appearancesDetails': true,
            'pokemonid': pokemonId,
            'formid': formId,
            'spawnpoint_id': spawnpointId,
            'duration': Store.get('pokemonHistoryDuration')
        },
        dataType: 'json',
        beforeSend: function () {
            if (appearancesTimesLoading) {
                return false
            } else {
                appearancesTimesLoading = true
            }
        },
        complete: function () {
            appearancesTimesLoading = false
        },
        error: function () {
            toastError(i8ln('Error getting data!'), i8ln('Please check your connection.'))
        },
        success: function (data) {
            if (data.auth_redirect) {
                window.location = data.auth_redirect
            }
        }
    })
}

function updateHistory() {
    $('#pokemon-seen').hide()
    $('#table-container').hide()
    $('.preloader-wrapper').show()

    loadRawData().done(function (result) {
        $('#pokemon-seen').html(result.seen.total.toLocaleString() + ' Pokémon seen in ' + $('#duration-select option:selected').text().toLowerCase())

        table.clear()
        for (let i = 0; i < result.seen.pokemon.length; i++) {
            const item = result.seen.pokemon[i]
            table.row.add([
                serverSettings.generateImages ? `<img src='${getPokemonRawIconUrl(item)}' style='width: 32px;'>` : `<i class="pokemon-sprite n${item.pokemon_id}"</i>`,
                item.pokemon_id,
                getPokemonName(item.pokemon_id),
                item.form ? getFormName(item.pokemon_id, item.form) : '',
                item.count,
                (item.count / result.seen.total) * 100,
                item.disappear_time,
                `<a href="javascript:void(0);" onclick="javascript:showMapOverlay(${item.pokemon_id}, ${item.form});">All locations</a>`
            ])
        }
        table.draw()

        $('.preloader-wrapper').hide()
        $('#pokemon-seen').show()
        $('#table-container').show()
        // Table was hidden when data was added, so recalculate column widths.
        table.columns.adjust()
    }).fail(function () {
        // Wait for next retry.
        setTimeout(updateHistory, 1000)
    })
}

function createOverlayCloseButton() {
    let control = L.control({position: 'topright'})
    control.onAdd = function (map) {
        let container = L.DomUtil.create('div', 'leaflet-control-custom leaflet-bar')

        let closeButton = document.createElement('a')
        closeButton.innerHTML = '<i class="material-icons">close</i>'
        closeButton.title = 'Close map'
        closeButton.href = 'javascript:void(0);'
        container.appendChild(closeButton)
        closeButton.addEventListener('click', hideMapOverlay)

        return container
    }

    control.addTo(map)
}

function initMap() {
    map = L.map('map', {
        center: [serverSettings.centerLat, serverSettings.centerLng],
        zoom: 15,
        zoomControl: false
    })

    setTileLayer(Store.get('mapStyle'), map)

    createOverlayCloseButton()

    L.control.zoom({
        position: 'bottomright'
    }).addTo(map)

    map.addControl(new L.Control.Fullscreen({
        position: 'bottomright'
    }))

    map.on('click', closeTimes)

    markers = L.layerGroup().addTo(map)
    heatLayer = L.heatLayer([], {radius: 50}).addTo(map)

    const overlayMaps = {
      "Markers": markers,
      "Heat map": heatLayer
    }
    L.control.layers(null, overlayMaps).addTo(map)

    mapLoaded = true
}

function resetMap() {
    markers.clearLayers()
    heatLayer.setLatLngs([]) // Reset heat map.
    mapData.appearances = {}
}

function addListeners(marker) {
    marker.on('click', function () {
        showTimes(marker)
        detailsPersist = true
    })

    marker.on('mouseover', function () {
        showTimes(marker)
    })

    marker.on('mouseout', function () {
        if (!detailsPersist) {
            $('#times-list').hide()
        }
    })

    return marker
}

function processAppearance(idx, item) {
    const spawnpointId = item.spawnpoint_id
    if (!mapData.appearances.hasOwnProperty(spawnpointId)) {
        item.marker = setupPokemonMarker(item, markers)
        addListeners(item.marker)
        item.marker.spawnpointId = spawnpointId
        mapData.appearances[spawnpointId] = item
        heatLayer.addLatLng(L.latLng(item.latitude, item.longitude))
    }
}

function updateDetails(pokemonId, formId) {
    loadDetails(pokemonId, formId).done(function (result) {
        $.each(result.appearances, processAppearance)
    }).fail(function () {
        // Wait for next retry.
        setTimeout(updateDetails, 1000, pokemonId, formId)
    })
}

function appearanceTab(item) {
    return loadAppearancesTimes(item.pokemon_id, item.form, item.spawnpoint_id).then(function (result) {
        let times = ''
        $.each(result.appearancesTimes, function (idx, value) {
            times = `<div>${timestampToDateTime(value)}</div>` + times
        })
        return `
            <div>
              <a href="javascript:closeTimes();" title="Close appearances"><i class="material-icons">close</i></a>
            </div>
            <div>
              <strong>Lat:</strong> ${item.latitude.toFixed(7)}
            </div>
            <div>
              <strong>Lng:</strong> ${item.longitude.toFixed(7)}
            </div>
            <div style="margin-bottom:1em;">
              <strong>Times seen:</strong> ${item.count.toLocaleString()}
            </div>
            <div>
              <strong>Appearances:</strong>
            </div>
            ${times}`
    })
}

function showMapOverlay(pokemonId, formId) {
    // Only initialize map once, and only if requested.
    $('body').css('overflow', 'hidden')
    $('#map-overlay').show()
    if (!mapLoaded) {
        initMap()
    } else {
        map.invalidateSize()
    }
    updateDetails(pokemonId, formId)
    location.hash = 'overlay_' + pokemonId + '_' + formId
}

function hideMapOverlay() {
    $('body').css('overflow', '')
    $('#map-overlay').hide()
    closeTimes()
    resetMap()
    location.hash = ''
}

function showTimes(marker) {
    appearanceTab(mapData.appearances[marker.spawnpointId]).then(function (value) {
        $('#times-list').html(value)
        $('#times-list').show()
    })
}

function closeTimes() {
    $('#times-list').hide()
    detailsPersist = false
}

$(function () {
    if (Store.get('darkMode')) {
        enableDarkMode()
    }

    $('.modal').modal()

    if (serverSettings.motd) {
        showMotd(serverSettings.motdTitle, serverSettings.motdText, serverSettings.motdPages, serverSettings.showMotdAlways)
    }

    if (location.href.match(/overlay_[0-9]+_[0-9]+/g)) {
        const pokemonId = location.href.replace(/^.*overlay_([0-9]+)_([0-9]+).*$/, '$1')
        const formId = location.href.replace(/^.*overlay_([0-9]+)_([0-9]+).*$/, '$2')
        showMapOverlay(pokemonId, formId)
    }

    let formNameType = $.fn.dataTable.absoluteOrder([
        { value: '', position: 'bottom' }
    ])

    table = $('#pokemon-history-table').DataTable({
        paging: false,
        searching: false,
        info: false,
        order: [[4, 'desc']],
        responsive: true,
        'columnDefs': [
            { 'orderable': false, 'targets': [0, 7]},
            { type: formNameType, 'targets': 3},
            { responsivePriority: 1, 'targets': 0 },
            { responsivePriority: 2, 'targets': 4 },
            { responsivePriority: 3, 'targets': 2 },
            { responsivePriority: 4, 'targets': 1 },
            { responsivePriority: 5, 'targets': 3 },
            { responsivePriority: 6, 'targets': 6 },
            { responsivePriority: 7, 'targets': 5 },
            { responsivePriority: 8, 'targets': 7 },
            {
                'targets': 1,
                'render': function (data, type, row) {
                    if (type === 'display') {
                        return `<a href="http://pokemon.gameinfo.io/en/pokemon/${row[1]}" target="_blank" title="View on GamePress">#${row[1]}</a>`
                    }
                    return row[1]
                }
            },
            {
                'targets': 4,
                'render': function (data, type, row) {
                    if (type === 'display') {
                        return row[4].toLocaleString()
                    }
                    return row[4]
                }
            },
            {
                'targets': 5,
                'render': function (data, type, row) {
                    if (type === 'display') {
                        return row[5].toLocaleString(undefined, {maximumFractionDigits: 4}) + '%'
                    }
                    return row[5]
                }
            },
            {
                'targets': 6,
                'render': function (data, type, row) {
                    if (type === 'display') {
                        return timestampToDateTime(row[6])
                    }
                    return row[6]
                }
            }
        ]
    })

    initI8lnDictionary().then(function () {
        return initPokemonData()
    }).then(function () {
        updateHistory()
    })

    $('.dropdown-trigger').dropdown({
        constrainWidth: false,
        coverTrigger: false
    })
    $('.sidenav').sidenav({
        draggable: false
    })

    initSidebar()
})
