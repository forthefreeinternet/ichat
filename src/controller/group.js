import Web3 from 'web3'
import groupApi from './../api/modules/group'
import initController from './init'
import ethController from './eth'
import utilsController from './utils'
import blockController from './block'
import messageController from './message'
import global from './global'
import Dexie from "dexie";
// const GROUP_USER = require('./../models/group').groupUser
// const GROUP = require('./../models/group').group
// const ACCOUNTBASE = require('./../models/accountpool')
// const { insertNewGroupNews } = require('./groupNews')
import store from './../store/index'
import { RCode } from './../common/constant/rcode';
import { service } from './../common/constant/service';
import { nameVerify } from './../common/tool/utils';

import {joinRoom, selfId} from 'trystero'
import EthCrypto from 'eth-crypto';
import WebTorrent from 'webtorrent'
import SHA256  from 'crypto-js/sha256'

import localforage from 'localforage'

const getMyGroup = (req, res) => { // 获取我的群聊
  let { userName } = req.query
  GROUP_USER.findGroupByUserName(userName).then(doc => {
    return res.json({
      status: 2000,
      data: doc,
      msg: '获取群聊成功'
    })
  }).catch(err => {
    return res.json({
      status: 2003,
      data: err,
      msg: '服务端错误，请稍后重试！'
    })
  })
}

const getRecentGroup = async (req, res) => {
  const { userId, groupIds } = req.body
  console.log(userId, groupIds, '最近群里啊')
  const groups = await GROUP_USER.find({
    groupId: { $in:  groupIds },
    userId: userId
  }).populate('groupId')
  console.log(groups)
  return res.json({
    status: 2000,
    data: groups,
    msg: '获取成功！'
  })
}

const getGroupInfo = (req, res) => { // 获取群聊详情
  let { id } = req.query
  GROUP.find({_id: id}).then(group => {
    if (group.length) {
      GROUP_USER.findGroupUsersByGroupId(id).then(users => {
        return res.json({
          status: 2000,
          data: {group, users},
          msg: '获取群聊详情成功'
        })
      })
    } else {
      return res.json({
        status: 2001,
        data: '',
        msg: '未获取到群聊信息'
      })
    }
  }).catch(err => {
    console.log(err)
    return res.json({
      status: 2003,
      data: err,
      msg: '服务端错误，请稍后重试！'
    })
  })
}

const searchGroup = async (req, res) => { // 在客户端搜索群聊
  const { type, q, page, pageSize } = req.query
  GROUP.searchGroup( type, q, page, pageSize ).then(doc => {
    return res.json({
      status: 2000,
      data: doc,
      msg: 'success'
    })
  }).catch(err => {
    return res.json({
      status: 2003,
      data: err,
      msg: '服务器错误，请稍后重试！'
    })
  })
}

// 给群聊添加新成员
const addNewGroupUser = (data) => {
  const { userId, groupId, userName } = data
  GROUP_USER.findOne({
    userId: userId,
    groupId: groupId
  }).then(doc => {
    console.log('doclength', doc)
    if (!doc) {
      GROUP_USER.insertMany(data).then(doc => {
        GROUP.update({
          _id: groupId
        }, { $inc: {userNum: 1} })
        const sysTipsNews = {
          roomid: groupId,
          message: `${userName}加入群聊`,
          messageType: 'sys',
          isReadUser: []
        }
        insertNewGroupNews(sysTipsNews)
      })
    }
  }).catch(err => {
    return res.json({
      status: 2003,
      data: err,
      msg: '服务器错误，请稍后重试！'
    })
  })
}

// 创建群聊
// const createGroup = async (req, res) => {
//   try {
//     const account = await ACCOUNTBASE.findOne({status: '0', type: '2'})
//     await ACCOUNTBASE.findOneAndUpdate({
//       code: account.code
//     }, {
//       status: '1'
//     })
//     console.log('req body', account)
//     const { title, desc = '', holderName, holderUserId } = req.body
//     const img = req.body.img || '/img/zwsj5.png'
//     const newGroup = {
//       title,
//       desc,
//       img,
//       code: account.code,
//       holderName,
//       holderUserId
//     }
//     const groupData = await GROUP.insertMany(newGroup)
//     const newGroupUserMember = {
//       groupId: groupData[0]._id,
//       userId: holderUserId,
//       userName: holderName,
//       manager: 0,
//       holder: 1,
//       card: ''
//     }
//     const groupUserData = await GROUP_USER.insertMany(newGroupUserMember)
//     return res.json({
//       status: 2000,
//       data: {
//         groupData,
//         groupUserData
//       }
//     })
//   } catch (error) {
//     return res.json({
//       status: 2003,
//       data: error,
//       msg: '服务器错误，请稍后重试！'
//     })
//   }
// }

// 获取所有群聊
const getAllGroup = async (req, res) => {
  const groupList = await GROUP.find().populate({path: 'holderUserId', select: 'nickname photo signature'})
  return res.json({
    status: 2000,
    data: groupList,
    msg: '获取成功！'
  })
}

const createGroup = async(data) => {
  const web3 = global.web3
  

  //const isUser = await this.userRepository.findOne({userId: data.userId});
    if(true) {

      //验证
      const isHaveGroup = await global.db.groupRepository.where({ groupName: data.groupName }).first();
      if (isHaveGroup) {
        //this.server.to(data.userId).emit('addGroup', { code: RCode.FAIL, msg: '该群名字已存在', data: isHaveGroup });
        groupApi.clientAddgroup( { code: RCode.FAIL, msg: '该群名字已存在', data: isHaveGroup })
        return;
      }
      if(!nameVerify(data.groupName)) {
        return;
      }

      //生成管理账户，再用管理账户生成群账户
      let adminAccount = web3.eth.accounts.create();
      const entropy = Buffer.from(adminAccount.address + adminAccount.address + adminAccount.address + adminAccount.address, 'utf-8'); // must contain at least 128 chars
      let account =  EthCrypto.createIdentity(entropy);
      data.groupId = account.address
      //为群账户充值
      //ethController.sendFund(global.user.privateKey, account.address, '10000000000000000')
      data.adminPrivateKey = adminAccount.privateKey
      data.privateKey = account.privateKey
      console.log(account)
      console.log(adminAccount)
      //设置peer信息的密码
      const SDPpassword =  global.web3.eth.accounts.hashMessage(account.privateKey)
      data.SDPpassword = SDPpassword
      //设置自动下载文件的大小
      data.autoDownloadSize = 10*1000*1000

      //建立webRTC房间
      //client.join(data.groupId);
      roomInit( data.groupId);

      //初始化群信息、群主信息、第一条消息
      const group = {groupId: data.groupId , userId:  data.userId,  groupName: data.groupName, createTime: new Date().valueOf()}
      const creator = {username: global.user.username,
                       userId: global.user.userId,
                       avatar: ''}//global.user.avatar}
      let firstMessage = {} 
      firstMessage.messageType = 'admin'           
      firstMessage.time = group.createTime -1 
      firstMessage.content = {
        type: 'setOwner',
        userId: data.userId
      }
      firstMessage.preHash = ''
      firstMessage.hash = global.web3.eth.accounts.hashMessage(firstMessage.preHash + firstMessage.groupId + firstMessage.content + firstMessage.time)
      let signatureObject = global.web3.eth.accounts.sign(firstMessage.hash, global.user.privateKey);  
      firstMessage.signature = signatureObject.signature
    

      //保存群聊信息、群成员信息、群创世块
      global.db.groupRepository.add(data);
      global.db.groupUserRepository.add({groupId:data.groupId , userId: data.userId})
      blockController.generateGenesisBlock(adminAccount, account, group, creator, firstMessage)

      //前端显示
      
      //this.server.to(group.groupId).emit('addGroup', { code: RCode.OK, msg: `成功创建群${data.groupName}`, data: group });
      groupApi.clientAddgroup({ code: RCode.OK, msg: `成功创建群${data.groupName}`, data: group })
      //this.getActiveGroupUser();
      getActiveGroupUser(); 
    } else{
      this.server.to(data.userId).emit('addGroup', { code: RCode.FAIL, msg: `你没资格创建群` });
    }

}

  // 加入群组的socket连接
 
  const joinGroupSocket= async( data) => {
    console.log('end222222')
    const group = await global.db.groupRepository.where({groupId: data.groupId}).first();
    const user = await global.db.userRepository.where({userId: data.userId}).first();
    if(true){//group && user) {
      //client.join(group.groupId);
      roomInit( data.groupId);
      const res = { group: group, user: user};
      //this.server.to(group.groupId).emit('joinGroupSocket', {code: RCode.OK, msg:`${user.username}加入群${group.groupName}`, data: res});
      groupApi.clientJoinGroupSocket({code: RCode.OK, msg:`${user.username}加入群${group.groupName}`, data: res})
    } else {
      //this.server.to(data.userId).emit('joinGroupSocket', {code:RCode.FAIL, msg:'进群失败', data:''});
      groupApi.clientJoinGroupSocket({code:RCode.FAIL, msg:'进群失败', data:''})
    }
  }


// 加入群组

const joinGroup = async(data) => {
  //--------------
  //这部分是本app的初代测试版本的代码
  // const group = { groupId: data.groupId , groupName: data.groupName}
  // const user = { userId: data.userId , username: data.username}
  // console.log(store)
  // store.dispatch('chat/joinGroup', {
  //   code: RCode.OK,
  //   msg: `${user.username}加入群${group.groupName}`,
  //   data: { group: group, user: user }
  // })
  //--------------

  //const isUser = await this.userRepository.findOne({userId: data.userId});
  if(true) {
    console.log(data)
    data.groupName = data.groupId.split(':')[0]
    data.groupId =  data.groupId.split(':')[1]
    const group = { groupId:data.groupId , groupName: data.groupName} //await this.groupRepository.findOne({ groupId: data.groupId }); 这里应该获取群详细信息
    console.log(group)
    let userGroup = await global.db.groupUserRepository.where({ groupId: group.groupId, userId: data.userId }).first();//***** */
    
    const user =  global.user//await this.userRepository.findOne({userId: data.userId});
    console.log(userGroup)
    
    if (group && user) {
      if (!userGroup) {
        //console.log('end3')
        data.groupId = group.groupId;
        console.log({groupId:data.groupId , userId: data.userId})
        const test = await global.db.groupUserRepository.toArray()
        console.log(test)
        global.db.groupRepository.add({groupId:data.groupId, groupName: data.groupName, createTime: Date.now(), autoDownloadSize: 10* 1000*1000});
        userGroup = await global.db.groupUserRepository.add({groupId:data.groupId , userId: data.userId});
        console.log('数据库保存群用户信息：', userGroup)
      }

      //client.join(group.groupId);
      const res = { group: group, user: user };    
      console.log(res)
      
      groupApi.clientJoinGroup({
          code: RCode.OK,
          msg: `${user.username}加入群${group.groupName}`,
          data: res
        }) 
      // this.server.to(group.groupId).emit('joinGroup', {
      //   code: RCode.OK,
      //   msg: `${user.username}加入群${group.groupName}`,
      //   data: res
      // });
      //this.getActiveGroupUser(); 
      getActiveGroupUser(); 
    } else {
      groupApi.clientJoinGroup({ code: RCode.FAIL, msg: '进群失败', data: '' })
      
    }
  } else {
    groupApi.clientJoinGroup({ code: RCode.FAIL, msg: '你没资格进群'});
  }
}


//接收同步请求
const deliverGroupSyncRequest = async(groupId, data, peerId, meta) => {
  switch(data.messageType){
    case 'fetchRecentSkeleton':
      blockController.deliverRecentBlocksRequest(groupId, data.content, peerId)
      break
    case 'fetchAllBlocks':
      blockController.deliverAllBlocksRequest(groupId, data.content, peerId)
      break
    case 'fetchAncestorNeighbors':
      blockController.deliverAncestorNeighborsRequest(groupId, data.content, peerId)
      break
    case 'fetchBlockByNumber':
      blockController.deliverBlockByNumberRequest(groupId, data.content, peerId)
      break
    case 'fetchUser':
      const user = await global.db.userRepository.where({userId: data.content.userId}).first()
      if(user){
        global.roomObjects[groupId].syncRequest({
          messageType: 'user',
          content: user
        },
        peerId)
      }else{
        global.roomObjects[groupId].syncRequest({
          messageType: 'user',
          content: 'failed'
        },
        peerId)
      }
      break
    case 'fetchFile':
      //做种
      let res = await global.db.fileRepository.where({hash: data.content.hash}).first()
      const client = new WebTorrent()
      const blob = new Blob([res.blob],  { type: data.content.type })
      const file = new File([ blob ], data.content.name, { type: data.content.type })
      client.seed(file,null,(torrent) => {
        console.log('收到文件请求，开始做种')
      })

      //直接发
      //这里应该首先检查一下自己的peerId是不是离文件infoHash比较近的，否则群用户多的话会消耗太多资源
      let distance = utilsController.XOR(global.web3.eth.accounts.hashMessage(global.roomObjects[groupId].selfId) , global.web3.eth.accounts.hashMessage(data.content.hash))
      console.log('和群成员索取的文件的距离', distance, parseInt(global.web3.eth.accounts.hashMessage(global.roomObjects[groupId].selfId), 16).toString(2), parseInt(global.web3.eth.accounts.hashMessage(data.content.hash),16).toString(2), global.web3.eth.accounts.hashMessage(global.roomObjects[groupId].selfId))
      let rank = 1
      for ( const peerId of global.roomObjects[groupId].room.getPeers()){
        if (utilsController.leq(utilsController.XOR(global.web3.eth.accounts.hashMessage(peerId),global.web3.eth.accounts.hashMessage(data.content.hash)), distance)){
          rank ++
        }
      }
      console.log('和群成员索取的文件的距离排名', rank)

      //为了避免网络堵塞，离文件哈希距离较近的用户才会发送文件
      if (rank < 4){
        
        if (res){
          if(res.type == 'blob'){
            console.log(res.blob)
            global.roomObjects[groupId].syncRequest(res.blob, peerId, {
              messageType: 'file',
              content: {
                    hash: res.hash,
                    type: res.blob.type,
                    //blob: res.blob,
                    time: res.time,
                    access: res.access,
                    name: res.name
              }
            })//把meta数据写在后面
          } 
        }else{
          global.roomObjects[groupId].syncRequest({
            messageType: 'file',
            content: 'failed'
          },
          peerId)
        }
      }

      
      break
    case 'file':
      if(data.content == 'failed'){
        //global.roomObjects[groupId].deliverFile[data.content.hash](null)
      }
        
      
    case 'info':
      break
    case 'user':
      if(data.content != 'failed'){
        global.roomObjects[groupId].deliverUser[data.content.userId](data.content)
      }else{
        //global.roomObjects[groupId].deliverUser[data.content.userId](null)
      }
    case 'recentBlocks':
      blockController.syncTasks[groupId].deliverRecentBlocks[peerId](data.content)
      break
    case 'allBlocks':
      blockController.syncTasks[groupId].deliverAllBlocks[peerId](data.content)
      break
    case 'block':
      blockController.syncTasks[groupId].deliverBlock[peerId](data.content)
      break
    case 'ancestorNeighbors':
      blockController.syncTasks[groupId].deliverAncestorNeighbors[peerId](data.content)
      break 
  }

  if(meta){
    switch(meta.messageType){
      case 'file':
        if(meta.content != 'failed'){  
          console.log('成功从群', groupId, '下载到文件', meta.content.name)
          
          if(global.roomObjects[groupId].deliverFile[meta.content.hash]){
            const blob = new Blob([data],  { type: meta.content.type })
            const file = new File([ blob ], meta.content.name, { type: meta.content.type })
            const client = new WebTorrent()
            global.roomObjects[groupId].uploadClients.push(client)
            global.roomObjects[groupId].clients.push(client)
            // //如果已经在做种了，会导致seed方法的回调函数不运行，因此要先看一下名字有没有重合
            // for(const torrent of global.roomObjects[groupId].torrentClient.torrents){
            //   for (const file of torrent.files){
            //     if (file.name == data.content.name){
            //       // let oldName = data.content.name.split('.')
            //       // oldName[oldName.length-2] = oldName[oldName.length-2] + '(1)'
            //       // data.content.name = oldName.join('.')
            //       global.roomObjects[data.groupId].torrentClient.remove(torrent.infoHash)
            //     }
            //   }
            // }
            client.seed(file, null, async(torrent) => {
              if( torrent.infoHash == meta.content.hash){
                console.log('哈希验证成功')
                global.db.fileRepository.put({
                  hash: meta.content.hash,
                  type: 'blob',
                  blob: blob,
                  time: meta.content.time,
                  access: groupId,
                  name: meta.content.name
                })
                console.log(blob)
                global.roomObjects[groupId].deliverFile[meta.content.hash](torrent.files[0])//blob)                 
              }
              else{
                console.log('哈希验证失败')
              }
            })
            
            
          }
          else{
            console.log('文件下载任务不存在')
          }
          
        }else{
          //global.roomObjects[groupId].deliverFile[data.content.hash](null)
        }
    }
  }
}

//webRTC房间注册的接收信息函数调用此函数
const receiveGroupMessage = async(roomId,data, userId) => {
  console.log('收到消息:',  data,'类型为：', data.messageType, '发送者为：', data.userId, '内容为：', data.content);  
  //console.log(userId, global.user.userId, global.web3.eth.accounts.recover(data.hash ,data.signature)); 

  //如果是自己发送的消息，不应该进入此函数
  if(data.userId != global.user.userId){ 
    console.log('开始验证消息')
    //验证消息开始
    //验证签名
    let signer
    
    try{
      signer = global.web3.eth.accounts.recover(data.hash ,data.signature )
    }catch{
      console.log('签名错误')
      return
    }
    console.log('签名正确')
    data.userId = signer//某些情况下消息可能省略发送者
    if ( signer != data.userId) {console.log('假签名', signer, userId);return}
    //验证个人id，群id及hash值
    //if( data.userId != userId) {console.log('信息的署名错误');return} //不需要是本人发，可以是转发
    if( data.groupId != roomId) {console.log('错群，原消息在', data.groupId, '，发到了', roomId);return}
    console.log('群聊正确') 
    if( data.hash != global.web3.eth.accounts.hashMessage(data.preHash + data.groupId + data.content + data.time)){ console.log('哈希值错误'); return}
    console.log('哈希值正确')
    //验证时间，消息发送时间不能超过当前时间
    if( data.time > Date.now()) {console.log('消息时间造假');return}
    //验证消息完毕
    console.log('消息验证通过')

    if(data.messageType == 'image'){
      
      let groupLastMessage = await global.db.groupMessageRepository.where('[groupId+time]').between(
        [ roomId, Dexie.minKey],
        [ roomId, Dexie.maxKey])
      .reverse().first()
      
      if(!groupLastMessage){
        groupLastMessage = {time: 0}
      }

      global.db.userRepository
        .where({ userId: signer })
        .first(async function(user){
          if(!user){
            user = await fetchUser(roomId, signer)
            if(user){
              global.db.userRepository.add(user)
              initController.getAllData(global.user)
            }
          }
        })

       
        let blob
        if (data.dataURL){
          console.log('消息里自带了图片dataURL')
          //如果收到的消息发送时间在已经保存的最后一条消息之前，则入库后重新获取数据渲染。这是去中心化app的特性，因为收到消息并不及时。
          console.log(data.time , '大于还是小于？', groupLastMessage.time)
          if(data.time > groupLastMessage.time){
            //存储到聊天记录数据库
            global.db.groupMessageRepository.add( data ).then(() => {
              console.log('保存了消息：', data)
              blockController.updateChain(roomId, data.time)
              console.log('前端渲染')
              const uiData = {
                userId: data.userId,
                groupId: roomId,
                content: data.content,
                dataURL: data.dataURL,
                width: data.width,
                height: data.height,
                messageType: data.messageType,
                hash: data.hash
              }
              groupApi.receiveGroupMessage(uiData) //调用前端函数进行渲染
            }).catch(function (err) {
              return console.log(data, '聊天记录存储错误' ,err);
            });
          }
          else{
            global.db.groupMessageRepository.add( data ).then(()=>
            {
              console.log('保存了旧消息：', data)
              blockController.updateChain(roomId, data.time)
              initController.getAllData(global.user)
              // console.log('前端渲染')
              // groupApi.receiveGroupMessage(roomId,data.content, userId) //调用前端函数进行渲染
            
            }
            ).catch(function (err) {
              return console.log('聊天记录存储错误' ,err);
            });
            
          }
        }
        else{
          const file = await messageController.fetchFile(data)
          await file.getBlob((err, res)=> {
            blob = res
            console.log('从远程自动获取了图片blob！')
            console.log(blob)
            try {
              var reader = new FileReader()
              if (blob) {
                reader.readAsDataURL(blob)
                reader.onload = async function(){
                  console.log(this.result)
                  data.dataURL = this.result

                  //如果收到的消息发送时间在已经保存的最后一条消息之前，则入库后重新获取数据渲染。这是去中心化app的特性，因为收到消息并不及时。
                  console.log(data.time , '大于还是小于？', groupLastMessage.time)
                  if(data.time > groupLastMessage.time){
                    //存储到聊天记录数据库
                    global.db.groupMessageRepository.add( data ).then(() => {
                      console.log('保存了消息：', data)
                      blockController.updateChain(roomId, data.time)
                      console.log('前端渲染')
                      const uiData = {
                        userId: data.userId,
                        groupId: roomId,
                        content: data.content,
                        dataURL: data.dataURL,
                        width: data.width,
                        height: data.height,
                        messageType: data.messageType,
                        hash: data.hash
                      }
                      groupApi.receiveGroupMessage(uiData) //调用前端函数进行渲染
                    }).catch(function (err) {
                      return console.log(data, '聊天记录存储错误' ,err);
                    });
                  }
                  else{
                    global.db.groupMessageRepository.add( data ).then(()=>
                    {
                      console.log('保存了旧消息：', data)
                      blockController.updateChain(roomId, data.time)
                      initController.getAllData(global.user)
                      // console.log('前端渲染')
                      // groupApi.receiveGroupMessage(roomId,data.content, userId) //调用前端函数进行渲染
                    
                    }
                    ).catch(function (err) {
                      return console.log('聊天记录存储错误' ,err);
                    });
                    
                  }
                }
                reader.onerror = function() {
                  console.log("load file error")
                }
                
              } else {
                console.log("file not found")
              }
            } catch (e) {
              console.log("file not found")
            }
          })
        }
        
        
        
       
      
      
      
      
      
      //判断该用户发送的前一条消息是否已收到
      if(data.preHash != data.groupId){//用户在群里发送的第一条消息，前置消息哈希是群id。若前置消息哈希是群id，则不用获取前面的消息
        const preMessage = await global.db.groupMessageRepository.where({hash: data.preHash}).first()//查询数据库中是否已经保存前一条消息
        if(!preMessage){
          console.log(preMessage)
          //这部分不应该废弃，因为前一区块有十几分钟延迟
          sendGroupMessage(
            {
              userId: global.user.userId,
              groupId: roomId,
              content: {key: 'hash', hash: data.preHash},
              messageType: 'fetchOldMessage',
            }
          )//向群内其他成员索取缺失的消息
        }
      }
      return
    }


    if(data.messageType == 'text' ){
      
      let groupLastMessage = await global.db.groupMessageRepository.where('[groupId+time]').between(
        [ roomId, Dexie.minKey],
        [ roomId, Dexie.maxKey])
      .reverse().first()
      
      if(!groupLastMessage){
        groupLastMessage = {time: 0}
      }

      global.db.userRepository
        .where({ userId: signer })
        .first(async function(user){
          if(!user){
            user = await fetchUser(roomId, signer)
            if(user){
              global.db.userRepository.add(user)
              initController.getAllData(global.user)
            }
          }
        })

        
       
      
      
      
      //如果收到的消息发送时间在已经保存的最后一条消息之前，则入库后重新获取数据渲染。这是去中心化app的特性，因为收到消息并不及时。
      console.log(data.time , '大于还是小于？', groupLastMessage.time)
      if(data.time > groupLastMessage.time){
        //存储到聊天记录数据库
        global.db.groupMessageRepository.add( data ).then(() => {
          console.log('保存了消息：', data)
          blockController.updateChain(roomId, data.time)
          console.log('前端渲染')
          const uiData = {
            userId: data.userId,
            groupId: roomId,
            content: utilsController.decodeXOR(data.content, data.groupId + data.time),
            width: data.width,
            height: data.height,
            messageType: data.messageType,
            hash: data.hash
          }
          groupApi.receiveGroupMessage(uiData) //调用前端函数进行渲染
        }).catch(function (err) {
          return console.log(data, '聊天记录存储错误' ,err);
        });
      }
      else{
        global.db.groupMessageRepository.add( data ).then(()=>
        {
          console.log('保存了旧消息：', data)
          blockController.updateChain(roomId, data.time)
          initController.getAllData(global.user)
          // console.log('前端渲染')
          // groupApi.receiveGroupMessage(roomId,data.content, userId) //调用前端函数进行渲染
        
        }
        ).catch(function (err) {
          return console.log('聊天记录存储错误' ,err);
        });
        
      }

      
      
      
      //判断该用户发送的前一条消息是否已收到
      if(data.preHash != data.groupId){//用户在群里发送的第一条消息，前置消息哈希是群id。若前置消息哈希是群id，则不用获取前面的消息
        const preMessage = await global.db.groupMessageRepository.where({hash: data.preHash}).first()//查询数据库中是否已经保存前一条消息
        if(!preMessage){
          console.log(preMessage)
          //这部分不应该废弃，因为前一区块有十几分钟延迟
          sendGroupMessage(
            {
              userId: global.user.userId,
              groupId: roomId,
              content: {key: 'hash', hash: data.preHash},
              messageType: 'fetchOldMessage',
            }
          )//向群内其他成员索取缺失的消息
        }
      }
      return
    }

    if(data.messageType == 'file'){
      
      let groupLastMessage = await global.db.groupMessageRepository.where('[groupId+time]').between(
        [ roomId, Dexie.minKey],
        [ roomId, Dexie.maxKey])
      .reverse().first()
      
      if(!groupLastMessage){
        groupLastMessage = {time: 0}
      }

      let user = await global.db.userRepository
        .where({ userId: signer })
        .first()
      if(!user){
        user = await fetchUser(roomId, signer)
        if(user){
          global.db.userRepository.add(user)
          initController.getAllData(global.user)
        }
      }
      
      
      //如果收到的消息发送时间在已经保存的最后一条消息之前，则入库后重新获取数据渲染。这是去中心化app的特性，因为收到消息并不及时。
      console.log(data.time , '大于还是小于？', groupLastMessage.time)
      if(data.time > groupLastMessage.time){
        //存储到聊天记录数据库
        global.db.groupMessageRepository.add( data ).then(() => {
          console.log('保存了消息：', data)
          blockController.updateChain(roomId, data.time)
          console.log('前端渲染')

          const uiData = {
            userId: data.userId,
            groupId: roomId,
            content: data.content,
            width: data.width,
            height: data.height,
            messageType: data.messageType,
            hash: data.hash
          }
          groupApi.receiveGroupMessage(uiData) //调用前端函数进行渲染
        }).catch(function (err) {
          return console.log(data, '聊天记录存储错误' ,err);
        });
      }
      else{
        global.db.groupMessageRepository.add( data ).then(()=>
        {
          console.log('保存了旧消息：', data)
          blockController.updateChain(roomId, data.time)
          initController.getAllData(global.user)
          // console.log('前端渲染')
          // groupApi.receiveGroupMessage(roomId,data.content, userId) //调用前端函数进行渲染
        
        }
        ).catch(function (err) {
          return console.log('聊天记录存储错误' ,err);
        });
        
      }

      global.db.groupRepository.where({groupId: data.groupId}).first((group) => {
        if( data.content.size ){
          if( data.content.size < group.autoDownloadSize){
            messageController.fetchFile(data)
          }
        }
        
      })
      
      //判断该用户发送的前一条消息是否已收到
      if(data.preHash != data.groupId){//用户在群里发送的第一条消息，前置消息哈希是群id。若前置消息哈希是群id，则不用获取前面的消息
        const preMessage = await global.db.groupMessageRepository.where({hash: data.preHash}).first()//查询数据库中是否已经保存前一条消息
        if(!preMessage){
          console.log(preMessage)
          //这部分不应该废弃，因为前一区块有十几分钟延迟
          sendGroupMessage(
            {
              userId: global.user.userId,
              groupId: roomId,
              content: {key: 'hash', hash: data.preHash},
              messageType: 'fetchOldMessage',
            }
          )//向群内其他成员索取缺失的消息
        }
      }
      return
    }

    if(data.messageType == 'user'){
      if(signer == data.content.userId){
        console.log('群用户信息更新: ', data.content)
        global.db.userRepository.put(data.content)
      }
    }

    //接收到索取旧消息的消息，在数据库中查找并发送旧消息
    if(data.messageType == 'fetchOldMessage'){
      //如果索取者是索取某条消息
      if( data.content.key == 'hash'){
        let preMessage = await global.db.groupMessageRepository.where({hash: data.content.hash}).first() //通过哈希值获取已经在聊天记录数据库的消息
        preMessage = {
          content: preMessage.content,
          groupId: preMessage.groupId,
          hash: preMessage.hash,
          messageType: preMessage.messageType,
          preHash: preMessage.preHash,
          signature: preMessage.signature,
          time: preMessage.time,
          userId: preMessage.userId,
        }
        
        global.roomObjects[data.groupId].sendMessage(preMessage, global.roomObjects[roomId].userIdsToIds[data.userId]) //该记录已经包含哈希值以及消息创建者的签名，直接通过webRTC房间注册的消息发送函数发送
      }
      //如果索取者是索取某段时间的消息
      if( data.content.key == 'time'){
        let oldMessages = await global.db.groupMessageRepository.where(['groupId' , 'time']).between( [data.groupId, data.content.time[0]],[data.groupId, data.content.time[1]]).toArray() //通过哈希值获取已经在聊天记录数据库的消息
        console.log('准备发送 ' , data.content.time , ' 之间的消息： ' , oldMessages)
        for(let index in oldMessages){
          delete oldMessages[index]._id
          global.roomObjects[data.groupId].sendMessage(oldMessages[index], global.roomObjects[roomId].userIdsToIds[data.userId]) //该记录已经包含哈希值以及消息创建者的签名，直接通过webRTC房间注册的消息发送函数发送
        }
      }
    }
  }
  
}

const fetchFile = async(data) => {
  if(true){//data.content.size < 1000 * 1000 * 1000){
    console.log('准备从群', data.groupId, '下载文件', data)
    const client = new WebTorrent()
    global.roomObjects[data.groupId].clients.push(client)
    //data.content.hash = 'https://ferrolho.github.io/magnet-player/#76ac8abef62ea2fc4c6cb0a8a1dc9a535e78ca7d'
    console.log(data.content.hash)
    var announceList = [
      ['udp://tracker.openbittorrent.com:80'],
      ['udp://tracker.internetwarriors.net:1337'],
      ['udp://tracker.leechers-paradise.org:6969'],
      ['udp://tracker.coppersurfer.tk:6969'],
      ['udp://exodus.desync.com:6969'],
      ['wss://tracker.webtorrent.io'],
      ['wss://tracker.btorrent.xyz'],
      ['wss://tracker.openwebtorrent.com'],
      ['wss://tracker.fastcast.nz']
      ]
      
      //global.WEBTORRENT_ANNOUNCE 
      announceList = announceList
      .map(function (arr) {
        return arr[0]
      })
      .filter(function (url) {
        return url.indexOf('wss://') === 0 || url.indexOf('ws://') === 0
      })
    client.add(data.content.hash.trim(), {announce: announceList},function(torrent){
      console.log('找到做种人', torrent.files[0])
      global.roomObjects[data.groupId].deliverFile[data.content.hash](torrent.files[0])
      torrent.files[0].getBlob((err, blob)=>{
        global.db.fileRepository.put({
          hash: data.content.hash,
          type: 'blob',
          blob: blob,
          time: data.content.time,
          access: data.groupId,
          name: data.content.name
        })
      })
      
    })

    global.roomObjects[data.groupId].syncRequest({
        userId: global.user.userId,
        groupId: data.groupId,
        content: {hash: data.content.hash},
        messageType: 'fetchFile',       
    })
    return new Promise(function(resolve, reject){
      global.roomObjects[data.groupId].deliverFile[data.content.hash] = resolve
      
    })
  }
  else{
    console.log('文件大小超过1G，启用dht下载')
    global.roomObjects[data.groupId].uploadClient.add(data.content.hash)
  }

  // let res = await new Promise(function(resolve, reject){
  //   global.roomObjects[data.groupId].deliverFile[data.content.hash] = resolve
  // })
  // if(res){
  //   console.log('成功从群', data.groupId, '下载到文件', res)
  //   const blob = new Blob([res],  { type: data.content.type })
  //   if(true){//res.type == 'blob'){
  //     let file = new File([ blob ], data.content.name, { type: data.content.type })
  //     global.roomObjects[data.groupId].torrentClient.seed(file, null, async(torrent) => {
  //       if( torrent.infoHash == data.content.hash){
  //         console.log('哈希验证成功')
  //         global.db.fileRepository.put({
  //           hash: data.content.hash,
  //           type: 'blob',
  //           blob: blob,
  //           time: data.time,
  //           access: data.groupId,
  //           name: data.content.name
  //         })
  //         console.log(blob)
  //         return blob
  //       }
  //       else{
  //         console.log('哈希验证失败')
  //       }
  //     })
  //   }
  // }
}

//向上划滚动条时，从数据库获取旧消息记录
//async getGroupMessages(groupId: string, current: number, pageSize: number) {
const getGroupMessages = async(groupId, current, pageSize) =>{
  console.log(groupId, current, pageSize)
  // let groupMessage = await getRepository(GroupMessage)
  //   .createQueryBuilder("groupMessage")
  //   .orderBy("groupMessage.time", "DESC")
  //   .where("groupMessage.groupId = :id", { id: groupId })
  //   .skip(current)
  //   .take(pageSize)
  //   .getMany();
  //   groupMessage = groupMessage.reverse();
  let groupMessage = await global.db.groupMessageRepository
  .where('[groupId+time]').between(
    [ groupId, Dexie.minKey],
    [ groupId, Dexie.maxKey])
  .reverse().offset(current).limit(pageSize).toArray()
  groupMessage = groupMessage.reverse();

  //解密
  groupMessage.map((message) => {
    let data = message
    data.content = utilsController.decodeXOR(message.content, message.groupId + message.time)
    return data
  })

  //   const userGather: {[key: string]: User} = {};
    const userGather= {};
  //   let userArr: FriendDto[] = [];
    let userArr = [];
  //   for(const message of groupMessage) {
  //     if(!userGather[message.userId]) {
  //       userGather[message.userId] = await getRepository(User)
  //       .createQueryBuilder("user")
  //       .where("user.userId = :id", { id: message.userId })
  //       .getOne();
  //     }
  //   }
      for(const message of groupMessage) {
      if(!userGather[message.userId]) {
        console.log(message)
        let user = await global.db.userRepository
        .where({ userId: message.userId })
        .first()
        if(user){
          userGather[message.userId] = user
        }else{
          user = await fetchUser(groupId, message.userId)
          if(user){
            userGather[message.userId] = user
            global.db.userRepository.add(user)
          }
          else
            userGather[message.userId] = {userId: message.userId, username: message.userId}
        }       
      }
    }
    userArr = Object.values(userGather);
    return {msg: '', data: { messageArr: groupMessage, userArr: userArr }};
}

const fetchUser = async(groupId, userId, peerId) => {
  if(peerId)
    global.roomObjects[groupId].syncRequest({
      messageType: 'fetchUser',
      content: {
          userId: userId
      }        
    }, 
    peerId)
  else
    global.roomObjects[groupId].syncRequest({
      messageType: 'fetchUser',
      content: {
          userId: userId
      }        
    })

  return new Promise(function(resolve, reject){
    global.roomObjects[groupId].deliverUser[userId] = resolve
  })
}


// 发送群消息
//这个函数接收从输入框经数据接口来的待发送群信息，按照以太坊区块和交易的数据结构组装完并签名后，调用webRTC房间注册的发送消息函数来发送。
const sendGroupMessage = async(data) => {
  //const isUser = await this.userRepository.findOne({userId: data.userId});
  if(true) {
    // const userGroupMap = await this.groupUserRepository.findOne({userId: data.userId, groupId: data.groupId});
    // if(!userGroupMap || !data.groupId) {
    //   this.server.to(data.userId).emit('groupMessage',{code:RCode.FAIL, msg:'群消息发送错误', data: ''});
    //   return;
    // } 
    
    if( data.messageType === 'image') {
      console.log(data.content)
      data.name = data.content.name

      // //如果已经在做种了，会导致seed方法的回调函数不运行，因此要先看一下名字有没有重合
      // for(const torrent of global.roomObjects[data.groupId].torrentClient.torrents){
      //   for (const file of torrent.files){
      //     if (file.name == data.content.name){
      //       // let oldName = data.content.name.split('.')
      //       // oldName[oldName.length-2] = oldName[oldName.length-2] + '(1)'
      //       // data.content.name = oldName.join('.')
      //       global.roomObjects[data.groupId].torrentClient.remove(torrent.infoHash)
      //     }
      //   }
      // }
      // const client = new WebTorrent()
      // global.roomObjects[data.groupId].clients.push(client)
      const client = new WebTorrent()
      global.roomObjects[data.groupId].uploadClients.push(client)
      global.roomObjects[data.groupId].clients.push(client)
      var clientBlob
      //根据file对象制作种子文件，获取其哈希值
      client.seed(data.content, null, async(torrent) => {
        console.log(torrent.infoHash)

        
              //将file转换为blob对象
              await fetch(URL.createObjectURL(data.content)).then(res => res.blob())
              .then(blob => {
                console.log('blob: ', blob)
                clientBlob = blob
                //将blob对象保存到文件数据库
                global.db.fileRepository.put({
                  hash: torrent.infoHash,
                  type: 'blob',
                  blob: blob,
                  time: data.time,
                  access: data.groupId,
                  name: data.content.name,
                })
                //此时修改data.content为哈希值
                data.content = {
                  hash: torrent.infoHash,
                  name: data.content.name,
                  type: data.content.type,
                  size: data.content.size
                }
                
              })

        

        if (!data.time)
          data.time = Date.now() //new Date.valueOf(); // 使用服务端时间
        
        const group = await global.db.groupRepository.where({groupId: data.groupId}).first()
        
        data.preHash = group.lastMessage
        data.hash = global.web3.eth.accounts.hashMessage(group.lastMessage + data.groupId + data.content + data.time)
        
        let signatureObject = global.web3.eth.accounts.sign(data.hash, global.user.privateKey);  
        data.signature = signatureObject.signature
        //console.log(data)

        const peers = global.roomObjects[data.groupId].room.getPeers()
        console.log('群在线用户：', peers )
        delete data._id
        //console.log(data)
        
        

        var reader = new FileReader();
        try {
          //var reader = new FileReader()
          if (clientBlob) {
            reader.readAsDataURL(clientBlob)
            reader.onload = async function(){
              console.log(this.result)
              data.dataURL = this.result
              //data.content.dataURL = this.result
              if(peers.length != 0){
                global.roomObjects[data.groupId].sendMessage(data)  //通过webRTC房间注册的发送函数发送消息
              }
              else{
                //console.log('用以太坊发送消息')
                //ethController.sendMessage(data.groupId, group.privateKey , data.groupId, data)
              }
              global.db.groupMessageRepository.add(data).then(() => {
                console.log('保存了消息：', data)
                blockController.updateChain(data.groupId, data.time)
                console.log('本地发送消息后更新区块')
              }); //保存到聊天记录数据库
              
              
              await global.db.groupRepository.update(data.groupId, {lastMessage: data.hash})
                  .then(() => console.log('更新当前消息哈希')) //更新自己最后一条消息的id
              
        
              
              
        
              //将自己发送的消息经数据接口传输到前端渲染
              const uiData = {
                userId:  global.user.userId ,
                groupId: data.groupId,
                content: data.content,
                dataURL: data.dataURL,
                width: data.width,
                height: data.height,
                messageType: data.messageType,
                name: data.name,
                hash: data.hash
              }
              groupApi.receiveGroupMessage(uiData) 
              
              //this.server.to(data.groupId).emit('groupMessage', {code: RCode.OK, msg:'', data: data});
              return
            }
            reader.onerror = function() {
              console.log("load file error")
            }
            
          } else {
            console.log("file not found")
          }
        } catch (e) {
          console.log("file not found")
        }
        

        
      })
      
    }

    if(data.messageType === 'file' ) {
      console.log(data.content)
      data.name = data.content.name

      // //如果已经在做种了，会导致seed方法的回调函数不运行，因此要先看一下名字有没有重合
      // for(const torrent of global.roomObjects[data.groupId].torrentClient.torrents){
      //   for (const file of torrent.files){
      //     if (file.name == data.content.name){
      //       // let oldName = data.content.name.split('.')
      //       // oldName[oldName.length-2] = oldName[oldName.length-2] + '(1)'
      //       // data.content.name = oldName.join('.')
      //       global.roomObjects[data.groupId].torrentClient.remove(torrent.infoHash)
      //     }
      //   }
      // }
      const client = new WebTorrent()
      global.roomObjects[data.groupId].clients.push(client)
      global.roomObjects[data.groupId].uploadClients.push(client)
      var clientBlob
      //根据file对象制作种子文件，获取其哈希值
      client.seed(data.content, null, async(torrent) => {
        console.log(torrent.infoHash)

        
              //将dataURL转换为blob对象
              await fetch(URL.createObjectURL(data.content)).then(res => res.blob())
              .then(blob => {
                console.log('blob: ', blob)
                clientBlob = blob
                //将blob对象保存到文件数据库
                global.db.fileRepository.put({
                  hash: torrent.infoHash,
                  type: 'blob',
                  blob: blob,
                  time: data.time,
                  access: data.groupId,
                  name: data.content.name,
                })
                 //此时修改data.content为哈希值
                data.content = {
                  hash: torrent.infoHash,
                  name: data.content.name,
                  type: data.content.type,
                  size: data.content.size
                }
                
              })


        //以下代码是把文件读取成dataURL，在文件较大时会出错。
        // //检查是否支持filereader
        // if(window.FileReader) {
        //   var reader = new FileReader();
        // }
        // else {
        //   alert("当前浏览器不支持!");
        // }  
        // try {
        //   if (data.content) {

        //     //将file对象转换为dataURL
        //     reader.readAsDataURL(data.content)
        //     reader.onload = async function(){
        //       console.log(this.result)

        //       //将dataURL转换为blob对象
        //       await fetch(this.result).then(res => res.blob())
        //       .then(blob => {
        //         console.log('blob: ', blob)
        //         //将blob对象保存到文件数据库
        //         global.db.fileRepository.put({
        //           hash: torrent.infoHash,
        //           type: 'blob',
        //           blob: blob,
        //           time: data.time,
        //           access: data.groupId,
        //           name: data.content.name,
        //         })
        //         // global.db.fileRepository.put({
        //         //   hash: torrent.infoHash,
        //         //   type: 'file',
        //         //   file: data.content,
        //         //   time: data.time,
        //         //   access: data.groupId,
        //         //   name: data.content.name,
        //         // })

        //         //实验：看看转换后哈希值会不会变
        //         // console.log('实验')
        //         // let file = new File([ blob ], data.content.name, { type: data.content.type })
        //         // global.roomObjects[data.groupId].torrentClient.seed(file, null, async(torrent) => {console.log(torrent.infoHash)})
        //       })
              
        //     }
        //     reader.onerror = function() {
        //       console.log("load file error")
        //     }
            
        //   } else {
        //     console.log("file not found")
        //   }
        // } catch (e) {
        //   console.log("file not found")
        // }
        

       

        if (!data.time)
          data.time = Date.now() //new Date.valueOf(); // 使用服务端时间
        
        const group = await global.db.groupRepository.where({groupId: data.groupId}).first()
        
        data.preHash = group.lastMessage
        data.hash = global.web3.eth.accounts.hashMessage(group.lastMessage + data.groupId + data.content + data.time)
        
        let signatureObject = global.web3.eth.accounts.sign(data.hash, global.user.privateKey);  
        data.signature = signatureObject.signature
        //console.log(data)


        global.db.groupMessageRepository.add(data).then(() => {
          console.log('保存了消息：', data)
          blockController.updateChain(data.groupId, data.time)
          console.log('本地发送消息后更新区块')
        }); //保存到聊天记录数据库
        
        
        await global.db.groupRepository.update(data.groupId, {lastMessage: data.hash})
            .then(() => console.log('更新当前消息哈希')) //更新自己最后一条消息的id
        
  
        const peers = global.roomObjects[data.groupId].room.getPeers()
        console.log('群在线用户：', peers )
        delete data._id
        //console.log(data)
        
        if(peers.length != 0){
          global.roomObjects[data.groupId].sendMessage(data)  //通过webRTC房间注册的发送函数发送消息
        }
        else{
          //console.log('用以太坊发送消息')
          //ethController.sendMessage(data.groupId, group.privateKey , data.groupId, data)
        }
        
  
        //将自己发送的消息经数据接口传输到前端渲染
        const uiData = {
          userId:  global.user.userId ,
          groupId: data.groupId,
          content: data.content,
          width: data.width,
          height: data.height,
          messageType: data.messageType,
          name: data.name,
          hash: data.hash
        }
        groupApi.receiveGroupMessage(uiData) 
        
        //this.server.to(data.groupId).emit('groupMessage', {code: RCode.OK, msg:'', data: data});

        return
      })
      
    }

    // if(data.messageType === 'image') {
    //   console.log(data)
    //   if(window.FileReader) {
    //     var reader = new FileReader();
    //   }
    //   else {
    //     alert("当前浏览器不支持!");
    //   }

    //   try {
    //     //var reader = new FileReader()
    //     if (data.content) {
    //       reader.readAsDataURL(data.content)
    //       reader.onload = function(){
    //         console.log(this.result)
    //         data.content = this.result
    //       }
    //       reader.onerror = function() {
    //         console.log("load file error")
    //       }
          
    //     } else {
    //       console.log("file not found")
    //     }
    //   } catch (e) {
    //     console.log("file not found")
    //   }
    // }

    if (!data.time)
    data.time = Date.now() //new Date.valueOf(); // 使用服务端时间
    
    //console.log(global.user)
    //console.log(global.roomObjects)
    const group = await global.db.groupRepository.where({groupId: data.groupId}).first()
    
    data.preHash = group.lastMessage
    data.hash = global.web3.eth.accounts.hashMessage(group.lastMessage + data.groupId + data.content + data.time)
    
    let signatureObject = global.web3.eth.accounts.sign(data.hash, global.user.privateKey);  
    data.signature = signatureObject.signature
    //console.log(data)
    if(data.messageType === 'text' ){//||data.messageType === 'image' ){
      data.content = utilsController.XORencryption(data.content, data.groupId + data.time) //用群id加当前时间作为密钥，进行加密
      global.db.groupMessageRepository.add(data).then(() => {
        console.log('保存了消息：', data)
        blockController.updateChain(data.groupId, data.time)
        console.log('本地发送消息后更新区块')
      }); //保存到聊天记录数据库
      
      
      await global.db.groupRepository.update(data.groupId, {lastMessage: data.hash})
          .then(() => console.log('更新当前消息哈希')) //更新自己最后一条消息的id
      

      const peers = global.roomObjects[data.groupId].room.getPeers()
      console.log('群在线用户：', peers )
      delete data._id
      //console.log(data)
      
      if(peers.length != 0){
        global.roomObjects[data.groupId].sendMessage(data)  //通过webRTC房间注册的发送函数发送消息
      }
      else{
        console.log('用以太坊发送消息')
        //ethController.sendMessage(data.groupId, group.privateKey , data.groupId, data)
      }
      

      //将自己发送的消息经数据接口传输到前端渲染
      const uiData = {
        userId:  global.user.userId ,
        groupId: data.groupId,
        content: utilsController.decodeXOR(data.content, data.groupId + data.time),
        width: data.width,
        height: data.height,
        messageType: data.messageType,
        hash: data.hash
      }
      groupApi.receiveGroupMessage(uiData) 
      
      //this.server.to(data.groupId).emit('groupMessage', {code: RCode.OK, msg:'', data: data});
    }


    

    if(data.messageType == 'fetchOldMessage'){
      console.log('发送旧消息请求', data)
      global.roomObjects[data.groupId].sendMessage(data) //向其他群成员索取旧消息的消息，不需要入库，直接通过webRTC房间注册的发送函数发送消息
    }

    if(data.messageType == 'admin'){
      console.log('发送管理信息', data)
      global.roomObjects[data.groupId].sendMessage(data) //更改群设置的消息，不需要入库，直接通过webRTC房间注册的发送函数发送消息
      return data
    }

    if(data.messageType == 'user'){
      console.log('发送群用户信息', data)
      global.roomObjects[data.groupId].sendMessage(data) //更改群成员的消息，不需要入库，直接通过webRTC房间注册的发送函数发送消息
      return data
    }
  } 
}

// 发送群消息
//这个函数接收从输入框经数据接口来的待发送群信息，按照以太坊区块和交易的数据结构组装完并签名后，调用webRTC房间注册的发送消息函数来发送。
const sendGroupPrivateMessage = async(data) => {
  const group = await global.db.groupRepository.where({groupId: data.groupId}).first()
  //const isUser = await this.userRepository.findOne({userId: data.userId});
  if(true) {
    // const userGroupMap = await this.groupUserRepository.findOne({userId: data.userId, groupId: data.groupId});
    // if(!userGroupMap || !data.groupId) {
    //   this.server.to(data.userId).emit('groupMessage',{code:RCode.FAIL, msg:'群消息发送错误', data: ''});
    //   return;
    // } 
    if(data.messageType === 'image') {
      const randomName = `${Date.now()}$${data.userId}$${data.width}$${data.height}`;
      const stream = createWriteStream(join('public/static', randomName));
      stream.write(data.content);
      data.content = randomName;
    }
    data.time = Date.now() //new Date.valueOf(); // 使用服务端时间
    
    //console.log(global.user)
    //console.log(global.roomObjects)
    
    
    data.preHash = group.lastMessage
    data.hash = global.web3.eth.accounts.hashMessage(group.lastMessage + data.groupId + data.content + data.time)
    console.log('804', global.user)
    let signatureObject = global.web3.eth.accounts.sign(data.hash, global.user.privateKey);  
    data.signature = signatureObject.signature
    //console.log(data)
    if(data.messageType === 'text'){
      global.db.groupMessageRepository.add(data); //保存到聊天记录数据库
      console.log('待发送消息成功保存到数据库', data)
      await global.db.groupRepository.update(data.groupId, {lastMessage: data.hash}) //更新自己最后一条消息的id
      console.log('更新当前消息哈希')

      const peers = global.roomObjects[data.groupId].room.getPeers()
      console.log('群在线用户：', peers )
      delete data._id
      //console.log(data)
      
      if(peers.length != 0){
        global.roomObjects[data.groupId].sendMessage(data, global.roomObjects[data.groupId].userIdsToIds[data.to])  //通过webRTC房间注册的发送函数发送消息
      }
      else{
        console.log('用以太坊发送消息')
        //ethController.sendMessage(data.groupId, group.privateKey , data.groupId, data)
      }
      

      //将自己发送的消息经数据接口传输到前端渲染

      const uiData = {
        userId:  global.user.userId ,
        groupId: data.groupId,
        content: data.content,
        width: data.width,
        height: data.height,
        messageType: data.messageType,
        hash: data.hash
      }
      groupApi.receiveGroupMessage(uiData)  
      
      //this.server.to(data.groupId).emit('groupMessage', {code: RCode.OK, msg:'', data: data});
    }

    if(data.messageType == 'fetchOldMessage'){
      console.log('发送旧消息请求', data)
      let id = data.to
      delete data.to
      global.roomObjects[data.groupId].sendMessage(data , id) //向其他群成员索取旧消息的消息，不需要入库，直接通过webRTC房间注册的发送函数发送消息
    }
  } 
}


const updateGroupMessage = async() => {

}

const roomInit = async(roomId) => {
  //let rooms = {}
  //for (const roomId of roomIds){

      //Establish a webRtc room, and access it by appId and roomId
      const config = {appId: 'ichat'}
      const room = joinRoom(config, roomId)
      console.log(room)
      room.onPeerJoin(id => console.log(`${id} joined`))
      

      // register message service
      const [sendMessage, getMessage] = room.makeAction('message')
      getMessage(function(message, id){
        console.log('webRtc getMessage ' , message , ' from ' + id + '(' + global.roomObjects[roomId].idsToUserIds[id] + ') in ' + roomId)
        receiveGroupMessage(roomId, message, global.roomObjects[roomId].idsToUserIds[id] ) })
      
      //register private message service
      const [sendPrivateMessage, getPrivateMessage] = room.makeAction('private')
      getPrivateMessage(function(message, id){
        console.log('webRtc getMessage ' + message + ' from ' + id)
        receiveGroupMessage(roomId, message, global.roomObjects[roomId].idsToUserIds[id] ) })

        // register synchronization service
      const [syncRequest, getSyncRequest] = room.makeAction('sync')
      getSyncRequest(function(message, id, meta){
        console.log('webRtc getMessage ' , message , ' from ' + id + '(' + global.roomObjects[roomId].idsToUserIds[id] + ') in ' + roomId)
        if(blockController.syncTasks[roomId].ban.indexOf(id) == -1)
          deliverGroupSyncRequest(roomId, message, id, meta)
        else{
          console.log('该用户已被屏蔽')
        }
        //receiveGroupMessage(roomId, message, global.roomObjects[roomId].idsToUserIds[id] ) 
      })

      //register require old message service
      const [fetchOldMessage, deliverOldMessage] = room.makeAction('requireOld')
      deliverOldMessage(function(request, id){
        console.log('webRtc getMessage ' + request + ' from ' + id)
        sendOldMessage(roomId, request , global.roomObjects[roomId].idsToUserIds[id] ) })

      //register old message service
      const [sendOldMessage, getOldMessage] = room.makeAction('oldMessage')
      getOldMessage(function(message, id){
        console.log('webRtc getMessage ' + message + ' from ' + id)
        updateGroupMessage(roomId, message, roomId , global.roomObjects[roomId].idsToUserIds[id] ) })

      // register file service
      // const [sendFile, getFile] = room.makeAction('message')
      // getFile(function(message, id){
      //   console.log('webRtc getMessage ' , message , ' from ' + id + '(' + global.roomObjects[roomId].idsToUserIds[id] + ') in ' + roomId)
      //   receiveGroupMessage(roomId, message, global.roomObjects[roomId].idsToUserIds[id] ) })  

      const [sendFile, getFile] = room.makeAction('file')
      getFile(function(message, id){
        console.log('webRtc getMessage ' , message , ' from ' + id + '(' + global.roomObjects[roomId].idsToUserIds[id] + ') in ' + roomId)
        receiveGroupMessage(roomId, message, global.roomObjects[roomId].idsToUserIds[id] ) })  

      const idsToNames = {}
      const idsToUserIds = {}
      console.log(JSON.stringify(global.user))
      idsToNames[selfId] = global.user.username 
      idsToUserIds[selfId] =  global.user.userId
      const client = new WebTorrent()
      
      global.roomObjects[roomId] = {room:room,
                  selfId: selfId,
                  sendMessage: sendMessage,
                  sendPrivateMessage: sendPrivateMessage,
                  sendFile: sendFile,
                  syncRequest: syncRequest,
                  deliverUser: {},
                  sendOldMessage: sendOldMessage,
                  fetchOldMessage: fetchOldMessage,
                  idsToNames : idsToNames,
                  idsToUserIds : idsToUserIds,
                  userIdsToIds : {},
                  offline: [],
                  groupId: roomId,
                  uploadClient: client,
                  deliverFile: {},
                  clients:[client],
                  uploadClients:[client]
                }

      // register name service
      const [sendName, getName] = room.makeAction('name')    
      // tell other peers currently in the room our name
      sendName(global.user.username + ':' + global.user.userId)    
      // tell newcomers
      //room.onPeerJoin(id => sendName(global.user.username + ':' +  global.user.userId, id))    
      // listen for peers naming themselves
      getName(function(name, id) {
        console.log('webRtc getName ' + name + ' from ' + id + ' in ' + roomId)
        global.roomObjects[roomId].idsToNames[id] = name.split(':')[0]
        let senderUserId = name.split(':')[1]
        global.roomObjects[roomId].idsToUserIds[id] = senderUserId
        global.roomObjects[roomId].userIdsToIds[senderUserId] = id
        global.db.userRepository.add({userId :  senderUserId , username : name.split(':')[0]})
        //getOldMessages(roomId, id);
        getActiveGroupUser()
      } )

      
      //查询下线时的新消息
      global.db.groupBlockRepository.where('[groupId+time]').between(
        [ roomId, Dexie.minKey],
        [ roomId, Dexie.maxKey])
      .reverse().first(function(lastBlock){
        let currentTime = Date.now()
        if (lastBlock){
          console.log('聊天记录中最后一个区块的时间',lastBlock.time)
          if(lastBlock.time){
            //global.roomObjects[roomId].offline = [lastBlock.time,  Date.now()]
            global.roomObjects[roomId].offline = [currentTime - (currentTime% (1000* 1000)) - 1,  currentTime]
          }
          else{
            //let group = await global.db.groupRepository.where({groupId: roomId}).first()
            //global.roomObjects[roomId].offline = [group.createTime,  Date.now()]
            global.roomObjects[roomId].offline = [currentTime - (currentTime% (1000* 1000)) - 1,  currentTime]
          }}
      })
      

        

      blockController.syncTasks[roomId] = {
        deliverRecentBlocks:{},
        deliverAllBlocks: {},
        deliverAncestorNeighbors: {},
        deliverBlock: {},
        forks: {},
        limits:{},
        ban: []
      }
      blockController.updateChain(roomId)
      room.onPeerJoin(function(id){
        sendName(global.user.username + ':' +  global.user.userId, id)
        
        if (true){ //( global.iterations ==0){

          blockController.sync(roomId, id)


          
          getOldMessages(roomId, id);
          
          console.log(id, '加入了群聊：', roomId)
          //blockController.updateChain(roomId)
        }
      })

      
      
        

}

const fetchOldMessage = () =>{

}


const getOldMessages= async(roomId, id) =>{
  global.iterations ++
  //console.log(Object.values(global.roomObjects))
  
    let room = global.roomObjects[roomId]
    console.log(global.roomObjects)
    //console.log('1055', room, room.offline)
    if(room.offline){
          sendGroupPrivateMessage(
            {
              userId: global.user.userId,
              groupId: room.groupId,
              content: {key: 'time', time: [room.offline[0] , Date.now() + 2000]},//从收到最后一条消息的时间开始查询
              messageType: 'fetchOldMessage',
              to: id
            })
          }
          console.log(room.groupId, roomId)
          let mess = await ethController.acquireMessage(room.groupId.trim(),room.groupId.trim(),1)
          mess = JSON.parse(mess)
          console.log('从区块链获取的数据', mess)
          receiveGroupMessage(room.groupId, mess, mess.userId ) 
          //groupApi.receiveGroupMessage(room.groupId, mess.content, mess.userId)
    
    console.log('1205',global.interval)
  if(global.iterations> 2){
    clearInterval(global.interval)
    global.iterations = 0
    console.log('1205',global.interval)
  }
       
}

const pollOldMessagesAll= async() =>{
  global.iterations ++
  //console.log(Object.values(global.roomObjects))
  for(let index in global.roomObjects){
    let room = global.roomObjects[index]
    //console.log('1055', room, room.offline)
    if(room.offline){
          sendGroupMessage(
            {
              userId: global.user.userId,
              groupId: room.groupId,
              content: {key: 'time', time: room.offline},//从收到最后一条消息的时间开始查询
              messageType: 'fetchOldMessage',
            })
          }
          let mess = await ethController.acquireMessage(room.groupId,room.groupId,0)
          console.log(mess)
          const uiData = {
            userId:  mess.userId,
            groupId: room.groupId,
            content: mess,
            width: data.width,
            height: data.height,
            messageType: data.messageType,
            hash: data.hash
          }
          groupApi.receiveGroupMessage(uiData) 
          
    }
    console.log('1205',global.interval)
  if(global.iterations> 2){
    clearInterval(global.interval)
    global.iterations = 0
    console.log('1205',global.interval)
  }
       
}

// 获取在线用户
const getActiveGroupUser = async() => {
  // // 从socket中找到连接人数
  // // @ts-ignore;
  // let userIdArr = Object.values(this.server.engine.clients).map(item=>{
  //   // @ts-ignore;
  //   return item.request._query.userId;
  // });
  // // 数组去重
  // userIdArr = Array.from(new Set(userIdArr));

  const activeGroupUserGather = {};
  for(const roomId in global.roomObjects){
    for(const id in global.roomObjects[roomId].idsToUserIds) {
      //const userGroupArr = await this.groupUserRepository.find({userId: userId});
      //const user = await this.userRepository.findOne({userId: userId});
      // if(user && userGroupArr.length) {
      //   userGroupArr.map(item => {
      //     if(!activeGroupUserGather[item.groupId]) {
      //       activeGroupUserGather[item.groupId] = {};
      //     }
      //     activeGroupUserGather[item.groupId][userId] = user;
      //   });
      // }

      //TO-DO: 在群区块链或本地群用户数据库中验证一下用户是否在群中

      if(!activeGroupUserGather[roomId]) {
        activeGroupUserGather[roomId] = {};
      }
      activeGroupUserGather[roomId][global.roomObjects[roomId].idsToUserIds[id]] = {
        userId: global.roomObjects[roomId].idsToUserIds[id],
        username: global.roomObjects[roomId].idsToNames[id]
      };



    }
  }
  
  console.log(activeGroupUserGather)
  // this.server.to(this.defaultGroup).emit('activeGroupUser',{
  //   msg: 'activeGroupUser', 
  //   data: activeGroupUserGather
  // });
  groupApi.activeGroupUser({
    msg: 'activeGroupUser', 
    data: activeGroupUserGather
  })
}




export default {
  getMyGroup,
  getGroupInfo,
  searchGroup,
  addNewGroupUser,
  createGroup,
  getRecentGroup,
  getAllGroup,
  createGroup,
  joinGroup,
  joinGroupSocket,
  roomInit,
  receiveGroupMessage,
  sendGroupMessage,
  getGroupMessages,
  fetchUser,
  fetchFile
}
