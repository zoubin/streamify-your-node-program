var sink = require('sink-transform')
var Stream = require('stream')

createReadable('abc')
  .pipe(sink.str(function (body, next) {
    this.push(body.toUpperCase())
    next()
  }))
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

