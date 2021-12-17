
import group from './../../controller/group'
import initController from './../../controller/init'
import store from './../../store/index'
import { RCode } from './../../common/constant/rcode';

export default{
    refreshChatData(payload){
        store.dispatch('chat/chatData', payload)
    },

    getChatData( user ){
        initController.getAllData(user)
    }
}