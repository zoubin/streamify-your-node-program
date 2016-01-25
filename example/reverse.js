var Stream = require('stream')

var transform = createTransform()

transform.pipe(process.stdout)

transform.on('finish', function () {
  console.log('\nfinish')
})

transform.on('end', function () {
  console.log('\nend')
})

transform.write('a')
transform.write('b')
transform.end('c')

function createTransform() {
  var input = []
  return Stream.Transform({
    objectMode: true,
    transform: function (buf, _, next) {
      console.log('transform', buf.toString())
      input.push(buf)
      next()
    },
    flush: function (next) {
      console.log('flush')
      var buf
      while (buf = input.pop()) {
        this.push(buf)
      }
      setTimeout(() => {
        this.push('extra')
        next()
      }, 10)
    },
  })
}

