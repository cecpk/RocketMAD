/* global getPokemonRawIconUrl, L */
/* Main stats page */
var rawDataIsLoading = false
var mapstat
var markers

function loadRawData() {
    var userAuthCode = localStorage.getItem('userAuthCode')
    return $.ajax({
        url: 'raw_data',
        type: 'GET',
        data: {
            'userAuthCode': userAuthCode,
            'pokemon': false,
            'pokestops': false,
            'gyms': false,
            'scanned': false,
            'seen': true,
            'duration': $('#duration').val()
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
            // Display error toast
            toastr['error']('Request failed while getting data. Retrying...', 'Error getting data')
            toastr.options = {
                'closeButton': true,
                'debug': false,
                'newestOnTop': true,
                'progressBar': false,
                'positionClass': 'toast-top-right',
                'preventDuplicates': true,
                'onclick': null,
                'showDuration': '300',
                'hideDuration': '1000',
                'timeOut': '25000',
                'extendedTimeOut': '1000',
                'showEasing': 'swing',
                'hideEasing': 'linear',
                'showMethod': 'fadeIn',
                'hideMethod': 'fadeOut'
            }
        }
    })
}

function processSeen(seen) {
    $('#stats_table > tbody').empty()

    for (var i = 0; i < seen.pokemon.length; i++) {
        var pokemonItem = seen.pokemon[i]
        var seenPercent = (pokemonItem.count / seen.total) * 100

        var pokemonIcon = generateImages ? `<img src='${getPokemonRawIconUrl(pokemonItem)}' style='height: 32px;'>` : `<i class="pokemon-sprite n${pokemonItem.pokemon_id}"</i>`
        $('#stats_table > tbody').append(`
            <tr>
              <td>
                ${pokemonIcon}
              </td>
              <td data-sort="${pokemonItem.pokemon_id}">
                <a href="http://pokemon.gameinfo.io/en/pokemon/${pokemonItem.pokemon_id}" target="_blank" title="View on GamePress">
                  #${pokemonItem.pokemon_id}
                </a>
              </td>
              <td>
                ${pokemonItem.pokemon_name}
              </td>
              <td data-sort="${pokemonItem.count}">
                ${pokemonItem.count.toLocaleString()}
              </td>
              <td data-sort="${seenPercent}">
                ${seenPercent.toLocaleString(undefined, {minimumFractionDigits: 4, maximumFractionDigits: 4})}%
              </td>
              <td data-sort="${pokemonItem.disappear_time}">
                ${timestampToDateTime(pokemonItem.disappear_time)}
              </td>
              <td>
                ${pokemonItem.latitude.toFixed(7)}, ${pokemonItem.longitude.toFixed(7)}
              </td>
              <td>
                <a href="javascript:void(0);" onclick="javascript:showOverlay(${pokemonItem.pokemon_id});">
                  All Locations
                </a>
              </td>
            </tr>`)
    }
}

function updateStats() {
    $('#status-container').hide()
    $('#loading').show()

    loadRawData().done(function (result) {
        $('#stats_table')
                .DataTable()
                .destroy()

        $('#status-container').show()
        $('#loading').hide()

        processSeen(result.seen)

        var header = `${result.seen.total.toLocaleString()} Pokémon seen in ${$('#duration option:selected').text().toLowerCase()}`
        $('#pokemon-seen').html(header)
        $('#stats_table').DataTable({
            paging: false,
            searching: false,
            info: false,
            order: [[3, 'desc']],
            scrollResize: true,
            scrollY: 100,
            'scrollX': true,
            'columnDefs': [
                {'orderable': false, 'targets': [0, 7]}
            ]
        })
    }).fail(function () {
        // Wait for next retry.
        setTimeout(updateStats, 1000)
    })
}

$('#duration')
    .select2({
        minimumResultsForSearch: Infinity
    })
    .on('change', updateStats)

updateStats()

/* Overlay */
var detailsLoading = false
var appearancesTimesLoading = false
var pokemonid = 0
var mapLoaded = false
var detailsPersist = false
var map = null
var heatmap = null
var heatmapPoints = []
var msPerMinute = 60000
var spawnTimeMinutes = 15
var spawnTimeMs = msPerMinute * spawnTimeMinutes
mapData.appearances = {}

function loadDetails() {
    var userAuthCode = localStorage.getItem('userAuthCode')
    return $.ajax({
        url: 'raw_data',
        type: 'GET',
        data: {
            'userAuthCode': userAuthCode,
            'pokemon': false,
            'pokestops': false,
            'gyms': false,
            'scanned': false,
            'appearances': true,
            'pokemonid': pokemonid,
            'duration': $('#duration').val()
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
            // Display error toast
            toastr['error']('Request failed while getting data. Retrying...', 'Error getting data')
            toastr.options = {
                'closeButton': true,
                'debug': false,
                'newestOnTop': true,
                'progressBar': false,
                'positionClass': 'toast-top-right',
                'preventDuplicates': true,
                'onclick': null,
                'showDuration': '300',
                'hideDuration': '1000',
                'timeOut': '25000',
                'extendedTimeOut': '1000',
                'showEasing': 'swing',
                'hideEasing': 'linear',
                'showMethod': 'fadeIn',
                'hideMethod': 'fadeOut'
            }
        }
    })
}

function loadAppearancesTimes(pokemonId, spawnpointId) {
    var userAuthCode = localStorage.getItem('userAuthCode')
    return $.ajax({
        url: 'raw_data',
        type: 'GET',
        data: {
            'userAuthCode': userAuthCode,
            'pokemon': false,
            'pokestops': false,
            'gyms': false,
            'scanned': false,
            'appearances': false,
            'appearancesDetails': true,
            'pokemonid': pokemonId,
            'spawnpoint_id': spawnpointId,
            'duration': $('#duration').val()
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
        }
    })
}

function showTimes(marker) {
    appearanceTab(mapData.appearances[marker.spawnpointId]).then(function (value) {
        $('#times_list').html(value)
        $('#times_list').show()
    })
}

function closeTimes() {
    $('#times_list').hide()
    detailsPersist = false
}

function addListeners(marker) { // eslint-disable-line no-unused-vars
    marker.on('click', function () {
        showTimes(marker)
        detailsPersist = true
    })

    marker.on('mouseover', function () {
        showTimes(marker)
    })

    marker.on('mouseout', function () {
        if (!detailsPersist) {
            $('#times_list').hide()
        }
    })

    return marker
}
// Override map.js initMap
function initStat() {
    mapstat = L.map('location_map', {
        center: [centerLat, centerLng],
        zoom: 16,
        maxZoom: 18,
        zoomControl: false,
    })

    L.control.zoom({
        position: 'bottomright'
    }).addTo(mapstat)

    mapstat.addControl(new L.Control.Fullscreen({
        position: 'bottomright'
    }))

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(mapstat)

    markers = L.layerGroup().addTo(mapstat)
    mapLoaded = true
}

function resetMap() {
    $.each(mapData.appearances, function (key, value) {
        markers.clearLayers()
        delete mapData.appearances[key]
    })

    heatmapPoints = []
    if (heatmap) {
        // heatmapstat.setMap(null)
    }
}

function showOverlay(id) {
    // Only load google maps once, and only if requested
    if (!mapLoaded) {
        initStat()
    }
    resetMap()
    pokemonid = id
    $('#location_details').show()
    location.hash = 'overlay_' + pokemonid
    updateDetails()

    setTimeout(function () { mapstat.invalidateSize() }, 400)

    return false
}

function closeOverlay() { // eslint-disable-line no-unused-vars
    $('#location_details').hide()
    closeTimes()
    location.hash = ''
    return false
}

function processAppearance(i, item) {
    var spawnpointId = item['spawnpoint_id']
    if (!((spawnpointId) in mapData.appearances)) {
        if (item['marker']) {
            item['marker'].setMap(null)
        }
        item['marker'] = setupPokemonMarker(item, markers)
        addListeners(item['marker'])
        item['marker'].spawnpointId = spawnpointId
        mapData.appearances[spawnpointId] = item
    }
    heatmapPoints.push([item['latitude'], item['longitude'], parseFloat(item['count'])])
}

function appearanceTab(item) {
    var times = ''
    return loadAppearancesTimes(item['pokemon_id'], item['spawnpoint_id']).then(function (result) {
        $.each(result.appearancesTimes, function (key, value) {
            var saw = new Date(value - spawnTimeMs)
            saw = timestampToDateTime(saw)

            times = '<div class="row' + (key % 2) + '">' + saw + '</div>' + times
        })
        return `
            <div>
              <a href="javascript:closeTimes();"><i class="fas fa-times"></i></a>
            </div>
            <div class="row1">
              <strong>Lat:</strong> ${item['latitude'].toFixed(7)}
            </div>
            <div class="row0">
              <strong>Long:</strong> ${item['longitude'].toFixed(7)}
            </div>
            <div class="row1">
              <strong>Appearances:</strong> ${item['count'].toLocaleString()}
            </div>
            <div class="row0"><strong>Times:</strong></div>
            <div>
              ${times}
            </div>`
    })
}

function updateDetails() {
    loadDetails().done(function (result) {
        $.each(result.appearances, processAppearance)
        if (heatmap) {
            // heatmap.setMap(null)
        }
        setTimeout(function () { addHeadmap(heatmapPoints) }, 1000)
    }).fail(function () {
        // Wait for next retry.
        setTimeout(updateDetails, 1000)
    })
}

function addHeadmap(headmapdata) {
    heatmap = new L.HeatLayer(headmapdata, {radius: 50}).addTo(markers)
    return false
}

if (location.href.match(/overlay_[0-9]+/g)) {
    showOverlay(location.href.replace(/^.*overlay_([0-9]+).*$/, '$1'))
}
