/*
globals $pokestopNameFilter, addListeners, autoPanPopup, getTimeUntil,
invadedPokestopIds, lpad, luredPokestopIds, lureTypes, mapData,
notifiedPokestopData, pokestopInvasionZIndex,
pokestopLureZIndex, pokestopNotifiedZIndex, pokestopQuestZIndex,
pokestopZIndex, removeMarker, removeRangeCircle, sendNotification, settings,
setupRangeCircle, updateLabelDiffTime, updateRangeCircle, updateMarkerLayer,
filterManagers, updateMap
*/
/* exported processPokestop, setQuestFormFilter */

function isPokestopMeetsQuestFilters(pokestop) {
    if (!settings.showQuests || !pokestop.quest) {
        return false
    }

    if (settings.filterQuests) {
        switch (pokestop.quest.reward_type) {
            case 1: {
                const id = '9_' + pokestop.quest.stardust
                return !settings.excludedQuestItems.has(id)
            }
            case 2: {
                const id = pokestop.quest.item_id + '_' + pokestop.quest.item_amount
                return !settings.excludedQuestItems.has(id)
            }
            case 3: {
                const id = '99_' + pokestop.quest.stardust
                return !settings.excludedQuestItems.has(id)
            }
            case 4: {
                const id = '8_' + pokestop.quest.item_amount
                return !settings.excludedQuestItems.has(id)
			}
            case 7: {
                return !settings.excludedQuestPokemon.has(pokestop.quest.pokemon_id) &&
                (settings.questFormFilter === 'Any' || settings.questFormFilter === getFormName(pokestop.quest.pokemon_id, pokestop.quest.form_id))
            }
            case 12: {
                const id = '7_' + pokestop.quest.item_amount
                return !settings.excludedQuestItems.has(id)
            }
        }
    }

    return true
}

function isPokestopMeetsInvasionFilters(pokestop) {
    if (!settings.showInvasions || !isInvadedPokestop(pokestop)) {
        return false
    }

    if (settings.filterInvasions) {
        return !settings.excludedInvasions.has(pokestop.incident_grunt_type)
    }

    return true
}

function isPokestopMeetsLureFilters(pokestop) {
    return serverSettings.lures && isLuredPokestop(pokestop) && settings.includedLureTypes.includes(pokestop.active_fort_modifier)
}

function isPokestopMeetsFilters(pokestop) {
    if (!settings.showPokestops) {
        return false
    }

    if ($pokestopNameFilter) {
        if (pokestop.name) {
            const regex = new RegExp($pokestopNameFilter, 'gi')
            if (!pokestop.name.match(regex)) {
                return false
            }
        } else {
            return false
        }
    }

    return settings.showPokestopsNoEvent || isPokestopMeetsQuestFilters(pokestop) ||
        isPokestopMeetsInvasionFilters(pokestop) || isPokestopMeetsLureFilters(pokestop)
}

function isPokestopRangesActive() {
    return settings.showRanges && settings.includedRangeTypes.includes(3)
}

function setupPokestopMarker(pokestop, isNotifPokestop) {
    const marker = L.marker([pokestop.latitude, pokestop.longitude])

    marker.setBouncingOptions({
        bounceHeight: 20,
        bounceSpeed: 80,
        elastic: false,
        shadowAngle: Math.PI * 1.5
    })

    marker.pokestop_id = pokestop.pokestop_id
    updatePokestopMarker(pokestop, marker, isNotifPokestop)
    marker.bindPopup('', { autoPan: autoPanPopup() })
    addListeners(marker, 'pokestop')

    return marker
}

function updatePokestopMarker(pokestop, marker, isNotifPokestop) {
    let shadowImage = null
    let shadowSize = null
    let shadowAnchor = null
    const upscaleModifier = isNotifPokestop && settings.upscaleNotifMarkers ? 1.3 : 1

    if (isPokestopMeetsQuestFilters(pokestop)) {
        const quest = pokestop.quest
        shadowAnchor = [30, 30]
        switch (quest.reward_type) {
            case 1:
                shadowImage = getItemImageUrl(9)
                shadowSize = [30, 30]
                break
            case 2:
                shadowImage = getItemImageUrl(quest.item_id)
                shadowSize = [30, 30]
                break
            case 3:
                shadowImage = getItemImageUrl(99)
                shadowSize = [30, 30]
                break
            case 4:
                shadowImage = getItemImageUrl(8)
                shadowSize = [30, 30]
                break
            case 7:
                shadowImage = getPokemonMapIconUrl({ pokemon_id: quest.pokemon_id, form: quest.form_id, costume: quest.costume_id }, serverSettings.generateImages)
                shadowSize = [35, 35]
                break
            case 12:
                shadowImage = getItemImageUrl(7)
                shadowSize = [30, 30]
        }
    }

    const icon = L.contentIcon({
        iconUrl: getPokestopIconUrlFiltered(pokestop),
        iconSize: [32 * upscaleModifier, 32 * upscaleModifier],
        iconAnchor: [16 * upscaleModifier, 32 * upscaleModifier],
        popupAnchor: [0, -16 * upscaleModifier],
        shadowUrl: shadowImage,
        shadowSize: shadowSize,
        shadowAnchor: shadowAnchor
    })
    marker.setIcon(icon)

    if (isNotifPokestop) {
        marker.setZIndexOffset(pokestopNotifiedZIndex)
    } else if (isInvadedPokestop(pokestop)) {
        marker.setZIndexOffset(pokestopInvasionZIndex)
    } else if (isLuredPokestop(pokestop)) {
        marker.setZIndexOffset(pokestopLureZIndex)
    } else if (shadowImage !== null) {
        marker.setZIndexOffset(pokestopQuestZIndex)
    } else {
        marker.setZIndexOffset(pokestopZIndex)
    }

    updateMarkerLayer(marker, isNotifPokestop, notifiedPokestopData[pokestop.pokestop_id])

    return marker
}

function toggleInvasionPokemon() { // eslint-disable-line no-unused-vars
    settings.showInvasionPokemon = !settings.showInvasionPokemon
    updatePokestops()
    Store.set('showInvasionPokemon', settings.showInvasionPokemon)
}

function pokestopLabel(pokestop) {
    const pokestopName = pokestop.name != null && pokestop.name !== '' ? pokestop.name : 'PokéStop'
    var imageUrl = ''
    var imageClass = ''
    var imageOnclick = ''
    var lureDisplay = ''
    var lureClass = ''
    var invasionDisplay = ''
    var questDisplay = ''

    if (pokestop.image != null && pokestop.image !== '') {
        imageUrl = pokestop.image.replace(/^http:\/\//i, '//')
        imageOnclick = `onclick='showImageModal("${imageUrl}", "${pokestopName.replace(/"/g, '\\&quot;').replace(/'/g, '\\&#39;')}")'`
        imageClass = 'pokestop-image'
    } else {
        imageUrl = getPokestopIconUrlFiltered(pokestop)
        imageClass = 'pokestop-icon'
    }

    if (isPokestopMeetsQuestFilters(pokestop)) {
        const quest = pokestop.quest
        let rewardImageUrl
        let rewardText
        let isNotifQuest
        let notifFunction
        let excludeFunction
        let infoButtonDisplay = ''

        switch (quest.reward_type) {
            case 1:
                rewardImageUrl = getItemImageUrl(9)
                rewardText = quest.stardust + ' ' + getItemName(9)
                excludeFunction = `excludeQuestItem(9,${quest.stardust})`
                notifFunction = `toggleQuestItemNotif(9,${quest.stardust})`
                isNotifQuest = settings.notifQuestItems.has('9_' + quest.stardust)
                break
            case 2:
                rewardImageUrl = getItemImageUrl(quest.item_id)
                rewardText = quest.item_amount + ' ' + getItemName(quest.item_id)
                excludeFunction = `excludeQuestItem(${quest.item_id},${quest.item_amount})`
                notifFunction = `toggleQuestItemNotif(${quest.item_id},${quest.item_amount})`
                isNotifQuest = settings.notifQuestItems.has(quest.item_id + '_' + quest.item_amount)
                break
            case 3:
                rewardImageUrl = getItemImageUrl(99)
                rewardText = quest.stardust + ' ' + getItemName(99)
                excludeFunction = `excludeQuestItem(99,${quest.stardust})`
                notifFunction = `toggleQuestItemNotif(99,${quest.stardust})`
                isNotifQuest = settings.notifQuestItems.has('99_' + quest.stardust)
                break
            case 4:
                rewardImageUrl = getItemImageUrl(8)
                rewardText = `${quest.item_amount} ${getPokemonName(quest.pokemon_id)} ${getItemName(8)}`
                excludeFunction = `excludeQuestItem(8,${quest.item_amount})`
                notifFunction = `toggleQuestItemNotif(8,${quest.item_amount})`
                isNotifQuest = settings.notifQuestItems.has('8_' + quest.item_amount)
                break
            case 7:
                rewardImageUrl = getPokemonRawIconUrl({ pokemon_id: quest.pokemon_id, form: quest.form_id, costume: quest.costume_id }, serverSettings.generateImages)
                rewardText = `${getPokemonNameWithForm(quest.pokemon_id, quest.form_id)} #${quest.pokemon_id}`
                excludeFunction = `excludeQuestPokemon(${quest.pokemon_id})`
                notifFunction = `toggleQuestPokemonNotif(${quest.pokemon_id})`
                infoButtonDisplay = `<a href='https://pokemongo.gamepress.gg/pokemon/${quest.pokemon_id}' class='link-button' target='_blank' title='${i18n('View on GamePress')}'><i class="fas fa-info-circle"></i></a>`
                isNotifQuest = settings.notifQuestPokemon.has(quest.pokemon_id)
                break
            case 12:
                rewardImageUrl = getItemImageUrl(7)
                rewardText = `${quest.item_amount} ${getPokemonName(quest.pokemon_id)} ${getItemName(7)}`
                excludeFunction = `excludeQuestItem(7,${quest.item_amount})`
                notifFunction = `toggleQuestItemNotif(7,${quest.item_amount})`
                isNotifQuest = settings.notifQuestItems.has('7_' + quest.item_amount)
        }

        const notifText = isNotifQuest ? i18n('Don\'t notify') : i18n('Notify')
        const notifIconClass = isNotifQuest ? 'fas fa-bell-slash' : 'fas fa-bell'

        questDisplay = `
            <div class='section-divider'></div>
            <div class='pokestop-container'>
              <div class='pokestop-container-left'>
                <div>
                  <img class='quest-image' src="${rewardImageUrl}" width='64'/>
                </div>
              </div>
              <div class='pokestop-container-right'>
                <div class='title'>
                  ${i18n('Quest')}
                </div>
                <div class='info-container'>
                  <div>
                    ${i18n('Task')}: <strong>${quest.task}</strong>
                  </div>
                  <div>
                    ${i18n('Reward')}: <strong>${rewardText}</strong>
                  </div>
                  <div>
                    ${i18n('Scanned')}: <strong>${timestampToDateTime(quest.scanned_at)}</strong>
                  </div>
                </div>
                <div>
                  <a href='javascript:${notifFunction}' class='link-button' title="${notifText}"><i class="${notifIconClass}"></i></a>
                  <a href='javascript:${excludeFunction}' class='link-button' title=${i18n('Hide')}><i class="fas fa-eye-slash"></i></a>
                  <a href='javascript:removePokestopMarker("${pokestop.pokestop_id}")' class='link-button' title=${i18n('Remove')}><i class="fas fa-trash"></i></a>
                  ${infoButtonDisplay}
                </div>
              </div>
            </div>`
    }

    if (isPokestopMeetsInvasionFilters(pokestop)) {
        const invasionId = pokestop.incident_grunt_type
        const invasionExpireTime = pokestop.incident_expiration
        const grunt = getInvasionGrunt(invasionId)
        const invasionType = getInvasionType(invasionId)
        const pokemon = getInvasionPokemon(invasionId)
        const isNotifInvasion = settings.notifInvasions.has(invasionId)
        const notifText = isNotifInvasion ? i18n('Don\'t notify') : i18n('Notify')
        const notifIconClass = isNotifInvasion ? 'fas fa-bell-slash' : 'fas fa-bell'
        let typeDisplay = ''
        let pokemonDisplay = ''

        if (invasionType) {
            typeDisplay = `
                <div>
                  Type: <strong>${invasionType}</strong>
                </div>`
        }

        if (pokemon) {
            const ballDisplay = `<img src='${getItemImageUrl(5)}' width='18' height='18'/>`
            if (settings.showInvasionPokemon) {
                pokemonDisplay = `<div class="invasion-pokemon-toggle" onclick="toggleInvasionPokemon()">${i18n('Hide Pokémon')} <i class="fas fa-chevron-up"></i></div><div class="invasion-pokemon-container">`
            } else {
                pokemonDisplay = `<div class="invasion-pokemon-toggle" onclick="toggleInvasionPokemon()">${i18n('Show Pokémon')} <i class="fas fa-chevron-down"></i></div><div class="invasion-pokemon-container" style="display:none;">`
            }

            for (let i = 1; i < 4; i++) {
                const header = pokemon[i.toString()].isReward ? `<div class='invasion-pokemon-ball-header'>#${i.toString() + ballDisplay}</div>` : `<div>#${i.toString()}</div>`
                pokemonDisplay += '<div class="invasion-pokemon-column">' + header
                for (let j = 0; j < pokemon[i.toString()].ids.length; j++) {
                    const id = pokemon[i.toString()].ids[j]
                    pokemonDisplay += `<div><img title='${getPokemonName(id)}' src='${getPokemonRawIconUrl({ pokemon_id: id }, serverSettings.generateImages)}' width='48'/></div>`
                }
                pokemonDisplay += '</div>'
            }

            pokemonDisplay += '</div>'
        }

        invasionDisplay = `
            <div class='section-divider'></div>
            <div class='pokestop-container'>
              <div class='pokestop-container-left'>
                <div>
                  <img class='invasion-image' src="static/images/invasion/${invasionId}.png" width='64'/>
                </div>
              </div>
              <div class='pokestop-container-right'>
                <div class='title invasion'>
                  <div>
                    ${i18n('Team GO Rocket Invasion')}
                  </div>
                </div>
                <div class='disappear'>
                  ${timestampToTime(invasionExpireTime)} (<span class='label-countdown' disappears-at='${invasionExpireTime}'>00m00s</span>)
                </div>
                <div class='info-container'>
                  ${typeDisplay}
                  <div>
                    ${i18n('Grunt')}: <strong>${grunt}</strong>
                  </div>
                  ${pokemonDisplay}
                </div>
                <div>
                  <a href='javascript:toggleInvasionNotif(${invasionId})' class='link-button' title="${notifText}"><i class="${notifIconClass}"></i></a>
                  <a href='javascript:excludeInvasion(${invasionId})' class='link-button' title=${i18n('Hide')}><i class="fas fa-eye-slash"></i></a>
                  <a href='javascript:removePokestopMarker("${pokestop.pokestop_id}")' class='link-button' title=${i18n('Remove')}><i class="fas fa-trash"></i></a>
                </div>
              </div>
            </div>`
    }

    if (isPokestopMeetsLureFilters(pokestop)) {
        const lureExpireTime = pokestop.lure_expiration
        lureClass = 'lure-' + lureTypes[pokestop.active_fort_modifier].toLowerCase()
        lureDisplay = `
            <div class='lure-container ${lureClass}'>
              <div class='title'>
                ${i18n(lureTypes[pokestop.active_fort_modifier] + ' Lure')}
              </div>
              <div class='disappear'>
                ${timestampToTime(lureExpireTime)} (<span class='label-countdown' disappears-at='${lureExpireTime}'>00m00s</span>)
              </div>
            </div>`
    } else {
        lureClass = 'no-lure'
    }

    return `
        <div>
          <div class='pokestop-container'>
            <div class='pokestop-container-left'>
              <div>
                <img class='${imageClass} ${lureClass}' src='${imageUrl}' ${imageOnclick} width='64' height='64'>
              </div>
            </div>
            <div class='pokestop-container-right'>
              <div class='title'>
                ${pokestopName}
              </div>
              ${lureDisplay}
              <div>
                ${i18n('Last scanned')}: <strong>${timestampToDateTime(pokestop.last_updated)}</strong>
              </div>
              <div>
                <a href='javascript:void(0);' onclick='javascript:openMapDirections(${pokestop.latitude},${pokestop.longitude},"${settings.mapServiceProvider}");' title='${i18n('Open in')} ${mapServiceProviderNames[settings.mapServiceProvider]}'><i class="fas fa-map-marked-alt"></i> ${pokestop.latitude.toFixed(5)}, ${pokestop.longitude.toFixed(5)}</a>
              </div>
            </div>
          </div>
          ${questDisplay}
          ${invasionDisplay}
        </div>`
}

function updatePokestopLabel(pokestop, marker) {
    marker.getPopup().setContent(pokestopLabel(pokestop))
    const now = Date.now()
    if (marker.isPopupOpen() && ((pokestop.lure_expiration && pokestop.lure_expiration > now) ||
            (pokestop.incident_expiration && pokestop.incident_expiration > now))) {
        // Update countdown time to prevent a countdown time of 0.
        updateLabelDiffTime()
    }
}

function processPokestop(pokestop) {
    if (!settings.showPokestops) {
        return false
    }

    const id = pokestop.pokestop_id
    if (!(id in mapData.pokestops)) {
        if (!isPokestopMeetsFilters(pokestop)) {
            return true
        }

        const { questNotif, invasionNotif, lureNotif, newNotif } = getPokestopNotificationInfo(pokestop)
        const isNotifPokestop = questNotif || invasionNotif || lureNotif
        if (newNotif) {
            sendPokestopNotification(pokestop, questNotif, invasionNotif, lureNotif)
        }

        pokestop.marker = setupPokestopMarker(pokestop, isNotifPokestop)
        if (isPokestopRangesActive()) {
            pokestop.rangeCircle = setupRangeCircle(pokestop, 'pokestop', !isNotifPokestop)
        }
        pokestop.updated = true
        mapData.pokestops[id] = pokestop

        if (isInvadedPokestop(pokestop)) {
            invadedPokestopIds.add(id)
        }
        if (isLuredPokestop(pokestop)) {
            luredPokestopIds.add(id)
        }
    } else {
        updatePokestop(id, pokestop)
    }

    return true
}

function updatePokestop(id, pokestop = null) {
    if (id == null || !(id in mapData.pokestops)) {
        return true
    }

    const isPokestopNull = pokestop === null
    if (isPokestopNull) {
        pokestop = mapData.pokestops[id]
    }

    if (!isPokestopMeetsFilters(pokestop)) {
        removePokestop(pokestop)
        return true
    }

    if (!isPokestopNull) {
        const oldPokestop = mapData.pokestops[id]
        const newInvasion = !isInvadedPokestop(oldPokestop) && isInvadedPokestop(pokestop)
        const newLure = !isLuredPokestop(oldPokestop) && isLuredPokestop(pokestop)
        const questChange = JSON.stringify(oldPokestop.quest) !== JSON.stringify(pokestop.quest)
        if (newInvasion || newLure || questChange) {
            const { questNotif, invasionNotif, lureNotif, newNotif } = getPokestopNotificationInfo(pokestop)
            const isNotifPokestop = questNotif || invasionNotif || lureNotif
            if (newNotif) {
                sendPokestopNotification(pokestop, questNotif, invasionNotif, lureNotif)
            }
            pokestop.marker = updatePokestopMarker(pokestop, oldPokestop.marker, isNotifPokestop)
            if (oldPokestop.rangeCircle) {
                pokestop.rangeCircle = updateRangeCircle(mapData.pokestops[id], 'pokestop', !isNotifPokestop)
            }
        } else {
            pokestop.marker = oldPokestop.marker
            if (oldPokestop.rangeCircle) {
                pokestop.rangeCircle = oldPokestop.rangeCircle
            }
        }

        if (pokestop.marker.isPopupOpen()) {
            updatePokestopLabel(pokestop, pokestop.marker)
        } else {
            // Make sure label is updated next time it's opened.
            pokestop.updated = true
        }

        mapData.pokestops[id] = pokestop

        if (isInvadedPokestop(pokestop)) {
            invadedPokestopIds.add(id)
        }
        if (isLuredPokestop(pokestop)) {
            luredPokestopIds.add(id)
        }
    } else {
        const { questNotif, invasionNotif, lureNotif, newNotif } = getPokestopNotificationInfo(pokestop)
        const isNotifPokestop = questNotif || invasionNotif || lureNotif
        if (newNotif) {
            sendPokestopNotification(pokestop, questNotif, invasionNotif, lureNotif)
        }

        updatePokestopMarker(pokestop, mapData.pokestops[id].marker, isNotifPokestop)
        if (pokestop.marker.isPopupOpen()) {
            updatePokestopLabel(pokestop, mapData.pokestops[id].marker)
        } else {
            // Make sure label is updated next time it's opened.
            mapData.pokestops[id].updated = true
        }
        if (isPokestopRangesActive() && !pokestop.rangeCircle) {
            mapData.pokestops[id].rangeCircle = setupRangeCircle(pokestop, 'pokestop', !isNotifPokestop)
        } else {
            updateRangeCircle(mapData.pokestops[id], 'pokestop', !isNotifPokestop)
        }
    }

    return true
}

function updatePokestops() {
    $.each(mapData.pokestops, function (id, pokestop) {
        updatePokestop(id)
    })
}

function removePokestop(pokestop) {
    const id = pokestop.pokestop_id
    if (id in mapData.pokestops) {
        if (mapData.pokestops[id].rangeCircle) {
            removeRangeCircle(mapData.pokestops[id].rangeCircle)
        }
        removeMarker(mapData.pokestops[id].marker)
        delete mapData.pokestops[id]

        if (invadedPokestopIds.has(id)) {
            invadedPokestopIds.delete(id)
        }
        if (luredPokestopIds.has(id)) {
            luredPokestopIds.delete(id)
        }
    }
}

function setQuestFormFilter(name) {
    settings.questFormFilter = name
    updatePokestops()
    updateMap({ loadAllPokestops: true })
}

function removePokestopMarker(id) { // eslint-disable-line no-unused-vars
    removeMarker(mapData.pokestops[id].marker)
}

function excludeQuestPokemon(id) { // eslint-disable-line no-unused-vars
    if (filterManagers.excludedQuestPokemon !== null) {
        filterManagers.excludedQuestPokemon.add([id])
        $('#filter-quests-switch').prop('checked', true).trigger('change')
    }
}

function excludeQuestItem(id, bundle) { // eslint-disable-line no-unused-vars
    if (filterManagers.excludedQuestItems !== null) {
        filterManagers.excludedQuestItems.add([id + '_' + bundle])
        $('#filter-quests-switch').prop('checked', true).trigger('change')
    }
}

function excludeInvasion(id) { // eslint-disable-line no-unused-vars
    if (filterManagers.excludedInvasions !== null) {
        filterManagers.excludedInvasions.add([id])
        $('#filter-invasions-switch').prop('checked', true).trigger('change')
    }
}

function toggleQuestPokemonNotif(id) { // eslint-disable-line no-unused-vars
    if (filterManagers.notifQuestPokemon !== null) {
        filterManagers.notifQuestPokemon.toggle(id)
    }
}

function toggleQuestItemNotif(id, bundle) { // eslint-disable-line no-unused-vars
    if (filterManagers.notifQuestItems !== null) {
        filterManagers.notifQuestItems.toggle(id + '_' + bundle)
    }
}

function toggleInvasionNotif(id) { // eslint-disable-line no-unused-vars
    if (filterManagers.notifInvasions !== null) {
        filterManagers.notifInvasions.toggle(id)
    }
}

function getPokestopIconUrlFiltered(pokestop) {
    var imageName = 'stop'
    if (isPokestopMeetsQuestFilters(pokestop)) {
        imageName += '_q'
    }
    if (isPokestopMeetsInvasionFilters(pokestop)) {
        imageName += '_i_' + pokestop.incident_grunt_type
    }
    if (isPokestopMeetsLureFilters(pokestop)) {
        imageName += '_l_' + pokestop.active_fort_modifier
    }

    return 'static/images/pokestop/' + imageName + '.png'
}

function getPokestopNotificationInfo(pokestop) {
    let questNotif = false
    let invasionNotif = false
    let lureNotif = false
    let newNotif = false
    if (settings.pokestopNotifs) {
        const id = pokestop.pokestop_id
        if (settings.questNotifs && isPokestopMeetsQuestFilters(pokestop)) {
            switch (pokestop.quest.reward_type) {
                case 1: {
                    const itemId = '9_' + pokestop.quest.stardust
                    if (settings.notifQuestItems.has(itemId)) {
                        questNotif = true
                    }
                    break
                }
                case 2: {
                    const itemId = pokestop.quest.item_id + '_' + pokestop.quest.item_amount
                    if (settings.notifQuestItems.has(itemId)) {
                        questNotif = true
                    }
                    break
                }
                case 3: {
                    const itemId = '6_' + pokestop.quest.stardust
                    if (settings.notifQuestItems.has(itemId)) {
                        questNotif = true
                    }
                    break
                }
                case 4:
                    const itemId = '8_' + pokestop.quest.item_amount
                    if (settings.notifQuestItems.has(itemId)) {
                        questNotif = true
                    }
                case 7: {
                    if (settings.notifQuestPokemon.has(pokestop.quest.pokemon_id)) {
                        questNotif = true
                    }
                    break
                }
                case 12: {
                    const itemId = '7_' + pokestop.quest.item_amount
                    if (settings.notifQuestItems.has(itemId)) {
                        questNotif = true
                    }
                }
            }
        }

        if (settings.invasionNotifs && isPokestopMeetsInvasionFilters(pokestop) &&
                settings.notifInvasions.has(pokestop.incident_grunt_type)) {
            invasionNotif = true
        }

        if (isPokestopMeetsLureFilters(pokestop)) {
            if (settings.notifLureTypes.includes(pokestop.active_fort_modifier)) {
                lureNotif = true
            }
        }

        newNotif = !(id in notifiedPokestopData) ||
            (questNotif && (!notifiedPokestopData[id].questNotif || pokestop.quest.scanned_at > notifiedPokestopData[id].questScannedAt)) ||
            (invasionNotif && (!notifiedPokestopData[id].invasionNotif || pokestop.incident_expiration > notifiedPokestopData[id].invasionEnd)) ||
            (lureNotif && (!notifiedPokestopData[id].lureNotif || pokestop.lure_expiration > notifiedPokestopData[id].lureEnd))
    }

    return {
        questNotif: questNotif,
        invasionNotif: invasionNotif,
        lureNotif: lureNotif,
        newNotif: newNotif
    }
}

function sendPokestopNotification(pokestop, questNotif, invasionNotif, lureNotif) {
    if (!(questNotif || invasionNotif || lureNotif)) {
        return
    }

    if (settings.playSound) {
        ding.play()
    }

    if (settings.showBrowserPopups) {
        const pokestopName = pokestop.name !== null && pokestop.name !== '' ? pokestop.name : 'unknown'
        let notifTitle = ''
        let notifText = i18n('PokéStop') + ': ' + pokestopName
        if (questNotif) {
            switch (pokestop.quest.reward_type) {
                case 1:
                    notifTitle += `${i18n('Quest')}: ${pokestop.quest.stardust} ${getItemName(9)}`
                    break
                case 2:
                    notifTitle += `${i18n('Quest')}: ${pokestop.quest.item_amount} ${getItemName(pokestop.quest.item_id)}(s)`
                    break
                case 3:
                    notifTitle += `${i18n('Quest')}: ${pokestop.quest.stardust} ${getItemName(99)}`
                    break
                case 7:
                    notifTitle += `${i18n('Quest')}: ${getPokemonNameWithForm(pokestop.quest.pokemon_id, pokestop.quest.form_id)}`
                    break
                case 12:
                    notifTitle += `${i18n('Quest')}: ${pokestop.quest.item_amount} ${getPokemonName(pokestop.quest.pokemon_id)} ${getItemName(7)}`
            }
            notifText += `\n${i18n('Quest task')}: ${pokestop.quest.task}`
        }
        if (invasionNotif) {
            const expireTime = timestampToTime(pokestop.incident_expiration)
            const timeUntil = getTimeUntil(pokestop.incident_expiration)
            let expireTimeCountdown = timeUntil.hour > 0 ? timeUntil.hour + 'h' : ''
            expireTimeCountdown += `${lpad(timeUntil.min, 2, 0)}m${lpad(timeUntil.sec, 2, 0)}s`

            if (questNotif) {
                notifTitle += ' & '
            }
            notifTitle += `${i18n('Invasion')}: ${getInvasionType(pokestop.incident_grunt_type)} (${getInvasionGrunt(pokestop.incident_grunt_type)})`
            notifText += `\n${i18n('Invasion ends at')} ${expireTime} (${expireTimeCountdown})`
        }
        if (lureNotif) {
            const expireTime = timestampToTime(pokestop.lure_expiration)
            const timeUntil = getTimeUntil(pokestop.lure_expiration)
            let expireTimeCountdown = timeUntil.hour > 0 ? timeUntil.hour + 'h' : ''
            expireTimeCountdown += `${lpad(timeUntil.min, 2, 0)}m${lpad(timeUntil.sec, 2, 0)}s`

            if (questNotif || invasionNotif) {
                notifTitle += ' & '
            }
            notifTitle += i18n(lureTypes[pokestop.active_fort_modifier] + ' Lure')
            notifText += `\n${i18n('Lure ends at')} ${expireTime} (${expireTimeCountdown})`
        }

        sendNotification(notifTitle, notifText, getPokestopIconUrlFiltered(pokestop), pokestop.latitude, pokestop.longitude)
    }

    const notificationData = {}
    if (questNotif) {
        notificationData.questNotif = true
        notificationData.questScannedAt = pokestop.quest.scanned_at
    }
    if (invasionNotif) {
        notificationData.invasionNotif = true
        notificationData.invasionEnd = pokestop.incident_expiration
    }
    if (lureNotif) {
        notificationData.lureNotif = true
        notificationData.lureEnd = pokestop.lure_expiration
    }
    notifiedPokestopData[pokestop.pokestop_id] = notificationData
}
