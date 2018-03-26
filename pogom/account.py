#!/usr/bin/python
# -*- coding: utf-8 -*-

import logging
import time
import random
from threading import Lock
from timeit import default_timer

from mrmime.pogoaccount import POGOAccount

from pogom.pgpool import pgpool_request_accounts, pgpool_release_account
from .utils import in_radius, distance, now, get_pokemon_name
from .proxy import get_new_proxy

log = logging.getLogger(__name__)


class TooManyLoginAttempts(Exception):
    pass


class LoginSequenceFail(Exception):
    pass


def get_account(args, account_queue, status):
    if args.pgpool_url:
        if args.pgpool_initial_accounts:
            account = args.pgpool_initial_accounts.pop()
            log.info("Picked account {} from initial PGPool account list."
                     .format(account['username']))
        else:
            account = None
            while not account:
                accounts = pgpool_request_accounts(args, count=1)
                if not accounts:
                    msg = (
                        "Could not request account from PGPool (none left?)."
                        "Retrying in 30 seconds.")
                    status['message'] = msg
                    log.warning(msg)
                    time.sleep(30)
                else:
                    account = accounts[0]
            log.info("Successfully requested account {} from PGPool.".format(
                account['username']))
        return {
            'username': account['username'],
            'password': account['password'],
            'auth_service': account['auth_service'],
            'pgpool_account': account
        }
    else:
        return account_queue.get()


def account_revive(args, account_queue, account):
    if args.pgpool_url:
        pgpool_release_account(account, "Captcha solved")
    else:
        account_queue.put(account)


def account_failed(args, account_failures, account, reason):
    if args.pgpool_url:
        pgpool_release_account(account, reason)
    else:
        account_failures.append({'account': account,
                                 'last_fail_time': now(),
                                 'reason': reason})


# Create the MrMime POGOAccount object that'll be used to scan.
def setup_mrmime_account(args, status, account):
    reset_account(account)
    pgacc = POGOAccount(account['auth_service'], account['username'],
                        account['password'])
    pgacc.cfg['player_locale'] = args.player_locale
    pgacc.callback_egg_hatched = log_hatched_egg

    # Initialize POGOAccount from PGPool info
    if 'pgpool_account' in account:
        pgacc.rareless_scans = account['pgpool_account'].get('rareless_scans',
                                                             0)
        pgacc.shadowbanned = account['pgpool_account'].get('shadowbanned',
                                                           False)
        del account['pgpool_account']

    account['pgacc'] = pgacc

    # New account - new proxy.
    if args.proxy:
        # If proxy is not assigned yet or if proxy-rotation is defined
        # - query for new proxy.
        if ((not status['proxy_url']) or
                (args.proxy_rotation != 'none')):

            proxy_num, status['proxy_url'] = get_new_proxy(args)
            if args.proxy_display.upper() != 'FULL':
                status['proxy_display'] = proxy_num
            else:
                status['proxy_display'] = status['proxy_url']

    if status['proxy_url']:
        log.debug('Using proxy %s', status['proxy_url'])
        pgacc.proxy_url = status['proxy_url']
        if (status['proxy_url'] not in args.proxy):
            log.warning(
                'Tried replacing proxy %s with a new proxy, but proxy ' +
                'rotation is disabled ("none"). If this isn\'t intentional, ' +
                'enable proxy rotation.',
                status['proxy_url'])

    return pgacc


def reset_account(account):
    account['start_time'] = time.time()
    account['warning'] = None
    account['tutorials'] = []
    account['items'] = {}
    account['pokemons'] = {}
    account['incubators'] = []
    account['eggs'] = []
    account['level'] = 0
    account['spins'] = 0
    account['session_spins'] = 0
    account['walked'] = 0.0
    account['last_timestamp_ms'] = 0


def log_hatched_egg(pgacc, hatched_egg):
    p = hatched_egg['hatched_pokemon']
    iv = float(
        p.individual_attack + p.individual_defense +
        p.individual_stamina) / 45 * 100
    pname = get_pokemon_name(p.pokemon_id)
    km = hatched_egg['egg_km_walked']
    xp = hatched_egg['experience_awarded']
    candy = hatched_egg['candy_awarded']
    dust = hatched_egg['stardust_awarded']
    pgacc.log_info(
        (u"Hatched {:.1f}% {} from {}km egg for {} XP, {} candy, {} dust.")
        .format(iv, pname, km, xp, candy, dust))


def can_spin(account, max_h_spins):
    elapsed_time = time.time() - account['start_time']

    # Just to prevent division by 0 errors, when needed
    # set elapsed to 1 millisecond.
    if elapsed_time == 0:
        elapsed_time = 1

    return (account['session_spins'] * 3600.0 / elapsed_time) <= max_h_spins


# Check if Pokestop is spinnable and not on cooldown.
def pokestop_spinnable(fort, step_location):
    if not fort.enabled:
        return False

    spinning_radius = 38
    in_range = in_radius((fort.latitude, fort.longitude),
                         step_location, spinning_radius)
    now = time.time()
    pause_needed = fort.cooldown_complete_timestamp_ms / 1000 > now
    return in_range and not pause_needed


def spin_pokestop(pgacc, account, args, fort, step_location):
    if not can_spin(account, args.account_max_spins):
        log.warning('Account %s has reached its Pokestop spinning limits.',
                    account['username'])
        return False
    # Set 50% Chance to spin a Pokestop.
    if random.random() > 0.5 or pgacc.get_stats('level', 1) == 1:
        time.sleep(random.uniform(0.8, 1.8))
        response = spin_pokestop_request(pgacc, fort, step_location)
        if not response:
            return False
        time.sleep(random.uniform(2, 4))  # Don't let Niantic throttle.

        # Check for reCaptcha.
        if pgacc.has_captcha():
            log.debug('Account encountered a reCaptcha.')
            return False

        spin_result = response['FORT_SEARCH'].result
        if spin_result is 1:
            log.info('Successful Pokestop spin with %s.',
                     account['username'])
            # Update account stats and clear inventory if necessary.
            parse_level_up_rewards(pgacc)
            clear_inventory(pgacc)
            account['session_spins'] += 1
            return True
        elif spin_result is 2:
            log.debug('Pokestop was not in range to spin.')
        elif spin_result is 3:
            log.debug('Failed to spin Pokestop. Has recently been spun.')
        elif spin_result is 4:
            log.debug('Failed to spin Pokestop. Inventory is full.')
            clear_inventory(pgacc)
        elif spin_result is 5:
            log.debug('Maximum number of Pokestops spun for this day.')
        else:
            log.debug(
                'Failed to spin a Pokestop. Unknown result %d.',
                spin_result)

    return False


def parse_get_player(account, api_response):
    if 'GET_PLAYER' in api_response['responses']:
        player_data = api_response['responses']['GET_PLAYER'].player_data

        account['warning'] = api_response['responses']['GET_PLAYER'].warn
        account['tutorials'] = player_data.tutorial_state
        account['buddy'] = player_data.buddy_pokemon.id


def clear_pokemon(pgacc):
    total_pokemon = len(pgacc.pokemon)
    if total_pokemon > 200:
        release_count = int(total_pokemon - random.randint(40, 80))
        release_ids = random.sample(pgacc.pokemon.keys(), release_count)
        if pgacc.get_state('buddy') in release_ids:
            release_ids.remove(pgacc.get_state('buddy'))

        # Don't let Niantic throttle.
        time.sleep(random.uniform(2, 4))
        release_p_response = request_release_pokemon(pgacc, 0,
                                                     release_ids)
        if not release_p_response:
            return False

        if pgacc.has_captcha():
            log.info('Account encountered a reCaptcha.')
            return False

        release_response = release_p_response['RELEASE_POKEMON']
        release_result = release_response.result

        if release_result is 1:
            log.info('Sucessfully Released %s Pokemon', len(release_ids))
            for p_id in release_ids:
                pgacc.pokemon.pop(p_id, None)
        elif release_result != 1:
            log.error('Failed to release Pokemon.')


def clear_inventory(pgacc):
    items = [(1, 'Pokeball'), (2, 'Greatball'), (3, 'Ultraball'),
             (101, 'Potion'), (102, 'Super Potion'), (103, 'Hyper Potion'),
             (104, 'Max Potion'),
             (201, 'Revive'), (202, 'Max Revive'),
             (701, 'Razz Berry'), (703, 'Nanab Berry'), (705, 'Pinap Berry'),
             (1101, 'Sun Stone'), (1102, 'Kings Rock'), (1103, 'Metal Coat'),
             (1104, 'Dragon Scale'), (1105, 'Upgrade')]

    for item_id, item_name in items:
        item_count = pgacc.inventory.get(item_id, 0)
        random_max = random.randint(5, 10)
        if item_count > random_max:
            drop_count = item_count - random_max

            # Don't let Niantic throttle.
            time.sleep(random.uniform(2, 4))
            clear_inventory_response = clear_inventory_request(
                pgacc, item_id, drop_count)

            if pgacc.has_captcha():
                log.info('Account encountered a reCaptcha.')
                return False

            if not clear_inventory_response:
                continue

            clear_response = clear_inventory_response['RECYCLE_INVENTORY_ITEM']
            clear_result = clear_response.result
            if clear_result is 1:
                log.info('Clearing %s %ss succeeded.', drop_count,
                         item_name)
            elif clear_result is 2:
                log.debug('Not enough items to clear, parsing failed.')
            elif clear_result is 3:
                log.debug('Tried to recycle incubator, parsing failed.')
            else:
                log.warning('Failed to clear inventory.')

            log.debug('Recycled inventory: \n\r{}'.format(clear_result))

    return


def incubate_eggs(pgacc):
    if not pgacc.eggs:
        log.debug('Account %s has no eggs to incubate.',
                  pgacc.username)
        return

    pgacc.eggs = sorted(pgacc.eggs, key=lambda k: k['km_target'])
    for incubator in pgacc.incubators:
        if pgacc.eggs:
            egg = pgacc.eggs.pop(0)
            time.sleep(random.uniform(2.0, 4.0))
            if request_use_item_egg_incubator(
               pgacc, incubator['id'], egg['id']):
                log.info('Egg #%s (%.0f km) is on incubator #%s.',
                         egg['id'], egg['km_target'], incubator['id'])
                pgacc.incubators.remove(incubator)
            else:
                log.warning('Failed to put egg on incubator #%s.',
                            incubator['id'])


def spin_pokestop_request(pgacc, fort, step_location):
    try:
        return pgacc.seq_spin_pokestop(
            fort.id,
            fort.latitude,
            fort.longitude,
            step_location[0],
            step_location[1])
    except Exception as e:
        log.exception('Exception while spinning Pokestop: %s.', e)
        return False


def encounter_pokemon_request(pgacc, encounter_id, spawnpoint_id,
                              scan_location):
    try:
        return pgacc.req_encounter(encounter_id, spawnpoint_id,
                                   scan_location[0], scan_location[1])
    except Exception as e:
        log.exception('Exception while encountering Pokémon: %s.', e)
        return False


def clear_inventory_request(pgacc, item_id, drop_count):
    try:
        return pgacc.req_recycle_inventory_item(item_id, drop_count)

    except Exception as e:
        log.exception('Exception while clearing Inventory: %s', e)
        return False


def request_use_item_egg_incubator(pgacc, incubator_id, egg_id):
    try:
        pgacc.req_use_item_egg_incubator(incubator_id, egg_id)
        return True

    except Exception as e:
        log.exception('Exception while putting an egg in incubator: %s', e)
    return False


def request_release_pokemon(pgacc, pokemon_id, release_ids=None):
    if release_ids is None:
        release_ids = []
    try:
        return pgacc.req_release_pokemon(pokemon_id, release_ids)

    except Exception as e:
        log.exception('Exception while releasing Pokemon: %s', e)

    return False


def parse_level_up_rewards(pgacc):
    try:
        result = pgacc.req_level_up_rewards(
            pgacc.get_stats('level'))['LEVEL_UP_REWARDS'].result
        if result is 1:
            log.info('Account %s collected its level up rewards.',
                     pgacc.username)
        elif result != 1:
            log.debug('Account %s already collected its level up rewards.',
                      pgacc.username)
    except Exception as e:
        log.exception('Error during getting Level Up Rewards %s.', e)


# The AccountSet returns a scheduler that cycles through different
# sets of accounts (e.g. L30). Each set is defined at runtime, and is
# (currently) used to separate regular accounts from L30 accounts.
# TODO: Migrate the old account Queue to a real AccountScheduler, preferably
# handled globally via database instead of per instance.
# TODO: Accounts in the AccountSet are exempt from things like the
# account recycler thread. We could've hardcoded support into it, but that
# would have added to the amount of ugly code. Instead, we keep it as is
# until we have a proper account manager.
class AccountSet(object):

    def __init__(self, kph):
        self.sets = {}

        # Scanning limits.
        self.kph = kph

        # Thread safety.
        self.next_lock = Lock()

    # Set manipulation.
    def create_set(self, name, values=None):
        if values is None:
            values = []
        if name in self.sets:
            raise Exception('Account set ' + name + ' is being created twice.')

        self.sets[name] = values

    # Release an account back to the pool after it was used.
    def release(self, account):
        if 'in_use' not in account:
            log.error('Released account %s back to the AccountSet,'
                      + " but it wasn't locked.",
                      account['username'])
        else:
            account['in_use'] = False

    # Get next account that is ready to be used for scanning.
    def next(self, set_name, coords_to_scan):
        # Yay for thread safety.
        with self.next_lock:
            # Readability.
            account_set = self.sets[set_name]

            # Loop all accounts for a good one.
            now = default_timer()

            for i in range(len(account_set)):
                account = account_set[i]

                # Make sure it's not in use.
                if account.get('in_use', False):
                    continue

                # Make sure it's not captcha'd.
                if account.get('captcha', False):
                    continue

                # Check if we're below speed limit for account.
                last_scanned = account.get('last_scanned', False)

                if last_scanned and self.kph > 0:
                    seconds_passed = now - last_scanned
                    old_coords = account.get('last_coords', coords_to_scan)

                    distance_m = distance(old_coords, coords_to_scan)

                    cooldown_time_sec = distance_m / self.kph * 3.6

                    # Not enough time has passed for this one.
                    if seconds_passed < cooldown_time_sec:
                        continue

                # We've found an account that's ready.
                account['last_scanned'] = now
                account['last_coords'] = coords_to_scan
                account['in_use'] = True

                return account

        # TODO: Instead of returning False, return the amount of min. seconds
        # the instance needs to wait until the first account becomes available,
        # so it doesn't need to keep asking if we know we need to wait.
        return False
