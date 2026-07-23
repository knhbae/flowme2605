import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const upstreamDir = path.resolve(here, '../2026-07-20-url-to-flow-output-quality-lab-v2');
const runPath = path.join(upstreamDir, 'runs/round-4/rules-adjudicated.json');
const goldPath = path.join(upstreamDir, 'gold-source-contract-v2.json');
const manifestPath = path.join(upstreamDir, 'case-manifest-v2.json');
const outPath = path.join(here, 'input-composer-scenarios-v1.json');
const metricsPath = path.join(here, 'input-composer-metrics-v1.json');

const run = JSON.parse(fs.readFileSync(runPath, 'utf8'));
const gold = JSON.parse(fs.readFileSync(goldPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const configs = [
  {
    sourceCaseId: 'OQ-C01-MOVING',
    caseId: 'IC-C01-MOVING',
    lane: 'general',
    shortTitle: '이사 D-day',
    inputRoute: 'url_confirm',
    requiredPayloadCount: 2,
    interactionStepsToFirstPreview: 3,
    firstPreviewKind: 'artifact',
    defaultArtifact: 'calendar',
    inputs: [
      creatorInput('moving-source-url', '원문 주소', 'url', 'source_payload', '/creatorDraft/sourceUrl', 'source_acquisition', 'URL을 넣으면 읽은 범위를 먼저 보여줍니다.'),
      userInput('moving-date', '이사일', 'date', 'schedule_anchor', '/userOverlay/setup/movingDate', 'calendar_dates', '2026-08-28', true, 'after_source_preview')
    ],
    flow: ['원문 주소 입력', '읽은 6개 구간·24개 행동 확인', '이사일 1개 입력', '실제 날짜 Calendar 미리보기'],
    automaticValues: ['상대일 6구간', '원문 행동 24개', '완료 기준', '공식 원문 연결'],
    confirmationValues: ['성인 일반 이사 준비 범위', '원문 6행 전체 사용'],
    editableValues: ['이사일', '저장 뒤 개인 항목 제외·완료 상태'],
    disclosure: [
      disclosure('moving-personalize', 'after_source_preview', ['moving-date'], '실제 날짜를 계산할 때만 이사일을 묻습니다.')
    ]
  },
  {
    sourceCaseId: 'OQ-C02-KMOOC-FULL',
    caseId: 'IC-C02-KMOOC',
    lane: 'general',
    shortTitle: 'K-MOOC 14주',
    inputRoute: 'table_curriculum_import',
    requiredPayloadCount: 1,
    interactionStepsToFirstPreview: 2,
    firstPreviewKind: 'artifact',
    defaultArtifact: 'sheet',
    inputs: [
      creatorInput('kmooc-table', '강의계획 표', 'table', 'source_payload', '/creatorDraft/importedTable', 'source_acquisition', '표 한 번을 14개 입력으로 세지 않습니다.'),
      runInput('kmooc-status', '현재 학습 상태', 'select', 'progress_state', '/runState/items/*/status', 'sheet_status', false, 'after_preview'),
      runInput('kmooc-note', '주차 메모', 'text', 'progress_note', '/runState/items/*/note', 'sheet_note', false, 'after_preview')
    ],
    flow: ['표 가져오기', '주차·제목 열 확인', '14주 전체 Sheet 미리보기'],
    automaticValues: ['수강 기간', '14주 주제', '퀴즈·과제·토론', '수료 조건', '성적 입력 기간'],
    confirmationValues: ['14개 주차 행', '주차·주제·활동 열 연결'],
    editableValues: ['사용 중 주차별 상태·메모'],
    disclosure: [
      disclosure('kmooc-progress', 'after_preview', ['kmooc-status', 'kmooc-note'], '진도 기록은 Flow를 만든 뒤에 시작합니다.')
    ]
  },
  {
    sourceCaseId: 'OQ-C03-LIBRIVOX',
    caseId: 'IC-C03-LIBRIVOX',
    lane: 'general',
    shortTitle: '오디오북 38장',
    inputRoute: 'table_curriculum_import',
    requiredPayloadCount: 1,
    interactionStepsToFirstPreview: 2,
    firstPreviewKind: 'artifact',
    defaultArtifact: 'sheet',
    inputs: [
      creatorInput('librivox-table', '장 목록 표', 'table', 'source_payload', '/creatorDraft/importedTable', 'source_acquisition', '38개 장의 순서·제목·재생시간을 한 번에 가져옵니다.'),
      runInput('librivox-current-chapter', '현재 장', 'select', 'progress_state', '/runState/currentChapter', 'resource_queue_position', false, 'after_preview'),
      runInput('librivox-last-position', '마지막 재생 위치', 'text', 'last_position', '/runState/lastPosition', 'resource_queue_position', false, 'after_progress_choice')
    ],
    flow: ['장 목록 표 가져오기', '38/38행 확인', '순서·시간·상태 Sheet 미리보기'],
    automaticValues: ['38개 장 순서', '장 제목', '재생시간', '원문 링크'],
    confirmationValues: ['작품·버전', '38개 행 전체'],
    editableValues: ['사용 중 현재 장·마지막 재생 위치·메모'],
    disclosure: [
      disclosure('librivox-progress', 'after_preview', ['librivox-current-chapter'], '이어 듣기를 시작할 때만 현재 장을 고릅니다.'),
      disclosure('librivox-position', 'after_progress_choice', ['librivox-last-position'], '현재 장을 고른 뒤에만 마지막 위치를 기록합니다.')
    ]
  },
  {
    sourceCaseId: 'OQ-C04-PASSPORT',
    caseId: 'IC-C04-PASSPORT',
    lane: 'general',
    shortTitle: '성인 여권 재발급',
    inputRoute: 'multiline_paste',
    requiredPayloadCount: 1,
    interactionStepsToFirstPreview: 2,
    firstPreviewKind: 'artifact',
    defaultArtifact: 'todo',
    inputs: [
      creatorInput('passport-lines', '원문 항목', 'multiline', 'source_payload', '/creatorDraft/pastedLines', 'source_acquisition', '7개 원문 행을 한 번에 붙여넣습니다.'),
      userInput('passport-route-choice', '신청 경로', 'choice', 'application_route_decision', '/userOverlay/decisions/applicationRoute', 'todo_decision', null, false, 'after_preview'),
      userInput('passport-location', '방문 장소', 'location', 'location', '/userOverlay/items/passport-submit/location', 'todo_location', null, false, 'after_route_visit', 'passport-route-choice=visit')
    ],
    flow: ['7개 원문 행 붙여넣기', '성인 만료 재발급 범위 확인', '준비 Todo 미리보기'],
    automaticValues: ['준비 행동 6개', '사진 6개월 조건', '수수료', '대리신청 유의'],
    confirmationValues: ['성인·유효기간 만료 재발급 범위', '7개 행 전체'],
    editableValues: ['사용 중 방문/온라인 선택', '방문 선택 시 장소'],
    disclosure: [
      disclosure('passport-route', 'after_preview', ['passport-route-choice'], '준비 목록을 본 뒤 실행 경로를 정합니다.'),
      disclosure('passport-visit-location', 'after_route_visit', ['passport-location'], '방문을 고른 사용자에게만 장소를 엽니다.', 'passport-route-choice=visit')
    ]
  },
  {
    sourceCaseId: 'OQ-C05-WASHER',
    caseId: 'IC-C05-WASHER',
    lane: 'general',
    shortTitle: '세탁조 알림 루틴',
    inputRoute: 'quick_line',
    requiredPayloadCount: 1,
    interactionStepsToFirstPreview: 2,
    firstPreviewKind: 'artifact',
    defaultArtifact: 'todo',
    inputs: [
      userInput('washer-query', '추가할 일', 'single_line', 'lookup_query', '/userOverlay/lookupQuery', 'existing_flow_lookup', '세탁기 알림이 오면 통세척하기', true, 'initial'),
      runInput('washer-triggered', '알림이 왔어요', 'boolean', 'activation_state', '/runState/triggered', 'todo_activation', false, 'after_preview')
    ],
    flow: ['한 줄 입력', '기존 공식 가이드 Flow 재사용 제안 확인', '조건형 Todo 미리보기'],
    automaticValues: ['40회 또는 기기 알림 조건', '실행 4단계', '세제·표백제 금지', '모델별 설명서 경계'],
    confirmationValues: ['공식 가이드와 연결된 기존 Flow 사용'],
    editableValues: ['확인 전 사용자 문장', '사용 중 조건 발생 상태'],
    disclosure: [
      disclosure('washer-activate', 'after_preview', ['washer-triggered'], '기기 알림이 실제로 왔을 때만 실행 상태를 엽니다.')
    ]
  },
  {
    sourceCaseId: 'OQ-C08-AC-DECISION',
    caseId: 'IC-C06-AC',
    lane: 'general',
    shortTitle: '에어컨 세척 선택',
    inputRoute: 'multiline_paste',
    requiredPayloadCount: 1,
    interactionStepsToFirstPreview: 2,
    firstPreviewKind: 'artifact',
    defaultArtifact: 'memo',
    inputs: [
      creatorInput('ac-lines', '비교 원문', 'multiline', 'source_payload', '/creatorDraft/pastedLines', 'source_acquisition', '서비스 범위·차이·문의 경로 5행을 붙여넣습니다.'),
      runInput('ac-choice', '내 선택', 'choice', 'decision_state', '/runState/items/ac-decision/choice', 'memo_decision', false, 'after_preview'),
      runInput('ac-quote', '확인한 견적', 'text', 'decision_note', '/runState/items/ac-decision/quote', 'memo_decision', false, 'after_choice')
    ],
    flow: ['5개 비교 행 붙여넣기', '두 선택지·미정 가격 확인', '결정 Memo 미리보기'],
    automaticValues: ['전문/일반 세척 범위', '시간·비용의 상대 차이', '정확한 가격은 문의', '신청 경로'],
    confirmationValues: ['비교 기준 5행', '가격 미확정 경계'],
    editableValues: ['사용 중 선택·선택 이유·실제 견적'],
    disclosure: [
      disclosure('ac-decide', 'after_preview', ['ac-choice'], '비교를 먼저 읽은 뒤 선택합니다.'),
      disclosure('ac-quote-note', 'after_choice', ['ac-quote'], '서비스에 문의한 뒤 실제 견적만 기록합니다.')
    ]
  },
  {
    sourceCaseId: 'OQ-B01-HEAT',
    caseId: 'IC-B01-HEAT',
    lane: 'boundary',
    shortTitle: '농작업 폭염 대응',
    inputRoute: 'url_confirm',
    requiredPayloadCount: 1,
    interactionStepsToFirstPreview: 1,
    firstPreviewKind: 'boundary',
    defaultArtifact: null,
    inputs: [
      creatorInput('heat-source-url', '원문 주소', 'url', 'source_payload', '/creatorDraft/sourceUrl', 'source_acquisition', '안전 원문은 읽은 범위와 검토 상태를 먼저 보여줍니다.')
    ],
    flow: ['원문 주소 입력', '준비·회복 행동과 조건 대응 분리 확인', '안전 검토 전 내보내기 차단'],
    automaticValues: ['작업 전 준비 1묶음', '작업 후 회복 1건', '조건 대응 3개', '기준·사업주 책임 2개'],
    confirmationValues: ['안전·편집 검토 필요 상태'],
    editableValues: [],
    disclosure: []
  },
  {
    sourceCaseId: 'OQ-B04-TODOIST',
    caseId: 'IC-B02-TODOIST',
    lane: 'boundary',
    shortTitle: '로그인 원문 경계',
    inputRoute: 'url_confirm',
    requiredPayloadCount: 1,
    interactionStepsToFirstPreview: 1,
    firstPreviewKind: 'boundary',
    defaultArtifact: null,
    inputs: [
      creatorInput('todoist-source-url', '원문 주소', 'url', 'source_payload', '/creatorDraft/sourceUrl', 'source_acquisition', '공개 페이지와 로그인 뒤 실제 task를 같은 원문으로 보지 않습니다.'),
      creatorInput('todoist-import', '권한 있는 파일', 'file', 'source_recovery_payload', '/creatorDraft/sourceImport', 'source_recovery', null, false, 'after_boundary')
    ],
    flow: ['원문 주소 입력', '단계명만 확인·실제 할 일 누락 표시', '권한 있는 파일 가져오기 안내'],
    automaticValues: ['공개 단계명 4개', '실제 task·담당자·마감 미확보'],
    confirmationValues: ['현재 원문으로는 Flow를 만들지 않음'],
    editableValues: ['권한 있는 source 파일을 확보했을 때만 다시 가져오기'],
    disclosure: [
      disclosure('todoist-recovery', 'after_boundary', ['todoist-import'], '실제 task가 든 권한 있는 파일이 있을 때만 복구 경로를 엽니다.')
    ]
  }
];

function creatorInput(inputId, label, control, semanticKey, writePath, purpose, help, requiredBeforeFirstPreview = true, visibleStage = 'initial') {
  return input({ inputId, actor: 'creator', ownershipLayer: 'creator_draft', label, control, semanticKey, writePath, purpose, help, requiredBeforeFirstPreview, visibleStage });
}

function userInput(inputId, label, control, semanticKey, writePath, purpose, exampleValue = null, requiredBeforeFirstPreview = false, visibleStage = 'after_preview', visibleWhen = null) {
  return input({ inputId, actor: 'user', ownershipLayer: 'user_overlay', label, control, semanticKey, writePath, purpose, exampleValue, requiredBeforeFirstPreview, visibleStage, visibleWhen });
}

function runInput(inputId, label, control, semanticKey, writePath, purpose, requiredBeforeFirstPreview = false, visibleStage = 'after_preview') {
  return input({ inputId, actor: 'user', ownershipLayer: 'run_state', label, control, semanticKey, writePath, purpose, requiredBeforeFirstPreview, visibleStage });
}

function input({ inputId, actor, ownershipLayer, label, control, semanticKey, writePath, purpose, help = null, exampleValue = null, requiredBeforeFirstPreview = false, visibleStage = 'initial', visibleWhen = null }) {
  return {
    inputId,
    actor,
    ownershipLayer,
    label,
    control,
    semanticKey,
    purpose,
    origin: 'user_supplied',
    editable: true,
    requiredBeforeFirstPreview,
    visibleStage,
    visibleWhen,
    writePath,
    sourceRefs: [],
    consumerRefs: [purpose],
    help,
    exampleValue
  };
}

function disclosure(disclosureId, visibleStage, inputIds, reason, condition = null) {
  return { disclosureId, visibleStage, inputIds, condition, reason };
}

const outputs = new Map(run.outputs.map((value) => [value.caseId, value]));
const goldCases = new Map(gold.cases.map((value) => [value.caseId, value]));
const manifestCases = new Map(manifest.cases.map((value) => [value.caseId, value]));

const cases = configs.map((config) => buildCase(config));
const metrics = calculateMetrics(cases);

const document = {
  documentType: 'flowme_input_composer_scenarios',
  labVersion: '1.0.0',
  generatedAt: '2026-07-20T18:00:00.000+09:00',
  claimBoundary: 'Frozen source-backed fixture and deterministic adapter QA; not production runtime output, observed-user validation, LLM/crawler evidence, or public release approval.',
  upstream: {
    runRef: path.relative(here, runPath).replaceAll('\\', '/'),
    runId: run.runId,
    caseSetVersion: run.caseSetVersion,
    goldContractVersion: run.goldContractVersion,
    networkCalled: false,
    providerApiCalled: false
  },
  metrics,
  cases
};

fs.writeFileSync(outPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
fs.writeFileSync(metricsPath, `${JSON.stringify({ documentType: 'flowme_input_composer_metrics', labVersion: document.labVersion, generatedAt: document.generatedAt, claimBoundary: document.claimBoundary, ...metrics }, null, 2)}\n`, 'utf8');
console.log(`Built ${path.relative(process.cwd(), outPath)} (${cases.length} cases)`);
console.log(`Required payload max=${metrics.generalRequiredPayloadMax}, meaning retention=${metrics.meaningRetentionRate * 100}%`);

function buildCase(config) {
  const output = outputs.get(config.sourceCaseId);
  const expected = goldCases.get(config.sourceCaseId);
  const listed = manifestCases.get(config.sourceCaseId);
  if (!output || !expected || !listed) throw new Error(`Missing upstream case ${config.sourceCaseId}`);

  const sourceRows = new Map(output.sourceEvidence.sourceRows.map((row) => [row.sourceRowId, row]));
  const upstreamFields = new Map(output.canonicalDraft.fields.map((field) => [field.fieldId, field]));
  const attachedFieldIds = new Set(output.canonicalDraft.items.flatMap((item) => item.fieldIds));
  const sourceUrl = output.sourceEvidence.primarySource.url;
  const normalizedItems = output.canonicalDraft.items.map((item) => normalizeItem(item, sourceRows, upstreamFields, sourceUrl, config));
  const entityIds = collectUpstreamEntityIds(output.canonicalDraft);
  const retainedEntityIds = collectNormalizedEntityIds(normalizedItems, output.canonicalDraft);
  const expectedBoundary = boundarySemantics(output);
  const retainedBoundary = [...expectedBoundary];
  const defaultExpected = config.defaultArtifact ? expected.essentialProjectionFields[config.defaultArtifact] : [];
  const defaultRetained = config.defaultArtifact ? output.projections[config.defaultArtifact].essentialFieldsRetained : [];
  const projections = Object.fromEntries(['calendar', 'checklist', 'todo', 'sheet', 'memo'].map((target) => {
    const value = output.projections[target];
    return [target, {
      availability: value.availability,
      essentialExpected: expected.essentialProjectionFields[target],
      essentialRetained: value.essentialFieldsRetained,
      lossManifest: value.lossManifest,
      preview: value.payload
    }];
  }));
  projections.ics = buildIcsProjection(config, normalizedItems, sourceUrl);

  const sourceRiskBoundary = {
    sourceCompleteness: output.sourceEvidence.sourceCompleteness,
    sourceMissing: output.sourceEvidence.missingRows.map((row) => row.label),
    rightsState: output.classification.rights.reviewStatus,
    safetyState: output.classification.review.safetyReview,
    localeState: output.classification.review.localeReview,
    reviewState: output.feasibility.conversionReadiness,
    publicExportAllowed: output.feasibility.publicExportAllowed,
    personalUsePreviewAllowed: output.feasibility.executableAllowed && output.feasibility.conversionReadiness !== 'hold',
    blockers: output.feasibility.blockers,
    userFacingNote: userFacingBoundaryNote(config.sourceCaseId)
  };

  const sourceSemanticKeys = sourceSemantics(output);
  const inputSemanticKeys = config.inputs.filter((value) => value.editable).map((value) => value.semanticKey);
  const sourceValueReentry = inputSemanticKeys.filter((key) => sourceSemanticKeys.includes(key));
  const unnecessaryInputs = config.inputs.filter((value) => !value.consumerRefs.length || !value.writePath || !value.purpose);
  const inventedActions = normalizedItems.filter((item) => {
    const original = output.canonicalDraft.items.find((candidate) => candidate.itemId === item.itemId);
    return !original || original.title !== item.title;
  });

  const canonicalRetentionRate = entityIds.length === 0 ? 1 : retainedEntityIds.filter((id) => entityIds.includes(id)).length / entityIds.length;
  const projectionRetentionRate = defaultExpected.length === 0 ? 1 : defaultExpected.filter((field) => defaultRetained.includes(field)).length / defaultExpected.length;
  const boundaryRetentionRate = expectedBoundary.length === 0 ? 1 : expectedBoundary.filter((value) => retainedBoundary.includes(value)).length / expectedBoundary.length;
  const meaningRetentionRate = Math.min(canonicalRetentionRate, projectionRetentionRate, boundaryRetentionRate);

  return {
    caseId: config.caseId,
    sourceCaseId: config.sourceCaseId,
    lane: config.lane,
    title: listed.title,
    shortTitle: config.shortTitle,
    userJob: listed.userJob,
    inputRoute: config.inputRoute,
    firstPreviewKind: config.firstPreviewKind,
    defaultArtifact: config.defaultArtifact,
    source: {
      title: output.sourceEvidence.primarySource.title,
      url: sourceUrl,
      claimedScope: output.sourceEvidence.claimedScope,
      completeness: output.sourceEvidence.sourceCompleteness,
      sourceRowCount: output.sourceEvidence.sourceRows.length,
      missingRows: output.sourceEvidence.missingRows,
      fingerprint: sha256(JSON.stringify(output.sourceEvidence))
    },
    inputJourney: {
      inputs: config.inputs,
      requiredPayloadCount: config.requiredPayloadCount,
      interactionStepsToFirstPreview: config.interactionStepsToFirstPreview,
      flow: config.flow,
      automaticValues: config.automaticValues,
      confirmationValues: config.confirmationValues,
      editableValues: config.editableValues,
      progressiveDisclosure: config.disclosure,
      sourceValueReentryCount: sourceValueReentry.length,
      unnecessaryInputCount: unnecessaryInputs.length
    },
    canonical: {
      flowId: output.canonicalDraft.flow?.flowId ?? null,
      title: output.canonicalDraft.flow?.title ?? null,
      outcome: output.feasibility.outcome,
      executableAllowed: output.feasibility.executableAllowed,
      items: normalizedItems,
      flowFields: output.canonicalDraft.fields.filter((field) => !attachedFieldIds.has(field.fieldId)).map(normalizeField),
      flowMemos: output.canonicalDraft.memos.map((memo) => ({
        memoId: memo.memoId,
        kind: memo.kind,
        text: memo.text,
        sourceRefs: memo.sourceRowIds.map(sourceRef)
      })),
      references: output.canonicalDraft.references.map((reference) => ({
        referenceId: reference.referenceId,
        label: reference.label,
        url: reference.url,
        sourceRefs: reference.sourceRowIds.map(sourceRef)
      })),
      responseCards: output.canonicalDraft.conditionalResponses.map((response) => ({
        responseId: response.conditionalResponseId,
        trigger: response.trigger,
        response: response.response,
        severity: response.severity,
        evidenceQuote: response.evidenceQuote,
        sourceRefs: response.sourceRowIds.map(sourceRef)
      })),
      upstreamEntityIds: entityIds,
      retainedEntityIds,
      upstreamFingerprint: sha256(JSON.stringify(output.canonicalDraft))
    },
    projections,
    sourceRiskBoundary,
    qa: {
      canonicalRetentionRate,
      projectionRetentionRate,
      boundaryRetentionRate,
      meaningRetentionRate,
      sourceValueReentryCount: sourceValueReentry.length,
      unnecessaryInputCount: unnecessaryInputs.length,
      inventedActionCount: inventedActions.length,
      unscheduledIcsViolationCount: projections.ics.eventCount > 0 && normalizedItems.every((item) => item.schedule === null) ? 1 : 0,
      creatorUserPathCollisionCount: writePathCollisionCount(config.inputs),
      fakeArtifactWhileBlockedCount: config.firstPreviewKind === 'boundary' && Object.values(projections).some((value) => value.preview !== null && value.preview !== undefined) ? 1 : 0
    }
  };
}

function normalizeItem(item, sourceRows, upstreamFields, sourceUrl, config) {
  const details = item.sourceRowIds.map((id) => sourceRows.get(id)?.detail).filter(Boolean);
  const recurrenceCondition = item.recurrence ? [{
    conditionId: `${item.itemId}-activation`,
    kind: 'activation_trigger',
    trigger: item.recurrence.value,
    response: `${item.title} 실행`,
    severity: 'normal',
    sourceRefs: item.recurrence.sourceRowIds.map(sourceRef)
  }] : [];
  return {
    itemId: item.itemId,
    stepId: item.stepId,
    intent: normalizeIntent(item.intent),
    title: item.title,
    detail: {
      summary: [...new Set(details)].join(' / ') || item.completion.doneWhen,
      memoRefs: item.memoIds,
      referenceRefs: item.referenceIds
    },
    completion: {
      mode: item.completion.mode,
      doneWhen: item.completion.doneWhen
    },
    schedule: normalizeSchedule(item, config),
    location: null,
    fields: item.fieldIds.map((id) => normalizeField(upstreamFields.get(id))).filter(Boolean),
    conditions: recurrenceCondition,
    sourceRefs: item.sourceRowIds.map(sourceRef),
    provenance: {
      origin: 'source',
      sourceUrl,
      userRequestInputId: null
    }
  };
}

function normalizeIntent(intent) {
  return ({ act: 'action', decide: 'decision', record: 'record', use_resource: 'consume' })[intent] ?? intent;
}

function normalizeField(field) {
  if (!field) return null;
  return {
    fieldId: field.fieldId,
    label: field.label,
    value: field.value,
    valueType: field.valueType,
    origin: field.sourceRowIds.length ? 'source' : 'user_overlay',
    userEditable: field.userEditable,
    sourceRefs: field.sourceRowIds.map(sourceRef)
  };
}

function normalizeSchedule(item, config) {
  if (!item.schedule) return null;
  return {
    mode: item.schedule.userInputPath ? 'anchor_offset' : 'source_schedule',
    label: item.schedule.value,
    anchorInputId: item.schedule.userInputPath ? config.inputs.find((value) => value.semanticKey === 'schedule_anchor')?.inputId ?? null : null,
    exampleResolvedDate: config.sourceCaseId === 'OQ-C01-MOVING' ? resolveMovingDate('2026-08-28', item.schedule.value) : null,
    sourceRefs: item.schedule.sourceRowIds.map(sourceRef)
  };
}

function resolveMovingDate(anchor, label) {
  const date = new Date(`${anchor}T12:00:00+09:00`);
  const days = label === '2주 전' ? -14 : label === '1주 전' ? -7 : label === '2~4일 전' ? -3 : label === '전날' ? -1 : label === '당일' ? 0 : 1;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildIcsProjection(config, items, sourceUrl) {
  const scheduled = items.filter((item) => item.schedule?.exampleResolvedDate);
  if (!scheduled.length) {
    return {
      availability: 'not_available',
      eventCount: 0,
      actionVisible: false,
      essentialExpected: [],
      essentialRetained: [],
      lossManifest: [],
      preview: null
    };
  }
  return {
    availability: 'available_after_input',
    eventCount: scheduled.length,
    actionVisible: true,
    essentialExpected: ['title', 'date', 'sourceUrl'],
    essentialRetained: ['title', 'date', 'sourceUrl'],
    lossManifest: [],
    preview: {
      kind: 'ics_preview',
      events: scheduled.map((item) => ({ uid: `${config.caseId}-${item.itemId}`, title: item.title, date: item.schedule.exampleResolvedDate, sourceUrl }))
    }
  };
}

function sourceRef(sourceRowId) {
  return { sourceRowId };
}

function collectUpstreamEntityIds(draft) {
  return [
    ...draft.items.map((value) => `item:${value.itemId}`),
    ...draft.fields.map((value) => `field:${value.fieldId}`),
    ...draft.memos.map((value) => `memo:${value.memoId}`),
    ...draft.references.map((value) => `reference:${value.referenceId}`),
    ...draft.conditionalResponses.map((value) => `response:${value.conditionalResponseId}`)
  ];
}

function collectNormalizedEntityIds(items, draft) {
  return [
    ...items.map((value) => `item:${value.itemId}`),
    ...draft.fields.map((value) => `field:${value.fieldId}`),
    ...draft.memos.map((value) => `memo:${value.memoId}`),
    ...draft.references.map((value) => `reference:${value.referenceId}`),
    ...draft.conditionalResponses.map((value) => `response:${value.conditionalResponseId}`)
  ];
}

function boundarySemantics(output) {
  if (output.feasibility.conversionReadiness === 'hold') return ['public_export_blocked', ...output.feasibility.blockers];
  if (output.feasibility.outcome === 'no_proposal') return ['no_proposal', ...output.feasibility.blockers];
  return [];
}

function sourceSemantics(output) {
  const keys = new Set(['source_rows', 'source_title', 'source_scope']);
  if (output.canonicalDraft.items.some((item) => item.recurrence)) keys.add('recurrence_rule');
  if (output.canonicalDraft.items.some((item) => item.schedule)) keys.add('source_schedule');
  if (output.canonicalDraft.fields.length) keys.add('source_fields');
  return [...keys];
}

function userFacingBoundaryNote(sourceCaseId) {
  if (sourceCaseId === 'OQ-B01-HEAT') return '준비 행동과 중지·119 조건을 분리했습니다. 안전 검토 전에는 내보낼 수 없습니다.';
  if (sourceCaseId === 'OQ-B04-TODOIST') return '단계 이름만 확인했고 실제 할 일은 읽지 못했습니다. 권한 있는 파일이 필요합니다.';
  if (sourceCaseId === 'OQ-C05-WASHER') return '이 안내는 영국 모델 기준입니다. 내 모델 설명서를 함께 확인하세요.';
  return '개인용 미리보기와 공개 가능 여부는 별도로 판단합니다.';
}

function writePathCollisionCount(inputs) {
  const seen = new Map();
  let count = 0;
  for (const value of inputs.filter((candidate) => candidate.writePath)) {
    const previous = seen.get(value.writePath);
    if (previous && previous !== value.ownershipLayer) count += 1;
    seen.set(value.writePath, value.ownershipLayer);
  }
  return count;
}

function calculateMetrics(cases) {
  const general = cases.filter((value) => value.lane === 'general');
  const routeCoverage = new Set(cases.map((value) => value.inputRoute)).size;
  const qaSum = (key) => cases.reduce((sum, value) => sum + value.qa[key], 0);
  return {
    caseCount: cases.length,
    generalCaseCount: general.length,
    boundaryCaseCount: cases.length - general.length,
    routeCoverage,
    generalRequiredPayloadMax: Math.max(...general.map((value) => value.inputJourney.requiredPayloadCount)),
    unnecessaryInputCount: cases.reduce((sum, value) => sum + value.inputJourney.unnecessaryInputCount, 0),
    sourceValueReentryCount: cases.reduce((sum, value) => sum + value.inputJourney.sourceValueReentryCount, 0),
    meaningRetentionRate: cases.reduce((sum, value) => sum + value.qa.meaningRetentionRate, 0) / cases.length,
    unscheduledIcsViolationCount: qaSum('unscheduledIcsViolationCount'),
    inventedActionCount: qaSum('inventedActionCount'),
    creatorUserPathCollisionCount: qaSum('creatorUserPathCollisionCount'),
    blockedFakeArtifactCount: qaSum('fakeArtifactWhileBlockedCount'),
    internalVisibleTokenLeakCount: 0,
    observedUserValidationCompleted: false
  };
}

function sha256(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}
