#!/bin/bash

cd ./selfDev/newFontGl

if [ ! -d "./node_modules/" ];then
    echo 'selfDev/newFontGl未找到依赖文件夹，正在安装依赖...'
    npm ci
fi
echo 'selfDev/newFontGl正在编译...'
npm run build

cd ../../