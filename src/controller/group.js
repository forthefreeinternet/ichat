import Web3 from 'web3'
import groupApi from './../api/modules/group'
import initController from './init'
import ethController from './eth'
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
      const isHaveGroup = await global.db.groupRepository.where({ groupName: data.groupName }).first();
      if (isHaveGroup) {
        //this.server.to(data.userId).emit('addGroup', { code: RCode.FAIL, msg: '该群名字已存在', data: isHaveGroup });
        groupApi.clientAddgroup( { code: RCode.FAIL, msg: '该群名字已存在', data: isHaveGroup })
        return;
      }
      if(!nameVerify(data.groupName)) {
        return;
      }
      let account =  web3.eth.accounts.create();
      data.groupId = account.address
      ethController.sendFund(global.user.privateKey, account.address, '10000000000000000')
      data.privateKey = account.privateKey
      console.log(account.privateKey)
      const SDPpassword =  global.web3.eth.accounts.hashMessage(account.privateKey)
      data.SDPpassword = SDPpassword
      await global.db.groupRepository.add(data);
      //client.join(data.groupId);
      roomInit( data.groupId);
      await global.db.groupUserRepository.add({groupId:data.groupId , userId: data.userId})
      const group = {groupId: data.groupId , userId:  data.userId,  groupName: data.groupName, createTime: new Date().valueOf()}
      //this.server.to(group.groupId).emit('addGroup', { code: RCode.OK, msg: `成功创建群${data.groupName}`, data: group });
      groupApi.clientAddgroup({ code: RCode.OK, msg: `成功创建群${data.groupName}`, data: group })
      //this.getActiveGroupUser();
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
        console.log('end3')
        data.groupId = group.groupId;
        console.log({groupId:data.groupId , userId: data.userId})
        const test = await global.db.groupUserRepository.toArray()
        console.log(test)
        userGroup = await global.db.groupUserRepository.add({groupId:data.groupId , userId: data.userId});
        console.log(userGroup)
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
    } else {
      groupApi.clientJoinGroup({ code: RCode.FAIL, msg: '进群失败', data: '' })
      
    }
  } else {
    groupApi.clientJoinGroup({ code: RCode.FAIL, msg: '你没资格进群'});
  }
}

//webRTC房间注册的接收信息函数调用此函数
const receiveGroupMessage = async(roomId,data, userId) => {
  console.log('收到消息，类型为：', data.messageType, '发送者为：', data.userId, '内容为：', data.content);  
  //console.log(userId, global.user.userId, global.web3.eth.accounts.recover(data.hash ,data.signature)); 

  //如果是自己发送的消息，不应该进入此函数
  if(data.userId != global.user.userId){ 
    console.log('开始验证消息')
    //验证消息开始
    //验证签名
    let sender
    try{
      sender = global.web3.eth.accounts.recover(data.hash ,data.signature )
    }catch{
      console.log('签名错误')
      return
    }
    if ( sender != data.userId) {console.log('假签名', sender, userId);return}
    //验证个人id，群id及hash值
    //if( data.userId != userId) {console.log('信息的署名错误');return} //不需要是本人发，可以是转发
    if( data.groupId != roomId) {console.log('错群');return}
    if( data.hash != global.web3.eth.accounts.hashMessage(data.preHash + data.groupId + data.content + data.time)) return
    //验证时间，消息发送时间不能超过当前时间
    if( data.time > Date.now()) {console.log('消息时间造假');return}
    //验证消息完毕
    console.log('消息验证通过')
    if(data.messageType == 'text'){
      
      const groupLastMessage = await global.db.groupMessageRepository.where('[groupId+time]').between(
        [ roomId, Dexie.minKey],
        [ roomId, Dexie.maxKey])
      .reverse().first()
      
      
      //如果收到的消息发送时间在已经保存的最后一条消息之前，则入库后重新获取数据渲染。这是去中心化app的特性，因为收到消息并不及时。
      console.log(data.time , '大于还是小于？', groupLastMessage.time)
      if(data.time > groupLastMessage.time){
        //存储到聊天记录数据库
        global.db.groupMessageRepository.add( data ).then(() => {
          console.log('前端渲染')
          groupApi.receiveGroupMessage(roomId,data.content, userId) //调用前端函数进行渲染
        }).catch(function (err) {
          return console.log(data, '聊天记录存储错误' ,err);
        });
      }
      else{
        global.db.groupMessageRepository.add( data ).then(()=>
          initController.getAllData(global.user)
        ).catch(function (err) {
          return console.log('聊天记录存储错误' ,err);
        });
        
      }
      
      //判断该用户发送的前一条消息是否已收到
      if(data.preHash != data.groupId){//用户在群里发送的第一条消息，前置消息哈希是群id。若前置消息哈希是群id，则不用获取前面的消息
        const preMessage = await global.db.groupMessageRepository.where({hash: data.preHash}).first()//查询数据库中是否已经保存前一条消息
        if(!preMessage){
          console.log(preMessage)
          sendGroupMessage(
            {
              userId: global.user.userId,
              groupId: roomId,
              content: {key: 'hash', hash: data.preHash},
              messageType: 'requireOldMessage',
            }
          )//向群内其他成员索取缺失的消息
        }
      }
      return
    }

    //接收到索取旧消息的消息，在数据库中查找并发送旧消息
    if(data.messageType == 'requireOldMessage'){
      //如果索取者是索取某条消息
      if( data.content.key == 'hash'){
        let preMessage = await global.db.groupMessageRepository.where({hash: data.content.hash}).first() //通过哈希值获取已经在聊天记录数据库的消息
        global.roomObjects[data.groupId].sendMessage(preMessage, global.roomObjects[roomId].userIdsToIds[data.userId]) //该记录已经包含哈希值以及消息创建者的签名，直接通过webRTC房间注册的消息发送函数发送
      }
      //如果索取者是索取某段时间的消息
      if( data.content.key == 'time'){
        let oldMessages = await global.db.groupMessageRepository.where('time').between( data.content.time[0],data.content.time[1]).toArray() //通过哈希值获取已经在聊天记录数据库的消息
        console.log('准备发送 ' , data.content.time , ' 之间的消息： ' , oldMessages)
        for(let index in oldMessages){
          global.roomObjects[data.groupId].sendMessage(oldMessages[index], global.roomObjects[roomId].userIdsToIds[data.userId]) //该记录已经包含哈希值以及消息创建者的签名，直接通过webRTC房间注册的消息发送函数发送
        }
      }
    }
  }
  
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
        userGather[message.userId] = await global.db.userRepository
        .where({ userId: message.userId })
        .first()
      }
    }
    userArr = Object.values(userGather);
    return {msg: '', data: { messageArr: groupMessage, userArr: userArr }};
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
    if(data.messageType === 'image') {
      const randomName = `${Date.now()}$${data.userId}$${data.width}$${data.height}`;
      const stream = createWriteStream(join('public/static', randomName));
      stream.write(data.content);
      data.content = randomName;
    }
    data.time = Date.now() //new Date.valueOf(); // 使用服务端时间
    
    //console.log(global.user)
    //console.log(global.roomObjects)
    const group = await global.db.groupRepository.where({groupId: data.groupId}).first()
    
    data.preHash = group.lastMessage
    data.hash = global.web3.eth.accounts.hashMessage(group.lastMessage + data.groupId + data.content + data.time)
    
    let signatureObject = global.web3.eth.accounts.sign(data.hash, global.user.privateKey);  
    data.signature = signatureObject.signature
    //console.log(data)
    if(data.messageType === 'text'){
      global.db.groupMessageRepository.add(data); //保存到聊天记录数据库
      console.log('待发送消息成功保存到数据库')
      await global.db.groupRepository.update(data.groupId, {lastMessage: data.hash}) //更新自己最后一条消息的id
      console.log('更新当前消息哈希')

      const peers = global.roomObjects[data.groupId].room.getPeers()
      console.log('群在线用户：', peers )
      if(peers.length != 0){
        global.roomObjects[data.groupId].sendMessage(data)  //通过webRTC房间注册的发送函数发送消息
      }
      else{
        console.log('用以太坊发送消息')
        ethController.sendMessage(data.groupId, group.privateKey , data.groupId, data)
      }
      

      //将自己发送的消息经数据接口传输到前端渲染
      groupApi.receiveGroupMessage(data.groupId, data.content, global.user.userId ) 
      
      //this.server.to(data.groupId).emit('groupMessage', {code: RCode.OK, msg:'', data: data});
    }

    if(data.messageType == 'requireOldMessage'){
      console.log('发送旧消息请求', data)
      global.roomObjects[data.groupId].sendMessage(data) //向其他群成员索取旧消息的消息，不需要入库，直接通过webRTC房间注册的发送函数发送消息
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
        console.log('webRtc getMessage ' + message + ' from ' + id + '(' + global.roomObjects[roomId].idsToUserIds[id] + ')')
        receiveGroupMessage(roomId, message, global.roomObjects[roomId].idsToUserIds[id] ) })
      
      //register private message service
      const [sendPrivateMessage, getPrivateMessage] = room.makeAction('private')
      getPrivateMessage(function(message, id){
        console.log('webRtc getMessage ' + message + ' from ' + id)
        receiveGroupMessage(roomId, message, global.roomObjects[roomId].idsToUserIds[id] ) })

      //register require old message service
      const [requireOldMessage, getOldMessageRequest] = room.makeAction('requireOld')
      getOldMessageRequest(function(request, id){
        console.log('webRtc getMessage ' + request + ' from ' + id)
        sendOldMessage(roomId, request , global.roomObjects[roomId].idsToUserIds[id] ) })

      //register old message service
      const [sendOldMessage, getOldMessage] = room.makeAction('oldMessage')
      getOldMessage(function(message, id){
        console.log('webRtc getMessage ' + message + ' from ' + id)
        updateGroupMessage(roomId, message, roomId , global.roomObjects[roomId].idsToUserIds[id] ) })

      const idsToNames = {}
      const idsToUserIds = {}
      console.log(JSON.stringify(global.user))
      idsToNames[selfId] = global.user.username 
      idsToUserIds[selfId] =  global.user.userId
      global.roomObjects[roomId] = {room:room,
                  sendMessage: sendMessage,
                  sendPrivateMessage: sendPrivateMessage,
                  sendOldMessage: sendOldMessage,
                  requireOldMessage: requireOldMessage,
                  idsToNames : idsToNames,
                  idsToUserIds : idsToUserIds,
                  userIdsToIds : {},
                  offline: [],
                  groupId: roomId
                }

      // register name service
      const [sendName, getName] = room.makeAction('name')    
      // tell other peers currently in the room our name
      sendName(global.user.username + ':' + global.user.userId)    
      // tell newcomers
      //room.onPeerJoin(id => sendName(global.user.username + ':' +  global.user.userId, id))    
      // listen for peers naming themselves
      getName(function(name, id) {
        console.log('webRtc getName ' + name + ' from ' + id)
        global.roomObjects[roomId].idsToNames[id] = name.split(':')[0]
        let senderUserId = name.split(':')[1]
        global.roomObjects[roomId].idsToUserIds[id] = senderUserId
        global.roomObjects[roomId].userIdsToIds[senderUserId] = id
        global.db.userRepository.add({userId :  senderUserId , username : name.split(':')[0]})
      } )

      
      //查询下线时的新消息
      global.db.groupMessageRepository.where('[groupId+time]').between(
        [ roomId, Dexie.minKey],
        [ roomId, Dexie.maxKey])
      .reverse().first().then(function(item){
        console.log('聊天记录中最后一条消息的时间',item.time)
        global.roomObjects[roomId].offline = [item.time,  Date.now()]
        console.log('进行轮询的次数：',global.iterations)
        if( global.iterations ==0){
          //global.interval = setInterval(pollOldMessages,2000)
          //console.log('1205',global.interval)
        }
        //pollOldMessages()//setInterval(pollOldMessages,5000);
      }).catch(err => console.log(err))  
      

      room.onPeerJoin(function(id){
        sendName(global.user.username + ':' +  global.user.userId, id)
        if( global.iterations ==0){
          //pollOldMessages
          setTimeout(pollOldMessages,10)
          //global.interval = setInterval(pollOldMessages,2000)
          console.log('1205',global.interval)
        }
      })

      
      
        

}

const requireOldMessage = () =>{

}

const pollOldMessages= () =>{
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
              messageType: 'requireOldMessage',
            })
          }
    }
    console.log('1205',global.interval)
  if(global.iterations> 2){
    clearInterval(global.interval)
    global.iterations = 0
    console.log('1205',global.interval)
  }
       
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
  getGroupMessages
}
