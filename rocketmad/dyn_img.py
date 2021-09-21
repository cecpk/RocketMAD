#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import logging
import os
import subprocess
import sys

from pathlib import Path

from .pogo_protos_pb2 import PokemonDisplayProto
from .utils import get_args, get_pokemon_data

log = logging.getLogger(__name__)
args = get_args()

path_static = Path(args.root_path) / 'static'
path_icons = path_static / 'icons'
path_images = path_static / 'images'
path_gym = path_images / 'gym'
path_raid = path_images / 'raid'
path_weather = path_images / 'weather'
path_generated = path_images / 'generated'
path_generated_gym = path_generated / 'gym'

# Proto constants.
GENDER_UNSET = 0
MALE = 1
FEMALE = 2
GENDERLESS = 3

EVOLUTION_UNSET = 0
EVOLUTION_MEGA = 1
EVOLUTION_MEGA_X = 2
EVOLUTION_MEGA_Y = 3

evolution_suffixes = {
    EVOLUTION_MEGA: "MEGA",
    EVOLUTION_MEGA_X: "MEGA_X",
    EVOLUTION_MEGA_Y: "MEGA_Y"
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
    1: path_gym / 'egg_normal.png',
    2: path_gym / 'egg_normal.png',
    3: path_gym / 'egg_rare.png',
    4: path_gym / 'egg_rare.png',
    5: path_gym / 'egg_legendary.png',
    6: path_gym / 'egg_mega.png'
}

weather_images = {
    1: path_weather / 'weather_icon_clear.png',
    2: path_weather / 'weather_icon_rain.png',
    3: path_weather / 'weather_icon_partlycloudy.png',
    4: path_weather / 'weather_icon_cloudy.png',
    5: path_weather / 'weather_icon_windy.png',
    6: path_weather / 'weather_icon_snow.png',
    7: path_weather / 'weather_icon_fog.png'
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
raid_colors = {
    1: "\"rgb(252,112,176)\"",
    2: "\"rgb(252,112,176)\"",
    3: "\"rgb(255,158,22)\"",
    4: "\"rgb(255,158,22)\"",
    5: "\"rgb(184,165,221)\"",
    6: "\"rgb(141,54,40)\""
}

font = path_static / 'Arial Black.ttf'
font_pointsize = 25


class ImageGenerator:
    # Will be set during config parsing
    generate_images = False
    imagemagick_executable = None
    use_pogo_assets = False
    pokemon_icon_path = None

    def __init__(self):
        if args.generate_images:
            executable = self._determine_imagemagick_binary()
            if executable:
                self.generate_images = True
                self.imagemagick_executable = executable
                log.info("Generating icons using ImageMagick executable '%s'.",
                         executable)

                if args.pogo_assets:
                    pokemon_dirs = [
                        Path(args.pogo_assets) / 'pokemon_icons',
                        Path(args.pogo_assets) / 'Images/Pokemon - 256x256',
                        Path(args.pogo_assets)
                    ]
                    for pokemon_dir in pokemon_dirs:
                        if pokemon_dir.exists():
                            log.info("Using PogoAssets repository at '%s'",
                                     args.pogo_assets)
                            self.use_pogo_assets = True
                            self.pokemon_icon_path = pokemon_dir
                            return

                    log.error("Could not find PogoAssets repository at '%s'. "
                              "Clone via 'git clone --depth 1 "
                              "https://github.com/PokeMiners/pogo_assets.git'",
                              args.pogo_assets)
            else:
                log.error("Could not find ImageMagick executable. Make sure "
                          "you can execute either 'magick' (ImageMagick 7) "
                          "or 'convert' (ImageMagick 6) from the commandline. "
                          "Otherwise you cannot use --generate-images. "
                          "For Debian/Ubuntu just run: sudo apt-get install "
                          "imagemagick")
                sys.exit(1)

    def _is_imagemagick_binary(self, binary):
        try:
            process = subprocess.Popen([binary, '-version'],
                                       stdout=subprocess.PIPE)
            out, err = process.communicate()
            return "ImageMagick" in out.decode('utf8')
        except Exception:
            return False

    def _determine_imagemagick_binary(self):
        candidates = {
            'magick': 'magick convert',
            'convert': None
        }
        for c in candidates:
            if self._is_imagemagick_binary(c):
                return candidates[c] if candidates[c] else c
        return None

    def get_pokemon_raw_icon(self, pkm, gender=GENDER_UNSET, form=0, costume=0,
                             evolution=EVOLUTION_UNSET, shiny=False,
                             weather=None):

        if self.generate_images and self.use_pogo_assets:
            source, target = self._pokemon_asset_path(
                pkm, classifier='icon', gender=gender, form=form,
                costume=costume, evolution=evolution, shiny=shiny,
                weather=weather)
            im_lines = ['-fuzz 0.5% -trim +repage'
                        ' -scale "96x96>" -unsharp 0x1'
                        ' -background none -gravity center -extent 96x96'
                        ]
            return self._run_imagemagick(source, im_lines, target)
        else:
            return path_icons / '{}.png'.format(pkm)

    def get_pokemon_map_icon(self, pkm, gender=GENDER_UNSET, form=0, costume=0,
                             evolution=EVOLUTION_UNSET, weather=None):
        im_lines = []

        # Add Pokemon icon
        if self.use_pogo_assets:
            source, target = self._pokemon_asset_path(
                pkm, classifier='marker', gender=gender, form=form,
                costume=costume, evolution=evolution, weather=weather)
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
            target_path = path_generated / 'pokemon_spritesheet_marker'
            target = target_path / 'pokemon_{}{}.png'.format(pkm,
                                                             weather_suffix)
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

        return self._run_imagemagick(source, im_lines, target)

    def get_gym_icon(self, team, level, raid_level=0, pkm=0, form=0, costume=0,
                     evolution=EVOLUTION_UNSET, ex_raid_eligible=False,
                     in_battle=False):
        if not self.generate_images:
            return self._default_gym_image(team, level, raid_level, pkm)

        im_lines = ['-font "{}" -pointsize {}'.format(font, font_pointsize)]
        if pkm > 0:
            # Gym with ongoing raid.
            form_extension = '_F{}'.format(form) if form > 0 else ''
            costume_extension = '_C{}'.format(costume) if costume > 0 else ''
            evolution_extension = ('_E{}'.format(evolution)
                                   if evolution > 0 else '')
            out_filename = (
                path_generated_gym / "{}_L{}_R{}_P{}{}{}{}.png".format(
                    team, level, raid_level, pkm, form_extension,
                    costume_extension, evolution_extension))
            im_lines.extend(self._draw_raid_pokemon(pkm, form, costume,
                                                    evolution))
            im_lines.extend(self._draw_raid_level(raid_level))
            if level > 0:
                im_lines.extend(self._draw_gym_level(level, team))
        elif raid_level > 0:
            # Gym with upcoming raid (egg).
            out_filename = (
                path_generated_gym / "{}_L{}_R{}.png".format(team, level,
                                                             raid_level))
            im_lines.extend(self._draw_raid_egg(raid_level))
            im_lines.extend(self._draw_raid_level(raid_level))
            if level > 0:
                im_lines.extend(self._draw_gym_level(level, team))
        elif level > 0:
            # Occupied gym.
            out_filename = path_generated_gym / '{}_L{}.png'.format(team,
                                                                    level)
            im_lines.extend(self._draw_gym_level(level, team))
        else:
            # Neutral gym.
            return path_gym / '{}.png'.format(team)

        # Battle Indicator.
        if in_battle:
            out_filename = Path(str(out_filename).replace('.png', '_B.png'))
            im_lines.extend(self._draw_battle_indicator())

        # EX raid eligble indicator.
        if ex_raid_eligible:
            out_filename = Path(str(out_filename).replace('.png', '_EX.png'))
            im_lines.extend(self._draw_ex_raid_eligible_indicator())

        gym_image = path_gym / '{}.png'.format(team)
        return self._run_imagemagick(gym_image, im_lines, out_filename)

    def _draw_raid_pokemon(self, pkm, form, costume, evolution):
        if self.use_pogo_assets:
            pkm_path, dummy = self._pokemon_asset_path(
                pkm, form=form, costume=costume, evolution=evolution)
            trim = True
        else:
            pkm_path = path_icons / '{}.png'.format(pkm)
            trim = False
        return self._draw_gym_subject(pkm_path, 64, trim=trim)

    def _draw_raid_egg(self, level):
        egg_path = egg_images[level]
        return self._draw_gym_subject(egg_path, 36, gravity='center')

    def _draw_gym_level(self, level, team):
        fill_col = "black" if args.black_white_badges else team_colors[team]
        return self._draw_badge(badge_lower_right, fill_col, "white", level)

    def _draw_raid_level(self, level):
        fill_col = "white" if args.black_white_badges else raid_colors[level]
        text_col = "black" if args.black_white_badges else "white"
        return self._draw_badge(badge_upper_right, fill_col, text_col, level)

    def _draw_battle_indicator(self):
        return self._battle_indicator_swords()

    def _draw_ex_raid_eligible_indicator(self):
        return [
            '-gravity SouthWest ( "{}" -resize 40x28 ) '.format(
                path_gym / 'ex.png'),
            '-geometry +0+0 -composite'
        ]

    def _battle_indicator_boom(self):
        # BOOM! Sticker
        return [
            '-gravity center ( "{}" -resize 84x84 ) '.format(
                path_gym / 'boom.png'),
            '-geometry +0+0 -composite'
        ]

    def _battle_indicator_fist(self):
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

    def _battle_indicator_flame(self):
        # Flame Badge
        return [
            '-gravity east ( "{}" -resize 32x32 )  -geometry +0+0 '.format(
                path_gym / 'flame.png'),
            '-composite'
        ]

    def _battle_indicator_swords(self):
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

    def _get_unity_pokemon_asset_path(self, pkm, gender=GENDER_UNSET, form=0,
                                      costume=0, evolution=EVOLUTION_UNSET,
                                      shiny=False):
        form_suffix = ''
        if evolution != EVOLUTION_UNSET:
            form_suffix = '.f' + evolution_suffixes[evolution]
        elif form > 0:
            form_proto = PokemonDisplayProto().Form.Name(form)
            form_name = form_proto[form_proto.index('_') + 1:]
            if form_name not in ['NORMAL', 'SHADOW', 'PURIFIED']:
                form_suffix = '.f' + form_name

        costume_suffix = ''
        if costume > 0:
            costume_suffix = '.c' + PokemonDisplayProto().Costume.Name(costume)

        gender_suffix = '.g2' if gender == FEMALE else ''
        shiny_suffix = '.s' if shiny else ''

        filename = f'pm{pkm}{form_suffix}{costume_suffix}{gender_suffix}' \
                   f'{shiny_suffix}.icon.png'
        file_path = self.pokemon_icon_path / 'Addressable Assets' / filename

        if not file_path.exists() and gender != MALE:
            return self._get_unity_pokemon_asset_path(
                pkm, MALE, form, costume, evolution, shiny)

        return file_path

    def _get_old_pokemon_asset_path(self, pkm, gender=GENDER_UNSET, form=0,
                                    costume=0, evolution=EVOLUTION_UNSET,
                                    shiny=False):
        if gender == MALE or gender == FEMALE:
            gender_form_asset_suffix = (
                '_{:02d}'.format(gender - 1))
        else:
            gender_form_asset_suffix = '_00'
        costume_asset_suffix = '_{:02d}'.format(costume) if costume > 0 else ''
        shiny_suffix = '_shiny' if shiny else ''

        should_use_asset_bundle_suffix = False

        if evolution == EVOLUTION_MEGA or evolution == EVOLUTION_MEGA_X:
            gender_form_asset_suffix = '_51'
        elif evolution == EVOLUTION_MEGA_Y:
            gender_form_asset_suffix = '_52'
        else:
            forms = get_pokemon_data(pkm).get('forms')
            if forms:
                if form and str(form) in forms:
                    form_data = forms[str(form)]
                else:
                    # Default value is first form.
                    form_data = list(forms.values())[0]

                asset_id = '00'

                if 'assetId' in form_data:
                    asset_id = form_data['assetId']
                elif 'assetSuffix' in form_data:
                    should_use_asset_bundle_suffix = True
                    asset_id = form_data['assetSuffix']

                if asset_id != '00':
                    gender_form_asset_suffix = '_' + asset_id

        if should_use_asset_bundle_suffix:
            file_path = (
                self.pokemon_icon_path / 'pokemon_icon{}{}.png'.format(
                    gender_form_asset_suffix, shiny_suffix))
        else:
            file_path = (
                self.pokemon_icon_path / 'pokemon_icon_{:03d}{}{}{}.png'
                .format(pkm, gender_form_asset_suffix,
                        costume_asset_suffix, shiny_suffix))

        if not file_path.exists() and gender != MALE:
            return self._get_old_pokemon_asset_path(
                pkm, MALE, form, costume, evolution, shiny)

        return file_path

    def _pokemon_asset_path(self, pkm, classifier=None, gender=GENDER_UNSET,
                            form=0, costume=0, evolution=EVOLUTION_UNSET,
                            shiny=False, weather=None):
        asset_path = self._get_unity_pokemon_asset_path(
            pkm, gender, form, costume, evolution, shiny)
        if not asset_path.exists():
            asset_path = self._get_old_pokemon_asset_path(
                pkm, gender, form, costume, evolution, shiny)

        gender_suffix = '_g2' if gender == FEMALE else '_g1'
        form_suffix = '_f' + str(form) if form > 0 else ''
        costume_suffix = '_c' + str(costume) if costume > 0 else ''
        evolution_suffix = '_e' + str(evolution) if evolution > 0 else ''
        shiny_suffix = '_s' if shiny else ''
        weather_suffix = '_' + weather_names[weather] if weather else ''

        if classifier:
            target_dir = path_generated / 'pokemon_{}'.format(classifier)
        else:
            target_dir = path_generated / 'pokemon'
        target_filename = 'pm{}{}{}{}{}{}{}.png'.format(
            pkm, gender_suffix, form_suffix, costume_suffix, evolution_suffix,
            shiny_suffix, weather_suffix)

        if asset_path.exists():
            return asset_path, target_dir / target_filename
        else:
            log.warning("Cannot find PogoAssets file for target file {}"
                        .format(target_filename))
            dummy_icon = self.pokemon_icon_path / 'pokemon_icon_000.png'
            target = Path(target_dir) / 'pm0.png'
            if dummy_icon.exists():
                return dummy_icon, target
            else:
                return Path(path_images) / 'dummy_pokemon.png', target

    def _draw_gym_subject(self, image, size, gravity='north', trim=False):
        trim_cmd = ' -fuzz 0.5% -trim +repage' if trim else ''
        lines = [
            '-gravity {} ( "{}"{} -scale {}x{} -unsharp 0x1 ( +clone '.format(
                gravity, image, trim_cmd, size, size),
            '-background black -shadow 80x3+5+5 ) +swap -background '
            + 'none -layers merge +repage ) -geometry +0+0 -composite'
        ]
        return lines

    def _draw_badge(self, pos, fill_col, text_col, text):
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

    def _default_gym_image(self, team, level, raid_level, pkm):
        path = path_gym
        if pkm > 0:
            icon = "{}_{}.png".format(team, pkm)
            path = path_raid
        elif raid_level > 0:
            icon = "{}_{}_{}.png".format(team, level, raid_level)
        elif level > 0:
            icon = "{}_{}.png".format(team, level)
        else:
            icon = "{}.png".format(team)
        if not (path / icon).is_file():
            icon = "{}_{}_unknown.png".format(team, raid_level)

        return path / icon

    def _run_imagemagick(self, source, im_lines, out_file):
        if not out_file.is_file():
            # Make sure, target path exists
            out_file.parent.mkdir(parents=True, exist_ok=True)

            cmd = '{} "{}" {} "{}"'.format(
                self.imagemagick_executable, source, " ".join(im_lines),
                out_file)
            if os.name != 'nt':
                cmd = cmd.replace(" ( ", " \\( ").replace(" ) ", " \\) ")
            log.info("Generating icon '{}'".format(out_file))
            subprocess.call(cmd, shell=True)
        return str(out_file)
