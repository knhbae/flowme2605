import test from 'node:test';
import assert from 'node:assert/strict';
import './test-css-modules';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { ProgramCreatorNativeLineage, defaultProgramNativeLineageMappings, programNativeLineageMappingIssue, type ProgramCreatorNativeLineageProps, type ProgramNativeLineagePreview, type ProgramNativeLineageMapping } from './ProgramCreatorNativeLineage';

const preview: ProgramNativeLineagePreview = {
  id: 'comparison-v1', draftId: 'draft', documentId: 'personal-document', rawOwnerId: 'actual-raw-owner', sourceVersionId: 'actual-source-v1',
  items: [
    { itemId: 'item-a', title: '기존 준비', included: true, kind: 'ordinary', incoming: '이번 제작 내용', sourceRowIds: ['native-row-a'], exactRowIds: ['old-a'], suggestedRowId: 'old-a' },
    { itemId: 'item-b', title: '새 준비', included: true, kind: 'series', incoming: '매일 반복', sourceRowIds: ['native-row-b'], exactRowIds: [], suggestedRowId: null },
    { itemId: 'item-excluded', title: '제외된 준비', included: false, kind: 'note', incoming: '원문만', sourceRowIds: ['native-row-c'], exactRowIds: [], suggestedRowId: null },
  ],
  existing: [
    { rowId: 'old-a', revisionId: 'original-revision-a', lineId: 'personal-line-a', kind: 'ordinary', title: '기존 준비', source: '실제 이전 원문 A', personal: '- [x] 개인 제목\n  메모 25% · 2026-09-20', documentId: 'personal-document' },
    { rowId: 'old-b', revisionId: 'original-revision-b', lineId: 'personal-line-b', kind: 'series', title: '남은 반복', source: '실제 이전 원문 B', personal: '지난 회차 45%', documentId: 'another-personal-document' },
  ],
};
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function props(overrides: Partial<ProgramCreatorNativeLineageProps> = {}): ProgramCreatorNativeLineageProps {
  return { preview, mapping: defaultProgramNativeLineageMappings(preview), busy: false, onChange() {}, onApply() {}, onCancel() {}, onRefresh() {}, ...overrides };
}
function elements(node: unknown): React.ReactElement<any>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement(node)) return [];
  const element = node as React.ReactElement<any>;
  return [element, ...elements(element.props.children)];
}
function select(tree: React.ReactElement, label: string) { return elements(tree).find(node => node.type === 'select' && node.props['aria-label'] === label)!; }
function button(tree: React.ReactElement, title: string) { return elements(tree).find(node => node.type === 'button' && node.props.children === title)!; }
function change(node: React.ReactElement<any>, value: string) { node.props.onChange({ target: { value } }); }

test('NLU01 defaults use only unique exact model suggestions, no title/index inference or new auto-adoption', () => {
  const before = JSON.stringify(preview), mapping = defaultProgramNativeLineageMappings(preview);
  assert.deepEqual(mapping, { items: { 'item-a': 'old-a', 'item-b': 'skip', 'item-excluded': 'skip' }, remaining: { 'old-b': 'keep' } });
  assert.equal(programNativeLineageMappingIssue(preview, mapping), null);
  const ambiguous = copy(preview); ambiguous.items[1].exactRowIds = ['old-a'];
  assert.equal(defaultProgramNativeLineageMappings(ambiguous).items['item-a'], 'skip');
  const forged = copy(preview); forged.items[1].suggestedRowId = 'old-b';
  assert.equal(defaultProgramNativeLineageMappings(forged).items['item-b'], 'skip');
  const excluded = copy(preview); excluded.items[0].included = false;
  assert.equal(defaultProgramNativeLineageMappings(excluded).items['item-a'], 'skip');
  assert.equal(JSON.stringify(preview), before);
});

test('NLU02 actual incoming, old source, personal content and provenance remain distinct in SSR', () => {
  const html = renderToStaticMarkup(<ProgramCreatorNativeLineage {...props()} />);
  for (const value of ['이번 제작 내용', '실제 이전 원문 A', '메모 25%', '2026-09-20', 'original-revision-a', 'old-a', '현재 내 본문과 기록', '필드별 반영은 이후 비교']) assert(html.includes(value), value);
  assert(!html.includes('실행 완료되었습니다'));
  assert(html.includes('aria-label="제외된 준비 연결 대상" disabled=""'));
});

test('NLU03 item change updates exact remaining keys and preserves unrelated keep/retain choices', () => {
  let next: ProgramNativeLineageMapping | undefined;
  const mapping = defaultProgramNativeLineageMappings(preview); mapping.remaining['old-b'] = 'retain';
  const before = copy(mapping);
  change(select(ProgramCreatorNativeLineage(props({ mapping, onChange(value) { next = value; } })), '기존 준비 연결 대상'), 'new');
  assert.deepEqual(next, { items: { 'item-a': 'new', 'item-b': 'skip', 'item-excluded': 'skip' }, remaining: { 'old-a': 'keep', 'old-b': 'retain' } });
  assert.deepEqual(mapping, before);
  change(select(ProgramCreatorNativeLineage(props({ mapping: next!, onChange(value) { next = value; } })), '새 준비 연결 대상'), 'old-b');
  assert.deepEqual(next!.remaining, { 'old-a': 'keep' });
});

test('NLU04 duplicate, unknown and excluded choices produce zero callbacks even from direct handlers', () => {
  let writes = 0;
  const tree = ProgramCreatorNativeLineage(props({ onChange() { writes++; }, onApply() { writes++; } }));
  change(select(tree, '새 준비 연결 대상'), 'old-a');
  change(select(tree, '새 준비 연결 대상'), 'unknown-old');
  change(select(tree, '제외된 준비 연결 대상'), 'new');
  assert.equal(writes, 0);
  const invalid = defaultProgramNativeLineageMappings(preview); invalid.items['item-b'] = 'old-a';
  assert.match(programNativeLineageMappingIssue(preview, invalid)!, /같은 이전 행/);
  const badTree = ProgramCreatorNativeLineage(props({ mapping: invalid, onApply() { writes++; } }));
  assert.equal(button(badTree, '선택한 연결 적용').props.disabled, true);
  button(badTree, '선택한 연결 적용').props.onClick(); assert.equal(writes, 0);
});

test('NLU05 remaining keep/retain changes are explicit and do not consume a raw row', () => {
  let next: ProgramNativeLineageMapping | undefined;
  const tree = ProgramCreatorNativeLineage(props({ onChange(value) { next = value; } }));
  change(select(tree, '남은 반복 이전 행 처리'), 'retain');
  assert.deepEqual(next!.items, defaultProgramNativeLineageMappings(preview).items);
  assert.deepEqual(next!.remaining, { 'old-b': 'retain' });
  const html = renderToStaticMarkup(<ProgramCreatorNativeLineage {...props({ mapping: next! })} />);
  assert(html.includes('본문과 개인 기록은 삭제하지 않습니다'));
});

test('NLU06 changed kind/old series explain retained history, not inferred occurrence inheritance', () => {
  const mapping = defaultProgramNativeLineageMappings(preview);
  mapping.items['item-b'] = 'old-b'; mapping.remaining = {};
  const html = renderToStaticMarkup(<ProgramCreatorNativeLineage {...props({ mapping })} />);
  assert(html.includes('이전 본문·날짜·진행·회차 기록은 보관하고 새 실행'));
  assert(html.includes('지난 기록을 새 회차에 옮기지 않습니다'));
  assert(html.includes('지난 회차 45%'));
});

test('NLU07 all skipped is no-op, even when an old row is marked retain', () => {
  const mapping: ProgramNativeLineageMapping = { items: { 'item-a': 'skip', 'item-b': 'skip', 'item-excluded': 'skip' }, remaining: { 'old-a': 'retain', 'old-b': 'keep' } };
  let calls = 0;
  const tree = ProgramCreatorNativeLineage(props({ mapping, onApply() { calls++; } }));
  assert.equal(button(tree, '선택한 연결 적용').props.disabled, true);
  button(tree, '선택한 연결 적용').props.onClick(); assert.equal(calls, 0);
  assert(renderToStaticMarkup(tree).includes('이전 행만 보관하는 용도로 적용할 수 없습니다'));
});

test('NLU08 Apply dispatches once per captured render; busy guards direct handlers and does not clear choices', () => {
  let applied = 0, changed = 0, cancelled = 0, refreshed = 0;
  const callbacks = { onApply() { applied++; }, onChange() { changed++; }, onCancel() { cancelled++; }, onRefresh() { refreshed++; } };
  const tree = ProgramCreatorNativeLineage(props(callbacks));
  button(tree, '선택한 연결 적용').props.onClick(); button(tree, '선택한 연결 적용').props.onClick();
  change(select(tree, '새 준비 연결 대상'), 'new');
  assert.equal(applied, 1); assert.equal(changed, 0);
  const busyTree = ProgramCreatorNativeLineage(props({ ...callbacks, busy: true }));
  for (const node of elements(busyTree).filter(node => node.type === 'button')) node.props.onClick();
  change(select(busyTree, '새 준비 연결 대상'), 'new');
  assert.deepEqual([applied, changed, cancelled, refreshed], [1, 0, 0, 0]);
});

test('NLU09 Cancel and Escape never apply or change; IME and busy Escape preserve input', () => {
  let cancelled = 0, writes = 0;
  const base = props({ onCancel() { cancelled++; }, onChange() { writes++; }, onApply() { writes++; } });
  const event = (composing = false, keyCode = 27) => ({ key: 'Escape', keyCode, nativeEvent: { isComposing: composing }, preventDefault() {}, stopPropagation() {} });
  ProgramCreatorNativeLineage(base).props.onKeyDown(event(true));
  ProgramCreatorNativeLineage(base).props.onKeyDown(event(false, 229));
  ProgramCreatorNativeLineage({ ...base, busy: true }).props.onKeyDown(event());
  assert.equal(cancelled, 0);
  ProgramCreatorNativeLineage(base).props.onKeyDown(event());
  button(ProgramCreatorNativeLineage(base), '변경 없이 닫기').props.onClick();
  assert.deepEqual([cancelled, writes], [2, 0]);
});

test('NLU10 stale/error feedback keeps mapping and refresh is an explicit separate callback', () => {
  let refresh = 0;
  const mapping = defaultProgramNativeLineageMappings(preview), before = copy(mapping);
  const tree = ProgramCreatorNativeLineage(props({ mapping, feedback: { error: true, text: '저장 공간이 부족합니다. 선택은 남아 있습니다.' }, onRefresh() { refresh++; } }));
  assert(renderToStaticMarkup(tree).includes('role="alert"'));
  button(tree, '최신 내용으로 다시 비교').props.onClick();
  assert.equal(refresh, 1); assert.deepEqual(mapping, before);
  const missing = copy(mapping); delete missing.remaining['old-b'];
  assert(programNativeLineageMappingIssue(preview, missing));
  const foreign = copy(mapping); foreign.items.foreign = 'new';
  assert(programNativeLineageMappingIssue(preview, foreign));
});

test('NLU11 empty and long content render accessibly; static style guards touch/focus/wrapping only', () => {
  const long = copy(preview); long.items[0].incoming = '<script>unsafe</script>' + '긴원문'.repeat(500); long.items[0].title = '긴제목'.repeat(150);
  const html = renderToStaticMarkup(<ProgramCreatorNativeLineage {...props({ preview: long })} />);
  assert(html.includes('&lt;script&gt;')); assert(!html.includes('<script>'));
  assert(html.includes('tabindex="0"')); assert(html.includes('<label>'));
  const empty = { ...preview, items: [], existing: [] };
  assert(renderToStaticMarkup(<ProgramCreatorNativeLineage {...props({ preview: empty, mapping: defaultProgramNativeLineageMappings(empty) })} />).includes('연결할 제작 항목이 없습니다'));
  const css = readFileSync('components/flow/integrated-poc/ProgramCreatorNativeLineage.module.css', 'utf8');
  for (const rule of ['min-height:44px', 'overflow-wrap:anywhere', 'focus-visible', 'grid-template-columns:minmax(0,1fr)']) assert(css.includes(rule));
});

test('NLU12 UI imports types only and has no storage, network, lineage apply or automatic mutations', () => {
  const source = readFileSync('components/flow/integrated-poc/ProgramCreatorNativeLineage.tsx', 'utf8');
  for (const prohibited of ['localStorage', 'sessionStorage', 'fetch(', 'applyProgramCreatorNativeLineage(', 'useEffect(', 'mutate(']) assert(!source.includes(prohibited), prohibited);
  assert(source.includes('import type { ProgramNativeLineagePreview }'));
});
