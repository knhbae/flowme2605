import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProgramData, ProgramPublicItem, PublicSchedule } from './contract';
import { createProgramData, validateProgramData, validateProgramSchedule } from './program-data';
import { applyProgramCopyKindChange, importProgramPublicVersion, previewProgramCopyKindChange } from './private-space';
import { executeAlphaSocialIntent } from './alpha-social/dispatch';

// inbox/import-invalid-diag-20261031.md: a public version mixing a timed ordinary task and a series could not be
// imported or switched (N1 onward). The full data check accepts an ordinary schedule's optional timing; the copy
// recurrence source read (public-copy-recurrence publicItem) did not, so every copy that reads the whole version failed.
const ACTOR = 'local-user', OWNER = 'creator-minji', NOW = '2026-10-31T01:00:00.000Z';
type Ordinary = Exclude<PublicSchedule, { kind: 'recurring' }>;
const at9 = { version: 1 as const, time: '09:00', timeZone: null };
const daily: PublicSchedule = { kind: 'recurring', version: 1, rule: { version: 1, semantics: 'authoring-v1', frequency: 'daily', interval: 1, end: null },
  start: { kind: 'undated' }, time: null, timeZone: null };
const item = (id: string, schedule: PublicSchedule): ProgramPublicItem => ({ id, title: `할 일 ${id}`, description: '', completionCriteria: '', sourceUrl: null, schedule, subchecks: [] });
function published(versions: ProgramPublicItem[][]): ProgramData {
  const data = createProgramData();
  data.public.flows.push({ id: 'mix', ownerId: OWNER, currentVersionId: `mix-v${versions.length}`, category: '생활', situations: [], derivedFrom: null, archived: false });
  versions.forEach((items, index) => data.public.versions.push({ id: `mix-v${index + 1}`, flowId: 'mix', number: index + 1, parentVersionId: index ? `mix-v${index}` : null,
    title: '섞인 Flow', summary: '요약', items, source: { kind: 'user-text', label: '직접 정리', url: null, checkedAt: null }, createdBy: OWNER, createdAt: NOW }));
  return data;
}
const importing = (data: ProgramData, itemIds: string[], versionId = 'mix-v1') =>
  importProgramPublicVersion(data, { actorId: ACTOR, requestId: `import-${itemIds.join('-')}`, expectedSpace: data.spaces[ACTOR], versionId, itemIds, anchor: '2026-12-01' });

test('a version mixing a timed ordinary task and a series imports in every arrangement the diagnosis listed', () => {
  const cases: [string, ProgramPublicItem[], string[]][] = [
    ['timed fixed + series', [item('t', { kind: 'fixed', date: '2026-12-03', timing: at9 }), item('r', daily)], ['t', 'r']],
    ['series + timed fixed (order reversed)', [item('r', daily), item('t', { kind: 'fixed', date: '2026-12-03', timing: at9 })], ['r', 't']],
    ['fixed without timing + series (control)', [item('t', { kind: 'fixed', date: '2026-12-03' }), item('r', daily)], ['t', 'r']],
    ['timing with time null + series', [item('t', { kind: 'fixed', date: '2026-12-03', timing: { version: 1, time: null, timeZone: null } }), item('r', daily)], ['t', 'r']],
    ['only the series chosen from a mixed version', [item('t', { kind: 'fixed', date: '2026-12-03', timing: at9 }), item('r', daily)], ['r']],
    ['only the timed task chosen', [item('t', { kind: 'fixed', date: '2026-12-03', timing: at9 }), item('r', daily)], ['t']],
    ['relative and undated with timing + series', [item('a', { kind: 'relative', days: -3, timing: at9 }), item('u', { kind: 'undated', timing: { version: 1, time: '18:30', timeZone: 'Asia/Seoul' } }), item('r', daily)], ['a', 'u', 'r']],
  ];
  for (const [name, items, chosen] of cases) {
    const result = importing(published([items]), chosen);
    assert(result.ok, `${name}: ${result.ok ? '' : result.reason}`);
    assert(validateProgramData(result.data), name);
    const doc = result.data.spaces[ACTOR].text.flows[0];
    if (chosen.includes('t') && items.some(row => row.id === 't' && row.schedule.kind !== 'recurring' && row.schedule.timing?.time)) assert(doc.lines.some(line => line.text === '  - 시간: 09:00'), name);
  }
});

test('the copy read and the full data check judge every ordinary schedule × timing the same way', () => {
  const timings: [string, unknown][] = [['none', undefined], ['09:00', at9], ['time null', { version: 1, time: null, timeZone: null }], ['zone', { version: 1, time: '09:00', timeZone: 'Asia/Seoul' }],
    ['25:00', { version: 1, time: '25:00', timeZone: null }], ['9:00', { version: 1, time: '9:00', timeZone: null }], ['version 2', { version: 2, time: '09:00', timeZone: null }],
    ['bad zone', { version: 1, time: '09:00', timeZone: 'Not/AZone' }], ['extra key', { version: 1, time: '09:00', timeZone: null, note: 'x' }]];
  const kinds: Ordinary[] = [{ kind: 'undated' }, { kind: 'fixed', date: '2026-12-03' }, { kind: 'relative', days: 2 }];
  let checked = 0;
  for (const kind of kinds) for (const [name, timing] of timings) {
    const schedule = (timing === undefined ? { ...kind } : { ...kind, timing }) as PublicSchedule;
    const full = validateProgramSchedule(schedule);
    // The copy read runs when the series is copied; a rejected schedule makes the public data itself invalid first.
    const copied = importing(published([[item('o', schedule), item('r', daily)]]), ['r']);
    assert.equal(copied.ok, full, `${kind.kind} · ${name}`);
    checked++;
  }
  assert.equal(checked, 27);
  // Unknown keys on the schedule itself stay refused by both.
  const extra = { kind: 'fixed', date: '2026-12-03', note: 'x' } as unknown as PublicSchedule;
  assert.equal(validateProgramSchedule(extra), false);
  assert.equal(importing(published([[item('o', extra), item('r', daily)]]), ['r']).ok, false);
});

test('switching a copy item between ordinary and series works with a timed task in the version (three diagnosis cases)', () => {
  const timed = item('t', { kind: 'fixed', date: '2026-12-03', timing: at9 }), plain = item('p', { kind: 'fixed', date: '2026-12-05' });
  const cases: [string, ProgramPublicItem[], ProgramPublicItem[], string][] = [
    ['timed ordinary → series', [timed, item('r', daily)], [{ ...timed, schedule: daily }, item('r', daily)], 't'],
    ['series → timed ordinary', [item('s', daily), timed], [item('s', { kind: 'fixed', date: '2026-12-04', timing: at9 }), timed], 's'],
    ['plain ordinary → series beside a timed task', [plain, timed], [{ ...plain, schedule: daily }, timed], 'p'],
  ];
  for (const [name, v1, v2, switched] of cases) {
    const data = importing(published([v1, v2]), v1.map(row => row.id));
    assert(data.ok, `${name} import`);
    const copy = data.data.spaces[ACTOR].copies[0];
    const preview = previewProgramCopyKindChange(data.data, { actorId: ACTOR, copyId: copy.id, itemId: switched, versionId: 'mix-v2' });
    assert(preview.ok, `${name} preview ${preview.ok ? '' : preview.reason}`);
    const before = data.data.spaces[ACTOR];
    const applied = applyProgramCopyKindChange(data.data, { actorId: ACTOR, requestId: `kind-${switched}`, expectedSpace: before, confirmed: true, at: NOW, preview: preview.result });
    assert(applied.ok, `${name} apply ${applied.ok ? '' : applied.reason}`);
    assert(validateProgramData(applied.data), name);
    // The other task's time line and ID stay; progress records are untouched.
    const other = v1.find(row => row.id !== switched)!, otherLine = copy.itemLines[other.id];
    const findLine = (space: typeof before, id: string) => [...space.text.documents, ...space.text.flows].flatMap(doc => doc.lines).find(line => line.id === id);
    assert.deepEqual(findLine(applied.data.spaces[ACTOR], otherLine), findLine(before, otherLine), name);
    assert.deepEqual(applied.data.spaces[ACTOR].text.progressRecords, before.text.progressRecords, name);
    // The server runs the same switch through the shared social dispatch.
    const server = executeAlphaSocialIntent(data.data, ACTOR, { type: 'copy-kind', copyId: copy.id, versionId: 'mix-v2', itemId: switched }, `server-kind-${switched}`, NOW);
    assert(server.ok, `${name} server ${server.ok ? '' : server.reason}`);
  }
});

test('the server copy-import through the shared social dispatch succeeds on the mixed version', () => {
  const data = published([[item('t', { kind: 'fixed', date: '2026-12-03', timing: at9 }), item('r', daily)]]);
  const server = executeAlphaSocialIntent(data, ACTOR, { type: 'copy-import', versionId: 'mix-v1', itemIds: ['t', 'r'], anchor: null }, 'server-import', NOW);
  assert(server.ok, server.ok ? '' : server.reason);
  assert(validateProgramData(server.data));
});
