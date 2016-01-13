var Stream = require('stream')

var source = ['a', 'b', 'c']

var readable = Stream.Readable({
  read: function () {
    var data = source.shift() || null
    console.log('buffer before push', this._readableState.buffer)
    console.log('push', data)
    this.push(data)
    console.log('buffer after push', this._readableState.buffer)
    console.log('--------------')
  },
})

readable.on('data', function (data) {
  console.log('consume', data)
})

