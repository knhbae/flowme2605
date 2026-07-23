import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const auditDir = path.resolve(here, '../../content-audit');
const deep = JSON.parse(fs.readFileSync(path.join(auditDir, '2026-07-19-flow-content-source-expansion/deep-set-v1.json'), 'utf8'));
const byDeepId = Object.fromEntries(deep.cases.map((entry) => [entry.caseId, entry]));

const access = (overrides = {}) => ({
  providerType: 'public_institution',
  platformRoles: ['discover', 'host'],
  discoveryAccess: 'public',
  rowAccess: 'full',
  acquisitionMethods: ['html_fetch'],
  sourceFormat: { category: 'article', mediaType: 'text/html', detail: {} },
  ...overrides,
});

const rights = (overrides = {}) => ({
  basis: 'link_only_assumption',
  allowedUse: ['link_metadata', 'internal_review'],
  territoryScope: 'unknown',
  territories: [],
  reviewStatus: 'restricted',
  personalTransformAllowed: false,
  publicReleaseAllowed: false,
  rationale: 'Public access and reuse rights are evaluated separately; current evidence supports an internal link-backed draft only.',
  ...overrides,
});

const review = (overrides = {}) => ({
  sourceRowStatus: 'complete',
  conversionReadiness: 'ready_second_wave',
  freshnessReview: 'current',
  localeReview: 'applicable',
  safetyReview: 'not_required',
  privacyReview: 'not_required',
  rightsReview: 'restricted',
  promotionState: 'research_only',
  blockers: ['rights_unknown'],
  portfolioRole: 'breadth_candidate',
  editorialAction: 'rights_review',
  backendStorable: true,
  ...overrides,
});

const audience = (life, overrides = {}) => ({
  roles: life === 'study_reading' ? ['learner'] : life === 'work_career' ? ['professional'] : life === 'travel_outings' ? ['traveler'] : life === 'money_admin_purchase' ? ['individual', 'buyer'] : ['individual'],
  ageBands: ['not_specified'],
  skillLevel: life === 'study_reading' ? 'mixed' : 'not_applicable',
  contentLocale: 'ko-KR',
  applicableLocales: ['ko-KR'],
  applicability: 'local_direct',
  prerequisites: [],
  accountOrEntitlement: 'none',
  collaborationContext: life === 'work_career' ? 'team_roles' : 'solo',
  userNeedSignals: ['preserve_source_context'],
  frictionSignals: ['source_revisit_cost'],
  ...overrides,
});

function taxonomy({ status = 'confirmed', life, secondaryLife = [], tags, shape, secondaryShapes = [], execution, secondaryExecution = [], artifact, secondaryArtifacts = [] }) {
  return {
    classificationStatus: status,
    primaryLifeArea: life,
    secondaryLifeAreas: secondaryLife,
    topicTags: tags,
    sourceShape: shape,
    secondarySourceShapes: secondaryShapes,
    primaryExecutionPattern: execution,
    secondaryExecutionPatterns: secondaryExecution,
    primaryArtifact: artifact,
    secondaryArtifacts,
  };
}

function canonicalRowType(value) {
  return ({
    action: 'procedure',
    check: 'check',
    date: 'date',
    repeat: 'check',
    record: 'table_row',
    decision: 'table_row',
    resource: 'resource',
    caution: 'reference',
    context: 'reference',
  })[value] || value;
}

function sourceRowsFromDeep(caseId, typeMap = {}) {
  const sourceId = `source-${caseId.toLowerCase()}`;
  return byDeepId[caseId].sourceRows.map((row, index) => ({
    sourceRowId: row.id,
    sourceId,
    snapshotId: `snapshot-${sourceId}`,
    rowType: canonicalRowType(typeMap[row.type] || 'reference'),
    title: row.title,
    order: index,
    locator: row.locator || null,
  }));
}

function step(stepId, title, order, itemIds) {
  return { stepId, title, order, itemIds };
}

function item(itemId, stepId, title, intent, order, sourceRowIds, schedule = { mode: 'none' }, completion = null, memo = null) {
  const defaultMode = intent === 'decide' ? 'decision' : 'check';
  const rawCompletion = completion || { mode: defaultMode, doneWhen: `${title}를 원문 범위 안에서 완료했다.` };
  const normalizedCompletion = rawCompletion.mode === 'decision'
    ? {
        mode: 'decision',
        options: [
          { value: 'confirmed', label: '확인' },
          { value: 'needs_followup', label: '추가 확인' },
          { value: 'hold', label: '보류', terminal: true },
        ],
        doneWhen: rawCompletion.doneWhen,
      }
    : { mode: 'check', doneWhen: rawCompletion.doneWhen };
  let normalizedSchedule;
  if (schedule.mode === 'anchor_offset') {
    normalizedSchedule = { mode: 'anchor_offset', anchorFieldId: 'anchor-date', dayOffset: schedule.dayOffset, allDay: schedule.allDay ?? true };
  } else if (schedule.mode === 'date_window' && Number.isInteger(schedule.startDayOffset)) {
    normalizedSchedule = { mode: 'date_window', basis: 'anchor_offset', anchorFieldId: 'anchor-date', startDayOffset: schedule.startDayOffset, endDayOffset: schedule.endDayOffset, reminderDayOffset: schedule.startDayOffset };
  } else if (schedule.mode === 'date_window') {
    normalizedSchedule = { mode: 'date_window', basis: 'absolute', startDate: '$source.inspectionWindowStart', endDate: '$source.inspectionWindowEnd' };
  } else if (schedule.mode === 'fixed_date') {
    normalizedSchedule = { mode: 'absolute', start: schedule.date, allDay: schedule.allDay ?? true };
  }
  const result = {
    itemId,
    stepId,
    title,
    intent,
    order,
    completion: normalizedCompletion,
    fieldIds: [],
    memoIds: [],
    cautionMemoIds: [],
    sourceRowIds,
  };
  if (normalizedSchedule) result.schedule = normalizedSchedule;
  if (memo) result.memoDraft = memo;
  return result;
}

function projectionPreview(primary, secondary, examples, blocked = false) {
  const targets = ['calendar', 'checklist', 'todo', 'sheet', 'memo'];
  return Object.fromEntries(targets.map((target) => {
    let availability = target === primary ? 'primary' : secondary.includes(target) ? 'secondary' : target === 'memo' ? 'fallback' : 'not_applicable';
    if (blocked) availability = 'blocked';
    return [target, {
      availability,
      unit: target === 'calendar' ? 'scheduled Item/occurrence' : target === 'sheet' ? 'Item row + stable fields' : target === 'memo' ? 'Flow/Step document' : 'Item grouped by Step',
      example: examples[target] || 'No default projection for this target.',
      loss: target === primary ? 'No primary semantic loss.' : target === 'memo' ? 'Completion and schedule state become prose.' : availability === 'not_applicable' ? 'Projection would invent unsupported structure.' : 'Secondary view may omit fields owned by the primary artifact.',
    }];
  }));
}

function dtoBase({ dtoId, scenario, sourceId, title, url, taxonomyValue, audienceValue, accessValue, rightsValue, reviewValue, sourceRows, steps, items, examples, projectionBlocked = false, sourceSupportLevel = 'direct' }) {
  const flowId = `flow-${dtoId}`;
  const snapshotId = `snapshot-${sourceId}`;
  const canonicalRows = sourceRows.map((row) => ({ ...row, snapshotId, rowType: canonicalRowType(row.rowType) }));
  const contentHash = `sha256:${crypto.createHash('sha256').update(JSON.stringify(canonicalRows)).digest('hex')}`;
  const sourceReferences = items.map((entry) => ({
    sourceRefId: `source-ref-${entry.itemId}`,
    entityType: 'item',
    entityId: entry.itemId,
    sourceRowIds: entry.sourceRowIds,
    relation: 'derived_from',
    supportLevel: sourceSupportLevel,
  }));
  const canonicalItems = items.map(({ sourceRowIds: _sourceRowIds, memoDraft: _memoDraft, ...entry }) => ({
    ...entry,
    sourceRefIds: [`source-ref-${entry.itemId}`],
  }));
  const canonicalSteps = steps.map((entry) => ({
    ...entry,
    flowId,
    sourceRefIds: entry.itemIds.map((itemId) => `source-ref-${itemId}`),
  }));
  const hasAnchor = canonicalItems.some((entry) => entry.schedule?.mode === 'anchor_offset' || (entry.schedule?.mode === 'date_window' && entry.schedule.basis === 'anchor_offset'));
  return {
    dtoId,
    scenario,
    source: {
      sourceId,
      title,
      originalUrl: url,
      snapshot: {
        snapshotId,
        fetchedAt: '2026-07-20T00:00:00.000Z',
        finalUrl: url,
        contentHash,
        extractionVersion: 'taxonomy-v1.1-evidence-fixture-v1',
      },
    },
    flow: {
      flowId,
      title,
      stepIds: canonicalSteps.map((entry) => entry.stepId),
      anchorDefinitions: hasAnchor ? [{ fieldId: 'anchor-date', kind: 'event_date', label: '기준일', required: true }] : [],
    },
    taxonomy: taxonomyValue,
    audienceAndApplicability: audienceValue,
    access: accessValue,
    rights: rightsValue,
    review: reviewValue,
    sourceRows: canonicalRows,
    sourceReferences,
    omittedRows: [],
    steps: canonicalSteps,
    items: canonicalItems,
    fields: [],
    memos: [],
    projectionPreview: projectionPreview(taxonomyValue.primaryArtifact, taxonomyValue.secondaryArtifacts, examples, projectionBlocked),
  };
}

const ds05 = byDeepId.DS05;
const ds05Rows = sourceRowsFromDeep('DS05', { relative_period: 'date' });
const ds05Offsets = [
  { mode: 'anchor_offset', dayOffset: -14, allDay: true },
  { mode: 'anchor_offset', dayOffset: -7, allDay: true },
  { mode: 'date_window', startDayOffset: -4, endDayOffset: -2, allDay: true },
  { mode: 'anchor_offset', dayOffset: -1, allDay: true },
  { mode: 'anchor_offset', dayOffset: 0, allDay: true },
  { mode: 'none' },
];
const datePreparationItems = ds05Rows.map((row, index) => item(`item-ds05-${index + 1}`, 'step-ds05-timeline', row.title, 'act', index, [row.sourceRowId], ds05Offsets[index], { mode: 'check', doneWhen: `${row.title} 원문 묶음의 실행 여부를 확인했다.` }));

const ds12 = byDeepId.DS12;
const ds12Rows = sourceRowsFromDeep('DS12', { materials: 'check', safety: 'caution', preparation: 'check', procedure: 'action', reflection: 'record' });
const nasaItems = [
  item('item-ds12-prepare', 'step-ds12-prepare', '재료·팀·가위 안전 준비하기', 'inspect', 0, ['DS12-R01', 'DS12-R02', 'DS12-R03']),
  item('item-ds12-crane', 'step-ds12-build', '크레인과 감개 설계·제작하기', 'act', 0, ['DS12-R04', 'DS12-R05']),
  item('item-ds12-test', 'step-ds12-build', '끈·후크를 연결하고 컵 쌓기 시험하기', 'act', 1, ['DS12-R06', 'DS12-R07']),
  item('item-ds12-reflect', 'step-ds12-review', '설계 어려움과 개선점을 기록하기', 'record', 0, ['DS12-R08'], { mode: 'none' }, { mode: 'record', doneWhen: '도전 질문에 대한 개선 메모를 남겼다.' }),
];

const ds01 = byDeepId.DS01;
const ds01Rows = sourceRowsFromDeep('DS01', { condition: 'context', before: 'check', during: 'repeat', emergency: 'caution', after: 'check', owner: 'check' });
const heatItems = [
  item('item-ds01-before', 'step-ds01-before', '작업 전 체감온도·시간·물·그늘 확인하기', 'inspect', 0, ['DS01-R01', 'DS01-R02', 'DS01-R03', 'DS01-R04']),
  item('item-ds01-during', 'step-ds01-during', '작업 중 20분마다 수분·휴식·동료 상태 확인하기', 'act', 0, ['DS01-R05', 'DS01-R06', 'DS01-R07'], { mode: 'recurrence', rule: 'PT20M', activeCondition: '농작업 중' }, { mode: 'check', doneWhen: '작업 시간 동안 20분 간격 조치를 지켰거나 위험 단계에서 작업을 중지했다.' }),
  item('item-ds01-emergency', 'step-ds01-after', '응급 기준과 작업 후 회복 확인하기', 'inspect', 0, ['DS01-R08', 'DS01-R09', 'DS01-R10'], { mode: 'none' }, { mode: 'decision', doneWhen: '응급 신고·중지·회복 중 필요한 상태를 선택하고 인계했다.' }),
];

const ds10 = byDeepId.DS10;
const ds10Rows = sourceRowsFromDeep('DS10', { course: 'resource' });
const ossuItems = ds10Rows.map((row, index) => item(`item-ds10-${index + 1}`, 'step-ds10-core', row.title, 'use_resource', index, [row.sourceRowId], { mode: 'none' }, { mode: 'progress', doneWhen: `${row.title} 과정의 현재 상태와 다음 과정을 기록했다.` }));

const librivoxRows = [
  ['lv-row-01', 'Mrs. Rachel Lynde Is Surprised', 'chapter 01; 00:14:35'],
  ['lv-row-02', 'Matthew Cuthbert Is Surprised', 'chapter 02; 00:26:09'],
  ['lv-row-03', 'Marilla Cuthbert Is Surprised', 'chapter 03; 00:12:47'],
].map(([sourceRowId, title, locator], order) => ({ sourceRowId, sourceId: 'source-librivox-anne-v5', snapshotId: 'snapshot-source-librivox-anne-v5', rowType: 'resource', title, order, locator }));
const librivoxItems = librivoxRows.map((row, index) => item(`item-lv-${index + 1}`, 'step-lv-queue', `${index + 1}장 듣기 — ${row.title}`, 'use_resource', index, [row.sourceRowId], { mode: 'none' }, { mode: 'consume', doneWhen: '해당 장을 듣고 다음 장 위치를 저장했다.' }));

const ds02 = byDeepId.DS02;
const ds02Rows = sourceRowsFromDeep('DS02', { contract: 'decision', attachment: 'decision', change: 'decision', warranty: 'decision', exit: 'decision' });
const contractItems = ds02Rows.map((row, index) => item(`item-ds02-${index + 1}`, 'step-ds02-criteria', `${row.title} 조건 판정하기`, 'decide', index, [row.sourceRowId], { mode: 'none' }, { mode: 'decision', doneWhen: `${row.title}을 진행·수정요청·보류 중 하나로 판정했다.` }));

const portfolioTitles = [
  '만들 프로젝트 아이템과 기술 스택 정하기',
  '핵심 기능과 3~5개 화면 범위 정하기',
  '페이지 기획과 DB·API 설계 문서 만들기',
  '개발 일정을 나누고 핵심 기능 구현 시작하기',
  '서비스 배포하고 도메인·실행 방법 정리하기',
  '프로젝트 설명·역할·성과·데모를 한 페이지로 정리하기',
];
const portfolioRows = portfolioTitles.map((title, order) => ({ sourceRowId: `portfolio-row-${order + 1}`, sourceId: 'source-velog-portfolio', snapshotId: 'snapshot-source-velog-portfolio', rowType: 'procedure', title, order, locator: `legacy runtime item ${order + 1}` }));
const portfolioItems = portfolioRows.map((row, index) => item(`portfolio-item-${index + 1}`, `portfolio-step-${Math.floor(index / 2) + 1}`, row.title, 'act', index % 2, [row.sourceRowId], { mode: 'none' }, { mode: 'progress', doneWhen: `${row.title} 결과물을 남기고 다음 단계로 넘겼다.` }));

const vehicleRows = [{ sourceRowId: 'vehicle-window-row', sourceId: 'source-ts-inspection', snapshotId: 'snapshot-source-ts-inspection', rowType: 'date', title: '자동차검사 유효기간 안에 검사받기', order: 0, locator: '정기검사 대상·기준·유효기간' }];
const vehicleItems = [item('vehicle-window-item', 'vehicle-window-step', '공식 검사 가능 기간 확인하고 방문일 정하기', 'inspect', 0, ['vehicle-window-row'], { mode: 'date_window', startFromSourceField: 'inspectionWindowStart', endFromSourceField: 'inspectionWindowEnd', allDay: true }, { mode: 'check', doneWhen: '공식 조회에서 검사 가능 기간과 방문일을 확인했다.' })];

const ds08 = byDeepId.DS08;
const ds08Rows = sourceRowsFromDeep('DS08', { waypoint: 'resource' });
const visitItems = ds08Rows.map((row, index) => item(`item-ds08-${index + 1}`, 'step-ds08-route', `${index + 1}. ${row.title} 방문`, 'act', index, [row.sourceRowId]));

const todoistRows = [
  ['todoist-phase-1', 'Pre-production'],
  ['todoist-phase-2', 'Production'],
  ['todoist-phase-3', 'Post-production'],
  ['todoist-phase-4', 'Distribution'],
].map(([sourceRowId, title], order) => ({ sourceRowId, sourceId: 'source-todoist-podcast', snapshotId: 'snapshot-source-todoist-podcast', rowType: 'reference', title, order, locator: 'public template description' }));

const commonExamples = {
  calendar: 'ICS에는 schedule이 있는 Item만 들어가고, 날짜가 없는 Item은 제외한다.',
  checklist: 'Step 제목 아래 Item의 완료·결정 상태를 순서대로 표시한다.',
  todo: '다음 실행 Item과 출처 링크를 task/note로 옮긴다.',
  sheet: 'Item 한 개를 한 행으로 두고 상태·날짜·메모·출처 열을 유지한다.',
  memo: '사용자 결정, 출처 URL, 주의·보류 조건과 투영 손실을 Markdown으로 남긴다.',
};

const dtos = [
  dtoBase({
    dtoId: 'dto-date-preparation-easylaw-moving', scenario: '날짜 역산', sourceId: 'source-ds05', title: ds05.sourceSnapshot.title, url: ds05.sourceSnapshot.sourceUrl,
    taxonomyValue: taxonomy({ life: 'home_living', tags: ['이사', 'D-day'], shape: 'date_offsets', execution: 'date_preparation', artifact: 'calendar', secondaryArtifacts: ['checklist'] }),
    audienceValue: audience('home_living', { userNeedSignals: ['remember_when', 'avoid_omission', 'handoff_or_share'], frictionSignals: ['missed_deadline', 'collaboration_gap'] }),
    accessValue: access({ providerType: 'government_public', sourceFormat: { category: 'checklist', mediaType: 'text/html', detail: { sourceRows: 6 } } }), rightsValue: rights(), reviewValue: review({ portfolioRole: 'official_trust_anchor' }),
    sourceRows: ds05Rows, steps: [step('step-ds05-timeline', '이사 기준일 전후', 0, datePreparationItems.map((entry) => entry.itemId))], items: datePreparationItems, examples: commonExamples,
  }),
  dtoBase({
    dtoId: 'dto-ordered-procedure-nasa-crane', scenario: '순서형 절차', sourceId: 'source-ds12', title: ds12.sourceSnapshot.title, url: ds12.sourceSnapshot.sourceUrl,
    taxonomyValue: taxonomy({ life: 'hobby_pet', secondaryLife: ['study_reading'], tags: ['STEM', '크레인 만들기'], shape: 'procedure_rows', secondaryShapes: ['checklist_rows'], execution: 'ordered_procedure', artifact: 'checklist', secondaryArtifacts: ['memo'] }),
    audienceValue: audience('hobby_pet', { roles: ['learner'], ageBands: ['teen'], skillLevel: 'beginner', contentLocale: 'en', applicableLocales: ['ko-KR'], applicability: 'local_adaptation_required', collaborationContext: 'team_roles', userNeedSignals: ['follow_sequence', 'avoid_omission'], frictionSignals: ['unclear_next_action'] }),
    accessValue: access({ providerType: 'government_public', sourceFormat: { category: 'document', mediaType: 'application/pdf', detail: { sourceRows: 8 } } }), rightsValue: rights({ basis: 'official_reuse_policy', reviewStatus: 'pending', rationale: 'Official educational source; translation, attribution and derivative-use terms still require review.' }), reviewValue: review({ localeReview: 'adaptation_required', rightsReview: 'pending', blockers: ['rights_unknown', 'locale_review_required'], editorialAction: 'localize' }),
    sourceRows: ds12Rows, steps: [step('step-ds12-prepare', '준비', 0, ['item-ds12-prepare']), step('step-ds12-build', '설계·제작·시험', 1, ['item-ds12-crane', 'item-ds12-test']), step('step-ds12-review', '성찰', 2, ['item-ds12-reflect'])], items: nasaItems, examples: commonExamples,
  }),
  dtoBase({
    dtoId: 'dto-repeating-routine-heat-safety', scenario: '반복 루틴', sourceId: 'source-ds01', title: ds01.sourceSnapshot.title, url: ds01.sourceSnapshot.sourceUrl,
    taxonomyValue: taxonomy({ life: 'work_career', secondaryLife: ['health_fitness'], tags: ['농작업', '온열질환'], shape: 'checklist_rows', secondaryShapes: ['recurrence_rule'], execution: 'repeating_routine', secondaryExecution: ['ordered_procedure'], artifact: 'checklist', secondaryArtifacts: ['todo'] }),
    audienceValue: audience('work_career', { roles: ['professional', 'team_member'], collaborationContext: 'team_roles', userNeedSignals: ['repeat_consistently', 'handoff_or_share'], frictionSignals: ['collaboration_gap', 'missed_deadline'] }),
    accessValue: access({ providerType: 'public_institution', sourceFormat: { category: 'document', mediaType: 'application/pdf', detail: { sourceRows: 10 } } }), rightsValue: rights(), reviewValue: review({ safetyReview: 'pending', blockers: ['rights_unknown', 'safety_review_required'], editorialAction: 'safety_review', portfolioRole: 'official_trust_anchor' }),
    sourceRows: ds01Rows, steps: [step('step-ds01-before', '작업 전', 0, ['item-ds01-before']), step('step-ds01-during', '작업 중', 1, ['item-ds01-during']), step('step-ds01-after', '응급·작업 후', 2, ['item-ds01-emergency'])], items: heatItems, examples: commonExamples,
  }),
  dtoBase({
    dtoId: 'dto-progress-tracking-ossu', scenario: '표·진도', sourceId: 'source-ds10', title: ds10.sourceSnapshot.title, url: ds10.sourceSnapshot.sourceUrl,
    taxonomyValue: taxonomy({ life: 'study_reading', secondaryLife: ['work_career'], tags: ['컴퓨터과학', '커리큘럼'], shape: 'lesson_rows', secondaryShapes: ['table_rows'], execution: 'progress_tracking', secondaryExecution: ['resource_queue'], artifact: 'sheet', secondaryArtifacts: ['todo'] }),
    audienceValue: audience('study_reading', { contentLocale: 'en', applicableLocales: ['ko-KR'], applicability: 'local_adaptation_required', prerequisites: ['고등학교 대수 수준 또는 각 과정의 명시된 선수조건'], userNeedSignals: ['track_progress', 'queue_resources'], frictionSignals: ['lost_progress'] }),
    accessValue: access({ providerType: 'open_knowledge', sourceFormat: { category: 'course', mediaType: 'text/markdown', detail: { sourceRows: 6 } } }), rightsValue: rights({ basis: 'open_license', allowedUse: ['link_metadata', 'personal_transform', 'internal_review'], territoryScope: 'global', territories: ['GLOBAL'], reviewStatus: 'approved', personalTransformAllowed: true, rationale: 'Open curriculum rows may be used for a private progress copy; public Flow promotion still needs attribution/editorial review.' }), reviewValue: review({ rightsReview: 'approved', blockers: ['locale_review_required'], localeReview: 'adaptation_required', editorialAction: 'localize' }),
    sourceRows: ds10Rows, steps: [step('step-ds10-core', 'Core CS 과정', 0, ossuItems.map((entry) => entry.itemId))], items: ossuItems, examples: commonExamples,
  }),
  dtoBase({
    dtoId: 'dto-resource-queue-librivox', scenario: '자료 큐', sourceId: 'source-librivox-anne-v5', title: 'Anne of Green Gables, Version 5', url: 'https://librivox.org/anne-of-green-gables-version-5-by-lucy-maud-montgomery/',
    taxonomyValue: taxonomy({ life: 'study_reading', tags: ['오디오북', '영어 듣기'], shape: 'resource_collection', execution: 'resource_queue', secondaryExecution: ['progress_tracking'], artifact: 'sheet', secondaryArtifacts: ['todo'] }),
    audienceValue: audience('study_reading', { contentLocale: 'en', applicableLocales: ['ko-KR'], applicability: 'local_adaptation_required', userNeedSignals: ['queue_resources', 'track_progress'], frictionSignals: ['lost_progress', 'source_revisit_cost'] }),
    accessValue: access({ providerType: 'open_knowledge', acquisitionMethods: ['rss_fetch'], sourceFormat: { category: 'audio', mediaType: 'application/rss+xml', detail: { totalChapterRowsObserved: 38, representativeRowsIncluded: 3 } } }), rightsValue: rights({ basis: 'public_domain', allowedUse: ['link_metadata', 'internal_review'], territoryScope: 'named', territories: ['US'], reviewStatus: 'pending', rationale: 'The source marks recordings public domain in the USA and asks non-U.S. users to verify local copyright status.' }), reviewValue: review({ sourceRowStatus: 'partial', rightsReview: 'pending', localeReview: 'adaptation_required', blockers: ['source_incomplete', 'rights_unknown', 'locale_review_required'], editorialAction: 'rights_review' }),
    sourceRows: librivoxRows, steps: [step('step-lv-queue', '오디오 장 큐', 0, librivoxItems.map((entry) => entry.itemId))], items: librivoxItems, examples: commonExamples,
  }),
  dtoBase({
    dtoId: 'dto-compare-decide-remodel-contract', scenario: '비교·결정', sourceId: 'source-ds02', title: ds02.sourceSnapshot.title, url: ds02.sourceSnapshot.sourceUrl,
    taxonomyValue: taxonomy({ life: 'money_admin_purchase', secondaryLife: ['home_living'], tags: ['리모델링', '계약'], shape: 'decision_criteria', secondaryShapes: ['table_rows'], execution: 'compare_decide', artifact: 'sheet', secondaryArtifacts: ['checklist', 'memo'] }),
    audienceValue: audience('money_admin_purchase', { roles: ['buyer'], userNeedSignals: ['choose_between_options', 'avoid_omission'], frictionSignals: ['unclear_next_action'] }),
    accessValue: access({ providerType: 'community_platform', sourceFormat: { category: 'checklist', mediaType: 'text/html', detail: { sourceRows: 10 } } }), rightsValue: rights({ basis: 'unknown', reviewStatus: 'pending', rationale: 'Creator/platform permission is required before source rows are distributed as public derived content.' }), reviewValue: review({ conversionReadiness: 'hold', rightsReview: 'pending', blockers: ['rights_permission_required'], editorialAction: 'request_permission' }),
    sourceRows: ds02Rows, steps: [step('step-ds02-criteria', '계약 조건 판정', 0, contractItems.map((entry) => entry.itemId))], items: contractItems, examples: commonExamples,
  }),
  dtoBase({
    dtoId: 'dto-phase-lifecycle-developer-portfolio', scenario: '단계형 프로젝트', sourceId: 'source-velog-portfolio', title: '효율적으로 IT 개발자로 취업 준비하기 — 포트폴리오 편', url: 'https://velog.io/@vonvoyage27/%ED%9A%A8%EC%9C%A8%EC%A0%81%EC%9C%BC%EB%A1%9C-IT-%EA%B0%9C%EB%B0%9C%EC%9E%90%EB%A1%9C-%EC%B7%A8%EC%97%85-%EC%A4%80%EB%B9%84%ED%95%98%EA%B8%B0-%ED%8F%AC%ED%8A%B8%ED%8F%B4%EB%A6%AC%EC%98%A4-%ED%8E%B8',
    taxonomyValue: taxonomy({ status: 'provisional', life: 'work_career', secondaryLife: ['study_reading'], tags: ['개발', '포트폴리오'], shape: 'procedure_rows', execution: 'phase_lifecycle', artifact: 'sheet', secondaryArtifacts: ['todo'] }),
    audienceValue: audience('work_career', { roles: ['professional', 'learner'], collaborationContext: 'solo', userNeedSignals: ['track_progress', 'remember_when'], frictionSignals: ['lost_progress', 'missed_deadline'] }),
    accessValue: access({ providerType: 'creator', rowAccess: 'partial', sourceFormat: { category: 'article', mediaType: 'text/html', detail: { provenance: 'legacy runtime rows require source-row refresh' } } }), rightsValue: rights({ basis: 'unknown', reviewStatus: 'pending', rationale: 'Current app Items are source-linked but first-class source-row and permission evidence must be refreshed.' }), reviewValue: review({ sourceRowStatus: 'partial', blockers: ['source_incomplete', 'rights_permission_required'], rightsReview: 'pending', editorialAction: 'revise' }),
    sourceRows: portfolioRows, steps: [step('portfolio-step-1', '기획', 0, ['portfolio-item-1', 'portfolio-item-2']), step('portfolio-step-2', '설계·구현', 1, ['portfolio-item-3', 'portfolio-item-4']), step('portfolio-step-3', '배포·정리', 2, ['portfolio-item-5', 'portfolio-item-6'])], items: portfolioItems, examples: commonExamples, sourceSupportLevel: 'inferred_draft',
  }),
  dtoBase({
    dtoId: 'dto-official-date-window-vehicle-inspection', scenario: '공식 날짜창', sourceId: 'source-ts-inspection', title: '한국교통안전공단 정기검사 대상·기준·유효기간 안내', url: 'https://main.kotsa.or.kr/portal/contents.do?menuCode=01010200',
    taxonomyValue: taxonomy({ life: 'money_admin_purchase', tags: ['자동차검사', '공식 기간'], shape: 'date_window', execution: 'date_preparation', artifact: 'calendar', secondaryArtifacts: ['checklist', 'memo'] }),
    audienceValue: audience('money_admin_purchase', { roles: ['individual'], userNeedSignals: ['remember_when', 'preserve_source_context'], frictionSignals: ['missed_deadline', 'source_revisit_cost'] }),
    accessValue: access({ providerType: 'public_institution', sourceFormat: { category: 'article', mediaType: 'text/html', detail: { schedulePolicy: 'source fields only; no invented offset' } } }), rightsValue: rights(), reviewValue: review({ portfolioRole: 'official_trust_anchor' }),
    sourceRows: vehicleRows, steps: [step('vehicle-window-step', '공식 검사 기간', 0, ['vehicle-window-item'])], items: vehicleItems, examples: commonExamples,
  }),
  dtoBase({
    dtoId: 'dto-rights-restricted-visitkorea-route', scenario: '권리 제한 콘텐츠', sourceId: 'source-ds08', title: ds08.sourceSnapshot.title, url: ds08.sourceSnapshot.sourceUrl,
    taxonomyValue: taxonomy({ life: 'travel_outings', secondaryLife: ['family_parenting'], tags: ['공주', '당일치기'], shape: 'procedure_rows', execution: 'ordered_procedure', artifact: 'checklist', secondaryArtifacts: ['memo'] }),
    audienceValue: audience('travel_outings', { roles: ['traveler', 'caregiver'], collaborationContext: 'shared_household', userNeedSignals: ['follow_sequence', 'handoff_or_share'], frictionSignals: ['collaboration_gap'] }),
    accessValue: access({ providerType: 'government_public', sourceFormat: { category: 'article', mediaType: 'text/html', detail: { sourceRows: 4 } } }), rightsValue: rights({ basis: 'official_reuse_policy', allowedUse: ['link_metadata', 'internal_review'], territoryScope: 'named', territories: ['KR'], reviewStatus: 'restricted', rationale: 'The source package records attribution/noncommercial/no-derivatives conditions; public transformed rows require separate permission.' }), reviewValue: review({ conversionReadiness: 'hold', rightsReview: 'restricted', blockers: ['rights_unknown', 'freshness_pending'], editorialAction: 'request_permission' }),
    sourceRows: ds08Rows, steps: [step('step-ds08-route', '공주 원문 코스', 0, visitItems.map((entry) => entry.itemId))], items: visitItems, examples: commonExamples, projectionBlocked: true,
  }),
  dtoBase({
    dtoId: 'dto-source-import-required-todoist-podcast', scenario: 'source_import_required', sourceId: 'source-todoist-podcast', title: 'Podcast Workflow template', url: 'https://www.todoist.com/templates/podcast-workflow',
    taxonomyValue: taxonomy({ status: 'provisional', life: 'work_career', tags: ['팟캐스트', '제작'], shape: null, execution: 'phase_lifecycle', artifact: 'checklist', secondaryArtifacts: ['todo'] }),
    audienceValue: audience('work_career', { roles: ['creator_operator', 'team_member'], contentLocale: 'en', applicableLocales: ['ko-KR'], applicability: 'local_adaptation_required', accountOrEntitlement: 'free_account', collaborationContext: 'team_roles', userNeedSignals: ['track_progress', 'handoff_or_share'], frictionSignals: ['lost_progress', 'collaboration_gap'] }),
    accessValue: access({ providerType: 'brand_official', platformRoles: ['discover', 'host', 'execute', 'entitlement'], discoveryAccess: 'public', rowAccess: 'partial', acquisitionMethods: ['oauth_api'], sourceFormat: { category: 'template', mediaType: 'text/html', detail: { publicPhaseNames: 4, fullTasks: 'available only after user-authorized copy' } } }), rightsValue: rights({ basis: 'provider_terms', reviewStatus: 'pending', rationale: 'User authorization can provide a private copy, but public template rows and reuse rights are not inferred.' }), reviewValue: review({ sourceRowStatus: 'partial', conversionReadiness: 'source_import_required', localeReview: 'adaptation_required', privacyReview: 'pending', rightsReview: 'pending', blockers: ['source_import_required', 'rights_unknown', 'locale_review_required', 'privacy_review_required', 'account_or_entitlement_required'], editorialAction: 'import_source' }),
    sourceRows: todoistRows, steps: [], items: [], examples: commonExamples, projectionBlocked: true,
  }),
];

const output = {
  documentType: 'flowme_backend_dto_collection',
  schemaVersion: 'flowme-taxonomy-v1.1',
  date: '2026-07-20',
  claimBoundary: 'These DTOs demonstrate a backend contract and source-fidelity gates. They do not constitute public-content approval, legal clearance, live crawling or observed-user validation.',
  dtos,
};

fs.writeFileSync(path.join(here, 'representative-backend-dto-v1.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ dtoCount: dtos.length, scenarios: dtos.map((entry) => entry.scenario), itemCount: dtos.reduce((sum, entry) => sum + entry.items.length, 0), sourceRowCount: dtos.reduce((sum, entry) => sum + entry.sourceRows.length, 0) }, null, 2));
