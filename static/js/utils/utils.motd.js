function showMotd(title, text, pages, showAlways) {
    console.log(typeof window.location.pathname)
    console.log(pages)
    console.log(pages.includes(window.location.pathname))
    if (pages.includes(window.location.pathname)) {
        let motdIsUpdated = false
        const lastMotd = window.localStorage.getItem('lastMotd') || ''
        if (lastMotd !== title + text) {
            motdIsUpdated = true
        }

        if (motdIsUpdated || showAlways) {
            $('#motd-title').html(title)
            $('#motd-content').html(text)
            $('#motd-modal').modal()
            $('#motd-modal').modal('open')

            window.localStorage.setItem('lastMotd', title + text)
        }
    }
}
