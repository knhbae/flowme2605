import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Serialize already-executed CLI results, never launch a browser, server or API.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const directory = resolve(root, 'output/playwright/date-detail');
const expectedBuildId = (await readFile(resolve(root, '.next/BUILD_ID'), 'utf8')).trim();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = [
  ['core', 'app-core-final2-cli.log'],
  ['faults', 'app-faults-final-cli.log'],
  ['long-title', 'app-long-final2-cli.log'],
];
const reports = [];
for (const [phase, file] of files) {
  const bytes = await readFile(resolve(directory, file));
  const match = /### Result\r?\n([\s\S]*?)(?:\r?\n### |$)/.exec(bytes.toString('utf8'));
  if (!match) throw Error(`Missing actual CLI result: ${file}`);
  const report = JSON.parse(match[1].trim());
  if (report.schema !== 'flowme-date-detail-app-browser/1' || report.phase !== phase
    || report.expectedBuildId !== expectedBuildId || !Array.isArray(report.checks)) throw Error(`Result/build mismatch: ${file}`);
  const passed = report.checks.filter(check => check.pass).length;
  const failed = report.checks.filter(check => !check.pass).length + (report.failure && passed === report.checks.length ? 1 : 0);
  if (report.passed !== passed || report.failed !== failed) throw Error(`Result count mismatch: ${file}`);
  const record = { ...report, recordedAt: new Date().toISOString(), rawLog: file, rawSha256: sha(bytes) };
  await writeFile(resolve(directory, `app-${phase}-results.json`), `${JSON.stringify(record, null, 2)}\n`);
  reports.push(record);
}
const build = JSON.parse(await readFile(resolve(root, 'output/integrated-product-poc/build-latest.json'), 'utf8'));
const drift = [];
for (const { path, sha256 } of build.sourceHashes) {
  if (sha(await readFile(resolve(root, path))) !== sha256) drift.push(path);
}
const summary = { schema: 'flowme-date-detail-qa-summary/1', at: new Date().toISOString(), expectedBuildId,
  buildExitCode: build.verifiedExitCode, sourceDrift: drift,
  results: reports.map(report => ({ phase: report.phase, passed: report.passed, failed: report.failed, failure: report.failure,
    commandCount: report.commandCount, forwardedAuth: report.forwardedAuth, forwardedApi: report.forwardedApi,
    forbiddenStorageCalls: report.forbiddenStorageCalls.length, sentinelsExact: report.sentinelsExact, publicUnchanged: report.publicUnchanged,
    pageErrors: report.pageErrors.length, consoleErrors: report.consoleErrors.length, rawLog: report.rawLog, rawSha256: report.rawSha256,
    keypresses: report.viewports.flatMap(viewport => viewport.focus ?? []).length,
    documentOutsideTransitions: report.viewports.flatMap(viewport => viewport.focus ?? []).filter(value => value.documentOutsideTransition).length,
  })), actualDevice: false, observedUsers: 0, realBackendWrites: 0 };
await writeFile(resolve(directory, 'app-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
if (build.verifiedExitCode !== 0 || drift.length || reports.some(report => report.failed || report.failure
  || report.forbiddenStorageCalls.length || !report.sentinelsExact || !report.publicUnchanged
  || report.forwardedAuth || report.forwardedApi || report.prohibitedRequests.length
  || report.pageErrors.length || report.consoleErrors.length)) process.exitCode = 1;
