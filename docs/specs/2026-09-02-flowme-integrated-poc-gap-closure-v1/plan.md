# FlowMe 통합 PoC 미충족 해소 v1 Plan

## 1. 실행 원칙

이 계획은 단계 0~6을 순서대로 통과한다. 각 단계는 같은 여섯 개 작업층을 가진다.

1. **기획:** 원 요구, 충돌, 사용자 과업, 완료 기준을 고정한다.
2. **UX/디자인:** 화면 흐름, 정보 위계, 상태, 반응형, 접근성 계약을 만든다.
3. **개발 설계:** owner, identity, read model, transition, store, rollback을 정의한다.
4. **구현:** 순수 모델 → store adapter → component/UI 순으로 좁게 구현한다.
5. **검증:** 단위 → component → E2E → full regression/build → browser inspection 순으로
   넓힌다.
6. **Exit gate:** 요구 ID별 증거·판정과 남은 위험을 갱신한 뒤 다음 단계로 간다.

단계가 끝나도 실제 기기와 관찰 사용자가 실행되지 않았다면 해당 증거는 미실행이다.
한 단계의 green automation이 다음 단계의 제품 결정이나 사용자 증거를 대신하지 않는다.

## 2. 의존 관계

```text
단계 0 · A0 결정 ──────────────┐
           │                    │
           ├─ 단계 1 · A1 계약 ├─ 단계 2 · A2/A6/A7
           │                    │
safe lane · A8/A9/A12 일부 ────┘
                                │
                                ├─ 단계 3 · A3/A4/A5/A11
                                │
                                ├─ 단계 4 · A8/A9 완성
                                │
                                ├─ 단계 5 · A10
                                │
                                └─ 단계 6 · A12 최종 증거
```

A0는 PoC 작업 결정으로 완료했다. `/calendar`, 운영 editor·trash·export,
CreatorDraft destination, 영구 shell token은 선택 범위 밖이므로 계속 구현하지 않는다.

## 3. 단계 0 — 기준선과 제품 결정

**대상:** `A0`

**목표:** 구현으로 해결할 gap과 owner 결정·의도적 보류로 해결할 gap을 분리한다.
**상태:** 완료 — 정본은 [A0 결정 기록](./a0-decision-record.md)이다.

### 기획

- 168개 primary와 86개 bridge denominator를 고정한다.
- 98개 primary gap과 24개 bridge gap을 A0~A12에 연결한다.
- D2 저장 lane, D1 operating owner, shell, authoring editor, advanced scope,
  standalone 역할의 결정 질문을 한 문장씩 고정한다.
- 요구 간 충돌에서 최신 사용자 지시, 확정 정본, PoC 임시값, 후보 구현의 우선순위를
  기록한다.

### UX/디자인

- personal authoring과 creator authoring의 첫 화면·primary CTA·완료 문구를 비교한다.
- v4.1 teal/flat shell과 production cobalt/PlatformNav를 동일 viewport에서 비교한다.
- full live editor와 textarea+선택형 correction의 작성→결과 여정을 비교한다.
- standalone이 제공해야 할 core scenario와 React 전용 기능을 구분한다.

### 개발 설계

- 기능·화면별 source/personal/execution/authoring owner matrix를 작성한다.
- 각 결정안의 route, read dependency, write command, key namespace, rollback 영향을
  기록한다.
- operating writer가 필요한 안은 현재 PoC와 분리된 후속 phase로 지정한다.

### 구현

- A0 결정 전 제품 코드는 수정하지 않았다.
- 결정 내용은 별도 결정 기록과 추적 JSON에 반영했다.
- 이 결정은 PoC 작업 계약이며 운영 정책 승인으로 확장하지 않는다.

### 검증

- 결정안별로 요구 ID가 `구현`, `의도적 변경`, `보류` 중 하나에 빠짐없이 속하는지
  확인한다.
- 운영 writer 호출 없이 각 안의 PoC 구현 가능성을 검토한다.
- dirty 원본과 publish 상태가 그대로인지 확인한다.

### Exit gate

- A0-1~A0-6에 선택안·거절안·재검토 조건·owner·write 경계가 있다.
- A1~A12의 scope와 우선순위가 결정 결과에 맞게 조정됐다.
- 승인되지 않은 제품 정책이 코드에 들어가지 않았다.

**Exit 판정:** 통과. Primary의 `결정 필요` 3건은 0건이 됐고, bridge의 `결정 필요`
3건도 0건이 됐다. 아직 구현되지 않은 기능은 부분·의도적 변경·제외로 남겼다.

## 4. 단계 1 — Canonical·저장·복구 기반

**대상:** `A1`, `A3`의 모델·store 부분, `A4`의 상태 contract

**목표:** UI보다 먼저 원문 보존, identity, staged transition, rollback을 안정화한다.
**상태:** 기획·UX/디자인·개발 계약과 구현·검증 완료. 정본은
[단계 1 작업 계약](./stage-1-contract.md)과
[조작형 계약 화면](../../content-audit/2026-09-02-flowme-integrated-poc-stage-1-contract-ko.html)이다.

### 기획

- source-owned, authoring-owned, personal-owned, execution-owned 값을 필드 단위로 나눈다.
- `inherit`, `fixed`, `unscheduled` 날짜와 원래 날짜 복구 의미를 고정한다.
- unknown property, nested checklist, recurrence/time의 지원·차단·보류 기준을 정한다.
- Plan draft, Item draft, 최종 apply, Undo snapshot의 사용자 의미를 정의한다.

### UX/디자인

- 원문 읽기 전용 block과 개인 편집 block을 시각·접근성상 분리한다.
- 저장 전 영향 요약, 저장 중, 성공, 같은 위치, 실패, 재시도, Undo receipt 상태를
  설계한다.
- dirty 취소와 browser Back에서 유지·버리기 선택, focus 복귀를 설계한다.

### 개발 설계

- `savedCopyId + flowId + itemId` identity와 중복 검출을 순수 함수로 둔다.
- SourceRow→Item→Step adapter와 unknown/loss manifest를 둔다.
- 모든 action을 `intent -> resolve -> transition -> persist -> receipt`로 통일한다.
- Item edit는 부모 Plan draft만 바꾸고 최종 apply가 PoC namespace의 원자 snapshot을
  갱신하게 한다.
- state와 draft 중 두 번째 write/remove가 실패해도 이전 bytes를 복구한다.

### 구현

- A1 read model·parser·loss-preservation부터 구현한다.
- A3 transition·draft·apply·dirty guard를 UI와 분리해 구현한다.
- A4 receipt model과 retry intent를 추가한다.
- 기존 Flow writer 대신 PoC shadow adapter만 사용한다.

### 검증

- identity collision, 네 origin, malformed payload, unsupported origin 테스트
- unknown property·원문 byte 보존, source reorder 분리 테스트
- staged apply 1회, cancel/stale/failure write 0, late failure rollback 테스트
- Undo/reload/corrupt payload fail-closed 테스트
- 허용 prefix 밖 write/remove/clear 0 audit

### Exit gate

- UI 없이도 동일 intent가 결정적 next state와 receipt를 만든다.
- silent data loss와 partial save가 0이다.
- operating key/value sentinel이 격리 fixture에서 byte-identical이다.
- A1·A3·A4 관련 requirement/subcheck 판정이 fresh 모델 증거로 갱신됐다.

## 5. 단계 2 — 작성·탐색 UX 연결

**대상:** `A2`, `A6`, `A7`

**목표:** 기존 Flow 찾기와 새 텍스트 작성이 한 제품 문법 안에서 시작되고, 작성 틀과
구조 검토가 일반 작성을 방해하지 않게 한다.

### 기획

- 한 입력의 filter, URL lookup, memo draft 분기와 실패 fallback을 정의한다.
- single-child Map과 multi-child Map의 사용자 표현을 정의한다.
- authoring 기본 여정을 `입력 -> 결과`로 두고 구조 검토를 선택형으로 정의한다.
- template insertion, contextual helper, ghost example의 역할을 서로 구분한다.

### UX/디자인

- mobile 390, short landscape, 1024, 1440에서 entry→authoring→result wireflow를 만든다.
- 현재 줄만 raw, 나머지 rendered인 한 editor 흐름과 안정적 textarea fallback을
  설계한다.
- 현재 빈 줄·Item에만 나타나는 작은 `+`와 hierarchy menu를 설계한다.
- ghost example은 실제 값과 구분되며 입력·선택·낭독을 가로막지 않게 한다.
- 불필요한 PlatformNav·header·status·3-step 설명 높이를 줄인다.

### 개발 설계

- one source of truth와 pure text/Flow view adapter를 분리한다.
- current line, caret, selection, scroll, composition 상태를 보존한다.
- template transaction은 empty/fingerprint/non-composing guard를 통과할 때만 1회
  삽입한다.
- Map child selection은 Text reset·detail close·focus return을 하나의 transition으로
  처리한다.

### 구현

- A2 통합 entry와 origin/Map 선택을 연결한다.
- A6 입력→결과 기본, optional structure drawer, contextual helper를 연결한다.
- A7 scaffold insertion, caret, native Undo/Redo, ghost overlay를 연결한다.
- standalone은 A0에서 정한 parity 범위까지만 같은 transition을 재사용한다.

### 검증

- query/URL/memo 분기, 네 origin duplicate 0, Map child reset E2E
- normal document가 구조 화면을 거치지 않고 결과에 도달하는 시나리오
- IME Enter, stale fingerprint, double apply, picker cancel write 0
- scaffold 1회, 첫 빈 값 caret, Ctrl/Cmd+Z·Redo byte parity
- ghost의 source/clipboard/selection/history 영향 0
- 320/375/390/844 landscape/200% keyboard·scroll 진단

### Exit gate

- 사용자가 기존 Flow 또는 일반 텍스트에서 막힘 없이 결과에 도달한다.
- 구조 검토는 선택형이고 source bytes는 손실되지 않는다.
- 작성 틀과 ghost가 source나 undo history를 오염시키지 않는다.
- A2·A6·A7 gap이 구현·검증 또는 승인된 의도적 변경으로 재판정됐다.

## 6. 단계 3 — 공통 편집·저장·결과 projection

**대상:** `A3`, `A4`, `A5`, 조건부 `A11`

**목표:** Flow/Item을 조정해 저장하고 Text·Todo·Calendar에서 같은 결과를 확인한 뒤
다시 열 수 있게 한다.

### 기획

- Plan과 Item 편집의 진입점, apply 단위, dirty 이탈, duplicate copy 충돌을 정의한다.
- effective Text, 전체 Todo, Calendar grid, selected-day detail, 정리된 TXT의 역할을
  정의한다.
- base date, result view, execution placement를 서로 독립된 상태로 정의한다.
- A0가 creator lane을 선택한 경우 CreatorDraft 저장·검색·복제·보관·재진입을 정의한다.

### UX/디자인

- selected Plan, 실행 상세, Calendar, Quick Item이 같은 Item editor 문법을 쓰게 한다.
- source read-only 정보와 personal title·memo·date를 한 sheet에서 명확히 구분한다.
- Text/Todo/Calendar selector와 기준일 control, 저장 영향 summary를 설계한다.
- 완료·다시 열기·Undo가 모든 projection에서 같은 상태 문구를 쓰게 한다.

### 개발 설계

- 모든 opener가 같은 edit intent와 transition을 사용한다.
- result view state는 저장되는 execution date와 분리한다.
- Calendar·Todo·Text는 같은 effective ref를 읽고 별도 canonical store를 만들지 않는다.
- 실제 `/calendar`와 운영 completion owner는 A0 승인 없이는 연결하지 않는다.
- CreatorDraft를 채택해도 write는 PoC prefix 안에 둔다.

### 구현

- common Plan/Item editor와 staged apply를 UI에 연결한다.
- title·memo·date·지원 property의 shadow edit를 연결한다.
- effective Text 기본, 전체 Todo, month grid·selected day, TXT projection을 연결한다.
- receipt형 저장·실패·retry·Undo UI를 연결한다.
- 조건이 열린 경우에만 A11 관리 surface를 구현한다.

### 검증

- 네 origin에서 같은 필드 순서와 transition 결과 비교
- Item apply 전 persistent state 불변, Plan apply 1회 write
- dirty cancel/Escape/Back, opener focus·scroll 복귀
- Text→Todo→Calendar ref/date/completion parity
- Today complete→detail/Calendar 확인→reopen
- reload 뒤 last successful state 복구와 corrupt fail-closed

### Exit gate

- 기존 Flow와 새 작성 Flow가 같은 edit·projection 문법을 사용한다.
- source schedule/ownership은 개인 날짜 이동으로 바뀌지 않는다.
- actual `/calendar` 또는 operating writer가 미승인이라면 해당 요구가 완료로 과장되지
  않고 결정 필요 또는 보류로 남는다.
- A3·A4·A5·A11 판정이 증거와 일치한다.

### 현재 Stage 3 종료 증거

- Chromium runtime 13/13 PASS
- workspace·result·Plan·Item 4개 상태를 6개 viewport에서 남긴 PNG 24개
- 허용 prefix 밖 `setItem` 0, `removeItem` 0, `clear` 0
- 격리 operating snapshot의 시나리오 전후 key/value bytes 동일
- 실제 Android/iOS·screen reader·실제 200% text zoom·관찰 사용자는 미실행

이 수치는 Stage 3의 fresh 종료 증거다. Stage 4와 전체 회귀의 확정값은 아래에 분리했고,
최종 보고서의 실행 묶음·게시 상태는 단계 6에서 마감했다.

## 7. 단계 4 — v4.1 실행 조작·반응형 완성

**대상:** `A8`, `A9`

**목표:** v4.1의 이동 문법과 통합 shell을 모바일·가로·desktop에서 실제로 조작할 수
있게 완성한다.

### 기획

- 목적지 이동과 같은 목록 재정렬, 현재 위치, invalid target의 의미는 A8에서 고정했다.
- 36~72px edge zone과 reduced-motion 속도, 월간 날짜별 Quick add, 맨 위·맨 아래
  이동 범위를 고정했다.
- A0 shell 결정을 viewport별 header·navigation·primary CTA 규칙으로 바꾼다.

### UX/디자인

- React에서 왼쪽 목적지와 오른쪽 원 목록 reorder corridor를 동시에 보이게 했다.
- before/after 3px insertion line, invalid/valid target, cancel/result 피드백을 글과 선으로
  제공하며 활성 live owner를 하나로 정리했다.
- 전용 48px handle, 본문 scroll, non-modal move panel, keyboard alternative를 유지한다.
- safe area 4방향, skip link, short landscape, 1024 two-pane, 1280+ inspector를 맞춘다.

### 개발 설계

- drag, long press, short press, menu, keyboard는 같은 move transition으로 수렴한다.
- 맨 위·위·아래·맨 아래도 기존 위치 resolver와 `reorder` transition만 사용한다.
- 350ms timer, 8px threshold, suppress-click, pointer capture cleanup을 명시했다.
- edge auto-scroll과 offscreen date drop도 기존 `move-date` transition으로 끝난다.
- resize, blur, pointer cancel, Escape, fast scroll은 session cleanup만 하고 write하지
  않는다. active pointer 중 trusted mouse wheel 연속 시나리오도 이 계약을 통과했다.

### 구현

- 1·2차 safe batch 완료분을 보존하고 trace 판정을 갱신했다.
- 오른쪽 reorder target, insertion line, edge auto-scroll, Chromium synthetic pointer
  date drop을 보완했다. 내부 순서 target은 click·keyboard 대안이고 drag는 오른쪽 원
  목록 corridor를 사용한다.
- 맨 위·위·아래·맨 아래 이동을 React와 standalone에 복원하고 같은 `reorder`
  transition으로 연결했다. 경계의 같은 위치는 disabled/no-write다.
- 월간 점유 날짜와 펼친 28개 빈 날짜를 세로 section으로 만들고 날짜별 QuickItem
  진입을 연결했다.
- pointer cancel은 ghost·강조·상태·RAF를 정리하고 write 0으로 끝나게 했다.
- 실제 touch drag-to-date의 기기 증거는 남았다.
- standalone은 midpoint·삽입선·window edge-scroll의 task reorder·Undo까지 맞췄다.
  좌측 destination과 정확한 화면 밖 날짜 parity는 A0 역할 결정 뒤 보완한다.
- 월간 날짜별 추가와 짧은 가로 내부 scroll을 적용했다. token, header, CTA hierarchy와
  나머지 접근성 navigation은 A0 결정과 실기 검증 뒤 적용한다.

### 검증

- Chromium pointer/mouse long-press, no-movement release, 8px cancel 후 synthesized click 0
- body swipe는 scroll만, handle은 move만 수행
- right corridor reorder와 3px 선, synthetic pointer date, React offscreen date
  auto-scroll+Undo
- same target neutral·success 0, cancel 원인별 storage mutation 0. active pointer 중
  `isTrusted=true` wheel과 실제 scrollY 증가도 write 0
- menu/Enter/Space/arrow/Escape와 focus return
- 맨 위·위·아래·맨 아래의 최종 순서와 transition 동등성
- 844×390 월간에서 정확히 28개 빈 날짜, 점유·빈 날짜별 QuickItem 생성,
  move dialog/panel 내부 scroll, reload 뒤 compact Undo
- 강제 safe-area bounding box
- 390×844, 375×812, 844×390, 1024×768, 1440×900의 overflow·error·가림 0

### Exit gate

- 입력 modality별 결과 state와 receipt가 동일하다.
- 모든 cancel 경로 뒤 DOM overlay/class와 storage mutation이 0이다.
- 필수 다섯 viewport와 키보드 비드래그 경로가 통과한다.
- V41 원 화면과 차이가 남으면 승인된 의도적 변경으로 기록된다.

### 현재 A8/A9 결과와 남은 외부 검증

이전 safe batch 수치는 단계별 이력으로 보존한다. 이후 Stage 4 정본 Chromium 4/4,
PoC focused model/component 253/253, 전체 `npm test` 1,738/1,738, production build
18/18이 fresh PASS했다.

- `V41-019,020,043,067`은 새로 충족, `V41-008,058,066`은 부분을 유지한다.
- A8 핵심 4건 반복은 8/8, 관련 6건 별도 반복은 12/12를 통과했다. A9 변경 뒤
  통합 PoC 76/76, standalone 30/30, 전체 npm 1,561/1,561, build 18개 route,
  관련 7-suite browser 37/37이다.
- 다섯 필수 viewport의 overflow·console error·page error·covered action은 0이다.
- A9에서 `V41-028,065,070`을 충족으로 올렸다. 전체 열린 primary gap은 81개,
  V41 열린 gap은 13개다. `V41-066`은 자동 pointer cancel cleanup이 닫혔어도 실제
  Android/iOS touch 증거가 없어 부모 판정을 부분으로 유지한다.
- A9 targeted 결과는 PoC 76/76, standalone 30/30, React+standalone 브라우저
  27/27이다. standalone 844×390 핵심 시나리오는 3회 반복해 3/3, React
  844×300 화면 밖 DATE drop·Undo는 10회 반복해 10/10을 통과했다.
- standalone의 좌측 destination parity와 offscreen DATE parity, 실제 기기 touch,
  200% 확대, screen reader는 남았다. React의 exact offscreen DATE는 통과했으며 자동
  pointer·wheel은 실제 기기 증거가 아니다.
- D1·D2와 bridge 판정은 A9로 올리지 않았다.

## 8. 단계 5 — P1 고급 fidelity 보존·보류 경계

**대상:** `A10`

**목표:** 승인되지 않은 고급 기능을 추정 구현하지 않고 원문·lineage·loss 경계를
보존한다.

### 기획

- A0-5에 따라 recurrence runtime·occurrence 이동, public S3·공개 후보·version update,
  table/source 양방향 update를 후속 보류 또는 제외로 유지한다.
- QuickItem→Flow와 장기 CreatorDraft 관리도 새 identity·권한 owner 승인 전까지 보류한다.
- 각 후보의 다시 여는 조건은 `stage-5-contract.md`에 기록한다.

### UX/디자인

- 지원 가능한 좁은 root checkbox near-miss만 명시 correction 후보로 두고 자동 수정은
  하지 않는다.
- 보류한 Quick→Flow·public·table/source action은 화면에 지원 기능처럼 노출하지 않는다.
- unsupported material은 보존한 원문·lineage·loss field 또는 commit 차단으로 드러낸다.

### 개발 설계

- exact `rawText`, line byte range, source lineage, fidelity manifest를 보존한다.
- stale/tampered manifest, unknown field, unsupported grammar는 fail-closed한다.
- 보류 기능의 provider adapter·identity·writer와 후보 checkout 코드는 승인 전에 추가하지
  않는다.

### 구현

- 이번 단계에서 새로 승인된 P1 기능 slice는 0개다.
- 지원하지 않는 grammar는 loss manifest, exact raw fallback 또는 commit 차단으로 남긴다.
- P0 parser/store schema, public writer, source row mutation을 확장하지 않는다.

### 검증

- recurrence/time/timezone과 unknown·nested material의 preserved-but-blocked 경계
- Markdown·TSV·보수적 CSV block 인식과 prose 오인식 방지
- stale/tampered·blocked·unconfirmed·collision 경로의 state mutation 0
- public writer·source row mutation·가짜 occurrence identity 0

### Exit gate

- 미채택 P1 후보는 보류·제외 근거와 다시 여는 조건을 가진다.
- 보류 기능을 지원하는 것처럼 노출하거나 충족으로 올리지 않는다.
- P0 focused 253/253과 전체 `npm test` 1,738/1,738로 회귀를 확인했다. 최종 보고서에는
  이 자동 증거와 미실행 외부 증거를 분리한다.

## 9. 단계 6 — 최종 검증·평가·보고

**대상:** `A12` 및 모든 패키지의 exit evidence

**목표:** 구현, 자동 QA, 브라우저, 실제 기기, 관찰 사용자, publish 상태를 분리해
최종 판정한다.

### 기획

- 필수 통합 시나리오와 requirement/subcheck denominator를 고정한다.
- 자동·실기·사용자 증거의 수행자, 환경, 성공 조건을 분리한다.
- 남은 결정 필요와 의도적 제외를 결함 수에서 따로 표시한다.

### UX/디자인

- 원 산출물 화면과 현재 화면의 before/after를 같은 viewport·상태로 비교한다.
- 발견 가능성, 정보 위계, 오류 회복, 핵심 행동 가림을 화면별로 평가한다.
- 실제 기기와 관찰 사용자용 과업 문구는 기능 이름을 가르쳐 주지 않게 작성한다.

### 개발 설계

- verification manifest에 명령, 실행 시각, test 수, viewport, storage audit를 기록한다.
- fixed-seed 5,000회와 deterministic scenario를 재현 가능하게 둔다.
- actual browser profile·backend 미검사를 명시하는 evidence scope를 유지한다.

### 구현

- 검증에서 발견한 P0 회귀만 해당 패키지로 되돌려 수정한다.
- 새로운 제품 기능을 QA 단계에서 추가하지 않는다.
- traceability JSON·HTML과 최종 보고서를 실제 증거로 갱신한다.

### 검증

1. targeted model/store/transition tests
2. 관련 component tests
3. `npm.cmd run test:personal-workspace-poc`
4. standalone model tests
5. `npm.cmd test`
6. `npm.cmd run build`
7. 관련 Playwright suites
8. `npm.cmd run docs:check`
9. `git diff --check`
10. 필수 다섯 viewport browser inspection
11. Android Chrome 실제 기기
12. iOS Safari 실제 기기
13. screen reader·OS 글자 확대·browser 확대
14. 관찰 사용자 세 과업

### 최종 내부 증거

- PoC model/component 253/253, 전체 `npm test` 1,738/1,738, build 18/18
- React runtime 6개 suite 48/48: Stage 1 4, Stage 2 11, 통합 3, v4.1 core 13,
  Stage 3 13, Stage 4 4
- standalone model 33/33, standalone browser 14/14, 보고서 browser 4/4
- 문서 16개와 로컬 링크 4,588/4,588, tracked diff whitespace PASS
- 허용 prefix 밖 write/remove 0, `clear` 0, 격리 operating bytes 변화 0
- 실제 Android Chrome·iOS Safari·보조기술은 미실행, 관찰 사용자 0명
- commit·push·PR·Preview·Production은 모두 미진행

<!-- FINAL_TEST_COUNTS: poc-model-component=253/253; full=1738/1738 across
177+455+253+633+201+19; build=18/18; react-browser=48/48 across
stage1=4,stage2=11,integration=3,v41-core=13,stage3=13,stage4=4;
standalone-model=33/33; standalone-browser=14/14; report-browser=4/4;
docs=16 required files and 4588/4588 local links; tracked-diff-check=PASS. -->

### Exit gate

- primary 168, bridge 86, compound 77, subcheck 386 denominator가 유지된다.
- 모든 gap이 충족, 의도적 변경, 제외, 결정 필요 중 근거 있는 최종 판정을 가진다.
- 허용 prefix 밖 write/remove/clear 0과 operating sentinel byte parity가 통과한다.
- 브라우저 overflow·console error·page error·covered action이 0이다.
- Android/iOS/보조기술/관찰 사용자의 실행 여부와 수치가 사실대로 적혀 있다.
- commit, push, PR, Preview, Production이 각각 실제 상태로 보고된다.

## 10. 단계별 결과 기록 형식

각 단계가 끝날 때 다음을 남긴다.

| 필드 | 기록 내용 |
| --- | --- |
| 대상 요구 | 단계 시작 denominator와 ID |
| 기획 결정 | 확정·PoC 임시·의도적 변경·보류 |
| UX 변경 | 원 화면, 변경 화면, 이유 |
| 개발 설계 | owner, transition, store, rollback |
| 구현 | 변경 파일과 도달 가능한 사용자 행동 |
| 자동 검증 | 명령, 실제 test 수, pass/fail |
| 브라우저 | viewport, action, overflow/error |
| 외부 증거 | Android, iOS, 보조기술, 관찰 사용자 |
| 운영 불변 | prefix audit와 byte parity의 범위 |
| 게시 상태 | commit/push/PR/Preview/Production |
| 잔여 | 결함, 결정 필요, 재검토 trigger |

## 11. 위험 통제

- 초기 98개, 현재 79개 열린 primary gap을 한 번에 구현하지 않고 단계 exit gate로
  scope를 제한한다.
- A0에서 제외한 operating writer, storage migration, 영구 token을 건드리지 않는다.
- A6 live editor와 A10 advanced adapter는 source bytes 보존과 fallback을 먼저 만든다.
- A5 Calendar parity는 별도 store를 만들지 않고 같은 effective Item을 사용한다.
- React와 standalone의 이중 구현은 A0에서 정한 parity 범위만 유지한다.
- 실제 기기나 관찰 사용자 확보가 늦어져도 자동 QA를 그 증거로 대체하지 않는다.
- 원본 dirty repo와 현재 worktree의 미소유 변경을 stage·정리·덮어쓰지 않는다.
- 별도 승인 없는 commit·push·PR·deploy를 실행하지 않는다.
