# P35-03 One Adjustment Kind Audit

## 1. 문제

P35-02에서 실제 결과를 먼저 보여주도록 public 저장 전 화면을 정리했지만, 기존 `Flow 조정`은 포함 여부, 항목 제목, 개별 날짜, 메모, 순서를 한 화면에서 다뤘다. 사용자는 저장하기 전에 무엇부터 바꿔야 하는지 판단하기 어려웠고 My Flow의 post-save editor와 책임도 겹쳤다.

P35-03은 저장 전 조정을 최소 개인화로 한정한다.

- Flow 이름
- Flow 전체 기준일
- 저장할 항목 포함 여부
- 반복 series 설정

항목별 제목·날짜·메모·순서 편집은 저장 후 My Flow에 남긴다.

## 2. 화면 계약

### 공통

- 조정 panel은 한 번에 하나
- 종류 선택 후 해당 입력만 표시
- 현재와 조정 후 결과를 나란히 비교
- 적용과 취소를 분리
- 적용은 저장하지 않음
- 취소와 `Escape`는 draft를 폐기
- 닫힌 뒤 원래 trigger로 focus return

### route별 조정 종류

| route | 이름 | 기준일 | 포함 항목 | 반복 |
| --- | ---: | ---: | ---: | ---: |
| `/f/moving-d30-basic` | 1 | 1 | 1 | 0 |
| `/f/vehicle-inspection-prep` | 1 | 0 | 1 | 0 |
| `/f/curated-allblanc-morning-workout` | 1 | 1 | 1 | 1 |

날짜 없는 차량 점검에는 의미 없는 기준일과 반복 control을 노출하지 않는다.

## 3. 상태와 데이터

| 조정 | 저장 위치 | source 변경 |
| --- | --- | ---: |
| 이름 | 기존 personal title 경로 | 0 |
| 기준일 | 기존 public date intent와 saved anchor | 0 |
| 포함 항목 | 기존 `FlowItemState.personalExcluded` | 0 |
| 반복 | 기존 weekday/routine definition | 0 |

새 persistence key, schema, migration은 없다. 적용 전 draft는 component state에만 있으며 취소하면 사라진다.

## 4. 포함 항목 projection parity

이사 Flow 24개에서 2개를 제외한 상태를 검증했다.

| consumer | 결과 |
| --- | ---: |
| source item count | 24 |
| actual result preview | 22 |
| save CTA | 22 |
| export preflight | 22 |
| source mutation | 0 |

초기 구현 검증에서 export preflight만 24개를 읽는 불일치를 발견했다. export 입력을 전체 source 배열이 아니라 `publicExperienceProjection.outlineRows`로 맞춘 뒤 22개로 일치했다.

## 5. 반복

반복 조정은 series 설정과 occurrence 미리보기를 섞지 않는다.

- 월·화·수·금
- 07:30
- 45분
- 8회

변경 후 routine summary와 primary result summary가 같은 값을 읽는다. 항목 완료나 회차 실행 상태는 이번 조정에서 변경하지 않는다.

## 6. responsive와 접근성

### 390x844

- 이름과 기준일 입력이 다른 control과 겹치지 않음
- sticky 적용 명령과 bottom navigation overlap 0
- 중복 기준일 label 제거
- `Escape`, 취소, 적용 후 trigger focus return
- horizontal overflow 0

### 1024x768

- 24개 항목을 bounded internal scroll 영역에서 표시
- item title과 날짜 label overlap 0
- 적용 명령이 목록을 덮지 않음
- horizontal overflow 0

### 1440x900

- 반복 요일, 시간, duration, 종료 조건을 한 active panel에 표시
- 다른 조정 입력 동시 노출 0
- current/adjusted comparison 유지
- horizontal overflow 0

## 7. 테스트와 회귀

P35-03 E2E 5개가 다음을 검증한다.

1. 이름 취소·적용·Escape·focus return
2. 기준일 current/adjusted 비교와 base input 중복 0
3. 포함 제외 후 preview/save/export 22개 일치
4. 반복 summary와 progressive editor
5. 날짜 없는 checklist의 irrelevant kind 0

P24, P27, P28, P29, P30, P31, P34 및 핵심 Flow E2E 10개를 새 경계에 맞췄다. 과거 테스트가 저장 전 항목별 고급 편집을 다시 요구하지 않으며, 해당 편집은 My Flow에서 검증한다.

## 8. 검증 결과

| 검증 | 결과 |
| --- | --- |
| docs check | pass, required 14 / local links 3189 |
| pretest | 73/73 pass |
| unit | 590/590 pass |
| production build | pass |
| P35-03 E2E | 5/5 pass |
| 변경 여정 targeted E2E | 10/10 pass |
| horizontal overflow | 0 |
| fixed overlap | 0 |
| console error | 0 |
| page error | 0 |
| diff check | pass, line-ending warning only |

## 9. 다음 경계

P35-04는 `/calendar`의 대형 client tree에서 안전하게 분리 가능한 leaf와 dead view를 먼저 감사한다. P35-03의 public adjustment component와 projection contract를 다시 열지 않는다.

실제 관찰 사용자 수는 0이다.
