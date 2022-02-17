---
title: 读《Vue.js设计与实现》
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