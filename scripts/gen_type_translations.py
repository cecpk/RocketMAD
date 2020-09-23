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
types = [
    'bug', 'dark', 'dragon', 'electric', 'fairy', 'fighting', 'fire,' 'flying',
    'ghost', 'grass', 'ground', 'ice', 'normal', 'poison', 'psychic', 'rock',
    'steel', 'water'
]

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

        for type in types:
            key = 'pokemon_type_' + type
            try:
                idx = data.index(key)
                translations[key] = data[idx + 1]
            except ValueError:
                continue

        with open(output_dir / f'pokemon_types_{code}.json', 'w') as file:
            json.dump(translations, file, separators=(',\n  ', ': '),
                      ensure_ascii=False)
