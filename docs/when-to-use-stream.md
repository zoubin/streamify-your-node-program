# 为什么使用流
**场景**：解析日志，统计其中IE6+7的数量和占比。

给定的输入是一个大约400M的文件`ua.txt`。

可能首先想到的是用`fs.readFile`去读取文件内容，再调用`split('\n')`分隔成行，
进行检测和统计。

但在第一步便会碰到问题。

```js
var fs = require('fs')
fs.readFile('example/ua.txt', function (err, body) {
  console.log(body)
  console.log(body.toString())
})

```

输出：
```
⌘ node example/readFile.js
<Buffer 64 74 09 75 61 09 63 6f 75 6e 74 0a 0a 64 74 09 75 61 09 63 6f 75 6e 74 0a 32 30 31 35 31 32 30 38 09 4d 6f 7a 69 6c 6c 61 2f 35 2e 30 20 28 63 6f 6d ... >
buffer.js:382
    throw new Error('toString failed');
    ^

Error: toString failed
    at Buffer.toString (buffer.js:382:11)
    at /Users/zoubin/usr/src/zoub.in/stream-handbook/example/readFile.js:4:20
    at FSReqWrap.readFileAfterClose [as oncomplete] (fs.js:380:3)

```

可见，在读取大文件时，如果使用`fs.readFile`有以下两个问题：
* 很可能只能得到一个`Buffer`，而无法将其转为字符串。因为`Buffer`的`size`过大，`toString`报错了。
* 必须将所有内容都获取，然后才能从内存中访问。这会占用大量内存，同时， 处理的开始时刻被推迟了。

如果文件是几个G，甚至几十个G呢？显然`fs.readFile`无法胜任读取的工作。

在这样的场景下，应当使用`fs.createReadStream`，以流的行式来读取和处理文件：

```js
// example/parseUA.js

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

```

最终结果：
```
⌘ node example/parseUA.js
Total: 2888380  IE6+7: 783730 (27%)

```

### 小结
* 大数据情况下必须使用流式处理

