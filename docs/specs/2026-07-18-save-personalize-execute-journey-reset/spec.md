# Save, Personalize, Execute Journey Reset Spec

**Date:** 2026-07-18
**Status:** Proposed - planning and prototype gate only
**Owner:** Product owner + Codex
**Related roadmap:** [P24 journey-frame correction](../../ROADMAP.md#p24-journey-frame-correction-gate)

## Goal

FlowMe의 첫 핵심 여정을 `콘텐츠 판단 -> 필요한 만큼 조정 -> 저장 -> 전체 결과 확인 -> 오늘 실행 -> 날짜 실행`으로 다시 정렬한다. 현재 기능과 4탭 IA를 유지하되, 긴 설명을 읽어야만 저장 결과를 이해하거나 저장 직후 전체 Flow를 찾기 위해 탭과 카드를 추가로 여는 문제를 먼저 해결한다.

이번 spec의 첫 단계인 **P24-J0는 앱을 수정하지 않는다.** 현재 production, 기존 콘텐츠 편집 시뮬레이션, Claude Design 목업, 인접 서비스 패턴을 근거로 대안 와이어프레임을 만들고 작은 사용자 테스트를 거쳐 구현안을 선택한다.

## Stage Fit

P23/P24에서 제목·날짜·메모·구조·완료·내보내기 기능은 대부분 연결됐다. 지금 필요한 것은 기능 추가가 아니라 사용자가 그 기능을 어떤 순서와 화면에서 만나는지 정리하는 것이다. 실제 사용자 세션이 `0 / 15`인 상태에서 긴 기존 관찰 스크립트를 그대로 실행하기보다, 이번 owner feedback으로 확인된 첫 여정의 프레임을 먼저 짧게 검증하는 편이 비용이 낮다.

다음은 이번 program에서 확장하지 않는다.

- 4탭 IA 교체
- 저장·실행·export 데이터 계약 재작성
- AI API, 계정, DB, cloud sync, OAuth
- Studio의 5번째 탭 승격
- source-backed 원본의 직접 편집
- 모든 콘텐츠 유형을 한 번에 재설계

## User Need

처음 Flow를 보는 사용자는 설명문을 해석하지 않고도 무엇이 저장되는지 미리 보고, 그대로 쓸지 조금 조정할지 선택하며, 저장 직후 전체 계획이 제대로 들어왔는지 확인한 다음 오늘 할 일이나 Calendar로 자연스럽게 이동할 수 있어야 한다.

## Problem Statement

1. 이사와 public Flow 화면에서 같은 저장 결과가 여러 문장과 chip으로 반복된다.
2. 저장 직후 `/my`는 오늘 항목을 우선해 전체 Flow가 제대로 저장됐는지 확인하기 어렵다.
3. `그대로 저장`과 `조정하고 저장`의 경계가 사용자 여정에서 명확하지 않다.
4. My Flow의 범위 선택과 Calendar의 날짜 없는 목록이 역할상 혼동된다.
5. `실행 보류` 콘텐츠가 일반 실행 목록에 섞여 현재 사용할 수 있는 콘텐츠처럼 보인다.
6. 기존 시뮬레이션은 원하는 계약을 이미 그렸지만 현재 product surface와 연결해 평가하지 않았다.

## Target Journey

```text
Flow 미리보기
-> 전체 구조와 저장 결과 판단
-> 그대로 저장 또는 필요한 만큼 조정
-> 저장 직후 전체 Flow 확인
-> 오늘 실행 시작
-> Calendar에서 날짜가 있는 일 실행
-> 날짜 없는 일은 별도 tray에서 날짜 배치
```

## Scope

### In

- 기준일 역산형 `moving-d30`
- 날짜 없는 체크리스트형 `vehicle-inspection-prep`
- 개인 메모 draft형
- public/save-before 화면의 설명 밀도와 artifact preview
- 저장 전 최소 조정과 저장 후 깊은 편집의 경계
- 저장 직후 전체 Flow 확인 화면
- 재방문 My Flow Today와 전체 Flow의 역할
- Calendar dated grid와 undated tray의 역할
- held/review 콘텐츠의 일반 실행 목록 노출 정책
- 모바일 390px과 wide 1024px 와이어프레임·프로토타입 검토

### Out

- production 앱 코드 변경은 P24-J1 이후
- 반복·회차 계약 재설계
- 새로운 export destination
- arbitrary URL fetch 또는 live AI 생성
- source-backed Flow의 add/delete/reorder 확대
- 직접 외부 도구 동기화

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | 전체 Flow 미리보기를 보고 `그대로 저장` 또는 `조정하고 저장`을 선택한다. |
| Completion signal | 저장 직후 별도 탐색 없이 Flow 제목, 기준일, 전체 항목 구조와 다음 행동을 확인한다. |
| Artifact destination | 전체 Flow는 My Flow, 날짜 있는 항목은 Calendar/ICS, 날짜 없는 항목은 My Flow/list export와 Calendar tray에 남는다. |
| Source/risk boundary | 출처·주의·세부 근거는 삭제하지 않고 접힌 상세에 유지한다. 실행 보류 콘텐츠는 일반 목록에서 숨긴다. |
| Natural artifact | 이사는 5시점 timeline, 차량 점검은 날짜 없는 checklist, 메모 draft는 개인 task list로 보인다. |
| Verification | current-state replay, 대안 와이어프레임, 2개의 10분 prototype test, 선정안 E2E와 production observation |

## Design Hypotheses

1. 긴 설명을 줄이되 정보 자체를 없애지 않고 `구조 미리보기`, 짧은 label, 접힌 출처/주의로 옮기면 이해가 빨라진다.
2. 저장 전에는 `그대로 저장`과 선택형 `조정하고 저장`만 제공하고 full editor를 강제하지 않는 것이 가장 낮은 마찰을 만든다.
3. 저장 직후 한 번은 전체 Flow를 기본으로 보여주고, 재방문부터 Today를 기본으로 여는 것이 확인과 실행을 모두 만족시킨다.
4. Calendar grid에는 날짜 있는 항목만 두고 날짜 없는 일은 별도 tray에서 일정으로 옮기게 해야 한다.
5. held/review 콘텐츠는 삭제하지 않되 일반 탐색·실행 surface에서 숨기고 복구/관리 surface에서만 접근하게 해야 한다.

## Acceptance Criteria For P24-J0

- 현재 화면과 기존 시뮬레이션의 차이를 세 대표 여정으로 기록한다.
- `빠른 저장 중심`과 `artifact-first + optional adjust` 두 대안을 같은 정보로 비교한다.
- 추천안의 390px/1024px 와이어프레임에서 저장 전, 조정, 저장 직후, 재방문 My Flow, Calendar 역할이 연결된다.
- 설명문은 기능 설명이 아니라 사용자가 결정을 위해 꼭 알아야 하는 내용만 남기는 기준을 정의한다.
- prototype tester가 도움 없이 10초 안에 `무엇이 저장되는지`와 `어디서 조정하는지` 답할 수 있는지 측정한다.
- 저장 직후 전체 Flow 확인에는 탭 전환이나 카드 펼치기가 필요하지 않다.
- P24-J1~J5의 구현·재검증 순서와 중단 조건이 확정된다.
- 앱 runtime 코드와 저장/export schema는 변경하지 않는다.

## Program Exit Criteria

다음 조건이 모두 충족될 때만 기존 P24-00B의 5명 x 3회 관찰을 재개한다.

- 대표 두 여정에서 저장 전 설명 없이 저장 결과를 예측한다.
- 저장 직후 전체 artifact를 확인하고 Today/Calendar의 역할을 구분한다.
- 긴 설명을 읽지 않아도 primary action을 선택한다.
- held 콘텐츠가 ordinary execution surface에 0건 노출된다.
- 모바일/와이드 production regression과 접근성 검증이 통과한다.
- 작은 재검증에서 Blocking finding이 0건이다.
