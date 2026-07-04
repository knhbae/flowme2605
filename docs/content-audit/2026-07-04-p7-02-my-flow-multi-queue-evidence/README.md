# P7-02 My Flow multi-queue evidence

Claude Design P7-02가 요구한 My Flow 다중 큐 상태 evidence입니다.

## Scenario

- Route: `/my`
- Viewport: `390 x 844`
- Fixed today: `2026-05-28T09:00:00+09:00`
- Saved content fixture:
  - `moving-d30-basic`, anchor `2026-06-26`: 밀린 일정과 다음 일정 생성
  - `computer-skills-d30-study`, anchor `2026-06-27`: 오늘 할 일 생성
  - `used-car-buying-check`: 날짜 없는 저장 콘텐츠 fallback 확인

## Evidence

- [route-evidence.json](./route-evidence.json)
- [my-flow-multi-queue-fullpage.png](./screenshots/my-flow-multi-queue-fullpage.png)
- [my-flow-multi-queue-overdue-sheet.png](./screenshots/my-flow-multi-queue-overdue-sheet.png)

## Result

- Visible Now/Next queue row count: 4
- Overdue sheet row count: 4
- Duplicate row-key count across visible queue and overdue sheet: 0
- User-facing raw ISO date matches: 0

Conclusion: P7-02 was an evidence gap, not an app dedupe bug. The existing queue order and row-key dedupe keep the same item out of multiple visible queue surfaces in this scenario.

## Regression Test

Pinned by:

```powershell
npx playwright test tests/e2e/flow-mvp.spec.ts -g "my flow today dedupes rows when today overdue and next queues coexist on mobile"
```
