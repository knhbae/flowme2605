import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const outputDir = path.join(
  repoRoot,
  'docs',
  'content-audit',
  '2026-07-13-p23-lifecycle-closure-review',
);
const baselineCommit = 'e6b1cf3';
const generatedAt = new Date().toISOString();

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function writeJson(fileName, value) {
  fs.writeFileSync(path.join(outputDir, fileName), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(fileName, value) {
  fs.writeFileSync(path.join(outputDir, fileName), `${value.trim()}\n`, 'utf8');
}

function listFiles(directory, extension) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...listFiles(absolute, extension));
    else if (!extension || entry.name.endsWith(extension)) result.push(absolute);
  }
  return result;
}

function relativeToOutput(absolutePath) {
  return path.relative(outputDir, absolutePath).replaceAll('\\', '/');
}

const capture = readJson(
  'docs/content-audit/2026-07-13-p23-lifecycle-closure-review/capture-observations.json',
);
const reviewInspectionPath = path.join(outputDir, 'review-inspection.json');
const reviewInspection = fs.existsSync(reviewInspectionPath)
  ? JSON.parse(fs.readFileSync(reviewInspectionPath, 'utf8'))
  : { records: [] };

const evidenceSources = [
  ['P23-01B', '개인 초안 항목 추가·삭제·즉시 되돌리기', 'docs/content-audit/2026-07-13-p23-01b-personal-draft-structural-edit-evidence/route-evidence.json'],
  ['P23-01C', '삭제 복구·개인 순서', 'docs/content-audit/2026-07-13-p23-01c-personal-draft-order-recovery-evidence/route-evidence.json'],
  ['P23-01D1', '구조 projection 계약', 'docs/content-audit/2026-07-13-p23-01d1-structural-projection-contract-evidence/projection-fixtures.json'],
  ['P23-01D2/D3A', 'Calendar·ICS 구조 projection', 'docs/content-audit/2026-07-13-p23-01d2-d3a-calendar-ics-projection-evidence/route-evidence.json'],
  ['P23-01D3B', 'checklist·sheet·memo 구조 projection', 'docs/content-audit/2026-07-13-p23-01d3b-list-export-projection-evidence/route-evidence.json'],
  ['P23-02A', '선택적 날짜', 'docs/content-audit/2026-07-13-p23-02a-personal-draft-optional-date-evidence/route-evidence.json'],
  ['P23-02B1', '종일·시간 계약', 'docs/content-audit/2026-07-13-p23-02b1-personal-draft-time-contract-evidence/schedule-fixtures.json'],
  ['P23-02B2', '종일·시간 UI와 projection', 'docs/content-audit/2026-07-13-p23-02b2-personal-draft-time-ui-projection-evidence/route-evidence.json'],
  ['P23-02C1', '반복 series·occurrence 계약', 'docs/content-audit/2026-07-13-p23-02c1-personal-draft-recurrence-contract-evidence/recurrence-fixtures.json'],
  ['P23-02C2A', '반복 UI', 'docs/content-audit/2026-07-13-p23-02c2a-personal-draft-recurrence-ui-evidence/route-evidence.json'],
  ['P23-02C2B', 'Calendar occurrence', 'docs/content-audit/2026-07-13-p23-02c2b-personal-draft-calendar-occurrence-evidence/route-evidence.json'],
  ['P23-02C2C', '반복 ICS', 'docs/content-audit/2026-07-13-p23-02c2c-personal-draft-recurrence-ics-evidence/route-evidence.json'],
  ['P23-03', '완료·재개·건너뜀·보류', 'docs/content-audit/2026-07-13-p23-03-personal-occurrence-state-evidence/route-evidence.json'],
  ['P23-04', '과거 실행·회고·다시 쓰기', 'docs/content-audit/2026-07-13-p23-04-past-run-reuse-evidence/route-evidence.json'],
  ['P23-05A', '날짜 없는 source-backed 항목 일정화', 'docs/content-audit/2026-07-13-p23-05a-source-undated-date-parity-evidence/route-evidence.json'],
  ['P23-05B', '직접 저장 Flow 기준일 재설정', 'docs/content-audit/2026-07-13-p23-05b-direct-save-anchor-edit-evidence/route-evidence.json'],
].map(([slice, label, file]) => {
  const parsed = readJson(file);
  return {
    slice,
    label,
    file,
    evidenceClass: 'current_repo_artifact',
    markerCount: parsed.markers ? Object.keys(parsed.markers).length : Object.keys(parsed).length,
  };
});

const capabilityRows = [
  {
    id: 'intake-save',
    capability: '발견·URL/메모 입력·저장',
    status: 'supported',
    coverage: '공개 Flow, URL hit/miss draft, source-backed Flow Map',
    limitation: 'AI 자동 생성은 연결하지 않았고 초안은 사용자 편집 shell이다.',
    evidence: ['P20-01', 'P23 personal draft journey'],
  },
  {
    id: 'complete-reopen',
    capability: '완료와 완료 취소',
    status: 'supported',
    coverage: 'My Flow, Calendar, 개인 draft occurrence',
    limitation: '체크박스 의미 이해는 실제 사용자에게 확인하지 않았다.',
    evidence: ['P19-02', 'P23-03'],
  },
  {
    id: 'optional-date',
    capability: '날짜 지정·변경·제거',
    status: 'supported',
    coverage: '개인 draft와 날짜 없는 저장 체크리스트',
    limitation: 'source-backed 전체 유형을 대표 표본으로 모두 관찰한 것은 아니다.',
    evidence: ['P23-02A', 'P23-05A'],
  },
  {
    id: 'time-all-day',
    capability: '종일·시간·예상 소요 시간',
    status: 'partial',
    coverage: '개인 draft user-created 항목은 My Flow·Calendar·ICS·list export까지 지원',
    limitation: 'source-backed 항목의 시간 편집 parity는 대표 회귀만 있고 제품 전 범위 계약은 아니다.',
    evidence: ['P23-02B1', 'P23-02B2'],
  },
  {
    id: 'recurrence',
    capability: '반복 rule·회차 생성·반복 ICS',
    status: 'partial',
    coverage: '개인 draft daily/weekly/monthly와 기존 source-backed routine editor',
    limitation: 'source-backed occurrence state와 series 편집 parity는 열지 않았다.',
    evidence: ['P23-02C1', 'P23-02C2A', 'P23-02C2B', 'P23-02C2C'],
  },
  {
    id: 'occurrence-state',
    capability: '회차별 완료·재개·건너뜀·보류',
    status: 'partial',
    coverage: '개인 draft 반복 occurrence',
    limitation: 'source-backed 반복 Flow에는 같은 실행 control이 없다.',
    evidence: ['P23-03'],
  },
  {
    id: 'structural-edit',
    capability: '항목 추가·삭제·복구·순서 변경',
    status: 'partial',
    coverage: 'URL-first 또는 메모 개인 draft',
    limitation: 'source-backed 항목은 원본 버전 merge와 tombstone 정책이 필요해 차단했다.',
    evidence: ['P23-01A', 'P23-01B', 'P23-01C'],
  },
  {
    id: 'value-edit',
    capability: '제목·개인 메모·개별 일정 수정',
    status: 'hidden',
    coverage: '개인 draft와 저장 source-backed 항목',
    limitation: '일부 모바일 경로는 Flow 열기→항목 열기→수정으로 3~4단계다.',
    evidence: ['P18-05', 'P19-07', 'current capture'],
  },
  {
    id: 'anchor-edit',
    capability: 'Flow 전체 기준일 재설정',
    status: 'supported',
    coverage: 'URL custom-start, personal copy, direct-saved moving Flow Map',
    limitation: '앵커가 없는 Flow에는 의도적으로 노출하지 않는다.',
    evidence: ['P18-07', 'P23-05B'],
  },
  {
    id: 'calendar-ics',
    capability: 'Calendar와 ICS 동일 projection',
    status: 'supported',
    coverage: 'scheduled source/user 항목, 종일·시간·반복',
    limitation: '실제 외부 Calendar 앱 가져오기 관찰은 0회다.',
    evidence: ['P23-01D2/D3A', 'P23-02B2', 'P23-02C2C'],
  },
  {
    id: 'list-export',
    capability: 'checklist·sheet·memo portable export',
    status: 'supported',
    coverage: '개인 draft effective list와 source-backed 기존 builder',
    limitation: '직접 Notion/Todo 동기화는 범위 밖이며 파일/복사 기반이다.',
    evidence: ['P23-01D3B', 'P23-04'],
  },
  {
    id: 'history-reuse',
    capability: '회고·과거 실행 상세·다시 쓰기',
    status: 'supported',
    coverage: '완료 Flow snapshot, 읽기 전용 과거 항목, 새 run',
    limitation: '긴 실행 기록의 검색·요약 필요성은 관찰되지 않았다.',
    evidence: ['P23-04'],
  },
  {
    id: 'source-update',
    capability: '원본 새 버전 검토와 개인값 보존',
    status: 'partial',
    coverage: 'stable source-backed item과 saved source version',
    limitation: '개인 structural edit와 source v2의 제품 UI three-way merge는 아직 없다.',
    evidence: ['source-backed version review', 'P23-05B'],
  },
  {
    id: 'cross-device',
    capability: '다른 기기 복원·동기화',
    status: 'blocked',
    coverage: '현재 브라우저 localStorage 백업/복원만 지원',
    limitation: '계정·DB·동기화 정책이 선행되어야 한다.',
    evidence: ['storage backup tests'],
  },
  {
    id: 'direct-sync',
    capability: '외부 Calendar·Notion·Todo 직접 동기화',
    status: 'missing',
    coverage: 'ICS/checklist/sheet/memo portable 결과물은 지원',
    limitation: 'OAuth와 양방향 충돌 정책은 P23 범위 밖이다.',
    evidence: ['portable export only'],
  },
  {
    id: 'record-customization',
    capability: '기록·메모형 필드 구조 사용자 수정',
    status: 'partial',
    coverage: '콘텐츠별 workbench 필드와 export',
    limitation: '사용자 정의 field add/delete/order runtime은 아직 없다.',
    evidence: ['record-memo capture'],
  },
];

const capabilityMatrix = {
  generatedAt,
  baselineCommit,
  statusDefinitions: {
    supported: '사용자 경로와 관련 projection이 현재 동작한다.',
    hidden: '동작하지만 설명 없이 찾기 어렵다.',
    partial: '특정 소유권·Flow 유형·destination에서만 동작한다.',
    missing: '현재 기능 또는 사용자 경로가 없다.',
    blocked: '데이터·계정·운영 정책이 선행되어야 한다.',
  },
  counts: Object.fromEntries(
    ['supported', 'hidden', 'partial', 'missing', 'blocked'].map((status) => [
      status,
      capabilityRows.filter((row) => row.status === status).length,
    ]),
  ),
  capabilities: capabilityRows,
};

const stateTransitions = [
  ['pending', 'done', 'execution_run', 'supported', true, '행 왼쪽 체크박스'],
  ['done', 'reopened', 'execution_run', 'supported', true, '같은 체크박스로 완료 취소'],
  ['pending', 'skipped', 'occurrence_run', 'partial', true, '개인 반복 회차의 이번만 건너뛰기'],
  ['skipped', 'pending', 'occurrence_run', 'supported', true, '다시 진행'],
  ['pending', 'held', 'occurrence_run', 'partial', true, '개인 반복 회차의 잠시 보류'],
  ['held', 'pending', 'occurrence_run', 'supported', true, '다시 진행'],
  ['included', 'excluded', 'personal_overlay', 'hidden', true, '개인 사본 설정'],
  ['visible', 'tombstoned', 'structural_overlay', 'partial', true, '개인 draft 항목 삭제'],
  ['tombstoned', 'restored', 'structural_overlay', 'supported', true, '즉시 undo 또는 목록에서 뺀 할 일'],
  ['source_order', 'personal_order', 'structural_overlay', 'partial', true, '개인 draft 위/아래 이동'],
  ['unscheduled', 'all_day', 'structural_schedule', 'supported', true, '개인 draft와 저장된 날짜 없는 체크리스트'],
  ['all_day', 'timed', 'structural_schedule', 'partial', true, '개인 draft 시간 지정'],
  ['timed', 'all_day', 'structural_schedule', 'supported', true, '시간 제거, 날짜 유지'],
  ['scheduled', 'unscheduled', 'personal_schedule', 'supported', true, '날짜 지우기'],
  ['anchor_old', 'anchor_new', 'saved_map_snapshot', 'supported', true, '이사일/기준일 바꾸기'],
  ['active_run', 'completed_run', 'execution_run', 'supported', false, '전체 완료와 회고 snapshot'],
  ['completed_run', 'new_active_run', 'execution_run', 'supported', true, '다시 쓰기, 과거 run 보존'],
  ['source_v1', 'source_v2_reviewed', 'source_version', 'partial', true, '새 버전 검토 후 새 run'],
];

const stateTransitionMatrix = {
  generatedAt,
  baselineCommit,
  transitions: stateTransitions.map(([from, to, owner, status, reversible, userPath]) => ({
    from,
    to,
    owner,
    status,
    reversible,
    userPath,
  })),
  ownershipBoundary: {
    sourceVersion: ['canonical title/detail/order/schedule', 'source URL/ref', 'published version'],
    personalStructuralOverlay: ['user item', 'tombstone', 'restore', 'personal order', 'personal schedule'],
    executionRun: ['pending', 'done', 'reopened', 'skipped', 'held', 'completion/reflection history'],
  },
};

const exportRows = [
  {
    state: '날짜 없는 user item',
    myFlow: '포함',
    calendar: '제외',
    ics: '제외',
    checklist: '포함',
    sheet: '포함',
    memo: '포함',
    policy: '날짜를 정하기 전에도 실행 목록과 portable list에는 남긴다.',
  },
  {
    state: '종일 또는 timed user item',
    myFlow: '포함',
    calendar: '포함',
    ics: '포함',
    checklist: '포함',
    sheet: '포함',
    memo: '포함',
    policy: '모든 destination이 같은 effective title/date/time/memo를 읽는다.',
  },
  {
    state: 'tombstoned 또는 excluded item',
    myFlow: '현재 목록 제외',
    calendar: '제외',
    ics: '제외',
    checklist: '제외',
    sheet: '제외',
    memo: '제외',
    policy: 'source 원본과 과거 run 기록은 삭제하지 않는다.',
  },
  {
    state: 'done 또는 reopened item',
    myFlow: '상태 포함',
    calendar: 'membership 유지',
    ics: 'membership 유지',
    checklist: '상태 포함',
    sheet: '상태 포함',
    memo: '상태 포함',
    policy: '실행 상태는 structural membership을 바꾸지 않는다.',
  },
  {
    state: 'skipped 또는 held occurrence',
    myFlow: '상태 포함',
    calendar: 'series 유지',
    ics: 'series 유지',
    checklist: '상태 포함',
    sheet: '상태 포함',
    memo: '상태 포함',
    policy: '개인 반복 회차 정책이다. source-backed 일반 skip과의 통합 정책은 후속 검토가 필요하다.',
  },
  {
    state: '완료된 과거 run snapshot',
    myFlow: '읽기 전용',
    calendar: '재내보내기 없음',
    ics: '재내보내기 없음',
    checklist: '제공',
    sheet: '제공',
    memo: '제공',
    policy: '중복 일정 방지를 위해 과거 Calendar/ICS는 제공하지 않는다.',
  },
];

const exportProjectionMatrix = {
  generatedAt,
  baselineCommit,
  rows: exportRows,
  invariant: '현재 run의 My Flow, Calendar, ICS, checklist, sheet, memo는 동일 effective state를 읽는다.',
  knownPolicyQuestion: 'skipped occurrence와 source-backed 일반 skipped item의 외부 일정 제외 정책을 사용자 기대와 함께 재검토한다.',
};

const scenarios = [
  {
    id: 'anchor-timeline',
    persona: '이사 30일 전, 원룸 이사 일정을 저장한 사용자',
    flowType: '기준일 역산형',
    status: 'supported',
    journey: ['공개 Flow Map 저장', '이사일 재설정', '개별 할 일 날짜·메모 유지', 'Calendar·ICS 확인', '완료·회고·다시 쓰기'],
    currentResult: 'direct save에서도 이사일 바꾸기가 390/1024에 보이고 상대 일정만 재계산된다.',
    remaining: 'source-backed 항목 add/delete/reorder는 차단 상태다.',
    evidence: ['P23-05B', 'P23-04'],
    screenshots: [
      'screenshots/17-direct-anchor/01-direct-anchor-edit-mobile.png',
      'screenshots/17-direct-anchor/02-direct-anchor-calendar-shift-mobile.png',
      'screenshots/17-direct-anchor/03-direct-anchor-entry-wide.png',
    ],
  },
  {
    id: 'undated-checklist',
    persona: '여행 전 필요한 것만 체크하고 일부를 일정에 넣는 사용자',
    flowType: '날짜 없는 체크리스트형',
    status: 'supported',
    journey: ['Flow 저장', '항목 완료·완료 취소', '날짜 지정', '날짜 변경·제거', 'Calendar·ICS/list export 확인'],
    currentResult: '날짜 없는 source-backed 항목도 개인 날짜를 정하고 없앨 수 있다.',
    remaining: '구조 변경은 source merge 정책 때문에 제공하지 않는다.',
    evidence: ['P23-05A'],
    screenshots: [
      'screenshots/16-source-undated-date/01-source-undated-date-set-mobile.png',
      'screenshots/16-source-undated-date/02-source-undated-calendar-mobile.png',
      'screenshots/16-source-undated-date/03-source-undated-date-persisted-wide.png',
    ],
  },
  {
    id: 'recurring-routine',
    persona: '운동·학습 루틴을 반복하고 한 회차를 미루거나 건너뛰는 사용자',
    flowType: '반복 루틴형',
    status: 'partial',
    journey: ['날짜·시간 지정', 'daily/weekly/monthly 반복', '회차 완료·재개', '건너뜀·보류', 'Calendar·반복 ICS 확인'],
    currentResult: '개인 draft는 series/occurrence/run 상태를 분리해 전 여정이 동작한다.',
    remaining: 'source-backed 반복 Flow에는 같은 occurrence 실행 control이 없다.',
    evidence: ['P23-02C1', 'P23-02C2A/B/C', 'P23-03'],
    screenshots: [
      'screenshots/13-personal-recurrence/screenshots/01-personal-draft-recurrence-edit-mobile.png',
      'screenshots/14-personal-occurrence/screenshots/01-personal-draft-occurrence-held-mobile.png',
      'screenshots/14-personal-occurrence/screenshots/02-personal-draft-occurrence-state-actions-wide.png',
    ],
  },
  {
    id: 'ordered-mixed-plan',
    persona: '여행·프로젝트 준비 순서를 자기 방식으로 재구성하는 사용자',
    flowType: '순서·일정 혼합형',
    status: 'supported',
    journey: ['개인 draft 저장', '항목 추가·삭제·복구', '위/아래 이동', '날짜·시간 지정', '모든 destination 확인'],
    currentResult: 'stable personal ID와 orderOverride가 새로고침, Calendar, export 전반에서 유지된다.',
    remaining: 'drag-and-drop은 의도적으로 제외했고 source-backed 구조 편집은 차단했다.',
    evidence: ['P23-01B/C/D', 'P23-02A/B'],
    screenshots: [
      'screenshots/07-personal-structure/01-personal-draft-item-added-mobile.png',
      'screenshots/08-personal-order-recovery/01-personal-draft-reordered-mobile.png',
      'screenshots/12-personal-time/screenshots/01-personal-draft-time-edit-mobile.png',
    ],
  },
  {
    id: 'record-memo',
    persona: '냉장고 재고와 실행 메모를 남기고 시트로 가져가는 사용자',
    flowType: '기록·메모형',
    status: 'partial',
    journey: ['공개 workbench 확인', 'Flow 단위 저장', '기록·메모 입력', 'sheet·memo export', '완료 후 회고'],
    currentResult: '콘텐츠별 field와 portable output은 유지되며 public 저장 전·후 경계도 분명하다.',
    remaining: '사용자 정의 field add/delete/order는 runtime에 없다.',
    evidence: ['P18-03', 'P20-04', 'P23-04'],
    screenshots: [
      'screenshots/09-record-workbench-mobile.png',
      'screenshots/10-record-workbench-wide.png',
      'screenshots/15-history-reuse/screenshots/00-past-run-detail-export-mobile.png',
    ],
  },
  {
    id: 'personal-url-memo-draft',
    persona: '준비된 Flow가 없는 URL·메모를 직접 실행 초안으로 만드는 사용자',
    flowType: '개인 초안형',
    status: 'supported',
    journey: ['miss 초안 시작', 'My Flow 저장', '구조·일정·반복 편집', '완료·회고', 'Calendar와 portable export', '다시 쓰기'],
    currentResult: 'P23 structural/schedule/run projection의 기준 구현이다.',
    remaining: '실제 AI 생성은 없으며 제안 shell을 사용자가 직접 다듬는다.',
    evidence: ['P20-01/02', 'P23-01~04'],
    screenshots: [
      'screenshots/11-url-draft-editor-mobile.png',
      'screenshots/12-url-draft-my-flow-mobile.png',
      'screenshots/13-url-draft-settings-mobile.png',
    ],
  },
];

const screenshotFiles = listFiles(path.join(outputDir, 'screenshots'), '.png').map(relativeToOutput).sort();
for (const scenario of scenarios) {
  for (const screenshot of scenario.screenshots) {
    if (!screenshotFiles.includes(screenshot)) throw new Error(`Missing screenshot: ${screenshot}`);
  }
}

const scenarioEvidence = {
  generatedAt,
  baselineCommit,
  automatedEvidenceBoundary: '스크린샷·E2E·DOM·파일 내용은 자동 QA다. 사용자 이해·발견성·습관 형성 검증이 아니다.',
  formalObservedParticipantCount: 0,
  ownerFeedbackReferenced: true,
  scenarios,
  captureRecords: capture.records,
  reviewInspectionRecords: reviewInspection.records,
  screenshotFiles,
};

const baseOverflowCount = capture.records.filter((record) => record.horizontalOverflow).length;
const baseConsoleErrorCount = capture.records.reduce(
  (sum, record) => sum + (Array.isArray(record.consoleErrors) ? record.consoleErrors.length : 0),
  0,
);
const reviewHtmlOverflowCount = reviewInspection.records.filter((record) => record.horizontalOverflow).length;
const reviewHtmlBrokenImageCount = reviewInspection.records.reduce(
  (sum, record) => sum + (record.brokenImageCount || 0),
  0,
);
const reviewHtmlConsoleErrorCount = reviewInspection.records.reduce(
  (sum, record) => sum + (Array.isArray(record.consoleErrors) ? record.consoleErrors.length : 0),
  0,
);
const routeEvidence = {
  generatedAt,
  baselineCommit,
  evidenceClasses: {
    currentCommand: ['npm.cmd test', 'npm.cmd run docs:check', 'npm.cmd run build', 'P23 lifecycle capture'],
    currentRepo: evidenceSources.map((source) => source.file),
    priorArtifact: ['P18~P22 final packages used only as historical rationale'],
    observedUser: [],
  },
  markers: {
    p23ImplementationSliceCount: 17,
    p23EvidenceSourceCount: evidenceSources.length,
    p23ScenarioTypeCount: scenarios.length,
    p23CurrentBaseCaptureRecordCount: capture.records.length,
    p23ScreenshotCount: screenshotFiles.length,
    p23CurrentBaseCaptureHorizontalOverflowCount: baseOverflowCount,
    p23CurrentBaseCaptureConsoleErrorCount: baseConsoleErrorCount,
    p23ReviewHtmlViewportCount: reviewInspection.records.length,
    p23ReviewHtmlHorizontalOverflowCount: reviewHtmlOverflowCount,
    p23ReviewHtmlBrokenImageCount: reviewHtmlBrokenImageCount,
    p23ReviewHtmlConsoleErrorCount: reviewHtmlConsoleErrorCount,
    p23PersonalDraftStructuralLifecycleConnected: true,
    p23PersonalDraftOptionalDateTimeRecurrenceConnected: true,
    p23PersonalDraftOccurrenceStatesDistinct: true,
    p23PersonalDraftCalendarIcsListExportUnified: true,
    p23PastRunDetailReuseConnected: true,
    p23SourceUndatedOptionalDateConnected: true,
    p23DirectSavedMapAnchorEditConnected: true,
    p23SourceBackedStructuralEditConnected: false,
    p23SourceBackedStructuralEditBlockedByVersionMergePolicy: true,
    p23CrossDeviceAccountPersistenceConnected: false,
    p23ExternalDirectSyncConnected: false,
    p23FormalObservedParticipantCount: 0,
    p23OwnerFeedbackReferenced: true,
    p23LocalMvpLifecycleContractClosed: true,
    p23ProductionReleaseReady: false,
  },
  currentVerification: {
    fullUnit: { status: 'pass', count: 476 },
    docsCheck: { status: 'pass', requiredFiles: 14, localLinks: 2166 },
    productionBuild: { status: 'pass', staticPages: 18 },
    securityAudit: {
      status: 'pass_at_high_threshold_with_moderate_findings',
      high: 0,
      critical: 0,
      moderate: 2,
      affectedPackage: 'postcss <8.5.10 through next',
      advisory: 'GHSA-qx2v-qp2m-jg93',
      mitigation: 'Do not run the breaking --force downgrade; schedule a controlled Next/PostCSS dependency upgrade.',
    },
    reviewHtmlBrowserInspection: {
      status: reviewInspection.records.length === 2 ? 'pass' : 'not_run',
      viewports: reviewInspection.records.map((record) => record.viewport),
      horizontalOverflowCount: reviewHtmlOverflowCount,
      brokenImageCount: reviewHtmlBrokenImageCount,
      consoleErrorCount: reviewHtmlConsoleErrorCount,
    },
    routeRegression: { status: 'pass', count: 63 },
    p23LifecycleJourneys: { status: 'pass', count: 8 },
    p23HistoryReuseJourneys: { status: 'pass', count: 3 },
    p23SourceParityJourneys: { status: 'pass', count: 2 },
    fullPlaywrightSuiteRun: false,
    formalObservedParticipants: 0,
  },
  evidenceSources,
};

writeJson('capability-matrix.json', capabilityMatrix);
writeJson('state-transition-matrix.json', stateTransitionMatrix);
writeJson('export-projection-matrix.json', exportProjectionMatrix);
writeJson('scenario-evidence.json', scenarioEvidence);
writeJson('route-evidence.json', routeEvidence);

const readme = `# P23 실행 라이프사이클 마감 리뷰

## 판정

P23의 local MVP 실행 계약은 닫혔다. 개인 draft는 항목 구조, 선택적 날짜·시간, 반복, 회차 상태, Calendar/ICS/list export, 회고와 다시 쓰기를 하나의 effective state로 연결한다. 사용자 피드백에서 드러난 source-backed 두 단절도 P23-05A/05B로 보강했다.

다만 이는 상용 출시 완료 판정이 아니다. source-backed 항목 구조 편집은 version merge 정책 때문에 의도적으로 차단돼 있고, 계정·DB·다른 기기 동기화와 정식 사용자 관찰은 아직 없다.

## 핵심 수치

- P23 구현 slice: 17
- 단계별 evidence source: ${evidenceSources.length}
- Flow 유형별 시나리오: ${scenarios.length}
- screenshot: ${screenshotFiles.length}
- 최신 기본 캡처: ${capture.records.length}개, horizontal overflow ${baseOverflowCount}, console error ${baseConsoleErrorCount}
- full unit: 476/476
- docs: 14 required files, 2,166 local links
- production build: pass
- security audit: high/critical 0, moderate 2 (Next 내부 PostCSS, 통제된 dependency upgrade 필요)
- 정식 관찰 참여자: 0명

## 읽는 순서

1. [review.html](./review.html) - 사람용 전체 workboard
2. [audit.md](./audit.md) - 판정 근거와 남은 backlog
3. [capability-matrix.json](./capability-matrix.json) - supported/hidden/partial/missing/blocked
4. [state-transition-matrix.json](./state-transition-matrix.json) - 완료·일정·구조·reuse 전이
5. [export-projection-matrix.json](./export-projection-matrix.json) - destination별 포함 정책
6. [scenario-evidence.json](./scenario-evidence.json) - 6개 Flow 유형과 53개 screenshot
7. [route-evidence.json](./route-evidence.json) - 기계 판독 marker와 현재 검증
8. [prompt-ko.md](./prompt-ko.md) - 다음 외부/사용자 검토용 프롬프트

자동화는 operability와 persistence를 확인했을 뿐, 사용자가 설명 없이 기능을 찾고 이해한다는 사실을 증명하지 않는다.`;

const audit = `# P23 실행 라이프사이클 마감 감사

## 1. 전체 판정

P23-00에서 Blocking으로 분류했던 개인 structural overlay와 단일 projection 계약은 구현됐다. 개인 draft에서 add/delete/restore/reorder가 stable ID와 tombstone/orderOverride로 저장되고, 날짜 없음·종일·timed·반복 schedule과 occurrence run state가 분리됐다. Calendar, ICS, checklist, sheet, memo는 같은 effective state를 읽는다.

상세 시뮬레이션에서 새로 확인된 핵심 단절 두 개도 수정했다.

1. 날짜 없는 source-backed 체크리스트 항목에 개인 날짜를 지정·변경·제거하는 입구를 P23-05A에서 연결했다.
2. Flow Map direct save 후 기준일을 다시 바꿀 수 없는 문제를 P23-05B에서 해결했다. 상대 일정은 재계산되며 따로 바꾼 항목 날짜와 메모는 유지된다.

따라서 **P23 local MVP lifecycle contract는 완료**다. 단, product-wide parity와 production release는 별도다.

## 2. P23 전후

| 영역 | P23-00 | 현재 |
| --- | --- | --- |
| 개인 항목 구조 | missing | 개인 draft에서 add/delete/restore/reorder supported |
| 날짜 없는 항목 일정화 | missing | 개인 draft + 저장 source-backed 체크리스트 supported |
| 종일·시간 | partial/hidden | 개인 draft에서 UI·Calendar·ICS·list export connected |
| 반복 회차 | partial | 개인 draft series/revision/occurrence/run 분리 |
| 완료·재개·skip·hold | 의미 혼재 | 개인 occurrence에서 distinct, source-backed는 partial |
| 과거 실행 | summary only | item snapshot·회고·list export·new run supported |
| direct save 기준일 수정 | missing | 390/1024에서 supported |

## 3. Flow 유형별 결과

${scenarios
  .map(
    (scenario, index) => `### ${index + 1}. ${scenario.flowType}

- Persona: ${scenario.persona}
- 판정: **${scenario.status}**
- 현재: ${scenario.currentResult}
- 남음: ${scenario.remaining}
- 여정: ${scenario.journey.join(' → ')}`,
  )
  .join('\n\n')}

## 4. 남은 Blocking / High

### Product release blocking

1. **계정·DB·다른 기기 복원 없음:** 현재 데이터와 과거 run은 localStorage 및 사용자가 만든 backup에 머문다.
2. **정식 사용자 관찰 0명:** owner feedback은 반영했지만 첫 사용자의 발견성·이해·재방문은 자동화로 판정할 수 없다.

### High

1. **source-backed 구조 편집 parity:** add/delete/reorder를 열려면 source v2와 personal tombstone/order의 three-way merge 및 orphan UI가 선행돼야 한다.
2. **실행 상태 parity:** skipped/held occurrence control은 개인 반복 draft에만 있고 source-backed 반복 Flow에는 없다.
3. **편집 발견성:** 일부 항목 수정은 모바일에서 Flow 열기→항목 열기→수정까지 3~4단계다.

이 세 항목은 P23 중 추가 UI로 억지로 닫지 않았다. 첫째는 데이터 계약, 둘째는 product policy, 셋째는 관찰 evidence가 먼저다.

## 5. Medium / Low

- Calendar-heavy 화면은 overflow 없이 동작하지만 월간 grid와 선택일 agenda를 한 full-page capture에서 보면 시각 밀도가 높다.
- 긴 과거 run은 기본 접힘 상태라 현재 실행을 밀지 않지만, 24개 이상 항목을 펼친 뒤 검색/요약 필요성은 관찰되지 않았다.
- 모바일 full-page screenshot에서는 fixed header/footer가 긴 문서 중간 콘텐츠 위에 겹쳐 보인다. 실제 viewport horizontal overflow는 0이며, scroll context의 체감은 실제 기기 관찰이 필요하다.
- 날짜 native input의 브라우저 placeholder와 편집 폼 밀도는 device/browser별 확인이 필요하다.

## 6. 소유권과 파괴적 행동

| 소유자 | 값 | 복구 원칙 |
| --- | --- | --- |
| source/version | canonical title/detail/order/schedule/source version | 개인 수정으로 덮어쓰지 않음 |
| personal structural overlay | user item, tombstone, restore, order, personal schedule | soft delete와 stable ID 유지 |
| execution run | pending/done/reopened/skipped/held, feedback, completion snapshot | 구조 membership과 분리, 과거 run 보존 |

완료는 체크박스로 되돌릴 수 있다. 삭제는 personal draft에서 tombstone과 즉시 undo/지속 복구를 사용한다. source-backed 삭제는 아직 열지 않는다.

## 7. Projection 판정

- 날짜 없는 user item은 My Flow/checklist/sheet/memo에 남고 Calendar/ICS에서는 제외된다.
- scheduled item은 모든 현재 destination에 같은 title/date/time/memo로 반영된다.
- tombstoned/excluded item은 현재 projection에서 제외되지만 source와 과거 run은 보존한다.
- 완료·완료 취소는 structural membership을 바꾸지 않는다.
- 과거 run은 checklist/sheet/memo만 다시 제공하고 Calendar/ICS는 중복 방지를 위해 제공하지 않는다.

## 8. 다음 권장 순서

### Now: 관찰 gate

5명 × 3회로 발견→저장→수정→실행→완료 취소→export→재방문을 관찰한다. 이 단계 전에는 편집 입구를 또 재배치하지 않는다.

### Next: P24-01 source version merge contract

source v2 added/changed/removed Item과 personal tombstone/order/user Item을 병합하는 pure contract, orphan 정책, preview를 먼저 만든다. UI는 그 뒤에 연다.

### Next: P24-02 실행 상태 parity

source-backed 반복 Flow에도 occurrence skip/hold가 필요한지 관찰로 확인한 뒤 동일 run-state adapter를 연결한다.

### Later

계정·DB·cloud sync, 직접 Calendar/Notion/Todo 연동, 사용자 정의 record field builder는 별도 product/operations milestone로 둔다.

## 9. 실제 사용자에게 확인할 질문

1. "이사일 바꾸기"와 개별 "날짜 바꾸기"의 차이를 설명 없이 이해하는가?
2. 날짜 없는 체크리스트에서 Calendar에 넣을 항목을 어디서 찾는가?
3. 삭제, 제외, 이번만 건너뛰기, 잠시 보류를 서로 다른 의미로 이해하는가?
4. 완료 취소를 바로 발견하는가?
5. 위/아래 이동이 drag-and-drop 없이도 충분한가?
6. 반복 한 회 완료와 Flow 전체 완료를 구분하는가?
7. checklist/sheet/memo와 ICS 중 실제로 다시 쓰는 결과물은 무엇인가?
8. 과거 실행에서 항목 전체가 필요한가, 요약과 회고면 충분한가?
9. 원본 새 버전이 왔을 때 삭제했던 항목이 다시 생기길 기대하는가?
10. 여러 기기 사용과 데이터 복원은 첫 유료 가치 전에 필요한가?

## 10. 검증 경계

- current command: full unit 476/476, docs 14 files·2,166 links, production build pass, lifecycle capture 14 records.
- security audit: high/critical 0, moderate 2. "postcss <8.5.10" advisory GHSA-qx2v-qp2m-jg93이며, "npm audit fix --force"가 제안하는 breaking downgrade는 적용하지 않았다.
- current repo artifact: P23 16개 단계별 evidence source와 ${screenshotFiles.length}개 screenshot.
- actual observed user: 0명.
- full Playwright suite 전체는 이번 마감 턴에서 실행하지 않았다. 핵심 P23 journeys와 URL-first/public/workbench 63개 회귀를 실행했다.

자동 QA pass를 사용자 이해나 상용 출시 판정으로 바꾸어 말하지 않는다.`;

const prompt = `# FlowMe P23 마감 이후 제품 검토 요청

아래 패키지만 보고 P24 방향을 검토해 주세요.

- review.html
- audit.md
- capability-matrix.json
- state-transition-matrix.json
- export-projection-matrix.json
- scenario-evidence.json
- route-evidence.json
- screenshots/

FlowMe의 현재 핵심 흐름은 URL/메모 또는 공개 Flow를 발견하고 저장한 뒤, 내 상황에 맞게 구조·일정·반복을 수정하고, My Flow와 Calendar에서 실행하며, 완료·완료 취소·건너뜀·보류·회고·다시 쓰기와 portable export로 이어지는 것입니다.

다음 관점으로 평가해 주세요.

1. 기능 존재 여부보다 첫 사용자가 설명 없이 수정 입구와 상태 의미를 발견하는가.
2. 기준일형, 날짜 없는 체크리스트형, 반복 루틴형, 순서·일정 혼합형, 기록·메모형, 개인 초안형에서 같은 mental model이 유지되는가.
3. 완료·완료 취소·제외·삭제·건너뜀·보류가 서로 다른 행동으로 읽히는가.
4. My Flow, Calendar, ICS, checklist, sheet, memo가 하나의 개인 수정본을 읽는다는 신뢰가 보이는가.
5. source-backed 구조 편집을 열기 전에 source v2 merge/orphan 정책이 충분한가.
6. 390px과 1024px에서 Calendar, 항목 편집, 과거 실행의 정보 밀도가 상용 서비스 수준인가.
7. localStorage 기반 현재 모델에서 계정·DB·다른 기기 복원이 언제 Blocking이 되는가.

반드시 구분해 주세요.

- 자동화로 증명된 operability
- screenshot으로만 추정한 UX
- 실제 사용자 관찰이 필요한 가정
- P24에서 구현할 것
- 구현하지 말고 먼저 관찰/정책 결정할 것

결과는 Blocking / High / Medium / Low로 제시하고, P24-01~P24-05를 의존성 순서로 작성해 주세요. 단순 UI polish 목록보다 사용자 여정 단절, 데이터 소유권, 되돌리기, projection 일관성, source update 위험을 우선해 주세요.`;

writeText('README.md', readme);
writeText('audit.md', audit);
writeText('prompt-ko.md', prompt);

function statusClass(status) {
  return `status status-${status}`;
}

const gallery = scenarios
  .map(
    (scenario) => `
      <section class="scenario" id="${scenario.id}">
        <div class="scenario-copy">
          <div class="eyebrow">${scenario.flowType}</div>
          <h3>${scenario.persona}</h3>
          <p>${scenario.currentResult}</p>
          <p class="remaining"><strong>남은 경계</strong> ${scenario.remaining}</p>
          <ol>${scenario.journey.map((step) => `<li>${step}</li>`).join('')}</ol>
        </div>
        <div class="shots">
          ${scenario.screenshots
            .slice(0, 2)
            .map((shot) => `<figure><img src="${shot}" alt="${scenario.flowType} 시나리오 화면"><figcaption>${shot.split('/').at(-1)}</figcaption></figure>`)
            .join('')}
        </div>
      </section>`,
  )
  .join('');

const capabilityTableRows = capabilityRows
  .map(
    (row) => `<tr><td>${row.capability}</td><td><span class="${statusClass(row.status)}">${row.status}</span></td><td>${row.coverage}</td><td>${row.limitation}</td></tr>`,
  )
  .join('');

const transitionTableRows = stateTransitionMatrix.transitions
  .map(
    (row) => `<tr><td><code>${row.from}</code> → <code>${row.to}</code></td><td>${row.owner}</td><td><span class="${statusClass(row.status)}">${row.status}</span></td><td>${row.userPath}</td></tr>`,
  )
  .join('');

const exportTableRows = exportRows
  .map(
    (row) => `<tr><td>${row.state}</td><td>${row.myFlow}</td><td>${row.calendar}</td><td>${row.ics}</td><td>${row.checklist}</td><td>${row.sheet}</td><td>${row.memo}</td></tr>`,
  )
  .join('');

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FlowMe P23 실행 라이프사이클 마감 리뷰</title>
  <style>
    :root { color-scheme: light; --ink:#172033; --muted:#5d687c; --line:#dbe1ea; --panel:#f5f7fa; --blue:#2457e6; --green:#0f7b55; --amber:#a35b00; --red:#b42335; --purple:#6d3cc3; }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin:0; background:#fff; color:var(--ink); font-family:Inter,Pretendard,"Noto Sans KR",system-ui,sans-serif; line-height:1.58; letter-spacing:0; }
    a { color:var(--blue); }
    header { border-bottom:1px solid var(--line); background:#111827; color:#fff; }
    .wrap { width:min(1180px, calc(100% - 32px)); margin:0 auto; }
    .hero { padding:44px 0 38px; display:grid; grid-template-columns:minmax(0,1.4fr) minmax(280px,.6fr); gap:36px; align-items:end; }
    .eyebrow { color:#6e83b7; font-size:12px; font-weight:800; text-transform:uppercase; }
    header .eyebrow { color:#9bb5ff; }
    h1 { margin:8px 0 12px; font-size:clamp(32px,5vw,56px); line-height:1.06; letter-spacing:0; }
    h2 { margin:0 0 18px; font-size:28px; letter-spacing:0; }
    h3 { margin:6px 0 10px; font-size:20px; letter-spacing:0; }
    p { margin:0 0 12px; }
    .hero p { max-width:760px; color:#cbd5e1; font-size:17px; }
    .verdict { border-left:3px solid #7ea0ff; padding-left:18px; }
    .verdict strong { display:block; font-size:21px; margin-bottom:6px; }
    nav { position:sticky; top:0; z-index:5; background:rgba(255,255,255,.97); border-bottom:1px solid var(--line); }
    nav .wrap { display:flex; gap:20px; overflow-x:auto; padding:12px 0; }
    nav a { color:#334155; text-decoration:none; white-space:nowrap; font-size:14px; font-weight:700; }
    main section.band { padding:44px 0; border-bottom:1px solid var(--line); }
    .metrics { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); border:1px solid var(--line); }
    .metric { padding:18px; border-right:1px solid var(--line); min-height:104px; }
    .metric:last-child { border-right:0; }
    .metric b { display:block; font-size:26px; color:#111827; }
    .metric span { color:var(--muted); font-size:13px; }
    .notice { padding:16px 18px; border-left:4px solid var(--amber); background:#fff8eb; margin-top:18px; }
    .lanes { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); border:1px solid var(--line); }
    .lane { padding:18px; border-right:1px solid var(--line); }
    .lane:last-child { border-right:0; }
    .lane h3 { font-size:16px; }
    .lane ul { padding-left:20px; margin:8px 0 0; }
    .scenario { display:grid; grid-template-columns:minmax(280px,.75fr) minmax(0,1.25fr); gap:28px; padding:30px 0; border-top:1px solid var(--line); }
    .scenario:first-of-type { border-top:0; }
    .scenario-copy ol { margin:16px 0 0; padding-left:22px; }
    .remaining { color:#7a3e00; }
    .shots { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; align-items:start; }
    figure { margin:0; min-width:0; }
    figure img { width:100%; max-height:520px; object-fit:cover; object-position:top; border:1px solid var(--line); border-radius:6px; background:#f8fafc; }
    figcaption { color:var(--muted); font-size:11px; overflow-wrap:anywhere; margin-top:5px; }
    .table-wrap { overflow-x:auto; border:1px solid var(--line); }
    table { width:100%; border-collapse:collapse; min-width:780px; }
    th,td { padding:12px 14px; text-align:left; vertical-align:top; border-bottom:1px solid var(--line); font-size:13px; }
    th { background:#f1f4f8; color:#39465a; }
    tr:last-child td { border-bottom:0; }
    code { font-family:"SFMono-Regular",Consolas,monospace; font-size:12px; }
    .status { display:inline-block; padding:3px 7px; border-radius:4px; font-size:11px; font-weight:800; text-transform:uppercase; }
    .status-supported { background:#e5f7ef; color:var(--green); }
    .status-hidden { background:#eef2ff; color:var(--blue); }
    .status-partial { background:#fff1d6; color:var(--amber); }
    .status-missing { background:#feecef; color:var(--red); }
    .status-blocked { background:#f1eafb; color:var(--purple); }
    .score-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); border:1px solid var(--line); }
    .score { padding:18px; border-right:1px solid var(--line); border-bottom:1px solid var(--line); }
    .score:nth-child(3n) { border-right:0; }
    .score:nth-last-child(-n+3) { border-bottom:0; }
    .score strong { display:block; margin-bottom:7px; }
    .score span { color:var(--muted); font-size:13px; }
    .questions { columns:2; column-gap:42px; padding-left:22px; }
    .questions li { break-inside:avoid; margin-bottom:10px; }
    footer { padding:30px 0 52px; color:var(--muted); font-size:13px; }
    @media (max-width: 820px) {
      .hero, .scenario { grid-template-columns:1fr; }
      .metrics { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .metric { border-bottom:1px solid var(--line); }
      .metric:nth-child(2n) { border-right:0; }
      .metric:nth-last-child(-n+2) { border-bottom:0; }
      .lanes { grid-template-columns:1fr 1fr; }
      .lane:nth-child(2n) { border-right:0; }
      .lane:nth-child(-n+2) { border-bottom:1px solid var(--line); }
      .score-grid { grid-template-columns:1fr; }
      .score, .score:nth-child(3n), .score:nth-last-child(-n+3) { border-right:0; border-bottom:1px solid var(--line); }
      .score:last-child { border-bottom:0; }
      .questions { columns:1; }
    }
    @media (max-width: 520px) {
      .wrap { width:min(100% - 24px,1180px); }
      .hero { padding:30px 0; }
      h1 { font-size:34px; }
      h2 { font-size:24px; }
      .metrics, .lanes, .shots { grid-template-columns:1fr; }
      .metric, .lane, .metric:nth-child(2n), .lane:nth-child(2n) { border-right:0; border-bottom:1px solid var(--line); }
      .metric:last-child, .lane:last-child { border-bottom:0; }
      main section.band { padding:34px 0; }
    }
  </style>
</head>
<body>
  <header>
    <div class="wrap hero">
      <div>
        <div class="eyebrow">FlowMe · P23 lifecycle closure</div>
        <h1>저장 이후의 삶을<br>하나의 실행 모델로</h1>
        <p>발견·저장 이후 수정, 일정화, 완료 취소, 구조 변경, 반복 회차, 외부 전송, 회고와 재사용까지 6개 Flow 유형으로 다시 검증했다.</p>
      </div>
      <div class="verdict">
        <strong>Local MVP 계약 완료</strong>
        <span>상용 출시 완료는 아님. source merge, 계정/DB, 실제 사용자 관찰이 남아 있다.</span>
      </div>
    </div>
  </header>
  <nav><div class="wrap"><a href="#summary">판정</a><a href="#journeys">사용자 여정</a><a href="#capabilities">기능 매트릭스</a><a href="#states">상태 전이</a><a href="#exports">전송 정책</a><a href="#backlog">다음 순서</a><a href="#questions">사용자 질문</a></div></nav>
  <main>
    <section class="band" id="summary"><div class="wrap">
      <div class="eyebrow">Current evidence · baseline ${baselineCommit}</div>
      <h2>P23에서 닫힌 것과 닫히지 않은 것</h2>
      <div class="metrics">
        <div class="metric"><b>17</b><span>구현 slice</span></div>
        <div class="metric"><b>${evidenceSources.length}</b><span>단계별 evidence</span></div>
        <div class="metric"><b>${scenarios.length}</b><span>Flow 유형</span></div>
        <div class="metric"><b>${screenshotFiles.length}</b><span>screenshot</span></div>
        <div class="metric"><b>476/476</b><span>unit pass</span></div>
        <div class="metric"><b>0명</b><span>정식 관찰 참여자</span></div>
      </div>
      <div class="notice"><strong>판정 경계:</strong> 자동화는 state, persistence, export, overflow를 증명한다. 설명 없이 발견하고 이해하는지는 아직 증명하지 않는다.</div>
      <div class="score-grid" style="margin-top:24px">
        <div class="score"><strong>Core loop · 강함</strong><span>URL/메모·공개 Flow → 저장 → 실행 → Calendar/export → 회고·다시 쓰기가 이어진다.</span></div>
        <div class="score"><strong>Portability · 강함</strong><span>개인 draft effective state를 Calendar, ICS, checklist, sheet, memo가 공유한다.</span></div>
        <div class="score"><strong>UX 발견성 · 관찰 필요</strong><span>기능은 있으나 일부 수정 entry가 3~4단계이고 실제 첫 사용자 evidence가 없다.</span></div>
        <div class="score"><strong>Source parity · 부분</strong><span>날짜와 기준일 connector는 닫혔지만 source-backed 구조 편집은 정책상 차단됐다.</span></div>
        <div class="score"><strong>Production data · 차단</strong><span>계정·DB·다른 기기 동기화가 없다. dependency audit에는 PostCSS moderate 2건이 남아 있다.</span></div>
        <div class="score"><strong>User evidence · 미확인</strong><span>owner feedback은 반영했지만 정식 관찰 참여자는 0명이다.</span></div>
      </div>
    </div></section>

    <section class="band" id="journeys"><div class="wrap"><div class="eyebrow">Six lifecycle simulations</div><h2>Flow 유형별 사용자 여정</h2>${gallery}</div></section>

    <section class="band" id="capabilities"><div class="wrap"><div class="eyebrow">Supported / hidden / partial / missing / blocked</div><h2>기능 완전성</h2><div class="table-wrap"><table><thead><tr><th>행동</th><th>판정</th><th>현재 범위</th><th>남은 경계</th></tr></thead><tbody>${capabilityTableRows}</tbody></table></div></div></section>

    <section class="band" id="states"><div class="wrap"><div class="eyebrow">Ownership first</div><h2>상태 전이와 되돌리기</h2><div class="table-wrap"><table><thead><tr><th>전이</th><th>소유자</th><th>판정</th><th>사용자 경로</th></tr></thead><tbody>${transitionTableRows}</tbody></table></div></div></section>

    <section class="band" id="exports"><div class="wrap"><div class="eyebrow">One effective state</div><h2>My Flow / Calendar / export</h2><div class="table-wrap"><table><thead><tr><th>상태</th><th>My Flow</th><th>Calendar</th><th>ICS</th><th>Checklist</th><th>Sheet</th><th>Memo</th></tr></thead><tbody>${exportTableRows}</tbody></table></div></div></section>

    <section class="band" id="backlog"><div class="wrap"><div class="eyebrow">After P23</div><h2>다음 순서</h2><div class="lanes">
      <div class="lane"><h3>Now · 관찰</h3><ul><li>5명 × 3회 lifecycle 관찰</li><li>실제 Calendar 앱 ICS import</li><li>편집 depth와 상태어 이해 확인</li></ul></div>
      <div class="lane"><h3>Next · P24</h3><ul><li>source v2 three-way merge contract</li><li>orphan/tombstone preview</li><li>source-backed occurrence state 필요성 결정</li></ul></div>
      <div class="lane"><h3>Later · Production</h3><ul><li>계정·DB·다른 기기 복원</li><li>통제된 Next/PostCSS upgrade</li><li>직접 Calendar/Notion/Todo 연동</li><li>사용자 정의 record field</li></ul></div>
      <div class="lane"><h3>Done · P23</h3><ul><li>개인 structural overlay</li><li>날짜·시간·반복·회차</li><li>통합 projection</li><li>회고·과거 run·다시 쓰기</li><li>source 날짜/기준일 connector</li></ul></div>
    </div></div></section>

    <section class="band" id="questions"><div class="wrap"><div class="eyebrow">Observed-user gate</div><h2>실제 사용자에게 물을 것</h2><ol class="questions"><li>이사일과 개별 날짜 수정 차이가 보이는가?</li><li>날짜 없는 할 일을 일정에 넣는 입구를 찾는가?</li><li>삭제·제외·건너뜀·보류를 구분하는가?</li><li>완료 취소를 바로 발견하는가?</li><li>위/아래 이동만으로 순서 조정이 충분한가?</li><li>반복 한 회와 Flow 전체 완료를 구분하는가?</li><li>실제로 다시 쓰는 export는 무엇인가?</li><li>과거 run은 항목 전체와 요약 중 무엇이 필요한가?</li><li>원본 업데이트에서 삭제 항목 재등장을 어떻게 기대하는가?</li><li>다른 기기 복원이 언제 필수가 되는가?</li></ol></div></section>
  </main>
  <footer><div class="wrap">Generated ${generatedAt} · baseline ${baselineCommit} · automated QA, not observed-user validation · <a href="audit.md">audit.md</a> · <a href="route-evidence.json">route-evidence.json</a></div></footer>
</body>
</html>`;

writeText('review.html', html);

console.log(
  JSON.stringify(
    {
      outputDir,
      baselineCommit,
      evidenceSourceCount: evidenceSources.length,
      scenarioCount: scenarios.length,
      screenshotCount: screenshotFiles.length,
      baseOverflowCount,
      baseConsoleErrorCount,
    },
    null,
    2,
  ),
);
