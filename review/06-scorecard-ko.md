# Pass 1 공통 scorecard

## 점수 방법

각 항목을 1~5점으로 평가한다.

- 1: 핵심 task가 불가능하거나 잘못된 결과를 만든다.
- 2: 진행은 가능하지만 state·action·result 오해 가능성이 높다.
- 3: 기본 경로는 가능하나 명확한 friction 또는 evidence gap이 있다.
- 4: 주요 정상·오류 경로가 일관되고 증거가 충분하다.
- 5: 반례·극한·복구까지 일관되며 미증명 범위가 명확하다.

`NOT_RUN`과 `BLOCKED`는 0점으로 환산하지 않는다. weighted score의 분모에서 빼지 말고 **gate 미충족**으로 표시한다.

## weighted gate

| 항목 | 가중치 | 필수 근거 |
|---|---:|---|
| State truth & lifecycle | 20 | public/saved/execution/result와 Back/reload/retry |
| Action ownership & execution clarity | 15 | primary/secondary, plan/Item/result mutation |
| Artifact projection & fidelity | 20 | preview/actual/receipt, IDs/counts/fields/raw hash |
| Information architecture | 15 | first viewport, mobile/desktop hierarchy |
| Disclosure & safety | 15 | closed/open, action 전 consequence, recovery |
| Terminology & copy | 5 | owned UI, result label, source/brand 경계 |
| Visual consistency & responsive behavior | 5 | shared roles, density, overflow, zoom |
| Accessibility & recovery | 5 | keyboard, screen reader relation, focus, reduced motion |
| 합계 | 100 |  |

계산식: `Σ(score ÷ 5 × weight)`.

## 비가중 내부 heuristic

`Stated Job Fit — internal heuristic`는 scenario에 적힌 task와 화면이 맞는지 내부 reviewer가 참고하는 값이다. 1~5와 근거를 기록하되 **weighted score와 PASS gate에 포함하지 않는다.** 실제 사용자 이해나 만족을 뜻하지 않는다.

| 항목 | 점수 | 근거 | 한계 |
|---|---:|---|---|
| Stated Job Fit — internal heuristic | `TBD` | `TBD` | observed users 0 |

## hard fail

다음 중 하나면 weighted score와 무관하게 `REVISE`다.

- 잘못된 저장·완료·결과 또는 데이터 손실
- preview, actual artifact, receipt의 effective Item identity 불일치
- public quick 경로의 의도하지 않은 persistent write
- 날짜 없는 Item에서 근거 없는 VEVENT 생성
- material risk 또는 되돌릴 수 없는 consequence를 action 전에 알 수 없음
- primary action 또는 복구가 keyboard로 불가능
- silent legacy/malformed storage rewrite
- 필수 scenario가 `NOT_RUN`/`BLOCKED`
- product candidate가 dirty이거나 chain of custody가 불완전

S17은 Claude Design 필수 scenario에서 제외되며 `NOT_RUN — CODEX_ONLY`가 정상이다. S22 performance의 `NOT_ASSESSED`도 별도 측정이 없을 때 정상이며 weighted gate에 넣지 않는다. S15의 실제 브라우저 200% zoom 하위 항목도 승인된 측정 증거가 없으므로 `NOT_RUN — ACTUAL_ZOOM_NOT_ASSESSED`가 정상이다. 제공된 720×500 reflow proxy 결과와 실제 zoom을 혼동하지 않는다.

## 내부 PASS 조건

- hard fail 0
- blocking finding 0
- weighted score 75/100 이상
- State truth & lifecycle, Artifact projection & fidelity, Disclosure & safety가 각각 4/5 이상
- 모든 필수 scenario에 required evidence 존재
- 관찰 사용자 `0명` 명시

이 PASS는 내부 제품 후보 gate일 뿐 실제 사용자 검증이 아니다.

## finding 표

| ID | reviewer | scenario | severity | invariant | evidence | counterevidence | status |
|---|---|---|---|---|---|---|---|
| `CX-001` 또는 `CD-001` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` |
