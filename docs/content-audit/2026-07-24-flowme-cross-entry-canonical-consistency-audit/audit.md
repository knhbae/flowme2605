# 상세 감사

## 1. 범위와 방법

현재 production을 모바일 `390x844`에서 직접 조작했다.

확인 route:

- `/`
- `/flows`
- `/f/moving-d30-basic`
- `/flow-maps/moving-d30`
- `/f/curated-ajd-moving-d30`
- `/f/source-backed-moving-d30`
- `/f/vehicle-inspection-prep`
- `/f/curated-wedding-naver-timeline`
- `/f/curated-wedding-gongysd-atoz`
- `/f/curated-allblanc-morning-workout`
- `/f/curated-allblanc-no-jump-cardio`
- `/flow-maps/middle-school-math-1`
- `/flow-maps/curated-opic-mock-course`
- `/flow-maps/curated-reading-routine-log`
- `/flow-maps/curated-new-car-purchase-guide`
- `/my?view=flows`
- `/calendar`

각 route에서 title, source, item count, result, shell, save action, adjustment, receipt, localStorage key, My Flow row, Calendar occurrence, horizontal overflow, console/page error를 비교했다.

Evidence kind:

- `current_production_interaction`
- `current_production_screenshot`
- `current_source`
- `current_decision`
- `current_test_gap`

## 2. Finding

### H-01 같은 AJD 이사 원문이 4개 사용자 route로 분기한다

Route:

- Home -> `/f/moving-d30-basic`
- Find card -> `/flow-maps/moving-d30`
- URL lookup -> `/f/curated-ajd-moving-d30`
- alias -> `/f/source-backed-moving-d30`

기대:

- 같은 원문과 같은 사용자 job은 하나의 Flow object로 보인다.
- entry가 달라도 title, 전체 항목, artifact eligibility, save payload가 같다.

실제:

| route | title | 항목 | architecture | 저장 후 |
| --- | --- | ---: | --- | --- |
| `/f/moving-d30-basic` | 이사 D-30 준비 | 24 | p29 artifact-first | 같은 화면의 receipt |
| `/flow-maps/moving-d30` | 원룸 이사 D-30 일정 | 5 | hybrid legacy | 즉시 My Flow |
| `/f/curated-ajd-moving-d30` | source-backed 5-item variant | 5 | p29 artifact-first | receipt |
| `/f/source-backed-moving-d30` | source-backed 5-item variant | 5 | p29 artifact-first | receipt |

사용자 영향:

- 어느 쪽이 전체 Flow인지 판단할 수 없다.
- Home과 Find에서 같은 내용을 저장해도 별도 Flow가 된다.
- 한쪽에서 한 완료·수정·보관이 다른 쪽에 이어지지 않는다.

Current decision conflict:

`docs/DECISIONS.md`는 `Home, Flow finding, save-before, post-save, My Flow, Calendar, export`에 하나의 사용자 Flow object를 사용하고 Flow Map은 내부 bundle로 유지한다고 정한다.

### H-02 같은 source를 두 entry에서 저장하면 My Flow 중복 객체가 생긴다

재현:

1. localStorage clear
2. `/flow-maps/moving-d30`에서 `그대로 시작`
3. `/f/moving-d30-basic`에서 `날짜 없이 시작`
4. `/my?view=flows`

실제:

- `이사 준비` 24개
- `원룸 이사 준비` 5개

저장 key도 `flow:saved:moving-d30-basic`, `flow:saved:source-backed-moving-d30`, `flow:map:saved:moving-d30` 등으로 분리된다.

Evidence:

- `screenshots/05-my-flow-duplicate-moving-390.png`

### H-03 artifact choice가 category에 따라 작동하거나 죽는다

재현 A:

1. `/f/moving-d30-basic`
2. `체크리스트 24개` 클릭

재현 B:

1. `/f/vehicle-inspection-prep`
2. `체크리스트 10개` 클릭

실제 A/B:

- 선택 button `aria-pressed=false`
- Calendar heading과 rows 유지
- 저장 CTA 결과 유지

대조:

- `/f/curated-wedding-naver-timeline`에서 `체크리스트 6개`는 선택되고 heading도 변경된다.

Source cause:

- `FlowArtifactDataPreview`는 controlled `selectedShape`를 우선한다.
- `AppClient`는 controlled shape를 모든 public route에 넘긴다.
- change handler는 `결혼 / 운동 / 러닝` category에서만 전달한다.

따라서 eligible shape를 button으로 보이게 하고 실제 선택은 일부 category에서만 허용하는 false affordance가 된다.

### H-04 하나의 catalog 안에 legacy와 current composition이 혼재한다

`/flows`의 9개 hydrated catalog card:

| 구분 | 개수 | route | architecture | receipt |
| --- | ---: | --- | --- | --- |
| legacy Flow Map | 5 | `/flow-maps/*` | hybrid | 없음 |
| current public Flow | 4 | `/f/*` | p29 artifact-first | 있음 |

Legacy 5:

- 원룸 이사 D-30
- 중1 수학 목차 진도
- 오픽 모의고사 2주/1달 계획표
- 월 4권 독서 기록 루틴
- 신차 구매 7단계 체크리스트

Current 4:

- 결혼 준비 1년 참고 타임라인
- 결혼 준비 핵심 4가지 시작표
- Allblanc 아침 5분 홈트
- Allblanc 노점프 유산소

기존 E2E는 `/flow-maps`의 `P30-LEGACY-COMPOSITION-ACTIVE` marker를 명시적으로 허용한다. 따라서 회귀가 아니라 아직 닫지 않은 rollout gap이다.

### H-05 Home 예시와 Find inventory가 연결되지 않는다

Home 예시:

- moving
- vehicle
- workout

Hydrated Find inventory:

- moving은 다른 Flow Map identity로 존재
- workout은 같은 `/f` route로 존재
- vehicle은 없음

`차량 점검` 검색 결과는 0개다. 반면 `app/flows/page.tsx`의 server fallback에는 vehicle link가 있어 hydration 전후 inventory도 다르다.

### M-01 차량 card promise와 target product가 다르다

Home promise:

- `차량 점검표를 내 체크리스트로`
- `필요할 때 실행`

Target:

- 자동차검사 D-14
- 검사일 필수 맥락
- Calendar primary

또한 체크리스트 choice가 작동하지 않아 Home promise로 복귀할 방법도 없다.

### M-02 preview date와 실제 save intent를 이해하기 어렵다

Moving/vehicle initial state:

- Calendar 결과가 예시 날짜로 채워져 있다.
- Calendar choice가 pressed다.
- sticky primary는 `날짜 없이 시작`이다.

P26 계약상 예시 날짜는 저장하지 않는 것이 맞고 CTA도 실제 결과를 말한다. 그러나 한 viewport에서 visual result와 저장 intent가 반대로 읽혀 사용자가 별도 설명 없이 이해하는지는 확인되지 않았다.

판정: functional contract는 supported, comprehension은 unverified.

### M-03 반복 표현 projection이 일치하지 않는다

Workout custom date:

- Calendar에 월/수/금 occurrence 3개가 생성된다.
- occurrence별 완료 checkbox가 보인다.

Workout undated save:

- My Flow row에 raw `FREQ=WEEKLY;BYDAY=MO,WE,FR`가 노출된다.

계산 contract보다 display adapter 누락에 가깝다.

## 3. 잘 된 부분

- 결혼 timeline과 4-item sheet는 별도 entry로 분리되어 있다.
- 결혼 Flow의 artifact choice는 실제로 작동한다.
- 운동 Flow의 recurrence summary와 다음 3회차 preview가 보인다.
- custom date로 저장한 운동 Flow는 Calendar에 반복 occurrence가 나타난다.
- P32 My Flow focused workspace는 한 Flow를 연 뒤의 command hierarchy를 줄였다.
- 9개 catalog sample의 모바일 horizontal overflow는 0이다.
- 동일 sample에서 console error와 page error는 0이다.

## 4. 기존 테스트가 놓친 이유

현재 테스트는 각 route 내부의 요소 존재와 marker를 잘 검증한다. 그러나 다음 cross-entry invariant가 없다.

1. 같은 source URL은 하나의 canonical user-facing Flow ID다.
2. Home, Find, URL lookup alias의 item count가 같다.
3. 서로 다른 alias를 저장해도 My Flow row가 하나다.
4. 같은 source의 artifact eligibility와 selected result가 같다.
5. Home example은 Find에서 동일 identity로 검색된다.
6. visible artifact choice는 click 후 selected result를 바꾼다.
7. save-before와 receipt handoff가 entry별로 달라지지 않는다.

`source-backed map and public Flow use the same artifact-first decision grammar` 테스트도 두 route의 외형을 각각 확인할 뿐 서로 같은 object/count/save result인지 비교하지 않는다.

## 5. 권장 회귀 계약

필수 E2E:

- `same source from Home and Find resolves to one canonical Flow`
- `same source aliases share title item count and primary artifact`
- `saving Home and Find aliases produces one My Flow object`
- `Home examples are rediscoverable in Find`
- `every visible artifact shape control changes selected projection`
- `canonical save uses one receipt and one storage identity`
- `legacy alias preserves existing personal/run data after reconciliation`

## 6. 변경 금지 경계

이번 발견 때문에 다음을 다시 쓰지 않는다.

- source / personal overlay / execution run / occurrence / export identity 전체 계약
- P32 focused My Flow workspace
- Calendar engine
- 4탭 IA
- public `/f` shell

필요한 것은 route alias와 canonical Flow registry, save handoff, legacy local record reconciliation이다.
