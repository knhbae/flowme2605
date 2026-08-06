# P35 Round 2 B/B/B 제한 UX 보정 Spec

**Date:** 2026-08-04

**Status:** Internal implementation gate complete locally — P0-01~P1-04 PASS; candidate freeze/blind review authorized; V1 excluded from current program

**Owner:** FlowMe Owner

**Decision authority:** [2026-08-04 B/B/B 결정](../../DECISIONS.md)
**Related roadmap:** [P35 Round 2 B/B/B bounded correction](../../ROADMAP.md)

## Goal

공개 계획을 이해·미리보기·저장 전 조정하는 단계와, 저장한 계획을 찾아 실행·수정·내보내는 단계를 명확히 나눈다. 사용자는 어느 화면에서도 지금 다루는 상태가 공개 원본인지, 미저장 초안인지, 개인 저장본인지, 실행 상태인지, 생성 결과인지 예측할 수 있어야 한다.

## Stage Fit

P35에서 재현된 세 hard fail과 Owner U01~U10 피드백을 기존 identity·storage·projection 위에서 제한적으로 고치는 작업이다. 이미 구현된 `EffectiveFlowSnapshot`, 로컬 저장, 실행, export builder를 교체하지 않고 소비자 간 소유권과 parity를 먼저 고정한다.

다음 단계로 확장하지 않는다: 계정·OAuth·원격 provider·양방향 sync·협업 workspace·marketplace·AI 자동 재계획·legacy 자동 migration·실제 사용자 관찰 없는 validation 주장.

## Current Gate Status

- P1-03 `PASS`: [closeout](./p1-03-closeout.md), [format/field parity](./p1-03-format-field-parity.md)
- P1-04 `PASS`: [final internal gate closeout](./p1-04-closeout.md)
- final full E2E: `529/529 PASS`, workers `4`, retries `0`, elapsed `26.0m`; P1-04 direct `6/6 PASS`
- full unit: `1,086/1,086 PASS`
- build: Next `15.5.21`, pages `18/18`, pre-freeze BUILD_ID `vAb8e5TudUXvxEyowetMU`
- actual browser zoom / performance: `NOT_ASSESSED`; `720×500`은 reflow proxy이며 zoom 증거가 아님
- candidate commit·push: Owner 승인됨; exact SHA와 clean proof는 commit 뒤 외부 freeze record에 기록
- PR·merge·Preview·Production: 승인되지 않음
- V1: `OUT_OF_SCOPE_CURRENT_PROGRAM`, observed users `0`

이 판정은 로컬 내부 구현 gate 완료만 뜻한다. Text Authoring/creator publishing은 계속 별도 범위이며, 게시나 실제 사용자 validation으로 승격하지 않는다.

## User Need

기존 캘린더·할 일·메모·스프레드시트로 결과를 옮겨 쓰는 사용자는 공개 콘텐츠에서 어떤 결과를 얻을지 먼저 확인하고, 필요할 때만 저장·개인화한 뒤, 나중에 같은 계획을 다시 찾아 실행하거나 재생성할 수 있어야 한다.

## Approved Decisions

### Q1-B — 제한적 저장 없는 빠른 사용

공개 quick result는 다음 조건을 모두 충족할 때만 존재한다.

1. 공개 session draft가 source/base 대비 수정되지 않은 clean 상태다.
2. 결과가 현재 데이터만으로 deterministic하게 생성 가능한 local file 또는 clipboard 결과다.
3. 계정 연결, 원격 전송, 전송 이력, background retry, partial remote success가 필요 없다.
4. 실제 생성 payload는 화면의 public effective snapshot과 같은 Item ID·count를 사용한다.
5. 행동 바로 옆에 `FlowMe에 저장되지 않음`과 저장 경로가 표시된다.

수정이 발생하거나 위 조건 하나라도 맞지 않으면 저장 후 경로로 전환한다. 공개 상세에서 quick 진입은 저장 주 행동을 밀어내지 않는 contextual secondary이며, quick branch 안에서만 로컬 파일 만들기/복사가 primary다. 공개 quick result에는 범위 선택, 재생성, 중복 관리, history를 추가하지 않는다.

### Q2-B — 저장 계획 library 중심 `/my`

일반 `/my`의 안정적인 골격은 다음과 같다.

```text
compact Today — 오늘 항목이 있을 때만 한 줄 파생 요약
→ 최근/활성 저장 계획
→ 저장한 계획 library
```

Today가 화면 위에 있을 수는 있지만 페이지의 canonical 저장소나 주 탐색 구조가 아니다. 저장 계획 library가 일반 진입의 주 콘텐츠와 회수 경로를 소유한다. 저장 직후 deep-link는 일반 `/my` 첫 화면 규칙과 별개로 방금 저장한 계획 상세를 연다.

0개에는 `계획 찾기` 한 행동, 1개에는 불필요한 검색 없이 계획 진입, 5개에는 과도한 필터 없이 목록, 20개에는 최소 검색·상태 필터를 제공한다.

### Q3-B — 핵심 사용자 화면의 `계획` 단계 적용

1차 적용 대상은 navigation, 공개 CTA, editor 제목, 저장 상세, 빈 상태, 검색·접근성 이름이다.

| 현재 표현 | 1차 표현 |
|---|---|
| Flow 찾기 | 계획 찾기 |
| 내 Flow | 내 계획 |
| Flow 조정/편집 | 계획 수정 |
| 내 Flow에 저장 | 내 계획에 저장 |
| Flow 목록 | 저장한 계획 |

FLOW 브랜드, `/f`, `/my`, `/flow-maps` URL, 코드 타입과 변수명, `flow:*` storage key는 변경하지 않는다. 전역 문자열 치환을 금지하고 surface별 copy inventory와 regression assertion으로 적용한다.

## Common Contracts

### State ownership

| 상태 | 소유 데이터 | 금지 |
|---|---|---|
| source/base | 게시된 source snapshot과 provenance | 개인 수정·완료로 덮어쓰기 |
| public session draft | 저장 전 제목·기준일·포함·순서 변경 | 개인 저장본·실행 이력으로 취급 |
| personal overlay | 개인 제목·날짜·메모·제외·구조 변경 | source/base mutation |
| execution overlay | Item 완료·회차·실행 기록 | personal authoring 값과 합치기 |
| artifact/receipt | 생성 버전·범위·형식·개수·결과 | canonical plan 자체 변경 |

`effective authoring snapshot`은 base + personal/session overlay를, `effective execution snapshot`은 committed authoring snapshot + execution overlay를 읽는다. 각 projection은 어느 snapshot을 사용했는지 명시하며 임의로 원본 bundle을 다시 해석하지 않는다.

### Editor family

- 공개 Plan/Item과 저장 Plan/Item은 같은 field order, validation, dirty guard, Back/Escape, focus return 문법을 사용한다.
- 공개 commit은 현재 session projection에 `변경 반영`한다.
- 저장 commit은 personal overlay에 atomic하게 `저장`한다.
- `완료`는 Item execution state에만 사용한다.
- nested Item commit 단위는 P0-01 inventory로 확인하고 P0-05 전에 하나로 고정한다.

### Save and post-save

- save는 stable source key, personal copy key, idempotency key를 사용한다.
- 같은 source의 기존 저장본이 있으면 write 전에 `덮어쓰기 / 사본 만들기 / 취소`를 명시적으로 선택하며 자동 merge·자동 overwrite를 하지 않는다.
- 성공하면 selected saved plan detail로 이동한다.
- `저장됨 · N개 · 되돌리기` 배너는 한 번만 표시한다.
- 별도 save-only 결과 route는 만들지 않는다.
- export/transfer receipt는 별도 결과 기록으로 유지한다.

### Capability-based results

- 주 결과 1개, 바로 가능한 보조 최대 2개, 조건부 결과, 불가 이유 순서다.
- Calendar/ICS, 할 일·체크리스트, Sheet, Memo는 canonical Item의 projection이다.
- Today/Todo는 내부 실행 lens이며 다섯 번째 외부 형식이 아니다.
- 날짜 없는 Item에 가짜 날짜나 VEVENT를 만들지 않는다.
- Saved transfer는 preview = confirm = artifact = persistent export receipt의 Item IDs·count·version/hash가 같다.
- Public quick은 preview = artifact = session-only 결과 확인의 Item IDs·count가 같고 persistent export receipt/history write는 0이다.

### Item and Flow Map subtraction

- Item 상세는 중립 배경, 제목→완료 기준→일정/메모→경고·출처 순서를 사용한다.
- `실행할 일` 중복 heading을 제거하고 `완료`를 주 행동, `수정`을 보조 행동으로 둔다.
- Flow Map의 3칸 요약 grid는 제거하되 `선택 N / 전체 M`은 CTA 근처에 남긴다.
- selected IDs, applied IDs, preview IDs, saved IDs가 같은 effective snapshot에서 일치해야 한다.
- Map parity 수정과 legacy Map migration은 다른 작업이다.

## Scope

### In

- P0-01~P0-10과 P1-01~P1-04의 strict-order bounded correction
- hard fail HF-01 Map 7↔8 parity, HF-02 완료 기준 payload, HF-03 행동 소유권
- 공개·저장 lifecycle, 공통 editor transaction, post-save direct detail
- capability 결과, Q1-B quick local result, Q2-B `/my`, Q3-B copy tokens
- 오류·취소·Back·중복·legacy no-write·390/1024/1440 회귀

### Out

- remote send/OAuth/provider integration와 양방향 sync
- source/base 직접 수정, stable identity rewrite, destructive storage migration
- Flow Map schema migration 또는 `/flow-maps` 제거
- URL, 내부 type, 변수명, `flow:*` key, FLOW 브랜드 rename
- 고정 5형식, 가짜 날짜, Today 별도 canonical 저장소
- 고급 filter, collaboration, project hierarchy, AI 자동 재계획
- Text Authoring/creator publishing 재설계
- commit·push·PR·merge·Preview·Production 권한 자동 확대
- 자동 QA를 실제 사용자 validation으로 표현

## Rollout And Rollback

Q1 quick-local, Q2 library shell, Q3 user copy는 서로 독립적으로 되돌릴 수 있어야 한다. P0-08 Q2 rollback은 exact query `savedPlanLibrary=off`로 고정됐고, 다른 flag와 독립적이며 storage migration을 만들지 않는다. Q1·Q3의 최종 rollback 계약은 각 소유 티켓에서 고정한다.

- Q1 off: 공개 one-shot 행동을 숨기고 저장 후 transfer만 유지한다.
- Q2 off: 기존 P35 plain `/my`와 storage bytes를 유지한다.
- Q3 off: 사용자 copy token만 기존 Flow 표현으로 복구한다.
- 어느 rollback도 storage migration을 요구하지 않는다.

## FlowMe Gates

| Gate | Decision |
|---|---|
| First user action | 공개 계획에서 실제 주 결과를 확인하고 `수정` 또는 `내 계획에 저장`을 선택한다. |
| Completion signal | 저장은 selected plan detail의 1회 배너, 실행은 Item 완료 상태, transfer는 receipt로 각각 확인한다. |
| Artifact destination | 콘텐츠 capability에 따라 Calendar/ICS, 할 일·체크리스트, Sheet, Memo 중 실제 가능한 결과만 사용한다. |
| Source/risk boundary | source/base, session draft, personal overlay, execution overlay, receipt를 분리하고 중요한 위험은 inline으로 보인다. |
| Natural artifact | 30일 이사 준비 예시에서 일정 24개, 할 일 24개, 시트 24개처럼 같은 selected Item IDs를 형식에 맞춰 projection한다. |
| Service structure impact | `/f`, `/my`, Flow Map 소비자와 export owner가 바뀔 수 있다. 실제 코드 PR에서 `SERVICE_STRUCTURE.md` 갱신 여부를 판정한다. |
| Verification | contract/golden tests, P35 회귀, build/docs, 영향 E2E, 390/1024/1440 browser QA, payload/storage/artifact 검사. |

## Acceptance Criteria

- Q1-B의 모든 eligibility 조건이 한 guard에서 계산되고 저장 없는 행동은 local-only다.
- 일반 `/my`는 저장 계획을 안정적으로 회수하며 Today는 있을 때만 compact한 파생 요약이다.
- Q3-B 적용 후 사용자-facing core copy는 `계획`을 사용하지만 URL·코드·storage identity는 변하지 않는다.
- public preview, saved detail, export가 같은 canonical Item ID 집합과 count를 사용한다.
- HF-01~HF-03이 새 assertion에서 PASS다.
- 정상·빈 상태·오류·취소·Back/Escape·double click·retry 결과가 정의와 일치한다.
- legacy fixture를 읽는 것만으로 storage가 rewrite되지 않는다.
- 390×844, 1024, 1440×1000에서 overflow·가림·focus 오류가 없다.
- console error, page error, failed request가 0이거나 승인된 예외로 기록된다.
- 실제 관찰 사용자 수는 자동 QA와 분리해 기록하며 현재는 0명이다.
