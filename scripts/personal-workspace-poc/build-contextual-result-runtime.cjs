'use strict';
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('esbuild');
const repoRoot = path.resolve(__dirname, '..', '..');
const canonicalEntry = path.join(repoRoot, 'lib', 'flow', 'personal-workspace-poc-contextual-result.ts');

function bundle(format, platform, globalName) {
  const built = esbuild.buildSync({
    absWorkingDir: repoRoot,
    entryPoints: [canonicalEntry],
    bundle: true, write: false, format, platform,
    target: ['es2020'], charset: 'utf8', legalComments: 'none', logLevel: 'silent',
    ...(globalName ? { globalName } : {}),
  });
  if (!built.outputFiles?.[0]) throw new Error('contextual-result-runtime-build-failed');
  return built.outputFiles[0].text.replace(/\r\n?/gu, '\n').trimEnd();
}

function buildBrowserText() {
  return bundle('iife', 'browser', 'FlowMePersonalWorkspaceContextualResult');
}

let cached;
function loadCommonJs() {
  if (cached) return cached;
  const runtimeModule = { exports: {} };
  const compile = vm.runInThisContext('(function (module, exports) {\n' + bundle('cjs', 'node') + '\n})',
    { filename: canonicalEntry + '.standalone.cjs' });
  compile(runtimeModule, runtimeModule.exports);
  cached = runtimeModule.exports;
  return cached;
}

module.exports = Object.freeze({ canonicalEntry, buildBrowserText, loadCommonJs });

