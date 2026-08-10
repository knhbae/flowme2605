import type { FlowExportDestination } from './export-scope';
import {
  buildMyFlowItemDescriptionText,
  buildMyFlowMultiStepIcs,
  buildMyFlowMultiStepVtodo,
  type MyFlowPortableStepExportInput,
} from './my-flow-step-export';
import type { PersonalStructuralListExportRow } from './personal-structural-list-export';

export type SavedPlanTransferFormat = 'txt' | 'vtodo' | 'vevent' | 'xlsx';

export const SAVED_PLAN_TRANSFER_FORMAT_BY_DESTINATION = {
  memo: 'txt',
  checklist: 'vtodo',
  calendar: 'vevent',
  sheet: 'xlsx',
} as const satisfies Record<FlowExportDestination, SavedPlanTransferFormat>;

export const SAVED_PLAN_TRANSFER_DESTINATIONS = [
  'memo',
  'checklist',
  'calendar',
  'sheet',
] as const satisfies readonly FlowExportDestination[];

export const SAVED_PLAN_XLSX_COLUMNS = [
  '순서',
  '계획 이름',
  '날짜',
  '할 일',
  '상태',
  '메모 원문',
  '확인 항목 수',
  '반복',
] as const;

export type SavedPlanTransferItem = Readonly<{
  itemId: string;
  portableInput: MyFlowPortableStepExportInput;
  listRow: PersonalStructuralListExportRow;
}>;

export type SavedPlanTransferInput = Readonly<{
  planTitle: string;
  items: readonly SavedPlanTransferItem[];
  generatedAt?: string;
}>;

export type SavedPlanTransferTablePreview = Readonly<{
  kind: 'table';
  columns: readonly string[];
  rows: readonly (readonly (string | number)[])[];
}>;

export type SavedPlanTransferTextPreview = Readonly<{
  kind: 'text';
  content: string;
  previewContent?: string;
  previewItemCount?: number;
}>;

export type SavedPlanTransferPreview = Readonly<{
  destination: FlowExportDestination;
  format: SavedPlanTransferFormat;
  itemIds: readonly string[];
  itemCount: number;
  outputCount: number;
  lossNote?: string;
  body: SavedPlanTransferTextPreview | SavedPlanTransferTablePreview;
}>;

export type SavedPlanTransferArtifact = SavedPlanTransferPreview & Readonly<{
  effect: 'clipboard' | 'download';
  mediaType: string;
  extension: 'txt' | 'ics' | 'xlsx';
  payload: string | ArrayBuffer;
}>;

/**
 * Exact, deterministic projection snapshot used to revalidate approved transfers.
 * Binary container metadata (for example XLSX ZIP entry timestamps) is deliberately
 * outside this snapshot; the confirmed request separately owns and verifies the
 * exact bytes that are downloaded.
 */
export function serializeSavedPlanTransferPreviewSnapshot(
  preview: SavedPlanTransferPreview,
): string {
  return JSON.stringify({
    destination: preview.destination,
    format: preview.format,
    itemIds: preview.itemIds,
    itemCount: preview.itemCount,
    outputCount: preview.outputCount,
    body: preview.body,
  });
}

type NormalizedTransferItem = Readonly<{
  itemId: string;
  portableInput: MyFlowPortableStepExportInput;
  listRow: PersonalStructuralListExportRow;
  rawMemoText: string;
}>;

function normalizeLineEndings(value: string): string {
  return value.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
}

function normalizeItems(input: SavedPlanTransferInput): NormalizedTransferItem[] {
  const seen = new Set<string>();
  return input.items.flatMap((item) => {
    const itemId = item.itemId.trim();
    if (!itemId || seen.has(itemId)) return [];
    seen.add(itemId);
    const portableInput = {
      ...item.portableInput,
      stableEventIdentitySeed:
        item.portableInput.stableEventIdentitySeed?.trim() || itemId,
      ...(input.generatedAt && !item.portableInput.generatedAt
        ? { generatedAt: input.generatedAt }
        : {}),
    };
    return [{
      itemId,
      portableInput,
      listRow: { ...item.listRow },
      rawMemoText: normalizeLineEndings(buildMyFlowItemDescriptionText(portableInput)),
    }];
  });
}

function countChecklistRows(rawMemoText: string): number {
  return rawMemoText.match(/^\s*-\s*\[[ xX]\]\s+\S/gmu)?.length ?? 0;
}

function statusLabel(status: PersonalStructuralListExportRow['status']): string {
  return status === 'done' ? '완료' : '예정';
}

function buildTxt(planTitle: string, items: readonly NormalizedTransferItem[]): string {
  const lines = [planTitle.trim() || '내 계획', '', `할 일 ${items.length}개`];
  items.forEach((item, index) => {
    lines.push('', `${index + 1}. ${item.listRow.title.trim() || '할 일'}`);
    if (item.listRow.date) lines.push(`날짜: ${item.listRow.date}`);
    lines.push(`상태: ${statusLabel(item.listRow.status)}`);
    if (item.rawMemoText) lines.push('', item.rawMemoText);
  });
  return `${lines.join('\n').trimEnd()}\n`;
}

function buildXlsxRows(
  planTitle: string,
  items: readonly NormalizedTransferItem[],
): (string | number)[][] {
  return items.map((item, index) => [
    index + 1,
    planTitle,
    item.listRow.date ?? '',
    item.listRow.title,
    statusLabel(item.listRow.status),
    item.rawMemoText,
    countChecklistRows(item.rawMemoText),
    item.listRow.repeatLabel ?? '',
  ]);
}

function countComponents(payload: string, component: 'VTODO' | 'VEVENT'): number {
  return payload.match(new RegExp(`BEGIN:${component}`, 'gu'))?.length ?? 0;
}

function withCanonicalDescription(item: NormalizedTransferItem): MyFlowPortableStepExportInput {
  return {
    ...item.portableInput,
    rawMemoText: item.rawMemoText,
    // rawMemoText above is already the canonical memo + checklist + criterion
    // composition. Clear the source fields so the shared serializer does not
    // append any section a second time.
    items: [],
    completionCriteria: undefined,
  };
}

export function buildSavedPlanTransferPreview(
  input: SavedPlanTransferInput,
  destination: FlowExportDestination,
): SavedPlanTransferPreview {
  const items = normalizeItems(input);
  const itemIds = Object.freeze(items.map((item) => item.itemId));
  const format = SAVED_PLAN_TRANSFER_FORMAT_BY_DESTINATION[destination];

  if (format === 'txt') {
    const previewItems = items.slice(0, 1);
    return Object.freeze({
      destination,
      format,
      itemIds,
      itemCount: items.length,
      outputCount: items.length,
      body: Object.freeze({
        kind: 'text' as const,
        content: buildTxt(input.planTitle, items),
        previewContent: buildTxt(input.planTitle, previewItems),
        previewItemCount: previewItems.length,
      }),
    });
  }

  if (format === 'vtodo') {
    const content = buildMyFlowMultiStepVtodo(items.map(withCanonicalDescription));
    return Object.freeze({
      destination,
      format,
      itemIds,
      itemCount: items.length,
      outputCount: countComponents(content, 'VTODO'),
      body: Object.freeze({ kind: 'text' as const, content }),
    });
  }

  if (format === 'vevent') {
    const content = buildMyFlowMultiStepIcs(items.map(withCanonicalDescription));
    return Object.freeze({
      destination,
      format,
      itemIds,
      itemCount: items.length,
      outputCount: countComponents(content, 'VEVENT'),
      body: Object.freeze({ kind: 'text' as const, content }),
    });
  }

  return Object.freeze({
    destination,
    format,
    itemIds,
    itemCount: items.length,
    outputCount: items.length,
    lossNote: [
      '이 파일은 저장 시점 snapshot이며 FlowMe와 자동 동기화되지 않습니다.',
      'Excel에서 바꾼 완료·날짜·메모는 FlowMe에 돌아오지 않습니다.',
      '확인 항목은 native Excel checkbox가 아니라 메모 원문의 Markdown 텍스트로 보존됩니다.',
      '반복은 규칙 문자열 한 행으로 보존하고 날짜 미정 항목의 날짜 cell은 비워 둡니다.',
    ].join(' '),
    body: Object.freeze({
      kind: 'table' as const,
      columns: Object.freeze([...SAVED_PLAN_XLSX_COLUMNS]),
      rows: Object.freeze(buildXlsxRows(input.planTitle, items).map((row) => Object.freeze(row))),
    }),
  });
}

async function buildSavedPlanXlsxBuffer(
  preview: SavedPlanTransferPreview & { body: SavedPlanTransferTablePreview },
): Promise<ArrayBuffer> {
  const ExcelJSModule = await import('exceljs');
  const ExcelJS = (
    (ExcelJSModule as unknown as { default?: typeof ExcelJSModule }).default ?? ExcelJSModule
  );
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FlowMe';
  workbook.created = new Date(0);
  workbook.modified = new Date(0);
  const worksheet = workbook.addWorksheet('계획', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { defaultRowHeight: 24 },
  });
  worksheet.columns = preview.body.columns.map((header) => ({
    header,
    key: header,
    width: header === '메모 원문' ? 48 : header === '할 일' || header === '계획 이름' ? 28 : 14,
  }));
  preview.body.rows.forEach((sourceRow) => {
    const row = worksheet.addRow([...sourceRow]);
    const dateCell = row.getCell(3);
    const date = String(dateCell.value ?? '');
    if (/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      dateCell.value = new Date(Date.UTC(year, month - 1, day));
      dateCell.numFmt = 'yyyy-mm-dd';
    } else if (!date) {
      dateCell.value = null;
    }
  });
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' },
  };
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.alignment = {
        vertical: rowNumber === 1 ? 'middle' : 'top',
        horizontal: rowNumber === 1 ? 'center' : 'left',
        wrapText: true,
      };
    });
  });
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: preview.body.columns.length },
  };
  return workbook.xlsx.writeBuffer();
}

export async function buildSavedPlanTransferArtifact(
  input: SavedPlanTransferInput,
  destination: FlowExportDestination,
): Promise<SavedPlanTransferArtifact> {
  const preview = buildSavedPlanTransferPreview(input, destination);
  if (preview.format === 'xlsx' && preview.body.kind === 'table') {
    return Object.freeze({
      ...preview,
      effect: 'download' as const,
      mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx' as const,
      payload: await buildSavedPlanXlsxBuffer({ ...preview, body: preview.body }),
    });
  }
  const payload = preview.body.kind === 'text' ? preview.body.content : '';
  return Object.freeze({
    ...preview,
    effect: preview.format === 'txt' ? 'clipboard' as const : 'download' as const,
    mediaType: preview.format === 'txt'
      ? 'text/plain;charset=utf-8'
      : 'text/calendar;charset=utf-8',
    extension: preview.format === 'txt' ? 'txt' as const : 'ics' as const,
    payload,
  });
}
