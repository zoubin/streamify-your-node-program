## highWaterMark
前面介绍了`Readable`与`Writable`的创建方法、使用方式，以及如何控制流中的数据类型，
其中多次提到“缓存”，这部分将探究一下这个“缓存”为何物，为什么会存在。

### Readable中的缓存
```js
var readable = Readable({ highWaterMark: highWaterMark })
var state = readable._readableState

```

先介绍两个字段：
* `state.buffer`：`Array`，每个元素对应`push(data)`中的`data`（可能进行过编码，见前面的解释）。
* `state.length`：`Number`，整个缓存的长度。
  如果是`objectMode`，与`state.buffer.length`是一样的；
  否则是`state.buffer`中字节数的总和。

本文中一开始给出的大文件处理案例，要求不能将文件内容一次性全读进内存，
所以`fs.createReadStream`创建的`Readable`对象，底层会调用`fs.read`去多次从底层文件中将数据读出，
内存中存储的便是一次读取的量。
因此，每次读取的数据需要放入缓存中，等待被消耗。

那什么时候会从底层文件中去读取一次？

简单来说，每次执行`readable.read()`时，
如果`state.length`低于`highWaterMark`，
便会执行`readable._read(highWaterMark)`从底层读取数据存入缓存中。

#### 一个同步的例子
[代码](js/highWaterMark.js)

```js
var Stream = require('stream')

var source = ['a', 'b', 'c']

var readable = Stream.Readable({
  read: function () {
    var data = source.shift() || null
    console.log('buffer before push', this._readableState.buffer)
    console.log('push', data)
    this.push(data)
    console.log('buffer after push', this._readableState.buffer)
    console.log('--------------')
  },
})

readable.on('data', function (data) {
  console.log('consume', data)
})

```

输出：

```
⌘ node example/highWaterMark.js
buffer before push []
push a
buffer after push [ <Buffer 61>  ]
--------------
buffer before push [ <Buffer 61>  ]
push b
buffer after push [ <Buffer 61>, <Buffer 62>  ]
--------------
consume <Buffer 61>
buffer before push [ <Buffer 62>  ]
push c
buffer after push [ <Buffer 62>, <Buffer 63>  ]
--------------
consume <Buffer 62>
buffer before push [ <Buffer 63>  ]
push null
buffer after push [ <Buffer 63>  ]
--------------
consume <Buffer 63>

```

在监听`data`事件时，发生以下事情：
* 将回调放入事件队列中，与正常的事件监听无异
* 调用`read(0)`，进而引起`_read`的调用。
  实际效果等同于`state.buffer.push('a')`
* 调用`flow()`，试图将缓存读空。
  效果等同于`while (read()) read()`。
* 调用`read(0)`。
  由于已调用过`push(null)`，所以会直接调用`endReadable`来结束流。

其中的`flow`环节，就是源源不断产生数据的环节。

每次调用`chunk = read()`时，先检查是否需要从底层读点数据到缓存中来
（当本次读取后，剩余的数据量小于`highWaterMark`时，便需要），
如果需要，就调用`_read(highWaterMark)`。

然后从`state.buffer`中取出一定的数据`chunk`。
`objectMode`或`flowing`模式时即为第一个元素。
如果`chunk`不为`null`，便`emit('data', chunk)`。
于是事件回调被执行，数据被消耗。

#### 一个异步的例子
[代码](js/highWaterMark-async.js)

```js
var Stream = require('stream')

var source = ['a', 'b', 'c']

var readable = Stream.Readable({
  read: function () {
    var state = this._readableState
    process.nextTick(function () {
      var data = source.shift() || null
      console.log('buffer before push', state.buffer)
      console.log('push', data)
      readable.push(data)
      console.log('buffer after push', state.buffer)
      console.log('- - - - - - - - - - - - - -')
    })
  },
})

readable.on('data', function (data) {
  console.log('consume', data)
})

```

输出：

```
⌘ node example/highWaterMark-async.js
buffer before push []
push a
consume <Buffer 61>
buffer after push []
--------------
buffer before push []
push b
consume <Buffer 62>
buffer after push []
--------------
buffer before push []
push c
consume <Buffer 63>
buffer after push []
--------------
buffer before push []
push null
buffer after push []
--------------

```

对于在`_read`中异步调用`push`而言，只要`push`前`state.buffer`为空，
便可确定当前的数据即是下一个要求的数据，所以会直接`emit('data', data)`，
因而，也便不会再写入缓存。
当然，只是这个简单的例子如此而已。

在`emit('data')`后，会立即调用`read(0)`，触发下一次的`_read`调用。
于是，数据便源源不断的产生，直到`push(null)`。

### Writable中的缓存
```js
var writable = Writable({ highWaterMark: highWaterMark })
var state = writable._writableState

```

前面解释了`Readable`中`highWaterMark`的作用：
控制底层读取的速度。

`Writable`中`highWaterMark`的作用也是控制速度：
当`state.length`大于`highWaterMark`时，`write(data)`会返回`false`，
上游可以判断这个返回值，停止往`writable`中写数据，
同时监听`drain`事件触发再继续写。

`Writable`的缓存实际是一个待写入数据队列，
`state.length`也就是这个队列的长度。
每次底层的写操作完成时，检查`state.length`，
如果为0，则有可能触发`drain`事件。

这个“有可能”，便是之前出现了`state.length`大于`highWaterMark`的情况，
外面还在等待`drain`事件。

