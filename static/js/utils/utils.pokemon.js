/*
exported genderClasses, getIvsPercentage, getIvsPercentageCssColor,
getMoveName, getMoveType, getMoveTypeNoI8ln, getPokemonGen, getPokemonIds,
getPokemonLevel, getPokemonNameWithForm, getPokemonRarity,
getPokemonRarityName, getPokemonRawIconUrl, getPokemonTypes, initMoveData,
initPokemonData, searchPokemon, setupPokemonMarker, updatePokemonRarities
*/

var pokemonData = {}
var moveData = {}
var pokemonRarities = {}
const rarityNames = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Ultra Rare', 'New Spawn']
// FontAwesome gender classes.
const genderClasses = ['fa-mars', 'fa-venus', 'fa-neuter']
var pokemonSearchList = []
const availablePokemonCount = 649
const pokemonIds = new Set()

function initPokemonData() {
    if (!$.isEmptyObject(pokemonData)) {
        return Promise.resolve()
    }

    return $.getJSON('static/dist/data/pokemon.min.json?v=' + version).done(function (data) {
        pokemonData = data
        $.each(pokemonData, function (id, value) {
            var gen
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
        // Meltan, Melmetal and Galarians.
        pokemonIds.add(808)
        pokemonIds.add(809)
        pokemonIds.add(862)
        pokemonIds.add(863)
        pokemonIds.add(865)
    }
    return new Set(pokemonIds)
}

function getPokemonName(id, evolutionId = 0) {
    switch (evolutionId) {
        case 1:
            return i18n('Mega') + ' ' + i18n(pokemonData[id].name)
        case 2:
            return i18n('Mega') + ' ' + i18n(pokemonData[id].name) + ' X'
        case 3:
            return i18n('Mega') + ' ' + i18n(pokemonData[id].name) + ' Y'
        default:
            return i18n(pokemonData[id].name)
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

function setupPokemonMarker(pokemon, layerGroup, generateImages) {
    var icon = L.icon({
        iconUrl: getPokemonMapIconUrl(pokemon, generateImages),
        iconSize: [32, 32]
    })

    return L.marker([pokemon.latitude, pokemon.longitude], { icon: icon }).addTo(layerGroup)
}

function searchPokemon(searchtext) {
    var searchsplit = searchtext.split(',')
    var foundPokemon = []
    var operator = 'add'
    $.each(searchsplit, function (k, searchstring) {
        if (searchstring.substring(0, 1) === '+') {
            searchstring = searchstring.substring(1)
            operator = 'add'
        } else if (searchstring.substring(0, 1) === '-') {
            searchstring = searchstring.substring(1)
            operator = 'remove'
        } else {
            operator = 'add'
        }
        if (!isNaN(parseFloat(searchstring)) && !isNaN(searchstring - 0)) {
            if (operator === 'add') {
                foundPokemon.push(searchstring)
            } else {
                delete foundPokemon[foundPokemon.indexOf(searchstring)]
            }
        } else if (searchstring.length > 0 && searchstring !== '-' && searchstring !== '+') {
            $.each(pokemonSearchList, function (idx, item) {
                if (item.name.toLowerCase().includes(searchstring.toLowerCase()) ||
                        item.id.toString() === searchstring.toString() ||
                        item.type1.toLowerCase().includes(searchstring.toLowerCase()) ||
                        item.type2.toLowerCase().includes(searchstring.toLowerCase()) ||
                        item.gen.toString() === searchstring.toLowerCase()) {
                    if (operator === 'add') {
                        foundPokemon.push(item.id)
                    } else {
                        delete foundPokemon[foundPokemon.indexOf(item.id)]
                    }
                }
            })
        }
    })
    return foundPokemon
}
