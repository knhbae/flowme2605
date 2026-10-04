import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// Callback generation only. Never starts a browser/server or builds the product.
// Exact approved artifacts are mandatory; there is no invented/default Flow.
// Usage: node scripts/personal-workspace-poc/build-private-pilot-browser-fixture-20261004.mjs
//   --input <approved.txt> --title <approved-title> --handoff <approved.json>
const flags = new Map();
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  if (!['--input', '--title', '--handoff', '--callback'].includes(args[i]) || !args[i + 1] || flags.has(args[i]))
    throw Error('private-pilot-generator-requires-exact-input-title-handoff');
  flags.set(args[i], args[i + 1]);
}
if (!flags.get('--input') || !flags.get('--title') || !flags.get('--handoff'))
  throw Error('private-pilot-approved-input-title-handoff-not-provided');
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const inputPath = resolve(flags.get('--input'));
const handoffPath = resolve(flags.get('--handoff'));
if (extname(inputPath).toLowerCase() !== '.txt' || extname(handoffPath).toLowerCase() !== '.json')
  throw Error('private-pilot-input-txt-and-handoff-json-required');
const raw = await readFile(inputPath, 'utf8'), title = flags.get('--title');
const handoffBytes = await readFile(handoffPath), handoff = JSON.parse(handoffBytes.toString('utf8'));
if (!handoff || typeof handoff !== 'object' || Array.isArray(handoff)) throw Error('private-pilot-handoff-json-object-required');
const sourcePath = resolve(flags.get('--callback') ?? resolve(repo, 'scripts/personal-workspace-poc/qa-private-pilot-app-20261004.js'));
const source = await readFile(sourcePath, 'utf8');
const expectedBuildId = (await readFile(resolve(repo, '.next/BUILD_ID'), 'utf8')).trim();
if (!expectedBuildId || /\s/.test(expectedBuildId)) throw Error('private-pilot-existing-build-id-missing');
const outputDirectory = resolve(repo, 'output/playwright/private-pilot');
const entry = resolve(repo, 'scripts/personal-workspace-poc/private-pilot-browser-fixture-20261004.ts');
const result = await build({ entryPoints: [entry], absWorkingDir: repo, bundle: true, platform: 'browser',
  format: 'iife', globalName: 'PrivatePilotFixture', target: 'es2022', write: false, metafile: true, legalComments: 'none', minify: true });
const bundle = result.outputFiles[0].text;
const external = Object.values(result.metafile.outputs).flatMap(value => value.imports);
if (external.length || /\brequire\s*\(|\bimport\s*\(/.test(bundle)) throw Error('private-pilot-fixture-external-import');
const approved = { title, raw };
const sandbox = vm.createContext({ crypto: globalThis.crypto, URL, URLSearchParams, TextEncoder, TextDecoder, btoa, nativeStructuredClone: structuredClone, console,
  approvedInputJson: JSON.stringify(approved) });
// Node VM has no structuredClone intrinsic; return its JSON records to this
// realm without weakening the shipped plain-object validators.
new vm.Script('globalThis.structuredClone = value => JSON.parse(JSON.stringify(nativeStructuredClone(value)))').runInContext(sandbox);
const selfCheck = await new vm.Script(`${bundle}\nPrivatePilotFixture.privatePilotFixtureSelfCheck(JSON.parse(approvedInputJson))`).runInContext(sandbox);
const fixtureOptions = { approved, expectedBuildId, enableFaultControl: true };
// CLI callbacks execute in a Node VM. Its provided clone may return host-realm
// records. Keep the fixture's JSON-only clone local to this callback; do not
// modify globals or the product's plain-object validators.
const fixtureCloneBridge = 'const structuredClone = value => JSON.parse(JSON.stringify(globalThis.structuredClone(value)));';
const fixture = `async (page) => {\n${fixtureCloneBridge}\n${bundle}\nreturn await PrivatePilotFixture.installPrivatePilotBrowserFixture(page, ${JSON.stringify(fixtureOptions)});\n}\n`;
const provenance = { inputPath, inputSha256: createHash('sha256').update(raw, 'utf8').digest('hex'),
  handoffPath, handoffSha256: createHash('sha256').update(handoffBytes).digest('hex') };
const options = { approved, handoff, provenance, expectedBuildId, outputDirectory: outputDirectory.replaceAll('\\', '/') };
const core = `async (page) => {\nreturn await (${source})(page, ${JSON.stringify(options)});\n}\n`;
for (const callback of [fixture, core]) new vm.Script(`(${callback})`);
await mkdir(outputDirectory, { recursive: true });
const outputs = { fixture: resolve(outputDirectory, 'fixture-code.js'), core: resolve(outputDirectory, 'core-code.js') };
await writeFile(outputs.fixture, fixture, 'utf8');
await writeFile(outputs.core, core, 'utf8');
console.log(JSON.stringify({ schema: 'flowme-private-pilot-cli-callbacks/1', outputs, expectedBuildId,
  localOrigin: 'http://127.0.0.1:3115', provenance, bundleBytes: Buffer.byteLength(bundle),
  moduleCount: Object.keys(result.metafile.inputs).length, externalImports: external.length,
  callbackSyntax: 'valid', selfCheck, sourcePublications: 0, browserExecuted: false, seededExecutionDocuments: 0 }, null, 2));
