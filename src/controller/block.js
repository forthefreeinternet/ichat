import { MerkleTree } from 'merkletreejs';
import groupApi from './../api/modules/group'
import initController from './init'
import groupController from './group'
import global from './global'
import Dexie from "dexie";
import SHA256  from 'crypto-js/sha256'
import EthCrypto from 'eth-crypto';
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

//一个区块应包含的信息：前一区块哈希，开始时间，消息Merkel树根，群Id
// db.version(1).stores({
//     groupBlockRepository: " &hash, groupId, messageRoot, time, preHash,  number, [groupId+time]",
//   });

// const leaves = ['a', 'b', 'c'].map(x => SHA256(x))
// const tree = new MerkleTree(leaves,sortLeaves=true)
// const root = tree.getRoot().toString('hex')
const blockTime = 1000*1000 //seconds

var syncTasks = {}
function queue(id){

}

const generateRoot = (flowers, hashLeaves = false) => {
    
    let tree 
    if (hashLeaves){
        tree = new MerkleTree(flowers, SHA256, {sortLeaves:true, hashLeaves:true})
    }else{
        let leaves = flowers.map(flower => flower.hash)
        tree = new MerkleTree(leaves, SHA256, {sortLeaves:true})
    }
    
    let root = tree.getRoot().toString('hex')
    return root
}

const updateChain = async( groupId, start) => {
    //const group = await global.db.groupRepository.where({groupId: groupId}).first();
     let lastBlock 
     if (start){
        lastBlock = await global.db.groupBlockRepository.where('[groupId+time]').between(
            [ groupId, Dexie.minKey],
            [ groupId, start+1])
          .reverse().first()
     }
     else{
        lastBlock = await global.db.groupBlockRepository.where('[groupId+time]').between(
            [ groupId, Dexie.minKey],
            [ groupId, Dexie.maxKey])
          .reverse().first()
     }

     if( !lastBlock ){
        //没有保存创世块，应该先向别处获取
        return
     }

     if(true){
         var preBlock = lastBlock
         var time = preBlock.time
         const currentTime = Date.now()
         for ( ;time < currentTime - blockTime; time = time + blockTime){
            const firstOldMessage = await global.db.groupMessageRepository.where(['groupId' , 'time'])
                .between( [groupId, time],[groupId, Dexie.maxKey])
                .first() 
            if(!firstOldMessage){
                return
            }
            let skipNumber = (firstOldMessage.time -time - ((firstOldMessage.time -time) % blockTime)) / blockTime
            time = time+ blockTime* skipNumber
            if (time >= currentTime - blockTime){
                break
            }
            let newTime = time+ blockTime
            
            let oldMessages = await global.db.groupMessageRepository.where(['groupId' , 'time']).between( [groupId, time],[groupId, newTime]).toArray() //获取已经在聊天记录数据库的消息
            console.log('找到', time, '和', newTime, '之间的消息：', oldMessages)
            if (oldMessages.length > 0){
                
                let messageRoot = generateRoot(oldMessages)  
                oldMessages = oldMessages.map((message) => {
                    return {
                        content: oldMessages.content,
                        groupId: oldMessages.groupId,
                        hash: oldMessages.hash,
                        height: oldMessages.height,
                        messageType: oldMessages.messageType,                       
                        signature: oldMessages.signature,
                        time: oldMessages.time,
                        userId: oldMessages.userId,
                        width: oldMessages.width
                    }
                })
                let newNumber = preBlock.number + 1
                const hash = global.web3.eth.accounts.hashMessage(groupId + preBlock.hash + newNumber + newTime + messageRoot)
                const newBlock = {
                    groupId: groupId,
                    preHash: preBlock.hash, 
                    time: newTime,
                    messageRoot: messageRoot,
                    hash: hash,
                    number: newNumber,
                    messages: oldMessages
                }
                console.log(newBlock)
                //更新
                global.db.groupBlockRepository.put(newBlock )
                preBlock = newBlock

            }
           
         }
     }
     
     
    
}

const localCurrentBlock = async(groupId) => {
    let lastBlock = await global.db.groupBlockRepository.where('[groupId+time]').between(
        [ groupId, Dexie.minKey],
        [ groupId, Dexie.maxKey])
      .reverse().first()


    if(lastBlock){
        return lastBlock
    }
    else{
        return null
    }
}

const localRecentBlocks = async(groupId, skeletonCount, skeletonSkip, endTime) => {
    let blocksMap = []
    for( let i = 1; i < skeletonCount; i ++){
        blocksMap.push(endTime - (i * skeletonSkip))  
    }
    blocksMap.reverse()
    let blocksPromise = blocksMap.map(async (time) => {
        return global.db.groupBlockRepository.where('[groupId+time]').between(
            [ groupId, time],
            [ groupId,Dexie.maxKey])
          .first()
    })
    const blocks = await Promise.all(blocksPromise);
    return blocks

}

const fetchRecentSkeleton = async(groupId, peerId, currentBlock, backDay) => {
    
    global.roomObjects[groupId].syncRequest({
        messageType: 'fetchRecentSkeleton',
        content: {
            currentBlock: currentBlock,
            requestSkeletonCount: backDay, //一周
            requestSkeletonSkip: 86400*1000, //一天
        }        
    }, 
    peerId)

    return new Promise(function(resolve, reject){
        syncTasks[groupId].deliverRecentBlocks[peerId] = resolve
    })
    
      
}

const fetchAllBlocks = async(groupId, peerId) => {
    global.roomObjects[groupId].syncRequest({
        messageType: 'fetchAllBlocks',
        content: {
            
        }        
    }, 
    peerId)

    return new Promise(function(resolve, reject){
        syncTasks[groupId].deliverAllBlocks[peerId] = resolve
    })
}

const fetchBlockByNumber = async(groupId, peerId, number) => {
    global.roomObjects[groupId].syncRequest({
        messageType: 'fetchBlockByNumber',
        content: {
            number: number
        }        
    }, 
    peerId)

    return new Promise(function(resolve, reject){
        syncTasks[groupId].deliverBlock[peerId] = resolve
    })
}

const fetchAncestorNeighbors = async(groupId, peerId, date) => {
    
    global.roomObjects[groupId].syncRequest({
        messageType: 'fetchAncestorNeighbors',
        content: {
            date: date
        }        
    }, 
    peerId)

    return new Promise(function(resolve, reject){
        syncTasks[groupId].deliverAncestorNeighbors[peerId] = resolve
    })
    
      
}

const generateGenesisBlock = async(adminAccount, groupAccount, groupInfo, creator, message) => {

    //构建状态，其中包含以群id为索引的群信息，以及以创建者用户id为索引的创建者信息，并标明身份
    let states = {}
    states[groupAccount.address] = groupInfo

    //如果是不需要验证的群：
    states[groupAccount.address].privateKey = groupAccount.privateKey

    creator.status = 'creator'
    states[creator.userId] = creator
    let stateLeaves = Object.values(states)
    const stateRoot = generateRoot(stateLeaves, true)
    //创世块中只有一条消息，内容为任命自己为群主
    let messages = [message]
    const messageRoot = generateRoot(messages)


    const hash = global.web3.eth.accounts.hashMessage('' + groupAccount.address + 0 + groupInfo.createTime + messageRoot + stateRoot)
    //用管理账户对hash值签名
    const signatureObject = global.web3.eth.accounts.sign(hash,adminAccount.privateKey);
    const signature = signatureObject.signature
    const newBlock = {
        groupId: groupAccount.address,
        preHash: '', 
        time: groupInfo.createTime,
        //messageRoot: root,
        number: 0,
        hash: hash,
        stateRoot: stateRoot,
        states: states,
        signature: signature,
        messageRoot: messageRoot,
        messages: messages
    }
    console.log(newBlock)
    //保存创世块
    global.db.groupBlockRepository.put(newBlock )
}

const verifyGenesis = (genesis) => {
    console.log('收到创世块', genesis)
    let adminAccount
    //验证群管理账号
    try{
        adminAccount = global.web3.eth.accounts.recover(genesis.hash ,genesis.signature )
    }catch{
        console.log('群管理账号签名错误')
        return false
    }
    const entropy = Buffer.from(adminAccount + adminAccount + adminAccount + adminAccount, 'utf-8'); // must contain at least 128 chars
    let groupAccount = EthCrypto.createIdentity(entropy);
    //let groupAccount2 = EthCrypto.createIdentity(entropy);
      
    //console.log(adminAccount, groupAccount, groupAccount2 )
    
    if (groupAccount.address != genesis.groupId){
        console.log('群管理账号签名错误')
        return false
    }

    //验证群主消息签名

    //验证消息和状态树根

    //验证哈希值

    console.log('试图保存创世块', genesis)
    global.db.groupBlockRepository.put(genesis ).then(() => {console.log('成功保存创世块', genesis)})
    
    //若有查看密钥，则保存
    console.log('查看密钥：', genesis.groupId, genesis.states[genesis.groupId], genesis.states[genesis.groupId].privateKey)
    if( genesis.states[genesis.groupId].privateKey){
        global.db.groupRepository.where({groupId: genesis.groupId}).first().then((group)=> {
            group.privateKey = genesis.states[genesis.groupId].privateKey

            global.db.groupRepository.put(group).then(()=>{console.log('保存查看密钥成功！')})
        })
        
    }
    

    return true


}

const sync = async(groupId, peerId) => {
    updateChain(groupId)
    //共同祖先的时间
    let ancestorTime 

    //获取本地当前块
    let currentBlock = await localCurrentBlock(groupId)

    if(currentBlock){
        //如果有当前块，查找最近七天的区块骨架
        let backWeeks = 1
        let remoteHeight = currentBlock.number
        let ancestorDate = []
        for(; backWeeks < 5 ;backWeeks ++){
                
            let recentBlocks = await fetchRecentSkeleton(groupId, peerId, currentBlock, 7*backWeeks)
            console.log(recentBlocks)

            if(backWeeks == 1){
                //判断一下对方的链是否和自己同一条且不比自己的长
                let b = await global.db.groupBlockRepository.where({hash: recentBlocks[recentBlocks.length -1].hash}).first() //最后一块应当是远程节点的当前块
                if (b){
                    console.log('对方的链更短')
                    return
                }
                remoteHeight = recentBlocks[recentBlocks.length -1].number
                console.log('remoteHeight' , remoteHeight)
                console.log('对方的当前块为：',  recentBlocks[recentBlocks.length -1])
            }
            

            let blocksPromise = recentBlocks.map(async (block) => {
                if (block)
                    return global.db.groupBlockRepository.where({hash: block.hash}).first()
                else
                    return null
            })
            let localBlocks = await Promise.all(blocksPromise);

            
            if (localBlocks[0]){
                //已经涵盖了共同祖先
                for (let index = 1; index < localBlocks.length; index ++){
                    if (localBlocks[index]){
                        //这一块已经保存了

                        if (localBlocks[index].number < localBlocks[index-1].number){
                            //返回的区块应该是递增的，如果不是，则返回
                            return
                        }  
                        ancestorDate[0] = localBlocks[index].time   
                    }
                    else{
                        //这一块没有保存
                        ancestorDate[1] = recentBlocks[index].time + 1 //此时已找到共同祖先块的日期上下限
                        break
                    }
                }
                break
            }
            //没有找到共同祖先，继续往前查找
        }
        let neighbors = await fetchAncestorNeighbors(groupId, peerId, ancestorDate)
        let ancestor
        console.log('查询到共同祖先附近的区块：',neighbors)
        let neighborsPromise = neighbors.map(async (block) => {
            if(block)
                return global.db.groupBlockRepository.where({hash: block.hash}).first()
            else
                return null
        })
        let localNeighbors = await Promise.all(neighborsPromise);
        for(let i in localNeighbors){
            if( !localNeighbors[i]){
                ancestor = localNeighbors[i-1]
                console.log('找到共同祖先块：', ancestor)
                break
            }
        }
        if(syncTasks[groupId].forks[ancestor.hash]){
            console.log('从', ancestor, '开始的这一分叉已经开始同步了')
            let currentMaxHeight = syncTasks[groupId].forks[ancestor.hash].finishedHeight
            let fetchTime = 0
            for(;currentMaxHeight < remoteHeight; ){
                let newBlock = await fetchBlockByNumber(groupId, peerId, currentMaxHeight + 1)
                console.log(newBlock)
                fetchTime ++
                if(newBlock){
                    if( syncTasks[groupId].forks[ancestor.hash].finishedBlock[newBlock.hash]){
                        console.log('该区块已同步')
                    }else{
                        syncTasks[groupId].forks[ancestor.hash].finishedBlock[newBlock.hash] = {preHash: newBlock.preHash}
                        syncTasks[groupId].forks[ancestor.hash].finishedHeight = newBlock.number
                        console.log('下载了区块:', newBlock)
                        processBlock(newBlock)
                    }
                }
                else{
                    break
                }
                
                currentMaxHeight = syncTasks[groupId].forks[ancestor.hash].finishedHeight
                console.log(currentMaxHeight)
                console.log(syncTasks[groupId].forks)
                if(fetchTime > 1000) break
            }
        }else{
            console.log('找到一个新的分叉')
            const finishedBlock = {}
            finishedBlock[ancestor.hash] = {
                preHash : ancestor.preHash
            }
            syncTasks[groupId].forks[ancestor.hash] = {
                finishedBlock: finishedBlock,
                peerIds: [peerId],
                finishedHeight: ancestor.number
            }

            let currentMaxHeight = syncTasks[groupId].forks[ancestor.hash].finishedHeight
            let fetchTime = 0
            console.log('remoteHeight' , remoteHeight)
            for(;currentMaxHeight < remoteHeight; ){
                let newBlock = await fetchBlockByNumber(groupId, peerId, currentMaxHeight + 1)
                console.log(newBlock)
                fetchTime ++
                if(newBlock){
                    if( syncTasks[groupId].forks[ancestor.hash].finishedBlock[newBlock.hash]){
                        console.log('该区块已同步')
                    }else{
                        syncTasks[groupId].forks[ancestor.hash].finishedBlock[newBlock.hash] = {preHash: newBlock.preHash}
                        syncTasks[groupId].forks[ancestor.hash].finishedHeight = newBlock.number
                        console.log('下载了区块:', newBlock)
                        processBlock(newBlock)
                    }
                }
                else{
                    break
                }
                
                currentMaxHeight = syncTasks[groupId].forks[ancestor.hash].finishedHeight
                console.log(currentMaxHeight)
                console.log(syncTasks[groupId].forks)
                if(fetchTime > 1000) break
            }
        }
    }

    //没有找到当前块，获取所有的区块
    else{
        let blocks = await fetchAllBlocks(groupId, peerId)
        let success = await processBlocks(blocks)
        if (success){
            ancestorTime = blocks[0].time
            
        }
        
    }

    updateChain(groupId, ancestorTime)
    
    
}

const processBlocks = async(blocks) => {
    console.log('开始验证部分区块链', blocks[0])
    if(blocks[0].number == 0){
        if (!verifyGenesis(blocks[0])){
            return false
        }
    }

    //验证每一块的前序块哈希

    //验证每一块
    for(const block of blocks){
        if (processBlock(block)){

        }else{
            return false
        }
    }
    
    
    return true

}

const processBlock = async(block) => {
    console.log('开始验证区块', block)
    if(block.number == 0){
        if (!verifyGenesis(block)){
            return false
        }
    }
    for (let message of block.messages){
                        
                        
        //验证消息链


        groupController.receiveGroupMessage(block.groupId, message, null)

    }
    
    return true

}


const deliverRecentBlocksRequest = async(groupId, request, peerId) => {
    if (request.currentBlock){
        let currentBlock = await localCurrentBlock(groupId)
        console.log('其他用户向本地发送获取群聊'+groupId+'近期区块请求时，本地的当前块', currentBlock)
        if (currentBlock){

            //对方的当前块和本地当前块相同
            if (currentBlock.hash == request.currentBlock.hash){
                console.log('其他用户向本地发送同步请求时，当前块相同')
                global.roomObjects[groupId].syncRequest({
                    messageType: 'info',
                    content: 'synchronized'
                },
                peerId)
            }
            else{
                let localBlock = await global.db.groupBlockRepository.where({hash: request.currentBlock.hash}).first()
                if(localBlock){ //对方的当前块在本地链中，返回这一块和下一块
                    let nextBlock = await global.db.groupBlockRepository.where({preHash: request.currentBlock.hash}).first()
                    const result = [localBlock, nextBlock]

                    global.roomObjects[groupId].syncRequest({
                        messageType: 'recentBlocks',
                        content: result
                    },
                    peerId)
                }else{ //对方的当前块不在本地链中，返回按天为间隔的recent blocks
                    let recentBlocks = await localRecentBlocks(groupId, 
                        request.requestSkeletonCount, 
                        request.requestSkeletonSkip,
                        ((request.currentBlock.time < currentBlock.time) ? request.currentBlock.time : currentBlock.time) + 1)
                    recentBlocks.push(currentBlock)//最后一项是本地当前块
                    //发送
                    global.roomObjects[groupId].syncRequest({
                        messageType: 'recentBlocks',
                        content: recentBlocks
                    },
                    peerId)
                }
                
            }
        }
        else{

            //本地没有保存该链的区块
            console.log('其他用户向本地发送同步群聊'+groupId+'请求时，本地没有保存该链的区块')
            global.roomObjects[groupId].syncRequest({
                messageType: 'info',
                content: 'failed'
            },
            peerId)
        }

    }
    
}


const deliverAllBlocksRequest = async(groupId, request, peerId) => {
    if (true){
        let currentBlock = await localCurrentBlock(groupId)
        console.log('其他用户向本地发送同步群聊'+groupId+'所有区块请求时，本地的当前块', currentBlock)
        if (currentBlock){

            let blocks = await global.db.groupBlockRepository.where('[groupId+time]').between(
                [ groupId, Dexie.minKey],
                [ groupId, Dexie.maxKey])
              .toArray()
            global.roomObjects[groupId].syncRequest({
                messageType: 'allBlocks',
                content: blocks
            },
            peerId)
        }
        else{

            //本地没有保存该链的区块
            console.log('其他用户向本地发送同步群聊'+groupId+'请求时，本地没有保存该链的区块')
            global.roomObjects[groupId].syncRequest({
                messageType: 'info',
                content: 'failed'
            },
            peerId)
        }

    }
    
}

const deliverAncestorNeighborsRequest  = async(groupId, request, peerId) => {
    if (true){
        let currentBlock = await localCurrentBlock(groupId)
        console.log('其他用户向本地发送同步群聊'+groupId+'祖先块邻近区块请求时，本地的当前块', currentBlock)
        if (currentBlock){

            let blocks = await global.db.groupBlockRepository.where('[groupId+time]').between(
                [ groupId, request.date[0]],
                [ groupId, request.date[1]])
              .toArray()
            global.roomObjects[groupId].syncRequest({
                messageType: 'ancestorNeighbors',
                content: blocks
            },
            peerId)
        }
        else{

            //本地没有保存该链的区块
            console.log('其他用户向本地发送同步群聊'+groupId+'请求时，本地没有保存该链的区块')
            global.roomObjects[groupId].syncRequest({
                messageType: 'info',
                content: 'failed'
            },
            peerId)
        }

    }
    
}

const deliverBlockByNumberRequest = async(groupId, request, peerId) => {
    if (true){
        let currentBlock = await localCurrentBlock(groupId)
        console.log('其他用户向本地发送获取群聊'+groupId+'单个区块请求时，本地的当前块', currentBlock)
        if (currentBlock){
            if (syncTasks[groupId].limits[peerId]){
                if(syncTasks[groupId].limits[peerId].block[request.number]){
                    syncTasks[groupId].limits[peerId].block[request.number] = syncTasks[groupId].limits[peerId].block[request.number] + 1
                    if( syncTasks[groupId].limits[peerId].block[request.number] > 2){
                        syncTasks[groupId].ban.push(peerId)
                        return
                    }
                }
                else{
                    syncTasks[groupId].limits[peerId].block[request.number] = 1
                }
            }
            else{
                syncTasks[groupId].limits[peerId] = {
                    block: {}
                }
                syncTasks[groupId].limits[peerId].block[request.number] = 1
            }
            let block = await global.db.groupBlockRepository.where('[groupId+number]').equals(
                [ groupId, request.number])
              .first()
            global.roomObjects[groupId].syncRequest({
                messageType: 'block',
                content: block
            },
            peerId)
        }
        else{

            //本地没有保存该链的区块
            console.log('其他用户向本地发送同步群聊'+groupId+'请求时，本地没有保存该链的区块')
            global.roomObjects[groupId].syncRequest({
                messageType: 'info',
                content: 'failed'
            },
            peerId)
        }

    }
    
}

export default{
    syncTasks,
    updateChain,
    localCurrentBlock,
    sync,
    deliverRecentBlocksRequest,
    deliverAllBlocksRequest,
    generateGenesisBlock,
    deliverAncestorNeighborsRequest,
    deliverBlockByNumberRequest
}