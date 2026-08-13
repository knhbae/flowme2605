# FlowMe Text Authoring P1-C 장문·표 보존 개발 목표

- 승인 ID: `TA-P1-C-LONGFORM-20260813-01`
- track/status: `P1-C-LONGFORM / APPROVED_FOR_LOCAL_IMPLEMENTATION`
- 기준 commit: `5ef186d40128f265854ce1141c94f1b80141707e`
- target checkout: `D:\flowme2605\flow-text-authoring-p1-c-longform-20260813`
- target branch: `codex/text-authoring-p1-c-longform-20260813`
- 현재 상태: `LOCAL_INTERNAL_QA_PASS / LOCAL_COMMIT_INCLUDED`
- 게시 경계: `LOCAL_ONLY`
- 외부 side effect: `0`
- 관찰 사용자 세션: `0`

## 0. 승인 근거와 복원 경계

- approved by: FlowMe repository owner / current user
- approved at: `2026-08-13 10:20 KST`
- 현재 사용자 승인 문구:

  > TA-P1-C-LONGFORM-20260813-01 승인. 직전 답변의 APPROVAL_MANIFEST 전체를 그대로 승인하며, 승인 정본 기록, 새 worktree/branch 생성, P1-C 구현, fresh QA와 target local commit까지 허용한다. 명시된 제외 범위와 LOCAL_ONLY 경계는 유지한다.

- archived canonical provenance:
  - ref: `refs/archive/main-uncommitted-20260813^3`
  - commit: `8d5e3bf6c4ae192c142198211c64330a013c7a6d`
  - path: `docs/content-audit/2026-08-13-flowme-text-authoring-development-handoff/01-track-disposition-and-approval-manifest-ko.md`
  - blob: `ab0acc33fdfae4a97ed61b4fa121c1563c0e0eba`
  - SHA-256: `A0A0380865D24C7014700970C0E2941615C506C81E9CB8598DF2716FA7FD6B3E`

현재 `flow-mvp/main` working copy에는 위 정본 파일이 없다. 이 개발의 승인은 아카이브
ref의 exact blob과 사용자 명시 승인으로 추적하며, 파일을 현재 `main`에
복원하는 작업은 이 track에 포함하지 않고 별도 scope로 남긴다.

## 1. 목표

긴 원문과 CSV·TSV·Markdown 표를 Text Authoring에 붙여넣을 때 원문 bytes와
표 모양을 조용히 잃지 않도록 한다. 안전하게 읽은 구조만 결과에 투영하고,
손실 가능성이 있는 범위는 원문 그대로 보존한 채 해당 결과만 차단한다.

이 track의 완료 상태는 로컬 구현과 fresh 내부 QA, target local commit까지다.
push, PR, merge, 배포, P35 연결과 관찰 사용자 검증은 포함하지 않는다.

## 2. 사용자 문제와 첫 행동

사용자는 긴 문서나 표를 `원문 TXT`에 붙여넣는다. 시스템은 다음 순서로
반응해야 한다.

1. 입력 전체를 먼저 손실 없이 보존한다.
2. source block과 표 구조를 제한 안에서 분석한다.
3. 안전한 block만 Calendar·Todo·Sheet에 사용한다.
4. 안전하지 않은 block은 TXT/raw에 그대로 남긴다.
5. 막힌 결과와 이유, 확인할 원문 위치를 직접 보여 준다.
6. 사용자가 명시 저장하면 현재 WorkingSource와 그 revision의 결과를 함께
   저장한다.
7. 저장 후 재진입해도 원문과 진단을 다시 계산할 수 있어야 한다.

완료 기준은 “모든 원문을 구조화함”이 아니라 “원문 손실 없이 안전한 결과와
fallback을 구분함”이다.

## 3. current → target → 제외 범위

| 영역       | P0 current                                                         | P1-C target                                                                                       | 이번에 하지 않음                          |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 일반 문장  | TXT 원문으로 보존하지만 일부 보조 직렬화가 공백을 정규화할 수 있음 | WorkingSource 원문을 byte-exact fallback의 정본으로 사용                                          | WYSIWYG·문서 편집기                       |
| rich block | blockquote·code·HTML·comment를 주로 행 단위 issue로 판정           | marker·들여쓰기·빈 줄을 포함한 raw-preserved block과 exact locator 제공                           | HTML 실행·Markdown 렌더러 확장            |
| 표         | 단순 CSV·TSV·Markdown 표를 Sheet/TXT에 투영                        | quoted comma·escaped quote/pipe·multiline cell·빈 셀·URL·통화를 lossless일 때만 Sheet에 투영      | spreadsheet editor·formula·XLSX 원본 입력 |
| 사실 행    | 단순 표는 Sheet/TXT 전용                                           | action marker 없는 가격·재료·metadata의 신규 Todo·Calendar `0`                                    | 자동 role 추론                            |
| 손실 진단  | generic issue 또는 artifact loss 안내                              | table별 stable ID·exact range·count를 소유한 authoritative loss manifest로 해당 결과만 fail-close | 자동 보정·silent normalization            |
| 장문 한도  | 명시된 세 축 budget 없음                                           | UTF-8 `1 MiB`, `20,000` lines, `50,000` logical cells                                             | 원문 truncate·delete                      |
| 탐색       | Item/issue의 source row 이동                                       | 장문에서 필요한 경우에만 document navigator와 exact source range 이동·focus return                | 상시 outline·세 번째 pane                 |
| 재진입     | raw source와 기본 focus target 보존                                | 같은 raw bytes로 진단 재현, locator가 stale이면 안전한 인접 위치로 복구                           | P1-B immutable service revision           |

## 4. P0 불변식

1. 평문 붙여넣기가 기본이고 문법은 선택이다.
2. 표식 없는 문장은 Todo가 아니라 TXT 원문 메모다.
3. root `- [ ]`만 부모 Todo이고 두 칸 들여쓴 `  - [ ]`만 한 단계 하위
   checklist다.
4. Routine은 Item recurrence이며 별도 result type이 아니다.
5. 날짜가 있는 같은 Item만 Calendar grid에 나타난다.
6. Calendar·Todo·Sheet·TXT 제작 검토와 외부 transfer를 섞지 않는다.
7. source, canonical, projection, recovery, explicit save, ready 상태를 분리한다.
8. Inspector의 안전한 submit만 source+canonical+projection을 한 번에 바꾸고
   undo 한 번으로 복원한다.
9. 손실 가능 block은 write `0`, 원문 이동과 TXT fallback을 제공한다.
10. display sort는 source reorder가 아니다.
11. ready는 publication이 아니며 network·P35 side effect는 `0`이다.

## 5. 데이터·상태 계약

### 5.1 WorkingSource

- `rawText` 전체가 원문 정본이다.
- 분석·미리보기·navigator 열기만으로 source write를 만들지 않는다.
- line ending, blank line, indentation, comment, code fence, HTML과 unknown
  property를 조용히 정규화하지 않는다.
- budget을 넘더라도 저장·복사·TXT 다운로드 경로의 원문은 자르지 않는다.

### 5.2 Raw-preserved block

구조화하지 않는 block은 최소한 다음 정보를 가진다.

- stable block ID
- user-facing kind: prose, blockquote, code, HTML/comment, table, unknown
- exact start/end offset와 start/end line
- 원문 slice와 무손실 여부
- 상태: preserved, possible-loss, blocked

이 block은 canonical Item이 아니며 우측 직접 수정 대상도 아니다.

### 5.3 Safe table block

다음 조건을 모두 만족할 때만 Sheet를 활성화한다.

1. format과 delimiter가 하나로 결정된다.
2. logical row와 cell boundary를 끝까지 재현한다.
3. quoted comma/tab, escaped quote/pipe, multiline cell과 빈 셀을 보존한다.
4. URL query, 가격·통화·duration을 행동으로 해석하지 않는다.
5. source row/cell에 exact locator가 있다.
6. source·parsed·preserved row/cell count가 설명 가능하다.

### 5.4 Loss manifest

손실 위험 진단은 최소한 다음을 소유한다.

- document/source revision과 table block identity
- exact source range
- detected format·delimiter·encoding
- source/parsed row count와 cell count
- table별 stable identity, exact source range와 authoritative row/cell count
- 보존한 shape와 지원하지 않는 shape
- 영향을 받는 결과
- `none | possible | confirmed` risk
- raw TXT·원문 다운로드·원문 수정 fallback

table-local loss는 Sheet/XLSX만 차단한다. 전체 locator를 신뢰할 수 없는 경우에만
Calendar·Todo·Sheet를 모두 차단하고 TXT/raw를 유지한다.

## 6. 초기 structured-processing budget

| 축             |     한도 | 초과 시 동작                    |
| -------------- | -------: | ------------------------------- |
| UTF-8 bytes    |  `1 MiB` | structured parse 중단, TXT-only |
| physical lines | `20,000` | structured parse 중단, TXT-only |
| logical cells  | `50,000` | 표 구조화 중단, TXT-only        |

budget은 보존 한도가 아니라 구조 처리 한도다. 초과 입력도 textarea, 명시 저장,
원문 복사와 TXT 다운로드에서 byte-exact로 유지한다. 사용자 문구에는 내부 변수명
대신 “원문은 그대로 두고 구조 결과를 만들지 않았습니다”와 영향받는 결과를
표시한다.

## 7. 결과·UX 계약

### 7.1 source pane

- P0의 2-pane / 900 미만 staged 구성을 유지한다.
- 문서가 길거나 여러 block·issue가 있을 때만 compact `문서 찾기`를 보인다.
- navigator는 desktop overlay drawer, 899 이하 bottom sheet다. 상시 세 번째
  pane을 만들지 않는다.
- entry는 내부 type 이름 대신 `코드 · 원문 24~31행`처럼 말한다.
- 이동의 primary는 `원문 위치에서 보기` 하나다.
- 결과에서 이동한 경우에만 `보던 결과로 돌아가기`를 제공한다.

### 7.2 result pane

- 고정 순서 `캘린더 / 할 일 / 표 / TXT`를 유지한다.
- blocked slot도 위치를 유지하고 색상 외 문구와 상태를 제공한다.
- 안전한 표에는 성공 banner를 추가하지 않는다.
- 표 일부 보존 시 한 개의 compact 요약과 세부 disclosure만 제공한다.
- 구조 결과가 막힌 경우 TXT에서만 `원문 그대로 복사`와 `원문 TXT 받기`를
  제공한다.
- 표는 실제 HTML table, header association과 전용 horizontal region을 쓴다.
- cell editing, formula bar, spreadsheet ribbon을 만들지 않는다.

### 7.3 접근성·복구

- exact source range로 이동하고 result artifact, row, scroll anchor와 focus
  origin을 보존한다.
- drawer/sheet는 focus trap, Escape, trigger focus return을 지원한다.
- stale locator는 가장 가까운 보존 block으로 이동하고 한 번만 알린다.
- 상태·오류를 색상만으로 전달하지 않는다.
- table header, logical row/column position과 overflow region 이름을 제공한다.
- 44px touch target, 200% reflow, reduced motion을 회귀 보호한다.

## 8. 권리 안전 fixture

실제 외부 원문의 전체 내용을 복제하지 않는다.

| fixture                       | 검증 목적                                        | 권리 경계                  |
| ----------------------------- | ------------------------------------------------ | -------------------------- |
| synthetic long mixed document | blank, quote, fence, HTML/comment, action 분리   | 새로 만든 짧은 합성 원문   |
| synthetic CSV/TSV             | quoted comma·quote·multiline·empty cell·URL·통화 | 새로 만든 가격 비교 데이터 |
| synthetic Markdown table      | escaped pipe·empty cell·URL query                | 새로 만든 표 데이터        |
| synthetic recipe facts        | 재료·수량 사실행 Todo `0`                        | 실제 레시피 문장 복제 없음 |
| malformed/oversized inputs    | loss/budget fail-close와 raw fallback            | 자동 생성한 합성 데이터    |

서울시 결혼 계약 표, 공식 가격 통계와 레시피 사례는 source-shape 근거로만
추적한다. raw PDF나 외부 문장을 fixture에 그대로 check-in하지 않는다.

## 9. 구현 순서

1. P0 current behavior와 false-positive를 characterization test로 고정한다.
2. pure budget, block segmentation, table parser와 loss manifest를 구현한다.
3. parser·projection·export를 결과별 fail-close 계약에 연결한다.
4. document navigator와 source locator/focus return을 연결한다.
5. TXT raw copy/download와 Sheet loss 안내를 연결한다.
6. failure, write-zero, recovery와 re-entry test를 추가한다.
7. 불필요한 card·badge·helper·control을 subtraction한다.
8. targeted → shared Text Authoring → full unit → build → browser/a11y 순으로
   fresh QA한다.
9. scoped diff와 금지 경로 침입 `0`을 확인한 뒤 target local commit 하나로
   기준선을 고정한다.

## 10. acceptance

| ID        | 유형       | 완료 조건                                                             |
| --------- | ---------- | --------------------------------------------------------------------- |
| `P1C-H01` | happy      | mixed raw block no-op round-trip에서 source byte 손실 `0`             |
| `P1C-H02` | happy      | quoted/multiline/empty/escaped table의 row·cell shape와 locator 보존  |
| `P1C-F01` | failure    | 손실 가능 table은 해당 Sheet/XLSX만 차단하고 raw/TXT·source 이동 제공 |
| `P1C-F02` | failure    | budget 초과 시 truncate/delete `0`, 처리 범위와 막힌 결과 표시        |
| `P1C-F03` | failure    | action marker 없는 사실·가격·재료·metadata의 Todo·Calendar `0`        |
| `P1C-P01` | permission | preview·navigator·read-only 경로의 source/revision write `0`          |
| `P1C-R01` | re-entry   | 이동·복귀·breakpoint·저장 재진입에서 raw bytes, 선택, focus 보존      |

추가 필수 회귀:

- Calendar·Todo·Sheet·TXT의 기존 bounded recurrence parity. mixed exact raw와
  반복 Item이 함께 있으면 raw prefix는 한 번만 두고 `[반복 회차]`에
  occurrence를 나열한다.
- unsafe Inspector write `0`과 source 수정 undo
- recovery와 explicit save 분리
- fixed result order와 900 breakpoint
- source/private/unsaved byte loss `0`

## 11. fresh QA 순서

현재 `package.json`의 실제 script를 사용한다.

```text
npx.cmd tsx --test lib/flow/text-authoring/long-document-table.test.ts
npm.cmd run test:text-authoring
npm.cmd test
npm.cmd run build
npx.cmd playwright test tests/e2e/text-authoring-p1-long-document-table.spec.ts
npx.cmd playwright test tests/e2e/text-authoring-service-p0.spec.ts tests/e2e/text-authoring-service-p0-product-evidence.spec.ts tests/e2e/text-authoring-unsaved-guard.spec.ts tests/e2e/text-authoring-service.spec.ts tests/e2e/text-authoring.spec.ts
npm.cmd run docs:check
git diff --check -- <승인 파일 목록>
```

browser matrix는 `320 / 360 / 390 / 899 / 900 / 1024 / 1280 / 1440`이며,
keyboard-only, 44px, 200%, reduced motion, focus trap/return, table semantics,
horizontal overflow와 마지막 CTA 도달을 fresh로 확인한다. 과거 P0 PASS 수치를
이번 결과로 복사하지 않는다.

## 12. 중단·rollback

다음 중 하나면 위험한 structured parse와 Sheet를 끄고 TXT-only + source locator로
돌아간다.

- source bytes, line ending, blank/comment/code/HTML 손실 1건
- quoted/multiline/empty cell shape 손실 1건
- action marker 없는 사실행의 신규 Todo·Calendar 1건
- permission bypass 또는 preview-only source write 1건
- source/private/unsaved bytes를 잃는 recovery·rollback 1건
- loss manifest 없이 위험한 Sheet/XLSX 활성화 1건
- P1-C 밖 schema·provider·publication track이 필요한 경우
- 승인 경로 밖 dirty overlap 또는 baseline drift

feature gate가 꺼지면 위험한 structured table 처리를 제거하되 raw WorkingSource,
TXT, loss 정보와 locator를 보존한다.

## 13. 명시적 제외

- P1-A 검색·필터·목록 확대
- P1-B immutable revision·full history·trash retention
- P1-D advanced recurrence와 timezone migration
- P1-E 외부 원문 후보·source update
- P1-F export history
- P1-G linked Flow runtime/spec 확장
- 모든 P2 review·publication·AI·provider·experience 기능
- URL fetch/auth/crawl, 외부 Calendar/Todo/Excel write
- commit 이후 push·PR·merge·deploy·P35

## 14. 완료 보고 상태 분리

결과 문서는 다음을 각각 기록한다.

- local edits
- local commit
- push
- PR
- merge
- deploy
- P35/external side effect
- observed-user sessions

`LOCAL_INTERNAL_QA_PASS`는 local automated/browser QA만 뜻하며 실제 사용성 검증이나
release 완료를 뜻하지 않는다.
