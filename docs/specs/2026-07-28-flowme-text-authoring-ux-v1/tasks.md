# Tasks

## Design completion

- [x] Phase 0 handoff와 evidence snapshot 준비
- [x] 최종 UX 대안 선택
- [x] authoring grammar와 unsupported 경계 정의
- [x] surface ownership과 state model 정의
- [x] 여덟 사례 mapping 계약 작성
- [x] A/B/C wireflow HTML 제작 및 브라우저 검증
- [x] interactive prototype HTML 제작 및 브라우저 검증
- [x] 독립 UX, 콘텐츠 fidelity, 접근성 검토 통합
- [x] docs check, JSON parse, diff check
- [x] requirement-by-requirement completion audit

## 2026-08-04 v2 completion checkpoint

- [x] Phase 0: dirty worktree·branch·baseline과 기존 변경 경계 확인
- [x] Phase 1: property ownership, unknown/nested 경계, prose 보존, v1 read/v2 write, 27 fixture tests 추가
- [x] Phase 2: parser, writer, supported Markdown round-trip, v2 JSON contract 동시 갱신
- [x] Phase 3: Calendar/ICS 날짜 정렬과 명시적 same-Step source reorder/undo 분리
- [x] Phase 4: 고정 4슬롯, Sheet eligibility/열, Text raw/structured, 상세·링크 preview 구현
- [x] Phase 5: 도움말 progressive disclosure, 읽기 전용 항목 구조, 별도 구조 수정, 제품 5/QA 27 경계, mobile independent scrolling 구현
- [x] Phase 6: standalone HTML, 35-row matrix, U01~U08 브라우저 증거, PNG 9장 재생성
- [x] authoring `147 / 147`, full unit `694 / 694`, focused E2E `12`, Text Authoring-owned TypeScript diagnostics `0`, build `18 / 18`; repo-wide existing diagnostics `190`은 별도 경계로 기록
- [x] 내부 QA와 관찰 사용자 검증을 구분하고 publish 상태를 local only로 기록

정본: [v2 completion report](../../content-audit/2026-08-04-flowme-text-authoring-grammar-ux-improvement-results/README.md).

## Historical 2026-07-31 local implementation checkpoint

Status refreshed on 2026-07-31:

- Worktree: `D:\flowme2605\flow-text-authoring-ta`
- Branch: `codex/text-authoring-ta-implementation-20260729`
- Publish state: uncommitted local changes; no push, PR, or merge; Vercel Preview
  `dpl_737mvF8W3haX63f49fFPGu4UKNgG` is `READY`; production is unchanged
- Validation state: local TA gate green; authoring `90 / 90`, full test pretest
  `100 / 100` + unit `594 / 594` = `694 / 694`, focused Text Authoring E2E
  `23 / 23` clean, rollback E2E `2 / 2`, production build `18 / 18`, and
  security audit vulnerabilities `0`
- Type-check boundary: repo-wide `tsc --noEmit` remains non-zero with `190`
  diagnostics; Text Authoring-owned paths have `0` diagnostics
- Current standalone evidence: regenerated HTML `2,023,183` bytes; loopback
  browser QA at 390/1024/1440px plus `390x600`, `360x640`, and `844x390` had
  document horizontal overflow, console warnings/errors, page errors, and
  external requests `0`. The mobile example bar scrolls internally, and the
  short-height shell reaches each stage bottom above the sticky footer. It
  reflects the current FlowMe visual-token correction
- Review boundary: real-user observation is excluded from this internal PoC;
  owner, Claude Code, and Codex review does not become observed-user validation
- Product exclusions: AI/provider, accounts, cloud persistence/sync, OAuth, direct external writes, and public publishing
- Grammar v1: visible input, examples, guide, parser, and Markdown export use
  canonical Markdown/ISO-based syntax; legacy aliases remain parser-only
  compatibility; repeat/condition text does not create occurrences or RRULE

First open now preloads `제목입니다.` and a three-Item Markdown example covering
Flow/Step/Item, detail, completion, absolute and relative dates, time, timezone,
duration, repeat, place, condition, resource, guide, caution, source, and an
undated Item. Todo keeps all three Items; Calendar gets only the resolvable
dated rows and never invents a date. A collapsed guide records supported and
unsupported boundaries. The top example switcher shows the exact input and
natural artifact for 제주 메모 `5`, qualified 이사 D-30 `27`, K-MOOC `14`,
and Allblanc `7`. Merely viewing stages or switching seed examples creates no
local draft. Editing starts the local recovery path; switching away from dirty
work requires confirmation.

`TA-01` through `TA-06` are locally implemented and their bounded
automated/browser gates are green. The final local verdict is
`ready_for_three_party_internal_review`; publication and observed-user validation
remain separate. The three-party internal gate is active.

## MVP PoC three-party internal gate

- [x] 저장 history/revision cap과 저장 실패 시 직전 값·현재 편집 보존
- [x] 같은 Step의 인접 Item에만 merge 허용
- [x] 누락·불일치 또는 지원하지 않는 source semantic diff를 부분 적용하지 않고 fail closed
- [x] Text Authoring-owned TypeScript diagnostics `0`과 회귀 유지
- [x] [오너·Claude Code·Codex 검토 키트](../../content-audit/2026-07-29-flowme-text-authoring-ta-implementation/mvp-poc-three-party-review-ko.md) 작성
- [x] [Codex 독립 검토 기록](../../content-audit/2026-07-29-flowme-text-authoring-ta-implementation/mvp-poc-codex-review-ko.md)과 branch·HEAD·build ID·범위 일치
- [ ] Claude Code 독립 검토 기록과 branch·HEAD·build ID·범위 일치
- [ ] 오너가 같은 build에서 직접 핵심 여정 확인
- [ ] 세 검토 결과로 `continue / fix / stop` 결정

검토 범위는 `일반 텍스트 -> 원문 보존 Flow -> 최소 수정 1회 -> 로컬
저장·새로고침 복구 -> 대표 plain-text export`다. My Flow/canonical 통합,
대규모 파일 분해, backend/cloud, production deploy, 모든 export 확대는 이
PoC에서 제외한다.

### TA-01 Deterministic authoring contract

상태: **로컬 구현 및 회귀 검증 완료**

문제:
현재 입력 UX에는 자유 텍스트와 canonical 구조 사이의 저장 가능한 중간 계약이 없다.

범위:

- `TextAuthoringDocument`, block, mapping, issue, revision 계약
- 제주 메모와 이사 Markdown deterministic parser adapter
- 원문 fragment lineage
- split/merge/reorder의 stable ID와 undo

비범위:

- AI/provider
- app navigation 변경
- server persistence

완료 기준:

- 같은 원문은 같은 fixture version에서 같은 mapping을 만든다.
- parser가 모르는 문장은 원문과 issue에 남는다.
- canonical source는 수정되지 않는다.

### TA-02 Responsive hybrid shell

상태: **로컬 구현 및 390/1024/1440 브라우저 증거 완료**

범위:

- mobile Input/Structure/Result 단계
- 1024 two-pane + drawer
- 1440 source/outline/artifact 3-pane
- draft recovery banner와 focus restoration

완료 기준:

- 390px horizontal overflow 0
- 첫 preview 전 competing primary action 1개 이하
- keyboard로 세 단계 이동 가능

### TA-03 Mapping correction and contextual inspector

상태: **로컬 구현 및 회귀 검증 완료**

범위:

- merge, split, indent/outdent, reorder
- Item/resource/guide 역할
- title/detail/completion
- progressive property inspector

완료 기준:

- correction마다 undo 가능
- source fragment가 사라지지 않음
- mobile에서 full editor를 강제하지 않음

현재 구현:

- parser가 남긴 issue를 사용자가 `원문에만 남기기 / 할 일로 만들기 /
  나중에 정하기`로 분류할 수 있다. 원문에만 남기면 source/raw text를 보존하고
  Item을 만들지 않으며, 할 일로 만들면 source-linked Item 하나를 만든다.
- 나중에 정하기는 해결 완료가 아니다. issue는 outstanding으로 남고 원래
  blocking이었다면 blocking 상태도 유지되며 저장·복구된다.
- 분류는 source lineage와 안정 ID를 유지하며 revision으로 기록되고 undo할 수
  있다.

### TA-04 Artifact eligibility and loss preflight

상태: **로컬 구현 및 projection parity 검증 완료**

범위:

- primary 1개, secondary 최대 2개
- Calendar/Todo/Sheet/Memo eligibility
- projection count와 loss 설명
- date-less Item의 Calendar 제외

완료 기준:

- 의미 없는 artifact가 노출되지 않음
- K-MOOC 14행과 LibriVox 38장이 유지됨
- export 전 포함/누락 정보가 예측 가능

### TA-05 Ownership, save/export, recovery

상태: **로컬 구현 및 자동·브라우저 회귀 검증 완료**

범위:

- personal draft와 creator draft 분기
- correction suggestion
- save/export receipt
- source updated와 unsaved draft recovery
- Markdown round-trip

완료 기준:

- 저장 대상과 소유자가 명확함
- reload 후 draft 복구 가능
- 공개 원본이 개인 수정으로 덮어써지지 않음

현재 구현:

- creator / personal / correction suggestion별 값과 receipt가 분리된다.
- 실제 XLSX, plain text, ICS 파일을 생성하고 export 성공 후에만 receipt를 만든다.
- 보호 revision이 없는 원문 변경은 짧은 debounce 뒤 현재 단계에서 다시
  계산한다. 저장·보정한 document의 변경은 stale projection 저장을 막고
  incoming source 비교를 요구한다.
- dirty reset은 확인 dialog를 거치며 modal shortcut과 inspector focus가
  background action으로 새지 않는다.
- creator/suggestion lane은 source metadata 유무와 관계없이 권리·안전 review
  requirement를 명시적으로 만든다. 개인 lane의 명시적 caution도 safety gate를
  만든다. 원문 문구만으로 권리·안전을 자동 판정하지 않는다.
- review gate는 `required / evidence_recorded / personal_only`를 구분한다. 로컬
  초안 저장은 항상 허용하지만 unresolved/personal-only gate가 있으면 export,
  creator review 요청, suggestion 제출은 차단한다. 기록된 근거는 사용자의
  기록이지 FlowMe의 승인·법률·안전 판정이 아니다.
- 비개인 lane에서 `personal_only`를 선택하면 공개 원본과 분리된 새 개인
  document/revision으로 fork하고, 원래 creator/suggestion 초안은 그대로
  보존한다. reload recovery와 receipt도 두 lane을 분리한다.
- 저장되었거나 correction revision이 있는 초안의 원문을 바꾸면 active와
  incoming snapshot을 따로 보존한다. `source_updated /
  conflict_source_vs_user` compare에서
  old/incoming/user 값, support 필드(resource/source/guide/caution), structure
  필드(role/include/nesting/order/Step mapping), added/removed를 각각 선택한 뒤
  apply 또는 reject한다.
- source match는 stable entity ID 또는 caller의 explicit match만 사용하며 제목
  유사도·순서로 자동 병합하지 않는다. 외부 source watcher나 crawler는 없다.

### TA-06 Historical final gate

상태: **로컬 regression/readiness 및 visual finish green; Codex lane pass —
`ready_for_three_party_internal_review`**

범위:

- 여덟 사례 unit fixture
- 390/1024/1440 E2E
- keyboard, accessible name, focus, errors
- projection parity와 round-trip regression

완료 기준:

- 자동 QA·오너·Claude Code·Codex 증거가 실제 사용자 검증과 분리됨
- 3자 내부 검토 전에 correctness blocker 0
- rollback marker와 screenshot set 준비

현재 로컬 증거:

- authoring unit은 `90 / 90` 통과했다.
- 여덟 source-backed 사례 각각이
  `input -> mapping/canonical -> artifact -> browser-local save/load ->
  save/export receipt parity`를 검증한다. 이사 27, 차량 10, Allblanc 7,
  K-MOOC 14, LibriVox 38, 신차 14, 안전정보 4, 제주 5의 source 의미·순서·
  조건·resource/caution 경계를 보존한다.
- full test는 pretest `100 / 100` + unit `594 / 594` = `694 / 694`,
  focused Text Authoring Playwright는 `23 / 23` clean으로 통과했다. 실시간
  입력 반영·완료 표시, 예시 전환 시 입력 scroll 초기화, 전체 문법 기본
  예시, 상단 대표 콘텐츠 전환과 기존 정보
  밀도 계층, review/source compare, 원래 해석 복구,
  personal fork, correction suggestion, reload recovery, storage failure와
  짧은 화면의 Input/Structure/Result 하단 도달 검증을 포함한다.
- production build는 `18 / 18` static pages, legacy rollback 회귀는
  `2 / 2`로 통과했다.
- repo-wide `tsc --noEmit`은 non-zero, diagnostics `190`으로 non-green이다.
  Text Authoring 소유 경로 diagnostics는 `0`이다.
- 현재 standalone HTML은 `2,023,183` bytes로 재생성했고, loopback browser
  QA는 390/1024/1440px와 `390x600`, `360x640`, `844x390`에서 document
  horizontal overflow, console warning/error, page error, external request
  `0`이었다. 모바일 예시 bar는 document를 넓히지 않고 내부 scroll하며,
  짧은 화면에서는 shell scroll이 각 단계 마지막 콘텐츠와 sticky footer까지
  연결한다. 현재 FlowMe 색감 복원 소스와 같은 체크포인트의 증거다.
- security audit는 vulnerabilities `0`으로 통과했다.
- `/flows/new?legacy=1`과 `FLOWME_TEXT_AUTHORING_ENABLED=0`이 legacy `NewFlow` rollback 경로를 소유한다.
- 내부 3자 검토가 통과하더라도 observed-user validation을 뜻하지 않는다.
- repo-wide type-check failure를 Text Authoring green으로 숨기지 않고,
  Text Authoring-owned diagnostics `0`과 repository diagnostics `190`을
  분리해서 보고한다.

## Remaining external decisions

로컬 v2 구현과 내부 QA는 닫혔다. 남은 결정은 구현 계속이 아니라 외부 상태
승인이다.

1. commit, push, PR, merge, 새 Preview, production deploy 중 필요한 범위를
   각각 승인한다.
2. 실제 저작 사용성을 확인하려면 별도의 대상 사용자 과업·관찰 계획을 승인한다.
3. nested Item, prose import-assist, recurrence expansion, My Flow 통합, 직접
   외부 쓰기는 별도 spec과 검증 gate 없이는 열지 않는다.

그전까지 v2는 미커밋 로컬 checkpoint이며 P35 production은 변경하지 않는다.
