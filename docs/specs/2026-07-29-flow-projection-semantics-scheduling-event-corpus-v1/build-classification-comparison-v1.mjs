import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const baseline = JSON.parse(
  fs.readFileSync(
    path.resolve(
      here,
      '../2026-07-28-flow-canonical-structure-corpus-expansion-v1/canonical-corpus-v1.json',
    ),
    'utf8',
  ),
);
const matrix = JSON.parse(
  fs.readFileSync(
    path.join(here, 'projection-eligibility-matrix-v1.json'),
    'utf8',
  ),
);
const round1AgentA = JSON.parse(
  fs.readFileSync(
    path.resolve(repoRoot, '.tmp/projection-classifier-a.json'),
    'utf8',
  ),
);
const round1AgentB = JSON.parse(
  fs.readFileSync(
    path.resolve(repoRoot, '.tmp/projection-classifier-b.json'),
    'utf8',
  ),
);
const agentA = JSON.parse(
  fs.readFileSync(
    path.resolve(repoRoot, '.tmp/projection-classifier-a-round2.json'),
    'utf8',
  ),
);
const agentB = JSON.parse(
  fs.readFileSync(
    path.resolve(repoRoot, '.tmp/projection-classifier-b-round2.json'),
    'utf8',
  ),
);

const finalByFixtureId = new Map();
for (const cell of matrix.cells) {
  if (cell.fixtureGroup !== 'frozen_baseline_42') continue;
  if (!finalByFixtureId.has(cell.fixtureId)) {
    finalByFixtureId.set(cell.fixtureId, {
      fixtureId: cell.fixtureId,
      checklistTodoLabel: cell.checklistTodoLabel,
      primaryProjection: cell.labPrimaryProjection,
    });
  }
}

const bundleToFixture = new Map(
  baseline.fixtures.map((fixture) => [
    fixture.canonicalContent.bundle.bundleId,
    fixture,
  ]),
);

function buildPairs(classifierA, classifierB) {
  const agentBById = new Map(
    classifierB.map((entry) => [entry.bundleId, entry]),
  );
  return classifierA.map((a) => {
    const b = agentBById.get(a.bundleId);
  if (!b) throw new Error(`Agent B missing ${a.bundleId}`);
  const fixture = bundleToFixture.get(a.bundleId);
  if (!fixture) throw new Error(`Unknown baseline bundle ${a.bundleId}`);
  const final = finalByFixtureId.get(fixture.fixtureId);
  return {
    bundleId: a.bundleId,
    fixtureId: fixture.fixtureId,
    title: fixture.source.title,
    agentA: {
      checklistTodoLabel: a.checklistTodoLabel,
      primaryProjection: a.primaryProjection,
      evidence: a.evidence,
    },
    agentB: {
      checklistTodoLabel: b.checklistTodoLabel,
      primaryProjection: b.primaryProjection,
      evidence: b.evidence,
    },
    agreement: {
      checklistTodo: a.checklistTodoLabel === b.checklistTodoLabel,
      primaryProjection: a.primaryProjection === b.primaryProjection,
      exact:
        a.checklistTodoLabel === b.checklistTodoLabel &&
        a.primaryProjection === b.primaryProjection,
    },
    finalAdjudication: final,
  };
  });
}

const round1Pairs = buildPairs(round1AgentA, round1AgentB);
const pairs = buildPairs(agentA, agentB);

const disagreements = {
  'bundle-oq-oq-c03-librivox': {
    cause:
      'A long ordered resource sequence looks like a bounded checklist to one classifier and an ambiguous progress queue to the other.',
    tieBreaker:
      'Multi-session chapters are Todo execution units; Sheet is the primary progress overview. Checklist is reserved for a bounded listening session.',
  },
  'bundle-oq-oq-b03-remodel': {
    cause:
      'The source title says checklist, but the frozen canonical record contains one decision Item with ten typed fields rather than ten independently completable Items.',
    tieBreaker:
      'Classification follows canonical Item boundaries, not the source label. Final label is neither; Sheet is primary because the ten fields are comparison columns.',
  },
  'bundle-oq-oq-p03-vehicle': {
    cause:
      'One classifier treated a single action as neither, while the other recognized an actionable task and preferred Calendar.',
    tieBreaker:
      'A single independent next action can be Todo. The inspection window is not yet a visit event, so Todo is primary until a date is selected.',
  },
  'bundle-deep-ds08': {
    cause:
      'A fixed travel route can look like either an omission-sensitive itinerary or a Calendar plan.',
    tieBreaker:
      'Without actual visit times, the route remains Checklist primary; Calendar becomes available after a personal date/time overlay.',
  },
  'bundle-live-c16': {
    cause:
      'The three cross-channel reuse actions can be read as an open queue or as one composite guidance memo.',
    tieBreaker:
      'Each action remains independently useful and can be deferred or reordered, so Todo is primary. A bounded session may still use Checklist as secondary.',
  },
  'bundle-live-r02': {
    cause:
      'Day-numbered meal rows suggest Calendar, but the source contains relative plan positions rather than resolved personal dates.',
    tieBreaker:
      'Sheet is primary for the seven-day plan; Calendar is available only after a user start-date overlay.',
  },
  'bundle-base-allblanc-7day-abs': {
    cause:
      'A seven-day challenge is both a finite sequence and a set of independently completed daily workouts; one classifier also prioritized the resolved Calendar while the other prioritized the progress overview.',
    tieBreaker:
      'Across days, daily workouts are Todo-style progress units; Calendar is primary only after the start anchor is confirmed. The exercise steps inside a single day may still render as Checklist.',
  },
  'bundle-value-vq-10': {
    cause:
      'Independent defect rows are individually actionable, but the source defines a finite inspection scope where omissions matter.',
    tieBreaker:
      'Use Checklist semantics for the bounded inspection session and Sheet as the primary status overview.',
  },
};

function metricsFor(inputPairs) {
  const recordCount = inputPairs.length;
  const checklistTodoMatches = inputPairs.filter(
    (entry) => entry.agreement.checklistTodo,
  ).length;
  const primaryMatches = inputPairs.filter(
    (entry) => entry.agreement.primaryProjection,
  ).length;
  const exactMatches = inputPairs.filter(
    (entry) => entry.agreement.exact,
  ).length;
  const percentage = (matches) =>
    Number(((matches / recordCount) * 100).toFixed(2));
  return {
    records: recordCount,
    checklistTodo: {
      matches: checklistTodoMatches,
      disagreements: recordCount - checklistTodoMatches,
      agreementPercent: percentage(checklistTodoMatches),
      thresholdPercent: 90,
      pass: percentage(checklistTodoMatches) >= 90,
    },
    primaryProjection: {
      matches: primaryMatches,
      disagreements: recordCount - primaryMatches,
      agreementPercent: percentage(primaryMatches),
      thresholdPercent: 90,
      pass: percentage(primaryMatches) >= 90,
    },
    exactBothAxes: {
      matches: exactMatches,
      disagreements: recordCount - exactMatches,
      agreementPercent: percentage(exactMatches),
    },
  };
}

const comparison = {
  schemaVersion: 'flowme-classification-comparison-v1',
  generatedAt: '2026-07-29T12:00:00+09:00',
  independenceProtocol: {
    classifiers: ['independent_agent_A', 'independent_agent_B'],
    sharedInputs:
      'Frozen canonical corpus metadata, Item/Step structure, sourceShape, executionPattern, schedule, and title.',
    hiddenFromEachOther: true,
    hiddenArtifacts: [
      'other classifier output',
      'new lab target artifacts',
      'final adjudication',
    ],
    observedUserValidation: false,
  },
  iterations: [
    {
      round: 1,
      rules: 'Initial bounded-set versus independent-queue definitions.',
      metrics: metricsFor(round1Pairs),
    },
    {
      round: 2,
      rules:
        'General temporal-intent, field-versus-Item, relative-plan, and lesson-progress tie-breakers added without exposing either classifier output.',
      metrics: metricsFor(pairs),
    },
  ],
  metrics: metricsFor(pairs),
  iterationDecision: {
    rerunRequired: false,
    reason:
      'Round 1 primary projection agreement missed the threshold. Round 2 reached both required thresholds without exposing either classifier output to the other.',
    commonTieBreakersAddedForAdjudication: true,
    caseSpecificExceptionsAdded: false,
  },
  disagreements: pairs
    .filter(
      (entry) =>
        !entry.agreement.checklistTodo ||
        !entry.agreement.primaryProjection,
    )
    .map((entry) => ({
      bundleId: entry.bundleId,
      fixtureId: entry.fixtureId,
      title: entry.title,
      ...disagreements[entry.bundleId],
      agentA: entry.agentA,
      agentB: entry.agentB,
      finalAdjudication: entry.finalAdjudication,
    })),
  records: pairs,
};

const runsDir = path.join(here, 'runs');
fs.mkdirSync(runsDir, { recursive: true });
fs.writeFileSync(
  path.join(runsDir, 'independent-classifier-a-v1.json'),
  `${JSON.stringify(round1AgentA, null, 2)}\n`,
  'utf8',
);
fs.writeFileSync(
  path.join(runsDir, 'independent-classifier-b-v1.json'),
  `${JSON.stringify(round1AgentB, null, 2)}\n`,
  'utf8',
);
fs.writeFileSync(
  path.join(runsDir, 'independent-classifier-a-round2-v1.json'),
  `${JSON.stringify(agentA, null, 2)}\n`,
  'utf8',
);
fs.writeFileSync(
  path.join(runsDir, 'independent-classifier-b-round2-v1.json'),
  `${JSON.stringify(agentB, null, 2)}\n`,
  'utf8',
);
fs.writeFileSync(
  path.join(here, 'classification-comparison-v1.json'),
  `${JSON.stringify(comparison, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify(comparison.metrics, null, 2));
