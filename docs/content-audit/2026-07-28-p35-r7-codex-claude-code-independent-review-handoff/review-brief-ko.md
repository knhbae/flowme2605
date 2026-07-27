# P35-R7 독립 검토 브리프

## 1. 무엇을 검토하는가

P35는 화면을 크게 늘리는 대신 소유권을 다시 나눴다.

| Slice | 변경 의도 |
| --- | --- |
| P35-01 | Home 중복을 줄이고 `Flow 찾기 / 캘린더 / 내 Flow`로 진입 단순화 |
| P35-02 | public Flow에서 설명보다 실제 결과를 먼저 표시 |
| P35-03 | 저장 전 조정을 한 번에 한 종류만 보이도록 제한 |
| P35-04 | My Flow의 겹치는 Today·Calendar·Flow view 정리 |
| P35-05 | library와 선택한 개인 Flow workspace 분리 |
| P35-06 | Calendar를 날짜 lens와 선택일 실행으로 제한 |
| P35-07 | export를 범위·개수·형식·receipt 순서로 정리 |
| P35-R0 | 저장 후 가장 가까운 날짜 묶음을 먼저 표시 |
| P35-R1 | preview와 export preflight가 같은 artifact/count를 사용 |
| P35-R2 | 저장 전 한 항목의 제목·상세·날짜 수정 연결 |
| P35-R3 | 저장 receipt에서 같은 개인 Flow workspace로 연결 |
| P35-R4 | 콘텐츠 형태별 실행 단위 적용 |
| P35-R5 | Memo가 가짜 `다음 할 일`을 만들지 않게 정리 |
| P35-R6 | 모바일 선택일은 sheet, wide는 inspector로 표시 |
| P35-R7 | 다섯 형태 x 세 세션과 전체 회귀 최종 gate |

자동 검증은 통과했다. 독립 검토는 이 구성이 실제 사용자에게 자연스러운지
반박하는 단계다.

## 2. 유지해야 하는 계약

- source와 published Flow
- personal structural/value overlay
- execution run과 완료·다시 열기
- recurrence series와 occurrence
- whole / selected / current export identity
- 기존 localStorage key와 schema

검토 제안이 위 계약을 바꿔야만 가능하다면, 먼저 왜 UI composition으로 해결할 수
없는지 증명해야 한다.

## 3. 현재 shape별 문법

| 형태 | public result | 개인 workspace의 첫 실행 단위 |
| --- | --- | --- |
| Calendar | 날짜별 일정 24개 | 가장 가까운 날짜 묶음 |
| Checklist | 날짜 없는 항목 10개 | 다음 미완료 항목 |
| Routine | series 정의 1개 | 현재 occurrence |
| Sheet | 순서형 행 8개 | 현재 행과 다음 행 |
| Memo | 기록 4개 | 합성 실행 단위 없음 |

형태가 다르더라도 아래 anatomy는 가능한 한 일관되어야 한다.

```text
Flow identity
→ 현재 필요한 결과 또는 실행 단위
→ 하나의 주 행동
→ 전체 구조
→ 필요한 때만 수정·export·관리
```

## 4. owner feedback를 검증 가능한 질문으로 변환

### F01. public과 saved workspace의 시각 문법

public의 날짜 행과 저장 후 날짜 묶음이 서로 다른 제품처럼 보이지 않는지 확인한다.
동일 항목 anatomy, 날짜 group header, 제목·보조 정보, 오른쪽 완료 checkbox를
공유하는 대안도 비교한다.

### F02. 저장 직후 목적지

저장 성공 뒤 `오늘 할 일`을 중간 단계로 두는 것과, 저장한 전체 결과 및 가장
가까운 실행 묶음을 같은 workspace에서 보여주는 것을 비교한다.

### F03. 같은 날짜 묶음

Calendar형 Flow의 `다음 할 일`이 단일 항목인지, 같은 날짜의 미완료 항목 묶음인지
판단한다. 완료 후 다음 묶음으로 넘어가는 규칙도 확인한다.

### F04. 저장 전 조정과 export

사용자가 저장 전에 한 항목의 제목·상세·날짜를 충분히 조정할 수 있는지, 그리고
FlowMe 저장과 외부 artifact 가져가기를 같은 결과 preflight에서 예측할 수 있는지
확인한다.

### F05. 되돌리기

완료 후 행이 현재 화면에서 사라지거나 묶음이 바뀔 때만 즉시 undo가 필요한지,
행이 그대로 남으면 checkbox의 다시 열기로 충분한지 판단한다.

### F06. shape-aware 실행 영역

고정 `다음 행동` 탭을 없앤 뒤에도 Calendar·Checklist·Routine·Sheet·Memo의 첫
실행 단위가 설명 없이 이해되는지 확인한다.

### F07. 기록

기록이 없을 때 빈 영역을 만들지 않는지, 완료 history·단계 메모·회고·보류를 한
영역에 섞지 않는지 확인한다.

### F08. 실서비스 규모

60개 Flow에서 검색, 필터, 선택, 돌아가기, archive/restore/export가 화면을 압도하지
않는지 확인한다.

## 5. 검토 기준

각 화면에서 다음 수를 직접 센다.

- 첫 viewport의 경쟁 primary action
- 같은 대상에 대한 중복 control
- 같은 데이터를 반복하는 card/section
- 한 작업을 완료하는 tap/click depth
- 긴 설명 블록
- 접근 가능한 이름이 없는 조작 요소
- fixed UI overlap과 horizontal overflow

테스트가 통과해도 설명 없이는 목적을 이해하기 어렵다면 `supported`가 아니다.

## 6. 결과에 필요한 결론

- 현재 구조를 유지할 것
- bounded revision으로 고칠 것
- My Flow 또는 public composition을 다시 열 것
- publish를 막을 correctness 문제가 있는 것

시각 polish만으로 해결되지 않는 문제와 데이터 계약을 바꿀 필요가 없는 문제를
분리한다.
