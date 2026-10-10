// Local synthetic QA only. Never loads deployment settings or account secrets.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { listProgramSourcePaths } from './program-source-files.mjs';

const root = resolve(import.meta.dirname, '../..');
const output = resolve(root, 'output/folder-content-entry');
const live = 'D:/flowme2605/flow-ux-journey-20261001';
const settings = 'D:/flowme2605/flow-alpha-backup-5d-publish-20260929';
const protectedPaths = [resolve(live, '.next/BUILD_ID'), resolve(live, 'next.config.ts'), resolve(live, 'tsconfig.json'),
  resolve(settings, '.tmp/alpha-laptop-host.json'), resolve(settings, '.tmp/alpha-m3-server.json'),
  'D:/flowme2605/flow-poc-merge-prep-20260920/lib/flow/integrated-poc/catalog-library-pack.v1.json',
  'D:/flowme2605/flow-mvp/docs/content-audit/2026-09-28-flowme-use-feedback-session-ko.md'];
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const protectedRows = () => protectedPaths.map(path => ({ path, sha256: hash(path) }));
const sourceRows = () => listProgramSourcePaths(root).map(path => ({ path, sha256: hash(resolve(root, path)) }));
const writeEvidence = (label, value) => {
  assert(/^[a-z0-9-]{1,40}$/.test(label));
  mkdirSync(output, { recursive: true });
  const path = resolve(output, `${label}.json`);
  assert(!existsSync(path), 'Evidence is append-only; choose a new label.');
  writeFileSync(path, JSON.stringify(value, null, 2));
};
const [mode, label] = process.argv.slice(2);
if (mode === 'protect') {
  writeEvidence(label, { root, recordedAt: new Date().toISOString(), protected: protectedRows() });
  console.log(JSON.stringify({ label, protectedCount: protectedPaths.length }));
} else if (mode === 'assert-protected') {
  const baseline = JSON.parse(readFileSync(resolve(output, `${label}.json`), 'utf8'));
  assert.equal(baseline.root, root); assert.deepEqual(baseline.protected, protectedRows());
  console.log(JSON.stringify({ label, protectedCount: protectedPaths.length, drift: 0 }));
} else if (mode === 'freeze') {
  const source = sourceRows();
  const snapshot = createHash('sha256').update(JSON.stringify(source)).digest('hex');
  writeEvidence(label, { root, recordedAt: new Date().toISOString(), source, snapshot });
  console.log(JSON.stringify({ label, sourceCount: source.length, snapshot }));
} else if (mode === 'assert-source') {
  const baseline = JSON.parse(readFileSync(resolve(output, `${label}.json`), 'utf8'));
  assert.equal(baseline.root, root); assert.deepEqual(baseline.source, sourceRows());
  console.log(JSON.stringify({ label, sourceCount: baseline.source.length, drift: 0 }));
} else if (mode === 'app') {
  // Inherit operating-system execution paths only. No .env, real tokens, signing
  // keys, actual account pack, backend writer, or hosting launcher is involved.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|LOCALAPPDATA|APPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH)$/i.test(key)));
  Object.assign(env, { NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
    FLOWME_ALPHA_ENABLED: 'development-only', FLOWME_ALPHA_STAGE: 'preview',
    FLOWME_ALPHA_PROJECT_REF: 'wkmzcxpnojobxrgebapw',
    FLOWME_ALPHA_SUPABASE_URL: 'https://wkmzcxpnojobxrgebapw.supabase.co',
    FLOWME_ALPHA_PUBLISHABLE_KEY: 'sb_publishable_m2_ui_fixture',
    FLOWME_ALPHA_REDIRECT_URL: 'https://alpha.wikiplans.com/auth/callback',
    FLOWME_ALPHA_HOSTING: 'cloudflare-laptop-v1', FLOWME_ALPHA_TUNNEL_ORIGIN: 'https://alpha.wikiplans.com',
    FLOWME_ALPHA_M3_CAPACITY: 'on-demand-v1' });
  const child = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'start', '-p', '3106', '-H', '127.0.0.1'],
    { cwd: root, env, windowsHide: true, stdio: 'inherit' });
  writeEvidence(label, { root, startedAt: new Date().toISOString(), parentPid: process.pid, childPid: child.pid,
    port: 3106, build: readFileSync(resolve(root, '.next/BUILD_ID'), 'utf8').trim(), synthetic: true });
  console.log(JSON.stringify({ parentPid: process.pid, childPid: child.pid, port: 3106, synthetic: true }));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill());
  child.on('exit', code => { process.exitCode = code ?? 1; });
} else if (mode === 'artifact') {
  // Normal loopback HTTP render QA for the downloadable file; only two owned
  // HTML paths are exposed, never a directory or any deployment/account files.
  const paths = new Map([
    ['/prototype', 'docs/content-audit/2026-10-01-flowme-folder-content-entry-prototype-ko.html'],
    ['/report', 'docs/content-audit/2026-10-01-flowme-folder-content-entry-report-ko.html'],
  ]);
  const server = createServer((req, res) => {
    const path = paths.get(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
    if (req.method !== 'GET' || !path) { res.writeHead(404); res.end(); return; }
    try { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(readFileSync(resolve(root, path))); }
    catch { res.writeHead(404); res.end(); }
  });
  server.listen(3114, '127.0.0.1', () => console.log(JSON.stringify({ root, pid: process.pid, port: 3114, synthetic: true })));
} else throw Error('Unknown QA mode.');
