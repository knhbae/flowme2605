import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { contentsBatch260601OfficialBundles } from '../contents-batch-260601-official';
import { realContentPilotBundles } from '../real-content-pilot-flows';
import {
  buildArtifactPreflight,
  buildAuthoringArtifactProjection,
} from './artifact-projection';
import type {
  AuthoringArtifactKind,
  AuthoringArtifactProjection,
} from './artifact-projection';
import {
  buildAuthoringTableRows,
  serializeAuthoringIcs,
  serializeAuthoringPlainText,
} from './file-export';
import { applyAuthoringOperation } from './operations';
import { createTextAuthoringDocument } from './parser';
import {
  assertPreflightReceiptParity,
  createExportReceipt,
  createSaveReceipt,
} from './receipt';
import {
  createMemoryTextAuthoringStorage,
  createTextAuthoringDraftRepository,
} from './storage';
import type {
  AuthoringSchedule,
  CanonicalAuthoringItem,
  TextAuthoringDocument,
} from './types';
import { validateTextAuthoringDocument } from './validation';

const NOW = '2026-07-29T00:00:00.000Z';
const QUALIFIED_CORPUS_PATH = join(
  process.cwd(),
  'docs',
  'content-audit',
  '2026-07-28-flowme-text-authoring-ux-design-handoff',
  'local-evidence',
  'qualified-corpus-v2',
  'qualified-corpus-fixture-v2.json',
);
const INPUT_COMPOSER_PATH = join(
  process.cwd(),
  'docs',
  'specs',
  '2026-07-20-flowme-input-composer-lab-v1',
  'input-composer-scenarios-v1.json',
);

type QualifiedSchedule =
  | {
      type: 'relative_to_target';
      offsetDays: number;
      segment?: string;
    }
  | {
      type: 'sequence_day';
      day: number;
    };

type QualifiedSourceRow = {
  sourceRowId: string;
  label: string;
  detail: string;
  sourceUrl: string;
};

type QualifiedItem = {
  itemId: string;
  itemTitle: string;
  completionMode: string;
  schedule?: QualifiedSchedule;
  sourceRowIds: string[];
};

type QualifiedStep = {
  stepId: string;
  title: string;
  schedule?: QualifiedSchedule;
  items: QualifiedItem[];
};

type QualifiedFlow = {
  flowId: string;
  title: string;
  sourceVideoUrl?: string;
  steps: QualifiedStep[];
};

type QualifiedCorpusEntry = {
  bundleId: string;
  title: string;
  dateRuleAsRecorded: string;
  sourceRows: QualifiedSourceRow[];
  bundle: {
    title: string;
    sourceUrls: string[];
    map: {
      flows: QualifiedFlow[];
    };
  };
};

type QualifiedCorpus = {
  schemaVersion: string;
  bundles: QualifiedCorpusEntry[];
};

type InputComposerItem = {
  itemId: string;
  intent: string;
  title: string;
  detail: {
    summary: string;
  };
  completion: {
    mode: string;
    doneWhen: string;
  };
  schedule: unknown;
  provenance: {
    origin: string;
    sourceUrl: string;
  };
};

type InputComposerCase = {
  caseId: string;
  sourceCaseId: string;
  title: string;
  shortTitle: string;
  defaultArtifact: string;
  source: {
    title: string;
    url: string;
    completeness: string;
    sourceRowCount: number;
    missingRows: string[];
  };
  canonical: {
    flowId: string;
    title: string;
    items: InputComposerItem[];
  };
};

type InputComposerCorpus = {
  cases: InputComposerCase[];
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

const qualifiedCorpus = readJson<QualifiedCorpus>(QUALIFIED_CORPUS_PATH);
const inputComposerCorpus = readJson<InputComposerCorpus>(INPUT_COMPOSER_PATH);

function qualifiedEntry(bundleId: string): QualifiedCorpusEntry {
  const entry = qualifiedCorpus.bundles.find((candidate) => (
    candidate.bundleId === bundleId
  ));
  assert.ok(entry, `qualified corpus bundle not found: ${bundleId}`);
  return entry;
}

function inputComposerCase(caseId: string): InputComposerCase {
  const fixture = inputComposerCorpus.cases.find((candidate) => (
    candidate.caseId === caseId
  ));
  assert.ok(fixture, `Input Composer case not found: ${caseId}`);
  return fixture;
}

function flattenedQualifiedItems(entry: QualifiedCorpusEntry): QualifiedItem[] {
  return entry.bundle.map.flows.flatMap((flow) => (
    flow.steps.flatMap((step) => step.items)
  ));
}

function flattenedQualifiedSteps(entry: QualifiedCorpusEntry): QualifiedStep[] {
  return entry.bundle.map.flows.flatMap((flow) => flow.steps);
}

function qualifiedSourceRowsById(
  entry: QualifiedCorpusEntry,
): Map<string, QualifiedSourceRow> {
  return new Map(entry.sourceRows.map((row) => [row.sourceRowId, row]));
}

function scheduleToken(schedule: QualifiedSchedule): string {
  if (schedule.type === 'sequence_day') return `D+${schedule.day - 1}`;
  if (schedule.offsetDays === 0) return 'D-Day';
  return schedule.offsetDays > 0
    ? `D+${schedule.offsetDays}`
    : `D${schedule.offsetDays}`;
}

function withCanonicalAnchor(rawText: string, anchor: string): string {
  const lines = rawText.split(/\r?\n/u);
  const existingIndex = lines.findIndex((line) => (
    /^(?:-\s+)?기준일:/u.test(line.trim())
  ));
  if (existingIndex >= 0) {
    lines[existingIndex] = `- 기준일: ${anchor}`;
  } else {
    const headingIndex = lines.findIndex((line) => /^#\s+/u.test(line));
    lines.splice(headingIndex >= 0 ? headingIndex + 1 : 0, 0, `- 기준일: ${anchor}`);
  }
  return lines.join('\n');
}

function buildQualifiedMarkdown(entry: QualifiedCorpusEntry): string {
  const sourceRows = qualifiedSourceRowsById(entry);
  const lines = [`# ${entry.bundle.title}`];
  if (entry.bundleId === 'bundle-moving-d30') lines.push('기준일: 이사일');

  for (const flow of entry.bundle.map.flows) {
    for (const step of flow.steps) {
      lines.push(`## ${step.title}`);
      for (const item of step.items) {
        const rows = item.sourceRowIds.map((sourceRowId) => {
          const row = sourceRows.get(sourceRowId);
          assert.ok(row, `${entry.bundleId}: unresolved source row ${sourceRowId}`);
          return row;
        });
        lines.push(`- [ ] ${item.itemTitle}`);
        if (rows.length > 0) {
          lines.push(`  설명: ${rows.map((row) => row.detail).join(' · ')}`);
        }
        if (item.schedule) {
          lines.push(`  상대 날짜: ${scheduleToken(item.schedule)}`);
        }
        if (flow.sourceVideoUrl) {
          const sourceRow = rows[0];
          assert.equal(
            flow.sourceVideoUrl,
            sourceRow.sourceUrl,
            `${item.itemId}: Flow resource and SourceRow URL must match`,
          );
          lines.push(`  자료: ${sourceRow.label} | ${sourceRow.sourceUrl}`);
        }
      }
    }
  }
  return lines.join('\n');
}

function createQualifiedDocument(
  bundleId: string,
  anchor?: string,
): {
  entry: QualifiedCorpusEntry;
  document: TextAuthoringDocument;
} {
  const entry = qualifiedEntry(bundleId);
  const rawText = buildQualifiedMarkdown(entry);
  const document = createTextAuthoringDocument(
    anchor ? withCanonicalAnchor(rawText, anchor) : rawText,
    {
      documentId: `fixture-${bundleId}`,
      fixtureVersion: qualifiedCorpus.schemaVersion,
      ownership: 'creator',
      title: entry.bundle.title,
      sourceTitle: entry.bundle.title,
      sourceUrl: entry.bundle.sourceUrls[0],
      now: NOW,
    },
  );
  return { entry, document };
}

function buildInputComposerTable(
  fixture: InputComposerCase,
  kind: 'curriculum' | 'resource_queue',
): string {
  const headers = kind === 'curriculum'
    ? ['순서', '실행 항목', '진도 정보', '완료 상태', '출처']
    : ['순서', '작품', '재생 정보', '완료 상태', '자료'];
  const rows = fixture.canonical.items.map((item, index) => [
    String(index + 1),
    item.title,
    item.detail.summary,
    item.completion.doneWhen,
    item.provenance.sourceUrl,
  ].join('\t'));
  return [headers.join('\t'), ...rows].join('\n');
}

function createInputComposerDocument(
  caseId: string,
  kind: 'curriculum' | 'resource_queue',
): {
  fixture: InputComposerCase;
  document: TextAuthoringDocument;
} {
  const fixture = inputComposerCase(caseId);
  const document = createTextAuthoringDocument(
    buildInputComposerTable(fixture, kind),
    {
      documentId: `fixture-${caseId}`,
      fixtureVersion: 'input-composer-scenarios-v1',
      ownership: 'creator',
      title: fixture.canonical.title,
      sourceTitle: fixture.source.title,
      sourceUrl: fixture.source.url,
      now: NOW,
    },
  );
  return { fixture, document };
}

function expectedQualifiedDetail(
  entry: QualifiedCorpusEntry,
  item: QualifiedItem,
): string {
  const sourceRows = qualifiedSourceRowsById(entry);
  return item.sourceRowIds.map((sourceRowId) => {
    const row = sourceRows.get(sourceRowId);
    assert.ok(row, `${entry.bundleId}: unresolved source row ${sourceRowId}`);
    return row.detail;
  }).join(' · ');
}

function itemProperty(
  item: CanonicalAuthoringItem,
  label: string,
): string | undefined {
  return item.properties.find((property) => property.label === label)?.value;
}

function assertValid(document: TextAuthoringDocument, fixtureId: string): void {
  const validation = validateTextAuthoringDocument(document);
  assert.equal(
    validation.valid,
    true,
    `${fixtureId}: ${validation.issues.map((issue) => issue.code).join(', ')}`,
  );
}

function assertCaseSaveExportEvidence({
  fixtureId,
  document,
  projection,
  artifact,
}: {
  fixtureId: string;
  document: TextAuthoringDocument;
  projection: AuthoringArtifactProjection;
  artifact: AuthoringArtifactKind;
}): void {
  const rows = projection.artifacts[artifact].rows;
  const preflight = buildArtifactPreflight(projection, {
    artifact,
    scope: 'whole',
  });
  assert.equal(preflight.eligible, true, `${fixtureId}: export eligibility`);
  assert.equal(preflight.count, rows.length, `${fixtureId}: preflight rows`);

  const storage = createMemoryTextAuthoringStorage();
  const repository = createTextAuthoringDraftRepository(storage, {
    now: () => NOW,
    idFactory: (prefix) => `${prefix}-${fixtureId}`,
  });
  repository.save(document, {
    draftId: document.documentId,
    activeStage: 'result',
    primaryArtifact: artifact,
  });
  const loaded = repository.load(document.documentId)?.document;
  assert.ok(loaded, `${fixtureId}: saved draft`);
  assert.deepEqual(
    loaded,
    JSON.parse(JSON.stringify(document)),
    `${fixtureId}: storage round-trip`,
  );

  const saveReceipt = createSaveReceipt(document, projection, {
    draftId: document.documentId,
    receiptId: `save-${fixtureId}`,
    savedAt: NOW,
  });
  assert.equal(
    saveReceipt.itemCount,
    projection.counts.included,
    `${fixtureId}: save receipt count`,
  );
  assert.equal(saveReceipt.sourcePreserved, true, `${fixtureId}: saved source`);

  const format = artifact === 'calendar'
    ? 'ics'
    : artifact === 'sheet'
      ? 'csv'
      : 'plain_text';
  assert.ok(
    preflight.formats.includes(format),
    `${fixtureId}: ${artifact} supports ${format}`,
  );
  if (format === 'ics') {
    const serialized = serializeAuthoringIcs(projection.title, rows, NOW);
    assert.equal(
      serialized.match(/^BEGIN:VEVENT$/gmu)?.length ?? 0,
      rows.length,
      `${fixtureId}: ICS rows`,
    );
  } else if (format === 'csv') {
    assert.equal(
      buildAuthoringTableRows(rows).length,
      rows.length,
      `${fixtureId}: table export rows`,
    );
  } else {
    const serialized = serializeAuthoringPlainText(projection.title, rows);
    assert.equal(
      serialized.match(/^항목 \d+:/gmu)?.length ?? 0,
      rows.length,
      `${fixtureId}: plain-text rows`,
    );
  }

  const exportReceipt = createExportReceipt(preflight, {
    format,
    document,
    receiptId: `export-${fixtureId}`,
    exportedAt: NOW,
  });
  assert.equal(
    assertPreflightReceiptParity(preflight, exportReceipt),
    true,
    `${fixtureId}: export receipt parity`,
  );
  assert.equal(exportReceipt.count, rows.length, `${fixtureId}: export count`);
  assert.equal(exportReceipt.sourcePreserved, true, `${fixtureId}: exported source`);
}

function expectedDate(anchor: string, dayOffset: number): string {
  const date = new Date(`${anchor}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function explicitRelativeOffsets(rawText: string): number[] {
  return rawText
    .split(/\r?\n/u)
    .filter((line) => /^\s*-\s+/u.test(line))
    .map((line) => {
      const match = /D\s*(?:(-|\+)\s*(\d+)|-?\s*DAY)\s*$/iu.exec(line);
      assert.ok(match, `relative source action is missing its offset: ${line}`);
      if (!match[2]) return 0;
      return match[1] === '-' ? -Number(match[2]) : Number(match[2]);
    });
}

function buildRelativePropertyMarkdown(rawText: string): string {
  return rawText
    .split(/\r?\n/u)
    .flatMap((line) => {
      const match = /^(\s*-\s+(?:\[[ xX]\]\s+)?)(.*?)(D\s*(?:(?:-|\+)\s*\d+|-?\s*DAY))\s*$/iu
        .exec(line);
      if (!match) return [line];
      return [
        `${match[1]}${match[2].trimEnd()}`,
        `  상대 날짜: ${match[3].replace(/\s+/gu, '')}`,
      ];
    })
    .join('\n');
}

test('TA-06 1/8 moving keeps all 27 exact Items, six Steps, source detail, and relative-date lineage', () => {
  const { entry, document } = createQualifiedDocument('bundle-moving-d30');
  const expectedSteps = flattenedQualifiedSteps(entry);
  const expectedItems = flattenedQualifiedItems(entry);
  const canonical = document.parseResult.canonical;

  assert.deepEqual(
    canonical.steps.map((step) => step.title),
    expectedSteps.map((step) => step.title),
  );
  assert.deepEqual(
    canonical.items.map((item) => item.title),
    expectedItems.map((item) => item.itemTitle),
  );
  assert.equal(canonical.steps.length, 6);
  assert.equal(canonical.items.length, 27);
  canonical.items.forEach((item, index) => {
    const sourceItem = expectedItems[index];
    const sourceSchedule = sourceItem.schedule;
    assert.equal(sourceSchedule?.type, 'relative_to_target');
    assert.equal(item.schedule?.kind, 'relative');
    assert.equal(
      item.schedule?.kind === 'relative' ? item.schedule.dayOffset : undefined,
      sourceSchedule?.type === 'relative_to_target'
        ? sourceSchedule.offsetDays
        : undefined,
      sourceItem.itemId,
    );
    assert.equal(item.schedule?.anchorLabel, '이사일');
    assert.equal(item.sourceDetail, expectedQualifiedDetail(entry, sourceItem));
    assert.ok(item.sourceRowIds.length >= 3, `${sourceItem.itemId}: lineage`);
    assert.equal(item.sources[0]?.url, entry.bundle.sourceUrls[0]);
  });

  const withoutAnchor = buildAuthoringArtifactProjection(document);
  assert.equal(withoutAnchor.artifacts.todo.count, 27);
  assert.equal(withoutAnchor.artifacts.calendar.count, 0);
  const anchor = '2026-08-31';
  const { document: anchoredDocument } = createQualifiedDocument(
    'bundle-moving-d30',
    anchor,
  );
  const anchored = buildAuthoringArtifactProjection(anchoredDocument);
  assert.equal(anchored.artifacts.calendar.count, 27);
  anchored.artifacts.calendar.rows.forEach((row, index) => {
    const schedule = expectedItems[index].schedule;
    assert.equal(schedule?.type, 'relative_to_target');
    assert.equal(
      row.date,
      expectedDate(
        anchor,
        schedule?.type === 'relative_to_target' ? schedule.offsetDays : 0,
      ),
    );
  });
  assertCaseSaveExportEvidence({
    fixtureId: entry.bundleId,
    document: anchoredDocument,
    projection: anchored,
    artifact: 'calendar',
  });
  assertValid(document, entry.bundleId);
});

test('TA-06 2/8 vehicle uses the exact official D-14, D-10, D-3, and D-Day checklist offsets', () => {
  const sourceBundle = realContentPilotBundles.find((bundle) => (
    bundle.flow.id === 'flow-vehicle-inspection-prep'
  ));
  assert.ok(sourceBundle);
  assert.ok(sourceBundle.flow.raw_text);
  const rawText = buildRelativePropertyMarkdown(sourceBundle.flow.raw_text);
  const documentOptions = {
    fixtureVersion: 'real-content-pilot-2026-07-12',
    ownership: 'creator' as const,
    title: sourceBundle.flow.title,
    sourceTitle: sourceBundle.flow.source_title,
    sourceUrl: sourceBundle.flow.source_url,
    now: NOW,
  };
  const document = createTextAuthoringDocument(rawText, {
    ...documentOptions,
    documentId: 'fixture-flow-vehicle-inspection-prep',
  });
  const canonical = document.parseResult.canonical;
  const sourceOffsets = explicitRelativeOffsets(sourceBundle.flow.raw_text);

  assert.deepEqual(
    canonical.items.map((item) => item.title),
    sourceBundle.items.map((item) => item.title),
  );
  assert.equal(canonical.items.length, 10);
  assert.deepEqual(
    canonical.items.map((item) => (
      item.schedule?.kind === 'relative' ? item.schedule.dayOffset : undefined
    )),
    sourceOffsets,
  );
  assert.deepEqual([...new Set(sourceOffsets)], [-14, -10, -3, 0]);
  assert.ok(canonical.items.every((item) => item.role === 'item' && item.included));
  assert.ok(canonical.items.every((item) => (
    item.sources[0]?.url === sourceBundle.flow.source_url
  )));

  const withoutAnchor = buildAuthoringArtifactProjection(document);
  assert.equal(withoutAnchor.artifacts.todo.count, 10);
  assert.equal(withoutAnchor.artifacts.calendar.count, 0);
  const anchor = '2026-08-15';
  const anchoredDocument = createTextAuthoringDocument(
    withCanonicalAnchor(rawText, anchor),
    {
      ...documentOptions,
      documentId: 'fixture-flow-vehicle-inspection-prep-anchored',
    },
  );
  const anchored = buildAuthoringArtifactProjection(anchoredDocument);
  assert.equal(anchored.artifacts.calendar.count, 10);
  assert.deepEqual(
    anchored.artifacts.calendar.rows.map((row) => row.date),
    sourceOffsets.map((offset) => expectedDate(anchor, offset)),
  );
  assertCaseSaveExportEvidence({
    fixtureId: sourceBundle.flow.id,
    document: anchoredDocument,
    projection: anchored,
    artifact: 'calendar',
  });
  assertValid(document, sourceBundle.flow.id);
});

test('TA-06 3/8 Allblanc preserves seven exact video titles and URLs without invented movements', () => {
  const { entry, document } = createQualifiedDocument(
    'bundle-allblanc-7day-abs',
  );
  const expectedItems = flattenedQualifiedItems(entry);
  const sourceRows = qualifiedSourceRowsById(entry);
  const canonical = document.parseResult.canonical;

  assert.equal(canonical.steps.length, 7);
  assert.equal(canonical.items.length, 7);
  assert.deepEqual(
    canonical.items.map((item) => item.title),
    expectedItems.map((item) => item.itemTitle),
  );
  assert.deepEqual(
    canonical.items.map((item) => item.resources[0]?.url),
    expectedItems.map((item) => (
      sourceRows.get(item.sourceRowIds[0])?.sourceUrl
    )),
  );
  canonical.items.forEach((item, index) => {
    const sourceItem = expectedItems[index];
    assert.equal(item.resources.length, 1);
    assert.equal(item.guides.length, 0);
    assert.equal(item.cautions.length, 0);
    assert.equal(item.sourceDetail, expectedQualifiedDetail(entry, sourceItem));
    assert.equal(item.schedule?.kind, 'relative');
    assert.equal(
      item.schedule?.kind === 'relative' ? item.schedule.dayOffset : undefined,
      index,
    );
  });
  const { document: anchoredDocument } = createQualifiedDocument(
    'bundle-allblanc-7day-abs',
    '2026-08-03',
  );
  const anchored = buildAuthoringArtifactProjection(anchoredDocument);
  assert.equal(anchored.artifacts.calendar.count, 7);
  assert.deepEqual(
    anchored.artifacts.calendar.rows.map((row) => row.date),
    Array.from({ length: 7 }, (_, index) => (
      expectedDate('2026-08-03', index)
    )),
  );
  assertCaseSaveExportEvidence({
    fixtureId: entry.bundleId,
    document: anchoredDocument,
    projection: anchored,
    artifact: 'calendar',
  });
  assertValid(document, entry.bundleId);
});

test('TA-06 4/8 K-MOOC keeps all 14 exact curriculum rows and source-owned progress semantics in a Sheet', () => {
  const { fixture, document } = createInputComposerDocument(
    'IC-C02-KMOOC',
    'curriculum',
  );
  const canonical = document.parseResult.canonical;

  assert.equal(fixture.source.completeness, 'complete');
  assert.deepEqual(fixture.source.missingRows, []);
  assert.equal(fixture.canonical.items.length, 14);
  assert.ok(fixture.canonical.items.every((item) => item.intent === 'record'));
  assert.ok(fixture.canonical.items.every((item) => (
    item.completion.mode === 'record'
  )));
  assert.deepEqual(
    canonical.items.map((item) => item.title),
    fixture.canonical.items.map((item) => item.title),
  );
  canonical.items.forEach((item, index) => {
    const sourceItem = fixture.canonical.items[index];
    assert.equal(itemProperty(item, '진도 정보'), sourceItem.detail.summary);
    assert.equal(itemProperty(item, '완료 상태'), sourceItem.completion.doneWhen);
    assert.equal(itemProperty(item, '출처'), fixture.source.url);
    assert.equal(item.sources[0]?.url, fixture.source.url);
    assert.equal(item.schedule, undefined);
  });
  const projection = buildAuthoringArtifactProjection(document);
  assert.equal(projection.primaryArtifact, 'sheet');
  assert.equal(projection.artifacts.sheet.count, 14);
  assert.equal(projection.artifacts.calendar.count, 0);
  assertCaseSaveExportEvidence({
    fixtureId: fixture.caseId,
    document,
    projection,
    artifact: 'sheet',
  });
  assertValid(document, fixture.caseId);
});

test('TA-06 5/8 LibriVox keeps all 38 exact edition rows, durations, and resource URLs without dates', () => {
  const { fixture, document } = createInputComposerDocument(
    'IC-C03-LIBRIVOX',
    'resource_queue',
  );
  const canonical = document.parseResult.canonical;

  assert.equal(fixture.source.completeness, 'complete');
  assert.deepEqual(fixture.source.missingRows, []);
  assert.equal(fixture.canonical.items.length, 38);
  assert.ok(fixture.canonical.items.every((item) => item.intent === 'consume'));
  assert.deepEqual(
    canonical.items.map((item) => item.title),
    fixture.canonical.items.map((item) => item.title),
  );
  canonical.items.forEach((item, index) => {
    const sourceItem = fixture.canonical.items[index];
    assert.equal(itemProperty(item, '재생 정보'), sourceItem.detail.summary);
    assert.equal(itemProperty(item, '완료 상태'), sourceItem.completion.doneWhen);
    assert.equal(itemProperty(item, '자료'), fixture.source.url);
    assert.equal(item.sources[0]?.url, fixture.source.url);
    assert.equal(item.schedule, undefined);
  });
  assert.equal(canonical.items[0].title, '1. Mrs. Rachel Lynde Is Surprised');
  assert.equal(canonical.items.at(-1)?.title, '38. The Bend in the Road');
  const projection = buildAuthoringArtifactProjection(document);
  assert.equal(projection.primaryArtifact, 'sheet');
  assert.equal(projection.artifacts.sheet.count, 38);
  assert.equal(projection.artifacts.calendar.count, 0);
  assertCaseSaveExportEvidence({
    fixtureId: fixture.caseId,
    document,
    projection,
    artifact: 'sheet',
  });
  assertValid(document, fixture.caseId);
});

test('TA-06 6/8 new-car keeps 14 exact actions while decision, check, and record context stay distinct', () => {
  const { entry, document } = createQualifiedDocument(
    'bundle-new-car-comparison',
  );
  const expectedItems = flattenedQualifiedItems(entry);
  const canonical = document.parseResult.canonical;
  const sourceRows = qualifiedSourceRowsById(entry);

  assert.equal(canonical.steps.length, 8);
  assert.equal(canonical.items.length, 14);
  assert.deepEqual(
    canonical.steps.map((step) => step.title),
    flattenedQualifiedSteps(entry).map((step) => step.title),
  );
  assert.deepEqual(
    canonical.items.map((item) => item.title),
    expectedItems.map((item) => item.itemTitle),
  );
  canonical.items.forEach((item, index) => {
    assert.equal(item.sourceDetail, expectedQualifiedDetail(entry, expectedItems[index]));
    assert.equal(item.schedule, undefined);
  });

  assert.deepEqual(
    canonical.items
      .filter((item) => item.intent === 'decide')
      .map((item) => item.title),
    [
      '현금·할부·리스·장기렌트 비교하기',
      '여러 판매처 견적 비교하기',
      '자동차보험 조건 비교하고 가입하기',
    ],
  );
  assert.deepEqual(
    canonical.items
      .filter((item) => item.intent === 'inspect')
      .map((item) => item.title),
    [
      '계약서 차량 사양과 금액 확인하기',
      '차대번호와 출고 정보 확인하기',
      '등록 서류와 비용 확인하기',
      '초기 점검과 소모품 일정 확인하기',
    ],
  );

  const recordSourceRow = entry.sourceRows.find((row) => (
    row.label === '현금 지원·용품 등 서비스 조건 기록'
  ));
  assert.ok(recordSourceRow);
  const recordOwner = expectedItems.find((item) => (
    item.sourceRowIds.includes(recordSourceRow.sourceRowId)
  ));
  assert.ok(recordOwner);
  const authoredRecordOwner = canonical.items.find((item) => (
    item.title === recordOwner.itemTitle
  ));
  assert.ok(authoredRecordOwner?.sourceDetail?.includes(recordSourceRow.detail));
  assert.equal(
    canonical.items.some((item) => item.title === recordSourceRow.label),
    false,
    'record context stays source detail instead of becoming an invented 15th Item',
  );
  assert.ok(
    canonical.items
      .flatMap((item) => item.sourceRowIds)
      .every((sourceRowId) => document.parseResult.canonical.sourceRows.some(
        (row) => row.sourceRowId === sourceRowId,
      )),
  );
  assert.ok([...sourceRows.values()].every((row) => (
    buildQualifiedMarkdown(entry).includes(row.detail)
  )));

  const projection = buildAuthoringArtifactProjection(document);
  assert.equal(projection.primaryArtifact, 'todo');
  assert.equal(projection.artifacts.todo.count, 14);
  assert.equal(projection.artifacts.sheet.count, 14);
  assert.equal(projection.artifacts.calendar.count, 0);
  assertCaseSaveExportEvidence({
    fixtureId: entry.bundleId,
    document,
    projection,
    artifact: 'todo',
  });
  assertValid(document, entry.bundleId);
});

test('TA-06 7/8 official travel safety keeps source, guidance detail, completion, and caution separate without invented advice', () => {
  const sourceBundle = contentsBatch260601OfficialBundles.find((bundle) => (
    bundle.flow.id === 'official-260601-overseas-safety'
  ));
  assert.ok(sourceBundle);
  assert.ok(sourceBundle.flow.raw_text);
  const document = createTextAuthoringDocument(sourceBundle.flow.raw_text, {
    documentId: 'fixture-official-260601-overseas-safety',
    fixtureVersion: 'official-runtime-source-2026-07-11',
    ownership: 'creator',
    title: sourceBundle.flow.title,
    sourceTitle: sourceBundle.flow.source_title,
    sourceUrl: sourceBundle.flow.source_url,
    now: NOW,
  });
  const canonical = document.parseResult.canonical;
  const exactCaution = sourceBundle.flow.raw_text
    .split(/\r?\n/u)
    .find((line) => line.trim().startsWith('caution:'))
    ?.trim()
    .replace(/^caution:\s*/u, '');
  assert.ok(exactCaution);

  assert.deepEqual(
    canonical.items.map((item) => item.title),
    sourceBundle.items.map((item) => item.title),
  );
  assert.equal(canonical.items.length, 4);
  assert.deepEqual(
    canonical.items.flatMap((item) => item.cautions),
    [exactCaution],
  );
  assert.ok(canonical.items.every((item) => (
    item.sources.length === 1
    && item.sources[0].type === 'official'
    && item.sources[0].url === sourceBundle.flow.source_url
  )));
  assert.ok(document.parseResult.mappings.some((mapping) => (
    mapping.targetKind === 'caution'
  )));
  assert.ok(document.parseResult.mappings.some((mapping) => (
    mapping.targetKind === 'detail'
  )));
  assert.ok(document.parseResult.mappings.some((mapping) => (
    mapping.targetKind === 'completion'
  )));
  assert.ok(document.parseResult.mappings.some((mapping) => (
    mapping.targetKind === 'resource'
  )));
  assert.ok(canonical.sourceRows.every((row) => (
    sourceBundle.flow.raw_text?.includes(row.rawText)
  )));
  assert.equal(
    canonical.items.some((item) => item.title.includes(exactCaution)),
    false,
  );
  const projection = buildAuthoringArtifactProjection(document);
  assert.equal(projection.artifacts.todo.count, 4);
  assertCaseSaveExportEvidence({
    fixtureId: sourceBundle.flow.id,
    document,
    projection,
    artifact: 'todo',
  });
  assertValid(document, sourceBundle.flow.id);
});

test('TA-06 8/8 Jeju keeps raw fragments through reversible correction and storage round-trip', () => {
  const rawText =
    '8월 제주 여행 준비. 항공권 확인, 숙소 예약번호 정리, 렌터카 예약, 준비물 체크, 출발 전날 온라인 체크인';
  const initial = createTextAuthoringDocument(rawText, {
    documentId: 'fixture-P26-MEMO-SEGMENTATION-JEJU',
    fixtureVersion: 'deterministic-personal-memo-fixture-v1',
    ownership: 'personal',
    title: '제주 여행 준비',
    sourceTitle: '개인 여행 메모',
    now: NOW,
  });
  const originalCanonical = structuredClone(initial.parseResult.canonical);
  const originalSourceRows = structuredClone(
    initial.parseResult.canonical.sourceRows,
  );
  const [first, second] = initial.parseResult.canonical.items;

  assert.equal(initial.rawText, rawText);
  assert.equal(initial.parseResult.canonical.flow.title, '제주 여행 준비');
  assert.equal(
    initial.parseResult.canonical.sourceRows[0]?.rawText,
    '8월 제주 여행 준비.',
  );
  assert.deepEqual(
    initial.parseResult.canonical.items.map((item) => item.title),
    [
      '항공권 확인',
      '숙소 예약번호 정리',
      '렌터카 예약',
      '준비물 체크',
      '출발 전날 온라인 체크인',
    ],
  );
  assert.equal(initial.parseResult.canonical.sourceRows.length, 6);
  assert.ok(initial.parseResult.canonical.items.every((item) => (
    item.sourceRowIds.length === 1 && item.schedule === undefined
  )));

  const merged = applyAuthoringOperation(initial, {
    type: 'merge',
    itemIds: [first.itemId, second.itemId],
  });
  assert.equal(merged.parseResult.canonical.items.length, 4);
  assert.deepEqual(
    new Set(merged.parseResult.canonical.items[0].sourceRowIds),
    new Set([...first.sourceRowIds, ...second.sourceRowIds]),
  );
  const mergeUndone = applyAuthoringOperation(merged, { type: 'undo' });
  assert.deepEqual(mergeUndone.parseResult.canonical, originalCanonical);

  const split = applyAuthoringOperation(
    mergeUndone,
    { type: 'split', itemId: first.itemId, at: 3 },
  );
  assert.equal(split.parseResult.canonical.items.length, 6);
  assert.deepEqual(
    split.parseResult.canonical.items[0].sourceRowIds,
    split.parseResult.canonical.items[1].sourceRowIds,
  );
  const splitUndone = applyAuthoringOperation(split, { type: 'undo' });
  assert.deepEqual(splitUndone.parseResult.canonical, originalCanonical);

  const renamed = applyAuthoringOperation(splitUndone, {
    type: 'rename',
    itemId: first.itemId,
    title: '항공권 최종 확인하기',
  });
  const excluded = applyAuthoringOperation(renamed, {
    type: 'exclude',
    itemId: second.itemId,
  });
  const lastItemId = excluded.parseResult.canonical.items.at(-1)?.itemId;
  assert.ok(lastItemId);
  const reordered = applyAuthoringOperation(excluded, {
    type: 'reorder',
    itemId: lastItemId,
    toIndex: 3,
  });

  const storage = createMemoryTextAuthoringStorage();
  const repository = createTextAuthoringDraftRepository(storage, {
    now: () => '2026-07-29T01:00:00.000Z',
    idFactory: (prefix) => `${prefix}-ta06`,
  });
  repository.save(reordered, {
    draftId: reordered.documentId,
    activeStage: 'result',
    primaryArtifact: 'todo',
  });
  const loaded = repository.load(reordered.documentId)?.document;
  assert.ok(loaded);
  assert.deepEqual(loaded, JSON.parse(JSON.stringify(reordered)));
  assert.equal(loaded.rawText, rawText);
  assert.deepEqual(loaded.parseResult.canonical.sourceRows, originalSourceRows);
  assert.equal(
    loaded.parseResult.canonical.items.find((item) => item.itemId === first.itemId)
      ?.sourceTitle,
    '항공권 확인',
  );
  assert.equal(
    loaded.parseResult.canonical.items.find((item) => item.itemId === second.itemId)
      ?.included,
    false,
  );

  const reorderUndone = applyAuthoringOperation(loaded, { type: 'undo' });
  assert.equal(
    reorderUndone.parseResult.canonical.items.at(-1)?.itemId,
    lastItemId,
  );
  assert.equal(reorderUndone.rawText, rawText);
  assert.deepEqual(
    reorderUndone.parseResult.canonical.sourceRows,
    originalSourceRows,
  );
  assertCaseSaveExportEvidence({
    fixtureId: 'P26-MEMO-SEGMENTATION-JEJU',
    document: reordered,
    projection: buildAuthoringArtifactProjection(reordered),
    artifact: 'todo',
  });
  assertValid(reorderUndone, 'P26-MEMO-SEGMENTATION-JEJU');
});
