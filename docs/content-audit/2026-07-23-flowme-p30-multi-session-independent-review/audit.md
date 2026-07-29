# P30 독립 UX 및 구현 계약 감사

## 판정

Architecture verdict: `bounded_revision`

Interaction complexity verdict: `coordinated_simplification_required`

현재 P30의 data contract와 4탭 IA는 전면 재설계 대상이 아니다. 사용자가 public Flow를 확인하고, 조정하고, receipt를 거쳐 My Flow와 Calendar에서 실행하며, 범위를 정해 export하는 주 흐름은 production에서 이어졌다.

그러나 기능 지원과 사용 용이성은 분리해야 한다. 24개 cell 중 11개가 설명 없이 이해되기 어려웠고, 지정 시나리오의 interaction depth는 합계 191회였다. 모바일 save-before는 primary save까지 Tab 16회가 필요했고, 펼친 My Flow는 74~90개의 focusable control을 가졌다. 날짜 precedence와 lifecycle 결함을 고치는 것만으로는 충분하지 않으며, 저장 전·My Flow·Calendar의 기본 노출과 command hierarchy를 함께 줄여야 한다.

## Blocking

### B-01 최신 item 날짜가 Calendar와 export에서 무시된다

- Route: `/f/moving-d30-basic -> /my -> /calendar`
- Viewport: `390x844`
- 재현:
  1. 저장 전 조정에서 첫 항목 날짜를 `2026-08-01`로 고정하고 저장한다.
  2. My Flow item editor에서 같은 항목 날짜를 `2026-08-03`으로 바꾼다.
  3. Calendar 8월과 whole Calendar export를 확인한다.
- 기대: 사용자가 마지막으로 저장한 `2026-08-03`이 My Flow, Calendar, ICS에서 동일해야 한다.
- 실제: localStorage의 execution date override에는 `2026-08-03`이 저장됐지만 Calendar에는 `2026-08-01` 이벤트가 남았고 `2026-08-03` 이벤트는 0개였다. whole ICS 첫 이벤트도 `DTSTART;VALUE=DATE:20260801`이었다. 최신 제목과 메모는 반영돼 한 이벤트 안에서도 provenance가 섞였다.
- 사용자 영향: 사용자가 외부 Calendar에 잘못된 날짜를 가져갈 수 있다. portable execution layer의 핵심 신뢰 계약을 깨뜨린다.
- EvidenceKind: `current_production_interaction`, `current_browser_automation`, `current_source`
- Source evidence:
  - `components/flow/AppClient.tsx:18314`에서 save-before 날짜를 item draft에도 저장한다.
  - `components/flow/AppClient.tsx:18319`에서 별도 date override는 삭제한다.
  - `lib/flow/my-flow-personal-state.ts:91`의 resolver는 `draft`를 `execution_override`보다 먼저 선택한다.
- 권장 변경: effective date precedence를 `명시적 제거 -> 최신 execution override -> personal/save-before overlay -> source`로 단일화한다. save-before 날짜와 저장 후 실행 날짜를 같은 의미로 중복 저장하지 말고 기존 localStorage record를 읽을 때도 안전하게 normalize한다.
- Acceptance marker:
  - Unit: save-before draft date와 post-save date override가 동시에 있을 때 post-save 값 선택
  - E2E: `P31-EFFECTIVE-DATE-PRECEDENCE`
  - Screenshot: My Flow, Calendar, export receipt에 같은 `2026-08-03`
  - Export: ICS, TSV, checklist/memo의 날짜와 title identity parity

## High

### H-00 공통 surface가 수행 가능하지만 설명 없이 쉽지 않다

- Route: `/f/moving-d30-basic`, `/my`, `/calendar`, `/flows` 및 24개 journey route
- Viewport: `390x844`, `1024x768`, 핵심 화면 `1440x900`
- 재현:
  1. 처음 온 사용자는 save-before에서 전체 Flow, 날짜 방식, artifact 결과, 조정, 저장 중 다음 행동을 고른다.
  2. 재방문 사용자는 My Flow에서 다음 행동, 전체 계획, item 수정, 일괄 조정, export, 회고, source correction, 재사용, 관리를 구분한다.
  3. Calendar에서 Flow scope, 날짜 탐색, selected-day agenda, 날짜 없는 tray, batch 배치를 구분한다.
- 기대: 각 frame은 하나의 사용자 질문과 하나의 primary action을 먼저 제공하고, 고급 기능은 필요할 때만 나타나야 한다.
- 실제:
  - 24개 cell 중 `explanationFree=true`는 13개, 설명 의존 cell은 11개였다.
  - 지정 시나리오 interaction depth는 191회, cell당 평균 7.96회였다.
  - 모바일 save-before에서 save primary까지 keyboard Tab 16회가 필요했다.
  - 펼친 My Flow의 focusable control은 74~90개였다.
- 사용자 영향: 기능을 찾을 수 있어도 사용자는 저장할지, 조정할지, 현재 실행을 바꿀지, 새 실행을 만들지 판단하기 위해 화면 구조보다 설명을 읽게 된다. Obsidian, 메모장, 기존 todo/calendar 사용자 기준선보다 학습 비용이 높다.
- EvidenceKind: `current_production_interaction`, `current_browser_automation`, `heuristic_simulation`
- 해석 제한: interaction depth는 지정된 자동화 시나리오 합계이며 실제 사용자의 최적 경로나 체감 난이도 측정값은 아니다. `observedUserCount=0`이다.
- 권장 변경:
  - save-before 기본값: 실제 전체 결과, 필수 입력 0~1개, primary action 1개
  - My Flow 기본값: 다음 행동, 진행률, 전체 Flow 열기. 수정·export·회고·source correction·재사용·관리는 문맥별 disclosure
  - Calendar 기본값: 선택 날짜 agenda. Flow 범위와 날짜 없는 batch 배치는 별도 mode/sheet
  - item quick edit: 완료, 제목, 날짜. 시간·duration·메모·출처는 상세 편집
  - 설명 문단을 추가하지 않고 hierarchy, command placement, direct manipulation으로 해결
- Acceptance marker:
  - 설명 없이 수행 가능한 cell `13/24 -> 20/24 이상`
  - 일반 next action surface 진입 후 2 tap/click 이내
  - 첫 viewport의 경쟁 primary action 1개 이하
  - save primary keyboard 도달 8 Tab 이내 또는 동등한 skip/group navigation
  - 390/1024에서 고급 control group 기본 접힘, overflow/fixed overlap 0

### H-01 조정 저장한 public Flow는 실행 중 전체 기준일을 바꿀 수 없다

- Route: `/f/moving-d30-basic -> /my`
- Viewport: `390x844`, `1024x768`
- 재현:
  1. public save-before에서 제목, 항목 포함 여부, 이사일을 조정해 저장한다.
  2. My Flow 전체 Flow를 연다.
  3. 현재 실행의 이사일 또는 개인 설정 진입점을 찾는다.
- 기대: 개인 사본의 현재 실행을 유지한 채 저장 이름, 기준일, 포함 항목을 다시 조정할 수 있다.
- 실제: 개별 item 편집은 가능하지만 `my-flow-personal-copy-settings-open`과 `my-flow-direct-anchor-settings-open`이 모두 렌더링되지 않았다. 측정값은 각각 0개였다.
- 사용자 영향: 이사일이 바뀌면 사용자는 새 실행을 만들거나 여러 날짜를 개별 수정해야 한다. 저장 전과 저장 후의 개인화 문법이 끊긴다.
- EvidenceKind: `current_production_interaction`, `current_browser_automation`, `current_source`
- Source evidence: `components/flow/AppClient.tsx:3896`과 `components/flow/AppClient.tsx:3900`의 eligibility가 `/f` 조정 저장 결과를 설정 가능한 개인 사본이나 direct saved map으로 인정하지 않는다.
- 권장 변경: public `/f` adjustment receipt가 만든 저장 객체에 기존 personal settings UI를 재사용할 수 있는 명시적 capability를 부여한다. 전체 편집기로 확장하지 않는다.
- Acceptance marker: `P31-PUBLIC-COPY-SETTINGS`, 현재 실행의 새 기준일과 fixed date 처리 결과를 저장 전 preview로 표시, 390/1024 screenshot.

### H-02 날짜 없는 Flow를 새 실행으로 재사용하려면 날짜를 강제로 입력해야 한다

- Route: `/f/vehicle-inspection-prep -> /my`
- Viewport: `1024x768`
- 재현:
  1. 차량 점검 Flow를 날짜 없이 저장하고 완료한다.
  2. `새 실행으로 다시 쓰기`를 연다.
  3. 날짜를 입력하지 않고 새 실행을 시작한다.
- 기대: 원래처럼 날짜 없는 실행으로 다시 시작하거나, 선택적으로 검사일을 정할 수 있어야 한다.
- 실제: 날짜 input 1개가 나타났고 날짜 없는 선택은 없었다. 날짜 미입력 시 `검사일을 선택해 주세요` 검증으로 막혔다. `2026-09-15`를 입력한 뒤에야 past run 1개를 보존하고 새 실행을 만들었다.
- 사용자 영향: 날짜 없는 항목이 유효하다는 P30 원칙이 재사용 순간 깨지고 사용자가 임의 날짜를 만들어야 한다.
- EvidenceKind: `current_production_interaction`, `current_browser_automation`, `current_source`
- Source evidence: `components/flow/AppClient.tsx:8033`의 `requiresAnchor`가 saved map anchor/setupInput을 포함하고, `components/flow/AppClient.tsx:13928`에서 required context면 date input만 제공한다.
- 권장 변경: `날짜 없이 다시 시작`과 `검사일 정하기`를 같은 reuse preview 안에서 선택하게 한다. 날짜 없는 선택은 항목을 tray로 유지하고 과거 run을 보존한다.
- Acceptance marker: `P31-UNDATED-REUSE`, 날짜 없는 새 run, 선택 날짜 새 run 두 경로, past-run preservation unit/E2E, 390/1024 screenshots.

### H-03 내부 발견과 public route가 같은 사용자 job을 다른 Flow 객체로 보여준다

- Route: `/flows?query=이사`, `/flow-maps/moving-d30`, `/f/moving-d30-basic`
- Viewport: `390x844`
- 재현:
  1. `/flows`에서 `이사`를 검색한다.
  2. 검색 결과 링크와 항목 수를 확인한다.
  3. 검토 대상 public `/f/moving-d30-basic`과 비교한다.
- 기대: 같은 사용자 job을 찾으면 public, save-before, receipt, My Flow, Calendar로 이어지는 canonical Flow object 또는 명확한 variant 선택이 보여야 한다.
- 실제: 검색 결과는 `/flow-maps/moving-d30`의 5개 할 일이다. 검토한 public route는 24개 항목이고 검색 결과나 map 화면에서 해당 `/f`로 이어지는 링크가 없었다.
- 사용자 영향: 외부 링크로 본 Flow와 앱 안에서 찾은 Flow가 서로 다른 범위와 identity를 가져, 저장 단위와 재사용 대상을 예측하기 어렵다.
- EvidenceKind: `current_production_interaction`, `current_browser_automation`
- 권장 변경: canonical representative를 하나 정하거나 map에 명시적 public variant bridge를 둔다. 4탭 IA와 lookup contract는 다시 열지 않는다.
- Acceptance marker: `P31-DISCOVERY-CANONICAL-BRIDGE`, `/flows` 결과에서 5개 map과 24개 public Flow의 관계, 범위, 이동 action이 설명문 없이 보이는 390/1024 screenshot.

### H-04 dependency security audit가 현재 main에서 실패한다

- Route: repository release gate
- Viewport: 해당 없음
- 재현: `npm.cmd run security:audit`
- 기대: production dependency audit가 release 기준을 통과하거나 명시된 예외와 업데이트 계획이 있어야 한다.
- 실제: Next.js `15.5.20` high advisory와 PostCSS moderate advisory로 2개 vulnerability가 보고됐다. force fix는 현재 pinned range 밖의 framework 변경을 요구한다.
- 사용자 영향: 즉시 관찰되는 UX 결함은 아니지만 다음 production release 전에 별도 보안 판단이 필요하다.
- EvidenceKind: `current_command`
- 권장 변경: P31 UX scope와 분리된 release engineering gate에서 최소 안전 버전, Next patch regression, build/full E2E를 검증한다.
- Acceptance marker: security audit pass 또는 승인된 temporary exception 문서와 만료일. 이번 검토에서는 dependency를 바꾸지 않았다.

### H-05 모바일 홈과 Flow 찾기가 같은 탐색 역할을 반복한다

- Route: `/`, `/flows`
- Viewport: `390x844`
- 재현:
  1. 홈에서 URL·메모 진입과 추천 Flow 2개를 확인한다.
  2. 하단 `Flow 찾기`를 누른다.
  3. 같은 URL·메모 진입과 같은 anatomy의 Flow 카드 9개를 비교한다.
- 기대: 홈은 처음 온 사용자에게 FlowMe의 실제 변환 가치를 보여주거나, 재방문 사용자에게 지금 이어갈 실행 맥락을 제공해야 한다. Flow 찾기는 검색·탐색을 소유해야 한다.
- 실제: 홈은 Flow 찾기 카탈로그의 축약판처럼 보이며 저장 전·저장 후 사용자에 따른 역할 차이가 없다.
- 사용자 영향: 네 개 하단 탭 중 두 개의 구분이 약해지고, 재방문 사용자가 홈에서 바로 이어서 실행할 이유가 없다.
- EvidenceKind: `current_production_interaction`, `current_package_screenshot`, `heuristic_simulation`, `reference_pattern`
- Reference pattern:
  - Todoist Today는 여러 프로젝트의 오늘 일을 모으고 탐색은 Browse/Search가 맡는다.
  - Notion Home은 최근 맥락, shortcut, 일정, My Tasks를 모으고 전체 탐색은 Search/Library/Marketplace로 분리한다.
  - Strava feed는 활동 종류에 맞는 핵심 통계와 한 가지 성취를 보여주며 전체 속성을 카드에 나열하지 않는다.
- 권장 변경:
  - 처음 온 사용자: `원문 -> 최소 입력 -> 실제 결과 -> 내 도구` 사용 사례 2~3개
  - 재방문 사용자: 오늘 이어갈 항목 1~3개, 최근 Flow, 날짜 없는 할 일 요약
  - 최근/인기 Flow와 카테고리는 `/flows`에 유지
  - 실제 usage/review 계약 전에는 가상 social proof를 production에 표시하지 않음
- Acceptance marker: `P31-02-HOME-ROLE`, first/returning fixture의 390/1024 screenshot, 홈과 `/flows`의 동일 카드 반복 0, 첫 viewport primary action 1개 이하.

### H-06 콘텐츠별 저장 전 흐름이 같은 control 묶음에 눌려 결과 선택과 다음 행동이 불명확하다

- Route: `/f/curated-wedding-naver-timeline`, `/f/wedding-d180-basic`, `/f/curated-allblanc-morning-workout`
- Viewport: `390x844`
- 재현:
  1. 결혼 Flow에서 Calendar, Checklist, Memo를 번갈아 누른다.
  2. `날짜 정하기`, `날짜 없이`, `예시만 보기`를 바꾸고 primary action을 확인한다.
  3. `Flow 가져가기`와 그 안의 `이 Flow 통째로 가져가기 · 형식 보기`를 연다.
  4. 홈트 Flow에서 반복 설정을 열고 결과 탭, 다음 3회, 전체 구조, 저장 action을 비교한다.
- 기대: 콘텐츠에 가장 자연스러운 결과 하나를 먼저 제안하고, 사용자가 선택한 결과에 필요한 최소 입력과 결과별 action이 바로 이어져야 한다. export 전에는 count, 예시, 손실을 예측할 수 있어야 한다.
- 실제:
  - 결혼 Flow의 세 artifact가 동등한 탭으로 보이지만 선택이 저장 destination이나 primary action으로 이어지지 않는다.
  - 날짜 mode를 바꿔도 뒤에서 무엇이 저장되는지 한 단계로 확인하기 어렵다.
  - export는 중첩 disclosure 뒤 format action을 바로 실행하며 실제 출력 preview가 없다.
  - `전체 Flow 구조`가 artifact 항목을 다시 나열한다.
  - 한 항목짜리 홈트도 세 artifact, 세 date mode, 반복 설정, 다음 3회, 전체 구조, 조정, export를 제공한다. 기본 `scrollHeight=1353`, interactive 24개에서 반복 설정 후 `1703`, 33개로 늘었다.
- 사용자 영향: 사용자는 결혼 일정과 운동 루틴의 내용 차이보다 공통 workbench의 사용법을 먼저 배워야 한다. 선택한 결과와 최종 저장/export 결과를 예측하기 어렵다.
- EvidenceKind: `current_production_interaction`, `current_package_screenshot`, `heuristic_simulation`, `reference_pattern`
- 권장 변경:
  - 결혼: `Calendar 타임라인 12개`를 primary로 두고 결혼식 날짜 하나를 바로 연결. 다른 결과는 `다른 방식 2개`로 접기
  - 운동: 일정 미정이면 `My Flow에서 운동 시작`, 요일·시간을 정하면 `반복 일정 1개 · 다음 3회 확인`으로 action과 eligibility 변경
  - `전체 Flow 구조`를 별도 중복 목록으로 두지 않고 선택 artifact가 전체 Flow를 단계별로 보여주게 함
  - export 전 scope, count, 예시 2개, 손실을 확인
- Acceptance marker:
  - `P31-02-CONTEXTUAL-ARTIFACT`
  - `P31-02-EXPORT-PREVIEW`
  - 결혼/운동 각각 primary 1개, secondary 최대 2개
  - artifact 선택 뒤 CTA label과 count가 실제 projection과 일치
  - 설정 전후 routine series/occurrence label screenshot

### H-07 모바일 My Flow 상세가 목록 안에 큰 workspace로 펼쳐져 실행과 관리가 한 화면에 누적된다

- Route: `/my?demo=ux20&view=flows`
- Viewport: `390x844`
- 재현:
  1. 27개 Flow 목록에서 `결혼 준비 타임라인`을 연다.
  2. 다음 할 일, 전체 Flow, 일괄 조정, 가져가기, 진행률, 관리까지 이동한다.
  3. 목록으로 돌아가거나 다른 Flow로 이동할 문맥을 확인한다.
- 기대: 목록은 탐색 역할을 유지하고, Flow를 열면 한 Flow의 실행에 집중하는 dedicated mobile workspace로 전환되어야 한다.
- 실제: compact 목록은 이해 가능하지만 선택한 Flow가 같은 탭 안에서 인라인 확장된다. 열린 상태는 `scrollHeight=1702`, interactive 30개, 첫 viewport 19개이며 header, 다음 행동, 12개 전체 Flow와 7단계, batch, export, progress, management가 한 세로 surface에 이어진다.
- 사용자 영향: 사용자가 지금 한 항목을 실행하는 중인지, 전체 계획을 보는 중인지, Flow를 관리하는 중인지 구분하기 어렵다. 목록과 상세의 back-stack도 약하다.
- EvidenceKind: `current_production_interaction`, `current_package_screenshot`, `current_source`, `heuristic_simulation`
- 권장 변경:
  - `지금 | Flow 목록 | 완료`는 유지
  - Flow row를 누르면 목록 인라인 확장 대신 dedicated mobile Flow workspace로 전환
  - workspace 내부 상위 mode는 `실행 | 전체 계획 | 기록`
  - `조정`, `가져가기`, `다시 쓰기`, `관리`는 contextual menu 또는 sheet
  - item detail은 bottom sheet 또는 full-screen detail
- Acceptance marker: `P31-03-MOBILE-WORKSPACE`, Flow 목록과 열린 상세의 동시 인라인 누적 0, back 후 검색·scroll 유지, 일반 next action 2 tap 이내, 390 screenshot.

### H-08 Flow lifecycle가 숨겨져 있고 모바일 보관 복구 경로가 끊긴다

- Route: `/my?demo=ux20&view=flows`
- Viewport: `390x844`, 비교 `1024x768`
- 재현:
  1. `결혼 준비 타임라인`을 연다.
  2. 상세 최하단까지 내려가 `더보기 -> 보관하기`를 누른다.
  3. 8초 lifecycle undo가 사라진 뒤 `보관됨` filter를 연다.
  4. 보관된 Flow 행을 누른다.
- 기대: 보관 행에서 직접 복구하거나 복구 가능한 상세로 이동해야 한다.
- 실제:
  - 모바일은 행을 눌러도 같은 목록에 머물고 `복구하기`가 나타나지 않았다.
  - 와이드는 첫 보관 Flow를 오른쪽 canvas에 표시해 상세 최하단 `더보기 -> 복구하기`에 도달할 수 있었다.
  - `데이터 관리`는 백업과 불러오기만 제공하고 Flow 삭제·복구 관리는 제공하지 않는다.
- 사용자 영향: 모바일 사용자가 짧은 undo 시간을 놓치면 자신이 보관한 Flow를 제품 UI에서 복구할 수 없다. `삭제`를 찾는 사용자는 보관과 영구 삭제의 차이도 알 수 없다.
- EvidenceKind: `current_production_interaction`, `current_source`, `fixture_only`, `heuristic_simulation`
- Source:
  - `components/flow/AppClient.tsx:5739-5750`
  - `components/flow/AppClient.tsx:7450-7480`
  - `components/flow/AppClient.tsx:14673-14681`
  - `components/flow/AppClient.tsx:14969-15000`
- 권장 변경:
  - dedicated Flow workspace header의 predictable overflow에 `보관` 배치
  - 모바일·와이드 보관 목록의 행마다 직접 `복구` 제공
  - archive -> reload -> restore를 양 viewport에서 같은 state transition으로 구현
  - Calendar에서는 Flow lifecycle를 중복하지 않고 `Flow에서 열기`로 연결
- Acceptance marker: `P31-03-ARCHIVE-RESTORE-PARITY`, `P31-03-MOBILE-ARCHIVED-DIRECT-RESTORE`, 390/1024 archive-reload-restore E2E와 screenshot.

### H-09 완료·제외·보관·삭제의 사용자 동사와 데이터 의미가 일치하지 않는다

- Routes: `/my`, `/calendar`, 개인 초안 item editor
- Viewport: `390x844`, `1024x768`
- 재현:
  1. Item 완료/reopen, 날짜 제거, source-backed Item 제거, 개인 초안 Item 제거를 비교한다.
  2. Flow-level 관리와 `데이터 관리`를 확인한다.
  3. source의 `removeSavedFlow` call site를 확인한다.
- 기대: 실행 상태, 일정, 개인 구성, 개인 초안 구조, Flow lifecycle가 서로 다른 동사와 복구 위치를 사용해야 한다.
- 실제:
  - `목록에서 빼기`가 source-backed Item의 개인 제외, 개인 draft Item의 삭제, subcheck, resource에 반복된다.
  - Flow-level 영구 삭제 UI는 없다.
  - `removeSavedFlow`는 `components/flow/AppClient.tsx:8329`에 정의돼 있지만 렌더링된 호출 지점이 없다.
  - `clearFlowLocalProgress`는 여러 local record를 지우지만 archive slug와 source-backed/personal-draft 사용자 계약은 별도로 정의돼 있지 않다.
- 사용자 영향: 사용자가 원본이 지워지는지, 내 사본에서만 빠지는지, 현재 실행만 바뀌는지 실행 전에 예측하기 어렵다.
- EvidenceKind: `current_source`, `current_production_interaction`, `heuristic_simulation`
- 권장 변경:
  - 실행: `완료 / 다시 열기`
  - 일정: `날짜 정하기 / 날짜 없애기`
  - source-backed 구성: `Flow에서 제외 / 다시 포함`
  - 개인 초안 구조: `항목 삭제 / 항목 복구`
  - Flow lifecycle: `보관 / 복구 / 이 기기에서 영구 삭제`
  - 영구 삭제는 보관된 Flow의 danger zone에만 두고 source-backed 공개 원본 보존과 개인 데이터 삭제 범위를 confirmation에 명시
- Acceptance marker: `P31-03-FLOW-LIFECYCLE-GRAMMAR`, `P31-05-PERMANENT-DELETE-CONTRACT`, action vocabulary snapshot과 delete-reload-source-rediscovery E2E.

## Medium

### M-01 save-before 조정 취소 후 키보드 focus가 호출 위치로 돌아오지 않는다

- Route: `/f/moving-d30-basic`
- Viewport: `390x844`
- 재현: Tab으로 `조정`까지 이동, Enter로 열기, 조정 영역에서 `취소`를 키보드로 실행한다.
- 기대: 조정이 닫히고 focus가 `조정` 호출 버튼으로 복귀한다.
- 실제: 조정 영역 focus 진입과 explicit cancel은 성공했지만 `focusReturnedAfterCancel=false`였다. Escape는 inline frame을 닫지 않았다.
- 사용자 영향: 키보드와 스크린리더 사용자가 취소 후 문맥을 잃고 다시 긴 focus 순서를 탐색한다.
- EvidenceKind: `current_production_interaction`, `current_browser_automation`
- 권장 변경: 호출 요소 ref를 보존하고 close 후 focus를 복귀시킨다. inline frame에서 Escape를 지원할지는 명시적으로 결정한다.
- Acceptance marker: `P31-ADJUSTMENT-FOCUS-RETURN`, keyboard-only screenshot/trace, accessible status announcement.

### M-02 개인 메모 초안의 private 경계는 안전하지만 약하게 표시된다

- Route: `/flows -> /my -> /calendar`
- Viewport: `390x844`, `1024x768`
- 재현: 여행 메모를 5개로 분할해 저장, 6개로 편집, reload, Calendar와 export를 확인한다.
- 기대: 변경 내용이 유지되고 공유 Flow가 아니라 이 기기의 개인 초안이라는 점을 조용히 알 수 있다.
- 실제: 6개 항목과 날짜/export parity는 유지됐고 공유 action도 없었지만 개인 사본 badge는 관찰되지 않았다.
- 사용자 영향: 사용자가 초안이 공개됐다고 오해하거나 반대로 어디까지 개인 데이터인지 확신하지 못할 수 있다.
- EvidenceKind: `current_production_interaction`, `current_browser_automation`, `heuristic_simulation`
- 권장 변경: 별도 기능 추가 없이 title metadata 영역에 `이 기기의 개인 초안` 상태를 한 번만 표시한다. 실제 사용자 관찰 전 P31 필수로 승격하지 않는다.
- Acceptance marker: defer candidate, copy review only.

### M-03 대량 Calendar 검증은 fixture capability 증거이지 실제 scale 증거가 아니다

- Route: `/calendar?demo=ux20`, `/calendar?demo=ux50`
- Viewport: `390x844`, `1024x768`
- 재현: 50개 fixture에서 검색, 2개 Flow 선택, 같은 날짜 identity, 날짜 없는 batch와 undo를 확인한다.
- 기대: 실제 사용자가 저장한 20~60개 Flow에서도 같은 탐색성과 성능을 유지한다.
- 실제: fixture에서는 지원됐지만 fixture는 reload 때 재생성되며 실제 장기간 축적 localStorage와 동일하지 않다.
- 사용자 영향: capability는 확인했지만 real-data scale의 지연, 오래된 개인 overlay, 검색 품질은 아직 모른다.
- EvidenceKind: `fixture_only`, `heuristic_simulation`
- 권장 변경: 구현 backlog로 만들지 않고 실제 사용자 관찰 또는 production-like seeded persistence gate로 남긴다.
- Acceptance marker: actual-user-only question 또는 별도 scale benchmark.

### M-04 200% CSS zoom 측정은 overflow를 보였지만 접근성 실패로 단정할 수 없다

- Route: `/calendar`
- Viewport: `390x844`, CSS `zoom: 200%`; 별도 `320 CSS px`
- 재현: Calendar에서 CSS zoom을 200% 적용하고 overflow를 측정한 뒤 320 CSS px reflow와 비교한다.
- 기대: 실제 브라우저 확대와 좁은 viewport에서 조작 가능해야 한다.
- 실제: CSS zoom heuristic에서는 106px overflow가 있었으나 320 CSS px에서는 0이었다. visible focusable에 accessible name 누락은 없었다.
- 사용자 영향: 실제 OS/브라우저 확대 문제인지 자동화 방식의 한계인지 확정되지 않았다.
- EvidenceKind: `current_browser_automation`, `heuristic_simulation`
- 권장 변경: WCAG 실패나 P31 기능으로 선언하지 말고 실제 browser zoom/assistive tech gate에서 재검증한다.
- Acceptance marker: manual browser zoom evidence, not CSS transform alone.

### M-05 Flow 찾기 카드의 source, metadata, action 우선순위가 약하다

- Route: `/flows`
- Viewport: `390x844`
- 재현: Flow 카드 9개의 source, 대표 항목, chip과 하단 action을 비교한다.
- 기대: 클릭 전에 무엇을 얻는지, 원문이 무엇인지, 저장 단위가 어느 정도인지 빠르게 판단할 수 있어야 한다.
- 실제: 각 카드가 카테고리, 할 일 수, 제목, 원문 문자열, 번호가 붙은 대표 항목 3개, 조건·결과 chip, `Flow 열기`를 반복한다. 카드 전체가 이미 link인데 하단 action이 같은 목적지를 반복하고 원문은 별도 외부 link가 아니다.
- 사용자 영향: 카드 간 차이보다 반복 metadata가 먼저 읽히며 source를 검증하려면 상세로 들어가야 한다.
- EvidenceKind: `current_production_interaction`, `current_package_screenshot`, `heuristic_simulation`
- 권장 변경:
  - source 이름을 외부 링크로 제공
  - 제목 아래 `결혼식 날짜 기준 12개 Calendar 일정`처럼 결과 한 줄
  - 대표 항목은 번호 없이 1~2개만 표시
  - 카드 전체 tap을 유지하고 하단 `Flow 열기`는 제거하거나 `더보기`/chevron으로 축약
  - usage/review 수는 실제 telemetry, 기간, review eligibility와 moderation이 정의된 뒤에만 production에 추가. prototype synthetic value는 `시뮬레이션 데이터`로 표시
- Acceptance marker: `P31-02-DISCOVERY-CARD`, source link accessible name, 중복 destination action 0, 카드 기본 metadata 4종 이하, synthetic production metric 0.

### M-06 Calendar 모바일 항목 상세가 선택일 목록 안에 인라인으로 삽입된다

- Route: `/calendar?demo=ux20`
- Viewport: `390x844`
- 재현:
  1. 5월 28일을 선택한다.
  2. `필기와 실기 시험 범위 나누기 열기`를 누른다.
  3. 월간 grid, 선택일 agenda, 열린 상세와 다음 항목의 위치를 확인한다.
- 기대: 월간/선택일 맥락을 유지하면서 항목 상세를 별도 interaction layer에서 보고 닫은 뒤 원래 위치로 돌아와야 한다.
- 실제: 상세가 첫 항목 바로 아래 인라인으로 삽입된다. 열린 상태는 `scrollHeight=1644`, 월간 cell을 포함한 interactive 148개, 첫 viewport 47개였다. console message는 0이었다.
- 사용자 영향: 상세를 열 때 목록 높이가 바뀌고 다음 항목이 밀려, 달력 탐색과 항목 편집이 한 세로 흐름에서 경쟁한다.
- EvidenceKind: `current_production_interaction`, `current_package_screenshot`, `heuristic_simulation`, `reference_pattern`
- 권장 변경:
  - 모바일은 60% bottom sheet로 열고 필요하면 full-screen 확장
  - quick action은 완료/reopen, 날짜·시간, 메모
  - source, current-item export, 상세 설명은 접힌 고급 영역
  - 닫을 때 선택 날짜, scroll, focus 복귀
  - wide는 side inspector 유지
- Acceptance marker: `P31-04-ITEM-SHEET`, Escape/close/trigger focus, selected date와 scroll preservation, bottom nav overlap 0, 390/1024 screenshots.

## Low

### L-01 routine의 장기 occurrence history는 이번 여정에서 완전히 입증되지 않았다

- Route: `/f/curated-allblanc-morning-workout -> /calendar -> /my`
- Viewport: `390x844`, `1024x768`
- 재현: 반복 설정 저장, 한 회차 완료 후 reopen, 다음 3회와 ICS를 비교한다.
- 기대: series, current occurrence, 과거 occurrence history가 필요 수준만큼 구분된다.
- 실제: series 정의, 다음 3회, 개별 occurrence 완료/reopen, ICS RRULE은 일치했다. 완료를 되돌린 뒤 장기 이력 탐색은 확인하지 못했다.
- 사용자 영향: 현재 핵심 실행은 동작하지만 history 가치와 발견성은 아직 가정이다.
- EvidenceKind: `current_production_interaction`, `current_browser_automation`, `heuristic_simulation`
- 권장 변경: 구체 finding이 생기기 전 P31로 만들지 않는다.
- Acceptance marker: actual-user-only question.

## 검증과 제한

- Unit 584/584, build, P30 targeted 12/12, related E2E 41/41 통과
- 24 production journey cell 실행, console error 0, page error 0
- 390/1024 cell에서 기본 horizontal overflow 0
- full E2E는 이번 검토에서 실행하지 않음
- observed users 0
- app code, migration, dependency, commit, push, PR, deploy 변경 없음
