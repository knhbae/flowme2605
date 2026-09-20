# K2-B — 기간 계산과 날짜별 표시 순서의 일치

작성: 2026-09-05. 상태: **다음 단계 설계 준비 / 제품 구현·새 테스트·새 브라우저 검사 미실행**.

이 문서는 K2-A 마감 및 K1-B 설계와 병렬로 준비했다. K2-B 착수·완료 판정이 아니다. 조사 기준은 격리 worktree `agent/personal-workspace-v4-1-poc-20260901`, HEAD `6e4b44fe2f61b7086b8bbc61c30b5aa39dd4390e` 위의 현재 작업 파일이다. 이번 작업의 소유 파일은 이 문서 하나다. 기존 dirty 파일, 제품 코드, 시험, 저장 데이터는 수정하지 않았다.

## 1. 복구할 요구와 증거 수준

J5의 `P3K-V41-01`과 `P3K-V41-02`를 대상으로 한다. 항목을 기간마다 복제하는 작업이 아니라, 같은 Item을 기준일과 실행 날짜에 따라 보여 주고 같은 날짜의 표시 순서를 공유하는 작업이다.

| 원본 요구 | 이번에 충족할 범위 | 정본·결정 근거 |
|---|---|---|
| V41-002, BP-035 | 폴더 소속과 날짜 노출을 분리하고 같은 Item을 기간에서 조작 | v4.1 spec, blueprint §5, 기존 identity 계약 |
| V41-021 | 날짜 안에서는 시간이 있는 항목부터 시간순, 시간 없는 항목은 뒤 | v4.1 spec §3; 원본 assets/model.js `defaultTaskIds` |
| V41-022, BP-023 | 직접 정렬은 해당 실제 날짜 목록에만 적용; 오늘·주간·월간에서 공유 | v4.1 spec §3, blueprint §5.4 TimelineOrder |
| V41-023, BP-025 | 시간순 복귀는 해당 목록의 TimelineOrder만 제거 | 같은 정본; 다른 날짜·미정·지난 미완료 순서는 유지 |
| V41-008/012/014/065, BP-024/078 | 날짜·폴더·순서 이동을 분리; 메뉴/드래그/길게 누르기/키보드는 같은 context transition | v4.1 spec §2; 원본 이동 패널 및 재정렬 통로 |
| V41-026/027/028 | 월간은 날짜별 세로 목록, 빈 날짜 펼침/접기, 날짜별 추가 | v4.1 spec §3; 원본 assets/app.js 기간 화면 |
| V41-025 | 날짜별 그룹 안에서도 소속 경로와 시간 보존 | v4.1 spec §3 |
| BP-055/069/072/079 | 기간·이동·완료·Undo·새로고침의 관련 회귀만 확인 | 범위가 더 넓은 부모 요구이므로 K2-B만으로 전체 충족 처리하지 않음 |

월~일 주간, 오늘의 지난 미완료 구획은 원본 assets/app.js의 `getDates`/`renderPeriodView`와 [P3-K 실행 계획 §6](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md), [개선 설계 §5](../2026-09-05-flowme-integrated-poc-ux-audit-v1/improvement-design.md)에 근거한다. 원본 HTML의 `2026-09-01`과 현재 standalone의 `2026-09-02`는 각각 시뮬레이션 기준값이다. 영구 제품의 오늘 날짜로 승인된 값이 아니다.

원본 파일은 다음 경로에서 확인했다.

- `D:/flowme2605/flow-mvp/docs/specs/2026-09-01-personal-workspace-v4-1-prototype/spec.md`
- `D:/flowme2605/flow-mvp/docs/content-audit/2026-09-01-flowme-personal-workspace-v4-1-ui-ko.html`
- 같은 content-audit의 `2026-09-01-flowme-personal-workspace-v4-1-assets/{model.js,app.js}`
- `D:/flowme2605/flow-mvp/docs/specs/2026-09-01-flowme-integration-blueprint-v0/spec.md` §5.4

[v4.1 감사 원장](../2026-09-05-flowme-integrated-poc-ux-audit-v1/v41-audit.json)의 두 finding은 **이전 감사에서 저장 없이 실행한 모델 재현**이다. 과거 probe 3건이나 이전 trace의 충족 판정을 이번 시험 개수에 합산하지 않는다. 이번 문서에서는 현재 코드를 읽었고, K2-B 시험을 실행하지 않았다.

## 2. 현재 차이와 변경 영향

아래 경로의 행 번호는 조사 시점 기준이며, 구현 시에는 함수 이름도 함께 확인한다.

| 대상 | 현재 코드에서 확인한 상태 | 이번 설계의 영향 |
|---|---|---|
| standalone `model.js:109,778–805` | `TODAY` 고정. 오늘은 해당 날짜만, 주간은 그날부터 7일. 월간은 고정일의 월. 뷰 전체를 시간순으로 정렬하고 `orders[view]` 적용 | 실행 날짜별 그룹과 주입한 기준일로 읽기 계산 분리 |
| standalone `app.js:883–943` | 월간은 이미 날짜 heading을 오름차순으로 렌더하지만 행 context는 모두 `month`. 오늘·주간은 평면 목록 | 월간 날짜 heading 자체가 역순이라고 보고하지 않음. 행 context와 오늘·주간 그룹 연결 수정 필요 |
| standalone `app.js:2738–2765` | month만 같은 날짜로 재정렬 peer를 제한; week는 뷰 전체. 각 경로는 결국 뷰 문자열 순서 기록 | 모든 경로가 실제 날짜/미정/지난 미완료 context를 전달해야 함 |
| standalone `model.js:987` 부근 `resultContextRank` | today→week→month 순으로 기존 정렬 기록을 조회 | 화면만 고치면 결과 순서는 옛 기준을 사용할 수 있음. 동일 adapter 소비 경로로 검증 |
| standalone `model.js:1846,2145` 부근 | 저장 검증은 현재 `viewTaskIds`의 전체 ref 집합과 배열을 비교. 모든 성공 action 뒤 orders 전체를 현재 집합에 맞춰 정리 | selector만 바꾸면 정상 구 payload가 손상으로 판정되거나 무관한 동작에서 구 순서를 재작성할 위험 |
| standalone 정렬 패널 | 직접 정렬 표식·해당 날짜의 시간순 복귀가 현재 경로에 없음 | 원본 동작 복구. 버튼을 전역 초기화로 연결하면 안 됨 |
| React `personal-workspace-poc-view-model.ts:45–194` | localToday 주입, 월~일, 오늘+지난 미완료, `date/undated/overdue` 그룹, matching TimelineOrder 적용 | 확인된 의미를 기준으로 유지. 결과를 맞추려고 React를 rolling 7일로 바꾸지 않음 |
| React `PersonalWorkspacePocSurface.tsx:1077–1106` | 로컬 달력 날짜로 초기화; 자정 타이머, focus, visibility 복귀에 날짜 갱신 | standalone shell도 같은 의미의 갱신 지점을 갖되 selector 내부에서 시계를 읽지 않음 |
| React `personal-workspace-poc-state.ts:1412–1450,1888` 부근 | context+contextKey 정렬/해당 record 삭제; 적용 시 가용 ref만 투영 후 새 ref 추가 | 원본 일정·Flow 내부 순서·폴더 순서와 분리된 기존 계약 유지 |

standalone 코드 경로는 `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/`, React Surface는 `components/flow/personal-workspace-poc/`, 모델은 `lib/flow/` 아래다.

## 3. 사용자에게 보일 계약

| 화면 | 포함할 항목·그룹 | 표시 순서 context |
|---|---|---|
| 오늘 | 기준일의 날짜 그룹 + 기준일 전 날짜를 가진 미완료 항목의 별도 ‘지난 미완료’ 그룹 | `date:<오늘 실제 날짜>`, `overdue:<오늘 실제 날짜>` |
| 주간 | 기준일이 속한 월요일~일요일. 날짜 heading은 날짜순 | 각 `date:<실제 날짜>` |
| 월간 | 기준일이 속한 달. 날짜별 목록, 빈 날짜 펼침/접기, 해당 날짜 추가 | 각 `date:<실제 날짜>` |
| 날짜 미정 | 개인 실행 날짜가 null인 항목 | `undated:undated` |
| Flow/폴더 | 기존 Flow 내부 순서·폴더 표시 계약 | 기존 별도 context 유지; TimelineOrder로 덮어쓰지 않음 |

오늘에서 9월 5일 목록을 B→A로 바꿨다면 주간과 월간의 **9월 5일 목록만** B→A다. 9월 4일, 9월 6일, Flow 내부 순서, 폴더 순서는 바뀌지 않는다. 지난 미완료는 여러 날짜를 모은 별도 목록이다. 그 순서를 개별 날짜 순서와 강제로 같게 만들지 않는다.

직접 정렬한 날짜에는 ‘직접 정렬’과 ‘시간순으로 되돌리기’를 표시한다. 기본 상태에서는 시간순임을 확인할 수 있게 하되 행마다 설명을 반복하지 않는다. 같은 위치·취소·Escape·pointer cancel·잘못된 드롭은 중립 상태이며 저장 성공으로 세지 않는다. 저장 중/성공/실패는 기존 상태 영역을 사용한다.

월간 접기는 표시 상태만 바꾼다. 실제 날짜, 기간 노출 정책, 완료, 내용, 저장 payload를 수정하지 않는다. 원본 UI는 항목 있는 날짜 외에 빈 오늘을 남기는 예외가 있고, 현재 React의 빈 날짜 노출은 별도 helper로 구성된다. 이번 필수 기준은 ‘내용 삭제 없이 빈 날짜를 펼쳐 추가할 수 있음’이다. 빈 오늘을 무조건 유지/제거하는 새로운 공통 정책은 이 문서에서 확정하지 않는다.

K2-C 대상인 반복 날짜 문구 정리와 이동 직후 Undo 발견성 개선을 전반적 화면 개편으로 앞당기지 않는다. K2-B에서는 필요한 날짜 heading과 구획을 연결하고, 기존 Undo를 사용할 수 있게 회귀 검사한다.

## 4. 순수 selector와 날짜 계약

### 4.1 입력과 출력

제안 계약은 PoC 전용 `contractVersion: 1`로 관리한다. 영구 운영 schema가 아니다.

- 읽기 입력: 현재 read model/state, view, 명시적인 `localToday: YYYY-MM-DD`, 필요하면 해당 view의 표시 anchor.
- 출력: `context`, `contextKey`, 기본 ref 집합, 적용된 ref 순서, `orderMode`, 호환 상태를 가진 그룹 배열.
- selector는 Date.now, localStorage, DOM을 읽지 않고 입력 객체도 변경하지 않는다. 잘못된 날짜 입력에는 명시적 실패/빈 결과와 오류 상태를 반환하며, seed 날짜나 오늘을 임의로 채우지 않는다.
- shell에서 로컬 연/월/일을 얻은 뒤, 요일·전후 날짜 계산에는 plain-date UTC 연산을 쓴다. UTC timestamp의 앞 10자를 로컬 오늘로 사용하는 방식은 금지한다.
- 월요일 시작은 `weekday`를 월=0으로 바꿔 기준일에서 빼고 7일을 생성한다. 월은 그 달의 첫날부터 다음 달 첫날 직전까지이며 문자열 비교는 검증된 plain date에만 쓴다.
- 과거의 완료 항목은 지난 미완료에서 제외하지만 원래 날짜의 주간·월간 그룹에는 남는다. 날짜 미정은 기한 초과가 아니다. 숨김/휴지통/기존 실행 노출 정책은 현재 runtime 계약을 보존한다.

정렬 ref는 제목으로 만들지 않는다. React는 기존 `savedCopyId + flowId + itemId` identity, standalone은 검증된 task id/ref 대응을 쓴다. 같은 제목, 같은 원문의 다른 사본, QuickItem과 Flow Item을 분리한다. 반복 occurrence는 현재 결과 projection identity를 유지하며, 반복 확장 범위를 늘리는 기능은 포함하지 않는다.

### 4.2 기본 정렬과 소비 경로

날짜 context는 시간이 있는 항목 우선 → 시간 오름차순 → 기존 안정적인 원본 순서를 따른다. React의 동률 처리와 원본 prototype의 미정/지난 미완료 기본 순서는 세부 차이가 있으므로, 전역 동률·미정 정렬 정책을 새로 바꾸지 않는다. 날짜 정렬 일치 시험은 먼저 서로 다른 시간과 확정 source 순서를 사용하고, 동률 fixture에는 사용한 tie-break 규칙을 명시한다.

수동 순서는 해당 context의 ref에만 투영한다. 삭제/이동으로 현재 그룹에 없는 ref는 **읽기 결과에서만** 제외하고 새 ref는 기본 순서로 덧붙인다. selector를 호출했다는 이유로 저장 배열을 정리하지 않는다. 잘못된 ref·중복·권한 밖 ref를 전달한 reorder는 적용하지 않는다.

오늘/주간/월간 목록, 이동 패널 peer, 메뉴/키보드/드래그/길게 누르기, 결과 표시의 rank 계산이 같은 context adapter를 소비해야 한다. 결과 전체를 화면의 날짜 목록처럼 다시 정렬하거나 Personal Plan order를 대체하지 않는다. 기존 결과 projection에서 TimelineOrder를 소비하던 범위를 고쳐 연결하고, 날짜·원문·완료 결과가 변하지 않는지 따로 검사한다.

### 4.3 날짜가 바뀔 때

시계 주입값 갱신·탭 복귀·자정 통과는 **읽기 갱신**이다. 기존 task.date, 원문 날짜, 날짜 이동 shadow, 완료 시각, seed fixture, payload bytes를 변경하지 않는다. `TODAY` 문자열을 파일 전체에서 현재 날짜로 치환하면 seed/기존 검증/완료 시각 fallback/결과 anchor까지 바뀌므로 금지한다. fixture 기준값, 구버전 decoder 기준값, 화면용 현재 날짜를 분리한다.

진행 중인 순서 동작은 시작할 때의 기준일·state revision·context·peer 집합을 ticket으로 보관한다. 자정/복귀/다른 변경으로 의미가 달라졌으면 적용 전에 다시 확인하여 취소하고 재선택하게 한다. 오래된 ‘오늘’ 동작을 새 날짜에 적용하거나 뒤따르는 synthetic click으로 완료시키지 않는다. 날짜 이동의 기존 now/날짜 결정 계약은 별도 입력으로 유지한다.

## 5. 구 정렬 호환: 읽기와 저장을 분리

### 5.1 먼저 보호할 사실

기존 standalone `orders.today/week/month`에는 정렬별 timestamp나 수정 revision이 없다. state.updatedAt은 다른 행동으로도 바뀌므로 ‘마지막으로 의도한 순서’를 알 수 없다. 현재 `resultContextRank`의 today→week→month 우선순위를 사용자의 우선 선택으로 간주하면 안 된다.

구버전 payload는 **그 버전의 고정 기준일과 rolling-week 규칙**으로 먼저 검증한다. 새 월~일 집합으로 구 배열의 길이를 검사하지 않는다. 유효한 v1을 읽고 새 날짜 그룹을 투영하는 동안 setItem/removeItem/clear는 0회이며 입력 bytes와 객체는 그대로다. 알려지지 않은 버전·anchor·잘못된 ref 집합은 ‘대충 맞는’ 데이터로 복구하지 않는다.

### 5.2 날짜별 호환 판정

1. 원본 payload 유효성, 구 context의 ref 집합, 각 ref의 사본 소유권을 구 decoder로 확인한다.
2. 각 view 배열에서 해당 실제 날짜의 ref만 추출한다. 화면 밖 날짜와 Flow/폴더 order는 버리지 않고 원본에 남긴다.
3. 원본 membership과 현재 날짜 집합의 대응을 증명할 수 있는 완전한 후보만 우선 비교한다. 유효한 후보 하나, 또는 여러 후보가 동일한 전체 순서를 가리킬 때 `legacy-unambiguous`로 읽기 투영할 수 있다.
4. 같은 ref의 상대 순서가 다르거나 부분 후보에서 유일한 순서를 증명할 수 없으면 `legacy-conflict`/`legacy-unresolved`다. 임의 연결·다수결·today 우선·updatedAt 추정은 하지 않는다.
5. 충돌 context는 같은 날짜의 기본 시간순으로 **임시 표시**하고 충돌 안내를 제공한다. 기존 수동 순서를 새로 저장한 것으로 표시하지 않는다. 그 context의 재정렬/시간순 복귀는 미해결 상태에서 차단한다. 완료·메모 등 독립 행동은 구 데이터 보존을 증명한 경우에만 계속 허용한다.

부분 후보 병합을 허용하려면 별도 precedence 검증과 유일한 결과 증명이 필요하다. 이번 최소안은 모호한 부분 병합을 구현하지 않는다. 이 제한은 손상된 전체 payload를 유효하다고 인정하는 우회 경로가 아니다. 전체 payload 손상은 기존 fail-closed 경계를 유지하고, **유효하지만 서로 다른 구 순서**만 context 단위 fallback으로 처리한다.

### 5.3 저장 방식 비교와 권고

| 안 | 장점 | 위험·판정 |
|---|---|---|
| 구 orders를 지우고 새 날짜별 배열로 즉시 변환 | 단순한 reader | 충돌 의도와 과거 배열 소실. 읽기 중 migration. **제외** |
| 같은 key/같은 버전에 새 필드 추가 | 한 번의 workspace write로 저장 가능 | 구 HTML이 새 필드를 무시한 뒤 전체 state를 써서 새 기록을 없앨 수 있음. 정렬 후 reset 시 구 순서가 재등장할 수도 있음. **그대로 채택하지 않음** |
| 같은 key에 workspace envelope version만 올림 | 새 reader는 v1/v2 분기 가능 | 현재 구 HTML은 unknown/corrupt를 seed로 열고 후속 workspace 저장을 막는 공통 guard가 보이지 않음. 구 HTML 재열기 안전성을 주장할 수 없음. **이 위험 해결 전 채택 금지** |
| 새 PoC 전용 key에 versioned workspace checkpoint, 구 key는 읽기 전용 보존 | 구 HTML이 새 checkpoint를 덮어쓸 수 없고 원본 bytes 보존 가능. 현재 상태+Undo+정렬 호환 metadata를 같은 payload로 저장 가능 | 새/구 HTML이 서로 다른 checkpoint를 보여 줄 수 있음. 우선 reader, 기준 fingerprint, 구 key 변경 감지, handoff rollback 및 Undo version 처리가 필요 |
| 정렬만 별도 sidecar key로 저장 | 본문 schema 변경 폭이 작음 | 본문/정렬/Undo 사이 복수-key 정합성 및 새 Undo lane 필요. 지금의 단일 Undo 기대를 깨기 쉬움. 단순 대안으로 보지 않음 |

**개발 설계 권고는 새 PoC key의 versioned checkpoint 안을 먼저 검증하는 것**이다. 예시 suffix는 `flow:poc:personal-workspace:v1:standalone-integrated:workspace-v2`이며, 이름·버전은 구현 전 확정할 PoC 교체 가능 계약이다. 이것은 계정/운영 migration이나 영구 제품 schema 승인이 아니다. 새 버전 우선 읽기와 구 버전 read-only fallback은 허용하되, 열기만으로 checkpoint를 쓰거나 사본을 추가하지 않는다. 첫 명시적 성공 변경에서만 저장한다.

실행 전 아래 조건을 설계·단위 시험으로 충족해야 한다. 조건이 성립하지 않으면 당장 같은 key를 덮어쓰는 축약안을 쓰지 말고, selector read-only와 해당 legacy context의 변경 차단까지만 제공한다.

- 새 checkpoint에는 현재 state, 기존 단일 Undo 의미, 변경하지 않은 구 timeline order 배열, 그 배열의 구버전 membership/anchor 근거, 해소 여부를 검증 가능한 형태로 함께 보관한다. 구 snapshot의 유효성 검증을 현재 task 날짜 집합에 다시 결박하지 않는다.
- 순서가 명확한 구 context는 동일 순서로 투영한다. 사용자 reorder가 새 canonical record를 만들면 그 context의 legacy 재적용을 끝냈다는 metadata를 남긴다. 이후 reset은 **그 canonical TimelineOrder만 제거**한다. 구 수동 순서가 다시 살아나지 않아야 한다. 다른 날짜의 order나 원본 배열은 지우지 않는다.
- 충돌을 사용자에게 선택하게 하는 UI는 별도 설계 승인 전 만들지 않는다. 가장 안전한 bounded fallback은 충돌 날짜의 시간순 읽기 + 순서 변경 차단 + 원본 보존이다. 새로운 우선순위 제품 정책을 요구하지 않는다.
- 구 key의 baseline bytes fingerprint를 기준으로 구 HTML/다른 탭의 변경을 감지한다. 감지 시 자동 merge나 최신 추정 없이 두 저장본을 보존하고 새 쓰기를 멈춘다. 구 HTML에서도 최신 상태가 보인다고 보장하지 않는다.
- 새 key가 존재하지만 손상/unknown이면 구 key나 seed로 내려가 덮어쓰지 않는다. 저장 실패는 새 key의 이전 bytes, 이전 UI, 이전 Undo를 유지하고 recovery 확인 실패 시 추가 변경을 잠근다.
- 첫 성공 변경의 Undo가 구 v1 상태를 돌려줄 경우에도 새 key 안에서 검증·복원한다. 그 때문에 구 key를 재작성하지 않는다. 다른 action 후에도 archived orders 전체 정리 루프가 원본 배열을 바꾸지 않는다.
- 버전 상수는 workspace 전용으로 분리한다. 현재 공용 `VERSION`을 올려 authoring draft/creator/source candidate의 버전까지 바꾸지 않는다. 새 workspace key를 쓰는 명시적 handoff의 기존 draft 제거/rollback 경계도 검사한다.
- 새 key 추가가 정확-prefix 초기화 목록과 자동 쓰기 감시에서 빠지지 않게 한다. 초기화 기능 사용은 이번 설계 작업에서 실행하지 않는다. `localStorage.clear()`나 운영 `flow:*` 쓰기는 계속 금지다.

위 내용은 **후속 구현 전 검증할 기술 계약**이다. 구 HTML과 새 checkpoint의 동시 편집·완전 병합, 다중 기기 동기화는 이번 단계에서 약속하지 않는다. 이 호환 범위가 승인된 구현 범위를 넘는다고 판단되면 해당 저장 선택지만 주 작업자에게 결정 요청하고, 원본 조사와 순수 selector 검증은 계속할 수 있다.

## 6. transition 및 화면 연결 순서

1. 구 decoder/새 날짜 selector를 분리하고 clock·context adapter 계약을 순수 모델 시험으로 고정한다. 이 단계는 read-only다.
2. legacy 판정과 선택한 저장 전략의 lossless/rollback/Undo 검증을 통과시킨다. 이때까지 구 orders를 정리하거나 실제 저장본을 바꾸지 않는다.
3. reorder/reset의 입력을 `context + contextKey + expectedRefs/revision`으로 연결한다. Flow/폴더 정렬 action은 그대로 둔다. 모든 입력 경로를 같은 함수로 모은다.
4. 오늘·주간은 날짜 그룹으로, 월간은 기존 날짜 heading 아래 실제 date context로 연결한다. 지난 미완료/미정도 독립 context다. 이동 패널 peer와 pointer hit-zone 검사를 함께 바꾼다.
5. 직접 정렬/시간순 복귀, 중립/취소/저장 오류 상태를 연결한다. UI에서 가능하다고 표시한 뒤 모델이 거절하는 충돌 경로가 생기지 않게 한다.
6. 결과 rank 소비 지점, 완료/재열기, 날짜 이동, Undo, reload 및 K1-A/K2-A 관련 회귀를 확인한다. 새 전역 Undo 기능이나 여러 단계 Undo를 추가하지 않는다.

## 7. 예정 검증 inventory

아래는 **설계된 시험 항목**이며 실행 개수가 아니다. fixture × runtime × viewport 반복 수와 독립 사용자 시나리오 수는 실제 등록 후 구분해 보고한다.

| ID | 순수 모델/저장 검증 | 핵심 판정 |
|---|---|---|
| M01 | 화/일/월, 월말·연말·윤년 기준일 | 월~일 경계, 당월 범위; 다음 월요일 혼입 0 |
| M02 | 전날 미완료·완료, 오늘 미완료·완료, 미래, null | 오늘/지난 미완료/주간/월간/미정 ref 집합 정확 |
| M03 | 잘못된 기준일·서로 다른 시간대의 로컬 자정 | 임의 fixture fallback 0, date-only 연산 정확, read mutation 0 |
| M04 | 같은 날짜 수동 정렬 후 각 view projection | 세 view 동일 순서, 다른 날짜/Plan/folder/time/완료/메모 불변 |
| M05 | 같은 제목·다른 사본·Flow/Quick 혼합 | title 기반 충돌·중복 0; ref 소유권 검증 |
| M06 | reorder/noop/reset/Undo, stale refs/revision | reset 해당 record만 제거, Undo exact 순서, 거절 시 객체/bytes 불변 |
| M07 | 지난 미완료의 완료/재열기·다음 날 기준일 | aggregate와 각 날짜 order 독립, clock 이동 자체 저장 0 |
| M08 | 유효한 구 today/week/month의 하나·일치·충돌·부분·잘못된 배열 | 구 decoder 유지, 명확/충돌/손상 분리, 우선순위 추정·전체 reset 0 |
| M09 | 구 orders 보존 후 새 reorder→reset→Undo→reload | legacy order 재등장 방지, 다른 context 불변, archived 배열 보존 |
| M10 | 구 key만 있음/새 key 있음/새 key 손상/양쪽 변경/unknown version | 원본 bytes 보존, 손상을 seed로 덮어쓰지 않음, 동시 편집 감지 |
| M11 | 읽기 오류/Quota/readback 불일치/rollback 실패/첫 checkpoint Undo | 마지막 성공 상태·Undo 유지 또는 recovery lock; 부분 성공 0 |
| M12 | 날짜 이동/완료/새 Item/휴지통 후 과거 배열 membership | 구 배열을 현재 집합으로 자동 정리하지 않음; 안전하지 않으면 bounded 거절 |
| M13 | result projection/TXT/회차 ref 연결 | 기존 소비 범위의 order 일치, 원문·sourceChecked·개인 완료·반복 identity 보존 |

| ID | 실제 브라우저로 실행할 사용자 흐름 | 필요한 증거 |
|---|---|---|
| B01 | 같은 주입 기준일로 오늘→주간→월간→미정 | runtime별 clock/날짜 metadata, 그룹별 ref/heading, 운영 key before/after |
| B02 | 오늘 한 날짜에서 reorder→주간→월간→오늘→reload | 날짜별 ordered refs 및 수동 표식; 다른 날짜 불변 |
| B03 | 메뉴/드래그/길게 누르기/키보드로 동일 reorder, 해당 날짜 reset, Undo | 동일 transition/context, 성공 횟수와 정확한 복원 순서 |
| B04 | 지난 미완료 완료→원래 날짜/결과 확인→재열기→Undo | 기간 포함 여부와 개인 완료 ownership; K2-A 동작 유지 |
| B05 | 월간 빈 날짜 펼침/접기→날짜 추가→날짜 이동 | 숨겨진 행 삭제 0, 추가 날짜 정확, source/folder 불변 |
| B06 | 같은 위치/취소/Escape/pointer cancel/창 크기 변경/도중 자정 | 성공 mutation 0, synthetic click 누출 0, 이전 Undo 유지 |
| B07 | legacy 일치/충돌/손상/구 HTML 이후 재열기 | 원본 bytes, conflict 안내·차단, 안전한 다른 행동, 자동 merge/reset 0 |
| B08 | 저장 오류/재시도/새 checkpoint reload/첫 변경 Undo | 실패 before bytes, 성공 후 복원, prefix 밖 set/remove/clear 0 |
| B09 | 390×844, 375×812, 844×390, 1024×768, 1440×900 | 날짜 그룹·지난 미완료·reset·월간 toggle/add·왼쪽 목적지·오른쪽 통로 접근 |

브라우저에서는 가로 넘침 `max(0, scrollWidth - innerWidth) === 0`, 핵심 버튼의 스크롤 후 전체 노출·중심 hit-test, 키보드 접근, console error/page error 0을 검사한다. 화면을 캡처한 것만으로 drag/긴 누름/키보드 성공을 대신하지 않는다. B09의 다섯 해상도를 별도 제품 시나리오 다섯 개로 부풀리지 않는다. 실제 Android Chrome/iOS Safari, OS 수준 입력, 관찰 사용자 검사는 자동화와 별도로 기록한다.

K2-A Today 회귀는 React `2026-09-05`, standalone fixture `2026-09-02`를 각각 사용했으므로 같은 오늘 계산의 증거가 아니다. K2-B에서는 두 runtime에 **같은 명시 기준일**을 주입한 비교 증거가 새로 필요하다.

## 8. 평가와 완료 판정

Flow UX 리뷰 기준으로 제거할 것은 평면 기간 목록 때문에 반복되는 안내, 각 view마다 별도 순서를 저장한다는 오해, 전역 정렬 reset이다. 날짜 heading, 소속·시간, 실패 원인, 충돌 차단, Undo 접근과 키보드 경로는 남긴다. 이번에는 코드/설계만 검토했으므로 시인성·접근성의 종합 점수나 화면 PASS를 부여하지 않았다.

완료 조건은 원본 요구별 M/B 근거 연결, 같은 날짜 순서 일치, 구 정렬 비파괴 호환 또는 명시적 bounded 차단, 운영 bytes 동일, 관련 회귀·전체 시험·production build·다섯 viewport 결과의 분리 보고다. 충돌 payload에서 의도를 복구하지 못한 상태를 ‘전체 legacy 호환 완료’라고 쓰지 않는다. 원장에는 구현/코드 확인/자동 시험/브라우저/미검사를 각각 남긴다.

이 문서 작업에서 제품 변경·제품 시험·브라우저·실제 기기 검사는 수행하지 않았다. 문서 검증 `npm.cmd run docs:check`는 PASS(필수 파일 16개, 로컬 링크 4,820개)였고, 지정 문서 경로의 `git diff --check`는 오류가 없었다. 새 파일은 아직 untracked이므로 diff 결과만으로 본문 검토를 대신하지 않았다. 관찰 사용자 수 0. commit·push·PR·Preview·Production은 진행하지 않았다. 다음 구현의 선행 결정은 §5.3 저장 전략과 복구 계약이며, 전반적인 UX 개편이나 새 영구 정책의 확정이 아니다.
