# FlowMe cross-entry canonical independent review

## Verdict

**canonical_flow_contract_reopen**

현재 production은 각 route 내부에서는 저장→My Flow→Calendar 실행이 대체로 동작한다. 그러나 같은 AJD 이사 source/job이 Home 24개, Find 5개, URL lookup 5개, direct alias 5개로 갈리고 세 개의 saved identity를 만든다. 따라서 “같은 콘텐츠가 하나의 사용자 Flow로 이어진다”는 제품 약속은 충족되지 않는다.

P32 focused My Flow workspace, 4탭 IA, public `/f` shell은 유지한다. P33은 **B안: canonical registry + role-specific shell + one save identity**로 제한한다.

## 핵심 수치

- 8 personas × 3 sessions: **24 cells**
- supported: **8**
- partial: **15**
- missing: **1**
- observed users: **0**
- production capture: 21 surfaces, horizontal overflow 0, console/page error 0
- unit: 587/587
- related serial E2E: 14/14
- URL-first targeted E2E: 1/1

## 기존 가설

- H1: **confirmed** — 같은 AJD 원문이 네 사용자 route와 24/5/5/5 item snapshot으로 노출된다.
- H2: **confirmed** — Home 24개와 Find 5개를 저장하면 서로 다른 saved key와 My Flow 행이 생긴다.
- H3: **confirmed** — hydrated catalog 9개 중 앞 5개는 /flow-maps, 뒤 4개는 /f로 연결된다.
- H4: **confirmed** — moving/vehicle Checklist 선택은 state를 바꾸지 않고 wedding/workout은 바꾼다. category-gated handler와 controlled component 조합이 원인이다.
- H5: **confirmed** — Home은 필요할 때 Checklist를 약속하지만 target은 D-14 Calendar 10개가 기본이다.
- H6: **confirmed** — 현재 hydrated catalog에는 vehicle-inspection-prep이 없고 차량 점검/자동차검사 검색으로 canonical target을 재발견하지 못했다. server-to-hydration flicker는 재현되지 않았다.
- H7: **confirmed** — 날짜 없이 저장한 focused My Flow에 raw RRULE이 표시된다. Calendar에는 raw 문자열이 표시되지 않는다.

## 읽는 순서

1. [review.html](./review.html) — 10분 판단용 한국어 visual report
2. [audit.md](./audit.md) — severity finding과 재현 근거
3. [cross-entry-invariant-matrix.json](./cross-entry-invariant-matrix.json) — surface별 source/title/count/save/export 정합성
4. [persona-journey-scorecard.json](./persona-journey-scorecard.json) — 24 cells
5. [alias-storage-impact.json](./alias-storage-impact.json) — storage ownership, migration, data-loss 위험
6. [decision-matrix.json](./decision-matrix.json) — A/B/C 비교
7. [p33-recommendation.md](./p33-recommendation.md) — P33 실행 순서와 rollback
8. [verification.json](./verification.json) — current command/browser 검증

## 경계

- app code 변경 없음
- dependency 변경 없음
- STATUS/ROADMAP 변경 없음
- commit/push/PR/merge/deploy 없음
- browser automation, screenshot, heuristic simulation은 실제 사용자 검증이 아님
- observed-user count는 0
