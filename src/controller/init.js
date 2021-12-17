
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

export

// 获取所有群和好友数据

const getAllData = async(  user ) => {
  const db = new Dexie(user.userId);
  console.log(db)
  global.db = db
  db.version(1).stores({
    groupUserRepository: "++_id, groupId, userId",
    groupMessageRepository: "++_id, userId, groupId, content, messageType, time",
    groupRepository: "groupId, userId, groupName, notice,createTime",
    friendRepository: "++_id, friendId, userId",
  });
  console.log(db.groupMessageRepository)
   
  
    const groupMap = await db.groupUserRepository.where({userId: user.userId}).toArray();//******** */
    const groupIds = groupMap.map( (item) => {
              return item.groupId;
            });
    //groupController.roomInit(groupIds); //************* */
//     let groupArr: GroupDto[] = [];
let groupArr = [];
//     let friendArr: FriendDto[] = [];
let friendArr = [];
//     const userGather: {[key: string]: User} = {};
const userGather= {};
//     let userArr: FriendDto[] = [];
let userArr = [];
  
//     const groupMap: GroupMap[] = await this.groupUserRepository.find({userId: user.userId}); 
    //const groupMap = groupUserRepository.find({userId: user.userId}); //********** */
//     const friendMap: UserMap[] = await this.friendRepository.find({userId: user.userId});
const friendMap=  await db.friendRepository.where({userId: user.userId});
//     const groupPromise = groupMap.map(async (item) => {
//       return await this.groupRepository.findOne({groupId: item.groupId});
//     });
    const groupPromise = groupMap.map(async (item) => {
      return db.groupRepository.where({groupId: item.groupId}); //这里应该返回群详细信息
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
      groupMessage = await db.groupMessageRepository
      .where({groupId: item.groupId}).limit(30)
      .toArray();
      console.log(groupMessage)
      groupMessage = groupMessage.reverse();
      // 这里获取一下发消息的用户的用户信息
      for(const message of groupMessage) {
        if(!userGather[message.userId]) {
          //userGather[message.userId] = await this.userRepository.findOne({userId: message.userId});
          userGather[message.userId] = await db.userRepository.where({userId: message.userId}).first();
        }
      }
      return groupMessage;
    });

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


//     const friends: FriendDto[] = await Promise.all(friendPromise);
//     const friendsMessage: Array<FriendMessageDto[]> = await Promise.all(friendMessagePromise);
//     friends.map((friend, index) => {
//       if(friendsMessage[index] && friendsMessage[index].length) {
//         friend.messages = friendsMessage[index];
//       }
//     });
//     friendArr = friends;
//     userArr = [...Object.values(userGather), ...friendArr];

//     this.server.to(user.userId).emit('chatData', {code:RCode.OK, msg: '获取聊天数据成功', data: {
//       groupData: groupArr,
//       friendData: friendArr,
//       userData: userArr
//     }});

chatApi.refreshChatData({code:RCode.OK, msg: '获取聊天数据成功', data: {
      groupData: groupArr,
      friendData: friendArr,
      userData: userArr
    }})
 
}
const userInit = () => {
  
}
const serviceInit = () => {
    for (let i = 0; i < serviceMessage.length; i++)
    {
      store.dispatch('chat/groupMessage', {code: RCode.OK, msg:'', data: {
        userId: '0',
        groupId: serviceGroup.groupId,
        content: serviceMessage[i],
        width:undefined,
        height: undefined,
        messageType:'text',
      }})
    }
    }



export default {
    serviceInit,
    
    getAllData
}