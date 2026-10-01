// Local-only release evidence. Read settings bytes only to hash them; never
// serialize settings, account payloads, credentials or catalog content.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { listProgramSourcePaths } from '../personal-workspace-poc/program-source-files.mjs';

const root=resolve(import.meta.dirname,'../..');
const previous='D:/flowme2605/flow-alpha-cloudflare-core-ux-20261001';
const settings='D:/flowme2605/flow-alpha-backup-5d-publish-20260929';
const pack='D:/flowme2605/flow-poc-merge-prep-20260920/lib/flow/integrated-poc/catalog-library-pack.v1.json';
const output=resolve(root,'output/alpha-writing-ux-dev-release');
const [mode,label]=process.argv.slice(2);
assert(['capture','assert-preserved','assert-source'].includes(mode));
assert(/^[a-z0-9-]{1,50}$/.test(label));assert.equal(process.argv.length,4);
const path=resolve(output,`${label}.json`);
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const preserved=[resolve(previous,'.next/BUILD_ID'),resolve(previous,'next.config.ts'),resolve(previous,'tsconfig.json'),
  resolve(settings,'.tmp/alpha-laptop-host.json'),resolve(settings,'.tmp/alpha-m3-server.json'),pack];
const source=()=>listProgramSourcePaths(root).map(path=>({path,sha256:hash(resolve(root,path))}));
if(mode==='capture'){
  assert(!existsSync(path),'do not overwrite release evidence');mkdirSync(output,{recursive:true});
  const rows=source();
  const evidence={recordedAt:new Date().toISOString(),root,head:git(['rev-parse','HEAD']),
    candidateBuild:readFileSync(resolve(root,'.next/BUILD_ID'),'utf8').trim(),
    previousRoot:previous,previousBuild:readFileSync(resolve(previous,'.next/BUILD_ID'),'utf8').trim(),
    preserved:preserved.map(path=>({path,sha256:hash(path)})),sourceHashes:rows,
    sourceSnapshotSha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
    meaning:'Local source/build and rollback file evidence. No Auth/DB or real-device validation.'};
  writeFileSync(path,JSON.stringify(evidence,null,2));
  console.log(JSON.stringify({label,head:evidence.head,candidateBuild:evidence.candidateBuild,
    previousBuild:evidence.previousBuild,sourceCount:rows.length,preservedCount:evidence.preserved.length,
    sourceSnapshotSha256:evidence.sourceSnapshotSha256,localEvidence:relative(root,path)}));
}else{
  const baseline=JSON.parse(readFileSync(path,'utf8'));
  assert.equal(baseline.root,root);assert.equal(baseline.previousRoot,previous);
  if(mode==='assert-preserved'){
    assert.deepEqual(baseline.preserved.map(row=>row.path),preserved);
    assert.deepEqual(baseline.preserved,preserved.map(path=>({path,sha256:hash(path)})));
    console.log(JSON.stringify({label,preserved:preserved.length,drift:0}));
  }else{
    assert.deepEqual(baseline.sourceHashes,source());
    assert.equal(baseline.candidateBuild,readFileSync(resolve(root,'.next/BUILD_ID'),'utf8').trim());
    console.log(JSON.stringify({label,sourceCount:baseline.sourceHashes.length,drift:0,buildUnchanged:true}));
  }
}
