# Tools
- [`through2`]
- [`merge-stream`]
- [`concat-stream`]
- [`sink-transform`]
- [`duplexer2`]
- [`stream-combiner2`]
- [`stream-splicer`]
- [`labeled-stream-splicer`]

## through2
[`through2`]可用来方便的创建一个`Transform`。

```js
var through = require('through2')

var transform = through(_transform, _flush)

// objectMode
var transform = through.obj(_transform, _flush)

```

```js
var Transform = require('stream').Transform

var transform = Transform({
  transform: _transform,
  flush: _flush,
})

// objectMode
var transform = Transform({
  objectMode: true,
  transform: _transform,
  flush: _flush,
})

```

## merge-stream
合并多个可读流，生成一个可读流。

```js
var merge = require('merge-stream')
var Stream = require('stream')

merge(
  createReadable('aBc').pipe(toUpperCase()),
  createReadable('DeF').pipe(toLowerCase())
)
.pipe(process.stdout)

function createReadable(s) {
  var source = s.split('')

  return Stream.Readable({
    read: function () {
      process.nextTick(() => {
        this.push(source.shift() || null)
      })
    },
  })
}

function toUpperCase() {
  return Stream.Transform({
    transform: function (buf, enc, next) {
      next(null, buf.toString().toUpperCase())
    },
  })
}

function toLowerCase() {
  return Stream.Transform({
    transform: function (buf, enc, next) {
      next(null, buf.toString().toLowerCase())
    },
  })
}

```

执行上述代码结果为：
```
AdBeCf

```

**注意**
[`merge-stream`]只保证一定可获取到所有输入流的数据，但不保证其相应顺序。
若要求顺序，要考虑[`multistream`]。

**注意**
虽然[`merge-stream`]实际返回的是一个`Transform`，但不要直接调用`write()`往里面写数据，
因为此时可能已经调用过`end()`了。

如何异步的添加可读流？
有时候需要异步的添加数据流，这时需要一点步技巧。
```js
var merge = require('merge-stream')
var Stream = require('stream')

var wait = Stream.Transform()
var merged = merge(wait)

setTimeout(function() {
  merged.add(createReadable('aBc').pipe(toUpperCase()))
}, 10)

setTimeout(function() {
  merged.add(createReadable('DeF').pipe(toLowerCase()))

  wait.end()
}, 20)

merged.pipe(process.stdout)

function createReadable(s) {
  var source = s.split('')

  return Stream.Readable({
    read: function () {
      process.nextTick(() => {
        this.push(source.shift() || null)
      })
    },
  })
}

function toUpperCase() {
  return Stream.Transform({
    transform: function (buf, enc, next) {
      next(null, buf.toString().toUpperCase())
    },
  })
}

function toLowerCase() {
  return Stream.Transform({
    transform: function (buf, enc, next) {
      next(null, buf.toString().toLowerCase())
    },
  })
}

```

输出：
```
ABCdef

```

`merged`一定会等当前所有数据流的`end`事件都触发才会调用其`end()`结束自己，
所以，可以使用一个`PassThrough`来控制其调用`end()`的最早时间。

## concat-stream
[`concat-stream`]可创建一个可写流，将所有写入的数据合并起来。

```js
var concat = require('concat-stream')

var writable = concat({ encoding: 'string' }, function (body) {
  // abc
  console.log(body)
})

writable.write('a')
writable.write('b')
writable.write('c')
writable.end()

```

## sink-transform
[`sink-transform`]实现的功能类似[`concat-stream`]，但返回的是一个`Transform`。

```js
var sink = require('sink-transform')
var Stream = require('stream')

createReadable('abc')
  .pipe(sink.str(function (body, next) {
    this.push(body.toUpperCase())
    next()
  }))
  // ABC
  .pipe(process.stdout)

function createReadable(s) {
  var source = s.split('')

  return Stream.Readable({
    read: function () {
      process.nextTick(() => {
        this.push(source.shift() || null)
      })
    },
  })
}


```

## duplexer2
[`duplexer2`]是创建`Duplex`的利器。

## stream-combiner2
[`stream-combiner2`]可用来将多个`Duplex`（包括`Transform`）组合成一个`pipeline`，
返回一个`Duplex`给外界使用。

## stream-splicer
[`stream-splicer`]实现了[`stream-combiner2`]的功能，
同时，还提供了`push`, `pop`, `splice`等方法，
可方便的添加、删除`pipeline`中的`Duplex`对象。

## labeled-stream-splicer
[`labeled-stream-splicer`]实现了[`stream-splicer`]的功能，
同时，可用名字去获取`pipeline`中的`Duplex`。


[`stream-combiner2`]: https://github.com/substack/stream-combiner2
[`substack#stream-handbook`]: https://github.com/substack/stream-handbook
[`through2`]: https://github.com/rvagg/through2
[`concat-stream`]: https://github.com/maxogden/concat-stream
[`sink-transform`]: https://github.com/zoubin/sink-transform
[`duplexer2`]: https://github.com/deoxxa/duplexer2
[`labeled-stream-splicer`]: https://github.com/substack/labeled-stream-splicer
[`stream-splicer`]: https://github.com/substack/stream-splicer
[`merge-stream`]: https://github.com/grncdr/merge-stream
[`multistream`]: https://github.com/feross/multistream
[`gulp`]: https://github.com/gulpjs/gulp
[`browserify`]: https://github.com/substack/node-browserify
