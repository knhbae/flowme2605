import type { FlowBundle } from './types';

export const observedSessionEvidenceDecisionOptions = [
  'not run',
  'no signal',
  'friction',
  'candidate signal',
] as const;

export type ObservedSessionDecision = (typeof observedSessionEvidenceDecisionOptions)[number];

export type ObservedSessionEvidenceRecord = {
  id: string;
  slug: string;
  date: string;
  observer: string;
  participantType: string;
  taskRealism: string;
  device: string;
  decision: Exclude<ObservedSessionDecision, 'not run'>;
  decisionReason: string;
  artifactNearCtaResult: string;
  stickyFallbackResult: string;
  exportLoopResult: string;
  friction: string[];
  followUp: string;
  sourceNotePath: string;
  statusAfterSession: string;
};

export type ObservedSessionRouteSummary = {
  slug: string;
  sessionCount: number;
  latestSessionId?: string;
  latestDecision: ObservedSessionDecision;
  artifactNearCtaResult: string;
  stickyFallbackResult: string;
  nextAction: string;
  statusAfterEvidence: string;
};

export type ObservedSessionEvidenceSummary = {
  routeCount: number;
  slugs: string[];
  sessionCount: number;
  notRunCount: number;
  noSignalCount: number;
  frictionCount: number;
  candidateSignalCount: number;
  records: ObservedSessionEvidenceRecord[];
  routeSummaries: ObservedSessionRouteSummary[];
};

export const observedSessionEvidenceRouteSlugs = [
  'computer-skills-d30-study',
  'diet-habit-2week',
  'new-car-delivery-check',
] as const;

export const observedSessionEvidenceRecords: ObservedSessionEvidenceRecord[] = [
  {
    id: '2026-05-25-computer-skills-d30-study-session-00-simulated',
    slug: 'computer-skills-d30-study',
    date: '2026-05-25',
    observer: 'internal',
    participantType: 'internal simulation',
    taskRealism: 'internal walkthrough',
    device: 'desktop and mobile screenshots from PR #48',
    decision: 'no signal',
    decisionReason: 'Internal simulation only; no target-user behavior data was observed.',
    artifactNearCtaResult: 'not observed with a target user',
    stickyFallbackResult: 'not observed with a target user',
    exportLoopResult: 'expected path documented, but no real export-first loop completed by a target user',
    friction: [
      'Mobile source-derived scope is visible, but target date/status may require horizontal scroll.',
      'Users may need to understand why source scope is not editable.',
    ],
    followUp: 'Run the first target-user mobile export session before another study table redesign.',
    sourceNotePath: 'docs/validation-sessions/2026-05-25-computer-skills-d30-study-session-00-simulated.md',
    statusAfterSession: 'internal baseline only, no signal, not validated until real user behavior exists.',
  },
];

export function summarizeObservedSessionEvidence(
  bundles: FlowBundle[],
): ObservedSessionEvidenceSummary {
  const bundleSlugs = new Set(bundles.map((bundle) => bundle.flow.slug));
  const slugs = observedSessionEvidenceRouteSlugs.filter((slug) => bundleSlugs.has(slug));
  const records = observedSessionEvidenceRecords.filter((record) => bundleSlugs.has(record.slug));

  const routeSummaries: ObservedSessionRouteSummary[] = slugs.map((slug) => {
    const routeRecords = records
      .filter((record) => record.slug === slug)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
    const latestRecord = routeRecords.at(-1);
    const latestDecision: ObservedSessionDecision = latestRecord?.decision ?? 'not run';

    return {
      slug,
      sessionCount: routeRecords.length,
      latestSessionId: latestRecord?.id,
      latestDecision,
      artifactNearCtaResult: latestRecord?.artifactNearCtaResult ?? 'not observed yet',
      stickyFallbackResult: latestRecord?.stickyFallbackResult ?? 'not observed yet',
      nextAction: latestRecord?.followUp ?? 'Run the first observed export-first mobile session.',
      statusAfterEvidence:
        latestRecord?.statusAfterSession ?? 'not run yet, not validated until real user behavior exists.',
    };
  });

  return {
    routeCount: slugs.length,
    slugs,
    sessionCount: records.length,
    notRunCount: routeSummaries.filter((record) => record.latestDecision === 'not run').length,
    noSignalCount: records.filter((record) => record.decision === 'no signal').length,
    frictionCount: records.filter((record) => record.decision === 'friction').length,
    candidateSignalCount: records.filter((record) => record.decision === 'candidate signal').length,
    records,
    routeSummaries,
  };
}
