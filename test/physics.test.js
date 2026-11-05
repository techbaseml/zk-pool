import test from 'node:test';import assert from 'node:assert/strict';
import {ball,rack,strike,step,place} from '../public/physics.js';
function sim(b,s){const log=strike(b,{angle:0,power:.45,...s});let t=0;while(step(b,log)&&++t<10000){}assert.ok(t<10000);return log}
test('legal random rack geometry',()=>{for(let i=0;i<40;i++){const b=rack();assert.equal(new Set(b.map(a=>a.n)).size,16);assert.equal(b[8].y,250);const rear=b.filter(a=>a.x>825).sort((a,b)=>a.y-b.y);assert.notEqual(rear[0].n<8,rear.at(-1).n<8)}})
test('contact, rail and settling',()=>{const b=[ball(0,200,250),ball(1,300,250)];let log=sim(b,{});assert.deepEqual(log.first,[1]);assert.ok(log.rails.includes(1));assert.equal(b[1].vx,0)})
test('pocket and scratch detection',()=>{const b=[ball(0,500,100)];assert.deepEqual(sim(b,{angle:-Math.PI/2}).pots,[{n:0,p:1}])})
test('draw changes cue position',()=>{let end=y=>{let b=[ball(0,250,250),ball(1,285,250)];sim(b,{spinY:y,power:.23});return b[0].x};assert.ok(end(1)>end(-1)+40)})
test('placement constraints',()=>{let b=rack();assert.equal(place(b,750,250),false);assert.equal(place(b,400,250,true),false);assert.equal(place(b,100,250,true),true)})
