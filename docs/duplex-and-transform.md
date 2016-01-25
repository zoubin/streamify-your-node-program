## Duplex
`Duplex`等同于继承了`Readable`，和`Writable`。

一个`Duplex`实例`duplex`，拥有`Readable`和`Writable`原型上的所有方法，
而且内部同时包含了`_readableState`和`_writableState`。
因此，实现了`duplex._read`便可以将它当作可读流来用，
实现了`duplex._write`便可以将它当作可写流来用。

```js
const util = require('util');
const Readable = require('_stream_readable');
const Writable = require('_stream_writable');

util.inherits(Duplex, Readable);

var keys = Object.keys(Writable.prototype);
for (var v = 0; v < keys.length; v++) {
  var method = keys[v];
  if (!Duplex.prototype[method])
    Duplex.prototype[method] = Writable.prototype[method];
}

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  process.nextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

```

从上面的实现中可以看出，`Duplex`的特性便是：既可以当作可读流来使用，又可以当作可写流来使用。

## Transform
`Transform`继承自`Duplex`，但是将内部的两个缓存给关联起来了。
简单来说，就是调用`write(data)`后，经过`_transform`的处理，下游可读取到处理后的数据。

### _transform

```js
var Stream = require('stream')

var transform = Stream.Transform({
  transform: function (buf, _, next) {
    next(null, buf.toString().toUpperCase())
  }
})

transform.pipe(process.stdout)

transform.write('a')
transform.write('b')
transform.end('c')

```

输出：

```
⌘ node example/transform.js
ABC

```

`write`方法接收到数据后，引起`_transform`方法的调用，
在数据处理完时，需要调用`next`方法。
`next`会调用`push`方法，从而将转换后的数据放入可读缓存。
下游便能读取到。

所以，上面的例子还可以写成：

```js
var Stream = require('stream')

var transform = Stream.Transform({
  transform: function (buf, _, next) {
    this.push(buf.toString().toUpperCase())
    next()
  }
})

transform.pipe(process.stdout)

transform.write('a')
transform.write('b')
transform.end('c')

```

注意，`next`的调用是必须的，用来通知这次处理已经完成，可以开始下一次的处理。

### _flush
此外，`Transform`还有一个`_flush`方法。
当`prefinish`事件发生时，便会调用它，表示上游已经没有数据要写入了，即“写端”已经结束。

```js
var Stream = require('stream')

var transform = createTransform()

transform.pipe(process.stdout)

transform.on('finish', function () {
  console.log('\nfinish')
})

transform.on('end', function () {
  console.log('\nend')
})

transform.write('a')
transform.write('b')
transform.end('c')

function createTransform() {
  var input = []
  return Stream.Transform({
    objectMode: true,
    transform: function (buf, _, next) {
      console.log('transform', buf.toString())
      input.push(buf)
      next()
    },
    flush: function (next) {
      console.log('flush')
      var buf
      while (buf = input.pop()) {
        this.push(buf)
      }
      setTimeout(() => {
        this.push('extra')
        next()
      }, 10)
    },
  })
}

```

输出：

```
⌘ node example/reverse.js
transform a
transform b
transform c
flush
cba
finish
extra
end

```

可以看出，实现的`_flush`方法在`end()`被调用后执行，然后是`finish`事件。
当`_flush`的`next`被执行时，等同于执行了可读端的`push(null)`，
进而引起`end`事件触发。

所以，上面的`flush`方法中也可以不调用`next`，而是直接`push(null)`：

```js
function createTransform() {
  var input = []
  return Stream.Transform({
    objectMode: true,
    transform: function (buf, _, next) {
      console.log('transform', buf.toString())
      input.push(buf)
      next()
    },
    flush: function () {
      console.log('flush')
      var buf
      while (buf = input.pop()) {
        this.push(buf)
      }
      setTimeout(() => {
        this.push('extra')
        this.push(null)
      }, 10)
    },
  })
}

```

**NOTE**
`_transform()` => `end()` => `flush()` => `finish` => `end` 

因此，如果要等到`Transform`工作结束，无数据可读，就监听`end`事件。
如果只是等到无数据再写入，则监听`finish`事件。

## Transform与Duplex比较
`Duplex`可同时当作`Readable`（可读端）和`Writable`（可写端）来用，
`Transform`在此基础上，将可读端与可写端的底层打通，
写入的数据会被当作`_read`调用时获取数据的源，只是数据还经历了`_transform`的处理。

实际上，`Transform`的实现便是实现了`_read`与`_write`的`Duplex`，
但它还要求实现`_transform`来做数据转换。

效果上，对于`duplex.write('a')`后，`duplex.read()`并不能读到这个`'a'`，
但`transform.write('a')`后，`transform.read()`却能读到`_transform('a')`。

