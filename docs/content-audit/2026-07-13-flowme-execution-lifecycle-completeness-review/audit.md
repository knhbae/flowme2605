# P23-00 실행 라이프사이클 감사

## 1. 전체 판정

현재 FlowMe는 단순 저장 데모를 넘어섰다. 완료 체크를 다시 취소할 수 있고, 일정이 있는 항목은 개인 날짜·시간·메모로 조정되며, Calendar와 portable export가 그 값을 읽는다. 전체 완료 뒤 회고와 새 실행도 존재한다.

다만 제품 약속을 “어떤 Flow든 저장한 뒤 내 상황에 맞게 구조와 일정을 조정하고, 같은 상태를 Calendar와 외부 파일에서 재사용한다”로 잡으면 아직 **partial**이다. 값 편집은 상당 부분 열렸지만 구조 편집은 닫혀 있고, 저장 ingress에 따라 기준일 설정 가능 여부가 달라지며, run 상태와 export 정책도 두 builder 계열에 분산돼 있다.

## 2. Blocking / High 발견

### Blocking

| 항목 | 현재 상태 | 왜 먼저 닫아야 하나 |
| --- | --- | --- |
| 개인 구조 overlay 없음 | add/delete/tombstone/restore/order override가 없음 | 사용자 변경과 source update를 병합할 stable 구조가 없다. UI만 추가하면 원본 덮어쓰기 또는 orphan 유실 위험이 생긴다. |
| canonical effective Item runtime 미구현 | contract는 승인됐지만 현재 storage/export는 여러 키와 builder를 읽음 | My Flow, Calendar, export가 같은 상태를 읽는다는 invariant를 장기적으로 보장할 수 없다. |

### High

| 항목 | 판정 | 근거 |
| --- | --- | --- |
| 날짜 없는 체크리스트에 날짜 추가 | missing | 여행 체크리스트 상세에 date input 0. [s04](./screenshots/04-undated-checklist-edit-mobile.png) |
| 기준일 수정 ingress parity | partial | URL draft에는 설정이 있지만 Flow Map direct save에는 entry 0. [s02](./screenshots/02-moving-flow-overview-mobile.png), [s13](./screenshots/13-url-draft-settings-mobile.png) |
| 완료·건너뜀·제외·삭제 의미 | partial | 완료/reopen은 run, include/exclude는 overlay, skip은 일부 workbench, delete는 없음. |
| export status policy | partial | full-flow와 portable-step export가 완료/skip을 다르게 읽는다. |
| 편집 발견성 | hidden | 제목/메모/일정 수정이 모바일에서 약 4~5 interaction depth다. |
| 반복 회차와 Flow 종료 | partial | 반복 editor는 있으나 occurrence 완료와 Flow 전체 완료의 사용자 의미가 분명하지 않다. |

## 3. 이미 지원되지만 숨겨진 기능

1. **완료 취소:** 체크박스 accessible name이 `완료 체크`에서 `완료 취소`로 바뀌고 다시 미완료로 전환된다.
2. **일정이 있는 항목의 날짜·시간·장소·메모 수정:** My Flow 항목 상세의 `메모·일정` 안에 있다.
3. **반복 범위 수정:** 이번 이벤트만/이번 이후/모든 이벤트, 요일, 종료일을 지원한다.
4. **개인 사본 include/exclude:** URL draft 또는 personal copy 설정에서 가능하다.
5. **Flow 숨김/데이터 관리:** Flow 단위 정리는 가능하지만 task delete와 같은 개념으로 보일 위험이 있다.
6. **완료 Flow 재사용:** 새 기준일과 고정 날짜 유지 정책을 선택하고 이전 run을 보존한다.

## 4. 실제 미지원 기능

- undated 일반 항목에 날짜를 붙이기
- source-dated 항목을 명시적으로 `날짜 없음`으로 만들기
- 사용자 항목 추가
- 항목 삭제와 tombstone
- 삭제 항목 복구/undo
- 개인 순서 변경
- 개인 구조 변경을 source 새 버전과 three-way merge
- 전체 과거 run의 item-level 상세 탐색과 선택적 재-export
- 계정 기반 다른 기기 복원

## 5. Flow 유형별 사용자 여정

### 기준일 역산형: 이사 준비

- 발견/저장/오늘 실행/Calendar: supported
- 항목 완료/완료 취소: supported
- 기준일 변경: 저장 ingress에 따라 partial
- 개별 날짜 override: scheduled row에서 hidden
- add/delete/reorder: missing
- source update: stable step review는 partial, personal structure merge는 blocked

### 날짜 없는 체크리스트형: 여행 준비

- 순서대로 보기/완료/완료 취소/checklist export: supported
- 제목·메모 수정: hidden
- 날짜 추가: missing
- 시간·장소·반복만 있는 편집 화면은 사용자 mental model과 어긋난다.
- 개인 순서 변경과 항목 구조 조정: missing

### 반복 루틴형: 영어 학습/운동

- 반복 schedule과 적용 범위: supported but hidden
- one occurrence edit: supported
- occurrence 완료와 Flow 종료 구분: partial
- skipped occurrence와 휴식/보류 의미: 정책 불충분

### 순서·일정 혼합형: 여행/프로젝트 준비

- source order 표시: supported
- 개인 reorder: missing
- 일부 항목만 일정화: missing for undated regular rows
- 외부 checklist/sheet에 개인 순서 반영: 구조 override가 없어 missing

### 기록·메모형: 냉장고 정리

- content-specific workbench와 sheet/memo artifact: supported
- generic user-defined record Field와 history: partial/missing
- 같은 canonical Item/Field 모델은 spec에만 있고 runtime adapter는 아직 아니다.

### 개인 초안형: URL-first miss

- miss → 3개 초안 item → 기준일 → My Flow 저장: supported
- 저장 후 title/date/memo/include-exclude: supported/hidden
- 저장 전 또는 후 item add/delete/reorder: missing
- 초안 구조는 제안 shell에 고정돼 있어 “내가 만든 Flow” 자유도는 아직 낮다.

## 6. 상태와 소유권

권장 소유권은 아래와 같다.

| 계층 | 소유 값 | 현재 상태 |
| --- | --- | --- |
| source/version | 원문, canonical title/detail/order/schedule, provenance | 존재하지만 model generation이 여러 세대에 걸쳐 있음 |
| personal overlay | include, alias, personal memo, schedule override, user item, tombstone, order | alias/memo/date/include만 일부 존재 |
| execution run | done, reopened, skipped, held, decision, record value | done/reopen 강함, skip/held/occurrence 의미 partial |
| version resolution | source v1 ↔ v2와 personal overlay 병합 | 일부 source-backed review만 존재 |

현재 가장 위험한 점은 personal overlay가 값 수정과 구조 수정으로 나뉘지 않은 것이 아니라, **구조 수정 표현 자체가 없다는 것**이다. add/delete/reorder UI를 먼저 붙이면 stable ID, tombstone, source update merge, export inclusion이 동시에 흔들린다.

## 7. My Flow / Calendar / export 비교

| 상태 | My Flow | Calendar | checklist/sheet/memo | 판정 |
| --- | --- | --- | --- | --- |
| alias/date/memo overlay | 표시 | dated item 표시 | portable export 표시 | supported for dated overlay |
| top-level done | 표시 | 표시/일부 ICS status | portable step에는 없음 | partial |
| skip | 일부 surface | ICS는 제외 | text/sheet는 상태로 남음 | partial |
| personal exclude | row 제거 | 제거 | 제거 | hidden, 설명 부족 |
| delete | 없음 | 정책 없음 | 정책 없음 | missing |
| undated | My Flow 표시 | 미표시 | checklist/sheet/memo 표시 | supported projection, but scheduling connector missing |
| personal order | 없음 | 해당 없음 | source order만 사용 | missing |

자세한 destination별 판정은 [export-projection-matrix.json](./export-projection-matrix.json)을 본다.

## 8. 파괴적 행동과 복구

- 완료는 reversible해서 파괴적이지 않다.
- include/exclude는 reversible하지만 실행 상태와 personal content 편집이 섞여 보일 수 있다.
- Flow 숨김은 데이터 관리에서 되돌릴 수 있으나 task delete 모델을 대체하지 않는다.
- task delete는 만들기 전에 soft tombstone, 즉시 undo, trash/recover, source update orphan 정책을 확정해야 한다.
- user-created item과 source item을 같은 delete semantics로 처리하면 안 된다. source item 삭제는 personal tombstone이고 user item 삭제는 개인 객체 soft-delete다.

## 9. P23-01~P23-05 권장 순서

### P23-01 Personal structural overlay

stable Item ID를 기준으로 `userItems`, `itemTombstones`, `orderOverride`, `includedItemIds`를 정의한다. source를 덮어쓰지 않고 local runtime adapter부터 추가한다. add/delete/restore/reorder의 최소 UI와 unit tests를 함께 연다.

### P23-02 Optional scheduling

모든 executable Item에 `unscheduled ↔ scheduled` 전이를 연다. source schedule 복귀와 정말 날짜 없음 전환을 분리하고 time/repeat/location을 같은 editor에 둔다.

### P23-03 Execution status semantics

`pending/done/skipped/held`를 run state로 고정하고 personal exclude/tombstone과 분리한다. routine occurrence done/skip과 Flow completed를 분리하고 immediate undo를 일관되게 둔다.

### P23-04 Unified effective projection

한 resolver가 source + overlay + run + occurrence를 merge하고 My Flow, Calendar, checklist, sheet, memo, ICS가 같은 effective Item list를 읽게 한다. 상태별 golden matrix를 테스트한다.

### P23-05 Reuse, version merge, history

source v2에서 added/changed/removed Item을 personal user item/tombstone/order와 three-way merge한다. orphan을 보존하고 과거 run 상세·재-export를 제공한다.

## 10. 실제 사용자에게 확인할 질문

1. 완료 취소 아이콘/라벨을 설명 없이 발견하는가?
2. `제외`와 `이번에는 건너뜀`을 서로 다른 행동으로 이해하는가?
3. 날짜 없는 체크리스트에서 몇 개 항목만 Calendar에 넣는 흐름을 어디서 기대하는가?
4. 항목 삭제 후 즉시 undo와 별도 휴지통 중 무엇을 기대하는가?
5. source 항목을 삭제한 뒤 원본 업데이트로 다시 등장하면 어떻게 보여야 한다고 생각하는가?
6. 반복 루틴 한 회 완료와 30일 Flow 전체 완료를 구분할 수 있는가?
7. export에서 완료/skip/exclude 항목을 기본적으로 포함할지 제외할지 destination마다 어떤 기대가 있는가?
8. 이전 실행은 요약이면 충분한가, 항목별 기록·메모·export까지 다시 열어야 하는가?

## 11. 자동화와 실제 관찰의 경계

자동화로 확인한 것은 DOM/상태/persistence/projection/overflow/console이다. “입구를 발견한다”, “상태 의미를 이해한다”, “과거 기록이 충분하다”는 실제 사용자 관찰이 필요하다. P22의 5명 × 3회 관찰이 완료되지 않은 상태라 이번 감사도 product hypothesis를 닫았다고 주장하지 않는다.

## 12. 현재 검증 결과

| 검증 | 결과 |
| --- | --- |
| lifecycle capture | PASS · 14 screenshots · overflow 0 · console error 0 |
| unit tests | PASS · 437/437 |
| URL-first draft targeted E2E | PASS · 1/1 |
| lifecycle targeted E2E | PASS · 7/7 |
| public share/workbench E2E | PASS · 44/44 |
| docs check | PASS · 14 required files · 2,094 local links |
| production build | PASS |
| review HTML browser inspection | PASS · 390px/1024px · overflow 0 · broken image 0 · console error 0 |

위 결과는 현재 자동화와 브라우저 inspection이다. 실제 사용자 관찰 완료를 뜻하지 않는다.
