#!/bin/bash

if [ ! -d "../../source/js" ];then
    mkdir ../../source/js
    echo "未搜索到source/js文件夹，创建source/js文件夹"
fi

if [ ! -d "../../source/js/ui" ];then
    mkdir ../../source/js/ui
    echo "未搜索到source/js/ui文件夹，创建source/js/ui文件夹"
fi

echo "复制rollup编译后的文件到source/js/ui文件夹, 覆盖theme/yun自带开屏动画"
cp dist/banner.js ../../source/js/ui/banner.js
echo "删除rollup编译后的文件"
rm -rf ./dist