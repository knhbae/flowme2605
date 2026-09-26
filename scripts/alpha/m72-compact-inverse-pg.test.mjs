// Actual migration SQL in WASM PostgreSQL; synthetic identities and auth stubs only.
import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHmac, createHash } from 'node:crypto';
import { build } from 'esbuild';
import { createInverseRuntime, asFixtureActor, runtimeDirectory } from './m72-inverse-pg-runtime.mjs';

const root = resolve(import.meta.dirname, '../..');
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const session = '33333333-3333-4333-8333-333333333333';
const otherSession = '44444444-4444-4444-8444-444444444444';
const now = '2026-09-23T10:00:00.000Z';
const key = Buffer.alloc(32, 17); // public synthetic fixture, never a server key
const claims = { sub: owner, session_id: session, exp: 4102444800, is_anonymous: false };
const db = await createInverseRuntime();
const checks = [], migrations = [];
async function check(name, fn) {
  try { await fn(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: String(error.message) }); }
}
async function scalar(sql, params = []) { return (await db.query(sql, params)).rows[0].value; }
async function snapshot() { return {
  accounts: await scalar('select jsonb_agg(to_jsonb(a) order by owner_id) as value from public.flowme_alpha_accounts a'),
  ledger: await scalar('select coalesce(jsonb_agg(to_jsonb(o) order by owner_id,request_id),\'[]\'::jsonb) as value from flowme_private.alpha_operations_v1 o'),
}; }
const command = (id, revision, working) => ({ schema:'flowme-alpha-creator-command/1',kind:'creator',requestId:id,expectedRevision:revision,intent:{type:'working',working,now} });
const undo = (id, revision, operationId) => ({ schema:'flowme-alpha-creator-command/1',kind:'undo-creator',requestId:id,expectedRevision:revision,operationId });
async function execute(commit, actorClaims = claims, proofOverride) {
  const text = JSON.stringify(commit);
  const proof = proofOverride ?? createHmac('sha256',key).update(`${actorClaims.sub}\n${text}`).digest('hex');
  return asFixtureActor(db, actorClaims, async(tx) => (await tx.query('select public.flowme_alpha_creator_execute_v1($1,$2) as value',[text,proof])).rows[0].value);
}
async function rejectUnchanged(name, commit, reason, actorClaims = claims, proof) {
  await check(name, async() => { const before = await snapshot(); const result=await execute(commit,actorClaims,proof); assert.equal(result.ok,false); if(reason)assert.equal(result.reason,reason); assert.deepEqual(await snapshot(),before); });
}
const envelope = (changes) => ({field:'creatorWorkspace',schema:'flowme-alpha-object-inverse/1',changes});
async function apply(value, patch) { return scalar('select flowme_private.alpha_object_inverse_apply_v1($1::jsonb,$2::jsonb) as value',[JSON.stringify(value),JSON.stringify(patch)]); }
try {
  for (const name of (await readdir(resolve(root,'supabase/migrations'))).filter(n=>n.endsWith('.sql')).sort()) {
    const sql=await readFile(resolve(root,'supabase/migrations',name),'utf8');
    assert.ok(sql.trim(),`empty migration ${name}`);
    await db.exec(sql); migrations.push({name,sha256:createHash('sha256').update(sql).digest('hex')});
  }
  const bundle=resolve(runtimeDirectory,'creator-reference.mjs');
  await build({stdin:{contents:`export {createProgramPrivateSpace} from './lib/flow/integrated-poc/program-data'; export {dispatchAlphaCreatorCommand} from './lib/flow/integrated-poc/alpha-creator/dispatch'; export {createCreatorInverse,applyCreatorInverse} from './lib/flow/integrated-poc/alpha-creator/compact-inverse';`,resolveDir:root,loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:bundle});
  const ref=await import(pathToFileURL(bundle).href);
  await check('natural 13-to-14 migration upgrade preserves legacy ledger and supports old Undo plus new compact edits',async()=>{
    const upgradeDb=await createInverseRuntime();
    try {
      const compactIndex=migrations.findIndex(m=>m.name==='20260923095533_flowme_alpha_m72_compact_creator_inverse.sql');
      assert.equal(compactIndex,13,'pin the historical upgrade, not the latest unrelated migration');
      for(const migration of migrations.slice(0,compactIndex))await upgradeDb.exec(await readFile(resolve(root,'supabase/migrations',migration.name),'utf8'));
      await upgradeDb.query('insert into auth.users(id) values($1)',[owner]);
      await upgradeDb.query('insert into auth.sessions(id,user_id) values($1,$2)',[session,owner]);
      await upgradeDb.query('insert into flowme_private.alpha_command_signing_keys_v1(id,secret_key) values(true,$1)',[key]);
      const initial={schema:'flowme-alpha-account/1',ownerId:owner,revision:0,source:{schema:'flowme-integrated-product-poc/1',actorId:owner,revision:0},space:ref.createProgramPrivateSpace(),legacyReceipts:[],legacyUndo:[]};
      await upgradeDb.query('insert into public.flowme_alpha_accounts(owner_id,account) values($1,$2::jsonb)',[owner,JSON.stringify(initial)]);
      const readAccount=async()=>(await upgradeDb.query('select account from public.flowme_alpha_accounts where owner_id=$1',[owner])).rows[0].account;
      const readState=async()=>({account:await readAccount(),ledger:(await upgradeDb.query('select to_jsonb(o) as value from flowme_private.alpha_operations_v1 o order by request_id')).rows.map(row=>row.value)});
      const call=async(commit)=>{const text=JSON.stringify(commit),proof=createHmac('sha256',key).update(`${owner}\n${text}`).digest('hex');return asFixtureActor(upgradeDb,claims,async tx=>(await tx.query('select public.flowme_alpha_creator_execute_v1($1,$2) as value',[text,proof])).rows[0].value);};
      const edit=async(id,working)=>{const account=await readAccount(),cmd=command(id,account.revision,working),dispatched=ref.dispatchAlphaCreatorCommand(account,cmd);assert.equal(dispatched.ok,true);assert.equal((await call({schema:'flowme-alpha-creator-commit/1',command:cmd,changes:dispatched.changes,resultId:dispatched.result})).ok,true);};
      const working={draftId:'upgrade-draft',title:'Before upgrade',rawText:'synthetic unchanged large original '.repeat(2000),baseRecordRevision:null};
      await edit('old-first',working);
      const originalSpace=(await readAccount()).space;
      await edit('old-edit',{...working,title:'Old writer edit'});
      const before=await readState();
      assert.equal(before.ledger.length,2);
      assert.ok(before.ledger.every(row=>row.inverse.every(entry=>!Object.hasOwn(entry,'schema')&&typeof entry.present==='boolean')));
      assert.equal(before.account.revision,2);
      await upgradeDb.exec(await readFile(resolve(root,'supabase/migrations',migrations[compactIndex].name),'utf8'));
      assert.deepEqual(await readState(),before);
      assert.equal((await call({schema:'flowme-alpha-creator-commit/1',command:undo('new-undo-old',2,'old-edit'),changes:[],resultId:null})).ok,true);
      assert.deepEqual((await readAccount()).space,originalSpace);
      assert.equal((await readAccount()).revision,3);
      await edit('new-edit',{...working,title:'New writer edit'});
      const final=await readState();
      assert.equal(final.account.revision,4);
      assert.equal(final.ledger.length,4);
      assert.equal(final.ledger.find(row=>row.request_id==='new-edit').inverse[0].schema,'flowme-alpha-object-inverse/1');
      assert.equal(final.ledger.find(row=>row.request_id==='old-edit').undone,true);
      assert.deepEqual(final.ledger.find(row=>row.request_id==='old-first'),before.ledger.find(row=>row.request_id==='old-first'));
    } finally {await upgradeDb.close();}
  });
  await db.query('insert into auth.users(id) values($1),($2)',[owner,other]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[session,owner]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[otherSession,other]);
  await db.query('insert into flowme_private.alpha_command_signing_keys_v1(id,secret_key) values(true,$1)',[key]);
  const base={schema:'flowme-alpha-account/1',ownerId:owner,revision:0,source:{schema:'flowme-integrated-product-poc/1',actorId:owner,revision:0},space:ref.createProgramPrivateSpace(),legacyReceipts:[],legacyUndo:[]};
  await db.query('insert into public.flowme_alpha_accounts(owner_id,account) values($1,$2::jsonb)',[owner,JSON.stringify(base)]);
  await check('all actual migrations applied and account shape accepted',async()=>assert.equal(await scalar('select flowme_private.alpha_account_shape_v1($1::jsonb,$2::uuid) as value',[JSON.stringify(base),owner]),true));
  async function current(){return scalar('select account as value from public.flowme_alpha_accounts where owner_id=$1',[owner]);}
  async function make(id, working){const account=await current(); const cmd=command(id,account.revision,working); const dispatched=ref.dispatchAlphaCreatorCommand(account,cmd); assert.equal(dispatched.ok,true);return {schema:'flowme-alpha-creator-commit/1',command:cmd,changes:dispatched.changes,resultId:dispatched.changed ? dispatched.result : null};}
  const w={draftId:'fixture-draft',title:'Synthetic',rawText:'preserved original '.repeat(2000),baseRecordRevision:null};
  const first=await make('first',w);
  await check('signed creator command creates actual valid workspace',async()=>assert.equal((await execute(first)).ok,true));
  const beforeEdit=await current();
  const second=await make('second',{...w,title:'Edited'});
  await check('signed second command stores compact inverse',async()=>{assert.equal((await execute(second)).ok,true);const inverse=await scalar("select inverse as value from flowme_private.alpha_operations_v1 where request_id='second'");assert.equal(inverse[0].schema,'flowme-alpha-object-inverse/1');assert.ok(JSON.stringify(inverse).length<JSON.stringify(beforeEdit.space.creatorWorkspace).length/2);});
  await check('same command retry returns receipt without mutations',async()=>{const before=await snapshot();assert.equal((await execute(second)).ok,true);assert.deepEqual(await snapshot(),before);});
  await rejectUnchanged('same request different intent conflicts',{...second,command:{...second.command,intent:{...second.command.intent,now:'2026-09-24T10:00:00.000Z'}}},'idempotency-conflict');
  await rejectUnchanged('stale CAS rejected',{...second,command:{...second.command,requestId:'stale'}},'revision-conflict');
  await rejectUnchanged('invalid HMAC rejected',second,'invalid',claims,'0'.repeat(64));
  await rejectUnchanged('expired session rejected',second,'unauthenticated',{...claims,exp:1});
  await rejectUnchanged('wrong owner session rejected',second,'unauthenticated',{...claims,sub:other});
  await rejectUnchanged('compact inverse is rejected as forward changes',{...second,command:{...second.command,requestId:'forward-patch',expectedRevision:2},changes:[envelope([{op:'set',path:['working','title'],value:'x'}])]},'invalid');
  await check('revoked session denies write and preserves account/ledger',async()=>{await db.query('delete from auth.sessions where id=$1',[session]);const before=await snapshot();assert.equal((await execute(second)).reason,'unauthenticated');assert.deepEqual(await snapshot(),before);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[session,owner]);});
  await check('independent authenticated owner sees no foreign account',async()=>{const result=await asFixtureActor(db,{...claims,sub:other,session_id:otherSession},async tx=>({live:(await tx.query('select flowme_private.live_session_v1() as value')).rows[0].value,rows:(await tx.query('select * from public.flowme_alpha_accounts')).rows}));assert.equal(result.live,true);assert.equal(result.rows.length,0);});
  await rejectUnchanged('valid other session writer cannot target first owner',second,'not-found',{...claims,sub:other,session_id:otherSession});
  const undoCommit=(id,rev,target)=>({schema:'flowme-alpha-creator-commit/1',command:undo(id,rev,target),changes:[],resultId:null});
  await check('compact undo restores exact prior workspace',async()=>{assert.equal((await execute(undoCommit('undo-second',2,'second'))).ok,true);assert.deepEqual((await current()).space,beforeEdit.space);});
  await check('redo through undo operation restores edited title',async()=>{assert.equal((await execute(undoCommit('redo-second',3,'undo-second'))).ok,true);assert.equal((await current()).space.creatorWorkspace.working.title,'Edited');});
  await rejectUnchanged('old undo target conflicts',undoCommit('old-undo',4,'first'),'undo-conflict');
  await rejectUnchanged('no-op creates no account/ledger change',await make('noop',{...w,title:'Edited'}),'no-change');
  await check('legacy snapshot inverse remains executable',async()=>{const account=await current();await db.query("update flowme_private.alpha_operations_v1 set inverse=$1::jsonb where request_id='redo-second'",[JSON.stringify([{field:'creatorWorkspace',present:true,value:beforeEdit.space.creatorWorkspace}])]);assert.equal((await execute(undoCommit('legacy-undo',account.revision,'redo-second'))).ok,true);assert.deepEqual((await current()).space,beforeEdit.space);});
  const pairs=[ [{a:1,b:{x:2}},{a:2,b:{x:2}}], [{a:1},{a:1,b:null}], [{a:1,b:2},{a:1}], [{a:[1,2,3]},{a:[1,9,3]}], [{a:[1,2]},{a:[1,2,3]}], [{a:[1,2,3]},{a:[1]}], [{a:[{x:1},{x:2}]},{a:[{x:1},{x:3}]}], [{a:{b:1}},{a:null}] ];
  pairs.push([{'':{x:1},'a/b':null},{'':{x:2},'a/b':[]}]);
  let seed=1979;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  for(let i=0;i<40;i++){const length=rand()%8;const a={rows:Array.from({length},(_,j)=>({id:j,label:`value-${rand()%20}`})),optional:null};const b=structuredClone(a);if(i%3===0)b.rows.push({id:100+i,label:'new'});else if(i%3===1&&length)b.rows.splice(rand()%length,1);else b.optional={value:rand()%20};if(JSON.stringify(a)!==JSON.stringify(b))pairs.push([a,b]);}
  for(let i=0;i<pairs.length;i++) await check(`SQL diff/apply roundtrip ${i}`,async()=>{const [a,b]=pairs[i];const changes=await scalar('select flowme_private.alpha_object_inverse_diff_v1($1::jsonb,$2::jsonb) as value',[JSON.stringify(a),JSON.stringify(b)]);assert.notEqual(changes,null);assert.deepEqual(await apply(a,envelope(changes)),b);});
  for(let i=0;i<pairs.length;i++) await check(`SQL/TS compact differential ${i}`,async()=>{const [a,b]=pairs[i];const before={creatorWorkspace:{...b,padding:'synthetic'.repeat(1000)}},after={creatorWorkspace:{...a,padding:'synthetic'.repeat(1000)}};const sql=await scalar("select flowme_private.alpha_creator_inverse_v1($1::jsonb,$2::jsonb,'creatorWorkspace') as value",[JSON.stringify(before),JSON.stringify(after)]);const ts=ref.createCreatorInverse(before,after);assert.deepEqual(sql,ts);assert.deepEqual(ref.applyCreatorInverse(after,[sql]),before);assert.deepEqual(await apply(after.creatorWorkspace,ts),before.creatorWorkspace);});
  const malformed=[{...envelope([]),schema:'bad'},envelope([{op:'set',path:[],value:2}]),envelope([{op:'set',path:['__proto__'],value:1}]),envelope([{op:'set',path:['a'],value:2},{op:'remove',path:['a','b']}]),envelope([{op:'splice',path:['a'],expectedLength:3,index:8,remove:1,values:[]}]),envelope([{op:'splice',path:['a'],expectedLength:99,index:0,remove:1,values:[]}]),envelope([{op:'wat',path:['a']}])];
  for(let i=0;i<malformed.length;i++)await check(`malformed inverse rejected and atomic ${i}`,async()=>{const account=await current();const target=(await scalar("select request_id as value from flowme_private.alpha_operations_v1 where (receipt->>'revision')::bigint=$1",[account.revision]));await db.query('update flowme_private.alpha_operations_v1 set inverse=$1::jsonb where request_id=$2',[JSON.stringify([malformed[i]]),target]);const before=await snapshot();const result=await execute(undoCommit(`bad-${i}`,account.revision,target));assert.equal(result.ok,false);assert.deepEqual(await snapshot(),before);});
  for(let i=0;i<malformed.length;i++)await check(`malformed direct helper rejection ${i}`,async()=>{await assert.rejects(()=>apply({a:[1,2,3]},malformed[i]));});
  const set=(path,value)=>({op:'set',path,value});
  const remove=(path)=>({op:'remove',path});
  const splice=(extra={})=>({op:'splice',path:['a'],expectedLength:3,index:0,remove:0,values:[],...extra});
  const boundaryCases=[
    ['duplicate path',envelope([set(['x'],2),set(['x'],3)])],
    ['descendant then ancestor',envelope([set(['nested','x'],2),set(['nested'],{})])],
    ['missing parent',envelope([set(['missing','x'],2)])],
    ['scalar parent',envelope([set(['x','child'],2)])],
    ['array noncanonical 01',envelope([set(['a','01'],9)])],
    ['array negative index',envelope([set(['a','-1'],9)])],
    ['array out of bounds',envelope([set(['a','3'],9)])],
    ['array remove forbidden',envelope([remove(['a','0'])])],
    ['noop set',envelope([set(['x'],1)])],
    ['noop splice',envelope([splice()])],
    ['noop replacing same slice',envelope([splice({index:1,remove:1,values:[2]})])],
    ['hybrid legacy compact',{...envelope([set(['x'],2)]),present:true,value:{}}],
    ['envelope extra key',{...envelope([set(['x'],2)]),extra:true}],
    ['patch extra key',envelope([{...set(['x'],2),extra:true}])],
    ['wrong field',{...envelope([set(['x'],2)]),field:'text'}],
    ['zero patches',envelope([])],
    ['patch count limit',envelope(Array.from({length:4097},(_,i)=>set([`key${i}`],i)))],
    ['null path',envelope([{op:'set',path:null,value:2}])],
    ['numeric path segment',envelope([set(['a',0],9)])],
    ['splice negative remove',envelope([splice({remove:-1})])],
    ['splice fractional index',envelope([splice({index:0.5,remove:1})])],
    ['splice values not array',envelope([splice({values:{}})])],
  ];
  for(const [label,patch] of boundaryCases)await check(`independent SQL boundary: ${label}`,async()=>{
    await assert.rejects(()=>apply({a:[1,2,3],x:1,nested:{x:1}},patch));
  });
  await check('SQL distinguishes missing null empty and numeric object keys',async()=>{
    const before={'':null,'01':'leading','-1':[],'0':{}},after={'':{},'01':null,'-1':[1],'0':null,newKey:null};
    const diff=await scalar('select flowme_private.alpha_object_inverse_diff_v1($1::jsonb,$2::jsonb) as value',[JSON.stringify(after),JSON.stringify(before)]);
    assert.deepEqual(await apply(after,envelope(diff)),before);
  });
  await check('dense object diff over limit uses exact legacy fallback',async()=>{
    const before={creatorWorkspace:Object.fromEntries(Array.from({length:4097},(_,i)=>[`key${i}`,i]))};
    const after={creatorWorkspace:Object.fromEntries(Array.from({length:4097},(_,i)=>[`key${i}`,i+1]))};
    assert.equal(await scalar('select flowme_private.alpha_object_inverse_diff_v1($1::jsonb,$2::jsonb) as value',[JSON.stringify(after.creatorWorkspace),JSON.stringify(before.creatorWorkspace)]),null);
    assert.deepEqual(await scalar("select flowme_private.alpha_creator_inverse_v1($1::jsonb,$2::jsonb,'creatorWorkspace') as value",[JSON.stringify(before),JSON.stringify(after)]),{field:'creatorWorkspace',present:true,value:before.creatorWorkspace});
  });
  await check('small dense change uses size fallback',async()=>{
    assert.deepEqual(await scalar("select flowme_private.alpha_creator_inverse_v1($1::jsonb,$2::jsonb,'creatorWorkspace') as value",[JSON.stringify({creatorWorkspace:{x:1}}),JSON.stringify({creatorWorkspace:{x:2}})]),{field:'creatorWorkspace',present:true,value:{x:1}});
  });
  await check('applier late failure does not retain earlier patch or mark original undone',async()=>{const account=await current();const target=await scalar("select request_id as value from flowme_private.alpha_operations_v1 where (receipt->>'revision')::bigint=$1",[account.revision]);await db.query('update flowme_private.alpha_operations_v1 set inverse=$1::jsonb where request_id=$2',[JSON.stringify([envelope([{op:'set',path:['working','title'],value:'partial'},{op:'remove',path:['nonexistent']}])]),target]);const before=await snapshot();assert.equal((await execute(undoCommit('late-fail',account.revision,target))).ok,false);assert.deepEqual(await snapshot(),before);});
  await check('ledger insert failure rolls back earlier account update',async()=>{await db.exec("create function public.fixture_ledger_fail() returns trigger language plpgsql as $$ begin raise exception 'injected fixture'; end; $$; create trigger fixture_fail before insert on flowme_private.alpha_operations_v1 for each row execute function public.fixture_ledger_fail();");const before=await snapshot();assert.equal((await execute(await make('ledger-fail',{...w,title:'Should rollback'}))).reason,'unavailable');assert.deepEqual(await snapshot(),before);await db.exec('drop trigger fixture_fail on flowme_private.alpha_operations_v1');});
  await check('private compact helpers are not executable by authenticated',async()=>{for(const signature of ['flowme_private.alpha_object_inverse_diff_v1(jsonb,jsonb,text[])','flowme_private.alpha_object_inverse_apply_v1(jsonb,jsonb)','flowme_private.alpha_creator_inverse_v1(jsonb,jsonb,text)'])assert.equal(await scalar("select has_function_privilege('authenticated',$1,'execute') as value",[signature]),false);});
  await check('pg_catalog helpers are invoker empty search_path and PUBLIC/anon denied',async()=>{
    const rows=(await db.query("select p.oid,p.proname,p.prosecdef,p.proconfig,has_function_privilege('anon',p.oid,'execute') as anon_execute,exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE') as public_execute from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='flowme_private' and p.proname in ('alpha_object_inverse_diff_v1','alpha_object_inverse_apply_v1','alpha_creator_inverse_v1')")).rows;
    assert.equal(rows.length,3);for(const row of rows){assert.equal(row.prosecdef,false);assert.equal(row.anon_execute,false);assert.equal(row.public_execute,false);assert.ok(row.proconfig.includes('search_path=""'));}
  });
  await check('anon creator RPC execute denied exact 42501',async()=>{let code;try{await db.transaction(async tx=>{await tx.exec('set local role anon');await tx.query("select public.flowme_alpha_creator_execute_v1('{}','')");});}catch(error){code=error.code;}assert.equal(code,'42501');});
  await check('private ledger direct read denied SQLSTATE 42501',async()=>{let code;try{await asFixtureActor(db,claims,tx=>tx.query('select * from flowme_private.alpha_operations_v1'));}catch(e){code=e.code;}assert.equal(code,'42501');});
} catch(error){checks.push({name:'setup or fatal',passed:false,error:String(error.stack)});}
finally {await db.close();}
const result={kind:'WASM PostgreSQL actual migration integration; synthetic Auth/Storage stubs',checks,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,migrations,remoteDatabaseCalls:0,realAccounts:0,caveats:['No actual Supabase Auth/JWT verification or Storage API','Single connection: no concurrent lock timing coverage']};
await writeFile(resolve(runtimeDirectory,'compact-inverse-sql-result.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(result.failed)process.exitCode=1;
