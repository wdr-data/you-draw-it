const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const browserSync = require('browser-sync').create();
const yaml = require('js-yaml');
const md = require('markdown-it')();
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
                var filedata = yaml.load(fs.readFileSync(path.join('data', file)).toString());
                filedata.key = path.basename(file, '.yml');
                filedata.heading = md.renderInline(filedata.heading);
                filedata.result = md.render(filedata.result);
                return filedata;
            });
            return {
                data: data
            };
        }))
        .pipe($.swig({ defaults: { cache: false } }))
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
        }
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