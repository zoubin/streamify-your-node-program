var Stream = require('stream')

var transform = createTransform()

transform.pipe(process.stdout)

transform.write('a')
transform.write('b')
transform.end('c')

function createTransform() {
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

