// const GROUP_USER = require('./../models/group').groupUser
// const GROUP = require('./../models/group').group
// const ACCOUNTBASE = require('./../models/accountpool')
// const { insertNewGroupNews } = require('./groupNews')
import store from './../store/index'
import { RCode } from './../common/constant/rcode';
import { service } from './../common/constant/service';

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



export default {
  getMyGroup,
  getGroupInfo,
  searchGroup,
  addNewGroupUser,
  createGroup,
  getRecentGroup,
  getAllGroup,
  joinGroup
}
