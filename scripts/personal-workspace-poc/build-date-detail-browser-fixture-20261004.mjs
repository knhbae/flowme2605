import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// Generate CLI callbacks, never start a server or browser. The existing fixture
// supplies synthetic auth/account routes and denies external application writes.
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outputDirectory = resolve(repo, 'output/playwright/date-detail');
const entry = resolve(repo, 'scripts/personal-workspace-poc/memo-date-browser-fixture-20261004.ts');
const source = await readFile(resolve(repo, 'scripts/personal-workspace-poc/qa-date-detail-app-20261004.js'), 'utf8');
const expectedBuildId = (await readFile(resolve(repo, '.next/BUILD_ID'), 'utf8')).trim();
if (!expectedBuildId || /\s/.test(expectedBuildId)) throw Error('date-detail-build-id-missing');
const result = await build({ entryPoints: [entry], absWorkingDir: repo, bundle: true,
  platform: 'browser', format: 'iife', globalName: 'MemoDateFixture', target: 'es2022',
  write: false, metafile: true, legalComments: 'none', minify: true });
const bundle = result.outputFiles[0].text;
const external = Object.values(result.metafile.outputs).flatMap(value => value.imports);
if (external.length || /\brequire\s*\(|\bimport\s*\(/.test(bundle)) throw Error('date-detail-fixture-external-import');
const sandbox = vm.createContext({ crypto: globalThis.crypto, URL, TextEncoder, TextDecoder, btoa, structuredClone, console });
const selfCheck = await new vm.Script(`${bundle}\nMemoDateFixture.memoDateFixtureSelfCheck()`).runInContext(sandbox);
sandbox.foreignBody = { kind: 'execute', command: { schema: 'flowme-alpha-command/1', kind: 'change-private',
  requestId: 'date-detail-realm-check', expectedRevision: 0, changes: [] } };
const realmCheck = new vm.Script('MemoDateFixture.memoDateFixtureRealmSelfCheck(foreignBody)').runInContext(sandbox);
const seedRaw = `${sandbox.MemoDateFixture.SEED_RAW}\n- [ ] 구획 날짜 작업\n  - 날짜: 2026-10-04\n  - 메모: 같은 제목의 별도 할 일\n`;
const fixtureOptions = { seedRaw, enableFaultControl: true, expectedBuildId, localOrigin: 'http://127.0.0.1:3115' };
const fixture = `async (page) => {\n${bundle}\nreturn await MemoDateFixture.installMemoDateBrowserFixture(page, ${JSON.stringify(fixtureOptions)});\n}\n`;
const longTitle = '날짜가 달라져도 같은 원문의 메모와 진행 기록을 유지하면서 다시 이어서 작성하는 긴 제목의 개인 실행 항목입니다';
const longFixtureOptions = { ...fixtureOptions, seedRaw: seedRaw.replaceAll('구획 날짜 작업', longTitle) };
const longFixture = `async (page) => {\n${bundle}\nreturn await MemoDateFixture.installMemoDateBrowserFixture(page, ${JSON.stringify(longFixtureOptions)});\n}\n`;
const callback = phase => `async (page) => {\nreturn await (${source})(page, ${JSON.stringify({ phase, outputDirectory: outputDirectory.replaceAll('\\', '/') })});\n}\n`;
const longCallback = `async (page) => {\nreturn await (${source})(page, ${JSON.stringify({ phase: 'long-title', taskTitle: longTitle, outputDirectory: outputDirectory.replaceAll('\\', '/') })});\n}\n`;
const outputs = { fixture: fixture, core: callback('core'), faults: callback('faults'), 'long-fixture': longFixture, 'long-title': longCallback };
for (const value of Object.values(outputs)) new vm.Script(`(${value})`);
await mkdir(outputDirectory, { recursive: true });
const paths = {};
for (const [name, value] of Object.entries(outputs)) {
  paths[name] = resolve(outputDirectory, `${name}-code.js`); await writeFile(paths[name], value, 'utf8');
}
console.log(JSON.stringify({ schema: 'flowme-date-detail-cli-callbacks/1', outputs: paths, expectedBuildId,
  localOrigin: fixtureOptions.localOrigin, bundleBytes: Buffer.byteLength(bundle), moduleCount: Object.keys(result.metafile.inputs).length,
  externalImports: external.length, callbackSyntax: 'valid', selfCheck, realmCheck,
  sourcePublications: 0, browserExecuted: false }, null, 2));
