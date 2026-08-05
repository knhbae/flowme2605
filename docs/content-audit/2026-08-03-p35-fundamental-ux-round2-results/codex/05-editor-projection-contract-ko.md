# Editor & Projection Contract

## 결론

공개·저장·Flow Map editor는 pixel-identical할 필요는 없습니다. 하지만 사용자는 같은 객체를 고치는 동안 다음 문법을 한 번만 배워야 합니다.

- 같은 필드 이름과 순서
- 한 번에 하나의 editor transaction
- Apply/Save 전에는 source·persisted state 불변
- Cancel/Close/Back의 rollback과 focus return
- 지원되는 모든 preview/export에 같은 applied Item 반영

권고 surface는 **전체 높이 sheet**입니다. 별도 page는 깊이가 늘고, 현재 인라인 방식은 보기와 편집을 섞습니다. 이번 390px 런타임 캡처에서는 전체 일정 기준의 anchor control 일부가 고정 하단 navigation에 가려진 구간도 확인했습니다. 이는 모든 inline toolbar의 구조적 충돌이라는 뜻이 아니라 현재 화면 조합에서 재현된 가림입니다.

## 1. 현재 editor 비교

| 경로 | 현재 surface | 필드 | 거래/취소 | 문제 |
|---|---|---|---|---|
| 공개 Flow | 전체 높이 sheet | 이름, 기준일/모드, 포함, 순서, routine | parent Apply/Cancel | description 누락, Item 저장과 outer Apply 관계가 불명확 |
| 공개 Item | child sheet | 제목, 상세, 날짜 | Item 저장→parent draft, outer Apply가 최종 | child `저장`이 영구 저장처럼 들림 |
| 저장 Flow | 기존 내용 아래 inline | 이름, 기준일, 포함 Item, 전체 펼침, batch 조정 | 일부 즉시/Save, dirty guard 약함 | 24개에서 페이지가 길고 실행 맥락과 섞임 |
| 저장 Item | 모바일 중첩 sheet·wide inline inspector | 제목, 날짜/시간/장소/반복, 메모, check/resource | `변경 저장`, dirty prompt | 가장 안정적이나 public Item보다 필드가 많고 viewport별 surface가 다름 |
| 공개 Flow Map | 별도 sheet | 이름, child 선택 | Apply→local, final Save→persist | 일반 Flow와 다른 schema, main preview parity 결함 |

## 2. 공통 transaction 상태 기계

```text
closed
  → open(source snapshot + current personal overlay)
  → clean draft
  → dirty draft
     ├─ apply/save success → closed + new applied/persisted version
     ├─ validation error → dirty draft 유지
     ├─ close/back/cancel → discard confirm
     │   ├─ keep editing → dirty draft
     │   └─ discard → closed + original state
     └─ runtime error → dirty draft 유지 + retry
```

### 상태별 결과

| context | primary label | commit target |
|---|---|---|
| public Flow/Item | `이 내용으로 적용` | 현재 public working overlay |
| saved Flow/Item | `변경 저장` | persisted personal overlay |
| Flow Map public | `이 내용으로 적용` | applied map working overlay |
| final save | `선택한 {count}개로 시작` | saved Flow/Map snapshot |

`이 항목 저장`은 public child editor에서 영구 저장으로 오해됩니다. `Item 조정 적용` 또는 공통 `이 내용으로 적용`이 낫습니다.

## 3. 공통 필드 순서

### Flow editor

1. 계획 이름
2. 기준일·반복 규칙
3. 포함할 Item
4. Item 순서
5. Item 상세 진입
6. 적용 후 결과 요약

### Item editor

1. 제목
2. 상세/내 메모
3. 날짜·시간·장소·반복
4. 확인 항목·자료
5. 포함/제외
6. 변경 적용/저장

source 설명은 사용자가 편집할 수 없다면 별도 read-only source 영역으로 둡니다. personal description이 필요하다면 공개와 saved 모두 같은 필드로 제공합니다.

## 4. source·personal·execution 경계

| 값 | 소유 layer | 편집기 규칙 |
|---|---|---|
| 원문 제목·URL·raw Item | source | 수정 불가, 언제든 원문으로 복귀 가능 |
| 개인 Flow 제목 | personal | public working→save 후 persisted |
| Item 제목·메모·날짜·포함·순서 | personal | stable Item identity overlay |
| 완료·다시 열기 | execution | editor 저장과 분리된 명시적 action |
| routine occurrence 완료/보류 | execution occurrence | base routine 정의와 분리 |
| export selection | export scope | source/personal/execution을 변경하지 않음 |

`완료`를 editor close나 save에 쓰지 않는 이유입니다.

## 5. canonical Item projection matrix

| 결과 | eligibility | 보존 필드 | 의도적 제외/손실 | 사용자 안내 |
|---|---|---|---|---|
| Calendar/ICS | 유효한 effective date 또는 series anchor 있음. recurrence 규칙만으로는 부족 | 제목, 날짜/기간, 메모, source | undated 제외; routine은 series 1개로 축약 가능 | 제외 수와 축약 필드 표시 |
| Todo/Today | 내부 실행 가능한 row | 제목, owning Flow, due, completion | memo/resource/series 정의 제외; routine은 current occurrence만 | `저장한 Flow에서 가져온 할 일` |
| Checklist | list-eligible included rows | 제목, 순서, 날짜, 메모/기준, 상태 | 복잡한 구조 일부 flatten | 전체/선택 범위 표시 |
| Memo | narrative-eligible rows | Flow 제목, Item 제목·날짜·메모·source | structured columns 약화 | checklist와 다른 narrative 가치 필요 |
| Sheet | row-eligible rows | Flow 제목, Item, 순서, 날짜, 메모, 완료, source | nested subcheck/resource flatten 가능 | 열 목록과 빠진 값 표시 |

### Todo와 Checklist

둘은 유지할 가치가 있습니다.

- Todo: Today/upcoming/undated/completed로 묶는 내부 실행 lens
- Checklist: 선택한 Flow의 portable snapshot

Todo를 다섯 번째 외부 포맷처럼 노출하지 않습니다. 외부 VTODO를 실제 지원할 때만 별도 포맷으로 승격합니다.

## 6. 포맷별 현재 손실표

| 대상 | 제목 | 순서 | 날짜 | 메모 | 완료 | 출처 | 판정 |
|---|---|---|---|---|---|---|---|
| public checklist/memo | O | O | O | O | O | O | payload가 같아 두 형식 의미가 중복 |
| public XLSX | O | O | O | O | O | O | 가장 풍부 |
| public ICS 일반 | Item/Flow O | 약함 | dated만 | O | **X** | O | VEVENT `STATUS`는 일정 확정 상태이며 Item 실행 완료 보존으로 볼 수 없음 |
| public ICS routine | Flow O, Item X | X | series | per-item X | X | Flow O | 의도적 축약, 사전 고지 필요 |
| saved checklist/memo | O | O | O | O | O | coarse O | detail/resource/subcheck 일부 손실 |
| saved sheet TSV | **Flow 제목 X** | O | O | O | O | row O | P1 수정 |
| saved Flow ICS | O | 약함 | dated만 | O | **X** | O | P1 미고지 projection loss; 단독 Hard fail로 집계하지 않음 |
| saved Item checklist | O | N/A | O | **X** | **X** | O | UI가 완료 기준 포함을 약속하지만 payload에서 누락되어 Hard fail |
| saved Item memo/sheet/ICS | O | N/A | O | O | **X** | O | 완료 의미 손실 |
| Flow Map | export 없음 | — | — | — | — | — | child Flow별 export만 가능 |

## 7. 공통 projection acceptance

같은 fixture로 다음을 자동 비교합니다.

```text
Flow title: 이사 준비 v2
Item A: 제목 수정, 날짜 있음, 메모 있음, 완료
Item B: 날짜 없음, 포함
Item C: 제외
순서: B → A → C
```

| surface | 기대 |
|---|---|
| public preview | B→A, C 없음, 적용 전 source 불변 |
| saved My Flow | save 후 B→A와 개인 값 보존 |
| Today | 실행 eligibility에 따라 A/B만 파생 |
| Calendar | A만, B 제외 이유 표시 |
| checklist/memo/sheet | B→A, title/memo/completion/source 계약대로 보존 |
| Flow Map adapter | selected IDs와 title이 main preview/CTA/save payload 동일 |

## 8. 접근성 contract

- open 시 첫 유효 입력 또는 heading에 focus
- sheet 안 focus trap
- Escape/모바일 Back은 가장 안쪽 editor만 닫음
- dirty면 `계속 수정/변경 버리기`
- 닫은 뒤 opener로 focus 복귀
- primary/cancel/destructive target 최소 44×44px
- error는 field label과 연결되고 focus가 첫 오류로 이동
- nested dialog는 public Item처럼 필요할 때만 허용하고 동시에 두 transaction을 활성화하지 않음

## 9. MVP 순서

1. Flow Map applied projection parity
2. saved ICS completion 보존
3. saved Flow dirty/discard/focus contract
4. public/saved Flow editor 공통 sheet
5. checklist/memo payload 분리와 sheet title 보존
6. provenance receipt
