import {
  assessSourceBackedManualRegistrationReadiness,
  buildSourceBackedFlowMapPublishPackage,
  canonicalizeManualRegistrationSourceUrl,
  getSourceBackedFlowMapQualityDecision,
  getUrlFirstLookupableSourceBackedFlowMaps,
  type SourceBackedFlowMapCandidateStatus,
  type SourceBackedManualRegistrationIssueCode,
  type SourceBackedMyFlowMap,
  sourceBackedMyFlowMaps,
} from './source-backed-my-flow';
import type { RiskLevel } from './types';
import { lookupUrlFirstP0Input } from './url-first-lookup';

export type SourceBackedManualRegistrationQaStatus = 'qa_pass' | 'registration_hold' | 'lookup_blocked';

export type SourceBackedManualRegistrationIssueCount = {
  label: string;
  mapCount: number;
  stepCount: number;
};

export type SourceBackedManualRegistrationIssueCounts = Record<
  SourceBackedManualRegistrationIssueCode,
  SourceBackedManualRegistrationIssueCount
>;

export type SourceBackedManualRegistrationQaRow = {
  mapId: string;
  title: string;
  sourceTitle: string;
  sourceUrl: string;
  qualityStatus: SourceBackedFlowMapCandidateStatus;
  directRouteEnabled: boolean;
  lookupEligible: boolean;
  status: SourceBackedManualRegistrationQaStatus;
  statusLabel: string;
  issueCodes: SourceBackedManualRegistrationIssueCode[];
  flowSlugs: string[];
  stepCount: number;
  missingSourceTraceStepCount: number;
};

export type SourceBackedManualRegistrationRunbookStep = {
  title: string;
  doneWhen: string;
  evidence: string;
};

export type SourceBackedManualRegistrationRehearsal = {
  candidateUrl: string;
  candidateMemo: string;
  mapId: string;
  flowSlug: string;
  qaStatus: SourceBackedManualRegistrationQaStatus;
  qaNote: string;
  lookupStatus: string;
  routeHref?: string;
  nextOperatorAction: string;
};

export type SourceBackedManualRegistrationDuplicateReason =
  | 'actual_duplicate'
  | 'broad_source_shared'
  | 'normal_multi_flow'
  | 'canonicalization_gap';

export type SourceBackedManualRegistrationDuplicateGroup = {
  canonicalUrl: string;
  reason: SourceBackedManualRegistrationDuplicateReason;
  reasonLabel: string;
  mapIds: string[];
  primaryMapId: string;
  secondaryMapIds: string[];
  operatorAction: string;
};

export type SourceBackedManualRegistrationSourceTraceEffort = 'low' | 'medium' | 'high';

export type SourceBackedManualRegistrationSourceTraceQueueItem = {
  priority: number;
  mapId: string;
  title: string;
  sourceUrl: string;
  flowSlugs: string[];
  lookupRepresentative: boolean;
  productScore: number;
  qualityStatus: SourceBackedFlowMapCandidateStatus;
  riskLevel?: RiskLevel;
  stepCount: number;
  missingSourceTraceStepCount: number;
  remediationEffort: SourceBackedManualRegistrationSourceTraceEffort;
  priorityReason: string;
  nextAction: string;
};

export type SourceBackedManualRegistrationQaReport = {
  generatedAt: string;
  summary: {
    totalMaps: number;
    lookupEligibleCount: number;
    qaPassCount: number;
    registrationHoldCount: number;
    lookupBlockedCount: number;
    issueCounts: SourceBackedManualRegistrationIssueCounts;
  };
  duplicateGroups: SourceBackedManualRegistrationDuplicateGroup[];
  sourceTraceQueue: SourceBackedManualRegistrationSourceTraceQueueItem[];
  rows: SourceBackedManualRegistrationQaRow[];
  runbook: SourceBackedManualRegistrationRunbookStep[];
  rehearsal: SourceBackedManualRegistrationRehearsal;
};

export type SourceBackedManualRegistrationQaReportOptions = {
  generatedAt?: string;
};

const ISSUE_LABELS: Record<SourceBackedManualRegistrationIssueCode, string> = {
  duplicate_canonical_source_url: '중복 canonical URL',
  missing_source_trace: 'sourceTrace 누락',
  empty_registered_steps: 'Step 없음',
  missing_source_url: 'sourceUrl 누락',
};

const ISSUE_CODES: SourceBackedManualRegistrationIssueCode[] = [
  'duplicate_canonical_source_url',
  'missing_source_trace',
  'empty_registered_steps',
  'missing_source_url',
];

const STATUS_LABELS: Record<SourceBackedManualRegistrationQaStatus, string> = {
  qa_pass: 'QA 통과',
  registration_hold: '등록 보류',
  lookup_blocked: 'lookup 차단',
};

const RUNBOOK: SourceBackedManualRegistrationRunbookStep[] = [
  {
    title: '후보 Markdown 확인',
    doneWhen: 'canonical URL, original/source URL, 사용자 제목/메모, 마지막 lookup 상태가 분리되어 있다.',
    evidence: 'URL-first candidate handoff Markdown 또는 /flows 제작용 정보 패널',
  },
  {
    title: 'source-backed Flow 등록',
    doneWhen: 'sourceUrl을 가진 Flow Map, 실행 가능한 Step, sourceTrace, 날짜/상대일/반복 규칙, risk 결정을 남긴다.',
    evidence: 'source-backed map + child Flow bundle + FlowItemDetail/sourceTrace',
  },
  {
    title: 'manual registration QA 통과',
    doneWhen: '중복 canonical URL, sourceTrace 누락, Step 없음, sourceUrl 누락 이슈가 없다.',
    evidence: 'assessSourceBackedManualRegistrationReadiness 결과',
  },
  {
    title: 'URL hit 확인',
    doneWhen: 'canonical URL lookup이 hit을 반환하고 /flow-maps/[map] 시작 흐름으로 이동한다.',
    evidence: 'lookupUrlFirstP0Input 결과와 URL lookup/start 테스트',
  },
];

export function buildSourceBackedManualRegistrationQaReport(
  options: SourceBackedManualRegistrationQaReportOptions = {},
): SourceBackedManualRegistrationQaReport {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const readiness = assessSourceBackedManualRegistrationReadiness();
  const lookupEligibleMaps = getUrlFirstLookupableSourceBackedFlowMaps();
  const lookupEligibleIds = new Set(lookupEligibleMaps.map((map) => map.id));
  const issueCodesByMap = new Map<string, Set<SourceBackedManualRegistrationIssueCode>>();
  const issueCounts = buildEmptyIssueCounts();

  for (const issue of readiness.issues) {
    issueCounts[issue.code] = {
      label: ISSUE_LABELS[issue.code],
      mapCount: issue.mapIds.length,
      stepCount: issue.stepIds?.length ?? 0,
    };

    for (const mapId of issue.mapIds) {
      const issueCodes = issueCodesByMap.get(mapId) ?? new Set<SourceBackedManualRegistrationIssueCode>();
      issueCodes.add(issue.code);
      issueCodesByMap.set(mapId, issueCodes);
    }
  }

  const rows = sourceBackedMyFlowMaps.map((map): SourceBackedManualRegistrationQaRow => {
    const decision = getSourceBackedFlowMapQualityDecision(map.id);
    const issueCodes = [...(issueCodesByMap.get(map.id) ?? new Set<SourceBackedManualRegistrationIssueCode>())];
    const lookupEligible = lookupEligibleIds.has(map.id);
    const status: SourceBackedManualRegistrationQaStatus = !lookupEligible
      ? 'lookup_blocked'
      : issueCodes.length > 0
        ? 'registration_hold'
        : 'qa_pass';
    const steps = getSourceBackedPublishSteps(map.id);

    return {
      mapId: map.id,
      title: map.title,
      sourceTitle: map.sourceTitle,
      sourceUrl: map.sourceUrl,
      qualityStatus: decision.status,
      directRouteEnabled: decision.directRouteEnabled,
      lookupEligible,
      status,
      statusLabel: STATUS_LABELS[status],
      issueCodes,
      flowSlugs: map.flowSlugs,
      stepCount: steps.length,
      missingSourceTraceStepCount: steps.filter((step) => !step.sourceTrace).length,
    };
  });

  return {
    generatedAt,
    summary: {
      totalMaps: rows.length,
      lookupEligibleCount: rows.filter((row) => row.lookupEligible).length,
      qaPassCount: rows.filter((row) => row.status === 'qa_pass').length,
      registrationHoldCount: rows.filter((row) => row.status === 'registration_hold').length,
      lookupBlockedCount: rows.filter((row) => row.status === 'lookup_blocked').length,
      issueCounts,
    },
    duplicateGroups: buildDuplicateCanonicalUrlGroups(lookupEligibleMaps),
    sourceTraceQueue: buildSourceTraceRemediationQueue(rows),
    rows: sortReportRows(rows),
    runbook: RUNBOOK,
    rehearsal: buildAirconManualRegistrationRehearsal(rows),
  };
}

function buildDuplicateCanonicalUrlGroups(
  maps: SourceBackedMyFlowMap[],
): SourceBackedManualRegistrationDuplicateGroup[] {
  const groups = new Map<string, SourceBackedMyFlowMap[]>();
  for (const map of maps) {
    const canonicalUrl = canonicalizeManualRegistrationSourceUrl(map.sourceUrl);
    const current = groups.get(canonicalUrl) ?? [];
    current.push(map);
    groups.set(canonicalUrl, current);
  }

  return [...groups.entries()]
    .filter(([, groupMaps]) => groupMaps.length > 1)
    .map(([canonicalUrl, groupMaps]) => buildDuplicateCanonicalUrlGroup(canonicalUrl, groupMaps))
    .sort((left, right) => left.canonicalUrl.localeCompare(right.canonicalUrl));
}

function buildDuplicateCanonicalUrlGroup(
  canonicalUrl: string,
  maps: SourceBackedMyFlowMap[],
): SourceBackedManualRegistrationDuplicateGroup {
  const orderedMaps = maps.slice().sort(compareDuplicateGroupMapPriority);
  const [primaryMap, ...secondaryMaps] = orderedMaps;
  const reason = classifyDuplicateCanonicalUrlGroup(canonicalUrl, maps);

  return {
    canonicalUrl,
    reason,
    reasonLabel: DUPLICATE_REASON_LABELS[reason],
    mapIds: maps.map((map) => map.id).sort(),
    primaryMapId: primaryMap.id,
    secondaryMapIds: secondaryMaps.map((map) => map.id).sort(),
    operatorAction: buildDuplicateGroupOperatorAction(reason, primaryMap.id, secondaryMaps.map((map) => map.id).sort()),
  };
}

const DUPLICATE_REASON_LABELS: Record<SourceBackedManualRegistrationDuplicateReason, string> = {
  actual_duplicate: '실제 중복 후보',
  broad_source_shared: '넓은 출처 URL 공유',
  normal_multi_flow: '정상 다중 Flow 후보',
  canonicalization_gap: 'canonicalization 점검',
};

const QUALITY_STATUS_PRIORITY: Record<SourceBackedFlowMapCandidateStatus, number> = {
  representative: 5,
  candidate: 4,
  revise: 3,
  park: 2,
  reject: 1,
};

function compareDuplicateGroupMapPriority(left: SourceBackedMyFlowMap, right: SourceBackedMyFlowMap): number {
  const leftDecision = getSourceBackedFlowMapQualityDecision(left.id);
  const rightDecision = getSourceBackedFlowMapQualityDecision(right.id);
  const scoreDiff = rightDecision.productScore - leftDecision.productScore;
  if (scoreDiff !== 0) return scoreDiff;
  const statusDiff = QUALITY_STATUS_PRIORITY[rightDecision.status] - QUALITY_STATUS_PRIORITY[leftDecision.status];
  if (statusDiff !== 0) return statusDiff;
  return left.id.localeCompare(right.id);
}

function classifyDuplicateCanonicalUrlGroup(
  canonicalUrl: string,
  maps: SourceBackedMyFlowMap[],
): SourceBackedManualRegistrationDuplicateReason {
  const rawSourceUrls = new Set(maps.map((map) => map.sourceUrl.trim()).filter(Boolean));
  if (rawSourceUrls.size > 1) return 'canonicalization_gap';
  if (isBroadSourceUrl(canonicalUrl)) return 'broad_source_shared';
  if (maps.length > 2) return 'normal_multi_flow';
  return 'actual_duplicate';
}

function isBroadSourceUrl(canonicalUrl: string): boolean {
  try {
    const url = new URL(canonicalUrl);
    const path = url.pathname.replace(/\/+$/, '');
    if (!path) return true;
    if (url.hostname.includes('youtube.com') && path.startsWith('/@')) return true;
    return false;
  } catch {
    return false;
  }
}

function buildDuplicateGroupOperatorAction(
  reason: SourceBackedManualRegistrationDuplicateReason,
  primaryMapId: string,
  secondaryMapIds: string[],
): string {
  const secondary = secondaryMapIds.join(', ');
  if (reason === 'broad_source_shared') {
    return `Keep ${primaryMapId} only if it has the best concrete job; narrow sourceUrl for ${secondary} to exact article/video URLs or set directRouteEnabled=false.`;
  }
  if (reason === 'canonicalization_gap') {
    return `Compare raw URLs, keep ${primaryMapId} as the canonical hit, then normalize or split the remaining sourceUrl values before enabling lookup.`;
  }
  if (reason === 'normal_multi_flow') {
    return `Keep ${primaryMapId} as the default hit and route ${secondary} through the Flow Map or set directRouteEnabled=false until the user can choose variants.`;
  }
  return `Keep ${primaryMapId} as the canonical hit; merge ${secondary} into it or set directRouteEnabled=false on the overlapping map.`;
}

function buildEmptyIssueCounts(): SourceBackedManualRegistrationIssueCounts {
  return {
    duplicate_canonical_source_url: { label: ISSUE_LABELS.duplicate_canonical_source_url, mapCount: 0, stepCount: 0 },
    missing_source_trace: { label: ISSUE_LABELS.missing_source_trace, mapCount: 0, stepCount: 0 },
    empty_registered_steps: { label: ISSUE_LABELS.empty_registered_steps, mapCount: 0, stepCount: 0 },
    missing_source_url: { label: ISSUE_LABELS.missing_source_url, mapCount: 0, stepCount: 0 },
  };
}

function buildSourceTraceRemediationQueue(
  rows: SourceBackedManualRegistrationQaRow[],
): SourceBackedManualRegistrationSourceTraceQueueItem[] {
  return rows
    .filter((row) => row.issueCodes.includes('missing_source_trace') && row.missingSourceTraceStepCount > 0)
    .map((row) => {
      const decision = getSourceBackedFlowMapQualityDecision(row.mapId);
      const riskLevel = getMapDominantRiskLevel(row.mapId);
      const remediationEffort = estimateSourceTraceRemediationEffort(row.missingSourceTraceStepCount, riskLevel);
      return {
        priority: 0,
        mapId: row.mapId,
        title: row.title,
        sourceUrl: row.sourceUrl,
        flowSlugs: row.flowSlugs,
        lookupRepresentative: row.lookupEligible,
        productScore: decision.productScore,
        qualityStatus: decision.status,
        ...(riskLevel ? { riskLevel } : {}),
        stepCount: row.stepCount,
        missingSourceTraceStepCount: row.missingSourceTraceStepCount,
        remediationEffort,
        priorityReason: buildSourceTracePriorityReason(row, decision.productScore, riskLevel, remediationEffort),
        nextAction:
          'Add one sourceTrace line to every executable Step from the existing source row or section, then rerun manual registration QA.',
      };
    })
    .sort(compareSourceTraceQueueItems)
    .map((item, index) => ({ ...item, priority: index + 1 }));
}

function getMapDominantRiskLevel(mapId: string): RiskLevel | undefined {
  const publishPackage = buildSourceBackedFlowMapPublishPackage(mapId);
  if (!publishPackage) return undefined;
  const riskLevels = new Set(publishPackage.creator.sourceRows.map((row) => row.riskLevel).filter(Boolean));
  if (riskLevels.has('medical_sensitive')) return 'medical_sensitive';
  if (riskLevels.has('financial_sensitive')) return 'financial_sensitive';
  if (riskLevels.has('medium')) return 'medium';
  if (riskLevels.has('low')) return 'low';
  return undefined;
}

function estimateSourceTraceRemediationEffort(
  missingSourceTraceStepCount: number,
  riskLevel?: RiskLevel,
): SourceBackedManualRegistrationSourceTraceEffort {
  if (riskLevel === 'medical_sensitive' || riskLevel === 'financial_sensitive') {
    return 'high';
  }
  if (missingSourceTraceStepCount <= 5) return 'low';
  if (missingSourceTraceStepCount <= 10) return 'medium';
  return 'high';
}

function compareSourceTraceQueueItems(
  left: SourceBackedManualRegistrationSourceTraceQueueItem,
  right: SourceBackedManualRegistrationSourceTraceQueueItem,
): number {
  const scoreDiff = sourceTracePriorityScore(right) - sourceTracePriorityScore(left);
  if (scoreDiff !== 0) return scoreDiff;
  const missingDiff = left.missingSourceTraceStepCount - right.missingSourceTraceStepCount;
  if (missingDiff !== 0) return missingDiff;
  return left.mapId.localeCompare(right.mapId);
}

function sourceTracePriorityScore(item: SourceBackedManualRegistrationSourceTraceQueueItem): number {
  const effortScore: Record<SourceBackedManualRegistrationSourceTraceEffort, number> = {
    low: 12,
    medium: 6,
    high: 0,
  };
  const riskScore: Record<RiskLevel, number> = {
    low: 6,
    medium: 4,
    medical_sensitive: 0,
    financial_sensitive: 0,
  };
  return (
    (item.lookupRepresentative ? 1000 : 0) +
    item.productScore * 100 +
    QUALITY_STATUS_PRIORITY[item.qualityStatus] * 10 +
    effortScore[item.remediationEffort] +
    (item.riskLevel ? riskScore[item.riskLevel] : 0)
  );
}

function buildSourceTracePriorityReason(
  row: SourceBackedManualRegistrationQaRow,
  productScore: number,
  riskLevel: RiskLevel | undefined,
  remediationEffort: SourceBackedManualRegistrationSourceTraceEffort,
): string {
  const lookup = row.lookupEligible ? 'lookup representative' : 'not lookupable';
  const risk = riskLevel ?? 'unknown risk';
  return `${lookup}; ${row.qualityStatus} start UX; productScore ${productScore}; ${row.missingSourceTraceStepCount}/${row.stepCount} Steps missing sourceTrace; ${risk}; ${remediationEffort} sourceTrace effort.`;
}

function getSourceBackedPublishSteps(mapId: string): { id: string; sourceTrace?: string }[] {
  const publishPackage = buildSourceBackedFlowMapPublishPackage(mapId);
  if (!publishPackage) return [];
  return publishPackage.public.childFlows.flatMap((flow) => flow.steps.map((step) => ({
    id: step.id,
    ...(step.sourceTrace ? { sourceTrace: step.sourceTrace } : {}),
  })));
}

function sortReportRows(rows: SourceBackedManualRegistrationQaRow[]): SourceBackedManualRegistrationQaRow[] {
  const statusOrder: Record<SourceBackedManualRegistrationQaStatus, number> = {
    registration_hold: 0,
    qa_pass: 1,
    lookup_blocked: 2,
  };

  return rows.slice().sort((left, right) => {
    const statusDiff = statusOrder[left.status] - statusOrder[right.status];
    if (statusDiff !== 0) return statusDiff;
    return left.mapId.localeCompare(right.mapId);
  });
}

function buildAirconManualRegistrationRehearsal(
  rows: SourceBackedManualRegistrationQaRow[],
): SourceBackedManualRegistrationRehearsal {
  const candidateUrl = 'https://www.samsungsvc.co.kr/solution/28524';
  const lookup = lookupUrlFirstP0Input(candidateUrl);
  const row = rows.find((item) => item.mapId === 'aircon-filter-cleaning');
  const issueLabels = row?.issueCodes.map((code) => ISSUE_LABELS[code]) ?? [];
  const qaStatus = row?.status ?? 'lookup_blocked';
  const qaNote = issueLabels.length > 0 ? `보완 필요: ${issueLabels.join(', ')}` : '현재 QA 기준 통과';

  return {
    candidateUrl,
    candidateMemo: '삼성서비스 에어컨 1way 필터 청소 안내를 2주 반복 관리 Flow로 옮기는 샘플',
    mapId: 'aircon-filter-cleaning',
    flowSlug: 'source-backed-aircon-filter-cleaning',
    qaStatus,
    qaNote,
    lookupStatus: lookup.status,
    ...(lookup.routeHref ? { routeHref: lookup.routeHref } : {}),
    nextOperatorAction:
      qaStatus === 'qa_pass'
        ? '후보 카드에서 Flow 결과로 이동한 뒤 start/export/My Flow 저장 경로를 확인한다.'
        : 'Step detail의 sourceTrace 근거와 중복 URL 상태를 보완한 뒤 readiness QA를 다시 실행한다.',
  };
}

export function buildSourceBackedManualRegistrationQaHtml(
  report: SourceBackedManualRegistrationQaReport,
): string {
  const issueCards = ISSUE_CODES.map((code) => {
    const count = report.summary.issueCounts[code];
    return `<div class="metric issue"><span>${escapeHtml(count.label)}</span><strong>${count.mapCount}</strong><small>${count.stepCount} steps</small></div>`;
  }).join('');

  const runbookItems = report.runbook.map((step, index) => `
    <li>
      <b>${index + 1}. ${escapeHtml(step.title)}</b>
      <p>${escapeHtml(step.doneWhen)}</p>
      <small>${escapeHtml(step.evidence)}</small>
    </li>
  `).join('');

  const rows = report.rows.map((row) => `
    <tr class="${row.status}">
      <td><b>${escapeHtml(row.mapId)}</b><br><small>${escapeHtml(row.title)}</small></td>
      <td>${escapeHtml(row.statusLabel)}${row.lookupEligible ? '<br><small>lookup 가능</small>' : ''}</td>
      <td>${escapeHtml(row.qualityStatus)}<br><small>${row.directRouteEnabled ? 'directRouteEnabled' : 'directRoute disabled'}</small></td>
      <td>${row.stepCount}<br><small>sourceTrace 누락 ${row.missingSourceTraceStepCount}</small></td>
      <td>${row.issueCodes.length > 0 ? row.issueCodes.map((code) => `<span class="chip">${escapeHtml(ISSUE_LABELS[code])}</span>`).join('') : '<span class="ok">이슈 없음</span>'}</td>
      <td><a href="${escapeAttribute(row.sourceUrl)}">원문</a><br><small>${escapeHtml(row.flowSlugs.join(', '))}</small></td>
    </tr>
  `).join('');
  const duplicateGroupRows = report.duplicateGroups.map((group) => `
    <tr>
      <td><b>${escapeHtml(group.reasonLabel)}</b><br><small>${escapeHtml(group.canonicalUrl)}</small></td>
      <td>${escapeHtml(group.primaryMapId)}<br><small>기본 hit 후보</small></td>
      <td>${group.secondaryMapIds.map((mapId) => `<span class="chip">${escapeHtml(mapId)}</span>`).join('')}</td>
      <td>${escapeHtml(group.operatorAction)}</td>
    </tr>
  `).join('');
  const sourceTraceQueueRows = report.sourceTraceQueue.map((item) => `
    <tr>
      <td><b>${item.priority}. ${escapeHtml(item.mapId)}</b><br><small>${escapeHtml(item.title)}</small></td>
      <td>${item.lookupRepresentative ? 'lookup representative' : 'not lookupable'}<br><small>${escapeHtml(item.qualityStatus)} start UX / productScore ${item.productScore}</small></td>
      <td>${item.missingSourceTraceStepCount}/${item.stepCount}<br><small>${escapeHtml(item.remediationEffort)} effort</small></td>
      <td>${escapeHtml(item.riskLevel ?? 'unknown')}</td>
      <td>${escapeHtml(item.priorityReason)}<br><small>${escapeHtml(item.nextAction)}</small></td>
      <td><a href="${escapeAttribute(item.sourceUrl)}">source</a><br><small>${escapeHtml(item.flowSlugs.join(', '))}</small></td>
    </tr>
  `).join('');

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>수동 Flow 등록 QA 리포트</title>
  <style>
    :root { color-scheme: light; --ink:#18212f; --muted:#647084; --line:#d8dee8; --bg:#f6f8fb; --panel:#ffffff; --accent:#0f766e; --warn:#b45309; --block:#991b1b; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Arial, "Noto Sans KR", sans-serif; color:var(--ink); background:var(--bg); line-height:1.55; }
    main { max-width:1180px; margin:0 auto; padding:32px 20px 56px; }
    header { margin-bottom:24px; }
    h1 { margin:0 0 8px; font-size:32px; letter-spacing:0; }
    h2 { margin:32px 0 12px; font-size:22px; letter-spacing:0; }
    p { margin:0 0 10px; }
    a { color:#0f5f8c; }
    .lede { color:var(--muted); max-width:860px; }
    .metrics { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:10px; margin:18px 0; }
    .metric { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:14px; min-height:92px; }
    .metric span { display:block; color:var(--muted); font-size:13px; }
    .metric strong { display:block; margin-top:4px; font-size:28px; }
    .metric small { color:var(--muted); }
    .issue strong { color:var(--warn); }
    .panel { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:18px; margin-top:12px; }
    ol.runbook { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:10px; list-style:none; padding:0; margin:0; }
    ol.runbook li { border:1px solid var(--line); border-radius:8px; padding:14px; background:#fbfcfe; }
    ol.runbook b { display:block; margin-bottom:8px; }
    ol.runbook small { color:var(--muted); }
    .rehearsal dl { display:grid; grid-template-columns: 180px 1fr; gap:8px 14px; margin:0; }
    .rehearsal dt { color:var(--muted); }
    .rehearsal dd { margin:0; }
    table { width:100%; border-collapse:collapse; background:var(--panel); border:1px solid var(--line); border-radius:8px; overflow:hidden; }
    th, td { text-align:left; vertical-align:top; padding:10px; border-bottom:1px solid var(--line); font-size:14px; }
    th { background:#edf2f7; font-size:13px; color:#39465a; }
    tr.registration_hold td:first-child { border-left:4px solid var(--warn); }
    tr.qa_pass td:first-child { border-left:4px solid var(--accent); }
    tr.lookup_blocked td:first-child { border-left:4px solid var(--block); }
    .chip { display:inline-block; margin:0 4px 4px 0; padding:3px 7px; border-radius:999px; background:#fff7ed; color:#9a3412; border:1px solid #fed7aa; font-size:12px; }
    .ok { color:var(--accent); font-weight:700; }
    .note { color:var(--muted); font-size:13px; }
    @media (max-width: 820px) {
      main { padding:22px 12px 44px; }
      h1 { font-size:26px; }
      .metrics, ol.runbook { grid-template-columns:1fr; }
      .rehearsal dl { grid-template-columns:1fr; }
      table { display:block; overflow-x:auto; }
      th, td { min-width:130px; }
    }
  </style>
</head>
<body>
<main>
  <header>
    <h1>수동 Flow 등록 QA 리포트</h1>
    <p class="lede">현재 source-backed Flow 전체를 manual registration readiness 기준으로 점검한 운영자용 리포트입니다. 이 리포트는 AI 생성, 크롤링, 관리자 승인 UI, 서버 저장 없이 후보 Markdown에서 사람이 만든 Flow가 URL hit으로 닫히는지 확인하는 용도입니다.</p>
    <p class="note">생성 시각: ${escapeHtml(report.generatedAt)}</p>
  </header>

  <section>
    <h2>현재 요약</h2>
    <div class="metrics">
      <div class="metric"><span>전체 source-backed Flow Map</span><strong>${report.summary.totalMaps}</strong></div>
      <div class="metric"><span>lookup 가능</span><strong>${report.summary.lookupEligibleCount}</strong><small>sourceUrl + direct route + non-reject</small></div>
      <div class="metric"><span>QA 통과</span><strong>${report.summary.qaPassCount}</strong><small>이슈 없이 등록 가능</small></div>
      <div class="metric"><span>등록 보류</span><strong>${report.summary.registrationHoldCount}</strong><small>보완 후 재검사</small></div>
    </div>
    <div class="metrics">${issueCards}</div>
  </section>

  <section>
    <h2>운영 runbook</h2>
    <div class="panel">
      <ol class="runbook">${runbookItems}</ol>
    </div>
  </section>

  <section>
    <h2>샘플 리허설</h2>
    <div class="panel rehearsal">
      <dl>
        <dt>후보 URL</dt><dd><a href="${escapeAttribute(report.rehearsal.candidateUrl)}">${escapeHtml(report.rehearsal.candidateUrl)}</a></dd>
        <dt>후보 메모</dt><dd>${escapeHtml(report.rehearsal.candidateMemo)}</dd>
        <dt>등록 Flow</dt><dd>${escapeHtml(report.rehearsal.mapId)} / ${escapeHtml(report.rehearsal.flowSlug)}</dd>
        <dt>등록 전 QA</dt><dd>${escapeHtml(STATUS_LABELS[report.rehearsal.qaStatus])} - ${escapeHtml(report.rehearsal.qaNote)}</dd>
        <dt>lookup 확인</dt><dd>${escapeHtml(report.rehearsal.lookupStatus)}${report.rehearsal.routeHref ? ` / ${escapeHtml(report.rehearsal.routeHref)}` : ''}</dd>
        <dt>다음 처리</dt><dd>${escapeHtml(report.rehearsal.nextOperatorAction)}</dd>
      </dl>
    </div>
  </section>

  <section>
    <h2>sourceTrace remediation queue</h2>
    <p class="note">남은 sourceTrace 누락 Flow Map을 lookup 대표 여부, productScore, Step 수, risk, 보완 난이도 기준으로 정렬합니다. 한 후보를 보완한 뒤 QA-pass로 이동하면 이 큐에서 빠집니다.</p>
    <table>
      <thead>
        <tr>
          <th>Priority / Flow Map</th>
          <th>Lookup / UX / score</th>
          <th>Missing Steps</th>
          <th>Risk</th>
          <th>Reason / next action</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>${sourceTraceQueueRows}</tbody>
    </table>
  </section>

  <section>
    <h2>중복 canonical URL 그룹</h2>
    <p class="note">URL lookup은 canonical URL 1개에 기본 hit Flow Map 1개를 우선합니다. 나머지는 더 구체적인 sourceUrl로 좁히거나, 하나의 Flow Map으로 합치거나, directRouteEnabled=false로 보류합니다.</p>
    <table>
      <thead>
        <tr>
          <th>원인 / canonical URL</th>
          <th>기본 hit</th>
          <th>보조 후보</th>
          <th>처리 제안</th>
        </tr>
      </thead>
      <tbody>${duplicateGroupRows}</tbody>
    </table>
  </section>

  <section>
    <h2>Flow Map별 QA</h2>
    <table>
      <thead>
        <tr>
          <th>Flow Map</th>
          <th>상태</th>
          <th>Quality</th>
          <th>Step/sourceTrace</th>
          <th>QA 이슈</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>
</main>
</body>
</html>`;
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
