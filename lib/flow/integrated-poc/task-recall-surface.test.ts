import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgramRecallSurface } from './task-recall-surface';

test('recall surface starts empty and returns exactly its connected native owner', () => {
  const port = createProgramRecallSurface<{ isConnected: boolean }>();
  const a = { isConnected: true };
  assert.equal(port.read(), null);
  port.bind(a);
  assert.equal(port.read(), a);
});

test('detached surface is refused; old cleanup cannot clear a new native owner', () => {
  const port = createProgramRecallSurface<{ isConnected: boolean }>();
  const a = { isConnected: true }, b = { isConnected: true };
  port.bind(a);
  a.isConnected = false;
  assert.equal(port.read(), null);
  port.bind(b);
  port.release(a);
  assert.equal(port.read(), b);
  port.release(b);
  assert.equal(port.read(), null);
});

test('cleanup of the matching connected surface releases it without mutating it', () => {
  const port = createProgramRecallSurface<{ isConnected: boolean }>();
  const surface = Object.freeze({ isConnected: true });
  port.bind(surface);
  port.release(surface);
  assert.equal(port.read(), null);
  assert.equal(surface.isConnected, true);
});

import { createProgramRecallSettledSignal } from './task-recall-surface';
test('unchanged availability never dispatches; dirty/save/ACK transitions notify once',()=>{
 const s=createProgramRecallSettledSignal(),seen:boolean[]=[];s.listen(v=>seen.push(v));s.notify(false);s.notify(true);s.notify(true);s.notify(false);s.notify(false);assert.deepEqual(seen,[false,true]);
});
test('an old surface cleanup cannot clear the new native availability listener',()=>{
 const s=createProgramRecallSettledSignal(),a:boolean[]=[],b:boolean[]=[];const old=s.listen(v=>a.push(v));s.listen(v=>b.push(v));old();s.notify(true);s.notify(false);assert.deepEqual(a,[]);assert.deepEqual(b,[false,true]);
});
test('cleanup blocks a late ACK, while mounting a listener does not invent a new ACK',()=>{
 const s=createProgramRecallSettledSignal(),seen:boolean[]=[];const stop=s.listen(v=>seen.push(v));s.notify(true);stop();s.notify(false);s.listen(v=>seen.push(v));assert.deepEqual(seen,[false]);
});
