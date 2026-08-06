# FlowMe 텍스트 저작 v2 Round 2 완료 보고

## 0. 결론

사용자 피드백 10개를 기준으로 문법·원문 소유권·날짜 정렬·결과 형태·상세 미리보기·모바일 스크롤을 보정했다. Claude Design v2에서는 3영역 작업대, 모바일 단계, 고정 결과 rail, 도움말 disclosure만 구조 참고로 사용했고 FlowMe 색감과 실제 parser·ID·projection 계약은 유지했다.

로컬 구현과 내부 QA는 완료했다. P35와는 직접 합치지 않고 `분리 유지 + versioned adapter contract`로 판정했으며 현재 runtime 연결은 `HOLD_NOT_READY`다. commit, push, PR, merge, Preview, Production, 관찰 사용자 검증은 수행하지 않았다.

| 항목 | 결과 |
|---|---|
| 기준일 | 2026-08-04 |
| checkout | `D:\flowme2605\flow-text-authoring-ta` |
| branch | `codex/text-authoring-ta-implementation-20260729` |
| 시작·종료 HEAD | `c09f859b30b854f6f897b8ec1eb781fd774fbeca` — uncommitted local worktree |
| Round 2 상태 | `LOCAL_IMPLEMENTATION_AND_INTERNAL_QA_PASS` |
| 보안 | High `0`, Critical `0`, Total `0` |
| P35 연결 | `SEPARATE_WITH_ADAPTER_CONTRACT / HOLD_NOT_READY` |
| publish | 모두 미수행 |
| observed-user validation | `0명`, 범위 밖 |

## 1. 바로 확인할 산출물

- [standalone HTML](../2026-08-04-flowme-text-authoring-grammar-ux-improvement-results/flowme-text-authoring-v2-test.html): 브라우저에서 입력·실시간 반영·예시 전환·결과 선택·정렬·복사 흐름을 직접 확인한다.
- [다음 업무 계획과 실행 순서](../../specs/2026-08-04-flowme-text-authoring-v2-round2-correction/00-next-work-plan-ko.md)
- [권위·소유권·갭 장부](../../specs/2026-08-04-flowme-text-authoring-v2-round2-correction/source-authority-and-gap-ledger.md)
- [보안 게이트](../../specs/2026-08-04-flowme-text-authoring-v2-round2-correction/security-gate.md)
- [P35 연결 게이트](../../specs/2026-08-04-flowme-text-authoring-v2-round2-correction/p35-integration-gate.md)
- [V01~V20 행동 matrix](./round2-visual-behavior-matrix.json)
- [Claude 구조 비교 계약](./claude-structure-reference.json)

대표 화면:

- [실제 데스크톱 화면](../2026-08-04-flowme-text-authoring-grammar-ux-improvement-results/ui-u06-live-reflection-1440x900.png)
- [실제 모바일 결과 끝 도달](./round2-visual-evidence/V03-route-simple-390x844.png)
- [Claude 데스크톱 구조 참고](./round2-visual-evidence/claude-structure-1440x900.png)
- [ImageGen 데스크톱 개념 기준](./concept-desktop-1440x900.png)
- [ImageGen 모바일 개념 기준](./concept-mobile-390x844.png)

ImageGen 이미지는 구현 전 위계 기준이고 제품 화면이 아니다. 최종 판정은 실제 React route와 self-contained HTML을 Chrome으로 실행한 결과를 사용한다.

## 2. 사용자 피드백 10개 반영 결과

| # | 사용자 문제 | 적용 결과 |
|---:|---|---|
| 1 | `-`가 없는 줄까지 항목처럼 보임 | canonical Item은 root `- [ ]`, 속성은 `  - 설명:`이다. 표식 없는 prose는 일반 text/source issue로 남긴다. plain/numbered bullet은 과거 입력을 읽기 위한 호환 문법일 뿐 writer가 새 문법으로 출력하지 않는다. |
| 2 | 캘린더 순서와 입력 순서가 다름 | Calendar/ICS는 resolved date 오름차순으로 보이되 원문을 자동 수정하지 않는다. `입력도 이 순서로 맞추기`가 적용 전 범위·순서를 보여 주고, 같은 Step의 완전한 Item block만 원자적으로 옮기며 한 번에 되돌릴 수 있다. |
| 3 | Sheet 정체성이 모호함 | `표/엑셀`은 원문 표가 있거나 여러 항목이 의미 있는 공통 필드 두 개 이상을 공유할 때만 활성화한다. 미리보기의 실제 열·셀·URL과 CSV/TSV/XLSX export가 같은 데이터를 사용한다. |
| 4 | 상대 날짜 기준일이 갑자기 생김 | D-Day 계산은 원문 `- 기준일: YYYY-MM-DD`만 권위로 사용한다. UI에서 날짜를 고르면 왼쪽 원문에도 그 줄을 쓰고, 기준일이 없으면 날짜를 추정하지 않는다. |
| 5 | 결과 형태 버튼이 이동함 | `캘린더 / 체크·할 일 / 표·엑셀 / 텍스트` 네 슬롯을 항상 같은 순서와 위치에 둔다. 입력 조건에 따라 활성·비활성만 바뀌고 비활성 이유를 도움말에서 확인한다. |
| 6 | `정리 메모`의 역할이 불명확함 | `텍스트` 결과의 기본 행동을 byte-equivalent `원문 그대로 복사`로 둔다. 항목별 TXT와 문법 포함 Markdown은 `다른 텍스트 형식` disclosure 안의 변환 결과로 분리한다. 최초 원문 snapshot도 현재 초안과 다를 때 복원할 수 있다. |
| 7 | 링크·상세가 미리보기에 보이지 않음 | 설명, 완료 기준, 날짜 원문/계산값, 시간, 시간대, 소요 시간, 장소, 반복, 조건, 주의와 링크를 행별로 보여 준다. `자료`와 `출처`는 서로 다른 그룹·라벨로 preview/export에 보존한다. |
| 8 | 탭·표·CSV·Markdown 기술어가 앞에 나옴 | 기본 화면은 결과 의미와 실제 preview를 먼저 보여 준다. CSV·Excel·Markdown 같은 파일 형식은 도움말·추가 형식·내보내기 단계로 내렸다. |
| 9 | 사용자가 1·2·3 번호를 직접 써야 하는지 모호함 | canonical writer는 번호를 요구하지 않고 root checkbox Item의 source order로 순서를 계산한다. numbered list는 호환 입력이며 저장·내보내기 때 `- [ ]`로 정규화한다. |
| 10 | 입력 우측 `나눈 항목`이 이해되지 않음 | 해당 요약을 제거했다. `항목 구조`는 기본 read-only이며, 선택한 Item의 `구조 수정` 안에서만 이동·합치기·나누기를 preview·확인·undo와 함께 제공한다. |

## 3. 문법·데이터 계약

canonical writer는 다음 한 형태를 쓴다.

```markdown
# Flow 제목
- 기준일: 2026-08-10

## 단계
- [ ] 첫 번째 항목입니다.
  - 설명: 설명입니다.
  - 날짜: 2026-08-03
  - 자료: [안내](https://example.com)
```

핵심 소유권은 다음과 같다.

1. 최초 붙여넣기 원문은 `rawSourceSnapshot`이 소유한다.
2. 현재 편집 중인 원문은 `authoringDraft.rawText`가 소유한다.
3. parser는 immutable `SourceRow`와 stable Item/Step/Flow ID를 만든다.
4. `sourceChecked`는 원문에 체크가 있었다는 뜻이며 P35 개인 실행 완료 상태가 아니다.
5. Calendar display order, canonical source order, personal execution order를 한 상태로 합치지 않는다.
6. merge/split은 충돌·경계가 확정되지 않으면 mutation 없이 실패한다.

## 4. Claude Design 비교와 적용 범위

Claude ZIP `FlowMe 텍스트 저작 v2_260804_1617.zip`은 구조 참고로만 비교했다. 동일 4개 viewport에서 3영역 비율, 모바일 단계, 결과 rail, 도움말·dialog 경계를 캡처했다.

| 비교 요소 | 판정 | 제품 적용 |
|---|---|---|
| desktop 입력/구조/결과 3영역 | 수정 채택 | FlowMe header·spacing·색상에 맞춰 입력은 충분히 넓게, 구조는 요약, 결과는 preview 중심으로 구성 |
| mobile 입력→구조→결과 단계 | 채택 | 한 단계씩 표시하고 각 pane의 독립 스크롤과 하단 도달 보장 |
| 고정 결과 rail | 채택 | 네 의미 슬롯은 고정하고 eligibility만 변경 |
| 작은 `?` 도움말과 고급 disclosure | 채택 | 긴 설명·기술 세부를 기본 화면에서 감산 |
| Claude parser·index ID·semantic 결과 | 제외 | Codex v2 contract와 stable identity가 제품 정본 |
| Claude 색·폰트·외부 DS bundle | 제외 | 기존 FlowMe token·component 체계 유지 |

`claude-structure-reference.json`은 `semanticParityClaimed=false`를 명시한다. Claude prototype의 외부 font/React 요청과 최초 404 console 메시지도 구조 참고 캡처에 그대로 기록했으며, 제품 runtime 오류 수치에 섞지 않았다.

## 5. Gate 결과

| Gate | 상태 | 완료 근거 |
|---|---|---|
| `TA-R2-G0` | `PASS` | V01~V20 `20 / 20`; route/standalone semantic·responsive·fixed-slot geometry parity |
| `TA-R2-G1` | `PASS` | v2 contract, read compatibility, H1 우선순위, raw source snapshot 분리 |
| `TA-R2-01` | `PASS` | source checkbox, merge conflict, split boundary, Sheet/export parity |
| `TA-R2-02` | `PASS` | source-preserving date order transaction과 undo |
| `TA-R2-03` | `PASS` | fixed rail, Sheet identity, Text boundary, detail/link preview |
| `TA-R2-04` | `PASS` | Claude 구조 선별 적용, 기본 화면 UX 감산 |
| `TA-R2-05` | `PASS` | responsive reachability, keyboard/browser, route/standalone 동등성 |
| `TA-R2-06` | `PASS` | unit, E2E, build, standalone, matrix, docs, diff gate green |
| `TA-R2-SEC-01` | `PASS` | `brace-expansion 5.0.8 → 5.0.9`, audit 0, 전체 회귀·build green |
| `TA-R2-INT-GATE` | `DECIDED` | `SEPARATE_WITH_ADAPTER_CONTRACT`; runtime integration `HOLD_NOT_READY` |

## 6. 최종 내부 QA

| 검증 | 결과 |
|---|---:|
| `npm.cmd run test:text-authoring` | `161 / 161 PASS` |
| `npm.cmd test` | pretest `100 / 100` + unit `594 / 594` = `694 / 694 PASS` |
| `npx.cmd playwright test tests/e2e/text-authoring.spec.ts --workers=1` | `31 / 31 PASS` |
| `npm.cmd run build` | `PASS`, static pages `18 / 18` |
| `npm.cmd run simulate:text-authoring-grammar` | grammar `27 / 27`, UI `12 / 12` |
| `npm.cmd run build:text-authoring-v2-results` | API `27 / 27` + browser `8 / 8` = `35 / 35 PASS` |
| `npm.cmd run capture:text-authoring-grammar-ui` | U01~U08 `8 / 8`, screenshots 10 |
| `npm.cmd run capture:text-authoring-round2` | V01~V20 `20 / 20`, 제품 screenshots 40 |
| Claude 구조 reference | screenshots 4, semantic parity 주장 안 함 |
| 제품 browser runtime | console `0`, page error `0`, failed/HTTP request `0`, external request `0`, replacement character `0` |
| `npm.cmd run security:audit` | High `0`, Critical `0`, Total `0` |
| `npm.cmd run docs:check` | `PASS` |
| `git diff --check` | `PASS` |
| standalone HTML | `2,105,820` bytes |

실제 제품 캡처는 Chrome `150.0.7871.184`에서 수행했다. 1440×900, 1024×768, 390×844, 390×600을 Round 2 matrix로 비교했고, 기존 U01~U08에서는 360×640, 844×390, 720×450의 고밀도 reflow 경계도 함께 검사했다. 각 pane의 마지막 내용과 저장 행동 도달, 가로 overflow, sticky overlap을 확인했다.

## 7. 실패 이력과 해결

- 초반 focused E2E는 데스크톱에 숨겨진 모바일 버튼, 닫힌 ownership disclosure, 예전 `ics` 표기, 과거 제목 우선순위를 기대해 실패했다. helper를 실제 반응형 행동과 H1 source-of-truth에 맞추고 최종 `31 / 31`을 다시 통과했다.
- runner가 관리한 dev server가 worker 사이에서 종료된 적이 있어 최종 E2E는 작업 소유 포트의 안정된 production server와 worker 1개로 재실행했다.
- 인앱 브라우저 webview가 제어 세션에 연결되지 않아, 동일 로컬 route/standalone을 실제 Chrome·Playwright로 실행하고 JSON·PNG 증거를 남겼다.
- repository-wide `tsc --noEmit`에는 Text Authoring 밖의 기존 test diagnostics가 남아 있다. 이번 production build와 Text Authoring 소유 테스트는 green이며 이 baseline을 새 오류 0으로 오표기하지 않는다.

## 8. P35 연결 판정

Text Authoring과 P35는 현재 별도 checkout·별도 소유권으로 유지한다.

```text
Text Authoring
raw source → SourceRow → Item → Step → Flow
        │
        │ pure, versioned adapter / source mutation 0
        ▼
FlowBundle + projection options + machine-readable loss manifest
        │
        ▼
P35
effective source/personal/execution layers → projection manifest → artifact/receipt
```

연결을 열려면 별도 승인 뒤 adapter contract v2, source revision, repeat/time/timezone/duration, Step identity, resource/source 구분, structured property loss 정책을 고정하고 6개 golden fixture를 양쪽 contract로 통과시켜야 한다. 특히 `sourceChecked`를 P35 실행 완료로 매핑하거나 날짜 없는 Item에 VEVENT를 만드는 연결은 hard fail이다.

P35 checkout은 읽기 전용으로 조사했으며 변경 파일은 0개다.

## 9. 변경 소유권과 게시 상태

이번 worktree는 시작부터 관련 Text Authoring 변경이 추적·미추적 상태로 존재했다. 이를 reset·clean·stage하지 않고 아래 범위 안에서 누적 보정했다.

- `components/flow/text-authoring/*`
- `lib/flow/text-authoring/*`
- `app/flows/new/page.tsx`와 Text Authoring 범위의 `app/globals.css`
- `tests/e2e/text-authoring.spec.ts`
- Text Authoring build/capture scripts와 package scripts
- v2 contract, Round 2 spec/gate, content-audit 증거
- 보안 patch에 한해 `package.json`의 override 1줄과 lock record 3줄

현재 publish ledger:

| 행위 | 상태 |
|---|---|
| commit | 미수행 |
| push | 미수행 |
| PR | 미수행 |
| merge | 미수행 |
| 새 Preview | 미수행 |
| Production | 미수행 — P35 유지 |

## 10. 남은 위험과 다음 선택

Round 2 로컬 기능·QA의 blocking/high는 0이다. 남은 항목은 이 완료 범위 밖이다.

1. P35 adapter v2와 cross-contract fixture는 미구현이다.
2. repeat는 현재 정의 text를 보존하지만 occurrence/ICS RRULE을 만들지 않는다.
3. nested Item은 stable parent model이 없어 unsupported source issue로 남긴다.
4. 관찰 사용자 검증은 사용자 요청에 따라 수행하지 않았고 `0명`이다.
5. 변경은 아직 commit·게시되지 않았으며 P35 production에 포함되지 않는다.

다음 단계는 자동 merge가 아니다. 사용자가 원할 때 `게시 준비`, `adapter v2 통합 설계`, 또는 `현재 standalone 추가 수정` 중 하나를 별도 범위로 연다.
