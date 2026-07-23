# P32 Final Audit

## 1. 판정

`local_verification_green_publish_pending`

P31의 library, completion, export, lifecycle, projection 계약은 유지하고, 한 Flow 안에서 명령이 분산되는 문제만 bounded structural reopen으로 해결했다.

## 2. Architecture decision

### 선택: B1

`library_to_focused_workspace_with_cross_flow_queue`

- `지금 / Flow 목록 / 완료`는 여러 Flow를 가로지르는 library 질문이다.
- 한 Flow를 열면 global My Flow local tabs를 숨긴다.
- 선택한 Flow는 `다음 행동 / 전체 계획 / 기록` object workspace로 연다.
- mobile back은 query와 library 위치를 복구한다.
- wide는 explicit `전체 보기` command를 제공한다.

### 기각: B2

`continue_strip_without_cross_flow_queue`

B2는 global/local navigation 수를 줄이지만, 오늘 여러 Flow에서 무엇을 이어 할지 보는 cross-Flow queue를 잃는다. 현재 browser evidence에는 이 projection을 제거할 근거가 없다.

## 3. 구현 결과

### P32-02 Focused workspace

- focused/library state를 명시적으로 판별한다.
- focused 상태에서 global My Flow header/tabs를 제거한다.
- next action DOM을 object commands보다 앞에 둔다.
- mobile object header와 back/manage를 제공한다.
- wide rail/canvas/inspector command ownership을 유지한다.
- React list key warning을 제거했다.

### P32-03 Quick Item edit

- Item detail에 visible quick edit entry를 한 개만 둔다.
- 제목·날짜·개인 메모 form까지 `<=3` interactions다.
- source Item, stable Item ID, completion state를 바꾸지 않는다.
- 기존 advanced schedule은 progressive disclosure를 유지한다.

### P32-04 Flow anchor

- savedMap 없이 저장된 anchored public Flow도 기준일을 바꿀 수 있다.
- `moving-d30-basic`은 `이사일 바꾸기`로 표시한다.
- anchor-linked 날짜는 다시 계산한다.
- 개인 fixed date와 개인 memo는 유지한다.
- savedMap record를 새로 만들지 않는다.

### P32-05 Export and lifecycle

- selected Flow command area에서 whole export preflight에 접근한다.
- scope와 count를 실행 전에 보여준다.
- archive/restore/permanent-delete 의미는 P31 계약을 유지한다.
- lifecycle storage와 delete 범위는 변경하지 않았다.

### P32-06 Six shapes

아래 shape가 같은 focused shell marker와 object grammar를 사용한다.

1. anchor timeline: `moving-d30-basic`
2. undated checklist/resource: `travel-packing-list`
3. recurrence routine: `washer-tub-clean-monthly`
4. artifact choice: `wedding-d180-basic`
5. mixed fixture: `used-car-buying-check`
6. personal planning/draft representative: `weekly-meal-plan`

shape별 body와 projection은 유지하며 route별 identity fork를 만들지 않았다.

## 4. Interaction metrics

| Goal | Before | P32 | Evidence |
| --- | ---: | ---: | --- |
| 특정 Flow 열기 | 2 | `<=2` | current fixture browser |
| 제목·날짜·메모 수정 form | 6 | `<=3` | targeted E2E |
| whole export preflight | 6 | `<=3` | targeted E2E |
| archive command | 6 | `<=3` | existing lifecycle E2E |
| reload 후 restore | 6 | `<=4` | existing lifecycle E2E |

첫 route load는 interaction depth에 포함하지 않았다.

## 5. Viewport and accessibility

### 390x844

- global library tabs와 focused local tabs가 동시에 보이지 않는다.
- object header는 non-sticky이며 global header와 충돌하지 않는다.
- next action이 object command보다 먼저 읽힌다.
- bottom nav와 fixed/sticky interactive overlap `0`
- horizontal overflow `0`
- quick edit focus가 title input으로 이동한다.

### 1024x768

- rail/canvas/inspector 역할 유지
- six-shape shared shell marker 확인
- explicit library return 확인
- horizontal overflow `0`

### 1440x900

- focused detail canvas와 inspector가 유지된다.
- 불필요한 global local tabs가 없다.
- horizontal overflow `0`

## 6. Route correctness

- `/f/real-mofa-overseas-travel-prep`: closed by product policy
- `travel-packing-list`: valid public undated checklist/resource route
- `overseas-travel-d14`: fixture-only mixed shape
- mixed public journey: `blocked`

닫힌 route를 테스트 편의를 위해 재공개하거나 source content를 추가하지 않았다.

## 7. Verification boundary

현재 실행:

- unit: `587 / 587`
- P32 targeted Playwright: `4 / 4`
- full Playwright: `314 / 314`
- production build: pass
- screenshots: `10`
- browser errors: `0`

이전 artifact:

- P31 independent review의 24 persona-session과 1/5/20/60 측정은 P32 설계 입력으로 사용했다.
- P32가 실제 사용자 24세션을 새로 수행했다고 주장하지 않는다.

실제 관찰:

- observed-user count: `0`

## 8. Residual risks

1. `AppClient.tsx`가 여전히 크다. 이번 slice는 안전한 composition 변경을 우선했으며 별도 component extraction/no-visual-diff gate는 남아 있다.
2. mixed date/check/resource는 public 사용자 route가 없어 fixture-only다.
3. PostCSS advisory chain은 P32-OPS 별도 dependency lane이다. 강제 downgrade를 적용하지 않았다.
4. focused workspace의 실제 이해도와 반복 사용성은 관찰 사용자가 없어 검증되지 않았다.

## 9. Rollback

변경은 focused/library composition과 helper 범위다. persistence migration이 없으므로 reverse migration은 필요하지 않다. rollback 시 기존 projection과 saved data를 그대로 사용할 수 있다.
