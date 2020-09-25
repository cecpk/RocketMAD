/* exported getItemImageUrl, getItemName, getQuestBundles, initItemData */

var itemData = {}

function initItemData() {
    if (!$.isEmptyObject(itemData)) {
        return Promise.resolve()
    }

    return $.getJSON('static/dist/data/items.min.json?v=' + version).done(function (data) {
        itemData = data
    }).fail(function () {
        console.log('Error loading item data.')
    })
}

function getItemName(id) {
    const item = itemData[id]
    return typeof item === 'undefined' ? '#' + id : i18n(item.name)
}

function getItemImageUrl(id) {
    return 'static/images/items/' + id + '.png'
}

function getQuestBundles(id) {
    const bundles = itemData[id].questBundles || []
    return bundles.length === 0 ? [1] : bundles
}
