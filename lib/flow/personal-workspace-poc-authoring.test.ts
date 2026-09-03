import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES,
  PERSONAL_WORKSPACE_POC_EMPTY_SOURCE_FINGERPRINT,
  fingerprintPersonalWorkspacePocAuthoringSource,
  materializePersonalWorkspacePocAuthoring,
  parsePersonalWorkspacePocAuthoringRecurrence,
  parsePersonalWorkspacePocAuthoring,
} from './personal-workspace-poc-authoring';

const EXPECTED_TEMPLATES = [
  {
    templateId: 'exercise-phased-4w-v1',
    label: '단계별 반복',
    description: '단계마다 기간과 반복할 일이 달라요.',
    exampleLabel: '4주 운동 적응',
    exampleSource: '# 4주 운동 적응\n- 기준일: 2026-09-07\n\n## 1단계\n- [ ] 걷기 20분\n  - 날짜: 2026-09-07\n  - 반복: 매주 월, 수, 금\n  - 반복 종료: 2026-09-20',
    scaffold:
      '# \n- 기준일: \n\n## \n- [ ] \n  - 날짜: \n  - 반복: \n  - 반복 종료: ',
  },
  {
    templateId: 'exercise-weekly-repeat-v1',
    label: '같은 일정 반복',
    description: '정한 기간 동안 같은 일정으로 반복해요.',
    exampleLabel: '주간 운동 루틴',
    exampleSource: '# 주간 운동 루틴\n- 기준일: 2026-09-07\n\n## 이번 주\n- [ ] 아침 스트레칭\n  - 날짜: 2026-09-07\n  - 반복: 매주 월, 수, 금\n  - 반복 종료: 2026-10-02',
    scaffold:
      '# \n- 기준일: \n\n## \n- [ ] \n  - 날짜: \n  - 반복: \n  - 반복 종료: ',
  },
  {
    templateId: 'moving-dday-v1',
    label: '기준일 전후 준비',
    description: '한 날짜를 기준으로 앞뒤 할 일을 적어요.',
    exampleLabel: '이사 준비',
    exampleSource: '# 이사 준비\n- 기준일: 2026-10-10\n\n## 계약\n- [ ] 주소 변경 신청\n  - 상대 날짜: D-7',
    scaffold: '# \n- 기준일: \n\n## \n- [ ] \n  - 상대 날짜: ',
  },
  {
    templateId: 'wedding-dday-v1',
    label: '기준일 전후 준비 + 자료',
    description: '앞뒤 할 일과 참고 링크를 함께 적어요.',
    exampleLabel: '결혼 준비',
    exampleSource: '# 결혼 준비\n- 기준일: 2027-04-17\n\n## 예약\n- [ ] 식장 계약 확인\n  - 상대 날짜: D-180\n  - 자료: https://example.com/venue',
    scaffold:
      '# \n- 기준일: \n\n## \n- [ ] \n  - 상대 날짜: \n  - 자료: ',
  },
  {
    templateId: 'travel-itinerary-prep-v1',
    label: '준비 + 날짜별 일정',
    description: '사전 준비와 날짜별 시간·장소를 함께 적어요.',
    exampleLabel: '여행 준비와 날짜별 일정',
    exampleSource: '# 제주 여행\n- 기준일: 2026-10-03\n\n## 출발 전\n- [ ] 온라인 체크인\n  - 상대 날짜: D-1\n\n## 첫째 날\n- [ ] 렌터카 받기\n  - 날짜: 2026-10-03\n  - 시간: 11:00\n  - 시간대: Asia/Seoul\n  - 장소: 제주공항',
    scaffold:
      '# \n- 기준일: \n\n## \n- [ ] \n  - 상대 날짜: \n\n## \n- [ ] \n  - 날짜: \n  - 시간: \n  - 시간대: \n  - 장소: ',
  },
  {
    templateId: 'exam-dday-study-v1',
    label: '반복 준비 + 목표일',
    description: '반복할 일과 마지막 일정을 함께 적어요.',
    exampleLabel: '시험 준비',
    exampleSource: '# 자격시험 준비\n- 기준일: 2026-11-14\n\n- [ ] 기출문제 풀기\n  - 날짜: 2026-10-13\n  - 반복: 매주 화, 목\n  - 반복 종료: 2026-11-12\n  - 완료 기준: 오답을 다시 설명할 수 있다\n\n- [ ] 시험 응시\n  - 날짜: 2026-11-14',
    scaffold:
      '# \n- 기준일: \n\n- [ ] \n  - 날짜: \n  - 반복: \n  - 반복 종료: \n  - 완료 기준: \n\n- [ ] \n  - 날짜: ',
  },
] as const;

test('copies the six approved template IDs, labels, and source bytes exactly', () => {
  assert.deepEqual(PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES, EXPECTED_TEMPLATES);
  assert.equal(
    fingerprintPersonalWorkspacePocAuthoringSource(''),
    PERSONAL_WORKSPACE_POC_EMPTY_SOURCE_FINGERPRINT,
  );
});

test('parses supported execution properties and recurrence without fidelity loss', () => {
  const rawText = [
    '# 도쿄 여행',
    '- 기준일: 2026-10-10',
    '',
    '이 문장은 개인 메모라서 실행 항목이 아니다.',
    '## 출발 전',
    '- [ ] 여권 확인',
    '  - 상대 날짜: D-7',
    '  - 자료: https://example.com/passport',
    '  - 완료 기준: 유효기간을 확인했다',
    '## 첫째 날',
    '- [ ] 공항에서 숙소로 이동',
    '  - 날짜: 2026-10-10',
    '  - 시간: 13:30',
    '  - 시간대: Asia/Seoul',
    '  - 장소: 하네다공항',
    '  - 반복: 매일',
    '  - 반복 종료: 2026-10-12',
    '- [x] 이미 끝난 메모',
    '- 일반 목록도 메모다',
  ].join('\n');

  const result = parsePersonalWorkspacePocAuthoring(rawText);
  assert.equal(result.title, '도쿄 여행');
  assert.equal(result.anchorDate, '2026-10-10');
  assert.deepEqual(result.blockingIssues, []);
  assert.equal(result.items.length, 3);
  assert.deepEqual(result.items[0], {
    sourceLine: 6,
    sourceOrder: 0,
    title: '여권 확인',
    sectionTitle: '출발 전',
    sourceChecked: false,
    relativeDate: 'D-7',
    resolvedDate: '2026-10-03',
    resourceUrl: 'https://example.com/passport',
    completionCriteria: '유효기간을 확인했다',
  });
  assert.deepEqual(result.items[1], {
    sourceLine: 11,
    sourceOrder: 1,
    title: '공항에서 숙소로 이동',
    sectionTitle: '첫째 날',
    sourceChecked: false,
    date: '2026-10-10',
    resolvedDate: '2026-10-10',
    time: '13:30',
    timeZone: 'Asia/Seoul',
    place: '하네다공항',
    recurrence: '매일',
    recurrenceEnd: '2026-10-12',
    recurrenceRule: {
      version: 1,
      raw: '매일',
      frequency: 'daily',
      interval: 1,
      end: { mode: 'until', date: '2026-10-12', raw: '2026-10-12' },
    },
  });
  assert.deepEqual(result.items[2], {
    sourceLine: 18,
    sourceOrder: 2,
    title: '이미 끝난 메모',
    sectionTitle: '첫째 날',
    sourceChecked: true,
  });
});

test('does not turn ordinary prose or memo bullets into canonical Items', () => {
  const result = parsePersonalWorkspacePocAuthoring(
    ['오늘 떠오른 생각', '- 우유 사기', '다음 문장'].join(
      '\n',
    ),
  );
  assert.equal(result.title, undefined);
  assert.deepEqual(result.items, []);
  assert.deepEqual(result.blockingIssues, []);
});

test('keeps every untouched blank scaffold source-only with zero canonical Items', () => {
  for (const template of PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES) {
    const result = parsePersonalWorkspacePocAuthoring(template.scaffold);
    assert.equal(result.items.length, 0, template.templateId);
    assert.equal(result.blockingIssues.length, 0, template.templateId);
    assert.equal(result.rawText, template.scaffold, template.templateId);
  }
});

test('blocks invalid nonblank dates, time, time zone, URL, and relative dates without a valid anchor', () => {
  const result = parsePersonalWorkspacePocAuthoring(
    [
      '# 잘못된 일정',
      '- 기준일: 2026-02-30',
      '- [ ] 점검',
      '  - 상대 날짜: D-2',
      '  - 날짜: 2026-13-01',
      '  - 시간: 25:90',
      '  - 시간대: Seoul/Unknown',
      '  - 자료: javascript:alert(1)',
      '  - 반복 종료: 2026-02-30',
      '- [ ] 형식도 잘못됨',
      '  - 상대 날짜: 이틀 전',
    ].join('\n'),
  );

  assert.deepEqual(
    new Set(result.blockingIssues.map((entry) => entry.code)),
    new Set([
      'invalid-anchor-date',
      'invalid-date',
      'invalid-time',
      'invalid-time-zone',
      'invalid-url',
      'invalid-recurrence-end',
      'relative-date-requires-anchor',
      'invalid-relative-date',
    ]),
  );
  assert.equal(result.blockingIssues.every((entry) => entry.blocking), true);
});

test('parses the bounded recurrence grammar and rejects aliases or invalid endings', () => {
  assert.deepEqual(
    parsePersonalWorkspacePocAuthoringRecurrence({ raw: '매일' }),
    {
      ok: true,
      rule: { version: 1, raw: '매일', frequency: 'daily', interval: 1 },
    },
  );
  assert.deepEqual(
    parsePersonalWorkspacePocAuthoringRecurrence({ raw: '2일마다' }),
    {
      ok: true,
      rule: { version: 1, raw: '2일마다', frequency: 'daily', interval: 2 },
    },
  );
  assert.deepEqual(
    parsePersonalWorkspacePocAuthoringRecurrence({
      raw: '매주 금, 월, 수, 월요일',
      recurrenceEnd: '12회',
      executionCondition: '정수기를 사용 중인 경우',
    }),
    {
      ok: true,
      rule: {
        version: 1,
        raw: '매주 금, 월, 수, 월요일',
        frequency: 'weekly',
        interval: 1,
        weekdays: ['MO', 'WE', 'FR'],
        end: { mode: 'count', count: 12, raw: '12회' },
        executionCondition: '정수기를 사용 중인 경우',
      },
    },
  );
  assert.deepEqual(
    parsePersonalWorkspacePocAuthoringRecurrence({ raw: '2주마다 화, 목' }),
    {
      ok: true,
      rule: {
        version: 1,
        raw: '2주마다 화, 목',
        frequency: 'weekly',
        interval: 2,
        weekdays: ['TU', 'TH'],
      },
    },
  );
  assert.deepEqual(
    parsePersonalWorkspacePocAuthoringRecurrence({ raw: '매월 15일' }),
    {
      ok: true,
      rule: {
        version: 1,
        raw: '매월 15일',
        frequency: 'monthly',
        interval: 1,
        dayOfMonth: 15,
      },
    },
  );
  assert.deepEqual(
    parsePersonalWorkspacePocAuthoringRecurrence({ raw: '3개월마다 10일' }),
    {
      ok: true,
      rule: {
        version: 1,
        raw: '3개월마다 10일',
        frequency: 'monthly',
        interval: 3,
        dayOfMonth: 10,
      },
    },
  );
  assert.deepEqual(
    parsePersonalWorkspacePocAuthoringRecurrence({ raw: '월, 수, 금' }),
    { ok: false, reason: 'unsupported-rule' },
  );
  assert.deepEqual(
    parsePersonalWorkspacePocAuthoringRecurrence({
      raw: '매일',
      recurrenceEnd: '0회',
    }),
    { ok: false, reason: 'invalid-end' },
  );
});

test('preserves dedicated properties, source checkbox states, subchecks, and source-backed descriptions', () => {
  const rawText = [
    '# 집 관리',
    '## 이번 달',
    '- [x] 정수기 필터 확인',
    '  - 설명: 필터 상태를 확인합니다.',
    '  - 날짜: 2026-09-07',
    '  - 시간: 07:30',
    '  - 시간대: Asia/Seoul',
    '  - 장소: 부엌',
    '  - 소요 시간: 2시간',
    '  - 자료: [교체 안내](https://example.com/resource)',
    '  - 출처: [공식 문서](https://example.com/source)',
    '  - 반복: 매주 월, 수, 금',
    '  - 반복 종료: 12회',
    '  - 실행 조건: 정수기를 사용 중인 경우',
    '  - 완료 기준: 사진을 남겼다',
    '  - 안내: 설명서를 먼저 확인한다',
    '  - 주의: 전원을 먼저 끄는다',
    '  - 담당 메모: 교체 필요 여부를 기록',
    '  - 모델: ABC-100',
    '  - [x] 전원 끄기',
    '  - [ ] 필터 상태 확인',
  ].join('\n');

  const parsed = parsePersonalWorkspacePocAuthoring(rawText);
  assert.deepEqual(parsed.blockingIssues, []);
  assert.equal(parsed.items.length, 1);
  assert.deepEqual(parsed.items[0], {
    sourceLine: 3,
    sourceOrder: 0,
    title: '정수기 필터 확인',
    sectionTitle: '이번 달',
    sourceChecked: true,
    description: '필터 상태를 확인합니다.',
    additionalDescriptions: [
      '담당 메모: 교체 필요 여부를 기록',
      '모델: ABC-100',
    ],
    date: '2026-09-07',
    resolvedDate: '2026-09-07',
    time: '07:30',
    timeZone: 'Asia/Seoul',
    place: '부엌',
    durationMinutes: 120,
    resourceUrl: 'https://example.com/resource',
    resourceLabel: '교체 안내',
    sourceUrl: 'https://example.com/source',
    sourceLabel: '공식 문서',
    recurrence: '매주 월, 수, 금',
    recurrenceEnd: '12회',
    recurrenceRule: {
      version: 1,
      raw: '매주 월, 수, 금',
      frequency: 'weekly',
      interval: 1,
      weekdays: ['MO', 'WE', 'FR'],
      end: { mode: 'count', count: 12, raw: '12회' },
      executionCondition: '정수기를 사용 중인 경우',
    },
    executionCondition: '정수기를 사용 중인 경우',
    completionCriteria: '사진을 남겼다',
    guide: '설명서를 먼저 확인한다',
    caution: '전원을 먼저 끄는다',
    subchecks: [
      {
        subcheckId: parsed.items[0].subchecks?.[0]?.subcheckId,
        sourceLine: 20,
        sourceOrder: 0,
        title: '전원 끄기',
        sourceChecked: true,
      },
      {
        subcheckId: parsed.items[0].subchecks?.[1]?.subcheckId,
        sourceLine: 21,
        sourceOrder: 1,
        title: '필터 상태 확인',
        sourceChecked: false,
      },
    ],
  });

  const materialized = materializePersonalWorkspacePocAuthoring({
    handoffId: 'handoff-rich',
    documentId: 'document-rich',
    revisionId: 'revision-rich',
    rawText,
    committedAt: '2026-09-03T00:00:00.000Z',
  });
  assert.equal(materialized.ok, true);
  if (!materialized.ok) return;
  assert.equal(materialized.flow.items.length, 1);
  assert.equal(
    materialized.flow.items[0].description,
    '필터 상태를 확인합니다.\n담당 메모: 교체 필요 여부를 기록\n모델: ABC-100',
  );
  assert.equal(materialized.flow.items[0].description?.includes('반복:'), false);
  assert.deepEqual(
    materialized.flow.authoring.parsedItems,
    materialized.parseResult.items,
  );
  assert.deepEqual(materialized.handoff.lossFields, []);
});

test('invalid dedicated values remain source-linked blockers', () => {
  const rawText = [
    '# 잘못된 속성',
    '- [ ] 확인',
    '  - 소요 시간: 0분',
    '  - 출처: [공식](javascript:alert(1))',
    '  - 반복: 월, 수, 금',
  ].join('\n');
  const parsed = parsePersonalWorkspacePocAuthoring(rawText);
  assert.deepEqual(
    parsed.blockingIssues.map((entry) => [entry.code, entry.line]),
    [
      ['invalid-duration', 3],
      ['invalid-url', 4],
      ['invalid-recurrence', 5],
    ],
  );
});

test('recurrence requires a resolved start and cannot end before it', () => {
  const parsed = parsePersonalWorkspacePocAuthoring([
    '# 반복 경계',
    '- [ ] 시작일 없음',
    '  - 반복: 매일',
    '- [ ] 종료일이 빠름',
    '  - 날짜: 2026-09-07',
    '  - 반복: 매일',
    '  - 반복 종료: 2026-09-06',
  ].join('\n'));

  assert.deepEqual(
    parsed.blockingIssues.map((entry) => [entry.code, entry.line]),
    [
      ['invalid-recurrence', 3],
      ['invalid-recurrence', 7],
    ],
  );
  assert.equal(parsed.items.every((item) => item.recurrenceRule === undefined), true);
});

test('materialization is deterministic and preserves raw source plus lineage', () => {
  const rawText = [
    '# 이사 준비',
    '- 기준일: 2026-11-20',
    '## 계약 전',
    '- [ ] 계약서 확인',
    '  - 상대 날짜: D-30',
    '  - 자료: https://example.com/contract',
    '  - 완료 기준: 특약을 확인했다',
  ].join('\n');
  const input = {
    handoffId: 'handoff-001',
    documentId: 'document-001',
    revisionId: 'revision-003',
    rawText,
    committedAt: '2026-09-02T00:00:00.000Z',
    templateId: 'moving-dday-v1' as const,
  };

  const first = materializePersonalWorkspacePocAuthoring(input);
  const second = materializePersonalWorkspacePocAuthoring(input);
  assert.deepEqual(first, second);
  assert.equal(first.ok, true);
  if (!first.ok) return;

  assert.equal(first.flow.origin, 'authoring-handoff');
  assert.equal(first.flow.anchorDate, '2026-11-20');
  assert.equal(first.flow.items[0].sourceDate, '2026-10-21');
  assert.match(first.flow.savedCopyId, /^authoring-copy-/u);
  assert.match(first.flow.flowId, /^authoring-flow-/u);
  assert.match(first.flow.items[0].itemId, /^authoring-item-/u);
  assert.equal(first.flow.sections?.length, 1);
  assert.match(first.flow.sections?.[0].sectionId ?? '', /^authoring-section-/u);
  assert.equal(first.flow.sections?.[0].title, '계약 전');
  assert.equal(first.flow.sections?.[0].titleOwner, 'authoring');
  assert.equal(first.flow.sections?.[0].editCapability, 'poc-shadow');
  assert.equal(first.flow.items[0].sectionId, first.flow.sections?.[0].sectionId);
  assert.equal(first.flow.items[0].sectionTitle, '계약 전');
  assert.equal(
    first.handoff.identityMap['section:line:3'],
    first.flow.sections?.[0].sectionId,
  );
  assert.match(first.flow.ref, /^saved-flow:/u);
  assert.match(first.flow.items[0].ref, /^flow-item:/u);
  assert.equal(first.rawText, rawText);
  assert.equal(first.lineage.rawText, rawText);
  assert.equal(first.lineage.sourceFingerprint, first.sourceFingerprint);
  assert.equal(first.lineage.handoffId, input.handoffId);
  assert.equal(first.flow.authoring.source, 'text-authoring-poc-v1');
  assert.deepEqual(first.flow.authoring.parsedItems, first.parseResult.items);
  assert.deepEqual(first.lineage.sourceLineItemIdentityMap, {
    '4': {
      sourceLine: 4,
      itemRef: first.flow.items[0].ref,
      savedCopyId: first.flow.savedCopyId,
      flowId: first.flow.flowId,
      itemId: first.flow.items[0].itemId,
    },
  });
  assert.deepEqual(
    first.flow.authoring.sourceLineItemIdentityMap,
    first.lineage.sourceLineItemIdentityMap,
  );
  assert.deepEqual(
    first.flow.authoring.fidelityManifest,
    first.parseResult.fidelityManifest,
  );
  assert.equal(first.handoff.status, 'ready');
  assert.deepEqual(first.handoff.blockingIssues, []);
  assert.deepEqual(first.handoff.lossFields, []);
  assert.equal(first.flow.items[0].description, undefined);
  assert.equal(first.handoff.identityMap.flow, first.flow.ref);
  assert.equal(
    first.handoff.identityMap['item:line:4'],
    first.flow.items[0].ref,
  );
});

test('duplicate authoring section titles receive distinct deterministic identities', () => {
  const input = {
    handoffId: 'handoff-duplicate-sections',
    documentId: 'document-duplicate-sections',
    revisionId: 'revision-duplicate-sections',
    rawText: '# 준비\n## 확인\n- [ ] 첫째\n## 확인\n- [ ] 둘째',
    committedAt: '2026-09-02T00:00:00.000Z',
  };
  const first = materializePersonalWorkspacePocAuthoring(input);
  const second = materializePersonalWorkspacePocAuthoring(input);
  assert.equal(first.ok, true);
  assert.deepEqual(first, second);
  if (!first.ok) return;
  assert.equal(first.flow.sections?.length, 2);
  assert.equal(new Set(first.flow.sections?.map((section) => section.sectionId)).size, 2);
  assert.equal(first.flow.items[0].sectionId, first.flow.sections?.[0].sectionId);
  assert.equal(first.flow.items[1].sectionId, first.flow.sections?.[1].sectionId);
  assert.equal(first.flow.authoring.rawText, input.rawText);
});

test('blank source can be previewed without parse issues but cannot be materialized', () => {
  const result = materializePersonalWorkspacePocAuthoring({
    handoffId: 'handoff-blank',
    documentId: 'document-blank',
    revisionId: 'revision-blank',
    rawText: PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES[0].scaffold,
    committedAt: '2026-09-02T00:00:00.000Z',
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.parseResult.items, []);
  assert.deepEqual(
    result.handoff.blockingIssues,
    ['missing-flow-title', 'missing-flow-items'],
  );
  assert.equal(result.handoff.status, 'blocked');
});
