const language = document.documentElement.lang === '' ? 'en' : document.documentElement.lang
var i8lnDictionary = {}

function initI8lnDictionary() {
    if (language === 'en' || !$.isEmptyObject(i8lnDictionary)) {
        return Promise.resolve()
    }

    return $.getJSON('static/dist/locales/' + language + '.min.json').done(function (data) {
        i8lnDictionary = data
    }).fail(function () {
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
