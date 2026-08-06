# P35 Round 2 B/B/B 승인 개발 착수 프롬프트

> 상태: `READY_TO_COPY — OWNER_APPROVED_LOCAL_HANDOFF`
> 승인일: 2026-08-04 KST
> 승인값: `Q1-B / Q2-B / Q3-B`
> 대상 checkout: `D:\flowme2605\flow-p35-production-mobile-p0`
> 기준 branch / ref: `codex/p35-production-mobile-p0` / `91fb66af063f7041f9442a9dfeb66f9a3e78d723`
> 첫 티켓: `P0-01` 하나만
> publish 권한: `none`

이 문서는 승인값을 채운 **첫 개발 세션용 복붙본**이다. 아래 프롬프트에는 미정 제품 선택이 없다. 구현 담당자는 `P0-01`의 코드·저장소·projection 계약을 확인하고 fixture와 contract test로 고정하되, UI·route·save 동작·`/my` IA·사용자 문구를 바꾸지 않는다.

## 개발쪽에 그대로 전달할 내용

````text
# 역할과 목표

당신은 FlowMe P35 Round 2의 B/B/B 제한 UX 보정 구현 담당자다.

이번 세션의 목표는 P0-01 하나만 완료하는 것이다. 아직 화면을 바꾸는 세션이 아니다. 현재 코드에서 source/base, public session draft, personal overlay, execution overlay, effective snapshot, format projection, artifact/receipt를 실제로 소유하는 함수와 storage를 확인하고, 이후 모든 화면과 내보내기가 같은 Item ID·count·field contract를 쓰도록 fixture와 contract test로 기반을 고정한다.

# 승인된 입력 — 변경하거나 다시 선택하지 말 것

- Owner 결정: Q1-B / Q2-B / Q3-B
- Q1-B: 공개 결과가 clean·eligible·local-only일 때만 저장 없이 한 번 사용한다. 수정·범위 선택·재생성·중복 관리·이력·원격 전송은 저장한 계획이 소유한다.
- Q2-B: 일반 `/my`는 저장 계획 library가 주 회수 구조다. Today는 같은 실행 상태에서 파생한 compact 요약이며 별도 저장소가 아니다.
- Q3-B: 핵심 사용자 화면은 `계획 찾기 / 내 계획 / 계획 수정`처럼 `계획`을 우선한다. FLOW 브랜드·URL·내부 타입·storage key는 유지한다.
- 대상 checkout: `D:\flowme2605\flow-p35-production-mobile-p0`
- 예상 branch: `codex/p35-production-mobile-p0`
- 승인 기준 ref: `91fb66af063f7041f9442a9dfeb66f9a3e78d723`
- 이번 티켓: `P0-01 결과 계약·행동 소유권·loss schema·fixture 기반 고정`
- publish 권한: `none`
- 실제 관찰 사용자: `0명`

Owner 결정과 active spec이 충돌하면 어느 쪽이 맞는지 추측하지 말고 구현을 중지해 차이를 보고한다. 자동·브라우저·정적 QA를 사용자 검증이라고 표현하지 않는다.

# 반드시 먼저 읽을 문서 — 이 순서 유지

1. `D:\flowme2605\AGENTS.md`
2. `D:\flowme2605\flow-p35-production-mobile-p0\AGENTS.md`
3. `D:\flowme2605\flow-p35-production-mobile-p0\agent.md`
4. `D:\flowme2605\flow-p35-production-mobile-p0\docs\harness\README.md`
5. `D:\flowme2605\flow-p35-production-mobile-p0\docs\workflows\session-start.md`
6. `D:\flowme2605\flow-p35-production-mobile-p0\docs\specs\2026-08-04-p35-round2-bounded-ux-correction\README.md`
7. 같은 active spec 폴더의 `spec.md`, `full-program.md`, `plan.md`, `tasks.md`, `qa.md`, `implementation-readiness.md`
8. `D:\flowme2605\flow-p35-production-mobile-p0\docs\content-audit\2026-08-03-p35-fundamental-ux-round2-planning-synthesis\02-p35-round2-owner-decisions-ko.md`
9. 같은 planning 폴더의 `03-state-contract-development-handoff-ko.md`, `04-development-sequence-and-tickets-ko.md`, `05-acceptance-and-qa-matrix-ko.md`
10. `D:\flowme2605\flow-p35-production-mobile-p0\docs\content-audit\2026-08-03-p35-fundamental-ux-round2-results\codex\README.md`

상위 workspace `AGENTS.md`의 `flow-mvp` 포인터는 일반 작업의 기본값이다. 이번 Owner 승인 인계는 위에서 지정한 `flow-p35-production-mobile-p0` checkout과 `91fb66af...` 기준에 묶인 bounded 예외이므로, 명령과 수정은 이 checkout에서 수행한다. 이 예외 외의 workspace 보호 규칙은 그대로 따른다. repo 지시가 이 명시적 대상과 추가로 충돌하면 임의로 checkout을 바꾸지 말고 작업을 중지해 보고한다.

# 0단계 — 시작 기준선

`D:\flowme2605\flow-p35-production-mobile-p0`에서 다음을 수행한다.

1. `npm.cmd run workflow:session-start`를 실행한다.
2. Node가 24.x인지 확인한다.
3. branch, HEAD, upstream ahead/behind, `git status --short --branch`를 기록한다.
4. 승인 기준 ref가 현재 HEAD의 ancestor인지 확인한다. 아니라면 rebase·checkout으로 고치지 말고 중지한다.
5. 아래 승인 시점 미추적 경로를 사용자/기존 작업 소유로 취급한다. 삭제·정리·덮어쓰기·전체 stage하지 않는다.
   - `docs/content-audit/2026-08-03-p35-fundamental-ux-round2-planning-synthesis/`
   - `docs/content-audit/2026-08-03-p35-fundamental-ux-round2-results/`
   - `docs/content-audit/2026-08-03-p35-round2-ux-comparison-assets/`
   - `docs/content-audit/2026-08-03-p35-round2-ux-comparison-ko.html`
   - `docs/specs/2026-08-04-p35-round2-bounded-ux-correction/`
6. 수정 예정 코드와 기존 dirty path가 겹치는지 확인한다.
7. `package.json`과 실제 test 파일을 확인한다.
8. 시작 보고에 다음을 짧게 적고 P0-01을 진행한다.
   - 이번 티켓의 사용자 결과
   - 실제 코드·storage owner 후보
   - 수정 파일 후보
   - 명시적 no-change 범위
   - 실행할 검증

기준선이 불명확하거나 기존 dirty 코드와 겹치면 구현하지 말고 정확한 경로와 충돌을 보고한다.

# P0-01 불변 계약

- source/base는 불변이며 개인 수정·완료 상태로 덮어쓰지 않는다.
- public session draft는 저장 전 personal copy가 아니다.
- personal overlay와 execution overlay를 분리한다.
- `effective authoring snapshot`은 base + personal/session overlay를 읽는다.
- `effective execution snapshot`은 committed authoring snapshot + execution overlay를 읽는다.
- projection은 자신이 읽은 snapshot을 명시하고 원본 bundle을 임의로 재해석하지 않는다.
- Calendar/ICS, 할 일·체크리스트, Sheet, Memo는 canonical Item의 projection이다.
- 날짜 없는 Item에 가짜 날짜나 VEVENT를 만들지 않는다.
- Today/Todo는 내부 실행 lens이며 다섯 번째 외부 형식이 아니다.
- Saved transfer는 preview = confirm = artifact = persistent export receipt의 Item IDs/count/version/hash가 같아야 한다.
- Public quick은 preview = artifact = session-only 결과 확인의 Item IDs/count가 같고 persistent receipt/history write는 0이어야 한다.
- Item 실행 완료, 계획 저장, 공개 초안 반영, 결과 생성은 서로 다른 상태와 동사를 사용한다.
- transient save banner/state와 persistent export/transfer receipt를 같은 상태로 합치지 않는다.
- Flow Map parity 수정과 legacy Map migration을 합치지 않는다.
- 현재 관찰 사용자는 0명이다.

# 이번 세션에서 만들어야 할 결과

1. 실제 상태 흐름 inventory
   - `source/base → public session draft 또는 personal overlay → effective authoring snapshot → execution overlay → effective execution snapshot → projection → artifact/receipt`
   - 각 단계의 실제 함수, 타입, storage key/version, 소비 surface를 표로 기록한다.
2. action ownership matrix
   - lifecycle × capability × scope별 primary owner를 하나로 고정한다.
   - 공개 quick local 결과, saved transfer, replay, export history의 경계를 명시한다.
3. projection loss schema
   - Calendar/ICS, checklist, Sheet, Memo별 `preserved / transformed / omitted / held / unavailable`을 필드 단위로 고정한다.
4. stable-ID fixture와 contract test
   - all-dated
   - all-undated
   - dated/undated mixed
   - memo-first
   - repeated routine
   - Flow Map `save_all`, `choose_child`, `review_hold`
   - Flow Map 7↔8 재현
   - completion criterion + memo + warning/resource + source
   - legacy saved copy
   - missing base
5. consumer 비교 증거
   - public preview, saved detail, Map apply/save, export가 읽는 snapshot 함수
   - fixture별 canonical/selected/applied/preview/saved/export Item ID와 count
6. 다음 티켓 전 foundation 답
   - nested saved Item의 commit 단위
   - transient save banner/state와 persistent export receipt의 type/storage/수명
   - legacy Flow/Map schema·version·missing-base 목록
   - 기존 rollback/feature mechanism

이미 존재하는 계약이 올바르면 억지로 production 코드를 고치지 말고 test·fixture·문서 증거로 고정한다. 실제 불일치가 있으면 P0-01의 가장 낮은 공통 계약 계층에서만 수정하고 UI까지 번지지 않게 한다.

# 실제 확인할 후보 경로

- `lib/flow/effective-flow-snapshot.ts`
- `lib/flow/effective-flow-export.test.ts` — snapshot→export builders 경계를 검증하는 기존 test; import를 따라 실제 owner 확인
- `lib/flow/export.ts`
- `lib/flow/flow-experience-projection.ts`
- `lib/flow/export-scope.ts`
- `lib/flow/artifact-recommendation.ts`
- `lib/flow/flow-map-action-contract.ts`
- 위 파일의 대응 `*.test.ts`

이 목록은 수정 명령이 아니라 검색 시작점이다. `rg`와 기존 consumer/tests로 실제 owner를 검증하고, 더 낮은 공통 owner가 있으면 그 근거를 기록한다.

# 명시적 금지 범위

- UI, component hierarchy, route 변경
- save 동작 또는 post-save 이동 변경
- `/my` IA와 Today/library 화면 구현
- Q1-B quick-result 화면 구현
- Q3-B 사용자 문구 변경
- 전역 `Flow → 계획` 문자열 치환
- URL, 내부 type·변수명, `flow:*` storage key, FLOW 브랜드 rename
- storage migration·legacy 자동 rewrite
- OAuth, remote provider, sync, collaboration
- P0-02 이상 기능 선행 구현
- 기존 미추적 산출물 정리 또는 전체 stage
- commit, push, PR, merge, Preview, Production 배포

# 구현 순서

1. 기존 코드·test·storage consumer를 읽어 inventory를 만든다.
2. 현재 불일치를 fixture 또는 contract test로 먼저 재현한다.
3. fixture별 입력, expected Item IDs/count, expected field loss, side effect, rollback을 적는다.
4. action ownership과 loss schema를 코드에서 가장 낮은 공통 계층에 표현한다.
5. 필요한 최소 구현과 test만 수행한다.
6. UI·route·save·`/my`·copy의 no-diff를 scoped diff로 확인한다.
7. targeted → P35 P0 → full unit → build → docs 순서로 검증한다.
8. closeout에서 이번 티켓 소유 파일만 분리해 보고하고 다음 티켓을 자동 시작하지 않는다.

# 검증 명령

먼저 아래 targeted contract tests를 실행한다.

```powershell
npx.cmd tsx --test `
  lib/flow/effective-flow-snapshot.test.ts `
  lib/flow/effective-flow-export.test.ts `
  lib/flow/flow-experience-projection.test.ts `
  lib/flow/export-scope.test.ts `
  lib/flow/artifact-recommendation.test.ts `
  lib/flow/flow-map-action-contract.test.ts
```

그다음 아래 gate를 실행한다.

```powershell
npm.cmd run test:p35-p0
npm.cmd test
npm.cmd run build
npm.cmd run docs:check
git diff --check
```

명령 또는 파일이 현재 repo와 다르면 먼저 source/package.json을 확인하고, 동등한 명령으로 바꾼 이유를 보고한다. 실행하지 않은 검증을 PASS로 쓰지 않는다. P0-01은 UI no-change 티켓이므로 browser QA는 기본 필수가 아니지만, 공용 consumer나 runtime UI에 영향이 생겼다면 영향 P35 E2E와 console/network/storage 검사를 추가한다.

# 즉시 중지 조건

- B/B/B 승인과 active spec이 충돌한다.
- 승인 ref가 현재 branch ancestry에 없다.
- source/base mutation이나 destructive migration 없이는 acceptance를 만족할 수 없다.
- legacy data를 자동 rewrite해야만 parity를 맞출 수 있다.
- nested Item commit 단위가 서로 모순되고 하나를 고르면 데이터 손실 위험이 있다.
- remote export/OAuth가 필요해진다.
- 대상 코드 파일이 다른 작업의 dirty change와 겹친다.
- P0-01을 통과시키려면 UI 또는 다음 티켓 기능을 함께 구현해야 한다.

중지할 때는 `현재 근거 / 충돌 계약 / 사용자 영향 / 가장 작은 권장 결정` 네 열로 보고하고 추측 구현하지 않는다.

# 완료 기준

- 모든 required fixture에 stable canonical Item ID와 expected projection이 있다.
- action ownership matrix와 format별 loss schema가 test 가능한 형태로 고정됐다.
- consumer별 snapshot 함수와 Item ID/count 차이를 설명할 수 있다.
- FND-S10-COMMIT, FND-RECEIPT, FND-LEGACY, FND-ROLLBACK, FND-CONSUMERS에 코드 근거가 있다.
- UI·route·save·`/my`·copy가 바뀌지 않았다.
- targeted tests, `test:p35-p0`, full test, build, docs check, diff check의 실제 결과가 기록됐다.
- 기존 dirty path와 이번 티켓 소유 파일이 구분됐다.
- observed-user는 실제 값인 0명으로 기록됐다.
- commit/push/PR/merge/deploy는 수행하지 않았다.

# 최종 보고 형식

1. 결과
   - 이번 기반 작업으로 다음 티켓이 무엇을 안전하게 구현할 수 있게 됐는가
2. 실제 소유권 표
   - 상태/기능, 실제 함수·타입, storage, 소비 surface, 근거 파일
3. fixture·projection 표
   - fixture, canonical IDs/count, format별 eligible/held/unavailable IDs, preserved/transformed/omitted fields
4. 변경 파일
   - 이번 티켓 소유 / 시작 전 dirty·unowned를 분리
5. 검증
   - 실행 명령, PASS/FAIL, 증거; 미실행은 별도 표시
6. 회귀·rollback
   - UI no-diff, storage no-rewrite, 현재 rollback mechanism
7. 남은 blocker
   - foundation 답이 없는 항목과 차단되는 후속 티켓
8. 게시·검증 상태
   - local edit / commit / push / PR / merge / Preview / Production / observed-user를 각각 기록
9. 다음 gate
   - P0-01 acceptance가 green일 때만 P0-02를 제안한다. 자동 시작하지 않는다.
````

## 이 프롬프트의 종료점

개발 담당자가 위 프롬프트를 수행한 뒤에는 `P0-01 결과 + 검증 증거 + foundation 답`을 검토한다. 그 결과가 green일 때에만 다음 strict-order 티켓을 별도 세션으로 넘긴다. 이 문서의 존재만으로 commit·push·PR·merge·배포 권한이 생기지 않는다.
