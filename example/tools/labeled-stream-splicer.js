var Stream = require('stream')
var splicer = require('labeled-stream-splicer')

var parse = require('./parse')
var split = require('split2')
var JSONStream = require('JSONStream')

module.exports = log

function log() {
  var stream = splicer.obj([
    'split', [split()],
    'parse', [parse()],
    'format', [JSONStream.stringify()],
  ])
  stream.plugin = function (fn) {
    fn(this)
    return this
  }
  return stream
}

if (require.main === module) {
  var spawn = require('child_process').spawn
  spawn('git', ['log']).stdout
    .pipe(
      log()
        .plugin(author)
        .plugin(date)
        .plugin(formatter)
    )
    .pipe(process.stdout)
}

function formatter(pipeline) {
  pipeline.get('format').splice(0, 1, Stream.Transform({
    objectMode: true,
    transform: function (row, enc, next) {
      this.push([
        row.author.name,
        'has commit',
        row.commit.slice(0, 7),
        'at',
        row.date.toISOString().slice(0, 10)
      ].join(' '))
      this.push('\n')
      next()
    },
  }))
}

function author(pipeline) {
  pipeline.get('parse').push(Stream.Transform({
    objectMode: true,
    transform: function (row, enc, next) {
      var author = row.author
      row.author = {}
      var matched = author.match(/<(.*)>/)
      if (matched) {
        row.author.email = matched[1]
        row.author.name = author.slice(0, author.indexOf('<')).trim()
      } else {
        row.author.name = author
      }
      next(null, row)
    },
  }))
}

function date(pipeline) {
  pipeline.get('parse').push(Stream.Transform({
    objectMode: true,
    transform: function (row, enc, next) {
      row.date = new Date(row.date)
      next(null, row)
    },
  }))
}

