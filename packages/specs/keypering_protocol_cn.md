Keypering是个新的尝试，定位是一个架设在Keyper之上的桌面型轻量钱包，方便与dApp进行交互，为开发者快速开发基于ckb的dApp提供工具支持。

关于Keyper Scatter，以及Keyper Scatter与dApp的交互方式，请阅读[这篇文章](https://talk.nervos.org/t/keyper-scatter-dapp/4430)。

当前Keypering还在开发中，主git repo: https://github.com/liusong1111/keypering, client sdk: https://github.com/liusong1111/keypering-core

本文重点描述Keypering和dApp的交互协议，欢迎大家提意见。



## JSONRPC over HTTP

本协议遵循JSON-RPC规范

https://www.jsonrpc.org/specification

Keypering作为http api server，dApp作为http api client。

参考：ckb-rich-node RPC也遵循HTTP / JSON-RPC协议：[ckb-rich-node](https://github.com/ququzone/ckb-rich-node)

术语：

id: 数字或string，符合JSON-RPC的语义。由dApp生成，用来标记和跟踪一组request/response，不能为空。

token:  64 byte string。当Auth请求授权成功后，Keypering返回token，dApp要将其用于后续请求的header中：

```
Authorization: Bearer <token>
```

如果http request header中没有Authorization或者无效，Keypering会首先弹出一个授权窗口，请用户授权。授权成功后，Keypering再进行后续操作。

返回值中`result.token` 为授权成功后的token值，客户端可选择持久化到本地，后续请求时在http header中带上，以避免每次都需要用户授权。

### Auth

请求对指定的origin授权

- Request
  - description(string, optional) - dApp的描述

```json
{
  "id": 2,
  "jsonrpc": "2.0",
  "method": "auth",
  "params": {
    "description": "a dApp demo"
  }
}
```

- Response
  - token(string) - 用户授权后，Keypering返回的授权token，用于放到后续请求的http header Authorization中

```json
{
  "id": 2,
  "jsonrpc": "2.0",
  "result": {
    "token": "xxxxxxxxxxxxxxxxxxxx"
  }
}
```

* Errors

  * 当用户拒绝本次请求后，Keypering发回:

    ```json
    {
      "id": 2,
      "jsonrpc": "2.0",
      "error": {
        "code": 1001,
        "message": "rejected"
      }
    }
    ```

  * dApp注意处理连接关闭或超时的情况，下同

### Query Addresses

返回当前钱包的地址列表

- Request

```json
{
  "id": 2,
  "jsonrpc": "2.0",
  "method": "query_addresses",
  "params": {
    
  }
}
```

- Response
  - token(string) - 本次请求使用的token，有可能是通过http header传入的，也有可能是本次请用户手工授权获得的
  - userId(string, hash64) - 用户ID，根据publicKey等计算得出，以供dApp对多个地址标记为同一用户
  - addresses(array)
    - address(string) - 地址
    - lockHash(string) - 对lockScript取hash得来，用于后续sign/signSend接口中使用
    - lockScript(Script) 
    - publicKey(string)
    - lockScriptMeta
      - name: LockScript类型名
      - cellDeps: 用于组装交易
      - headerdeps: 用户组装交易

```json
{
  "id": 2,
  "jsonrpc": "2.0",
  "result": {
    "token": "xxxxxxxxxxxxxxxxxxxx", 
    "userId": "XXXXXXXXXXXXXXXXX",  
    "addresses": [
      {
        "address": "XXXXXXXXXXXXXXXX",
        "lockHash": "XXXXXXXXXXXXXXXX",
        "lockScript": {
          "codeHash": "XXXXXXXXXXXXXXXX",
          "hashType": "XXXXXXXXXXXXXXXX",
          "args": "XXXXXXXXXXXXXXXX"
        },
        "publicKey": "XXXXXXXXXXXXXXXX",  
        "lockScriptMeta": {
          "name": "Secp256k1",
          "cellDeps": [
            {
              "outPoint": {
                "txHash": "XXXXXXXXXXXXXXXX",
                "index": "0x0"
              },
              "depType": "XXXXXXXXXXXXXXXX"
            }
          ],
          "headerDeps": [
              
          ]  
        }
      }
    ]
  }
}
```

* Errors

  * 1002 / invalid_token
  * 注意处理连接断开或超时的情况

  

### Sign Transaction

签名交易。

用户组装好交易，通过本接口请求签名。

Keypering会在UI上展示交易信息，用户输入密码点击签名后，Keypering将签名后的交易返回给调用端。

- Request
  - tx(TX_IN_JSON, required) - 待签名的transaction对象
  - lockHash(string, required) -  用lockHash来定位签名使用的私钥和签名算法。lockHash从query_addresses接口中获取
  - inputSignConfig(optional) - 不传或null表示全签
    - index(number) - inputs数组从第几个开始签名，0表示从第一个开始
    - length(number) - inputs数组连续签几个，-1表示到结尾
  - description(string, optional) - 交易描述

```json
{
  "id": "2",
  "jsonrpc": "2.0",
  "method": "sign_transaction",
  "params": {
    "tx": TX_IN_JSON,
    "lockHash": "XXXXXXXXXXXXXXXX",
    "description": "transaction description",      
    "inputSignConfig": {
      "index": 0,
      "length": -1
    }
  }
}
```

- Response
  - tx: 签名后的Transaction对象

```json
{
  "id": 2,
  "jsonrpc": "2.0",
  "result": {
    "token": "XXXXXXXXXXXXXXXX",  
    "tx": TX_SIGNED_IN_JSON
   }
}
```

* Errors
  * 1001 / rejected
  * 1002 / invalid_token

### Send Transaction

发送交易。

dApp将已经签名的交易传给本接口，Keypering会在UI上展示交易信息，用户点击Send后，Keypering将该交易发送到网络，并返回交易hash。

- Request
  - tx(TX_SIGNED_IN_JSON, required): 通过Sign Transaction接口或其它途径构建的已签名交易对象
  - description(string, optional) - 交易描述

```json
{
  "id": "2",
  "jsonrpc": "2.0",
  "method": "send_transaction",
  "params": {
    "description": "transaction description",
    "tx": TX_SIGNED_IN_JSON
  }
}
```

- Response
  - txHash(string) - 交易hash

```json
{
  "id": 2,
  "jsonrpc": "2.0",
  "result": {
    "token": "XXXXXXXXXXXXXXXX",  
    "txHash": "XXXXXXX"
  }
}
```

* Errors
  * 1001 / rejected
  * 1002 / invalid_token
  * 3001 / error_send_transaction:<具体错误信息>

### Sign and Send

签名并发送交易。

当dApp组装好交易，通过本接口请求签名，Keypering会在UI上展示交易信息，用户签名后，Keypering将签名交易发送到网络，并返回txHash。

本质上是Sign Transaction和Send Transaction依次执行

- Request
  - tx(TX_IN_JSON, required) - 待签名的transaction对象
  - lockHash(string, required) -  用lockHash来定位签名使用的私钥和签名算法。lockHash从query_addresses接口中获取
  - inputSignConfig(optional) - 不传或null表示全签
    - index(number) - inputs数组从第几个开始签名，0表示从第一个开始
    - length(number) - inputs数组连续签几个，-1表示到结尾
  - description(string, optional) - 交易描述

```json
{
  "id": "2",
  "jsonrpc": "2.0",
  "method": "sign_transaction",
  "params": {
    "tx": TX_IN_JSON,
    "lockHash": "XXXXXXXXXXXXXXXX",
    "description": "transaction description",      
    "inputSignConfig": {
      "index": 0,
      "length": -1
    }
  }
}
```

- Response
  - tx: 签名后的Transaction对象
  - txHash: 签名后的Transaction对象的Hash

```json
{
  "id": 2,
  "jsonrpc": "2.0",
  "result": {
    "token": "XXXXXXXXXXXXXXXX",  
    "tx": TX_SIGNED_IN_JSON,
    "txHash": "XXXXXXX"
  }
}
```

* Errors
  * 1001 / rejected
  * 1002 / invalid_token
  * 3001 / error_send_transaction:<具体错误信息>



### Errors

| code | message                               | 描述                                                         |
| ---- | ------------------------------------- | ------------------------------------------------------------ |
| 1001 | rejected                              | 被用户拒绝                                                   |
| 1002 | invalid_token                         | 无效token（例如申请token时的origin和当前请求页面不一致）     |
| 3001 | error_send_transaction:<具体错误信息> | 发送交易失败:<具体错误信息>，当发送交易失败时，具体错误信息为ckb rpc返回的错误描述 |

keypering client应该处理http连接断开或超时的情况：

* 连接断开
  如果发起请求后，Keypering被手工关闭，则dApp被断开连接

* 请求超时

  如果发起请求后，Keypering在指定时间内没有返回结果，则dApp收到408 Request Timeout

