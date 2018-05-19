import logging
import os
import subprocess
from string import join

from pgoapi.protos.pogoprotos.enums.costume_pb2 import Costume
from pgoapi.protos.pogoprotos.enums.form_pb2 import Form
from pgoapi.protos.pogoprotos.enums.gender_pb2 import (
    MALE, FEMALE, Gender, GENDERLESS, GENDER_UNSET)
from pgoapi.protos.pogoprotos.enums.weather_condition_pb2 import (
    WeatherCondition, CLEAR, RAINY,
    PARTLY_CLOUDY, OVERCAST, WINDY, SNOW, FOG)

log = logging.getLogger(__name__)

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

egg_images = {
    1: os.path.join(path_raid, 'egg_normal.png'),
    2: os.path.join(path_raid, 'egg_normal.png'),
    3: os.path.join(path_raid, 'egg_rare.png'),
    4: os.path.join(path_raid, 'egg_rare.png'),
    5: os.path.join(path_raid, 'egg_legendary.png')
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
    RAINY:          os.path.join(path_weather, 'weather_rain.png'),
    PARTLY_CLOUDY:  os.path.join(path_weather, 'weather_partlycloudy_day.png'),
    OVERCAST:       os.path.join(path_weather, 'weather_cloudy.png'),
    WINDY:          os.path.join(path_weather, 'weather_windy.png'),
    SNOW:           os.path.join(path_weather, 'weather_snow.png'),
    FOG:            os.path.join(path_weather, 'weather_fog.png')
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

font = os.path.join(path_static, 'Arial Black.ttf')
font_pointsize = 25


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


def get_gym_icon(team, level, raidlevel, pkm, is_in_battle):
    level = int(level)

    if not generate_images:
        return default_gym_image(team, level, raidlevel, pkm)

    im_lines = ['-font "{}" -pointsize {}'.format(font, font_pointsize)]
    if pkm and pkm != 'null':
        # Gym with ongoing raid
        out_filename = os.path.join(
            path_generated_gym,
            "{}_L{}_R{}_P{}.png".format(team, level, raidlevel, pkm))
        im_lines.extend(draw_raid_pokemon(pkm))
        im_lines.extend(draw_raid_level(raidlevel))
        if level > 0:
            im_lines.extend(draw_gym_level(level))
    elif raidlevel:
        # Gym with upcoming raid (egg)
        raidlevel = int(raidlevel)
        out_filename = os.path.join(
            path_generated_gym,
            "{}_L{}_R{}.png".format(team, level, raidlevel))
        im_lines.extend(draw_raid_egg(raidlevel))
        im_lines.extend(draw_raid_level(raidlevel))
        if level > 0:
            im_lines.extend(draw_gym_level(level))
    elif level > 0:
        # Occupied gym
        out_filename = os.path.join(
            path_generated_gym,
            '{}_L{}.png'.format(team, level))
        im_lines.extend(draw_gym_level(level))
    else:
        # Neutral gym
        return os.path.join(path_gym, '{}.png'.format(team))

    # Battle Indicator
    if is_in_battle:
        out_filename = out_filename.replace('.png', '_B.png')
        im_lines.extend(draw_battle_indicator())

    gym_image = os.path.join(path_gym, '{}.png'.format(team))
    return run_imagemagick(gym_image, im_lines, out_filename)


def draw_raid_pokemon(pkm):
    if pogo_assets:
        pkm_path, dummy = pokemon_asset_path(int(pkm))
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


def draw_gym_level(level):
    return draw_badge(badge_lower_right, "black", "white", level)


def draw_raid_level(raidlevel):
    return draw_badge(badge_upper_right, "white", "black", raidlevel)


def draw_battle_indicator():
    return battle_indicator_swords()


def battle_indicator_boom():
    # BOOM! Sticker
    return [('-gravity center ( "{}" -resize 84x84 ) ' +
             '-geometry +0+0 -composite').format(
        os.path.join(path_gym, 'boom.png'))]


def battle_indicator_fist():
    # Fist Badge
    x = gym_icon_size - (gym_badge_padding + gym_badge_radius)
    y = gym_icon_size / 2
    return [
        '-fill white -stroke black -draw "circle {},{} {},{}"'.format(
            x, y, x - gym_badge_radius, y),
        '-gravity east ( "{}" -resize 24x24 ) -geometry ' +
        '+4+0 -composite'.format(os.path.join(path_gym, 'fist.png'))
    ]


def battle_indicator_flame():
    # Flame Badge
    return [
        '-gravity east ( "{}" -resize 32x32 ) -geometry ' +
        '+0+0 -composite'.format(os.path.join(path_gym, 'flame.png'))
    ]


def battle_indicator_swords():
    # Swords Badge
    x = gym_icon_size - (gym_badge_padding + gym_badge_radius)
    y = gym_icon_size / 2
    return [
        '-fill white -stroke black -draw "circle {},{} {},{}"'.format(
            x, y, x - gym_badge_radius, y),
        '-gravity east ( "{}" -resize 24x24 ) -geometry +4+0 ' +
        '-composite'.format(os.path.join(path_gym, 'swords.png'))
    ]


def pokemon_asset_path(pkm, classifier=None, gender=GENDER_UNSET,
                       form=None, costume=None,
                       weather=None, shiny=False):
    gender_suffix = gender_assets_suffix = ''
    form_suffix = form_assets_suffix = ''
    costume_suffix = costume_assets_suffix = ''
    weather_suffix = '_{}'.format(
        WeatherCondition.Name(weather)) if weather else ''
    shiny_suffix = '_shiny' if shiny else ''

    if gender in (MALE, FEMALE):
        gender_assets_suffix = '_{:02d}'.format(gender - 1)
        gender_suffix = '_{}'.format(Gender.Name(gender))
    elif gender in (GENDER_UNSET, GENDERLESS):
        gender_assets_suffix = '_00' if pkm > 0 else ''

    if form and pkm == 201:
        # Unown = no gender
        gender_suffix = gender_assets_suffix = ''
        form_assets_suffix = '_{:02d}'.format(form + 10)
        form_suffix = '_{}'.format(Form.Name(form))

    if costume:
        costume_assets_suffix = '_{:02d}'.format(costume)
        costume_suffix = '_{}'.format(Costume.Name(costume))

    if (
        not gender_assets_suffix and
        not form_assets_suffix and
        not costume_assets_suffix
       ):
        gender_assets_suffix = ('_16' if pkm == 201
                                else '_00' if pkm > 0
                                else '')

    # Castform
    if form and pkm == 351:
        gender_suffix = gender_assets_suffix = ''
        gender_suffix = '_{}'.format(Gender.Name(gender))
        form_assets_suffix = '_{:02d}'.format(form - 18)
        form_suffix = '_{}'.format(Form.Name(form))

    assets_basedir = os.path.join(pogo_assets, 'decrypted_assets')
    assets_fullname = os.path.join(assets_basedir,
                                   'pokemon_icon_{:03d}{}{}{}{}.png'.format(
                                       pkm, gender_assets_suffix,
                                       form_assets_suffix,
                                       costume_assets_suffix,
                                       shiny_suffix))
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
        '-gravity {} ( "{}"{} -scale {}x{} -unsharp 0x1 ( +clone ' +
        '-background black -shadow 80x3+5+5 ) +swap -background ' +
        'none -layers merge +repage ) -geometry +0+0 -composite'.format(
            gravity, image, trim_cmd, size, size)
    ]
    return lines


def draw_badge(pos, fill_col, text_col, text):
    (x, y) = pos
    lines = [
        '-fill {} -stroke black -draw "circle {},{} {},{}"'.format(
            fill_col, x, y, x + gym_badge_radius, y),
        '-gravity center -fill {} -stroke none ' +
        '-draw "text {},{} \'{}\'"'.format(
            text_col, x - 48, y - 49, text)
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
    if(os.path.isfile(os.path.join(path, icon))):
        return os.path.join(path, icon)
    else:
        icon = "{}_{}_unknown.png".format(team, raidlevel)
    return os.path.join(path, icon)


def run_imagemagick(source, im_lines, out_filename):
    if not os.path.isfile(out_filename):
        # Make sure, target path exists
        init_image_dir(os.path.split(out_filename)[0])

        cmd = '{} "{}" {} "{}"'.format(
            imagemagick_executable, source, join(im_lines), out_filename)
        if os.name != 'nt':
            cmd = cmd.replace(" ( ", " \( ").replace(" ) ", " \) ")
        log.info("Generating icon '{}'".format(out_filename))
        subprocess.call(cmd, shell=True)
    return out_filename
