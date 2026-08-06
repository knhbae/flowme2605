# FlowMe 텍스트 저작 선택형 항목 검토 개발 목표

> 내부 Item 구조는 유지하되, 정상 입력의 기본 UX를 `입력 → 즉시 결과`로 줄이고 구조 검토는 필요할 때만 여는 보정 작업의 정본 목표다.

## 0. 상태와 경계

| 항목 | 값 |
|---|---|
| 기준일 | 2026-08-04 |
| 상태 | `LOCAL_QA_PASS` |
| checkout | `D:\flowme2605\flow-text-authoring-ta` |
| branch / HEAD | `codex/text-authoring-ta-implementation-20260729` / `c09f859b30b854f6f897b8ec1eb781fd774fbeca` |
| 시작 worktree | modified 20, untracked 16; 기존 변경은 reset·clean·stage하지 않음 |
| 제품 기준 | 현재 FlowMe 색·타이포·control token과 Text Authoring v2 문법·ID·projection |
| publish | commit, push, PR, merge, Preview, Production 모두 범위 밖 |
| 사용자 검증 | 수행하지 않음. 자동·브라우저 QA는 내부 검증으로만 기록 |

## 1. 문제 정의

현재 내부 구조와 화면 구조가 같은 것으로 취급돼 사용자가 다음 흐름을 거치도록 보인다.

```text
입력 → 항목 구조 확인 → 결과 → 저장
```

그러나 정상적으로 해석된 원문은 사용자가 구조를 승인하지 않아도 이미 deterministic하게 결과를 만들 수 있다. 현재 구현도 `결과` 탭을 `항목 구조`와 같은 조건으로 활성화해 직접 이동을 허용하면서, 모바일·태블릿의 주 CTA는 `구조 확인`을 먼저 요구한다. 이 불일치는 항목 구조를 필수 단계처럼 보이게 하고, 결과를 보려는 사용자의 인지 부하를 늘린다.

## 2. 한 문장 목표

> **사용자는 원문을 입력하면 결과를 즉시 보고, `N개 항목으로 반영됨` 요약이나 실제 문제 신호를 통해서만 항목 검토를 선택한다.**

내부 parser와 canonical hierarchy는 계속 필요하지만 visible journey의 필수 중간 단계는 아니다.

## 3. 제품 결정

### 3.1 유지

- `SourceRow → Item → Step → Flow` canonical model
- stable Flow/Step/Item ID와 source lineage
- `- [ ]` Item, `  - 속성:` property, prose source-text 경계
- 구조 수정의 이동·병합·분리·역할·포함 여부·undo
- unresolved issue의 원문 유지·할 일 변환·보류 decision
- 결과별 preview/export parity, raw source snapshot, P35 분리 adapter 경계

### 3.2 변경

- desktop 기본 본문: `입력 | 결과` 2영역
- tablet/mobile navigation: `01 입력 | 02 결과` 2단계
- 정상 입력의 주 CTA: `결과 보기 · N개`
- 구조 영역: 독립 pane/stage가 아닌 desktop `항목 검토` drawer 또는 mobile bottom sheet
- compact launcher: `N개 항목으로 반영됨 · 항목 검토`
- 문제가 있으면 launcher를 `항목 검토 N개 필요`로 승격하고 warning 상태·설명을 제공
- 결과 행의 기존 `수정`은 해당 Item inspector로 직접 연결

### 3.3 제거

- desktop의 상시 세 번째 `항목 구조` 열
- mobile의 `02 항목 구조` 번호 탭과 `입력 → 구조 → 결과` 강제 CTA
- 정상 입력에서 반복되는 단계 수·Item 목록·선택 placeholder
- 항목 검토를 완료했다는 별도 승인·저장 상태

## 4. 목표 사용자 흐름

### 4.1 정상 입력

```text
원문 입력 또는 예시 선택
  → parser가 즉시 반영
  → desktop 결과 pane 갱신 / mobile 결과 탭 활성
  → 결과 형태와 실제 preview 확인
  → 필요하면 `N개 항목으로 반영됨 · 항목 검토`
  → 저장·복사·내보내기
```

정상 입력에서는 항목 검토 surface를 열지 않아도 결과 확인과 로컬 저장이 가능해야 한다.

### 4.2 검토가 필요한 입력

```text
원문 입력
  → unresolved/unsupported/invalid source issue 감지
  → `항목 검토 N개 필요`를 결과와 mobile navigation에 명확히 표시
  → 사용자가 검토 surface를 열어 원문 유지·할 일 변환·보류 또는 원문 수정
  → 결과와 count 즉시 갱신
```

기존 export policy가 막는 blocking issue는 계속 막는다. 구조 검토 launcher만 숨겨서 오류가 사라진 것처럼 보이게 하지 않는다.

### 4.3 구조를 직접 바꾸려는 경우

```text
`N개 항목으로 반영됨 · 항목 검토`
  → Item 선택
  → `구조 수정`
  → 이동·병합·분리·역할·포함 변경
  → 적용 전 충돌/분리 경계 확인
  → 결과 즉시 반영, undo 가능
```

## 5. 화면 계약

### 5.1 desktop/tablet `>= 900px`

| 영역 | 역할 |
|---|---|
| 왼쪽 입력 | title, source text, live reflection, 필요 시 source/ownership disclosure |
| 오른쪽 결과 | compact 항목 해석 summary, 고정 4-slot rail, 실제 preview, 결과 행동 |
| overlay | 항목 검토와 구조 수정. 본문 열을 차지하지 않음 |

두 pane은 각자 독립 스크롤을 유지한다. 결과 폭은 Sheet table·상세·긴 URL을 읽을 수 있어야 한다.

### 5.2 compact/mobile `< 900px`

- stage navigation은 `01 입력 / 02 결과`만 표시한다.
- 입력 stage의 primary CTA는 stale/pending이면 `지금 반영`, 최신이면 `결과 보기 · N개`다.
- 결과 stage에는 `입력 보기`와 저장 행동이 있다.
- 항목 검토는 결과 상단 launcher로 열며 viewport 높이 안에서 독립 스크롤한다.
- 390×600, 360×640, 844×390에서 마지막 Item·닫기·저장 행동에 도달한다.

### 5.3 항목 검토 launcher

정상 상태:

```text
3개 항목으로 반영됨 · 항목 검토
```

주의 상태:

```text
확인이 필요한 문장 2개 · 항목 검토
분류하지 못한 문장은 원문에 남아 있습니다.
```

launcher는 button이며 count와 상태를 accessible name에 포함한다. warning은 색만으로 전달하지 않는다.

## 6. 검토 필요 계산

### 6.1 자동 승격

`buildAuthoringOutlineView(...).issues`에 outstanding issue가 하나 이상이면
`reviewNeeded=true`다. Export의 `authoring_issue` blocker도 같은 source-linked issue를
사용하므로 검토 surface와 export gate가 서로 다른 수를 만들지 않는다.

Source update conflict, 상대 날짜의 기준일 누락, 권리·안전 review는 각자의 기존 결과
검토 surface가 소유한다. 이 상태들을 항목 검토 수에 더해 같은 문제를 두 번 보여주지 않는다.

### 6.2 정상 상태

- issue 0
- source-linked outline issue 없음
- parser와 결과의 Item ID/count가 일치

정상 상태에서는 검토 launcher를 중립 summary로 보이고, 사용자가 열지 않아도 다음 행동을 막지 않는다.

## 7. 상태와 접근성

- `AuthoringStage`의 visible navigation은 `input | result`만 사용한다.
- 저장된 이전 draft의 `activeStage=structure`는 로드 시 `result`로 migration/normalization한다.
- review dialog를 닫으면 launcher 또는 호출한 결과 행으로 focus를 돌린다.
- Escape로 닫기, Tab trap, dialog label·description, scroll lock을 기존 `AuthoringDialog` 계약으로 유지한다.
- 결과 행 `수정`은 Item inspector를 열고 닫을 때 그 행으로 focus를 복귀한다.
- `aria-live`는 count/검토 필요 변화만 짧게 알리고 입력마다 긴 문장을 반복하지 않는다.

## 8. 구현 단계

### `TA-OSR-01` 목표·baseline 고정

- 이 문서와 시작 branch/HEAD/dirty count 기록
- 기존 3-pane/3-stage 화면과 test ID inventory
- normal/warning/mobile acceptance fixture 고정

### `TA-OSR-02` visible stage 축소

- `AuthoringStageNavigation`을 input/result 2단계로 변경
- primary CTA와 `runPrimaryAction`을 input→result로 변경
- 이전 `structure` persisted stage를 result로 normalize

### `TA-OSR-03` desktop 2-pane

- grid를 input/result 두 열로 변경
- StructurePane의 상시 render 제거
- Sheet/상세/URL용 결과 폭 확대

### `TA-OSR-04` 선택형 항목 검토

- compact launcher와 review-needed 상태 추가
- `AuthoringDialog` 안에 StructurePane을 배치하되 nested dialog·full-height 충돌을 해소
- launcher/issue/result-row focus return 검증

### `TA-OSR-05` 회귀와 standalone

- unit/E2E를 2단계 journey로 갱신
- standalone 재생성
- route/standalone semantic·interaction parity 확인

### `TA-OSR-06` 브라우저·closeout

- desktop 1440×900, tablet 1024×768, mobile 390×844·390×600·360×640·844×390
- scroll end, horizontal overflow, sticky overlap, keyboard, console/page/request/replacement character
- docs, decision, service, status, result evidence 동기화

## 9. Acceptance criteria

### 정상 경로

- [x] desktop 첫 화면에는 입력과 결과 두 pane만 있다.
- [x] mobile navigation은 입력과 결과 두 탭만 있다.
- [x] 입력 최신 상태에서 primary CTA 한 번으로 결과로 간다.
- [x] 구조 review를 열지 않고 결과 확인·로컬 저장이 가능하다.
- [x] 입력을 수정하면 현재 stage를 바꾸지 않고 결과가 갱신된다.

### 선택형 검토

- [x] 중립 launcher에 included Item count가 맞게 표시된다.
- [x] launcher로 전체 Step/Item과 구조 수정에 접근한다.
- [x] 결과 행 수정으로 Item inspector에 바로 접근한다.
- [x] merge/split confirmation·undo와 source lineage가 유지된다.

### 문제 경로

- [x] unresolved issue가 있으면 검토 필요 count·텍스트가 보인다.
- [x] issue 해결 뒤 count와 result Item 수가 즉시 갱신된다.
- [x] blocking issue는 export에서 계속 fail-closed다.
- [x] 기준일 누락과 권리·안전 review는 구조 count와 중복되지 않는다.

### 반응형·동등성

- [x] 1440 desktop 두 pane 비율과 독립 스크롤이 정상이다.
- [x] 작은 화면에서 review의 마지막 Item·닫기·저장에 도달한다.
- [x] route와 standalone이 같은 `TextAuthoringWorkspace`와 CSS를 번들하며 2-pane·optional review 마커를 포함한다.
- [x] actionable console/page/failed/external request, replacement character, horizontal overflow가 0이다.

### 회귀

- [x] Text Authoring unit PASS: `161 / 161`
- [x] full unit PASS: pretest `100 / 100` + test `594 / 594`
- [x] focused Text Authoring E2E/visual scenarios: `34 / 34`
- [x] production build PASS: static routes `18 / 18`
- [x] standalone build PASS: final byte size is recorded in the result README
- [x] docs check와 `git diff --check` PASS

## 10. Hard fail

1. visible pane만 숨기고 구조 수정·issue 해결 경로가 사라진다.
2. 정상 입력도 review open/확정을 요구한다.
3. unresolved issue가 결과·export에서 조용히 빠진다.
4. launcher count와 canonical included Item count가 다르다.
5. result-row 수정이 다른 Item을 연다.
6. persisted `structure` stage 때문에 빈 화면이나 접근 불가능 상태가 생긴다.
7. mobile dialog가 body scroll을 가두거나 마지막 행동을 덮는다.
8. parser·canonical ID·projection·export 의미를 이 UX 변경과 함께 바꾼다.
9. P35 checkout을 수정하거나 자동 통합한다.
10. 내부 QA를 관찰 사용자 검증으로 표현한다.

## 11. 예상 수정 범위

| 범위 | 후보 파일 |
|---|---|
| visible stages | `components/flow/text-authoring/authoring-ui-types.ts`, `AuthoringChrome.tsx`, `TextAuthoringWorkspace.tsx` |
| optional review | `StructurePane.tsx`, 필요 시 새 focused component |
| layout | Text Authoring 범위의 `app/globals.css` |
| behavior | `tests/e2e/text-authoring.spec.ts`, focused unit/view-model tests |
| standalone/evidence | `scripts/build-text-authoring-standalone.mjs`, capture scripts, 새 content-audit 결과 |
| durable docs | `DECISIONS.md`, `SERVICE_STRUCTURE.md`, `STATUS.md`, `docs/specs/README.md` |

문법·parser·projection에 실제 재현 결함이 없다면 `lib/flow/text-authoring/*`는 변경하지 않는다.

## 12. 되돌리기 단위

1. visible stage와 CTA
2. desktop grid
3. optional review launcher/dialog
4. E2E/capture evidence
5. docs/status

UI 보정이 실패해도 v2 문법·원문 snapshot·stable ID·projection/export 계약은 그대로 남아야 한다.
