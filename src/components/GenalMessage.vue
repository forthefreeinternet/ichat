<template>
  <div class="message">
    <div class="message-header">
      <div class="message-header-box">
        <span class="message-header-text">{{ chatName }}</span>
        <a-icon type="sync" spin class="message-header-icon" v-if="dropped" />
        <genal-active v-if="groupGather[activeRoom.groupId]" type="group"></genal-active>
        <genal-active v-else type="friend"></genal-active>
      </div>
    </div>
    <transition name="loading">
      <div class="message-loading" v-if="spinning && !isNoData">
        <a-icon type="sync" spin class="message-loading-icon" />
      </div>
    </transition>
    <!-- <a-modal title="用户信息" :visible="showUserModal" footer="" @cancel="showUserModal = false">
      
    </a-modal> -->
    <div :class="'weui_dialog_' + 'confirm'" v-show="isPreviewed">
        <div class="weui_mask"></div>
        <div class="weui_dialog">
            <div class="weui_dialog_hd">
                <strong class="weui_dialog_title">预览</strong>
            </div>
            <div v-for="hash in messageHash" :key='hash' class="wrapper">  
              <div id= "hero"> 
                <div id="output">
                  <div id="progressBar"></div>
                  <div v-if="true" class="weui_progress">
                    <div class="weui_progress_bar">
                        <div class="weui_progress_inner_bar" :style="{ width: torrentProgress + '%' }"></div>
                    </div>
                    <!-- <a v-if="showCloseBtn" href="javascript:;" class="weui_progress_opr" @click="dispatch('on-progress-cancel')">
                        <i class="weui_icon_cancel"></i>
                    </a> -->
                  </div>
                  
                  <!-- The video player will be added here -->
                </div>

                <div class="message-content-image" v-if="isImagePreviewed" :style="getImageStyle('$'+'$'+ imagePreviewed.width+'$' + imagePreviewed.height)">
                   <viewer style="display:flex;align-items:center;">
                   <!-- <img :src="'api/static/' + item.content" alt="" /> -->
                    <img :src="imagePreviewed.blobURL" alt="" />
                   </viewer>
                </div>
                
                <!-- Statistics -->
                <div id="status">
                  <div>
                    <span class="show-leech" v-if="downloaded == false">Downloading </span>
                    <span class="show-seed" v-if="downloaded == true">Seeding </span>
                    <code id="streamedFileName">{{streamedFileName}}</code>
                    <span class="show-leech" v-if="downloaded == false"> from </span>
                    <span class="show-seed" v-if="downloaded == true"> to </span>
                    <code id="numPeers">{{numPeers}}</code>
                  </div>

                  <div>
                    <code id="downloaded">{{downloadedBytes}}</code> of <code id="total">{{totalBytes}}</code> - <span id="remaining">{{remaining}}</span>
                  </div>

                  <div>
                    &#x2193; <code id="downloadSpeed">{{downloadSpeed}}</code> / <code id="uploadSpeed">{{uploadSpeed}}</code> &#x2191;
                  </div>

                </div>
              </div>
            </div>
            <!-- <div class="weui_dialog_bd">
                <slot>请注意，这里可以自定义(支持html)</slot>
            </div> -->
            <div class="weui_dialog_ft">
                <a href="javascript:;" class="weui_btn_dialog default" v-if="isPreviewed" @click="closeView()">关闭</a>
                <a href="javascript:;" class="weui_btn_dialog primary" @click="downloadFile(fileMessage)">另存为</a>
            </div>
        </div>
    </div>
    <div class="message-main" :style="{ opacity: messageOpacity }">
      <div class="message-content">
        <transition name="noData">
          <div class="message-content-noData" v-if="isNoData">没有更多消息了~</div>
        </transition>
        <template v-for="item in activeRoom.messages">
          <div class="message-content-message" :key="item.userId + item.time" :class="{ 'text-right': item.userId === user.userId }">
            <genal-avatar :data="item"></genal-avatar>
            <div>
              <a class="message-content-text" v-if="_isUrl(item.content)" :href="item.content" target="_blank">{{ item.content }}</a>
              <div class="message-content-text" v-text="_parseText(item.content)" v-else-if="item.messageType === 'text'"></div>
              <a class="message-content-text" v-if="item.messageType === 'file'" :href="void(0)" :download="item.content.name" @click="fetchFile(item)">{{ item.content.name }}</a>
              <div :id ="'hero' + item.hash" v-if="false">
                <div :id="'output' + item.hash">
                  <div id="progressBar"></div>
                  <!-- The video player will be added here -->
                </div>

                <!-- Statistics -->
                <div id="status" >
                  <div>
                    <a class="message-content-text" :href="void(0)" :download="item.content.name" @click="fetchFile(item)">预览</a>
                    <a class="message-content-text" :href="void(0)" :download="item.content.name" @click="downloadFile(item)">保存到本地</a>
                    <span class="show-leech">Downloading </span>
                    <span class="show-seed">Seeding </span>
                    <code :id="'streamedFileName'+ item.hash" v-if="isViewed[item.hash]">{{item.content.name}}</code>
                    <span class="show-leech"> from </span>
                    <span class="show-seed"> to </span>
                    <code :id="'numPeers'+ item.hash">0 peers</code>
                  </div>

                  <div>
                    <code :id="'downloaded'+ item.hash"></code> of <code :id="'total'+ item.hash"></code> - <span id="remaining"></span>
                  </div>

                  <div>
                    &#x2193; <code :id="'downloadSpeed'+ item.hash">0 b/s</code> / <code :id="'uploadSpeed'+ item.hash">0 b/s</code> &#x2191;
                  </div>
                </div>
              </div>
              
              <div class="message-content-image" v-if="item.messageType === 'image'" :style="getImageStyle('$'+item.content+'$'+ item.width+'$' + item.height)">
                <viewer style="display:flex;align-items:center;">
                  <!-- <img :src="'api/static/' + item.content" alt="" /> -->
                  <img :src="item.dataURL" alt="" />
                </viewer>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
    <genal-input></genal-input>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import GenalAvatar from './GenalAvatar.vue';
import GenalActive from './GenalActive.vue';
import GenalInput from './GenalInput.vue';
import * as api from '@/api/apis';
import { namespace } from 'vuex-class';
const chatModule = namespace('chat');
const appModule = namespace('app');
import { isUrl, parseText, processReturn } from '@/utils/common';
// @ts-ignore
import groupApi from './../api/modules/group'
// @ts-ignore
import messageApi from './../api/modules/message'
import prettyBytes from 'pretty-bytes'
import moment from 'moment'

@Component({
  components: {
    GenalActive,
    GenalAvatar,
    GenalInput,
  },
})
export default class GenalMessage extends Vue {
  @appModule.Getter('user') user: User;
  @appModule.Getter('mobile') mobile: boolean;

  @chatModule.State('activeRoom') activeRoom: Group & Friend;
  @chatModule.Getter('socket') socket: SocketIOClient.Socket;
  @chatModule.Getter('dropped') dropped: boolean;
  @chatModule.Getter('groupGather') groupGather: GroupGather;
  @chatModule.Getter('userGather') userGather: FriendGather;
  @chatModule.Mutation('set_dropped') set_dropped: Function;
  @chatModule.Mutation('set_group_messages') set_group_messages: Function;
  @chatModule.Mutation('set_friend_messages') set_friend_messages: Function;
  @chatModule.Mutation('set_user_gather') set_user_gather: Function;

  text: string = '';
  needScrollToBottom: boolean = true;
  messageDom: HTMLElement;
  messageContentDom: HTMLElement;
  headerDom: HTMLElement;
  messageOpacity: number = 1;
  lastMessagePosition: number = 0;
  spinning: boolean = false;
  pageSize: number = 30;
  isNoData: boolean = false;
  lastTime: number = 0;
  isPreviewed: boolean = false //预览窗口是否打开
  fileMessage: any; //包含当前预览的文件的消息
  files: {[key: string]: any;}={}; //已经本地缓存的文件列表，键值为包含该文件的消息哈希 TO-DO: 为节省内存，键值应该为该文件的种子哈希
  messageHash: {[key: string]: string;}={}; //打开的文件的消息哈希
  hasPreviewed:{[key: string]: boolean;}={}; //某文件是否已经被尝试预览过
  torrentProgress: number = 0;
  streamedFileName: string = '';
  downloaded: boolean = false;
  numPeers: string = '0 peers';
  downloadedBytes: string = '';
  totalBytes: string = '';
  downloadSpeed: string = '0 b/s';
  uploadSpeed:  string = '0 b/s';
  downloadStatistic: any;
  remaining: string = '';
  isImagePreviewed: boolean = false;
  imagePreviewed: {[key: string]: any;};


  mounted() {
    this.messageDom = document.getElementsByClassName('message-main')[0] as HTMLElement;
    this.messageContentDom = document.getElementsByClassName('message-content')[0] as HTMLElement;
    this.headerDom = document.getElementsByClassName('message-header-text')[0] as HTMLElement;
    this.messageDom.addEventListener('scroll', this.handleScroll);
    this.scrollToBottom();
  }

  get chatName() {
    if (this.groupGather[this.activeRoom.groupId]) {
      return this.groupGather[this.activeRoom.groupId].groupName;
    } else {
      return this.userGather[this.activeRoom.userId].username;
    }
  }

  /**
   * 点击切换房间进入此方法
   */
  @Watch('activeRoom')
  changeActiveRoom() {
    this.messageOpacity = 0;
    this.isNoData = false;
    // 聊天名过渡动画
    if (this.headerDom) {
      this.headerDom.classList.add('transition');
      setTimeout(() => {
        this.headerDom.classList.remove('transition');
      }, 400);
    }
    // 大数据渲染优化
    if (this.activeRoom.messages && this.activeRoom.messages.length > 30) {
      this.activeRoom.messages = this.activeRoom.messages.splice(this.activeRoom.messages.length - 30, 30) as GroupMessage[] &
        FriendMessage[];
    }
    // //这里初始化文件消息的相关变量
    // this.isViewed = {}
    // for( const message of this.activeRoom.messages){
    //   if(message.messageType == 'file'){
    //     this.isViewed[message.hash] = false
    //   }
    // }
    // console.log(this.isViewed)
    this.scrollToBottom();
  }

  /**
   * 新消息会进入此方法
   */
  @Watch('activeRoom.messages', { deep: true })
  changeMessages() {
    console.log(this.activeRoom.messages)
    // //这里初始化文件消息的相关变量
    // this.isViewed = {}
    // for( const message of this.activeRoom.messages){
    //   if(message.messageType == 'file'){
    //     this.isViewed[message.hash] = false
    //   }
    // }
    // console.log(this.isViewed)
    if (this.needScrollToBottom) {
      this.addMessage();
    }
    this.needScrollToBottom = true;
  }

  // 监听socket断连给出重连状态提醒
  @Watch('socket.disconnected') connectingSocket() {
    if (this.socket.disconnected) {
      this.set_dropped(true);
    }
  }

  /**
   * 在分页信息的基础上来了新消息
   */
  addMessage() {
    if (this.activeRoom.messages) {
      // 新消息来了只有是自己发的消息和消息框本身在底部才会滚动到底部
      let messages = this.activeRoom.messages;
      if (
        messages[messages.length - 1].userId === this.user.userId ||
        (this.messageDom && this.messageDom.scrollTop + this.messageDom.offsetHeight + 100 > this.messageContentDom.scrollHeight)
      ) {
        this.scrollToBottom();
      }
    }
  }

  /**
   * 监听滚动事件
   */
  handleScroll(event: Event) {
    if (event.currentTarget) {
      // 只有有消息且滚动到顶部时才进入
      if (this.messageDom.scrollTop === 0) {
        this.lastMessagePosition = this.messageContentDom.offsetHeight;
        let messages = this.activeRoom.messages;
        if (messages && messages.length >= this.pageSize && !this.spinning) {
          this.getMoreMessage();
        }
      }
    }
  }

  /**
   * 消息获取节流
   */
  throttle(fn: Function, file?: File) {
    let nowTime = +new Date();
    if (nowTime - this.lastTime < 1000) {
      return this.$message.error('消息获取太频繁！');
    }
    fn(file);
    this.lastTime = nowTime;
  }

  /**
   * 获取更多消息
   * @params text
   */
  async getMoreMessage() {
    if (this.isNoData) {
      return false;
    }
    this.spinning = true;
    if (this.activeRoom.groupId) {
      await this.getGroupMessages();
    } else {
      await this.getFriendMessages();
    }
    this.$nextTick(() => {
      this.messageDom.scrollTop = this.messageContentDom.offsetHeight - this.lastMessagePosition;
      this.spinning = false;
      this.messageOpacity = 1;
    });
  }

  /**
   * 获取群聊消息
   */
  async getGroupMessages() {
    let groupId = this.activeRoom.groupId;
    let current = this.activeRoom.messages!.length;
    let currentMessage = this.activeRoom.messages ? this.activeRoom.messages : [];
    // let data: PagingResponse = processReturn(
    //   await api.getGroupMessages({
    //     groupId,
    //     current,
    //     pageSize: this.pageSize,
    //   })
    // );
    let data = processReturn(
      await groupApi.getGroupMessages({
        groupId,
        current,
        pageSize: this.pageSize,
      })
    )  
    if (data) {
      if (!data.messageArr.length || data.messageArr.length < this.pageSize) {
        this.isNoData = true;
      }
      this.needScrollToBottom = false;
      this.set_group_messages([...data.messageArr, ...currentMessage]);
      for (let user of data.userArr) {
        if (!this.userGather[user.userId]) {
          this.set_user_gather(user);
        }
      }
    }
  }

  /**
   * 获取私聊消息
   */
  async getFriendMessages() {
    let userId = this.user.userId;
    let friendId = this.activeRoom.userId;
    let current = this.activeRoom.messages!.length;
    let currentMessage = this.activeRoom.messages ? this.activeRoom.messages : [];
    let data: PagingResponse = processReturn(
      await api.getFriendMessage({
        userId,
        friendId,
        current,
        pageSize: this.pageSize,
      })
    );
    if (data) {
      if (!data.messageArr.length || data.messageArr.length < this.pageSize) {
        this.isNoData = true;
      }
      this.needScrollToBottom = false;
      this.set_friend_messages([...data.messageArr, ...currentMessage]);
    }
  }

  /**
   * 滚动到底部
   */
  scrollToBottom() {
    this.$nextTick(() => {
      this.messageDom.scrollTop = this.messageDom.scrollHeight;
      this.messageOpacity = 1;
    });
  }


  async getImageURL(message: any){
    //const blob = await messageApi.fetchFile(message)  
    console.log(message)
    let res 
    var reader = new FileReader();

      try {
        //var reader = new FileReader()
        if (message.content.blob) {
          reader.readAsDataURL(message.content.blob)
          reader.onload = function(){
            console.log(this.result)
            res = this.result
          }
          reader.onerror = function() {
            console.log("load file error")
          }
          
        } else {
          console.log("file not found")
        }
      } catch (e) {
        console.log("file not found")
      }
    //let res = URL.createObjectURL(message.content.blob)
    return res
  }


  /**
   * 根据图片url设置图片框宽高, 注意是图片框
   */
  getImageStyle(src: string) {
    let arr = src.split('$');
    let width = Number(arr[2]);
    let height = Number(arr[3]);
    if (this.mobile) {
      // 如果是移动端,图片最大宽度138, 返回值加12是因为设置的是图片框的宽高要加入padding值
      if (width > 138) {
        height = (height * 138) / width;
        width = 138;
        return {
          width: `${width + 12}px`,
          height: `${height + 12}px`,
        };
      }
    }
    return {
      width: `${width + 12}px`,
      height: `${height + 12}px`,
    };
  }

  /**
   * 文本转译/校验
   * @params text
   */
  _parseText(text: string) {
    return parseText(text);
  }

  /**
   * 是否URL
   * @params text
   */
  _isUrl(text: string) {
    return isUrl(text);
  }


  // @ts-ignore
  async fetchFile(message: any){
    // const blob = await messageApi.fetchFile(message)
    // const link = document.createElement('a')
    // let url = URL.createObjectURL(blob)
    // link.href = url
    // link.download = message.content.name
    // link.click()
    // URL.revokeObjectURL(url)
    console.log('813',String(this.messageHash))
    this.messageHash[message.hash] = message.hash
    
    
    this.streamedFileName = message.content.name
    //console.log(this.isViewed[message.hash])
    //this.isViewed[message.hash] = true
    this.isPreviewed = true
    //this.isViewed['o'] = true
    this.fileMessage = message
    const file = await messageApi.fetchFile(message)
    this.streamedFileName = file.name
    console.log('ceshi', message.hash)
    //console.log(this.isViewed[message.hash])
    console.log('813',this.files)
    this.files[message.hash] = file
    
    
    
    if(this.hasPreviewed[message.hash]){
      //此时预览窗口已经有所需要的内容，而this.messageHash[message.hash] = message.hash已经显示了该预览窗口
      //return
    }
    this.hasPreviewed[message.hash] = true
    const suffix = message.content.name.split('.')[message.content.name.split('.').length - 1]
    if(false){//suffix == 'jpg' || suffix == 'jpeg' || suffix == 'png' || suffix == 'gif'){
      console.log(message)
      this.isImagePreviewed = true
      file.getBlobURL((err: string, url: string)=>{
        
        this.imagePreviewed = {
          blobURL: url,
          width: message.width,
          height: message.height
        }
        console.log(this.imagePreviewed)
        //URL.revokeObjectURL(url)
      })
    }
    else{
      console.log(message)
      this.isImagePreviewed = false
      file.appendTo('#output')
    }
    
    const updateStat = this.updateStat
    this.downloadStatistic = setInterval(onProgress, 1000)
	  onProgress()

    function onProgress() {
      const torrent = messageApi.fetchProgress(message)
      console.log(torrent)
      updateStat(torrent)
      
    }
  }

  updateStat(torrent: any){
    // Peers
      this.numPeers = (torrent.numPeers + (torrent.numPeers === 1 ? ' peer' : ' peers'))

      // Progress
      this.torrentProgress = Math.round(torrent.progress * 100 * 100) / 100
      
      this.downloadedBytes = (prettyBytes(torrent.downloaded))
      this.totalBytes = (prettyBytes(torrent.length))

      // Remaining time
      if (torrent.done || torrent.downloaded == torrent.length) {
        this.remaining = 'Done'
        this.downloaded = true
      } else {
        this.remaining = moment.duration(torrent.timeRemaining / 1000, 'seconds').humanize()
        this.remaining = this.remaining[0].toUpperCase() + this.remaining.substring(1) + ' remaining'
      }
      

      // Speed rates
      this.downloadSpeed = (prettyBytes(torrent.downloadSpeed) + '/s')
      this.uploadSpeed = (prettyBytes(torrent.uploadSpeed) + '/s')
  }

  // _isViewed(hash: string){
  //   console.log(hash)
  //   if(this.files[hash]){
  //     return true
  //   }
  // }

  async downloadFile(message: any){
    if (this.files[message.hash]){
      this.files[message.hash].getBlobURL((err: string, url: string)=>{
        const link = document.createElement('a')
        link.href = url
        link.download = this.files[message.hash].name
        link.click()
        URL.revokeObjectURL(url)
      })
    }
    else{
      await this.fetchFile(message)
      this.downloadFile(message)
    }
    
  }

  closeView(){
    this.isPreviewed = false;
    this.messageHash = {}
    console.log(this.downloadStatistic)
    clearInterval(this.downloadStatistic)
    this.torrentProgress = 0;
    this.streamedFileName = '';
    this.downloaded = false;
    this.numPeers = '0 peers';
    this.downloadedBytes = '';
    this.totalBytes= '';
    this.downloadSpeed = '0 b/s';
    this.uploadSpeed = '0 b/s';
    this.remaining = '';
  }
}
</script>
<style lang="scss" scoped>
#hero {
	background-color: #FAFAFC;
	display: block;
	text-align: center;
   height: 400px;
  width: 500px;
  //overflow: auto;
  object-fit: contain;
  overflow: auto;
}
#output video {
  width: 100%; height:100%; 
  object-fit: contain;
  // overflow: auto;
  // height: 400px;
  // width: 640px;

height: 400px;
  width: 640px;
  object-fit: fill;
  border-radius: 40px;
  //object-fit: contain;
  // border-radius: 40px;
  //-webkit-text-size-adjust: 100%;
}

#status {
	color: #888;
	padding: 15px;

	> div {
		margin-bottom: 15px;
	}

	> div:first-child {
		overflow-x: auto;
	}

	.tooltip {
		margin: initial;
	}
}

#status code {
	color: #888;
}

#progressBar {
    height: 5px;
    width: 0%;
    background-color: #35b44f;
    transition: width .4s ease-in-out;
}
.wrapper {
    max-width: calc(800px - (30px * 2));
    margin-right: auto;
    margin-left: auto;
    padding-right: 30px;
    padding-left: 30px;
}
body
.message {
  overflow: hidden;
  height: 100%;
  position: relative;
  .message-header {
    height: 60px;
    line-height: 60px;
    z-index: 100;
    background-color: rgb(0, 0, 0, 0.6);
    .message-header-text {
      color: #fff;
    }
    .message-header-icon {
      margin-left: 5px;
    }
  }
  .message-loading {
    position: absolute;
    left: calc(50% - 18px);
    top: 60px;
    z-index: 99;
    .message-loading-icon {
      margin: 10px auto;
      font-size: 20px;
      padding: 8px;
      border-radius: 50%;
      background-color: rgb(0, 0, 0, 0.8);
    }
  }
  .message-main {
    height: calc(100% - 100px);
    overflow: auto;
    position: relative;
    .message-content {
      .message-content-noData {
        line-height: 50px;
      }
      .message-content-message {
        text-align: left;
        margin: 10px 20px;
        .message-content-text,
        .message-content-image {
          max-width: 600px;
          display: inline-block;
          overflow: hidden;
          margin-top: 4px;
          padding: 6px;
          background-color: rgba(0, 0, 0, 0.4);
          font-size: 16px;
          border-radius: 5px;
          text-align: left;
          word-break: break-word;
        }
        .message-content-image {
          max-height: 350px;
          max-width: 350px;
          img {
            cursor: pointer;
            max-width: 335px;
            max-height: 335px;
          }
        }
      }
      .text-right {
        text-align: right !important;
        .avatar {
          justify-content: flex-end;
        }
      }
    }
  }
  .message-input {
    display: flex;
    flex-wrap: nowrap;
    position: absolute;
    width: 100%;
    bottom: 0px;
    input {
      height: 40px;
    }
    .message-input-button {
      width: 30px;
      cursor: pointer;
      position: absolute;
      right: 10px;
      top: 4px;
    }
  }
}

//输入框样式
.ant-input {
  padding: 0 50px 0 50px;
}
// 消息工具样式
.messagte-tool-icon {
  position: absolute;
  left: 0;
  top: 0;
  width: 50px;
  height: 40px;
  text-align: center;
  line-height: 42px;
  font-size: 16px;
  cursor: pointer;
  z-index: 99;
}
.message-tool-item {
  width: 0px;
  height: 240px;
  cursor: pointer;
  .message-tool-contant {
    width: 50px;
    padding: 5px;
    border-radius: 5px;
    transition: all linear 0.2s;
    .message-tool-item-img {
      width: 40px;
    }
    .message-tool-item-text {
      text-align: center;
      font-size: 10px;
    }
    &:hover {
      background: rgba(135, 206, 235, 0.6);
    }
  }
}

// 移动端样式
@media screen and (max-width: 768px) {
  .message-main {
    .message-content-image {
      img {
        cursor: pointer;
        max-width: 138px !important;
        height: inherit !important;
      }
    }
  }
}
@media screen and (max-width: 500px) {
  .message-header-box {
    .message-header-text {
      display: block;
      width: 36%;
      margin: 0 auto;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .message-header-icon {
      position: absolute;
      top: 17px;
      right: 60px;
      font-size: 25px;
    }
  }
}
.loading-enter-active {
  transition: all 0.3s ease;
}
.loading-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}
.loading-enter,
.loading-leave-to {
  transform: translateY(-30px);
  opacity: 0;
}

.noData-enter-active,
.noData-leave-active {
  transition: opacity 1s;
}
.noData-enter,
.noData-leave-to {
  opacity: 0;
}

.transition {
  display: inline-block;
  animation: transition 0.4s ease;
}
@keyframes transition {
  0% {
    transform: translateY(-40px);
    opacity: 0;
  }
  60% {
    transform: translateY(10px);
    opacity: 0.6;
  }
  100% {
    transform: translateY(0px);
    opacity: 1;
  }
}
</style>
<style lang="less">
@import "./../style/widget/weui_tips/weui_dialog";
@import "./../style/widget/weui_progress/weui_progress";
</style>
