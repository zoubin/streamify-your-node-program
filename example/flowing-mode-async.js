var Stream = require('readable-stream')

var source = ['a', 'b', 'c']

var stream = Stream.Readable({
  read: function () {
    process.nextTick(this.push.bind(this), source.shift() || null)
  },
})

stream.on('data', function (data) {
  console.log(data)
})

