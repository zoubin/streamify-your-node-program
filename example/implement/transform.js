'use strict'
const Transform = require('stream').Transform

class ToUpperCase extends Transform {
  constructor() {
    super()
  }
  _transform(data, enc, next) {
    this.push(data.toString().toUpperCase())
    next()
  }
}

const transform = new ToUpperCase()
transform.on('data', data => process.stdout.write(data))

transform.write('hello, ')
transform.write('world!')
transform.end()

