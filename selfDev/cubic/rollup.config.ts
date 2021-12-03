import path from "path";
import resolve from "rollup-plugin-node-resolve"; // 依赖引用插件
import commonjs from "rollup-plugin-commonjs"; // commonjs模块转换插件
import image from '@rollup/plugin-image';
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
  input: getPath("./banner.ts"),
  plugins: [
    resolve({
      extensions,
    }),
    image(),
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
    const conf = buildConf({ output: { name: packageJSON.name, ...output } })
    return conf
}
);
