/*
globals addListeners, autoPanPopup, cryFileTypes, isShowAllZoom, mapData,
notifiedPokemonData, pokemonNewSpawnZIndex,
pokemonNotifiedZIndex, pokemonRareZIndex, pokemonUltraRareZIndex,
pokemonUncommonZIndex, pokemonVeryRareZIndex, pokemonZIndex, removeMarker,
removeRangeCircle, sendNotification, settings, setupRangeCircle,
updateRangeCircle, weatherClassesDay, weatherNames, updateMarkerLayer,
createPokemonMarker, filterManagers, serverSettings
*/
/* exported processPokemon, updatePokemons */

function isPokemonRarityExcluded(pokemon) {
    if (serverSettings.rarity) {
        const pokemonRarity = getPokemonRarity(pokemon.pokemon_id)
        if (!settings.includedRarities.includes(pokemonRarity)) {
            return true
        }
    }

    return false
}

function isPokemonMeetsFilters(pokemon, isNotifPokemon) {
    if (!settings.showPokemon) {
        return false
    }

    if (settings.showNotifPokemonAlways && isNotifPokemon) {
        return true
    }

    if (getExcludedPokemon().has(pokemon.pokemon_id) || isPokemonRarityExcluded(pokemon) ||
            (settings.pokemonNotifs && settings.showNotifPokemonOnly && !isNotifPokemon)) {
        return false
    }

    if (settings.showPokemonValues && settings.filterPokemonByValues && !settings.noFilterValuesPokemon.has(pokemon.pokemon_id)) {
        if (pokemon.individual_attack != null) {
            const ivsPercentage = getIvsPercentage(pokemon.individual_attack, pokemon.individual_defense, pokemon.individual_stamina)
            if (ivsPercentage < settings.minIvs && !(settings.showZeroIvsPokemon && ivsPercentage === 0)) {
                return false
            }
            if (ivsPercentage > settings.maxIvs && !(settings.showHundoIvsPokemon && ivsPercentage === 100)) {
                return false
            }

            const level = getPokemonLevel(pokemon.cp_multiplier)
            if (level < settings.minLevel || level > settings.maxLevel) {
                return false
            }
        } else {
            // Pokemon is not encountered.
            return false
        }
    }

    if (settings.excludeNearbyCells && pokemon.seen_type === 'nearby_cell') {
        return false
    }

    return true
}

function isPokemonRangesActive() {
    return settings.showRanges && settings.includedRangeTypes.includes(1)
}

function customizePokemonMarker(pokemon, marker, isNotifPokemon) {
    marker.setBouncingOptions({
        bounceHeight: 20,
        bounceSpeed: 80,
        elastic: false,
        shadowAngle: null
    })

    marker.encounter_id = pokemon.encounter_id
    updatePokemonMarker(pokemon, marker, isNotifPokemon)
    marker.bindPopup('', { autoPan: autoPanPopup() })

    addListeners(marker, 'pokemon')

    return marker
}

function updatePokemonMarker(pokemon, marker, isNotifPokemon) {
    const icon = marker.options.icon

    let iconSize = 32 * (settings.pokemonIconSizeModifier / 100)
    let upscaleModifier = 1
    let zIndex = pokemonZIndex

    const ivs = pokemon.individual_attack ? getIvsPercentage(pokemon.individual_attack, pokemon.individual_defense, pokemon.individual_stamina) : 0
    const lvl = pokemon.cp_multiplier ? getPokemonLevel(pokemon.cp_multiplier) : 0

    if (settings.highlightPokemon && settings.scaleByValues) {
        if (ivs === 100) {
            iconSize *= 1.7
            zIndex = pokemonNewSpawnZIndex
        } else if (ivs >= settings.highlightThresholdIV) {
            iconSize *= 1.3
            zIndex = pokemonUltraRareZIndex
        }
        if (lvl >= settings.highlightThresholdLevel) {
            iconSize *= 1.2
        }
    }

    if ((isNotifPokemon && settings.upscaleNotifMarkers) || serverSettings.upscaledPokemon.includes(pokemon.pokemon_id)) {
        upscaleModifier = 1.3
    }

    if (settings.scaleByRarity) {
        const pokemonRarity = getPokemonRarity(pokemon.pokemon_id)
        switch (pokemonRarity) {
            case 4:
                upscaleModifier = 1.3
                break
            case 5:
                upscaleModifier = 1.4
                break
            case 6:
                upscaleModifier = 1.5
        }
    }

    iconSize *= upscaleModifier

    icon.options.shadowUrl = null
    icon.options.shadowSize = null
    icon.options.className = null
    if (serverSettings.highlightPokemon && settings.highlightPokemon) {
        const type = ivs === 100 ? 'Perfect' : ivs >= settings.highlightThresholdIV ? 'IV' : lvl >= settings.highlightThresholdLevel ? 'Level' : ''
        if (type && settings[`highlightColor${type}`]) {
            if (serverSettings.highlightPokemon === 'svg') {
                icon.options.shadowUrl = `data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150"><circle style="fill:${settings[`highlightColor${type}`].replace('#', '%23')}" cx="75" cy="75" r="${settings.highlightSize}"/></svg>`
                icon.options.shadowSize = [iconSize * 2, iconSize * 2]
                icon.options.className = 'marker-highlight'
            } else if (serverSettings.highlightPokemon === 'css') {
                icon.options.className = `marker-highlight-${type.toLowerCase()}`
            }
        }
    }

    icon.options.iconSize = [iconSize, iconSize]
    marker.setIcon(icon)

    if (isNotifPokemon) {
        zIndex = Math.max(pokemonNotifiedZIndex, zIndex)
    } else if (serverSettings.rarity) {
        const pokemonRarity = getPokemonRarity(pokemon.pokemon_id)
        switch (pokemonRarity) {
            case 2:
                zIndex = Math.max(pokemonUncommonZIndex, zIndex)
                break
            case 3:
                zIndex = Math.max(pokemonRareZIndex, zIndex)
                break
            case 4:
                zIndex = Math.max(pokemonVeryRareZIndex, zIndex)
                break
            case 5:
                zIndex = Math.max(pokemonUltraRareZIndex, zIndex)
                break
            case 6:
                zIndex = Math.max(pokemonNewSpawnZIndex, zIndex)
                break
            default:
                zIndex = Math.max(pokemonZIndex, zIndex)
        }
    }

    marker.setZIndexOffset(zIndex)
    updateMarkerLayer(marker, isNotifPokemon, notifiedPokemonData[pokemon.encounter_id])

    return marker
}

function pokemonLabel(item) {
    var name = getPokemonName(item.pokemon_id)
    var types = getPokemonTypesNoI8ln(item.pokemon_id, item.form)
    var encounterId = item.encounter_id
    var id = item.pokemon_id
    var latitude = item.latitude
    var longitude = item.longitude
    var disappearTime = item.disappear_time
    var atk = item.individual_attack
    var def = item.individual_defense
    var sta = item.individual_stamina
    var gender = item.gender
    var form = item.form
    var cp = item.cp
    var cpMultiplier = item.cp_multiplier
    var weatherBoostedCondition = item.weather_boosted_condition

    var pokemonIcon = getPokemonRawIconUrl(item, serverSettings.generateImages)
    var gen = getPokemonGen(id)

    var formDisplay = ''
    var genRarityDisplayLeft = ''
    var genRarityDisplayRight = ''
    var weatherBoostDisplay = ''
    var verifiedDisplay = ''
    var typesDisplay = ''
    var statsDisplay = ''
    var nearbyStopWarning = ''

    if (id === 29 || id === 32) {
        name = name.slice(0, -1)
    }

    const formName = form ? getFormName(id, form) : false
    if (formName) {
        formDisplay = `(${formName})`
    }

    if (weatherBoostedCondition > 0) {
        weatherBoostDisplay = `<i class='${weatherClassesDay[weatherBoostedCondition]}' title='${weatherNames[weatherBoostedCondition]}'></i>`
    }

    if (item.verified_disappear_time) {
        verifiedDisplay = '<i id="despawn-verified" class="fas fa-check-square" title="Despawn time verified"></i>'
    } else if (item.verified_disappear_time === null) {
        verifiedDisplay = '<i id="despawn-unverified" class="fas fa-exclamation-triangle" title="Despawn time not verified"></i>'
    }


    if (item.seen_type === 'nearby_stop') {
        nearbyStopWarning = `
            <div class="info-container">
               ${getLocationNearStop()}
            </div>`
    } else if (item.seen_type === 'nearby_cell') {
        nearbyStopWarning = `
            <div class="info-container">
               ${getLocationInCell()}
            </div>`
    }

    $.each(types, function (idx, type) {
        if (idx === 1) {
            typesDisplay += `<img src='static/images/types/${type.type.toLowerCase()}.png' title='${i18n(type.type)}' width='16' style='margin-left:4px;'>`
        } else {
            typesDisplay += `<img src='static/images/types/${type.type.toLowerCase()}.png' title='${i18n(type.type)}' width='16'>`
        }
    })

    if (settings.showPokemonValues && cp !== null && cpMultiplier !== null) {
        var iv = 0
        if (atk !== null && def !== null && sta !== null) {
            iv = getIvsPercentage(atk, def, sta)
        }
        var ivColor = getIvsPercentageCssColor(iv)
        var level = getPokemonLevel(item.cp_multiplier)
        var move1Name = getMoveName(item.move_1)
        var move2Name = getMoveName(item.move_2)
        var move1Type = getMoveTypeNoI8ln(item.move_1)
        var move2Type = getMoveTypeNoI8ln(item.move_2)
        var weight = item.weight.toFixed(2)
        var height = item.height.toFixed(2)

        var catchRatesDisplay = ''
        if (serverSettings.catchRates && item.catch_prob_1) {
            catchRatesDisplay = `
                <div>
                  <span title='Catch rate with Poké Ball' ><span class='ball-icon' ><img src='static/images/reward/item/1.png' width='19'></span> ${(item.catch_prob_1 * 100).toFixed(1)}%</span>
                  <span title='Catch rate with Great Ball' ><span class='ball-icon' ><img src='static/images/reward/item/2.png' width='19'></span> ${(item.catch_prob_2 * 100).toFixed(1)}%</span>
                  <span title='Catch rate with Ultra Ball' ><span class='ball-icon' ><img src='static/images/reward/item/3.png' width='19'></span> ${(item.catch_prob_3 * 100).toFixed(1)}%</span>
                </div>`
        }

        statsDisplay = `
            <div class='info-container'>
              <div>
                ${i18n('IV')}: <strong><span style='color: ${ivColor};'>${iv}%</span></strong> (A<strong>${atk}</strong> | D<strong>${def}</strong> | S<strong>${sta}</strong>)
              </div>
              <div>
                ${i18n('CP')}: <strong>${cp}</strong> | ${i18n('Level')}: <strong>${level}</strong>
              </div>
              <div>
               ${i18n('Fast')}: <strong>${move1Name}</strong> <img class='move-type-icon' src='static/images/types/${move1Type.toLowerCase()}.png' title='${i18n(move1Type)}' width='15'>
              </div>
              <div>
               ${i18n('Charge')}: <strong>${move2Name}</strong> <img class='move-type-icon' src='static/images/types/${move2Type.toLowerCase()}.png' title='${i18n(move2Type)}' width='15'>
              </div>
              <div>
                ${i18n('Weight')}: <strong>${weight}kg</strong> | ${i18n('Height')}: <strong>${height}m</strong>
              </div>
              ${catchRatesDisplay}
            </div>`

        let rarityDisplay = ''
        if (serverSettings.rarity) {
            const rarityName = getPokemonRarityName(item.pokemon_id)
            rarityDisplay = `
                <div>
                  <strong>${rarityName}</strong>
                </div>`
        }

        genRarityDisplayLeft = `
            ${rarityDisplay}
            <div>
              <strong>Gen ${gen}</strong>
            </div>`
    } else {
        let rarityDisplay = ''
        if (serverSettings.rarity) {
            const rarityName = getPokemonRarityName(item.pokemon_id)
            rarityDisplay = `<strong>${rarityName}</strong> | `
        }

        genRarityDisplayRight = `
            <div class='info-container'>
              ${rarityDisplay}<strong>Gen ${gen}</strong>
            </div>`
    }

    const notifText = settings.notifPokemon.has(id) ? i18n('Don\'t notify') : i18n('Notify')
    const notifIconClass = settings.notifPokemon.has(id) ? 'fas fa-bell-slash' : 'fas fa-bell'

    return `
        <div>
          <div id='pokemon-container'>
            <div id='pokemon-container-left'>
              <div id='pokemon-image'>
                <img src='${pokemonIcon}' width='64'>
              </div>
              <div id='types'>
                ${typesDisplay}
              </div>
              ${genRarityDisplayLeft}
            </div>
            <div id='pokemon-container-right'>
              <div class='title'>
                ${name} ${formDisplay} <i class='fas ${genderClasses[gender - 1]}'></i> #${id} ${weatherBoostDisplay}
              </div>
              <div class='disappear'>
                ${timestampToTime(disappearTime)} (<span class='label-countdown' disappears-at='${disappearTime}'>00m00s</span>) ${verifiedDisplay}
              </div>
              ${statsDisplay}
              ${genRarityDisplayRight}
              <div class='coordinates'>
                ${nearbyStopWarning}
                <a href='javascript:void(0);' onclick='javascript:openMapDirections(${latitude},${longitude},"${settings.mapServiceProvider}");' class='link-button' title='${i18n('Open in')} ${mapServiceProviderNames[settings.mapServiceProvider]}'><i class="fas fa-map-marked-alt"></i> ${latitude.toFixed(5)}, ${longitude.toFixed(5)}</a>
              </div>
              <div>
                <a href='javascript:togglePokemonNotif(${id})' class='link-button' title="${notifText}"><i class="${notifIconClass}"></i></a>
                <a href='javascript:excludePokemon(${id})' class='link-button' title=${i18n('Hide')}><i class="fas fa-eye-slash"></i></a>
                <a href='javascript:removePokemonMarker("${encounterId}")' class='link-button' title='${i18n('Remove')}'><i class="fas fa-trash"></i></a>
                <a href='https://pokemongo.gamepress.gg/pokemon/${id}' class='link-button' target='_blank' title='${i18n('View on GamePress')}'><i class="fas fa-info-circle"></i></a>
              </div>
            </div>
          </div>
        </div>`
}

function updatePokemonLabel(pokemon, marker) {
    marker.getPopup().setContent(pokemonLabel(pokemon))
    if (marker.isPopupOpen()) {
        // Update countdown time to prevent a countdown time of 0.
        updateLabelDiffTime()
    }
}

function processPokemon(pokemon) {
    if (!settings.showPokemon) {
        return false
    }

    const id = pokemon.encounter_id
    if (!(id in mapData.pokemons)) {
        const isNotifPoke = isNotifPokemon(pokemon)
        if (!isPokemonMeetsFilters(pokemon, isNotifPoke) || pokemon.disappear_time <= Date.now() + 3000) {
            return true
        }

        if (isNotifPoke && !hasSentPokemonNotification(pokemon)) {
            sendPokemonNotification(pokemon)
        }

        pokemon.marker = createPokemonMarker(pokemon, serverSettings.generateImages)
        customizePokemonMarker(pokemon, pokemon.marker, isNotifPoke)

        if (isPokemonRangesActive()) {
            pokemon.rangeCircle = setupRangeCircle(pokemon, 'pokemon', !isNotifPoke)
        }

        pokemon.updated = true
        mapData.pokemons[id] = pokemon
    } else {
        updatePokemon(id, pokemon)
    }

    return true
}

function updatePokemon(id, pokemon = null) {
    if (id == null || !(id in mapData.pokemons)) {
        return true
    }

    const isPokemonNull = pokemon === null
    if (isPokemonNull) {
        pokemon = mapData.pokemons[id]
    }

    const isNotifPoke = isNotifPokemon(pokemon)
    if (!isPokemonMeetsFilters(pokemon, isNotifPoke)) {
        removePokemon(pokemon)
        return true
    }

    if (!isPokemonNull) {
        const oldPokemon = mapData.pokemons[id]
        if (pokemon.pokemon_id !== oldPokemon.pokemon_id || pokemon.disappear_time !== oldPokemon.disappear_time ||
                pokemon.cp_multiplier !== oldPokemon.cp_multiplier || pokemon.individual_attack !== oldPokemon.individual_attack ||
                pokemon.individual_defense !== oldPokemon.individual_defense || pokemon.individual_stamina !== oldPokemon.individual_stamina ||
                pokemon.weight !== oldPokemon.weight || pokemon.height !== oldPokemon.height) {
            if (isNotifPoke && !hasSentPokemonNotification(pokemon)) {
                sendPokemonNotification(pokemon)
            }

            pokemon.marker = updatePokemonMarker(pokemon, mapData.pokemons[id].marker, isNotifPoke)
            if (oldPokemon.rangeCircle) {
                pokemon.rangeCircle = updateRangeCircle(mapData.pokemons[id], 'pokemon', !isNotifPoke)
            }

            if (pokemon.marker.isPopupOpen()) {
                updatePokemonLabel(pokemon, pokemon.marker)
            } else {
                // Make sure label is updated next time it's opened.
                pokemon.updated = true
            }

            mapData.pokemons[id] = pokemon
        }
    } else {
        if (isNotifPoke && !hasSentPokemonNotification(pokemon)) {
            sendPokemonNotification(pokemon)
        }

        updatePokemonMarker(pokemon, mapData.pokemons[id].marker, isNotifPoke)
        if (isPokemonRangesActive() && !pokemon.rangeCircle) {
            mapData.pokemons[id].rangeCircle = setupRangeCircle(pokemon, 'pokemon', !isNotifPoke)
        } else {
            updateRangeCircle(mapData.pokemons[id], 'pokemon', !isNotifPoke)
        }

        if (pokemon.marker.isPopupOpen()) {
            updatePokemonLabel(pokemon, mapData.pokemons[id].marker)
        } else {
            // Make sure label is updated next time it's opened.
            mapData.pokemons[id].updated = true
        }
    }

    return true
}

function updatePokemons(pokemonIds = new Set(), encounteredOnly = false) {
    if (pokemonIds.size > 0 && encounteredOnly) {
        $.each(mapData.pokemons, function (encounterId, pokemon) {
            if (pokemonIds.has(pokemon.pokemon_id) && pokemon.individual_attack != null) {
                updatePokemon(encounterId)
            }
        })
    } else if (pokemonIds.size > 0) {
        $.each(mapData.pokemons, function (encounterId, pokemon) {
            if (pokemonIds.has(pokemon.pokemon_id)) {
                updatePokemon(encounterId)
            }
        })
    } else if (encounteredOnly) {
        $.each(mapData.pokemons, function (encounterId, pokemon) {
            if (pokemon.individual_attack != null) {
                updatePokemon(encounterId)
            }
        })
    } else {
        $.each(mapData.pokemons, function (encounterId, pokemon) {
            updatePokemon(encounterId)
        })
    }
}

function removePokemon(pokemon) {
    const id = pokemon.encounter_id
    if (id in mapData.pokemons) {
        if (mapData.pokemons[id].rangeCircle) {
            removeRangeCircle(mapData.pokemons[id].rangeCircle)
        }
        removeMarker(mapData.pokemons[id].marker)
        delete mapData.pokemons[id]
    }
}

function removePokemonMarker(id) { // eslint-disable-line no-unused-vars
    if (id in mapData.pokemons) {
        if (mapData.pokemons[id].rangeCircle) {
            removeRangeCircle(mapData.pokemons[id].rangeCircle)
        }
        removeMarker(mapData.pokemons[id].marker)
    }
}

function getExcludedPokemon() {
    return !settings.filterPokemonById || isShowAllZoom() ? new Set() : settings.excludedPokemon
}

function excludePokemon(id) { // eslint-disable-line no-unused-vars
    if (filterManagers.excludedPokemon !== null) {
        filterManagers.excludedPokemon.add([id])
        $('#filter-pokemon-switch').prop('checked', true).trigger('change')
    }
}

function togglePokemonNotif(id) { // eslint-disable-line no-unused-vars
    if (filterManagers.notifPokemon !== null) {
        filterManagers.notifPokemon.toggle(id)
    }
}

function isNotifPokemon(pokemon) {
    if (!settings.showPokemon || !settings.pokemonNotifs) {
        return false
    }

    if (settings.pokemonIdNotifs && settings.notifPokemon.has(pokemon.pokemon_id)) {
        return true
    }

    if (settings.showPokemonValues) {
        if (pokemon.individual_attack != null && settings.pokemonValuesNotifs && settings.notifValuesPokemon.has(pokemon.pokemon_id)) {
            const ivsPercentage = getIvsPercentage(pokemon.individual_attack, pokemon.individual_defense, pokemon.individual_stamina)
            const level = getPokemonLevel(pokemon.cp_multiplier)
            if ((ivsPercentage >= settings.minNotifIvs || (settings.zeroIvsPokemonNotifs && ivsPercentage === 0)) &&
                    (ivsPercentage <= settings.maxNotifIvs || (settings.hundoIvsPokemonNotifs && ivsPercentage === 100)) &&
                    (level >= settings.minNotifLevel && level <= settings.maxNotifLevel)) {
                return true
            }
        }

        if (pokemon.weight) {
            if (settings.tinyRattataNotifs && pokemon.pokemon_id === 19 && pokemon.weight < 2.40625) {
                return true
            }

            if (settings.bigMagikarpNotifs && pokemon.pokemon_id === 129 && pokemon.weight > 13.125) {
                return true
            }
        }
    }

    if (serverSettings.rarity) {
        const pokemonRarity = getPokemonRarity(pokemon.pokemon_id)
        if (settings.notifRarities.includes(pokemonRarity)) {
            return true
        }
    }

    return false
}

function hasSentPokemonNotification(pokemon) {
    const id = pokemon.encounter_id
    return id in notifiedPokemonData && pokemon.disappear_time === notifiedPokemonData[id].disappear_time &&
        pokemon.cp_multiplier === notifiedPokemonData[id].cp_multiplier && pokemon.individual_attack === notifiedPokemonData[id].individual_attack &&
        pokemon.individual_defense === notifiedPokemonData[id].individual_defense && pokemon.individual_stamina === notifiedPokemonData[id].individual_stamina
}

function playPokemonSound(pokemonId, cryFileTypes) {
    if (!settings.playSound) {
        return
    }

    if (!settings.playCries) {
        ding.play()
    } else {
        // Stop if we don't have any supported filetypes left.
        if (cryFileTypes.length === 0) {
            return
        }

        // Try to load the first filetype in the list.
        const filetype = cryFileTypes.shift()
        const audioCry = new Audio('static/sounds/cries/' + pokemonId + '.' + filetype)

        audioCry.play().catch(function (err) {
            // Try a different filetype.
            if (err) {
                console.log('Sound filetype %s for Pokémon %s is missing.', filetype, pokemonId)

                // If there's more left, try something else.
                playPokemonSound(pokemonId, cryFileTypes)
            }
        })
    }
}

function sendPokemonNotification(pokemon) {
    playPokemonSound(pokemon.pokemon_id, cryFileTypes)

    if (settings.showBrowserPopups) {
        var notifTitle = getPokemonNameWithForm(pokemon.pokemon_id, pokemon.form)
        var notifText = ''

        const expireTime = timestampToTime(pokemon.disappear_time)
        const timeUntil = getTimeUntil(pokemon.disappear_time)
        let expireTimeCountdown = timeUntil.hour > 0 ? timeUntil.hour + 'h' : ''
        expireTimeCountdown += `${lpad(timeUntil.min, 2, 0)}m${lpad(timeUntil.sec, 2, 0)}s`

        notifText = `${i18n('Disappears at')} ${expireTime} (${expireTimeCountdown})`

        if (settings.showPokemonValues && pokemon.individual_attack != null) {
            const ivsPercentage = getIvsPercentage(pokemon.individual_attack, pokemon.individual_defense, pokemon.individual_stamina)
            notifTitle += ` ${ivsPercentage}% (${pokemon.individual_attack}/${pokemon.individual_defense}/${pokemon.individual_stamina}) L${getPokemonLevel(pokemon.cp_multiplier)}`
            const move1 = getMoveName(pokemon.move_1)
            const move2 = getMoveName(pokemon.move_2)
            notifText += `\n${i18n('Moves')}: ${move1} / ${move2}`
        }

        sendNotification(notifTitle, notifText, getPokemonRawIconUrl(pokemon, serverSettings.generateImages), pokemon.latitude, pokemon.longitude)
    }

    var notificationData = {}
    notificationData.disappear_time = pokemon.disappear_time
    notificationData.individual_attack = pokemon.individual_attack
    notificationData.individual_defense = pokemon.individual_defense
    notificationData.individual_stamina = pokemon.individual_stamina
    notificationData.cp_multiplier = pokemon.cp_multiplier
    notifiedPokemonData[pokemon.encounter_id] = notificationData
}
