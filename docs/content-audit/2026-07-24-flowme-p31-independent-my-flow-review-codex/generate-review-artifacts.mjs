import fs from 'node:fs/promises';
import path from 'node:path';

const OUTPUT_DIR = path.resolve(
  'docs/content-audit/2026-07-24-flowme-p31-independent-my-flow-review-codex',
);
const ORIGIN_MAIN_SHA = 'a2e1d72dadda0104f97682ae662dfbc113a85318';
const PRODUCTION = 'https://flowme2605.vercel.app';
const OBSERVED_USER_COUNT = 0;

const capture = JSON.parse(
  await fs.readFile(path.join(OUTPUT_DIR, 'current-production-capture.json'), 'utf8'),
);
const probes = JSON.parse(
  await fs.readFile(path.join(OUTPUT_DIR, 'current-journey-probes.json'), 'utf8'),
);

const findings = [
  {
    id: 'P31-IR-F01',
    severity: 'High',
    title: '선택한 Flow의 핵심 조작이 탭과 접힘 영역에 분산된다',
    route: '/my?view=flows',
    viewport: '390x844, 1024x768',
    startState: '저장 Flow 5개 이상, Flow 목록에서 한 Flow를 선택한 상태',
    reproductionSteps: [
      'Flow 목록에서 한 Flow를 연다.',
      '항목 제목, 날짜, 메모를 바꾸기 위해 전체 계획, 항목 열기, 상세 펼치기, 수정으로 이동한다.',
      '전체 Flow를 가져가기 위해 기록, 가져가기와 고급 작업, 가져가기를 연다.',
      '보관 후 reload하고 보관됨 필터에서 복구한다.',
    ],
    expected: '선택한 Flow의 자주 쓰는 수정과 가져가기는 3단계 이내, 보관과 복구는 4단계 이내에서 한 객체의 명령으로 예측할 수 있어야 한다.',
    actual: 'Flow 열기는 2단계지만 항목 수정 6단계, 전체 export 6단계, 보관 후 복구 6단계다. 실행/전체 계획/기록 탭과 별도 고급 disclosure, 관리 메뉴를 오가야 한다.',
    userImpact: '기능은 존재하지만 사용자가 기능이 없다고 판단하거나, 항목을 실행하는 대신 설정 구조를 탐색하게 된다.',
    affectedPersonas: ['P1', 'P2', 'P5', 'P6', 'P7', 'P8'],
    evidenceKinds: ['current_production_interaction', 'current_browser_automation', 'current_source', 'heuristic_simulation'],
    evidenceRefs: [
      'current-journey-probes.json#moving',
      'screenshots/probe-moving-workspace.png',
      'components/flow/AppClient.tsx:15255',
      'components/flow/AppClient.tsx:15301',
      'components/flow/AppClient.tsx:15420',
    ],
    dataContractImpact: '없음. source/personal/run/occurrence/export projection은 유지하고 command composition만 바꾼다.',
    proposedResolution: 'B안의 focused workspace를 채택한다. Flow를 연 뒤 object header 아래에 다음 행동, 빠른 수정, 가져가기, 관리 명령을 모으고 전체 계획과 기록은 progressive disclosure로 둔다.',
    rejectedAlternatives: ['A안의 문구/간격 조정만으로는 6단계 경로가 줄지 않는다.', 'C안은 단순 checklist와 source Flow까지 run 중심으로 왜곡한다.'],
    rollback: '기존 MyFlows projection과 storage를 유지한 채 workspace composition 컴포넌트만 이전 렌더러로 되돌린다.',
    acceptanceScreenshot: 'screenshots/p32-02-my-flow-focused-390.png, screenshots/p32-02-my-flow-focused-1024.png',
    acceptanceMarker: 'P32-MY-FLOW-FOCUSED-COMMANDS',
    observedUserQuestion: '설명 없이 제목/날짜 수정, 전체 가져가기, 보관 위치를 각각 찾을 수 있는가?',
  },
  {
    id: 'P31-IR-F02',
    severity: 'High',
    title: 'public 이사 Flow 저장 후 전체 기준일을 다시 바꿀 진입이 없다',
    route: '/f/moving-d30-basic -> /my?savedFlow=moving-d30-basic',
    viewport: '390x844',
    startState: '이사일 2030-08-15로 24개 일정을 저장하고 전체 Flow를 연 상태',
    reproductionSteps: [
      '저장 전 이사일을 입력하고 저장한다.',
      '저장 완료 receipt에서 전체 Flow 보기를 누른다.',
      '전체 계획 탭에서 이사일 또는 전체 일정 기준 변경을 찾는다.',
      '개별 항목 편집과 비교한다.',
    ],
    expected: '이사일 변경 한 번으로 상대 일정이 다시 계산되고, 개인 고정 날짜와 메모는 유지되어야 한다.',
    actual: 'production workspace에는 direct anchor와 personal-copy anchor 진입이 모두 없다. 개별 항목 제목/날짜/메모 편집은 가능하다.',
    userImpact: '재사용할 때 24개 일정을 개별 수정하거나 새로 저장해야 하므로 P1의 두 번째 세션이 끊긴다.',
    affectedPersonas: ['P1'],
    evidenceKinds: ['current_browser_automation', 'current_source'],
    evidenceRefs: [
      'current-journey-probes.json#moving.whole_anchor_adjustment_reachable=false',
      'components/flow/AppClient.tsx:15372',
      'tests/e2e/flow-mvp.spec.ts:3842',
    ],
    dataContractImpact: '기존 anchor, 개인 날짜 override, effective-date precedence를 재사용할 수 있다. 기존 저장물 migration은 불필요한 것으로 보이나 public saved-flow eligibility를 구현 전 확인해야 한다.',
    proposedResolution: 'Flow header의 빠른 수정에서 전체 기준일 변경을 제공하고, 개인 고정 날짜를 유지한다는 결과 preview를 저장 전에 보여준다.',
    rejectedAlternatives: ['24개 항목을 개별 이동시키지 않는다.', '새 Flow로 강제 복제해 과거 run identity를 덮지 않는다.'],
    rollback: '기존 anchor를 보존하고 새 기준일 overlay 적용만 취소한다.',
    acceptanceScreenshot: 'screenshots/p32-04-anchor-reuse-390.png',
    acceptanceMarker: 'P32-ANCHOR-REUSE',
    observedUserQuestion: '재사용할 때 사용자는 전체 기준일 변경과 새 사본 만들기 중 무엇을 먼저 기대하는가?',
  },
  {
    id: 'P31-IR-F03',
    severity: 'High',
    title: '보관, 복구, 영구 삭제의 데이터 의미는 맞지만 발견 경로가 분리돼 있다',
    route: '/my?view=flows',
    viewport: '390x844',
    startState: '저장 Flow workspace를 연 상태',
    reproductionSteps: [
      'Flow header의 더보기 메뉴를 열어 보관한다.',
      'reload 후 Flow 목록으로 돌아간다.',
      '상태 필터를 보관됨으로 바꾼다.',
      '복구 또는 영구 삭제를 선택하고 backup 확인을 거친다.',
    ],
    expected: '한 Flow의 관리 메뉴에서 보관과 삭제의 차이, 되돌릴 수 있는 범위, 다음 위치가 예측되어야 한다.',
    actual: '보관은 object menu, 영구 삭제는 보관됨 inventory, 전체 데이터 관리는 page header에 있다. 데이터 보호는 강하지만 사용자는 삭제가 어디 있는지 알기 어렵다.',
    userImpact: '삭제 기능이 없다고 오해하거나, 보관과 영구 삭제를 같은 동작으로 이해할 수 있다.',
    affectedPersonas: ['P5', 'P6', 'P7'],
    evidenceKinds: ['current_production_interaction', 'current_browser_automation', 'current_source'],
    evidenceRefs: [
      'current-journey-probes.json#moving.archive',
      'screenshots/scale-20-mobile-workspace.png',
      'components/flow/AppClient.tsx:14804',
      'components/flow/AppClient.tsx:15179',
      'lib/flow/personal-flow-lifecycle.ts:135',
      'lib/flow/storage.ts:932',
    ],
    dataContractImpact: 'archive/restore와 permanent delete 계약은 그대로 유지한다. UI에서 두 동작을 합치지 않는다.',
    proposedResolution: 'Flow 관리 sheet에 보관을 기본으로 두고, 보관된 Flow에서만 영구 삭제를 노출한다. 현재 상태와 이동할 위치를 action label에 포함한다.',
    rejectedAlternatives: ['즉시 영구 삭제를 primary로 올리지 않는다.', '전역 데이터 관리 화면만으로 object lifecycle을 대신하지 않는다.'],
    rollback: '기존 관리 메뉴와 보관됨 inventory로 되돌리며 lifecycle record는 손대지 않는다.',
    acceptanceScreenshot: 'screenshots/p32-04-flow-manage-390.png',
    acceptanceMarker: 'P32-LIFECYCLE-DISCLOSURE',
    observedUserQuestion: '사용자는 보관과 영구 삭제의 차이를 추가 설명 없이 예측하는가?',
  },
  {
    id: 'P31-IR-F04',
    severity: 'High',
    title: '검토 정본의 mixed travel route가 production에서 404다',
    route: '/f/real-mofa-overseas-travel-prep',
    viewport: '390x844, 1024x768',
    startState: '독립 검토의 mixed date/check/resource 콘텐츠 shape',
    reproductionSteps: [
      '정본 프롬프트가 지정한 route를 연다.',
      'HTTP status와 사용자 화면을 기록한다.',
      '대체 route /f/overseas-safety-register와 artifact shape를 비교한다.',
    ],
    expected: '날짜, checklist, resource가 함께 있는 Flow를 current production에서 검증할 수 있어야 한다.',
    actual: '지정 route는 404이고 current E2E도 의도적으로 closed 상태를 요구한다. 대체 route는 200이지만 memo-first 4개 항목이라 같은 shape가 아니다.',
    userImpact: 'P4의 source update/export 세션을 동일 객체로 끝까지 검증할 수 없고 handoff package가 current route contract와 어긋난다.',
    affectedPersonas: ['P4'],
    evidenceKinds: ['current_production_interaction', 'current_browser_automation', 'current_source'],
    evidenceRefs: [
      'current-production-capture.json#mixed-travel',
      'current-journey-probes.json#artifact-mixed',
      'screenshots/mixed-travel-mobile.png',
      'tests/e2e/flow-mvp.spec.ts:5840',
    ],
    dataContractImpact: '없음. source safety gate를 우회하거나 closed Flow를 alias하지 않는다.',
    proposedResolution: 'P32 correctness slice에서 검토 fixture를 유효한 mixed route로 교체하거나, 승인된 mixed Flow가 생길 때까지 이 cell을 blocked로 유지한다.',
    rejectedAlternatives: ['안전 검토가 끝나지 않은 MOFA route를 검토 편의를 위해 다시 공개하지 않는다.', 'memo-first 대체 route를 같은 shape라고 주장하지 않는다.'],
    rollback: '문서 fixture 변경만 되돌린다. production source gate는 유지한다.',
    acceptanceScreenshot: 'screenshots/p32-01-mixed-shape-route-390.png',
    acceptanceMarker: 'P32-MIXED-SHAPE-ROUTE-CONTRACT',
    observedUserQuestion: '없음. 먼저 내부 route/evidence 계약을 고쳐야 한다.',
  },
  {
    id: 'P31-IR-F05',
    severity: 'Medium',
    title: '모바일 집중 workspace에서도 global과 local navigation이 동시에 경쟁한다',
    route: '/my?view=flows',
    viewport: '390x844',
    startState: '한 Flow를 연 dedicated mobile workspace',
    reproductionSteps: [
      'Flow 목록에서 한 Flow를 연다.',
      '첫 viewport의 My Flow global tabs와 Flow local tabs를 함께 센다.',
      '지금/Flow 목록/완료와 실행/전체 계획/기록의 의미를 비교한다.',
    ],
    expected: 'Flow를 연 뒤에는 back, Flow identity, 다음 행동, object commands가 우선이고 global 분류는 한 단계 뒤로 물러나야 한다.',
    actual: 'global 3 tabs, Flow header와 관리 메뉴, local 3 tabs가 연속해서 나타난다. 5/20/60개 mobile list 첫 viewport에는 21개 focusable command가 보인다.',
    userImpact: '지금과 실행, 완료와 기록을 같은 수준의 선택지로 오해할 수 있고 한 Flow에 집중하기 어렵다.',
    affectedPersonas: ['P1', 'P3', 'P5', 'P6', 'P7'],
    evidenceKinds: ['current_production_screenshot', 'current_browser_automation', 'heuristic_simulation', 'reference_pattern'],
    evidenceRefs: [
      'screenshots/probe-moving-workspace.png',
      'screenshots/scale-20-mobile-list.png',
      'current-production-capture.json#scaleResults',
    ],
    dataContractImpact: '없음. URL view와 selected Flow state를 유지하면서 표시 우선순위만 바꾼다.',
    proposedResolution: 'Flow drill-in 중 global local-tab strip을 숨기고 back으로 목록의 filter/scroll을 복구한다. object workspace 안에서는 next action과 전체 계획을 한 세로 흐름으로 둔다.',
    rejectedAlternatives: ['탭 이름을 더 길게 설명하지 않는다.', '4탭 global IA를 다시 열지 않는다.'],
    rollback: '기존 global/local tab strip 렌더링으로 복귀한다.',
    acceptanceScreenshot: 'screenshots/p32-02-my-flow-focused-390.png',
    acceptanceMarker: 'P32-MOBILE-OBJECT-FOCUS',
    observedUserQuestion: '한 Flow를 연 상태에서 사용자는 global 상태와 Flow 내부 상태를 구분하는가?',
  },
  {
    id: 'P31-IR-F06',
    severity: 'Medium',
    title: '현재 dependency audit가 high 취약점으로 실패한다',
    route: 'build/release gate',
    viewport: 'not_applicable',
    startState: `origin/main ${ORIGIN_MAIN_SHA}, package-lock 고정`,
    reproductionSteps: ['npm.cmd ci를 실행한다.', 'npm.cmd run security:audit를 실행한다.'],
    expected: 'high severity dependency advisory가 없어야 한다.',
    actual: 'Next 15.5.21 내부 postcss에 1 high, 1 moderate advisory가 남아 audit가 실패한다. 제안된 force fix는 Next 9.3.3으로의 breaking change다.',
    userImpact: '현재 UX 판정과 별개인 release/security risk다. 자동 force fix는 제품 회귀를 만들 수 있다.',
    affectedPersonas: [],
    evidenceKinds: ['current_command'],
    evidenceRefs: ['npm.cmd run security:audit', 'package.json#next=15.5.21'],
    dataContractImpact: '없음.',
    proposedResolution: '별도 dependency remediation 작업으로 분리하고 Next 호환 패치가 나온 뒤 unit/build/full E2E를 다시 통과시킨다.',
    rejectedAlternatives: ['이번 UX 검토에서 npm audit fix --force를 실행하지 않는다.'],
    rollback: 'package-lock 변경을 만들지 않았다.',
    acceptanceScreenshot: 'not_applicable',
    acceptanceMarker: 'SECURITY-AUDIT-HIGH-0',
    observedUserQuestion: '없음.',
  },
];

const cells = [];
function addCell(personaId, sessionId, options) {
  cells.push({
    personaId,
    sessionId,
    route: options.route,
    viewport: options.viewport ?? '390x844, representative 1024x768',
    initialState: options.initialState,
    steps: options.steps,
    stepCount: options.steps.length,
    status: options.status,
    mentalModelPrediction: options.mentalModelPrediction,
    actualResult: options.actualResult,
    explanationFree: options.explanationFree,
    crossSurfaceParity: options.crossSurfaceParity,
    recoveryPath: options.recoveryPath,
    actionableDuplicateCount: options.actionableDuplicateCount ?? 0,
    contextLossCount: options.contextLossCount ?? 0,
    evidenceKinds: options.evidenceKinds,
    evidenceRefs: options.evidenceRefs,
    observedUserQuestion: options.observedUserQuestion,
  });
}

addCell('P1', 'discover_save_land', {
  route: '/f/moving-d30-basic -> /my?savedFlow=moving-d30-basic',
  initialState: 'fresh localStorage',
  steps: ['이사일 입력', '24개 전체 preview 펼치기', '저장', 'receipt 확인', '전체 Flow 보기'],
  status: 'supported',
  mentalModelPrediction: '이사일을 기준으로 24개 일정이 저장되고 같은 Flow가 My Flow에 열린다.',
  actualResult: '실제 row와 24개 receipt가 보이고 dedicated workspace로 연결됐다.',
  explanationFree: true,
  crossSurfaceParity: 'supported',
  recoveryPath: 'receipt에서 My Flow 또는 Calendar로 이동',
  evidenceKinds: ['current_browser_automation', 'current_production_screenshot'],
  evidenceRefs: ['current-journey-probes.json#moving', 'screenshots/moving-mobile.png', 'screenshots/probe-moving-workspace.png'],
  observedUserQuestion: '24개 일정이라는 저장 단위를 첫 화면만 보고 예측하는가?',
});
addCell('P1', 'personalize_execute_reopen', {
  route: '/my?view=flows',
  initialState: 'saved moving-d30-basic',
  steps: ['Flow 열기', '전체 계획', '항목 열기', '제목/날짜/메모 수정', '완료', 'undo/reopen', '전체 기준일 찾기'],
  status: 'partial',
  mentalModelPrediction: '개별 일정과 전체 이사일을 각각 바꿀 수 있다.',
  actualResult: '개별 값과 완료/reopen은 지원되지만 전체 기준일 변경 진입은 보이지 않았다.',
  explanationFree: false,
  crossSurfaceParity: 'partial',
  recoveryPath: '개별 날짜 override는 유지되지만 전체 기준일은 새 저장 경로로 돌아가야 한다.',
  evidenceKinds: ['current_browser_automation', 'current_source'],
  evidenceRefs: ['current-journey-probes.json#moving', 'components/flow/AppClient.tsx:15372'],
  observedUserQuestion: '개별 날짜와 전체 기준일의 차이를 사용자가 이해하는가?',
});
addCell('P1', 'export_lifecycle_reuse', {
  route: '/my?view=flows -> /calendar',
  initialState: 'personal item override exists',
  steps: ['기록 탭', '고급 작업', 'whole export', '보관', 'reload', '보관됨 필터', '복구', '새 이사일 재사용 찾기'],
  status: 'hidden',
  mentalModelPrediction: '현재 개인 수정본을 내보내고 같은 Flow를 새 날짜로 재사용한다.',
  actualResult: 'whole export와 archive/restore는 작동하지만 6단계 경로이며 새 기준일 재사용은 이어지지 않는다.',
  explanationFree: false,
  crossSurfaceParity: 'partial',
  recoveryPath: '보관 직후 undo와 보관됨 direct restore',
  evidenceKinds: ['current_browser_automation', 'current_source', 'heuristic_simulation'],
  evidenceRefs: ['current-journey-probes.json#moving.exportPreflight', 'lib/flow/storage.ts:932'],
  observedUserQuestion: '가져가기와 새 run 시작을 서로 다른 행동으로 예측하는가?',
});

addCell('P2', 'preview_save', {
  route: '/f/vehicle-inspection-prep',
  initialState: 'fresh localStorage',
  steps: ['10개 preview 확인', '날짜 없이 시작', 'receipt', '전체 Flow 보기'],
  status: 'supported',
  mentalModelPrediction: '날짜 없는 10개 checklist가 My Flow에 저장된다.',
  actualResult: 'read-only preview, undated intent, receipt와 workspace가 일치했다.',
  explanationFree: true,
  crossSurfaceParity: 'supported',
  recoveryPath: 'receipt에서 전체 Flow 보기',
  evidenceKinds: ['current_browser_automation', 'current_production_screenshot'],
  evidenceRefs: ['current-journey-probes.json#vehicle', 'screenshots/vehicle-mobile.png'],
  observedUserQuestion: '날짜 없이 시작이 오류가 아니라 실행 가능한 checklist로 읽히는가?',
});
addCell('P2', 'schedule_undo_complete', {
  route: '/my -> /calendar',
  initialState: 'vehicle checklist saved undated',
  steps: ['My Flow 실행', 'Calendar undated tray', '날짜 지정', 'undo', '완료', '완료 취소'],
  status: 'supported',
  mentalModelPrediction: '날짜 없는 항목을 Calendar에 배치해도 동일 항목으로 유지된다.',
  actualResult: 'stable item을 배치하고 undo했으며 completion/reopen 계약도 유지됐다.',
  explanationFree: true,
  crossSurfaceParity: 'supported',
  recoveryPath: 'Calendar batch undo와 completion undo',
  evidenceKinds: ['current_browser_automation', 'current_command', 'current_source'],
  evidenceRefs: ['current-journey-probes.json#vehicle', 'screenshots/probe-vehicle-undated-calendar.png'],
  observedUserQuestion: '사용자는 Calendar tray를 배치 대기열로 이해하는가?',
});
addCell('P2', 'scope_export_remove_date', {
  route: '/my -> /calendar',
  initialState: 'one vehicle item has a personal date',
  steps: ['whole export', 'selected export', 'current item export', '날짜 제거', 'undated tray 복귀 확인'],
  status: 'partial',
  mentalModelPrediction: 'scope와 count를 먼저 고르고 날짜 제거 시 tray로 돌아간다.',
  actualResult: 'scope 계약과 date removal 구현은 source/test에서 확인했으나 current production multi-session parity를 한 세션에서 끝까지 재현하지 못했다.',
  explanationFree: false,
  crossSurfaceParity: 'partial',
  recoveryPath: '개별 날짜 제거와 export receipt',
  evidenceKinds: ['current_source', 'current_command', 'heuristic_simulation'],
  evidenceRefs: ['lib/flow/export-scope.ts:10', 'tests/e2e/p26-unified-export.spec.ts:127', 'tests/e2e/flow-mvp.spec.ts:3728'],
  observedUserQuestion: 'whole/selected/current 범위를 format보다 먼저 인식하는가?',
});

addCell('P3', 'configure_save', {
  route: '/f/curated-allblanc-morning-workout',
  initialState: 'fresh localStorage',
  steps: ['반복 summary 확인', '요일/시간/duration/종료 조정', '다음 회차 확인', '저장'],
  status: 'supported',
  mentalModelPrediction: 'routine definition과 다음 occurrence가 분리된다.',
  actualResult: 'compact summary와 advanced settings가 분리되고 저장됐다.',
  explanationFree: true,
  crossSurfaceParity: 'supported',
  recoveryPath: '조정 취소 후 기본 cadence 유지',
  evidenceKinds: ['current_browser_automation', 'current_production_screenshot'],
  evidenceRefs: ['current-journey-probes.json#routine', 'screenshots/routine-mobile.png'],
  observedUserQuestion: '사용자는 반복 Flow와 이번 운동 회차를 구분하는가?',
});
addCell('P3', 'execute_occurrence_reopen', {
  route: '/my?view=flows',
  initialState: 'routine saved',
  steps: ['Flow 열기', '이번 occurrence 완료', 'undo로 재개', 'series/occurrence label 확인'],
  status: 'supported',
  mentalModelPrediction: '한 회차 완료가 series 전체 완료로 보이지 않는다.',
  actualResult: 'execution level이 구분되고 한 회차 completion과 undo가 동작했다.',
  explanationFree: true,
  crossSurfaceParity: 'supported',
  recoveryPath: '즉시 completion undo',
  evidenceKinds: ['current_browser_automation', 'current_source'],
  evidenceRefs: ['current-journey-probes.json#routine.executionLevels'],
  observedUserQuestion: '회차 완료 후 다음 회차로 넘어가는 피드백이 충분한가?',
});
addCell('P3', 'history_next_occurrence_export', {
  route: '/my -> /calendar',
  initialState: 'one occurrence was completed and reopened',
  steps: ['기록 탭', 'history 확인', '다음 occurrence', 'Calendar', 'series ICS preflight'],
  status: 'partial',
  mentalModelPrediction: '과거 run, 현재 occurrence, 다음 occurrence, series ICS가 다른 범위다.',
  actualResult: 'series export summary는 확인했지만 production에서 세 세션의 과거 run 보존을 끝까지 재현하지 않았다.',
  explanationFree: false,
  crossSurfaceParity: 'partial',
  recoveryPath: 'run history registry와 reuse preview',
  evidenceKinds: ['current_browser_automation', 'current_source', 'current_command'],
  evidenceRefs: ['current-journey-probes.json#routine.exportPreflight', 'lib/flow/storage.ts:1367'],
  observedUserQuestion: '사용자는 series ICS와 이번 회차 export 차이를 예상하는가?',
});

addCell('P4', 'choose_artifact_save', {
  route: '/f/curated-wedding-naver-timeline, /f/real-mofa-overseas-travel-prep',
  initialState: 'fresh localStorage',
  steps: ['wedding artifact 3개 비교', '각 actual row 확인', 'mixed travel route 열기'],
  status: 'partial',
  mentalModelPrediction: '콘텐츠별 natural artifact를 고르고 같은 전체 Flow를 저장한다.',
  actualResult: 'wedding calendar/checklist/memo 3개는 동작했지만 mixed travel route는 404였다.',
  explanationFree: true,
  crossSurfaceParity: 'partial',
  recoveryPath: 'wedding 선택은 되돌릴 수 있으나 mixed route 대체는 동일 객체가 아니다.',
  evidenceKinds: ['current_browser_automation', 'current_production_interaction'],
  evidenceRefs: ['current-journey-probes.json#artifact-mixed', 'screenshots/probe-artifact-mixed-wedding-artifacts.png'],
  observedUserQuestion: '추천 artifact 이유와 손실을 실제 row만 보고 이해하는가?',
});
addCell('P4', 'adjust_phase_item_note', {
  route: '/f/real-mofa-overseas-travel-prep',
  initialState: 'requested mixed Flow route',
  steps: ['phase 확인', 'dated item 조정', 'check item 조정', 'resource 확인', 'note 저장'],
  status: 'partial',
  mentalModelPrediction: '한 Flow 안에서 date/check/resource가 역할별로 구분된다.',
  actualResult: '요청 route가 닫혀 production 재현은 불가했다. 대체 memo-first route는 같은 shape를 제공하지 않는다.',
  explanationFree: false,
  crossSurfaceParity: 'blocked',
  recoveryPath: '유효한 mixed fixture가 필요',
  evidenceKinds: ['current_production_interaction', 'current_source'],
  evidenceRefs: ['screenshots/mixed-travel-mobile.png', 'tests/e2e/flow-mvp.spec.ts:5840'],
  observedUserQuestion: '유효 fixture가 생긴 뒤 resource와 실행 항목이 구분되는지 확인해야 한다.',
});
addCell('P4', 'export_source_update', {
  route: '/f/real-mofa-overseas-travel-prep -> /my',
  initialState: 'route closed',
  steps: ['save', 'export', 'source update', 'personal overlay 보존 확인'],
  status: 'blocked',
  mentalModelPrediction: 'source update가 개인 수정과 run을 덮지 않는다.',
  actualResult: '동일 route가 404라 current production에서 시작할 수 없다.',
  explanationFree: false,
  crossSurfaceParity: 'blocked',
  recoveryPath: '내부 route/evidence 계약을 먼저 정정',
  evidenceKinds: ['current_production_interaction', 'current_source'],
  evidenceRefs: ['current-production-capture.json#mixed-travel'],
  observedUserQuestion: '없음. 내부 correctness gate 선행.',
});

addCell('P5', 'miss_memo_save_land', {
  route: '/flows -> /my',
  initialState: 'fresh localStorage',
  steps: ['5문장 메모 입력', '5개 제안 확인', '초안 저장', 'receipt', 'workspace'],
  status: 'supported',
  mentalModelPrediction: '메모 문장이 개인 draft item으로 분리되고 같은 draft로 저장된다.',
  actualResult: '5개 item과 stable draft slug가 만들어지고 reload 가능한 workspace로 연결됐다.',
  explanationFree: true,
  crossSurfaceParity: 'supported',
  recoveryPath: '저장 전 item 검토와 receipt',
  evidenceKinds: ['current_browser_automation', 'current_source'],
  evidenceRefs: ['current-journey-probes.json#personal-draft'],
  observedUserQuestion: '문장 분할 결과를 사용자가 충분히 신뢰하는가?',
});
addCell('P5', 'structure_schedule_edit', {
  route: '/my?view=flows',
  initialState: 'saved personal draft',
  steps: ['Flow 열기', '전체 계획', '여러 할 일 조정', '항목 추가', '선택', '삭제', 'undo', '순서/날짜 편집'],
  status: 'hidden',
  mentalModelPrediction: '간단한 항목 수정은 바로 보이고 batch는 필요할 때만 켠다.',
  actualResult: 'add/delete/restore는 정상 동작하지만 structure mode를 먼저 켜야 해 일반 항목 수정과 batch 편집이 같은 모드에 묶여 있다.',
  explanationFree: false,
  crossSurfaceParity: 'supported',
  recoveryPath: 'batch undo와 persistent recovery',
  evidenceKinds: ['current_browser_automation', 'current_source'],
  evidenceRefs: ['current-journey-probes.json#personal-draft', 'components/flow/AppClient.tsx:12834'],
  observedUserQuestion: '한 항목 추가를 위해 여러 할 일 조정 모드를 예상하는가?',
});
addCell('P5', 'projection_lifecycle', {
  route: '/my -> /calendar',
  initialState: 'draft item added and restored',
  steps: ['reload', 'order 확인', 'Calendar projection', 'checklist/sheet/memo export', 'archive/restore'],
  status: 'partial',
  mentalModelPrediction: 'effective personal items와 stable identity가 모든 projection에 유지된다.',
  actualResult: 'reload persistence와 current tests는 통과했지만 production에서 모든 export와 lifecycle 조합을 한 연속 세션으로 측정하지 않았다.',
  explanationFree: false,
  crossSurfaceParity: 'partial',
  recoveryPath: 'overlay persistence, archive restore',
  evidenceKinds: ['current_browser_automation', 'current_command', 'current_source'],
  evidenceRefs: ['current-journey-probes.json#personal-draft.draftCounts', 'tests/e2e/url-first-user-surface.spec.ts:1395'],
  observedUserQuestion: '외부 export 후에도 My Flow를 계속 써야 할 이유가 명확한가?',
});

addCell('P6', 'find_open', {
  route: '/my?view=flows',
  initialState: 'fixture_only 1/5/20/60 Flow',
  steps: ['Flow 목록', '검색 노출 확인', '원하는 Flow 찾기', 'Flow 열기'],
  status: 'supported',
  mentalModelPrediction: '규모가 커지면 search-first로 전환되고 Flow는 4단계 이내 열린다.',
  actualResult: '1/5/20/60 모두 flowOpenDepth 2, mobile 20/60은 8개 row와 더보기, wide는 rail 검색으로 열렸다.',
  explanationFree: true,
  crossSurfaceParity: 'supported',
  recoveryPath: 'back으로 목록 복귀',
  evidenceKinds: ['fixture_only', 'current_browser_automation'],
  evidenceRefs: ['current-production-capture.json#scaleResults', 'screenshots/scale-60-mobile-list.png'],
  observedUserQuestion: '20개 이상에서 사용자가 검색과 최근 Flow 중 무엇을 먼저 쓰는가?',
});
addCell('P6', 'switch_cross_surface_restore', {
  route: '/my -> /calendar -> /my',
  initialState: '20 Flow, one selected Flow and list scroll',
  steps: ['Flow 검색', 'Flow 열기', 'Calendar 이동', '같은 Flow scope', 'My Flow 복귀', 'filter/scroll 확인'],
  status: 'partial',
  mentalModelPrediction: 'selected Flow identity와 list context가 surface 이동 뒤 복구된다.',
  actualResult: 'stable item identity는 유지되지만 cross-route filter/scroll 복구를 current production에서 확정하지 못했다.',
  explanationFree: false,
  crossSurfaceParity: 'partial',
  recoveryPath: 'Flow 검색으로 다시 찾기',
  contextLossCount: 1,
  evidenceKinds: ['current_source', 'heuristic_simulation'],
  evidenceRefs: ['components/flow/AppClient.tsx:5174', 'components/flow/AppClient.tsx:5624'],
  observedUserQuestion: 'Calendar에서 돌아왔을 때 이전 Flow와 scroll을 기대하는가?',
});
addCell('P6', 'archive_restore_delete_resave', {
  route: '/my?view=flows',
  initialState: 'one selected Flow among 20',
  steps: ['관리 메뉴', '보관', 'reload', '보관됨 필터', '복구', '다시 보관', 'backup', '영구 삭제'],
  status: 'hidden',
  mentalModelPrediction: 'Flow 관리 한 곳에서 lifecycle 단계를 이해한다.',
  actualResult: '계약과 동작은 지원되지만 경로가 6단계 이상이고 영구 삭제는 보관 후에야 드러난다.',
  explanationFree: false,
  crossSurfaceParity: 'supported',
  recoveryPath: 'immediate undo, direct restore, backup-gated permanent delete',
  evidenceKinds: ['current_browser_automation', 'current_source', 'current_command'],
  evidenceRefs: ['current-journey-probes.json#moving', 'tests/e2e/p31-mobile-journey-reconstruction.spec.ts:222'],
  observedUserQuestion: '사용자가 보관과 삭제를 올바르게 구분하는가?',
});

addCell('P7', 'resume', {
  route: '/ -> /my',
  initialState: 'saved incomplete Flow',
  steps: ['홈 이어서 실행', 'My Flow', '다음 할 일', '항목 열기'],
  status: 'supported',
  mentalModelPrediction: '재방문하면 Flow 전체보다 다음 행동이 먼저 보인다.',
  actualResult: 'continuation과 workspace next action이 유지됐다.',
  explanationFree: true,
  crossSurfaceParity: 'supported',
  recoveryPath: 'Flow 목록에서 다시 열기',
  evidenceKinds: ['current_production_screenshot', 'current_source'],
  evidenceRefs: ['screenshots/home-mobile.png', 'components/flow/AppClient.tsx:3341'],
  observedUserQuestion: '홈의 이어서 실행이 재방문 이유로 충분한가?',
});
addCell('P7', 'complete_undo_reopen', {
  route: '/my?view=flows',
  initialState: 'one active short Flow',
  steps: ['항목 완료', '즉시 undo', '다시 완료', '완료 view', '체크 해제 reopen'],
  status: 'supported',
  mentalModelPrediction: '완료와 완료 취소가 같은 item identity에 적용된다.',
  actualResult: '즉시 undo와 completed reopen이 동작했고 duplicate completion control은 관찰되지 않았다.',
  explanationFree: true,
  crossSurfaceParity: 'supported',
  recoveryPath: 'completion undo 또는 완료 view checkbox',
  evidenceKinds: ['current_browser_automation', 'current_source'],
  evidenceRefs: ['current-journey-probes.json#completed-keyboard'],
  observedUserQuestion: 'undo 시간이 지난 뒤 완료 view에서 다시 여는 위치를 찾는가?',
});
addCell('P7', 'reflect_new_run_history', {
  route: '/my?view=flows',
  initialState: 'completed Flow',
  steps: ['기록 탭', '회고', '새 run preview', '취소', '새 run 시작', '과거 run 확인'],
  status: 'hidden',
  mentalModelPrediction: '기록과 새 run이 현재 실행과 분리된다.',
  actualResult: 'reuse preview와 취소는 동작하지만 record tab 안쪽이며 production에서 과거 run 보존까지 끝까지 확정하지 않았다.',
  explanationFree: false,
  crossSurfaceParity: 'partial',
  recoveryPath: 'reuse preview cancel',
  evidenceKinds: ['current_browser_automation', 'current_source', 'current_command'],
  evidenceRefs: ['current-journey-probes.json#completed-keyboard', 'lib/flow/storage.ts:1467'],
  observedUserQuestion: '완료 후 회고와 새 run 중 어떤 행동을 먼저 기대하는가?',
});

addCell('P8', 'keyboard_core', {
  route: '/f/moving-d30-basic -> /my',
  initialState: 'keyboard-only, 390x844',
  steps: ['header tab', 'save-before controls', 'save', 'receipt', 'workspace tabs', 'completion'],
  status: 'supported',
  mentalModelPrediction: '모든 핵심 action이 이름과 focus indicator를 가진다.',
  actualResult: 'captured surfaces에서 unnamed focusable 0, overflow 0이며 targeted E2E가 통과했다.',
  explanationFree: true,
  crossSurfaceParity: 'supported',
  recoveryPath: 'Escape와 back',
  evidenceKinds: ['current_browser_automation', 'current_command'],
  evidenceRefs: ['current-production-capture.json', 'tests/e2e/p31-evidence-surfaces.spec.ts'],
  observedUserQuestion: 'screen reader의 Flow identity 반복이 과도하지 않은가?',
});
addCell('P8', 'overlay_focus_return', {
  route: '/calendar?demo=ux12',
  initialState: 'selected day with at least one event',
  steps: ['날짜 선택', 'agenda item 열기', 'detail sheet', 'Escape', 'trigger focus 확인'],
  status: 'supported',
  mentalModelPrediction: 'sheet를 닫으면 연 control로 focus가 돌아온다.',
  actualResult: 'production에서 sheet, Escape close, agenda trigger focus return이 모두 통과했다.',
  explanationFree: true,
  crossSurfaceParity: 'supported',
  recoveryPath: 'Escape',
  evidenceKinds: ['current_browser_automation', 'current_source'],
  evidenceRefs: ['current-journey-probes.json#completed-keyboard', 'screenshots/probe-completed-keyboard-calendar-focus.png'],
  observedUserQuestion: 'focus 복귀 후 현재 날짜와 Flow context를 음성으로 이해할 수 있는가?',
});
addCell('P8', 'error_destructive_cancel', {
  route: '/my?view=flows',
  initialState: 'archive/permanent-delete and export error states',
  steps: ['관리 메뉴', '영구 삭제 dialog', '취소', 'export 실패 상태', '재시도'],
  status: 'partial',
  mentalModelPrediction: 'destructive action은 focus trap과 취소를 제공하고 export 실패는 데이터 손실 없이 재시도한다.',
  actualResult: 'dialog/취소와 current tests는 확인했지만 production에 실패를 주입하지 않아 export retry는 미검증이다.',
  explanationFree: false,
  crossSurfaceParity: 'partial',
  recoveryPath: 'dialog cancel, export retry',
  evidenceKinds: ['current_source', 'current_command', 'heuristic_simulation'],
  evidenceRefs: ['components/flow/AppClient.tsx:17247', 'tests/e2e/p31-mobile-journey-reconstruction.spec.ts:222'],
  observedUserQuestion: '파괴적 동작 확인 문구가 저시력/키보드 사용자에게 충분한가?',
});

if (cells.length !== 24) {
  throw new Error(`Expected 24 scorecard cells, received ${cells.length}`);
}

const statusCounts = cells.reduce((counts, cell) => {
  counts[cell.status] = (counts[cell.status] ?? 0) + 1;
  return counts;
}, {});

const scaleMeasurements = capture.scaleResults.map((entry) => ({
  flowCount: entry.requestedCount,
  viewport: `${entry.viewport.width}x${entry.viewport.height}`,
  fixtureKind: entry.syntheticCount > 0 ? 'fixture_only_with_synthetic_local_copies' : 'fixture_only_seeded_current_bundles',
  reportedTotal: entry.reportedTotal,
  renderedListRows: entry.renderedCountBeforeOpen,
  searchVisible: entry.searchVisible,
  firstViewportDistinctCardTypeCount: entry.requestedCount >= 5 ? 3 : 2,
  firstViewportHeadingCount: entry.listInventory.firstViewportHeadings.length,
  firstViewportVisibleCommandCount: entry.listInventory.visibleCommandCount,
  firstActionDepth: entry.firstActionDepth,
  flowOpenDepth: entry.flowOpenDepth,
  horizontalOverflowPx: entry.listInventory.overflowPx,
  unnamedFocusableCount: entry.listInventory.unnamedFocusableCount,
  screenshot: entry.listScreenshot,
}));

const complexityMetrics = {
  schemaVersion: 1,
  originMainSha: ORIGIN_MAIN_SHA,
  production: PRODUCTION,
  observedUserCount: OBSERVED_USER_COUNT,
  evidenceKinds: ['current_browser_automation', 'fixture_only', 'current_source', 'heuristic_simulation'],
  measurementNotes: [
    '1/5/20/60은 current production DOM에 localStorage fixture를 주입해 측정했다.',
    '60개 중 11개는 scale 전용 synthetic local copies이며 social proof나 production inventory가 아니다.',
    'proposed 수치는 구현 전 wireframe interaction estimate이며 production 측정값이 아니다.',
  ],
  scaleMeasurements,
  currentPathMetrics: {
    reopenDepth: 1,
    completedViewReopenDepth: 2,
    itemEditDepth: 6,
    wholeExportDepth: 6,
    archiveRestoreDepth: 6,
    actionableDuplicateCount: 0,
    contextLossCount: 1,
    explanationDependencyCount: 1,
  },
  contentShapes: [
    { id: 'anchor_timeline', route: '/f/moving-d30-basic', status: 'partial', meaningPreserved: true, gap: 'post-save global anchor change missing' },
    { id: 'undated_checklist', route: '/f/vehicle-inspection-prep', status: 'supported', meaningPreserved: true, gap: null },
    { id: 'recurrence_routine', route: '/f/curated-allblanc-morning-workout', status: 'supported', meaningPreserved: true, gap: 'history depth remains hidden' },
    { id: 'artifact_choice', route: '/f/curated-wedding-naver-timeline', status: 'supported', meaningPreserved: true, gap: null },
    { id: 'mixed_travel', route: '/f/real-mofa-overseas-travel-prep', status: 'blocked', meaningPreserved: false, gap: '404; replacement is memo-first and not equivalent' },
    { id: 'personal_draft', route: '/flows', status: 'hidden', meaningPreserved: true, gap: 'structure mode required before add/delete/reorder' },
  ],
  alternatives: [
    {
      id: 'A_keep_and_tighten',
      evidenceKind: 'heuristic_simulation',
      estimatedMetrics: { itemEditDepth: 5, wholeExportDepth: 5, archiveRestoreDepth: 5, firstViewportVisibleCommandCount: 18 },
      benefit: '낮은 구현 위험과 빠른 시각 정리',
      failure: '핵심 command가 서로 다른 탭/disclosure에 남아 structural gate를 닫지 못함',
    },
    {
      id: 'B_library_to_focused_workspace',
      selected: true,
      evidenceKind: 'heuristic_simulation',
      estimatedMetrics: { itemEditDepth: 3, wholeExportDepth: 3, archiveRestoreDepth: 4, firstViewportVisibleCommandCount: 12 },
      benefit: '현재 projection과 4탭을 유지하면서 object command를 한 workspace에 모음',
      failure: 'Flow 선택 context/back restoration을 별도 regression gate로 고정해야 함',
    },
    {
      id: 'C_run_first_workspace',
      evidenceKind: 'heuristic_simulation',
      estimatedMetrics: { itemEditDepth: 3, wholeExportDepth: 4, archiveRestoreDepth: 5, firstViewportVisibleCommandCount: 10 },
      benefit: 'routine과 반복 실행에서 강한 집중',
      failure: '단순 checklist, artifact-choice, source definition을 current run 아래로 밀어 product scope를 왜곡함',
    },
  ],
  structuralReopenGate: {
    triggeredCriteria: [5],
    evidence: '수정, 전체 export, archive/restore 중 3개가 hidden 또는 5 interactions 초과',
    verdict: 'my_flow_structural_reopen',
    crossTabGateTriggered: false,
  },
};

const discontinuities = [
  ['P1', 'discover_save_land -> personalize_execute_reopen', 'saved flow and 24 item identities', 'global anchor edit entry missing', '새 public save로 돌아감', 'High'],
  ['P1', 'personalize_execute_reopen -> export_lifecycle_reuse', 'personal item overrides', 'export/reuse commands are hidden in record/advanced', 'workspace record tab', 'High'],
  ['P2', 'preview_save -> schedule_undo_complete', 'undated stable items', 'none observed', 'Calendar tray', 'Low'],
  ['P2', 'schedule_undo_complete -> scope_export_remove_date', 'personal date override', 'full production parity not replayed', 'item detail and export panel', 'Medium'],
  ['P3', 'configure_save -> execute_occurrence_reopen', 'series and occurrence identity', 'none observed', 'workspace execute', 'Low'],
  ['P3', 'execute_occurrence_reopen -> history_next_occurrence_export', 'run completion state', 'history/export are nested', 'record tab and advanced actions', 'Medium'],
  ['P4', 'choose_artifact_save -> adjust_phase_item_note', 'mixed Flow identity', 'requested route is 404', 'no equivalent recovery', 'High'],
  ['P4', 'adjust_phase_item_note -> export_source_update', 'none', 'journey cannot start', 'replace fixture after source gate', 'High'],
  ['P5', 'miss_memo_save_land -> structure_schedule_edit', 'draft stable slug and source fragments', 'structure controls hidden until batch mode', 'whole plan then multi-item adjustment', 'High'],
  ['P5', 'structure_schedule_edit -> projection_lifecycle', 'effective item order and tombstones', 'full export/lifecycle parity not production-replayed', 'reload plus current E2E evidence', 'Medium'],
  ['P6', 'find_open -> switch_cross_surface_restore', 'selected Flow identity', 'filter/scroll context may be lost across route', 'search again', 'Medium'],
  ['P6', 'switch_cross_surface_restore -> archive_restore_delete_resave', 'saved Flow identity', 'lifecycle actions split across menu/filter/dialog', 'archived filter', 'High'],
  ['P7', 'resume -> complete_undo_reopen', 'active run and next item', 'none observed', 'undo/completed view', 'Low'],
  ['P7', 'complete_undo_reopen -> reflect_new_run_history', 'completed run', 'reflection/reuse hidden in record', 'record tab', 'Medium'],
  ['P8', 'keyboard_core -> overlay_focus_return', 'selected date and trigger identity', 'none observed', 'Escape focus return', 'Low'],
  ['P8', 'overlay_focus_return -> error_destructive_cancel', 'focus origin', 'production error injection not performed', 'cancel and current test evidence', 'Medium'],
].map(([personaId, transition, carriedState, discontinuity, recovery, severity], index) => ({
  id: `P31-D${String(index + 1).padStart(2, '0')}`,
  personaId,
  transition,
  carriedState,
  discontinuity,
  recovery,
  severity,
  evidenceKind: severity === 'Low' ? 'current_browser_automation' : 'heuristic_simulation',
}));

const decisionMatrix = {
  schemaVersion: 1,
  verdict: 'my_flow_structural_reopen',
  currentEvidence: {
    originMainSha: ORIGIN_MAIN_SHA,
    productionCapture: 'current-production-capture.json',
    journeyProbes: 'current-journey-probes.json',
    scorecard: statusCounts,
    observedUserCount: OBSERVED_USER_COUNT,
  },
  criteria: [
    { id: 'depth_reduction', weight: 0.25 },
    { id: 'six_shape_fit', weight: 0.2 },
    { id: 'contract_safety', weight: 0.2 },
    { id: 'mobile_focus', weight: 0.15 },
    { id: 'implementation_feasibility', weight: 0.1 },
    { id: 'rollback_clarity', weight: 0.1 },
  ],
  alternativeScores: [
    { id: 'A_keep_and_tighten', scores: [2, 3, 5, 2, 5, 5], weightedScore: 3.35, decision: 'reject' },
    { id: 'B_library_to_focused_workspace', scores: [5, 5, 4, 5, 3, 4], weightedScore: 4.5, decision: 'select' },
    { id: 'C_run_first_workspace', scores: [4, 2, 2, 4, 1, 2], weightedScore: 2.75, decision: 'defer' },
  ],
  selectedAlternative: 'B_library_to_focused_workspace',
  rejectedAlternatives: {
    A_keep_and_tighten: '시각 정리만으로 수정/export/lifecycle 깊이 기준을 닫지 못한다.',
    C_run_first_workspace: 'routine에는 맞지만 checklist, mixed plan, source Flow를 run 중심으로 과도하게 재해석한다.',
  },
  stableContracts: [
    'source definition and source version',
    'personal title/date/memo/structural overlay',
    'execution run and completion/reopen',
    'recurrence series/revision/occurrence',
    'export scope/count/stable identity receipt',
    '4-tab global IA and public /f shell',
  ],
  migrationRequired: false,
  stagedRollout: ['P32-01', 'P32-02', 'P32-03', 'P32-04', 'P32-05'],
  rollback: '각 slice는 기존 projection/storage API를 유지하고 composition entry를 독립적으로 되돌린다.',
  acceptanceMarkers: [
    'P32-MIXED-SHAPE-ROUTE-CONTRACT',
    'P32-MY-FLOW-FOCUSED-COMMANDS',
    'P32-ITEM-QUICK-EDIT',
    'P32-ANCHOR-REUSE',
    'P32-CONTEXT-RESTORE',
  ],
  observedUserQuestions: [
    'Flow를 연 뒤 수정, 가져가기, 보관 위치를 설명 없이 찾는가?',
    '지금과 실행, 완료와 기록을 서로 다른 수준으로 이해하는가?',
    '보관과 영구 삭제의 차이를 예측하는가?',
    '전체 기준일과 개별 날짜 override 차이를 이해하는가?',
    '날짜 없는 항목을 Calendar 배치 대기열로 이해하는가?',
    'routine과 이번 occurrence를 구분하는가?',
    '외부 export 후 My Flow에 돌아올 이유가 있는가?',
  ],
  claudeDesignAlternative: {
    status: 'inaccessible',
    note: 'current P31 handoff package에 완성된 Claude Design 대안은 없고 prompt만 확인됐다.',
  },
};

const routeEvidence = {
  schemaVersion: 1,
  reviewerRole: 'codex_independent',
  originMainSha: ORIGIN_MAIN_SHA,
  production: PRODUCTION,
  capturedAt: {
    surfaces: { startedAt: capture.startedAt, completedAt: capture.completedAt },
    journeys: { startedAt: probes.startedAt, completedAt: probes.completedAt },
  },
  observedUserCount: OBSERVED_USER_COUNT,
  appCodeChanged: false,
  dependencyChanged: false,
  statusRoadmapChanged: false,
  routes: capture.surfaceResults.map((surface) => ({
    route: surface.route,
    viewport: `${surface.viewport.width}x${surface.viewport.height}`,
    status: surface.httpStatus,
    screenshot: `screenshots/${surface.screenshot}`,
    visibleCommandCount: surface.visibleCommandCount,
    horizontalOverflowPx: surface.overflowPx,
    unnamedFocusableCount: surface.unnamedFocusableCount,
    consoleErrorCount: surface.consoleErrors.length,
    pageErrorCount: surface.pageErrors.length,
    evidenceKind: 'current_browser_automation',
  })),
  commands: [
    { command: 'npm.cmd ci', status: 'passed', detail: '215 packages installed from package-lock' },
    { command: 'npm.cmd run docs:check', status: 'passed_final', detail: '14 required files, 3113 local links' },
    { command: 'npm.cmd test', status: 'passed', detail: '34 pretest + 587 unit/workflow tests' },
    { command: 'npm.cmd run build', status: 'passed', detail: 'Next 15.5.21, 18 static pages' },
    { command: 'targeted P31 Playwright', status: 'passed', detail: '5/5' },
    { command: 'npm.cmd run test:e2e -- --reporter=line', status: 'environment_retry_required', detail: '306/310; 4 browser allocation/navigation timeouts after VirtualAlloc failure' },
    { command: 'npx.cmd playwright test --last-failed --workers=1 --reporter=line', status: 'passed', detail: '4/4; all 310 test assertions passed across retry' },
    { command: 'npm.cmd run security:audit', status: 'failed', detail: 'postcss advisory: 1 high, 1 moderate; force fix would downgrade Next to 9.3.3' },
  ],
  sourceEvidence: [
    { file: 'components/flow/AppClient.tsx', lines: [5850, 7551, 7557], claim: '20+ grouping and mobile 8-row limit' },
    { file: 'components/flow/AppClient.tsx', lines: [15255, 15301, 15420], claim: 'management, workspace tabs, advanced export disclosure' },
    { file: 'lib/flow/personal-flow-lifecycle.ts', lines: [135, 150], claim: 'archive and restore are separate' },
    { file: 'lib/flow/storage.ts', lines: [932], claim: 'permanent delete is separate and removes lifecycle references' },
    { file: 'lib/flow/export-scope.ts', lines: [10, 134, 231], claim: 'flow/selected/item scope and receipt contract' },
    { file: 'tests/e2e/flow-mvp.spec.ts', lines: [5840], claim: 'requested mixed travel route is intentionally closed' },
  ],
  verificationGaps: [
    '실제 사용자 관찰 0명',
    'cross-device/account persistence는 범위 밖',
    'production error injection을 하지 않아 export retry는 source/test evidence만 사용',
    '60 Flow는 fixture_only이며 real user data와 performance telemetry가 아님',
    'P31 Claude Design 완성 대안은 package에서 확인되지 않음',
  ],
};

const nextProgram = `# P32 My Flow Focused Workspace Program

## 결정

- P31 verdict: \`my_flow_structural_reopen\`
- 선택안: B \`library -> focused workspace\`
- 범위: My Flow 내부 command hierarchy와 continuity
- 유지: 4탭 IA, public \`/f\`, current projection, stable identity, archive/restore/delete 분리
- migration: 없음
- observed-user count: 0

## P32-01 Route/Evidence Correctness

**문제:** P31 정본의 mixed travel route가 production에서 404이며 대체 route는 같은 shape가 아니다.

**범위:** 유효한 mixed date/check/resource fixture를 지정하거나 cell을 blocked로 명시한다. source safety gate는 유지한다.

**비범위:** closed MOFA Flow를 검토 편의로 공개, source 내용 재작성.

**의존성:** 없음. 반드시 첫 slice.

**구현 영향:** docs route manifest, route fixture, 관련 E2E. 앱 route를 추가할 경우 source quality gate 승인이 선행되어야 한다.

**검증:** 390/1024 status 200, date/check/resource role screenshot, route contract unit/E2E.

**rollback:** fixture 문서만 이전 값으로 되돌린다.

**완료 marker:** \`P32-MIXED-SHAPE-ROUTE-CONTRACT\`

## P32-02 Focused Workspace Command Hierarchy

**문제:** global 3 tabs와 local 3 tabs, management, advanced actions가 동시에 존재한다.

**범위:** Flow drill-in 중 object header, 다음 행동, 빠른 수정, 가져가기, 관리 순으로 재구성한다. back은 목록 filter/scroll을 복구한다.

**비범위:** 4탭 IA 변경, storage/projection 재작성, full planner 기능.

**의존성:** P32-01.

**영향 파일:** \`components/flow/AppClient.tsx\`, 필요 시 focused header/action component, \`FlowExecutionPrimitives.tsx\`.

**390 acceptance:** 첫 viewport command 12 이하, competing primary 1개, item edit/export 3단계 이내.

**1024 acceptance:** rail/canvas/inspector를 유지하되 object commands가 canvas/inspector에 한 번만 보인다.

**접근성:** back, menu, quick actions accessible name; drill-in focus 이동과 back focus/scroll 복구.

**테스트:** P31 workspace E2E 확장, 1/5/20/60 scale, six-shape screenshot.

**rollback:** current My Flow workspace renderer로 component-level rollback.

**완료 marker:** \`P32-MY-FLOW-FOCUSED-COMMANDS\`, \`P32-MOBILE-OBJECT-FOCUS\`

## P32-03 Quick Item Edit

**문제:** 일반 항목 수정도 전체 계획, 상세 disclosure, edit mode를 거쳐 6단계다.

**범위:** row의 열기에서 title/date/memo quick sheet를 제공한다. recurrence/structure/source fields는 advanced로 유지한다.

**비범위:** universal property editor, source item 원본 수정, recurrence schema 변경.

**의존성:** P32-02.

**영향 파일:** \`AppClient.tsx\`, \`FlowExecutionPrimitives.tsx\`, 기존 item detail editor.

**acceptance:** 390/1024에서 수정 저장 3단계 이내, cancel/dirty guard/focus return, Calendar/My Flow/export identity parity.

**rollback:** 기존 detail read/edit disclosure를 fallback으로 유지.

**완료 marker:** \`P32-ITEM-QUICK-EDIT\`

## P32-04 Anchor, Export, Lifecycle Commands

**문제:** public moving save는 전체 기준일 재조정이 없고 export/lifecycle은 깊고 분리돼 있다.

**범위:** object command sheet에서 전체 기준일, whole/selected/current export entry, archive를 제공한다. 영구 삭제는 archived 상태에서만 제공한다.

**비범위:** archive와 delete 통합, old run overwrite, new export format.

**의존성:** P32-02, P32-03.

**데이터:** 기존 anchor, personal override, lifecycle schema, export receipt를 그대로 사용한다. migration 없음.

**acceptance:** moving anchor 변경 후 개인 고정 날짜 유지, scope/count preflight, archive undo, reload restore, backup-gated delete.

**rollback:** 각 command adapter만 제거하고 current storage는 그대로 둔다.

**완료 marker:** \`P32-ANCHOR-REUSE\`, \`P32-LIFECYCLE-DISCLOSURE\`, \`P32-EXPORT-SCOPE-ENTRY\`

## P32-05 Continuity and Final Gate

**문제:** cross-surface filter/scroll 복구와 60 Flow scale은 현재 일부만 확인됐다.

**범위:** My Flow selected Flow/filter/scroll, Calendar Flow scope/date, export receipt identity를 continuity matrix로 고정한다.

**비범위:** account sync, cross-device, telemetry 기반 personalization.

**의존성:** P32-01..04.

**acceptance:** 24 cells 재실행, 1/5/20/60, six shapes, 390/1024/1440, overflow/fixed overlap/focus/accessibility, unit/build/full E2E.

**rollback:** selected Flow context restoration만 feature boundary로 분리한다.

**완료 marker:** \`P32-CONTEXT-RESTORE\`, \`P32-FINAL-24-CELL-GATE\`

## 순서와 병렬성

1. P32-01은 선행.
2. P32-02 다음 P32-03.
3. P32-04의 export/lifecycle visual work는 P32-03과 일부 병렬 가능하지만 anchor integration은 P32-02 이후.
4. P32-05는 마지막 통합 gate.

## 실제 사용자 관찰 전에 닫을 항목

- mixed fixture 404
- public moving anchor 재조정
- item edit/export/archive depth
- 보관/삭제 semantics와 focus
- 24-cell automated/heuristic gate
- security audit high advisory의 별도 release 판단
`;

const referenceMatrix = `# Reference Pattern Matrix

조사일: 2026-07-24. 모든 항목은 공식 도움말을 사용한 \`reference_pattern\`이며 FlowMe 사용자 관찰이 아니다.

| 제품 | 공식 근거 | 확인한 pattern | FlowMe 판단 | 적용 금지 |
| --- | --- | --- | --- | --- |
| Todoist | [Today view](https://www.todoist.com/help/articles/plan-your-day-with-the-today-view-UVUXaiSs) | Today는 여러 project의 오늘 task를 모으고 날짜 없는 task는 project/filter에 남긴다. | **변형 적용:** My Flow 지금은 실행 queue, Flow 목록은 context library로 유지한다. | priority, team, project 체계 전체 복제 |
| Things | [Today/Upcoming/Anytime/Someday](https://culturedcode.com/things/support/articles/4001304/) | 시간 관점과 project/area context를 분리하며 Logbook에 완료를 둔다. | **적용:** 지금/Flow/완료의 질문을 분리하되 Flow를 연 뒤에는 object focus를 우선한다. | Someday 철학과 Apple 전용 gesture 복제 |
| Apple Reminders | [Smart Lists](https://support.apple.com/en-gb/guide/iphone/iphe882772ed/ios) | Today, Scheduled, All, Completed가 같은 reminder를 목적별로 모은다. | **변형 적용:** stable Item을 유지하며 surface는 projection으로만 다르게 보인다. | location, assignment, iCloud 기능 추가 |
| Google Calendar | [Create/edit events](https://support.google.com/calendar/answer/72143?co=GENIE.Platform%3DAndroid&hl=en) | 날짜 배치와 item detail을 Calendar context에서 처리한다. 현재 공식 페이지는 이번 browser fetch에서 inaccessible이었다. | **현재 유지:** selected-day agenda와 focus-returning sheet. | Calendar를 Flow structure editor로 확장 |
| Notion | [Views and open pages](https://www.notion.com/help/views-filters-and-sorts) | 같은 database를 여러 view로 보고 page는 side/center/full로 집중해서 연다. | **변형 적용:** mobile drill-in, wide rail/canvas/inspector. | 범용 database property/editor 노출 |
| Hevy | [Workouts vs Routines](https://help.hevyapp.com/hc/en-us/articles/33703513582871-Workouts-vs-Routines-in-Hevy-What-They-Mean-and-How-to-Use-Them) | routine은 재사용 계획, workout은 현재 실행 기록이다. | **적용:** series, occurrence, run history를 같은 card state로 합치지 않는다. | 운동 전용 set/weight analytics |
| Wanderlog | [Help Center](https://help.wanderlog.com/hc/en-us) | daily itinerary, place/list, map, batch move를 trip identity 안에서 분리한다. | **변형 적용:** timeline/mixed Flow는 phase/date group body renderer를 쓴다. | booking, map routing, cost planner |

## 결론

- **Keep:** stable object identity, date-first Calendar, routine/run 분리.
- **Adapt:** library에서 focused object workspace로 drill-in, 빠른 수정과 상세 수정 분리.
- **Reject:** 범용 database, social proof, team collaboration, booking, planner 기능 확장.
`;

function mdList(values) {
  return values.map((value) => `- ${value}`).join('\n');
}

const auditMd = `# FlowMe P31 Independent My Flow Review

## Verdict

\`my_flow_structural_reopen\`

현재 P31은 저장 전 preview, receipt, completion undo, undated Calendar 배치, recurrence identity, personal draft overlay, archive/restore/permanent delete 계약을 안정적으로 갖고 있다. 그러나 My Flow에서 **수정, 전체 export, archive/restore 중 3개가 hidden이거나 5 interactions를 초과**해 정본의 structural reopen 기준 5를 충족한다.

재개 범위는 My Flow 내부 composition이다. 4탭 IA, public \`/f\`, source/personal/run/occurrence/export 계약은 다시 열지 않는다. 선택안은 B \`library -> focused workspace\`다.

Observed-user count: **0**. production automation, screenshot, fixture, heuristic simulation은 실제 사용자 검증이 아니다.

## Severity Findings

${findings.map((finding) => `### ${finding.severity} ${finding.id}: ${finding.title}

- Route: \`${finding.route}\`
- Viewport: ${finding.viewport}
- Start: ${finding.startState}
- Reproduction:
${finding.reproductionSteps.map((step, index) => `  ${index + 1}. ${step}`).join('\n')}
- Expected: ${finding.expected}
- Actual: ${finding.actual}
- Impact: ${finding.userImpact}
- Evidence: ${finding.evidenceKinds.map((kind) => `\`${kind}\``).join(', ')}
- Evidence refs: ${finding.evidenceRefs.map((ref) => `\`${ref}\``).join(', ')}
- Data contract: ${finding.dataContractImpact}
- Resolution: ${finding.proposedResolution}
- Rejected: ${finding.rejectedAlternatives.join(' ')}
- Rollback: ${finding.rollback}
- Acceptance: \`${finding.acceptanceMarker}\`, ${finding.acceptanceScreenshot}
- Observed-user question: ${finding.observedUserQuestion}
`).join('\n')}

## What Works

- 1/5/20/60 Flow에서 원하는 Flow open depth는 2였다.
- mobile 20/60은 8개 row 뒤 더보기, wide는 searchable rail을 사용했다.
- production capture 25개 surface와 8개 scale state에서 horizontal overflow 0, unnamed focusable 0이었다.
- vehicle undated scheduling/undo, routine occurrence completion/reopen, draft add/delete/undo/reload, Calendar sheet Escape/focus return이 production에서 동작했다.
- targeted P31 E2E 5/5, full E2E는 병렬 실행 306/310 뒤 환경 failure 4개를 serial retry해 4/4 통과했다.

## Remaining Evidence Gaps

${mdList(routeEvidence.verificationGaps)}
`;

const readme = `# FlowMe P31 Independent My Flow Review - Codex

## 전체 판정

**\`my_flow_structural_reopen\`**

P31의 data/identity 계약과 4탭 IA는 유지한다. My Flow 안에서 선택한 Flow의 수정, 가져가기, 관리 명령을 한 focused workspace로 다시 배열해야 한다.

## 가장 중요한 근거

1. Flow 찾기와 열기는 1/5/20/60개에서 2단계 안에 유지됐다.
2. 항목 수정 6단계, whole export 6단계, archive/restore 6단계로 structural reopen criterion 5가 발동했다.
3. public \`moving-d30-basic\` 저장본에는 전체 기준일 재조정 진입이 없다.
4. 보관/복구/영구 삭제 계약은 올바르지만 위치가 분산돼 삭제가 없는 것처럼 보일 수 있다.
5. 지정 mixed travel route는 production 404이고 replacement는 동등한 shape가 아니다.

## 24-cell

- supported: ${statusCounts.supported ?? 0}
- hidden: ${statusCounts.hidden ?? 0}
- partial: ${statusCounts.partial ?? 0}
- missing: ${statusCounts.missing ?? 0}
- blocked: ${statusCounts.blocked ?? 0}

## 파일

- [review.html](./review.html)
- [audit.md](./audit.md)
- [persona-journey-scorecard.json](./persona-journey-scorecard.json)
- [my-flow-complexity-metrics.json](./my-flow-complexity-metrics.json)
- [journey-discontinuity-matrix.json](./journey-discontinuity-matrix.json)
- [reference-pattern-matrix.md](./reference-pattern-matrix.md)
- [decision-matrix.json](./decision-matrix.json)
- [next-program.md](./next-program.md)
- [route-evidence.json](./route-evidence.json)
- [current-production-capture.json](./current-production-capture.json)
- [current-journey-probes.json](./current-journey-probes.json)
- [screenshots](./screenshots/)

## 검증

- origin/main: \`${ORIGIN_MAIN_SHA}\`
- \`npm.cmd ci\`: pass
- \`npm.cmd run docs:check\`: final pass, 14 required files and 3113 local links
- \`npm.cmd test\`: 34 pretest + 587 tests pass
- \`npm.cmd run build\`: pass
- targeted P31 E2E: 5/5 pass
- full E2E: 306/310 in parallel; 4 environment failures; serial retry 4/4 pass
- security audit: fail, postcss 1 high + 1 moderate
- app code/dependency/STATUS/ROADMAP changes: none
- commit/push/deploy: none
- observed-user count: 0
`;

const statusLabel = {
  supported: '지원',
  hidden: '숨김',
  partial: '부분',
  missing: '누락',
  blocked: '차단',
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const scoreRows = cells.map((cell) => `
  <tr data-status="${cell.status}">
    <td><strong>${cell.personaId}</strong><br><span>${escapeHtml(cell.sessionId)}</span></td>
    <td><code>${escapeHtml(cell.route)}</code><br>${escapeHtml(cell.steps.join(' -> '))}</td>
    <td><span class="status ${cell.status}">${statusLabel[cell.status]}</span></td>
    <td>${escapeHtml(cell.actualResult)}</td>
    <td>${cell.explanationFree ? '예' : '아니오'} / ${escapeHtml(cell.crossSurfaceParity)}</td>
  </tr>`).join('');

const findingCards = findings.map((finding) => `
  <article class="finding severity-${finding.severity.toLowerCase()}">
    <div class="finding-top"><span class="severity">${finding.severity}</span><code>${finding.id}</code></div>
    <h3>${escapeHtml(finding.title)}</h3>
    <p class="route">${escapeHtml(finding.route)} · ${escapeHtml(finding.viewport)}</p>
    <div class="compare"><div><b>기대</b><p>${escapeHtml(finding.expected)}</p></div><div><b>실제</b><p>${escapeHtml(finding.actual)}</p></div></div>
    <p><b>사용자 영향:</b> ${escapeHtml(finding.userImpact)}</p>
    <p><b>권장:</b> ${escapeHtml(finding.proposedResolution)}</p>
    <p class="evidence"><b>Evidence:</b> ${finding.evidenceKinds.map(escapeHtml).join(', ')}<br>${finding.evidenceRefs.map(escapeHtml).join(' · ')}</p>
    <p><b>Acceptance:</b> <code>${escapeHtml(finding.acceptanceMarker)}</code></p>
  </article>`).join('');

const scaleRows = scaleMeasurements.map((entry) => `
  <tr>
    <td>${entry.flowCount}</td><td>${entry.viewport}</td><td>${entry.reportedTotal}</td><td>${entry.renderedListRows}</td>
    <td>${entry.searchVisible ? '표시' : '숨김'}</td><td>${entry.firstViewportVisibleCommandCount}</td>
    <td>${entry.flowOpenDepth}</td><td>${entry.horizontalOverflowPx}</td><td>${entry.unnamedFocusableCount}</td>
  </tr>`).join('');

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FlowMe P31 Production 독립 검토 - Codex</title>
  <style>
    :root{--ink:#171815;--muted:#666960;--line:#dfe2dc;--soft:#f5f6f2;--paper:#fff;--action:#2457e6;--red:#b42318;--amber:#9a6700;--green:#16794c}
    *{box-sizing:border-box} html{scroll-behavior:smooth} body{margin:0;background:#eef0eb;color:var(--ink);font-family:Inter,Pretendard,"Noto Sans KR",Arial,sans-serif;letter-spacing:0}
    a{color:var(--action)} code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.9em}
    header{background:#171815;color:white;padding:34px 24px 30px} header .inner,main{width:min(1180px,calc(100% - 32px));margin:auto}
    .eyebrow{font-size:12px;font-weight:800;color:#a9bfff;text-transform:uppercase}.verdict{display:inline-flex;margin-top:14px;padding:7px 10px;border:1px solid #718fff;background:#253053;font-weight:800;border-radius:4px}
    h1{max-width:900px;margin:12px 0 8px;font-size:clamp(28px,4vw,50px);line-height:1.12} header p{max-width:850px;color:#d8ddd5;line-height:1.65}
    nav{position:sticky;top:0;z-index:20;background:#fff;border-bottom:1px solid var(--line);overflow:auto;white-space:nowrap} nav .inner{display:flex;gap:4px;padding:8px 0} nav a{padding:9px 11px;color:#333;text-decoration:none;font-size:13px;font-weight:750;border-radius:4px} nav a:hover{background:var(--soft)}
    main{padding:26px 0 60px}.section{min-width:0;margin-top:28px;background:var(--paper);border:1px solid var(--line);padding:22px;border-radius:6px}.section>h2{margin:0 0 7px;font-size:23px}.lead{margin:0;color:var(--muted);line-height:1.65}
    .metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:18px}.metric{background:var(--soft);border:1px solid var(--line);padding:15px;border-radius:4px}.metric b{display:block;font-size:24px}.metric span{font-size:12px;color:var(--muted)}
    .findings{display:grid;min-width:0;gap:12px;margin-top:18px}.finding{min-width:0;overflow-wrap:anywhere;border:1px solid var(--line);border-left:5px solid var(--amber);padding:16px;border-radius:4px}.severity-high{border-left-color:var(--red)}.severity-medium{border-left-color:var(--amber)}.finding-top{display:flex;gap:8px;align-items:center}.severity{font-size:11px;font-weight:900;text-transform:uppercase}.finding h3{margin:8px 0 4px}.route,.evidence{font-size:12px;color:var(--muted);overflow-wrap:anywhere}.compare{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}.compare>div{min-width:0;background:var(--soft);padding:10px}.compare p{margin:5px 0;line-height:1.5}
    table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}th,td{text-align:left;vertical-align:top;padding:10px;border-bottom:1px solid var(--line);line-height:1.45}th{background:var(--soft);font-size:12px}.table-wrap{max-width:100%;overflow:auto}
    .status{display:inline-flex;padding:4px 7px;border-radius:3px;font-size:11px;font-weight:850}.supported{background:#dff5e9;color:#11663f}.hidden{background:#fff0c7;color:#795400}.partial{background:#e7edff;color:#244aa5}.blocked{background:#ffe1dd;color:#8f2117}.missing{background:#ececec;color:#555}
    .filters{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}.filters button{border:1px solid var(--line);background:white;padding:8px 10px;border-radius:4px;font-weight:700;cursor:pointer}.filters button[aria-pressed="true"]{background:#171815;color:white}
    .alternatives{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:16px}.alternative{border:1px solid var(--line);padding:15px;border-radius:4px}.alternative.selected{border:2px solid var(--action);background:#f5f8ff}.alternative h3{margin:0 0 8px}.score{font-size:30px;font-weight:900}
    .wire-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;margin-top:16px}.wire{min-width:0;border:1px solid var(--line);background:#f7f8f5;padding:14px;border-radius:5px}.phone{width:min(100%,340px);margin:auto;border:2px solid #343633;background:white;padding:8px;border-radius:18px}.wide-wire{min-width:0;border:2px solid #343633;background:white;padding:8px;min-height:290px}.wire-block{min-width:0;overflow-wrap:anywhere;border:1px solid #cfd3cb;padding:9px;margin:7px 0;background:white;border-radius:3px;font-size:12px}.wire-block.primary{border-color:var(--action);background:#f3f6ff}.wire-block.muted{background:#f0f1ed;color:#666}.row{display:flex;gap:7px}.row>*{min-width:0;flex:1}.wide-layout{display:grid;grid-template-columns:190px minmax(0,1fr) 220px;gap:7px}.wide-layout .wire-block{margin:0;min-height:250px}
    .gallery{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:16px}.shot{margin:0;border:1px solid var(--line);background:#fff;padding:8px}.shot img{display:block;width:100%;height:250px;object-fit:cover;object-position:top;border:1px solid #eee}.shot figcaption{padding:8px 2px 2px;font-size:12px;color:var(--muted)}
    .program{display:grid;gap:10px;margin-top:15px}.slice{border-left:4px solid var(--action);background:var(--soft);padding:13px}.slice h3{margin:0 0 5px}.footnote{font-size:12px;color:var(--muted);line-height:1.55}
    @media(max-width:760px){header{padding:26px 0}.metrics{grid-template-columns:1fr 1fr}.alternatives,.wire-grid,.gallery{grid-template-columns:1fr}.compare{grid-template-columns:1fr}.section{padding:16px}.wide-layout{grid-template-columns:1fr}.wide-layout .wire-block{min-height:auto}.shot img{height:340px}}
  </style>
</head>
<body>
<header><div class="inner">
  <div class="eyebrow">REVIEWER_ROLE: codex_independent · origin/main ${ORIGIN_MAIN_SHA.slice(0,12)}</div>
  <h1>FlowMe P31 Production<br>My Flow 독립 검토</h1>
  <div class="verdict">my_flow_structural_reopen</div>
  <p>P31의 projection과 lifecycle 계약은 유지한다. 다시 열 범위는 My Flow 내부의 command hierarchy다. 기능이 없는 문제가 아니라 수정, 가져가기, 보관/삭제가 서로 다른 탭과 접힘 영역에 흩어진 문제가 남았다.</p>
</div></header>
<nav><div class="inner"><a href="#verdict">판정</a><a href="#findings">Findings</a><a href="#journeys">24 cells</a><a href="#complexity">복잡도</a><a href="#alternatives">A/B/C</a><a href="#wireframes">Wireframe</a><a href="#contracts">계약</a><a href="#program">P32</a><a href="#evidence">Evidence</a></div></nav>
<main>
  <section class="section" id="verdict">
    <h2>Executive verdict</h2>
    <p class="lead">Flow 찾기와 열기는 scale에 버틴다. 그러나 선택한 Flow에서 항목 수정, whole export, archive/restore가 각각 6단계다. 정본 criterion 5가 발동하므로 bounded polish가 아니라 My Flow 내부 구조를 제한적으로 다시 연다. Home/Find/Calendar와 4탭 IA는 현재 근거로 재개하지 않는다.</p>
    <div class="metrics">
      <div class="metric"><b>24</b><span>persona-session cells</span></div>
      <div class="metric"><b>${statusCounts.supported}</b><span>supported</span></div>
      <div class="metric"><b>${statusCounts.hidden + statusCounts.partial + statusCounts.blocked}</b><span>hidden + partial + blocked</span></div>
      <div class="metric"><b>0</b><span>observed users</span></div>
      <div class="metric"><b>2</b><span>Flow open depth at 1/5/20/60</span></div>
      <div class="metric"><b>6</b><span>item edit depth</span></div>
      <div class="metric"><b>6</b><span>whole export depth</span></div>
      <div class="metric"><b>6</b><span>archive/restore depth</span></div>
    </div>
  </section>

  <section class="section" id="findings"><h2>Severity findings</h2><p class="lead">Blocking은 없었다. High 4개와 Medium 2개를 current production/source/command 근거로 분리했다.</p><div class="findings">${findingCards}</div></section>

  <section class="section" id="journeys">
    <h2>8 personas x 3 sessions</h2>
    <p class="lead">지원 여부는 capability 존재와 발견성을 분리했다. hidden은 기능이 있지만 현재 설명 없이 찾기 어려운 상태다.</p>
    <div class="filters" aria-label="여정 상태 필터">
      <button type="button" data-filter="all" aria-pressed="true">전체 24</button>
      ${Object.entries(statusLabel).map(([key,label]) => `<button type="button" data-filter="${key}" aria-pressed="false">${label} ${statusCounts[key] ?? 0}</button>`).join('')}
    </div>
    <div class="table-wrap"><table><thead><tr><th>Cell</th><th>Route / steps</th><th>판정</th><th>실제 결과</th><th>설명 없이 / parity</th></tr></thead><tbody id="score-body">${scoreRows}</tbody></table></div>
  </section>

  <section class="section" id="complexity">
    <h2>My Flow complexity metrics</h2>
    <p class="lead">production DOM에 localStorage fixture를 주입한 fixture_only 측정이다. 60개 중 11개는 scale 전용 synthetic copies이며 실제 사용자 데이터가 아니다.</p>
    <div class="table-wrap"><table><thead><tr><th>Flow</th><th>Viewport</th><th>총수</th><th>렌더 row</th><th>검색</th><th>첫 viewport command</th><th>열기 depth</th><th>overflow</th><th>unnamed</th></tr></thead><tbody>${scaleRows}</tbody></table></div>
    <div class="metrics">
      <div class="metric"><b>0 px</b><span>all measured horizontal overflow</span></div>
      <div class="metric"><b>0</b><span>all measured unnamed focusables</span></div>
      <div class="metric"><b>8</b><span>mobile initial rows at 20/60</span></div>
      <div class="metric"><b>21</b><span>mobile first-view commands at 5+</span></div>
    </div>
  </section>

  <section class="section" id="alternatives"><h2>A/B/C technical decision</h2><p class="lead">점수는 current findings를 대상으로 한 heuristic comparison이며 사용자 검증이 아니다.</p>
    <div class="alternatives">
      <article class="alternative"><h3>A. Keep and tighten</h3><div class="score">3.35</div><p>계약 안전성은 높지만 command depth가 거의 줄지 않는다.</p><b>Reject</b></article>
      <article class="alternative selected"><h3>B. Focused workspace</h3><div class="score">4.50</div><p>library는 유지하고 Flow를 연 뒤 object commands를 한곳에 모은다.</p><b>Select</b></article>
      <article class="alternative"><h3>C. Run-first</h3><div class="score">2.75</div><p>routine에는 강하지만 checklist와 source Flow까지 run 중심으로 왜곡한다.</p><b>Defer</b></article>
    </div>
  </section>

  <section class="section" id="wireframes">
    <h2>Current vs proposed 390px</h2>
    <div class="wire-grid">
      <div class="wire"><h3>Current</h3><div class="phone">
        <div class="wire-block muted">My Flow: 지금 | Flow 목록 | 완료</div>
        <div class="wire-block">‹ 이사 준비 · ⋯ 관리</div>
        <div class="wire-block muted">실행 | 전체 계획 | 기록</div>
        <div class="wire-block primary">다음 할 일 · 완료 · 열기</div>
        <div class="wire-block">전체 계획 보기</div>
        <div class="wire-block muted">기록 안의 가져가기와 고급 작업</div>
      </div><p class="footnote">두 navigation axis와 advanced disclosure가 command 위치를 나눈다.</p></div>
      <div class="wire"><h3>Proposed B</h3><div class="phone">
        <div class="wire-block">‹ Flow 목록 <b>이사 준비</b> · 관리</div>
        <div class="wire-block primary"><b>다음 할 일</b><br>이사 방식 정하기 · 7월 2일<br>[완료] [열기]</div>
        <div class="row"><div class="wire-block">빠른 수정</div><div class="wire-block">가져가기</div></div>
        <div class="wire-block"><b>전체 계획 24개</b><br>phase/date group · 펼치기</div>
        <div class="wire-block muted">최근 기록 0개 · 더보기</div>
      </div><p class="footnote">global tabs는 drill-in에서 물러나고 item edit/export/manage는 object command로 모인다.</p></div>
    </div>
    <h2 style="margin-top:24px">Current vs proposed 1024px</h2>
    <div class="wire-grid">
      <div class="wire"><h3>Current</h3><div class="wide-wire wide-layout">
        <div class="wire-block muted">Library rail<br>search/filter<br>20 rows</div>
        <div class="wire-block">Plan canvas<br>전체 Flow rows<br>batch mode</div>
        <div class="wire-block muted">Inspector<br>next action<br>progress</div>
      </div></div>
      <div class="wire"><h3>Proposed B</h3><div class="wide-wire wide-layout">
        <div class="wire-block muted">Library rail<br>search/filter<br>selected identity</div>
        <div class="wire-block primary">Focused canvas<br>next action<br>phase/date plan<br>record summary</div>
        <div class="wire-block">Command inspector<br>quick edit<br>export scope<br>manage</div>
      </div></div>
    </div>
  </section>

  <section class="section" id="contracts">
    <h2>계약과 구현 경계</h2>
    <div class="table-wrap"><table><thead><tr><th>Layer</th><th>현재 상태</th><th>P32 원칙</th><th>Migration</th></tr></thead><tbody>
      <tr><td>source</td><td>source definition/version 분리</td><td>read-only provenance 유지</td><td>없음</td></tr>
      <tr><td>personal overlay</td><td>title/date/memo/structure overlay</td><td>quick edit가 동일 overlay 사용</td><td>없음</td></tr>
      <tr><td>run</td><td>completion/reopen/history 분리</td><td>next action과 record 위치만 조정</td><td>없음</td></tr>
      <tr><td>occurrence</td><td>series/revision/occurrence 분리</td><td>run-first C안으로 합치지 않음</td><td>없음</td></tr>
      <tr><td>export</td><td>flow/selected/item scope와 receipt</td><td>entry depth만 줄이고 count/identity 유지</td><td>없음</td></tr>
      <tr><td>lifecycle</td><td>archive/restore/permanent delete 분리</td><td>한 manage sheet에서 상태별 노출</td><td>없음</td></tr>
    </tbody></table></div>
  </section>

  <section class="section" id="program">
    <h2>P32 staged program</h2><p class="lead">순서가 필요한 5개 slice다. P32-01 correctness 후 P32-02 composition, P32-03 quick edit, P32-04 command consolidation, P32-05 final gate 순서다.</p>
    <div class="program">
      <article class="slice"><h3>P32-01 Route/Evidence Correctness</h3><p>404 mixed fixture를 유효 계약으로 교체하거나 blocked로 고정. <code>P32-MIXED-SHAPE-ROUTE-CONTRACT</code></p></article>
      <article class="slice"><h3>P32-02 Focused Workspace</h3><p>object header, next action, quick edit, export, manage로 mobile/wide hierarchy 통일. <code>P32-MY-FLOW-FOCUSED-COMMANDS</code></p></article>
      <article class="slice"><h3>P32-03 Quick Item Edit</h3><p>title/date/memo를 3단계 안에 수정하고 advanced fields는 접는다. <code>P32-ITEM-QUICK-EDIT</code></p></article>
      <article class="slice"><h3>P32-04 Anchor, Export, Lifecycle</h3><p>global anchor reuse와 scope/export/lifecycle entry를 같은 object command grammar로 연결. <code>P32-ANCHOR-REUSE</code></p></article>
      <article class="slice"><h3>P32-05 Continuity Final Gate</h3><p>24 cells, 1/5/20/60, six shapes, 390/1024/1440, full regression. <code>P32-FINAL-24-CELL-GATE</code></p></article>
    </div><p><a href="./next-program.md">상세 범위, 비범위, dependency, rollback 보기</a></p>
  </section>

  <section class="section" id="evidence">
    <h2>Current evidence gallery</h2>
    <div class="gallery">
      <figure class="shot"><img src="./screenshots/my-flow-20-mobile.png" alt="20개 My Flow 모바일 목록"><figcaption>20 Flow mobile list · 8 rows + more</figcaption></figure>
      <figure class="shot"><img src="./screenshots/probe-moving-workspace.png" alt="이사 Flow 모바일 집중 workspace"><figcaption>saved moving workspace · global/local axes</figcaption></figure>
      <figure class="shot"><img src="./screenshots/probe-moving-export.png" alt="이사 Flow 전체 export panel"><figcaption>whole export · record and advanced path</figcaption></figure>
      <figure class="shot"><img src="./screenshots/probe-vehicle-undated-calendar.png" alt="날짜 없는 차량 점검 Calendar 배치"><figcaption>undated scheduling and undo</figcaption></figure>
      <figure class="shot"><img src="./screenshots/probe-routine-record-export.png" alt="반복 운동 기록과 export"><figcaption>routine record/export</figcaption></figure>
      <figure class="shot"><img src="./screenshots/probe-personal-draft-structure.png" alt="개인 draft 구조 편집"><figcaption>structure mode add/delete/restore</figcaption></figure>
      <figure class="shot"><img src="./screenshots/mixed-travel-mobile.png" alt="닫힌 mixed travel route 404"><figcaption>required mixed route · 404</figcaption></figure>
      <figure class="shot"><img src="./screenshots/my-flow-20-wide.png" alt="20개 My Flow wide rail canvas inspector"><figcaption>wide rail/canvas/inspector</figcaption></figure>
      <figure class="shot"><img src="./screenshots/probe-completed-keyboard-calendar-focus.png" alt="Calendar item sheet focus return 검증"><figcaption>Calendar sheet Escape and focus return</figcaption></figure>
    </div>
    <div class="table-wrap"><table><thead><tr><th>Gate</th><th>결과</th></tr></thead><tbody>
      ${routeEvidence.commands.map((entry) => `<tr><td><code>${escapeHtml(entry.command)}</code></td><td>${escapeHtml(entry.status)} · ${escapeHtml(entry.detail)}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="footnote">App code, dependency, STATUS, ROADMAP 변경 없음. commit/push/deploy 없음. observed-user count 0.</p>
  </section>
</main>
<script>
  const buttons = Array.from(document.querySelectorAll('[data-filter]'));
  const rows = Array.from(document.querySelectorAll('#score-body tr'));
  buttons.forEach((button) => button.addEventListener('click', () => {
    buttons.forEach((entry) => entry.setAttribute('aria-pressed', String(entry === button)));
    const filter = button.dataset.filter;
    rows.forEach((row) => { row.hidden = filter !== 'all' && row.dataset.status !== filter; });
  }));
</script>
</body></html>`;

await Promise.all([
  fs.writeFile(path.join(OUTPUT_DIR, 'README.md'), readme, 'utf8'),
  fs.writeFile(path.join(OUTPUT_DIR, 'audit.md'), auditMd, 'utf8'),
  fs.writeFile(path.join(OUTPUT_DIR, 'review.html'), html, 'utf8'),
  fs.writeFile(
    path.join(OUTPUT_DIR, 'persona-journey-scorecard.json'),
    `${JSON.stringify({
      schemaVersion: 1,
      reviewerRole: 'codex_independent',
      observedUserCount: OBSERVED_USER_COUNT,
      requiredCellCount: 24,
      actualCellCount: cells.length,
      statusCounts,
      cells,
    }, null, 2)}\n`,
    'utf8',
  ),
  fs.writeFile(
    path.join(OUTPUT_DIR, 'my-flow-complexity-metrics.json'),
    `${JSON.stringify(complexityMetrics, null, 2)}\n`,
    'utf8',
  ),
  fs.writeFile(
    path.join(OUTPUT_DIR, 'journey-discontinuity-matrix.json'),
    `${JSON.stringify({
      schemaVersion: 1,
      observedUserCount: OBSERVED_USER_COUNT,
      transitions: discontinuities,
    }, null, 2)}\n`,
    'utf8',
  ),
  fs.writeFile(path.join(OUTPUT_DIR, 'reference-pattern-matrix.md'), referenceMatrix, 'utf8'),
  fs.writeFile(
    path.join(OUTPUT_DIR, 'decision-matrix.json'),
    `${JSON.stringify(decisionMatrix, null, 2)}\n`,
    'utf8',
  ),
  fs.writeFile(path.join(OUTPUT_DIR, 'next-program.md'), nextProgram, 'utf8'),
  fs.writeFile(
    path.join(OUTPUT_DIR, 'route-evidence.json'),
    `${JSON.stringify(routeEvidence, null, 2)}\n`,
    'utf8',
  ),
]);

process.stdout.write(JSON.stringify({
  outputDir: OUTPUT_DIR,
  files: [
    'README.md',
    'audit.md',
    'review.html',
    'persona-journey-scorecard.json',
    'my-flow-complexity-metrics.json',
    'journey-discontinuity-matrix.json',
    'reference-pattern-matrix.md',
    'decision-matrix.json',
    'next-program.md',
    'route-evidence.json',
  ],
  scorecard: statusCounts,
  verdict: decisionMatrix.verdict,
}, null, 2));
