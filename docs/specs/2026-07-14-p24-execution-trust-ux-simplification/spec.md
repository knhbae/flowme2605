# P24 Execution Trust and UX Simplification

**Date:** 2026-07-14
**Status:** Planned, implementation not started
**Owner:** FlowMe product / UX / frontend / QA
**Primary review artifact:** `docs/content-audit/2026-07-14-flowme-p24-feedback-reconciliation/workboard.html`

## Purpose

P23에서 연결한 발견, 저장, 개인화, 일정, 실행, 완료, export, 회고, 재사용 흐름을 실제 사용자가 믿고 다룰 수 있는 수준으로 정리한다. 이번 프로그램은 기능 수를 늘리는 작업이 아니다. 서로 다른 화면이 같은 effective Item 상태를 읽도록 바로잡고, 설명문을 조작 가능한 상태와 명확한 범위 선택으로 치환하는 작업이다.

## Why Now

세 종류의 증거가 동시에 쌓였다.

1. 실제 사용자 피드백은 완료 취소, 날짜 이동, 날짜 없는 할 일, export 범위, 실행 중 메모가 어렵거나 불명확하다고 말한다.
2. 깨끗한 `69768a1` 기준선의 Codex 브라우저 감사는 KST 오전 날짜 오류, 반복 Today 중복, 빈 miss draft 생성, Vercel SSO를 확인했다.
3. 현재 dirty dependency 환경의 Claude Code 감사는 build 실패, 반복 회차 누락, 메모 분할 항목 은닉, 요약 날짜 불일치, 재사용 날짜 유지 실패를 확인했다.

Claude Design 제안은 이 문제를 추가 설명이 아니라 progressive disclosure, inline undo, 날짜 없음 tray, 범위 선택, 날짜 모드 표식, 중복 실행행 제거, 실행 중 메모로 풀 것을 제안한다.

## Evidence Boundary

| Evidence | Meaning | Planning use |
| --- | --- | --- |
| `observed_user_feedback` | 사용자가 실제 화면을 사용하며 말한 불편 | 문제 우선순위와 관찰 질문의 1차 입력 |
| `clean_baseline_automated` | 깨끗한 tracked commit에서 실행한 명령/브라우저 결과 | 현재 제품 기준선의 강한 재현 증거 |
| `dirty_dev_automated` | 미커밋 dependency 변경이 섞인 dev 환경 결과 | 우선 재현할 결함 후보, production 확정 근거는 아님 |
| `design_proposal` | Claude Design 목업과 해석 | 구현안 후보, 사용자 검증 결과는 아님 |
| `official_reference` | 공식 제품/디자인 시스템 문서 | 상호작용 패턴의 비교 근거 |

두 자동 감사가 다른 build 결과를 낸 사실을 덮지 않는다. `P24-00R`에서 동일 commit, 동일 lockfile, 동일 Node, 동일 명령으로 다시 분리 재현하기 전에는 dirty 환경 finding을 production defect로 확정하지 않는다.

## Product Rules

### 1. Correctness before simplification

- local date, effective date, recurrence occurrence, persistence, export count가 틀린 상태에서 시각 개편을 진행하지 않는다.
- My Flow, Calendar, Today summary, reuse, export는 각자 날짜나 Item 목록을 다시 계산하지 않는다.

### 2. One state, one primary control

- 한 occurrence의 완료 control은 현재 실행 화면에 한 번만 노출한다.
- `열기`, 완료, 수정, 이동, export는 서로 다른 행동으로 보이게 한다.
- 완료 직후에는 같은 화면에서 취소할 수 있어야 한다.

### 3. Today and All have different jobs

- Today는 지금 실행할 항목 중심이다.
- All은 Flow 구조, 완료 기록, 전체 수정과 관리 중심이다.
- 완료 취소를 위해 Today에서 All로 이동하도록 강제하지 않는다.
- 탭 자체를 없애는 판단은 관찰 없이 확정하지 않는다.

### 4. Unscheduled is a first-class state

- 날짜 없는 할 일은 유실되거나 숨겨진 상태가 아니다.
- My Flow 목록과 list export에는 남고 Calendar에서는 명시적인 `날짜 없음` 보관 영역으로 발견할 수 있어야 한다.
- Calendar 날짜에 배치하기 전까지 임의 날짜를 만들지 않는다.

### 5. Scope before operation

- 날짜 이동은 `한 항목`, `선택한 항목`, `Flow 기준일`을 구분한다.
- 반복 일정은 `이번 회차`, `이번부터`, `전체 반복`을 별도 계약으로 다룬다.
- export는 `전체 Flow`, `선택한 항목`, `현재 항목` 범위를 먼저 고르고 형식을 고른다.
- 날짜 이동과 export는 같은 다중 선택 interaction을 재사용할 수 있다.

### 6. Progressive disclosure, not explanatory prose

- 기본 편집 화면에는 제목, 날짜, 시간처럼 대부분이 쓰는 값만 둔다.
- 반복, 소요 시간, 결정/기록 field는 값 또는 Item intent가 있을 때만 노출한다.
- 기능 부재를 장문 카드로 설명하지 않는다. 현재 상태, badge, disabled state, inline feedback을 우선한다.

### 7. Feedback can happen during execution

- 항목별 한 줄 메모나 수정 제안은 실행 중 선택적으로 남길 수 있다.
- 마지막 회고는 이미 남긴 메모를 모아 보는 단계가 된다.
- 별점, 감정 tag, 필수 회고를 강제하지 않는다.

### 8. Unknown URL handling stays honest

- 사전 등록되지 않은 URL은 현재 production fetch/AI 변환 기능이 아니다.
- miss 상태는 직접 초안을 만들거나 요청을 남기는 경로로 설명한다.
- 실제 arbitrary URL fetch, extraction, real LLM은 security, rights, retention, cost gate가 닫히기 전 열지 않는다.

## Workstream Scope

| Lane | Goal |
| --- | --- |
| Baseline | clean tracked runtime과 dirty dependency 후보를 분리하고 finding을 재분류한다. |
| Correctness | local date, effective projection, recurrence, draft Item inclusion, hydration을 바로잡는다. |
| Execution UX | 완료/취소와 Today 중복을 한 위치에서 이해되게 한다. |
| Schedule | 기준일, 고정 날짜, 선택 이동, 날짜 없음의 상태 전이를 계약으로 고정한다. |
| Editing | 메모·일정 편집을 progressive disclosure와 intent-aware field로 단순화한다. |
| Portability | export 범위와 destination을 분리해 전체/선택/현재 결과를 예측 가능하게 한다. |
| Feedback | 실행 중 메모와 최종 회고를 하나의 가벼운 기록 흐름으로 연결한다. |
| Validation | 공개 preview에서 실제 사용자 5명 이상, 1인 3회 관찰한다. |

## Non-goals

- 4탭 IA 변경
- Studio 5번째 탭 승격
- 실제 AI API, arbitrary URL production fetch, 자동 발행
- account, DB, cloud sync
- Calendar/Notion/Todo OAuth
- source-backed 원본 덮어쓰기
- 관찰 전 대규모 visual redesign
- `npm audit fix --force`

## Completion Criteria

- clean/dirty 환경 finding이 `confirmed_clean`, `dirty_only`, `not_reproduced`, `blocked`로 분류된다.
- My Flow, Calendar, Today summary, reuse, export가 같은 effective Item/date/occurrence를 읽는다.
- 완료 취소가 현재 실행 문맥에서 1단계이고 동일 occurrence의 완료 control 중복이 0이다.
- 날짜 이동과 export의 범위 정책이 구현 전 contract와 fixture로 고정된다.
- 날짜 없는 할 일을 My Flow와 Calendar에서 설명 없이 찾고 일정에 배치할 수 있다.
- 편집 기본 화면의 필드와 설명 밀도가 줄고 intent에 맞지 않는 범용 field가 0이다.
- 공개 preview가 로그인 없이 열리고 실제 사용자 관찰 프로토콜을 실행할 수 있다.
- 자동 QA와 실제 사용자 관찰 결과를 계속 분리한다.
