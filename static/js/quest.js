let table
let rawDataIsLoading = false

function enableDarkMode() {
    $('body').addClass('dark')
    $('meta[name="theme-color"]').attr('content', '#212121')
}

function disableDarkMode() {
    $('body').removeClass('dark')
    $('meta[name="theme-color"]').attr('content', '#ffffff')
}

function initSidebar() {
    $('#dark-mode-switch').on('change', function () {
        if (this.checked) {
            enableDarkMode()
        } else {
            disableDarkMode()
        }
        Store.set('darkMode', this.checked)
    })

    $('#dark-mode-switch').prop('checked', Store.get('darkMode'))
    $('select').formSelect()
}

function loadRawData() {
    return $.ajax({
        url: 'raw_data',
        type: 'GET',
        data: {
            'userAuthCode': localStorage.getItem('userAuthCode'),
            'pokemon': false,
            'gyms': false,
            'raids': false,
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
            toastError(i8ln('Error getting data!'), i8ln('Please check your connection.'))
        },
        success: function (data) {
            if (data.auth_redirect) {
                window.location = data.auth_redirect
            }
        }
    })
}

function processPokestops(pokestops) {
    $('#quests-table > tbody').empty()
    const mapLabel = mapServiceProviderNames[Store.get('mapServiceProvider')]

    $.each(pokestops, function (pokestopId, pokestop) {
        if (!pokestop.quest) {
            return true
        }

        const imageUrl = pokestop.image ? pokestop.image.replace(/^http:\/\//i, '//') : ''
        const pokestopName = pokestop.name ? pokestop.name : 'Unkown'

        const quest = pokestop.quest
        let rewardImageUrl = ''
        let rewardText = ''
        let rewardSortText = ''
        switch (quest.reward_type) {
            case 2:
                rewardImageUrl = 'static/images/quest/reward_' + quest.item_id + '_1.png'
                rewardText = quest.item_amount + ' ' + getItemName(quest.item_id)
                rewardSortText = getItemName(quest.item_id) + ' ' + quest.item_amount
                break
            case 3:
                rewardImageUrl = 'static/images/quest/reward_stardust.png'
                rewardText = quest.stardust + ' ' + i8ln('Stardust')
                rewardSortText = i8ln('Stardust') + ' ' + quest.stardust
                break
            case 7:
                rewardImageUrl = getPokemonRawIconUrl(quest)
                rewardText = `${getPokemonName(quest.pokemon_id)} <a href='https://pokemongo.gamepress.gg/pokemon/${quest.pokemon_id}' target='_blank' title='View on GamePress'>#${quest.pokemon_id}</a>`
                rewardSortText = getPokemonName(quest.pokemon_id)
                break
        }

        $('#quests-table > tbody').append(`
            <tr>
              <td data-sort="${pokestop.name}">
                <div class="row-container">
                  <div class="row-container-left">
                    <img class="pokestop-image" src="${imageUrl}" width="40" height="40" onclick='showImageModal("${imageUrl}", "${pokestopName.replace(/"/g, '\\&quot;').replace(/'/g, '\\&#39;')}")'>
                  </div>
                  <div class="row-container-right">
                    <div>
                      ${pokestop.name}
                    </div>
                    <div>
                      <a href='javascript:void(0);' onclick='javascript:openMapDirections(${pokestop.latitude},${pokestop.longitude},"${Store.get('mapServiceProvider')}");' title='Open in ${mapLabel} Maps'><i class="fas fa-map-marked-alt"></i> ${pokestop.latitude.toFixed(5)}, ${pokestop.longitude.toFixed(5)}</a>
                    </div>
                  </div>
                </div>
              </td>
              <td>
                ${i8ln(quest.task)}
              </td>
              <td data-sort="${rewardSortText}">
                <div class="row-container">
                  <div class="row-container-left">
                    <img class="reward-image" src="${rewardImageUrl}" width="40" height="40">
                  </div>
                  <div class="row-container-right">
                    ${rewardText}
                  </div>
                </div>
              </td>
            </tr>`)
    })
}

function loadQuests() {
    $('#quest-count-title').hide()
    $('#table-container').hide()
    $('.preloader-wrapper').show()

    loadRawData().done(function (result) {
        $.each(result.pokestops, function(id, pokestop) {
            if (!pokestop.quest) {
                return true
            }
            table.row.add(pokestop)
        })
        table.draw()
        
        $('.preloader-wrapper').hide()
        $('#quest-count-title').show()
        $('#table-container').show()
        // Table was hidden when data was added, so recalculate column widths.
        table.columns.adjust()
    }).fail(function () {
        // Wait for next retry.
        setTimeout(loadQuests, 1000)
    })
}

$(function () {
    if (Store.get('darkMode')) {
        enableDarkMode()
    }

    $('.modal').modal()

    showMotd(serverSettings.motd, serverSettings.motdTitle, serverSettings.motdText, serverSettings.motdPages, serverSettings.showMotdAlways)

    $('.dropdown-trigger').dropdown({
        constrainWidth: false,
        coverTrigger: false
    })
    $('.sidenav').sidenav()

    initSidebar()

    table = $('#quest-table').DataTable({
        order: [[0, 'asc']],
        pageLength: 100,
        responsive: true,
        'columnDefs': [
            {
                'targets': 0,
                responsivePriority: 1,
                'data': null,
                'render': function (data, type, row) {
                    const pokestopName = data.name ? data.name : 'Unknown'
                    if (type === 'display') {
                        const imageUrl = data.image ? data.image.replace(/^http:\/\//i, '//') : ''

                        return `
                            <div class='row-container'>
                              <div>
                                <img class='pokestop-image' src='${imageUrl}' width=48 height=48 onclick='showImageModal("${imageUrl}", "${pokestopName.replace(/"/g, '\\&quot;').replace(/'/g, '\\&#39;')}")'>
                              </div>
                              <div>
                                <div>
                                  ${pokestopName}
                                </div>
                                <div>
                                  <a href='javascript:void(0);' onclick='javascript:openMapDirections(${data.latitude},${data.longitude},"${Store.get('mapServiceProvider')}");' title='Open in ${mapServiceProviderNames[Store.get('mapServiceProvider')]}'><i class="fas fa-map-marked-alt"></i> ${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}</a>
                                </div>
                              </div>
                            </div>
                        `
                    }
                    return pokestopName
                }
            },
            {
                'targets': 1,
                responsivePriority: 3,
                'data': null,
                'render': function (data, type, row) {
                    return data.quest.task
                }
            },
            {
                'targets': 2,
                responsivePriority: 2,
                type: 'natural',
                'data': null,
                'render': function (data, type, row) {
                    const quest = data.quest
                    if (type === 'display') {
                        let rewardImageUrl = ''
                        let rewardText = ''
                        switch (quest.reward_type) {
                            case 2:
                                rewardImageUrl = getItemImageUrl(quest.item_id)
                                rewardText = quest.item_amount + ' ' + getItemName(quest.item_id)
                                break
                            case 3:
                                rewardImageUrl = getItemImageUrl(6)
                                rewardText = quest.stardust + ' ' + getItemName(6)
                                break
                            case 7:
                                rewardImageUrl = getPokemonRawIconUrl({pokemon_id: quest.pokemon_id, form: quest.form_id, costume: quest.costume_id})
                                rewardText = `${getPokemonNameWithForm(quest.pokemon_id, quest.form_id)} <a href='https://pokemongo.gamepress.gg/pokemon/${quest.pokemon_id}' target='_blank' title='View on GamePress'>#${quest.pokemon_id}</a>`
                                break
                        }

                        return `
                            <div class="row-container">
                              <div>
                                <img class="reward-image" src="${rewardImageUrl}" width=48 height=48>
                              </div>
                              <div>
                                ${rewardText}
                              </div>
                            </div>
                        `
                    } else if (type === 'sort') {
                        switch (quest.reward_type) {
                            case 2:
                                return getItemName(quest.item_id) + ' ' + quest.item_amount
                            case 3:
                                return getItemName(6) + ' ' + quest.stardust
                            case 7:
                                return getPokemonNameWithForm(quest.pokemon_id, quest.form_id)
                        }
                    }

                    switch (quest.reward_type) {
                        case 2:
                            return quest.item_amount + ' ' + getItemName(quest.item_id)
                        case 3:
                            return quest.stardust + ' ' + getItemName(6)
                        case 7:
                            return getPokemonNameWithForm(quest.pokemon_id, quest.form_id)
                    }
                }
            }
        ]
    })

    initI8lnDictionary(function () {
        initPokemonData(function () {
            initItemData(function () {
                loadQuests()
            })
        })
    })
})
