import type { FlowBundle } from './types';

export type MobileSimulationProtocol = {
  slug: string;
  checkedAt: string;
  persona: string;
  deviceContext: string;
  taskScript: string[];
  requiredArtifacts: string[];
  passSignals: string[];
  failureSignals: string[];
  simulationScore: number;
  scoreRationale: string;
  nextAction: string;
  statusAfterSimulation: string;
};

export type MobileSimulationProtocolSummary = {
  totalCount: number;
  slugs: string[];
  averageScore: number;
  validatedCount: number;
  records: MobileSimulationProtocol[];
};

export const mobileSimulationProtocols: MobileSimulationProtocol[] = [
  {
    slug: 'computer-skills-d30-study',
    checkedAt: '2026-05-25',
    persona:
      'Mobile learner with a fixed exam date who wants to move the plan into a calendar and spreadsheet before studying.',
    deviceContext:
      '375px mobile viewport, one-handed review, sticky artifact export sheet available, desktop table controls hidden.',
    taskScript: [
      'Open the route, enter the exam date, and confirm the first source-derived study rows.',
      'Use the mobile export sheet to export the D-30 calendar and study spreadsheet.',
      'Explain which fields are source scope and which fields the user should edit after export.',
    ],
    requiredArtifacts: [
      'Calendar rows with D-30 study milestones.',
      'Spreadsheet rows with source-derived scope plus target date, status, note, mock score, and retry date.',
    ],
    passSignals: [
      'User can name the calendar output before tapping export.',
      'User understands that source-derived scope rows are prefilled from the content.',
      'User edits only target date, status, notes, wrong answers, score, or retry date.',
    ],
    failureSignals: [
      'User thinks they must design the progress table from scratch instead of using prefilled source rows.',
      'User cannot find the calendar export on mobile.',
      'User treats FLOW as an exam-score guarantee rather than a portable study planner.',
    ],
    simulationScore: 82,
    scoreRationale:
      'The route has the clearest mobile export-first fit, but the observed session still needs to prove users understand prefilled source rows.',
    nextAction:
      'Run one observed mobile session and record whether the user can describe the calendar and study sheet before export.',
    statusAfterSimulation: 'representative-eligible after internal simulation, not validated until real user behavior exists.',
  },
  {
    slug: 'diet-habit-2week',
    checkedAt: '2026-05-25',
    persona:
      'Mobile user who wants to observe meals, activity, sleep, and condition for two weeks without diet prescription.',
    deviceContext:
      '375px mobile viewport, caution copy visible before detailed rows, secondary sections collapsed below the first artifact.',
    taskScript: [
      'Open the route, enter the start date, and confirm the first daily observation row.',
      'Find the stop/consult condition and explain when the user would stop or seek professional guidance.',
      'Export the observation sheet and weekly memo without treating FLOW as a coaching plan.',
    ],
    requiredArtifacts: [
      'Daily observation sheet for meals, activity, sleep, optional measurement, condition, and stop/consult condition.',
      'Weekly observation memo for patterns noticed by the user.',
    ],
    passSignals: [
      'User starts with observation rows rather than weight-loss targets.',
      'User can find stop/consult conditions before exporting the sheet.',
      'User describes the output as a sheet to review patterns later.',
    ],
    failureSignals: [
      'User reads the flow as diet prescription or outcome coaching.',
      'User misses stop/consult conditions on mobile.',
      'User cannot tell which rows belong in the exported observation sheet.',
    ],
    simulationScore: 74,
    scoreRationale:
      'The observation-first rewrite reduces risk, but mobile caution hierarchy and prescription misread risk still need observed evidence.',
    nextAction:
      'Run a mobile-first rehearsal with one realistic week of rows and check whether warning, observation table, and memo stay understandable.',
    statusAfterSimulation: 'public MVP candidate with guardrails after internal simulation, not validated until real user behavior exists.',
  },
  {
    slug: 'new-car-delivery-check',
    checkedAt: '2026-05-25',
    persona:
      'Mobile buyer at a delivery bay who needs defect evidence, photo filenames, dealer confirmation, and a signing boundary memo.',
    deviceContext:
      '375px mobile viewport, noisy in-person setting, evidence table and hold memo must precede secondary inspection sections.',
    taskScript: [
      'Open the route, enter vehicle/dealer context, and fill one defect row with photo filename.',
      'Add dealer confirmation and document status before checking off inspection sections.',
      'Export the evidence sheet and personal hold memo for follow-up.',
    ],
    requiredArtifacts: [
      'Defect evidence table with defect, photo filename, dealer confirmation, document status, and follow-up owner.',
      'Personal hold/signing boundary memo separated from checklist completion.',
    ],
    passSignals: [
      'User fills the evidence table before general checklist completion.',
      'User records dealer confirmation in a field that survives export.',
      'User understands FLOW records evidence and questions, not signing advice.',
    ],
    failureSignals: [
      'User treats checklist completion as acceptance readiness.',
      'User misses dealer confirmation or photo filename fields.',
      'User expects FLOW to decide whether to sign.',
    ],
    simulationScore: 76,
    scoreRationale:
      'Evidence rows are now route-specific, but mobile context is high-pressure and checklist completion can still overpower evidence capture.',
    nextAction:
      'Run a mobile delivery-bay simulation and verify that the evidence table is completed before secondary checklist sections.',
    statusAfterSimulation: 'public MVP candidate with guardrails after internal simulation, not validated until real user behavior exists.',
  },
  {
    slug: 'infant-health-checkup-schedule',
    checkedAt: '2026-06-06',
    persona:
      'Parent with a baby or toddler who wants to confirm the next NHIS checkup round and add the appointment window to the family calendar.',
    deviceContext:
      '375px mobile viewport, baby_age_month anchor shows next NHIS checkup round card, medical caution note visible before action steps.',
    taskScript: [
      'Open the route, enter the baby\'s current age in months, and read which checkup round (차수) applies and the date window.',
      'Use the calendar export to save the checkup date range so both parents can see it.',
      'Note the dental checkup schedule (구강검진 4회) and the caution to confirm results with medical staff.',
    ],
    requiredArtifacts: [
      'Calendar entry covering the next checkup window (e.g., 4~5개월 → 2차 검진) with hospital name placeholder.',
      'Preparation checklist: appointment booking, pre-visit questionnaire (문진표), and next-round reminder.',
    ],
    passSignals: [
      'User can name the next checkup round and month window from the age input without looking it up elsewhere.',
      'User adds the date range to a calendar before leaving the route.',
      'User reads the caution that FLOW helps with scheduling, not developmental assessment.',
    ],
    failureSignals: [
      'User cannot tell which checkup round matches the baby\'s current age from the anchor panel.',
      'User confuses the general checkup (일반검진 8회) count with the dental checkup (구강검진 4회) schedule.',
      'User reads the medical caution as a barrier to starting rather than a scheduling aid framing.',
    ],
    simulationScore: 76,
    scoreRationale:
      'Official NHIS source and calendar destination are a strong fit, and the 8-round schedule is correctly represented in the anchor panel. Score matches new-car because the phase/baby_age_month anchor type is less common and needs one observed mobile session to confirm the age-input-to-calendar handoff works without confusion.',
    nextAction:
      'Run one observed mobile session with a parent of a child under 6 and check whether the checkup round card, date window, and calendar export flow without friction.',
    statusAfterSimulation: 'first-flag candidate (official NHIS source, medical_sensitive), not validated until real user behavior exists.',
  },
];

export function getMobileSimulationProtocol(slug: string): MobileSimulationProtocol | undefined {
  return mobileSimulationProtocols.find((protocol) => protocol.slug === slug);
}

export function summarizeMobileSimulationProtocols(
  bundles: FlowBundle[],
): MobileSimulationProtocolSummary {
  const bundleSlugs = new Set(bundles.map((bundle) => bundle.flow.slug));
  const records = mobileSimulationProtocols.filter((protocol) => bundleSlugs.has(protocol.slug));
  const totalScore = records.reduce((sum, protocol) => sum + protocol.simulationScore, 0);

  return {
    totalCount: records.length,
    slugs: records.map((record) => record.slug),
    averageScore: Math.round(totalScore / Math.max(records.length, 1)),
    validatedCount: records.filter((record) => !record.statusAfterSimulation.includes('not validated')).length,
    records,
  };
}
