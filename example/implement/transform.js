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

