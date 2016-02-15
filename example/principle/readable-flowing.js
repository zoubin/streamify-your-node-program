const Readable = require('stream').Readable

// 底层数据
const dataSource = ['a', 'b', 'c']

const readable = Readable()
readable._read = function () {
  switch (dataSource.shift()) {
  case 'a':
    this.push('a')
    break
  case 'b':
    process.nextTick(() => {
      this.push('b')
    })
    break
  case 'c':
    this.push('c')
    break
  default:
    this.push(null)
    break
  }
}

readable.on('readable', function () {
  console.log('\nreadable')
})

readable.on('data', data => process.stdout.write('\ndata: ' + data))

