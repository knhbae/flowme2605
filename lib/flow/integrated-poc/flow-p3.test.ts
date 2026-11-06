import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { ProgramData, ProgramPublicItem, ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { createProgramDocument, importProgramPublicVersion } from './private-space';
import { programFlowCardLines } from './program-discovery-display';
import { programImportCautions, programImportRepeatChoice, programImportRepeats } from './public-repeat-import';
import { captureProgramImportLinks, unlinkProgramImportLines } from './program-import-links';
import { programFlowProgress } from './flow-loop';
import { textWorkspaceModel as M } from './text-workspace';

// Flow 공개 리허설 (11/6) P3: ① the list card's first task showed the `@…` marker; ② a later import into another
// document had nothing to put in but its button was on and failed; ③ an empty document took a press on its first line
// only; ④ a repeat item's caution (the exercise Flow's 119 line) did not come along into the imported repeat line.
const B = 'local-user', A = 'creator-minji', NOW = '2026-11-05T00:00:00.000Z', TODAY = '2026-11-05';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: B, requestId: `p3-${++request}`, expectedSpace: data.spaces[B] });
const item = (id: string, title: string, description = ''): ProgramPublicItem => ({ id, title, description, completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] });
const CAUTION = '주의(FlowMe 안내): 통증이나 어지럼이 생기면 운동을 멈추세요. 갑작스러운 가슴 통증이나 심한 호흡곤란이 있으면 기다리지 말고 119에 도움을 요청하세요.';
const FLOWS: Record<string, { title: string; items: ProgramPublicItem[] }> = {
  exercise: { title: '근력·유산소 운동 반복하기', items: [
    item('strength', '근력 운동 하기 @매주 월 목', ['몸의 큰 근육을 두루 쓰는 근력 운동을 중간 강도 이상으로 합니다.', '출처 사실(WHO): 근력 운동은 일주일에 이틀 이상을 권합니다.',
      'FlowMe 예시: 월·목은 FlowMe가 정한 요일입니다.', CAUTION].join('\n')),
    item('walk', '빠르게 걷기 30분 @매주 월 화 수 목 금', ['숨이 조금 차는 중강도 유산소 활동을 30분 합니다.', CAUTION].join('\n'))] },
  english: { title: '영어 단어 떠올리기 연습', items: [item('recall', '영어 단어 뜻 가리고 떠올리기 @매일', '오늘 볼 단어의 뜻을 가리고 먼저 떠올려 본 뒤 답을 확인합니다.\nFlowMe 예시: 매일은 FlowMe가 정한 간격입니다.')] },
  car: { title: '차 관리 반복 일정', items: [item('inspection', '자동차 정기검사 받기 @24개월마다'), item('oil', '엔진오일 교환하기 @?개월마다')] },
  passport: { title: '여권 발급', items: [item('photo', '여권 사진 준비하기'), item('apply', '신청하기')] },
};
function catalog(): ProgramData {
  const data = createProgramData();
  for (const [id, flow] of Object.entries(FLOWS)) {
    data.public.flows.push({ id, ownerId: A, currentVersionId: `${id}-v1`, category: '생활', situations: [], derivedFrom: null, archived: false });
    data.public.versions.push({ id: `${id}-v1`, flowId: id, number: 1, parentVersionId: null, title: flow.title, summary: '합성', items: flow.items,
      source: { kind: 'user-text', label: '합성', url: null, checkedAt: null }, createdBy: A, createdAt: NOW });
  }
  assert(validateProgramData(data));
  return data;
}
const versionOf = (data: ProgramData, flowId: string) => data.public.versions.find(row => row.flowId === flowId)!;
function sheet(data: ProgramData, flowId: string) {
  const version = versionOf(data, flowId);
  return { versionId: version.id, itemIds: version.items.map(row => row.id), anchor: null,
    ...programImportRepeatChoice(programImportRepeats(data.spaces[B], version), { starts: {}, months: {} }, TODAY)! };
}
const lines = (data: ProgramData, docId: string) => M.getDocument(data.spaces[B].text, docId)!.lines.map(line => line.text);
const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('① the list card\'s first task reads as on the detail: words and chip, no `@`', () => {
  const data = catalog(), card = (flowId: string) => programFlowCardLines(data.public.flows.find(row => row.id === flowId)!, versionOf(data, flowId), { needsReview: false, inMyDocuments: false }).firstItem;
  assert.deepEqual(['exercise', 'english', 'car', 'passport'].map(card),
    ['첫 할 일 근력 운동 하기 · ↻ 매주 월·목', '첫 할 일 영어 단어 뜻 가리고 떠올리기 · ↻ 매일', '첫 할 일 자동차 정기검사 받기 · ↻ 24개월마다', '첫 할 일 여권 사진 준비하기']);
  const oil = { ...versionOf(data, 'car'), items: [FLOWS.car.items[1]] };
  assert.equal(programFlowCardLines(data.public.flows.find(row => row.id === 'car')!, oil, { needsReview: false, inMyDocuments: false }).firstItem, '첫 할 일 엔진오일 교환하기 · 가져올 때 주기 고름');
});

test('② a later import of a repeat-only Flow into another document has nothing to put in: refused, so the sheet keeps the button off and says why', () => {
  let data = ok(importProgramPublicVersion(catalog(), { ...base(catalog()), ...sheet(catalog(), 'car') })).data;
  const mine = ok(createProgramDocument(data, { ...base(data), title: '여권 메모', raw: '내 메모' }));
  data = mine.data;
  const copy = data.spaces[B].copies.find(row => row.flowId === 'car')!;
  assert.deepEqual(copy.includedItemIds, [], 'the repeat items went in as my lines, not copy items');
  const again = importProgramPublicVersion(data, { ...base(data), versionId: 'car-v1', itemIds: copy.includedItemIds, anchor: null, targetDocumentId: mine.result });
  assert(!again.ok && again.reason === 'invalid', 'what the button did before: a refusal shown as 저장하지 못했습니다');
  const discovery = source('../../../components/flow/integrated-poc/ProgramDiscovery.tsx');
  assert(discovery.includes('const nothingForTarget = importDestination === \'existing\' && !!targetDocumentId && !targetItems.length;'));
  assert(discovery.includes('const targetItems = !version ? [] : storedCopy ? storedVersion?.items.filter(row => storedCopy.includedItemIds.includes(row.id)) ?? []'));
  assert(discovery.includes('disabled={pending || !canUseVersion || !repeatChoice || nothingToImport || nothingForTarget ||'), 'the button is off');
  assert(discovery.includes('!repeatChoice || nothingToImport || nothingForTarget) return;'), 'and the press does nothing');
  assert(discovery.includes(": <p className={styles.repeatNone} data-import-nothing>{nothingReason}</p>)}"));
  assert(discovery.includes("' 반복 할 일은 처음 가져올 때 내 반복 줄로 들어가 있습니다.'") && discovery.includes('넣을 할 일이 없습니다.'));
});

test('③ an empty document starts writing from a press anywhere on its reading view, past the guards a tap already has', () => {
  const vendor = source('./vendor/text-editor.cjs');
  const tap = vendor.slice(vendor.indexOf('function editReadingPoint('), vendor.indexOf('function applyFoldView('));
  const empty = tap.indexOf("if (!row && textarea.value === '' && viewport.contains(event.target)) {");
  assert(empty > 0 && empty < tap.indexOf('if (!row || row.hidden || !mirror.contains(row)) return;'));
  assert(tap.indexOf('if (!readingView || foldedIds.size || composing || gesture || moveState || event.defaultPrevented ||') < empty, 'composing, a gesture, a fold or a long press still win');
  assert(tap.indexOf('if (visibleSelection && !visibleSelection.isCollapsed) return;') < empty, 'selecting text still wins');
  const body = tap.slice(empty, tap.indexOf('if (!row || row.hidden'));
  for (const step of ['event.preventDefault();', 'textarea.setSelectionRange(0, 0);', 'remember();', 'textarea.focus({ preventScroll: true });', 'render();', 'return;']) assert(body.includes(step), step);
});

test('④ a repeat item\'s caution comes along as its own memo line; a line imported before is left as it was', () => {
  assert.deepEqual(programImportCautions(FLOWS.exercise.items[0].description), [CAUTION]);
  assert.deepEqual(programImportCautions('주의: 무리하지 않습니다.\n주의 깊게 봅니다.'), ['주의: 무리하지 않습니다.'], 'only a labelled caution line');
  const data = catalog(), done = ok(importProgramPublicVersion(data, { ...base(data), ...sheet(data, 'exercise') }));
  const copy = done.data.spaces[B].copies.find(row => row.flowId === 'exercise')!;
  assert.deepEqual(lines(done.data, copy.documentId).slice(1), [
    '- [ ] 근력 운동 하기 @매주 월 목', '  - 날짜: 2026-11-05', '  - 메모: ‘근력·유산소 운동 반복하기’에서 · 몸의 큰 근육을 두루 쓰는 근력 운동을 중간 강도 이상으로 합니다.', `  - 메모: ${CAUTION}`,
    '- [ ] 빠르게 걷기 30분 @매주 월 화 수 목 금', '  - 날짜: 2026-11-05', '  - 메모: ‘근력·유산소 운동 반복하기’에서 · 숨이 조금 차는 중강도 유산소 활동을 30분 합니다.', `  - 메모: ${CAUTION}`]);
  const strength = M.tasks(done.data.spaces[B].text).find(task => task.title.startsWith('근력'))!;
  assert.equal(strength.note, `‘근력·유산소 운동 반복하기’에서 · 몸의 큰 근육을 두루 쓰는 근력 운동을 중간 강도 이상으로 합니다.\n${CAUTION}`, 'read as the task\'s memo');
  assert.equal(programFlowProgress(done.data, B, 'exercise', TODAY)?.repeats, 2, '내 진행 still finds both lines');
  const english = ok(importProgramPublicVersion(data, { ...base(data), ...sheet(data, 'english') }));
  assert.equal(lines(english.data, english.data.spaces[B].copies.find(row => row.flowId === 'english')!.documentId).filter(line => line.startsWith('  - 메모:')).length, 1, 'no caution, no extra line');
  // 되돌리기 takes the caution line with the rest.
  const mine = ok(createProgramDocument(data, { ...base(data), title: '내 운동', raw: '운동 메모' }));
  const into = ok(importProgramPublicVersion(mine.data, { ...base(mine.data), ...sheet(mine.data, 'exercise'), targetDocumentId: mine.result }));
  const taken = into.data.spaces[B].copies.find(row => row.flowId === 'exercise')!;
  const batch = captureProgramImportLinks(B, taken.id, mine.result, mine.data.spaces[B], into.data.spaces[B]);
  assert(batch.repeat?.every(row => row.lines.some(line => line.id.endsWith(':caution'))));
  assert.deepEqual(lines(ok(unlinkProgramImportLines(into.data, batch)).data, mine.result), ['운동 메모']);
  // Imported before this change (no caution line): taking the Flow again writes nothing over it.
  const old = { ...done.data, spaces: { ...done.data.spaces, [B]: { ...done.data.spaces[B], text: M.editText(done.data.spaces[B].text, copy.documentId,
    M.raw(M.getDocument(done.data.spaces[B].text, copy.documentId)).split('\n').filter(line => line !== `  - 메모: ${CAUTION}`).join('\n')) } } };
  const before = lines(old, copy.documentId);
  assert(programImportRepeats(old.spaces[B], versionOf(old, 'exercise')).every(row => row.existing), 'both are lines I already repeat');
  const target = ok(createProgramDocument(old, { ...base(old), title: '다른 문서', raw: '다른 메모' }));
  const reimport = importProgramPublicVersion(target.data, { ...base(target.data), ...sheet(target.data, 'exercise'), targetDocumentId: target.result });
  assert.deepEqual(lines(reimport.ok ? reimport.data : target.data, copy.documentId), before, 'the earlier lines stay as they were');
});
