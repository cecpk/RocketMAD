#!/usr/bin/python
# -*- coding: utf-8 -*-

'''
Search Architecture:
 - Have a list of accounts
 - Create an "overseer" thread
 - Search Overseer:
   - Tracks incoming new location values
   - Tracks "paused state"
   - During pause or new location will clears current search queue
   - Starts search_worker threads
 - Search Worker Threads each:
   - Have a unique API login
   - Listens to the same Queue for areas to scan
   - Can re-login as needed
   - Pushes finds to db queue and webhook queue
'''

import logging
import math
import os
import sys
import traceback
import random
import time
import requests
import schedulers
import terminalsize
import timeit
import threading

from datetime import datetime
from threading import Thread, Lock
from queue import Queue, Empty
from sets import Set
from collections import deque
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
from distutils.version import StrictVersion
from cachetools import TTLCache

from pgoapi.hash_server import HashServer
from .models import (parse_map, GymDetails, parse_gyms, MainWorker,
                     WorkerStatus, HashKeys, ScannedLocation)
from .utils import now, distance, get_args, clear_dict_response
from .transform import get_new_coords
from .account import AccountSet, get_account, setup_mrmime_account, account_failed, \
    account_revive
from .captcha import captcha_overseer_thread, handle_captcha
from .proxy import get_new_proxy
from .transform import jitter_location

log = logging.getLogger(__name__)

loginDelayLock = Lock()
gym_cache_lock = threading.Lock()


# Thread to handle user input.
def switch_status_printer(display_type, current_page, mainlog,
                          loglevel, logmode):
    # Disable logging of the first handler - the stream handler, and disable
    # it's output.
    if (logmode != 'logs'):
        mainlog.handlers[0].setLevel(logging.CRITICAL)

    while True:
        # Wait for the user to press a key.
        command = raw_input()

        if command == '':
            # Switch between logging and display.
            if display_type[0] != 'logs':
                # Disable display, enable on screen logging.
                mainlog.handlers[0].setLevel(loglevel)
                display_type[0] = 'logs'
                # If logs are going slowly, sometimes it's hard to tell you
                # switched.  Make it clear.
                print 'Showing logs...'
            elif display_type[0] == 'logs':
                # Enable display, disable on screen logging (except for
                # critical messages).
                mainlog.handlers[0].setLevel(logging.CRITICAL)
                display_type[0] = 'workers'
        elif command.isdigit():
            current_page[0] = int(command)
            mainlog.handlers[0].setLevel(logging.CRITICAL)
            display_type[0] = 'workers'
        elif command.lower() == 'a':
            mainlog.handlers[0].setLevel(logging.CRITICAL)
            display_type[0] = 'account_stats'
        elif command.lower() == 'f':
            mainlog.handlers[0].setLevel(logging.CRITICAL)
            display_type[0] = 'failedaccounts'
        elif command.lower() == 'h':
            mainlog.handlers[0].setLevel(logging.CRITICAL)
            display_type[0] = 'hashstatus'


# Thread to print out the status of each worker.
def status_printer(threadStatus, account_queue, account_captchas, account_failures, logmode, hash_key,
                   key_scheduler):

    if (logmode == 'logs'):
        display_type = ['logs']
    else:
        display_type = ['workers']

    current_page = [1]
    # Grab current log / level.
    mainlog = logging.getLogger()
    loglevel = mainlog.getEffectiveLevel()

    # Start another thread to get user input.
    t = Thread(target=switch_status_printer,
               name='switch_status_printer',
               args=(display_type, current_page, mainlog, loglevel, logmode))
    t.daemon = True
    t.start()

    while True:
        time.sleep(1)

        if display_type[0] == 'logs':
            # In log display mode, we don't want to show anything.
            continue

        # Create a list to hold all the status lines, so they can be printed
        # all at once to reduce flicker.
        status_text = []

        # Initialize to prevent UnboundLocalError
        total_pages = 1

        if display_type[0] == 'workers':

            # Get the terminal size.
            width, height = terminalsize.get_terminal_size()
            # Queue and overseer take 2 lines.  Switch message takes up 2
            # lines.  Remove an extra 2 for things like screen status lines.
            usable_height = height - 6
            # Prevent people running terminals only 6 lines high from getting a
            # divide by zero.
            if usable_height < 1:
                usable_height = 1

            # Print status of overseer.
            status_text.append('{} Overseer: {}'.format(
                threadStatus['Overseer']['scheduler'],
                threadStatus['Overseer']['message']))

            # Calculate the total number of pages.  Subtracting for the
            # overseer.
            overseer_line_count = (
                threadStatus['Overseer']['message'].count('\n'))
            total_pages = math.ceil(
                (len(threadStatus) - 1 - overseer_line_count) /
                float(usable_height))

            # Prevent moving outside the valid range of pages.
            if current_page[0] > total_pages:
                current_page[0] = total_pages
            if current_page[0] < 1:
                current_page[0] = 1

            # Calculate which lines to print.
            start_line = usable_height * (current_page[0] - 1)
            end_line = start_line + usable_height
            current_line = 1

            # Find the longest username and proxy.
            userlen = 4
            proxylen = 5
            for item in threadStatus:
                if threadStatus[item]['type'] == 'Worker':
                    userlen = max(userlen, len(threadStatus[item]['username']))
                    if 'proxy_display' in threadStatus[item]:
                        proxylen = max(proxylen, len(
                            str(threadStatus[item]['proxy_display'])))

            # How pretty.
            status = '{:10} | {:14} | {:' + str(userlen) + '} | {:' + str(
                proxylen) + '} | {:7} | {:6} | {:5} | {:7} | {:8} | {:10}'

            # Print the worker status.
            status_text.append(status.format('Worker ID', 'Start', 'User',
                                             'Proxy', 'Success', 'Failed',
                                             'Empty', 'Skipped', 'Captchas',
                                             'Message'))
            for item in sorted(threadStatus):
                if(threadStatus[item]['type'] == 'Worker'):
                    current_line += 1

                    # Skip over items that don't belong on this page.
                    if current_line < start_line:
                        continue
                    if current_line > end_line:
                        break

                    status_text.append(status.format(
                        item,
                        time.strftime('%d/%m at %H:%M',
                                      time.localtime(
                                          threadStatus[item]['starttime'])),
                        threadStatus[item]['username'],
                        threadStatus[item]['proxy_display'],
                        threadStatus[item]['success'],
                        threadStatus[item]['fail'],
                        threadStatus[item]['noitems'],
                        threadStatus[item]['skip'],
                        threadStatus[item]['captcha'],
                        threadStatus[item]['message']))

        elif display_type[0] == 'account_stats':
            total_pages = print_account_stats(status_text, threadStatus,
                                              account_queue,
                                              account_captchas,
                                              account_failures,
                                              current_page)

        elif display_type[0] == 'failedaccounts':
            status_text.append('-----------------------------------------')
            status_text.append('Accounts on hold:')
            status_text.append('-----------------------------------------')

            # Find the longest account name.
            userlen = 4
            for account in account_failures:
                userlen = max(userlen, len(account['account']['username']))

            status = '{:' + str(userlen) + '} | {:10} | {:20}'
            status_text.append(status.format('User', 'Hold Time', 'Reason'))

            for account in account_failures:
                status_text.append(status.format(
                    account['account']['username'],
                    time.strftime('%H:%M:%S',
                                  time.localtime(account['last_fail_time'])),
                    account['reason']))

        elif display_type[0] == 'hashstatus':
            status_text.append(
                '----------------------------------------------------------')
            status_text.append('Hash key status:')
            status_text.append(
                '----------------------------------------------------------')

            status = '{:21} | {:9} | {:9} | {:9}'
            status_text.append(status.format('Key', 'Remaining', 'Maximum',
                                             'Peak'))
            if hash_key is not None:
                for key in hash_key:
                    key_instance = key_scheduler.keys[key]
                    key_text = key

                    if key_scheduler.current() == key:
                        key_text += '*'

                    status_text.append(status.format(
                        key_text,
                        key_instance['remaining'],
                        key_instance['maximum'],
                        key_instance['peak']))

        # Print the status_text for the current screen.
        status_text.append((
            'Page {}/{}. Page number to switch pages. F to show on hold ' +
            'accounts. H to show hash status. A to show account stats. <ENTER> alone to switch ' +
            'between status and log view').format(current_page[0],
                                                  total_pages))
        # Clear the screen.
        os.system('cls' if os.name == 'nt' else 'clear')
        # Print status.
        print '\n'.join(status_text)


# Print statistics about accounts
def print_account_stats(rows, thread_status, account_queue,
                        account_captchas, account_failures,
                        current_page):
    rows.append('-----------------------------------------')
    rows.append('Mr. Mime Account Statistics:')
    rows.append('-----------------------------------------')

    args = get_args()

    # Collect all accounts.
    accounts = []
    for item in thread_status:
        if thread_status[item]['type'] == 'Worker':
            worker = thread_status[item]
            account = worker.get('account', {})
            accounts.append(('active', account))
    for account in list(account_queue.queue):
        accounts.append(('spare', account))
    for captcha_tuple in list(account_captchas):
        account = captcha_tuple[1]
        accounts.append(('captcha', account))
    for acc_fail in account_failures:
        account = acc_fail['account']
        accounts.append(('failed', account))

    # Determine maximum username length.
    userlen = 8
    for status, acc in accounts:
        userlen = max(userlen, len(acc.get('username', '')))

    # Print table header.
    row_tmpl = '{:7} | {:' + str(userlen) + '} | {:4} | {:7} | {:3} | {:>8} | {:23} | {:14}' \
                                            ' | {:>10}'
    rows.append(row_tmpl.format('Status', 'Username', 'Warn', 'Blind', 'Lvl', 'XP', 'Enc/Thr/Cap/Spn',
                                'Inventory', 'Walked'))

    # Pagination.
    start_line, end_line, total_pages = calc_pagination(len(accounts), 6,
                                                        current_page)

    # Print account statistics.
    current_line = 0
    for status, account in accounts:
        # Skip over items that don't belong on this page.
        current_line += 1
        if current_line < start_line:
            continue
        if current_line > end_line:
            break

        # Access to the underlying POGOAccount
        pgacc = account.get('pgacc')

        # Format walked km
        km_walked_f = pgacc.get_stats('km_walked', 'none') if pgacc else 'none'
        if km_walked_f != 'none':
            km_walked_str = '{:.1f} km'.format(km_walked_f)
        else:
            km_walked_str = ""

        # Stats
        stats_str = ''
        if pgacc:
            enc = pgacc.get_stats('pokemons_encountered', '?') if pgacc else '?'
            thr = pgacc.get_stats('pokeballs_thrown', '?') if pgacc else '?'
            cap = pgacc.get_stats('pokemons_captured', '?') if pgacc else '?'
            spn = pgacc.get_stats('poke_stop_visits', '?') if pgacc else '?'
            stats_str = '/'.join([str(enc), str(thr), str(cap), str(spn)])

        # Inventory
        inv_str = ''
        if pgacc and pgacc.inventory:
            balls = pgacc.inventory_balls
            lures = pgacc.inventory_lures
            total = pgacc.inventory_total
            inv_str = '{}L/{}B/{}T'.format(lures, balls, total)

        warning = pgacc.is_warned() if pgacc else None
        warning = '' if warning is None else ('Yes' if warning else 'No')

        rareless_scans = pgacc.rareless_scans if pgacc else None
        probably_threshold = int(round(args.rareless_scans_threshold / 2))
        if rareless_scans is None:
            blind = ''
        elif rareless_scans in range(0, probably_threshold):
            blind = 'N'
        elif rareless_scans in range(probably_threshold, args.rareless_scans_threshold):
            blind = 'P'
        else:
            blind = 'Y'
        if blind:
            if rareless_scans >= args.rareless_scans_threshold:
                scans = '{}+'.format(args.rareless_scans_threshold)
            else:
                scans = rareless_scans
            blind = '{} ({})'.format(blind, scans)

        rows.append(row_tmpl.format(
            status,
            account.get('username', ''),
            warning,
            blind,
            pgacc.get_stats('level', '') if pgacc else '',
            pgacc.get_stats('experience', '') if pgacc else '',
            stats_str,
            inv_str,
            km_walked_str))

    return total_pages


# Helper function to calculate start and end line for paginated output
def calc_pagination(total_rows, non_data_rows, current_page):
    width, height = terminalsize.get_terminal_size()
    # Title and table header is not usable space
    usable_height = height - non_data_rows
    # Prevent people running terminals only 6 lines high from getting a
    # divide by zero.
    if usable_height < 1:
        usable_height = 1

    total_pages = math.ceil(total_rows / float(usable_height))

    # Prevent moving outside the valid range of pages.
    if current_page[0] > total_pages:
        current_page[0] = total_pages
    if current_page[0] < 1:
        current_page[0] = 1

    # Calculate which lines to print (1-based).
    start_line = usable_height * (current_page[0] - 1) + 1
    end_line = start_line + usable_height - 1

    return start_line, end_line, total_pages


# The account recycler monitors failed accounts and places them back in the
#  account queue 2 hours after they failed.
# This allows accounts that were soft banned to be retried after giving
# them a chance to cool down.
def account_recycler(args, accounts_queue, account_failures):
    while True:
        # Run once a minute.
        time.sleep(60)
        log.info('Account recycler running. Checking status of %d accounts.',
                 len(account_failures))

        # Create a new copy of the failure list to search through, so we can
        # iterate through it without it changing.
        failed_temp = list(account_failures)

        # Search through the list for any item that last failed before
        # -ari/--account-rest-interval seconds.
        ok_time = now() - args.account_rest_interval
        for a in failed_temp:
            if a['last_fail_time'] <= ok_time:
                # Remove the account from the real list, and add to the account
                # queue.
                log.info('Account {} returning to active duty.'.format(
                    a['account']['username']))
                account_failures.remove(a)
                accounts_queue.put(a['account'])
            else:
                if 'notified' not in a:
                    log.info((
                        'Account {} needs to cool off for {} minutes due ' +
                        'to {}.').format(
                            a['account']['username'],
                            round((a['last_fail_time'] - ok_time) / 60, 0),
                            a['reason']))
                    a['notified'] = True


def worker_status_db_thread(threads_status, name, db_updates_queue):

    while True:
        workers = {}
        overseer = None
        for status in threads_status.values():
            if status['type'] == 'Overseer':
                overseer = {
                    'worker_name': name,
                    'message': status['message'],
                    'method': status['scheduler'],
                    'last_modified': datetime.utcnow(),
                    'accounts_working': status['active_accounts'],
                    'accounts_captcha': status['accounts_captcha'],
                    'accounts_failed': status['accounts_failed'],
                    'success': status['success_total'],
                    'fail': status['fail_total'],
                    'empty': status['empty_total'],
                    'skip': status['skip_total'],
                    'captcha': status['captcha_total'],
                    'start': status['starttime'],
                    'elapsed': status['elapsed']
                }
            elif status['type'] == 'Worker':
                workers[status['username']] = WorkerStatus.db_format(
                    status, name)
        if overseer is not None:
            db_updates_queue.put((MainWorker, {0: overseer}))
            db_updates_queue.put((WorkerStatus, workers))
        time.sleep(3)


# The main search loop that keeps an eye on the over all process.
def search_overseer_thread(args, new_location_queue, control_flags, heartb,
                           db_updates_queue, wh_queue):

    log.info('Search overseer starting...')

    search_items_queue_array = []
    scheduler_array = []
    account_queue = Queue()
    account_sets = AccountSet(args.hlvl_kph)
    threadStatus = {}
    key_scheduler = None
    api_check_time = 0
    hashkeys_last_upsert = timeit.default_timer()
    hashkeys_upsert_min_delay = 5.0
    gym_cache = None

    if args.gym_info:
        gym_cache = TTLCache(maxsize=10000, ttl=60)

    '''
    Create a queue of accounts for workers to pull from. When a worker has
    failed too many times, it can get a new account from the queue and
    reinitialize the API. Workers should return accounts to the queue so
    they can be tried again later, but must wait a bit before doing do so
    to prevent accounts from being cycled through too quickly.
    '''
    for i, account in enumerate(args.accounts):
        account_queue.put(account)

    '''
    Create sets of special case accounts.
    Currently limited to L30+ IV/CP scanning.
    '''
    account_sets.create_set('30', args.accounts_L30)

    # Debug.
    log.info('Added %s accounts to the L30 pool.', len(args.accounts_L30))

    # Create a list for failed accounts.
    account_failures = []
    # Create a double-ended queue for captcha'd accounts
    account_captchas = deque()

    threadStatus['Overseer'] = {
        'message': 'Initializing',
        'type': 'Overseer',
        'starttime': now(),
        'accounts_captcha': 0,
        'accounts_failed': 0,
        'active_accounts': 0,
        'busy_accounts': 0,
        'skip_total': 0,
        'captcha_total': 0,
        'success_total': 0,
        'fail_total': 0,
        'empty_total': 0,
        'elapsed': 0,
        'scheduler': args.scheduler,
        'scheduler_status': {'tth_found': 0}
    }

    # Create the key scheduler.
    if args.hash_key:
        log.info('Enabling hashing key scheduler...')
        key_scheduler = schedulers.KeyScheduler(args.hash_key,
                                                db_updates_queue)

    if (args.print_status):
        log.info('Starting status printer thread...')
        t = Thread(
            target=status_printer,
            name='status_printer',
            args=(threadStatus, account_queue, account_captchas, account_failures, args.print_status,
                  args.hash_key, key_scheduler))
        t.daemon = True
        t.start()

    # Create account recycler thread.
    log.info('Starting account recycler thread...')
    t = Thread(target=account_recycler, name='account-recycler',
               args=(args, account_queue, account_failures))
    t.daemon = True
    t.start()

    # Create captcha overseer thread.
    if args.captcha_solving:
        log.info('Starting captcha overseer thread...')
        t = Thread(target=captcha_overseer_thread, name='captcha-overseer',
                   args=(args, account_queue, account_captchas, key_scheduler,
                         wh_queue))
        t.daemon = True
        t.start()

    if args.status_name is not None:
        log.info('Starting status database thread...')
        t = Thread(target=worker_status_db_thread,
                   name='status_worker_db',
                   args=(threadStatus, args.status_name, db_updates_queue))
        t.daemon = True
        t.start()

    # Create specified number of search_worker_thread.
    log.info('Starting search worker threads...')
    log.info('Configured scheduler is %s.', args.scheduler)
    for i in range(0, args.workers):
        log.debug('Starting search worker thread %d...', i)

        if i == 0 or (args.beehive and i % args.workers_per_hive == 0):
            search_items_queue = Queue()
            # Create the appropriate type of scheduler to handle the search
            # queue.
            scheduler = schedulers.SchedulerFactory.get_scheduler(
                args.scheduler, [search_items_queue], threadStatus, args)

            scheduler_array.append(scheduler)
            search_items_queue_array.append(search_items_queue)

        # Set proxy for each worker, using round robin.
        proxy_display = 'No'
        proxy_url = False    # Will be assigned inside a search thread.

        workerId = 'Worker {:03}'.format(i)
        threadStatus[workerId] = {
            'type': 'Worker',
            'message': 'Creating thread...',
            'success': 0,
            'fail': 0,
            'noitems': 0,
            'skip': 0,
            'captcha': 0,
            'username': '',
            'proxy_display': proxy_display,
            'proxy_url': proxy_url,
        }
        argset = (
            args, account_queue, account_sets, account_failures,
            account_captchas, control_flags, threadStatus[workerId],
            db_updates_queue, wh_queue, scheduler, key_scheduler, gym_cache)

        t = Thread(target=search_worker_thread,
                   name='search-worker-{}'.format(i),
                   args=argset)
        t.daemon = True
        t.start()

    if not args.no_version_check:
        log.info('Enabling new API force Watchdog.')

    # A place to track the current location.
    current_location = False

    # Keep track of the last status for accounts so we can calculate
    # what have changed since the last check
    last_account_status = {}

    stats_timer = 0

    # The real work starts here but will halt when any control flag is set.
    while True:
        if (args.hash_key is not None and
            (hashkeys_last_upsert + hashkeys_upsert_min_delay) <=
                timeit.default_timer()):
            upsertKeys(args.hash_key, key_scheduler, db_updates_queue)
            hashkeys_last_upsert = timeit.default_timer()

        odt_triggered = (args.on_demand_timeout > 0 and
                         (now() - args.on_demand_timeout) > heartb[0])
        if odt_triggered:
            control_flags['on_demand'].set()
            log.info('Searching paused due to inactivity...')

        # Wait here while scanning is paused.
        while is_paused(control_flags):
            for i in range(0, len(scheduler_array)):
                scheduler_array[i].scanning_paused()
            # API Watchdog - Continue to check API version.
            if not args.no_version_check and not odt_triggered:
                api_check_time = check_forced_version(
                    args, api_check_time, control_flags['api_watchdog'])
            time.sleep(1)

        # If a new location has been passed to us, get the most recent one.
        if not new_location_queue.empty():
            log.info('New location caught, moving search grid.')
            try:
                while True:
                    current_location = new_location_queue.get_nowait()
            except Empty:
                pass

            step_distance = 0.45 if args.no_pokemon else 0.07

            locations = generate_hive_locations(
                current_location, step_distance,
                args.step_limit, len(scheduler_array))

            for i in range(0, len(scheduler_array)):
                scheduler_array[i].location_changed(locations[i],
                                                    db_updates_queue)

        # If there are no search_items_queue either the loop has finished or
        # it's been cleared above.  Either way, time to fill it back up.
        for i in range(0, len(scheduler_array)):
            if scheduler_array[i].time_to_refresh_queue():
                threadStatus['Overseer']['message'] = (
                    'Search queue {} empty, scheduling ' +
                    'more items to scan.').format(i)
                log.debug(
                    'Search queue %d empty, scheduling more items to scan.', i)
                try:  # Can't have the scheduler die because of a DB deadlock.
                    scheduler_array[i].schedule()
                except Exception as e:
                    log.error(
                        'Schedule creation had an Exception: {}.'.format(
                            repr(e)))
                    traceback.print_exc(file=sys.stdout)
                    time.sleep(10)
            else:
                threadStatus['Overseer']['message'] = scheduler_array[
                    i].get_overseer_message()

        # Let's update the total stats and add that info to message
        # Added exception handler as dict items change
        try:
            update_total_stats(threadStatus, last_account_status)
        except Exception as e:
            log.error(
                'Update total stats had an Exception: {}.'.format(
                    repr(e)))
            traceback.print_exc(file=sys.stdout)
            time.sleep(10)
        threadStatus['Overseer']['message'] += '\n' + get_stats_message(
            threadStatus, search_items_queue_array, db_updates_queue, wh_queue,
            account_queue, account_failures, account_captchas)

        # If enabled, display statistics information into logs on a
        # periodic basis.
        if args.stats_log_timer:
            stats_timer += 1
            if stats_timer == args.stats_log_timer:
                log.info(threadStatus['Overseer']['message'])
                stats_timer = 0

        # Update Overseer statistics
        threadStatus['Overseer']['accounts_failed'] = len(account_failures)
        threadStatus['Overseer']['accounts_captcha'] = len(account_captchas)

        # Send webhook updates when scheduler status changes.
        if args.speed_scan and 'tth' in args.wh_types:
            wh_status_update(args, threadStatus['Overseer'], wh_queue,
                             scheduler_array[0])

        # API Watchdog - Check if Niantic forces a new API.
        if not args.no_version_check and not odt_triggered:
            api_check_time = check_forced_version(
                args, api_check_time, control_flags['api_watchdog'])

        # Now we just give a little pause here.
        time.sleep(1)


def get_scheduler_tth_found_pct(scheduler):
    tth_found_pct = getattr(scheduler, 'tth_found', 0)

    if tth_found_pct > 0:
        # Avoid division by zero. Keep 0.0 default for consistency.
        active_sp = max(getattr(scheduler, 'active_sp', 0.0), 1.0)
        tth_found_pct = tth_found_pct * 100.0 / float(active_sp)

    return tth_found_pct


def wh_status_update(args, status, wh_queue, scheduler):
    scheduler_name = status['scheduler']

    tth_found = get_scheduler_tth_found_pct(scheduler)
    spawns_found = getattr(scheduler, 'spawns_found', 0)

    if (tth_found - status['scheduler_status']['tth_found']) > 0.01:
        log.debug('Scheduler update is due, sending webhook message.')
        wh_queue.put(('scheduler', {'name': scheduler_name,
                                    'instance': args.status_name,
                                    'tth_found': tth_found,
                                    'spawns_found': spawns_found}))
        status['scheduler_status']['tth_found'] = tth_found


def get_stats_message(threadStatus, search_items_queue_array, db_updates_queue,
                      wh_queue, account_queue, account_failures,
                      account_captchas):
    overseer = threadStatus['Overseer']
    starttime = overseer['starttime']
    elapsed = now() - starttime

    # Just to prevent division by 0 errors, when needed
    # set elapsed to 1 millisecond
    if elapsed == 0:
        elapsed = 1
    overseer['elapsed'] = elapsed
    sph = overseer['success_total'] * 3600.0 / elapsed
    fph = overseer['fail_total'] * 3600.0 / elapsed
    eph = overseer['empty_total'] * 3600.0 / elapsed
    skph = overseer['skip_total'] * 3600.0 / elapsed
    cph = overseer['captcha_total'] * 3600.0 / elapsed
    ccost = cph * 0.00299
    cmonth = ccost * 730

    # Print the queue length.
    search_items_queue_size = 0
    for i in range(0, len(search_items_queue_array)):
        search_items_queue_size += search_items_queue_array[i].qsize()

    message = (
        'Queues: {} search items, {} db updates, {} webhook.  ' +
        'Spare accounts available: {}. Accounts on hold: {}. ' +
        'Accounts with captcha: {}\n'
    ).format(search_items_queue_size,
             db_updates_queue.qsize(),
             wh_queue.qsize(),
             account_queue.qsize(),
             len(account_failures), len(account_captchas))

    message += (
        'Total active: {}, busy: {}, idle: {} | ' +
        'Success: {} ({:.1f}/hr) | ' +
        'Fails: {} ({:.1f}/hr) | ' +
        'Empties: {} ({:.1f}/hr) | ' +
        'Skips {} ({:.1f}/hr) | ' +
        'Captchas: {} ({:.2f}/hr)|${:.2f}/hr|${:.2f}/mo | ' +
        'Elapsed: {:.1f}h'
    ).format(overseer['active_accounts'], overseer['busy_accounts'],
             (overseer['active_accounts'] - overseer['busy_accounts']),
             overseer['success_total'], sph,
             overseer['fail_total'], fph, overseer['empty_total'], eph,
             overseer['skip_total'], skph, overseer['captcha_total'], cph,
             ccost, cmonth, elapsed / 3600.0)

    return message


def update_total_stats(threadStatus, last_account_status):
    overseer = threadStatus['Overseer']
    # Calculate totals.
    active_count = 0
    busy_count = 0
    current_accounts = Set()
    for tstatus in threadStatus.itervalues():
        if tstatus.get('type', '') =='Worker':

            is_active = tstatus.get('active', False)
            if is_active:
                active_count += 1

            if is_active and tstatus.get('message', '') != 'Nothing to scan.':
                busy_count += 1

            username = tstatus.get('username', '')
            current_accounts.add(username)
            last_status = last_account_status.get(username, {})
            overseer['skip_total'] += stat_delta(tstatus, last_status, 'skip')
            overseer['captcha_total'] += stat_delta(tstatus, last_status,
                                                    'captcha')
            overseer['empty_total'] += stat_delta(tstatus, last_status,
                                                  'noitems')
            overseer['fail_total'] += stat_delta(tstatus, last_status, 'fail')
            overseer['success_total'] += stat_delta(tstatus, last_status,
                                                    'success')
            last_account_status[username] = {
                'skip': tstatus['skip'],
                'captcha': tstatus['captcha'],
                'noitems': tstatus['noitems'],
                'fail': tstatus['fail'],
                'success': tstatus['success']
            }

    overseer['active_accounts'] = active_count
    overseer['busy_accounts'] = busy_count

    # Remove last status for accounts that workers
    # are not using anymore
    for username in last_account_status.keys():
        if username not in current_accounts:
            del last_account_status[username]


# Generates the list of locations to scan.
def generate_hive_locations(current_location, step_distance,
                            step_limit, hive_count):
    NORTH = 0
    EAST = 90
    SOUTH = 180
    WEST = 270

    xdist = math.sqrt(3) * step_distance  # Distance between column centers.
    ydist = 3 * (step_distance / 2)  # Distance between row centers.

    results = []

    results.append((current_location[0], current_location[1], 0))

    loc = current_location
    ring = 1

    while len(results) < hive_count:

        loc = get_new_coords(loc, ydist * (step_limit - 1), NORTH)
        loc = get_new_coords(loc, xdist * (1.5 * step_limit - 0.5), EAST)
        results.append((loc[0], loc[1], 0))

        for i in range(ring):
            loc = get_new_coords(loc, ydist * step_limit, NORTH)
            loc = get_new_coords(loc, xdist * (1.5 * step_limit - 1), WEST)
            results.append((loc[0], loc[1], 0))

        for i in range(ring):
            loc = get_new_coords(loc, ydist * (step_limit - 1), SOUTH)
            loc = get_new_coords(loc, xdist * (1.5 * step_limit - 0.5), WEST)
            results.append((loc[0], loc[1], 0))

        for i in range(ring):
            loc = get_new_coords(loc, ydist * (2 * step_limit - 1), SOUTH)
            loc = get_new_coords(loc, xdist * 0.5, WEST)
            results.append((loc[0], loc[1], 0))

        for i in range(ring):
            loc = get_new_coords(loc, ydist * (step_limit), SOUTH)
            loc = get_new_coords(loc, xdist * (1.5 * step_limit - 1), EAST)
            results.append((loc[0], loc[1], 0))

        for i in range(ring):
            loc = get_new_coords(loc, ydist * (step_limit - 1), NORTH)
            loc = get_new_coords(loc, xdist * (1.5 * step_limit - 0.5), EAST)
            results.append((loc[0], loc[1], 0))

        # Back to start.
        for i in range(ring - 1):
            loc = get_new_coords(loc, ydist * (2 * step_limit - 1), NORTH)
            loc = get_new_coords(loc, xdist * 0.5, EAST)
            results.append((loc[0], loc[1], 0))

        loc = get_new_coords(loc, ydist * (2 * step_limit - 1), NORTH)
        loc = get_new_coords(loc, xdist * 0.5, EAST)

        ring += 1

    return results


def search_worker_thread(args, account_queue, account_sets, account_failures,
                         account_captchas, control_flags, status, dbq, whq,
                         scheduler, key_scheduler, gym_cache):

    log.debug('Search worker thread starting...')

    # The outer forever loop restarts only when the inner one is
    # intentionally exited - which should only be done when the worker
    # is failing too often, and probably banned.
    # This reinitializes the API and grabs a new account from the queue.
    while True:
        try:
            # Force storing of previous worker info to keep consistency.
            if 'starttime' in status:
                dbq.put((WorkerStatus, {0: WorkerStatus.db_format(status)}))

            status['starttime'] = now()
            status['active'] = False

            # Track per loop.
            first_login = True

            # Make sure the scheduler is done for valid locations.
            while not scheduler.ready:
                time.sleep(1)

            status['message'] = ('Waiting to get new account from the'
                                 + ' queue...')
            log.info(status['message'])

            # Get an account.
            stagger_thread(args)
            account = get_account(args, account_queue, status)
            # Reset account statistics tracked per loop.
            prevStatus = WorkerStatus.get_worker(account['username'])
            if prevStatus:
                status.update(prevStatus)
            else:
                status.update({
                    'username': account['username'],
                    'last_modified': datetime.utcnow(),
                    'last_scan_date': datetime.utcnow(),
                    'latitude': None,
                    'longitude': None
                })
            # New lease of life right here.
            status.update({
                'account':
                    account,
                'fail':
                    0,
                'success':
                    0,
                'noitems':
                    0,
                'skip':
                    0,
                'captcha':
                    0,
                'active':
                    True,
                'message':
                    'Switching to account {}.'.format(account['username'])
            })
            log.info(status['message'])

            # Sleep when consecutive_fails reaches max_failures, overall fails
            # for stat purposes.
            consecutive_fails = 0

            # Sleep when consecutive_noitems reaches max_empty, overall noitems
            # for stat purposes.
            consecutive_noitems = 0

            pgacc = setup_mrmime_account(args, status, account)

            # The forever loop for the searches.
            while True:
                while is_paused(control_flags):
                    status['message'] = 'Scanning paused.'
                    time.sleep(2)

                # If this account has been messing up too hard, let it rest.
                if ((args.max_failures > 0) and
                        (consecutive_fails >= args.max_failures)):
                    status['message'] = (
                        'Account {} failed more than {} scans; possibly bad ' +
                        'account. Switching accounts...').format(
                            account['username'],
                            args.max_failures)
                    log.warning(status['message'])
                    account_failed(args, account_failures, account,
                                   'failed more than {} times'.format(args.max_failures))
                    # Exit this loop to get a new account and have the API
                    # recreated.
                    break

                # If this account has not found anything for too long, let it
                # rest.
                if ((args.max_empty > 0) and
                        (consecutive_noitems >= args.max_empty)):
                    status['message'] = (
                        'Account {} returned empty scan for more than {} ' +
                        'scans; possibly ip is banned. Switching ' +
                        'accounts...').format(account['username'],
                                              args.max_empty)
                    log.warning(status['message'])
                    account_failed(args, account_failures, account, 'empty scans')
                    # Exit this loop to get a new account and have the API
                    # recreated.
                    break

                # If used proxy disappears from "live list" after background
                # checking - switch account but do not freeze it (it's not an
                # account failure).
                if args.proxy and status['proxy_url'] not in args.proxy:
                    status['message'] = (
                        'Account {} proxy {} is not in a live list any ' +
                        'more. Switching accounts...').format(
                            account['username'], status['proxy_url'])
                    log.warning(status['message'])
                    # Experimental, nobody did this before.
                    account_revive(args, account_queue, account)
                    # Exit this loop to get a new account and have the API
                    # recreated.
                    break

                # If this account has been running too long, let it rest.
                if (args.account_search_interval is not None):
                    if (status['starttime'] <=
                            (now() - args.account_search_interval)):
                        status['message'] = (
                            'Account {} is being rotated out to rest.'.format(
                                account['username']))
                        log.info(status['message'])
                        account_failed(args, account_failures, account, 'rest interval')
                        break

                # Let account rest if it got blind (although resting won't heal it unfortunately.)
                if pgacc.rareless_scans is not None:
                    prev_sbanned = pgacc.shadowbanned if pgacc.shadowbanned is not None else False
                    pgacc.shadowbanned = pgacc.rareless_scans >= args.rareless_scans_threshold
                    if not prev_sbanned and pgacc.shadowbanned:
                        if args.rotate_blind:
                            status['message'] = (
                                'Account {} has become blind ({} rareless scans). Rotating out.'.format(
                                    account['username'], pgacc.rareless_scans))
                            log.info(status['message'])
                            account_failed(args, account_failures, account, 'shadowbanned')
                            break
                        else:
                            log.info("Account {} has become blind ({} rareless scans).".format(account['username'],
                                                                                               pgacc.rareless_scans))
                    elif prev_sbanned and not pgacc.shadowbanned:
                        log.info("Account {} can see rares again! Hooray!.".format(account['username']))

                # Grab the next thing to search (when available).
                step, scan_coords, appears, leaves, messages, wait = (
                    scheduler.next_item(status))

                status['message'] = messages['wait']
                # The next_item will return the value telling us how long
                # to sleep. This way the status can be updated
                if wait > 0:
                    time.sleep(wait)

                # Using step as a flag for no valid next location returned.
                if step == -1:
                    time.sleep(scheduler.delay(status['last_scan_date']))
                    continue

                # get the ScannedLocation before jittering
                scan_location = ScannedLocation.get_by_loc(scan_coords)

                # Jitter the coords if configured.
                if args.jitter:
                    scan_coords = jitter_location(scan_coords)
                    log.debug('Jittered to: %f/%f/%f.', scan_coords[0],
                              scan_coords[1], scan_coords[2])

                # Too soon?
                # Adding a 10 second grace period.
                if appears and now() < appears + 10:
                    first_loop = True
                    paused = False
                    while now() < appears + 10:
                        if is_paused(control_flags):
                            paused = True
                            break  # Why can't python just have `break 2`...
                        status['message'] = messages['early']
                        if first_loop:
                            log.info(status['message'])
                            first_loop = False
                        time.sleep(1)
                    if paused:
                        scheduler.task_done(status)
                        continue

                # Too late?
                if leaves and now() > (leaves - args.min_seconds_left):
                    scheduler.task_done(status)
                    status['skip'] += 1
                    status['message'] = messages['late']
                    log.info(status['message'])
                    # No sleep here; we've not done anything worth sleeping
                    # for. Plus we clearly need to catch up!
                    continue

                status['message'] = messages['search']
                log.debug(status['message'])

                # Let the api know where we intend to be for this loop.
                # Doing this before check_login so it does not also have
                # to be done when the auth token is refreshed.
                pgacc.set_position(scan_coords[0], scan_coords[1],
                                   scan_coords[2])

                if args.hash_key:
                    key = key_scheduler.next()
                    log.debug('Using key {} for this scan.'.format(key))
                    pgacc.hash_key = key

                # Ok, let's get started -- check our login status.
                status['message'] = 'Logging in...'
                pgacc.check_login()

                # Only run this when it's the account's first login, after
                # check_login().
                if first_login:
                    first_login = False

                # Putting this message after the check_login so the messages
                # aren't out of order.
                status['message'] = messages['search']
                log.info(status['message'])

                # Make the actual request.
                scan_date = datetime.utcnow()
                response_dict = pgacc.req_get_map_objects()
                status['last_scan_date'] = datetime.utcnow()

                # Record the time and the place that the worker made the
                # request.
                status['latitude'] = scan_coords[0]
                status['longitude'] = scan_coords[1]
                dbq.put((WorkerStatus, {0: WorkerStatus.db_format(status)}))

                # Nothing back. Mark it up, sleep, carry on.
                if not response_dict:
                    status['fail'] += 1
                    consecutive_fails += 1
                    status['message'] = messages['invalid']
                    log.error(status['message'])
                    time.sleep(scheduler.delay(status['last_scan_date']))
                    continue

                # Got the response, check for captcha, parse it out, then send
                # todo's to db/wh queues.
                try:
                    captcha = handle_captcha(args, status, pgacc, account,
                                             account_failures,
                                             account_captchas, whq,
                                             scan_coords)
                    if captcha is not None and captcha:
                        # Make another request for the same location
                        # since the previous one was captcha'd.
                        scan_date = datetime.utcnow()
                        response_dict = pgacc.req_get_map_objects()
                    elif captcha is not None:
                        account_queue.task_done()
                        time.sleep(3)
                        break

                    parsed = parse_map(args, response_dict, scan_coords,
                                       scan_location, dbq, whq, key_scheduler,
                                       pgacc, status, scan_date, account,
                                       account_sets)

                    scheduler.task_done(status, parsed)
                    if parsed['count'] > 0:
                        status['success'] += 1
                        consecutive_noitems = 0
                    else:
                        status['noitems'] += 1
                        consecutive_noitems += 1
                    consecutive_fails = 0
                    status['message'] = ('Search at {:6f},{:6f} completed ' +
                                         'with {} finds.').format(
                        scan_coords[0], scan_coords[1],
                        parsed['count'])
                    log.debug(status['message'])
                except Exception as e:
                    parsed = False
                    status['fail'] += 1
                    consecutive_fails += 1
                    # consecutive_noitems = 0 - I propose to leave noitems
                    # counter in case of error.
                    status['message'] = ('Map parse failed at {:6f},{:6f}, ' +
                                         'abandoning location. {} may be ' +
                                         'banned.').format(scan_coords[0],
                                                           scan_coords[1],
                                                           account['username'])
                    log.exception('{}. Exception message: {}'.format(
                        status['message'], repr(e)))
                finally:
                    if response_dict is not None:
                        del response_dict

                # Get detailed information about gyms.
                if args.gym_info and parsed:
                    # Build a list of gyms to update.
                    gyms_to_update = {}
                    for gym in parsed['gyms'].values():
                        with gym_cache_lock:
                            if gym['gym_id'] in gym_cache:
                                log.debug(
                                    ('Skipping update of gym @ %f/%f, ' +
                                     'already in progress.'),
                                    gym['latitude'], gym['longitude'])
                                continue
                            else:
                                # Set the gym as in progress it will just be
                                # locked for 60 seconds due to TTL eviction.
                                gym_cache[gym['gym_id']] = True

                        # Can only get gym details within 1km of our position.
                        gym_distance = distance(
                            scan_coords, [gym['latitude'], gym['longitude']])
                        if gym_distance < 1000:
                            # Check if we already have details on this gym.
                            # Get them if not.
                            try:
                                record = GymDetails.get(gym_id=gym['gym_id'])
                            except GymDetails.DoesNotExist:
                                gyms_to_update[gym['gym_id']] = gym
                                continue
                            GymDetails.database().close()

                            # If we have a record of this gym already, check if
                            # the gym has been updated since our last update.
                            if record.last_scanned < gym['last_modified']:
                                gyms_to_update[gym['gym_id']] = gym
                                continue
                            else:
                                log.debug(
                                    ('Skipping update of gym @ %f/%f, ' +
                                     'up to date.'),
                                    gym['latitude'], gym['longitude'])
                                continue
                        else:
                            log.debug(
                                'Skipping update of gym @ %f/%f, too far ' +
                                'away from our location at %f/%f (%.0fm).',
                                gym['latitude'], gym['longitude'],
                                scan_coords[0], scan_coords[1],
                                gym_distance)

                    if len(gyms_to_update):
                        gym_responses = {}
                        current_gym = 1
                        status['message'] = (
                            'Updating {} gyms for location {},{}...').format(
                                len(gyms_to_update), scan_coords[0],
                                scan_coords[1])
                        log.debug(status['message'])

                        for gym in gyms_to_update.values():
                            time.sleep(random.random() + 2)
                            status['message'] = (
                                'Getting details for gym {} of {} for ' +
                                'location {:6f},{:6f}...').format(
                                    current_gym,
                                    len(gyms_to_update), scan_coords[0],
                                    scan_coords[1])
                            log.info('Getting details for gym @ %f/%f ' +
                                     '(%.0fm away)', gym['latitude'],
                                     gym['longitude'],
                                     distance(scan_coords, [
                                         gym['latitude'], gym['longitude']
                                     ]))

                            response = gym_request(pgacc, scan_coords, gym)

                            # Make sure the gym was in range. (Sometimes the
                            # API gets cranky about gyms that are ALMOST 1km
                            # away.)
                            if response['GYM_GET_INFO'].result == 2:
                                log.warning(
                                    'Gym @ %f/%f is out of range (%.0fm), ' +
                                    'skipping.', gym['latitude'],
                                    gym['longitude'], distance)
                            else:
                                gym_responses[gym['gym_id']] = response['GYM_GET_INFO']
                            del response
                            # Increment which gym we're on for status messages.
                            current_gym += 1

                        status['message'] = (
                            'Processing details of {} gyms for location ' +
                            '{:6f},{:6f}...').format(len(gyms_to_update),
                                                     scan_coords[0],
                                                     scan_coords[1])
                        log.debug(status['message'])

                        if gym_responses:
                            parse_gyms(args, gym_responses,
                                       whq, dbq)
                            del gym_responses

                # Update hashing key stats in the database based on the values
                # reported back by the hashing server.
                if args.hash_key:
                    key = HashServer.status.get('token', None)
                    key_instance = key_scheduler.keys[key]
                    key_instance['remaining'] = HashServer.status.get(
                        'remaining', 0)

                    key_instance['maximum'] = (
                        HashServer.status.get('maximum', 0))

                    usage = (
                        key_instance['maximum'] -
                        key_instance['remaining'])

                    if key_instance['peak'] < usage:
                        key_instance['peak'] = usage

                    if key_instance['expires'] is None:
                        expires = HashServer.status.get(
                            'expiration', None)

                        if expires is not None:
                            expires = datetime.utcfromtimestamp(expires)
                            key_instance['expires'] = expires

                    key_instance['last_updated'] = datetime.utcnow()

                    log.debug('Hash key %s has %s/%s RPM left.', key,
                              key_instance['remaining'],
                              key_instance['maximum'])

                # Delay the desired amount after "scan" completion.
                delay = scheduler.delay(status['last_scan_date'])

                status['message'] += ' Sleeping {}s until {}.'.format(
                    delay,
                    time.strftime(
                        '%H:%M:%S',
                        time.localtime(time.time() + args.scan_delay)))
                log.debug(status['message'])
                time.sleep(delay)

        # Catch any process exceptions, log them, and continue the thread.
        except Exception as e:
            log.exception(
                'Exception in search_worker under account %s.',
                account['username'])
            status['active'] = False
            status['message'] = (
                'Exception in search_worker using account {}. Restarting ' +
                'with fresh account. See logs for details.').format(
                    account['username'])
            account_failed(args, account_failures, account, repr(e))
            time.sleep(args.scan_delay)


def gym_request(pgacc, position, gym):
    try:
        response = pgacc.req_gym_get_info(gym['gym_id'],
                                          gym['latitude'],
                                          gym['longitude'],
                                          position[0],
                                          position[1])
        response = clear_dict_response(response)
        return response

    except Exception as e:
        log.exception('Exception while downloading gym details: %s.', repr(e))
        return False


def calc_distance(pos1, pos2):
    R = 6378.1  # KM radius of the earth.

    dLat = math.radians(pos1[0] - pos2[0])
    dLon = math.radians(pos1[1] - pos2[1])

    a = math.sin(dLat / 2) * math.sin(dLat / 2) + \
        math.cos(math.radians(pos1[0])) * math.cos(math.radians(pos2[0])) * \
        math.sin(dLon / 2) * math.sin(dLon / 2)

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    d = R * c

    return d


def upsertKeys(keys, key_scheduler, db_updates_queue):
    # Prepare hashing keys to be sent to the database.
    # Keep highest peak value stored.
    hashkeys = {}
    stored_peaks = HashKeys.get_stored_peaks()
    for key, instance in key_scheduler.keys.iteritems():
        hashkeys[key] = instance
        hashkeys[key]['key'] = key

        if key in stored_peaks:
            max_peak = max(instance['peak'], stored_peaks[key])
            hashkeys[key]['peak'] = max_peak
    db_updates_queue.put((HashKeys, hashkeys))


# Delay each thread start time so that logins occur after delay.
def stagger_thread(args):
    loginDelayLock.acquire()
    delay = args.login_delay + ((random.random() - .5) / 2)
    log.debug('Delaying thread startup for %.2f seconds', delay)
    time.sleep(delay)
    loginDelayLock.release()


# The delta from last stat to current stat
def stat_delta(current_status, last_status, stat_name):
    return current_status.get(stat_name, 0) - last_status.get(stat_name, 0)


def check_forced_version(args, api_check_time, api_watchdog_flag):
    if int(time.time()) > api_check_time:
        log.debug("Checking forced API version.")
        api_check_time = int(time.time()) + args.version_check_interval
        forced_api = get_api_version(args)

        if not forced_api:
            # Couldn't retrieve API version. Pause scanning.
            api_watchdog_flag.set()
            log.warning('Forced API check got no or invalid response. ' +
                        'Possible bad proxy.')
            log.warning('Scanner paused due to failed API check.')
            return api_check_time

        # Got a response let's compare version numbers.
        try:
            if StrictVersion(args.api_version) < StrictVersion(forced_api):
                # Installed API version is lower. Pause scanning.
                api_watchdog_flag.set()
                log.warning('Started with API: %s, ' +
                            'Niantic forced to API: %s',
                            args.api_version,
                            forced_api)
                log.warning('Scanner paused due to forced Niantic API update.')
            else:
                # API check was successful and
                # installed API version is newer or equal forced API.
                # Continue scanning.
                log.debug("API check was successful. Continue scanning.")
                api_watchdog_flag.clear()

        except ValueError:
            # Unknown version format. Pause scanning as well.
            api_watchdog_flag.set()
            log.warning('Niantic forced unknown API version format: %s.',
                        forced_api)
            log.warning('Scanner paused due to unknown API version format.')
        except Exception as e:
            # Something else happened. Pause scanning as well.
            api_watchdog_flag.set()
            log.warning('Unknown error on API version comparison: %s.',
                        repr(e))
            log.warning('Scanner paused due to unknown API check error.')

    return api_check_time


def get_api_version(args):
    """Retrieve forced API version by Niantic

    Args:
        args: Command line arguments

    Returns:
        API version string. False if request failed.
    """
    proxies = {}

    if args.proxy:
        num, proxy = get_new_proxy(args)
        proxies = {
            'http': proxy,
            'https': proxy
        }

    try:
        s = requests.Session()
        s.mount('https://',
                HTTPAdapter(max_retries=Retry(total=3,
                                              backoff_factor=0.5,
                                              status_forcelist=[500, 502,
                                                                503, 504])))
        r = s.get(
            'https://pgorelease.nianticlabs.com/plfe/version',
            proxies=proxies,
            verify=False,
            timeout=5)

        return r.text[2:] if r.status_code == requests.codes.ok else False
    except Exception as e:
        log.warning('error on API check: %s', repr(e))
        return False


def is_paused(control_flags):
    for flag in control_flags.values():
        if flag.is_set():
            return True
    return False
