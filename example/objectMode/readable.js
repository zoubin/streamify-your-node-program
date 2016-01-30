const Readable = require('stream').Readable

const readable = Readable()

readable.push('a')
readable.push('b')
readable.push(null)

readable.on('data', data => console.log(data))

