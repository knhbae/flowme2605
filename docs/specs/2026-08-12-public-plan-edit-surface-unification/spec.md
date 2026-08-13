# Public Plan/Item Edit Surface Unification

**Status:** RELEASED THROUGH PR #178 AND DATE PARITY PR #182 / CI-PRODUCTION-SMOKE PASS / OBSERVED USERS 0

**Owner decision:** 2026-08-12

**Base:** `origin/main` at `2f93f00d6539aa8125faccb7ad944eaf3397e7bc`

## Goal

공개 일반 Flow인 `/f/[slug]`와 실행 가능한 `/flow-maps/[map]`이 하나의
Public Plan/Item 편집 surface를 사용하게 한다. 두 출처는 같은 적용·취소,
Escape, 브라우저 Back, focus 복귀 규칙을 사용하고, 최종 저장은 기존 출처별
identity와 persistence transaction을 그대로 사용한다.

사용자 화면에서는 실행 가능한 Flow Map을 별도의 계획 종류나 별도 편집기로
보이지 않게 평탄화한다. Flow Map은 호환 route와 내부 source bundle·aggregate
identity로 남길 수 있지만, 사용자는 실제로 실행할 하나의 Flow를 보고 같은
방식으로 조정한다.

## User problem

일반 `/f`는 공통 Public Plan/Item editor를 사용하지만, 실행 가능한 Flow Map은
제목과 포함 항목만 다루는 전용 sheet와 별도 history state를 사용한다. 따라서
같은 `수정` 행동이 필드 순서, Item 진입, 적용 시점, dirty 취소, 브라우저 Back,
focus 복귀에서 다르게 동작한다. 현재 콘텐츠에서 이 차이는 사용자 가치보다
별도의 `Flow Map` 개념과 편집법을 학습시키는 비용을 만든다.

## Product contract

### One public Plan/Item editor

- `/f/[slug]`와 `save_all` 방식의 실행 가능한 `/flow-maps/[map]`은 같은 shared
  Public Plan/Item editor component와 controller를 사용한다.
- Plan 편집의 필드 순서와 계층은 `계획 이름 -> 기준일/시작 기준 -> 항목
  포함·순서 -> Item 상세 -> 출처·주의`를 기본으로 한다. 출처가 실제로
  지원하지 않는 capability만 조건부로 숨기거나 read-only로 표시한다.
- 실행 가능한 단일 계획 Map의 Item도 일반 Flow와 같은 `할 일 -> 메모 -> 날짜
  -> 원문` 필드 순서를 사용한다. 개인 날짜는 기존 `fixed_date` override만 쓰고,
  reset은 새 무날짜 schema를 만들지 않고 현재 anchor의 source projection으로
  돌아간다. 원래 무날짜인 Item은 `날짜 없음`으로 돌아간다.
- Plan과 Item의 surface, 필드 순서, 적용 위치, 취소 위치는 출처 이름 때문에
  달라지지 않는다. Map 전용 제목·항목 선택 sheet를 별도 제품 문법으로 남기지
  않는다.
- Item의 `계획에 반영`은 부모 Public Plan draft만 갱신한다. Plan의 `변경 적용`은
  현재 공개 session의 effective draft만 갱신한다. 어느 단계도 최종 공개 저장
  전에는 persistent storage를 쓰지 않는다.
- 최종 저장 행동에서만 기존 origin별 save transaction이 실행된다.

### Shared close, Back, and focus contract

- 변경이 없는 Cancel, 닫기, backdrop, Escape, 브라우저 Back은 확인창 없이
  가장 안쪽 editor를 닫고 정확한 opener와 scroll 위치로 돌아간다.
- 변경이 있는 같은 close 경로는 모두 하나의 discard confirmation을 거친다.
  계속 편집하면 draft와 focus를 유지하고, 변경을 버리면 원래 Plan 또는
  opener로 돌아간다.
- Plan에서 Item을 열었다가 적용하거나 취소하면 해당 Item의 진입 control로
  focus가 복귀한다. Plan editor를 닫으면 공개 화면의 `수정` opener로 focus가
  복귀한다.
- 브라우저 Back은 route 이탈보다 editor history layer를 먼저 처리한다. dirty
  확인 결과가 정해지기 전에 draft를 버리거나 route를 이동하지 않는다.
- recovery 또는 submit 중에는 중복 적용과 닫기를 막고, 실패한 draft와 첫 오류
  focus target을 유지한다.

### User-facing Flow Map flattening

- `save_all` Map은 유효 Plan 하나를 일반 Flow와 같은 shell로 보여 주며, 별도의
  Flow Map 편집 종류·카드·조정 문법을 노출하지 않는다.
- `choose_child` Map은 child Flow 선택기 역할만 한다. 선택 후 canonical child
  `/f/[slug]`로 이동하고, 조정은 그 경로의 공통 Public Plan/Item editor에서 한다.
- `review_hold` Map은 검토 보류 이유와 허용된 읽기 행동만 보여 준다. 편집기,
  조정 CTA, 저장 가능한 것처럼 보이는 control을 노출하지 않는다.
- route 호환성 때문에 `/flow-maps` URL이 남더라도 사용자-facing plan type은
  `Flow` 하나다.

### Origin identity and persistence boundaries

- 일반 Flow의 canonical Flow/version/source identity와 기존 저장 transaction을
  유지한다.
- Flow Map의 Map ID, Map version, child Flow ID, canonical child Item ID,
  effective snapshot, persistence/bridge record, storage key와 저장 transaction을
  유지한다.
- 공통 editor는 lossless session draft와 origin adapter만 제공한다. Map을 새
  canonical Flow로 합치거나 새 personal-copy key를 만들지 않는다.
- schema migration, storage-key migration, legacy record promotion, source/creator
  version mutation을 수행하지 않는다.
- 취소·discard·Item 적용·Plan 적용은 관련 persistent bytes를 바꾸지 않는다.
  최종 저장과 reload 뒤에는 해당 origin의 기존 record가 같은 identity로 편집
  결과를 복원해야 한다.

## Scope

- 공개 `/f/[slug]`와 실행 가능한 `/flow-maps/[map]`의 shared Public Plan/Item
  editor surface와 origin adapter
- `save_all`, `choose_child`, `review_hold` 사용자-facing 분기 평탄화
- Item 적용과 Plan 적용의 두 단계 session-draft transaction
- Cancel, 닫기, backdrop, Escape, 브라우저 Back, focus·scroll 복귀
- 390/1024/1440 responsive와 keyboard/accessibility 검증
- 일반 Flow·Flow Map 최종 저장, reload, storage/identity 회귀

## Out of scope

- Map ID·version·record schema·storage key migration 또는 Map 데이터 삭제
- creator/source publish package 수정, version merge, account/cloud persistence
- `choose_child`를 하나의 Map Plan으로 합치거나 `review_hold`를 실행 가능하게 변경
- 원래 날짜가 있는 Map Item에 별도 unscheduled tombstone/schema를 추가하는 기능.
  이 좁은 후속 범위에서 `날짜 없애기`는 원래 무날짜 Item에만 쓰고, 원래 날짜가
  있는 Item은 `원래 날짜로` reset한다.
- My Flow의 저장 후 편집 lifecycle 재설계
- commit, push, PR, merge, deployment, and production smoke were outside the
  implementation scope and were executed later through the separately
  authorized release recorded below.
- observed-user validation. 자동화, 스크린샷, 시뮬레이션, 내부 QA는 실제 관찰
  사용자 수를 늘리지 않으며 현재 값은 `0`이다.

## Acceptance criteria

1. `/f/[slug]`와 `save_all` `/flow-maps/[map]`의 `수정`이 같은 shared Public
   Plan/Item editor component와 controller를 연다.
2. URL·콘텐츠 제목을 가리면 두 출처의 editor를 별도 제품으로 구별할 수 없을
   정도로 Plan/Item 계층, 필드 순서, CTA 위치와 close 동작이 같다.
3. Item `계획에 반영`은 부모 draft만, Plan `변경 적용`은 session effective
   draft만 바꾸고, 최종 저장 전 persistent storage write는 `0`이다.
4. clean·dirty Cancel, 닫기, backdrop, Escape, 브라우저 Back이 같은 discard
   규칙을 따르며 draft 손실이나 의도치 않은 route 이탈이 없다.
5. Plan -> Item -> Plan과 editor -> 공개 화면 복귀에서 정확한 opener focus와
   scroll 위치가 복원된다.
6. `save_all`은 사용자-facing Flow로 평탄화되고, `choose_child`는 선택 후 `/f`로
   이동하며, `review_hold`에는 editor와 조정 CTA가 없다.
7. Flow Map의 Map/version/child/Item identity, snapshot/persistence/bridge,
   storage keys와 transaction owner가 변경되지 않으며 schema migration은 없다.
8. 일반 Flow와 Flow Map 모두 최종 저장 후 reload에서 같은 identity로 적용된
   제목·기준·포함·순서·Item 제목·메모·날짜 편집 결과를 복원한다. Map 날짜
   reset은 source-undated/source-dated 기준값을 같은 Plan session에서 즉시 보여 준다.
   아직 Plan에 반영하지 않은 새 기준일도 Item 행·편집·reset에 즉시 반영되며,
   source date와 같은 기존 fixed-date pin은 무변경 시 보존하고 명시 reset 시 제거한다.
9. 390/1024/1440에서 한 editor dialog, 도달 가능한 sticky actions, 48px touch
   targets, focus trap, 가로 overflow·clipping `0`을 검증한다.
10. focused unit/component/E2E, persistence regression, production build와
    `docs:check`가 통과하고, publication과 observed-user evidence는 별도로 기록한다.

## Reopen triggers

다음 중 하나가 필요할 때만 이 경계를 다시 연다.

- server-issued immutable Map/child/Item identity 또는 account-backed persistence 도입
- 기존 storage key나 record schema 없이는 공통 draft를 lossless하게 복원할 수 없음
- 실제 관찰 사용자가 `choose_child` 선택기 또는 평탄화된 Flow의 출처 관계를
  반복해서 이해하지 못함
- source publisher의 version 정책이 child Flow identity를 바꿈

## Release outcome

This implementation shipped with the My Plan editor/lifecycle foundation
through [PR #178](https://github.com/knhbae/flowme2605/pull/178). Final head
`3cac3cde5bbcf6297b93b8299bfe28693700aebf` passed exact-head CI run
[`31596540934`](https://github.com/knhbae/flowme2605/actions/runs/31596540934)
and merged as `908ee849beb15cb10331b72d7894167a61458b18` at
`2026-08-12T12:42:45Z`. Production deployment record `5869458520`, status
`16715443863`, succeeded and canonical smoke passed `38/38`. Post-merge `main`
run [`31597763288`](https://github.com/knhbae/flowme2605/actions/runs/31597763288)
passed core job `94117373437` and Playwright job `94117373461`. See the
[release record](../../pr-history/2026-08-12-plan-edit-lifecycle-unification.md).
Observed users remain `0`.

The 2026-08-13 Item date-parity follow-up shipped through
[PR #182](https://github.com/knhbae/flowme2605/pull/182). Final head
`0aca76687ac582ff4cf11b19a0f46db5593c768e` passed exact-head CI run
[`31655643163`](https://github.com/knhbae/flowme2605/actions/runs/31655643163)
and merged as `f6f796c035d5762eea07ec35abb7f1af1577a5a5` at
`2026-08-13T01:05:33Z`. Production deployment record `5880059975`, status
`16743295490`, succeeded and canonical smoke passed `41/41` with workers `1`,
retries `0`, in `264804.24ms`; unexpected, flaky, and skipped results were `0`.
Post-merge `main` run
[`31656595092`](https://github.com/knhbae/flowme2605/actions/runs/31656595092)
passed core job `94312307779` and Playwright job `94312307849`. See
the [date-parity release record](../../pr-history/2026-08-13-flow-map-item-date-parity.md).
This is automated release evidence; observed users remain `0`.

## Related docs

- [P0-06 public/saved Plan/Item editor closeout](../2026-08-04-p35-round2-bounded-ux-correction/p0-06-closeout.md)
- [P0-02 Flow Map selected/applied/preview/save parity](../2026-08-04-p35-round2-bounded-ux-correction/p0-02-closeout.md)
- [My Plan edit and lifecycle unification](../2026-08-12-my-plan-edit-lifecycle-unification/spec.md)
- [Canonical product decisions](../../DECISIONS.md)
