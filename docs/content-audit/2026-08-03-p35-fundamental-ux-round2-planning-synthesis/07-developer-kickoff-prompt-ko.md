# P35 Round 2 개발 착수 프롬프트

> 상태: `REUSABLE_TEMPLATE_APPROVED_REFERENCE`
> 용도: 다음 티켓과 다른 승인 조합에도 재사용할 변수형 템플릿
> 현재 B/B/B 실행본: [08-bbb-approved-developer-kickoff-prompt-ko.md](./08-bbb-approved-developer-kickoff-prompt-ko.md)
> 현재 active spec: [P35 Round 2 bounded UX correction](../../specs/2026-08-04-p35-round2-bounded-ux-correction/README.md)
> 권장 첫 티켓: `P0-01 결과 계약·소유권·fixture 기반 고정`
> 이 프롬프트 자체는 구현·commit·push·PR·배포를 승인하지 않음

2026-08-04 Owner의 Q1-B/Q2-B/Q3-B 승인으로 현재 첫 개발 세션에는 이 템플릿을 직접 복사하지 않고, 승인값·spec·기준 ref·첫 티켓이 채워진 [08 실행본](./08-bbb-approved-developer-kickoff-prompt-ko.md)을 사용한다. 이 문서의 `TBD`와 대괄호는 재사용 템플릿 변수이며 현재 결정이 미정이라는 뜻이 아니다.

## 1. 사용 전에 채울 값

| 변수 | 값 |
|---|---|
| `[OWNER_Q1]` | `TBD` |
| `[OWNER_Q2]` | `TBD` |
| `[OWNER_Q3]` | `TBD` |
| `[ACTIVE_SPEC_PATH]` | `TBD — 승인 전 없음` |
| `[TARGET_TICKET]` | 첫 세션은 `P0-01` 권장 |
| `[TARGET_WORKTREE]` | 현재 main/active branch 확인 후 입력 |
| `[PUBLISH_AUTHORITY]` | 기본 `none`; 별도 요청이 있을 때만 변경 |

값이 하나라도 `TBD`이면 일반 `/my`, 공개 빠른 내보내기, 핵심 용어를 바꾸는 티켓을 시작하지 않는다. P0-02/P0-03도 active bounded scope가 승인되기 전에는 구현하지 않는다.

## 2. 개발 세션 종합 프롬프트

아래 블록은 새 조합이나 후속 티켓을 위한 템플릿이다. 대괄호 값을 실제 승인 기록으로 바꾸지 않은 채 전달하지 않는다. 현재 B/B/B 첫 세션에는 [08 실행본](./08-bbb-approved-developer-kickoff-prompt-ko.md)을 그대로 사용한다.

```text
# 역할

당신은 FlowMe P35 Round 2 bounded UX correction의 구현 담당자다. 이번 세션은 아래에서 지정한 티켓 하나만 완료한다. 제품 전체 재설계나 다음 티켓 선행 구현은 하지 않는다.

# 승인 입력

- Owner Q1 — 저장 없는 빠른 내보내기: [OWNER_Q1]
- Owner Q2 — 일반 내 Flow 첫 화면: [OWNER_Q2]
- Owner Q3 — 사용자-facing Flow/계획 용어: [OWNER_Q3]
- 활성 spec: [ACTIVE_SPEC_PATH]
- 이번 티켓: [TARGET_TICKET]
- 대상 worktree: [TARGET_WORKTREE]
- publish 권한: [PUBLISH_AUTHORITY]

승인 입력이 active spec과 다르면 구현을 중지하고 차이를 보고하라. 어느 쪽이 맞는지 추측하지 마라.

# 먼저 읽을 문서

1. workspace와 repo의 AGENTS.md
2. flow-mvp/agent.md
3. docs/workflows/session-start.md
4. [ACTIVE_SPEC_PATH] 전체
5. 이 기획 패키지의 다음 문서
   - README.md
   - 00-evidence-and-disagreement-matrix-ko.md
   - 01-p35-round2-fundamental-ux-decision-ko.md
   - 03-state-contract-development-handoff-ko.md
   - 04-development-sequence-and-tickets-ko.md
   - 05-acceptance-and-qa-matrix-ko.md
6. 이전 Codex Round 2 결과 README와 이번 티켓에 해당하는 근거 문서

# 0단계 — 세션 기준선

1. repo root에서 session-start workflow를 실행하라.
2. branch, HEAD, upstream ahead/behind, git status를 기록하라.
3. 기존 modified/untracked path를 사용자 또는 다른 작업의 소유로 보고 건드리지 마라.
4. 현재 active spec과 owner decision이 같은 scope를 말하는지 확인하라.
5. 대상 티켓이 strict merge order상 시작 가능한지 확인하라.
6. 현재 구현·tests·storage·route owner를 검색해 후보 touchpoint를 검증하라.
7. 시작 전 요약에 다음을 써라.
   - 이번 티켓의 사용자 결과
   - 건드릴 파일 후보
   - 건드리지 않을 범위
   - 정상/오류/취소/Back/중복 acceptance
   - 실행할 검증

기준선이 불명확하거나 기존 dirty path와 겹치면 구현을 시작하지 말고 정확한 충돌 파일을 보고하라.

# 불변 계약

- 공개 source/base는 불변이다.
- 개인 수정은 personal overlay에만 저장한다.
- public session draft는 저장 전 personal copy가 아니다.
- effective plan은 base + overlay의 deterministic 결과다.
- Calendar/List/Sheet/Memo는 canonical plan의 projection이다.
- 날짜 없는 Item에 가짜 날짜나 VEVENT를 만들지 않는다.
- 모든 콘텐츠에 고정 5형식을 강제하지 않는다.
- 내부 Today/Todo lens를 외부 checklist 결과와 같은 형식으로 중복 표시하지 않는다.
- Flow Map의 save_all, choose_child, review_hold, risk, conflict, source relation을 보존한다.
- 중요한 안전·중복·비가역 영향은 아이콘 안에만 숨기지 않는다.
- 완료는 Item 실행 완료에만 사용한다. 공개 draft는 변경 반영, 저장본은 저장이다.
- proposal/wireframe은 구현된 After가 아니다.
- 자동화·시뮬레이션·정적 검토는 실제 사용자 관찰이 아니다. 현재 observed_user는 0이다.

# 구현 순서

1. 이번 티켓의 현재 실패를 fixture/test/browser 중 적절한 방법으로 먼저 재현하라.
2. 코드보다 먼저 데이터 입력, expected output, side effect, rollback을 적어라.
3. 가장 낮은 공통 계층의 계약/test를 수정하라.
4. UI가 필요한 티켓만 state contract에 맞춰 surface를 연결하라.
5. clean/dirty/submitting/error의 취소, X, backdrop, Escape, browser Back을 확인하라.
6. 저장·내보내기 티켓이면 double click, retry, refresh, duplicate, partial storage/clipboard/blob 실패를 확인하라.
7. mobile 390×844와 wide 1024/1440에서 overflow, clipping, sticky CTA, keyboard, focus return을 확인하라.
8. scope 밖의 문제가 보이면 수정하지 말고 별도 follow-up 후보로 기록하라.

# 티켓별 추가 규칙

## P0-01
- UI를 바꾸지 마라.
- 현재 base/overlay/effective/projection 함수와 storage를 inventory하라.
- action ownership matrix와 projection loss schema를 test fixture로 고정하라.
- dated, undated, mixed, memo, routine, Map, completion-criterion, legacy fixture를 포함하라.

## P0-02
- 7↔8 count를 실제 Item ID 집합으로 추적하라.
- 숫자만 맞추지 말고 모든 consumer가 같은 effective snapshot을 쓰게 하라.
- Map 3칸 시각 삭제와 migration을 섞지 마라.

## P0-03
- UI가 약속한 완료 기준과 실제 portable checklist payload를 비교하라.
- 완료 상태, 메모, warning/resource를 완료 기준으로 합치지 마라.

## P0-04~P0-06
- public base/session draft/personal overlay/execution/receipt를 분리하라.
- save는 atomic/idempotent여야 한다.
- 공통 editor family는 commit 의미를 동일하게 만들지 않는다.
- nested Item Back은 상위 Plan draft를 보존한다.

## P0-07~P0-09
- primary 1 + available 최대 2 + conditional + unavailable 이유를 사용하라.
- lifecycle × capability × scope마다 주 owner 하나를 유지하라.
- Saved transfer는 preview = confirm = artifact = persistent export receipt의 Item IDs/count/version/hash가 같아야 한다.
- Public quick은 preview = artifact = session-only 결과 확인의 Item IDs/count가 같고 persistent receipt/history write는 0이어야 한다.
- 새 OAuth, remote provider, 양방향 sync는 넣지 마라.

## P0-08
- Owner Q2가 B일 때만 구현하라.
- 0/1/5/20 상태와 flag-off current P35 회귀를 모두 검증하라.
- 데이터 migration 없이 rollback 가능해야 한다.

# 검증

위험에 맞는 targeted test를 먼저 실행한 뒤 최소한 다음 전체 gate를 고려하라.

- npm.cmd run test:p35-p0
- npx.cmd tsx --test lib/flow/my-flow-step-export.test.ts lib/flow/my-flow-cross-flow-todo.test.ts lib/flow/export-scope.test.ts
- npm.cmd test
- npm.cmd run build
- npm.cmd run docs:check

실제 package script가 다르면 현재 package.json의 명령을 사용하고 왜 바꿨는지 기록하라. 브라우저 QA에서는 console error, failed request, storage 변화, 생성 artifact 내용, replacement character, horizontal overflow를 함께 확인하라.

# 완료 기준

- 지정 티켓의 정상·빈 상태·오류·취소·Back·중복 acceptance가 모두 증거와 연결됨
- 기존 P35 회귀가 green
- 다른 티켓 기능을 선행 구현하지 않음
- rollback이 실제로 설명 가능
- current/proposed/implemented/UXR 라벨이 분리됨
- observed_user 수를 실제 값으로 기록함

# closeout

1. scoped diff와 시작 당시 dirty path를 대조하라.
2. 이번 티켓이 소유한 파일만 설명하라.
3. 실행한 검증과 실행하지 못한 검증을 분리하라.
4. known limitation과 다음 strict-order 티켓을 적되 자동으로 시작하지 마라.
5. commit/push/PR/merge/deploy는 publish 권한이 명시적으로 있을 때만 수행하라.

# 최종 보고 형식

- 결과: 사용자가 무엇을 할 수 있게 되었는가
- 변경 범위: 어떤 계약/상태/화면이 바뀌었는가
- acceptance: 정상·오류·취소·Back·중복 결과
- 검증: 명령, 브라우저, payload/storage/artifact
- 회귀·rollback: flag와 되돌림 방법
- 미수행: scope 밖 항목, 실제 사용자 관찰, publish 상태
- 다음 gate: 다음 티켓 시작 전 필요한 승인/merge
```

## 3. 첫 개발 세션 권장 입력

G0/G1이 완료되면 첫 세션에는 아래처럼 제한한다.

```text
[TARGET_TICKET] = P0-01

이번 세션에서는 UI를 바꾸지 않는다. 현재 source/base, personal overlay, effective snapshot, result projection의 실제 코드·storage owner를 찾아 action ownership matrix, projection loss schema, 재현 fixture, contract tests만 만든다.

반드시 포함할 fixture:
- all-dated
- all-undated
- dated/undated mixed
- memo-first
- repeated routine
- Flow Map 7↔8 reproduction with child decisions
- Item completion criterion + memo + warning/resource + source
- legacy saved copy / missing base

종료 시 다음을 표로 보고한다.
- fixture별 canonical Item ID
- format별 eligible/held/unavailable ID와 수
- preserved/transformed/omitted field
- public preview/saved detail/export가 쓰는 함수
- 아직 서로 다른 snapshot을 쓰는 consumer

P0-02 이상의 UI·save route·My Flow IA는 수정하지 않는다.
```

## 4. 다음 티켓 continuation 프롬프트

P0-01 merge와 green gate 뒤에는 아래 짧은 블록을 종합 프롬프트 아래에 붙인다.

```text
이전 티켓: [PREVIOUS_TICKET]
이전 merge/commit: [PREVIOUS_REF]
이전 acceptance 증거: [EVIDENCE_PATH]
이번 티켓: [TARGET_TICKET]

1. 이전 acceptance가 현재 branch에서도 green인지 먼저 확인하라.
2. 04-development-sequence-and-tickets-ko.md의 strict merge order를 확인하라.
3. 이번 티켓의 hard fail/사용자 피드백 ID만 해결하라.
4. 이전 티켓의 fixture와 loss schema를 새로 복제하지 말고 재사용하라.
5. 다음 티켓은 closeout에 제안만 하고 자동 착수하지 마라.
```

## 5. 개발자가 즉시 질문해야 하는 경우

다음은 합리적으로 추정하면 안 된다.

- Owner Q1~Q3와 active spec의 답이 다름
- source/base를 바꾸지 않고는 요구를 구현할 수 없음
- 기존 Map legacy data를 자동 rewrite해야만 parity가 맞음
- nested saved Item의 commit 단위가 현재 storage에서 모순됨
- remote export/OAuth가 요구되지만 승인 scope에 없음
- 현재 dirty file과 대상 ticket touchpoint가 겹쳐 소유권이 불명확함
- acceptance를 통과시키려면 다른 P0/P1 티켓을 한 PR에 섞어야 함

이 경우 현재 근거, 충돌하는 두 선택, 각각의 사용자 영향, 가장 작은 권장 결정을 보고하고 구현을 멈춘다.
