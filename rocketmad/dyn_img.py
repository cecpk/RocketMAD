#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import logging
import os
import subprocess

from .utils import get_args, get_pokemon_data

log = logging.getLogger(__name__)
args = get_args()

# Will be set during config parsing
generate_images = False
imagemagick_executable = None
pogo_assets = None

path_static = os.path.join(os.path.dirname(__file__), '..', 'static')
path_icons = os.path.join(path_static, 'icons')
path_images = os.path.join(path_static, 'images')
path_gym = os.path.join(path_images, 'gym')
path_raid = os.path.join(path_images, 'raid')
path_weather = os.path.join(path_images, 'weather')
path_generated = os.path.join(path_images, 'generated')
path_generated_gym = os.path.join(path_generated, 'gym')

# Protos constants.
GENDER_UNSET = 0
MALE = 1
FEMALE = 2
GENDERLESS = 3

costume_names = {
    1: 'HOLIDAY_2016',
    2: 'ANNIVERSARY',
    3: 'ONE_YEAR_ANNIVERSARY',
    4: 'HALLOWEEN_2017',
    5: 'SUMMER_2018',
    6: 'FALL_2018',
    7: 'NOVEMBER_2018',
    8: 'WINTER_2018',
    9: 'FEB_2019',
    10: 'MAY_2019_NOEVOLVE',
    11: 'JAN_2020_NOEVOLVE',
    12: 'APRIL_2020_NOEVOLVE',
    13: 'SAFARI_2020_NOEVOLVE',
    14: 'SPRING_2020_NOEVOLVE',
    15: 'SUMMER_2020_NOEVOLVE',
    16: 'FALL_2020_NOEVOLVE',
    17: 'WINTER_2020_NOEVOLVE',
    18: 'NOT_FOR_RELEASE_ALPHA',
    19: 'NOT_FOR_RELEASE_BETA',
    20: 'NOT_FOR_RELEASE_GAMMA',
    21: 'NOT_FOR_RELEASE_NOEVOLVE',
    22: 'KANTO_2020_NOEVOLVE_VALUE',
    23: 'JOHTO_2020_NOEVOLVE_VALUE',
    24: 'HOENN_2020_NOEVOLVE_VALUE',
    25: 'SINNOH_2020_NOEVOLVE_VALUE'
}

weather_names = {
    1: 'CLEAR',
    2: 'RAINY',
    3: 'PARTLY_CLOUDY',
    4: 'OVERCAST',
    5: 'WINDY',
    6: 'SNOW',
    7: 'FOG'
}

egg_images = {
    1: os.path.join(path_gym, 'egg_normal.png'),
    2: os.path.join(path_gym, 'egg_normal.png'),
    3: os.path.join(path_gym, 'egg_rare.png'),
    4: os.path.join(path_gym, 'egg_rare.png'),
    5: os.path.join(path_gym, 'egg_legendary.png')
}

weather_images = {
    1: os.path.join(path_weather, 'weather_icon_clear.png'),
    2: os.path.join(path_weather, 'weather_icon_rain.png'),
    3: os.path.join(path_weather, 'weather_icon_partlycloudy.png'),
    4: os.path.join(path_weather, 'weather_icon_cloudy.png'),
    5: os.path.join(path_weather, 'weather_icon_windy.png'),
    6: os.path.join(path_weather, 'weather_icon_snow.png'),
    7: os.path.join(path_weather, 'weather_icon_fog.png')
}

# Info about Pokemon spritesheet
path_pokemon_spritesheet = os.path.join(path_static, 'icons-large-sprite.png')
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

font = os.path.join(path_static, 'Arial Black.ttf')
font_pointsize = 25


def is_imagemagick_binary(binary):
    try:
        process = subprocess.Popen([binary, '-version'],
                                   stdout=subprocess.PIPE)
        out, err = process.communicate()
        return "ImageMagick" in out.decode('utf8')
    except Exception as e:
        return False


def determine_imagemagick_binary():
    candidates = {
        'magick': 'magick convert',
        'convert': None
    }
    for c in candidates:
        if is_imagemagick_binary(c):
            return candidates[c] if candidates[c] else c
    return None

if args.generate_images:
    executable = determine_imagemagick_binary()
    if executable:
        generate_images = True
        imagemagick_executable = executable
        log.info("Generating icons using ImageMagick " +
                 "executable '{}'.".format(executable))

        if args.pogo_assets:
            decr_assets_dir = os.path.join(args.pogo_assets,
                                           'pokemon_icons')
            if os.path.isdir(decr_assets_dir):
                log.info("Using PogoAssets repository at '{}'".format(
                    args.pogo_assets))
                pogo_assets = args.pogo_assets
            else:
                log.error(("Could not find PogoAssets repository at '{}'. "
                           "Clone via 'git clone -depth 1 "
                           "https://github.com/ZeChrales/PogoAssets.git'")
                          .format(args.pogo_assets))
    else:
        log.error("Could not find ImageMagick executable. Make sure "
                  "you can execute either 'magick' (ImageMagick 7)"
                  " or 'convert' (ImageMagick 6) from the commandline. "
                  "Otherwise you cannot use --generate-images")
        sys.exit(1)


def get_pokemon_raw_icon(pkm, gender=None, form=None,
                         costume=None, weather=None, shiny=False):
    if generate_images and pogo_assets:
        source, target = pokemon_asset_path(
            pkm, classifier='icon', gender=gender,
            form=form, costume=costume,
            weather=weather, shiny=shiny)
        im_lines = ['-fuzz 0.5% -trim +repage'
                    ' -scale "96x96>" -unsharp 0x1'
                    ' -background none -gravity center -extent 96x96'
                    ]
        return run_imagemagick(source, im_lines, target)
    else:
        return os.path.join(path_icons, '{}.png'.format(pkm))


def get_pokemon_map_icon(pkm, weather=None, gender=None,
                         form=None, costume=None):
    im_lines = []

    # Add Pokemon icon
    if pogo_assets:
        source, target = pokemon_asset_path(
            pkm, classifier='marker', gender=gender,
            form=form, costume=costume, weather=weather)
        target_size = 96
        im_lines.append(
            '-fuzz 0.5% -trim +repage'
            ' -scale "133x133>" -unsharp 0x1'
            ' -background none -gravity center -extent 139x139'
            ' -background black -alpha background'
            ' -channel A -blur 0x1 -level 0,10%'
            ' -adaptive-resize {size}x{size}'
            ' -modulate 100,110'.format(size=target_size)
        )
    else:
        # Extract pokemon icon from spritesheet
        source = path_pokemon_spritesheet
        weather_suffix = '_{}'.format(
            weather_names[weather]) if weather else ''
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

    return run_imagemagick(source, im_lines, target)


def get_gym_icon(team, level, raidlevel, pkm, is_in_battle, form, costume,
                 is_ex_raid_eligible):
    level = int(level)

    if not generate_images:
        return default_gym_image(team, level, raidlevel, pkm)

    im_lines = ['-font "{}" -pointsize {}'.format(font, font_pointsize)]
    if pkm and pkm != 'null':
        # Gym with ongoing raid
        form_extension = "_F{}".format(form) if form else ""
        costume_extension = "_C{}".format(costume) if costume else ""
        out_filename = os.path.join(
            path_generated_gym,
            "{}_L{}_R{}_P{}{}{}.png".format(team, level, raidlevel, pkm,
                                            form_extension, costume_extension)
        )
        im_lines.extend(draw_raid_pokemon(pkm, form, costume))
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

    if is_ex_raid_eligible:
        out_filename = out_filename.replace('.png', '_EX.png')
        im_lines.extend(draw_ex_raid_eligible_indicator())

    gym_image = os.path.join(path_gym, '{}.png'.format(team))
    return run_imagemagick(gym_image, im_lines, out_filename)


def draw_raid_pokemon(pkm, form, costume):
    if pogo_assets:
        pkm_path, dummy = pokemon_asset_path(int(pkm), form=form,
                                             costume=costume)
        trim = True
    else:
        pkm_path = os.path.join(path_icons, '{}.png'.format(pkm))
        trim = False
    return draw_gym_subject(pkm_path, 64, trim=trim)


def draw_raid_egg(raidlevel):
    egg_path = egg_images[raidlevel]
    return draw_gym_subject(egg_path, 36, gravity='center')


def draw_gym_level(level, team):
    fill_col = "black" if args.black_white_badges else team_colors[team]
    return draw_badge(badge_lower_right, fill_col, "white", level)


def draw_raid_level(raidlevel):
    fill_col = ("white" if args.black_white_badges
        else raid_colors[int((raidlevel - 1) / 2)])
    text_col = "black" if args.black_white_badges else "white"
    return draw_badge(badge_upper_right, fill_col, text_col, raidlevel)


def draw_battle_indicator():
    return battle_indicator_swords()


def draw_ex_raid_eligible_indicator():
    return [
        '-gravity SouthWest ( "{}" -resize 40x28 ) '.format(
            os.path.join(path_gym, 'ex.png')),
        '-geometry +0+0 -composite'
    ]


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


def pokemon_asset_path(pkm, classifier=None, gender=GENDER_UNSET,
                       form=None, costume=None,
                       weather=None, shiny=False):
    gender_suffix = gender_assets_suffix = ''
    form_suffix = form_assets_suffix = ''
    costume_suffix = costume_assets_suffix = ''
    weather_suffix = '_{}'.format(weather_names[weather]) if weather else ''
    shiny_suffix = '_shiny' if shiny else ''

    if gender in (MALE, FEMALE):
        gender_assets_suffix = '_{:02d}'.format(gender - 1)
        gender_suffix = '_MALE' if gender == MALE else '_FEMALE'
    elif gender in (GENDER_UNSET, GENDERLESS):
        gender_assets_suffix = '_00' if pkm > 0 else ''

    if costume:
        costume_assets_suffix = '_{:02d}'.format(costume)
        costume_suffix = '_{}'.format(costume_names[costume])

    if (
        not gender_assets_suffix and
        not form_assets_suffix and
        not costume_assets_suffix
       ):
        gender_assets_suffix = ('_16' if pkm == 201
                                else '_00' if pkm > 0
                                else '')

    pokemon_data = get_pokemon_data(pkm)
    forms = pokemon_data.get('forms', {})
    should_use_suffix = False

    if forms:
        # default value is first form
        form_data = list(forms.values())[0]
        if form and str(form) in forms:
            form_data = forms[str(form)]

        asset_id = ''

        if 'assetId' in form_data:
            asset_id = form_data['assetId']
        elif 'assetSuffix' in form_data:
            should_use_suffix = True
            asset_id = form_data['assetSuffix']

        gender_assets_suffix = '_' + asset_id
        form_suffix = '_' + asset_id

    assets_basedir = os.path.join(pogo_assets, 'pokemon_icons')
    assets_fullname = os.path.join(assets_basedir,
                                   'pokemon_icon_{:03d}{}{}{}{}.png'.format(
                                       pkm, gender_assets_suffix,
                                       form_assets_suffix,
                                       costume_assets_suffix,
                                       shiny_suffix))

    if should_use_suffix:
        assets_fullname = os.path.join(assets_basedir,
                                       'pokemon_icon{}.png'.format(form_suffix)
                                       )

    target_path = os.path.join(
        path_generated, 'pokemon_{}'.format(
            classifier)) if classifier else os.path.join(
        path_generated, 'pokemon')
    target_name = os.path.join(target_path,
                               "pkm_{:03d}{}{}{}{}{}.png".format(
                                   pkm, gender_suffix, form_suffix,
                                   costume_suffix,
                                   weather_suffix, shiny_suffix))
    if os.path.isfile(assets_fullname):
        return assets_fullname, target_name
    else:
        if gender == MALE:
            log.warning("Cannot find PogoAssets file {}".format(
                assets_fullname))
            # Dummy Pokemon icon
            return (
                os.path.join(assets_basedir, 'pokemon_icon_000.png'),
                os.path.join(target_path, 'pkm_000.png'))
        return pokemon_asset_path(pkm, classifier=classifier,
                                  gender=MALE, form=form,
                                  costume=costume, weather=weather,
                                  shiny=shiny)


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
    if not os.path.isdir(path):
        try:
            os.makedirs(path)
        except OSError:
            if not os.path.isdir(path):
                raise


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
    if os.path.isfile(os.path.join(path, icon)):
        return os.path.join(path, icon)
    else:
        icon = "{}_{}_unknown.png".format(team, raidlevel)
    return os.path.join(path, icon)


def run_imagemagick(source, im_lines, out_filename):
    if not os.path.isfile(out_filename):
        # Make sure, target path exists
        init_image_dir(os.path.split(out_filename)[0])

        cmd = '{} "{}" {} "{}"'.format(
            imagemagick_executable, source, " ".join(im_lines), out_filename)
        if os.name != 'nt':
            cmd = cmd.replace(" ( ", " \( ").replace(" ) ", " \) ")
        log.info("Generating icon '{}'".format(out_filename))
        subprocess.call(cmd, shell=True)
    return out_filename
