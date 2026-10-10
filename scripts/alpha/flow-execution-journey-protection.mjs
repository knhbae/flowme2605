import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { listProgramSourcePaths } from '../personal-workspace-poc/program-source-files.mjs';
const mode=process.argv[2]; if(!['before','after'].includes(mode)) throw Error('Use before/after');
const root=resolve('.'), running='D:/flowme2605/flow-folder-content-ux-20261001';
const directory=resolve(root,'output/playwright/flow-execution-journey-protection'); mkdirSync(directory,{recursive:true});
const hash=path=>existsSync(path)?createHash('sha256').update(readFileSync(path)).digest('hex'):null;
function visit(path) { return readdirSync(path,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?visit(resolve(path,entry.name)):entry.isFile()?[resolve(path,entry.name)]:[]); }
const source=listProgramSourcePaths(running).map(path=>({path,sha256:hash(resolve(running,path))}));
const assets=visit(resolve(running,'.next/static')).map(path=>({path:path.slice(running.length+1).replaceAll('\\','/'),sha256:hash(path)}));
const protectedPaths=[
  'D:/flowme2605/flow-mvp/docs/content-audit/2026-09-28-flowme-use-feedback-session-ko.md',
  'D:/flowme2605/flow-poc-merge-prep-20260920/lib/flow/integrated-poc/catalog-library-pack.v1.json',
  `${running}/.env.local`,`${running}/.next/BUILD_ID`,
  'D:/flowme2605/flow-alpha-backup-5d-publish-20260929/.tmp/cloudflared/config.yml',
  'D:/flowme2605/flow-alpha-backup-5d-publish-20260929/.tmp/cloudflared/settings.json',
];
const git=path=>({head:execFileSync('git',['rev-parse','HEAD'],{cwd:path,encoding:'utf8'}).trim(),status:execFileSync('git',['status','--porcelain=v1'],{cwd:path,encoding:'utf8'})});
const snapshot={at:new Date().toISOString(),runningGit:git(running),originalGit:git('D:/flowme2605/flow-mvp'),
  source,assets,protected:protectedPaths.map(path=>({path,sha256:hash(path)}))};
const file=resolve(directory,`${mode}.json`); writeFileSync(file,JSON.stringify(snapshot,null,2));
if(mode==='before') console.log(JSON.stringify({mode,source:source.length,assets:assets.length,protected:snapshot.protected.length}));
else {
  const before=JSON.parse(readFileSync(resolve(directory,'before.json'),'utf8'));
  const unchanged=['runningGit','originalGit','source','assets','protected'].map(key=>({scope:key,unchanged:JSON.stringify(before[key])===JSON.stringify(snapshot[key])}));
  // Preserve the original before snapshot: three entries were absent paths,
  // not hashes of actual settings. Compare the actual two settings to the
  // previous release's already-recorded bytes rather than inventing a baseline.
  const previous=JSON.parse(readFileSync('D:/flowme2605/flow-folder-content-ux-20261001/output/folder-content-dev-release/prepublish.json','utf8'));
  const actualSettings=[['host-settings','alpha-laptop-host.json'],['signing-settings','alpha-m3-server.json']].map(([label,file])=>({label,
    unchanged:previous.protected.find(item=>item.label===label)?.sha256===hash(`D:/flowme2605/flow-alpha-backup-5d-publish-20260929/.tmp/${file}`)}));
  writeFileSync(resolve(directory,'result.json'),JSON.stringify({started:before.at,ended:snapshot.at,unchanged,
    protectedExistingFiles:before.protected.filter(item=>item.sha256!==null).length,protectedAbsentPaths:before.protected.filter(item=>item.sha256===null).length,
    actualSettingsBasis:previous.recordedAt,actualSettings,scope:'Local files and Git bytes only; not a full database snapshot'},null,2));
  console.log(JSON.stringify({mode,unchanged,actualSettingsBasis:previous.recordedAt,actualSettings}));
  if(unchanged.some(item=>!item.unchanged)||actualSettings.some(item=>!item.unchanged)) process.exitCode=1;
}
