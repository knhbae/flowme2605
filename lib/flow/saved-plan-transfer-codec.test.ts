import assert from 'node:assert/strict';
import test from 'node:test';
import type { FlowExportDestination } from './export-scope';
import {
  SAVED_PLAN_TRANSFER_FORMAT_BY_DESTINATION,
  SAVED_PLAN_XLSX_COLUMNS,
  buildSavedPlanTransferArtifact,
  buildSavedPlanTransferPreview,
  serializeSavedPlanTransferPreviewSnapshot,
  type SavedPlanTransferInput,
} from './saved-plan-transfer-codec';

const focusMemo = [
  '현관, 욕실, 주방을 사진과 짧은 메모로 남깁니다.',
  '',
  '- [ ] 현관과 창문 사진 남기기',
  '- [x] 욕실과 주방 하자 적기',
  '- [ ] 집주인 또는 중개인에게 공유하기',
].join('\n');

const input: SavedPlanTransferInput = {
  planTitle: '사본 1 · 이사 D-30 준비',
  generatedAt: '2026-08-10T00:00:00.000Z',
  items: [
    {
      itemId: 'inspection',
      portableInput: {
        flowTitle: '이사 D-30 준비',
        stepId: 'inspection',
        stableEventIdentitySeed: 'plan-copy-1:inspection',
        stepTitle: '이사할 집 하자 점검하기',
        date: '2026-08-09',
        rawMemoText: focusMemo,
        completionCriteria: '주요 공간 사진과 하자 목록을 공유했다.',
        executionStatus: 'pending',
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
        stableEventIdentitySeed: 'plan-copy-1:quote',
        stepTitle: '이사업체 견적 받기',
        memo: '세 업체에 같은 조건으로 문의합니다.',
        items: ['견적서 받기'],
        checkedItems: { '0': true },
        completionCriteria: '업체 한 곳을 정했다.',
        executionStatus: 'done',
      },
      listRow: {
        itemId: 'quote',
        title: '이사업체 견적 받기',
        scheduleState: 'unscheduled',
        repeatLabel: '매주 월·수·금 · 시간 미정 · 종료 없음',
        status: 'done',
        personalOrderRank: 1,
      },
    },
  ],
};

function assertRfc5545PhysicalLines(payload: string): void {
  assert.equal(payload.endsWith('\r\n'), true);
  assert.equal(/(?<!\r)\n/u.test(payload), false);
  payload.split('\r\n').forEach((line) => {
    assert.ok(
      Buffer.byteLength(line, 'utf8') <= 75,
      `RFC 5545 content line exceeds 75 octets: ${line}`,
    );
  });
}

function unfold(payload: string): string {
  return payload.replaceAll(/\r\n[ \t]/gu, '').replaceAll('\r\n', '\n');
}

function unescapeIcsText(value: string): string {
  return value
    .replaceAll('\\n', '\n')
    .replaceAll('\\N', '\n')
    .replaceAll('\\,', ',')
    .replaceAll('\\;', ';')
    .replaceAll('\\\\', '\\');
}

function firstDescription(payload: string): string {
  const line = unfold(payload).split('\n').find((candidate) => candidate.startsWith('DESCRIPTION:'));
  assert.ok(line);
  return unescapeIcsText(line.slice('DESCRIPTION:'.length));
}

test('maps saved destinations to exactly one approved transfer format and effect', async () => {
  assert.deepEqual(SAVED_PLAN_TRANSFER_FORMAT_BY_DESTINATION, {
    memo: 'txt',
    checklist: 'vtodo',
    calendar: 'vevent',
    sheet: 'xlsx',
  });

  const destinations: FlowExportDestination[] = ['memo', 'checklist', 'calendar', 'sheet'];
  const artifacts = await Promise.all(
    destinations.map((destination) => buildSavedPlanTransferArtifact(input, destination)),
  );

  assert.deepEqual(artifacts.map((artifact) => artifact.format), ['txt', 'vtodo', 'vevent', 'xlsx']);
  assert.deepEqual(artifacts.map((artifact) => artifact.effect), ['clipboard', 'download', 'download', 'download']);
  assert.deepEqual(artifacts.map((artifact) => artifact.extension), ['txt', 'ics', 'ics', 'xlsx']);
});

test('uses the deterministic projection, not XLSX ZIP metadata, for transfer revalidation', () => {
  const first = buildSavedPlanTransferPreview(input, 'sheet');
  const second = buildSavedPlanTransferPreview(input, 'sheet');
  assert.equal(
    serializeSavedPlanTransferPreviewSnapshot(first),
    serializeSavedPlanTransferPreviewSnapshot(second),
  );

  const changedInput: SavedPlanTransferInput = {
    ...input,
    items: input.items.map((item, index) => index === 0
      ? {
          ...item,
          portableInput: {
            ...item.portableInput,
            rawMemoText: `${item.portableInput.rawMemoText ?? ''}\n새 메모`,
          },
        }
      : item),
  };
  const changed = buildSavedPlanTransferPreview(changedInput, 'sheet');
  assert.notEqual(
    serializeSavedPlanTransferPreviewSnapshot(first),
    serializeSavedPlanTransferPreviewSnapshot(changed),
  );
});

test('TXT keeps every Todo as one readable unit with raw checklist and criterion text', () => {
  const preview = buildSavedPlanTransferPreview(input, 'memo');
  assert.equal(preview.format, 'txt');
  assert.equal(preview.itemCount, 2);
  assert.equal(preview.outputCount, 2);
  assert.equal(preview.body.kind, 'text');
  if (preview.body.kind !== 'text') return;

  assert.equal(preview.body.previewItemCount, 1);
  assert.match(preview.body.previewContent ?? '', /1\. 이사할 집 하자 점검하기/u);
  assert.match(preview.body.previewContent ?? '', /- \[ \] 현관과 창문 사진 남기기/u);
  assert.match(preview.body.previewContent ?? '', /- \[x\] 욕실과 주방 하자 적기/u);
  assert.match(preview.body.previewContent ?? '', /- \[ \] 집주인 또는 중개인에게 공유하기/u);
  assert.doesNotMatch(preview.body.previewContent ?? '', /2\. 이사업체 견적 받기/u);
  assert.match(preview.body.content, /^사본 1 · 이사 D-30 준비\n\n할 일 2개/u);
  assert.match(preview.body.content, /1\. 이사할 집 하자 점검하기/u);
  assert.match(preview.body.content, /- \[ \] 현관과 창문 사진 남기기/u);
  assert.match(preview.body.content, /- \[x\] 욕실과 주방 하자 적기/u);
  assert.match(preview.body.content, /완료 기준: 주요 공간 사진과 하자 목록을 공유했다\./u);
  assert.match(preview.body.content, /2\. 이사업체 견적 받기/u);
  assert.match(preview.body.content, /- \[x\] 견적서 받기/u);
  assert.equal((preview.body.content.match(/완료 기준: 주요 공간 사진과 하자 목록을 공유했다\./gu) ?? []).length, 1);
});

test('VTODO creates one component per Todo and preserves DESCRIPTION bytes without checklist children', () => {
  const preview = buildSavedPlanTransferPreview(input, 'checklist');
  assert.equal(preview.format, 'vtodo');
  assert.equal(preview.outputCount, 2);
  assert.equal(preview.body.kind, 'text');
  if (preview.body.kind !== 'text') return;

  const payload = preview.body.content;
  assertRfc5545PhysicalLines(payload);
  assert.equal((payload.match(/BEGIN:VTODO/gu) ?? []).length, 2);
  assert.equal((payload.match(/BEGIN:VEVENT/gu) ?? []).length, 0);
  assert.match(payload, /UID:plan-copy-1:inspection@flowme\.local/u);
  assert.match(payload, /UID:plan-copy-1:quote@flowme\.local/u);
  assert.match(payload, /DUE;VALUE=DATE:20260809/u);
  assert.equal(firstDescription(payload), `${focusMemo}\n\n완료 기준: 주요 공간 사진과 하자 목록을 공유했다.`);
  assert.equal((unfold(payload).match(/완료 기준: 주요 공간 사진과 하자 목록을 공유했다\./gu) ?? []).length, 1);
});

test('VEVENT omits undated Todos and keeps the same stable identity and canonical DESCRIPTION', () => {
  const first = buildSavedPlanTransferPreview(input, 'calendar');
  const second = buildSavedPlanTransferPreview(input, 'calendar');
  assert.equal(first.body.kind, 'text');
  assert.equal(second.body.kind, 'text');
  if (first.body.kind !== 'text' || second.body.kind !== 'text') return;

  assert.equal(first.outputCount, 1);
  assert.equal((first.body.content.match(/BEGIN:VEVENT/gu) ?? []).length, 1);
  assert.equal((first.body.content.match(/BEGIN:VTODO/gu) ?? []).length, 0);
  assert.match(first.body.content, /UID:plan-copy-1:inspection@flowme\.local/u);
  assert.doesNotMatch(first.body.content, /UID:plan-copy-1:quote@flowme\.local/u);
  assert.equal(firstDescription(first.body.content), `${focusMemo}\n\n완료 기준: 주요 공간 사진과 하자 목록을 공유했다.`);
  assert.equal(first.body.content, second.body.content);
  assertRfc5545PhysicalLines(first.body.content);
});

test('XLSX round-trips the fixed eight columns, real dates, Korean text, and one row per Todo', async () => {
  const artifact = await buildSavedPlanTransferArtifact(input, 'sheet');
  assert.equal(artifact.format, 'xlsx');
  assert.equal(artifact.effect, 'download');
  assert.ok(artifact.payload instanceof ArrayBuffer || ArrayBuffer.isView(artifact.payload));
  const buffer = Buffer.from(artifact.payload as ArrayBuffer);
  assert.equal(buffer.subarray(0, 2).toString('utf8'), 'PK');

  const ExcelJSModule = await import('exceljs');
  const ExcelJS = (
    (ExcelJSModule as unknown as { default?: typeof ExcelJSModule }).default ?? ExcelJSModule
  );
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );
  assert.equal(workbook.worksheets.length, 1);
  const worksheet = workbook.getWorksheet('계획');
  assert.ok(worksheet);
  assert.equal(worksheet.rowCount, 3);
  assert.deepEqual(
    Array.from({ length: 8 }, (_, index) => worksheet.getCell(1, index + 1).value),
    [...SAVED_PLAN_XLSX_COLUMNS],
  );
  assert.deepEqual(
    Array.from({ length: 8 }, (_, index) => worksheet.getCell(2, index + 1).value),
    [
      1,
      '사본 1 · 이사 D-30 준비',
      worksheet.getCell(2, 3).value,
      '이사할 집 하자 점검하기',
      '예정',
      `${focusMemo}\n\n완료 기준: 주요 공간 사진과 하자 목록을 공유했다.`,
      3,
      '',
    ],
  );
  assert.ok(worksheet.getCell(2, 3).value instanceof Date);
  assert.equal(worksheet.getCell(2, 3).numFmt, 'yyyy-mm-dd');
  assert.equal(worksheet.getCell(3, 3).value, null);
  assert.equal(worksheet.getCell(3, 5).value, '완료');
  assert.equal(worksheet.getCell(3, 6).value, '세 업체에 같은 조건으로 문의합니다.\n\n- [x] 견적서 받기\n\n완료 기준: 업체 한 곳을 정했다.');
  assert.equal(worksheet.getCell(3, 7).value, 1);
  assert.equal(worksheet.getCell(3, 8).value, '매주 월·수·금 · 시간 미정 · 종료 없음');
  assert.equal(worksheet.getCell(2, 6).alignment?.wrapText, true);
  assert.equal(worksheet.views[0]?.state, 'frozen');
  assert.equal(worksheet.views[0]?.ySplit, 1);
  assert.equal(worksheet.views[0]?.topLeftCell, 'A2');
  assert.ok(worksheet.autoFilter);
  assert.match(artifact.lossNote ?? '', /자동 동기화되지 않습니다/u);
  assert.match(artifact.lossNote ?? '', /native Excel checkbox/u);
});
