const fs = require('fs')
fs.readFile(__dirname + '/ua.txt', function (err, body) {
  console.log(body)
  console.log(body.toString())
})

