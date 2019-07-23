import copy
import logging
import sys
import os
import subprocess

from pathlib import Path
from collections import OrderedDict

from pgoapi.protos.pogoprotos.enums.costume_pb2 import Costume
from pgoapi.protos.pogoprotos.enums.form_pb2 import Form
from pgoapi.protos.pogoprotos.enums.gender_pb2 import (
    MALE, FEMALE, Gender, GENDERLESS, GENDER_UNSET)
from pgoapi.protos.pogoprotos.enums.weather_condition_pb2 import (
    WeatherCondition, CLEAR, RAINY,
    PARTLY_CLOUDY, OVERCAST, WINDY, SNOW, FOG)

from pogom.utils import (get_args, get_all_pokemon_data,
    get_pokemon_data, get_forms, get_form_data, get_weather)

log = logging.getLogger(__name__)

# Will be set during config parsing
generate_images = False
pogo_assets = None
pogo_assets_icons = None
custom_icons = False
safe_icons = False

path_root = Path().cwd()
path_static = path_root / 'static'
path_images = path_static / 'images'
path_icons = path_images / 'pokemon'
path_map_icons = path_images / 'pokemon-map'
path_custom_icons = path_images / 'pokemon-custom'
path_gym = path_images / 'gym'
path_raid = path_images / 'raid'
path_weather = path_images / 'weather'
path_generated = path_images / 'generated'
path_generated_gym = path_generated / 'gym'

egg_images = {
    1: path_raid / 'egg_normal.png',
    2: path_raid / 'egg_normal.png',
    3: path_raid / 'egg_rare.png',
    4: path_raid / 'egg_rare.png',
    5: path_raid / 'egg_legendary.png'
}

egg_images_assets = {
    1: os.path.join('static_assets', 'png', 'ic_raid_egg_normal.png'),
    2: os.path.join('static_assets', 'png', 'ic_raid_egg_normal.png'),
    3: os.path.join('static_assets', 'png', 'ic_raid_egg_rare.png'),
    4: os.path.join('static_assets', 'png', 'ic_raid_egg_rare.png'),
    5: os.path.join('static_assets', 'png', 'ic_raid_egg_legendary.png'),
}

weather_images = {
    CLEAR:          path_weather / 'weather_sunny.png',
    RAINY:          path_weather / 'weather_rain.png',
    PARTLY_CLOUDY:  path_weather / 'weather_partlycloudy_day.png',
    OVERCAST:       path_weather / 'weather_cloudy.png',
    WINDY:          path_weather / 'weather_windy.png',
    SNOW:           path_weather / 'weather_snow.png',
    FOG:            path_weather / 'weather_fog.png'
}

# Info about Pokemon spritesheet
path_pokemon_spritesheet = path_static / 'icons-large-sprite.png'
pkm_sprites_size = 80
pkm_sprites_cols = 28

# Gym icons
gym_icon_size = 96
gym_badge_radius = 15
gym_badge_padding = 1

badge_upper_left = (
    gym_badge_padding + gym_badge_radius,
    gym_badge_padding + gym_badge_radius)
badge_upper_right = (
    gym_icon_size - (gym_badge_padding + gym_badge_radius),
    gym_badge_padding + gym_badge_radius)
badge_lower_left = (
    gym_badge_padding + gym_badge_radius,
    gym_icon_size - (gym_badge_padding + gym_badge_radius))
badge_lower_right = (
    gym_icon_size - (gym_badge_padding + gym_badge_radius),
    gym_icon_size - (gym_badge_padding + gym_badge_radius))

team_colors = {
    "Mystic": "\"rgb(30,160,225)\"",
    "Valor": "\"rgb(255,26,26)\"",
    "Instinct": "\"rgb(255,190,8)\"",
    "Uncontested": "\"rgb(255,255,255)\""
}
raid_colors = [
    "\"rgb(252,112,176)\"", "\"rgb(255,158,22)\"", "\"rgb(184,165,221)\""
]

type_colors = {
    "Normal": "#8a8a59",
    "Water": "#6890f0",
    "Electric": "#f8d030",
    "Fighting": "#c03028",
    "Ground": "#e0c068",
    "Psychic": "#f85888",
    "Rock": "#b8a038",
    "Dark": "#707070",
    "Steel": "#b8b8d0",
    "Fire": "#f08030",
    "Grass": "#78c850",
    "Ice": "#98d8d8",
    "Poison": "#a040a0",
    "Flying": "#a890f0",
    "Bug": "#a8b820",
     "Ghost": "#705898",
     "Dragon": "#7038f8",
     "Fairy": "#e898e8"
}

released_pokemon_count = 0

font = path_static / 'Arial Black.ttf'
font_pointsize = 25


def get_pokemon_raw_icon(pkm, gender=None, form=None,
                         costume=None, weather=None, shiny=False):
    if generate_images and pogo_assets:
        source, target = pokemon_asset_path(
            pkm, classifier='icon', gender=gender,
            form=form, costume=costume,
            weather=weather, shiny=shiny)
        im_lines = ['convert -fuzz 0.5% -trim +repage'
                    ' -scale "96x96>" -unsharp 0x1'
                    ' -background none -gravity center -extent 96x96'
                    ]
        return run_imagemagick(source, im_lines, target)
    else:
        return path_icons / '{}.png'.format(pkm)


def get_pokemon_map_icon(pkm, weather=None, gender=None,
                         form=None, costume=None):
    im_lines = []

    # Add Pokemon icon
    if pogo_assets:
        #source, target = get_pokemon_asset_path(
        #    pkm, classifier='marker', gender=gender,
        #    form=form, costume=costume, weather=weather)
        #target_size = 96
        im_lines.append(
            '-fuzz 0.5% -trim +repage'
            ' -scale "133x133>" -unsharp 0x1'
            ' -background none -gravity center -extent 139x139'
            ' -background black -alpha background'
            ' -channel A -blur 0x1 -level 0,10%'
            ' -adaptive-resize {size}x{size}'
            ' -modulate 100,110'.format(size=64)
        )
    else:
        # Extract pokemon icon from spritesheet
        source = path_pokemon_spritesheet
        weather_suffix = '_{}'.format(
            WeatherCondition.Name(weather)) if weather else ''
        target_path = os.path.join(
            path_generated, 'pokemon_spritesheet_marker')
        target = os.path.join(
            target_path, 'pokemon_{}{}.png'.format(pkm, weather_suffix))

        target_size = pkm_sprites_size
        pkm_idx = pkm - 1
        x = (pkm_idx % pkm_sprites_cols) * pkm_sprites_size
        y = (pkm_idx / pkm_sprites_cols) * pkm_sprites_size
        im_lines.append('-crop {size}x{size}+{x}+{y} +repage'.format(
            size=target_size, x=x, y=y))

    if weather:
        target_size = 64
        radius = 20
        x = target_size - radius - 2
        y = radius + 1
        y2 = 1
        im_lines.append(
            '-gravity northeast'
            ' -fill "#FFFD" -stroke black -draw "circle {x},{y} {x},{y2}"'
            ' -draw "image over 1,1 42,42 \'{weather_img}\'"'.format(
                x=x, y=y, y2=y2, weather_img=weather_images[weather])
        )

        print(im_lines)

    #return run_imagemagick(source, im_lines, target)


def get_gym_icon(team, level, raidlevel, pkm, is_in_battle, form):
    level = int(level)

    if not generate_images:
        return default_gym_image(team, level, raidlevel, pkm)

    im_lines = ['-font "{}" -pointsize {}'.format(font, font_pointsize)]
    if pkm and pkm != 'null':
        # Gym with ongoing raid
        form_extension = "_F{}".format(form) if form else ""
        out_filename = (path_generated_gym /
            "{}_L{}_R{}_P{}{}.png".format(team, level, raidlevel, pkm,
                                          form_extension))
        im_lines.extend(draw_raid_pokemon(pkm, form))
        im_lines.extend(draw_raid_level(int(raidlevel)))
        if level > 0:
            im_lines.extend(draw_gym_level(level, team))
    elif raidlevel:
        # Gym with upcoming raid (egg)
        raidlevel = int(raidlevel)
        out_filename = (path_generated_gym /
            "{}_L{}_R{}.png".format(team, level, raidlevel))
        im_lines.extend(draw_raid_egg(raidlevel))
        im_lines.extend(draw_raid_level(raidlevel))
        if level > 0:
            im_lines.extend(draw_gym_level(level, team))
    elif level > 0:
        # Occupied gym
        out_filename = path_generated_gym / '{}_L{}.png'.format(team, level)
        im_lines.extend(draw_gym_level(level, team))
    else:
        # Neutral gym
        return path_gym / '{}.png'.format(team)

    # Battle Indicator
    if is_in_battle:
        out_filename = out_filename.replace('.png', '_B.png')
        im_lines.extend(draw_battle_indicator())
    gym_image = path_gym / '{}.png'.format(team)
    return str(run_imagemagick_convert(gym_image, im_lines, out_filename))


def draw_raid_pokemon(pkm, form):
    if pogo_assets:
        pkm_path, dummy = pokemon_asset_path(int(pkm), form=form)
        trim = True
    else:
        pkm_path = path_icons / '{}.png'.format(pkm)
        trim = False
    return draw_gym_subject(pkm_path, 64, trim=trim)


def draw_raid_egg(raidlevel):
    if pogo_assets:
        egg_path = pogo_assets / egg_images_assets[raidlevel]
    else:
        egg_path = egg_images[raidlevel]
    return draw_gym_subject(egg_path, 36, gravity='center')


def draw_gym_level(level, team):
    args = get_args()
    fill_col = "black" if args.black_white_badges else team_colors[team]
    return draw_badge(badge_lower_right, fill_col, "white", level)


def draw_raid_level(raidlevel):
    args = get_args()
    fill_col = ("white" if args.black_white_badges
        else raid_colors[int((raidlevel - 1) / 2)])
    text_col = "black" if args.black_white_badges else "white"
    return draw_badge(badge_upper_right, fill_col, text_col, raidlevel)


def draw_battle_indicator():
    return battle_indicator_swords()


def battle_indicator_boom():
    # BOOM! Sticker
    return [
        '-gravity center ( "{}" -resize 84x84 ) '.format(
            path_gym / 'boom.png'),
        '-geometry +0+0 -composite'
    ]


def battle_indicator_fist():
    # Fist Badge
    x = gym_icon_size - (gym_badge_padding + gym_badge_radius)
    y = gym_icon_size / 2
    return [
        '-fill white -stroke black -draw "circle {},{} {},{}"'.format(
            x, y, x - gym_badge_radius, y),
        '-gravity east ( "{}" -resize 24x24 ) -geometry+4+0 '.format(
            path_gym / 'fist.png'),
        '-composite'
    ]


def battle_indicator_flame():
    # Flame Badge
    return [
        '-gravity east ( "{}" -resize 32x32 )  -geometry +0+0 '.format(
            path_gym / 'flame.png'),
        '-composite'
    ]


def battle_indicator_swords():
    # Swords Badge
    x = gym_icon_size - (gym_badge_padding + gym_badge_radius)
    y = gym_icon_size / 2
    return [
        '-fill white -stroke black -draw "circle {},{} {},{}"'.format(
            x, y, x - gym_badge_radius, y),
        '-gravity east ( "{}" -resize 24x24 ) -geometry +4+0 '.format(
            path_gym / 'swords.png'),
        '-composite'
    ]


def draw_gym_subject(image, size, gravity='north', trim=False):
    trim_cmd = ' -fuzz 0.5% -trim +repage' if trim else ''
    lines = [
        '-gravity {} ( "{}"{} -scale {}x{} -unsharp 0x1 ( +clone '.format(
            gravity, image, trim_cmd, size, size),
        '-background black -shadow 80x3+5+5 ) +swap -background ' +
        'none -layers merge +repage ) -geometry +0+0 -composite'
    ]
    return lines


def draw_badge(pos, fill_col, text_col, text):
    (x, y) = pos
    lines = [
        '-fill {} -stroke black -draw "circle {},{} {},{}"'.format(
            fill_col, x, y, x + gym_badge_radius, y),
        '-gravity center -fill {} -stroke none '.format(
            text_col),
        '-draw "text {},{} \'{}\'"'.format(
            x - 47, y - 49, text)
    ]
    return lines


def init_image_dir(path):
    if not path.is_dir():
       path.mkdir(parents=True)


def default_gym_image(team, level, raidlevel, pkm):
    path = path_gym
    if pkm and pkm != 'null':
        icon = "{}_{}.png".format(team, pkm)
        path = path_raid
    elif raidlevel:
        icon = "{}_{}_{}.png".format(team, level, raidlevel)
    elif level:
        icon = "{}_{}.png".format(team, level)
    else:
        icon = "{}.png".format(team)
    if(os.path.isfile(os.path.join(path, icon))):
        return os.path.join(path, icon)
    else:
        icon = "{}_{}_unknown.png".format(team, raidlevel)
    return os.path.join(path, icon)


def get_pokemon_asset_path(pkm, gender=GENDER_UNSET, form=None, costume=None,
                           shiny=False):
    if pkm == 0:
        return pogo_assets_icons / 'pokemon_icon_000.png'

    gender_form_suffix = ''
    costume_suffix = '_{:02d}'.format(costume) if costume else ''
    shiny_suffix = '_shiny' if shiny else ''

    if gender in (MALE, FEMALE):
        gender_form_suffix = '_{:02d}'.format(gender - 1)
    else:
        # Use male if gender is undefined.
        gender_form_suffix = '_00'

    should_use_suffix = False
    forms = get_forms(pkm)
    if forms:
        if form and str(form) in forms:
            form_data = forms[str(form)]
        else:
            # Form undefined, pick default form from data.
            form_data = get_form_data(pkm, 0)

        if 'assetId' in form_data:
            asset_id = form_data['assetId']
        elif 'assetSuffix' in form_data:
            should_use_suffix = True
            asset_id = form_data['assetSuffix']

        # In case of normal, shadow, purified form,
        # gender is used instead of form.
        if (form_data['formName'] != '' and
                form_data['formName'] != 'Shadow' and
                form_data['formName'] != 'Purified'):
            gender_form_suffix = '_' + asset_id

    if should_use_suffix:
        asset_name = pogo_assets_icons / 'pokemon_icon{}{}.png'.format(
                gender_form_suffix, shiny_suffix)
    else:
        asset_name = (pogo_assets_icons /
            'pokemon_icon_{:03d}{}{}{}.png'.format(
                pkm, gender_form_suffix, costume_suffix,
                shiny_suffix))

    if asset_name.is_file():
        return asset_name
    else:
        if gender == 1:
            log.critical("Cannot find PogoAssets file {}".format(asset_name))
            return None
        return get_pokemon_asset_path(pkm, gender=MALE, form=form,
                                      costume=costume, shiny=shiny)


def generate_pokemon_icon(id, gender, form, costume, shiny, map_icon, weather):
    im_lines = []

    if id == 0:
        if pogo_assets or custom_icons:
            im_lines.extend([
                '-fuzz 0.5% -trim +repage'
                ' -scale "64x64>" -unsharp 0x1'
                ' -background none -gravity center -extent 64x64'])
        else: # Safe icon.
            im_lines.extend([
                '-size 64x64 xc:none'
                ' -fill white -draw "circle 31,31 0,31"'
                ' -gravity center -fill black -pointsize 20 -weight 700'
                ' -draw "text 0,0 \'404\'"'])

        source_file = None
        if pogo_assets:
            source_file = get_pokemon_asset_path(0)
        elif custom_icons:
            source_file = path_custom_icons / '0.png'
        target_file = path_icons / '0.png'

        return run_imagemagick_convert(source_file, im_lines, target_file)

    if map_icon:
        if not weather:
            weather = 0
        target_file = path_map_icons / '{}_{}_{}_{}_{}.png'.format(
            id, gender, form, costume, weather)
    else:
        shiny_suffix = '_s' if shiny else ''
        target_file = path_icons / '{}_{}_{}_{}{}.png'.format(
            id, gender, form, costume, shiny_suffix)

    source_file = None

    if not target_file.is_file():
        if pogo_assets:
            im_lines.extend([
                '-fuzz 0.5% -trim +repage'
                ' -scale "64x64>" -unsharp 0x1'
                ' -background none -gravity center -extent 64x64'])
            source_file = get_pokemon_asset_path(id, gender, form, costume,
                                                 shiny)
        elif custom_icons:
            poep = 'kaas'
        else: # Safe icon.
            pokemon = get_pokemon_data(id)
            form_name = (pokemon['forms'][str(form)]['formName'] if form != 0
                else '')
            # Use first type.
            type = next(iter(pokemon['types']))['type']

            if map_icon:
                im_lines.extend([
                    '-stroke black -strokewidth 1'])

            im_lines.extend([
                '-size 64x64 xc:none -fill {} '.format(
                    type_colors[type]),
                ' -draw " circle 31,31 0,31"'
                ' -gravity center -fill white -weight 700 -stroke none'
                ' -pointsize 20 -draw "text 0,-19 \'{}\'"'.format(id)])

            if len(pokemon['name']) > 5:
                im_lines_label = [
                    '-size 64x64 -background none -gravity center'
                    ' -fill white -weight 700'
                    ' label:"{}"'.format(pokemon['name'])]

                target_name_label = path_static / 'label_name.png'
                run_imagemagick_convert(None, im_lines_label,
                    target_name_label)

                im_lines.extend([
                    ' -draw "image SrcOver 0,0 0,0 \'{}\'"'.format(
                        target_name_label)])
            else:
                im_lines.extend([
                    ' -draw "text 0,0 \'{}\'"'.format(
                        pokemon['name'])])

            if form_name is not '':
                if len(form_name) > 2:
                    im_lines_label = [
                        '-size 42x42 -background none -gravity center'
                        ' -fill white -weight 700'
                        ' label:"{}"'.format(form_name)]

                    target_name_label = path_static / 'label_form.png'
                    run_imagemagick_convert(None, im_lines_label,
                        target_name_label)

                    im_lines.extend([
                        ' -draw "image SrcOver 0,19 0,0 \'{}\'"'.format(
                            target_name_label)])
                else:
                    im_lines.extend([
                        ' -draw "text 0,19 \'{}\'"'.format(form_name)])

        if map_icon and weather:
            target_size = 64
            radius = target_size / 5
            x = target_size - radius - 1
            y = radius
            y2 = 0

            im_lines.extend([
                '-gravity northeast'
                ' -fill "#FFFD" -stroke black -draw "circle {x},{y} {x},{y2}"'
                ' -draw "image over 0,0 {w},{h} \'{weather_img}\'"'.format(
                    x=x, y=y, y2=y2, w=radius*2, h=radius*2,
                    weather_img=weather_images[weather])])

        run_imagemagick_convert(source_file, im_lines, target_file)

        if safe_icons:
            label_name = path_static / 'label_name.png'
            label_form = path_static / 'label_form.png'
            if (label_name.is_file()):
                os.remove(label_name)
            if (label_form.is_file()):
                os.remove(label_form)

    return target_file


def generate_pokemon_icons(pokemon_id):
    args = get_args()

    im_lines = ['-fuzz 0.5% -trim +repage'
                ' -scale "64x64>" -unsharp 0x1'
                ' -background none -gravity center -extent 64x64']

    if pokemon_id == 0:
        # Placeholder image.
        generate_pokemon_icon(0, MALE, 0, 0, False, False, None)
        return

    pokemon = get_pokemon_data(pokemon_id)

    if 'gender' in pokemon:
        gender = pokemon['gender']
    else:
        # Assume pokemon is genderless.
        gender = [GENDERLESS]

    if 'forms' in pokemon:
        forms = copy.deepcopy(pokemon['forms'])
        # Also generate icon for form 0, just in case...
        forms['0'] = ''
    else:
        forms = OrderedDict([('0', '')])

    costumes = [0]
    if 'costumes' in pokemon:
        costumes.extend(pokemon['costumes'])

    # Generate basic icon ({pokemon_id}.png) first.
    file = generate_pokemon_icon(pokemon_id, MALE, 0, 0, False, False, None)
    simple_file = path_icons / '{}.png'.format(pokemon_id)
    if not simple_file.is_file():
        os.rename(file, simple_file)

    for g in gender:
        for form_id, form_data in forms.items():
            form_id = int(form_id)

            for c in costumes:
                if (c > 0 and form_id > 0 and 'hasCostume' in form_data and
                        not form_data['hasCostume']):
                    # Pokemon with this form doesn't have a custome.
                    # Skip next costumes.
                    break
                generate_pokemon_icon(pokemon_id, g, form_id, c, False, False,
                    None)
                # Shiny.
                generate_pokemon_icon(pokemon_id, g, form_id, c, True, False,
                    None)
                # Regular map icon.
                generate_pokemon_icon(pokemon_id, g, form_id, c, False, True,
                    None)
                # Map icons with weather boost.
                for t in pokemon['types']:
                    weather = get_weather(t['type'])
                    generate_pokemon_icon(pokemon_id, g, form_id, c, False, True,
                        weather)


def generate_all_pokemon_icons():
    # Placeholder image.
    generate_pokemon_icons(0)
    for id in range(1, released_pokemon_count + 1):
        generate_pokemon_icons(id)
    # Meltan.
    generate_pokemon_icons(808)
    # Melmetal
    generate_pokemon_icons(809)


def generate_sprite_sheet():
    sprite_sheet_file = path_static / 'icons-sprite.png'
    if sprite_sheet_file.is_file():
        return

    im_lines = ['-mode concatenate -tile 28x -background none'
                ' @static/temp.txt']

    # Use temp file to store image names, otherwise command will be too long.
    f = open("static/temp.txt", "w")

    pokemon_data = get_all_pokemon_data()
    for id in pokemon_data:
        icon_file = path_icons / (id + '.png')
        if not icon_file.is_file():
            # Use placeholder.
            icon_file = path_icons / '0.png'
        f.write('{} '.format(icon_file))

    f.close()

    run_imagemagick_montage(im_lines, sprite_sheet_file)
    os.remove("static/temp.txt")


def run_imagemagick(tool, source, im_lines, out_filename):
    if not out_filename.is_file():
        # Make sure, target path exists
        init_image_dir(out_filename.parent)

        if source:
            cmd = 'magick {} "{}" {} "{}"'.format(
                tool, source, " ".join(im_lines), out_filename)
        else:
            cmd = 'magick {} {} "{}"'.format(
                tool, " ".join(im_lines), out_filename)
        if os.name != 'nt':
            cmd = cmd.replace(" ( ", " \( ").replace(" ) ", " \) ")
        log.info("Generating icon '{}'".format(out_filename))
        subprocess.call(cmd, shell=True)
    return out_filename


def run_imagemagick_convert(source, im_lines, out_filename):
    return run_imagemagick('convert', source, im_lines, out_filename)


def run_imagemagick_montage(im_lines, out_filename):
    return run_imagemagick('montage', None, im_lines, out_filename)
