import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve, chooseBreak, legalTargets} from '../public/rules.js';
function state(extra={}) {
  return {turn:0,breaking:false,groups:[null,null],hand:false,winner:null,choice:null,
    balls:Array.from({length:16},(_,n)=>({n,x:50+n*25,y:70,dead:false})),...extra};
}
const log = {first:[1],before:[1,2,8,9],rails:[0],pots:[],off:[]};
function play(s,events={},shot={}) {
  return resolve(s,{...log,...events},{ball:1,pocket:2,...shot});
}
test('break counts distinct object balls rather than repeat contacts or cue rails',()=>{
  const s=state({breaking:true});
  const r=play(s,{rails:[0,1,1,2,3]});
  assert.equal(r.foul,true); assert.equal(s.turn,1);
  assert.deepEqual(s.choice.options.map(o=>o.id),['accept','rerack','returnBreak']);
  chooseBreak(s,'returnBreak',()=>state().balls);
  assert.equal(s.turn,0); assert.equal(s.breaking,true); assert.equal(s.hand,'head');
});
test('four rail dry break passes the open table',()=>{
  const s=state({breaking:true}); play(s,{rails:[2,3,4,5]});
  assert.equal(s.turn,1); assert.equal(s.choice,null); assert.deepEqual(s.groups,[null,null]);
});
test('on the break any first object is allowed and groups remain open after a pot',()=>{
  const s=state({breaking:true}); play(s,{first:[8],pots:[{n:11,p:4}]});
  assert.equal(s.turn,0); assert.deepEqual(s.groups,[null,null]); assert.equal(s.winner,null);
});
test('eight on break allows breaker to spot the eight adjacent to blocked foot spot',()=>{
  const s=state({breaking:true}); Object.assign(s.balls[3],{x:750,y:250}); s.balls[8].dead=true;
  play(s,{pots:[{n:8,p:1}]});
  assert.equal(s.winner,null); assert.equal(s.turn,0); chooseBreak(s,'spot');
  assert.equal(s.balls[8].dead,false); assert.ok(s.balls[8].x >= 772 && s.balls[8].x < 773);
});
test('scratch and eight on break gives opponent spot-and-hand or rebreak',()=>{
  const s=state({breaking:true}); play(s,{pots:[{n:8,p:3},{n:0,p:3}]});
  assert.equal(s.turn,1); assert.deepEqual(s.choice.options.map(o=>o.id),['spotHand','rerack']);
  chooseBreak(s,'spotHand'); assert.equal(s.hand,'head');
});
test('break scratch followed by head-string restriction',()=>{
  const s=state({breaking:true}); play(s,{rails:[1,2,3,4],pots:[{n:0,p:1}]});
  assert.equal(s.hand,'head'); const r=play(s,{firstX:170,crossedHead:false});
  assert.equal(r.foul,true); assert.equal(s.hand,'any'); assert.equal(s.turn,0);
});
test('head-string restriction permits a ball on the line and a returning cue ball',()=>{
  for(const [firstX,crossedHead] of [[250,false],[170,true]]) {
    const r=play(state({hand:'head'}),{firstX,crossedHead});
    assert.equal(r.foul,false);
  }
});
test('open table combination assigns called ball group, not first contacted ball',()=>{
  const s=state(); const r=play(s,{first:[9],pots:[{n:1,p:2}]});
  assert.deepEqual(s.groups,['solids','stripes']); assert.equal(r.continued,true);
});
test('wrong pocket and safety leave table open and switch the turn',()=>{
  for (const [p,safety] of [[4,false],[2,true]]) {
    const s=state(); play(s,{pots:[{n:1,p}]},{safety});
    assert.equal(s.turn,1); assert.deepEqual(s.groups,[null,null]); assert.equal(s.hand,false);
  }
});
test('wrong first ball and missing post-contact cushion give ball in hand',()=>{
  for(const events of [{first:[9]},{first:[]},{rails:[]}]) {
    const s=state({groups:['solids','stripes']}); play(s,events);
    assert.equal(s.turn,1); assert.equal(s.hand,'any');
  }
});
test('unresolvable split hit with legal ball favors shooter',()=>{
  const s=state({groups:['solids','stripes']}); assert.equal(play(s,{first:[9,1]}).foul,false);
});
test('early eight loses even if last group ball falls on same shot',()=>{
  const s=state({groups:['solids','stripes']}); play(s,{before:[1,8,9],pots:[{n:1,p:2},{n:8,p:3}]});
  assert.equal(s.winner,1);
});
test('win requires eight eligibility, correct call and no scratch',()=>{
  for (const [p,scratch,winner] of [[2,false,0],[3,false,1],[2,true,1]]) {
    const s=state({groups:['solids','stripes']});
    const pots=[{n:8,p}]; if(scratch) pots.push({n:0,p:1});
    play(s,{first:[8],before:[8,9],pots},{ball:8,pocket:2});
    assert.equal(s.winner,winner);
  }
});
test('open table allows temporary group claim only if an entire group is gone',()=>{
  const s=state(); assert.deepEqual(legalTargets(s,[1,8,9]),[1,9]);
  assert.deepEqual(legalTargets(s,[8,9]),[9,8]);
  play(s,{before:[8,9],first:[8],pots:[{n:8,p:2}]},{ball:8});
  assert.equal(s.winner,0);
});
test('ordinary ball driven off stays down, eight off loses rack',()=>{
  for(const n of [1,8]) { const s=state(); play(s,{off:[n]});
    if(n===8) assert.equal(s.winner,1); else assert.equal(s.hand,'any');
  }
});
test('invalid break decision does not mutate anything',()=>{
  const s=state({breaking:true}); play(s,{rails:[]}); const before=structuredClone(s);
  assert.throws(()=>chooseBreak(s,'spot')); assert.deepEqual(s,before);
});
test('head-string relief only offers closest eligible tied object balls',async()=>{
  const {headSpotOptions,spotHeadTarget}=await import('../public/rules.js');
  const s=state({hand:'head',groups:['solids','stripes']});
  for(const b of s.balls) if(b.n>0 && b.n<8) b.x=b.n<3 ? 224 : 101;
  assert.deepEqual(headSpotOptions(s),[1,2]); assert.throws(()=>spotHeadTarget(s,3));
  spotHeadTarget(s,2); assert.equal(s.balls[2].x,750); assert.deepEqual(headSpotOptions(s),[]);
});
