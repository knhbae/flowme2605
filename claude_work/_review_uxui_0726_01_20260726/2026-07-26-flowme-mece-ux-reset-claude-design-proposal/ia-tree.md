# IA tree와 continuity map

## 1. Proposed UI tree (A′)

```text
/                              entry router (UI 없음)
├─ 저장 Flow > 0  →  /my
└─ 저장 Flow = 0  →  /flows

Flow 찾기  /flows                     "무엇을 실행할까"
├─ URL·메모 입력  →  제안(5개)  →  공개 Flow
├─ 준비된 Flow 카드  →  공개 Flow
└─ (저장 있음) 이어서 하기 1행  →  개인 Flow

   공개 Flow  /f/[slug]               "무엇이 만들어질까"
   ├─ 저장될 전체 결과            ← 기본
   ├─ 최소 입력 1개 + 시작        ← 같은 고정 영역
   ├─ 조정 (한 번에 한 종류)  →  되돌아옴
   └─ 저장  →  저장 결과
      저장 결과                       "무엇이 저장됐나"
      └─ 내 Flow 열기  →  개인 Flow

My Flow  /my                          "무엇을 저장했나"
├─ 검색 · 진행/완료/보관 필터
└─ 행  →  개인 Flow

Calendar  /calendar                   "날짜별로 무엇이 있나"
└─ 선택일 agenda
   ├─ 완료 토글 (row primitive)
   └─ Flow 열기  →  개인 Flow

개인 Flow  /my?savedFlow=…            "지금 무엇을 할까"
├─ 다음 하나  →  완료 / 열기
├─ 전체 구조  →  Item detail
│  └─ Item detail                     "이 할 일에서 무엇을 할까"
│     └─ 제목 · 날짜 · 메모 · 완료
├─ 구조 조정  (추가·삭제·복구·순서·포함)
├─ 가져가기                            "무엇이 나가나"
│  └─ 범위 → 형식 → receipt
└─ 관리                                "이 사본을 어떻게 관리할까"
   └─ 보관 · 복구 · 이 기기에서 영구 삭제 · 새 기준일로 다시 쓰기
```

분기는 **콘텐츠 shape**(캘린더 역산 / 체크리스트 / 반복 / 진도 / 개인 초안)에서 일어나고, 합류는 **개인 Flow**에서 일어난다. 어떤 shape로 들어와도 저장 이후의 tree는 동일하다.

## 2. 소유권 (MECE)

| 기능 | Owner | 다른 surface |
| --- | --- | --- |
| URL·메모 입력, 검색 | Flow 찾기 | 없음 |
| 저장 전 전체 결과, 최소 입력, 저장 | 공개 Flow | receipt는 결과만 요약 |
| 저장 전 조정 | 공개 Flow 조정 state | 없음 |
| 저장 성공 확인 | 저장 결과 | My Flow는 receipt를 다시 만들지 않음 |
| 저장 Flow 검색·필터·lifecycle 진입 | My Flow | Calendar는 표시 범위만 |
| 개인 Flow 열기 | My Flow · Calendar · 저장 결과 | 모두 같은 workspace로 |
| 실행 상태 토글(완료·다시 열기) | **run (row primitive)** | 행이 보이는 곳이면 동일 컨트롤 |
| 제목·날짜·메모·순서·포함 편집 | 개인 Flow / Item detail | 다른 화면은 현재값 표시만 |
| series 정의 | 개인 Flow 반복 설정 | Calendar는 occurrence 읽기만 |
| 날짜 없는 항목 실행 | 개인 Flow | Calendar에 노출하지 않음 |
| whole/selected/current 가져가기 | 개인 Flow 가져가기 | receipt는 optional shortcut |
| archive · restore · 영구 삭제 | 개인 Flow 관리 | My Flow는 필터·진입만 |

## 3. Continuity map

```text
save-before → receipt → My Flow → personal Flow → Calendar → export → reuse
```

| 연결 | 유지되는 것 | 사용자의 다음 행동 |
| --- | --- | --- |
| 공개 Flow → receipt | 저장 이름, 포함 개수, 날짜 범위(또는 `날짜 없음`), 원문 표기 | 내 Flow 열기 |
| receipt → My Flow | 같은 저장 이름과 개수가 목록 행에 동일 문자열로 | 행 열기 |
| My Flow → 개인 Flow | 제목·개수·다음 예정이 workspace 헤더와 일치 | 다음 하나 완료 |
| 개인 Flow → Calendar | 날짜 있는 항목만, 같은 제목·같은 Flow 색·같은 완료 상태 | Flow 열기 또는 완료 |
| Calendar → 개인 Flow | 선택일과 스크롤 위치가 back으로 복원 | 편집 |
| 개인 Flow → export | effective included rows 기준 개수, 개인 수정본 반영 | receipt 확인 |
| export → reuse | export receipt identity, 새 기준일 run은 이전 run과 개인 고정 날짜 보존 | 재사용 또는 보관 |

## 4. 상태 전환과 복구

```text
discover → preview → adjust → save → receipt → open_personal_flow
        → execute → complete ⇄ reopen → inspect_calendar → export → revisit_or_reuse

adjust → cancel → preview
save_error → retry → receipt
export_error → retry → export_receipt
archive → undo | restore → active
personal_item_delete → restore → original_personal_order
date_set → date_clear → 개인 Flow 유지(Calendar에서만 제거)
```

## 5. 불변식 (화면이 지켜야 할 것)

1. 개인 고정 날짜는 기준일 재계산으로 덮어쓰지 않는다.
2. 완료는 제외·삭제·보관이 아니다.
3. 날짜 제거는 삭제가 아니다.
4. 원문 항목 제외는 원본 삭제가 아니다.
5. occurrence 완료는 series 정의를 바꾸지 않는다.
6. export 개수는 effective included rows에서 계산한다.
7. 개인 사본 2개(전체판·간단판)를 자동 병합하지 않는다.
8. internal taxonomy를 사용자 화면에 노출하지 않는다.
