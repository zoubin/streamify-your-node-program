var Stream = require('readable-stream')

var source = ['a', 'b', 'c']

var stream = Stream.Readable({
  read: function () {
    this.push(source.shift() || null)
  },
})

stream.on('readable', function () {
  var data
  while (data = this.read(1)) {
    console.log(data)
  }
})

