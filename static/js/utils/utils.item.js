var itemData = {}

function initItemData() {
    if (!$.isEmptyObject(itemData)) {
        return Promise.resolve()
    }

    return $.getJSON('static/dist/data/items.min.json').done(function (data) {
        itemData = data
    }).fail(function () {
        console.log('Error loading item data.')
    })
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
