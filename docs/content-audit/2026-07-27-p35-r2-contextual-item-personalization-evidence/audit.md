# P35-R2 상세 감사

## 1. 문제

public Flow는 저장 전 전체 결과를 보여주지만 항목 하나의 제목, 실행
상세, 날짜를 자연스럽게 고칠 수 없었다. 기존 `Flow 조정`의 포함 목록은
checkbox가 왼쪽에 있어 저장 후 실행 행의 읽기 문법과도 달랐다.

사용자는 전체 editor를 배우지 않고 다음 흐름을 기대한다.

```text
결과 확인
  -> 한 항목 선택
  -> 제목/상세/날짜만 수정
  -> 결과에서 즉시 확인
  -> My Flow로 저장
```

## 2. 선택한 해결책

새 editor나 저장 schema를 만들지 않고 contextual item editor를 기존
projection과 personal overlay 사이에 배치했다.

```text
source Item
  -> in-memory public personalization
  -> FlowExperienceProjection preview
  -> save
  -> existing My Flow item draft/date override
  -> My Flow / Calendar / portable export
```

public 화면을 떠나기 전에는 source snapshot과 localStorage를 바꾸지 않는다.
Flow 저장이 성공한 뒤에만 기존 개인 사본 저장 경로로 승격한다.

## 3. UI 문법

### 390x844

- 결과 행에서 `수정` 1 tap
- bottom sheet
- 필드 3개: 할 일, 상세 내용, 날짜
- primary action 1개: `이 항목 저장`
- 취소, Escape, 바깥 닫기 후 원래 수정 trigger로 focus 복귀
- time, recurrence, add, delete, reorder control 0

### 1024x768

- 동일 form이 화면 오른쪽 inspector로 열린다.
- inspector 폭은 `470px` 이하이고 plan canvas를 전면 교체하지 않는다.
- 동시에 열린 editor 1개
- `포함 항목` 행은 제목/날짜/수정을 먼저 읽고 checkbox가 오른쪽 끝에 있다.

## 4. 상태와 저장

| 값 | 저장 위치 | source 영향 |
| --- | --- | --- |
| 개인 제목 | 기존 canonical item draft | 없음 |
| 상세 내용 | 기존 personal memo | 없음 |
| 고정 날짜 | 기존 item draft/date override | 없음 |
| 날짜 제거 | 기존 unscheduled sentinel | 없음 |
| 포함/제외 | 기존 Flow item personal exclusion | 없음 |

날짜만 수정한 personalization에는 제목이나 상세 변경을 암묵적으로
적용하지 않는다. 이 규칙을 unit test로 고정해 기존 personal memo 손실을
막았다.

## 5. Projection 결과

대표 `/f/moving-d30-basic`에서 첫 항목을 다음처럼 수정했다.

- 제목: `이사 방식 최종 결정`
- 상세: `가족과 견적을 확인하고 최종 업체를 적어둡니다.`
- 날짜: `2030-08-15`

확인 결과:

1. public Calendar preview의 해당 stable Item이 `15(목)` 그룹으로 이동
2. My Flow 전체 계획에 같은 제목과 `8월 15일` 표시
3. `/calendar`의 `2030-08-15` event와 selected-day group에 같은 제목 표시
4. canonical item draft key에 제목/상세/날짜 유지
5. source mutation count `0`

portable export는 이번 adapter가 기존 My Flow personal state를 사용하므로
기존 moving item title/date/memo export 회귀 테스트로 확인했다. 새 export
builder나 destination은 추가하지 않았다.

## 6. 접근성

- editor는 `role=dialog`, `aria-modal=true`
- 제목 input에 초기 focus
- Tab focus trap
- Escape 닫기
- 닫은 뒤 stable Item 수정 trigger로 focus 복귀
- checkbox accessible name에 항목 제목과 포함 의미 포함
- 수정 trigger accessible name에 항목 제목과 수정 범위 포함

## 7. 데이터 영향

| 영역 | 변경 |
| --- | --- |
| source snapshot | 없음 |
| personal overlay | 기존 필드에 저장 |
| execution run | 없음 |
| occurrence identity | 없음 |
| export identity | 없음 |
| localStorage key/schema | 변경 없음 |
| migration | 불필요 |

## 8. Rollback

`PublicFlowItemEditor`, preview row edit callback, save promotion 호출을 제거하면
기존 public Flow 화면으로 돌아간다. source, save record, My Flow schema는
그대로이므로 rollback migration이 필요하지 않다.

## 9. 잔여 위험

1. 상세 내용은 기존 personal memo 계약을 사용한다. source description
   자체를 지우거나 재작성하는 creator editor는 이번 범위가 아니다.
2. pre-save item personalization은 현재 페이지 세션 중 유지되고 Flow 저장
   시 영속화된다. 저장하지 않고 페이지를 떠난 draft 복구는 제공하지 않는다.
3. 저장 receipt와 일반 My Flow의 command hierarchy 연속성은 `P35-R3`에서
   다시 검토한다.
4. 실제 사용자가 `수정`을 설명 없이 찾고 3개 필드만으로 충분하다고
   느끼는지는 관찰 사용자 `0명` 상태라 확인되지 않았다.
5. full E2E와 독립 final gate는 `P35-R7`에서 실행한다.
