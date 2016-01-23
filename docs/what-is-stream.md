# 什么是流

>A stream is an abstract interface implemented by various objects in Node.js.

这里所谓的“流”，或`stream`，指的是Node.js中`stream`模块提供的接口。

```js
var Stream = require('stream')
var Readable = Stream.Readable
var Writable = Stream.Writable
var Transform = Stream.Transform
var Duplex = Stream.Duplex

```

这些接口提供流式的数据处理功能。

流中具体的数据格式，数据如何产生，如何消耗，需要在实现流时，由用户自己定义。

譬如`fs.createReadStream`，其返回对象便是一个`ReadStream`类的实例。
`ReadStream`继承了`Readable`，并实现了`_read`方法，从而定义了一个具体的可读流。

