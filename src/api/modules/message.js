import messageController from '../../controller/message'
export default {
    getRecentNews(data) {
      const { roomid, page, pageSize } = data
      return request.get(`${API}/news/recent?roomid=${roomid}&page=${page}&pageSize=${pageSize}`)
    },
    getLastNews(data) {
      return request.post(`${API}/news/last`, data)
    },
    userIsReadMsg(data) { // 当用户在切换会话阅读消息后
      return request.post(`${API}/news/isread`, data)
    },
    getHistoryMsg(data) {
      return request.post(`${API}/news/historymsg`, data)
    },

    async fetchFile(data){
      return await messageController.fetchFile(data)
    },

    fetchProgress(data){
      return messageController.fetchProgress(data)
    }
  }