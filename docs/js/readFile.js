var fs = require('fs')
fs.readFile('example/ua.txt', function (err, body) {
  console.log(body)
  console.log(body.toString())
})

