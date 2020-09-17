module.exports = function (grunt) {
    const sass = require('node-sass')
    // load plugins as needed instead of up front
    require('jit-grunt')(grunt, {
        unzip: 'grunt-zip'
    })

    var path = require('path')
    var fs = require('fs')

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        sass: {
            options: {
                implementation: sass
            },
            dist: {
                files: {
                    'static/dist/css/app.built.css': 'static/sass/main.scss'
                }
            }
        },
        eslint: {
            src: ['static/js/**/*.js']
        },
        concat: {
            dist1: {
                src: [
                    'static/js/utils/utils.gym.js', 'static/js/utils/utils.i8ln.js', 'static/js/utils/utils.item.js',
                    'static/js/utils/utils.leaflet.js', 'static/js/utils/utils.long.js', 'static/js/utils/utils.motd.js',
                    'static/js/utils/utils.pokemon.js', 'static/js/utils/utils.pokestop.js', 'static/js/utils/utils.s2geometry.js',
                    'static/js/utils/utils.store.js', 'static/js/utils/utils.js', 'static/js/map/map.gym.js',
                    'static/js/map/map.park.js', 'static/js/map/map.pokemon.js', 'static/js/map/map.pokestop.js',
                    'static/js/map/map.s2.js', 'static/js/map/map.scannedloc.js', 'static/js/map/map.spawnpoint.js',
                    'static/js/map/map.stats.js', 'static/js/map/map.weather.js', 'static/js/custom.js',
                    'static/js/map/map.js'
                ],
                dest: 'static/dist/js/map.concat.js'
            },
            dist2: {
                src: [
                    'static/js/utils/utils.store.js', 'static/js/utils/utils.i8ln.js', 'static/js/utils/utils.leaflet.js',
                    'static/js/utils/utils.motd.js', 'static/js/utils/utils.pokemon.js', 'static/js/utils/utils.js',
                    'static/js/custom.js', 'static/js/pokemon-history.js'
                ],
                dest: 'static/dist/js/pokemon-history.concat.js'
            },
            dist3: {
                src: [
                    'static/js/utils/utils.store.js', 'static/js/utils/utils.i8ln.js', 'static/js/utils/utils.item.js',
                    'static/js/utils/utils.motd.js', 'static/js/utils/utils.pokemon.js',  'static/js/utils/utils.js',
                    'static/js/custom.js', 'static/js/quest.js'
                ],
                dest: 'static/dist/js/quest.concat.js'
            },
            dist4: {
                src: [
                    'static/js/utils/utils.motd.js', 'static/js/utils/utils.store.js', 'static/js/custom.js',
                    'static/js/mobile.js'
                ],
                dest: 'static/dist/js/mobile.concat.js'
            },
            dist5: {
                src: ['static/dist/css/app.built.css', 'static/css/custom.css'],
                dest: 'static/dist/css/app.concat.css'
            }
        },
        babel: {
            options: {
                sourceMap: true,
                presets: ['@babel/preset-env']
            },
            dist: {
                files: {
                    'static/dist/js/map.built.js': 'static/dist/js/map.concat.js',
                    'static/dist/js/pokemon-history.built.js': 'static/dist/js/pokemon-history.concat.js',
                    'static/dist/js/quest.built.js': 'static/dist/js/quest.concat.js',
                    'static/dist/js/mobile.built.js': 'static/dist/js/mobile.concat.js',
                    'static/dist/js/serviceWorker.built.js': 'static/js/serviceWorker.js'
               }
            }
        },
        uglify: {
            options: {
                banner: '/*\n <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> \n*/\n',
                sourceMap: true,
                compress: {
                    unused: false
                }
            },
            build: {
                files: {
                    'static/dist/js/map.min.js': 'static/dist/js/map.built.js',
                    'static/dist/js/pokemon-history.min.js': 'static/dist/js/pokemon-history.built.js',
                    'static/dist/js/quest.min.js': 'static/dist/js/quest.built.js',
                    'static/dist/js/mobile.min.js': 'static/dist/js/mobile.built.js',
                    'static/dist/js/serviceWorker.min.js': 'static/dist/js/serviceWorker.built.js'
                }
            }
        },
        minjson: {
            build: {
                files: {
                    'static/dist/data/pokemon.min.json': 'static/data/pokemon.json',
                    'static/dist/data/moves.min.json': 'static/data/moves.json',
                    'static/dist/data/items.min.json': 'static/data/items.json',
                    'static/dist/data/invasions.min.json': 'static/data/invasions.json',
                    'static/dist/data/markerstyles.min.json': 'static/data/markerstyles.json',
                    'static/dist/locales/de.min.json': 'static/locales/de.json',
                    'static/dist/locales/fr.min.json': 'static/locales/fr.json',
                    'static/dist/locales/ja.min.json': 'static/locales/ja.json',
                    'static/dist/locales/ko.min.json': 'static/locales/ko.json',
                    'static/dist/locales/pt_br.min.json': 'static/locales/pt_br.json',
                    'static/dist/locales/ru.min.json': 'static/locales/ru.json',
                    'static/dist/locales/zh_cn.min.json': 'static/locales/zh_cn.json',
                    'static/dist/locales/zh_tw.min.json': 'static/locales/zh_tw.json',
                    'static/dist/locales/zh_hk.min.json': 'static/locales/zh_hk.json'
                }
            }
        },
        clean: ['static/dist'],
        watch: {
            options: {
                interval: 1000,
                spawn: true
            },
            js: {
                files: ['static/js/**/*.js'],
                options: {livereload: true},
                tasks: ['js-lint', 'js-build']
            },
            json: {
                files: ['static/data/*.json', 'static/locales/*.json'],
                options: {livereload: true},
                tasks: ['json']
            },
            css: {
                files: '**/*.scss',
                options: {livereload: true},
                tasks: ['css-build']
            }
        },
        cssmin: {
            options: {
                banner: '/*\n <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> \n*/\n'
            },
            build: {
                files: {
                    'static/dist/css/app.min.css': 'static/dist/css/app.concat.css'
                }
            }
        },
        unzip: {
            'static01': {
                router: function (filepath) {
                    if (fs.existsSync('static/' + filepath)) {
                        return null
                    }

                    return filepath
                },

                src: 'static01.zip',
                dest: 'static/'
            }
        }

    })

    grunt.registerTask('js-build', ['newer:concat:dist1', 'newer:concat:dist2', 'newer:concat:dist3', 'newer:concat:dist4', 'newer:babel', 'newer:uglify'])
    grunt.registerTask('css-build', ['newer:sass', 'newer:concat:dist5', 'newer:cssmin'])
    grunt.registerTask('js-lint', ['newer:eslint'])
    grunt.registerTask('json', ['newer:minjson'])

    grunt.registerTask('build', ['clean', 'js-build', 'css-build', 'json', 'unzip'])
    grunt.registerTask('lint', ['js-lint'])
    grunt.registerTask('default', ['build', 'watch'])
}
