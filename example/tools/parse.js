var Stream = require('stream')
var duplexer = require('duplexer2')

module.exports = parse

function parse() {
  var parser = Parser()

  var output = Stream.Readable({ objectMode: true, read: Function.prototype })

  var row

  parser.on('message', function (msg) {
    row = row || {}
    row.msg = row.msg || []
    row.msg.push(msg)
  })

  parser.on('header', function (header, value) {
    if (header === 'commit') {
      if (row) {
        output.push(row)
      }
      row = {}
    }
    if (row) {
      row[header] = value
    }
  })

  parser.once('finish', function () {
    if (row) {
      output.push(row)
      row = null
    }
    output.push(null)
  })

  return duplexer({ objectMode: true }, parser, output)
}

function Parser() {
  return Stream.Writable({
    objectMode: true,
    write: function (line, enc, next) {
      line = line.toString()
      var matches = line.match(/^(\w+):?/)
      if (matches) {
        this.emit('header', matches[1].toLowerCase(), line.slice(matches[1].length + 1).trim())
      } else {
        this.emit('message', line)
      }
      next()
    },
  })
}

if (require.main === module) {
  parseGitLog()
}

function parseGitLog() {
  var JSONStream = require('JSONStream')
  var spawn = require('child_process').spawn
  var split = require('split2')
  spawn('git', ['log']).stdout
    .pipe(split())
    .pipe(parse())
    .pipe(JSONStream.stringify())
    .pipe(process.stdout)
}

