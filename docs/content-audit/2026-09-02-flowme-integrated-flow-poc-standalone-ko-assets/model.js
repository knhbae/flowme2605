/* FlowMe integrated-flow standalone PoC model. Not an operating storage contract. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const losslessRuntime = require('./lossless-authoring-runtime.cjs').loadCommonJs();
    const validationExamplesRuntime = require('./validation-examples-runtime.cjs').loadCommonJs();
    let structureTemplateRuntime = null;
    let sourceUpdateRuntime = null;
    try {
      structureTemplateRuntime = require('./structure-template-runtime.cjs').loadCommonJs();
    } catch (error) {
      structureTemplateRuntime = null;
    }
    try {
      sourceUpdateRuntime = require('./source-update-runtime.cjs').loadCommonJs();
    } catch (error) {
      sourceUpdateRuntime = null;
    }
    module.exports = factory(losslessRuntime, validationExamplesRuntime, structureTemplateRuntime, sourceUpdateRuntime);
  } else {
    root.FlowMeIntegratedPoc = factory(
      root.FlowMePersonalWorkspaceLosslessAuthoring,
      root.FlowMePersonalWorkspacePocValidationExamples,
      root.FlowMePersonalWorkspaceStructureTemplate,
      root.FlowMePersonalWorkspaceSourceUpdate
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (losslessRuntime, validationExamplesRuntime, structureTemplateRuntime, sourceUpdateRuntime) {
  'use strict';

  if (!losslessRuntime) throw new Error('lossless-authoring-runtime-missing');

  const EMPTY_VALIDATION_EXAMPLE_CATALOG = Object.freeze([]);
  const missingValidationExampleSelection = () => Object.freeze({
    status: 'unavailable',
    reason: 'runtime-missing',
    catalogVersion: 0,
    example: null,
    previewRawText: null,
    sourceOwner: null,
    templateId: null,
    sourceMutationCount: 0,
    workspaceMutationCount: 0,
    operatingMutationCount: 0
  });
  const missingValidationExampleApplyPlan = input => Object.freeze({
    status: 'blocked',
    reason: 'runtime-missing',
    catalogVersion: 0,
    exampleId: input && typeof input.exampleId === 'string' ? input.exampleId : '',
    currentSourceFingerprint: null,
    nextRawText: input && typeof input.rawText === 'string' ? input.rawText : '',
    sourceMutationCount: 0,
    workspaceMutationCount: 0,
    operatingMutationCount: 0,
    replacement: null,
    sourceOwner: null,
    templateId: null
  });
  const safeValidationExamplesRuntime = validationExamplesRuntime || Object.freeze({
    PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION: 0,
    PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_GROUPS: EMPTY_VALIDATION_EXAMPLE_CATALOG,
    PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG: EMPTY_VALIDATION_EXAMPLE_CATALOG,
    fingerprintPersonalWorkspacePocAuthoringSource: () => null,
    normalizePersonalWorkspacePocValidationExampleSearch: value => String(value || '').normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/gu, ' ').trim(),
    filterPersonalWorkspacePocValidationExamples: () => EMPTY_VALIDATION_EXAMPLE_CATALOG,
    projectPersonalWorkspacePocValidationExampleSelection: missingValidationExampleSelection,
    planPersonalWorkspacePocValidationExampleApply: missingValidationExampleApplyPlan
  });
  const EMPTY_STRUCTURE_TEMPLATE_PREVIEWS = Object.freeze([]);
  const blockedStructureTemplatePreviewPlan = (input, reason) => Object.freeze({
    status: 'blocked',
    reason,
    templateId: input && typeof input.templateId === 'string' ? input.templateId : '',
    catalogVersion: input && typeof input.catalogVersion === 'string' ? input.catalogVersion : null,
    contractVersion: input && typeof input.contractVersion === 'string' ? input.contractVersion : null,
    nextRawText: input && typeof input.rawText === 'string' ? input.rawText : '',
    sourceMutationCount: 0,
    workspaceMutationCount: 0,
    operatingMutationCount: 0,
    replacement: null,
    definition: null,
    inputDraft: null
  });
  const missingStructureTemplatePreviewPlan = input => blockedStructureTemplatePreviewPlan(
    input,
    structureTemplateRuntime ? 'planner-missing' : 'runtime-missing'
  );
  const safeStructureTemplateRuntime = structureTemplateRuntime || Object.freeze({
    PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CATALOG_VERSION: null,
    PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CONTRACT_VERSION: null,
    STRUCTURE_TEMPLATE_SIDECAR_STORAGE_KEY: null,
    fingerprintStructureTemplateRawText: () => null,
    listPersonalWorkspacePocStructureTemplatePreviews: () => EMPTY_STRUCTURE_TEMPLATE_PREVIEWS,
    findPersonalWorkspacePocStructureTemplatePreview: () => null,
    planPersonalWorkspacePocStructureTemplatePreviewApply: missingStructureTemplatePreviewPlan
  });

  const VERSION = 1;
  // Replaceable PoC-only defaults for NEW authored copies, never a legacy migration.
  const AUTHORING_HANDOFF_EXECUTION_DEFAULTS = Object.freeze({ contractVersion: 1, done: false, completedAt: null });
  const OCCURRENCE_CONTRACT_VERSION = 1;
  const RESULT_PROJECTION_VERSION = 3;
  const RESULT_DOWNLOAD_CONTRACT_VERSION = 2;
  const FINITE_RECURRENCE_PAGE_SIZE = 30;
  const OPEN_ENDED_RECURRENCE_WEEKS = 4;
  const MAX_FINITE_RECURRENCE_LIMIT = 10000;
  const MAX_OPEN_ENDED_RECURRENCE_WEEKS = 520;
  const AUTHORING_PROPERTY_CATALOG_VERSION = 2;
  const TODAY = '2026-09-02';
  const STORAGE_KEY = 'flow:poc:personal-workspace:v1:standalone-integrated';
  const DRAFT_STORAGE_KEY = 'flow:poc:personal-workspace:v1:standalone-integrated:draft';
  const CREATOR_DRAFT_LIBRARY_VERSION = 1;
  const CREATOR_DRAFT_STORAGE_KEY = 'flow:poc:personal-workspace:v1:creator-drafts';
  const SOURCE_CANDIDATE_STORAGE_KEY = 'flow:poc:personal-workspace:v1:source-candidates';
  const SOURCE_UPDATE_FIXTURE_AT = '2026-09-04T00:00:00.000Z';
  const SOURCE_UPDATE_FIXTURE_ID = 'standalone-local-validation-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const RESULT_SHEET_COLUMNS = Object.freeze([
    { key: 'status', label: '상태' },
    { key: 'sectionTitle', label: '단계' },
    { key: 'title', label: '할 일' },
    { key: 'memo', label: '메모' },
    { key: 'planDate', label: '계획 날짜' },
    { key: 'effectiveDate', label: '실행 날짜' },
    { key: 'time', label: '실행 시간' },
    { key: 'relativeDate', label: '원문 상대 날짜' },
    { key: 'sourceDate', label: '원문 날짜' },
    { key: 'timeZone', label: '시간대' },
    { key: 'place', label: '장소' },
    { key: 'resourceUrl', label: '자료' },
    { key: 'recurrence', label: '반복' },
    { key: 'recurrenceEnd', label: '반복 종료' },
    { key: 'completionCriteria', label: '완료 기준' },
    { key: 'completedAt', label: '완료 시각' },
    { key: 'planOrder', label: '계획 순서', technical: true },
    { key: 'sourceLine', label: '원문 줄', technical: true },
    { key: 'occurrenceIndex', label: '회차' },
    { key: 'originalOccurrenceDate', label: '원 발생일', technical: true },
    { key: 'occurrenceId', label: 'Occurrence id', technical: true },
    { key: 'sourceItemRef', label: 'Source Item ref', technical: true },
    { key: 'itemRef', label: 'Item ref', technical: true }
  ]);

  const AUTHORING_PROPERTY_GROUPS = Object.freeze([
    Object.freeze({ key: 'schedule', label: '일정', description: '언제, 어디서 실행할지' }),
    Object.freeze({ key: 'execution', label: '실행', description: '완료 기준과 하위 체크' }),
    Object.freeze({ key: 'content', label: '내용', description: '설명과 참고 자료' }),
    Object.freeze({ key: 'provenance', label: '더 보기', description: '출처와 근거' })
  ]);
  const AUTHORING_PROPERTY_CATALOG = Object.freeze([
    Object.freeze({ key: 'date', label: '날짜', sourceLabel: '날짜', aliases: ['날짜'], group: 'schedule', editor: 'native-date', valueKind: 'date', sourceKind: 'property', writeSupport: 'editable', handoffSupport: 'projected' }),
    Object.freeze({ key: 'relativeDate', label: '기준일 기준 날짜', sourceLabel: '상대 날짜', aliases: ['상대 날짜', '상대날짜', '상대일'], group: 'schedule', editor: 'dependent', valueKind: 'relative-date', sourceKind: 'property', writeSupport: 'editable', handoffSupport: 'projected' }),
    Object.freeze({ key: 'time', label: '시간', sourceLabel: '시간', aliases: ['시간'], group: 'schedule', editor: 'native-time', valueKind: 'time', sourceKind: 'property', writeSupport: 'editable', handoffSupport: 'preserved-blocking' }),
    Object.freeze({ key: 'timezone', label: '시간대', sourceLabel: '시간대', aliases: ['시간대'], group: 'schedule', editor: 'dependent', valueKind: 'time-zone', sourceKind: 'property', writeSupport: 'editable', handoffSupport: 'preserved-blocking', dependency: 'time' }),
    Object.freeze({ key: 'place', label: '장소', sourceLabel: '장소', aliases: ['장소', '위치'], group: 'schedule', editor: 'inline', valueKind: 'text', sourceKind: 'property', writeSupport: 'editable', handoffSupport: 'projected' }),
    Object.freeze({ key: 'duration', label: '소요 시간', sourceLabel: '소요 시간', aliases: ['소요 시간', '소요시간', '예상 시간', '예상시간'], group: 'schedule', editor: 'inline', valueKind: 'duration', sourceKind: 'property', writeSupport: 'editable', handoffSupport: 'preserved-blocking' }),
    Object.freeze({ key: 'detail', label: '설명', sourceLabel: '설명', aliases: ['설명', '상세', '자세히', '방법'], group: 'content', editor: 'inline', valueKind: 'text', sourceKind: 'property', writeSupport: 'editable', handoffSupport: 'preserved-blocking' }),
    Object.freeze({ key: 'completion', label: '완료 기준', sourceLabel: '완료 기준', aliases: ['완료 기준', '완료기준'], group: 'execution', editor: 'inline', valueKind: 'text', sourceKind: 'property', writeSupport: 'editable', handoffSupport: 'projected' }),
    Object.freeze({ key: 'condition', label: '조건 메모', sourceLabel: '실행 조건', aliases: ['실행 조건', '실행조건', '조건'], group: 'execution', editor: 'inline', valueKind: 'text', sourceKind: 'property', writeSupport: 'editable', handoffSupport: 'preserved-blocking' }),
    Object.freeze({ key: 'resource', label: '관련 링크', sourceLabel: '자료', aliases: ['자료', '링크', '영상'], group: 'content', editor: 'inline', valueKind: 'url', sourceKind: 'property', writeSupport: 'editable', handoffSupport: 'projected' }),
    Object.freeze({ key: 'repeat', label: '반복', sourceLabel: '반복', aliases: ['반복'], group: 'schedule', editor: 'dependent', valueKind: 'recurrence', sourceKind: 'property', writeSupport: 'editable', handoffSupport: 'preserved-blocking' }),
    Object.freeze({ key: 'repeatEnd', label: '반복 종료', sourceLabel: '반복 종료', aliases: ['반복 종료', '반복종료'], group: 'schedule', editor: 'dependent', valueKind: 'recurrence-end', sourceKind: 'property', writeSupport: 'editable', handoffSupport: 'preserved-blocking', dependency: 'repeat' }),
    Object.freeze({ key: 'guide', label: '안내', sourceLabel: '안내', aliases: ['안내', '가이드'], group: 'content', editor: 'inline', valueKind: 'text', sourceKind: 'property', writeSupport: 'editable', handoffSupport: 'preserved-blocking' }),
    Object.freeze({ key: 'caution', label: '주의', sourceLabel: '주의', aliases: ['주의', '경고'], group: 'content', editor: 'inline', valueKind: 'text', sourceKind: 'property', writeSupport: 'editable', handoffSupport: 'preserved-blocking' }),
    Object.freeze({ key: 'source', label: '원문 출처', sourceLabel: '출처', aliases: ['출처'], group: 'provenance', editor: 'inline', valueKind: 'url', sourceKind: 'property', writeSupport: 'editable', handoffSupport: 'preserved-blocking' }),
    Object.freeze({ key: 'subcheck', label: '하위 체크', sourceLabel: '하위 체크', aliases: [], group: 'execution', editor: 'inline', valueKind: 'child-action', sourceKind: 'child-action', writeSupport: 'editable', handoffSupport: 'preserved-blocking' })
  ]);

  const TEMPLATE_CATALOG = Object.freeze([
    { id: 'exercise-phased-4w-v1', label: '단계별 반복', description: '단계마다 기간과 반복할 일이 달라요.', exampleLabel: '4주 운동 적응', exampleSource: '# 4주 운동 적응\n- 기준일: 2026-09-07\n\n## 1단계\n- [ ] 걷기 20분\n  - 날짜: 2026-09-07\n  - 반복: 매주 월, 수, 금\n  - 반복 종료: 2026-09-20', scaffold: '# \n- 기준일: \n\n## \n- [ ] \n  - 날짜: \n  - 반복: \n  - 반복 종료: ' },
    { id: 'exercise-weekly-repeat-v1', label: '같은 일정 반복', description: '정한 기간 동안 같은 일정으로 반복해요.', exampleLabel: '주간 운동 루틴', exampleSource: '# 주간 운동 루틴\n- 기준일: 2026-09-07\n\n## 이번 주\n- [ ] 아침 스트레칭\n  - 날짜: 2026-09-07\n  - 반복: 매주 월, 수, 금\n  - 반복 종료: 2026-10-02', scaffold: '# \n- 기준일: \n\n## \n- [ ] \n  - 날짜: \n  - 반복: \n  - 반복 종료: ' },
    { id: 'moving-dday-v1', label: '기준일 전후 준비', description: '한 날짜를 기준으로 앞뒤 할 일을 적어요.', exampleLabel: '이사 준비', exampleSource: '# 이사 준비\n- 기준일: 2026-10-10\n\n## 계약\n- [ ] 주소 변경 신청\n  - 상대 날짜: D-7', scaffold: '# \n- 기준일: \n\n## \n- [ ] \n  - 상대 날짜: ' },
    { id: 'wedding-dday-v1', label: '기준일 전후 준비 + 자료', description: '앞뒤 할 일과 참고 링크를 함께 적어요.', exampleLabel: '결혼 준비', exampleSource: '# 결혼 준비\n- 기준일: 2027-04-17\n\n## 예약\n- [ ] 식장 계약 확인\n  - 상대 날짜: D-180\n  - 자료: https://example.com/venue', scaffold: '# \n- 기준일: \n\n## \n- [ ] \n  - 상대 날짜: \n  - 자료: ' },
    { id: 'travel-itinerary-prep-v1', label: '준비 + 날짜별 일정', description: '사전 준비와 날짜별 시간·장소를 함께 적어요.', exampleLabel: '여행 준비와 날짜별 일정', exampleSource: '# 제주 여행\n- 기준일: 2026-10-03\n\n## 출발 전\n- [ ] 온라인 체크인\n  - 상대 날짜: D-1\n\n## 첫째 날\n- [ ] 렌터카 받기\n  - 날짜: 2026-10-03\n  - 시간: 11:00\n  - 시간대: Asia/Seoul\n  - 장소: 제주공항', scaffold: '# \n- 기준일: \n\n## \n- [ ] \n  - 상대 날짜: \n\n## \n- [ ] \n  - 날짜: \n  - 시간: \n  - 시간대: \n  - 장소: ' },
    { id: 'exam-dday-study-v1', label: '반복 준비 + 목표일', description: '반복할 일과 마지막 일정을 함께 적어요.', exampleLabel: '시험 준비', exampleSource: '# 자격시험 준비\n- 기준일: 2026-11-14\n\n- [ ] 기출문제 풀기\n  - 날짜: 2026-10-13\n  - 반복: 매주 화, 목\n  - 반복 종료: 2026-11-12\n  - 완료 기준: 오답을 다시 설명할 수 있다\n\n- [ ] 시험 응시\n  - 날짜: 2026-11-14', scaffold: '# \n- 기준일: \n\n- [ ] \n  - 날짜: \n  - 반복: \n  - 반복 종료: \n  - 완료 기준: \n\n- [ ] \n  - 날짜: ' }
  ]);

  const AUTHORING_GHOST_HINTS = Object.freeze([
    Object.freeze({ hintId: 'flow-title', syntaxPrefix: '# ', text: '예: 8월 제주 여행 준비' }),
    Object.freeze({ hintId: 'step-title', syntaxPrefix: '## ', text: '예: 예약' }),
    Object.freeze({ hintId: 'root-item', syntaxPrefix: '- [ ] ', text: '예: 항공권 확인' }),
    Object.freeze({ hintId: 'child-check', syntaxPrefix: '  - [ ] ', text: '예: 예약번호 확인' }),
    Object.freeze({ hintId: 'anchor-date', syntaxPrefix: '- 기준일: ', text: '예: 2026-09-02' }),
    Object.freeze({ hintId: 'relative-date', syntaxPrefix: '  - 상대 날짜: ', text: '예: D-7' }),
    Object.freeze({ hintId: 'fixed-date', syntaxPrefix: '  - 날짜: ', text: '예: 2026-09-02' }),
    Object.freeze({ hintId: 'place', syntaxPrefix: '  - 장소: ', text: '예: 김포공항' }),
    Object.freeze({ hintId: 'resource', syntaxPrefix: '  - 자료: ', text: '예: https://example.com' }),
    Object.freeze({ hintId: 'completion-criteria', syntaxPrefix: '  - 완료 기준: ', text: '예: 예약번호를 메모에 남김' })
  ]);

  function splitLogicalSourceLines(value) {
    const source = typeof value === 'string' ? value : '';
    const lines = [];
    let start = 0;
    let cursor = 0;
    while (cursor < source.length) {
      const character = source[cursor];
      if (character !== '\r' && character !== '\n') {
        cursor += 1;
        continue;
      }
      const terminator = character === '\r' && source[cursor + 1] === '\n' ? '\r\n' : character;
      const end = cursor + terminator.length;
      lines.push({
        line: lines.length + 1,
        startOffset: start,
        contentEndOffset: cursor,
        endOffset: end,
        rawLine: source.slice(start, cursor),
        terminator
      });
      start = end;
      cursor = end;
    }
    lines.push({
      line: lines.length + 1,
      startOffset: start,
      contentEndOffset: source.length,
      endOffset: source.length,
      rawLine: source.slice(start),
      terminator: ''
    });
    return lines;
  }

  function authoringGhostLines(rawText) {
    return splitLogicalSourceLines(rawText).map(line => {
      const hint = AUTHORING_GHOST_HINTS.find(candidate => line.rawLine === candidate.syntaxPrefix) || null;
      return Object.assign({}, line, {
        ghost: hint ? {
          hintId: hint.hintId,
          offset: hint.syntaxPrefix.length,
          text: hint.text,
          ariaHidden: true,
          pointerEvents: 'none',
          userSelect: 'none',
          sourceMutationCount: 0
        } : null
      });
    });
  }

  const LOSSLESS_AUTHORING_VERSION = losslessRuntime.PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_VERSION;
  const LOSSLESS_AUTHORING_LIMITS = losslessRuntime.PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_LIMITS;
  const analyzeLosslessAuthoring = losslessRuntime.analyzePersonalWorkspacePocLosslessAuthoring;
  const PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION = safeValidationExamplesRuntime.PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION;
  const PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_GROUPS = safeValidationExamplesRuntime.PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_GROUPS;
  const PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG = safeValidationExamplesRuntime.PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG;
  const fingerprintPersonalWorkspacePocAuthoringSource = safeValidationExamplesRuntime.fingerprintPersonalWorkspacePocAuthoringSource;
  const normalizePersonalWorkspacePocValidationExampleSearch = safeValidationExamplesRuntime.normalizePersonalWorkspacePocValidationExampleSearch;
  const filterPersonalWorkspacePocValidationExamples = safeValidationExamplesRuntime.filterPersonalWorkspacePocValidationExamples;
  const projectPersonalWorkspacePocValidationExampleSelection = safeValidationExamplesRuntime.projectPersonalWorkspacePocValidationExampleSelection;
  const planPersonalWorkspacePocValidationExampleApply = safeValidationExamplesRuntime.planPersonalWorkspacePocValidationExampleApply;
  const validationExampleCatalogVersion = PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION;
  const validationExampleGroups = PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_GROUPS;
  const validationExampleCatalog = PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG;
  const filterValidationExamples = input => filterPersonalWorkspacePocValidationExamples(input || {});
  const projectValidationExampleSelection = input => projectPersonalWorkspacePocValidationExampleSelection(input || {});
  const planValidationExampleApply = input => planPersonalWorkspacePocValidationExampleApply(input || {});
  const structureTemplatePreviewCatalogVersion = safeStructureTemplateRuntime.PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CATALOG_VERSION;
  const structureTemplatePreviewContractVersion = safeStructureTemplateRuntime.PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CONTRACT_VERSION;
  const structureTemplateSidecarStorageKey = safeStructureTemplateRuntime.STRUCTURE_TEMPLATE_SIDECAR_STORAGE_KEY;
  let structureTemplatePreviews = EMPTY_STRUCTURE_TEMPLATE_PREVIEWS;
  try {
    const previews = safeStructureTemplateRuntime.listPersonalWorkspacePocStructureTemplatePreviews({
      catalogVersion: structureTemplatePreviewCatalogVersion,
      contractVersion: structureTemplatePreviewContractVersion
    });
    if (Array.isArray(previews)) structureTemplatePreviews = Object.freeze(previews.slice());
  } catch (error) {
    structureTemplatePreviews = EMPTY_STRUCTURE_TEMPLATE_PREVIEWS;
  }
  const findStructureTemplatePreview = (templateId, lookup) => {
    try {
      return safeStructureTemplateRuntime.findPersonalWorkspacePocStructureTemplatePreview(
        templateId,
        lookup || {}
      );
    } catch (error) {
      return null;
    }
  };
  const planStructureTemplatePreviewMaterialization = input => {
    const planner = safeStructureTemplateRuntime.planPersonalWorkspacePocStructureTemplatePreviewApply;
    if (typeof planner !== 'function') return missingStructureTemplatePreviewPlan(input);
    try {
      const request = input || {};
      const rawText = typeof request.rawText === 'string' ? request.rawText : '';
      const expectedSourceFingerprint = typeof request.expectedSourceFingerprint === 'string'
        ? request.expectedSourceFingerprint
        : safeStructureTemplateRuntime.fingerprintStructureTemplateRawText(rawText);
      const plan = planner(Object.assign({}, request, { expectedSourceFingerprint }));
      if (!plan || typeof plan !== 'object') {
        return blockedStructureTemplatePreviewPlan(request, 'compiler-error');
      }
      if (plan.status !== 'applied') {
        if (
          plan.sourceMutationCount !== 0
          || plan.workspaceMutationCount !== 0
          || plan.operatingMutationCount !== 0
          || plan.replacement !== null
          || plan.nextRawText !== rawText
        ) return blockedStructureTemplatePreviewPlan(request, 'compiler-error');
        return plan;
      }
      const preview = findStructureTemplatePreview(request.templateId, {
        catalogVersion: request.catalogVersion,
        contractVersion: request.contractVersion
      });
      if (
        rawText !== ''
        || request.confirmed !== true
        || request.composing === true
        || !preview
        || plan.sourceMutationCount !== 1
        || plan.workspaceMutationCount !== 0
        || plan.operatingMutationCount !== 0
        || plan.nextRawText !== preview.expectedRawText
        || !plan.replacement
        || plan.replacement.beforeRawText !== ''
        || plan.replacement.afterRawText !== preview.expectedRawText
      ) return blockedStructureTemplatePreviewPlan(request, 'bytes-mismatch');
      return plan;
    } catch (error) {
      return blockedStructureTemplatePreviewPlan(input, 'compiler-error');
    }
  };

  function isDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    if (year < 1 || month < 1 || month > 12) return false;
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return day >= 1 && day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  }

  function addDays(date, days) {
    const value = new Date(date + 'T00:00:00Z');
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  }

  const OCCURRENCE_WEEKDAYS = Object.freeze(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']);
  const OCCURRENCE_WEEKDAY_CODES = Object.freeze({ '일': 'SU', '월': 'MO', '화': 'TU', '수': 'WE', '목': 'TH', '금': 'FR', '토': 'SA' });

  function positiveInteger(value) {
    if (!/^[1-9]\d*$/.test(value)) return undefined;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : undefined;
  }

  function parseOccurrenceWeekdays(value) {
    const tokens = value.replace(/요일/g, '').split(/[\s,/·]+/).map(token => token.trim()).filter(Boolean);
    if (!tokens.length) return undefined;
    const weekdays = tokens.map(token => OCCURRENCE_WEEKDAY_CODES[token]);
    if (weekdays.some(weekday => !weekday)) return undefined;
    return Array.from(new Set(weekdays)).sort((left, right) => OCCURRENCE_WEEKDAYS.indexOf(left) - OCCURRENCE_WEEKDAYS.indexOf(right));
  }

  function parseRecurrence(recurrence, recurrenceEnd) {
    const label = typeof recurrence === 'string' ? recurrence.trim() : '';
    const compact = label.replace(/\s+/g, '');
    let base;
    if (compact === '매일') base = { frequency: 'daily', interval: 1 };
    else {
      const daily = /^(\d+)일마다$/.exec(compact);
      const interval = daily ? positiveInteger(daily[1]) : undefined;
      if (interval) base = { frequency: 'daily', interval };
    }
    if (!base) {
      const weekly = /^매주\s+(.+)$/.exec(label) || /^(\d+)\s*주마다\s+(.+)$/.exec(label);
      if (weekly) {
        const hasInterval = weekly.length === 3;
        const interval = hasInterval ? positiveInteger(weekly[1]) : 1;
        const weekdays = parseOccurrenceWeekdays(hasInterval ? weekly[2] : weekly[1]);
        if (interval && weekdays) base = { frequency: 'weekly', interval, weekdays };
      }
    }
    if (!base) {
      const monthly = /^매월\s*(\d{1,2})일$/.exec(label) || /^(\d+)\s*개월마다\s*(\d{1,2})일$/.exec(label);
      if (monthly) {
        const hasInterval = monthly.length === 3;
        const interval = hasInterval ? positiveInteger(monthly[1]) : 1;
        const dayOfMonth = Number(hasInterval ? monthly[2] : monthly[1]);
        if (interval && dayOfMonth >= 1 && dayOfMonth <= 31) base = { frequency: 'monthly', interval, dayOfMonth };
      }
    }
    if (!base) return { ok: false, reason: 'invalid-recurrence' };
    const rawEnd = typeof recurrenceEnd === 'string' ? recurrenceEnd.trim() : '';
    let end;
    if (rawEnd) {
      const countMatch = /^([1-9]\d*)\s*회$/.exec(rawEnd);
      if (countMatch) {
        const count = positiveInteger(countMatch[1]);
        if (!count) return { ok: false, reason: 'invalid-recurrence-end' };
        end = { mode: 'count', count, raw: rawEnd };
      } else if (isDate(rawEnd)) end = { mode: 'until', date: rawEnd, raw: rawEnd };
      else return { ok: false, reason: 'invalid-recurrence-end' };
    }
    return { ok: true, rule: Object.assign({ version: OCCURRENCE_CONTRACT_VERSION, raw: label }, base, end ? { end } : {}) };
  }

  function stableOccurrenceHash(value) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36).padStart(7, '0');
  }

  function recurrenceSignature(rule) {
    return JSON.stringify(Object.assign(
      { version: rule.version, frequency: rule.frequency, interval: rule.interval },
      rule.weekdays ? { weekdays: rule.weekdays } : {},
      rule.dayOfMonth ? { dayOfMonth: rule.dayOfMonth } : {},
      rule.end && rule.end.mode === 'count'
        ? { end: { mode: 'count', count: rule.end.count } }
        : rule.end && rule.end.mode === 'until'
          ? { end: { mode: 'until', date: rule.end.date } }
          : {}
    ));
  }

  function buildOccurrenceSeriesId(sourceItemRef, rule) {
    return 'poc-occurrence-series:v1:' + encodeURIComponent(sourceItemRef) + ':' + stableOccurrenceHash(recurrenceSignature(rule));
  }

  function buildOccurrenceId(seriesId, originalDate) {
    return seriesId + ':occurrence:' + originalDate;
  }

  function buildSingleOccurrenceRow(sourceItemRef, originalDate) {
    return { rowId: sourceItemRef, occurrenceId: null, seriesId: null, sourceItemRef, originalDate: originalDate || null, occurrenceIndex: null };
  }

  function utcDay(value) {
    const parts = value.split('-').map(Number);
    return Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000;
  }

  function monthDate(startDate, monthOffset, dayOfMonth) {
    const parts = startDate.split('-').map(Number);
    const absoluteMonth = parts[0] * 12 + parts[1] - 1 + monthOffset;
    const targetYear = Math.floor(absoluteMonth / 12);
    const targetMonthIndex = absoluteMonth % 12;
    if (targetYear < 1000 || targetYear > 9999) return undefined;
    const daysInMonth = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
    if (dayOfMonth > daysInMonth) return undefined;
    return [String(targetYear).padStart(4, '0'), String(targetMonthIndex + 1).padStart(2, '0'), String(dayOfMonth).padStart(2, '0')].join('-');
  }

  function* recurrenceDateSequence(startDate, rule) {
    yield startDate;
    if (rule.frequency === 'daily') {
      let current = addDays(startDate, rule.interval);
      while (isDate(current)) { yield current; current = addDays(current, rule.interval); }
      return;
    }
    if (rule.frequency === 'weekly') {
      const startWeekday = new Date(startDate + 'T00:00:00Z').getUTCDay();
      const firstMonday = addDays(startDate, -((startWeekday + 6) % 7));
      let weekOffset = 0;
      while (true) {
        for (const weekday of rule.weekdays || []) {
          const current = addDays(firstMonday, weekOffset * 7 + OCCURRENCE_WEEKDAYS.indexOf(weekday));
          if (!isDate(current)) return;
          if (current > startDate) yield current;
        }
        weekOffset += rule.interval;
      }
    }
    let monthOffset = 0;
    while (true) {
      const current = monthDate(startDate, monthOffset, rule.dayOfMonth);
      if (current && current > startDate) yield current;
      monthOffset += rule.interval;
      const parts = startDate.split('-').map(Number);
      if (parts[0] * 12 + parts[1] - 1 + monthOffset > 9999 * 12 + 11) return;
    }
  }

  function finiteOccurrenceCount(startDate, rule) {
    if (rule.end && rule.end.mode === 'count') return rule.end.count;
    if (!rule.end || rule.end.mode !== 'until') return undefined;
    const until = rule.end.date;
    if (until < startDate) return 0;
    if (rule.frequency === 'daily') return Math.floor((utcDay(until) - utcDay(startDate)) / rule.interval) + 1;
    if (rule.frequency === 'weekly') {
      const startWeekday = new Date(startDate + 'T00:00:00Z').getUTCDay();
      const firstMondayDay = utcDay(startDate) - ((startWeekday + 6) % 7);
      const periodDays = rule.interval * 7;
      let total = 1;
      for (const weekday of rule.weekdays || []) {
        const firstCandidateDay = firstMondayDay + OCCURRENCE_WEEKDAYS.indexOf(weekday);
        const periodsAfterStart = Math.max(0, Math.ceil((utcDay(startDate) + 1 - firstCandidateDay) / periodDays));
        const candidateDay = firstCandidateDay + periodsAfterStart * periodDays;
        if (candidateDay <= utcDay(until)) total += Math.floor((utcDay(until) - candidateDay) / periodDays) + 1;
      }
      return total;
    }
    let total = 1;
    let monthOffset = 0;
    while (true) {
      const monthStart = monthDate(startDate, monthOffset, 1);
      if (!monthStart || monthStart > until) break;
      const candidate = monthDate(startDate, monthOffset, rule.dayOfMonth);
      if (candidate && candidate > startDate && candidate <= until) total += 1;
      monthOffset += rule.interval;
    }
    return total;
  }

  function expandOccurrences(input) {
    const sourceItemRef = typeof input.sourceItemRef === 'string' ? input.sourceItemRef.trim() : '';
    if (!sourceItemRef) return { ok: false, reason: 'invalid-source-item-ref' };
    if (!isDate(input.startDate)) return { ok: false, reason: 'invalid-start-date' };
    const parsed = parseRecurrence(input.recurrence, input.recurrenceEnd);
    if (!parsed.ok) return parsed;
    const rule = parsed.rule;
    if (rule.end && rule.end.mode === 'until' && rule.end.date < input.startDate) return { ok: false, reason: 'recurrence-end-before-start' };
    const seriesId = buildOccurrenceSeriesId(sourceItemRef, rule);
    if (rule.end) {
      const limit = input.finiteLimit === undefined ? FINITE_RECURRENCE_PAGE_SIZE : input.finiteLimit;
      const offset = input.finiteOffset === undefined ? 0 : input.finiteOffset;
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_FINITE_RECURRENCE_LIMIT || !Number.isSafeInteger(offset) || offset < 0 || offset > MAX_FINITE_RECURRENCE_LIMIT) return { ok: false, reason: 'invalid-finite-window' };
      const totalCount = finiteOccurrenceCount(input.startDate, rule) || 0;
      const rows = [];
      let occurrenceIndex = 0;
      for (const date of recurrenceDateSequence(input.startDate, rule)) {
        occurrenceIndex += 1;
        if (rule.end.mode === 'count' && occurrenceIndex > rule.end.count) break;
        if (rule.end.mode === 'until' && date > rule.end.date) break;
        if (occurrenceIndex <= offset) continue;
        if (rows.length >= limit) break;
        const occurrenceId = buildOccurrenceId(seriesId, date);
        rows.push({ rowId: occurrenceId, occurrenceId, seriesId, sourceItemRef, originalDate: date, occurrenceIndex });
      }
      return { ok: true, manifest: { version: OCCURRENCE_CONTRACT_VERSION, sourceItemRef, seriesId, rule, mode: 'finite', rows, occurrenceIds: rows.map(row => row.occurrenceId), rowIds: rows.map(row => row.rowId), originalDates: rows.map(row => row.originalDate), hasMore: offset + rows.length < totalCount, totalCount, finitePage: { offset, limit } } };
    }
    const weeks = input.windowWeeks === undefined ? OPEN_ENDED_RECURRENCE_WEEKS : input.windowWeeks;
    const offsetWeeks = input.windowOffsetWeeks === undefined ? 0 : input.windowOffsetWeeks;
    if (!Number.isSafeInteger(weeks) || weeks < 1 || weeks > MAX_OPEN_ENDED_RECURRENCE_WEEKS || !Number.isSafeInteger(offsetWeeks) || offsetWeeks < 0 || offsetWeeks + weeks > MAX_OPEN_ENDED_RECURRENCE_WEEKS) return { ok: false, reason: 'invalid-open-ended-window' };
    const windowStart = addDays(input.startDate, offsetWeeks * 7);
    const windowEndExclusive = addDays(windowStart, weeks * 7);
    if (!isDate(windowStart) || !isDate(windowEndExclusive)) return { ok: false, reason: 'projection-range-overflow' };
    const rows = [];
    let occurrenceIndex = 0;
    for (const date of recurrenceDateSequence(input.startDate, rule)) {
      occurrenceIndex += 1;
      if (date < windowStart) continue;
      if (date >= windowEndExclusive) break;
      const occurrenceId = buildOccurrenceId(seriesId, date);
      rows.push({ rowId: occurrenceId, occurrenceId, seriesId, sourceItemRef, originalDate: date, occurrenceIndex });
    }
    return { ok: true, manifest: { version: OCCURRENCE_CONTRACT_VERSION, sourceItemRef, seriesId, rule, mode: 'open-ended', rows, occurrenceIds: rows.map(row => row.occurrenceId), rowIds: rows.map(row => row.rowId), originalDates: rows.map(row => row.originalDate), hasMore: true, window: { start: windowStart, end: addDays(windowEndExclusive, -1), offsetWeeks, weeks } } };
  }

  function fingerprint(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function safeId(value) {
    const clean = String(value || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    return clean || 'entry';
  }

  function isSingleLineTitle(value) {
    return typeof value === 'string'
      && Boolean(value.trim())
      && !/[\r\n\u0000-\u001f\u007f]/u.test(value);
  }

  function seedState() {
    return {
      version: VERSION,
      revision: 0,
      folders: [
        { id: 'move', title: '이사 준비', parentId: null },
        { id: 'admin', title: '행정', parentId: 'move' },
        { id: 'life', title: '일상', parentId: null },
        { id: 'work', title: '업무', parentId: null }
      ],
      flows: [
        { id: 'moving', ref: 'saved-flow:copy-map-moving:flow-moving', savedCopyId: 'copy-map-moving', sourceFlowId: 'flow-moving', origin: 'source-backed-map', originLabel: 'Flow Map 저장본', title: '이사 준비 저장본', sourceTitle: '이사 준비 저장본', folderId: null, rawText: null, sourceFingerprint: null, handoffId: null, steps: [{ id: 'select', title: '업체 선정', itemIds: ['quote', 'contract'] }] },
        { id: 'memo', ref: 'saved-flow:copy-draft-memo:flow-memo', savedCopyId: 'copy-draft-memo', sourceFlowId: 'flow-memo', origin: 'personal-draft', originLabel: '개인 초안', title: '메모에서 만든 개인 Flow', sourceTitle: '메모에서 만든 개인 Flow', folderId: null, rawText: null, sourceFingerprint: null, handoffId: null, steps: [{ id: 'outline', title: '실행 순서', itemIds: ['memo-outline', 'memo-share'] }] },
        { id: 'washer', ref: 'saved-flow:copy-canonical-washer:flow-washer', savedCopyId: 'copy-canonical-washer', sourceFlowId: 'flow-washer', origin: 'canonical-personal-copy', originLabel: '개인 사본', title: '우리집 세탁기 관리', sourceTitle: '우리집 세탁기 관리', folderId: null, rawText: null, sourceFingerprint: null, handoffId: null, steps: [{ id: 'care', title: '정기 관리', itemIds: ['washer-filter', 'washer-tub'] }] },
        { id: 'inspection', ref: 'saved-flow:copy-legacy-check:flow-check', savedCopyId: 'copy-legacy-check', sourceFlowId: 'flow-check', origin: 'legacy-saved-plan', originLabel: '기존 저장본', title: '입주 사전점검', sourceTitle: '입주 사전점검', folderId: null, rawText: null, sourceFingerprint: null, handoffId: null, steps: [{ id: 'prepare', title: '현장 확인', itemIds: ['checklist', 'photo-check'] }] }
      ],
      tasks: [
        { id: 'call', title: '관리실에 전화', flowId: null, folderId: 'move', date: null, sourceDate: null, time: '', memo: '엘리베이터 예약 시간 물어보기', done: false, completedAt: null },
        { id: 'meeting', title: '11시 회의 참석', flowId: null, folderId: 'work', date: TODAY, sourceDate: null, time: '11:00', memo: '', done: false, completedAt: null },
        { id: 'quote', title: '견적 3곳 비교', sourceTitle: '견적 3곳 비교', flowId: 'moving', folderId: null, date: null, sourceDate: null, time: '', memo: '', sourceMemo: '', done: false, completedAt: null, ref: 'flow-item:copy-map-moving:flow-moving:item-quote' },
        { id: 'contract', title: '계약 내용 확인', sourceTitle: '계약 내용 확인', flowId: 'moving', folderId: null, date: '2026-09-03', sourceDate: '2026-09-03', time: '', memo: '', sourceMemo: '', done: false, completedAt: null, ref: 'flow-item:copy-map-moving:flow-moving:item-contract' },
        { id: 'memo-outline', title: '메모 핵심 순서 확인', sourceTitle: '메모 핵심 순서 확인', flowId: 'memo', folderId: null, date: null, sourceDate: null, time: '', memo: '', sourceMemo: '', done: false, completedAt: null, ref: 'flow-item:copy-draft-memo:flow-memo:item-outline' },
        { id: 'memo-share', title: '다음 행동 한 줄 정리', sourceTitle: '다음 행동 한 줄 정리', flowId: 'memo', folderId: null, date: TODAY, sourceDate: TODAY, time: '', memo: '', sourceMemo: '', done: false, completedAt: null, ref: 'flow-item:copy-draft-memo:flow-memo:item-share' },
        { id: 'washer-filter', title: '배수 필터 확인', sourceTitle: '배수 필터 확인', flowId: 'washer', folderId: null, date: TODAY, sourceDate: TODAY, time: '', memo: '', sourceMemo: '', done: false, completedAt: null, ref: 'flow-item:copy-canonical-washer:flow-washer:item-filter' },
        { id: 'washer-tub', title: '통세척 예약', sourceTitle: '통세척 예약', flowId: 'washer', folderId: null, date: '2026-09-05', sourceDate: '2026-09-05', time: '', memo: '', sourceMemo: '', done: false, completedAt: null, ref: 'flow-item:copy-canonical-washer:flow-washer:item-tub' },
        { id: 'checklist', title: '점검표 준비', sourceTitle: '점검표 준비', flowId: 'inspection', folderId: null, date: TODAY, sourceDate: TODAY, time: '', memo: '', sourceMemo: '', done: false, completedAt: null, ref: 'flow-item:copy-legacy-check:flow-check:item-checklist' },
        { id: 'photo-check', title: '하자 사진 촬영', sourceTitle: '하자 사진 촬영', flowId: 'inspection', folderId: null, date: '2026-09-04', sourceDate: '2026-09-04', time: '', memo: '', sourceMemo: '', done: false, completedAt: null, ref: 'flow-item:copy-legacy-check:flow-check:item-photo' }
      ],
      orders: {},
      occurrenceOverrides: {},
      trashEntries: [],
      quickConversionReceipts: [],
      lastReceipt: null,
      updatedAt: null
    };
  }

  function templateById(id) {
    return TEMPLATE_CATALOG.find(entry => entry.id === id) || null;
  }

  function parseSource(rawText) {
    const raw = typeof rawText === 'string' ? rawText : '';
    const lines = raw.replace(/\r\n?/g, '\n').split('\n');
    const structure = { title: '', anchorDate: null, steps: [], ignoredLineCount: 0, sourceOnlyText: [], issues: [], rawText: raw, sourceFingerprint: fingerprint(raw) };
    let currentStep = null;
    let currentItem = null;

    function issue(code, line, message) { structure.issues.push({ code, line, message }); }
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      let match = line.match(/^#\s+(.+?)\s*$/);
      if (match) { if (!structure.title) structure.title = match[1].trim(); else structure.ignoredLineCount += 1; currentItem = null; return; }
      match = line.match(/^##\s+(.+?)\s*$/);
      if (match) { currentStep = { title: match[1].trim(), items: [] }; structure.steps.push(currentStep); currentItem = null; return; }
      match = line.match(/^-\s*기준일:\s*(.*?)\s*$/);
      if (match) {
        if (match[1] && !isDate(match[1])) issue('invalid-anchor-date', lineNumber, '기준일은 YYYY-MM-DD로 입력해 주세요.');
        else structure.anchorDate = match[1] || null;
        return;
      }
      match = line.match(/^-\s*\[([ xX])\]\s*(.*?)\s*$/);
      if (match) {
        if (!match[2]) return;
        if (!currentStep) { currentStep = { title: '할 일', items: [] }; structure.steps.push(currentStep); }
        currentItem = { title: match[2], checkedInSource: match[1].toLowerCase() === 'x', properties: {}, subchecks: [], resources: [], sources: [], date: null, time: '', sourceLine: lineNumber };
        currentStep.items.push(currentItem);
        return;
      }
      match = line.match(/^\s{2,}-\s*\[([ xX])\]\s*(.*?)\s*$/);
      if (match && currentItem) {
        if (match[2]) currentItem.subchecks.push({ title: match[2], sourceChecked: match[1].toLowerCase() === 'x', sourceLine: lineNumber });
        return;
      }
      match = line.match(/^\s{2,}-\s*([^:]+):\s*(.*?)\s*$/);
      if (match && currentItem) {
        const key = match[1].trim();
        const value = match[2].trim();
        currentItem.properties[key] = value;
        if ((key === '자료' || key === '링크') && value) currentItem.resources.push(value);
        if (key === '출처' && value) currentItem.sources.push(value);
        if (key === '날짜' && value) {
          if (!isDate(value)) issue('invalid-date', lineNumber, '날짜는 YYYY-MM-DD로 입력해 주세요.');
          else currentItem.date = value;
        }
        if (key === '시간' && value) {
          if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) issue('invalid-time', lineNumber, '시간은 HH:MM으로 입력해 주세요.');
          else currentItem.time = value;
        }
        if (key === '시간대' && value && value !== 'UTC' && !/^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/.test(value)) issue('invalid-timezone', lineNumber, '시간대는 Asia/Seoul 같은 형식으로 입력해 주세요.');
        if ((key === '자료' || key === '링크' || key === '출처') && value) {
          const markdownLink = /^\[[^\]\r\n]+\]\((https?:\/\/[^\s)]+)\)$/i.exec(value);
          const urlValue = markdownLink ? markdownLink[1] : value;
          if (!/^https?:\/\/\S+$/i.test(urlValue)) issue('invalid-url', lineNumber, (key === '출처' ? '출처' : '자료') + ' 주소는 http 또는 https 주소로 입력해 주세요.');
        }
        if (key === '상대 날짜' && value) {
          const compactRelative = value.replace(/\s+/g, '');
          const relative = compactRelative.match(/^D([+-])(\d+)$/i);
          const relativeDays = /^D-Day$/i.test(compactRelative) ? 0 : relative ? Number(relative[2]) * (relative[1] === '-' ? -1 : 1) : null;
          if (relativeDays === null) issue('invalid-relative-date', lineNumber, '상대 날짜는 D-14, D-Day 또는 D+3처럼 입력해 주세요.');
          else if (!structure.anchorDate) issue('missing-anchor-date', lineNumber, '상대 날짜를 쓰려면 기준일을 먼저 입력해 주세요.');
          else currentItem.date = addDays(structure.anchorDate, relativeDays);
        }
        return;
      }
      if (line.trim()) {
        structure.ignoredLineCount += 1;
        structure.sourceOnlyText.push(line);
      }
    });
    if (!structure.title) issue('missing-title', 0, '첫 줄에 # Flow 이름을 입력해 주세요.');
    const itemCount = structure.steps.reduce((sum, step) => sum + step.items.length, 0);
    if (!itemCount) issue('missing-items', 0, '- [ ] 형식의 할 일을 하나 이상 입력해 주세요.');
    structure.steps.forEach(step => step.items.forEach(item => {
      const recurrence = item.properties['반복'];
      const recurrenceEnd = item.properties['반복 종료'];
      if (!recurrence && recurrenceEnd) {
        issue('invalid-recurrence-end', item.sourceLine, '반복 종료를 쓰려면 반복 규칙을 먼저 입력해 주세요.');
        return;
      }
      if (!recurrence) return;
      if (!item.date) {
        issue('missing-recurrence-start', item.sourceLine, '반복하려면 날짜 또는 기준일 기준 날짜가 필요해요.');
        return;
      }
      const parsedRecurrence = parseRecurrence(recurrence, recurrenceEnd);
      if (!parsedRecurrence.ok) {
        issue(parsedRecurrence.reason, item.sourceLine, parsedRecurrence.reason === 'invalid-recurrence-end' ? '반복 종료는 N회 또는 YYYY-MM-DD로 입력해 주세요.' : '지원하는 반복 형식을 확인해 주세요.');
        return;
      }
      if (parsedRecurrence.rule.end && parsedRecurrence.rule.end.mode === 'until' && parsedRecurrence.rule.end.date < item.date) {
        issue('recurrence-end-before-start', item.sourceLine, '반복 종료일은 첫 날짜보다 빠를 수 없어요.');
        return;
      }
      item.recurrence = parsedRecurrence.rule;
    }));
    structure.itemCount = itemCount;
    return structure;
  }

  function makeHandoff(rawText, options) {
    const parsed = parseSource(rawText);
    const settings = options || {};
    const draftId = safeId(settings.draftId || 'draft-' + parsed.sourceFingerprint);
    const handoffId = safeId(settings.handoffId || 'poc-authoring-handoff-' + parsed.sourceFingerprint);
    return {
      contractVersion: 1,
      handoffId,
      draftId,
      rawText: parsed.rawText,
      sourceFingerprint: parsed.sourceFingerprint,
      sourceConfirmed: settings.sourceConfirmed === true,
      folderId: settings.folderId === '' || settings.folderId === undefined ? null : settings.folderId,
      parsed
    };
  }

  function trashEntries(state) {
    return state && Array.isArray(state.trashEntries) ? state.trashEntries : [];
  }

  function quickConversionReceipts(state) {
    return state && Array.isArray(state.quickConversionReceipts) ? state.quickConversionReceipts : [];
  }

  function isTrashedFlow(state, flowId) {
    return trashEntries(state).some(entry => entry.kind === 'flow' && entry.id === flowId);
  }

  function isTrashedTask(state, task) {
    if (!task) return true;
    if (task.flowId !== null && isTrashedFlow(state, task.flowId)) return true;
    return trashEntries(state).some(entry => entry.kind === 'quick' && entry.id === task.id);
  }

  function trashManifest(state) {
    return trashEntries(state).map(entry => {
      const target = entry.kind === 'flow'
        ? state.flows.find(flow => flow.id === entry.id)
        : state.tasks.find(task => task.id === entry.id && task.flowId === null);
      if (!target) return null;
      return {
        kind: entry.kind,
        id: entry.id,
        title: target.title,
        deletedAt: entry.deletedAt,
        itemCount: entry.kind === 'flow' ? flowItemIds(target).length : 1
      };
    }).filter(Boolean);
  }

  function effectiveFolder(state, task) {
    if (!task) return null;
    if (task.flowId === null) return task.folderId;
    const flow = state.flows.find(entry => entry.id === task.flowId);
    return flow ? flow.folderId : null;
  }

  function viewTaskIds(state, context) {
    let ids;
    const activeTasks = state.tasks.filter(task => !isTrashedTask(state, task));
    if (context === 'undated') ids = activeTasks.filter(task => task.date === null).map(task => task.id);
    else if (context === 'today') ids = activeTasks.filter(task => task.date === TODAY).map(task => task.id);
    else if (context === 'week') {
      const end = addDays(TODAY, 6);
      ids = activeTasks.filter(task => task.date && task.date >= TODAY && task.date <= end).map(task => task.id);
    } else if (context === 'month') ids = activeTasks.filter(task => task.date && task.date.slice(0, 7) === TODAY.slice(0, 7)).map(task => task.id);
    else if (context.indexOf('folder:') === 0) {
      const folderId = context.slice(7) === 'unfiled' ? null : context.slice(7);
      ids = activeTasks.filter(task => task.flowId === null && task.folderId === folderId).map(task => task.id);
    } else if (context.indexOf('flow:') === 0) {
      const parts = context.split(':');
      const flowId = parts[1];
      const flow = state.flows.find(entry => entry.id === flowId);
      const step = flow && parts[2] ? flow.steps.find(entry => entry.id === parts[2]) : null;
      ids = activeTasks.filter(task => task.flowId === flowId && (!parts[2] || (step && step.itemIds.includes(task.id)))).map(task => task.id);
    } else ids = [];
    const timeSorted = ids.slice().sort((left, right) => {
      const a = state.tasks.find(task => task.id === left);
      const b = state.tasks.find(task => task.id === right);
      if (a.time && !b.time) return -1;
      if (!a.time && b.time) return 1;
      return a.time.localeCompare(b.time) || state.tasks.indexOf(a) - state.tasks.indexOf(b);
    });
    const order = state.orders[context];
    if (!Array.isArray(order)) return timeSorted;
    const allowed = new Set(timeSorted);
    return order.filter(id => allowed.has(id)).concat(timeSorted.filter(id => !order.includes(id)));
  }

  function flowItemIds(flow) {
    return flow.steps.reduce((ids, step) => ids.concat(step.itemIds), []);
  }

  /* Read-only Item detail projection. The task snapshot is bound to one exact saved
     copy / Flow / Item ref when authored; titles and list positions are not keys. */
  function itemDetails(state, taskId) {
    if (!state || !Array.isArray(state.tasks) || !Array.isArray(state.flows)) return null;
    const tasks = state.tasks.filter(task => task.id === taskId);
    if (tasks.length !== 1) return null;
    const task = tasks[0];
    const personalMemo = typeof task.memo === 'string' ? task.memo : '';
    if (task.flowId === null) return { sourceDescription: '', completionCriterion: '', personalMemo };
    const flows = state.flows.filter(flow => flow.id === task.flowId);
    if (flows.length !== 1 || !Array.isArray(flows[0].steps)) return null;
    const flow = flows[0];
    const prefix = 'flow-item:' + encodeURIComponent(flow.savedCopyId) + ':' + encodeURIComponent(flow.sourceFlowId) + ':';
    if (typeof task.ref !== 'string' || !task.ref.startsWith(prefix)
      || !task.ref.slice(prefix.length) || task.ref.slice(prefix.length).includes(':')
      || state.tasks.filter(entry => entry.ref === task.ref).length !== 1
      || flowItemIds(flow).filter(id => id === taskId).length !== 1) return null;
    try {
      if (encodeURIComponent(decodeURIComponent(task.ref.slice(prefix.length))) !== task.ref.slice(prefix.length)) return null;
    } catch (error) { return null; }
    const properties = task.sourceProperties || {};
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)
      || Object.values(properties).some(value => typeof value !== 'string')
      || (task.sourceDescription !== undefined && typeof task.sourceDescription !== 'string')
      || (task.completionCriterion !== undefined && typeof task.completionCriterion !== 'string')) return null;
    return {
      sourceDescription: task.sourceDescription !== undefined ? task.sourceDescription : (properties['설명'] || properties['상세'] || properties['자세히'] || properties['방법'] || ''),
      completionCriterion: task.completionCriterion !== undefined ? task.completionCriterion : (properties['완료 기준'] || properties['완료기준'] || ''),
      personalMemo
    };
  }

  function compareStableText(left, right) {
    const leftText = String(left);
    const rightText = String(right);
    if (leftText === rightText) return 0;
    return leftText < rightText ? -1 : 1;
  }

  /* Presentation-only labels: source identity and saved-copy identity stay untouched. */
  function copyDisambiguation(state) {
    const groups = new Map();
    const active = state.flows
      .filter(flow => !isTrashedFlow(state, flow.id))
      .slice()
      .sort((left, right) => compareStableText(left.sourceFlowId, right.sourceFlowId)
        || compareStableText(left.savedCopyId, right.savedCopyId)
        || compareStableText(left.ref, right.ref));
    active.forEach(flow => {
      const key = String(flow.sourceFlowId);
      const group = groups.get(key) || [];
      group.push(flow);
      groups.set(key, group);
    });
    const displays = new Map();
    groups.forEach(group => {
      group.forEach((flow, index) => {
        const ordinal = group.length > 1 ? index + 1 : null;
        displays.set(flow.id, {
          flowId: flow.id,
          flowRef: flow.ref,
          sourceFlowId: flow.sourceFlowId,
          savedCopyId: flow.savedCopyId,
          copyOrdinal: ordinal,
          copyCount: group.length,
          displayTitle: ordinal === null ? flow.title : '사본 ' + ordinal + ' · ' + flow.title
        });
      });
    });
    return displays;
  }

  function flowDisplayTitle(state, flow) {
    if (!flow) return '';
    const display = copyDisambiguation(state).get(flow.id);
    return display ? display.displayTitle : flow.title;
  }

  function occurrenceOverrides(state) {
    return state && state.occurrenceOverrides && typeof state.occurrenceOverrides === 'object' && !Array.isArray(state.occurrenceOverrides)
      ? state.occurrenceOverrides
      : {};
  }

  function sourceItemRefForTask(flow, task) {
    return task.ref || ('flow-item:' + flow.savedCopyId + ':' + flow.sourceFlowId + ':item-' + task.id);
  }

  function taskPlanDate(task) {
    return own(task, 'planDate') ? task.planDate : (task.sourceDate === undefined ? task.date : task.sourceDate);
  }

  function recurrenceSummary(rule) {
    if (!rule) return null;
    if (rule.end && rule.end.mode === 'count') return rule.raw + ' · ' + rule.end.count + '회';
    if (rule.end && rule.end.mode === 'until') return rule.raw + ' · ' + rule.end.date + '까지';
    return rule.raw + ' · 종료 없음';
  }

  function occurrenceSource(state, sourceItemRef, occurrenceId, originalDate, includeTrashed) {
    if (typeof sourceItemRef !== 'string' || !sourceItemRef || typeof occurrenceId !== 'string' || !occurrenceId || !isDate(originalDate)) return null;
    for (const flow of state.flows) {
      if (!includeTrashed && isTrashedFlow(state, flow.id)) continue;
      for (const taskId of flowItemIds(flow)) {
        const task = state.tasks.find(entry => entry.id === taskId);
        if (!task || (!includeTrashed && isTrashedTask(state, task)) || sourceItemRefForTask(flow, task) !== sourceItemRef) continue;
        const properties = task.sourceProperties || {};
        const recurrence = properties['반복'];
        const recurrenceEnd = properties['반복 종료'];
        const startDate = taskPlanDate(task);
        if (!recurrence || !isDate(startDate)) return null;
        const parsed = parseRecurrence(recurrence, recurrenceEnd);
        if (!parsed.ok) return null;
        const seriesId = buildOccurrenceSeriesId(sourceItemRef, parsed.rule);
        if (buildOccurrenceId(seriesId, originalDate) !== occurrenceId) return null;
        const distance = utcDay(originalDate) - utcDay(startDate);
        if (distance < 0 || (!parsed.rule.end && distance >= MAX_OPEN_ENDED_RECURRENCE_WEEKS * 7)) return null;
        const expanded = expandOccurrences({
          sourceItemRef,
          startDate,
          recurrence,
          recurrenceEnd,
          finiteLimit: MAX_FINITE_RECURRENCE_LIMIT,
          windowWeeks: Math.max(1, Math.ceil((distance + 1) / 7))
        });
        if (!expanded.ok || !expanded.manifest.rows.some(row => row.occurrenceId === occurrenceId && row.originalDate === originalDate)) return null;
        return { flow, task, sourceItemRef, occurrenceId, originalDate, seriesId, rule: parsed.rule };
      }
    }
    return null;
  }

  function pruneOccurrenceOverrides(state) {
    if (!state.occurrenceOverrides || typeof state.occurrenceOverrides !== 'object') return;
    Object.entries(state.occurrenceOverrides).forEach(([occurrenceId, override]) => {
      if (!override || !occurrenceSource(state, override.sourceItemRef, occurrenceId, override.originalDate, true)) delete state.occurrenceOverrides[occurrenceId];
    });
  }

  function resultOccurrenceRows(state, base, options) {
    const recurrence = base.sourceProperties['반복'];
    if (!recurrence) {
      const identity = buildSingleOccurrenceRow(base.sourceItemRef, base.planDate);
      return { ok: true, rows: [Object.assign({}, base, identity, { ref: identity.rowId, date: base.planDate, executionDate: base.executionDate })], manifests: [], hasMore: false };
    }
    if (!isDate(base.planDate)) return { ok: false, reason: 'invalid-start-date', rows: [], manifests: [], hasMore: false };
    const expanded = expandOccurrences({
      sourceItemRef: base.sourceItemRef,
      startDate: base.planDate,
      recurrence,
      recurrenceEnd: base.sourceProperties['반복 종료'],
      finiteLimit: options && options.finiteOccurrenceLimit,
      windowWeeks: options && options.openEndedOccurrenceWeeks
    });
    if (!expanded.ok) return { ok: false, reason: expanded.reason, rows: [], manifests: [], hasMore: false };
    const overrides = occurrenceOverrides(state);
    const rows = expanded.manifest.rows.map(identity => {
      const override = overrides[identity.occurrenceId] || {};
      const executionDate = own(override, 'effectiveDate') ? override.effectiveDate : identity.originalDate;
      const completed = own(override, 'completed') ? override.completed : base.completed;
      const completedAt = own(override, 'completedAt') ? override.completedAt : (completed ? base.completedAt : null);
      return Object.assign({}, base, identity, {
        ref: identity.rowId,
        date: identity.originalDate,
        originalDate: identity.originalDate,
        executionDate,
        completed,
        completedAt,
        recurrenceRule: expanded.manifest.rule,
        recurrenceSummary: recurrenceSummary(expanded.manifest.rule)
      });
    });
    return { ok: true, rows, manifests: [expanded.manifest], hasMore: expanded.manifest.hasMore };
  }

  function resultContextRank(state, task, planOrder, options) {
    const fallback = { order: planOrder, key: task.date ? 'date:' + task.date : 'undated:undated', manual: false, resolved: false };
    if (options && Object.prototype.hasOwnProperty.call(options, 'timelineRankResolver')) {
      // An explicit v2 reader never falls through to the old view priority.
      // Only this same-date calendar rank consumes the hook; Plan/TXT/Sheet and
      // authoring previews retain their existing source/Plan order.
      if (task.occurrenceId) return fallback;
      try {
        const rank = typeof options.timelineRankResolver === 'function'
          ? options.timelineRankResolver(Object.freeze({ id: task.id, date: task.date || null, planOrder })) : null;
        if (rank && Number.isSafeInteger(rank.order) && rank.order >= 0 && rank.key === fallback.key && typeof rank.manual === 'boolean') {
          return { order: rank.order, key: rank.key, manual: rank.manual, resolved: true };
        }
      } catch (_) { /* Unavailable rank is an explicit Plan fallback, not old order. */ }
      return fallback;
    }
    const contexts = [];
    if (!task.date) contexts.push('undated');
    else {
      if (task.date === TODAY) contexts.push('today');
      if (task.date >= TODAY && task.date <= addDays(TODAY, 6)) contexts.push('week');
      if (task.date.slice(0, 7) === TODAY.slice(0, 7)) contexts.push('month');
    }
    for (const context of contexts) {
      const order = state.orders && state.orders[context];
      const index = Array.isArray(order) ? order.indexOf(task.id) : -1;
      if (index >= 0) return { order: index, key: context, manual: true };
    }
    return {
      order: planOrder,
      key: task.date ? 'date:' + task.date : 'undated:undated',
      manual: false
    };
  }

  function compareResultContextOrder(left, right) {
    return left.contextOrder - right.contextOrder || left.planOrder - right.planOrder;
  }

  function normalizeResultTxt(value) {
    const body = String(value === null || value === undefined ? '' : value)
      .replace(/\r\n|\r|\n/g, '\n')
      .replace(/[ \t]+(?=\n|$)/g, '')
      .replace(/\n+$/g, '');
    return body + '\n';
  }

  function pushTxtField(lines, label, value) {
    if (value === null || value === undefined || String(value).trim() === '') return;
    const values = String(value).replace(/\r\n?|\n/g, '\n').replace(/[ \t]+(?=\n|$)/g, '').replace(/\n+$/g, '').split('\n');
    if (values.length === 1) {
      lines.push('   ' + label + ': ' + values[0].trim());
      return;
    }
    lines.push('   ' + label + ':');
    values.forEach(entry => lines.push('     ' + entry.trim()));
  }

  function resultLinkText(values, fallback) {
    const links = Array.isArray(values) ? values.filter(Boolean) : [];
    if (links.length) return links.join(', ');
    return fallback || '';
  }

  function serializeCompleteResultTxt(title, rows, sourceOnlyText) {
    const safeTitle = String(title || '').trim() || '제목 없는 Flow';
    const lines = [safeTitle, '='.repeat(Math.max(3, Array.from(safeTitle).length)), ''];
    let currentStepKey = '';
    let itemNumber = 0;
    rows.forEach(row => {
      const stepTitle = String(row.sectionTitle || '할 일').trim() || '할 일';
      const stepKey = row.sectionGroupKey || row.stepId || stepTitle;
      if (stepKey !== currentStepKey) {
        if (currentStepKey && lines[lines.length - 1] !== '') lines.push('');
        lines.push('[' + stepTitle + ']');
        currentStepKey = stepKey;
        itemNumber = 0;
      }
      itemNumber += 1;
      const occurrenceLabel = row.occurrenceIndex === null || row.occurrenceIndex === undefined ? '' : ' · ' + row.occurrenceIndex + '회차';
      lines.push(itemNumber + '. ' + (row.completed ? '☑' : '☐') + ' ' + row.title + occurrenceLabel);
      const properties = row.sourceProperties || {};
      pushTxtField(lines, '설명', properties['설명'] || properties['상세'] || '');
      pushTxtField(lines, '메모', row.memo || properties['메모'] || '');
      pushTxtField(lines, '완료 기준', properties['완료 기준'] || '');
      pushTxtField(lines, '날짜', row.executionDate || '');
      pushTxtField(lines, '시간', row.time || '');
      pushTxtField(lines, '시간대', properties['시간대'] || '');
      pushTxtField(lines, '장소', properties['장소'] || '');
      const duration = properties['소요 시간'];
      pushTxtField(lines, '소요 시간', duration && /^\d+$/.test(duration) ? duration + '분' : duration || '');
      pushTxtField(lines, '반복', row.recurrenceSummary || properties['반복'] || '');
      pushTxtField(lines, '실행 조건', properties['실행 조건'] || properties['조건'] || '');
      if (Array.isArray(row.subchecks) && row.subchecks.length) {
        lines.push('   체크리스트:');
        row.subchecks.forEach(subcheck => lines.push('     ' + (subcheck.sourceChecked ? '☑' : '☐') + ' ' + subcheck.title));
      }
      pushTxtField(lines, '자료', resultLinkText(row.resources, properties['자료'] || properties['링크'] || ''));
      pushTxtField(lines, '출처', resultLinkText(row.sources, properties['출처'] || ''));
      pushTxtField(lines, '주의', properties['주의'] || '');
      lines.push('');
    });
    const memoLines = (Array.isArray(sourceOnlyText) ? sourceOnlyText : [])
      .map(value => String(value).trim())
      .filter(Boolean);
    if (memoLines.length) {
      if (lines[lines.length - 1] !== '') lines.push('');
      lines.push('[원문 메모]');
      memoLines.forEach(value => lines.push('- ' + value));
      lines.push('');
    }
    return normalizeResultTxt(lines.join('\n'));
  }

  function resultMonthCells(month, selectedDate, items) {
    const parts = month.split('-').map(Number);
    const leading = new Date(Date.UTC(parts[0], parts[1] - 1, 1)).getUTCDay();
    const days = new Date(Date.UTC(parts[0], parts[1], 0)).getUTCDate();
    const byDate = new Map();
    items.forEach(item => {
      if (!item.executionDate || item.timelinePolicy === 'excluded') return;
      const rows = byDate.get(item.executionDate) || [];
      rows.push(item);
      byDate.set(item.executionDate, rows);
    });
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - leading + 1;
      if (day < 1 || day > days) return {
        key: month + ':empty:' + index,
        inMonth: false,
        selected: false,
        itemRefs: [],
        rowIds: [],
        occurrenceIds: [],
        completedCount: 0
      };
      const date = month + '-' + String(day).padStart(2, '0');
      const rows = (byDate.get(date) || []).slice().sort(compareResultContextOrder);
      return {
        key: date,
        date,
        day,
        inMonth: true,
        selected: date === selectedDate,
        itemRefs: rows.map(item => item.ref),
        rowIds: rows.map(item => item.rowId),
        occurrenceIds: rows.map(item => item.occurrenceId).filter(Boolean),
        completedCount: rows.filter(item => item.completed).length
      };
    });
  }

  function buildResultCalendar(items, itemRefs, baseDate, selectedDate) {
    const month = baseDate.slice(0, 7);
    const cells = resultMonthCells(month, selectedDate, items);
    const visibleItems = items.filter(item => item.timelinePolicy !== 'excluded');
    const selectedItems = visibleItems
      .filter(item => item.executionDate === selectedDate)
      .sort(compareResultContextOrder);
    const undatedItems = visibleItems
      .filter(item => !item.executionDate)
      .sort(compareResultContextOrder);
    const calendar = {
      itemRefs: itemRefs.slice(),
      month,
      baseDate,
      selectedDate,
      cells,
      selectedItemRefs: selectedItems.map(item => item.ref),
      selectedRowIds: selectedItems.map(item => item.rowId),
      selectedOccurrenceIds: selectedItems.map(item => item.occurrenceId).filter(Boolean),
      selectedItems,
      undatedItemRefs: undatedItems.map(item => item.ref),
      undatedRowIds: undatedItems.map(item => item.rowId),
      undatedOccurrenceIds: undatedItems.map(item => item.occurrenceId).filter(Boolean),
      undatedItems,
      datePolicy: 'effective-date-execution-first',
      weekStartsOn: 'sunday',
      weekCount: 6,
      monthItemRefs: cells.reduce((refs, cell) => refs.concat(cell.itemRefs), []),
      monthRowIds: cells.reduce((refs, cell) => refs.concat(cell.rowIds), []),
      monthOccurrenceIds: cells.reduce((refs, cell) => refs.concat(cell.occurrenceIds), [])
    };
    visibleItems.slice().sort(compareResultContextOrder).forEach(item => {
      const key = item.executionDate || 'undated';
      if (!calendar[key]) calendar[key] = [];
      calendar[key].push(item.ref);
    });
    return calendar;
  }

  function resultFilenameSegment(value, fallback) {
    const normalized = String(value || '')
      .normalize('NFKC')
      .replace(/[\u0000-\u001f<>:"/\\|?*\u007f]/g, ' ')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-. ]+/g, '')
      .replace(/[. ]+$/g, '')
      .slice(0, 60);
    return normalized || fallback;
  }

  function quoteCsvValue(value) {
    return '"' + String(value === null || value === undefined ? '' : value).replace(/"/g, '""') + '"';
  }

  function buildResultDownloads(title, savedCopyId, itemRefs, txt, sheetRows, manifest) {
    const stem = 'flow-' + resultFilenameSegment(title, 'result') + '-' + resultFilenameSegment(savedCopyId, 'copy');
    const normalizedTxt = normalizeResultTxt(txt);
    const csvRows = [
      RESULT_SHEET_COLUMNS.map(column => quoteCsvValue(column.label)).join(','),
      ...sheetRows.map(row => RESULT_SHEET_COLUMNS.map(column => quoteCsvValue(
        column.key === 'status' ? row.statusCode : row[column.key]
      )).join(','))
    ];
    return {
      version: RESULT_DOWNLOAD_CONTRACT_VERSION,
      itemRefs: itemRefs.slice(),
      sourceItemRefs: manifest && Array.isArray(manifest.sourceItemRefs) ? manifest.sourceItemRefs.slice() : itemRefs.slice(),
      rowIds: manifest && Array.isArray(manifest.rowIds) ? manifest.rowIds.slice() : itemRefs.slice(),
      occurrenceIds: manifest && Array.isArray(manifest.occurrenceIds) ? manifest.occurrenceIds.slice() : [],
      txt: {
        filename: stem + '.txt',
        mediaType: 'text/plain;charset=utf-8',
        encoding: 'utf-8',
        bom: false,
        lineEndings: 'lf',
        finalNewline: 'single',
        payload: normalizedTxt
      },
      csv: {
        filename: stem + '.csv',
        mediaType: 'text/csv;charset=utf-8',
        encoding: 'utf-8',
        bom: true,
        lineEndings: 'crlf',
        finalNewline: 'single',
        payload: '\uFEFF' + csvRows.join('\r\n') + '\r\n',
        columns: RESULT_SHEET_COLUMNS.map(column => column.key),
        delimiter: ',',
        escaping: 'rfc4180-double-quote-all-fields'
      },
      sourceRawTextIncluded: false,
      sourceMutationCount: 0
    };
  }

  function buildUnifiedResultProjection(config) {
    const items = [];
    const recurrenceManifests = [];
    const projectionFailures = [];
    const hasTimelineRank = !config.preview && config.options && Object.prototype.hasOwnProperty.call(config.options, 'timelineRankResolver');
    const fallbackContexts = new Map();
    config.sourceItems.forEach(base => {
      const result = resultOccurrenceRows(config.state, base, config.options);
      if (!result.ok) {
        projectionFailures.push({ sourceItemRef: base.sourceItemRef, reason: result.reason });
        return;
      }
      recurrenceManifests.push.apply(recurrenceManifests, result.manifests);
      result.rows.forEach(row => {
        const planOrder = items.length;
        const rank = resultContextRank(config.state, { id: base.id, date: row.executionDate, occurrenceId: row.occurrenceId }, planOrder, config.preview ? null : config.options);
        if (hasTimelineRank && !rank.resolved && row.timelinePolicy !== 'excluded') {
          const reason = row.occurrenceId ? 'recurrence-order-out-of-scope' : 'incomplete-source-task-membership';
          if (!fallbackContexts.has(rank.key) || row.occurrenceId) fallbackContexts.set(rank.key, reason);
        }
        items.push(Object.assign({}, row, {
          planOrder,
          sourcePlanOrder: base.planOrder,
          contextOrder: rank.order,
          contextKey: rank.key,
          manualContextOrder: rank.manual
        }));
      });
    });
    // Global date indices and per-Flow Plan indices are not comparable. A date
    // with unmapped/recurring visible rows keeps one existing Plan order rather
    // than inventing an occurrence merge policy or changing when another Flow
    // or QuickItem enters the global date group. Other dates stay independent.
    if (hasTimelineRank && fallbackContexts.size) items.forEach(item => {
      if (item.timelinePolicy !== 'excluded' && fallbackContexts.has(item.contextKey)) {
        item.contextOrder = item.planOrder;
        item.manualContextOrder = false;
      }
    });
    if (projectionFailures.length && config.failClosed) return null;
    const sourceItemRefs = config.sourceItems.map(item => item.sourceItemRef);
    const itemRefs = items.map(item => item.rowId);
    const rowIds = itemRefs.slice();
    const occurrenceIds = items.map(item => item.occurrenceId).filter(Boolean);
    const occurrenceManifest = {
      version: OCCURRENCE_CONTRACT_VERSION,
      sourceItemRefs: sourceItemRefs.slice(),
      itemRefs: itemRefs.slice(),
      rowIds: rowIds.slice(),
      occurrenceIds: occurrenceIds.slice(),
      rows: items.map(item => ({
        rowId: item.rowId,
        occurrenceId: item.occurrenceId,
        seriesId: item.seriesId,
        sourceItemRef: item.sourceItemRef,
        originalDate: item.originalDate,
        occurrenceIndex: item.occurrenceIndex
      })),
      recurrenceManifests,
      hasMore: recurrenceManifests.some(manifest => manifest.hasMore),
      finitePageSize: FINITE_RECURRENCE_PAGE_SIZE,
      openEndedWindowWeeks: OPEN_ENDED_RECURRENCE_WEEKS
    };
    const baseDate = config.options && isDate(config.options.baseDate) ? config.options.baseDate : TODAY;
    const selectedDate = config.options && isDate(config.options.selectedDate) ? config.options.selectedDate : baseDate;
    const calendar = buildResultCalendar(items, itemRefs, baseDate, selectedDate);
    const txt = serializeCompleteResultTxt(config.title, items, config.sourceOnlyText);
    const sheet = items.map(item => ({
      itemRef: item.rowId,
      sourceItemRef: item.sourceItemRef,
      rowId: item.rowId,
      occurrenceId: item.occurrenceId,
      occurrenceIndex: item.occurrenceIndex,
      originalDate: item.originalDate,
      originalOccurrenceDate: item.originalDate,
      order: item.planOrder + 1,
      status: item.completed ? '완료' : '진행 중',
      statusCode: item.completed ? 'completed' : 'open',
      sectionTitle: item.sectionTitle,
      title: item.title,
      memo: item.memo || null,
      planDate: item.date,
      effectiveDate: item.executionDate,
      executionDate: item.executionDate,
      time: item.time || null,
      relativeDate: item.sourceProperties['상대 날짜'] || null,
      sourceDate: item.sourceProperties['날짜'] || item.sourceDate || null,
      timeZone: item.sourceProperties['시간대'] || null,
      place: item.sourceProperties['장소'] || null,
      resourceUrl: resultLinkText(item.resources, item.sourceProperties['자료'] || null) || null,
      recurrence: item.sourceProperties['반복'] || null,
      recurrenceEnd: item.sourceProperties['반복 종료'] || null,
      completionCriteria: item.sourceProperties['완료 기준'] || null,
      completedAt: item.completedAt,
      planOrder: item.planOrder,
      sourceLine: item.sourceLine
    }));
    const downloads = buildResultDownloads(config.title, config.savedCopyId, itemRefs, txt, sheet, occurrenceManifest);
    const slotManifest = { sourceItemRefs, itemRefs, rowIds, occurrenceIds };
    return Object.assign({
      contractVersion: RESULT_PROJECTION_VERSION,
      occurrenceContractVersion: OCCURRENCE_CONTRACT_VERSION,
      flowRef: config.flowRef,
      title: config.title,
      sourceItemRefs,
      itemRefs,
      rowIds,
      occurrenceIds,
      occurrenceManifest,
      recurrenceManifests,
      items,
      workingSource: config.workingSource,
      textLines: config.textLines,
      todo: itemRefs.slice(),
      calendar,
      sheet,
      txt,
      downloads,
      slots: {
        txt: Object.assign({ kind: 'copy-only', value: txt, download: downloads.txt }, slotManifest),
        todo: Object.assign({ kind: config.preview ? 'preview-projection' : 'interactive-projection' }, slotManifest),
        calendar: Object.assign({ kind: config.preview ? 'preview-projection' : 'interactive-projection' }, slotManifest),
        sheet: Object.assign({ kind: 'read-only-projection', rows: sheet, download: downloads.csv }, slotManifest)
      },
      projectionFailures
    }, config.extra || {}, hasTimelineRank ? { timelineOrderFallbacks: Array.from(fallbackContexts, ([contextKey, reason]) => ({ contextKey, reason })) } : {});
  }

  // DTO boundary only: PD owns source/current/Undo validation. Do not import P/C
  // here (P already depends on M), or treat this display value as edit authority.
  function safeResultStructureData(value, parents = new Set()) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (!value || typeof value !== 'object' || parents.has(value) || Object.getOwnPropertySymbols(value).length) return false;
    const nativePrototype = (proto, name) => {
      if (!proto || Object.getOwnPropertyDescriptor(proto, 'toJSON')) return false;
      const constructor = Object.getOwnPropertyDescriptor(proto, 'constructor');
      if (!constructor || !own(constructor, 'value') || typeof constructor.value !== 'function'
        || Function.prototype.toString.call(constructor.value) !== 'function ' + name + '() { [native code] }') return false;
      const prototype = Object.getOwnPropertyDescriptor(constructor.value, 'prototype');
      return Boolean(prototype && own(prototype, 'value') && prototype.value === proto);
    };
    const plainPrototype = proto => proto === null || (Object.getPrototypeOf(proto) === null && nativePrototype(proto, 'Object'));
    const array = Array.isArray(value), proto = Object.getPrototypeOf(value), names = Object.getOwnPropertyNames(value);
    if (array) {
      if (!nativePrototype(proto, 'Array') || !plainPrototype(Object.getPrototypeOf(proto))
        || names.length !== value.length + 1 || Object.keys(value).length !== value.length) return false;
      for (let index = 0; index < value.length; index += 1) if (!own(value, String(index))) return false;
    } else if (!plainPrototype(proto) || names.length !== Object.keys(value).length) return false;
    parents.add(value);
    for (const key of names) {
      if (array && key === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (['__proto__', 'constructor', 'prototype'].includes(key) || !descriptor || !own(descriptor, 'value')
        || !descriptor.enumerable || !safeResultStructureData(descriptor.value, parents)) return false;
    }
    parents.delete(value);
    return true;
  }

  function personalStructureResultItems(state, flow, sourceItems, view) {
    try {
      const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
        && Object.keys(value).length === keys.length && keys.every(key => own(value, key));
      if (!safeResultStructureData(view) || !exact(view, ['ok', 'viewOnly', 'flowRef', 'sections', 'orderedItemRefs'])
        || view.ok !== true || view.viewOnly !== true || typeof flow.ref !== 'string' || view.flowRef !== flow.ref
        || !Array.isArray(view.sections) || view.sections.length !== flow.steps.length || !Array.isArray(view.orderedItemRefs)) return null;
      if (typeof flow.savedCopyId !== 'string' || !flow.savedCopyId.trim() || typeof flow.sourceFlowId !== 'string' || !flow.sourceFlowId.trim()
        || flow.ref !== 'saved-flow:' + encodeURIComponent(flow.savedCopyId) + ':' + encodeURIComponent(flow.sourceFlowId)) return null;
      const itemPrefix = 'flow-item:' + encodeURIComponent(flow.savedCopyId) + ':' + encodeURIComponent(flow.sourceFlowId) + ':';
      const baseByRef = new Map(sourceItems.map(item => [item.sourceItemRef, item]));
      if (baseByRef.size !== sourceItems.length || view.orderedItemRefs.length !== sourceItems.length
        || new Set(view.orderedItemRefs).size !== sourceItems.length
        || view.orderedItemRefs.some(ref => typeof ref !== 'string' || !baseByRef.has(ref))) return null;
      const sectionOrders = new Set(), sectionIds = new Set(), decorated = new Map();
      for (const section of view.sections) {
        if (!exact(section, ['sectionId', 'sourceOrder', 'sourceTitle', 'title', 'itemRefs', 'titleOwner', 'editCapability'])
          || !Number.isSafeInteger(section.sourceOrder) || section.sourceOrder < 0 || section.sourceOrder >= flow.steps.length
          || sectionOrders.has(section.sourceOrder) || typeof section.sourceTitle !== 'string' || typeof section.title !== 'string'
          || !['authoring', 'unproven', 'source'].includes(section.titleOwner)
          || !['poc-shadow', 'readonly'].includes(section.editCapability) || !Array.isArray(section.itemRefs)) return null;
        if ((section.editCapability === 'poc-shadow') !== (section.titleOwner === 'authoring')
          || (section.title !== section.sourceTitle && (!section.title.trim() || section.title.trim() !== section.title))) return null;
        sectionOrders.add(section.sourceOrder);
        const step = flow.steps[section.sourceOrder];
        if (section.sourceTitle !== step.title || section.itemRefs.length !== step.itemIds.length
          || (section.editCapability === 'readonly' && section.title !== section.sourceTitle)) return null;
        if (section.sectionId === null) {
          if (section.editCapability !== 'readonly') return null;
        } else {
          if (typeof section.sectionId !== 'string' || !section.sectionId || section.sectionId !== step.id
            || sectionIds.has(section.sectionId) || flow.steps.filter(entry => entry.id === section.sectionId).length !== 1) return null;
          sectionIds.add(section.sectionId);
        }
        for (let index = 0; index < step.itemIds.length; index += 1) {
          const matches = state.tasks.filter(task => task.id === step.itemIds[index] && task.flowId === flow.id);
          if (matches.length !== 1) return null;
          const task = matches[0], ref = section.itemRefs[index], base = baseByRef.get(ref);
          // A supplied structure requires actual full refs; the old local-id
          // fallback remains available only when the option is absent.
          if (typeof task.ref !== 'string' || ref !== task.ref || !base || base.id !== task.id || decorated.has(ref)) return null;
          if (!ref.startsWith(itemPrefix)) return null;
          const sourceId = decodeURIComponent(ref.slice(itemPrefix.length));
          if (!sourceId.trim() || itemPrefix + encodeURIComponent(sourceId) !== ref) return null;
          decorated.set(ref, Object.assign({}, base, { sectionTitle: section.title,
            sectionGroupKey: JSON.stringify([flow.ref, section.sourceOrder]) }));
        }
      }
      if (decorated.size !== sourceItems.length) return null;
      return view.orderedItemRefs.map(ref => decorated.get(ref));
    } catch (_) { return null; }
  }

  function personalResultTextLines(title, items) {
    const lines = ['# ' + title];
    let sectionGroupKey = null;
    items.forEach(item => {
      if (item.sectionGroupKey !== sectionGroupKey) {
        lines.push('## ' + item.sectionTitle);
        sectionGroupKey = item.sectionGroupKey;
      }
      lines.push('- [' + (item.completed ? 'x' : ' ') + '] ' + item.title);
      lines.push('  - 계획 날짜: ' + (item.planDate || '미정'));
      if (item.executionDate !== item.planDate) lines.push('  - 실행 날짜: ' + (item.executionDate || '미정'));
      if (item.memo) lines.push('  - 메모: ' + item.memo);
    });
    return lines;
  }

  /* A read-only projection: writes happen only through explicit occurrence transitions. */
  function resultProjection(state, flowId, options) {
    const flow = state && state.flows && state.flows.find(entry => entry.id === flowId);
    if (!flow || isTrashedFlow(state, flowId)) return null;
    const byId = new Map(state.tasks.map(task => [task.id, task]));
    const sourceItems = [];
    const lines = ['# ' + flow.title];
    flow.steps.forEach((step, stepIndex) => {
      lines.push('## ' + step.title);
      step.itemIds.forEach(id => {
        const task = byId.get(id);
        if (!task) return;
        const planDate = taskPlanDate(task) || null;
        const sourceItemRef = sourceItemRefForTask(flow, task);
        sourceItems.push({
          id: task.id,
          sourceItemRef,
          title: task.title,
          memo: task.memo || '',
          sectionTitle: step.title,
          stepId: step.id || 'step-' + (stepIndex + 1),
          planDate,
          executionDate: task.date || null,
          sourceDate: task.sourceDate || null,
          sourceLine: task.sourceLine || null,
          sourceProperties: clone(task.sourceProperties || {}),
          subchecks: clone(task.sourceSubchecks || task.subchecks || []),
          resources: clone(task.sourceResources || task.resources || []),
          sources: clone(task.sourceSources || task.sources || []),
          time: task.time || '',
          completed: task.done,
          completedAt: task.completedAt || null,
          planOrder: sourceItems.length,
          timelinePolicy: task.timelinePolicy === 'excluded' || task.timelinePolicy === 'included' ? task.timelinePolicy : 'auto'
        });
        lines.push('- [' + (task.done ? 'x' : ' ') + '] ' + task.title);
        lines.push('  - 계획 날짜: ' + (planDate || '미정'));
        if (task.date !== planDate) lines.push('  - 실행 날짜: ' + (task.date || '미정'));
        if (task.memo) lines.push('  - 메모: ' + task.memo);
      });
    });
    let resultItems = sourceItems, resultLines = lines;
    if (options && own(options, 'personalPlanStructureView')) {
      const descriptor = Object.getOwnPropertyDescriptor(options, 'personalPlanStructureView');
      if (!descriptor || !own(descriptor, 'value') || !descriptor.enumerable) return null;
      resultItems = personalStructureResultItems(state, flow, sourceItems, descriptor.value);
      if (!resultItems) return null;
      resultLines = personalResultTextLines(flow.title, resultItems);
    }
    const parsedRaw = flow.rawText === null ? null : parseSource(flow.rawText);
    return buildUnifiedResultProjection({
      state,
      flowRef: flow.ref,
      title: flow.title,
      savedCopyId: flow.savedCopyId,
      sourceItems: resultItems,
      options: options || {},
      sourceOnlyText: parsedRaw ? parsedRaw.sourceOnlyText : [],
      workingSource: {
        kind: flow.rawText === null ? 'projected-source' : 'preserved-raw-source',
        editable: false,
        rawText: flow.rawText === null ? lines.join('\n') : flow.rawText
      },
      textLines: resultLines,
      preview: false,
      failClosed: true
    });
  }

  function authoringResultProjection(rawText, options) {
    const parsed = parseSource(rawText);
    const previewSavedCopyId = 'poc-preview-' + parsed.sourceFingerprint;
    const previewSourceFlowId = 'authoring-preview-' + parsed.sourceFingerprint;
    const lines = parsed.title ? ['# ' + parsed.title] : ['# 제목 없음'];
    const sourceItems = [];
    parsed.steps.forEach((step, stepIndex) => {
      if (!step.items.length) return;
      lines.push('## ' + step.title);
      step.items.forEach(item => {
        const sourceItemRef = 'flow-item:' + previewSavedCopyId + ':' + previewSourceFlowId + ':item-' + (sourceItems.length + 1);
        sourceItems.push({
          id: sourceItemRef,
          sourceItemRef,
          title: item.title,
          memo: '',
          sectionTitle: step.title,
          stepId: 'step-' + (stepIndex + 1),
          planDate: item.date || null,
          executionDate: item.date || null,
          sourceDate: item.properties['날짜'] || null,
          sourceLine: item.sourceLine,
          sourceProperties: clone(item.properties),
          properties: clone(item.properties),
          subchecks: clone(item.subchecks || []),
          resources: clone(item.resources || []),
          sources: clone(item.sources || []),
          time: item.properties['시간'] || '',
          completed: item.checkedInSource,
          completedAt: null,
          planOrder: sourceItems.length,
          timelinePolicy: 'auto'
        });
        lines.push('- [' + (item.checkedInSource ? 'x' : ' ') + '] ' + item.title);
        lines.push('  - 계획 날짜: ' + (item.date || '미정'));
      });
    });
    return buildUnifiedResultProjection({
      state: { orders: {}, occurrenceOverrides: {} },
      flowRef: 'saved-flow:' + previewSavedCopyId + ':' + previewSourceFlowId,
      title: parsed.title || '제목 없음',
      savedCopyId: previewSavedCopyId,
      sourceItems,
      options: options || {},
      sourceOnlyText: parsed.sourceOnlyText,
      workingSource: { kind: 'working-source', editable: true, rawText: parsed.rawText },
      textLines: lines,
      preview: true,
      failClosed: false,
      extra: {
        sourceFingerprint: parsed.sourceFingerprint,
        issues: parsed.issues,
        ignoredLineCount: parsed.ignoredLineCount
      }
    });
  }

  function authoringPropertyByKey(key) {
    return AUTHORING_PROPERTY_CATALOG.find(entry => entry.key === key) || null;
  }

  function protectedAuthoringLines(rawText) {
    const protectedLines = new Set();
    let fence = null;
    let inHtmlComment = false;
    splitLogicalSourceLines(rawText).forEach(line => {
      const match = /^ {0,3}(`{3,}|~{3,})/.exec(line.rawLine);
      if (fence) {
        protectedLines.add(line.line);
        if (match && match[1][0] === fence.marker && match[1].length >= fence.length) fence = null;
        return;
      }
      if (inHtmlComment) {
        protectedLines.add(line.line);
        if (line.rawLine.includes('-->')) inHtmlComment = false;
        return;
      }
      if (match) {
        fence = { marker: match[1][0], length: match[1].length };
        protectedLines.add(line.line);
        return;
      }
      if (line.rawLine.includes('<!--')) {
        protectedLines.add(line.line);
        if (!line.rawLine.slice(line.rawLine.indexOf('<!--') + 4).includes('-->')) inHtmlComment = true;
      }
    });
    return protectedLines;
  }

  function authoringItemSpan(rawText, itemSourceLine) {
    const lines = splitLogicalSourceLines(rawText);
    const protectedLines = protectedAuthoringLines(rawText);
    const index = lines.findIndex(line => line.line === itemSourceLine);
    if (index < 0 || protectedLines.has(itemSourceLine) || !/^- \[[ xX]\]\s+\S/.test(lines[index].rawLine)) return null;
    let end = index + 1;
    while (end < lines.length && !/^(?:#{1,2}(?:\s|$)|- \[[ xX]\](?:\s|$)|-[ \t]*\[[ \t]*\][ \t]+\S)/.test(lines[end].rawLine)) end += 1;
    return {
      lines: lines.slice(index, end),
      insertOffset: end < lines.length ? lines[end].startOffset : rawText.length,
      lineEnding: rawText.includes('\r\n') ? '\r\n' : rawText.includes('\r') ? '\r' : '\n',
      trailingNewline: /[\r\n]$/.test(rawText)
    };
  }

  function authoringPropertyMatches(rawText, itemSourceLine, entry) {
    const span = authoringItemSpan(rawText, itemSourceLine);
    if (!span) return null;
    const protectedLines = protectedAuthoringLines(rawText);
    const matches = span.lines.slice(1).flatMap(line => {
      if (protectedLines.has(line.line)) return [];
      const match = /^(?: {2,}|\t+)- ([^:：\r\n]{1,32})[:：]([ \t]*)(.*)$/.exec(line.rawLine);
      if (!match || match[1].trim().replace(/[\s_-]+/g, '') !== entry.sourceLabel.replace(/[\s_-]+/g, '')) return [];
      const rawValue = match[3];
      const start = line.startOffset + match[0].length - rawValue.length;
      return [{ line, rawValue: rawValue.trimEnd(), start, end: start + rawValue.trimEnd().length }];
    });
    return { span, matches };
  }

  function authoringChildActionMatches(rawText, itemSourceLine) {
    const span = authoringItemSpan(rawText, itemSourceLine);
    if (!span) return null;
    const protectedLines = protectedAuthoringLines(rawText);
    const matches = span.lines.slice(1).flatMap(line => {
      if (protectedLines.has(line.line)) return [];
      const match = /^ {2}- \[([ xX])\]([ \t]*)(.*)$/.exec(line.rawLine);
      if (!match || !match[3].trim()) return [];
      const rawValue = match[3];
      const start = line.startOffset + match[0].length - rawValue.length;
      return [{ line, rawValue: rawValue.trimEnd(), start, end: start + rawValue.trimEnd().length, sourceChecked: match[1].toLowerCase() === 'x' }];
    });
    return { span, matches };
  }

  function listAuthoringPropertyInstances(input) {
    const rawText = typeof input.rawText === 'string' ? input.rawText : '';
    if (input.expectedSourceFingerprint && fingerprint(rawText) !== input.expectedSourceFingerprint) return [];
    const entry = authoringPropertyByKey(input.key);
    if (!entry) return [];
    const found = entry.sourceKind === 'child-action'
      ? authoringChildActionMatches(rawText, input.itemSourceLine)
      : authoringPropertyMatches(rawText, input.itemSourceLine, entry);
    if (!found) return [];
    return found.matches.map(match => ({
      key: entry.key,
      sourceLine: match.line.line,
      rawValue: match.rawValue,
      sourceChecked: Boolean(match.sourceChecked),
      selection: { start: match.start, end: match.end }
    }));
  }

  function normalizeAuthoringPropertyValue(entry, value) {
    const normalized = String(value || '').trim();
    if (!normalized || /[\r\n]/.test(normalized)) return null;
    if (entry.valueKind === 'date') return isDate(normalized) ? normalized : null;
    if (entry.valueKind === 'time') return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized) ? normalized : null;
    if (entry.valueKind === 'time-zone') {
      try {
        new Intl.DateTimeFormat('ko-KR', { timeZone: normalized }).format();
        return normalized;
      } catch (error) {
        return null;
      }
    }
    if (entry.valueKind === 'relative-date') {
      if (/^D(?:-Day|[+-]?0)$/i.test(normalized.replace(/\s+/g, ''))) return 'D-Day';
      const relative = normalized.match(/^D\s*([+-])\s*(\d+)$/i);
      return relative ? 'D' + relative[1] + String(Number(relative[2])) : null;
    }
    if (entry.valueKind === 'duration') {
      const match = /^([1-9]\d*)\s*(분|시간)$/.exec(normalized);
      return match && Number.isSafeInteger(Number(match[1])) ? String(Number(match[1])) + match[2] : null;
    }
    if (entry.valueKind === 'recurrence-end') {
      return isDate(normalized) || /^([1-9]\d*)\s*회$/.test(normalized)
        ? normalized.replace(/\s+/g, '')
        : null;
    }
    if (entry.valueKind === 'url') {
      const markdown = /^\[([^\]\r\n]+)\]\((https?:\/\/[^\s)]+)\)$/i.exec(normalized);
      const candidate = markdown ? markdown[2] : normalized;
      try { const parsed = new URL(candidate); return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? normalized : null; }
      catch (error) { return null; }
    }
    return normalized;
  }

  function locateAuthoringPropertyValue(input) {
    const rawText = typeof input.rawText === 'string' ? input.rawText : '';
    if (fingerprint(rawText) !== input.expectedSourceFingerprint) return { status: 'blocked', reason: 'stale-source', mutationCount: 0, rawText };
    const entry = authoringPropertyByKey(input.key);
    if (!entry) return { status: 'blocked', reason: 'unknown-property', mutationCount: 0, rawText };
    const found = entry.sourceKind === 'child-action'
      ? authoringChildActionMatches(rawText, input.itemSourceLine)
      : authoringPropertyMatches(rawText, input.itemSourceLine, entry);
    if (!found) return { status: 'blocked', reason: 'not-root-item', mutationCount: 0, rawText };
    const matches = found.matches.filter(match => input.propertySourceLine === undefined || match.line.line === input.propertySourceLine);
    if (matches.length !== 1) return { status: 'blocked', reason: matches.length ? 'duplicate-property' : 'property-not-found', mutationCount: 0, rawText };
    const match = matches[0];
    return { status: 'located', key: entry.key, rawValue: match.rawValue, sourceLine: match.line.line, propertySourceLine: match.line.line, selection: { start: match.start, end: match.end }, mutationCount: 0 };
  }

  function planAuthoringPropertyEdit(input) {
    const rawText = typeof input.rawText === 'string' ? input.rawText : '';
    if (input.intent === 'cancel') return { status: 'cancelled', rawText, mutationCount: 0 };
    if (fingerprint(rawText) !== input.expectedSourceFingerprint) return { status: 'blocked', reason: 'stale-source', rawText, mutationCount: 0 };
    const entry = authoringPropertyByKey(input.key);
    if (!entry) return { status: 'blocked', reason: 'unknown-property', rawText, mutationCount: 0 };
    if (entry.writeSupport !== 'editable') return { status: 'blocked', reason: 'unsupported-property', rawText, mutationCount: 0 };
    const value = normalizeAuthoringPropertyValue(entry, input.value);
    if (value === null) return { status: 'blocked', reason: 'invalid-value', rawText, mutationCount: 0 };
    if (entry.sourceKind === 'child-action') {
      const foundChild = authoringChildActionMatches(rawText, input.itemSourceLine);
      if (!foundChild) return { status: 'blocked', reason: 'not-root-item', rawText, mutationCount: 0 };
      if (foundChild.matches.some(match => match.rawValue.trim() === value)) return { status: 'no-op', rawText, mutationCount: 0 };
      const firstProperty = foundChild.span.lines.slice(1).find(line => /^(?: {2,}|\t+)- ([^:：\r\n]{1,32})[:：]/.test(line.rawLine));
      const from = firstProperty ? firstProperty.startOffset : foundChild.span.insertOffset;
      const before = from > 0 && /[\r\n]/.test(rawText[from - 1]) ? '' : foundChild.span.lineEnding;
      const after = from < rawText.length || foundChild.span.trailingNewline ? foundChild.span.lineEnding : '';
      const prefix = before + '  - [ ] ';
      const insert = prefix + value + after;
      const nextRawText = rawText.slice(0, from) + insert + rawText.slice(from);
      const selection = { start: from + prefix.length, end: from + prefix.length + value.length };
      const change = { from, to: from, insert };
      return {
        status: 'applied', key: entry.key, nextRawText, selection, mutationCount: 1,
        transaction: { version: 1, kind: 'property-edit', beforeFingerprint: fingerprint(rawText), afterFingerprint: fingerprint(nextRawText), beforeRawText: rawText, afterRawText: nextRawText, change, changes: [change] }
      };
    }
    const found = authoringPropertyMatches(rawText, input.itemSourceLine, entry);
    if (!found) return { status: 'blocked', reason: 'not-root-item', rawText, mutationCount: 0 };
    const appendDistinct = entry.key === 'guide' || entry.key === 'caution';
    if (appendDistinct && found.matches.some(match => match.rawValue.trimEnd() === value)) return { status: 'no-op', rawText, mutationCount: 0 };
    if (!appendDistinct && found.matches.length > 1) return { status: 'blocked', reason: 'duplicate-property', rawText, mutationCount: 0 };

    const conflictKey = entry.key === 'date' ? 'relativeDate' : entry.key === 'relativeDate' ? 'date' : null;
    if (conflictKey) {
      const conflict = authoringPropertyMatches(rawText, input.itemSourceLine, authoringPropertyByKey(conflictKey));
      if (conflict && conflict.matches.some(match => match.rawValue)) return { status: 'blocked', reason: 'conflicting-schedule', rawText, mutationCount: 0 };
    }
    if (entry.dependency) {
      const dependency = authoringPropertyMatches(rawText, input.itemSourceLine, authoringPropertyByKey(entry.dependency));
      if (!dependency || !dependency.matches.some(match => match.rawValue)) return { status: 'blocked', reason: 'missing-dependency', rawText, mutationCount: 0 };
    }
    if (entry.key === 'repeat' || entry.key === 'repeatEnd') {
      const repeat = entry.key === 'repeat' ? value : ((authoringPropertyMatches(rawText, input.itemSourceLine, authoringPropertyByKey('repeat')) || { matches: [] }).matches[0] || {}).rawValue;
      const repeatEnd = entry.key === 'repeatEnd' ? value : ((authoringPropertyMatches(rawText, input.itemSourceLine, authoringPropertyByKey('repeatEnd')) || { matches: [] }).matches[0] || {}).rawValue;
      if (!repeat || !parseRecurrence(repeat, repeatEnd).ok) return { status: 'blocked', reason: 'invalid-value', rawText, mutationCount: 0 };
    }

    let from;
    let to;
    let insert;
    let selection;
    if (!appendDistinct && found.matches.length === 1) {
      const match = found.matches[0];
      if (match.rawValue === value) return { status: 'no-op', rawText, mutationCount: 0 };
      from = match.start;
      to = match.end;
      insert = value;
      selection = { start: from, end: from + value.length };
    } else {
      from = found.span.insertOffset;
      to = from;
      const needsBefore = from > 0 && !/[\r\n]/.test(rawText[from - 1]);
      const needsAfter = from < rawText.length || /[\r\n]$/.test(rawText);
      const prefix = (needsBefore ? found.span.lineEnding : '') + '  - ' + entry.sourceLabel + ': ';
      insert = prefix + value + (needsAfter ? found.span.lineEnding : '');
      selection = { start: from + prefix.length, end: from + prefix.length + value.length };
    }
    const nextRawText = rawText.slice(0, from) + insert + rawText.slice(to);
    return {
      status: 'applied', key: entry.key, nextRawText, selection, mutationCount: 1,
      transaction: { version: 1, kind: 'property-edit', beforeFingerprint: fingerprint(rawText), afterFingerprint: fingerprint(nextRawText), beforeRawText: rawText, afterRawText: nextRawText, change: { from, to, insert }, changes: [{ from, to, insert }] }
    };
  }

  function planAuthoringPropertyBatchEdit(input) {
    const rawText = typeof input.rawText === 'string' ? input.rawText : '';
    const updates = Array.isArray(input.updates) ? input.updates : [];
    const keys = updates.map(update => update.key);
    if (input.intent === 'cancel') return { status: 'cancelled', keys, rawText, mutationCount: 0 };
    if (fingerprint(rawText) !== input.expectedSourceFingerprint) return { status: 'blocked', reason: 'stale-source', keys, rawText, mutationCount: 0 };
    const unique = new Set(keys);
    const signature = Array.from(unique).sort().join('+');
    if (updates.length !== 2 || unique.size !== 2 || (signature !== 'time+timezone' && signature !== 'repeat+repeatEnd')) {
      return { status: 'blocked', reason: 'invalid-batch', keys, rawText, mutationCount: 0 };
    }
    const beforeSpan = authoringItemSpan(rawText, input.itemSourceLine);
    if (!beforeSpan) return { status: 'blocked', reason: 'unsafe-source-shape', keys, rawText, mutationCount: 0 };
    const orderedKeys = signature === 'time+timezone' ? ['time', 'timezone'] : ['repeat', 'repeatEnd'];
    let workingRawText = rawText;
    let selection = { start: beforeSpan.lines[0].startOffset, end: beforeSpan.lines[0].startOffset };
    let appliedCount = 0;
    for (const key of orderedKeys) {
      const update = updates.find(candidate => candidate.key === key);
      if (!update) return { status: 'blocked', reason: 'invalid-batch', keys, rawText, mutationCount: 0 };
      const planned = planAuthoringPropertyEdit({ intent: 'apply', rawText: workingRawText, expectedSourceFingerprint: fingerprint(workingRawText), itemSourceLine: input.itemSourceLine, key, value: update.value });
      if (planned.status === 'no-op') continue;
      if (planned.status !== 'applied') return { status: 'blocked', reason: planned.reason || 'unsafe-source-shape', keys, rawText, mutationCount: 0 };
      workingRawText = planned.nextRawText;
      selection = planned.selection;
      appliedCount += 1;
    }
    if (appliedCount === 0) return { status: 'no-op', keys, rawText, mutationCount: 0 };
    const afterSpan = authoringItemSpan(workingRawText, input.itemSourceLine);
    if (!afterSpan) return { status: 'blocked', reason: 'unsafe-source-shape', keys, rawText, mutationCount: 0 };
    const from = beforeSpan.lines[0].startOffset;
    const change = { from, to: beforeSpan.insertOffset, insert: workingRawText.slice(from, afterSpan.insertOffset) };
    const nextRawText = rawText.slice(0, change.from) + change.insert + rawText.slice(change.to);
    if (nextRawText !== workingRawText) return { status: 'blocked', reason: 'unsafe-source-shape', keys, rawText, mutationCount: 0 };
    return {
      status: 'applied', keys: orderedKeys, nextRawText, selection, mutationCount: 1,
      transaction: { version: 1, kind: 'property-batch-edit', beforeFingerprint: fingerprint(rawText), afterFingerprint: fingerprint(nextRawText), beforeRawText: rawText, afterRawText: nextRawText, change, changes: [change] }
    };
  }

  function listAuthoringNearMissTargets(rawText) {
    const sourceFingerprint = fingerprint(rawText);
    const protectedLines = protectedAuthoringLines(rawText);
    return splitLogicalSourceLines(rawText).flatMap(line => {
      if (protectedLines.has(line.line) || /^- \[ \]\s+\S/.test(line.rawLine)) return [];
      const match = /^-([ \t]*)\[([ \t]*)\]([ \t]+)(\S.*?)([ \t]*)$/.exec(line.rawLine);
      if (!match || (match[1].length > 0 && match[2] === ' ')) return [];
      const prefixLength = 1 + match[1].length + 1 + match[2].length + 1;
      return [{ targetId: 'near-miss-' + sourceFingerprint + '-' + line.line, sourceFingerprint, sourceLine: line.line, title: match[4], prefixRange: { from: line.startOffset, to: line.startOffset + prefixLength } }];
    });
  }

  function planAuthoringNearMissRepair(input) {
    const rawText = typeof input.rawText === 'string' ? input.rawText : '';
    if (input.intent === 'cancel') return { status: 'cancelled', rawText, mutationCount: 0 };
    if (fingerprint(rawText) !== input.expectedSourceFingerprint) return { status: 'blocked', reason: 'stale-source', rawText, mutationCount: 0 };
    const target = listAuthoringNearMissTargets(rawText).find(entry => entry.targetId === input.targetId);
    if (!target) return { status: 'blocked', reason: 'unknown-target', rawText, mutationCount: 0 };
    const from = target.prefixRange.from;
    const to = target.prefixRange.to;
    const insert = '- [ ]';
    const nextRawText = rawText.slice(0, from) + insert + rawText.slice(to);
    const titleStart = nextRawText.indexOf(target.title, from + insert.length);
    return {
      status: 'repaired', nextRawText, selection: { start: titleStart, end: titleStart + target.title.length }, mutationCount: 1,
      transaction: { version: 1, kind: 'near-miss-repair', beforeFingerprint: fingerprint(rawText), afterFingerprint: fingerprint(nextRawText), beforeRawText: rawText, afterRawText: nextRawText, change: { from, to, insert } }
    };
  }

  function validate(state) {
    const errors = [];
    if (!state || typeof state !== 'object' || state.version !== VERSION || !Array.isArray(state.folders) || !Array.isArray(state.flows) || !Array.isArray(state.tasks) || !state.orders || typeof state.orders !== 'object' || (state.occurrenceOverrides !== undefined && (!state.occurrenceOverrides || typeof state.occurrenceOverrides !== 'object' || Array.isArray(state.occurrenceOverrides))) || (state.trashEntries !== undefined && !Array.isArray(state.trashEntries)) || (state.quickConversionReceipts !== undefined && !Array.isArray(state.quickConversionReceipts))) return ['invalid-shape'];
    const unique = (entries, label) => {
      const ids = new Set();
      entries.forEach(entry => {
        if (!entry || typeof entry.id !== 'string' || !/^[a-z0-9_-]+$/i.test(entry.id)) errors.push('invalid-' + label + '-id');
        else if (ids.has(entry.id)) errors.push('duplicate-' + label + '-id');
        else ids.add(entry.id);
      });
      return ids;
    };
    const folderIds = unique(state.folders, 'folder');
    const flowIds = unique(state.flows, 'flow');
    const taskIds = unique(state.tasks, 'task');
    const supportedOrigins = new Set(['source-backed-map', 'personal-draft', 'canonical-personal-copy', 'legacy-saved-plan', 'authoring-handoff']);
    const folderExists = id => id === null || folderIds.has(id);
    state.folders.forEach(folder => {
      if (!folder.title || !folderExists(folder.parentId) || folder.parentId === folder.id) errors.push('invalid-folder');
      if (folder.parentId) {
        const parent = state.folders.find(entry => entry.id === folder.parentId);
        if (parent && parent.parentId !== null) errors.push('folder-depth');
      }
    });
    const membership = new Map();
    state.flows.forEach(flow => {
      if (!flow.title || !folderExists(flow.folderId) || !Array.isArray(flow.steps)) errors.push('invalid-flow');
      if (!supportedOrigins.has(flow.origin)) errors.push('unsupported-origin');
      if (flow.origin === 'authoring-handoff' && (typeof flow.rawText !== 'string' || typeof flow.sourceFingerprint !== 'string' || typeof flow.handoffId !== 'string')) errors.push('invalid-authoring-flow');
      flow.steps.forEach(step => {
        if (!step.title || !Array.isArray(step.itemIds)) errors.push('invalid-step');
        else step.itemIds.forEach(id => { if (!taskIds.has(id) || membership.has(id)) errors.push('invalid-membership'); else membership.set(id, flow.id); });
      });
    });
    state.tasks.forEach(task => {
      if (!task.title || (task.date !== null && !isDate(task.date)) || typeof task.done !== 'boolean') errors.push('invalid-task');
      if ((task.memo !== undefined && typeof task.memo !== 'string')
        || (task.sourceDescription !== undefined && typeof task.sourceDescription !== 'string')
        || (task.completionCriterion !== undefined && typeof task.completionCriterion !== 'string')
        || (task.sourceLine !== undefined && (!Number.isInteger(task.sourceLine) || task.sourceLine < 1))
        || (task.sourceProperties !== undefined && (!task.sourceProperties || typeof task.sourceProperties !== 'object' || Array.isArray(task.sourceProperties) || Object.values(task.sourceProperties).some(value => typeof value !== 'string')))) errors.push('invalid-item-detail-metadata');
      if (task.flowId === null) { if (!folderExists(task.folderId) || membership.has(task.id)) errors.push('invalid-quick-item'); }
      else if (!flowIds.has(task.flowId) || task.folderId !== null || membership.get(task.id) !== task.flowId) errors.push('invalid-flow-item');
      else if (!itemDetails(state, task.id)) errors.push('invalid-item-detail-binding');
      const properties = task.sourceProperties && typeof task.sourceProperties === 'object' ? task.sourceProperties : {};
      if (properties['반복 종료'] && !properties['반복']) errors.push('invalid-recurrence-end');
      if (properties['반복']) {
        const startDate = taskPlanDate(task);
        const parsed = parseRecurrence(properties['반복'], properties['반복 종료']);
        if (!isDate(startDate) || !parsed.ok || (parsed.ok && parsed.rule.end && parsed.rule.end.mode === 'until' && parsed.rule.end.date < startDate)) errors.push('invalid-recurrence');
      }
    });
    const conversionIds = new Set();
    const convertedQuickIds = new Set();
    const convertedFlowIds = new Set();
    quickConversionReceipts(state).forEach(receipt => {
      if (!receipt || typeof receipt !== 'object'
        || receipt.version !== 1
        || typeof receipt.conversionId !== 'string' || !receipt.conversionId
        || receipt.handoffId !== receipt.conversionId
        || typeof receipt.sourceQuickItemId !== 'string' || !receipt.sourceQuickItemId
        || typeof receipt.sourceTitle !== 'string' || !receipt.sourceTitle
        || typeof receipt.sourceMemo !== 'string'
        || (receipt.sourceFolderId !== null && (typeof receipt.sourceFolderId !== 'string' || !/^[a-z0-9_-]+$/i.test(receipt.sourceFolderId)))
        || (receipt.sourceDate !== null && !isDate(receipt.sourceDate))
        || typeof receipt.flowId !== 'string' || !receipt.flowId
        || typeof receipt.itemId !== 'string' || !receipt.itemId
        || typeof receipt.flowTitle !== 'string' || !receipt.flowTitle
        || receipt.completionPolicy !== 'source-preserved-new-item-open'
        || typeof receipt.committedAt !== 'string' || !receipt.committedAt
        || conversionIds.has(receipt.conversionId)
        || convertedQuickIds.has(receipt.sourceQuickItemId)
        || convertedFlowIds.has(receipt.flowId)) {
        errors.push('invalid-quick-conversion-receipt');
        return;
      }
      const convertedFlow = state.flows.find(entry => entry.id === receipt.flowId);
      const convertedItem = state.tasks.find(entry => entry.id === receipt.itemId);
      if (!convertedFlow
        || convertedFlow.origin !== 'authoring-handoff'
        || convertedFlow.handoffId !== receipt.handoffId
        || flowItemIds(convertedFlow).length !== 1
        || flowItemIds(convertedFlow)[0] !== receipt.itemId
        || !convertedItem
        || convertedItem.flowId !== receipt.flowId) {
        errors.push('invalid-quick-conversion-binding');
        return;
      }
      conversionIds.add(receipt.conversionId);
      convertedQuickIds.add(receipt.sourceQuickItemId);
      convertedFlowIds.add(receipt.flowId);
    });
    const trashIds = new Set();
    trashEntries(state).forEach(entry => {
      const token = entry && entry.kind + ':' + entry.id;
      if (!entry || (entry.kind !== 'flow' && entry.kind !== 'quick') || typeof entry.id !== 'string' || typeof entry.deletedAt !== 'string' || trashIds.has(token)) {
        errors.push('invalid-trash-entry');
        return;
      }
      trashIds.add(token);
      if (entry.kind === 'flow' && !flowIds.has(entry.id)) errors.push('invalid-trash-target');
      if (entry.kind === 'quick' && !state.tasks.some(task => task.id === entry.id && task.flowId === null)) errors.push('invalid-trash-target');
    });
    Object.keys(state.orders).forEach(context => {
      const order = state.orders[context];
      const base = viewTaskIds(Object.assign({}, state, { orders: {} }), context);
      if (!Array.isArray(order) || order.length !== base.length || new Set(order).size !== order.length || order.some(id => !base.includes(id))) errors.push('invalid-order');
    });
    if (!errors.length) Object.entries(occurrenceOverrides(state)).forEach(([occurrenceId, override]) => {
      if (!override || typeof override !== 'object' || Array.isArray(override)
        || typeof override.sourceItemRef !== 'string' || !override.sourceItemRef
        || !isDate(override.originalDate)
        || (own(override, 'effectiveDate') && override.effectiveDate !== null && !isDate(override.effectiveDate))
        || (own(override, 'completed') && typeof override.completed !== 'boolean')
        || (own(override, 'completedAt') && override.completedAt !== null && typeof override.completedAt !== 'string')
        || (!own(override, 'effectiveDate') && !own(override, 'completed'))) {
        errors.push('invalid-occurrence-override');
        return;
      }
      if (override.completed === false && override.completedAt) {
        errors.push('invalid-occurrence-completion');
        return;
      }
      if (!occurrenceSource(state, override.sourceItemRef, occurrenceId, override.originalDate, true)) errors.push('orphan-occurrence-override');
    });
    return errors;
  }

  function apply(state, action) {
    const reject = (error, message) => ({ state, changed: false, error, message });
    if (validate(state).length) return reject('invalid-state', '저장된 PoC 상태가 올바르지 않아요.');
    if (!action || typeof action !== 'object') return reject('invalid-action', '동작을 확인해 주세요.');
    const next = clone(state);
    const task = next.tasks.find(entry => entry.id === action.id);
    const flow = next.flows.find(entry => entry.id === (action.id || action.flowId));
    const folderExists = id => id === null || next.folders.some(folder => folder.id === id);
    let message = '';
    switch (action.type) {
      case 'add-quick': {
        if (typeof action.title !== 'string' || !action.title.trim()) return reject('invalid-title', '할 일 이름을 입력해 주세요.');
        if (!folderExists(action.folderId)) return reject('invalid-folder', '폴더를 확인해 주세요.');
        if (action.date !== null && !isDate(action.date)) return reject('invalid-date', '날짜를 확인해 주세요.');
        let number = 1; while (next.tasks.some(entry => entry.id === 'quick-' + number)) number += 1;
        next.tasks.push({ id: 'quick-' + number, title: action.title.trim(), flowId: null, folderId: action.folderId, date: action.date, sourceDate: null, time: '', memo: '', done: false, completedAt: null });
        message = '빠른 할 일을 만들었어요.';
        break;
      }
      case 'update-quick': {
        if (!task || task.flowId !== null) return reject('invalid-quick-item', '수정할 빠른 할 일을 확인해 주세요.');
        if (isTrashedTask(next, task)) return reject('trashed-task', '휴지통의 항목은 복원한 뒤 바꿔 주세요.');
        if (typeof action.title !== 'string' || !action.title.trim()) return reject('invalid-title', '할 일 이름을 입력해 주세요.');
        if (typeof action.memo !== 'string') return reject('invalid-item-memo', '메모는 글로 입력해 주세요.');
        if (!folderExists(action.folderId)) return reject('invalid-folder', '폴더를 확인해 주세요.');
        if (action.date !== null && !isDate(action.date)) return reject('invalid-date', '날짜를 확인해 주세요.');
        task.title = action.title.trim();
        task.memo = action.memo;
        task.date = action.date;
        task.folderId = action.folderId;
        message = '빠른 할 일을 저장했어요.';
        break;
      }
      case 'convert-quick-item-to-flow': {
        if (action.intent === 'cancel') return { state, changed: false, message: 'Flow로 정리를 취소했어요.' };
        if (!Number.isSafeInteger(action.expectedRevision) || action.expectedRevision !== state.revision) return reject('stale-state-revision', '다른 변경이 먼저 저장됐어요. 빠른 할 일을 다시 확인해 주세요.');
        const sourceTask = next.tasks.find(entry => entry.id === action.quickItemId && entry.flowId === null);
        if (!sourceTask) return reject('invalid-quick-item', '정리할 빠른 할 일을 찾을 수 없어요.');
        if (isTrashedTask(next, sourceTask)) return reject('trashed-task', '휴지통의 빠른 할 일은 복원한 뒤 정리해 주세요.');
        if (quickConversionReceipts(next).some(receipt => receipt.sourceQuickItemId === sourceTask.id)) return { state, changed: false, message: '이미 Flow로 정리했어요.' };
        const flowTitle = typeof action.flowTitle === 'string' ? action.flowTitle.trim() : '';
        if (!isSingleLineTitle(flowTitle) || !isSingleLineTitle(sourceTask.title)) return reject('invalid-flow-title', '새 Flow 이름과 빠른 할 일 내용을 확인해 주세요.');
        const conversionId = 'quick-item-to-flow:v1:' + encodeURIComponent(sourceTask.id) + ':revision-' + state.revision;
        const suffix = safeId(conversionId);
        const flowId = 'quick-flow-' + suffix;
        const itemId = 'quick-flow-item-' + suffix;
        const savedCopyId = 'poc-' + suffix;
        const sourceFlowId = 'quick-conversion-' + safeId(sourceTask.id);
        if (next.flows.some(entry => entry.id === flowId || entry.ref === 'saved-flow:' + savedCopyId + ':' + sourceFlowId) || (Array.isArray(action.existingFlowIds) && action.existingFlowIds.includes(flowId))) return reject('flow-identity-collision', 'Flow 식별자가 겹쳐 저장하지 않았어요.');
        if (next.tasks.some(entry => entry.id === itemId)) return reject('item-identity-collision', '할 일 식별자가 겹쳐 저장하지 않았어요.');
        const committedAt = typeof action.now === 'string' && action.now ? action.now : TODAY + 'T12:00:00.000Z';
        const rawText = '# ' + flowTitle + '\n\n- [ ] ' + sourceTask.title;
        next.tasks.push({ id: itemId, title: sourceTask.title, sourceTitle: sourceTask.title, flowId, folderId: null, date: sourceTask.date, sourceDate: null, time: sourceTask.time || '', memo: sourceTask.memo, sourceMemo: '', done: false, completedAt: null, ref: 'flow-item:' + savedCopyId + ':' + sourceFlowId + ':item-1' });
        next.flows.push({ id: flowId, ref: 'saved-flow:' + savedCopyId + ':' + sourceFlowId, savedCopyId, sourceFlowId, origin: 'authoring-handoff', originLabel: '빠른 할 일에서 정리', title: flowTitle, sourceTitle: flowTitle, folderId: sourceTask.folderId, rawText, sourceFingerprint: fingerprint(rawText), handoffId: conversionId, steps: [{ id: 'step-1', title: '할 일', itemIds: [itemId] }] });
        const receipt = {
          version: 1,
          conversionId,
          handoffId: conversionId,
          sourceQuickItemId: sourceTask.id,
          sourceTitle: sourceTask.title,
          sourceMemo: sourceTask.memo,
          sourceFolderId: sourceTask.folderId,
          sourceDate: sourceTask.date,
          flowId,
          itemId,
          flowTitle,
          completionPolicy: 'source-preserved-new-item-open',
          committedAt
        };
        next.quickConversionReceipts = quickConversionReceipts(next).concat(receipt);
        next.lastReceipt = { operation: 'convert-quick-item-to-flow', conversionId, flowId, title: flowTitle, itemCount: 1 };
        message = '빠른 할 일은 그대로 두고 새 Flow로 정리했어요.';
        break;
      }
      case 'add-folder': {
        if (typeof action.title !== 'string' || !action.title.trim()) return reject('invalid-title', '폴더 이름을 입력해 주세요.');
        if (!folderExists(action.parentId)) return reject('invalid-parent', '상위 폴더를 확인해 주세요.');
        if (action.parentId) {
          const parent = next.folders.find(entry => entry.id === action.parentId);
          if (parent && parent.parentId !== null) return reject('folder-depth', '폴더는 두 단계까지만 만들 수 있어요.');
        }
        let number = 1; while (next.folders.some(entry => entry.id === 'folder-' + number)) number += 1;
        next.folders.push({ id: 'folder-' + number, title: action.title.trim(), parentId: action.parentId });
        message = '폴더를 만들었어요.';
        break;
      }
      case 'delete-folder': {
        const folder = next.folders.find(entry => entry.id === action.id);
        if (!folder) return reject('unknown-folder', '폴더를 찾을 수 없어요.');
        next.flows.forEach(entry => { if (entry.folderId === folder.id) entry.folderId = null; });
        next.tasks.forEach(entry => { if (entry.flowId === null && entry.folderId === folder.id) entry.folderId = null; });
        next.folders.forEach(entry => { if (entry.parentId === folder.id) entry.parentId = null; });
        next.folders = next.folders.filter(entry => entry.id !== folder.id);
        message = '폴더만 삭제하고 내용은 미분류로 옮겼어요.';
        break;
      }
      case 'move-folder': {
        if (!folderExists(action.folderId)) return reject('invalid-folder', '이동할 폴더를 확인해 주세요.');
        if (action.kind === 'flow') {
          if (!flow) return reject('unknown-flow', 'Flow를 찾을 수 없어요.');
          if (isTrashedFlow(next, flow.id)) return reject('trashed-flow', '휴지통의 Flow는 복원한 뒤 바꿔 주세요.');
          flow.folderId = action.folderId;
        } else if (action.kind === 'task') {
          if (!task) return reject('unknown-task', '할 일을 찾을 수 없어요.');
          if (isTrashedTask(next, task)) return reject('trashed-task', '휴지통의 항목은 복원한 뒤 바꿔 주세요.');
          if (task.flowId !== null) return reject('flow-item-folder', 'Flow Item은 부모 Flow의 폴더를 따라가요.');
          task.folderId = action.folderId;
        } else return reject('invalid-kind', '이동 대상을 확인해 주세요.');
        message = action.folderId === null ? '미분류로 옮겼어요.' : '폴더를 옮겼어요.';
        break;
      }
      case 'move-to-trash': {
        if (!Array.isArray(next.trashEntries)) next.trashEntries = [];
        const kind = action.kind;
        const id = action.id;
        if (kind !== 'flow' && kind !== 'quick') return reject('invalid-trash-kind', 'Flow 또는 빠른 할 일만 휴지통으로 옮길 수 있어요.');
        if (next.trashEntries.some(entry => entry.kind === kind && entry.id === id)) return { state, changed: false, message: '이미 휴지통에 있어요.' };
        if (kind === 'flow' && !flow) return reject('unknown-flow', 'Flow를 찾을 수 없어요.');
        if (kind === 'quick' && (!task || task.flowId !== null)) return reject('invalid-quick-item', '빠른 할 일을 찾을 수 없어요.');
        next.trashEntries.push({ kind, id, deletedAt: action.now || TODAY + 'T12:00:00.000Z' });
        message = '휴지통으로 옮겼어요.';
        break;
      }
      case 'restore-from-trash': {
        if (!Array.isArray(next.trashEntries)) next.trashEntries = [];
        const index = next.trashEntries.findIndex(entry => entry.kind === action.kind && entry.id === action.id);
        if (index < 0) return { state, changed: false, message: '복원할 항목이 휴지통에 없어요.' };
        next.trashEntries.splice(index, 1);
        message = '휴지통에서 복원했어요.';
        break;
      }
      case 'permanently-delete-from-trash': {
        if (!Array.isArray(next.trashEntries)) next.trashEntries = [];
        if (action.confirmed !== true) return reject('confirmation-required', '영구 삭제 경고를 확인해야 해요.');
        const index = next.trashEntries.findIndex(entry => entry.kind === action.kind && entry.id === action.id);
        if (index < 0) return reject('not-in-trash', '휴지통에 있는 항목만 영구 삭제할 수 있어요.');
        if (action.kind === 'flow') {
          const target = next.flows.find(entry => entry.id === action.id);
          if (!target) return reject('unknown-flow', 'Flow를 찾을 수 없어요.');
          const itemIds = new Set(flowItemIds(target));
          next.tasks = next.tasks.filter(entry => !itemIds.has(entry.id));
          next.flows = next.flows.filter(entry => entry.id !== target.id);
          if (Array.isArray(next.quickConversionReceipts)) next.quickConversionReceipts = next.quickConversionReceipts.filter(receipt => receipt.flowId !== target.id);
        } else if (action.kind === 'quick') {
          next.tasks = next.tasks.filter(entry => entry.id !== action.id || entry.flowId !== null);
        } else return reject('invalid-trash-kind', '삭제 대상을 확인해 주세요.');
        next.trashEntries.splice(index, 1);
        message = '영구 삭제했어요. 이 변경은 되돌릴 수 없어요.';
        break;
      }
      case 'schedule':
        if (!task) return reject('unknown-task', '할 일을 찾을 수 없어요.');
        if (isTrashedTask(next, task)) return reject('trashed-task', '휴지통의 항목은 복원한 뒤 바꿔 주세요.');
        if (action.date !== null && !isDate(action.date)) return reject('invalid-date', '날짜를 확인해 주세요.');
        task.date = action.date;
        message = action.date === null ? '날짜 미정으로 옮겼어요.' : action.date + '에 배치했어요.';
        break;
      case 'complete':
        if (!task || typeof action.done !== 'boolean') return reject('invalid-completion', '완료할 항목을 확인해 주세요.');
        if (isTrashedTask(next, task)) return reject('trashed-task', '휴지통의 항목은 복원한 뒤 바꿔 주세요.');
        task.done = action.done;
        task.completedAt = action.done ? (action.completedAt || TODAY + 'T12:00:00.000Z') : null;
        message = action.done ? '완료했어요.' : '다시 열었어요.';
        break;
      case 'move-occurrence-date': {
        if (action.date !== null && !isDate(action.date)) return reject('invalid-date', '회차 날짜를 확인해 주세요.');
        const source = occurrenceSource(next, action.sourceItemRef, action.occurrenceId, action.originalDate, false);
        if (!source) return reject('invalid-occurrence', '이 회차를 확인할 수 없어 저장하지 않았어요.');
        if (!next.occurrenceOverrides || typeof next.occurrenceOverrides !== 'object') next.occurrenceOverrides = {};
        const current = next.occurrenceOverrides[action.occurrenceId] || {};
        const currentDate = own(current, 'effectiveDate') ? current.effectiveDate : source.originalDate;
        if (currentDate === action.date) return { state, changed: false, message: '이미 같은 날짜에 있어요.' };
        const updated = Object.assign({}, current, { sourceItemRef: source.sourceItemRef, originalDate: source.originalDate });
        if (action.date === source.originalDate) delete updated.effectiveDate;
        else updated.effectiveDate = action.date;
        if (!own(updated, 'effectiveDate') && !own(updated, 'completed')) delete next.occurrenceOverrides[action.occurrenceId];
        else next.occurrenceOverrides[action.occurrenceId] = updated;
        message = action.date === null ? '이 회차를 날짜 미정으로 옮겼어요.' : '이 회차를 ' + action.date + '로 옮겼어요.';
        break;
      }
      case 'complete-occurrence': {
        if (typeof action.done !== 'boolean') return reject('invalid-completion', '회차 완료 상태를 확인해 주세요.');
        const source = occurrenceSource(next, action.sourceItemRef, action.occurrenceId, action.originalDate, false);
        if (!source) return reject('invalid-occurrence', '이 회차를 확인할 수 없어 저장하지 않았어요.');
        if (!next.occurrenceOverrides || typeof next.occurrenceOverrides !== 'object') next.occurrenceOverrides = {};
        const current = next.occurrenceOverrides[action.occurrenceId] || {};
        const currentDone = own(current, 'completed') ? current.completed : source.task.done;
        if (currentDone === action.done) return { state, changed: false, message: action.done ? '이미 완료한 회차예요.' : '이미 열려 있는 회차예요.' };
        const updated = Object.assign({}, current, { sourceItemRef: source.sourceItemRef, originalDate: source.originalDate });
        if (action.done === source.task.done) {
          delete updated.completed;
          delete updated.completedAt;
        } else {
          updated.completed = action.done;
          updated.completedAt = action.done ? (action.completedAt || TODAY + 'T12:00:00.000Z') : null;
        }
        if (!own(updated, 'effectiveDate') && !own(updated, 'completed')) delete next.occurrenceOverrides[action.occurrenceId];
        else next.occurrenceOverrides[action.occurrenceId] = updated;
        message = action.done ? '이 회차를 완료했어요.' : '이 회차를 다시 열었어요.';
        break;
      }
      case 'reorder': {
        const current = viewTaskIds(next, action.context);
        if (!Array.isArray(action.ids) || action.ids.length !== current.length || new Set(action.ids).size !== action.ids.length || action.ids.some(id => !current.includes(id))) return reject('invalid-order', '같은 목록 안에서 순서를 바꿔 주세요.');
        if (JSON.stringify(current) === JSON.stringify(action.ids)) return { state, changed: false, message: '이미 같은 순서예요.' };
        next.orders[action.context] = action.ids.slice();
        message = '개인 실행 순서를 바꿨어요.';
        break;
      }
      case 'commit-personal-plan': {
        if (!flow) return reject('unknown-flow', '개인 편집할 Flow를 찾을 수 없어요.');
        if (isTrashedFlow(next, flow.id)) return reject('trashed-flow', '휴지통의 Flow는 복원한 뒤 편집해 주세요.');
        if (typeof action.title !== 'string' || !action.title.trim()) return reject('invalid-plan-title', '개인 Flow 제목을 입력해 주세요.');
        const ids = flowItemIds(flow);
        if (!Array.isArray(action.items) || action.items.length !== ids.length) return reject('invalid-plan-items', '같은 Flow의 Item만 한 번에 저장해 주세요.');
        const updateById = new Map();
        for (const update of action.items) {
          if (!update || typeof update.id !== 'string' || updateById.has(update.id) || !ids.includes(update.id)) return reject('invalid-plan-items', '같은 Flow의 Item만 한 번에 저장해 주세요.');
          if (typeof update.title !== 'string' || !update.title.trim()) return reject('invalid-item-title', '개인 Item 제목을 입력해 주세요.');
          if (typeof update.memo !== 'string') return reject('invalid-item-memo', '메모는 글로 입력해 주세요.');
          if (update.planDate !== null && !isDate(update.planDate)) return reject('invalid-plan-date', '계획 날짜를 확인해 주세요.');
          updateById.set(update.id, update);
        }
        /* Older v1 envelopes may predate these display-only source snapshots. Capture
           them once before applying any personal override; source fields never change afterwards. */
        if (typeof flow.sourceTitle !== 'string') flow.sourceTitle = flow.title;
        flow.title = action.title.trim();
        ids.forEach(id => {
          const task = next.tasks.find(entry => entry.id === id);
          const update = updateById.get(id);
          if (typeof task.sourceTitle !== 'string') task.sourceTitle = task.title;
          task.title = update.title.trim();
          task.memo = update.memo;
          task.planDate = update.planDate;
        });
        next.lastReceipt = { operation: 'commit-personal-plan', flowId: flow.id, title: flow.title, itemCount: ids.length };
        message = '개인 Flow와 Item 변경을 한 번에 저장했어요.';
        break;
      }
      case 'commit-authoring': {
        const handoff = action.handoff;
        if (!handoff || handoff.contractVersion !== 1 || typeof handoff.handoffId !== 'string') return reject('invalid-handoff', '저장 요청을 확인해 주세요.');
        if (next.flows.some(entry => entry.handoffId === handoff.handoffId)) return { state, changed: false, message: '이미 같은 작성본을 저장했어요.' };
        if (handoff.sourceConfirmed !== true) return reject('source-unconfirmed', '원문을 확인한 뒤 저장해 주세요.');
        if (!folderExists(handoff.folderId)) return reject('invalid-folder', '저장할 폴더를 확인해 주세요.');
        const verified = parseSource(handoff.rawText);
        if (verified.issues.length) return reject('invalid-source', '구조 확인에서 표시된 문제를 먼저 고쳐 주세요.');
        if (verified.sourceFingerprint !== handoff.sourceFingerprint) return reject('source-changed', '확인한 원문과 저장할 원문이 달라요.');
        const suffix = safeId(handoff.handoffId) + '-' + handoff.sourceFingerprint;
        const flowId = 'authored-' + suffix;
        const savedCopyId = 'poc-' + handoff.handoffId;
        const sourceFlowId = 'authoring-' + handoff.draftId;
        if (next.flows.some(entry => entry.id === flowId)) return reject('identity-collision', '작성본 식별자가 겹쳤어요.');
        const steps = [];
        let itemNumber = 0;
        verified.steps.forEach((parsedStep, stepIndex) => {
          const itemIds = [];
          parsedStep.items.forEach(parsedItem => {
            itemNumber += 1;
            const itemId = 'authored-item-' + suffix + '-' + itemNumber;
            itemIds.push(itemId);
            next.tasks.push({ id: itemId, title: parsedItem.title, sourceTitle: parsedItem.title, flowId, folderId: null, date: parsedItem.date, sourceDate: parsedItem.date, time: parsedItem.time || '', memo: '', sourceMemo: '', done: AUTHORING_HANDOFF_EXECUTION_DEFAULTS.done, completedAt: AUTHORING_HANDOFF_EXECUTION_DEFAULTS.completedAt, ref: 'flow-item:' + savedCopyId + ':' + sourceFlowId + ':item-' + itemNumber, sourceLine: parsedItem.sourceLine, sourceProperties: clone(parsedItem.properties), sourceSubchecks: clone(parsedItem.subchecks || []), sourceResources: clone(parsedItem.resources || []), sourceSources: clone(parsedItem.sources || []) });
          });
          if (itemIds.length) steps.push({ id: 'step-' + (stepIndex + 1), title: parsedStep.title, itemIds });
        });
        next.flows.push({ id: flowId, ref: 'saved-flow:' + savedCopyId + ':' + sourceFlowId, savedCopyId, sourceFlowId, origin: 'authoring-handoff', originLabel: '직접 작성', title: verified.title, sourceTitle: verified.title, folderId: handoff.folderId, rawText: handoff.rawText, sourceFingerprint: handoff.sourceFingerprint, handoffId: handoff.handoffId, steps });
        next.lastReceipt = { handoffId: handoff.handoffId, flowId, title: verified.title, itemCount: itemNumber, sourceFingerprint: handoff.sourceFingerprint };
        message = '개인 Flow로 저장했어요.';
        break;
      }
      default: return reject('unsupported-action', '이 동작은 PoC 범위에 없어요.');
    }
    pruneOccurrenceOverrides(next);
    Object.keys(next.orders).forEach(context => {
      const current = viewTaskIds(Object.assign({}, next, { orders: {} }), context);
      const previous = next.orders[context];
      next.orders[context] = previous.filter(id => current.includes(id)).concat(current.filter(id => !previous.includes(id)));
      if (next.orders[context].length === 0) delete next.orders[context];
    });
    if (validate(next).length) return reject('invariant-failed', '변경을 적용하지 못했어요. 원래 상태를 유지했어요.');
    if (JSON.stringify(next) === JSON.stringify(state)) return { state, changed: false, message: '이미 같은 상태예요.' };
    next.revision = state.revision + 1;
    next.updatedAt = action.now || TODAY + 'T12:00:00.000Z';
    return { state: next, changed: true, message };
  }

  function initialEnvelope() { return { version: VERSION, state: seedState(), undo: null }; }

  function transitionEnvelope(envelope, action) {
    const result = apply(envelope.state, action);
    if (!result.changed) return Object.assign({}, result, { envelope });
    const undo = action.type === 'permanently-delete-from-trash' ? null : clone(envelope.state);
    return { changed: true, message: result.message, envelope: { version: VERSION, state: result.state, undo } };
  }

  function undoEnvelope(envelope) {
    if (!envelope.undo) return { changed: false, message: '되돌릴 변경이 없어요.', envelope };
    const restored = clone(envelope.undo);
    restored.updatedAt = TODAY + 'T12:00:00.000Z';
    return { changed: true, message: '마지막 성공 상태로 되돌렸어요.', envelope: { version: VERSION, state: restored, undo: null } };
  }

  function validEnvelope(value) {
    return value && value.version === VERSION && value.state && !validate(value.state).length && (value.undo === null || !validate(value.undo).length);
  }

  function loadEnvelope(storage) {
    let raw;
    try { raw = storage.getItem(STORAGE_KEY); } catch (error) { return { envelope: initialEnvelope(), status: 'read-error', error }; }
    if (raw === null) return { envelope: initialEnvelope(), status: 'seed' };
    try {
      const parsed = JSON.parse(raw);
      if (!validEnvelope(parsed)) return { envelope: initialEnvelope(), status: 'corrupt' };
      return { envelope: parsed, status: 'restored' };
    } catch (error) { return { envelope: initialEnvelope(), status: 'corrupt', error }; }
  }

  function writeEnvelope(storage, envelope) {
    if (!validEnvelope(envelope)) throw new Error('invalid-envelope');
    const bytes = JSON.stringify(envelope);
    const before = storage.getItem(STORAGE_KEY);
    try {
      storage.setItem(STORAGE_KEY, bytes);
      if (storage.getItem(STORAGE_KEY) !== bytes) throw new Error('write-verification-failed');
    } catch (error) {
      try {
        if (before === null) storage.removeItem(STORAGE_KEY);
        else storage.setItem(STORAGE_KEY, before);
      } catch (rollbackError) {
        error.rollbackError = rollbackError;
      }
      throw error;
    }
    return bytes;
  }

  /** Commit the authored Flow and remove its draft as one rollback-safe two-key write. */
  function writeAuthoringCommit(storage, envelope) {
    if (!validEnvelope(envelope)) throw new Error('invalid-envelope');
    const bytes = JSON.stringify(envelope);
    const beforeState = storage.getItem(STORAGE_KEY);
    const beforeDraft = storage.getItem(DRAFT_STORAGE_KEY);
    try {
      storage.setItem(STORAGE_KEY, bytes);
      if (storage.getItem(STORAGE_KEY) !== bytes) throw new Error('write-verification-failed');
      storage.removeItem(DRAFT_STORAGE_KEY);
      if (storage.getItem(DRAFT_STORAGE_KEY) !== null) throw new Error('draft-remove-verification-failed');
    } catch (error) {
      try {
        if (beforeState === null) storage.removeItem(STORAGE_KEY);
        else storage.setItem(STORAGE_KEY, beforeState);
        if (beforeDraft === null) storage.removeItem(DRAFT_STORAGE_KEY);
        else storage.setItem(DRAFT_STORAGE_KEY, beforeDraft);
        if (storage.getItem(STORAGE_KEY) !== beforeState || storage.getItem(DRAFT_STORAGE_KEY) !== beforeDraft) {
          throw new Error('authoring-commit-rollback-verification-failed');
        }
      } catch (rollbackError) {
        error.rollbackError = rollbackError;
      }
      throw error;
    }
    return bytes;
  }

  function initialCreatorDraftLibrary() {
    return { version: CREATOR_DRAFT_LIBRARY_VERSION, revision: 0, drafts: [], undo: null };
  }

  function creatorDraftName(rawText) {
    const lines = String(rawText || '').split(/\r\n|\r|\n/u);
    const heading = lines.find(line => /^#\s+\S/u.test(line));
    if (heading) return heading.replace(/^#\s+/u, '').trim().slice(0, 100);
    const first = lines.find(line => line.trim().length > 0);
    if (!first) return '제목 없는 초안';
    return first.trim().replace(/^#{1,6}\s*/u, '').replace(/^-\s*(?:\[[ xX]\]\s*)?/u, '').trim().slice(0, 100) || '제목 없는 초안';
  }

  function creatorDraftSourceLabel(rawText) {
    const candidates = String(rawText || '').match(/https?:\/\/[^\s<>"'`)\]}]+/giu) || [];
    for (const candidate of candidates) {
      try {
        const parsed = new URL(candidate);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return candidate;
      } catch (error) {
        // Keep looking for the first valid exact-text URL candidate.
      }
    }
    return '직접 작성한 원문';
  }

  function creatorDraftCopyName(library, sourceName) {
    const names = new Set(library.drafts.map(draft => draft.title));
    const base = sourceName.replace(/^사본 \d+ · /u, '');
    let ordinal = 1;
    while (true) {
      const prefix = '사본 ' + ordinal + ' · ';
      const candidate = prefix + base.slice(0, 100 - prefix.length);
      if (!names.has(candidate)) return candidate;
      ordinal += 1;
    }
  }

  function validCreatorDraft(value) {
    if (!value || typeof value !== 'object') return false;
    const allowedKeys = new Set(['draftId', 'owner', 'title', 'rawText', 'templateId', 'sourceFingerprint', 'status', 'recordRevision', 'createdAt', 'updatedAt', 'archivedAt', 'clonedFrom']);
    if (Object.keys(value).some(key => !allowedKeys.has(key))) return false;
    if (typeof value.draftId !== 'string' || !value.draftId) return false;
    if (value.owner !== 'creator') return false;
    if (typeof value.title !== 'string' || !value.title.trim() || value.title !== value.title.trim() || value.title.length > 100) return false;
    if (typeof value.rawText !== 'string' || !value.rawText.trim()) return false;
    if (value.templateId !== null && !templateById(value.templateId)) return false;
    if (typeof value.sourceFingerprint !== 'string' || value.sourceFingerprint !== fingerprint(value.rawText)) return false;
    if (value.status !== 'active' && value.status !== 'archived') return false;
    if (typeof value.createdAt !== 'string' || !value.createdAt || typeof value.updatedAt !== 'string' || !value.updatedAt) return false;
    if (value.status === 'active' && own(value, 'archivedAt')) return false;
    if (value.status === 'archived' && (typeof value.archivedAt !== 'string' || !value.archivedAt)) return false;
    if (!Number.isSafeInteger(value.recordRevision) || value.recordRevision < 1) return false;
    if (own(value, 'clonedFrom')) {
      if (!value.clonedFrom || typeof value.clonedFrom !== 'object') return false;
      if (Object.keys(value.clonedFrom).some(key => key !== 'draftId' && key !== 'recordRevision')) return false;
      if (Object.keys(value.clonedFrom).length !== 2) return false;
      if (typeof value.clonedFrom.draftId !== 'string' || !value.clonedFrom.draftId || value.clonedFrom.draftId === value.draftId) return false;
      if (!Number.isSafeInteger(value.clonedFrom.recordRevision) || value.clonedFrom.recordRevision < 1) return false;
    }
    return true;
  }

  function validCreatorDraftSnapshot(value) {
    if (!value || typeof value !== 'object') return false;
    if (Object.keys(value).some(key => key !== 'revision' && key !== 'drafts')) return false;
    if (!Number.isSafeInteger(value.revision) || value.revision < 0 || !Array.isArray(value.drafts)) return false;
    if (!value.drafts.every(validCreatorDraft)) return false;
    if (new Set(value.drafts.map(draft => draft.draftId)).size !== value.drafts.length) return false;
    return value.drafts.every(draft => {
      if (!draft.clonedFrom) return true;
      const source = value.drafts.find(candidate => candidate.draftId === draft.clonedFrom.draftId);
      return Boolean(source && source.recordRevision >= draft.clonedFrom.recordRevision);
    });
  }

  function validCreatorDraftLibrary(value) {
    if (!value || typeof value !== 'object' || value.version !== CREATOR_DRAFT_LIBRARY_VERSION) return false;
    const allowedKeys = new Set(['version', 'revision', 'drafts', 'undo']);
    if (Object.keys(value).some(key => !allowedKeys.has(key))) return false;
    if (!validCreatorDraftSnapshot({ revision: value.revision, drafts: value.drafts })) return false;
    return value.undo === null || validCreatorDraftSnapshot(value.undo);
  }

  function creatorDraftById(library, id) {
    return library && Array.isArray(library.drafts) ? library.drafts.find(draft => draft.draftId === id) || null : null;
  }

  function listCreatorDrafts(library, options) {
    if (!validCreatorDraftLibrary(library)) return [];
    const settings = options || {};
    const archived = settings.archived === true;
    const query = String(settings.query || '').trim().toLocaleLowerCase('ko-KR');
    return library.drafts
      .filter(draft => (draft.status === 'archived') === archived)
      .filter(draft => !query || (draft.title + '\n' + creatorDraftSourceLabel(draft.rawText) + '\n' + draft.rawText).toLocaleLowerCase('ko-KR').includes(query))
      .slice()
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.draftId.localeCompare(right.draftId))
      .map(clone);
  }

  function creatorDraftTransitionResult(library, drafts, message, draftId) {
    return {
      changed: true,
      message,
      draftId: draftId || null,
      library: {
        version: CREATOR_DRAFT_LIBRARY_VERSION,
        revision: library.revision + 1,
        drafts,
        undo: { revision: library.revision, drafts: clone(library.drafts) }
      }
    };
  }

  function creatorDraftNoChange(library, message, error) {
    return { changed: false, message, error: error || null, draftId: null, library };
  }

  function transitionCreatorDraftLibrary(library, action) {
    if (!validCreatorDraftLibrary(library)) return creatorDraftNoChange(library, '초안 보관함이 손상되어 변경하지 않았어요.', 'invalid-library');
    if (!action || typeof action.type !== 'string') return creatorDraftNoChange(library, '초안 변경 요청을 확인할 수 없어요.', 'invalid-action');
    const now = typeof action.now === 'string' && action.now ? action.now : TODAY + 'T12:00:00.000Z';
    if (action.type === 'undo') {
      if (!library.undo) return creatorDraftNoChange(library, '되돌릴 초안 변경이 없어요.');
      return {
        changed: true,
        message: '마지막 초안 변경을 되돌렸어요.',
        draftId: null,
        library: {
          version: CREATOR_DRAFT_LIBRARY_VERSION,
          revision: library.revision + 1,
          drafts: clone(library.undo.drafts),
          undo: null
        }
      };
    }

    if (action.type === 'save') {
      const id = typeof action.draftId === 'string' ? action.draftId : '';
      const rawText = typeof action.rawText === 'string' ? action.rawText : '';
      if (!id || !rawText.trim()) return creatorDraftNoChange(library, '저장할 원문을 입력해 주세요.', 'invalid-draft');
      const existingIndex = library.drafts.findIndex(draft => draft.draftId === id);
      const templateId = action.templateId === undefined ? null : action.templateId;
      if (templateId !== null && !templateById(templateId)) return creatorDraftNoChange(library, '작성 틀 정보를 확인할 수 없어 저장하지 않았어요.', 'invalid-template');
      if (existingIndex >= 0) {
        const existing = library.drafts[existingIndex];
        if (existing.status === 'archived') return creatorDraftNoChange(library, '보관한 초안은 복원한 뒤 변경할 수 있어요.', 'archived-draft');
        if (action.expectedRevision !== undefined && action.expectedRevision !== existing.recordRevision) return creatorDraftNoChange(library, '다른 변경이 먼저 저장되어 초안을 다시 열어야 해요.', 'stale-draft');
        const title = action.displayName === undefined ? existing.title : String(action.displayName).trim();
        if (!title || title.length > 100) return creatorDraftNoChange(library, '초안 이름을 확인해 주세요.', 'invalid-name');
        const sourceFingerprint = fingerprint(rawText);
        if (existing.title === title && existing.rawText === rawText && existing.templateId === templateId && existing.sourceFingerprint === sourceFingerprint) {
          return creatorDraftNoChange(library, '이미 같은 초안이에요.');
        }
        const drafts = clone(library.drafts);
        drafts[existingIndex] = Object.assign({}, existing, { title, rawText, templateId, sourceFingerprint, updatedAt: now, recordRevision: existing.recordRevision + 1 });
        return creatorDraftTransitionResult(library, drafts, '초안 변경을 저장했어요.', id);
      }
      if (action.expectedRevision !== undefined && action.expectedRevision !== null) return creatorDraftNoChange(library, '새 초안의 버전 정보가 올바르지 않아요.', 'invalid-revision');
      const title = action.displayName === undefined ? creatorDraftName(rawText) : String(action.displayName).trim();
      if (!title || title.length > 100) return creatorDraftNoChange(library, '초안 이름을 확인해 주세요.', 'invalid-name');
      const draft = { draftId: id, owner: 'creator', title, rawText, templateId, sourceFingerprint: fingerprint(rawText), status: 'active', recordRevision: 1, createdAt: now, updatedAt: now };
      const drafts = library.drafts.concat([draft]);
      return creatorDraftTransitionResult(library, drafts, '제작 초안으로 저장했어요. 개인공간이나 공개 화면에는 추가되지 않았습니다.', id);
    }

    const index = library.drafts.findIndex(draft => draft.draftId === action.draftId);
    if (index < 0) return creatorDraftNoChange(library, '초안을 찾을 수 없어 변경하지 않았어요.', 'missing-draft');
    const current = library.drafts[index];
    if (action.expectedRevision !== undefined && action.expectedRevision !== current.recordRevision) return creatorDraftNoChange(library, '다른 변경이 먼저 저장되어 목록을 다시 확인해 주세요.', 'stale-draft');

    if (action.type === 'rename') {
      const title = typeof action.displayName === 'string' ? action.displayName.trim() : '';
      if (!title || title.length > 100) return creatorDraftNoChange(library, '초안 이름을 확인해 주세요.', 'invalid-name');
      if (title === current.title) return creatorDraftNoChange(library, '이미 같은 이름이에요.');
      const drafts = clone(library.drafts);
      drafts[index] = Object.assign({}, current, { title, updatedAt: now, recordRevision: current.recordRevision + 1 });
      return creatorDraftTransitionResult(library, drafts, '초안 이름을 바꿨어요. 원문 제목은 바뀌지 않습니다.', current.draftId);
    }

    if (action.type === 'clone') {
      const newId = typeof action.newDraftId === 'string' ? action.newDraftId : '';
      if (!newId || library.drafts.some(draft => draft.draftId === newId)) return creatorDraftNoChange(library, '복사본 식별자를 만들지 못했어요.', 'invalid-clone-id');
      const draft = Object.assign({}, current, {
        draftId: newId,
        title: creatorDraftCopyName(library, current.title),
        owner: 'creator',
        sourceFingerprint: fingerprint(current.rawText),
        status: 'active',
        createdAt: now,
        updatedAt: now,
        recordRevision: 1,
        clonedFrom: { draftId: current.draftId, recordRevision: current.recordRevision }
      });
      delete draft.archivedAt;
      return creatorDraftTransitionResult(library, library.drafts.concat([draft]), '초안을 복제했어요.', newId);
    }

    if (action.type === 'archive') {
      if (current.status === 'archived') return creatorDraftNoChange(library, '이미 보관함에 있어요.');
      const drafts = clone(library.drafts);
      drafts[index] = Object.assign({}, current, { status: 'archived', archivedAt: now, updatedAt: now, recordRevision: current.recordRevision + 1 });
      return creatorDraftTransitionResult(library, drafts, '초안을 보관함으로 옮겼어요.', current.draftId);
    }

    if (action.type === 'restore') {
      if (current.status === 'active') return creatorDraftNoChange(library, '이미 작성 중 목록에 있어요.');
      const drafts = clone(library.drafts);
      drafts[index] = Object.assign({}, current, { status: 'active', updatedAt: now, recordRevision: current.recordRevision + 1 });
      delete drafts[index].archivedAt;
      return creatorDraftTransitionResult(library, drafts, '초안을 작성 중 목록으로 복원했어요.', current.draftId);
    }
    return creatorDraftNoChange(library, '지원하지 않는 초안 변경이에요.', 'unsupported-action');
  }

  function loadCreatorDraftLibrary(storage) {
    let raw;
    try { raw = storage.getItem(CREATOR_DRAFT_STORAGE_KEY); } catch (error) { return { library: initialCreatorDraftLibrary(), status: 'read-error', error }; }
    if (raw === null) return { library: initialCreatorDraftLibrary(), status: 'empty' };
    try {
      const parsed = JSON.parse(raw);
      if (!validCreatorDraftLibrary(parsed)) return { library: initialCreatorDraftLibrary(), status: 'corrupt' };
      return { library: parsed, status: 'restored' };
    } catch (error) { return { library: initialCreatorDraftLibrary(), status: 'corrupt', error }; }
  }

  function writeCreatorDraftLibrary(storage, library) {
    if (!validCreatorDraftLibrary(library)) throw new Error('invalid-creator-draft-library');
    const bytes = JSON.stringify(library);
    const before = storage.getItem(CREATOR_DRAFT_STORAGE_KEY);
    try {
      storage.setItem(CREATOR_DRAFT_STORAGE_KEY, bytes);
      if (storage.getItem(CREATOR_DRAFT_STORAGE_KEY) !== bytes) throw new Error('creator-draft-write-verification-failed');
    } catch (error) {
      try {
        if (before === null) storage.removeItem(CREATOR_DRAFT_STORAGE_KEY);
        else storage.setItem(CREATOR_DRAFT_STORAGE_KEY, before);
        if (storage.getItem(CREATOR_DRAFT_STORAGE_KEY) !== before) throw new Error('creator-draft-rollback-verification-failed');
      } catch (rollbackError) { error.rollbackError = rollbackError; }
      throw error;
    }
    return bytes;
  }

  function validAuthoringDraft(value) {
    if (!value || value.version !== VERSION || typeof value.draftId !== 'string' || !value.draftId || typeof value.rawText !== 'string') return false;
    if (value.templateId !== null && !templateById(value.templateId)) return false;
    if (value.folderId !== null && typeof value.folderId !== 'string') return false;
    if (value.creatorDraftId !== undefined && value.creatorDraftId !== null && (typeof value.creatorDraftId !== 'string' || !value.creatorDraftId)) return false;
    if (value.creatorDraftRevision !== undefined && value.creatorDraftRevision !== null && (!Number.isSafeInteger(value.creatorDraftRevision) || value.creatorDraftRevision < 1)) return false;
    if ((value.creatorDraftId === null || value.creatorDraftId === undefined) && value.creatorDraftRevision !== null && value.creatorDraftRevision !== undefined) return false;
    const allowedKeys = new Set(['version', 'draftId', 'rawText', 'templateId', 'folderId', 'creatorDraftId', 'creatorDraftRevision']);
    if (Object.keys(value).some(key => !allowedKeys.has(key))) return false;
    return true;
  }

  function authoringDraftBytes(authoring) {
    const draft = {
      version: VERSION,
      draftId: authoring && authoring.draftId,
      rawText: authoring && authoring.rawText,
      templateId: authoring && authoring.templateId === undefined ? null : authoring.templateId,
      folderId: authoring && authoring.folderId === undefined ? null : authoring.folderId,
      creatorDraftId: authoring && authoring.creatorDraftId === undefined ? null : authoring.creatorDraftId,
      creatorDraftRevision: authoring && authoring.creatorDraftRevision === undefined ? null : authoring.creatorDraftRevision
    };
    if (!validAuthoringDraft(draft)) throw new Error('invalid-authoring-draft');
    return JSON.stringify(draft);
  }

  function loadAuthoringDraft(storage) {
    let raw;
    try { raw = storage.getItem(DRAFT_STORAGE_KEY); } catch (error) { return { authoring: null, status: 'read-error', error }; }
    if (raw === null) return { authoring: null, status: 'empty' };
    try {
      const parsed = JSON.parse(raw);
      if (!validAuthoringDraft(parsed)) return { authoring: null, status: 'corrupt' };
      return {
        authoring: {
          draftId: parsed.draftId,
          rawText: parsed.rawText,
          templateId: parsed.templateId,
          templatePickerOpen: false,
          sourceConfirmed: false,
          folderId: parsed.folderId,
          creatorDraftId: parsed.creatorDraftId === undefined ? null : parsed.creatorDraftId,
          creatorDraftRevision: parsed.creatorDraftRevision === undefined ? null : parsed.creatorDraftRevision
        },
        status: 'restored'
      };
    } catch (error) { return { authoring: null, status: 'corrupt', error }; }
  }

  /* K1-A helper-only transaction. Ordinary typing keeps its existing writer. */
  function restoreAuthoringDraftCandidate(storage, beforeBytes, candidateBytes) {
    try {
      const current = storage.getItem(DRAFT_STORAGE_KEY);
      if (current === beforeBytes) return { status: 'restored', rollbackWriteCount: 0 };
      if (current !== candidateBytes) return { status: 'recovery-required', reason: 'draft-changed', rollbackWriteCount: 0 };
      if (beforeBytes === null) storage.removeItem(DRAFT_STORAGE_KEY);
      else storage.setItem(DRAFT_STORAGE_KEY, beforeBytes);
      if (storage.getItem(DRAFT_STORAGE_KEY) !== beforeBytes) return { status: 'recovery-required', reason: 'rollback-readback', rollbackWriteCount: 1 };
      return { status: 'restored', rollbackWriteCount: 1 };
    } catch (error) {
      return { status: 'recovery-required', reason: 'rollback-failed', error };
    }
  }

  function writeAuthoringDraftCandidate(storage, authoring, beforeBytes) {
    let candidateBytes;
    try { candidateBytes = authoringDraftBytes(authoring); }
    catch (error) { return { status: 'failed', reason: 'invalid-draft', error }; }
    let current;
    try { current = storage.getItem(DRAFT_STORAGE_KEY); }
    catch (error) { return { status: 'failed', reason: 'draft-read-failed', error }; }
    if (current !== beforeBytes) return { status: 'stale', reason: 'draft-changed' };
    if (current === candidateBytes) return { status: 'success', candidateBytes, targetWriteCount: 0 };
    try {
      storage.setItem(DRAFT_STORAGE_KEY, candidateBytes);
      if (storage.getItem(DRAFT_STORAGE_KEY) !== candidateBytes) throw new Error('draft-write-verification-failed');
      return { status: 'success', candidateBytes, targetWriteCount: 1 };
    } catch (error) {
      const rollback = restoreAuthoringDraftCandidate(storage, beforeBytes, candidateBytes);
      return { status: rollback.status === 'restored' ? 'failed' : 'recovery-required', reason: 'draft-write-failed', error, rollback, candidateBytes };
    }
  }

  function writeAuthoringDraft(storage, authoring) {
    const bytes = authoringDraftBytes(authoring);
    const before = storage.getItem(DRAFT_STORAGE_KEY);
    try {
      storage.setItem(DRAFT_STORAGE_KEY, bytes);
      if (storage.getItem(DRAFT_STORAGE_KEY) !== bytes) throw new Error('draft-write-verification-failed');
    } catch (error) {
      try {
        if (before === null) storage.removeItem(DRAFT_STORAGE_KEY);
        else storage.setItem(DRAFT_STORAGE_KEY, before);
      } catch (rollbackError) {
        error.rollbackError = rollbackError;
      }
      throw error;
    }
    return bytes;
  }

  function clearAuthoringDraft(storage) {
    const before = storage.getItem(DRAFT_STORAGE_KEY);
    try {
      storage.removeItem(DRAFT_STORAGE_KEY);
      if (storage.getItem(DRAFT_STORAGE_KEY) !== null) throw new Error('draft-remove-verification-failed');
    } catch (error) {
      try {
        if (before === null) storage.removeItem(DRAFT_STORAGE_KEY);
        else storage.setItem(DRAFT_STORAGE_KEY, before);
      } catch (rollbackError) {
        error.rollbackError = rollbackError;
      }
      throw error;
    }
  }

  /** Save a CreatorDraft revision and its open working-draft pointer as one rollback-safe two-key write. */
  function writeCreatorDraftCommit(storage, library, authoring) {
    if (!validCreatorDraftLibrary(library)) throw new Error('invalid-creator-draft-library');
    const libraryBytes = JSON.stringify(library);
    const draftBytes = authoringDraftBytes(authoring);
    const beforeLibrary = storage.getItem(CREATOR_DRAFT_STORAGE_KEY);
    const beforeDraft = storage.getItem(DRAFT_STORAGE_KEY);
    try {
      storage.setItem(CREATOR_DRAFT_STORAGE_KEY, libraryBytes);
      if (storage.getItem(CREATOR_DRAFT_STORAGE_KEY) !== libraryBytes) throw new Error('creator-draft-write-verification-failed');
      storage.setItem(DRAFT_STORAGE_KEY, draftBytes);
      if (storage.getItem(DRAFT_STORAGE_KEY) !== draftBytes) throw new Error('draft-write-verification-failed');
    } catch (error) {
      try {
        if (beforeLibrary === null) storage.removeItem(CREATOR_DRAFT_STORAGE_KEY);
        else storage.setItem(CREATOR_DRAFT_STORAGE_KEY, beforeLibrary);
        if (beforeDraft === null) storage.removeItem(DRAFT_STORAGE_KEY);
        else storage.setItem(DRAFT_STORAGE_KEY, beforeDraft);
        if (storage.getItem(CREATOR_DRAFT_STORAGE_KEY) !== beforeLibrary || storage.getItem(DRAFT_STORAGE_KEY) !== beforeDraft) {
          throw new Error('creator-draft-commit-rollback-verification-failed');
        }
      } catch (rollbackError) { error.rollbackError = rollbackError; }
      throw error;
    }
    return { libraryBytes, draftBytes };
  }

  function sourceUpdateRuntimeReady() {
    return Boolean(
      sourceUpdateRuntime
      && sourceUpdateRuntime.PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY === SOURCE_CANDIDATE_STORAGE_KEY
      && typeof sourceUpdateRuntime.createPersonalWorkspacePocSourceCandidateStore === 'function'
      && typeof sourceUpdateRuntime.isPersonalWorkspacePocSourceCandidateStore === 'function'
      && typeof sourceUpdateRuntime.createPersonalWorkspacePocCurrentSourceFromAuthoredFlow === 'function'
      && typeof sourceUpdateRuntime.createPersonalWorkspacePocLocalFixtureEnvelope === 'function'
      && typeof sourceUpdateRuntime.stagePersonalWorkspacePocSourceCandidate === 'function'
      && typeof sourceUpdateRuntime.resolvePersonalWorkspacePocSourceCandidateChange === 'function'
      && typeof sourceUpdateRuntime.clearPersonalWorkspacePocSourceCandidateChangeResolution === 'function'
      && typeof sourceUpdateRuntime.deferPersonalWorkspacePocSourceCandidate === 'function'
      && typeof sourceUpdateRuntime.applyPersonalWorkspacePocSourceCandidate === 'function'
      && typeof sourceUpdateRuntime.undoPersonalWorkspacePocSourceCandidate === 'function'
      && typeof safeValidationExamplesRuntime.fingerprintPersonalWorkspacePocAuthoringSource === 'function'
    );
  }

  function initialSourceCandidateStore(now) {
    if (!sourceUpdateRuntimeReady()) return null;
    try {
      return sourceUpdateRuntime.createPersonalWorkspacePocSourceCandidateStore(now || SOURCE_UPDATE_FIXTURE_AT);
    } catch (error) {
      return null;
    }
  }

  function canonicalStandaloneFlowRef(savedCopyId, flowId) {
    return 'saved-flow:' + encodeURIComponent(savedCopyId) + ':' + encodeURIComponent(flowId);
  }

  function canonicalStandaloneItemRef(savedCopyId, flowId, itemId) {
    return 'flow-item:' + encodeURIComponent(savedCopyId) + ':' + encodeURIComponent(flowId) + ':' + encodeURIComponent(itemId);
  }

  function standaloneSourceItemId(flow, task, fallbackIndex) {
    const prefix = 'flow-item:' + encodeURIComponent(flow.savedCopyId) + ':' + encodeURIComponent(flow.sourceFlowId) + ':';
    if (typeof task.ref === 'string' && task.ref.indexOf(prefix) === 0) {
      try {
        const decoded = decodeURIComponent(task.ref.slice(prefix.length));
        if (decoded) return decoded;
      } catch (error) { /* Fall through to a deterministic local identity. */ }
    }
    return 'item-' + (fallbackIndex + 1);
  }

  /**
   * Adapts only a saved authoring handoff. Personal title, memo, schedule and
   * completion fields are intentionally excluded from this immutable source view.
   */
  function standaloneAuthoredFlowForSourceUpdate(state, flowId) {
    if (!sourceUpdateRuntimeReady() || !state || !Array.isArray(state.flows) || !Array.isArray(state.tasks)) return null;
    const flow = state.flows.find(entry => entry.id === flowId);
    if (!flow || flow.origin !== 'authoring-handoff' || typeof flow.rawText !== 'string' || !flow.handoffId || !flow.savedCopyId || !flow.sourceFlowId) return null;
    const sourceFingerprint = safeValidationExamplesRuntime.fingerprintPersonalWorkspacePocAuthoringSource(flow.rawText);
    if (typeof sourceFingerprint !== 'string' || !sourceFingerprint) return null;
    const items = [];
    const sections = [];
    let sourceOrder = 0;
    (flow.steps || []).forEach((step, stepIndex) => {
      const sectionId = String(step.id || ('step-' + (stepIndex + 1)));
      const sectionTitle = String(step.title || ('단계 ' + (stepIndex + 1)));
      sections.push({ sectionId, title: sectionTitle, sourceOrder: stepIndex, titleOwner: 'authoring', editCapability: 'poc-shadow' });
      (step.itemIds || []).forEach(taskId => {
        const task = state.tasks.find(entry => entry.id === taskId && entry.flowId === flow.id);
        if (!task) return;
        const itemId = standaloneSourceItemId(flow, task, sourceOrder);
        const sourceProperties = task.sourceProperties && typeof task.sourceProperties === 'object' ? task.sourceProperties : {};
        const item = {
          ref: canonicalStandaloneItemRef(flow.savedCopyId, flow.sourceFlowId, itemId),
          savedCopyId: flow.savedCopyId,
          flowId: flow.sourceFlowId,
          itemId,
          title: typeof task.sourceTitle === 'string' && task.sourceTitle ? task.sourceTitle : task.title,
          sectionId,
          sectionTitle,
          sourceOrder
        };
        if (typeof sourceProperties['설명'] === 'string' && sourceProperties['설명']) item.description = sourceProperties['설명'];
        if (typeof task.sourceDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(task.sourceDate)) item.sourceDate = task.sourceDate;
        const timing = [sourceProperties['상대 날짜'], task.time, sourceProperties['시간대']].filter(Boolean).join(' · ');
        if (timing) item.sourceTimingLabel = timing;
        items.push(item);
        sourceOrder += 1;
      });
    });
    if (!items.length) return null;
    const sourceTitleValue = typeof flow.sourceTitle === 'string' && flow.sourceTitle ? flow.sourceTitle : flow.title;
    const stableSuffix = safeId(flow.handoffId) + '-' + sourceFingerprint.replace(/[^a-zA-Z0-9_-]/g, '-');
    return {
      ref: canonicalStandaloneFlowRef(flow.savedCopyId, flow.sourceFlowId),
      savedCopyId: flow.savedCopyId,
      flowId: flow.sourceFlowId,
      sourceSlug: flow.sourceFlowId,
      title: sourceTitleValue,
      origin: 'authoring-handoff',
      sections,
      items,
      authoring: {
        source: 'text-authoring-poc-v1',
        handoffId: flow.handoffId,
        documentId: 'standalone-document-' + stableSuffix,
        revisionId: 'standalone-revision-' + stableSuffix,
        parseResultId: 'standalone-parse-' + stableSuffix,
        sourceSnapshotId: 'standalone-snapshot-' + stableSuffix,
        rawText: flow.rawText,
        sourceFingerprint,
        committedAt: SOURCE_UPDATE_FIXTURE_AT
      }
    };
  }

  function standaloneLocalIncomingSource(rawText) {
    const suffix = ' · 새 원문 예시';
    let changed = false;
    let next = String(rawText || '').replace(/^(#\s+)([^\r\n]+)$/mu, (match, prefix, title) => {
      if (title.endsWith(suffix)) return match;
      changed = true;
      return prefix + title + suffix;
    });
    next = next.replace(/^(-\s*\[[ xX]\]\s*)([^\r\n]+)$/mu, (match, prefix, title) => {
      if (title.endsWith(suffix)) return match;
      changed = true;
      return prefix + title + suffix;
    });
    return changed ? next : String(rawText || '') + (String(rawText || '').endsWith('\n') ? '' : '\n') + '- [ ] 새 원문 예시 항목';
  }

  /** Source-only context. Never feed composeSourceCandidateState/personal display into this reader. */
  function readLocalSourcePracticeContext(store, state, flowId) {
    if (!sourceUpdateRuntimeReady()) return { ok: false, reason: 'runtime-missing' };
    if (!sourceUpdateRuntime.isPersonalWorkspacePocSourceCandidateStore(store)) return { ok: false, reason: 'invalid-store' };
    const authoredFlow = standaloneAuthoredFlowForSourceUpdate(state, flowId);
    if (!authoredFlow || quickConversionReceipts(state).some(entry => entry.flowId === flowId)) return { ok: false, reason: 'unsupported-origin' };
    const base = sourceUpdateRuntime.createPersonalWorkspacePocCurrentSourceFromAuthoredFlow(authoredFlow);
    if (!base) return { ok: false, reason: 'invalid-current-source' };
    const effective = store.effectiveVersions[authoredFlow.ref];
    const current = effective ? Object.assign({}, effective.sourceRevision, { projectedFlow: effective.projectedFlow }) : base;
    const target = { origin: 'authoring-handoff', flowRef: authoredFlow.ref, savedCopyId: authoredFlow.savedCopyId, flowId: authoredFlow.flowId, handoffId: authoredFlow.authoring.handoffId };
    const catalog = sourceUpdateRuntime.inspectPersonalWorkspacePocSourceCandidateCatalog({ target, current, store });
    return catalog.ok ? { ok: true, authoredFlow, current, catalog } : catalog;
  }

  /** Explicitly resume exactly one existing record; no local fixture generation. */
  function resumeLocalSourceCandidateReview(store, state, flowId, candidateId, now) {
    const context = readLocalSourcePracticeContext(store, state, flowId);
    if (!context.ok) return context;
    const record = context.catalog.candidates.find(entry => entry.candidateId === candidateId);
    if (!record) return { ok: false, reason: 'not-found' };
    const candidate = store.envelopes[candidateId];
    if (record.stale || record.status === 'applied') return { ok: true, code: record.stale ? 'stale-source' : 'already-applied', candidate, current: context.current, store };
    const staged = sourceUpdateRuntime.stagePersonalWorkspacePocSourceCandidate(store, candidate, context.current, now);
    return ['staged', 'resumed', 'already-staged', 'already-applied'].includes(staged.code)
      ? { ok: true, code: staged.code, candidate, current: context.current, store: staged.store }
      : { ok: false, reason: staged.code };
  }

  /** Reconcile only in-memory review edits against the durable snapshot they began from.
   * Conflicting records are not chosen, overwritten or discarded. No IO or source synthesis.
   */
  function mergeLocalSourcePracticeStore(durable, working, base) {
    if (!sourceUpdateRuntimeReady() || ![durable, working, base].every(sourceUpdateRuntime.isPersonalWorkspacePocSourceCandidateStore)) return { ok: false, reason: 'invalid-store' };
    const next = clone(durable);
    const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    for (const group of ['envelopes', 'reviews']) {
      for (const key of new Set(Object.keys(base[group]).concat(Object.keys(working[group])))) {
        if (equal(working[group][key], base[group][key])) continue;
        if (!equal(durable[group][key], base[group][key]) && !equal(durable[group][key], working[group][key])) return { ok: false, reason: 'conflicting-source-practice-record' };
        if (working[group][key] === undefined) return { ok: false, reason: 'removed-source-practice-record' };
        Object.defineProperty(next[group], key, { value: clone(working[group][key]), enumerable: true, configurable: true, writable: true });
      }
    }
    next.revision = Math.max(durable.revision, working.revision);
    next.updatedAt = working.updatedAt > durable.updatedAt ? working.updatedAt : durable.updatedAt;
    return sourceUpdateRuntime.isPersonalWorkspacePocSourceCandidateStore(next)
      ? { ok: true, store: next } : { ok: false, reason: 'invalid-merged-source-practice' };
  }

  function prepareLocalSourceCandidateReview(store, state, flowId, options) {
    if (!sourceUpdateRuntimeReady()) return { ok: false, reason: 'runtime-missing' };
    if (!sourceUpdateRuntime.isPersonalWorkspacePocSourceCandidateStore(store)) return { ok: false, reason: 'invalid-store' };
    const context = readLocalSourcePracticeContext(store, state, flowId);
    if (!context.ok) return context;
    const authoredFlow = context.authoredFlow;
    const settings = options || {};
    let fixture;
    try {
      fixture = sourceUpdateRuntime.createPersonalWorkspacePocLocalFixtureEnvelope(authoredFlow, {
        current: context.current,
        incomingRawText: typeof settings.incomingRawText === 'string' ? settings.incomingRawText : standaloneLocalIncomingSource(context.current.rawText),
        fixtureId: SOURCE_UPDATE_FIXTURE_ID,
        createdAt: settings.createdAt || SOURCE_UPDATE_FIXTURE_AT
      });
    } catch (error) {
      return { ok: false, reason: 'invalid-candidate', error };
    }
    if (!fixture || !fixture.ok) return { ok: false, reason: fixture ? fixture.reason : 'invalid-candidate' };
    const staged = sourceUpdateRuntime.stagePersonalWorkspacePocSourceCandidate(
      store,
      fixture.envelope,
      fixture.current,
      settings.now || fixture.envelope.createdAt
    );
    if (!['staged', 'resumed', 'already-staged', 'already-applied'].includes(staged.code)) {
      return { ok: false, reason: staged.code, candidate: fixture.envelope, current: fixture.current, store: staged.store };
    }
    return { ok: true, code: staged.code, candidate: fixture.envelope, current: fixture.current, store: staged.store, authoredFlow };
  }

  function resolveLocalSourceCandidateChange(store, input) {
    if (!sourceUpdateRuntimeReady()) return { changed: false, code: 'runtime-missing', store };
    if (input.resolution === 'later') {
      return sourceUpdateRuntime.clearPersonalWorkspacePocSourceCandidateChangeResolution(store, {
        candidateId: input.candidateId,
        changeId: input.changeId,
        now: input.now
      });
    }
    return sourceUpdateRuntime.resolvePersonalWorkspacePocSourceCandidateChange(store, input);
  }

  function deferLocalSourceCandidate(store, candidateId, now) {
    if (!sourceUpdateRuntimeReady()) return { changed: false, code: 'runtime-missing', store };
    return sourceUpdateRuntime.deferPersonalWorkspacePocSourceCandidate(store, { candidateId, now });
  }

  function applyLocalSourceCandidate(store, state, flowId, candidateId, now) {
    if (!sourceUpdateRuntimeReady()) return { changed: false, code: 'runtime-missing', store };
    const context = readLocalSourcePracticeContext(store, state, flowId);
    if (!context.ok || !context.catalog.candidates.some(entry => entry.candidateId === candidateId)) return { changed: false, code: 'stale-source', store };
    return sourceUpdateRuntime.applyPersonalWorkspacePocSourceCandidate(store, { candidateId, current: context.current, now });
  }

  function undoLocalSourceCandidate(store, now) {
    if (!sourceUpdateRuntimeReady()) return { changed: false, code: 'runtime-missing', store };
    return sourceUpdateRuntime.undoPersonalWorkspacePocSourceCandidate(store, now);
  }

  function loadSourceCandidateStore(storage) {
    let raw;
    try { raw = storage.getItem(SOURCE_CANDIDATE_STORAGE_KEY); }
    catch (error) { return { store: null, raw: null, status: 'read-error', error }; }
    if (raw === null) return { store: initialSourceCandidateStore(), raw: null, status: sourceUpdateRuntimeReady() ? 'empty' : 'unavailable' };
    if (!sourceUpdateRuntimeReady()) return { store: null, raw, status: 'unavailable' };
    try {
      const parsed = JSON.parse(raw);
      if (!sourceUpdateRuntime.isPersonalWorkspacePocSourceCandidateStore(parsed)) return { store: null, raw, status: 'corrupt' };
      return { store: parsed, raw, status: 'restored' };
    } catch (error) {
      return { store: null, raw, status: 'corrupt', error };
    }
  }

  /** Exact-key compare-and-swap with readback verification and byte rollback. */
  function writeSourceCandidateStore(storage, store, expectedRaw) {
    if (!sourceUpdateRuntimeReady() || !sourceUpdateRuntime.isPersonalWorkspacePocSourceCandidateStore(store)) throw new Error('invalid-source-candidate-store');
    const bytes = JSON.stringify(store);
    const before = storage.getItem(SOURCE_CANDIDATE_STORAGE_KEY);
    if (before !== expectedRaw) {
      const staleError = new Error('source-candidate-stale-write');
      staleError.code = 'source-candidate-stale-write';
      throw staleError;
    }
    if (before === bytes) return bytes;
    try {
      storage.setItem(SOURCE_CANDIDATE_STORAGE_KEY, bytes);
      if (storage.getItem(SOURCE_CANDIDATE_STORAGE_KEY) !== bytes) throw new Error('source-candidate-write-verification-failed');
    } catch (error) {
      // Storage adapters can throw primitives or frozen objects. Do not mutate
      // the caught value or invoke a message getter / object string coercion.
      let message = 'source-candidate-write-failed';
      if (typeof error === 'string' && error.trim()) message = error;
      else if (error !== null && (typeof error === 'object' || typeof error === 'function')) {
        try {
          const descriptor = Object.getOwnPropertyDescriptor(error, 'message');
          if (descriptor && typeof descriptor.value === 'string' && descriptor.value.trim()) message = descriptor.value;
        } catch (ignored) { /* An unreadable descriptor does not grant rollback ownership. */ }
      }
      const failure = new Error(message);
      failure.cause = error;
      failure.rollback = 'recovery-required';
      try {
        const current = storage.getItem(SOURCE_CANDIDATE_STORAGE_KEY);
        if (current === before) {
          failure.rollback = 'not-needed';
        } else if (current === bytes) {
          // Recheck exact ownership even when setItem itself threw after writing.
          // localStorage still provides no native cross-document atomic CAS.
          if (before === null) storage.removeItem(SOURCE_CANDIDATE_STORAGE_KEY);
          else storage.setItem(SOURCE_CANDIDATE_STORAGE_KEY, before);
          if (storage.getItem(SOURCE_CANDIDATE_STORAGE_KEY) !== before) throw new Error('source-candidate-rollback-verification-failed');
          failure.rollback = 'complete';
        } else {
          failure.rollbackError = new Error('source-candidate-rollback-ownership-lost');
        }
      } catch (rollbackError) { failure.rollbackError = rollbackError; }
      throw failure;
    }
    return bytes;
  }

  /** Applies effective source values to a disposable read model only. */
  function composeSourceCandidateState(state, store) {
    if (!sourceUpdateRuntimeReady() || !sourceUpdateRuntime.isPersonalWorkspacePocSourceCandidateStore(store)) return state;
    const next = clone(state);
    Object.values(store.effectiveVersions || {}).forEach(version => {
      const projected = version && version.projectedFlow;
      if (!projected || projected.origin !== 'authoring-handoff') return;
      const flow = next.flows.find(entry => entry.ref === projected.ref && entry.origin === 'authoring-handoff');
      if (!flow) return;
      const previousSourceTitle = typeof flow.sourceTitle === 'string' ? flow.sourceTitle : flow.title;
      const hasPersonalTitle = flow.title !== previousSourceTitle;
      flow.sourceTitle = projected.title;
      if (!hasPersonalTitle) flow.title = projected.title;
      flow.rawText = version.sourceRevision.rawText;
      flow.sourceFingerprint = fingerprint(version.sourceRevision.rawText);
      const projectedByRef = new Map(projected.items.map(item => [item.ref, item]));
      next.tasks.filter(task => task.flowId === flow.id && typeof task.ref === 'string').forEach(task => {
        const sourceItem = projectedByRef.get(task.ref);
        if (!sourceItem) return;
        const previousSourceItemTitle = typeof task.sourceTitle === 'string' ? task.sourceTitle : task.title;
        const hasPersonalItemTitle = task.title !== previousSourceItemTitle;
        task.sourceTitle = sourceItem.title;
        if (!hasPersonalItemTitle) task.title = sourceItem.title;
        task.sourceDate = sourceItem.sourceDate || null;
        task.sourceDescription = typeof sourceItem.description === 'string' ? sourceItem.description : '';
        if (typeof sourceItem.completionCriterion === 'string') task.completionCriterion = sourceItem.completionCriterion;
      });
      const sectionsById = new Map((projected.sections || []).map(section => [section.sectionId, section]));
      flow.steps.forEach(step => {
        const sourceSection = sectionsById.get(step.id);
        if (sourceSection) step.title = sourceSection.title;
      });
    });
    return next;
  }

  function resetPoc(storage) {
    const keys = [STORAGE_KEY, DRAFT_STORAGE_KEY, CREATOR_DRAFT_STORAGE_KEY, SOURCE_CANDIDATE_STORAGE_KEY];
    const before = keys.map(key => storage.getItem(key));
    try {
      keys.forEach(key => storage.removeItem(key));
      keys.forEach(key => { if (storage.getItem(key) !== null) throw new Error('reset-verification-failed:' + key); });
    } catch (error) {
      try {
        keys.forEach((key, index) => {
          if (before[index] === null) storage.removeItem(key);
          else storage.setItem(key, before[index]);
        });
        keys.forEach((key, index) => {
          if (storage.getItem(key) !== before[index]) throw new Error('reset-rollback-verification-failed:' + key);
        });
      } catch (rollbackError) {
        error.rollbackError = rollbackError;
      }
      throw error;
    }
  }

  function createMemoryStorage(initial) {
    const map = new Map(Object.entries(initial || {}));
    const calls = [];
    return {
      calls,
      getItem(key) { calls.push(['getItem', key]); return map.has(key) ? map.get(key) : null; },
      setItem(key, value) { calls.push(['setItem', key, value]); map.set(key, String(value)); },
      removeItem(key) { calls.push(['removeItem', key]); map.delete(key); },
      snapshot() { return Object.fromEntries(map.entries()); }
    };
  }

  return Object.freeze({ readLocalSourcePracticeContext, resumeLocalSourceCandidateReview, mergeLocalSourcePracticeStore, AUTHORING_HANDOFF_EXECUTION_DEFAULTS, writeAuthoringDraftCandidate, restoreAuthoringDraftCandidate, itemDetails, VERSION, OCCURRENCE_CONTRACT_VERSION, RESULT_PROJECTION_VERSION, RESULT_DOWNLOAD_CONTRACT_VERSION, FINITE_RECURRENCE_PAGE_SIZE, OPEN_ENDED_RECURRENCE_WEEKS, RESULT_SHEET_COLUMNS, LOSSLESS_AUTHORING_VERSION, LOSSLESS_AUTHORING_LIMITS, PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION, PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_GROUPS, PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG, fingerprintPersonalWorkspacePocAuthoringSource, normalizePersonalWorkspacePocValidationExampleSearch, filterPersonalWorkspacePocValidationExamples, projectPersonalWorkspacePocValidationExampleSelection, planPersonalWorkspacePocValidationExampleApply, validationExampleCatalogVersion, validationExampleGroups, validationExampleCatalog, filterValidationExamples, projectValidationExampleSelection, planValidationExampleApply, structureTemplatePreviewCatalogVersion, structureTemplatePreviewContractVersion, structureTemplatePreviews, findStructureTemplatePreview, structureTemplateSidecarStorageKey, planStructureTemplatePreviewMaterialization, AUTHORING_PROPERTY_CATALOG_VERSION, TODAY, STORAGE_KEY, DRAFT_STORAGE_KEY, CREATOR_DRAFT_LIBRARY_VERSION, CREATOR_DRAFT_STORAGE_KEY, SOURCE_CANDIDATE_STORAGE_KEY, SOURCE_UPDATE_FIXTURE_AT, SOURCE_UPDATE_FIXTURE_ID, TEMPLATE_CATALOG, AUTHORING_GHOST_HINTS, AUTHORING_PROPERTY_GROUPS, AUTHORING_PROPERTY_CATALOG, splitLogicalSourceLines, authoringGhostLines, analyzeLosslessAuthoring, addDays, fingerprint, parseRecurrence, buildOccurrenceSeriesId, buildOccurrenceId, expandOccurrences, serializeCompleteResultTxt, seedState, templateById, parseSource, makeHandoff, effectiveFolder, trashManifest, quickConversionReceipts, isTrashedFlow, isTrashedTask, viewTaskIds, copyDisambiguation, flowDisplayTitle, resultMonthCells, buildResultDownloads, resultProjection, authoringResultProjection, authoringPropertyByKey, listAuthoringPropertyInstances, locateAuthoringPropertyValue, planAuthoringPropertyEdit, planAuthoringPropertyBatchEdit, listAuthoringNearMissTargets, planAuthoringNearMissRepair, validate, apply, initialEnvelope, transitionEnvelope, undoEnvelope, loadEnvelope, writeEnvelope, writeAuthoringCommit, initialCreatorDraftLibrary, creatorDraftName, creatorDraftSourceLabel, creatorDraftCopyName, validCreatorDraftLibrary, creatorDraftById, listCreatorDrafts, transitionCreatorDraftLibrary, loadCreatorDraftLibrary, writeCreatorDraftLibrary, writeCreatorDraftCommit, loadAuthoringDraft, writeAuthoringDraft, clearAuthoringDraft, sourceUpdateRuntimeReady, initialSourceCandidateStore, standaloneAuthoredFlowForSourceUpdate, standaloneLocalIncomingSource, prepareLocalSourceCandidateReview, resolveLocalSourceCandidateChange, deferLocalSourceCandidate, applyLocalSourceCandidate, undoLocalSourceCandidate, loadSourceCandidateStore, writeSourceCandidateStore, composeSourceCandidateState, resetPoc, createMemoryStorage });
});
