## Duplex
有了对`Readable`和`Writable`的理解，`Duplex`便非常容易了。

`Duplex`其实等同于继承了`Readable`，和`Writable`。

一个`Duplex`实例`duplex`，拥有`Readable`和`Writable`原型上的所有方法，
而且内部同时包含了`_readableState`和`_writableState`。
因此，实现了`duplex._read`便可以将它当作可读流来用，
实现了`duplex._write`便可以将它当作可写流来用。

