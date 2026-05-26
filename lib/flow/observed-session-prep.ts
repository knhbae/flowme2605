import type { FlowBundle } from './types';

export type ObservedSessionPrepRecord = {
  slug: string;
  sessionGoal: string;
  moderatorPrompt: string;
  expectedArtifacts: string[];
  screenshotTargets: string[];
  passSignals: string[];
  failureSignals: string[];
  handoffNote: string;
  statusAfterPrep: string;
};

export type ObservedSessionPrepSummary = {
  totalCount: number;
  slugs: string[];
  validatedCount: number;
  records: ObservedSessionPrepRecord[];
};

export const observedSessionPrepRecords: ObservedSessionPrepRecord[] = [
  {
    slug: 'computer-skills-d30-study',
    sessionGoal:
      'Check whether a mobile learner understands the D-30 calendar and source-derived study sheet before export.',
    moderatorPrompt:
      'Enter an exam date, explain the first source-derived row, then export the calendar and sheet without editing source scope.',
    expectedArtifacts: [
      'D-30 calendar export with study milestones',
      'Study sheet with source scope, target date, status, note, mock score, and retry date',
    ],
    screenshotTargets: [
      'mobile first artifact screen',
      'source-derived study summary card',
      'mobile export sheet after one checked action',
    ],
    passSignals: [
      'User can describe the calendar output before tapping export.',
      'User distinguishes source scope from target date, status, and note.',
      'User does not treat the route as exam-score advice.',
    ],
    failureSignals: [
      'User thinks the source rows must be created from scratch.',
      'User edits source scope instead of the user-owned fields.',
      'User cannot find spreadsheet or calendar export on mobile.',
    ],
    handoffNote:
      'Record the first hesitation point and whether the user can say what goes to calendar versus sheet.',
    statusAfterPrep: 'observed-session prep package ready, not validated until real user behavior exists.',
  },
  {
    slug: 'diet-habit-2week',
    sessionGoal:
      'Check whether a mobile user starts from observation and stop/consult conditions rather than diet prescription.',
    moderatorPrompt:
      'Enter a start date, fill one daily observation row, find the stop/consult condition, then export the sheet.',
    expectedArtifacts: [
      'Observation sheet for meal, activity, sleep, condition, and stop/consult condition',
      'Weekly observation memo for patterns noticed by the user',
    ],
    screenshotTargets: [
      'mobile first artifact screen',
      'stop/consult warning area',
      'spreadsheet export control and resulting sheet columns',
    ],
    passSignals: [
      'User describes the output as an observation sheet.',
      'User can point to stop/consult conditions before export.',
      'User does not read FLOW as outcome coaching.',
    ],
    failureSignals: [
      'User asks what diet target FLOW recommends.',
      'User misses the warning before exporting.',
      'User cannot identify which rows survive in the sheet.',
    ],
    handoffNote:
      'Capture whether warning language is seen before or after table interaction.',
    statusAfterPrep: 'observed-session prep package ready, not validated until real user behavior exists.',
  },
  {
    slug: 'new-car-delivery-check',
    sessionGoal:
      'Check whether a mobile buyer records evidence and dealer confirmation before checklist completion.',
    moderatorPrompt:
      'Fill one defect row with a photo filename, add dealer confirmation, then export the evidence sheet and memo.',
    expectedArtifacts: [
      'Defect evidence sheet with photo filename, dealer confirmation, document status, and follow-up owner',
      'Personal hold/signing boundary memo',
    ],
    screenshotTargets: [
      'mobile evidence-first workbench',
      'dealer confirmation field',
      'secondary checklist collapsed below the evidence artifact',
    ],
    passSignals: [
      'User fills evidence before checking generic inspection items.',
      'User records dealer confirmation in an exportable field.',
      'User understands FLOW does not decide whether to sign.',
    ],
    failureSignals: [
      'User treats checked items as acceptance readiness.',
      'User misses photo filename or dealer confirmation.',
      'User expects FLOW to make the signing decision.',
    ],
    handoffNote:
      'Record whether the evidence table or checklist receives the first tap.',
    statusAfterPrep: 'observed-session prep package ready, not validated until real user behavior exists.',
  },
];

export function summarizeObservedSessionPrep(bundles: FlowBundle[]): ObservedSessionPrepSummary {
  const bundleSlugs = new Set(bundles.map((bundle) => bundle.flow.slug));
  const records = observedSessionPrepRecords.filter((record) => bundleSlugs.has(record.slug));

  return {
    totalCount: records.length,
    slugs: records.map((record) => record.slug),
    validatedCount: records.filter((record) => !record.statusAfterPrep.includes('not validated')).length,
    records,
  };
}
