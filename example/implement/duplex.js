'use strict'
const Duplex = require('stream').Duplex

class ToUpperCase extends Duplex{
  constructor() {
    super()
    this.chars = []

    this.once('finish', function () {
      this.push(null)
    })
  }

  _read() {
    if (this.chars.length) {
      this.push(this._transform(this.chars.shift()))
    }
  }

  _write(data, enc, next) {
    this.chars.push(data.toString())
    this._read()
    next()
  }

  _transform(str) {
    return str.toUpperCase()
  }
}

const duplex = new ToUpperCase()
duplex.on('data', data => process.stdout.write(data))

duplex.write('hello, ')
duplex.write('world!')
duplex.end()

