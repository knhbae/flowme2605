import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { PROGRAM_STATE_KEY, programClone, type ProgramData, type ProgramTransition } from '../../../lib/flow/integrated-poc/contract';
import { createProgramData, createProgramEnvelope, validateProgramData, validateProgramEnvelope } from '../../../lib/flow/integrated-poc/program-data';
import { commitProgramEnvelope, loadProgramStore, makeProgramEnvelope } from '../../../lib/flow/integrated-poc/program-store';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import { publishProgramFlow } from '../../../lib/flow/integrated-poc/publication';
import { importProgramPublicVersion } from '../../../lib/flow/integrated-poc/private-space';
import { buildProgramCatalog } from '../../../lib/flow/integrated-poc/catalog';
import { createProgramController, programSame } from '../../../lib/flow/integrated-poc/controller';
import { programInputBlocksSnapshot } from '../../../lib/flow/integrated-poc/document-action';
import type * as Publisher from './ProgramPublisher';
import { ordinaryPublicationSourceFixture, ORDINARY_SOURCE_NOW, ORDINARY_SOURCE_RAW } from '../../../lib/flow/integrated-poc/publication-ordinary-source.fixture';
import { inspectProgramPublicationSource, applyProgramPublicationSource } from '../../../lib/flow/integrated-poc/publication-ordinary-source';
import { ProgramPublicationSourceReviewPanel } from './ProgramPublicationSourceReview';
import { ProgramPublicationTiming } from './ProgramPublicationTiming';

const componentUrl = new URL('./ProgramPublisher.tsx', import.meta.url), require = createRequire(componentUrl);
const root = resolve(dirname(fileURLToPath(componentUrl)), '../../..');
const compiled = ts.transpileModule(readFileSync(componentUrl, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
const loaded = { exports: {} as typeof Publisher };
vm.runInThisContext(`(function(module,exports,require){${compiled.outputText}\n})`, { filename: 'ProgramPublisher.compiled.cjs' })(loaded, loaded.exports, (id: string) => {
  if (id.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) };
  return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
});
const { ProgramPublisher, createProgramPublicationDraft, saveProgramPublicationDraft, programPublicationInput, publishProgramDocument, compareProgramPublication, resolveProgramPublicationComparison, archiveProgramPublication, PublicationConflictReview } = loaded.exports;
const { captureProgramPublicationInput, createProgramPublicationEditorPort, programPublicationRecoveryText, resolveProgramPrivatePublicationDraft } = loaded.exports;
const { programPublicationNativeValue } = loaded.exports;
const publisherCss = require('postcss').parse(readFileSync(new URL('./ProgramPublisher.module.css', import.meta.url), 'utf8')) as import('postcss').Root;
test('short landscape publisher keeps recovery footer in the same scroll flow as the preview', () => {
  const rules: string[] = [];
  publisherCss.walkAtRules('media', media => {
    if (/max-height:\s*600px/.test(media.params)) media.walkRules('.footer', rule => rule.walkDecls('position', declaration => { rules.push(declaration.value); }));
  });
  assert.deepEqual(rules, ['static']);
});
function publisherRuleAt(selector: string, width: number) {
  const styles: Record<string, string> = {};
  publisherCss.walkRules(rule => {
    if (!rule.selectors.includes(selector)) return;
    let parent: import('postcss').Node | undefined = rule.parent;
    while (parent) {
      if (parent.type === 'atrule') { const match = (parent as import('postcss').AtRule).params.match(/max-width:\s*(\d+)px/); if (match && width > Number(match[1])) return; }
      parent = parent.parent;
    }
    rule.walkDecls(decl => { styles[decl.prop] = decl.value; });
  });
  return styles;
}
for (const width of [375, 390, 844, 1024]) test(`publisher footer CSS contract at ${width}px prevents narrow discard column`, () => {
  const group = publisherRuleAt('.footer>div:first-child', width), button = publisherRuleAt('.footer button', width);
  assert.equal(button['flex-shrink'], '0'); assert.equal(button['word-break'], 'keep-all');
  if (width <= 600) {
    assert.equal(group.display, 'flex'); assert.equal(group['flex-direction'], 'row'); assert.equal(group.width, '100%');
    const recovery = publisherRuleAt('.recoveryActions', width);
    assert.equal(recovery.display, 'grid'); assert.equal(recovery['grid-template-columns'], 'repeat(2,minmax(0,1fr))');
    const discard = publisherRuleAt('.recoveryActions .discard', width);
    assert.equal(discard['grid-column'], '1/-1'); assert.equal(discard['min-width'], '96px');
  } else { assert.equal(group.display, 'flex'); assert.equal(group['flex-direction'], 'column'); }
});
test('publisher heading and expanded recovery reflow without clipping or sticky occlusion', () => {
  for (const width of [375, 390, 844, 1024]) {
    const heading = publisherRuleAt('.header h2', width);
    assert.equal(heading['word-break'], 'keep-all'); assert.equal(heading['overflow-wrap'], 'anywhere');
    assert.equal(heading['text-wrap'], 'balance');
    assert.equal(publisherRuleAt('.footer:has(.recovery[open])', width).position, 'static');
    if (width <= 600) assert.equal(publisherRuleAt('.header', width)['flex-wrap'], 'wrap');
  }
});
const now = '2026-09-12T10:00:00.000Z', later = '2026-09-13T10:00:00.000Z';
for (const kind of ['creator', 'native'] as const) test(`publisher ${kind}: explicit ordinary source selection persists and publishes without private/source mutation`, () => {
  const f = ordinaryPublicationSourceFixture(kind), before = programClone(f.data);
  const draft = createProgramPublicationDraft(f.data, f.documentId, ORDINARY_SOURCE_NOW); assert(draft);
  const row = draft.rows.find(row => row.origin === 'task'); assert(row); row.selected = true; draft.title = '공개 원문 선택';
  assert.equal(row.description, ''); assert.equal(row.completionCriteria, ''); assert.equal(row.sourceUrl, '');
  let data = ok(saveProgramPublicationDraft(f.data, f.actorId, draft, null)).data;
  const inspection = inspectProgramPublicationSource(data, f.actorId, draft, row.itemId); assert(inspection.ok);
  const result = applyProgramPublicationSource(data, f.actorId, draft, inspection.review, ['description', 'completionCriteria', 'sourceUrl'], ORDINARY_SOURCE_NOW); assert(result.ok);
  const saved = ok(saveProgramPublicationDraft(data, f.actorId, result.draft, draft)); data = saved.data;
  assert.equal(ok(saveProgramPublicationDraft(data, f.actorId, result.draft, result.draft)).changed, false);
  const input = programPublicationInput(result.draft, f.actorId); assert(input); assert(input.items[0].description.includes('https://example.com/reference'));
  assert.equal(input.items[0].sourceUrl, 'https://example.com/source'); assert.equal(input.items[0].completionCriteria, '계약서 금액 확인');
  assert.deepEqual(input.items[0].schedule, { kind: 'undated' }); assert.deepEqual(input.items[0].subchecks, []);
  const published = ok(publishProgramDocument(data, f.actorId, result.draft, ORDINARY_SOURCE_NOW));
  assert.deepEqual(published.data.spaces[f.actorId].text, before.spaces[f.actorId].text); assert.deepEqual(published.data.spaces[f.actorId].creatorWorkspace, before.spaces[f.actorId].creatorWorkspace);
  for (const old of before.public.versions) assert.deepEqual(published.data.public.versions.find(version => version.id === old.id), old);
  const html = renderToStaticMarkup(<ProgramPublisher data={data} documentId={f.documentId} today="2026-09-14" mutate={async () => assert.fail('render write')} navigate={() => assert.fail('render navigate')} onClose={() => {}} />);
  assert.match(html, /원문 내용 가져오기/);
});
test('ordinary source comparison has five explicit unchecked fields, wrapping source values and a disabled initial apply', () => {
  const f = ordinaryPublicationSourceFixture('native'), draft = createProgramPublicationDraft(f.data, f.documentId, ORDINARY_SOURCE_NOW)!;
  const row = draft.rows.find(row => row.origin === 'task')!, inspection = inspectProgramPublicationSource(f.data, f.actorId, draft, row.itemId); assert(inspection.ok);
  const html = renderToStaticMarkup(<ProgramPublicationSourceReviewPanel review={inspection.review} fields={[]} disabled={false} onFields={() => assert.fail('render input')} onApply={() => assert.fail('render apply')} onCancel={() => assert.fail('render cancel')} styles={new Proxy({}, { get: (_target, key) => String(key) })} />);
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 5); assert(!html.includes('checked=""'));
  assert.match(html, /disabled="">선택한 원문 내용으로 초안 저장/); assert.match(html, /현재 공개 초안/); assert.match(html, /연결된 원문/);
  assert.match(html, /https:\/\/example.com\/reference/); assert.match(html, /취소 · 공개 초안 유지/);
  assert.equal(publisherRuleAt('.sourceValues', 375)['grid-template-columns'], 'minmax(0,1fr)');
  assert.equal(publisherRuleAt('.sourceValues pre', 375)['overflow-wrap'], 'anywhere');
});
test('ordinary source opener is cheap to render and success focus waits for disabled controls to unlock', () => {
  const source = readFileSync(componentUrl, 'utf8');
  assert.match(source, /hasProgramOrdinaryPublicationSource\(space, documentId, row.rowId\)/);
  assert(!source.includes('readProgramOrdinaryPublicationSources('));
  assert.match(source, /!sourceReview && !blocked && restoreSourceFocus.current/);
  assert.match(source, /\[sourceReview, blocked\]/);
});
function ok<T>(transition: ProgramTransition<T>) { if (!transition.ok) assert.fail(transition.reason); assert(validateProgramData(transition.data)); return transition; }
function fail<T>(transition: ProgramTransition<T>, before: ProgramData, reason: string) {
  assert(!transition.ok); if (transition.ok) throw new Error('expected failure'); assert.equal(transition.reason, reason); assert.equal(transition.data, before);
}
function fixture() {
  const data = createProgramData(), actorId = data.activeActorId, space = data.spaces[actorId];
  space.text = M.addDocument(space.text, { title: '비밀문서제목' }); const documentId = space.text.documents[0].id;
  space.text = M.editText(space.text, documentId, '[2026-12-24]\n- [20] 준비하기\n  - [ ] 비밀하위확인\n비밀개인메모', { progressDate: '2026-09-12' });
  assert(validateProgramData(data)); const draft = createProgramPublicationDraft(data, documentId, now); assert(draft);
  return { data, actorId, documentId, draft };
}
function selected() {
  const fixtureData = fixture(), draft = fixtureData.draft;
  draft.title = '공개 경험'; draft.summary = '직접 작성한 공개 설명'; const task = draft.rows.find(row => row.origin === 'task'); assert(task); task.selected = true;
  const saved = ok(saveProgramPublicationDraft(fixtureData.data, fixtureData.actorId, draft, null));
  return { ...fixtureData, data: saved.data };
}

for (const kind of ['creator', 'native'] as const) test(`publisher ${kind} ordinary time: explicit source selection, invalid draft recovery, new version and input restore`, () => {
  const f = ordinaryPublicationSourceFixture(kind, ORDINARY_SOURCE_RAW.replace('  - 날짜: 2026-10-02', '  - 날짜: 2026-10-02\n  - 시간: 15:00\n  - 시간대: Asia/Tokyo'));
  const sourceBefore = programClone(f.data.spaces[f.actorId]);
  const draft = createProgramPublicationDraft(f.data, f.documentId, ORDINARY_SOURCE_NOW)!;
  const row = draft.rows.find(row => row.origin === 'task')!; row.selected = true; draft.title = '시간 원문 선택';
  assert.equal(row.timing, undefined); assert.equal(row.scheduleKind, 'undated');
  const review = inspectProgramPublicationSource(f.data, f.actorId, draft, row.itemId); assert(review.ok);
  assert.deepEqual(review.review.source.values.timing, { version: 1, time: '15:00', timeZone: 'Asia/Tokyo' });
  const applied = applyProgramPublicationSource(f.data, f.actorId, draft, review.review, ['timing'], ORDINARY_SOURCE_NOW); assert(applied.ok);
  const chosen = applied.draft.rows.find(r => r.itemId === row.itemId)!;
  assert.deepEqual(chosen.timing, { version: 1, time: '15:00', timeZone: 'Asia/Tokyo' }); assert.equal(chosen.scheduleKind, 'undated');
  assert.equal(programPublicationNativeValue(applied.draft, 'timing:time', row.itemId), '15:00');
  assert.equal(programPublicationNativeValue(draft, 'timing:time', row.itemId), '');
  assert.equal(programPublicationNativeValue(applied.draft, 'timing:privateMemo', row.itemId), undefined);
  const saved = ok(saveProgramPublicationDraft(f.data, f.actorId, applied.draft, null));
  const invalid = captureProgramPublicationInput(applied.draft, [{ itemId: row.itemId, field: 'timing:time', value: '25:99' }]);
  const storedInvalid = ok(saveProgramPublicationDraft(saved.data, f.actorId, invalid, applied.draft));
  const reloaded = createProgramPublicationDraft(JSON.parse(JSON.stringify(storedInvalid.data)), f.documentId, ORDINARY_SOURCE_NOW)!;
  assert.equal(reloaded.rows.find(r => r.itemId === row.itemId)!.timing!.time, '25:99');
  assert(programPublicationRecoveryText(reloaded).includes('25:99')); assert.equal(programPublicationInput(reloaded, f.actorId), null);
  assert(!publishProgramDocument(storedInvalid.data, f.actorId, reloaded, ORDINARY_SOURCE_NOW).ok);
  const repaired = captureProgramPublicationInput(reloaded, [{ itemId: row.itemId, field: 'timing:time', value: '15:00' }]);
  repaired.rows.find(r => r.itemId === row.itemId)!.scheduleKind = 'fixed'; repaired.rows.find(r => r.itemId === row.itemId)!.scheduleValue = '2026-10-04';
  const data = ok(saveProgramPublicationDraft(storedInvalid.data, f.actorId, repaired, invalid)).data;
  const published = ok(publishProgramDocument(data, f.actorId, repaired, ORDINARY_SOURCE_NOW));
  const version = published.data.public.versions.at(-1)!;
  assert.deepEqual(version.items[0].schedule, { kind: 'fixed', date: '2026-10-04', timing: { version: 1, time: '15:00', timeZone: 'Asia/Tokyo' } });
  assert.deepEqual(published.data.spaces[f.actorId].text, sourceBefore.text); assert.deepEqual(published.data.spaces[f.actorId].creatorWorkspace, sourceBefore.creatorWorkspace);
  const next = createProgramPublicationDraft(published.data, f.documentId, ORDINARY_SOURCE_NOW)!;
  assert.deepEqual(next.rows.find(r => r.itemId === row.itemId)!.timing, chosen.timing);
  const untouched = captureProgramPublicationInput(next, [{ itemId: row.itemId, field: 'timing:time', value: '15:00' }, { itemId: row.itemId, field: 'timing:timeZone', value: 'Asia/Tokyo' }]); assert.equal(untouched, next);
});

test('ordinary time UI has named optional fields and preserves the publisher native composition lock contract', () => {
  const styles = new Proxy({}, { get: (_target, key) => String(key) });
  const html = renderToStaticMarkup(<ProgramPublicationTiming value={{ version: 1, time: '25:00', timeZone: 'Asia/Tokyo' }} disabled styles={styles} onChange={() => assert.fail('render input')} />);
  assert.match(html, /공개 시간 · 선택/); assert.match(html, /공개 시간대 · 선택/); assert.match(html, /role="alert"/);
  assert.doesNotMatch(html, /disabled=""/); assert.match(html, /data-publication-field="timing:time"/);
});

test('publisher keeps recovery available behind a named disclosure and exposes it when feedback needs attention', () => {
  const { data, documentId } = selected();
  const html = renderToStaticMarkup(<ProgramPublisher data={data} documentId={documentId} today="2026-09-13" mutate={async () => assert.fail('render write')} navigate={() => assert.fail('render navigate')} onClose={() => assert.fail('render close')} />);
  assert.match(html, /<details class="recovery"><summary>초안 보관·복구<\/summary>/);
  for (const label of ['공개 초안 입력 TXT 보관', '초안 다시 저장', '초안 버리기', '닫기 · 초안 보관', '공개 내용 미리보기']) assert(html.includes(label));
  assert.match(readFileSync(componentUrl, 'utf8'), /if \(message && recovery\.current\) recovery\.current\.open = true/);
});

test('native publisher capture keeps IME text and row identity without changing source or accepting arbitrary fields', () => {
  const { draft } = selected(), before = JSON.stringify(draft), itemId = draft.rows[0].itemId;
  const captured = captureProgramPublicationInput(draft, [
    { field: 'title', value: '조합 중 ㄱ' }, { field: 'summary', value: '보관할\n본문' },
    { itemId, field: 'description', value: '입력 중인 항목 설명' }, { field: 'sourceDocumentFingerprint', value: '손상' },
    { itemId: 'missing', field: 'title', value: '새 항목 생성 금지' }, { itemId, field: '__proto__', value: '금지' },
  ]);
  assert.equal(JSON.stringify(draft), before); assert.equal(captured.title, '조합 중 ㄱ');
  assert.equal(captured.summary, '보관할\n본문'); assert.equal(captured.rows[0].description, '입력 중인 항목 설명');
  assert.equal(captured.sourceDocumentFingerprint, draft.sourceDocumentFingerprint);
  assert.equal(captured.rows.length, draft.rows.length); assert.equal(captured.rows[0].itemId, itemId);
  const recovery = programPublicationRecoveryText(captured);
  assert(recovery.includes('조합 중 ㄱ')); assert(recovery.includes('입력 중인 항목 설명'));
  for (const secret of ['sourceDocumentFingerprint', '비밀문서제목', '비밀개인메모', '2026-12-24', 'progressRecords', 'documentId']) assert(!recovery.includes(secret));
});

test('publisher port blocks flush during composition, captures native buffer, and protects actor/archive/remove', async () => {
  const { data, actorId, documentId, draft } = selected(); let composing = true, saves = 0, locked = false;
  let native = captureProgramPublicationInput(draft, [{ field: 'summary', value: '끝나지 않은 조합 ㅎ' }]);
  let saved = draft;
  const port = createProgramPublicationEditorPort({ actorId, documentId, composing: () => composing, busy: () => false,
    read: () => native, saved: () => saved, save: async () => { saves++; saved = native; return true; },
    lock: () => { locked = true; return () => { locked = false; }; }, handlesPrivateConflict: true });
  const release = port.lockInput(); assert.equal(locked, true); assert.equal(await port.flushAll(), false); assert.equal(saves, 0);
  assert(port.hasPendingInput?.()); assert.deepEqual(port.pendingDocumentIds?.(), [documentId]);
  assert(port.captureDrafts?.()[0].raw.includes('끝나지 않은 조합 ㅎ'));
  const actorChanged = programClone(data); actorChanged.activeActorId = data.actors.find(actor => actor.id !== actorId)!.id;
  assert(programInputBlocksSnapshot(data, actorChanged, [port], true));
  const archived = programClone(data); archived.spaces[actorId].archivedDocumentIds.push(documentId);
  assert(programInputBlocksSnapshot(data, archived, [port], true));
  const deleted = programClone(data); deleted.spaces[actorId].text.documents = [];
  assert(programInputBlocksSnapshot(data, deleted, [port], true));
  const otherDraft = programClone(data); otherDraft.spaces[actorId].publicationDrafts[0].summary = '다른 탭';
  assert.equal(programInputBlocksSnapshot(data, otherDraft, [port], true), false); // Local buffer retained by mounted modal, explicit CAS UI handles this.
  assert.equal(native.summary, '끝나지 않은 조합 ㅎ');
  composing = false; native = { ...native, summary: '조합 완료' };
  assert.equal(await port.flushAll(), true); assert.equal(saves, 1); assert.equal(port.hasPendingInput?.(), false);
  release(); assert.equal(locked, false);
});

test('publisher port failed flush retains native input and cannot certify an edit that arrived during save', async () => {
  const { actorId, documentId, draft } = selected(); let saved = draft, native = { ...draft, summary: '저장 실패 입력' }, succeed = false;
  const port = createProgramPublicationEditorPort({ actorId, documentId, composing: () => false, busy: () => false,
    read: () => native, saved: () => saved, lock: () => () => {}, save: async () => {
      if (!succeed) return false;
      saved = native; native = { ...native, summary: '저장 중 추가 입력' }; return true;
    } });
  assert.equal(await port.flushAll(), false); assert(port.hasPendingInput?.()); assert(port.captureDrafts?.()[0].raw.includes('저장 실패 입력'));
  succeed = true; assert.equal(await port.flushAll(), false); assert(port.hasPendingInput?.()); assert.equal(native.summary, '저장 중 추가 입력');
});

test('private draft comparison requires fresh CAS; explicit keep modifies private draft only, stored choice writes nothing', () => {
  const { data, actorId, draft } = selected(), mine = { ...draft, summary: '저장 실패 뒤 내 입력' }, other = { ...draft, summary: '다른 탭 저장' };
  const external = ok(saveProgramPublicationDraft(data, actorId, other, draft)).data;
  fail(resolveProgramPrivatePublicationDraft(external, actorId, mine, draft, 'mine'), external, 'conflict');
  const kept = ok(resolveProgramPrivatePublicationDraft(external, actorId, mine, other, 'mine'));
  assert.deepEqual(kept.data.spaces[actorId].publicationDrafts[0], mine); assert.deepEqual(kept.data.public, data.public);
  assert.deepEqual(kept.data.spaces[actorId].text, data.spaces[actorId].text);
  const third = ok(saveProgramPublicationDraft(external, actorId, { ...other, title: '비교 후 세 번째 변경' }, other)).data;
  fail(resolveProgramPrivatePublicationDraft(third, actorId, mine, other, 'mine'), third, 'conflict');
  fail(resolveProgramPrivatePublicationDraft(third, actorId, mine, other, 'stored'), third, 'conflict');
  const chosen = ok(resolveProgramPrivatePublicationDraft(external, actorId, mine, other, 'stored'));
  assert.equal(chosen.changed, false); assert.equal(chosen.data, external);
  const foreign = programClone(external); foreign.activeActorId = data.actors.find(actor => actor.id !== actorId)!.id;
  fail(resolveProgramPrivatePublicationDraft(foreign, actorId, mine, other, 'mine'), foreign, 'forbidden');
});

test('a removed draft cannot turn an already published document into a duplicate Flow when keeping old local input', () => {
  const { data, actorId, draft } = selected(), published = ok(publishProgramDocument(data, actorId, draft, now)).data;
  fail(resolveProgramPrivatePublicationDraft(published, actorId, { ...draft, summary: '남은 입력' }, null, 'mine'), published, 'conflict');
  assert.equal(ok(resolveProgramPrivatePublicationDraft(published, actorId, draft, null, 'stored')).changed, false);
  const next = createProgramPublicationDraft(published, draft.documentId, later)!;
  assert.equal(next.flowId, published.public.flows[0].id); assert.notEqual(next.requestId, draft.requestId);
});

test('real controller quota then external private draft requires explicit fresh comparison and preserves private source/public bytes', async () => {
  const { data, actorId, documentId, draft } = fixture(), values = new Map<string, string>(), writes: string[] = []; let quota = false;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { if (quota) throw new Error('quota'); writes.push(key); values.set(key, value); }, removeItem: (key: string) => { writes.push(key); values.delete(key); } };
  const controller = createProgramController({ storage, initialData: data, exclusive: async work => await work() }); assert(controller.ok);
  assert((await controller.mutate('초안 시작', current => saveProgramPublicationDraft(current, actorId, draft, null), { actorId, history: false })).ok);
  let native = { ...draft, title: '내 제목', summary: '실패 뒤 유지할 입력' }, saved = draft;
  const port = createProgramPublicationEditorPort({ actorId, documentId, read: () => native, saved: () => saved, composing: () => false,
    busy: () => false, handlesPrivateConflict: true, lock: () => () => {}, save: async () => {
      const result = await controller.mutate('초안 저장', current => saveProgramPublicationDraft(current, actorId, native, saved), { actorId, history: false });
      if (result.ok) saved = native; return result.ok;
    } });
  const before = values.get(PROGRAM_STATE_KEY); quota = true; assert.equal(await port.flushAll(), false); assert.equal(values.get(PROGRAM_STATE_KEY), before);
  assert(port.captureDrafts?.()[0].raw.includes('실패 뒤 유지할 입력')); quota = false;
  const second = createProgramController({ storage, initialData: data, exclusive: async work => await work() }); assert(second.ok);
  const other = { ...draft, title: '다른 탭 제목' };
  assert((await second.mutate('다른 탭 저장', current => saveProgramPublicationDraft(current, actorId, other, draft), { actorId, history: false })).ok);
  const externalBytes = values.get(PROGRAM_STATE_KEY); assert.equal(await port.flushAll(), false); assert.equal(values.get(PROGRAM_STATE_KEY), externalBytes);
  const latest = second.snapshot().envelope.data.spaces[actorId].publicationDrafts[0];
  const decision = await controller.mutate('내 입력으로 보관 명시 선택', current => resolveProgramPrivatePublicationDraft(current, actorId, native, latest, 'mine'), { actorId, history: false }); assert(decision.ok);
  saved = native; assert.equal(port.hasPendingInput?.(), false);
  const reloaded = createProgramController({ storage, initialData: data, exclusive: async work => await work() }); assert(reloaded.ok);
  const result = reloaded.snapshot().envelope.data; assert(validateProgramData(result));
  assert(programSame(result.spaces[actorId].publicationDrafts[0], native)); assert(programSame(result.spaces[actorId].text, data.spaces[actorId].text)); assert(programSame(result.public, data.public));
  assert(writes.every(key => key === PROGRAM_STATE_KEY));
});

test('publisher SSR exposes native field capture and explicit recovery; source wires global protection without disabling composing text', () => {
  const { data, documentId } = selected();
  const html = renderToStaticMarkup(<ProgramPublisher data={data} documentId={documentId} today="2026-09-12" onClose={() => {}} navigate={() => {}} mutate={async () => ({ ok: false, reason: 'quota' })} />);
  assert(html.includes('공개 초안 입력 TXT 보관')); assert(html.includes('초안 다시 저장'));
  for (const field of ['title', 'summary', 'description', 'completionCriteria', 'category', 'situationsText', 'sourceLabel', 'sourceUrl']) assert(html.includes(`data-publication-field="${field}"`));
  const source = readFileSync(componentUrl, 'utf8');
  assert(source.includes('onRegisterEditors?.({ flushAll: () => portRef.current.flushAll()'));
  assert(source.includes('onCompositionStartCapture=') && source.includes('onCompositionEndCapture='));
  assert(source.includes("window.addEventListener('beforeunload', warn)"));
  assert(source.includes('if (!composing.current.has(element)) element.readOnly = blocked'));
  assert(!/<(?:input|textarea)[^>]*data-publication-field[^>]*disabled=/.test(source));
  assert.match(source, /const close = async \(\) => \{\r?\n    if \(unavailable\(\)\) return;\r?\n    beginAction\(\);/);
});

test('new draft selects nothing and never defaults personal title, dates, notes or subchecks into public fields', () => {
  const { draft, actorId } = fixture(); assert.equal(draft.title, ''); assert(draft.rows.every(row => !row.selected));
  const task = draft.rows.find(row => row.origin === 'task')!;
  assert.equal(task.title, '준비하기'); assert.equal(task.description, ''); assert.equal(task.scheduleKind, 'undated'); assert.deepEqual(task.subchecks, []);
  assert.equal(programPublicationInput(draft, actorId), null);
  draft.title = '공개 경험'; task.selected = true; const input = programPublicationInput(draft, actorId); assert(input);
  for (const secret of ['비밀문서제목', '비밀개인메모', '비밀하위확인', '2026-12-24', 'progress', 'documentId', 'folder']) assert(!JSON.stringify(input).includes(secret));
  assert.deepEqual(input.items[0].schedule, { kind: 'undated' }); assert.equal(input.source.kind, 'user-text'); assert.equal(input.source.checkedAt, null);
});

test('explicitly selected memo requires a separate public title/body and cannot silently publish a private note', () => {
  const { draft, actorId } = fixture(); draft.title = '메모 공유'; const note = draft.rows.find(row => row.origin === 'note')!;
  assert(note); assert.equal(note.title, ''); assert.equal(note.description, ''); note.selected = true;
  assert.equal(programPublicationInput(draft, actorId), null);
  note.title = '선택한 내용'; note.description = '사용자가 고쳐 쓴 공개 메모';
  assert.equal(programPublicationInput(draft, actorId)?.items[0].description, '사용자가 고쳐 쓴 공개 메모');
});

test('partial invalid fields persist, reload and reopen with the same request while stale draft saves conflict', () => {
  const { data, actorId, documentId, draft } = fixture(); draft.rows[0].scheduleKind = 'fixed'; draft.rows[0].scheduleValue = '2026-'; draft.sourceUrl = 'https://';
  const saved = ok(saveProgramPublicationDraft(data, actorId, draft, null));
  const reloaded = JSON.parse(JSON.stringify(saved.data)); const reopened = createProgramPublicationDraft(reloaded, documentId, later);
  assert.deepEqual(reopened, draft); assert.notEqual(reopened, draft); assert.equal(reopened?.requestId, draft.requestId);
  assert.equal(programPublicationInput(draft, actorId), null);
  fail(saveProgramPublicationDraft(saved.data, actorId, { ...draft, title: '충돌' }, null), saved.data, 'conflict');
  assert.equal(ok(saveProgramPublicationDraft(saved.data, actorId, draft, draft)).changed, false);
});

test('real controller canonical write/readback permits repeated draft edits and publication without key-order conflicts', async () => {
  const { data, actorId, documentId, draft } = fixture(), values = new Map<string, string>(), writes: string[] = [];
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { writes.push(key); values.set(key, value); }, removeItem: (key: string) => { writes.push(key); values.delete(key); } };
  const controller = createProgramController({ storage, initialData: data, exclusive: async work => await work() }); assert(controller.ok);
  const first = await controller.mutate('initial draft', current => saveProgramPublicationDraft(current, actorId, draft, null), { actorId, history: false }); assert(first.ok);
  const changed = programClone(draft); changed.title = '공개 제목'; changed.summary = '명시적으로 공개할 소개'; changed.rows.find(row => row.origin === 'task')!.selected = true;
  const second = await controller.mutate('draft edit', current => saveProgramPublicationDraft(current, actorId, changed, draft), { actorId, history: false }); assert(second.ok);
  const reloaded = createProgramController({ storage, initialData: data, exclusive: async work => await work() }); assert(reloaded.ok);
  const reopened = createProgramPublicationDraft(reloaded.snapshot().envelope.data, documentId, later); assert(reopened); assert(programSame(reopened, changed));
  const beforeReplay = writes.length;
  const repeat = await reloaded.mutate('same draft', current => saveProgramPublicationDraft(current, actorId, changed, changed), { actorId, history: false });
  assert(repeat.ok && !repeat.changed); assert.equal(writes.length, beforeReplay);
  // The older PoC generated JSON fingerprints in insertion order. They remain comparable after the store sorts objects.
  const legacyFingerprintDraft = { ...changed, sourceDocumentFingerprint: JSON.stringify(data.spaces[actorId].text.documents[0]) };
  const legacySaved = await reloaded.mutate('old fingerprint', current => saveProgramPublicationDraft(current, actorId, legacyFingerprintDraft, changed), { actorId, history: false }); assert(legacySaved.ok);
  const published = await reloaded.mutate('publish selected', current => publishProgramDocument(current, actorId, legacyFingerprintDraft, now), { actorId }); assert(published.ok);
  const result = reloaded.snapshot().envelope.data;
  assert.equal(result.public.versions.length, 1); assert.equal(result.public.versions[0].items.length, 1);
  assert.equal(result.public.versions[0].title, '공개 제목'); assert(programSame(result.spaces[actorId].text, data.spaces[actorId].text));
  for (const secret of ['비밀문서제목', '비밀개인메모', '비밀하위확인', '2026-12-24', documentId, 'progressRecords']) assert(!JSON.stringify(result.public).includes(secret));
  assert(writes.length > 0 && writes.every(key => key === PROGRAM_STATE_KEY));
});

test('one publication transition creates immutable public version, private link and removes only submitted draft', () => {
  const { data, actorId, documentId, draft } = selected(), original = JSON.stringify(data), privateText = JSON.stringify(data.spaces[actorId].text);
  const result = ok(publishProgramDocument(data, actorId, draft, now)); assert.equal(JSON.stringify(data), original);
  assert.equal(result.data.public.versions.length, 1); assert.equal(result.data.spaces[actorId].publicationDrafts.length, 0);
  assert.deepEqual(result.data.spaces[actorId].publications, [{ flowId: result.data.public.flows[0].id, documentId, creatorDraftId: null }]);
  assert.equal(JSON.stringify(result.data.spaces[actorId].text), privateText);
  for (const id of Object.keys(data.spaces).filter(id => id !== actorId)) assert.deepEqual(result.data.spaces[id], data.spaces[id]);
  const publicJson = JSON.stringify(result.data.public); for (const secret of ['비밀문서제목', '비밀개인메모', '비밀하위확인', '2026-12-24', documentId, 'progressRecords']) assert(!publicJson.includes(secret));
  const replay = ok(publishProgramDocument(result.data, actorId, draft, later)); assert.equal(replay.result, result.result); assert.equal(replay.changed, false); assert.equal(replay.data, result.data);
  fail(publishProgramDocument(result.data, actorId, { ...draft, title: '다른 요청' }, later), result.data, 'duplicate-request');
});

test('linked new edition retains public IDs and old version while private execution records remain untouched', () => {
  const first = selected(), published = ok(publishProgramDocument(first.data, first.actorId, first.draft, now));
  const old = JSON.stringify(published.data.public.versions[0]); const draft = createProgramPublicationDraft(published.data, first.documentId, later); assert(draft);
  assert.equal(draft.expectedVersionId, published.result); assert.equal(draft.rows.find(row => row.selected)?.itemId, first.draft.rows.find(row => row.selected)?.itemId);
  draft.rows.find(row => row.selected)!.description = '추가한 공개 설명';
  const saved = ok(saveProgramPublicationDraft(published.data, first.actorId, draft, null)); const next = ok(publishProgramDocument(saved.data, first.actorId, draft, later));
  assert.equal(next.data.public.flows.length, 1); assert.equal(next.data.public.versions.length, 2); assert.equal(next.data.public.versions[1].parentVersionId, published.result);
  assert.equal(JSON.stringify(next.data.public.versions[0]), old); assert.deepEqual(next.data.spaces[first.actorId].text, first.data.spaces[first.actorId].text);
});

test('source document changes and competing public editions block publication without losing draft', () => {
  const fixtureData = selected(), changed = programClone(fixtureData.data), space = changed.spaces[fixtureData.actorId];
  space.text = M.updateTask(space.text, M.tasks(space.text)[0].id, { title: '개인 수정' });
  fail(publishProgramDocument(changed, fixtureData.actorId, fixtureData.draft, now), changed, 'conflict'); assert.equal(space.publicationDrafts.length, 1);
  const first = ok(publishProgramDocument(fixtureData.data, fixtureData.actorId, fixtureData.draft, now));
  const draft = createProgramPublicationDraft(first.data, fixtureData.documentId, later)!; const saved = ok(saveProgramPublicationDraft(first.data, fixtureData.actorId, draft, null));
  const competingInput = programPublicationInput(draft, fixtureData.actorId)!;
  const competing = ok(publishProgramFlow(saved.data, { ...competingInput, requestId: 'competing-publication', title: '다른 새 판본' }, later));
  fail(publishProgramDocument(competing.data, fixtureData.actorId, draft, later), competing.data, 'conflict');
});

test('strict publication rejects unsafe source and bad schedule but accepts explicit fixed or relative dates', () => {
  const { draft, actorId } = selected(), row = draft.rows.find(row => row.selected)!;
  for (const sourceUrl of ['javascript:alert(1)', 'https://user:pass@example.com', 'https://127.0.0.1/a', 'https://example.com/?token=private']) {
    assert.equal(programPublicationInput({ ...draft, sourceUrl }, actorId), null);
  }
  row.scheduleKind = 'fixed'; row.scheduleValue = '2026-02-30'; assert.equal(programPublicationInput(draft, actorId), null);
  row.scheduleValue = '2026-10-01'; assert.deepEqual(programPublicationInput(draft, actorId)?.items[0].schedule, { kind: 'fixed', date: '2026-10-01' });
  row.scheduleKind = 'relative'; row.scheduleValue = '-7'; assert.deepEqual(programPublicationInput(draft, actorId)?.items[0].schedule, { kind: 'relative', days: -7 });
  row.scheduleValue = '2.5'; assert.equal(programPublicationInput(draft, actorId), null);
});

test('derived publication binds actual source flow and immutable version, never inventing a revised original', () => {
  const { data, actorId, draft } = selected(); const catalog = buildProgramCatalog(actorId); data.public.flows.push(...catalog.flows); data.public.versions.push(...catalog.versions);
  const expected = programClone(draft); draft.derivedFrom = { flowId: catalog.flows[0].id, versionId: catalog.versions[0].id };
  const saved = ok(saveProgramPublicationDraft(data, actorId, draft, expected)); const result = ok(publishProgramDocument(saved.data, actorId, draft, now));
  assert.deepEqual(result.data.public.flows.at(-1)?.derivedFrom, draft.derivedFrom); assert.deepEqual(result.data.public.versions[0], catalog.versions[0]);
});

test('wrong actor and unsaved draft are fail-closed, and render has no writer side effect', () => {
  const { data, actorId, documentId, draft } = fixture();
  fail(saveProgramPublicationDraft(data, 'participant-jihun', draft, null), data, 'forbidden');
  draft.title = '제목'; draft.rows[0].selected = true; fail(publishProgramDocument(data, actorId, draft, now), data, 'conflict');
  const html = renderToStaticMarkup(<ProgramPublisher data={data} documentId={documentId} today="2026-09-12" mutate={async () => { assert.fail('SSR must not write'); }} navigate={() => assert.fail('SSR must not navigate')} onClose={() => assert.fail('SSR must not close')} />);
  assert(html.includes('role="status"')); assert(html.includes('닫기 · 초안 보관')); assert(html.includes('초안 버리기')); assert(html.includes('로컬 PoC 목록'));
  assert(!html.includes('이 내용으로 PoC에 공개')); assert(!html.includes('비밀문서제목')); assert(!html.includes('2026-12-24'));
});

test('storage failure keeps saved draft/link/public bytes intact and reload restores exact private draft', () => {
  const { data, actorId, documentId, draft } = selected(), before = createProgramEnvelope(data), raw = JSON.stringify(before);
  const values = new Map([[PROGRAM_STATE_KEY, raw], ['flow:protected', 'keep']]); let calls = 0;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { calls++; assert.equal(key, PROGRAM_STATE_KEY); throw new Error('quota'); }, removeItem: () => assert.fail('never remove existing state') };
  const publication = ok(publishProgramDocument(data, actorId, draft, now));
  const next = makeProgramEnvelope(before, publication.data, { actorId });
  const saved = commitProgramEnvelope(storage, { expectedRaw: raw, next, validate: validateProgramEnvelope });
  assert(!saved.ok); assert.equal(calls, 1); assert.equal(values.get(PROGRAM_STATE_KEY), raw); assert.equal(values.get('flow:protected'), 'keep');
  const loaded = loadProgramStore(storage, validateProgramEnvelope); assert.equal(loaded.kind, 'ready'); assert(loaded.envelope);
  assert.deepEqual(createProgramPublicationDraft(loaded.envelope.data, documentId, later), draft);
  assert.equal(loaded.envelope.data.public.versions.length, 0); assert.equal(loaded.envelope.data.spaces[actorId].publications.length, 0);
});

function competingPublication() {
  const f = selected(), initial = programClone(f.draft);
  f.draft.rows.push({ rowId: null, origin: 'previous-public', itemId: 'will-be-removed', selected: true, title: '나중에 삭제될 항목', description: '삭제 전 설명', completionCriteria: '삭제 전 기준', sourceUrl: 'https://example.com/old', scheduleKind: 'fixed', scheduleValue: '2026-10-01', subchecks: [] });
  const saved = ok(saveProgramPublicationDraft(f.data, f.actorId, f.draft, initial)); const first = ok(publishProgramDocument(saved.data, f.actorId, f.draft, now));
  const draft = createProgramPublicationDraft(first.data, f.documentId, later)!; const row = draft.rows.find(row => row.selected)!;
  draft.title = '내 초안 제목'; draft.summary = '내 초안 본문'; row.description = '내 초안 설명'; row.completionCriteria = '내 완료 기준'; row.sourceUrl = 'https://example.com/draft'; row.scheduleKind = 'relative'; row.scheduleValue = '-2'; row.subchecks = [{ id: 'own-sub', title: '내 하위 확인' }];
  const draftSaved = ok(saveProgramPublicationDraft(first.data, f.actorId, draft, null));
  const input = programPublicationInput(draft, f.actorId)!;
  const latest = ok(publishProgramFlow(draftSaved.data, { ...input, requestId: 'competing-latest', title: '최신 공개 제목', summary: '최신 공개 본문', category: '바뀐 분야', situations: ['바뀐 상황'], source: { kind: 'user-text', label: '최신 출처 설명', url: 'https://example.com/latest', checkedAt: null },
    items: [{ ...input.items[0], title: '최신 항목 제목', description: '최신 설명', completionCriteria: '최신 기준', sourceUrl: 'https://example.com/item', schedule: { kind: 'fixed', date: '2026-11-10' }, subchecks: [{ id: 'latest-sub', title: '최신 하위 확인' }] },
      { id: 'latest-addition', title: '최신 추가 항목', description: '추가한 설명', completionCriteria: '추가 기준', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] }] }, later));
  const comparison = compareProgramPublication(latest.data, f.actorId, draft); assert(comparison);
  return { ...f, data: latest.data, draft, comparison, first, latest };
}

test('comparison covers source, body, schedule, criterion, subchecks, added/deleted membership and order', () => {
  const { comparison, draft } = competingPublication(), keys = comparison.fields.map(field => field.key), itemId = draft.rows.find(row => row.selected)!.itemId;
  for (const field of ['title', 'summary', 'category', 'situationsText', 'sourceLabel', 'sourceUrl']) assert(keys.includes(`top:${field}`));
  for (const field of ['title', 'description', 'completionCriteria', 'sourceUrl', 'schedule', 'subchecks']) assert(keys.includes(`row:${itemId}:${field}`));
  assert(keys.includes('presence:will-be-removed')); assert(keys.includes('presence:latest-addition')); assert(keys.includes('order'));
  const deleted = comparison.fields.find(field => field.key === 'presence:will-be-removed')!; assert(deleted.latestText.includes('삭제됨')); assert(deleted.draftText.includes('2026-10-01')); assert(deleted.draftText.includes('삭제 전 기준'));
});

test('partial choices cannot advance expectedVersion; complete mixed choices update only persisted private draft', () => {
  const { data, actorId, draft, comparison } = competingPublication(), before = JSON.stringify(data);
  fail(resolveProgramPublicationComparison(data, actorId, draft, comparison, {}, later), data, 'unresolved');
  assert.equal(JSON.stringify(data), before); assert.notEqual(draft.expectedVersionId, comparison.latestVersionId);
  const choices: Publisher.PublicationConflictChoices = Object.fromEntries(comparison.fields.map(field => [field.key, 'latest' as const])); choices['top:title'] = 'draft';
  const result = ok(resolveProgramPublicationComparison(data, actorId, draft, comparison, choices, later)); const merged = result.data.spaces[actorId].publicationDrafts[0];
  assert.equal(merged.title, '내 초안 제목'); assert.equal(merged.summary, '최신 공개 본문'); assert.equal(merged.expectedVersionId, comparison.latestVersionId);
  const task = merged.rows.find(row => row.itemId === draft.rows.find(item => item.selected)!.itemId)!;
  assert.equal(task.scheduleKind, 'fixed'); assert.equal(task.scheduleValue, '2026-11-10'); assert.equal(task.completionCriteria, '최신 기준'); assert.equal(task.sourceUrl, 'https://example.com/item');
  assert.equal(merged.rows.find(row => row.itemId === 'will-be-removed')?.selected, false); assert(merged.rows.find(row => row.itemId === 'latest-addition')?.selected);
  assert.deepEqual(result.data.public, data.public); assert.deepEqual(result.data.spaces[actorId].text, data.spaces[actorId].text); assert.deepEqual(result.data.receipts, data.receipts);
  const published = ok(publishProgramDocument(result.data, actorId, merged, later)); assert.equal(published.data.public.versions.length, 3); assert.deepEqual(published.data.public.versions.slice(0, 2), data.public.versions);
});

test('keep-draft choices preserve deletion/addition intent and all private source fields', () => {
  const { data, actorId, draft, comparison } = competingPublication();
  const choices = Object.fromEntries(comparison.fields.map(field => [field.key, 'draft' as const]));
  const result = ok(resolveProgramPublicationComparison(data, actorId, draft, comparison, choices, later)); const merged = result.data.spaces[actorId].publicationDrafts[0];
  assert.deepEqual(merged.rows, draft.rows); assert.equal(merged.title, draft.title); assert.equal(merged.sourceDocumentFingerprint, draft.sourceDocumentFingerprint);
  for (const id of Object.keys(data.spaces).filter(id => id !== actorId)) assert.deepEqual(result.data.spaces[id], data.spaces[id]);
});

test('another edition, changed draft, changed original, forged comparison and wrong actor reject stale resolution', () => {
  const f = competingPublication(), choices = Object.fromEntries(f.comparison.fields.map(field => [field.key, 'latest' as const]));
  const latestInput = programPublicationInput(f.draft, f.actorId)!;
  const newer = ok(publishProgramFlow(f.data, { ...latestInput, requestId: 'third-edition', expectedVersionId: f.latest.result, title: '다시 달라진 판본' }, later));
  fail(resolveProgramPublicationComparison(newer.data, f.actorId, f.draft, f.comparison, choices, later), newer.data, 'conflict');
  fail(resolveProgramPublicationComparison(f.data, f.actorId, { ...f.draft, title: '추가 편집' }, f.comparison, choices, later), f.data, 'conflict');
  const changed = programClone(f.data); changed.spaces[f.actorId].text = M.updateTask(changed.spaces[f.actorId].text, M.tasks(changed.spaces[f.actorId].text)[0].id, { title: '개인 변경' });
  fail(resolveProgramPublicationComparison(changed, f.actorId, f.draft, f.comparison, choices, later), changed, 'conflict');
  const forged = programClone(f.comparison); forged.latest.title = '위조 값'; fail(resolveProgramPublicationComparison(f.data, f.actorId, f.draft, forged, choices, later), f.data, 'conflict');
  fail(resolveProgramPublicationComparison(f.data, 'participant-jihun', f.draft, f.comparison, choices, later), f.data, 'forbidden');
});

test('withdrawal preserves snapshots, every private space and draft; retry is no-op and stale/unauthorized requests fail', () => {
  const { data, actorId, documentId, draft, comparison } = competingPublication();
  fail(archiveProgramPublication(data, actorId, documentId, comparison.flowId, draft.expectedVersionId!), data, 'conflict');
  fail(archiveProgramPublication(data, 'participant-jihun', documentId, comparison.flowId, comparison.latestVersionId), data, 'forbidden');
  fail(archiveProgramPublication(data, actorId, 'wrong-document', comparison.flowId, comparison.latestVersionId), data, 'forbidden');
  const result = ok(archiveProgramPublication(data, actorId, documentId, comparison.flowId, comparison.latestVersionId));
  assert(result.data.public.flows[0].archived); assert.deepEqual(result.data.public.versions, data.public.versions); assert.deepEqual(result.data.spaces, data.spaces); assert.deepEqual(result.data.receipts, data.receipts);
  const retried = ok(archiveProgramPublication(result.data, actorId, documentId, comparison.flowId, comparison.latestVersionId)); assert.equal(retried.changed, false); assert.equal(retried.data, result.data);
  assert.deepEqual(createProgramPublicationDraft(result.data, documentId, later), draft);
  const cleared = programClone(result.data); cleared.spaces[actorId].publicationDrafts = []; const reopened = createProgramPublicationDraft(cleared, documentId, later)!; assert.equal(reopened.flowId, comparison.flowId);
});

test('SSR conflict review requires explicit field choices and public management exposes reversible-scope warning', () => {
  const f = competingPublication();
  const markup = renderToStaticMarkup(<PublicationConflictReview comparison={f.comparison} choices={{}} disabled={false} onChoice={() => assert.fail('render choice')} onApply={() => assert.fail('render apply')} onCancel={() => assert.fail('render cancel')} />);
  assert(markup.includes('내 공개 초안')); assert(markup.includes('최신 공개 판본')); assert(markup.includes('최신 판본에서 삭제됨')); assert(markup.includes('최신 하위 확인')); assert(markup.includes('선택한 내용으로 초안 갱신'));
  assert(!markup.includes('checked=""')); assert.match(markup, /disabled=""[^>]*>선택한 내용으로 초안 갱신/);
  const html = renderToStaticMarkup(<ProgramPublisher data={f.data} documentId={f.documentId} today="2026-09-12" mutate={async () => assert.fail('render write')} navigate={() => assert.fail('render navigate')} onClose={() => assert.fail('render close')} />);
  assert(html.includes('공개 목록에서 내리기')); assert(html.includes('개인 사본과 이전 판본은 남습니다')); assert(!html.includes('현재 내용 기준으로 다시 검토'));
  const archived = ok(archiveProgramPublication(f.data, f.actorId, f.documentId, f.comparison.flowId, f.comparison.latestVersionId));
  const archivedHtml = renderToStaticMarkup(<ProgramPublisher data={archived.data} documentId={f.documentId} today="2026-09-12" mutate={async () => assert.fail('render write')} navigate={() => assert.fail('render navigate')} onClose={() => assert.fail('render close')} />);
  assert(archivedHtml.includes('공개 철회·보관 상태')); assert(archivedHtml.includes('새 판본을 공개할 수는 없습니다'));
});

test('withdrawal leaves an existing imported personal copy and its inherited dates byte-for-byte intact', () => {
  const f = competingPublication();
  const copied = ok(importProgramPublicVersion(f.data, { actorId: f.actorId, requestId: 'copy-before-withdrawal', expectedSpace: f.data.spaces[f.actorId], versionId: f.comparison.latestVersionId,
    itemIds: f.data.public.versions.find(version => version.id === f.comparison.latestVersionId)!.items.map(item => item.id), anchor: '2026-10-01' }));
  assert.equal(copied.data.spaces[f.actorId].copies.length, 1); const beforeSpace = JSON.stringify(copied.data.spaces[f.actorId]);
  const withdrawn = ok(archiveProgramPublication(copied.data, f.actorId, f.documentId, f.comparison.flowId, f.comparison.latestVersionId));
  assert.equal(JSON.stringify(withdrawn.data.spaces[f.actorId]), beforeSpace); assert.equal(withdrawn.data.public.versions.length, 2);
});
