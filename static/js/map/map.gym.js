function isGymMeetsGymFilters(gym) {
    if (!settings.showGyms) {
        return false
    }

    if (showConfig.gym_filters) {
        if ($gymNameFilter) {
            const gymRegex = new RegExp($gymNameFilter, 'gi')
            if (!gym.name.match(gymRegex)) {
                return false
            }
        }

        if (!settings.includedGymTeams.includes(gym.team_id)) {
            return false
        }

        const gymLevel = getGymLevel(gym)
        if (gymLevel < settings.minGymLevel || gymLevel > settings.maxGymLevel) {
            return false
        }

        if (settings.showOpenSpotGymsOnly && gym.slots_available === 0) {
            return false
        }

        if (settings.showExGymsOnly && !gym.is_ex_raid_eligible) {
            return false
        }

        if (settings.showInBattleGymsOnly && !gym.is_in_battle) {
            return false
        }

        if (settings.gymLastScannedHours > 0 && gym.last_scanned < Date.now() - settings.gymLastScannedHours * 3600 * 1000) {
            return false
        }
    }

    return true
}

function isGymMeetsRaidFilters(gym) {
    const raid = gym.raid

    if (!settings.showRaids || !isValidRaid(raid)) {
        return false
    }

    if (showConfig.raid_filters) {
        if ($gymNameFilter) {
            const gymRegex = new RegExp($gymNameFilter, 'gi')
            if (!gym.name.match(gymRegex)) {
                return false
            }
        }

        if (isUpcomingRaid(raid)) {
            if (settings.showActiveRaidsOnly) {
                return false
            }
        } else { // Ongoing raid.
            if (raid.pokemon_id && settings.excludedRaidPokemon.includes(raid.pokemon_id)) {
                return false
            }
        }

        if (!settings.includedRaidLevels.includes(raid.level)) {
            return false
        }

        if (settings.showExEligibleRaidsOnly && !gym.is_ex_raid_eligible) {
            return false
        }
    }

    return true
}

function isGymMeetsFilters(gym) {
    return isGymMeetsGymFilters(gym) || isGymMeetsRaidFilters(gym)
}

function isGymRangesActive() {
    return settings.showRanges && settings.includedRangeTypes.includes(2)
}

function setupGymMarker(gym, isNotifyGym) {
    var marker = L.marker([gym.latitude, gym.longitude])
    if (isNotifyGym) {
        markersNoCluster.addLayer(marker)
    } else {
        markers.addLayer(marker)
    }

    marker.setBouncingOptions({
        bounceHeight: 20,
        bounceSpeed: 80,
        elastic: false,
        shadowAngle: null
    })

    marker.gym_id = gym.gym_id
    updateGymMarker(gym, marker, isNotifyGym)
    if (!settings.useGymSidebar) {
        marker.bindPopup()
    }

    if (settings.useGymSidebar) {
        marker.on('click', function () {
            var gymSidebar = document.querySelector('#gym-details')
            if (gymSidebar.getAttribute('data-id') === gym.gym_id && gymSidebar.classList.contains('visible')) {
                gymSidebar.classList.remove('visible')
            } else {
                gymSidebar.setAttribute('data-id', gym.gym_id)
                showGymDetails(gym.gym_id)
            }
        })

        if (!isMobileDevice() && !isTouchDevice()) {
            marker.on('mouseover', function () {
                marker.openPopup()
                updateLabelDiffTime()
            })
        }

        marker.on('mouseout', function () {
            marker.closePopup()
            updateLabelDiffTime()
        })
    } else {
        addListeners(marker, 'gym')
    }

    return marker
}

function updateGymMarker(gym, marker, isNotifyGym) {
    var markerImage = ''
    const upscaleModifier = Store.get('upscaleGyms') && isNotifyGym ? 1.2 : 1
    const gymLevel = getGymLevel(gym)

    if (isGymMeetsRaidFilters(gym)) {
        const raid = gym.raid
        if (isOngoingRaid(raid) && raid.pokemon_id !== null) {
            markerImage = 'gym_img?team=' + gymTypes[gym.team_id] + '&level=' + gymLevel + '&raidlevel=' + raid.level + '&pkm=' + raid.pokemon_id
            if (raid.form != null && raid.form > 0) {
                markerImage += '&form=' + raid.form
            }
            marker.setZIndexOffset(gymRaidBossZIndex)
        } else { // Upcoming raid.
            markerImage = 'gym_img?team=' + gymTypes[gym.team_id] + '&level=' + gymLevel + '&raidlevel=' + raid.level
            marker.setZIndexOffset(gymEggZIndex)
        }
    } else {
        markerImage = 'gym_img?team=' + gymTypes[gym.team_id] + '&level=' + gymLevel
        marker.setZIndexOffset(gymZIndex)
    }

    if (gym.is_in_battle) {
        markerImage += '&in_battle=1'
    }

    if (gym.is_ex_raid_eligible) {
        markerImage += '&is_ex_raid_eligible=1'
    }

    var GymIcon = new L.Icon({
        iconUrl: markerImage,
        iconSize: [48 * upscaleModifier, 48 * upscaleModifier]
    })
    marker.setIcon(GymIcon)

    if (isNotifyGym) {
        marker.setZIndexOffset(gymNotifiedZIndex)
    }

    if (Store.get('bounceGyms') && isNotifyGym && !notifiedGymData[gym.gym_id].animationDisabled && !marker.isBouncing()) {
        marker.bounce()
    } else if (marker.isBouncing() && (!Store.get('bounceGyms') || !isNotifyGym)) {
        marker.stopBouncing()
    }

    if (isNotifyGym && markers.hasLayer(marker)) {
        // Marker in wrong layer, move to other layer.
        markers.removeLayer(marker)
        markersNoCluster.addLayer(marker)
    } else if (!isNotifyGym && markersNoCluster.hasLayer(marker)) {
        // Marker in wrong layer, move to other layer.
        markersNoCluster.removeLayer(marker)
        markers.addLayer(marker)
    }

    return marker
}

function gymLabel(gym) {
    const teamName = gymTypes[gym.team_id]
    const titleText = gym.name !== null && gym.name !== '' ? gym.name : (gym.team_id === 0 ? teamName : teamName + ' Gym')
    const mapLabel = Store.get('mapServiceProvider') === 'googlemaps' ? 'Google' : 'Apple'

    var exDisplay = ''
    var gymImageDisplay = ''
    var strenghtDisplay = ''
    var gymLeaderDisplay = ''
    var raidDisplay = ''

    if (gym.is_ex_raid_eligible) {
        exDisplay = `<img id='ex-icon' src='static/images/gym/ex.png' width='22'>`
    }

    if (gym.url) {
        const url = gym.url.replace(/^http:\/\//i, '//')
        gymImageDisplay = `
            <div>
              <img class='gym-image ${teamName.toLowerCase()}' src='${url}' onclick='showImageModal("${url}", "${titleText.replace(/"/g, '\\&quot;').replace(/'/g, '\\&#39;')}")' width='64' height='64'>
            </div>`
    } else {
        let gymUrl = `gym_img?team=${teamName}&level=${getGymLevel(gym)}`
        if (gym.is_in_battle) {
            gymUrl += '&in_battle=1'
        }
        gymImageDisplay = `
            <div>
              <img class='gym-icon' src='${gymUrl}' width='64'>
            </div>`
    }

    if (gym.team_id !== 0) {
        /* strenghtDisplay = `
        <div>
          Strength: <span class='info'>${gym.total_cp}</span>
        </div>` */

        gymLeaderDisplay = `
            <div>
              Gym leader: <strong>${getPokemonName(gym.guard_pokemon_id)} <a href='https://pokemongo.gamepress.gg/pokemon/${gym.guard_pokemon_id}' target='_blank' title='View on GamePress'>#${gym.guard_pokemon_id}</a></strong>
            </div>`
    }

    if (isGymMeetsRaidFilters(gym)) {
        const raid = gym.raid
        const raidColor = ['252,112,176', '255,158,22', '184,165,221']
        const levelStr = '★'.repeat(raid.level)

        if (isOngoingRaid(raid) && raid.pokemon_id !== null) {
            const pokemonIconUrl = getPokemonRawIconUrl(raid)

            let typesDisplay = ''
            const types = getPokemonTypesNoI8ln(raid.pokemon_id, raid.form)
            $.each(types, function (index, type) {
                if (index === 1) {
                    typesDisplay += `<img src='static/images/types/${type.type.toLowerCase()}.png' title='${i8ln(type.type)}' width='16' style='margin-left:4px;'>`
                } else {
                    typesDisplay += `<img src='static/images/types/${type.type.toLowerCase()}.png' title='${i8ln(type.type)}' width='16'>`
                }
            })

            let pokemonName = raid.pokemon_name
            const formName = raid.form ? getFormName(raid.pokemon_id, raid.form) : false
            if (formName) {
                pokemonName += ` (${formName})`
            }

            let fastMoveName = getMoveName(raid.move_1)
            let chargeMoveName = getMoveName(raid.move_2)
            let fastMoveType = getMoveTypeNoI8ln(raid.move_1)
            let chargeMoveType = getMoveTypeNoI8ln(raid.move_2)

            const notifyText = notifyRaidPokemon.includes(raid.pokemon_id) ? 'Unnotify' : 'Notify'
            const notifyIconClass = notifyRaidPokemon.includes(raid.pokemon_id) ? 'fas fa-bell-slash' : 'fas fa-bell'

            raidDisplay = `
                <div class='section-divider'></div>
                <div id='raid-container'>
                  <div id='raid-container-left'>
                    <div>
                      <img src='${pokemonIconUrl}' width='64px'>
                    </div>
                    <div>
                      ${typesDisplay}
                    </div>
                    <div>
                      <strong><span style='color:rgb(${raidColor[Math.floor((raid.level - 1) / 2)]})'>${levelStr}</span></strong>
                    </div>
                  </div>
                  <div id='raid-container-right'>
                    <div class='title ongoing'>
                      <div>
                        ${pokemonName} <i class="fas ${genderClasses[raid.gender - 1]}"></i> #${raid.pokemon_id} Raid
                      </div>
                    </div>
                    <div class='disappear'>
                      ${timestampToTime(raid.end)} (<span class='label-countdown' disappears-at='${raid.end}'>00m00s</span>)
                    </div>
                    <div class='info-container'>
                      <div>
                        CP: <strong>${raid.cp}</strong>
                      </div>
                      <div>
                        Fast: <strong>${fastMoveName}</strong> <img class='move-type-icon' src='static/images/types/${fastMoveType.toLowerCase()}.png' title='${i8ln(fastMoveType)}' width='15'>
                      </div>
                      <div>
                        Charge: <strong>${chargeMoveName}</strong> <img class='move-type-icon' src='static/images/types/${chargeMoveType.toLowerCase()}.png' title='${i8ln(chargeMoveType)}' width='15'>
                      </div>
                    </div>
                    <div>
                      <a href='javascript:notifyAboutRaidPokemon(${raid.pokemon_id})' class='link-button' title='${notifyText}'><i class="${notifyIconClass}"></i></a>
                      <a href='javascript:excludeRaidPokemon(${raid.pokemon_id})' class='link-button' title='Hide'><i class="fas fa-eye-slash"></i></a>
                      <a href='https://pokemongo.gamepress.gg/pokemon/${raid.pokemon_id}' class='link-button' target='_blank' title='View on GamePress'><i class="fas fa-info-circle"></i></a>
                    </div>
                  </div>
                </div>`
        } else {
            const isNotifyEgg = notifyEggs.includes(raid.level)
            const notifyText = isNotifyEgg ? 'Unnotify' : 'Notify'
            const notifyIconClass = isNotifyEgg ? 'fas fa-bell-slash' : 'fas fa-bell'
            const notifyFunction = isNotifyEgg ? 'unnotifyAboutEgg' : 'notifyAboutEgg'

            raidDisplay = `
                <div class='section-divider'></div>
                <div id='raid-container'>
                  <div id='raid-container-left'>
                    <img id='egg-image' src='static/images/gym/${raidEggImages[raid.level]}' width='64'>
                  </div>
                  <div id='raid-container-right'>
                    <div class='title upcoming'>
                      Raid <span style='color:rgb(${raidColor[Math.floor((raid.level - 1) / 2)]})'>${levelStr}</span>
                    </div>
                    <div class='info-container'>
                      <div>
                        Start: <strong>${timestampToTime(raid.start)} (<span class='label-countdown' disappears-at='${raid.start}'>00m00s</span>)</strong>
                      </div>
                      <div>
                        End: <strong>${timestampToTime(raid.end)} (<span class='label-countdown' disappears-at='${raid.end}'>00m00s</span>)</strong>
                      </div>
                    </div>
                    <div>
                      <a href='javascript:${notifyFunction}(${raid.level})' class='link-button' title='${notifyText}'><i class="${notifyIconClass}"></i></a>
                      <a href='javascript:excludeEgg(${raid.level})' class='link-button' title='Hide'><i class="fas fa-eye-slash"></i></a>
                    </div>
                  </div>
                </div>`
        }
    }

    return `
        <div>
          <div id='gym-container'>
            <div id='gym-container-left'>
              ${gymImageDisplay}
              <div class='team-name ${teamName.toLowerCase()}'>
                <strong>${teamName}</strong>
              </div>
            </div>
            <div id='gym-container-right'>
              <div class='title'>
                ${titleText} ${exDisplay}
              </div>
              <div class='info-container'>
                ${strenghtDisplay}
                <div>
                  Free slots: <strong>${gym.slots_available}</strong>
                </div>
                ${gymLeaderDisplay}
                <div>
                  Last scanned: <strong>${timestampToDateTime(gym.last_scanned)}</strong>
                </div>
                <div>
                  Last modified: <strong>${timestampToDateTime(gym.last_modified)}</strong>
                </div>
              </div>
              <div>
                <a href='javascript:void(0);' onclick='javascript:openMapDirections(${gym.latitude},${gym.longitude},${Store.get('mapServiceProvider')});' title='Open in ${mapLabel} Maps'><i class="fas fa-map-marked-alt"></i> ${gym.latitude.toFixed(5)}, ${gym.longitude.toFixed(5)}</a>
              </div>
            </div>
          </div>
          ${raidDisplay}
        </div>`
}

function updateGymLabel(gym, marker) {
    marker.getPopup().setContent(gymLabel(gym))
    if (marker.isPopupOpen() && isValidRaid(gym.raid)) {
        // Update countdown time to prevent a countdown time of 0.
        updateLabelDiffTime()
    }
}

function processGym(gym = null) {
    if (!settings.showGyms && !settings.showRaids) {
        return false
    }

    const id = gym.gym_id
    if (!mapData.gyms.hasOwnProperty(id)) {
        if (!isGymMeetsFilters(gym)) {
            return true
        }

        const {isEggNotifyGym, isRaidPokemonNotifyGym, isNewNotifyGym} = getGymNotificationInfo(gym)
        if (isNewNotifyGym) {
            sendGymNotification(gym, isEggNotifyGym, isRaidPokemonNotifyGym)
        }

        gym.marker = setupGymMarker(gym, isEggNotifyGym || isRaidPokemonNotifyGym)
        if (isGymRangesActive()) {
            gym.rangeCircle = setupRangeCircle(gym, 'gym', !isEggNotifyGym && !isRaidPokemonNotifyGym)
        }
        gym.updated = true
        mapData.gyms[id] = gym

        if (isValidRaid(gym.raid)) {
            raidIds.add(id)
            if (isUpcomingRaid(gym.raid) && gym.raid.pokemon_id !== null) {
                upcomingRaidIds.add(id)
            }
        }
    } else {
        updateGym(id, gym)
    }

    return true
}

function updateGym(id, gym = null) {
    if (id === undefined || id === null || !mapData.gyms.hasOwnProperty(id)) {
        return true
    }

    const isGymNull = gym === null
    if (isGymNull) {
        gym = mapData.gyms[id]
    }

    if (!isGymMeetsFilters(gym)) {
        removeGym(gym)
        return true
    }

    if (!isGymNull) {
        const oldGym = mapData.gyms[id]
        var hasNewRaid = false
        var hasNewUpComingRaid = false
        var hasNewOngoingRaid = false
        if (isValidRaid(gym.raid)) {
            const isNewRaidPokemon = gym.raid.pokemon_id !== null && (oldGym.raid === null || oldGym.raid.pokemon_id === null)
            hasNewRaid = oldGym.raid === null
            hasNewUpComingRaid = isUpcomingRaid(gym.raid) && isNewRaidPokemon
            hasNewOngoingRaid = isOngoingRaid(gym.raid) && isNewRaidPokemon
        }

        if (gym.last_modified > oldGym.last_modified || hasNewRaid || hasNewOngoingRaid || gym.is_in_battle !== oldGym.is_in_battle) {
            // Visual change, send notification if necessary and update marker.
            const {isEggNotifyGym, isRaidPokemonNotifyGym, isNewNotifyGym} = getGymNotificationInfo(gym)
            if (isNewNotifyGym) {
                sendGymNotification(gym, isEggNotifyGym, isRaidPokemonNotifyGym)
            }
            gym.marker = updateGymMarker(gym, oldGym.marker, isEggNotifyGym || isRaidPokemonNotifyGym)
            if (oldGym.rangeCircle) {
                gym.rangeCircle = updateRangeCircle(mapData.gyms[id], 'gym', !isEggNotifyGym && !isRaidPokemonNotifyGym)
            }
        } else {
            gym.marker = oldGym.marker
            if (oldGym.rangeCircle) {
                gym.rangeCircle = oldGym.rangeCircle
            }
        }

        if (gym.marker.isPopupOpen()) {
            updateGymLabel(gym, gym.marker)
        } else {
            // Make sure label is updated next time it's opened.
            gym.updated = true
        }

        mapData.gyms[id] = gym

        if (hasNewRaid) {
            raidIds.add(id)
        }
        if (hasNewUpComingRaid) {
            upcomingRaidIds.add(id)
        }
    } else {
        const {isEggNotifyGym, isRaidPokemonNotifyGym, isNewNotifyGym} = getGymNotificationInfo(gym)
        if (isNewNotifyGym) {
            sendGymNotification(gym, isEggNotifyGym, isRaidPokemonNotifyGym)
        }

        updateGymMarker(gym, mapData.gyms[id].marker, isEggNotifyGym || isRaidPokemonNotifyGym)
        if (gym.marker.isPopupOpen()) {
            updateGymLabel(gym, mapData.gyms[id].marker)
        } else {
            // Make sure label is updated next time it's opened.
            mapData.gyms[id].updated = true
        }
        if (isGymRangesActive() && !gym.rangeCircle) {
            mapData.gyms[id].rangeCircle = setupRangeCircle(gym, 'gym', !isEggNotifyGym && !isRaidPokemonNotifyGym)
        } else {
            updateRangeCircle(mapData.gyms[id], 'gym', !isEggNotifyGym && !isRaidPokemonNotifyGym)
        }
    }

    return true
}

function updateGyms() {
    $.each(mapData.gyms, function (id, gym) {
        updateGym(id)
    })

    if ($('#stats').hasClass('visible')) {
        countMarkers(map)
    }
}

function removeGym(gym) {
    const id = gym.gym_id
    if (mapData.gyms.hasOwnProperty(id)) {
        if (mapData.gyms[id].rangeCircle) {
            removeRangeCircle(mapData.gyms[id].rangeCircle)
        }
        removeMarker(mapData.gyms[id].marker)
        delete mapData.gyms[id]

        if (raidIds.has(id)) {
            raidIds.delete(id)
        }
        if (upcomingRaidIds.has(id)) {
            upcomingRaidIds.delete(id)
        }
    }
}

function excludeEgg(level) { // eslint-disable-line no-unused-vars
    var temp = settings.includedEggLevels
    const index = temp.indexOf(level)
    if (index > -1) {
        temp.splice(index, 1)
        $('#egg-levels-select').val(temp).trigger('change')
    }
}

function excludeRaidPokemon(id) { // eslint-disable-line no-unused-vars
    $('label[for="include-raid-pokemon"] .pokemon-filter-list .filter-button[data-id="' + id + '"]').click()
}

function notifyAboutEgg(level) { // eslint-disable-line no-unused-vars
    var temp = notifyEggs
    if (!temp.includes(level)) {
        temp.push(level)
        $('#notify-eggs').val(temp).trigger('change')
    }
}

function unnotifyAboutEgg(level) { // eslint-disable-line no-unused-vars
    var temp = notifyEggs
    const index = temp.indexOf(level)
    if (index > -1) {
        temp.splice(index, 1)
        $('#notify-eggs').val(temp).trigger('change')
    }
}

function notifyAboutRaidPokemon(id) { // eslint-disable-line no-unused-vars
    $('label[for="notify-raid-pokemon"] .pokemon-filter-list .filter-button[data-id="' + id + '"]').click()
}

function getGymNotificationInfo(gym) {
    var isEggNotifyGym = false
    var isRaidPokemonNotifyGym = false
    var isNewNotifyGym = false
    if (Store.get('notifyGyms') && isGymMeetsRaidFilters(gym)) {
        const id = gym.gym_id
        if (isUpcomingRaid(gym.raid) && notifyEggs.includes(gym.raid.level)) {
            isEggNotifyGym = true
            isNewNotifyGym = !notifiedGymData.hasOwnProperty(id) || !notifiedGymData[id].hasSentEggNotification || gym.raid.end > notifiedGymData[id].raidEnd
        } else if (isOngoingRaid(gym.raid) && notifyRaidPokemon.includes(gym.raid.pokemon_id)) {
            isRaidPokemonNotifyGym = true
            isNewNotifyGym = !notifiedGymData.hasOwnProperty(id) || !notifiedGymData[id].hasSentRaidPokemonNotification || gym.raid.end > notifiedGymData[id].raidEnd
        }
    }

    return {
        'isEggNotifyGym': isEggNotifyGym,
        'isRaidPokemonNotifyGym': isRaidPokemonNotifyGym,
        'isNewNotifyGym': isNewNotifyGym
    }
}

function sendGymNotification(gym, isEggNotifyGym, isRaidPokemonNotifyGym) {
    const raid = gym.raid
    if (!isValidRaid(raid) || (!isEggNotifyGym && !isRaidPokemonNotifyGym)) {
        return
    }

    if (Store.get('playSound')) {
        audio.play()
    }

    if (Store.get('showPopups')) {
        const gymName = gym.name !== null && gym.name !== '' ? gym.name : 'unknown'
        var notifyTitle = ''
        var notifyText = ''
        var iconUrl = ''
        if (isEggNotifyGym) {
            let expireTime = timestampToTime(raid.start)
            let timeUntil = getTimeUntil(raid.start)
            let expireTimeCountdown = timeUntil.hour > 0 ? timeUntil.hour + 'h' : ''
            expireTimeCountdown += `${lpad(timeUntil.min, 2, 0)}m${lpad(timeUntil.sec, 2, 0)}s`

            notifyTitle = `Level ${raid.level} Raid`
            notifyText = `Gym: ${gymName}\nStarts at ${expireTime} (${expireTimeCountdown})`
            iconUrl = 'static/images/gym/' + raidEggImages[raid.level]
        } else {
            let expireTime = timestampToTime(raid.end)
            let timeUntil = getTimeUntil(raid.end)
            let expireTimeCountdown = timeUntil.hour > 0 ? timeUntil.hour + 'h' : ''
            expireTimeCountdown += `${lpad(timeUntil.min, 2, 0)}m${lpad(timeUntil.sec, 2, 0)}s`

            var fastMoveName = getMoveName(raid.move_1)
            var chargeMoveName = getMoveName(raid.move_2)

            var pokemonName = raid.pokemon_name
            const formName = raid.form ? getFormName(raid.pokemon_id, raid.form) : false
            if (formName) {
                pokemonName += ` (${formName})`
            }

            notifyTitle = `${pokemonName} Raid (L${raid.level})`
            notifyText = `Gym: ${gymName}\nEnds at ${expireTime} (${expireTimeCountdown})\nMoves: ${fastMoveName} / ${chargeMoveName}`
            iconUrl = getPokemonRawIconUrl(raid)
        }

        sendNotification(notifyTitle, notifyText, iconUrl, gym.latitude, gym.longitude)
    }

    var notificationData = {}
    notificationData.raidEnd = gym.raid.end
    if (isEggNotifyGym) {
        notificationData.hasSentEggNotification = true
    } else if (isRaidPokemonNotifyGym) {
        notificationData.hasSentRaidPokemonNotification = true
    }
    notifiedGymData[gym.gym_id] = notificationData
}
