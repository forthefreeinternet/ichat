import Dexie from "dexie";
export default {
    roomObjects: {},
    user:{username: '',
          userId:''  },
    groupMessageRepository: {},
    db: {},
    hasInit : false,
    web3 : {}, //new Web3(new Web3.providers.WebsocketProvider("wss://rinkeby.infura.io/ws/v3/a898a2d231e647c7928dc457c6d441c8"))
    
}

//export const db = new Dexie(global.user.userId);

