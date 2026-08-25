# Text Authoring Live Editor 예시 복구·계층 표현 결과

- 목표 ID: `TA-TEXT-AUTHORING-LIVE-EDITOR-EXAMPLES-HIERARCHY-20260825-01`
- 상태: `LOCAL_INTERNAL_QA_PASS`
- checkout: `D:\flowme2605\flow-text-authoring-flow-view-poc-20260824`
- branch / baseline: `agent/text-authoring-flow-view-poc-20260824` / `152b356fbaaec046bc32e5d2021b727706fe28fe`
- upstream: 없음
- publish boundary: `LOCAL_ONLY`
- external side effect / observed-user session: `0 / 0`

## 결론

기존 오른쪽 Calendar·Todo·Sheet·TXT 결과는 바꾸지 않고, 왼쪽 인라인 Flow 편집 PoC에 기존 검토 예시 30개와 작성 형식 예시 1개를 다시 노출했다. root Item, 그 Item의 속성, 한 단계 ChecklistEntry는 marker/body 두 열, hanging indent, 중립 guide와 root group 간격으로 구분된다. source whitespace만 보고 독립 Item을 child로 바꾸지 않으며, checkbox 완료 상태와 ordered 번호도 접근 가능한 이름에 남는다. 새 preview pane, 카드, 적용 버튼, parser·canonical·projection 의미 변경은 만들지 않았다.

기획·UX·acceptance는 [승인 목표](../../specs/2026-08-25-flowme-text-authoring-live-editor-examples-hierarchy/00-goal-ux-and-acceptance-ko.md), 예시 원본과 순서는 [31개 inventory](./example-inventory-ko.md)에 고정했다.

## 바로 열기

- [최신 단일 HTML](../2026-08-24-flowme-text-authoring-flow-view-poc-results/flowme-text-authoring-flow-view-poc.html)
- 절대 경로: `D:\flowme2605\flow-text-authoring-flow-view-poc-20260824\docs\content-audit\2026-08-24-flowme-text-authoring-flow-view-poc-results\flowme-text-authoring-flow-view-poc.html`
- 크기: `2,608,713 bytes`
- SHA-256: `3A873A78BD084C6C5E732A8FF294BDFB0CB53CCF776F7E0AF642A5981F3A901F`
- 생성 확인: `2026-08-25 09:11 KST`

화면 증거:

- [390px](./flow-live-editor-after-390.png)
- [1024px](./flow-live-editor-after-1024.png)

화면 캡처와 자동화는 내부 QA 증거이며 관찰 사용자 검증이 아니다.

## current → target → 결과

| 구분 | current | 승인 target | 결과 |
| --- | --- | --- | --- |
| 예시 | standalone product 조합에서 대표 5개만 보임 | 기존 source의 31개를 기본 PoC에서 복구 | 1개 작성 문법 + 30개 검증 예시, source order 그대로 노출 |
| 축소 모드 | 대표 5개 | `authoringQa=0`에서 유지 | 5개 유지, QA group·count 없음 |
| 제품 경계 | 실제 route는 기존 textarea | QA catalog와 Flow editor가 새지 않음 | `/flows/new`에서 editor·`qa:*`·group·count·link 모두 0 |
| action 표현 | marker와 긴 본문 정렬이 약함 | marker/body 2열과 hanging indent | 줄바꿈한 모든 본문 line의 x축 동일 |
| 계층 | root, property, child가 평평함 | canonical owner 기반 한 단계 계층 | child/property만 depth 1, 독립 Item은 depth 0 |
| 접근성 | marker를 숨기며 상태·번호도 사라짐 | 의미를 accessible name에 보존 | 미완료·완료·글머리표·ordinal을 각각 전달 |
| 긴 문서 확대 | 가상 높이 재측정 중 마지막 line이 pane 밖에 남을 수 있음 | keyboard-only로 마지막 source까지 도달 | `Ctrl+End`가 inner editor와 outer clipping pane을 함께 맞춤 |
| 오른쪽 결과 | 기존 projection | 변경 0 | 예시 전환·mode 전환·계층 표현 전후 동일 계약 유지 |

## 변경 책임

- `AuthoringChrome`: PoC 전체 catalog와 기존 5개 축소 모드를 분리하고 비교 링크의 44px touch target을 보장한다.
- `TextAuthoringWorkspace`·standalone builder: 전체 catalog는 `flowViewPocEnabled`인 격리 HTML에서만 켠다.
- `AuthoringFlowViewModel`: 기존 source/canonical block만 presentation hierarchy로 옮기고, child 여부는 canonical `subcheck`만 인정한다.
- `FlowLiveEditor`: marker/body grid, depth-1 guide, root 간격, active raw line, checked/ordinal accessible label과 장문 boundary keyboard reveal을 제공한다.
- tests: 31개 전수 raw source·결과 eligibility·재선택, root/child/wrap/source/accessibility, 8 viewport·200%, 제품 gate-off를 고정한다.

예시 source 파일과 generated fixture의 SHA-256은 작업 전후 각각 `12A8BB...58BAC`, `6EC8F4...256E4`로 동일하다. 이번 작업에서 외부 원문을 새 fixture로 복제하거나 source 내용을 고치지 않았다.

## 실패·복구·rollback

- review에서 들여쓴 plain bullet/ordered가 시각 child로 오인되는 경우를 발견했다. whitespace 조건을 제거하고 canonical `subcheck`만 child로 인정했으며 독립 Item 3개 regression을 추가했다.
- 200% 글자 확대와 320px에서 CodeMirror의 가상 높이가 여러 frame에 걸쳐 갱신되어 `Ctrl+End` 직후 마지막 line이 footer 아래에 남는 실패를 재현했다. 선택·source를 바꾸지 않고 editor boundary와 outer pane scroll만 재측정하도록 수정했다.
- 계층 계산, 예시 선택 또는 UI sidecar 실패 시에도 raw source와 기존 오른쪽 projection이 권위다. PoC gate를 끄면 기존 textarea와 대표 예시만 남는다.
- source bytes loss, 신규 Todo 발명, product leakage, 외부/public write는 fresh QA에서 `0`이었다.

## Fresh QA

아래 결과는 이 checkout에서 2026-08-25 KST에 새로 실행했다.

| 범위 | 명령 | 결과 |
| --- | --- | --- |
| model·adapter·UI·examples targeted | `npx.cmd tsx --test ...` 5개 파일 | `49/49 PASS`, exit `0` |
| shared Text Authoring | `npm.cmd run test:text-authoring` | `361/361 PASS`, exit `0` |
| docs | `npm.cmd run docs:check` | 16 required files·4,645 links PASS, exit `0` |
| standalone artifact | `npm.cmd run build:text-authoring-flow-view-poc` | 단일 HTML 생성 PASS, exit `0` |
| production build boundary | `npm.cmd run build` | compile·typecheck·19-page generation PASS, exit `0` |
| isolated browser full | `npx.cmd playwright test --config playwright.flow-view.config.ts --workers=1` | `22/22 PASS`, exit `0` |
| hierarchy viewport subset | 같은 run의 `LIVE-HIERARCHY` | 320·360·390·899·900·1024·1280·1440, `8/8 PASS` |
| product gate-off | `npx.cmd playwright test tests/e2e/text-authoring-flow-view-gate-off.spec.ts --config playwright.config.ts --workers=1` | `1/1 PASS`, exit `0` |
| whitespace | `git diff --check` + 신규 source trailing-space scan | PASS |
| independent read-only review | scoped code·현재 HTML 재검토 | Blocking `0`, High `0` |

추가 진단에서 repo-wide `npm.cmd test`는 Text Authoring과 무관한 `seed-flows` source-review 날짜 gate 1건 때문에 `623/624`로 끝났다. 2026-05-21/23 기준 source 44개가 현재 날짜에 `review_due`인 것이 원인이며 이 격리 PoC에서 source 날짜를 고치거나 gate를 완화하지 않았다. 별도 `npx.cmd tsc --noEmit`도 기존 repo-wide test typing 오류를 보고했지만, 지원되는 `npm.cmd run build`의 compile·typecheck는 통과했고 이번 scoped 파일 오류는 없었다.

## Subtraction과 상태 분리

- 추가하지 않음: 별도 preview 영역, Todo식 카드 분할, 깊은 rainbow nesting, 새 helper/card/badge, 변환·적용 버튼, 새 top-level route.
- 변경하지 않음: parser 의미, canonical 객체, projection, durable save/revision, P1/P2 runtime, main app navigation/store/schema.
- local edits: 있음
- commit / push / PR / merge / deploy: `0 / 0 / 0 / 0 / 0`
- P35 / external side effect / observed-user session: `0 / 0 / 0`

최종 상태는 `LOCAL_INTERNAL_QA_PASS`다. 실제 사용성 검증이나 release 완료를 뜻하지 않는다.
