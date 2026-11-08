import {API_ORIGIN} from './config.js';
const endpoint=API_ORIGIN+'/functions/v1/pool';
async function request(body){const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});let data;try{data=await res.json()}catch{throw Error('Room server returned HTTP '+res.status)}if(!res.ok)throw Error(data.error||'Room request failed');return data}
export const enter=(name,code)=>request(code?{op:'join',name,code:code.toUpperCase()}:{op:'create',name});
export const act=(auth,body)=>request({op:'act',code:auth.code,key:auth.key,body});
export async function watch(auth,signal,event,disconnected){
 let last='';
 while(!signal.aborted){try{
 const value=await request({op:'state',code:auth.code,key:auth.key});
 const signature=JSON.stringify(value);
 if(signature!==last){last=signature;event({kind:'state',value})}
 }catch(e){if(signal.aborted)return;disconnected(e.message||'Connection interrupted',/expired|unknown|credential/i.test(e.message));}
 await new Promise(resolve=>setTimeout(resolve,700));
 }
}
