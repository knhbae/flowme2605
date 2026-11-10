import assert from 'node:assert/strict';
import test from 'node:test';
import { taskLocationSaveGate } from './task-location-save-gate';
type Snapshot=NonNullable<Parameters<typeof taskLocationSaveGate>[0]>;
const ready:Snapshot={status:'ready',pending:null,busy:false,draft:null};
test('only confirmed idle authority permits movement',()=>{
  for(const status of ['ready','saved','same-location','cancelled'] as const)assert.equal(taskLocationSaveGate({...ready,status}).blocked,false,status);
  assert.equal(taskLocationSaveGate(null).blocked,true);
  assert.equal(taskLocationSaveGate(ready,true).blocked,true);
});
test('pending, busy, unresolved drafts and recovery statuses block solely by state',()=>{
  const command={} as NonNullable<Snapshot['pending']>;
  for(const snapshot of [{...ready,pending:command},{...ready,busy:true},{...ready,pending:command,busy:true,status:'saving'},{...ready,pending:command,status:'recovery-required'},{...ready,status:'checking-result',pending:command},{...ready,draft:command},{...ready,status:'signed-out'},{...ready,status:'session-expired'},{...ready,status:'conflict'}] as Snapshot[])assert.equal(taskLocationSaveGate(snapshot).blocked,true,JSON.stringify(snapshot));
  assert.equal(taskLocationSaveGate({...ready,busy:true}).checking,true);
  assert.equal(taskLocationSaveGate({...ready,status:'recovery-required',pending:command}).checking,false);
  assert.equal(taskLocationSaveGate({...ready,draft:command,retryableRejectedDraft:true}).blocked,true,'retrying a rejected draft does not authorize a different structural move');
  assert.equal(taskLocationSaveGate({...ready,status:'not-sent' as Snapshot['status'],retryableRejectedDraft:true}).blocked,true,'savedrop A1 future status fails closed without changing its owner types');
});
