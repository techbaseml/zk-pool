import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';
import {createClub} from '../server.js';
test('two clients share authoritative shots, turn, reconnect and rematch', {timeout:20000},async t=>{
 const server=createClub();server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 const stops=[];t.after(()=>{for(const c of stops)c.abort();server.closeAllConnections();server.close()});
 assert.equal((await fetch(base+'/')).status,200);assert.equal((await fetch(base+'/physics.js')).status,200);
 async function post(p,data,who){const r=await fetch(base+p,{method:'POST',headers:{'Content-Type':'application/json',...(who?{Authorization:'Bearer '+who.key}:{})},body:JSON.stringify(data)});return {status:r.status,...await r.json()}}
 const a=await post('/api/rooms',{name:'Player'});const path='/api/rooms/'+a.code+'/';const b=await post(path+'join',{name:'Player'});assert.equal(b.seat,1);assert.notEqual(a.key,b.key);assert.equal((await post(path+'join',{name:'Third'})).status,409);
 const act=(s,d)=>post(path+'act',d,s);assert.equal((await act({key:'a'.repeat(64)},{type:'ready'})).status,403);
 async function stream(s){const c=new AbortController();stops.push(c);const res=await fetch(base+path+'stream',{headers:{Authorization:'Bearer '+s.key},signal:c.signal});const reader=res.body.pipeThrough(new TextDecoderStream()).getReader();let buf='';return {stop:()=>c.abort(),async until(fn){for(;;){while(buf.includes('\n')){const [line,...rest]=buf.split('\n');buf=rest.join('\n');if(line){const ev=JSON.parse(line);if(fn(ev))return ev.value}}const {done,value}=await reader.read();if(done)throw Error('stream closed');buf+=value}}}}
 const sa=await stream(a);let sb=await stream(b);
 await act(a,{type:'ready'});await act(b,{type:'ready'});
 const active=e=>e.kind==='state'&&e.value.game;const state=await sa.until(active);await sb.until(active);const id=state.game.id;
 const shot={type:'shot',game:id,seq:0,angle:Math.PI,power:.05,spinX:0,spinY:0,ball:1,pocket:0};
 assert.equal((await act(b,shot)).status,400);assert.equal((await act(a,{...shot,power:2})).status,400);assert.equal((await act(a,{type:'place',game:id,seq:0,x:650,y:245})).status,400);
 assert.equal((await act(a,shot)).status,200);assert.ok((await act(a,shot)).status>=400);
 const frame=e=>e.kind==='frame';const [fa,fb]=await Promise.all([sa.until(frame),sb.until(frame)]);assert.deepEqual(fa,fb);
 const settled=e=>active(e)&&!e.value.moving&&e.value.game.seq===1;
 const [end1,end2]=await Promise.all([sa.until(settled),sb.until(settled)]);assert.deepEqual(end1.game,end2.game);assert.equal(end1.game.turn,1);
 sb.stop();await sa.until(e=>active(e)&&!e.value.connected[1]);sb=await stream(b);assert.equal((await sb.until(active)).game.id,id);
 assert.equal((await act(b,{type:'choice',id:'rerack',seq:1,game:id})).status,200);
 assert.equal((await act(b,{type:'place',x:180,y:180,seq:2,game:id})).status,200);
 await act(a,{type:'resign',game:id});const won=await sb.until(e=>active(e)&&e.value.game.winner!==null);assert.equal(won.game.winner,1);
 await act(a,{type:'rematch',game:id});await act(b,{type:'rematch',game:id});const next=await sa.until(e=>active(e)&&e.value.game.id!==id);assert.equal(next.game.breaker,0);assert.equal((await act(a,{type:'resign',game:id})).status,400);
});
