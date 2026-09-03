# 통합 PoC 단계 2 작업 계약 — 작성·탐색 UX 연결

- 작성일: 2026-09-02
- 상태: `IMPLEMENTED_AND_CHROMIUM_VERIFIED` — 실제 기기·실제 200% text zoom·screen reader는 미실행
- 대상 패키지: `A2`, `A6`, `A7`
- 대상 요구: `D1-009,016,019,024`, `D2-022,029~034,037,038,043,044,046,050,052~056`, `BP-074`
- 상위 결정: [A0 결정 기록](./a0-decision-record.md)
- 선행 계약: [단계 1 작업 계약](./stage-1-contract.md)

이 문서는 개인공간 v4.1, 개발 1의 기존 Flow 탐색, 개발 2의 Text Authoring을 한
PoC 여정으로 잇기 위한 교체 가능한 단계 2 계약이다. 운영 route·schema·writer, 공개
정책, CreatorDraft 정책을 승인하지 않는다. React exact-query surface가 제품 구현 정본이며
모든 mutable 값은 `flow:poc:personal-workspace:v1:*` 안에서만 다룬다.

## 1. 단계 2가 닫아야 하는 사용자 과업

사용자는 `새 Flow 만들기`에서 보이는 입력 하나에 검색어, HTTP(S) 링크 또는 자기 메모를
넣는다. 준비된 기존 Flow가 있으면 중복 없는 결과에서 고르고, 없으면 같은 글을 버리지
않고 Text Authoring으로 이어 간다. Text Authoring에서는 한 원문을 `순수 텍스트` 또는
`Flow 편집`으로 보며, 정상 원문은 구조 화면을 거치지 않고 결과에 도달한다. 작성 틀,
문맥형 `+`, ghost 예시는 원문을 대신 만들지 않고 사용자가 명시적으로 선택했을 때만
각자의 제한된 역할을 수행한다.

단계 2는 다음 순서로 닫는다.

1. 기획: 한 입력의 판정 우선순위, Map 표현, authoring의 기본·보정 경로를 고정한다.
2. UX/디자인: 네 viewport 계열의 entry→authoring/result 흐름과 감산 기준을 고정한다.
3. 개발 설계: 하나의 source owner, editor port, 순수 transition, 저장 경계를 고정한다.
4. 구현: 통합 entry, Map child 선택, 한 editor, 선택형 review, helper, template, ghost를
   연결한다.
5. 검증: source byte·selection·history·운영 key 불변과 반응형 E2E를 실행한다.
6. 증거 반영: 아래 요구를 fresh 구현과 테스트로 다시 판정한다.

이 문서의 설계만으로 완료를 주장하지 않는다. 아래 단계 2 종료 증거와 실제 구현 diff를
함께 사용하며, 단계 3에 남긴 부모 요구와 미실행 외부 증거는 계속 부분 판정한다.

## 2. 변경할 수 없는 상위 결정

| 경계 | 단계 2 계약 |
| --- | --- |
| route | PoC는 `/my?personalWorkspacePoc=v1`과 `/flows/new?personalWorkspacePoc=v1` exact-query 안에서만 열린다. 잘못된 query는 기존 `/my`로 fail-closed한다. |
| 한 입력 | 검색 전용 입력과 메모 전용 입력을 동시에 두지 않는다. entry에서 한 control만 보인다. |
| 한 editor | authoring source를 편집하는 DOM owner는 하나다. preview, Flow 표현, ghost는 파생 presentation이다. |
| 기본 여정 | 정상 문서는 `입력 → 결과`다. 구조 검토는 사용자가 열거나 issue가 있을 때 제안되는 drawer/bottom sheet다. |
| 작성 틀 | 빈 원문에서 명시 선택 시 승인된 미완성 TXT scaffold를 같은 editor에 한 번 삽입한다. 별도 폼·완성 gate를 만들지 않는다. |
| ghost | editor 전체의 presentation state다. source, clipboard, selection, scroll, revision, dispatch, native history에 들어가지 않는다. |
| source | 검색·parse·preview·Flow view는 source bytes를 고치지 않는다. 일반 문장을 자동 Todo로 승격하지 않는다. |
| write | 기존 네 origin과 운영 `flow:*`는 읽기만 한다. 기존 완료·메모·날짜·보관·export writer를 호출하지 않는다. |
| 보류 | recurrence runtime, public 후보·버전, table/source update, AI, cloud·외부 동기화는 지원한 것처럼 표현하지 않는다. |

## 3. 현재 구현 대조와 UX review

현재 `PersonalWorkspacePocAuthoringSurface`에는 exact-gated authoring, 하나의 native
`textarea`, 여섯 scaffold, deterministic preview, 개인 Flow handoff가 있다. 그러나
`MobileStep = write | structure | result`, `구조 확인하기`, source 확인 checkbox 때문에
구조 검토가 필수 단계처럼 보인다. 예시는 editor 밖의 선택 template 카드이고, template
Undo/Redo는 `keydown`을 가로채는 수동 history이며, caret은 `2`로 고정돼 있다. IME와
document/editor fingerprint를 함께 검사하는 source transaction, current-line Flow 표현,
문맥형 helper, Map grouping은 없다.

### Findings

1. **Blocking · source/history:** 수동 Undo가 native history와 갈라져 붙여넣기·입력·IME
   순서에서 exact byte 복구를 보장하지 못한다.
2. **High · journey:** 정상 문서도 `작성 → 구조 → 결과`와 확인 checkbox를 거쳐야 해
   A0의 기본 여정과 충돌한다.
3. **High · discovery:** 기존 네 origin을 찾는 입력과 새 원문 작성이 서로 다른 시작점이다.
4. **High · content fidelity:** 별도 예시 카드는 빈 syntax 줄의 소유 관계를 설명하지 못하고
   선택·복사될 수 있다.
5. **Medium · cognitive load:** 모바일에서 global nav, local header, status, 3-step nav,
   작성 설명이 editor보다 먼저 여러 줄을 차지한다.
6. **Medium · operability:** item-level `+`와 visual viewport 기준 keyboard 회피가 없다.

### Rubric

- User Need Fit: 4/5 — 일반 글에서 개인 Flow까지 목적은 분명하지만 기존 Flow 찾기가 끊긴다.
- Execution Clarity: 3/5 — 저장은 가능하나 구조 확인이 필수처럼 보이고 도움 역할이 섞인다.
- Content Fidelity: 4/5 — 원문과 line mapping은 보존하나 live 표현·ghost 계약이 없다.
- Portability: 3/5 — Todo와 날짜 preview는 있으나 전체 결과 projection은 단계 3 범위다.
- Cognitive Load: 2/5 — 모바일의 3단계 chrome과 설명이 첫 입력을 늦춘다.
- Copy Specificity: 4/5 — 저장 범위는 구체적이나 `구조 확인`이 내부 단계를 주 행동으로 만든다.
- Source/Safety: 4/5 — PoC writer 경계는 강하지만 helper/history 경계의 브라우저 증거가 없다.
- Accessibility/Operability: 3/5 — 기본 label·focus는 있으나 IME, ghost, keyboard 위 menu가 미완이다.

### Recommended fixes

1. entry를 한 입력과 결정적 branch reducer로 만들고 네 origin을 read-only로 연결한다.
2. authoring을 두 visible state `입력 / 결과`로 줄이고 structure를 on-demand overlay로 옮긴다.
3. source editor port에 identity·fingerprint·selection·scroll·composition·native history를
   하나의 transaction 계약으로 묶는다.
4. template sample card를 없애고 Flow view의 blank recognized line에 DOM ghost를 둔다.
5. 문맥형 helper는 safe target에서만 열고 실제 syntax와 한 단계 hierarchy를 보여 준다.

### Subtraction

- 제거: 모바일 `02 구조` 탭, 필수 source-confirm checkbox, 상시 구조 pane, template별
  큰 예시 카드, 작성법을 반복하는 긴 설명, 같은 뜻의 header/body CTA.
- 유지: 운영 읽기 전용 경계, 저장 실패·복구 상태, issue와 source line, 결과 count,
  `개인 Flow로 저장`, Undo와 focus return.
- 필요할 때만 표시: 구조 review, source 상세, template picker, 문맥형 helper menu,
  정보 변환 범위, 기술 진단.

## 4. 요구사항별 단계 2 계약

### 4.1 A2 — 통합 진입·origin·Map

| ID | 현재 판정 | 단계 2 계약 | 단계 2 종료 시 판정 조건 |
| --- | --- | --- | --- |
| `D1-009` | 부분 | 같은 Map owner의 child를 먼저 묶는다. child가 하나면 Map label 없이 일반 Flow 한 개로 보이고, 둘 이상일 때만 결과 위에 child selector를 둔다. `review_hold`, storage origin, map id는 사용자 기본 화면에서 숨긴다. | 네 origin fixture에서 single-child 1행, multi-child 1그룹, duplicate 0과 no-write를 unit+E2E로 확인하면 충족. |
| `D1-016` | 부분 | `찾기/메모 → 결과 → 개인 Flow 저장 → 개인공간 열기`를 한 문법으로 잇는다. 기존 Flow도 같은 result handoff를 쓰되 편집·휴지통 복구는 단계 3·5 owner를 기다린다. | 단계 2에서는 탐색·작성 구간만 fresh 충족으로 올리고, 전체 requirement는 staged edit·lifecycle이 닫힐 때까지 부분 유지. |
| `D1-019` | 미충족 | 입력 하나를 `query | url | invalid-url | memo`로 결정적으로 판정한다. query hit가 있으면 filter, HTTP(S) URL이면 exact canonical lookup, 검색 결과가 없는 일반 글이면 memo candidate다. query hit가 있어도 사용자가 `이 내용으로 새 Flow 작성`을 명시 선택할 수 있다. | raw input 보존, branch precedence, URL miss/error fallback, 네 origin 결과 duplicate 0, 분기 중 운영 write 0을 확인하면 충족. |
| `D1-024` | 미충족 | multi-child selector를 전체 결과 위에 둔다. child 변경은 `selectedChildRef` 교체, `resultView='text'`, `openItemRef=undefined`, 선택 결과 heading focus return을 하나의 transition으로 처리한다. | reducer parity와 browser에서 Text reset·detail close·focus return·write 0을 확인하면 interaction 충족. Text/Todo/Calendar 전체 projection 품질은 단계 3까지 부분으로 추적. |

### 4.2 A6 — 한 editor·선택형 구조

| ID | 현재 판정 | 단계 2 계약 | 단계 2 종료 시 판정 조건 |
| --- | --- | --- | --- |
| `D2-022` | 미충족 | visible journey는 `입력 / 결과` 두 상태다. 정상 원문은 review open·확인 없이 결과와 저장 preflight에 간다. issue가 있으면 launcher를 경고로 승격하지만 review 자체를 별도 완료 상태로 저장하지 않는다. | 정상·warning 문서 E2E와 이전 `structure` UI state의 `result` normalization을 확인하면 충족. |
| `D2-029` | 부분 | 같은 `rawText`를 `순수 텍스트 / Flow 편집` 두 presentation으로 본다. 오른쪽 result state와 selection은 view 전환으로 초기화하지 않는다. 두 editable source를 만들지 않는다. | view 왕복 전후 exact raw, selection, scroll, history, result identity가 같으면 충족. |
| `D2-030` | 부분 | Flow view는 제목·문단·root Item·property·한 단계 확인이 한 문서 흐름으로 이어진다. Item마다 card, badge, 별도 Todo box를 만들지 않는다. | long prose와 mixed syntax에서 문서 흐름·행 순서·source line이 유지되고 card inventory 0이면 충족. |
| `D2-031` | 미충족 | Flow view의 active line은 exact raw syntax, 비활성인 지원 line은 파생 문서 표현이다. 미완성·일반 prose·unsupported·protected line은 항상 raw로 남는다. | click/caret/keyboard/IME로 active line을 바꿨을 때 해당 line만 raw가 되고 source byte가 불변이면 충족. |
| `D2-032` | 부분 | line decoration만 갱신한다. typing·composition 중 editor 전체를 pure/Flow로 바꾸거나 remount하지 않는다. source fingerprint, selection, scrollTop과 right result identity를 유지한다. | 입력 100회와 IME sequence에서 remount·전체 flicker·selection jump·scroll jump 0이면 충족. |
| `D2-033` | 미충족 | 평상시 상시 toolbar를 두지 않는다. safe blank target 또는 현재 root Item에만 44px 웹/48px 모바일 `+`를 보인다. 닫힌 helper는 tab order와 document listener를 만들지 않는다. | blank·Item·protected line fixture에서 표시 대상이 정확하고 open/browse/cancel source write 0이면 충족. |
| `D2-034` | 미충족 | owner context에 따라 `Flow 이름 적기 / 첫 단계 / 첫 할 일 / 다음 할 일 / 다음 체크 / 내용 추가` 중 하나를 첫 행동으로 제안한다. 드문 구조는 `다른 내용`에서만 연다. | 각 context가 승인된 syntax와 정확한 offset 한 곳만 삽입하고 one native Undo로 복구되면 충족. |
| `D2-037` | 미충족 | menu 행에 `- [ ]`, `  - [ ]`, `- 날짜:`, `##`와 들여쓰기·연결선을 같이 보여 준다. 시각 preview는 `aria-hidden`, label/description만으로 관계를 이해할 수 있어야 한다. | visible syntax, accessible name, hierarchy description, 색상 없는 판단을 component+a11y E2E로 확인하면 충족. |
| `D2-038` | 미충족 | `+`는 계산된 owner line에 고정한다. `<900px`은 `visualViewport`의 top/height와 sticky CTA 위 경계를 사용한 non-modal bottom sheet, `>=900px`은 22rem anchored popover를 쓴다. | keyboard가 열린 390과 844×390에서 active target·모든 menu row·닫기·적용에 scroll 접근하고 overflow 0이면 충족. |
| `D2-043` | 부분 | 첫 입력 전에 영구 노출할 설명은 source/write 경계 한 줄만 둔다. global nav 1회, local title 1행, status는 변화가 있을 때만 compact live region, local primary 1개를 유지한다. | 모바일 첫 viewport에서 editor와 주 행동이 보이고 중복 CTA·3-step 설명·QA label 0이면 충족. |
| `D2-044` | 미충족 | root와 child/property의 시작 x를 다르게 하고 depth 1에 중립 guide와 hanging indent를 함께 쓴다. depth 2 이상은 렌더 승격하지 않고 exact raw로 보존한다. | 320~1440과 200%에서 hierarchy가 색 없이 구분되고 긴 줄의 둘째 줄이 본문 x축에 맞으면 충족. |
| `D2-055` | 미충족 | 최종 menu 계층은 `다음 할 일 → 현재 할 일 안에: 하위 확인 / 항목 정보 → 새 단계`다. `항목 정보` 상세는 실제 지원 catalog만 노출한다. | menu 순서·문구·source insertion과 one-level limit가 unit+E2E에서 일치하면 충족. |

### 4.3 A7 — 작성 틀·ghost transaction

| ID | 현재 판정 | 단계 2 계약 | 단계 2 종료 시 판정 조건 |
| --- | --- | --- | --- |
| `D2-046` | 부분 | 여섯 승인 scaffold를 현재 source editor에 한 번 삽입하고 첫 blank value offset으로 caret/focus를 옮긴다. offset `2`를 UI에서 하드코딩하지 않고 versioned template metadata 또는 locator로 계산한다. | 여섯 template 각각 source exact bytes, focus, collapsed selection, first value offset을 browser에서 확인하면 충족. |
| `D2-050` | 부분 | picker open 시 `{editorId, documentId, sourceFingerprint, dispatchCount}`를 캡처하고 apply 직전에 최신 snapshot과 대조한다. source empty, 같은 owner, dispatch 변화 0, `composing=false`일 때만 허용한다. | non-empty·stale source·stale host·double apply·IME composing이 source/draft/workspace write 0으로 끝나면 충족. |
| `D2-052` | 부분 | template apply는 editor port의 native history transaction 한 번이다. React `keydown`에서 Ctrl/Cmd+Z·Y를 가로채는 수동 template history를 제거한다. Undo 1회는 삽입 전 exact bytes, Redo 1회는 삽입 exact bytes를 복원한다. | 실제 Chromium keyboard event와 editor `input` event로 byte parity·history 1칸을 확인해야 충족. 상태 배열만으로는 충족 아님. |
| `D2-053` | 부분 | `입력 예시 보기`는 직접 작성, helper, template, 복원 문서에 공통인 Flow view presentation toggle이다. template별 외부 example card를 대체하고 pure text view에서는 ghost를 숨긴다. | 네 진입 방식에서 같은 toggle/state를 사용하고 source/editor를 갈아 끼우지 않으면 충족. |
| `D2-054` | 부분 | ghost node는 `aria-hidden="true"`, `pointer-events:none`, `user-select:none`이며 recognized blank syntax의 value 위치에만 overlay한다. toggle·render는 source, clipboard, selection, scroll, revision, dispatch, history 0 변화다. | DOM contract와 copy/select/toggle/Undo 전후 계측이 모두 0이면 충족. |
| `D2-056` | 부분 | `AuthoringGuideCatalogV1`에 template bytes, first value locator, line ghost, menu syntax를 version과 fingerprint로 고정한다. 질문·설명·예시·placeholder는 compile source가 아니다. recursive StructureDraft/compiler 전체 복제는 하지 않는다. | 같은 catalog input의 byte-identical 결과와 sidecar fingerprint를 검사한다. 이 단계 뒤에도 recursive compiler 요구는 `부분/후속 A10`으로 남긴다. |

### 4.4 Bridge

| ID | 현재 판정 | 단계 2 계약 | 단계 2 종료 시 판정 조건 |
| --- | --- | --- | --- |
| `BP-074` | 부분 | partial/unsupported line은 버리지 않고 review launcher에서 원문 위치·보존 상태·다음 행동을 보여 준다. `원문 N행 수정`은 같은 editor의 exact locator로 돌아가고, invalid date는 수정하거나 날짜 미정으로 둘 수 있다. draft reload는 exact raw와 template ID를 복구한다. | silent drop·fake date·early workspace write 0, source line correction, undated, reload를 E2E로 확인하면 PoC 범위 충족. canonical merge/split/role correction 전체는 이 단계 완료 주장에 포함하지 않는다. |

## 5. 한 입력의 판정과 fallback

### 5.1 화면과 source owner

통합 entry는 `/flows/new?personalWorkspacePoc=v1` 안에서 열린다. 개인공간의
`새 Flow 만들기`는 이 route 한 곳으로 연결한다. entry 시점의 문자열은
`discoveryRawInput`이며 아직 authoring source가 아니다. 화면에는 한 control만 보인다.
사용자가 `이 내용으로 새 Flow 작성`을 명시하면 그 exact string이 `rawText`의 최초 값이
되고 동일 control이 multiline source editor로 확장된다.

분류를 위해 trim·Unicode/대소문자·연속 공백 normalization을 파생값으로 쓸 수 있지만
`discoveryRawInput` 자체를 정규화하거나 URL/query 결과로 덮어쓰지 않는다.

### 5.2 판정 우선순위

```text
empty
  → 안내만 표시, action/write 0

valid http(s) URL
  → canonical URL exact lookup
  → saved-origin 또는 준비된 read adapter hit: URL 결과
  → miss/review/unsupported: 이유 + "텍스트로 계속" 또는 "원문 수정"

URL처럼 시작하지만 잘못됐거나 http(s)가 아님
  → invalid-url
  → 자동 memo 전환 금지, "링크 고치기" / "텍스트로 계속" 명시 선택

그 외 텍스트
  → 네 origin의 user-facing title·source title·item text query
  → hit 1개 이상: filter 결과 + "이 내용으로 새 Flow 작성" 보조 행동
  → hit 0개: memo candidate + "이 내용으로 새 Flow 작성" 주 행동
```

query hit은 현재 browse filter 때문에 숨은 Flow까지 전체 eligible read model에서 먼저
계산한다. 검색 결과가 있다는 이유로 문자열을 authoring source로 쓰지 않고, 결과가 없다는
이유로 Flow를 자동 생성하지 않는다. URL lookup은 기존 canonicalizer와 read-only lookup
결과를 재사용할 수 있지만 그 모듈의 save helper와 운영 writer는 호출하지 않는다.

### 5.3 네 origin과 duplicate 규칙

- 대상 origin: `bundle snapshot`, `URL/memo draft bundle`, `saved Flow Map snapshot`,
  `source-backed Flow Map personal copy`의 단계 1 read adapter 결과다.
- 화면 row key는 `savedCopyId + flowId`, Item key는 `savedCopyId + flowId + itemId`다.
- 같은 exact identity가 두 raw owner에서 발견되면 한쪽을 고르는 대신 전체 PoC를
  fail-closed한다.
- 서로 다른 saved copy가 우연히 같은 제목을 가져도 합치지 않는다. source context를
  on-demand로 보여 주되 기술 origin 문자열은 숨긴다.
- query, URL lookup, Flow 선택, Map child 선택은 persistent write 0이다.

## 6. Flow Map 사용자 표현과 child transition

### 6.1 grouping

read model에 Map owner identity와 child 순서를 additive metadata로 둔다. 이 metadata는
원본을 바꾸지 않는 presentation hint다.

| 원본 형태 | 사용자 표현 |
| --- | --- |
| Map child 1개 | 일반 Flow row와 일반 결과. `Flow Map`, `single-child`, `review_hold` 문구 없음. |
| Map child 2개 이상 + 선택 가능 | 그룹 row 한 개. 열면 결과 위에 `어떤 Flow를 볼까요?` child selector. |
| Map 상태 unsupported/review_hold | 실행 가능한 child처럼 노출하지 않는다. 지원 범위와 원문 보존을 알리고 운영 write 없이 중단. |
| non-Map origin | 일반 Flow row. |

### 6.2 하나의 선택 transition

```ts
type SelectIntegratedFlowChild = Readonly<{
  type: 'select-integrated-flow-child';
  groupRef: string;
  childFlowRef: string;
  expectedReadModelFingerprint: string;
}>;

type IntegratedResultState = Readonly<{
  selectedGroupRef?: string;
  selectedFlowRef?: string;
  resultView: 'text' | 'todo' | 'calendar';
  openItemRef?: string;
  focusReturn: { kind: 'flow-result-heading'; flowRef: string };
}>;
```

성공 결과는 child만 교체하고 `resultView='text'`, `openItemRef=undefined`로 만든다.
같은 child, stale fingerprint, foreign child, unsupported group은 state·DOM selection·storage
mutation 0이다. 화면은 `Text로 돌아왔어요` 같은 지속 status를 추가하지 않고 result
heading과 `aria-live` 한 문장으로만 변화를 알린다.

Text 이외 projection의 완전한 데이터·selector 계약은 단계 3 `A5`가 소유한다. 단계 2는
selection transition과 최소 read-only Text result를 구현하고, 전체 projection이 아직
없다면 `D1-024`의 데이터 충족을 과장하지 않는다.

## 7. Authoring 기본·보정 wireflow

### 7.1 정상 문서

```text
통합 입력
  → "이 내용으로 새 Flow 작성"
  → 같은 글을 가진 source editor
  → deterministic result 갱신
  → "결과 보기 · N개"
  → 실제 Todo/날짜 preview와 저장 preflight
  → "개인 Flow로 저장"
  → receipt
  → "/my?personalWorkspacePoc=v1#flow=…"
```

`항목 검토`를 한 번도 열지 않아도 위 여정이 끝나야 한다. 사용자의 명시적
`결과 보기 · N개` 행동은 그 시점 source fingerprint의 해석 확인을 겸한다. 별도
source-confirm checkbox를 두지 않으며, submit 직전 fingerprint가 확인한 값과 다르면
결과를 stale로 표시하고 최신 결과를 다시 계산한다. desktop의 live result에서 바로
저장하는 경우에는 save preflight가 최신 result fingerprint를 한 번 명시적으로 확인하게
한다.

### 7.2 issue가 있는 문서

```text
source 입력
  → 결과는 보존 가능한 범위까지 표시
  → "확인이 필요한 문장 N개 · 항목 검토"
  → 선택형 review drawer/sheet
  → 원문 fragment, 읽은 범위, 읽지 못한 범위, 보존 상태, 다음 행동
  → "원문 N행 수정"으로 같은 editor/caret 복귀
  → 수정 후 result·issue count 갱신
```

material blocker가 남아 있으면 저장은 계속 fail-closed한다. review를 닫거나 열었다는
사실은 source 확인이나 loss acceptance로 사용하지 않는다.

### 7.3 사용자가 구조를 보고 싶은 문서

정상 상태 launcher는 `N개 항목으로 반영됨 · 항목 검토`다. drawer에는 source 순서의
Step/Item, source line, included/blocked 상태만 먼저 보인다. 단계 2에서 구조 직접 편집은
safe source-line correction과 contextual source insertion만 연다. canonical 객체를 직접
merge/split/reorder하는 범용 block editor는 만들지 않는다.

## 8. viewport별 wireflow

### 8.1 mobile · 375×812 / 390×844

```text
┌ global navigation · 한 번 ─────────────────┐
├ 새 Flow 만들기                    개인공간 ┤
├ [ 무엇을 찾거나 만들까요?                 ] ┤
├ query 결과 또는 memo 시작 primary 1개       ┤
└────────────────────────────────────────────┘

authoring 진입 뒤
┌ [01 입력] [02 결과] ───────────────────────┐
│ [순수 텍스트 | Flow 편집] [입력 예시]       │
│ source editor · 현재 줄 raw                 │
│ N개 항목으로 반영됨 · 항목 검토              │
│                                             │
├ sticky: 결과 보기 · N개 / 개인 Flow로 저장  ┤
└────────────────────────────────────────────┘
```

- visible stage는 두 개뿐이며 한 stage만 document flow에 둔다.
- helper/review는 CTA 위에 독립 scroll하는 non-modal sheet로 연다.
- input/select/textarea 글자 크기는 16px 이상, 주 target은 48px다.
- sheet 닫기 뒤 origin `+`, review launcher 또는 source line으로 focus를 돌린다.

### 8.2 short landscape · 844×390

390 세로 화면과 같은 두-stage IA를 쓴다. header를 한 줄로 줄이고 body가 아닌 active
panel이 독립 scroll한다. sticky CTA, keyboard, safe-area를 제외한 sheet 높이는
`visualViewport.height` 안에서 계산한다. editor, 마지막 menu row, 닫기, primary action에
모두 scroll로 도달해야 한다.

### 8.3 tablet · 1024×768

```text
┌ compact local header ─────────────────────────────────────┐
├ 입력 42%                         │ 결과 58%                ┤
│ 통합 entry 또는 source editor     │ 실제 preview             │
│ pure/Flow toggle                 │ review launcher          │
│ contextual +                     │ save preflight           │
└──────────────────────────────────┴─────────────────────────┘
                                  [review right drawer]
```

두 pane은 independent scroll을 사용한다. review는 세 번째 상시 열이 아니라 결과 위 right
drawer다. drawer를 닫으면 launcher/issue/result opener로 focus를 돌린다.

### 8.4 desktop · 1440×900

입력 40~44%, 결과 56~60%의 두 pane을 기본으로 한다. source line과 긴 결과가 읽힐
폭을 우선하고, 빈 세 번째 열이나 상시 inspector를 만들지 않는다. multi-child selector는
오른쪽 전체 결과의 첫 control이다. 구조 review와 Item 상세는 같은 overlay stack에서 한
번에 하나만 열며 nested modal을 만들지 않는다.

## 9. 하나의 source editor 계약

### 9.1 source of truth

`rawText` exact JS string이 source owner다. parser result, line view, preview, ghost,
template name, question, placeholder는 source가 아니다. line offset은 단계 1 fidelity
manifest의 JS string unit locator를 재사용해 CRLF, tab, emoji, trailing newline을 보존한다.

```ts
type PocSourceEditorSnapshot = Readonly<{
  editorId: string;
  documentId: string;
  sourceFingerprint: string;
  rawText: string;
  selectionStart: number;
  selectionEnd: number;
  selectionDirection: 'forward' | 'backward' | 'none';
  scrollTop: number;
  scrollLeft: number;
  dispatchCount: number;
  composing: boolean;
}>;

interface PocSourceEditorPort {
  readSnapshot(): PocSourceEditorSnapshot;
  focusSelection(selectionStart: number, selectionEnd: number): void;
  applyNativeSourceTransaction(input: {
    expected: PocSourceEditorSnapshot;
    replaceStart: number;
    replaceEnd: number;
    insertedText: string;
    nextSelectionStart: number;
    nextSelectionEnd: number;
  }): { ok: true; snapshot: PocSourceEditorSnapshot } | { ok: false; reason: string };
}
```

port는 template와 contextual helper가 공유한다. React handler가 Ctrl/Cmd+Z·Y를 별도
history로 흉내 내지 않는다. 브라우저/editor의 실제 input transaction이 React state와
PoC draft를 갱신한다.

### 9.2 pure text와 Flow view

- pure text: native textarea의 exact source를 그대로 보인다. presentation overlay와
  ghost는 숨기고 tab order에서 뺀다.
- Flow view: native textarea가 계속 selection·clipboard·IME owner다. 동기화된
  `aria-hidden` presentation layer가 inactive supported line을 문서형으로 그리고 active
  line은 raw syntax로 그린다.
- overlay는 `pointer-events:none`, `user-select:none`이며 editor를 대신해 focus를 받지
  않는다. pointer hit testing이 필요하면 별도 line gutter button만 사용한다.
- overlay와 textarea의 font metrics, wrapping, padding, scroll offset이 맞지 않거나
  fidelity manifest가 stale이면 전체 raw textarea로 fail-safe한다. source는 바꾸지 않는다.
- view 전환은 editor DOM을 remount하지 않고 selection, direction, scrollTop/Left,
  composition, native history를 유지한다.

### 9.3 caret·selection·scroll

- caret line은 `[startOffset, terminatorEndOffset]`를 포함하는 fidelity line이다. CRLF의
  `\r`/`\n` 사이에서도 같은 logical line으로 판정한다.
- selection이 여러 line에 걸치면 active 범위 전체를 raw로 보인다. 일부 선택을 rendered
  text로 바꾸지 않는다.
- 결과·review로 이동하기 전 selection과 scroll을 저장하고 editor로 돌아올 때 같은
  document fingerprint에서만 복구한다.
- ghost toggle, view toggle, picker browse/cancel, review open/close는 source selection과
  scroll을 직접 set하지 않는다. layout 변화가 unavoidable한 경우 snapshot exact 복구를
  E2E로 입증한다.
- source correction focus는 issue locator의 value 범위를 선택한다. stale locator면 focus와
  write 모두 하지 않고 최신 review를 다시 계산한다.

### 9.4 IME

- `compositionstart`부터 `compositionend`까지 `composing=true`다.
- composing 중 Enter는 결과 이동, helper submit, template apply로 해석하지 않는다.
- composing 중 template/helper action은 `canceled`이고 source·draft·workspace write 0이다.
- composition 중 line overlay는 active line raw를 유지하며 다른 line만 안정적으로 둔다.
- `compositionend`의 native input이 한 번 source state와 deterministic result를 갱신한다.
- IME 상태에서 source/document identity가 바뀌면 입력을 추정 병합하지 않고 fail-closed한다.

## 10. template, contextual helper, ghost, review의 역할

| 도구 | 언제 | source 변경 | history | 만드는 것 |
| --- | --- | ---: | ---: | --- |
| 작성 틀 | 빈 문서에서 구조를 한 번 시작 | 명시 선택 때 1회 | native 1칸 | 승인된 미완성 TXT scaffold 전체 |
| contextual `+` | safe blank line 또는 root Item | 실제 menu action apply 때 1회 | native 1칸 | 해당 위치의 syntax prefix 또는 사용자가 입력한 값 |
| ghost | Flow view의 recognized blank value | 0 | 0 | `예: …` presentation overlay |
| 구조 review | 결과 mapping·issue를 보고 원문 위치로 복귀 | 0 | 0 | 파생 outline과 correction navigation |

### 10.1 최종 구조 menu

```text
현재 단계에
- [ ]  다음 할 일

현재 할 일 안에
├─  - [ ]    하위 확인
└─  - 날짜:  항목 정보
              날짜 · 시간 · 장소 · 자료 · 완료 기준

새 구간으로
##  새 단계
```

실제 property 목록은 현재 PoC parser가 lossless하게 지원하는 항목만 enabled한다.
recurrence, timezone, table/source update를 menu에서 지원하는 것처럼 노출하지 않는다.
값이 필요한 action은 빈 placeholder를 canonical 객체로 만들지 않고 caret을 value 위치에
둔다. 사용자가 값을 입력하기 전 preview count는 바뀌지 않는다.

### 10.2 ghost contract

recognizable blank syntax와 기본 ghost 예시는 versioned catalog에 둔다. 예시는 제품 값을
만들지 않으며 template 주제와 결합하지 않는다.

| raw line | Flow view ghost 예시 |
| --- | --- |
| `# ` | `예: 8월 제주 여행 준비` |
| `## ` | `예: 예약` |
| `- [ ] ` | `예: 항공권 확인` |
| `  - [ ] ` | `예: 예약번호 확인` |
| `- 기준일: ` | `예: 2026-09-02` |
| 지원 property의 빈 value | 해당 property의 형식 예시. source에 없는 사실·날짜·장소를 기본값으로 쓰지 않음. |

ghost는 source에서 복사할 수 없다. 전체 editor copy는 native textarea의 selected raw bytes만
사용한다. ghost만 드래그하거나 클릭할 수 없어야 하며 accessibility tree에도 들어가지
않는다. `입력 예시` toggle의 visible label과 `aria-pressed`는 남긴다.

## 11. transition과 mutation 표

| intent | source state | authoring draft | workspace state | operating state |
| --- | ---: | ---: | ---: | ---: |
| entry input | 화면 값만 변경 | 0 | 0 | 0 |
| query/URL resolve | 0 | 0 | 0 | 0 |
| existing Flow/Map child select | 0 | 0 | 0 | 0 |
| explicit memo→authoring | exact raw 채택 | PoC draft 최대 1 | 0 | 0 |
| normal editor input/paste/IME end | native input | PoC draft 최대 1 | 0 | 0 |
| pure/Flow view toggle | 0 | 0 | 0 | 0 |
| review/helper/template picker open·browse·cancel | 0 | 0 | 0 | 0 |
| template/helper apply success | native transaction 1 | PoC draft 최대 1 | 0 | 0 |
| stale/double/composing/invalid apply | 0 | 0 | 0 | 0 |
| ghost toggle/render | 0 | 0 | 0 | 0 |
| result preview | 0 | 0 | 0 | 0 |
| personal Flow explicit save | 0 | atomic draft remove | PoC state target 1 | 0 |

`최대 1`은 제품 target write 수다. 단계 1 storage transaction의 journal/marker 지원 write와
구분한다. 모든 key는 PoC prefix를 검사하고 `localStorage.clear()`는 호출하지 않는다.

## 12. 구현 seam

| seam | 책임 | 금지 |
| --- | --- | --- |
| `personal-workspace-poc-entry.ts` | entry 분류, query result dedupe, URL adapter 결과 normalization, memo candidate | DOM, storage, 운영 save helper |
| `personal-workspace-poc-map-selection.ts` | grouping, single-child flattening, child selection reducer, Text/detail/focus reset | Map source 변경, review_hold 승격 |
| `personal-workspace-poc-authoring-guide.ts` | versioned template/ghost/menu catalog, safe target·first value locator | 질문·예시·placeholder를 source로 compile |
| `personal-workspace-poc-source-editor.ts` | editor snapshot, stale guard, native source transaction, line projection descriptor | manual Ctrl/Cmd+Z history, storage 직접 호출 |
| `PersonalWorkspacePocAuthoringSurface.tsx` | 한 visible input, 2-state chrome, source editor port 연결, result/review/helper presentation | 두 번째 editable source, 필수 구조 확인, 운영 writer |
| 기존 fidelity/parser | exact source lines, protected/unsupported 판정, deterministic preview | source 자동 수정, unsupported 의미 추정 |
| 기존 PoC storage transaction | draft/state atomic boundary, exact rollback | prefix 밖 set/remove, `clear`, operating writer |

구현 파일명은 후보이며 계약 자체가 새 운영 API를 승인하지 않는다. 현재 별도 checkout의
CodeMirror·StructureDraft 구현을 복사·병합하지 않는다. 필요한 동작을 작은 PoC adapter로
재현하고, production editor owner 채택은 후속 결정으로 남긴다.

## 13. 필수 자동·브라우저 acceptance

### 13.1 pure model/component

1. `S2-A2-01`: query normalization은 raw를 바꾸지 않고 네 origin을 한 번씩 반환한다.
2. `S2-A2-02`: valid URL, invalid URL-like, URL miss, plain memo의 precedence가 고정된다.
3. `S2-A2-03`: identity collision과 unsupported origin/Map은 fail-closed한다.
4. `S2-A2-04`: single-child flatten, multi-child grouping, child order가 결정적이다.
5. `S2-A2-05`: child change는 Text reset·detail close·focus return 하나의 next state다.
6. `S2-A6-01`: normal source는 review 없이 result/save preflight에 도달한다.
7. `S2-A6-02`: issue source는 raw locator와 review count를 보존하고 silent drop이 없다.
8. `S2-A6-03`: active/multi-selected line만 raw이고 protected/unsupported는 항상 raw다.
9. `S2-A6-04`: helper target은 safe blank/root Item에서만 생기며 depth 2는 없다.
10. `S2-A7-01`: 여섯 scaffold의 exact bytes, first value offset, catalog fingerprint가 고정된다.
11. `S2-A7-02`: stale editor/document/source/dispatch와 composing은 transaction 0이다.
12. `S2-A7-03`: ghost descriptor는 blank recognized line만 만들고 source 객체에 들어가지 않는다.

### 13.2 React E2E

1. 검색어는 matching Flow 목록을, URL은 exact lookup을, 결과 없는 일반 글은 authoring을
   연다. query hit에서 보조 memo 선택도 exact 글을 보존한다.
2. 네 origin fixture가 중복 없이 열리고 single-child는 일반 Flow, multi-child는 selector로
   보인다.
3. Map child A에서 Item detail을 연 뒤 view를 Todo로 바꾸고 child B를 고르면 Text,
   detail closed, B result heading focus로 한 번에 돌아간다. storage write는 0이다.
4. 정상 문서는 `입력 → 결과`로 가며 `항목 검토`를 열거나 checkbox를 누르지 않고 개인
   Flow save preflight까지 도달한다.
5. issue launcher는 exact source line으로 돌아가 value를 선택하며 수정 후 count를 줄인다.
6. template picker browse/cancel, helper browse/cancel, Escape, outside close는 raw/draft/
   workspace mutation 0이다.
7. template 선택 뒤 editor focus와 first value caret을 확인한다. Ctrl/Cmd+Z 한 번으로
   이전 exact bytes, Redo 한 번으로 scaffold exact bytes를 확인한다.
8. double apply, stale fingerprint, stale host, IME composing Enter/apply는 source와 모든
   storage target mutation 0이다.
9. ghost on/off 전후 `value`, clipboard text, selection start/end/direction, scrollTop/Left,
   source fingerprint, dispatch count, Undo/Redo 결과가 같다.
10. pure text↔Flow view 왕복, typing 100회, long wrapped line, CRLF/tab/emoji/trailing newline,
    copy/cut/paste, Backspace, IME composition에서 byte loss·editor remount·scroll jump가 0이다.
11. reload는 마지막 PoC authoring draft를 복원하고 malformed draft/storage recovery payload는
    기존 `/my`로 fail-closed한다.
12. 전체 시나리오 전후 operating `flow:*` key/value snapshot이 byte-for-byte 같고 허용
    prefix 밖 `setItem`, `removeItem`, `clear` 호출이 0이다.

### 13.3 화면·접근성 matrix

| viewport/환경 | 필수 확인 |
| --- | --- |
| 320×700, 375×812, 390×844 | editor와 local primary가 첫 과업에서 가려지지 않음, input 16px, target 48px, document overflow 0 |
| 844×390 | mobile 2-stage IA, compact header, panel 내부 scroll, keyboard·safe-area 위 마지막 action 접근 |
| 1024×768 | input/result 2-pane, independent scroll, right drawer, nested modal 0 |
| 1440×900 | 2-pane 비율, 빈 세 번째 column 0, multi-child selector가 result 위에 있음 |
| 200% text zoom | line guide·wrapped text·ghost·menu·sticky CTA 겹침과 수평 overflow 0 |
| keyboard | Tab/Shift+Tab 정상 순서, Enter/Space open, Escape close+focus return, shortcut 없이도 전체 과업 가능 |
| screen reader contract | 중복 source 낭독 0, ghost/guide 숨김, launcher count·warning·result change를 짧은 live text로 전달 |

모든 browser run에서 console error, page error, failed internal request, replacement character,
document-level horizontal overflow, 가려진 핵심 행동을 각각 0으로 기록한다. Chromium 자동화는
Android Chrome·iOS Safari 실제 기기 또는 관찰 사용자 검증으로 표현하지 않는다.

## 14. 의도적 보류와 단계 간 경계

| 보류 | 이유와 다시 여는 단계 |
| --- | --- |
| common Plan/Item editor, personal title·memo·date staged apply | 단계 1의 순수 adapter를 화면에 연결하는 단계 3 `A3`가 소유한다. |
| complete Text/Todo/Calendar/TXT selector와 기준일 | 단계 3 `A5`가 같은 effective Item ref로 구현한다. 단계 2 Map reset은 이 상태 계약만 선행한다. |
| CreatorDraft library·검색·복제·보관·재진입 | A0에서 `A11 후속 보류`다. 개인 Flow handoff와 섞지 않는다. |
| recursive StructureDraft/compiler와 전체 rule catalog | `D2-056`의 PoC-local versioned catalog만 먼저 닫고, 필요성이 입증되면 `A10`에서 다시 연다. |
| canonical merge/split/reorder/role block editor | 단계 2는 exact source correction과 safe insertion만 제공한다. source round-trip을 보장하는 owner가 승인될 때 연다. |
| recurrence occurrence, public S3/version, table/source update | A0-5에 따라 raw 보존·blocking 안내만 한다. 가짜 지원을 만들지 않는다. |
| production route/store/schema 통합 | PoC·실기·관찰 결과와 별도 승인 뒤에만 연다. |
| Android Chrome·iOS Safari·screen reader 실기·관찰 사용자 | 자동 E2E와 별도 증거다. 수행하지 않으면 `미실행`, 관찰 사용자 수 `0`으로 기록한다. |

## 15. 단계 2 Exit gate

### 기획·UX

- [x] query/URL/invalid-url/memo 우선순위와 fallback이 한 결정 표대로 동작한다.
- [x] single-child와 multi-child가 기술 Map 정보를 노출하지 않고 구분된다.
- [x] mobile·short landscape는 2-stage, tablet·desktop은 2-pane이며 structure는 overlay다.
- [x] 작성 틀, contextual helper, ghost, review가 서로의 역할을 대신하지 않는다.
- [x] subtraction inventory의 제거 대상이 실제 기본 화면에서 사라졌다.

### source/editor

- [x] exact `rawText`가 유일 source이고 pure/Flow view가 같은 editor port를 쓴다.
- [x] current/multi-selected line, protected line, one-level hierarchy 표현이 계약과 같다.
- [x] caret, selection direction, scroll, composition, native history가 view·ghost·review로
  바뀌지 않는다.
- [x] template/helper가 browser-owned native history transaction 한 번이고 Undo/Redo가
  exact bytes다. Chromium이 여러 줄 `insertText` 한 번에 여러 native input event를 내는
  경우도 logical source revision과 PoC draft write는 한 번으로 합쳤다.

### 안전·검증

- [x] query/URL/memo와 네 origin/Map scenario가 duplicate·operating write 0으로 통과한다.
- [x] normal document가 review 없이 결과와 save preflight에 도달한다.
- [x] stale/double/composing/cancel/Escape에서 mutation 0이다.
- [x] ghost 영향 계측과 6개 template caret/history 검사가 통과한다.
- [x] 320×700, 375×812, 390×844, 844×390, 1024×768, 1440×900과 keyboard,
  overflow·console gate가 통과한다.
- [ ] 실제 browser 200% text zoom과 screen reader는 미실행이다. CDP DPR 2 검사는
  device-metrics 확인일 뿐 text reflow 증거로 사용하지 않는다.
- [x] 단계 3 dependency와 A0 제외 항목은 완료로 올리지 않고 부분·보류로 유지한다.

### 판정 원칙

위 checkbox는 이 계약 문서 작성으로 체크하지 않는다. 구현 diff, 실제 실행 개수, browser
artifact가 생긴 뒤에만 체크한다. 단계 2 종료 보고는 자동 테스트, Chromium 화면 검사,
실제 기기, 관찰 사용자를 서로 분리하고 commit·push·PR·Preview·Production 상태도 각각
기록한다.

## 16. 단계 2 종료 증거

| 구분 | fresh 결과 | 증거 범위 |
| --- | --- | --- |
| PoC model/component | 211/211 PASS | entry, Map, authoring, guide, native logical transaction, storage/state와 기존 개인공간 회귀 |
| 전체 `npm test` | PASS | 저장소 전체 회귀. 최종 총 실행 개수는 단계 6 manifest에서 다시 집계한다. |
| production build | PASS | Next.js type check와 static generation 18/18 |
| Stage 2 Chromium runtime | 11/11 PASS | Chrome 151.0.7922.138, workers 1, 53.8초 |
| 화면 보강 run | 1/1 PASS | 6 viewport와 CDP DPR 2, 21.5초 |
| 화면 artifact | PNG 14개 | 6 viewport의 entry/authoring 12개와 DPR 2 entry/authoring 2개 |
| 저장 경계 | PASS | non-PoC bytes 동일, 허용 prefix 밖 set/remove 0, clear 0 |

브라우저 검증 중 네 가지 실제 결함을 발견해 같은 단계에서 수정했다. multi Map의 정확한
query child 대신 첫 child가 열리던 문제, selection-only 변경이 current-line 표현에 늦게
반영되던 문제, 모바일 review에서 원문 focus가 복구되지 않던 문제, multiline template
한 번이 PoC draft를 native event 수만큼 반복 저장하던 문제다. 각각 exact child 선택,
selection snapshot 전달, render 뒤 focus request, logical transaction coalescing으로 고친 뒤
전체 시나리오를 다시 통과했다.

실제 Android Chrome, iOS Safari, 실제 가상 키보드, screen reader, 실제 200% text zoom,
관찰 사용자 검증은 하지 않았다. commit, push, PR, Preview, Production도 진행하지 않았다.

## 17. 근거

- `docs/specs/2026-07-28-flowme-text-authoring-ux-v1/spec.md`
- `docs/specs/2026-07-28-flowme-text-authoring-ux-v1/interaction-spec.md`
- `docs/specs/2026-07-28-flowme-text-authoring-ux-v1/state-model.md`
- `docs/specs/2026-07-28-flowme-text-authoring-ux-v1/prototype-detail-delta-v1-1.md`
- 개발 2 후속 정본: `2026-08-30-flowme-text-authoring-unified-editor-guidance-poc/spec.md`
- 선택형 구조 정본: `2026-08-04-flowme-text-authoring-optional-structure-review/00-development-goal-ko.md`
- 문맥형 guide 정본: `2026-08-26-flowme-text-authoring-guided-authoring-ux/spec.md`
- 현재 React: `components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx`
- 현재 추적: `docs/content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-assets/requirements-{d1,d2,bp,subchecks}.json`

외부 격리 checkout의 후속 문서는 read-only 근거로만 대조했다. 그 checkout의 dirty 파일을
수정·정리·stage·병합하지 않았으며 이 계약은 현재 PoC worktree 한 파일에만 기록한다.
