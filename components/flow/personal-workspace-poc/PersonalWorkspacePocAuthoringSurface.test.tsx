import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  getPersonalWorkspacePocAuthoringTemplate,
  materializePersonalWorkspacePocAuthoring,
} from '@/lib/flow/personal-workspace-poc-authoring';

import {
  buildPersonalWorkspacePocAuthoringIdentity,
  getPersonalWorkspacePocAuthoringOpenHref,
  getPersonalWorkspacePocTemplateInsertion,
} from './PersonalWorkspacePocAuthoringSurface';

const surfaceSource = readFileSync(
  new URL('./PersonalWorkspacePocAuthoringSurface.tsx', import.meta.url),
  'utf8',
);
const routeSource = readFileSync(
  new URL('./PersonalWorkspacePocAuthoringRoute.tsx', import.meta.url),
  'utf8',
);

test('template insertion is exact on empty source and a byte-preserving no-op otherwise', () => {
  const templateId = 'moving-dday-v1';
  const template = getPersonalWorkspacePocAuthoringTemplate(templateId);
  assert.ok(template);
  assert.deepEqual(getPersonalWorkspacePocTemplateInsertion('', templateId), {
    rawText: template.scaffold,
    templateId,
    changed: true,
  });

  const existing = '# 작성 중\r\n메모 그대로';
  assert.deepEqual(getPersonalWorkspacePocTemplateInsertion(existing, templateId), {
    rawText: existing,
    changed: false,
  });
});

test('idempotent authoring retry is a true no-op and never opens a storage transaction', () => {
  assert.match(surfaceSource, /if \(!result\.changed\) \{[\s\S]*if \(result\.error\)[\s\S]*setReceipt\(/u);
  const unchangedBranch = surfaceSource.match(/if \(!result\.changed\) \{([\s\S]*?)\n    \}\n\n    const composition/u)?.[1] ?? '';
  assert.doesNotMatch(unchangedBranch, /commitPersonalWorkspacePocStorage/u);
  assert.doesNotMatch(unchangedBranch, /removeAuthoringDraft/u);
});

test('source-derived identities are deterministic and exact workspace link encodes the full ref', () => {
  const fingerprint = 'raw-v1:31:abc1234';
  assert.deepEqual(
    buildPersonalWorkspacePocAuthoringIdentity(fingerprint),
    buildPersonalWorkspacePocAuthoringIdentity(fingerprint),
  );
  assert.equal(
    getPersonalWorkspacePocAuthoringOpenHref('saved-flow:copy one:flow/one'),
    '/my?personalWorkspacePoc=v1#flow=saved-flow%3Acopy%20one%3Aflow%2Fone',
  );
});

test('preview displays materialization-level missing title and item issues', () => {
  const identity = buildPersonalWorkspacePocAuthoringIdentity('raw-v1:0:0ztntfp');
  const preview = materializePersonalWorkspacePocAuthoring({
    ...identity,
    rawText: '',
    committedAt: '2000-01-01T00:00:00.000Z',
  });
  assert.equal(preview.ok, false);
  assert.deepEqual(
    preview.parseResult.blockingIssues.map((issue) => issue.code),
    ['missing-flow-title', 'missing-flow-items'],
  );
  assert.match(surfaceSource, /const issues = preview\.parseResult\.blockingIssues/u);
});

test('authoring exposes one entry, two visible stages, optional review, and real projections', () => {
  assert.match(surfaceSource, /personal-workspace-entry-input/u);
  assert.match(surfaceSource, /type MobileStep = 'input' \| 'result'/u);
  assert.doesNotMatch(surfaceSource, /type MobileStep = 'write' \| 'structure' \| 'result'/u);
  assert.match(surfaceSource, /personal-workspace-authoring-review-open/u);
  assert.match(surfaceSource, /원문 \{item\.sourceLine\}행/u);
  assert.match(surfaceSource, /personal-workspace-authoring-artifact-result/u);
  assert.match(surfaceSource, /\['text', 'TXT'\]/u);
  assert.match(surfaceSource, /\['todo', '할 일'\]/u);
  assert.match(surfaceSource, /\['calendar', '캘린더'\]/u);
  assert.match(surfaceSource, /\['sheet', '표'\]/u);
  assert.match(surfaceSource, /PersonalWorkspacePocResultPresenter/u);
  assert.match(surfaceSource, /buildPersonalWorkspacePocResultProjection/u);
  assert.match(
    surfaceSource,
    /candidate\.sourceItemRef === intent\.itemRef \|\| candidate\.ref === intent\.itemRef/u,
  );
  assert.match(surfaceSource, /할 일/u);
  assert.match(surfaceSource, /날짜 보기/u);
  assert.match(surfaceSource, /가이드는 원문·복사·저장에 포함되지 않습니다/u);
  assert.match(surfaceSource, /scroll-mt-24/u);
  assert.match(surfaceSource, /lg:grid-cols-\[minmax\(0,42fr\)_minmax\(0,58fr\)\]/u);
  assert.match(surfaceSource, /PersonalWorkspacePocLiveEditor/u);
  assert.match(surfaceSource, /group\?\.children\.find\(\(candidate\) => entryMatchRefs\.has\(candidate\.flowRef\)\)/u);
  assert.match(surfaceSource, /planPersonalWorkspacePocTemplateTransaction/u);
  assert.match(surfaceSource, /planPersonalWorkspacePocHelperTransaction/u);
  assert.doesNotMatch(surfaceSource, /onKeyDown=\{onSourceKeyDown\}/u);
  assert.match(surfaceSource, /입력한 그대로 보관/u);
});

test('authoring exposes the lossless table or raw fallback without inventing executable items', () => {
  assert.match(surfaceSource, /analyzePersonalWorkspacePocLosslessAuthoring/u);
  assert.match(surfaceSource, /data-testid="personal-workspace-authoring-lossless-table"/u);
  assert.match(surfaceSource, /data-testid="personal-workspace-authoring-lossless-raw"/u);
  assert.match(surfaceSource, /data-source-mutation-count=\{losslessAnalysis\.sourceMutationCount\}/u);
  assert.match(surfaceSource, /losslessAnalysis\.projection\.generatedItemCount/u);
  assert.match(surfaceSource, /losslessAnalysis\.projection\.generatedTodoCount/u);
  assert.match(surfaceSource, /losslessAnalysis\.projection\.generatedCalendarCount/u);
  assert.match(surfaceSource, /navigator\.clipboard\.writeText\(losslessAnalysis\.rawText\)/u);
  assert.match(surfaceSource, /행과 셀을 원문 위치 그대로 읽었습니다/u);
  assert.match(surfaceSource, /표 행은 자료로만 유지됩니다/u);
  assert.match(surfaceSource, /실행 항목이나 일정으로 임의 변환하지 않습니다/u);
});

test('existing-flow search, map child selection, and detail use the shared saved-copy display contract', () => {
  assert.match(surfaceSource, /buildPersonalWorkspacePocCopyDisambiguation/u);
  assert.match(surfaceSource, /getPersonalWorkspacePocFlowDisplayTitle/u);
  assert.match(surfaceSource, /entryFlowDisplayTitle\(group\.children\[0\]\?\.flowRef \?\? group\.groupRef, group\.title\)/u);
  assert.match(surfaceSource, /entryFlowDisplayTitle\(child\.flowRef, child\.title\)/u);
  assert.match(surfaceSource, /entryFlowDisplayTitle\(selectedFlow\.ref, selectedFlow\.title\)/u);
});

test('authoring connects the full property catalog, native pickers, exact re-entry, and explicit near-miss recovery', () => {
  assert.match(surfaceSource, /PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG/u);
  assert.match(surfaceSource, /personal-workspace-authoring-property-catalog/u);
  assert.match(surfaceSource, /data-property-support=\{entry\.writeSupport\}/u);
  assert.match(surfaceSource, /entry\?\.editor === 'native-date'/u);
  assert.match(surfaceSource, /entry\?\.editor === 'native-time'/u);
  assert.match(surfaceSource, /personal-workspace-authoring-dependent-property-surface/u);
  assert.match(surfaceSource, /personal-workspace-authoring-property-group-\$\{group\}/u);
  assert.match(surfaceSource, /\['schedule', '일정'\]/u);
  assert.match(surfaceSource, /\['execution', '실행'\]/u);
  assert.match(surfaceSource, /\['content', '내용'\]/u);
  assert.match(surfaceSource, /\['provenance', '더 보기'\]/u);
  assert.match(surfaceSource, /inlinePanel=\{renderPropertyEditorForm\('inline'\)\}/u);
  assert.match(surfaceSource, /locatePersonalWorkspacePocAuthoringPropertyValue/u);
  assert.match(surfaceSource, /pendingSourceFocus\.current = located\.selection/u);
  assert.match(surfaceSource, /focusPropertyValue\('subcheck', helperItemSourceLine, subcheck\.sourceLine\)/u);
  assert.match(surfaceSource, /planPersonalWorkspacePocAuthoringPropertyEdit/u);
  assert.match(surfaceSource, /planPersonalWorkspacePocAuthoringPropertyBatchEdit/u);
  assert.match(surfaceSource, /planPersonalWorkspacePocAuthoringNearMissRepair/u);
  assert.match(surfaceSource, /할 일 형식으로 고치기/u);
  assert.match(surfaceSource, /자동으로 바꾸지 않습니다/u);
  assert.match(surfaceSource, /Ctrl\+Z 한 번/u);

  const propertyApplyBody = surfaceSource.match(
    /const applyPropertyEditor = async \(event: FormEvent<HTMLFormElement>\) => \{([\s\S]*?)\n  \};/u,
  )?.[1] ?? '';
  const nearMissBody = surfaceSource.match(
    /const repairNearMiss = async \(target: PersonalWorkspacePocAuthoringNearMissTarget\) => \{([\s\S]*?)\n  \};/u,
  )?.[1] ?? '';
  assert.match(propertyApplyBody, /applyNativeReplacement/u);
  assert.match(nearMissBody, /applyNativeReplacement/u);
  assert.doesNotMatch(`${propertyApplyBody}\n${nearMissBody}`, /setRawText\(/u);
});

test('responsive authoring owns one contextual overlay plus one bounded dependent-property surface', () => {
  assert.match(surfaceSource, /type AuthoringOverlay =/u);
  assert.match(surfaceSource, /const \[overlay, setOverlay\] = useState<AuthoringOverlay>/u);
  assert.doesNotMatch(surfaceSource, /setHelperOpen|setReviewOpen|reviewReturnRef/u);
  assert.match(surfaceSource, /overlay\?\.kind === 'helper'[\s\S]*overlay\?\.kind === 'review'/u);
  assert.equal(surfaceSource.match(/role="dialog"/gu)?.length, 3);
  assert.match(surfaceSource, /overlayHeadingRef\.current\?\.focus/u);
  assert.match(surfaceSource, /opener\?\.isConnected/u);
  assert.match(surfaceSource, /opener\.focus\(\{ preventScroll: true \}\)/u);
  assert.match(surfaceSource, /if \(!overlay && !templatePickerOpen && !propertyEditor\) return/u);
  assert.match(surfaceSource, /window\.addEventListener\('keydown', onEscape\)/u);
  assert.match(surfaceSource, /document\.addEventListener\('pointerdown', onOutsidePointer, true\)/u);
  assert.match(surfaceSource, /contextAction=\{availableHelperTarget \?/u);
  assert.match(surfaceSource, /sourceLine: availableHelperTarget\.line/u);
  assert.match(surfaceSource, /owner: availableHelperTarget\.kind/u);
  assert.doesNotMatch(surfaceSource, /personal-workspace-authoring-helper-toggle/u);
});

test('template picker exposes one presentation-only full example without changing the source contract', () => {
  assert.match(surfaceSource, /template\.exampleLabel/u);
  assert.match(surfaceSource, /templatePreview\.exampleSource/u);
  assert.match(surfaceSource, /personal-workspace-authoring-template-example-preview/u);
  assert.match(surfaceSource, /personal-workspace-authoring-template-example-source/u);
  assert.match(surfaceSource, /onPointerMove=\{\(\) => setTemplatePreviewId\(template\.templateId\)\}/u);
  assert.match(surfaceSource, /onFocus=\{\(\) => setTemplatePreviewId\(template\.templateId\)\}/u);
  assert.match(surfaceSource, /aria-live="polite"/u);
  assert.match(surfaceSource, /예시는 원문에 들어가지 않습니다/u);
  assert.doesNotMatch(surfaceSource, /setRawText\(templatePreview\.exampleSource\)/u);
});

test('starting a new source clears document-owned template state and requires fresh loss consent', () => {
  const beginAuthoringBody = surfaceSource.match(
    /const beginAuthoring = \(exactText: string\) => \{([\s\S]*?)\n  \};/u,
  )?.[1] ?? '';

  assert.match(beginAuthoringBody, /if \(pending\.current\) return;/u);
  assert.match(beginAuthoringBody, /pendingTemplateId\.current = undefined/u);
  assert.match(beginAuthoringBody, /templateIdRef\.current = undefined/u);
  assert.match(beginAuthoringBody, /setTemplateId\(undefined\)/u);
  assert.match(beginAuthoringBody, /setLossAccepted\(false\)/u);
  assert.match(beginAuthoringBody, /setTemplateTicket\(undefined\)/u);
  assert.match(beginAuthoringBody, /setOverlay\(undefined\)/u);
  assert.ok(
    beginAuthoringBody.indexOf('setLossAccepted(false)')
      < beginAuthoringBody.indexOf('persistAuthoringDraft(exactText)'),
  );
  assert.doesNotMatch(beginAuthoringBody, /persistAuthoringDraft\(exactText,\s*templateId/u);
});

test('responsive, hierarchy, and subtraction contracts are explicit in the integrated surface', () => {
  assert.match(surfaceSource, /hierarchyDepth: line\.hierarchyDepth/u);
  assert.match(surfaceSource, /showHierarchyGuide: line\.showHierarchyGuide/u);
  assert.match(surfaceSource, /--poc-visual-viewport-top/u);
  assert.match(surfaceSource, /--poc-visual-viewport-height/u);
  assert.match(surfaceSource, /--poc-visual-viewport-bottom/u);
  assert.match(surfaceSource, /max-height: 480px/u);
  assert.match(surfaceSource, /orientation: landscape/u);
  assert.match(surfaceSource, /data-testid="personal-workspace-authoring-column" className=\{`\$\{mobileStep === 'input' \? 'block' : 'hidden'\} min-w-0 lg:block lg:pr-2`\}/u);
  assert.match(surfaceSource, /showMobileStageNav \? <nav/u);
  assert.match(surfaceSource, /data-testid="personal-workspace-authoring-input-guidance"/u);
  assert.match(surfaceSource, /data-testid="personal-workspace-authoring-result-cta"/u);
  assert.match(surfaceSource, /data-testid="personal-workspace-authoring-input-section"/u);
  assert.match(surfaceSource, /aria-controls=\{TEMPLATE_PICKER_ID\}/u);
  assert.match(surfaceSource, /onPointerDown=\{preserveEditorSelection\}/u);
  assert.match(surfaceSource, /group\.kind === 'map' \? <span/u);
  assert.doesNotMatch(surfaceSource, /group\.children\[0\]\?\.title \?\? group\.title/u);
  assert.match(surfaceSource, /\{lossFields\.length > 0 \? \(/u);
  assert.doesNotMatch(surfaceSource, /누락되는 정보가 없습니다/u);
});

test('authoring success becomes one focusable receipt screen without competing stages or save actions', () => {
  assert.match(surfaceSource, /const showMobileStageNav = !receipt/u);
  assert.match(surfaceSource, /data-product-receipt-only="true"/u);
  assert.match(surfaceSource, /personal-workspace-authoring-receipt-title" tabIndex=\{-1\}/u);
  assert.match(surfaceSource, /if \(!receipt\) return;[\s\S]*personal-workspace-authoring-receipt-title/u);
  assert.match(surfaceSource, /\{receipt \? \([\s\S]*renderAuthoringReceipt\(\)[\s\S]*\) : \(/u);
  assert.match(surfaceSource, /aria-hidden=\{receipt \? true : undefined\}/u);
});

test('authoring draft recovery stays inside the PoC storage facade', () => {
  const recovery = routeSource.indexOf(
    'recoverPersonalWorkspacePocStorageCommit(window.localStorage)',
  );
  const stateLoad = routeSource.indexOf(
    'loadPersonalWorkspacePocState(window.localStorage)',
  );
  assert.ok(recovery >= 0);
  assert.ok(stateLoad > recovery);
  assert.match(surfaceSource, /savePersonalWorkspacePocAuthoringDraft\(window\.localStorage/u);
  assert.match(surfaceSource, /clearPersonalWorkspacePocAuthoringDraft\(window\.localStorage\)/u);
  assert.match(routeSource, /loadPersonalWorkspacePocAuthoringDraft\(window\.localStorage\)/u);
  assert.match(routeSource, /authoringDraft\.kind === 'corrupt'/u);
  assert.match(routeSource, /initialAuthoringDraft=\{boot\.authoringDraft\}/u);
  assert.doesNotMatch(surfaceSource, /window\.localStorage\.(?:setItem|removeItem|clear)\(/u);
});

test('authoring handoff uses the PoC atomic writer after composition and semantic preflight', () => {
  const composition = surfaceSource.indexOf(
    'const composition = composePersonalWorkspacePocReadModel(initialModel, result.state)',
  );
  const preflight = surfaceSource.indexOf('const semanticPreflight = composition.ok');
  const save = surfaceSource.indexOf(
    'transactionId: `${identity.handoffId}:commit:${result.state.revision}`',
  );

  assert.ok(composition >= 0);
  assert.ok(preflight > composition);
  assert.ok(save > preflight);
  assert.equal(surfaceSource.match(/commitPersonalWorkspacePocStorage\(/gu)?.length, 1);
  assert.doesNotMatch(surfaceSource, /savePersonalWorkspacePocState\(/u);
  assert.match(surfaceSource, /removeAuthoringDraft: true/u);
});

test('native replacement failure preserves changed browser bytes in one PoC draft sync', () => {
  assert.equal(
    surfaceSource.match(/applied\?\.snapshot && applied\.snapshot\.rawText !== snapshot\.rawText/gu)?.length,
    4,
  );
  assert.equal(
    surfaceSource.match(/onNativeSourceInput\(applied\.snapshot\)/gu)?.length,
    4,
  );
  assert.match(surfaceSource, /현재 원문만 보관했어요/u);
  assert.doesNotMatch(surfaceSource, /textarea\.value\s*=/u);
});

test('authoring imports operating data readers only at boot and never imports an operating writer', () => {
  assert.match(routeSource, /import \{ readBundles \} from '@\/lib\/flow\/storage'/u);
  assert.doesNotMatch(surfaceSource, /from '@\/lib\/flow\/storage'/u);
  assert.doesNotMatch(
    `${routeSource}\n${surfaceSource}`,
    /\b(?:writeBundles|saveFlow|persistBundle|setChecks|setItemState|archiveFlow|exportFlow)\b/u,
  );
  assert.match(routeSource, /window\.location\.replace\('\/my'\)/u);
});
