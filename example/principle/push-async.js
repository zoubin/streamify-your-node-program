const Readable = require('stream').Readable

// 底层数据
const dataSource = ['a', 'b', 'c']

const readable = Readable()
readable._read = function () {
  switch (dataSource.shift()) {
  case 'a':
    console.log('push', 'a')
    this.push('a')
    break
  case 'b':
    process.nextTick(() => {
      console.log('push', 'b')
      this.push('b')
    })
    break
  case 'c':
    console.log('push', 'c')
    this.push('c')
    break
  default:
    console.log('push', 'null')
    this.push(null)
    break
  }
}

readable.on('data', data => console.log('PRINT', data))

