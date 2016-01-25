var Stream = require('stream')

var writable = Stream.Writable({
  objectMode: true,
  write: function (data, _, next) {
    console.log(data)
    process.nextTick(next)
  },
})

writable.write('a')
writable.write('b')
writable.write('c')
writable.end()

