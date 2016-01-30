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
  var iterable = function *(limit) {
    while (limit--) {
      yield Math.random()
    }
  }(1e10)

  const readable = new ToReadable(iterable)
  readable.on('data', data => process.stdout.write(data))
  readable.on('end', () => process.stdout.write('DONE'))
}

