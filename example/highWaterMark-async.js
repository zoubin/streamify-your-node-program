var Stream = require('stream')

var source = ['a', 'b', 'c']

var readable = Stream.Readable({
  read: function () {
    var state = this._readableState
    process.nextTick(function () {
      var data = source.shift() || null
      console.log('buffer before push', state.buffer)
      console.log('push', data)
      readable.push(data)
      console.log('buffer after push', state.buffer)
      console.log('--------------')
    })
  },
})

readable.on('data', function (data) {
  console.log('consume', data)
})

