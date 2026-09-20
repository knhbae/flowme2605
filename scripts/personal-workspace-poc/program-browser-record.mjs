import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [session, script, label, arm] = process.argv.slice(2);
if (![session, label].every(value => typeof value === 'string' && /^[a-z0-9-]+$/.test(value))
  || typeof script !== 'string' || !/^program-[a-z0-9-]+\.cli\.js$/.test(script)) throw Error('session script label required');
if (arm !== undefined && arm !== '--arm') throw Error('optional fourth argument must be --arm');
const scriptPath = resolve(root, 'scripts/personal-workspace-poc', script);
const scriptSource = readFileSync(scriptPath, 'utf8');
const directory = resolve(root, 'output/playwright/integrated-program'); mkdirSync(directory, { recursive: true });
const at = new Date().toISOString(), stem = `${label}-${at.replace(/[:.]/g, '-')}`;
const build = JSON.parse(readFileSync(resolve(root, 'output/integrated-product-poc/build-latest.json'), 'utf8'));
const buildId = readFileSync(resolve(root, '.next/BUILD_ID'), 'utf8').trim();
const expectedRouteChunk = JSON.parse(readFileSync(resolve(root, '.next/app-build-manifest.json'), 'utf8')).pages['/my/page'].find(path => path.includes('/app/my/page-'));
const commandFile = resolve(directory, `${stem}.cli.js`);
// Hydration may consume __next_f. The document's own inline Flight payloads
// remain authoritative; parse JSON only, never execute script text or infer HEAD.
const buildReader = `() => {
  const entries = [...(self.__next_f ?? [])], prefix = 'self.__next_f.push(';
  for (const script of document.scripts) {
    const source = script.textContent.trim().replace(/;$/, '');
    if (!source.startsWith(prefix) || !source.endsWith(')')) continue;
    try { const entry = JSON.parse(source.slice(prefix.length, -1)); if (Array.isArray(entry)) entries.push(entry); } catch {}
  }
  const ids = new Set(entries.flatMap(entry => typeof entry[1] === 'string' ? entry[1].split('\\n') : []).filter(line => line.startsWith('0:{')).map(line => { try { return JSON.parse(line.slice(2)).b; } catch { return null; } }).filter(id => typeof id === 'string'));
  return ids.size === 1 ? [...ids][0] : null;
}`;
// New runners require explicit arming and verify this build before mutation.
// Existing single-argument runners retain their execution contract.
const proof = { ARM: arm === '--arm', buildId, routeChunk: expectedRouteChunk };
function matchesRouteAsset(value, expectedRouteChunk) {
  if (typeof value !== 'string' || !value || !expectedRouteChunk) return false;
  try { return new URL(value).pathname === `/_next/${expectedRouteChunk}`; }
  catch { return false; }
}
writeFileSync(commandFile, `async page => { const result = await (${scriptSource})(page, ${JSON.stringify(proof)}); result.documentBuildId = await page.evaluate(${buildReader}); return result; }`, { flag: 'wx' });
const command = `npx.cmd --no-install @playwright/cli -s=${session} run-code --filename=${commandFile}`;
const chunks = [];
// A reviewed already-installed CLI can be used without registry resolution or
// installing a newer package. This affects only QA tooling, not app dependencies.
const cliScript = process.env.FLOWME_PLAYWRIGHT_CLI_JS;
if (cliScript && (!isAbsolute(cliScript) || !cliScript.endsWith('playwright-cli.js'))) throw Error('Expected absolute reviewed Playwright CLI script');
const child = spawn(cliScript ? process.execPath : process.env.ComSpec || 'cmd.exe', cliScript ? [cliScript, `-s=${session}`, 'run-code', `--filename=${commandFile}`] : ['/d', '/s', '/c', command], {
  cwd: directory, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NO_COLOR: '1' },
});
for (const stream of [child.stdout, child.stderr]) stream.on('data', bytes => chunks.push(bytes));
child.on('error', error => chunks.push(Buffer.from(String(error))));
child.on('close', code => {
  const raw = Buffer.concat(chunks).toString('utf8'); writeFileSync(resolve(directory, `${stem}.log`), raw);
  const clean = raw.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
  const match = /### Result\r?\n([\s\S]*?)(?:\r?\n### |$)/.exec(clean);
  let result; try { result = match ? JSON.parse(match[1].trim()) : null; } catch { result = null; }
  const runtimeMatchesBuild = result?.documentBuildId === buildId && !!expectedRouteChunk && result?.runtimeAssets?.some(url => matchesRouteAsset(url, expectedRouteChunk)) === true;
  const reportedFailure = [result?.errors, result?.pageErrors, result?.consoleErrors, result?.storage?.errors, result?.storage?.outsidePrefix, result?.boundary?.violations]
    .some(value => Array.isArray(value) && value.length > 0) || result?.storage?.byteIdentical === false || result?.boundary?.byteIdentical === false;
  const record = { at, ended: new Date().toISOString(), script, session, proof, exitCode: code, buildId, expectedRouteChunk, runtimeMatchesBuild, reportedFailure, buildStarted: build.started,
    buildEnded: build.ended, buildLog: build.log, result, log: `${stem}.log` };
  writeFileSync(resolve(directory, `${stem}.json`), JSON.stringify(record, null, 2));
  console.log(JSON.stringify({ file: `${stem}.json`, exitCode: code, stage: result?.stage ?? 'no-parsed-result',
    runtimeMatchesBuild, checks: result?.checks?.length, errors: result?.errors, ids: result?.ids, outsidePrefix: result?.storage?.outsidePrefix?.length }, null, 2));
  process.exitCode = code || (result?.stage === 'complete' && runtimeMatchesBuild && !reportedFailure ? 0 : 1);
});
