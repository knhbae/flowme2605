import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { FlowExportDestination } from '@/lib/flow/export-scope';
import {
  buildSavedPlanTransferPreview,
  type SavedPlanTransferInput,
} from '@/lib/flow/saved-plan-transfer-codec';
import { FlowExportPanel } from './FlowExportPanel';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const transferInput: SavedPlanTransferInput = {
  planTitle: '사본 1 · 이사 D-30 준비',
  generatedAt: '2026-08-10T00:00:00.000Z',
  items: [
    {
      itemId: 'inspection',
      portableInput: {
        flowTitle: '이사 D-30 준비',
        stepId: 'inspection',
        stepTitle: '이사할 집 하자 점검하기',
        date: '2026-08-09',
        rawMemoText: '집 상태를 확인합니다.\n\n- [ ] 현관 사진 남기기\n- [x] 욕실 누수 확인하기',
        completionCriteria: '사진과 하자 목록을 공유했다.',
      },
      listRow: {
        itemId: 'inspection',
        title: '이사할 집 하자 점검하기',
        date: '2026-08-09',
        scheduleState: 'all_day',
        status: 'pending',
        personalOrderRank: 0,
      },
    },
    {
      itemId: 'quote',
      portableInput: {
        flowTitle: '이사 D-30 준비',
        stepId: 'quote',
        stepTitle: '이사업체 견적 받기',
        memo: '세 업체에 문의합니다.',
      },
      listRow: {
        itemId: 'quote',
        title: '이사업체 견적 받기',
        scheduleState: 'unscheduled',
        status: 'done',
        personalOrderRank: 1,
      },
    },
  ],
};

const previews = Object.fromEntries(
  (['memo', 'checklist', 'calendar', 'sheet'] as FlowExportDestination[]).map(
    (destination) => [destination, buildSavedPlanTransferPreview(transferInput, destination)],
  ),
);

const items = [
  { key: 'inspection', title: '이사할 집 하자 점검하기', calendarEligible: true },
  { key: 'quote', title: '이사업체 견적 받기', calendarEligible: false },
];

function renderPanel(options?: {
  approvedSavedTransfer?: boolean;
  preferredDestination?: FlowExportDestination;
  withPreviews?: boolean;
  showEntry?: boolean;
}): string {
  return renderToStaticMarkup(
    <FlowExportPanel
      flowTitle="사본 1 · 이사 D-30 준비"
      items={items}
      open
      scope="flow"
      selectedKeys={[]}
      showEntry={options?.showEntry ?? false}
      fixedScope
      approvedSavedTransfer={options?.approvedSavedTransfer}
      preferredDestination={options?.preferredDestination}
      savedTransferPreviews={options?.withPreviews ? previews : undefined}
      destinationCopyOverride={{
        memo: { label: '레거시 메모', result: '레거시 결과' },
        checklist: { label: '레거시 체크리스트', result: '레거시 결과' },
      }}
      onOpenChange={() => undefined}
      onScopeChange={() => undefined}
      onSelectedKeysChange={() => undefined}
      onExport={() => undefined}
    />,
  );
}

function destinationButtons(markup: string): string[] {
  return markup.match(/<button[^>]+data-export-destination="(?:memo|checklist|calendar|sheet)"[^>]*>[\s\S]*?<\/button>/gu) ?? [];
}

test('approved saved transfer is opt-in and exposes 텍스트/할 일/캘린더/Excel with real preview content', () => {
  const markup = renderPanel({ approvedSavedTransfer: true, withPreviews: true });
  const buttons = destinationButtons(markup);

  assert.match(markup, /data-saved-transfer-profile="approved_saved_transfer"/u);
  assert.equal(buttons.length, 5); // four destination selectors plus the selected destination CTA
  assert.match(markup, /data-export-destination="memo"[^>]+data-export-format="txt"/u);
  assert.match(markup, /data-export-destination="checklist"[^>]+data-export-format="vtodo"/u);
  assert.match(markup, /data-export-destination="calendar"[^>]+data-export-format="vevent"/u);
  assert.match(markup, /data-export-destination="sheet"[^>]+data-export-format="xlsx"/u);
  assert.match(markup, /role="tablist" aria-label="내 도구로 옮길 형식"/u);
  assert.match(markup, /class="grid grid-cols-4 overflow-hidden border-y/u);
  assert.match(markup, /data-testid="my-flow-transfer-tab-memo"[\s\S]*?>텍스트</u);
  assert.match(markup, /data-testid="my-flow-transfer-tab-checklist"[\s\S]*?>할 일</u);
  assert.match(markup, /data-testid="my-flow-transfer-tab-calendar"[\s\S]*?>캘린더</u);
  assert.match(markup, /data-testid="my-flow-transfer-tab-sheet"[\s\S]*?>Excel</u);
  assert.match(markup, /data-testid="my-flow-transfer-format-help-trigger"/u);
  assert.match(markup, /aria-label="이전"[^>]*>이전<\/button>/u);
  assert.doesNotMatch(markup, /레거시 메모|레거시 체크리스트/u);
  assert.match(markup, /data-export-preview-format="txt"/u);
  assert.match(markup, /data-testid="my-flow-export-text-preview-scope"/u);
  assert.match(markup, /전체 2개 중 1개 미리보기 · 복사할 때는 전체 2개가 포함됩니다\./u);
  assert.match(markup, /집 상태를 확인합니다\./u);
  assert.match(markup, /- \[ \] 현관 사진 남기기/u);
  assert.match(markup, /data-testid="my-flow-export-approved-cta"/u);
  assert.match(markup, />텍스트 복사<\/button>/u);
});

test('approved saved transfer uses 48px targets without changing the legacy panel token', () => {
  const approvedMarkup = renderPanel({
    approvedSavedTransfer: true,
    withPreviews: true,
    showEntry: true,
  });
  const legacyMarkup = renderPanel({ showEntry: true });

  assert.match(approvedMarkup, /data-testid="my-flow-export-entry"[^>]+!min-h-12/u);
  assert.match(approvedMarkup, /data-testid="my-flow-export-panel"[^>]+\[&amp;_button\]:min-h-12/u);
  assert.match(approvedMarkup, /aria-label="이전"[^>]+!min-h-12[^>]*>/u);
  assert.doesNotMatch(legacyMarkup, /data-testid="my-flow-export-entry"[^>]+!min-h-12/u);
  assert.doesNotMatch(legacyMarkup, /data-testid="my-flow-export-panel"[^>]+\[&amp;_button\]:min-h-12/u);
});

test('approved Excel selection renders the actual eight-column table, loss note, and dedicated CTA', () => {
  const markup = renderPanel({
    approvedSavedTransfer: true,
    preferredDestination: 'sheet',
    withPreviews: true,
  });

  assert.match(markup, /data-export-preview-format="xlsx"/u);
  assert.match(markup, /data-testid="my-flow-export-xlsx-preview"/u);
  assert.equal((markup.match(/<th scope="col"/gu) ?? []).length, 8);
  ['순서', '계획 이름', '날짜', '할 일', '상태', '메모 원문', '확인 항목 수', '반복']
    .forEach((column) => assert.match(markup, new RegExp(column, 'u')));
  assert.match(markup, /이 파일은 저장 시점 snapshot이며 FlowMe와 자동 동기화되지 않습니다\./u);
  assert.match(markup, /native Excel checkbox/u);
  assert.match(markup, />Excel 파일 받기<\/button>/u);
});

test('legacy panel behavior and labels remain unchanged when approved transfer is not enabled', () => {
  const markup = renderPanel();

  assert.match(markup, /data-saved-transfer-profile="legacy"/u);
  assert.match(markup, /레거시 메모/u);
  assert.match(markup, /레거시 체크리스트/u);
  assert.doesNotMatch(markup, /data-testid="my-flow-export-destination-preview"/u);
  assert.doesNotMatch(markup, /data-testid="my-flow-export-approved-cta"/u);
  assert.doesNotMatch(markup, /data-export-format="(?:txt|vtodo|vevent|xlsx)"/u);
  assert.doesNotMatch(markup, /aria-label="이전"/u);
});
