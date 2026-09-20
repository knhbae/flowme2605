# P3-K 이후 갭 처리 실행 계획

- 작성일: 2026-09-05
- 상태: `후속 구현 계획 · 아직 실행하지 않음`
- 입력: [개선 설계](improvement-design.md), [v4.1](v41-audit.json)·[개발1](d1-audit.json)·[개발2](d2-audit.json)·[통합](bp-audit.json) 현재 감사 원장.
- 원칙: 세 산출물을 모두 추적하되 하나의 목표에 모든 갭을 넣지 않는다. 오류가 생기는 같은 소유 영역·상태 전이를 한 묶음으로 처리한다. 각 묶음 안에서 기획부터 UX/UI·개발·검증까지 끝낸다.

## 1. 권장 순서와 묶는 이유

| 순서 | 묶음 | 해결할 핵심 | 근거 | 선행 조건 |
|---|---|---|---|---|
| 1 | K1-A 원문 도움 안전 | stale 항목 오적용, 보관 실패 후 원문/복구 불일치, IME 후보 검증 | `P3K-D2-01,03,04`, `K-X1`, `K-X3` | 감사 완료. 원본 계약 안에서 구현 가능 |
| 2 | K2-A 새 개인 Flow 완료 초기값 | 원문 체크가 개인 완료로 변하는 standalone handoff | `P3K-BP-03`, `BP-039`, `K-X4` | K1-A와 코드 충돌 조정. 기존 payload 불변 설계 |
| 3 | K1-B dirty 닫기 | standalone Plan/Item 취소·Escape·Back의 확인·범위 보존 | `K-D1-01`, `K-J7-standalone-dirty` | 현재 Stage 3 close 계약 재사용 |
| 4 | K2-B 기간과 날짜별 순서 | Today 지난 미완료, 월~일 주간, 같은 날짜의 view 왕복 순서 | `P3K-V41-01,02` | 구버전 view-order의 비파괴 호환 설계 통과 |
| 5 | K2-C 이동 후 Undo 발견성 | 모바일에서 이동/완료 직후 설정 밖 복구, 날짜 반복 정리 | `P3K-V41-03,05` | 현재 receipt/Undo owner와 K2-B list context 확인 |
| 6 | K3-A Authoring 원본 UX | 한 편집기·현재 행 도움·네 그룹·틀/예시/기술 정보 구분 | `P3K-D2-02,05,06` | K1-A 안전한 source transaction |
| 7 | K3-B 개인 계획 편집 동등성 | standalone 날짜 3상태·개인 구간/순서·구조화 Plan 영수증 | `K-D1-02,06` | K1-B 닫기와 기존 pure Plan 계약 |
| 8 | K3-C 선택·첫 실행·로컬 화면 | 출처 보고 선택, preview owner, 합성 후보 진입 분리, 로컬 token/중복 entry | `K-D1-04,07,08,10`, `P3K-V41-04`, `P3K-BP-01` | K2-A 완료 초기값, K3-B receipt와 겹치는 파일 조정 |
| 별도 | K4 미정 필드·근거 설계 | Plan anchor, 포함/제외, WorkingSource 날짜순, trace 모순 | `K-D1-03,05,09`, `P3K-D2-07,08`, `P3K-BP-02` | 구현 전 owner/capability/버전 gate. 안전한 조사·설계는 앞 단계와 병행 가능 |

K1-A와 K2-A는 현재 재현된 잘못된 대상/완료 상태 문제를 먼저 막는 단계다. K1-A 한 목표에 K1-B~K4를 모두 넣지 않는다. 서로 다른 저장 lane이나 구버전 변환이 추가되면 묶음을 더 나눈다. 공통 standalone `app.js`를 여러 작업이 동시에 편집하지 않는다. 독립 원본 조사·테스트 설계만 병렬화한다.

K3-C가 커지면 `출처/preview`, `합성 후보 진입`, `로컬 token·중복 entry` 세 번의 목표로 나눈다. UI와 반응형 검증은 각 하위 목표에서 함께 한다. 운영 데이터나 새 제품 정책이 필요한 부분은 K4로 분리해도 나머지 구현을 계속할 수 있다.

## 2. 모든 묶음의 공통 진행 단계

| 단계 | 실제 작업 | 남길 결과 | 통과 기준 |
|---|---|---|---|
| 기획 | 요구 ID·원본 화면·후속 결정·현재 실패와 제외 범위 고정 | 범위표, 실패를 재현하는 사용자 과업 | 원래 기능을 제거해 숫자만 올리는 안이 없음 |
| UX/디자인 | 정상/빈/긴 내용/같은 내용/취소/실패/재시도·초점·모바일 배치 | 원본→현재→개선 상태표와 실제 검토 가능한 UI 변경안 | 주 행동·결과·복귀가 설명 없이 조작 가능하도록 구체화 |
| 개발 설계 | source/personal/execution/draft/receipt owner, version, adapter, 원자성·호환 | 순수 transition 입력·출력, 금지 write, 실패/legacy 표 | 승인 없는 새 owner·운영 schema·추정 migration 없음 |
| 개발 | 안전한 공유 모델부터 양쪽 surface 연결, 필요한 focused 회귀 추가 | 소유 파일 목록, 변경 코드와 테스트 | 기존 미소유 수정 보존, exact-query 안의 최소 변경 |
| 검증 | 관련 모델/저장/기존 회귀, 양쪽 브라우저, 다섯 viewport, 전체 시험/build | 실행 명령·실제 개수·PASS/FAIL/NOT_RUN·운영 bytes 비교 | 재현 실패 해결, 새 회귀 없음. 실패는 숨기지 않음 |
| 평가·인계 | 각 requirement의 기능/UX/UI/증거를 새 실행 근거로 갱신 | 변경 전후 비교·남은 한계·다음 작은 목표 | 역사 판정 보존, 실제 기기/사용자/배포와 구분 |

아래에 적은 신규 테스트와 test case는 모두 미래 작업이다. 이번 P3-K에서 이미 생성·실행한 것으로 보고하지 않는다. 각 후속 목표 승인 범위 안에서 기존 테스트 파일을 확장하거나 새 focused 파일을 만들고, 첫 실행 전에 실제 테스트 inventory를 고정한다.

## 3. K1-A — 원문 도움의 정확한 대상과 실패 복구

### 기획·UX/디자인

- J3/J7, `P3K-D2-01,03,04`만 우선 대상으로 둔다. 최초 화면은 기존 Authoring 입력 화면이고 새 편집기는 만들지 않는다.
- [개선 설계 §3](improvement-design.md#3-먼저-고칠-편집-안전성)의 S3-P/S3-F 상태표를 구현 계약으로 좁힌다.
- 대상 제목 + 속성명, stale 재선택, 입력값을 남긴 재시도, 실패 후 정확 원문 복귀를 디자인한다. 네 그룹 chooser 재배치는 K3-A로 남긴다.
- compositing/IME Enter는 먼저 재현한다. code 후보가 실제 실패가 아니면 테스트 근거와 미실행 범위를 남기고 기능 수정 완료로 세지 않는다.

### 개발 설계

- 도움 open 시점 ticket과 current source를 분리한다. source mutation 뒤 apply-time fingerprint로 ticket을 새로 만들지 않는다.
- helper 적용 결과가 `success/failed/recovery-required/stale/noop/canceled`로 끝까지 전달되도록 설계한다. 성공 toast는 durable readback 이후 한 owner만 낸다.
- native source transaction·draft persist·실패 rollback·selection/scroll·native Undo/Redo를 같이 명세한다. 기존 틀/예시 rollback 경로를 재사용할 수 있는지 확인한다.
- 실패 후 입력값은 도움의 임시 상태에만 보존한다. 다른 Flow나 다른 문서에 값이 따라가지 않는다.

### 개발 대상 후보

- `PersonalWorkspacePocAuthoringSurface.tsx`, 기존 native source editor 연결부, `personal-workspace-poc-authoring-properties.ts`.
- standalone `app.js`의 helper apply 및 draft 보관 호출부. 공유 모델 적용 범위가 필요할 때만 `model.js`를 수정한다.
- 실제 변경 경로는 재현 뒤 확정한다. 이 목록 전체를 수정하라는 지시가 아니다.

### 검증·완료 조건

1. React `K-X1`의 UI 키보드 재현을 회귀로 고정한다. 앞에 다른 Item 삽입, 동일 제목 Item, owner 삭제, 문서 교체에서 잘못된 적용 0.
2. 양쪽 `K-X3`의 exact draft key QuotaError를 재현하고, 실패 시 원문/durable bytes가 직전 성공 상태와 일치하며 재시도 입력값이 남는지 검사한다. 오류가 일반 반영 toast에 덮이지 않는다.
3. readback 실패/rollback 실패는 별도 recovery 결과이며 성공 표시 0. source stale·취소·Escape·composing Enter는 mutation 0.
4. 일반 Enter·적용 버튼·한 번 Undo/Redo·reload 성공 경로를 양쪽 검사한다. 합성 IME와 실제 IME 증거를 분리한다.
5. 다섯 viewport에서 긴 대상 제목, 긴 링크/장소 입력, 오류문, helper 내부 스크롤·caret·취소/재시도·초점 복귀를 확인한다.
6. 관련 authoring properties/model/storage 회귀와 Stage 2/standalone/P3-C의 source 불변 회귀를 실행한다. `npm test`, production build 결과와 실제 실행 개수를 별도 기록한다.

다음으로 K2-A를 진행한다. 이 단계가 끝났다고 D2 전체 편집 UX나 전수 요구가 충족됐다고 보고하지 않는다.

## 4. K2-A — 신규 handoff 완료 초기값

### 기획·UX/디자인

- J4/J6, `BP-039`, `P3K-BP-03`에 한정한다. 같은 `[x]`/`[ ]` 원문을 두 runtime에서 저장한 뒤 보이는 첫 상태를 기준으로 한다.
- 원문 보기에는 원래 체크를, 개인 실행에는 미완료를 보여 준다. 이를 설명하려고 모든 행에 기술 경고를 추가하지 않는다. 원문/개인 실행 구획이 의미를 전달하게 한다.

### 개발 설계·개발

- 신규 handoff mapping에서 sourceChecked와 ExecutionRun 초기 상태를 분리한다. 원문 exact bytes·lineage·identity를 유지한다.
- 기존 `done` payload를 자동 normalize하거나 사용자 완료를 지우지 않는다. 기존 버전 decode/read/Undo는 회귀로 보존한다.
- fixture-only 기존 완료 샘플과 신규 handoff 함수는 다른 의도임을 계약에 적는다. 필요할 때만 PoC version marker를 설계하되 운영 schema는 건드리지 않는다.
- standalone handoff adapter와 React 비교 fixture, 결과/진행률 presenter의 source-vs-execution 읽기를 점검한다.

### 검증·완료 조건

- `[x]`, `[ ]`, 같은 제목 여러 Item의 명시 저장 직후 개인 완료는 미완료이며 두 runtime의 count/pressed/Todo/Text effective 결과가 같다. 원문 표식은 exact 보존된다.
- 완료 → 다시 열기 → Undo → reload가 원문 표식을 바꾸지 않는다. 다른 사본/운영 `flow:*` bytes는 동일하다.
- 기존 사용자 완료가 있는 payload fixture를 열고 저장하지 않는 경우 exact bytes 불변. 새 handoff 이후에도 기존 완료 불변.
- 다섯 viewport에서 영수증·첫 실행·원문 보기 구별과 좁은 화면 count/행 가림을 확인한다. 관련 handoff/loss/source lineage 회귀, 전체 시험/build를 분리 보고한다.

## 5. K1-B — standalone dirty 닫기

### 기획·UX/디자인

- J6/J7, `K-D1-01`. clean에는 확인을 추가하지 않고 dirty에만 같은 버리기 확인을 적용한다.
- Plan 취소와 Item 취소의 손실 범위를 문구로 구분한다. 첫 focus는 `계속 편집`이고 Escape는 최상위 확인 상태만 처리한다.

### 개발 설계·개발

- `clean/dirty/submitting/recovery` 공통 close intent를 만들어 취소·닫기·Escape·backdrop·Back이 우회하지 못하게 한다.
- 부모 Plan draft와 자식 Item draft snapshot, opener·selection·scroll을 분리한다. Item discard가 부모 변경까지 없애지 않게 한다.
- React의 기존 Stage 3 계약을 정본으로 삼되 코드 복제보다 pure close-state adapter를 우선 검토한다.

### 검증·완료 조건

- title/memo/date dirty 각각에서 닫기 경로·계속 편집·버리기, clean 즉시 닫기, submitting/recovery 우회를 검사한다.
- Item `계획에 반영`은 storage 0, Item discard는 해당 draft만, Plan discard는 전체 staged 범위만 제거한다.
- 다섯 viewport에서 짧은 가로 dialog의 확인/취소 가림, 초점 trap/복귀, 모바일 Back을 자동 브라우저 가능 범위에서 검사한다. 실제 모바일 OS Back 경험으로 표현하지 않는다.
- Stage 3·standalone 관련 회귀, 전체 시험/build 결과를 따로 보고한다.

## 6. K2-B — 기간 계산·날짜별 순서 동등성

### 기획·UX/디자인

- J5, `P3K-V41-01,02`. 원본 월~일·Today 지난 미완료·날짜 context 정렬을 그대로 복구한다.
- 날짜 heading, 지난 미완료 구획, 직접 정렬 표시와 해당 목록의 시간순 복귀를 같은 의미로 설계한다. 날짜가 바뀌는 동작과 순서만 바꾸는 동작을 분리한다.

### 개발 설계·개발

- 기준일을 주입할 수 있는 공통 selector와 date/undated/overdue list-context adapter를 만든다. React의 확인된 의미를 바꾸지 않는다.
- standalone view string 기반 order를 새 문맥에 연결하기 전에 기존 payload 호환안을 검증한다. 서로 모순되는 view별 순서를 임의로 합치지 않는다.
- read-only로 보존 가능한 구버전은 유지하고, 안전한 새 version write/충돌 fail-closed를 설계한다. 기존 key 전부 삭제나 전체 초기화는 금지한다.
- 메뉴/drag/길게 누르기/키보드/시간순 복귀가 동일 context와 transition을 사용하도록 surface를 연결한다.

### 검증·완료 조건

- 화/일/월, 월말/연말 기준일: 전날 미완료/완료, 이번 주 양 끝, 다음 주 시작, 미정의 ref 집합을 두 runtime에서 비교한다. 현재 read-only 모델 probe 3건을 미래 전수 테스트 수로 세지 않는다.
- 같은 날짜 today→week→month→today/reload 순서 동등성, 다른 날짜·개인 Plan 순서·시간·완료·메모 불변을 검사한다.
- 직접 정렬→시간순 복귀는 해당 context만, noop·취소·pointercancel·Escape는 mutation 0, Undo는 exact 순서를 복원한다.
- 다섯 viewport에서 날짜별 그룹, 월간 빈 날짜 펼침/날짜 추가, 재정렬 통로와 왼쪽 목적지 접근을 검사한다.
- 기존 v4.1 move/identity/namespace/runtime 회귀, 전체 시험/build를 실행·분리 보고한다.

## 7. K2-C — 이동 직후 복구와 목록 가독성

### 기획·UX/디자인

- J5/J7, `P3K-V41-03,05`. 설정 Undo 자체를 없애지 않고, 성공한 일반 이동의 결과 옆에 `되돌리기`를 제공한다.
- 날짜 heading과 반복 날짜만 정리한다. 시간·Flow/폴더 경로·원문·오류·접근성 설명은 남긴다.

### 개발 설계·개발

- receipt가 이미 있는 맥락과 일반 workspace 상태 줄의 Undo owner를 나눈다. 마지막 성공 transaction ID와 action을 연결한다.
- success/noop/cancel/failure가 새 Undo 생성·유지에 미치는 영향을 상태표로 고정한다. 중복 live region·늦게 도착한 성공 상태가 오류를 덮는 경로를 막는다.
- 표시된 contextual action만 추가하고 새 Undo storage schema나 무제한 history를 만들지 않는다.

### 검증·완료 조건

- 390/375에서 Today→내일 이동 후 설정을 열지 않고 Undo에 키보드로 도달하여 ref/날짜/순서 복원. 완료 후에도 동일한 복구 발견성을 확인한다.
- 다른 receipt/Plan editor 열린 상태에서 중복 Undo·잘못된 lane Undo가 없고, 실패/noop/cancel은 새 성공/Undo를 만들지 않는다.
- 844×390에서 상태 줄과 마지막 행/이동 패널/초점이 가리지 않는다. 1024/1440에는 같은 의미의 상시 중복 CTA를 추가하지 않는다.
- 관련 receipt/Undo/이동 회귀와 전체 시험/build, 원본 대비 캡처를 함께 보고한다.

## 8. K3-A — Authoring 한 편집기·네 그룹·틀

### 기획·UX/디자인

- J2/J3, `P3K-D2-02,05,06`. 기능 존재와 progressive disclosure 차이를 분리한다. 16 catalog가 없다는 옛 판정으로 재구현하지 않는다.
- 최초 네 그룹 → 선택 그룹 → 인라인 값, 정확 대상 제목, 한 단계 Escape를 설계한다.
- 빈 틀 넣기와 완성 예시 적용의 목적을 구분하고 technical compiler/version은 disclosure로 옮긴다. 기존 6/31/6 자산과 byte 계약을 보존한다.
- standalone의 한 editor·현재 행 도움·모드 표시를 어떤 engine adapter로 만들지 먼저 비교한다. 강제 wizard나 별도 template editor를 만들지 않는다.

### 개발 설계·개발

- K1-A의 source ticket/atomic apply를 모든 도움에 재사용한다. ghost는 presentation-only이며 source/selection/clipboard/undo 밖에 둔다.
- 원본 그룹 mapping과 후속 scoped 결정 표를 만든 뒤, 승인 없는 재분류는 원래 의미로 복구한다.
- 기존 React LiveEditor와 standalone textarea의 undo/selection owner를 유지할 수 있는 최소 adapter부터 구현한다. 편집 엔진 교체가 필요하면 별도 목표로 나누고 현재 engine를 무단 전면 교체하지 않는다.

### 검증·완료 조건

- 네 그룹 초기 노출/선택 그룹만 표시, 전체 16속성 접근, 값/목록/그룹 단계 Escape, native Tab, 종속 입력 검증을 양쪽 검사한다.
- 빈 문서 browse/cancel0write, 비어 있지 않은 원문 적용 차단, explicit 틀 삽입1nativeUndo/Redo, ghost toggle source/selection/scroll/clipboard 불변을 검사한다.
- 기존 corpus/compiled/scaffold exact snapshots와 원문 loss gate 회귀를 실행한다. 기술 정보 숨김이 기능 삭제로 이어지지 않았음을 확인한다.
- 다섯 viewport의 빈/긴/오류 helper, 현재 행 포커스, 입력·결과 왕복, 844가로 내부 스크롤을 확인한다. 관련 Stage 2/P3-C/standalone 회귀와 전체 시험/build를 보고한다.

## 9. K3-B — 개인 계획 필드·영수증 동등성

### 기획·UX/디자인

- J6/J7, `K-D1-02,06`. React의 기존 개인 title/memo/date mode/구간/order capability를 standalone에 맞춘다.
- Item 적용 → 부모 Plan 확인 → 최종 저장의 write 의미와 각 단계 주 행동을 보여 준다. 새 anchor/include 필드는 K4 결정 전 추가하지 않는다.

### 개발 설계·개발

- 기존 pure plan editor와 receipt DTO를 중심으로 adapter를 설계한다. 네 origin과 authored에 실제 없는 capability는 생성하지 않는다.
- 원본 따르기/fixed/unscheduled를 하나의 nullable 날짜로 축약하지 않는다. Plan Item 순서와 TimelineOrder를 분리한다.
- success/noop/cancel/failure/retry/Undo의 before/after·target/affectedCount를 동등하게 만들고 live owner를 하나로 둔다.

### 검증·완료 조건

- 원본과 같은 날짜의 fixed pin, 명시 inherit reset, unscheduled, stable 개인 구간 제목·순서·전체 Item projection을 양쪽에서 비교한다.
- Item apply0write·최종 Plan apply1transaction·같은 내용0·실패 exact rollback·같은 intent retry·Undo·reload·다른 사본 불변을 검사한다.
- 다섯 viewport에서 원본/개인/실행 구획·변경 영향·dirty 확인·오류·영수증의 주 행동과 마지막 필드 접근을 확인한다.
- Stage 3/Plan/receipt/standalone 회귀, 전체 시험/build를 보고한다.

## 10. K3-C — 선택부터 첫 실행까지 자연스럽게 연결

이 묶음은 아래 세 하위 과업이 독립적이다. 하나의 목표가 커지면 각각 진행하고, 모두 끝나기 전에 K3-C 전체 완료로 표시하지 않는다.

### C1 출처 선택·preview owner

- 기획/UX: J1의 검색 전후 출처·safe link·criteria, 원문/내 사본 label·빈 결과·뒤로/선택 유지 설계.
- 개발 설계: 기존 source metadata를 입구 DTO에 전달하고 공유 원문과 effective 개인 preview의 목적을 구분한다. 같은 목적의 기존 presenter/criteria renderer를 재사용한다.
- 개발: 네 origin+authored의 실제 capability만 연결한다. 새로운 URL/criteria/일정 추정 0.
- 검증: source 있는/없는/unsafe URL, 개인 수정→재검색→child 변경→preview→개인공간 왕복의 owner/refs/date 값, lookup/selection0write. 다섯 viewport의 카드·링크·긴 제목·빈 화면·복귀를 검사한다.

### C2 합성 후보의 명시 진입

- 기획/UX: J4 첫 실행을 저장 결과와 실행 목록으로 정리하고, 승인된 P3-D 비교 연습은 사용 안내의 명시 진입에서 접근한다.
- 개발 설계: synthetic fixture 생성과 실제 candidate provenance를 구분한다. 기존 pending/deferred/applied 후보를 삭제하거나 자동 해결하지 않는다.
- 개발: 새 Flow 열기/reload만으로 합성 배너를 생성하지 않게 하되 명시 진입 이후 기존 비교 기능은 유지한다. 외부 fetch/writer 추가 0.
- 검증: 일반/빈 틀 작성→명시 저장→열기/reload에서 합성 알림 없음. 명시 연습의 resolve/apply/stale/cancel/Undo/reload·개인 실행 보존 회귀. 다섯 viewport 탭/미해결/적용/복귀를 검사한다.

### C3 로컬 UI 원본 적합성

- 기획/UX: 화면별 주 행동·보조 행동·기술 disclosure와 token owner를 매칭한다. 글로벌 theme 재선택은 하지 않는다.
- 개발 설계: exact-query 로컬 action/selection/focus 소비자만 승인 teal로 연결하고, 같은 editor를 여는 중복 entry와 기술 기본 문구를 정리한다.
- 개발: 기본 `/my`, 전역 CSS/token, PlatformNav 파일은 변경하지 않는다. source·오류·복구·접근성 안내는 남긴다.
- 검증: global/local computed style을 별도 측정하고 default route 불변, 다섯 viewport의 focus/disabled/danger/가독성·대비·중복 CTA를 확인한다. 주관 시각 평가와 자동 대비/크기 검사를 분리한다.

각 하위 과업에 관련 source/presenter/P3-D/product-shell 회귀와 전체 시험/build 평가를 붙인다. 완료 숫자는 C1/C2/C3의 실제 결과만 합산한다.

## 11. K4 — 필드 계약·대체 결정 정리

### K4-D: 구현 전에 필요한 설계

1. **기획:** D1 기준일·포함 선택·D2 WorkingSource 정렬 원본 과업을 exact 화면/문장에 연결한다. 현재 Calendar 월 탐색을 기준일 구현 증거로 사용하지 않는다.
2. **UX/디자인:** [개선 설계 §8](improvement-design.md#8-설계-gate-지금-추정-구현하지-않을-것)의 4개 날짜 개념, 포함/제외/복원 상태, 같은 Step 날짜순 preview·cancel/Undo를 구체 화면 상태로 그린다.
3. **개발 설계:** capability/owner/field/version/legacy/identity/atomicity 계약과 read-only fixture를 만든다. P3-F의 PersonalOverlay 소유 결정은 재사용하고 구체 membership 의미만 확인한다.
4. **설계 검증:** preview0write, 상대 날짜·fixed·미정·실행일 보존, 제외 복원 후 동일 identity/criteria/완료 보존, source block round-trip을 순수 시뮬레이션으로 확인한다. 이 단계의 코드는 제품 연결이 아닌 검증 harness인지 명시한다.
5. **구현 gate:** 기존 승인으로 결정할 수 있는 범위는 그 근거를 적어 작은 구현 목표로 넘긴다. 의미가 미정인 새 선택만 사용자에게 영향·대안·추천을 요청한다. 운영 writer를 호출해야 하는 안은 범위 밖으로 남긴다.

K4-D의 종료는 설계/결정 패키지 완료이지 기능 구현 완료가 아니다. 다음 K4 구현 묶음은 gate를 통과한 항목별로 별도 목표를 세우고 동일한 기획→UX→설계→개발→검증 절차를 수행한다.

### K4-T: trace 정합성은 매 묶음에서 처리

- 역사 부모·세부 조건 ID와 당시 판정을 보존한다. 새 증거는 현재 감사 계층에 연결한다.
- `D2-035/036`의 catalog/inline, D2 near-miss, D1 부모 충족/부분 capability, BP occurrence·creator drafts·source update의 후속 supersedes 범위를 반영한다.
- `운영 연결 후속`, `현재 PoC 구현`, `원본에서 의도적으로 변경`, `실제 차이`, `과거 사유 미갱신`, `미검사`를 분리한다.
- 기능/UX/UI/증거를 하나의 충족률로 뭉치지 않는다. 중복 finding ID는 유일 ID로 세되 연결된 요구 ID를 잃지 않는다.
- 이번에 테스트하지 않은 기존 조건을 코드가 있다는 이유만으로 새 PASS로 승격하지 않는다. 원본 대화 일부만 읽은 경우 전체 대화 재검토 완료로 쓰지 않는다.

## 12. 후속 구현의 보호·검증·보고 계약

- 시작 때 `AGENTS.md`, `agent.md`, `docs/workflows/session-start.md`와 해당 스킬을 읽고 현재 Git/원본 기준을 확인한다. 기존 격리 worktree의 미소유 dirty·미추적 파일은 보존한다. 작업 소유 변경과 겹치면 안전한 경로를 먼저 찾고, 임의 덮어쓰기·stage·정리를 하지 않는다.
- `/my?personalWorkspacePoc=v1` 및 승인된 Authoring exact-query 안에서만 연결한다. 기본 `/my`, 운영 key/schema/writer·원본 worktree는 변경하지 않는다.
- 테스트는 격리 context/fixture에서 수행한다. prefix 밖 setItem/removeItem/clear 0, non-PoC `flow:*` 전후 byte-for-byte 동일, 잘못된 gate·손상 payload fail-closed를 자동 검증한다.
- focused 모델/identity/storage/transition 시험 → 관련 기존 회귀 → `npm test` → production build → 양쪽 runtime 브라우저·다섯 viewport 순으로 결과를 분리한다. 전체 시험이 실패하면 관련성·원래 존재 여부·남은 영향을 적고 전체 green으로 보고하지 않는다.
- 테스트 case 수, assertion 수, viewport loop 수, 시나리오 수를 서로 대체하지 않는다. 실제 명령의 실행·통과·실패·skip 개수를 남긴다.
- 실제 Android Chrome·iOS Safari·TalkBack/VoiceOver·관찰 사용자 검사는 후속 목표의 필수 대기 조건이 아니다. 실행하지 않으면 각각 `NOT_RUN`, 관찰 사용자 0명이다.
- commit, push, PR, Preview, Production은 별도 요청 전 모두 미실행이다. production build 성공은 배포가 아니다.
- 마지막 보고는 구현 기능 / 변경 파일 / 시나리오별 결과 / 자동 시험 실제 개수 / 화면별 UX·UI 평가 / 실기 여부 / 운영 불변 증거 / 남은 결함·결정 / commit·push·PR·Preview·Production / 관찰 사용자 수를 분리한다.

## 13. 바로 다음 목표 — 붙여 넣기용

```text
목표: P3-K의 K1-A 원문 도움 안전성 갭을 React와 standalone에서 해결한다.
P3-K improvement-design.md §3과 implementation-plan.md §3, 원본 D2/A0 계약을 읽고 현재 격리 worktree·파일 소유 상태를 확인한다.
먼저 K-X1 오래된 항목 오적용과 K-X3 양쪽 draft 보관 실패를 실제 UI로 재현하고, IME Enter 후보는 재현 여부부터 분리한다.
도움을 연 시점의 정확 대상 ticket, source 변경 시 적용 차단/재선택, 원문·보관·rollback 결과 전달과 오류를 덮지 않는 재시도 UX를 설계·구현한다.
일반 입력·취소·Escape·native Tab·한 번 Undo/Redo·reload를 보존하고 새 editor, wizard, 운영 schema나 영구 정책은 만들지 않는다.
focused 모델/저장/transition·관련 기존 회귀·npm test·production build와 두 runtime의 다섯 viewport·키보드·오류/초점 검사를 실행하고 실제 개수를 기록한다.
모든 제품 write는 flow:poc:personal-workspace:v1:*만 허용하며 기본 /my·운영 flow:* bytes·원본·미소유 파일 불변을 자동 검증한다. clear·commit·push·PR·배포는 하지 않는다.
원본 요구→현재 실패→수정→새 증거를 갱신하고 남은 K2-A 이하 갭을 분리 보고한다. 실제 기기/보조기술은 미실행이면 NOT_RUN, 관찰 사용자 0명으로 기록한다.
```
