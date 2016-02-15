const Readable = require('stream').Readable

// 底层数据
const dataSource = ['a', 'b', 'c']

const readable = Readable()
readable._read = function () {
  process.nextTick(() => {
    const data = dataSource.shift()
    console.log('push', data || null)
    if (data) {
      this.push(data)
    } else {
      this.push(null)
    }
  })
}

readable.pause()
readable.on('data', data => console.log('PRINT', data))

readable.on('readable', function () {
  while (null !== readable.read()) ;
})
