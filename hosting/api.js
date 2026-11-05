import {newGame,action,tick,resign} from '../public/game.js';
const hex=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),v=>v.toString(16).padStart(2,'0')).join('');
const fail=(s,n=400)=>{throw Object.assign(Error(s),{status:n})};
const json=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
function name(n){if(typeof n!=='string'||!n.trim()||n.trim().length>32)fail('Enter a name of 1–32 characters.');return n.trim()}
export async function api(req,db){
 try{
 const u=new URL(req.url),now=Date.now(),post=req.method==='POST';
 if(req.headers.get('Origin')&&req.headers.get('Origin')!==u.origin&&req.headers.get('Origin')!=='https://techbaseml.github.io')fail('Origin unavailable',403);
 const raw=post?await req.text():'{}';if(raw.length>4096)fail('Request too large',413);const b=JSON.parse(raw);
 if(u.pathname==='/api/rooms'&&post){
 await db.prepare('DELETE FROM pool_rooms WHERE expires < ?').bind(now).run();
 const code=hex(4).toUpperCase(),key=hex(32),r={code,keys:[key],names:[name(b.name)],ready:[false,false],rematch:[false,false],seen:[now,0],game:null,replay:null};
 await db.prepare('INSERT INTO pool_rooms VALUES (?,0,?,?)').bind(code,JSON.stringify(r),now+7200000).run();return json({code,key,seat:0},201)}
 const m=u.pathname.match(/^\/api\/rooms\/([A-F0-9]{8})\/(state|act|join)$/);if(!m)fail('Unknown room path',404);
 const row=await db.prepare('SELECT * FROM pool_rooms WHERE code=? AND expires>?').bind(m[1],now).first();if(!row)fail('Room expired',404);
 const r=JSON.parse(row.state);let response={ok:true};
 if(post&&m[2]==='join'){if(r.keys.length===2)fail('Room full',409);const key=hex(32);r.names.push(name(b.name));r.keys.push(key);r.seen[1]=now;response={code:r.code,key,seat:1}}
 else {
 const key=req.headers.get('Authorization')?.replace(/^Bearer /,''),seat=r.keys.indexOf(key);if(seat<0)fail('Invalid seat',403);
 if(m[2]==='state'&&!post){
 if(now-r.seen[seat]>5000){r.seen[seat]=now;await db.prepare('UPDATE pool_rooms SET state=?,rev=rev+1,expires=? WHERE code=? AND rev=?').bind(JSON.stringify(r),now+7200000,r.code,row.rev).run()}
 const replay=r.replay&&now<r.replay.ends?r.replay:null;
 return json({code:r.code,names:r.names,ready:r.ready,rematch:r.rematch,connected:r.seen.map(t=>now-t<30000),game:replay?replay.start:r.game,moving:!!replay,replay:replay?{shot:replay.shot,elapsed:now-replay.at}:null})}
 if(m[2]!=='act'||!post)fail('Invalid action',405);
 r.seen[seat]=now;
 if(b.type==='leave'&&!r.game){await db.prepare('DELETE FROM pool_rooms WHERE code=? AND rev=?').bind(r.code,row.rev).run();return json(response)}
 if(b.type==='ready'&&!r.game){r.ready[seat]=true;if(r.ready.every(Boolean))r.game=newGame(r.names)}
 else if(!r.game||r.game.id!==b.game)fail('Stale rack');
 else if(b.type==='resign'){resign(r.game,seat);r.replay=null;response.game=r.game}
 else if(b.type==='rematch'&&r.game.winner!==null){r.rematch[seat]=true;if(r.rematch.every(Boolean)){r.game=newGame(r.names,1-r.game.breaker);r.rematch=[false,false];r.replay=null}}
 else {if(r.replay?.ends>now||r.seen.some(t=>now-t>30000))fail('Wait for both players and a settled table.',409);
 const start=structuredClone(r.game),flight=action(r.game,b,seat);
 if(flight){let steps=1;while(tick(r.game,flight)&&steps++<10000){}const at=Date.now();r.replay={start,shot:b,at,ends:at+steps*1000/240}}else r.replay=null}
 }
 const updated=await db.prepare('UPDATE pool_rooms SET state=?,rev=rev+1,expires=? WHERE code=? AND rev=?').bind(JSON.stringify(r),now+7200000,r.code,row.rev).run();
 if(!updated.meta.changes)fail('Room changed. Please try again.',409);return json(response)
 }catch(e){return json({error:e.status||!e.message.includes('D1')?e.message:'Room storage is unavailable.'},e.status||400)}
}
