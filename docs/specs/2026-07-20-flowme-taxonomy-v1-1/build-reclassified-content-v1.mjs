import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const auditDir = path.resolve(here, '../../content-audit');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const p0Source = readJson(path.join(auditDir, '2026-07-18-flowme-flow-content-category-examples.json'));
const expansionSource = readJson(path.join(auditDir, '2026-07-19-flow-content-source-expansion-seed.json'));
const deepSource = readJson(path.join(auditDir, '2026-07-19-flow-content-source-expansion/deep-set-v1.json'));

const patternMap = {
  date_preparation: 'date_preparation',
  ordered_procedure: 'ordered_procedure',
  repeating_routine: 'repeating_routine',
  source_table_rows: 'progress_tracking',
  resource_queue: 'resource_queue',
  compare_decide: 'compare_decide',
  phase_lifecycle: 'phase_lifecycle',
};

const p0Overrides = {
  C01: { life: 'travel_outings', secondaryLife: ['family_parenting'], artifact: 'calendar', secondaryArtifacts: ['checklist'] },
  C02: { life: 'travel_outings', secondaryLife: ['family_parenting'] },
  C05: { secondaryLife: ['home_living'], artifact: 'calendar', secondaryArtifacts: ['checklist'] },
  C06: { life: 'travel_outings', secondaryLife: ['family_parenting'], artifact: 'calendar', secondaryArtifacts: ['checklist'] },
  C07: { life: 'meals_grocery', secondaryLife: ['family_parenting', 'travel_outings'] },
  C08: { artifact: 'calendar', secondaryArtifacts: ['checklist'] },
  C09: { secondaryLife: ['family_parenting'], artifact: 'calendar', secondaryArtifacts: ['checklist'] },
  C10: { secondaryLife: ['family_parenting'] },
  C14: { life: 'home_living', secondaryLife: ['hobby_pet'] },
  C16: { artifact: 'sheet', secondaryArtifacts: ['calendar', 'todo'] },
  O02: { shape: 'date_window', artifact: 'calendar', secondaryArtifacts: ['checklist'] },
  O04: { shape: 'decision_criteria', artifact: 'sheet', secondaryArtifacts: ['checklist', 'memo'] },
  R01: { shape: 'date_offsets', artifact: 'calendar', secondaryArtifacts: ['checklist'] },
  R02: { shape: 'table_rows' },
  R03: { shape: 'procedure_rows', artifact: 'sheet', secondaryArtifacts: ['todo', 'calendar'] },
  R04: { shape: 'checklist_rows' },
  O01: { shape: 'checklist_rows' },
  O03: { shape: 'date_offsets', artifact: 'calendar', secondaryArtifacts: ['checklist'] },
};

const expansionShapeOverrides = {
  'KR-OHOUSE-01': 'resource_collection',
  'KR-OHOUSE-02': 'decision_criteria',
  'KR-MAILY-01': 'procedure_rows',
  'KR-MAILY-02': 'recurrence_rule',
  'KR-KMOOC-01': 'lesson_rows',
  'KR-EASYLAW-01': 'date_offsets',
  'KR-CHILDCARE-01': 'checklist_rows',
  'KR-FIT100-01': 'procedure_rows',
  'KR-VISITKOREA-01': 'procedure_rows',
  'KR-50PLUS-01': 'date_window',
  'KR-WTABLE-01': 'procedure_rows',
  'GLOBAL-OSSU-01': 'lesson_rows',
  'GLOBAL-WIKIVOYAGE-01': 'checklist_rows',
  'GLOBAL-NASA-01': 'procedure_rows',
  'GLOBAL-INSTRUCTABLES-01': 'procedure_rows',
  'GLOBAL-NOTION-01': 'template_fields',
  'GLOBAL-BBC-01': 'procedure_rows',
  'GLOBAL-REI-01': 'checklist_rows',
  'GLOBAL-ROADMAP-01': 'lesson_rows',
  'KR-KCA-01': 'table_rows',
  'KR-KOCW-01': 'lesson_rows',
  'KR-NONGSARO-01': 'checklist_rows',
  'KR-SAMSUNGSVC-01': 'procedure_rows',
  'KR-STIBEE-01': 'decision_criteria',
  'KR-KINFA-01': 'procedure_rows',
  'GLOBAL-LIBRIVOX-01': 'resource_collection',
  'GLOBAL-MDN-01': 'lesson_rows',
  'GLOBAL-NPS-01': 'procedure_rows',
  'GLOBAL-FOODSAFETY-01': 'table_rows',
  'GLOBAL-TODOIST-01': 'template_fields',
};

const expansionClassificationOverrides = {
  'KR-OHOUSE-01': { execution: 'resource_queue', artifact: 'todo', secondaryArtifacts: ['checklist'] },
  'KR-OHOUSE-02': { execution: 'compare_decide', artifact: 'sheet', secondaryArtifacts: ['checklist'] },
  'KR-KMOOC-01': { execution: 'progress_tracking', secondaryExecution: ['phase_lifecycle'], artifact: 'sheet', secondaryArtifacts: ['calendar', 'checklist'] },
  'KR-EASYLAW-01': { artifact: 'calendar', secondaryArtifacts: ['checklist'] },
  'KR-CHILDCARE-01': { execution: 'ordered_procedure', artifact: 'checklist' },
  'KR-FIT100-01': { execution: 'ordered_procedure', artifact: 'checklist', secondaryArtifacts: ['calendar', 'memo'] },
  'KR-VISITKOREA-01': { execution: 'ordered_procedure', secondaryExecution: ['date_preparation'], artifact: 'checklist', secondaryArtifacts: ['calendar'] },
  'GLOBAL-OSSU-01': { execution: 'progress_tracking', secondaryExecution: ['resource_queue'], artifact: 'sheet' },
  'GLOBAL-WIKIVOYAGE-01': { execution: 'progress_tracking', artifact: 'checklist' },
  'KR-NONGSARO-01': { secondaryLife: ['health_fitness'], execution: 'repeating_routine', artifact: 'checklist', secondaryArtifacts: ['calendar'] },
  'GLOBAL-LIBRIVOX-01': { execution: 'resource_queue', artifact: 'sheet', secondaryArtifacts: ['todo'] },
  'GLOBAL-MDN-01': { execution: 'progress_tracking', artifact: 'sheet' },
  'GLOBAL-FOODSAFETY-01': { execution: 'ordered_procedure', artifact: 'memo', secondaryArtifacts: ['sheet'] },
  'GLOBAL-TODOIST-01': { execution: 'phase_lifecycle', artifact: 'checklist', secondaryArtifacts: ['todo'] },
};

const deepShapeOverrides = {
  DS01: 'checklist_rows',
  DS02: 'decision_criteria',
  DS03: 'procedure_rows',
  DS04: 'date_window',
  DS05: 'date_offsets',
  DS06: 'checklist_rows',
  DS07: 'procedure_rows',
  DS08: 'procedure_rows',
  DS09: 'procedure_rows',
  DS10: 'lesson_rows',
  DS11: 'checklist_rows',
  DS12: 'procedure_rows',
};

const deepOverrides = {
  DS01: { secondaryLife: ['health_fitness'], execution: 'repeating_routine', artifact: 'checklist', secondaryArtifacts: ['calendar'] },
  DS02: { execution: 'compare_decide', artifact: 'sheet', secondaryArtifacts: ['checklist'] },
  DS03: { execution: 'phase_lifecycle', artifact: 'sheet', secondaryArtifacts: ['checklist'] },
  DS04: { execution: 'progress_tracking', secondaryExecution: ['phase_lifecycle'], artifact: 'sheet', secondaryArtifacts: ['calendar', 'checklist'] },
  DS05: { execution: 'date_preparation', artifact: 'calendar', secondaryArtifacts: ['checklist'] },
  DS06: { execution: 'ordered_procedure', artifact: 'checklist' },
  DS07: { execution: 'ordered_procedure', secondaryExecution: ['phase_lifecycle'], artifact: 'checklist', secondaryArtifacts: ['calendar', 'memo'] },
  DS08: { secondaryLife: ['family_parenting'], execution: 'ordered_procedure', secondaryExecution: ['date_preparation'], artifact: 'checklist', secondaryArtifacts: ['calendar'] },
  DS09: { execution: 'ordered_procedure', artifact: 'checklist', secondaryArtifacts: ['sheet'] },
  DS10: { execution: 'progress_tracking', secondaryExecution: ['resource_queue'], artifact: 'sheet' },
  DS11: { execution: 'progress_tracking', artifact: 'checklist' },
  DS12: { execution: 'ordered_procedure', artifact: 'checklist' },
};

const runtimeSeeds = [
  ['moving-d30-basic', '이사 D-30 준비 Flow', '이사', 'timeline', null, 24, 'home_living', 'date_offsets', 'date_preparation', 'calendar', ['checklist']],
  ['japan-esim-setup-before-departure', '일본 eSIM 출국 전 등록 체크 Flow', '여행 준비', 'timeline', 'calendar', 6, 'travel_outings', 'procedure_rows', 'ordered_procedure', 'checklist', ['calendar']],
  ['picture-book-reading-routine', '그림책 읽기 루틴 + 질문 카드 Flow', '육아/독서', 'routine', 'hybrid', 6, 'family_parenting', 'recurrence_rule', 'repeating_routine', 'calendar', ['checklist', 'todo']],
  ['baby-food-menu-recipe', '초기 이유식 메뉴·레시피 Flow', '육아/이유식', 'phase', 'calendar', 0, 'meals_grocery', 'table_rows', 'progress_tracking', 'sheet', ['calendar']],
  ['passport-renewal-docs', '여권 재발급 준비 Flow', '여행/여권', 'checklist', 'memo', 6, 'money_admin_purchase', 'checklist_rows', 'ordered_procedure', 'checklist', ['memo']],
  ['washer-tub-clean-monthly', '세탁기 통세척 월간 관리 Flow', '가전 관리', 'routine', 'calendar', 3, 'home_living', 'recurrence_rule', 'repeating_routine', 'calendar', ['checklist']],
  ['new-car-delivery-check', '신차 인수 점검 Flow', '자동차/구매', 'checklist', 'sheet', 12, 'money_admin_purchase', 'decision_criteria', 'compare_decide', 'sheet', ['checklist']],
  ['wedding-d180-basic', '결혼 준비 D-300 타임라인 Flow', '결혼/준비', 'timeline', 'calendar', 12, 'family_parenting', 'date_offsets', 'date_preparation', 'calendar', ['checklist']],
  ['computer-skills-d30-study', '컴퓨터활용능력 1급 D-30 학습 Flow', '자격증/시험', 'timeline', 'hybrid', 9, 'study_reading', 'lesson_rows', 'progress_tracking', 'sheet', ['calendar']],
  ['book-finish-one', '책 한 권 완독 실천 Flow', '자기계발/독서', 'checklist', 'memo', 6, 'study_reading', 'checklist_rows', 'progress_tracking', 'checklist', ['memo']],
  ['travel-packing-list', '여행 짐 싸기 체크리스트 Flow', '여행', 'checklist', 'memo', 6, 'travel_outings', 'checklist_rows', 'progress_tracking', 'checklist', ['memo']],
  ['new-apartment-precheck', '신축 아파트 입주 사전점검 Flow', '주거/입주', 'checklist', 'internal_check', 8, 'home_living', 'checklist_rows', 'ordered_procedure', 'checklist', ['sheet']],
].map(([slug, title, category, structure, destination, itemCount, life, shape, execution, artifact, secondaryArtifacts]) => ({
  slug, title, category, structure, destination, itemCount, life, shape, execution, artifact, secondaryArtifacts,
}));

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function canonicalPortfolioRole(value) {
  if (value === 'creator_community_variant') return 'creator_variant';
  return value || 'breadth_candidate';
}

function coarseProvider(value = '') {
  const v = value.toLowerCase();
  if (v.includes('government')) return 'government_public';
  if (v.includes('official') || v.includes('public_') || v.includes('agency')) return 'public_institution';
  if (v.includes('manufacturer') || v.includes('brand')) return 'brand_official';
  if (v.includes('marketplace')) return 'marketplace';
  if (v.includes('course') || v.includes('learning') || v.includes('education')) return 'education_provider';
  if (v.includes('open_') || v.includes('wiki') || v.includes('repository')) return 'open_knowledge';
  if (v.includes('aggregator')) return 'aggregator';
  if (v.includes('creator') || v.includes('newsletter')) return 'creator';
  if (v.includes('editorial') || v.includes('recipe')) return 'editorial_media';
  if (v.includes('network') || v.includes('platform')) return 'community_platform';
  return 'editorial_media';
}

function sourceFormatCategory(value = '') {
  const v = value.toLowerCase();
  if (v.includes('api')) return 'api_feed';
  if (v.includes('audio') || v.includes('podcast')) return 'audio';
  if (v.includes('video')) return 'video';
  if (v.includes('course') || v.includes('curriculum') || v.includes('lesson')) return 'course';
  if (v.includes('template')) return 'template';
  if (v.includes('table') || v.includes('chart')) return 'table';
  if (v.includes('checklist')) return 'checklist';
  if (v.includes('pdf') || v.includes('guide') || v.includes('activity_book')) return 'document';
  if (v.includes('collection') || v.includes('playlist') || v.includes('network') || v.includes('catalog')) return 'collection';
  if (v.includes('interactive') || v.includes('graph')) return 'interactive_page';
  return 'article';
}

function sourceStatusFromText(value = '') {
  const v = String(value).toLowerCase();
  if (!v || v.includes('required') || v.includes('provider') || v.includes('unavailable')) return 'missing';
  if (v.includes('metadata_only')) return 'metadata_only';
  if (v.includes('partial') || v.includes('mixed') || v.includes('closed') || v.includes('split') || v.includes('image')) return 'partial';
  if (v.startsWith('yes')) return 'complete';
  return 'partial';
}

function accessFromLegacy({ accessMode = 'unknown', providerType = '', platformRole = '', sourceRowsAvailable = '', sourceFormat = '' } = {}) {
  const rowAccess = { complete: 'full', partial: 'partial', metadata_only: 'metadata_only', missing: 'unavailable' }[sourceStatusFromText(sourceRowsAvailable)];
  const mode = String(accessMode);
  const discovery = mode === 'public_html' || mode === 'official_api' || mode === 'rss' || mode === 'user_authorized' ? 'public' : mode === 'creator_file' ? 'paywalled' : 'unknown';
  const methods = mode === 'official_api' ? ['public_api'] : mode === 'rss' ? ['rss_fetch'] : mode === 'user_authorized' ? ['oauth_api'] : mode === 'creator_file' ? ['file_upload', 'creator_delivery'] : mode === 'public_html' ? ['html_fetch'] : [];
  const roles = platformRole === 'provider_discovery' ? ['discover'] : ['discover', 'host'];
  return {
    providerType: coarseProvider(providerType),
    platformRoles: roles,
    discoveryAccess: discovery,
    rowAccess,
    acquisitionMethods: methods,
    sourceFormat: {
      category: sourceFormatCategory(sourceFormat),
      mediaType: null,
      detail: { legacyFormat: sourceFormat || null },
    },
  };
}

function unknownAccess(providerType = 'editorial_media') {
  return {
    providerType,
    platformRoles: ['discover', 'host'],
    discoveryAccess: 'unknown',
    rowAccess: 'unavailable',
    acquisitionMethods: [],
    sourceFormat: { category: 'article', mediaType: null, detail: {} },
  };
}

function rightsFromLegacy(mode = 'unknown', id = '') {
  if (mode === 'blocked') {
    return { basis: 'blocked', allowedUse: [], territoryScope: 'unknown', territories: [], reviewStatus: 'blocked', personalTransformAllowed: false, publicReleaseAllowed: false, rationale: 'The source ledger explicitly blocks reuse.' };
  }
  if (String(mode).startsWith('open_license')) {
    const territorialException = id === 'GLOBAL-LIBRIVOX-01';
    return {
      basis: territorialException ? 'public_domain' : 'open_license',
      allowedUse: territorialException ? ['link_metadata', 'internal_review'] : ['link_metadata', 'personal_transform', 'internal_review'],
      territoryScope: territorialException ? 'named' : 'global',
      territories: territorialException ? ['US'] : ['GLOBAL'],
      reviewStatus: territorialException ? 'pending' : 'approved',
      personalTransformAllowed: !territorialException,
      publicReleaseAllowed: false,
      rationale: territorialException ? 'U.S. public-domain status needs Korean territory review.' : 'The ledger records an open license; public derivative release still requires attribution/share-alike and editorial review.',
    };
  }
  if (String(mode).startsWith('link_only') || mode === 'internal_link_only' || String(mode).includes('no_derivatives')) {
    return { basis: 'link_only_assumption', allowedUse: ['link_metadata', 'internal_review'], territoryScope: 'unknown', territories: [], reviewStatus: 'restricted', personalTransformAllowed: false, publicReleaseAllowed: false, rationale: 'Public access permits link/metadata handling only; source rows are not cleared for derivative publication.' };
  }
  if (mode === 'paid_private') {
    return { basis: 'provider_terms', allowedUse: ['link_metadata', 'internal_review'], territoryScope: 'unknown', territories: [], reviewStatus: 'pending', personalTransformAllowed: false, publicReleaseAllowed: false, rationale: 'Purchase or private access does not itself grant transformation rights.' };
  }
  if (mode === 'permission_required') {
    return { basis: 'unknown', allowedUse: ['link_metadata', 'internal_review'], territoryScope: 'unknown', territories: [], reviewStatus: 'pending', personalTransformAllowed: false, publicReleaseAllowed: false, rationale: 'Creator/provider permission is not yet recorded.' };
  }
  return { basis: 'unknown', allowedUse: ['internal_review'], territoryScope: 'unknown', territories: [], reviewStatus: 'pending', personalTransformAllowed: false, publicReleaseAllowed: false, rationale: 'No structured rights evidence is available.' };
}

function audienceFor({ life, locale = 'ko-KR', global = false, targetConditions = [] }) {
  const roles = life === 'family_parenting' ? ['parent_guardian'] : life === 'study_reading' ? ['learner'] : life === 'work_career' ? ['professional'] : life === 'travel_outings' ? ['traveler'] : life === 'money_admin_purchase' ? ['individual', 'buyer'] : ['individual'];
  const signalMap = {
    known_anchor_date: ['remember_when'],
    many_rows_to_progress: ['track_progress'],
    repeating_ownership: ['repeat_consistently'],
    saved_researching_again: ['preserve_source_context'],
    portable_tool_transfer: ['preserve_source_context'],
    handoff_or_share: ['handoff_or_share'],
    decision_uncertainty: ['choose_between_options'],
    official_latest_check: ['preserve_source_context'],
  };
  const frictionMap = {
    known_anchor_date: ['missed_deadline'],
    many_rows_to_progress: ['lost_progress'],
    repeating_ownership: ['missed_deadline'],
    saved_researching_again: ['source_revisit_cost'],
    portable_tool_transfer: ['copy_reformatting'],
    handoff_or_share: ['collaboration_gap'],
    decision_uncertainty: ['unclear_next_action'],
    official_latest_check: ['source_revisit_cost'],
  };
  return {
    roles: unique(roles),
    ageBands: life === 'family_parenting' ? ['child', 'adult'] : ['not_specified'],
    skillLevel: life === 'study_reading' ? 'mixed' : 'not_applicable',
    contentLocale: locale,
    applicableLocales: global ? [] : [locale],
    applicability: global ? 'local_adaptation_required' : 'local_direct',
    prerequisites: [],
    accountOrEntitlement: 'none',
    collaborationContext: life === 'family_parenting' ? 'caregiver_dependent' : life === 'work_career' ? 'unknown' : 'solo',
    userNeedSignals: unique(targetConditions.flatMap((value) => signalMap[value] || [])),
    frictionSignals: unique(targetConditions.flatMap((value) => frictionMap[value] || [])),
  };
}

function blockersFor({ sourceRowStatus, rights, global = false, sensitive = false, stale = false, account = false }) {
  const blockers = [];
  if (sourceRowStatus === 'missing') blockers.push('source_import_required');
  if (sourceRowStatus === 'partial' || sourceRowStatus === 'metadata_only') blockers.push('source_incomplete');
  if (rights.reviewStatus === 'pending') blockers.push(rights.basis === 'unknown' ? 'rights_permission_required' : 'rights_unknown');
  if (rights.reviewStatus === 'restricted') blockers.push('rights_unknown');
  if (rights.reviewStatus === 'blocked') blockers.push('rights_blocked');
  if (global) blockers.push('locale_review_required');
  if (sensitive) blockers.push('safety_review_required');
  if (stale) blockers.push('stale_source');
  if (account) blockers.push('account_or_entitlement_required');
  return unique(blockers);
}

function reviewFor({ sourceRowStatus, rights, global = false, sensitive = false, stale = false, account = false, portfolioRole = 'breadth_candidate', preferredReadiness = null }) {
  const blockers = blockersFor({ sourceRowStatus, rights, global, sensitive, stale, account });
  const conversionReadiness = preferredReadiness || (sourceRowStatus === 'missing' ? 'source_import_required' : blockers.length ? 'ready_second_wave' : 'ready_for_internal_canary');
  return {
    sourceRowStatus,
    conversionReadiness,
    freshnessReview: stale ? 'stale' : 'current',
    localeReview: global ? 'adaptation_required' : 'applicable',
    safetyReview: sensitive ? 'pending' : 'not_required',
    privacyReview: account ? 'pending' : 'not_required',
    rightsReview: rights.reviewStatus,
    promotionState: 'research_only',
    blockers,
    portfolioRole,
    editorialAction: sourceRowStatus === 'missing' ? 'import_source' : rights.reviewStatus === 'pending' ? 'rights_review' : global ? 'localize' : sensitive ? 'safety_review' : 'revise',
    backendStorable: true,
  };
}

function oldArtifactToNew(pattern, artifact) {
  if (artifact !== 'hybrid') return { primary: artifact, secondary: [] };
  if (pattern === 'date_preparation' || pattern === 'repeating_routine') return { primary: 'calendar', secondary: ['checklist'] };
  if (pattern === 'compare_decide' || pattern === 'phase_lifecycle' || pattern === 'source_table_rows') return { primary: 'sheet', secondary: ['checklist'] };
  return { primary: 'checklist', secondary: ['memo'] };
}

function partialV11({ status, life, secondaryLife = [], tags = [], shape = null, secondaryShapes = [], execution = null, secondaryExecution = [], artifact = null, secondaryArtifacts = [] }) {
  return {
    classificationStatus: status,
    primaryLifeArea: life,
    secondaryLifeAreas: unique(secondaryLife).filter((value) => value !== life).slice(0, 2),
    topicTags: unique(tags),
    sourceShape: shape,
    secondarySourceShapes: unique(secondaryShapes).filter((value) => value !== shape).slice(0, 2),
    primaryExecutionPattern: execution,
    secondaryExecutionPatterns: unique(secondaryExecution).filter((value) => value !== execution).slice(0, 2),
    primaryArtifact: artifact,
    secondaryArtifacts: unique(secondaryArtifacts).filter((value) => value !== artifact).slice(0, 4),
  };
}

function p0Records() {
  return p0Source.p0Portfolio24.rows.map((row) => {
    const override = p0Overrides[row.id] || {};
    const isCreator = row.sourceModel === 'creator_original';
    const sourceRowStatus = 'missing';
    const oldArtifact = oldArtifactToNew(row.pattern, row.artifact);
    const shape = null;
    const rights = rightsFromLegacy('unknown', row.id);
    const review = reviewFor({ sourceRowStatus, rights, portfolioRole: row.sourceModel === 'official' ? 'official_trust_anchor' : row.sourceModel === 'creator_original' ? 'creator_variant' : 'reference_keep', preferredReadiness: 'source_import_required' });
    if (isCreator) review.blockers = unique([...review.blockers, 'rights_permission_required']);
    return {
      recordId: `p0-${row.id}`,
      dataset: 'p0_portfolio',
      title: row.titleKo,
      sourceUrl: null,
      evidenceLabel: isCreator ? 'strategy_proposal' : 'unverified_hypothesis',
      legacy: { category: row.category, planningPattern: row.pattern, primaryArtifact: row.artifact, readiness: row.readiness, sourceModel: row.sourceModel },
      v11: partialV11({
        status: 'blocked_missing_source',
        life: override.life || row.category,
        secondaryLife: override.secondaryLife || [],
        tags: [row.titleKo.replace(/ Flow$/u, '')],
        shape,
        execution: override.execution || patternMap[row.pattern],
        secondaryExecution: override.secondaryExecution || [],
        artifact: override.artifact || oldArtifact.primary,
        secondaryArtifacts: override.secondaryArtifacts || oldArtifact.secondary,
      }),
      audienceAndApplicability: audienceFor({ life: override.life || row.category }),
      changeReason: row.pattern === 'source_table_rows' ? 'Moved source table anatomy out of execution semantics and classified the user state as progress_tracking.' : row.artifact === 'hybrid' ? 'Resolved hybrid into one primary artifact plus explicit secondary projections.' : override.life && override.life !== row.category ? 'Applied immediate-outcome life-area tie-breaker instead of audience/topic wording.' : 'Retained the good legacy axis while adding source, secondary and gate separation.',
      ambiguousCandidates: { lifeAreas: unique([row.category, ...(override.secondaryLife || [])]), sourceShapes: shape ? [shape] : ['source import required'], executionPatterns: unique([patternMap[row.pattern], ...(override.secondaryExecution || [])]), artifacts: unique([row.artifact, override.artifact || oldArtifact.primary, ...(override.secondaryArtifacts || oldArtifact.secondary)]) },
      tieBreaker: 'Did not infer source shape from title, source model or proposed planning pattern; the P0 ledger has no SourceRows, so source import must happen first.',
      lossOrHoldReason: 'P0 is a product portfolio ledger, not a source-row package; access and rights evidence are missing.',
      backendStorable: true,
      personalTransformAllowed: false,
      publicReleaseAllowed: false,
      access: unknownAccess(row.sourceModel === 'official' ? 'public_institution' : row.sourceModel === 'creator_original' ? 'creator' : 'user_owned'),
      rights,
      review,
    };
  });
}

function expansionRecords() {
  return expansionSource.candidates.map((row) => {
    const sourceRowStatus = sourceStatusFromText(row.sourceRowsAvailable);
    const shape = sourceRowStatus === 'missing' || sourceRowStatus === 'metadata_only' ? null : row.id === 'GLOBAL-TODOIST-01' ? 'procedure_rows' : expansionShapeOverrides[row.id] || null;
    const override = expansionClassificationOverrides[row.id] || {};
    const oldArtifact = oldArtifactToNew(row.planningPattern, row.primaryArtifact);
    const rights = rightsFromLegacy(row.rightsMode, row.id);
    const global = row.id.startsWith('GLOBAL-');
    const sensitive = /health|financial|safety|legal|child|food_safety/i.test(`${row.providerType} ${row.localizationAndRisk}`);
    const stale = row.conversionState === 'hold' && /fresh|closed|최신|마감|2022/.test(`${row.sourceRowsAvailable} ${row.localizationAndRisk}`);
    const account = row.accessMode === 'user_authorized' || row.accessMode === 'creator_file';
    const preferredReadiness = row.conversionState === 'hold'
      ? 'hold'
      : row.conversionState === 'source_import_required' || row.conversionState === 'provider_lead' || sourceRowStatus === 'missing' || sourceRowStatus === 'metadata_only'
        ? 'source_import_required'
        : (global && rights.reviewStatus !== 'approved') || sensitive
          ? 'ready_second_wave'
          : row.conversionState === 'ready' && sourceRowStatus === 'complete'
            ? 'ready_for_internal_canary'
            : 'ready_second_wave';
    const review = reviewFor({ sourceRowStatus, rights, global, sensitive, stale, account, portfolioRole: canonicalPortfolioRole(row.portfolioRole || (row.conversionState === 'provider_lead' ? 'provider_lead' : 'breadth_candidate')), preferredReadiness });
    const access = accessFromLegacy(row);
    return {
      recordId: `expansion-${row.id}`,
      dataset: 'source_expansion',
      title: row.title,
      sourceUrl: row.sourceUrl || null,
      evidenceLabel: sourceRowStatus === 'complete' ? 'verified_fact' : sourceRowStatus === 'missing' ? 'unverified_hypothesis' : 'strategy_proposal',
      legacy: { lifeArea: row.lifeArea, planningPattern: row.planningPattern, primaryArtifact: row.primaryArtifact, providerType: row.providerType, sourceFormat: row.sourceFormat, accessMode: row.accessMode, rightsMode: row.rightsMode, conversionState: row.conversionState, promotionState: row.promotionState, targetConditions: row.targetConditions },
      v11: partialV11({
        status: shape ? (sourceRowStatus === 'complete' ? 'confirmed' : 'provisional') : 'blocked_missing_source',
        life: row.lifeArea,
        secondaryLife: override.secondaryLife || [],
        tags: [row.sourcePlatform, row.title],
        shape,
        execution: override.execution || patternMap[row.planningPattern],
        secondaryExecution: override.secondaryExecution || [],
        artifact: override.artifact || oldArtifact.primary,
        secondaryArtifacts: override.secondaryArtifacts || oldArtifact.secondary,
      }),
      audienceAndApplicability: { ...audienceFor({ life: row.lifeArea, locale: global ? 'en' : 'ko-KR', global, targetConditions: row.targetConditions }), accountOrEntitlement: account ? (row.rightsMode === 'paid_private' ? 'paid_subscription' : row.accessMode === 'creator_file' ? 'source_file_required' : 'free_account') : 'none' },
      changeReason: `Split legacy ${row.accessMode}/${row.rightsMode}/${row.conversionState} into independent access, rights and review fields; mapped ${row.planningPattern} by user execution rather than source format.`,
      ambiguousCandidates: { sourceShapes: shape ? unique([shape, row.planningPattern === 'source_table_rows' ? 'table_rows' : null]) : ['source import required'], executionPatterns: unique([patternMap[row.planningPattern], ...(override.secondaryExecution || [])]), artifacts: unique([row.primaryArtifact, override.artifact || oldArtifact.primary, ...(override.secondaryArtifacts || oldArtifact.secondary)]) },
      tieBreaker: shape ? 'Used available-row anatomy first, then the terminal user state and artifact-loss test.' : 'Provider/title metadata cannot establish a source shape or canonical Items.',
      lossOrHoldReason: sourceRowStatus === 'missing' ? 'The concrete source rows or provider-delivered file are unavailable.' : sourceRowStatus === 'partial' || sourceRowStatus === 'metadata_only' ? 'Only a partial or metadata-level source package is available.' : rights.reviewStatus !== 'approved' ? 'Rows exist, but rights/publication remain independently gated.' : null,
      backendStorable: true,
      personalTransformAllowed: rights.personalTransformAllowed && sourceRowStatus === 'complete' && !account,
      publicReleaseAllowed: false,
      access,
      rights: { ...rights, personalTransformAllowed: rights.personalTransformAllowed && sourceRowStatus === 'complete' && !account },
      review,
    };
  });
}

function deepRecords() {
  return deepSource.cases.map((row) => {
    const sourceComplete = row.gate.sourceComplete === true;
    const sourceRowStatus = sourceComplete ? 'complete' : row.sourceRows?.length ? 'partial' : 'missing';
    const shape = deepShapeOverrides[row.caseId];
    const override = deepOverrides[row.caseId] || {};
    const oldArtifact = oldArtifactToNew(row.classification.planningPattern, row.classification.primaryArtifact);
    const rights = rightsFromLegacy(row.sourceSnapshot.rightsMode, row.candidateId);
    const global = row.candidateId.startsWith('GLOBAL-');
    const sensitive = /health|financial|safety|legal|medical|child/i.test(`${row.sourceSnapshot.risk} ${row.classification.lifeArea}`);
    const preferredReadiness = row.caseId === 'DS04'
      ? 'source_import_required'
      : row.canonicalPackage.status === 'hold_source_import_required'
        ? 'source_import_required'
        : row.canonicalPackage.status === 'review_locked'
          ? 'hold'
          : sourceComplete && !global && !sensitive
            ? 'ready_for_internal_canary'
            : 'ready_second_wave';
    const review = reviewFor({ sourceRowStatus, rights, global, sensitive, account: false, portfolioRole: row.classification.lifeArea === 'money_admin_purchase' || row.sourceSnapshot.publisher?.includes('정부') ? 'official_trust_anchor' : 'breadth_candidate', preferredReadiness });
    const sourceFormat = row.canonicalPackage?.flow?.sourceFormat || '';
    const access = accessFromLegacy({ accessMode: row.sourceSnapshot.accessMode || 'public_html', providerType: row.sourceSnapshot.publisher || '', platformRole: 'source_host', sourceRowsAvailable: sourceComplete ? 'yes' : 'partial', sourceFormat });
    return {
      recordId: `deep-${row.caseId}`,
      dataset: 'deep_set',
      title: row.sourceSnapshot.title,
      sourceUrl: row.sourceSnapshot.sourceUrl || null,
      evidenceLabel: sourceComplete ? 'verified_fact' : 'strategy_proposal',
      legacy: { caseId: row.caseId, candidateId: row.candidateId, lifeArea: row.classification.lifeArea, planningPattern: row.classification.planningPattern, primaryArtifact: row.classification.primaryArtifact, gateResult: row.gate.result, packageStatus: row.canonicalPackage.status },
      v11: partialV11({
        status: sourceComplete ? 'confirmed' : 'provisional',
        life: row.classification.lifeArea,
        secondaryLife: override.secondaryLife || [],
        tags: [row.sourceSnapshot.publisher, row.sourceSnapshot.title],
        shape,
        execution: override.execution || patternMap[row.classification.planningPattern],
        secondaryExecution: override.secondaryExecution || [],
        artifact: override.artifact || oldArtifact.primary,
        secondaryArtifacts: override.secondaryArtifacts || oldArtifact.secondary,
      }),
      audienceAndApplicability: audienceFor({ life: row.classification.lifeArea, locale: global ? 'en' : 'ko-KR', global }),
      changeReason: row.classification.primaryArtifact === 'hybrid' ? 'Resolved hybrid by the artifact-loss rule and retained demonstrated projections as secondaries.' : row.classification.planningPattern === 'source_table_rows' ? 'Separated source row anatomy from execution state.' : 'Reclassified from named source rows and preserved the verified source package.',
      ambiguousCandidates: { sourceShapes: [shape], executionPatterns: unique([patternMap[row.classification.planningPattern], override.execution, ...(override.secondaryExecution || [])]), artifacts: unique([row.classification.primaryArtifact, override.artifact || oldArtifact.primary, ...(override.secondaryArtifacts || oldArtifact.secondary)]) },
      tieBreaker: 'Named source rows determined shape; immediate terminal state determined execution; artifact loss determined primary output.',
      lossOrHoldReason: sourceComplete ? (rights.reviewStatus === 'approved' ? null : 'Public release remains rights-gated even though rows are complete.') : 'The deep package explicitly records a missing or metadata-only boundary.',
      backendStorable: true,
      personalTransformAllowed: rights.personalTransformAllowed && sourceComplete,
      publicReleaseAllowed: false,
      access,
      rights: { ...rights, personalTransformAllowed: rights.personalTransformAllowed && sourceComplete },
      review,
    };
  });
}

function runtimeRecords() {
  return runtimeSeeds.map((row) => {
    const rights = rightsFromLegacy('unknown', row.slug);
    const review = reviewFor({ sourceRowStatus: 'missing', rights, portfolioRole: 'reference_keep', preferredReadiness: 'source_import_required' });
    return {
      recordId: `runtime-${row.slug}`,
      dataset: 'runtime_seed',
      title: row.title,
      sourceUrl: null,
      evidenceLabel: 'current_implementation',
      legacy: { slug: row.slug, category: row.category, structure_type: row.structure, primary_destination: row.destination, itemCount: row.itemCount },
      v11: partialV11({ status: 'provisional', life: row.life, secondaryLife: row.slug === 'picture-book-reading-routine' ? ['study_reading'] : [], tags: [row.category], shape: row.shape, execution: row.execution, artifact: row.artifact, secondaryArtifacts: row.secondaryArtifacts }),
      audienceAndApplicability: audienceFor({ life: row.life }),
      changeReason: row.destination === 'hybrid' ? 'Resolved legacy hybrid and separated the user execution pattern from the UI structure_type.' : row.destination === 'internal_check' ? 'Mapped internal_check to checklist plus an adapter-only delivery surface.' : 'Mapped current UI hints to a v1.1 proposal without treating them as source evidence.',
      ambiguousCandidates: { sourceShapes: [row.shape], executionPatterns: unique([row.execution, row.structure === 'timeline' ? 'date_preparation' : null]), artifacts: unique([row.destination, row.artifact, ...row.secondaryArtifacts]) },
      tieBreaker: 'Used current structured schedule/recurrence/row behavior where present; the result stays provisional because runtime lacks first-class SourceRows.',
      lossOrHoldReason: 'Current FlowItemDetail flattens provenance and cannot prove source-row identity or rights.',
      backendStorable: true,
      personalTransformAllowed: false,
      publicReleaseAllowed: false,
      access: unknownAccess('user_owned'),
      rights,
      review,
    };
  });
}

const records = [...p0Records(), ...expansionRecords(), ...deepRecords(), ...runtimeRecords()];
const byDataset = Object.fromEntries(['p0_portfolio', 'source_expansion', 'deep_set', 'runtime_seed'].map((dataset) => [dataset, records.filter((record) => record.dataset === dataset).length]));
const summary = {
  totalRecords: records.length,
  byDataset,
  confirmed: records.filter((record) => record.v11.classificationStatus === 'confirmed').length,
  provisional: records.filter((record) => record.v11.classificationStatus === 'provisional').length,
  blockedMissingSource: records.filter((record) => record.v11.classificationStatus === 'blocked_missing_source').length,
  backendStorable: records.filter((record) => record.backendStorable).length,
  personalTransformAllowed: records.filter((record) => record.personalTransformAllowed).length,
  publicReleaseAllowed: records.filter((record) => record.publicReleaseAllowed).length,
  legacyHybridCount: records.filter((record) => record.legacy.primaryArtifact === 'hybrid' || record.legacy.primary_destination === 'hybrid').length,
  newHybridCount: records.filter((record) => record.v11.primaryArtifact === 'hybrid').length,
  note: 'False is fail-closed from current evidence, not a legal conclusion. Automated classification QA is not user validation.',
};

const output = {
  documentType: 'flowme_taxonomy_reclassification',
  schemaVersion: 'flowme-taxonomy-v1.1',
  date: '2026-07-20',
  scope: {
    p0Portfolio: 24,
    sourceExpansion: 36,
    deepSet: 12,
    representativeRuntimeSeed: 12,
    method: 'Deterministic v1.1 rules with source-evidence labels and fail-closed rights/publication gates.',
  },
  summary,
  records,
};

fs.writeFileSync(path.join(here, 'reclassified-content-v1.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(summary, null, 2));
