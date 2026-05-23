import type { FlowBundle, PrimaryDestination, StructureType } from './types';

export type UxContentSimplificationDecision =
  | 'keep_simple'
  | 'simplify_first_screen'
  | 'public_mvp_with_guardrails';

export type UxContentSimplificationScores = {
  understanding: number;
  firstScreenClarity: number;
  exportability: number;
  cognitiveLoad: number;
  sourceSafety: number;
};

export type UxContentSimplificationAudit = {
  slug: string;
  checkedAt: string;
  decision: UxContentSimplificationDecision;
  primaryDestination: PrimaryDestination;
  structureType: StructureType;
  persona: string;
  scenario: string;
  naturalArtifactSimulation: string[];
  firstScreenFinding: string;
  currentFlowGap: string;
  keepOnFirstScreen: string[];
  moveBelowFold: string[];
  contentUxReinforcement: string;
  copyFix: string;
  riskBoundary: string;
  nextAction: string;
  scores: UxContentSimplificationScores;
};

export type UxContentSimplificationSummary = {
  totalCount: number;
  slugs: string[];
  decisionCounts: Record<UxContentSimplificationDecision, number>;
  audits: UxContentSimplificationAudit[];
};

const emptyDecisionCounts: Record<UxContentSimplificationDecision, number> = {
  keep_simple: 0,
  simplify_first_screen: 0,
  public_mvp_with_guardrails: 0,
};

export const uxContentSimplificationAudits: UxContentSimplificationAudit[] = [
  {
    slug: 'moving-d30-basic',
    checkedAt: '2026-05-23',
    decision: 'keep_simple',
    primaryDestination: 'hybrid',
    structureType: 'timeline',
    persona:
      'A renter moving on a fixed date wants deadlines in a calendar and a short vendor/contact sheet without learning a new planning app.',
    scenario: 'Open the route, enter the move date, export a D-30 schedule, and check the first vendor task.',
    naturalArtifactSimulation: [
      'moveDate=2026-06-27, leaseType=jeonse, moveType=packed move',
      'calendar: 2026-05-28 vendor estimates, 2026-06-13 utility/address changes, 2026-06-26 final packing',
      'sheet: vendor name, quote, confirmed time, deposit, contact, proof memo',
    ],
    firstScreenFinding:
      'The first screen already points to a calendar and checklist job; this should remain the baseline for simple export-first Flow UX.',
    currentFlowGap:
      'The route is useful, but any extra source explanation or internal record prompt would make a low-risk timeline feel heavier than a calendar app.',
    keepOnFirstScreen: ['move date input', 'D-30 calendar preview', 'next checklist item', 'spreadsheet export button'],
    moveBelowFold: ['long explanatory copy', 'secondary source notes', 'advanced record keeping'],
    contentUxReinforcement:
      'Keep the artifact as calendar plus vendor/proof sheet; do not add native project-management features before user behavior data exists.',
    copyFix: 'Use date and tool copy such as "put the D-30 moving schedule into my calendar" instead of generic management language.',
    riskBoundary: 'Low-risk logistics. FLOW schedules and tracks tasks; it does not validate contracts or vendor reliability.',
    nextAction: 'Use moving as the reference for the simplest first-screen hierarchy.',
    scores: {
      understanding: 3,
      firstScreenClarity: 3,
      exportability: 3,
      cognitiveLoad: 3,
      sourceSafety: 3,
    },
  },
  {
    slug: 'baby-food-menu-recipe',
    checkedAt: '2026-05-23',
    decision: 'simplify_first_screen',
    primaryDestination: 'hybrid',
    structureType: 'phase',
    persona:
      'A parent introducing baby food this week needs a menu calendar and a reaction log while keeping allergy-watch cautions visible.',
    scenario: 'Start from baby age or start date, follow meal slots, record reaction signals, and export the plan.',
    naturalArtifactSimulation: [
      'startDate=2026-06-01, babyAge=6 months, newIngredient=broccoli',
      'calendar: day 1 rice porridge, day 2 repeat broccoli, day 3 allergy-watch review',
      'sheet: fed time, amount, skin reaction, vomiting/diarrhea, stool, sleep, preference note',
    ],
    firstScreenFinding:
      'The Flow needs the menu calendar and allergy-watch reaction log first; recipe details are useful but compete with the first action.',
    currentFlowGap:
      'Meal-plan richness can make the page feel like a recipe app before the parent sees the calendar and reaction-log job.',
    keepOnFirstScreen: ['baby age/start context', 'next meal slot', 'reaction log fields', 'allergy-watch caution'],
    moveBelowFold: ['full recipe details', 'ingredient background', 'secondary cooking notes'],
    contentUxReinforcement:
      'Make the first artifact a baby-food calendar plus reaction sheet, then reveal recipes as supporting detail.',
    copyFix: 'Lead with "record today’s new ingredient and reaction signs" rather than broad meal-management wording.',
    riskBoundary: 'Family health-adjacent content. FLOW records allergy-watch signals and points to professional care; it does not diagnose allergy.',
    nextAction: 'Simplify the first screen around meal slot plus reaction log before further representative promotion.',
    scores: {
      understanding: 2,
      firstScreenClarity: 2,
      exportability: 3,
      cognitiveLoad: 2,
      sourceSafety: 3,
    },
  },
  {
    slug: 'passport-renewal-docs',
    checkedAt: '2026-05-23',
    decision: 'keep_simple',
    primaryDestination: 'memo',
    structureType: 'checklist',
    persona:
      'A traveler renewing a passport needs a submission memo and document checklist they can copy before visiting an office.',
    scenario: 'Confirm required documents, write the submission context, and copy the memo/checklist.',
    naturalArtifactSimulation: [
      'travelDate=2026-08-15, applicant=adult renewal, submissionPlace=local passport office',
      'memo: applicant type, photo prepared, old passport status, emergency contact, office note',
      'checklist: application form, ID, photo, fee, pickup method, official source URL',
    ],
    firstScreenFinding:
      'The route is naturally simple because the user wants a submission requirement memo and checklist, not a full schedule.',
    currentFlowGap:
      'The page should avoid presenting every supported output equally; memo/checklist is the primary job and calendar is secondary unless a deadline exists.',
    keepOnFirstScreen: ['applicant context', 'submission requirement memo', 'document checklist', 'official source link'],
    moveBelowFold: ['calendar emphasis without a deadline', 'extra Flow platform explanation', 'creator-style notes'],
    contentUxReinforcement:
      'Keep official facts separate and make the memo copyable for Notion, notes, or a printed visit checklist.',
    copyFix: 'Name the output as a submission requirement memo so the user knows what they can paste into notes.',
    riskBoundary: 'Official administrative content. FLOW helps organize requirements; the user must verify final rules with the official source.',
    nextAction: 'Use as the memo-first official route benchmark.',
    scores: {
      understanding: 3,
      firstScreenClarity: 3,
      exportability: 3,
      cognitiveLoad: 3,
      sourceSafety: 3,
    },
  },
  {
    slug: 'used-car-buying-check',
    checkedAt: '2026-05-23',
    decision: 'simplify_first_screen',
    primaryDestination: 'sheet',
    structureType: 'checklist',
    persona:
      'A buyer comparing two used cars wants a candidate table first, then a field checklist after narrowing the choice.',
    scenario: 'Enter two car candidates, compare risk/price/history notes, then check inspection tasks.',
    naturalArtifactSimulation: [
      'candidateA=2020 Avante 14.5M KRW 60k km, candidateB=2019 K3 12.5M KRW 80k km',
      'comparison: price, mileage, accident history, inspection date, seller memo, hold reason',
      'checklist: registration document, insurance history, test drive note, mechanic inspection',
    ],
    firstScreenFinding:
      'The comparison artifact should dominate the first screen; a long checklist before candidates makes the Flow feel like a generic article.',
    currentFlowGap:
      'The route has the right comparison support, but the checklist and comparison can still compete when the user’s first job is choosing between cars.',
    keepOnFirstScreen: ['candidate comparison table', 'inspection risk rows', 'hold/buy decision note', 'sheet export'],
    moveBelowFold: ['long generic buying checklist', 'non-decision explanation', 'secondary source context'],
    contentUxReinforcement:
      'Treat the Flow as a buyer decision sheet first and a checklist second.',
    copyFix: 'Use candidate-specific labels such as "compare seller memo and hold reason" instead of broad buying-check language.',
    riskBoundary: 'Money-at-risk purchase. FLOW structures comparison evidence; it does not certify vehicle condition or tell the user to buy.',
    nextAction: 'Tighten first-screen hierarchy so comparison rows appear before general checklist density.',
    scores: {
      understanding: 2,
      firstScreenClarity: 2,
      exportability: 3,
      cognitiveLoad: 2,
      sourceSafety: 3,
    },
  },
  {
    slug: 'computer-skills-d30-study',
    checkedAt: '2026-05-23',
    decision: 'keep_simple',
    primaryDestination: 'hybrid',
    structureType: 'timeline',
    persona:
      'A learner with a fixed computer-skills exam date needs a D-30 calendar and score log that can live outside FLOW.',
    scenario: 'Enter exam date, review today’s study task, add weak-area notes, and export calendar plus xlsx.',
    naturalArtifactSimulation: [
      'examDate=2026-06-22, weakArea=spreadsheet functions, dailyWindow=weekday 60m',
      'calendar: D-30 setup, D-21 spreadsheet functions, D-7 mock exam, D-1 supplies',
      'sheet: chapter, target date, mock score, wrong-answer type, retry date',
    ],
    firstScreenFinding:
      'The route is a good representative baseline: D-30 calendar and score sheet are visible enough to explain the job quickly.',
    currentFlowGap:
      'Adding a richer native study tracker would blur the initial value; the user first needs portable calendar and score sheet outputs.',
    keepOnFirstScreen: ['D-30 exam date input', 'calendar preview', 'chapter progress table', 'mock score sheet'],
    moveBelowFold: ['native study dashboard ideas', 'long motivation copy', 'non-essential creator explanation'],
    contentUxReinforcement:
      'Keep this as the low-risk representative example for export-first behavior.',
    copyFix: 'Keep copy tied to exam date, weak area, score, wrong-answer type, and retry date.',
    riskBoundary: 'Low-risk study workflow. FLOW tracks preparation; it does not promise exam results.',
    nextAction: 'Use as the control route when simplifying more complex public candidates.',
    scores: {
      understanding: 3,
      firstScreenClarity: 3,
      exportability: 3,
      cognitiveLoad: 3,
      sourceSafety: 3,
    },
  },
  {
    slug: 'new-car-delivery-check',
    checkedAt: '2026-05-23',
    decision: 'public_mvp_with_guardrails',
    primaryDestination: 'sheet',
    structureType: 'checklist',
    persona:
      'A buyer standing at the delivery bay needs to document defects and dealer confirmation before deciding what to sign.',
    scenario: 'Record vehicle, defect photo filenames, dealer confirmation, document status, and a personal handover boundary memo.',
    naturalArtifactSimulation: [
      'deliveryDate=2026-06-03, vehicle=Avante CN7 white VIN ending 4821, dealer=Mapo branch Kim',
      'sheet: defect, photo filename, dealer confirmation, document status, follow-up owner',
      'memo: do not sign until repair memo is attached; FLOW does not decide acceptance',
    ],
    firstScreenFinding:
      'The evidence sheet and proof memo now make the page usable, but the first screen must keep evidence capture ahead of generic checklist completion.',
    currentFlowGap:
      'Money-at-risk language can feel like advice if the handover boundary is not visibly separated from checklist completion.',
    keepOnFirstScreen: ['vehicle/dealer context', 'defect evidence rows', 'photo filename field', 'handover boundary memo'],
    moveBelowFold: ['general inspection explanation', 'secondary nice-to-check items', 'any contract-decision automation'],
    contentUxReinforcement:
      'Keep the evidence memo beside the comparison table and make export the main success path.',
    copyFix: 'Use proof-oriented copy such as "record photo file and dealer confirmation before signing."',
    riskBoundary: 'Money-at-risk handover. FLOW records evidence and questions; it does not decide whether to sign or accept delivery.',
    nextAction: 'Keep as public MVP with guardrails; do not promote as representative until real user evidence exists.',
    scores: {
      understanding: 2,
      firstScreenClarity: 2,
      exportability: 3,
      cognitiveLoad: 2,
      sourceSafety: 3,
    },
  },
  {
    slug: 'diet-habit-2week',
    checkedAt: '2026-05-23',
    decision: 'public_mvp_with_guardrails',
    primaryDestination: 'sheet',
    structureType: 'routine',
    persona:
      'A user wants to observe two weeks of meals, activity, sleep, and condition without receiving diet prescription or weight-loss promises.',
    scenario: 'Enter start date, record daily observations, note repeated dizziness as a stop condition, and export a sheet.',
    naturalArtifactSimulation: [
      'startDate=2026-06-01, goal=observe eating/activity triggers, constraint=no calorie prescription',
      'sheet: date, meal, activity, sleep, waist/weight optional, condition, stop condition',
      'review: late dinner and low sleep correlate with snack cravings; repeated dizziness means stop and consult a professional',
    ],
    firstScreenFinding:
      'The observation sheet is the right artifact, but warning and observation-first framing must stay above any diet-result language.',
    currentFlowGap:
      'The Flow can look like a diet coaching tool if warning hierarchy and observation wording are not prominent.',
    keepOnFirstScreen: ['start date', 'observation sheet', 'weekly review field', 'warning/stop condition'],
    moveBelowFold: ['weight-result framing', 'coaching-like suggestions', 'native habit tracker expansion'],
    contentUxReinforcement:
      'Keep the first artifact as a two-week observation sheet and make the warning visible before weekly review.',
    copyFix: 'Use observation copy: "record meals, activity, sleep, and condition for two weeks" rather than outcome language.',
    riskBoundary: 'Health-sensitive observation. FLOW records patterns and stop conditions; it does not prescribe diet or promise weight loss.',
    nextAction: 'Keep as public MVP with guardrails and use as the health-sensitive simplification test case.',
    scores: {
      understanding: 2,
      firstScreenClarity: 2,
      exportability: 3,
      cognitiveLoad: 2,
      sourceSafety: 3,
    },
  },
];

export function getUxContentSimplificationAudit(slug: string): UxContentSimplificationAudit | undefined {
  return uxContentSimplificationAudits.find((audit) => audit.slug === slug);
}

export function summarizeUxContentSimplificationAudits(
  bundles: FlowBundle[],
): UxContentSimplificationSummary {
  const slugs = new Set(bundles.map((bundle) => bundle.flow.slug));
  const audits = uxContentSimplificationAudits.filter((audit) => slugs.has(audit.slug));
  const decisionCounts = { ...emptyDecisionCounts };

  for (const audit of audits) {
    decisionCounts[audit.decision] += 1;
  }

  return {
    totalCount: audits.length,
    slugs: audits.map((audit) => audit.slug),
    decisionCounts,
    audits,
  };
}
