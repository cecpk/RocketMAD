const language = document.documentElement.lang === '' ? 'en' : document.documentElement.lang
var i8lnDictionary = {}

var pokemonData = {}
var moveData = {}
var itemData = {}

var pokemonSearchList = []

var pokemonRarities = {}
var rarityNames = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Ultra Rare', 'New Spawn']

const availablePokemonCount = 649

function initI8lnDictionary(callback) {
    if (language === 'en' || !$.isEmptyObject(i8lnDictionary)) {
        callback()
        return
    }

    $.getJSON('static/dist/locales/' + language + '.min.json')
    .done(function (data) {
        i8lnDictionary = data
        callback()
    })
    .fail(function () {
        console.log('Error loading i8ln dictionary.')
    })
}

function i8ln(word) {
    if (word in i8lnDictionary) {
        return i8lnDictionary[word]
    } else {
        // Word doesn't exist in dictionary return it as is.
        return word
    }
}

function updatePokemonRarities(rarityFileName, callback) {
    $.getJSON('static/dist/data/' + rarityFileName + '.json')
    .done(function (data) {
        pokemonRarities = data
        callback()
    })
    .fail(function () {
        console.log("Couldn't load dynamic rarity JSON.")
    })
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

function initPokemonData(callback) {
    if (!$.isEmptyObject(pokemonData)) {
        callback()
        return
    }

    $.getJSON('static/dist/data/pokemon.min.json')
    .done(function (data) {
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
        callback()
    })
    .fail(function () {
        console.log('Error loading pokemon data.')
    })
}

function initMoveData(callback) {
    if (!$.isEmptyObject(moveData)) {
        callback()
        return
    }

    $.getJSON('static/dist/data/moves.min.json')
    .done(function (data) {
        moveData = data
        callback()
    })
    .fail(function () {
        console.log('Error loading move data.')
    })
}

function initItemData(callback) {
    if (!$.isEmptyObject(itemData)) {
        callback()
        return
    }

    $.getJSON('static/dist/data/items.min.json')
    .done(function (data) {
        itemData = data
        callback()
    })
    .fail(function () {
        console.log('Error loading item data.')
    })
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

function getItemName(id) {
    return i8ln(itemData[id].name)
}

function getItemImageUrl(id) {
    return 'static/images/items/' + id + '.png'
}

function getQuestBundles(id) {
    if (itemData[id].questBundles) {
        return itemData[id].questBundles
    } else {
        return []
    }
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
