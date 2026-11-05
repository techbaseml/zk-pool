import {API_ORIGIN} from './config.js';
const base=API_ORIGIN+'/api/rooms';
export async function request(url,body,auth){const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth.key}:{})},body:JSON.stringify(body)});let data;try{data=await res.json()}catch{throw Error('The room server is unavailable. Check the connection and server address.')}if(!res.ok)throw Error(data.error||'Room request failed');return data}
export const enter=(name,code)=>request(base+(code?'/'+encodeURIComponent(code.toUpperCase())+'/join':''),{name});
export const act=(auth,body)=>request(base+'/'+auth.code+'/act',body,auth);
export async function watch(auth,signal,event,disconnected){
 while(!signal.aborted){try{
 const r=await fetch(base+'/'+auth.code+'/stream',{headers:{Authorization:'Bearer '+auth.key},signal});
 if(!r.ok){if([403,404].includes(r.status)){disconnected('Room expired. Create or join another room.',true);return}throw Error()}
 const reader=r.body.pipeThrough(new TextDecoderStream()).getReader();let pending='';
 while(!signal.aborted){const {done,value}=await reader.read();if(done)break;pending+=value;let nl;while((nl=pending.indexOf('\n'))>=0){const line=pending.slice(0,nl);pending=pending.slice(nl+1);if(line)event(JSON.parse(line))}} 
 }catch{}if(signal.aborted)return;disconnected('Connection interrupted. Reconnecting…');await new Promise(r=>setTimeout(r,1200))}
}
