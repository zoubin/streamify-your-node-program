# Tools
- [through2](#through2)
- [merge-stream](#merge-stream)
- [concat-stream](#concat-stream)
- [sink-transform](#sink-transform)
- [duplexer2](#duplexer2)
- [stream-combiner2](#stream-combiner2)
- [stream-splicer](#stream-splicer)
- [labeled-stream-splicer](#labeled-stream-splicer)

## through2
[`through2`]可用来方便的创建一个`Transform`。

```js
var through = require('through2')

var transform = through(_transform, _flush)

// objectMode
var transform = through.obj(_transform, _flush)

```

等价于：

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

虽然现在看来[`through2`]的接口并没比原生的方便多少，但它为生成的`Transform`提供了一个`destroy(err)`方法，
执行该方法会触发`close`事件，
而在使用`src.pipe(dest)`连接两个流时，会监听一系列事件，
其中有一个便是`close`事件，其行为便是清除所有事件监听，
并且调用`src.unpipe(dest)`。
所以，如果因为流的使用而带来内存泄漏，可以考虑在适当的时机调用`destroy`方法。

下面便是[`through2`]提供的`destroy`方法。

```js
DestroyableTransform.prototype.destroy = function(err) {
  if (this._destroyed) return
  this._destroyed = true
  
  var self = this
  process.nextTick(function() {
    if (err)
      self.emit('error', err)
    self.emit('close')
  })
}

```

当然，也可以直接`dest.emit('close')`。

## merge-stream
[`merge-stream`]合并多个可读流，生成一个可读流。

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
它可将一个可写流与一个可读流组合起来，构造出一个`Duplex`对象。

下面是一个解析`git log`的脚本。

```js
var Stream = require('stream')
var duplexer = require('duplexer2')

module.exports = parse

function parse() {
  var parser = Parser()

  var output = Stream.Readable({ objectMode: true, read: Function.prototype })

  var row

  parser.on('message', function (msg) {
    row = row || {}
    row.msg = row.msg || []
    row.msg.push(msg)
  })

  parser.on('header', function (header, value) {
    if (header === 'commit') {
      if (row) {
        output.push(row)
      }
      row = {}
    }
    if (row) {
      row[header] = value
    }
  })

  parser.once('finish', function () {
    if (row) {
      output.push(row)
      row = null
    }
    output.push(null)
  })

  return duplexer({ objectMode: true }, parser, output)
}

function Parser() {
  return Stream.Writable({
    objectMode: true,
    write: function (line, enc, next) {
      line = line.toString()
      var matches = line.match(/^(\w+):?/)
      if (matches) {
        this.emit('header', matches[1], line.slice(matches[1].length + 1).trim())
      } else {
        this.emit('message', line)
      }
      next()
    },
  })
}

```

执行以下脚本查看效果：

```js
var JSONStream = require('JSONStream')
var spawn = require('child_process').spawn
var split = require('split2')

spawn('git', ['log']).stdout
  .pipe(split())
  .pipe(parse())
  .pipe(JSONStream.stringify())
  .pipe(process.stdout)

```

## stream-combiner2
[`stream-combiner2`]可用来将多个`Duplex`（包括`Transform`）组合成一个`pipeline`，
返回一个`Duplex`给外界使用。

这是构造固定管道的一个非常方便的工具。

譬如前面的解析脚本，其功能只是逐行解析字段。
实际使用时，需要还需要添加`split`将输入流分隔成行，
解析后再使用`JSONStream`进行格式化。
作为一个较完整的工具，应当同时包括这三部分。

所以，我们可以使用[`stream-combiner2`]将这三个stream连接起来：

```js
var combine = require('stream-combiner2')

var parse = require('./parse')
var split = require('split2')
var JSONStream = require('JSONStream')

module.exports = log

function log() {
  return combine.obj(
    split(),
    parse(),
    JSONStream.stringify()
  )
}

```

执行以下脚本查看效果：
```js
var spawn = require('child_process').spawn
spawn('git', ['log']).stdout
  .pipe(log())
  .pipe(process.stdout)

```

这样，我们的`git log`工具才算基本完成了。

输出：
```
[
{"commit":"836fa00d60518131f017d2602ef7f75a6ebf6762","author":"zoubin <zoubin04@gmail.com>","date":"Tue Jan 26 13:32:47 2016 +0800","msg":["","    implement",""]}
,
{"commit":"f9193ee555b01f321b3650732b211549290a2ea1","author":"zoubin <zoubin04@gmail.com>","date":"Mon Jan 25 20:37:17 2016 +0800","msg":["","    duplexer2",""]}
,
{"commit":"2bb311a96276b1b1b86121e751978c7d363d1468","author":"zoubin <zoubin04@gmail.com>","date":"Mon Jan 25 18:49:19 2016 +0800","msg":["","    toc",""]}
,
{"commit":"afdce32fabdf61172be09719c5a9352130c2f4ad","author":"zoubin <zoubin04@gmail.com>","date":"Mon Jan 25 18:47:36 2016 +0800","msg":["","    tools",""]}
,
{"commit":"c926c4b3a4a74911c1730c6235491569af5102e7","author":"zoubin <zoubin04@gmail.com>","date":"Mon Jan 25 16:25:18 2016 +0800","msg":["","    browserify",""]}
,
{"commit":"6c834d79157ff831731737895e7fd4209d5d20dd","author":"zoubin <zoubin04@gmail.com>","date":"Mon Jan 25 16:10:43 2016 +0800","msg":["","    browserify transform",""]}
,
{"commit":"5afa2beea2c43d789294b4f7d64b96fff2f5065c","author":"zoubin <zoubin04@gmail.com>","date":"Mon Jan 25 15:43:48 2016 +0800","msg":["","    browserify plugin",""]}
,
{"commit":"e97b25113df74e97cb4eecf095b7f7afaeb7c46d","author":"zoubin <zoubin04@gmail.com>","date":"Mon Jan 25 15:00:29 2016 +0800","msg":["","    browserify",""]}
,
{"commit":"432fe39ff0b1d21e5c24df60823ea5c3842cf919","author":"zoubin <zoubin04@gmail.com>","date":"Mon Jan 25 14:52:24 2016 +0800","msg":["","    fix typo",""]}
,
{"commit":"cc155cbeba45bf8b6e0c82afa461fb39a03fc7bc","author":"zoubin <zoubin04@gmail.com>","date":"Mon Jan 25 14:50:19 2016 +0800","msg":["","    fix lists",""]}
,
{"commit":"62cdc59bc1106feb59b82e7e7f75b3aa3d716ee4","author":"zoubin <zoubin04@gmail.com>","date":"Mon Jan 25 14:48:37 2016 +0800","msg":["","    mode module",""]}
,
{"commit":"e334887371257abd3c86cc01049731bbf1ec8072","author":"zoubin <zoubin04@gmail.com>","date":"Sat Jan 23 14:23:39 2016 +0800","msg":["","    rm pipeline",""]}
,
{"commit":"1e533bc5b7d415d7d09b8a202037eb075f50cf8c","author":"zoubin <zoubin04@gmail.com>","date":"Sat Jan 23 14:16:42 2016 +0800","msg":["","    Refactor",""]}
,
{"commit":"754dac8f548006d86202cb691ddcc15bc3874fcf","merge":"f99ab72 4963333","author":"ZOU Bin <zoubin04@gmail.com>","date":"Wed Jan 13 17:36:40 2016 +0800","msg":["","    Merge pull request #1 from dengyaolong/master","    ","    修改错别字",""]}
,
{"commit":"4963333ef3d827b495d7bdf0ad6aad0ba382aa50","author":"dengyaolong <dengyaolong@meituan.com>","date":"Wed Jan 13 17:31:02 2016 +0800","msg":["","    修改错别字",""]}
,
{"commit":"f99ab728eec124209e4058d30823c37e2e513a4a","author":"zoubin <zoubin04@gmail.com>","date":"Wed Jan 13 16:21:09 2016 +0800","msg":["","    pipeline",""]}
,
{"commit":"53290387e05151230797e7a404a290a3accd8caa","author":"zoubin <zoubin04@gmail.com>","date":"Wed Jan 13 16:17:10 2016 +0800","msg":["","    transform",""]}
,
{"commit":"25857e35b0b732a6b9ca80b7fdf9c1b5aea08a32","author":"zoubin <zoubin04@gmail.com>","date":"Wed Jan 13 15:48:31 2016 +0800","msg":["","    pipe",""]}
,
{"commit":"6f1c4d28c99375a89b84e1b6ff7ef4f0d611cf17","author":"zoubin <zoubin04@gmail.com>","date":"Wed Jan 13 15:26:05 2016 +0800","msg":["","    highWaterMark: writable",""]}
,
{"commit":"46072fb18e48eafc88604dc32b44356e27619766","author":"zoubin <zoubin04@gmail.com>","date":"Wed Jan 13 15:07:15 2016 +0800","msg":["","    highWaterMark",""]}
,
{"commit":"a24dd7365dfaea473697f9841ce7a6d5fcae30f6","author":"zoubin <zoubin04@gmail.com>","date":"Wed Jan 13 11:02:29 2016 +0800","msg":["","    title and links",""]}
,
{"commit":"81e4fb8137319e6e2c4eca058679a5bac9412424","author":"zoubin <zoubin04@gmail.com>","date":"Wed Jan 13 10:38:47 2016 +0800","msg":["","    fix links",""]}
,
{"commit":"18f1499504e7ff9a5ab04020cfc5dc8737797be7","author":"zoubin <zoubin04@gmail.com>","date":"Wed Jan 13 10:32:01 2016 +0800","msg":["","    contents",""]}
,
{"commit":"b893c662934e22d77c4a52c15b10f723eec613d4","author":"zoubin <zoubin04@gmail.com>","date":"Wed Jan 13 10:21:47 2016 +0800","msg":["","    objectMode",""]}
,
{"commit":"f13559a35e709668410bc5d58f3da19f2216f92e","author":"zoubin <zoubin04@gmail.com>","date":"Tue Jan 12 20:15:03 2016 +0800","msg":["","    Writable",""]}
,
{"commit":"63e8d189704edb4ef19ec86296012487078eb70d","author":"zoubin <zoubin04@gmail.com>","date":"Tue Jan 12 17:23:35 2016 +0800","msg":["","    objectMode",""]}
,
{"commit":"ba7a12c73e7e998d86775c2c8d877eb298ea6146","author":"zoubin <zoubin04@gmail.com>","date":"Tue Jan 12 16:33:29 2016 +0800","msg":["","    cases when using stream is necessary",""]}
,
{"commit":"52e01c1e44eb0ec80a87bb23b366d379043aed29","author":"zoubin <zoubin04@gmail.com>","date":"Mon Jan 11 14:54:04 2016 +0800","msg":["","    readable",""]}
,
{"commit":"fdd47e19acbf8675e02fd4b9b4ce9e879a99e538","author":"zoubin <zoubin04@gmail.com>","date":"Fri Dec 11 14:40:56 2015 +0800","msg":["","    Fix broken links",""]}
,
{"commit":"28161d6deb1e8252b54bed82667cbe6251787cda","author":"zoubin <zoubin04@gmail.com>","date":"Fri Dec 11 14:36:28 2015 +0800","msg":["","    writable",""]}
,
{"commit":"e8988eb0ac2394928b1fe4c8388a4e77db3798dc","author":"ZOU Bin <zoubin04@gmail.com>","date":"Fri Dec 11 13:37:51 2015 +0800","msg":["","    Initial commit"]}
]

```

## stream-splicer
[`stream-combiner2`]虽然能将多个stream组合成一个stream，
但管道是固定的，创建好后便无法再修改其中的stream成份。
[`stream-splicer`]在此基础上，还提供了`push`, `pop`, `splice`等方法，
可方便的添加、删除`pipeline`中的stream成份。

前面的`git log`工具默认使用类似`JSON.stringify`的形式对解析出来的信息格式化，如果用户有自定义的格式化需求，如何去满足？

如果有的格式化工具还需要解析额外的字段呢？譬如，将时间、邮箱等都解析出来。

显然，如果将所有逻辑都集成到我们的工具中，这个工具会显得有点笨拙。
这里，我们使用[`stream-splicer`]来替代[`stream-combiner2`]，
既保证了工具逻辑的简练清晰，又为用户提供了非常灵活的自定义功能。

改写后的脚本

```js
var splicer = require('stream-splicer')

var parse = require('./parse')
var split = require('split2')
var JSONStream = require('JSONStream')

module.exports = log

function log() {
  var stream = splicer.obj([
    split(),
    parse(),
    JSONStream.stringify(),
  ])
  stream.plugin = function (fn) {
    fn(this)
    return this
  }
  return stream
}

```

注意，这里还额外提供了一个`plugin`方法，方便外面使用。
现在，第三方可以写各种各样的插件来满足其特殊需求，不需要再修改当前工具的代码。

使用示例：

```js
var Stream = require('stream')
var spawn = require('child_process').spawn

spawn('git', ['log']).stdout
  .pipe(
    log()
      .plugin(author)
      .plugin(date)
      .plugin(formatter)
  )
  .pipe(process.stdout)

function formatter(pipeline) {
  pipeline.pop()
  pipeline.push(Stream.Transform({
    objectMode: true,
    transform: function (row, enc, next) {
      this.push([
        row.author.name,
        'has commit',
        row.commit.slice(0, 7),
        'at',
        row.date.toISOString().slice(0, 10)
      ].join(' '))
      this.push('\n')
      next()
    },
  }))
}

function author(pipeline) {
  pipeline.splice(2, 0, Stream.Transform({
    objectMode: true,
    transform: function (row, enc, next) {
      var author = row.author
      row.author = {}
      var matched = author.match(/<(.*)>/)
      if (matched) {
        row.author.email = matched[1]
        row.author.name = author.slice(0, author.indexOf('<')).trim()
      } else {
        row.author.name = author
      }
      next(null, row)
    },
  }))
}

function date(pipeline) {
  pipeline.splice(2, 0, Stream.Transform({
    objectMode: true,
    transform: function (row, enc, next) {
      row.date = new Date(row.date)
      next(null, row)
    },
  }))
}

```

可以看到，这个使用示例中，重新解析了`author`字段和`date`字段，同时替换了原来的格式化方法。

输出

```
zoubin has commit 836fa00 at 2016-01-26
zoubin has commit f9193ee at 2016-01-25
zoubin has commit 2bb311a at 2016-01-25
zoubin has commit afdce32 at 2016-01-25
zoubin has commit c926c4b at 2016-01-25
zoubin has commit 6c834d7 at 2016-01-25
zoubin has commit 5afa2be at 2016-01-25
zoubin has commit e97b251 at 2016-01-25
zoubin has commit 432fe39 at 2016-01-25
zoubin has commit cc155cb at 2016-01-25
zoubin has commit 62cdc59 at 2016-01-25
zoubin has commit e334887 at 2016-01-23
zoubin has commit 1e533bc at 2016-01-23
ZOU Bin has commit 754dac8 at 2016-01-13
dengyaolong has commit 4963333 at 2016-01-13
zoubin has commit f99ab72 at 2016-01-13
zoubin has commit 5329038 at 2016-01-13
zoubin has commit 25857e3 at 2016-01-13
zoubin has commit 6f1c4d2 at 2016-01-13
zoubin has commit 46072fb at 2016-01-13
zoubin has commit a24dd73 at 2016-01-13
zoubin has commit 81e4fb8 at 2016-01-13
zoubin has commit 18f1499 at 2016-01-13
zoubin has commit b893c66 at 2016-01-13
zoubin has commit f13559a at 2016-01-12
zoubin has commit 63e8d18 at 2016-01-12
zoubin has commit ba7a12c at 2016-01-12
zoubin has commit 52e01c1 at 2016-01-11
zoubin has commit fdd47e1 at 2015-12-11
zoubin has commit 28161d6 at 2015-12-11
ZOU Bin has commit e8988eb at 2015-12-11

```


## labeled-stream-splicer
[`labeled-stream-splicer`]实现了[`stream-splicer`]的功能，
同时，可用名字去获取`pipeline`中的`Duplex`。

前面在操作`pipeline`时使用了下标（数字），很多时候不太方便，
可以使用[`labeled-stream-splicer`]给每个stream取个名字。

```js
var splicer = require('labeled-stream-splicer')

var parse = require('./parse')
var split = require('split2')
var JSONStream = require('JSONStream')

module.exports = log

function log() {
  var stream = splicer.obj([
    'split', [split()],
    'parse', [parse()],
    'format', [JSONStream.stringify()],
  ])
  stream.plugin = function (fn) {
    fn(this)
    return this
  }
  return stream
}

```

自定义

```js
function formatter(pipeline) {
  pipeline.get('format').splice(0, 1, Stream.Transform({
    objectMode: true,
    transform: function (row, enc, next) {
      this.push([
        row.author.name,
        'has commit',
        row.commit.slice(0, 7),
        'at',
        row.date.toISOString().slice(0, 10)
      ].join(' '))
      this.push('\n')
      next()
    },
  }))
}

function author(pipeline) {
  pipeline.get('parse').push(Stream.Transform({
    objectMode: true,
    transform: function (row, enc, next) {
      var author = row.author
      row.author = {}
      var matched = author.match(/<(.*)>/)
      if (matched) {
        row.author.email = matched[1]
        row.author.name = author.slice(0, author.indexOf('<')).trim()
      } else {
        row.author.name = author
      }
      next(null, row)
    },
  }))
}

function date(pipeline) {
  pipeline.get('parse').push(Stream.Transform({
    objectMode: true,
    transform: function (row, enc, next) {
      row.date = new Date(row.date)
      next(null, row)
    },
  }))
}

```


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
