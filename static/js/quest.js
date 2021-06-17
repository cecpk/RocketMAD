let table
let rawDataIsLoading = false

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
}

function loadRawData() {
    return $.ajax({
        url: 'raw-data',
        type: 'GET',
        data: {
            pokestops: true,
            quests: true
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
            toastError(i18n('Error getting data!'), i18n('Please check your connection.'))
        }
    })
}

function loadQuests() {
    $('#quest-title').hide()
    $('#table-container').hide()
    $('.preloader-wrapper').show()

    loadRawData().done(function (result) {
        $.each(result.pokestops, function (id, pokestop) {
            if (!pokestop.quest) {
                return true
            }
            table.row.add(pokestop)
        })
        table.draw()

        $('.preloader-wrapper').hide()
        $('#quest-title').show()
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

    if (serverSettings.motd) {
        showMotd(serverSettings.motdTitle, serverSettings.motdText, serverSettings.motdPages, serverSettings.showMotdAlways)
    }

    table = $('#quest-table').DataTable({
        responsive: true,
        deferRender: true,
        language: {
            url: getDataTablesLocUrl()
        },
        columnDefs: [
            {
                targets: 0,
                responsivePriority: 1,
                data: null,
                render: function (data, type, row) {
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
                                  <a href='javascript:void(0);' onclick='javascript:openMapDirections(${data.latitude},${data.longitude},"${Store.get('mapServiceProvider')}");' title='${i18n('Open in')} ${mapServiceProviderNames[Store.get('mapServiceProvider')]}'><i class="fas fa-map-marked-alt"></i> ${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}</a>
                                </div>
                              </div>
                            </div>
                        `
                    }
                    return pokestopName
                }
            },
            {
                targets: 1,
                responsivePriority: 3,
                data: null,
                render: function (data, type, row) {
                    return data.quest.task
                }
            },
            {
                targets: 2,
                responsivePriority: 2,
                type: 'natural',
                data: null,
                render: function (data, type, row) {
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
                            case 4:
                                rewardImageUrl = getItemImageUrl(8)
                                rewardText = `${quest.item_amount} ${getPokemonName(quest.pokemon_id)} ${getItemName(8)}`
                                break
                            case 7:
                                rewardImageUrl = getPokemonRawIconUrl({ pokemon_id: quest.pokemon_id, form: quest.form_id, costume: quest.costume_id }, serverSettings.generateImages)
                                rewardText = `${getPokemonNameWithForm(quest.pokemon_id, quest.form_id)} <a href='https://pokemongo.gamepress.gg/pokemon/${quest.pokemon_id}' target='_blank' title='${i18n('View on GamePress')}'>#${quest.pokemon_id}</a>`
                                break
                            case 12:
                                rewardImageUrl = getItemImageUrl(7)
                                rewardText = `${quest.item_amount} ${getPokemonName(quest.pokemon_id)} ${getItemName(7)}`
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
                            case 4:
                                return `${getItemName(8)} ${getPokemonName(quest.pokemon_id)} ${quest.item_amount}`
                            case 7:
                                return getPokemonNameWithForm(quest.pokemon_id, quest.form_id)
                            case 12:
                                return `${getItemName(7)} ${getPokemonName(quest.pokemon_id)} ${quest.item_amount}`
                        }
                    }

                    switch (quest.reward_type) {
                        case 2:
                            return quest.item_amount + ' ' + getItemName(quest.item_id)
                        case 3:
                            return quest.stardust + ' ' + getItemName(6)
                        case 4:
                            return `${quest.item_amount} ${getPokemonName(quest.pokemon_id)} ${getItemName(8)}`
                        case 7:
                            return getPokemonNameWithForm(quest.pokemon_id, quest.form_id)
                        case 12:
                            return `${quest.item_amount} ${getPokemonName(quest.pokemon_id)} ${getItemName(7)}`
                    }
                }
            }
        ]
    })

    initI18nDictionary().then(function () {
        return initPokemonData()
    }).then(function () {
        return initItemData()
    }).then(function () {
        loadQuests()
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
