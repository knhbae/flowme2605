# FlowMe journey 및 screen 계약

이 문서는 Claude가 화면을 임의로 늘리거나 한 화면에 여러 목적을 다시 쌓지
않도록 하는 비교 기준이다. 최종 제안에서 바꿀 수 있지만, 바꾸면 이유와 대가를
명시해야 한다.

## 1. Canonical UI tree 후보

```text
Flow 찾기
├─ 준비된 Flow 발견
├─ URL 입력
├─ 메모 입력
└─ Public Flow
   ├─ 저장될 전체 결과
   ├─ 최소 조정
   └─ 저장 결과
      └─ 개인 Flow
         ├─ 실행
         ├─ 전체 구조
         ├─ Item detail
         ├─ 가져가기
         └─ 관리

My Flow
└─ 개인 Flow 열기

Calendar
└─ 날짜 일정 선택
   └─ 개인 Flow 열기
```

Codex 제안에서는 Home을 제거한다. Claude는 Home이 비중복 사용자 job 하나를
입증할 때만 유지안을 제시할 수 있다. 실제 사용 후기나 usage data가 없으므로
가상의 review/feed는 사용하지 않는다.

## 2. 화면별 메시지 계약

| Surface | 답할 사용자 질문 | 메시지 1 | 메시지 2 | Primary | Secondary | 소유하지 않는 기능 |
| --- | --- | --- | --- | --- | --- | --- |
| Flow 찾기 | 무엇을 실행할까 | URL·메모 입력 또는 준비된 Flow | 출처와 대표 결과 | `Flow 찾기` 또는 선택한 `Flow 열기` | 필터·보조 입력 | 실행·완료·개인 기록 |
| Public Flow | 무엇이 만들어질까 | 실제 전체 결과와 count | 필요한 최소 입력 | 콘텐츠별 `N개 …으로 시작` | `조정` | 저장 후 lifecycle |
| 조정 | 무엇만 바꿀까 | 지금 바꾸는 한 종류 | 변경 후 count·날짜 | `변경 적용` | `취소` | 다른 설정 묶음 |
| 저장 결과 | 무엇이 저장됐나 | 저장 이름과 count | 날짜 범위 또는 날짜 없음 | `내 Flow 열기` | 가져가기 | 장기 편집·실행 |
| My Flow | 무엇을 저장했나 | Flow 목록 | 진행 또는 다음 예정 요약 | `Flow 열기` | 검색·필터·관리 | Item 실행 |
| 개인 Flow | 지금 무엇을 할까 | 다음 Item/현재 단원/이번 회차 | 전체 진행과 구조 | 현재 Item 열기 또는 완료 | 조정·가져가기 | 다른 Flow 탐색 |
| Item detail | 이 Item에서 무엇을 할까 | 제목·설명·완료 기준 | 개인 날짜·메모 | `완료` 또는 `다시 열기` | 수정 | 다른 Item 관리 |
| Calendar | 날짜별로 무엇이 있나 | 월/주와 선택일 일정 | Flow별 compact identity | `Flow 열기` | scope filter | Item 편집의 주 소유권 |
| 가져가기 | 무엇이 나가나 | scope와 count | destination별 정보 손실 | destination action | 다른 형식 | 실행 기록 편집 |
| 관리 | 이 사본을 어떻게 관리할까 | 현재 lifecycle 상태 | 복구 가능 범위 | `보관` 또는 `복구` | 영구 삭제 | 실행·export |

## 3. 다섯 콘텐츠의 15-session 계약

### J1 이사 D-30

| Session | 시작 | 사용자 결정 | 필요한 화면 | 성공 신호 |
| --- | --- | --- | --- | --- |
| A | `/f/moving-d30-basic` | 24개 범위, 이사일, 포함·고정 날짜, 저장 | Public → 조정 → receipt | 이름·24개 또는 조정 count·날짜 범위 |
| B | `/my` 재방문 | Flow 찾기, Item 완료·다시 열기, 날짜·메모 | library → 개인 Flow → Item → Calendar | 같은 title/count/date가 모든 surface에서 유지 |
| C | 개인 Flow | export scope, 새 이사일 재사용 | 가져가기 → 관리/재사용 | 이전 run과 개인 고정 날짜 보존 |

### J2 날짜 없는 차량 점검

| Session | 시작 | 사용자 결정 | 필요한 화면 | 성공 신호 |
| --- | --- | --- | --- | --- |
| A | `/f/vehicle-inspection-prep` | 10개가 맞는지, 날짜 없이 저장 | Public → receipt → 개인 Flow | `날짜 없음`, 10개 저장 확인 |
| B | 개인 Flow | 완료·다시 열기, Item 하나 날짜 배치 | 개인 Flow → Item → Calendar | 날짜 있는 Item만 Calendar에 표시 |
| C | Calendar/개인 Flow | 날짜 제거, 범위별 Checklist export | Calendar → 개인 Flow → export | Calendar에서 제거, 개인 Flow에는 유지 |

### J3 반복 홈트

| Session | 시작 | 사용자 결정 | 필요한 화면 | 성공 신호 |
| --- | --- | --- | --- | --- |
| A | public workout | 주기·시간·소요·종료, 저장 | Public → 반복 조정 → receipt | compact series와 다음 회차 count |
| B | 개인 Flow | 이번 회차 완료·다시 열기, resource 열기 | 개인 Flow → occurrence → resource | series는 유지되고 현재 회차만 변경 |
| C | Calendar | 예정 회차, ICS, 반복 종료/재사용 | Calendar → 개인 Flow → export/관리 | 과거 occurrence와 resource 보존 |

### J4 장기 학습·진도

| Session | 시작 | 사용자 결정 | 필요한 화면 | 성공 신호 |
| --- | --- | --- | --- | --- |
| A | public study | 8개 단원·순서 이해, 날짜 없이 저장 | Public progress renderer → receipt | 8개와 현재 위치 없음/0 표시 |
| B | 개인 Flow | 현재 단원, 하위 progress, 메모 | 개인 Flow → Item detail | 다음 단원이 명확하고 메모 유지 |
| C | 개인 Flow | Sheet/Checklist export, 재진입 | export → reload | 8행과 마지막 위치 일치 |

### J5 개인 메모 초안

| Session | 시작 | 사용자 결정 | 필요한 화면 | 성공 신호 |
| --- | --- | --- | --- | --- |
| A | `/flows` composer | 5개 분할, 이름·포함·순서, 저장 | 입력 → proposal → 조정 → receipt | 입력 문장에 없는 행동을 만들지 않고 5개 저장 |
| B | 개인 Flow | 추가·삭제·복구·재정렬, 날짜·메모, 완료 | 개인 Flow → 구조 조정 → Item | structural overlay와 run 분리 |
| C | 개인 Flow | Calendar subset/Checklist export, reload | export → 재진입 | personal draft와 기록 유지 |

## 4. 공통 상태 전환

```text
discover
→ preview
→ adjust
→ save
→ receipt
→ open_personal_flow
→ execute
→ complete
→ reopen
→ inspect_calendar
→ export
→ revisit_or_reuse
```

실패와 복구:

```text
adjust → cancel → preview
save_error → retry → receipt
export_error → retry → export_receipt
complete → reopen → execute
archive → undo 또는 restore → active
personal_item_delete → restore → original_personal_order
```

## 5. 공통 command 소유권

| Command | 주 소유 surface | 다른 surface의 역할 |
| --- | --- | --- |
| 저장 | Public Flow | 없음 |
| Flow 열기 | Flow 찾기, My Flow, Calendar entry | 개인 Flow로 이동 |
| 완료·다시 열기 | 개인 Flow 또는 Item detail | Calendar에서는 개인 Flow 열기 |
| 제목·날짜·메모 수정 | 개인 Flow Item detail | 다른 화면은 current value만 표시 |
| 포함·제외·순서 | 저장 전 조정 또는 개인 Flow 구조 조정 | receipt/Calendar에서는 표시만 |
| 보관·복구·영구 삭제 | 개인 Flow 관리 | My Flow는 관리 진입만 |
| whole/selected/current 가져가기 | 개인 Flow export | receipt는 optional shortcut만 |
| series 수정 | 개인 Flow 반복 설정 | occurrence 화면은 이번 회차만 |
| occurrence 완료·다시 열기 | 해당 occurrence | series 정의는 변경하지 않음 |

## 6. 승인 질문

Claude 최종안은 아래를 예/아니오와 근거로 답해야 한다.

1. Home은 Flow 찾기와 다른 사용자 job을 갖는가?
2. My Flow 목록에서 Item을 직접 실행해야 하는가?
3. Calendar에서 Item을 직접 완료·수정해야 하는가?
4. 날짜 없는 Item은 Calendar 진입점이 반드시 필요한가?
5. personal Flow workspace는 route인가, `/my`의 focused state인가?
6. 콘텐츠 shape 차이는 renderer만으로 설명 가능한가?
7. 어느 행동도 두 surface가 동시에 주 소유하지 않는가?
