/* global getPokemonRawIconUrl */
let tabsInstance

function updateStatsTable() {
    if (!serverSettings.statsSidebar) {
        return
    }

    if (!statsSideNav.isOpen) {
        return
    }

    if (!tabsInstance) {
        let tabsElem = document.getElementById('stats-tabs')
        tabsInstance = M.Tabs.getInstance(tabsElem)
    }

    const selectedTab = $(`#stats-tabs li:nth-child(${tabsInstance.index + 1}) > a`).attr('href')
    const mapBounds = map.getBounds()

    if (selectedTab === '#pokemon-stats-tab') { // Pokémon tab.
        let pokemonData = {}
        let pokemonCount = 0

        $.each(mapData.pokemons, function (encounterId, pokemon) {
            const location = { lat: pokemon.latitude, lng: pokemon.longitude }
            if (mapBounds.contains(location)) {
                const key = pokemon.pokemon_id + '_' + pokemon.form + '_' + pokemon.costume
                pokemonCount++
                if (!pokemonData.hasOwnProperty(key)) {
                    pokemonData[key] = {
                        'count': 1,
                        'id': pokemon.pokemon_id,
                        'name': getPokemonName(pokemon.pokemon_id),
                        'form': pokemon.form,
                        'costume': pokemon.costume
                    }
                } else {
                    pokemonData[key].count++
                }
            }
        })

        let pokemonRows = []
        $.each(pokemonData, function (key, data) {
            const pokemonIcon = getPokemonRawIconUrl({'pokemon_id': data.id, 'form': data.form, 'costume': data.costume})
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
        let teamCounts = [0, 0, 0, 0]
        let eggCounts = [0, 0, 0, 0, 0]
        let raidPokemonData = {}
        let gymCount = 0
        let eggCount = 0
        let raidPokemonCount = 0
        let totalCount = 0

        $.each(mapData.gyms, function (id, gym) {
            const location = { lat: gym.latitude, lng: gym.longitude }
            if (mapBounds.contains(location)) {
                totalCount++;
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
                        const key = raid.pokemon_id + '_' + raid.form + '_' + raid.costume
                        raidPokemonCount++
                        if (!raidPokemonData.hasOwnProperty(key)) {
                            raidPokemonData[key] = {
                                'count': 1,
                                'level': raid.level,
                                'id': raid.pokemon_id,
                                'name': getPokemonName(raid.pokemon_id),
                                'form': raid.form,
                                'costume': raid.costume
                            }
                        } else {
                            raidPokemonData[key].count++
                        }
                    }
                }
            }
        })

        let gymRows = []
        for (let i = 0; i < 4; i++) {
            if (teamCounts[i] > 0) {
                gymRows.push(
                    [
                        `<img src="static/images/gym/${gymTypes[i]}.png" width=32 />`,
                        i8ln(gymTypes[i]),
                        teamCounts[i],
                        (teamCounts[i] * 100) / gymCount
                    ]
                )
            }
        }

        let eggRows = []
        for (let i = 0; i < 5; i++) {
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

        let raidPokemonRows = []
        $.each(raidPokemonData, function (key, data) {
            const pokemonIcon = getPokemonRawIconUrl({'pokemon_id': data.id, 'form': data.form, 'costume': data.costume})
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
            $('#gym-table-title').text(`${i8ln('Gyms')} (${count})`)

            $('#gym-table').DataTable()
                .clear()
                .rows.add(gymRows)
                .draw()
        }

        if (serverSettings.raids) {
            $('#egg-table-title').text(`${i8ln('Eggs')} (${eggCount})`)
            $('#raid-pokemon-table-title').text(`${i8ln('Raid Bosses')} (${raidPokemonCount})`)

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
                    }
                    hasStatus = true
                }
                if (settings.showPokestopsNoEvent && !hasStatus) {
                    noStatusCount++
                }
            }
        })

        let pokestopRows = []
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
                    i8ln('Quest'),
                    questCount,
                    (questCount * 100) / pokestopCount
                ]
            )
        }
        if (invasionCount > 0) {
            pokestopRows.push(
                [
                    '<img src="static/images/pokestop/stop_i.png" width=32 />',
                    i8ln('Rocket Invasion'),
                    invasionCount,
                    (invasionCount * 100) / pokestopCount
                ]
            )
        }
        if (normalLureCount > 0) {
            pokestopRows.push(
                [
                    '<img src="static/images/pokestop/stop_l_501.png" width=32 />',
                    i8ln('Normal Lure'),
                    normalLureCount,
                    (normalLureCount * 100) / pokestopCount
                ]
            )
        }
        if (glacialLureCount > 0) {
            pokestopRows.push(
                [
                    '<img src="static/images/pokestop/stop_l_502.png" width=32 />',
                    i8ln('Glacial Lure'),
                    glacialLureCount,
                    (glacialLureCount * 100) / pokestopCount
                ]
            )
        }
        if (magneticLureCount > 0) {
            pokestopRows.push(
                [
                    '<img src="static/images/pokestop/stop_l_504.png" width=32 />',
                    i8ln('Magnetic Lure'),
                    magneticLureCount,
                    (magneticLureCount * 100) / pokestopCount
                ]
            )
        }
        if (mossyLureCount > 0) {
            pokestopRows.push(
                [
                    '<img src="static/images/pokestop/stop_l_503.png" width=32 />',
                    i8ln('Mossy Lure'),
                    mossyLureCount,
                    (mossyLureCount * 100) / pokestopCount
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
