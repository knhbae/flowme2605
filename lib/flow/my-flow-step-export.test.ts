import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPersonalStructuralPortableScheduleFields,
  buildMyFlowStepChecklistText,
  buildMyFlowItemDescriptionText,
  buildMyFlowStepIcs,
  buildMyFlowMultiStepIcs,
  buildMyFlowMultiStepVtodo,
  buildMyFlowStepPortableText,
  buildMyFlowStepSheetTsv,
  buildMyFlowStepVtodo,
  canBuildMyFlowStepIcs,
  canBuildMyFlowStepVtodo,
  type MyFlowPortableStepExportInput,
} from './my-flow-step-export';
import {
  buildPersonalStructuralListExportArtifacts,
  buildPersonalStructuralListExportArtifactsFromRows,
  formatPersonalStructuralRepeatLabel,
  PERSONAL_STRUCTURAL_SHEET_HEADERS,
} from './personal-structural-list-export';
import { parseEffectiveFlowTsv } from './effective-flow-artifact-codec';
import {
  buildCompletionCriterionFieldContract,
  GENERIC_COMPLETION_CRITERION,
} from './completion-criterion';
import { buildFlowRunHistoryListExportArtifacts, getFlowRunItemStatusLabel } from './flow-run-history';
import type { FlowRunRecord } from './storage';
import { buildPersonalStructuralRecurrenceIcs } from './personal-structural-recurrence-ics';
import {
  buildPersonalStructuralOccurrenceId,
  buildPersonalStructuralRecurrenceRevisionId,
  buildPersonalStructuralRecurrenceSeriesId,
  type PersonalStructuralRecurrenceSeries,
} from './personal-structural-recurrence';
import {
  buildPersonalStructuralScheduleProjection,
} from './personal-structural-schedule';
import {
  buildPersonalStructuralProjection,
} from './personal-structural-projection';
import { createEmptyPersonalStructuralOverlay } from './personal-structural-overlay';
import { resolveSavedRoutineRecurrence } from './saved-routine-occurrence';

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

function unfoldIcs(value: string): string {
  return value.replaceAll('\r\n ', '');
}

function unescapeIcsTextForTest(value: string): string {
  return value
    .replace(/\\[nN]/gu, '\n')
    .replace(/\\([\\,;])/gu, '$1');
}

function getUnfoldedIcsProperty(value: string, property: string): string | undefined {
  const line = unfoldIcs(value)
    .split('\r\n')
    .find((candidate) => candidate.startsWith(`${property}:`));
  return line?.slice(property.length + 1);
}

test('portable Step text carries edited schedule fields and checked items', () => {
  const text = buildMyFlowStepPortableText(baseInput);

  assert.match(text, /^이사 방식과 견적 후보 정하기/);
  assert.match(text, /계획: 원룸 이사 D-30 준비/);
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
  assert.match(checklist, /계획: 원룸 이사 D-30 준비/);
  assert.match(checklist, /일정: 2026-06-24 09:30/);
  assert.match(checklist, /- \[x\] 포장\/반포장\/용달 중 하나 정하기/);
  assert.match(checklist, /- \[ \] 견적 후보 2~3곳 열기/);
  assert.match(checklist, /완료 기준: 이사 방식과 견적 후보가 정해졌다\./);

  const [header, row] = sheetRow.trimEnd().split('\n');
  assert.equal(header, '계획\t할 일\t구간\t날짜\t시간\t반복\t장소\t체크리스트\t메모\t완료 기준\t주의\t원문');
  assert.match(row, /^원룸 이사 D-30 준비\t이사 방식과 견적 후보 정하기\tD-30 범위 쪼개기\t2026-06-24\t09:30\t매주\t집\t/);
  assert.match(row, /\[x\] 포장\/반포장\/용달 중 하나 정하기 \| \[ \] 견적 후보 2~3곳 열기/);
  assert.match(row, /첫 줄 \/ 둘째 줄/);
  assert.match(row, /AJD 이사 체크리스트 https:\/\/example\.com\/moving$/);
});

test('completion criterion contract preserves long multiline Korean and special characters', () => {
  const longFirstLine = `사진·문서 2개를 확인하고 [필수] #1 & #2를 기록했다 — ${'가'.repeat(180)}`;
  const criterion = `${longFirstLine}\r\n둘째 줄: <확인> / 탭\t유지 😀\r\n\r\n마지막 줄: 따옴표 "완료"와 '확인'`;
  const contract = buildCompletionCriterionFieldContract(criterion);
  const checklist = buildMyFlowStepChecklistText({
    ...baseInput,
    completionCriteria: criterion,
  });

  assert.equal(contract.present, true);
  assert.equal(contract.value, criterion.replaceAll('\r\n', '\n'));
  assert.deepEqual(contract.lines, [
    longFirstLine,
    '둘째 줄: <확인> / 탭\t유지 😀',
    '',
    '마지막 줄: 따옴표 "완료"와 \'확인\'',
  ]);
  assert.ok(checklist.includes(`완료 기준: ${longFirstLine}\n  둘째 줄: <확인> / 탭\t유지 😀\n  \n  마지막 줄: 따옴표 "완료"와 '확인'`));
});

test('empty and generic completion criteria never create an empty checklist label', () => {
  for (const completionCriteria of [undefined, '', ' \r\n ', GENERIC_COMPLETION_CRITERION]) {
    const contract = buildCompletionCriterionFieldContract(completionCriteria);
    const checklist = buildMyFlowStepChecklistText({ ...baseInput, completionCriteria });
    const memo = buildMyFlowStepPortableText({ ...baseInput, completionCriteria });
    const sheet = buildMyFlowStepSheetTsv({ ...baseInput, completionCriteria });
    const ics = buildMyFlowStepIcs({ ...baseInput, completionCriteria });
    assert.equal(contract.present, false);
    assert.deepEqual(contract.lines, []);
    assert.doesNotMatch(checklist, /완료 기준:/);
    assert.doesNotMatch(memo, /완료 기준:/);
    assert.doesNotMatch(sheet, new RegExp(GENERIC_COMPLETION_CRITERION));
    assert.doesNotMatch(ics, /완료 기준:/);
  }
});

test('Item checklist keeps criterion, execution state, memos, warnings, resources, and source separate', () => {
  const checklist = buildMyFlowStepChecklistText({
    ...baseInput,
    description: '원문 기반 설명',
    executionStatus: 'done',
    executionMemo: '공개 가능한 실행 메모',
    flowWarning: '계획 전체 주의',
    resources: [
      { label: '공식 도구', url: 'https://tool.example.com?a=1&b=2#start' },
      { label: '공식 도구', url: 'https://tool.example.com?a=1&b=2#start' },
    ],
  });

  assert.match(checklist, /설명: 원문 기반 설명/);
  assert.match(checklist, /실행 상태: 완료/);
  assert.match(checklist, /완료 기준: 이사 방식과 견적 후보가 정해졌다\./);
  assert.match(checklist, /개인 메모: 견적 후보 3곳과 포함 범위만 메모/);
  assert.match(checklist, /실행 메모: 공개 가능한 실행 메모/);
  assert.match(checklist, /주의: 계약 전 포함 범위를 다시 확인한다\./);
  assert.match(checklist, /계획 주의: 계획 전체 주의/);
  assert.equal(checklist.match(/^자료:/gmu)?.length, 1);
  assert.match(checklist, /자료: 공식 도구 - https:\/\/tool\.example\.com\?a=1&b=2#start/);
  assert.match(checklist, /원문: AJD 이사 체크리스트 https:\/\/example\.com\/moving/);
  assert.doesNotMatch(checklist, /PRIVATE_NOTE|SOURCE_CORRECTION|HISTORY_ONLY/);
});

test('whole and selected list checklist keep completion state separate from criterion and memo', () => {
  const artifacts = buildPersonalStructuralListExportArtifactsFromRows({
    flowTitle: '완료 기준 golden 계획',
    sourceLabel: '원문 이름',
    sourceUrl: 'https://example.com/source',
    rows: [
      {
        itemId: 'criterion-a',
        title: '사진 확인하기',
        scheduleState: 'unscheduled',
        status: 'done',
        personalOrderRank: 0,
        description: '원문 설명은 별도다.',
        completionCriteria: '사진 2장을 공유했다.\n확인 답장을 받았다.',
        memo: '개인 메모는 별도다.',
        executionMemo: '실행 메모도 별도다.',
        itemWarning: '항목 주의를 확인한다.',
        flowWarning: '계획 전체 주의를 확인한다.',
        resources: [
          { label: '공식 자료', url: 'https://example.com/resource' },
          { label: '공식 자료', url: 'https://example.com/resource' },
        ],
      },
      {
        itemId: 'criterion-empty',
        title: '빈 기준 항목',
        scheduleState: 'unscheduled',
        status: 'pending',
        personalOrderRank: 1,
        completionCriteria: GENERIC_COMPLETION_CRITERION,
      },
    ],
  });

  assert.equal(artifacts.checklistRows[0].completionCriteria, '사진 2장을 공유했다.\n확인 답장을 받았다.');
  assert.equal(artifacts.checklistRows[1].completionCriteria, undefined);
  assert.match(artifacts.checklistText, /- \[x\] 사진 확인하기/);
  assert.match(artifacts.checklistText, /  설명: 원문 설명은 별도다\./);
  assert.match(artifacts.checklistText, /  완료 기준: 사진 2장을 공유했다\.\n    확인 답장을 받았다\./);
  assert.match(artifacts.checklistText, /  개인 메모: 개인 메모는 별도다\./);
  assert.match(artifacts.checklistText, /  실행 메모: 실행 메모도 별도다\./);
  assert.match(artifacts.checklistText, /  주의: 항목 주의를 확인한다\./);
  assert.match(artifacts.checklistText, /  계획 주의: 계획 전체 주의를 확인한다\./);
  assert.equal(artifacts.checklistText.match(/^  자료:/gmu)?.length, 1);
  assert.match(artifacts.checklistText, /  자료: 공식 자료 - https:\/\/example\.com\/resource/);
  assert.doesNotMatch(artifacts.checklistText, new RegExp(GENERIC_COMPLETION_CRITERION));
  assert.doesNotMatch(artifacts.checklistText, /완료 기준:\s*(?:\n|$)/);
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

test('approved Item DESCRIPTION keeps one raw TXT memo and does not duplicate its checklist rows', () => {
  const input: MyFlowPortableStepExportInput = {
    ...baseInput,
    rawMemoText: [
      '대표 설명, 준비 범위를 먼저 정한다.',
      '',
      '- [ ] 포장 범위를 확인한다',
      '- [x] 견적 후보를 저장한다',
    ].join('\r\n'),
    items: ['포장 범위를 확인한다', '견적 후보를 저장한다'],
    completionCriteria: '후보 2곳의 포함 범위를 비교했다.',
  };

  const description = buildMyFlowItemDescriptionText(input);
  assert.equal(description, [
    '대표 설명, 준비 범위를 먼저 정한다.',
    '',
    '- [ ] 포장 범위를 확인한다',
    '- [x] 견적 후보를 저장한다',
    '',
    '완료 기준: 후보 2곳의 포함 범위를 비교했다.',
  ].join('\n'));
  assert.equal(description.match(/포장 범위를 확인한다/gu)?.length, 1);
  assert.equal(description.match(/견적 후보를 저장한다/gu)?.length, 1);
});

test('approved raw Item memo is the exact VEVENT DESCRIPTION payload', () => {
  const generatedAt = '2026-08-10T00:00:00.000Z';
  const input: MyFlowPortableStepExportInput = {
    ...baseInput,
    stableEventIdentitySeed: 'saved-plan:item-01',
    generatedAt,
    rawMemoText: [
      '대표 설명; 쉼표, 역슬래시 \\',
      '',
      '- [ ] 확인 1',
      '- [x] 확인 2',
    ].join('\n'),
    completionCriteria: '결과를 저장했다.',
  };
  const rawIcs = buildMyFlowStepIcs(input);
  const description = getUnfoldedIcsProperty(rawIcs, 'DESCRIPTION');

  assert.ok(description);
  assert.equal(unescapeIcsTextForTest(description), buildMyFlowItemDescriptionText(input));
  assert.equal((unfoldIcs(rawIcs).match(/BEGIN:VEVENT/gu) ?? []).length, 1);
  assert.doesNotMatch(unescapeIcsTextForTest(description), /계획:|일정:|체크:|원문:/u);
  assert.match(unfoldIcs(rawIcs), /UID:saved-plan:item-01@flowme\.local/u);
  assert.equal(rawIcs.replaceAll('\r\n', '').includes('\n'), false);
  for (const line of rawIcs.split('\r\n')) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `ICS line exceeds 75 UTF-8 bytes: ${line}`);
  }
});

test('VTODO keeps one Item as one component and preserves raw memo checklist text', () => {
  const input: MyFlowPortableStepExportInput = {
    ...baseInput,
    stableEventIdentitySeed: 'saved-plan:item-01',
    generatedAt: '2026-08-10T00:00:00.000Z',
    timeZone: 'Asia/Seoul',
    rawMemoText: [
      `대표 설명 ${'가'.repeat(60)}; 쉼표, 역슬래시 \\`,
      '',
      '- [ ] 확인 항목 1',
      '- [x] 확인 항목 2',
    ].join('\n'),
    completionCriteria: '결과를 저장했다.',
  };
  const rawVtodo = buildMyFlowStepVtodo(input);
  const unfolded = unfoldIcs(rawVtodo);
  const description = getUnfoldedIcsProperty(rawVtodo, 'DESCRIPTION');

  assert.equal(canBuildMyFlowStepVtodo(input), true);
  assert.ok(description);
  assert.equal(unescapeIcsTextForTest(description), buildMyFlowItemDescriptionText(input));
  assert.equal((unfolded.match(/BEGIN:VTODO/gu) ?? []).length, 1);
  assert.equal((unfolded.match(/END:VTODO/gu) ?? []).length, 1);
  assert.match(unfolded, /UID:saved-plan:item-01@flowme\.local/u);
  assert.match(unfolded, /DTSTAMP:20260810T000000Z/u);
  assert.match(unfolded, /DUE;TZID=Asia\/Seoul:20260624T093000/u);
  assert.match(unfolded, /SUMMARY:이사 방식과 견적 후보 정하기/u);
  assert.match(unfolded, /STATUS:NEEDS-ACTION/u);
  assert.match(unfolded, /PERCENT-COMPLETE:0/u);
  assert.equal(rawVtodo.replaceAll('\r\n', '').includes('\n'), false);
  for (const line of rawVtodo.split('\r\n')) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `VTODO line exceeds 75 UTF-8 bytes: ${line}`);
  }
});

test('VTODO stable UID survives title and date edits, and completion maps to standard status', () => {
  const input: MyFlowPortableStepExportInput = {
    ...baseInput,
    stableEventIdentitySeed: 'saved-plan:item-stable',
    generatedAt: '2026-08-10T00:00:00.000Z',
    time: '',
    rawMemoText: '메모',
  };
  const first = buildMyFlowStepVtodo(input);
  const edited = buildMyFlowStepVtodo({
    ...input,
    stepTitle: '수정된 할 일',
    date: '2026-08-25',
    executionStatus: 'done',
  });

  assert.equal(getUnfoldedIcsProperty(first, 'UID'), getUnfoldedIcsProperty(edited, 'UID'));
  assert.match(unfoldIcs(edited), /DUE;VALUE=DATE:20260825/u);
  assert.match(unfoldIcs(edited), /STATUS:COMPLETED/u);
  assert.match(unfoldIcs(edited), /PERCENT-COMPLETE:100/u);
});

test('multi Item VTODO includes undated Items and never promotes checklist rows to components', () => {
  const generatedAt = '2026-08-10T00:00:00.000Z';
  const rawVtodo = buildMyFlowMultiStepVtodo([
    {
      ...baseInput,
      stableEventIdentitySeed: 'saved-plan:item-a',
      generatedAt,
      rawMemoText: '첫 메모\n\n- [ ] 첫 확인\n- [x] 둘째 확인',
    },
    {
      ...baseInput,
      stepId: 'undated-item',
      stableEventIdentitySeed: 'saved-plan:item-b',
      stepTitle: '날짜 없는 할 일',
      date: '',
      time: '',
      generatedAt,
      rawMemoText: '날짜 없는 메모',
    },
    {
      ...baseInput,
      stepId: 'duplicate-item',
      stableEventIdentitySeed: 'saved-plan:item-a',
      stepTitle: '중복 identity',
      generatedAt,
    },
  ]);
  const unfolded = unfoldIcs(rawVtodo);

  assert.equal((unfolded.match(/BEGIN:VTODO/gu) ?? []).length, 2);
  assert.equal((unfolded.match(/UID:saved-plan:item-a@flowme\.local/gu) ?? []).length, 1);
  assert.match(unfolded, /SUMMARY:날짜 없는 할 일/u);
  assert.equal(unfolded.match(/^DUE/gmu)?.length, 1);
  assert.doesNotMatch(unfolded, /SUMMARY:첫 확인|SUMMARY:둘째 확인|중복 identity/u);
  assert.throws(
    () => buildMyFlowStepVtodo({ ...baseInput, stepId: '', stableEventIdentitySeed: '' }),
    /stable Step identity/u,
  );
});

test('Step ICS binds DTSTAMP and execution status to the immutable transfer request', () => {
  const generatedAt = '2026-08-05T03:04:05.000Z';
  const done = buildMyFlowStepIcs({
    ...baseInput,
    generatedAt,
    executionStatus: 'done',
  });
  const repeated = buildMyFlowStepIcs({
    ...baseInput,
    generatedAt,
    executionStatus: 'done',
  });
  const held = buildMyFlowStepIcs({
    ...baseInput,
    generatedAt,
    executionStatus: 'held',
  });

  assert.equal(done, repeated);
  assert.match(done, /DTSTAMP:20260805T030405Z/);
  assert.match(done, /STATUS:CONFIRMED/);
  assert.match(done, /TRANSP:TRANSPARENT/);
  assert.match(held, /STATUS:CANCELLED/);
});

test('Step ICS creates all-day event when time is empty', () => {
  const ics = buildMyFlowStepIcs({ ...baseInput, time: '' });

  assert.equal(canBuildMyFlowStepIcs({ ...baseInput, date: '' }), false);
  assert.match(ics, /DTSTART;VALUE=DATE:20260624/);
  assert.match(ics, /DTEND;VALUE=DATE:20260625/);
  assert.doesNotMatch(ics, /DTSTART:20260624T/);
});

test('scoped Flow ICS combines unique dated items without changing their UIDs', () => {
  const ics = buildMyFlowMultiStepIcs([
    baseInput,
    {
      ...baseInput,
      stepId: 'packing-list',
      stableEventIdentitySeed: 'flow::packing-list',
      stepTitle: '포장 목록 확인',
      date: '2026-06-25',
      time: '',
      repeatPreset: '',
    },
    {
      ...baseInput,
      stepId: 'packing-list-duplicate',
      stableEventIdentitySeed: 'flow::packing-list',
      stepTitle: '중복 포장 목록',
      date: '2026-06-26',
    },
    {
      ...baseInput,
      stepId: 'undated',
      stableEventIdentitySeed: 'flow::undated',
      stepTitle: '날짜 없는 준비',
      date: '',
    },
  ]).replaceAll('\r\n ', '');

  assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 2);
  assert.match(ics, /SUMMARY:이사 방식과 견적 후보 정하기/);
  assert.match(ics, /SUMMARY:포장 목록 확인/);
  assert.doesNotMatch(ics, /중복 포장 목록|날짜 없는 준비/);
  assert.match(ics, /UID:flow::packing-list@flowme\.local/);
});

test('public and saved multi-step Calendar export preserves New York wall-clock TZID on both sides of the 2026 spring DST boundary', () => {
  const ics = buildMyFlowMultiStepIcs([
    {
      ...baseInput,
      stepId: 'new-york-before-spring-dst',
      stableEventIdentitySeed: 'flow::new-york-before-spring-dst',
      stepTitle: 'Before spring DST review',
      date: '2026-03-07',
      time: '09:15',
      durationMinutes: 45,
      timeZone: 'America/New_York',
      repeatPreset: '',
    },
    {
      ...baseInput,
      stepId: 'new-york-after-spring-dst',
      stableEventIdentitySeed: 'flow::new-york-after-spring-dst',
      stepTitle: 'After spring DST review',
      date: '2026-03-09',
      time: '09:15',
      durationMinutes: 45,
      timeZone: 'America/New_York',
      repeatPreset: '',
    },
  ]).replaceAll('\r\n ', '');

  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 2);
  assert.match(ics, /DTSTART;TZID=America\/New_York:20260307T091500/);
  assert.match(ics, /DTEND;TZID=America\/New_York:20260307T100000/);
  assert.match(ics, /DTSTART;TZID=America\/New_York:20260309T091500/);
  assert.match(ics, /DTEND;TZID=America\/New_York:20260309T100000/);
});

test('saved source routine ICS uses one bounded RRULE master event with a stable series UID', () => {
  const recurrence = resolveSavedRoutineRecurrence({
    itemId: 'allblanc-morning-run',
    startDate: '2026-07-15',
    sourceRepeatRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
    selectedWeekdays: ['월', '수', '금'],
    projectionWeeks: 4,
  }, 'curated-allblanc-morning-workout');
  assert.ok(recurrence.series);

  const input: MyFlowPortableStepExportInput = {
    flowTitle: 'Allblanc 아침 5분 홈트',
    stepId: 'allblanc-morning-run',
    stepTitle: '아침 5분 전신 운동 영상 열기',
    date: '2026-07-15',
    personalRecurrence: recurrence.series,
    personalRecurrenceIdentityNamespace: 'curated-allblanc-morning-workout',
  };
  const first = buildMyFlowStepIcs(input).replaceAll('\r\n ', '');
  const renamed = buildMyFlowStepIcs({
    ...input,
    stepTitle: '아침 운동 영상 다시 열기',
  }).replaceAll('\r\n ', '');
  const firstUid = first.match(/^UID:(.+)$/mu)?.[1];
  const renamedUid = renamed.match(/^UID:(.+)$/mu)?.[1];

  assert.equal((first.match(/BEGIN:VEVENT/g) ?? []).length, 1);
  assert.match(first, /RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20260811/);
  assert.equal(firstUid, renamedUid);
  assert.doesNotMatch(first, /source-backed|sourceTrace|\bStep\b|\bItem\b/iu);
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

  const sheetRows = parseEffectiveFlowTsv(artifacts.sheetTsv);
  assert.equal(sheetRows.length, 4);
  assert.deepEqual(sheetRows[0], [...PERSONAL_STRUCTURAL_SHEET_HEADERS]);
  assert.equal(sheetRows[1]![3], '날짜 없음');
  assert.equal(sheetRows[1]![9], '');
  assert.deepEqual(sheetRows[2]!.slice(0, 10), [
    '2',
    '완료',
    '숙소 주소 다시 확인',
    '날짜 없음',
    '',
    '',
    '',
    '',
    '체크인 시간도 함께 보기',
    '여행 준비 원문 https://example.com/travel',
  ]);
  assert.deepEqual(sheetRows[3]!.slice(0, 10), [
    '3',
    '미완료',
    '여권 확인',
    '2026-08-05',
    '종일',
    '',
    '',
    '',
    '만료일까지 확인',
    '여행 준비 원문 https://example.com/travel',
  ]);

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

test('personal structural list exports preserve all-day, timed, timezone, and repeat fields', () => {
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
        repeat: { frequency: 'weekly', interval: 1 },
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
  assert.match(artifacts.checklistText, /시간대: Asia\/Seoul/);
  assert.match(artifacts.checklistText, /반복: 매주/);
  assert.match(artifacts.checklistText, /일정: 날짜 없음/);
  const sheetRows = parseEffectiveFlowTsv(artifacts.sheetTsv);
  assert.equal(sheetRows[1]![4], '종일');
  assert.equal(sheetRows[2]![4], '09:30');
  assert.equal(sheetRows[2]![5], '45분');
  assert.equal(sheetRows[2]![6], 'Asia/Seoul');
  assert.equal(sheetRows[2]![7], '매주');
  assert.equal(sheetRows[3]![3], '날짜 없음');
  assert.match(artifacts.memoText, /일정: 2026-08-03 · 09:30 · 예상 45분/);
  assert.match(artifacts.memoText, /시간대: Asia\/Seoul/);
  assert.match(artifacts.memoText, /반복: 매주/);
  assert.doesNotMatch(
    [artifacts.checklistText, artifacts.sheetTsv, artifacts.memoText].join('\n'),
    /TZID|IANA|floating/iu,
  );
});

test('personal structural repeat labels preserve cadence, weekdays, end, and series status', () => {
  const pausedSeries: PersonalStructuralRecurrenceSeries = {
    schemaVersion: 1,
    seriesId: 'series-weekly',
    status: 'paused',
    revisions: [{
      revision: 1,
      revisionId: 'series-weekly:revision:1',
      effectiveFrom: '2026-08-03',
      rule: {
        frequency: 'weekly',
        interval: 2,
        weekdays: ['MO', 'WE'],
        end: { mode: 'count', count: 5 },
      },
      updatedAt: '2026-08-01T00:00:00.000Z',
    }],
    occurrenceOverrides: [],
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
  const endedMonthlySeries: PersonalStructuralRecurrenceSeries = {
    ...pausedSeries,
    seriesId: 'series-monthly',
    status: 'ended',
    revisions: [
      {
        ...pausedSeries.revisions[0]!,
        revisionId: 'series-monthly:revision:1',
        rule: { frequency: 'daily', interval: 1 },
      },
      {
        ...pausedSeries.revisions[0]!,
        revision: 2,
        revisionId: 'series-monthly:revision:2',
        effectiveFrom: '2026-09-15',
        rule: {
          frequency: 'monthly',
          interval: 1,
          dayOfMonth: 15,
          invalidMonthDayPolicy: 'skip',
          end: { mode: 'until', date: '2027-03-15' },
        },
      },
    ],
  };

  assert.equal(
    formatPersonalStructuralRepeatLabel(pausedSeries),
    '2주마다 · 월·수 · 5회 · 일시 중지',
  );
  assert.equal(formatPersonalStructuralRepeatLabel({ frequency: 'daily', interval: 1 }), '매일');
  assert.equal(
    formatPersonalStructuralRepeatLabel({ frequency: 'monthly', interval: 3 }),
    '3개월마다',
  );
  assert.equal(
    formatPersonalStructuralRepeatLabel(endedMonthlySeries),
    '매월 · 15일 · 2027-03-15까지 · 종료',
  );
});

test('past run list exports preserve stored Item order, values, and status without private reflection', () => {
  const run: FlowRunRecord = {
    schemaVersion: 1,
    runId: 'run-1',
    flowSlug: 'draft-1',
    status: 'completed',
    startedAt: '2026-07-01T00:00:00.000Z',
    completedAt: '2026-07-13T00:00:00.000Z',
    completionSnapshot: {
      checks: {},
      itemStates: {},
      stepItemChecks: {},
      comparisonState: {},
      workbenchState: {},
      reactionLogs: {},
      flowTitle: '지난 실행 제목',
      itemSnapshots: [
        {
          itemId: 'second',
          title: '두 번째 할 일',
          status: 'skipped',
          scheduleState: 'unscheduled',
          personalOrderRank: 2,
        },
        {
          itemId: 'first',
          title: '첫 번째 할 일',
          status: 'done',
          scheduleState: 'all_day',
          date: '2026-07-12',
          memo: '당시 메모',
          personalOrderRank: 1,
        },
      ],
      completionFeedback: {
        flowSlug: 'draft-1',
        reflection: {
          outcome: 'helpful',
          note: '다음에도 같은 순서로',
          updatedAt: '2026-07-13T00:00:00.000Z',
        },
      },
    },
  };
  const artifacts = buildFlowRunHistoryListExportArtifacts(run, '현재 제목');
  assert.ok(artifacts);
  assert.deepEqual(artifacts.checklistRows.map((row) => row.itemId), ['first', 'second']);
  assert.match(artifacts.checklistText, /\[x\] 첫 번째 할 일/);
  assert.match(artifacts.checklistText, /두 번째 할 일 \(스킵\)/);
  assert.match(artifacts.sheetTsv, /2026-07-12/);
  assert.match(artifacts.memoText, /당시 메모/);
  assert.doesNotMatch(artifacts.memoText, /내 실행 회고/);
  assert.doesNotMatch(artifacts.memoText, /다음에도 같은 순서로/);
});

test('personal structural schedule adapter keeps committed timed fields and clears them for all-day', () => {
  const timedProjection = buildPersonalStructuralScheduleProjection({
    schedule: {
      mode: 'fixed_date',
      date: '2026-08-12',
      time: '09:30',
      durationMinutes: 45,
      timeZone: 'Asia/Seoul',
    },
    identityNamespace: 'draft-copy',
    itemId: 'personal-item-a',
  });
  const timedFields = buildPersonalStructuralPortableScheduleFields(timedProjection);
  assert.deepEqual(timedFields, {
    stableEventIdentitySeed: timedProjection.stableEventIdentitySeed,
    time: '09:30',
    durationMinutes: 45,
    timeZone: 'Asia/Seoul',
  });
  const timedIcs = buildMyFlowStepIcs({
    ...baseInput,
    date: '2026-08-12',
    repeatPreset: '',
    ...timedFields,
  }).replaceAll('\r\n ', '');
  assert.match(timedIcs, /DTSTART;TZID=Asia\/Seoul:20260812T093000/);
  assert.match(timedIcs, /DTEND;TZID=Asia\/Seoul:20260812T101500/);

  const allDayProjection = buildPersonalStructuralScheduleProjection({
    schedule: { mode: 'fixed_date', date: '2026-08-12' },
    identityNamespace: 'draft-copy',
    itemId: 'personal-item-a',
  });
  assert.deepEqual(
    buildPersonalStructuralPortableScheduleFields(allDayProjection),
    { stableEventIdentitySeed: allDayProjection.stableEventIdentitySeed },
  );
});

test('legacy past run stays summary-only and status labels remain user-facing', () => {
  const legacy: FlowRunRecord = {
    schemaVersion: 1,
    runId: 'legacy-run',
    flowSlug: 'legacy-flow',
    status: 'completed',
    startedAt: '2026-07-01T00:00:00.000Z',
    completedAt: '2026-07-13T00:00:00.000Z',
    completionSnapshot: {
      checks: {},
      itemStates: {},
      stepItemChecks: {},
      comparisonState: {},
      workbenchState: {},
      reactionLogs: {},
    },
  };
  assert.equal(buildFlowRunHistoryListExportArtifacts(legacy, '현재 제목'), undefined);
  assert.equal(getFlowRunItemStatusLabel('done'), '완료');
  assert.equal(getFlowRunItemStatusLabel('skipped'), '건너뜀');
  assert.equal(getFlowRunItemStatusLabel('held'), '보류');
  assert.equal(getFlowRunItemStatusLabel('reopened'), '미완료');
});
