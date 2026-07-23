# Revised rules v1

상태: `frozen_for_revised_calibration_and_final_holdout`

작성 시점: 2026-07-21 10:36 KST — 18개 source packet의 Flow 생성 전

이 파일은 Calibration 결과를 본 뒤 허용되는 **한 번의 공통 규칙 개정**을 기록할 고정 위치다. 현재 정책은 `baseline-rules-v1.md`와 동일하며, URL·provider·주제·case ID에 의존하는 예외는 없다.

## Revision 0 — baseline과 동일

1. 원문 완전성을 `complete`, `partial`, `metadata_only`, `missing`으로 먼저 판정한다.
2. `partial`, `metadata_only`, `missing`에서는 canonical Item과 usable projection payload를 만들지 않는다.
3. 확보한 모든 SourceRow는 `item`, `field`, `memo`, `reference`, `conditional_response`, `omission` 중 정확히 하나로 배정한다.
4. 모든 Item은 한 개 이상의 SourceRow를 참조하며, 원문에 없는 행동·날짜·반복·수량·완료 기준을 추가하지 않는다.
5. 경고·법적 문턱·마케팅 문구·누락 경계는 일반 체크 Item으로 바꾸지 않는다.
6. 원문에서 확보한 값을 사용자에게 다시 입력시키지 않는다. 첫 useful preview 전 사용자 소유 입력은 기본 0개, 일반 최대 2개다.
7. Calendar/ICS는 원문 일정 또는 사용자 anchor로 계산 가능한 일정이 있을 때만 만든다. 조건 trigger는 날짜가 아니다.
8. `calendar`, `checklist`, `todo`, `sheet`, `memo` 중 primary artifact 하나만 선택한다. `hybrid`는 금지하고 나머지는 secondary로 표현한다.
9. source completeness, access, rights, freshness, locale, safety, privacy, public export, personal preview를 독립 gate로 기록한다.
10. 증거가 부족하면 `source_import_required`, `hold`, `blocked`로 멈춘다.

## Calibration 이후 기록 규칙

- Calibration 12건에서 반복되는 defect class가 확인될 때만 Revision 1을 추가한다.
- 사례 이름이나 URL을 조건으로 하는 예외는 추가하지 않는다.
- Revision 1을 적용하면 이 파일의 SHA-256을 manifest의 `revisedRulesHash`와 `finalHoldoutRulesHash`에 동일하게 기록한다.
- Final holdout 결과를 연 뒤에는 이 파일을 수정하지 않는다.

## Revision 1 — retained state와 user anchor를 먼저 판정

동결 시점: 2026-07-21 · baseline calibration 36개를 비교한 뒤, revised calibration과 final holdout을 열기 전

Baseline calibration에서 세 방식 모두 Flow 가능 여부 12/12와 경계 recall 4/4를 맞혔지만, 정상 8건의 primary artifact는 규칙 5/8, 저비용 5/8, 고성능 4/8만 gold와 일치했다. 반복된 결함은 원문에 행이나 단계가 많다는 이유로 Checklist를 우선하고, 실제로 다음 세션까지 남겨야 하는 상태를 뒤로 미룬 것이다.

이 결함을 고치기 위해 다음 공통 결정 순서를 추가한다.

1. Item 수나 문장 모양보다 **사용자가 다음에 다시 열 때 남아 있어야 하는 상태**를 먼저 고른다.
2. source가 기한·날짜창·고정 주기·예약 회차를 정의하고, 실제 날짜가 사용자 소유 anchor 1~2개로 계산되면 `calendar`가 primary다. anchor가 아직 없으면 `needs_confirmation`으로 두고 입력을 요청하며, Checklist로 primary를 내리지 않는다. ICS event는 anchor가 확정된 뒤에만 만든다.
3. 다섯 개 이상의 안정된 resource/plan row에서 상태·선택·진행 위치를 계속 보존해야 하면 `sheet`가 primary다. 각 row가 읽기/소비 행동처럼 보여도 일회성 Checklist로 바꾸지 않는다.
4. 비교의 최종 가치가 한 가지 선택과 그 이유를 남기는 데 있으면 `memo`가 primary이고 비교표는 secondary `sheet`다.
5. 단일 bounded session에서 순서대로 빠뜨리지 않아야 할 행은 `checklist`, 하나의 독립 next action은 `todo`다.
6. 필요한 사용자 anchor, 적용 모델, 방문 회차, 계정/대상 조건이 아직 확인되지 않았으면 `needs_confirmation`이다. source에서 이미 아는 기한·주기·회차를 다시 묻지 않고, 사용자 소유 anchor 또는 선택만 최대 2개 묻는다.
7. 자격 규칙·시간표 선택지·경고·과태료·blackout window는 Item 수를 늘리는 재료가 아니다. 실행을 제약하는 field/reference/condition으로 보존하고, 이를 포함해 실제 행동을 완료 가능한 Item으로 합친다.

이 Revision은 URL, provider, 주제, case ID를 조건으로 사용하지 않는다. 이후 final holdout 결과를 본 뒤에는 변경하지 않는다.
