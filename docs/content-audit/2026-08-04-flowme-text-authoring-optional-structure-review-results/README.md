# FlowMe 텍스트 저작 선택형 항목 검토 결과

> `/flows/new`의 기본 저작 여정을 `입력 → 결과`로 줄이고, 내부 Step/Item 구조는 필요할 때만 여는 `항목 검토`로 이동한 로컬 구현·내부 QA 결과다.

## 1. 결론

- `>=900px`: 입력과 결과를 동시에 보는 두 pane
- `<900px`: `01 입력 / 02 결과`의 한 pane씩 단계 전환
- 정상 입력: `N개 항목으로 반영됨`과 중립 `항목 검토`만 표시하며 검토 없이 결과 확인·로컬 저장 가능
- 문제 입력: source-linked outline issue만 `확인이 필요한 문장 N개`로 승격
- 구조 보정: 결과 상단 launcher의 desktop drawer/mobile bottom sheet에서 순서·묶음·역할 수정
- 직접 수정: 결과 행의 `수정`은 해당 Item inspector로 바로 연결
- 이전 초안: 저장된 `activeStage=structure`는 결과로 정규화하고 항목 검토를 연다.
- parser, canonical ID, source lineage, projection/export, P35 adapter 경계는 변경하지 않았다.

현재 판정은 `LOCAL_QA_PASS`다. Commit, push, PR, merge, Preview, Production 배포와 관찰 사용자 검증은 수행하지 않았다.

## 2. 목표 대비 결과

| 구분 | 이전 | 현재 | 판정 |
|---|---|---|---|
| 기본 여정 | 입력 → 항목 구조 → 결과 3단계 | 입력 → 결과 2단계 | PASS |
| desktop 구성 | 구조 pane이 항상 중앙을 점유 | 입력/결과 2-pane + 필요 시 우측 drawer | PASS |
| mobile 구성 | 구조가 독립된 두 번째 단계 | 입력/결과 2단계 + bottom sheet 검토 | PASS |
| 정상 상태 | 구조를 매번 확인해야 하는 인상 | `N개 항목으로 반영됨` + 중립 `항목 검토` | PASS |
| 문제 상태 | 애매한 문장이 구조 화면 안에 묻힘 | `확인이 필요한 문장 N개`로 결과 상단 승격 | PASS |
| 세부 편집 | 구조 단계를 거쳐 Item 수정 | 결과 행에서 Item inspector 직접 열기 | PASS |
| 구조 편집 | 기본 화면에서 상시 노출 | drawer/sheet 안의 `순서·묶음 수정` | PASS |
| 이전 draft | `structure` stage 복원 위험 | 결과로 정규화하고 선택형 검토 열기 | PASS |
| breakpoint | 1280·900·768 규칙이 섞일 위험 | 900px 하나로 navigation, pane, footer, drawer 통일 | PASS |
| 작은 화면 | 짧은 예시만으로 scroll-end를 주장 | 27개 항목에서 실제 overflow와 마지막 행 도달 확인 | PASS |

## 3. 화면 문구 변화

기본 화면에서 제거한 문구와 단계:

- `02 항목 구조`
- 입력 → 구조 → 결과를 강제하는 `구조 확인`
- 결과에서 다시 중간 단계로 보내던 `항목 다시 보기`
- 정상 입력에서도 항상 보이던 구조 설명과 편집 조작

현재 기본 문구:

- 입력 CTA: `결과 보기 · N개`
- 정상 결과: `N개 항목으로 반영됨` / `항목 검토`
- 문제 결과: `확인이 필요한 문장 N개` / source-linked issue 안내
- mobile 결과 복귀: `입력 수정`

## 4. 검토 수의 소유권

`항목 검토`의 경고 수는 `buildAuthoringOutlineView(...).issues`의 unresolved source-linked issue만 센다. Export의 `authoring_issue` blocker는 같은 issue를 사용한다.

다음 상태는 중복 합산하지 않는다.

| 상태 | 해결 surface |
|---|---|
| source update conflict | 원문 변경 banner/dialog |
| 상대 날짜 기준일 누락 | 결과의 기준일 입력 |
| 권리·안전 review | 기존 결과 review dialog |

## 5. 시각 비교와 증거

기존 3-pane 기준:

- [1440 기존 화면](../2026-08-04-flowme-text-authoring-v2-round2-results/round2-visual-evidence/V01-route-simple-1440x900.png)
- [390 기존 결과 단계](../2026-08-04-flowme-text-authoring-v2-round2-results/round2-visual-evidence/V03-route-simple-390x844.png)

현재 2-pane·선택형 검토:

- [1440 입력·결과 2-pane](./visual-evidence/osr-01-1440-two-pane.png)
- [1440 항목 검토 drawer](./visual-evidence/osr-02-1440-item-review-drawer.png)
- [1024 입력·결과 2-pane](./visual-evidence/osr-03-1024-two-pane.png)
- [390 입력 단계](./visual-evidence/osr-04-390-input-stage.png)
- [390 결과 단계](./visual-evidence/osr-05-390-result-stage.png)
- [390 항목 검토 sheet](./visual-evidence/osr-06-390-item-review-sheet.png)
- [390·27개 항목 scroll-end](./visual-evidence/osr-07-390-item-review-scroll-end.png)
- [390 확인 필요 결과](./visual-evidence/osr-08-390-review-warning.png)
- [390 확인 필요 검토 sheet](./visual-evidence/osr-09-390-warning-review-sheet.png)

[브라우저 증거 JSON](./optional-structure-review-evidence.json)은 다음을 기록한다.

- desktop visible pane `2`, structure stage `0`, 기본 review closed
- 1024 visible pane `2`
- mobile stage `input / result`
- 27개 항목 검토 scroll: `clientHeight 615`, `scrollHeight 2,139`, `scrollTop 1,524`
- horizontal overflow `false`
- runtime error `0`, actionable console error `0`, unexpected failed request `0`
- 로컬 favicon 404 console 한 건은 제품 interaction과 무관한 known noise로 원문 배열에 보존
- observed-user sessions `0`

## 6. 검증

| 검증 | 결과 |
|---|---|
| `npm.cmd run test:text-authoring` | PASS `161 / 161` |
| `npm.cmd test` | PASS pretest `100 / 100` + test `594 / 594` |
| focused Text Authoring E2E + visual QA | PASS `34 / 34` |
| 899/900px breakpoint regression | PASS `1 / 1` |
| `npm.cmd run build` | PASS, static pages `18 / 18` |
| `npm.cmd run build:text-authoring-html` | PASS, [standalone HTML](../2026-08-04-flowme-text-authoring-grammar-ux-improvement-results/flowme-text-authoring-v2-test.html) `2,109,576` bytes |
| `npx.cmd tsc --noEmit` | 기존 저장소 test 진단 때문에 FAIL; 변경 파일 진단은 없고 Next의 `tsconfig.next.json` type check는 PASS |
| docs/link/diff checks | 최종 closeout에서 기록 |

Standalone builder는 route와 같은 `TextAuthoringWorkspace` 및 `app/globals.css`를 번들한다. 생성 파일에는 `ta-osr-1440-two-pane`, `ta-authoring-item-review`가 있고 이전 `ta-authoring-stage-structure`는 없다. 인앱 브라우저는 보안 정책상 로컬 `file:///` 이동을 거부했으며 다른 browser surface로 우회하지 않았다. 따라서 direct-file interactive inspection이 아니라 동일 컴포넌트 번들, 정적 marker, route E2E로 동등성을 확인했다.

## 7. 남은 비차단 관찰

- desktop drawer의 선택 행 `수정` 강조와 다른 행의 edit affordance 차이는 후속 미세 조정 후보다.
- 날짜·시간대·반복 metadata의 작은 크기와 낮은 대비는 시각 접근성 조정 후보다.
- mobile 결과의 D-Day 설명 카드는 첫 화면 면적을 더 줄일 수 있다.
- 이 항목들은 이번 목표의 필수 흐름·스크롤·경고·저장·회귀를 막지 않는다. 관찰 사용자 근거 없이 새로운 필수 구조 단계나 정보 카드를 추가하지 않는다.

## 8. 산출물

- [상세 개발 목표](../../specs/2026-08-04-flowme-text-authoring-optional-structure-review/00-development-goal-ko.md)
- [최신 standalone HTML](../2026-08-04-flowme-text-authoring-grammar-ux-improvement-results/flowme-text-authoring-v2-test.html)
- [시각 QA spec](../../../tests/e2e/text-authoring-optional-structure-review.visual.spec.ts)
- [브라우저 증거 JSON](./optional-structure-review-evidence.json)
