# Node实现的CommonJS规范
Node将JS文件当作一个模块的方法，便是将内容包到一个函数中。

示例。

**main.js**

```js
var math = require('./math')

console.log(
  math.abs(-1)
)

```

执行`node main.js`时，会通过调用`Module.runMain()`来执行`main.js`。

`Module`实则为`require('module')`，`Module.runMain()`的核心逻辑即：

```js
Module._load(process.argv[1], null, true)

```

`process.argv[1]`即`main.js`。

```js
Module._load = function(request, parent, isMain) {
  if (parent) {
    debug('Module._load REQUEST %s parent: %s', request, parent.id);
  }

  var filename = Module._resolveFilename(request, parent);

  var cachedModule = Module._cache[filename];
  if (cachedModule) {
    return cachedModule.exports;
  }

  if (NativeModule.nonInternalExists(filename)) {
    debug('load native module %s', request);
    return NativeModule.require(filename);
  }

  var module = new Module(filename, parent);

  if (isMain) {
    process.mainModule = module;
    module.id = '.';
  }

  Module._cache[filename] = module;

  var hadException = true;

  try {
    module.load(filename);
    hadException = false;
  } finally {
    if (hadException) {
      delete Module._cache[filename];
    }
  }

  return module.exports;
};

```

该函数的功能步骤是：

1. 解析文件绝对路径（`Module._resolveFilename`）
1. 检查缓存，如果有，直接返回缓存结果
1. 检查是否原生模块，如果是，则返回原生模块的结果。
  注：原生模块与外部模块不使用同一个缓存，但其加载逻辑基本上是一致的。
  所以，如果你想写一个与原生模块同名的模块，使用时可以做点手脚绕过本步骤。
  譬如`require('path/')`，这样便在`Module._resolveFilename`时不会判断为原生模块，而是正经地解析为`node_modules`下的路径，于是这一步也被绕过去了。
1. 创建`Module`对象并缓存。
1. 执行`module.load(filename)`来加载模块。
1. 返回加载结果。


```js
Module.prototype.load = function(filename) {
  debug('load %j for module %j', filename, this.id);

  assert(!this.loaded);
  this.filename = filename;
  this.paths = Module._nodeModulePaths(path.dirname(filename));

  var extension = path.extname(filename) || '.js';
  if (!Module._extensions[extension]) extension = '.js';
  Module._extensions[extension](this, filename);
  this.loaded = true;
};

```

`load`的工作就是根据文件后缀来执行对应的加载器，这里是`.js`，所以我们看看`Module._extensions['.js']`：
```js
Module._extensions['.js'] = function(module, filename) {
  var content = fs.readFileSync(filename, 'utf8');
  module._compile(internalModule.stripBOM(content), filename);
};

```

读取文件内容，然后进行编译。

```js
Module.prototype._compile = function(content, filename) {
  // remove shebang
  content = content.replace(shebangRe, '');

  // create wrapper function
  var wrapper = Module.wrap(content);

  var compiledWrapper = tryWrapper(wrapper,
                                   { filename: filename, lineOffset: 0 });
  if (global.v8debug) {
    // debug模式下的一些逻辑，此处省略不提
  }
  const dirname = path.dirname(filename);
  const require = internalModule.makeRequireFunction.call(this);
  const args = [this.exports, require, this, filename, dirname];
  return compiledWrapper.apply(this.exports, args);
};

```

`Module.wrap(content)`等同于：
```js
NativeModule.wrap = function(script) {
  return NativeModule.wrapper[0] + script + NativeModule.wrapper[1];
};

NativeModule.wrapper = [
  '(function (exports, require, module, __filename, __dirname) { ',
  '\n});'
];

Module.wrap = NativeModule.wrap;
Module.wrapper = NativeModule.wrapper;

```

上面得到的是一个字符串，经过`tryWrapper`的调用后，
便定义了一个匿名函数，接受`exports`, `require`, `module`等参数。

```js
function tryWrapper(wrapper, opts) {
  try {
    return runInThisContext(wrapper, opts);
  } catch (e) {
    internalUtil.decorateErrorStack(e);
    throw e;
  }
}

```

在得到模块函数`compiledWrapper`后，构造其接受的参数，并调用它。
如此，算是加载完了一个Node模块。

`require`函数的构造如下：

```js
Module.prototype.require = function(path) {
  assert(path, 'missing path');
  assert(typeof path === 'string', 'path must be a string');
  return Module._load(path, this);
};

function makeRequireFunction() {
  const Module = this.constructor;
  const self = this;

  function require(path) {
    return self.require(path);
  }

  require.resolve = function(request) {
    return Module._resolveFilename(request, self);
  };

  require.main = process.mainModule;

  // Enable support to add extra extension types.
  require.extensions = Module._extensions;

  require.cache = Module._cache;

  return require;
}

```

可见，`require`实际上就是`Module._load`。
此外，还暴露了模块路径解析（`Module._resolveFilename`）,
模块缓存（`Module._cache`）,
模块编译（`Module._extensions`，可重写`.js`字段）
等逻辑。

当执行`require('./math')`时，又调用`Module._load`走一遍上面描述的逻辑。

**math.js**
```js
exports.abs = function (v) {
  return v < 0 ? -v : v
}

```

