import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const fixturePath = path.join(
  root,
  'docs',
  'specs',
  '2026-07-11-canonical-flow-data-model',
  'golden-fixtures-v1.json',
);
const outDir = path.join(
  root,
  'docs',
  'specs',
  '2026-07-14-url-to-flow-prompt-lab',
);

const fixtureSource = fs.readFileSync(fixturePath, 'utf8');
const fixtures = JSON.parse(fixtureSource);
const sourceFixtureSha256 = createHash('sha256').update(fixtureSource).digest('hex');

const negativeInputs = {
  'gf-neg-01-missing-source-rows': {
    userJob:
      '원본 학습 파일의 행을 실행 가능한 진도표로 옮겨 상태와 메모를 관리한다.',
    claimedScope:
      '원본 파일 전체를 변환하려 하지만 파일 본문과 source row는 아직 확보되지 않았다.',
    source: {
      primary: {
        sourceId: 'source-computer-skills-pdf-unavailable',
        title: '컴퓨터 활용 학습 PDF 후보',
        sourceType: 'file',
        originalUrl: null,
        canonicalUrl: null,
        locale: 'ko-KR',
        countryContext: 'KR',
        publisher: null,
        checkedAt: '2026-07-11',
        rightsStatus: 'needs_review',
        riskLevel: 'low',
        accessStatus: 'unavailable',
        inspectionSummary:
          '파일 후보는 있으나 본문, 목차, 주차, 과제 행을 읽지 못했다.',
      },
      supporting: [],
    },
    sourceRows: [],
    inputEvidenceRefs: [
      'golden-fixtures-v1.json#gf-neg-01-missing-source-rows',
    ],
  },
  'gf-neg-02-nonlocal-sensitive-source': {
    userJob:
      '한국에서 출산을 준비하며 병원 입원 가방에 필요한 물품을 빠뜨리지 않고 챙긴다.',
    claimedScope:
      '번역된 출산 가방 체크리스트 전체를 한국 사용자용 체크리스트로 검토한다.',
    source: {
      primary: {
        sourceId: 'source-stemcyte-hospital-bag',
        title: 'StemCyte 출산 가방 55개',
        sourceType: 'commercial_guide',
        originalUrl: 'https://stemcyte.com/ko/hospital-bag-checklist/',
        canonicalUrl: 'https://stemcyte.com/ko/hospital-bag-checklist/',
        locale: 'ko-KR',
        countryContext: 'US',
        publisher: 'StemCyte',
        checkedAt: '2026-07-11',
        rightsStatus: 'needs_review',
        riskLevel: 'medical_sensitive',
        accessStatus: 'partial',
        inspectionSummary:
          '산모, 아기, 동반자, 서류 등 55개 물품과 병원 제공품을 다루며 미국 병원, 보험, 제대혈 판매 맥락이 섞여 있다.',
      },
      supporting: [],
    },
    sourceRows: [],
    inputEvidenceRefs: [
      'golden-fixtures-v1.json#gf-neg-02-nonlocal-sensitive-source',
      'docs/content-audit/2026-07-11-content-portfolio-expansion-round2-v1.json#R2-SC-031',
    ],
  },
};

function cleanSource(source, accessStatus = 'fetched') {
  return {
    sourceId: source.sourceId,
    title: source.title,
    sourceType: source.sourceType,
    originalUrl: source.originalUrl ?? null,
    canonicalUrl: source.canonicalUrl ?? null,
    locale: source.locale,
    countryContext: source.locale === 'ko-KR' ? 'KR' : null,
    publisher: source.publisher ?? null,
    checkedAt: source.checkedAt,
    rightsStatus: source.rightsStatus,
    riskLevel: source.riskLevel,
    accessStatus,
  };
}

function positiveInput(fixture, index) {
  const { content } = fixture;
  const flow = content.flows[0];
  const caseId = `case-${String(index + 1).padStart(2, '0')}`;
  const primary = content.sources.find(
    (source) => source.sourceId === flow.primarySourceId,
  );
  const supporting = content.sources.filter((source) =>
    flow.supportingSourceIds.includes(source.sourceId),
  );

  return {
    caseId,
    requestId: `prompt-lab-v1-case-${String(index + 1).padStart(2, '0')}`,
    targetLocale: 'ko-KR',
    userJob: flow.userNeed,
    maxItems: 7,
    claimedScope: `제공된 ${content.sourceRows.length}개 SourceRow 범위만 변환한다.`,
    source: {
      primary: cleanSource(primary),
      supporting: supporting.map((source) => cleanSource(source)),
    },
    sourceRows: content.sourceRows.map((row) => ({
      sourceRowId: row.sourceRowId,
      sourceId: row.sourceId,
      rowType: row.rowType,
      title: row.title,
      detail: row.detail ?? null,
      order: row.order,
    })),
    inputEvidenceRefs: [`prompt-lab-source:${caseId}`],
  };
}

function negativeInput(fixture, index) {
  const override = negativeInputs[fixture.fixtureId];
  if (!override) {
    throw new Error(`Missing negative input override for ${fixture.fixtureId}`);
  }
  const caseId = `case-${String(index + 1).padStart(2, '0')}`;
  return {
    caseId,
    requestId: `prompt-lab-v1-case-${String(index + 1).padStart(2, '0')}`,
    targetLocale: 'ko-KR',
    maxItems: 7,
    ...override,
    inputEvidenceRefs: [`prompt-lab-source:${caseId}`],
  };
}

function sourceRowsForItem(content, item) {
  const refs = content.sourceRefs.filter(
    (ref) =>
      ref.entityType === 'item' &&
      ref.entityId === item.itemId &&
      item.sourceRefIds.includes(ref.sourceRefId),
  );
  return [...new Set(refs.flatMap((ref) => ref.sourceRowIds))];
}

function positiveExpected(fixture, input) {
  const { content } = fixture;
  const flow = content.flows[0];
  const omittedRows = (fixture.review.omittedRows ?? []).map((row) => ({
    sourceRowId: row.sourceRowId,
    reason: row.reason,
  }));

  return {
    caseId: input.caseId,
    fixtureId: fixture.fixtureId,
    fixtureKind: fixture.kind,
    fixtureShape: fixture.shape,
    name: fixture.name,
    expectedStatus: {
      generationState: 'proposal',
      outcome: 'complete',
      readiness: null,
      errorCode: null,
      recommendedDisposition: 'review',
    },
    expectedConversion: {
      userNeed: flow.userNeed,
      planningPattern: flow.planningPattern,
      primaryArtifact: flow.primaryArtifact,
      riskLevel: flow.riskLevel,
    },
    expectedItems: content.items.map((item) => ({
      referenceItemId: item.itemId,
      title: item.title,
      intent: item.intent,
      sourceRowIds: sourceRowsForItem(content, item),
      completionMode: item.completion.mode,
      doneWhen: item.completion.doneWhen,
      hasSchedule: Boolean(item.schedule),
      canonicalSchedule: item.schedule ?? null,
    })),
    expectedOmittedRows: omittedRows,
    accountingSourceRowIds: content.sourceRows.map((row) => row.sourceRowId),
    expectedProjections: fixture.projectionExpectations.expected,
    forbiddenProjections: fixture.projectionExpectations.forbidden,
    referenceReview: {
      readiness: fixture.review.readiness,
      hardFails: fixture.review.hardFails,
      rightsDecision: fixture.review.rightsDecision,
      riskDecision: fixture.review.riskDecision,
    },
  };
}

function negativeExpected(fixture, input) {
  const missingRows = fixture.shape === 'missing_source_rows';
  return {
    caseId: input.caseId,
    fixtureId: fixture.fixtureId,
    fixtureKind: fixture.kind,
    fixtureShape: fixture.shape,
    name: fixture.name,
    expectedStatus: {
      generationState: 'failed',
      outcome: 'no_proposal',
      readiness: null,
      errorCode: missingRows
        ? 'missing_source_rows'
        : 'locale_applicability_unverified',
      recommendedDisposition: missingRows ? 'source_import_required' : 'hold',
    },
    expectedConversion: null,
    expectedItems: [],
    expectedOmittedRows: [],
    accountingSourceRowIds: [],
    expectedProjections: [],
    forbiddenProjections: fixture.projectionExpectations.forbidden,
    referenceReview: {
      readiness: fixture.review.readiness,
      hardFails: fixture.review.hardFails,
      rightsDecision: fixture.review.rightsDecision,
      riskDecision: fixture.review.riskDecision,
    },
  };
}

const cases = fixtures.fixtures.map((fixture, index) =>
  fixture.kind === 'positive'
    ? positiveInput(fixture, index)
    : negativeInput(fixture, index),
);

const expected = fixtures.fixtures.map((fixture, index) =>
  fixture.kind === 'positive'
    ? positiveExpected(fixture, cases[index])
    : negativeExpected(fixture, cases[index]),
);

const caseDocument = {
  caseSetVersion: 'flowme-url-to-flow-prompt-lab-cases-v1.1',
  fixtureSchemaVersion: fixtures.fixtureSchemaVersion,
  canonicalSchemaVersion: fixtures.canonicalSchemaVersion,
  sourceFixtureSha256,
  generatedFrom: path.relative(root, fixturePath).replaceAll('\\', '/'),
  generator: 'scripts/content-audit/build-url-to-flow-prompt-lab-cases.mjs',
  generatorDisclosure:
    'Inputs contain source metadata, SourceRows, userJob, and neutral case-local evidence references only. Canonical fixture IDs, shape labels, expected Items, dispositions, and projections are excluded. Negative inputs add acquisition/locale evidence because canonical negative fixtures intentionally have content=null.',
  cases,
};

const expectedDocument = {
  expectationSetVersion: 'flowme-url-to-flow-prompt-lab-expected-v1.1',
  caseSetVersion: caseDocument.caseSetVersion,
  sourceFixtureSha256,
  generatedFrom: path.relative(root, fixturePath).replaceAll('\\', '/'),
  hiddenFromGenerator: true,
  expectations: expected,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'cases-v1.json'),
  `${JSON.stringify(caseDocument, null, 2)}\n`,
  'utf8',
);
fs.writeFileSync(
  path.join(outDir, 'expected-v1.json'),
  `${JSON.stringify(expectedDocument, null, 2)}\n`,
  'utf8',
);

console.log(`Wrote ${cases.length} source-only cases.`);
console.log(
  `Positive: ${fixtures.fixtures.filter((fixture) => fixture.kind === 'positive').length}`,
);
console.log(
  `Negative: ${fixtures.fixtures.filter((fixture) => fixture.kind === 'negative').length}`,
);
