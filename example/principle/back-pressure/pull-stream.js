const stream = require('stream')

var c = 0
const readable = stream.Readable({
  highWaterMark: 2,
  read: function () {
    process.nextTick(() => {
      var data = c < 26 ? String.fromCharCode(c++ + 97) : null
      console.log('push', data)
      this.push(data)
    })
  }
})

const transform = stream.Transform({
  highWaterMark: 2,
  transform: function (buf, enc, next) {
    console.log('transform', buf)
    next(null, buf)
    //next()
  }
})

readable.pipe(transform)
