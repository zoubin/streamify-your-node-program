var Stream = require('stream')

var readable = createReadable()
var writable = createWritable()

readable.pipe(writable).on('finish', function () {
  console.log('done')
})

function createWritable() {
  return Stream.Writable({
    write: function (data, _, next) {
      console.log(data)
      next()
    },
  })
}

function createReadable() {
  var source = ['a', 'b', 'c']

  return Stream.Readable({
    read: function () {
      var self = this
      process.nextTick(function () {
        var data = source.shift() || null
        self.push(data)
      })
    },
  })
}
