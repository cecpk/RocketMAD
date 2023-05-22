/* exported i18n, initI18nDictionary, getDataTablesLocUrl */

const language = document.documentElement.lang === '' ? 'en' : document.documentElement.lang
var i18nDictionary = {}

const dataTablesLocFileName = {
    de: 'German.json',
    fr: 'French.json',
    ja: 'Japanese.json',
    ko: 'Korean.json',
    pt_br: 'Portuguese-Brasil.json',
    ru: 'Russian.json',
    se: 'Swedish.json',
    zh_cn: 'Chinese.json',
    zh_hk: 'Chinese-traditional.json',
    zh_tw: 'Chinese-traditional.json'
}

function initI18nDictionary() {
    if (language === 'en' || !$.isEmptyObject(i18nDictionary)) {
        return Promise.resolve()
    }

    return $.getJSON('static/dist/locales/' + language + '.min.json?v=' + version).done(function (data) {
        i18nDictionary = data
    }).fail(function () {
        console.log('Error loading i18n dictionary.')
    })
}

function i18n(word) {
    if (word in i18nDictionary) {
        return i18nDictionary[word]
    } else {
        // Word doesn't exist in dictionary return it as is.
        return word
    }
}

function getDataTablesLocUrl() {
    const jsonFile = dataTablesLocFileName[language]
    return typeof jsonFile === 'string' ? 'https://cdn.datatables.net/plug-ins/1.10.20/i18n/' + jsonFile : undefined
}
