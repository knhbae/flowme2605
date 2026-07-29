# P35 independent review completion audit

작성일: 2026-07-27
검토 역할: `codex_independent`
관찰 사용자 수: `0`

## Evidence boundary

- 제공 Preview URL은 Vercel 인증으로 전환되어 직접 조작하지 못했다.
  - status: `inaccessible`
- P35 후보는 baseline
  `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd` 위의 미커밋 변경을 build한
  로컬 런타임에서 조작했다.
  - evidenceKind: `current_automated_test`, `current_source`
- Production은 현재 P32 비교에만 사용했다.
  - evidenceKind: `production_comparison`
- screenshot, Playwright, heuristic simulation은 실제 사용자 관찰이 아니다.

## 요구사항별 완료 상태

| 요구 | 상태 | 근거 |
|---|---|---|
| Severity 순 findings | complete | `audit.md`, `review.html`; High 6, Medium 5, Low 1 |
| P35 전체 방향 판정 | complete | `revise`, `bounded_composition_revision`, 구조 C 선택 |
| 사용자 피드백 F01-F07 | complete | `decision-matrix.json`, `review.html` |
| 5개 persona Session A/B/C | complete | `persona-journey-scorecard.json`, `journey-direct-evidence.json` |
| `/flows` 개인 메모 route | complete | `persona-journey-scorecard.json.additionalRouteCheck` |
| 390px current/proposed | complete | 9개 interactive case in `review.html` |
| 1024px current/proposed | complete | 9개 interactive case in `review.html` |
| 저장 전·receipt·실행·기록 surface ownership | complete | `surface-ownership.json`, `review.html` |
| 유지·제거·이동 UI와 command | complete | `keep-move-remove-command-matrix.json`, `review.html` |
| 다음 구현 slice와 dependency | complete | `next-program.md`, R1-R7 |
| 관찰 전 필수 수정 | complete | `audit.md`, `next-program.md` |
| 실제 사용자 질문 | complete | `review.html`, `next-program.md`; 최대 5개 |
| source/personal/run/occurrence/export 보존 | complete | migration 없음, `surface-ownership.json` |
| 앱 코드 미수정 | complete | 산출물 경로만 변경 |

## 직접 조작 범위

- 390x844:
  - moving: preview, adjustment, receipt, My Flow, Item detail, export
  - vehicle: undated save, completion/undo, title/date edit, Calendar, reload,
    whole/selected/current export
  - workout: weekday/time/duration/end count, receipt, My Flow, Calendar,
    completion/undo, record, export
  - study: save, receipt, My Flow, completion/undo, 8-row plan, Sheet export
  - guide: save, receipt, My Flow, completion/undo, 4-row plan, Memo export, reload
  - memo draft: proposal, save, Item detail, completion/undo
- 1024x768:
  - five public shapes
  - five saved personal Flow workspaces
  - multi-Flow Calendar
- 상세 screenshot mapping은 `journey-direct-evidence.json`에 기록했다.

## 새로 확인한 중요 gap

반복 Flow에서 시작일을 확정하지 않으면 public preview는 날짜가 있는 반복 결과처럼
보이지만 저장 후 My Flow와 export는 날짜 없는 1개 항목으로 바뀐다. 이 finding은
P35-R1의 artifact parity 범위에 포함했다. 안정된 데이터 identity를 바꾸는 문제가
아니라 provisional/committed state를 같은 projection에서 구분하는 문제다.

## 검증 결과

- `npm.cmd run build`: passed
- P35 targeted Playwright: `30 passed`
- sampled horizontal overflow: `0`
- sampled visible unnamed controls: `0`
- JSON parse: `5/5 passed`
- HTML screenshot reference: `18/18 present`
- review HTML 390/1024/1440 render: overflow `0`, unnamed control `0`,
  console/page error `0`
- mobile current/proposed selector: `9/9 passed`
- wide current/proposed selector: `9/9 passed`
- `npm.cmd run docs:check`: passed
- scoped text trailing whitespace: `0`

## 최종 판정 조건

아래 항목은 모두 통과했다.

1. 모든 JSON parse
2. 모든 HTML screenshot 경로 존재
3. 390px document horizontal overflow 0
4. mobile/wide wireframe selector 전 case 작동
5. `npm.cmd run docs:check`
6. scoped `git diff --check`
7. 로컬 서버와 browser session 종료: passed
