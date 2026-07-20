# P26-17 Audit

## 원인

P26-01~16에서 기능별 화면을 순차 확장하면서 같은 객체가 route마다 다른 카드, pill, 버튼 색, 포커스 처리, 결과 문구를 사용했다. 기능은 연결됐지만 사용자는 저장 전·저장 후·실행·편집·내보내기를 서로 다른 도구처럼 읽을 수 있었다.

## 적용 범위

| Surface | Before | Current |
|---|---|---|
| public save-before | 제목, source, 세 pill, 미리보기 목록 | ArtifactSummary + ScheduleIntent + outline preview |
| post-save | route 전용 성공 header | semantic Receipt + one primary next action |
| whole Flow | 단계별 중첩 card | open FlowOutlineRow bands |
| execution item | compact/noncompact 별도 article style | shared ExecutionRow |
| item editing | inline/panel/mobile class 분기 | shared EditorShell + input/action tokens |
| export | route 전용 step labels와 receipt | shared ExportPlan/PlanStep/Receipt |

## 소유권 영향

- source content mutation: 없음
- personal overlay schema: 변경 없음
- execution run/completion: 변경 없음
- occurrence identity: 변경 없음
- Calendar/export payload: 변경 없음
- route IA: 변경 없음

## 카피 규칙

- action은 primary/secondary/utility/completion/destructive/recovery로 분류한다.
- primary action label budget은 14자다.
- 한 decision surface의 visible primary는 최대 1개다.
- source는 회색 정보, 성공은 green, 확인 필요는 amber, 실패·삭제는 red로 구분한다.
- 긴 설명으로 state/action label을 대체하지 않는다.
- public 저장 행동의 `날짜 없이 시작` 같은 schedule-intent variant는 기존 P26-06 계약으로 유지하고 primary 역할만 공통 표시한다.

## 시각 점검

### 390x844

- public save-before: 조건/결과/전체 수가 한 프레임에서 읽힘
- post-save: 저장 결과, 첫 할 일 시작, 전체 Flow가 위계대로 보임
- export: 범위/결과/형식/완료가 한 contract로 보임
- held: amber receipt이며 실행 primary 0
- horizontal overflow 0, console/page error 0

### 1024x768

- 전체 Flow는 open rows, 편집은 오른쪽 detail pane
- editor input/action token과 visible focus 확인
- horizontal overflow 0, console/page error 0

full-page screenshot에서 fixed mobile nav가 긴 문서 중간에 반복돼 보이는 capture artifact와 실제 fixed-clearance 위험은 P26-18에서 viewport screenshot과 overlap geometry로 분리 검증한다.

## 자동 검증

- contract/pretest: 10 pass
- dedicated component system E2E: 3 pass
- build: 18 routes pass
- affected regressions + dedicated component suite: 17 pass
- full unit: 564 pass, pretest 10 pass
- docs check: 14 required files, 2,665 local links

한 번의 14-test 중간 실행에서 모바일 editor persistence test가 1회 실패했지만 동일 spec 단독 재실행은 3/3 통과했고, 최종 17-test 연속 실행도 17/17 통과했다. 현재 결과는 최종 연속 실행을 기준으로 한다. 이를 실제 사용자 오류로 분류하지 않는다.

## 남은 위험

1. 390에서 fixed bottom navigation과 긴 export/editor 화면의 실제 viewport clearance는 P26-18 대상이다.
2. 1024 whole Flow outer container와 detail pane 비율은 responsive composition에서 더 단순화할 수 있다.
3. route 전역의 legacy cards/pills까지 모두 교체한 것은 아니다. 이번 slice는 핵심 실행 primitive를 연결했다.
4. 실제 사용자 관찰이 없어 copy budget이 이해도 향상을 보장하지 않는다.
