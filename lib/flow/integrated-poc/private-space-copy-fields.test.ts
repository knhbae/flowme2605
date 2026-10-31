import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProgramData, ProgramPublicItem, ProgramPublicVersion } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { applyProgramCopyVersion, compareProgramCopyVersion, importProgramPublicVersion, resolveProgramItemDate } from './private-space';
import { executeAlphaSocialIntent } from './alpha-social/dispatch';
import { programRecurringScheduleLabel } from './public-recurrence-contract';
import { programOrdinaryScheduleLabel } from './public-ordinary-time';

// FC2b (FC-SPEC.md, 총괄 결정 7 and D3): a new copy writes no empty field line and no '원문 제목:' line; old copies
// keep theirs, and comparison reads both shapes as the same values. Date and time lines stay.
const ACTOR = 'local-user', OWNER = 'creator-minji', NOW = '2026-10-31T01:00:00.000Z', ANCHOR = '2026-12-01';
type Schedule = ProgramPublicItem['schedule'];
const item = (id: string, title: string, schedule: Schedule, extra: Partial<ProgramPublicItem> = {}): ProgramPublicItem =>
  ({ id, title, description: '', completionCriteria: '', sourceUrl: null, schedule, subchecks: [], ...extra });
const daily: Extract<Schedule, { kind: 'recurring' }> = { kind: 'recurring', version: 1, rule: { version: 1, semantics: 'authoring-v1', frequency: 'daily', interval: 1, end: null },
  start: { kind: 'undated' }, time: null, timeZone: null };
const moveV1 = [
  item('pack', '짐 줄이기', { kind: 'relative', days: -3 }),
  item('move-in', '전입신고', { kind: 'fixed', date: '2026-12-03', timing: { version: 1, time: '09:00', timeZone: null } },
    { description: '주민센터 방문', completionCriteria: '확인증 받기', sourceUrl: 'https://example.org/move-in', subchecks: [{ id: 'move-in-id', title: '신분증' }] }),
  item('later', '정리하기', { kind: 'undated' }),
];
// 판본 2: an empty description gains a value.
const moveV2 = moveV1.map(row => row.id === 'pack' ? { ...row, description: '안 쓰는 물건부터 나눔' } : row);
const waterV1 = [item('water', '물 마시기', daily)];
const version = (flowId: string, number: number, items: ProgramPublicItem[]): ProgramPublicVersion => ({ id: `${flowId}-v${number}`, flowId, number,
  parentVersionId: number > 1 ? `${flowId}-v${number - 1}` : null, title: flowId, summary: '요약', items,
  source: { kind: 'user-text', label: '직접 정리', url: null, checkedAt: null }, createdBy: OWNER, createdAt: NOW });

function published(): ProgramData {
  const data = createProgramData();
  data.public.flows.push({ id: 'move', ownerId: OWNER, currentVersionId: 'move-v2', category: '생활', situations: [], derivedFrom: null, archived: false },
    { id: 'water', ownerId: OWNER, currentVersionId: 'water-v1', category: '건강', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push(version('move', 1, moveV1), version('move', 2, moveV2), version('water', 1, waterV1));
  return data;
}
function imported(flowId = 'move', data = published()) {
  const items = flowId === 'move' ? moveV1 : waterV1;
  const result = importProgramPublicVersion(data, { actorId: ACTOR, requestId: `import-${flowId}`, expectedSpace: data.spaces[ACTOR], versionId: `${flowId}-v1`, itemIds: items.map(row => row.id), anchor: ANCHOR });
  assert(result.ok, `import ${result.ok ? '' : result.reason}`);
  return result.data;
}
const copyOf = (data: ProgramData, flowId = 'move') => data.spaces[ACTOR].copies.find(copy => copy.flowId === flowId)!;
const docOf = (data: ProgramData, flowId = 'move') => data.spaces[ACTOR].text.flows.find(doc => doc.id === copyOf(data, flowId).documentId)!;
const textsOf = (data: ProgramData, flowId = 'move') => docOf(data, flowId).lines.map(line => line.text);
const scheduleText = (schedule: Schedule) => schedule.kind === 'recurring' ? programRecurringScheduleLabel(schedule) : programOrdinaryScheduleLabel(schedule);

/** The generated shape before FC2b: every field line, empty or not, '원문 제목:' included, right after the date/time lines. */
function toOldShape(data: ProgramData, flowId = 'move'): ProgramData {
  const next = structuredClone(data), copy = copyOf(next, flowId), doc = docOf(next, flowId);
  for (const source of flowId === 'move' ? moveV1 : waterV1) {
    const lineId = copy.itemLines[source.id];
    doc.lines = doc.lines.filter(line => !(line.id.startsWith(`${lineId}:`) && /:(title|description|completionCriteria|sourceUrl|schedule):\d+$/.test(line.id)));
    const values: [string, string, string][] = [['title', '원문 제목: ', source.title], ['description', '설명: ', source.description], ['completionCriteria', '완료 기준: ', source.completionCriteria],
      ['sourceUrl', '출처: ', source.sourceUrl ?? ''], ['schedule', '원문 일정: ', scheduleText(source.schedule)]];
    let at = doc.lines.findIndex(line => line.id === lineId) + 1;
    while (doc.lines[at] && [`${lineId}:date`, `${lineId}:time`].includes(doc.lines[at].id)) at++;
    doc.lines.splice(at, 0, ...values.map(([field, prefix, value]) => ({ id: `${lineId}:${field}:0`, text: `  ${prefix}${value}` })));
  }
  assert(validateProgramData(next), 'old shape is a valid copy');
  return next;
}
const compare = (data: ProgramData, versionId: string, flowId = 'move') => {
  const result = compareProgramCopyVersion(data, { actorId: ACTOR, copyId: copyOf(data, flowId).id, versionId });
  assert(result.ok); return result.result;
};
const field = (comparison: ReturnType<typeof compare>, itemId: string, name: string) => comparison.items.find(row => row.itemId === itemId)!.fields.find(row => row.field === name)!;
const apply = (data: ProgramData, itemIds: string[], fields: ('description' | 'title')[]) => {
  const result = applyProgramCopyVersion(data, { actorId: ACTOR, requestId: `apply-${itemIds.join('-')}`, expectedSpace: data.spaces[ACTOR], copyId: copyOf(data).id,
    versionId: 'move-v2', expectedBaseVersionId: 'move-v1', itemIds, fields });
  assert(result.ok, `apply ${result.ok ? '' : result.reason}`); return result.data;
};
const packDate = resolveProgramItemDate(moveV1[0], ANCHOR);

test('a new copy writes no empty field line and no 원문 제목 line; date, time, values and checks stay', () => {
  const lines = textsOf(imported());
  assert(!lines.some(line => /원문 제목:/.test(line)), lines.join('\n'));
  assert(!lines.some(line => /^\s*(설명|완료 기준|출처):\s*$/.test(line)), lines.join('\n'));
  const block = (title: string, size: number) => { const at = lines.findIndex(line => line.endsWith(title)); return lines.slice(at, at + size); };
  assert.deepEqual(block('짐 줄이기', 3), ['- [ ] 짐 줄이기', `  - 날짜: ${packDate}`, '  원문 일정: 기준일 -3일']);
  assert.deepEqual(block('전입신고', 8), ['- [ ] 전입신고', '  - 날짜: 2026-12-03', '  - 시간: 09:00', '  설명: 주민센터 방문', '  완료 기준: 확인증 받기',
    '  출처: https://example.org/move-in', `  원문 일정: ${scheduleText(moveV1[1].schedule)}`, '  - [ ] 신분증']);
  // '- 날짜: 미정' is not decoration: it stops a date from being inherited.
  assert.deepEqual(block('정리하기', 3), ['- [ ] 정리하기', '  - 날짜: 미정', '  원문 일정: 날짜 미정']);
  // A series keeps its head, which holds the title.
  const water = textsOf(imported('water'), 'water');
  assert.deepEqual(water.slice(water.indexOf('반복: 물 마시기'), water.indexOf('반복: 물 마시기') + 2), ['반복: 물 마시기', `  원문 일정: ${scheduleText(daily)}`]);
  assert(!water.some(line => /원문 제목:|^\s*(설명|완료 기준|출처):\s*$/.test(line)), water.join('\n'));
});

test('old and new shapes: an unchanged source reads 바뀐 것 없음 with no private change in any field', () => {
  for (const [shape, data, flowId, versions] of [['new move', imported(), 'move', ['move-v1', 'move-v2']], ['old move', toOldShape(imported()), 'move', ['move-v1', 'move-v2']],
    ['new series', imported('water'), 'water', ['water-v1']], ['old series', toOldShape(imported('water'), 'water'), 'water', ['water-v1']]] as const) {
    const same = compare(data, versions[0], flowId);
    for (const row of same.items) {
      assert.equal(row.state, 'unchanged', `${shape} ${row.itemId}`);
      for (const value of row.fields) assert(!value.sourceChanged && !value.privateChanged && value.alreadyApplied, `${shape} ${row.itemId} ${value.field}`);
    }
    if (versions.length < 2) continue;
    const next = compare(data, versions[1], flowId);
    assert.deepEqual(next.items.filter(row => row.state !== 'unchanged').map(row => row.itemId), ['pack'], shape);
    const description = field(next, 'pack', 'description');
    assert(description.sourceChanged && !description.privateChanged && description.canApply && !description.alreadyApplied, shape);
    for (const row of next.items) for (const value of row.fields) if (!(row.itemId === 'pack' && value.field === 'description')) assert(!value.privateChanged, `${shape} ${row.itemId} ${value.field}`);
  }
});

test('a value that appears later lands in import order: after date/time, before the source schedule', () => {
  const after = apply(imported(), ['pack'], ['description']), lines = textsOf(after), at = lines.indexOf('- [ ] 짐 줄이기');
  assert.deepEqual(lines.slice(at, at + 4), ['- [ ] 짐 줄이기', `  - 날짜: ${packDate}`, '  설명: 안 쓰는 물건부터 나눔', '  원문 일정: 기준일 -3일']);
  assert(field(compare(after, 'move-v2'), 'pack', 'description').alreadyApplied);
  // The old shape replaces its own empty line in place.
  const old = apply(toOldShape(imported()), ['pack'], ['description']), oldLines = textsOf(old), oldAt = oldLines.indexOf('- [ ] 짐 줄이기');
  assert.deepEqual(oldLines.slice(oldAt, oldAt + 4), ['- [ ] 짐 줄이기', `  - 날짜: ${packDate}`, '  원문 제목: 짐 줄이기', '  설명: 안 쓰는 물건부터 나눔']);
  assert(field(compare(old, 'move-v2'), 'pack', 'description').alreadyApplied);
});

test('applying keeps dates, times, line IDs and personal records; nothing is rewritten in bulk', () => {
  for (const data of [imported(), toOldShape(imported())]) {
    const before = docOf(data).lines.filter(line => /:(date|time)$/.test(line.id) || !line.id.includes(':'));
    const after = apply(data, ['pack'], ['description']), lines = docOf(after).lines;
    for (const line of before) assert.deepEqual(lines.find(row => row.id === line.id), line, line.id);
    assert.deepEqual(after.spaces[ACTOR].text.progressRecords, data.spaces[ACTOR].text.progressRecords);
    assert.deepEqual(copyOf(after).itemLines, copyOf(data).itemLines);
    // Other items' lines, old ones included, are untouched.
    const others = docOf(data).lines.filter(line => !line.id.startsWith(`${copyOf(data).itemLines.pack}:`) && line.id !== copyOf(data).itemLines.pack);
    for (const line of others) assert.deepEqual(lines.find(row => row.id === line.id), line, line.id);
  }
});

test('private edits stay private in both shapes: words after an empty 설명 line, a renamed task', () => {
  // Old shape: the user wrote after the generated empty '설명: ' line.
  const noted = toOldShape(imported());
  docOf(noted).lines.find(line => line.id === `${copyOf(noted).itemLines.pack}:description:0`)!.text = '  설명: 박스는 마트에서';
  const description = field(compare(noted, 'move-v2'), 'pack', 'description');
  assert(description.privateChanged && !description.canApply);
  // New shape: a user-written '설명:' note is not a generated line, so it stays the user's.
  // Renamed task, both shapes: the title is a private change when the source title changes.
  for (const data of [imported(), toOldShape(imported())]) {
    docOf(data).lines.find(row => row.id === copyOf(data).itemLines.pack)!.text = '- [ ] 짐 버리기';
    assert.equal(field(compare(data, 'move-v1'), 'pack', 'title').alreadyApplied, false);
    const renamed = { ...data, public: { ...data.public, versions: data.public.versions.map(row => row.id === 'move-v2' ? { ...row, items: row.items.map(i => i.id === 'pack' ? { ...i, title: '짐 정리' } : i) } : row) } };
    assert(field(compare(renamed, 'move-v2'), 'pack', 'title').privateChanged);
  }
});

test('the server runs the same import: copy-import through the shared social dispatch writes the same lines', () => {
  for (const flowId of ['move', 'water']) {
    const items = flowId === 'move' ? moveV1 : waterV1;
    const server = executeAlphaSocialIntent(published(), ACTOR, { type: 'copy-import', versionId: `${flowId}-v1`, itemIds: items.map(row => row.id), anchor: ANCHOR }, `server-${flowId}`, NOW);
    assert(server.ok, `server import ${flowId}`);
    assert(validateProgramData(server.data));
    assert.deepEqual(textsOf(server.data, flowId), textsOf(imported(flowId), flowId));
  }
});
