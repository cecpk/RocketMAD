/*
globals $gymNameFilter:writable, downloadData, exParksLayerGroup, gymSidebar,
loadData, map, nestParksLayerGroup, readdGymMarkers,
reincludedPokemon:writable, s2CellsLayerGroup, settings,
settingsSideNav:writable, startFollowingUser, startLocationMarker,
stopFollowingUser, updateExParks, updateGyms, updateNestParks, updateNests,
updateMap, updatePokestops, updatePokemons, updateS2Overlay,
updateScannedLocations, updateSpawnpoints, updateStartLocationMarker,
updateUserLocationMarker, updateWeatherButton, updateWeathers, setQuestFormFilter
*/
/* exported initBackupModals, initInvasionFilters, initItemFilters, initPokemonFilters, initSettings, initSettingsSidebar */

function initSettings() {
    settings.showPokemon = serverSettings.pokemons && Store.get('showPokemon')
    settings.filterPokemonById = serverSettings.pokemons && Store.get('filterPokemonById')
    settings.excludedPokemon = serverSettings.pokemons ? Store.get('excludedPokemon') : new Set()
    settings.pokemonNotifs = serverSettings.pokemons && Store.get('pokemonNotifs')
    if (serverSettings.pokemons) {
        settings.pokemonIconSizeModifier = Store.get('pokemonIconSizeModifier')
        settings.showPokemonValues = serverSettings.pokemonValues && Store.get('showPokemonValues')
        settings.pokemonIdNotifs = Store.get('pokemonIdNotifs')
        settings.notifPokemon = Store.get('notifPokemon')
        settings.showNotifPokemonOnly = Store.get('showNotifPokemonOnly')
        settings.showNotifPokemonAlways = Store.get('showNotifPokemonAlways')
        settings.playCries = serverSettings.pokemonCries && Store.get('playCries')
        settings.excludeNearbyCells = Store.get('excludeNearbyCells')
    }
    if (serverSettings.pokemonValues) {
        settings.filterPokemonByValues = Store.get('filterPokemonByValues')
        settings.noFilterValuesPokemon = Store.get('noFilterValuesPokemon')
        settings.minIvs = Store.get('minIvs')
        settings.maxIvs = Store.get('maxIvs')
        settings.showZeroIvsPokemon = Store.get('showZeroIvsPokemon')
        settings.showHundoIvsPokemon = Store.get('showHundoIvsPokemon')
        settings.minLevel = Store.get('minLevel')
        settings.maxLevel = Store.get('maxLevel')
        settings.pokemonValuesNotifs = Store.get('pokemonValuesNotifs')
        settings.notifValuesPokemon = Store.get('notifValuesPokemon')
        settings.zeroIvsPokemonNotifs = Store.get('zeroIvsPokemonNotifs')
        settings.hundoIvsPokemonNotifs = Store.get('hundoIvsPokemonNotifs')
        settings.minNotifIvs = Store.get('minNotifIvs')
        settings.maxNotifIvs = Store.get('maxNotifIvs')
        settings.minNotifLevel = Store.get('minNotifLevel')
        settings.maxNotifLevel = Store.get('maxNotifLevel')
        settings.tinyRattataNotifs = Store.get('tinyRattataNotifs')
        settings.bigMagikarpNotifs = Store.get('bigMagikarpNotifs')
    }
    settings.scaleByRarity = serverSettings.rarity && Store.get('scaleByRarity')
    if (serverSettings.rarity) {
        settings.includedRarities = Store.get('includedRarities')
        settings.notifRarities = Store.get('notifRarities')
    }

    settings.showGyms = serverSettings.gyms && Store.get('showGyms')
    settings.useGymSidebar = serverSettings.gymSidebar && Store.get('useGymSidebar')
    if (serverSettings.gymFilters) {
        settings.includedGymTeams = Store.get('includedGymTeams')
        settings.minGymLevel = Store.get('minGymLevel')
        settings.maxGymLevel = Store.get('maxGymLevel')
        settings.showOpenSpotGymsOnly = Store.get('showOpenSpotGymsOnly')
        settings.showExGymsOnly = Store.get('showExGymsOnly')
        settings.showInBattleGymsOnly = Store.get('showInBattleGymsOnly')
        settings.gymLastScannedHours = Store.get('gymLastScannedHours')
    }
    settings.showRaids = serverSettings.raids && Store.get('showRaids')
    settings.raidNotifs = serverSettings.raids && Store.get('raidNotifs')
    if (serverSettings.raidFilters) {
        settings.filterRaidPokemon = Store.get('filterRaidPokemon')
        settings.excludedRaidPokemon = Store.get('excludedRaidPokemon')
        settings.showActiveRaidsOnly = Store.get('showActiveRaidsOnly')
        settings.showExEligibleRaidsOnly = Store.get('showExEligibleRaidsOnly')
        settings.includedRaidLevels = Store.get('includedRaidLevels')
        settings.raidPokemonNotifs = Store.get('raidPokemonNotifs')
        settings.notifRaidPokemon = Store.get('notifRaidPokemon')
        settings.notifEggs = Store.get('notifEggs')
    }

    settings.showPokestops = serverSettings.pokestops && Store.get('showPokestops')
    settings.pokestopNotifs = (serverSettings.quests || serverSettings.invasions || serverSettings.lures) && Store.get('pokestopNotifs')
    if (serverSettings.pokestops) {
        settings.showPokestopsNoEvent = Store.get('showPokestopsNoEvent')
        settings.showQuests = serverSettings.quests && Store.get('showQuests')
        settings.showInvasions = serverSettings.invasions && Store.get('showInvasions')
        settings.includedLureTypes = serverSettings.lures ? Store.get('includedLureTypes') : []
    }
    if (serverSettings.quests) {
        settings.filterQuests = Store.get('filterQuests')
        settings.excludedQuestPokemon = Store.get('excludedQuestPokemon')
        settings.questFormFilter = Store.get('questFormFilter')
        settings.excludedQuestItems = Store.get('excludedQuestItems')
        settings.questNotifs = Store.get('questNotifs')
        settings.notifQuestPokemon = Store.get('notifQuestPokemon')
        settings.notifQuestItems = Store.get('notifQuestItems')
    }
    if (serverSettings.invasions) {
        settings.filterInvasions = Store.get('filterInvasions')
        settings.showInvasionPokemon = Store.get('showInvasionPokemon')
        settings.excludedInvasions = Store.get('excludedInvasions')
        settings.invasionNotifs = Store.get('invasionNotifs')
        settings.notifInvasions = Store.get('notifInvasions')
    }
    if (serverSettings.lures) {
        settings.notifLureTypes = Store.get('notifLureTypes')
    }

    settings.showWeather = serverSettings.weather && Store.get('showWeather')
    if (serverSettings.weather) {
        settings.showMainWeather = Store.get('showMainWeather')
        settings.showWeatherCells = Store.get('showWeatherCells')
    }

    settings.showSpawnpoints = serverSettings.spawnpoints && Store.get('showSpawnpoints')
    settings.showScannedLocations = serverSettings.scannedLocs && Store.get('showScannedLocations')

    settings.showNests = serverSettings.nests && Store.get('showNests')
    settings.showNestParks = serverSettings.nestParks && Store.get('showNestParks')
    settings.showExParks = serverSettings.exParks && Store.get('showExParks')

    settings.showS2Cells = serverSettings.s2Cells && Store.get('showS2Cells')
    if (serverSettings.s2Cells) {
        settings.showS2CellsLevel10 = Store.get('showS2CellsLevel10')
        settings.showS2CellsLevel11 = Store.get('showS2CellsLevel11')
        settings.showS2CellsLevel12 = Store.get('showS2CellsLevel12')
        settings.showS2CellsLevel13 = Store.get('showS2CellsLevel13')
        settings.showS2CellsLevel14 = Store.get('showS2CellsLevel14')
        settings.showS2CellsLevel15 = Store.get('showS2CellsLevel15')
        settings.showS2CellsLevel16 = Store.get('showS2CellsLevel16')
        settings.showS2CellsLevel17 = Store.get('showS2CellsLevel17')
        settings.warnHiddenS2Cells = Store.get('warnHiddenS2Cells')
    }

    settings.showRanges = serverSettings.ranges && Store.get('showRanges')
    if (serverSettings.ranges) {
        settings.includedRangeTypes = Store.get('includedRangeTypes')
    }

    settings.startAtUserLocation = hasLocationSupport() && Store.get('startAtUserLocation')
    settings.startAtLastLocation = Store.get('startAtLastLocation')
    settings.isStartLocationMarkerMovable = serverSettings.isStartMarkerMovable && Store.get('isStartLocationMarkerMovable')
    settings.followUserLocation = hasLocationSupport() && Store.get('followUserLocation')

    settings.showBrowserPopups = Store.get('showBrowserPopups')
    settings.playSound = Store.get('playSound')
    settings.upscaleNotifMarkers = Store.get('upscaleNotifMarkers')
    settings.bounceNotifMarkers = Store.get('bounceNotifMarkers')

    settings.mapServiceProvider = Store.get('mapServiceProvider')
    settings.startLocationMarkerStyle = Store.get('startLocationMarkerStyle')
    settings.userLocationMarkerStyle = Store.get('userLocationMarkerStyle')
    settings.darkMode = Store.get('darkMode')

    settings.clusterZoomLevel = isMobileDevice() ? serverSettings.clusterZoomLevelMobile : serverSettings.clusterZoomLevel
}

function initSettingsSidebar() {
    $('#settings-sidenav').sidenav({
        draggable: false
    })

    $('.collapsible').collapsible({
        onOpenStart: function (li) {
            if ($(li).data('formInitialized')) {
                return
            }

            $('select', li).formSelect()
            $(li).data('formInitialized', true)
        }
    })

    const settingsSideNavElem = document.getElementById('settings-sidenav')
    settingsSideNav = M.Sidenav.getInstance(settingsSideNavElem)
    $('.sidenav-trigger[data-target="settings-sidenav"]').on('click', function (e) {
        if (settingsSideNav.isOpen) {
            settingsSideNav.close()
            e.stopPropagation()
        }
    })

    if (serverSettings.pokemons) {
        $('#pokemon-switch').on('change', function () {
            settings.showPokemon = this.checked
            const filtersWrapper = $('.pokemon-filters-wrapper')
            if (this.checked) {
                filtersWrapper.show()
                updateMap({ loadAllPokemon: true })
            } else {
                filtersWrapper.hide()
                updatePokemons()
            }
            Store.set('showPokemon', this.checked)
        })

        $('#filter-pokemon-switch').on('change', function () {
            settings.filterPokemonById = this.checked
            const filterButton = $('a[data-target="pokemon-filter-modal"]')
            if (this.checked) {
                filterButton.show()
                updatePokemons()
            } else {
                filterButton.hide()
                reincludedPokemon = union(reincludedPokemon, settings.excludedPokemon)
                updateMap()
            }
            Store.set('filterPokemonById', this.checked)
        })

        $('#exclude-nearby-cell-switch').on('change', function () {
            settings.excludeNearbyCells = this.checked
            updateMap({ loadAllPokemon: true })
            updatePokemons()
            Store.set('excludeNearbyCells', this.checked)
        })

        $('#pokemon-icon-size-select').on('change', function () {
            const iconSize = Number(this.value)
            settings.pokemonIconSizeModifier = iconSize
            updatePokemons()
            Store.set('pokemonIconSizeModifier', iconSize)
        })
    }

    if (serverSettings.pokemonValues) {
        $('#pokemon-values-switch').on('change', function () {
            settings.showPokemonValues = this.checked
            const filterValuesWrapper = $('#filter-pokemon-values-wrapper')
            if (this.checked) {
                filterValuesWrapper.show()
            } else {
                filterValuesWrapper.hide()
                if (settings.filterPokemonByValues) {
                    updateMap({ loadAllPokemon: true })
                }
            }
            updatePokemons()
            Store.set('showPokemonValues', this.checked)
        })

        $('#filter-values-switch').on('change', function () {
            settings.filterPokemonByValues = this.checked
            const filtersWrapper = $('#pokemon-values-filters-wrapper')
            const filterButton = $('a[data-target="pokemon-values-filter-modal"]')
            if (this.checked) {
                filterButton.show()
                filtersWrapper.show()
                updatePokemons()
            } else {
                filterButton.hide()
                filtersWrapper.hide()
                updateMap({ loadAllPokemon: true })
            }
            Store.set('filterPokemonByValues', this.checked)
        })

        $('#zero-ivs-pokemon-switch').on('change', function () {
            settings.showZeroIvsPokemon = this.checked
            if (this.checked) {
                updateMap({ loadAllPokemon: true })
            } else {
                updatePokemons(new Set(), true)
            }
            Store.set('showZeroIvsPokemon', this.checked)
        })

        $('#hundo-ivs-pokemon-switch').on('change', function () {
            settings.showHundoIvsPokemon = this.checked
            if (this.checked) {
                updateMap({ loadAllPokemon: true })
            } else {
                updatePokemons(new Set(), true)
            }
            Store.set('showHundoIvsPokemon', this.checked)
        })

        var pokemonIvsSlider = document.getElementById('pokemon-ivs-slider')
        noUiSlider.create(pokemonIvsSlider, {
            start: [settings.minIvs, settings.maxIvs],
            connect: true,
            step: 1,
            range: {
                min: 0,
                max: 100
            },
            format: {
                to: function (value) {
                    return Math.round(value)
                },
                from: function (value) {
                    return Number(value)
                }
            }
        })
        pokemonIvsSlider.noUiSlider.on('change', function () {
            const oldMinIvs = settings.minIvs
            const oldMaxIvs = settings.maxIvs
            settings.minIvs = this.get()[0]
            settings.maxIvs = this.get()[1]

            $('#pokemon-ivs-slider-title').text(`${i18n('IVs')} (${settings.minIvs}% - ${settings.maxIvs}%)`)
            const zeroIvsWrapper = $('#zero-ivs-pokemon-switch-wrapper')
            const hundoIvsWrapper = $('#hundo-ivs-pokemon-switch-wrapper')
            if (settings.minIvs > 0) {
                zeroIvsWrapper.show()
            } else {
                zeroIvsWrapper.hide()
            }
            if (settings.maxIvs < 100) {
                hundoIvsWrapper.show()
            } else {
                hundoIvsWrapper.hide()
            }

            if (settings.minIvs > oldMinIvs || settings.maxIvs < oldMaxIvs) {
                updatePokemons(new Set(), true)
            } else {
                updateMap({ loadAllPokemon: true })
            }

            Store.set('minIvs', settings.minIvs)
            Store.set('maxIvs', settings.maxIvs)
        })

        var pokemonLevelSlider = document.getElementById('pokemon-level-slider')
        noUiSlider.create(pokemonLevelSlider, {
            start: [settings.minLevel, settings.maxLevel],
            connect: true,
            step: 1,
            range: {
                min: 1,
                max: 35
            },
            format: {
                to: function (value) {
                    return Math.round(value)
                },
                from: function (value) {
                    return Number(value)
                }
            }
        })
        pokemonLevelSlider.noUiSlider.on('change', function () {
            const oldMinLevel = settings.minLevel
            const oldMaxLevel = settings.maxLevel
            settings.minLevel = this.get()[0]
            settings.maxLevel = this.get()[1]
            $('#pokemon-level-slider-title').text(`${i18n('Levels')} (${settings.minLevel} - ${settings.maxLevel})`)

            if (settings.minLevel > oldMinLevel || settings.maxLevel < oldMaxLevel) {
                updatePokemons(new Set(), true)
            } else {
                updateMap({ loadAllPokemon: true })
            }

            Store.set('minLevel', settings.minLevel)
            Store.set('maxLevel', settings.maxLevel)
        })
    }

    if (serverSettings.rarity) {
        $('#rarity-select').on('change', function () {
            const oldIncludedRarities = settings.includedRarities
            settings.includedRarities = $(this).val().map(Number)
            if (settings.includedRarities.length < oldIncludedRarities.length) {
                updatePokemons()
            } else {
                updateMap({ loadAllPokemon: true })
            }
            Store.set('includedRarities', settings.includedRarities)
        })

        $('#scale-rarity-switch').on('change', function () {
            settings.scaleByRarity = this.checked
            updatePokemons()
            Store.set('scaleByRarity', this.checked)
        })
    }

    if (serverSettings.gyms) {
        $('#gym-switch').on('change', function () {
            settings.showGyms = this.checked
            const filtersWrapper = $('#gym-filters-wrapper')
            const nameFilterSidebarWrapper = $('#gym-name-filter-sidebar-wrapper')
            if (this.checked) {
                if (serverSettings.gymFilters) {
                    filtersWrapper.show()
                }
                if (!settings.showRaids) {
                    nameFilterSidebarWrapper.show()
                }
                updateMap({ loadAllGyms: true })
            } else {
                if (serverSettings.gymFilters) {
                    filtersWrapper.hide()
                }
                if (!settings.showRaids) {
                    nameFilterSidebarWrapper.hide()
                }
                updateGyms()
            }
            Store.set('showGyms', this.checked)
        })
    }

    if (serverSettings.gymSidebar) {
        $('#gym-sidebar-switch').on('change', function () {
            settings.useGymSidebar = this.checked
            if (!this.checked && gymSidebar.isOpen) {
                gymSidebar.close()
            }
            readdGymMarkers()
            Store.set('useGymSidebar', this.checked)
        })
    }

    if (serverSettings.gymFilters) {
        $('#gym-name-filter').on('keyup', function () {
            $gymNameFilter = this.value.match(/[.*+?^${}()|[\]\\]/g) ? this.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : this.value
            console.log($gymNameFilter)
            updateGyms()
            updateMap({ loadAllGyms: true })
        })

        $('#gym-team-select').on('change', function () {
            const oldIncludedGymTeams = settings.includedGymTeams
            settings.includedGymTeams = $(this).val().map(Number)
            if (settings.includedGymTeams.length < oldIncludedGymTeams.length) {
                updateGyms()
            } else {
                updateMap({ loadAllGyms: true })
            }
            Store.set('includedGymTeams', settings.includedGymTeams)
        })

        var gymLevelSlider = document.getElementById('gym-level-slider')
        noUiSlider.create(gymLevelSlider, {
            start: [settings.minGymLevel, settings.maxGymLevel],
            connect: true,
            step: 1,
            range: {
                min: 0,
                max: 6
            },
            format: {
                to: function (value) {
                    return Math.round(value)
                },
                from: function (value) {
                    return Number(value)
                }
            }
        })
        gymLevelSlider.noUiSlider.on('change', function () {
            const oldMinLevel = settings.minGymLevel
            const oldMaxLevel = settings.maxGymLevel
            settings.minGymLevel = this.get()[0]
            settings.maxGymLevel = this.get()[1]
            $('#gym-level-slider-title').text(`${i18n('Gym levels')} (${settings.minGymLevel} - ${settings.maxGymLevel})`)

            if (settings.minGymLevel > oldMinLevel || settings.maxGymLevel < oldMaxLevel) {
                updateGyms()
            } else {
                updateMap({ loadAllGyms: true })
            }

            Store.set('minGymLevel', settings.minGymLevel)
            Store.set('maxGymLevel', settings.maxGymLevel)
        })

        $('#gym-open-spot-switch').on('change', function () {
            settings.showOpenSpotGymsOnly = this.checked
            if (this.checked) {
                updateGyms()
            } else {
                updateMap({ loadAllGyms: true })
            }
            Store.set('showOpenSpotGymsOnly', this.checked)
        })

        $('#gym-ex-eligible-switch').on('change', function () {
            settings.showExGymsOnly = this.checked
            if (this.checked) {
                updateGyms()
            } else {
                updateMap({ loadAllGyms: true })
            }
            Store.set('showExGymsOnly', this.checked)
        })

        $('#gym-in-battle-switch').on('change', function () {
            settings.showInBattleGymsOnly = this.checked
            if (this.checked) {
                updateGyms()
            } else {
                updateMap({ loadAllGyms: true })
            }
            Store.set('showInBattleGymsOnly', this.checked)
        })

        $('#gym-last-scanned-select').on('change', function () {
            const oldGymLastScannedHours = settings.gymLastScannedHours
            settings.gymLastScannedHours = this.value
            if ((settings.gymLastScannedHours < oldGymLastScannedHours &&
                    !settings.gymLastScannedHours === 0) || oldGymLastScannedHours === 0) {
                updateGyms()
            } else {
                updateMap({ loadAllGyms: true })
            }
            Store.set('gymLastScannedHours', this.value)
        })
    }

    if (serverSettings.raids) {
        $('#raid-switch').on('change', function () {
            settings.showRaids = this.checked
            const filtersWrapper = $('#raid-filters-wrapper')
            const nameFilterSidebarWrapper = $('#gym-name-filter-sidebar-wrapper')
            if (this.checked) {
                if (serverSettings.raidFilters) {
                    filtersWrapper.show()
                }
                if (!settings.showGyms) {
                    nameFilterSidebarWrapper.show()
                }
                if (settings.showGyms) {
                    updateGyms()
                }
                updateMap({ loadAllGyms: true })
            } else {
                if (serverSettings.raidFilters) {
                    filtersWrapper.hide()
                }
                if (!settings.showGyms) {
                    nameFilterSidebarWrapper.hide()
                }
                updateGyms()
            }
            Store.set('showRaids', this.checked)
        })
    }

    if (serverSettings.raidFilters) {
        $('#filter-raid-pokemon-switch').on('change', function () {
            settings.filterRaidPokemon = this.checked
            const filterButton = $('a[data-target="raid-pokemon-filter-modal"]')
            if (this.checked) {
                filterButton.show()
                updateGyms()
            } else {
                filterButton.hide()
                if (settings.showGyms) {
                    updateGyms()
                }
                updateMap({ loadAllGyms: true })
            }
            Store.set('filterRaidPokemon', this.checked)
        })

        $('#raid-active-switch').on('change', function () {
            settings.showActiveRaidsOnly = this.checked
            if (this.checked) {
                updateGyms()
            } else {
                if (settings.showGyms) {
                    updateGyms()
                }
                updateMap({ loadAllGyms: true })
            }
            Store.set('showActiveRaidsOnly', this.checked)
        })

        $('#raid-ex-eligible-switch').on('change', function () {
            settings.showExEligibleRaidsOnly = this.checked
            if (this.checked) {
                updateGyms()
            } else {
                if (settings.showGyms) {
                    updateGyms()
                }
                updateMap({ loadAllGyms: true })
            }
            Store.set('showExEligibleRaidsOnly', this.checked)
        })

        $('#raid-level-select').on('change', function () {
            const oldIncludedRaidLevels = settings.includedRaidLevels
            settings.includedRaidLevels = $(this).val().map(Number)
            if (settings.includedRaidLevels.length < oldIncludedRaidLevels.length) {
                updateGyms()
            } else {
                if (settings.showGyms) {
                    updateGyms()
                }
                updateMap({ loadAllGyms: true })
            }
            Store.set('includedRaidLevels', settings.includedRaidLevels)
        })
    }

    if (serverSettings.pokestops) {
        $('#pokestop-switch').on('change', function () {
            settings.showPokestops = this.checked
            const filtersWrapper = $('.pokestop-filters-wrapper')
            if (this.checked) {
                filtersWrapper.show()
                updateMap({ loadAllPokestops: true })
            } else {
                filtersWrapper.hide()
                updatePokestops()
            }
            Store.set('showPokestops', this.checked)
        })

        $('#pokestop-no-event-switch').on('change', function () {
            settings.showPokestopsNoEvent = this.checked
            if (this.checked) {
                updateMap({ loadAllPokestops: true })
            } else {
                updatePokestops()
            }
            Store.set('showPokestopsNoEvent', this.checked)
        })

        $('#pokestop-name-filter').on('keyup', function () {
            // eslint-disable-next-line
            $pokestopNameFilter = this.value.match(/[.*+?^${}()|[\]\\]/g) ? this.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : this.value
            updatePokestops()
            updateMap({ loadAllPokestops: true })
        })
    }

    if (serverSettings.quests) {
        $('#quest-switch').on('change', function () {
            settings.showQuests = this.checked
            const wrapper = $('#filter-quests-switch-wrapper')
            if (this.checked) {
                wrapper.show()
            } else {
                wrapper.hide()
            }
            updatePokestops()
            updateMap({ loadAllPokestops: true })
            Store.set('showQuests', this.checked)
        })

        $('#filter-quests-switch').on('change', function () {
            settings.filterQuests = this.checked
            const filterButton = $('a[data-target="quest-filter-modal"]')
            if (this.checked) {
                filterButton.show()
            } else {
                filterButton.hide()
            }
            const wrapper = $('#filter-quests-form-wrapper')
            if (this.checked) {
                wrapper.show()
            } else {
                wrapper.hide()
            }
            updatePokestops()
            updateMap({ loadAllPokestops: true })
            Store.set('filterQuests', this.checked)
        })
    }

    if (serverSettings.invasions) {
        $('#invasion-switch').on('change', function () {
            settings.showInvasions = this.checked
            const wrapper = $('#filter-invasions-switch-wrapper')
            if (this.checked) {
                wrapper.show()
            } else {
                wrapper.hide()
            }
            updatePokestops()
            updateMap({ loadAllPokestops: true })
            Store.set('showInvasions', this.checked)
        })

        $('#filter-invasions-switch').on('change', function () {
            settings.filterInvasions = this.checked
            const filterButton = $('a[data-target="invasion-filter-modal"]')
            if (this.checked) {
                filterButton.show()
            } else {
                filterButton.hide()
            }
            updatePokestops()
            updateMap({ loadAllPokestops: true })
            Store.set('filterInvasions', this.checked)
        })
    }

    if (serverSettings.lures) {
        $('#lure-type-select').on('change', function () {
            settings.includedLureTypes = $(this).val().map(Number)
            updatePokestops()
            updateMap({ loadAllPokestops: true })
            Store.set('includedLureTypes', settings.includedLureTypes)
        })
    }

    if (serverSettings.weather) {
        $('#weather-switch').on('change', function () {
            settings.showWeather = this.checked
            const formsWrapper = $('#weather-forms-wrapper')
            if (this.checked) {
                formsWrapper.show()
                updateMap({ loadAllWeather: true })
            } else {
                formsWrapper.hide()
                updateWeathers()
                if (settings.showMainWeather) {
                    $('#weather-button').hide()
                }
            }
            Store.set('showWeather', this.checked)
        })

        $('#main-weather-switch').on('change', function () {
            settings.showMainWeather = this.checked
            if (this.checked) {
                updateWeatherButton()
            } else {
                $('#weather-button').hide()
            }
            Store.set('showMainWeather', this.checked)
        })

        $('#weather-cells-switch').on('change', function () {
            settings.showWeatherCells = this.checked
            updateWeathers()
            Store.set('showWeatherCells', this.checked)
        })
    }

    if (serverSettings.spawnpoints) {
        $('#spawnpoint-switch').on('change', function () {
            settings.showSpawnpoints = this.checked
            if (this.checked) {
                updateMap({ loadAllSpawnpoints: true })
            } else {
                updateSpawnpoints()
            }
            Store.set('showSpawnpoints', this.checked)
        })
    }

    if (serverSettings.scannedLocs) {
        $('#scanned-locs-switch').on('change', function () {
            settings.showScannedLocations = this.checked
            if (this.checked) {
                updateMap({ loadAllScannedLocs: true })
            } else {
                updateScannedLocations()
            }
            Store.set('showScannedLocations', this.checked)
        })
    }

    if (serverSettings.nests) {
        $('#nest-switch').on('change', function () {
            settings.showNests = this.checked
            if (this.checked) {
                updateMap({ loadAllNests: true })
            } else {
                updateNests()
            }
            Store.set('showNests', this.checked)
        })
    }

    if (serverSettings.nestParks) {
        $('#nest-park-switch').on('change', function () {
            settings.showNestParks = this.checked
            if (this.checked) {
                updateNestParks()
            } else {
                nestParksLayerGroup.clearLayers()
            }
            Store.set('showNestParks', this.checked)
        })
    }

    if (serverSettings.exParks) {
        $('#ex-park-switch').on('change', function () {
            settings.showExParks = this.checked
            if (this.checked) {
                updateExParks()
            } else {
                exParksLayerGroup.clearLayers()
            }
            Store.set('showExParks', this.checked)
        })
    }

    if (serverSettings.s2Cells) {
        $('#s2-cell-switch').on('change', function () {
            settings.showS2Cells = this.checked
            const filtersWrapper = $('#s2-filters-wrapper')
            if (this.checked) {
                filtersWrapper.show()
                updateS2Overlay()
            } else {
                filtersWrapper.hide()
                s2CellsLayerGroup.clearLayers()
            }
            Store.set('showS2Cells', this.checked)
        })

        $('#s2-level10-switch').on('change', function () {
            settings.showS2CellsLevel10 = this.checked
            updateS2Overlay()
            Store.set('showS2CellsLevel10', this.checked)
        })

        $('#s2-level11-switch').on('change', function () {
            settings.showS2CellsLevel11 = this.checked
            updateS2Overlay()
            Store.set('showS2CellsLevel11', this.checked)
        })

        $('#s2-level12-switch').on('change', function () {
            settings.showS2CellsLevel12 = this.checked
            updateS2Overlay()
            Store.set('showS2CellsLevel12', this.checked)
        })

        $('#s2-level13-switch').on('change', function () {
            settings.showS2CellsLevel13 = this.checked
            updateS2Overlay()
            Store.set('showS2CellsLevel13', this.checked)
        })

        $('#s2-level14-switch').on('change', function () {
            settings.showS2CellsLevel14 = this.checked
            updateS2Overlay()
            Store.set('showS2CellsLevel14', this.checked)
        })

        $('#s2-level15-switch').on('change', function () {
            settings.showS2CellsLevel15 = this.checked
            updateS2Overlay()
            Store.set('showS2CellsLevel15', this.checked)
        })

        $('#s2-level16-switch').on('change', function () {
            settings.showS2CellsLevel16 = this.checked
            updateS2Overlay()
            Store.set('showS2CellsLevel16', this.checked)
        })

        $('#s2-level17-switch').on('change', function () {
            settings.showS2CellsLevel17 = this.checked
            updateS2Overlay()
            Store.set('showS2CellsLevel17', this.checked)
        })

        $('#s2-cells-warning-switch').on('change', function () {
            settings.warnHiddenS2Cells = this.checked
            Store.set('warnHiddenS2Cells', this.checked)
        })
    }

    if (serverSettings.ranges) {
        $('#ranges-switch').on('change', function () {
            settings.showRanges = this.checked
            const rangeTypeWrapper = $('#range-type-select-wrapper')
            if (this.checked) {
                rangeTypeWrapper.show()
            } else {
                rangeTypeWrapper.hide()
            }
            if (settings.includedRangeTypes.includes(1)) {
                updatePokemons()
            }
            if (settings.includedRangeTypes.includes(2)) {
                updateGyms()
            }
            if (settings.includedRangeTypes.includes(3)) {
                updatePokestops()
            }
            if (settings.includedRangeTypes.includes(4)) {
                updateSpawnpoints()
            }
            Store.set('showRanges', this.checked)
        })

        $('#range-type-select').on('change', function () {
            const oldIncludedRangeTypes = settings.includedRangeTypes
            settings.includedRangeTypes = $(this).val().map(Number)
            if (settings.includedRangeTypes.includes(1) !== oldIncludedRangeTypes.includes(1)) {
                updatePokemons()
            } else if (settings.includedRangeTypes.includes(2) !== oldIncludedRangeTypes.includes(2)) {
                updateGyms()
            } else if (settings.includedRangeTypes.includes(3) !== oldIncludedRangeTypes.includes(3)) {
                updatePokestops()
            } else if (settings.includedRangeTypes.includes(4) !== oldIncludedRangeTypes.includes(4)) {
                updateSpawnpoints()
            }
            Store.set('includedRangeTypes', settings.includedRangeTypes)
        })
    }

    if (hasLocationSupport()) {
        $('#start-at-user-location-switch').on('change', function () {
            settings.startAtUserLocation = this.checked
            if (settings.startAtLastLocation && this.checked) {
                $('#start-at-last-location-switch').prop('checked', false)
                settings.startAtLastLocation = false
                Store.set('startAtLastLocation', false)
            }
            Store.set('startAtUserLocation', this.checked)
        })
    } else {
        $('#start-at-user-location-wrapper').hide()
    }

    $('#start-at-last-location-switch').on('change', function () {
        settings.startAtLastLocation = this.checked
        if (this.checked) {
            if (settings.startAtUserLocation) {
                $('#start-at-user-location-switch').prop('checked', false)
                settings.startAtUserLocation = false
                Store.set('startAtUserLocation', false)
            }

            const position = map.getCenter()
            Store.set('startAtLastLocationPosition', {
                lat: position.lat,
                lng: position.lng
            })
        }
        Store.set('startAtLastLocation', this.checked)
    })

    if (serverSettings.isStartMarkerMovable) {
        $('#lock-start-marker-switch').on('change', function () {
            settings.isStartLocationMarkerMovable = !this.checked
            if (startLocationMarker) {
                if (this.checked) {
                    startLocationMarker.dragging.disable()
                } else {
                    startLocationMarker.dragging.enable()
                }
            }
            Store.set('isStartLocationMarkerMovable', !this.checked)
        })
    }

    if (hasLocationSupport()) {
        $('#follow-user-location-switch').on('change', function () {
            settings.followUserLocation = this.checked
            if (this.checked) {
                startFollowingUser()
            } else {
                stopFollowingUser()
            }
            Store.set('followUserLocation', this.checked)
        })
    } else {
        $('#follow-user-location-wrapper').hide()
    }

    if (serverSettings.pokemons) {
        $('#pokemon-notifs-switch').on('change', function () {
            settings.pokemonNotifs = this.checked
            const wrapper = $('#pokemon-notif-filters-wrapper')
            if (this.checked) {
                wrapper.show()
                if (settings.showNotifPokemonAlways) {
                    updateMap({ loadAllPokemon: true })
                }
            } else {
                wrapper.hide()
                if (settings.showNotifPokemonOnly) {
                    updateMap({ loadAllPokemon: true })
                }
            }
            updatePokemons()
            Store.set('pokemonNotifs', this.checked)
        })

        $('#pokemon-id-notifs-switch').on('change', function () {
            settings.pokemonIdNotifs = this.checked
            const filterButton = $('a[data-target="notif-pokemon-filter-modal"]')
            if (this.checked) {
                filterButton.show()
                if (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways) {
                    updateMap({ loadAllPokemon: true })
                }
            } else {
                filterButton.hide()
            }
            updatePokemons()
            Store.set('pokemonIdNotifs', this.checked)
        })
    }

    if (serverSettings.pokemonValues) {
        $('#pokemon-values-notifs-switch').on('change', function () {
            settings.pokemonValuesNotifs = this.checked
            const wrapper = $('#pokemon-values-notif-filters-wrapper')
            const filterButton = $('a[data-target="notif-pokemon-values-filter-modal"]')
            if (this.checked) {
                wrapper.show()
                filterButton.show()
                if (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways) {
                    updateMap({ loadAllPokemon: true })
                }
            } else {
                wrapper.hide()
                filterButton.hide()
            }
            updatePokemons(new Set(), true)
            Store.set('pokemonValuesNotifs', this.checked)
        })

        $('#zero-ivs-pokemon-notifs-switch').on('change', function () {
            settings.zeroIvsPokemonNotifs = this.checked
            if (this.checked && (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways)) {
                updateMap({ loadAllPokemon: true })
            }
            updatePokemons(new Set(), true)
            Store.set('zeroIvsPokemonNotifs', this.checked)
        })

        $('#hundo-ivs-pokemon-notifs-switch').on('change', function () {
            settings.hundoIvsPokemonNotifs = this.checked
            if (this.checked && (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways)) {
                updateMap({ loadAllPokemon: true })
            }
            updatePokemons(new Set(), true)
            Store.set('hundoIvsPokemonNotifs', this.checked)
        })

        var pokemonIvsNotifsSlider = document.getElementById('pokemon-ivs-notifs-slider')
        noUiSlider.create(pokemonIvsNotifsSlider, {
            start: [settings.minNotifIvs, settings.maxNotifIvs],
            connect: true,
            step: 1,
            range: {
                min: 0,
                max: 100
            },
            format: {
                to: function (value) {
                    return Math.round(value)
                },
                from: function (value) {
                    return Number(value)
                }
            }
        })
        pokemonIvsNotifsSlider.noUiSlider.on('change', function () {
            const oldMinIvs = settings.minNotifIvs
            const oldMaxIvs = settings.maxNotifIvs
            settings.minNotifIvs = this.get()[0]
            settings.maxNotifIvs = this.get()[1]

            $('#pokemon-ivs-notifs-slider-title').text(`${i18n('Notif IVs')} (${settings.minNotifIvs}% - ${settings.maxNotifIvs}%)`)
            const zeroIvsWrapper = $('#zero-ivs-pokemon-notifs-switch-wrapper')
            const hundoIvsWrapper = $('#hundo-ivs-pokemon-notifs-switch-wrapper')
            if (settings.minNotifIvs > 0) {
                zeroIvsWrapper.show()
            } else {
                zeroIvsWrapper.hide()
            }
            if (settings.maxNotifIvs < 100) {
                hundoIvsWrapper.show()
            } else {
                hundoIvsWrapper.hide()
            }

            if ((settings.minNotifIvs < oldMinIvs || settings.maxNotifIvs > oldMaxIvs) &&
                    (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways)) {
                updateMap({ loadAllPokemon: true })
            }
            updatePokemons(new Set(), true)

            Store.set('minNotifIvs', settings.minNotifIvs)
            Store.set('maxNotifIvs', settings.maxNotifIvs)
        })

        var pokemonLevelNotifsSlider = document.getElementById('pokemon-level-notifs-slider')
        noUiSlider.create(pokemonLevelNotifsSlider, {
            start: [settings.minNotifLevel, settings.maxNotifLevel],
            connect: true,
            step: 1,
            range: {
                min: 1,
                max: 35
            },
            format: {
                to: function (value) {
                    return Math.round(value)
                },
                from: function (value) {
                    return Number(value)
                }
            }
        })
        pokemonLevelNotifsSlider.noUiSlider.on('change', function () {
            const oldMinLevel = settings.minNotifLevel
            const oldMaxLevel = settings.maxNotifLevel
            settings.minNotifLevel = this.get()[0]
            settings.maxNotifLevel = this.get()[1]
            $('#pokemon-level-notifs-slider-title').text(`${i18n('Notif Levels')} (${settings.minNotifLevel} - ${settings.maxNotifLevel})`)

            if ((settings.minNotifLevel < oldMinLevel || settings.maxNotifLevel > oldMaxLevel) &&
                    (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways)) {
                updateMap({ loadAllPokemon: true })
            }
            updatePokemons(new Set(), true)

            Store.set('minNotifLevel', settings.minNotifLevel)
            Store.set('maxNotifLevel', settings.maxNotifLevel)
        })

        $('#tiny-rattata-notifs-switch').on('change', function () {
            settings.tinyRattataNotifs = this.checked
            if (this.checked && (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways)) {
                reincludedPokemon.add(19)
                updateMap()
            }
            updatePokemons(new Set([19]), true)
            Store.set('tinyRattataNotifs', this.checked)
        })

        $('#big-magikarp-notifs-switch').on('change', function () {
            settings.bigMagikarpNotifs = this.checked
            if (this.checked && (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways)) {
                reincludedPokemon.add(129)
                updateMap()
            }
            updatePokemons(new Set([129]), true)
            Store.set('bigMagikarpNotifs', this.checked)
        })
    }

    if (serverSettings.rarity) {
        $('#rarity-notifs-select').on('change', function () {
            const oldNotifRarities = settings.notifRarities
            settings.notifRarities = $(this).val().map(Number)
            if (settings.notifRarities.length > oldNotifRarities.length &&
                    (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways)) {
                updateMap({ loadAllPokemon: true })
            }
            updatePokemons()
            Store.set('notifRarities', settings.notifRarities)
        })
    }

    if (serverSettings.pokemons) {
        $('#notif-pokemon-only-switch').on('change', function () {
            settings.showNotifPokemonOnly = this.checked
            if (this.checked) {
                updatePokemons()
            } else {
                updateMap({ loadAllPokemon: true })
            }
            Store.set('showNotifPokemonOnly', this.checked)
        })

        $('#notif-pokemon-always-switch').on('change', function () {
            settings.showNotifPokemonAlways = this.checked
            if (this.checked) {
                updateMap({ loadAllPokemon: true })
            } else {
                updatePokemons()
            }
            Store.set('showNotifPokemonAlways', this.checked)
        })
    }

    if (serverSettings.pokemonCries) {
        $('#pokemon-cries-switch').on('change', function () {
            settings.playCries = this.checked
            Store.set('playCries', this.checked)
        })
    }

    if (serverSettings.raids) {
        $('#raid-notifs-switch').on('change', function () {
            settings.raidNotifs = this.checked
            const wrapper = $('#raid-notif-filters-wrapper')
            if (this.checked) {
                wrapper.show()
            } else {
                wrapper.hide()
            }
            updateGyms()
            Store.set('raidNotifs', this.checked)
        })

        $('#raid-pokemon-notifs-switch').on('change', function () {
            settings.raidPokemonNotifs = this.checked
            const filterButton = $('a[data-target="notif-raid-pokemon-filter-modal"]')
            if (this.checked) {
                filterButton.show()
            } else {
                filterButton.hide()
            }
            updateGyms()
            Store.set('raidPokemonNotifs', this.checked)
        })

        $('#egg-notifs-select').on('change', function () {
            settings.notifEggs = $(this).val().map(Number)
            updateGyms()
            Store.set('notifEggs', settings.notifEggs)
        })
    }

    if (serverSettings.quests || serverSettings.invasions || serverSettings.lures) {
        $('#pokestop-notifs-switch').on('change', function () {
            settings.pokestopNotifs = this.checked
            const wrapper = $('#pokestop-notif-filters-wrapper')
            if (this.checked) {
                wrapper.show()
            } else {
                wrapper.hide()
            }
            updatePokestops()
            Store.set('pokestopNotifs', this.checked)
        })
    }

    if (serverSettings.quests) {
        $('#quest-notifs-switch').on('change', function () {
            settings.questNotifs = this.checked
            const filterButton = $('a[data-target="notif-quest-filter-modal"]')
            if (this.checked) {
                filterButton.show()
            } else {
                filterButton.hide()
            }
            updatePokestops()
            Store.set('questNotifs', this.checked)
        })
    }

    if (serverSettings.invasions) {
        $('#invasion-notifs-switch').on('change', function () {
            settings.invasionNotifs = this.checked
            const filterButton = $('a[data-target="notif-invasion-filter-modal"]')
            if (this.checked) {
                filterButton.show()
            } else {
                filterButton.hide()
            }
            updatePokestops()
            Store.set('invasionNotifs', this.checked)
        })
    }

    if (serverSettings.lures) {
        $('#lure-notifs-select').on('change', function () {
            settings.notifLureTypes = $(this).val().map(Number)
            updatePokestops()
            Store.set('notifLureTypes', settings.notifLureTypes)
        })
    }

    $('#browser-popups-switch').on('change', function () {
        settings.showBrowserPopups = this.checked
        Store.set('showBrowserPopups', this.checked)
    })

    $('#notif-sound-switch').on('change', function () {
        settings.playSound = this.checked
        const criesWrapper = $('#pokemon-cries-switch-wrapper')
        if (this.checked) {
            criesWrapper.show()
        } else {
            criesWrapper.hide()
        }
        Store.set('playSound', this.checked)
    })

    $('#upscale-notif-markers-switch').on('change', function () {
        settings.upscaleNotifMarkers = this.checked
        if (settings.pokemonNotifs) {
            updatePokemons()
        }
        if (settings.raidNotifs) {
            updateGyms()
        }
        if (settings.pokestopNotifs) {
            updatePokestops()
        }
        Store.set('upscaleNotifMarkers', this.checked)
    })

    $('#bounce-notif-markers-switch').on('change', function () {
        settings.bounceNotifMarkers = this.checked
        if (settings.pokemonNotifs) {
            updatePokemons()
        }
        if (settings.raidNotifs) {
            updateGyms()
        }
        if (settings.pokestopNotifs) {
            updatePokestops()
        }
        Store.set('bounceNotifMarkers', this.checked)
    })

    $('#map-style-select').on('change', function () {
        setTileLayer(this.value, map)
        Store.set('mapStyle', this.value)
    })

    $('#quest-form-filter').on('change', function () {
        setQuestFormFilter(this.value)
        Store.set('questFormFilter', this.value)
    })

    $('#map-service-provider-select').on('change', function () {
        settings.mapServiceProvider = this.value
        if (settings.showPokemon) {
            updatePokemons()
        }
        if (settings.showGyms || settings.showRaids) {
            updateGyms()
        }
        if (settings.showPokestops) {
            updatePokestops()
        }
        if (settings.showSpawnpoints) {
            updateSpawnpoints()
        }
        Store.set('mapServiceProvider', this.value)
    })

    $('#start-location-marker-icon-select').on('change', function () {
        settings.startLocationMarkerStyle = this.value
        updateStartLocationMarker()
        Store.set('startLocationMarkerStyle', this.value)
    })

    $('#user-location-marker-icon-select').on('change', function () {
        settings.userLocationMarkerStyle = this.value
        updateUserLocationMarker()
        Store.set('userLocationMarkerStyle', this.value)
    })

    $('#dark-mode-switch').on('change', function () {
        settings.darkMode = this.checked
        if (this.checked) {
            enableDarkMode()
        } else {
            disableDarkMode()
        }
        Store.set('darkMode', this.checked)
    })

    $('#settings-file-input').on('change', function () {
        function loaded(e) {
            const confirmed = confirm('Are you sure you want to import settings?')
            if (!confirmed) {
                return
            }

            const fileString = e.target.result
            Object.assign(localStorage, JSON.parse(fileString))
            window.location.reload()
        }

        function error(e) {
            console.error('Error while loading settings file: ' + e)
            toastError(i18n('Error while loading settings file!'), i18n('Please try again.'))
        }

        const elem = document.getElementById('settings-file-input')
        if (elem.value !== '') {
            const file = elem.files[0]
            loadData(file, loaded, error)
            // Reset file input.
            $(this).val('')
        }
    })

    $('#export-settings-button').on('click', function () {
        downloadData('rocketmad_settings', JSON.stringify(localStorage))
    })

    $('#reset-settings-button').on('click', function () {
        const confirmed = confirm('Are you sure you want to reset all settings to default values?')
        if (confirmed) {
            localStorage.clear()
            window.location.reload()
        }
    })

    // Pokemon.
    if (serverSettings.pokemons) {
        $('#pokemon-switch').prop('checked', settings.showPokemon)
        $('.pokemon-filters-wrapper').toggle(settings.showPokemon)
        $('#filter-pokemon-switch').prop('checked', settings.filterPokemonById)
        $('a[data-target="pokemon-filter-modal"]').toggle(settings.filterPokemonById)
        $('#pokemon-icon-size-select').val(settings.pokemonIconSizeModifier)
        $('#exclude-nearby-cell-switch').prop('checked', settings.excludeNearbyCells)
    }
    if (serverSettings.pokemonValues) {
        $('#pokemon-values-switch').prop('checked', settings.showPokemonValues)
        $('#filter-pokemon-values-wrapper').toggle(settings.showPokemonValues)
        $('#filter-values-switch').prop('checked', settings.filterPokemonByValues)
        $('a[data-target="pokemon-values-filter-modal"]').toggle(settings.filterPokemonByValues)
        $('#pokemon-values-filters-wrapper').toggle(settings.filterPokemonByValues)
        $('#pokemon-ivs-slider-title').text(`${i18n('IVs')} (${settings.minIvs}% - ${settings.maxIvs}%)`)
        $('#pokemon-ivs-slider-wrapper').toggle(settings.filterPokemonByValues)
        $('#zero-ivs-pokemon-switch').prop('checked', settings.showZeroIvsPokemon)
        $('#zero-ivs-pokemon-switch-wrapper').toggle(settings.minIvs > 0)
        $('#hundo-ivs-pokemon-switch').prop('checked', settings.showHundoIvsPokemon)
        $('#hundo-ivs-pokemon-switch-wrapper').toggle(settings.maxIvs < 100)
        $('#pokemon-level-slider-title').text(`${i18n('Levels')} (${settings.minLevel} - ${settings.maxLevel})`)
        $('#pokemon-level-slider-wrapper').toggle(settings.filterPokemonByValues)
    }
    if (serverSettings.rarity) {
        $('#rarity-select').val(settings.includedRarities)
        $('#rarity-notifs-select').val(settings.notifRarities)
        $('#scale-rarity-switch').prop('checked', settings.scaleByRarity)
    }

    // Gyms and Raids.
    if (serverSettings.gyms || serverSettings.raids) {
        $('#gym-name-filter-sidebar-wrapper').toggle(settings.showGyms || settings.showRaids)
        if (serverSettings.gym_sidebar) {
            $('#gym-sidebar-switch').prop('checked', settings.useGymSidebar)
        }
    }
    if (serverSettings.gymSidebar) {
        $('#gym-sidebar-switch').prop('checked', settings.useGymSidebar)
    }
    if (serverSettings.gyms) {
        $('#gym-switch').prop('checked', settings.showGyms)
    }
    if (serverSettings.gymFilters) {
        $('#gym-filters-wrapper').toggle(settings.showGyms)
        $('#gym-team-select').val(settings.includedGymTeams)
        $('#gym-level-slider-title').text(`${$('#gym-level-slider-title').text()} (${settings.minGymLevel} - ${settings.maxGymLevel})`)
        $('#gym-open-spot-switch').prop('checked', settings.showOpenSpotGymsOnly)
        $('#gym-ex-eligible-switch').prop('checked', settings.showExGymsOnly)
        $('#gym-in-battle-switch').prop('checked', settings.showInBattleGymsOnly)
        $('#gym-last-scanned-select').val(settings.gymLastScannedHours)
    }
    if (serverSettings.raids) {
        $('#raid-switch').prop('checked', settings.showRaids)
    }
    if (serverSettings.raidFilters) {
        $('#filter-raid-pokemon-switch').prop('checked', settings.filterRaidPokemon)
        $('a[data-target="raid-pokemon-filter-modal"]').toggle(settings.filterRaidPokemon)
        $('#raid-filters-wrapper').toggle(settings.showRaids)
        $('#raid-active-switch').prop('checked', settings.showActiveRaidsOnly)
        $('#raid-ex-eligible-switch').prop('checked', settings.showExEligibleRaidsOnly)
        $('#raid-level-select').val(settings.includedRaidLevels)
    }

    // Pokestops.
    if (serverSettings.pokestops) {
        $('#pokestop-switch').prop('checked', settings.showPokestops)
        $('.pokestop-filters-wrapper').toggle(settings.showPokestops)
        $('#pokestop-no-event-switch').prop('checked', settings.showPokestopsNoEvent)
    }
    if (serverSettings.quests) {
        $('#quest-switch').prop('checked', settings.showQuests)
        $('#filter-quests-switch-wrapper').toggle(settings.showQuests)
        $('#filter-quests-switch').prop('checked', settings.filterQuests)
        $('a[data-target="quest-filter-modal"]').toggle(settings.filterQuests)
        $('#quest-form-filter').val(settings.questFormFilter)
    }
    if (serverSettings.invasions) {
        $('#invasion-switch').prop('checked', settings.showInvasions)
        $('#filter-invasions-switch-wrapper').toggle(settings.showInvasions)
        $('#filter-invasions-switch').prop('checked', settings.filterInvasions)
        $('a[data-target="invasion-filter-modal"]').toggle(settings.filterInvasions)
    }
    if (serverSettings.lures) {
        $('#lure-type-select').val(settings.includedLureTypes)
    }

    // Weather.
    if (serverSettings.weather) {
        $('#weather-switch').prop('checked', settings.showWeather)
        $('#weather-forms-wrapper').toggle(settings.showWeather)
        $('#weather-cells-switch').prop('checked', settings.showWeatherCells)
        $('#main-weather-switch').prop('checked', settings.showMainWeather)
    }

    // Map.
    if (serverSettings.spawnpoints) {
        $('#spawnpoint-switch').prop('checked', settings.showSpawnpoints)
    }
    if (serverSettings.scannedLocs) {
        $('#scanned-locs-switch').prop('checked', settings.showScannedLocations)
    }
    if (serverSettings.nests) {
        $('#nest-switch').prop('checked', settings.showNests)
    }
    if (serverSettings.nestParks) {
        $('#nest-park-switch').prop('checked', settings.showNestParks)
    }
    if (serverSettings.exParks) {
        $('#ex-park-switch').prop('checked', settings.showExParks)
    }
    if (serverSettings.s2Cells) {
        $('#s2-cell-switch').prop('checked', settings.showS2Cells)
        $('#s2-filters-wrapper').toggle(settings.showS2Cells)
        $('#s2-level10-switch').prop('checked', settings.showS2CellsLevel10)
        $('#s2-level11-switch').prop('checked', settings.showS2CellsLevel11)
        $('#s2-level12-switch').prop('checked', settings.showS2CellsLevel12)
        $('#s2-level13-switch').prop('checked', settings.showS2CellsLevel13)
        $('#s2-level14-switch').prop('checked', settings.showS2CellsLevel14)
        $('#s2-level15-switch').prop('checked', settings.showS2CellsLevel15)
        $('#s2-level16-switch').prop('checked', settings.showS2CellsLevel16)
        $('#s2-level17-switch').prop('checked', settings.showS2CellsLevel17)
        $('#s2-cells-warning-switch').prop('checked', settings.warnHiddenS2Cells)
    }
    if (serverSettings.ranges) {
        $('#ranges-switch').prop('checked', settings.showRanges)
        $('#range-type-select-wrapper').toggle(settings.showRanges)
        $('#range-type-select').val(settings.includedRangeTypes)
    }

    // Location.
    if (hasLocationSupport()) {
        $('#start-at-user-location-switch').prop('checked', settings.startAtUserLocation)
    }
    $('#start-at-last-location-switch').prop('checked', settings.startAtLastLocation)
    if (serverSettings.isStartMarkerMovable) {
        $('#lock-start-marker-switch').prop('checked', !settings.isStartLocationMarkerMovable)
    }
    if (hasLocationSupport()) {
        $('#follow-user-location-switch').prop('checked', settings.followUserLocation)
    }

    // Notifications.
    if (serverSettings.pokemons) {
        $('#pokemon-notifs-switch').prop('checked', settings.pokemonNotifs)
        $('#pokemon-id-notifs-switch').prop('checked', settings.pokemonIdNotifs)
        $('a[data-target="notif-pokemon-filter-modal"]').toggle(settings.pokemonIdNotifs)
        $('#pokemon-notif-filters-wrapper').toggle(settings.pokemonNotifs)
        $('#notif-pokemon-only-switch').prop('checked', settings.showNotifPokemonOnly)
        $('#notif-pokemon-always-switch').prop('checked', settings.showNotifPokemonAlways)
    }
    if (serverSettings.pokemonValues) {
        $('#pokemon-values-notifs-switch').prop('checked', settings.pokemonValuesNotifs)
        $('a[data-target="notif-pokemon-values-filter-modal"]').toggle(settings.pokemonValuesNotifs)
        $('#pokemon-values-notif-filters-wrapper').toggle(settings.pokemonValuesNotifs)
        $('#zero-ivs-pokemon-notifs-switch-wrapper').toggle(settings.minNotifIvs > 0)
        $('#zero-ivs-pokemon-notifs-switch').prop('checked', settings.zeroIvsPokemonNotifs)
        $('#hundo-ivs-pokemon-notifs-switch-wrapper').toggle(settings.maxNotifIvs < 100)
        $('#hundo-ivs-pokemon-notifs-switch').prop('checked', settings.hundoIvsPokemonNotifs)
        $('#pokemon-ivs-notifs-slider-title').text(`${i18n('Notif IVs')} (${settings.minNotifIvs}% - ${settings.maxNotifIvs}%)`)
        $('#pokemon-level-notifs-slider-title').text(`${i18n('Notif Levels')} (${settings.minNotifLevel} - ${settings.maxNotifLevel})`)
        $('#tiny-rattata-notifs-switch').prop('checked', settings.tinyRattataNotifs)
        $('#big-magikarp-notifs-switch').prop('checked', settings.bigMagikarpNotifs)
    }
    if (serverSettings.pokemonCries) {
        $('#pokemon-cries-switch').prop('checked', settings.playCries)
        $('#pokemon-cries-switch-wrapper').toggle(settings.playSound)
    }
    if (serverSettings.raids) {
        $('#raid-notifs-switch').prop('checked', settings.raidNotifs)
        $('#raid-notif-filters-wrapper').toggle(settings.raidNotifs)
        $('#raid-pokemon-notifs-switch').prop('checked', settings.raidPokemonNotifs)
        $('a[data-target="notif-raid-pokemon-filter-modal"]').toggle(settings.raidPokemonNotifs)
        $('#egg-notifs-select').val(settings.notifEggs)
    }
    if (serverSettings.quests || serverSettings.invasions || serverSettings.lures) {
        $('#pokestop-notifs-switch').prop('checked', settings.pokestopNotifs)
        $('#pokestop-notif-filters-wrapper').toggle(settings.pokestopNotifs)
    }
    if (serverSettings.quests) {
        $('#quest-notifs-switch').prop('checked', settings.questNotifs)
        $('a[data-target="notif-quest-filter-modal"]').toggle(settings.questNotifs)
    }
    if (serverSettings.invasions) {
        $('#invasion-notifs-switch').prop('checked', settings.invasionNotifs)
        $('a[data-target="notif-invasion-filter-modal"]').toggle(settings.invasionNotifs)
    }
    if (serverSettings.lures) {
        $('#lure-notifs-select').val(settings.notifLureTypes)
    }
    $('#browser-popups-switch').prop('checked', settings.showBrowserPopups)
    $('#notif-sound-switch').prop('checked', settings.playSound)
    $('#upscale-notif-markers-switch').prop('checked', settings.upscaleNotifMarkers)
    $('#bounce-notif-markers-switch').prop('checked', settings.bounceNotifMarkers)

    // Style.
    $('#map-style-select').val(Store.get('mapStyle'))
    $('#map-service-provider-select').val(settings.mapServiceProvider)
    $('#dark-mode-switch').prop('checked', settings.darkMode)

    $.getJSON('static/dist/data/markerstyles.min.json?v=' + version).done(function (data) {
        markerStyles = data // eslint-disable-line
        updateStartLocationMarker()
        updateUserLocationMarker()

        const startSelect = document.getElementById('start-location-marker-icon-select')
        const userSelect = document.getElementById('user-location-marker-icon-select')

        $.each(data, function (id, value) {
            const option = document.createElement('option')
            option.value = id
            option.dataset.icon = value.icon ? value.icon : ''
            option.text = i18n(value.name)
            startSelect.options.add(option.cloneNode(true))
            userSelect.options.add(option)
        })

        function updateMarkerIconSelect(select, value) {
            select.value = value
            if (M.FormSelect.getInstance(select)) {
                M.FormSelect.init(select)
            }
        }

        updateMarkerIconSelect(startSelect, settings.startLocationMarkerStyle)
        updateMarkerIconSelect(userSelect, settings.userLocationMarkerStyle)
    }).fail(function () {
        console.log('Error loading search marker styles JSON.')
    })
}

const createFilterButton = (function () {
    let templateDiv
    let lazyImageObserver

    function createTemplateDiv() {
        const containerDiv = document.createElement('div')
        containerDiv.innerHTML = `
          <div class='filter-button'>
            <div class='filter-button-content'>
              <div id='btnheader'></div>
              <div><div class='filter-image'></div>
              <div id='btnfooter'></div>
            </div>
          </div>`
        return containerDiv.firstElementChild
    }

    function tryCreateLazyImageObserver() {
        if (!('IntersectionObserver' in window)) {
            return null
        }

        return new IntersectionObserver(function (entries, observer) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const lazyImage = entry.target
                    lazyImage.style.content = lazyImage.dataset.lazyContent
                    delete lazyImage.dataset.lazyContent
                    observer.unobserve(lazyImage)
                }
            })
        })
    }

    return function (id, header, footer, iconUrl, isActive) {
        if (typeof templateDiv === 'undefined') {
            templateDiv = createTemplateDiv()
        }
        if (typeof lazyImageObserver === 'undefined') {
            lazyImageObserver = tryCreateLazyImageObserver()
        }

        // Clone a template div, which is faster than creating and parsing HTML for each filter button.
        const buttonDiv = templateDiv.cloneNode(true)
        buttonDiv.dataset.id = id
        if (isActive) {
            buttonDiv.classList.add('active')
        }

        const headerDiv = buttonDiv.querySelector('#btnheader')
        headerDiv.removeAttribute('id')
        headerDiv.textContent = header

        const imageDiv = buttonDiv.querySelector('div.filter-image')
        const imageContent = `url(${iconUrl})`
        if (lazyImageObserver === null) {
            imageDiv.style.content = imageContent
        } else {
            imageDiv.dataset.lazyContent = imageContent
            lazyImageObserver.observe(imageDiv)
        }

        const footerDiv = buttonDiv.querySelector('#btnfooter')
        footerDiv.removeAttribute('id')
        footerDiv.textContent = footer

        return buttonDiv
    }
})()

// Sets a materialize modal function, while keeping the old one if it exists.
function setModalFunction(modalDiv, optionName, fn) {
    const modal = M.Modal.getInstance(modalDiv) || M.Modal.init(modalDiv)
    const existingOption = modal.options[optionName]
    modal.options[optionName] = typeof existingOption === 'function'
        ? () => {
            existingOption()
            fn()
        }
        : fn
}

class FilterManager {
    constructor(modalId, settingsKey, title, isExclusion, onAdded, onRemoved) {
        this._settingsKey = settingsKey
        this._title = title
        this.isExclusion = isExclusion
        this._onAdded = onAdded
        this._onRemoved = onRemoved

        const modalDiv = document.getElementById(modalId)
        this._settingsIds = settings[settingsKey]
        this._titleElement = modalDiv.querySelector(this.getTitleSelector())
        this._buttonById = { }
        this._modalInitialized = false

        setModalFunction(modalDiv, 'onOpenStart', () => {
            if (this._modalInitialized) {
                return
            }

            const filterListDiv = modalDiv.querySelector(this.getListSelector())

            for (const id of this.getAllIds()) {
                const isActive = this._settingsIds.has(id) !== isExclusion
                const button = createFilterButton(
                    id,
                    this.getButtonHeader(id),
                    this.getButtonFooter(id),
                    this.getButtonIconUrl(id),
                    isActive
                )
                this._buttonById[id] = button
                filterListDiv.appendChild(button)
            }

            this._updateTitle()

            filterListDiv.addEventListener('click', e => {
                const button = e.target.closest('.filter-button')
                if (button === null) {
                    return
                }

                const id = this.idFromString(button.dataset.id)
                if (button.classList.contains('active') === isExclusion) {
                    this.add([id])
                } else {
                    this.remove([id])
                }
            })

            function onSelectDeselectAllClick(isSelect, e) {
                e.preventDefault()

                const visibleIds = []
                for (const idString in this._buttonById) {
                    const button = this._buttonById[idString]
                    if (button.style.display !== 'none' && button.classList.contains('active') !== isSelect) {
                        visibleIds.push(this.idFromString(idString))
                    }
                }

                if (isExclusion === isSelect) {
                    this.remove(visibleIds)
                } else {
                    this.add(visibleIds)
                }
            }

            filterListDiv.parentElement.querySelector('.filter-select-all').addEventListener('click', onSelectDeselectAllClick.bind(this, true))
            filterListDiv.parentElement.querySelector('.filter-deselect-all').addEventListener('click', onSelectDeselectAllClick.bind(this, false))

            this._modalInitialized = true
        })
    }

    getListSelector() { throw Error('Not implemented') }
    getTitleSelector() { throw Error('Not implemented') }
    getAllIds() { throw Error('Not implemented') }
    getButtonHeader() { throw Error('Not implemented') }
    getButtonFooter() { throw Error('Not implemented') }
    getButtonIconUrl() { throw Error('Not implemented') }
    idFromString() { throw Error('Not implemented') }

    _toggleButtonActive(pokemonId, isActive) {
        if (this._modalInitialized) {
            const button = this._buttonById[pokemonId]
            if (button) {
                button.classList.toggle('active', isActive)
            }
        }
    }

    _updateTitle() {
        const activeCount = this.isExclusion ? this.getAllIds().size - this._settingsIds.size : this._settingsIds.size
        const countDisplay = activeCount === this.getAllIds().size ? i18n('All') : activeCount.toString()
        this._titleElement.textContent = `${this._title} (${countDisplay})`
    }

    add(ids) {
        for (const id of ids) {
            this._settingsIds.add(id)
            this._toggleButtonActive(id, !this.isExclusion)
        }

        this._updateTitle()
        this._onAdded(ids)
        Store.set(this._settingsKey, this._settingsIds)
    }

    remove(ids) {
        for (const id of ids) {
            this._settingsIds.delete(id)
            this._toggleButtonActive(id, this.isExclusion)
        }

        this._updateTitle()
        this._onRemoved(ids)
        Store.set(this._settingsKey, this._settingsIds)
    }

    clear() {
        this.remove(this._settingsIds)
    }

    toggle(id) {
        if (this._settingsIds.has(id)) {
            this.remove([id])
        } else {
            this.add([id])
        }
    }
}

const filterManagers = {
    excludedPokemon: null,
    notifPokemon: null,
    noFilterValuesPokemon: null,
    notifValuesPokemon: null,
    excludedRaidPokemon: null,
    notifRaidPokemon: null,
    excludedQuestPokemon: null,
    notifQuestPokemon: null,
    excludedQuestItems: null,
    notifQuestItems: null,
    excludedInvasions: null,
    notifInvasions: null
}

function initPokemonFilters() {
    const allPokemonIds = getPokemonIds()

    class PokemonFilterManager extends FilterManager {
        getListSelector() { return '.pokemon-filter-list' }
        getTitleSelector() { return '.pokemon-filter-title' }
        getAllIds() { return allPokemonIds }
        getButtonHeader(id) { return '#' + id }
        getButtonFooter(id) { return getPokemonName(id) }
        getButtonIconUrl(id) { return getPokemonRawIconUrl({ pokemon_id: id }, serverSettings.generateImages) }
        idFromString(idString) { return parseInt(idString) }
    }

    const searchInputs = document.querySelectorAll('.search')
    searchInputs.forEach(function (searchInput) {
        searchInput.addEventListener('input', () => {
            const searchText = searchInput.value.replace(/\s/g, '')
            const footer = searchInput.closest('.filter-footer-container')
            const filterList = footer.previousElementSibling
            const filterButtons = filterList.querySelectorAll('.filter-button')
            const filterContainer = filterList.parentElement
            const oldContainerDisplay = filterContainer.style.display
            filterContainer.style.display = 'none'

            if (searchText === '') {
                filterButtons.forEach(function (filterButton) {
                    filterButton.style.display = ''
                })
            } else {
                const foundPokemonIds = searchPokemon(searchText)
                filterButtons.forEach(function (filterButton) {
                    filterButton.style.display = foundPokemonIds.has(parseInt(filterButton.dataset.id)) ? '' : 'none'
                })
            }

            filterContainer.style.display = oldContainerDisplay
        })
    })

    if (serverSettings.pokemons) {
        filterManagers.excludedPokemon = new PokemonFilterManager(
            'pokemon-filter-modal', 'excludedPokemon', i18n('Pokémon'), true,
            pokemonIds => updatePokemons(new Set(pokemonIds)),
            pokemonIds => {
                for (const pokemonId of pokemonIds) {
                    reincludedPokemon.add(pokemonId)
                }
                updateMap()
            }
        )

        filterManagers.notifPokemon = new PokemonFilterManager(
            'notif-pokemon-filter-modal', 'notifPokemon', i18n('Notif Pokémon'), false,
            pokemonIds => {
                updatePokemons(new Set(pokemonIds))
                if (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways) {
                    updateMap({ loadAllPokemon: true })
                }
            },
            pokemonIds => updatePokemons(new Set(pokemonIds))
        )
    }

    if (serverSettings.pokemonValues) {
        filterManagers.noFilterValuesPokemon = new PokemonFilterManager(
            'pokemon-values-filter-modal', 'noFilterValuesPokemon', i18n('Pokémon filtered by stats'), true,
            pokemonIds => {
                for (const pokemonId of pokemonIds) {
                    reincludedPokemon.add(pokemonId)
                }
                updateMap()
            },
            pokemonIds => updatePokemons(new Set(pokemonIds))
        )

        filterManagers.notifValuesPokemon = new PokemonFilterManager(
            'notif-pokemon-values-filter-modal', 'notifValuesPokemon', i18n('Notif Pokémon filtered by stats'), false,
            pokemonIds => {
                updatePokemons(new Set(pokemonIds))
                if (settings.showNotifPokemonOnly || settings.showNotifPokemonAlways) {
                    updateMap({ loadAllPokemon: true })
                }
            },
            pokemonIds => updatePokemons(new Set(pokemonIds))
        )
    }

    if (serverSettings.raidFilters) {
        filterManagers.excludedRaidPokemon = new PokemonFilterManager(
            'raid-pokemon-filter-modal', 'excludedRaidPokemon', i18n('Raid Bosses'), true,
            () => updateGyms(),
            () => {
                updateGyms()
                updateMap({ loadAllGyms: true })
            }
        )

        filterManagers.notifRaidPokemon = new PokemonFilterManager(
            'notif-raid-pokemon-filter-modal', 'notifRaidPokemon', i18n('Notif Raid Bosses'), false,
            () => updateGyms(),
            () => updateGyms()
        )
    }

    if (serverSettings.quests) {
        filterManagers.excludedQuestPokemon = new PokemonFilterManager(
            'quest-filter-modal', 'excludedQuestPokemon', i18n('Quest Pokémon'), true,
            () => updatePokestops(),
            () => {
                updatePokestops()
                updateMap({ loadAllPokestops: true })
            }
        )

        filterManagers.notifQuestPokemon = new PokemonFilterManager(
            'notif-quest-filter-modal', 'notifQuestPokemon', i18n('Notif Quest Pokémon'), false,
            () => updatePokestops(),
            () => updatePokestops()
        )
    }
}

function initItemFilters() {
    document.querySelectorAll('.quest-filter-modal').forEach(modalDiv => {
        setModalFunction(modalDiv, 'onOpenEnd', () => {
            M.Tabs.getInstance(modalDiv.querySelector('.quest-filter-tabs')).updateTabIndicator()
        })
    })

    const questItemIds = new Set()
    const includeInFilter = [6, 1, 2, 3, 701, 703, 705, 706, 708, 709, 101, 102, 103, 104, 201, 202, 1301, 1201, 1202, 501, 502, 503, 504, 1101, 1102, 1103, 1104, 1105, 1106, 1107, 7, 8, 1501]

    for (const id of includeInFilter) {
        for (const bundle of getQuestBundles(id)) {
            questItemIds.add(id + '_' + bundle)
        }
    }

    class QuestItemFilterManager extends FilterManager {
        getListSelector() { return '.quest-item-filter-list' }
        getTitleSelector() { return '.quest-item-filter-title' }
        getAllIds() { return questItemIds }
        getButtonHeader(id) { return getItemName(id.substring(0, id.indexOf('_'))) }
        getButtonFooter(id) { return '×' + id.substring(id.indexOf('_') + 1) }
        getButtonIconUrl(id) { return getItemImageUrl(id.substring(0, id.indexOf('_'))) }
        idFromString(idString) { return idString }
    }

    filterManagers.excludedQuestItems = new QuestItemFilterManager(
        'quest-filter-modal', 'excludedQuestItems', i18n('Quest Items'), true,
        () => updatePokestops(),
        () => {
            updatePokestops()
            updateMap({ loadAllPokestops: true })
        }
    )

    filterManagers.notifQuestItems = new QuestItemFilterManager(
        'notif-quest-filter-modal', 'notifQuestItems', i18n('Notif Quest Items'), false,
        () => updatePokestops(),
        () => updatePokestops()
    )
}

function initInvasionFilters() {
    const invasionIds = new Set([41, 42, 43, 44, 5, 4, 6, 7, 10, 11, 12, 13, 49, 50, 14, 15, 16, 17, 18, 19, 20, 21, 47, 48, 22, 23, 24, 25, 26, 27, 30, 31, 32, 33, 34, 35, 36, 37, 28, 29, 38, 39, 500, 501, 502, 504, 506, 507])

    class InvasionFilterManager extends FilterManager {
        getListSelector() { return '.invasion-filter-list' }
        getTitleSelector() { return '.invasion-filter-title' }
        getAllIds() { return invasionIds }
        getButtonHeader(id) { return getInvasionType(id) }
        getButtonFooter(id) { return getInvasionGrunt(id) }
        getButtonIconUrl(id) { return getInvasionImageUrl(id) }
        idFromString(idString) { return parseInt(idString) }
    }

    filterManagers.excludedInvasions = new InvasionFilterManager(
        'invasion-filter-modal', 'excludedInvasions', i18n('Rocket Invasions'), true,
        () => updatePokestops(),
        () => {
            updatePokestops()
            updateMap({ loadAllPokestops: true })
        }
    )

    filterManagers.notifInvasions = new InvasionFilterManager(
        'notif-invasion-filter-modal', 'notifInvasions', i18n('Notif Rocket Invasions'), false,
        () => updatePokestops(),
        () => updatePokestops()
    )
}

function initBackupModals() {
    const pokemonIds = getPokemonIds()

    if (serverSettings.pokemons) {
        $('#export-pokemon-button').on('click', function () {
            const pokemon = difference(pokemonIds, settings.excludedPokemon)
            downloadData('pokemon', JSON.stringify(Array.from(pokemon)))
        })
    }

    if (serverSettings.pokemonValues) {
        $('#export-values-pokemon-button').on('click', function () {
            const pokemon = difference(pokemonIds, settings.noFilterValuesPokemon)
            downloadData('values_pokemon', JSON.stringify(Array.from(pokemon)))
        })
    }

    if (serverSettings.raids) {
        $('#export-raid-pokemon-button').on('click', function () {
            const pokemon = difference(pokemonIds, settings.excludedRaidPokemon)
            downloadData('raid_pokemon', JSON.stringify(Array.from(pokemon)))
        })
    }

    if (serverSettings.quests) {
        $('#export-quest-pokemon-button').on('click', function () {
            const pokemon = difference(pokemonIds, settings.excludedQuestPokemon)
            downloadData('quest_pokemon', JSON.stringify(Array.from(pokemon)))
        })
    }

    if (serverSettings.pokemons) {
        $('#export-notif-pokemon-button').on('click', function () {
            downloadData('notif_pokemon', JSON.stringify(Array.from(settings.notifPokemon)))
        })
    }

    if (serverSettings.pokemonValues) {
        $('#export-notif-values-pokemon-button').on('click', function () {
            downloadData('notif_values_pokemon', JSON.stringify(Array.from(settings.notifValuesPokemon)))
        })
    }

    if (serverSettings.raids) {
        $('#export-notif-raid-pokemon-button').on('click', function () {
            downloadData('raid_pokemon', JSON.stringify(Array.from(settings.notifRaidPokemon)))
        })
    }

    if (serverSettings.quests) {
        $('#export-notif-quest-pokemon-button').on('click', function () {
            downloadData('quest_pokemon', JSON.stringify(Array.from(settings.notifQuestPokemon)))
        })
    }

    function loaded(e) {
        const fileString = e.target.result
        let checkBoxSelected = false

        let pokemons = null
        try {
            pokemons = JSON.parse(fileString)
        } catch (e) {
            console.error('Error while parsing pokemon list: ' + e)
        }
        if (pokemons === null || !Array.isArray(pokemons)) {
            toastError(i18n('Error while reading Pokémon list file!'), i18n('Check your Pokémon list file.'))
            return
        }
        for (let i = 0; i < pokemons.length; i++) {
            if (!Number.isInteger(pokemons[i])) {
                toastError(i18n('Unexpected character found in Pokémon list file!'), i18n('Check your Pokémon list file.'))
                return
            }
        }

        const excludedPokemons = difference(pokemonIds, new Set(pokemons))

        function importFiltersIfChecked(checkBoxId, filterManager) {
            const checkBox = document.getElementById(checkBoxId)
            if (checkBox && checkBox.checked && filterManager) {
                checkBoxSelected = true
                filterManager.clear()
                filterManager.isExclusion ? filterManager.add(excludedPokemons) : filterManager.add(pokemons)
            }
        }

        if (serverSettings.pokemons) {
            importFiltersIfChecked('import-pokemon-checkbox', filterManagers.excludedPokemon)
        }

        if (serverSettings.pokemonValues) {
            importFiltersIfChecked('import-values-pokemon-checkbox', filterManagers.noFilterValuesPokemon)
        }

        if (serverSettings.raids) {
            importFiltersIfChecked('import-raid-pokemon-checkbox', filterManagers.excludedRaidPokemon)
        }

        if (serverSettings.quests) {
            importFiltersIfChecked('import-quest-pokemon-checkbox', filterManagers.excludedQuestPokemon)
        }

        if (serverSettings.pokemons) {
            importFiltersIfChecked('import-notif-pokemon-checkbox', filterManagers.notifPokemon)
        }

        if (serverSettings.pokemonValues) {
            importFiltersIfChecked('import-notif-values-pokemon-checkbox', filterManagers.notifValuesPokemon)
        }

        if (serverSettings.raids) {
            importFiltersIfChecked('import-notif-raid-pokemon-checkbox', filterManagers.notifRaidPokemon)
        }

        if (serverSettings.quests) {
            importFiltersIfChecked('import-notif-quest-pokemon-checkbox', filterManagers.notifQuestPokemon)
        }

        if (checkBoxSelected) {
            toastSuccess(i18n('Pokémon list imported.'), '')
        } else {
            toastWarning(i18n('Please select a filter to import to first.'), '')
        }
    }

    function error(e) {
        console.error('Error while loading Pokémon list file: ' + e)
        toastError(i18n('Error while loading Pokémon list file!'), i18n('Please try again.'))
    }

    $('#import-pokemon-list').on('click', function () {
        const elem = document.getElementById('pokemon-list-file')
        if (elem.value !== '') {
            const file = elem.files[0]
            loadData(file, loaded, error)
        } else {
            toastWarning(i18n('Please select a Pokémon list first!'), '')
        }
    })
}
