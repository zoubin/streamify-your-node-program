var Stream = require('readable-stream')

var source = ['a', 'b', 'c']

var stream = Stream.Readable({
  read: function () {
    this.push(source.shift() || null)
  },
})

stream.on('data', function (data) {
  console.log(data)
})

