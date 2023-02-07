module.exports = function (grunt) {
    const sass = require('node-sass')
    // load plugins as needed instead of up front
    require('jit-grunt')(grunt, {
        unzip: 'grunt-zip'
    })

    var python_exe = grunt.option('python') || 'python3';
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
                    'static/js/vendor/long.js', 'static/js/vendor/s2geometry.js', 'static/js/utils/utils.gym.js',
                    'static/js/utils/utils.i18n.js', 'static/js/utils/utils.item.js', 'static/js/utils/utils.leaflet.js',
                    'static/js/utils/utils.motd.js', 'static/js/utils/utils.pokemon.js', 'static/js/utils/utils.pokestop.js',
                    'static/js/utils/utils.store.js', 'static/js/utils/utils.weather.js', 'static/js/utils/utils.js',
                    'static/js/map/map.settings.js', 'static/js/map/map.gym.js', 'static/js/map/map.park.js',
                    'static/js/map/map.pokemon.js', 'static/js/map/map.pokestop.js', 'static/js/map/map.s2.js',
                    'static/js/map/map.scannedloc.js', 'static/js/map/map.spawnpoint.js', 'static/js/map/map.nest.js',
                    'static/js/map/map.stats.js', 'static/js/map/map.weather.js', 'static/js/custom.js',
                    'static/js/map/map.js'
                ],
                dest: 'static/dist/js/map.concat.js'
            },
            dist2: {
                src: [
                    'static/js/utils/utils.store.js', 'static/js/utils/utils.i18n.js', 'static/js/utils/utils.leaflet.js',
                    'static/js/utils/utils.motd.js', 'static/js/utils/utils.pokemon.js', 'static/js/utils/utils.js',
                    'static/js/custom.js', 'static/js/pokemon-history.js'
                ],
                dest: 'static/dist/js/pokemon-history.concat.js'
            },
            dist3: {
                src: [
                    'static/js/utils/utils.store.js', 'static/js/utils/utils.i18n.js', 'static/js/utils/utils.item.js',
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
                src: [
                    'static/js/utils/utils.i18n.js', 'static/js/utils/utils.motd.js', 'static/js/utils/utils.store.js',
                    'static/js/utils/utils.js', 'static/js/custom.js', 'static/js/users.js'
                ],
                dest: 'static/dist/js/users.concat.js'
            },
            dist6: {
                src: ['static/dist/css/app.built.css', 'static/css/custom.css'],
                dest: 'static/dist/css/app.concat.css'
            },
            dist7: {
                src: ['static/js/utils/utils.js', 'static/js/custom.js', 'static/js/basic-login.js'],
                dest: 'static/dist/js/basic-login.concat.js'
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
                    'static/dist/js/users.built.js': 'static/dist/js/users.concat.js',
                    'static/dist/js/basic-login.built.js': 'static/dist/js/basic-login.concat.js',
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
                    'static/dist/js/users.min.js': 'static/dist/js/users.built.js',
                    'static/dist/js/basic-login.min.js': 'static/dist/js/basic-login.built.js',
                    'static/dist/js/serviceWorker.min.js': 'static/dist/js/serviceWorker.built.js'
                }
            }
        },
        jsonmin: {
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
        clean: ['static/dist/css/', 'static/dist/data/*.json', 'static/dist/js/', 'static/dist/locales/'],
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

    grunt.registerTask('js-build', ['newer:concat:dist1', 'newer:concat:dist2', 'newer:concat:dist3', 'newer:concat:dist4', 'newer:concat:dist5', 'newer:concat:dist7', 'newer:babel', 'newer:uglify'])
    grunt.registerTask('css-build', ['newer:sass', 'newer:concat:dist6', 'newer:cssmin'])
    grunt.registerTask('js-lint', ['newer:eslint'])
    grunt.registerTask('json', ['newer:jsonmin'])

    grunt.registerTask('build', ['clean', 'js-build', 'css-build', 'json', 'unzip'])
    grunt.registerTask('lint', ['js-lint'])
    grunt.registerTask('default', ['build', 'watch'])
    
    grunt.registerTask('invasions', ['gen_invasions', 'build'])
    grunt.registerTask('gen_invasions', function() {
        var exec = require('child_process').exec
        var done_cb = this.async()
        grunt.log.writeln("Running " + python_exe + " scripts/generate_invasion_data.py - this could take a minute")
        exec(python_exe + ' scripts/generate_invasion_data.py', {cwd: '.'}, function(error, stdout, stderr) {
          if (error === null) {
            grunt.log.write(stdout);
            grunt.log.write('Copying generated file to static/data/invasions.json')
            grunt.file.copy('invasions.json', 'static/data/invasions.json')
            grunt.file.delete('invasions.json')
            done_cb();
          } else {
            grunt.log.error(stderr);
            if (stderr.includes("ModuleNotFoundError")) {
                grunt.log.writeln("--")
                grunt.log.error("Detected ModuleNotFoundError - you sure you run it via correct python/venv?");
                grunt.log.error("You can provider proper python3 executable via --python option, for example:")
                grunt.log.error("npm run invasions -- --python=~/venv/bin/python3");
            }
            done_cb(false);
          }
        })
    })
}
