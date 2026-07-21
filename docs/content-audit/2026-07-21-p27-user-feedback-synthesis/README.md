# FlowMe P27 사용자 피드백 종합 판단

작성일: 2026-07-21

판정: `journey_model_reconciliation_required`

실제 관찰 사용자 수: `0`

## 1. 이 문서의 목적

이번 피드백을 기존 P27 백로그에 항목 몇 개 추가하는 방식으로 처리하지 않는다. 사용자가 지적한 문제는 다음 다섯 구간이 서로 다른 화면 문법과 상태 의미를 쓰는 데서 함께 발생한다.

`저장 전 이해·조정 -> 저장 -> 저장 결과 확인 -> My Flow에서 찾기·실행 -> Calendar·외부 도구 활용 -> 보관·복구`

따라서 다음 작업은 개별 버튼 추가보다 **Flow 라이프사이클과 작업 공간의 재정렬**을 우선한다. 이미 안정화된 source, personal overlay, execution run, occurrence, export identity 계약은 유지한다.

## 2. 사용한 근거

| 근거 | 분류 | 사용 방식 |
| --- | --- | --- |
| 이번 사용자 피드백 7개 | stakeholder_feedback | 불편과 기대를 직접 요구사항이 아닌 검증해야 할 문제로 변환 |
| `2026-07-21-flowme-p26-production-review-p27-program` | heuristic_simulation, current_package_screenshot | 화면 밀도, export 중복, post-save/My Flow 문법 차이, Calendar 문제 비교 |
| Input Composer UX v1.1 spec | prior_design_artifact | 통합 입력, useful preview first, source 범위, progressive disclosure 원칙 재사용 |
| Claude Design `(10)` 최신 P26/P27 검토물 | prior_design_artifact, heuristic_simulation | SSR, 저장 surface, route, 본문 밀도와 반복 화면 대안 재검토 |
| `origin/main` `63ea641` source | current_source | 4주 범위, 삭제 동작, 영상 resource 표시, 현재 UI eligibility 확인 |
| `https://flowme2605.vercel.app` | current_production_interaction, server_document_inspection | `/flows` server document가 loading fallback만 내보내는 상태 확인 |

자동화, 에이전트 시뮬레이션, stakeholder review는 실제 사용성 검증으로 계산하지 않는다.

## 3. 종합 결론

### 3.1 지금 바로 UI를 크게 구현하면 안 되는 이유

- 삭제는 현재 Flow 실행 기록을 지우는 경로와 연결돼 있어, 버튼만 추가하면 회고·재사용 기록까지 잃을 수 있다.
- 홈트의 `4주`는 콘텐츠 자체의 종료 조건인지, 단순 화면 미리보기 범위인지 구분되지 않는다.
- 영상 URL, 실행 방법, 확인 항목이 같은 체크 계층에 섞이면 사용자가 무엇을 완료해야 하는지 불명확하다.
- 저장 전 조정과 저장 후 편집이 다른 문법을 쓰면 같은 Flow를 두 번 배워야 한다.
- My Flow의 검색은 저장 수가 적을 때도 관리 도구처럼 앞에 나와, 지금 할 일과 Flow 전체 보기의 목적을 흐린다.

### 3.2 채택하는 제품 구조

1. **저장 전에는 전체 결과를 먼저 보여준다.**
   - Flow 제목, 핵심 단계, 날짜/반복 결과, 포함 자료, 예상 저장 수를 먼저 확인한다.
   - 기본 화면은 읽기 화면이다.
   - `조정`을 누른 뒤에만 한 종류의 편집 작업을 연다.

2. **저장 후에는 같은 Flow 문법을 유지한다.**
   - 저장 완료 receipt는 별도 대시보드가 아니라 같은 Flow 전체 보기 위의 짧은 상태 띠다.
   - 이후 My Flow에서 다시 열어도 같은 헤더, 단계, 항목, 자료 구조를 사용한다.

3. **My Flow는 실행과 보관함을 분리한다.**
   - `지금`: 날짜별로 묶은 실행 항목과 반복 회차.
   - `Flow`: 저장한 Flow 전체를 최근/진행 중/보관됨으로 찾는 공간.
   - 검색은 Flow 수가 충분히 많거나 사용자가 명시적으로 열 때만 앞에 나온다.

4. **삭제보다 복구 가능한 상태 전이를 먼저 제공한다.**
   - Flow 기본 행동: `보관하기`.
   - source-backed 항목 기본 행동: `내 Flow에서 빼기`.
   - user-created 항목: personal tombstone으로 제거.
   - 모두 즉시 `되돌리기`와 지속적인 복구 경로를 갖는다.
   - 영구 삭제는 별도 데이터 관리 영역에서만 다룬다.

5. **반복 정의와 화면 미리보기 범위를 분리한다.**
   - source가 실제 4주 프로그램이라고 말할 때만 4주 종료를 콘텐츠 계약으로 사용한다.
   - 일반 반복 Flow의 `앞으로 4주`는 화면에 보여주는 bounded preview일 뿐 series 종료가 아니다.
   - 사용자가 시작일, 요일, 빈도, 종료 조건을 조정할 수 있는 범위를 명시한다.

6. **자료와 확인 항목을 분리한다.**
   - `할 일`: 실행하고 완료하는 단위.
   - `실행 자료`: 영상, 문서, URL처럼 열어보는 resource.
   - `확인 항목`: 완료 판단을 돕는 짧은 subcheck.
   - URL 자체를 체크해야 할 이유가 없으면 확인 항목으로 넣지 않는다.

## 4. 이번에 새로 확인된 현재 상태

### 4.1 홈트 4주 범위

`components/flow/ArtifactWorkbench.tsx`의 `getRoutineWeekCount()`는 `14일` 문자열이 있으면 2주, 그 외에는 4주를 반환한다. 일부 홈트 콘텐츠는 실제 `4주 홈트 시작 캘린더`를 의도하지만, helper의 일반 fallback도 4주이므로 콘텐츠 종료와 화면 범위가 섞여 있다.

판정: `partial`

다음 조치: P27-R02A에서 provenance와 recurrence horizon 계약을 먼저 고정한다.

### 4.2 저장한 Flow 제거

`components/flow/AppClient.tsx`의 현재 제거 경로는 confirm 후 `clearFlowLocalProgress()`를 실행한다. 즉시 undo나 보관함 복구가 기본 계약이 아니다.

판정: `unsafe_partial`

다음 조치: P27-R01A/B에서 archive, tombstone, restore, permanent delete를 분리한다.

### 4.3 영상과 확인 항목

workbench에는 `원본 영상 열기`와 supporting link를 resource처럼 보여주는 구현이 이미 있다. 그러나 Flow detail의 하위 확인 항목과 resource의 소유권·편집 경계가 공통 계약으로 고정되지 않아 콘텐츠마다 다시 섞일 수 있다.

판정: `partial`

다음 조치: P27-R02A에서 Item anatomy를 고정하고 P27-R05에서 personal resource/subcheck edit를 연결한다.

### 4.4 `/flows` server document

2026-07-21 현재 production `/flows` HTML은 실제 카드나 composer가 아니라 `Flow를 불러오는 중입니다.` fallback만 포함한다. hydration 뒤 화면이 동작하더라도 hard navigation, no-JS, 검색 노출, 초기 신뢰 면에서 별도 foundation defect다.

판정: `confirmed_foundation_defect`

다음 조치: P27-R00F에서 server document smoke와 최소 SSR shell을 병렬로 닫는다.

## 5. 참고 패턴에서 채택할 것

- Todoist의 project archive처럼 기본 제거를 복구 가능한 보관으로 두고, 보관된 대상은 별도 보기에서 복구한다: <https://www.todoist.com/help/articles/introduction-to-projects-TLTjNftLM>
- Apple Reminders처럼 Today/Scheduled/All/Completed를 목적별 보기로 분리하되, FlowMe에서는 무거운 필터 UI보다 `지금`과 `Flow`의 두 정신 모델을 먼저 명확히 한다: <https://support.apple.com/en-mide/guide/iphone/iphe882772ed/ios>
- Google Calendar/Tasks처럼 반복 변경·삭제 시 `이번 회차`, `이후 회차`, `전체` 범위를 구분한다: <https://support.google.com/calendar/answer/12132599>

참고 서비스의 화면을 복제하지 않는다. 위 패턴은 상태 의미와 복구 범위만 차용한다.

## 6. 새 실행 프로그램

기존 P27 자료를 폐기하지 않는다. 다만 서로 다른 P27 번호와 큰 Composer 구현 요청을 바로 실행하지 않고, 아래 `P27-R` reconciliation track을 다음 구현 순서로 사용한다.

1. P27-R00A: 비교 prototype 결정 gate
2. P27-R00F: `/flows` SSR·공통 접근성 smoke foundation
3. P27-R01A/B: Flow·Item 보관/제거/복구 계약과 UI
4. P27-R02A/B: 반복 범위·resource/subcheck 계약과 홈트 vertical slice
5. P27-R03A/B: 저장 전 Flow 조정 workspace prototype과 구현
6. P27-R04A/B: My Flow 실행/보관함 IA prototype과 구현
7. P27-R05: 확인 항목·resource contextual edit
8. P27-R06: Calendar 반복/날짜 없음/Flow scope 정리
9. P27-R07: compact export와 post-save receipt 정리
10. P27-R08: 통합 regression 및 P27 final review

자세한 범위와 의존성은 다음 문서가 정본이다.

- [제품 계약](../../specs/2026-07-21-p27-flow-lifecycle-workspace-reconciliation/spec.md)
- [실행 계획](../../specs/2026-07-21-p27-flow-lifecycle-workspace-reconciliation/plan.md)
- [상세 백로그](../../specs/2026-07-21-p27-flow-lifecycle-workspace-reconciliation/backlog.md)
- [작업 체크리스트](../../specs/2026-07-21-p27-flow-lifecycle-workspace-reconciliation/tasks.md)
- [QA 계약](../../specs/2026-07-21-p27-flow-lifecycle-workspace-reconciliation/qa.md)
- [첫 다음 목표](../../specs/2026-07-21-p27-flow-lifecycle-workspace-reconciliation/next-goal.md)

## 7. 완료로 보지 않는 것

- mockup만 예쁘게 정리한 상태
- 자동 screenshot에서 overflow가 0인 상태
- 검색창, 삭제 버튼, 편집 버튼을 각각 추가한 상태
- 홈트 4주 문구만 제거한 상태
- Input Composer만 구현한 상태
- agent simulation을 사용자 검증으로 표현한 상태

P27-R 완료는 동일한 Flow가 저장 전, 저장 직후, My Flow, Calendar, export에서 같은 구조·상태·범위를 유지하고 사용자가 설명 없이 조정과 복구를 찾을 수 있을 때다.
