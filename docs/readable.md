## Readable
可读流的功能是作为上游，提供数据给下游。

本文中用`readable`来指代一个`Readable`实例。

### 如何创建
可读流通过`push`方法产生数据，存入`readable`的缓存中。
当调用`push(null)`时，便宣告了流的数据产生的结束。

正常情况下，需要为流实例提供一个`_read`方法，在这个方法中调用`push`产生数据。
既可以在同一个tick中（同步）调用`push`，也可以异步的调用（通常如此）。

在需要数据时，流内部会自动调用`_read`方法来往缓存中添加数据。

```js
var Stream = require('stream')

var readable = Stream.Readable()

var source = ['a', 'b', 'c']

readable._read = function () {
  this.push(source.shift() || null)
}

```

或
```js
var Stream = require('stream')

var source = ['a', 'b', 'c']
var readable = Stream.Readable({
  read: function () {
    this.push(source.shift() || null)
  },
})

```

#### end事件
在**数据被消耗完**时，会触发`end`事件。
所谓“消耗完”，需要满足两个条件：
* 已经调用`push(null)`，声明不会再有任何新的数据产生
* 缓存中的数据也被读取完

```js
var Stream = require('stream')

var source = ['a', 'b', 'c']
var readable = Stream.Readable({
  read: function () {
    var data = source.shift() || null
    console.log('push', data)
    this.push(data)
  },
})

readable.on('end', function () {
  console.log('end')
})

readable.on('data', function (data) {
  console.log('data', data)
})

```

输出：
```
⌘ node example/event-end.js
push a
push b
data <Buffer 61>
push c
data <Buffer 62>
push null
data <Buffer 63>
end

```

**要点**
* 必须调用`push(null)`来结束流，否则下游会一直等待。
* `push`可以同步调用，也可异步调用。
* `end`事件表示可读流中的数据已被完全消耗。

### 如何使用
下游通过监听`data`事件（`flowing`模式）或通过调用`read`方法（`paused`模式），
从缓存中获取数据进行消耗。

#### flowing模式
在`flowing`模式下，`readable`的数据会持续不断的生产出来，
每个数据都会触发一次`data`事件，通过监听该事件来获得数据。

以下条件均可以使`readable`进入`flowing`模式：
* 调用`resume`方法
* 如果之前未调用`pause`方法进入`paused`模式，则监听`data`事件也会调用`resume`方法。
* `readable.pipe(writable)`。`pipe`中会监听`data`事件。

[例子](js/flowing-mode.js)：

```js
var Stream = require('stream')

var source = ['a', 'b', 'c']

var readable = Stream.Readable({
  read: function () {
    this.push(source.shift() || null)
  },
})

readable.on('data', function (data) {
  console.log(data)
})

```

输出结果：

```
⌘ node example/flowing-mode.js
<Buffer 61>
<Buffer 62>
<Buffer 63>

```

通常，并不直接监听`data`事件去消耗流，而是通过[`pipe`](pipe.md)方法去消耗。

#### paused模式
在`paused`模式下，通过`readable.read`去获取数据。

以下条件均可使`readable`进入`paused`模式：
* 流创建完成，即初始状态
* 在`flowing`模式下调用`pause`方法
* 通过`unpipe`移除所有下游

除了初始状态外，很少会在`paused`模式下使用流。
一般不会调用`pause`方法或是`unpipe`方法从`flowing`模式切换至`paused`模式。

[例子](js/paused-mode.js)：

```js
var Stream = require('stream')

var source = ['a', 'b', 'c']

var readable = Stream.Readable({
  read: function () {
    this.push(source.shift() || null)
  },
})

readable.on('readable', function () {
  var data
  while (data = this.read()) {
    console.log(data)
  }
})

```

输出结果：

```
⌘ node example/paused-mode.js
<Buffer 61 62>
<Buffer 63>

```

`readable`事件表示流中产生了新数据，或是到了流的尽头。
`read(n)`时，会从缓存中试图读取相应的字节数。
当`n`未指定时，会一次将缓存中的字节全部读取。

如果在`flowing`模式下调用`read()`，不指定`n`时，会逐个元素地将缓存读完，
而不像`paused`模式会一次全部读取。

