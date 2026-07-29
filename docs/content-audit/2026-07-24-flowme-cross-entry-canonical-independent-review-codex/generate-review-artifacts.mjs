import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outputDir = path.dirname(fileURLToPath(import.meta.url));
const rawScorecard = JSON.parse(
  fs.readFileSync(path.join(outputDir, "persona-journey-scorecard.raw.json"), "utf8"),
);

const writeJson = (name, value) => {
  fs.writeFileSync(path.join(outputDir, name), `${JSON.stringify(value, null, 2)}\n`);
};

const writeText = (name, value) => {
  fs.writeFileSync(path.join(outputDir, name), value.trimStart());
};

const route = (...values) => values;
const evidenceKinds = [
  "current_production_interaction",
  "current_source",
  "current_package_screenshot",
  "heuristic_simulation",
];

function makeCell({
  personaId,
  sessionId,
  userGoal,
  routes,
  viewport,
  startingState,
  steps,
  expected,
  actual,
  nextAction,
  identity,
  count,
  artifact,
  saveObject,
  reload,
  myFlow,
  calendar,
  exportParity,
  recovery,
  status,
  severity,
  evidence,
  screenshot,
  question,
}) {
  return {
    personaId,
    sessionId,
    userGoal,
    route: routes,
    viewport,
    startingState,
    steps,
    interactionDepth: Math.max(0, steps.length - 1),
    expectedMentalModel: expected,
    actualFeedback: actual,
    nextAction,
    flowIdentityObserved: identity,
    itemCountObserved: count,
    artifactObserved: artifact,
    saveObjectObserved: saveObject,
    reloadPersistence: reload,
    parity: {
      myFlow,
      calendar,
      export: exportParity,
    },
    recoveryAndDataPreservation: recovery,
    status,
    severity,
    evidenceKinds: evidence ?? evidenceKinds,
    evidenceRef: screenshot,
    observedUserQuestion: question,
    observedUserCount: 0,
  };
}

const cells = [
  makeCell({
    personaId: "P1",
    sessionId: "S1",
    userGoal: "Home의 이사 예시에서 전체 결과를 이해하고 조정해 저장한다.",
    routes: route("/", "/f/moving-d30-basic"),
    viewport: "390x844",
    startingState: "clean localStorage",
    steps: ["Home 이사 예시 열기", "24개 Calendar preview 확인", "Checklist 선택", "이사일 입력", "조정 열기", "저장", "receipt 확인"],
    expected: "Calendar와 Checklist 중 선택한 결과가 즉시 바뀌고 한 Flow로 저장된다.",
    actual: "24개 전체 preview와 inline receipt는 명확하지만 Checklist를 눌러도 Calendar projection과 CTA가 그대로다.",
    nextAction: "내 Flow에서 시작 또는 캘린더에서 보기",
    identity: "public slug moving-d30-basic",
    count: "24",
    artifact: "Calendar 고정; visible Checklist control은 비작동",
    saveObject: "flow:saved:moving-d30-basic",
    reload: "이사일 anchor는 reload 후 유지됨",
    myFlow: "24개 public object로 연결",
    calendar: "24개 날짜 projection으로 연결",
    exportParity: "public object 범위 24개",
    recovery: "같은 slug 재저장은 한 key를 갱신하지만 artifact 선택 실패 설명은 없다.",
    status: "partial",
    severity: "high",
    screenshot: "screenshots/p1-s1.png",
    question: "사용자는 Calendar와 Checklist를 실제 destination 선택으로 이해하는가?",
  }),
  makeCell({
    personaId: "P1",
    sessionId: "S2",
    userGoal: "저장한 24개 이사 Flow를 My Flow와 Calendar에서 실행한다.",
    routes: route("/my?savedFlow=moving-d30-basic", "/calendar"),
    viewport: "1024x768",
    startingState: "P1-S1 public save 유지",
    steps: ["My Flow 진입", "저장 Flow 열기", "첫 항목 완료", "다시 열기", "Calendar 이동", "export 범위 확인"],
    expected: "저장한 제목·날짜·항목 수와 완료 상태가 downstream에서 일치한다.",
    actual: "같은 public slug 내부에서는 24개 저장 객체가 My Flow와 Calendar로 이어지고 완료·재개가 가능하다.",
    nextAction: "전체 계획 실행 또는 export",
    identity: "moving-d30-basic",
    count: "24",
    artifact: "My Flow execution + Calendar",
    saveObject: "flow:saved:moving-d30-basic",
    reload: "저장 및 완료 상태 유지",
    myFlow: "supported",
    calendar: "supported",
    exportParity: "supported for the saved slug",
    recovery: "완료 취소가 가능하고 record는 보존된다.",
    status: "supported",
    severity: "low",
    screenshot: "screenshots/p1-s2.png",
    question: "저장 직후 사용자는 My Flow와 Calendar 중 어디로 가야 할지 자연스럽게 고르는가?",
  }),
  makeCell({
    personaId: "P1",
    sessionId: "S3",
    userGoal: "Home 저장 후 Find와 URL lookup에서 같은 Flow 상태를 재발견한다.",
    routes: route("/flows", "/flow-maps/moving-d30", "/f/curated-ajd-moving-d30"),
    viewport: "390x844",
    startingState: "moving-d30-basic 24개 저장됨",
    steps: ["Flow 찾기에서 이사 검색", "5개 map 열기", "AJD URL lookup", "curated 5개 열기", "저장 표시 비교"],
    expected: "모든 entry가 이미 저장한 동일 Flow를 가리키고 개인 상태를 공유한다.",
    actual: "Find는 5개 source-backed map, URL lookup은 다른 curated 5개 slug를 열며 24개 저장과 연결되지 않는다.",
    nextAction: "사용자는 중복 저장하거나 어느 것이 최신인지 추측해야 한다.",
    identity: "moving-d30-basic / source-backed-moving-d30 / curated-ajd-moving-d30",
    count: "24 / 5 / 5",
    artifact: "Calendar 계열이나 shell과 content snapshot이 다름",
    saveObject: "세 slug별 별도 key",
    reload: "각 alias 상태만 개별 유지",
    myFlow: "alias별 별도 object",
    calendar: "alias별 별도 projection",
    exportParity: "alias별 24 또는 5",
    recovery: "canonical representative나 중복 경고가 없다.",
    status: "partial",
    severity: "high",
    screenshot: "screenshots/p1-s3.png",
    question: "사용자는 24개 전체판과 5개 핵심판을 서로 다른 상품으로 인식하는가?",
  }),
  makeCell({
    personaId: "P2",
    sessionId: "S1",
    userGoal: "Flow 찾기에서 이사 Flow를 비교하고 저장한다.",
    routes: route("/flows", "/flow-maps/moving-d30"),
    viewport: "390x844",
    startingState: "clean localStorage",
    steps: ["catalog scan", "원룸 이사 카드 열기", "5개 map 확인", "이사일 입력", "저장"],
    expected: "catalog detail과 저장 결과가 같은 5개 Flow를 유지한다.",
    actual: "Find 내부에서는 5개 map과 저장 receipt가 일관되지만 public /f와 다른 legacy grammar다.",
    nextAction: "My Flow에서 5개 실행",
    identity: "map moving-d30 + child source-backed-moving-d30",
    count: "5",
    artifact: "Calendar/hybrid",
    saveObject: "flow:saved:source-backed-moving-d30 + map bridge records",
    reload: "map persistence key로 유지",
    myFlow: "5개 object로 연결",
    calendar: "5개 projection",
    exportParity: "5개",
    recovery: "Find 내부 저장 복구는 지원",
    status: "supported",
    severity: "medium",
    screenshot: "screenshots/p2-s1.png",
    question: "Find 사용자는 이 5개판이 Home의 24개판과 다른 이유를 알아야 하는가?",
  }),
  makeCell({
    personaId: "P2",
    sessionId: "S2",
    userGoal: "Find에서 저장한 5개 Flow를 재방문해 실행한다.",
    routes: route("/my?savedMap=moving-d30", "/calendar"),
    viewport: "1024x768",
    startingState: "P2-S1 map save 유지",
    steps: ["receipt 확인", "전체 Flow 열기", "항목 완료", "Calendar 확인", "export 열기"],
    expected: "Find에서 본 5개가 downstream에서도 같은 객체다.",
    actual: "source-backed-moving-d30 객체 자체는 완료·수정·export 가능한 focused workspace로 열린다.",
    nextAction: "다음 항목 실행",
    identity: "source-backed-moving-d30",
    count: "5",
    artifact: "My Flow + Calendar",
    saveObject: "flow:saved:source-backed-moving-d30",
    reload: "supported",
    myFlow: "supported",
    calendar: "supported",
    exportParity: "supported for 5-item object",
    recovery: "완료 취소와 archive가 가능",
    status: "supported",
    severity: "low",
    screenshot: "screenshots/p2-s2.png",
    question: "5개 핵심판만으로 실제 이사 준비가 충분하다고 느끼는가?",
  }),
  makeCell({
    personaId: "P2",
    sessionId: "S3",
    userGoal: "Find 저장 후 Home 이사 Flow를 추가 저장해 중복을 확인한다.",
    routes: route("/", "/f/moving-d30-basic", "/my?view=flows"),
    viewport: "1024x768",
    startingState: "source-backed-moving-d30 5개 저장됨",
    steps: ["Home 이사 열기", "24개 저장", "My Flow 목록 이동", "두 행 비교"],
    expected: "기존 저장 감지 또는 variant 설명과 대표 선택이 나온다.",
    actual: "24개와 5개가 별도 행으로 생기며 동일 source 경고나 차이 설명이 없다.",
    nextAction: "사용자가 임의로 하나를 archive/delete해야 한다.",
    identity: "moving-d30-basic + source-backed-moving-d30",
    count: "24 + 5",
    artifact: "두 Calendar projection",
    saveObject: "별도 slug keys",
    reload: "두 객체 모두 유지",
    myFlow: "2 objects",
    calendar: "separate projections",
    exportParity: "각 객체별 24/5",
    recovery: "자동 merge 없음; 개별 archive만 가능",
    status: "partial",
    severity: "high",
    screenshot: "screenshots/p2-s3.png",
    question: "중복 후보가 보이면 사용자는 합치기, 둘 다 유지, 하나 숨기기 중 무엇을 원할까?",
  }),
  makeCell({
    personaId: "P3",
    sessionId: "S1",
    userGoal: "AJD 원문 URL로 기존 이사 Flow를 찾는다.",
    routes: route("/flows", "/f/curated-ajd-moving-d30"),
    viewport: "390x844",
    startingState: "clean localStorage + AJD canonical URL",
    steps: ["URL 붙여넣기", "lookup 실행", "hit 결과 확인", "detail 열기"],
    expected: "제품 전체에서 쓰는 canonical 이사 Flow를 연다.",
    actual: "URL lookup은 curated 5개 child를 열며 Home 24개나 Find 5개 map과 같은 object라는 표시가 없다.",
    nextAction: "curated 5개 저장",
    identity: "curated-ajd-moving-d30",
    count: "5",
    artifact: "Calendar",
    saveObject: "저장 전",
    reload: "lookup 결과는 재입력 가능",
    myFlow: "not yet saved",
    calendar: "not yet saved",
    exportParity: "5개 preview",
    recovery: "다른 alias 탐색 수단 없음",
    status: "partial",
    severity: "high",
    screenshot: "screenshots/p3-s1.png",
    question: "URL-first 사용자는 '핵심 5개'와 '전체 24개' 중 무엇을 기대하는가?",
  }),
  makeCell({
    personaId: "P3",
    sessionId: "S2",
    userGoal: "URL lookup 결과를 저장해 My Flow와 Calendar에서 확인한다.",
    routes: route("/f/curated-ajd-moving-d30", "/my?savedMap=curated-ajd-moving-d30", "/calendar"),
    viewport: "1024x768",
    startingState: "P3-S1 lookup hit",
    steps: ["이사일 입력", "저장", "receipt 확인", "My Flow 열기", "Calendar 확인"],
    expected: "lookup에서 본 5개와 downstream count가 같다.",
    actual: "curated 5개 객체 자체의 save-to-execution은 동작한다.",
    nextAction: "첫 항목 실행",
    identity: "curated-ajd-moving-d30",
    count: "5",
    artifact: "Calendar",
    saveObject: "flow:saved:curated-ajd-moving-d30 + map keys",
    reload: "supported",
    myFlow: "5개",
    calendar: "5개",
    exportParity: "5개",
    recovery: "alias-level record 보존",
    status: "supported",
    severity: "low",
    screenshot: "screenshots/p3-s2.png",
    question: "lookup receipt에서 source와 개인 Flow의 관계가 충분히 명확한가?",
  }),
  makeCell({
    personaId: "P3",
    sessionId: "S3",
    userGoal: "네 개 이사 alias가 저장·개인 상태를 공유하는지 확인한다.",
    routes: route("/f/moving-d30-basic", "/flow-maps/moving-d30", "/f/curated-ajd-moving-d30", "/f/source-backed-moving-d30"),
    viewport: "390x844",
    startingState: "curated 5개 저장됨",
    steps: ["각 route 직접 열기", "title/count 비교", "저장 신호 비교", "storage key 비교"],
    expected: "alias는 하나의 canonicalFlowId와 personal overlay를 공유한다.",
    actual: "네 route가 24/5/5/5로 갈리고 세 saved slug identity를 사용한다.",
    nextAction: "canonical editorial choice와 alias registry 필요",
    identity: "3 save identities across 4 routes",
    count: "24 / 5 / 5 / 5",
    artifact: "Calendar 계열",
    saveObject: "slug별 분리",
    reload: "alias별 유지",
    myFlow: "최대 3 objects",
    calendar: "최대 3 projections",
    exportParity: "각 alias 단위",
    recovery: "canonical alias graph 없음",
    status: "partial",
    severity: "high",
    screenshot: "screenshots/p3-s3.png",
    question: "같은 원문의 세 편집본을 사용자에게 variant로 노출할 가치가 있는가?",
  }),
  makeCell({
    personaId: "P4",
    sessionId: "S1",
    userGoal: "24개와 5개 이사 Flow를 모두 가진 상태에서 중복을 인지한다.",
    routes: route("/my?view=flows"),
    viewport: "1024x768",
    startingState: "public 24개 + map 5개 저장",
    steps: ["My Flow 목록 열기", "두 이사 행 scan", "source/항목 수 비교"],
    expected: "같은 source 후보 표시와 차이 비교가 제공된다.",
    actual: "두 행은 보이지만 동일 source, 대표본, 중복 이유가 표시되지 않는다.",
    nextAction: "각 Flow를 따로 열어 추론",
    identity: "two unrelated-looking rows",
    count: "24 + 5",
    artifact: "두 execution objects",
    saveObject: "two slug keys",
    reload: "둘 다 유지",
    myFlow: "2 objects",
    calendar: "separate",
    exportParity: "separate",
    recovery: "중복 reconcile entry 없음",
    status: "partial",
    severity: "high",
    screenshot: "screenshots/p4-s1.png",
    question: "사용자는 두 행을 중복으로 볼까, 목적이 다른 계획으로 볼까?",
  }),
  makeCell({
    personaId: "P4",
    sessionId: "S2",
    userGoal: "중복 이사 Flow의 상태와 Calendar projection 분기를 확인한다.",
    routes: route("/my", "/calendar"),
    viewport: "1024x768",
    startingState: "P4-S1 두 object",
    steps: ["한쪽 완료", "한쪽 날짜 변경", "다른 object 열기", "Calendar 비교", "export 비교"],
    expected: "같은 canonical item이면 충돌을 설명하거나 한쪽 상태를 대표로 쓴다.",
    actual: "두 object는 독립 personal/run/projection을 만들며 서로의 변경을 모른다.",
    nextAction: "사용자가 수동 정리",
    identity: "independent slugs",
    count: "24 + 5",
    artifact: "separate Calendar/export",
    saveObject: "independent",
    reload: "각각 유지",
    myFlow: "상태 분리",
    calendar: "중복 가능",
    exportParity: "중복 가능",
    recovery: "개별 undo는 가능하나 cross-object 보존 정책 없음",
    status: "partial",
    severity: "high",
    screenshot: "screenshots/p4-s2.png",
    question: "중복 정리 시 어느 기록을 우선 보존해야 한다고 느끼는가?",
  }),
  makeCell({
    personaId: "P4",
    sessionId: "S3",
    userGoal: "중복 객체를 reconcile하며 개인 기록을 보존한다.",
    routes: route("/my?view=flows"),
    viewport: "390x844",
    startingState: "항목 수와 상태가 다른 duplicate pair",
    steps: ["archive 찾기", "restore 찾기", "merge/대표 선택 찾기"],
    expected: "대표본 선택, 차이 확인, 비파괴 보관이 가능하다.",
    actual: "개별 archive/delete는 있지만 source-level alias 비교·merge·대표 선택이 없다.",
    nextAction: "P33 reconciliation gate 필요",
    identity: "unreconciled aliases",
    count: "24 + 5",
    artifact: "n/a",
    saveObject: "legacy objects retained",
    reload: "retained",
    myFlow: "reconcile missing",
    calendar: "reconcile missing",
    exportParity: "reconcile missing",
    recovery: "자동 병합하면 24↔5 item state를 안전하게 대응할 수 없어 data-loss 위험이 크다.",
    status: "missing",
    severity: "high",
    screenshot: "screenshots/p4-s3.png",
    question: "대표본 선택 전에 어떤 비교 정보가 있어야 안심하고 정리할 수 있는가?",
  }),
  makeCell({
    personaId: "P5",
    sessionId: "S1",
    userGoal: "Home의 필요할 때 차량 체크리스트 약속과 target을 비교한다.",
    routes: route("/", "/f/vehicle-inspection-prep"),
    viewport: "390x844",
    startingState: "clean localStorage",
    steps: ["Home vehicle card 읽기", "target 열기", "primary artifact 확인", "Checklist 누르기"],
    expected: "필요할 때 실행하는 날짜 없는 Checklist가 먼저 보인다.",
    actual: "target은 자동차검사 D-14 Calendar 10개가 기본이고 Checklist control도 projection을 바꾸지 않는다.",
    nextAction: "날짜 없이 시작 또는 Calendar 저장",
    identity: "vehicle-inspection-prep",
    count: "10",
    artifact: "Home promise Checklist / target Calendar",
    saveObject: "저장 전",
    reload: "n/a",
    myFlow: "not yet saved",
    calendar: "not yet saved",
    exportParity: "10개",
    recovery: "promise 수정이나 작동하는 artifact 선택 필요",
    status: "partial",
    severity: "high",
    screenshot: "screenshots/p5-s1.png",
    question: "차량 점검 사용자는 검사일 역산과 필요할 때 체크 중 어느 job으로 진입하는가?",
  }),
  makeCell({
    personaId: "P5",
    sessionId: "S2",
    userGoal: "차량 Flow를 날짜 없이 저장하고 실행·배치한다.",
    routes: route("/f/vehicle-inspection-prep", "/my", "/calendar"),
    viewport: "1024x768",
    startingState: "P5-S1 public detail",
    steps: ["날짜 없이 시작", "저장", "My Flow 확인", "Calendar undated queue 확인", "날짜 배치"],
    expected: "날짜 없는 항목이 My Flow 실행과 Calendar 배치 queue로 이어진다.",
    actual: "undated 저장과 downstream 배치 모델은 지원된다. entry promise와 artifact state만 어긋난다.",
    nextAction: "날짜 배치 또는 항목 완료",
    identity: "vehicle-inspection-prep",
    count: "10",
    artifact: "undated execution",
    saveObject: "flow:saved:vehicle-inspection-prep",
    reload: "supported",
    myFlow: "supported",
    calendar: "undated queue supported",
    exportParity: "Checklist/ICS eligibility differs by date",
    recovery: "날짜 제거 시 queue 복귀 가능",
    status: "supported",
    severity: "low",
    screenshot: "screenshots/p5-s2.png",
    question: "Calendar의 날짜 없는 queue를 사용자가 자연스럽게 발견하는가?",
  }),
  makeCell({
    personaId: "P5",
    sessionId: "S3",
    userGoal: "Flow 찾기에서 Home 차량 Flow를 재발견한다.",
    routes: route("/flows"),
    viewport: "390x844",
    startingState: "vehicle-inspection-prep 저장됨",
    steps: ["차량 검색", "차량 점검 검색", "자동차검사 검색", "9개 inventory 비교"],
    expected: "Home target이 Find에서 같은 title·promise·saved state로 검색된다.",
    actual: "hydrated catalog 9개에 Home vehicle public target이 없고 검색어도 canonical 재발견으로 이어지지 않는다.",
    nextAction: "Home history 또는 직접 URL에 의존",
    identity: "Find inventory missing vehicle-inspection-prep",
    count: "0 matching canonical cards",
    artifact: "n/a",
    saveObject: "기존 key는 있지만 catalog signal 없음",
    reload: "catalog result 동일",
    myFlow: "저장 객체는 존재",
    calendar: "projection 존재",
    exportParity: "저장 객체에서만 접근",
    recovery: "Find inventory alignment 필요",
    status: "partial",
    severity: "high",
    screenshot: "screenshots/p5-s3.png",
    question: "재방문자는 Find보다 My Flow 검색으로 저장 콘텐츠를 찾는가?",
  }),
  makeCell({
    personaId: "P6",
    sessionId: "S1",
    userGoal: "반복 운동 Flow의 entry와 artifact·series 설정 연속성을 확인한다.",
    routes: route("/", "/flows", "/f/curated-allblanc-morning-workout"),
    viewport: "390x844",
    startingState: "clean localStorage",
    steps: ["Home workout 열기", "Find 동일 card 확인", "Flow execution 확인", "Calendar 선택", "요일·시간·종료 조정"],
    expected: "두 entry가 같은 public object와 작동하는 artifact controls를 쓴다.",
    actual: "Home/Find가 같은 slug를 쓰며 Flow execution↔Calendar 선택도 실제 projection을 바꾼다.",
    nextAction: "routine 저장",
    identity: "curated-allblanc-morning-workout",
    count: "1 series item",
    artifact: "Flow execution / Calendar / Memo",
    saveObject: "저장 전",
    reload: "설정은 저장 후 유지",
    myFlow: "not yet saved",
    calendar: "next occurrence preview",
    exportParity: "eligible artifact별 1 item/occurrences",
    recovery: "조정 취소 가능",
    status: "supported",
    severity: "low",
    screenshot: "screenshots/p6-s1.png",
    question: "Flow 실행과 Calendar의 차이를 control만 보고 이해하는가?",
  }),
  makeCell({
    personaId: "P6",
    sessionId: "S2",
    userGoal: "날짜 없는 운동 series를 My Flow와 Calendar에서 확인한다.",
    routes: route("/my", "/calendar"),
    viewport: "390x844",
    startingState: "undated workout 저장",
    steps: ["My Flow 열기", "focused Flow 열기", "반복 summary 읽기", "Calendar 확인", "완료·재개"],
    expected: "사람이 읽는 요일 summary와 series/occurrence 관계가 일관된다.",
    actual: "실행은 이어지지만 My Flow focused workspace에 raw RRULE FREQ=WEEKLY;BYDAY=MO,WE,FR가 노출된다.",
    nextAction: "display adapter로 사람이 읽는 문구 제공",
    identity: "curated-allblanc-morning-workout",
    count: "1 series; undated Calendar event 0",
    artifact: "routine execution",
    saveObject: "flow:saved:curated-allblanc-morning-workout",
    reload: "supported",
    myFlow: "partial due raw RRULE",
    calendar: "raw RRULE은 노출되지 않음",
    exportParity: "series/occurrence 범위 별도 확인 필요",
    recovery: "완료 취소는 지원",
    status: "partial",
    severity: "medium",
    screenshot: "screenshots/p6-s2.png",
    question: "사용자는 날짜 없는 반복을 유효한 설정으로 이해하는가?",
  }),
  makeCell({
    personaId: "P6",
    sessionId: "S3",
    userGoal: "운동 Flow 재진입 시 series 설정·실행 상태·resource 연속성을 확인한다.",
    routes: route("/f/curated-allblanc-morning-workout", "/my"),
    viewport: "1024x768",
    startingState: "저장 및 일부 실행 상태",
    steps: ["public route 재진입", "저장 표시 확인", "resource 열기", "My Flow occurrence 비교", "export 확인"],
    expected: "public detail은 saved signal을 주고 execution state는 My Flow에서 이어진다.",
    actual: "slug 저장 신호와 source resource는 유지되나 public shell에서 occurrence 상태를 직접 이어 보여주지는 않는다.",
    nextAction: "My Flow에서 계속",
    identity: "same public slug",
    count: "1 series",
    artifact: "routine",
    saveObject: "same key",
    reload: "supported",
    myFlow: "execution state source of truth",
    calendar: "dated occurrence only",
    exportParity: "series/occurrence scope should remain explicit",
    recovery: "source와 run 분리가 보존됨",
    status: "partial",
    severity: "medium",
    screenshot: "screenshots/p6-s3.png",
    question: "재진입 public 화면에서 진행률까지 보여주는 것이 유용한가, 혼란스러운가?",
  }),
  makeCell({
    personaId: "P7",
    sessionId: "S1",
    userGoal: "결혼 두 콘텐츠와 작동하는 artifact choice를 positive control로 확인한다.",
    routes: route("/flows", "/f/curated-wedding-naver-timeline", "/f/curated-wedding-gongysd-atoz"),
    viewport: "390x844",
    startingState: "clean localStorage",
    steps: ["결혼 카드 2개 비교", "timeline 열기", "Calendar→Checklist 선택", "sheet형 콘텐츠 열기"],
    expected: "서로 다른 source/job은 별도 Flow이고 artifact control은 실제 결과를 바꾼다.",
    actual: "두 독립 card가 유지되고 wedding artifact 선택은 projection과 CTA를 바꾼다.",
    nextAction: "선택 결과로 저장",
    identity: "two intentional Flow slugs",
    count: "6 and 4",
    artifact: "Calendar/Checklist/Memo and Sheet",
    saveObject: "저장 전",
    reload: "n/a",
    myFlow: "not yet saved",
    calendar: "preview only",
    exportParity: "content-eligible results",
    recovery: "artifact 재선택 가능",
    status: "supported",
    severity: "low",
    screenshot: "screenshots/p7-s1.png",
    question: "추천 artifact 이유가 선택에 충분한가?",
  }),
  makeCell({
    personaId: "P7",
    sessionId: "S2",
    userGoal: "서로 다른 결혼 Flow의 receipt와 downstream 연속성을 확인한다.",
    routes: route("/my", "/calendar"),
    viewport: "1024x768",
    startingState: "wedding 2개 저장",
    steps: ["각 receipt 확인", "My Flow 목록 비교", "Calendar projection 비교", "export 확인"],
    expected: "의도적으로 다른 source/job은 별도 object로 보존된다.",
    actual: "두 Flow가 다른 count와 artifact를 가진 별도 object로 이어진다.",
    nextAction: "각 Flow 실행",
    identity: "curated-wedding-naver-timeline / curated-wedding-gongysd-atoz",
    count: "6 + 4",
    artifact: "content-specific",
    saveObject: "two intentional keys",
    reload: "supported",
    myFlow: "supported",
    calendar: "eligible dated items",
    exportParity: "supported by each object",
    recovery: "개별 archive/restore",
    status: "supported",
    severity: "low",
    screenshot: "screenshots/p7-s2.png",
    question: "두 결혼 Flow를 함께 쓸 때 관계 표시가 필요한가?",
  }),
  makeCell({
    personaId: "P7",
    sessionId: "S3",
    userGoal: "결혼에서 작동하는 interaction grammar를 moving/vehicle과 비교한다.",
    routes: route("/f/curated-wedding-naver-timeline", "/f/moving-d30-basic", "/f/vehicle-inspection-prep"),
    viewport: "390x844",
    startingState: "clean comparison context",
    steps: ["각 artifact control 선택", "selected state 비교", "CTA 비교", "source handler 대조"],
    expected: "같은 component는 category와 무관하게 동일하게 동작한다.",
    actual: "차이는 content shape가 아니라 결혼/운동/러닝에만 handler를 전달하는 category gate에서 발생한다.",
    nextAction: "eligibility 기반 공통 handler로 수정",
    identity: "component-level inconsistency",
    count: "n/a",
    artifact: "working vs false affordance",
    saveObject: "n/a",
    reload: "n/a",
    myFlow: "downstream unaffected until save",
    calendar: "selected projection affected",
    exportParity: "selected artifact mismatch risk",
    recovery: "control을 숨기거나 작동시켜야 함",
    status: "partial",
    severity: "high",
    screenshot: "screenshots/p7-s3.png",
    question: "artifact 선택을 언제 노출해야 과도한 선택이 되지 않는가?",
  }),
  makeCell({
    personaId: "P8",
    sessionId: "S1",
    userGoal: "390px keyboard-only로 Home에서 public save-before까지 이동한다.",
    routes: route("/", "/flows", "/f/moving-d30-basic"),
    viewport: "390x844",
    startingState: "clean keyboard navigation",
    steps: ["header focus", "Home card focus", "public controls focus", "adjustment focus", "receipt link focus"],
    expected: "같은 과업은 entry와 무관하게 동일한 focus grammar와 accessible name을 쓴다.",
    actual: "주요 control은 접근 가능하지만 public과 legacy map의 focus anatomy가 다르고 일부 summary/link accessible name이 빈다.",
    nextAction: "shared semantic component와 focus-return marker",
    identity: "route-dependent interaction grammar",
    count: "n/a",
    artifact: "keyboard operable with gaps",
    saveObject: "n/a",
    reload: "n/a",
    myFlow: "not tested in this cell",
    calendar: "not tested in this cell",
    exportParity: "not tested",
    recovery: "back은 가능하나 동일 focus return 계약 없음",
    status: "partial",
    severity: "medium",
    screenshot: "screenshots/p8-s1.png",
    question: "키보드 사용자가 legacy detail의 중첩 summary를 자연스럽게 이해하는가?",
  }),
  makeCell({
    personaId: "P8",
    sessionId: "S2",
    userGoal: "1024/1440에서 Home·Find·public·map·My Flow·Calendar anatomy를 비교한다.",
    routes: route("/", "/flows", "/f/moving-d30-basic", "/flow-maps/moving-d30", "/my", "/calendar"),
    viewport: "1024x768 + 1440x900",
    startingState: "clean responsive comparison",
    steps: ["각 route capture", "first viewport 비교", "fixed layer 확인", "overflow 확인", "accessible name scan"],
    expected: "역할은 달라도 동일 Flow anatomy와 command placement가 유지된다.",
    actual: "가로 overflow와 page/console error는 없지만 public /f와 legacy /flow-maps가 같은 Flow처럼 보이지 않는다.",
    nextAction: "role-specific shell 아래 canonical Flow anatomy 공유",
    identity: "visual identity split",
    count: "24 vs 5",
    artifact: "public artifact-first vs map legacy",
    saveObject: "route-dependent",
    reload: "stable",
    myFlow: "P32 focused shell은 positive control",
    calendar: "stable downstream",
    exportParity: "route-dependent upstream",
    recovery: "fixed overlap은 캡처에서 확인되지 않음",
    status: "partial",
    severity: "medium",
    screenshot: "screenshots/p8-s2.png",
    question: "사용자는 화면 문법 차이를 콘텐츠 유형 차이로 오인하는가?",
  }),
  makeCell({
    personaId: "P8",
    sessionId: "S3",
    userGoal: "reload·반복 저장·back과 alias 중복 복구를 확인한다.",
    routes: route("/f/moving-d30-basic", "/flow-maps/moving-d30", "/my"),
    viewport: "390x844",
    startingState: "disposable persisted profile",
    steps: ["이사일 입력", "reload", "같은 slug 반복 저장", "다른 alias 저장", "My Flow 비교"],
    expected: "같은 Flow 반복 저장은 한 객체를 갱신하고 alias도 같은 객체를 가리킨다.",
    actual: "public anchor와 같은 slug 반복 저장은 유지·갱신되지만 다른 alias를 저장하면 별도 object가 생긴다.",
    nextAction: "canonical save identity + duplicate reconciliation",
    identity: "same-slug stable, cross-alias split",
    count: "1 same-slug key; additional alias key",
    artifact: "n/a",
    saveObject: "slug-scoped",
    reload: "anchor persists after reload",
    myFlow: "alias duplicates persist",
    calendar: "alias projections persist",
    exportParity: "alias scope persists",
    recovery: "same-slug idempotence positive; cross-alias recovery missing",
    status: "partial",
    severity: "high",
    screenshot: "screenshots/p8-s3.png",
    question: "중복 저장 경고는 저장 전과 저장 후 중 어디에서 가장 유용한가?",
  }),
];

const scoreSummary = cells.reduce(
  (summary, cell) => {
    summary[cell.status] = (summary[cell.status] ?? 0) + 1;
    return summary;
  },
  {},
);

const scorecard = {
  schemaVersion: "flowme.cross-entry-persona-scorecard.v1",
  reviewerRole: "codex_independent",
  production: "https://flowme2605.vercel.app",
  baseline: {
    originMainSha: "e491d99ca61ecae4fd0dd009f785e737b6a59516",
    handoffBranchSha: "ba234b55c95f6705653efe47dcdd1a213afb9212",
    productionAppRelease: "30281a7a8ea9bea1194b4104b5a49b6211c07e3b",
  },
  observedUserCount: 0,
  cellCount: cells.length,
  expectedCellCount: 24,
  statusSummary: scoreSummary,
  runErrors: rawScorecard.runErrors,
  note: "Browser automation and heuristic simulation are not observed-user validation. Raw capture is retained separately; this normalized scorecard corrects SPA-settle and reload-note errors found during supplemental probes.",
  cells,
};

writeJson("persona-journey-scorecard.json", scorecard);

const canonicalSource =
  "https://www.ajd.co.kr/contents/basic-tip/detail/이사_준비_체크리스트_완벽정리!_엑셀_Xls_PDF_노션_notion_첨부-23363";

const invariantMatrix = {
  schemaVersion: "flowme.cross-entry-invariant-matrix.v1",
  reviewerRole: "codex_independent",
  observedUserCount: 0,
  subject: {
    source: "AJD 이사 준비 체크리스트",
    sourceUrl: canonicalSource,
    expectedInvariant:
      "같은 source와 같은 사용자 job은 entry role과 무관하게 하나의 canonicalFlowId, content snapshot, save identity로 이어진다.",
    currentCanonicalFlowId: null,
    currentResult: "failed",
  },
  surfaces: [
    {
      surface: "Home",
      sourceUrl: canonicalSource,
      canonicalFlowId: null,
      route: "/f/moving-d30-basic",
      displayTitle: "이사 D-30 준비",
      itemCount: 24,
      primaryArtifact: "calendar",
      secondaryArtifacts: ["checklist"],
      adjustCapabilities: ["anchor date", "personal title", "include/exclude", "order"],
      saveObjectId: "moving-d30-basic",
      storageKeys: ["flow:saved:moving-d30-basic", "flow:moving-d30-basic:anchorDate"],
      receiptBehavior: "same-route inline public saved receipt",
      postSaveDestination: "/my?savedFlow=moving-d30-basic",
      myFlowObjectCount: 1,
      calendarProjectionCount: 24,
      exportProjectionCount: 24,
      classification: "unresolved_content_variant_or_alias_bug",
    },
    {
      surface: "Find catalog",
      sourceUrl: canonicalSource,
      canonicalFlowId: null,
      route: "/flow-maps/moving-d30",
      displayTitle: "원룸 이사 D-30",
      itemCount: 5,
      primaryArtifact: "calendar",
      secondaryArtifacts: [],
      adjustCapabilities: ["anchor date", "save mode"],
      saveObjectId: "source-backed-moving-d30",
      storageKeys: [
        "flow:saved:source-backed-moving-d30",
        "flow:map:saved:moving-d30",
        "flow:map:persistence:moving-d30",
      ],
      receiptBehavior: "immediate navigation to My Flow post-save panel",
      postSaveDestination: "/my?savedMap=moving-d30",
      myFlowObjectCount: 1,
      calendarProjectionCount: 5,
      exportProjectionCount: 5,
      classification: "legacy_rollout_gap",
    },
    {
      surface: "URL lookup",
      sourceUrl: canonicalSource,
      canonicalFlowId: null,
      route: "/f/curated-ajd-moving-d30",
      displayTitle: "이사 D-30 준비",
      itemCount: 5,
      primaryArtifact: "calendar",
      secondaryArtifacts: [],
      adjustCapabilities: ["anchor date", "personal title", "include/exclude"],
      saveObjectId: "curated-ajd-moving-d30",
      storageKeys: [
        "flow:saved:curated-ajd-moving-d30",
        "flow:map:saved:curated-ajd-moving-d30",
        "flow:map:persistence:curated-ajd-moving-d30",
      ],
      receiptBehavior: "immediate navigation to My Flow post-save panel",
      postSaveDestination: "/my?savedMap=curated-ajd-moving-d30",
      myFlowObjectCount: 1,
      calendarProjectionCount: 5,
      exportProjectionCount: 5,
      classification: "route_alias_bug_and_legacy_rollout_gap",
    },
    {
      surface: "Direct public alias",
      sourceUrl: canonicalSource,
      canonicalFlowId: null,
      route: "/f/source-backed-moving-d30",
      displayTitle: "원룸 이사 D-30 준비",
      itemCount: 5,
      primaryArtifact: "calendar",
      secondaryArtifacts: [],
      adjustCapabilities: ["anchor date", "personal title", "include/exclude"],
      saveObjectId: "source-backed-moving-d30",
      storageKeys: ["flow:saved:source-backed-moving-d30"],
      receiptBehavior: "public route receipt or existing source-backed bridge",
      postSaveDestination: "/my?savedFlow=source-backed-moving-d30",
      myFlowObjectCount: 1,
      calendarProjectionCount: 5,
      exportProjectionCount: 5,
      classification: "route_alias_bug",
    },
    {
      surface: "Flow Map",
      sourceUrl: canonicalSource,
      canonicalFlowId: null,
      route: "/flow-maps/moving-d30",
      displayTitle: "원룸 이사 D-30 일정 지도",
      itemCount: 5,
      primaryArtifact: "hybrid",
      secondaryArtifacts: [],
      adjustCapabilities: ["anchor date"],
      saveObjectId: "moving-d30 map + source-backed-moving-d30 child",
      storageKeys: ["flow:map:saved:moving-d30", "flow:map:persistence:moving-d30"],
      receiptBehavior: "map-specific post-save panel",
      postSaveDestination: "/my?savedMap=moving-d30",
      myFlowObjectCount: 1,
      calendarProjectionCount: 5,
      exportProjectionCount: 5,
      classification: "internal_bundle_exposed_as_user_grammar",
    },
    {
      surface: "Saved receipt",
      sourceUrl: canonicalSource,
      canonicalFlowId: null,
      route: "same /f route or /my?savedMap=*",
      displayTitle: "entry-specific",
      itemCount: "24 or 5",
      primaryArtifact: "entry-specific",
      secondaryArtifacts: [],
      adjustCapabilities: [],
      saveObjectId: "entry slug",
      storageKeys: ["entry-specific saved key"],
      receiptBehavior: "two different receipt grammars",
      postSaveDestination: "entry-specific",
      myFlowObjectCount: "1 per saved slug",
      calendarProjectionCount: "24 or 5",
      exportProjectionCount: "24 or 5",
      classification: "legacy_rollout_gap",
    },
    {
      surface: "My Flow",
      sourceUrl: canonicalSource,
      canonicalFlowId: null,
      route: "/my",
      displayTitle: "personal title per saved slug",
      itemCount: "24 + 5 + 5 possible",
      primaryArtifact: "execution",
      secondaryArtifacts: ["calendar", "export"],
      adjustCapabilities: ["personal title", "date", "memo", "completion", "archive"],
      saveObjectId: "three independent saved slugs",
      storageKeys: [
        "flow:saved:moving-d30-basic",
        "flow:saved:source-backed-moving-d30",
        "flow:saved:curated-ajd-moving-d30",
      ],
      receiptBehavior: "focused P32 workspace",
      postSaveDestination: "same focused workspace",
      myFlowObjectCount: "up to 3 for one source/job",
      calendarProjectionCount: "independent per object",
      exportProjectionCount: "independent per object",
      classification: "data_migration_risk",
    },
    {
      surface: "Calendar",
      sourceUrl: canonicalSource,
      canonicalFlowId: null,
      route: "/calendar",
      displayTitle: "saved object title",
      itemCount: "independent 24/5/5 projections",
      primaryArtifact: "calendar",
      secondaryArtifacts: ["undated queue"],
      adjustCapabilities: ["date placement", "Flow scope"],
      saveObjectId: "saved slug",
      storageKeys: ["saved-slug execution records"],
      receiptBehavior: "none",
      postSaveDestination: "selected day / Flow scope",
      myFlowObjectCount: "inherits duplicates",
      calendarProjectionCount: "can duplicate source-level intent",
      exportProjectionCount: "scope per object",
      classification: "downstream_duplicate_projection",
    },
    {
      surface: "Export",
      sourceUrl: canonicalSource,
      canonicalFlowId: null,
      route: "My Flow / Calendar export surfaces",
      displayTitle: "personal saved title",
      itemCount: "24 or 5 per selected object",
      primaryArtifact: "format-specific",
      secondaryArtifacts: [],
      adjustCapabilities: ["whole", "selected", "current"],
      saveObjectId: "saved slug embedded in export identity",
      storageKeys: ["saved-slug selection state"],
      receiptBehavior: "scope/count receipt",
      postSaveDestination: "external tool",
      myFlowObjectCount: "n/a",
      calendarProjectionCount: "n/a",
      exportProjectionCount: "duplicates remain independent",
      classification: "export_identity_split",
    },
  ],
  conclusions: [
    "source URL alone is not a safe deduplication key; canonical identity must also encode the user job and an intentional editorial variant.",
    "The current moving variants do not expose a variant contract, so users experience an alias bug rather than an intentional choice.",
    "The 24-item and 5-item records cannot be auto-merged because item identity and cardinality do not align.",
  ],
};

writeJson("cross-entry-invariant-matrix.json", invariantMatrix);

const aliasStorageImpact = {
  schemaVersion: "flowme.alias-storage-impact.v1",
  reviewerRole: "codex_independent",
  observedUserCount: 0,
  aliasGraph: {
    sourceUrl: canonicalSource,
    nodes: [
      { id: "moving-d30-basic", kind: "public_seed_flow", itemCount: 24 },
      { id: "moving-d30", kind: "source_backed_flow_map", itemCount: 5 },
      { id: "source-backed-moving-d30", kind: "source_backed_child_flow", itemCount: 5 },
      { id: "curated-ajd-moving-d30", kind: "curated_map_and_child", itemCount: 5 },
    ],
    edges: [
      { from: "Home", to: "moving-d30-basic", relation: "links_to" },
      { from: "Find", to: "moving-d30", relation: "links_to" },
      { from: "moving-d30", to: "source-backed-moving-d30", relation: "saves_child" },
      { from: "URL lookup", to: "curated-ajd-moving-d30", relation: "resolves_to" },
      { from: "direct alias", to: "source-backed-moving-d30", relation: "opens" },
    ],
    missingEdge: "all aliases -> one canonicalFlowId",
  },
  currentOwnership: [
    {
      layer: "source",
      owner: "Flow seed/map modules",
      key: "sourceUrl",
      risk: "URL variants are normalized for lookup but do not establish user Flow identity.",
    },
    {
      layer: "personal",
      owner: "saved slug",
      key: "flow:saved:{slug}",
      risk: "aliases create separate title/date/inclusion overlays.",
    },
    {
      layer: "run",
      owner: "slug/item identity",
      key: "execution state keys",
      risk: "completion and memo diverge across aliases.",
    },
    {
      layer: "occurrence",
      owner: "saved routine projection",
      key: "series/occurrence IDs",
      risk: "must not be regenerated or merged from source URL alone.",
    },
    {
      layer: "export",
      owner: "selected saved object",
      key: "slug + scope",
      risk: "same source can be exported twice with 24 and 5 rows/events.",
    },
  ],
  currentDuplicateBehavior: {
    sameSlugRepeatedSave: "one saved key is updated",
    differentAliasSave: "separate saved object is created",
    duplicateWarning: false,
    canonicalRepresentative: false,
    automaticMerge: false,
  },
  migrationRecommendation: {
    strategy: "additive registry, dual-read, gated single-write",
    canonicalKey: "canonicalFlowId = source identity + user job + intentional editorial variant",
    backupKeyExample: "flow:canonical-migration-backup:v1",
    steps: [
      "Introduce a read-only canonical registry and invariant tests before changing writes.",
      "Choose the canonical AJD moving content snapshot editorially; do not infer 24 vs 5 from popularity or route age.",
      "Attach legacy aliases to the canonical record while preserving legacy origin IDs.",
      "Dual-read old slug keys and canonical records; write only canonical identity after a feature gate.",
      "For one unambiguous legacy record, adopt it with a backup and provenance.",
      "For multiple records or 24-vs-5 mismatch, ask the user to choose an active copy; preserve the other as archived legacy history.",
    ],
    forbidden: [
      "Delete old localStorage keys during first migration.",
      "Map completion or memo state between 24 and 5 items by array index or title similarity.",
      "Use source URL alone as canonicalFlowId.",
      "Rewrite stable run, occurrence, or export identities as part of the visual alignment.",
    ],
    rollback: [
      "Feature flag returns reads to legacy slug keys.",
      "Backup retains pre-migration records.",
      "Canonical writes carry legacyOriginIds for reverse lookup.",
    ],
  },
  dataLossRisks: [
    {
      severity: "blocking_for_auto_merge",
      risk: "24 items cannot be deterministically paired with 5 items.",
      affected: ["completion", "personal memo", "date override", "exclusion", "export selection"],
    },
    {
      severity: "high",
      risk: "Choosing the newest savedAt record can discard a richer or more progressed object.",
      affected: ["personal overlay", "execution run"],
    },
    {
      severity: "high",
      risk: "Rekeying routine records can duplicate or lose occurrence history.",
      affected: ["series", "occurrence", "ICS identity"],
    },
  ],
};

writeJson("alias-storage-impact.json", aliasStorageImpact);

const hypotheses = [
  {
    id: "H1",
    verdict: "confirmed",
    route: "/, /flows, /flow-maps/moving-d30, /f/moving-d30-basic, /f/curated-ajd-moving-d30, /f/source-backed-moving-d30",
    viewport: "390x844, 1024x768",
    actual: "같은 AJD 원문이 네 사용자 route와 24/5/5/5 item snapshot으로 노출된다.",
    evidenceKind: ["current_production_interaction", "current_source"],
  },
  {
    id: "H2",
    verdict: "confirmed",
    route: "/f/moving-d30-basic -> /flow-maps/moving-d30 -> /my",
    viewport: "1024x768",
    actual: "Home 24개와 Find 5개를 저장하면 서로 다른 saved key와 My Flow 행이 생긴다.",
    evidenceKind: ["current_production_interaction", "current_package_screenshot", "current_source"],
  },
  {
    id: "H3",
    verdict: "confirmed",
    route: "/flows",
    viewport: "390x844, 1024x768",
    actual: "hydrated catalog 9개 중 앞 5개는 /flow-maps, 뒤 4개는 /f로 연결된다.",
    evidenceKind: ["current_production_interaction", "current_source"],
  },
  {
    id: "H4",
    verdict: "confirmed",
    route: "/f/moving-d30-basic, /f/vehicle-inspection-prep, /f/curated-wedding-naver-timeline, /f/curated-allblanc-morning-workout",
    viewport: "390x844",
    actual: "moving/vehicle Checklist 선택은 state를 바꾸지 않고 wedding/workout은 바꾼다. category-gated handler와 controlled component 조합이 원인이다.",
    evidenceKind: ["current_production_interaction", "current_source"],
  },
  {
    id: "H5",
    verdict: "confirmed",
    route: "/ -> /f/vehicle-inspection-prep",
    viewport: "390x844",
    actual: "Home은 필요할 때 Checklist를 약속하지만 target은 D-14 Calendar 10개가 기본이다.",
    evidenceKind: ["current_production_interaction", "current_source"],
  },
  {
    id: "H6",
    verdict: "confirmed",
    route: "/flows",
    viewport: "390x844",
    actual: "현재 hydrated catalog에는 vehicle-inspection-prep이 없고 차량 점검/자동차검사 검색으로 canonical target을 재발견하지 못했다. server-to-hydration flicker는 재현되지 않았다.",
    evidenceKind: ["current_production_interaction", "current_source"],
  },
  {
    id: "H7",
    verdict: "confirmed",
    route: "/f/curated-allblanc-morning-workout -> /my",
    viewport: "390x844",
    actual: "날짜 없이 저장한 focused My Flow에 raw RRULE이 표시된다. Calendar에는 raw 문자열이 표시되지 않는다.",
    evidenceKind: ["current_production_interaction", "current_source"],
  },
];

const alternatives = [
  {
    id: "A",
    name: "canonical public /f + legacy alias/handoff",
    description: "한 public slug를 정하고 legacy route를 해당 detail로 넘긴다.",
    scores: {
      userContinuity: 3,
      implementationSafety: 4,
      legacyDataSafety: 3,
      rollback: 4,
      longTermScale: 3,
    },
    strengths: ["작은 route change", "public shell 재사용", "빠른 vertical slice"],
    weaknesses: ["route winner를 hardcode", "기존 3개 saved identity와 duplicate를 충분히 해결하지 못함", "새 source/job variant 확장에 취약"],
    decision: "not_selected",
  },
  {
    id: "B",
    name: "canonical registry + role-specific shell, one save identity",
    description: "Home/Find/URL의 역할은 유지하되 source+job+variant registry에서 같은 canonicalFlowId와 content snapshot을 해석한다.",
    scores: {
      userContinuity: 5,
      implementationSafety: 3,
      legacyDataSafety: 4,
      rollback: 4,
      longTermScale: 5,
    },
    strengths: ["entry 역할과 user object identity 분리", "중복 방지와 향후 variant 정책 확장", "P32 downstream 계약 보존 가능"],
    weaknesses: ["additive registry와 dual-read 필요", "AJD 24 vs 5 editorial decision 필요", "reconciliation UX 필요"],
    decision: "recommended",
  },
  {
    id: "C",
    name: "broader discovery/detail consolidation",
    description: "Home, Find, detail IA와 data를 함께 다시 설계한다.",
    scores: {
      userContinuity: 4,
      implementationSafety: 1,
      legacyDataSafety: 1,
      rollback: 1,
      longTermScale: 3,
    },
    strengths: ["최대 시각 일관성 가능"],
    weaknesses: ["4탭 IA와 P32를 불필요하게 재개방", "데이터 회귀 범위가 큼", "현재 evidence gap보다 범위가 넓음"],
    decision: "defer",
  },
];

const weights = {
  userContinuity: 0.35,
  implementationSafety: 0.2,
  legacyDataSafety: 0.25,
  rollback: 0.1,
  longTermScale: 0.1,
};

for (const alternative of alternatives) {
  alternative.weightedScore = Number(
    Object.entries(weights)
      .reduce((total, [key, weight]) => total + alternative.scores[key] * weight, 0)
      .toFixed(2),
  );
}

const p33Slices = [
  {
    id: "P33-01",
    name: "Canonical registry와 invariant gate",
    problem: "같은 source/job을 가리키는 route와 save identity를 판정할 공통 계약이 없다.",
    currentEvidence: ["H1", "H2", "cross-entry-invariant-matrix.json"],
    dependency: [],
    scope: ["canonicalFlowId schema", "source+job+variant registry", "alias resolver", "read-only invariant tests"],
    nonGoals: ["legacy record migration", "Home/Find IA 변경", "UI redesign"],
    dataImpact: "additive metadata only; current writes unchanged",
    migration: "none in this slice",
    rollback: "remove resolver feature flag; legacy resolution remains",
    acceptanceScreenshot: ["AJD alias diagnostic report; no production visual change required"],
    testMarker: ["P33-CANONICAL-REGISTRY", "P33-CROSS-ENTRY-INVARIANT"],
  },
  {
    id: "P33-02",
    name: "AJD moving canonical vertical slice",
    problem: "24개와 5개 중 어떤 content snapshot이 canonical인지 제품이 정하지 않았다.",
    currentEvidence: ["H1", "P1-S3", "P3-S3"],
    dependency: ["P33-01"],
    scope: ["editorial 24-vs-5 decision", "canonical detail projection", "Home/Find/URL/alias resolution", "intentional variant label if both retained"],
    nonGoals: ["모든 source 일괄 migration", "P32 My Flow rewrite"],
    dataImpact: "alias metadata; content snapshot/version selection",
    migration: "no destructive write; legacy IDs remain aliases",
    rollback: "route resolver feature flag restores old routes",
    acceptanceScreenshot: ["390 Home->detail", "390 Find->same detail", "390 URL hit->same detail", "1024 canonical detail"],
    testMarker: ["P33-AJD-ONE-FLOW", "P33-AJD-COUNT-PARITY"],
  },
  {
    id: "P33-03",
    name: "Artifact control과 entry promise correctness",
    problem: "moving/vehicle의 visible result control이 동작하지 않고 vehicle promise가 target과 다르다.",
    currentEvidence: ["H4", "H5", "H6"],
    dependency: ["P33-01"],
    scope: ["eligibility-driven artifact handler", "unsupported control 숨김", "Home vehicle copy/target 정합", "Find canonical inventory inclusion"],
    nonGoals: ["새 artifact 종류", "가짜 사용량/리뷰", "Calendar IA 변경"],
    dataImpact: "selected artifact field only; no migration",
    migration: "none",
    rollback: "restore prior eligible shape list",
    acceptanceScreenshot: ["390 moving Checklist selected", "390 vehicle promise/detail parity", "390 Find vehicle search"],
    testMarker: ["P33-ARTIFACT-CONTROL", "P33-ENTRY-PROMISE-PARITY"],
  },
  {
    id: "P33-04",
    name: "Canonical save identity dual-read/single-write",
    problem: "slug별 저장이 같은 user Flow를 여러 object로 만든다.",
    currentEvidence: ["H2", "alias-storage-impact.json"],
    dependency: ["P33-01", "P33-02"],
    scope: ["canonical saved record", "legacyOriginIds", "dual-read", "feature-gated canonical write", "backup"],
    nonGoals: ["duplicate auto-merge", "legacy key delete", "account/DB"],
    dataImpact: "new canonical key and alias index; old keys retained",
    migration: "single unambiguous record만 backup 후 adopt",
    rollback: "read legacy keys using feature flag and backup",
    acceptanceScreenshot: ["same saved signal on Home/Find/URL", "one My Flow row for new saves"],
    testMarker: ["P33-CANONICAL-SAVE-ID", "P33-LEGACY-DUAL-READ"],
  },
  {
    id: "P33-05",
    name: "Legacy duplicate reconciliation",
    problem: "이미 존재하는 24개/5개 기록을 안전하게 자동 병합할 수 없다.",
    currentEvidence: ["P4-S1", "P4-S2", "P4-S3"],
    dependency: ["P33-04"],
    scope: ["duplicate detection", "active copy selection", "difference summary", "other copy archive", "personal/run/export preservation"],
    nonGoals: ["title similarity auto-merge", "history deletion", "cross-device sync"],
    dataImpact: "reconciliation decision record and archived legacy reference",
    migration: "explicit user choice for cardinality mismatch",
    rollback: "restore archived legacy records and prior active pointer",
    acceptanceScreenshot: ["390 duplicate decision sheet", "1024 side-by-side count/state summary", "restored legacy copy"],
    testMarker: ["P33-DUPLICATE-RECONCILE", "P33-NO-AUTO-MERGE"],
  },
  {
    id: "P33-06",
    name: "Receipt, My Flow, Calendar, export parity",
    problem: "upstream receipt grammar와 downstream identity가 entry별로 다르고 raw recurrence가 노출된다.",
    currentEvidence: ["H3", "H7", "P6-S2"],
    dependency: ["P33-04"],
    scope: ["shared receipt anatomy", "canonical count/title parity", "Calendar scope identity", "export identity", "human-readable recurrence adapter"],
    nonGoals: ["P32 focused workspace rewrite", "new export formats"],
    dataImpact: "display projection and canonical reference; run/occurrence IDs preserved",
    migration: "none beyond P33-04 alias reference",
    rollback: "legacy receipt adapter remains behind feature flag",
    acceptanceScreenshot: ["390 public/map receipt parity", "1024 My Flow/Calendar same title/count", "human-readable routine summary"],
    testMarker: ["P33-RECEIPT-PARITY", "P33-DOWNSTREAM-IDENTITY", "P33-RRULE-DISPLAY"],
  },
  {
    id: "P33-07",
    name: "Regression and final independent gate",
    problem: "기존 tests가 각 route를 독립 검증해 cross-entry invariant를 놓쳤다.",
    currentEvidence: ["current targeted E2E 15/15", "absence of same-source invariant test"],
    dependency: ["P33-02", "P33-03", "P33-04", "P33-05", "P33-06"],
    scope: ["24-cell rerun", "390/1024/1440 screenshots", "cross-entry golden tests", "storage migration rollback test", "accessibility scan"],
    nonGoals: ["observed-user validation claim", "new feature scope"],
    dataImpact: "test fixtures only",
    migration: "backup/rollback rehearsal",
    rollback: "release gate blocks canonical write flag",
    acceptanceScreenshot: ["Home/Find/URL same Flow", "one new-save My Flow object", "legacy duplicate preserved/reconciled", "Calendar/export parity"],
    testMarker: ["P33-FINAL-CROSS-ENTRY-GATE", "P33-24-CELL", "P33-ROLLBACK-REHEARSAL"],
  },
];

const decisionMatrix = {
  schemaVersion: "flowme.cross-entry-decision-matrix.v1",
  reviewerRole: "codex_independent",
  verdict: "canonical_flow_contract_reopen",
  observedUserCount: 0,
  weights,
  alternatives,
  recommendation: {
    selected: "B",
    rationale:
      "B만 Home/Find 역할과 P32 downstream을 보존하면서 one user-facing Flow identity와 비파괴 legacy migration을 함께 충족한다.",
    rejectedScope:
      "C는 current evidence보다 범위가 넓고 4탭 IA와 P32 focused workspace를 불필요하게 다시 연다.",
  },
  p33Order: p33Slices.map((slice) => slice.id),
};

writeJson("decision-matrix.json", decisionMatrix);

const findingRows = [
  {
    id: "HIGH-01",
    severity: "High",
    title: "같은 source/job이 네 route, 세 save identity, 24/5 item snapshot으로 갈린다.",
    route: "/, /flows, /flow-maps/moving-d30, /f/moving-d30-basic, /f/curated-ajd-moving-d30, /f/source-backed-moving-d30",
    viewport: "390, 1024",
    reproduction: "Home, Find, AJD URL lookup, direct alias에서 title/count/save key를 비교한다.",
    expected: "entry role이 달라도 one canonicalFlowId와 one saved object",
    actual: "canonicalFlowId가 없고 3개 slug key로 분기",
    impact: "이미 저장했는지 알 수 없고 My Flow/Calendar/export 중복이 생긴다.",
    evidenceKind: "current_production_interaction + current_source",
    recommendation: "B안 canonical registry와 role-specific shell",
    marker: "P33-CROSS-ENTRY-INVARIANT",
  },
  {
    id: "HIGH-02",
    severity: "High",
    title: "기존 24개/5개 개인 상태는 자동 병합할 수 없는데 reconciliation이 없다.",
    route: "/my, /calendar",
    viewport: "390, 1024",
    reproduction: "Home와 Find 이사 Flow를 차례로 저장하고 한쪽 완료·날짜 변경 후 비교한다.",
    expected: "중복 감지, 차이 비교, 대표 선택, 비파괴 보관",
    actual: "별도 행과 projection만 생성되고 개별 archive/delete 외 source-level 정리 수단이 없다.",
    impact: "자동 merge는 memo/completion/date/export selection을 잃을 수 있고 수동 삭제도 불안하다.",
    evidenceKind: "current_production_interaction + current_source",
    recommendation: "dual-read 후 explicit active-copy selection; 24↔5 auto-merge 금지",
    marker: "P33-NO-AUTO-MERGE",
  },
  {
    id: "HIGH-03",
    severity: "High",
    title: "moving/vehicle의 visible Checklist control이 false affordance다.",
    route: "/f/moving-d30-basic, /f/vehicle-inspection-prep",
    viewport: "390",
    reproduction: "Calendar selected 상태에서 Checklist를 누르고 selected shape, preview, CTA를 비교한다.",
    expected: "Checklist projection과 count-based CTA로 변경",
    actual: "Calendar 상태가 유지된다. wedding/workout에서는 같은 control이 작동한다.",
    impact: "사용자는 저장될 결과를 잘못 예측한다.",
    evidenceKind: "current_production_interaction + current_source",
    recommendation: "category hardcode 제거, eligibility 기반 handler 또는 unsupported control 숨김",
    marker: "P33-ARTIFACT-CONTROL",
  },
  {
    id: "HIGH-04",
    severity: "High",
    title: "Home vehicle promise, detail 기본 결과, Find 재발견이 하나의 job으로 이어지지 않는다.",
    route: "/ -> /f/vehicle-inspection-prep -> /flows",
    viewport: "390",
    reproduction: "Home card 문구를 읽고 target artifact 확인 후 차량 점검/자동차검사로 검색한다.",
    expected: "필요할 때 Checklist promise와 동일 target/saved signal",
    actual: "D-14 Calendar가 기본이고 Find hydrated inventory에 canonical card가 없다.",
    impact: "첫 기대가 깨지고 저장한 콘텐츠를 다시 찾기 어렵다.",
    evidenceKind: "current_production_interaction + current_source",
    recommendation: "entry promise 계약과 canonical inventory를 같은 registry에서 생성",
    marker: "P33-ENTRY-PROMISE-PARITY",
  },
  {
    id: "MED-01",
    severity: "Medium",
    title: "Find의 legacy map과 current public detail/receipt가 다른 화면 문법을 쓴다.",
    route: "/flows, /flow-maps/*, /f/*",
    viewport: "390, 1024, 1440",
    reproduction: "catalog 앞 5개와 뒤 4개 detail 및 저장 후 화면을 비교한다.",
    expected: "entry context는 달라도 Flow anatomy와 receipt action은 동일",
    actual: "legacy map shell과 public artifact-first shell, 두 receipt grammar가 공존한다.",
    impact: "콘텐츠 차이보다 시스템 세대 차이가 먼저 보인다.",
    evidenceKind: "current_production_interaction + current_package_screenshot",
    recommendation: "canonical detail/receipt anatomy 공유, map은 internal bundle 또는 alias로 제한",
    marker: "P33-RECEIPT-PARITY",
  },
  {
    id: "MED-02",
    severity: "Medium",
    title: "반복 규칙의 raw RRULE이 My Flow 사용자 문구로 노출된다.",
    route: "/f/curated-allblanc-morning-workout -> /my",
    viewport: "390",
    reproduction: "날짜 없이 저장하고 focused Flow workspace를 연다.",
    expected: "월·수·금 반복처럼 사람이 읽는 summary",
    actual: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
    impact: "데이터 모델이 UI로 새고 반복 설정 신뢰를 낮춘다.",
    evidenceKind: "current_production_interaction + current_source",
    recommendation: "display adapter만 수정하고 occurrence identity는 유지",
    marker: "P33-RRULE-DISPLAY",
  },
  {
    id: "MED-03",
    severity: "Medium",
    title: "legacy detail의 focus/accessible-name 문법이 public shell과 다르다.",
    route: "/flow-maps/moving-d30, /f/moving-d30-basic",
    viewport: "390, 1024",
    reproduction: "keyboard-only로 summary, source link, fixed action을 순회한다.",
    expected: "같은 역할 control의 동일 semantic name과 focus return",
    actual: "일부 summary/link가 unnamed로 잡히고 중첩 interaction 순서가 다르다.",
    impact: "키보드 사용자는 같은 Flow 과업을 route마다 다시 학습한다.",
    evidenceKind: "current_production_interaction + heuristic_simulation",
    recommendation: "shared semantic anatomy와 explicit accessible name/focus return",
    marker: "P33-A11Y-CROSS-ENTRY",
  },
  {
    id: "LOW-01",
    severity: "Low",
    title: "예시 날짜와 '날짜 없이 시작' CTA의 관계는 설명 없이 즉시 명확하지 않을 수 있다.",
    route: "/f/moving-d30-basic",
    viewport: "390",
    reproduction: "anchor 입력 전 Calendar 예시와 primary CTA를 함께 읽는다.",
    expected: "예시와 실제 저장 상태가 시각적으로 구분",
    actual: "예시 날짜가 먼저 보이는 동안 CTA는 날짜 없이 시작을 제안한다.",
    impact: "실제 사용자 오해 여부는 아직 확인되지 않았다.",
    evidenceKind: "heuristic_simulation",
    recommendation: "예시 badge와 anchor-required transition을 직접 조작으로 구분; 설명문 증가는 피함",
    marker: "P33-EXAMPLE-DATE-STATE",
  },
];

const auditMd = `# FlowMe cross-entry canonical independent review

## Overall verdict

**canonical_flow_contract_reopen**

P32의 focused My Flow와 Calendar 실행 계약은 유지할 수 있다. 그러나 upstream에서 같은 AJD 이사 원문과 같은 D-30 사용자 job이 Home, Find, URL lookup, direct alias에서 하나의 Flow로 이어지지 않는다. 현재는 4개 route, 3개 saved slug, 24/5/5/5 item snapshot이 공존한다.

이 판정은 production interaction, current source, screenshot, heuristic simulation에 근거한다. 실제 관찰 사용자 수는 **0명**이다.

## Blocking

앱 crash, data corruption, horizontal overflow, console/page error 형태의 Blocking finding은 재현되지 않았다. 다만 기존 데이터 자동 병합은 item cardinality가 맞지 않으므로 **구현 차단 조건**으로 취급해야 한다.

${["High", "Medium", "Low"]
  .map(
    (severity) => `## ${severity}

${findingRows
  .filter((finding) => finding.severity === severity)
  .map(
    (finding) => `### ${finding.id} ${finding.title}

- Route: \`${finding.route}\`
- Viewport: ${finding.viewport}
- 재현: ${finding.reproduction}
- 기대: ${finding.expected}
- 실제: ${finding.actual}
- 사용자 영향: ${finding.impact}
- evidenceKind: \`${finding.evidenceKind}\`
- 권장 변경: ${finding.recommendation}
- acceptance marker: \`${finding.marker}\`
`,
  )
  .join("\n")}`,
  )
  .join("\n")}

## 기존 가설 재판정

| ID | 판정 | 현재 production 재판정 |
|---|---|---|
${hypotheses.map((item) => `| ${item.id} | **${item.verdict}** | ${item.actual} |`).join("\n")}

## Source와 storage graph

- Home: \`moving-d30-basic\` 24개
- Find map: \`moving-d30\` → \`source-backed-moving-d30\` 5개
- URL lookup: \`curated-ajd-moving-d30\` 5개
- Direct alias: \`source-backed-moving-d30\` 5개
- 현재 canonicalFlowId: 없음
- 새 저장 key: slug 단위
- 같은 slug 반복 저장: 한 key 갱신
- 다른 alias 저장: 별도 My Flow object

Source URL만으로 합치면 안 된다. 기준은 \`source identity + user job + intentional editorial variant\`여야 한다. 현재 24개와 5개는 intentional variant label이 없으므로 사용자에게는 alias inconsistency로 보인다.

## Current source pointers

- \`docs/DECISIONS.md:122-126\`: Home, Flow finding, save-before, post-save, My Flow, Calendar, export에서 one user-facing Flow를 쓰고 Flow Map은 internal bundle로 둔다는 현재 결정
- \`components/flow/AppClient.tsx:3290-3307\`: Home의 moving, vehicle, workout entry
- \`lib/flow/seed-flows.ts:2854-3000\`, \`lib/flow/seed-flows.ts:3493\`: 24-item public moving bundle
- \`lib/flow/source-backed-my-flow.ts:535-539\`: map saved/persistence key가 mapId에 묶임
- \`lib/flow/source-backed-curated-260630.ts:217-225\`, \`lib/flow/source-backed-curated-260630.ts:873-910\`: curated AJD 5-item variant와 discovery 숨김 정책
- \`lib/flow/url-first-lookup.ts:335-337\`: AJD URL lookup이 curated map/slug로 고정됨
- \`lib/flow/storage.ts:62-63\`, \`lib/flow/storage.ts:511-543\`: saved Flow record가 slug key에 묶임
- \`components/flow/AppClient.tsx:18757-18760\`, \`components/flow/AppClient.tsx:19592-19596\`: artifact change handler가 특정 category에만 연결됨
- \`components/flow/FlowArtifactDataPreview.tsx:206-289\`: controlled selected shape가 parent handler 없이는 원래 값으로 돌아감

## Current test gap

현재 관련 E2E는 public save-before, source-backed map, My Flow, Calendar를 각각 검증한다. 하지만 같은 source를 Home→Find→URL lookup으로 이동하며 title/count/save identity가 하나인지 확인하는 invariant test가 없다. 그래서 각 화면은 통과하면서 cross-entry journey는 실패할 수 있다.
`;

writeText("audit.md", auditMd);

const p33Md = `# P33 recommendation

## 결정

**B. canonical registry + role-specific shell, one save identity**

Home은 사용 예시, Find는 탐색, URL lookup은 source 해석이라는 역할을 유지한다. 역할은 달라도 같은 source/job/variant는 같은 \`canonicalFlowId\`, content snapshot, save identity로 이어져야 한다. P32 focused My Flow, Calendar, run/occurrence/export 계약은 다시 쓰지 않는다.

## 실행 순서

${p33Slices
  .map(
    (slice) => `### ${slice.id} ${slice.name}

- 문제: ${slice.problem}
- current evidence: ${slice.currentEvidence.join(", ")}
- dependency: ${slice.dependency.length ? slice.dependency.join(", ") : "없음"}
- 범위: ${slice.scope.join("; ")}
- 비범위: ${slice.nonGoals.join("; ")}
- data impact: ${slice.dataImpact}
- migration: ${slice.migration}
- rollback: ${slice.rollback}
- acceptance screenshot: ${slice.acceptanceScreenshot.join("; ")}
- test marker: ${slice.testMarker.map((marker) => `\`${marker}\``).join(", ")}
`,
  )
  .join("\n")}

## 구현 경계

1. P33-01은 read-only registry와 invariant test부터 시작한다.
2. P33-02에서 AJD 24개/5개 중 canonical content를 editorially 결정한다.
3. 새 save identity는 P33-04 이전에 쓰지 않는다.
4. 기존 24개/5개 record는 자동 병합하지 않는다.
5. reconciliation은 active copy 선택과 archived legacy 보존을 기본으로 한다.
6. source, personal overlay, run, occurrence, export identity는 각각 보존한다.
7. feature flag와 backup으로 legacy read path로 되돌릴 수 있어야 한다.

## 실제 사용자에게만 확인할 질문

1. 같은 AJD 원문에서 24개 전체판과 5개 핵심판을 서로 다른 Flow로 인식하는가?
2. 중복 후보가 발견되면 대표본 선택, 둘 다 유지, 하나 숨기기 중 무엇을 기대하는가?
3. Home의 사용 예시와 Find의 catalog가 각각 어떤 역할이라고 이해되는가?
4. Calendar/Checklist result control을 destination 선택으로 이해하는가?
5. 날짜 예시와 날짜 없이 시작을 동시에 볼 때 실제 저장 결과를 올바르게 예측하는가?

이 질문은 자동화로 답하지 않는다. 현재 observed-user count는 0이다.
`;

writeText("p33-recommendation.md", p33Md);

const verification = {
  schemaVersion: "flowme.cross-entry-verification.v1",
  reviewerRole: "codex_independent",
  baseline: {
    originMainSha: "e491d99ca61ecae4fd0dd009f785e737b6a59516",
    cleanWorktree: "D:\\flowme2605\\flow-p33-cross-entry-independent-main",
    productionReachable: true,
  },
  commands: [
    { command: "npm.cmd ci", result: "pass", detail: "214 packages, 0 vulnerabilities" },
    { command: "npm.cmd test", result: "pass", detail: "587/587" },
    { command: "npm.cmd run build", result: "pass", detail: "Next 15.5.21, 18 static pages" },
    {
      command: "targeted E2E, 4 workers",
      result: "harness_failure",
      detail: "local Next web server crashed before product assertions completed",
    },
    {
      command: "targeted E2E, 1 worker",
      result: "pass",
      detail: "14/14 across P25/P26/P31/P32 related journeys",
    },
    {
      command: "URL-first targeted E2E, 1 worker",
      result: "pass",
      detail: "1/1",
    },
    {
      command: "production browser capture",
      result: "pass",
      detail: "21 surfaces + 24 journey cells; 0 page/console errors; no horizontal overflow",
    },
    {
      command: "npm.cmd run docs:check",
      result: "pass",
      detail: "14 required files, 3135 local links",
    },
    {
      command: "review.html render QA",
      result: "pass",
      detail: "390x844 and 1440x900; all evidence images loaded; no horizontal overflow",
    },
    {
      command: "git diff --check and scoped status inspection",
      result: "pass",
      detail: "only the new review package is untracked; no app-code or tracked-file diff",
    },
  ],
  pendingAtGeneration: [],
  observedUserCount: 0,
  appCodeChanged: false,
  publishActions: {
    commit: false,
    push: false,
    pullRequest: false,
    merge: false,
    deploy: false,
  },
};

writeJson("verification.json", verification);

const README = `# FlowMe cross-entry canonical independent review

## Verdict

**canonical_flow_contract_reopen**

현재 production은 각 route 내부에서는 저장→My Flow→Calendar 실행이 대체로 동작한다. 그러나 같은 AJD 이사 source/job이 Home 24개, Find 5개, URL lookup 5개, direct alias 5개로 갈리고 세 개의 saved identity를 만든다. 따라서 “같은 콘텐츠가 하나의 사용자 Flow로 이어진다”는 제품 약속은 충족되지 않는다.

P32 focused My Flow workspace, 4탭 IA, public \`/f\` shell은 유지한다. P33은 **B안: canonical registry + role-specific shell + one save identity**로 제한한다.

## 핵심 수치

- 8 personas × 3 sessions: **24 cells**
- supported: **${scoreSummary.supported}**
- partial: **${scoreSummary.partial}**
- missing: **${scoreSummary.missing}**
- observed users: **0**
- production capture: 21 surfaces, horizontal overflow 0, console/page error 0
- unit: 587/587
- related serial E2E: 14/14
- URL-first targeted E2E: 1/1

## 기존 가설

${hypotheses.map((item) => `- ${item.id}: **${item.verdict}** — ${item.actual}`).join("\n")}

## 읽는 순서

1. [review.html](./review.html) — 10분 판단용 한국어 visual report
2. [audit.md](./audit.md) — severity finding과 재현 근거
3. [cross-entry-invariant-matrix.json](./cross-entry-invariant-matrix.json) — surface별 source/title/count/save/export 정합성
4. [persona-journey-scorecard.json](./persona-journey-scorecard.json) — 24 cells
5. [alias-storage-impact.json](./alias-storage-impact.json) — storage ownership, migration, data-loss 위험
6. [decision-matrix.json](./decision-matrix.json) — A/B/C 비교
7. [p33-recommendation.md](./p33-recommendation.md) — P33 실행 순서와 rollback
8. [verification.json](./verification.json) — current command/browser 검증

## 경계

- app code 변경 없음
- dependency 변경 없음
- STATUS/ROADMAP 변경 없음
- commit/push/PR/merge/deploy 없음
- browser automation, screenshot, heuristic simulation은 실제 사용자 검증이 아님
- observed-user count는 0
`;

writeText("README.md", README);

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const statusLabel = {
  supported: "지원",
  partial: "부분",
  missing: "없음",
};

const reportHtml = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FlowMe cross-entry canonical 독립 검토</title>
  <style>
    :root {
      --ink: #172126;
      --muted: #5d6a70;
      --paper: #f6f7f4;
      --panel: #ffffff;
      --line: #d8dedb;
      --mint: #0b6b58;
      --mint-soft: #dff2eb;
      --coral: #b54b3e;
      --coral-soft: #f8e7e3;
      --amber: #8a5a00;
      --amber-soft: #fff1ce;
      --blue: #245d8f;
      --blue-soft: #e7f1fb;
      --shadow: 0 8px 28px rgba(23, 33, 38, .08);
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      color: var(--ink);
      background: var(--paper);
      font-family: Inter, "Pretendard", "Noto Sans KR", system-ui, sans-serif;
      line-height: 1.55;
      letter-spacing: 0;
    }
    a { color: inherit; }
    img { display: block; width: 100%; height: auto; border: 1px solid var(--line); background: #fff; }
    .shell { width: min(1180px, calc(100% - 32px)); margin: 0 auto; }
    .topbar {
      position: sticky; top: 0; z-index: 10;
      border-bottom: 1px solid var(--line);
      background: rgba(246,247,244,.94);
      backdrop-filter: blur(12px);
    }
    .topbar .shell { min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
    .brand { font-weight: 800; }
    .nav { display: flex; gap: 14px; overflow-x: auto; font-size: 13px; color: var(--muted); white-space: nowrap; }
    .hero { padding: 56px 0 30px; border-bottom: 1px solid var(--line); background: #eef3ef; }
    .eyebrow { margin: 0 0 10px; color: var(--mint); font-size: 12px; font-weight: 800; text-transform: uppercase; }
    h1 { max-width: 780px; margin: 0; font-size: clamp(32px, 5vw, 58px); line-height: 1.06; letter-spacing: 0; }
    .lede { max-width: 780px; margin: 20px 0 0; color: var(--muted); font-size: 18px; }
    .verdict {
      display: inline-flex; margin-top: 24px; padding: 8px 12px;
      color: #fff; background: var(--coral); font-size: 13px; font-weight: 800;
    }
    .metrics { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 10px; margin-top: 34px; }
    .metric { padding: 16px; border: 1px solid var(--line); background: rgba(255,255,255,.74); }
    .metric b { display: block; font-size: 26px; }
    .metric span { color: var(--muted); font-size: 12px; }
    section { padding: 48px 0; border-bottom: 1px solid var(--line); }
    h2 { margin: 0 0 8px; font-size: 28px; }
    h3 { margin: 0; font-size: 18px; }
    .section-copy { max-width: 760px; margin: 0 0 24px; color: var(--muted); }
    .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 18px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 14px; }
    .panel { padding: 20px; border: 1px solid var(--line); background: var(--panel); box-shadow: var(--shadow); }
    .panel p { margin: 8px 0 0; color: var(--muted); }
    .kicker { color: var(--muted); font-size: 12px; font-weight: 700; }
    .bad { color: var(--coral); }
    .good { color: var(--mint); }
    .tag { display: inline-block; padding: 3px 7px; font-size: 11px; font-weight: 800; background: var(--blue-soft); color: var(--blue); }
    .tag.high { background: var(--coral-soft); color: var(--coral); }
    .tag.medium { background: var(--amber-soft); color: var(--amber); }
    .flowline { display: grid; grid-template-columns: repeat(7, minmax(0,1fr)); gap: 8px; align-items: stretch; }
    .flow-node { min-height: 92px; padding: 12px; border: 1px solid var(--line); background: #fff; }
    .flow-node strong { display: block; font-size: 13px; }
    .flow-node span { display: block; margin-top: 6px; color: var(--muted); font-size: 11px; }
    .flow-node.problem { border-color: #e3aaa2; background: var(--coral-soft); }
    .flow-node.target { border-color: #8fc6b7; background: var(--mint-soft); }
    .shot { margin: 0; }
    .shot figcaption { padding: 10px 0 0; color: var(--muted); font-size: 12px; }
    .phone img { max-height: 700px; object-fit: contain; object-position: top; }
    table { width: 100%; border-collapse: collapse; background: #fff; font-size: 13px; }
    th, td { padding: 12px; border: 1px solid var(--line); text-align: left; vertical-align: top; }
    th { background: #edf1ee; }
    .table-wrap { overflow-x: auto; }
    .finding { display: grid; grid-template-columns: 82px minmax(0,1fr); gap: 16px; padding: 18px 0; border-top: 1px solid var(--line); }
    .finding:first-of-type { border-top: 0; }
    .finding p { margin: 6px 0 0; color: var(--muted); }
    .option.recommended { border: 2px solid var(--mint); }
    .score { margin-top: 16px; font-size: 30px; font-weight: 850; }
    .wireframe { padding: 14px; border: 1px solid var(--line); background: #f8faf8; }
    .wf-bar { height: 38px; padding: 8px; background: #172126; color: #fff; font-size: 12px; }
    .wf-row { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; margin-top: 8px; }
    .wf-box { min-height: 58px; padding: 10px; border: 1px dashed #9aa8a2; background: #fff; font-size: 12px; }
    .wf-primary { min-height: 84px; border: 2px solid var(--mint); background: var(--mint-soft); }
    .wf-danger { border-color: var(--coral); background: var(--coral-soft); }
    .slice { display: grid; grid-template-columns: 82px minmax(0,1fr); gap: 14px; padding: 16px 0; border-top: 1px solid var(--line); }
    details { border-top: 1px solid var(--line); background: #fff; }
    summary { cursor: pointer; padding: 14px; font-weight: 750; }
    details .detail-body { padding: 0 14px 14px; color: var(--muted); font-size: 13px; }
    footer { padding: 40px 0 80px; color: var(--muted); font-size: 13px; }
    @media (max-width: 860px) {
      .metrics { grid-template-columns: repeat(2, minmax(0,1fr)); }
      .grid-2, .grid-3 { grid-template-columns: 1fr; }
      .flowline { grid-template-columns: 1fr; }
      .flow-node { min-height: 0; }
      .wf-row { grid-template-columns: 1fr; }
    }
    @media (max-width: 520px) {
      .shell { width: min(100% - 20px, 1180px); }
      .topbar .shell { align-items: flex-start; padding: 10px 0; flex-direction: column; gap: 6px; }
      .hero { padding-top: 36px; }
      h1 { font-size: 36px; }
      .lede { font-size: 16px; }
      section { padding: 36px 0; }
      .metrics { grid-template-columns: 1fr 1fr; }
      .metric b { font-size: 22px; }
      .finding, .slice { grid-template-columns: 1fr; gap: 6px; }
      th, td { padding: 9px; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="shell">
      <div class="brand">FlowMe · 독립 검토</div>
      <nav class="nav" aria-label="보고서 목차">
        <a href="#verdict">판정</a><a href="#continuity">연속성</a><a href="#evidence">화면</a><a href="#findings">Findings</a><a href="#journeys">24 cells</a><a href="#decision">A/B/C</a><a href="#p33">P33</a>
      </nav>
    </div>
  </header>

  <main>
    <div class="hero" id="verdict">
      <div class="shell">
        <p class="eyebrow">Codex independent · production/current source</p>
        <h1>같은 이사 콘텐츠가<br>하나의 사용자 Flow가 아니다.</h1>
        <p class="lede">각 route 내부의 저장과 실행은 대체로 동작한다. 그러나 Home 24개, Find 5개, URL lookup 5개가 서로 다른 저장 객체가 되어 My Flow·Calendar·export에서 갈라진다.</p>
        <div class="verdict">canonical_flow_contract_reopen</div>
        <div class="metrics">
          <div class="metric"><b>24</b><span>persona × session cells</span></div>
          <div class="metric"><b>${scoreSummary.supported}</b><span>supported</span></div>
          <div class="metric"><b>${scoreSummary.partial}</b><span>partial</span></div>
          <div class="metric"><b>${scoreSummary.missing}</b><span>missing</span></div>
          <div class="metric"><b>0</b><span>observed users</span></div>
        </div>
      </div>
    </div>

    <section id="continuity">
      <div class="shell">
        <h2>현재 continuity</h2>
        <p class="section-copy">entry 역할이 다른 것은 문제가 아니다. 같은 source/job이 다른 content snapshot과 저장 identity가 되는 것이 문제다.</p>
        <div class="flowline" aria-label="현재 cross-entry 흐름">
          <div class="flow-node problem"><strong>Home</strong><span>moving-d30-basic<br>24개</span></div>
          <div class="flow-node problem"><strong>Find</strong><span>moving-d30 map<br>5개</span></div>
          <div class="flow-node problem"><strong>URL lookup</strong><span>curated-ajd<br>5개</span></div>
          <div class="flow-node problem"><strong>Save keys</strong><span>세 slug identity</span></div>
          <div class="flow-node problem"><strong>My Flow</strong><span>최대 3개 객체</span></div>
          <div class="flow-node problem"><strong>Calendar</strong><span>별도 projection</span></div>
          <div class="flow-node problem"><strong>Export</strong><span>24 또는 5</span></div>
        </div>
        <h3 style="margin-top:28px">권장 continuity</h3>
        <div class="flowline" style="margin-top:12px" aria-label="권장 cross-entry 흐름">
          <div class="flow-node target"><strong>Home</strong><span>사용 예시 context</span></div>
          <div class="flow-node target"><strong>Find</strong><span>탐색 context</span></div>
          <div class="flow-node target"><strong>URL lookup</strong><span>source context</span></div>
          <div class="flow-node target"><strong>Canonical registry</strong><span>source + job + variant</span></div>
          <div class="flow-node target"><strong>One saved Flow</strong><span>personal overlay</span></div>
          <div class="flow-node target"><strong>Run/Calendar</strong><span>stable identity</span></div>
          <div class="flow-node target"><strong>Export</strong><span>whole/selected/current</span></div>
        </div>
      </div>
    </section>

    <section id="evidence">
      <div class="shell">
        <h2>눈으로 확인되는 단절</h2>
        <p class="section-copy">같은 AJD source가 current public shell과 legacy map shell에서 서로 다른 Flow처럼 보인다.</p>
        <div class="grid-2">
          <figure class="shot phone">
            <img src="screenshots/moving-public-mobile.png" alt="모바일 public 이사 Flow 24개 화면">
            <figcaption>Home → public /f · 24개 · artifact-first shell</figcaption>
          </figure>
          <figure class="shot phone">
            <img src="screenshots/moving-map-mobile.png" alt="모바일 Flow Map 이사 Flow 5개 화면">
            <figcaption>Find → /flow-maps · 5개 · legacy map shell</figcaption>
          </figure>
        </div>
        <div class="grid-2" style="margin-top:18px">
          <figure class="shot">
            <img src="screenshots/p4-s1.png" alt="My Flow에 이사 Flow 두 개가 표시된 화면">
            <figcaption>같은 원문을 저장한 뒤 My Flow에 24개와 5개가 별도 행으로 나타남.</figcaption>
          </figure>
          <div class="panel">
            <p class="kicker">Current source explanation</p>
            <h3>slug가 곧 저장 identity다.</h3>
            <p><code>flow:saved:{slug}</code>가 public, source-backed, curated에서 각각 생성된다. URL lookup은 source URL을 찾지만 결과를 one user-facing Flow registry로 합치지 않는다.</p>
            <p><strong class="bad">자동 병합 금지:</strong> 24개와 5개는 item cardinality와 title이 달라 completion, memo, date override를 안전하게 대응시킬 수 없다.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="findings">
      <div class="shell">
        <h2>Severity findings</h2>
        <p class="section-copy">Blocking crash는 없었다. High는 사용자 Flow identity와 저장 결과 예측을 직접 깨는 문제다.</p>
        ${findingRows
          .map(
            (finding) => `<article class="finding">
          <div><span class="tag ${finding.severity.toLowerCase()}">${escapeHtml(finding.severity)}</span><div class="kicker">${escapeHtml(finding.id)}</div></div>
          <div><h3>${escapeHtml(finding.title)}</h3><p><strong>실제:</strong> ${escapeHtml(finding.actual)}</p><p><strong>영향:</strong> ${escapeHtml(finding.impact)}</p><p><strong>조치:</strong> ${escapeHtml(finding.recommendation)} · <code>${escapeHtml(finding.marker)}</code></p></div>
        </article>`,
          )
          .join("")}
      </div>
    </section>

    <section>
      <div class="shell">
        <h2>H1–H7 재판정</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>판정</th><th>현재 production 결과</th><th>Evidence</th></tr></thead>
            <tbody>
              ${hypotheses
                .map(
                  (item) => `<tr><td><strong>${item.id}</strong></td><td><span class="tag">${item.verdict}</span></td><td>${escapeHtml(item.actual)}</td><td>${escapeHtml(item.evidenceKind.join(", "))}</td></tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section id="journeys">
      <div class="shell">
        <h2>8 personas × 3 sessions</h2>
        <p class="section-copy">화면 단위 pass와 journey identity pass를 분리했다. supported ${scoreSummary.supported}, partial ${scoreSummary.partial}, missing ${scoreSummary.missing}.</p>
        <div>
          ${cells
            .map(
              (cell) => `<details>
            <summary>${cell.personaId}-${cell.sessionId} · ${escapeHtml(cell.userGoal)} · <span class="tag ${cell.severity}">${statusLabel[cell.status]}</span></summary>
            <div class="detail-body">
              <p><strong>Route:</strong> ${escapeHtml(cell.route.join(" → "))} · <strong>Viewport:</strong> ${escapeHtml(cell.viewport)}</p>
              <p><strong>기대:</strong> ${escapeHtml(cell.expectedMentalModel)}</p>
              <p><strong>실제:</strong> ${escapeHtml(cell.actualFeedback)}</p>
              <p><strong>Identity/count:</strong> ${escapeHtml(cell.flowIdentityObserved)} · ${escapeHtml(cell.itemCountObserved)}</p>
              <p><strong>Recovery:</strong> ${escapeHtml(cell.recoveryAndDataPreservation)}</p>
            </div>
          </details>`,
            )
            .join("")}
        </div>
      </div>
    </section>

    <section id="decision">
      <div class="shell">
        <h2>A/B/C 결정</h2>
        <p class="section-copy">시각 통일만으로는 저장 identity가 해결되지 않는다. data contract를 전면 rewrite할 필요도 없다.</p>
        <div class="grid-3">
          ${alternatives
            .map(
              (option) => `<article class="panel option ${option.decision === "recommended" ? "recommended" : ""}">
            <p class="kicker">OPTION ${option.id} · ${option.decision}</p>
            <h3>${escapeHtml(option.name)}</h3>
            <p>${escapeHtml(option.description)}</p>
            <div class="score">${option.weightedScore}/5</div>
            <p><strong>장점:</strong> ${escapeHtml(option.strengths.join(", "))}</p>
            <p><strong>위험:</strong> ${escapeHtml(option.weaknesses.join(", "))}</p>
          </article>`,
            )
            .join("")}
        </div>
      </div>
    </section>

    <section>
      <div class="shell">
        <h2>Current vs proposed anatomy</h2>
        <div class="grid-2">
          <div>
            <p class="kicker">CURRENT · entry가 object를 결정</p>
            <div class="wireframe">
              <div class="wf-bar">Home / Find / URL</div>
              <div class="wf-row">
                <div class="wf-box wf-danger">각자 다른 title/count</div>
                <div class="wf-box wf-danger">각자 다른 detail shell</div>
              </div>
              <div class="wf-box wf-danger" style="margin-top:8px">slug별 저장 + 서로 다른 receipt</div>
              <div class="wf-box" style="margin-top:8px">My Flow에 중복 행</div>
            </div>
          </div>
          <div>
            <p class="kicker">PROPOSED · entry는 context만 전달</p>
            <div class="wireframe">
              <div class="wf-bar">Home / Find / URL context</div>
              <div class="wf-row">
                <div class="wf-box">source + job + variant resolver</div>
                <div class="wf-box wf-primary">동일 canonical Flow preview</div>
              </div>
              <div class="wf-box wf-primary" style="margin-top:8px">one save identity + shared receipt</div>
              <div class="wf-box" style="margin-top:8px">P32 My Flow / Calendar 유지</div>
            </div>
          </div>
        </div>
        <div class="grid-2" style="margin-top:18px">
          <div class="wireframe">
            <p class="kicker">390px</p>
            <div class="wf-box">entry context 한 줄 · source link</div>
            <div class="wf-box wf-primary" style="margin-top:8px">Flow title · 실제 item count · primary artifact</div>
            <div class="wf-box" style="margin-top:8px">작동하는 secondary control만</div>
            <div class="wf-box" style="margin-top:8px">최소 anchor / 조정</div>
            <div class="wf-bar" style="margin-top:8px">24개 Calendar로 저장</div>
          </div>
          <div class="wireframe">
            <p class="kicker">1024/1440px</p>
            <div class="wf-row">
              <div class="wf-box">entry/source rail<br>saved signal</div>
              <div class="wf-box wf-primary">전체 artifact preview<br>item count/version</div>
            </div>
            <div class="wf-row">
              <div class="wf-box">contextual adjustment</div>
              <div class="wf-box">receipt → P32 focused workspace</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="p33">
      <div class="shell">
        <h2>P33 실행 순서</h2>
        <p class="section-copy">먼저 read-only identity gate를 만든 뒤, AJD 한 개 vertical slice로 결정하고, 그 다음에만 새 canonical write를 연다.</p>
        ${p33Slices
          .map(
            (slice) => `<article class="slice">
          <div><span class="tag">${slice.id}</span></div>
          <div><h3>${escapeHtml(slice.name)}</h3><p>${escapeHtml(slice.problem)}</p><p class="kicker">DEPENDS: ${escapeHtml(slice.dependency.join(", ") || "none")} · TEST: ${escapeHtml(slice.testMarker.join(", "))}</p></div>
        </article>`,
          )
          .join("")}
      </div>
    </section>

    <section>
      <div class="shell">
        <h2>보존할 계약</h2>
        <div class="grid-2">
          <div class="panel"><h3>Keep</h3><p>P32 focused My Flow, 4탭 IA, public /f shell, source provenance, undated item model, reversible completion, whole/selected/current export scope.</p></div>
          <div class="panel"><h3>Do not merge</h3><p>source, personal overlay, execution run, recurrence occurrence, export identity. 특히 24개와 5개 item state를 index/title 유사도로 합치지 않는다.</p></div>
        </div>
      </div>
    </section>
  </main>
  <footer>
    <div class="shell">Production/current source independent review · observed users 0 · app code 변경 없음 · commit/push/PR/merge/deploy 없음</div>
  </footer>
</body>
</html>
`;

writeText("review.html", reportHtml);

console.log(
  JSON.stringify(
    {
      outputDir,
      files: [
        "README.md",
        "audit.md",
        "review.html",
        "cross-entry-invariant-matrix.json",
        "persona-journey-scorecard.json",
        "alias-storage-impact.json",
        "decision-matrix.json",
        "p33-recommendation.md",
        "verification.json",
      ],
      scoreSummary,
    },
    null,
    2,
  ),
);
