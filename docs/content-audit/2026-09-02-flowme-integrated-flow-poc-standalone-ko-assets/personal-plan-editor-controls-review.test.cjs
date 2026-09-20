'use strict';
// HTML strings and pure mode transitions, not browser/DOM/device verification.
const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const U = require('./personal-plan-editor-controls.js');
const T = require('./timeline-context.js');
const bytes = value => JSON.stringify(value);
const inherited = value => ({ owner: 'existing-personal-baseline', present: true, value });
const renderMemo = value => U.renderTextControl({ scope: 'item', field: 'memo',
  draft: { mode: 'override', value }, baseline: { owner: 'existing-personal-baseline', present: false } });
const textareaContent = html => {
  const match = html.match(/<textarea\b[^>]*>([\s\S]*?)<\/textarea>/);
  assert.ok(match, 'expected one textarea');
  return match[1];
};

test('UICR01 serialized textarea protects leading LF/CRLF/CR rather than letting HTML consume the first content newline', () => {
  // WHATWG HTML 13.1.2.5: a newline immediately after textarea's start tag is
  // ignored; real content beginning with a newline needs an additional prefix.
  // https://html.spec.whatwg.org/multipage/syntax.html#element-restrictions
  for (const value of ['\n메모', '\n\n메모']) {
    const expected = textareaContent(renderToStaticMarkup(React.createElement('textarea', { defaultValue: value })));
    assert.equal(expected, '\n' + value, 'actual React SSR protects LF-leading content');
    assert.equal(textareaContent(renderMemo(value)), expected);
  }
  // CR/CRLF normalization is a DOM property of a later UI test, not a raw model
  // rewrite here. Preserve exact raw characters after one parser-only prefix.
  for (const value of ['\r\n메모', '\r메모', '\r\n\r\n메모']) {
    assert.equal(textareaContent(renderMemo(value)), '\n' + value);
  }
});

test('UICR02 presenter date validity agrees with the existing Plan date contract including year zero and leap boundaries', () => {
  for (const date of ['0000-01-01', '0001-01-01', '0099-02-28', '1900-02-29', '2000-02-29', '2026-02-30', '9999-12-31', '']) {
    const valid = T.isPlainDate(date);
    const html = U.renderScheduleControl({ draft: { mode: 'fixed_date', date }, baseline: { owner: 'source', date: null } });
    assert.equal(html.includes('aria-invalid="true"'), !valid, date);
    const renderBaseline = () => U.renderScheduleControl({ draft: { mode: 'inherit' }, baseline: { owner: 'source', date } });
    if (valid) assert.doesNotThrow(renderBaseline, date);
    else assert.throws(renderBaseline, /invalid-schedule-baseline/, date);
  }
});

test('UICR03 every supported mode transition retains React control semantics and never mutates its input', () => {
  for (const draft of [{ mode: 'inherit' }, { mode: 'override', value: '' }, { mode: 'override', value: ' \r\n개인\t ' }]) {
    for (const mode of ['inherit', 'override']) {
      const before = bytes(draft); const baseline = ' \r\n기준\t ';
      const result = U.changeTextMode(draft, mode, baseline);
      assert.deepEqual(result, mode === 'inherit' ? { mode: 'inherit' }
        : { mode: 'override', value: draft.mode === 'override' ? draft.value : baseline });
      assert.equal(bytes(draft), before);
    }
  }
  for (const draft of [{ mode: 'inherit' }, { mode: 'unscheduled' }, { mode: 'fixed_date', date: '' }, { mode: 'fixed_date', date: '2026-09-08' }]) {
    for (const mode of ['inherit', 'fixed_date', 'unscheduled']) {
      const before = bytes(draft);
      assert.deepEqual(U.changeScheduleMode(draft, mode), mode === 'fixed_date'
        ? { mode, date: draft.mode === 'fixed_date' ? draft.date : '' } : { mode });
      assert.equal(bytes(draft), before);
    }
  }
  for (const invalid of [null, { mode: 'unknown' }, { mode: 'inherit', value: '' }, { mode: 'override', value: null }]) {
    assert.throws(() => U.changeTextMode(invalid, 'inherit', '기준'));
  }
  for (const invalid of [null, { mode: 'unknown' }, { mode: 'inherit', date: '' }, { mode: 'fixed_date', date: null }]) {
    assert.throws(() => U.changeScheduleMode(invalid, 'inherit'));
  }
});

test('UICR04 source/personal baseline and override markup escape all HTML delimiters without substituting or trimming values', () => {
  const value = ' \t<&"\'>\r\n</textarea><script>bad()</script> ';
  const expected = ' \t&lt;&amp;&quot;&#39;&gt;\r\n&lt;/textarea&gt;&lt;script&gt;bad()&lt;/script&gt; ';
  for (const owner of ['source', 'existing-personal-baseline']) {
    const baseline = { owner, present: true, value }; const before = bytes(baseline);
    const html = U.renderTextControl({ scope: 'plan', field: 'flow-title', draft: { mode: 'inherit' }, baseline });
    assert.ok(html.includes(expected)); assert.doesNotMatch(html, /<script>|<textarea>/);
    assert.equal(bytes(baseline), before);
    assert.equal(html.includes('원본 따르기'), owner === 'source');
  }
  const memo = renderMemo(value);
  assert.equal(textareaContent(memo), expected);
  const whitespace = '  \r\n\t ';
  const baseline = U.renderTextControl({ scope: 'item', field: 'memo', draft: { mode: 'inherit' }, baseline: inherited(whitespace) });
  assert.ok(baseline.includes(whitespace)); assert.doesNotMatch(baseline, /빈 메모|개인 메모 없음/);
  assert.throws(() => U.renderTextControl({ scope: 'item', field: 'memo', draft: { mode: 'inherit' }, baseline: { owner: 'source', present: true, value: '원문 설명' } }));
});

test('UICR05 simultaneous Plan/Item controls have noncolliding labels and exact local error references', () => {
  const html = U.renderTextControl({ scope: 'plan', field: 'flow-title', draft: { mode: 'override', value: '' }, baseline: { owner: 'source', present: true, value: '원본' } })
    + U.renderTextControl({ scope: 'item', field: 'title', draft: { mode: 'override', value: ' \r\n ' }, baseline: inherited('개인 제목') })
    + renderMemo('')
    + U.renderScheduleControl({ draft: { mode: 'fixed_date', date: '' }, baseline: { owner: 'existing-personal-baseline', date: null } });
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of html.matchAll(/\b(?:for|aria-describedby)="([^"]+)"/g)) {
    for (const id of match[1].split(' ')) assert.equal(ids.filter(value => value === id).length, 1, id);
  }
  assert.equal((html.match(/aria-invalid="true"/g) || []).length, 3);
  assert.match(html, /id="item-memo-value"[^>]*aria-label="내 메모 직접 입력"/);
});
