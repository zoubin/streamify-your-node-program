const stream = require('stream')

const source = ['YMJj', Buffer('ZGVm'), {}]
const readable = stream.Readable({
  objectMode: true,
  encoding: 'utf8',
  read: function () {
    const data = source.length ? source.shift() : null
    this.push(data)
  }
})

readable.on('data', chunk => console.log(chunk))

