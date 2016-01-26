## 实现

### Readable
ES5方式
```js
var Readable = require('stream').Readable
var util = require('util')

util.inherits(MyReadable, Readable)

function MyReadable() {
  Readable.call(this, { objectMode: true })
}

MyReadable.prototype._read = function() {
}


```

ES6方式
```js
import { Readable } from 'stream'

class MyReadable extends Readable {
  construct() {
    super({ objectMode: true })
  }
  _read() {
  }
}

```

不过Node 5.x.x还不支持ES6的模块机制（`import`），可使用Node的模块系统：
```js
'use strict'
var Readable = require('stream').Readable

class ToReadable extends Readable {
  constructor(iterable) {
    super()
    this.iterable = new function *() {
      yield * iterable
    }
  }
  _read() {
    const res = this.iterable.next()
    if (res.done) {
      this.push(null)
    } else {
      this.push(res.value + '\n')
    }
  }
}

var source = function *(limit) {
  while (limit--) {
    yield Math.random()
  }
}(1e10)

const rs = new ToReadable(source)
rs.pipe(process.stdout)

```

上面的代码在Node 4及以上应当是可以工作的。

### Writable
```js
'use strict'
var Writable = require('stream').Writable

class PrintUpperCase extends Writable {
  constructor() {
    super()
  }
  _write(buf, enc, next) {
    process.stdout.write(buf.toString().toUpperCase())
    process.nextTick(next)
  }
}

process.stdin.pipe(new PrintUpperCase())

```

### Transform
下面的例子展示了两种常见用法。

```js
'use strict'
var Transform = require('stream').Transform
var morse = require('morse')

class Morsify extends Transform {
  constructor() {
    super()
  }
  _transform(buf, enc, next) {
    const word = buf.toString().toUpperCase()
    this.push(morse.encode(word) + '\n\n')
    next()
  }
}

process.stdin
  .pipe(Transform({
    objectMode: true,
    transform: function (buf, enc, next) {
      next(null, buf.toString().replace(/\n/g, ''))
    }
  }))
  .pipe(new Morsify())
  .pipe(process.stdout)

```

