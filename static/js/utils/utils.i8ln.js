/* exported i8ln, initI8lnDictionary, getDataTablesLocUrl */

const language = document.documentElement.lang === '' ? 'en' : document.documentElement.lang
var i8lnDictionary = {}

const dataTablesLocFileName = {
    de: 'German.json',
    fr: 'French.json',
    ja: 'Japanese.json',
    ko: 'Korean.json',
    pt_br: 'Portuguese-Brasil.json',
    ru: 'Russian.json',
    zh_cn: 'Chinese.json',
    zh_hk: 'Chinese-traditional.json',
    zh_tw: 'Chinese-traditional.json'
}

function initI8lnDictionary() {
    if (language === 'en' || !$.isEmptyObject(i8lnDictionary)) {
        return Promise.resolve()
    }

    return $.getJSON('static/dist/locales/' + language + '.min.json?v=' + version).done(function (data) {
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

function getDataTablesLocUrl() {
    const jsonFile = dataTablesLocFileName[language]
    return typeof jsonFile === 'string' ? 'https://cdn.datatables.net/plug-ins/1.10.20/i18n/' + jsonFile : undefined
}
