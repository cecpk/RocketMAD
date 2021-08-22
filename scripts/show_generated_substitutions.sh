#!/bin/sh
find ../static/images/generated -type f -size 14476c -exec cmp -s ../static/images/dummy_pokemon.png "{}" ';' -exec echo "{}" ';'
