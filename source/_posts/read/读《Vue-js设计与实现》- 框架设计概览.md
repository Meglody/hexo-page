---
title: 读《Vue.js设计与实现》- 框架设计概览
tags:
- vue
- js
- 虚拟DOM
- 编译
- 架构
---

> 了解大型框架要从读源码开始。
> 
> 了解源码设计与实现思想要从框架的设计和参与者的书本开始。

<!-- more -->

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

### 良好的typescript支持

> 其实就一句话，使用TS编写代码与对TS类型支持友好是两码事，看例子：

```typescript
function foo(val: any) {
    return val
}
const res = foo(0) // const res: any
```

```typescript
function foo<T>(val: T) {
    return val
}
const res = foo(0) // const res: 0
```

Vue为做到完善的TS类型支持，做了很大的努力，具体可以搜索`'runtime-core/src/apiDefineComponent.ts'`文件


## 第三章 Vue.js 3 的设计思路

### 声明式的描述UI

Vue.js 3 是一个声明式的UI框架，如果让我们自己设计一个声明式的UI框架，我们自己得先知道前端页面都设计哪些内容:

- DOM元素：例如div标签、a标签
- 属性: a标签上的href属性，id、class属性
- 事件: click、keydown
- 元素的层级结构: DOM树的承接结构，子节点、父节点

> 拿Vue.js 3 的模版语法来说

```html
<div @click="handler" class="foo" :id="app">
    hello wolrd
</div>
```

- 使用和WHATWG规范的HTML标签一致的方式来描述DOM元素以及层级嵌套关系: `<div> hello world </div>`
- 使用与HTML标签一致的方式描述属性: `<div class="foo"></div>`
- 使用`:`或`v-bind`来描述动态绑定的属性: `<div :id="app"></div>`
- 使用`@`或`v-on`来描述事件: `<div @click="handler"></div>`

可以看到用户不在需要自己手动输入命令式代码绑定事件和属性，只用之前学习HTML的成本就能很轻松的融会贯通，这也是Vue自称渐进式框架的一个原因，学习成本是渐进式的。

除了使用`模版`语言之外，Vue.js 3 还支持使用javascript对象(即`虚拟DOM`)来描述UI:

```javascript
const title = {
    tag: 'h1',
    props: {
        onClick: handler
    },
    children: [
        {
            tag: 'span',
            children: 'hello world'
        }
    ]
}
```

这也是Vue.js 3 声明式UI`灵活性`的一点体现，使用JS对象(`虚拟DOM`)来描述你甚至可以这么写:

```javascript
let level = 5
const title = {
    tag: `h${level}`,
    children: level
}
```
用模版语句就像这样:  
```html
<h1 v-if="level === 1">1</h1>
<h1 v-else-if="level === 2">2</h1>
<h1 v-else-if="level === 3">3</h1>
<h1 v-else-if="level === 4">4</h1>
<h1 v-else-if="level === 5">5</h1>
<!-- ... -->
```

直接写`虚拟DOM`这种方式少了一个编译模版的过程，`*但是模版享受的优化体验(shapeFlag/patchFlag)，需要自己去实现(*自己的理解, 不一定正确, 后同)`


不过真正在Vue.js 3 中写虚拟DOM，是通过工具函数`h()`来写的，`h`所做的事情，其实就是简化对象的书写方式，其生产的结果就是我们上面写的JS对象:

```javascript
export default {
    render() {
        return h('h1', { onClick: handler }, 1)
    }
}
```
同：
```javascript
export default {
    render() {
        return {
            tag: 'h1',
            props: {
                onClick: handler
            },
            children: 1
        }
    }
}
```

所以虚拟DOM和渲染函数其实也都没这么神秘, 渲染函数即是render，要渲染一个组建的内容时，渲染器会调用这个render拿到虚拟DOM，就可以把组件的内容渲染出来了。


### 初识渲染器

渲染器即是把`虚拟DOM`变成`真实DOM`并渲染到浏览器里的函数，先写一段虚拟DOM对象:

```javascript
const vnode = {
    tag: 'h1',
    props: {
        onClick: alert('hello')
    },
    children: 'click me'
}
```

实现一个最简易的渲染器:

```javascript
function renderer(vnode, root) {
    const el = document.createElement(vnode.tag)
    for(const key in vnode.props) {
        if(/^on/.test(key)){
            el.addEventListener(
                key.substr(2).toLowerCase(),
                vode.props[key]
            )
        }
    }
    if(typeof vnode.children === 'string') {
        const text = document.createTextNode(vnode.children)
        el.appendChild(text)
    }else if(Array.isArray(vnode.children)) {
        vnode.children.forEach(child => renderer(child, el))
    }
    root.appendChild(el)
}
```

这里的renderer函数接收两个参数:

- vnode: 虚拟DOM对象
- container: 一个真实的DOM元素，作为挂载容器，渲染器会把渲染出的真实DOM挂载在该容器下。

```javascript
renderer(vnode, document.body)
```

这时浏览器就能运行这段代码了，渲染出'click me'文本，点击文本会弹出一个alert。

> 这些只是在创建节点阶段的，渲染器的精髓都在更新节点的阶段。在之后的渲染器Diff部分会详细看。

### 组件的本质

虚拟DOM就是用来描述真实DOM的JS对象，那么Vue中的组件又是什么呢？

> 其实虚拟DOM还能够描述组件，组件实际就是一组DOM元素的封装。

```javascript
const MyComponent = function () {
    return {
        tag: 'div',
        props: {
            onClick: () => alert('hello')
        },
        children: 'click me'
    }
}
```

可以看到，组件的返回值也是虚拟DOM，搞清楚组件的本质就可以用虚拟DOM描述组件了, 我们可以用虚拟DOM中的tag属性存储组件函数:

```javascript
const vnode = {
    tag: MyComponent
}
```

就像`tag: 'div'`用来描述`<div>`标签一样，`tag: Component`用来描述组件，渲染器需要一个支持组件的能力，所以要将前面写过的renderer做个修改。

```javascript
function renderer (vnode, container) {
    if(typeof vnode.tag === 'string'){
        // 渲染原生标签元素
        mountElement(vnode, container)
    }else if (typeof vnode.tag === 'function'){
        // 渲染组件
        mountComponent(vnode, container)
    }
}
function mountElement(vnode, container){
    const el = document.createElement(vnode.tag)

    for(const key in vnode.props){
        if(/^on/.test(key)){
            el.addEventListener(
                key.substr(2).toLowerCase(),
                vnode.props[key]
            )
        }
    }

    if(typeof vnode.children === 'string'){
        const text = document.createTextNode(vnode.children)
        el.appendChild(text)
    }else if(Array.isArray(vnode.children)){
        vnode.children.forEach(child => renderer(child, el))
    }

    container.appendChild(el, container)
}
function mountComponent(vnode, container) {
    // 直接调用组件函数，返回虚拟DOM
    const subtree = vnode.tag()
    // 递归调用renderer渲染subtree
    renderer(subtree, container)
}
```

除了函数式组件，我们也能使用一个对象来代表组件，该对象有个render函数，其返回值代表组件要渲染的内容: 

```javascript
const MyComponent = {
    render() {
        return {
            tag: 'div',
            props: {
                onClick: () => alert('hello')
            },
            children: 'click me'
        }
    }
}
```

针对这种情况也需要修改渲染器的判断条件: 

```javascript
// renderer
function renderer (vnode, container) {
    if(typeof vnode.tag === 'string') {
        mountElement(vnode, container)
    }else if (typeof vnode.tag === 'object'){
        mountComponent(vnode, container)
    }
}
// mountComponent
function mountComponent (vnode, container) {
    const subtree = vnode.tag.render()
    renderer(subtree, container)
}
```

> Vue中的有状态组件就是用对象结构来表达的，无状态组件则是用函数来表达的。

> (*Vue 2.\*中的functional组件在Vue 3.\*中已经无需再做标记，因为在 Vue 3.\* 中，所有的函数式组件都是用普通函数创建的，性能几乎无差异)


### 模版工作原理

不论我们使用虚拟DOM(渲染函数)或是template模版写单文件组件，都是属于声明式的描述UI，Vue中模版是如何变为虚拟DOM的，有关这部分会在后续的编译器详解，这里只要了解大致步骤。

```html
<div @click="handler">click me</div>
```
与直接手写:
```javascript
render(){
    return h('div', { onClick: handler }, 'click me')
}
```
其实是一样的，只是后者少了html编译模版的过程，对于一个组件来说，它要渲染的内容最终都是通过渲染函数`render`来描述的。

完整示例：

```html
<template>
    <div @click="handler">click me</div>
</template>
<script>
export default {
    data: {/* ... */},
    method: {
        handler: () => {/* ... */}
    }
}
</script>
```

会被编译成:

```javascript
export default {
    data: {/* ... */},
    method: {
        handler: () => {/* ... */}
    },
    render(){
        return h('div', { onClick: handler }, 'click me')
    }
}
```

其结果就是一个JS对象，里面含有一个render函数，就如我们上文所说的组件的本质一样，再编译成虚拟DOM交由渲染器渲染。


### Vue.js 是各个模块组成的有机整体

组件的实现依赖于`渲染器`，模版的编译依赖于`编译器`，且编译后生成的代码是根据渲染器和虚拟DOM的设计决定的，因此Vue.js各个模块之间是互相关联、互相制约的，共同构成一个有机整体。

假设有个模版:

```html
<div id="foo" :class="cls"></div>
```

根据上文介绍，我们知道编译器会把这段代码编译成渲染函数:

```javascript
render(){
    return h('div', { id: 'foo', class: cls })
}
```

经过工具函数`h`之后:
```javascript
render(){
    return {
        tag: 'div',
        props: {
            id: 'foo',
            class: cls
        }
    }
}
```

可以发现这段代码中`cls`是变量，它可能会发生变化，那么编译器是怎么一眼就知道哪些是静态属性，哪些是动态的呢？

实际上在编译的时候，编译器就会分析动态内容，并在交付给渲染器之前就标注出来，所以在生成虚拟DOM的时候，就会附带上这些信息:

```javascript
render(){
    return {
        tag: 'div',
        props: {
            id: 'foo',
            class: cls
        },
        patchFlags: 1 // 假设数字 1 代表class属性是动态的
    }
}
```

这样的配合下，渲染器就知道了什么地方需要当作动态处理，而不需要大费周章去寻找变更点，而之所以编译器会提前做好准备也是因为渲染器和虚拟DOM的设计决定的。