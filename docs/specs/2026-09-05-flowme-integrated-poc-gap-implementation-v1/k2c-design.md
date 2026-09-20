# K2-C — 이동 직후 결과와 Undo 설계

작성일: 2026-09-05. 상태: **설계 준비 완료, 구현·새 검증 미실행**. 이 문서는 K1-B 마감과 병행한 읽기 조사 결과다. K1-B 편집·복구 화면이나 제품 파일은 변경하지 않았다.

## 1. 목적과 범위

사용자가 날짜·폴더·순서를 옮긴 직후 무엇이 바뀌었는지 확인하고, 설정을 열지 않아도 그 변경을 되돌릴 수 있게 한다. 이동으로 원래 행이 사라지는 오늘 목록에서도 결과와 Undo를 찾을 수 있어야 한다. 완료·다시 열기는 같은 복구 발견성의 회귀 범위다.

새 Undo 기능을 만드는 작업은 아니다. React와 standalone에 이미 있는 마지막 성공 snapshot, writer, 복구 경계는 유지한다. 바꾸는 대상은 일반 개인공간 변경의 결과 표시, 그 결과에 연결된 Undo 진입점, 날짜 heading과 행의 중복 정보다. Sheet 열·문자 줄바꿈, 결과물 정보 문법, K2-B 날짜 계산·순서 호환은 각각의 후속 단계 범위다.

PoC exact gate, `flow:poc:personal-workspace:v1:*` 쓰기 경계, 운영 데이터 읽기 전용을 유지한다. 저장 schema·migration·무제한 history·새 영구 제품 정책·외부 동기화는 추가하지 않는다.

## 2. 원본 요구와 현재 차이

정본은 [실행 계획 §7](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md), [개선 설계 §5.2](../2026-09-05-flowme-integrated-poc-ux-audit-v1/improvement-design.md), v4.1 원본 spec (로컬 전용 근거: `../../../../flow-mvp/docs/specs/2026-09-01-personal-workspace-v4-1-prototype/spec.md`), 원본 UI (로컬 전용 근거: `../../../../flow-mvp/docs/content-audit/2026-09-01-flowme-personal-workspace-v4-1-ui-ko.html`), 통합 blueprint 상태표 (로컬 전용 근거: `../../../../flow-mvp/docs/specs/2026-09-01-flowme-integration-blueprint-v0/plan.md`)다. 현재 판정 ID와 원문 연결은 [v4.1 감사 원장](../2026-09-05-flowme-integrated-poc-ux-audit-v1/v41-audit.json)을 따른다.

| 요구·감사 ID | 원본에서 지켜야 할 행동 | 현재 근거와 차이 | K2-C 완료 기준 |
| --- | --- | --- | --- |
| V41-042, BP-060, BP-063 / P3K-V41-05 | 변경 결과·Undo·닫기, 마지막 전체 변경 복원 | React 일반 성공 상태에는 메시지만 있다. 390에서 날짜 이동 후 Undo가 보이지 않았다는 P3-K 관찰과, 모바일 설정 안에 Undo가 있다는 현재 코드가 일치한다. 기능 미구현이 아니라 발견성 차이다. | 행이 사라져도 결과 옆 Undo에 접근하고 표시된 변경만 복원 |
| BP-076 | QuickItem 종류를 유지하며 날짜·폴더 독립 변경과 Undo | 기존 모델을 재사용한다. 새 피드백이 이전 날짜 이동을 표시하면서 나중의 폴더 변경을 되돌리면 안 된다. | 마지막 성공의 대상·변경 종류·저장 상태가 일치할 때만 contextual Undo |
| V41-024, V41-056 / P3K-V41-03 | 날짜 heading 아래 반복 날짜를 빼고 시간·Flow/폴더 경로 유지 | standalone의 `renderTaskList`는 날짜 생략 인수를 받지만 오늘 목록에 반복 날짜가 남는 경로가 있다. 접근성 설명은 시각적으로 숨겨진 별도 요소다. | 실제 날짜 그룹의 heading이 있을 때만 행 날짜 생략. 시간·경로·접근성 설명 보존 |
| V41-053, V41-054 / P3K-V41-03 | 중복 상단 안내를 줄여 좁은 화면에서 목록과 행동 확인 | 오늘 heading·요약·상태 안내의 반복은 정리 후보지만, 모든 진단·설명을 보이는 문단으로 취급하면 안 된다. | 중복 정보만 줄이고 첫 행·현재 변경 결과·필수 오류가 함께 읽힘 |
| V41-043 및 원본 이동 규칙 | drag/길게 누르기/메뉴/키보드가 같은 목적지·transition, 취소 0 write | 기존 이동 경로와 preview 안내를 보존해야 한다. 결과 표시를 입력 경로별로 새로 구현하면 상태가 갈라질 수 있다. | 세 입력 계열이 같은 결과 owner와 Undo 계약 사용 |

원본 HTML에는 `#notice` polite 상태, Undo·닫기가 있는 `#toast`, 별도 drop preview 안내가 있다. 원본 정적 prototype의 `history` 배열을 현재 기능형 PoC로 옮기지는 않는다. 복원할 요구는 결과 옆 복구 행동이며, 현재 승인된 단일 snapshot 계약이 우선한다.

## 3. 현재 코드와 유지할 경계

### React

[PersonalWorkspacePocSurface.tsx](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx)의 `commitTransition`은 현재 상태·저장 바이트 확인, 순수 transition, 저장·readback 뒤 성공 상태를 만든다. 일반 성공은 기존 receipt를 비우고 메시지 상태를 설정한다. `receiptOwnsTransactionStatus`는 전용 receipt가 있을 때 일반 상태 줄의 표시와 live announcement를 억제한다. `undoReceiptChange`는 receipt 상태·revision·snapshot을 확인한다.

일반 Undo는 desktop header(`sm:inline-flex`)와 모바일 설정(`sm:hidden`)에 있다. 전용 receipt가 유효하면 해당 owner로, 아니면 기존 workspace Undo로 분기한다. 이 경로와 편집 중 잠금은 유지한다. 일반 이동 때문에 Plan/Quick 변환 receipt의 operation 종류나 저장 계약을 확장하지 않는다.

### standalone

[app.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js)의 `writeCandidate`는 성공 후 `lastUndoLane='workspace'`를 설정하고 `setSaveStatus`와 `showToast`를 함께 호출한다. `showToast`에는 Undo가 있으나 5.2초 숨김 timer가 있고, 일반 저장 상태와 각각 live announcement를 가질 수 있다. `undo()`는 workspace 외에 source-update·creator 맥락도 분기하므로, 새 버튼에서 무조건 이 함수만 호출하면 표시한 결과와 다른 lane을 되돌릴 위험이 있다.

[style.css](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/style.css)의 toast와 global feedback은 고정 위치다. [K2-A 시각 평가](./k2a-visual-review.md)는 toast가 본문·CSV 행동 가까이에 겹치는 잔여 문제를 기록했다. 당시 격자 hit-test 통과는 전체 픽셀 가림 0의 증거가 아니다. **Sheet 문자 줄바꿈은 K3-C로 남기고**, 이 단계에서는 결과 피드백의 겹침만 다룬다.

K1-B의 `beginEditorRoot`는 기존 toast와 timer·retry를 숨긴다. 편집 세션·복구 gate의 Undo 잠금, 부모 편집 실패 안내, confirmed 저장의 정리 필요 안내도 보존한다. 새 결과 줄이 이를 다시 띄우거나 편집 실패를 성공 안내로 덮으면 안 된다. 생성 HTML의 시점과 asset 코드 시점을 구분하며, 이 조사에서는 새 브라우저 동작을 확인한 것으로 판정하지 않는다.

## 4. 결과 owner와 표시 계약

### 4.1 저장하지 않는 결과 연결 정보

기존 저장 결과를 받은 뒤 UI 메모리에만 일반 변경 연결 정보를 둔다. 이름은 구현 시 정하되, `contractVersion: 1`, 현재 시도의 식별자, `workspace` lane, action 종류, 충돌 없는 대상 ref, 표시할 전후 값, 검증된 성공 상태, 복귀 위치를 포함한다. 이 정보 자체를 localStorage에 쓰거나 Undo snapshot을 복제하지 않는다.

- ref는 `savedCopyId + flowId + itemId` 또는 기존 QuickItem ref를 사용한다. 같은 제목·다른 사본을 제목으로 찾지 않는다.
- React에서는 기존 transaction·revision·snapshot 연결을 사용한다. standalone은 Undo 후 revision 값이 이전 값으로 돌아갈 수 있으므로 revision만으로 owner를 식별하지 않는다. 현재 저장 바이트와 snapshot의 일치, 세션 내 시도 식별자를 함께 확인한다.
- 시도 식별자는 늦은 callback이 새 실패·새 편집 owner를 덮지 못하게 하는 UI 순서 표식이다. 새 durable transaction 정책이 아니다.
- 성공 라벨은 실제 transition의 확정 결과에서 만든다. 클릭한 버튼 문구나 현재 시각을 나중에 다시 해석해 날짜를 추정하지 않는다.
- contextual Undo 실행 직전에도 기존 writer의 최신 저장 상태·잠금·snapshot 검사를 거친다. 오래된 결과 표시만 믿고 blind rollback하지 않는다.

### 4.2 action별 결과

| action | 결과에 보여줄 정보 | 바뀌면 안 되는 값 | Undo 대상 |
| --- | --- | --- | --- |
| 실행 날짜 | 항목과 실제 목적 날짜. 예: `내일로 옮겼어요`는 해당 시도의 실제 날짜에 대응 | 원문 일정·Flow 소속·Flow Item 폴더 상속·다른 사본 | 해당 날짜 이동의 마지막 전체 snapshot |
| 정리 폴더 | Flow 또는 QuickItem과 목적 폴더 경로 | 날짜·원문·내용. Flow Item 독립 폴더 생성 금지 | Flow 이동이면 그 Flow의 상속 결과까지 일관되게 복원 |
| 이 목록의 순서 | 대상과 해당 목록/날짜의 순서 변경 | 시간·실행 날짜·원문 순서·다른 context | 해당 변경 전 순서. 다른 목록을 새로 초기화하지 않음 |
| 완료·다시 열기 | 항목과 개인 실행 상태 | 원문 `sourceChecked`, 원문 체크·다른 사본·Flow 소속 | 완료 상태와 기존 완료 시각 계약을 포함한 snapshot |

날짜·순서 context는 현재 런타임의 실제 selector 결과를 사용한다. K2-B가 미완료라면 같은 날짜의 view 간 공유를 K2-C의 성공으로 보고하지 않는다. [K2-B 설계](./k2b-design.md)의 selector 계약이 구현된 뒤 연결 회귀를 추가한다.

### 4.3 owner 우선순위

1. 편집·저장 pending·K1-B recovery gate가 현재 행동을 소유하면 그 안내와 잠금이 우선한다. 이전 이동 Undo/retry를 덧씌우지 않는다.
2. 기존 전용 receipt가 현재 성공을 소유하면 그 receipt만 contextual Undo와 결과 announcement를 제공한다.
3. 전용 receipt가 없는 일반 workspace 성공만 새 결과 줄을 소유한다. header/설정 Undo는 기존 대체 진입점으로 남지만 별도 history를 갖지 않는다.
4. 다른 lane의 새 성공, snapshot 변경, 외부 바이트 변경이 있으면 이전 연결 정보의 Undo를 무효화한다. 화면을 닫았다는 이유로 저장 snapshot을 삭제하지는 않는다.

## 5. 상태표

| 상태 | 사용자에게 보일 결과 | contextual Undo | 저장·이전 성공 처리 |
| --- | --- | --- | --- |
| 이동 preview | 놓을 수 있는 곳·현재 위치·취소될 곳 | 새로 만들지 않음 | 0 write, 원래 목록 유지 |
| 저장 중 | 변경 목적과 진행 상태, 중복 입력 잠금 | 실행 잠금 | 기존 writer 경계에서 성공 확인 전 이전 성공으로 취급 |
| 성공 | 확정 목적지/변경 종류 + `되돌리기` + 결과 닫기 | 이 성공의 owner가 유효할 때 제공 | 기존 단일 snapshot 교체, 새 UI 정보만 생성 |
| 같은 위치 | `이미 같은 위치예요` 등 중립 안내 | 이 안내에 새 Undo를 붙이지 않음 | 0 write. 이전 snapshot 유지 |
| 취소·Escape·pointer cancel | 필요한 위치 안내만 종료, opener 복귀 | 새 Undo 없음 | 0 write. 이전 snapshot 유지, 합성 클릭 정리 |
| 저장 오류·충돌 | 실패와 가능한 다음 행동. 성공으로 표현하지 않음 | 실패 안내에는 붙이지 않음 | 기존 실패/rollback/recovery 계약 유지. 이전 성공을 새 성공으로 재명명하지 않음 |
| Undo 저장 중 | `되돌리는 중…` | 중복 실행 잠금 | 표시된 owner와 최신 상태를 다시 검증 |
| Undo 성공 | `되돌렸어요`와 복원 결과 | 사용한 Undo는 소진, 같은 버튼 재실행 불가 | 기존 snapshot 수명과 복원 규칙 적용 |
| 결과 닫기 | 결과 줄만 숨김 | 해당 줄의 버튼만 숨김 | 0 write. header/설정의 유효한 Undo 보존 |
| reload | 실제 마지막 성공 상태 복원 안내 | 기존 저장 snapshot으로 제공되는 경로만 사용 | 새로 `방금 이동` 결과를 합성하지 않음. 손상 payload와 recovery gate는 기존 fail-closed |

같은 위치·취소·실패는 직전 성공 snapshot을 없애지 않는다. 다만 현재 오류·편집·pending 안내와 이전 성공 줄을 경쟁시켜서는 안 된다. 이전 결과를 다시 보일 경우에도 원래 action 이름과 여전히 유효한 owner가 있어야 한다. 실패 뒤 맥락 없는 `되돌리기`를 새로 만들지 않는다.

여기서 성공 1회는 기존 writer가 확인한 논리적 변경 1회다. 실패 injection에서 저장 시도·rollback·기존 journal 보조 쓰기가 발생했다면 이를 `setItem 0`으로 보고하지 않는다. 같은 위치·취소는 실제 쓰기 호출 0, 모든 경우 허용 prefix 밖 호출 0을 별도로 검사한다.

## 6. 입력 경로와 화면 배치

| 입력 계열 | 유지할 원본 행동 | 성공 이후 공통 경로 |
| --- | --- | --- |
| drag·길게 누르기 | 350ms/8px 기준, 오른쪽 48px 통로, body scroll 구분, 영역 밖·blur·resize 취소 | 같은 intent → 기존 transition → 확정 성공 → 같은 결과 owner |
| 짧은 누르기·`…` | 같은 왼쪽 이동 패널에서 순서/날짜/폴더 구분, 현재 위치 중립, Flow Item 폴더 상속 안내 | drag와 같은 대상·결과·Undo |
| 키보드 | 기존 이동 패널·순서 행동, Escape 취소, 정확 opener 복귀 | 같은 ref/context/transition. 행이 사라져도 결과와 Undo에 순서대로 접근 |

결과 줄은 본문 흐름 안에 둔다. 화면 맨 위에만 두어 긴 목록에서 사라지게 하거나, 하단 고정 overlay를 하나 더 올리지 않는다. 구현 시 변경이 시작된 목록의 안정적인 anchor 근처에 공간을 확보한다. 마지막 행이나 날짜 그룹 자체가 사라져도 현재 viewport 안에 결과가 남도록 빈 목록 컨테이너를 유지한다. 이 배치는 기존 DOM의 스크롤 owner와 함께 구현 전 짧은 wireframe으로 확인한다.

| viewport | 노출·배치 완료 기준 |
| --- | --- |
| 390×844 | 오늘→내일로 원래 행이 사라져도 설정 없이 결과·Undo가 보임. 폴더 경로가 길어도 가로 넘침 없음 |
| 375×812 | 결과 문구·Undo·닫기가 줄바꿈하며 각 행동 전체가 보임. 결과가 첫 행·마지막 행을 덮지 않음 |
| 844×390 | 실제 스크롤 본문 안의 결과 줄. 이동 패널·마지막 행·편집 caret·retry·결과 보기 행동을 가리지 않음 |
| 1024×768 | 기존 header Undo 유지. 일반 성공에만 필요한 contextual 행동을 제공하고 상시 중복 상태 줄을 추가하지 않음 |
| 1440×900 | 전용 receipt와 일반 결과의 중복 버튼·중복 announcement 없음. 긴 목록의 현재 작업 위치에서도 복구 접근 가능 |

pointer 성공 때문에 알림 버튼으로 초점을 강제로 옮기지 않는다. 원래 키보드 행동의 DOM이 삭제될 때만 기존 focus 복귀 규칙에 따라 안정적인 목록 anchor로 연결하고 Undo를 다음 접근 가능한 행동으로 둔다. Undo 후에는 origin ref·선택·스크롤을 복구하되 다른 문서나 Flow의 편집 위치를 가져오지 않는다.

일반 결과의 표시 수명은 기존 snapshot의 유효성, 새 성공, 결과 닫기, 화면·owner 전환에 연결한다. 새 저장 TTL은 만들지 않는다. 현재 5.2초 timer가 복구에 접근할 유일한 기회를 없애지 않도록 일반 결과 줄을 설계하되, 다른 toast의 수명을 이 단계에서 일괄 변경하지 않는다.

한 결과는 한 live region만 읽는다. 전용 receipt가 owner이면 일반 상태는 `aria-live=off` 또는 숨김, 일반 결과가 owner이면 별도 저장 성공 toast가 같은 문장을 읽지 않게 한다. drag preview와 확정 결과의 발표 시점도 분리한다. 실패·복구 필요 안내를 단순 중복 문구로 판단해 제거하지 않는다.

## 7. 날짜와 정보량 정리의 한계

실제 날짜 heading이 있는 그룹에서만 행의 반복 날짜를 생략한다. 시간은 독립적으로 남기고 Flow·폴더 경로, 원문, 경고·오류, 접근성 설명을 유지한다. 여러 날짜가 섞인 주간/월간 목록에서 heading 없이 날짜만 지우면 안 된다. 날짜 그룹 자체가 K2-B에 의존한다면 그 부분은 선행 조건으로 남긴다.

오늘의 중복 heading·설명·요약은 같은 정보를 전달하는지 확인한 뒤 합친다. 시각적으로 숨겨진 이동 설명을 화면을 복잡하게 만드는 안내로 판정하지 않는다. 이 단계에서 전체 대시보드, Sheet, 결과물 열 구조, 디자인 토큰을 다시 설계하지 않는다. Flow UX 리뷰의 삭제 기준은 행동·오류 예방·상태 확인·복구·접근성에 기여하지 않는 중복에만 적용한다.

## 8. 예정 검증 inventory

아래는 **새로 실행할 계획**이다. 이 문서 작성으로 PASS가 생기지 않는다. 기존 K1-A/K1-B/K2-A 결과나 P3-K 스크린샷은 회귀 출발점이며 K2-C 실행 수에 더하지 않는다.

| ID | 시나리오 | 확인할 핵심 |
| --- | --- | --- |
| C01 | QuickItem 오늘→내일, 원래 행·마지막 날짜 그룹 사라짐 → 바로 Undo | 동일 ref·날짜·순서·선택/스크롤 복원. 설정 미사용 |
| C02 | QuickItem 폴더 이동, Flow 폴더 이동 후 Item 실행 날짜 이동 | 종류·상속·원문 보존. 결과에 맞는 마지막 snapshot만 복원 |
| C03 | 같은 context 순서 이동, 직접 정렬→기존 시간순 복귀 → Undo | 해당 순서만 복원. 날짜·시간·다른 context 불변. K2-B 연결 범위 별도 표기 |
| C04 | 완료/다시 열기 → Undo → Flow/기간 확인 → reload | 개인 실행 owner 일치, sourceChecked/다른 사본 불변 |
| C05 | 동일 fixture로 drag, long press, 짧은 누르기/메뉴, 키보드 | transition 결과·논리적 변경 수·결과 owner 동등. 입력 경로 횟수와 시나리오 수 구분 |
| C06 | 같은 위치·취소·Escape·pointer cancel·영역 밖·blur·resize | 새 성공/Undo 없음, 실제 write 0, 직전 snapshot 유지, 잔여 합성 클릭 없음 |
| C07 | 초기 read/CAS 충돌/Quota/readback 실패, 기존 recovery 상태 | 실패 표시 유지. 새 성공 없음. rollback 시도와 durable 결과 별도 기록, 잠금 우회 없음 |
| C08 | 늦은 성공 callback, 새 실패, 연속 이동, 빠른 이중 Undo | 새 상태 덮어쓰기·잘못된 이전 owner 실행 없음, Undo 논리적 성공 최대 1회 |
| C09 | 전용 receipt ↔ 일반 이동, creator/source-update lane 전환 | contextual owner 하나, 다른 lane Undo 0, 중복 live announcement 0 |
| C10 | 이동 후 K1-B Plan/Item/Quick 편집 진입·취소·실패·복구 gate | 기존 toast hide와 retry 정리 유지. 부모 실패·confirmed 정리 안내 보존, 편집 중 외부 mutation 0 |
| C11 | 결과 닫기·reload·동일 제목 다른 사본·외부 bytes 변경 | 닫기 0 write, 유효한 기존 Undo만 제공, 손상 fail-closed, stale 결과로 rollback 금지 |
| C12 | 다섯 viewport의 성공/실패/빈 목록/긴 목록·키보드 노출 | 가로 overflow 정확 0, 핵심 버튼 full viewport 노출과 hit-test, 전체 화면 시각 가림 확인, console/page error 0 |
| C13 | 날짜 heading/행 시간/Flow·폴더 경로/접근성 설명 | 중복 날짜만 제거. 날짜 혼합 목록 정보 손실·접근성 설명 삭제 없음 |

최소 자동화는 순수 결과 owner 상태표와 runtime adapter, 기존 receipt/Undo/이동·저장 경계 회귀, 신규 scoped E2E로 구성한다. 5 viewport 반복 실행 수는 독립 시나리오 수와 분리한다. 브라우저에서는 DOM ratio/hit-test만으로 가림 0을 선언하지 않고 현재 출력 경로에 저장한 전체 화면을 함께 평가한다. 테스트 파일·최종 실행 개수는 구현 후 실제 목록으로 확정한다.

전체 시나리오 전후 운영 `flow:*` key/value를 byte-for-byte 비교하고, 허용 prefix 밖 `setItem`·`removeItem`·`clear` 호출 0을 증거로 남긴다. PoC key도 noop/cancel과 실제 성공/실패별로 전후 bytes·호출 로그를 구분한다. 관련 회귀 후 `npm test`, production build, `docs:check`를 실제 실행하고 결과를 분리 보고한다.

## 9. 단계별 착수·완료 기준

1. K1-B 최종 baseline을 고정하고, K2-B 진행 상태와 해당 날짜/context adapter를 확인한다. 기존 toast hide·복구 owner를 보호 fixture에 포함한다.
2. 일반 성공·전용 receipt·편집/복구의 owner 표와 390/844 본문 배치를 확정한다. 미확정 context 호환이나 새 제품 정책이 필요하면 해당 부분만 분리한다.
3. 저장하지 않는 결과 연결 모델과 순수 상태표 검사를 먼저 만들고, React/standalone의 기존 성공 지점에 연결한다. writer와 snapshot 저장 schema는 변경하지 않는다.
4. contextual Undo, 단일 announcement, 결과 닫기, 날짜 중복 정리를 연결한다. 실패나 취소 안내가 성공 snapshot의 이름을 바꾸지 않게 한다.
5. C01–C13의 실제 실행 범위를 기록하고 원본 요구별 충족·잔여·의존 사항을 갱신한다. 전체 요구나 P3K-V41-03/05를 부분 증거만으로 일괄 완료 처리하지 않는다.

이 문서의 완료는 설계 문서 작성과 문서 검증에 한정한다. `npm.cmd run docs:check` 실행 결과 skill sync 통과, 필수 문서 16개·로컬 링크 4,842개 검사 통과다. 제품 구현, 새 자동 테스트·브라우저 검사, Android Chrome·iOS Safari 실제 기기 검사는 미실행이며 관찰 사용자 수는 0이다. commit·push·PR·Preview·Production은 모두 진행하지 않는다.
