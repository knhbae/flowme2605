# Claude Design 선택형 후속 프롬프트

메인 결과가 나온 뒤 필요한 것만 추가로 전달한다. 각 프롬프트는 앱 코드 수정
없이 기존 Claude proposal 폴더를 보완한다.

## 1. Red-team 재검토

```text
방금 만든 FlowMe MECE UX 제안을 독립적인 반대 관점에서 red-team 해줘.

앱 코드는 수정하지 않는다. observed-user count는 0명이다.

특히 아래를 공격해라.
- 삭제가 아니라 다른 메뉴로 복잡도를 옮긴 부분
- 한 화면에 primary action이 실제로 둘 이상인 부분
- Home 제거로 discovery/trust가 약해진 부분
- My Flow library-only로 재방문 실행이 약해진 부분
- Calendar lens-only로 일정 조정이 불필요하게 멀어진 부분
- 날짜 없는 Item의 접근 경로가 사라진 부분
- 콘텐츠 shape 차이를 억지로 하나의 renderer에 맞춘 부분
- archive/restore, personal Item recovery가 숨겨진 부분
- 390px에서 다시 긴 card stack이 된 부분
- 1024px이 늘어진 mobile처럼 된 부분

각 비판을 confirmed / reframed / rejected로 판정하고, confirmed 항목만
interactive review.html과 decision-matrix.json에 반영해 2차안을 만들어줘.
변경 전후 complexity metric과 screenshot marker를 남겨줘.
```

## 2. 상용 서비스 수준 visual polish

```text
FlowMe Claude proposal의 IA와 interaction 계약은 유지하고 visual system만
상용 서비스 수준으로 한 번 더 정리해줘.

색상 교체나 장식 추가만 하지 말고 typography, spacing, density, alignment,
surface hierarchy, selected/completed/excluded/archived state, button hierarchy,
compact row, bottom sheet, inspector anatomy를 다뤄라.

모바일 390x844, wide 1024x768, desktop 1440x900을 모두 다시 capture하고,
같은 화면의 메시지 수와 primary action 수는 늘리지 마라. 중첩 card, 과한
border, 설명문 추가, gradient decoration은 금지한다.

결과는 visual-system.md, review.html, screenshots/만 보완하고 앱 코드는
수정하지 마라. observed-user count는 0명이다.
```

## 3. 모바일 390px stress pass

```text
FlowMe proposal을 390x844 모바일만 놓고 stress-test 해줘.

다섯 콘텐츠의 15 session을 keyboard/scroll 관점까지 다시 통과시켜라.
긴 제목, 24개 이사 Item, 10개 날짜 없는 Item, 반복 설정, 20개 My Flow,
같은 날짜 여러 Flow, export scope, archive/restore를 포함한다.

검사 항목:
- 첫 viewport에서 질문과 primary action
- sticky command와 bottom nav 겹침
- horizontal overflow
- text/button wrapping
- detail sheet 높이와 scroll ownership
- keyboard focus와 focus return
- destructive action 오조작 위험
- 한 손 조작 가능한 primary placement

발견된 문제만 고치고 새 기능이나 안내문을 추가하지 마라.
mobile-stress-audit.md와 before/after screenshot을 추가해줘.
앱 코드는 수정하지 않고 observed-user count는 0명으로 유지해라.
```

## 4. 콘텐츠 fidelity 검토

```text
FlowMe proposal의 시각 구조가 실제 콘텐츠 의미를 훼손하지 않았는지 검토해줘.

대상:
- moving-d30-basic 24개 역산 일정
- vehicle-inspection-prep 날짜 없는 10개 Checklist
- curated-allblanc-morning-workout series/occurrence/resource
- source-backed-middle-school-math-1 8개 순서형 진도
- 제주 여행 개인 메모 5개 draft

각 사례에서 source -> Item -> primary artifact -> personal value -> execution ->
export가 보존되는지 확인하고, 공통 shell과 shape-specific renderer의 경계를
재조정해라. 모든 사례에 Calendar/Checklist/Sheet/Memo를 강제하지 마라.

결과는 content-renderer-rules.md와 review.html에 반영해라.
앱 코드는 수정하지 않고 observed-user count는 0명으로 유지해라.
```

## 5. 접근성·복구 전용 검토

```text
FlowMe interactive proposal의 접근성과 복구 UX만 독립 검토해줘.

390x844와 1024x768에서 keyboard-only로 다음을 재현한다.
- Flow 찾기와 저장 전 조정
- receipt에서 personal Flow 열기
- 완료와 다시 열기
- Item 날짜·메모 수정
- Calendar 날짜 선택과 Flow 열기
- whole/selected/current export
- archive/undo/restore

focus order, accessible name, dialog/sheet trap, Escape, focus return, 200% zoom,
overflow, loading/success/error/retry, 취소/undo, 작성 중 이탈 복구를 확인한다.

기능을 더 만들지 말고 문제를 interaction state와 component anatomy로 해결해라.
accessibility-recovery-audit.md와 관련 screenshot을 추가해라.
앱 코드는 수정하지 않고 observed-user count는 0명으로 유지해라.
```

## 6. Claude-Codex 정합성 및 구현 가능성 검토

```text
Claude proposal과 Codex 1차 설계를 화면별로 대조해 개발 가능한 단일안으로
수렴시켜줘.

정답을 절충 평균으로 만들지 말고, 사용자 질문, 행동 소유권, 복잡도 metric,
데이터 계약, rollback 기준으로 하나씩 선택해라.

반드시 비교할 결정:
- Home 제거 또는 유지
- My Flow library-only 또는 Today 실행 유지
- Calendar lens-only 또는 최소 inline action 유지
- personal Flow를 route로 분리할지 /my focused state로 둘지
- 날짜 없는 Item을 Calendar에 둘지 personal Flow에만 둘지

각 차이를 아래로 분류해라.
- CSS/token only
- component composition
- interaction state
- route/IA
- data contract dependency

최종 implementation-handoff.md에 5~9개 순차 slice, 영향 component 후보,
390/1024/1440 acceptance, accessibility, E2E marker, rollback을 작성해라.
앱 코드는 수정하지 않고 observed-user count는 0명으로 유지해라.
```

## 7. 최종 수렴 및 개발 handoff

```text
FlowMe Claude proposal의 최종 gate를 수행해줘.

1. A/B/C 결정과 세 핵심 결정의 최종 verdict를 한 페이지로 확정한다.
2. 15-cell journey가 모두 pass인지 확인한다.
3. 화면별 메시지 최대 2개, primary action 최대 1개인지 재측정한다.
4. 모든 command의 주 소유 surface가 하나인지 확인한다.
5. source/personal/run/occurrence/export 계약을 유지하는지 확인한다.
6. 390/1024/1440 browser QA와 screenshot을 갱신한다.
7. 구현 slice를 반드시 순차인 것과 병렬 가능한 것으로 나눈다.
8. 첫 vertical slice와 rollback boundary를 하나만 지목한다.
9. 실제 사용자에게만 확인할 질문은 최대 7개로 제한한다.

README.md, audit.md, decision-matrix.json, journey-scorecard.json,
implementation-handoff.md, review.html을 최종 정합 상태로 맞춰라.
앱 코드, STATUS/ROADMAP/DECISIONS, commit/push/PR/merge/deploy는 변경하지 마라.
자동 QA는 실제 사용자 검증이 아니며 observed-user count는 0명이다.
```
