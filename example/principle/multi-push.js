const Readable = require('stream').Readable

// 底层数据
const dataSource = ['a']

const readable = Readable()
readable._read = function () {
  const data = dataSource.shift()
  if (data) {
    this.push('a')
    process.nextTick(() => {
      this.push('b')
    })
  } else {
    this.push(null)
  }
}

readable.on('data', data => console.log('PRINT', data))

