import {pockets,R,strike,step} from './physics.js';
import {legalTargets,resolve} from './rules.js';
export const levels=['Beginner','Easy','Medium','Hard','Expert'];
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function blocked(from,to,balls,skip){const dx=to.x-from.x,dy=to.y-from.y,l=dx*dx+dy*dy;return balls.some(b=>{if(b.dead||skip.includes(b.n))return false;const t=((b.x-from.x)*dx+(b.y-from.y)*dy)/l;return t>0&&t<1&&Math.hypot(b.x-from.x-t*dx,b.y-from.y-t*dy)<2*R-.3})}
function candidates(g){
 const cue=g.balls.find(b=>!b.n),targets=legalTargets(g),list=[];
 for(const b of g.balls.filter(b=>targets.includes(b.n)))for(const [p,[x,y]] of pockets.entries()){
 const path=Math.hypot(x-b.x,y-b.y),dx=(x-b.x)/path,dy=(y-b.y)/path,ghost={x:b.x-2*R*dx,y:b.y-2*R*dy};
 const approach=distance(cue,ghost)||1,cut=((ghost.x-cue.x)*dx+(ghost.y-cue.y)*dy)/approach;
 const obstacles=Number(blocked(cue,ghost,g.balls,[0,b.n]))+Number(blocked(b,{x,y},g.balls,[0,b.n]));
 list.push({ball:b.n,pocket:p,angle:Math.atan2(ghost.y-cue.y,ghost.x-cue.x),power:Math.min(.93,.12+approach/3400+path/2600+(1-cut)*.16),spinX:0,spinY:.2,safety:false,rank:cut*4-obstacles*7-path/850-approach/1100})
 }return list.sort((a,b)=>b.rank-a.rank)
}
export function plan(g,difficulty='Medium',random=Math.random){
 const level=Math.max(0,levels.indexOf(difficulty)),cue=g.balls.find(b=>!b.n);
 if(g.breaking)return {angle:Math.atan2(250-cue.y,750-cue.x)+(random()-.5)*.007,power:.94,spinX:0,spinY:.1,ball:1,pocket:0,safety:false};
 const list=candidates(g);let best=list[0],score=-Infinity;
 const trials=[1,2,4,9,18][level];
 for(let i=0;i<trials;i++){
 let s={...list[i%Math.min(list.length,level>2?6:3)]};
 if(i>5){s.spinY=i%2?-.35:.52;s.power=Math.min(.99,s.power*(i%2?.85:1.22))}
 if(i===trials-1&&level>=3){const target=g.balls.find(b=>b.n===s.ball);s.angle=Math.atan2(target.y-cue.y,target.x-cue.x);s.safety=true;s.power=.20}
 const sim=structuredClone(g),log=strike(sim.balls,s);let t=0;while(step(sim.balls,log)&&++t<5000){}
 const result=resolve(sim,log,s),c=sim.balls.find(b=>!b.n);
 let value=s.rank*.4+(result.made?35:0)-(result.foul?50:0)+(result.won?150:0)-(sim.winner===1-g.turn?160:0);
 if(level>=3&&sim.winner===null){const next=candidates(sim)[0];value+=(sim.turn===g.turn?1:-1)*(next?.rank??0)*1.5;if(s.safety)value+=1}
 if(!c.dead)value-=Math.hypot(c.x-500,c.y-250)/1800;
 if(value>score){score=value;best=s}
 }
 return {...best,angle:best.angle+(random()-.5)*[.095,.055,.022,.008,.002][level]}
}
