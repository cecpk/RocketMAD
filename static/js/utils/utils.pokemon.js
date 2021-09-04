/*
exported genderClasses, getIvsPercentage, getIvsPercentageCssColor,
getMoveName, getMoveType, getMoveTypeNoI8ln, getPokemonGen, getPokemonIds,
getPokemonLevel, getPokemonNameWithForm, getPokemonRarity,
getPokemonRarityName, getLocationNearStop, getLocationInCell,
getPokemonRawIconUrl, getPokemonTypes, initMoveData, initPokemonData,
searchPokemon, createPokemonMarker, updatePokemonRarities
*/

var pokemonData = {}
var moveData = {}
var pokemonRarities = {}
const rarityNames = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Ultra Rare', 'New Spawn']
// FontAwesome gender classes.
const genderClasses = ['fa-mars', 'fa-venus', 'fa-neuter']
var pokemonSearchList = []
const availablePokemonCount = 721
const pokemonIds = new Set()

function initPokemonData() {
    if (!$.isEmptyObject(pokemonData)) {
        return Promise.resolve()
    }

    return $.getJSON('static/dist/data/pokemon.min.json?v=' + version).done(function (data) {
        pokemonData = data
        $.each(pokemonData, function (id, value) {
            let gen
            if (id <= 151) {
                gen = 1
            } else if (id <= 251) {
                gen = 2
            } else if (id <= 386) {
                gen = 3
            } else if (id <= 493) {
                gen = 4
            } else if (id <= 649) {
                gen = 5
            } else if (id <= 721) {
                gen = 6
            } else if (id <= 809) {
                gen = 7
            } else if (id <= 898) {
                gen = 8
            }
            pokemonData[id].gen = gen
            pokemonSearchList.push({
                id: parseInt(id),
                name: i18n(value.name),
                type1: i18n(value.types[0].type),
                type2: value.types[1] ? i18n(value.types[1].type) : '',
                gen: 'gen' + gen
            })
        })
    }).fail(function () {
        console.log('Error loading pokemon data.')
    })
}

function initMoveData() {
    if (!$.isEmptyObject(moveData)) {
        return Promise.resolve()
    }

    return $.getJSON('static/dist/data/moves.min.json?v=' + version).done(function (data) {
        moveData = data
    }).fail(function () {
        console.log('Error loading move data.')
    })
}

function updatePokemonRarities(rarityFileName) {
    return $.getJSON('static/dist/data/rarity/' + rarityFileName + '.min.json', { _: new Date().getTime() }).done(function (data) {
        pokemonRarities = data
    }).fail(function () {
        console.log("Couldn't load dynamic rarity JSON.")
    })
}

function getPokemonIds() {
    if (pokemonIds.size === 0) {
        for (let i = 1; i <= availablePokemonCount; i++) {
            pokemonIds.add(i)
        }
        // Gen 7 and 8.
        pokemonIds.add(808)
        pokemonIds.add(809)
        pokemonIds.add(819)
        pokemonIds.add(820)
        pokemonIds.add(831)
        pokemonIds.add(832)
        pokemonIds.add(862)
        pokemonIds.add(863)
        pokemonIds.add(865)
        pokemonIds.add(866)
        pokemonIds.add(867)
        pokemonIds.add(870)
        pokemonIds.add(888)
        pokemonIds.add(889)
    }
    return new Set(pokemonIds)
}

function getPokemonName(id, evolutionId = 0) {
    const pokemon = pokemonData[id]
    const name = typeof pokemon === 'undefined' ? '#' + id : i18n(pokemon.name)

    switch (evolutionId) {
        case 1:
            return i18n('Mega') + ' ' + name
        case 2:
            return i18n('Mega') + ' ' + name + ' X'
        case 3:
            return i18n('Mega') + ' ' + name + ' Y'
        default:
            return name
    }
}

function getPokemonTypes(pokemonId, formId) {
    return i18n(getPokemonTypesNoI8ln(pokemonId, formId))
}

function getPokemonTypesNoI8ln(pokemonId, formId) {
    if ('forms' in pokemonData[pokemonId] && formId in pokemonData[pokemonId].forms && 'formTypes' in pokemonData[pokemonId].forms[formId]) {
        return pokemonData[pokemonId].forms[formId].formTypes
    } else {
        return pokemonData[pokemonId].types
    }
}

function getFormName(pokemonId, formId) {
    return 'forms' in pokemonData[pokemonId] && formId in pokemonData[pokemonId].forms ? i18n(pokemonData[pokemonId].forms[formId].formName) : ''
}

function getPokemonNameWithForm(pokemonId, formId, evolutionId = 0) {
    let name = getPokemonName(pokemonId, evolutionId)
    const formName = getFormName(pokemonId, formId)
    if (formName !== '') {
        name += ` (${formName})`
    }
    return name
}

function getPokemonGen(id) {
    return pokemonData[id].gen
}

function getMoveName(id) {
    return i18n(moveData[id].name)
}

function getMoveType(id) {
    return i18n(moveData[id].type)
}

function getMoveTypeNoI8ln(id) {
    return moveData[id].type
}

function getPokemonRarity(pokemonId) {
    if (pokemonId in pokemonRarities) {
        return pokemonRarities[pokemonId]
    }

    return 6 // New Spawn.
}

function getPokemonRarityName(pokemonId) {
    return i18n(rarityNames[getPokemonRarity(pokemonId) - 1])
}

function getLocationNearStop() {
    return '❗ ' + i18n('Location inaccurate') + '.<br>' + i18n('Pokemon close to stop')
}

function getLocationInCell() {
    return '❗ ' + i18n('Location very inaccurate') + '.<br>' + i18n('Pokemon in L15 S2 cell')
}

function getPokemonRawIconUrl(pokemon, generateImages) {
    if (!generateImages) {
        return `static/icons/${pokemon.pokemon_id}.png`
    }

    const genderParam = pokemon.gender ? `&gender=${pokemon.gender}` : ''
    const formParam = pokemon.form ? `&form=${pokemon.form}` : ''
    const costumeParam = pokemon.costume ? `&costume=${pokemon.costume}` : ''
    const evolutionParam = pokemon.evolution ? `&evolution=${pokemon.evolution}` : ''
    const shinyParm = pokemon.shiny ? '&shiny=1' : ''
    const weatherParam = pokemon.weather_boosted_condition ? `&weather=${pokemon.weather_boosted_condition}` : ''

    return `pkm_img?raw=1&pkm=${pokemon.pokemon_id}${genderParam}${formParam}${costumeParam}${evolutionParam}${shinyParm}${weatherParam}`
}

function getPokemonMapIconUrl(pokemon, generateImages) {
    if (!generateImages) {
        return `static/icons/${pokemon.pokemon_id}.png`
    }

    const genderParam = pokemon.gender ? `&gender=${pokemon.gender}` : ''
    const formParam = pokemon.form ? `&form=${pokemon.form}` : ''
    const costumeParam = pokemon.costume ? `&costume=${pokemon.costume}` : ''
    const evolutionParam = pokemon.evolution ? `&evolution=${pokemon.evolution}` : ''
    const weatherParam = pokemon.weather_boosted_condition ? `&weather=${pokemon.weather_boosted_condition}` : ''

    return `pkm_img?pkm=${pokemon.pokemon_id}${genderParam}${formParam}${costumeParam}${evolutionParam}${weatherParam}`
}

function getIvsPercentage(atk, def, sta) {
    // Round to 1 decimal place.
    return Math.round(1000 * (atk + def + sta) / 45) / 10
}

function getIvsPercentageCssColor(ivs) {
    if (ivs < 51) {
        return 'red'
    } else if (ivs < 66) {
        return 'orange'
    } else if (ivs < 82) {
        return 'olive'
    } else if (ivs < 100) {
        return 'green'
    } else {
        return 'lime'
    }
}

function getPokemonLevel(cpMultiplier) {
    if (cpMultiplier < 0.734) {
        var pokemonLevel = 58.35178527 * cpMultiplier * cpMultiplier - 2.838007664 * cpMultiplier + 0.8539209906
    } else {
        pokemonLevel = 171.0112688 * cpMultiplier - 95.20425243
    }
    pokemonLevel = (Math.round(pokemonLevel) * 2) / 2

    return pokemonLevel
}

function createPokemonMarker(pokemon, generateImages) {
    const icon = L.contentIcon({
        iconUrl: getPokemonMapIconUrl(pokemon, generateImages),
        iconSize: [32, 32]
    })

    let offsetLat = 0
    let offsetLon = 0
    if (pokemon.seen_type === 'nearby_stop' || pokemon.seen_type === 'nearby_cell') {
        offsetLat = (Math.floor(Math.random() * 10) - 5) / 10000
        offsetLon = (Math.floor(Math.random() * 10) - 5) / 10000
    }

    return L.marker([pokemon.latitude + offsetLat, pokemon.longitude + offsetLon], { icon: icon })
}

function searchPokemon(searchText) {
    const searchSplit = searchText.split(',')
    const foundPokemon = new Set()

    searchSplit.forEach(function (searchString) {
        let isAdd = true
        if (searchString.charAt(0) === '+') {
            searchString = searchString.substring(1)
        } else if (searchString.charAt(0) === '-') {
            searchString = searchString.substring(1)
            isAdd = false
        }

        if (searchString.length === 0) {
            return
        }

        function addDeletePokemon(pokemonId) {
            if (isAdd) {
                foundPokemon.add(pokemonId)
            } else {
                foundPokemon.delete(pokemonId)
            }
        }

        const pokemonId = parseInt(searchString)
        if (!isNaN(pokemonId)) {
            addDeletePokemon(pokemonId)
        } else {
            searchString = searchString.toLowerCase()
            pokemonSearchList.forEach(function (item) {
                if (item.name.toLowerCase().includes(searchString) ||
                        item.type1.toLowerCase().includes(searchString) ||
                        item.type2.toLowerCase().includes(searchString) ||
                        item.gen.toString() === searchString) {
                    addDeletePokemon(item.id)
                }
            })
        }
    })

    return foundPokemon
}
