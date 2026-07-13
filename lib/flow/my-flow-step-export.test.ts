import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMyFlowStepChecklistText,
  buildMyFlowStepIcs,
  buildMyFlowStepPortableText,
  buildMyFlowStepSheetTsv,
  canBuildMyFlowStepIcs,
  type MyFlowPortableStepExportInput,
} from './my-flow-step-export';
import { buildPersonalStructuralListExportArtifacts } from './personal-structural-list-export';
import { buildPersonalStructuralRecurrenceIcs } from './personal-structural-recurrence-ics';
import {
  buildPersonalStructuralOccurrenceId,
  buildPersonalStructuralRecurrenceRevisionId,
  buildPersonalStructuralRecurrenceSeriesId,
  type PersonalStructuralRecurrenceSeries,
} from './personal-structural-recurrence';
import {
  buildPersonalStructuralProjection,
} from './personal-structural-projection';
import { createEmptyPersonalStructuralOverlay } from './personal-structural-overlay';

const baseInput: MyFlowPortableStepExportInput = {
  flowTitle: '원룸 이사 D-30 준비',
  stepId: 'moving-quote',
  stepTitle: '이사 방식과 견적 후보 정하기',
  sectionTitle: 'D-30 범위 쪼개기',
  date: '2026-06-24',
  time: '09:30',
  repeatPreset: 'weekly',
  location: '집',
  memo: '견적 후보 3곳과 포함 범위만 메모',
  sourceLabel: 'AJD 이사 체크리스트',
  sourceUrl: 'https://example.com/moving',
  items: ['포장/반포장/용달 중 하나 정하기', '견적 후보 2~3곳 열기'],
  checkedItems: { '0': true },
  completionCriteria: '이사 방식과 견적 후보가 정해졌다.',
  caution: '계약 전 포함 범위를 다시 확인한다.',
};

test('portable Step text carries edited schedule fields and checked items', () => {
  const text = buildMyFlowStepPortableText(baseInput);

  assert.match(text, /^이사 방식과 견적 후보 정하기/);
  assert.match(text, /Flow: 원룸 이사 D-30 준비/);
  assert.match(text, /구간: D-30 범위 쪼개기/);
  assert.match(text, /일정: 2026-06-24 09:30/);
  assert.match(text, /반복: 매주/);
  assert.match(text, /장소: 집/);
  assert.match(text, /- \[x\] 포장\/반포장\/용달 중 하나 정하기/);
  assert.match(text, /- \[ \] 견적 후보 2~3곳 열기/);
  assert.match(text, /완료 기준: 이사 방식과 견적 후보가 정해졌다\./);
  assert.match(text, /메모: 견적 후보 3곳과 포함 범위만 메모/);
  assert.match(text, /원문: AJD 이사 체크리스트 https:\/\/example\.com\/moving/);
});

test('tool handoff exports create checklist text and one spreadsheet row', () => {
  const checklist = buildMyFlowStepChecklistText(baseInput);
  const sheetRow = buildMyFlowStepSheetTsv({
    ...baseInput,
    memo: '첫 줄\n둘째 줄',
  });

  assert.match(checklist, /^이사 방식과 견적 후보 정하기/);
  assert.match(checklist, /Flow: 원룸 이사 D-30 준비/);
  assert.match(checklist, /일정: 2026-06-24 09:30/);
  assert.match(checklist, /- \[x\] 포장\/반포장\/용달 중 하나 정하기/);
  assert.match(checklist, /- \[ \] 견적 후보 2~3곳 열기/);
  assert.doesNotMatch(checklist, /완료 기준:/);

  const [header, row] = sheetRow.trimEnd().split('\n');
  assert.equal(header, 'Flow\t할 일\t구간\t날짜\t시간\t반복\t장소\t체크리스트\t메모\t완료 기준\t주의\t원문');
  assert.match(row, /^원룸 이사 D-30 준비\t이사 방식과 견적 후보 정하기\tD-30 범위 쪼개기\t2026-06-24\t09:30\t매주\t집\t/);
  assert.match(row, /\[x\] 포장\/반포장\/용달 중 하나 정하기 \| \[ \] 견적 후보 2~3곳 열기/);
  assert.match(row, /첫 줄 \/ 둘째 줄/);
  assert.match(row, /AJD 이사 체크리스트 https:\/\/example\.com\/moving$/);
});

test('Step ICS uses edited date time repeat location memo and source URL', () => {
  const rawIcs = buildMyFlowStepIcs(baseInput);
  const ics = rawIcs.replaceAll('\r\n ', '');

  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /PRODID:-\/\/FLOW MVP\/\/My Flow Step Export\/\/KO/);
  assert.match(ics, /SUMMARY:이사 방식과 견적 후보 정하기/);
  assert.match(ics, /DTSTART:20260624T093000/);
  assert.match(ics, /DTEND:20260624T100000/);
  assert.match(ics, /RRULE:FREQ=WEEKLY/);
  assert.match(ics, /LOCATION:집/);
  assert.match(ics, /DESCRIPTION:.*견적 후보 3곳과 포함 범위만 메모/s);
  assert.match(ics, /URL:https:\/\/example\.com\/moving/);
  assert.match(ics, /END:VCALENDAR/);
  for (const line of rawIcs.split('\r\n')) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `ICS line exceeds 75 UTF-8 bytes: ${line}`);
  }
});

test('Step ICS creates all-day event when time is empty', () => {
  const ics = buildMyFlowStepIcs({ ...baseInput, time: '' });

  assert.equal(canBuildMyFlowStepIcs({ ...baseInput, date: '' }), false);
  assert.match(ics, /DTSTART;VALUE=DATE:20260624/);
  assert.match(ics, /DTEND;VALUE=DATE:20260625/);
  assert.doesNotMatch(ics, /DTSTART:20260624T/);
});

test('personal draft timed ICS keeps stable UID and applies TZID, duration, and midnight rollover', () => {
  const timedInput: MyFlowPortableStepExportInput = {
    ...baseInput,
    date: '2026-08-03',
    time: '23:50',
    durationMinutes: 45,
    timeZone: 'Asia/Seoul',
    stableEventIdentitySeed: 'personal-structural:draft-copy:personal-item-a',
    repeatPreset: '',
  };
  const timed = buildMyFlowStepIcs(timedInput).replaceAll('\r\n ', '');
  const moved = buildMyFlowStepIcs({
    ...timedInput,
    date: '2026-08-05',
    time: '09:10',
    durationMinutes: 30,
  }).replaceAll('\r\n ', '');
  const uid = timed.match(/^UID:(.+)$/mu)?.[1];
  const movedUid = moved.match(/^UID:(.+)$/mu)?.[1];

  assert.equal(uid, movedUid);
  assert.equal(uid, 'personal-structural:draft-copy:personal-item-a@flowme.local');
  assert.match(timed, /DTSTART;TZID=Asia\/Seoul:20260803T235000/);
  assert.match(timed, /DTEND;TZID=Asia\/Seoul:20260804T003500/);
  assert.match(timed, /예상 45분/);
  assert.equal((timed.match(/BEGIN:VEVENT/g) ?? []).length, 1);

  const floating = buildMyFlowStepIcs({
    ...timedInput,
    timeZone: undefined,
  }).replaceAll('\r\n ', '');
  assert.match(floating, /DTSTART:20260803T235000/);
  assert.doesNotMatch(floating, /TZID=/);
});

test('personal draft recurrence ICS preserves interval end rules and stable series UID', () => {
  const seriesId = buildPersonalStructuralRecurrenceSeriesId({
    identityNamespace: 'recurrence-export-flow',
    itemId: 'personal-item-a',
  });
  const revisionId = buildPersonalStructuralRecurrenceRevisionId({
    seriesId,
    revision: 1,
    effectiveFrom: '2026-08-03',
  });
  const series: PersonalStructuralRecurrenceSeries = {
    schemaVersion: 1,
    seriesId,
    status: 'active',
    revisions: [
      {
        revision: 1,
        revisionId,
        effectiveFrom: '2026-08-03',
        rule: {
          frequency: 'daily',
          interval: 2,
          end: { mode: 'count', count: 4 },
        },
        updatedAt: '2026-07-13T00:00:00.000Z',
      },
    ],
    occurrenceOverrides: [],
    updatedAt: '2026-07-13T00:00:00.000Z',
  };
  const input = {
    identityNamespace: 'recurrence-export-flow',
    itemId: 'personal-item-a',
    title: '이틀마다 준비 확인',
    description: '준비 상태를 확인합니다.',
    date: '2026-08-03',
    repeat: series,
    generatedAt: '2026-07-13T00:00:00.000Z',
  };
  const first = buildPersonalStructuralRecurrenceIcs(input);
  const renamed = buildPersonalStructuralRecurrenceIcs({
    ...input,
    title: '이틀마다 준비 다시 확인',
    date: '2026-08-05',
  });
  const ics = first.ics.replaceAll('\r\n ', '');

  assert.equal(first.mode, 'rrule');
  assert.equal(first.eventCount, 1);
  assert.equal(first.uid, renamed.uid);
  assert.match(ics, /RRULE:FREQ=DAILY;INTERVAL=2;COUNT=4/);
  assert.match(ics, /DTSTART;VALUE=DATE:20260803/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 1);

  const monthly = buildPersonalStructuralRecurrenceIcs({
    ...input,
    repeat: {
      ...series,
      revisions: [
        {
          ...series.revisions[0],
          rule: {
            frequency: 'monthly',
            interval: 1,
            dayOfMonth: 3,
            invalidMonthDayPolicy: 'skip',
            end: { mode: 'until', date: '2026-12-31' },
          },
        },
      ],
    },
  }).ics.replaceAll('\r\n ', '');
  assert.match(monthly, /RRULE:FREQ=MONTHLY;BYMONTHDAY=3;UNTIL=20261231/);
});

test('personal draft recurrence ICS writes EXDATE and RECURRENCE-ID exceptions with one series UID', () => {
  const seriesId = buildPersonalStructuralRecurrenceSeriesId({
    identityNamespace: 'recurrence-exception-flow',
    itemId: 'personal-item-b',
  });
  const revisionId = buildPersonalStructuralRecurrenceRevisionId({
    seriesId,
    revision: 1,
    effectiveFrom: '2026-08-03',
  });
  const excludedOccurrenceId = buildPersonalStructuralOccurrenceId({
    revisionId,
    scheduledDate: '2026-08-05',
    startTime: '09:30',
  });
  const movedOccurrenceId = buildPersonalStructuralOccurrenceId({
    revisionId,
    scheduledDate: '2026-08-10',
    startTime: '09:30',
  });
  const series: PersonalStructuralRecurrenceSeries = {
    schemaVersion: 1,
    seriesId,
    status: 'active',
    revisions: [
      {
        revision: 1,
        revisionId,
        effectiveFrom: '2026-08-03',
        rule: {
          frequency: 'weekly',
          interval: 1,
          weekdays: ['MO', 'WE'],
          end: { mode: 'count', count: 6 },
        },
        scheduleTemplate: {
          time: '09:30',
          durationMinutes: 30,
          timeZone: 'Asia/Seoul',
        },
        updatedAt: '2026-07-13T00:00:00.000Z',
      },
    ],
    occurrenceOverrides: [
      {
        occurrenceId: excludedOccurrenceId,
        mode: 'exclude',
        updatedAt: '2026-07-13T01:00:00.000Z',
      },
      {
        occurrenceId: movedOccurrenceId,
        mode: 'reschedule',
        schedule: {
          date: '2026-08-11',
          time: '14:00',
          durationMinutes: 45,
          timeZone: 'Asia/Seoul',
        },
        updatedAt: '2026-07-13T02:00:00.000Z',
      },
    ],
    updatedAt: '2026-07-13T02:00:00.000Z',
  };
  const result = buildPersonalStructuralRecurrenceIcs({
    identityNamespace: 'recurrence-exception-flow',
    itemId: 'personal-item-b',
    title: '주중 준비 확인',
    description: '월요일과 수요일에 확인합니다.',
    date: '2026-08-03',
    time: '09:30',
    durationMinutes: 30,
    timeZone: 'Asia/Seoul',
    repeat: series,
    generatedAt: '2026-07-13T00:00:00.000Z',
  });
  const ics = result.ics.replaceAll('\r\n ', '');
  const uids = [...ics.matchAll(/^UID:(.+)$/gmu)].map((match) => match[1]);

  assert.equal(result.mode, 'rrule');
  assert.equal(result.eventCount, 2);
  assert.equal(result.exceptionEventCount, 1);
  assert.equal(result.excludedOccurrenceCount, 1);
  assert.equal(new Set(uids).size, 1);
  assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=6/);
  assert.match(ics, /EXDATE;TZID=Asia\/Seoul:20260805T093000/);
  assert.match(ics, /RECURRENCE-ID;TZID=Asia\/Seoul:20260810T093000/);
  assert.match(ics, /DTSTART;TZID=Asia\/Seoul:20260811T140000/);
  assert.match(ics, /DTEND;TZID=Asia\/Seoul:20260811T144500/);
});

test('personal draft recurrence ICS uses bounded events when revisions cannot share one RRULE', () => {
  const seriesId = buildPersonalStructuralRecurrenceSeriesId({
    identityNamespace: 'recurrence-revision-flow',
    itemId: 'personal-item-c',
  });
  const firstRevisionId = buildPersonalStructuralRecurrenceRevisionId({
    seriesId,
    revision: 1,
    effectiveFrom: '2026-08-03',
  });
  const secondRevisionId = buildPersonalStructuralRecurrenceRevisionId({
    seriesId,
    revision: 2,
    effectiveFrom: '2026-08-10',
  });
  const series: PersonalStructuralRecurrenceSeries = {
    schemaVersion: 1,
    seriesId,
    status: 'active',
    revisions: [
      {
        revision: 1,
        revisionId: firstRevisionId,
        effectiveFrom: '2026-08-03',
        rule: { frequency: 'daily', interval: 1, end: { mode: 'count', count: 2 } },
        updatedAt: '2026-07-13T00:00:00.000Z',
      },
      {
        revision: 2,
        revisionId: secondRevisionId,
        effectiveFrom: '2026-08-10',
        rule: {
          frequency: 'weekly',
          interval: 1,
          weekdays: ['MO'],
          end: { mode: 'count', count: 2 },
        },
        updatedAt: '2026-07-13T01:00:00.000Z',
      },
    ],
    occurrenceOverrides: [],
    updatedAt: '2026-07-13T01:00:00.000Z',
  };
  const result = buildPersonalStructuralRecurrenceIcs({
    identityNamespace: 'recurrence-revision-flow',
    itemId: 'personal-item-c',
    title: '규칙이 바뀐 준비',
    description: '과거 일정과 앞으로의 일정을 함께 보존합니다.',
    date: '2026-08-03',
    repeat: series,
    generatedAt: '2026-07-13T00:00:00.000Z',
    finiteRangeEnd: '2026-08-31',
  });
  const ics = result.ics.replaceAll('\r\n ', '');
  const uids = [...ics.matchAll(/^UID:(.+)$/gmu)].map((match) => match[1]);

  assert.equal(result.mode, 'finite_events');
  assert.equal(result.eventCount, 4);
  assert.equal(new Set(uids).size, 4);
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 4);
  assert.doesNotMatch(ics, /RRULE:/);
});

test('personal draft recurrence ICS folds long descriptions without physical trailing whitespace', () => {
  const seriesId = buildPersonalStructuralRecurrenceSeriesId({
    identityNamespace: 'recurrence-fold-flow',
    itemId: 'personal-item-fold',
  });
  const revisionId = buildPersonalStructuralRecurrenceRevisionId({
    seriesId,
    revision: 1,
    effectiveFrom: '2026-08-03',
  });
  const description = '반복 일정을 내 캘린더로 옮긴 뒤 처리한 내용을 확인하고 다시 진행할 수 있습니다.';
  const result = buildPersonalStructuralRecurrenceIcs({
    identityNamespace: 'recurrence-fold-flow',
    itemId: 'personal-item-fold',
    title: '긴 설명 반복 일정',
    description,
    date: '2026-08-03',
    repeat: {
      schemaVersion: 1,
      seriesId,
      status: 'active',
      revisions: [
        {
          revision: 1,
          revisionId,
          effectiveFrom: '2026-08-03',
          rule: { frequency: 'daily', interval: 1, end: { mode: 'count', count: 3 } },
          updatedAt: '2026-07-13T00:00:00.000Z',
        },
      ],
      occurrenceOverrides: [],
      updatedAt: '2026-07-13T00:00:00.000Z',
    },
    generatedAt: '2026-07-13T00:00:00.000Z',
  });
  const physicalLines = result.ics.split('\r\n').filter(Boolean);
  const unfolded = result.ics.replaceAll('\r\n ', '');

  assert.equal(physicalLines.some((line) => /[ \t]$/u.test(line)), false);
  assert.match(unfolded, new RegExp(`DESCRIPTION:${description}`));
});

test('portable Step outputs keep structural words out of user-facing fallbacks', () => {
  const input = { ...baseInput, stepTitle: '' };
  const visibleIcs = buildMyFlowStepIcs(input)
    .replaceAll('\r\n ', '')
    .split(/\r?\n/u)
    .filter((line) => !line.startsWith('PRODID:') && !line.startsWith('UID:'))
    .join('\n');
  const output = [
    buildMyFlowStepChecklistText(input),
    buildMyFlowStepPortableText(input),
    buildMyFlowStepSheetTsv(input),
    visibleIcs,
  ].join('\n');

  assert.match(output, /할 일/);
  assert.doesNotMatch(output, /\bStep\b|\bItem\b|Markdown|sourceTrace|source-backed/iu);
});

test('personal structural list exports share effective rows, personal order, and value overlays', () => {
  const sourceItems = [
    { itemId: 'source-a', title: '여권 확인', order: 0, source: { kind: 'source-a' } },
    { itemId: 'source-b', title: '숙소 확인', order: 1, source: { kind: 'source-b' } },
    { itemId: 'source-tombstone', title: '뺀 준비', order: 2, source: { kind: 'source-c' } },
    { itemId: 'source-excluded', title: '제외한 준비', order: 3, source: { kind: 'source-d' } },
  ];
  const sourceSnapshot = structuredClone(sourceItems);
  const overlay = createEmptyPersonalStructuralOverlay({
    savedCopyId: 'draft-copy',
    flowId: 'draft-flow',
    updatedAt: '2026-07-13T00:00:00.000Z',
  });
  overlay.userItems = [
    {
      itemId: 'personal-one',
      provenance: 'user_created',
      title: '오프라인 지도 저장',
      personalMemo: '지도와 탑승권을 함께 저장',
      createdAt: '2026-07-13T00:00:00.000Z',
      orderKey: 4,
    },
  ];
  overlay.itemTombstones = [
    {
      itemId: 'source-tombstone',
      ownership: 'source',
      deletedAt: '2026-07-13T00:00:00.000Z',
    },
  ];
  overlay.orderOverride = [
    'personal-one',
    'source-b',
    'source-a',
    'source-tombstone',
    'source-excluded',
  ];
  overlay.selection = {
    mode: 'all_except_excluded',
    includedItemIds: [],
    excludedItemIds: ['source-excluded'],
  };

  const projection = buildPersonalStructuralProjection({
    sourceItems,
    structuralOverlay: overlay,
    valueOverlays: [
      {
        itemId: 'source-b',
        title: '숙소 주소 다시 확인',
        personalMemo: '체크인 시간도 함께 보기',
        scheduleOverride: null,
      },
      {
        itemId: 'source-a',
        personalMemo: '만료일까지 확인',
        scheduleOverride: { mode: 'fixed_date', date: '2026-08-05' },
      },
    ],
    executionStates: [
      { itemId: 'personal-one', state: 'skipped' },
      { itemId: 'source-b', state: 'done' },
      { itemId: 'source-a', state: 'reopened' },
    ],
  });
  const artifacts = buildPersonalStructuralListExportArtifacts({
    flowTitle: '여행 출발 준비',
    projection,
    sourceLabel: '여행 준비 원문',
    sourceUrl: 'https://example.com/travel',
  });

  const expectedOrder = ['personal-one', 'source-b', 'source-a'];
  assert.deepEqual(artifacts.checklistRows.map((row) => row.itemId), expectedOrder);
  assert.deepEqual(artifacts.sheetRows.map((row) => row.itemId), expectedOrder);
  assert.deepEqual(artifacts.memoRows.map((row) => row.itemId), expectedOrder);
  assert.deepEqual(sourceItems, sourceSnapshot);

  assert.match(artifacts.checklistText, /- \[ \] 오프라인 지도 저장 \(스킵\)/);
  assert.match(artifacts.checklistText, /- \[x\] 숙소 주소 다시 확인/);
  assert.match(artifacts.checklistText, /- \[ \] 여권 확인/);
  assert.match(artifacts.checklistText, /일정: 2026-08-05/);
  assert.match(artifacts.checklistText, /메모: 만료일까지 확인/);
  assert.doesNotMatch(artifacts.checklistText, /뺀 준비|제외한 준비/);

  const sheetLines = artifacts.sheetTsv.trimEnd().split('\n');
  assert.equal(sheetLines.length, 4);
  assert.equal(sheetLines[0], '순서\t상태\t할 일\t날짜\t시간\t예상 시간\t메모\t원문');
  assert.equal(sheetLines[1].split('\t')[3], '날짜 없음');
  assert.equal(sheetLines[1].split('\t')[7], '원문 없음');
  assert.match(sheetLines[2], /^2\t완료\t숙소 주소 다시 확인\t날짜 없음\t\t\t체크인 시간도 함께 보기\t여행 준비 원문/);
  assert.match(sheetLines[3], /^3\t미완료\t여권 확인\t2026-08-05\t종일\t\t만료일까지 확인\t여행 준비 원문/);

  assert.match(artifacts.memoText, /1\. 오프라인 지도 저장/);
  assert.match(artifacts.memoText, /2\. 숙소 주소 다시 확인/);
  assert.match(artifacts.memoText, /상태: 완료/);
  assert.doesNotMatch(artifacts.memoText, /뺀 준비|제외한 준비/);
  assert.doesNotMatch(
    [artifacts.checklistText, artifacts.sheetTsv, artifacts.memoText].join('\n'),
    /\bStep\b|\bItem\b|Markdown|sourceTrace|source-backed/iu,
  );
});

test('completion changes list-export status without changing structural membership', () => {
  const overlay = createEmptyPersonalStructuralOverlay({
    savedCopyId: 'draft-copy',
    flowId: 'draft-flow',
    updatedAt: '2026-07-13T00:00:00.000Z',
  });
  const sourceItems = [
    { itemId: 'source-a', title: '여권 확인', order: 0, source: { kind: 'source-a' } },
  ];
  const build = (state: 'pending' | 'done' | 'reopened') =>
    buildPersonalStructuralListExportArtifacts({
      flowTitle: '여행 출발 준비',
      projection: buildPersonalStructuralProjection({
        sourceItems,
        structuralOverlay: overlay,
        executionStates: [{ itemId: 'source-a', state }],
      }),
    });

  const pending = build('pending');
  const done = build('done');
  const reopened = build('reopened');

  assert.deepEqual(pending.checklistRows.map((row) => row.itemId), ['source-a']);
  assert.deepEqual(done.checklistRows.map((row) => row.itemId), ['source-a']);
  assert.deepEqual(reopened.checklistRows.map((row) => row.itemId), ['source-a']);
  assert.match(done.checklistText, /- \[x\] 여권 확인/);
  assert.match(reopened.checklistText, /- \[ \] 여권 확인/);
});

test('personal structural list exports share all-day and timed schedule labels without exposing timezone', () => {
  const overlay = createEmptyPersonalStructuralOverlay({
    savedCopyId: 'timed-list-copy',
    flowId: 'timed-list-flow',
    updatedAt: '2026-07-13T00:00:00.000Z',
  });
  overlay.userItems = [
    {
      itemId: 'all-day-user',
      provenance: 'user_created',
      title: '종일 준비',
      schedule: { mode: 'fixed_date', date: '2026-08-03' },
      createdAt: '2026-07-13T00:00:00.000Z',
      orderKey: 0,
    },
    {
      itemId: 'timed-user',
      provenance: 'user_created',
      title: '시간 준비',
      schedule: {
        mode: 'fixed_date',
        date: '2026-08-03',
        time: '09:30',
        durationMinutes: 45,
        timeZone: 'Asia/Seoul',
      },
      createdAt: '2026-07-13T00:00:00.000Z',
      orderKey: 1,
    },
    {
      itemId: 'unscheduled-user',
      provenance: 'user_created',
      title: '날짜 없는 준비',
      createdAt: '2026-07-13T00:00:00.000Z',
      orderKey: 2,
    },
  ];
  overlay.orderOverride = ['all-day-user', 'timed-user', 'unscheduled-user'];
  const artifacts = buildPersonalStructuralListExportArtifacts({
    flowTitle: '시간 준비 Flow',
    projection: buildPersonalStructuralProjection({
      sourceItems: [],
      structuralOverlay: overlay,
    }),
  });

  assert.match(artifacts.checklistText, /일정: 2026-08-03 종일/);
  assert.match(artifacts.checklistText, /일정: 2026-08-03 · 09:30 · 예상 45분/);
  assert.match(artifacts.checklistText, /일정: 날짜 없음/);
  const sheetLines = artifacts.sheetTsv.trimEnd().split('\n');
  assert.equal(sheetLines[1].split('\t')[4], '종일');
  assert.equal(sheetLines[2].split('\t')[4], '09:30');
  assert.equal(sheetLines[2].split('\t')[5], '45분');
  assert.equal(sheetLines[3].split('\t')[3], '날짜 없음');
  assert.match(artifacts.memoText, /일정: 2026-08-03 · 09:30 · 예상 45분/);
  assert.doesNotMatch(
    [artifacts.checklistText, artifacts.sheetTsv, artifacts.memoText].join('\n'),
    /Asia\/Seoul|TZID|IANA|floating/iu,
  );
});
