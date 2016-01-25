var Stream = require('stream')

var source = ['a', 'b', 'c']

var readable = Stream.Readable({
  read: function () {
    process.nextTick(this.push.bind(this), source.shift() || null)
  },
})

readable.on('data', function (data) {
  console.log(data)
})

