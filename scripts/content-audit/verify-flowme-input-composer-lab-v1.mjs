import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const spec = path.join(repo, 'docs/specs/2026-07-20-flowme-input-composer-lab-v1');
const report = path.join(repo, 'docs/content-audit/2026-07-20-flowme-input-composer-lab-v1-ko.html');
const required = [
  'spec.md',
  'plan.md',
  'tasks.md',
  'qa.md',
  'design-system.md',
  'concept-desktop.png',
  'input-composer-contract-v1.json',
  'input-composer-scenarios-v1.schema.json',
  'input-composer-scenarios-v1.json',
  'input-composer-metrics-v1.json',
  'build-input-composer-lab-v1.mjs',
  'build-input-composer-report-v1.mjs',
  'validate-input-composer-v1.mjs',
  'validate-input-composer-v1.test.mjs'
].map((name) => path.join(spec, name)).concat(report);

for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing required artifact: ${path.relative(repo, file)}`);
}

run(path.join(spec, 'build-input-composer-lab-v1.mjs'));
run(path.join(spec, 'build-input-composer-report-v1.mjs'));
run(path.join(spec, 'validate-input-composer-v1.mjs'), ['--html', report]);
run(process.execPath, ['--test', path.join(spec, 'validate-input-composer-v1.test.mjs')], true);

const document = JSON.parse(fs.readFileSync(path.join(spec, 'input-composer-scenarios-v1.json'), 'utf8'));
const html = fs.readFileSync(report, 'utf8');
const inlineScripts = [...html.matchAll(/<script(?![^>]*application\/json)[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
new vm.Script(inlineScripts.at(-1), { filename: 'input-composer-inline.js' });

if (document.metrics.caseCount !== 8) throw new Error('Expected 8 cases');
if (document.metrics.routeCoverage !== 4) throw new Error('Expected all 4 input routes');
if (document.metrics.generalRequiredPayloadMax > 2) throw new Error('Required payload budget exceeded');
if (document.metrics.meaningRetentionRate !== 1) throw new Error('Meaning retention must be 100%');
for (const key of ['unnecessaryInputCount', 'sourceValueReentryCount', 'unscheduledIcsViolationCount', 'inventedActionCount', 'creatorUserPathCollisionCount', 'blockedFakeArtifactCount', 'internalVisibleTokenLeakCount']) {
  if (document.metrics[key] !== 0) throw new Error(`${key} must be zero`);
}

console.log('PASS FlowMe Input Composer Lab v1');
console.log('8 cases · 4 routes · max 2 required inputs · 100% meaning retention');
console.log('0 unnecessary inputs · 0 source re-entry · 0 unscheduled ICS · 0 invented actions');
console.log('Claim boundary: automated/agent QA only; observed-user validation is not complete.');

function run(file, args = [], fileIsNode = false) {
  const executable = fileIsNode ? file : process.execPath;
  const finalArgs = fileIsNode ? args : [file, ...args];
  const output = execFileSync(executable, finalArgs, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (output.trim()) console.log(output.trim());
}
