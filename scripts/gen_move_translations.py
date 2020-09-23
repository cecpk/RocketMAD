import csv
import json
import urllib.request

from pathlib import Path

languages = {
    'de': 'german',
    'en': 'english',
    'es': 'spanish',
    'fr': 'french',
    'it': 'italian',
    'ja': 'japanese',
    'ko': 'korean',
    'pt_br': 'brazilianportuguese',
    'th': 'thai',
    'zh_tw': 'chinesetraditional'
}

if __name__ == "__main__":
    root_dir = Path(__file__).resolve().parent.parent
    output_dir = root_dir / 'scripts/output'
    output_dir.mkdir(exist_ok=True)

    for code, language in languages.items():
        translations = {}

        url = ('https://raw.githubusercontent.com/PokeMiners/pogo_assets/'
               f'master/Texts/Latest%20APK/i18n_{language}.json')
        request = urllib.request.urlopen(url)
        data = json.loads(request.read().decode())['data']

        for id in range(1, 1000):
            data_key = 'move_name_{:04d}'.format(id)
            try:
                idx = data.index(data_key)
                key = 'move_name_' + str(id)
                translations[key] = data[idx + 1]
            except ValueError:
                continue

        with open(output_dir / f'move_names_{code}.json', 'w') as file:
            json.dump(translations, file, separators=(',\n  ', ': '),
                      ensure_ascii=False)

    # Simplified Chinese.
    translations = {}

    url = ('https://raw.githubusercontent.com/PokeAPI/pokeapi/'
           'master/data/v2/csv/move_names.csv')
    request = urllib.request.urlopen(url)
    data = request.read().decode()
    lines = data.splitlines()
    reader = csv.reader(lines)
    next(reader)  # Skip header.

    temp = {}
    for row in reader:
        id = row[0]
        language_id = row[1]
        name = row[2]
        if not (language_id == '9' or language_id == '12'):
            continue
        if id not in temp:
            temp[id] = {}
        temp[id][language_id] = name

    english_to_chinese = {}
    for value in temp.values():
        if '12' in value:
            english_to_chinese[value['9']] = value['12']

    with open(root_dir / 'static/data/moves.json') as file:
        move_data = json.load(file)
    for id, move in move_data.items():
        key = 'move_name_' + id
        translations[key] = english_to_chinese[move['name']]

    with open(output_dir / 'move_names_zh_cn.json', 'w') as file:
        json.dump(translations, file, separators=(',\n  ', ': '),
                  ensure_ascii=False)
