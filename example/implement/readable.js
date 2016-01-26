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

module.exports = ToReadable

if (require.main === module) {
  var source = function *(limit) {
    while (limit--) {
      yield Math.random()
    }
  }(1e10)

  const rs = new ToReadable(source)
  rs.pipe(process.stdout)
}

