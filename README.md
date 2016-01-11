# Node Stream
对[Node.js](https://nodejs.org/)中
[stream](https://nodejs.org/api/stream.html)模块的学习积累和理解。

## 什么是流
>A stream is an abstract interface implemented by various objects in Node.js.

## 为什么使用流
* 内存占用少
* 提前响应
* 统一的接口设计。Do one thing and do it well.
* 灵活的插件机制。[`gulp`]的插件机制, [`browserify`]的插件机制等等。

## Readable

### 两种使用模式
可读流通过`push`方法产生数据，存入`stream`的缓存中。
下游通过监听`data`事件或通过调用`read`方法，从缓存中获取数据进行消耗。

可以在`flowing`或`paused`模式去使用可读流。

#### flowing模式
在`flowing`模式下，`stream`的数据会持续不断的生产出来，
每个数据都会触发一次`data`事件，通过监听该事件来获得数据。

以下条件均可以使`stream`进入`flowing`模式：
* 调用`resume`方法
* 如果之前未调用`pause`方法进入`paused`模式，则监听`data`事件也会调用`resume`方法。
* `stream.pipe(writable)`。`pipe`中会监听`data`事件。

[例子](example/flowing-mode.js)：

```js
var Stream = require('readable-stream')

var source = ['a', 'b', 'c']

var stream = Stream.Readable({
  read: function () {
    this.push(source.shift() || null)
  },
})

stream.on('data', function (data) {
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

通常，并不直接监听`data`事件去消耗流，而是通过[`pipe`](#pipe)方法去消耗。

#### paused模式
在`paused`模式下，通过`stream.read`去获取数据。

以下条件均可使`stream`进入`paused`模式：
* 流创建完成，即初始状态
* 在`flowing`模式下调用`pause`方法
* 通过`unpipe`移除所有下游

除了初始状态外，很少会在`paused`模式下使用流。
一般不会调用`pause`方法或是`unpipe`方法从`flowing`模式切换至`paused`模式。

[例子](example/paused-mode.js)：

```js
var Stream = require('readable-stream')

var source = ['a', 'b', 'c']

var stream = Stream.Readable({
  read: function () {
    this.push(source.shift() || null)
  },
})

stream.on('readable', function () {
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

同样，`push`的是`String`和`null`，获得的是`Buffer`。

`readable`事件表示流中产生了新数据，或是到了流的尽头。
`read(n)`时，会从缓存中试图读取相应的字节数。
当`n`未指定时，会一次将缓存中的字节全部读取。

如果在`flowing`模式下调用`read()`，不指定`n`时，会逐个元素地将缓存读完，
而不像`paused`模式会一次全部读取。

## pipe
`pipe`方法用于连通上游和下游，使上游的数据能流到指定的下游：`upstream.pipe(downstream)`。
上游必须是可读的，下游必须是可写的。

### 工作原理

#### 使数据从上游流向下游
监听`upstream`的`data`事件，将获得的数据写入`downstream`。

当数据耗尽时，给下游结束信号（即自动调用`downstream.end()`，可通过`pipe`的第二个参数修改这个行为）。

#### 响应下游反馈
前面一步中数据的生产速度取决于上游，但是下游的消耗速度不一定跟得上，
未能及时消耗的数据便会存储至`downstream`的缓存中。
如果不做任何处理，这个缓存可能会快速膨胀，耗掉大量内存，下游的压力就变得很大。

所以，需要将下游的消耗情况反馈给上游，在必要的时候让上游暂停数据的生产：

在调用`downstream.write(data)`时，如果返回`false`（表示`downstream`缓存已到临界点），
便调用`upstream.pause()`，使上游进入`paused`模式，暂停数据的生产，同时等待下游的继续信号（即监听`downstream`的`drain`事件），
一旦

正是因为这个反馈的功能的存在，所以很多情况下推荐直接使用`pipe`方法去连接两个流。

### 使用案例
`pipe`最简单的使用情况便是：

```js
a.pipe(b).pipe(c)

```

这种链式写法之所以正确，是因为`pipe`方法会返回下游的`stream`对象。
所以，当下游（如此处的`b`）是一个既可写双可读的流（如`Transform`或`Duplex`）时，
便可以链起来了。

#### 多个下游
从前面的原理介绍中，可以知道，`pipe`会通过监听`data`事件的方式，
在`flowing`模式下消耗上游的数据。
所以，我们还可以这样：

```js
a.pipe(b)
a.pipe(c)

```

这样，`a`产生的数据会出来两份，分别给两个下游`b`和`c`。

这里需要注意的是：
* `b`或`c`中有一个要求暂停时，`a`便会暂停。
* 所谓两份数据，在非字符串类型的情况下，实际是一份数据的两份引用。

#### 多个上游
自然，还可以这样：

```js
a.pipe(c)
b.pipe(c)

```

不过实际上不会这么用。前面在原理中介绍过，
`pipe`在上游结束时会自动调用下游的`end`方法。
当`c`被`a`结束时，`b`便不能再往`c`中写数据了（这是`Writable`的特性）。

但这种合并多个流的需求是真实存在的。可以这样去做：
```js
a.pipe(c, { end: false })
b.pipe(c, { end: false })

a.once('end', remove)
b.once('end', remove)

```

不让上游结束下游，同时维护一下还未结束的上游数目，
减少到为0时，再结束下游。

这个便是[`merge-stream`]这个工具所做的事。

```js
merge(a, b).pipe(c)

```

还可能碰到一种情况，即上游数是动态增加的。
可以这么使用：

```js
var wait = require('stream').PassThough()
var upstream = merge(wait)

upstream.pipe(c)

// 异步添加a作为上游
process.nextTick(upstream.add.bind(upstream), a)

// 异步添加b作为上游
process.nextTick(upstream.add.bind(upstream), b)

// 确定不会再增加上游时
process.nextTick(wait.end.bind(wait))

```

由于合并多个上游得到的`upstream`要等所有上游结束，
自己才会结束，所以便可以通过添加一个空的`stream`来控制`upstream`的结束时机。


## objectMode
创建流时可以提供`objectMode`选项，
如果为真的话，流中的数据便可以是任意类型，
即`push`了怎样的数据，下游获取到的便是怎样的数据，
不会做任何编码转换。

#### 普通模式的Readable stream

```js
var Stream = require('stream')

// options.objectMode不为真
var normalModeRs = Stream.Readable(options)

normalModeRs.push(data, encoding)

```

最重要的特性：

`data`的类型只能是`Buffer`, `String`, `Null`, `Undefined`其中之一。

`data`会经过过编码，再存入`stream`的内部缓存，
下游消耗数据时，从缓存中取。

所以，


`encoding`默认为`utf8`（可通过`options.defaultEncoding`设置，一般无必要）

如果`data`为`String`类型，在存入内部缓存时


stream中流动的数据默认只能是以下几种类型：
* `Buffer`
* `String`
* `null`
* `undefined`

也就是说，
在创建`Readable`调用`push`方法提供数据时，
或者是往`Writable`中`write`数据时，
只能接受以上类型的数据。

默认情况下，都会

### writable
* `objectMode`的含义
* `highWaterMark`的含义
* `.write()`返回值的含义
* `.end()`的含义
* 事件`drain`、`finish`、`prefinish`的含义

### readable
* flowing mode, paused mode
* `objectMode`的含义
* `highWaterMark`的含义
* `.read()`返回值的含义
* `.push()`的含义
* `.pipe()`, `unpipe()`的含义
* 事件`data`、`readable`、`end`的含义


[`stream-combiner2`]: https://github.com/substack/stream-combiner2
[`substack#stream-handbook`]: https://github.com/substack/stream-handbook
[`stream-api`]: https://nodejs.org/api/stream.html
[`through2`]: https://github.com/rvagg/through2
[`concat-stream`]: https://github.com/maxogden/concat-stream
[`duplexer2`]: https://github.com/deoxxa/duplexer2
[`labeled-stream-splicer`]: https://github.com/substack/labeled-stream-splicer
[`merge-stream`]: https://github.com/grncdr/merge-stream
[`gulp`]: https://github.com/gulpjs/gulp
[`browserify`]: https://github.com/substack/node-browserify
