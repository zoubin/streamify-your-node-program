const stream = require('stream')

const source = ['abc', Buffer('def')]
const writable = stream.Writable({
  write: function (chunk, enc, next) {
    console.log(chunk, enc)
    next()
  }
})

writable.write(source[0], 'utf8')
writable.write(source[1], 'utf8')
writable.end()

