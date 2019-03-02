import logging
import os
import json
from datetime import datetime
import calendar
from .utils import get_pokemon_name
import sys
reload(sys)
sys.setdefaultencoding('utf8')
log = logging.getLogger(__name__)


def generate_quest(quest):
        if quest['quest_timestamp']:
            ts_db = datetime.fromtimestamp(quest['quest_timestamp']).strftime("%Y-%m-%d")
            ts_now = datetime.today().strftime('%Y-%m-%d')
            if ts_db == ts_now:
                quest_acc = True
            else:
                quest_acc = False
                
        else:
            quest_acc = False
            
        quest_reward_type = questreward(quest['quest_reward_type'])

        if quest_acc and quest_reward_type:
            
            quest_reward_type_raw = quest['quest_reward_type']
            quest_type = (questtype(quest['quest_type']))
            quest_type_text = quest_type
            timestamp = quest['quest_timestamp']
        
        
            if quest_reward_type == 'Item':
                item_amount = str(quest['quest_item_amount'])
                item_id = quest['quest_item_id']
                item_type = str(rewarditem(quest['quest_item_id']))
                quest_target = str(quest['quest_target'])
                pokemon_id = "0"
                pokemon_name = ""
                if '{0}' in quest_type:
                    quest_type_text = quest_type.replace('{0}', str(quest['quest_target']))
                    quest_target = str(quest['quest_target'])
            
            elif quest_reward_type == 'Stardust':
                item_amount = str(quest['quest_stardust'])
                item_type = "Stardust"
                item_id = "000"
                quest_target = str(quest['quest_target'])
                pokemon_id = "0"
                pokemon_name = ""
                if '{0}' in quest_type:
                    quest_type_text = quest_type.replace('{0}', str(quest['quest_target']))
                    quest_target = str(quest['quest_target'])
            elif quest_reward_type == 'Pokemon':
                item_amount = "1"
                item_type = "Pokemon"
                item_id = "000"
                pokemon_id = str(quest['quest_pokemon_id'])
                pokemon_name = get_pokemon_name(pokemon_id)
                if '{0}' in quest_type:
                    quest_type_text = quest_type.replace('{0}', str(quest['quest_target']))
                    quest_target = str(quest['quest_target'])

        
            quest_raw = ({ 
                'quest_type_raw': quest_type, 'quest_type': quest_type_text, 'item_amount': item_amount,
                'item_type': item_type, 'quest_target': quest_target, 'timestamp': timestamp, 'pokemon_id': pokemon_id,
                'item_id': item_id, 'quest_reward_type': quest_reward_type,
                'quest_reward_type_raw': quest_reward_type_raw, 'is_quest': True,
                'quest_pokemon_name': pokemon_name, 'quest_task': quest['quest_task']
            })
                
        else:
            quest_raw = ({'is_quest': False})
                
        return quest_raw
    
def questreward(quest_reward_type):
    if quest_reward_type == '2':
        return "Item"
    elif quest_reward_type == '3':
        return "Stardust"    
    elif quest_reward_type == '7':
        return "Pokemon"
    else:
        return False
    
def questtype(quest_type):
    script_dir = os.path.dirname(__file__)
    with open(script_dir + '/quest/types.json') as f:
        items = json.load(f)
    return (items[str(quest_type)]['text'])
    
def rewarditem(itemid):
    script_dir = os.path.dirname(__file__)
    with open(script_dir + '/quest/items.json') as f:
        items = json.load(f)
    return (items[str(itemid)]['name'])
