var browserify = require('browserify')

browserify('src/main.js', { basedir: __dirname })
  .on('log', console.log.bind(console))
  .transform('./comment')
  .bundle()
  .pipe(process.stdout)
