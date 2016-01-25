var browserify = require('browserify')

browserify(__dirname + '/src/main.js')
  .bundle()
  .pipe(process.stdout)
