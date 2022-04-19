# ichat 去中心化聊天网页

webRTC是由各大主流浏览器支持的网络点对点通信协议。传统的网站，是浏览器和服务器连接，而webRTC可以让通信双方的浏览器直接连接。

以太坊区块链是一种公用计算机，使用者可以编写程序并将程序发布到网络上，这些程序可以在这个公用计算机上运行。特别的，我们可以在公用计算机上建立公共数据库。

依靠这两种工具，我们可以不依靠服务器实现通信。现在有很多点对点聊天项目，但它们都无法做到单离线：如果信息接收方离线，发送方就无法发送信息了。而ichat通过“群友、好友帮忙传递消息”及“在以太坊区块链上发布消息”这两种手段，实现单离线通信。现有的点对点聊天网页都没有“微信好友管理功能”和“聊天记录保存功能”，ichat也一并将其实现。

### 运行项目

```js 
npm i
npm run serve
```
注：有一些node包我下载的时候可能忘记save了，如有缺漏请运行：
```js
npm install '包名' --save
```

测试：使用火狐firefox、谷歌Chrome、Edge、苹果Safari等浏览器，打开两个页面，注册不同账号，观察localstorage，在服务群中互发消息；退出一个账号，另外一个账号继续发消息，再重新登陆，观察聊天页面的更新。


## 前端架构

采用vuex。全局变量储存在store.state中，方便各子组件、store.action调用，且store.state的变动将触发各子组件的渲染更新；store.action是修改store.state的接口，store.action接受子组件及前后端数据接口的调用。store相关代码放在store/modules文件夹。

## 去中心化后端开发记录

### 总论
前后端数据接口放在api/modules文件夹中，该api为针对该前端特殊设计，而controller下的后端文件应采用独立于任意一种前端架构的设计。为了方便切换前端架构，代码严格前后端分离，后端的存储调用等不采用前端所用的vuex。例如，后端全局变量储存在controller/global.js下。

### 账号创建及加密
用以太坊的npm包web3.js实现。当用户注册时，根据输入的账号密码及当前时间，生成一个以太坊账号。该账号具有一个私钥。它是用户的公开账号。敏感信息需要经过加密后保存在本地，聊天信息也需要经过私钥签名（待实现）。

### 数据库
数据存储采用indexedDB，因为indexedDB的存储空间高达设备容量的至少18%，同时可以存储Object等类型的数据。IndexedDB的数据可以在localStorage相同的位置找到。

采用IndexedDB的封装localforage来保存用户相关信息。localforage的api和local Storage相同，功能和indexedDB相同。在浏览器不支持indexedDB的情况下，localforage退化为localStorage，将各种类型数据序列化为字符串后保存。

采用IndexedDB的封装DexieDB保存群聊信息、好友信息及聊天记录。它支持的查询和修改手段较为多样，但仍不完善。

### 通信
数据通信采用三种策略：

1. 服务器

2. 基于浏览器的webRTC，让不同用户通过浏览器进行点对点通信。现阶段采用trystero的joinroom实现。demo在controller/group.js中。每个房间都注册以下服务：信息发送服务、私聊信息服务、获取聊天记录服务。每个服务包含两个函数，一是发送函数，二是接收函数。当用户发送“获取聊天记录服务”时，其他房间成员像该用户回发给定时间后的群聊记录。

3. ETH Rinkeby测试链的智能合约。这是单离线状态的最后手段，开销较大。

## 具体工作流程

### 进入群聊

登陆后进行初始化，随后store/modules/chat/actions.ts中handleChatData()函数调用数据接口：
```js
groupApi.joinGroupSocket( {
            groupId: group.groupId,
            userId: user.userId,
          })

```

数据接口调用controller/group.js中joinGroupSocket()，再调用roomInit()，加入webRTC房间：
```js
import {joinRoom, selfId} from 'trystero'

//Establish a webRtc room, and access it by appId and roomId
const config = {appId: 'ichat'}
const room = joinRoom(config, roomId)//roomId是群id，群成员通过独特的群id加入同一个webRTC房间
```

该房间注册一对消息函数
```js
// register message service
const [sendMessage, getMessage] = room.makeAction('message')
getMessage(function(message, id){
    //这个回调函数将接受的消息转发给receiveGroupMessage()函数处理
 })
 global.roomObjects[roomId] = {object:room,
                  sendMessage: sendMessage,
                }//将sendMessage函数保存为全局对象

```

### 发送群聊消息

1. 前端：点击发送或回车，GenalInput.vue中sendMessage()函数调用数据接口

```js
groupApi.sendGroupMessage({
        userId: this.user.userId, //发送消息的用户id，是以太坊账号地址
        groupId: this.activeRoom.groupId, //当前激活的聊天窗口的id
        content: data.message, //消息内容
        width: data.width,
        height: data.height,
        messageType: data.messageType, //有文字和图片两种类型
      })
```

2. 数据接口调用controller/group.js中sendGroupMessage()函数，web3的哈希函数对数据计算哈希值：

```js
data.hash = global.web3.eth.accounts.hashMessage(group.lastMessage + data.groupId + data.content + data.time) //group.lastMessage是这个群聊中发送消息的用户上一条消息的哈希值
```

用私钥签名该哈希值：

```js
let signatureObject = global.web3.eth.accounts.sign(data.hash, global.user.privateKey);  
```

然后将上一条消息哈希、本条消息哈希、数字签名合并到数据中，通过webRTC房间注册的发送函数发送数据：
```js
global.roomObjects[data.groupId].sendMessage(data)
```

### 接收群聊消息




## 安全验证系统

### 异或加密

传统异或加密，需要密钥比原文长，且密钥不能重复使用。而ichat使用的异或加密函数XORencryption，不要求密钥的长度。这是因为我们给密钥逐次加值再哈希，生成任意长的密钥，这样香农对原始异或加密的信息熵的论文仍能成立。

哈希函数unicodeHash：以太坊web3.eth.accounts.hashMessage，再将生成的十六进制数转换成Unicode。
输入：原文val, 密钥key, 是否将密文转为Base64储存（默认是）, 哈希函数hash（默认unicodeHash）
1.判断密钥哈希值长度：hash(key).length
2.将原文分割为多段，除最后一段外，每段与hash(key).length等长
3.对于第i段原文，生成变换密钥hash(key+'i')，此时变换密钥与该段原文等长。将这两段数据的对应Unicode字符转换为整数，并求异或。
4.将结果转换为对应的Unicode字符。
5.将Unicode字符串转换为Base64。


<a href="https://iconscout.com/icons/file" target="_blank">File Icon</a> on <a href="https://iconscout.com">Iconscout</a>