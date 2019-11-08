
const language = document.documentElement.lang === '' ? 'en' : document.documentElement.lang
var i8lnDictionary = {}
var languageLookups = 0
var languageLookupThreshold = 3

var pokemonData = {}
var pokemonDataNoI8ln = {}

var pokemonGen = new Array(808)
pokemonGen.fill(1, 1, 152)
pokemonGen.fill(2, 152, 252)
pokemonGen.fill(3, 252, 387)
pokemonGen.fill(4, 387, 494)
pokemonGen.fill(5, 494, 650)
pokemonGen.fill(6, 650, 722)
pokemonGen.fill(7, 722, 808)

function initI8lnDictionary(callback) {
    if (language === 'en' || !$.isEmptyObject(i8lnDictionary)) {
        callback()
        return
    }

    $.getJSON('static/dist/locales/' + language + '.min.json')
    .done(function(data) {
        i8lnDictionary = data
        callback()
    })
    .fail(function() {
        console.log('Error loading i8ln dictionary.');
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

function initPokemonData(callback) {
    if (!$.isEmptyObject(pokemonData)) {
        callback()
        return
    }

    $.getJSON('static/dist/data/pokemon.min.json', function(data) {
        pokemonData = pokemonDataNoI8ln = data
        if (language !== 'en') {
            $.each(pokemonData, function(id, value) {
                pokemonData[id].name = i8ln(value.name)
                $.each(pokemonData[id].types, function(idx, value) {
                    pokemonData[id].types[idx].type = i8ln(value.type)
                })
                if (value.forms) {
                    $.each(pokemonData[id].forms, function(formId, value) {
                        pokemonData[id].forms[formId].formName = i8ln(value.formName)
                    })
                }
            })
        }
        callback()
    })
}

function getPokemonName(id) {
    return pokemonData[id].name
}

function getPokemonGen(id) {
    return pokemonGen[id]
}
