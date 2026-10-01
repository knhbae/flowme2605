import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '../..');
const modules = new Map();
function include(path) {
  const absolute = resolve(root, path), id = relative(root, absolute).replaceAll('\\', '/');
  if (modules.has(id)) return id;
  const source = readFileSync(absolute, 'utf8');
  const code = absolute.endsWith('.ts') ? ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
  } }).outputText : source;
  const entry = { code, dependencies: {} }; modules.set(id, entry);
  for (const match of code.matchAll(/require\(['"]([^'"]+)['"]\)/g)) {
    const name = match[1];
    if (!name.startsWith('.')) throw Error(`Standalone dependency must be local: ${name}`);
    const base = resolve(dirname(absolute), name);
    let dependency = base;
    if (!/\.(?:cjs|ts)$/.test(base)) dependency += '.ts';
    entry.dependencies[name] = include(dependency);
  }
  return id;
}
const modelId = include('lib/flow/integrated-poc/text-workspace.ts');
const regionId = include('lib/flow/integrated-poc/folder-document-regions.ts');
const editorId = include('lib/flow/integrated-poc/vendor/text-editor.cjs');
const functions = [...modules].map(([id, entry]) => `${JSON.stringify(id)}:{deps:${JSON.stringify(entry.dependencies)},run:function(module,exports,require){\n${entry.code}\n}}`).join(',\n');
const vendorCss = readFileSync(resolve(root, 'lib/flow/integrated-poc/vendor/text-editor.css'), 'utf8');
const template = readFileSync(resolve(root, 'scripts/content-audit/writing-interactions-lab.template.html'), 'utf8');
const html = template.replace('/* NATIVE_EDITOR_CSS */', vendorCss).replace('/* LOCAL_MODULES */', functions)
  .replace('"MODEL_ID"', JSON.stringify(modelId)).replace('"REGION_ID"', JSON.stringify(regionId)).replace('"EDITOR_ID"', JSON.stringify(editorId));
const destination = resolve(root, 'docs/content-audit/2026-10-01-flowme-writing-interactions-lab-ko.html');
writeFileSync(destination, html, 'utf8');
console.log(JSON.stringify({ artifact: relative(root, destination), bytes: Buffer.byteLength(html), localModules: modules.size, networkDependencies: 0 }));
