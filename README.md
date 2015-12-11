# stream-handbook
node-stream点滴积累。

## 这不是简介
建议先阅读：

* `[substack#stream-handbook]`
* `[stream-api]`

会有部分源码解析，加上个人理解，如有谬误，欢迎指正。

## 内容

* [Writable](docs/writable.md)

## 工具

### `[through2]`
快速创建`Transform`。

### `[concat-stream]`
创建`Writable`，合并所有输入。

### `[duplexer2]`
创建`Duplex`。

### `[stream-combiner2]`
创建`Pipeline`。
`a.pipe(b).pipe(c)`

### `[labeled-stream-splicer]`
创建`Pipeline`。

与`[stream-combiner2]`不同，这里创建的`Pipeline`可以非常方便的添加、删除`stream`。

### `[merge-stream]`
创建`Readable`。
将多个`Readable`合并。

[stream-combiner2]: https://github.com/substack/stream-combiner2
[substack#stream-handbook]: https://github.com/substack/stream-handbook
[stream-api]: https://nodejs.org/api/stream.html
[through2]: https://github.com/rvagg/through2
[concat-stream]: https://github.com/maxogden/concat-stream
[duplexer2]: https://github.com/deoxxa/duplexer2
[labeled-stream-splicer]: https://github.com/substack/labeled-stream-splicer
[merge-stream]: https://github.com/grncdr/merge-stream
