// import {
//     Base64
//   } from 'js-base64';
import global from './global';
import {toByteArray , fromByteArray} from 'base64-js'
var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
            encode: function(e){
                var t="";
                var n,r,i,s,o,u,a;
                var f=0;e=Base64._utf8_encode(e);
                while(f<e.length){
                    n=e.charCodeAt(f++);
                    r=e.charCodeAt(f++);
                    i=e.charCodeAt(f++);
                    s=n>>2;o=(n&3)<<4|r>>4;
                    u=(r&15)<<2|i>>6;
                    a=i&63;
                    if(isNaN(r)){
                        u=a=64
                    }else if(isNaN(i)){
                        a=64
                    }

                    t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)
                }
                    return t
            },
                
            decode:function(e){
                var t="";
                var n,r,i;
                var s,o,u,a;
                var f=0;e=e.replace(/[^A-Za-z0-9\+\/\=]/g,"");
                while(f<e.length){
                    s=this._keyStr.indexOf(e.charAt(f++));
                    o=this._keyStr.indexOf(e.charAt(f++));
                    u=this._keyStr.indexOf(e.charAt(f++));
                    a=this._keyStr.indexOf(e.charAt(f++));
                    n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;
                    t=t+String.fromCharCode(n);
                    if(u!=64){
                        t=t+String.fromCharCode(r)
                    }
                    if(a!=64){
                        t=t+String.fromCharCode(i)
                    }
                }
                
                t=Base64._utf8_decode(t);
                return t
            },
            
            _utf8_encode:function(e){
                e=e.replace(/\r\n/g,"\n");
                var t="";
                for(var n=0;n<e.length;n++){
                    var r=e.charCodeAt(n);
                    if(r<128){
                        t+=String.fromCharCode(r)
                    }else if(r>127&&r<2048){
                        t+=String.fromCharCode(r>>6|192);
                        t+=String.fromCharCode(r&63|128)
                    }else{
                        t+=String.fromCharCode(r>>12|224);
                        t+=String.fromCharCode(r>>6&63|128);
                        t+=String.fromCharCode(r&63|128)
                    }
                }
                return t
            },
            
            _utf8_decode:function(e){
                var t="";
                var n=0;
                var r=0;
                var c3 = 0;
                var c2 = 0;
                while(n<e.length){
                    r=e.charCodeAt(n);
                    if(r<128){
                        t+=String.fromCharCode(r);
                        n++
                    }else if(r>191&&r<224){
                        c2=e.charCodeAt(n+1);
                        t+=String.fromCharCode((r&31)<<6|c2&63);n+=2
                    }else{
                        c2=e.charCodeAt(n+1);
                        c3=e.charCodeAt(n+2);
                        t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);
                        n+=3
                    }
                }
                return t
            }
        }

const ByteArrayToString = (ByteArray) => {
    let string = ''
    for (const byte of ByteArray){
        string += String.fromCharCode(byte)
    }
    return string
    
}

const stringToByteArray = (string) => {
    let byteArray = []
    for (let i = 0; i<string.length ; i ++){
        byteArray.push(string.charCodeAt(i))
    }
    return byteArray
}


/**
 * @description 把带'0x'前缀的16进制字符串转换成Unicode字符串
 * @param {String} hex
 * @returns Unicode字符串
 */
const hexToUnicode = (hex) => {
    let unicodeString = ''
    for(let i = 2; i < hex.length - 3; i += 4){
        let stringHex = '0x' + hex[i] + hex[i+1] + hex[i+2] + hex[i+3]
        unicodeString += String.fromCharCode(parseInt(stringHex, 16))
    }
    return unicodeString
}

const unicodeHash = (entropy) => {
    return hexToUnicode(global.web3.eth.accounts.hashMessage(entropy))
}





  /**
   * @description 字符串异或加密，并做base64转码
   * 异或加密即对当前字符串每位与当前约定的key的每位进行异或操作，求出结果
   * charCodeAt: 返回当前字符的Unicode 编码
   * 异或：两个值相同返回1，两个值不同，返回0
   * @param {String} val 需要加密的文字
   * @param {String} key 密钥
   * @param { Boolean } isBase64 是否经过base64处理，默认true
   * @param {function} hash 对较短的key进行加长时所需要用到的哈希函数
   */
  const XORencryption = (val, key, isBase64 = true, hash = unicodeHash) => {
    if (typeof val !== 'string') return val;
    console.log('原文', val)
    //let key = 'k1k2frCETI8bkyLzW25KVZ5ZAjaKrtzbnBlpYCob+IsHBPe/N6g7Vw==';
    let XORkey = hash(key)
    console.log('哈希值样本', XORkey)
    let message = '';
    for( let j = 0; j < parseInt(val.length / XORkey.length) + 1; j ++){
        XORkey = hash(key + j)
        console.log('第', j ,'个哈希值', XORkey)
        for (var i = 0; i < XORkey.length; i++) {
            if (j*XORkey.length + i >= val.length){
                break
            }
            //console.log(val.charCodeAt(j*XORkey.length + i) ^ XORkey.charCodeAt(i))
            message += String.fromCharCode(val.charCodeAt(j*XORkey.length + i) ^ XORkey.charCodeAt(i));
        }
    }
    console.log('密文', message)
    //console.log('ceshi', Base64.decode(Base64.encode(String.fromCharCode(56056))).charCodeAt(0),  Base64.decode(Base64.encode(String.fromCharCode(55962))).charCodeAt(0))
    if (isBase64) return Base64.encode(message)//fromByteArray(stringToByteArray(message));
    return message;
  };
  
  /**
   * @description 解密异或加密的密文
   * @param { String } val  密文
   * @param {String} key 密钥
   * @param { Boolean } isBase64 是否经过了base64处理，默认true
   * @param {function} hash 对较短的key进行加长时所需要用到的哈希函数
   */
  const decodeXOR = (val, key, isBase64 = true, hash = unicodeHash) => {
    if (typeof val !== 'string') return val;
    console.log('base64密文', val)
    let XORmsg = isBase64 ? Base64.decode(val) : val //ByteArrayToString(toByteArray(val)) : val;
    console.log('密文', XORmsg)
    //let key = 'k1k2frCETI8bkyLzW25KVZ5ZAjaKrtzbnBlpYCob+IsHBPe/N6g7Vw==';
    let XORkey = hash(key)
    console.log('哈希值样本', XORkey)
    let message = '';
    for( let j = 0; j < parseInt(XORmsg.length / XORkey.length) + 1; j ++){
        XORkey = hash(key + j)
        console.log('第', j ,'个哈希值', XORkey)
        for (var i = 0; i < XORkey.length; i++) {
            if (j*XORkey.length + i >= XORmsg.length){
                break
            }
            //console.log(XORmsg.charCodeAt(j*XORkey.length + i))
            message += String.fromCharCode(XORmsg.charCodeAt(j*XORkey.length + i) ^ XORkey.charCodeAt(i));
        }
    }
    console.log('原文', message)
    return message;
  };
  


//输入两个16进制表示的字符串，输出二进制的异或距离（以字符串表示）
const XOR = (a, b) => {
    console.log(parseInt(a) ^ parseInt(b))
    a = parseInt(a).toString(2).toString()
    b = parseInt(b).toString(2).toString()
    
    let result = ''
    if(a.length < b.length){
        for( let i = 0; i < b.length - a.length; i ++){
            a = '0' + b
        }
    }
    if(b.length < a.length){
        for( let i = 0; i < a.length - b.length; i ++){
            b = '0' + a
        }
    }
    for(let i = 0; i < a.length; i ++ ){
        if (a[i] === b[i]){
            result += '0'
        }
        else{
            result += '1'
        }
    }
    console.log(result)
    return result
}

const leq = (a, b) => {
    if(a.length < b.length){
        for( let i = 0; i < b.length - a.length; i ++){
            a = '0' + b
        }
    }
    if(b.length < a.length){
        for( let i = 0; i < a.length - b.length; i ++){
            b = '0' + a
        }
    }
    let result = true
    for(let i = 0; i < a.length; i ++ ){
        if (a[i] != b[i]){
            if(a[i] === '1' & b[i] === '0'){
                result = false
            }
            break
        }
        
    }
    return result
}

export default{
    leq,
    XOR,
    XORencryption,
    decodeXOR
}