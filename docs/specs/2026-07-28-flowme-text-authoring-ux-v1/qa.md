# QA

## Evidence boundary

- 이 문서의 prototype interaction은 deterministic fixture simulation이다.
- 자동화, screenshot, agent review는 실제 사용자 검증이 아니다.
- 사용자 관찰은 이번 MVP PoC 내부 게이트에서 제외하며 검증 완료로 주장하지 않는다.
- 정확한 현재 실행 수치의 정본은
  [v2 completion report](../../content-audit/2026-08-04-flowme-text-authoring-grammar-ux-improvement-results/README.md)다.

## 2026-08-04 v2 current verdict

- simulation matrix: `35 / 35` (`G01~G10`, `D01~D09`, `A01~A08`, `U01~U08`)
- Text Authoring tests: `147 / 147`
- full unit: pretest `100 / 100` + unit `594 / 594` = `694 / 694`
- focused production E2E: 위험 기반 `12`개 통과
- TypeScript: `0` diagnostics
- production build: `18 / 18`
- UI viewport: `1440x900`, `1024x768`, `390x844`, `390x600`, `360x640`, `844x390`
- UI errors: console `0`, page `0`, failed request `0`, replacement character `0`, external request `0`
- evidence: [matrix JSON](../../content-audit/2026-08-04-flowme-text-authoring-grammar-ux-improvement-results/simulation-matrix-v2-results.json), [UI JSON](../../content-audit/2026-08-04-flowme-text-authoring-grammar-ux-improvement-results/ui-simulation-evidence.json), PNG `9`
- publish: local only; not committed, pushed, merged, or deployed
- observed-user validation: not run

## Required verification

### Documents

- 모든 필수 Markdown 파일 존재
- 네 JSON 계약 parse
- handoff 링크와 spec 링크 유효
- `npm.cmd run docs:check`
- `git diff --check`

### Browser sizes

- 390x844
- 1024x768
- 1440x900
- 390x600
- 360x640
- 844x390

각 viewport에서 확인:

- `document.documentElement.scrollWidth <= innerWidth`
- fixed UI가 composer, CTA, inspector를 가리지 않음
- 상단 예시 bar만 가로 scroll하고 document 자체는 넘치지 않음
- 가장 긴 제목과 URL이 컨테이너를 넘지 않음
- active state가 색상만으로 전달되지 않음

### Keyboard

1. case selector 이동
2. composer 입력
3. `구조 확인`
4. outline row 선택
5. contextual edit 열기
6. title 또는 role 수정
7. `변경 적용`
8. artifact 선택
9. save/export preflight
10. receipt 확인

필수:

- focus indicator
- 명시적 accessible name
- dialog/sheet focus 이동과 복귀
- Escape 취소
- status 변화 `aria-live`

## Eight-case assertions

### 이사 D-30

- fixture/version/count를 표시한다.
- AJD runtime 24, AJD corpus 27, EasyLaw Input Composer 24를 자동 병합하지 않는다.
- 기준일 전에도 상대 날짜 구조를 볼 수 있다.
- 기준일을 넣으면 Calendar 날짜가 계산된다.

### 차량 점검

- source의 D-14, D-10, D-3, D-Day offset을 보존한다.
- 기준일 없는 개인 Todo projection은 undated로 저장할 수 있다.
- 검사일을 넣으면 상대일을 Calendar 날짜로 계산한다.
- date 제거 후 source offset을 잃지 않고 undated personal projection으로 복귀한다.

### Allblanc

- resource URL은 Item이 아니다.
- 7일 sequence의 Day 1~7 순서를 보존한다.
- 7일 sequence와 1-item weekly routine variant를 합치지 않는다.
- weekly variant에서 series와 occurrence를 합치지 않는다.

### K-MOOC

- 14행 모두 존재한다.
- 현재 주차는 user-owned 값이다.
- 날짜를 임의 생성하지 않는다.

### LibriVox

- 38장 모두 존재한다.
- 현재 장과 재생 위치를 표현한다.
- 반복 routine으로 바꾸지 않는다.

### 신차 구매

- decision/check/record 역할을 구분한다.
- 비교 field는 Sheet에서 유지된다.
- context 문장을 완료 Item으로 만들지 않는다.

### 해외여행 안전정보

- guide, caution, action을 구분한다.
- 공식 source가 보인다.
- safety 판단을 새로 만들지 않는다.

### 제주 여행 메모

- 5 Item split과 원문 fragment를 연결한다.
- merge/split/reorder/rename/include-exclude가 가능하다.
- live AI라고 표시하지 않는다.

현재 `frozen-cases.test.ts`는 여덟 사례 각각에서
`input -> mapping/canonical -> artifact -> browser-local save/load ->
save/export receipt parity`를 확인한다. 이는 source-backed automated corpus이지
관찰 사용자나 외부 Calendar/Todo/Sheet round-trip 증거가 아니다.

## TA-05 review and source-update assertions

Review:

- review requirement가 없으면 source wording만으로 gate를 만들지 않는다.
- rights와 safety gate를 독립적으로 저장한다.
- `evidence_recorded`는 non-empty evidence note를 요구하고 reopen/undo가 가능하다.
- `personal_only`와 `required`는 local save를 허용하지만 export,
  creator review 요청, suggestion submit을 차단한다.
- 비개인 lane의 personal-only 선택은 원 document를 보존한 새 personal
  document/revision을 만든다.
- review state와 receipt는 browser-local save/load와 reload recovery에서
  유지된다.

Source update:

- 보호 revision이 없는 새 입력은 parse button 없이 debounce 뒤 현재 단계의
  Structure와 Result count를 갱신한다.
- 제목만 고칠 때 기존 Item correction과 revision을 교체하지 않는다.
- same source fingerprint는 no-op이며 staging은 active content를 바꾸지 않는다.
- old source, incoming source, active-lane value를 동시에 보존한다.
- title/detail/completion/schedule뿐 아니라 support fields
  (resource/source/guide/caution)와 structure fields
  (role/include/nesting/order/Step mapping)를 compare한다.
- title similarity와 order로 자동 match하지 않고 stable ID/explicit match만
  허용한다.
- added/removed 선택, tombstone, apply/reject, undo, storage, receipt를 검증한다.
- 저장 또는 correction revision 뒤 원문 입력을 바꾸면 debounce가 active 결과를
  덮지 않고 source compare state를 stage한다.
- 외부 source watcher/crawler는 비범위다.

## State assertions

모든 blocked/error state는 다음을 갖는다.

- 감지한 내용
- 감지하지 못한 내용
- 현재 보존된 결과
- 다음 행동 하나
- 돌아가기 또는 원문 편집

필수 상태:

- `partial_parse`
- `unsupported_syntax`
- `source_import_required`
- `rights_review_required`
- `safety_review_required`
- `source_updated`
- `conflict_source_vs_user`
- `retryable_error`
- `provider_error`
- `recovered_unsaved_draft`

## Visual comparison

최종 screenshot마다 다음 fidelity ledger를 기록한다.

| 비교점 | 기대 |
|---|---|
| screen count | Input, Structure, Result 역할이 분리됨 |
| first viewport | composer와 useful preview summary가 보임 |
| primary action | 1개 이하 |
| source ownership | source와 user 값이 서로 다른 표식 |
| long content | search/progress/collapse 없이 전체를 숨기지 않음 |

## Completion audit

마지막에 목표 문서의 각 완료 기준을 `pass / partial / fail / inaccessible`로 분류하고
증거 파일과 browser marker를 연결한다. 하나라도 필수 `partial/fail`이면 완료로
표현하지 않는다.

## Current local verdict

- scoped Text Authoring: `147 / 147`
- full unit: pretest `100 / 100` + unit `594 / 594` = `694 / 694`
- API acceptance: `27 / 27`
- browser UI acceptance: U01~U08 `8 / 8`
- combined simulation matrix: `35 / 35`
- focused production E2E: 위험 기반 `12`개 시나리오 통과
- production build: `18 / 18`
- Text Authoring-owned TypeScript diagnostics: `0`; repo-wide diagnostics: `190`
- standalone HTML: `2,090,370` bytes
- console errors, page errors, failed requests, replacement characters,
  external requests: `0`
- local verdict: `local_v2_functional_internal_qa_pass_with_dependency_audit_followup`
- dependency audit: transitive High `2`; dependency/lock unchanged in this task,
  remediation not performed
- observed-user validation: not performed and not claimed
- commit/push/PR/merge/new Preview/production deploy: not performed
- P35 production: unchanged

## Historical 2026-07-30 MVP PoC three-party review protocol

This is a preserved historical protocol, not the current v2 gate. Use the
[three-party review kit](../../content-audit/2026-07-29-flowme-text-authoring-ta-implementation/mvp-poc-three-party-review-ko.md).
The owner, Claude Code, and Codex record independent evidence against the same
branch, HEAD, build ID, scope, and severity contract. The owner directly completes
ordinary text input, source-to-structure review, one minimal correction, local
save/reload recovery, and one representative plain-text export.

Review completion requires all three records and an exact branch, HEAD, build
ID, and scope match. The `continue` candidate then requires both:

- owner core journey: `pass`
- unresolved in-scope Blocking/High: `0`

Missing records or a mixed build remain `pending`. A reproducible in-scope
Blocking/High or owner-journey defect requires `fix`; rejection of the core
hypothesis or approach requires `stop`. The owner records one final decision
only after applying this policy.

This is internal PoC evidence only. Automated QA, screenshots, browser smoke,
and agent review do not become observed-user validation or release evidence.
