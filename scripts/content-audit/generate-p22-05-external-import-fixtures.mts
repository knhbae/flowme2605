import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { MyFlowPortableStepExportInput } from '../../lib/flow/my-flow-step-export';

const exportModule = await import('../../lib/flow/export.ts');
const exportApi = (
  'buildIcsCalendar' in exportModule ? exportModule : exportModule.default
) as typeof import('../../lib/flow/export');
const { buildIcsCalendar, buildText, buildWorkbookSheets, buildXlsxBuffer } = exportApi;

const stepExportModule = await import('../../lib/flow/my-flow-step-export.ts');
const stepExportApi = (
  'buildMyFlowStepIcs' in stepExportModule ? stepExportModule : stepExportModule.default
) as typeof import('../../lib/flow/my-flow-step-export');
const {
  buildMyFlowStepChecklistText,
  buildMyFlowStepIcs,
  buildMyFlowStepPortableText,
  buildMyFlowStepSheetTsv,
} = stepExportApi;

const seedFlowModule = await import('../../lib/flow/seed-flows.ts');
const seedBundles = (
  'seedBundles' in seedFlowModule ? seedFlowModule : seedFlowModule.default
).seedBundles;

const guardrailModule = await import('../../lib/flow/user-surface-guardrails.ts');
const guardrailApi = (
  'scanUserFacingOutputGuardrails' in guardrailModule ? guardrailModule : guardrailModule.default
) as typeof import('../../lib/flow/user-surface-guardrails');
const { scanUserFacingOutputGuardrails } = guardrailApi;

const packageId = '2026-07-11-claude-design-p22-05-external-import-evidence';
const packageDir = path.resolve('docs/content-audit', packageId);
const artifactDir = path.join(packageDir, 'artifacts');
fs.mkdirSync(artifactDir, { recursive: true });

const flowCases = [
  {
    id: 'moving-d30',
    slug: 'moving-d30-basic',
    anchor: '2026-08-15',
    memo: '오전 중 견적 후보 두 곳에 연락하고 포함 범위를 확인',
  },
  {
    id: 'computer-study',
    slug: 'computer-skills-d30-study',
    anchor: '2026-09-05',
    memo: '필기 취약 단원과 실기 반복 구간을 먼저 표시',
  },
  {
    id: 'fridge-cleanout',
    slug: 'fridge-cleanout-weekly-plan',
    anchor: '2026-07-20',
    memo: '우유와 애호박을 먼저 쓰고 남은 재료는 냉동',
  },
] as const;

function sha256(value: string | Buffer) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeIcsForRegeneration(ics: string) {
  return ics.replace(/^DTSTAMP:.*$/gm, 'DTSTAMP:<generated>').replaceAll('\r\n ', '');
}

function extractIcsValues(ics: string, field: string) {
  return ics
    .replaceAll('\r\n ', '')
    .split(/\r?\n/)
    .filter((line) => line.startsWith(`${field}:`) || line.startsWith(`${field};`))
    .map((line) => line.slice(line.indexOf(':') + 1));
}

function buildSingleEventCalendar(ics: string) {
  const eventStart = ics.indexOf('BEGIN:VEVENT');
  const eventEnd = ics.indexOf('END:VEVENT', eventStart);
  const calendarEnd = ics.lastIndexOf('END:VCALENDAR');
  if (eventStart < 0 || eventEnd < 0 || calendarEnd < 0) {
    throw new Error('Unable to extract a single calendar event');
  }
  const eventBlock = ics.slice(eventStart, eventEnd + 'END:VEVENT'.length);
  return `${ics.slice(0, eventStart)}${eventBlock}\r\n${ics.slice(calendarEnd)}`;
}

function getVisibleIcsText(ics: string) {
  return ics
    .replaceAll('\r\n ', '')
    .split(/\r?\n/u)
    .filter((line) => !line.startsWith('UID:') && !line.startsWith('PRODID:'))
    .join('\n');
}

const manifestCases = [];

for (const flowCase of flowCases) {
  const bundle = seedBundles.find((entry) => entry.flow.slug === flowCase.slug);
  if (!bundle) throw new Error(`Missing representative Flow: ${flowCase.slug}`);
  const firstItem = bundle.items.find((item) => item.day_offset !== undefined) ?? bundle.items[0];
  if (!firstItem) throw new Error(`Missing representative item: ${flowCase.slug}`);

  const checks = { [firstItem.id]: true };
  const itemStates = { [firstItem.id]: { note: flowCase.memo } };
  const memoText = buildText(bundle, checks, flowCase.anchor, itemStates);
  const calendarIcs = buildIcsCalendar(bundle, checks, flowCase.anchor, itemStates);
  const firstEventIcs = buildSingleEventCalendar(calendarIcs);
  const sheets = buildWorkbookSheets(bundle, checks, flowCase.anchor, { itemStates });
  const xlsxBuffer = Buffer.from(await buildXlsxBuffer(sheets));
  const workbookText = sheets.flatMap((sheet) => sheet.rows.flat()).map(String).join('\n');
  const outputGuardrails = {
    calendar: scanUserFacingOutputGuardrails({ text: getVisibleIcsText(calendarIcs) }),
    sheet: scanUserFacingOutputGuardrails({ text: workbookText }),
    memo: scanUserFacingOutputGuardrails({ text: memoText }),
  };

  const output = path.join(artifactDir, flowCase.id);
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'calendar.ics'), calendarIcs);
  fs.writeFileSync(path.join(output, 'calendar-first-event.ics'), firstEventIcs);
  fs.writeFileSync(path.join(output, 'sheet.xlsx'), xlsxBuffer);
  fs.writeFileSync(path.join(output, 'memo.txt'), memoText);

  const regeneratedMemo = buildText(bundle, checks, flowCase.anchor, itemStates);
  const regeneratedIcs = buildIcsCalendar(bundle, checks, flowCase.anchor, itemStates);
  const regeneratedSheets = buildWorkbookSheets(bundle, checks, flowCase.anchor, { itemStates });
  const executionSheet = sheets.find((sheet) => sheet.name === '실행표');
  if (!executionSheet) throw new Error(`Missing execution sheet: ${flowCase.slug}`);
  const firstItemSheetRow = executionSheet.rows.find((row) => String(row[4]) === firstItem.title);
  if (!firstItemSheetRow) throw new Error(`Missing representative item row: ${firstItem.id}`);

  manifestCases.push({
    id: flowCase.id,
    slug: flowCase.slug,
    title: bundle.flow.title,
    anchor: flowCase.anchor,
    expectedEventCount: (calendarIcs.match(/BEGIN:VEVENT/g) ?? []).length,
    expectedExecutionRowCount: executionSheet.rows.length,
    firstItem: {
      id: firstItem.id,
      title: firstItem.title,
      expectedDate: String(firstItemSheetRow[2] ?? ''),
      memo: flowCase.memo,
    },
    files: {
      calendar: `artifacts/${flowCase.id}/calendar.ics`,
      calendarFirstEvent: `artifacts/${flowCase.id}/calendar-first-event.ics`,
      sheet: `artifacts/${flowCase.id}/sheet.xlsx`,
      memo: `artifacts/${flowCase.id}/memo.txt`,
    },
    generatedHashes: {
      calendarSha256: sha256(calendarIcs),
      sheetSha256: sha256(xlsxBuffer),
      memoSha256: sha256(memoText),
    },
    expectedFields: {
      calendarSubjects: extractIcsValues(calendarIcs, 'SUMMARY'),
      calendarDates: extractIcsValues(calendarIcs, 'DTSTART'),
      calendarUids: extractIcsValues(calendarIcs, 'UID'),
      calendarContainsUserMemo: calendarIcs.replaceAll('\r\n ', '').includes(`내 메모: ${flowCase.memo}`),
      sheetNames: sheets.map((sheet) => sheet.name),
      sheetContainsUserMemo: JSON.stringify(sheets).includes(flowCase.memo),
      memoContainsTitle: memoText.includes(firstItem.title),
      memoContainsUserMemo: memoText.includes(`메모: ${flowCase.memo}`),
      memoContainsBrokenDescriptionLabel: memoText.includes('??:'),
    },
    regeneration: {
      calendarBusinessPayloadStable:
        normalizeIcsForRegeneration(calendarIcs) === normalizeIcsForRegeneration(regeneratedIcs),
      calendarUidSetStable:
        JSON.stringify(extractIcsValues(calendarIcs, 'UID')) ===
        JSON.stringify(extractIcsValues(regeneratedIcs, 'UID')),
      sheetProjectionStable: JSON.stringify(sheets) === JSON.stringify(regeneratedSheets),
      memoPayloadStable: memoText === regeneratedMemo,
    },
    outputGuardrail: {
      calendarInternalHitCount: outputGuardrails.calendar.internalCopyHits.length,
      sheetInternalHitCount: outputGuardrails.sheet.internalCopyHits.length,
      memoInternalHitCount: outputGuardrails.memo.internalCopyHits.length,
      internalHits: [
        ...outputGuardrails.calendar.internalCopyHits,
        ...outputGuardrails.sheet.internalCopyHits,
        ...outputGuardrails.memo.internalCopyHits,
      ],
    },
  });
}

const personalStep: MyFlowPortableStepExportInput = {
  flowTitle: '주말 이사 준비 초안',
  stepId: 'url-draft-weekend-prep-step-1',
  stepTitle: '내 일정에 맞춘 첫 단계',
  sectionTitle: '이번 주 준비',
  date: '2026-07-27',
  time: '09:30',
  location: '집',
  memo: '초안에서 직접 고친 사용자 메모',
  items: ['견적 후보 두 곳에 연락', '포함 범위 메모'],
  checkedItems: { '0': true },
  completionCriteria: '견적 후보와 포함 범위를 메모했다.',
  sourceLabel: '원문 링크',
  sourceUrl: 'https://example.com/weekend-moving-source',
};
const personalOutput = path.join(artifactDir, 'personal-step');
fs.mkdirSync(personalOutput, { recursive: true });
const personalIcs = buildMyFlowStepIcs(personalStep);
const personalMemo = buildMyFlowStepPortableText(personalStep);
const personalChecklist = buildMyFlowStepChecklistText(personalStep);
const personalSheet = buildMyFlowStepSheetTsv(personalStep);
const personalOutputGuardrails = {
  calendar: scanUserFacingOutputGuardrails({ text: getVisibleIcsText(personalIcs) }),
  sheet: scanUserFacingOutputGuardrails({ text: personalSheet }),
  memo: scanUserFacingOutputGuardrails({ text: personalMemo }),
  checklist: scanUserFacingOutputGuardrails({ text: personalChecklist }),
};
fs.writeFileSync(path.join(personalOutput, 'calendar.ics'), personalIcs);
fs.writeFileSync(path.join(personalOutput, 'memo.txt'), personalMemo);
fs.writeFileSync(path.join(personalOutput, 'checklist.txt'), personalChecklist);
fs.writeFileSync(path.join(personalOutput, 'sheet.tsv'), personalSheet);

const manifest = {
  packageId,
  generatedAt: '2026-07-11',
  representativeFlowCount: manifestCases.length,
  representativeFlows: manifestCases,
  personalStep: {
    title: personalStep.stepTitle,
    date: personalStep.date,
    memo: personalStep.memo,
    files: {
      calendar: 'artifacts/personal-step/calendar.ics',
      sheet: 'artifacts/personal-step/sheet.tsv',
      memo: 'artifacts/personal-step/memo.txt',
      checklist: 'artifacts/personal-step/checklist.txt',
    },
    expectedFields: {
      calendarUid: extractIcsValues(personalIcs, 'UID')[0],
      calendarSubject: extractIcsValues(personalIcs, 'SUMMARY')[0],
      calendarDate: extractIcsValues(personalIcs, 'DTSTART')[0],
      calendarContainsMemo: personalIcs.replaceAll('\r\n ', '').includes(personalStep.memo ?? ''),
      sheetContainsMemo: personalSheet.includes(personalStep.memo ?? ''),
      memoContainsMemo: personalMemo.includes(personalStep.memo ?? ''),
    },
    outputGuardrail: {
      internalHitCount: Object.values(personalOutputGuardrails).reduce(
        (sum, result) => sum + result.internalCopyHits.length,
        0,
      ),
      internalHits: Object.values(personalOutputGuardrails).flatMap((result) => result.internalCopyHits),
    },
  },
  duplicatePolicyInputs: {
    calendarUsesStableUid: manifestCases.every((entry) => entry.regeneration.calendarUidSetStable),
    spreadsheetHasStableItemIdColumn: false,
    memoHasStableExportBlockId: false,
  },
};

fs.writeFileSync(path.join(packageDir, 'fixture-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(
  `${JSON.stringify({
    representativeFlowCount: manifest.representativeFlowCount,
    calendarMemoFidelityCount: manifestCases.filter((entry) => entry.expectedFields.calendarContainsUserMemo).length,
    sheetMemoFidelityCount: manifestCases.filter((entry) => entry.expectedFields.sheetContainsUserMemo).length,
    memoFidelityCount: manifestCases.filter((entry) => entry.expectedFields.memoContainsUserMemo).length,
    stableCalendarUidCount: manifestCases.filter((entry) => entry.regeneration.calendarUidSetStable).length,
    representativeOutputInternalHitCount: manifestCases.reduce(
      (sum, entry) => sum + entry.outputGuardrail.internalHits.length,
      0,
    ),
    personalOutputInternalHitCount: manifest.personalStep.outputGuardrail.internalHitCount,
  })}\n`,
);
