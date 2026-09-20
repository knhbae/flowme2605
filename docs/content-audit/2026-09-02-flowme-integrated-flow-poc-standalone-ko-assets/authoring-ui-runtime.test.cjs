const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const runtime = require('./authoring-ui-runtime.cjs');

test('K3-A UI browser bundle is deterministic and needs no DOM, storage, network or clock', () => {
  const first = runtime.buildBrowserText();
  assert.equal(runtime.buildBrowserText(), first);
  const context = vm.createContext({});
  let denied = 0;
  for (const key of ['document', 'window', 'localStorage', 'sessionStorage', 'Date', 'fetch', 'setTimeout']) {
    Object.defineProperty(context, key, { get() { denied += 1; throw Error(key); } });
  }
  vm.runInContext(first, context);
  assert.equal(context.FlowMePersonalWorkspaceAuthoringUI.AUTHORING_CHOOSER_GROUPS.length, 4);
  assert.equal(denied, 0);
});

test('K3-A browser and commonjs adapters share exact display and chooser output', () => {
  const context = vm.createContext({});
  vm.runInContext(runtime.buildBrowserText(), context);
  const cjs = runtime.loadCommonJs();
  for (const rawText of ['# \n## \n- [ ] ', '# 한글🙂\r\n## 준비\r\n- [ ] 작업\r\n  - 장소: 서울']) {
    const run = (api) => {
      const guides = api.buildPersonalWorkspacePocEditorLineGuides({ rawText,
        sourceFingerprint: api.fingerprintPersonalWorkspacePocAuthoringSource(rawText),
        selectionStart: 0, selectionEnd: 0, view: 'flow', ghostEnabled: true });
      return { lines: api.buildPersonalWorkspacePocLiveEditorPresentation(rawText, guides,
        { start: 0, end: 0 }, { flowViewVisible: true, ghostVisible: true }),
        chooser: api.selectAuthoringChooser(api.createAuthoringChooser({ owner: {}, entry: 'groups' })) };
    };
    assert.equal(JSON.stringify(run(cjs)), JSON.stringify(run(context.FlowMePersonalWorkspaceAuthoringUI)));
  }
});

test('K3-A runtime exposes pure helpers but no persistence or native editor functions', () => {
  const api = runtime.loadCommonJs();
  for (const name of Object.keys(api)) assert.doesNotMatch(name, /write|persist|storage|NativeReplacement|localStorage/i);
  assert.equal(typeof api.resolvePersonalWorkspacePocAuthoringGuideTarget, 'function');
  assert.equal(typeof api.planPersonalWorkspacePocHelperTransaction, 'function');
});
