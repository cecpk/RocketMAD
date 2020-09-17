function isPokestopMeetsQuestFilters(pokestop) {
    if (!settings.showQuests || !pokestop.quest) {
        return false
    }

    if (settings.filterQuests) {
        switch (pokestop.quest.reward_type) {
            case 2: {
                let id = pokestop.quest.item_id + '_' + pokestop.quest.item_amount
                return !settings.excludedQuestItems.includes(id)
            }
            case 3: {
                let id = '6_' + pokestop.quest.stardust
                return !settings.excludedQuestItems.includes(id)
            }
            case 7: {
                return !settings.excludedQuestPokemon.has(pokestop.quest.pokemon_id)
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
        return !settings.excludedInvasions.includes(pokestop.incident_grunt_type)
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
    var marker = L.marker([pokestop.latitude, pokestop.longitude])
    if (isNotifPokestop) {
        markersNoCluster.addLayer(marker)
    } else {
        markers.addLayer(marker)
    }

    marker.setBouncingOptions({
        bounceHeight: 20,
        bounceSpeed: 80,
        elastic: false,
        shadowAngle: Math.PI * 1.5
    })

    marker.pokestop_id = pokestop.pokestop_id
    updatePokestopMarker(pokestop, marker, isNotifPokestop)
    marker.bindPopup()
    addListeners(marker, 'pokestop')

    return marker
}

function updatePokestopMarker(pokestop, marker, isNotifPokestop) {
    var shadowImage = null
    var shadowSize = null
    var shadowAnchor = null
    const upscaleModifier = isNotifPokestop && settings.upscaleNotifMarkers ? 1.3 : 1

    if (isPokestopMeetsQuestFilters(pokestop)) {
        const quest = pokestop.quest
        shadowAnchor = [30, 30]
        switch (quest.reward_type) {
            case 2:
                shadowImage = getItemImageUrl(quest.item_id)
                shadowSize = [30, 30]
                break
            case 3:
                shadowImage = getItemImageUrl(6)
                shadowSize = [30, 30]
                break
            case 7:
                if (serverSettings.generateImages) {
                    shadowImage = getPokemonMapIconUrl({pokemon_id: quest.pokemon_id, form: quest.form_id, costume: quest.costume_id})
                    shadowSize = [35, 35]
                } else {
                    shadowImage = pokemonSprites(quest.pokemon_id).filename
                    shadowSize = [40, 40]
                }
                break
        }
    }

    var icon = L.icon({ // eslint-disable-line new-cap
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

    if (isNotifPokestop && markers.hasLayer(marker)) {
        // Marker in wrong layer, move to other layer.
        markers.removeLayer(marker)
        markersNoCluster.addLayer(marker)
    } else if (!isNotifPokestop && markersNoCluster.hasLayer(marker)) {
        // Marker in wrong layer, move to other layer.
        markersNoCluster.removeLayer(marker)
        markers.addLayer(marker)
    }

    if (settings.bounceNotifMarkers && isNotifPokestop && !notifiedPokestopData[pokestop.pokestop_id].animationDisabled && !marker.isBouncing()) {
        marker.bounce()
    } else if (marker.isBouncing() && (!settings.bounceNotifMarkers || !isNotifPokestop)) {
        marker.stopBouncing()
    }

    return marker
}

function pokestopLabel(pokestop) {
    const pokestopName = pokestop.name != null && pokestop.name != '' ? pokestop.name : 'PokéStop'
    var imageUrl = ''
    var imageClass = ''
    var imageOnclick = ''
    var lureDisplay = ''
    var lureClass = ''
    var invasionDisplay = ''
    var questDisplay = ''

    if (pokestop.image != null && pokestop.image != '') {
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
            case 2:
                rewardImageUrl = getItemImageUrl(quest.item_id)
                rewardText = quest.item_amount + ' ' + getItemName(quest.item_id)
                isNotifQuest = settings.notifQuestItems.includes(quest.item_id + '_' + quest.item_amount)
                break
            case 3:
                rewardImageUrl = getItemImageUrl(6)
                rewardText = quest.stardust + ' ' + getItemName(6)
                isNotifQuest = settings.notifQuestItems.includes('6_' + quest.item_amount)
                break
            case 7: {
                rewardImageUrl = getPokemonRawIconUrl({pokemon_id: quest.pokemon_id, form: quest.form_id, costume: quest.costume_id})
                rewardText = `${getPokemonNameWithForm(quest.pokemon_id, quest.form_id)} #${quest.pokemon_id}`
                isNotifQuest = settings.notifQuestPokemon.has(quest.pokemon_id)
                break
            }
        }

        const notifText = isNotifQuest ? 'Don\'t notify' : 'Notify'
        const notifIconClass = isNotifQuest ? 'fas fa-bell-slash' : 'fas fa-bell'
        if (quest.reward_type === 7) {
            excludeFunction = `excludeQuestPokemon(${quest.pokemon_id})`
            notifFunction = `toggleQuestPokemonNotif(${quest.pokemon_id})`
            infoButtonDisplay = `<a href='https://pokemongo.gamepress.gg/pokemon/${quest.pokemon_id}' class='link-button' target='_blank' title='View on GamePress'><i class="fas fa-info-circle"></i></a>`
        } else {
            const itemId = quest.reward_type === 2 ? quest.item_id : 6
            const itemAmount = quest.reward_type === 2 ? quest.item_amount : quest.stardust
            excludeFunction = `excludeQuestItem(${itemId},${itemAmount})`
            notifFunction = `toggleQuestItemNotif(${itemId},${itemAmount})`
        }

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
                  Quest
                </div>
                <div class='info-container'>
                  <div>
                    Task: <strong>${quest.task}</strong>
                  </div>
                  <div>
                    Reward: <strong>${rewardText}</strong>
                  </div>
                  <div>
                    Scanned: <strong>${timestampToDateTime(quest.scanned_at)}</strong>
                  </div>
                </div>
                <div>
                  <a href='javascript:${notifFunction}' class='link-button' title="${notifText}"><i class="${notifIconClass}"></i></a>
                  <a href='javascript:${excludeFunction}' class='link-button' title='Hide'><i class="fas fa-eye-slash"></i></a>
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
        const isNotifInvasion = settings.notifInvasions.includes(invasionId)
        const notifText = isNotifInvasion ? 'Don\'t notify' : 'Notify'
        const notifIconClass = isNotifInvasion ? 'fas fa-bell-slash' : 'fas fa-bell'
        let typeDisplay = ''

        if (invasionType) {
            typeDisplay = `
                <div>
                  Type: <strong>${invasionType}</strong>
                </div>`
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
                    Team GO Rocket Invasion
                  </div>
                </div>
                <div class='disappear'>
                  ${timestampToTime(invasionExpireTime)} (<span class='label-countdown' disappears-at='${invasionExpireTime}'>00m00s</span>)
                </div>
                <div class='info-container'>
                  ${typeDisplay}
                  <div>
                    Grunt: <strong>${grunt}</strong>
                  </div>
                </div>
                <div>
                  <a href='javascript:toggleInvasionNotif(${invasionId})' class='link-button' title="${notifText}"><i class="${notifIconClass}"></i></a>
                  <a href='javascript:excludeInvasion(${invasionId})' class='link-button' title='Hide'><i class="fas fa-eye-slash"></i></a>
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
                ${lureTypes[pokestop.active_fort_modifier]} Lure
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
                Last scanned: <strong>${timestampToDateTime(pokestop.last_updated)}</strong>
              </div>
              <div>
                <a href='javascript:void(0);' onclick='javascript:openMapDirections(${pokestop.latitude},${pokestop.longitude},"${settings.mapServiceProvider}");' title='Open in ${mapServiceProviderNames[settings.mapServiceProvider]}'><i class="fas fa-map-marked-alt"></i> ${pokestop.latitude.toFixed(5)}, ${pokestop.longitude.toFixed(5)}</a>
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
    if (!mapData.pokestops.hasOwnProperty(id)) {
        if (!isPokestopMeetsFilters(pokestop)) {
            return true
        }

        const {questNotif, invasionNotif, lureNotif, newNotif} = getPokestopNotificationInfo(pokestop)
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
    if (id === undefined || id === null || !mapData.pokestops.hasOwnProperty(id)) {
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
            const {questNotif, invasionNotif, lureNotif, newNotif} = getPokestopNotificationInfo(pokestop)
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
        const {questNotif, invasionNotif, lureNotif, newNotif} = getPokestopNotificationInfo(pokestop)
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
    if (mapData.pokestops.hasOwnProperty(id)) {
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

function excludeQuestPokemon(id) {
    if (!settings.excludedQuestPokemon.has(id)) {
        $('label[for="exclude-quest-pokemon"] .pokemon-filter-list .filter-button[data-id="' + id + '"]').click()
    }
}

function excludeQuestItem(id, bundle) {
    if (!settings.excludedQuestItems.includes(id + '_' + bundle)) {
        $('label[for="exclude-quest-items"] .quest-item-filter-list .filter-button[data-id="' + id + '"][data-bundle="' + bundle + '"]').click()
    }
}

function excludeInvasion(id) {
    if (!settings.excludedInvasions.includes(id)) {
        $('label[for="exclude-invasions"] .invasion-filter-list .filter-button[data-id="' + id + '"]').click()
    }
}

function toggleQuestPokemonNotif(id) {
    $('label[for="no-notif-quest-pokemon"] .pokemon-filter-list .filter-button[data-id="' + id + '"]').click()
}

function toggleQuestItemNotif(id, bundle) {
    $('label[for="no-notif-quest-items"] .quest-item-filter-list .filter-button[data-id="' + id + '"][data-bundle="' + bundle + '"]').click()
}

function toggleInvasionNotif(id) {
    $('label[for="no-notif-invasions"] .invasion-filter-list .filter-button[data-id="' + id + '"]').click()
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
                case 2: {
                    let itemId = pokestop.quest.item_id + '_' + pokestop.quest.item_amount
                    if (settings.notifQuestItems.includes(itemId)) {
                        questNotif = true
                    }
                    break
                }
                case 3: {
                    let itemId = '6_' + pokestop.quest.stardust
                    if (settings.notifQuestItems.includes(itemId)) {
                        questNotif = true
                    }
                    break
                }
                case 7: {
                    if (settings.notifQuestPokemon.has(pokestop.quest.pokemon_id)) {
                        questNotif = true
                    }
                    break
                }
            }
        }

        if (settings.invasionNotifs && isPokestopMeetsInvasionFilters(pokestop) &&
                settings.notifInvasions.includes(pokestop.incident_grunt_type)) {
            invasionNotif = true
        }

        if (isPokestopMeetsLureFilters(pokestop)) {
            if (settings.notifLureTypes.includes(pokestop.active_fort_modifier)) {
                lureNotif = true
            }
        }

        newNotif = !notifiedPokestopData.hasOwnProperty(id) ||
            (questNotif && (!notifiedPokestopData[id].questNotif || pokestop.quest.scanned_at > notifiedPokestopData[id].questScannedAt)) ||
            (invasionNotif && (!notifiedPokestopData[id].invasionNotif || pokestop.incident_expiration > notifiedPokestopData[id].invasionEnd)) ||
            (lureNotif && (!notifiedPokestopData[id].lureNotif || pokestop.lure_expiration > notifiedPokestopData[id].lureEnd))
    }

    return {
        'questNotif': questNotif,
        'invasionNotif': invasionNotif,
        'lureNotif': lureNotif,
        'newNotif': newNotif
    }
}

function sendPokestopNotification(pokestop, questNotif, invasionNotif, lureNotif) {
    if (!(questNotif || invasionNotif || lureNotif)) {
        return
    }

    if (settings.playSound) {
        audio.play()
    }

    if (settings.showBrowserPopups) {
        const pokestopName = pokestop.name !== null && pokestop.name !== '' ? pokestop.name : 'unknown'
        let notifTitle = ''
        let notifText = 'PokéStop: ' + pokestopName
        if (questNotif) {
            switch (pokestop.quest.reward_type) {
                case 2:
                    notifTitle += `${pokestop.quest.item_amount} ${getItemName(pokestop.quest.item_id)}(s) Quest`
                    break
                case 3:
                    notifTitle += `${pokestop.quest.stardust} ${i8ln('Stardust')} Quest`
                    break
                case 7:
                    notifTitle += `${getPokemonNameWithForm(pokestop.quest.pokemon_id, pokestop.quest.form_id)} Quest`
                    break
            }
            notifText += `\nQuest task: ${pokestop.quest.task}`
        }
        if (invasionNotif) {
            let expireTime = timestampToTime(pokestop.incident_expiration)
            let timeUntil = getTimeUntil(pokestop.incident_expiration)
            let expireTimeCountdown = timeUntil.hour > 0 ? timeUntil.hour + 'h' : ''
            expireTimeCountdown += `${lpad(timeUntil.min, 2, 0)}m${lpad(timeUntil.sec, 2, 0)}s`

            if (questNotif) {
                notifTitle += ' & '
            }
            notifTitle += `${getInvasionType(pokestop.incident_grunt_type)} (${getInvasionGrunt(pokestop.incident_grunt_type)}) Invasion`
            notifText += `\nInvasion ends at ${expireTime} (${expireTimeCountdown})`
        }
        if (lureNotif) {
            let expireTime = timestampToTime(pokestop.lure_expiration)
            let timeUntil = getTimeUntil(pokestop.lure_expiration)
            let expireTimeCountdown = timeUntil.hour > 0 ? timeUntil.hour + 'h' : ''
            expireTimeCountdown += `${lpad(timeUntil.min, 2, 0)}m${lpad(timeUntil.sec, 2, 0)}s`

            if (questNotif || invasionNotif) {
                notifTitle += ' & '
            }
            notifTitle += `${lureTypes[pokestop.active_fort_modifier]} Lure`
            notifText += `\nLure ends at ${expireTime} (${expireTimeCountdown})`
        }

        sendNotification(notifTitle, notifText, getPokestopIconUrlFiltered(pokestop), pokestop.latitude, pokestop.longitude)
    }

    let notificationData = {}
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
