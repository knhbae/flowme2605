# P33 Cross-entry Canonical Alignment Spec

**Date:** 2026-07-24  
**Status:** Implemented locally; publish verification pending  
**Owner:** Codex with product-owner review  
**Related roadmap:** P33 follows the released P32 focused My Flow workspace.

## Goal

Home, Flow 찾기, URL lookup, direct public alias가 같은 원문과 같은 사용자 목적을 가리킬 때 하나의 canonical Flow를 열고 저장하게 한다. 기존 24개/5개 개인 저장본은 자동 병합하거나 삭제하지 않고, 사용자가 사용할 사본을 선택할 때까지 원래 identity와 실행 기록을 보존한다.

## Stage Fit

P32에서 My Flow 내부 명령 구조를 정리한 다음 필요한 correctness 작업이다. 전역 IA나 planner 기능을 다시 설계하는 작업이 아니라, 이미 존재하는 entry shell과 저장·투영 경로가 같은 제품 객체를 가리키게 하는 제한된 정합성 수정이다.

## User Need

같은 이사 체크리스트를 Home 또는 Flow 찾기에서 연 사용자는 진입 경로와 상관없이 같은 전체 내용을 확인하고, 중복 Flow를 만들지 않은 채 기존 개인화와 실행 기록을 이어가야 한다.

## Scope

In:
- source + user job + editorial variant로 구성한 canonical identity
- route/public slug/Flow Map/URL lookup alias registry
- AJD moving의 24개 canonical snapshot과 5개 legacy compact snapshot 명시
- cross-entry route/detail/artifact/save invariant
- additive dual-read/single-write 저장 adapter
- 기존 중복 사본의 명시적 선택과 비활성 사본 보관
- receipt, My Flow, Calendar, export의 canonical identity 정합성
- artifact false affordance와 raw RRULE 표현 제거

Out:
- 24개/5개 Item 상태 자동 병합
- 기존 localStorage key 삭제
- source URL만을 이용한 전역 중복 판정
- 4탭 IA, public `/f` shell, P32 focused workspace 재설계
- 계정, DB, cloud sync, AI/crawler, OAuth
- 자동화 결과를 실제 사용자 검증으로 표현

## Editorial Decision

- `moving-d30-basic`의 24개 snapshot을 신규 진입의 canonical public snapshot으로 사용한다.
- 기존 5개 snapshot은 여러 원문 행동을 합친 legacy compact editorial variant다.
- 5개 Item은 24개 Item의 stable subset이 아니므로 `핵심 5개 선택`으로 자동 변환하지 않는다.
- 신규 Home/Find/URL/direct alias는 `/f/moving-d30-basic`으로 정렬한다.
- 기존 5개 저장본과 실행 기록은 보존하며, 중복이 있을 때 사용자가 active copy를 선택한다.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Home, Find 또는 URL lookup에서 이사 Flow를 연다. |
| Completion signal | 어느 entry에서도 24개 canonical detail과 같은 저장 identity가 확인된다. |
| Artifact destination | Calendar가 primary이고 Checklist/Memo는 eligibility 기반 secondary다. |
| Source/risk boundary | AJD 원문 source identity와 FlowMe editorial snapshot을 분리한다. |
| Natural artifact | 이사일 기준 24개 일정 및 체크 항목과 개인 메모·완료 상태다. |
| Verification | registry/invariant/storage unit, targeted E2E, 390/1024/1440 browser evidence, full test/build/docs gate다. |

## Acceptance Criteria

- AJD moving의 네 entry가 같은 source/job candidate group으로 진단된다.
- 24개/5개 차이는 unresolved diagnostic에서 canonical write를 차단한다.
- editorial decision 이후 신규 entry는 `/f/moving-d30-basic`을 연다.
- 신규 저장은 canonical saved slug를 사용한다.
- 기존 alias 저장 키는 dual-read 대상이며 자동 삭제·자동 병합하지 않는다.
- 중복 사본 선택 전 개인 값·run·occurrence·export identity 손실은 0이다.
- 선택 후 비활성 사본은 보관되며 복구할 수 있다.
- Home/Find/URL/direct entry의 title, item count, artifact eligibility가 일치한다.
- moving/vehicle artifact control은 실제 선택과 저장 결과를 바꾼다.
- My Flow에서 raw RRULE이 사용자 문구로 변환된다.
- source/personal/run/occurrence/export stable identity 계약은 유지된다.
