var browserify = require('browserify')
var fs = require('fs')

browserify('src/main.js', { basedir: __dirname })
  .on('log', console.log.bind(console))
  .plugin('./log')
  .bundle()
  .pipe(fs.createWriteStream(__dirname + '/bundle.js'))
