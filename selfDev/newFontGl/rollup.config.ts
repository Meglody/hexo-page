import path from "path";
import builtins from 'rollup-plugin-node-builtins';
import resolve from "rollup-plugin-node-resolve"; // 依赖引用插件
import commonjs from "@rollup/plugin-commonjs"; // commonjs模块转换插件
import globals from 'rollup-plugin-node-globals';
import json from '@rollup/plugin-json';
import ts from "rollup-plugin-typescript2";
const getPath = (_path) => path.resolve(__dirname, _path);
import packageJSON from "./package.json";

const extensions = [".js", ".ts", ".tsx"];

// ts
const tsPlugin = ts({
  tsconfig: getPath("./tsconfig.json"), // 导入本地ts配置
  tsconfigOverride: { extensions },
});

// 基础配置
const commonConf = {
  input: getPath("./index2.ts"),
  plugins: [
    builtins(),
    resolve({
        browser: true,
        extensions,
    }),
    commonjs({
        include: 'node_modules/**',
        ignoreGlobal: false
    }),
    globals(),
    json(),
    tsPlugin,
  ],
};
// 需要导出的模块类型
const outputMap = [
  {
    file: path.resolve(__dirname, './dist/' + packageJSON.main), // 通用模块
    format: "umd",
  },
  {
    file: path.resolve(__dirname, './dist/' + packageJSON.module), // es6模块
    format: "es",
  },
];

export default {
    ...commonConf,
    output: outputMap
}