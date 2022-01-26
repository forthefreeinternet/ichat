// const NEWS = require('./../models/news')
// const { todayAndTomorrow } = require('./../utils')
import groupController from './group'
import global from './global'



const defaultNews = { // 如果没有消息记录设置默认的
  message: '',
  messageType: 'text',
  time: Date.now()
}

// 存入新的消息
const insertNewNews = async (news) => {
  const data = await NEWS.insertMany(news)
  console.log(data)
  return data[0]
}

// 获取好友之间的聊天记录，通过房间id来获取，房间id是由两个好友id组成，所以是唯一的
const getRecentNews = async (req, res) => {
  const { roomid, page, pageSize } = req.query
  try {
    const data = await NEWS.find({
      roomid: roomid
    }).sort({_id: -1}).skip(Number(page*pageSize)).limit(Number(pageSize))
    return res.json({
      status: 2000,
      data,
      msg: '获取成功'
    })
  } catch (error) {
    res.json({
      status: 2003,
      data: error,
      msg: '服务端错误，请稍后重试！'
    })
  }
}

// 获取好友之间的最后一条聊天记录
const getLastNews = async (req, res) => {
  const { roomid } = req.body
  const news = await NEWS.findOne({
    roomid
  }).sort({_id: -1})
  return res.json({
    status: 2000,
    data: news || {roomid, ...defaultNews},
    msg: '获取成功'
  })
}

// 在用户切换到某条会话之后将给会话下的所有消息设置为已读
const userIsReadMsg = async (req, res) => {
  const { roomid, userId } = req.body
  const data = await NEWS.updateMany({
    roomid
  }, {
    $addToSet: {isReadUser: userId}
  })
  return res.json({
    status: 2000,
    data: data,
    msg: 'success'
  })
}

const getHistoryMsg = async (req, res) => {
  const { roomid, type, query, date, page, pageSize } = req.body
  const queryReg = new RegExp(query)
  const params = {
    roomid,
    message: {$regex: queryReg}
  }
  if (type !== 'all') {
    params['messageType'] = type
    delete params['message']
  }
  if (!!date) {
    const { today, tomorrow } = todayAndTomorrow(date)
    params['time'] = {$gte: today, $lt: tomorrow}
  }
  console.log('getHistoryMsg', params)
  const msgList = await NEWS.find({
    ...params
  }).skip(Number(page*pageSize)).limit(Number(pageSize))
  const count = await await NEWS.find({
    ...params
  }).count()
  return res.json({
    status: 2000,
    data: {
      data: msgList,
      total: count
    },
    msg: 'success'
  })
}

const fetchFile = async(data) => {
  let res
  console.log(data)
  res = await global.db.fileRepository.where({hash: data.content.hash}).first()
  if(res){
    console.log('从本地数据库中找到文件', res)
    if(res.type == 'blob'){  
      console.log(res.blob)
      const file = new File([ res.blob ], data.content.name, { type: data.content.type })
      if(data.groupId){
        for(const torrent of global.roomObjects[data.groupId].torrentClient.torrents){
          
            if (torrent.infoHash == data.content.hash){
              global.roomObjects[data.groupId].torrentClient.remove(torrent.infoHash)
            }
          
        }
        return new Promise((resolve, reject) => {
          global.roomObjects[data.groupId].torrentClient.seed(file, null, async(torrent) => {
            console.log(torrent.files[0])
            resolve(torrent.files[0])
          })
        })
      }
      
      //return res.blob
    }
  }
  else{
    if(data.groupId){
      res = await groupController.fetchFile(data)
      if(res){
        console.log('成功从群', data.groupId, '下载到文件', res)
        res.getBlob((err, blob)=>{
          global.db.fileRepository.put({
            hash: data.content.hash,
            type: 'blob',
            blob: blob,
            time: data.time,
            access: data.groupId,
            name: data.content.name,
          })
        })
        

        return res
        // const blob = new Blob([res],  { type: data.content.type })
        // if(true){//res.type == 'blob'){
        //   let file = new File([ blob ], data.content.name, { type: data.content.type })
        //   return new Promise(function(resolve, reject){
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
        //         resolve(blob)
        //       }
        //       else{
        //         console.log('哈希验证失败')
        //       }
        //     })
        //   })
          
        // }
      }
      
    }
  }
  
}

export default {
  insertNewNews,
  getRecentNews,
  getLastNews,
  userIsReadMsg,
  getHistoryMsg,
  fetchFile
}
