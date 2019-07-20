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

from pogom.utils import get_args, get_form_data, get_all_pokemon_data

log = logging.getLogger(__name__)

# Will be set during config parsing
generate_images = False
pogo_assets = None
pogo_assets_icons = None

path_root = Path().cwd()
path_static = path_root / 'static'
path_icons = path_static / 'icons'
path_images = path_static / 'images'
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
    CLEAR:          os.path.join(path_weather, 'weather_sunny.png'),
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
        out_filename = os.path.join(
            path_generated_gym,
            "{}_L{}_R{}_P{}{}.png".format(team, level, raidlevel, pkm,
                                          form_extension)
        )
        im_lines.extend(draw_raid_pokemon(pkm, form))
        im_lines.extend(draw_raid_level(int(raidlevel)))
        if level > 0:
            im_lines.extend(draw_gym_level(level, team))
    elif raidlevel:
        # Gym with upcoming raid (egg)
        raidlevel = int(raidlevel)
        out_filename = os.path.join(
            path_generated_gym,
            "{}_L{}_R{}.png".format(team, level, raidlevel))
        im_lines.extend(draw_raid_egg(raidlevel))
        im_lines.extend(draw_raid_level(raidlevel))
        if level > 0:
            im_lines.extend(draw_gym_level(level, team))
    elif level > 0:
        # Occupied gym
        out_filename = os.path.join(
            path_generated_gym,
            '{}_L{}.png'.format(team, level))
        im_lines.extend(draw_gym_level(level, team))
    else:
        # Neutral gym
        return os.path.join(path_gym, '{}.png'.format(team))

    # Battle Indicator
    if is_in_battle:
        out_filename = out_filename.replace('.png', '_B.png')
        im_lines.extend(draw_battle_indicator())
    gym_image = os.path.join(path_gym, '{}.png'.format(team))
    return run_imagemagick(gym_image, im_lines, out_filename)


def draw_raid_pokemon(pkm, form):
    if pogo_assets:
        pkm_path, dummy = pokemon_asset_path(int(pkm), form=form)
        trim = True
    else:
        pkm_path = os.path.join(path_icons, '{}.png'.format(pkm))
        trim = False
    return draw_gym_subject(pkm_path, 64, trim=trim)


def draw_raid_egg(raidlevel):
    if pogo_assets:
        egg_path = os.path.join(pogo_assets, egg_images_assets[raidlevel])
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
            os.path.join(path_gym, 'boom.png')),
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
            os.path.join(path_gym, 'fist.png')),
        '-composite'
    ]


def battle_indicator_flame():
    # Flame Badge
    return [
        '-gravity east ( "{}" -resize 32x32 )  -geometry +0+0 '.format(
            os.path.join(path_gym, 'flame.png')),
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
            os.path.join(path_gym, 'swords.png')),
        '-composite'
    ]


def get_pokemon_asset_path(pkm, gender=GENDER_UNSET, form=None, costume=None,
                           shiny=False):
    gender_form_suffix = ''
    costume_suffix = '_{:02d}'.format(costume) if costume else ''
    shiny_suffix = '_shiny' if shiny else ''

    if gender in (1, 2):
        gender_form_suffix = '_{:02d}'.format(gender - 1)
    else:
        # Use male if gender is undefined.
        gender_form_suffix = '_00'

    should_use_suffix = False
    forms = get_form_data(pkm)
    if forms:
        if form and str(form) in forms:
            form_data = forms[str(form)]
        else:
            # form undefined, pick first one from data.
            form_data = next(iter(forms.values()))

        if 'assetId' in form_data:
            asset_id = form_data['assetId']
        elif 'assetSuffix' in form_data:
            should_use_suffix = True
            asset_id = form_data['assetSuffix']

        # In case of normal form, gender is used instead of form.
        if form_data['formName'] != '':
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
        return get_pokemon_asset_path(pkm, gender=1, form=form,
                                      costume=costume, shiny=shiny)


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


def generate_sprite_sheet():
    sprite_sheet_name = path_static / 'icons-sprite.png'
    if sprite_sheet_name.is_file():
        return

    im_lines = [' montage -mode concatenate -tile 28x'
                ' -background none @temp.txt']

    # Use file to store image names, otherwise command will be too long.
    f = open("temp.txt", "w")

    pokemon_data = get_all_pokemon_data()
    for id in pokemon_data:
        icon_name = path_icons / (id + '.png')
        if not icon_name.is_file():
            # Use placeholder.
            icon_name = path_icons / '0.png'
            if not icon_name.is_file():
                log.critical("Cannot find file {}!".format(icon_name))
                sys.exit(1)
        f.write(str(icon_name))
        f.write(' ')

    f.close()

    run_imagemagick_montage(im_lines, sprite_sheet_name)
    os.remove("temp.txt")


def generate_icons():
    im_lines = ['-fuzz 0.5% -trim +repage'
                ' -scale "64x64>" -unsharp 0x1'
                ' -background none -gravity center -extent 64x64']

    im_lines_weather = []
    im_lines_weather.append(
        '-fuzz 0.5% -trim +repage'
        ' -scale "64x64>" -unsharp 0x1'
        ' -colorspace gray -edge 1'
        ' -background none -gravity center -extent 64x64'
        ' -gravity northeast'
        ' -fill "#FFFD" -stroke black -draw "circle 47,16 47,0"'
        ' -draw "image SrcOver 0,0 33,33 \'{weather_img}\'"'.format(
            weather_img=weather_images[OVERCAST]))

    # Placeholder.
    target_name = path_icons / '0.png'
    if not target_name.is_file():
        asset_name = pogo_assets_icons / 'pokemon_icon_000.png'
        if asset_name.is_file():
            run_imagemagick_convert(asset_name, im_lines, target_name)
        else:
            log.critical("Cannot find PogoAssets file {}!".format(
                asset_name))
            sys.exit(1)

    pokemon_data = get_all_pokemon_data()
    for id, pokemon in pokemon_data.items():
        id = int(id)

        if 'gender' in pokemon:
            gender = pokemon['gender']
        else:
            # Assume pokemon is genderless.
            gender = [3]

        if 'forms' in pokemon:
            forms = pokemon['forms']
            form_data = next(iter(forms.values()))
            if form_data['formName'] == '':
                # Pokemon has normal form.
                forms['0'] = ''
        else:
            forms = OrderedDict([('0', '')])

        costumes = [0]
        if 'costumes' in pokemon:
            costumes.extend(pokemon['costumes'])

        # Generate basic ({id}.png) icon first.
        target_name = path_icons / '{}.png'.format(id)
        if not target_name.is_file():
            asset_name = get_pokemon_asset_path(id)
            if not asset_name:
                sys.exit(1)
            run_imagemagick_convert(asset_name, im_lines, target_name)

        for g in gender:
            for form_id, form_data in forms.items():
                form_id = int(form_id)
                for c in costumes:
                    if (c > 0 and form_id > 0 and 'hasCostume' in form_data and
                            not form_data['hasCostume']):
                        # Pokemon with this form doesn't have a custome.
                        # Skip next costumes.
                        break

                    target_name = path_icons / '{}_{}_{}_{}.png'.format(
                        id, g, form_id, c)
                    if not target_name.is_file():
                        asset_name = get_pokemon_asset_path(id, g, form_id, c)
                        if not asset_name:
                            sys.exit(1)
                        run_imagemagick_convert(asset_name, im_lines, target_name)

                    # Shiny.
                    target_name = path_icons / '{}_{}_{}_{}_s.png'.format(
                        id, g, form_id, c)
                    if not target_name.is_file():
                        asset_name = get_pokemon_asset_path(id, g, form_id, c,
                                                            True)
                        if not asset_name:
                            sys.exit(1)
                        run_imagemagick_convert(asset_name, im_lines, target_name)

                    # Map icons.
                    target_name = path_icons / '{}_{}_{}_{}_clear.png'.format(id, g, form_id, c)
                    if not target_name.is_file():
                        asset_name = get_pokemon_asset_path(id, g, form_id, c)
                        if not asset_name:
                            sys.exit(1)
                        run_imagemagick_convert(asset_name, im_lines_weather, target_name)


        if (id == 151):
            return




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
