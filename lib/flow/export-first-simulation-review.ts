import type { FlowBundle } from './types';

export type ExportFirstSimulationDecision =
  | 'ready_for_final_promotion_qa'
  | 'public_mvp_after_ux_fix'
  | 'keep_fix';

export type ExportFirstSimulationReview = {
  slug: string;
  decision: ExportFirstSimulationDecision;
  label: string;
  externalTool: string;
  userScenario: string;
  firstAction: string;
  simulatedInputs: string[];
  artifactRows: string[];
  uxGaps: string[];
  contentFixes: string[];
  featureDiet: string[];
  riskBoundary: string;
  nextAction: string;
};

export type ExportFirstSimulationSummary = {
  totalCount: number;
  decisionCounts: Record<ExportFirstSimulationDecision, number>;
  slugs: string[];
  reviews: ExportFirstSimulationReview[];
};

const emptyDecisionCounts: Record<ExportFirstSimulationDecision, number> = {
  ready_for_final_promotion_qa: 0,
  public_mvp_after_ux_fix: 0,
  keep_fix: 0,
};

export const exportFirstSimulationReviews: ExportFirstSimulationReview[] = [
  {
    slug: 'computer-skills-d30-study',
    decision: 'ready_for_final_promotion_qa',
    label: 'final promotion QA candidate',
    externalTool: 'calendar + sheet',
    userScenario: 'A user has 30 days before the computer-skills exam and wants a portable study calendar plus score log.',
    firstAction: 'Enter exam date and create a D-30 calendar plus score log.',
    simulatedInputs: [
      'examDate=2026-06-22',
      'studyWindow=weekday 60 minutes, weekend 120 minutes',
      'weakArea=spreadsheet functions and pivot tables',
    ],
    artifactRows: [
      'calendarRow=D-30 2026-05-23 install CBT tool and split written/practical scope',
      'chapterRow=week1 scope=spreadsheet functions targetDate=2026-05-29 status=in progress',
      'mockRow=mockScore=68 wrongAnswers=function formulas, pivot table retryDate=2026-06-02',
    ],
    uxGaps: [
      'First screen has the right calendar/log surface, but export preview should show the score-log row before promotion.',
      'Mobile first-screen density still needs screenshot QA before representative exposure changes.',
    ],
    contentFixes: [
      'Keep the first action tied to the exam date, not a generic study motivation.',
      'Make score, wrong-answer type, retry date, and weak-area memo visible in export examples.',
    ],
    featureDiet: [
      'Do not add a full study tracker workspace yet.',
      'Keep FLOW save/record secondary to calendar and sheet export until behavior data exists.',
    ],
    riskBoundary: 'Low-risk study workflow. It can recommend tracking and review actions, not exam outcome guarantees.',
    nextAction: 'Run browser screenshot QA on desktop/mobile and verify text, sheet, and calendar exports before final promotion.',
  },
  {
    slug: 'new-car-delivery-check',
    decision: 'public_mvp_after_ux_fix',
    label: 'public MVP after UX fix',
    externalTool: 'sheet + memo',
    userScenario: 'A buyer is at delivery day and needs to record defects before accepting or delaying handover.',
    firstAction: 'Name the vehicle/dealer and fill a defect evidence table before signing.',
    simulatedInputs: [
      'deliveryDate=2026-06-03',
      'vehicle=Avante CN7 white VIN ending 4821',
      'dealer=Mapo branch Kim',
      'inspectionPlace=dealer delivery bay',
    ],
    artifactRows: [
      'defectRow=driver door lower scratch photo=door-scratch-4821.jpg dealerConfirmed=hold delivery until written confirmation',
      'optionRow=ADAS camera calibration pending dealerMemo=confirm before plate registration',
      'documentRow=insurance active registration pending signatureStatus=do not sign until defect memo is attached',
    ],
    uxGaps: [
      'Evidence table is useful, but photo filename and dealer confirmation fields need top-screen emphasis.',
      'The signing/hold decision must stay framed as user documentation, not FLOW advice.',
    ],
    contentFixes: [
      'Add sample labels that say photo file, dealer confirmation, and handover status.',
      'Keep defect proof, document status, and personal decision memo visually separate.',
    ],
    featureDiet: [
      'Do not add contract decision automation.',
      'Keep export as a portable evidence sheet and memo rather than a native claim workflow.',
    ],
    riskBoundary: 'Money-at-risk workflow. FLOW records evidence and questions; it does not decide whether the user should sign.',
    nextAction: 'QA the evidence table on mobile and verify exported sheet/memo can stand alone at delivery day.',
  },
  {
    slug: 'diet-habit-2week',
    decision: 'public_mvp_after_ux_fix',
    label: 'public MVP after UX fix',
    externalTool: 'sheet',
    userScenario: 'A user wants to observe two weeks of meals, activity, sleep, and condition without a weight-loss promise.',
    firstAction: 'Enter start date and begin a daily observation sheet.',
    simulatedInputs: [
      'startDate=2026-06-01',
      'goal=observe eating/activity triggers',
      'constraint=no calorie prescription, no medical advice',
    ],
    artifactRows: [
      'day1 meal=breakfast oatmeal, lunch kimbap, dinner tofu activity=30m walk condition=normal',
      'day3 meal=late dinner activity=none condition=tired stopCondition=consult professional if dizziness repeats',
      'weeklyReview=late dinner and low sleep correlate with snack cravings',
    ],
    uxGaps: [
      'Spreadsheet surface fits the job, but warning hierarchy should be checked before broader public framing.',
      'First-screen copy must say observation log before any diet-result language.',
    ],
    contentFixes: [
      'Keep meals, activity, sleep, condition, and stop condition as sheet columns.',
      'Use caution copy around repeated dizziness, pain, or existing condition changes.',
    ],
    featureDiet: [
      'Do not add weight prediction, coaching, or medical recommendations.',
      'Keep in-FLOW records optional until users prove they return to the log.',
    ],
    riskBoundary: 'Health-sensitive observation log. FLOW helps record patterns; it does not prescribe diet or promise weight loss.',
    nextAction: 'QA warning prominence and sheet export before treating it as a public MVP example.',
  },
];

export function getExportFirstSimulationReview(slug: string): ExportFirstSimulationReview | undefined {
  return exportFirstSimulationReviews.find((review) => review.slug === slug);
}

export function summarizeExportFirstSimulationReviews(bundles: FlowBundle[]): ExportFirstSimulationSummary {
  const slugs = new Set(bundles.map((bundle) => bundle.flow.slug));
  const reviews = exportFirstSimulationReviews.filter((review) => slugs.has(review.slug));
  const decisionCounts = { ...emptyDecisionCounts };

  for (const review of reviews) {
    decisionCounts[review.decision] += 1;
  }

  return {
    totalCount: reviews.length,
    decisionCounts,
    slugs: reviews.map((review) => review.slug),
    reviews,
  };
}
