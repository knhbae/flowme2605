import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { readAlphaAuthConfig } from '../../lib/flow/integrated-poc/alpha-auth/config';

const file = resolve('.tmp/alpha-development.json');
const mode = process.argv.includes('--start') ? 'start' : 'dev';
let values: Record<string,string>;
try { values = JSON.parse(readFileSync(file, 'utf8')); } catch { throw Error('Create .tmp/alpha-development.json using the M2 development setup guide. No server started.'); }
const config = readAlphaAuthConfig({ ...values, VERCEL_ENV: process.env.VERCEL_ENV });
if (!config || config.redirectUrl !== 'http://localhost:3104/auth/callback') throw Error('M2 development environment rejected. No server started.');
const allow = Object.fromEntries(Object.entries(values).filter(([key]) => key.startsWith('FLOWME_ALPHA_')));
const keyPath = resolve('.tmp/alpha-m3-server.json');
if (existsSync(keyPath)) {
  const key = JSON.parse(readFileSync(keyPath, 'utf8')).FLOWME_ALPHA_M3_SIGNING_KEY;
  if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key)) throw Error('M3 server signing key rejected. No server started.');
  allow.FLOWME_ALPHA_M3_SIGNING_KEY = key;
}
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', mode, '-p', '3104', '-H', '127.0.0.1'], {
  cwd: process.cwd(), env: { ...process.env, ...allow }, stdio: 'inherit', windowsHide: true,
});
child.on('exit', code => { process.exitCode = code ?? 1; });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
