import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreservationPendingStore, indexedPendingPort, PRESERVATION_PENDING_DATABASE, PRESERVATION_PENDING_STORE, preservationPendingLegacyKey, type PendingPort, type PreservationPending } from './pending-store';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const seed=(id='request-1'):PreservationPending=>({raw:'{"source":"private"}',actorId:'',mode:'restore',command:{schema:'flowme-alpha-preservation-command/1',kind:'preservation',requestId:id,expectedRevision:1,expectedPublicRevision:0,mode:'restore',sourceSha256:'a'.repeat(64)}});
function harness(){
  const rows=new Map<string,unknown>(),old=new Map<string,string>();let fail=false;
  const port:PendingPort={async transact(owner,update){if(fail)throw Error('quota');const current=structuredClone(rows.get(owner)??null);const next=update?update(current):current;if(update){if(next===null)rows.delete(owner);else rows.set(owner,structuredClone(next));}return structuredClone(next);}};
  const legacy={getItem:(key:string)=>old.get(key)??null,removeItem:(key:string)=>{old.delete(key);}};
  return {rows,old,port,legacy,store:createPreservationPendingStore(port,legacy),fail:(value:boolean)=>{fail=value;}};
}
test('large photo payload reloads exactly, without legacy storage or auth metadata',async()=>{
  const h=harness(),value=seed();value.raw='x'.repeat(8_000_000);await h.store.save(a,value);
  const reopened=createPreservationPendingStore(h.port,h.legacy);assert.deepEqual(await reopened.load(a),value);assert.equal(h.old.size,0);
  assert.deepEqual(Object.keys(h.rows.get(a) as object).sort(),['actorId','command','mode','raw']);
});
test('owner isolation and exact request removal retain unrelated and newer work',async()=>{
  const h=harness();await h.store.save(a,seed());await h.store.save(b,seed('foreign'));
  await h.store.remove(a,'different');assert.deepEqual(await h.store.load(a),seed());
  await h.store.remove(a,'request-1');await h.store.save(a,seed('next'));
  await h.store.remove(a,'request-1');assert.deepEqual(await h.store.load(a),seed('next'));assert.deepEqual(await h.store.load(b),seed('foreign'));
  await assert.rejects(h.store.save(a,seed('overwrite')),/conflict/);
});
test('legacy copy is removed only after durable migration, and failures preserve it',async()=>{
  const h=harness(),raw=JSON.stringify(seed());h.old.set(preservationPendingLegacyKey(a),raw);h.fail(true);
  await assert.rejects(h.store.load(a));assert.equal(h.old.get(preservationPendingLegacyKey(a)),raw);assert.equal(h.rows.size,0);
  h.fail(false);assert.deepEqual(await h.store.load(a),seed());assert.equal(h.old.size,0);assert.deepEqual(h.rows.get(a),seed());
});
test('conflicting or damaged legacy records never overwrite durable work',async()=>{
  const h=harness();await h.store.save(a,seed());h.old.set(preservationPendingLegacyKey(a),JSON.stringify(seed('other')));
  await assert.rejects(h.store.load(a),/conflict/);assert.deepEqual(h.rows.get(a),seed());assert.equal(h.old.size,1);
  h.old.set(preservationPendingLegacyKey(a),'broken');await assert.rejects(h.store.load(a));assert.deepEqual(h.rows.get(a),seed());
});
test('invalid owners, extra credential fields and oversized payloads cannot be persisted',async()=>{
  const h=harness();await assert.rejects(h.store.save('foreign',seed()));
  await assert.rejects(h.store.save(a,{...seed(),accessToken:'secret'} as PreservationPending));
  await assert.rejects(h.store.save(a,{...seed(),raw:'x'.repeat(30_000_001)}));assert.equal(h.rows.size,0);
});
test('transaction failure keeps the prior request available for retry',async()=>{
  const h=harness();await h.store.save(a,seed());h.fail(true);await assert.rejects(h.store.remove(a,'request-1'));assert.deepEqual(h.rows.get(a),seed());
});

function idbHarness(){
  let tx:any,closed=0,write:unknown;const db={close:()=>closed++,transaction:(name:string,mode:string)=>{
    assert.equal(name,PRESERVATION_PENDING_STORE);assert.equal(mode,'readwrite');
    tx={objectStore:()=>({get:(owner:string)=>{assert.equal(owner,a);const read:any={result:null};queueMicrotask(()=>read.onsuccess());return read;},put:(value:unknown,owner:string)=>{assert.equal(owner,a);write=value;},delete:()=>{} }),abort:()=>queueMicrotask(()=>tx.onabort())};return tx;
  }};
  const factory={open:(name:string,version:number)=>{assert.equal(name,PRESERVATION_PENDING_DATABASE);assert.equal(version,1);const request:any={result:db};queueMicrotask(()=>request.onsuccess());return request;}} as unknown as IDBFactory;
  return {port:indexedPendingPort(factory),transaction:()=>tx,closed:()=>closed,write:()=>write};
}
test('IndexedDB adapter waits for transaction completion before resolving saved bytes',async()=>{
  const h=idbHarness();let settled=false;const saving=h.port.transact(a,()=>seed()).then(()=>{settled=true;});
  for(let i=0;i<5;i++)await Promise.resolve();assert.deepEqual(h.write(),seed());assert.equal(settled,false);assert.equal(h.closed(),0);
  h.transaction().oncomplete();await saving;assert.equal(settled,true);assert.equal(h.closed(),1);
});
test('IndexedDB abort after write request rejects instead of claiming durable success',async()=>{
  const h=idbHarness();const saving=h.port.transact(a,()=>seed());for(let i=0;i<5;i++)await Promise.resolve();
  h.transaction().error=Error('quota');h.transaction().onabort();await assert.rejects(saving,/quota/);assert.equal(h.closed(),1);
});
