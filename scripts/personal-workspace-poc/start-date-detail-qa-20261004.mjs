import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const buildId = readFileSync(resolve(root, '.next/BUILD_ID'), 'utf8').trim();
const osEnv = Object.fromEntries(['SystemRoot','WINDIR','TEMP','TMP','PATH','PATHEXT','ComSpec','USERPROFILE','APPDATA','LOCALAPPDATA','ProgramFiles','ProgramFiles(x86)']
  .filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
// Separate listener, no .env or real credentials; every browser Auth/API request is mocked.
const env = { ...osEnv, NODE_ENV:'production', NEXT_TELEMETRY_DISABLED:'1',
  FLOWME_ALPHA_ENABLED:'development-only', FLOWME_ALPHA_STAGE:'preview',
  FLOWME_ALPHA_PROJECT_REF:'wkmzcxpnojobxrgebapw',
  FLOWME_ALPHA_SUPABASE_URL:'https://wkmzcxpnojobxrgebapw.supabase.co',
  FLOWME_ALPHA_PUBLISHABLE_KEY:'sb_publishable_synthetic_date_detail',
  FLOWME_ALPHA_REDIRECT_URL:'https://alpha.wikiplans.com/auth/callback',
  FLOWME_ALPHA_HOSTING:'cloudflare-laptop-v1', FLOWME_ALPHA_TUNNEL_ORIGIN:'https://alpha.wikiplans.com',
  FLOWME_ALPHA_M3_CAPACITY:'on-demand-v1' };
const child = spawn(process.execPath,[resolve(root,'node_modules/next/dist/bin/next'),'start','-p','3115','-H','127.0.0.1'],
  {cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
console.log(JSON.stringify({scope:'synthetic-date-detail-qa-only',root,buildId,port:3115,pid:child.pid,realCredentials:false}));
child.stdout.pipe(process.stdout); child.stderr.pipe(process.stderr);
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('close',code=>{process.exitCode=code??1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(!child.killed)child.kill();});
