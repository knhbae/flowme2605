# P35-07 Audit

## 1. 판정

`pass`

기존 export format과 projection을 바꾸지 않고, 범위와 개수를 먼저 결정하는
하나의 interaction grammar로 통합했다.

## 2. 현재 순서

1. 범위
   - Flow 전체
   - 직접 선택
   - 현재 항목
2. 형식
   - 해당 범위에서 실제 count가 1 이상인 형식만 표시
   - primary 1개, secondary 최대 2개
   - 나머지 유효 형식은 `다른 형식`
   - destination별 포함·제외와 정보 손실 표시
3. 결과
   - scope
   - format
   - actual output count
   - omitted count
   - stable personal identity
   - Flow에서 계속 실행하는 다음 상태

## 3. 통합한 중복

현재 item 상세에 따로 있던 네 개 format button 묶음을 제거하고
`FlowExportPanel`이 기존 `item` scope를 직접 소비하도록 연결했다.

따라서 전체·선택·현재 항목이 모두 다음을 공유한다.

- `buildFlowExportScopePlan`
- `buildArtifactExportRecommendationVM`
- `buildFlowExportResultReceipt`
- destination별 실제 builder
- count와 stable identity marker

새 scope enum, 저장 key, migration은 만들지 않았다.

## 4. 손실과 복구

- excluded/tombstoned item: 모든 결과에서 제외, source에는 유지
- undated item: list 결과에 포함, Calendar/ICS에서 제외
- Calendar count 0: 숨겨진 disabled format 대신 날짜 지정 복구 문구 표시
- nested subcheck/resource: FlowMe에 남는 정보와 Calendar 설명 포함 정책 표시
- personal title/date/memo/order: 기존 effective projection 그대로 사용
- completion/reopen: export membership을 변경하지 않음

## 5. 반응형 판정

### 390px

- scope control이 format보다 먼저 읽힘
- 선택 목록에 개인 표시 제목과 날짜가 보임
- visible format card는 세로로 배치
- bottom navigation overlap 없이 scroll 가능

### 1024px

- 약 300px inspector에서는 format card가 한 열
- 한국어 글자 단위 줄바꿈 없음
- 날짜 없는 Calendar 복구 안내가 format보다 먼저 보임

### 1440px

- current item receipt가 같은 inspector 안에서 scope/format/count를 유지
- stable identity는 receipt data marker로 보존
- whole plan과 export inspector 역할이 섞이지 않음

## 6. 데이터 영향

변경 없음:

- source content
- personal overlay
- execution run
- recurrence occurrence
- export destination 및 output schema
- localStorage key
- migration

UI composition과 receipt evidence attribute만 추가했다.

## 7. Evidence kind

- current_source
- current_command
- current_browser
- current_download
- current_clipboard
- current_package_screenshot
- heuristic_review

실제 관찰 사용자 수는 0이다.
