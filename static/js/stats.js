/* global getPokemonRawIconUrl */
function countMarkers(map) { // eslint-disable-line no-unused-vars
    var i = 0
    var pokemonCount = {}
    var pokemonTotal = 0
    var gymCount = []
    var gymTotal = 0
    var pokestopCount = []
    var pokestopTotal = 0
    var $pokemonTable = $('#pokemon-table').DataTable()
    var $gymTable = $('#gym-table').DataTable()
    var $pokestopTable = $('#pokestop-table').DataTable()

    // Bounds of the currently visible map
    var currentVisibleMap = map.getBounds()

    // Is a particular Pokémon/Gym/Pokéstop within the currently visible map?
    var thisPokeIsVisible = false
    var thisGymIsVisible = false
    var thisPokestopIsVisible = false

    if (Store.get('showPokemon')) {
        $.each(mapData.pokemons, function (key, pokemon) {
            var thisPokeLocation = { lat: pokemon.latitude, lng: pokemon.longitude }
            thisPokeIsVisible = currentVisibleMap.contains(thisPokeLocation)
            const id = pokemon.pokemon_id + '_' + pokemon.form

            if (thisPokeIsVisible) {
                pokemonTotal++
                if (!pokemonCount.hasOwnProperty(id)) {
                    pokemonCount[id] = {
                        'Count': 1,
                        'ID': pokemon.pokemon_id,
                        'Name': pokemon.pokemon_name,
                        'Form': pokemon.form
                    }
                } else {
                    pokemonCount[id].Count += 1
                }
            }
        })

        console.log(pokemonCount)

        var pokeCounts = []
        $.each(pokemonCount, function (id, data) {
            var pokemonIcon = getPokemonRawIconUrl({'pokemon_id': data.ID, 'form': data.Form})
            pokeCounts.push(
                [
                    '<img class="pokemonListString pokemon-icon" src=\'' + pokemonIcon + '\' />',
                    `<a href='https://pokemongo.gamepress.gg/pokemon/${data.ID}' target='_blank' title='View on GamePress'>${data.ID}</a>`,
                    data.Name,
                    data.Count,
                    ((data.Count * 100) / pokemonTotal).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 1}) + '%'
                ]
            )
        })

        $('#stats-pokemon-label').text(`Pokémon (${pokemonTotal})`)
        // Clear stale data, add fresh data, redraw
        $pokemonTable
            .clear()
            .rows.add(pokeCounts)
            .draw()
    }

    // begin Gyms processing
    if (Store.get('showGyms')) {
        $.each(mapData.gyms, function (key, value) {
            var thisGymLocation = { lat: mapData.gyms[key]['latitude'], lng: mapData.gyms[key]['longitude'] }
            thisGymIsVisible = currentVisibleMap.contains(thisGymLocation)

            if (thisGymIsVisible) {
                gymTotal++
                if (gymCount[mapData.gyms[key]['team_id']] === 0 || !gymCount[mapData.gyms[key]['team_id']]) {
                    gymCount[mapData.gyms[key]['team_id']] = 1
                } else {
                    gymCount[mapData.gyms[key]['team_id']] += 1
                }
            }
        })

        var gymCounts = []
        for (i = 0; i < gymCount.length; i++) {
            if (gymCount[i] && gymCount[i] > 0) {
                gymCounts.push(
                    [
                        `<img class="arenaListString" src="static/images/gym/${gymTypes[i]}.png" />`,
                        gymTypes[i],
                        gymCount[i],
                        ((gymCount[i] * 100) / gymTotal).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 1}) + '%'
                    ]
                )
            }
        }

        $('#stats-gym-label').text(`Gyms (${gymTotal})`)
        // Clear stale data, add fresh data, redraw
        $gymTable
            .clear()
            .rows.add(gymCounts)
            .draw()
    }

    if (Store.get('showPokestops')) {
        $.each(mapData.pokestops, function (key, value) {
            var thisPokestopLocation = { lat: mapData.pokestops[key]['latitude'], lng: mapData.pokestops[key]['longitude'] }
            thisPokestopIsVisible = currentVisibleMap.contains(thisPokestopLocation)

            if (thisPokestopIsVisible) {
                if (isLuredPokestop(mapData.pokestops[key])) {
                    if (pokestopCount[1] === 0 || !pokestopCount[1]) {
                        pokestopCount[1] = 1
                    } else {
                        pokestopCount[1] += 1
                    }
                } else {
                    if (pokestopCount[0] === 0 || !pokestopCount[0]) {
                        pokestopCount[0] = 1
                    } else {
                        pokestopCount[0] += 1
                    }
                }
                pokestopTotal++
            }
        })

        var pokestopCounts = []
        for (i = 0; i < pokestopCount.length; i++) {
            if (pokestopCount[i] && pokestopCount[i] > 0) {
                const status = i === 0 ? 'Not Lured' : 'Lured'
                const image = i === 0 ? 'stop' : 'stop_l_501'
                pokestopCounts.push(
                    [
                        `<img class="pokestopListString" src="static/images/pokestop/${image}.png" />`,
                        status,
                        pokestopCount[i],
                        ((pokestopCount[i] * 100) / pokestopTotal).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 1}) + '%'
                    ]
                )
            }
        }

        $('#stats-pokestop-label').text(`PokéStops (${pokestopTotal})`)
        // Clear stale data, add fresh data, redraw
        $pokestopTable
            .clear()
            .rows.add(pokestopCounts)
            .draw()
    }
}
