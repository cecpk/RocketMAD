function isGymMeetsGymFilters(gym) {
    if (!settings.showGyms) {
        return false
    }

    if (serverSettings.gymFilters) {
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

    if (serverSettings.raidFilters) {
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
            if (raid.pokemon_id && settings.filterRaidPokemon && settings.excludedRaidPokemon.has(raid.pokemon_id)) {
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

function setupGymMarker(gym, isNotifGym) {
    var marker = L.marker([gym.latitude, gym.longitude])
    if (isNotifGym) {
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
    updateGymMarker(gym, marker, isNotifGym)
    if (!settings.useGymSidebar) {
        marker.bindPopup()
    }

    if (settings.useGymSidebar) {
        marker.on('click', function () {
            if (gymSidebar.isOpen && openGymSidebarId === gym.gym_id) {
                gymSidebar.close()
            } else {
                updateGymSidebar(gym.gym_id)
                if (!gymSidebar.isOpen) {
                    gymSidebar.open()
                }
                openGymSidebarId = gym.gym_id
            }
        })
    } else {
        addListeners(marker, 'gym')
    }

    return marker
}

function updateGymMarker(gym, marker, isNotifGym) {
    var markerImage = ''
    const upscaleModifier = isNotifGym && settings.upscaleNotifMarkers ? 1.2 : 1
    const gymLevel = getGymLevel(gym)

    if (isGymMeetsRaidFilters(gym)) {
        const raid = gym.raid
        if (isOngoingRaid(raid) && raid.pokemon_id !== null) {
            markerImage = 'gym_img?team=' + gymTypes[gym.team_id] + '&level=' + gymLevel + '&raidlevel=' + raid.level + '&pkm=' + raid.pokemon_id
            if (raid.form != null && raid.form > 0) {
                markerImage += '&form=' + raid.form
            }
            if (raid.costume != null && raid.costume > 0) {
                markerImage += '&costume=' + raid.costume
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

    var icon = L.icon({
        iconUrl: markerImage,
        iconSize: [48 * upscaleModifier, 48 * upscaleModifier]
    })
    marker.setIcon(icon)

    if (isNotifGym) {
        marker.setZIndexOffset(gymNotifiedZIndex)
    }

    if (isNotifGym && markers.hasLayer(marker)) {
        // Marker in wrong layer, move to other layer.
        markers.removeLayer(marker)
        markersNoCluster.addLayer(marker)
    } else if (!isNotifGym && markersNoCluster.hasLayer(marker)) {
        // Marker in wrong layer, move to other layer.
        markersNoCluster.removeLayer(marker)
        markers.addLayer(marker)
    }

    if (settings.bounceNotifMarkers && isNotifGym && !notifiedGymData[gym.gym_id].animationDisabled && !marker.isBouncing()) {
        marker.bounce()
    } else if (marker.isBouncing() && (!settings.bounceNotifMarkers || !isNotifGym)) {
        marker.stopBouncing()
    }

    return marker
}

function updateGymSidebar(id) {
    const gym = mapData.gyms[id]
    const teamName = gymTypes[gym.team_id]
    const title = gym.name !== null && gym.name !== '' ? gym.name : (gym.team_id === 0 ? teamName : teamName + ' Gym')
    let exIcon = ''
    if (gym.is_ex_raid_eligible) {
        exIcon += ` <img id="sidebar-gym-ex-icon" src="static/images/gym/ex.png" title="${i8ln('EX eligible Gym')}">`
    }

    $('#sidebar-gym-title').html(title + exIcon)

    let $image = $('#sidebar-gym-image')
    if (gym.url) {
        const url = gym.url.replace(/^http:\/\//i, '//')
        $image.attr('src', url)
        $image.attr('class', 'gym-image')
        $image.addClass(teamName.toLowerCase())
        $image.attr('onclick', `showImageModal('${url}', '${title.replace(/"/g, '\\&quot;').replace(/'/g, '\\&#39;')}')`)
    } else {
        let url = `gym_img?team=${teamName}&level=${getGymLevel(gym)}`
        if (gym.is_in_battle) {
            gymUrl += '&in_battle=1'
        }
        $image.removeClass('gym-image')
        $image.removeAttr('onclick')
        $image.attr('src', url)
    }

    let $team = $('#gym-sidebar .team')
    if (gym.slots_available < 6) {
        $team.text(i8ln('Team ' + teamName))
    } else {
        $team.text(i8ln(teamName))
    }
    $team.attr('class', 'team')
    $team.addClass(teamName.toLowerCase())

    $('#sidebar-gym-free-slots').text(gym.slots_available)
    if (gym.slots_available < 6) {
        $('#sidebar-gym-leader').html(`${getPokemonName(gym.guard_pokemon_id)} <a href='https://pokemongo.gamepress.gg/pokemon/${gym.guard_pokemon_id}' target='_blank' title='${i8ln('View on GamePress')}'>#${gym.guard_pokemon_id}</a>`)
        $('#sidebar-gym-leader-container').show()
    } else {
        $('#sidebar-gym-leader-container').hide()
    }
    $('#sidebar-gym-last-scanned').text(timestampToDateTime(gym.last_scanned))
    $('#sidebar-gym-last-modified').text(timestampToDateTime(gym.last_modified))
    $('#sidebar-gym-coordinates-container').html(`<a href='javascript:void(0);' onclick='javascript:openMapDirections(${gym.latitude},${gym.longitude},"${settings.mapServiceProvider}");' title='${i8ln('Open in ' + mapServiceProviderNames[settings.mapServiceProvider])}'><i class="fas fa-map-marked-alt"></i> ${gym.latitude.toFixed(5)}, ${gym.longitude.toFixed(5)}</a>`)

    if (isGymMeetsRaidFilters(gym)) {
        const raid = gym.raid
        const levelStars = '★'.repeat(raid.level)

        if (isOngoingRaid(raid) && raid.pokemon_id) {
            const name = getPokemonNameWithForm(raid.pokemon_id, raid.form)
            const fastMoveName = getMoveName(raid.move_1)
            const chargeMoveName = getMoveName(raid.move_2)
            const fastMoveType = getMoveTypeNoI8ln(raid.move_1)
            const chargeMoveType = getMoveTypeNoI8ln(raid.move_2)

            $('#sidebar-upcoming-raid-container').hide()
            $('#sidebar-ongoing-raid-title').html(`${name} <i class='fas ${genderClasses[raid.gender - 1]}'></i> #${raid.pokemon_id}`)
            $('#sidebar-ongoing-raid-level-container').html(`${i8ln('Raid')} <span class='raid-level-${raid.level}'>${levelStars}</span>`)
            $('#sidebar-ongoing-raid-end-container').html(`${timestampToTime(raid.end)} (<span class='label-countdown' disappears-at='${raid.end}'>00m00s</span>)`)
            $('#sidebar-raid-pokemon-image').attr('src', getPokemonRawIconUrl(raid))

            let typesDisplay = ''
            const types = getPokemonTypesNoI8ln(raid.pokemon_id, raid.form)
            $.each(types, function (index, type) {
                if (index === 1) {
                    typesDisplay += `<img src='static/images/types/${type.type.toLowerCase()}.png' title='${i8ln(type.type)}' width='24' style='margin-left:4px;'>`
                } else {
                    typesDisplay += `<img src='static/images/types/${type.type.toLowerCase()}.png' title='${i8ln(type.type)}' width='24'>`
                }
            })
            $('#sidebar-raid-types-container').html(typesDisplay)

            $('#sidebar-raid-cp').text(raid.cp)
            $('#sidebar-raid-fast-move').html(`${fastMoveName} <img class='move-type-icon' src='static/images/types/${fastMoveType.toLowerCase()}.png' title='${i8ln(fastMoveType)}' width='15'>`)
            $('#sidebar-raid-charge-move').html(`${chargeMoveName} <img class='move-type-icon' src='static/images/types/${chargeMoveType.toLowerCase()}.png' title='${i8ln(chargeMoveType)}' width='15'>`)
            $('#sidebar-ongoing-raid-container').show()
        } else {
            $('#sidebar-ongoing-raid-container').hide()
            $('#sidebar-upcoming-raid-title').html(`${i8ln('Raid')} <span class='raid-level-${raid.level}'>${levelStars}</span>`)
            $('#sidebar-raid-egg-image').attr('src', 'static/images/gym/' + raidEggImages[raid.level])
            $('#sidebar-upcoming-raid-start-container').html(`${i8ln('Start')}: ${timestampToTime(raid.start)} (<span class='label-countdown' disappears-at='${raid.start}'>00m00s</span>)`)
            $('#sidebar-upcoming-raid-end-container').html(`${i8ln('End')}: ${timestampToTime(raid.end)} (<span class='label-countdown' disappears-at='${raid.end}'>00m00s</span>)`)
            $('#sidebar-upcoming-raid-container').show()
        }
        // Update countdown time to prevent a countdown time of 0.
        updateLabelDiffTime()
    } else {
        $('#sidebar-ongoing-raid-container').hide()
        $('#sidebar-upcoming-raid-container').hide()
    }
}

function gymLabel(gym) {
    const teamName = gymTypes[gym.team_id]
    const titleText = gym.name !== null && gym.name !== '' ? gym.name : (gym.team_id === 0 ? teamName : teamName + ' Gym')

    var exDisplay = ''
    var gymImageDisplay = ''
    var strenghtDisplay = ''
    var gymLeaderDisplay = ''
    var raidDisplay = ''

    if (gym.is_ex_raid_eligible) {
        exDisplay = `<img id='ex-icon' src='static/images/gym/ex.png' width='22' title='EX eligible Gym'>`
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
        const levelStars = '★'.repeat(raid.level)

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

            let name = getPokemonNameWithForm(raid.pokemon_id, raid.form)
            let fastMoveName = getMoveName(raid.move_1)
            let chargeMoveName = getMoveName(raid.move_2)
            let fastMoveType = getMoveTypeNoI8ln(raid.move_1)
            let chargeMoveType = getMoveTypeNoI8ln(raid.move_2)

            const isNotifRaid = settings.notifRaidPokemon.has(raid.pokemon_id)
            const notifText = isNotifRaid ? 'Don\'t notify' : 'Notify'
            const notifIconClass = isNotifRaid ? 'fas fa-bell-slash' : 'fas fa-bell'

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
                      <strong><span class='raid-level-${raid.level}'>${levelStars}</span></strong>
                    </div>
                  </div>
                  <div id='raid-container-right'>
                    <div class='title ongoing'>
                      <div>
                        ${name} <i class="fas ${genderClasses[raid.gender - 1]}"></i> #${raid.pokemon_id} Raid
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
                      <a href='javascript:toggleRaidPokemonNotif(${raid.pokemon_id})' class='link-button' title="${notifText}"><i class="${notifIconClass}"></i></a>
                      <a href='javascript:excludeRaidPokemon(${raid.pokemon_id})' class='link-button' title='Hide'><i class="fas fa-eye-slash"></i></a>
                      <a href='https://pokemongo.gamepress.gg/pokemon/${raid.pokemon_id}' class='link-button' target='_blank' title='View on GamePress'><i class="fas fa-info-circle"></i></a>
                    </div>
                  </div>
                </div>`
        } else {
            const isNotifEgg = settings.notifEggs.includes(raid.level)
            const notifText = isNotifEgg ? 'Don\'t notify' : 'Notify'
            const notifIconClass = isNotifEgg ? 'fas fa-bell-slash' : 'fas fa-bell'

            raidDisplay = `
                <div class='section-divider'></div>
                <div id='raid-container'>
                  <div id='raid-container-left'>
                    <img id='egg-image' src='static/images/gym/${raidEggImages[raid.level]}' width='64'>
                  </div>
                  <div id='raid-container-right'>
                    <div class='title upcoming'>
                      Raid <span class='raid-level-${raid.level}'>${levelStars}</span>
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
                      <a href='javascript:toggleEggNotif(${raid.level})' class='link-button' title="${notifText}"><i class="${notifIconClass}"></i></a>
                      <a href='javascript:excludeRaidLevel(${raid.level})' class='link-button' title='Hide'><i class="fas fa-eye-slash"></i></a>
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
              <div class='team ${teamName.toLowerCase()}'>
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
                <a href='javascript:void(0);' onclick='javascript:openMapDirections(${gym.latitude},${gym.longitude},"${settings.mapServiceProvider}");' title='Open in ${mapServiceProviderNames[settings.mapServiceProvider]}'><i class="fas fa-map-marked-alt"></i> ${gym.latitude.toFixed(5)}, ${gym.longitude.toFixed(5)}</a>
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

        const {isEggNotifGym, isRaidPokemonNotifGym, isNewNotifGym} = getGymNotificationInfo(gym)
        if (isNewNotifGym) {
            sendGymNotification(gym, isEggNotifGym, isRaidPokemonNotifGym)
        }

        gym.marker = setupGymMarker(gym, isEggNotifGym || isRaidPokemonNotifGym)
        if (isGymRangesActive()) {
            gym.rangeCircle = setupRangeCircle(gym, 'gym', !isEggNotifGym && !isRaidPokemonNotifGym)
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
            const {isEggNotifGym, isRaidPokemonNotifGym, isNewNotifGym} = getGymNotificationInfo(gym)
            if (isNewNotifGym) {
                sendGymNotification(gym, isEggNotifGym, isRaidPokemonNotifGym)
            }
            gym.marker = updateGymMarker(gym, oldGym.marker, isEggNotifGym || isRaidPokemonNotifGym)
            if (oldGym.rangeCircle) {
                gym.rangeCircle = updateRangeCircle(mapData.gyms[id], 'gym', !isEggNotifGym && !isRaidPokemonNotifGym)
            }
        } else {
            gym.marker = oldGym.marker
            if (oldGym.rangeCircle) {
                gym.rangeCircle = oldGym.rangeCircle
            }
        }

        if (settings.useGymSidebar && gymSidebar.isOpen && openGymSidebarId === id) {
            updateGymSidebar(id)
        } else if (gym.marker.isPopupOpen()) {
            updateGymLabel(gym, gym.marker)
        } else {
            // Make sure label/sidebar is updated next time it's opened.
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
        const {isEggNotifGym, isRaidPokemonNotifGym, isNewNotifGym} = getGymNotificationInfo(gym)
        if (isNewNotifGym) {
            sendGymNotification(gym, isEggNotifGym, isRaidPokemonNotifGym)
        }

        updateGymMarker(gym, mapData.gyms[id].marker, isEggNotifGym || isRaidPokemonNotifGym)
        if (settings.useGymSidebar && gymSidebar.isOpen && openGymSidebarId === id) {
            updateGymSidebar(id)
        } else if (gym.marker.isPopupOpen()) {
            updateGymLabel(gym, mapData.gyms[id].marker)
        } else {
            // Make sure label is updated next time it's opened.
            mapData.gyms[id].updated = true
        }
        if (isGymRangesActive() && !gym.rangeCircle) {
            mapData.gyms[id].rangeCircle = setupRangeCircle(gym, 'gym', !isEggNotifGym && !isRaidPokemonNotifGym)
        } else {
            updateRangeCircle(mapData.gyms[id], 'gym', !isEggNotifGym && !isRaidPokemonNotifGym)
        }
    }

    return true
}

function updateGyms() {
    $.each(mapData.gyms, function (id, gym) {
        updateGym(id)
    })
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

function readdGymMarkers() {
    $.each(mapData.gyms, function (id, gym) {
        removeMarker(gym.marker)
        gym.marker = setupGymMarker(gym)
    })
}

function excludeRaidLevel(level) { // eslint-disable-line no-unused-vars
    let levels = settings.includedRaidLevels
    const index = levels.indexOf(level)
    if (index > -1) {
        levels.splice(index, 1)
        $('#raid-level-select').val(levels).trigger('change')
        // Reintialize select.
        $('#raid-level-select').formSelect()
    }
}

function excludeRaidPokemon(id) { // eslint-disable-line no-unused-vars
    if (!settings.excludedRaidPokemon.has(id)) {
        $('label[for="exclude-raid-pokemon"] .pokemon-filter-list .filter-button[data-id="' + id + '"]').click()
    }
}

function toggleEggNotif(level) { // eslint-disable-line no-unused-vars
    let notifEggs = settings.notifEggs
    if (!notifEggs.includes(level)) {
        notifEggs.push(level)
    } else {
        const index = notifEggs.indexOf(level)
        notifEggs.splice(index, 1)
    }
    $('#egg-notifs-select').val(notifEggs).trigger('change')
    // Reintialize select.
    $('#egg-notifs-select').formSelect()
}

function toggleRaidPokemonNotif(id) { // eslint-disable-line no-unused-vars
    $('label[for="no-notif-raid-pokemon"] .pokemon-filter-list .filter-button[data-id="' + id + '"]').click()
}

function getGymNotificationInfo(gym) {
    var isEggNotifGym = false
    var isRaidPokemonNotifGym = false
    var isNewNotifGym = false
    if (settings.raidNotifs && isGymMeetsRaidFilters(gym)) {
        const id = gym.gym_id
        if (isUpcomingRaid(gym.raid) && settings.notifEggs.includes(gym.raid.level)) {
            isEggNotifGym = true
            isNewNotifGym = !notifiedGymData.hasOwnProperty(id) || !notifiedGymData[id].hasSentEggNotification || gym.raid.end > notifiedGymData[id].raidEnd
        } else if (isOngoingRaid(gym.raid) && settings.raidPokemonNotifs && settings.notifRaidPokemon.has(gym.raid.pokemon_id)) {
            isRaidPokemonNotifGym = true
            isNewNotifGym = !notifiedGymData.hasOwnProperty(id) || !notifiedGymData[id].hasSentRaidPokemonNotification || gym.raid.end > notifiedGymData[id].raidEnd
        }
    }

    return {
        'isEggNotifGym': isEggNotifGym,
        'isRaidPokemonNotifGym': isRaidPokemonNotifGym,
        'isNewNotifGym': isNewNotifGym
    }
}

function sendGymNotification(gym, isEggNotifGym, isRaidPokemonNotifGym) {
    const raid = gym.raid
    if (!isValidRaid(raid) || (!isEggNotifGym && !isRaidPokemonNotifGym)) {
        return
    }

    if (settings.playSound) {
        audio.play()
    }

    if (settings.showBrowserPopups) {
        const gymName = gym.name !== null && gym.name !== '' ? gym.name : 'unknown'
        var notifTitle = ''
        var notifText = ''
        var iconUrl = ''
        if (isEggNotifGym) {
            let expireTime = timestampToTime(raid.start)
            let timeUntil = getTimeUntil(raid.start)
            let expireTimeCountdown = timeUntil.hour > 0 ? timeUntil.hour + 'h' : ''
            expireTimeCountdown += `${lpad(timeUntil.min, 2, 0)}m${lpad(timeUntil.sec, 2, 0)}s`

            notifTitle = `Level ${raid.level} Raid`
            notifText = `Gym: ${gymName}\nStarts at ${expireTime} (${expireTimeCountdown})`
            iconUrl = 'static/images/gym/' + raidEggImages[raid.level]
        } else {
            let expireTime = timestampToTime(raid.end)
            let timeUntil = getTimeUntil(raid.end)
            let expireTimeCountdown = timeUntil.hour > 0 ? timeUntil.hour + 'h' : ''
            expireTimeCountdown += `${lpad(timeUntil.min, 2, 0)}m${lpad(timeUntil.sec, 2, 0)}s`

            var fastMoveName = getMoveName(raid.move_1)
            var chargeMoveName = getMoveName(raid.move_2)

            notifTitle = `${getPokemonNameWithForm(raid.pokemon_id, raid.form)} Raid (L${raid.level})`
            notifText = `Gym: ${gymName}\nEnds at ${expireTime} (${expireTimeCountdown})\nMoves: ${fastMoveName} / ${chargeMoveName}`
            iconUrl = getPokemonRawIconUrl(raid)
        }

        sendNotification(notifTitle, notifText, iconUrl, gym.latitude, gym.longitude)
    }

    var notificationData = {}
    notificationData.raidEnd = gym.raid.end
    if (isEggNotifGym) {
        notificationData.hasSentEggNotification = true
    } else if (isRaidPokemonNotifGym) {
        notificationData.hasSentRaidPokemonNotification = true
    }
    notifiedGymData[gym.gym_id] = notificationData
}
