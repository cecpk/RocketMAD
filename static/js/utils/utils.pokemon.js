var pokemonData = {}
var moveData = {}
var pokemonRarities = {}
const rarityNames = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Ultra Rare', 'New Spawn']
var pokemonSearchList = []
const availablePokemonCount = 649
let pokemonIds = new Set()

function initPokemonData() {
    if (!$.isEmptyObject(pokemonData)) {
        return Promise.resolve()
    }

    return $.getJSON('static/dist/data/pokemon.min.json').done(function (data) {
        pokemonData = data
        $.each(pokemonData, function(id, value) {
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
                name: i8ln(value.name),
                type1: i8ln(value.types[0].type),
                type2: value.types[1] ? i8ln(value.types[1].type) : '',
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

    return $.getJSON('static/dist/data/moves.min.json').done(function (data) {
        moveData = data
    }).fail(function () {
        console.log('Error loading move data.')
    })
}

function updatePokemonRarities(rarityFileName) {
    return $.getJSON('static/dist/data/' + rarityFileName + '.json', {_: new Date().getTime()}).done(function (data) {
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
        // Meltan and Melmetal.
        pokemonIds.add(808)
        pokemonIds.add(809)
    }
    return new Set(pokemonIds)
}

function getPokemonName(id) {
    return i8ln(pokemonData[id].name)
}

function getPokemonTypes(pokemonId, formId) {
    if (formId && 'formTypes' in pokemonData[pokemonId].forms[formId]) {
        return i8ln(pokemonData[pokemonId].forms[formId].formTypes)
    } else {
        return i8ln(pokemonData[pokemonId].types)
    }
}

function getPokemonTypesNoI8ln(pokemonId, formId) {
    if (formId && 'formTypes' in pokemonData[pokemonId].forms[formId]) {
        return pokemonData[pokemonId].forms[formId].formTypes
    } else {
        return pokemonData[pokemonId].types
    }
}

function getFormName(pokemonId, formId) {
    return i8ln(pokemonData[pokemonId].forms[formId].formName)
}

function getPokemonNameWithForm(pokemonId, formId) {
    let name = getPokemonName(pokemonId)
    if (formId) {
        const formName = getFormName(pokemonId, formId)
        if (formName !== '') {
            name += ` (${formName})`
        }
    }
    return name
}

function getPokemonGen(id) {
    return pokemonData[id].gen
}

function getMoveName(id) {
    return i8ln(moveData[id].name)
}

function getMoveType(id) {
    return i8ln(moveData[id].type)
}

function getMoveTypeNoI8ln(id) {
    return moveData[id].type
}

function getPokemonRarity(pokemonId) {
    if (pokemonRarities.hasOwnProperty(pokemonId)) {
        return pokemonRarities[pokemonId]
    }

    return 6 // New Spawn.
}

function getPokemonRarityName(pokemonId) {
    if (pokemonRarities.hasOwnProperty(pokemonId)) {
        return i8ln(rarityNames[pokemonRarities[pokemonId] - 1])
    }

    return i8ln('New Spawn')
}

function getPokemonRawIconUrl(p) {
    if (!serverSettings.generateImages) {
        return `static/icons/${p.pokemon_id}.png`
    }
    var url = 'pkm_img?raw=1&pkm=' + p.pokemon_id
    var props = ['gender', 'form', 'costume', 'shiny']
    for (var i = 0; i < props.length; i++) {
        var prop = props[i]
        if (prop in p && p[prop] != null && p[prop]) {
            url += '&' + prop + '=' + p[prop]
        }
    }
    return url
}

function getPokemonMapIconUrl(pokemon) {
    if (!serverSettings.generateImages) {
        return `static/icons/${pokemon.pokemon_id}.png`
    }

    let genderParam = pokemon.gender ? `&gender=${pokemon.gender}` : ''
    let formParam = pokemon.form ? `&form=${pokemon.form}` : ''
    let costumeParam = pokemon.costume ? `&costume=${pokemon.costume}` : ''
    let weatherParam = pokemon.weather_boosted_condition ? `&weather=${pokemon.weather_boosted_condition}` : ''

    return `pkm_img?pkm=${pokemon.pokemon_id}${genderParam}${formParam}${costumeParam}${weatherParam}`
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

function setupPokemonMarker(pokemon, layerGroup) {
    var icon = L.icon({ // eslint-disable-line new-cap
        iconUrl: getPokemonMapIconUrl(pokemon),
        iconSize: [32, 32]
    })

    return L.marker([pokemon.latitude, pokemon.longitude], {icon: icon}).addTo(layerGroup)
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
                        foundPokemon.push(item['id'])
                    } else {
                        delete foundPokemon[foundPokemon.indexOf(item['id'])]
                    }
                }
            })
        }
    })
    return foundPokemon
}
