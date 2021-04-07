/*
globals ActiveFortModifierEnum, gymTypes, isGymMeetsGymFilters,
isGymMeetsRaidFilters, isPokestopMeetsInvasionFilters,
isPokestopMeetsLureFilters, isPokestopMeetsQuestFilters, map, mapData,
raidEggImages, settings
*/
/* exported initStatsSidebar, updateStatsTable */

let statsSideNav
let tabsInstance

function initStatsSidebar() {
    if (!serverSettings.statsSidebar) {
        return
    }

    let tablesInitialized = false
    const statsSideNavElem = document.getElementById('stats-sidenav')
    statsSideNav = M.Sidenav.init(statsSideNavElem, {
        edge: 'right',
        draggable: false,
        onOpenStart: function () {
            if (!tablesInitialized) {
                initStatsTables()
                tablesInitialized = true
            }

            updateStatsTable()
        }
    })
    $('.sidenav-trigger[data-target="stats-sidenav"]').on('click', function (e) {
        if (statsSideNav.isOpen) {
            statsSideNav.close()
            e.stopPropagation()
        }
    })

    function initStatsTables() {
        $('#stats-tabs').tabs({
            onShow: updateStatsTable
        })

        if (serverSettings.pokemons) {
            $('#pokemon-table').DataTable({
                paging: false,
                searching: false,
                info: false,
                scrollX: true,
                language: {
                    url: getDataTablesLocUrl()
                },
                columnDefs: [
                    {
                        targets: 0,
                        orderable: false
                    },
                    {
                        targets: 1,
                        render: function (data, type, row) {
                            if (type === 'display') {
                                return `<a href="http://pokemon.gameinfo.io/en/pokemon/${row[1]}" target="_blank" title='${i18n('View on GamePress')}'>#${row[1]}</a>`
                            }
                            return row[1]
                        }
                    },
                    {
                        targets: 3,
                        render: function (data, type, row) {
                            if (type === 'display') {
                                return row[3].toLocaleString()
                            }
                            return row[3]
                        }
                    },
                    {
                        targets: 4,
                        render: function (data, type, row) {
                            if (type === 'display') {
                                return row[4].toLocaleString(undefined, { maximumFractionDigits: 1 }) + '%'
                            }
                            return row[4]
                        }
                    }
                ],
                order: [[3, 'desc']]
            })
        }

        if (serverSettings.gyms) {
            $('#gym-table').DataTable({
                paging: false,
                searching: false,
                info: false,
                scrollX: true,
                language: {
                    url: getDataTablesLocUrl()
                },
                columnDefs: [
                    {
                        targets: 0,
                        orderable: false
                    },
                    {
                        targets: 2,
                        render: function (data, type, row) {
                            if (type === 'display') {
                                return row[2].toLocaleString()
                            }
                            return row[2]
                        }
                    },
                    {
                        targets: 3,
                        render: function (data, type, row) {
                            if (type === 'display') {
                                return row[3].toLocaleString(undefined, { maximumFractionDigits: 1 }) + '%'
                            }
                            return row[3]
                        }
                    }
                ],
                order: [[2, 'desc']]
            })
        }

        if (serverSettings.raids) {
            $('#egg-table').DataTable({
                paging: false,
                searching: false,
                info: false,
                scrollX: true,
                language: {
                    url: getDataTablesLocUrl()
                },
                columnDefs: [
                    { orderable: false, targets: 0 },
                    {
                        targets: 2,
                        render: function (data, type, row) {
                            if (type === 'display') {
                                return row[2].toLocaleString()
                            }
                            return row[2]
                        }
                    },
                    {
                        targets: 3,
                        render: function (data, type, row) {
                            if (type === 'display') {
                                return row[3].toLocaleString(undefined, { maximumFractionDigits: 1 }) + '%'
                            }
                            return row[3]
                        }
                    }
                ],
                order: [[2, 'desc']]
            })

            $('#raid-pokemon-table').DataTable({
                paging: false,
                searching: false,
                info: false,
                scrollX: true,
                language: {
                    url: getDataTablesLocUrl()
                },
                columnDefs: [
                    { orderable: false, targets: 0 },
                    {
                        targets: 2,
                        render: function (data, type, row) {
                            if (type === 'display') {
                                return `<a href="http://pokemon.gameinfo.io/en/pokemon/${row[2]}" target="_blank" title='${i18n('View on GamePress')}'>#${row[2]}</a>`
                            }
                            return row[2]
                        }
                    },
                    {
                        targets: 4,
                        render: function (data, type, row) {
                            if (type === 'display') {
                                return row[4].toLocaleString()
                            }
                            return row[4]
                        }
                    },
                    {
                        targets: 5,
                        render: function (data, type, row) {
                            if (type === 'display') {
                                return row[5].toLocaleString(undefined, { maximumFractionDigits: 1 }) + '%'
                            }
                            return row[5]
                        }
                    }
                ],
                order: [[4, 'desc']]
            })
        }

        if (serverSettings.pokestops) {
            $('#pokestop-table').DataTable({
                paging: false,
                searching: false,
                info: false,
                scrollX: true,
                language: {
                    url: getDataTablesLocUrl()
                },
                columnDefs: [
                    { orderable: false, targets: 0 },
                    {
                        targets: 2,
                        render: function (data, type, row) {
                            if (type === 'display') {
                                return row[2].toLocaleString()
                            }
                            return row[2]
                        }
                    },
                    {
                        targets: 3,
                        render: function (data, type, row) {
                            if (type === 'display') {
                                return row[3].toLocaleString(undefined, { maximumFractionDigits: 1 }) + '%'
                            }
                            return row[3]
                        }
                    }
                ],
                order: [[2, 'desc']]
            })
        }
    }
}

function updateStatsTable() {
    if (!serverSettings.statsSidebar || !statsSideNav.isOpen) {
        return
    }

    if (!tabsInstance) {
        const tabsElem = document.getElementById('stats-tabs')
        tabsInstance = M.Tabs.getInstance(tabsElem)
    }

    const selectedTab = $(`#stats-tabs li:nth-child(${tabsInstance.index + 1}) > a`).attr('href')
    const mapBounds = map.getBounds()

    if (selectedTab === '#pokemon-stats-tab') { // Pokémon tab.
        const pokemonData = {}
        let pokemonCount = 0

        $.each(mapData.pokemons, function (encounterId, pokemon) {
            const location = { lat: pokemon.latitude, lng: pokemon.longitude }
            if (mapBounds.contains(location)) {
                const key = pokemon.pokemon_id + '_' + pokemon.form + '_' + pokemon.costume
                pokemonCount++
                if (!(key in pokemonData)) {
                    pokemonData[key] = {
                        count: 1,
                        id: pokemon.pokemon_id,
                        name: getPokemonNameWithForm(pokemon.pokemon_id, pokemon.form),
                        form: pokemon.form,
                        costume: pokemon.costume
                    }
                } else {
                    pokemonData[key].count++
                }
            }
        })

        const pokemonRows = []
        $.each(pokemonData, function (key, data) {
            const pokemonIcon = getPokemonRawIconUrl({ pokemon_id: data.id, form: data.form, costume: data.costume }, serverSettings.generateImages)
            pokemonRows.push(
                [
                    '<img src="' + pokemonIcon + '" width=32 />',
                    data.id,
                    data.name,
                    data.count,
                    (data.count * 100) / pokemonCount
                ]
            )
        })

        $('a[href$="#pokemon-stats-tab"]').html(`<i class="material-icons">pets</i> (${pokemonCount})`)

        // Clear stale data, add fresh data, redraw
        $('#pokemon-table').DataTable()
            .clear()
            .rows.add(pokemonRows)
            .draw()
    } else if (serverSettings.pokemons) {
        let pokemonCount = 0
        $.each(mapData.pokemons, function (encounterId, pokemon) {
            const location = { lat: pokemon.latitude, lng: pokemon.longitude }
            if (mapBounds.contains(location)) {
                pokemonCount++
            }
        })
        $('a[href$="#pokemon-stats-tab"]').html(`<i class="material-icons">pets</i> (${pokemonCount})`)
    }

    if (selectedTab === '#gym-stats-tab') {
        const teamCounts = [0, 0, 0, 0]
        const eggCounts = [0, 0, 0, 0, 0, 0]
        const raidPokemonData = {}
        let gymCount = 0
        let eggCount = 0
        let raidPokemonCount = 0
        let totalCount = 0

        $.each(mapData.gyms, function (id, gym) {
            const location = { lat: gym.latitude, lng: gym.longitude }
            if (mapBounds.contains(location)) {
                totalCount++
                if (isGymMeetsGymFilters(gym)) {
                    gymCount++
                    teamCounts[gym.team_id]++
                }
                if (isGymMeetsRaidFilters(gym)) {
                    const raid = gym.raid
                    if (isUpcomingRaid(raid)) {
                        eggCount++
                        eggCounts[raid.level - 1]++
                    } else if (raid.pokemon_id) {
                        const key = raid.pokemon_id + '_' + raid.form + '_' + raid.costume + '_' + raid.evolution
                        raidPokemonCount++
                        if (!(key in raidPokemonData)) {
                            raidPokemonData[key] = {
                                count: 1,
                                level: raid.level,
                                id: raid.pokemon_id,
                                name: getPokemonNameWithForm(raid.pokemon_id, raid.form, raid.evolution),
                                form: raid.form,
                                costume: raid.costume,
                                evolution: raid.evolution
                            }
                        } else {
                            raidPokemonData[key].count++
                        }
                    }
                }
            }
        })

        const gymRows = []
        for (let i = 0; i < 4; i++) {
            if (teamCounts[i] > 0) {
                gymRows.push(
                    [
                        `<img src="static/images/gym/${gymTypes[i]}.png" width=32 />`,
                        i18n(gymTypes[i]),
                        teamCounts[i],
                        (teamCounts[i] * 100) / gymCount
                    ]
                )
            }
        }

        const eggRows = []
        for (let i = 0; i < eggCounts.length; i++) {
            if (eggCounts[i] > 0) {
                eggRows.push(
                    [
                        `<img src="static/images/gym/${raidEggImages[i + 1]}" width=32 />`,
                        i + 1,
                        eggCounts[i],
                        (eggCounts[i] * 100) / eggCount
                    ]
                )
            }
        }

        const raidPokemonRows = []
        $.each(raidPokemonData, function (key, data) {
            const pokemonIcon = getPokemonRawIconUrl({ pokemon_id: data.id, form: data.form, costume: data.costume, evolution: data.evolution }, serverSettings.generateImages)
            raidPokemonRows.push(
                [
                    '<img src="' + pokemonIcon + '" width=32 />',
                    data.level,
                    data.id,
                    data.name,
                    data.count,
                    (data.count * 100) / raidPokemonCount
                ]
            )
        })

        $('a[href$="#gym-stats-tab"]').html(`<i class="material-icons">security</i> (${totalCount})`)

        // Clear stale data, add fresh data, redraw
        if (serverSettings.gyms) {
            const count = settings.showGyms ? gymCount : 0
            $('#gym-table-title').text(`${i18n('Gyms')} (${count})`)

            $('#gym-table').DataTable()
                .clear()
                .rows.add(gymRows)
                .draw()
        }

        if (serverSettings.raids) {
            $('#egg-table-title').text(`${i18n('Eggs')} (${eggCount})`)
            $('#raid-pokemon-table-title').text(`${i18n('Raid Bosses')} (${raidPokemonCount})`)

            $('#egg-table').DataTable()
                .clear()
                .rows.add(eggRows)
                .draw()

            $('#raid-pokemon-table').DataTable()
                .clear()
                .rows.add(raidPokemonRows)
                .draw()
        }
    } else if (serverSettings.gyms || serverSettings.raids) {
        let gymCount = 0
        $.each(mapData.gyms, function (id, gym) {
            const location = { lat: gym.latitude, lng: gym.longitude }
            if (mapBounds.contains(location)) {
                gymCount++
            }
        })
        $('a[href$="#gym-stats-tab"]').html(`<i class="material-icons">security</i> (${gymCount})`)
    }

    if (selectedTab === '#pokestop-stats-tab') {
        let noStatusCount = 0
        let questCount = 0
        let invasionCount = 0
        let normalLureCount = 0
        let glacialLureCount = 0
        let magneticLureCount = 0
        let mossyLureCount = 0
        let rainyLureCount = 0
        let pokestopCount = 0

        $.each(mapData.pokestops, function (id, pokestop) {
            const location = { lat: pokestop.latitude, lng: pokestop.longitude }
            if (mapBounds.contains(location)) {
                pokestopCount++
                let hasStatus = false
                if (isPokestopMeetsQuestFilters(pokestop)) {
                    questCount++
                    hasStatus = true
                }
                if (isPokestopMeetsInvasionFilters(pokestop)) {
                    invasionCount++
                    hasStatus = true
                }
                if (isPokestopMeetsLureFilters(pokestop)) {
                    switch (pokestop.active_fort_modifier) {
                        case ActiveFortModifierEnum.normal:
                            normalLureCount++
                            break
                        case ActiveFortModifierEnum.glacial:
                            glacialLureCount++
                            break
                        case ActiveFortModifierEnum.magnetic:
                            magneticLureCount++
                            break
                        case ActiveFortModifierEnum.mossy:
                            mossyLureCount++
                            break
                        case ActiveFortModifierEnum.rainy:
                            rainyLureCount++
                            break
                    }
                    hasStatus = true
                }
                if (settings.showPokestopsNoEvent && !hasStatus) {
                    noStatusCount++
                }
            }
        })

        const pokestopRows = []
        if (noStatusCount > 0) {
            pokestopRows.push(
                [
                    '<img src="static/images/pokestop/stop.png" width=32 />',
                    '',
                    noStatusCount,
                    (noStatusCount * 100) / pokestopCount
                ]
            )
        }
        if (questCount > 0) {
            pokestopRows.push(
                [
                    '<img src="static/images/pokestop/stop_q.png" width=32 />',
                    i18n('Quest'),
                    questCount,
                    (questCount * 100) / pokestopCount
                ]
            )
        }
        if (invasionCount > 0) {
            pokestopRows.push(
                [
                    '<img src="static/images/pokestop/stop_i.png" width=32 />',
                    i18n('Rocket Invasion'),
                    invasionCount,
                    (invasionCount * 100) / pokestopCount
                ]
            )
        }
        if (normalLureCount > 0) {
            pokestopRows.push(
                [
                    '<img src="static/images/pokestop/stop_l_501.png" width=32 />',
                    i18n('Normal Lure'),
                    normalLureCount,
                    (normalLureCount * 100) / pokestopCount
                ]
            )
        }
        if (glacialLureCount > 0) {
            pokestopRows.push(
                [
                    '<img src="static/images/pokestop/stop_l_502.png" width=32 />',
                    i18n('Glacial Lure'),
                    glacialLureCount,
                    (glacialLureCount * 100) / pokestopCount
                ]
            )
        }
        if (magneticLureCount > 0) {
            pokestopRows.push(
                [
                    '<img src="static/images/pokestop/stop_l_504.png" width=32 />',
                    i18n('Magnetic Lure'),
                    magneticLureCount,
                    (magneticLureCount * 100) / pokestopCount
                ]
            )
        }
        if (mossyLureCount > 0) {
            pokestopRows.push(
                [
                    '<img src="static/images/pokestop/stop_l_503.png" width=32 />',
                    i18n('Mossy Lure'),
                    mossyLureCount,
                    (mossyLureCount * 100) / pokestopCount
                ]
            )
        }
        if (rainyLureCount > 0) {
            pokestopRows.push(
                [
                    '<img src="static/images/pokestop/stop_l_505.png" width=32 />',
                    i18n('Rainy Lure'),
                    rainyLureCount,
                    (rainyLureCount * 100) / pokestopCount
                ]
            )
        }

        $('a[href$="#pokestop-stats-tab"]').html(`<i class="material-icons">nature</i> (${pokestopCount})`)

        $('#pokestop-table').DataTable()
            .clear()
            .rows.add(pokestopRows)
            .draw()
    } else if (serverSettings.pokestops) {
        let pokestopCount = 0
        $.each(mapData.pokestops, function (id, pokestop) {
            const location = { lat: pokestop.latitude, lng: pokestop.longitude }
            if (mapBounds.contains(location)) {
                pokestopCount++
            }
        })
        $('a[href$="#pokestop-stats-tab"]').html(`<i class="material-icons">nature</i> (${pokestopCount})`)
    }

    tabsInstance.updateTabIndicator()
}
