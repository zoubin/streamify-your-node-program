var Stream = require('stream')
var duplexer = require('duplexer2')

var source = Stream.Readable({
  objectMode: true,
  read: function () {},
})

function push(code, n) {
  if (code === null) {
    source.push(null)
  } else {
    while (n--) {
      source.push(code)
    }
  }
}

source.pipe(morse()).pipe(process.stdout)

push(0, 0)
push(0, 2)
push(1, 3)
push(1, 3)
push(0, 2)
push(0, 2)
push(null)

function morse() {
  var parser = Parser()

  var formatter = Stream.Readable({
    objectMode: true,
    read: () => {},
  })

  parser.on('code', (code, n) => formatter.push((code ? '=' : '-').repeat(n) + '\n'))
  parser.on('finish', () => formatter.push(null))

  return duplexer({ objectMode: true }, parser, formatter)
}

function Parser() {
  var count = -1
  var code = -1
  return Stream.Writable({
    objectMode: true,
    write: function (buf, enc, next) {
      buf = buf > 0 ? 1 : 0
      if (code === -1) {
        code = buf
        count = 1
        return next()
      }

      if (buf !== code) {
        this.emit('code', code, count)
        count = 1
        code = buf
        return next()
      }

      ++count
      return next()
    },
  }).on('finish', function () {
    if (count > 0) {
      this.emit('code', code, count)
    }
  })
}

