#!/bin/bash

cd ./selfDev/cubic

if [ ! -d "./node_modules/" ];then
    echo 'selfDev/cubic未找到依赖文件夹，正在安装依赖...'
    npm ci
fi
echo 'selfDev/cubic正在编译...'
npm run build

cd ../../