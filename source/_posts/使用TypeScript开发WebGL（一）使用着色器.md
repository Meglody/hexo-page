---
title: 使用TypeScript开发WebGL（一）使用着色器
date: 2021-12-06 10:59:53
tags: 
- WebGL
- TypeScript
categories:
- 笔记
---

## 前言
首先对于web系前端来说，我们在使用WebGL开发的首选语言肯定是javascript，在接触着色器语言后，我们知道可以用：
``` html
<script type="x-shader/x-vertex"></script>
<script type="x-shader/x-fragment"></script>
```
引入的方式，将glsl es引入到我们的JavaScript中来使用。

不过在实际开发中，这个引入方式
- 一来是不方便跟踪
- 二来我们在使用ide开发，代码提示方面没有任何优势怎么行？

好在我们在学习TypeScript之后，认识就有了一定的改变，我们使用TypeScript的视点来观察下面这一段代码。

### 使用类型审查

``` html
<script id="vShader" type="x-shader/x-vertex"></script>
<script id="fShader" type="x-shader/x-fragment"></script>
```

``` ts
const vertexShader = document.querySelector('#vShader').textContent
const fragmentShader = document.querySelector('#fShader').textContent
console.log(vertexShader, fragmentShader)
```


其实通过打印你也能知道，这里的textContent无非只是将shader的代码通过字符串方式读取出来了。

TypeScript在这里也会标记vertexShader、fragmentShader两个变量为string类型。

为了验证这一点，我们可以通过TypeScript的类型声明提示来一窥WebGL的gl.shaderSource方法：

``` html
<body>
    <canvas id="canvas"></canvas>
</body>
<script id="vShader" type="x-shader/x-vertex"></script>
<script id="fShader" type="x-shader/x-fragment"></script>
```
``` ts
const canvas = document.querySelect('#canvas')
const vsSource = document.querySelect('#vShader').textContent
const shaderType = gl.VERTEX_SHADER
const shader = gl.createShader(shaderType) as WebGLShader
gl.shaderSource(shader, vsSource)
gl.compileShader(shader)
```
通过类型提示我们可以知道：
* shaderType 是一个number类型的索引，用于去查找内存上的地址;
* shader是着色器对象;
* 而source只是一个字符串类型;

那么既然是字符串类型，我们何不直接写在TypeScript文件中呢？

于是我们大胆可以这样写：

``` ts
const canvas = document.querySelect('canvas')
const vsSource = `
attribute vec4 a_Position;
void main(){
    gl_Position = a_Position;
}
`
const shaderType = gl.VERTEX_SHADER
const shader = gl.createShader(shaderType) as WebGLShader
gl.shaderSource(shader, vsSource)
gl.compileShader(shader)
```


照样可以运行。

那么如果可以想把shader相关的字符串抽取出来，是不是也可以呢？

## 现代前端开发 - ide：vsCode - 工程化 - rollup

### 开发环境 - es6 - ide：vsCode

已经2021年了，我们自然要使用现代浏览器的自带支持的es module来写前端代码。

通过上文我们已经知道了shader在js引擎中通过传递string类型的变量来加载编译，但是我们不再需要去使用script标签来引入。

    这里我们得要科普一下着色器的文件类型后缀：.glsl
    它也可以是: .vs/.fs/.vert/.fragment 等任意一种后缀
    那么为什么会有这么多种后缀呢？
    实际上官方并没有一个很明确的后缀规范，以上只是公认使用较多的后缀罢了。
    但是所有引擎都是用字符串来理解shader语言的这一点没错。

下面我们使用.vert来举例：

``` vert 
// shader.vert
attribute vec4 a_Position;
void main(){
    gl_Position = a_Position;
}
```

``` ts
// index.ts
import vsSource from './shader.vert'
const canvas = document.querySelect('canvas')
const shaderType = gl.VERTEX_SHADER
const shader = gl.createShader(shaderType) as WebGLShader
gl.shaderSource(shader, vsSource)
gl.compileShader(shader)
```

这个时候TypeScript语法会提示报错：
    找不到模块“./shaders/cubic/cubic.vert”或其相应的类型声明

意思是告诉你，不行，这里的.vert文件我不认识，你得先给他一个类型声明让我明白他这个模块是干什么的。

我们在项目的根目录下创建一个index.d.ts的类型声明文件：

``` ts
declare module '*.vert'
declare module '*.frag'
declare module '*.vs'
declare module '*.fs'
declare module '*.glsl'
```
将上面这些代码复制进去，意思是告诉ts解释器，这里的这些文件你知道就好（默认当作字符串处理）。
保存之后开发环境就不会报错了。

那么为什么我们要大费周章的用这些后缀名的文件呢？
* 首先一点就是关注点分离，一个逻辑中的着色器对象可能会有很多。我们想在ts中直接用他们没错，但是又不想要ts中充斥着这些非js引擎可以理解的臃肿的代码；
* 其次，glsl es语言在我们的ts文件中完全没有任何的代码提示，我们需要健壮的代码提示功能，那么如何可以免费获得代码提示呢？还记得这一趴的小标题吗：ide：vsCode；

我们在vsCode的扩展应用商店中搜索：ext:vert 或 raczzalan.webgl-glsl-editor。

会搜索到一款叫“WebGl GLSL Editor”的插件，安装它。

之后我们在html、vert、glsl、fragment后缀的文件中编辑都会有健壮的glsl es的语法提示了。

至此，我们在开发环境就有了强有力的glsl代码支持，同时也秉承了高聚合低耦合的代码风格，分离了我们开发时的关注点。

### 生产环境 - 工程化 - rollup

以上讲述了TypeScript如何在开发环境使用着色器，但是我们的代码光在本地跑起来可不行。

接下来我介绍一下我在生产环境的方案。

我选择rollup作为我代码的打包工具，它轻量，tree shaking，丰富的社区插件，正好能够满足我的需求。

- 安装依赖
- 由于我们的项目使用TypeScript开发，所以，必要的几件不能缺少：
``` bash
npm i typescript rollup rollup-plugin-node-resolve rollup-plugin-commonjs rollup-plugin-typescript2 --save-dev
```
- 安装glsl文件解析器（有能力的也可以自己写这个解析器哈）
``` bash
npm i rollup-plugin-glslify --save-dev
```

- rollup.config.ts 配置项
``` ts
import path from "path";
import resolve from "rollup-plugin-node-resolve"; // 依赖引用插件
import commonjs from "rollup-plugin-commonjs"; // commonjs模块转换插件
import glslify from 'rollup-plugin-glslify';
import ts from "rollup-plugin-typescript2";
const getPath = (_path) => path.resolve(__dirname, _path);
import packageJSON from "./package.json";

const extensions = [".js", ".ts", ".tsx"];

// 导入本地ts配置
const tsPlugin = ts({
  tsconfig: getPath("./tsconfig.json"),
  tsconfigOverride: { extensions },
});

// 基础配置
const commonConf = {
  // 入口文件
  input: getPath("./index.ts"),
  plugins: [
    resolve({
      extensions,
    }),
    glslify(),
    commonjs(),
    tsPlugin,
  ],
};
// 需要导出的模块类型
const outputMap = [
  {
    file: path.resolve(__dirname, packageJSON.main), // 通用模块
    format: "umd",
  },
  {
    file: path.resolve(__dirname, packageJSON.module), // es6模块
    format: "es",
  },
];

const buildConf = (options) => Object.assign({}, commonConf, options);

export default outputMap.map((output) => {
    const conf = buildConf({
        output: {
            ...output,
            name: packageJSON.name,
        } 
    })
    return conf
});
```

- package.json 补充配置
``` json
{
    ...
    "name": "webgl",
    "main": "dist/index.umd.js",
    "module": "dist/index.js",
    "typings": "dist/types.index.d.ts",
    "scripts": {
        "build": "rollup -c rollup.config.ts"
    }
}
```

- 项目打包

在根目录

``` bash
npm run build
```
构建完成后我们就可以在dist文件中看到我们编译完成的js文件,

我们打开看一下，我们之前import的vertex变量

``` js
var vsSource = "#define GLSLIFY 1\nattribute vec4 a_Position;void main(){gl_Position=a_Position;}"; // eslint-disable-line

```

vsSource被编译成了一个字符串，这样就证明我们使用的TypeScript和外部的glsl文件已经全部成功的编译完成了，

引入到html中，直接运行，

至此，生产环境部分也搞定了。

下一篇可能会讲TypeScript在canvas上下文中类型提示的便携性。