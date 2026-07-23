import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const reclassified = JSON.parse(fs.readFileSync(path.join(baseDir, 'reclassified-content-v1.json'), 'utf8'));

const axes = [
  'primaryLifeArea',
  'sourceShape',
  'primaryExecutionPattern',
  'primaryArtifact',
  'sourceRowStatus',
  'discoveryAccess',
  'rightsReview',
  'conversionReadiness'
];

const coreAxes = axes.slice(0, 4);
const gateAxes = axes.slice(4);
const ids = [
  'p0-C01', 'p0-C06', 'p0-C14', 'p0-C16', 'p0-O04', 'p0-R03',
  'expansion-KR-KMOOC-01', 'expansion-KR-FIT100-01', 'expansion-GLOBAL-OSSU-01',
  'expansion-GLOBAL-LIBRIVOX-01', 'expansion-GLOBAL-TODOIST-01', 'expansion-KR-KCA-01',
  'expansion-KR-NONGSARO-01', 'deep-DS02', 'deep-DS04', 'deep-DS05', 'deep-DS07',
  'deep-DS08', 'deep-DS10', 'deep-DS11'
];

const r1Rules = Object.fromEntries([
  ['p0-C01', ['travel_outings', null, 'date_preparation', 'calendar', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-C06', ['travel_outings', null, 'date_preparation', 'calendar', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-C14', ['home_living', null, 'ordered_procedure', 'checklist', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-C16', ['work_career', null, 'phase_lifecycle', 'sheet', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-O04', ['money_admin_purchase', 'decision_criteria', 'compare_decide', 'sheet', 'metadata_only', 'unknown', 'pending', 'source_import_required']],
  ['p0-R03', ['work_career', 'procedure_rows', 'phase_lifecycle', 'sheet', 'metadata_only', 'unknown', 'pending', 'source_import_required']],
  ['expansion-KR-KMOOC-01', ['study_reading', 'lesson_rows', 'phase_lifecycle', 'sheet', 'metadata_only', 'public', 'restricted', 'ready_second_wave']],
  ['expansion-KR-FIT100-01', ['health_fitness', 'procedure_rows', 'ordered_procedure', 'checklist', 'complete', 'public', 'restricted', 'ready_second_wave']],
  ['expansion-GLOBAL-OSSU-01', ['study_reading', 'lesson_rows', 'resource_queue', 'sheet', 'complete', 'public', 'approved', 'ready_second_wave']],
  ['expansion-GLOBAL-LIBRIVOX-01', ['study_reading', 'resource_collection', 'resource_queue', 'todo', 'complete', 'public', 'pending', 'ready_second_wave']],
  ['expansion-GLOBAL-TODOIST-01', ['work_career', 'template_fields', 'phase_lifecycle', 'todo', 'partial', 'account_required', 'restricted', 'source_import_required']],
  ['expansion-KR-KCA-01', ['money_admin_purchase', 'table_rows', 'compare_decide', 'sheet', 'complete', 'public', 'approved', 'ready_second_wave']],
  ['expansion-KR-NONGSARO-01', ['work_career', 'checklist_rows', 'repeating_routine', 'checklist', 'complete', 'public', 'restricted', 'ready_second_wave']],
  ['deep-DS02', ['money_admin_purchase', 'decision_criteria', 'compare_decide', 'sheet', 'complete', 'public', 'pending', 'hold']],
  ['deep-DS04', ['study_reading', 'lesson_rows', 'phase_lifecycle', 'sheet', 'partial', 'public', 'restricted', 'ready_second_wave']],
  ['deep-DS05', ['home_living', 'date_offsets', 'date_preparation', 'calendar', 'complete', 'public', 'restricted', 'ready_second_wave']],
  ['deep-DS07', ['health_fitness', 'procedure_rows', 'ordered_procedure', 'checklist', 'complete', 'public', 'restricted', 'ready_second_wave']],
  ['deep-DS08', ['travel_outings', 'procedure_rows', 'ordered_procedure', 'checklist', 'complete', 'public', 'pending', 'hold']],
  ['deep-DS10', ['study_reading', 'lesson_rows', 'resource_queue', 'sheet', 'complete', 'public', 'pending', 'ready_second_wave']],
  ['deep-DS11', ['travel_outings', 'checklist_rows', 'progress_tracking', 'checklist', 'complete', 'public', 'pending', 'ready_second_wave']]
]);

const r1Alpha = Object.fromEntries([
  ['p0-C01', ['travel_outings', null, 'date_preparation', 'calendar', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-C06', ['travel_outings', null, 'date_preparation', 'calendar', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-C14', ['home_living', null, 'ordered_procedure', 'checklist', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-C16', ['work_career', null, 'phase_lifecycle', 'sheet', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-O04', ['money_admin_purchase', 'decision_criteria', 'compare_decide', 'sheet', 'partial', 'unknown', 'pending', 'hold']],
  ['p0-R03', ['work_career', 'procedure_rows', 'phase_lifecycle', 'sheet', 'complete', 'unknown', 'pending', 'ready_second_wave']],
  ['expansion-KR-KMOOC-01', ['study_reading', null, 'phase_lifecycle', 'sheet', 'metadata_only', 'public', 'pending', 'source_import_required']],
  ['expansion-KR-FIT100-01', ['health_fitness', 'procedure_rows', 'ordered_procedure', 'checklist', 'complete', 'public', 'pending', 'ready_for_internal_canary']],
  ['expansion-GLOBAL-OSSU-01', ['study_reading', 'lesson_rows', 'progress_tracking', 'sheet', 'complete', 'public', 'approved', 'ready_for_internal_canary']],
  ['expansion-GLOBAL-LIBRIVOX-01', ['study_reading', 'resource_collection', 'resource_queue', 'sheet', 'complete', 'public', 'pending', 'ready_second_wave']],
  ['expansion-GLOBAL-TODOIST-01', ['work_career', 'procedure_rows', 'phase_lifecycle', 'checklist', 'partial', 'public', 'pending', 'source_import_required']],
  ['expansion-KR-KCA-01', ['money_admin_purchase', 'table_rows', 'compare_decide', 'sheet', 'complete', 'public', 'approved', 'ready_for_internal_canary']],
  ['expansion-KR-NONGSARO-01', ['work_career', 'checklist_rows', 'repeating_routine', 'checklist', 'complete', 'public', 'pending', 'ready_for_internal_canary']],
  ['deep-DS02', ['money_admin_purchase', 'decision_criteria', 'compare_decide', 'sheet', 'complete', 'public', 'pending', 'hold']],
  ['deep-DS04', ['study_reading', 'date_window', 'phase_lifecycle', 'sheet', 'partial', 'public', 'pending', 'ready_for_internal_canary']],
  ['deep-DS05', ['home_living', 'date_offsets', 'date_preparation', 'calendar', 'complete', 'public', 'pending', 'ready_for_internal_canary']],
  ['deep-DS07', ['health_fitness', 'procedure_rows', 'ordered_procedure', 'checklist', 'complete', 'public', 'pending', 'ready_for_internal_canary']],
  ['deep-DS08', ['travel_outings', 'procedure_rows', 'ordered_procedure', 'checklist', 'complete', 'public', 'restricted', 'hold']],
  ['deep-DS10', ['study_reading', 'lesson_rows', 'progress_tracking', 'sheet', 'complete', 'public', 'approved', 'ready_for_internal_canary']],
  ['deep-DS11', ['travel_outings', 'checklist_rows', 'progress_tracking', 'checklist', 'complete', 'public', 'approved', 'ready_for_internal_canary']]
]);

const r1Beta = Object.fromEntries([
  ['p0-C01', ['travel_outings', null, 'date_preparation', 'calendar', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-C06', ['travel_outings', null, 'date_preparation', 'calendar', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-C14', ['home_living', null, 'ordered_procedure', 'checklist', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-C16', ['work_career', null, 'phase_lifecycle', 'sheet', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-O04', ['money_admin_purchase', null, 'compare_decide', 'sheet', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-R03', ['work_career', null, 'phase_lifecycle', 'sheet', 'metadata_only', 'unknown', 'pending', 'source_import_required']],
  ['expansion-KR-KMOOC-01', ['study_reading', null, 'phase_lifecycle', 'calendar', 'metadata_only', 'public', 'restricted', 'source_import_required']],
  ['expansion-KR-FIT100-01', ['health_fitness', 'procedure_rows', 'phase_lifecycle', 'checklist', 'complete', 'public', 'restricted', 'ready_second_wave']],
  ['expansion-GLOBAL-OSSU-01', ['study_reading', 'lesson_rows', 'progress_tracking', 'sheet', 'complete', 'public', 'approved', 'ready_for_internal_canary']],
  ['expansion-GLOBAL-LIBRIVOX-01', ['study_reading', 'resource_collection', 'resource_queue', 'sheet', 'complete', 'public', 'pending', 'ready_second_wave']],
  ['expansion-GLOBAL-TODOIST-01', ['work_career', null, 'phase_lifecycle', 'checklist', 'partial', 'public', 'restricted', 'source_import_required']],
  ['expansion-KR-KCA-01', ['money_admin_purchase', 'table_rows', 'compare_decide', 'sheet', 'complete', 'public', 'approved', 'ready_for_internal_canary']],
  ['expansion-KR-NONGSARO-01', ['work_career', 'checklist_rows', 'repeating_routine', 'checklist', 'complete', 'public', 'restricted', 'ready_second_wave']],
  ['deep-DS02', ['money_admin_purchase', 'decision_criteria', 'compare_decide', 'sheet', 'complete', 'public', 'pending', 'ready_second_wave']],
  ['deep-DS04', ['study_reading', 'date_window', 'phase_lifecycle', 'sheet', 'partial', 'public', 'restricted', 'ready_second_wave']],
  ['deep-DS05', ['home_living', 'date_offsets', 'date_preparation', 'calendar', 'complete', 'public', 'restricted', 'ready_for_internal_canary']],
  ['deep-DS07', ['health_fitness', 'procedure_rows', 'phase_lifecycle', 'checklist', 'complete', 'public', 'restricted', 'ready_second_wave']],
  ['deep-DS08', ['travel_outings', 'resource_collection', 'resource_queue', 'checklist', 'complete', 'public', 'restricted', 'ready_second_wave']],
  ['deep-DS10', ['study_reading', 'lesson_rows', 'progress_tracking', 'sheet', 'complete', 'public', 'approved', 'ready_for_internal_canary']],
  ['deep-DS11', ['travel_outings', 'checklist_rows', 'progress_tracking', 'checklist', 'complete', 'public', 'approved', 'ready_second_wave']]
]);

const r2Alpha = Object.fromEntries([
  ['p0-C01', ['travel_outings', null, 'date_preparation', 'calendar', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-C06', ['travel_outings', null, 'date_preparation', 'calendar', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-C14', ['home_living', null, 'ordered_procedure', 'checklist', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-C16', ['work_career', null, 'phase_lifecycle', 'sheet', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-O04', ['money_admin_purchase', null, 'compare_decide', 'sheet', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-R03', ['work_career', null, 'phase_lifecycle', 'sheet', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['expansion-KR-KMOOC-01', ['study_reading', null, 'progress_tracking', 'sheet', 'metadata_only', 'public', 'restricted', 'source_import_required']],
  ['expansion-KR-FIT100-01', ['health_fitness', 'procedure_rows', 'ordered_procedure', 'checklist', 'complete', 'public', 'restricted', 'ready_second_wave']],
  ['expansion-GLOBAL-OSSU-01', ['study_reading', 'lesson_rows', 'progress_tracking', 'sheet', 'complete', 'public', 'approved', 'ready_for_internal_canary']],
  ['expansion-GLOBAL-LIBRIVOX-01', ['study_reading', 'resource_collection', 'resource_queue', 'sheet', 'complete', 'public', 'approved', 'ready_second_wave']],
  ['expansion-GLOBAL-TODOIST-01', ['work_career', 'procedure_rows', 'phase_lifecycle', 'checklist', 'partial', 'public', 'restricted', 'source_import_required']],
  ['expansion-KR-KCA-01', ['money_admin_purchase', 'table_rows', 'compare_decide', 'sheet', 'complete', 'public', 'approved', 'ready_for_internal_canary']],
  ['expansion-KR-NONGSARO-01', ['work_career', 'checklist_rows', 'repeating_routine', 'checklist', 'complete', 'public', 'restricted', 'ready_second_wave']],
  ['deep-DS02', ['money_admin_purchase', 'decision_criteria', 'compare_decide', 'sheet', 'complete', 'public', 'pending', 'ready_second_wave']],
  ['deep-DS04', ['study_reading', 'date_window', 'progress_tracking', 'sheet', 'partial', 'public', 'restricted', 'source_import_required']],
  ['deep-DS05', ['home_living', 'date_offsets', 'date_preparation', 'calendar', 'complete', 'public', 'restricted', 'ready_for_internal_canary']],
  ['deep-DS07', ['health_fitness', 'procedure_rows', 'ordered_procedure', 'checklist', 'complete', 'public', 'restricted', 'ready_second_wave']],
  ['deep-DS08', ['travel_outings', 'procedure_rows', 'ordered_procedure', 'checklist', 'complete', 'public', 'restricted', 'ready_second_wave']],
  ['deep-DS10', ['study_reading', 'lesson_rows', 'progress_tracking', 'sheet', 'complete', 'public', 'approved', 'ready_second_wave']],
  ['deep-DS11', ['travel_outings', 'checklist_rows', 'progress_tracking', 'checklist', 'complete', 'public', 'approved', 'ready_second_wave']]
]);

const r2Beta = Object.fromEntries([
  ['p0-C01', ['travel_outings', null, 'date_preparation', 'calendar', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-C06', ['travel_outings', null, 'date_preparation', 'calendar', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-C14', ['home_living', null, 'ordered_procedure', 'checklist', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-C16', ['work_career', null, 'phase_lifecycle', 'todo', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-O04', ['money_admin_purchase', null, 'compare_decide', 'sheet', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['p0-R03', ['work_career', null, 'phase_lifecycle', 'todo', 'missing', 'unknown', 'pending', 'source_import_required']],
  ['expansion-KR-KMOOC-01', ['study_reading', null, 'progress_tracking', 'sheet', 'metadata_only', 'public', 'restricted', 'source_import_required']],
  ['expansion-KR-FIT100-01', ['health_fitness', 'procedure_rows', 'ordered_procedure', 'checklist', 'complete', 'public', 'restricted', 'ready_second_wave']],
  ['expansion-GLOBAL-OSSU-01', ['study_reading', 'lesson_rows', 'progress_tracking', 'sheet', 'complete', 'public', 'approved', 'ready_second_wave']],
  ['expansion-GLOBAL-LIBRIVOX-01', ['study_reading', 'lesson_rows', 'progress_tracking', 'sheet', 'complete', 'public', 'pending', 'ready_second_wave']],
  ['expansion-GLOBAL-TODOIST-01', ['work_career', 'procedure_rows', 'phase_lifecycle', 'checklist', 'partial', 'public', 'restricted', 'source_import_required']],
  ['expansion-KR-KCA-01', ['money_admin_purchase', 'table_rows', 'compare_decide', 'sheet', 'complete', 'public', 'approved', 'ready_for_internal_canary']],
  ['expansion-KR-NONGSARO-01', ['work_career', 'checklist_rows', 'repeating_routine', 'checklist', 'complete', 'public', 'restricted', 'ready_second_wave']],
  ['deep-DS02', ['money_admin_purchase', 'decision_criteria', 'compare_decide', 'sheet', 'complete', 'public', 'pending', 'ready_second_wave']],
  ['deep-DS04', ['study_reading', null, 'progress_tracking', 'sheet', 'metadata_only', 'public', 'restricted', 'source_import_required']],
  ['deep-DS05', ['home_living', 'date_offsets', 'date_preparation', 'calendar', 'complete', 'public', 'restricted', 'ready_for_internal_canary']],
  ['deep-DS07', ['health_fitness', 'procedure_rows', 'ordered_procedure', 'checklist', 'complete', 'public', 'restricted', 'ready_second_wave']],
  ['deep-DS08', ['travel_outings', 'procedure_rows', 'ordered_procedure', 'checklist', 'complete', 'public', 'restricted', 'ready_second_wave']],
  ['deep-DS10', ['study_reading', 'lesson_rows', 'progress_tracking', 'sheet', 'complete', 'public', 'approved', 'ready_second_wave']],
  ['deep-DS11', ['travel_outings', 'checklist_rows', 'progress_tracking', 'checklist', 'complete', 'public', 'approved', 'ready_second_wave']]
]);

function currentRuleDecision(record) {
  return [
    record.v11.primaryLifeArea,
    record.v11.sourceShape,
    record.v11.primaryExecutionPattern,
    record.v11.primaryArtifact,
    record.review.sourceRowStatus,
    record.access.discoveryAccess,
    record.review.rightsReview,
    record.review.conversionReadiness
  ];
}

const r2Rules = Object.fromEntries(ids.map((id) => {
  const record = reclassified.records.find((entry) => entry.recordId === id);
  if (!record) throw new Error(`Missing frozen case in reclassification: ${id}`);
  return [id, currentRuleDecision(record)];
}));

function axisMetrics(classifiers) {
  const result = {};
  for (let axisIndex = 0; axisIndex < axes.length; axisIndex += 1) {
    let matches = 0;
    let comparisons = 0;
    for (const id of ids) {
      const values = classifiers.map((classifier) => classifier[id][axisIndex]);
      for (const [a, b] of [[0, 1], [0, 2], [1, 2]]) {
        comparisons += 1;
        if (values[a] === values[b]) matches += 1;
      }
    }
    result[axes[axisIndex]] = Number(((matches / comparisons) * 100).toFixed(1));
  }
  return result;
}

function exactMetrics(classifiers) {
  const unanimous = (axisList, id) => axisList.every((axis) => {
    const index = axes.indexOf(axis);
    const values = classifiers.map((classifier) => classifier[id][index]);
    return values.every((value) => value === values[0]);
  });
  const coreCount = ids.filter((id) => unanimous(coreAxes, id)).length;
  const allCount = ids.filter((id) => unanimous(axes, id)).length;
  return {
    coreExactCaseCount: coreCount,
    coreExactCasePercent: Number(((coreCount / ids.length) * 100).toFixed(1)),
    allEightAxesExactCaseCount: allCount,
    allEightAxesExactCasePercent: Number(((allCount / ids.length) * 100).toFixed(1))
  };
}

function materialize(decisions) {
  return ids.map((id) => ({
    caseId: id,
    ...Object.fromEntries(axes.map((axis, index) => [axis, decisions[id][index]]))
  }));
}

function makeRound(round, ruleVersion, classifiers, change) {
  const metrics = axisMetrics(classifiers);
  const exact = exactMetrics(classifiers);
  return {
    round,
    ruleVersion,
    change,
    methodOutputs: {
      deterministicRules: materialize(classifiers[0]),
      independentReviewerAlpha: materialize(classifiers[1]),
      independentReviewerBeta: materialize(classifiers[2])
    },
    metrics: {
      definition: 'Pairwise agreement = matching decisions across the three classifier pairs divided by 60 pair-comparisons per axis.',
      coreAxes: {
        lifeArea: metrics.primaryLifeArea,
        sourceShape: metrics.sourceShape,
        executionPattern: metrics.primaryExecutionPattern,
        primaryArtifact: metrics.primaryArtifact
      },
      gateAxes: Object.fromEntries(gateAxes.map((axis) => [axis, metrics[axis]])),
      exactMatch: exact.coreExactCasePercent,
      ...exact
    }
  };
}

const causeById = {
  'p0-C16': 'Phase work can look like a task list or a tracking table; one reviewer optimized for the next action while two optimized for phase status and handoff.',
  'p0-R03': 'A portfolio project mixes executable tasks with phase evidence; the primary artifact depends on whether progress state or the immediate next action is dominant.',
  'expansion-GLOBAL-LIBRIVOX-01': 'Ordered audio chapters resemble lessons, but the source has no curriculum, assessment or course completion criterion; territory also prevents treating US public-domain status as global approval.',
  'deep-DS04': 'The public metadata contains real operating date windows but not lesson rows; reviewers differed on whether metadata can itself be a source shape.',
  'expansion-GLOBAL-OSSU-01': 'The core taxonomy agreed; readiness differed only on whether localization and freshness checks block internal canary.',
  'deep-DS02': 'The core taxonomy agreed; readiness differed between keeping the legal-risk candidate on hold and allowing a review-locked second-wave draft.',
  'deep-DS08': 'The core taxonomy agreed; readiness differed between rights-sensitive hold and review-locked second wave.',
  default: 'The three methods converged after global tie-breakers were clarified; remaining review flags are evidence gates, not taxonomy disagreements.'
};

const ruleById = {
  'p0-C16': 'For heterogeneous phase work, use sheet when owner/status/evidence across phases is the durable result; use todo only when a flat next-action list is the dominant result. Keep this P0 assignment provisional until SourceRows arrive.',
  'p0-R03': 'For a portfolio lifecycle, phase progress and evidence make sheet primary and todo secondary; missing SourceRows prevent a confirmed assignment.',
  'expansion-GLOBAL-LIBRIVOX-01': 'Use resource_collection/resource_queue when entries are independently consumable resources without instructional gates. Use lesson_rows/progress_tracking only for a fixed curriculum. Territory uncertainty keeps rights pending.',
  'deep-DS04': 'A date window is a valid source shape when the published dates are themselves the rows needed for the intended Flow; absent lesson rows still make the package partial and source_import_required for a full course Flow.',
  'expansion-GLOBAL-OSSU-01': 'Internal canary and public clearance are independent. Verified rows and license permit internal canary, while freshness and locale checks remain separate review fields.',
  'deep-DS02': 'Legal/financial risk and pending permission can keep an otherwise complete internal draft on hold; personal and public permissions remain false until review.',
  'deep-DS08': 'A fixed source-defined route is ordered_procedure, but unresolved rights/territory can independently keep promotion on hold.',
  default: 'Apply the decision order: immediate user outcome, evidenced source rows, execution state transition, dominant durable artifact, then independent access/rights/review gates.'
};

const round1 = makeRound(1, 'draft-before-tie-breakers', [r1Rules, r1Alpha, r1Beta], 'Initial independent pass using the same frozen evidence packet and no cross-reviewer result sharing.');
const round2 = makeRound(2, 'taxonomy-v1.1-adjudicated', [r2Rules, r2Alpha, r2Beta], 'Reclassified independently after adding global evidence-bounded source-shape, execution, artifact, access, rights and readiness tie-breakers.');

const document = {
  documentType: 'flowme_classification_comparison',
  schemaVersion: 'flowme-taxonomy-v1.1',
  date: '2026-07-20',
  purpose: 'Measure reproducibility of taxonomy decisions before and after general tie-breaker refinement.',
  validationBoundary: 'Automated agreement and reviewer-consistency QA only; not observed-user validation.',
  method: {
    frozenCaseCount: ids.length,
    frozenCases: ids,
    classifiers: [
      { id: 'deterministic_rules', kind: 'rule_based', independence: 'Executed from the checked-in mapping logic.' },
      { id: 'independent_reviewer_alpha', kind: 'independent_agent', independence: 'Classified without seeing the other reviewer output.' },
      { id: 'independent_reviewer_beta', kind: 'independent_agent', independence: 'Classified without seeing the other reviewer output.' }
    ],
    controls: [
      'The same 20-case packet and eight axes were frozen for both rounds.',
      'Reviewers received clarified global rules in Round 2, not case-specific answer keys.',
      'Final canonical decisions are adjudications and are not counted as a fourth classifier.'
    ],
    validationBoundary: 'This is automated and reviewer-consistency QA, not observed-user validation.'
  },
  rounds: [round1, round2],
  finalMetrics: round2.metrics,
  improvementPercentagePoints: {
    lifeArea: Number((round2.metrics.coreAxes.lifeArea - round1.metrics.coreAxes.lifeArea).toFixed(1)),
    sourceShape: Number((round2.metrics.coreAxes.sourceShape - round1.metrics.coreAxes.sourceShape).toFixed(1)),
    executionPattern: Number((round2.metrics.coreAxes.executionPattern - round1.metrics.coreAxes.executionPattern).toFixed(1)),
    primaryArtifact: Number((round2.metrics.coreAxes.primaryArtifact - round1.metrics.coreAxes.primaryArtifact).toFixed(1))
  },
  finalThreshold: {
    requiredCoreAxisAgreementPercent: 85,
    passed: Object.values(round2.metrics.coreAxes).every((value) => value >= 85)
  },
  cases: ids.map((id) => {
    const record = reclassified.records.find((entry) => entry.recordId === id);
    return {
      caseId: id,
      title: record.title,
      finalDecision: Object.fromEntries(axes.map((axis, index) => [axis, r2Rules[id][index]])),
      disagreementCause: causeById[id] || causeById.default,
      finalRule: ruleById[id] || ruleById.default
    };
  }),
  remainingDisagreementPolicy: [
    'Do not add slug-specific exceptions to improve the score.',
    'Keep evidence-bounded nulls and provisional classifications when SourceRows are missing.',
    'When core axes are stable but gates differ, preserve independent review fields rather than forcing one readiness label.',
    'Escalate artifact ties only when the dominant durable user result cannot be established from the source and user job.'
  ]
};

fs.writeFileSync(path.join(baseDir, 'classification-comparison-v1.json'), `${JSON.stringify(document, null, 2)}\n`);
console.log(JSON.stringify({
  rounds: document.rounds.map((round) => ({ round: round.round, ...round.metrics })),
  improvementPercentagePoints: document.improvementPercentagePoints,
  passed: document.finalThreshold.passed
}, null, 2));
