---
title: 读《Vue.js设计与实现》- 框架设计概览
tags:
- vue
- js
- 虚拟DOM
- 编译
- 架构
---

# 第一篇 框架设计概览

## 第一章 权衡的艺术

### 命令式与声明式

本章讨论了命令式和声明式两种`范式`的差异，从结果上讲：
- 命令式更加注重过程，性能高
- 声明式更加关注结果，性能差

命令式在`理论上`可以做到极致的优化，但是用户(*在这里框架的用户是开发者，后同)需要承受巨大的心智负担和高额维护成本；
而声明式能够有效的减少心智负担，并减少维护成本，在这个用人既是用钱的社会，人是第一成本，既是声明式则运行时性能会有一定的牺牲；
框架(Vue.js)设计者就从这一切入点，想出办法将性能损耗进行最小化（注意：在声明式封装命令式的基础上，性能的损耗是必然的，所以Vuejs极力于将性能损耗降到最低）；
所以我们现在看到的Vue是一个面向用户声明式，底层用命令式实现的框架。

在这里霍春阳例举了一个声明式更新的性能消耗公式:

> 声明式更新的性能消耗 = 找出差异的性能消耗(B) + 直接修改的性能消耗(A)

Vuejs中虚拟DOM的存在意义就是为了极致的缩减B的性能消耗。

霍春阳将原生JS操作DOM的方法(createElement)、虚拟DOM、innerHTML三者进行了比较，结果如下:

创建页面时:

|  | innerHTML(模版) | 虚拟DOM | 原生JS |
| ----- | ------------ | ---------- | ------------------------ |
| 纯JS运算 | 渲染HTML字符串 | 创建新的JS对象 | 无 |
| DOM运算 | 新建所有新DOM | 新建所有新DOM | 新建所有新DOM |

更新页面时:

|  | innerHTML(模版) | 虚拟DOM | 原生JS |
| ----- | ------------ | ---------- | ------------------------ |
| 纯JS运算 | 渲染HTML字符串 | 创建新的JS对象 + Diff | 无 |
| DOM运算 | 销毁所有旧DOM<br/>新建所有新DOM | 必要的DOM更新 | 必要的DOM更新 |
| 性能因素 | 与模版大小相关 | 与数据变化量相关 | 与数据变化量相关 |

加上两个维度：心智负担、可维护性

| innerHTML(模版) | 虚拟DOM | 原生JS |
| ------------ | ---------- | ------------------------ |
| 心智负担中等 | 心智负担小 | 心智负担大 |
| 可维护性一般 | 可维护性好 | 可维护性差 |
| 性能差 | 性能不错 | 性能高 |

可见比较不是简单的下定论，而是与创建页面/更新页面，创建页面大小/变更部分大小，有关系；

最后结合心智负担和可维护性，发现虚拟DOM是个还不错的选择。


### 运行时和编译时的相关知识：

#### 纯运行时:

```javascript
const obj = {
    tag: 'div',
    children: [
        { tag: 'span', children: 'hello world' }
    ]
}
function Render(obj, root){
    const el = document.createElement(obj.tag)
    if(typeof children === 'string'){
        const text = document.createTextNode(obj.children)
        el.appendChild(text)
    }else{
        obj.children.forEach(child => Render(child, el))
    }
    root.appendChild(el)
}

```

对于用户来讲，纯运行时需要手写树形结构数据，并且不直观，心智负担和维护成本不低，Vue中这个树形结构就是虚拟DOM。

为了满足用户的需求，Vue引入了编译的手段，这也是在设计Vue.js时，Vue团队在编译时主要耗费精力的地方。

#### 编译时 + 运行时：

```html
<div>
    <span>hello world</span>
</div>
```
经过编译 Compile ⬇
```javascript
const obj = {
    tag: 'div',
    children: [
        { tag: 'span', children: 'hello world' }
    ]
}
```
这个编译时的程序就是Compiler，最后程序在用户那里就是这样呈现的：
```javascript
const html = `
<div>
    <span>hello world</span>
</div>
`
// 调用Compiler编译得到树形结构的数据对象
const obj = Compile(html)
// 调用render进行渲染
Render(obj, document.body)
```

#### 纯编译时：

```html
<div>
    <span>hello world</span>
</div>
```

经过编译 Compile ⬇

```javascript
const div = document.createElement('div')
const span = document.createElement('span')
span.innerText = 'hello world'
div.appendChild(span)
document.body.appendChild(div)
```

纯编译时框架不需要Render函数，在Compile阶段直接生产命令式代码以达到理论最大性能（Svelte），自然它也不需要虚拟DOM，但是这种做法有损灵活性，用户提供的内容必须经过编译才能使用。

Vue.js 3 在编译优化方面做到了性能甚至不输纯编译时的框架，并且保留了运行时的灵活性，优化方面的内容会在后面的章节提及。

## 第二章 框架设计的核心要素

### 提升开发体验

Vue3.0 使用了一套健壮的错误预警机制，当用户没有如预期的使用框架时，能使用户能够得到正确的、Vue层面的错误提示；而不是来自于JavaScript底层的错误提示。

> Vue.js中采用集中的错误处理机制来控制错误的输出

```javascript
//utils.js
let handleError = (e) => console.log(e)
export default {
    foo(fn) {
        callWithErrorHandling(fn)
    }
    registerErrorHandler(handleFn){
        handleError = handleFn
    }
}
function callWithErrorHandling(fn){
    try{
        fn && fn()
    }catch(e){
        handleError(e)
    }
}
// user.js
import utils from './utils.js'
utils.foo(() => {
    // ...
})
```

这样用户得到相应的错误捕获就不必自己写tryCatch实现了

另外Vue为了统一注册错误收集的用户需要提供了全局的错误处理函数: 

```javascript
import App from './App.vue'
const app = createApp(App)
app.config.errorHandler = {
    // 错误处理程序
}
```

在输出日志的方向，Vue也做了相应的开发优化，对于Vue内部声明的数据接口，如ref，如果想要在控制台直接的打印结果，在Chrome浏览器中通过设置DevTools中Preference中的Console -> “Enable custom formatters”开启自定义格式的日志输出。实现方式可以通过在源码中查找initCustomFormatter方法。

```javascript
const number = ref(0)
console.log(number) // RefImpl {__v_isShallow: false, dep: undefined, __v_isRef: true, _rawValue: 0, _value: 0} 
```
打开后

```javascript
const number = ref(0)
console.log(number) // Ref<0>
```

### 控制框架的体积

通过预定义的手段，在rollup.js中定义事先准备好的环境变量 / 或通过webpack中的DefinePlugin插件，在打包之前插入到源码中去，这样在真正编译的时候，对于失效的条件分支就会进行剪枝(也叫摇树优化: tree-shaking)

> 例如上面所讲的在开发环境中，Vue致力于给用户良好的代码提示和警告，而在生产环境这些代码不会被用到，需要被剪枝。

```javascript
// 所以在源码中看到的warn相关的代码长这样
if(__DEV__ && !res){
    warn(
        `Failed to mount app: mount target selector "${container}" returned null`
    )
}
```
```javascript
// 在打包工具眼中长这样
if(false && !res){
    warn(
        `Failed to mount app: mount target selector "${container}" returned null`
    )
}
```
最后在生产环境的代码中，直接就消失了

### 框架要做到良好的 Tree-Shaking

现在无论rollup还是webpack都支持tree-shaking，但是我们通过预定义的手段来触发tree-shaking是完全不够的，例如我们项目中完全就没有用到Transition这个内部组件，那么在生产环境，它就应该被作为dead code被处理掉，这里就需要说到tree-shaking的两个条件之一：
> 模块必须是ESM的:
> 
> 因为tree-shaking只能对静态语言结构做剪枝操作，依赖于ESM的静态结构，js本身是一个动态语言，无法tree-shaking。

```javascript
// index.js
import {foo} from 'utils.js'
foo()
// utils.js
export function foo() {
    obj && obj.foo
}
export function bar() {
    obj && obj.bar
}
```
打包
```bash
(npx) rollup index.js -f esm -o bundle.js
```
得到的结果
```javascript
//bundle.js
function foo() {
    obj && obj.foo
}
foo()
```

可以看到打包结果并不包含bar函数，

但是实际上foo也没有执行，为何没有被剪枝呢?

答案就是tree-shaking的`第二个条件`:
> 函数必须是纯函数：
> 
> 因为打包工具不能判断它是纯函数还是有副作用的函数

试想一下obj的已经被defineProperty拦截了get方法，或者本身就是一个Proxy，这个Proxy代理并监听了get夹子(trap)，那打包工具无从得知在get方法中，是否存在影响全局的副作用

```javascript
// proxy
let a = {}
let count = 0
const useProxy = (target, handler) => new Proxy(target, handler)
let handler = {
    get(target, key, receiver){
        count++
        Reflect.get(target, key, receiver)
    }
}
const obj = useProxy(a, handler)
function foo() {
    obj && obj.foo && obj.foo()
}
foo()
console.log(count) // 1
```
```javascript
// 亦或者
let a = {}
let count = 0
const useDefineProperty = (target, handler) => Object.defineProperty(target, 'foo', handler)
let handler = {
    get(target, key){
        count++
    }
}
const obj = useDefineProperty(a, handler)
function foo() {
    obj && obj.foo && obj.foo()
}
foo()
console.log(count) // 1
```

> 正因为静态的分析javascript很难，所以打包工具都会提供一个机制告诉它“这段代码没有副作用，你可以移除”

```javascript
import { foo } from 'utils.js'
/*#__PURE__*/ foo()
```

这个注释代码`/*#__PURE__*/`就是一种标记，告诉编译器，这里的代码如果没有被调用，可以不保留，没有副作用。

### 框架应该输出怎样的构建产物

为了让用户能够直接通过`<script>`标签引入并使用，Vue需要输出IIFE格式的资源，即:
```javascript
var Vue = (function(exports){
    // ...
    exports.createApp = createApp
    // ...
    return exports
})()
```

为了让用户能使用`<script type="module">`引入并使用，Vue需要输出ESM格式的资源。

需要注意的是，Vue当中ESM的资源有两种，一种是运行在浏览器端的vue.esm-broswer.js，还有一种是给打包工具使用的vue.esm-bundler.js，两者的区别在与对预定义变量`__DEV__`的处理，前者直接将`__DEV__`常量置为`true`来处理，后者将常量替换为`process.env.NODE_ENV === 'production'`表达式。

这样的好处是，用户可以通过webpack或者rollup自定义构建资源的目标环境，但是被`__DEV__`标记的这段代码最后只会出现在开发环境中。

为了兼容服务端渲染，Vue还可以输出CJS版本的代码，这套代码是在NodeJS环境中运行的。

### 特性开关

类似于`__DEV__`，在Vue.js中还有别的一些预定义的参数，这些在优化最终代码体积时有帮助。

在源码中有出现`__FEATURE_OPTIONS_API__`这个常量，在构建资源时会判断输出产物是给浏览器使用的还是给打包工具使用的，如果是给`-bundler`字样的资源，即给打包工具使用的，这个参数会变为`__VUE_OPTIONS_API__`，这个参数便成为了特性开关。

```javascript
// 判断
{
    __FEATURE_OPTIONS_API__: isBundlerESMBuild: `__VUE_OPTIONS_API__` : true
}
```

```javascript
// 在webpack中预定义特性开关
new Webpack.DefinePlugin({
     // 开启optionsApi特性
     // 即打包结果中有框架提供的兼容Vue2.x的optionsApi的代码
    __VUE_OPTIONS_API__: JSON.stringify(true)
})
```


