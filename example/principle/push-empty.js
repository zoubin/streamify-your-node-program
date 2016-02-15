const Readable = require('stream').Readable

// 底层数据
const dataSource = ['a', '', 'c']

const readable = Readable()
readable._read = function () {
  process.nextTick(() => {
    var data
    if (dataSource.length) {
      data = dataSource.shift()
    } else {
      data = null
    }
    console.log('push', data)
    this.push(data)
  })
}

readable.on('data', data => console.log('PRINT', data))
readable.on('end', data => console.log('END'))
