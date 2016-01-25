## Writable
可写流的功能是作为下游，消耗上游提供的数据。

本文中用`writable`来指代一个`Writable`实例。

### 创建与使用
与`Readable`类似，需要为`writable`实现一个`_write`方法，
来实现一个具体的可写流。

在写入数据（调用`writable.write(data)`）时，
会调用`_write`方法来处理数据。

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

或：
```js
var Stream = require('stream')

var writable = Stream.Writable()

writable._write = function (data, _, next) {
  console.log(data)
  process.nextTick(next)
}

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

**要点**
* `_write(data, _, next)`中调用`next(err)`来声明“写入”操作已完成，
  可以开始写入下一个数据。
* `next`的调用时机可以是异步的。
* 调用`write(data)`方法来往`writable`中写入数据。将触发`_write`的调用，将数据写入底层。
* 必须调用`end()`方法来告诉`writable`，所有数据均已写入。

### finish事件
与`Readable`的`end`事件类似，`Writable`有两个事件来表示所有写入完成的状况：

```js
var Stream = require('stream')

var writable = Stream.Writable({
  write: function (data, _, next) {
    console.log(data)
    next()
  },
})

writable.on('finish', function () {
  console.log('finish')
})

writable.on('prefinish', function () {
  console.log('prefinish')
})

writable.write('a', function () {
  console.log('write a')
})
writable.write('b', function () {
  console.log('write b')
})
writable.write('c', function () {
  console.log('write c')
})
writable.end()

```

输出：
```
⌘ node example/event-finish.js
<Buffer 61>
<Buffer 62>
<Buffer 63>
prefinish
write a
write b
write c
finish

```

### 小结
* `prefinish`事件。表示所有数据均已写入底层系统，即最后一次`_write`的调用，其`next`已被执行。此时，不会再有新的数据写入，缓存中也无积累的待写数据。
* `finish`事件。在`prefinish`之后，表示所有在调用`write(data, cb)`时传入的`cb`均已执行完。
* 一般监听`finish`事件，来判断写操作完成。

