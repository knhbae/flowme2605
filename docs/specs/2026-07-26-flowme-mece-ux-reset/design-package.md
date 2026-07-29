# FlowMe MECE UX Reset 설계 패키지

- 작성일: 2026-07-26
- 범위: `UXR-00`~`UXR-05`
- 연결 산출물: [interactive wireflow](../../content-audit/2026-07-26-flowme-mece-ux-reset/review.html)
- 기준 코드: `98ede0f` (`origin/main`의 뒤따른 2개 커밋은 P33/P34 release 문서 갱신만 포함)
- 현재 production: <https://flowme2605.vercel.app>
- 실제 관찰 사용자 수: 0명
- 앱 코드 변경: 없음

## 1. 결론

FlowMe의 source, personal overlay, execution run, recurrence occurrence, export 계약은 유지한다.
다시 여는 것은 데이터 모델이 아니라 화면의 소유권과 사용자 여정이다.

목표 구조는 다음과 같다.

```text
Flow 찾기
  → Public Flow
  → 저장 결과
  → 개인 Flow

My Flow
  → 개인 Flow

Calendar
  → 개인 Flow
```

핵심 결정:

1. `/flows`는 발견과 입력만 소유한다.
2. `/f/[slug]`는 저장 전 전체 결과, 최소 입력, 시작만 소유한다.
3. 저장 결과는 저장된 이름·범위와 다음 이동만 확인한다.
4. `/my`는 저장한 Flow의 목록과 lifecycle 진입만 소유한다.
5. 개인 Flow workspace가 Item 실행·완료·수정·메모·가져가기를 유일하게 소유한다.
6. `/calendar`는 날짜가 있는 여러 Flow를 보는 렌즈이며, 실행할 때 개인 Flow를 연다.
7. Calendar, Checklist, Routine, Sheet, Memo는 Flow의 projection 또는 renderer이지 전역 화면이 아니다.
8. Home은 별도 사용자 job을 증명하지 못했으므로 제거하고 `/`를 저장 상태 기반 entry router로 사용한다.

2026-07-26 사용자 승인으로 `A_prime`이 확정됐다. 구체적인 KEEP/CUT, 구현 순서, rollback은 [A안 개발 handoff](./developer-handoff-a-prime-ko.md)를 따른다.

## 2. Evidence boundary

| Evidence | 사용 방식 |
| --- | --- |
| current production interaction | 390×844, 1024×768에서 `/`, `/flows`, `/f/moving-d30-basic`, saved receipt, `/my`, `/calendar`를 직접 조작 |
| current source | `AppClient.tsx`, `app/my/page.tsx`, `app/calendar/page.tsx`, `my-flow-local-ia.ts`, current route/data contracts |
| current package screenshot | 이번 패키지의 `screenshots/current-*.png` |
| prior design artifact | P24~P34 spec/evidence에서 구현된 capability와 과거 판단을 추출 |
| reference pattern | Google Calendar, Todoist, Things, Notion의 공식 문서 |
| heuristic simulation | 다섯 대표 콘텐츠의 three-session journey |

자동화, screenshot, reference 비교, agent simulation은 실제 사용자 관찰이 아니다.

### 현재 소스 복잡도

동일한 AST 기준으로 확인한 `MyFlows`:

| 항목 | 현재 |
| --- | ---: |
| 범위 | `AppClient.tsx:5243-17787` |
| 함수 길이 | 12,545줄 |
| `<button>` | 151개 |
| 한글을 포함한 고유 text node | 530개 |
| `? (` render pattern | 310개 |
| `&& (` render pattern | 31개 |

이 수치는 제품의 사용자 가치가 아니라 구조적 위험 신호다. 이번 설계 단계에서는 코드를 줄이지 않는다.

## 3. UXR-00 정합성 matrix

분류:

- `retain_contract`: 데이터·안전 계약 유지
- `retain_capability_relocate_ui`: 기능은 유지하고 사용자 진입점을 한 곳으로 이동
- `reopen_ux`: 화면 구조를 다시 결정
- `cut_ui`: 중복 또는 접근 불가능한 UI 제거
- `defer`: 이번 reset에서 다루지 않음

| 기존 결정·기능 | 분류 | 이번 기준 | Evidence |
| --- | --- | --- | --- |
| source / published Flow 불변 | `retain_contract` | 개인 수정으로 원문을 덮어쓰지 않음 | current_source |
| personal overlay | `retain_contract` | 이름, 날짜, 메모, 포함 여부, 개인 Item과 순서를 소유 | current_source |
| execution run | `retain_contract` | 완료·다시 열기·skip·hold·실행 기록을 소유 | current_source |
| recurrence series / occurrence 분리 | `retain_contract` | series 설정과 현재 회차 실행을 분리 | current_source |
| whole / selected / current export identity | `retain_contract` | 개인 Flow workspace에서 scope와 count를 먼저 제시 | current_source |
| canonical source + user job + editorial variant | `retain_contract` | 진입점이 달라도 같은 canonical Flow를 사용 | current_source |
| 24개 전체판과 5개 간단판 자동 병합 금지 | `retain_contract` | active copy 선택과 복구 경로 보존 | current_source |
| 실제 artifact를 저장 전에 보여주기 | `retain_contract` | 설명보다 전체 결과를 먼저 노출 | current_production_interaction |
| 콘텐츠별 primary artifact | `retain_contract` | 저장 전에 결과 형태를 고르게 하지 않고 자연스러운 기본 결과를 사용 | current_source |
| secondary artifact 최대 2개 | `retain_capability_relocate_ui` | 저장 전 경쟁 선택에서 빼고 `가져가기`에서만 제안 | heuristic_simulation |
| saved receipt | `retain_contract` | 저장 성공, 이름, count, 범위, 다음 이동만 표시 | current_production_interaction |
| Flow archive / restore / permanent delete | `retain_capability_relocate_ui` | 개인 Flow의 `관리`에서 제공. 영구 삭제는 보관 후에만 | current_source |
| source Item 제외 / 다시 포함 | `retain_capability_relocate_ui` | 개인 Flow의 구조 조정에서 제공 | current_source |
| personal Item 삭제 / 복구 | `retain_capability_relocate_ui` | 개인 Flow의 구조 조정에서 제공 | current_source |
| Item 제목·날짜·시간·장소·메모 편집 | `retain_capability_relocate_ui` | 열린 Item detail에서 빠른 필드 우선 | current_source |
| 완료 / 다시 열기 | `retain_capability_relocate_ui` | 개인 Flow의 같은 Item 행에서 제공 | current_source |
| My Flow `지금 / Flow 목록 / 완료` | `reopen_ux` | `/my`는 Flow 목록. 완료·보관은 목록 필터, `지금`은 제거 | current_production_interaction |
| My Flow focused workspace를 `/my` 내부 상태로 소유 | `reopen_ux` | 개인 Flow를 연 별도 workspace state로 분리 | current_production_interaction |
| Calendar selected-day에서 완료·메모 | `reopen_ux` | Calendar는 날짜와 Flow 링크만 소유 | current_production_interaction |
| Calendar undated placement queue | `reopen_ux` | 날짜 없는 Item은 개인 Flow에서 실행·날짜 설정 | current_source |
| Home concrete usage examples | `cut_ui` | `/flows`와 중복. 실제 후기 데이터가 생기기 전 별도 Home을 두지 않음 | current_production_interaction |
| 4-tab IA | `reopen_ux` | `Flow 찾기 / Calendar / My Flow` 3개로 축소 | heuristic_simulation |
| 전역 Checklist / Routine view | `cut_ui` | renderer 속성으로만 유지 | current_source |
| `MyFlowView`의 `checklist`, `routine` branch | `cut_ui` | 현재 상위 진입과 E2E에서 이미 접근 불가 | current_source |
| `MyFlowView`의 `calendar` branch | `retain_capability_relocate_ui` | `/calendar`가 `MyFlows`를 재사용 중이므로 surface 분리 후 제거 | current_source |
| Studio / 데이터 관리의 primary 노출 | `reopen_ux` | 보조 메뉴로 이동. 일반 실행 여정과 경쟁하지 않음 | current_production_interaction |
| 가짜 사용자 수·리뷰·평점 | `defer` | 실제 집계·moderation 계약 전 노출 금지 | current_source |
| account / DB / cloud sync / OAuth | `defer` | 이번 reset 비범위 | current_source |

### 기존 결정을 다시 여는 근거

`DECISIONS.md`의 P31~P34는 4-tab IA, Home 사용 예시, My Flow 실행 허브, Calendar 실행을 유지했다.
이번 사용자 지시는 다음 두 사항을 명시적으로 다시 열었다.

- 한 화면에 한두 개의 명확한 메시지만 남길 것
- UI tree와 기능 소유권을 MECE하게 재구성할 것

따라서 안정된 데이터 계약은 유지하지만, 그 계약을 보여주는 화면 소유권은 과거 non-scope에 묶이지 않는다.

## 4. UXR-01 canonical journey

모든 여정은 세 session으로 검토한다.

- Session A: 발견 → 전체 결과 → 최소 입력 → 저장
- Session B: 개인 Flow 열기 → 실행·완료·수정 → Calendar 확인
- Session C: 가져가기 → 다시 열기 → 새 실행 또는 복구

### J1. 이사 D-30

실제 콘텐츠:

- `moving-d30-basic`
- 24개 Item
- primary artifact: Calendar
- 최소 입력: 이사일

| 단계 | 화면 | 사용자 결정 | 다음 상태 |
| --- | --- | --- | --- |
| 발견 | Flow 찾기 | 이사 Flow를 열 것인가 | Public Flow |
| 저장 전 | Public Flow | 이사일은 언제인가 | 24개 실제 날짜 계산 |
| 조정 | 같은 화면의 조정 state | 이름, 포함 여부, 고정 날짜를 바꿀 것인가 | effective personal preview |
| 저장 | 저장 결과 | 24개와 날짜 범위가 맞는가 | 개인 Flow |
| 실행 | 개인 Flow | 현재 Item을 완료할 것인가 | execution run 갱신 |
| 날짜 확인 | Calendar | 어느 날 어떤 이사 Flow Item이 있는가 | 개인 Flow의 Item |
| 재사용 | 개인 Flow 관리 | 새 이사일로 새 run을 만들 것인가 | 이전 run 보존 + 새 run |

첫 유용한 결과 전 필수 입력은 이사일 1개다.

### J2. 날짜 없는 차량 점검

실제 콘텐츠:

- `vehicle-inspection-prep`
- 10개 Item
- primary artifact: Checklist
- 최소 입력: 없음

| 단계 | 화면 | 사용자 결정 | 다음 상태 |
| --- | --- | --- | --- |
| 발견 | Flow 찾기 | 차량 점검 목록을 사용할 것인가 | Public Flow |
| 저장 전 | Public Flow | 10개 목록이 내 목적에 맞는가 | Checklist preview |
| 저장 | 저장 결과 | 날짜 없이 10개가 저장됐는가 | 개인 Flow |
| 실행 | 개인 Flow | 어느 Item을 완료할 것인가 | execution run 갱신 |
| 일정 배치 | Item detail | 이 Item에 날짜가 필요한가 | personal date overlay |
| 날짜 확인 | Calendar | 배치된 Item을 열 것인가 | 개인 Flow Item |
| 날짜 제거 | Item detail | 다시 날짜 없음으로 돌릴 것인가 | Calendar에서 제거, 개인 Flow에는 유지 |

날짜가 없다는 이유로 Calendar에 별도 실행 목록을 만들지 않는다.

### J3. 반복 홈트

실제 콘텐츠:

- `curated-allblanc-morning-workout`
- source Item 1개
- primary artifact: 반복 실행
- 최소 입력: 시작일 또는 첫 요일 선택 1개

| 단계 | 화면 | 사용자 결정 | 다음 상태 |
| --- | --- | --- | --- |
| 발견 | Flow 찾기 | 영상 루틴을 시작할 것인가 | Public Flow |
| 저장 전 | Public Flow | 주기·시간·종료 조건이 맞는가 | series preview |
| 저장 | 저장 결과 | 설정과 다음 3회가 맞는가 | 개인 Flow |
| 실행 | 개인 Flow | 이번 회차를 완료할 것인가 | occurrence run 갱신 |
| 다시 열기 | 같은 occurrence | 완료를 취소할 것인가 | occurrence reopen |
| 일정 확인 | Calendar | 예정 occurrence를 열 것인가 | 개인 Flow occurrence |
| 가져가기 | 개인 Flow | series 전체를 ICS로 받을 것인가 | RRULE receipt |

영상 URL은 완료 대상이 아니라 resource다.

### J4. 장기 학습·진도

실제 콘텐츠:

- `source-backed-middle-school-math-1`
- 8개 단원
- primary artifact: Sheet / progress list
- 최소 입력: 없음

| 단계 | 화면 | 사용자 결정 | 다음 상태 |
| --- | --- | --- | --- |
| 발견 | Flow 찾기 | 목차 기반 진도를 사용할 것인가 | Public Flow |
| 저장 전 | Public Flow | 8개 단원과 하위 개념 범위를 이해했는가 | progress preview |
| 저장 | 저장 결과 | 8개 단원이 저장됐는가 | 개인 Flow |
| 실행 | 개인 Flow | 현재 단원과 하위 개념을 체크할 것인가 | progress 갱신 |
| 기록 | Item detail | 학습 메모를 남길 것인가 | personal memo |
| 가져가기 | 개인 Flow | 전체 8행을 Sheet로 받을 것인가 | sheet receipt |
| 재방문 | 개인 Flow | 마지막 위치에서 이어갈 것인가 | 동일 run 유지 |

날짜를 억지로 묻거나 Calendar를 기본 결과로 제시하지 않는다.

### J5. 개인 메모 초안

입력:

> 8월 제주 여행 준비. 항공권 확인, 숙소 예약번호 정리, 렌터카 예약, 준비물 체크, 출발 전날 온라인 체크인

결과 Item:

1. 항공권 확인
2. 숙소 예약번호 정리
3. 렌터카 예약
4. 준비물 체크
5. 출발 전날 온라인 체크인

| 단계 | 화면 | 사용자 결정 | 다음 상태 |
| --- | --- | --- | --- |
| 입력 | Flow 찾기 composer | 문장 분리가 맞는가 | proposal |
| 확인 | proposal | 이름, 포함, 순서를 바꿀 것인가 | personal draft preview |
| 저장 | 저장 결과 | 5개가 저장됐는가 | 개인 Flow |
| 수정 | 개인 Flow 구조 조정 | Item 추가·삭제·복구·재정렬이 필요한가 | personal structural overlay |
| 일정 | Item detail | 출발 전날 Item에 날짜를 넣을 것인가 | personal date overlay |
| 실행 | 개인 Flow | 완료·메모를 기록할 것인가 | execution run |
| 가져가기 | 개인 Flow | Checklist 또는 Calendar subset을 받을 것인가 | export receipt |

규칙 기반 분리는 사용자 문장만 사용한다. 없는 행동을 생성하지 않는다.

## 5. UXR-02 screen message contract

화면 내부에는 아래 메시지만 기본 노출한다. 설명용 annotation은 wireflow 보드 바깥에만 둔다.

| Surface | 사용자 질문 | 메시지 1 | 메시지 2 | Primary action | 기본 접힘 |
| --- | --- | --- | --- | --- | --- |
| Flow 찾기 | 무엇을 실행할까 | URL·메모 입력 또는 준비된 Flow | 출처와 대표 결과 | `Flow 찾기` 또는 선택한 `Flow 열기` | 필터, 후보 관리 |
| Public Flow | 무엇이 만들어질까 | 실제 전체 결과와 count | 필요한 최소 입력 | 콘텐츠별 `N개 …으로 시작` | source detail, secondary export |
| 조정 state | 무엇만 바꿀까 | 변경 대상 한 종류 | 변경 후 결과 | `변경 적용` | 고급 구조 편집 |
| 저장 결과 | 무엇이 저장됐나 | 저장 이름과 count | 날짜 범위 또는 `날짜 없음` | `내 Flow 열기` | source, export |
| My Flow | 무엇을 저장했나 | Flow 목록 | 진행·다음 예정 요약 | 선택한 `Flow 열기` | 완료·보관 필터 |
| 개인 Flow | 지금 무엇을 할까 | 다음 Item 또는 현재 단원/회차 | 전체 진행 | 현재 Item 열기 또는 완료 | 관리, export, 전체 source |
| Item detail | 이 Item에서 무엇을 할까 | 제목·설명·완료 기준 | 날짜·메모의 현재값 | `완료` 또는 `다시 열기` | 고급 시간·장소·반복 |
| Calendar | 날짜별로 무엇이 있나 | 월/선택일 일정 | Flow별 compact identity | 선택한 `Flow 열기` | scope filter |
| 가져가기 | 무엇이 나가나 | whole/selected/current scope와 count | destination별 빠지는 정보 | destination-specific action | secondary destinations |
| Flow 관리 | 이 개인 사본을 어떻게 관리할까 | 현재 lifecycle 상태 | 복구 가능 범위 | 상태별 `보관` 또는 `복구` | 영구 삭제 |

### 사용자 대면 용어

유지:

- Flow
- 할 일
- 일정
- 진도
- 반복
- 완료 / 다시 열기
- 보관 / 복구
- 가져가기

숨김:

- Flow Map
- projection
- personal overlay
- execution run
- occurrence identity
- source-backed
- readiness
- RRULE

## 6. UXR-03 기능 소유권 matrix

`Owner`는 해당 기능을 직접 수행하는 유일한 surface다. 다른 surface는 읽기 또는 owner로 이동만 한다.

| 기능 | Owner | 다른 surface의 허용 행동 |
| --- | --- | --- |
| URL·메모 입력 | Flow 찾기 | 없음 |
| 검색·카테고리·source 선택 | Flow 찾기 | 없음 |
| 원문 링크 열기 | Flow 찾기, Public Flow | read-only link |
| 저장 전 전체 결과 | Public Flow | receipt는 저장 결과만 요약 |
| 필수 anchor 입력 | Public Flow | 개인 Flow는 저장 후 변경 |
| 저장 전 이름·포함·날짜 조정 | Public Flow 조정 state | 없음 |
| 저장 성공 확인 | saved receipt | My Flow는 반복 receipt를 만들지 않음 |
| 저장 Flow 검색·필터 | My Flow | Calendar scope는 날짜 표시 범위만 조정 |
| 개인 Flow 열기 | My Flow, Calendar | 개인 Flow workspace로 이동 |
| Item 실행·완료·다시 열기 | 개인 Flow | Calendar checkbox 제거 |
| Item 제목·날짜·시간·장소·메모 수정 | 개인 Flow Item detail | Calendar는 편집하지 않음 |
| 날짜 없는 Item 실행 | 개인 Flow | Calendar에 노출하지 않음 |
| 날짜 설정·제거 | 개인 Flow Item detail | Calendar의 날짜 이동은 owner로 deep link |
| series 설정 | 개인 Flow 반복 설정 | Calendar는 occurrence 읽기만 |
| occurrence 완료·skip·hold | 개인 Flow occurrence | Calendar는 해당 occurrence 열기 |
| 전체 구조 조정 | 개인 Flow 구조 조정 | My Flow 목록에서는 제공하지 않음 |
| archive / restore / permanent delete | 개인 Flow 관리 | My Flow 목록은 관리 진입만 |
| 월·선택일 날짜 조회 | Calendar | 개인 Flow는 해당 Flow 내부 일정만 |
| Flow scope 필터 | Calendar | 일정 표시만 바꿈 |
| whole / selected / current export | 개인 Flow 가져가기 | Public Flow의 저장 전 export는 secondary |
| source correction | source/creator flow | 개인 실행 메모와 분리 |
| 단계 메모·회고 | 개인 Flow | Calendar에서 메모하지 않음 |

## 7. UXR-04 canonical IA와 route tree

### Primary navigation

```text
Flow 찾기  /flows
Calendar   /calendar
My Flow    /my
```

`/`는 `/flows`의 canonical entry로 연결한다. 별도 Home은 두지 않는다.

### Route와 상태

```text
/
└─ redirect → /flows

/flows
├─ empty/input
├─ hit
├─ proposal
├─ needs_review
├─ miss
└─ source_import_required

/f/[publicSlug]
├─ preview
├─ adjust
└─ saved receipt

/my
├─ active library
├─ completed filter
└─ archived filter

/my?savedFlow=[compatibleSavedIdentity]
├─ next action
├─ full plan
├─ record
├─ item detail
├─ adjustment
├─ export
└─ management

/calendar
├─ month
├─ selected day
└─ Flow scope
```

첫 구현에서는 현재 `savedFlow` query와 localStorage identity를 유지한다.
`/my/flows/[personalCopyId]` 형태의 전용 path는 server-issued personal ID가 필요해질 때만 검토한다.

### Navigation rules

1. Public share route는 persistent app navigation보다 콘텐츠와 저장 행동을 우선한다.
2. saved receipt에서 `내 Flow 열기`를 누르면 개인 Flow workspace로 이동한다.
3. My Flow 목록 행은 개인 Flow workspace를 연다.
4. Calendar의 event 또는 selected-day row도 같은 개인 Flow workspace를 연다.
5. browser back은 이전 목록의 검색·scroll 또는 Calendar 선택일로 돌아간다.
6. `Flow 찾기`, `Calendar`, `My Flow`에서 같은 saved identity를 사용한다.

## 8. UXR-05 상태·데이터 전환 계약

### 주요 상태 전환

| 현재 상태 | 사용자 행동 | 다음 상태 | 저장되는 데이터 | 취소·복구 |
| --- | --- | --- | --- | --- |
| `discovery` | Flow 열기 | `public_preview` | 없음 | Flow 찾기로 돌아감 |
| `public_preview` | 최소값 입력 | `preview_ready` | 임시 draft | 입력 지우기 |
| `preview_ready` | 조정 열기 | `pre_save_adjusting` | 임시 personal proposal | 조정 취소 |
| `pre_save_adjusting` | 적용 | `preview_ready` | 임시 proposal 갱신 | 이전값 복구 |
| `preview_ready` | 시작 | `saved_receipt` | saved record + personal overlay | archive 가능 |
| `saved_receipt` | 내 Flow 열기 | `personal_flow_open` | 없음 | public receipt로 back |
| `my_library` | Flow 열기 | `personal_flow_open` | 최근 열기 상태 선택적 | 목록으로 back |
| `personal_flow_open` | Item 열기 | `item_detail` | 없음 | Flow로 back |
| `item_detail` | 완료 | `item_completed` | execution run | 같은 위치에서 다시 열기 |
| `item_detail` | 날짜 변경 | `item_detail` | personal date overlay | 날짜 지우기 / undo |
| `item_detail` | 메모 저장 | `item_detail` | personal memo | 이전 메모 복원 정책 유지 |
| `personal_flow_open` | 구조 조정 | `structure_adjusting` | 임시 structural proposal | 취소 |
| `structure_adjusting` | 적용 | `personal_flow_open` | inclusion/tombstone/order overlay | 즉시 undo |
| `calendar` | event 열기 | `personal_flow_open` | 선택일·scroll만 유지 | Calendar로 back |
| `personal_flow_open` | 가져가기 | `export_preflight` | 없음 | 닫기 |
| `export_preflight` | 생성·복사 | `export_receipt` | export receipt identity | 재시도 |
| `personal_flow_open` | 보관 | `archived` | lifecycle state | 즉시 undo / archive filter에서 복구 |
| `archived` | 영구 삭제 | `deleted_local` | backup 후 personal local data 제거 | backup only |

### 데이터 layer

| Layer | 유지할 값 | 화면 규칙 |
| --- | --- | --- |
| source/content | source URL, sourceTrace, 원본 title·Item·order·schedule | read-only |
| published Flow | canonical identity, editorial variant, primary artifact | public preview의 기준 |
| personal overlay | saved name, date, memo, inclusion, personal Items, order | 저장 전 proposal과 저장 후 edit |
| execution run | completion, reopen, skip, hold, run history | 개인 Flow에서만 조작 |
| recurrence | series rule, occurrence exception | 설정과 회차 UI 분리 |
| export | scope, destination, effective identity, count, receipt | personal effective rows에서 생성 |

### 우선순위와 불변식

1. 개인 고정 날짜는 기준일 재계산으로 덮어쓰지 않는다.
2. 완료는 Item 제외·삭제·보관을 의미하지 않는다.
3. 날짜 제거는 Item 삭제가 아니다.
4. source Item 제외는 원본 삭제가 아니다.
5. occurrence 완료는 series 정의를 바꾸지 않는다.
6. export count는 effective included rows에서 계산한다.
7. public source correction과 personal memo·회고를 같은 필드에 저장하지 않는다.
8. 24개와 5개 개인 사본은 자동 병합하지 않는다.

## 9. Reference pattern 적용

| 제품 패턴 | FlowMe 판단 | 적용 방식 |
| --- | --- | --- |
| Todoist: project/list에서 task를 누르면 전용 task view를 엶 | 적용 | 목록·Calendar에서 직접 모든 명령을 펼치지 않고 개인 Flow/Item을 엶 |
| Todoist: Today에는 날짜 있는 task만 표시 | 변형 적용 | Calendar에는 날짜 있는 Item만 표시. 날짜 없는 Item은 개인 Flow에서 실행 |
| Google Calendar: 날짜 있는 task가 Calendar에 나타남 | 적용 | Calendar를 date lens로 제한 |
| Things: project/context와 Today/Upcoming time lens 분리 | 적용 | My Flow는 Flow context, Calendar는 time lens |
| Notion: 동일 데이터의 view는 object type이 아님 | 변형 적용 | Calendar/Checklist/Sheet/Memo를 canonical Flow의 projection으로 유지 |
| full planner의 Inbox/Goal/Dashboard 확장 | 적용 금지 | portable execution layer 범위를 벗어남 |

공식 참고:

- <https://www.todoist.com/help/articles/use-the-task-view-to-manage-tasks-in-todoist-eDeRDO0C>
- <https://www.todoist.com/help/articles/plan-your-day-with-the-today-view-UVUXaiSs>
- <https://support.google.com/calendar/answer/9901136>
- <https://culturedcode.com/things/support/articles/4001304/>
- <https://www.notion.com/help/views-filters-and-sorts>

## 10. Wireflow handoff

`UXR-06`과 `UXR-07`은 다음 HTML에서 수행한다.

[FlowMe MECE UX Reset interactive wireflow](../../content-audit/2026-07-26-flowme-mece-ux-reset/review.html)

HTML이 반드시 증명해야 하는 것:

- 화면마다 메시지 최대 두 개
- primary action 최대 하나
- Home 제거 후 3개 primary navigation
- 실제 24개 이사, 10개 차량 점검, 반복 홈트, 8단원 학습, 5개 개인 draft
- public preview와 saved receipt의 시각적 구분
- My Flow 목록과 개인 Flow 실행의 구분
- Calendar는 공유 완료·다시 열기 primitive만 수행하고 다른 편집은 개인 Flow를 여는 흐름
- 390×844과 1024×768에서 같은 소유권 문법

## 11. 승인된 결정

wireflow 검토에서 다음 세 결정을 확정했다.

1. Home을 제거하고 3-tab IA와 상태 기반 entry router를 사용한다.
2. Calendar는 공유 완료·다시 열기 primitive만 남기고 메모·날짜 이동 등 편집은 개인 Flow로 보낸다.
3. `/my`의 `지금`을 제거하고 저장 Flow library로 한정한다.

`UXR-08`은 `A_prime`으로 승인됐다. 앱 구현은 [A안 개발 handoff](./developer-handoff-a-prime-ko.md)의 한 slice씩 진행한다.
