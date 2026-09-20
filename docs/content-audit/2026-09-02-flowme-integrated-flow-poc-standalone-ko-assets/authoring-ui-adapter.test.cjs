const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const M = require('./model.js');
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function actualFunction(name) {
  const start = app.indexOf('  function ' + name + '(');
  assert.ok(start >= 0, name);
  const end = app.indexOf('\n  function ', start + 1);
  assert.ok(end > start, name);
  return app.slice(start, end);
}
function templatePresenter() {
  const sandbox = { escapeHtml };
  for (const key of ['window', 'document', 'localStorage', 'fetch']) {
    Object.defineProperty(sandbox, key, { get() { throw new Error('Unexpected UI presenter dependency: ' + key); } });
  }
  vm.createContext(sandbox);
  vm.runInContext(actualFunction('renderAuthoringTemplatePreview'), sandbox);
  return sandbox.renderAuthoringTemplatePreview;
}

for (const template of M.TEMPLATE_CATALOG) {
  test('K3-A standalone ' + template.id + ': exact blank scaffold precedes closed completed and technical disclosures', () => {
    const preview = M.findStructureTemplatePreview(template.id);
    assert.ok(preview);
    const before = JSON.stringify({ template, preview });
    const html = templatePresenter()(template, preview);
    const exampleAt = html.indexOf('<details id="template-completed-example">');
    assert.ok(exampleAt > 0);
    const primary = html.slice(0, exampleAt);
    assert.ok(primary.includes('<pre id="template-scaffold-source">' + escapeHtml(template.scaffold) + '</pre>'));
    assert.match(primary, /data-action="apply-template"/);
    assert.doesNotMatch(primary, /materialize-structure-template-preview|StructureDraft|templateVersion|open=/);
    assert.ok(html.includes('<pre id="template-example-source">' + escapeHtml(preview.expectedRawText) + '</pre>'));
    assert.equal((html.match(/data-action="materialize-structure-template-preview"/g) || []).length, 1);
    assert.match(html, /<details id="template-verification-details"><summary>검증 정보<\/summary>/);
    assert.doesNotMatch(html, /<details[^>]*\bopen(?:\s|=|>)/);
    assert.equal(JSON.stringify({ template, preview }), before);
  });
}

test('K3-A standalone missing compiled metadata keeps scaffold and warning outside both closed disclosures', () => {
  const html = templatePresenter()(M.TEMPLATE_CATALOG[0], null);
  assert.match(html, /id="template-scaffold-source"/);
  assert.match(html, /role="alert"/);
  assert.ok(html.indexOf('id="template-structure-warning"') < html.indexOf('<details id="template-completed-example">'));
  assert.equal((html.match(/id="template-structure-warning"/g) || []).length, 1);
  assert.doesNotMatch(html, /data-action="materialize-structure-template-preview"/);
});

test('K3-A navigation-only outside dismissal never discards the K1-A value, failure or stale owner', () => {
  const sandbox = { authoringChooser: null, authoringPropertyTarget: null };
  vm.createContext(sandbox);
  vm.runInContext(actualFunction('canDismissAuthoringChooserOutside'), sandbox);
  assert.equal(sandbox.canDismissAuthoringChooserOutside(), false);
  for (const stage of ['structure', 'groups', 'properties', 'value']) {
    for (const state of ['ready', 'noop', 'failed', 'stale', 'recovery-required']) {
      const target = { state, editorKey: stage === 'value' ? 'place' : null, values: { value: '  임시 입력\r\n' } };
      sandbox.authoringChooser = { stage };
      sandbox.authoringPropertyTarget = target;
      const expected = stage !== 'value' && ['ready', 'noop'].includes(state);
      assert.equal(sandbox.canDismissAuthoringChooserOutside(), expected, stage + '/' + state);
      assert.equal(sandbox.authoringPropertyTarget, target);
      assert.equal(target.values.value, '  임시 입력\r\n');
    }
  }
});

test('K3-A event adapters use the dismissal gate and keep a real internal focus transfer out of outside handling', () => {
  assert.match(app, /screen\.type !== 'authoring' \|\| !canDismissAuthoringChooserOutside\(\)/);
  assert.match(app, /if \(!canDismissAuthoringChooserOutside\(\) \|\| !event\.relatedTarget/);
  assert.match(app, /event\.relatedTarget\.closest\('\.property-inline-tray, #authoring-context-anchor'\)/);
  assert.match(app, /control\.dataset\.step === 'drafts' \|\| canDismissAuthoringChooserOutside\(\)/);
  const gate = actualFunction('canDismissAuthoringChooserOutside');
  assert.doesNotMatch(gate, /setItem|removeItem|clear\(|writeAuthoringDraft|persist|\.focus\(|beforeRawText\s*=/);
});

test('K3-A a retained success owner does not announce an expanded review chooser after its tray closes', () => {
  const target = { line: 4, state: 'success', values: { value: '보존할 값' } };
  const sandbox = { escapeHtml, dateLabel: value => value, authoringChooserEntry: 'review',
    authoringChooser: null, authoringPropertyTarget: target,
    currentAuthoringPropertyTicket: owner => Boolean(owner),
    renderAuthoringPropertyTray: () => '<section id="authoring-property-tray-4">열림</section>' };
  vm.createContext(sandbox);
  vm.runInContext(actualFunction('isAuthoringReviewItemOpen'), sandbox);
  vm.runInContext(actualFunction('renderAuthoringReviewItem'), sandbox);
  const item = { title: '접수', sourceLine: 4, date: '2026-09-05' };
  for (const chooser of [null, { stage: 'closed' }]) {
    sandbox.authoringChooser = chooser;
    const html = sandbox.renderAuthoringReviewItem(item);
    assert.match(html, /aria-expanded="false"/);
    assert.match(html, />속성 편집<\/button>/);
    assert.doesNotMatch(html, /<section/);
    assert.equal(sandbox.authoringPropertyTarget, target);
  }
  sandbox.authoringChooser = { stage: 'groups' };
  const html = sandbox.renderAuthoringReviewItem(item);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /<section id="authoring-property-tray-4">/);
  assert.equal(target.values.value, '보존할 값');
  assert.match(actualFunction('openAuthoringProperties'), /const alreadyOpen = isAuthoringReviewItemOpen\(line\)/);
});
