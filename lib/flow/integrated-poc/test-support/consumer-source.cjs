'use strict';

// Read-only consumer fixture. TypeScript is transpiled in memory; product files,
// dependency files and caches are never written by this helper.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const crypto = require('node:crypto');
const repository = path.resolve(__dirname, '../../../..');
const sourceRoot = repository;
const requireExisting = createRequire(`${repository}/package.json`);
const ts = requireExisting('typescript');
const sources = new Map();
const modules = new Map();

function location(relative) {
  const original = path.resolve(sourceRoot, relative);
  assert(original.startsWith(sourceRoot + path.sep), 'source path escaped');
  return original;
}
function read(relative) {
  const full = location(relative);
  const raw = fs.readFileSync(full, 'utf8');
  const key = relative.replaceAll('\\', '/');
  const identity = { sha256: crypto.createHash('sha256').update(raw).digest('hex'), bytes: Buffer.byteLength(raw), fullPath: full };
  if (sources.has(key)) assert.deepEqual(identity, sources.get(key), `source changed while reading: ${key}`);
  else sources.set(key, identity);
  return raw;
}
function ast(relative) {
  return ts.createSourceFile(relative, read(relative), ts.ScriptTarget.Latest, true,
    relative.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}
function find(root, predicate) {
  let found;
  function visit(node) { if (found) return; if (predicate(node)) { found = node; return; } ts.forEachChild(node, visit); }
  visit(root);
  assert(found, 'actual source node must exist');
  return found;
}
function declaration(relative, name) {
  const root = ast(relative);
  return find(root, node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(root);
}
function initializer(relative, name) {
  const root = ast(relative);
  const node = find(root, item => ts.isVariableDeclaration(item) && item.name.getText(root) === name);
  assert(node.initializer, `initializer ${name} must exist`);
  return node.initializer.getText(root);
}
function evaluate(expression, context = {}) {
  const code = ts.transpileModule(`const __fixtureValue = ${expression};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  return new Function('require', 'exports', ...Object.keys(context), `${code}; return __fixtureValue;`)(
    requireExisting, {}, ...Object.values(context));
}
function resolveSource(relative) {
  for (const logical of [relative, `${relative}.ts`, `${relative}.tsx`, path.posix.join(relative, 'index.ts')]) {
    const file = location(logical);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return { full: file, relative: logical };
  }
  throw Error(`source module not found: ${relative}`);
}
function load(relative) {
  const resolved = resolveSource(relative.replaceAll('\\', '/'));
  const { full } = resolved;
  if (modules.has(full)) return modules.get(full).exports;
  const raw = read(resolved.relative);
  if (full.endsWith('.json')) {
    const module = { exports: JSON.parse(raw) };
    modules.set(full, module);
    return module.exports;
  }
  const module = { exports: {} };
  modules.set(full, module);
  const code = ts.transpileModule(raw, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: full,
  }).outputText;
  const localRequire = specifier => {
    if (specifier.startsWith('@/')) return load(specifier.slice(2));
    if (specifier.startsWith('.')) return load(path.posix.normalize(path.posix.join(path.posix.dirname(resolved.relative), specifier)));
    return requireExisting(specifier);
  };
  new Function('require', 'module', 'exports', '__filename', '__dirname', code)(
    localRequire, module, module.exports, full, path.dirname(full));
  return module.exports;
}
function manifest() { return Object.fromEntries([...sources].sort(([a], [b]) => a.localeCompare(b))); }

// The tests use in-memory repository/storage doubles. Any accidental live fetch
// fails immediately, before a request can leave this fixture process.
globalThis.fetch = () => { throw Error('live API prohibited in recovery/receipt fixture'); };
process.on('exit', () => {
  let unchanged = true;
  for (const [relative, identity] of sources) {
    const raw = fs.readFileSync(identity.fullPath);
    if (crypto.createHash('sha256').update(raw).digest('hex') !== identity.sha256) unchanged = false;
  }
  console.log('CONSUMER_SOURCE_COUNT ' + sources.size);
  console.log('SOURCE_GUARD ' + JSON.stringify({ sourceRoot, files: sources.size, unchanged, typescript: ts.version }));
  if (!unchanged) process.exitCode = 2;
});

module.exports = { repository, sourceRoot, ts, read, ast, find, declaration, initializer, evaluate, load, manifest };

