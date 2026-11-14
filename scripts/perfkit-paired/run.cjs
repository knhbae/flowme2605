'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process'), crypto = require('crypto'), os = require('os');
const { summarize, requireAaBound } = require('./protocol.cjs');
const args = process.argv.slice(2), option = key => args[args.indexOf('--' + key) + 1];
const root = process.env.FLOWME_PERF_OWNER_ROOT, mode = option('mode'), out = option('out');
if (!root || !out?.replaceAll('\\', '/').startsWith(root + '/perf/runs/') || !['aa', 'compare'].includes(mode)) throw Error('EXPLICIT_OWNED_RUN_REQUIRED');
if (fs.existsSync(out)) throw Error('SINGLE_USE_OUTPUT'); fs.mkdirSync(out, { recursive: true });
const read = p => JSON.parse(fs.readFileSync(p)), hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const pause = ms => new Promise(done => setTimeout(done, ms));
const cpu = () => os.cpus().reduce((all, core) => [all[0] + core.times.idle, all[1] + Object.values(core.times).reduce((a, b) => a + b, 0)], [0, 0]);
async function windowCPU() { const a = cpu(); await pause(1000); const b = cpu(); return Math.round(100 * (1 - (b[0] - a[0]) / (b[1] - a[1]))); }
async function quiet() { const started = Date.now(), samples = []; let good = 0;
  while (Date.now() - started < 600000) { const value = await windowCPU(); samples.push(value); good = value <= 35 ? good + 1 : 0; if (good === 3) return { pass: true, samples, waitedMs: Date.now() - started }; }
  return { pass: false, samples, waitedMs: Date.now() - started };
}
const planFile = option('plan'), ready = option('ready'), aaFile = mode === 'compare' ? option('aa-summary') : null;
if (!planFile?.startsWith(root + '/') || !ready?.startsWith(root + '/inputs/') || mode === 'compare' && !aaFile?.startsWith(root + '/perf/runs/')) throw Error('EXPLICIT_PLAN_AND_READY_REQUIRED');
const plan = read(planFile), source = ['measure.cjs', 'probe.js', 'protocol.cjs', 'run.cjs'].map(name => ({ name, sha256: hash(__dirname + '/' + name) }));
if (hash(plan.fixture.path) !== plan.fixture.sha256) throw Error('FIXTURE_PIN_CHANGED');
if (!Array.isArray(plan.preloads) || plan.preloads.length !== 2 || plan.preloads.some(pin => !pin.path.startsWith(root + '/scripts/') || hash(pin.path) !== pin.sha256)) throw Error('OWNED_PRELOAD_PIN_CHANGED');
const experimentIdentity = crypto.createHash('sha256').update(JSON.stringify({ baseline: plan.baseline, fixture: plan.fixture, protocol: plan.protocol, preloads: plan.preloads })).digest('hex');
if (mode === 'compare') requireAaBound(read(aaFile), source, experimentIdentity);
const log = value => { fs.appendFileSync(out + '/runs.txt', value + '\n'); console.log(value); };
async function block(role, tag) {
  const disk = fs.statfsSync('D:/'); if (Number(disk.bavail) * Number(disk.bsize) < 5000000000) throw Error('HOLD_D_FLOOR');
  const before = await quiet(); if (!before.pass) throw Error('HOLD_BUSY_BEFORE_BLOCK');
  const env = {};
  for (const key of ['SystemRoot', 'WINDIR', 'SystemDrive', 'ComSpec', 'PATHEXT', 'OS', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA']) if (process.env[key]) env[key] = process.env[key];
  Object.assign(env, { PATH: path.dirname(process.execPath) + ';' + env.SystemRoot + '/System32', TEMP: plan.browserTemp.root, TMP: plan.browserTemp.root,
    NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', FLOWME_PERF_OWNER_ROOT: root, NEXT_QA_LOG_ROOT: out,
    QA_VARIANT_READY: ready, QA_VARIANT_SHA: hash(ready), PERFKIT_FIXTURE: plan.fixture.path, PERFKIT_OUT: out,
    NODE_OPTIONS: plan.preloads.map(pin => '--require=' + pin.path).join(' ') });
  const at = Date.now(), result = cp.spawnSync(process.execPath, [__dirname + '/measure.cjs', role === 'base' ? '3000' : '3104', tag, 'full', 'none', '6'],
    { cwd: root, env, windowsHide: true, encoding: 'utf8', maxBuffer: 4000000, timeout: 900000 });
  fs.writeFileSync(out + '/' + tag + '.stdout', result.stdout ?? '', { flag: 'wx' });
  fs.writeFileSync(out + '/' + tag + '.stderr', result.stderr ?? '', { flag: 'wx' });
  const afterSamples = [await windowCPU(), await windowCPU()], after = Math.round((afterSamples[0] + afterSamples[1]) / 2);
  if (result.status !== 0 || !fs.existsSync(out + '/' + tag + '.json')) throw Error('BLOCK_FAILED_' + tag);
  const value = read(out + '/' + tag + '.json');
  value.machine = { valid: before.pass && afterSamples.every(value => value <= 35) && value.valid && value.typedOk && value.errors.length === 0 && value.outside.length === 0, quietBefore: before, afterClose: after, afterCloseSamples: afterSamples };
  value.role = role; value.wallMs = Date.now() - at;
  fs.writeFileSync(out + '/' + tag + '.bound.json', JSON.stringify(value, null, 1), { flag: 'wx' });
  log(JSON.stringify({ tag, role, valid: value.machine.valid, before: before.samples.slice(-3), afterClose: after, ms: Object.fromEntries(Object.entries(value.summary).map(([key, v]) => [key, v.median])) }));
  return value;
}
(async () => {
  const metadata = { mode, baseline: plan.baseline, candidate: read(ready), sameNaturalDefaultOn: true, warmupsPerRole: 1,
    wantedPairs: 3, maximumPairAttempts: 5, inputMethod: 'original perfkit-284 native sequence, key to second rAF, 120ms spacing',
    validity: 'same seed, no initial worker/ACK backlog, external CPU <=35%, A/A absolute change <=5%', plan: { path: planFile, sha256: hash(planFile) }, ready: { path: ready, sha256: hash(ready) }, aaSummary: aaFile ? { path: aaFile, sha256: hash(aaFile) } : null, source, experimentIdentity };
  fs.writeFileSync(out + '/PLAN.json', JSON.stringify(metadata, null, 2), { flag: 'wx' });
  // Warmups are specified before any result is seen; their raw evidence remains unscored.
  await block('cand', 'warmup-cand'); await block('base', 'warmup-base');
  const pairs = [];
  for (let attempt = 1; attempt <= 5 && pairs.filter(pair => pair.base.machine.valid && pair.cand.machine.valid).length < 3; attempt++) {
    const order = attempt % 2 ? ['cand', 'base'] : ['base', 'cand'], pair = { order, attempt };
    for (const role of order) pair[role] = await block(role, `pair-${attempt}-${role}`);
    pairs.push(pair); fs.writeFileSync(out + `/PAIR-${attempt}.json`, JSON.stringify({ order, attempt, valid: pair.base.machine.valid && pair.cand.machine.valid,
      base: `pair-${attempt}-base.bound.json`, cand: `pair-${attempt}-cand.bound.json` }, null, 2), { flag: 'wx' });
  }
  const result = summarize(pairs, { aa: mode === 'aa' });
  result.mode = mode; result.source = metadata.source; result.experimentIdentity = experimentIdentity;
  fs.writeFileSync(out + '/SUMMARY.json', JSON.stringify(result, null, 2), { flag: 'wx' }); log(JSON.stringify(result));
  if (result.verdict !== 'PASS') process.exitCode = 2;
})().catch(error => { fs.writeFileSync(out + '/FAILURE.json', JSON.stringify({ reason: error.message, stack: error.stack }), { flag: 'wx' }); console.error(error.stack); process.exitCode = 2; });
