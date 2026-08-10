import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  FlowEditorSurface,
  assertFlowEditorCommitLabel,
} from './FlowEditorSurface';
import {
  PublicFlowAdjustmentPanel,
  PublicFlowItemEditor,
} from './PublicFlowAdjustmentPanel';
import {
  SavedFlowItemEditorSurface,
  SavedFlowPlanEditorSurface,
} from './SavedFlowEditorSurface';

test('editor commit labels reject completion wording reserved for execution state', () => {
  assert.equal(assertFlowEditorCommitLabel('\uC800\uC7A5'), '\uC800\uC7A5');
  assert.throws(
    () => assertFlowEditorCommitLabel('\uC218\uC815 \uC644\uB8CC'),
    /must not contain/,
  );
  assert.throws(() => assertFlowEditorCommitLabel('   '), /must not be empty/);
});

test('shared editor frame exposes transaction semantics and guarded discard actions', () => {
  const markup = renderToStaticMarkup(
    <FlowEditorSurface
      testId="surface"
      headingId="surface-heading"
      context="saved-overlay"
      level="item"
      status="dirty-valid"
      layout="mobile-full-screen"
      semanticRole="pending-saved-plan-save"
      commitRole="apply-item-to-parent-personal-draft"
      title="Item"
      onRequestClose={() => undefined}
      errorSummary={{
        title: 'Check',
        errors: [{ id: 'title-required', message: 'Required', fieldId: 'item-title' }],
      }}
      discardConfirmation={{
        open: true,
        onContinueEditing: () => undefined,
        onDiscardChanges: () => undefined,
      }}
      cancelAction={{ label: 'Cancel', onAction: () => undefined }}
      primaryAction={{ label: '\uBCC0\uACBD \uC800\uC7A5', onAction: () => undefined }}
      retryAction={{ label: 'Retry', onAction: () => undefined }}
    >
      <label htmlFor="title">Title</label>
    </FlowEditorSurface>,
  );

  assert.match(markup, /data-editor-context="saved-overlay"/);
  assert.match(markup, /data-editor-level="item"/);
  assert.match(markup, /data-editor-status="dirty-valid"/);
  assert.match(markup, /data-editor-layout="mobile-full-screen"/);
  assert.match(markup, /data-editor-semantic-role="pending-saved-plan-save"/);
  assert.match(markup, /data-editor-error-summary="true"/);
  assert.match(markup, /data-editor-discard-action="continue-editing"/);
  assert.match(markup, /data-editor-discard-action="discard-changes"/);
  assert.match(markup, /data-editor-actions-sticky="true"/);
  assert.match(markup, /z-\[100\]/);
});

test('approved editor target sizing is opt-in and leaves the legacy surface unchanged', () => {
  const renderSurface = (enforce48pxTargets: boolean) => renderToStaticMarkup(
    <FlowEditorSurface
      testId={enforce48pxTargets ? 'approved-targets' : 'legacy-targets'}
      headingId="target-sizing-heading"
      context="saved-overlay"
      level="item"
      status="clean"
      layout="mobile-full-screen"
      semanticRole="pending-saved-plan-save"
      commitRole="apply-item-to-parent-personal-draft"
      title="Item"
      onRequestClose={() => undefined}
      cancelPlacement="header"
      cancelAction={{ label: 'Cancel', onAction: () => undefined }}
      primaryAction={{ label: 'Save', onAction: () => undefined }}
      enforce48pxTargets={enforce48pxTargets}
    >
      <input data-testid="target-input" />
      <a href="https://example.com/source">Source</a>
    </FlowEditorSurface>,
  );
  const approvedMarkup = renderSurface(true);
  const legacyMarkup = renderSurface(false);

  assert.match(approvedMarkup, /\[&amp;_button\]:min-h-12/u);
  assert.match(approvedMarkup, /\[&amp;_input\]:min-h-12/u);
  assert.match(approvedMarkup, /\[&amp;_a\]:min-h-12/u);
  assert.match(approvedMarkup, /!min-h-12/u);
  assert.doesNotMatch(legacyMarkup, /\[&amp;_(?:a|button|input|select)\]:min-h-12/u);
  assert.doesNotMatch(legacyMarkup, /!min-h-12/u);
});

test('production adapters expose the shared schema and commit-role contracts in all four contexts', () => {
  const transaction = {
    status: 'clean' as const,
    pendingClose: false,
    onRequestClose: () => undefined,
    onContinueEditing: () => undefined,
    onDiscardChanges: () => undefined,
    onRetry: () => undefined,
  };
  const actions = {
    onRequestClose: () => undefined,
    onContinueEditing: () => undefined,
    onDiscardChanges: () => undefined,
    onCommit: () => undefined,
  };
  const sourceAndSafety = {
    completionCriterion: '확인 결과를 기록하면 끝나요.',
    sourceUrl: 'https://example.com/source',
    warning: '중요한 조건은 항상 확인해 주세요.',
  };
  const markup = renderToStaticMarkup(<>
    <PublicFlowAdjustmentPanel
      kind="name"
      kindOptions={[{ kind: 'name', label: '이름', summary: '이름 수정' }]}
      currentResult={{ title: '현재', itemCount: 1, resultSummary: '1개' }}
      adjustedResult={{ title: '조정', itemCount: 1, resultSummary: '1개' }}
      titleDraft="공개 계획"
      anchorLabel="시작일"
      anchorDraft="2031-08-15"
      items={[{
        id: 'item-1',
        title: '할 일',
        dateLabel: '날짜 없음',
        included: true,
        canMoveUp: false,
        canMoveDown: false,
      }]}
      sourceUrl={sourceAndSafety.sourceUrl}
      warning={sourceAndSafety.warning}
      onKindChange={() => undefined}
      onTitleChange={() => undefined}
      onAnchorChange={() => undefined}
      onItemIncludedChange={() => undefined}
      onItemMove={() => undefined}
      onItemEdit={() => undefined}
      onApply={() => undefined}
      onCancel={() => undefined}
      transaction={transaction}
      sharedEditorEnabled
    />
    <PublicFlowItemEditor
      draft={{ itemId: 'item-1', title: '할 일', detail: '', date: '', ...sourceAndSafety }}
      onChange={() => undefined}
      onSave={() => undefined}
      onClose={() => undefined}
      transaction={transaction}
      sharedEditorEnabled
    />
    <SavedFlowPlanEditorSurface
      draft={{
        title: '저장 계획',
        anchor: '2031-08-15',
        anchorEditable: true,
        order: ['item-1'],
        items: { 'item-1': { included: true } },
        sources: [{ itemId: 'item-1', title: '할 일' }],
        itemPersonalizations: {},
        sourceUrl: sourceAndSafety.sourceUrl,
        warning: sourceAndSafety.warning,
      }}
      transaction={transaction}
      actions={actions}
      onPatch={() => undefined}
      onToggleItem={() => undefined}
      onMoveItem={() => undefined}
      onOpenItem={() => undefined}
    />
    <SavedFlowItemEditorSurface
      draft={{ itemId: 'item-1', title: '할 일', detail: '', date: '', ...sourceAndSafety }}
      transaction={transaction}
      actions={actions}
      onPatch={() => undefined}
    />
  </>);

  assert.equal((markup.match(/data-editor-schema-fields="plan-title,plan-anchor,plan-items,source-and-safety"/g) ?? []).length, 2);
  assert.equal((markup.match(/data-editor-schema-fields="item-title,item-detail,item-date,item-completion-criterion,source-and-safety"/g) ?? []).length, 2);
  assert.match(markup, /data-editor-commit-role="apply-public-draft"/);
  assert.match(markup, /data-editor-commit-role="apply-item-to-parent-public-draft"/);
  assert.match(markup, /data-editor-commit-role="save-personal-overlay"/);
  assert.match(markup, /data-editor-commit-role="apply-item-to-parent-personal-draft"/);
  assert.match(markup, /계획 수정/);
  assert.match(markup, /내 계획 이름/);
  assert.match(markup, /저장한 계획/);
  assert.match(markup, /계획에 포함/);
  assert.match(markup, /항목 수정/);
  assert.doesNotMatch(markup, /내 Flow 이름|Flow에 포함/);
  assert.equal((markup.match(/data-testid="public-flow-adjustment-apply"[^>]*>\s*변경 반영/g) ?? []).length, 1);
  assert.equal((markup.match(/data-testid="public-flow-item-editor-save"[^>]*>\s*변경 반영/g) ?? []).length, 1);
  assert.equal((markup.match(/data-testid="saved-flow-editor-save"[^>]*>\s*저장/g) ?? []).length, 1);
  assert.equal((markup.match(/data-testid="my-flow-detail-save-changes"[^>]*>\s*저장/g) ?? []).length, 1);
});

test('approved Item editors expose only title date and one raw memo while warnings stay behind !', () => {
  const transaction = {
    status: 'clean' as const,
    pendingClose: false,
    onRequestClose: () => undefined,
    onContinueEditing: () => undefined,
    onDiscardChanges: () => undefined,
    onRetry: () => undefined,
  };
  const actions = {
    onRequestClose: () => undefined,
    onContinueEditing: () => undefined,
    onDiscardChanges: () => undefined,
    onCommit: () => undefined,
  };
  const rawMemo = '설명\n\n- [ ] 확인\n\n완료 기준: 기록했다.';
  const markup = renderToStaticMarkup(<>
    <PublicFlowItemEditor
      draft={{
        itemId: 'public-item',
        title: '공개 항목',
        detail: rawMemo,
        date: '',
        completionCriterion: '별도 기준',
        warning: '공개 주의',
      }}
      onChange={() => undefined}
      onSave={() => undefined}
      onClose={() => undefined}
      transaction={transaction}
      sharedEditorEnabled
      approvedPlanExecution
    />
    <SavedFlowItemEditorSurface
      draft={{
        itemId: 'saved-item',
        title: '저장 항목',
        detail: rawMemo,
        date: '',
        completionCriterion: '별도 기준',
        warning: '저장 주의',
      }}
      transaction={transaction}
      actions={actions}
      onPatch={() => undefined}
      approvedPlanExecution
    />
  </>);

  assert.equal((markup.match(/data-editor-schema-fields="item-title,item-detail,item-date,source-and-safety"/gu) ?? []).length, 2);
  assert.equal((markup.match(/>메모</gu) ?? []).length, 2);
  assert.doesNotMatch(markup, /data-editor-field="item-completion-criterion"/u);
  assert.doesNotMatch(markup, /별도 기준|공개 주의|저장 주의/u);
  assert.match(markup, /aria-label="이 항목의 주의사항"/u);
  assert.equal((markup.match(/data-flow-context-kind="caution"/gu) ?? []).length, 2);
});

test('approved Plan and Item editors use one header cancel and one footer commit at the 768 boundary', () => {
  const transaction = {
    status: 'clean' as const,
    pendingClose: false,
    onRequestClose: () => undefined,
    onContinueEditing: () => undefined,
    onDiscardChanges: () => undefined,
    onRetry: () => undefined,
  };
  const actions = {
    onRequestClose: () => undefined,
    onContinueEditing: () => undefined,
    onDiscardChanges: () => undefined,
    onCommit: () => undefined,
  };
  const markup = renderToStaticMarkup(<>
    <PublicFlowAdjustmentPanel
      kind="name"
      kindOptions={[{ kind: 'name', label: '이름', summary: '이름 수정' }]}
      currentResult={{ title: '현재', itemCount: 1, resultSummary: '1개' }}
      adjustedResult={{ title: '조정', itemCount: 1, resultSummary: '1개' }}
      titleDraft="공개 계획"
      items={[{
        id: 'item-1', title: '할 일', dateLabel: '날짜 없음', included: true,
        canMoveUp: false, canMoveDown: false,
      }]}
      onKindChange={() => undefined}
      onTitleChange={() => undefined}
      onItemIncludedChange={() => undefined}
      onItemMove={() => undefined}
      onItemEdit={() => undefined}
      onApply={() => undefined}
      onCancel={() => undefined}
      transaction={transaction}
      sharedEditorEnabled
      approvedPlanExecution
    />
    <PublicFlowItemEditor
      draft={{ itemId: 'public-item', title: '공개 항목', detail: '', date: '' }}
      onChange={() => undefined}
      onSave={() => undefined}
      onClose={() => undefined}
      transaction={transaction}
      sharedEditorEnabled
      approvedPlanExecution
    />
    <SavedFlowPlanEditorSurface
      draft={{
        title: '저장 계획', anchor: '', anchorEditable: false,
        order: ['item-1'], items: { 'item-1': { included: true } },
        sources: [{ itemId: 'item-1', title: '할 일' }], itemPersonalizations: {},
      }}
      transaction={transaction}
      actions={actions}
      onPatch={() => undefined}
      onToggleItem={() => undefined}
      onMoveItem={() => undefined}
      onOpenItem={() => undefined}
      approvedPlanExecution
    />
    <SavedFlowItemEditorSurface
      draft={{ itemId: 'saved-item', title: '저장 항목', detail: '', date: '' }}
      transaction={transaction}
      actions={actions}
      onPatch={() => undefined}
      approvedPlanExecution
    />
  </>);

  for (const testId of [
    'public-flow-adjustment-cancel',
    'public-flow-item-editor-cancel',
    'saved-flow-editor-cancel',
    'saved-flow-editor-item-cancel',
  ]) {
    assert.equal((markup.match(new RegExp(`data-testid="${testId}"`, 'gu')) ?? []).length, 1);
  }
  assert.equal((markup.match(/data-editor-action-role="cancel"/gu) ?? []).length, 0);
  assert.doesNotMatch(markup, /sm:inset-y-0/u);
  assert.match(markup, /md:inset-y-0/u);
});

test('q3 copy rollback restores the prior editor labels without changing semantic roles', () => {
  const transaction = {
    status: 'clean' as const,
    pendingClose: false,
    onRequestClose: () => undefined,
    onContinueEditing: () => undefined,
    onDiscardChanges: () => undefined,
    onRetry: () => undefined,
  };
  const actions = {
    onRequestClose: () => undefined,
    onContinueEditing: () => undefined,
    onDiscardChanges: () => undefined,
    onCommit: () => undefined,
  };
  const markup = renderToStaticMarkup(<>
    <PublicFlowAdjustmentPanel
      kind="name"
      kindOptions={[{ kind: 'name', label: '이름', summary: '이름 수정' }]}
      currentResult={{ title: '현재', itemCount: 1, resultSummary: '1개' }}
      adjustedResult={{ title: '조정', itemCount: 1, resultSummary: '1개' }}
      titleDraft="공개 계획"
      items={[{
        id: 'item-1',
        title: '준비',
        dateLabel: '날짜 없음',
        included: true,
        canMoveUp: false,
        canMoveDown: false,
      }]}
      onKindChange={() => undefined}
      onTitleChange={() => undefined}
      onItemIncludedChange={() => undefined}
      onItemMove={() => undefined}
      onItemEdit={() => undefined}
      onApply={() => undefined}
      onCancel={() => undefined}
      transaction={transaction}
      sharedEditorEnabled
      q3CopyEnabled={false}
    />
    <PublicFlowItemEditor
      draft={{ itemId: 'item-1', title: '준비', detail: '', date: '' }}
      onChange={() => undefined}
      onSave={() => undefined}
      onClose={() => undefined}
      transaction={transaction}
      sharedEditorEnabled
      q3CopyEnabled={false}
    />
    <SavedFlowPlanEditorSurface
      draft={{
        title: '저장 계획',
        anchor: '',
        anchorEditable: true,
        order: ['item-1'],
        items: { 'item-1': { included: true } },
        sources: [{ itemId: 'item-1', title: '준비' }],
        itemPersonalizations: {},
      }}
      transaction={transaction}
      actions={actions}
      onPatch={() => undefined}
      onToggleItem={() => undefined}
      onMoveItem={() => undefined}
      onOpenItem={() => undefined}
      q3CopyEnabled={false}
    />
    <SavedFlowItemEditorSurface
      draft={{ itemId: 'item-1', title: '준비', detail: '', date: '' }}
      transaction={transaction}
      actions={actions}
      onPatch={() => undefined}
      q3CopyEnabled={false}
    />
  </>);

  assert.match(markup, /data-editor-commit-role="apply-public-draft"/);
  assert.match(markup, /data-editor-commit-role="apply-item-to-parent-public-draft"/);
  assert.match(markup, /data-editor-commit-role="save-personal-overlay"/);
  assert.match(markup, /data-editor-commit-role="apply-item-to-parent-personal-draft"/);
  assert.equal((markup.match(/>Flow 편집</g) ?? []).length, 2);
  assert.match(markup, /내 Flow 이름/);
  assert.match(markup, />저장한 Flow</);
  assert.match(markup, /Flow에 포함/);
  assert.equal((markup.match(/>할 일 조정</g) ?? []).length, 2);
  assert.match(markup, /data-testid="public-flow-adjustment-apply"[^>]*>\s*이 내용으로 적용/);
  assert.match(markup, /data-testid="public-flow-item-editor-save"[^>]*>\s*이 항목 저장/);
  assert.match(markup, /data-testid="saved-flow-editor-save"[^>]*>\s*저장/);
  assert.match(markup, /data-testid="my-flow-detail-save-changes"[^>]*>\s*변경 저장/);
});

test('flag-off public adapters preserve the legacy field set', () => {
  const markup = renderToStaticMarkup(<>
    <PublicFlowAdjustmentPanel
      kind="name"
      kindOptions={[{ kind: 'name', label: '이름', summary: '이름 수정' }]}
      currentResult={{ title: '현재', itemCount: 1, resultSummary: '1개' }}
      adjustedResult={{ title: '조정', itemCount: 1, resultSummary: '1개' }}
      titleDraft="공개 계획"
      items={[{
        id: 'item-1',
        title: '할 일',
        dateLabel: '날짜 없음',
        included: true,
        canMoveUp: false,
        canMoveDown: false,
      }]}
      sourceUrl="https://example.com/source"
      warning="공유 편집기에서만 추가된 주의"
      onKindChange={() => undefined}
      onTitleChange={() => undefined}
      onItemIncludedChange={() => undefined}
      onItemMove={() => undefined}
      onItemEdit={() => undefined}
      onApply={() => undefined}
      onCancel={() => undefined}
      sharedEditorEnabled={false}
    />
    <PublicFlowItemEditor
      draft={{
        itemId: 'item-1',
        title: '할 일',
        detail: '',
        date: '',
        completionCriterion: '공유 편집기에서만 추가된 완료 기준',
        sourceUrl: 'https://example.com/source',
        warning: '공유 편집기에서만 추가된 주의',
      }}
      onChange={() => undefined}
      onSave={() => undefined}
      onClose={() => undefined}
      sharedEditorEnabled={false}
    />
  </>);

  assert.equal((markup.match(/data-editor-adapter="legacy"/g) ?? []).length, 2);
  assert.doesNotMatch(markup, /data-editor-field="source-and-safety"/);
  assert.doesNotMatch(markup, /data-editor-field="item-completion-criterion"/);
});

test('saved routine plans expose the routine field in the shared schema', () => {
  const markup = renderToStaticMarkup(
    <SavedFlowPlanEditorSurface
      draft={{
        title: '저장한 운동 계획',
        anchor: '2031-08-15',
        anchorEditable: true,
        weekdays: ['월', '수', '금'],
        routine: { schemaVersion: 1, end: { mode: 'count', count: 12 } },
        order: ['item-1'],
        items: { 'item-1': { included: true } },
        sources: [{ itemId: 'item-1', title: '운동하기' }],
        itemPersonalizations: {},
      }}
      transaction={{ status: 'clean', pendingClose: false }}
      actions={{
        onRequestClose: () => undefined,
        onContinueEditing: () => undefined,
        onDiscardChanges: () => undefined,
        onCommit: () => undefined,
      }}
      onPatch={() => undefined}
      onToggleItem={() => undefined}
      onMoveItem={() => undefined}
      onOpenItem={() => undefined}
    />,
  );

  assert.match(markup, /data-editor-schema-fields="plan-title,plan-anchor,plan-items,plan-routine"/);
  assert.match(markup, /data-testid="saved-flow-editor-routine"/);
});

test('recovery-required locks editable descendants while leaving recovery guidance visible', () => {
  const markup = renderToStaticMarkup(
    <FlowEditorSurface
      testId="locked-surface"
      headingId="locked-surface-heading"
      context="saved-overlay"
      level="plan"
      status="recovery-required"
      layout="responsive"
      semanticRole="saved-personal-copy"
      commitRole="save-personal-overlay"
      title="Locked"
      onRequestClose={() => undefined}
      errorSummary={{ title: '복구 필요', errors: [{ id: 'rollback', message: '확인해 주세요.' }] }}
      cancelAction={{ label: '취소', onAction: () => undefined }}
      primaryAction={{ label: '저장', onAction: () => undefined }}
    >
      <input data-testid="locked-input" />
    </FlowEditorSurface>,
  );
  assert.match(markup, /data-editor-fields-locked="true"/);
  assert.match(markup, /<fieldset disabled=""/);
  assert.match(markup, /data-editor-error-summary="true"/);
});

test('saved Plan surface keeps one scroll region and one sticky action set with 50 Items', () => {
  const itemIds = Array.from({ length: 50 }, (_, index) => `item-${index + 1}`);
  const markup = renderToStaticMarkup(
    <SavedFlowPlanEditorSurface
      draft={{
        title: '아주 긴 저장 계획 제목을 확인하는 오십 개 항목 테스트',
        anchor: '',
        anchorEditable: true,
        order: itemIds,
        items: Object.fromEntries(itemIds.map((itemId) => [itemId, { included: true }])),
        sources: itemIds.map((itemId, index) => ({
          itemId,
          title: `${index + 1}번째 아주 긴 한글 할 일 제목`,
        })),
        itemPersonalizations: {},
      }}
      transaction={{ status: 'clean', pendingClose: false }}
      actions={{
        onRequestClose: () => undefined,
        onContinueEditing: () => undefined,
        onDiscardChanges: () => undefined,
        onCommit: () => undefined,
      }}
      onPatch={() => undefined}
      onToggleItem={() => undefined}
      onMoveItem={() => undefined}
      onOpenItem={() => undefined}
    />,
  );
  assert.equal((markup.match(/data-testid="saved-flow-editor-item-row"/g) ?? []).length, 50);
  assert.equal((markup.match(/data-flow-editor-scroll-key="saved-plan-items"/g) ?? []).length, 1);
  assert.equal((markup.match(/data-editor-actions-sticky="true"/g) ?? []).length, 1);
});
