# ichat

```
### 运行项目
1. 前端项目
```js 
npm i
npm run serve
```
注：有一些node包我下载的时候可能忘记save了，如有缺漏请运行：
```js
npm install '包名' --save
```

测试：打开两个页面，注册不同账号，观察localstorage，在服务群中发消息。


## 前端架构

采用vuex。全局变量储存在store.state中，方便各子组件、store.action调用，且store.state的变动将触发各子组件的渲染更新；store.action是修改store.state的接口，store.action接受子组件及前后端数据接口的调用。store相关代码放在store/modules文件夹。

## 去中心化后端开发记录

### 总论
前后端数据接口放在api/modules文件夹中，该api为针对该前端特殊设计，而controller下的后端文件应采用独立于任意一种前端架构的设计。为了方便切换前端架构，代码严格前后端分离，后端的存储调用等不采用前端所用的vuex。例如，后端全局变量储存在controller/global.js下。

### 账号创建及加密
当用户注册时，根据输入的账号密码及当前时间，生成一个以太坊账号。该账号具有一个私钥。它是用户的公开账号。敏感信息需要经过加密后保存在本地，聊天信息也需要经过私钥签名（待实现）。

### 数据库
数据存储采用indexedDB，因为indexedDB的存储空间高达设备容量的至少18%，同时可以存储Object等类型的数据。IndexedDB的数据可以在localStorage相同的位置找到。最终代码采用IndexedDB的高级封装localforage。localforage的api和local Storage相同，功能和indexedDB相同。在浏览器不支持indexedDB的情况下，localforage退化为localStorage，将各种类型数据序列化为字符串后保存。

### 通信
数据通信采用三种策略：

1. 服务器

2. 基于浏览器的webRTC，现阶段采用trystero的joinroom实现。demo在controller/group.js中。每个房间都注册以下服务：信息发送服务、私聊信息服务、获取聊天记录服务。每个服务包含两个函数，一是发送函数，二是接收函数。当用户发送“获取聊天记录服务”时，其他房间成员像该用户回发给定时间后的群聊记录。

3. ETH Rinkeby测试链的智能合约。这是单离线状态的最后手段，开销较大。
