const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('esbuild');
const repoRoot = path.resolve(__dirname, '../../..');
const canonicalEntry = path.join(repoRoot, 'lib/flow/personal-workspace-poc-authoring-ui-runtime.ts');

function bundle(format, platform, globalName) {
  const result = esbuild.buildSync({ absWorkingDir: repoRoot, entryPoints: [canonicalEntry],
    bundle: true, write: false, format, platform, target: ['es2020'], charset: 'utf8',
    legalComments: 'none', logLevel: 'silent', ...(globalName ? { globalName } : {}) });
  if (!result.outputFiles?.[0]) throw new Error('authoring-ui-runtime-build-failed');
  return result.outputFiles[0].text.replace(/\r\n?/gu, '\n').trimEnd();
}
function buildBrowserText() { return bundle('iife', 'browser', 'FlowMePersonalWorkspaceAuthoringUI'); }
let cached;
function loadCommonJs() {
  if (cached) return cached;
  const runtime = { exports: {} };
  vm.runInThisContext(`(function(module,exports){\n${bundle('cjs', 'node')}\n})`,
    { filename: `${canonicalEntry}.standalone.cjs` })(runtime, runtime.exports);
  cached = runtime.exports;
  return cached;
}
module.exports = Object.freeze({ canonicalEntry, buildBrowserText, loadCommonJs });
