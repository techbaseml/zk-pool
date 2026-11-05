import test from 'node:test';import assert from 'node:assert/strict';
import {ball,rack,step,strike} from '../public/physics.js';
import {newGame,action,tick} from '../public/game.js';
import {drills,drillHints,setupDrill,assess} from '../public/practice.js';
test('called eight is won by simulating the actual strike',()=>{let g=newGame(['a','b']);g.balls=[ball(0,500,260),ball(8,500,104),ball(9,700,350)];g.breaking=false;g.hand=false;g.groups=['solids','stripes'];const flight=action(g,{type:'shot',angle:-Math.PI/2,power:.25,spinX:0,spinY:0,ball:8,pocket:1,seq:0});while(tick(g,flight)){}assert.equal(g.winner,0);assert.equal(g.stats[0].balls,1);assert.ok(g.eight);assert.throws(()=>action(g,{type:'place',x:120,y:120,seq:1}))})
test('side spin changes cushion exit angle',()=>{function end(side){const b=[ball(0,150,75)],l=strike(b,{angle:-Math.PI/2,power:.25,spinX:side,spinY:0});while(step(b,l)){}return b[0].x}assert.ok(Math.abs(end(1)-end(-1))>35)})
test('every drill has a valid table and a real outcome evaluator',()=>{for(const d of Object.keys(drills)){const b=setupDrill(d);assert.ok(b.some(x=>!x.n));assert.ok(drillHints[d]);assert.equal(typeof assess(d,b,{pots:[],rails:[],first:[]},{spinY:0}),'string')}})
