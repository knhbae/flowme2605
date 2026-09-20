import ts from 'typescript';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// Match the build/test recorder's Program source scope. This proves which
// integration sources were checked, not the bytes of every transitive package.
const sourceHashes = () => [...execFileSync('rg', ['--files', 'lib/flow/integrated-poc', 'components/flow/integrated-poc'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/),
  'components/flow/personal-workspace-poc/PersonalWorkspacePocRoute.tsx', 'components/flow/personal-workspace-poc/PersonalWorkspacePocResultPresenter.tsx'].sort()
  .map(path => ({ path, sha256: existsSync(resolve(root, path)) ? createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex') : null }));
const started = new Date().toISOString(), before = sourceHashes();
const config = ts.readConfigFile(resolve(root, 'tsconfig.json'), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const files = parsed.fileNames.filter(path => /[\\/]integrated-poc[\\/]/.test(path) && !path.includes(`${root}/output`));
files.push(resolve(root, 'next-env.d.ts'));
const program = ts.createProgram(files, { ...parsed.options, incremental: false, noEmit: true });
const diagnostics = ts.getPreEmitDiagnostics(program);
const report = diagnostics.map(item => ({ file: item.file?.fileName.replace(root, '.'),
  line: item.file && item.start !== undefined ? item.file.getLineAndCharacterOfPosition(item.start).line + 1 : null,
  code: item.code, message: ts.flattenDiagnosticMessageText(item.messageText, '\n') }));
const output = resolve(root, 'output/integrated-product-poc'); mkdirSync(output, { recursive: true });
const at = new Date().toISOString();
const after = sourceHashes(), prior = new Map(before.map(file => [file.path, file.sha256])), current = new Map(after.map(file => [file.path, file.sha256]));
const sourceChangedDuringRun = [...new Set([...prior.keys(), ...current.keys()])].filter(path => prior.get(path) !== current.get(path));
const evidence = JSON.stringify({ at, started, ended: at, entryFiles: files.length, diagnostics: report,
  sourceScope: 'Program integration and two route seams; matches program-verify.mjs', sourceHashes: after, sourceChangedDuringRun }, null, 2);
writeFileSync(resolve(output, `targeted-types-${at.replace(/[:.]/g, '-')}.json`), evidence);
writeFileSync(resolve(output, 'targeted-types.json'), evidence);
console.log(JSON.stringify({ entryFiles: files.length, diagnostics: report, sourceCount: after.length, sourceChangedDuringRun }, null, 2));
if (report.length || sourceChangedDuringRun.length) process.exitCode = 1;
