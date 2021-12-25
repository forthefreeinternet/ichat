import Web3 from 'web3'
import groupApi from './../api/modules/group'
import initController from './init'
import global from './global'
import Dexie from "dexie";
// const GROUP_USER = require('./../models/group').groupUser
// const GROUP = require('./../models/group').group
// const ACCOUNTBASE = require('./../models/accountpool')
// const { insertNewGroupNews } = require('./groupNews')
import store from './../store/index'
import { RCode } from './../common/constant/rcode';
import { service } from './../common/constant/service';

import {joinRoom, selfId} from 'trystero'

import localforage from 'localforage'

const web3 = new Web3(new Web3.providers.WebsocketProvider("wss://rinkeby.infura.io/ws/v3/a898a2d231e647c7928dc457c6d441c8"));
const abi = [{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"from","type":"address"},{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Give","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"address","name":"receiver","type":"address"},{"indexed":false,"internalType":"uint256","name":"time","type":"uint256"}],"name":"Read","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Require","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"from","type":"address"},{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"string","name":"message","type":"string"}],"name":"Send","type":"event"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"accounts","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"}],"name":"giveETH","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"lenghth","outputs":[{"internalType":"uint32","name":"","type":"uint32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"messages","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"sender","type":"address"}],"name":"readMessage","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"requireETH","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"},{"internalType":"string","name":"message","type":"string"}],"name":"sendMessage","outputs":[],"stateMutability":"nonpayable","type":"function"}];
const add = '0xDbC0671B828485EB1d9b18bC17dE1ecCb528686A';
var netContract = new web3.eth.Contract(abi);
netContract.options.address = add;
var account = {}
var gasEstimate = 0
const sendMessage= async(sender, privateKey, receiver, message) => {
    console.log("ethSendMessage");
    //let mess = getTime() +  $('#searchInput').val();
    //console.log(mess);
    //pushMessage(receiver , mess , 2);
    
    if(sender != ""){
        account.privateKey = privateKey
        gasEstimate = await netContract.methods.sendMessage(sender , message ).estimateGas({from:sender});
        netContract.methods.sendMessage(receiver,message).send({from:sender}).on('sending', signTx);
    }
    else{
      let receipt = await netContract.methods.sendMessage(receiver,message).send({from:sender});
      console.log(receipt);
    }
}

const sendFund= async(privateKey, receiver, value) => {
    console.log("ethSendFund");
    web3.eth.accounts.signTransaction({
        to: receiver,
        value: value,
        gas: 21000
    }, privateKey)
    .then(sendTx)
}
    
    

  

  function signTx(payload){
    let tx = payload.params[0];
    tx.gas = gasEstimate;
    tx['chain'] = 'rinkeby';
    tx['hardfork'] = 'constantinople';
    web3.eth.accounts.signTransaction(tx, account.privateKey).then(sendTx);

  }

  function sendTx(signedTx){
    let signedTransactionData = signedTx.rawTransaction;
    console.log('已签名的交易信息：', signedTransactionData)
    web3.eth.sendSignedTransaction(signedTransactionData ).then(res => console.log(res));
  }


export default{
    sendMessage,
    sendFund
}