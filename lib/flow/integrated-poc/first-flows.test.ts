import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProgramData } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { createProgramDocument } from './private-space';
import { PROGRAM_FIRST_FLOWS_LIMIT, programFirstOfficialFlows } from './first-flows';

// 첫인상 (11/7): an empty account's first screen shows up to three Flows the official list marks as FlowMe's.
// The synthetic data's own actors stand for the listed ids (the label compares ids only).
const OFFICIAL = 'creator-minji', OTHER = 'participant-jihun';
function withFlows(rows: { id: string; owner?: string; at: string; archived?: boolean }[], data = createProgramData()): ProgramData {
  for (const row of rows) {
    const owner = row.owner ?? OFFICIAL;
    data.public.flows.push({ id: row.id, ownerId: owner, currentVersionId: `${row.id}-v1`, category: '생활', situations: ['집'], derivedFrom: null, archived: !!row.archived });
    data.public.versions.push({ id: `${row.id}-v1`, flowId: row.id, number: 1, parentVersionId: null, title: `${row.id} 제목`, summary: `${row.id} 소개`,
      items: [{ id: `${row.id}-t`, title: '첫 할 일', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] }],
      source: { kind: 'user-text', label: 'FlowMe 정리', url: null, checkedAt: null }, createdBy: owner, createdAt: row.at });
  }
  assert(validateProgramData(data));
  return data;
}
const rows = [{ id: 'a', at: '2026-11-01T00:00:00.000Z' }, { id: 'b', at: '2026-11-04T00:00:00.000Z' }, { id: 'c', at: '2026-11-03T00:00:00.000Z' },
  { id: 'd', at: '2026-11-02T00:00:00.000Z' }, { id: 'gone', at: '2026-11-06T00:00:00.000Z', archived: true }, { id: 'theirs', owner: OTHER, at: '2026-11-05T00:00:00.000Z' }];

test('an empty account gets the newest three official Flows, as Flow 찾기 orders and marks them', () => {
  const data = withFlows(rows), actor = data.activeActorId;
  const cards = programFirstOfficialFlows(data, actor, [OFFICIAL]);
  assert.equal(PROGRAM_FIRST_FLOWS_LIMIT, 3);
  assert.deepEqual(cards.map(card => card.flowId), ['b', 'c', 'd'], 'newest first; archived and not-official left out');
  assert.deepEqual(cards[0].lines, { title: 'b 제목', badge: null, summary: 'b 소개', firstItem: '첫 할 일 첫 할 일', meta: '할 일 1개 · 날짜 미정 · 생활 · 집', source: '출처 FlowMe 정리' });
});

test('no card when the official list was not read (empty); the list alone decides which Flows count', () => {
  const data = withFlows(rows), actor = data.activeActorId;
  assert.deepEqual(programFirstOfficialFlows(data, actor, []), []);
  assert.deepEqual(programFirstOfficialFlows(data, actor, [OTHER]).map(card => card.flowId), ['theirs']);
  assert.deepEqual(programFirstOfficialFlows(data, actor, ['member-00000000-0000-4000-8000-000000000009']), []);
});

test('only an account with no document at all', () => {
  let data = withFlows(rows); const actor = data.activeActorId;
  const made = createProgramDocument(data, { actorId: actor, requestId: 'first-doc', expectedSpace: data.spaces[actor], title: '첫 글', raw: '메모' });
  assert(made.ok); data = made.data;
  assert.deepEqual(programFirstOfficialFlows(data, actor, [OFFICIAL]), []);
  assert.deepEqual(programFirstOfficialFlows(withFlows(rows), 'nobody', [OFFICIAL]), [], 'no space, no cards');
});

test('the empty screen shows them under its two buttons; a card only opens the Flow detail (nothing saved)', () => {
  const space = readFileSync(join(process.cwd(), 'components/flow/integrated-poc/ProgramSpace.tsx'), 'utf8').replace(/\r\n/g, '\n');
  assert(space.includes("const firstFlows = !selected && props.capabilities?.discovery !== false ? programFirstOfficialFlows(data, actorId, officialActors) : [];"));
  const block = space.slice(space.indexOf('{firstFlows.length > 0 &&'), space.indexOf('</section>}', space.indexOf('{firstFlows.length > 0 &&')));
  assert(block.includes("onClick={() => props.navigate({ view: 'flow', id: flowId })}"));
  for (const write of ['mutate', 'run(', 'onUseVersion', 'import']) assert(!block.includes(write), write);
  assert(space.indexOf('>Flow 찾기</button>}') < space.indexOf('{firstFlows.length > 0 &&'), 'under the buttons');
});
