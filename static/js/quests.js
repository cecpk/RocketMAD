var rawDataIsLoading = false
var pokemonNames = {}
const questItemNames = {
    1: 'Poké Ball',
    2: 'Great Ball',
    3: 'Ultra Ball',
    101: 'Potion',
    102: 'Super Potion',
    103: 'Hyper Potion',
    104: 'Max Potion',
    201: 'Revive',
    202: 'Max Revive',
    301: 'Lucky Egg',
    401: 'Incense',
    501: 'Lure Module',
    701: 'Razz Berry',
    703: 'Nanab Berry',
    705: 'Pinap Berry',
    706: 'Golden Razz Berry',
    708: 'Silver Pinap Berry',
    902: 'Egg Incubator',
    903: 'Super Incubator',
    1101: 'Sun Stone',
    1102: 'Kings Rock',
    1103: 'Metal Coat',
    1104: 'Dragon Scale',
    1105: 'Up-Grade',
    1106: 'Sinnoh Stone',
    1201: 'Fast TM',
    1202: 'Charged TM',
    1301: 'Rare Candy',
    1402: 'Premium Raid Pass',
    1404: 'Star Piece',
    1405: 'Gift'
}

function loadRawData() {
    const userAuthCode = localStorage.getItem('userAuthCode')
    return $.ajax({
        url: 'raw_data',
        type: 'GET',
        data: {
            'userAuthCode': userAuthCode,
            'pokemon': false,
            'pokestops': true,
            'quests': true,
            'invasions': false,
            'lures': false,
            'gyms': false,
            'pokestopsNoEvent': false,
            'scanned': false
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

function processPokestops(pokestops) {
    $('#quests-table > tbody').empty()
    const mapLabel = Store.get('mapServiceProvider') === 'googlemaps' ? 'Google' : 'Apple'

    $.each(pokestops, function (pokestopId, pokestop) {
        if (!pokestop.quest) {
            return true
        }

        const quest = pokestop.quest
        var rewardImageUrl = ''
        var rewardText = ''
        switch (quest.reward_type) {
            case 2:
                rewardImageUrl = 'static/images/quest/reward_' + quest.item_id + '_1.png'
                rewardText = quest.item_amount + ' ' + i8ln(questItemNames[quest.item_id])
                break
            case 3:
                rewardImageUrl = 'static/images/quest/reward_stardust.png'
                rewardText = quest.stardust + ' Stardust'
                break
            case 7:
                rewardImageUrl = getPokemonRawIconUrl(quest)
                rewardText = `${pokemonNames[quest.pokemon_id]} <a href='https://pokemongo.gamepress.gg/pokemon/${quest.pokemon_id}' target='_blank' title='View on GamePress'>#${quest.pokemon_id}</a>`
                break
        }

        $('#quests-table > tbody').append(`
            <tr>
              <td>
                <img class="pokestop-image" src="${pokestop.image.replace(/^http:\/\//i, '//')}" width="40" height="40">
              </td>
              <td>
                <div>
                  ${pokestop.name}
                </div>
                <div>
                  <a href='javascript:void(0);' onclick='javascript:openMapDirections(${pokestop.latitude},${pokestop.longitude});' title='Open in ${mapLabel} Maps'><i class="fas fa-map-marked-alt"></i> ${pokestop.latitude.toFixed(5)}, ${pokestop.longitude.toFixed(5)}</a>
                </div>
              </td>
              <td>
                <img class="reward-image" src="${rewardImageUrl}" width="40" height="40">
              </td>
              <td>
                ${rewardText}
              </td>
              <td>
                ${pokestop.quest.task}
              </td>
            </tr>`)
    })
}

function loadQuests() {
    $('#quests-container').hide()
    $('#loading').show()

    loadRawData().done(function (result) {
        $('#loading').hide()
        $('#quests-container').show()

        processPokestops(result.pokestops)

        $('#quests-table').DataTable({
            order: [[1, 'asc']],
            pageLength: 100,
            responsive: true,
            scrollResize: true,
            scrollY: 100,
            'columnDefs': [
                {'orderable': false, 'targets': [0, 2]},
                {responsivePriority: 1, targets: 0},
                {responsivePriority: 2, targets: 3},
                {responsivePriority: 3, targets: 4},
                {responsivePriority: 4, targets: 1},
                {responsivePriority: 5, targets: 2}
            ]
        })

        $('#quests-table_length').html('Quests')
    }).fail(function () {
        // Wait for next retry.
        setTimeout(loadQuests, 1000)
    })
}

$.getJSON('static/dist/data/pokemon.min.json').done(function (data) {
    for (var id = 1; id <= 809; id++) {
        pokemonNames[id] = i8ln(data[id].name)
    }

    loadQuests()
})
