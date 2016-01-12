var Stream = require('readable-stream')

var readable = createReadable()
var writable = createWritable()

readable.on('data', function (data) {
  writable.write(data)
})
readable.on('end', function (data) {
  writable.end()
})

writable.on('finish', function () {
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
      process.nextTick(this.push.bind(this), source.shift() || null)
    },
  })
}
