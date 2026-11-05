import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,action,tick} from '../public/game.js';import {levels,plan} from '../public/ai.js';import {ball} from '../public/physics.js';
for(const l of levels)test(l+' calculates a valid called shot',()=>{let g=newGame(['a','b']);g.breaking=false;g.hand=false;g.groups=['solids','stripes'];g.balls=[ball(0,500,260),ball(1,500,104),ball(8,200,350)];let s=plan(g,l,()=>.5);assert.equal(s.ball,1);assert.equal(s.pocket,1);let f=action(g,{...s,type:'shot',seq:0});while(tick(g,f)){}assert.equal(g.groups[0],'solids')})
