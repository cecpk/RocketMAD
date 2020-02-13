function getGymLevel(gym) {
    return 6 - gym.slots_available
}

function isValidRaid(raid) {
    return raid && raid.end > Date.now()
}

function isUpcomingRaid(raid) {
    return raid.start > Date.now()
}

function isOngoingRaid(raid) {
    const now = Date.now()
    return raid.start <= now && raid.end > now
}
