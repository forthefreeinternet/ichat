const roomInit = async(roomId, password) => {
    //let rooms = {}
    //for (const roomId of roomIds){
  
        //Establish a webRtc room, and access it by appId and roomId
        const config = {appId: roomId, password: password}
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
  
        const [sendFile, getFile, onFileProgress] = room.makeAction('file')
        getFile(function(message, id, meta){
          console.log('webRtc getMessage ' , message , ' from ' + id + '(' + global.roomObjects[roomId].idsToUserIds[id] + ') in ' + roomId)
          processFile(roomId, message, id, meta)
        })  
        // onFileProgress(function(percent, peerId, metadata){
  
        // })
  
  
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

//这个是每个好友或群的虚拟聊天房间，下辖多个webRTC房间
//虚拟房间和webRTC房间都以id为索引储存在global.roomObjects对象中
const initRooms = async(id) => {
  const idsToNames = {}
  const idsToUserIds = {}
  console.log(JSON.stringify(global.user))
  idsToNames[selfId] = global.user.username 
  idsToUserIds[selfId] =  global.user.userId
  const client = new WebTorrent()


  //读取数据库，找到该虚拟房间的所有webRTC房间的id和对应的房间密钥
  var roomIds = {}
  var passwords = {}
  //初始化这些webRTC房间
  for (const index in this.roomIds){
    roomInit(roomIds[index],passwords[index])
  }


  var roomObject = {//room:room,
      roomIds: roomIds, //记录所有webRTC房间的id
      selfId: selfId,
      sendMessage: function(message, id){
          for (const roomId of this.roomIds){
              global.roomObjects[roomId].sendMessage(message, id)
          }
      },
      sendPrivateMessage: sendPrivateMessage,
      sendFile: function(blob, id, meta){
        for (const roomId of this.roomIds){
            global.roomObjects[roomId].sendFile(blob, id, meta)
        }
      },
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

  global.roomObjects[id] = roomObject
}