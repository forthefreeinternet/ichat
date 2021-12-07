import { SET_USER, SET_TOKEN } from './mutation-types';
import { ActionTree } from 'vuex';
import { AppState } from './state';
import { RootState } from '../../index';
import fetch from '@/api/fetch';
import { processReturn } from '@/utils/common.ts';
const userController = require('./../../../controller/user').default
const groupController = require('./../../../controller/group').default
import { serviceGroup } from './../../../common/constant/service';

const actions: ActionTree<AppState, RootState> = {
  async register({ commit }, payload) {
    console.log(payload)
    let res = await userController.register(payload)
    // let res = await fetch.post('/auth/register', {
    //   ...payload,
    // });
    let data = processReturn(res);
    if (data) {
      commit(SET_USER, data.user);
      commit(SET_TOKEN, data.token);
      return data;
    }
  },
  async login({ commit }, payload) {
    let res = await userController.login(payload)
    // let res = await fetch.post('/auth/login', {
    //   ...payload,
    // });
    
    console.log(res)
    let data = processReturn(res);   
    if (data) {
      commit(SET_USER, data.user);
      commit(SET_TOKEN, data.token);
      return data;
    }
  },
};

export default actions;
