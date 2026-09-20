# C1-c2 — 실제 개인공간 상세 조작과 검색·작성 복귀

2026-09-06 KST. **구현 전 설계. 신규 제품 변경0, 신규 시험 등록0, 실행0.** C1-c1 React 보호 구현이 마감되기 전에는 이 문서의 구현을 시작하지 않는다. 전체254부모/424원자 요구를 재판정한 문서가 아니다.

정본은 [실행 계획 §10 C1](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md#10-k3-c--선택부터-첫-실행까지-자연스럽게-연결), [C1 설계 §4.3](./k3c-c1-entry-preview-design.md#43-상태와-복귀), [standalone 읽기 계약](./k3c-c1-standalone-entry-contract.md), [C1-c1 후속 범위](./k3c-c1-explicit-authoring-design.md#다음-묶음과-제한)다. 현재 코드를 읽고 기존 시험의 실제 assertion 범위를 대조했다. 과거 QA의 PASS는 해당 실행 당시 증거이며 이번에 재실행한 결과가 아니다.

## 1. 이번에 고정한 판단

1. standalone의 읽기 요약을 **선택한 실제 저장 사본의 기존 Flow 상세 방문**으로 연결한다. 기존 Plan/Item 편집·완료·이동·Undo·저장 복구 기능을 새로 만들지 않는다.
2. 미리보기는 계속 읽기 전용이다. 완료·날짜·개인 편집 writer를 미리보기에 연결하거나 no-op callback으로 가장하지 않는다.
3. **무변경일 때만** 살아 있는 같은 ticket의 exact presentation을 복원한다. 저장 변경·관측 ABA·손상·읽기 실패 뒤에는 기존 ticket을 폐기한다. 이전 packet을 새 binding으로 자동 rebind하지 않는다.
4. 변경 후에는 기존 invalid/재선택 경로를 유지하고, 사용자의 **명시 재조회**가 새 packet을 얻는다. 과거 query·선택·Item 상세·결과/Undo owner를 현재 권한으로 되살리지 않는다. 변경을 다시 Undo했더라도 폐기한 ticket은 복구하지 않는다.
5. React route 왕복은 저장된 작성 A의 exact 원문 복원만 보장한다. route를 넘는 native Undo 보존을 새로 약속하지 않는다. standalone의 작성 A는 기존 연결 textarea와 native history를 유지한다.
6. dirty editor·pending save·실패 입력·prepared/confirmed recovery가 복귀보다 우선한다. 검색으로 돌아간다는 이유로 기존 확인·재시도·복구를 생략하지 않는다.

이 여섯 항목은 이번 설계 요청에서 지정된 범위다. 저장 성공 후 검색어를 따로 자동 복원하는 새 정책, 영구 검색 기록, source 자동 갱신, 새로운 writer/schema는 선택하지 않았다.

## 2. 세 원본 요구와 현재 구현·시험 매칭

| 원본 요구 | 직접 근거 | 현재 연결·유지할 시험 | C1-c2에서 추가할 확인 |
| --- | --- | --- | --- |
| v4.1 실제 실행·정리 | 원본 spec (로컬 전용 근거: `../../../../flow-mvp/docs/specs/2026-09-01-personal-workspace-v4-1-prototype/spec.md`)9–15행: 날짜·폴더·순서 분리, Flow Item의 소속 보존, 현재 위치 no-op·취소 | standalone `renderFlowDetail`/기존 이동 패널. React 기존 상세와 K2-C 완료·이동 결과. C3 저장 UI (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k2b-c3-storage-ui.spec.ts`)의 C3UI06, React K2-C (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k2c-react-contextual-result.spec.ts`)의 C01–08 | 검색에서 고른 **그 사본**의 실제 상세에 도달한 뒤 실행·이동한다. 같은 제목의 이웃 사본과 source·작성 A는 불변 |
| v4.1 Undo·무효 동작·화면 | 같은 spec19–28행: 시간순/수동 순서, 경로·시간,48px·safe area, undo snapshot | 기존 timeline/contextual result와 키보드·메뉴 대안. 날짜별 수동 순서와 Plan 전체 순서는 서로 다른 기존 계약 | 이동 취소0쓰기, 마지막 실제 성공의 Undo만 실행. 새 복귀 UI가 기존 실행 손잡이·Undo·오류를 가리지 않음 |
| 개발1 찾기→내용 이해→조정 | 8월19일 원본 UI (로컬 전용 근거: `../../../../flow-mvp/docs/content-audit/2026-08-19-flowme-after-end-to-end-ui-scenarios-ko.html`)809·829·876–900행: 출처 확인, 원문 기준과 개인 초안, Item 변경 후 계획 반영 | [Stage2 §5–6](../2026-09-02-flowme-integrated-poc-gap-closure-v1/stage-2-contract.md), C1의 D1-016/017/019/021/024 매칭. React exact ref Link와 기존 Plan/Item editor | 읽기 화면에서 바로 저장하지 않고 실제 상세를 방문. 개인 편집 후 결과·원문 owner가 달라지지 않음. 원본 예시 URL·기준일·criteria를 fixture 사실로 복사하지 않음 |
| 개발1 편집 취소·한 번 저장 | 원본 UI의 ADJUST ITEM→SAVE ONCE. 개인 초안은 최종 저장 전 저장소에 쓰이지 않음 | B2 구조 UI (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3b-structure-ui.spec.ts`)의 B2UI04–08, B3 결과 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3b-plan-feedback.spec.ts`)의 B3UI01·05–11, K1-B 현행 회귀 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3b-regression-k1b.spec.ts`) | 상세 방문 출처가 검색이어도 child→parent staged 상태·dirty-close·quota/retry·prepared/confirmed 계약 유지. 복귀를 통한 우회0 |
| 개발2 source·개인·실행 소유 | [data handoff §3–4](../2026-07-28-flowme-text-authoring-ux-v1/data-handoff.md)90–105행: source immutable, 개인 overlay, completion/reopen은 authoring 밖 | 기존 PD/entry packet과 네 결과. 원본 문법 (로컬 전용 근거: `../../../../flow-text-authoring-review/docs/specs/2026-07-28-flowme-text-authoring-ux-v1/authoring-grammar-logic.md`)31–34·100–101행: 원문 정보 추정 금지·sourceChecked와 실행 분리 | 완료·메모·계획일 변경이 작성 A나 source text를 고치지 않음. source/criteria·개인 메모·실행값은 현재 기존 presenter의 소유 그대로 |
| 개발2 같은 작성 원문과 입력 이력 | [Stage2 한 editor 계약](../2026-09-02-flowme-integrated-poc-gap-closure-v1/stage-2-contract.md), [C1-c1](./k3c-c1-explicit-authoring-design.md) | React R07 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3c-entry-return.spec.ts`)186–258행, standalone 읽기 (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3c-standalone-entry-read.spec.ts`)258·389행, 현행 helper/library 보호 | standalone 실제 상세 방문 동안 A subtree를 연결한 채 보존. React는 route 왕복의 durable A와 동일 화면 검색 왕복의 native Undo를 구분 |

v4.1 원본에는 통합 검색·공유 preview 자체의 요구가 없다. 이를 v4.1의 새 미구현으로 세지 않는다. 개발1 원본의 과거 Calendar 기본 제안보다 이후 승인된 Text 기본을 유지한다. 개발2 원문 정렬·기준일의 미지원 정책은 K4이며 이 연결에서 해결한 것으로 표시하지 않는다.

## 3. 현재 되는 것, 빠진 연결, 아직 확인하지 않은 것

### 3.1 React

- [AuthoringSurface](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx)351행의 `getPersonalWorkspacePocAuthoringOpenHref`는 `/my?personalWorkspacePoc=v1#flow=<encoded full ref>`를 만든다.3340–3357행은 현재 binding·문서 이탈 guard·메모리 capture를 확인한 뒤 client Link로 이동한다.
- [Surface](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx)1782–1794행은 exact hash ref를 현재 model의 Flow와 대조해 실제 상세를 선택한다.1700–1713행은 editor의 browser Back을 기존 `requestClose`에 전달한다.
- [browser memory adapter](../../../lib/flow/personal-workspace-poc-entry-navigation-browser.ts)는 source/state/model/draft/library exact binding과 문서 수명 observer를 사용한다. recovery journal 존재·읽기 실패·관측 변화에서 ticket을 무효화한다. history에는 opaque UUID만 저장한다.
- [AuthoringRoute](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringRoute.tsx)145–159행은 복귀 packet·group/Flow/Item membership과 trash/deleted 상태를 새로 검사한다. 이전 DTO를 그대로 채택하지 않는다.
- **이미 검사된 범위:** R07:79–105의 실제 `/my` 방문→즉시 Back,107행 이후 다섯 화면 source owner/상세·초점 복귀,158행 이후 외부 ABA,186행 이후 durable A,229행 이후 실패 A 이탈 차단,260행 이후 history 실패·reload. [당시 QA](./k3c-c1-react-return-qa.md)와 현재 source를 구분한다.
- **미검사 조합:** 그 방문에서 actual Flow/Item identity를 확인하고 완료·이동·Plan/Item 저장·Undo·실패 복구까지 수행한 다음 복귀하는 과정. 기존 R07의 URL assertion만으로 이를 통과시킬 수 없다. 현재 구현이 이 조합에서 실패한다고 아직 판정하지 않는다.

### 3.2 standalone

- [personal-entry-ui.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-entry-ui.js)223–228·303행의 `entry-workspace`는 `session.stage='workspace'`와 `deps.workspace`로 이동한다.
- [app.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js)368–374행의 `personalEntryWorkspace`는 날짜·완료를 읽는 `<ul>`이다.3232행의 `renderFlowDetail`,5538행의 `open-flow`,Plan/Item editor·실행 writer에는 연결되지 않는다. **실제 상세 방문은 명확히 미구현이다.**
- 기존 C1B-R05:288–300은 이 내부 요약↔preview만 검사한다. 실제 조작이나 실제 workspace 방문 증거로 확대하지 않는다.
- 기존 상세·Plan/Item·완료·이동·Undo 기능은 이미 별도 화면에 있다. C1-c2는 그 화면과의 owner·DOM·복귀 연결을 추가한다.
- `personalEntry.active()`는 app1043의 차단 조건,4678의 render 조기 반환,UI의 host 밖 click guard와 연결된다. active 상태를 유지한 채 실제 상세 HTML만 넣으면 기존 writer가 막힌다. 반대로 일반 `open-flow/render()`만 호출하면 작성 A를 보존하던 `#content`를 교체할 수 있다. 두 문제를 함께 해결해야 한다.

위 행 번호는2026-09-06 조사 시점의 탐색용 위치다. React C1-c1은 후속 변경 중이므로 다음 구현 시작 때 다시 확인한다. standalone 조사 기준은 app7E27A495 / 사용자 HTML CD6FC427·1,892,656bytes다. 설계 작성이 그 HTML을 변경하거나 새 후보를 동결하는 행동은 아니다.

## 4. 사용자 여정과 복귀 상태

| 상태·행동 | 다음 화면·초점 | 저장/권한 |
| --- | --- | --- |
| 검색→사본 선택→개인공간에서 보기 | exact 사본의 실제 Flow 상세 heading. 읽기 Item과 실제 편집 Item opener는 구별 | 방문 자체0쓰기. 상세 writer 권한은 기존 current storage/source 검증에서 얻음 |
| 실제 상세에서 읽기만→돌아가기 | 살아 있는 동일 ticket일 때 query·Flow/child·owner·보기·월/선택일·상세·목록/preview scroll 복원. 원래 방문 버튼에 초점 |0쓰기. history의 presentation은 저장 권한이 아님 |
| 이동 열기→현재 위치·Escape·취소 | 기존 상세·원래 손잡이/메뉴로 복귀. 새 성공 결과0 |0쓰기. 날짜·폴더·순서·기존 Undo 불변 |
| Plan/Item clean 닫기 | 기존 close 경로를 완료한 뒤 상세. 필요하면 그 다음 검색 복귀 |0쓰기. 한 번의 Back을 editor와 entry가 동시에 소비하지 않음 |
| dirty child/parent에서 복귀 시도 | 기존 계속 편집/명시 취소 확인이 우선. 계속 편집은 같은 입력·오류·owner로 돌아옴 | staged0쓰기. 입력 자동폐기·자동저장0 |
| 완료·날짜/폴더 이동·Plan 저장 성공 | 기존 성공 결과와 해당 Undo를 표시. 검색 복귀 때 옛 ticket 폐기·invalid/재선택 | 실제 성공 구간만 기존 writer 호출. source/A를 바꾸지 않음 |
| 실제 성공→Undo→검색 복귀 | Undo는 기존 가장 최근 허용 owner에서만 실행. 복귀는 새 재조회 필요 | Undo도 실제 변경 구간. 옛 ticket 부활·entry 전용 Undo 생성0 |
| target quota/readback/CAS 실패 | 기존 실패/입력/재시도 또는 recovery gate. 검색 복귀는 이를 우회하지 않음 | set 실패·rollback API와 실제 변경 수를 각각 기록 |
| source/workspace/draft/library 변화·ABA | 기존 읽기 ticket 영구폐기. 입력 A가 있으면 기존 drift/쓰기 차단 경로 유지 | 자동 rebind·외부 B 덮어쓰기·옛 callback 실행0 |
| 선택 사본이 inactive/삭제 또는 source 표시 불가 | 기존 invalid/재선택 또는 recovery gate. 다른 동명 사본 자동 선택0 | 미리보기 raw fallback0. 자동 정리·초기화0 |
| reload | 현재 durable 데이터와 기존 복구 계약으로 boot. 검색 ticket은 소멸 | 검색 기록 저장0. prepared/confirmed 복구는 별도 명시 구간으로 보고 |

무변경 복귀도 실제 storage read 실패를 만나면 무변경으로 간주하지 않는다. 복귀 직전, 새 packet 소비 직전, 지연 focus callback 직전에 현재 owner를 검사한다. source/실행/작성의 Undo를 서로 대신 호출하지 않는다.

## 5. 최소 연결 설계

### 5.1 standalone 방문 경계

다음 API 이름은 **아직 구현하지 않은 설계 역할**이다. 실제 이름은 root가 연결 diff를 검토하며 정한다.

1. 방문 준비: 현재 읽기 packet과 full Flow ref가 catalog·actual checkpoint·PD에서 같은 활성 사본인지 검증한다. `copy.flowRef`를 실제 Flow의 exact tuple과 대응시킨 뒤 그 객체의 local id를 기존 상세에 전달한다. 제목·배열 index·부분 ID를 join key로 쓰지 않는다.
2. 방문 상태: 읽기 session의 presentation·원래 opener·A의 DOM/selection/scroll은 보존하되, 이전 packet의 writer 권한은 만들지 않는다. `active()` 하나가 읽기 host와 실제 상세를 모두 뜻하지 않도록 역할을 나눈다.
3. 실제 workspace: 기존 `renderFlowDetail`·result·Plan/Item·이동·writer를 재사용한다. 별도 복제 상세나 축약 실행 목록을 만들지 않는다. 오래된 숨긴 entry/작성 DOM의 이벤트는 차단하고 현재 실제 workspace subtree의 이벤트만 기존 dispatcher에 전달한다.
4. A 보존: 작성 subtree는 방문 중에도 **연결된 채 hidden/inert**로 유지한다. native history를 보존하려고 source를 다시 입력하거나 innerHTML로 복원하지 않는다. `elements.content`를 일시 교체하는 방식을 택한다면 모든 기존 renderer/dialog/focus 의존을 먼저 inventory하고 owner를 한 곳에서 복구해야 한다. DOM을 연결 해제하는 fragment 보관을 같은 연결 textarea 보장으로 표현하지 않는다.
5. 복귀: dirty-close·move cleanup·recovery 소유자가 먼저 끝난다. 현재 binding이 무변경이고 방문 owner가 살아 있을 때만 이전 presentation을 복원한다. 달라졌으면 기존 invalid/재선택 경로로 돌아가고, 명시 조회에서만 새 packet을 만든다.
6. history: entry 방문 marker와 editor marker를 분리한다. 취소·Back·늦은 popstate가 서로의 marker나 새 화면을 소비하지 못하게 한다. raw query/source/개인 메모는 URL/history/storage에 넣지 않는다.

### 5.2 React

기존 Link·memory factory·browser wrapper·Route membership 검증을 유지한다. 먼저 실제 상세 조작 조합을 characterization하고 결함이 확인된 owner/경계만 최소 수정한다. 기존 기능을 새 navigation API로 전면 교체하지 않는다.

같은 탭의 실제 저장은 다른 문서의 `storage` 이벤트와 다르다. 복귀의 fresh bytes 검증과 실제 상태 변경 관측을 확인하고, source/target A→B→A에서 이전 owner가 다시 유효해지지 않는지 검사한다. 기존 watcher가 실제로 관측하지 못한 변화를 이미 관측한 것처럼 보고하지 않는다.

React `PersonalWorkspacePocRoute`의 boot는 기존 storage recovery를 호출한다. pending journal을 가진 방문은 정상 읽기0쓰기와 별도 검사한다. 이 단계에서 recovery를 제거하거나 신규 자동 복구를 추가하지 않는다.

### 5.3 유지할 제한

- 네 origin의 현재 eligibility와 authored 기존 handoff 경계 유지. authored/Quick를 새 검색 대상에 넣지 않음.
- standalone Map 관계·URL·source criteria 미보유는 그대로 명시. actual copy를 열기 위해 가짜 Map metadata나 원문을 만들지 않음.
- 기존 Flow 실행 목록의 시간/수동 순서와 Plan global order 차이 유지. 방문 연결을 핑계로 정렬 정책 변경0.
- C2 합성 후보의 명시 연습 진입, C3 전역/로컬 UI 정비, K4 기준일·포함·원문 정렬은 범위 밖.

## 6. 저장 호출 구간과 관찰 항목

| 구간 | 허용·필수 계측 |
| --- | --- |
| fixture 준비 | 실제 model/decoder 또는 제품 UI로 만든 값만 사용. 준비용 seed와 정상 작성 저장을 제품 읽기 호출과 분리 |
| lookup/선택/preview/방문/무변경 복귀 | PoC 포함 `setItem/removeItem/clear`0. source/target/journal/draft/library 및 운영 sentinel exact |
| staged edit·열기·취소 |0쓰기. draft 값·owner·기존 Undo·원문 A exact |
| 명시 완료·이동·최종 저장 | 기존 허용 PoC writer만. logical success 수, API 수, 실제 bytes 변경 수, journal cleanup을 각각 기록 |
| 실패·rollback·recovery | 실패 set 호출을0API로 숨기지 않음. prepared와 confirmed를 구분하고 confirmed를 rollback하지 않음. gate 유지·재시도/복구의 명시 행동 확인 |
| 외부 HTTP 문서 변화 | 외부 문서의 실제 UI/검증된 fixture write를 별도 계수. 제품 호출로 섞지 않음. library-only·source-only·workspace-only 조합 식별 |
| reload | 검색 memory 복구0. durable 상태·정당한 recovery만 확인. boot의 복구 쓰기를 조회 성공0에 포함하지 않음 |

모든 구간에서 prefix 밖 호출·`clear`·운영 writer 변경0을 검사한다. 화면 기능 시험은 실제 사용자 profile이 아닌 격리 fixture다. 캡처는 fullPage:false와 전후 bytes/owner 동일 검사로 남기며 전체 화면 가림0을 일부 control 검사로 확대하지 않는다.

## 7. 첫 baseline과 후속 검사 계획

**현재 등록0·실행0.** 아래는 다음 구현 승인 뒤의 등록 후보이며 PASS/FAIL 수가 아니다.

### 최초 등록 후보2개

| 계획 ID | 정상 전제와 기대 | 판정 원칙 |
| --- | --- | --- |
| DV-B01 standalone | 실제 사본 검색→선택→개인공간 행동→그 full ref의 기존 상세 heading·실제 완료/편집 control 존재 | 현재 읽기 요약에서 실제 상세로 이어지지 않는 첫 RED 예상. 첫 실패 뒤 조작/복귀 기대는 미실행으로 남김 |
| DV-B02 React | 실제 full ref 상세 도달 확인→실제 완료→Back에서 옛 preview 폐기→명시 재조회로 최신 완료값 | 현재 조합의 characterization. 미리 실패라고 단정하지 않고 PASS/제품 RED/하니스 실패를 분리 |

### 연결 후 유한 inventory 후보

| 묶음 | 추가 검증 |
| --- | --- |
| 방문·identity | 네 origin, 같은 제목 다른 사본, exact child, inactive/foreign ref. standalone Map 공급 한계 별도 |
| 무변경 복귀 | query·선택·owner·view·달력 탐색·열린 상세·목록/preview scroll·opener, 실제 Back/Escape |
| 완료·이동 | 실제 상세 완료/재열기·날짜/Flow 폴더 이동→최신 결과. 같은 위치·취소0쓰기 |
| Plan/Item | dirty child/parent→계속/취소, 실제 마지막 저장, source·A·이웃 사본 불변 |
| Undo | 마지막 성공1owner, source Undo와 경쟁, Undo 이후에도 옛 navigation ticket 재활성0 |
| 실패 | 정확 target quota·read error·readback/rollback·late callback. 입력/실패/recovery가 entry 복귀보다 우선 |
| 변화 | source/workspace/draft/library 변화·관측 ABA, 자신의 실제 저장 뒤 복귀와 외부 변화 구분 |
| reload | 정상 durable 저장/실패·prepared/confirmed, 검색 소멸, 새 receipt/원문 추정0 |
| 작성 A | standalone 같은 연결 textarea·selection·native Undo. React route durable A 및 동일 화면 native Undo를 별도 검증 |
| 화면 |390×844·375×812·844×390·1024×768·1440×900. heading/실제 상세/복귀/실패·Undo 핵심 control 전체 rect·9점, 키보드·스크롤·넘침·console/pageerror |

묶음을 그대로10개 등록했다고 쓰지 않는다. 구현 API와 실제 selector가 확정된 뒤 runtime별 등록 수·context·viewport 반복을 별도 inventory로 root가 검토한다. 첫 baseline2개를 후속 재실행 수와 중복 합산하지 않는다.

기존 회귀는 R07/C1B-R05, K1-A/K3-A, 현행 helper/library6, K1-B dirty-close, B2 구조, B3 결과/Undo, C3 storage·source CAS 중 영향을 받는 실제 파일을 선정한다. 관련 검사 통과를 나머지 전체 회귀 통과로 확대하지 않는다. 기존 assertions나 과거 JSON/PNG는 수정 승인 없이 바꾸지 않는다.

## 8. 실행 순서·검토 gate

1. **C1-c1 종료 후 baseline:** source/build/user HTML·dirty ownership을 고정하고 최초2개를 등록·검토·실행한다. 지금은 시작하지 않는다.
2. **기획·UX:** 실제 상세의 주 행동과 단일 복귀 위치, dirty-close 우선순위, changed/invalid 재선택 경로를 위 상태표와 연결한다. 읽기 요약과 실제 상세를 같은 이름의 다른 실행 화면으로 남기지 않는다.
3. **개발 설계:** standalone retained A + 방문 owner + 현재 writer scope + history/focus guard의 최소 경계를 검토한다. React는 baseline에서 드러난 연결 결함만 수정한다.
4. **개발·순수/VM 검증:** 소유 파일을 별도 승인하고 exact before를 남긴다. private presentation과 writer authority 분리, stale/clone/late callback·dirty/recovery 우선순위를 검사한다.
5. **브라우저·회귀:** 단계별 write 계수와 양쪽 실제 사용자 행동을 비교한다. 다섯 viewport를 직접 캡처·평가하고 실패는 제품/하니스/미실행으로 나눈다.
6. **마감:** root의 전체 시험/build·생성 HTML/file·문서 검사와 실제 변경 범위를 연결한다. coverage254/424 전수 완료, C1/K3-C 전체 완료로 자동 승격하지 않는다.

이번 최소안에 필요한 사용자 영구 정책 선택은 남아 있지 않다. 자동 rebind 금지·무변경만 복원·명시 재조회·runtime별 A 보존 범위는 이번 요청에서 정해졌다. root가 승인할 **기술 구현 gate**는 retained DOM의 정확 host 소유 방식, 기존 history와 방문 marker 조율, 최초 등록·소유 파일 범위다. 이것을 이미 구현한 API나 사용자 미결정 blocker로 표시하지 않는다.

## 9. 이 문서의 수행·공개 범위

새 설계 파일 한 개만 작성했다. 제품·기존 문서·시험·builder·사용자 HTML 변경0. 새 모델/브라우저/기기 시험 실행0. 세 원본의 위 관련 구간을 대조했으며 원본 전체 대화·254/424 요구 전수 재검토는 하지 않았다.

Android/iOS·OS IME/OS Back·보조기술 NOT_RUN, 관찰 사용자0명. commit/push/PR/Preview/Production 미실행. 문서 검사 결과는 기능 구현이나 제품 시험 결과와 별도로 인계한다.

작성 후 `npm.cmd run docs:check`는 skill 동기화·필수16개·로컬 링크6,489개 PASS였다. 이 문서의 로컬 링크25개도 별도로 해석해 모두 파일이 존재함을 확인했다. 제품·브라우저 신규 시험 수는 여전히0이다.

## 10. C1-c1 gate 통과 뒤 기술 구현 범위

위 §1–9는 최초 설계 기록이다. C1-c1은 [최종973812/HZkt 판정](./k3c-c1-react-authoring-safety-design.md#16-최종-후보-판정과-다음-단계)으로 정한 보호 범위를 마쳤다. root는 현재 UI 전문과 app의 read/return·writer·renderer·editor-close/history·storage observer를 직접 읽고, 독립 검토자의 같은 경계 분석과 대조했다. C1-c2의 baseline2를 별도 신규 spec으로 등록한다. 이 절은 구현 범위 승인이지 신규 브라우저 PASS가 아니다.

standalone 최소 제품 범위는 `personal-entry-ui.js`·`app.js`다. 먼저 exact before를 보관하며 사용자에게 제공하는 두 CD6FC4 HTML은 검증 전 교체하지 않는다. 새 후보는 기존 builder의 `buildText()`를 격리 HTTP 경로로 제공해 검사한다. 공용 model·workspace storage·schema·전역 CSS의 수정은 이 승인에 포함하지 않는다.

- retained session 존재와 읽기 host 활성·실제 visit 활성을 분리한다. 방문 중에만 기존 상세 subtree/dialog/move의 실제 이벤트를 허용하고, 숨은 작성 A/preview의 합성 늦은 이벤트는 막는다. packet은 writer 권한이 아니다.
- 원래 content는 연결된 hidden/inert 상태를 유지하고 renderer는 별도 sibling 방문 host를 사용한다. content pointer의 이전 값과 screen/result presentation을 단일 visit owner가 보관한다. 복귀 시 먼저 원래 host 소유를 돌려놓으며 작성 A에 innerHTML 재생성이나 source 재입력을 하지 않는다.
- 상세의 반환 제어는 기존 recovery/pending/history consume → dirty editor/dialog → source review/move → visit 순서를 따른다. editor가 소비한 한 Back에서 visit까지 닫지 않는다. 별도 history marker에는 opaque 방문 식별자만 넣고 기존 editor marker를 보존한다.
- 저장 변화·관측 ABA는 옛 preview만 단방향 폐기한다. 방문 중에는 invalid preview로 상세 DOM을 덮지 않고, 기존 source editor·contextual/Plan Undo observer도 계속 실행한다. 정상 자체 저장 뒤 epoch 변화도 복귀 검사에 반영한다. 실패 복구를 새로 자동 실행하지 않는다.
- 지연 초점·scroll은 현재 visit generation·screen·실제 연결된 visible subtree를 확인한다. retained A의 전역 selector를 잘못 집지 않도록 기존 focus/editor/move 복귀 소비자의 최소 범위만 좁힌다. feedback의 hidden/inert 소유도 방문 시작·복귀에서 넘긴다.

React는 최초 실제 완료후복귀 characterization 뒤 발견한 결함만 수정한다. 일반 완료→Undo는 revision 증가로 처음 bytes와 다르지만 이를 모든 ABA 증거로 확대하지 않는다. own write pending 중 실제 Back, recovery가 exact A로 되돌아온 복귀, dirty 확인 뒤 반복 Back은 별도 위험 후보이며 실제 측정 없이 PASS/제품FAIL로 판정하지 않는다. 추가 등록 수는 baseline2와 구분한다.

## 11. 최초 baseline2의 실제 판정

신규 spec (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3c-detail-visit-baseline.spec.ts`) SHA `EF60C708E5A60D7989F4B4F4762FE19FF60DEB2BCE7E9ABD4A18486BD57CE643`을 root가 전문 검토했다. 기존 source spec에서 fixture 선언만 읽었으며 등록·hooks는 실행하지 않았다. 기존 assertion을 삭제하거나 기존 spec을 고치지 않았다. 최초 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1c2-detail-visit-baseline-initial-20260906-01.json`)은2026-09-06T04:21:59.414Z 시작·11.56초·2등록/2실행/1PASS/1제품FAIL·retry/skip/flaky0이다.

| 대상 | 실제 도달·판정 | 쓰기·한계 |
| --- | --- | --- |
| DV-B01 standalone CD6FC4/app7E27A495 |실제 M/C fixture boot→검색→exact `saved-flow:copy-map-moving:flow-moving` 선택→읽기 preview→개인공간 행동 PASS. 이후 기존 실제 `standalone-result-surface` 부재로 RED |1context·API0·bytes exact·오류0. 실제 완료/편집control의 후속 assertion은 첫실패 뒤 NOT_RUN이며 실행 저장·복귀도 미실행 |
| DV-B02 React973812/HZkt |실제 R07 fixture→full Flow/Item ref→기존 상세→완료→실제 Back의 옛 preview 폐기→명시 재조회 최신완료 PASS |1context·완료 논리성공1·저장API5/byte변경5(state1+recovery/marker4). 방문/Back/재조회0쓰기. 작성 A·Plan/Undo·실패·다섯화면 조합은 미검사 |

원본·scope·userHTML·build 해시 전후 exact, 보호 key/value exact, 금지호출·clear·console/pageerror0이다. React의5API는 state 저장과 기존 journal 정리까지 포함하며 성공 변경5건으로 세지 않는다. root는 두 boundary의 단계별 counts·refs·NOT_RUN과 standalone 읽기요약/React 재조회완료390 캡처2장을 직접 읽었다. 제공 HTML 실제 file URL이나 실제 기기 검사는 아니다.

DV-B01 RED를 근거로 §10의 standalone 실제 상세 연결 구현을 시작했다. baseline spec·원본JSON/PNG는 고정하며 새 후보의 기대/해시는 별도 검사에 기록한다. React 기본 완료왕복은 이미 통과했으므로 동일 연결을 새로 만들지 않고, dirty 반복Back·실제 Web Lock 대기중 이탈의 별도2개를 준비한다. 이 추가2개는 아직 미실행이며 baseline2의 PASS에 포함하지 않는다.

## 12. 첫 후보의 유한 검사 범위

다음은 구현 중인 후보의 등록 계획이다. **아래6개를 실행한 결과가 아니며**, baseline2와 중복 합산하지 않는다. 실제 등록·실행·subcase·context 수는 결과 JSON으로 갱신한다. 등록 전 root의 전문 검토와 source/build 동결을 거친다.

| 계획 | 원본 요구·연결 | 첫 검사에 포함할 범위 | 별도로 남길 범위 |
| --- | --- | --- | --- |
| standalone DV01 |v4.1 exact 사본·개발1 탐색 복귀·개발2 같은 원문 |네 seed origin을 각 fresh context에서 실제 작성A→검색→선택→실제상세→무변경복귀. 같은textarea·선택·실제Undo/Redo oracle·읽기0쓰기 |동명 충돌/휴지통·외부ABA·모든preview탐색조합 |
| standalone DV02 |v4.1 실행/이동/Undo·개발2 source/개인/실행 분리 |완료/재열기·현재위치/취소·Item날짜·Flow폴더 이동·최신성공Undo. 변경뒤옛preview폐기·명시재조회. A/source/library/이웃 불변 |quota·recovery·reload·모든기간순서 |
| standalone DV03 |개발1 한 번 저장·개발2 staged 원문 보호 |dirty Plan/child staged에서 복귀버튼·실제Back·Escape의 기존확인우선. 계속편집과명시버리기·A보존·staged0쓰기 |최종저장오류6종·prepared/confirmed복구 |
| standalone DV04 |v4.1 화면/비드래그·개발1 실행연결 |5viewport 실제상세·복귀·이동취소/Undo의전체rect/9점·키보드·넘침·오류·캡처 |전체제품가림0·실기기·관찰사용자 |
| React DV-S01 |기존K1-B 미저장닫기와C1 실제상세복귀 조합 |dirty Plan의실제Back확인창뒤반복Back에서도현재route·같은입력·A·쓰기0 유지 |child/parent 혼합·sourceUndo |
| React DV-S02 |C1 pending우선·v4.1 단일성공·개발2 A보호 |정상완료대조와실제WebLock지연제어문서의경합. Back을허용한경우늦은쓰기/결과여부측정 |WebLock자체안전성·모든writer/recovery·OSBack |

DV-S02에서 안전한 기존 pending 경계가 이탈을 차단한다면 그 경로와 해제후 정상결과를 따로 기록한다. 이탈경합 분기는 NOT_RUN이며 이를 늦은쓰기0의 실행 증거로 바꾸지 않는다. “Back은 항상 취소로 처리한다”는 새 정책을 정하지 않는다. 첫 후보가 통과해도 표의 별도 범위와 원본 §7에서 실제 영향이 있는 기존 회귀를 확인하기 전 C1-c2 전체완료로 표시하지 않는다.

## 13. C1-c2 구현·검사 결과 — 2026-09-06

§12는 당시 등록 계획으로 보존한다. 실제 구현에서는 standalone retained A와 실제 상세 visit host를 분리했고, React에서는 반복 Back의 dirty 확인 우선권 및 종료된 화면의 지연 완료 거래를 보호했다. 실제 함수·브라우저의 최초 RED와 하니스 오류를 분리한 [상세 QA](./k3c-c1-detail-visit-qa.md)에 요구별 전후·API·실행 수·남은 조합을 기록했다.

최종 standalone app D7A3/UI65BF, 제공 HTML615418(각1,905,353bytes), React Workspace B454/Authoring9738이다. 신규 상세 HTTP4+3, React 안전2, 실제 제공file2와 관련 회귀·보고서 검사를 통과했다. 생성119, pin46+증거CLI10, 최종 pin 반영 production build `lRjN_SKaMAiL1YjcRtHal`도 PASS다. 전체 npm은 기존 출처 기한1FAIL, 기존 React 회귀는 C1-c1 보호 계약과 충돌한 옛 검색 전제1timeout을 보존했다.

정한 상세 연결 범위는 마쳤으나 C1 전체 조합·K3-C·제품 전체 완료가 아니다. 48×48 미충족36회 측정, 모든 source Undo/동시 변경/복구 조합, 실제 기기·보조기술은 미완료 또는 미검사로 남긴다. 다음 승인 순서인 [C2 명시 연습](./k3c-c2-source-practice-entry-design.md)으로 이어간다. 운영 데이터·기본 `/my`·운영 schema/writer, commit/push/PR/Preview/Production과 관찰 사용자 상태는 변경하지 않았다.
