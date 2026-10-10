// Local metadata comparison only. Never applies migrations to remote systems.
import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createInverseRuntime } from './m72-inverse-pg-runtime.mjs';

const root=resolve(import.meta.dirname,'../..');
const compact='20260923095533_flowme_alpha_m72_compact_creator_inverse.sql';
const output=resolve(root,'output/alpha-m72-dev-preflight',new Date().toISOString().replaceAll(':','-'),'local.json');
const privateNames=['alpha_creator_execute_v1','alpha_creator_commit_v1','alpha_account_shape_v1','alpha_json_v1','live_session_v1','alpha_preservation_read_v1','alpha_preservation_execute_v1','alpha_preservation_execute_v2','flowme_alpha_preservation_execute_v2','alpha_object_inverse_diff_v1','alpha_object_inverse_apply_v1','alpha_creator_inverse_v1'];
const publicNames=['flowme_alpha_creator_execute_v1','flowme_alpha_preservation_read_v1'];
const helpers=['alpha_object_inverse_diff_v1','alpha_object_inverse_apply_v1','alpha_creator_inverse_v1'];
const checks=[];const check=(name,condition)=>{assert(condition,name);checks.push({name,pass:true});};
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const hashes=async paths=>Object.fromEntries(await Promise.all(paths.map(async p=>[p,sha(await readFile(resolve(root,p)))])));
globalThis.fetch=async()=>{throw Error('network-forbidden');};
let db;
try{
 const names=(await readdir(resolve(root,'supabase/migrations'))).filter(n=>n.endsWith('.sql')).sort();
 const compactIndex=names.indexOf(compact);
 check('expected fourteen-migration compact checkpoint exists',compactIndex===13);
 const paths=['package.json','package-lock.json',...names.map(n=>`supabase/migrations/${n}`)];
 const beforeHashes=await hashes(paths);
 db=await createInverseRuntime();
 const metadata=async()=> (await db.query(`select n.nspname as schema,p.proname as name,
   pg_get_function_identity_arguments(p.oid) as arguments,md5(replace(p.prosrc,chr(13),'')) as body_md5,
   p.prosecdef as security_definer,p.proconfig as config,
   has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
   has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where (n.nspname='flowme_private' and p.proname=any($1::text[]))
      or (n.nspname='public' and p.proname=any($2::text[]))
   order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)`,[privateNames,publicNames])).rows;
 for(const name of names.slice(0,compactIndex))await db.exec(await readFile(resolve(root,'supabase/migrations',name),'utf8'));
 const before=await metadata();
 await db.exec(await readFile(resolve(root,'supabase/migrations',compact),'utf8'));
 const after=await metadata();
 const identity=row=>`${row.schema}.${row.name}(${row.arguments})`;
 const old=new Map(before.map(row=>[identity(row),row]));
 const added=after.filter(row=>!old.has(identity(row))),changed=[];
 check('three expected private helpers added',added.length===3&&added.every(row=>row.schema==='flowme_private'&&helpers.includes(row.name)));
 check('no existing function removed',before.every(row=>after.some(next=>identity(next)===identity(row))));
 for(const row of after){
  const previous=old.get(identity(row));if(!previous)continue;
  const{body_md5:oldBody,...oldMeta}=previous,{body_md5:newBody,...newMeta}=row;
  check(`existing metadata and grants unchanged: ${row.schema}.${row.name}`,JSON.stringify(oldMeta)===JSON.stringify(newMeta));
  if(oldBody!==newBody)changed.push(`${row.schema}.${row.name}`);
 }
 check('only creator writer body changed',JSON.stringify(changed)===JSON.stringify(['flowme_private.alpha_creator_execute_v1']));
 check('new helpers invoker and inaccessible to anon/authenticated',added.every(row=>!row.security_definer&&!row.anon_execute&&!row.authenticated_execute&&row.config?.some(v=>v==='search_path=""')));
 const missingTargets=privateNames.filter(name=>!after.some(row=>row.schema==='flowme_private'&&row.name===name)).map(name=>`flowme_private.${name}`);
 check('only requested v2 name alias is absent',JSON.stringify(missingTargets)===JSON.stringify(['flowme_private.alpha_preservation_execute_v2']));
 check('all local manifests and migrations unchanged',JSON.stringify(await hashes(paths))===JSON.stringify(beforeHashes));
 check('migration inventory unchanged',JSON.stringify((await readdir(resolve(root,'supabase/migrations'))).filter(n=>n.endsWith('.sql')).sort())===JSON.stringify(names));
 const result={pass:true,kind:'local-in-memory-migration-metadata-only',checks,before,after,addedFunctions:added.map(identity),changedBodies:changed,missingTargets,
  nameNote:'Requested private alpha_preservation_execute_v2 does not exist locally; actual flowme_alpha_preservation_execute_v2 included.',
  manifestHashes:Object.fromEntries(Object.entries(beforeHashes).filter(([p])=>!p.startsWith('supabase/'))),
  migrations:names.map(name=>({name,sha256:beforeHashes[`supabase/migrations/${name}`]})),
  localMigrationsUnchanged:true,remoteDatabaseCalls:0,realAccounts:0,credentialsRead:0,personalBackupsRead:0,
  excludedLaterMigrations:names.slice(compactIndex+1),
  limitations:['Historical compact checkpoint only; later migrations are not applied in this comparison','Auth/Storage bootstrap stubs; not remote state or live authorization verification','No remote migration application or approval implied']};
 await mkdir(resolve(output,'..'),{recursive:true});await writeFile(output,JSON.stringify(result,null,2),{flag:'wx'});
 console.log(JSON.stringify({result:output,checks:checks.length}));
}finally{if(db)await db.close();}
