# P35-01 Entry Router Audit

## 1. 범위

이번 slice는 entry와 primary navigation만 바꿨다.

변경:

- `app/page.tsx`가 Home UI 대신 client entry router를 렌더링
- 유효한 저장 Flow를 쓰기 없이 판정하는 storage helper 추가
- Home hero, 활용 예시, Home CTA 코드 제거
- desktop/mobile primary navigation을 세 destination으로 축소

유지:

- public Flow composition
- My Flow local view와 workspace
- Calendar surface와 command
- direct route
- localStorage key와 schema
- source, personal, structural, run, occurrence, export identity

## 2. Route 결과

| 초기 상태 | route | 기대 | 실제 | evidenceKind |
| --- | --- | --- | --- | --- |
| localStorage 비어 있음 | `/` | `/flows` replace | `/flows` | current_browser |
| 유효한 saved Flow 1개 | `/` | `/my` replace | `/my` | current_browser |
| direct | `/flows` | Flow 찾기 유지 | 유지 | current_browser |
| direct | `/calendar` | Calendar 유지 | 유지 | current_browser |
| direct | `/my` | My Flow 유지 | 유지 | current_browser |

malformed `flow:saved:`와 `flow:map:saved:` record는 저장 Flow로 계산하지 않는다. 판정 helper는 storage에 값을 쓰거나 지우지 않는다.

## 3. Navigation

desktop과 mobile 모두 다음 세 link만 제공한다.

1. `Flow 찾기`
2. `캘린더`
3. `내 Flow`

각 direct route에서 `aria-current="page"`는 하나만 존재했다. 첫 link에 focus를 둔 뒤 `Tab` 두 번으로 Calendar와 My Flow에 순서대로 이동했다.

## 4. Visual review

### 390×844

- Flow 찾기 카드와 bottom navigation 사이 가로 overflow 없음
- 저장 있음 entry는 기존 My Flow로 바로 연결
- Home hero, 활용 예시, Home CTA flash 없음
- fixed navigation과 다른 fixed/sticky action 교차 0

### 1024×768

- header 중앙의 세 destination이 한 줄로 유지
- active destination과 보조 메뉴가 시각적으로 분리
- horizontal overflow 0

### 1440×900

- 1024와 같은 정보 구조를 유지
- navigation이 과도하게 늘어나지 않음
- horizontal overflow 0

## 5. 코드와 복잡도

- 기존 Home surface: 127 lines removed
- primary navigation destination: 4 → 3
- entry router 사용자 조작 control: 0
- 신규 storage key: 0
- migration: 0
- 기존 saved record mutation: 0

## 6. 검증 결과

| 검증 | 결과 |
| --- | --- |
| docs check | pass, required 14 / local links 3170 |
| unit | 589/589 pass |
| production build | pass |
| build ID | present |
| P35 entry E2E | 4/4 pass |
| navigation/public regression E2E | 45/45 pass |
| diff check | pass, 기존 line-ending warning만 존재 |
| browser console/page error | 0 |
| horizontal overflow | 0 |
| fixed overlap | 0 |

## 7. 평가와 다음 경계

P35-01의 목적은 Home을 다른 화면으로 옮기는 것이 아니라 발견 surface를 `/flows` 하나로 줄이는 것이었다. `/flows`에 새 hero, 추천 dashboard, social proof를 추가하지 않았다.

현재 `/my` 내부의 `지금 / Flow 목록 / 완료` mode는 그대로다. 이는 P35-05 범위이며 이번 pass를 이유로 완료됐다고 보지 않는다.

P35-02는 public save-before frame을 결과 우선으로 재구성하되 이번 storage와 route 계약을 유지해야 한다.

실제 관찰 사용자 수는 0이다.
