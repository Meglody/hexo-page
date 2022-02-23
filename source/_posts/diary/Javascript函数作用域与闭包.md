---
title: Javascript函数作用域与闭包
author: 卡西猫倒
email: 30755703@qq.com
readmore: true
date: 2022-02-16 16:11:47
updated: 2022-02-16 16:11:47
tags:
---

在我最初接触前端的时候，老师曾今和我说过在JS中，立即执行函数即是闭包

但这真的是对的吗？

在看过本篇文章后相信你会对闭包有更好更深入的理解。

我们不妨先来看立即执行函数是什么

> 立即执行函数(IIFE: Immediately Invoked Function Expression)

```javascript
(function IIFE(){
    var a = 3
    console.log(a) // 3
})()
```

这个函数在声明时立刻被调用了，而函数作用域内部声明的变量a，只在函数内部可访问。

> 什么是函数作用域？

每声明一个函数，就会产生一个函数作用域，你可以把它当作一个气泡，每个作用域气泡中声明的变量，都会附属于所处的作用域气泡。

```javascript
function foo(){
    var a = 2
    function bar(){
        console.log(a, b)
    }
    var b = 3
    return bar
}
foo()() // 1 2 3
```

上面这个例子中，foo函数中声明了a、b变量和bar函数，bar由于附属于foo气泡内，所以可以访问foo气泡内的变量，即：a、b


> 我们再来看看这个函数声明和调用是什么样的:

```javascript
function foo(){ // <- 从这一行开始
    var a = 1
    function bar(){
        console.log(a, b)
    }
    var b = 2
    return bar
}// <- 到这一行结束，即是函数声明，即: Function Expression
foo()()// <- 这一行，即是函数调用，即: Function Involked, 同时也被称为函数表达式
```
foo执行时所在的是外部词法作用域，在外部词法作用域中并未声明a、b变量，但是在调用其返回的bar的时候，却可以访问foo内部的变量a、b，这个就是闭包的一个特点，即：

> 即使函数是在当前词法作用域之外执行，函数也可以记住并访问声明时所在的词法作用域



