/* globals map, s2CellsLayerGroup, settings */
/* exported updateS2Overlay */

function addPoly(cell, color, weight) {
    const vertices = cell.getCornerLatLngs()
    const poly = L.polygon(vertices, {
        color: color,
        weight: weight,
        fillOpacity: 0,
        interactive: false
    })
    s2CellsLayerGroup.addLayer(poly)
}

function showS2Cells(level, color, weight) {
    const bounds = map.getBounds()
    const swPoint = bounds.getSouthWest()
    const nePoint = bounds.getNorthEast()
    const swLat = swPoint.lat
    const swLng = swPoint.lng
    const neLat = nePoint.lat
    const neLng = nePoint.lng

    var processedCells = {}
    var stack = []

    const centerCell = S2.S2Cell.FromLatLng(bounds.getCenter(), level)
    processedCells[centerCell.toString()] = true
    stack.push(centerCell)
    addPoly(centerCell, color, weight)

    // Find all cells within view with a slighty modified version of the BFS algorithm.
    while (stack.length > 0) {
        const cell = stack.pop()
        const neighbors = cell.getNeighbors()
        neighbors.forEach(function (ncell, index) {
            if (!processedCells[ncell.toString()]) {
                const cornerLatLngs = ncell.getCornerLatLngs()
                for (let i = 0; i < 4; i++) {
                    const item = cornerLatLngs[i]
                    if (item.lat >= swLat && item.lng >= swLng &&
                            item.lat <= neLat && item.lng <= neLng) {
                        processedCells[ncell.toString()] = true
                        stack.push(ncell)
                        addPoly(ncell, color, weight)
                        break
                    }
                }
            }
        })
    }
}

function updateS2Overlay() {
    if (settings.showS2Cells) {
        const zoomLevel = map.getZoom()
        s2CellsLayerGroup.clearLayers()

        if (settings.showS2CellsLevel17) {
            if (zoomLevel > 14) {
                showS2Cells(17, 'blue', 1)
            } else if (settings.warnHiddenS2Cells) {
                toastWarning(i18n('PokéStop cells are hidden!'), i18n('Zoom in more to show them.'))
            }
        }

        if (settings.showS2CellsLevel16) {
            if (zoomLevel > 13) {
                showS2Cells(16, 'orange', 1)
            } else if (settings.warnHiddenS2Cells) {
                toastWarning(i18n('S2 Level 16 cells are hidden!'), i18n('Zoom in more to show them.'))
            }
        }

        if (settings.showS2CellsLevel15) {
            if (zoomLevel > 12) {
                showS2Cells(15, 'green', 1)
            } else if (settings.warnHiddenS2Cells) {
                toastWarning(i18n('S2 Level 15 cells are hidden!'), i18n('Zoom in more to show them.'))
            }
        }

        if (settings.showS2CellsLevel14) {
            if (zoomLevel > 11) {
                showS2Cells(14, 'red', 1.5)
            } else if (settings.warnHiddenS2Cells) {
                toastWarning(i18n('Gym cells are hidden!'), i18n('Zoom in more to show them.'))
            }
        }

        if (settings.showS2CellsLevel13) {
            if (zoomLevel > 10) {
                showS2Cells(13, 'black', 2)
            } else if (settings.warnHiddenS2Cells) {
                toastWarning(i18n('EX trigger cells are hidden!'), i18n('Zoom in more to show them.'))
            }
        }

        if (settings.showS2CellsLevel12) {
            if (zoomLevel > 9) {
                showS2Cells(12, 'purple', 2)
            } else if (settings.warnHiddenS2Cells) {
                toastWarning(i18n('S2 Level 12 cells are hidden!'), i18n('Zoom in more to show them.'))
            }
        }

        if (settings.showS2CellsLevel11) {
            if (zoomLevel > 8) {
                showS2Cells(11, 'yellow', 2)
            } else if (settings.warnHiddenS2Cells) {
                toastWarning(i18n('S2 Level 11 cells are hidden!'), i18n('Zoom in more to show them.'))
            }
        }

        if (settings.showS2CellsLevel10) {
            if (zoomLevel > 7) {
                showS2Cells(10, 'white', 2.5)
            } else if (settings.warnHiddenS2Cells) {
                toastWarning(i18n('Weather cells are hidden!'), i18n('Zoom in more to show them.'))
            }
        }
    }
}
