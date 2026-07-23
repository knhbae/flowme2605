# Claude Design 전용 복붙 프롬프트

```text
FlowMe P31 production의 독립 UX/UI 구조 검토를 진행해줘.

먼저 아래 공용 프롬프트를 전체 읽고 `REVIEWER_ROLE: claude_design`으로 수행한다.

https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-24-flowme-p31-independent-my-flow-review-handoff/unified-review-prompt-ko.md

Production:
https://flowme2605.vercel.app

Handoff package:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-24-flowme-p31-independent-my-flow-review-handoff

이번 검토의 중심은 My Flow다. current structure를 유지해야 한다는 전제를 두지 말고, 8 personas x 3 sessions를 직접 시뮬레이션한 뒤 아래 A/B/C를 같은 content와 state로 비교해줘.

A. P31 Keep And Tighten
B. Library To Focused Workspace
C. Run-First Workspace

특히 다음을 자세히 보여줘.
- 390px에서 1/5/20/60 Flow를 찾고 여는 구조
- timeline/checklist/routine/mixed plan/personal draft의 workspace body
- 다음 행동, 전체 계획, 기록, 수정, export, 보관·복구의 우선순위
- 완료와 다시 열기, 즉시 undo와 장기 복구
- Calendar 왕복 후 선택 Flow/filter/scroll 복구
- 1024px library/canvas/inspector 대안
- keyboard focus 순서와 sheet/peek/detail transition

Todoist, Things, Apple Reminders, Google Calendar, Notion, TickTick, Wanderlog, Hevy, Strava는 공식 reference pattern으로 비교하되 화면이나 기능을 그대로 복제하지 않는다. FlowMe는 portable execution layer이며 무거운 planner가 아니다.

앱 코드는 수정하지 않는다. 실제 social proof 데이터가 없으므로 사용자 수·리뷰 수·검증 수를 지어내지 않는다. prototype에 위치 실험이 필요하면 `가상 데이터 - production 금지`로 표시한다.

자동화와 heuristic simulation은 실제 사용자 관찰이 아니다. observed-user count는 0으로 기록한다.

공용 프롬프트의 파일 구조와 result contract를 그대로 사용해 current/proposed review package를 만들어줘.
```
