const fs = require('fs')
fs.createReadStream(__dirname + '/ua.txt').pipe(process.stdout)

