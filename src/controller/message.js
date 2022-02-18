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

const fetchProgress = (data) => {
  let torrents = []
  if(data.groupId){
    for(const client of global.roomObjects[data.groupId].clients){
      for(const torrent of client.torrents){
        if(torrent.infoHash == data.content.hash){
          console.log('找到种子！')
          torrents.push(torrent)
          // return {
          //   numPeers: torrent.numPeers,
          //   progress: torrent.progress,
          //   downloaded: torrent.downloaded,
          //   length: torrent.length,
          //   done: torrent.done,
          //   timeRemaining: torrent.timeRemaining, 
          //   downloadSpeed: torrent.downloadSpeed,
          //   uploadSpeed: torrent.uploadSpeed,
          // }
        }
      }
      
    }

    if(torrents.length>0){
      let bestTorrent = torrents[0]
      let minTimeRemaining = torrents[0].timeRemaining
      for( const torrent of torrents){
        if (torrent.timeRemaining < minTimeRemaining){
          bestTorrent = torrent
        }
      }
      const torrent = bestTorrent
      console.log('找到最快下载完的种子')
      return {
        numPeers: torrent.numPeers,
        progress: torrent.progress,
        downloaded: torrent.downloaded,
        length: torrent.length,
        done: torrent.done,
        timeRemaining: torrent.timeRemaining, 
        downloadSpeed: torrent.downloadSpeed,
        uploadSpeed: torrent.uploadSpeed,
      }
    }
  }
}

const stopDownload = (hash) => {
  if(data.groupId){
    for(const client of global.roomObjects[data.groupId].clients){
      for(const torrent of client.torrents){
        if(torrent.infoHash == data.content.hash){
          console.log('找到准备停止下载的种子！')
          client.remove(torrent)
          
        }
      }
      
    }
  }
}

var fileFetching = {}//{status: 'processing', promise:{resolve(file)}, }

const fetchFile = async(data) => {
  let res
  console.log(data)
  //先找一下有没有已经完成下载的种子
  var torrents = []
  if(data.groupId){
    for(const client of global.roomObjects[data.groupId].clients){
      for(const torrent of client.torrents){
        if(torrent.infoHash == data.content.hash){
          console.log('fetchFile找到种子！')
          if( torrent.progress == 1 || torrent.done || torrent.length == torrent.downloaded){
            console.log('fetchFile找到已经有完整文件的种子！', torrent)
            return torrent.files[0]
          }
          torrents.push(torrent)
        }
      }
      
    }
  }

  //如果没有，查一下数据库看看有没有
  res = await global.db.fileRepository.where({hash: data.content.hash}).first()
  if(res){
    console.log('从本地数据库中找到文件', res)
    if(res.type == 'blob'){  
      console.log(res.blob)
      const file = new File([ res.blob ], data.content.name, { type: data.content.type })
      if(data.groupId){
        for(const torrent of global.roomObjects[data.groupId].uploadClient.torrents){
          
            if (torrent.infoHash == data.content.hash){
              return new Promise((resolve, reject) => {
                resolve(torrent.files[0])
              })
              global.roomObjects[data.groupId].uploadClient.remove(torrent.infoHash)
            }
          
        }
        return new Promise((resolve, reject) => {
          global.roomObjects[data.groupId].uploadClient.seed(file, null, async(torrent) => {
            console.log(torrent.files[0])
            resolve(torrent.files[0])
          })
        })
      }
      
      //return res.blob
    }
  }
  else{

    //如果还没有，从正在下载的种子里获取文件
    if(torrents.length>0){
      let bestTorrent = torrents[0]
      let minTimeRemaining = torrents[0].timeRemaining
      for( const torrent of torrents){
        if (torrent.timeRemaining < minTimeRemaining){
          bestTorrent = torrent
        }
      }
      if (bestTorrent.downloaded > 0)
      {
        console.log('找到最快下载完的种子', bestTorrent, bestTorrent.files[0])
        return bestTorrent.files[0]
      }
    }
    

    //如果还没有，看看fileFetching对象中保存的promise
    if( fileFetching[data.content.hash] != null ){
      if( fileFetching[data.content.hash].status == 'processing')
      console.log('该种子已经开始下载了')
      //这时候下载请求已经提交到群房间以及DHT网络上了，但是还没有获取到种子元信息。
      //获取到之后，应该把file作为promise的resolve值赋值给fileFetching[data.content.hash]
      console.log(fileFetching[data.content.hash].filePromise)
      return await fileFetching[data.content.hash].filePromise
    }
    //fileFetching[data.content.hash].status = 'processing'
   
    //如果还没有，从远程节点或群成员那里下载
    if(data.groupId){
      let filePromise = groupController.fetchFile(data)
      fileFetching[data.content.hash] = {
        status: 'processing',
        filePromise: filePromise
      }
      let file = await filePromise
      if(file){
        console.log('成功从群', data.groupId, '下载到文件', file)
        file.getBlob((err, blob)=>{
          global.db.fileRepository.put({
            hash: data.content.hash,
            type: 'blob',
            blob: blob,
            time: data.time,
            access: data.groupId,
            name: data.content.name,
          }).then(()=>{console.log('成功从群', data.groupId, '下载到文件', file, '并保存')})
        })
        

        return file
        // const blob = new Blob([res],  { type: data.content.type })
        // if(true){//res.type == 'blob'){
        //   let file = new File([ blob ], data.content.name, { type: data.content.type })
        //   return new Promise(function(resolve, reject){
        //     global.roomObjects[data.groupId].uploadClient.seed(file, null, async(torrent) => {
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
  fetchFile,
  fetchProgress
}
