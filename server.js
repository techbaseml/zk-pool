import http from 'node:http';
import {randomBytes, timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {newGame,action,tick,resign} from './public/game.js';
const root=path.resolve(fileURLToPath(new URL('./public/',import.meta.url)));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.json':'application/json'};
const token=()=>randomBytes(32).toString('hex');
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status})};
function name(s){if(typeof s!=='string'||!s.trim()||s.trim().length>32)fail('Enter a name of 1–32 characters.');return s.trim()}
export function createClub({allowedOrigin=process.env.FRONTEND_ORIGIN||''}={}){
 const rooms=new Map(),limits=new Map();
 const send=(res,status,obj)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj))};
 function state(r){return {code:r.code,names:r.names,ready:r.ready,connected:r.streams.map(Boolean),game:r.game,moving:!!r.flight,rematch:r.rematch}}
 function cast(r,kind='state',payload){const value=payload??(kind==='frame'?r.game.balls.map(b=>[b.n,b.x,b.y,b.dead,b.rot]):state(r));
 for(const res of r.streams)if(res){if(res.writableLength>256000)res.destroy();else res.write(JSON.stringify({kind,value})+'\n')}}
 const clock=setInterval(()=>{const now=Date.now();for(const [id,r] of rooms){
 if(now-r.used>2*3600e3||(!r.streams.some(Boolean)&&now-r.used>10*60e3)){for(const res of r.streams)res?.end();rooms.delete(id);continue}
 if(r.flight){const steps=Math.min(120,Math.floor((now-r.simTime)*.24));r.simTime+=steps/0.24;
 const sounds=new Map();for(let i=0;i<steps;i++)if(!tick(r.game,r.flight,(kind,v)=>sounds.set(kind,Math.max(v,sounds.get(kind)||0)))){r.flight=null;break}
 if(sounds.size)cast(r,'audio',[...sounds]);cast(r,r.flight?'frame':'state')}
 else if(now-r.heartbeat>15000){r.heartbeat=now;for(const res of r.streams)res?.write('\n')}
 }for(const [ip,l] of limits)if(l.until<now)limits.delete(ip)},50);clock.unref();
 const srv=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://local'),p=url.pathname;
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 if(!p.startsWith('/api/')){
 if(!['GET','HEAD'].includes(req.method))fail('Method',405);
 const f=path.resolve(root,'.'+decodeURIComponent(p==='/'?'/index.html':p));if(!f.startsWith(root+path.sep)&&f!==root)fail('File unavailable',404);
 let content;try{content=await readFile(f)}catch{fail('File unavailable',404)}
 res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'});return res.end(req.method==='HEAD'?undefined:content)}
 const origin=req.headers.origin;if(origin){if(origin!==allowedOrigin&&new URL(origin).host!==req.headers.host)fail('Origin unavailable',403);res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin')}
 if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'});return res.end()}
 let l=limits.get(req.socket.remoteAddress);if(!l||l.until<Date.now())limits.set(req.socket.remoteAddress,l={until:Date.now()+60000,count:0});if(++l.count>220)fail('Too many requests',429);
 let body={};if(req.method==='POST'){let raw='';for await(const c of req){raw+=c;if(raw.length>4096)fail('Request too large',413)}try{body=JSON.parse(raw||'{}')}catch{fail('Invalid JSON')}if(!body||Array.isArray(body)||typeof body!=='object')fail('Invalid object')}
 if(p==='/api/rooms'&&req.method==='POST'){
 if(rooms.size>=200)fail('Room capacity reached',503);let code;do{code=randomBytes(4).toString('hex').toUpperCase()}while(rooms.has(code));
 const r={code,names:[name(body.name)],keys:[token()],ready:[false,false],rematch:[false,false],streams:[null,null],used:Date.now(),heartbeat:0,game:null,flight:null};rooms.set(code,r);return send(res,201,{code,key:r.keys[0],seat:0})}
 const match=p.match(/^\/api\/rooms\/([A-F0-9]{8})\/(join|stream|act)$/);
 if(!match||!rooms.has(match[1]))fail('Room expired or unknown.',404);const r=rooms.get(match[1]);
 if(match[2]==='join'&&req.method==='POST'){if(r.keys.length===2)fail('Room already has two players.',409);r.names.push(name(body.name));r.keys.push(token());r.used=Date.now();cast(r);return send(res,201,{code:r.code,key:r.keys[1],seat:1})}
 const bearer=(req.headers.authorization||'').replace(/^Bearer /,'');if(!/^[a-f0-9]{64}$/.test(bearer))fail('Room credential required.',403);
 const seat=r.keys.findIndex(k=>timingSafeEqual(Buffer.from(k),Buffer.from(bearer)));if(seat<0)fail('Invalid room credential.',403);r.used=Date.now();
 if(match[2]==='stream'&&req.method==='GET'){
 res.writeHead(200,{'Content-Type':'application/x-ndjson','Cache-Control':'no-store','X-Accel-Buffering':'no'});r.streams[seat]?.end();r.streams[seat]=res;cast(r);
 res.on('close',()=>{if(r.streams[seat]===res){r.streams[seat]=null;r.used=Date.now();cast(r)}});return}
 if(match[2]!=='act'||req.method!=='POST')fail('Wrong method.',405);
 if(body.type==='leave'){if(r.game)fail('Use resign during play');rooms.delete(r.code);for(const s of r.streams)s?.end();return send(res,200,{ok:true})}
 if(body.type==='ready'){if(r.game)fail('Rack already started');r.ready[seat]=true;if(r.keys.length===2&&r.ready.every(Boolean))r.game=newGame([...r.names])}
 else if(body.type==='rematch'){if(!r.game||r.game.winner===null||body.game!==r.game.id)fail('Rack is active or stale');r.rematch[seat]=true;if(r.rematch.every(Boolean)){r.game=newGame([...r.names],1-r.game.breaker);r.rematch=[false,false]}}
 else {if(!r.game||body.game!==r.game.id)fail('Rack is unavailable or stale');
 if(body.type==='resign'){resign(r.game,seat);r.flight=null}
 else {if(r.flight||!r.streams.every(Boolean))fail('Wait for both players and a settled table.',409);r.flight=action(r.game,body,seat)||null;r.simTime=Date.now()}}
 cast(r);send(res,200,body.type==='resign'?{ok:true,game:r.game}:{ok:true})
 }catch(e){if(!res.headersSent)send(res,e.status||400,{error:e.message});else res.end()}});
 srv.on('close',()=>clearInterval(clock));return srv
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||process.argv[process.argv.indexOf('--port')+1])||4173;
 createClub().listen(port,process.env.HOST||'0.0.0.0',()=>console.log('ZK POOL listening on '+port))
}
