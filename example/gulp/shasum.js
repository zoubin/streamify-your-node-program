var Stream = require('stream')
var shasum = require('shasum')
var path = require('path')

module.exports = function () {
  return Stream.Transform({
    objectMode: true,
    transform: function (file, enc, next) {
      file.path = shasum(file.contents).slice(0, 7) + path.extname(file.path)
      next(null, file)
    },
  })
}
