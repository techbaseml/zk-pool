import {rack,place,canPlace,autoPlace,strike,step} from './physics.js';
import {resolve,chooseBreak,legalTargets,spotHeadTarget} from './rules.js';
const stat=()=>({shots:0,made:0,balls:0,fouls:0,visits:0,breakBalls:0,best:0,streak:0});
export function newGame(names,breaker=0){
 return {id:Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join(''),names,turn:breaker,breaker,balls:rack(),groups:[null,null],breaking:true,hand:'head',winner:null,choice:null,seq:0,stats:[stat(),stat()],started:Date.now(),message:'Opening break. Aim at the rack.',eight:false,run:false}
}
export function action(g,a,player=g.turn){
 if(g.winner!==null||g.turn!==player||a.seq!==g.seq)throw Error('Turn or shot sequence has changed.');
 if(g.choice){if(a.type!=='choice')throw Error('Choose a break ruling.');chooseBreak(g,a.id,rack);if(g.breaking){g.breaker=g.turn;g.stats=[stat(),stat()]}if(g.hand)autoPlace(g.balls,g.hand==='head');g.seq++;return}
 if(a.type==='spot'){spotHeadTarget(g,a.ball);g.seq++;return}
 if(a.type==='place'){
 if(!g.hand||!place(g.balls,a.x,a.y,g.hand==='head'))throw Error('Place the cue on clear felt inside the permitted area.');
 g.seq++;return}
 if(a.type!=='shot')throw Error('Unknown action.');
 const s=a;
 if(![s.angle,s.power,s.spinX,s.spinY].every(Number.isFinite)||Math.abs(s.angle)>Math.PI*10||s.power<.01||s.power>1||Math.hypot(s.spinX,s.spinY)>1.001)throw Error('Invalid shot settings.');
 if(typeof s.safety!=='undefined'&&typeof s.safety!=='boolean')throw Error('Invalid safety call.');
 if(!g.breaking&&!s.safety&&(!legalTargets(g).includes(s.ball)||!Number.isInteger(s.pocket)||s.pocket<0||s.pocket>5))throw Error('Call a legal ball and pocket.');
 const cue=g.balls.find(b=>!b.n);
 if(cue.dead||(g.hand&&!canPlace(g.balls,cue.x,cue.y,g.hand==='head')))throw Error('Place the cue ball before shooting.');
 g.seq++;return {shot:{...s,headRestricted:g.hand==='head'},log:strike(g.balls,s)}
}
export function tick(g,flight,emit){
 if(step(g.balls,flight.log,emit))return true;
 const p=g.turn,opening=g.breaking,stats=g.stats[p],result=resolve(g,flight.log,flight.shot);
 const count=flight.log.pots.filter(b=>b.n).length;
 stats.shots++;stats.balls+=count;stats.made+=Number(result.made);stats.fouls+=Number(result.foul);
 if(opening)stats.breakBalls=count;
 stats.streak=result.made?stats.streak+1:0;stats.best=Math.max(stats.best,stats.streak);
 if(g.turn!==p)stats.visits++;
 if(g.winner!==null){g.eight=result.won;g.run=result.won&&g.winner===g.breaker&&stats.visits===0}
 if(g.hand)autoPlace(g.balls,g.hand==='head');
 return false
}
export function resign(g,player){if(g.winner!==null)throw Error('Rack has ended.');g.winner=1-player;g.message=g.names[player]+' resigned.';g.seq++}
