# P23 실행 라이프사이클 마감 감사

## 1. 전체 판정

P23-00에서 Blocking으로 분류했던 개인 structural overlay와 단일 projection 계약은 구현됐다. 개인 draft에서 add/delete/restore/reorder가 stable ID와 tombstone/orderOverride로 저장되고, 날짜 없음·종일·timed·반복 schedule과 occurrence run state가 분리됐다. Calendar, ICS, checklist, sheet, memo는 같은 effective state를 읽는다.

상세 시뮬레이션에서 새로 확인된 핵심 단절 두 개도 수정했다.

1. 날짜 없는 source-backed 체크리스트 항목에 개인 날짜를 지정·변경·제거하는 입구를 P23-05A에서 연결했다.
2. Flow Map direct save 후 기준일을 다시 바꿀 수 없는 문제를 P23-05B에서 해결했다. 상대 일정은 재계산되며 따로 바꾼 항목 날짜와 메모는 유지된다.

따라서 **P23 local MVP lifecycle contract는 완료**다. 단, product-wide parity와 production release는 별도다.

## 2. P23 전후

| 영역 | P23-00 | 현재 |
| --- | --- | --- |
| 개인 항목 구조 | missing | 개인 draft에서 add/delete/restore/reorder supported |
| 날짜 없는 항목 일정화 | missing | 개인 draft + 저장 source-backed 체크리스트 supported |
| 종일·시간 | partial/hidden | 개인 draft에서 UI·Calendar·ICS·list export connected |
| 반복 회차 | partial | 개인 draft series/revision/occurrence/run 분리 |
| 완료·재개·skip·hold | 의미 혼재 | 개인 occurrence에서 distinct, source-backed는 partial |
| 과거 실행 | summary only | item snapshot·회고·list export·new run supported |
| direct save 기준일 수정 | missing | 390/1024에서 supported |

## 3. Flow 유형별 결과

### 1. 기준일 역산형

- Persona: 이사 30일 전, 원룸 이사 일정을 저장한 사용자
- 판정: **supported**
- 현재: direct save에서도 이사일 바꾸기가 390/1024에 보이고 상대 일정만 재계산된다.
- 남음: source-backed 항목 add/delete/reorder는 차단 상태다.
- 여정: 공개 Flow Map 저장 → 이사일 재설정 → 개별 할 일 날짜·메모 유지 → Calendar·ICS 확인 → 완료·회고·다시 쓰기

### 2. 날짜 없는 체크리스트형

- Persona: 여행 전 필요한 것만 체크하고 일부를 일정에 넣는 사용자
- 판정: **supported**
- 현재: 날짜 없는 source-backed 항목도 개인 날짜를 정하고 없앨 수 있다.
- 남음: 구조 변경은 source merge 정책 때문에 제공하지 않는다.
- 여정: Flow 저장 → 항목 완료·완료 취소 → 날짜 지정 → 날짜 변경·제거 → Calendar·ICS/list export 확인

### 3. 반복 루틴형

- Persona: 운동·학습 루틴을 반복하고 한 회차를 미루거나 건너뛰는 사용자
- 판정: **partial**
- 현재: 개인 draft는 series/occurrence/run 상태를 분리해 전 여정이 동작한다.
- 남음: source-backed 반복 Flow에는 같은 occurrence 실행 control이 없다.
- 여정: 날짜·시간 지정 → daily/weekly/monthly 반복 → 회차 완료·재개 → 건너뜀·보류 → Calendar·반복 ICS 확인

### 4. 순서·일정 혼합형

- Persona: 여행·프로젝트 준비 순서를 자기 방식으로 재구성하는 사용자
- 판정: **supported**
- 현재: stable personal ID와 orderOverride가 새로고침, Calendar, export 전반에서 유지된다.
- 남음: drag-and-drop은 의도적으로 제외했고 source-backed 구조 편집은 차단했다.
- 여정: 개인 draft 저장 → 항목 추가·삭제·복구 → 위/아래 이동 → 날짜·시간 지정 → 모든 destination 확인

### 5. 기록·메모형

- Persona: 냉장고 재고와 실행 메모를 남기고 시트로 가져가는 사용자
- 판정: **partial**
- 현재: 콘텐츠별 field와 portable output은 유지되며 public 저장 전·후 경계도 분명하다.
- 남음: 사용자 정의 field add/delete/order는 runtime에 없다.
- 여정: 공개 workbench 확인 → Flow 단위 저장 → 기록·메모 입력 → sheet·memo export → 완료 후 회고

### 6. 개인 초안형

- Persona: 준비된 Flow가 없는 URL·메모를 직접 실행 초안으로 만드는 사용자
- 판정: **supported**
- 현재: P23 structural/schedule/run projection의 기준 구현이다.
- 남음: 실제 AI 생성은 없으며 제안 shell을 사용자가 직접 다듬는다.
- 여정: miss 초안 시작 → My Flow 저장 → 구조·일정·반복 편집 → 완료·회고 → Calendar와 portable export → 다시 쓰기

## 4. 남은 Blocking / High

### Product release blocking

1. **계정·DB·다른 기기 복원 없음:** 현재 데이터와 과거 run은 localStorage 및 사용자가 만든 backup에 머문다.
2. **정식 사용자 관찰 0명:** owner feedback은 반영했지만 첫 사용자의 발견성·이해·재방문은 자동화로 판정할 수 없다.

### High

1. **source-backed 구조 편집 parity:** add/delete/reorder를 열려면 source v2와 personal tombstone/order의 three-way merge 및 orphan UI가 선행돼야 한다.
2. **실행 상태 parity:** skipped/held occurrence control은 개인 반복 draft에만 있고 source-backed 반복 Flow에는 없다.
3. **편집 발견성:** 일부 항목 수정은 모바일에서 Flow 열기→항목 열기→수정까지 3~4단계다.

이 세 항목은 P23 중 추가 UI로 억지로 닫지 않았다. 첫째는 데이터 계약, 둘째는 product policy, 셋째는 관찰 evidence가 먼저다.

## 5. Medium / Low

- Calendar-heavy 화면은 overflow 없이 동작하지만 월간 grid와 선택일 agenda를 한 full-page capture에서 보면 시각 밀도가 높다.
- 긴 과거 run은 기본 접힘 상태라 현재 실행을 밀지 않지만, 24개 이상 항목을 펼친 뒤 검색/요약 필요성은 관찰되지 않았다.
- 모바일 full-page screenshot에서는 fixed header/footer가 긴 문서 중간 콘텐츠 위에 겹쳐 보인다. 실제 viewport horizontal overflow는 0이며, scroll context의 체감은 실제 기기 관찰이 필요하다.
- 날짜 native input의 브라우저 placeholder와 편집 폼 밀도는 device/browser별 확인이 필요하다.

## 6. 소유권과 파괴적 행동

| 소유자 | 값 | 복구 원칙 |
| --- | --- | --- |
| source/version | canonical title/detail/order/schedule/source version | 개인 수정으로 덮어쓰지 않음 |
| personal structural overlay | user item, tombstone, restore, order, personal schedule | soft delete와 stable ID 유지 |
| execution run | pending/done/reopened/skipped/held, feedback, completion snapshot | 구조 membership과 분리, 과거 run 보존 |

완료는 체크박스로 되돌릴 수 있다. 삭제는 personal draft에서 tombstone과 즉시 undo/지속 복구를 사용한다. source-backed 삭제는 아직 열지 않는다.

## 7. Projection 판정

- 날짜 없는 user item은 My Flow/checklist/sheet/memo에 남고 Calendar/ICS에서는 제외된다.
- scheduled item은 모든 현재 destination에 같은 title/date/time/memo로 반영된다.
- tombstoned/excluded item은 현재 projection에서 제외되지만 source와 과거 run은 보존한다.
- 완료·완료 취소는 structural membership을 바꾸지 않는다.
- 과거 run은 checklist/sheet/memo만 다시 제공하고 Calendar/ICS는 중복 방지를 위해 제공하지 않는다.

## 8. 다음 권장 순서

### Now: 관찰 gate

5명 × 3회로 발견→저장→수정→실행→완료 취소→export→재방문을 관찰한다. 이 단계 전에는 편집 입구를 또 재배치하지 않는다.

### Next: P24-01 source version merge contract

source v2 added/changed/removed Item과 personal tombstone/order/user Item을 병합하는 pure contract, orphan 정책, preview를 먼저 만든다. UI는 그 뒤에 연다.

### Next: P24-02 실행 상태 parity

source-backed 반복 Flow에도 occurrence skip/hold가 필요한지 관찰로 확인한 뒤 동일 run-state adapter를 연결한다.

### Later

계정·DB·cloud sync, 직접 Calendar/Notion/Todo 연동, 사용자 정의 record field builder는 별도 product/operations milestone로 둔다.

## 9. 실제 사용자에게 확인할 질문

1. "이사일 바꾸기"와 개별 "날짜 바꾸기"의 차이를 설명 없이 이해하는가?
2. 날짜 없는 체크리스트에서 Calendar에 넣을 항목을 어디서 찾는가?
3. 삭제, 제외, 이번만 건너뛰기, 잠시 보류를 서로 다른 의미로 이해하는가?
4. 완료 취소를 바로 발견하는가?
5. 위/아래 이동이 drag-and-drop 없이도 충분한가?
6. 반복 한 회 완료와 Flow 전체 완료를 구분하는가?
7. checklist/sheet/memo와 ICS 중 실제로 다시 쓰는 결과물은 무엇인가?
8. 과거 실행에서 항목 전체가 필요한가, 요약과 회고면 충분한가?
9. 원본 새 버전이 왔을 때 삭제했던 항목이 다시 생기길 기대하는가?
10. 여러 기기 사용과 데이터 복원은 첫 유료 가치 전에 필요한가?

## 10. 검증 경계

- current command: full unit 476/476, docs 14 files·2,166 links, production build pass, lifecycle capture 14 records.
- security audit: high/critical 0, moderate 2. "postcss <8.5.10" advisory GHSA-qx2v-qp2m-jg93이며, "npm audit fix --force"가 제안하는 breaking downgrade는 적용하지 않았다.
- current repo artifact: P23 16개 단계별 evidence source와 55개 screenshot.
- actual observed user: 0명.
- full Playwright suite 전체는 이번 마감 턴에서 실행하지 않았다. 핵심 P23 journeys와 URL-first/public/workbench 63개 회귀를 실행했다.

자동 QA pass를 사용자 이해나 상용 출시 판정으로 바꾸어 말하지 않는다.
