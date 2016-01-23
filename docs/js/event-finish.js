var Stream = require('stream')

var writable = Stream.Writable({
  write: function (data, _, next) {
    console.log(data)
    next()
  },
})

writable.on('finish', function () {
  console.log('finish')
})

writable.on('prefinish', function () {
  console.log('prefinish')
})

writable.write('a', function () {
  console.log('write a')
})
writable.write('b', function () {
  console.log('write b')
})
writable.write('c', function () {
  console.log('write c')
})
writable.end()

