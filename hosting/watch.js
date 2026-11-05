import {strike,step} from './physics.js';
export async function watch(auth,signal,event,disconnected){
 let previous='',animation=0;
 signal.addEventListener('abort',()=>cancelAnimationFrame(animation),{once:true});
 while(!signal.aborted){try{
 const res=await fetch('/api/rooms/'+auth.code+'/state',{headers:{Authorization:'Bearer '+auth.key},cache:'no-store',signal});
 if([403,404].includes(res.status)){disconnected('Room expired. Create or join another room.',true);return}
 if(!res.ok)throw Error();
 const s=await res.json(),replay=s.replay;delete s.replay;
 const version=JSON.stringify([s.names,s.ready,s.connected,s.rematch,s.game?.id,s.game?.seq,s.game?.winner,s.moving]);
 if(version!==previous){previous=version;cancelAnimationFrame(animation);event({kind:'state',value:s});
 if(replay){const balls=structuredClone(s.game.balls),log=strike(balls,replay.shot),start=performance.now()-replay.elapsed;let steps=0;
 function animate(t){if(signal.aborted)return;const needed=Math.min(10000,Math.floor((t-start)*.24));let active=true;
 while(steps<needed&&active){steps++;active=step(balls,log)}
 event({kind:'frame',value:balls.map(b=>[b.n,b.x,b.y,b.dead,b.rot])});if(active)animation=requestAnimationFrame(animate)}
 animation=requestAnimationFrame(animate)}}
 }catch{if(signal.aborted)return;previous='';disconnected('Reconnecting to room…')}
 await new Promise(r=>setTimeout(r,850))}
}
