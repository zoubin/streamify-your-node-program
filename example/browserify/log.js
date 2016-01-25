var through = require('through2')

module.exports = function (b) {
  b.on('reset', reset)
  reset()
  
  function reset () {
    var time = null
    var bytes = 0
    b.pipeline.get('record').on('end', function () {
      time = Date.now()
    })
    
    b.pipeline.get('wrap').push(through(write, end))
    function write (buf, enc, next) {
      bytes += buf.length
      this.push(buf)
      next()
    }
    function end () {
      var delta = Date.now() - time
      b.emit('time', delta)
      b.emit('bytes', bytes)
      b.emit('log', bytes + ' bytes written ('
        + (delta / 1000).toFixed(2) + ' seconds)'
      )
      this.push(null)
    }
  }
}

