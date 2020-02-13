/* global i8ln, L, markers, markersNoCluster, pokemonGen */
/* eslint no-unused-vars: "off" */

function pokemonSprites(pokemonID) {
    var sprite = {
        columns: 28,
        iconWidth: 80,
        iconHeight: 80,
        spriteWidth: 2240,
        spriteHeight: 1440,
        filename: 'static/icons/' + (pokemonID) + '.png',
        name: 'High-Res'
    }

    return sprite
}

function getPokemonIcon(item, sprite, displayHeight) {
    displayHeight = Math.max(displayHeight, 3)
    var scale = displayHeight / sprite.iconHeight
    var scaledIconSize = [scale * sprite.iconWidth, scale * sprite.iconHeigt]
    var scaledIconOffset = [0, 0]
    var scaledIconCenterOffset = [scale * sprite.iconWidth / 2, scale * sprite.iconHeight / 2]

    let genderParam = item['gender'] ? `&gender=${item['gender']}` : ''
    let formParam = item['form'] ? `&form=${item['form']}` : ''
    let costumeParam = item['costume'] ? `&costume=${item['costume']}` : ''
    let weatherParam = item['weather_boosted_condition'] ? `&weather=${item['weather_boosted_condition']}` : ''
    let iconUrl = `pkm_img?pkm=${item['pokemon_id']}${genderParam}${formParam}${costumeParam}${weatherParam}`

    return {
        iconUrl: iconUrl,
        iconSize: scaledIconSize,
        iconAnchor: scaledIconCenterOffset
    }
}

function getGoogleSprite(index, sprite, displayHeight) {
    displayHeight = Math.max(displayHeight, 3)
    var scale = displayHeight / sprite.iconHeight
    // Crop icon just a tiny bit to avoid bleedover from neighbor
    var scaledIconSize = (scale * sprite.iconWidth - 1, scale * sprite.iconHeight - 1)
    var scaledIconOffset = (
        (index % sprite.columns) * sprite.iconWidth * scale + 0.5,
        Math.floor(index / sprite.columns) * sprite.iconHeight * scale + 0.5)
    var scaledSpriteSize = (scale * sprite.spriteWidth, scale * sprite.spriteHeight)
    var scaledIconCenterOffset = (scale * sprite.iconWidth / 2, scale * sprite.iconHeight / 2)

    return {
        iconUrl: sprite.filename,
        iconSize: scaledIconSize,
        iconAnchor: scaledIconCenterOffset,
        scaledSize: scaledSpriteSize,
        origin: scaledIconOffset
    }
}
