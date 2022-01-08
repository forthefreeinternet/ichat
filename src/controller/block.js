import { MerkleTree } from 'merkletreejs';
import groupApi from './../api/modules/group'
import initController from './init'
import ethController from './eth'
import global from './global'
import Dexie from "dexie";
import SHA256  from 'crypto-js/sha256'
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
        const hash = global.web3.eth.accounts.hashMessage(groupId + groupId + 0 + group.createTime)
        const newBlock = {
            groupId: groupId,
            preHash: groupId, 
            time: group.createTime,
            //messageRoot: root,
            number: 0,
            hash: hash,
            //messages: oldMessages
        }
        //更新
        global.db.groupBlockRepository.put(newBlock , 'number')
        lastBlock = newBlock
     }

     if(true){
         var preBlock = lastBlock
         var time = preBlock.time
         const currentTime = Date.now()
         for ( ;time < currentTime - blockTime; time = time + blockTime){
            let newTime = time+ blockTime
            let oldMessages = await global.db.groupMessageRepository.where(['groupId' , 'time']).between( [groupId, time],[groupId, newTime]).toArray() //通过哈希值获取已经在聊天记录数据库的消息
            if (oldMessages.length > 0){
                let leaves = oldMessages.map(m => m.hash)
                let tree = new MerkleTree(leaves, SHA256, {sortLeaves:true})
                let root = tree.getRoot().toString('hex')
                let newNumber = preBlock.number + 1
                const hash = global.web3.eth.accounts.hashMessage(groupId + preBlock.hash + newNumber + newTime + root)
                const newBlock = {
                    groupId: groupId,
                    preHash: preBlock.hash, 
                    time: newTime,
                    messageRoot: root,
                    hash: hash,
                    number: newNumber,
                    messages: oldMessages
                }
                console.log(newBlock)
                //更新
                global.db.groupBlockRepository.put(newBlock , 'number')
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

const fetchRecentBlocks = async(groupId, peerId) => {
    
    global.roomObjects[groupId].syncRequest({
        messageType: 'fetchRecentBlocks',
        content: {
            currentBlock: lastBlock,
            requestSkeletonCount: 7, //一周
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

const sync = async(groupId, peerId) => {
    let currentBlock = await localCurrentBlock(groupId)
    if(currentBlock){
        let recentBlocks = await fetchRecentBlocks(groupId, peerId)
        console.log(recentBlocks)
        let lastTime = recentBlocks.map(async (block) => {
            return global.groupBlockRepository.where()
        })

    }
    else{
        let blocks = await fetchAllBlocks(groupId, peerId)
    }
    
    
}

const processBlock = async(blocks) => {

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
                    request.content.requestSkeletonCount, 
                    request.content.requestSkeletonSkip,
                    ((request.currentBlock.time < currentBlock.time) ? request.currentBlock.time : currentBlock.time))
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
    deliverAllBlocksRequest
}