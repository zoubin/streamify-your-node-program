const Readable = require('stream').Readable

// 底层数据
const dataSource = ['a', 'b', 'c']

const readable = Readable()

readable.push(dataSource.shift())
readable.push(dataSource.shift())
readable.push(dataSource.shift())
readable.push(null)

readable.on('data', data => process.stdout.write(data))
// abc

