import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { buildFlowCapabilityResultViewModel } from '@/lib/flow/capability-result-view-model';
import {
  P0_CONTRACT_FLOW_BUNDLE,
  P0_CONTRACT_FLOW_ITEM_IDS,
} from '@/lib/flow/effective-flow-contract.fixtures';
import { buildEffectiveFlowSnapshot } from '@/lib/flow/effective-flow-snapshot';
import { resolvePublicDateIntent } from '@/lib/flow/public-date-intent';
import { buildPublicFlowTextSyntaxModel } from '@/lib/flow/public-flow-text-syntax';
import { FlowArtifactDataPreview } from './FlowArtifactDataPreview';
import { FlowCapabilityResultPreview } from './FlowCapabilityResultPreview';

// The repository keeps JSX preserved for Next.js. The standalone tsx static-render
// harness therefore supplies the classic JSX runtime expected by older components.
(globalThis as typeof globalThis & { React: typeof React }).React = React;

function buildSnapshot(mode: 'custom' | 'undated' = 'custom') {
  return buildEffectiveFlowSnapshot({
    bundle: P0_CONTRACT_FLOW_BUNDLE,
    effectiveTitle: P0_CONTRACT_FLOW_BUNDLE.flow.title,
    dateIntent: resolvePublicDateIntent({
      anchorType: P0_CONTRACT_FLOW_BUNDLE.flow.anchor_type,
      mode,
      customAnchor: mode === 'custom' ? '2030-09-01' : '',
      exampleAnchor: '',
    }),
    publicItemPersonalizations: {
      'p0-contract-item-a': { detail: '개인 메모는 원본과 별도로 유지합니다.' },
    },
  });
}

function tagsByTestId(markup: string, testId: string): string[] {
  const tags = markup.match(new RegExp(`<[^>]+data-testid="${testId}"[^>]*>`, 'gu'));
  return tags ?? [];
}

test('renders one manifest-backed primary, at most two immediate alternatives, and actual row content', () => {
  const viewModel = buildFlowCapabilityResultViewModel({
    snapshot: buildSnapshot(),
    lifecycle: 'public_preview',
  });
  const markup = renderToStaticMarkup(
    <FlowCapabilityResultPreview
      viewModel={viewModel}
      onSelect={() => undefined}
      onEdit={() => undefined}
    />,
  );
  const choiceTags = tagsByTestId(markup, 'flow-capability-result-choice');
  const immediateAvailable = choiceTags.filter((tag) => (
    tag.includes('data-capability-candidate-role="available"')
    && tag.includes('data-capability-immediate="true"')
  ));

  assert.match(markup, /data-capability-lifecycle="public_preview"/u);
  assert.match(markup, /data-capability-snapshot-kind="effective_authoring"/u);
  assert.match(markup, new RegExp(`data-capability-manifest-hash="${viewModel.primary?.manifest.snapshotHash}"`, 'u'));
  assert.match(markup, new RegExp(`data-capability-manifest-item-ids="${P0_CONTRACT_FLOW_ITEM_IDS.join(',')}"`, 'u'));
  assert.match(markup, /data-capability-output-count="3"/u);
  assert.equal(choiceTags.filter((tag) => tag.includes('data-capability-candidate-role="primary"')).length, 1);
  assert.ok(immediateAvailable.length <= 2);
  assert.match(markup, /data-testid="flow-artifact-calendar-preview"/u);
  assert.ok(markup.indexOf('계약 항목 A') < markup.indexOf('계약 항목 B'));
  assert.ok(markup.indexOf('계약 항목 B') < markup.indexOf('계약 항목 C'));
  assert.match(markup, /9월 1일/u);
  assert.match(markup, /완료 기준 · 확인 결과를 저장하고 담당자에게 공유했습니다\./u);
  assert.match(markup, /개인 메모는 원본과 별도로 유지합니다\./u);
  assert.doesNotMatch(markup, /download=|navigator\.clipboard|<form/u);
});

test('renders zero-output Calendar as conditional with expected count and an editor callback owner', () => {
  const viewModel = buildFlowCapabilityResultViewModel({
    snapshot: buildSnapshot('undated'),
    lifecycle: 'public_preview',
  });
  const markup = renderToStaticMarkup(
    <FlowCapabilityResultPreview
      viewModel={viewModel}
      onEdit={() => undefined}
    />,
  );
  const conditionalTags = tagsByTestId(markup, 'flow-capability-conditional-result');
  const calendarConditional = conditionalTags.find((tag) => (
    tag.includes('data-capability-destination="calendar"')
  ));

  assert.ok(calendarConditional);
  assert.match(calendarConditional, /data-capability-candidate-role="conditional"/u);
  assert.match(calendarConditional, /data-capability-output-count="0"/u);
  assert.match(calendarConditional, /data-capability-expected-output-count="3"/u);
  assert.match(markup, /data-testid="flow-capability-conditional-edit"/u);
  assert.match(markup, /data-condition-action="edit_schedule"/u);
  assert.match(markup, /날짜를 정하면 최대 3개/u);
});

test('review hold is a non-actionable unavailable disclosure and saved actions preserve one primary owner', () => {
  const snapshot = buildSnapshot();
  const heldViewModel = buildFlowCapabilityResultViewModel({
    snapshot,
    lifecycle: 'public_preview',
    executionState: 'review_hold',
  });
  const heldMarkup = renderToStaticMarkup(
    <FlowCapabilityResultPreview viewModel={heldViewModel} />,
  );

  assert.equal(tagsByTestId(heldMarkup, 'flow-capability-unavailable-result').length, 4);
  assert.doesNotMatch(heldMarkup, /data-testid="flow-capability-result-choice"/u);
  assert.doesNotMatch(heldMarkup, /data-testid="flow-capability-result-action"/u);
  assert.doesNotMatch(heldMarkup, /data-testid="flow-capability-conditional-edit"/u);
  assert.match(heldMarkup, /data-testid="flow-capability-no-ready-result"/u);

  const savedViewModel = buildFlowCapabilityResultViewModel({
    snapshot,
    lifecycle: 'saved_detail',
  });
  const savedMarkup = renderToStaticMarkup(
    <FlowCapabilityResultPreview
      viewModel={savedViewModel}
      onAction={() => undefined}
    />,
  );
  const actionTags = tagsByTestId(savedMarkup, 'flow-capability-result-action');

  assert.equal(actionTags.length, 3);
  assert.equal(actionTags.filter((tag) => tag.includes('data-action-priority="primary"')).length, 1);
  assert.match(savedMarkup, /data-capability-primary-action="execute-saved-result"/u);
  assert.match(savedMarkup, /data-capability-primary-action-owner="saved_plan_detail"/u);
  assert.match(savedMarkup, /data-capability-secondary-actions="edit-saved-plan,transfer-to-own-tool"/u);
  assert.match(savedMarkup, /data-action-role="execute-saved-result"/u);
  assert.match(savedMarkup, /data-action-role="edit-saved-plan"/u);
  assert.match(savedMarkup, /data-action-role="transfer-to-own-tool"/u);
  assert.doesNotMatch(savedMarkup, /data-action-role="create-quick-local-result"/u);
});

test('Q3 capability headers use two state lines while rollback restores the prior receipt line', () => {
  const snapshot = buildSnapshot();
  const q3Markup = renderToStaticMarkup(
    <FlowCapabilityResultPreview
      viewModel={buildFlowCapabilityResultViewModel({
        snapshot,
        lifecycle: 'saved_detail',
      })}
    />,
  );
  const rollbackMarkup = renderToStaticMarkup(
    <FlowCapabilityResultPreview
      viewModel={buildFlowCapabilityResultViewModel({
        snapshot,
        lifecycle: 'saved_detail',
        q3CopyEnabled: false,
      })}
    />,
  );
  const q3Header = q3Markup.match(/<header[^>]*>([\s\S]*?)<\/header>/u)?.[1] ?? '';
  const rollbackHeader = rollbackMarkup.match(/<header[^>]*>([\s\S]*?)<\/header>/u)?.[1] ?? '';

  assert.match(q3Header, /옮기기 전 미리보기/u);
  assert.match(q3Header, /저장한 계획 · 3개/u);
  assert.equal((q3Header.match(/<(?:p|h2)\b/gu) ?? []).length, 2);
  assert.doesNotMatch(q3Header, /저장한 Flow 결과|생성 후 별도로/u);

  assert.match(rollbackHeader, /저장한 Flow 결과/u);
  assert.match(rollbackHeader, /저장한 전체 Flow · 3개/u);
  assert.match(rollbackHeader, /생성 후 별도로/u);
  assert.equal((rollbackHeader.match(/<(?:p|h2)\b/gu) ?? []).length, 3);
});

test('approved public mode exposes only Text, Todo, and Calendar and keeps every Todo row as a detail link', () => {
  const viewModel = buildFlowCapabilityResultViewModel({
    snapshot: buildSnapshot(),
    lifecycle: 'public_preview',
  });
  const markup = renderToStaticMarkup(
    <FlowCapabilityResultPreview
      viewModel={viewModel}
      selectedDestination="checklist"
      onRowOpen={() => undefined}
      publicApprovedMode
    />,
  );
  const choices = tagsByTestId(markup, 'flow-capability-result-choice');

  assert.equal(choices.length, 3);
  assert.ok(choices.every((tag) => tag.includes('min-h-12')));
  assert.deepEqual(
    choices.map((tag) => tag.match(/data-capability-destination="([^"]+)"/u)?.[1]),
    ['memo', 'checklist', 'calendar'],
  );
  assert.match(markup, />Text<\/span>/u);
  assert.match(markup, />Todo<\/span>/u);
  assert.match(markup, />Calendar<\/span>/u);
  assert.match(markup, /data-testid="public-result-format-help-trigger"/u);
  assert.match(markup, /data-public-format-mode="approved"/u);
  assert.match(markup, /<h2[^>]*>Todo · 3개<\/h2>/u);
  assert.equal(tagsByTestId(markup, 'flow-capability-artifact-preview-todo-detail-link').length, 3);
  assert.equal(tagsByTestId(markup, 'flow-capability-artifact-preview-todo-checkbox').length, 3);
  assert.doesNotMatch(markup, /data-capability-destination="sheet"/u);
  assert.doesNotMatch(markup, /data-artifact-shape="sheet"|>시트 ·|>Sheet ·|>Excel ·/u);
});

test('approved public mode starts with full Text authoring syntax from the effective rows', () => {
  const bundleWithInternalTrace = {
    ...P0_CONTRACT_FLOW_BUNDLE,
    itemDetails: P0_CONTRACT_FLOW_BUNDLE.itemDetails?.map((detail) => (
      detail.item_id === 'p0-contract-item-a'
        ? {
            ...detail,
            why: `${detail.why}\nsourceTrace: internal source row`,
          }
        : detail
    )),
  };
  const snapshot = buildEffectiveFlowSnapshot({
    bundle: bundleWithInternalTrace,
    effectiveTitle: bundleWithInternalTrace.flow.title,
    dateIntent: resolvePublicDateIntent({
      anchorType: bundleWithInternalTrace.flow.anchor_type,
      mode: 'custom',
      customAnchor: '2030-09-01',
      exampleAnchor: '',
    }),
    publicItemPersonalizations: {
      'p0-contract-item-a': { detail: '개인 메모는 원본과 별도로 유지합니다.' },
    },
  });
  const viewModel = buildFlowCapabilityResultViewModel({
    snapshot,
    lifecycle: 'public_preview',
  });
  const textSyntaxModel = buildPublicFlowTextSyntaxModel({
    bundle: bundleWithInternalTrace,
    projection: snapshot.committed.projection,
    itemPersonalizations: {
      'p0-contract-item-a': { detail: '개인 메모는 원본과 별도로 유지합니다.' },
    },
  });
  const markup = renderToStaticMarkup(
    <FlowCapabilityResultPreview
      viewModel={viewModel}
      anchorDate="2030-09-01"
      previewRowLimit={1}
      publicApprovedMode
      textSyntaxModel={textSyntaxModel}
    />,
  );

  assert.match(markup, /data-capability-selected-destination="memo"/u);
  assert.match(markup, /data-testid="flow-artifact-text-syntax-preview"/u);
  assert.match(markup, /# P0 결과 계약 계획/u);
  assert.match(markup, /## 실행 순서/u);
  assert.match(markup, /- 계약 항목 A D-Day/u);
  assert.match(markup, /- 계약 항목 B D\+2/u);
  assert.match(markup, /why: 결과 계약의 풍부한 필드가 한 항목에 모여 있는지 확인합니다\./u);
  assert.match(markup, /how: 완료 기준, 메모, 주의, 리소스와 출처를 각각 비교합니다\./u);
  assert.match(markup, /설명 · 계약 설명 A/u);
  assert.match(markup, /내 메모 · 개인 메모는 원본과 별도로 유지합니다\./u);
  assert.doesNotMatch(markup, /how: 계약 설명 A/u);
  assert.doesNotMatch(markup, /how: 개인 메모는 원본과 별도로 유지합니다\./u);
  assert.match(markup, /done: 확인 결과를 저장하고 담당자에게 공유했습니다\./u);
  assert.match(markup, /caution: 결과 생성 전 날짜와 대상 범위를 다시 확인하세요\./u);
  assert.match(markup, /link: 공식 확인 링크 \| https:\/\/example\.com\/p0-contract-source\/item-a \| official/u);
  assert.doesNotMatch(markup, /sourceTrace|internal source row/u);
  assert.equal(tagsByTestId(markup, 'flow-capability-artifact-preview-row').length, 3);
  assert.doesNotMatch(markup, /data-testid="flow-capability-artifact-preview-expand"/u);
});

test('approved public Calendar shows every grouped row while default previews keep the row limit', () => {
  const baseProjection = buildSnapshot().committed.projection;
  const projection = {
    ...baseProjection,
    shapes: {
      ...baseProjection.shapes,
      calendar: {
        ...baseProjection.shapes.calendar,
        rows: [...baseProjection.shapes.calendar.rows].reverse().map((row) => (
          row.id === 'p0-contract-item-c'
            ? { ...row, schedule: { state: 'unscheduled' as const } }
            : row
        )),
      },
    },
  };
  const approvedMarkup = renderToStaticMarkup(
    <FlowArtifactDataPreview
      projection={projection}
      selectedShape="calendar"
      previewRowLimit={1}
      rowTestId="calendar-row"
      expandTestId="calendar-expand"
      publicApprovedMode
      calendarPreamble={<div data-testid="calendar-setup">기준일 입력</div>}
    />,
  );
  const defaultMarkup = renderToStaticMarkup(
    <FlowArtifactDataPreview
      projection={projection}
      selectedShape="calendar"
      previewRowLimit={1}
      rowTestId="calendar-row"
      expandTestId="calendar-expand"
    />,
  );

  assert.equal(tagsByTestId(approvedMarkup, 'calendar-row').length, 3);
  assert.doesNotMatch(approvedMarkup, /data-testid="calendar-expand"/u);
  assert.equal(tagsByTestId(approvedMarkup, 'flow-date-rail').length, 3);
  assert.equal(
    tagsByTestId(approvedMarkup, 'flow-date-rail').every((tag) => tag.includes('aria-hidden="true"')),
    true,
  );
  assert.match(approvedMarkup, /<h3[^>]*>2030년 9월 1일 \(일\)<\/h3>/u);
  assert.match(approvedMarkup, />9월 · \(일\)</u);
  assert.ok(approvedMarkup.indexOf('>2030년 9월 1일') < approvedMarkup.indexOf('>2030년 9월 3일'));
  assert.ok(approvedMarkup.indexOf('>2030년 9월 3일') < approvedMarkup.indexOf('>날짜 없음</h3>'));
  assert.ok(approvedMarkup.indexOf('data-testid="calendar-setup"') < approvedMarkup.indexOf('data-testid="calendar-row"'));
  assert.equal(tagsByTestId(defaultMarkup, 'calendar-row').length, 3);
  assert.match(defaultMarkup, /data-testid="calendar-expand"/u);
  assert.match(defaultMarkup, /나머지 2개 보기/u);
});

test('approved Text distinguishes fixed and removed dates without serializing invented D offsets', () => {
  const snapshot = buildSnapshot();
  const fixedDurationBundle = {
    ...P0_CONTRACT_FLOW_BUNDLE,
    items: P0_CONTRACT_FLOW_BUNDLE.items.map((item) => (
      item.id === 'p0-contract-item-a' ? { ...item, duration_days: 2 } : item
    )),
  };
  const textSyntaxModel = buildPublicFlowTextSyntaxModel({
    bundle: fixedDurationBundle,
    projection: snapshot.committed.projection,
    itemPersonalizations: {
      'p0-contract-item-a': { date: '2031-01-02' },
      'p0-contract-item-b': { date: null },
    },
  });
  const markup = renderToStaticMarkup(
    <FlowArtifactDataPreview
      projection={snapshot.committed.projection}
      selectedShape="memo"
      publicApprovedMode
      textSyntaxModel={textSyntaxModel}
    />,
  );

  assert.match(markup, /data-text-schedule-mode="fixed_override"/u);
  assert.match(markup, /고정 날짜 · 2031년 1월 2일 · 2일간/u);
  assert.match(markup, /data-text-schedule-mode="explicit_undated"/u);
  assert.match(markup, /날짜 없음 · 사용자가 날짜를 비웠어요/u);
  assert.doesNotMatch(markup, /계약 항목 A D-Day/u);
  assert.doesNotMatch(markup, /계약 항목 B D\+2/u);
});

test('Calendar gives an explicit accessible name to an undated rail', () => {
  const projection = buildSnapshot().committed.projection;
  const undatedRow = {
    ...projection.outlineRows[0],
    schedule: { state: 'unscheduled' as const },
  };
  const undatedProjection = {
    ...projection,
    shapes: {
      ...projection.shapes,
      calendar: {
        ...projection.shapes.calendar,
        rows: [undatedRow],
        count: 1,
      },
    },
  };
  const markup = renderToStaticMarkup(
    <FlowArtifactDataPreview
      projection={undatedProjection}
      selectedShape="calendar"
      publicApprovedMode
    />,
  );

  assert.match(markup, /<section[^>]*data-flow-ui="date-rail-group"[^>]*>.*?<h3[^>]*>날짜 없음<\/h3>/u);
  assert.match(markup, /data-testid="flow-date-rail"[^>]*aria-hidden="true"/u);
  assert.doesNotMatch(markup, /<section[^>]*aria-label=/u);
});

test('approved public artifact choices filter a sheet-capable projection without changing default behavior', () => {
  const projection = buildSnapshot().committed.projection;
  const approvedMarkup = renderToStaticMarkup(
    <FlowArtifactDataPreview
      projection={projection}
      selectedShape="checklist"
      publicApprovedMode
    />,
  );
  const defaultMarkup = renderToStaticMarkup(
    <FlowArtifactDataPreview projection={projection} />,
  );
  const approvedChoices = tagsByTestId(approvedMarkup, 'flow-artifact-shape-choice');

  assert.deepEqual(
    approvedChoices.map((tag) => tag.match(/data-artifact-shape="([^"]+)"/u)?.[1]),
    ['memo', 'checklist', 'calendar'],
  );
  assert.match(approvedMarkup, />Text<\/button>/u);
  assert.match(approvedMarkup, />Todo<\/button>/u);
  assert.match(approvedMarkup, />Calendar<\/button>/u);
  assert.doesNotMatch(approvedMarkup, /data-artifact-shape="sheet"|>시트 |\bExcel\b/u);
  assert.match(defaultMarkup, /data-public-format-mode="default"/u);
  assert.match(defaultMarkup, />캘린더 일정 3개</u);
  assert.match(defaultMarkup, />체크리스트 3개</u);
  assert.match(defaultMarkup, />메모 3개</u);
});

test('approved public mode keeps Calendar as one of three format tabs before a date is set', () => {
  const viewModel = buildFlowCapabilityResultViewModel({
    snapshot: buildSnapshot('undated'),
    lifecycle: 'public_preview',
  });
  const markup = renderToStaticMarkup(
    <FlowCapabilityResultPreview
      viewModel={viewModel}
      selectedDestination="calendar"
      calendarEmptyAction={<button type="button">이사일 설정</button>}
      publicApprovedMode
    />,
  );
  const choices = tagsByTestId(markup, 'flow-capability-result-choice');

  assert.equal(choices.length, 3);
  assert.ok(choices.some((tag) => (
    tag.includes('data-capability-destination="calendar"')
    && tag.includes('data-capability-candidate-state="conditional"')
  )));
  assert.match(markup, /data-capability-selected-destination="calendar"/u);
  assert.match(markup, /data-testid="flow-capability-artifact-preview"/u);
  assert.match(markup, /data-testid="flow-artifact-empty-action"/u);
  assert.match(markup, />이사일 설정<\/button>/u);
  assert.match(markup, /기준일이나 항목 날짜를 정하면 일정이 여기에 나타납니다/u);
  assert.doesNotMatch(markup, /data-testid="flow-capability-conditional-result"/u);
});
