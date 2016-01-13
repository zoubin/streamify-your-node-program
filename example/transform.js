var Stream = require('stream')

var transform = Stream.Transform({
  transform: function (buf, _, next) {
    next(null, buf.toString().toUpperCase())
  }
})

transform.pipe(process.stdout)

transform.write('a')
transform.write('b')
transform.end('c')

