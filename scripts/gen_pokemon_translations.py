import csv
import json
import urllib.request

languages = {
    '1': 'ja',
    '3': 'ko',
    '4': 'zh_hant',
    '5': 'fr',
    '6': 'de',
    '12': 'zh_hans'
}
names = {}

if __name__ == "__main__":
    url = ('https://raw.githubusercontent.com/PokeAPI/pokeapi/master/'
           'data/v2/csv/pokemon_species_names.csv')
    response = urllib.request.urlopen(url)
    data = response.read()
    text = data.decode('utf-8')
    lines = text.splitlines()
    reader = csv.reader(lines)
    next(reader)  # Skip header.
    for row in reader:
        pokemon_id = row[0]
        language_id = row[1]
        if language_id not in languages:
            continue
        name = row[2]
        if language_id not in names:
            names[language_id] = {}

        key = 'pokemon_name_' + pokemon_id
        names[language_id][key] = name

    for key, value in languages.items():
        with open(f'pokemon_names_{value}.json', 'w') as f:
            json.dump(names[key], f, separators=(',\n  ', ': '),
                      ensure_ascii=False)
