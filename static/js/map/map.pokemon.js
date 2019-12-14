function isPokemonRarityExcluded(pokemon) {
    if (serverSettings.rarity) {
        const pokemonRarity = getPokemonRarity(pokemon.pokemon_id)
        if (!settings.includedRarities.includes(pokemonRarity)) {
            return true
        }
    }

    return false
}

function isPokemonMeetsFilters(pokemon, isNotifyPokemon) {
    if (!settings.showPokemon) {
        return false
    }

    if (Store.get('showNotifiedPokemonAlways') && isNotifyPokemon) {
        return true
    }

    if (getExcludedPokemon().includes(pokemon.pokemon_id) || isPokemonRarityExcluded(pokemon) || (Store.get('showNotifiedPokemonOnly') && !isNotifyPokemon)) {
        return false
    }

    if (settings.showPokemonValues && settings.filterValues && !settings.unfilteredPokemon.includes(pokemon.pokemon_id)) {
        if (pokemon.individual_attack !== null) {
            const ivsPercentage = getIvsPercentage(pokemon.individual_attack, pokemon.individual_defense, pokemon.individual_stamina)
            if (ivsPercentage < settings.minIvs && !(settings.showZeroIvsPokemon && ivsPercentage === 0)) {
                return false
            }
            if (ivsPercentage > settings.maxIvs) {
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

    return true
}

function isPokemonRangesActive() {
    return settings.showRanges && settings.includedRangeTypes.includes(1)
}

function customizePokemonMarker(pokemon, marker, isNotifyPokemon) {
    marker.setBouncingOptions({
        bounceHeight: 20,
        bounceSpeed: 80,
        elastic: false,
        shadowAngle: null
    })

    marker.encounter_id = pokemon.encounter_id
    updatePokemonMarker(pokemon, marker, isNotifyPokemon)
    marker.bindPopup()

    addListeners(marker, 'pokemon')

    return marker
}

function updatePokemonMarker(pokemon, marker, isNotifyPokemon) {
    var iconSize = 32 * (Store.get('pokemonIconSizeModifier') / 100)
    var upscaleModifier = 1
    if (isNotifyPokemon && Store.get('upscaleNotifyPokemon')) {
        upscaleModifier = 1.3
    } else if (Store.get('upscalePokemon')) {
        const upscaledPokemon = Store.get('upscaledPokemon')
        if (upscaledPokemon.includes(pokemon.pokemon_id)) {
            upscaleModifier = 1.3
        }
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

    var icon = marker.options.icon
    icon.options.iconSize = [iconSize, iconSize]
    marker.setIcon(icon)

    if (isNotifyPokemon) {
        marker.setZIndexOffset(pokemonNotifiedZIndex)
    } else if (serverSettings.rarity) {
        const pokemonRarity = getPokemonRarity(pokemon.pokemon_id)
        switch (pokemonRarity) {
            case 2:
                marker.setZIndexOffset(pokemonUncommonZIndex)
                break
            case 3:
                marker.setZIndexOffset(pokemonRareZIndex)
                break
            case 4:
                marker.setZIndexOffset(pokemonVeryRareZIndex)
                break
            case 5:
                marker.setZIndexOffset(pokemonUltraRareZIndex)
                break
            case 6:
                marker.setZIndexOffset(pokemonNewSpawnZIndex)
                break
            default:
                marker.setZIndexOffset(pokemonZIndex)
        }
    } else {
        marker.setZIndexOffset(pokemonZIndex)
    }

    if (Store.get('bouncePokemon') && isNotifyPokemon && !notifiedPokemonData[pokemon.encounter_id].animationDisabled && !marker.isBouncing()) {
        marker.bounce()
    } else if (marker.isBouncing() && (!Store.get('bouncePokemon') || !isNotifyPokemon)) {
        marker.stopBouncing()
    }

    if (isNotifyPokemon && markers.hasLayer(marker)) {
        // Marker in wrong layer, move to other layer.
        markers.removeLayer(marker)
        markersNoCluster.addLayer(marker)
    } else if (!isNotifyPokemon && markersNoCluster.hasLayer(marker)) {
        // Marker in wrong layer, move to other layer.
        markersNoCluster.removeLayer(marker)
        markers.addLayer(marker)
    }

    return marker
}

function pokemonLabel(item) {
    var name = item['pokemon_name']
    var types = getPokemonTypesNoI8ln(item.pokemon_id, item.form)
    var encounterId = item['encounter_id']
    var id = item['pokemon_id']
    var latitude = item['latitude']
    var longitude = item['longitude']
    var disappearTime = item['disappear_time']
    var atk = item['individual_attack']
    var def = item['individual_defense']
    var sta = item['individual_stamina']
    var gender = item['gender']
    var form = item['form']
    var cp = item['cp']
    var cpMultiplier = item['cp_multiplier']
    var weatherBoostedCondition = item['weather_boosted_condition']

    var pokemonIcon = getPokemonRawIconUrl(item)
    var gen = getPokemonGen(id)

    var formDisplay = ''
    var genRarityDisplayLeft = ''
    var genRarityDisplayRight = ''
    var weatherBoostDisplay = ''
    var verifiedDisplay = ''
    var typesDisplay = ''
    var statsDisplay = ''

    if (id === 29 || id === 32) {
        name = name.slice(0, -1)
    }

    const formName = form ? getFormName(id, form) : false
    if (formName) {
        formDisplay = `(${formName})`
    }

    if (weatherBoostedCondition > 0) {
        const weatherImage = getWeatherIconUrl({ gameplay_weather: weatherBoostedCondition, severity: 0, world_time: 1 })
        weatherBoostDisplay = `<img id='weather-icon' src='${weatherImage}' width='24'>`
    }

    if (item.verified_disappear_time) {
        verifiedDisplay = `<i id='despawn-verified' class='fas fa-check-square' title='Despawn time verified'></i>`
    } else if (item.verified_disappear_time === null) {
        verifiedDisplay = `<i id='despawn-unverified' class='fas fa-exclamation-triangle' title='Despawn time not verified'></i>`
    }

    $.each(types, function (idx, type) {
        if (idx === 1) {
            typesDisplay += `<img src='static/images/types/${type.type.toLowerCase()}.png' title='${i8ln(type.type)}' width='16' style='margin-left:4px;'>`
        } else {
            typesDisplay += `<img src='static/images/types/${type.type.toLowerCase()}.png' title='${i8ln(type.type)}' width='16'>`
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

        statsDisplay = `
            <div class='info-container'>
              <div>
                IV: <strong><span style='color: ${ivColor};'>${iv}%</span></strong> (A<strong>${atk}</strong> | D<strong>${def}</strong> | S<strong>${sta}</strong>)
              </div>
              <div>
                CP: <strong>${cp}</strong> | Level: <strong>${level}</strong>
              </div>
              <div>
               Fast: <strong>${move1Name}</strong> <img class='move-type-icon' src='static/images/types/${move1Type.toLowerCase()}.png' title='${i8ln(move1Type)}' width='15'>
              </div>
              <div>
               Charge: <strong>${move2Name}</strong> <img class='move-type-icon' src='static/images/types/${move2Type.toLowerCase()}.png' title='${i8ln(move2Type)}' width='15'>
              </div>
              <div>
                Weight: <strong>${weight}kg</strong> | Height: <strong>${height}m</strong>
              </div>
            </div>`

        let rarityDisplay = ''
        if (serverSettings.rarity) {
            const rarityName = getPokemonRarityName(item['pokemon_id'])
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
            const rarityName = getPokemonRarityName(item['pokemon_id'])
            rarityDisplay = `<strong>${rarityName}</strong> | `
        }

        genRarityDisplayRight = `
            <div class='info-container'>
              ${rarityDisplay}<strong>Gen ${gen}</strong>
            </div>`
    }

    const mapLabel = Store.get('mapServiceProvider') === 'googlemaps' ? 'Google' : 'Apple'

    const notifyText = notifyPokemon.includes(id) ? 'Unnotify' : 'Notify'
    const notifyIconClass = notifyPokemon.includes(id) ? 'fas fa-bell-slash' : 'fas fa-bell'

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
                <span>${name} ${formDisplay} <i class="fas ${genderClasses[gender - 1]}"></i> #${id}</span> ${weatherBoostDisplay}
              </div>
              <div class='disappear'>
                ${timestampToTime(disappearTime)} (<span class='label-countdown' disappears-at='${disappearTime}'>00m00s</span>) ${verifiedDisplay}
              </div>
              ${statsDisplay}
              ${genRarityDisplayRight}
              <div class='coordinates'>
                <a href='javascript:void(0);' onclick='javascript:openMapDirections(${latitude},${longitude},${Store.get('mapServiceProvider')});' class='link-button' title='Open in ${mapLabel} Maps'><i class="fas fa-map-marked-alt"></i> ${latitude.toFixed(5)}, ${longitude.toFixed(5)}</a>
              </div>
              <div>
                <a href='javascript:notifyAboutPokemon(${id}, "${encounterId}")' class='link-button' title='${notifyText}'><i class="${notifyIconClass}"></i></a>
                <a href='javascript:excludePokemon(${id}, "${encounterId}")' class='link-button' title='Hide'><i class="fas fa-eye-slash"></i></a>
                <a href='javascript:removePokemonMarker("${encounterId}")' class='link-button' title='Remove'><i class="fas fa-trash"></i></a>
                <a href='https://pokemongo.gamepress.gg/pokemon/${id}' class='link-button' target='_blank' title='View on GamePress'><i class="fas fa-info-circle"></i></a>
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
    if (!mapData.pokemons.hasOwnProperty(id)) {
        const isNotifyPoke = isNotifyPokemon(pokemon)
        if (!isPokemonMeetsFilters(pokemon, isNotifyPoke) || pokemon.disappear_time <= Date.now() + 3000) {
            if (isPokemonRarityExcluded(pokemon)) {
                excludedPokemonByRarity.push(id)
            }
            return true
        }

        if (isNotifyPoke && !hasSentPokemonNotification(pokemon)) {
            sendPokemonNotification(pokemon)
        }

        if (isNotifyPoke) {
            pokemon.marker = setupPokemonMarker(pokemon, markersNoCluster)
        } else {
            pokemon.marker = setupPokemonMarker(pokemon, markers)
        }
        customizePokemonMarker(pokemon, pokemon.marker, isNotifyPoke)
        if (isPokemonRangesActive()) {
            pokemon.rangeCircle = setupRangeCircle(pokemon, 'pokemon', !isNotifyPoke)
        }

        pokemon.updated = true
        mapData.pokemons[id] = pokemon
    } else {
        updatePokemon(id, pokemon)
    }

    return true
}

function updatePokemon(id, pokemon = null) {
    if (id === undefined || id === null || !mapData.pokemons.hasOwnProperty(id)) {
        return true
    }

    const isPokemonNull = pokemon === null
    if (isPokemonNull) {
        pokemon = mapData.pokemons[id]
    }

    const isNotifyPoke = isNotifyPokemon(pokemon)
    if (!isPokemonMeetsFilters(pokemon, isNotifyPoke)) {
        if (isPokemonRarityExcluded(pokemon)) {
            excludedPokemonByRarity.push(id)
        }
        removePokemon(pokemon)
        return true
    }

    if (!isPokemonNull) {
        const oldPokemon = mapData.pokemons[id]
        if (pokemon.pokemon_id !== oldPokemon.pokemon_id || pokemon.disappear_time !== oldPokemon.disappear_time ||
                pokemon.cp_multiplier !== oldPokemon.cp_multiplier || pokemon.individual_attack !== oldPokemon.individual_attack ||
                pokemon.individual_defense !== oldPokemon.individual_defense || pokemon.individual_stamina !== oldPokemon.individual_stamina ||
                pokemon.weight !== oldPokemon.weight || pokemon.height !== oldPokemon.height) {
            if (isNotifyPoke && !hasSentPokemonNotification(pokemon)) {
                sendPokemonNotification(pokemon)
            }

            pokemon.marker = updatePokemonMarker(pokemon, mapData.pokemons[id].marker, isNotifyPoke)
            if (oldPokemon.rangeCircle) {
                pokemon.rangeCircle = updateRangeCircle(mapData.pokemons[id], 'pokemon', !isNotifyPoke)
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
        if (isNotifyPoke && !hasSentPokemonNotification(pokemon)) {
            sendPokemonNotification(pokemon)
        }

        updatePokemonMarker(pokemon, mapData.pokemons[id].marker, isNotifyPoke)
        if (isPokemonRangesActive() && !pokemon.rangeCircle) {
            mapData.pokemons[id].rangeCircle = setupRangeCircle(pokemon, 'pokemon', !isNotifyPoke)
        } else {
            updateRangeCircle(mapData.pokemons[id], 'pokemon', !isNotifyPoke)
        }

        if (pokemon.marker.isPopupOpen()) {
            updatePokemonLabel(pokemon,  mapData.pokemons[id].marker)
        } else {
            // Make sure label is updated next time it's opened.
            mapData.pokemons[id].updated = true
        }
    }

    return true
}

function updatePokemons(pokemonIds = [], encounteredOnly = false) {
    if (pokemonIds.length > 0 && encounteredOnly) {
        $.each(mapData.pokemons, function (encounterId, pokemon) {
            if (pokemonIds.includes(pokemon.pokemon_id) && pokemon.individual_attack !== null) {
                updatePokemon(encounterId)
            }
        })
    } else if (pokemonIds.length > 0) {
        $.each(mapData.pokemons, function (encounterId, pokemon) {
            if (pokemonIds.includes(pokemon.pokemon_id)) {
                updatePokemon(encounterId)
            }
        })
    } else if (encounteredOnly) {
        $.each(mapData.pokemons, function (encounterId, pokemon) {
            if (pokemon.individual_attack !== null) {
                updatePokemon(encounterId)
            }
        })
    } else {
        $.each(mapData.pokemons, function (encounterId, pokemon) {
            updatePokemon(encounterId)
        })
    }

    if ($('#stats').hasClass('visible')) {
        // Update stats sidebar.
        countMarkers(map)
    }
}

function removePokemon(pokemon) {
    const id = pokemon.encounter_id
    if (mapData.pokemons.hasOwnProperty(id)) {
        if (mapData.pokemons[id].rangeCircle) {
            removeRangeCircle(mapData.pokemons[id].rangeCircle)
        }
        removeMarker(mapData.pokemons[id].marker)
        delete mapData.pokemons[id]
    }
}

function removePokemonMarker(id) { // eslint-disable-line no-unused-vars
    if (mapData.pokemons.hasOwnProperty(id)) {
        if (mapData.pokemons[id].rangeCircle) {
            removeRangeCircle(mapData.pokemons[id].rangeCircle)
        }
        removeMarker(mapData.pokemons[id].marker)
    }
}

function getExcludedPokemon() {
    return isShowAllZoom() ? [] : settings.excludedPokemon
}

function excludePokemon(id, encounterId) { // eslint-disable-line no-unused-vars
    $('label[for="include-pokemon"] .pokemon-filter-list .filter-button[data-id="' + id + '"]').click()
}

function notifyAboutPokemon(id, encounterId) { // eslint-disable-line no-unused-vars
    $('label[for="notify-pokemon"] .pokemon-filter-list .filter-button[data-id="' + id + '"]').click()
}

function isNotifyPokemon(pokemon) {
    if (Store.get('notifyPokemon')) {
        if (notifyPokemon.includes(pokemon.pokemon_id)) {
            return true
        }

        if (pokemon.individual_attack !== null && settings.showPokemonValues) {
            const notifyIvsPercentage = Store.get('notifyIvsPercentage')
            if (notifyIvsPercentage > 0) {
                const ivsPercentage = getIvsPercentage(pokemon.individual_attack, pokemon.individual_defense, pokemon.individual_stamina)
                if (ivsPercentage >= notifyIvsPercentage) {
                    return true
                }
            }

            const notifyLevel = Store.get('notifyLevel')
            if (notifyLevel > 0) {
                const level = getPokemonLevel(pokemon.cp_multiplier)
                if (level >= notifyLevel) {
                    return true
                }
            }

            if (serverSettings.medalpokemon) {
                if (Store.get('notifyTinyRattata') && pokemon.pokemon_id === 19) {
                    const baseHeight = 0.30
                    const baseWeight = 3.50
                    const ratio = sizeRatio(pokemon.height, pokemon.weight, baseHeight, baseWeight)
                    if (ratio < 1.5) {
                        return true
                    }
                }
                if (Store.get('notifyBigMagikarp') && pokemon.pokemon_id === 129) {
                    const baseHeight = 0.90
                    const baseWeight = 10.00
                    const ratio = sizeRatio(pokemon.height, pokemon.weight, baseHeight, baseWeight)
                    if (ratio > 2.5) {
                        return true
                    }
                }
            }

            if (serverSettings.rarity) {
                const pokemonRarity = getPokemonRarity(pokemon.pokemon_id)
                const notifyRarities = Store.get('notifyRarities')
                if (notifyRarities.includes(pokemonRarity)) {
                    return true
                }
            }
        }
    }

    return false
}

function hasSentPokemonNotification(pokemon) {
    const id = pokemon.encounter_id
    return notifiedPokemonData.hasOwnProperty(id) && pokemon.disappear_time === notifiedPokemonData[id].disappear_time &&
        pokemon.cp_multiplier === notifiedPokemonData[id].cp_multiplier && pokemon.individual_attack === notifiedPokemonData[id].individual_attack &&
        pokemon.individual_defense === notifiedPokemonData[id].individual_defense && pokemon.individual_stamina === notifiedPokemonData[id].individual_stamina &&
        pokemon.weight === notifiedPokemonData[id].weight && pokemon.height === notifiedPokemonData[id].height
}

function sendPokemonNotification(pokemon) {
    playPokemonSound(pokemon.pokemon_id, cryFileTypes)

    if (Store.get('showPopups')) {
        var notifyTitle = pokemon.pokemon_name
        var notifyText = ''

        const formName = pokemon.form ? getFormName(pokemon.pokemon_id, pokemon.form) : false
        if (formName) {
            notifyTitle += ` (${formName})`
        }

        let expireTime = timestampToTime(pokemon.disappear_time)
        let timeUntil = getTimeUntil(pokemon.disappear_time)
        let expireTimeCountdown = timeUntil.hour > 0 ? timeUntil.hour + 'h' : ''
        expireTimeCountdown += `${lpad(timeUntil.min, 2, 0)}m${lpad(timeUntil.sec, 2, 0)}s`

        notifyText = `Disappears at ${expireTime} (${expireTimeCountdown})`

        if (settings.showPokemonValues && pokemon.individual_attack !== null) {
            const ivsPercentage = getIvsPercentage(pokemon.individual_attack, pokemon.individual_defense, pokemon.individual_stamina)
            notifyTitle += ` ${ivsPercentage}% (${pokemon.individual_attack}/${pokemon.individual_defense}/${pokemon.individual_stamina}) L${getPokemonLevel(pokemon.cp_multiplier)}`
            const move1 = getMoveName(pokemon.move_1)
            const move2 = getMoveName(pokemon.move_2)
            notifyText += `\nMoves: ${move1} / ${move2}`
        }

        sendNotification(notifyTitle, notifyText, getPokemonRawIconUrl(pokemon), pokemon.latitude, pokemon.longitude)
    }

    var notificationData = {}
    notificationData.disappear_time = pokemon.disappear_time
    notificationData.individual_attack = pokemon.individual_attack
    notificationData.individual_defense = pokemon.individual_defense
    notificationData.individual_stamina = pokemon.individual_stamina
    notificationData.cp_multiplier = pokemon.cp_multiplier
    notificationData.weight = pokemon.weight
    notificationData.height = pokemon.height
    notifiedPokemonData[pokemon.encounter_id] = notificationData
}

function sendToastrPokemonNotification(title, text, icon, lat, lon) {
    var notification = toastr.info(text, title, {
        closeButton: true,
        positionClass: 'toast-top-right',
        preventDuplicates: true,
        onclick: function () {
            map.setView(L.latLng(lat, lon), 20)
        },
        showDuration: '300',
        hideDuration: '500',
        timeOut: '6000',
        extendedTimeOut: '1500',
        showEasing: 'swing',
        hideEasing: 'linear',
        showMethod: 'fadeIn',
        hideMethod: 'fadeOut'
    })
    notification.removeClass('toast-info')
    notification.css({
        'padding-left': '74px',
        'background-image': `url('./${icon}')`,
        'background-size': '48px',
        'background-color': '#0c5952'
    })
}
