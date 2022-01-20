// const USER = require('./../models/user')
// const ACCOUNTBASE = require('./../models/accountpool')
// const md5 = require('./../utils').md5
// const cvCode = require('./../utils/cvCode').cvCode
// const { createToken, parseToken } = require('./../utils/auth')
// const randomNickname = require('./../utils/index').randomNickname
// const { onLineUser } = require('./../app')
// const { addFriend } = require('./friendly')
// const { addNewGroupUser } = require('./group')
// let verificationCode = ''
// const officialID = '5d9d8ee6d9b830535013abaa'
// const officialGroupID = '5e803e809c5b2d2f9416f78c'
import { RCode } from './../common/constant/rcode';
import { serviceMessage } from './../common/constant/service';
import { serviceGroup } from './../common/constant/service'
import global from './global'
import store from './../store/index'
import initController from './init'

import localforage from 'localforage'
import Web3 from 'web3'//'./../assets/js/web3.min'
import utils from './../utils/common'
import groupController from './group'
//const Web3 = require('web3');
// 验证码
const generatorCode = (req, res) => {
  const { code, timestamp } = cvCode()
  verificationCode = code
  return res.json({
    status: 2000,
    data: verificationCode,
    timestamp,
    msg: 'code success'
  })
}

// 登录
// async login(data: User): Promise<any> {
//   const user = await this.userRepository.findOne({username:data.username, password: data.password});
//   if(!user) {
//     return {code: 1 , msg:'密码错误', data: ''};
//   }
//   if(!passwordVerify(data.password) || !nameVerify(data.username)) {
//     return {code: RCode.FAIL, msg:'注册校验不通过！', data: '' };
//   }
//   user.password = data.password;
//   const payload = {userId: user.userId, password: data.password};
//   return {
//     msg:'登录成功',
//     data: {
//       user: user,
//       token: this.jwtService.sign(payload)
//     },
//   };
// }
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
const login = async(req) => {
  let [ username, password] = [req.username, req.password]
  const nowTimestamp = Date.now()
  let privateKey
  let localAccount = JSON.parse(localStorage.getItem(username));//the string typed in is the key mapped to a decrypted account,
  localAccount = JSON.parse(await localforage.getItem(username));
  let account
  var web3 = new Web3(new Web3.providers.WebsocketProvider("wss://rinkeby.infura.io/ws/v3/a898a2d231e647c7928dc457c6d441c8"));
  try{
    account = web3.eth.accounts.decrypt(localAccount.secPrivateKey, password);
     privateKey = account.privateKey
  }catch{
    console.log("密码错误！");
    
    return {code: 1 , msg:'密码错误', data: ''};
  }
  // if (nowTimestamp - cvCodeTimestamp > 60000) {
  //   return res.json({
  //     status: 1007,
  //     data: [],
  //     msg: '验证码超时'
  //   })
  // }
  // if (cvCode.toLocaleUpperCase() !== verificationCode) {
  //   return res.json({
  //     status: 1002,
  //     data: '',
  //     msg: '验证码错误'
  //   })
  // }
  let doc = {
    status : 0,
    pass : (password),
    name : account,
    _id: 0


  }

  const userId = doc._id
  const token = 0//createToken(userId)
  console.log(localAccount)

  // let userJSON = localStorage.getItem('user')
  let storageAccount = JSON.parse(localStorage.getItem(username))
  if(storageAccount.avatar == ""){
    storageAccount.avatar = 'https://github.com/forthefreeinternet/ichat/blob/master/src/assets/wallpaper.png'
  }
  console.log(localAccount)
  global.user = {
    username: localAccount.accountName,
    userId : localAccount.accountAddress,       
    password: password,
    avatar: storageAccount.avatar, // `api/avatar/avatar(${Math.round(Math.random()*19 +1)}).png`,
    role: 'user',
    tag: '',
    privateKey: privateKey
    //createTime: time,
    //publicId: account2.address,
  }//user,

console.log(storageAccount.avatar)
  return {
    msg:'登录成功',
    data: {
      user: {
        username: localAccount.accountName,
        userId : localAccount.accountAddress,       
        password: password,
        avatar:  storageAccount.avatar, //`api/avatar/avatar(${Math.round(Math.random()*19 +1)}).png`,
        role: 'user',
        tag: '',
        //createTime: time,
        //publicId: account2.address,
      },//user,
      token: '0'//this.jwtService.sign(payload)
    }
  }
  // return {
  //   status: 1000,
  //   data: doc,
  //   token: token,
  //   msg: '登录成功'
  // }
  USER.findOne({
    $or: [{"name": account}, {"code": account}]
  }).then(doc => {
    if (doc === null) {
      return res.json({
        status: 1001,
        data: '',
        msg: '账号或密码错误'
      })
    }
    if (doc.status !== 0) {
      if (doc.status === 1) {
        return res.json({
          status: 1006,
          data: '',
          msg: '账号被冻结'
        })
      } else if (doc.status === 2) {
        return res.json({
          status: 1006,
          data: '',
          msg: '账号被注销'
        })
      }
    }
    if (doc) {
      let pass = md5(password)
      if (doc.pass === pass) {
        const onlineUserIds = Object.values(onLineUser).map(item => item._id)
        // if (onlineUserIds.includes((doc._id).toString())) {
        //   return res.json({
        //     status: 1001,
        //     data: null,
        //     msg: '用户已经在别处登录了！'
        //   })
        // }
        USER.update({
          $or: [{"name": account}, {"code": account}]
        }, {
          lastLoginTime: Date.now(),
          loginSetting: setting
        }).then(up => {
          console.log('upSuccess', up)
        })
        req.session.login = doc.name
        const userId = doc._id
        const token = createToken(userId)
        return res.json({
          status: 1000,
          data: doc,
          token: token,
          msg: '登录成功'
        })
      } else {
        return res.json({
          status: 1001,
          data: [],
          msg: '账号或密码错误'
        })
      }
    } else {
      return res.json({
        status: 1001,
        data: '',
        msg: '用户或密码错误'
      })
    }
  }).catch(err => {
    return res.json({
      status: 2003,
      data: err,
      msg: '服务端错误'
    })
  })
}

// 注册
// const register(user: User): Promise<any> {
//   const isHave = await this.userRepository.find({username: user.username});
//   if(isHave.length) {
//     return {code: RCode.FAIL, msg:'用户名重复', data: '' };
//   }
//   if(!passwordVerify(user.password) || !nameVerify(user.username)) {
//     return {code: RCode.FAIL, msg:'注册校验不通过！', data: '' };
//   }
//   user.avatar = `api/avatar/avatar(${Math.round(Math.random()*19 +1)}).png`;
//   user.role = 'user';
//   const newUser = await this.userRepository.save(user);
//   const payload = {userId: newUser.userId, password: newUser.password};
//   await this.groupUserRepository.save({
//     userId: newUser.userId,
//     groupId: '阿童木聊天室',
//   });
//   return {
//     msg:'注册成功',
//     data: { 
//       user: newUser,
//       token: this.jwtService.sign(payload)
//     },
//   };
// }
const register = async(req, res) => {
  console.log("test1-user.js")
  //console.log(req.account)
  //let { accountName, password, rePassword, cvCode, avatar } = req//.body
  let [accountName , password , rePassword, cvCode, avatar] = [req.username , req.password , req.password, req.cvCode, req.avatar]
  if (password !== rePassword) {
    return {
      code: RCode.FAIL, msg:'注册校验不通过！', data: ''
      // status: 1004,
      // data: '',
      // msg: '两次密码不一致'
    }
  }

  //console.log(accountName)
  if (localStorage.getItem(accountName) != null){
    return {
       code: RCode.FAIL, msg:'用户已被注册,请换个用户名重试', data: '' 
              // status: 1003,
              // data: '',
              // msg: '用户已被注册,请换个用户名重试'
    }
  }
  if (await localforage.getItem(accountName) != null){
    return {
       code: RCode.FAIL, msg:'用户已被注册,请换个用户名重试', data: '' 
              // status: 1003,
              // data: '',
              // msg: '用户已被注册,请换个用户名重试'
    }
  }
  const time = new Date().getTime()
  let entropy = accountName + password + time;
  console.log('entropy : ' , entropy)
  for (let i = entropy.length ; i < 32 ; i++){
    entropy = entropy +"0";
  }
  var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  let account =  web3.eth.accounts.create([entropy]);
  entropy = web3.eth.accounts.encrypt(account.privateKey, entropy) 
  let account2 =  web3.eth.accounts.create([entropy]);
  //console.log( account);
  let accountAddress = account.address;
  let secPrivateKey = web3.eth.accounts.encrypt(account.privateKey, password)
  //localStorage.setItem($('#js_input').val(), JSON.stringify(this.$web3.eth.accounts.encrypt(account.privateKey, $('#js_input_password').val())));
  let info = {'accountName': accountName, 'accountAddress': accountAddress , 'secPrivateKey': secPrivateKey , 
  'contactList': {}, role : 'user' , publicId: account2.address , group: [{groupId: '0'}], avatar: 'https://github.com/forthefreeinternet/ichat/blob/master/src/assets/wallpaper.png'}
  
  global.user = {
    username: accountName,
    userId : accountAddress,       
    password: password,
    privateKey : account.privateKey,
    avatar: 'https://github.com/forthefreeinternet/ichat/blob/master/src/assets/wallpaper.png',
    role: 'user',
    tag: '',
    //createTime: time,
    //publicId: account2.address,
  }
  localStorage.setItem(accountName , JSON.stringify(info))
  await localforage.setItem(accountName , JSON.stringify(info))

  await initController.dbInit(accountAddress)
  await initController.serviceInit(accountAddress)
  
  return {
    msg:'注册成功',
    data: { 
      user: {
        userId: accountAddress,
        username: accountName,
        password: password,
        avatar: 'https://github.com/forthefreeinternet/ichat/blob/master/src/assets/wallpaper.png',//`api/avatar/avatar(${Math.round(Math.random()*19 +1)}).png`,
        role: 'user',
        tag: '',
        createTime: time,
        publicId: account2.address,
      },//newUser,
      token: '0' //this.jwtService.sign(payload)
    }
    // status: 1005,
    // data: account,
    // msg: '注册成功'
  }


//   if (cvCode.toLocaleUpperCase() !== verificationCode) {
//     return res.json({
//       status: 1002,
//       data: '',
//       msg: '验证码错误'
//     })
//   }
//   USER.find({
//     name: account
//   }).then(doc => {
//     if (doc.length) {
//       return res.json({
//         status: 1003,
//         data: '',
//         msg: '用户已被注册,请换个用户名重试'
//       })
//     } else {
//       // const random = Math.random()
//       ACCOUNTBASE.findOneAndUpdate({
//         // type: '1', status: '0', random: { $gte: random }}, { status: '1' }
//         type: '1', status: '0'}, { status: '1' }
//       ).then(doc1 => {
//         if (!doc1) {
//           return res.json({
//             status: 1004,
//             data: '',
//             mag: '用户注册已达到上限'
//           })
//         } else {
//           const pass = md5(password)
//           USER.create({
//             name: account,
//             pass: pass,
//             code: doc1.code,
//             photo: avatar,
//             nickname: randomNickname()
//           }).then(doc2 => {
//             console.log(doc2)
//             if (doc2['_id']) {
//               // addFriend({userM: officialID, userY: doc2['_id']})
//               // addNewGroupUser({userId: doc2['_id'], groupId: officialGroupID, userName: doc2.name})
//               return res.json({
//                 status: 1005,
//                 data: doc1.code,
//                 msg: '注册成功'
//               })
//             } else {
//               return res.json({
//                 status: 1004,
//                 data: '',
//                 msg: '注册失败,请重新尝试'
//               })
//             }
//           })
//         }
//       }).catch(err => {
//         res.json({
//           status: 2003,
//           data: err,
//           msg: '服务器内部错误'
//         })
//       })
//     }
//   })
}

const defaultAvatarUrl = ""

const setUserAvatar = (data) =>{
  
  console.log(data)
  if(window.FileReader) {
  var reader = new FileReader();
}
else {
  alert("当前浏览器不支持!");
}

return new Promise((resolve, reject) => {
  try {
    //var reader = new FileReader()
    if (data) {
      reader.readAsDataURL(data)
      reader.onload = function(){
        console.log(this.result)
        global.db.userRepository.where({userId: global.user.userId}).modify({avatar: this.result})
        console.log(global.user.userId)
        let info = JSON.parse(localStorage.getItem(global.user.username))
        console.log(localStorage.getItem(global.user.username))
        info.avatar = this.result
        console.log(info)
        localStorage.setItem(global.user.username , JSON.stringify(info))
        // let info = JSON.parse(localforage.getItem(global.user.userId , JSON.stringify(info)) )
        // info.avatar = this.result
        // localforage.setItem(global.user.userId , JSON.stringify(info))
        global.user.avatar = this.result

        //通知每一个群
        for( const roomId in global.roomObjects){
          let data = {
            userId: global.user.userId,
            groupId: roomId,
            messageType : 'user' ,
            content : {
              username: global.user.username,
              userId: global.user.userId,
              avatar: global.user.avatar
            }
          } 
          console.log(data)
          
          groupController.sendGroupMessage(data)
        }
        resolve( global.user)
      }
      // reader.onloadend = function(e) {
      //   resolve(reader.result)
      // }
      reader.onerror = function() {
        reject("load file error")
      }
      
    } else {
      reject("file not found")
    }
  } catch (e) {
    reject("file not found")
  }
})

reader.readAsDataURL(data);
reader.onload = function(){
console.log(this.result)
global.user.avatar = this.result
return global.user
//document.getElementById("file_img").src = this.result;
}
// var img
// if (!!this.avatar) {
//             //读取本地文件
//             var reader = new FileReader();
//             reader.readAsArrayBuffer(this.avatar);//ArrayBuffer对象
//             reader.onload = function (e) {
//                 //读取完毕后输出结果
//                 console.log(e.target.result);
//                 img = new Blob([new Int8Array(e.target.result, 0, 读取字节长度)],
//                    { type: "image/png" }); //type类型可自定义
//             }
//         }
      
// var url = window.URL.createObjectURL(img);
// console.log(url)


}






// 获取用户信息
const getUserInfo = (req, res) => {
  let { id } = req.query
  USER.findById({
    _id: id
  }).then(doc => {
    if (doc) {
      return res.json({
        status: 2000,
        data: doc,
        msg: '获取用户详情成功！'
      })
    } else {
      return res.json({
        status: 2001,
        data: '',
        msg: '没有获取到用户数据！'
      })
    }
  }).catch(err => {
    res.json({
      status: 2003,
      data: '',
      msg: '服务端错误，请稍后重试！'
    })
  })
}

// 预获取用户列表,在添加好友的时候根据查询字符获取
const preFetchUser = (req, res) => {
  const { type, q, page, pageSize } = req.query
  const reg = new RegExp(q)
  USER.find({
    [type]: {$regex: reg}
  }).limit(Number(pageSize)).skip(Number(page) * Number(pageSize)).then(doc => {
    return res.json({
      status: 2000,
      data: doc,
      msg: '获取成功！'
    })
  }).catch(err => {
    return res.json({
      status: 2003,
      data: err,
      msg: '服务器错误，请稍后重试！'
    })
  })
}

// 获取所有用户(在Admin端获取)
const getAllUser = (req, res) => {
  USER.find().then(doc => {
    return res.json({
      status: 2000,
      data: doc,
      msg: '获取用户成功'
    })
  }).catch(err => {
    return res.json({
      status: 2003,
      data: err,
      msg: '服务器错误，请稍后重试！'
    })
  })
}

// 根据注册时间获取用户
const getUserBySignUpTime = (req, res) => {
  const { gt, lt } = req.query
  const gtDate = new Date(gt)
  const ltDate = new Date(lt)
  USER.find({'signUpTime': {$lte: ltDate ,$gte: gtDate}}).sort({'signUpTime': -1}).then(doc => {
    return res.json({
      status: 2000,
      data: doc,
      msg: '成功'
    })
  })
}

// 更改用户的状态(status)
const changeUserStatus = (req, res) => {
  const { id, state } = req.body
  USER.findByIdAndUpdate({'_id': id}, {
    'status': state
  }).then(doc => {
    res.json({
      status: 2000,
      data: doc,
      msg: 'success'
    })
  }).catch(err => {
    return res.json({
      status: 2003,
      dataL: err,
      msg: '服务器错误，请稍后重试！'
    })
  })
}

// 添加新的分组
const addNewFenzu = async (req, res) => {
  const { name, userId } = req.body
  const userInfo = await USER.findOne({_id: userId})
  const friendFenzu = userInfo.friendFenzu
  const friendFenzuKeys = Object.keys(friendFenzu)
  // const isHas = name in friendFenzu
  let newFriendFenzu = null
  if (!friendFenzuKeys.includes(name)) {
    newFriendFenzu = Object.assign({}, friendFenzu, {[name]: []})
  } else {
    newFriendFenzu = friendFenzu
  }
  const upDoc = await USER.findByIdAndUpdate({
    _id: userId
  }, {
    $set: {friendFenzu: newFriendFenzu}
  })
  return res.json({
    status: 2000,
    data: upDoc,
    msg: '添加新分组成功'
  })
}

// 删除分组
const deleteFenzu = async (req, res) => {
  const { fenzuName, userId } = req.body
  const userInfo = await USER.findOne({_id: userId})
  const friendFenzu = userInfo.friendFenzu
  const newFriendFenzu = JSON.parse(JSON.stringify(friendFenzu))
  delete newFriendFenzu[fenzuName]
  const upDoc = await USER.findByIdAndUpdate({
    _id: userId
  }, {
    $set: {friendFenzu: newFriendFenzu}
  })
  return res.json({
    status: 2000,
    data: upDoc,
    msg: '删除成功！'
  })
}

// 编辑某项分组的名称
const editFenzu = async (req, res) => {
  const { oldFenzu, newFenzu, userId } = req.body
  const userInfo = await USER.findOne({_id: userId})
  const friendFenzu = userInfo.friendFenzu
  const newFriendFenzu = JSON.parse(JSON.stringify(friendFenzu))
  const oldFenzuUsers = friendFenzu[oldFenzu]
  delete newFriendFenzu[oldFenzu]
  newFriendFenzu[newFenzu] = oldFenzuUsers
  const upDoc = await USER.findByIdAndUpdate({
    _id: userId
  }, {
    $set: {friendFenzu: newFriendFenzu}
  })
  return res.json({
    status: 2000,
    data: upDoc,
    msg: '更新成功！'
  })
}

// 修改好友分组
const modifyFrienFenzu = async (req, res) => {
  const { userId, friendId, newFenzu } = req.body
  const userInfo = await USER.findOne({_id: userId})
  const friendFenzu = JSON.parse(JSON.stringify(userInfo.friendFenzu))
  // 找到原来的分组
  let oldFenzu = ''
  for (const key in friendFenzu) {
    if (friendFenzu.hasOwnProperty(key)) {
      const element = friendFenzu[key];
      if (element.includes(friendId)) {
        oldFenzu = key
      }
    }
  }
  if (oldFenzu === newFenzu) {
    return res.json({
      status: 2000,
      data: '',
      msg: '已经在次分组'
    })
  }
  // 如果原来已经在某个分组就从中去掉
  if (oldFenzu) {
    const olfFenzuIdsIndex = friendFenzu[oldFenzu].findIndex(item => item === friendId)
    friendFenzu[oldFenzu].splice(olfFenzuIdsIndex, 1)
  }
  // 加入新的分组
  friendFenzu[newFenzu].push(friendId)
  console.log(friendFenzu)
  const upDoc = await USER.findByIdAndUpdate({
    _id: userId
  }, {
    $set: {friendFenzu: friendFenzu}
  })
  return res.json({
    status: 2000,
    data: upDoc,
    msg: '跟新成功'
  })
}

// 修改好友备注
const modifyBeizhu = async (req, res) => {
  const {userId, friendId, friendBeizhu} = req.body
  const userInfo = await USER.findOne({_id: userId})
  const beizhuMap = userInfo.friendBeizhu
  const newBeizhuMap = Object.assign({}, beizhuMap, {[friendId]: friendBeizhu})
  const upDoc = await USER.findByIdAndUpdate({
    _id: userId
  }, {
    $set: {friendBeizhu: newBeizhuMap}
  })
  return res.json({
    status: 2000,
    data: upDoc,
    msg: '修改备注成功！'
  })
}

// 更新在线时长
const updateUserOnlineTime = async (data) => {
  const { userId, time } = data
  console.log(time)
  const doc = await USER.findByIdAndUpdate({
    _id: userId
  }, {
    $inc: {onlineTime: Number(time)}
  })
  return doc
}

// 更新用户信息
const updateUserInfo = async (req, res) => {
  /**
   * field：更新的项，比如昵称、性别等
   * value：更新的值
   * userId：用户的ID
   */
  try {
    const { field, value, userId } = req.body
    if (parseToken(req.headers.authorization) !== userId) {
      return res.json({
        status: 2001,
        data: [],
        msg: '错误操作！'
      })
    }
    const data = await USER.findByIdAndUpdate({
      _id: userId
    }, {
      [field]: value
    })
    return res.json({
      status: 2000,
      data: [],
      msg: '修改成功！'
    })
  } catch (error) {
    return res.json({
      status: 2003,
      data: error,
      msg: '服务端错误！'
    })
  }
}

// 更新用户密码
const updateUserPwd = async (req, res) => {
  try {
    const { oldPwd, newPwd, reNewPwd, userId } = req.body
    const {pass: userPwd} = await USER.findOne({_id: userId}, {pass: 1})
    const oldPwdMD5 = md5(oldPwd)
    const newPwdMD5 = md5(newPwd)
    if (parseToken(req.headers.authorization) !== userId) {
      return res.json({
        status: 2001,
        data: [],
        msg: '错误操作！'
      })
    }
    if (userPwd !== oldPwdMD5) {
      return res.json({
        status: 2001,
        data: [],
        msg: '原始密码输入错误！'
      })
    }
    if (newPwd !== reNewPwd) {
      return res.json({
        status: 2001,
        data: [],
        msg: '两次密码不一致！'
      })
    }
    const data = await USER.findByIdAndUpdate({
      _id: userId
    }, {
      pass: newPwdMD5
    })
    return res.json({
      status: 2000,
      data: [],
      msg: '更新成功，请牢记你的新密码！'
    })
  } catch (error) {
    return res.json({
      status: 2003,
      data: [],
      msg: '服务端错误！'
    })
  }
}

export default {
  login,
  serviceInit,
  generatorCode,
  register,
  getUserInfo,
  preFetchUser,
  getAllUser,
  getUserBySignUpTime,
  changeUserStatus,
  addNewFenzu,
  deleteFenzu,
  editFenzu,
  modifyFrienFenzu,
  modifyBeizhu,
  updateUserOnlineTime,
  updateUserInfo,
  updateUserPwd,
  setUserAvatar
}
