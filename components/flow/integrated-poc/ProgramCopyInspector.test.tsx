import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { importProgramPublicVersion, compareProgramCopyVersion, setProgramCopySeriesStart, previewProgramCopyScheduleResolution, applyProgramCopyVersion, previewProgramCopyKindChange } from '../../../lib/flow/integrated-poc/private-space';
import { programRecurringScheduleFromDraft } from '../../../lib/flow/integrated-poc/public-recurrence-contract';
import type { ProgramCopyInspector as Component, programCopyValueLabel as ValueLabel, ProgramCopyFieldChoices as FieldChoices, ProgramCopyFeedback as Feedback, ProgramCopyScheduleReview as ScheduleReview, ProgramCopyKindReview as KindReview, ProgramCopyCheckReview as CheckReview } from './ProgramCopyInspector';

const componentUrl = new URL('./ProgramCopyInspector.tsx', import.meta.url), source = readFileSync(componentUrl, 'utf8');
const require = createRequire(componentUrl), root = resolve(dirname(fileURLToPath(componentUrl)), '../../..');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
const loaded = { exports: {} as { ProgramCopyInspector: typeof Component; programCopyValueLabel: typeof ValueLabel; ProgramCopyFieldChoices: typeof FieldChoices; ProgramCopyFeedback: typeof Feedback; ProgramCopyScheduleReview: typeof ScheduleReview; ProgramCopyKindReview: typeof KindReview; ProgramCopyCheckReview: typeof CheckReview } };
vm.runInThisContext(`(function(module, exports, require) { ${compiled.outputText}\n})`, { filename: 'ProgramCopyInspector.compiled.cjs' })(loaded, loaded.exports, (id: string) => {
  if (id.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) };
  if (id === './ProgramCopyProposal') {
    const child = { exports: {} }, code = ts.transpileModule(readFileSync(new URL('./ProgramCopyProposal.tsx', componentUrl), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
    vm.runInThisContext(`(function(module,exports,require){${code.outputText}\n})`)(child, child.exports, (name: string) => name.endsWith('.css') ? { __esModule: true, default: {} } : require(name.startsWith('@/') ? resolve(root, name.slice(2)) : name));
    return child.exports;
  }
  return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
});
const { ProgramCopyInspector, programCopyValueLabel, ProgramCopyFieldChoices, ProgramCopyFeedback, ProgramCopyScheduleReview, ProgramCopyKindReview, ProgramCopyCheckReview } = loaded.exports;

test('retired check review requires an explicit choice for each row and preserves old wording in the comparison', () => {
  const preview = { version: 1 as const, copyId: 'copy', itemId: 'item', fromVersionId: 'v2', toVersionId: 'v3', before: [],
    incoming: [{ id: 'one', title: '새 원문 하나' }, { id: 'two', title: '새 원문 둘' }],
    checks: [{ childId: 'one', lineId: 'line-one', previousTitle: '개인 문구 하나', incomingTitle: '새 원문 하나', progressRecords: 1, descendantRows: 2 },
      { childId: 'two', lineId: 'line-two', previousTitle: '개인 문구 둘', incomingTitle: '새 원문 둘', progressRecords: 0, descendantRows: 0 }] };
  const before = JSON.stringify(preview); let mutations = 0;
  const props = { preview, disabled: false, onChoose: () => { mutations++; }, onApply: () => { mutations++; }, onCancel: () => { mutations++; } };
  const empty = renderToStaticMarkup(<ProgramCopyCheckReview {...props} choices={{}} />);
  assert.match(empty, /개인 문구 하나/); assert.match(empty, /새 원문 하나/); assert.match(empty, /disabled="">선택한 문구로 체크 복원/);
  const partial = renderToStaticMarkup(<ProgramCopyCheckReview {...props} choices={{ one: 'keep-private' }} />); assert.match(partial, /disabled="">선택한 문구로 체크 복원/);
  const selected = renderToStaticMarkup(<ProgramCopyCheckReview {...props} choices={{ one: 'keep-private', two: 'accept-source' }} />); assert.doesNotMatch(selected, /disabled="">선택한 문구로 체크 복원/);
  const locked = renderToStaticMarkup(<ProgramCopyCheckReview {...props} choices={{ one: 'keep-private', two: 'accept-source' }} disabled />); assert.match(locked, /<fieldset[^>]+disabled=""/);
  assert.equal(mutations, 0); assert.equal(JSON.stringify(preview), before);
});

test('check choices share pending-input cancellation snapshots and exact failed-request retry', () => {
  assert.match(source, /previewProgramCopyCheckResolution\(data/); assert.match(source, /checkChoices: \{\}, confirmed: false, expectedSpace: space/);
  assert.match(source, /choices: draft\.checkChoices \?\? \{\}/); assert.match(source, /requestId: draft\.requestId, expectedSpace: draft\.expectedSpace/);
  assert.match(source, /title: 'checks' in scheduleRef\.current\.preview \? '하위 체크 복원 검토'/);
  assert.match(source, /onCancel=\{cancelSchedule\}/); assert.match(source, /if \(saved\) \{ updateScheduleDraft\(null\); setFields\(\[\]\); \}/);
});

test('source-field feedback is routed beside its own apply action instead of the distant inspector header', () => {
  assert.match(source, /feedbackTarget === 'source-fields' && <ProgramCopyFeedback/);
  assert.match(source, /feedbackTarget === 'general' && <ProgramCopyFeedback/);
  assert.match(source, /선택한 변경을 반영했습니다[^\n]+, 'source-fields'\)/);
});

test('copy feedback exposes one accessible error, saving or outcome without duplicate messages', () => {
  const failure = renderToStaticMarkup(<ProgramCopyFeedback busy={false} error="저장하지 못했습니다. 입력을 유지했습니다." message="" />);
  assert.equal((failure.match(/role="alert"/g) ?? []).length, 1);
  assert.match(failure, /입력을 유지했습니다/);
  const saving = renderToStaticMarkup(<ProgramCopyFeedback busy error="" message="이전 결과" />);
  assert.match(saving, /role="status"[^>]*>저장 중/); assert.doesNotMatch(saving, /이전 결과/);
  const success = renderToStaticMarkup(<ProgramCopyFeedback busy={false} error="" message="선택한 변경을 반영했습니다." />);
  assert.match(success, /role="status"/); assert.doesNotMatch(success, /role="alert"/);
  assert.equal(renderToStaticMarkup(<ProgramCopyFeedback busy={false} error="" message="" />), '');
});
function fixture(recurring = false) {
  const initial = createProgramData();
  initial.public.flows.push({ id: 'flow-one', ownerId: 'creator-minji', currentVersionId: 'version-one', category: '생활', situations: [], derivedFrom: null, archived: false });
  initial.public.versions.push({ id: 'version-one', flowId: 'flow-one', number: 1, parentVersionId: null, title: '이사 준비', summary: '원문 소개',
    items: ['상자 준비', '예약 확인'].map((title, index) => ({ id: `item-${index}`, title, description: '원문 설명', completionCriteria: '확인 완료', sourceUrl: null, schedule: { kind: 'relative', days: -3 }, subchecks: [] })),
    source: { kind: 'simulated-example', label: '로컬 예시', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt: '2026-09-12T00:00:00.000Z' });
  if (recurring) {
    const schedule = programRecurringScheduleFromDraft({ version: 1, raw: '매주 화, 목', end: '8회', startKind: 'undated', startValue: '', time: '07:00', timeZone: 'Asia/Seoul' }); assert(schedule);
    initial.public.versions.at(-1)!.items[0].schedule = schedule;
  }
  const imported = importProgramPublicVersion(initial, { actorId: 'local-user', requestId: 'import-one', expectedSpace: initial.spaces['local-user'], versionId: 'version-one', itemIds: ['item-0'], anchor: null });
  assert(imported.ok); return { data: imported.data, copyId: imported.result };
}
test('inspector renders full original catalog, honest null anchor, comparison and proposal without public raw editor', () => {
  const { data, copyId } = fixture(), snapshot = JSON.stringify(data);
  const html = renderToStaticMarkup(<ProgramCopyInspector data={data} copyId={copyId} mutate={async () => { throw Error('SSR must not write'); }} navigate={() => {}} onClose={() => {}} today="2026-09-12" />);
  assert.match(html, /예약 확인/); assert.match(html, /아직 가져오지 않음/); assert.match(html, /실행 목록에 포함/);
  assert.match(html, /type="date" value=""/); assert.match(html, /변경 미리보기/); assert.match(html, /공개 판본 비교/);
  assert.match(html, /개선 제안/); assert.doesNotMatch(html, /contenteditable|공개 원문 편집|반복 회차/);
  assert.equal(JSON.stringify(data), snapshot);
});

test('actual imported series renders explicit private start and document reference actions without today inference or writes', () => {
  const { data, copyId } = fixture(true), before = JSON.stringify(data);
  const html = renderToStaticMarkup(<ProgramCopyInspector data={data} copyId={copyId} mutate={async () => { throw Error('SSR writes forbidden'); }} navigate={() => {}} onClose={() => {}} today="2026-12-01" />);
  assert.match(html, /개인 시작일: 미정/); assert.match(html, /시작일 정하기/); assert.match(html, /참조할 문서/); assert.match(html, /문서에 참조 추가/);
  assert.match(html, /매주 화, 목/); assert.doesNotMatch(html, /value="2026-12-01"/); assert.equal(JSON.stringify(data), before);
});
test('missing or another actor copy cannot expose original copy settings', () => {
  const { data, copyId } = fixture(); data.activeActorId = 'creator-minji';
  const html = renderToStaticMarkup(<ProgramCopyInspector data={data} copyId={copyId} mutate={async () => ({ ok: false, reason: 'forbidden' })} navigate={() => {}} onClose={() => {}} today="2026-09-12" />);
  assert.match(html, /원문 연결을 찾지 못했습니다/); assert.doesNotMatch(html, /상자 준비/);
});
test('source schedules and subchecks remain readable without assigning today or hiding source information', () => {
  assert.equal(programCopyValueLabel({ kind: 'relative', days: -7 }), '기준일 -7일');
  assert.equal(programCopyValueLabel({ kind: 'relative', days: 2 }), '기준일 +2일');
  assert.equal(programCopyValueLabel({ kind: 'undated' }), '날짜 미정');
  assert.equal(programCopyValueLabel({ kind: 'fixed', date: '2026-10-01' }), '2026-10-01');
  assert.equal(programCopyValueLabel([{ id: 'one', title: '상자' }, { id: 'two', title: '주소' }]), '상자\n주소');
});
test('mutation callbacks use the rendered actor baseline, immutable proposal source, and preserve failed form input', () => {
  assert.match(source, /expectedSpace: space/);
  assert.match(source, /<ProgramCopyProposal data=\{data\} copyId=\{copy.id\} version=\{target\}/);
  assert.match(source, /proposalPort.current\?\.captureDrafts/);
  assert.match(source, /proposalPendingRef.current\) return; setVersionId/);
  assert.match(source, /if \(await save\('공개 원문 선택 필드 반영'/);
  assert.doesNotMatch(source, /setReason\(''\)|setProposalText\(''\).*result\.ok/);
  assert.match(source, /setProgramCopyAnchor\(current, input\)/);
  assert.match(source, /setProgramCopyInclusion\(current, input\)/);
});

test('changed description is the only primary choice; unchanged source facts stay in a closed disclosure', () => {
  const { data, copyId } = fixture(), original = data.public.versions[0];
  const next = { ...structuredClone(original), id: 'version-two', number: 2, parentVersionId: original.id };
  next.items[0].description = '바뀐 준비 방법'; data.public.versions.push(next);
  const comparison = compareProgramCopyVersion(data, { actorId: 'local-user', copyId, versionId: next.id }); assert(comparison.ok);
  const row = comparison.result.items.find(item => item.itemId === 'item-0')!;
  const html = renderToStaticMarkup(<ProgramCopyFieldChoices comparisons={row.fields} selected={['description']} busy={false} versionNumber={2} onToggle={() => assert.fail('SSR cannot choose')} />);
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 1);
  assert.match(html, /바뀐 준비 방법/); assert.match(html, /원문 설명/);
  assert.match(html, /<details[^>]*><summary>바뀌지 않은 정보 5개<\/summary>/);
  assert.doesNotMatch(html, /<details[^>]*\bopen\b/); assert.match(html, /기준일 -3일/);
});

test('private conflicts remain visible and cannot be hidden among unchanged information', () => {
  const { data, copyId } = fixture();
  const comparison = compareProgramCopyVersion(data, { actorId: 'local-user', copyId, versionId: 'version-one' }); assert(comparison.ok);
  const fields = comparison.result.items[0].fields.map(field => field.field === 'title' ? { ...field, privateChanged: true, canApply: false, currentText: '내가 정한 제목' } : field);
  const html = renderToStaticMarkup(<ProgramCopyFieldChoices comparisons={fields} selected={[]} busy={false} versionNumber={1} onToggle={() => {}} />);
  assert(html.indexOf('내가 정한 제목') < html.indexOf('<details')); assert.match(html, /type="checkbox" disabled=""/);
});

test('actual unchanged recurring metadata folds all source fields without a false private conflict',()=>{
  const {data,copyId}=fixture(true),comparison=compareProgramCopyVersion(data,{actorId:'local-user',copyId,versionId:'version-one'});assert(comparison.ok);
  const row=comparison.result.items.find(item=>item.itemId==='item-0')!;
  const html=renderToStaticMarkup(<ProgramCopyFieldChoices comparisons={row.fields} selected={[]} busy={false} versionNumber={1} onToggle={()=>{}}/>);
  assert.match(html,/비교한 항목의 내용이 같습니다/);assert.match(html,/바뀌지 않은 정보 6개/);assert.doesNotMatch(html,/개인 본문도 바뀌었습니다|type="checkbox"/);
});

test('recurring schedule choices show real consequences and explain unsupported ownership transitions',()=>{
  const {data,copyId}=fixture(true),next=structuredClone(data.public.versions.at(-1)!);next.id='version-two';next.number=2;next.parentVersionId='version-one';
  const schedule=programRecurringScheduleFromDraft({version:1,raw:'매주 수, 금',end:'6회',startKind:'fixed',startValue:'2026-12-02',time:'09:00',timeZone:'Asia/Seoul'});assert(schedule);next.items[0].schedule=schedule;data.public.versions.push(next);
  const comparison=compareProgramCopyVersion(data,{actorId:'local-user',copyId,versionId:next.id});assert(comparison.ok);
  const row=comparison.result.items.find(item=>item.itemId==='item-0')!,html=renderToStaticMarkup(<ProgramCopyFieldChoices comparisons={row.fields} selected={['schedule']} busy={false} versionNumber={2} onToggle={()=>{}}/>);
  assert.match(html,/반영한 반복 규칙으로 새 회차를 조회/);assert.match(html,/지난 실행 기록은 유지/);assert.doesNotMatch(html,/개인 실행 날짜는 바뀌지 않습니다/);
  next.items[0].schedule={kind:'fixed',date:'2026-12-02'};
  const blocked=compareProgramCopyVersion(data,{actorId:'local-user',copyId,versionId:next.id});assert(blocked.ok);
  const blockedHtml=renderToStaticMarkup(<ProgramCopyFieldChoices comparisons={blocked.result.items[0].fields} selected={[]} busy={false} versionNumber={2} onToggle={()=>{}}/>);
  assert.match(blockedHtml,/항목 형태가 바뀝니다/);assert.match(blockedHtml,/보관·복원을 먼저 확인/);assert.match(blockedHtml,/type="checkbox" disabled=""/);assert.doesNotMatch(blockedHtml,/개인 본문도 바뀌었습니다/);
});

test('schedule review requires an unchecked acknowledgement and presents retention without copying old records', () => {
  const imported = fixture(true), actorId = 'local-user';
  const started = setProgramCopySeriesStart(imported.data, { actorId, requestId: 'start-for-review', expectedSpace: imported.data.spaces[actorId], copyId: imported.copyId, itemId: 'item-0', start: '2026-12-03' }); assert(started.ok);
  const data = started.data, next = structuredClone(data.public.versions.at(-1)!); next.id = 'version-two'; next.number = 2; next.parentVersionId = 'version-one';
  assert(next.items[0].schedule.kind === 'recurring'); next.items[0].schedule.start = { kind: 'fixed', date: '2026-12-01' }; data.public.versions.push(next);
  const preview = previewProgramCopyScheduleResolution(data, { actorId, copyId: imported.copyId, itemId: 'item-0', versionId: next.id }); assert(preview.ok);
  const before = JSON.stringify(data), callbacks = { onConfirm: () => assert.fail('SSR cannot confirm'), onApply: () => assert.fail('SSR cannot write'), onCancel: () => {} };
  const html = renderToStaticMarkup(<ProgramCopyScheduleReview preview={preview.result} confirmed={false} disabled={false} {...callbacks} />);
  assert.match(html, /2026-12-03/); assert.match(html, /2026-12-01/); assert.match(html, /이력에 남깁니다/); assert.match(html, /새 회차에 복제하지 않습니다/);
  assert.match(html, /받을 원문 일정: 매주 화, 목/);
  const sameStart = renderToStaticMarkup(<ProgramCopyScheduleReview preview={{ ...preview.result, beforeStartDate: preview.result.nextStartDate }} confirmed={false} disabled={false} {...callbacks} />);
  assert.match(sameStart, /받을 원문 일정: 매주 화, 목/); assert.doesNotMatch(sameStart, /반복 시작:/);
  assert.match(html, /type="checkbox"[^>]*\/>/); assert.doesNotMatch(html, /checked=""/); assert.match(html, /disabled="">새 일정만 수용/); assert.match(html, /수용 취소/);
  const confirmed = renderToStaticMarkup(<ProgramCopyScheduleReview preview={preview.result} confirmed disabled={false} {...callbacks} />);
  assert.match(confirmed, /checked=""/); assert.doesNotMatch(confirmed, /disabled="">새 일정만 수용/);
  const locked = renderToStaticMarkup(<ProgramCopyScheduleReview preview={preview.result} confirmed disabled {...callbacks} />); assert.match(locked, /<fieldset[^>]*disabled=""/);
  assert.equal(JSON.stringify(data), before);
  const accepted = applyProgramCopyVersion(data, { actorId, requestId: 'accept-for-review', expectedSpace: data.spaces[actorId], copyId: imported.copyId,
    versionId: next.id, expectedBaseVersionId: 'version-one', itemIds: ['item-0'], fields: ['schedule'], scheduleResolution: { confirmed: true, at: '2026-12-01T00:00:00.000Z', preview: preview.result } }); assert(accepted.ok);
  const history = renderToStaticMarkup(<ProgramCopyInspector data={accepted.data} copyId={imported.copyId} mutate={async () => { throw Error('SSR writes'); }} navigate={() => {}} onClose={() => {}} today="2026-12-01" />);
  assert.match(history, /<details[^>]*><summary>이전 일정 선택 1건/); assert.match(history, /당시 개인 시작일: 2026-12-03/); assert.match(history, /이전 원문 판본 보기/);
});

test('schedule choices protect pending navigation, reuse failed request identity, cancel on Escape and return focus', () => {
  assert.match(source, /\|\| !!scheduleRef.current \|\| busyRef.current/);
  assert.match(source, /if \(scheduleRef.current\) cancelSchedule\(\)/);
  assert.match(source, /requestId: draft.requestId, expectedSpace: draft.expectedSpace/);
  assert.match(source, /if \(saved\) \{ updateScheduleDraft\(null\)/);
  assert.match(source, /scheduleOpener.current.isConnected/); assert.match(source, /comparisonItemSelect.current/);
  assert.match(source, /versionId: choice.fromVersionId, itemId: choice.itemId/);
  assert.match(source, /feedbackTarget === 'schedule-resolution' && <ProgramCopyFeedback/);
});

test('kind review shows two distinct forms, requires explicit acknowledgement, and never writes while rendered', () => {
  const f = fixture(true), data = f.data, next = structuredClone(data.public.versions.at(-1)!);
  next.id = 'kind-two'; next.parentVersionId = 'version-one'; next.number = 2; next.items[0].schedule = { kind: 'fixed', date: '2026-12-02' }; data.public.versions.push(next);
  const preview = previewProgramCopyKindChange(data, { actorId: 'local-user', copyId: f.copyId, itemId: 'item-0', versionId: next.id }); assert(preview.ok);
  const before = JSON.stringify(data), callbacks = { onConfirm: () => assert.fail('SSR cannot confirm'), onApply: () => assert.fail('SSR cannot write'), onCancel: () => {} };
  const html = renderToStaticMarkup(<ProgramCopyKindReview preview={preview.result} confirmed={false} disabled={false} {...callbacks} />);
  assert.match(html, /반복 항목 → 일반 항목/); assert.match(html, /완료하지 않은 상태로 시작/); assert.match(html, /반복 회차의 완료를 가져오지 않습니다/);
  assert.match(html, /disabled="">기록 보존·형태 전환/); assert.doesNotMatch(html, /checked=""/); assert.match(html, /전환 취소/);
  const confirmed = renderToStaticMarkup(<ProgramCopyKindReview preview={preview.result} confirmed disabled={false} {...callbacks} />);
  assert.match(confirmed, /checked=""/); assert.doesNotMatch(confirmed, /disabled="">기록 보존·형태 전환/);
  const locked = renderToStaticMarkup(<ProgramCopyKindReview preview={preview.result} confirmed disabled {...callbacks} />); assert.match(locked, /<fieldset[^>]*disabled=""/);
  assert.equal(JSON.stringify(data), before); assert.match(source, /applyProgramCopyKindChange\(current, input\)/);
  assert.match(source, /writingLineId: slot.lineId/);
});
