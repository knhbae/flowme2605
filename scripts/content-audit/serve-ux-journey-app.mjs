import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const osKeys = new Set(['PATH','SYSTEMROOT','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC']);
// Synthetic config only; fixture intercepts ALL Auth/API requests before navigation.
// This cannot inherit real keys, catalog packs, hosting opt-ins or account files.
const env = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => osKeys.has(key.toUpperCase()))),
  NODE_ENV:'production', NEXT_TELEMETRY_DISABLED:'1', FLOWME_ALPHA_ENABLED:'development-only', FLOWME_ALPHA_STAGE:'preview',
  FLOWME_ALPHA_HOSTING:'cloudflare-laptop-v1', FLOWME_ALPHA_TUNNEL_ORIGIN:'https://alpha.wikiplans.com',
  FLOWME_ALPHA_PROJECT_REF:'wkmzcxpnojobxrgebapw', FLOWME_ALPHA_SUPABASE_URL:'https://wkmzcxpnojobxrgebapw.supabase.co',
  FLOWME_ALPHA_PUBLISHABLE_KEY:'sb_publishable_ux_journey_synthetic', FLOWME_ALPHA_REDIRECT_URL:'https://alpha.wikiplans.com/auth/callback',
  FLOWME_ALPHA_M3_CAPACITY:'on-demand-v1', FLOWME_ALPHA_M3_SIGNING_KEY:'0'.repeat(64) };
const child = spawn(process.execPath, [resolve('node_modules/next/dist/bin/next'),'start','-H','127.0.0.1','-p','3106'],
  {cwd:process.cwd(),env,stdio:'inherit',windowsHide:true});
process.stdout.write(`synthetic UX QA launcher ${process.pid}, child ${child.pid}, port3106\n`);
child.once('exit', code => { process.exitCode = code ?? 1; });
child.once('error', () => { process.exitCode = 1; });
process.once('SIGINT', () => child.kill('SIGINT'));
process.once('SIGTERM', () => child.kill('SIGTERM'));
