
import { RCode } from './../common/constant/rcode';
import { serviceMessage } from './../common/constant/service';
import { serviceGroup } from './../common/constant/service'
import store from './../store/index'
import {joinRoom} from 'trystero'
import localforage from 'localforage'
import groupController from './group'
import zango from 'zangodb'

// 获取所有群和好友数据

const getAllData = (  user ) => {
    let db = new zango.Db(user.userId);
    let groupUserRepository = db.collection('groupUserRepository');
    let groupMessageRepository = db.collection('groupMessageRepository');
    let groupRepository = db.collection('groupRepository');
  
    const groupMap = JSON.parse(localStorage.getItem(user.username )).group
    const groupIds = groupMap.map( (item) => {
              return item.groupId;
            });
    groupController.roomInit(groupIds);
//     let groupArr: GroupDto[] = [];
let groupArr = [];
//     let friendArr: FriendDto[] = [];
//     const userGather: {[key: string]: User} = {};
const userGather= {};
//     let userArr: FriendDto[] = [];
  
//     const groupMap: GroupMap[] = await this.groupUserRepository.find({userId: user.userId}); 
    const groupMap = groupUserRepository.find({userId: user.userId});
//     const friendMap: UserMap[] = await this.friendRepository.find({userId: user.userId});

//     const groupPromise = groupMap.map(async (item) => {
//       return await this.groupRepository.findOne({groupId: item.groupId});
//     });
    const groupPromise = groupMap.map(async (item) => {
      return groupRepository.findOne({groupId: item.groupId});
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
      groupMessageRepository
      .find({groupId: item.groupId})
      .sort({'time': -1})
      .limit(30)
      .toArray(function(err, docs) {groupMessage = docs});
      
      groupMessage = groupMessage.reverse();
      // 这里获取一下发消息的用户的用户信息
      for(const message of groupMessage) {
        if(!userGather[message.userId]) {
          //userGather[message.userId] = await this.userRepository.findOne({userId: message.userId});
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