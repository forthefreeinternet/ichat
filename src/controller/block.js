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
    const group = await global.db.groupRepository.where({groupId: groupId}).first();
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
            let newTime = time+ blockTime
            let oldMessages = await global.db.groupMessageRepository.where(['groupId' , 'time']).between( [groupId, time],[groupId, newTime]).toArray() //通过哈希值获取已经在聊天记录数据库的消息
            console.log('找到', time, '和', newTime, '之间的消息：', oldMessages)
            if (oldMessages.length > 0){
                
                let messageRoot = generateRoot(oldMessages)  
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
    for( let i = 0; i < skeletonCount; i ++){
        blocksMap.push(endTime - (i * skeletonSkip))  
    }
    blocksMap.reverse()
    let blocksPromise = blocksMap.map(async (time) => {
        return global.db.groupBlockRepository.where('[groupId+time]').between(
            [ groupId, Dexie.minKey],
            [ groupId,time])
          .reverse().first()
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
    let groupAccount2 = EthCrypto.createIdentity(entropy);
      
    console.log(adminAccount, groupAccount, groupAccount2 )
    
    if (groupAccount.address != genesis.groupId){
        console.log('群管理账号签名错误')
        return false
    }

    //验证群主消息签名

    //验证消息和状态树根

    //验证哈希值

    global.db.groupBlockRepository.put(genesis )
    return true


}

const sync = async(groupId, peerId) => {
    //共同祖先的时间
    let ancestorTime 

    //获取本地当前块
    let currentBlock = await localCurrentBlock(groupId)

    if(currentBlock){
        //如果有当前块，查找最近七天的区块骨架
        let backWeeks = 1

        let ancestorDate = []
        for(; backWeeks < 5 ;backWeeks ++){
                
            let recentBlocks = await fetchRecentSkeleton(groupId, peerId, currentBlock, 7*backWeeks)
            console.log(recentBlocks)

            //判断一下对方的链是否和自己同一条且不比自己的长
            let b = await global.groupBlockRepository.where({hash: recentBlocks[-1].hash}).first()
            if (b){
                return
            }

            let blocksPromise = recentBlocks.map(async (block) => {
                return global.groupBlockRepository.where({hash: block.hash}).first()
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
                        ancestorDate[1] = localBlocks[index].time //此时已找到共同祖先块的日期上下限
                    }
                }
                break
            }
            //没有找到共同祖先，继续往前查找
        }
        let neighbors = await fetchAncestorNeighbors(groupId, peerId, ancestorDate)
        console.log(neighbors)
        let neighborsPromise = neighbors.map(async (block) => {
            return global.groupBlockRepository.where({hash: block.hash}).first()
        })
        let localNeighbors = await Promise.all(neighborsPromise);
        for(let i in localNeighbors){
            if( !localNeighbors[i]){

            }
        }
    }

    //没有找到当前块，获取所有的区块
    else{
        let blocks = await fetchAllBlocks(groupId, peerId)
        let success = await processBlocks(blocks)
        if (success){
            ancestorTime = blocks[0].time
            for (let block of blocks){
                               
                if (block.messages){
                    for (let message of block.messages){
                        
                        
                        //验证消息链


                        groupController.receiveGroupMessage(groupId, message, peerId)
    
                    }
                }
                
            }
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

    return true

}



const deliverRecentBlocksRequest = async(groupId, request, peerId) => {
    if (request.currentBlock){
        let currentBlock = await localCurrentBlock(groupId)
        console.log('其他用户向本地发送同步请求时，本地的当前块', currentBlock)
        if (currentBlock){

            //当前块相同
            if (currentBlock.hash == request.currentBlock.hash){
                console.log('其他用户向本地发送同步请求时，当前块相同')
                global.roomObjects[groupId].syncRequest({
                    messageType: 'info',
                    content: 'synchronized'
                },
                peerId)
            }
            else{
                let recentBlocks = await localRecentBlocks(groupId, 
                    request.requestSkeletonCount, 
                    request.requestSkeletonSkip,
                    ((request.currentBlock.time < currentBlock.time) ? request.currentBlock.time : currentBlock.time) + 1)
                global.roomObjects[groupId].syncRequest({
                    messageType: 'recentBlocks',
                    content: recentBlocks
                },
                peerId)
            }
        }
        else{

            //本地没有保存该链的区块
            console.log('其他用户向本地发送同步请求时，本地没有保存该链的区块')
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
        console.log('其他用户向本地发送同步请求时，本地的当前块', currentBlock)
        if (currentBlock){

            let blocks = await global.db.groupBlockRepository.where('[groupId+time]').between(
                [ groupId, Dexie.minKey],
                [ groupId, Dexie.maxKey])
              .reverse().toArray()
            global.roomObjects[groupId].syncRequest({
                messageType: 'allBlocks',
                content: blocks
            },
            peerId)
        }
        else{

            //本地没有保存该链的区块
            console.log('其他用户向本地发送同步请求时，本地没有保存该链的区块')
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
    generateGenesisBlock
}