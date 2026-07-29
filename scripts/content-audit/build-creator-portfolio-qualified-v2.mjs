import fs from 'node:fs/promises';
import path from 'node:path';
import {
  boundaryCreatorIds,
  entityConfig,
  evidenceOverrides,
  observedAt,
  openTutorialsTopics,
  preflightConfig,
  rightsConfig,
  selectedCreatorIds,
} from './creator-portfolio-qualified-v2-config.mjs';

const repoRoot = process.cwd();
const auditDir = path.join(repoRoot, 'docs', 'content-audit');
const assetDirName = '2026-07-27-creator-portfolio-qualified-assets';
const assetDir = path.join(auditDir, assetDirName);
const sourceDataPath = path.join(
  auditDir,
  '2026-07-23-creator-flow-portfolio-data-v1.json',
);
const sourceLedgerPath = path.join(
  auditDir,
  '2026-07-23-creator-flow-portfolio-assets',
  'opened-creator-url-ledger-v1.json',
);
const revalidationPath = path.join(assetDir, 'targeted-revalidation-v2.json');
const outputJsonPath = path.join(
  auditDir,
  '2026-07-27-creator-portfolio-qualified-v2.json',
);
const outputHtmlPath = path.join(
  auditDir,
  '2026-07-27-creator-portfolio-qualified-review-ko.html',
);
const outputHandoffPath = path.join(
  auditDir,
  '2026-07-27-creator-portfolio-qualified-logic-handoff-ko.md',
);

const sourceData = JSON.parse(await fs.readFile(sourceDataPath, 'utf8'));
const sourceLedger = JSON.parse(await fs.readFile(sourceLedgerPath, 'utf8'));
const revalidation = JSON.parse(await fs.readFile(revalidationPath, 'utf8'));

const creatorsById = new Map(
  sourceData.creatorPortfolioRecords.map((record) => [record.creatorId, record]),
);
const oldExamplesByCreator = new Map(
  sourceData.representativeFlowExamples.map((example) => [example.creatorId, example]),
);
const oldProfileEvidenceById = new Map(
  sourceLedger.profileEvidence.map((record) => [record.candidateId, record]),
);
const revalidationById = new Map(
  revalidation.records.map((record) => [record.creatorId, record]),
);

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function publicBoundaryFor(status) {
  if (status === 'public_conversion_allowed') {
    return '명시된 공개 범위 안에서 원문 출처와 링크를 유지해 Flow로 전환할 수 있다.';
  }
  if (status === 'link_metadata_only') {
    return '제목·URL·공개 순서 같은 최소 메타데이터만 노출한다. 본문·자막·방법은 원문으로 돌려보낸다.';
  }
  if (status === 'private_conversion_only') {
    return '내부 검토와 개인 실행용 변환만 허용한다. 공개 카탈로그·공유 Flow에는 넣지 않는다.';
  }
  if (status === 'permission_required') {
    return '내부 로직 검증은 가능하지만 공개 Flow 전환에는 권리자 확인 또는 제휴가 필요하다.';
  }
  return '권리 상태를 확인하기 전에는 공개 전환하지 않는다.';
}

function currentSignalSummary(revalidatedRecord, creator) {
  const source = revalidatedRecord?.representativeSource;
  const signals = unique([
    ...(source?.demandSignals || []),
    source?.viewCount ? `조회 ${source.viewCount.toLocaleString('ko-KR')}` : null,
    source?.commentCountText && /\d/.test(source.commentCountText)
      ? source.commentCountText
      : null,
  ]);
  if (signals.length) return `${observedAt} 재확인: ${signals.join(' · ')}`;
  return creator.demandEvidence;
}

function buildOpenTutorialsExample() {
  const bundleId = 'bundle-opentutorials-web1-progress';
  const sourceUrl = 'https://opentutorials.org/course/3084';
  const items = openTutorialsTopics.map(([topicId, title, depth], index) => {
    const itemId = `${bundleId}-s1-i${index + 1}`;
    const rowId = `${itemId}-r1`;
    const topicUrl = `https://opentutorials.org/course/3084/${topicId}`;
    return {
      itemId,
      itemTitle: `「${title}」 학습하기`,
      memo: `생활코딩 WEB1 토픽 ${index + 1}. 원문 강의: ${topicUrl}`,
      completionMode: 'manual_check',
      optional: depth === 1,
      schedule: null,
      sourceRowIds: [rowId],
      sourceTrace: [
        {
          sourceRowId: rowId,
          sourceUrl,
          sourceLocator: `WEB1 토픽 목록 ${index + 1}번 · ${title}`,
        },
      ],
    };
  });
  const sourceRows = openTutorialsTopics.map(([topicId, title, depth], index) => {
    const rowId = `${bundleId}-s1-i${index + 1}-r1`;
    return {
      sourceRowId: rowId,
      bundleId,
      sourceUrl,
      sourceLocator: `WEB1 토픽 목록 ${index + 1}번 · ${title}`,
      label: title,
      detail: `https://opentutorials.org/course/3084/${topicId}`,
      rowDepth: depth,
      verifiedAt: observedAt,
    };
  });
  return {
    creatorId: 'study-opentutorials',
    categoryId: 'study_reading',
    provenance: {
      type: 'new_source_backed_bundle',
      sourceArtifact: revalidationPath.replace(`${repoRoot}${path.sep}`, ''),
      reviewedAt: observedAt,
    },
    userContentBundle: {
      bundleId,
      title: '생활코딩 WEB1 진도표',
      category: '공부·독서',
      status: 'logic_handoff_candidate',
      sourceType: 'creator_community',
      sourceUrls: [sourceUrl],
      userPromise: '날짜를 정하지 않아도 WEB1 토픽 26개를 원문 순서대로 시작하고 진도를 체크할 수 있다.',
      firstAction: '프로젝트의 동기 학습하기',
      setupFields: [],
      defaultArtifact: 'sheet_checklist',
      cautions: [],
      sourceAttribution: {
        providerName: '오픈튜토리얼스',
        creatorName: 'egoing',
        sourceUrl,
      },
      map: {
        mapId: `${bundleId}-map`,
        title: '생활코딩 WEB1 진도표',
        flows: [
          {
            flowId: `${bundleId}-flow`,
            title: 'WEB1 - HTML & Internet',
            expectedItemCount: items.length,
            sourceVideoUrl: null,
            steps: [
              {
                stepId: `${bundleId}-s1`,
                title: 'WEB1 토픽 목록',
                schedule: null,
                prerequisite: null,
                items,
              },
            ],
          },
        ],
      },
    },
    sourceRows,
    counts: {
      flows: 1,
      steps: 1,
      items: items.length,
      sourceRows: sourceRows.length,
    },
  };
}

function cleanExistingExample(example) {
  const copy = deepClone(example);
  const creator = creatorsById.get(copy.creatorId);
  const config = entityConfig[copy.creatorId];
  copy.provenance.reviewedAt = observedAt;
  copy.userContentBundle.status = 'logic_handoff_candidate';
  delete copy.userContentBundle.rightsMode;
  copy.userContentBundle.sourceAttribution = {
    providerName: config.providerDisplayName,
    creatorName: config.creatorDisplayName,
    sourceUrl: copy.userContentBundle.sourceUrls[0],
  };
  copy.userContentBundle.category = creator.categoryLabel;
  return copy;
}

const representativeFlowExamples = selectedCreatorIds.map((creatorId) => {
  if (creatorId === 'study-opentutorials') return buildOpenTutorialsExample();
  const existing = oldExamplesByCreator.get(creatorId);
  if (!existing) throw new Error(`Representative example missing: ${creatorId}`);
  return cleanExistingExample(existing);
});

const userContentBundles = representativeFlowExamples.map(
  (example) => example.userContentBundle,
);
const representativeSourceRows = representativeFlowExamples.flatMap(
  (example) => example.sourceRows,
);

const entityRecords = sourceData.creatorPortfolioRecords.map((creator) => {
  const config = entityConfig[creator.creatorId];
  if (!config) throw new Error(`Entity config missing: ${creator.creatorId}`);
  const refreshed = revalidationById.get(creator.creatorId);
  const oldProfile = oldProfileEvidenceById.get(creator.creatorId);
  const externalChannelId =
    refreshed?.profile?.channelId ||
    refreshed?.representativeSource?.channelId ||
    oldProfile?.channelId ||
    null;
  return {
    portfolioSubjectId: creator.creatorId,
    displayName: creator.name,
    categoryId: creator.categoryId,
    categoryLabel: creator.categoryLabel,
    entityType: config.entityType,
    provider: {
      providerId: `provider-${creator.creatorId}`,
      displayName: config.providerDisplayName,
    },
    creator: config.creatorDisplayName
      ? {
          creatorId: `creator-${creator.creatorId}`,
          displayName: config.creatorDisplayName,
        }
      : null,
    channel: {
      channelId: `channel-${creator.creatorId}`,
      externalChannelId,
      platform: creator.platform,
      profileUrl: creator.profileUrl,
    },
    normalizationNote:
      config.entityType === 'platform'
        ? '플랫폼 전체 반응과 개별 작성자 반응을 분리해야 한다.'
        : config.entityType === 'brand'
          ? '브랜드 운영 주체와 개별 필자·출연자를 같은 제작자로 간주하지 않는다.'
          : '제작자와 채널 운영 주체가 동일하거나 직접 연결된다.',
  };
});

const rightsRecords = sourceData.creatorPortfolioRecords.map((creator) => {
  const config = rightsConfig[creator.creatorId];
  if (!config) throw new Error(`Rights config missing: ${creator.creatorId}`);
  const refreshed = revalidationById.get(creator.creatorId);
  return {
    portfolioSubjectId: creator.creatorId,
    status: config.status,
    evidenceClass:
      config.status === 'public_conversion_allowed'
        ? 'observed_explicit_permission'
        : 'conservative_policy_default',
    reason: config.reason,
    evidenceUrl:
      config.evidenceUrl ||
      refreshed?.representativeSource?.requestedUrl ||
      creator.contentReviews?.[0]?.url ||
      creator.profileUrl,
    evidenceLocator: config.evidenceLocator || null,
    publicUseBoundary: publicBoundaryFor(config.status),
    attributionRequired: true,
    observedAt:
      config.status === 'public_conversion_allowed' || refreshed
        ? observedAt
        : sourceData.observedAt,
  };
});
const rightsById = new Map(
  rightsRecords.map((record) => [record.portfolioSubjectId, record]),
);

const evidenceRecords = sourceData.creatorPortfolioRecords.map((creator) => {
  const refreshed = revalidationById.get(creator.creatorId);
  const override = evidenceOverrides[creator.creatorId] || {};
  const evidenceUrls = unique([
    creator.profileUrl,
    ...(creator.contentReviews || []).map((content) => content.url),
    refreshed?.representativeSource?.requestedUrl,
  ]);
  const hasCurrentAudience = Boolean(
    refreshed?.representativeSource?.demandSignals?.length ||
      refreshed?.representativeSource?.viewCount ||
      refreshed?.representativeSource?.commentCountText,
  );
  return {
    portfolioSubjectId: creator.creatorId,
    observationWindow: {
      from: sourceData.observedAt,
      to: refreshed ? observedAt : sourceData.observedAt,
    },
    audienceActivity: {
      status: hasCurrentAudience
        ? 'observed_current'
        : creator.demandEvidence
          ? 'observed_prior'
          : 'unknown',
      summary: currentSignalSummary(refreshed, creator),
      visibleMetrics: {
        maxVisibleViewCount:
          refreshed?.representativeSource?.viewCount ||
          creator.observedMetrics.maxVisibleViewCount,
        maxVisibleCommentCount: creator.observedMetrics.maxVisibleCommentCount,
        subscriberText:
          refreshed?.profile?.subscriberText || creator.observedMetrics.subscriberText,
        pageSignals: unique([
          ...(refreshed?.representativeSource?.demandSignals || []),
          ...(creator.observedMetrics.pageDemandSignals || []),
        ]),
      },
      evidenceUrls,
    },
    materialRequest: override.materialRequest || {
      status: 'unknown',
      summary: '자료·파일 요청을 제작자 단위의 독립 증거로 확인하지 못했다.',
    },
    executionOutcome: override.executionOutcome || {
      status: 'unknown',
      summary: '실행·완주·수정 결과를 독립적으로 확인하지 못했다.',
    },
    creatorResponse: override.creatorResponse || {
      status: 'unknown',
      summary:
        '댓글 또는 후기는 보이지만 제작자 본인의 답변 여부와 답변률은 확인하지 못했다.',
    },
    businessEvidence: {
      confirmed: creator.businessConnection.confirmed,
      hypothesis: creator.businessConnection.hypothesis,
      evidenceClass: creator.businessConnection.confirmed.length
        ? 'observed_path'
        : 'unknown',
    },
    evidenceUrls,
  };
});
const evidenceById = new Map(
  evidenceRecords.map((record) => [record.portfolioSubjectId, record]),
);

function logicReadinessFor(creator) {
  if (selectedCreatorIds.includes(creator.creatorId)) return 'Go';
  if (boundaryCreatorIds.includes(creator.creatorId)) return 'Modify';
  if (
    creator.decisionBand === 'Hold' ||
    creator.verdict === 'source_import_required' ||
    creator.verdict === 'single_content_candidate' ||
    !creator.hardGates.sourceRowsForRepresentativeExample
  ) {
    return 'Hold';
  }
  return 'Modify';
}

function publicReadinessFor(creator, logicReadiness, rightsStatus) {
  if (logicReadiness === 'Hold') return 'Hold';
  if (rightsStatus === 'public_conversion_allowed') return 'Go';
  if (rightsStatus === 'private_conversion_only') return 'Hold';
  return 'Modify';
}

function logicReasonFor(creator, logicReadiness) {
  if (logicReadiness === 'Go') {
    return `${preflightConfig[creator.creatorId].saveResult} 실제 source row와 Item 대응이 준비됐다.`;
  }
  if (boundaryCreatorIds.includes(creator.creatorId)) {
    const reasons = {
      'home-ohouse':
        '수요는 강하지만 플랫폼과 개별 고수의 소유권·작성자 귀속을 먼저 분리해야 한다.',
      'family-babybilly':
        '준비물 PDF 수요는 확인됐지만 브랜드 파일 행과 공개 Flow 범위를 합의해야 한다.',
      'health-bigsis':
        '영상 단위 Quick Flow는 가능하지만 Allblanc와 중복되지 않는 구조화된 시리즈를 먼저 골라야 한다.',
      'travel-triple':
        '체크 행은 있으나 저장 15·리뷰 1 수준이고 목적지 정보 최신성 관리 주체가 불분명하다.',
      'hobby-bodeum':
        '수요는 강하지만 대표 영상 다수가 예능형이며 단계형 훈련 행을 그대로 옮길 근거가 부족하다.',
    };
    return reasons[creator.creatorId];
  }
  if (!creator.hardGates.sourceRowsForRepresentativeExample) {
    return '대표 콘텐츠의 전체 source row를 확보하기 전에는 로직 이관 후보로 승격하지 않는다.';
  }
  return '구조 가능성은 있으나 이번 8개와 중복되거나 권리·민감도·첫 행동 근거가 상대적으로 약하다.';
}

const qualificationRecords = sourceData.creatorPortfolioRecords.map((creator) => {
  const rights = rightsById.get(creator.creatorId);
  const evidence = evidenceById.get(creator.creatorId);
  const logicReadiness = logicReadinessFor(creator);
  const publicReadiness = publicReadinessFor(
    creator,
    logicReadiness,
    rights.status,
  );
  const selectionRole = selectedCreatorIds.includes(creator.creatorId)
    ? 'logic_handoff'
    : boundaryCreatorIds.includes(creator.creatorId)
      ? 'boundary_case'
      : logicReadiness === 'Hold'
        ? 'hold'
        : 'watchlist';
  const sourceEvidenceUrls = evidence.evidenceUrls.slice(0, 5);
  const scores = Object.fromEntries(
    Object.entries(creator.scores).map(([key, value]) => [
      key,
      {
        ...value,
        scoreOrigin: '2026-07-23_creator_portfolio_model',
        observationWindow: evidence.observationWindow,
        evidenceUrls: sourceEvidenceUrls,
        currentEvidenceSummary:
          key === 'visibleDemandScore'
            ? evidence.audienceActivity.summary
            : null,
      },
    ]),
  );
  return {
    portfolioSubjectId: creator.creatorId,
    displayName: creator.name,
    categoryId: creator.categoryId,
    categoryLabel: creator.categoryLabel,
    researchDecision: creator.decisionBand,
    researchVerdict: creator.verdict,
    logicReadiness,
    publicReadiness,
    selectionRole,
    rightsStatus: rights.status,
    logicReason: logicReasonFor(creator, logicReadiness),
    publicReason:
      publicReadiness === 'Go'
        ? '직접 확인한 공개 활용 근거가 있으며 source row와 출처 표시가 준비됐다.'
        : publicReadiness === 'Modify'
          ? rights.publicUseBoundary
          : `공개 보류: ${rights.reason}`,
    sourceRowsReady: creator.hardGates.sourceRowsForRepresentativeExample,
    sensitiveBoundaryRequired: creator.hardGates.sensitiveBoundaryRequired,
    legacyTotalScore: creator.totalScore,
    scoreAudit: scores,
  };
});
const qualificationById = new Map(
  qualificationRecords.map((record) => [record.portfolioSubjectId, record]),
);

const logicHandoffSelections = representativeFlowExamples.map((example) => {
  const creator = creatorsById.get(example.creatorId);
  const preflight = preflightConfig[example.creatorId];
  const qualification = qualificationById.get(example.creatorId);
  return {
    creatorId: example.creatorId,
    creatorName: creator.name,
    categoryId: creator.categoryId,
    categoryLabel: creator.categoryLabel,
    bundleId: example.userContentBundle.bundleId,
    bundleTitle: example.userContentBundle.title,
    logicReadiness: qualification.logicReadiness,
    publicReadiness: qualification.publicReadiness,
    rightsStatus: qualification.rightsStatus,
    ...preflight,
    sourceRowCount: example.counts.sourceRows,
    flowCount: example.counts.flows,
    stepCount: example.counts.steps,
    itemCount: example.counts.items,
  };
});

const boundaryCases = boundaryCreatorIds.map((creatorId) => {
  const creator = creatorsById.get(creatorId);
  const qualification = qualificationById.get(creatorId);
  return {
    creatorId,
    creatorName: creator.name,
    categoryLabel: creator.categoryLabel,
    logicReadiness: qualification.logicReadiness,
    publicReadiness: qualification.publicReadiness,
    rightsStatus: qualification.rightsStatus,
    reason: qualification.logicReason,
    promotionCondition:
      creatorId === 'home-ohouse'
        ? '개별 고수 ID·원문 귀속·플랫폼 허가 범위를 연결한다.'
        : creatorId === 'family-babybilly'
          ? 'PDF 전체 row와 브랜드 공개 허가 범위를 확보한다.'
          : creatorId === 'health-bigsis'
            ? '명시된 기간형 재생목록과 영상 순서를 확보한다.'
            : creatorId === 'travel-triple'
              ? '최신 업데이트 책임과 목적지별 구조화 행을 확보한다.'
              : '훈련 목적·대상·순서가 명시된 교육 시리즈를 확보한다.',
  };
});

function validateData() {
  const failures = [];
  if (entityRecords.length !== 27) failures.push('entity record count must be 27');
  if (rightsRecords.length !== 27) failures.push('rights record count must be 27');
  if (evidenceRecords.length !== 27) failures.push('evidence record count must be 27');
  if (
    representativeFlowExamples.length < 6 ||
    representativeFlowExamples.length > 9
  ) {
    failures.push('representative example count must be 6-9');
  }
  const sourceRowIds = new Set(
    representativeSourceRows.map((row) => row.sourceRowId),
  );
  for (const example of representativeFlowExamples) {
    if ((example.userContentBundle.setupFields || []).length > 2) {
      failures.push(`${example.creatorId}: setup fields exceed 2`);
    }
    const flows = example.userContentBundle.map?.flows || [];
    for (const flow of flows) {
      for (const step of flow.steps || []) {
        for (const item of step.items || []) {
          if (!item.sourceRowIds?.length) {
            failures.push(`${item.itemId}: sourceRowIds missing`);
          }
          for (const rowId of item.sourceRowIds || []) {
            if (!sourceRowIds.has(rowId)) {
              failures.push(`${item.itemId}: missing source row ${rowId}`);
            }
          }
          if (!item.sourceTrace?.length) {
            failures.push(`${item.itemId}: sourceTrace missing`);
          }
        }
      }
    }
  }
  for (const rights of rightsRecords) {
    if (
      rights.status === 'public_conversion_allowed' &&
      rights.evidenceClass !== 'observed_explicit_permission'
    ) {
      failures.push(
        `${rights.portfolioSubjectId}: public permission lacks direct evidence`,
      );
    }
  }
  return {
    passed: failures.length === 0,
    failures,
    checks: {
      entityRecords27: entityRecords.length === 27,
      rightsRecords27: rightsRecords.length === 27,
      evidenceRecords27: evidenceRecords.length === 27,
      logicHandoffCount6To9:
        representativeFlowExamples.length >= 6 &&
        representativeFlowExamples.length <= 9,
      allItemsTraceable: !failures.some((failure) =>
        /source row|sourceTrace|sourceRowIds/.test(failure),
      ),
      allSetupFieldsAtMost2: !failures.some((failure) =>
        /setup fields/.test(failure),
      ),
      explicitEvidenceForPublicAllowed: !failures.some((failure) =>
        /public permission/.test(failure),
      ),
      userContentSeparated:
        userContentBundles.every(
          (bundle) =>
            !('scoreAudit' in bundle) &&
            !('publicReadiness' in bundle) &&
            !('logicReadiness' in bundle),
        ),
    },
  };
}

const validation = validateData();
if (!validation.passed) {
  throw new Error(`Data validation failed:\n${validation.failures.join('\n')}`);
}

const output = {
  schemaVersion: 'flowme-creator-portfolio-qualified-v2',
  generatedAt: new Date().toISOString(),
  observedAt,
  purpose:
    '기존 제작자 포트폴리오 27명을 주체·증거·권리 기준으로 재정규화하고 로직 이관 후보 8개를 확정한 handoff 데이터',
  inputs: [
    'docs/content-audit/2026-07-23-creator-flow-portfolio-data-v1.json',
    'docs/content-audit/2026-07-23-creator-flow-portfolio-review-ko.html',
    'docs/content-audit/2026-07-23-creator-flow-portfolio-logic-handoff-ko.md',
    `docs/content-audit/${assetDirName}/targeted-revalidation-v2.json`,
    'docs/specs/2026-07-11-canonical-flow-data-model/spec.md',
    'docs/flow-rules/source-to-flow-conversion-gate.md',
  ],
  evidenceBoundary: [
    '조사상 Go, 로직 이관 Go, 공개 적용 Go는 서로 다른 상태다.',
    '댓글 존재는 audience activity이며 creator response로 자동 승격하지 않는다.',
    '플랫폼 전체 수요는 개별 작성자 수요가 아니다.',
    'public_conversion_allowed는 직접 확인한 허용 문구가 있는 경우에만 사용한다.',
    '앱 구현·seed 반영·canonical 변경·제작자 제휴 의향 검증은 이번 범위가 아니다.',
  ],
  summary: {
    normalizedEntities: entityRecords.length,
    targetedCreatorsReopened: revalidation.summary.targetedCreators,
    profilesReopened: revalidation.summary.profileUrlsOpened,
    representativeSourcesReopened:
      revalidation.summary.representativeSourceUrlsOpened,
    logicHandoffCandidates: logicHandoffSelections.length,
    publicGoCandidates: qualificationRecords.filter(
      (record) => record.publicReadiness === 'Go',
    ).length,
    publicModifyCandidates: qualificationRecords.filter(
      (record) => record.publicReadiness === 'Modify',
    ).length,
    publicHoldCandidates: qualificationRecords.filter(
      (record) => record.publicReadiness === 'Hold',
    ).length,
    boundaryCases: boundaryCases.length,
    contentCounts: {
      flows: logicHandoffSelections.reduce((sum, item) => sum + item.flowCount, 0),
      steps: logicHandoffSelections.reduce((sum, item) => sum + item.stepCount, 0),
      items: logicHandoffSelections.reduce((sum, item) => sum + item.itemCount, 0),
      sourceRows: logicHandoffSelections.reduce(
        (sum, item) => sum + item.sourceRowCount,
        0,
      ),
    },
  },
  entityRecords,
  evidenceRecords,
  rightsRecords,
  qualificationRecords,
  logicHandoffSelections,
  boundaryCases,
  userContentBundles,
  representativeFlowExamples,
  representativeSourceRows,
  validation,
};

function badge(text, tone = 'neutral') {
  return `<span class="badge badge-${tone}">${escapeHtml(text)}</span>`;
}

function decisionTone(value) {
  if (value === 'Go') return 'go';
  if (value === 'Modify') return 'modify';
  return 'hold';
}

function rightsLabel(status) {
  const labels = {
    not_reviewed: '권리 미검토',
    link_metadata_only: '링크·메타만',
    permission_required: '공개 전 허가 필요',
    private_conversion_only: '개인 변환만',
    public_conversion_allowed: '공개 전환 가능',
  };
  return labels[status] || status;
}

function entityLabel(type) {
  const labels = {
    individual_creator: '개인 제작자',
    expert: '전문가',
    brand: '브랜드',
    platform: '플랫폼',
    community: '커뮤니티',
  };
  return labels[type] || type;
}

function renderTrace(item) {
  const traces = item.sourceTrace || [];
  return `<details class="trace">
    <summary>원문 대응 ${traces.length}개</summary>
    <div class="trace-list">
      ${traces
        .map(
          (trace) => `<a href="${escapeHtml(trace.sourceUrl)}" target="_blank" rel="noreferrer">
            ${escapeHtml(trace.sourceLocator)}
          </a>`,
        )
        .join('')}
    </div>
  </details>`;
}

function renderItem(item) {
  return `<li class="item">
    <span class="check" aria-hidden="true"></span>
    <div class="item-body">
      <strong>${escapeHtml(item.itemTitle)}</strong>
      ${item.memo ? `<p>${escapeHtml(item.memo)}</p>` : ''}
      ${renderTrace(item)}
    </div>
  </li>`;
}

function renderStep(step, stepIndex) {
  return `<details class="step" ${stepIndex === 0 ? 'open' : ''}>
    <summary>
      <span>${escapeHtml(step.title)}</span>
      <small>${step.items?.length || 0}개 Item</small>
    </summary>
    <ul class="item-list">${(step.items || []).map(renderItem).join('')}</ul>
  </details>`;
}

function renderFlow(flow, flowIndex) {
  return `<section class="flow">
    <div class="flow-heading">
      <div>
        <small>Flow ${flowIndex + 1}</small>
        <h4>${escapeHtml(flow.title)}</h4>
      </div>
      ${badge(`${flow.steps?.length || 0} Step`, 'neutral')}
    </div>
    ${(flow.steps || []).map(renderStep).join('')}
  </section>`;
}

function renderEvidenceBlock(creatorId) {
  const evidence = evidenceById.get(creatorId);
  return `<div class="evidence-grid">
    <article>
      <span>사용자 반응</span>
      <strong>${escapeHtml(evidence.audienceActivity.status)}</strong>
      <p>${escapeHtml(evidence.audienceActivity.summary)}</p>
    </article>
    <article>
      <span>자료 요청</span>
      <strong>${escapeHtml(evidence.materialRequest.status)}</strong>
      <p>${escapeHtml(evidence.materialRequest.summary)}</p>
    </article>
    <article>
      <span>실행 결과</span>
      <strong>${escapeHtml(evidence.executionOutcome.status)}</strong>
      <p>${escapeHtml(evidence.executionOutcome.summary)}</p>
    </article>
    <article>
      <span>제작자 응답</span>
      <strong>${escapeHtml(evidence.creatorResponse.status)}</strong>
      <p>${escapeHtml(evidence.creatorResponse.summary)}</p>
    </article>
  </div>`;
}

function renderSelectedCard(selection) {
  const creator = creatorsById.get(selection.creatorId);
  const entity = entityRecords.find(
    (record) => record.portfolioSubjectId === selection.creatorId,
  );
  const qualification = qualificationById.get(selection.creatorId);
  const rights = rightsById.get(selection.creatorId);
  const bundle = userContentBundles.find(
    (entry) => entry.bundleId === selection.bundleId,
  );
  const sourceUrl = bundle.sourceUrls[0];
  const imagePath = `${assetDirName}/creator-${selection.creatorId}-source.png`;
  return `<article class="candidate-card" data-kind="selected" data-logic="${qualification.logicReadiness}" data-public="${qualification.publicReadiness}">
    <header class="candidate-header">
      <div>
        <div class="eyebrow">${escapeHtml(selection.categoryLabel)} · ${escapeHtml(entityLabel(entity.entityType))}</div>
        <h3>${escapeHtml(selection.bundleTitle)}</h3>
        <p class="creator-name">${escapeHtml(selection.creatorName)}</p>
      </div>
      <div class="decision-stack">
        ${badge(`로직 ${qualification.logicReadiness}`, decisionTone(qualification.logicReadiness))}
        ${badge(`공개 ${qualification.publicReadiness}`, decisionTone(qualification.publicReadiness))}
      </div>
    </header>
    <div class="promise">${escapeHtml(selection.saveResult)}</div>
    <div class="chip-row">
      ${badge(selection.admissionType, 'neutral')}
      ${badge(selection.naturalArtifact, 'neutral')}
      ${badge(`최초 입력 ${selection.requiredInputCount}개`, 'neutral')}
      ${badge(rightsLabel(selection.rightsStatus), selection.publicReadiness === 'Go' ? 'go' : 'modify')}
    </div>
    <div class="source-panel">
      <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(selection.bundleTitle)} 원문 캡처">
      <div>
        <strong>원문</strong>
        <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(sourceUrl)}</a>
        <p>${escapeHtml(rights.reason)}</p>
      </div>
    </div>
    ${renderEvidenceBlock(selection.creatorId)}
    <div class="preflight-grid">
      <article><span>한 가지 사용자 일</span><p>${escapeHtml(selection.oneUserJob)}</p></article>
      <article><span>첫 행동</span><p>${escapeHtml(selection.firstAction)}</p></article>
      <article><span>날짜 규칙</span><p>${escapeHtml(selection.dateRule)}</p></article>
      <article><span>현재 UX 적합성</span><p>${escapeHtml(selection.uxAssessment)}</p></article>
    </div>
    <details class="full-content">
      <summary>
        <span>실제 Flow 전체 보기</span>
        <small>${selection.flowCount} Flow · ${selection.stepCount} Step · ${selection.itemCount} Item</small>
      </summary>
      <div class="flow-stack">
        ${(bundle.map?.flows || []).map(renderFlow).join('')}
      </div>
    </details>
  </article>`;
}

function renderBoundaryCard(boundary) {
  const creator = creatorsById.get(boundary.creatorId);
  const entity = entityRecords.find(
    (record) => record.portfolioSubjectId === boundary.creatorId,
  );
  const sourceUrl = creator.contentReviews?.[0]?.url || creator.profileUrl;
  return `<article class="boundary-card" data-kind="boundary" data-logic="${boundary.logicReadiness}" data-public="${boundary.publicReadiness}">
    <div class="candidate-header">
      <div>
        <div class="eyebrow">${escapeHtml(boundary.categoryLabel)} · ${escapeHtml(entityLabel(entity.entityType))}</div>
        <h3>${escapeHtml(boundary.creatorName)}</h3>
      </div>
      ${badge('경계 사례', 'modify')}
    </div>
    <p>${escapeHtml(boundary.reason)}</p>
    <div class="promotion"><strong>승격 조건</strong><span>${escapeHtml(boundary.promotionCondition)}</span></div>
    <a class="source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">대표 원문 열기</a>
  </article>`;
}

function renderAuditCard(qualification) {
  const entity = entityRecords.find(
    (record) => record.portfolioSubjectId === qualification.portfolioSubjectId,
  );
  const evidence = evidenceById.get(qualification.portfolioSubjectId);
  return `<article class="audit-card" data-kind="audit" data-logic="${qualification.logicReadiness}" data-public="${qualification.publicReadiness}">
    <div>
      <strong>${escapeHtml(qualification.displayName)}</strong>
      <span>${escapeHtml(qualification.categoryLabel)} · ${escapeHtml(entityLabel(entity.entityType))}</span>
    </div>
    <div class="audit-decisions">
      ${badge(`조사 ${qualification.researchDecision}`, decisionTone(qualification.researchDecision))}
      ${badge(`로직 ${qualification.logicReadiness}`, decisionTone(qualification.logicReadiness))}
      ${badge(`공개 ${qualification.publicReadiness}`, decisionTone(qualification.publicReadiness))}
    </div>
    <p>${escapeHtml(evidence.audienceActivity.summary)}</p>
    <small>${escapeHtml(rightsLabel(qualification.rightsStatus))}</small>
  </article>`;
}

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FlowMe 제작자 포트폴리오 Qualified v2</title>
  <style>
    :root {
      --ink: #17202a;
      --muted: #5c6673;
      --line: #dfe3e8;
      --paper: #ffffff;
      --canvas: #f4f6f8;
      --blue: #1d5d8f;
      --green: #196a4b;
      --gold: #8a5b00;
      --red: #9a3b35;
      --soft-blue: #eaf3fa;
      --soft-green: #e8f5ee;
      --soft-gold: #fff4d6;
      --soft-red: #fbeceb;
    }
    * { box-sizing: border-box; }
    html { color-scheme: light; }
    body {
      margin: 0;
      background: var(--canvas);
      color: var(--ink);
      font-family: Pretendard, "Noto Sans KR", system-ui, sans-serif;
      line-height: 1.55;
      letter-spacing: 0;
    }
    a { color: var(--blue); overflow-wrap: anywhere; }
    button, summary { font: inherit; }
    .page { max-width: 1180px; margin: 0 auto; padding: 28px 20px 80px; }
    .hero {
      background: var(--paper);
      border-bottom: 4px solid var(--ink);
      padding: 26px 0 22px;
    }
    .hero .inner { max-width: 1180px; margin: 0 auto; padding: 0 20px; }
    .hero h1 { margin: 6px 0 8px; font-size: clamp(26px, 4vw, 42px); line-height: 1.16; }
    .hero p { margin: 0; max-width: 780px; color: var(--muted); }
    .eyebrow { color: var(--blue); font-size: 12px; font-weight: 800; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-top: 20px;
    }
    .summary-grid article {
      border: 1px solid var(--line);
      background: var(--paper);
      padding: 14px;
      min-width: 0;
    }
    .summary-grid span { display: block; color: var(--muted); font-size: 12px; }
    .summary-grid strong { display: block; margin-top: 4px; font-size: 24px; }
    .notice {
      margin: 20px 0;
      border-left: 5px solid var(--gold);
      background: var(--soft-gold);
      padding: 14px 16px;
    }
    .notice strong { display: block; margin-bottom: 4px; }
    .filters {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 10px 0;
      background: color-mix(in srgb, var(--canvas) 94%, transparent);
      scrollbar-width: thin;
    }
    .filter {
      flex: 0 0 auto;
      border: 1px solid #aeb7c0;
      background: var(--paper);
      color: var(--ink);
      padding: 8px 12px;
      cursor: pointer;
    }
    .filter.active { background: var(--ink); color: white; border-color: var(--ink); }
    .section-heading { margin: 34px 0 14px; }
    .section-heading h2 { margin: 0; font-size: 24px; }
    .section-heading p { margin: 4px 0 0; color: var(--muted); }
    .candidate-list { display: grid; gap: 18px; }
    .candidate-card, .boundary-card {
      background: var(--paper);
      border: 1px solid var(--line);
      border-top: 4px solid var(--blue);
      padding: 20px;
      min-width: 0;
    }
    .boundary-card { border-top-color: var(--gold); }
    .candidate-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }
    .candidate-header h3 { margin: 3px 0 0; font-size: 22px; line-height: 1.25; }
    .creator-name { margin: 3px 0 0; color: var(--muted); }
    .decision-stack, .chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .decision-stack { justify-content: flex-end; }
    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      border: 1px solid var(--line);
      padding: 3px 8px;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }
    .badge-go { color: var(--green); background: var(--soft-green); border-color: #9ac9b4; }
    .badge-modify { color: var(--gold); background: var(--soft-gold); border-color: #ddc27e; }
    .badge-hold { color: var(--red); background: var(--soft-red); border-color: #e0aaa7; }
    .badge-neutral { color: #34404c; background: #f4f5f6; }
    .promise {
      margin: 16px 0 10px;
      border-left: 4px solid var(--green);
      padding: 10px 12px;
      background: var(--soft-green);
      font-weight: 750;
    }
    .source-panel {
      display: grid;
      grid-template-columns: minmax(260px, 1fr) 1fr;
      gap: 14px;
      margin-top: 16px;
      border: 1px solid var(--line);
      padding: 12px;
    }
    .source-panel img {
      width: 100%;
      max-height: 320px;
      object-fit: cover;
      object-position: top;
      border: 1px solid var(--line);
      background: #eef1f4;
    }
    .source-panel strong { display: block; margin-bottom: 6px; }
    .source-panel p { color: var(--muted); margin: 10px 0 0; }
    .evidence-grid, .preflight-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 12px;
    }
    .evidence-grid article, .preflight-grid article {
      border: 1px solid var(--line);
      padding: 11px;
      min-width: 0;
    }
    .evidence-grid span, .preflight-grid span {
      display: block;
      color: var(--muted);
      font-size: 11px;
      font-weight: 800;
    }
    .evidence-grid strong { display: block; margin: 4px 0; font-size: 13px; }
    .evidence-grid p, .preflight-grid p { margin: 4px 0 0; font-size: 13px; }
    .full-content { margin-top: 14px; border: 1px solid var(--line); }
    .full-content > summary, .step > summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      cursor: pointer;
      padding: 13px;
      font-weight: 850;
    }
    .full-content > summary { background: var(--soft-blue); }
    .full-content > summary small, .step > summary small { color: var(--muted); font-weight: 650; }
    .flow-stack { padding: 10px; }
    .flow { border: 1px solid var(--line); margin-bottom: 10px; }
    .flow:last-child { margin-bottom: 0; }
    .flow-heading {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-bottom: 1px solid var(--line);
    }
    .flow-heading small { color: var(--muted); }
    .flow-heading h4 { margin: 2px 0 0; font-size: 16px; }
    .step { border-bottom: 1px solid var(--line); }
    .step:last-child { border-bottom: 0; }
    .item-list { list-style: none; margin: 0; padding: 0 12px 12px; }
    .item {
      display: grid;
      grid-template-columns: 18px minmax(0, 1fr);
      gap: 9px;
      padding: 10px 0;
      border-top: 1px solid #edf0f2;
    }
    .check { width: 16px; height: 16px; border: 1.5px solid #77818c; margin-top: 3px; }
    .item-body { min-width: 0; }
    .item-body strong { font-size: 14px; overflow-wrap: anywhere; }
    .item-body p { margin: 4px 0 0; color: var(--muted); font-size: 13px; overflow-wrap: anywhere; }
    .trace { margin-top: 6px; }
    .trace summary { color: var(--blue); cursor: pointer; font-size: 12px; }
    .trace-list { display: grid; gap: 4px; padding: 7px 0 0; }
    .trace-list a { font-size: 12px; }
    .boundary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .promotion { display: grid; gap: 3px; background: var(--soft-gold); padding: 10px; }
    .promotion span { color: #5f470c; }
    .source-link { display: inline-block; margin-top: 10px; }
    .audit-list { display: grid; gap: 8px; }
    .audit-card {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px 16px;
      align-items: start;
      background: var(--paper);
      border: 1px solid var(--line);
      padding: 12px;
    }
    .audit-card span { display: block; color: var(--muted); font-size: 12px; }
    .audit-card p { grid-column: 1 / -1; margin: 0; color: var(--muted); font-size: 13px; }
    .audit-card small { color: var(--gold); }
    .audit-decisions { display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-end; }
    .hidden { display: none !important; }
    .footer { margin-top: 36px; color: var(--muted); font-size: 12px; }
    @media (max-width: 760px) {
      .page, .hero .inner { padding-left: 12px; padding-right: 12px; }
      .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .candidate-card, .boundary-card { padding: 14px; }
      .candidate-header { display: grid; }
      .decision-stack { justify-content: flex-start; }
      .source-panel { grid-template-columns: minmax(0, 1fr); }
      .source-panel img { max-height: 260px; }
      .evidence-grid, .preflight-grid { grid-template-columns: minmax(0, 1fr); }
      .boundary-grid { grid-template-columns: minmax(0, 1fr); }
      .audit-card { grid-template-columns: minmax(0, 1fr); }
      .audit-decisions { justify-content: flex-start; }
      .audit-card p { grid-column: auto; }
      .full-content > summary, .step > summary { align-items: flex-start; }
    }
  </style>
</head>
<body>
  <header class="hero">
    <div class="inner">
      <div class="eyebrow">2026-07-27 · creator portfolio qualification</div>
      <h1>제작자 후보 27명, 로직 이관 8개로 정리</h1>
      <p>조사상 유망함과 실제 로직 전환 가능성, 공개 활용 가능성을 분리했다. 아래 8개는 source row 기반 로직 검토 대상이며 공개 Go는 별도 권리 근거가 있는 경우만 표시한다.</p>
      <div class="summary-grid">
        <article><span>정규화한 주체</span><strong>${output.summary.normalizedEntities}명</strong></article>
        <article><span>다시 연 원문</span><strong>${output.summary.representativeSourcesReopened}개</strong></article>
        <article><span>로직 이관</span><strong>${output.summary.logicHandoffCandidates}개</strong></article>
        <article><span>공개 Go</span><strong>${output.summary.publicGoCandidates}개</strong></article>
      </div>
    </div>
  </header>
  <main class="page">
    <div class="notice">
      <strong>판정 읽는 법</strong>
      조사 Go는 인기와 가능성, 로직 Go는 source row와 실행 구조, 공개 Go는 직접 확인한 권리 근거까지 통과했다는 뜻이다. 세 상태를 합치지 않는다.
    </div>
    <nav class="filters" aria-label="후보 필터">
      <button class="filter active" data-filter="all">전체</button>
      <button class="filter" data-filter="selected">로직 이관 8</button>
      <button class="filter" data-filter="public-go">공개 Go</button>
      <button class="filter" data-filter="public-modify">공개 Modify</button>
      <button class="filter" data-filter="public-hold">공개 Hold</button>
      <button class="filter" data-filter="boundary">경계 사례</button>
    </nav>

    <section>
      <div class="section-heading">
        <h2>로직 이관 후보</h2>
        <p>주요 결과, 원문 캡처, 권리 상태, 전체 Flow를 한 카드에서 확인한다.</p>
      </div>
      <div class="candidate-list">${logicHandoffSelections.map(renderSelectedCard).join('')}</div>
    </section>

    <section>
      <div class="section-heading">
        <h2>경계 사례 5개</h2>
        <p>주제가 아니라 정확히 무엇을 확보하면 승격되는지 적었다.</p>
      </div>
      <div class="boundary-grid">${boundaryCases.map(renderBoundaryCard).join('')}</div>
    </section>

    <section>
      <div class="section-heading">
        <h2>27명 재분류 원장</h2>
        <p>플랫폼·브랜드·제작자를 분리하고 조사·로직·공개 판정을 나란히 본다.</p>
      </div>
      <div class="audit-list">${qualificationRecords.map(renderAuditCard).join('')}</div>
    </section>
    <p class="footer">이 파일은 콘텐츠·로직 검토 자료다. 앱 구현, 공개 허가, 제작자 제휴 의향, 실제 사용자 검증을 의미하지 않는다.</p>
  </main>
  <script>
    const filters = [...document.querySelectorAll('.filter')];
    const cards = [...document.querySelectorAll('[data-kind]')];
    function matches(card, filter) {
      if (filter === 'all') return true;
      if (filter === 'selected') return card.dataset.kind === 'selected';
      if (filter === 'boundary') return card.dataset.kind === 'boundary';
      if (filter === 'public-go') return card.dataset.public === 'Go';
      if (filter === 'public-modify') return card.dataset.public === 'Modify';
      if (filter === 'public-hold') return card.dataset.public === 'Hold';
      return true;
    }
    filters.forEach((button) => {
      button.addEventListener('click', () => {
        filters.forEach((entry) => entry.classList.toggle('active', entry === button));
        cards.forEach((card) => card.classList.toggle('hidden', !matches(card, button.dataset.filter)));
      });
    });
  </script>
</body>
</html>`;

const handoff = `# 제작자 포트폴리오 Qualified v2 · 로직 세션 Handoff

Date: ${observedAt}

## 목적

기존 27명 제작자 조사를 그대로 앱에 넣지 않고, 주체·증거·권리 상태를 정규화한 뒤 source row가 준비된 대표 8개만 canonical dry-run 대상으로 넘긴다.

## 읽기 순서

1. \`docs/content-audit/2026-07-27-creator-portfolio-qualified-v2.json\`
2. \`docs/content-audit/2026-07-27-creator-portfolio-qualified-review-ko.html\`
3. \`docs/content-audit/${assetDirName}/targeted-revalidation-v2.json\`
4. \`docs/specs/2026-07-11-canonical-flow-data-model/spec.md\`
5. \`docs/flow-rules/source-to-flow-conversion-gate.md\`

## 로직 이관 8개

${logicHandoffSelections
  .map(
    (selection, index) =>
      `${index + 1}. **${selection.bundleTitle}** · ${selection.creatorName} · ${selection.admissionType} · 입력 ${selection.requiredInputCount}개 · 공개 ${selection.publicReadiness}`,
  )
  .join('\n')}

## 데이터 사용 경계

- \`userContentBundles\`: 사용자에게 보여줄 Flow 콘텐츠다. 내부 점수와 권리 검토 문구를 섞지 않는다.
- \`representativeSourceRows\`: Item provenance의 기준이다.
- \`entityRecords\`: provider, creator, channel을 분리한 내부 귀속 데이터다.
- \`evidenceRecords\`: 사용자 반응, 자료 요청, 실행 결과, 제작자 응답을 분리한 내부 증거다.
- \`rightsRecords\`: 공개 가능 범위다. \`public_conversion_allowed\`는 생활코딩 WEB1의 명시적 정책에만 적용한다.
- \`qualificationRecords\`: 조사·로직·공개 판정을 분리한 내부 검토 데이터다.

## Canonical dry-run 순서

1. 각 Bundle에서 primary source 하나와 natural artifact 하나를 고정한다.
2. SourceRow → Item → Step → Flow → Bundle 연결을 보존한다.
3. Item은 독립 체크 가치가 있는 source row만 유지한다.
4. 날짜가 없는 후보에는 날짜를 만들지 않는다.
5. 입력은 기존 0~2개보다 늘리지 않는다.
6. link_metadata_only 후보는 영상·레시피 내부 내용을 새 Item으로 확장하지 않는다.
7. permission_required 또는 private_conversion_only 후보는 공개 seed가 아니라 내부 fixture로만 사용한다.
8. projection은 calendar/checklist/sheet/memo 결과를 같은 canonical Item에서 만든다.

## 공개 판정

- **Go**: 생활코딩 WEB1. 해당 코스의 공개 수정·배포 정책을 직접 확인했다.
- **Modify**: 구조는 준비됐지만 권리자 확인 또는 제목·URL만 남기는 범위 축소가 필요하다.
- **Hold**: 개인 변환 전용이거나 source row·최신성·민감도 조건이 충족되지 않았다.

## 하지 말 것

- 앱 코드나 seed에 바로 넣지 않는다.
- 기존의 단일 권리 준비 boolean을 공개 허가로 해석하지 않는다.
- 플랫폼 수요를 개별 제작자 수요로 복사하지 않는다.
- 댓글 수를 제작자 응답 증거로 사용하지 않는다.
- 원문에 없는 행동·날짜·반복·완료 기준을 추가하지 않는다.
- 유료 파일, 비밀번호 파일, 영상 자막, 레시피 전문을 복제하지 않는다.

## 로직 세션 완료 보고

- 8개별 canonical pass / revise / hold
- Item 유지·묶음·삭제 수
- 필요한 타입·projection 변경
- 공개 가능 범위와 내부 fixture 범위
- 앱 구현 세션으로 넘길 최종 후보
`;

await fs.mkdir(assetDir, { recursive: true });
await fs.writeFile(outputJsonPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
await fs.writeFile(outputHtmlPath, html, 'utf8');
await fs.writeFile(outputHandoffPath, handoff, 'utf8');

console.log(
  JSON.stringify(
    {
      outputJsonPath,
      outputHtmlPath,
      outputHandoffPath,
      summary: output.summary,
      validation,
    },
    null,
    2,
  ),
);
