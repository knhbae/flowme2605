import test from 'node:test';
import assert from 'node:assert/strict';
import { PROGRAM_TASK_RECALL_KEY as key, programTaskRecallEnabled as read, saveProgramTaskRecallPreference as write } from './task-recall-preference';
test('fresh devices enable recall; explicit OFF, unknown and denied storage stay closed', () => {
 assert.equal(read({getItem: () => null}), true);
 for (const value of ['off', '', 'true']) assert.equal(read({getItem: () => value}), false);
 assert.equal(read({getItem: () => {throw Error('denied');}}), false);
});
test('both explicit choices survive rereading the same device store', () => {
 const m=new Map<string,string>(), storage={getItem:(name:string)=>m.get(name)??null,setItem:(name:string,value:string)=>{m.set(name,value);}};
 assert.equal(write(storage,true),true); assert.equal(m.get(key),'on'); assert.equal(read(storage),true);
 assert.equal(write(storage,false),true); assert.equal(m.get(key),'off'); assert.equal(read(storage),false);
});
test('failed preference writes never report a persisted opt-in', () => {
 assert.equal(write({setItem:()=>{throw Error('quota');}},true),false);
});
