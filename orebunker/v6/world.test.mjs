import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateWorld,serializeWorld,deserializeWorld,getBlock,excavate,BLOCK} from './world.mjs';
import {Arena,ARENA_STATE} from './arena.mjs';
test('world is deterministic and save round-trips',()=>{const a=generateWorld(123),b=generateWorld(123);assert.deepEqual(a.tiles,b.tiles);assert.deepEqual(deserializeWorld(serializeWorld(a)).tiles,b.tiles)});
test('bedrock and unreachable blocks fail closed',()=>{const w=generateWorld(5);assert.equal(getBlock(w,-1,0),BLOCK.BEDROCK);assert.equal(excavate(w,0,0,{x:.5,y:.5,toolTier:5}).reason,'UNBREAKABLE');assert.equal(excavate(w,3,3,{x:24.5,y:24.5,toolTier:5}).reason,'OUT_OF_REACH')});
test('60-second tournament, ready and no repeat score',()=>{let now=0;const a=new Arena({clock:()=>now});a.join('alpha');a.join('beta');a.ready('alpha');a.ready('beta');a.start();assert.equal(a.mine('alpha',4,4,BLOCK.ORE).points,25);assert.equal(a.mine('alpha',4,4,BLOCK.ORE).reason,'DUPLICATE');now=60000;assert.equal(a.tick().phase,ARENA_STATE.VERIFY);assert.equal(a.snapshot().winner,'alpha')});
