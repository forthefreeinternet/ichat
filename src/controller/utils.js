

const XOR = (a, b) => {
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
    XOR
}