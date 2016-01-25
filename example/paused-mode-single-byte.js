var Stream = require('stream')

var source = ['a', 'b', 'c']

var readable = Stream.Readable({
  read: function () {
    this.push(source.shift() || null)
  },
})

readable.on('readable', function () {
  var data
  while (data = this.read(1)) {
    console.log(data)
  }
})

