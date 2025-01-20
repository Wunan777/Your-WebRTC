# How to setup your WebRTC

## Run HTTP Server && Signaling Server

```
HOST=127.0.0.1 PORT=3000 node index.js
```

## Run STUN && TURN Server

1. Install coturn , Example in Linux

```
apt install coturn
```

2. Config Coturn Server

vim /etc/turnserver.conf and edit

(more detail: https://blog.csdn.net/qq_38428433/article/details/145372771?spm=1001.2014.3001.5502)

```
# 服务器 ip 相关信息
listening-ip=0.0.0.0 # 服务器监听的IP地址，`0.0.0.0`表示监听所有可用的网络接口。
listening-port=3000 # 服务器监听的端口号，用于非TLS连接
tls-listening-port=5349 # 服务器监听的端口号，用于TLS连接
cert=/etc/turn_cert.pem # TLS证书文件路径
pkey=/etc/turn_key.pem  # TLS私钥文件路径
cipher-list="DEFAULT" # TLS 加密套件列表
no-sslv3 # 禁用SSLv3
no-tlsv1 # 禁用TLSv1
external-ip=123.56.56.123/172.22.14.243 # 服务器的外部IP地址，用于客户端连接， 注意 / 后跟内网IP地址
realm=123.56.56.56.123 # 服务器的域名或IP地址，用于STUN和TURN协议
min-port=49152 # TURN服务器的最小端口号
max-port=65535 # TURN服务器的最大端口号

# 权限认证 相关信息
fingerprint # 启用指纹机制，用于消息完整性检查。
lt-cred-mech # 启用长期凭证机制，用于用户认证。
user=username:password # 用户名和密码，用于用户认证。
# 在Coturn配置中，`nonce`是一个用于防止重放攻击的随机数。`stale-nonce`配置项用于设置`nonce`的过期时间，单位为秒。`nonce`机制确保每个请求都有一个唯一的标识符，从而提高安全性。
stale-nonce=600 #  Nonce的过期时间，单位为秒。
no-cli # 禁用CLI客户端

# 日志
log-file=/var/log/turn.log
simple-log
verbose # 输出详细日志
```

3. Run Coturn Server,

```
turnserver --log-file stdout
```
