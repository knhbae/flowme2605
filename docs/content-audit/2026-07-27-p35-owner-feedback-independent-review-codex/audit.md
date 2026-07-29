# P35 독립 UX 감사

## 1. 검토 기준

- Preview: `https://flowme2605-n5o0dw81h-flowme.vercel.app`
  - Vercel 인증 화면으로 전환되어 interaction evidence를 확보하지 못했다.
- Production: `https://flowme2605.vercel.app`
- current source: `codex/p35-mece-ux-reset`, baseline
  `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- P35 interaction: 현재 미커밋 worktree를 build한 로컬 런타임
- viewport: 390x844, 1024x768
- observed-user count: 0

Evidence 우선순위는 local current candidate interaction/source, package screenshot,
Production 비교, reference pattern, heuristic simulation 순으로 사용했다.

## 2. Findings

Blocking finding은 없다.

### H01. Primary artifact 약속과 외부 가져가기 형식이 일치하지 않는다

- Severity: High
- Route: `/f/moving-d30-basic`
- Viewport: 390x844, 1024x768
- Persona / Flow shape: J01, calendar timeline
- 재현 단계:
  1. 이사 Flow를 연다.
  2. 첫 결과에서 `체크리스트 · 24개`를 확인한다.
  3. `Flow 가져가기`를 열고 whole Flow 형식을 확인한다.
- 기대: preview의 primary artifact인 체크리스트를 같은 24개 개인화 결과로 바로
  가져갈 수 있어야 한다.
- 실제: 날짜가 없을 때 Calendar는 비활성이고, 사용자에게 보이는 형식은
  `시트로 받기 24행`, `메모로 복사 24개`, `내 버전`이다. 체크리스트라는 이름과
  결과가 preflight에 없다. 같은 상태에서 preview heading은 `체크리스트 · 24개`,
  primary CTA는 `캘린더 24개로 시작`, summary는 예시 날짜 범위를 보여 주어 한
  frame 안에서도 artifact 약속이 셋으로 갈린다.
- 사용자 영향: 사용자는 preview에서 확인한 결과가 어디로 갔는지 알 수 없고,
  export 전에 결과 형식과 정보 손실을 예측할 수 없다.
- 원인 가설: public preview는 natural artifact projection을 쓰지만 public export는
  범용 `ArtifactWorkbench`의 export-only 형식 계약을 별도로 사용한다.
- 제안:
  - preview와 preflight가 하나의 artifact plan을 읽게 한다.
  - primary artifact 1개는 반드시 같은 이름과 count로 내보낼 수 있게 한다.
  - eligible secondary는 최대 2개만 보여 준다.
  - 형식 선택 전에 count와 빠지는 정보를 표시한다.
- Acceptance marker:
  - `previewArtifactId === preflightPrimaryArtifactId`
  - 5개 대표 shape에서 preview/export count parity
  - unsupported artifact control 0
  - screenshot `P35-R1-PUBLIC-ARTIFACT-PREFLIGHT-390`
- EvidenceKind:
  - `current_automated_test`
  - `current_source`
  - screenshot `12-moving-public-export-open-local-390.png`
  - screenshot `13-moving-public-export-formats-local-390.png`
- Source:
  - `components/flow/AppClient.tsx:17628`
  - `components/flow/AppClient.tsx:17658`

### H02. 저장 확인이 두 번 나타나고 두 번째 화면에서 4개 행동이 경쟁한다

- Severity: High
- Route: `/f/moving-d30-basic` -> `/my?savedFlow=moving-d30-basic`
- Viewport: 390x844
- Persona / Flow shape: J01, J02, J05
- 재현 단계:
  1. public Flow를 저장한다.
  2. receipt에서 항목 수, 날짜 범위, 출처를 확인한다.
  3. `내 Flow에서 시작`을 누른다.
- 기대: 짧은 저장 확인 뒤 개인 Flow 전체 결과와 다음 실행 단위를 한 화면에서
  확인해야 한다.
- 실제: public receipt 다음에 My Flow가 다시 `내 Flow에 저장됨`을 표시하고,
  `첫 할 일 시작`, `전체 Flow 보기`, `캘린더`, `가져가기` 네 행동을 보여 준 뒤
  전체 Flow를 이어 붙인다.
- 사용자 영향: 저장이 끝났는지, 전체 결과를 검토해야 하는지, 첫 항목을 바로
  실행해야 하는지 다시 결정해야 한다. 첫 viewport의 primary action도 하나가 아니다.
- 원인 가설: public saved receipt와 legacy post-save decision hub가 모두 유지됐다.
- 제안:
  - public receipt는 저장 이름, count, 날짜 범위, 출처만 확인한다.
  - primary는 `저장한 전체 Flow 보기` 하나로 둔다.
  - My Flow는 두 번째 receipt가 아니라 focused workspace를 바로 연다.
  - Calendar와 export는 Flow object menu 또는 workspace secondary command로 둔다.
- Acceptance marker:
  - receipt visible primary action 1개
  - My Flow 첫 화면에 중복 `저장됨` receipt 0개
  - 전체 계획과 shape-aware next unit이 같은 object frame에 표시
  - screenshot `P35-R3-SAVED-RECEIPT-390`
- EvidenceKind:
  - `current_automated_test`
  - `current_source`
  - screenshot `04-moving-receipt-local-390.png`
  - screenshot `05-moving-my-flow-first-local-390.png`
  - screenshot `28-memo-post-save-local-390.png`
- Source:
  - `components/flow/SavedFlowReceiptFrame.tsx:61`
  - `components/flow/PostSaveDecisionHub.tsx:104`
  - `components/flow/AppClient.tsx:12554`

### H03. 모바일 My Flow가 모든 콘텐츠를 같은 탭과 한 개 next row로 축약한다

- Severity: High
- Route: `/my?demo=ux20&view=flows`
- Viewport: 390x844, 1024x768
- Persona / Flow shape: J01-J04
- 재현 단계:
  1. 날짜형, 날짜 없는 checklist, routine Flow를 각각 연다.
  2. 모바일 `다음 행동`, `전체 계획`, `기록`을 비교한다.
  3. 같은 Flow를 1024px에서 연다.
- 기대:
  - 날짜형은 다음 날짜의 미완료 묶음
  - checklist는 다음 1~3개 또는 전체 목록
  - routine은 이번 occurrence
  - sheet는 현재 행
  - memo/guide는 인위적인 next task 없이 관련 section
- 실제: 모바일은 모든 shape에 같은 3탭을 쓰고 `getSavedFlowNextRow` 한 건을
  먼저 보여 준다. wide는 탭 없이 전체 계획과 진행 summary를 중심으로 구성돼
  같은 object의 정보 순서도 달라진다.
- 사용자 영향: 이사일 같은 날짜 맥락이 한 row로 끊기고, routine의 series와
  occurrence, sheet의 현재 위치가 `다음 행동`이라는 추상어 아래 숨는다.
- 원인 가설: responsive composition과 Flow shape projection이 별도로 설계됐다.
- 제안:
  - 고정 3탭을 제거한다.
  - mobile과 wide가 `object header -> shape-aware execution unit -> whole plan ->
    optional history`라는 같은 순서를 사용한다.
  - 레이아웃만 mobile stack과 wide rail/canvas/inspector로 다르게 한다.
- Acceptance marker:
  - 날짜형 same-date group identity가 Calendar selected day와 일치
  - routine current occurrence와 series summary 동시 표시
  - sheet current row와 전체 8개 progress 동시 표시
  - 390/1024 semantic order parity
  - screenshot `P35-R4-SHAPE-AWARE-NEXT-390-1024`
- EvidenceKind:
  - `current_automated_test`
  - `current_source`
  - screenshot `21-my-library-20-local-390.png`
  - screenshot `25-routine-workspace-local-1024.png`
  - screenshot `26-routine-workspace-local-390.png`
- Source:
  - `components/flow/AppClient.tsx:14546`
  - `components/flow/AppClient.tsx:14556`
  - `components/flow/AppClient.tsx:14632`

### H04. 저장 전 항목 조정이 포함 여부에 머물고 contextual edit가 없다

- Severity: High
- Route: `/f/moving-d30-basic`, `/f/vehicle-inspection-prep`,
  `/f/source-backed-middle-school-math-1`
- Viewport: 390x844, 1024x768
- Persona / Flow shape: J01, J02, J04
- 재현 단계:
  1. `Flow 조정`을 연다.
  2. `포함 항목`을 선택한다.
  3. 특정 row의 제목, 상세, 개별 날짜를 바꾸려 한다.
- 기대: row 하나를 열어 제목, 상세, 날짜만 개인 proposal로 바꾸고 결과를
  즉시 확인할 수 있어야 한다.
- 실제: 항목 row는 include checkbox, title, date label만 제공한다. 제목, 상세,
  날짜는 저장 후 Item detail의 `할 일 수정`에서만 바꿀 수 있다.
- 사용자 영향: 저장 또는 외부 export 전에 자신에게 맞는 결과인지 확신하기
  어렵다. 특히 날짜형 Flow의 예외 날짜를 저장 전에 확인할 수 없다.
- 원인 가설: P35가 full editor 회귀를 피하려고 include-only 범위를 택했지만,
  이미 존재하는 bounded Item editor를 save-before에 연결하지 않았다.
- 제안:
  - full editor는 만들지 않는다.
  - preview row에서 제목, 상세, 날짜만 수정하는 contextual sheet를 연다.
  - add/delete/reorder/repeat advanced는 저장 후 개인 Flow가 계속 소유한다.
  - source는 변경하지 않고 personal proposal에만 저장한다.
- Acceptance marker:
  - preview row에서 edit 진입 2 tap 이하
  - 한 번에 열린 editor 1개
  - source mutation 0
  - 저장 전 proposal과 저장 후 personal overlay parity
  - Escape와 focus return
- EvidenceKind:
  - `current_automated_test`
  - `current_source`
  - screenshot `03-moving-adjust-local-390.png`
  - screenshot `06-moving-item-detail-local-390.png`
- Source:
  - `components/flow/PublicFlowAdjustmentPanel.tsx:198`
  - `components/flow/AppClient.tsx:11234`

### H05. 메모 초안은 P35 공통 문법 대신 긴 full-form에 가깝다

- Severity: High
- Route: `/flows`
- Viewport: 390x844
- Persona / Flow shape: additional route check, memo personal draft
- 재현 단계:
  1. 여행 준비 메모를 입력한다.
  2. 다섯 항목 제안을 확인한다.
  3. 저장 전 control과 외부 destination을 찾는다.
- 기대: 제안된 실제 artifact를 먼저 보고 필요한 row만 contextual edit한 뒤,
  FlowMe 저장 또는 외부 가져가기를 선택해야 한다.
- 실제:
  - 문서 높이 1541px
  - input 14개
  - 다섯 row 제목 입력이 모두 펼쳐짐
  - artifact preflight와 외부 가져가기는 없음
  - primary는 `내 Flow에 초안 저장`
- 사용자 영향: source-backed Flow와 개인 메모가 서로 다른 제품처럼 느껴지고,
  P35가 줄인 설정 복잡도가 핵심 입력 경로에서 다시 나타난다.
- 원인 가설: memo draft composer가 P35 public result shell과 adjustment contract를
  재사용하지 않는다.
- 제안:
  - 메모 proposal도 actual artifact preview를 먼저 사용한다.
  - 기본은 결과 목록, row tap 시 한 항목 edit로 바꾼다.
  - 전체 제목과 첫 날짜는 compact quick values로 둔다.
  - primary artifact와 eligible external destination을 저장 전에 제공한다.
- Acceptance marker:
  - 첫 useful preview 전 필수 입력 0개
  - 첫 frame editable text field 2개 이하
  - row editor 1개만 open
  - preview/export/save count parity
  - screenshot `P35-R5-MEMO-PROPOSAL-390`
- EvidenceKind:
  - `current_automated_test`
  - screenshot `27-memo-draft-local-390.png`

### H06. 반복 Flow의 미리보기 날짜가 저장 결과로 확정되지 않는다

- Severity: High
- Route: `/f/curated-allblanc-morning-workout`
- Viewport: 390x844, 1024x768
- Persona / Flow shape: J03, routine occurrence
- 재현 단계:
  1. 시작일을 비운 채 홈트 Flow를 연다.
  2. `Flow 실행 · 1개` 미리보기의 날짜와 `월·수·금 · 계속 반복`을 확인한다.
  3. 그대로 저장하고 receipt, My Flow, Calendar, 가져가기를 확인한다.
- 기대: 미리보기 날짜가 예시라면 예시임이 명시되어야 하고, 저장 결과가 날짜에
  의존한다면 저장 전에 시작일을 확인받아야 한다.
- 실제:
  - 미리보기에는 날짜가 있는 반복 실행으로 보인다.
  - 저장 receipt와 My Flow는 `날짜 없음 1개`로 바뀐다.
  - 가져가기는 `캘린더 0개`가 되고 ICS를 만들 수 없다.
  - 시작일을 직접 입력한 여정에서는 Calendar에 날짜·시간·duration이 반영된다.
- 사용자 영향: 저장 전 artifact를 믿고 시작했는데 실제 개인 Flow와 외부 결과가
  달라진다. 반복 횟수와 occurrence가 1개 source Item count에 가려져 저장 결과를
  예측하기도 어렵다.
- 원인 가설: preview의 fallback start date와 personal routine schedule의 committed
  anchor가 서로 다른 상태 계약을 사용한다.
- 제안:
  - fallback date는 `예시`로 명시하고 저장 artifact count에 포함하지 않는다.
  - Calendar가 primary인 반복 Flow는 저장 직전에 시작일 확정을 요구한다.
  - receipt에는 source Item `1개`와 예정 회차 `8회`를 서로 다른 지표로 표시한다.
  - 개인 Flow에서는 `이번 회차`, `다음 3회`, `전체 반복 조건`을 같은 hierarchy로
    연결한다.
- Acceptance marker:
  - preview committed/provisional state marker
  - 시작일 미확정 시 Calendar event count를 0으로 예측
  - 시작일 확정 시 preview/receipt/My Flow/Calendar/ICS의 첫 날짜와 occurrence count parity
  - source Item count와 occurrence count를 별도 accessible label로 제공
  - screenshot `P35-R1-ROUTINE-COMMITTED-SCHEDULE-390`
- EvidenceKind:
  - `current_automated_test`
  - `current_source`
  - screenshot `43-workout-adjust-local-390.png`
  - screenshot `59-workout-default-receipt-local-390.png`
  - screenshot `61-workout-default-workspace-local-390.png`
  - screenshot `63-workout-default-export-local-390.png`

### M01. `기록` 탭이 독립 surface가 될 만큼 명확한 내용을 소유하지 않는다

- Severity: Medium
- Route: `/my?demo=ux20&view=flows`
- Viewport: 390x844
- Persona / Flow shape: J02, J03, J04
- 재현 단계: 새 Flow 또는 0개 완료 Flow를 열고 `기록`을 누른다.
- 기대: 실제 execution event history가 있으면 시간순으로 보이고, 없으면 고정
  탭을 차지하지 않아야 한다.
- 실제: 0/5 진행률과 “체크를 풀면 다시 열 수 있다”는 설명, 반복 export entry가
  주 내용이다. 완료 history, Item memo, run reflection, reuse의 경계도 화면 이름에
  드러나지 않는다.
- 사용자 영향: 사용자는 무엇을 기록하는 곳인지 알 수 없고, 빈 정보 때문에
  Flow의 plan과 execution이 한 단계 더 분리된다.
- 제안:
  - 고정 탭 제거
  - event가 있을 때만 `진행 기록` disclosure 제공
  - Item memo는 Item detail
  - run reflection은 완료 문맥
  - reuse는 Flow 관리
- Acceptance marker:
  - 새 Flow record tab 0개
  - completion/reopen/skip/hold event만 history에 표시
  - Item memo 중복 0개
- EvidenceKind:
  - `current_automated_test`
  - `current_source`
  - screenshot `26-routine-workspace-local-390.png`

### M02. public 가져가기가 두 disclosure를 지나며 세로로 다시 길어진다

- Severity: Medium
- Route: `/f/moving-d30-basic`
- Viewport: 390x844
- Persona / Flow shape: J01
- 재현 단계: `Flow 가져가기` -> `이 Flow 통째로 가져가기` -> 형식을 확인한다.
- 기대: artifact와 count를 확인한 뒤 한 번의 preflight에서 destination을 선택한다.
- 실제: 범용 workbench가 중첩된 disclosure와 별도 scope/format 영역으로 나타난다.
- 사용자 영향: result-first가 줄인 복잡도가 export 진입에서 되살아난다.
- 제안: H01의 artifact preflight에 disclosure를 통합한다. 저장 전 scope는 whole
  Flow로 명확히 하고, selected/current는 개인 workspace가 소유한다.
- Acceptance marker: public external destination까지 disclosure depth 1 이하
- EvidenceKind:
  - `current_automated_test`
  - screenshot `12-moving-public-export-open-local-390.png`
  - screenshot `13-moving-public-export-formats-local-390.png`

### M03. Calendar 모바일 selected-day 상세가 월간 grid 아래에 있어 긴 스크롤이 필요하다

- Severity: Medium
- Route: `/calendar?demo=ux20`
- Viewport: 390x844
- Persona / Flow shape: dated multi-Flow
- 재현 단계: 항목이 있는 날짜를 누르고 그 날짜의 항목을 확인한다.
- 기대: 선택한 날짜의 agenda를 같은 viewport의 bottom sheet에서 보고 Flow를
  열 수 있어야 한다.
- 실제: 선택일 agenda는 전체 월간 grid 아래에 붙는다. 1024px은 우측 rail을 써서
  같은 문제가 없다.
- 사용자 영향: 날짜 선택과 상세 확인 사이의 공간적 관계가 끊기고, 반복 사용 시
  매번 긴 스크롤이 필요하다.
- 제안:
  - 390px은 selected-day bottom sheet
  - 1024px은 현재 side agenda 유지
  - Calendar는 날짜 있는 항목만 소유하며 undated queue는 추가하지 않는다.
- Acceptance marker:
  - date tap 뒤 agenda 첫 row가 한 viewport 안에 표시
  - Escape/close 뒤 선택 날짜로 focus return
  - bottom nav overlap 0
- EvidenceKind:
  - `current_automated_test`
  - screenshot `22-calendar-demo20-local-390.png`
  - screenshot `23-calendar-demo20-local-1024.png`

### M04. 모바일 library filter가 상태와 결과 형태를 다시 섞는다

- Severity: Medium
- Route: `/my?demo=ux20&view=flows`
- Viewport: 390x844
- Persona / Flow shape: multi-Flow returning user
- 재현 단계: My Flow library의 filter를 읽는다.
- 기대: primary filter는 한 축을 사용해야 한다.
- 실제: `전체 / 진행 중 / 루틴 / 완료 / 보관됨`에서 `루틴`만 결과 형태이고,
  나머지는 lifecycle 상태다. wide는 상태 select를 사용한다.
- 사용자 영향: 사용자는 routine이 상태인지 콘텐츠 종류인지 해석해야 하고,
  mobile/wide filter mental model도 달라진다.
- 제안: primary filter는 lifecycle 상태만 유지한다. shape 검색이 실제로 필요하면
  secondary filter sheet에서 제공하되 사용자 관찰 전에는 추가하지 않는다.
- Acceptance marker: primary filter axis 1개, mobile/wide option parity
- EvidenceKind:
  - `current_automated_test`
  - screenshot `21-my-library-20-local-390.png`
  - screenshot `24-my-library-demo20-local-1024.png`

### M05. `첫 할 일 시작`이 여는 Item sheet 안에서 완료할 수 없다

- Severity: Medium
- Route: `/my?savedFlow=<personal-draft>`
- Viewport: 390x844
- Persona / Flow shape: J05
- 재현 단계:
  1. post-save에서 `첫 할 일 시작`을 누른다.
  2. 열린 bottom sheet에서 실행·완료 control을 찾는다.
- 기대: “시작”으로 연 detail에서 내용을 확인하고 완료할 수 있어야 한다.
- 실제: sheet는 수정, memo, schedule, current export만 제공한다. 완료 checkbox는
  dimmed backdrop 뒤 workspace row에 있어 sheet를 닫아야 누를 수 있다.
- 사용자 영향: CTA 이름과 도착 화면의 행동이 맞지 않고, 실행에 불필요한 왕복이
  생긴다.
- 제안: Item detail header에 동일 completion primitive를 제공하거나 CTA를
  `항목 보기`로 바꾼다. command 중복보다 action-label/destination 일치를 우선한다.
- Acceptance marker:
  - `첫 할 일 시작` 도착 화면에서 complete/reopen 가능
  - backdrop가 active control을 가로막지 않음
  - same completion identity와 undo policy 유지
- EvidenceKind:
  - `current_automated_test`
  - `current_source`
  - screenshot `06-moving-item-detail-local-390.png`

### L01. Preview 배포본의 실제 상호작용 상태는 확인되지 않았다

- Severity: Low
- Route: 전체
- Viewport: 390x844, 1024x768
- 기대: 제공된 Preview에서 같은 candidate를 직접 검토한다.
- 실제: Preview URL이 Vercel login으로 이동했다.
- 사용자 영향: local candidate와 배포 artifact 사이의 차이, provider error,
  deploy-only focus/asset 문제는 확정할 수 없다.
- 제안: 접근 가능한 Preview를 만든 뒤 이 보고서의 11개 acceptance screenshot만
  재검증한다.
- Acceptance marker: Preview direct route 8개, auth redirect 0, console/page error 0
- EvidenceKind: `inaccessible`

## 3. 유지할 점

- 3탭 `Flow 찾기 / 캘린더 / 내 Flow`
- public result-first와 실제 3-row preview
- one-kind adjustment의 Escape와 focus return
- My Flow mobile library-only 첫 화면
- 1024px My Flow rail/canvas 구조
- 1024px Calendar canvas/agenda 구조
- scope-first export와 whole/selected/current count 계약
- completion undo와 focus return
- source/personal/run/occurrence/export identity 분리
