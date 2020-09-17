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
    return i18n(itemData[id].name)
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
