import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { toContentDisplayTitle, toUserFacingMapTitle, toUserFacingSourceTitle } from './display-title';
import { isRuntimeExcludedBundle } from './runtime-content-policy';
import { seedBundles } from './seed-flows';
import {
  getFlowRouteIndexingTier,
  routeRequiresNoindex,
} from './route-indexing-policy';
import {
  getCuratedSourceAppSeedFlowMaps,
  getSourceBackedHomepageFlowMaps,
} from './source-backed-my-flow';
import {
  collectSourceSlugSignals,
  collectSourceSlugSignalsFromLines,
  countLineOccurrences,
  createSourceSlugHitRegex,
  findDuplicatePrototypeExportEntryHits,
  findFirstTaskRepetitionHits,
  findInternalCopyHits,
  findPrototypeEnglishMonthTimeHits,
  findPrototypeEnglishUiVerbHits,
  findPrototypeEnglishWeekdayHits,
  findPrototypeMixedExportLanguageHits,
  findPrototypeRawRouteSlugHits,
  getPrototypeRouteTier,
  getPrototypeRouteTierPolicy,
  findRawIsoDateHits,
  scanRawIsoInputValues,
  findSourceSlugHits,
  findStructuralDisplayHits,
  findTrailingFlowSuffixHits,
  normalizeGuardrailLine,
  normalizeGuardrailLines,
  scanPrototypeRouteGuardrails,
  scanUserFacingOutputGuardrails,
  scanUserSurfaceGuardrails,
  USER_SURFACE_GUARDRAIL_RUNTIME,
} from './user-surface-guardrails';

test('toContentDisplayTitle removes trailing Flow from content titles only', () => {
  assert.equal(toContentDisplayTitle('자동차검사 D-14 준비 Flow'), '자동차검사 D-14 준비');
  assert.equal(toContentDisplayTitle('이사 D-30 준비Flow'), '이사 D-30 준비');
  assert.equal(toContentDisplayTitle('전세계약 전 서류 체크 Flow'), '전세계약 전 서류 체크');
});

test('toContentDisplayTitle keeps service navigation and brand labels', () => {
  assert.equal(toContentDisplayTitle('FlowMe'), 'FlowMe');
  assert.equal(toContentDisplayTitle('내 Flow'), '내 Flow');
  assert.equal(toContentDisplayTitle('Flow 찾기'), 'Flow 찾기');
  assert.equal(toContentDisplayTitle('Flow'), 'Flow');
});

test('toUserFacingMapTitle hides internal map wording in saved content labels', () => {
  assert.equal(toUserFacingMapTitle('원룸 이사 D-30 일정 지도'), '원룸 이사 D-30 일정');
  assert.equal(toUserFacingMapTitle('영유아 검진·접종 일정 지도'), '영유아 검진·접종 일정');
  assert.equal(toUserFacingMapTitle('중1 수학 목차 진도표'), '중1 수학 목차 진도표');
});

test('toUserFacingSourceTitle removes slug-like source prefixes without changing source data', () => {
  assert.equal(toUserFacingSourceTitle('Mathbang 중1 수학 목차'), '중1 수학 목차');
  assert.equal(toUserFacingSourceTitle('Mathbang 중1 목차'), '중1 목차');
  assert.equal(toUserFacingSourceTitle('AJD 이사 준비 체크리스트'), '이사 준비 체크리스트');
  assert.equal(toUserFacingSourceTitle('AJD 이사할 때 체크리스트 상세 정리'), '이사할 때 체크리스트 상세 정리');
});
test('collectSourceSlugSignals derives source-like prefixes from seed metadata', () => {
  const signals = collectSourceSlugSignals([
    {
      flow: {
        title: 'Moving checklist',
        source_title: 'FutureBrand 이사 체크 원문',
        source_url: 'https://example.com/future',
      },
      itemDetails: [
        {
          links: [
            { label: 'DeskLab D-30 table rows', url: 'https://example.com/a', type: 'reference' },
            { label: '원문 보기', url: 'https://example.com/b', type: 'reference' },
          ],
        },
      ],
    },
  ]);

  assert.deepEqual(signals, ['DeskLab', 'FutureBrand']);
});

test('collectSourceSlugSignals ignores D-day tokens and video words that are not source names', () => {
  const signals = collectSourceSlugSignals([
    {
      flow: { source_title: 'D-30 moving checklist source' },
      itemDetails: [{ links: [{ label: 'D+10 follow-up rows', url: 'https://example.com', type: 'reference' }, { label: 'NO JUMPING CARDIO', url: 'https://example.com/no', type: 'reference' }] }],
    },
  ]);

  assert.deepEqual(signals, []);
});

test('collectSourceSlugSignals allows source-like prefixes that are already content title names', () => {
  const signals = collectSourceSlugSignals([
    {
      flow: {
        title: 'Allblanc home workout routine',
        source_title: 'Allblanc original video',
      },
    },
  ]);

  assert.deepEqual(signals, []);
});

test('scanUserSurfaceGuardrails checks source slugs only in primary text', () => {
  const clean = scanUserSurfaceGuardrails({
    primaryLines: ['이사 D-30 일정', '이사일만 넣으면 캘린더와 할 일이 생깁니다.'],
    sourceLines: ['DeskLab D-30 table rows', '원문과 근거'],
  });

  assert.equal(clean.sourceSlugHits.length, 0);

  const leaked = scanUserSurfaceGuardrails({
    primaryLines: ['DeskLab 이사 D-30 일정', '이사일만 넣으면 캘린더와 할 일이 생깁니다.'],
    sourceLines: ['DeskLab D-30 table rows'],
  });

  assert.deepEqual(leaked.sourceSlugHits, [{ signal: 'DeskLab', line: 'DeskLab 이사 D-30 일정' }]);
});

test('scanUserSurfaceGuardrails catches source slugs followed by punctuation', () => {
  const result = scanUserSurfaceGuardrails({
    primaryLines: [
      'DeskLab· moving schedule',
      'Mathbang) math checklist',
      'KKday, travel prep',
      'AJD. move checklist',
      'ajd.co.kr source detail',
    ],
    sourceSlugSignals: ['DeskLab', 'Mathbang', 'KKday', 'AJD'],
  });

  assert.deepEqual(result.sourceSlugHits, [
    { signal: 'DeskLab', line: 'DeskLab· moving schedule' },
    { signal: 'Mathbang', line: 'Mathbang) math checklist' },
    { signal: 'KKday', line: 'KKday, travel prep' },
    { signal: 'AJD', line: 'AJD. move checklist' },
  ]);
});

test('source slug regex source is exported as the capture-script runtime rule', () => {
  assert.ok(USER_SURFACE_GUARDRAIL_RUNTIME.sourceSlugBoundarySource.includes('\\p{Script=Hangul}'));
  assert.ok(USER_SURFACE_GUARDRAIL_RUNTIME.sourceSlugBoundarySource.includes('D-'));
  assert.ok(USER_SURFACE_GUARDRAIL_RUNTIME.sourceSlugBoundarySource.includes('(?![\\p{L}\\p{N}_])'));

  const regex = createSourceSlugHitRegex('DeskLab');
  assert.equal(regex.test('DeskLab· moving schedule'), true);
  assert.equal(regex.test('DeskLab) moving schedule'), true);
  assert.equal(regex.test('DeskLab. moving schedule'), true);
  assert.equal(regex.test('DeskLabsource moving schedule'), false);
});

test('capture script does not keep stale source slug or GitHub path copies', () => {
  const script = fs.readFileSync(
    path.join(process.cwd(), 'scripts', 'content-audit', 'capture-claude-p7-final-review-package.mjs'),
    'utf8',
  );

  assert.ok(script.includes('scanUserSurfaceGuardrails'));
  assert.ok(script.includes('scanPrototypeRouteGuardrails'));
  assert.ok(script.includes('scanRawIsoInputValues'));
  assert.ok(script.includes('findFirstTaskRepetitionHits'));
  assert.ok(script.includes('findInternalCopyHits'));
  assert.equal(script.includes('const forbiddenInternalTerms'), false);
  assert.equal(script.includes('forbiddenInternalTerms:'), false);
  assert.equal(script.includes('(?=$|\\s|[가-힣]|D-)'), false);
  assert.equal(script.includes('blob/${branchName}/flow-mvp'), false);
});

test('capture script exposes P11 evidence markers for actionable rows and accessible controls', () => {
  const script = fs.readFileSync(
    path.join(process.cwd(), 'scripts', 'content-audit', 'capture-claude-p7-final-review-package.mjs'),
    'utf8',
  );

  assert.ok(script.includes('continuationActionable'));
  assert.ok(script.includes('agendaGroupMeta'));
  assert.ok(script.includes('rowControlAccessibleNames'));
  assert.ok(script.includes('inventoryProgressMetrics'));
  assert.ok(script.includes('inventoryHeaderMetrics'));
  assert.ok(script.includes('normalRouteContinuationActionableCount'));
  assert.ok(script.includes('normalRouteAgendaGroupMetaCount'));
  assert.ok(script.includes('normalRouteRowControlAccessibleNameSampleCount'));
  assert.ok(script.includes('normalRouteInventoryDuplicateProgressMetricCount'));
  assert.ok(script.includes('normalRouteInventoryHeaderLargeRemainingCount'));
});

test('capture script exposes P13 wide viewport and post-save confirmation markers', () => {
  const script = fs.readFileSync(
    path.join(process.cwd(), 'scripts', 'content-audit', 'capture-claude-p7-final-review-package.mjs'),
    'utf8',
  );

  assert.ok(script.includes('wideViewportEvidenceCount'));
  assert.ok(script.includes('wideViewportRoutesCaptured'));
  assert.ok(script.includes('wideViewportHorizontalOverflowCount'));
  assert.ok(script.includes('wideViewportGuardrailRouteCount'));
  assert.ok(script.includes('wideViewportInternalHitCount'));
  assert.ok(script.includes('wideViewportSourceSlugHitCount'));
  assert.ok(script.includes('wideViewportRawIsoHitCount'));
  assert.ok(script.includes('wideViewportVisibleMarkdownHitCount'));
  assert.ok(script.includes('wideViewportCandidateCopyInternalHitCount'));
  assert.ok(script.includes('studioNavDestination'));
  assert.ok(script.includes('studioNavDestinationTier'));
  assert.ok(script.includes('postSaveConfirmationVisible'));
  assert.ok(script.includes('postSaveConfirmationText'));
  assert.ok(script.includes('postSaveConfirmationRepeatsFirstTaskTitle'));
});

test('capture script exposes flow-lab prototype bucket and internal QA link markers', () => {
  const script = fs.readFileSync(
    path.join(process.cwd(), 'scripts', 'content-audit', 'capture-claude-p7-final-review-package.mjs'),
    'utf8',
  );

  assert.ok(script.includes('prototype-flow-lab'));
  assert.ok(script.includes('prototypeReleasePreviewRouteCount'));
  assert.ok(script.includes('prototypeReleasePreviewGuardrailHitCount'));
  assert.ok(script.includes('prototypeInternalConsoleRouteCount'));
  assert.ok(script.includes('prototypeInternalConsoleGuardrailHitCount'));
  assert.ok(script.includes('prototypeInternalConsoleAllowedDisplayGateHitCount'));
  assert.ok(script.includes('flowLabPrototypeTier'));
  assert.ok(script.includes('flowLabPrototypeInternalConsoleContextVisible'));
  assert.ok(script.includes('flowLabPrototypeRouteCount'));
  assert.ok(script.includes('flowLabPrototypeGuardrailHitCount'));
  assert.ok(script.includes('flowLabPrototypeNoindex'));
  assert.ok(script.includes('flowLabPrototypeLinkedFromUserNavCount'));
  assert.ok(script.includes('flowLabPrototypeLinkedFromUserNavCountByViewport'));
  assert.ok(script.includes('manualRegistrationQaUserLinkCount'));
  assert.ok(script.includes('manualRegistrationQaUserLinkCountByViewport'));
});

test('prototype route tier policy separates release preview from internal console', () => {
  assert.equal(getPrototypeRouteTier('/restart/moving-d30'), 'release-preview');
  assert.equal(getPrototypeRouteTier('/restart/moving-d30?edit=true'), 'release-preview');
  assert.equal(getPrototypeRouteTier('/flow-lab/url-first-p0'), 'internal-console');
  assert.equal(getPrototypeRouteTier('/flow-lab/url-first-p0?sample=hit'), 'internal-console');
  assert.equal(getPrototypeRouteTier('/flows'), null);

  assert.deepEqual(getPrototypeRouteTierPolicy('release-preview'), {
    tier: 'release-preview',
    label: '출시 전 미리보기',
    allowInternalDisplayGateHits: false,
    requiresNoindex: true,
    requiresNoUserNavLinks: true,
  });
  assert.deepEqual(getPrototypeRouteTierPolicy('internal-console'), {
    tier: 'internal-console',
    label: '내부 실험 콘솔',
    allowInternalDisplayGateHits: true,
    requiresNoindex: true,
    requiresNoUserNavLinks: true,
  });
});

test('capture script exposes URL-first file-format and input ISO markers', () => {
  const script = fs.readFileSync(
    path.join(process.cwd(), 'scripts', 'content-audit', 'capture-claude-p7-final-review-package.mjs'),
    'utf8',
  );

  assert.ok(script.includes('urlFirstVisibleMarkdownHitCount'));
  assert.ok(script.includes('urlFirstNormalInputRawIsoExemptCount'));
  assert.ok(script.includes('urlFirstStartDateInputVisibleCount'));
  assert.ok(script.includes('url-first-start-date-input'));
  assert.ok(script.includes('scanUserFacingOutputGuardrails'));
  assert.ok(script.includes('urlFirstCandidateUserCopyEvidenceCount'));
  assert.ok(script.includes('urlFirstCandidateUserCopyInternalHitCount'));
  assert.ok(script.includes('urlFirstCandidateInternalHandoffPreserved'));
});

test('capture script exposes URL-first control-matrix reproducibility markers', () => {
  const script = fs.readFileSync(
    path.join(process.cwd(), 'scripts', 'content-audit', 'capture-claude-p7-final-review-package.mjs'),
    'utf8',
  );

  assert.ok(script.includes('urlFirstScenarioTriggerUrlCount'));
  assert.ok(script.includes('urlFirstScenarioTriggers'));
  assert.ok(script.includes('triggerUrl'));
  assert.ok(script.includes('exportModeScanned'));
  assert.ok(script.includes('urlFirstCandidateExpandedDetailCaptured'));
  assert.ok(script.includes('urlFirstCandidateResolvedHitScenarioCaptured'));
  assert.ok(script.includes('urlFirstCandidateResolvedHitScenarioStatus'));
  assert.ok(script.includes('urlFirstCandidateCardTextScanned'));
  assert.ok(script.includes('urlFirstCandidateCardLegacyStatusHitCount'));
});

test('capture script exposes URL-first user-copy tone markers', () => {
  const script = fs.readFileSync(
    path.join(process.cwd(), 'scripts', 'content-audit', 'capture-claude-p7-final-review-package.mjs'),
    'utf8',
  );

  assert.ok(script.includes('urlFirstMechanismCopyOldHitCount'));
  assert.ok(script.includes('urlFirstMechanismCopyValueHitCount'));
  assert.ok(script.includes('urlFirstCandidateLegacySystemCopyHitCount'));
  assert.ok(script.includes('urlFirstCandidateUserToneCopyHitCount'));
  assert.ok(script.includes('이미 만든 준비가 있는지 먼저 찾아봤어요'));
  assert.ok(script.includes('AI 자동 생성 없이 먼저 찾아봤어요'));
  assert.ok(script.includes('내가 쓴 제목·메모'));
});

test('route indexing policy keeps public discovery separate from stateful and old review pages', () => {
  assert.equal(getFlowRouteIndexingTier('/'), 'public-discovery');
  assert.equal(getFlowRouteIndexingTier('/flows'), 'public-discovery');
  assert.equal(getFlowRouteIndexingTier('/f/vehicle-inspection-prep'), 'public-discovery');
  assert.equal(getFlowRouteIndexingTier('/u/flow-curation-team'), 'public-discovery');
  assert.equal(getFlowRouteIndexingTier('/my'), 'personal-workspace');
  assert.equal(getFlowRouteIndexingTier('/calendar?date=2026-07-11'), 'personal-workspace');
  assert.equal(getFlowRouteIndexingTier('/flows/new'), 'creator-workspace');
  assert.equal(getFlowRouteIndexingTier('/flows/draft-id/edit'), 'creator-workspace');
  assert.equal(getFlowRouteIndexingTier('/flow-maps/moving-d30/creator'), 'creator-workspace');
  assert.equal(getFlowRouteIndexingTier('/u/my-flow-studio'), 'creator-workspace');
  assert.equal(getFlowRouteIndexingTier('/restart/moving-d30'), 'release-preview');
  assert.equal(getFlowRouteIndexingTier('/content-flows'), 'internal-review');
  assert.equal(getFlowRouteIndexingTier('/creators'), 'internal-review');
  assert.equal(getFlowRouteIndexingTier('/ia-compare/b'), 'internal-review');
  assert.equal(getFlowRouteIndexingTier('/flow-lab'), 'internal-console');
  assert.equal(routeRequiresNoindex('/flows'), false);
  assert.equal(routeRequiresNoindex('/creators'), true);
  assert.equal(routeRequiresNoindex('/restart/moving-d30'), true);
});

test('capture script exposes URL-first miss draft gate markers', () => {
  const script = fs.readFileSync(
    path.join(process.cwd(), 'scripts', 'content-audit', 'capture-claude-p7-final-review-package.mjs'),
    'utf8',
  );

  assert.ok(script.includes('flow-url-miss-draft-gate'));
  assert.ok(script.includes('urlFirstMissDraftGateVisible'));
  assert.ok(script.includes('urlFirstMissDraftCtaLabel'));
  assert.ok(script.includes('urlFirstMissPrimaryActionCount'));
  assert.ok(script.includes('urlFirstMissLegacyOperationalStateHitCount'));
  assert.ok(script.includes('urlFirstMissDraftImpliesLiveAi'));
  assert.ok(script.includes('urlFirstMissCandidateCopyInternalHitCount'));
});

test('capture script exposes P21 draft lifecycle and compact Calendar identity markers', () => {
  const script = fs.readFileSync(
    path.join(process.cwd(), 'scripts', 'content-audit', 'capture-claude-p7-final-review-package.mjs'),
    'utf8',
  );

  assert.ok(script.includes('draftLifecycleScenarioCount'));
  assert.ok(script.includes('draftSaveFailureInputPreserved'));
  assert.ok(script.includes('draftDuplicateCreatesExtraSavedFlow'));
  assert.ok(script.includes('draftEmptyStateCaptured'));
  assert.ok(script.includes('draftCompletedZeroStateCaptured'));
  assert.ok(script.includes('draftOfflineLocalActionsAvailable'));
  assert.ok(script.includes('homeUrlFirstEntrySeparatorPresent'));
  assert.ok(script.includes('calendarGridDistinctVisibleMarkerIdentityCount'));
});

test('capture script scopes Calendar role-title hits to Calendar headings', () => {
  const script = fs.readFileSync(
    path.join(process.cwd(), 'scripts', 'content-audit', 'capture-claude-p7-final-review-package.mjs'),
    'utf8',
  );

  assert.ok(script.includes('calendarTitleContainsMyFlowCount: calendarHeadings.filter'));
  assert.ok(!script.includes('calendarTitleContainsMyFlowCount: routeLines.filter'));
});

test('user surface guardrail helpers lock positive and negative display cases', () => {
  assert.equal(normalizeGuardrailLine('  first   line  '), 'first line');
  assert.deepEqual(normalizeGuardrailLines(['  first   line  ', '   ']), ['first line']);
  assert.deepEqual(collectSourceSlugSignalsFromLines(['DeskLab D-30 table rows', 'plain source']), ['DeskLab']);

  assert.deepEqual(findSourceSlugHits(['DeskLab. moving schedule', 'Plain moving schedule'], ['DeskLab']), [
    { signal: 'DeskLab', line: 'DeskLab. moving schedule' },
  ]);
  assert.deepEqual(findSourceSlugHits(['Plain moving schedule'], ['DeskLab']), []);

  assert.deepEqual(findStructuralDisplayHits(['Flow Map', 'source trace', 'Plain title']), [
    'Flow Map',
    'source trace',
  ]);
  assert.deepEqual(findStructuralDisplayHits(['Plain title']), []);

  assert.deepEqual(findTrailingFlowSuffixHits(['Moving Flow', 'FlowMe', 'Flow']), ['Moving Flow']);
  assert.deepEqual(findTrailingFlowSuffixHits(['FlowMe', 'Flow']), []);

  assert.deepEqual(findRawIsoDateHits(['Starts 2026-07-17', 'July 17']), ['Starts 2026-07-17']);
  assert.deepEqual(findRawIsoDateHits(['July 17']), []);

  assert.equal(countLineOccurrences(['alpha alpha', 'beta alpha'], 'alpha'), 3);
  assert.equal(countLineOccurrences(['alpha'], ''), 0);
  assert.deepEqual(
    findInternalCopyHits(['demo route', 'source-backed state', 'Flow Map shell', 'Step row', 'Item detail', 'plain title']),
    [
      { pattern: '\\bdemo\\b', line: 'demo route' },
      { pattern: 'source-backed', line: 'source-backed state' },
      { pattern: '\\bFlow Map\\b', line: 'Flow Map shell' },
      { pattern: '\\bStep\\b', line: 'Step row' },
      { pattern: '\\bItem\\b', line: 'Item detail' },
    ],
  );
});

test('user-facing output guardrails scan clipboard and download strings with the same internal-copy rules', () => {
  const dirtyOutput = [
    '# Flow 제작 후보 handoff',
    '- Canonical URL: https://example.com/procedure',
    '- Original URL: https://example.com/procedure?utm_source=user',
    '- [ ] Step으로 나눌 수 있는 실행 단위인지 확인',
    '- sourceTrace에 남길 출처를 분리',
  ].join('\n');
  const cleanOutput = [
    '# 요청 정리본',
    '- 원문 링크: https://example.com/procedure?utm_source=review',
    '- 요청 제목: 새로 보고 싶은 준비 체크리스트',
    '- 현재 상태: 아직 실행 가능한 Flow가 없어 요청 내용을 보관했어요.',
  ].join('\n');

  const dirtyResult = scanUserFacingOutputGuardrails({ text: dirtyOutput });
  assert.deepEqual(dirtyResult.internalCopyHits.map((hit) => hit.pattern), [
    '\\bhandoff\\b',
    'Canonical URL',
    'Original URL',
    '\\bStep\\b',
    'sourceTrace',
  ]);

  const cleanResult = scanUserFacingOutputGuardrails({ text: cleanOutput });
  assert.deepEqual(cleanResult.internalCopyHits, []);
  assert.deepEqual(cleanResult.rawIsoDateHits, []);
  assert.deepEqual(cleanResult.structuralDisplayHits, []);
});

test('prototype guardrail helpers lock positive and negative display cases', () => {
  assert.deepEqual(findPrototypeRawRouteSlugHits(['restart / moving-d30', 'Moving restart']), [
    'restart / moving-d30',
  ]);
  assert.deepEqual(findPrototypeRawRouteSlugHits(['Moving restart']), []);

  assert.deepEqual(findPrototypeEnglishWeekdayHits(['Sun', 'Sunday', '일요일']), ['Sun']);
  assert.deepEqual(findPrototypeEnglishWeekdayHits(['Sunday', '일요일']), []);

  assert.deepEqual(findPrototypeEnglishUiVerbHits(['download file', 'downloaded file']), ['download file']);
  assert.deepEqual(findPrototypeEnglishUiVerbHits(['downloaded file']), []);

  assert.deepEqual(findPrototypeEnglishMonthTimeHits(['Jan 12', '9 PM', 'January']), ['Jan 12', '9 PM']);
  assert.deepEqual(findPrototypeEnglishMonthTimeHits(['January']), []);

  assert.deepEqual(findPrototypeMixedExportLanguageHits(['export file', 'exported file']), ['export file']);
  assert.deepEqual(findPrototypeMixedExportLanguageHits(['exported file']), []);

  assert.deepEqual(findDuplicatePrototypeExportEntryHits(['Calendar file', 'Calendar file'], ['Calendar file']), [
    { label: 'Calendar file', count: 2 },
  ]);
  assert.deepEqual(findDuplicatePrototypeExportEntryHits(['Calendar file'], ['Calendar file']), []);
});

test('canonical seed and source-backed user-facing text pass display guardrails without route registration', () => {
  const subjects = [
    ...seedBundles.filter((bundle) => !isRuntimeExcludedBundle(bundle)),
    ...getSourceBackedHomepageFlowMaps(),
    ...getCuratedSourceAppSeedFlowMaps(),
  ];
  const sourceSlugSignals = collectSourceSlugSignals(subjects);
  const failures = subjects.flatMap((subject) => {
    const primaryLines = collectUserFacingSeedLines(subject);
    const result = scanUserSurfaceGuardrails({ primaryLines, sourceSlugSignals });
    const label = getSeedSubjectLabel(subject);

    return [
      ...result.sourceSlugHits.map((hit) => `${label} source slug ${hit.signal}: ${hit.line}`),
      ...result.structuralDisplayHits.map((line) => `${label} structural: ${line}`),
      ...result.trailingFlowSuffixHits.map((line) => `${label} trailing Flow: ${line}`),
      ...result.rawIsoDateHits.map((line) => `${label} raw ISO: ${line}`),
    ];
  });

  assert.ok(subjects.length > 150);
  assert.deepEqual(failures, []);
});

test('scanUserSurfaceGuardrails does not waive raw ISO dates because a primary line says source', () => {
  const result = scanUserSurfaceGuardrails({
    primaryLines: ['원문 기준일 2026-07-17에 시작합니다.'],
    sourceLines: ['원문 URL https://example.com/2026-07-17'],
  });

  assert.deepEqual(result.rawIsoDateHits, ['원문 기준일 2026-07-17에 시작합니다.']);
});

test('scanRawIsoInputValues separates native date values from user-visible input leaks', () => {
  const result = scanRawIsoInputValues([
    {
      label: '이사일',
      inputType: 'date',
      value: '2026-06-27',
      testId: 'moving-restart-date',
    },
    {
      label: '검색어',
      inputType: 'text',
      value: '2026-07-17',
      testId: 'visible-search',
    },
    {
      label: '메모',
      inputType: 'textarea',
      value: '원문 2026-07-18',
      testId: 'visible-note',
    },
    {
      label: '사용자용 날짜',
      inputType: 'date',
      value: '2026년 7월 17일',
      testId: 'friendly-date',
    },
  ]);

  assert.deepEqual(result.rawIsoInputValueExemptions, [
    {
      label: '이사일',
      inputType: 'date',
      value: '2026-06-27',
      testId: 'moving-restart-date',
      reason: 'native-date-input-value',
    },
  ]);
  assert.deepEqual(result.rawIsoInputValueHits, [
    {
      label: '검색어',
      inputType: 'text',
      value: '2026-07-17',
      testId: 'visible-search',
      reason: 'user-visible-input-value',
    },
    {
      label: '메모',
      inputType: 'textarea',
      value: '원문 2026-07-18',
      testId: 'visible-note',
      reason: 'user-visible-input-value',
    },
  ]);
});

test('scanUserSurfaceGuardrails finds structural title leaks and keeps allowed Flow labels', () => {
  const result = scanUserSurfaceGuardrails({
    primaryLines: [
      'Flow 찾기',
      '내 Flow에 저장',
      '홈 추천 큐레이션',
      '결혼 업체 후보 보드',
      '홈트 영상 큐',
      '원룸 이사 D-30 일정 지도',
      '자동차검사 준비 Flow',
      'Flow 상태판',
      'Flow 보드',
      'Flow 패널',
      '실행 큐',
      'source 트레이스',
      '위 카드에서 오늘 할 일을 바로 엽니다.',
      '전체 탭에서 봅니다.',
      '아래 카드에서 다음 할 일을 확인합니다.',
    ],
    sourceLines: [],
  });

  assert.deepEqual(result.structuralDisplayHits, [
    '원룸 이사 D-30 일정 지도',
    'Flow 상태판',
    'Flow 보드',
    'Flow 패널',
    '실행 큐',
    'source 트레이스',
    '위 카드에서 오늘 할 일을 바로 엽니다.',
    '전체 탭에서 봅니다.',
    '아래 카드에서 다음 할 일을 확인합니다.',
  ]);
  assert.deepEqual(result.trailingFlowSuffixHits, ['자동차검사 준비 Flow']);
});

test('scanUserSurfaceGuardrails flags URL-first roadmap and production handoff wording', () => {
  const result = scanUserSurfaceGuardrails({
    primaryLines: [
      'P0에서는 새 Flow를 만들지 않고 대기열로 넘깁니다.',
      'P12 URL-first 파이프라인 확인',
      'Canonical URL https://example.com/source-to-convert',
      'Claude review용 URL-first 후보 handoff 예시',
      '제작용 정보 보기',
      'Flow 찾기',
      '내 Flow에 저장',
    ],
  });

  assert.deepEqual(result.internalCopyHits, [
    { pattern: String.raw`\bP\d+\b`, line: 'P0에서는 새 Flow를 만들지 않고 대기열로 넘깁니다.' },
    { pattern: '대기열', line: 'P0에서는 새 Flow를 만들지 않고 대기열로 넘깁니다.' },
    { pattern: String.raw`\bP\d+\b`, line: 'P12 URL-first 파이프라인 확인' },
    { pattern: '파이프라인', line: 'P12 URL-first 파이프라인 확인' },
    { pattern: 'Canonical URL', line: 'Canonical URL https://example.com/source-to-convert' },
    { pattern: String.raw`\breview\b`, line: 'Claude review용 URL-first 후보 handoff 예시' },
    { pattern: String.raw`\bhandoff\b`, line: 'Claude review용 URL-first 후보 handoff 예시' },
    { pattern: '제작용 정보', line: '제작용 정보 보기' },
  ]);
});

test('scanUserSurfaceGuardrails flags URL-first candidate legacy state wording', () => {
  const result = scanUserSurfaceGuardrails({
    primaryLines: [
      '후보가 기존 콘텐츠로 닫힌 상태',
      '기존 콘텐츠로 연결된 상태',
      '이제 실행 가능한 수학 후보',
      '이미 Flow로 준비됨 · Flow 결과로 이동해 바로 시작할 수 있어요.',
    ],
  });

  assert.deepEqual(result.internalCopyHits, [
    { pattern: '기존 콘텐츠로 닫힌 상태', line: '후보가 기존 콘텐츠로 닫힌 상태' },
    { pattern: '기존 콘텐츠로 닫힌 상태', line: '기존 콘텐츠로 연결된 상태' },
    { pattern: '실행 가능한 후보 상태문', line: '이제 실행 가능한 수학 후보' },
  ]);
});

test('findFirstTaskRepetitionHits uses the rendered first task title instead of fixed strings', () => {
  const hits = findFirstTaskRepetitionHits(
    ['저장됨', '오늘 할 일', 'Future task title', 'Future task title', '먼저 열기'],
    'Future task title',
    { maxCount: 1 },
  );

  assert.deepEqual(hits, [
    { title: 'Future task title', count: 2, extraLines: ['Future task title'] },
  ]);
});

function collectUserFacingSeedLines(subject: unknown): string[] {
  const record = isRecord(subject) ? subject : {};
  if (isRecord(record.flow)) return collectFlowBundleUserFacingLines(record);
  return collectSourceBackedMapUserFacingLines(record);
}

function collectFlowBundleUserFacingLines(bundle: Record<string, unknown>): string[] {
  const flow = isRecord(bundle.flow) ? bundle.flow : {};
  const lines = [
    toContentDisplayTitle(asText(flow.title)),
    asText(flow.setup_anchor_label),
    asText(flow.setup_anchor_hint),
  ];

  for (const item of asArray(bundle.items)) {
    if (!isRecord(item)) continue;
    lines.push(
      asText(item.title),
      asText(item.repeat_rule),
    );
  }

  return normalizeTestLines(lines);
}

function collectSourceBackedMapUserFacingLines(map: Record<string, unknown>): string[] {
  const setupInput = isRecord(map.setupInput) ? map.setupInput : {};
  return normalizeTestLines([
    toUserFacingMapTitle(asText(map.title)),
    asText(map.userLabel),
    asText(map.categoryLabel),
    asText(map.userFacingStatus),
    asText(map.summary),
    ...asArray(map.artifacts).map(asText),
    asText(setupInput.label),
    asText(setupInput.hint),
  ]);
}

function getSeedSubjectLabel(subject: unknown): string {
  if (!isRecord(subject)) return 'unknown';
  if (isRecord(subject.flow)) return asText(subject.flow.slug) || asText(subject.flow.title) || 'flow-bundle';
  return asText(subject.id) || asText(subject.title) || 'source-backed-map';
}

function normalizeTestLines(lines: string[]): string[] {
  return lines.map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

test('scanPrototypeRouteGuardrails flags prototype-only display gate leaks', () => {
  const result = scanPrototypeRouteGuardrails({
    primaryLines: [
      'restart / moving-d30',
      'Sun',
      'download file',
      'copy checklist',
      'sync calendar',
      'import rows',
      'Jan 12',
      '9:00 AM',
      '파일 받기',
      '체크리스트 복사',
      '날짜를 편집한 뒤 export합니다.',
      '내 도구로 가져가기',
      '내 도구로 가져가기',
    ],
    exportEntryLabels: ['내 도구로 가져가기'],
  });

  assert.deepEqual(result.rawRouteSlugHits, ['restart / moving-d30']);
  assert.deepEqual(result.englishWeekdayHits, ['Sun']);
  assert.deepEqual(result.englishUiVerbHits, [
    'download file',
    'copy checklist',
    'sync calendar',
    'import rows',
  ]);
  assert.deepEqual(result.englishMonthTimeHits, ['Jan 12', '9:00 AM']);
  assert.deepEqual(result.mixedExportLanguageHits, ['날짜를 편집한 뒤 export합니다.']);
  assert.deepEqual(result.duplicateExportEntryHits, [
    { label: '내 도구로 가져가기', count: 2 },
  ]);
});
