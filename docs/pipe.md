## pipe
可读流提供了一个`pipe`方法，用于连接另一个可写流。
即`pipe`方法用于连通上游和下游，使上游的数据能流到指定的下游：`readable.pipe(writable)`。
上游必须是可读的，下游必须是可写的。

### pipe的使用
有两种方法将一个可读流与一个可写流连接起来。

事件关联：

```js
var Stream = require('stream')

var readable = createReadable()
var writable = createWritable()

readable.on('data', function (data) {
  writable.write(data)
})
readable.on('end', function (data) {
  writable.end()
})

writable.on('finish', function () {
  console.log('done')
})

function createWritable() {
  return Stream.Writable({
    write: function (data, _, next) {
      console.log(data)
      next()
    },
  })
}

function createReadable() {
  var source = ['a', 'b', 'c']

  return Stream.Readable({
    read: function () {
      process.nextTick(this.push.bind(this), source.shift() || null)
    },
  })
}

```

输出：
```
⌘ node example/readable-with-writable.js
<Buffer 61>
<Buffer 62>
<Buffer 63>
done

```

还可以使用`pipe`关联：
```js
var Stream = require('stream')

var readable = createReadable()
var writable = createWritable()

readable.pipe(writable).on('finish', function () {
  console.log('done')
})

function createWritable() {
  return Stream.Writable({
    write: function (data, _, next) {
      console.log(data)
      next()
    },
  })
}

function createReadable() {
  var source = ['a', 'b', 'c']

  return Stream.Readable({
    read: function () {
      process.nextTick(this.push.bind(this), source.shift() || null)
    },
  })
}

```

可见，`pipe`方法自动处理了`data`, `end`, `write`等事件和方法，
使得关联变得更简单。

### 从push到pull
但其实`pipe`做了更多的事。

如果是前面的第一个例子，可读流的数据会毫不间断的持续写进可写流中，
而不管可写流的缓存状态如何。
这样，是达不到控制内存的效果的。

而`pipe`做了另一件更重要的事，类似于：

```js
readable.on('data', function (data) {
  var ret = writable.write(data)
  if (ret === false) {
    readable.pause()
  }
})

writable.on('drain', function () {
  readable.state.flowing = true
  flow(readable)
})

```

当`writable.write(data)`返回`false`时，表示可写流中缓存队列的长度已经到达了临界值（`highWaterMark`），
此时，需要暂停`readable`的数据输出，等待`writable`清空其缓存。

前面两个例子的差别，可用喝饮料来打个比方。

第一个例子是bottom up，一仰头，杯底朝天，饮料持续push进嘴里。可称之为push流。

第二个例子是用吸管，嘴里注满时，停一停，咽下去再继续pull。可称之为pull流。

这样一个转变，就让数据的生产、消耗形成了一个闭环。
只有当数据有一定的消耗时，才会再继续生产。

所以，使用流时，一定要确保下游正常消耗数据，否则整个流程会停滞。

## Pipeline
创建了多个流后，用`pipe`将其连接起来，便形成了一个`pipeline`。

```js
var Stream = require('stream')

src()
  .pipe(toUpperCase())
  .pipe(reverse())
  .pipe(process.stdout)

function reverse() {
  var input = []
  return Stream.Transform({
    objectMode: true,
    transform: function (buf, _, next) {
      input.push(buf)
      next()
    },
    flush: function (next) {
      var buf
      while (buf = input.pop()) {
        this.push(buf)
      }
      next
    },
  })
}

function toUpperCase() {
  return Stream.Transform({
    transform: function (buf, _, next) {
      next(null, buf.toString().toUpperCase())
    }
  })
}

function src() {
  var source = ['a', 'b', 'c']
  return Stream.Readable({
    read: function () {
      this.push(source.shift() || null)
    },
  })

}

```

输出：

```
⌘ node example/pipeline.js
CBA

```

当然，中间环节的流，必须是既可写又可读的，即`Duplex`或`Transform`。

