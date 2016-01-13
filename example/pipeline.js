var Stream = require('stream')

src()
  .pipe(toUpperCase())
  .pipe(reverse())
  .pipe(process.stdout)

function reverse() {
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

function toUpperCase() {
  return Stream.Transform({
    transform: function (buf, _, next) {
      next(null, buf.toString().toUpperCase())
    }
  })
}

function src() {
  var source = ['a', 'b', 'c']
  return Stream.Readable({
    read: function () {
      this.push(source.shift() || null)
    },
  })

}

