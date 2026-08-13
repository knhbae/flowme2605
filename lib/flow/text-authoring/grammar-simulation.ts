import {
  buildAuthoringArtifactProjection,
  type AuthoringArtifactKind,
} from './artifact-projection';
import { serializeAuthoringIcs } from './file-export';
import { createTextAuthoringDocument } from './parser';
import type {
  AuthoringInputKind,
  CreateTextAuthoringDocumentOptions,
} from './types';
import { validateTextAuthoringDocument } from './validation';

export type GrammarSimulationGroup =
  | 'existing_content'
  | 'condition_change'
  | 'compatibility'
  | 'exception_handling'
  | 'review_needed';

export type GrammarSimulationExpectation = {
  title?: string;
  inputKinds?: AuthoringInputKind[];
  itemCount?: number;
  stepCount?: number;
  primaryArtifact?: AuthoringArtifactKind;
  artifactCounts?: Partial<Record<AuthoringArtifactKind, number>>;
  issueCount?: number;
  issueTypes?: string[];
  issueMessageKeys?: string[];
  dateRange?: { start: string; end: string } | null;
  firstItemTitle?: string;
  lastItemTitle?: string;
  repeatValues?: string[];
  conditionValues?: string[];
  resourceUrls?: string[];
  icsEventCount?: number;
  icsHasRrule?: boolean;
};

export type GrammarSimulationScenario = {
  id: string;
  group: GrammarSimulationGroup;
  title: string;
  summary: string;
  sourceShape: string;
  naturalDestination: AuthoringArtifactKind | 'review';
  rawText: string;
  anchor?: string;
  comparisonKey?: string;
  changeLabel?: string;
  sourceReference?: string;
  options?: Omit<
    CreateTextAuthoringDocumentOptions,
    'documentId' | 'fixtureVersion' | 'now'
  >;
  expected: GrammarSimulationExpectation;
  boundary: string;
};

export type GrammarSimulationCheck = {
  key: string;
  label: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
};

export type GrammarSimulationScheduleObservation = {
  itemTitle: string;
  kind: 'relative' | 'absolute';
  raw: string;
  date?: string;
  dayOffset?: number;
  anchorLabel?: string;
  time?: string;
  timezone?: string;
  durationMinutes?: number;
  repeat?: string;
};

export type GrammarSimulationResult = {
  id: string;
  group: GrammarSimulationGroup;
  title: string;
  summary: string;
  sourceShape: string;
  naturalDestination: GrammarSimulationScenario['naturalDestination'];
  comparisonKey?: string;
  changeLabel?: string;
  sourceReference?: string;
  boundary: string;
  anchor?: string;
  passed: boolean;
  checks: GrammarSimulationCheck[];
  observations: {
    flowTitle: string;
    inputKinds: AuthoringInputKind[];
    stepCount: number;
    itemCount: number;
    sourceRowCount: number;
    sourcePreserved: boolean;
    validationValid: boolean;
    parserPrimaryArtifact: string;
    parserCalendarCandidateCount: number;
    primaryArtifact: AuthoringArtifactKind;
    secondaryArtifacts: AuthoringArtifactKind[];
    artifactCounts: Record<AuthoringArtifactKind, number>;
    dateRange: { start: string; end: string } | null;
    issueCount: number;
    issueTypes: string[];
    issueMessageKeys: string[];
    firstItemTitle?: string;
    lastItemTitle?: string;
    schedules: GrammarSimulationScheduleObservation[];
    repeatValues: string[];
    conditionValues: string[];
    resourceUrls: string[];
    calendarLossReasons: string[];
    icsEventCount: number;
    icsHasRrule: boolean;
  };
};

const FIXED_NOW = '2026-07-31T00:00:00.000Z';
const ARTIFACTS: AuthoringArtifactKind[] = [
  'calendar',
  'todo',
  'sheet',
  'memo',
];

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function equality(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function makeCheck(
  key: string,
  label: string,
  actual: unknown,
  expected: unknown,
): GrammarSimulationCheck {
  return {
    key,
    label,
    actual,
    expected,
    passed: equality(actual, expected),
  };
}

export function runGrammarSimulationScenario(
  scenario: GrammarSimulationScenario,
): GrammarSimulationResult {
  const document = createTextAuthoringDocument(scenario.rawText, {
    ...scenario.options,
    documentId: `grammar-simulation-${scenario.id}`,
    fixtureVersion: scenario.group === 'compatibility'
      ? 'flowme-grammar-simulation-v1'
      : 'flowme-grammar-simulation-v2',
    now: FIXED_NOW,
  });
  const projection = buildAuthoringArtifactProjection(document, {
    ...(scenario.anchor ? { anchor: scenario.anchor } : {}),
  });
  const validation = validateTextAuthoringDocument(document);
  const items = document.parseResult.canonical.items;
  const calendarRows = projection.artifacts.calendar.rows;
  const ics = serializeAuthoringIcs(
    projection.title,
    calendarRows,
    FIXED_NOW,
  );
  const repeatValues = sortedUnique(
    items.flatMap((item) => item.properties
      .filter((property) => property.key === 'repeat')
      .map((property) => property.value)),
  );
  const conditionValues = sortedUnique(
    items.flatMap((item) => item.properties
      .filter((property) => property.key === 'condition')
      .map((property) => property.value)),
  );
  const schedules = items.flatMap((item) => {
    const schedule = item.schedule;
    if (!schedule) return [];
    return [{
      itemTitle: item.title,
      kind: schedule.kind,
      raw: schedule.raw,
      ...(schedule.kind === 'absolute'
        ? { date: schedule.date }
        : {
            dayOffset: schedule.dayOffset,
            ...(schedule.anchorLabel
              ? { anchorLabel: schedule.anchorLabel }
              : {}),
          }),
      ...(schedule.time ? { time: schedule.time } : {}),
      ...(schedule.timezone ? { timezone: schedule.timezone } : {}),
      ...(schedule.durationMinutes != null
        ? { durationMinutes: schedule.durationMinutes }
        : {}),
      ...(schedule.repeat ? { repeat: schedule.repeat } : {}),
    } satisfies GrammarSimulationScheduleObservation];
  });
  const artifactCounts = Object.fromEntries(
    ARTIFACTS.map((artifact) => [
      artifact,
      projection.artifacts[artifact].count,
    ]),
  ) as Record<AuthoringArtifactKind, number>;
  const dateRange = projection.artifacts.calendar.dateRange ?? null;
  const observations: GrammarSimulationResult['observations'] = {
    flowTitle: document.parseResult.canonical.flow.title,
    inputKinds: document.inputKinds,
    stepCount: document.parseResult.canonical.steps.length,
    itemCount: items.length,
    sourceRowCount: document.parseResult.canonical.sourceRows.length,
    sourcePreserved: document.rawText === scenario.rawText
      && projection.sourceMutationCount === 0,
    validationValid: validation.valid,
    parserPrimaryArtifact: document.parseResult.artifactEligibility.primary,
    parserCalendarCandidateCount:
      document.parseResult.artifactEligibility.counts.calendar,
    primaryArtifact: projection.primaryArtifact,
    secondaryArtifacts: projection.secondaryArtifacts,
    artifactCounts,
    dateRange,
    issueCount: document.parseResult.issues.length,
    issueTypes: document.parseResult.issues.map((issue) => issue.type),
    issueMessageKeys: document.parseResult.issues.map(
      (issue) => issue.messageKey,
    ),
    ...(items[0]?.title ? { firstItemTitle: items[0].title } : {}),
    ...(items.at(-1)?.title ? { lastItemTitle: items.at(-1)?.title } : {}),
    schedules,
    repeatValues,
    conditionValues,
    resourceUrls: sortedUnique(items.flatMap((item) => [
      ...item.resources.map((resource) => resource.url),
      ...item.sources.map((source) => source.url),
    ])),
    calendarLossReasons: projection.artifacts.calendar.losses.map(
      (loss) => loss.reason,
    ),
    icsEventCount: ics.match(/^BEGIN:VEVENT$/gmu)?.length ?? 0,
    icsHasRrule: /^RRULE:/gmu.test(ics),
  };
  const expected = scenario.expected;
  const checks: GrammarSimulationCheck[] = [
    makeCheck('source-preserved', '원문 불변', observations.sourcePreserved, true),
    makeCheck('validation', '문서 검증', observations.validationValid, true),
  ];

  if (expected.title !== undefined) {
    checks.push(makeCheck('title', 'Flow 제목', observations.flowTitle, expected.title));
  }
  if (expected.inputKinds !== undefined) {
    checks.push(makeCheck(
      'input-kinds',
      '입력 형식',
      observations.inputKinds,
      expected.inputKinds,
    ));
  }
  if (expected.itemCount !== undefined) {
    checks.push(makeCheck(
      'item-count',
      'Item 수',
      observations.itemCount,
      expected.itemCount,
    ));
  }
  if (expected.stepCount !== undefined) {
    checks.push(makeCheck(
      'step-count',
      'Step 수',
      observations.stepCount,
      expected.stepCount,
    ));
  }
  if (expected.primaryArtifact !== undefined) {
    checks.push(makeCheck(
      'primary-artifact',
      '주 산출물',
      observations.primaryArtifact,
      expected.primaryArtifact,
    ));
  }
  if (expected.artifactCounts !== undefined) {
    for (const artifact of ARTIFACTS) {
      const expectedCount = expected.artifactCounts[artifact];
      if (expectedCount === undefined) continue;
      checks.push(makeCheck(
        `artifact-${artifact}`,
        `${artifact} 행 수`,
        observations.artifactCounts[artifact],
        expectedCount,
      ));
    }
  }
  if (expected.issueCount !== undefined) {
    checks.push(makeCheck(
      'issue-count',
      '해석 이슈 수',
      observations.issueCount,
      expected.issueCount,
    ));
  }
  if (expected.issueTypes !== undefined) {
    checks.push(makeCheck(
      'issue-types',
      '이슈 유형',
      observations.issueTypes,
      expected.issueTypes,
    ));
  }
  if (expected.issueMessageKeys !== undefined) {
    checks.push(makeCheck(
      'issue-message-keys',
      '이슈 메시지',
      observations.issueMessageKeys,
      expected.issueMessageKeys,
    ));
  }
  if (expected.dateRange !== undefined) {
    checks.push(makeCheck(
      'date-range',
      '캘린더 날짜 범위',
      observations.dateRange,
      expected.dateRange,
    ));
  }
  if (expected.firstItemTitle !== undefined) {
    checks.push(makeCheck(
      'first-title',
      '첫 Item',
      observations.firstItemTitle,
      expected.firstItemTitle,
    ));
  }
  if (expected.lastItemTitle !== undefined) {
    checks.push(makeCheck(
      'last-title',
      '마지막 Item',
      observations.lastItemTitle,
      expected.lastItemTitle,
    ));
  }
  if (expected.repeatValues !== undefined) {
    checks.push(makeCheck(
      'repeat-values',
      '반복 문구',
      observations.repeatValues,
      expected.repeatValues,
    ));
  }
  if (expected.conditionValues !== undefined) {
    checks.push(makeCheck(
      'condition-values',
      '조건 문구',
      observations.conditionValues,
      expected.conditionValues,
    ));
  }
  if (expected.resourceUrls !== undefined) {
    checks.push(makeCheck(
      'resource-urls',
      '자료·출처 URL',
      observations.resourceUrls,
      expected.resourceUrls,
    ));
  }
  if (expected.icsEventCount !== undefined) {
    checks.push(makeCheck(
      'ics-events',
      'ICS VEVENT 수',
      observations.icsEventCount,
      expected.icsEventCount,
    ));
  }
  if (expected.icsHasRrule !== undefined) {
    checks.push(makeCheck(
      'ics-rrule',
      'ICS RRULE 생성',
      observations.icsHasRrule,
      expected.icsHasRrule,
    ));
  }

  return {
    id: scenario.id,
    group: scenario.group,
    title: scenario.title,
    summary: scenario.summary,
    sourceShape: scenario.sourceShape,
    naturalDestination: scenario.naturalDestination,
    ...(scenario.comparisonKey
      ? { comparisonKey: scenario.comparisonKey }
      : {}),
    ...(scenario.changeLabel ? { changeLabel: scenario.changeLabel } : {}),
    ...(scenario.sourceReference
      ? { sourceReference: scenario.sourceReference }
      : {}),
    boundary: scenario.boundary,
    ...(scenario.anchor ? { anchor: scenario.anchor } : {}),
    passed: checks.every((check) => check.passed),
    checks,
    observations,
  };
}

export function runGrammarSimulation(
  scenarios: GrammarSimulationScenario[],
): GrammarSimulationResult[] {
  return scenarios.map(runGrammarSimulationScenario);
}
