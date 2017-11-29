import os
import subprocess

import logging
from string import join

from pogom.utils import get_args

log = logging.getLogger(__name__)

path_icons = os.path.join('static', 'icons')
path_images = os.path.join('static', 'images')
path_gym = os.path.join(path_images, 'gym')
path_raid = os.path.join(path_images, 'raid')
path_generated = os.path.join(path_images, 'generated')

egg_images = {
    1: os.path.join(path_raid, 'egg_normal.png'),
    2: os.path.join(path_raid, 'egg_normal.png'),
    3: os.path.join(path_raid, 'egg_rare.png'),
    4: os.path.join(path_raid, 'egg_rare.png'),
    5: os.path.join(path_raid, 'egg_legendary.png')
}

icon_size = 96
badge_radius = 15
padding = 1

badge_upper_left = (padding + badge_radius, padding + badge_radius)
badge_upper_right = (icon_size - (padding + badge_radius), padding + badge_radius)
badge_lower_left = (padding + badge_radius, icon_size - (padding + badge_radius))
badge_lower_right = (icon_size - (padding + badge_radius), icon_size - (padding + badge_radius))

font = os.path.join('static', 'Arial Black.ttf')
font_pointsize = 25


def draw_raid_pokemon(pkm):
    return draw_subject(os.path.join(path_icons, '{}.png'.format(pkm)), 64)


def draw_raid_egg(raidlevel):
    return draw_subject(egg_images[raidlevel], 36, 'center')


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
    x = icon_size - (padding + badge_radius)
    y = icon_size / 2
    return [
        '-fill white -stroke black -draw "circle {},{} {},{}"'.format(x, y, x - badge_radius, y),
        '-gravity east ( {} -resize 24x24 ) -geometry +4+0 -composite'.format(os.path.join(path_gym, 'fist.png'))
    ]


def battle_indicator_flame():
    # Flame Badge
    return [
        '-gravity east ( {} -resize 32x32 ) -geometry +0+0 -composite'.format(os.path.join(path_gym, 'flame.png'))
    ]


def battle_indicator_swords():
    # Swords Badge
    x = icon_size - (padding + badge_radius)
    y = icon_size / 2
    return [
        '-fill white -stroke black -draw "circle {},{} {},{}"'.format(x, y, x - badge_radius, y),
        '-gravity east ( {} -resize 24x24 ) -geometry +4+0 -composite'.format(os.path.join(path_gym, 'swords.png'))
    ]


def get_gym_icon(team, level, raidlevel, pkm, is_in_battle):
    init_image_dir()
    level = int(level)

    args = get_args()
    if not args.generate_images:
        return default_gym_image(team, level, raidlevel, pkm)

    im_lines = []
    if pkm and pkm != 'null':
        # Gym with ongoing raid
        out_filename = os.path.join(path_generated, "{}_L{}_R{}_P{}.png".format(team, level, raidlevel, pkm))
        im_lines.extend(draw_raid_pokemon(pkm))
        im_lines.extend(draw_raid_level(raidlevel))
        if level > 0:
            im_lines.extend(draw_gym_level(level))
    elif raidlevel:
        # Gym with upcoming raid (egg)
        raidlevel = int(raidlevel)
        out_filename = os.path.join(path_generated, "{}_L{}_R{}.png".format(team, level, raidlevel))
        im_lines.extend(draw_raid_egg(raidlevel))
        im_lines.extend(draw_raid_level(raidlevel))
        if level > 0:
            im_lines.extend(draw_gym_level(level))
    elif level > 0:
        # Occupied gym
        out_filename = os.path.join(path_generated, '{}_L{}.png'.format(team, level))
        im_lines.extend(draw_gym_level(level))
    else:
        # Neutral gym
        return os.path.join(path_gym, '{}.png'.format(team))

    # Battle Indicator
    if is_in_battle:
        out_filename = out_filename.replace('.png', '_B.png')
        im_lines.extend(draw_battle_indicator())

    if not os.path.isfile(out_filename):
        gym_image = os.path.join('static', 'images', 'gym', '{}.png'.format(team))
        cmd = 'convert {} -font "{}" -pointsize 25 {} {}'.format(gym_image, font, join(im_lines),
                                                                 out_filename)
        if os.name != 'nt':
            cmd = cmd.replace(" ( ", " \( ").replace(" ) ", " \) ")
        subprocess.call(cmd, shell=True)
    return out_filename


def draw_subject(image, size, gravity='north'):
    lines = []
    lines.append(
        '-gravity {} ( {} -resize {}x{} ( +clone -background black -shadow 80x3+5+5 ) +swap -background none -layers merge +repage ) -geometry +0+0 -composite'.format(
            gravity, image, size, size))
    return lines


def draw_badge(pos, fill_col, text_col, text):
    (x, y) = pos
    lines = []
    lines.append('-fill {} -stroke black -draw "circle {},{} {},{}"'.format(fill_col, x, y, x + badge_radius, y))
    lines.append('-gravity center -fill {} -stroke none -draw "text {},{} \'{}\'"'.format(text_col, x - 48, y - 49, text))
    return lines


def init_image_dir():
    if not os.path.isdir(path_generated):
        try:
            os.makedirs(path_generated)
        except OSError as exc:
            if not os.path.isdir(path_generated):
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
