/*global getPokemonRawIconUrl*/
/* Main stats page */
var rawDataIsLoading = false
var mapstat
var markers

function loadRawData() {
    return $.ajax({
        url: 'raw_data',
        type: 'GET',
        data: {
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

        var pokemonIcon = generateImages ? `<img class='pokemon_icon' src='${getPokemonRawIconUrl(pokemonItem)}'>` : `<i class="pokemon-sprite n${pokemonItem.pokemon_id}"</i>`
        $('#stats_table > tbody')
            .append(`<tr class="status_row">
                        <td class="status_cell">
                            ${pokemonIcon}
                        </td>
                        <td class="status_cell">
                            ${pokemonItem.pokemon_id}                        
                        </td>
                        <td class="status_cell">
                            <a href="http://pokemon.gameinfo.io/en/pokemon/${pokemonItem.pokemon_id}" target="_blank" title="View in Pokedex">
                                ${pokemonItem.pokemon_name}
                            </a>
                        </td>
                        <td class="status_cell" data-sort="${pokemonItem.count}">
                            ${pokemonItem.count.toLocaleString()}
                        </td>
                        <td class="status_cell" data-sort="${seenPercent}">
                            ${seenPercent.toLocaleString(undefined, {minimumFractionDigits: 4, maximumFractionDigits: 4})}
                        </td>
                        <td class="status_cell">
                            ${moment(pokemonItem.disappear_time).format('H:mm:ss D MMM YYYY')}
                        </td>
                        <td class="status_cell">
                            ${pokemonItem.latitude.toFixed(7)}, ${pokemonItem.longitude.toFixed(7)}
                        </td>
                        <td class="status_cell">
                            <a href="javascript:void(0);" onclick="javascript:showOverlay(${pokemonItem.pokemon_id});">
                                All Locations
                            </a>
                        </td>
                     </tr>`)
    }
}

function updateStats() {
    $('#status_container').hide()
    $('#loading').show()

    loadRawData().done(function (result) {
        $('#stats_table')
                .DataTable()
                .destroy()

        $('#status_container').show()
        $('#loading').hide()

        processSeen(result.seen)

        var header = 'Pokemon Seen in ' + $('#duration option:selected').text()
        $('#name').html(header)
        $('#message').html('Total: ' + result.seen.total.toLocaleString())
        $('#stats_table')
            .DataTable({
                paging: false,
                searching: false,
                info: false,
                order: [[3, 'desc']],
                'scrollY': '75vh',
                'stripeClasses': ['status_row'],
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
    return $.ajax({
        url: 'raw_data',
        type: 'GET',
        data: {
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
    return $.ajax({
        url: 'raw_data',
        type: 'GET',
        data: {
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
     zoomControl: true,
     maxZoom: 18
 })
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
 }).addTo(mapstat);

markers = L.layerGroup().addTo(mapstat)
mapLoaded = true
    mapstat.on('zoom', function () {
        redrawAppearances(mapData.appearances)
    })
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
    updateDetails()

    setTimeout(function(){ mapstat.invalidateSize()}, 400);

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
        const isBounceDisabled = true // We don't need this functionality in our heatmap..
        const scaleByRarity = false   // ..nor this..
        const isNotifyPkmn = false    // ..and especially not this.

        if (item['marker']) {
            item['marker'].setMap(null)
        }
        item['marker'] = setupPokemonMarker(item, map, isBounceDisabled, scaleByRarity, isNotifyPkmn)
        markers.addLayer(item['marker'])
        addListeners(item['marker'])
        item['marker'].spawnpointId = spawnpointId
        mapData.appearances[spawnpointId] = item
    }
    heatmapPoints.push([item['latitude'] , item['longitude'] , parseFloat(item['count'])])
}

function redrawAppearances(appearances) {
    $.each(appearances, function (key, value) {
        var item = appearances[key]
        if (!item['hidden']) {
            const isBounceDisabled = true // We don't need this functionality in our heatmap..
            const scaleByRarity = false   // ..nor this..
            const isNotifyPkmn = false    // ..and especially not this.

            // item['marker'].setMap(null)
            const newMarker = setupPokemonMarker(item, map, isBounceDisabled, scaleByRarity, isNotifyPkmn)
            markers.addLayer(newMarker)
            addListeners(newMarker)
            newMarker.spawnpointId = item['spawnpoint_id']
            appearances[key].marker = newMarker
        }
    })
}

function appearanceTab(item) {
    var times = ''
    return loadAppearancesTimes(item['pokemon_id'], item['spawnpoint_id']).then(function (result) {
        $.each(result.appearancesTimes, function (key, value) {
            var saw = new Date(value - spawnTimeMs)
            saw = moment(saw).format('H:mm:ss D MMM YYYY')

            times = '<div class="row' + (key % 2) + '">' + saw + '</div>' + times
        })
        return `<div>
                                <a href="javascript:closeTimes();">Close this tab</a>
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
        setTimeout(function(){ addHeadmap(heatmapPoints)}, 1000);

    }).fail(function () {
        // Wait for next retry.
        setTimeout(updateDetails, 1000)
    })
}

function addHeadmap(headmapdata) {

    heatmap = new L.heatLayer(headmapdata, {radius: 50}).addTo(markers)
    return false
}
