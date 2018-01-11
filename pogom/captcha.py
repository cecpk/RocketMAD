#!/usr/bin/python
# -*- coding: utf-8 -*-

'''
 - Captcha Overseer:
   - Tracks incoming new captcha tokens
   - Monitors the captcha'd accounts queue
   - Launches captcha_solver threads
 - Captcha Solver Threads each:
   - Have a unique captcha token
   - Attempts to verifyChallenge
   - Puts account back in active queue
   - Pushes webhook messages with captcha status
'''

import logging
import time
import requests

from datetime import datetime
from threading import Thread

from mrmime.pogoaccount import POGOAccount

from .models import Token
from .account import account_revive, account_failed
from .proxy import get_new_proxy
from .utils import now


log = logging.getLogger(__name__)


def captcha_overseer_thread(args, account_queue, account_captchas,
                            key_scheduler, wh_queue):
    solverId = 0
    while True:
        # Run once every 15 seconds.
        sleep_timer = 15

        tokens_needed = len(account_captchas)
        if tokens_needed > 0:
            tokens = Token.get_valid(tokens_needed)
            tokens_available = len(tokens)
            solvers = min(tokens_needed, tokens_available)
            log.debug('Captcha overseer running. Captchas: %d - Tokens: %d',
                      tokens_needed, tokens_available)
            for i in range(0, solvers):
                hash_key = None
                if args.hash_key:
                    hash_key = key_scheduler.next()

                t = Thread(target=captcha_solver_thread,
                           name='captcha-solver-{}'.format(solverId),
                           args=(args, account_queue, account_captchas,
                                 hash_key, wh_queue, tokens[i]))
                t.daemon = True
                t.start()

                solverId += 1
                if solverId > 999:
                    solverId = 0
                # Wait a bit before launching next thread
                time.sleep(1)

            # Adjust captcha-overseer sleep timer
            sleep_timer -= 1 * solvers

            # Hybrid mode
            if args.captcha_key and args.manual_captcha_timeout > 0:
                tokens_remaining = tokens_needed - tokens_available
                # Safety guard
                tokens_remaining = min(tokens_remaining, 5)
                for i in range(0, tokens_remaining):
                    account = account_captchas[0][1]
                    last_active = account['last_active']
                    hold_time = (datetime.utcnow() -
                                 last_active).total_seconds()
                    if hold_time > args.manual_captcha_timeout:
                        log.debug('Account %s waited %ds for captcha token ' +
                                  'and reached the %ds timeout.',
                                  account['username'], hold_time,
                                  args.manual_captcha_timeout)
                        if args.hash_key:
                            hash_key = key_scheduler.next()

                        t = Thread(target=captcha_solver_thread,
                                   name='captcha-solver-{}'.format(solverId),
                                   args=(args, account_queue, account_captchas, account,
                                         hash_key, wh_queue))
                        t.daemon = True
                        t.start()

                        solverId += 1
                        if solverId > 999:
                            solverId = 0
                        # Wait a bit before launching next thread
                        time.sleep(1)
                    else:
                        break

        time.sleep(sleep_timer)


def captcha_solver_thread(args, account_queue, account_captchas, hash_key,
                          wh_queue, token=None):
    status, account, captcha_url = account_captchas.popleft()

    status['message'] = 'Waking up account {} to verify captcha token.'.format(
                         account['username'])
    log.info(status['message'])

    pgacc = POGOAccount(account['auth_service'], account['username'],
                        account['password'])

    if hash_key:
        log.debug('Using key {} for solving this captcha.'.format(hash_key))
        pgacc.hash_key = hash_key

    if args.proxy:
        # Try to fetch a new proxy.
        proxy_num, proxy_url = get_new_proxy(args)

        if proxy_url:
            log.debug('Using proxy %s', proxy_url)
            pgacc.proxy_url = proxy_url

    location = account['last_location']

    pgacc.set_position(location[0], location[1], location[2])
    pgacc.check_login()

    if not token:
        token = token_request(args, status, captcha_url)

    verified = pgacc.req_verify_challenge(token)

    last_active = account['last_active']
    hold_time = (datetime.utcnow() - last_active).total_seconds()

    if verified:
        status['message'] = pgacc.last_msg + ", returning to active duty."
        log.info(status['message'])
        account_revive(args, account_queue, account)
    else:
        status['message'] = pgacc.last_msg + ", putting back in captcha queue."
        log.warning(status['message'])
        account_captchas.append((status, account, captcha_url))

    if 'captcha' in args.wh_types:
        wh_message = {
            'status_name': args.status_name,
            'mode': 'manual' if token else '2captcha',
            'account': account['username'],
            'captcha': status['captcha'],
            'time': int(hold_time),
            'status': 'success' if verified else 'failure'
        }
        wh_queue.put(('captcha', wh_message))
    # Make sure status is updated
    time.sleep(1)


def handle_captcha(args, status, pgacc, account, account_failures,
                   account_captchas, whq, step_location):
    if pgacc.has_captcha():
        status['captcha'] += 1
        if not args.captcha_solving:
            status['message'] = (
                'Account {} has encountered a captcha. ' +
                'Putting account away.').format(account['username'])
            log.warning(status['message'])
            account_failed(args, account_failures, account, 'captcha found')
            if 'captcha' in args.wh_types:
                wh_message = {
                    'status_name': args.status_name,
                    'status': 'encounter',
                    'mode': 'disabled',
                    'account': account['username'],
                    'captcha': status['captcha'],
                    'time': 0
                }
                whq.put(('captcha', wh_message))
            return False

        if args.captcha_key and args.manual_captcha_timeout == 0:
            if automatic_captcha_solve(args, status, pgacc, pgacc.captcha_url,
                                       whq):
                return True
            else:
                account_failed(args, account_failures, account, 'captcha failed to verify')
                return False
        else:
            status['message'] = (
                'Account {} has encountered a captcha. ' +
                'Waiting for token.').format(account['username'])
            log.warning(status['message'])
            account['last_active'] = datetime.utcnow()
            account['last_location'] = step_location
            account_captchas.append((status, account, pgacc.captcha_url))
            if 'captcha' in args.wh_types:
                wh_message = {
                    'status_name': args.status_name,
                    'status': 'encounter',
                    'mode': 'manual',
                    'account': account['username'],
                    'captcha': status['captcha'],
                    'time': args.manual_captcha_timeout
                }
                whq.put(('captcha', wh_message))
            return False

    return None


# Return True if captcha was succesfully solved
def automatic_captcha_solve(args, status, pgacc, captcha_url, account, wh_queue):
    status['message'] = (
        'Account {} is encountering a captcha, starting 2captcha ' +
        'sequence.').format(account['username'])
    log.warning(status['message'])

    if 'captcha' in args.wh_types:
        wh_message = {'status_name': args.status_name,
                      'status': 'encounter',
                      'mode': '2captcha',
                      'account': account['username'],
                      'captcha': status['captcha'],
                      'time': 0}
        wh_queue.put(('captcha', wh_message))

    time_start = now()
    captcha_token = token_request(args, status, captcha_url)
    time_elapsed = now() - time_start

    if 'ERROR' in captcha_token:
        log.warning('Unable to resolve captcha, please check your ' +
                    '2captcha API key and/or wallet balance.')
        if 'captcha' in args.wh_types:
            wh_message['status'] = 'error'
            wh_message['time'] = time_elapsed
            wh_queue.put(('captcha', wh_message))

        return False
    else:
        status['message'] = (
            'Retrieved captcha token, attempting to verify challenge ' +
            'for {}.').format(account['username'])
        log.info(status['message'])

        verify_succeeded = pgacc.req_verify_challenge(captcha_token)
        time_elapsed = now() - time_start
        if verify_succeeded:
            status['message'] = pgacc.last_msg
        else:
            status['message'] = pgacc.last_msg + ', putting away account for now.'
        log.info(status['message'])
        if 'captcha' in args.wh_types:
            wh_message['status'] = 'success' if verify_succeeded else 'failure'
            wh_message['time'] = time_elapsed
            wh_queue.put(('captcha', wh_message))

        return verify_succeeded


def token_request(args, status, url):
    s = requests.Session()
    # Fetch the CAPTCHA_ID from 2captcha.
    try:
        request_url = (
            'http://2captcha.com/in.php?key={}&method=userrecaptcha' +
            '&googlekey={}&pageurl={}').format(args.captcha_key,
                                               args.captcha_dsk, url)
        captcha_id = s.post(request_url, timeout=5).text.split('|')[1]
        captcha_id = str(captcha_id)
    # IndexError implies that the retuned response was a 2captcha error.
    except IndexError:
        return 'ERROR'
    status['message'] = (
        'Retrieved captcha ID: {}; now retrieving token.').format(captcha_id)
    log.info(status['message'])
    # Get the response, retry every 5 seconds if it's not ready.
    recaptcha_response = s.get(
        'http://2captcha.com/res.php?key={}&action=get&id={}'.format(
            args.captcha_key, captcha_id), timeout=5).text
    while 'CAPCHA_NOT_READY' in recaptcha_response:
        log.info('Captcha token is not ready, retrying in 5 seconds...')
        time.sleep(5)
        recaptcha_response = s.get(
            'http://2captcha.com/res.php?key={}&action=get&id={}'.format(
                args.captcha_key, captcha_id), timeout=5).text
    token = str(recaptcha_response.split('|')[1])
    return token
