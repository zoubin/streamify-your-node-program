# browserify
[`browserify`]是一个典型的基于stream的Node应用，其主仓库代码不到1000行，
其余逻辑都通过transform和plugin机制灵活添加，达到了架构上的“小而美”。
这里就剖析一下[`browserify`]的设计。

## 需求
朴素点说，就是要将[`Node实现的CommonJS规范`]搬到客户端来。

Node将文件内容当作函数体，构造出一个函数：
```js
function (exports, require, module, __filename, __dirname) {
// 函数体是文件内容
}

```

传入`module`, `exports`, `require`等参数进行调用，可得到`exports`作为外面`require`的返回值。

仿此，在浏览器端，针对每一个模块，也需要构造出一个这样的函数。在此它地方`require`这个模块时，执行这个函数，然后返回`module.exports`。

看一个实例：

**main.js**

```js
var math = require('./math')

console.log(
  math.abs(-1)
)

```

**math.js**

```js
exports.abs = function (v) {
  return v < 0 ? -v : v
}

```

经过[`browserify`]打包成的JS文件：

```js
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})(

{
  1:[
    function(require,module,exports){
      var math = require('./math')

      console.log(
        math.abs(-1)
      )


    },
    {"./math":2}
  ],
  2:[
    function(require,module,exports){
      exports.abs = function (v) {
        return v < 0 ? -v : v
      }


    },
    {}
  ]
},
{},
[1]
);

```

整个JS文件实际就是一个函数调用。函数的定义为：
```js
// modules are defined as an array
// [ module function, map of requireuires ]
//
// map of requireuires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the requireuire for previous bundles

(function outer (modules, cache, entry) {
    // Save the require from previous bundle to this closure if any
    var previousRequire = typeof require == "function" && require;

    function newRequire(name, jumped){
        if(!cache[name]) {
            if(!modules[name]) {
                // if we cannot find the module within our internal map or
                // cache jump to the current global require ie. the last bundle
                // that was added to the page.
                var currentRequire = typeof require == "function" && require;
                if (!jumped && currentRequire) return currentRequire(name, true);

                // If there are other bundles on this page the require from the
                // previous one is saved to 'previousRequire'. Repeat this as
                // many times as there are bundles until the module is found or
                // we exhaust the require chain.
                if (previousRequire) return previousRequire(name, true);
                var err = new Error('Cannot find module \'' + name + '\'');
                err.code = 'MODULE_NOT_FOUND';
                throw err;
            }
            var m = cache[name] = {exports:{}};
            modules[name][0].call(m.exports, function(x){
                var id = modules[name][1][x];
                return newRequire(id ? id : x);
            },m,m.exports,outer,modules,cache,entry);
        }
        return cache[name].exports;
    }
    for(var i=0;i<entry.length;i++) newRequire(entry[i]);

    // Override the current require with this new one
    return newRequire;
})

```

传给它的第一个参数即所有模块的定义，第二个参数为模块缓存，第三个参数为入口模块。

可以看到，`main.js`和`math.js`都对应了一个函数，执行这个函数，便是加载了这个模块到模块系统中。

在上面的`outer`函数中，对于入口模块会立即例执行`require`，即立即加载。

因此，输入是一系列入口模块，输出是一个如上的字符串。

## 设计
模块机制是比较独立的东西，可以抽象出来。
这便是[`browser-pack`]的功能：
给定若干模块对象，生成前面描述的JS文件。

给定入口模块后，需要解析依赖从而创建整张依赖关系图，并生成对应的模块对象。
这便是[`module-deps`]的功能。
譬如前面的例子，给了一个入口模块`main.js`，分析出它有依赖`math.js`，
从而创建了两个模块对象，输入给[`browser-pack`]。

另外，从前面的打包结果可以看到第一个参数是一个map，其键值为数字，作为模块的ID。
事实上，在生成模块对象时，是用文件路径作为ID的。
但为了不暴露路径信息，将其映射成了数字。当然，这个行为是可配置的。

当然，还有一些其它的功能。
整体看来，实际上就是将一个初始的模块对象`{ file: moduleFile }`，
变换成丰富的内容`{ file: moduleFile, id: id, source: source, deps: {} }`。

所有这一系列变换，是通过一个[`pipeline`]完成的：
```js
    var pipeline = splicer.obj([
        'record', [ this._recorder() ],
        'deps', [ this._mdeps ],
        'json', [ this._json() ],
        'unbom', [ this._unbom() ],
        'unshebang', [ this._unshebang() ],
        'syntax', [ this._syntax() ],
        'sort', [ depsSort(dopts) ],
        'dedupe', [ this._dedupe() ],
        'label', [ this._label(opts) ],
        'emit-deps', [ this._emitDeps() ],
        'debug', [ this._debug(opts) ],
        'pack', [ this._bpack ],
        'wrap', []
    ]);

```
这个`pipeline`可通过`b.pipeline`去访问，它就是一个`Duplex`对象。
写入的是初始入口模块对象（`{ file: moduleFile }`），
读出的是前面描述的JS文件格式。

这里，`b`即通过`browserify(entries, opts)`得到的`Browserify`实例。

`splicer`是模块[`labeled-stream-splicer`]暴露的接口。
`splicer.obj`创建了一个`Duplex`对象（`objectMode`），
其本质是将一系列`Duplex`对象通过`pipe`连接起来，
并且可像数组的`splice`, `push`, `pop`等操作那样去修改连接的`Duplex`对象。

譬如：



[`browserify`]: https://github.com/substack/node-browserify
[`browser-pack`]: https://github.com/substack/browser-pack
[`module-deps`]: https://github.com/substack/module-deps
[`labeled-stream-splicer`]: https://github.com/substack/labeled-stream-splicer
[`pipeline`]: pipe.md#pipeline
[`Node实现的CommonJS规范`]: node-module.md

