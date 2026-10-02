import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listProgramSourcePaths } from '../personal-workspace-poc/program-source-files.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const live='D:/flowme2605/flow-folder-content-ux-20261001';
const original='D:/flowme2605/flow-mvp';
const output=resolve(root,'output/playwright/feedback-ux-protection-20261002');
const mode=process.argv[2];if(!['before','after'].includes(mode))throw Error('Use before/after');
mkdirSync(output,{recursive:true});
const hash=p=>existsSync(p)?createHash('sha256').update(readFileSync(p)).digest('hex'):null;
const git=p=>({head:execFileSync('git',['rev-parse','HEAD'],{cwd:p,encoding:'utf8'}).trim(),status:execFileSync('git',['status','--porcelain=v1'],{cwd:p,encoding:'utf8'})});
const files=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(resolve(p,e.name)):e.isFile()?[resolve(p,e.name)]:[]);
const protectedPaths=[`${original}/docs/content-audit/2026-09-28-flowme-use-feedback-session-ko.md`,
  'D:/flowme2605/flow-poc-merge-prep-20260920/lib/flow/integrated-poc/catalog-library-pack.v1.json',
  `${live}/.env.local`,`${live}/.next/BUILD_ID`,
  'D:/flowme2605/flow-alpha-backup-5d-publish-20260929/.tmp/alpha-laptop-host.json',
  'D:/flowme2605/flow-alpha-backup-5d-publish-20260929/.tmp/alpha-m3-server.json',
  'D:/flowme2605/flow-alpha-backup-5d-publish-20260929/.tmp/cloudflared/flowme-alpha-laptop.yml'];
const snapshot={at:new Date().toISOString(),liveGit:git(live),originalGit:git(original),
  source:listProgramSourcePaths(live).map(path=>({path,sha256:hash(resolve(live,path))})),
  assets:files(resolve(live,'.next/static')).map(path=>({path:path.slice(live.length+1).replaceAll('\\','/'),sha256:hash(path)})),
  protected:protectedPaths.map(path=>({path,sha256:hash(path)})),
  candidateBefore:listProgramSourcePaths(root).map(path=>({path,sha256:hash(resolve(root,path))}))};
const target=resolve(output,`${mode}.json`);
if(mode==='before'&&existsSync(target))throw Error('Preserve existing baseline');
writeFileSync(target,JSON.stringify(snapshot,null,2));
if(mode==='before')console.log(JSON.stringify({at:snapshot.at,source:snapshot.source.length,assets:snapshot.assets.length,protected:snapshot.protected.length,candidate:snapshot.candidateBefore.length}));
else{
  const before=JSON.parse(readFileSync(resolve(output,'before.json'),'utf8'));
  const unchanged=['liveGit','originalGit','source','assets','protected'].map(key=>({scope:key,unchanged:JSON.stringify(before[key])===JSON.stringify(snapshot[key])}));
  const result={started:before.at,ended:snapshot.at,unchanged,scope:'Local file/Git hashes and synthetic sentinels; not a database snapshot'};
  writeFileSync(resolve(output,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  if(unchanged.some(x=>!x.unchanged))process.exitCode=1;
}
