var fs = require('fs')
var split = require('split2')

fs.createReadStream(__dirname + '/ua.txt')  // 流式读取文件
  .pipe(split())                            // 分隔成行
  .pipe(createParser())                     // 逐行解析
  .pipe(process.stdout)                     // 打印

function createParser() {
  var Stream = require('stream')
  var csi = require('ansi-escape')
  var ie67 = 0
  var total = 0

  function format() {
    return csi.cha.eraseLine.escape(
      'Total: ' + csi.green.escape('%d') +
      '\t' +
      'IE6+7: ' + csi.red.escape('%d') +
      ' (%d%%)',
      total,
      ie67,
      Math.floor(ie67 * 100 / total)
    )
  }

  return Stream.Transform({
    transform: function (line, _, next) {
      total++
      line = line.toString()
      if (/MSIE [67]\.0/.test(line)) {
        ie67++
      }
      next(null, format())
    },
  })
}
