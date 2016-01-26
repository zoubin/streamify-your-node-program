## Gulp
我最先接触的是[`grunt`]，一开始就被复杂的配置文件给弄晕了。
后来使用了[`gulp`]，对其
[API](https://github.com/gulpjs/gulp/blob/master/docs/API.md)
的简洁非常佩服，毫不犹豫的放弃了[`grunt`]。

[`gulp`]的核心功能就两个。
一是任务调度，其底层依赖是[`orchestrator`]，这里不介绍。
另一个功能就是文件处理，其底层依赖是[`vinyl-fs`]。
这决定了一个任务怎么写，能做什么事。

在[功能](tools.md)和[Browserify](browserify.md)的介绍中，
我们了解了`pipeline`的设计方式，之所以再介绍[`gulp`]，
是因为它引入了另一种完全不一样的设计风格。

先看一个[`gulp`]的任务实例：

```js
gulp.task('scripts', ['clean'], function() {
  // Minify and copy all JavaScript (except vendor scripts)
  // with sourcemaps all the way down
  return gulp.src(paths.scripts)
    .pipe(sourcemaps.init())
    .pipe(coffee())
    .pipe(uglify())
    .pipe(concat('all.min.js'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('build/js'));
});

```

至此，看到这个内容应当不再陌生。
其实在一个任务中，[`gulp`]提供的只是`gulp.src`和`gulp.dest`，
分别生成了`pipeline`的源和最终目的。

之前介绍的工具，都是自己提供了一个完整的`pipeline`，
再通过插件机制由用户去操作修改`pipeline`。
但[`gulp`]只提供了开头和结尾，由用户自己去组织`pipeline`。
这是因为，前面的工具都有非常明确的具体功能，
而[`gulp`]只是想提供一种构造`pipeline`的基础。
正是因为这样，我们可以很轻松的写一个[`gulp`]的插件，去实现我们想要的功能。

在[`gulp`]的`pipeline`中流动的是[`vinyl`]对象，插件主要是修改其中的`contents`字段，
对文件内容进行修改，或是修改其`path`等字段，达到重命名的目的。

我们试写一个插件，将文件命名为其内容的sha1：

```js
var Stream = require('stream')
var shasum = require('shasum')
var path = require('path')

module.exports = function () {
  return Stream.Transform({
    objectMode: true,
    transform: function (file, enc, next) {
      file.path = shasum(file.contents).slice(0, 7) + path.extname(file.path)
      next(null, file)
    },
  })
}

```

gulpfile.js

```js
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

```

足可见，[`gulp`]的插件就是一个`Dupex`（包括`Transform`）对象。
所以，前面提到的工具都可以使用。

譬如：

```js
var gulp = require('gulp')
var merge = require('merge-stream')

gulp.task('build', function () {
  var jsStream = gulp.src('*.js')
    .pipe(transformJs())
  var cssStream = gulp.src('*.css')
    .pipe(transformCss())
  return merge(jsStream, cssStream)
    .pipe(gulp.dest('build'))
})

```


[`gulp`]: https://github.com/gulpjs/gulp
[`grunt`]: https://github.com/gruntjs/grunt
[`orchestrator`]: https://github.com/orchestrator/orchestrator
[`vinyl-fs`]: https://github.com/gulpjs/vinyl-fs
[`vinyl`]: https://github.com/gulpjs/vinyl

