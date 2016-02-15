const stream = require('stream')

const source = ['YWJj', 'ZGVm']
const writable = stream.Writable({
  write: function (chunk, enc, next) {
    console.log(chunk, enc)
    next()
  }
})

writable.write(source[0], 'base64')
writable.write(source[1], 'base64')
writable.end()

