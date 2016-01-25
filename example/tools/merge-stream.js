var merge = require('merge-stream')
var Stream = require('stream')

merge(
  createReadable('aBc').pipe(toUpperCase()),
  createReadable('DeF').pipe(toLowerCase())
)
.pipe(process.stdout)

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

