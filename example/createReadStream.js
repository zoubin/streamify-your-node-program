var fs = require('fs')
fs.createReadStream('example/ua.txt').pipe(process.stdout)

