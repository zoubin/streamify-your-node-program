## Transform
`duplex`虽然同时可读可写，但可读与可写的缓存之间没有任何关联，
等同于创建了两个实例`readable`和`writable`。

`Transform`继承自`Duplex`，但是将内部的两个缓存给关联起来了。

简单来说，就是`write(data)`调用后，经过`_transform`的处理，下游可读取到处理后的数据。

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

此外，`Transform`还有一个`_flush`方法。
当`prefinish`事件发生时，便会调用它，预示着上游已经没有数据要写入了。

逆序：
```js
var Stream = require('stream')

var transform = createTransform()

transform.pipe(process.stdout)

transform.write('a')
transform.write('b')
transform.end('c')

function createTransform() {
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

```

输出：

```
⌘ node example/reverse.js
cba

```

