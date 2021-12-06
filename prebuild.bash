#!/bin/bash

cd ./selfDev/cubic

if [ ! -d "./node_modules/" ];then
    echo 'No dir named node_modules/ found, prepare to install dependencies'
    npm ci
fi

npm run build

cd ../../