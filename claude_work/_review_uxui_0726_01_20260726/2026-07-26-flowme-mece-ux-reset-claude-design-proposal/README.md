# FlowMe MECE UX Reset — claude_design 독립 설계

**Overall verdict:** `bounded_revision` · 확신도 4/5
**reviewerRole:** claude_design · **검토일:** 2026-07-26 · **실제 관찰 사용자:** 0명 · **앱 코드 변경:** false
**production:** <https://flowme2605.vercel.app> (2026-07-26T00:33Z 확인)
**권장 구조:** **A′ = A(Subtractive ownership) 기반 + 두 surface에만 C 수정**

---

## 10분 검토 순서

1. [review.html](./review.html) — 조작 가능한 wireflow (사례 5 × 단계 8 × viewport 3)
2. 아래 “세 결정”
3. [audit.md](./audit.md) — severity finding
4. [decision-matrix.json](./decision-matrix.json) · [journey-scorecard.json](./journey-scorecard.json)
5. [implementation-handoff.md](./implementation-handoff.md) — slice 7개

전체 응답 양식(18개 절)은 [response-ko.md](./response-ko.md).

## 한 문단 결론

Codex의 소유권 방향은 **유지한다**. production을 직접 확인한 결과 실제 결함은 “탭이 4개”가 아니라 **한 화면이 여러 질문에 동시에 답하는 composition**이었고, 그 문제는 Codex 안으로 대부분 닫힌다. 다만 두 곳에서 Codex 안은 덜어내는 방향을 **사용자 비용으로 지불**한다 — 재방문 진입(결정 1)과 가장 잦은 단일 동작인 완료(결정 3). 두 곳만 수정하면 MECE를 깨지 않고 비용을 회수할 수 있으므로 판정은 `alternative_structure_required`가 아니라 `bounded_revision`이다. 데이터 계약(source / published / personal overlay / structural overlay / run / recurrence occurrence / export identity)은 한 줄도 다시 쓰지 않는다.

## 세 결정

| Decision | Verdict | 선택한 구조 | 감수할 대가 | Evidence |
| --- | --- | --- | --- | --- |
| Home 제거·Flow 찾기 통합 | **revise** | 홈 route와 활용 예시 카드는 제거. `/`는 고정 alias가 아니라 **entry router**: 저장 Flow>0 → `/my`, 0 → `/flows` | 진입이 상태에 따라 달라져 “항상 같은 첫 화면”을 잃는다. 첫 페인트 전 localStorage 판정이 필요해 skeleton 한 프레임이 생긴다 | current_production_interaction (홈은 `/flows`의 부분집합이고, 부제가 약속한 “저장한 Flow를 이어가기”를 소유하지 않음) |
| My Flow library-only | **keep** | `/my`는 목록·검색·필터·lifecycle 진입만. 실행·완료·편집·메모·가져가기는 개인 Flow 단독 | 재방문 사용자가 “오늘 할 일”을 보려면 Flow를 열거나 Calendar로 1탭. 보완으로 행마다 **읽기 전용** 다음 예정 1줄 | current_package_screenshot (`current-my-flow-workspace-390.png`: 한 카드에 primary 4개) |
| Calendar lens-only | **revise** | 날짜 lens로 한정하되 **완료/다시 열기 토글 1개만** 행에 남긴다. 메모·날짜 옮기기·제목 수정·날짜 없는 tray는 전부 개인 Flow로 | “Calendar는 아무것도 바꾸지 않는다”는 단순한 규칙을 잃는다. 대신 완료는 소유 기능이 아니라 **row primitive**로 문법에 명시해야 한다 | current_package_screenshot (`current-calendar-390.png`: 행마다 체크박스·열기·메모 3개) + reference_pattern (Todoist Today, Google Calendar tasks) |

## 왜 순수 A가 아닌가 (red-team 요약)

- 순수 A는 저장 12개를 가진 재방문 사용자를 **발견 화면**에 떨어뜨린다 → 새 탭·dashboard 없이 진입 목적지만 상태로 고른다.
- 순수 A는 하루에 여러 번 일어나는 **유일한 동작(완료)** 을 3탭으로 만든다 → 완료를 “행 primitive”로 정의해 문법을 지키면서 1탭으로 되돌린다.
- 전체 red-team 7문항과 3회 수정 이력: [revision-log.md](./revision-log.md)

## 구현 순서

`S1 진입 → S2 공개 Flow → S4 /my 목록화` 는 순차. `S3 조정 · S5 개인 Flow 초점 · S6 Calendar lens · S7 export scope-first` 는 병렬 가능. data gate는 없음(이번 reset은 화면 소유권 계층). 상세는 [implementation-handoff.md](./implementation-handoff.md).

## Evidence 경계

- `current_production_interaction` — `/`, `/f/moving-d30-basic`, `/f/curated-allblanc-morning-workout`의 라이브 응답을 직접 가져와 확인(모바일 폭 기준 DOM). `/flows`는 클라이언트 렌더라 서버 응답이 로딩 상태만 반환.
- `current_source` — `app/f/[slug]/page.tsx`, `lib/flow/real-content-pilot-flows.ts`, `lib/flow/source-backed-my-flow.ts` (자동차검사 10개 · 중1 수학 8단원 실제 데이터).
- `current_package_screenshot` — handoff `2026-07-26-flowme-mece-ux-reset/screenshots/current-*.png`.
- `codex_proposed_artifact` — Codex `review.html`, `design-package.md`, `simulation.md`, `journey-scorecard.json`. **production 구현 증거로 쓰지 않았다.**
- `claude_proposed_artifact` — 이 폴더의 `review.html` 전체.
- `inaccessible` — `/flows`·`/my`·`/calendar`의 라이브 hydration 클릭, reload persistence, 실제 export 실행, 로컬 worktree(`D:\flowme2605\...`)와 `localHead`/`originMain` SHA.
- `heuristic_simulation` — 15-cell journey의 proposed 열.

자동 점검·screenshot·simulation은 실제 사용자 검증이 아니다. **observed-user count: 0.**

## 파일

| 파일 | 내용 |
| --- | --- |
| [review.html](./review.html) | 조작 가능한 wireflow + A/B/C + 15-cell + red-team + slice |
| [response-ko.md](./response-ko.md) | 응답 양식 18개 절 전체 |
| [audit.md](./audit.md) | Blocking/High/Medium/Low finding |
| [decision-matrix.json](./decision-matrix.json) | A/B/C 비교와 세 결정 |
| [journey-scorecard.json](./journey-scorecard.json) | 15 cells |
| [screen-message-contract.json](./screen-message-contract.json) | 10 surface 메시지 계약 |
| [interaction-grammar.md](./interaction-grammar.md) | 공통 command 문법 |
| [visual-system.md](./visual-system.md) | type·spacing·color role·state·anatomy |
| [implementation-handoff.md](./implementation-handoff.md) | slice 7개 |
| [ia-tree.md](./ia-tree.md) | UI tree와 continuity map |
| [content-renderer-rules.md](./content-renderer-rules.md) | shape별 renderer |
| [progressive-disclosure-matrix.json](./progressive-disclosure-matrix.json) | 필드별 노출 시점 |
| [accessibility-recovery-audit.md](./accessibility-recovery-audit.md) | keyboard·focus·error·undo |
| [reference-pattern-matrix.md](./reference-pattern-matrix.md) | 9개 제품 패턴 판정 |
| [revision-log.md](./revision-log.md) | red-team 7문항 + 3회 수정 |
