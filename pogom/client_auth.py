#!/usr/bin/python
# -*- coding: utf-8 -*-

import logging
import requests
import urllib
import datetime

from flask import jsonify
from requests.exceptions import HTTPError

log = logging.getLogger(__name__)
log.setLevel('INFO')

def redirect_client_to_auth(url_root, args):
  d = {}
  host = args.uas_host_override
  if not host:
    host = url_root
  d['auth_redirect'] = 'https://discordapp.com/api/oauth2/authorize?client_id=' + args.uas_client_id + '&redirect_uri=' + urllib.quote(host + 'auth_callback') + '&response_type=code&scope=identify%20guilds'
  return jsonify(d)

def valid_client_auth(request, user_auth_code_cache, args):
  userAuthCode = request.args.get('userAuthCode')
  if not userAuthCode:
    log.debug("no userAuthCode")
    return False
  oauth_response = user_auth_code_cache.get(userAuthCode, False)
  if not oauth_response:
    oauth_response = exchange_code(userAuthCode, request.url_root, args)
    if (not oauth_response):
      return False
    user_auth_code_cache[userAuthCode] = oauth_response
    user_auth_code_cache[userAuthCode]['expires'] = datetime.datetime.now() + datetime.timedelta(0, int(oauth_response.get('expires_in')))
  if user_auth_code_cache[userAuthCode]['expires'] < datetime.datetime.now():
    log.debug("oauth expired")
    del user_auth_code_cache[userAuthCode]
    return False
  if args.uas_discord_required_guild:
    if not user_auth_code_cache[userAuthCode].get('guilds', False):
      user_auth_code_cache[userAuthCode]['guilds'] = get_user_guilds(user_auth_code_cache[userAuthCode]['access_token'])
      if not user_auth_code_cache[userAuthCode]['guilds']:
        del user_auth_code_cache[userAuthCode]
        return False
    if args.uas_discord_required_roles:
      if not user_auth_code_cache[userAuthCode].get('roles', False):
        user_auth_code_cache[userAuthCode]['roles'] = get_user_guild_roles(user_auth_code_cache[userAuthCode]['access_token'], args)
        if not user_auth_code_cache[userAuthCode]['roles']:
          del user_auth_code_cache[userAuthCode]
          return False
  return True

def valid_discord_guild(request, user_auth_code_cache, args):
  userAuthCode = request.args.get('userAuthCode')
  guilds = user_auth_code_cache.get(userAuthCode)['guilds']
  for g in guilds:
    if g['id'] == args.uas_discord_required_guild:
      return True
  log.debug("User not in required discord guild.")
  del user_auth_code_cache[userAuthCode]['guilds']
  return False

def valid_discord_guild_role(request, user_auth_code_cache, args):
  userAuthCode = request.args.get('userAuthCode')
  userRoles = user_auth_code_cache.get(userAuthCode)['roles']
  requiredRoles = args.uas_discord_required_roles.split(',')
  for r in userRoles:
    if r in requiredRoles:
      return True
  log.debug("User not in required discord guild role.")
  del user_auth_code_cache[userAuthCode]['roles']
  return False
  
def redirect_to_discord_guild_invite(args):
  d = {}
  d['auth_redirect'] = args.uas_discord_guild_invite
  return jsonify(d)

def exchange_code(code, url_root, args):
  data = {
    'client_id': args.uas_client_id,
    'client_secret': args.uas_client_secret,
    'grant_type': 'authorization_code',
    'code': code,
    'redirect_uri': url_root + "auth_callback"
  }
  headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
  r = requests.post('%s/oauth2/token' % 'https://discordapp.com/api/v6', data, headers)
  if r.status_code == 401:
    return False
  try:
    r.raise_for_status()
  except HTTPError:
    log.debug('' + str(r.status_code) + ' returned from OAuth attempt: ' + r.text)
    return False
  return r.json()

def get_user_guilds(auth_token):
  headers = {
    'Authorization': 'Bearer ' + auth_token
  }
  r = requests.get('https://discordapp.com/api/v6/users/@me/guilds', headers=headers)
  try:
    r.raise_for_status()
  except:
    log.debug('' + str(r.status_code) + ' returned from guild list attempt: ' + r.text)
    return False
  return r.json()
    

def get_user_guild_roles(auth_token, args):
  headers = {
    'Authorization': 'Bearer ' + auth_token
  }
  r = requests.get('https://discordapp.com/api/v6/users/@me', headers=headers)
  try:
    r.raise_for_status()
  except:
    log.debug('' + str(r.status_code) + ' returned from Discord @me attempt: ' + r.text)
    return False
  user_id = r.json()['id']
  headers = {
    'Authorization': 'Bot ' + args.uas_discord_bot_token
  }
  r = requests.get('https://discordapp.com/api/v6/guilds/' + args.uas_discord_required_guild + '/members/' + user_id, headers=headers)
  try:
    r.raise_for_status()
  except:
    log.debug('' + str(r.status_code) + ' returned from Discord guild member attempt: ' + r.text)
    return False
  return r.json()['roles']
    
