import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTextAuthoringDocument,
  detectInputKinds,
} from './parser';
import {
  extractMarkdownFlowTitle,
  replaceMarkdownFlowTitle,
} from './authoring-grammar';
import { buildAuthoringArtifactProjection } from './artifact-projection';
import { validateTextAuthoringDocument } from './validation';

const FIXED_NOW = '2026-07-29T00:00:00.000Z';
const JEJU_TEXT =
  '8월 제주 여행 준비. 항공권 확인, 숙소 예약번호 정리, 렌터카 예약, 준비물 체크, 출발 전날 온라인 체크인';

function movingMarkdown(): string {
  const sections = [
    ['D-30 · 큰 결정과 예약', 5],
    ['D-14 · 계약과 주소', 5],
    ['D-7 · 짐 정리', 5],
    ['D-3 · 해지와 준비', 4],
    ['D-1 · 최종 확인', 4],
    ['D-Day · 이사 당일', 4],
  ] as const;
  const rows = [
    '# 이사 D-30 체크리스트',
    '기준일: 이사일',
    '출처: AJD 이사 준비 체크리스트',
  ];
  sections.forEach(([title, count], sectionIndex) => {
    rows.push(`## ${title}`);
    for (let itemIndex = 0; itemIndex < count; itemIndex += 1) {
      rows.push(`- [ ] 이사 준비 ${sectionIndex + 1}-${itemIndex + 1} 확인하기`);
      if (sectionIndex === 0 && itemIndex === 0) {
        rows.push('  자세히: 원문에 적힌 선택지를 비교한다.');
        rows.push('  완료 기준: 비교한 내용을 기록했다.');
      }
    }
  });
  return rows.join('\n');
}

test('same text and fixture produce stable block, mapping, and canonical IDs', () => {
  const first = createTextAuthoringDocument(JEJU_TEXT, {
    fixtureVersion: 'jeju-v1',
    now: FIXED_NOW,
  });
  const second = createTextAuthoringDocument(JEJU_TEXT, {
    fixtureVersion: 'jeju-v1',
    now: '2026-07-30T00:00:00.000Z',
  });

  assert.equal(first.documentId, second.documentId);
  assert.deepEqual(
    first.parseResult.blocks.map((block) => block.blockId),
    second.parseResult.blocks.map((block) => block.blockId),
  );
  assert.deepEqual(
    first.parseResult.mappings.map((mapping) => mapping.mappingId),
    second.parseResult.mappings.map((mapping) => mapping.mappingId),
  );
  assert.deepEqual(
    first.parseResult.canonical.items.map((item) => item.itemId),
    second.parseResult.canonical.items.map((item) => item.itemId),
  );
});

test('one Markdown H1 and the separate title value resolve to the same Flow title', () => {
  const raw = ['# 붙여 넣은 제목', '## 단계', '- [ ] 항목 확인'].join('\n');
  const document = createTextAuthoringDocument(raw, {
    title: '이전 제목',
    now: FIXED_NOW,
  });

  assert.equal(extractMarkdownFlowTitle(raw), '붙여 넣은 제목');
  assert.equal(document.title, '붙여 넣은 제목');
  assert.equal(document.parseResult.canonical.flow.title, '붙여 넣은 제목');

  const renamedRaw = replaceMarkdownFlowTitle(raw, '바꾼 제목');
  assert.match(renamedRaw, /^# 바꾼 제목$/mu);
  assert.equal(
    createTextAuthoringDocument(renamedRaw, {
      title: '이전 제목',
      now: FIXED_NOW,
    }).title,
    '바꾼 제목',
  );
  assert.equal(
    createTextAuthoringDocument('- [ ] 제목 없는 메모 확인', {
      title: '제목란의 제목',
      now: FIXED_NOW,
    }).title,
    '제목란의 제목',
  );
});

test('Jeju memo keeps the topic as Flow and creates exactly five source-backed Items', () => {
  const document = createTextAuthoringDocument(JEJU_TEXT, {
    importAssist: true,
    now: FIXED_NOW,
  });
  const canonical = document.parseResult.canonical;

  assert.equal(canonical.flow.title, '8월 제주 여행 준비');
  assert.deepEqual(
    canonical.items.map((item) => item.title),
    [
      '항공권 확인',
      '숙소 예약번호 정리',
      '렌터카 예약',
      '준비물 체크',
      '출발 전날 온라인 체크인',
    ],
  );
  assert.equal(canonical.items.length, 5);
  assert.equal(canonical.sourceRows.length, 6);
  assert.ok(!canonical.items.some((item) => item.title === '8월 제주 여행 준비'));
  canonical.items.forEach((item) => assert.equal(item.sourceRowIds.length, 1));
  assert.equal(validateTextAuthoringDocument(document).valid, true);
  assert.equal(buildAuthoringArtifactProjection(document).artifacts.todo.count, 5);

  const wrapped = createTextAuthoringDocument(
    '8월 제주 여행 준비.\n항공권 확인, 숙소 예약번호 정리, 렌터카 예약, 준비물 체크, 출발 전날 온라인 체크인',
    { importAssist: true, now: FIXED_NOW },
  );
  assert.equal(wrapped.parseResult.canonical.flow.title, '8월 제주 여행 준비');
  assert.equal(wrapped.parseResult.canonical.items.length, 5);
});

test('mixed dated Items keep Todo primary and expose Calendar as a meaningful secondary result', () => {
  const document = createTextAuthoringDocument(
    [
      '- [ ] 첫 번째 항목입니다.',
      '  시간: 09:00',
      '  시간대: Asia/Seoul',
      '  소요 시간: 30분',
      '  반복: 매주 월요일',
      '  날짜: 2026-08-03',
      '- [ ] 두 번째 항목입니다.',
    ].join('\n'),
    { now: FIXED_NOW },
  );
  const canonical = document.parseResult.canonical;
  const firstSchedule = canonical.items[0].schedule;

  assert.equal(canonical.flow.primaryArtifact, 'todo');
  assert.deepEqual(canonical.flow.secondaryArtifacts, ['calendar', 'memo']);
  assert.equal(firstSchedule?.kind, 'absolute');
  assert.equal(firstSchedule?.time, '09:00');
  assert.equal(firstSchedule?.timezone, 'Asia/Seoul');
  assert.equal(firstSchedule?.durationMinutes, 30);
  assert.equal(firstSchedule?.repeat, '매주 월요일');
  const calendar = buildAuthoringArtifactProjection(document).artifacts.calendar;
  assert.equal(calendar.count, 4);
  assert.deepEqual(
    {
      date: calendar.rows[0]?.date,
      time: calendar.rows[0]?.time,
      timezone: calendar.rows[0]?.timezone,
      durationMinutes: calendar.rows[0]?.durationMinutes,
    },
    {
      date: '2026-08-03',
      time: '09:00',
      timezone: 'Asia/Seoul',
      durationMinutes: 30,
    },
  );
});

test('resource and source labels support canonical Markdown links and legacy separators', () => {
  const document = createTextAuthoringDocument(
    [
      '# 링크 문법',
      '- [ ] 첫 번째 항목입니다.',
      '  자료: [참고 자료](https://example.com/resource)',
      '  출처: [원문](https://example.com/source)',
      '- [ ] 이전 문법 항목입니다.',
      '  자료: 이전 자료 | https://example.com/legacy',
    ].join('\n'),
    { now: FIXED_NOW },
  );
  const [item, legacyItem] = document.parseResult.canonical.items;

  assert.equal(item.resources[0]?.label, '참고 자료');
  assert.equal(item.sources[0]?.label, '원문');
  assert.equal(legacyItem.resources[0]?.label, '이전 자료');
});

test('document source metadata never becomes an Item source unless the source text says so', () => {
  const document = createTextAuthoringDocument(
    ['# 원문 충실성', '- [ ] 첫 번째 항목', '- [ ] 두 번째 항목'].join('\n'),
    {
      now: FIXED_NOW,
      sourceTitle: '문서 원문',
      sourceUrl: 'https://example.com/document-source',
    },
  );

  assert.equal(document.sourceUrl, 'https://example.com/document-source');
  assert.ok(document.parseResult.canonical.items.every(
    (item) => item.sources.length === 0,
  ));
});

test('malformed resource and source URLs are blocking issues while the raw rows remain', () => {
  const raw = [
    '# 링크 검증',
    '- [ ] 링크 확인',
    '  - 자료: example.com/resource',
    '  - 출처: [깨진 링크](example.com/source)',
  ].join('\n');
  const document = createTextAuthoringDocument(raw, { now: FIXED_NOW });
  const [item] = document.parseResult.canonical.items;
  const issues = document.parseResult.issues.filter(
    (issue) => issue.type === 'invalid_url',
  );

  assert.equal(item.resources.length, 0);
  assert.equal(item.sources.length, 0);
  assert.equal(issues.length, 2);
  assert.ok(issues.every((issue) => issue.blocking));
  assert.ok(issues.every((issue) => issue.itemId === item.itemId));
  assert.deepEqual(
    issues.map((issue) => issue.inputValue),
    ['example.com/resource', '[깨진 링크](example.com/source)'],
  );
  assert.equal(document.rawText, raw);
  assert.equal(validateTextAuthoringDocument(document).valid, true);
});

test('a malformed document-level source URL stays unresolved without an orphan field', () => {
  const raw = ['# 문서 링크 검증', '출처: example.com/source'].join('\n');
  const document = createTextAuthoringDocument(raw, { now: FIXED_NOW });

  assert.equal(document.parseResult.canonical.fields.length, 0);
  assert.equal(document.parseResult.issues[0]?.type, 'invalid_url');
  assert.equal(document.parseResult.issues[0]?.blocking, true);
  assert.equal(document.rawText, raw);
  assert.equal(validateTextAuthoringDocument(document).valid, true);
});

test('canonical Item markers and two-space properties keep flat Item ownership', () => {
  const document = createTextAuthoringDocument(
    [
      '# 항목 문법 예시',
      '## 준비',
      '- [ ] 첫 번째 항목',
      '  설명: 첫 번째 항목 설명',
      '- [ ] 두 번째 항목',
      '  설명: 두 번째 항목 설명',
    ].join('\n'),
    { now: FIXED_NOW },
  );
  const [first, second] = document.parseResult.canonical.items;
  const itemBlocks = document.parseResult.blocks.filter(
    (block) => block.interpretedRole === 'item',
  );
  const detailBlocks = document.parseResult.blocks.filter(
    (block) => block.interpretedRole === 'detail',
  );

  assert.deepEqual(
    document.parseResult.canonical.items.map((item) => ({
      title: item.title,
      nestingLevel: item.nestingLevel,
    })),
    [
      { title: '첫 번째 항목', nestingLevel: 0 },
      { title: '두 번째 항목', nestingLevel: 0 },
    ],
  );
  assert.equal(first.detail, '첫 번째 항목 설명');
  assert.equal(second.detail, '두 번째 항목 설명');
  assert.deepEqual(itemBlocks.map((block) => block.depth), [0, 0]);
  assert.deepEqual(detailBlocks.map((block) => block.depth), [1, 1]);
  assert.deepEqual(
    detailBlocks.map((block) => block.parentBlockId),
    itemBlocks.map((block) => block.blockId),
  );
  assert.deepEqual(
    document.parseResult.canonical.sourceRows
      .filter((row) => row.rowType === 'check')
      .map((row) => row.rawText),
    ['- [ ] 첫 번째 항목', '- [ ] 두 번째 항목'],
  );
});

test('invalid relative dates stay unresolved instead of becoming an anchor label', () => {
  const document = createTextAuthoringDocument(
    [
      '기준일: 행사일',
      '## 준비',
      '- [ ] 상대 일정 확인',
      '  상대 날짜: 내일',
    ].join('\n'),
    { now: FIXED_NOW },
  );

  assert.equal(document.parseResult.canonical.items[0].schedule, undefined);
  assert.equal(document.parseResult.issues[0]?.type, 'invalid_date');
  assert.equal(
    document.parseResult.issues[0]?.messageKey,
    'authoring.invalid_explicit_relative_date',
  );
  assert.equal(validateTextAuthoringDocument(document).valid, true);
});

test('unknown property labels stay in the source as issues instead of hidden detail', () => {
  const document = createTextAuthoringDocument(
    ['## 준비', '- [ ] 항목 확인', '  담당자: 홍길동'].join('\n'),
    { now: FIXED_NOW },
  );

  assert.equal(document.parseResult.canonical.items[0].detail, undefined);
  assert.equal(document.parseResult.issues[0]?.type, 'unknown_property');
  assert.equal(
    document.parseResult.issues[0]?.messageKey,
    'authoring.unknown_property',
  );
  assert.equal(validateTextAuthoringDocument(document).valid, true);
});

test('v2 property bullets belong to the preceding Item and never create ghost Items', () => {
  const raw = [
    '# 행사 준비',
    '- 기준일: 2026-08-10',
    '## 준비',
    '- [ ] 장소 확인',
    '  - 설명: 예약 가능 여부를 확인합니다.',
    '  - 상대 날짜: D-3',
    '  - 시간: 09:00',
    '  - 자료: [장소 안내](https://example.com/place)',
  ].join('\n');
  const document = createTextAuthoringDocument(raw, { now: FIXED_NOW });
  const [item] = document.parseResult.canonical.items;

  assert.equal(document.parseResult.canonical.items.length, 1);
  assert.equal(item.detail, '예약 가능 여부를 확인합니다.');
  assert.deepEqual(item.schedule, {
    kind: 'relative',
    raw: 'D-3',
    dayOffset: -3,
    anchorLabel: '2026-08-10',
    time: '09:00',
  });
  assert.deepEqual(
    item.resources.map(({ label, url }) => ({ label, url })),
    [{ label: '장소 안내', url: 'https://example.com/place' }],
  );
  assert.equal(document.parseResult.issues.length, 0);
  assert.equal(document.rawText, raw);
});

test('v3 preserves direct unknown properties as detail and one-level checks under the parent Item', () => {
  const raw = [
    '# 경계 확인',
    '## 준비',
    '- [ ] 부모 항목',
    '  - 담당자: 홍길동',
    '  - [ ] 하위 작업',
  ].join('\n');
  const document = createTextAuthoringDocument(raw, { now: FIXED_NOW });

  assert.deepEqual(
    document.parseResult.canonical.items.map((item) => item.title),
    ['부모 항목'],
  );
  assert.equal(document.parseResult.canonical.items[0].detail, '담당자: 홍길동');
  assert.deepEqual(
    document.parseResult.canonical.items[0].subchecks?.map((subcheck) => ({
      title: subcheck.title,
      sourceChecked: subcheck.sourceChecked,
    })),
    [{ title: '하위 작업', sourceChecked: false }],
  );
  assert.equal(document.parseResult.issues.length, 0);
  assert.deepEqual(
    document.parseResult.canonical.sourceRows
      .filter((row) => row.rawText.startsWith('  - '))
      .map((row) => row.rawText),
    ['  - 담당자: 홍길동', '  - [ ] 하위 작업'],
  );
  assert.equal(document.rawText, raw);
});

test('deeper or parentless nested checkboxes fail closed without creating Items', () => {
  const document = createTextAuthoringDocument([
    '  - [ ] 부모 없는 체크',
    '- [ ] 부모 항목',
    '    - [ ] 너무 깊은 체크',
  ].join('\n'), { now: FIXED_NOW });

  assert.deepEqual(
    document.parseResult.canonical.items.map((item) => item.title),
    ['부모 항목'],
  );
  assert.equal(document.parseResult.canonical.items[0].subchecks, undefined);
  assert.deepEqual(
    document.parseResult.issues.map((issue) => issue.type),
    ['missing_parent', 'unsupported_nested_item'],
  );
});

test('supported recurrence and execution condition become one structured series on one Item', () => {
  const document = createTextAuthoringDocument([
    '# 반복 문법',
    '- [ ] 필터 확인',
    '  - 반복: 매주 월, 수, 금',
    '  - 반복 종료: 12회',
    '  - 실행 조건: 정수기를 사용하는 경우',
    '  - 날짜: 2026-08-03',
  ].join('\n'), { now: FIXED_NOW });
  const [item] = document.parseResult.canonical.items;

  assert.equal(document.parseResult.canonical.items.length, 1);
  assert.deepEqual(item.recurrence, {
    raw: '매주 월, 수, 금',
    frequency: 'weekly',
    interval: 1,
    weekdays: ['MO', 'WE', 'FR'],
    end: { mode: 'count', count: 12, raw: '12회' },
    executionCondition: '정수기를 사용하는 경우',
    sourceRowIds: item.properties
      .filter((property) => ['repeat', 'repeat_end', 'condition'].includes(property.key))
      .flatMap((property) => property.sourceRowIds),
  });
  assert.equal(item.schedule?.repeat, '매주 월, 수, 금');
  assert.equal(document.parseResult.issues.length, 0);
});

test('unsupported recurrence, missing start, and earlier end stay explicit validation issues', () => {
  const unsupported = createTextAuthoringDocument([
    '- [ ] 횟수만 있는 반복',
    '  - 날짜: 2026-08-03',
    '  - 반복: 주 3회',
  ].join('\n'), { now: FIXED_NOW });
  const missingStart = createTextAuthoringDocument([
    '- [ ] 시작일 없는 반복',
    '  - 반복: 매일',
  ].join('\n'), { now: FIXED_NOW });
  const earlierEnd = createTextAuthoringDocument([
    '- [ ] 종료일이 빠른 반복',
    '  - 날짜: 2026-08-03',
    '  - 반복: 매일',
    '  - 반복 종료: 2026-08-02',
  ].join('\n'), { now: FIXED_NOW });
  const conflictingEnd = createTextAuthoringDocument([
    '- [ ] 종료 규칙이 두 개인 반복',
    '  - 날짜: 2026-08-03',
    '  - 반복: 매일',
    '  - 반복 종료: 12회',
    '  - 반복 종료: 2026-12-31',
  ].join('\n'), { now: FIXED_NOW });

  for (const document of [
    unsupported,
    missingStart,
    earlierEnd,
    conflictingEnd,
  ]) {
    assert.equal(document.parseResult.canonical.items[0].recurrence, undefined);
    assert.equal(document.parseResult.issues.at(-1)?.type, 'invalid_recurrence');
    assert.equal(document.parseResult.issues.at(-1)?.blocking, false);
  }
  assert.equal(
    missingStart.parseResult.issues.at(-1)?.messageKey,
    'authoring.recurrence_requires_start_date',
  );
  assert.equal(
    earlierEnd.parseResult.issues.at(-1)?.messageKey,
    'authoring.recurrence_until_before_start',
  );
  assert.equal(
    conflictingEnd.parseResult.issues.at(-1)?.messageKey,
    'authoring.conflicting_recurrence_fields',
  );
});

test('direct authoring preserves unmarked sentences without creating Items', () => {
  const raw = '항공권 확인';
  const document = createTextAuthoringDocument(raw, { now: FIXED_NOW });
  const imported = createTextAuthoringDocument(raw, {
    importAssist: true,
    now: FIXED_NOW,
  });

  assert.equal(document.parseResult.canonical.items.length, 0);
  assert.equal(document.parseResult.canonical.sourceRows[0]?.rawText, raw);
  assert.equal(document.parseResult.issues[0]?.type, 'ambiguous_role');
  assert.deepEqual(
    imported.parseResult.canonical.items.map((item) => item.title),
    ['항공권 확인'],
  );
});

test('only an ISO source anchor becomes the v2 relative-date anchor', () => {
  const valid = createTextAuthoringDocument(
    [
      '# 행사 준비',
      '- 기준일: 2026-08-10',
      '## 준비',
      '- [ ] 장소 확인',
      '  - 상대 날짜: D-3',
    ].join('\n'),
    { now: FIXED_NOW },
  );
  const invalid = createTextAuthoringDocument(
    [
      '# 행사 준비',
      '- 기준일: 행사일',
      '## 준비',
      '- [ ] 장소 확인',
      '  - 상대 날짜: D-3',
    ].join('\n'),
    { now: FIXED_NOW },
  );

  const validSchedule = valid.parseResult.canonical.items[0]?.schedule;
  const invalidSchedule = invalid.parseResult.canonical.items[0]?.schedule;
  assert.equal(validSchedule?.kind, 'relative');
  assert.equal(invalidSchedule?.kind, 'relative');
  assert.equal(
    validSchedule?.kind === 'relative' ? validSchedule.anchorLabel : undefined,
    '2026-08-10',
  );
  assert.equal(invalid.parseResult.canonical.items.length, 1);
  assert.equal(
    invalidSchedule?.kind === 'relative' ? invalidSchedule.anchorLabel : undefined,
    undefined,
  );
  assert.equal(invalid.parseResult.issues[0]?.type, 'invalid_date');
  assert.equal(invalid.parseResult.issues[0]?.messageKey, 'authoring.invalid_anchor_date');
});

test('moving Markdown preserves six Steps, 27 Items, detail, completion, and D-day offsets', () => {
  const document = createTextAuthoringDocument(movingMarkdown(), {
    fixtureVersion: 'moving-ajd-27',
    now: FIXED_NOW,
  });
  const canonical = document.parseResult.canonical;

  assert.equal(canonical.steps.length, 6);
  assert.equal(canonical.items.length, 27);
  assert.deepEqual(
    canonical.steps.map((step) => step.itemIds.length),
    [5, 5, 5, 4, 4, 4],
  );
  assert.deepEqual(
    canonical.steps.map((step) => (
      canonical.items.find((item) => item.stepId === step.stepId)?.schedule
    )).map((schedule) => (
      schedule?.kind === 'relative' ? schedule.dayOffset : null
    )),
    [-30, -14, -7, -3, -1, 0],
  );
  assert.equal(canonical.items[0].detail, '원문에 적힌 선택지를 비교한다.');
  assert.equal(canonical.items[0].completion?.doneWhen, '비교한 내용을 기록했다.');
  assert.equal(canonical.items[0].schedule?.kind, 'relative');
  assert.equal(
    canonical.items[0].schedule?.kind === 'relative'
      ? canonical.items[0].schedule.anchorLabel
      : undefined,
    '이사일',
  );
  assert.equal(validateTextAuthoringDocument(document).valid, true);
});

test('table rows remain one-to-one Items and URL-only input stays unresolved', () => {
  const table = [
    '주차\t주제\t활동',
    ...Array.from(
      { length: 14 },
      (_, index) => `${index + 1}주\t주제 ${index + 1}\t강의 ${index + 1} 듣기`,
    ),
  ].join('\n');
  const tableDocument = createTextAuthoringDocument(table, { now: FIXED_NOW });
  assert.equal(tableDocument.primaryInputKind, 'table');
  assert.equal(tableDocument.parseResult.canonical.items.length, 14);
  assert.equal(tableDocument.parseResult.artifactEligibility.primary, 'sheet');
  assert.ok(
    tableDocument.parseResult.canonical.items.every((item) => !item.schedule),
  );
  assert.equal(validateTextAuthoringDocument(tableDocument).valid, true);

  const urlDocument = createTextAuthoringDocument(
    'https://example.com/source',
    { now: FIXED_NOW },
  );
  assert.equal(urlDocument.primaryInputKind, 'url');
  assert.equal(urlDocument.parseResult.canonical.items.length, 0);
  assert.equal(urlDocument.parseResult.issues[0]?.type, 'source_import_required');
  assert.equal(urlDocument.lifecycleStatus, 'needs_review');
  assert.equal(validateTextAuthoringDocument(urlDocument).valid, true);
});

test('title-like table columns win over resource URLs and preserve all 38 Sheet rows', () => {
  const table = [
    '순서\t작품\t자료',
    ...Array.from(
      { length: 38 },
      (_, index) => (
        `${index + 1}\t오디오북 ${index + 1}\thttps://example.com/audio/${index + 1}`
      ),
    ),
  ].join('\n');
  const document = createTextAuthoringDocument(table, { now: FIXED_NOW });
  const projection = buildAuthoringArtifactProjection(document);

  assert.equal(document.parseResult.canonical.items.length, 38);
  assert.equal(document.parseResult.canonical.items[0].title, '오디오북 1');
  assert.equal(document.parseResult.canonical.items[0].intent, 'act');
  assert.equal(projection.artifacts.sheet.count, 38);
});

test('K-MOOC topic column wins over generic weekly activity for the Item title', () => {
  const document = createTextAuthoringDocument([
    '주차\t주제\t주차 활동',
    '1주\t학습 안내\t퀴즈 제출',
    '2주\t기본 개념\t과제 제출',
  ].join('\n'), { now: FIXED_NOW });

  assert.deepEqual(
    document.parseResult.canonical.items.map((item) => item.title),
    ['학습 안내', '기본 개념'],
  );
});

test('CSV tables are detected without treating the one-line Jeju commas as a table', () => {
  const csv = [
    '순서,작품,자료',
    '1,\"어린 왕자, 낭독본\",https://example.com/1',
    '2,오만과 편견,https://example.com/2',
  ].join('\n');
  const document = createTextAuthoringDocument(csv, { now: FIXED_NOW });

  assert.equal(document.primaryInputKind, 'table');
  assert.deepEqual(
    document.parseResult.canonical.items.map((item) => item.title),
    ['어린 왕자, 낭독본', '오만과 편견'],
  );
  assert.deepEqual(detectInputKinds(JEJU_TEXT), ['plain_text']);
});

test('unsupported syntax is retained with an issue and never becomes an invented Item', () => {
  const raw = ['# 메모', '```json', '{"unknown":true}', '```'].join('\n');
  const document = createTextAuthoringDocument(raw, { now: FIXED_NOW });
  const unsupported = document.parseResult.canonical.sourceRows.filter(
    (row) => row.rowType === 'unsupported',
  );

  assert.equal(document.parseResult.canonical.items.length, 0);
  assert.equal(unsupported.length, 3);
  assert.equal(document.parseResult.issues.length, 3);
  assert.ok(unsupported.every((row) => raw.includes(row.rawText)));
  assert.equal(validateTextAuthoringDocument(document).valid, true);
});

test('standalone explanatory prose stays in the source with an ambiguity issue', () => {
  const raw = '제주 여행은 여름에 사람이 많습니다.';
  const document = createTextAuthoringDocument(raw, { now: FIXED_NOW });

  assert.equal(document.parseResult.canonical.items.length, 0);
  assert.equal(document.parseResult.issues.length, 1);
  assert.equal(document.parseResult.issues[0].type, 'ambiguous_role');
  assert.equal(
    document.parseResult.canonical.sourceRows[0].rawText,
    raw,
  );
  assert.equal(validateTextAuthoringDocument(document).valid, true);
});

test('multiple explanatory fragments stay unresolved instead of becoming invented Items', () => {
  const raw = '여름에는 사람이 많습니다, 숙소 주변은 조용합니다.';
  const document = createTextAuthoringDocument(raw, { now: FIXED_NOW });

  assert.equal(document.parseResult.canonical.items.length, 0);
  assert.equal(document.parseResult.issues.length, 1);
  assert.deepEqual(
    document.parseResult.canonical.sourceRows.map((row) => row.rawText),
    [raw],
  );
  assert.ok(document.parseResult.issues.every(
    (issue) => issue.type === 'ambiguous_role',
  ));
  assert.equal(validateTextAuthoringDocument(document).valid, true);
});

test('mixed plain fragments create only explicit actions and retain explanatory text as an issue', () => {
  const raw =
    '제주 여행 준비. 항공권 확인, 여름에는 사람이 많습니다.';
  const document = createTextAuthoringDocument(raw, {
    importAssist: true,
    now: FIXED_NOW,
  });

  assert.deepEqual(
    document.parseResult.canonical.items.map((item) => item.title),
    ['항공권 확인'],
  );
  assert.equal(document.parseResult.issues.length, 1);
  const issueSourceRow = document.parseResult.canonical.sourceRows.find(
    (row) => document.parseResult.issues[0].sourceRowIds.includes(row.sourceRowId),
  );
  assert.equal(issueSourceRow?.rawText, '여름에는 사람이 많습니다.');
  assert.equal(
    document.parseResult.canonical.sourceRows
      .map((row) => row.rawText)
      .join(' | '),
    '제주 여행 준비. | 항공권 확인 | 여름에는 사람이 많습니다.',
  );
  assert.equal(validateTextAuthoringDocument(document).valid, true);
});

test('input detection reports mixed structure and parser does not infer a year', () => {
  assert.deepEqual(
    detectInputKinds('# 할 일\n- [ ] 문서 확인 https://example.com'),
    ['markdown', 'url', 'mixed'],
  );
  const document = createTextAuthoringDocument(
    ['# 제주 준비', '- [ ] 항공권 확인', '  날짜: 8월 3일'].join('\n'),
    { now: FIXED_NOW },
  );
  assert.equal(document.parseResult.canonical.items[0].schedule, undefined);
  assert.equal(document.parseResult.issues[0]?.type, 'invalid_date');
  assert.equal(
    document.parseResult.issues[0]?.itemId,
    document.parseResult.canonical.items[0].itemId,
  );
  assert.equal(document.parseResult.issues[0]?.inputValue, '8월 3일');
  assert.equal(document.parseResult.issues[0]?.expectedFormat, 'YYYY-MM-DD');
  assert.equal(validateTextAuthoringDocument(document).valid, true);
});

test('JSON serialization round-trip preserves raw source, ranges, and validation', () => {
  const document = createTextAuthoringDocument(
    ['# 일정', '## 2026-08-03', '- [ ] 출발 확인'].join('\r\n'),
    { now: FIXED_NOW },
  );
  const restored = JSON.parse(JSON.stringify(document)) as typeof document;

  assert.equal(restored.rawText, document.rawText);
  assert.deepEqual(
    restored.parseResult.canonical.sourceRows,
    document.parseResult.canonical.sourceRows,
  );
  assert.equal(
    restored.parseResult.canonical.items[0].schedule?.kind,
    'absolute',
  );
  assert.equal(validateTextAuthoringDocument(restored).valid, true);
});

test('source checkbox markers survive canonical parsing and artifact projection', () => {
  const document = createTextAuthoringDocument([
    '# 원문 체크 상태',
    '## 실행',
    '- [x] 원문에서 완료한 항목',
    '- [ ] 원문에서 미완료인 항목',
    '- 체크박스가 없는 일반 항목',
  ].join('\n'), { now: FIXED_NOW });

  assert.deepEqual(
    document.parseResult.canonical.items.map((item) => item.sourceChecked),
    [true, false, undefined],
  );
  assert.deepEqual(
    buildAuthoringArtifactProjection(document).artifacts.todo.rows.map(
      (row) => row.sourceChecked,
    ),
    [true, false, undefined],
  );
  assert.equal(validateTextAuthoringDocument(document).valid, true);
});
