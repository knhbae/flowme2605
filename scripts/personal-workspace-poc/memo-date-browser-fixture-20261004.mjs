import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// Author script only. It neither starts a server nor opens a browser, and it
// never reads environment files, credentials, browser profiles or user data.
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const entry = resolve(repo, 'scripts/personal-workspace-poc/memo-date-browser-fixture-20261004.ts');
const output = resolve(repo, 'output/playwright/memo-date/fixture-code.js');
const result = await build({ entryPoints: [entry], absWorkingDir: repo, bundle: true,
  platform: 'browser', format: 'iife', globalName: 'MemoDateFixture', target: 'es2022',
  write: false, metafile: true, legalComments: 'none', minify: true });
const bundle = result.outputFiles[0].text;
const external = Object.values(result.metafile.outputs).flatMap(value => value.imports);
if (external.length || /\brequire\s*\(|\bimport\s*\(/.test(bundle)) throw Error('memo-date-fixture-bundle-has-external-import');
const sandbox = vm.createContext({ crypto: globalThis.crypto, URL, TextEncoder, TextDecoder, btoa, structuredClone, console });
const selfCheck = await new vm.Script(`${bundle}\nMemoDateFixture.memoDateFixtureSelfCheck()`).runInContext(sandbox);
// This command is intentionally created in the author's realm, not the VM.
// Empty changes are structurally valid; this check does not claim a save.
sandbox.foreignBody = { kind: 'execute', command: { schema: 'flowme-alpha-command/1', kind: 'change-private',
  requestId: 'memo-date-realm-check', expectedRevision: 0, changes: [] } };
const realmCheck = new vm.Script('MemoDateFixture.memoDateFixtureRealmSelfCheck(foreignBody)').runInContext(sandbox);
const callback = `async (page) => {\n${bundle}\nreturn await MemoDateFixture.installMemoDateBrowserFixture(page);\n}\n`;
// Parse the actual generated CLI callback without executing any browser code.
new vm.Script(`(${callback})`);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, callback, 'utf8');
console.log(JSON.stringify({ output, bundleBytes: Buffer.byteLength(bundle), moduleCount: Object.keys(result.metafile.inputs).length,
  externalImports: external.length, callbackSyntax: 'valid', selfCheck, realmCheck, browserExecuted: false }, null, 2));
