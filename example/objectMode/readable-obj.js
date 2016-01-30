const Readable = require('stream').Readable

const readable = Readable({ objectMode: true })

readable.push('a')
readable.push('b')
readable.push({})
readable.push(null)

readable.on('data', data => console.log(data))

