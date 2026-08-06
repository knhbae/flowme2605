import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import {
  AUTHORING_ARTIFACT_FORMATS,
  buildAuthoringArtifactProjection,
  type AuthoringArtifactProjection,
  type AuthoringArtifactRow,
} from '../../lib/flow/text-authoring/artifact-projection';
import {
  AUTHORING_TABLE_COLUMNS,
  buildAuthoringTableRows,
  serializeAuthoringMarkdown,
  serializeAuthoringPlainText,
} from '../../lib/flow/text-authoring/file-export';
import {
  checkMarkdownRoundTrip,
  exportTextAuthoringMarkdown,
} from '../../lib/flow/text-authoring/markdown-roundtrip';
import { applyAuthoringOperation } from '../../lib/flow/text-authoring/operations';
import { createTextAuthoringDocument } from '../../lib/flow/text-authoring/parser';
import type {
  CanonicalAuthoringItem,
  TextAuthoringDocument,
} from '../../lib/flow/text-authoring/types';

const REPO_ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const MATRIX_PATH = resolve(
  REPO_ROOT,
  'docs/content-audit/2026-08-04-flowme-text-authoring-grammar-ux-improvement-handoff/simulation-matrix-v2.json',
);
const RESULT_DIRECTORY = resolve(
  REPO_ROOT,
  'docs/content-audit/2026-08-04-flowme-text-authoring-grammar-ux-improvement-results',
);
const RESULT_PATH = resolve(RESULT_DIRECTORY, 'simulation-matrix-v2-results.json');
const UI_EVIDENCE_PATH = resolve(RESULT_DIRECTORY, 'ui-simulation-evidence.json');
const FIXED_NOW = '2026-08-04T00:00:00.000Z';

export const V2_AUTOMATED_ACCEPTANCE_IDS = [
  'G01', 'G02', 'G03', 'G04', 'G05',
  'G06', 'G07', 'G08', 'G09', 'G10',
  'D01', 'D02', 'D03', 'D04', 'D05',
  'D06', 'D07', 'D08', 'D09',
  'A01', 'A02', 'A03', 'A04', 'A05',
  'A06', 'A07', 'A08',
] as const;

export const V2_BROWSER_QA_IDS = [
  'U01', 'U02', 'U03', 'U04',
  'U05', 'U06', 'U07', 'U08',
] as const;

export type V2AutomatedAcceptanceId =
  (typeof V2_AUTOMATED_ACCEPTANCE_IDS)[number];

type JsonRecord = Record<string, unknown>;

export type V2AcceptanceEvidence = {
  assertion: string;
  expected: unknown;
  observed: unknown;
  pass: boolean;
};

export type V2AutomatedAcceptanceResult = {
  id: V2AutomatedAcceptanceId;
  mode: 'api_acceptance';
  actual: JsonRecord;
  pass: boolean;
  status: 'passed' | 'failed';
  evidence: V2AcceptanceEvidence[];
  apis: string[];
};

type MatrixScenario = {
  id: string;
  group: string;
  priority: string;
  title: string;
};

type MatrixDocument = {
  schemaVersion: string;
  scenarios: MatrixScenario[];
};

type UiEvidenceCheck = JsonRecord & {
  id: string;
  passed: boolean;
};

type UiEvidenceDocument = JsonRecord & {
  checks: UiEvidenceCheck[];
};

export type BuildV2AcceptanceMatrixResultsOptions = {
  /**
   * Defaults to the result folder's ui-simulation-evidence.json. Pass null
   * when a caller needs a deterministic pending-browser-QA snapshot.
   */
  uiEvidencePath?: string | null;
};

type AcceptanceCaseOutput = {
  actual: JsonRecord;
  evidence: V2AcceptanceEvidence[];
  apis: string[];
};

function observed(value: unknown): unknown {
  return value === undefined ? null : value;
}

function evidence(
  assertion: string,
  actual: unknown,
  expected: unknown,
): V2AcceptanceEvidence {
  return {
    assertion,
    expected: observed(expected),
    observed: observed(actual),
    pass: isDeepStrictEqual(actual, expected),
  };
}

function includesEvidence(
  assertion: string,
  values: readonly unknown[],
  expectedValue: unknown,
): V2AcceptanceEvidence {
  return evidence(assertion, values.includes(expectedValue), true);
}

function authoringDocument(
  id: V2AutomatedAcceptanceId,
  rawText: string,
): TextAuthoringDocument {
  return createTextAuthoringDocument(rawText, {
    documentId: `v2-acceptance-${id}`,
    fixtureVersion: 'flowme-text-authoring-v2-acceptance',
    now: FIXED_NOW,
  });
}

function projection(
  document: TextAuthoringDocument,
): AuthoringArtifactProjection {
  return buildAuthoringArtifactProjection(document);
}

function canonicalTitles(document: TextAuthoringDocument): string[] {
  return document.parseResult.canonical.items.map((item) => item.title);
}

function itemProperties(item: CanonicalAuthoringItem): Record<string, string> {
  return Object.fromEntries(item.properties.map((property) => [
    property.key,
    property.value,
  ]));
}

function linkValues(item: CanonicalAuthoringItem): Array<{
  label: string;
  url: string;
}> {
  return [...item.resources, ...item.sources].map(({ label, url }) => ({
    label,
    url,
  }));
}

function scheduleValue(item: CanonicalAuthoringItem): JsonRecord | null {
  const schedule = item.schedule;
  if (!schedule) return null;
  return {
    kind: schedule.kind,
    raw: schedule.raw,
    ...(schedule.kind === 'absolute'
      ? { date: schedule.date }
      : {
          dayOffset: schedule.dayOffset,
          anchorLabel: schedule.anchorLabel ?? null,
        }),
    time: schedule.time ?? null,
    timezone: schedule.timezone ?? null,
    durationMinutes: schedule.durationMinutes ?? null,
    repeat: schedule.repeat ?? null,
  };
}

function semanticSnapshot(document: TextAuthoringDocument): JsonRecord {
  const stepTitleById = new Map(
    document.parseResult.canonical.steps.map((step) => [step.stepId, step.title]),
  );
  const items = document.parseResult.canonical.items.map((item) => ({
    stepTitle: stepTitleById.get(item.stepId) ?? null,
    title: item.title,
    detail: item.detail ?? null,
    completion: item.completion?.doneWhen ?? null,
    schedule: scheduleValue(item),
    properties: item.properties
      .map(({ key, label, value }) => ({ key, label, value }))
      .sort((left, right) => (
        `${left.key}\u0000${left.value}`.localeCompare(`${right.key}\u0000${right.value}`)
      )),
    resources: item.resources.map(({ label, url }) => ({ label, url })),
    sources: item.sources.map(({ label, url }) => ({ label, url })),
    guides: [...item.guides],
    cautions: [...item.cautions],
    nestingLevel: item.nestingLevel,
  }));
  const anchor = document.parseResult.canonical.fields.find(
    (field) => field.key === 'anchor' && field.owner.type === 'flow',
  )?.value ?? null;
  return {
    flowTitle: document.parseResult.canonical.flow.title,
    stepTitles: document.parseResult.canonical.steps.map((step) => step.title),
    anchor,
    items,
  };
}

function issueTypes(document: TextAuthoringDocument): string[] {
  return document.parseResult.issues.map((issue) => issue.type);
}

function sourceRows(document: TextAuthoringDocument): string[] {
  return document.parseResult.canonical.sourceRows.map((row) => row.rawText);
}

function finalizeCase(
  id: V2AutomatedAcceptanceId,
  output: AcceptanceCaseOutput,
): V2AutomatedAcceptanceResult {
  const pass = output.evidence.every((entry) => entry.pass);
  return {
    id,
    mode: 'api_acceptance',
    actual: output.actual,
    pass,
    status: pass ? 'passed' : 'failed',
    evidence: output.evidence,
    apis: output.apis,
  };
}

function g01(): AcceptanceCaseOutput {
  const rawText = [
    '# 제목',
    '## 단계',
    '- [ ] 항목',
    '  - 설명: 설명입니다.',
  ].join('\n');
  const document = authoringDocument('G01', rawText);
  const result = projection(document);
  const item = document.parseResult.canonical.items[0];
  const actual = {
    itemCount: document.parseResult.canonical.items.length,
    detail: item?.detail ?? null,
    issueTypes: issueTypes(document),
    todoTitles: result.artifacts.todo.rows.map((row) => row.title),
    sourcePreserved: document.rawText === rawText,
  };
  return {
    actual,
    evidence: [
      evidence('v2 속성 bullet은 새 Item을 만들지 않는다', actual.itemCount, 1),
      evidence('설명은 바로 위 Item의 detail이다', actual.detail, '설명입니다.'),
      evidence('속성 bullet 해석 이슈가 없다', actual.issueTypes, []),
      evidence('Todo 제목에 속성명이 섞이지 않는다', actual.todoTitles, ['항목']),
      evidence('원문은 변경되지 않는다', actual.sourcePreserved, true),
    ],
    apis: ['createTextAuthoringDocument', 'buildAuthoringArtifactProjection'],
  };
}

function g02(): AcceptanceCaseOutput {
  const rawText = [
    '# 소유권 확인',
    '## 실행',
    '- [ ] 첫 항목',
    '  - 설명: 첫 설명',
    '  - 날짜: 2026-08-01',
    '  - 자료: [첫 자료](https://example.com/first)',
    '- [ ] 둘째 항목',
    '  - 설명: 둘째 설명',
    '  - 날짜: 2026-08-02',
    '  - 자료: [둘째 자료](https://example.com/second)',
  ].join('\n');
  const document = authoringDocument('G02', rawText);
  const actualItems = document.parseResult.canonical.items.map((item) => ({
    title: item.title,
    detail: item.detail ?? null,
    date: item.schedule?.kind === 'absolute' ? item.schedule.date : null,
    links: linkValues(item),
  }));
  const expectedItems = [
    {
      title: '첫 항목',
      detail: '첫 설명',
      date: '2026-08-01',
      links: [{ label: '첫 자료', url: 'https://example.com/first' }],
    },
    {
      title: '둘째 항목',
      detail: '둘째 설명',
      date: '2026-08-02',
      links: [{ label: '둘째 자료', url: 'https://example.com/second' }],
    },
  ];
  return {
    actual: { itemCount: actualItems.length, items: actualItems },
    evidence: [
      evidence('Item 수를 보존한다', actualItems.length, 2),
      evidence('각 속성은 바로 위 Item에만 귀속된다', actualItems, expectedItems),
    ],
    apis: ['createTextAuthoringDocument'],
  };
}

function g03(): AcceptanceCaseOutput {
  const rawText = [
    '# 공식 속성',
    '- 기준일: 2026-08-10',
    '## 실행',
    '- [ ] 전체 속성 항목',
    '  - 설명: 자세한 설명',
    '  - 날짜: 2026-08-09',
    '  - 상대 날짜: D-3',
    '  - 시간: 09:30',
    '  - 시간대: Asia/Seoul',
    '  - 소요 시간: 45분',
    '  - 장소: 서울역',
    '  - 완료 기준: 확인 번호를 기록함',
    '  - 반복: 매주 월요일',
    '  - 조건: 비가 오지 않을 때',
    '  - 자료: [공식 자료](https://example.com/official)',
  ].join('\n');
  const document = authoringDocument('G03', rawText);
  const result = projection(document);
  const item = document.parseResult.canonical.items[0];
  const properties = itemProperties(item);
  const actual = {
    itemCount: document.parseResult.canonical.items.length,
    detail: item.detail ?? null,
    completion: item.completion?.doneWhen ?? null,
    properties,
    schedule: scheduleValue(item),
    links: linkValues(item),
    todoTitles: result.artifacts.todo.rows.map((row) => row.title),
    issueTypes: issueTypes(document),
  };
  const requiredPropertyKeys = [
    'date', 'relative_date', 'time', 'timezone', 'duration',
    'place', 'repeat', 'condition',
  ];
  return {
    actual,
    evidence: [
      evidence('공식 속성 전체를 넣어도 Item 수가 불어나지 않는다', actual.itemCount, 1),
      evidence('설명을 보존한다', actual.detail, '자세한 설명'),
      evidence('완료 기준을 보존한다', actual.completion, '확인 번호를 기록함'),
      evidence(
        '지원 필드를 모두 보존한다',
        requiredPropertyKeys.every((key) => properties[key] !== undefined),
        true,
      ),
      evidence(
        'Markdown 링크를 보존한다',
        actual.links,
        [{ label: '공식 자료', url: 'https://example.com/official' }],
      ),
      evidence('속성명이 결과 제목이 되지 않는다', actual.todoTitles, ['전체 속성 항목']),
      evidence('공식 속성 해석 이슈가 없다', actual.issueTypes, []),
    ],
    apis: ['createTextAuthoringDocument', 'buildAuthoringArtifactProjection'],
  };
}

function g04(): AcceptanceCaseOutput {
  const rawText = [
    '# 순서 독립',
    '## 실행',
    '- [ ] 순서가 뒤섞인 항목',
    '  - 시간: 09:30',
    '  - 반복: 매주',
    '  - 날짜: 2026-08-03',
    '  - 설명: 마지막에 쓴 설명',
  ].join('\n');
  const document = authoringDocument('G04', rawText);
  const item = document.parseResult.canonical.items[0];
  const markdown = exportTextAuthoringMarkdown(document);
  const writerPropertyLabels = markdown
    .split(/\r?\n/u)
    .flatMap((line) => /^  - ([^:]+):/u.exec(line)?.[1]?.trim() ?? []);
  const actual = {
    itemCount: document.parseResult.canonical.items.length,
    schedule: scheduleValue(item),
    detail: item.detail ?? null,
    writerPropertyLabels,
    normalization: 'official_order',
  };
  return {
    actual,
    evidence: [
      evidence('속성 순서와 무관하게 Item은 하나다', actual.itemCount, 1),
      evidence('앞서 쓴 시간도 뒤의 날짜 schedule에 재적용된다', item.schedule?.time, '09:30'),
      evidence('앞서 쓴 반복도 뒤의 날짜 schedule에 재적용된다', item.schedule?.repeat, '매주'),
      evidence('설명을 보존한다', actual.detail, '마지막에 쓴 설명'),
      evidence(
        'writer는 공식 순서로 정규화한다',
        writerPropertyLabels,
        ['설명', '날짜', '시간', '반복'],
      ),
    ],
    apis: ['createTextAuthoringDocument', 'exportTextAuthoringMarkdown'],
  };
}

function unknownPropertyCase(
  id: 'G05' | 'G07',
  unknownLine: string,
): AcceptanceCaseOutput {
  const rawText = [
    '# 미정 속성',
    '## 실행',
    '- [ ] 부모 항목',
    unknownLine,
  ].join('\n');
  const document = authoringDocument(id, rawText);
  const item = document.parseResult.canonical.items[0];
  const actual = {
    itemCount: document.parseResult.canonical.items.length,
    itemTitle: item?.title ?? null,
    detail: item?.detail ?? null,
    issueTypes: issueTypes(document),
    sourceRows: sourceRows(document),
    sourcePreserved: document.rawText === rawText,
  };
  return {
    actual,
    evidence: [
      evidence('unknown_property 이슈가 하나 생긴다', actual.issueTypes, ['unknown_property']),
      evidence('새 Item을 만들지 않는다', actual.itemCount, 1),
      evidence('부모 제목을 바꾸지 않는다', actual.itemTitle, '부모 항목'),
      evidence('알 수 없는 값을 설명으로 추정하지 않는다', actual.detail, null),
      includesEvidence('문제 행의 원문을 source row로 보존한다', actual.sourceRows, unknownLine),
      evidence('전체 원문을 보존한다', actual.sourcePreserved, true),
    ],
    apis: ['createTextAuthoringDocument'],
  };
}

function g05(): AcceptanceCaseOutput {
  return unknownPropertyCase('G05', '  - 담당자: 홍길동');
}

function g06(): AcceptanceCaseOutput {
  const nestedLine = '  - [ ] 하위 작업';
  const rawText = [
    '# 중첩 경계',
    '## 실행',
    '- [ ] 부모 항목',
    nestedLine,
  ].join('\n');
  const document = authoringDocument('G06', rawText);
  const item = document.parseResult.canonical.items[0];
  const actual = {
    itemCount: document.parseResult.canonical.items.length,
    itemTitle: item?.title ?? null,
    nestingLevel: item?.nestingLevel ?? null,
    detail: item?.detail ?? null,
    issueTypes: issueTypes(document),
    sourceRows: sourceRows(document),
  };
  return {
    actual,
    evidence: [
      evidence(
        '중첩 체크박스는 unsupported_nested_item으로 남긴다',
        actual.issueTypes,
        ['unsupported_nested_item'],
      ),
      evidence('자동 평탄화로 Item을 추가하지 않는다', actual.itemCount, 1),
      evidence('부모 Item의 nesting을 바꾸지 않는다', actual.nestingLevel, 0),
      evidence('부모 속성으로 오인하지 않는다', actual.detail, null),
      includesEvidence('중첩 원문을 source row로 보존한다', actual.sourceRows, nestedLine),
    ],
    apis: ['createTextAuthoringDocument'],
  };
}

function g07(): AcceptanceCaseOutput {
  return unknownPropertyCase('G07', '  - 책: 읽기');
}

function g08(): AcceptanceCaseOutput {
  const rawText = [
    '# v1 호환',
    '## 실행',
    '- [ ] 기존 항목',
    '  설명: 기존 설명',
    '  날짜: 2026-08-03',
  ].join('\n');
  const document = authoringDocument('G08', rawText);
  const markdown = exportTextAuthoringMarkdown(document);
  const reparsed = authoringDocument('G08', markdown);
  const before = semanticSnapshot(document);
  const after = semanticSnapshot(reparsed);
  const actual = {
    itemCount: document.parseResult.canonical.items.length,
    detail: document.parseResult.canonical.items[0]?.detail ?? null,
    date: document.parseResult.canonical.items[0]?.schedule?.kind === 'absolute'
      ? document.parseResult.canonical.items[0].schedule.date
      : null,
    writesV2Detail: /^  - 설명: 기존 설명$/mu.test(markdown),
    writesV2Date: /^  - 날짜: 2026-08-03$/mu.test(markdown),
    semanticRoundTrip: isDeepStrictEqual(before, after),
    reparsedItemCount: reparsed.parseResult.canonical.items.length,
  };
  return {
    actual,
    evidence: [
      evidence('v1 대시 없는 속성을 읽는다', [actual.detail, actual.date], ['기존 설명', '2026-08-03']),
      evidence('writer는 v2 설명 bullet을 쓴다', actual.writesV2Detail, true),
      evidence('writer는 v2 날짜 bullet을 쓴다', actual.writesV2Date, true),
      evidence('실제 parser 재입력에서 의미 필드 손실이 없다', actual.semanticRoundTrip, true),
      evidence('Item 수가 불변이다', actual.reparsedItemCount, actual.itemCount),
    ],
    apis: [
      'createTextAuthoringDocument',
      'exportTextAuthoringMarkdown',
      'createTextAuthoringDocument(reparse)',
    ],
  };
}

function g09(): AcceptanceCaseOutput {
  const rawText = '정말 설명입니다. 다음 내용을 참고하세요.';
  const document = authoringDocument('G09', rawText);
  const actual = {
    itemCount: document.parseResult.canonical.items.length,
    rawText: document.rawText,
    sourceRows: sourceRows(document),
    issueTypes: issueTypes(document),
  };
  return {
    actual,
    evidence: [
      evidence('표식 없는 문장은 canonical Item을 만들지 않는다', actual.itemCount, 0),
      evidence('원문 텍스트를 byte-equivalent로 보존한다', actual.rawText, rawText),
      includesEvidence('원문 문장을 source row로 보존한다', actual.sourceRows, rawText),
      evidence('명시적 승인 전 ambiguous_role로 남긴다', actual.issueTypes, ['ambiguous_role']),
    ],
    apis: ['createTextAuthoringDocument'],
  };
}

function g10(): AcceptanceCaseOutput {
  const rawText = [
    '# 왕복 동등성',
    '- 기준일: 2026-08-10',
    '## 준비',
    '- [ ] 예약 확인',
    '  - 설명: 예약 정보를 다시 확인합니다.',
    '  - 완료 기준: 예약 번호를 저장함',
    '  - 날짜: 2026-08-09',
    '  - 시간: 09:30',
    '  - 시간대: Asia/Seoul',
    '  - 소요 시간: 45분',
    '  - 장소: 서울역',
    '  - 반복: 매주 월요일',
    '  - 조건: 운행 중일 때',
    '  - 자료: [예약 페이지](https://example.com/booking)',
    '  - 안내: 예약 문자를 준비합니다.',
    '  - 주의: 이름을 확인합니다.',
    '  - 출처: [공식 안내](https://example.com/source)',
    '- [ ] 사전 알림',
    '  - 상대 날짜: D-3',
    '## 마무리',
    '- [ ] 결과 기록',
    '  - 설명: 결과를 메모합니다.',
    '- [ ] 공유',
    '  - 자료: [공유 링크](https://example.com/share)',
  ].join('\n');
  const document = authoringDocument('G10', rawText);
  const markdown = exportTextAuthoringMarkdown(document);
  const reparsed = authoringDocument('G10', markdown);
  const before = semanticSnapshot(document);
  const after = semanticSnapshot(reparsed);
  const receipt = checkMarkdownRoundTrip(document, { markdown });
  const propertySignatures = reparsed.parseResult.canonical.items.map((item) => (
    item.properties.map((property) => `${property.key}\u0000${property.value}`)
  ));
  const hasDuplicateProperty = propertySignatures.some(
    (values) => new Set(values).size !== values.length,
  );
  const actual = {
    before,
    after,
    semanticEquivalent: isDeepStrictEqual(before, after),
    stepCount: reparsed.parseResult.canonical.steps.length,
    itemCount: reparsed.parseResult.canonical.items.length,
    nestingLevels: reparsed.parseResult.canonical.items.map((item) => item.nestingLevel),
    hasDuplicateProperty,
    visibleV2PropertyCount: markdown.split(/\r?\n/u)
      .filter((line) => /^  - [^:]+:/u.test(line)).length,
    supportedReceipt: {
      matchedCount: receipt.matchedCount,
      changedCount: receipt.changedCount,
      unresolvedCount: receipt.unresolvedCount,
    },
  };
  return {
    actual,
    evidence: [
      evidence('실제 parser 재입력에서 Step, Item, field, link, schedule이 같다', actual.semanticEquivalent, true),
      evidence('Step 수를 보존한다', actual.stepCount, 2),
      evidence('Item 수를 보존한다', actual.itemCount, 4),
      evidence('nesting loss가 없다', actual.nestingLevels, [0, 0, 0, 0]),
      evidence('속성 중복이 없다', actual.hasDuplicateProperty, false),
      evidence('지원 Markdown receipt의 변경 수가 0이다', receipt.changedCount, 0),
      evidence('지원 Markdown receipt의 미해결 수가 0이다', receipt.unresolvedCount, 0),
    ],
    apis: [
      'createTextAuthoringDocument',
      'exportTextAuthoringMarkdown',
      'createTextAuthoringDocument(reparse)',
      'checkMarkdownRoundTrip',
    ],
  };
}

const REVERSE_DATE_RAW = [
  '# 날짜 역순',
  '## 실행',
  '- [ ] 늦은 항목',
  '  - 설명: 늦은 설명',
  '  - 날짜: 2026-08-10',
  '- [ ] 빠른 항목',
  '  - 설명: 빠른 설명',
  '  - 날짜: 2026-08-03',
].join('\n');

function d01(): AcceptanceCaseOutput {
  const document = authoringDocument('D01', REVERSE_DATE_RAW);
  const result = projection(document);
  const sourceOrder = canonicalTitles(document);
  const todoOrder = result.artifacts.todo.rows.map((row) => row.title);
  const calendarOrder = result.artifacts.calendar.rows.map((row) => row.title);
  const actual = {
    sourceOrder,
    todoOrder,
    calendarOrder,
    sourceMutationCount: result.sourceMutationCount,
    rawSourceUnchanged: document.rawText === REVERSE_DATE_RAW,
    sourceAlignmentAvailable: !isDeepStrictEqual(sourceOrder, calendarOrder),
  };
  return {
    actual,
    evidence: [
      evidence('canonical은 작성 순서를 유지한다', sourceOrder, ['늦은 항목', '빠른 항목']),
      evidence('Todo는 작성 순서를 유지한다', todoOrder, sourceOrder),
      evidence('Calendar만 날짜 오름차순이다', calendarOrder, ['빠른 항목', '늦은 항목']),
      evidence('projection은 원문을 자동 변경하지 않는다', actual.sourceMutationCount, 0),
      evidence('원문이 byte-equivalent다', actual.rawSourceUnchanged, true),
      evidence('원문 정렬 적용 가능 상태를 계산할 수 있다', actual.sourceAlignmentAvailable, true),
    ],
    apis: ['createTextAuthoringDocument', 'buildAuthoringArtifactProjection'],
  };
}

function itemLineage(document: TextAuthoringDocument): Record<string, string[]> {
  return Object.fromEntries(document.parseResult.canonical.items.map((item) => [
    item.itemId,
    [...item.sourceRowIds].sort(),
  ]));
}

function d02(): AcceptanceCaseOutput {
  const document = authoringDocument('D02', REVERSE_DATE_RAW);
  const beforeIds = document.parseResult.canonical.items.map((item) => item.itemId);
  const beforeLineage = itemLineage(document);
  const orderedItemIds = projection(document).artifacts.calendar.rows.map((row) => row.itemId);
  const aligned = applyAuthoringOperation(document, {
    type: 'align_source_order',
    orderedItemIds,
  }, { now: FIXED_NOW });
  const undone = applyAuthoringOperation(aligned, { type: 'undo' }, {
    now: '2026-08-04T00:01:00.000Z',
  });
  const actual = {
    alignedOrder: canonicalTitles(aligned),
    alignedRawText: aligned.rawText,
    propertyMovedWithItem:
      aligned.rawText.indexOf('- [ ] 빠른 항목')
        < aligned.rawText.indexOf('  - 설명: 빠른 설명')
      && aligned.rawText.indexOf('  - 설명: 빠른 설명')
        < aligned.rawText.indexOf('  - 날짜: 2026-08-03')
      && aligned.rawText.indexOf('  - 날짜: 2026-08-03')
        < aligned.rawText.indexOf('- [ ] 늦은 항목'),
    stableItemIds: aligned.parseResult.canonical.items
      .map((item) => item.itemId)
      .every((itemId) => beforeIds.includes(itemId)),
    sourceLineagePreserved: isDeepStrictEqual(itemLineage(aligned), beforeLineage),
    revisionOperation: aligned.revision.operations[0]?.type ?? null,
    undoRawRestored: undone.rawText === REVERSE_DATE_RAW,
    undoOrder: canonicalTitles(undone),
  };
  return {
    actual,
    evidence: [
      evidence('명시적 작업 후 같은 Step 안 Item 순서가 날짜순이다', actual.alignedOrder, ['빠른 항목', '늦은 항목']),
      evidence('소유 속성이 Item 블록과 함께 이동한다', actual.propertyMovedWithItem, true),
      evidence('stable Item ID를 보존한다', actual.stableItemIds, true),
      evidence('source lineage를 보존한다', actual.sourceLineagePreserved, true),
      evidence('revision에 명시적 원문 정렬 작업을 기록한다', actual.revisionOperation, 'align_source_order'),
      evidence('undo가 원문을 복원한다', actual.undoRawRestored, true),
      evidence('undo가 원래 Item 순서를 복원한다', actual.undoOrder, ['늦은 항목', '빠른 항목']),
    ],
    apis: [
      'createTextAuthoringDocument',
      'buildAuthoringArtifactProjection',
      'applyAuthoringOperation(align_source_order)',
      'applyAuthoringOperation(undo)',
    ],
  };
}

function d03(): AcceptanceCaseOutput {
  const rawText = [
    '# 동률 정렬',
    '## 실행',
    '- [ ] 같은 날 첫 항목',
    '  - 날짜: 2026-08-03',
    '- [ ] 같은 날 둘째 항목',
    '  - 날짜: 2026-08-03',
  ].join('\n');
  const document = authoringDocument('D03', rawText);
  const result = projection(document);
  const calendarOrder = result.artifacts.calendar.rows.map((row) => row.title);
  const aligned = applyAuthoringOperation(document, {
    type: 'align_source_order',
    orderedItemIds: result.artifacts.calendar.rows.map((row) => row.itemId),
  }, { now: FIXED_NOW });
  const actual = {
    sourceOrder: canonicalTitles(document),
    calendarOrder,
    alignedOrder: canonicalTitles(aligned),
    noRewriteNeeded: aligned === document,
  };
  return {
    actual,
    evidence: [
      evidence('같은 날짜의 Calendar 동률은 작성 순서다', calendarOrder, actual.sourceOrder),
      evidence('정렬 적용 후 상대 순서가 같다', actual.alignedOrder, actual.sourceOrder),
      evidence('이미 정렬된 원문은 새 revision을 만들지 않는다', actual.noRewriteNeeded, true),
    ],
    apis: [
      'createTextAuthoringDocument',
      'buildAuthoringArtifactProjection',
      'applyAuthoringOperation(align_source_order)',
    ],
  };
}

function d04(): AcceptanceCaseOutput {
  const rawText = [
    '# 기준일 없음',
    '## 실행',
    '- [ ] 사전 확인',
    '  - 상대 날짜: D-3',
    '- [ ] 당일 확인',
    '  - 상대 날짜: D-Day',
  ].join('\n');
  const document = authoringDocument('D04', rawText);
  const result = projection(document);
  const actual = {
    todoEligible: result.artifacts.todo.eligible,
    todoCount: result.artifacts.todo.count,
    calendarEligible: result.artifacts.calendar.eligible,
    calendarCount: result.artifacts.calendar.count,
    calendarDates: result.artifacts.calendar.rows.map((row) => row.date ?? null),
    lossReasons: result.artifacts.calendar.losses.map((loss) => loss.reason),
    relativeAnchorLossCount: result.artifacts.calendar.losses.filter(
      (loss) => loss.reason === 'relative_anchor_required',
    ).length,
  };
  return {
    actual,
    evidence: [
      evidence('체크/할 일은 활성 상태다', [actual.todoEligible, actual.todoCount], [true, 2]),
      evidence('기준일 없는 상대 날짜는 Calendar를 만들지 않는다', [actual.calendarEligible, actual.calendarCount], [false, 0]),
      evidence(
        '각 상대 날짜에 relative_anchor_required를 남긴다',
        actual.relativeAnchorLossCount,
        2,
      ),
      evidence('실제 날짜를 추정하지 않는다', actual.calendarDates, []),
    ],
    apis: ['createTextAuthoringDocument', 'buildAuthoringArtifactProjection'],
  };
}

function d05(): AcceptanceCaseOutput {
  const rawText = [
    '# 기준일 있음',
    '- 기준일: 2026-08-10',
    '## 실행',
    '- [ ] 사전 확인',
    '  - 상대 날짜: D-3',
    '- [ ] 당일 확인',
    '  - 상대 날짜: D-Day',
  ].join('\n');
  const document = authoringDocument('D05', rawText);
  const result = projection(document);
  const anchorField = document.parseResult.canonical.fields.find(
    (field) => field.key === 'anchor' && field.owner.type === 'flow',
  );
  const actual = {
    anchorField: anchorField?.value ?? null,
    scheduleAnchors: document.parseResult.canonical.items.map(
      (item) => item.schedule?.kind === 'relative'
        ? item.schedule.anchorLabel ?? null
        : null,
    ),
    calendarEligible: result.artifacts.calendar.eligible,
    calendarDates: result.artifacts.calendar.rows.map((row) => row.date),
    sourceExpressions: result.artifacts.calendar.rows.map((row) => row.sourceExpression),
  };
  return {
    actual,
    evidence: [
      evidence('원문의 ISO 기준일을 flow field로 보존한다', actual.anchorField, '2026-08-10'),
      evidence('상대 schedule에 계산 기준을 연결한다', actual.scheduleAnchors, ['2026-08-10', '2026-08-10']),
      evidence('Calendar가 활성화된다', actual.calendarEligible, true),
      evidence('D-3부터 D-Day까지 날짜순으로 계산한다', actual.calendarDates, ['2026-08-07', '2026-08-10']),
      evidence('원문 상대 표현을 결과 근거로 보존한다', actual.sourceExpressions, ['D-3', 'D-Day']),
    ],
    apis: ['createTextAuthoringDocument', 'buildAuthoringArtifactProjection'],
  };
}

function writeCanonicalAnchorLine(rawText: string, date: string): string {
  const newline = rawText.includes('\r\n') ? '\r\n' : '\n';
  const lines = rawText.split(/\r?\n/u);
  const existingIndex = lines.findIndex((line) => (
    /^\s*(?:-\s+)?기준일\s*:/u.test(line)
  ));
  const canonicalLine = `- 기준일: ${date}`;
  if (existingIndex >= 0) {
    lines[existingIndex] = canonicalLine;
  } else {
    const titleIndex = lines.findIndex((line) => /^\s*#(?!#)\s+/u.test(line));
    lines.splice(titleIndex >= 0 ? titleIndex + 1 : 0, 0, canonicalLine);
  }
  return lines.join(newline);
}

function d06(): AcceptanceCaseOutput {
  const initialRaw = [
    '# UI 기준일',
    '## 실행',
    '- [ ] 사전 확인',
    '  - 상대 날짜: D-3',
  ].join('\n');
  const initial = authoringDocument('D06', initialRaw);
  const hiddenOnly = buildAuthoringArtifactProjection(initial, {
    anchor: '2026-08-10',
  });
  const persistedRaw = writeCanonicalAnchorLine(initial.rawText, '2026-08-10');
  const persisted = authoringDocument('D06', persistedRaw);
  const firstProjection = projection(persisted);
  const refreshed = authoringDocument('D06', persistedRaw);
  const refreshedProjection = projection(refreshed);
  const actual = {
    hiddenOnlyCalendarCount: hiddenOnly.artifacts.calendar.count,
    persistedRaw,
    anchorLineIndex: persistedRaw.split(/\r?\n/u).indexOf('- 기준일: 2026-08-10'),
    calendarDates: firstProjection.artifacts.calendar.rows.map((row) => row.date),
    refreshedCalendarDates: refreshedProjection.artifacts.calendar.rows.map((row) => row.date),
  };
  return {
    actual,
    evidence: [
      evidence('UI-only anchor option은 Calendar를 활성화하지 않는다', actual.hiddenOnlyCalendarCount, 0),
      evidence('선택한 기준일은 원문 제목 바로 뒤 canonical 줄로 지속된다', actual.anchorLineIndex, 1),
      evidence('원문 반영 직후 Calendar가 계산된다', actual.calendarDates, ['2026-08-07']),
      evidence('같은 원문을 새로 파싱해도 결과가 같다', actual.refreshedCalendarDates, actual.calendarDates),
    ],
    apis: [
      'createTextAuthoringDocument',
      'buildAuthoringArtifactProjection(anchor option boundary)',
      'createTextAuthoringDocument(persisted raw source)',
    ],
  };
}

function d07(): AcceptanceCaseOutput {
  const rawText = [
    '# 혼합 날짜',
    '- 기준일: 2026-08-10',
    '## 실행',
    '- [ ] 절대 날짜 항목',
    '  - 날짜: 2026-08-09',
    '- [ ] 날짜 없는 항목',
    '- [ ] 상대 날짜 항목',
    '  - 상대 날짜: D-3',
  ].join('\n');
  const document = authoringDocument('D07', rawText);
  const result = projection(document);
  const orderedItemIds = result.artifacts.calendar.rows.map((row) => row.itemId);
  const aligned = applyAuthoringOperation(document, {
    type: 'align_source_order',
    orderedItemIds,
  }, { now: FIXED_NOW });
  const actual = {
    calendarOrder: result.artifacts.calendar.rows.map((row) => ({
      title: row.title,
      date: row.date,
    })),
    todoOrder: result.artifacts.todo.rows.map((row) => row.title),
    alignedOrder: canonicalTitles(aligned),
  };
  return {
    actual,
    evidence: [
      evidence(
        '계산 가능한 행만 Calendar에 날짜순으로 나온다',
        actual.calendarOrder,
        [
          { title: '상대 날짜 항목', date: '2026-08-07' },
          { title: '절대 날짜 항목', date: '2026-08-09' },
        ],
      ),
      evidence(
        '모든 Item은 Todo에 작성 순서로 남는다',
        actual.todoOrder,
        ['절대 날짜 항목', '날짜 없는 항목', '상대 날짜 항목'],
      ),
      evidence(
        '명시적 원문 정렬에서 날짜 없는 Item은 마지막이다',
        actual.alignedOrder,
        ['상대 날짜 항목', '절대 날짜 항목', '날짜 없는 항목'],
      ),
    ],
    apis: [
      'createTextAuthoringDocument',
      'buildAuthoringArtifactProjection',
      'applyAuthoringOperation(align_source_order)',
    ],
  };
}

function d08(): AcceptanceCaseOutput {
  const rawText = [
    '# 모호한 날짜',
    '## 실행',
    '- [ ] 월일만 있는 항목',
    '  - 날짜: 8월 3일',
    '- [ ] 자연어 상대 날짜',
    '  - 상대 날짜: 내일',
  ].join('\n');
  const document = authoringDocument('D08', rawText);
  const result = projection(document);
  const actual = {
    issueTypes: issueTypes(document),
    schedules: document.parseResult.canonical.items.map((item) => scheduleValue(item)),
    calendarCount: result.artifacts.calendar.count,
    rawSourceUnchanged: document.rawText === rawText,
  };
  return {
    actual,
    evidence: [
      evidence('모호한 날짜마다 invalid_date 이슈를 남긴다', actual.issueTypes, ['invalid_date', 'invalid_date']),
      evidence('연도나 날짜를 추정해 schedule을 만들지 않는다', actual.schedules, [null, null]),
      evidence('Calendar 일정은 0개다', actual.calendarCount, 0),
      evidence('원문을 보존한다', actual.rawSourceUnchanged, true),
    ],
    apis: ['createTextAuthoringDocument', 'buildAuthoringArtifactProjection'],
  };
}

function d09(): AcceptanceCaseOutput {
  const rawText = [
    '# Step 경계 정렬',
    '## 첫 단계',
    '- [ ] 첫 단계 늦음',
    '  - 날짜: 2026-08-10',
    '- [ ] 첫 단계 빠름',
    '  - 날짜: 2026-08-03',
    '## 둘째 단계',
    '- [ ] 둘째 단계 늦음',
    '  - 날짜: 2026-08-12',
    '- [ ] 둘째 단계 빠름',
    '  - 날짜: 2026-08-04',
  ].join('\n');
  const document = authoringDocument('D09', rawText);
  const beforeStepById = Object.fromEntries(
    document.parseResult.canonical.items.map((item) => [item.itemId, item.stepId]),
  );
  const beforeLineage = itemLineage(document);
  const orderedItemIds = projection(document).artifacts.calendar.rows.map((row) => row.itemId);
  const aligned = applyAuthoringOperation(document, {
    type: 'align_source_order',
    orderedItemIds,
  }, { now: FIXED_NOW });
  const stepOrders = aligned.parseResult.canonical.steps.map((step) => ({
    stepTitle: step.title,
    itemTitles: step.itemIds.map((itemId) => (
      aligned.parseResult.canonical.items.find((item) => item.itemId === itemId)?.title
    )),
  }));
  const afterStepById = Object.fromEntries(
    aligned.parseResult.canonical.items.map((item) => [item.itemId, item.stepId]),
  );
  const actual = {
    stepOrders,
    stepMembershipPreserved: isDeepStrictEqual(beforeStepById, afterStepById),
    stableItemIds: Object.keys(beforeStepById).every((itemId) => itemId in afterStepById),
    sourceLineagePreserved: isDeepStrictEqual(beforeLineage, itemLineage(aligned)),
  };
  return {
    actual,
    evidence: [
      evidence(
        '각 Step 내부에서만 날짜순 정렬한다',
        stepOrders,
        [
          { stepTitle: '첫 단계', itemTitles: ['첫 단계 빠름', '첫 단계 늦음'] },
          { stepTitle: '둘째 단계', itemTitles: ['둘째 단계 빠름', '둘째 단계 늦음'] },
        ],
      ),
      evidence('Item이 다른 Step으로 이동하지 않는다', actual.stepMembershipPreserved, true),
      evidence('stable ID를 보존한다', actual.stableItemIds, true),
      evidence('source lineage를 보존한다', actual.sourceLineagePreserved, true),
    ],
    apis: [
      'createTextAuthoringDocument',
      'buildAuthoringArtifactProjection',
      'applyAuthoringOperation(align_source_order)',
    ],
  };
}

function artifactViewShape(result: AuthoringArtifactProjection): JsonRecord {
  return Object.fromEntries(Object.entries(result.artifacts).map(([key, value]) => [
    key,
    Object.keys(value).sort(),
  ]));
}

function hasStableArtifactViewContract(
  result: AuthoringArtifactProjection,
): boolean {
  const requiredKeys = [
    'artifact', 'label', 'eligible', 'count', 'rows', 'losses',
  ];
  return Object.values(result.artifacts).every((view) => (
    requiredKeys.every((key) => key in view)
    && Array.isArray(view.rows)
    && Array.isArray(view.losses)
  ));
}

function a01(): AcceptanceCaseOutput {
  const undated = projection(authoringDocument('A01', [
    '# 날짜 없음',
    '## 실행',
    '- [ ] 항목',
  ].join('\n')));
  const dated = projection(authoringDocument('A01', [
    '# 날짜 있음',
    '## 실행',
    '- [ ] 항목',
    '  - 날짜: 2026-08-03',
  ].join('\n')));
  const table = projection(authoringDocument('A01', [
    '| 활동 | 담당 | 자료 |',
    '| --- | --- | --- |',
    '| 예약 | 민지 | https://example.com |',
  ].join('\n')));
  const slotKeys = [undated, dated, table].map((result) => Object.keys(result.artifacts));
  const viewShapes = [undated, dated, table].map(artifactViewShape);
  const stableViewContracts = [undated, dated, table]
    .map(hasStableArtifactViewContract);
  const eligibility = [undated, dated, table].map((result) => (
    Object.fromEntries(Object.entries(result.artifacts).map(([key, value]) => [
      key,
      value.eligible,
    ]))
  ));
  const actual = { slotKeys, viewShapes, stableViewContracts, eligibility };
  return {
    actual,
    evidence: [
      evidence(
        '입력 종류와 무관하게 결과 슬롯 4개의 순서가 고정이다',
        slotKeys,
        [
          ['calendar', 'todo', 'sheet', 'memo'],
          ['calendar', 'todo', 'sheet', 'memo'],
          ['calendar', 'todo', 'sheet', 'memo'],
        ],
      ),
      evidence(
        '각 입력 전환에서 결과 슬롯의 필수 API contract가 유지된다',
        stableViewContracts,
        [true, true, true],
      ),
      evidence(
        '슬롯 제거 대신 eligible 상태만 달라진다',
        new Set(eligibility.map((value) => JSON.stringify(value))).size > 1,
        true,
      ),
    ],
    apis: ['createTextAuthoringDocument', 'buildAuthoringArtifactProjection'],
  };
}

function a02(): AcceptanceCaseOutput {
  const rawText = [
    '# 제목 목록',
    '## 실행',
    '- [ ] 첫 항목',
    '- [ ] 둘째 항목',
    '- [ ] 셋째 항목',
  ].join('\n');
  const result = projection(authoringDocument('A02', rawText));
  const actual = {
    todo: {
      eligible: result.artifacts.todo.eligible,
      count: result.artifacts.todo.count,
    },
    memo: {
      eligible: result.artifacts.memo.eligible,
      count: result.artifacts.memo.count,
    },
    sheet: {
      eligible: result.artifacts.sheet.eligible,
      count: result.artifacts.sheet.count,
      reasons: result.artifacts.sheet.losses.map((loss) => loss.reason),
    },
  };
  return {
    actual,
    evidence: [
      evidence('일반 목록은 Todo가 활성이다', actual.todo, { eligible: true, count: 3 }),
      evidence('일반 목록은 텍스트/Memo가 활성이다', actual.memo, { eligible: true, count: 3 }),
      evidence('제목뿐인 일반 목록의 Sheet는 비활성이다', [actual.sheet.eligible, actual.sheet.count], [false, 0]),
      includesEvidence('Sheet 비활성 이유를 제공한다', actual.sheet.reasons, 'insufficient_tabular_structure'),
    ],
    apis: ['createTextAuthoringDocument', 'buildAuthoringArtifactProjection'],
  };
}

function a03(): AcceptanceCaseOutput {
  const rawText = [
    '| 활동 | 담당 | 자료 |',
    '| --- | --- | --- |',
    '| 예약 확인 | 민지 | https://example.com/booking |',
    '| 숙소 확인 | 준호 | https://example.com/stay |',
  ].join('\n');
  const document = authoringDocument('A03', rawText);
  const result = projection(document);
  const sheet = result.artifacts.sheet;
  const cells = sheet.rows.map((row) => row.sheetCells ?? {});
  const actual = {
    primaryArtifact: result.primaryArtifact,
    eligible: sheet.eligible,
    rowCount: sheet.count,
    sourceTableRowCount: document.parseResult.canonical.sourceRows
      .filter((row) => row.rowType === 'table_row').length,
    columns: sheet.sheetColumns?.map((column) => column.label) ?? [],
    cells,
    urls: cells.flatMap((row) => Object.values(row))
      .filter((value) => /^https?:\/\//u.test(value)),
  };
  return {
    actual,
    evidence: [
      evidence('원본 표의 Sheet가 활성이다', actual.eligible, true),
      evidence('원본 표는 Sheet를 우선 추천한다', actual.primaryArtifact, 'sheet'),
      evidence('원본 열 이름을 유지한다', actual.columns, ['활동', '담당', '자료']),
      evidence('URL 셀 값을 링크 가능한 문자열로 보존한다', actual.urls, [
        'https://example.com/booking',
        'https://example.com/stay',
      ]),
      evidence('원본 데이터 행과 결과 행이 1:1이다', actual.rowCount, 2),
    ],
    apis: ['createTextAuthoringDocument', 'buildAuthoringArtifactProjection'],
  };
}

function a04(): AcceptanceCaseOutput {
  const rawText = [
    '# 반복 필드 목록',
    '## 실행',
    '- [ ] 첫 항목',
    '  - 날짜: 2026-08-03',
    '  - 장소: 서울',
    '  - 완료 기준: 첫 확인 완료',
    '- [ ] 둘째 항목',
    '  - 날짜: 2026-08-04',
    '  - 장소: 부산',
    '  - 완료 기준: 둘째 확인 완료',
    '- [ ] 셋째 항목',
    '  - 날짜: 2026-08-05',
    '  - 장소: 제주',
    '  - 완료 기준: 셋째 확인 완료',
  ].join('\n');
  const sheet = projection(authoringDocument('A04', rawText)).artifacts.sheet;
  const actual = {
    eligible: sheet.eligible,
    count: sheet.count,
    columns: sheet.sheetColumns?.map((column) => column.label) ?? [],
    rows: sheet.rows.map((row) => row.sheetCells ?? {}),
  };
  return {
    actual,
    evidence: [
      evidence('반복되는 의미 필드 3개가 있으면 Sheet가 활성이다', actual.eligible, true),
      evidence('모든 Item이 Sheet 행으로 남는다', actual.count, 3),
      evidence(
        '항목·날짜·장소·완료 기준 열을 제공한다',
        ['항목', '날짜', '장소', '완료 기준'].every((label) => actual.columns.includes(label)),
        true,
      ),
      evidence('단순 순서 열은 생성하지 않는다', actual.columns.includes('순서'), false),
    ],
    apis: ['createTextAuthoringDocument', 'buildAuthoringArtifactProjection'],
  };
}

function a05(): AcceptanceCaseOutput {
  const rawText = [
    '# 원문과 변환',
    '일반 문장을 그대로 보존합니다.',
    '## 실행',
    '- [ ] 확인 항목',
    '  - 설명: 확인할 내용입니다.',
  ].join('\n');
  const document = authoringDocument('A05', rawText);
  const rows = projection(document).artifacts.todo.rows;
  const plainText = serializeAuthoringPlainText(document.title, rows);
  const markdown = serializeAuthoringMarkdown(document.title, rows);
  const actual = {
    rawCopy: document.rawText,
    rawByteEquivalent: document.rawText === rawText,
    plainText,
    markdown,
    plainTextTransformed: plainText !== rawText,
    markdownTransformed: markdown !== rawText,
    ambiguousLabelPresent: /정리\s*메모/u.test(`${plainText}\n${markdown}`),
  };
  return {
    actual,
    evidence: [
      evidence('원문 그대로 복사는 byte-equivalent다', actual.rawByteEquivalent, true),
      evidence('정리된 TXT는 원문과 다른 변환 결과다', actual.plainTextTransformed, true),
      evidence('정리된 Markdown은 원문과 다른 변환 결과다', actual.markdownTransformed, true),
      evidence('변환 결과에 정리 메모라는 모호한 이름을 넣지 않는다', actual.ambiguousLabelPresent, false),
    ],
    apis: [
      'createTextAuthoringDocument',
      'buildAuthoringArtifactProjection',
      'serializeAuthoringPlainText',
      'serializeAuthoringMarkdown',
    ],
  };
}

function rowDetail(row: AuthoringArtifactRow): JsonRecord {
  return {
    title: row.title,
    description: row.description ?? null,
    completion: row.completion ?? null,
    date: row.date ?? null,
    time: row.time ?? null,
    timezone: row.timezone ?? null,
    place: row.place ?? null,
    durationMinutes: row.durationMinutes ?? null,
    repeat: row.repeat ?? null,
    condition: row.condition ?? null,
    links: row.links.map(({ label, url }) => ({ label, url })),
  };
}

function a06(): AcceptanceCaseOutput {
  const rawText = [
    '# 링크와 상세',
    '## 실행',
    '- [ ] 예약 확인',
    '  - 설명: 예약 정보를 확인합니다.',
    '  - 완료 기준: 예약 번호를 기록함',
    '  - 날짜: 2026-08-03',
    '  - 시간: 09:30',
    '  - 시간대: Asia/Seoul',
    '  - 소요 시간: 45분',
    '  - 장소: 서울역',
    '  - 반복: 매주 월요일',
    '  - 조건: 운행 중일 때',
    '  - 자료: [예약 페이지](https://example.com/booking)',
  ].join('\n');
  const document = authoringDocument('A06', rawText);
  const result = projection(document);
  const calendarRow = result.artifacts.calendar.rows[0];
  const todoRow = result.artifacts.todo.rows[0];
  const tableRows = buildAuthoringTableRows([todoRow]);
  const markdown = serializeAuthoringMarkdown(result.title, [todoRow]);
  const expectedDetail = rowDetail(todoRow);
  const actual = {
    calendar: rowDetail(calendarRow),
    todo: expectedDetail,
    tableColumns: AUTHORING_TABLE_COLUMNS,
    tableRows,
    markdown,
  };
  return {
    actual,
    evidence: [
      evidence('Calendar row가 실행 상세 전체를 제공한다', actual.calendar, expectedDetail),
      evidence('Todo row가 실행 상세와 링크를 제공한다', actual.todo, expectedDetail),
      evidence(
        '표 export의 자료 셀에 URL이 있다',
        tableRows[0]?.some((cell) => String(cell).includes('https://example.com/booking')),
        true,
      ),
      evidence(
        'Markdown 결과에 Markdown 링크가 있다',
        markdown.includes('[예약 페이지](https://example.com/booking)'),
        true,
      ),
    ],
    apis: [
      'createTextAuthoringDocument',
      'buildAuthoringArtifactProjection',
      'buildAuthoringTableRows',
      'serializeAuthoringMarkdown',
    ],
  };
}

function a07(): AcceptanceCaseOutput {
  const owners = Object.entries(AUTHORING_ARTIFACT_FORMATS).flatMap(
    ([artifact, formats]) => formats.map((format) => ({ artifact, format })),
  );
  const tableFormats = AUTHORING_ARTIFACT_FORMATS.sheet;
  const nonSheetTableLeaks = owners.filter(({ artifact, format }) => (
    artifact !== 'sheet' && ['csv', 'tsv', 'xlsx'].includes(format)
  ));
  const rawSourceOwners = owners.filter(({ format }) => format === 'raw_source');
  const actual = {
    formatsByArtifact: AUTHORING_ARTIFACT_FORMATS,
    tableFormats,
    nonSheetTableLeaks,
    rawSourceOwners,
  };
  return {
    actual,
    evidence: [
      evidence('CSV·TSV·XLSX는 Sheet 맥락에만 노출된다', nonSheetTableLeaks, []),
      evidence('Sheet 결과 메뉴가 표 내보내기 형식을 제공한다', tableFormats, ['csv', 'tsv', 'xlsx']),
      evidence('원문 복사는 Memo/text 맥락에만 있다', rawSourceOwners, [{ artifact: 'memo', format: 'raw_source' }]),
    ],
    apis: ['AUTHORING_ARTIFACT_FORMATS'],
  };
}

function a08(): AcceptanceCaseOutput {
  const rawText = [
    '# 번호 가져오기',
    '## 실행',
    '1. 첫 항목',
    '2) 둘째 항목',
    '- [ ] 셋째 항목',
  ].join('\n');
  const document = authoringDocument('A08', rawText);
  const markdown = exportTextAuthoringMarkdown(document);
  const actual = {
    titles: canonicalTitles(document),
    displayedOrdinals: document.parseResult.canonical.items.map((item) => item.order + 1),
    writerItemLines: markdown.split(/\r?\n/u)
      .filter((line) => /^- \[ \] /u.test(line)),
    numberedItemLines: markdown.split(/\r?\n/u)
      .filter((line) => /^\d+[.)]\s+/u.test(line)),
  };
  return {
    actual,
    evidence: [
      evidence('번호 목록을 Item 3개로 읽는다', actual.titles, ['첫 항목', '둘째 항목', '셋째 항목']),
      evidence('canonical order로 1, 2, 3을 계산할 수 있다', actual.displayedOrdinals, [1, 2, 3]),
      evidence('writer는 모든 Item을 canonical 체크박스로 쓴다', actual.writerItemLines.length, 3),
      evidence('writer는 수동 번호 표식을 남기지 않는다', actual.numberedItemLines, []),
    ],
    apis: ['createTextAuthoringDocument', 'exportTextAuthoringMarkdown'],
  };
}

const CASES: Record<V2AutomatedAcceptanceId, () => AcceptanceCaseOutput> = {
  G01: g01,
  G02: g02,
  G03: g03,
  G04: g04,
  G05: g05,
  G06: g06,
  G07: g07,
  G08: g08,
  G09: g09,
  G10: g10,
  D01: d01,
  D02: d02,
  D03: d03,
  D04: d04,
  D05: d05,
  D06: d06,
  D07: d07,
  D08: d08,
  D09: d09,
  A01: a01,
  A02: a02,
  A03: a03,
  A04: a04,
  A05: a05,
  A06: a06,
  A07: a07,
  A08: a08,
};

export function runV2AutomatedAcceptanceScenario(
  id: V2AutomatedAcceptanceId,
): V2AutomatedAcceptanceResult {
  return finalizeCase(id, CASES[id]());
}

export function runV2AutomatedAcceptance(): V2AutomatedAcceptanceResult[] {
  return V2_AUTOMATED_ACCEPTANCE_IDS.map(runV2AutomatedAcceptanceScenario);
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readUiEvidence(
  path: string | null,
): { path: string; document: UiEvidenceDocument } | undefined {
  if (!path || !existsSync(path)) return undefined;

  const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  if (!isJsonRecord(parsed) || !Array.isArray(parsed.checks)) {
    throw new Error('UI evidence must contain a checks array');
  }

  const expectedIds = new Set<string>(V2_BROWSER_QA_IDS);
  const seen = new Set<string>();
  const checks: UiEvidenceCheck[] = [];
  for (const [index, value] of parsed.checks.entries()) {
    if (!isJsonRecord(value) || typeof value.id !== 'string') {
      throw new Error(`UI evidence check at index ${index} must have an id`);
    }
    if (seen.has(value.id)) {
      throw new Error(`duplicate UI evidence id: ${value.id}`);
    }
    seen.add(value.id);
    if (!expectedIds.has(value.id)) {
      throw new Error(`unexpected UI evidence id: ${value.id}`);
    }
    if (typeof value.passed !== 'boolean') {
      throw new Error(`UI evidence ${value.id} must have boolean passed`);
    }
    checks.push(value as UiEvidenceCheck);
  }

  const missing = V2_BROWSER_QA_IDS.filter((id) => !seen.has(id));
  if (missing.length > 0) {
    throw new Error(`missing UI evidence ids: ${missing.join(', ')}`);
  }
  return {
    path,
    document: { ...parsed, checks },
  };
}

function browserEvidenceDetails(check: UiEvidenceCheck): JsonRecord {
  const { id: _id, passed: _passed, ...details } = check;
  return details;
}

function uiEvidenceSource(path: string): string {
  return relative(REPO_ROOT, path).replaceAll('\\', '/');
}

export function buildV2AcceptanceMatrixResults(
  options: BuildV2AcceptanceMatrixResultsOptions = {},
): JsonRecord {
  const matrix = JSON.parse(readFileSync(MATRIX_PATH, 'utf8')) as MatrixDocument;
  const uiEvidence = readUiEvidence(
    options.uiEvidencePath === undefined
      ? UI_EVIDENCE_PATH
      : options.uiEvidencePath,
  );
  const uiChecks = new Map(
    uiEvidence?.document.checks.map((check) => [check.id, check]) ?? [],
  );
  const automated = new Map(
    runV2AutomatedAcceptance().map((result) => [result.id, result]),
  );
  const browserIds = new Set<string>(V2_BROWSER_QA_IDS);
  const expectedIds = [
    ...V2_AUTOMATED_ACCEPTANCE_IDS,
    ...V2_BROWSER_QA_IDS,
  ];
  const matrixIds = matrix.scenarios.map((scenario) => scenario.id);
  if (!isDeepStrictEqual(matrixIds, expectedIds)) {
    throw new Error(`simulation matrix IDs differ: ${JSON.stringify(matrixIds)}`);
  }

  const rows = matrix.scenarios.map((scenario) => {
    const automatedResult = automated.get(scenario.id as V2AutomatedAcceptanceId);
    if (automatedResult) {
      return {
        id: scenario.id,
        group: scenario.group,
        priority: scenario.priority,
        title: scenario.title,
        mode: automatedResult.mode,
        actual: automatedResult.actual,
        pass: automatedResult.pass,
        status: automatedResult.status,
        evidence: automatedResult.evidence,
        apis: automatedResult.apis,
      };
    }
    if (!browserIds.has(scenario.id)) {
      throw new Error(`no acceptance mode for ${scenario.id}`);
    }
    const uiCheck = uiChecks.get(scenario.id);
    if (uiCheck && uiEvidence) {
      const actual = browserEvidenceDetails(uiCheck);
      const { checks: _checks, ...capture } = uiEvidence.document;
      return {
        id: scenario.id,
        group: scenario.group,
        priority: scenario.priority,
        title: scenario.title,
        mode: 'browser_qa',
        actual,
        pass: uiCheck.passed,
        status: uiCheck.passed ? 'passed' : 'failed',
        evidence: [{
          source: uiEvidenceSource(uiEvidence.path),
          checkId: uiCheck.id,
          passed: uiCheck.passed,
          actual,
          capture,
        }],
        apis: [],
      };
    }
    return {
      id: scenario.id,
      group: scenario.group,
      priority: scenario.priority,
      title: scenario.title,
      mode: 'browser_qa',
      actual: {
        execution: 'not_run',
        reason: 'viewport, interaction, focus, accessibility, and browser diagnostics require browser evidence',
      },
      pass: null,
      status: 'pending_browser_qa',
      evidence: [{
        requirement: '브라우저에서 직접 확인할 때까지 자동 통과로 간주하지 않는다',
        expectedEvidence: 'viewport screenshots, interaction assertions, focus/accessibility checks, and browser diagnostics',
        status: 'pending_browser_qa',
      }],
      apis: [],
    };
  });
  const automatedRows = rows.filter((row) => row.mode === 'api_acceptance');
  const browserRows = rows.filter((row) => row.mode === 'browser_qa');
  const apiPassed = automatedRows.filter((row) => row.pass === true).length;
  const apiFailed = automatedRows.filter((row) => row.pass === false).length;
  const browserPassed = browserRows.filter((row) => row.pass === true).length;
  const browserFailed = browserRows.filter((row) => row.pass === false).length;
  return {
    schemaVersion: 'flowme-text-authoring-simulation-matrix-v2-results',
    generatedAt: FIXED_NOW,
    source: 'docs/content-audit/2026-08-04-flowme-text-authoring-grammar-ux-improvement-handoff/simulation-matrix-v2.json',
    sourceSchemaVersion: matrix.schemaVersion,
    claimBoundary: uiEvidence
      ? '내부 API acceptance와 자동 브라우저 QA 기록이다. 사용자 관찰 검증이 아니다.'
      : '내부 API acceptance와 미실행 브라우저 QA 기록이다. 사용자 관찰 검증이 아니다.',
    uiEvidence: uiEvidence
      ? {
          status: 'attached',
          source: uiEvidenceSource(uiEvidence.path),
          checkCount: uiEvidence.document.checks.length,
        }
      : {
          status: 'not_found',
          source: uiEvidenceSource(
            options.uiEvidencePath === undefined
              ? UI_EVIDENCE_PATH
              : options.uiEvidencePath ?? UI_EVIDENCE_PATH,
          ),
          checkCount: 0,
        },
    summary: {
      total: rows.length,
      apiAcceptance: automatedRows.length,
      apiPassed,
      apiFailed,
      browserQa: browserRows.length,
      browserPassed,
      browserFailed,
      passed: apiPassed + browserPassed,
      failed: apiFailed + browserFailed,
      pendingBrowserQa: rows.filter((row) => row.status === 'pending_browser_qa').length,
    },
    rows,
  };
}

export function writeV2AcceptanceMatrixResults(): JsonRecord {
  const results = buildV2AcceptanceMatrixResults();
  mkdirSync(RESULT_DIRECTORY, { recursive: true });
  writeFileSync(RESULT_PATH, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  return results;
}

function main(): void {
  const results = writeV2AcceptanceMatrixResults();
  const summary = results.summary as JsonRecord;
  console.log(JSON.stringify({
    output: 'docs/content-audit/2026-08-04-flowme-text-authoring-grammar-ux-improvement-results/simulation-matrix-v2-results.json',
    ...summary,
  }, null, 2));
  if (summary.failed !== 0) process.exitCode = 1;
}

const currentFile = resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (currentFile === invokedFile) main();
