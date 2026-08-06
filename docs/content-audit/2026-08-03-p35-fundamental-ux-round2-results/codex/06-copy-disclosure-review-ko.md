# Copy & Disclosure Review

## 결론

이번 감산의 기준은 `?`·`!`를 더 붙이는 것이 아닙니다.

1. 반복 설명은 삭제합니다.
2. 결정을 바꾸는 결과는 행동 가까이에 한 번만 둡니다.
3. 드문 정의·예외는 progressive help로 옮깁니다.
4. 안전·손실·영구 변경은 열지 않아도 보이게 합니다.

## 1. 정보 등급

| 등급 | 기준 | 표현 | 예시 |
|---|---|---|---|
| 삭제 | 값·제목·CTA를 그대로 다시 말함 | 제거 | 날짜 input 바로 아래 같은 날짜, `실행할 일` heading |
| 결정 지점 inline | 지금 선택에 직접 영향 | input/CTA 옆 한 줄 | 날짜 없음 2개는 캘린더에서 제외 |
| progressive help | 과업 필수는 아니지만 정의·예외 설명 | disclosure/popover/sheet | Flow 용어, Todo와 checklist 차이 |
| 항상 보이는 주의 | 피해·중단·영구 손실 가능 | 짧은 inline 경고 + 상세 확장 | 통증 시 중단, 영구 삭제, 중복 생성 |
| 결과 영수증 | 실행 후 사실 | status/receipt | 무엇을 어디에 몇 개 만들었는지 |

## 2. 삭제할 copy

| 현재 | 이유 | 처리 |
|---|---|---|
| input `2030-09-01` + `이사일: 9월 1일` | 같은 값 echo | 확인 문장 삭제. 미리보기 날짜 범위만 갱신 |
| `실행할 일` | Item 제목·완료 check가 이미 의미 전달 | heading 삭제 |
| `내 실행 공간` + `My Flow` + 설명 | eyebrow·제목·설명이 같은 위계 반복 | `My Flow`만 유지, 필요한 상태 한 줄 |
| `저장한 계획 관리` + `저장한 Flow` | 같은 정보 반복 | eyebrow 삭제 |
| `현재/조정 후`가 변화 없을 때 | 같은 제목·개수 두 번 | 달라진 필드만 diff |
| Flow Map `내 조건: 입력 없음` | 결정에 정보 없음 | input이 실제 있을 때만 표시 |
| Flow Map `저장 결과/전체` 반복 | preview·CTA가 다시 말함 | CTA 옆 `선택 7/전체 8` 한 번 |

## 3. 용어와 CTA

| 현재 | 권장 | 이유 |
|---|---|---|
| Flow 미리보기 | 저장 전 미리보기 | lifecycle 상태를 말함 |
| Flow 편집 | 계획 조정 | 클릭 뒤 일을 예측 |
| 내 Flow에서 이어하기 | 방금 저장한 계획 열기 | 목적어와 최근 context 명시 |
| 전체 24개 옮기기 | 저장한 24개 옮기기 | 어느 버전인지 명시 |
| 할 일 수정 | 수정 | Item 상세 안에서는 대상이 이미 분명 |
| 이 항목 저장(public child) | 이 조정 적용 | 영구 저장 아님을 구분 |
| 이 내용으로 적용 | 유지 | working draft에 적합 |
| 변경 저장 | 유지 | persisted personal state에 적합 |
| 완료 | 실행 Item에만 유지 | save/apply/export에서는 사용 금지 |
| 다시 열기 | 유지 | 완료 취소의 결과가 명확 |

`Flow`는 브랜드·내부 모델로 유지할 수 있습니다. 단, 첫 노출과 행동 label에서 결과 언어를 먼저 씁니다.

```text
Flow 미리보기 → 저장 전 미리보기
Flow 편집 → 계획 조정
캘린더 24개로 시작 → 유지
저장한 Flow → 저장한 계획 (초기 사용자 실험 후보)
```

전면 치환은 이해도 근거 없이 route·브랜드·문서 비용만 키울 수 있어 보류합니다.

## 4. 도움말로 이동할 내용

- Flow가 무엇인지
- Todo와 checklist의 차이
- routine을 ICS 1개 recurring event로 축약하는 이유
- 일부 포맷에서 subcheck/resource가 flatten되는 규칙
- Flow Map이 여러 child Flow를 묶는 방식
- 자주 쓰지 않는 advanced schedule 옵션

도움말은 제목이 `?` 하나가 아니라 설명 가능한 accessible name을 가져야 합니다.

```text
[도움말: 체크리스트와 오늘 할 일의 차이]
[도움말: 반복 일정 내보내기]
```

## 5. 항상 보일 내용

| 정보 | 최소 inline 문장 | 상세에 둘 것 |
|---|---|---|
| 건강·안전 | `통증·어지러움·호흡 문제가 생기면 중단하세요.` | 대상별 예외, 전문가 확인 근거 |
| calendar 손실 | `날짜 없는 2개는 캘린더에 포함되지 않습니다.` | 제외 Item 목록 |
| 단방향 export | `한 번 복사하며 자동으로 동기화되지 않습니다.` | 다시 보내기·중복 규칙 |
| 영구 삭제 | `이 기기의 개인 수정과 기록이 삭제됩니다.` | source public Flow 보존 여부 |
| 부분 성공 | `22개 성공, 2개 실패` | 실패 원인·재시도 Item |
| 저장 상태 | `예시 일정·저장되지 않음` | source/personal version 상세 |

현재 Allblanc 운동 중단 조건이 인라인인 것은 유지해야 합니다. 이를 `!` 안에만 숨기는 안은 기각합니다.

## 6. public 상세 copy hierarchy

### 권장

```text
저장 전 미리보기 · 이사
이사 D-30 준비
원문 · 이사 체크리스트 참고

캘린더 24개
8월 2일 - 9월 2일
[첫 3개]

이사일 [2030-09-01]

[캘린더 24개로 시작]
[계획 조정] [현재 조정본 옮기기]
```

- primary 행동 하나
- secondary는 같은 visual weight를 쓰지 않음
- 행별 수정은 row hover/detail 또는 `계획 조정` 안으로 이동 검토
- input echo 제거

## 7. My Flow copy hierarchy

### 일반 `/my`

```text
My Flow
저장한 계획에서 오늘 할 일을 모았습니다.

오늘 할 일 · 최대 3개
...

[저장한 계획 5개 보기]
```

오늘 항목이 없을 때는 미래나 날짜 없는 Item을 `오늘 할 일`로 섞지 않습니다.

```text
오늘 할 일이 없습니다

다음 예정
내일 · 전입 신고 준비

[저장한 계획 5개 보기]
```

### 선택 Flow

```text
이사 D-30 준비
0/24 완료

다음 3개
...

전체 계획 24개
[기준일 바꾸기] [저장한 24개 옮기기] [관리]
```

`Flow 관리`는 가능하지만 첫 노출에서는 `관리`만으로 충분합니다. 상세 menu 안에서 `이름·일정 조정`, `원문 보기`, `보관`으로 대상과 결과를 말합니다.

## 8. 접근성·상호작용 규칙

### `?`·`!`

- 장식이면 `aria-hidden=true`이고 interactive target이 아님
- interactive면 44×44px target, accessible name, keyboard open/close, Escape, focus return 필수
- 중요 주의를 icon 안에만 넣지 않음
- 짧은 문장마다 modal을 만들지 않음

현재 `ItemDetailContent`의 `? 왜 필요한가`, `! 주의`는 정적 heading입니다. 터치 target으로 평가하거나 popup 체계가 구현됐다고 보지 않습니다.

### sheet/dialog

- 제목과 설명을 `aria-labelledby/aria-describedby`로 연결
- 처음 focus는 heading 또는 첫 input
- 중첩 editor에서는 Back이 가장 안쪽만 닫음
- dirty state는 `계속 수정/변경 버리기`
- 닫으면 정확한 opener로 복귀

## 9. 검증 과업

| 과업 | 성공 기준 |
|---|---|
| 처음 본 public 상세 | 5초 안에 무엇을 몇 개 얻는지 설명 |
| Flow 용어 | 정의가 아니라 CTA 클릭 후 결과를 설명 |
| 날짜 변경 | echo 없이 preview가 바뀐 곳을 찾음 |
| export | 어느 버전을 어디로 몇 개 보냈고 자동 sync인지 설명 |
| 운동 주의 | help를 열지 않고 중단 조건을 찾음 |
| dirty edit | Back 후 수정 유지/폐기를 예측 |
| 완료 | save/apply가 아니라 실제 Item 상태로만 이해 |

실제 사용자 관찰 전에는 U10과 copy 이해도를 `O`로 올리지 않습니다.
