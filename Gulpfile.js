const fs = require('fs');
const path = require('path');
const url = require('url');
const gulp = require('gulp');
const browserSync = require('browser-sync').create();
const yaml = require('js-yaml');
const markdownIt = require('markdown-it')();
const marked = require('marked');
const cssUrlParser = require('css-url-parser');
const _ = require('lodash');
const $ = require('gulp-load-plugins')();

const dist = 'build';

gulp.task('styles', function() {
    return gulp.src('styles/main.sass')
        .pipe($.sass())
        .pipe(gulp.dest(path.join('.tmp', 'styles')))
        .pipe(gulp.dest(path.join(dist, 'styles')));
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

const dlFonts = function(dest) {
    const urls = cssUrlParser(fs.readFileSync('styles/fonts.css').toString())
        .filter(pathStr => !fs.existsSync(path.join(dest, pathStr)))
        .map(urlStr => url.resolve("http://www1.wdr.de/resources/fonts/", urlStr));

    if(urls.length == 0) {
        return gulp.src([]);
    }

    return $.download(urls)
        .pipe(gulp.dest(dest));
};
gulp.task('fonts', function() {
    return dlFonts(path.join(dist, 'fonts'));
});
gulp.task('fonts:develop', function() {
    return dlFonts('fonts');
});

gulp.task('serve', ['fonts:develop', 'styles', 'templates'], function() {
    browserSync.init({
      server: {
          baseDir: ['.tmp', "./"]
      },
      open: false
  });


    gulp.watch(['*.js'], browserSync.reload);
    gulp.watch(['*.html', 'partials/*.html', 'data/*.yml'], ['templates', browserSync.reload]);
    gulp.watch('styles/*.sass', ['styles', browserSync.reload]);
});

gulp.task('copy:dist', function() {
    return gulp.src(['bower_components/**/*', 'app.js', 'images/**/*', 'styles/*.css'], { base: './' })
        .pipe(gulp.dest(dist));
});

gulp.task('default', ['fonts', 'styles', 'templates', 'copy:dist']);
