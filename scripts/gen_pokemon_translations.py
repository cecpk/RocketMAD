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
    output_dir = Path(__file__).resolve().parent / 'output'
    output_dir.mkdir(exist_ok=True)

    for code, language in languages.items():
        translations = {}

        url = ('https://raw.githubusercontent.com/PokeMiners/pogo_assets/'
               f'master/Texts/Latest%20APK/i18n_{language}.json')
        request = urllib.request.urlopen(url)
        data = json.loads(request.read().decode())['data']

        for id in range(1, 1000):
            data_key = 'pokemon_name_{:04d}'.format(id)
            try:
                idx = data.index(data_key)
                key = 'pokemon_name_' + str(id)
                translations[key] = data[idx + 1]
            except ValueError:
                continue

        with open(output_dir / f'pokemon_names_{code}.json', 'w') as file:
            json.dump(translations, file, separators=(',\n  ', ': '),
                      ensure_ascii=False)

    # Simplified Chinese.
    translations = {}

    url = ('https://raw.githubusercontent.com/PokeAPI/pokeapi/'
           'master/data/v2/csv/pokemon_species_names.csv')
    request = urllib.request.urlopen(url)
    data = request.read().decode()
    lines = data.splitlines()
    reader = csv.reader(lines)
    next(reader)  # Skip header.

    for row in reader:
        pokemon_id = row[0]
        language_id = row[1]
        if language_id != '12':
            continue
        name = row[2]
        key = 'pokemon_name_' + pokemon_id
        translations[key] = name

    with open(output_dir / 'pokemon_names_zh_cn.json', 'w') as file:
        json.dump(translations, file, separators=(',\n  ', ': '),
                  ensure_ascii=False)
