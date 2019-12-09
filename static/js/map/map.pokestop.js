function isPokestopMeetsQuestFilters(pokestop) {
    if (settings.showQuests && pokestop.quest) {
        switch (pokestop.quest.reward_type) {
            case 2:
                var id = pokestop.quest.item_id + '_' + pokestop.quest.item_amount
                return !settings.excludedQuestItems.includes(id)
            case 3:
                var id = 6 + '_' + pokestop.quest.stardust
                return !settings.excludedQuestItems.includes(id)
            case 7:
                return !settings.excludedQuestPokemon.includes(pokestop.quest.pokemon_id)
        }
    }

    return false
}

function isPokestopMeetsInvasionFilters(pokestop) {
    return settings.showInvasions && isInvadedPokestop(pokestop) && !settings.excludedInvasions.includes(pokestop.incident_grunt_type)
}

function isPokestopMeetsLureFilters(pokestop) {
    return settings.showLures && isLuredPokestop(pokestop) && settings.includedLureTypes.includes(pokestop.active_fort_modifier)
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

function setupPokestopMarker(pokestop, isNotifyPokestop) {
    var marker = L.marker([pokestop.latitude, pokestop.longitude])
    if (isNotifyPokestop) {
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
    updatePokestopMarker(pokestop, marker, isNotifyPokestop)
    marker.bindPopup()
    addListeners(marker, 'pokestop')

    return marker
}

function updatePokestopMarker(pokestop, marker, isNotifyPokestop) {
    var shadowImage = null
    var shadowSize = null
    var shadowAnchor = null
    const upscaleModifier = Store.get('upscalePokestops') && isNotifyPokestop ? 1.3 : 1

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
                if (generateImages) {
                    shadowImage = `pkm_img?pkm=${quest.pokemon_id}`
                    shadowSize = [35, 35]
                } else {
                    shadowImage = pokemonSprites(quest.pokemon_id).filename
                    shadowSize = [40, 40]
                }
                break
        }
    }

    var PokestopIcon = new L.icon({ // eslint-disable-line new-cap
        iconUrl: getPokestopIconUrlFiltered(pokestop),
        iconSize: [32 * upscaleModifier, 32 * upscaleModifier],
        iconAnchor: [16 * upscaleModifier, 32 * upscaleModifier],
        popupAnchor: [0, -16 * upscaleModifier],
        shadowUrl: shadowImage,
        shadowSize: shadowSize,
        shadowAnchor: shadowAnchor
    })
    marker.setIcon(PokestopIcon)

    if (isNotifyPokestop) {
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


    if (Store.get('bouncePokestops') && isNotifyPokestop && !notifiedPokestopData[pokestop.pokestop_id].animationDisabled && !marker.isBouncing()) {
        marker.bounce()
    } else if (marker.isBouncing() && (!Store.get('bouncePokestops') || !isNotifyPokestop)) {
        marker.stopBouncing()
    }

    if (isNotifyPokestop && markers.hasLayer(marker)) {
        // Marker in wrong layer, move to other layer.
        markers.removeLayer(marker)
        markersNoCluster.addLayer(marker)
    } else if (!isNotifyPokestop && markersNoCluster.hasLayer(marker)) {
        // Marker in wrong layer, move to other layer.
        markersNoCluster.removeLayer(marker)
        markers.addLayer(marker)
    }

    return marker
}

function pokestopLabel(pokestop) {
    const pokestopName = pokestop.name != null && pokestop.name != '' ? pokestop.name : 'PokéStop'
    const mapLabel = Store.get('mapServiceProvider') === 'googlemaps' ? 'Google' : 'Apple'
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
        let rewardImageUrl = ''
        let rewardText = ''

        switch (quest.reward_type) {
            case 2:
                rewardImageUrl = getItemImageUrl(quest.item_id)
                rewardText = quest.item_amount + ' ' + getItemName(quest.item_id)
                break
            case 3:
                rewardImageUrl = getItemImageUrl(6)
                rewardText = quest.stardust + ' ' + getItemName(6)
                break
            case 7:
                rewardImageUrl = getPokemonRawIconUrl(quest)
                rewardText = `${getPokemonName(quest.pokemon_id)} <a href='https://pokemongo.gamepress.gg/pokemon/${quest.pokemon_id}' target='_blank' title='View on GamePress'>#${quest.pokemon_id}</a>`
                break
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
                <div>
                  Task: <strong>${quest.task}</strong>
                </div>
                <div>
                  Reward: <strong>${rewardText}</strong>
                </div>
              </div>
            </div>`
    }

    if (isPokestopMeetsInvasionFilters(pokestop)) {
        const invasionId = pokestop.incident_grunt_type
        const invasionExpireTime = pokestop.incident_expiration
        var typeDisplay = ''
        const grunt = getInvasionGrunt(invasionId)
        const invasionType = getInvasionType(invasionId)
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
                    Team Rocket Invasion
                  </div>
                </div>
                <div class='disappear'>
                  ${timestampToTime(invasionExpireTime)} (<span class='label-countdown' disappears-at='${invasionExpireTime}'>00m00s</span>)
                </div>
                ${typeDisplay}
                <div>
                  Grunt: <strong>${grunt}</strong>
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
                <a href='javascript:void(0);' onclick='javascript:openMapDirections(${pokestop.latitude},${pokestop.longitude},${Store.get('mapServiceProvider')});' title='Open in ${mapLabel} Maps'><i class="fas fa-map-marked-alt"></i> ${pokestop.latitude.toFixed(5)}, ${pokestop.longitude.toFixed(5)}</a>
              </div>
            </div>
          </div>
          ${invasionDisplay}
          ${questDisplay}
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

        const {isInvasionNotifyPokestop, isLureNotifyPokestop, isNewNotifyPokestop} = getPokestopNotificationInfo(pokestop)
        if (isNewNotifyPokestop) {
            sendPokestopNotification(pokestop, isInvasionNotifyPokestop, isLureNotifyPokestop)
        }

        pokestop.marker = setupPokestopMarker(pokestop, isInvasionNotifyPokestop || isLureNotifyPokestop)
        if (isPokestopRangesActive()) {
            pokestop.rangeCircle = setupRangeCircle(pokestop, 'pokestop', !isInvasionNotifyPokestop && !isLureNotifyPokestop)
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
            const {isInvasionNotifyPokestop, isLureNotifyPokestop, isNewNotifyPokestop} = getPokestopNotificationInfo(pokestop)
            if (isNewNotifyPokestop) {
                sendPokestopNotification(pokestop, isInvasionNotifyPokestop, isLureNotifyPokestop)
            }
            pokestop.marker = updatePokestopMarker(pokestop, oldPokestop.marker, isInvasionNotifyPokestop || isLureNotifyPokestop)
            if (oldPokestop.rangeCircle) {
                pokestop.rangeCircle = updateRangeCircle(mapData.pokestops[id], 'pokestop', !isInvasionNotifyPokestop && !isLureNotifyPokestop)
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
        const {isInvasionNotifyPokestop, isLureNotifyPokestop, isNewNotifyPokestop} = getPokestopNotificationInfo(pokestop)
        if (isNewNotifyPokestop) {
            sendPokestopNotification(pokestop, isInvasionNotifyPokestop, isLureNotifyPokestop)
        }

        updatePokestopMarker(pokestop, mapData.pokestops[id].marker, isInvasionNotifyPokestop || isLureNotifyPokestop)
        if (pokestop.marker.isPopupOpen()) {
            updatePokestopLabel(pokestop, mapData.pokestops[id].marker)
        } else {
            // Make sure label is updated next time it's opened.
            mapData.pokestops[id].updated = true
        }
        if (isPokestopRangesActive() && !pokestop.rangeCircle) {
            mapData.pokestops[id].rangeCircle = setupRangeCircle(pokestop, 'pokestop', !isInvasionNotifyPokestop && !isLureNotifyPokestop)
        } else {
            updateRangeCircle(mapData.pokestops[id], 'pokestop', !isInvasionNotifyPokestop && !isLureNotifyPokestop)
        }
    }

    return true
}

function updatePokestops() {
    $.each(mapData.pokestops, function (id, pokestop) {
        updatePokestop(id)
    })

    if ($('#stats').hasClass('visible')) {
        countMarkers(map)
    }
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
    var isInvasionNotifyPokestop = false
    var isLureNotifyPokestop = false
    var isNewNotifyPokestop = false
    if (Store.get('notifyPokestops')) {
        const id = pokestop.pokestop_id
        if (isPokestopMeetsInvasionFilters(pokestop) && notifyInvasions.includes(pokestop.incident_grunt_type)) {
            isInvasionNotifyPokestop = true
        }
        if (isPokestopMeetsLureFilters(pokestop)) {
            switch (pokestop.active_fort_modifier) {
                case ActiveFortModifierEnum.normal:
                    isLureNotifyPokestop = Store.get('notifyNormalLures')
                    break
                case ActiveFortModifierEnum.glacial:
                    isLureNotifyPokestop = Store.get('notifyGlacialLures')
                    break
                case ActiveFortModifierEnum.magnetic:
                    isLureNotifyPokestop = Store.get('notifyMagneticLures')
                    break
                case ActiveFortModifierEnum.mossy:
                    isLureNotifyPokestop = Store.get('notifyMossyLures')
                    break
            }
        }

        isNewNotifyPokestop = !notifiedPokestopData.hasOwnProperty(id) ||
            (isInvasionNotifyPokestop && (!notifiedPokestopData[id].hasSentInvasionNotification || pokestop.incident_expiration > notifiedPokestopData[id].invasionEnd)) ||
            (isLureNotifyPokestop && (!notifiedPokestopData[id].hasSentLureNotification || pokestop.lure_expiration > notifiedPokestopData[id].lureEnd))
    }

    return {
        'isInvasionNotifyPokestop': isInvasionNotifyPokestop,
        'isLureNotifyPokestop': isLureNotifyPokestop,
        'isNewNotifyPokestop': isNewNotifyPokestop
    }
}

function sendPokestopNotification(pokestop, isInvasionNotifyPokestop, isLureNotifyPokestop) {
    if (!isInvasionNotifyPokestop && !isLureNotifyPokestop) {
        return
    }

    if (Store.get('playSound')) {
        audio.play()
    }

    if (Store.get('showPopups')) {
        const pokestopName = pokestop.name !== null && pokestop.name !== '' ? pokestop.name : 'unknown'
        var notifyTitle = ''
        var notifyText = 'PokéStop: ' + pokestopName
        if (isInvasionNotifyPokestop) {
            let expireTime = timestampToTime(pokestop.incident_expiration)
            let timeUntil = getTimeUntil(pokestop.incident_expiration)
            let expireTimeCountdown = timeUntil.hour > 0 ? timeUntil.hour + 'h' : ''
            expireTimeCountdown += `${lpad(timeUntil.min, 2, 0)}m${lpad(timeUntil.sec, 2, 0)}s`

            notifyText += `\nInvasion ends at ${expireTime} (${expireTimeCountdown})`
            notifyTitle += `${getInvasionType(pokestop.incident_grunt_type)} (${getInvasionGrunt(pokestop.incident_grunt_type)}) Invasion`
        }
        if (isLureNotifyPokestop) {
            let expireTime = timestampToTime(pokestop.lure_expiration)
            let timeUntil = getTimeUntil(pokestop.lure_expiration)
            let expireTimeCountdown = timeUntil.hour > 0 ? timeUntil.hour + 'h' : ''
            expireTimeCountdown += `${lpad(timeUntil.min, 2, 0)}m${lpad(timeUntil.sec, 2, 0)}s`

            if (isInvasionNotifyPokestop) {
                notifyTitle += ' & '
            }
            notifyTitle += `${lureTypes[pokestop.active_fort_modifier]} Lure`
            notifyText += `\nLure ends at ${expireTime} (${expireTimeCountdown})`
        }

        sendNotification(notifyTitle, notifyText, getPokestopIconUrlFiltered(pokestop), pokestop.latitude, pokestop.longitude)
    }

    var notificationData = {}
    if (isInvasionNotifyPokestop) {
        notificationData.hasSentInvasionNotification = true
        notificationData.invasionEnd = pokestop.incident_expiration
    }
    if (isLureNotifyPokestop) {
        notificationData.hasSentLureNotification = true
        notificationData.lureEnd = pokestop.lure_expiration
    }
    notifiedPokestopData[pokestop.pokestop_id] = notificationData
}
