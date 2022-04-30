/* exported getGymLevel, gymTypes, isOngoingRaid, isUpcomingRaid, isValidRaid, raidEggImages */

const gymTypes = ['Uncontested', 'Mystic', 'Valor', 'Instinct']
const raidEggImages = {
    1: 'egg_normal.png',
    2: 'egg_normal.png',
    3: 'egg_rare.png',
    4: 'egg_rare.png',
    5: 'egg_legendary.png',
    6: 'egg_mega.png',
    7: 'egg_legendary_mega.png'
}

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
