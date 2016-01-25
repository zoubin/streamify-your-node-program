var concat = require('concat-stream')

var writable = concat({ encoding: 'string' }, function (body) {
  console.log(body)
})

writable.write('a')
writable.write('b')
writable.write('c')
writable.end()

