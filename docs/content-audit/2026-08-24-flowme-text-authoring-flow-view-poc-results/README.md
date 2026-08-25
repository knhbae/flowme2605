# FlowMe Text Authoring 인라인 Flow 편집 격리 PoC 결과

> 2026-08-25 후속 작업에서 전체 예시 31개와 계층 표현을 추가하고 같은 단일 HTML을 다시 생성했다. 최신 hash·fresh QA는 [예시 복구·계층 표현 결과](../2026-08-25-flowme-text-authoring-live-editor-examples-hierarchy-results/README.md)를 기준으로 한다. 아래 내용은 최초 인라인 편집 PoC 라운드의 기록이다.

- **목표 ID:** `TA-TEXT-AUTHORING-HYBRID-LIVE-EDITOR-POC-20260825-03`
- **상태:** `LOCAL_INTERNAL_QA_PASS / FULL_REPO_SOURCE_FRESHNESS_GATE_OPEN`
- **checkout:** `D:\flowme2605\flow-text-authoring-flow-view-poc-20260824`
- **branch:** `agent/text-authoring-flow-view-poc-20260824`
- **baseline:** `152b356fbaaec046bc32e5d2021b727706fe28fe`
- **publish boundary:** `LOCAL_ONLY`
- **external side effect:** `0`
- **observed-user session:** `0`

## 결론

요청을 별도 읽기 화면으로 잘못 해석했던 `텍스트 편집 / 미리보기` 구현은 폐기했다. 바로잡은 PoC는 왼쪽 **한 편집기 자체**가 Obsidian식 Live Preview처럼 동작한다. `Flow 편집`에서 커서가 닿은 source block은 `#`, `- [ ]`, 들여쓰기 같은 raw 문법을 같은 자리에서 보여 주고, 커서가 벗어난 유효 block은 제목·실행 문장·속성·하위 확인으로 즉시 표현된다. 입력·붙여넣기·Enter·Backspace·한글 조합은 같은 raw source를 수정하며 기존 오른쪽 Calendar·Todo·Sheet·TXT도 그대로 갱신된다. 별도 preview pane, 읽기 전용 article, 카드, 변환·적용 버튼은 없다.

기획·UX·transaction·acceptance 정본은 [인라인 Flow 편집 계약](../../specs/2026-08-24-flowme-text-authoring-flow-view-poc/00-goal-ux-and-acceptance-ko.md)이다.

## 로컬 검토 시작점

외부 서버나 앱 route 없이 아래 단일 HTML을 브라우저에서 직접 열 수 있다.

- `D:\flowme2605\flow-text-authoring-flow-view-poc-20260824\docs\content-audit\2026-08-24-flowme-text-authoring-flow-view-poc-results\flowme-text-authoring-flow-view-poc.html`
- 현재 파일 크기: `2,608,713 bytes`
- 현재 SHA-256: `3A873A78BD084C6C5E732A8FF294BDFB0CB53CCF776F7E0AF642A5981F3A901F`
- 현재 생성 확인: `2026-08-25 09:11 KST`
- 필요하면 checkout에서 `npm.cmd run serve:text-authoring-flow-view-poc`를 실행하고 `http://127.0.0.1:4178/`을 연다.

fresh 화면 증거:

- [1024px 인라인 편집 화면](./flow-live-editor-1024.png)
- [390px 인라인 편집 화면](./flow-live-editor-390.png)

## current → target → 결과

| 구분 | 잘못된 current | 승인 target | 구현 결과 |
| --- | --- | --- | --- |
| 왼쪽 구조 | raw textarea와 별도 read-only preview | 같은 위치의 `순수 텍스트 / Flow 편집` | 단일 CodeMirror 편집 surface |
| Flow 표현 | 전체 문서를 읽기 화면으로 전환 | active raw + inactive rendered block | 한 문서 흐름 안에서 동시 표현 |
| 편집 | preview에서 수정 불가 | 렌더된 문장을 누르면 같은 자리에서 문법 노출 | click→caret→즉시 편집 |
| source | textarea와 preview의 두 표현 상태 | `rawText` 하나만 권위 | 무손실 raw↔editor adapter |
| 갱신 | 별도 보기에서 결과 확인 | 입력 즉시 왼쪽 표현, 기존 live parse 뒤 오른쪽 결과 | convert/apply `0` |
| 일반·위험 text | 구조 결과 또는 fallback card | 자연스러운 editable raw text | Todo·사실 발명 `0` |
| 저장 | preview 상태와 경계 불명확 | mode·selection·scroll만 UI sidecar | canonical·revision·receipt 자동 mutation `0` |
| 제품 연결 | PoC gate | standalone에만 활성화 | main product route gate-off 유지 |

## 구현한 객체·상태·transaction

- `AuthoringFlowViewModel`: source 순서와 exact range를 가진 heading, action, property, text, blank 모델
- `FlowEditorSourceAdapter`: LF/CRLF/CR/혼합 EOL을 보존하는 raw↔LF editor offset·replacement·selection adapter
- `FlowLiveEditor`: active/selected block만 raw syntax를 열고 inactive valid block에 semantic decoration을 놓는 단일 CodeMirror editor
- exact clipboard: copy·cut은 normalized editor text가 아니라 raw slice를 사용하고 paste는 한 raw replacement로 적용
- editor-local history: raw snapshot 단위 undo/redo이며 Inspector undo나 durable revision과 섞지 않음
- composition state: IME 조합 중 decoration을 재생성하지 않고 mapping만 한 뒤 composition 종료 후 갱신
- UI sidecar: mode, raw selection direction, text/Flow scroll, active block, raw fingerprint만 `sessionStorage`에 저장
- lazy gate: PoC gate가 꺼진 제품 route에서는 새 editor component·UI·session sidecar를 생성하지 않음

`rawText`가 유일한 source authority다. mode 전환·caret 이동·scroll은 source, parser, canonical, projection, explicit save receipt를 생성하지 않는다. 오른쪽 결과는 기존 parser·projection과 기존 180ms live parse 경계를 그대로 사용한다.

## 편집·안전·권리 경계

- heading은 제목 타이포그래피로만 보이고 source heading을 새 객체로 저장하지 않는다.
- root checkbox만 기존 parser가 canonical Item으로 해석하며 한 단계 하위 checkbox는 기존 ChecklistEntry 계층을 유지한다.
- bullet·ordered·plain sentence·URL-only를 checkbox나 Todo로 바꾸지 않는다.
- invalid·ambiguous·unsupported·stale block은 추측하지 않고 raw로 계속 편집할 수 있다.
- code·HTML·comment·table은 실행하거나 DOM으로 주입하지 않고 안전한 plain/monospace source로 둔다.
- link와 checkbox glyph는 왼쪽에서 navigation·완료 side effect를 내지 않고 source caret만 연다.
- fixture는 synthetic 한국어 일정·메모·URL·invalid date·장문·혼합 EOL뿐이며 외부 원문 전체, 개인 주소·연락처·금액을 복제하지 않았다.
- parser·canonical·projection·durable storage schema, ResultPane IA, P1/P2 객체는 수정하지 않았다.

## Fresh QA

모든 숫자는 이 checkout에서 2026-08-25 KST에 새로 실행한 결과다.

| 범위 | 명령 | fresh 결과 |
| --- | --- | --- |
| source adapter·view·UI targeted | `npx.cmd tsx --test ...flow-live-editor-adapter... ...flow-view-model... ...flow-view-ui-state... ...InputPane.flow-view...` | `37/37 PASS`, exit `0` |
| shared Text Authoring | `npm.cmd run test:text-authoring` | `358/358 PASS`, exit `0` |
| default production build | `npm.cmd run build` | compile·typecheck·19-page generation PASS, exit `0` |
| standalone build | `npm.cmd run build:text-authoring-flow-view-poc` | 단일 HTML 생성 PASS, exit `0` |
| direct local file open | Chrome에서 `file:///D:/.../flowme-text-authoring-flow-view-poc.html` 직접 로드 | workspace·단일 editor·오른쪽 result·두 mode 확인 PASS, exit `0` |
| 인라인 편집 browser | `npx.cmd playwright test --config playwright.flow-view.config.ts` | `11/11 PASS`, exit `0` |
| 기존 P0·P1-C·base + 실제 gate-off browser | 6개 기존 production-build spec + `text-authoring-flow-view-gate-off.spec.ts` | `67/67 PASS`, exit `0` |
| P1-E gate-on browser | `NEXT_PUBLIC_FLOWME_TEXT_AUTHORING_P1_SOURCE_CANDIDATE=1` build + source-update spec | `9/9 PASS`, exit `0` |
| docs | `npm.cmd run docs:check` | 16 required files·4,639 local links PASS, exit `0` |
| dependency audit | `npm.cmd run security:audit` | vulnerability `0`, exit `0` |
| repo lint script | `npm.cmd run lint` | ESLint 설정이 없어 `next lint`가 대화형 설정에서 중단, code 판정에는 production build의 typecheck 사용 |
| scoped diff | tracked `git diff --check` + task-owned untracked text의 `--no-index --check` | whitespace error `0`, exit `0` 판정 |

standalone 전용 browser acceptance 11개와 실제 product gate-off 1개는 다음을 검증한다.

1. 별도 preview 없이 active raw와 inactive Flow 표현이 한 편집기 안에 함께 있다.
2. mode·selection·scroll만 바꿀 때 raw·오른쪽 결과 DOM·durable localStorage가 exact 불변이고 session sidecar만 바뀐다.
3. rendered block click→raw reveal→typing→Enter→Backspace가 source와 오른쪽 결과를 갱신한다.
4. select-all exact copy·cut·text paste·undo·redo가 raw authority를 보존하고, 파일 전용 paste는 선택 source write `0`이다.
5. 일반 Enter는 literal newline이고 Ctrl+Enter는 기존 workspace action만 실행한다.
6. plain·URL-only·invalid source에서 새로운 Todo·사실을 만들지 않는다.
7. reload recovery가 Flow mode, unsaved source, selection direction, scroll을 복원한다.
8. explicit save→reload→draft reopen이 exact source와 Flow mode를 복원한다.
9. 같은 raw source인 서로 다른 draft가 editor undo/redo history를 공유하지 않는다.
10. keyboard mode 전환, touch reveal, 44px target, 320·390·899·900·1024·1280·1440px, 실제 200% font, reduced motion에서 가로·세로 source 손실이 없다.
11. 실제 Chromium IME composition이 동일 editor DOM에서 끝나고 한 번의 undo로 조합 전 source를 복원한다.
12. 실제 `/flows/new` gate-off route는 기존 textarea·label·결과를 유지하고 Flow UI·CodeMirror DOM·session sidecar를 만들지 않는다.

### 전체 저장소 기준 gate

`npm.cmd test`는 pretest `175/175`를 통과한 뒤 main stage에서 `623/624 PASS`, exit `1`이었다. 유일한 실패는 `lib/flow/seed-flows.test.ts`의 `normal user routes fail the standard suite when source review is due`이며, 현재 날짜가 기존 seed source 재검토 기한 초과 `44`건을 감지한 것이다(`44 !== 0`). 이번 task-owned source나 인라인 편집 test의 실패가 아니며 이 PoC는 해당 source와 test를 수정하지 않았다. 날짜성 content baseline을 고치기 위해 범위를 넓히지 않았다.

### P1-E gate 진단

처음 기존 75개 browser spec을 default gate-off build에서 함께 실행했을 때 P1-E의 gate-on 시나리오 8개는 후보 UI가 의도대로 존재하지 않아 실패하고, P1-E gate-off 1개와 나머지 66개는 통과했다. 이는 feature 오류가 아니라 잘못된 QA build 조건이었다. 승인된 `NEXT_PUBLIC_FLOWME_TEXT_AUTHORING_P1_SOURCE_CANDIDATE=1` production build로 다시 실행한 P1-E 전체 `9/9`는 통과했다. 과거 실패를 숨기지 않되 최종 판정은 올바른 독립 gate 조건의 fresh 결과로 한다.

## Failure·recovery·rollback

- source range·fingerprint·parse identity가 오래되면 의미 구조를 추측하지 않고 raw editing으로 fail open한다.
- untouched raw slice와 줄바꿈은 adapter가 보존하며 copy·cut·paste·undo에서도 source 정본을 사용한다.
- composition 중 semantic DOM을 교체하지 않아 한글 조합과 selection을 잃지 않는다.
- reload recovery와 explicit save→reopen은 기존 P0 저장 경계를 사용하고 mode·selection·scroll은 별도 sidecar만 쓴다.
- sidecar 저장 실패나 fingerprint mismatch는 source를 삭제하지 않고 `순수 텍스트`로 돌아간다.
- PoC gate off는 `Flow 편집` control·editor instance·sidecar 동작을 제거하고 기존 P0 textarea·label·오른쪽 결과를 보존한다.
- source/private/unsaved bytes loss, permission bypass, public/external side effect, duplicate save receipt는 fresh targeted·shared·browser QA에서 `0`건이다.

## UX subtraction

- 읽기 전용 `FlowViewPane`, preview article/tab/pane과 예전 component test를 삭제했다.
- 줄별 card, Flow·Step·Item 분류 badge, raw label, 검사 dashboard를 만들지 않았다.
- 별도 parse·convert·apply 버튼, 두 번째 source, spreadsheet/WYSIWYG editor를 만들지 않았다.
- 왼쪽 checkbox·link는 interactive control이 아니며 편집 caret만 연다.
- editor 전체를 live region으로 만들지 않고 기존 결과 갱신 상태만 제한적으로 알린다.
- 새 top-level navigation, product route rollout, provider, publication, AI runtime을 추가하지 않았다.
- Figma 파일은 만들지 않았다. 핵심 deliverable이 source range·selection·IME와 결합된 실제 interaction이어서 기존 디자인 언어 안에서 code-first로 설계하고 real-browser로 검증했다.

## 상태 분리

| 상태 | 결과 |
| --- | --- |
| local edits | isolated checkout에 완료 |
| commit | `0` |
| push | `0` |
| PR | `0` |
| merge | `0` |
| deploy | `0` |
| P35 / external side effect | `0` |
| observed-user session | `0` |

자동 테스트·build·브라우저 QA는 local internal QA이며 실제 사용자 검증이나 release 완료가 아니다.
