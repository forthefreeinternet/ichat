# genal-chat-client

## 去中心化后端开发记录

为了方便切换前端架构，代码严格前后端分离，后端的存储调用等不采用前端所用的vuex。例如，全局变量储存在controller/global.js下。数据接口放在api/modules文件夹中，该api为针对该前端特殊设计，而controller下的后端文件应采用独立于任意一种前端架构的设计。

数据存储采用indexedDB，因为indexedDB的存储空间高达设备容量的至少18%，同时可以存储Object等类型的数据。IndexedDB的数据可以在localStorage相同的位置找到。最终代码采用IndexedDB的高级封装localforage。localforage的api和local Storage相同，功能和indexedDB相同。在浏览器不支持indexedDB的情况下，localforage退化为localStorage，将各种类型数据序列化为字符串后保存。

聊天由webRTC实现，现阶段采用trystero的joinroom实现。demo在controller/group.js中。



```
### 运行项目
1. 前端项目
```js
cd genal-chat-client 
npm i
npm run serve
```
注：有一些node包我下载的时候可能忘记save了，如有缺漏请运行：
```js
npm install '包名' --save
```

测试：打开两个页面，注册不同账号，观察localstorage，在服务群中发消息。
