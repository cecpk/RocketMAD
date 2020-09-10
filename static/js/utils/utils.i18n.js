/* exported getDataTablesLocUrl, i18n, initI18nDictionary */

const language = document.documentElement.lang === '' ? 'en' : document.documentElement.lang
var i18nDictionary = {}
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

function i18n(key, fallbackValue = 'undefined') {
    return key in i18nDictionary ? i18nDictionary[key] : fallbackValue
}

function getDataTablesLocUrl() {
    const jsonFile = dataTablesLocFileName[language]
    return typeof jsonFile === 'string' ? 'https://cdn.datatables.net/plug-ins/1.10.20/i18n/' + jsonFile : undefined
}
