var combine = require('stream-combiner2')

var parse = require('./parse')
var split = require('split2')
var JSONStream = require('JSONStream')

module.exports = log

function log() {
  return combine.obj(
    split(),
    parse(),
    JSONStream.stringify()
  )
}

if (require.main === module) {
  var spawn = require('child_process').spawn
  spawn('git', ['log']).stdout
    .pipe(log())
    .pipe(process.stdout)
}

