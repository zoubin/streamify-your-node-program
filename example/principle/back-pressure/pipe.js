const stream = require('stream')

var c = 0
const readable = stream.Readable({
  highWaterMark: 2,
  read: function () {
    process.nextTick(() => {
      var data = c < 6 ? String.fromCharCode(c + 65) : null
      console.log('push', ++c, data)
      this.push(data)
    })
  }
})

const writable = stream.Writable({
  highWaterMark: 2,
  write: function (buf, enc, next) {
    console.log('write', buf)
  }
})

readable.pipe(writable)

