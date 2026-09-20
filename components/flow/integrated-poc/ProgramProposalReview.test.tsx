import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import type { ProgramData, ProgramPublicItem, ProgramTransition } from '../../../lib/flow/integrated-poc/contract';
import { publishProgramFlow, createProgramProposal, reviewProgramProposal } from '../../../lib/flow/integrated-poc/publication';
import { compareProgramProposal, programProposalComparisonValue } from '../../../lib/flow/integrated-poc/proposal-comparison';
import { programRecurringScheduleFromDraft } from '../../../lib/flow/integrated-poc/public-recurrence-contract';
import type { ProgramProposalReview as Component } from './ProgramProposalReview';
const url = new URL('./ProgramProposalReview.tsx', import.meta.url), source = readFileSync(url, 'utf8'), require = createRequire(url);
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
const loaded = { exports: {} as { ProgramProposalReview: typeof Component } };
vm.runInThisContext(`(function(module,exports,require){${compiled.outputText}\n})`)(loaded, loaded.exports, (id: string) => id.endsWith('.css') ? { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) } : require(id));
test('review SSR renders proposal comparison without storage or mutation', () => {
  const data = createProgramData(); let calls = 0;
  const proposal = { id: 'proposal-ssr', authorId: 'participant-jihun', flowId: 'flow-ssr', baseVersionId: 'version-ssr', itemId: 'item-ssr', reason: '보완 이유', patch: { description: '보완 설명' }, status: 'submitted' as const, reviewNote: '', reviewedBy: null, resultVersionId: null, createdAt: '2026-09-12T00:00:00.000Z', updatedAt: '2026-09-12T00:00:00.000Z' };
  const html = renderToStaticMarkup(<loaded.exports.ProgramProposalReview data={data} proposal={proposal} mutate={async () => { calls++; return { ok: false, reason: 'invalid' }; }} navigate={() => { calls++; }} />);
  assert(html.includes('보완 이유')); assert(html.includes('보완 설명')); assert.equal(calls, 0);
});

test('recurring review shows all original facts and enables only a nonconflicting acceptance', () => {
  const { data, proposal } = versions();
  const original = programRecurringScheduleFromDraft({ version: 1, raw: '매주 화, 목', end: '8회', startKind: 'fixed', startValue: '2026-12-01', time: '07:00', timeZone: 'Asia/Seoul' }); assert(original);
  for (const version of data.public.versions) version.items[0].schedule = structuredClone(original);
  const changed = programRecurringScheduleFromDraft({ version: 1, raw: '매월 15일', end: '4회', startKind: 'relative', startValue: '-3', time: '09:00', timeZone: 'UTC' }); assert(changed);
  proposal.patch = { schedule: changed };
  const before = JSON.stringify(data); let calls = 0;
  const html = renderToStaticMarkup(<loaded.exports.ProgramProposalReview data={data} proposal={proposal}
    mutate={async () => { calls++; return { ok: false, reason: 'unexpected' }; }} navigate={() => { calls++; }} />);
  for (const text of ['매주 화, 목', '8회', '2026-12-01 시작', '07:00', 'Asia/Seoul', '매월 15일', '4회', '기준일 -3일 시작', '09:00', 'UTC', '기준 값 유지 중 · 변경 제안']) assert(html.includes(text), text);
  assert(!html.includes('반복 공개 연결을 마치기 전에는 새 판본을 만들 수 없습니다'));
  assert(!html.includes('최신 내용과 충돌해 그대로 채택할 수 없습니다'));
  const accept = /<button([^>]*)>채택하고 새 판본 공개<\/button>/.exec(html); assert(accept); assert.doesNotMatch(accept[1], /disabled|aria-describedby/);
  for (const label of ['보류', '반영하지 않기']) { const action = new RegExp(`<button([^>]*)>${label}</button>`).exec(html); assert(action); assert.doesNotMatch(action[1], /disabled/); }
  assert.equal(calls, 0); assert.equal(JSON.stringify(data), before);
});

test('recurring source conflict takes precedence over the rollout restriction and preserves exact comparison', () => {
  const { data, proposal } = versions();
  const original = programRecurringScheduleFromDraft({ version: 1, raw: '매일', end: '', startKind: 'undated', startValue: '', time: '', timeZone: '' }); assert(original);
  data.public.versions[0].items[0].schedule = original;
  data.public.versions[1].items[0].schedule = { ...structuredClone(original), time: '09:00' };
  proposal.patch = { schedule: { ...structuredClone(original), time: '10:00' } };
  const html = renderToStaticMarkup(<loaded.exports.ProgramProposalReview data={data} proposal={proposal}
    mutate={async () => { throw Error('render cannot write'); }} navigate={() => { throw Error('render cannot navigate'); }} />);
  assert(html.includes('최신 내용과 충돌해 그대로 채택할 수 없습니다')); assert(!html.includes('반복 공개 연결을 마치기 전에는'));
  for (const value of ['매일', '종료 미정', '시작일 미정', '09:00', '10:00']) assert(html.includes(value));
});
test('editor has synchronous submit lock, composition guard, capture and explicit conflict reconfirm paths', () => {
  assert(source.includes('busyRef.current = true; setBusy(true); readonly();'));
  assert(source.includes('composing.current || sourceConflict || privateConflict'));
  assert(source.includes('if (input.current && !composing.current) input.current.readOnly'));
  assert(source.includes('captureDrafts:')); assert(source.includes('blocksExternalSnapshot:'));
  assert(source.includes('history: false')); assert(source.includes('변경 내용을 확인했고 내 의견으로 계속 검토'));
  assert(source.includes('submitProgramProposalReviewDraft')); assert(source.includes('input.current?.value'));
});

function result<T>(transition: ProgramTransition<T>) { if (!transition.ok) throw new Error(transition.reason); return transition; }
function versions() {
  const item: ProgramPublicItem = { id: 'exact-item', title: '원래 항목', description: '', completionCriteria: '기존 완료 기준', sourceUrl: null, schedule: { kind: 'relative', days: -2 }, subchecks: [] };
  const fields = { actorId: 'local-user', title: '비교 검증', summary: '', category: '생활', situations: [], items: [item], source: { kind: 'simulated-example' as const, label: '명시 가상 검증', url: null, checkedAt: null } };
  const first = result(publishProgramFlow(createProgramData(), { ...fields, requestId: 'compare-v1' }, '2026-09-12T00:00:00.000Z'));
  const flowId = first.data.public.flows[0].id;
  const proposalResult = result(createProgramProposal(first.data, { actorId: 'participant-jihun', requestId: 'compare-proposal', flowId, baseVersionId: first.result, itemId: item.id, reason: '설명 개선', patch: { description: '제안한 설명', schedule: { kind: 'fixed', date: '2026-09-20' } } }, '2026-09-12T01:00:00.000Z'));
  const next = result(publishProgramFlow(proposalResult.data, { ...fields, requestId: 'compare-v2', flowId, expectedVersionId: first.result, items: [{ ...item, description: '먼저 수정된 최신 설명', completionCriteria: '새 완료 기준' }] }, '2026-09-12T02:00:00.000Z'));
  return { data: next.data, proposal: next.data.public.proposals[0], item, latestId: next.result, flowId };
}
test('exact immutable identities show conflict and unchanged fields without mutating source or private space', () => {
  const { data, proposal } = versions(), before = JSON.stringify(data);
  const comparison = compareProgramProposal(data, proposal);
  assert.equal(comparison.issue, null);
  assert.equal(comparison.base?.number, 1); assert.equal(comparison.latest?.number, 2);
  assert.deepEqual(comparison.rows.map(row => [row.field, row.state]), [['title', 'keep-latest'], ['description', 'conflict'], ['completionCriteria', 'keep-latest'], ['schedule', 'proposed'], ['subchecks', 'keep-latest']]);
  assert.equal(comparison.rows[1].base, ''); assert.equal(comparison.rows[1].latest, '먼저 수정된 최신 설명');
  assert.equal(JSON.stringify(data), before);
});
test('same-looking replacement item never stands in for removed latest identity', () => {
  const { data, proposal } = versions(), latest = data.public.versions.at(-1)!;
  latest.items[0] = { ...latest.items[0], id: 'different-item-same-title' };
  const comparison = compareProgramProposal(data, proposal);
  assert.equal(comparison.issue, 'latest-item-removed'); assert.equal(comparison.current, undefined);
  assert(comparison.rows.every(row => row.state === 'unavailable'));
});
test('wrong Flow version links and duplicate item/version identities do not produce comparisons', () => {
  for (const corrupt of ['base-flow', 'latest-flow', 'duplicate-version', 'duplicate-item', 'missing-flow', 'base-item'] as const) {
    const { data, proposal } = versions();
    if (corrupt === 'base-flow') data.public.versions[0].flowId = 'another-flow';
    if (corrupt === 'latest-flow') data.public.versions[1].flowId = 'another-flow';
    if (corrupt === 'duplicate-version') data.public.versions.push(structuredClone(data.public.versions[0]));
    if (corrupt === 'duplicate-item') data.public.versions[1].items.push(structuredClone(data.public.versions[1].items[0]));
    if (corrupt === 'missing-flow') data.public.flows = [];
    if (corrupt === 'base-item') data.public.versions[0].items = [];
    assert.equal(compareProgramProposal(data, proposal).issue, 'invalid-link', corrupt);
  }
});
test('comparison leaves acceptance conflict policy intact, including latest equal to proposal', () => {
  for (const sameAsProposal of [false, true]) {
    const { data, proposal, latestId } = versions();
    if (sameAsProposal) data.public.versions.at(-1)!.items[0].description = proposal.patch.description!;
    const before = JSON.stringify(data);
    assert.equal(compareProgramProposal(data, proposal).rows[1].state, 'conflict');
    const outcome = reviewProgramProposal(data, { actorId: 'local-user', proposalId: proposal.id, decision: 'accept', expectedVersionId: latestId, note: '비교만 확인' }, '2026-09-12T03:00:00.000Z');
    assert.equal(outcome.ok, false); if (!outcome.ok) assert.equal(outcome.reason, 'conflict');
    assert.equal(JSON.stringify(data), before);
  }
});
test('format preserves empty, fixed, relative, undated and disconnected values distinctly', () => {
  assert.equal(programProposalComparisonValue(''), '(비어 있음)');
  assert.equal(programProposalComparisonValue(undefined), '연결된 항목 없음');
  assert.equal(programProposalComparisonValue({ kind: 'fixed', date: '2026-09-20' }), '고정일 2026-09-20');
  assert.equal(programProposalComparisonValue({ kind: 'relative', days: -2 }), '기준일 -2일');
  assert.equal(programProposalComparisonValue({ kind: 'relative', days: 0 }), '기준일 +0일');
  assert.equal(programProposalComparisonValue({ kind: 'undated' }), '날짜 미정');
});
test('comparison SSR keeps full long text, keyboard disclosure, exact version navigation and zero mutations', () => {
  const { data, proposal } = versions(); let calls = 0;
  data.public.versions[1].items[0].description = '긴내용'.repeat(1500) + '\n<script>not executable</script>';
  const before = JSON.stringify(data);
  const html = renderToStaticMarkup(<loaded.exports.ProgramProposalReview data={data} proposal={proposal} mutate={async () => { calls++; return { ok: false, reason: 'invalid' }; }} navigate={() => { calls++; }} />);
  for (const text of ['기준 · 1판', '최신 · 2판', '최신 값이 바뀜 · 채택 충돌', '제안한 설명', '새 완료 기준', '(비어 있음)', '최신 2판 열기', '<summary>제안하지 않은 항목 내용 확인</summary>', '긴내용'.repeat(1500), '&lt;script&gt;']) assert(html.includes(text), text.slice(0, 80));
  assert.equal(calls, 0); assert.equal(JSON.stringify(data), before);
  const css = readFileSync(new URL('./ProgramCommunity.module.css', import.meta.url), 'utf8');
  assert(css.includes('repeat(3, minmax(0, 1fr))')); assert(css.includes('.proposalCompareValues { grid-template-columns: minmax(0, 1fr)'));
  assert(css.includes('white-space: pre-wrap; overflow-wrap: anywhere;'));
});
test('removed/latest invalid-link SSR explains unavailable identity rather than an empty editable value', () => {
  for (const removed of [false, true]) {
    const { data, proposal } = versions();
    if (removed) data.public.versions[1].items = []; else data.public.versions[1].flowId = 'wrong-flow';
    const html = renderToStaticMarkup(<loaded.exports.ProgramProposalReview data={data} proposal={proposal} mutate={async () => { throw new Error('no writes'); }} navigate={() => { throw new Error('no navigation'); }} />);
    assert(html.includes(removed ? '최신 판본에는 이 항목이 없습니다.' : 'Flow·판본·항목 연결을 확인할 수 없습니다.'));
  }
});

test('known field conflict disables only acceptance and connects the precise reason without writes', () => {
  for (const sameAsProposal of [false, true]) {
    const { data, proposal } = versions(); let calls = 0;
    if (sameAsProposal) data.public.versions.at(-1)!.items[0].description = proposal.patch.description!;
    const before = JSON.stringify(data);
    const html = renderToStaticMarkup(<loaded.exports.ProgramProposalReview data={data} proposal={proposal}
      mutate={async () => { calls++; return { ok: false, reason: 'unexpected' }; }} navigate={() => { calls++; }} />);
    const accept = /<button([^>]*)>채택하고 새 판본 공개<\/button>/.exec(html);
    assert(accept); assert.match(accept[1], /disabled=""/); assert.match(accept[1], /aria-describedby="[^"]+"/);
    assert(html.includes('최신 내용과 충돌해 그대로 채택할 수 없습니다. 보류하거나 반영하지 않을 수 있습니다.'));
    for (const label of ['보류', '반영하지 않기']) {
      const action = new RegExp(`<button([^>]*)>${label}</button>`).exec(html); assert(action); assert.doesNotMatch(action[1], /disabled/);
    }
    assert.equal(calls, 0); assert.equal(JSON.stringify(data), before);
  }
});

test('missing latest item disables acceptance while preserving review and exact original navigation', () => {
  const { data, proposal } = versions(); data.public.versions.at(-1)!.items = [];
  const html = renderToStaticMarkup(<loaded.exports.ProgramProposalReview data={data} proposal={proposal}
    mutate={async () => { throw Error('render cannot mutate'); }} navigate={() => { throw Error('render cannot navigate'); }} />);
  const accept = /<button([^>]*)>채택하고 새 판본 공개<\/button>/.exec(html); assert(accept);
  assert.match(accept[1], /disabled=""/); assert.match(accept[1], /aria-describedby="[^"]+"/);
  assert(html.includes('최신 판본에는 이 항목이 없습니다.'));
  assert.match(html, /<button type="button">제안한 판본·항목 열기<\/button>/);
  assert.match(html, /<button type="button">보류<\/button>/);
});

test('unrelated newer fields never disable an otherwise applicable old-version proposal', () => {
  const { data, proposal } = versions(); proposal.patch = { schedule: { kind: 'fixed', date: '2026-09-20' } };
  const html = renderToStaticMarkup(<loaded.exports.ProgramProposalReview data={data} proposal={proposal}
    mutate={async () => { throw Error('render cannot mutate'); }} navigate={() => { throw Error('render cannot navigate'); }} />);
  const accept = /<button([^>]*)>채택하고 새 판본 공개<\/button>/.exec(html); assert(accept);
  assert.doesNotMatch(accept[1], /disabled|aria-describedby/);
  assert.doesNotMatch(html, /최신 내용과 충돌해 그대로 채택할 수 없습니다/);
  assert(html.includes('채택하면 변경을 반영한 새 판본이 이 기기의 공개 목록에 생깁니다.'));
});

test('accepted proposal is not labelled an acceptance conflict after its own immutable version changes the latest value', () => {
  const f = versions(); f.proposal.patch = { schedule: { kind: 'fixed', date: '2026-09-20' } };
  const accepted = reviewProgramProposal(f.data, { actorId: 'local-user', proposalId: f.proposal.id, decision: 'accept', expectedVersionId: f.latestId }, '2026-09-14T00:00:00.000Z'); assert(accepted.ok);
  const proposal = accepted.data.public.proposals.find(row => row.id === f.proposal.id)!;
  for (const removedLater of [false, true]) {
    const data: ProgramData = structuredClone(accepted.data);
    if (removedLater) {
      const previous = data.public.versions.at(-1)!;
      data.public.versions.push({ ...structuredClone(previous), id: 'later-version', number: previous.number + 1, parentVersionId: previous.id, items: [] });
      data.public.flows.find(flow => flow.id === previous.flowId)!.currentVersionId = 'later-version';
    }
    const before: string = JSON.stringify(data);
    const html = renderToStaticMarkup(<loaded.exports.ProgramProposalReview data={data} proposal={proposal}
      mutate={async () => { throw Error('render cannot write'); }} navigate={() => { throw Error('render cannot navigate'); }} />);
    assert(html.includes('새 판본에 반영됨')); assert(html.includes('채택한 변경')); assert(html.includes('반영된 판본 열기'));
    assert(!html.includes('채택 충돌')); assert(!html.includes('채택하고 새 판본 공개')); assert(!html.includes('이 제안을 그대로 채택할 수 없습니다'));
    if (removedLater) assert(html.includes('제안이 반영된 판본과 당시 항목은 아래에서 열 수 있습니다'));
    assert.equal(JSON.stringify(data), before);
  }
});
