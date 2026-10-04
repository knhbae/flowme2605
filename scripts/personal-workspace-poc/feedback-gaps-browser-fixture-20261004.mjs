import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

// Local authoring only: no credentials, .env, browser profile or API requests.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const buildId = (await readFile(resolve(root, '.next/BUILD_ID'), 'utf8')).trim();
const result = await build({ entryPoints: ['scripts/personal-workspace-poc/memo-date-browser-fixture-20261004.ts'],
  absWorkingDir: root, bundle: true, platform: 'browser', format: 'iife', globalName: 'MemoDateFixture',
  target: 'es2022', write: false, metafile: true, legalComments: 'none', minify: true });
const bundle = result.outputFiles[0].text;
if (Object.values(result.metafile.outputs).some(value => value.imports.length)
  || /\brequire\s*\(|\bimport\s*\(/.test(bundle)) throw Error('Unexpected fixture imports');
const sandbox = vm.createContext({ crypto: globalThis.crypto, URL, TextEncoder, TextDecoder, btoa, structuredClone, console });
const selfCheck = await new vm.Script(`${bundle}\nMemoDateFixture.memoDateFixtureSelfCheck()`).runInContext(sandbox);
const options = { expectedBuildId: buildId, enableFaultControl: true,
  seedRaw: '[2026-10-04]\n- [ ] 구획 날짜 작업\n  - 메모: 부모 첫 메모\n  - 메모: 부모 둘째 메모\n  - [ ] 하위 체크\n    - 메모: 하위 첫 메모\n- [ ] 개별 날짜 작업\n  - 날짜: 2026-10-05\n  - 시간: 09:00\n  - 메모: 개별 날짜 메모\n- [ ] 다른 날짜 작업\n  - 날짜: 2026-10-12\n일반 메모 문장' };
const callback = `async (page) => {\n${bundle}\nreturn await MemoDateFixture.installMemoDateBrowserFixture(page, ${JSON.stringify(options)});\n}\n`;
new vm.Script(`(${callback})`);
const output = resolve(root, 'output/playwright/feedback-gaps/fixture-code.js');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, callback, 'utf8');
console.log(JSON.stringify({ output, buildId, sha256: createHash('sha256').update(callback).digest('hex'),
  selfCheck, externalImports: 0, browserExecuted: false }));
