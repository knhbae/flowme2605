const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('esbuild');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const canonicalEntry = path.join(
  repoRoot,
  'lib',
  'flow',
  'personal-workspace-poc-lossless-authoring.ts',
);

function bundle(format, platform, globalName) {
  const result = esbuild.buildSync({
    absWorkingDir: repoRoot,
    entryPoints: [canonicalEntry],
    bundle: true,
    write: false,
    format,
    platform,
    target: ['es2020'],
    charset: 'utf8',
    legalComments: 'none',
    logLevel: 'silent',
    ...(globalName ? { globalName } : {}),
  });
  const output = result.outputFiles && result.outputFiles[0];
  if (!output) throw new Error('lossless-authoring-runtime-build-failed');
  return output.text.replace(/\r\n?/gu, '\n').trimEnd();
}

function buildBrowserText() {
  return bundle('iife', 'browser', 'FlowMePersonalWorkspaceLosslessAuthoring');
}

let cachedCommonJs;

function loadCommonJs() {
  if (cachedCommonJs) return cachedCommonJs;
  const source = bundle('cjs', 'node');
  const runtimeModule = { exports: {} };
  const compile = vm.runInThisContext(
    `(function (module, exports) {\n${source}\n})`,
    { filename: `${canonicalEntry}.standalone.cjs` },
  );
  compile(runtimeModule, runtimeModule.exports);
  cachedCommonJs = runtimeModule.exports;
  return cachedCommonJs;
}

module.exports = Object.freeze({
  canonicalEntry,
  buildBrowserText,
  loadCommonJs,
});
