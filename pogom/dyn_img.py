import os
import subprocess

import logging
from string import join

from pgoapi.protos.pogoprotos.enums.weather_condition_pb2 import *

from pogom.utils import get_args

log = logging.getLogger(__name__)

path_icons = os.path.join('static', 'icons')
path_images = os.path.join('static', 'images')
path_gym = os.path.join(path_images, 'gym')
path_raid = os.path.join(path_images, 'raid')
path_weather = os.path.join(path_images, 'weather')
path_generated = os.path.join(path_images, 'generated')
path_generated_gym = os.path.join(path_generated, 'gym')
path_generated_pokemon = os.path.join(path_generated, 'pokemon')

egg_images = {
    1: os.path.join(path_raid, 'egg_normal.png'),
    2: os.path.join(path_raid, 'egg_normal.png'),
    3: os.path.join(path_raid, 'egg_rare.png'),
    4: os.path.join(path_raid, 'egg_rare.png'),
    5: os.path.join(path_raid, 'egg_legendary.png')
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
path_pokemon_spritesheet = os.path.join('static', 'icons-large-sprite.png')
pkm_sprites_size = 80
pkm_sprites_cols = 28

# Gym icons
gym_icon_size = 96
gym_badge_radius = 15
gym_badge_padding = 1

badge_upper_left = (gym_badge_padding + gym_badge_radius, gym_badge_padding + gym_badge_radius)
badge_upper_right = (gym_icon_size - (gym_badge_padding + gym_badge_radius), gym_badge_padding + gym_badge_radius)
badge_lower_left = (gym_badge_padding + gym_badge_radius, gym_icon_size - (gym_badge_padding + gym_badge_radius))
badge_lower_right = (gym_icon_size - (gym_badge_padding + gym_badge_radius), gym_icon_size - (gym_badge_padding + gym_badge_radius))

font = os.path.join('static', 'Arial Black.ttf')
font_pointsize = 25


def draw_raid_pokemon(pkm):
    return draw_gym_subject(os.path.join(path_icons, '{}.png'.format(pkm)), 64)


def draw_raid_egg(raidlevel):
    return draw_gym_subject(egg_images[raidlevel], 36, 'center')


def draw_gym_level(level):
    return draw_badge(badge_lower_right, "black", "white", level)


def draw_raid_level(raidlevel):
    return draw_badge(badge_upper_right, "white", "black", raidlevel)


def draw_battle_indicator():
    return battle_indicator_swords()


def battle_indicator_boom():
    # BOOM! Sticker
    return ['-gravity center ( {} -resize 84x84 ) -geometry +0+0 -composite'.format(
        os.path.join(path_gym, 'boom.png'))]


def battle_indicator_fist():
    # Fist Badge
    x = gym_icon_size - (gym_badge_padding + gym_badge_radius)
    y = gym_icon_size / 2
    return [
        '-fill white -stroke black -draw "circle {},{} {},{}"'.format(x, y, x - gym_badge_radius, y),
        '-gravity east ( {} -resize 24x24 ) -geometry +4+0 -composite'.format(os.path.join(path_gym, 'fist.png'))
    ]


def battle_indicator_flame():
    # Flame Badge
    return [
        '-gravity east ( {} -resize 32x32 ) -geometry +0+0 -composite'.format(os.path.join(path_gym, 'flame.png'))
    ]


def battle_indicator_swords():
    # Swords Badge
    x = gym_icon_size - (gym_badge_padding + gym_badge_radius)
    y = gym_icon_size / 2
    return [
        '-fill white -stroke black -draw "circle {},{} {},{}"'.format(x, y, x - gym_badge_radius, y),
        '-gravity east ( {} -resize 24x24 ) -geometry +4+0 -composite'.format(os.path.join(path_gym, 'swords.png'))
    ]


def get_gym_icon(team, level, raidlevel, pkm, is_in_battle):
    init_image_dir(path_generated_gym)
    level = int(level)

    args = get_args()
    if not args.generate_images:
        return default_gym_image(team, level, raidlevel, pkm)

    im_lines = ['-font "{}" -pointsize {}'.format(font, font_pointsize)]
    if pkm and pkm != 'null':
        # Gym with ongoing raid
        out_filename = os.path.join(path_generated_gym, "{}_L{}_R{}_P{}.png".format(team, level, raidlevel, pkm))
        im_lines.extend(draw_raid_pokemon(pkm))
        im_lines.extend(draw_raid_level(raidlevel))
        if level > 0:
            im_lines.extend(draw_gym_level(level))
    elif raidlevel:
        # Gym with upcoming raid (egg)
        raidlevel = int(raidlevel)
        out_filename = os.path.join(path_generated_gym, "{}_L{}_R{}.png".format(team, level, raidlevel))
        im_lines.extend(draw_raid_egg(raidlevel))
        im_lines.extend(draw_raid_level(raidlevel))
        if level > 0:
            im_lines.extend(draw_gym_level(level))
    elif level > 0:
        # Occupied gym
        out_filename = os.path.join(path_generated_gym, '{}_L{}.png'.format(team, level))
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


def get_pokemon_icon(pkm, weather):
    init_image_dir(path_generated_pokemon)
    args = get_args()

    im_lines = []
    # Add Pokemon icon
    if args.assets_url:
        source = '{}/decrypted_assets/pokemon_icon_{:03d}_00.png'.format(args.assets_url, pkm)
        target_size = 96
        im_lines.append(
            '-fuzz 0.5% -trim +repage'
            ' -scale 133x133\> -unsharp 0x1'
            ' -background none -gravity center -extent 139x139'
            ' -background black -alpha background -channel A -blur 0x1 -level 0,10%'
            ' -adaptive-resize {size}x{size}'
            ' -modulate 100,110'.format(size=target_size)
        )
    else:
        # Extract pokemon icon from spritesheet
        source = path_pokemon_spritesheet
        target_size = pkm_sprites_size
        pkm_idx = pkm - 1
        x = (pkm_idx % pkm_sprites_cols) * pkm_sprites_size
        y = (pkm_idx / pkm_sprites_cols) * pkm_sprites_size
        im_lines.append('-crop {size}x{size}+{x}+{y} +repage'.format(size=target_size, x=x, y=y))

    if weather:
        weather_name = WeatherCondition.Name(int(weather))
        out_filename = os.path.join(path_generated_pokemon, "pokemon_{}_{}.png".format(pkm, weather_name))
        radius = 20
        x = target_size - radius - 2
        y = radius + 1
        y2 = 1
        im_lines.append(
            '-gravity northeast'
            ' -fill "#FFFD" -stroke black -draw "circle {x},{y} {x},{y2}"'
            ' -draw "image over 1,1 42,42 \'{weather_img}\'"'.format(x=x, y=y, y2=y2, weather_img=weather_images[weather])
        )
    else:
        out_filename = os.path.join(path_generated_pokemon, "pokemon_{}.png".format(pkm))

    return run_imagemagick(source, im_lines, out_filename)


def draw_gym_subject(image, size, gravity='north'):
    lines = [
        '-gravity {} ( {} -resize {}x{} ( +clone -background black -shadow 80x3+5+5 ) +swap -background none -layers merge +repage ) -geometry +0+0 -composite'.format(
            gravity, image, size, size)
    ]
    return lines


def draw_badge(pos, fill_col, text_col, text):
    (x, y) = pos
    lines = [
        '-fill {} -stroke black -draw "circle {},{} {},{}"'.format(fill_col, x, y, x + gym_badge_radius, y),
        '-gravity center -fill {} -stroke none -draw "text {},{} \'{}\'"'.format(text_col, x - 48, y - 49, text)
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

    return os.path.join(path, icon)


def run_imagemagick(source, im_lines, out_filename):
    if not os.path.isfile(out_filename):
        cmd = 'convert {} {} {}'.format(source, join(im_lines), out_filename)
        if os.name != 'nt':
            cmd = cmd.replace(" ( ", " \( ").replace(" ) ", " \) ")
        log.debug("Executing ImageMagick: {}".format(cmd))
        subprocess.call(cmd, shell=True)
    return out_filename
