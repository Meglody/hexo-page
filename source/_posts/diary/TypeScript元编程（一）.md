---
title: TypeScript元编程（一）
date: 2021-12-14 08:35:13
tags:
- 元数据
- 元编程
- TypeScript
categories:
- 笔记
author: 卡西猫倒
email: 30755703@qq.com
readmore: true
---

> 定义一个n项重复数组（元组）

```typescript

type count<n extends number, v extends any = 0, counter extends any[] = []> =
    counter['length'] extends n ? counter : count<n, v, [...counter, v]>
let a0:count<5>
// 等同于 
// let a0: [0, 0, 0, 0, 0] 
// 这里的a0相当于就是一个长度为5，类型为0的元祖
let a1:count<5, any>
// 等同于 
// let a1: [any, any, any, any, any]
let a2:count<5, number[], [[1,2,3], [4,5,6]]>
// let a2: [[1, 2, 3], [4, 5, 6], number[], number[], number[]]
```

> 加法

```typescript

type add<m extends number, n extends number> = [...count<m>, ...count<n>]["length"]
let b:add<20, 9>
// b: 29

```

<!-- more -->
