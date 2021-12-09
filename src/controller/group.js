
import groupApi from './../api/modules/group'
import global from './global'
// const GROUP_USER = require('./../models/group').groupUser
// const GROUP = require('./../models/group').group
// const ACCOUNTBASE = require('./../models/accountpool')
// const { insertNewGroupNews } = require('./groupNews')
import store from './../store/index'
import { RCode } from './../common/constant/rcode';
import { service } from './../common/constant/service';

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
const createGroup = async (req, res) => {
  try {
    const account = await ACCOUNTBASE.findOne({status: '0', type: '2'})
    await ACCOUNTBASE.findOneAndUpdate({
      code: account.code
    }, {
      status: '1'
    })
    console.log('req body', account)
    const { title, desc = '', holderName, holderUserId } = req.body
    const img = req.body.img || '/img/zwsj5.png'
    const newGroup = {
      title,
      desc,
      img,
      code: account.code,
      holderName,
      holderUserId
    }
    const groupData = await GROUP.insertMany(newGroup)
    const newGroupUserMember = {
      groupId: groupData[0]._id,
      userId: holderUserId,
      userName: holderName,
      manager: 0,
      holder: 1,
      card: ''
    }
    const groupUserData = await GROUP_USER.insertMany(newGroupUserMember)
    return res.json({
      status: 2000,
      data: {
        groupData,
        groupUserData
      }
    })
  } catch (error) {
    return res.json({
      status: 2003,
      data: error,
      msg: '服务器错误，请稍后重试！'
    })
  }
}

// 获取所有群聊
const getAllGroup = async (req, res) => {
  const groupList = await GROUP.find().populate({path: 'holderUserId', select: 'nickname photo signature'})
  return res.json({
    status: 2000,
    data: groupList,
    msg: '获取成功！'
  })
}



// 加入群组

const joinGroup = async(data) => {
  const group = { groupId: data.groupId , groupName: data.groupName}
  const user = { userId: data.userId , username: data.username}
  console.log(store)
  store.dispatch('chat/joinGroup', {
    code: RCode.OK,
    msg: `${user.username}加入群${group.groupName}`,
    data: { group: group, user: user }
  })
  // const isUser = await this.userRepository.findOne({userId: data.userId});
  // if(isUser) {
  //   const group = { groupId: data.groupId , groupName: ''} //await this.groupRepository.findOne({ groupId: data.groupId });
  //   let userGroup = await this.groupUserRepository.findOne({ groupId: group.groupId, userId: data.userId });
  //   const user = await this.userRepository.findOne({userId: data.userId});
  //   if (group && user) {
  //     if (!userGroup) {
  //       data.groupId = group.groupId;
  //       userGroup = await this.groupUserRepository.save(data);
  //     }
  //     client.join(group.groupId);
  //     const res = { group: group, user: user };     
  //     this.server.to(group.groupId).emit('joinGroup', {
  //       code: RCode.OK,
  //       msg: `${user.username}加入群${group.groupName}`,
  //       data: res
  //     });
  //     this.getActiveGroupUser(); 
  //   } else {
  //     store.dispatch('joinGroup', { code: RCode.FAIL, msg: '进群失败', data: '' });
  //   }
  // } else {
  //   store.dispatch('joinGroup', { code: RCode.FAIL, msg: '你没资格进群'});
  // }
}
const getGroupMessage = async(roomId,message, userId) => {
  console.log(message);  
  groupApi.getGroupMessage(roomId,message, userId)
}


// 发送群消息

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
    data.time = new Date().valueOf(); // 使用服务端时间
    //await this.groupMessageRepository.save(data);
    console.log(global.user)
    console.log(global.roomObjects)
    global.roomObjects[data.groupId].sendMessage(data.content)
    getGroupMessage(data.groupId, data.content, global.user.userId ) 
    //this.server.to(data.groupId).emit('groupMessage', {code: RCode.OK, msg:'', data: data});
  } 
}

const updateGroupMessage = async() => {

}

const roomInit = async(roomIds) => {
  let rooms = {}
  for (const roomId of roomIds){

      //Establish a webRtc room, and access it by appId and roomId
      const config = {appId: 'ichat'}
      const room = joinRoom(config, roomId)
      console.log(room)
      room.onPeerJoin(id => console.log(`${id} joined`))
      

      // register message service
      const [sendMessage, getMessage] = room.makeAction('message')
      getMessage(function(message, id){
        console.log('webRtc getMessage ' + message + ' from ' + id)
        getGroupMessage(roomId, message, global.roomObjects[roomId].idsToUserIds[id] ) })
      
      //register private message service
      const [sendPrivateMessage, getPrivateMessage] = room.makeAction('privateMessage')
      getPrivateMessage(function(message, id){
        console.log('webRtc getMessage ' + message + ' from ' + id)
        getGroupMessage(roomId, message, global.roomObjects[roomId].idsToUserIds[id] ) })

      //register require old message service
      const [requireOldMessage, getOldMessageRequest] = room.makeAction('requireOldMessage')
      getOldMessageRequest(function(message, id){
        console.log('webRtc getMessage ' + message + ' from ' + id)
        updateGroupMessage(roomId, message, roomId , global.roomObjects[roomId].idsToUserIds[id] ) })

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
      rooms[roomId] = {object:room,
                  sendMessage: sendMessage,
                  sendPrivateMessage: sendPrivateMessage,
                  sendOldMessage: sendOldMessage,
                  requireOldMessage: requireOldMessage,
                  idsToNames : idsToNames,
                  idsToUserIds : idsToUserIds
                }

      // register name service
      const [sendName, getName] = room.makeAction('name')    
      // tell other peers currently in the room our name
      sendName(global.user.username + ':' + global.user.userId)    
      // tell newcomers
      room.onPeerJoin(id => sendName(global.user.username + ':' +  global.user.userId, id))    
      // listen for peers naming themselves
      getName(function(name, id) {
        console.log('webRtc getName ' + name + ' from ' + id)
        global.roomObjects[roomId].idsToNames[id] = name.split(':')[0]
        global.roomObjects[roomId].idsToUserIds[id] = name.split(':')[1]} )

      
      
  }
  global.roomObjects = rooms

  try {
      const value = await localforage.setItem('roomService', rooms);
      // This code runs once the value has been loaded
      // from the offline store.
      console.log(value);
  } catch (err) {
      // This code runs if there were any errors.
      console.log(err);
  }
  
  return rooms
}




export default {
  getMyGroup,
  getGroupInfo,
  searchGroup,
  addNewGroupUser,
  createGroup,
  getRecentGroup,
  getAllGroup,
  joinGroup,
  roomInit,
  sendGroupMessage
}
