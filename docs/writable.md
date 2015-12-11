# Writable
`Writable`和“可写流”在本文中指的均是`require('stream').Writable`。

## `pull`设计
`Writable`是数据的消耗方，即流的下游。
流的设计，在于让下游能将其消耗数据的情况反馈给上游，影响上游数据的产生。
即让上游感受下游的压力，从而控制数据产生的节奏，使之与下游消耗的节奏相协调。

这样，上游便不需要将所有数据一次性生产出来，而是按需生产。

从某种意义上来说，是下游在控制上游的数据生产，即`pull`数据。
而非流的设计，则通常是上游给下游`push`数据，它不关心下游消耗的速度，下游必须自己缓存处理不了的数据。

譬如，需要将一个数组传给下游，则上游逻辑可能是这样的：

```javascript
var source = [1, 2, 3, 4, 5]
source.forEach(function (data) {
  consumer.write(data)
})
consumer.end()

```

为了让上游感受下游的压力，可以修改上游的逻辑：

```javascript
var source = [1, 2, 3, 4, 5]

;(function write() {
  var data = source.shift()

  if (!data) return consumer.end()

  var okToWriteMore = consumer.write(data)
  if (okToWriteMore) {
    write()
  } else {
    consumer.on('readyToWriteMore', write)
  }
})()

```

