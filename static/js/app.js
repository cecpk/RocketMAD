;(function () {
    'use strict'

    // addEventsListener
    function addEventsListener(object, types, callback) {
        types.split(' ').forEach(type => object.addEventListener(type, callback))
    }

    // Vars.
    var $body = document.querySelector('body')

    // Nav.
    var $nav = document.querySelector('#nav')
    var $navToggle = document.querySelector('a[href="#nav"]')

    // Menu.
    var $menu = document.querySelector('#menu')
    var $menuToggle = document.querySelector('a[href="#menu"]')
    // Stats.
    var $stats = document.querySelector('#stats')
    var $statsToggle = document.querySelector('a[href="#stats"]')

    // Gym sidebar.
    var $gymSidebar = document.querySelector('#gym-details')
    var $gymSidebarClose

    if ($nav) {
        // Event: Prevent clicks/taps inside the nav from bubbling.
        addEventsListener($nav, 'click touchend', function (event) {
            event.stopPropagation()
        })
    }

    if ($menu) {
        // Event: Prevent clicks/taps inside the menu from bubbling.
        addEventsListener($menu, 'click touchend', function (event) {
            event.stopPropagation()
        })
    }

    if ($stats) {
        // Event: Prevent clicks/taps inside the stats from bubbling.
        addEventsListener($stats, 'click touchend', function (event) {
            event.stopPropagation()
        })
    }

    if ($gymSidebar) {
        // Event: Prevent clicks/taps inside the gym sidebar from bubbling.
        addEventsListener($gymSidebar, 'click touchend', function (event) {
            event.stopPropagation()
        })
    }

    // Event: Hide nav, menu and stats on body click/tap.
    addEventsListener($body, 'click touchend', function (event) {
        // on ios safari, when navToggle is clicked,
        // this function executes too, so if the target
        // is the toggle button, exit this function
        if (event.target.matches('a[href="#nav"]')) {
            return
        }
        if ($menu && event.target.matches('a[href="#menu"]')) {
            return
        }
        if ($stats && event.target.matches('a[href="#stats"]')) {
            return
        }
        if ($nav) {
            $nav.classList.remove('visible')
        }
        if ($menu) {
            $menu.classList.remove('visible')
        }
        if ($stats) {
            $stats.classList.remove('visible')
        }
    })
    // Toggle.

    // Event: Toggle nav on click.
    if ($navToggle) {
        $navToggle.addEventListener('click', function (event) {
            event.preventDefault()
            event.stopPropagation()
            $nav.classList.toggle('visible')
        })
    }

    // Event: Toggle menu on click.
    if ($menuToggle) {
        $menuToggle.addEventListener('click', function (event) {
            event.preventDefault()
            event.stopPropagation()
            $menu.classList.toggle('visible')
        })
    }

    // Event: Toggle stats on click.
    if ($statsToggle) {
        $statsToggle.addEventListener('click', function (event) {
            if (!$('#stats').hasClass('visible')) {
                // Update stats sidebar.
                countMarkers(map)
            }
            event.preventDefault()
            event.stopPropagation()
            $stats.classList.toggle('visible')
        })
    }

    // Close.

    // Create elements.
    if ($gymSidebar) {
        $gymSidebarClose = document.createElement('a')
        $gymSidebarClose.href = '#'
        $gymSidebarClose.className = 'close'
        $gymSidebarClose.tabIndex = 0
        $gymSidebar.appendChild($gymSidebarClose)
    }

    // Event: Hide on ESC.
    window.addEventListener('keydown', function (event) {
        if (event.keyCode === 27) {
            if ($nav) {
                $nav.classList.remove('visible')
            }
            if ($stats) {
                $stats.classList.remove('visible')
            }
            if ($gymSidebar) {
                $gymSidebar.classList.remove('visible')
            }
        }
    })

    if ($gymSidebarClose) {
        // Event: Hide stats on click.
        $gymSidebarClose.addEventListener('click', function (event) {
            event.preventDefault()
            event.stopPropagation()
            $gymSidebar.classList.remove('visible')
        })
    }
})()

function showImageModal(url, title) {
    $('#modal-title').text(title)
    $('#modal-image').attr('src', url)
    $('#modal-container').show()
}

function hideImageModal() {
    $('#modal-container').hide()
}
