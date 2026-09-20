import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { materializePersonalWorkspacePocAuthoring } from '../../../lib/flow/personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../../../lib/flow/personal-workspace-poc-state';
import { readProgramLegacySourceMapping } from '../../../lib/flow/integrated-poc/legacy-source-lifecycle';
import type * as Mapping from './ProgramLegacySourceMapping';
const url = new URL('./ProgramLegacySourceMapping.tsx', import.meta.url), require = createRequire(url);
const source = readFileSync(url, 'utf8'), loaded = { exports: {} as typeof Mapping };
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
vm.runInThisContext(`(function(module,exports,require){${compiled.outputText}\n})`)(loaded, loaded.exports, (id: string) => id.endsWith('.module.css') ? { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) } : require(id));
const { ProgramLegacyMappingCandidates, ProgramLegacyMappingItem, ProgramLegacyMappingPair, programLegacyMappingFacts, programLegacyMappingOptionLabel } = loaded.exports;
const NOW = '2026-09-12T15:20:00.000Z';
function fixture() {
  const raw = '# 같은 제목 판단\r\n## 출국 전\r\n- [ ] 서류 확인\r\n  - 날짜: 2026-10-01\r\n  - 시간: 09:30\r\n  - 시간대: Asia/Seoul\r\n  - 설명: 여권 이름과 항공권 영문 이름 대조\r\n  - 완료 기준: 영문 이름 일치\r\n  - 주의: 불일치하면 항공사에 문의\r\n  - [ ] 여권 확인\r\n## 입국 후\r\n- [ ] 서류 확인\r\n  - 날짜: 2026-10-02\r\n  - 시간: 14:00\r\n  - 설명: 숙소 주소와 예약 번호 대조\r\n- [ ] 원문에만 남길 참고\r\n';
  const made = materializePersonalWorkspacePocAuthoring({ handoffId: 'mapping-presentation', documentId: 'mapping-presentation-doc', revisionId: 'v1', rawText: raw, committedAt: NOW }); assert.ok(made.ok);
  const { source: _source, parsedItems: _parsed, sourceLineItemIdentityMap: _ids, fidelityManifest: _fidelity, ...authoring } = made.flow.authoring;
  const state = createPersonalWorkspacePocState(NOW); state.authoredFlows = [{ ...made.flow, authoring, items: made.flow.items.slice(0, 2) }]; state.authoringReceipts = [{ handoffId: authoring.handoffId, flowRef: made.flow.ref, committedAt: NOW }];
  const prepared = readProgramLegacySourceMapping({ model: { version: 1, flows: [] }, state }, made.flow.ref, { partial: true }); assert.ok(prepared.ok);
  return prepared;
}
test('real raw-only factory facts distinguish equal titles without guessing matches or modifying raw/identity/token', () => {
  const f = fixture(), before = JSON.stringify(f), first = f.materialized.items[0], second = f.materialized.items[1];
  assert.equal(first.title, second.title);
  const facts = programLegacyMappingFacts(first, f.contexts.get(first.ref));
  assert.ok(facts.some(row => row.label === '원문 날짜' && row.value === '2026-10-01'));
  assert.ok(facts.some(row => row.label === '시간대' && row.value === 'Asia/Seoul'));
  assert.ok(facts.some(row => row.label === '완료 기준' && row.value === '영문 이름 일치'));
  assert.ok(facts.some(row => row.label === '주의' && row.value === '불일치하면 항공사에 문의'));
  assert.notEqual(programLegacyMappingOptionLabel(f.target.items[0]), programLegacyMappingOptionLabel(f.target.items[1]));
  assert.match(programLegacyMappingOptionLabel(f.target.items[0]), /출국 전.*2026-10-01.*09:30/);
  assert.match(programLegacyMappingOptionLabel(f.target.items[1]), /입국 후.*2026-10-02.*14:00/);
  assert.equal(JSON.stringify(f), before); assert.ok(f.materialized.authoring.rawText.includes('\r\n'));
});
test('paired SSR exposes readable raw and selected stored facts while full JSON and candidates stay collapsed', () => {
  const f = fixture(), item = f.materialized.items[0], existing = f.target.items[1]; let calls = 0;
  const select = <label>연결할 기존 항목<select aria-label={`${item.ref} 연결할 기존 항목`} value={existing.ref} onChange={() => calls++}><option value="">직접 선택</option>{f.target.items.map(candidate => <option key={candidate.ref} value={candidate.ref}>{programLegacyMappingOptionLabel(candidate)}</option>)}</select></label>;
  const html = renderToStaticMarkup(<><ProgramLegacyMappingCandidates items={f.target.items} /><ProgramLegacyMappingPair item={item} context={f.contexts.get(item.ref)} existing={existing} selection={existing.ref}>{select}</ProgramLegacyMappingPair></>);
  assert.match(html, /class="pair"/); assert.match(html, /연결할 원문 · 원문 3행/); assert.match(html, /선택한 기존 항목 · 저장 순서 2번째/);
  assert.match(html, /<dt>구간<\/dt><dd>출국 전/); assert.match(html, /<dt>구간<\/dt><dd>입국 후/);
  assert.match(html, /<dt>내용<\/dt><dd>여권 이름과 항공권 영문 이름 대조/);
  assert.match(html, /<details class="more"><summary>식별자·전체 기술자료/);
  assert.match(html, /<details class="candidates"><summary>기존 항목 2개 살펴보기/);
  assert.doesNotMatch(html, /<details[^>]*\sopen/); assert.match(html, /subcheckId/); assert.match(html, /여권 확인/); assert.equal(calls, 0);
});
test('empty optional facts do not invent dates, duration, completion or personal progress; hostile strings remain text', () => {
  const item = { ref: 'ref', savedCopyId: 'copy', flowId: 'flow', itemId: 'item', title: '<script>doNotRun()</script>', sourceOrder: 0 };
  assert.deepEqual(programLegacyMappingFacts(item), []);
  const html = renderToStaticMarkup(<ProgramLegacyMappingItem item={item} label="기존 항목" />);
  assert.doesNotMatch(html, /<dl|<script>|완료 기준|소요 시간|개인 진행|날짜 미정/); assert.match(html, /&lt;script&gt;/);
  assert.match(html, /저장 순서 1번째/);
});
test('new/source-only outcome is explicit, no default choice or write; duplicate candidates retain distinct actual refs', () => {
  const f = fixture(), item = f.materialized.items[0], context = f.contexts.get(item.ref);
  for (const [selection, expected] of [['', '나란히 비교'], ['new', '새 실행 항목으로'], ['source-only', '실행 항목은 만들지']]) {
    const html = renderToStaticMarkup(<ProgramLegacyMappingPair item={item} context={context} selection={selection}><select aria-label="기존 항목 선택" value={selection} onChange={() => undefined}><option value="">직접 선택</option><option value="new">새 항목</option><option value="source-only">원문만</option>{f.target.items.map(target => <option value={target.ref} key={target.ref}>{programLegacyMappingOptionLabel(target)}</option>)}</select></ProgramLegacyMappingPair>);
    assert.ok(html.includes(expected)); assert.doesNotMatch(html, /선택한 기존 항목/); for (const target of f.target.items) assert.ok(html.includes(target.ref));
  }
  assert.doesNotMatch(source, /localStorage|sessionStorage|fetch\(|commitSource|sourceToken|useEffect|useState/);
});
test('presentation integration keeps exact controlled values, warning, explicit confirmation and CAS guards', () => {
  const review = readFileSync(new URL('./ProgramLegacySourceReview.tsx', import.meta.url), 'utf8');
  assert.match(review, /<details><summary>저장된 원문 전체<\/summary><textarea aria-label="저장된 원문 전체" readOnly rows=\{8\} value=\{draft.raw\}/);
  assert.match(review, /value=\{selected \?\? ''\}/); assert.match(review, /value=\{target.ref\}/); assert.match(review, /view.token !== draft.expectedToken/);
  assert.match(review, /confirmed: false, itemRefs/); assert.match(review, /confirmed: true/); assert.match(review, /확정 전까지 새로고침하면 사라집니다/);
  assert.match(review, /programLegacyMappingOptionLabel\(target\)/); assert.match(review, /ProgramLegacyMappingItem item=\{item\} label="연결하지 않은 기존 항목"/);
  assert.equal((review.match(/<ProgramLegacyMappingCandidates /g) ?? []).length, 1);
});
test('responsive styles retain readable comparisons, single-column mobile, minimum targets and contained technical data', () => {
  const css = readFileSync(new URL('./ProgramLegacySourceMapping.module.css', import.meta.url), 'utf8');
  assert.match(css, /repeat\(2,minmax\(0,1fr\)\)/); assert.match(css, /@media\(max-width:800px\)/); assert.match(css, /grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /min-height:44px/); assert.match(css, /:focus-visible/); assert.match(css, /overflow-wrap:anywhere/); assert.match(css, /max-height:320px;overflow:auto/);
  assert.doesNotMatch(css, /white-space:nowrap|overflow-x:hidden|text-overflow:ellipsis/);
});
test('exact derived timing is not repeated, but an unfamiliar source timing label is preserved', () => {
  const f = fixture(), item = f.materialized.items[0], context = f.contexts.get(item.ref);
  assert.equal(item.sourceTimingLabel, '09:30 · Asia/Seoul');
  const facts = programLegacyMappingFacts(item, context);
  assert.equal(facts.find(row => row.label === '시간·일정')?.value, '09:30');
  assert.equal(facts.find(row => row.label === '시간대')?.value, 'Asia/Seoul');
  assert.match(programLegacyMappingFacts({ ...item, sourceTimingLabel: '09:30 · 창구 운영시간 확인' }, context).find(row => row.label === '시간·일정')!.value, /창구 운영시간 확인/);
  assert.equal(programLegacyMappingFacts(item).find(row => row.label === '시간·일정')?.value, item.sourceTimingLabel);
});
