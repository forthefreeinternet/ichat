import Dexie from "dexie";
import global from './global'
export const db = new Dexie(global.user.userId);

db.version(1).stores({
  groupUserRepository: "++_id, groupId, userId",
  groupMessageRepository: "++_id, userId, groupId, content, messageType, time",
  groupRepository: "groupId, userId, groupName, notice,createTime",
});
