const stream = require('stream')

const source = ['YWJj', 'ZGVm']
const readable = stream.Readable({
  encoding: 'utf8',
  read: function () {
    const data = source.length ? source.shift() : null
    this.push(data, 'base64')
  }
})

readable.on('data', data => console.log(data))

