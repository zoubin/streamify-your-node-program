const stream = require('stream')

const source = ['abc', Buffer('def')]
const readable = stream.Readable({
  encoding: 'utf8',
  read: function () {
    const data = source.length ? source.shift() : null
    this.push(data)
  }
})

readable.on('data', chunk => console.log(chunk))

