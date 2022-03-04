---
title: 读《Vue.js设计与实现》- 响应系统
date: 2022-02-22 14:37:13
updated: 2022-03-04 17:07:44
tags:
- vue
- js
- 架构
- 响应式
- 响应系统
- 副作用函数
categories:
- 笔记
readmore: true
---

> 了解大型框架要从读源码开始。
> 
> 了解源码设计与实现思想要从框架的设计和参与者的书本开始。

<!-- more -->

# 第二篇 响应系统

## 第四章 响应系统的作用与实现

### 响应式数据与副作用函数

> 本章会用大量篇幅介绍响应式系统，并深入很多响应式系统设计时需要考虑的细节问题。

首先讨论的是`响应式数据`和`副作用函数`。`副作用函数`指的是会产生`副作用`的函数，如下代码所示:

```javascript
function effect() {
    document.body.innerText = 'hello vue3'
}
```

当effect函数执行的时候，它会设置body的内容，但是除了effect函数以外，任何函数都有可能读取或设置body的内容。

> 也就是说effect函数会直接或者间接的影响其他函数的执行。

这时我们就说effect函数产生了`副作用`。

一个函数修改了全局变量，这其实也是一种副作用。

理解了什么事副作用函数，再来说说什么是响应式数据。

假设在一个副作用函数中读区了某个对象的属性:

```javascript
const obj = { text: 'hello world' }
function effect() {
    document.body.innerText = obj.text
}
```

如上代码所示，副作用函数`effect`会设置`body`元素的`innerText`属性，其值为`obj.text`，我们希望当`obj.text`的值发生变化的时候，副作用函数`effect`会重新执行。


### 响应式数据的基本实现

如何才能让obj变成响应式数据呢？通过观察我们能发现两个线索：

- 当副作用函数effect执行时，会触发字段obj.text的`读取`操作；
- 当修改obj.text的值的时候，会触发字段obj.text的`设置(*写入)`操作；

> 如果我们能拦截对象的读取与设置操作，事情就变得简单了。

即: 当读取obj.text字段的时候，将副作用函数`储存`进一个`“桶”`里面，当设置obj.text字段的时候，再把副作用函数`effect`从`“桶”`里取出并执行即可。

![将副作用函数储存到桶中](https://cdn.jsdelivr.net/gh/Meglody/Meglody.github.io@gh-pages/images/article-images/read-vuejs/桶的概念.png)

![把副作用函数从"桶"内取出并执行](https://cdn.jsdelivr.net/gh/Meglody/Meglody.github.io@gh-pages/images/article-images/read-vuejs/桶的概念2.png)

![把副作用函数从"桶"内取出并执行-动图](https://cdn.jsdelivr.net/gh/Meglody/Meglody.github.io@gh-pages/images/article-images/read-vuejs/桶的概念3.gif)

问题的关键现在变为了我们如何才能拦截一个对象属性的读取和设置操作。在ES2015之前，我们只能通过Obeject.defineProperty函数实现，这也是Vue.js 2中采用的方式。在ES2015+中，我们可以使用代理对象Proxy来实现，这也是Vue.js 3所采用的方式。

使用Proxy把上面的思路实现:

```javascript
// 储存副作用函数的“桶”
const bucket = new Set()

// 原始数据
const data = {
    text: 'hello world'
}
// 对原始数据进行代理
const obj = new Proxy(data, {
    // 拦截读取操作
    get(target, key){
        // 将副作用函数effect添加入“桶”中
        bucket.add(effect)
        // 返回属性值
        return target[key]
    }
    // 拦截设置操作
    set(target, key, newValue){
        // 设置属性值
        target[key] = newValue
        // 把副作用函数从"桶"内取出并执行
        bucket.forEach(fn => fn())
        // 返回执行结果
        return true
    }
})
```

```javascript
// 测试代码
function effect() {
    document.body.innerText = obj.text
}
effect()
setTimeout(() => {
    obj.text = 'hello vue3'
},1000)
```

在浏览器中运行会得到期望结果，但是直接通过名字`effect`来获取副作用函数还是过于局限了，我们需要`完善获取副作用函数`的能力。


### 设计一个完善的响应系统

从上一节的例子不难看出，一个响应系统的工作流程如下：

- 当`读取`操作发生时，将副作用函数存入`“桶”`中；
- 当`设置`操作发生时，将副作用函数从`“桶”`中拿出并执行。

但是上一节的例子，一旦副作用函数不叫effect或者干脆是个匿名函数，那么这段代码就不能正确运行，副作用无法收集到“桶”中，这是`问题一`。

> 为了实现这一点，我们需要提供一个副作用函数注册机制。

如下代码所示:

```javascript
let activeEffect
const effect = (fn) => {
    // 注册副作用函数
    activeEffect = fn
    // 执行副作用函数
    fn()
}
```

我们会如下调用effect函数：

```javascript
effect(() => {
    document.body.innerText = obj.text
})
```

我们将一个匿名的副作用函数传递给了effect函数作为参数，完成注册并执行，此时由于读取到了`obj.text`会触发Proxy`读取`操作的`get`拦截，所以接着我们应该去修改`get`的拦截逻辑。

```javascript
const obj = new Proxy(data, {
    get(target, key) {
        if(activeEffect){
            bucket.add(activeEffect) // 更改此处
        }
        return target[key]
    }
    set(target, key, newValue) {
        bucket.forEach(fn => fn())
        return true
    }
})
```

这样响应式系统就不需要依赖副作用函数的名字了，`问题一`解决。

但如果我们对这段代码稍加测试，会发现`问题二`：即使是不存在的属性的更改也会触发副作用函数的执行，即`没用在副作用函数与被操作的字段之间建立明确的联系`。

> 为了解决这个问题，我们只能重新设计桶的结构。

之前我们是使用`集合(Set)`来设计桶的结构的，目前来看，不能再使用了。那如何知道我们应该使用什么样的数据结构呢？

> 观察:

```javascript
effect(function effectFn(){
    document.body.innerText = obj.text
})
```

在这段代码中存在三个角色：

- 被操作(读取)的代理对象`obj`;
- 被操作(读取)的字段名`text`;
- 使用effect函数注册的副作用函数`effectFn`;

三者的关系可通过一个树型结构来表示：

```yml
target:
 - key:
    - effectFn
```

如果有两个副作用函数同时作用于一个对象的属性值：


```javascript
effect(function effectFn1() {
    document.body.innerText = obj.text
})
effect(function effectFn2() {
    document.body.innerText = obj.text
})
```

```yml
target:
 - text: 
    - effectFn1
    - effectFn2
```

如果一个副作用函数作用于对象的两个属性：

```javascript
effect(() => {
    document.body.innerText = obj.showText ?? obj.text
})
```

```yml
target:
 - showText:
    - effectFn
 - text:
    - effectFn
```

两个副作用函数作用于不同对象的不同属性:

```javascript
effect(function effectFn1() {
    obj1.text1
})
effect(function effectFn2() {
    obj2.text2
})
```

```yml
target1
 - text1:
    - effectFn1
target2
 - text2:
    - effectFn2
```

总之这就是一个树型数据结构，拿上面的例子，我们改变了obj1.text1并不会触发effectFn1的重新执行，接下来我们需要实现重新设计的这个“桶”结构。

```javascript
// 存储副作用函数的桶，是一个WeakMap结构
const bucket = new WeakMap()

const obj = new Proxy(data, {
    get(target, key) {
        if(!activeEffect) return
        // 根据target从“桶”中取得depsMaps，它是一个Map类型： key ---> effects
        let depsMap = bucket.get(target)
        // 如果不存在depsMaps则创建并与target关联
        if(!depsMap){
            bucket.set(depsMap = new Map())
        }
        // 根据key从depsMap中得到deps，它是一个Set类型，里面储存着与当前key相关的所有副作用函数: effects
        let deps = depsMap.get(key)
        // 如果不存在deps则创建并与key关联
        if(!deps){
            depsMap.set(deps = new Set())
        }
        // 最后将当前激活的副作用函数添加到“桶”中
        deps.add(activeEffect)
        return target[key]
    }
    set(target, key, newVal) {
        // 设置属性值
        target[key] = newVal
        // 同上查找逻辑
        const depsMap = bucket.get(target)
        if(!depsMap) return
        // 同上查找逻辑
        const effects = depsMap.get(key)
        // 执行副作用函数
        effects && effects.forEach(fn => fn())
        return true
    }
})
```

从这段代码中可以看出构建数据结构的方式，我们分别使用了`WeakMap`、`Map`、`Set`三种数据结构:

- WeakMap 由 target ---> Map 构成；
- Map 由 key ---> Set 构成。

其中`WeakMap`的键是原始对象`target`，值是一个`Map`实例；`Map`的键是原始对象`target`中的`key`，值是一个由副作用函数组成的`Set`实例。

![WeakMap、Map和Set之间的关系-动图](https://cdn.jsdelivr.net/gh/Meglody/Meglody.github.io@gh-pages/images/article-images/read-vuejs/WeakMap、Map和Set之间的关系.gif)

![WeakMap、Map和Set之间的关系](https://cdn.jsdelivr.net/gh/Meglody/Meglody.github.io@gh-pages/images/article-images/read-vuejs/WeakMap、Map和Set之间的关系.png)

> 有关使用WeakMap：

> WeakMap对于key的引用是`弱引用`，所以WeakMap经常用于储存那些只有当key所引用的对象`存在`时（没有被垃圾回收器回收）才有价值的信息。

```javascript
const map = new Map()
const wm = new WeakMap()

(function(){
    const foo = {foo: 1}
    const bar = {bar: 1}
    map.set(foo, 1)
    wm.set(bar, 1)
})()
```

当上面的代码执行完IIFE之后，垃圾回收器会认为: 在IIFE之外`不存在任何需要`用到局部变量`bar`的地方了，所以对于`bar`的引用已经不再需要了。此时垃圾回收器会把bar从内存中移除，我们无法获取weakmap的key，也就无法通过weakmap取得对象`bar`，这是WeakMap的`特性`(* WeakMap是不可遍历对象，不可被迭代器访问)。

> 所以桶的外层结构使用WeakMap可以有效的防止内存溢出的发生。

最后我们对现阶段成果做个封装，抽象出`track`和`trigger`两个函数:

```javascript
const bucket = new WeakMap()

const obj = new Proxy(data, {
    get(target, key) {
        track(target, key)
        return target[key]
    }
    set(target, key, newVal) {
        trigger(target, key, newVal)
        return true
    }
})

function track(target, key){
    if(!activeEffect) return
    // 根据target从“桶”中取得depsMaps，它是一个Map类型： key ---> effects
    let depsMap = bucket.get(target)
    // 如果不存在depsMaps则创建并与target关联
    if(!depsMap){
        bucket.set(depsMap = new Map())
    }
    // 根据key从depsMap中得到deps，它是一个Set类型，里面储存着与当前key相关的所有副作用函数: effects
    let deps = depsMap.get(key)
    // 如果不存在deps则创建并与key关联
    if(!deps){
        depsMap.set(deps = new Set())
    }
    // 最后将当前激活的副作用函数添加到“桶”中
    deps.add(activeEffect)
}

function trigger(target, key, newVal){
    // 设置属性值
    target[key] = newVal
    // 同上查找逻辑
    const depsMap = bucket.get(target)
    if(!depsMap) return
    // 同上查找逻辑
    const effects = depsMap.get(key)
    // 执行副作用函数
    effects && effects.forEach(fn => fn())
}
```

这样能给我们带来极大的灵活性，至此`问题二`解决。

### 分支切换与cleanup

首先我们需要明确分支切换的定义，如下代码所示：

```javascript
const data = { ok: true, text: 'hello world' }
const obj = new Proxy(data, { /* ... */ })
effect(() => {
    document.body.innerText = obj.ok ? obj.text : 'not'
})
```

`effectFn`内部存在一个`三元表达式`，根据`obj.ok`值的不同，会执行不同的代码分支，即`obj.ok`的值发生变化时，代码的执行会跟着变化，这就是所谓的`分支切换`。

`分支切换`可能会产生遗留的`副作用函数`。`obj.ok`初始值为`true`时，会读取`obj.ok`和`obj.text`两个字段。此时`副作用函数`与`响应式数据`之间建立的关系入下：

```yml
target
 - ok
    - effectFn
 - text
    - effectFn
```

此时并没有什么问题，修改`obj.ok`和`obj.text`都应该去触发`effectFn`副作用函数的执行。

但是一旦`obj.ok`变为`false`之后并触发副作用函数执行，由于此时代码相当于是:

```javascript
...
document.body.innerText = false ? obj.text : 'not'
...
```

`obj.text`此时不会被读取，只会触发`obj.ok`的读取操作，所以理想情况下副作用函数`effectFn`不应该被字段`obj.text`所对应的依赖`集合`收集到。

也就是说，`obj.ok`修改为`false`之后，无论再怎么修改`obj.text`的值都不应该触发副作用函数`effectFn`的执行，但按照前文的实现，我们还没有做到这一点，`问题三`出现了。

为了解决这个问题，我们需要在每次副作用函数执行的时候先`把它从与之关联的所有依赖集合中删除`。

<!-- ![这里可能需要一张动图]() -->

当副作用函数执行完毕后，会重新建立联系，新的联系中不会包含`遗留`的副作用函数。所以接下来我们就要实现一个`每次副作用函数执行前从依赖集合中移除的自身`的操作。

要将副作用函数从之前所有与之关联的依赖集合中移除，就需要明确知道哪些依赖集合收集了它，因此我们需要重新设计副作用函数: 

```javascript
let activeEffect
function effect(fn){
    // 封装
    const effectFn = () => {
        activeEffect = fn
        fn()
    }
    // 用于收集与该副作用函数相关联的依赖集合的数组
    effectFn.deps = []
    // 延迟执行
    effectFn()
}
```

那`effectFn.deps`又是怎么收集依赖集合的？我们需要修改一下`track`函数：

```javascript
function track(target, key){
    if(!activeEffect) return
    let depsMap = bucket.get(target)
    if(!depsMap){
        bucket.set(depsMap = new Map())
    }
    let deps = depsMap.get(key)
    if(!deps){
        depsMap.set(deps = new Set())
    }
    // 将当前激活的副作用函数添加到依赖集合中
    deps.add(activeEffect)
    // 将当前的依赖集合添加到当前激活的副作用函数的相关依赖集合数组中(实际上就是一种双向添加)
    activeEffect.deps.push(deps)
}
```

于是`effectFn.deps`数组中就收集了与副作用函数自身相关联的`依赖集合`。

下面我们就需要对其进行`清理`了，即：`每次副作用函数执行就将其自身从依赖集合中删除`，为此我们需要写一个`cleanup`函数:

```javascript
function cleanup() {
    effectFn.deps.forEach(deps => {
        // 从每个依赖集合中移除当前副作用函数
        deps.delete(effectFn)
    })
    // 重置effectFn.deps数组
    effectFn.deps.length = 0
}
```

在副作用函数中去调用`cleanup`: 

```javascript
let activeEffect
function effect(fn){
    const effectFn = () => {
        // 执行清理
        cleanup(effectFn)
        activeEffect = effectFn
        fn()
    }
    effectFn.deps = []
    effectFn()
}
```

至此我们的响应式系统已经可以避免副作用函数产生遗留了。

![分支切换与cleanup](https://shanghai-1309153523.cos.ap-shanghai.myqcloud.com/%E5%88%86%E6%94%AF%E5%88%87%E6%8D%A2%E4%B8%8Ecleanup.gif)

但如果此时尝试运行代码会`导致无限循环执行`，最后爆栈，其原因出在`trigger`函数中:

```javascript
function trigger(target, key, newVal) {
    const depsMap = bucket.get(target)
    if(!depsMap) return
    const effects = depsMap.get(key)
    effects && effects.forEach(fn => fn()) // 新产生的问题来自于这里
}
```

在`effectFn`副作用函数内部，我们在执行完`cleanup`后，会`执行一次原始副作用函数`。外层`trigger`函数对`依赖集合的forEach遍历仍在进行中`时，又被`读取操作拦截`后添加到`依赖集合`中，forEach永远`执行不完`。

对于这个问题我们只需要在forEach的集合上在套一层`new Set()`即可：

```javascript
function trigger(target, key, newVal) {
    const depsMap = bucket.get(target)
    if(!depsMap) return
    const effects = depsMap.get(key)
    effects && new Set(effects).forEach(fn => fn())
}
```

相当于用new Set() 做了一次`缓存`操作(* 这里是否使用`WeakSet`会更好？)。

至此，`问题三`解决了。

### 嵌套的effect与effect栈

在Vuejs的设计中effect是支持嵌套的，如:

```javascript
effect(function effectFn1(){
    effect(function effectFn2(){
        /* ... */
    })
})
```

实际上Vuejs的渲染函数就是在一个effect中执行的:

```javascript
const Foo = {
    render(){
        return /* ... */
    }
}
```

即为:

```javascript
effect(() => {
    Foo.render()
})
```

发生嵌套时:

```javascript
const Bar = {
    render(){
        return /* ... */
    }
}
// Foo 组件渲染了 Bar 组件
const Foo = {
    render(){
        return <Bar /> // jsx语法
    }
}
```

```javascript
effect(() => {
    Foo.render()
    effect(() => {
        Bar.render()
    })
})
```

接下来我们拿上文实现的响应式系统测试运行一下:

```javascript
const data = {
    foo: true, bar: true
}
const obj = new Proxy(data, /* ... */)
let temp1, temp2
effect(function effectFn1() {
    console.log('effectFn1执行')
    effect(function effectFn2() {
        console.log('effectFn2执行')
        temp2 = obj.bar
    })
    temp1 = obj.foo
})
```

理想状态下，我们应该是先执行`effectFn1`，将`effectFn1`收集到`obj.foo`对应的依赖集合中，之后执行`effectFn2`，将`effectFn2`收集到`obj.bar`对应的依赖集合中，对应的树型结构应该是如下:

```yml
target
 - foo
    - effectFn1
 - bar
    - effectFn2
```

这种情况下，我们希望修改`obj.foo`的值会触发`effectFn1`和`effectFn2`执行，而修改`obj.bar`时只触发`effectFn2`执行，然而此时我们修改`obj.foo`时会发现:

```bash
'effectFn2执行'
```

输出的仅仅是`effectFn2`执行，`问题四`出现了。

这个问题出现的原因是副作用函数中的activeEffect:

```javascript
let activeEffect
function effect(fn){
    function effectFn(){
        cleanup(effectFn)
        activeEffect = effectFn // 问题在这里
        fn()
    }
    effectFn.deps = []
    effectFn()
}
```

其实际执行的是这样的程序:

```javascript
let activeEffect
effectFn1.deps = []
cleanup(effectFn1)
activeEffect = effectFn1
console.log('effectFn1执行')
effectFn2.deps = []
cleanup(effectFn2)
activeEffect = effectFn2 // 问题在这里
console.log('effectFn2执行')
temp2 = obj.bar // 触发 bar 的读取拦截，将effectFn2 添加到 bar 对应的依赖集合中
temp1 = obj.foo // 触发 foo 的读取拦截，将effectFn2 添加到 foo 对应的依赖集合中
```

activeEffect变量所存储的`当前副作用函数`只能有一个，当发生嵌套时，`内层副作用函数`会覆盖这个变量，等内层运行栈运行结束的时候变量已经被污染了。

所以我们需要重新设计一个栈的数据结构，当嵌套函数完成时弹出最近一次的`副作用函数`即可。

代码如下:

```javascript
let activeEffect, effectStack = []
function effect(fn) {
    function effectFn() {
        cleanup(effectFn)
        // 激活副作用函数
        activeEffect = effectFn
        // 每次激活副作用函数都先向栈中压入这个副作用函数
        effectStack.push(effectFn)
        fn()
        // 执行完上一个运行栈再从栈中弹出一个副作用函数
        effectStack.pop()
        // 重新激活本次运行栈中的副作用函数
        activeEffect = effectStack[effectStack.length - 1]
    }
    effectFn.deps = []
    effectFn()
}
```

修改过后，代码执行步骤如下:

```javascript
let activeEffect, effectStack = []
effectFn1.deps = []
cleanup(effectFn1)
activeEffect = effectFn1
effectStack.push(effectFn1)
console.log('effectFn1执行')
effectFn2.deps = []
cleanup(effectFn2)
activeEffect = effectFn2
effectStack.push(effectFn2)
console.log('effectFn2执行')
temp2 = obj.bar // 触发 bar 的读取拦截，将effectFn2 添加到 bar 对应的依赖集合中
effectStack.pop()
activeEffect = effectFn1 // 问题解决了
temp1 = obj.foo // 触发 foo 的读取拦截，将effectFn1 添加到 foo 对应的依赖集合中
effectStack.pop()
activeEffect = undefined
```

自己画了个动图帮助理解:

![副作用函数栈-动图](https://cdn.jsdelivr.net/gh/Meglody/Meglody.github.io@gh-pages/images/article-images/read-vuejs/副作用函数栈.gif)


至此`问题四`解决了。

### 避免无限递归循环

系统的架构需要盘细节，嵌套的问题解决了，我们考虑一下自增操作:

```javascript
effect(() => obj.foo++)
```

此处的副作用函数，既读取了`obj.foo`，也设置了`obj.foo`的值，`问题五`出现了: 首先读取`obj.foo`的值，触发track操作，将`副作用函数`存入`Set`依赖集合，此时读取操作还正在进行中，又设置了`obj.foo`的值`+1`，触发`trigger`操作，即把`Set`中刚存入的`副作用函数`取出并执行了。`副作用函数`正在执行中又触发了读取`obj.foo`的`track`操作......

为了解决这个问题我们只要简单的在`trigger`函数遍历依赖集合时过滤一下即可：

```javascript
function trigger(targer, key, newVal) {
    const depsMap = bucket.get(target)
    if(!depsMap) return
    const effects = depsMap.get(key)
    const newEffects = new Set(effects)
    newEffects.forEach(fn => {
        if(fn !== activeEffect) fn()
    })
}
```

过滤掉当前激活的`副作用函数`，就可以避免类似自增操作后产生的无限递归的问题，`问题五`解决。

### 调度执行

可调度性是响应式系统中一个很重要的特性，所谓可调度性，是指当`trigger`触发副作用重新执行时，有能力决定副作用函数的执行时机、次数以及方式。

```javascript
const data = { foo: 1 }
const obj = new Proxy(data, {/* ... */})
effect(() => {
    console.log(obj.foo)
})

obj.foo++

console.log('结束了')
```

这段代码输出如下:

```shell
1
2
'结束了'
```

假设我需要它打印:

```shell
1
'结束了'
2
```

有什么办法在不调整业务代码的同时做到呢？这时候就需要响应系统支持`调度`。

我们为`effect`设置一个选项参数，允许用户`传入自定义调度器`:

```javascript
effect(() => {
    console.log(obj.foo)
},
// options
{
    // 调度器 scheduler 是一个函数
    scheduler(fn){
        // ...
    }
})
```

我们需要在`effect`函数内部，把选项挂在`副作用函数`上面:

```javascript
function effect(fn, options = {}){
    function effectFn(){
        clearEffect(fn)
        activeEffect = effectFn
        effectStack.push(effectFn)
        fn()
        effectStack.pop()
        activeEffect = effectStack[effectStack.length - 1]
    }
    effectFn.deps = []
    effectFn.options = options
    effectFn()
}
```

有了调度器，我们就可以在`trigger`触发副作用函数重新执行时，调用用户传入的调度器函数，把`控制权移交给用户`:

```javascript
function trigger(target, key, newVal) {
    const depsMap = bucket.get(target)
    if(!depsMap) return
    const effects = depsMap.get(key)
    const newEffects = new Set()
    effects.forEach(fn => {
        if(fn !== activeEffect) {
            // 存入非激活的副作用函数
            newEffects.add(fn)
        }
    })
    newEffects.forEach(effectFn => {
        if(effectFn.options.scheduler){
            // 使用传入调度器执行
            effectFn.options.scheduler(effectFn)
        }else{
            // 直接执行
            effectFn()
        }
    })
}
```

在`trigger`触发副作用函数执行时，我们优先判断该副作用函数是否存在`调度器`，如果有，就让用户自己控制如何执行，并把副作用函数传递给`调度器`，否则直接执行副作用函数。

有了这个基础之后，就可以实现前文的调度需求了:

```javascript
const data = { foo: 1 }
const obj = new Proxy(data, { /* ... */ })
effect(() => {
    console.log(obj.foo)
}, {
    scheduler(fn){
        // 将副作用函数放入一个宏任务队列中执行
        setTimeout(fn)
    }
})

obj.foo++

console.log('结束了')
```

我们使用一个`setTimeout`函数开启一个宏任务，来执行副作用函数fn，这样就能实现期望的打印顺序了：

```shell
1
结束了
2
```

> 除了控制副作用函数的执行时机，我们还能做到控制它的执行次数，这一点也尤为重要，思考如下例子：

```javascript
const data = { foo: 1 }
const obj = new Proxy(data, { /* ... */ })
effect(() => {
    console.log(obj.foo)
})

obj.foo++
obj.foo++
```

它的输出如下:

```shell
1
2
3
```

由输出可知，`obj.foo`的值由`1`经过两次自增最后变成了`3`，`2`是其过度状态。假设我们只关心结果，不想知道过程，那么第二次打印就是多余的，我们期望的打印结果是：

```shell
1
3
```

其中不包含过渡态，基于调度器，我们可以很容易的实现此功能：

```javascript
const jobQueue = new Set()
const p = Promise.resolve()

let isFlushing = false
function flushJobs() {
    if(isFlushing) return false
    isFlushing = true
    p.then(() => {
        jobQueue.forEach(fn => fn())
    }).finally(() => {
        isFlushing = false
    })
}

const data = { foo: 1 }
const obj = new Proxy(data, { /* ... */ })

effect(() => {
    console.log(obj.foo)
}, {
    scheduler(fn){
        jobQueue.add(fn)
        flushJobs()
    }
})

obj.foo++
obj.foo++
```

首先我们定义了一个任务队列`jobQueue`，它是一个`Set`数据结构，目的是利用`Set`数据结构自动去重的能力。接着我们每次调度执行时，都会先将`副作用函数`添加到`jobQueue`队列中，并尝试使用一个`flushJobs`函数刷新任务队列。我们把目光移到flushJobs函数，因为其有一个`isFlushing`的标志，无论执行多少次函数，在一个微任务周期内，队列只会刷新一次。

整段代码的效果是，连续对`obj.foo`进行两次自增操作，会同步且连续的两次调用`scheduler`调度函数，意味着同一个副作用函数会被`jobQueue`添加两次，但由于`jobQueue`是一个`Set`数据结构，会自动去重，所以最终`jobQueue`中只会有一项任务，即当前副作用函数。类似的`flushJobs`也会同步且连续的执行两次，但由于`isFlushing`标志的存在，实际一个微任务周期只会执行一次，当微任务队列开始执行时会遍历`jobQueue`，由于此时`jobQueue`只有一个副作用函数，所以只会执行一次，而此时`obj.foo`的值已经是`3`了，这样我们就实现了期望的输出:

```shell
1
3
```
> Vue.js在多次连续修改响应式数据只会触发一次更新正是因为内部实现了一个更完善的调度器，思路与上文相同。

### 计算属性 computed 与 lazy

基于以上`effect`的实现，其实就可以帮你建造Vuejs 3种的`computed`计算属性了，在这之前得先了解一下懒执行的`effect`，即`lazy`的`effect`。举个例子：

```javascript
effect(() => console.log(obj.foo)) // 现在这个副作用函数会立即执行
```

但是在有些场景下，我并不希望它立即执行，而是希望它在需要的时候才执行，例如计算属性。这时我们需要在`options`中添加`lazy`属性来达到目的：

```javascript
effect(() => console.log(obj.foo), {
    lazy: true
})
```

`lazy`和之前介绍的`scheduler`一样，通过`options`选项对象指定。有了他我们就可以修改`effect`函数的实现逻辑了，当`lazy`为`true`时则不执行副作用函数：（* 但是同`scheduler`不同的是，`lazy`从收集依赖开始就不执行。）

```javascript
function effect(fn, options = {}){
    const effectFn = () => {
        cleanup(effectFn)
        activeEffect = effectFn
        effectStack.push(activeEffect)
        fn()
        effectStack.pop()
        activeEffect = effectStack[effectStack.length - 1]
    }
    effectFn.deps = []
    effectFn.options = options
    if(!options.lazy){
        effectFn()
    }
    return effectFn
}
```

通过以上更改，我们就能控制`effectFn`不立即执行，但是，`副作用函数`应该在什么时候执行呢？我们已经将`副作用函数`作为`effect`函数的返回值，这意味着调用`effect`函数时就能拿到`副作用函数`，这样我们就可以考虑先试试手动执行`副作用函数`了：

```javascript
const effectFn = effect(() => {
    console.log(obj.foo)
}, {
    lazy: true
})
// 手动执行
effectFn()
```

但光是这样并没有意义，我们需要通过computed拿到一个副作用函数的执行的结果，目前的实现还不能做到，例如：

```javascript
const effectFn = effect(
    // 传入一个getter，可能返回任何值
    () => obj.foo + obj.bar,
    {
        lazy: true
    }
)
const res = effectFn()
```

我们还需要对effect函数内部做一些细微的更改：

```javascript
function effect(fn, options = {}){
    const effectFn = () => {
        cleanup(effectFn)
        activeEffect = effectFn
        effectStack.push(effectFn)
        const res = fn() // 缓存副作用函数的执行结果
        effectStack.pop()
        activeEffect = effectFn[effectFn.length - 1]
        return res // 并把它返回出来
    }
    effectFn.deps = []
    effectFn.options = options
    if(!options.lazy){
        effectFn()
    }
    return effectFn
}
```

这样我们就可以通过懒执行effect返回的副作用函数，拿到计算结果了。接着我们就来实现真正的`computed`计算属性吧：

```javascript
function computed(getter){
    const effectFn = effect(getter, {
        lazyL: true
    })

    const obj = {
        // 我们返回一个对象，该对象的value属性是一个访问器属性
        get value(){
            const value = effectFn()
            return value
        }
    }

    return obj
}
```

我们定义一个`computed`函数，它接受一个`getter`函数作为参数，我们把`getter`函数当作副作用函数传入`effect`中，用它来创建一个`lazy`懒执行的`effect`。`computed`会返回一个对象，对该对象`value`属性的访问会触发副作用函数执行，也就是只有读取`value`值的时候才会执行`effectFn`并将其结果作为返回值返回。

我们现在可以通过computed创建一个计算属性：

```javascript
const data = {
    foo: 1, 
    bar: 2
}
const obj = new Proxy(data, { /* ... */ })
const sum = computed(() => obj.foo + obj.bar)
console.log(sum.value) // 3
```

可以看到它可以正确的工作了。不过我们现在只实现了`懒执行`，即当访问`computed`计算属性的`value`才会执行副作用函数。还做不到对值进行`缓存`。

为什么要缓存？当我们多次访问sum.value时，effectFn多次被执行，即使是obj.foo和obj.bar本身都没有产生变化：

```javascript
console.log(sum.value) // 3
console.log(sum.value) // 3
console.log(sum.value) // 3
```

以上每次访问都会触发effectFn计算。为了解决这个问题，我们需要实现对value值的缓存：

```javascript
function computed(getter){
    let value
    let dirty = true
    const effectFn = effect(getter, {
        lazy: true
    })

    const obj = {
        get value(){
            if(dirty){
                value = effectFn()
                dirty = false
            }
            return value
        }
    }

    return obj
}
```

当`dirty`被置为`true`时，才会执行副作用函数，之后`dirty`会被置为`false`，当value属性再被访问时，直接返回之前的计算结果。

显然，代码目前到这儿还有问题：如果我们此时更改`obj.foo`和`obj.bar`的值并不会触发value值的更改，但是他们的修改还是会触发effectFn，我们需要再借助`scheduler`调度的能力了。

```javascript
function computed(getter) {
    let value
    let dirty = true

    const effectFn = effect(getter, {
        lazy: true,
        scheduler(){
            // 把脏值重置为true，下次读取就会执行effectFn更新value值了
            dirty = true
        }
    })

    const obj = {
        get value(){
            if(dirty){
                value = effectFn()
                dirty = false
            }
            return value
        }
    }

    return obj
}
```

这样，当下一次访问value属性时，dirty属性已经被恢复成true了，副作用函数会重新执行更新value值，这样就能达到缓存value值的目的了。

现在我们的计算属性已经趋于完美了，但还是需要考虑一下嵌套的情况：

```javascript
const sum = computed(() => obj.foo + obj.bar)
const sumRes = computed(() => sum.value)
obj.foo++
console.log(sumRes.value)
```

从本质上讲，这就是一个`effect`嵌套问题，目前我们可以外部`effect`执行触发内部`effect`执行，但是内部`effect`不会收集外部`effect`的副作用函数，解决这个问题，我们需要重新用到`track`和`trigger`这两个我们提前封装的方法：

```javascript
function computed(getter) {
    let value
    let dirty = true

    const effectFn = effect(getter, {
        lazy: true,
        scheduler(){
            dirty = true
            // 执行外部设置逻辑
            trigger(obj, 'value')
        }
    })

    const obj = {
        get value(){
            if(dirty){
                value = effectFn()
                dirty = false
            }
            // 收集外部副作用函数
            track(obj, 'value')
            return value
        }
    }

    return obj
}
```

当读取一个计算属性的`value`值时，手动调用`track`函数收集外部`effect`传入的`副作用函数`(* 由于`闭包`或者说当前执行栈所在的`词法作用域`，此时的`track`中读取到的`activeEffect`为`外部effect`接收的`副作用函数`，即完成了对`() => console.log(sum.value)`的收集)，之后又在scheduler调度器中手动触发trigger，执行外部effect的设置逻辑(* 外部effect也有可能是一个`computed`)。

至此，一个`computed`计算属性被设计出来了。