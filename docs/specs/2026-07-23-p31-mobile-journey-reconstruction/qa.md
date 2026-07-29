# P31 Simulation, QA And Replan Contract

## 1. Evidence 종류

모든 결과에 아래 중 하나를 붙인다.

- `current_production_interaction`
- `current_package_screenshot`
- `current_source`
- `current_command`
- `fixture_only`
- `reference_pattern`
- `heuristic_simulation`
- `observed_user`
- `inaccessible`

`heuristic_simulation`, Playwright, screenshot, unit test를 `observed_user`로 기록하지 않는다.

## 2. Baseline

| Metric | P30 independent baseline | P31 target |
| --- | ---: | ---: |
| 설명 없이 이해 가능한 cell | 13/24 | >=20/24 |
| 설명이 필요한 cell | 11/24 | <=4/24 |
| 전체 interaction depth | 191 | 동일 과업 기준 30% 이상 감소 |
| cell 평균 depth | 7.96 | 일반 과업 <=5 |
| mobile save focus path | 16 | <=8 |
| opened My Flow focusable | 74~90 | default 50% 이상 감소 |
| horizontal overflow | 0 | 0 |
| fixed overlap | 0 | 0 |
| unnamed focusable | 0 | 0 |
| observed users | 0 | 0으로 정직하게 유지 |

## 3. Persona simulation protocol

각 persona는 같은 storage를 이어 쓰는 3개 session으로 실행한다.

### Session 1

- 발견
- source 확인
- 결과 예측
- 최소 개인화
- 저장

### Session 2

- reload/revisit
- Flow 찾기
- Item 열기
- 일정 조정
- 완료/reopen

### Session 3

- archive/restore 또는 delete
- export
- reuse
- 과거 실행 보존 확인

각 행동에 기록:

- route
- viewport
- fixture
- initial state
- action
- click/tap/focus depth
- expected
- actual
- persistence after reload
- projection parity
- evidenceKind

## 4. Prototype scoring

각 대안은 1~5점으로 평가한다.

- 역할 명확성
- 결과 예측 가능성
- 기본 화면 밀도
- 콘텐츠 shape 적응성
- 복구 가능성
- mobile/wide 일관성
- keyboard 접근성
- P30 계약 보존성

한 항목이라도 2점 이하면 구현 승인하지 않는다.

## 5. Replan triggers

다음 발생 시 즉시 해당 slice를 중지한다.

1. current production correctness Blocking 재현
2. source/personal/run/occurrence/export identity 회귀
3. schema migration 필요성이 새로 발생
4. prototype보다 interaction depth 증가
5. mobile capability가 wide보다 적음
6. destructive action recovery 불명확
7. 같은 사용자 동사가 다른 데이터 상태를 바꿈
8. fake social proof 또는 내부 용어 노출

중지 후:

1. finding 문서화
2. 원인 계층 분류: data / projection / component / composition / copy
3. 최소 rollback
4. plan 변경
5. 재시뮬레이션
6. 재승인

## 6. Slice별 필수 테스트

### P31-01

- unit: precedence matrix
- E2E: public adjustment -> My Flow edit -> Calendar/ICS
- regression: anchor/fixed/undated/recurrence

### P31-02

- unit: card view model, artifact eligibility
- E2E: moving/wedding/workout save-before
- browser: source link, artifact switch, one primary

### P31-03

- unit: lifecycle vocabulary, archive/restore state
- E2E:
  - list -> workspace -> back
  - archive -> undo
  - archive -> reload -> restore
  - undated reuse
- browser: 390/1024 focus and scroll restoration

### P31-04

- E2E:
  - agenda -> sheet -> edit -> close
  - selected date/focus restore
  - placement -> undo
- keyboard: grid -> agenda <=10 stops

### P31-05

- unit: permanent delete contract
- E2E:
  - delete cancel
  - delete confirm -> reload
  - source rediscovery/re-save
- full 24-cell run
- full E2E if impact is cross-surface
- security audit

## 7. Screenshot matrix

각 승인 surface:

- 390x844
- 1024x768
- 1440x900 where layout changes

필수 상태:

- Home first-time
- Home returning
- Find card
- wedding save-before
- workout default
- workout schedule sheet
- My Flow list
- My Flow workspace
- archived row restore
- permanent delete dialog
- Calendar default
- Calendar Item sheet
- Calendar undated placement

## 8. Accessibility

- page heading/landmark 순서
- visible label과 accessible name
- icon tooltip
- tab/arrow-key order
- focus visible
- dialog/sheet trap
- Escape
- cancel/close focus return
- status announcement
- 44px mobile target
- text zoom/reflow

## 9. Final publish rule

다음이 모두 충족돼야 production 후보로 분류한다.

- P31-01 Blocking 0
- 24-cell target 달성
- unit/build/docs green
- targeted/full E2E 범위 명시
- security critical/high 0 또는 승인된 별도 exception
- production smoke green
- rollback 경계 기록
- observed-user count를 자동으로 증가시키지 않음

