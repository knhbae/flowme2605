# P35-H1 결정 옵션

## 추천

`B. 전역 My Flow 유지 + 내부 할 일 실행 보기`

FlowMe의 차별점은 Todo 앱을 다시 만드는 것이 아니라 source에서 가져온 전체 Flow,
개인 조정, 실행 상태, Calendar와 export를 같은 identity로 연결하는 데 있다.
B안은 익숙한 Todo 실행 문법을 추가하면서도 전체 Flow와 source 맥락을 잃지 않는다.

## A. 현재 My Flow 유지

### 얻는 것

- 전역 IA와 학습 비용 변화가 없다.
- Flow별 전체 계획, source, 조정, export 맥락이 가장 선명하다.
- 구현과 rollback 위험이 가장 작다.

### 잃는 것

- 여러 Flow의 오늘 할 일과 날짜 없는 할 일을 한 화면에서 실행하기 어렵다.
- Flow가 20개 이상이면 각 Flow를 열어야 다음 행동을 비교할 수 있다.

### 선택 조건

- Flow 단위 실행이 제품의 핵심이고 교차 Flow inbox가 필요하지 않다고 판단할 때

## B. My Flow 내부 할 일 보기

### 얻는 것

- today, upcoming, undated, completed를 익숙한 Todo 문법으로 확인한다.
- 날짜 지정/제거 시 같은 stable Item이 Todo와 Calendar 사이를 이동한다.
- Flow library와 focused workspace를 그대로 유지한다.
- opt-in을 제거하면 저장 데이터 변경 없이 A안으로 돌아간다.

### 제한

- Memo 기록, resource, routine series 정의, Sheet 전체 순서는 Todo에 넣지 않는다.
- Flow source와 전체 구조는 각 Flow detail에서 확인한다.
- 전역 탭 이름은 계속 `My Flow`다.

### 선택 조건

- 교차 Flow 실행 편의와 Flow 전체 맥락을 모두 유지하려 할 때

## C. 전역 할 일 탭

### 얻는 것

- 전역 navigation만 보고도 실행 화면의 목적을 이해하기 쉽다.
- 기존 Todo 사용자에게 가장 익숙하다.

### 위험

- Flow library의 새 진입과 명칭을 다시 설계해야 한다.
- global navigation과 onboarding, deep link, screenshot/evidence를 다시 검증해야 한다.
- FlowMe가 일반 Todo 앱처럼 읽힐 가능성이 있다.

### 현재 상태

- `alternative-c-prototype.html`과 screenshot만 존재한다.
- 앱 route, navigation, storage에는 적용하지 않았다.

## 모바일 전체 계획 기본값

### 기본 접힘

- 현재 실행에 집중하기 쉽다.
- 긴 24개 Flow의 첫 화면 밀도가 낮다.
- 저장 결과 전체 범위를 바로 확인하기는 한 단계 더 필요하다.

### 기본 펼침

- 저장한 전체 결과와 현재 위치를 즉시 확인한다.
- 24개 이상 Flow에서 첫 화면이 길고 현재 실행이 약해질 수 있다.

### 추천

저장 직후 receipt에서 처음 열 때는 전체 범위를 한 번 보여주고, 이후 재진입에서는
현재 실행 아래 기본 접힘으로 두는 조건부 정책을 R13 후보로 권장한다. 이 정책은
아직 구현하지 않았다.

## 사용자 답변 형식

1. A/B/C: `B`
2. 모바일 전체 계획: `기본 접힘`, `기본 펼침`, 또는 `첫 진입만 펼침`
3. 다음 단계: `추가 수정` 또는 `R13 시작`
