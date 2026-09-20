'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const postcss = require('postcss');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../..');
const backup = path.join(root, 'output/poc-gap-implementation/k3c/before-c3-standalone-20260906-01');
const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
const old = name => fs.readFileSync(path.join(backup, name), 'utf8');
const sha = raw => crypto.createHash('sha256').update(raw).digest('hex');

// Reuse genuine C/PD/M fixtures and actual renderer functions, not old tests.
const fixturePath = path.join(__dirname, 'personal-entry-result.test.cjs');
const source = fs.readFileSync(fixturePath, 'utf8');
const ast = ts.createSourceFile(fixturePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const declarations = ast.statements.filter(node => ts.isVariableStatement(node) || ts.isFunctionDeclaration(node));
const loaded = { exports: {} };
new Function('require', 'module', 'exports', '__dirname', declarations.map(node => node.getText(ast)).join('\n')
  + '\nmodule.exports = { fixture, harness, VIEWS };')(createRequire(fixturePath), loaded, loaded.exports, __dirname);
const H = loaded.exports;

function expectedCopy(markup, flowId) {
  const changes = [
    ['<h2>원본 Item과 실행 회차, 네 결과</h2><p>TXT, 할 일, 캘린더, 표가 같은 회차 식별자·순서·날짜·완료 상태를 사용합니다.</p>', '<h2>다른 방식으로 보기</h2>'],
    ['<button class="button" type="button" data-action="open-plan-editor" data-id="' + flowId + '">Plan 편집</button>', ''],
    ['<summary>WorkingSource 확인</summary><p>결과 TXT와 분리된 읽기 전용 원문입니다. 저장한 개인 shadow 변경은 이 원문에 역반영되지 않습니다.</p>', '<summary>원문 보기</summary><p>개인 편집은 원문을 바꾸지 않아요.</p>'],
  ];
  for (const [before, after] of changes) {
    assert.equal(markup.split(before).length, 2, 'one exact approved markup site');
    markup = markup.replace(before, after);
  }
  return markup;
}

test('C3P01 actual three genuine fixtures × four views retain all markup except the three approved presentation changes', () => {
  for (const kind of ['seed', 'time', 'recurrence']) {
    const fixture = H.fixture(kind), bytes = JSON.stringify(fixture), before = H.harness(fixture, true), current = H.harness(fixture);
    for (const view of H.VIEWS) {
      const result = current.default(view);
      assert.equal(result, expectedCopy(before.default(view), fixture.flow.id), kind + '/' + view);
      assert.equal(current.context.renderResultPanel(fixture.flow, { readOnly: false }), result);
    }
    assert.equal(JSON.stringify(fixture), bytes); assert.equal(before.ambient(), 0); assert.equal(current.ambient(), 0);
  }
});

test('C3P02 app delta is one presenter return statement; protected sources stay exact and supplied HTML equals the current builder with the C2 backup preserved', () => {
  const before = old('app.js'), current = read('app.js');
  const beforeLines = before.split('\n'), currentLines = current.split('\n');
  assert.equal(beforeLines.length, currentLines.length);
  const changes = beforeLines.flatMap((line, i) => line === currentLines[i] ? [] : [{ before: line, after: currentLines[i] }]);
  assert.equal(changes.length, 1);
  assert.match(changes[0].before, /^\s+return '<section class="result-panel"/);
  assert.match(changes[0].after, /^\s+return '<section class="result-panel"/);
  for (const name of ['model.js', 'personal-entry-ui.js', 'build-single-file.cjs']) assert.equal(read(name), old(name), name);
  const generated = Buffer.from(require('./build-single-file.cjs').buildText());
  for (const [file, copy] of [
    ['2026-09-02-flowme-integrated-flow-poc-standalone-ko.html', 'standalone-ko.html'],
    ['2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html', 'android-single-file-ko.html'],
  ]) {
    assert.equal(sha(fs.readFileSync(path.join(backup, copy))), 'a59cfcca4913ae357305a63a714fe706b24d2400b86df3106fc852a49ef54e92', 'C2 provided backup: ' + copy);
    assert.deepEqual(fs.readFileSync(path.join(__dirname, '..', file)), generated, 'current builder/provided byte equality: ' + file);
  }
});

test('C3P03 CSS changes add local tokens and explicit action boxes only, preserving all earlier rules and danger/gesture declarations', () => {
  const before = old('style.css'), current = read('style.css');
  const begin = current.indexOf('/* C3-a: local content owns action/focus;');
  const end = current.indexOf('@media (max-width: 600px)', begin);
  assert.ok(begin >= 0 && end > begin);
  assert.equal(current.slice(0, begin) + current.slice(end), before);
  const delta = postcss.parse(current.slice(begin, end));
  delta.walkRules(rule => {
    assert.doesNotMatch(rule.selector, /:root|topbar|product-nav|result-calendar-cell|move-calendar/);
    assert.match(rule.selector, /\.content|#move-panel|#dialog|#toast|\.source-update|#sidebar \.source-practice-guide-entry/);
  });
  delta.walkDecls(decl => assert.doesNotMatch(decl.prop, /danger|warning|touch-action|pointer-events|display|overflow|position|transform|transition|animation/));
  assert.equal(sha(old('style.css')), '891e9119da841f2a8deaed588bc3068592a2429f90e23bc8ba81fd772212d3b8');
});
