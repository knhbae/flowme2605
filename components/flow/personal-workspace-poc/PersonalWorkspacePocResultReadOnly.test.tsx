import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { materializePersonalWorkspacePocAuthoring } from '@/lib/flow/personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '@/lib/flow/personal-workspace-poc-state';
import { buildPersonalWorkspacePocResultProjection } from '@/lib/flow/personal-workspace-poc-result-projection';
import { PersonalWorkspacePocResultPresenter, type PersonalWorkspacePocResultPresenterProps } from './PersonalWorkspacePocResultPresenter';

function props(): PersonalWorkspacePocResultPresenterProps {
  const now = '2026-09-03T00:00:00.000Z';
  const made = materializePersonalWorkspacePocAuthoring({ handoffId: 'readonly-handoff', documentId: 'readonly-document', revisionId: 'readonly-revision',
    committedAt: now, rawText: '# 반복 읽기\n- [ ] 물 마시기\n  - 날짜: 2026-09-03\n  - 반복: 매일\n  - 반복 종료: 3회\n' });
  assert.ok(made.ok);
  const state = createPersonalWorkspacePocState(now);
  state.authoredFlows = [made.flow];
  state.authoringReceipts = [{ handoffId: made.flow.authoring.handoffId, flowRef: made.flow.ref, committedAt: now }];
  const result = buildPersonalWorkspacePocResultProjection({ model: { version: 1, flows: [made.flow] }, state,
    flowRef: made.flow.ref, localToday: '2026-09-03', purpose: 'personal-execution' });
  assert.ok(result.ok); assert.equal(result.projection.items.filter(item => item.occurrenceId).length, 3);
  return { projection: result.projection, navigation: { resultView: 'todo' },
    onResultViewChange() {}, onCalendarBaseDateChange() {}, onCalendarSelectedDateChange() {}, onOpenItem() {} };
}

test('C1 readonly presenter removes mutation controls but retains all recurrence rows and four views', () => {
  let writes = 0;
  const value = { ...props(), readOnly: true, onToggleOccurrence() { writes++; }, onMoveOccurrenceDate() { writes++; }, onRestoreOccurrenceDate() { writes++; } };
  for (const view of ['text', 'todo', 'calendar', 'sheet'] as const) {
    const html = renderToStaticMarkup(<PersonalWorkspacePocResultPresenter {...value} navigation={{ resultView: view }} />);
    assert.doesNotMatch(html, /personal-workspace-result-occurrence-actions|type="date"/);
    assert.equal((html.match(/role="tab"/g) ?? []).length, 4);
    assert.match(html, /data-result-open-item=/);
    if (view === 'text') assert.match(html, /내 사본의 실행 결과를 읽기 전용으로 확인합니다/);
  }
  assert.equal(writes, 0);
});

test('C1 omitted and false readonly props preserve identical existing execution markup', () => {
  const value = props();
  const omitted = renderToStaticMarkup(<PersonalWorkspacePocResultPresenter {...value} />);
  const explicit = { ...value, readOnly: false };
  assert.equal(renderToStaticMarkup(<PersonalWorkspacePocResultPresenter {...explicit} />), omitted);
  assert.equal((omitted.match(/data-testid="personal-workspace-result-occurrence-actions"/g) ?? []).length, 3);
});
