# 2026-06-01 카테고리별 UX/UI 설계 적용

## 왜 했나
크리에이터·블로그 배치(20개)는 처음에 전부 기존 아티팩트 표면(timeline/routine/
checklist)으로 떨어졌고, 그중 6개는 **가장 일반적인 플랫 체크리스트**로 렌더링돼
카테고리 특성이 드러나지 않았다. "카테고리마다 알맞은 UX/UI를 새로 고안해 적용"
하라는 요구에 따라, 콘텐츠 성격별로 어울리는 아티팩트 표면을 배정하고 신규 표면을
하나 추가했다.

## 카테고리 → 표면 매핑
| 콘텐츠 성격 | Flow | 표면(UX) |
|---|---|---|
| 순차 단계(준비→실행→마무리) | recipe-video-execute, closet-organize-1day, kitchen-reset-organize, book-finish-one, travel-packing-list, blog-youtube-start | **`step_progress` (신규)** |
| 표 기반 기록 | weekly-meal-plan, monthly-household-budget, skin-weekly-check, pet-health-observation | `spreadsheet_log` + 카테고리 전용 표 |
| 결과 분리 메모 | payday-finance-routine | `memo_card` + 재정 메모 필드 |
| 반복 루틴 | reading-habit-30day, morning-skincare-routine, home-cafe-daily, morning-routine-30day, digital-detox-weekly, dog-walk-routine | `routine_calendar` |
| 기간 일정 | domestic-trip-d7, new-hobby-30day, portfolio-4week | `timeline_calendar` |

## 신규 표면: `step_progress` (단계별 실행)
순차적으로 진행되는 콘텐츠(요리 재료준비→조리→평가, 정리 비우기→분류→정리,
콘텐츠 창작 콘셉트→세팅→발행 등)에 맞춘 stepper UX.

- **상단 진행률 바**: 전체 항목 중 완료 수와 % 표시.
- **단계 카드(섹션=단계)**: 번호 배지, 첫 미완료 단계에 "현재 단계" 강조, 완료 단계는
  녹색 체크.
- **단계별 체크리스트**: 지금 단계의 할 일만 한 줄씩 체크.
- **진행 메모**: 단계마다 결과나 다음에 바꿀 점 기록(export 포함).
- 구현: `components/flow/ArtifactWorkbench.tsx`의 `StepProgressWorkbench`.
  기존 `checks`/`onToggleItem`/`exportActions`를 재사용해 새 상태 모델 없이 동작.

## 카테고리 전용 표/메모 (artifact-fields.ts)
- **weekly-meal-plan**: 요일(월~일) 행 × 메뉴/주재료/장볼 것/메모 열.
- **monthly-household-budget**: 카테고리(고정지출·식비·교통·쇼핑·저축·기타) 행 ×
  예산/지출/잔액/메모 열.
- **skin-weekly-check**: 1~4주차 행 × 피부 상태/사용 제품/반응/다음 조정 열.
- **pet-health-observation**: 1~4주차 행 × 식욕/배변/활동·기분/이상 징후 열.
- **payday-finance-routine** memo 필드: 실수령액·자동이체·저축·생활비 분리·조정 기준.

기존 `SpreadsheetWorkbench`는 route별 log table이 있으면 날짜 그리드 대신 해당 표를
렌더링하므로, 요일/카테고리/주차처럼 날짜가 아닌 행도 자연스럽게 표시된다.

## 안전성
- 기존 표면 선택 로직은 건드리지 않고, 신규 배치 슬러그에만 분기를 추가했다.
- `export.ts`·표면 소비처는 알 수 없는 표면을 기본 분기로 흘려보내므로 신규
  `step_progress`가 깨뜨리지 않는다.
- 재무민감(payday)의 경고 배너는 표면과 무관하게 페이지 레벨 `flow-warning-card`로
  노출된다.

## 검증
- `npm test`: 183 pass(아티팩트 플랜 라우팅 테스트 4건 추가).
- `npm run build`: 성공.
- 브라우저 DOM 확인: step_progress(`step-progress-workbench`, 진행률 바, "현재 단계"),
  budget 표(`monthly-budget-table`), payday 메모(`월급날 분리·이체 기록`) 렌더링 확인.
- HTML 프리뷰 20개 재생성: `preview/260601/`.
