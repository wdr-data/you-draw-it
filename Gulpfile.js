const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const browserSync = require('browser-sync').create();
const yaml = require('js-yaml');
const markdownIt = require('markdown-it')();
const marked = require('marked');
const _ = require('lodash');
const $ = require('gulp-load-plugins')();

const dist = 'build';

gulp.task('styles', function() {
    return gulp.src('main.sass')
        .pipe($.sass())
        .pipe(gulp.dest('.tmp'))
        .pipe(gulp.dest(dist));
});

gulp.task('templates', function() {
    return gulp.src('*.html')
        .pipe($.data(function() {
            const files = fs.readdirSync('data');
            const data = files.map(function(file) {
                let filedata = yaml.load(fs.readFileSync(path.join('data', file)).toString());
                filedata.key = path.basename(file, '.yml');
                return filedata;
            });
            return {
                data: data
            };
        }))
        .pipe($.swig({
            defaults: { cache: false },
            setup: function(swig) {
                const md = function(input) {
                    return marked(input, {
                        breaks: true
                    });
                };
                md.safe = true;
                swig.setFilter('md', md);

                const mdi = function(input) {
                    return markdownIt.renderInline(input);
                };
                mdi.safe = true;
                swig.setFilter('mdi', mdi);
            }
        }))
        .pipe(gulp.dest('.tmp'))
        .pipe(gulp.dest(dist))
});

gulp.task('scripts', function() {
    return gulp.src('app.js')
        .pipe($.webpack({
            output: {
                filename: 'app.js'
            }
        }))
        .pipe(gulp.dest('.tmp'))
        .pipe(gulp.dest(dist));
});

gulp.task('serve', ['styles', 'templates'], function() {
    browserSync.init({
      server: {
          baseDir: ['.tmp', "./"]
      },
      open: false
  });


    gulp.watch(['*.js'], browserSync.reload);
    gulp.watch(['*.html', 'data/*.yml'], ['templates', browserSync.reload]);
    gulp.watch('*.sass', ['styles', browserSync.reload]);
});

gulp.task('copy:dist', function() {
    return gulp.src(['bower_components/**/*', 'app.js'], { base: './' })
        .pipe(gulp.dest(dist));
});

gulp.task('default', ['styles', 'templates', 'copy:dist']);
