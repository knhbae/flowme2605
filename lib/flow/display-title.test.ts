import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { toContentDisplayTitle, toUserFacingMapTitle, toUserFacingSourceTitle } from './display-title';
import { seedBundles } from './seed-flows';
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
  findPrototypeEnglishMonthTimeHits,
  findPrototypeEnglishUiVerbHits,
  findPrototypeEnglishWeekdayHits,
  findPrototypeMixedExportLanguageHits,
  findPrototypeRawRouteSlugHits,
  findRawIsoDateHits,
  findSourceSlugHits,
  findStructuralDisplayHits,
  findTrailingFlowSuffixHits,
  normalizeGuardrailLine,
  normalizeGuardrailLines,
  scanPrototypeRouteGuardrails,
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
  assert.ok(script.includes('findFirstTaskRepetitionHits'));
  assert.equal(script.includes('(?=$|\\s|[가-힣]|D-)'), false);
  assert.equal(script.includes('blob/${branchName}/flow-mvp'), false);
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
    ...seedBundles,
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

  assert.ok(subjects.length > 200);
  assert.deepEqual(failures, []);
});

test('scanUserSurfaceGuardrails does not waive raw ISO dates because a primary line says source', () => {
  const result = scanUserSurfaceGuardrails({
    primaryLines: ['원문 기준일 2026-07-17에 시작합니다.'],
    sourceLines: ['원문 URL https://example.com/2026-07-17'],
  });

  assert.deepEqual(result.rawIsoDateHits, ['원문 기준일 2026-07-17에 시작합니다.']);
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
  ]);
  assert.deepEqual(result.trailingFlowSuffixHits, ['자동차검사 준비 Flow']);
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
