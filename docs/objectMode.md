## objectMode
在介绍`Readable`时，从例子中可以发现一个现象：
生产数据时传给`push`的`data`是字符串或`null`，
而消耗时拿到的却是`Buffer`类型。

下来探讨一下流中数据类型的问题。

在创建流时，可指定`objectMode`选项为`true`。
此时，称为一个`objectMode`流。
否则，称其为一个非`objectMode`流。

更多内容见[文档](https://nodejs.org/api/stream.html#stream_object_mode)

### 对Readable的影响
`Readable({ objectMode: true })`

这个选项将影响`push(data)`中`data`的类型，以及消耗时获得的数据的类型：
* 在非`objectMode`时，`data`只能是`String`, `Buffer`, `Null`, `Undefined`。
  同时，消耗时获得的数据一定是`Buffer`类型。
* 在`objectMode`时，`data`可以是任意类型，`null`仍然有其特殊含义。
  同时，消耗时获得的数据与`push`进来的一样。实际就是同一个引用。

所谓“缓存”，其实也就是一个数组。可以看看`readable._readableState.buffer`。

每次调用`push(data)`时，如果是`objectMode`，便直接调用`state.buffer.push(data)`。
这里，`state = readable._readableState`。

如果是非`objectMode`，会将`String`类型转成`Buffer`，再调用`state.buffer.push(chunk)`。
这里，`chunk`即转换后的`Buffer`对象。
默认会以`utf8`的编码形式进行转换。
设置方法查
[文档](https://nodejs.org/api/stream.html#stream_new_stream_readable_options)即可。
一般不需要设置。

在消耗`objectMode`流时，不管是`flowing`模式，还是`paused`模式，
都等同于调用`state.buffer.shift()`拿到数据。
保证`push`产生的数据会被一一消耗。

在消耗非`objectMode`流时，`flowing`模式仍然等同于调用`state.buffer.shift()`。
但`paused`模式则会拼接字节数，以满足`readable.read(n)`中`n`的要求。
如果`n`没指定，则会一次将`state.buffer`所有字节拼起来消耗掉。

这里看一个比较有意思的例子来说明`objectMode`与非`objectMode`的区别。

非`objectMode`下`push('')`

```js
var Stream = require('stream')

var source = ['a', '', 'c']
var readable = Stream.Readable({
  read: function () {
    var data = source.shift()
    data = data == null ? null : data
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
⌘ node example/empty-string-non-objectMode.js
data <Buffer 61>
data <Buffer 63>
end

```

`objectMode`下`push('')`

```js
var Stream = require('stream')

var source = ['a', '', 'c']
var readable = Stream.Readable({
  objectMode: true,
  read: function () {
    var data = source.shift()
    data = data == null ? null : data
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
⌘ node example/empty-string-objectMode.js
data a
data
data c
end

```

可见，非`objectMode`下直接将`push('')`给忽略了，
而`objectMode`下在消耗时能拿到这个空字符串。

（注意，非`objectMode`时`push('')`实际是会修改内部状态的，
会有一定的副作用，一般不要如此。
见[这里](https://nodejs.org/api/stream.html#stream_readable_push)）

**要点**
* `objectMode`时，可`push`任意类型的数据，消耗时会逐个消耗同样的数据
* 非`objectMode`时，只能`push`以下数据类型：`String`, `Buffer`, `Null`, `Undefined`。
  在消耗时只能拿到`Buffer`类型的数据

### 对Writable的影响
`Writable({ objectMode: true })`

这个选项将影响`write(data)`中`data`的类型，以及底层消耗时获得的数据(`_write(chunk, _, next)`中的`chunk`)的类型：
* 在非`objectMode`时，`data`只能是`String`, `Buffer`, `Null`, `Undefined`。
  同时，`chunk`一定是`Buffer`类型。
* 在`objectMode`时，`data`可以是任意类型，`null`仍然有其特殊含义。
  同时，`chunk`即`data`。

非`objectMode`：

```js
var Stream = require('stream')

var writable = Stream.Writable({
  write: function (data, _, next) {
    console.log(data)
    process.nextTick(next)
  },
})

writable.write('a')
writable.write('b')
writable.write('c')
writable.end()

```
输出：
```
⌘ node example/writable.js
<Buffer 61>
<Buffer 62>
<Buffer 63>

```

`objectMode`：

```js
⌘ node example/writable-objectMode.js
a
b
c

```

### 什么时候用objectMode
正如[文档](https://nodejs.org/api/stream.html#stream_object_mode)
中所言，Node.js核心模块没有使用`objectMode`的，只有Node.js的用户才会用到。

具体某个流是否应当设置`objectMode`，需要看其所处的上下游。

如果上游是`objectMode`，且输出的是非`String`或`Buffer`，那就必须用`objectMode`。
如果下游不是`objectMode`，就必须注意，不要输出非`String`或`Buffer`的数据。


