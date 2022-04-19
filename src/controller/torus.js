/**
 * webRTC连接最多500个，因此需要部署环形网络
 * 环形网络适合对称的情况，树形网络适合非对称（发言人为树根）情况
 * 环形网路中任一节点掌握所有节点信息，连通性更好；同时可利用自己确认安全的环形网络做连通和，安全性更强
 */

import groupApi from '../api/modules/group'
import initController from './init'
import ethController from './eth'
import utilsController from './utils'
import blockController from './block'
import messageController from './message'
import global from './global'
import Dexie from "dexie";

/**
 * @description Find the nodes which the new node wants to contact in an existed torus.
 * @param {string} torusId 
 * @param {Array<string>} torus Array<string> records the existed torus, consists of nodeIds
 * @param {string} nodeId the new nodeId
 * @returns {Array<string>} nodeIds of contacts
 */
const findPosition = (torusId, torus, nodeId) => {
    let distance = utilsController.XOR(global.web3.eth.accounts.hashMessage() , global.web3.eth.accounts.hashMessage(data.content.hash))
    
}

export default{
    findPosition
}