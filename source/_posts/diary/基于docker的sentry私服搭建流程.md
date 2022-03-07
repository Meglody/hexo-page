---
title: 基于docker的sentry私服搭建流程
author: 卡西猫倒
email: 30755703@qq.com
date: 2022-03-07 10:25:37
updated: 2022-03-07 13:09:44
tags:
- 运维
- docker
- docker-compose
- sentry
categories:
- 笔记
readmore: true
---

> 本搭建流程基于`docker`和`docker-compose`，以下为我使用的环境版本：
> - docker：20.10.12
> - docker-compose：1.29.2
> - sentry：self-hosted(22.1.0)(https://github.com/getsentry/self-hosted/releases/tag/22.1.0)
> - python: python@3.6

<!-- more -->

### Requirements

官方指定的主机入门配置，如果主机没有这个配置，真的会很卡

* Docker 19.03.6+
* Compose 1.28.0+
* 4 CPU Cores
* 8 GB RAM
* 20 GB Free Disk Space

## 1. 本地运行

### 1. 下载解包

首先下载release的包，并解压缩

```shell
wget https://github.com/getsentry/self-hosted/archive/refs/tags/22.1.0.tar.gz
tar -zxvf 22.1.0.tar.gz
cd self-hosted-22.1.0/
```

### 2. 安装基本配置

> Sentry uses Python 3 by default since December 4th, 2020 and Sentry 21.1.0 is the last version to support Python 2.

由于这一条你得在本地环境使用python3来执行安装脚本，题主使用的是python@3.6。

当然运行之前，你得先看一下`sentry/sentry.config.example.py`的配置，包含：

- 持久化、缓存和redis等的基本配置
- 消息队列的基本配置
- 基于clickhouse的snuba配置
- web服务的基本配置
- SSL/TLS的基本配置（如果你要部署到某个域名并且启用https，这里之后要改）

这里建议复制一份名叫`sentry.config.py`的文件来自定义你的配置。

```shell
mv ./sentry.config.example.py ./sentry.config.py
```

同样的，`sentry/config.yml`的配置中也有一些需要更改的，例如你的邮件服务：

```yml
# Mail Server #
###############

# mail.backend: 'smtp'  # Use dummy if you want to disable email entirely
mail.host: 'smtp'
mail.port: 465
mail.username: 'example'
mail.password: '********'
mail.use-tls: true
# mail.use-ssl: false

# NOTE: The following 2 configs (mail.from and mail.list-namespace) are set
#       through SENTRY_MAIL_HOST in sentry.conf.py so remove those first if
#       you want your values in this file to be effective!


# The email address to send on behalf of
mail.from: 'your-email-address@qq.com'
```

这里我例举的是qq邮箱的，实际要去qq邮箱去启用你的smtp订阅，password就是从qq邮箱开启订阅后获取的。

这些都配置完后，运行`self-hosted-22.1.0/`根目录的`install.sh`：

```shell
chmod +x ./install.sh
./install.sh
```

部署过程全程日志输出，`Fetching and updating Docker images`这过程需要拉取sentry所有组件的docker镜像，需要时间较多。
更多日志查看`sentry_install_log-yyyy-MM-dd_xx.txt`。
当出现`"Would you like to create a user account now? [Y/n]:"`时，按提示创建登录账号，然后继续等待剩余部署。(如果长时间没出现这个提示，或者没注意这个提示可能会跳过，之后我们可以手动创建超级账号的)

之后等待一段时间的安装，完成后，会有这样一个提示：

```shell
-----------------------------------------------------------------

You're all done! Run the following command to get Sentry running:

  docker-compose up -d

-----------------------------------------------------------------

```

说明安装结束。

> 以上步骤创建登录账号被跳过的看过来：手动创建超级管理员，运行: `docker-compose run --rm web upgrade`

### 3. docker-compose

此时你的服务已经可以在本地启动了，基于镜像的容器配置都在根目录`docker-compose.yml`下，如需更改，例如nginx配置等，可以在这里更改，更改完之后，运行一次`docker-compose build`即可。

#### 使用默认配置启动服务
```shell
docker-compose up -d
```

#### 查看容器运行状态
```shell
docker ps
```

#### 如果更改某个容器的文件了，例如nginx/nginx.conf
```shell
docker restart (CONTAINER ID)
```

#### 查看某个服务的日志
```shell
docker logs (CONTAINER ID)
```

#### 进入某个容器（例如看看nginx的映射文件夹是不是正确）
```shell
docker exec -it (CONTAINER ID) /bin/sh
# 或者
docker exec -it (CONTAINER ID) /bin/bash
```

## 2. 如果要部署上线

你需要更改的一些地方：

- sentry/config.yml

```yml
# 这里将项目的前缀修改为你的域名
system.internal-url-prefix: 'https://sentry.example.com'
system.url-prefix: 'https://sentry.example.com'
```

- sentry/sentry.config.py (这里改完建议`重新运行一下install.sh`)

```py
# 找到这一块
###########
# SSL/TLS #
###########

# If you're using a reverse SSL proxy, you should enable the X-Forwarded-Proto
# header and enable the settings below

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SOCIAL_AUTH_REDIRECT_IS_HTTPS = True

# End of SSL/TLS settings
```

- docker-compose.yml（这个改完需要重新`docker-compose build`之后再`docker-compose up -d`）

```yml
nginx:
    <<: *restart_policy
    ports:
      #这里把默认的"$SENTRY_BIND"改为真实的你想运行的外部端口号
      #不然上线之后你也只能通过http://sentry.example.com:9000访问，并且CSRF验证会认为你不是来自同域的请求
      - 80:80/tcp
      #同理，这里是https的外部端口号
      - 443:443/tcp
    image: "nginx:1.21.5-alpine"
    volumes:
      - type: bind
        read_only: true
        source: ./nginx
        target: /etc/nginx
      #如果有别的文件夹需要在nginx配置中用到的，这里做好实体机和宿主机的映射
    #   - type: bind
    #     read_only: true
    #     source: ../homepage
    #     target: /etc/homepage
    depends_on:
      - web
      - relay
```

- nginx/nginx.conf（这里是我的nginx配置，修改完运行`docker restart (nginx container id)`）

```nginxconf
server {
    listen 80;
    server_name sentry.example.com;
    rewrite ^(.*)$ https://${server_name}$1 permanent;
}

server {
    listen 443 ssl;
    server_name sentry.example.com;

    # 注意这里的certificate/要在docker-compose.yml的nginx容器配置项中做好镜像，我的certificate/就在实体机的nginx/目录下，所以可以直接拿到
    ssl_certificate "certificate/sentry.example.com.crt";
    ssl_certificate_key "certificate/sentry.example.com.key";
    ssl_session_timeout 5m;
    ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!RC4:!DHE;
    ssl_prefer_server_ciphers on;

    location /api/store/ {
        proxy_pass http://relay;
    }
    location ~ ^/api/[1-9]\d*/ {
        proxy_pass http://relay;
    }
    location / {
        proxy_pass http://sentry;
    }
}
```

做完以上步骤，如果你的服务器安全组正确开启了`80`和`443`的`TCP`端口，并且证书做好了`解析`并`部署`在服务器上了，应该就可以愉快的使用sentry了！