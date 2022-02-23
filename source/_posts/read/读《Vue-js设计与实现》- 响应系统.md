---
title: 读《Vue.js设计与实现》- 响应系统
date: 2022-02-22 14:37:13
updated: 2022-02-23 16:57:09
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

function tigger(target, key, newVal){
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
