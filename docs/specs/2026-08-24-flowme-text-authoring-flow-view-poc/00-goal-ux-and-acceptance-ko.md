# FlowMe Text Authoring 인라인 Flow 편집 PoC 계약

- 목표 ID: `TA-TEXT-AUTHORING-HYBRID-LIVE-EDITOR-POC-20260825-03`
- checkout: `D:\flowme2605\flow-text-authoring-flow-view-poc-20260824`
- branch: `agent/text-authoring-flow-view-poc-20260824`
- baseline: `152b356fbaaec046bc32e5d2021b727706fe28fe`
- publish boundary: `LOCAL_ONLY`
- external side effect: `0`
- observed-user session: `0`

## 1. 바로잡은 목표

이 기능은 편집기 옆이나 별도 tab에 결과를 보여 주는 미리보기가 아니다. 하나의 텍스트 편집 공간 자체가 Obsidian식 Live Preview로 동작해야 한다.

- `순수 텍스트`: 전체 raw source와 문법 표식을 그대로 편집한다.
- `Flow 편집`: 커서나 선택이 닿은 source block은 같은 자리에서 raw 문법을 보여 주고 직접 편집한다. 선택이 벗어난 유효 block만 제목·소제목·할 일·하위 확인·속성·인용·링크처럼 문서형으로 보인다.
- 입력은 언제나 같은 `rawText`를 수정한다. 별도 preview source, convert, apply, WYSIWYG document를 만들지 않는다.
- 입력한 원문은 즉시 같은 편집기에 반영한다. 의미 표현과 오른쪽 Calendar·Todo·Sheet·TXT는 기존 180ms live parse가 현재 source를 확정한 뒤 함께 갱신하며, 그 사이에는 오래된 의미 표현을 보여 주지 않고 raw로 fail open한다.
- 일반 문장·URL-only·invalid·ambiguous·unsupported source는 자연스러운 editable raw text로 남긴다. 새로운 Todo나 사실을 추측하지 않는다.

기존 `텍스트 편집 / 미리보기` 분리 구현과 읽기 전용 `FlowViewPane`은 이 목표와 맞지 않으므로 폐기한다.

## 2. current → target → 제외

| 구분 | 잘못된 current | 이번 target | 제외 |
| --- | --- | --- | --- |
| 왼쪽 구조 | raw textarea와 별도 read-only preview panel | 같은 위치의 `순수 텍스트 / Flow 편집` 두 편집 방식 | 오른쪽/하단 preview pane |
| Flow 표현 | 전체 문서를 읽기 화면으로 전환 | active source는 raw, inactive valid source만 인라인 렌더 | Item·Step 카드, 검사 dashboard |
| 편집 | preview에서 수정 불가 | 렌더된 줄을 누르면 같은 자리에서 raw 문법 노출·편집 | convert/apply button |
| selection | preview와 textarea selection 분리 | source offset 하나로 click·방향 선택·copy·cut·paste | display text를 별도 정본으로 저장 |
| history | browser/editor 동작 불명확 | exact raw snapshot 기반 editor-local undo/redo | service revision·save receipt 자동 생성 |
| 결과 | 오른쪽 네 결과 | 기존 객체·순서·eligibility·저장 경계 유지 | projection 재설계 |
| 제품 연결 | standalone gate | standalone에서만 `flowViewPocEnabled=true` | main app navigation·production rollout |

## 3. 사용자 여정

1. 사용자는 일반 문장이나 Flow 문법을 붙여 넣는다.
2. `Flow 편집`을 선택한다.
3. 현재 커서가 있는 줄은 `#`, `##`, `- [ ]`, `- 속성:` 같은 원문 문법이 보인다.
4. 다른 유효 줄은 카드 없이 한 문서 흐름 안에서 heading, action, property 등으로 보인다.
5. 렌더된 줄을 누르면 그 줄의 문법이 같은 자리에서 드러나고 caret이 들어간다.
6. 입력·Enter·Backspace·paste가 raw source 한 transaction으로 적용된다.
7. 다른 줄로 이동하면 방금 수정한 유효 줄이 다시 문서형으로 보인다.
8. 오른쪽 네 결과는 같은 source를 기존 parser가 해석한 결과로 자동 갱신된다.
9. `순수 텍스트`로 돌아가면 같은 raw source와 selection을 확인할 수 있다.

## 4. 표현 규칙

| exact source | inactive Flow 편집 표현 | active/selected 표현 |
| --- | --- | --- |
| `# 제목` | 큰 문서 제목 | `# 제목` raw syntax |
| `## 소제목` | section heading | `## 소제목` raw syntax |
| 일반 문장 | 같은 문장 그대로 | 같은 editable text |
| `- [ ]`, `- [x]` | 실행 control이 아닌 `☐`, `☑` glyph와 문장 | exact marker와 문장 |
| bullet·ordered | 각각 bullet·ordinal을 유지 | exact marker와 문장 |
| 한 단계 하위 checkbox | 부모 다음의 들여쓴 확인 문장 | exact indentation·marker |
| item property | 조용한 label/value 문장 | exact indentation·key·value |
| Markdown link·URL | 안전한 link typography, navigation 없음 | exact source |
| blockquote | 인용 typography | `>` 포함 exact source |
| code·HTML·comment·table | 실행하지 않는 monospace/plaintext | exact source |
| invalid·ambiguous·unsupported | 항상 raw; badge·box 없음 | 항상 raw |
| stale·too-large | 전체 raw editing 유지 | 전체 raw editing 유지 |

checkbox와 link는 왼쪽에서 완료 처리하거나 외부로 이동하지 않는다. 누르면 source caret만 연다. source에 없는 label, 날짜, 역할, 완료 상태를 만들지 않는다.

## 5. 편집·transaction 계약

### 5.1 단일 권위

`rawText`가 유일한 source authority다. CodeMirror document는 편집용 LF-normalized view이며 저장 정본이 아니다. pure `FlowEditorSourceAdapter`가 JS UTF-16 offset을 raw↔editor 양방향으로 매핑한다.

- untouched raw slices는 byte-for-byte 그대로 복사한다.
- LF, CRLF, CR, 혼합 EOL을 raw source에 보존한다.
- 일반 Enter의 새 줄은 현재 source line 문맥의 EOL을 사용한다.
- paste는 `text/plain`을 한 exact raw replacement로 적용한다.
- `text/plain`이 없는 파일·이미지 전용 paste는 선택 source를 빈 문자열로 바꾸지 않고 write `0`으로 막는다. 명시적인 빈 `text/plain`은 사용자가 요청한 빈 replacement로 처리한다.
- copy·cut은 normalized editor text가 아니라 exact raw slice를 clipboard에 넣는다.
- emoji, ZWJ sequence, combining mark는 JS UTF-16 offset 기준으로 잃지 않는다.
- terminal newline 뒤에는 zero-width editable blank block을 둔다.

### 5.2 selection·editing

- collapsed caret가 있는 block과 selection이 교차하는 모든 block은 raw syntax를 드러낸다.
- selection direction은 raw anchor/head로 보존한다.
- Ctrl/Cmd+A 뒤 copy는 전체 raw source와 같다.
- Enter는 newline만 삽입하며 marker·indent를 자동 생성하지 않는다.
- 줄 시작 Backspace와 줄 끝 Delete는 underlying line ending을 지워 block을 합친다.
- editor-local Ctrl/Cmd+Z·Redo는 exact raw snapshot을 복원한다.
- editor undo와 Inspector/domain undo, durable revision을 섞지 않는다.

### 5.3 IME·경쟁 상태

- composition 중 기존 decoration을 change mapping만 하고 새 semantic DOM을 만들지 않는다.
- composition이 끝난 뒤 current source model로 decoration을 다시 계산한다.
- external raw sync transaction은 editor-local change로 다시 보고하지 않는다.
- inactive editor의 external selection sync는 session sidecar를 덮어쓰지 않는다.
- stale model은 semantic decoration을 만들지 않는다.
- editor instance는 keystroke마다 다시 만들지 않는다.

## 6. UI·접근성

- header control은 `편집 방식`, `순수 텍스트`, `Flow 편집`만 사용한다.
- `미리보기`, `보기 방식`, `변환`, `적용`, preview empty state를 쓰지 않는다.
- mode button은 각각 최소 44px이다.
- Flow 편집기는 하나의 multiline textbox이며 rendered block을 별도 tab stop으로 만들지 않는다.
- Tab은 editor를 빠져나갈 수 있고 mode button은 ArrowLeft·ArrowRight·Home·End로 전환할 수 있다.
- editor 전체를 live region으로 만들지 않는다. 오른쪽 결과 갱신 중 상태만 제한적으로 알린다.
- checkbox glyph는 실행 control로 노출하지 않는다.
- HTML은 DOM으로 실행하지 않고 text로만 둔다.
- 900px 미만은 기존 입력/결과 staged mobile 흐름, 900px 이상은 기존 좌우 pane을 유지한다.
- 320·390·899·900·1024·1280·1440px와 200% text에서 가로 손실 없이 마지막 source에 도달해야 한다.
- reduced motion에서는 불필요한 transition·smooth scroll을 사용하지 않는다.

## 7. 상태·저장·복구

UI sidecar만 sessionStorage에 둔다.

- mode
- raw selection start/end/direction
- text/input/Flow editor scroll
- active source block ID
- exact raw fingerprint

mode 전환·caret 이동·scroll은 canonical, projection, durable draft, revision, save receipt를 만들지 않는다. fingerprint mismatch는 source를 잃지 않고 `순수 텍스트`로 fail open한다. reload recovery와 explicit save→reload→draft reopen은 기존 P0 저장 경계를 그대로 사용한다.

## 8. 필수 acceptance

- `LIVE-D01`: raw↔LF editor offset, LF/CRLF/CR/혼합 EOL, trailing newline, emoji·ZWJ·combining round-trip을 증명한다.
- `LIVE-H01`: 별도 preview article/panel 없이 편집기 안에서 active raw + inactive rendered block이 동시에 보인다.
- `LIVE-E01`: rendered block click→raw reveal→typing→Enter→Backspace가 같은 source와 오른쪽 결과를 갱신한다.
- `LIVE-T01`: exact select/copy/cut/paste와 raw snapshot undo/redo가 source를 복원한다.
- `LIVE-K01`: 일반 Enter는 literal newline만 쓰고 Ctrl/Cmd+Enter의 기존 workspace action은 source를 바꾸지 않는다.
- `LIVE-I01`: Korean composition 중 editor가 재생성되지 않고 compositionend 뒤 source·result가 일치한다.
- `LIVE-F01`: plain·URL-only·invalid·ambiguous·unsupported에서 신규 Todo·사실 생성 0이다.
- `LIVE-P01`: mode·selection·scroll만 UI sidecar에 쓰고 오른쪽 결과·save·revision mutation은 0이다.
- `LIVE-R01`: reload recovery가 mode·source·selection·scroll을 복원한다.
- `LIVE-S01`: explicit save→reload→draft reopen이 exact source와 mode를 복원한다.
- `LIVE-X01`: raw source가 같은 서로 다른 draft도 editor undo/redo history를 공유하지 않는다.
- `LIVE-A01`: keyboard, 44px, 7 viewport, 200%, reduced motion, no horizontal loss를 만족한다.
- `LIVE-G01`: main product route에서 gate 기본값이 꺼져 있고 새 editor UI가 없다.

## 9. 구현·release 경계

허용:

- source-derived flow view model과 pure lossless editor adapter
- isolated CodeMirror editor component와 UI sidecar
- `InputPane`·`TextAuthoringWorkspace`의 PoC gate wiring
- component/model/adapter/shared/browser tests
- standalone build·serve·HTML·spec·results

제외:

- parser·canonical·projection·durable storage schema 수정
- main app route·navigation·production feature rollout
- 오른쪽 ResultPane IA·object semantics 변경
- P1-A/B/D/F, P2, publication, provider, AI runtime
- 기존 Draft PR `#184`~`#187` 변경
- commit, push, PR, merge, deploy, P35, external write, observed-user validation

자동 unit·build·browser QA는 local internal QA이며 실제 사용자 검증이 아니다.
