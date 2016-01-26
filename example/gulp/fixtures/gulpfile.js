var gulp = require('gulp')
var rename = require('../shasum')
var del = require('del')

gulp.task('clean', function () {
  return del('build')
})

gulp.task('rename', ['clean'], function () {
  return gulp.src('foo.md')
    .pipe(rename())
    .pipe(gulp.dest('build'))
})

