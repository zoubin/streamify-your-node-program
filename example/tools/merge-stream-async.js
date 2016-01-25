var merge = require('merge-stream')
var Stream = require('stream')

var wait = Stream.Transform()
var merged = merge(wait)

setTimeout(function() {
  merged.add(createReadable('aBc').pipe(toUpperCase()))
}, 10)

setTimeout(function() {
  merged.add(createReadable('DeF').pipe(toLowerCase()))

  wait.end()
}, 20)

merged.pipe(process.stdout)

function createReadable(s) {
  var source = s.split('')

  return Stream.Readable({
    read: function () {
      process.nextTick(() => {
        this.push(source.shift() || null)
      })
    },
  })
}

function toUpperCase() {
  return Stream.Transform({
    transform: function (buf, enc, next) {
      next(null, buf.toString().toUpperCase())
    },
  })
}

function toLowerCase() {
  return Stream.Transform({
    transform: function (buf, enc, next) {
      next(null, buf.toString().toLowerCase())
    },
  })
}

