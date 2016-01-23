var Stream = require('stream')

var source = ['a', 'b', 'c']

var readable = Stream.Readable({
  read: function () {
    this.push(source.shift() || null)
  },
})

readable.on('data', function (data) {
  console.log(data)
})

