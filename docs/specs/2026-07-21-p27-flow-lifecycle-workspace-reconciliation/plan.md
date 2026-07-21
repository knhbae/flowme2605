# P27-R 실행 계획

## 1. 실행 원칙

- 한 slice를 구현·검증·evidence 기록까지 닫은 뒤 다음 slice로 간다.
- P27-R00A 결정 gate 전에는 대규모 UI 구현을 시작하지 않는다.
- correctness/data contract가 필요한 문제는 contract slice와 UI slice를 분리한다.
- 현재 P26 identity/projection 계약을 소비하고 복사본 계산을 만들지 않는다.
- out-of-scope 발견은 backlog에 기록하되 같은 slice에 끼워 넣지 않는다.
- 자동 QA는 observed-user evidence가 아니다.

## 2. 전체 순서

```text
P27-R00A comparison prototype gate
  |-- P27-R00F SSR/a11y foundation (parallel)
  |-- P27-R01A reversible lifecycle contract
  |     -> P27-R01B archive/remove/restore UI
  |-- P27-R02A recurrence/resource/subcheck contract
        -> P27-R02B workout vertical slice

P27-R00A + R01B + R02B
  -> P27-R03A pre-save setup workspace prototype
  -> P27-R03B setup workspace production slice
  -> P27-R04A My Flow IA prototype
  -> P27-R04B My Flow implementation
  -> P27-R05 contextual confirmation/resource editing
  -> P27-R06 Calendar integration
  -> P27-R07 compact export/post-save
  -> P27-R08 regression and final review
```

P27-R03A와 P27-R04A는 같은 fixture를 사용하며 병렬 prototype이 가능하다. production 구현은 shared Flow outline과 row anatomy가 확정된 후 순차 진행한다.

## 3. 단계별 목적

## Phase 0. 결정과 foundation

### P27-R00A 비교 prototype gate

앱 코드를 수정하지 않고 다음 세 surface를 390/1024에서 비교한다.

1. 저장 전 Flow preview와 조정
2. My Flow `지금`/`Flow`/detail
3. 홈트 series/occurrence/resource/Calendar

각 surface는 A/B 대안을 만들고 Keep/Change/Remove를 결정한다. 기존 `review.html`, Input Composer v1.1, prior usage preview의 좋은 패턴을 재사용하되 current 구현처럼 표현하지 않는다.

Gate 산출물:

- interaction prototype HTML
- state fixture JSON
- decision matrix
- current/proposed 390/1024 screenshots
- shared component anatomy
- owner approval field

### P27-R00F SSR·접근성 foundation

P27-R00A와 병렬로 진행한다.

- `/flows` server document에 meaningful entry와 첫 catalog 결과가 존재하도록 한다.
- `/my` 4-tab shell SSR을 회귀 테스트한다. 현재 production에서는 `/my` shell이 확인돼 있으므로 stale finding을 그대로 구현하지 않는다.
- no-JS/server-document smoke를 추가한다.
- routine Calendar unnamed focusable wrapper와 공통 overlay focus policy를 확인한다.

## Phase 1. 복구 가능한 라이프사이클

### P27-R01A contract

- Flow archive/restore/permanent-delete 경계
- source Item personal exclusion/restore
- user Item tombstone/restore
- execution history 보존
- legacy migration/fallback
- pure resolver와 golden fixtures

UI 변경 없이 끝낸다.

### P27-R01B UI

- Flow detail command menu의 `보관하기`
- 즉시 undo
- `보관됨` 목록과 복구
- source Item `내 Flow에서 빼기`
- user-created Item `삭제`
- removed items disclosure와 복구
- permanent delete는 data manager에서만 제공하거나 정책 결정 전 보류

## Phase 2. 반복·자료 의미 바로잡기

### P27-R02A contract

- series end와 visible preview horizon 분리
- source-defined program duration provenance
- resource와 confirmation subcheck anatomy
- nested personal overlay 최소 계약
- occurrence edit scope

### P27-R02B workout vertical slice

홈트 대표 Flow 하나에서 end-to-end로 연결한다.

- `4주 프로그램` 또는 `앞으로 4주 미리보기` truthful label
- 시작일/요일/시간/종료 범위 조정
- 저장 전 preview와 저장 후 series detail 일치
- mobile routine agenda/weekly strip
- video/resource 별도 영역
- 현재 occurrence의 완료/재개 1 control

## Phase 3. 저장 전 setup workspace

### P27-R03A prototype

다음 세 shape로 조정 모델을 검증한다.

- moving: anchor-relative dated Flow
- vehicle inspection: undated checklist + optional scheduling
- workout: recurring resource-backed Flow

기본 read mode와 다음 operation을 비교한다.

- 일정
- 포함/제외
- 내용
- 순서
- 자료

### P27-R03B implementation

- current save-before 화면을 shared Flow outline으로 교체
- operation picker와 one-operation-at-a-time mode
- sticky save surface 1개
- post-save receipt에 같은 outline 전달
- Input Composer의 existing-flow/proposal 결과를 workspace에 연결

실제 AI/crawler는 연결하지 않는다.

## Phase 4. My Flow

### P27-R04A prototype

1/3/5/12 Flow fixture에서 다음을 비교한다.

- search always visible vs adaptive search
- single list vs `지금`/`Flow`
- same-date grouping
- one Flow vs multi-Flow wide composition
- archived/completed placement

### P27-R04B implementation

- `지금`: 날짜별 execution rows
- `Flow`: active/recent/archived library
- adaptive search/filter
- shared Flow detail
- post-save/returning parity
- same-date visual grouping

## Phase 5. 확인 항목·resource contextual edit

- source/user confirmation item 표시 분리
- add/title/edit/remove/reorder personal overlay
- resource add/remove/label edit
- source resource 보존
- mobile compact drawer
- keyboard reorder fallback

source-backed 구조 전체를 자유 편집기로 만들지 않는다.

## Phase 6. Calendar

- routine mobile 7-column text compression 제거
- selected-day agenda의 occurrence hierarchy
- undated scheduling queue와 Flow filter
- same-date Flow grouping
- archive/exclusion/restore projection 일치
- series/current scope edit entry

## Phase 7. Export와 post-save

- export는 `scope -> eligible count -> destination -> receipt`만 기본 노출
- full Flow list 반복 제거
- Flow/selected/item scope 유지
- resource/subcheck 손실 여부 preflight
- post-save receipt를 compact band로 통합

## Phase 8. 통합 gate

- six-shape journey 재검증
- user-feedback 7개 전용 시나리오
- server document smoke
- identity/projection/export count matrix
- 390/1024 browser QA
- docs/unit/build/targeted/full E2E
- final review package와 실제 사용자 관찰 준비도 판정

## 4. 구현 우선순위 판단

| 순위 | 이유 | slice |
| --- | --- | --- |
| 1 | 삭제를 먼저 UI로 열면 기록 손실 위험 | R01A |
| 2 | 홈트 4주/자료 의미가 콘텐츠와 실행 identity에 영향 | R02A |
| 3 | UI를 다시 만들기 전 공통 화면 문법 확정 필요 | R00A |
| 4 | hard navigation 기본 신뢰 문제 | R00F |
| 5 | 가장 큰 직접 불편인 저장 전 조정 | R03A/B |
| 6 | 저장 후 장기 사용의 핵심인 My Flow | R04A/B |
| 7 | nested 편집과 Calendar/export는 공통 anatomy 이후 연결 | R05~R07 |

실행 시에는 R00A를 첫 목표로 두고, R01A와 R02A의 contract inventory를 prototype fixture 설계에 함께 반영한다.

## 5. 변경 관리

- 기존 P27 package는 historical input으로 보존한다.
- 본 spec이 승인되면 다음 status/roadmap 갱신 slice에서 P27-R을 현재 실행 순서로 연결한다.
- dirty worktree에서는 이번 spec package만 별도 scope로 관리한다.
- app 구현 commit과 evidence/doc commit을 구분한다.
- deploy는 각 production slice의 regression gate 이후 별도 승인으로 수행한다.
