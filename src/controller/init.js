
import { RCode } from './../common/constant/rcode';
import { serviceMessage } from './../common/constant/service';
import { serviceGroup } from './../common/constant/service'
import store from './../store/index'
import {joinRoom} from 'trystero'
import localforage from 'localforage'
import groupController from './group'
import zango from 'zangodb'
import chatApi from './../api/modules/chat'
import Dexie from "dexie";
import db from './db'
import global from './global';
import utilsController from './utils'
import Web3 from 'web3'

export

// 获取所有群和好友数据

const getAllData = async(  user ) => {
  dbInit(user.userId)
  const db = global.db
  // const db = new Dexie(user.userId);
  // console.log(db)
  // global.db = db
  // db.version(1).stores({
  //   groupUserRepository: "++_id, groupId, userId",
  //   groupMessageRepository: "++_id, userId, groupId, content, messageType, time",
  //   groupRepository: "groupId, userId, groupName, createTime",
  //   friendRepository: "++_id, friendId, userId",
  //   userRepository: "userId, username"
  // });
  

  
  console.log(db.groupMessageRepository)
   
  
    

//     let groupArr: GroupDto[] = [];
let groupArr = [];
//     let friendArr: FriendDto[] = [];
let friendArr = [];
//     const userGather: {[key: string]: User} = {};
const userGather= {};
//     let userArr: FriendDto[] = [];
let userArr = [];
  
//     const groupMap: GroupMap[] = await this.groupUserRepository.find({userId: user.userId}); 
const groupMap = await db.groupUserRepository.where({userId: user.userId}).toArray();//******** */
const groupIds = groupMap.map( (item) => {
  return item.groupId;
});
//groupController.roomInit(groupIds); //************* */
//     const friendMap: UserMap[] = await this.friendRepository.find({userId: user.userId});
const friendMap=  await db.friendRepository.where({userId: user.userId}).toArray();
//     const groupPromise = groupMap.map(async (item) => {
//       return await this.groupRepository.findOne({groupId: item.groupId});
//     });
    const groupPromise = groupMap.map(async (item) => {
      return db.groupRepository.where({groupId: item.groupId}).first(); //这里应该返回群详细信息
    });
//     const groupMessagePromise = groupMap.map(async (item) => {
//       let groupMessage = await getRepository(GroupMessage)
//       .createQueryBuilder("groupMessage")
//       .orderBy("groupMessage.time", "DESC")
//       .where("groupMessage.groupId = :id", { id: item.groupId })
//       .take(30)
//       .getMany();
//       groupMessage = groupMessage.reverse();
//       // 这里获取一下发消息的用户的用户信息
//       for(const message of groupMessage) {
//         if(!userGather[message.userId]) {
//           userGather[message.userId] = await this.userRepository.findOne({userId: message.userId});
//         }
//       }
//       return groupMessage;
//     });
    const groupMessagePromise = groupMap.map(async (item) => {
      let groupMessage = []
      await db.groupMessageRepository.orderBy('time')
      //await db.groupMessageRepository.reverse()
      console.log('end246')
      groupMessage = await db.groupMessageRepository.where('[groupId+time]').between(
        [ item.groupId, Dexie.minKey],
        [ item.groupId, Dexie.maxKey])
      .reverse().limit(30)
      .toArray();
      console.log(groupMessage)
      groupMessage = groupMessage.reverse();
      const group = await global.db.groupRepository.where({groupId: item.groupId}).first()
      //解密
      groupMessage.map((message) => {
        let data = message
        console.log('该群的查看消息密钥：', group.privateKey)
        if(group.privateKey){
          data.content  = utilsController.decodeXOR(data.content, group.privateKey + data.time)
        }
        return data
      })

      // 这里获取一下发消息的用户的用户信息
      for(const message of groupMessage) {
        if(!userGather[message.userId]) {
          //userGather[message.userId] = await this.userRepository.findOne({userId: message.userId});
          let user = await db.userRepository.where({userId: message.userId}).first();
          if (user){
            userGather[message.userId] = user
          }else{
            // user = await groupController.fetchUser(item.groupId, message.userId)
            // if(user){
            //   userGather[message.userId] = user
            //   db.userRepository.add(user)
            // }
            userGather[message.userId] = {
              userId: message.userId,
              username: message.userId
            }
          }          
        }
      }
      return groupMessage;
    });

    //有些已经下线的用户，本地用户获取到的他们的信息可能是空的
    // for(const userId in userGather){
    //   if(! userGather[userId]){
    //     delete userGather[userId]
    //     console.log(userGather)
    //   }
    // }
    console.log(userGather)

//     const friendPromise = friendMap.map(async (item) => {
//       return await this.userRepository.findOne({
//         where:{userId: item.friendId}
//       });
//     });
//     const friendMessagePromise = friendMap.map(async (item) => {
//       const messages = await getRepository(FriendMessage)
//         .createQueryBuilder("friendMessage")
//         .orderBy("friendMessage.time", "DESC")
//         .where("friendMessage.userId = :userId AND friendMessage.friendId = :friendId", { userId: item.userId, friendId: item.friendId })
//         .orWhere("friendMessage.userId = :friendId AND friendMessage.friendId = :userId", { userId: item.userId, friendId: item.friendId })
//         .take(30)
//         .getMany();
//       return messages.reverse();
//     });

    const friendPromise = friendMap.map(async (item) => {
      return await db.userRepository
        .where({userId: item.friendId}).first()
      ;
    });
    const friendMessagePromise = friendMap.map(async (item) => {
      const messages = await friendMessageRepository
      .where('[userId+friendId+time]')
      .between(
        [ item.userId, item.friendId, Dexie.minKey],
        [ item.userId, item.friendId, Dexie.maxKey])
      .or('[userId+friendId+time]')
      .between(
        [ item.friendId, item.userId, Dexie.minKey],
        [ item.friendId, item.userId, Dexie.maxKey])
      .reverse()
      .limit(30)
      .sortBy('time') //or语句出来顺序会乱，所以这边先排序
      .toArray();      
      return messages//.reverse(); //上面排过了，这里不用再排
    });

//     const groups: GroupDto[]  = await Promise.all(groupPromise);
const groups = await Promise.all(groupPromise);
//     const groupsMessage: Array<GroupMessageDto[]> = await Promise.all(groupMessagePromise);
const groupsMessage = await Promise.all(groupMessagePromise);
//     groups.map((group,index)=>{
//       if(groupsMessage[index] && groupsMessage[index].length) {
//         group.messages = groupsMessage[index];
//       }
//     });
//    groupArr = groups;
    groups.map((group,index)=>{
      if(groupsMessage[index] && groupsMessage[index].length) {
        group.messages = groupsMessage[index];
      }
    });
    groupArr = groups;
    console.log('刷新时，从后台获取的群聊信息：',groupArr)


//     const friends: FriendDto[] = await Promise.all(friendPromise);
    const friends = await Promise.all(friendPromise);
//     const friendsMessage: Array<FriendMessageDto[]> = await Promise.all(friendMessagePromise);
    const friendsMessage = await Promise.all(friendMessagePromise);
//     friends.map((friend, index) => {
//       if(friendsMessage[index] && friendsMessage[index].length) {
//         friend.messages = friendsMessage[index];
//       }
//     });
//     friendArr = friends;
//     userArr = [...Object.values(userGather), ...friendArr];

    friends.map((friend, index) => {
      if(friendsMessage[index] && friendsMessage[index].length) {
        friend.messages = friendsMessage[index];
      }
    });
    friendArr = friends;
    userArr = [...Object.values(userGather), ...friendArr];
    userArr = userArr.filter(function(e){return e}); 
    console.log('刷新时，从后台获取的用户信息：',userArr)

//     this.server.to(user.userId).emit('chatData', {code:RCode.OK, msg: '获取聊天数据成功', data: {
//       groupData: groupArr,
//       friendData: friendArr,
//       userData: userArr
//     }});

// let rawUser = await global.db.userRepository.where({userId : global.user.userId}).first()
// if (!rawUser.hasInit){
//   await serviceInit()
// }
chatApi.refreshChatData({code:RCode.OK, msg: '获取聊天数据成功', data: {
      groupData: groupArr,
      friendData: friendArr,
      userData: userArr
    }})
 
}
const userInit = () => {
  
}

const serviceInit = async(userId) => {
  await global.db.userRepository.add({userId : global.user.userId , username : global.user.username})
  await global.db.groupRepository.add({groupId:serviceGroup.groupId , userId: userId,  groupName: '服务群', createTime: new Date().valueOf(), lastMessage: serviceGroup.groupId })
  await global.db.groupUserRepository.add({groupId:serviceGroup.groupId , userId: userId});
  console.log('end1')


    for (let i = 0; i < serviceMessage.length; i++)
    {
      await global.db.groupMessageRepository.add(
        {
          userId: '0',
          groupId: serviceGroup.groupId,
          content: serviceMessage[i],
          width:undefined,
          height: undefined,
          messageType:'text',
          time: 0
        })
      //groupController.receiveGroupMessage(serviceGroup.groupId,  serviceMessage[i],global.user.userId ) 
    }
  }

const dbInit = async(userId) => {
  const db = new Dexie(userId);
  console.log(db)
  global.db = db
  db.version(1).stores({
    groupUserRepository: "++_id, groupId, userId",
    groupMessageRepository: "++_id, userId, groupId, content, messageType, time, preHash, &hash, signature, [groupId+time]",
    groupRepository: "&groupId, userId, groupName, createTime, lastMessage",
    friendRepository: "++_id, friendId, &userId",
    userRepository: "&userId, username",
    friendMessageRepository: "++_id, friendId, userId, content, time, [userId+friendId+time]",
    groupBlockRepository: " [groupId+number], &hash, groupId, messageRoot, time, preHash,  number, [groupId+time]",//同一群、同一高度只能有一块
    fileRepository: "hash, time, access  ",
    roomRepository: "id, privateKey, publicKey, ring, nodeId"
  });
  var web3 = new Web3(new Web3.providers.WebsocketProvider("wss://rinkeby.infura.io/ws/v3/a898a2d231e647c7928dc457c6d441c8"));
  global.web3 = web3
  let user = await global.db.userRepository.where({userId: global.user.userId})
  global.user.avatar = user.avatar
}

const dataInit = async() => {
  
  
  
}




export default {
    serviceInit,
    dbInit,
    dataInit,
    getAllData
}