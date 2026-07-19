# FlowMe 콘텐츠 포트폴리오 확장 Round 2 앱 handoff

- 기준일: 2026-07-11
- 입력 데이터: `docs/content-audit/2026-07-11-content-portfolio-expansion-round2-v1.json`
- 앱 코드/seed 변경: 없음
- 목표: 아래 순서로 기존 타입에 매핑하되 내부 검토 데이터는 사용자 화면에서 숨긴다.

## 적용 순서

### First canary

1. `kmooc-philosophy-fifteen-week` - K-MOOC 제자백가 15주 학습: 1 Flow / 15 Item
2. `family-birthday-event-map` - 가족 생일 행사 준비: 2 Flow / 11 Item
3. `photo-thirty-day-challenge` - 30일 사진 찍기: 1 Flow / 30 Item
4. `banchan-three-day-map` - 3일 반찬 만들기: 2 Flow / 4 Item
5. `work24-job-support-map` - 고용24 취업지원 시작: 2 Flow / 19 Item

이 5개는 서로 다른 lifeArea와 사용자 순간을 먼저 검증한다. 한 번에 public으로 올리지 말고 internal canary로 저장·첫 행동·export를 확인한다.

### Second wave

1. `personal-business-registration` - 개인 사업자등록 준비: 공식 준비서류와 신청서 작성 Flow는 완성했다. 과세유형·인허가 분기 QA 뒤 2차 적용한다.
2. `corporate-mail-order-registration` - 법인 통신판매업 신고: 법인 대상임을 제목과 메모에 고정하고 정부24 최신성 확인 후 2차 적용한다.
3. `passport-renewal-map` - 여권 재발급 준비: 성인·미성년자 분리를 유지하고 대리신청 세부 분기 QA 후 2차 적용한다.
4. `creator-content-thirty-day` - 30일 콘텐츠 발행: 완전한 CSV row set은 통과시키되 영어 상업 template 권리 검토 후 2차 적용한다.
5. `vehicle-inspection-cycle` - 자동차 정기검사 일정: 한 개 핵심 의무를 억지로 늘리지 않는 일정 Flow로 유지하고 date_window adapter QA 후 2차 적용한다.

## 기존 앱 타입 매핑

| 준비 데이터 | 기존 앱 타입 | 변환 원칙 |
|---|---|---|
| Content Bundle의 각 child Flow | `FlowBundle` + `Flow` | Map 자체는 registry 묶음으로 두고 각 Flow를 실행 가능한 기존 bundle로 펼친다. |
| Step | `FlowSection` | 원문 주차·시기·단계·조리 세션 제목과 order를 보존한다. |
| Item | `FlowItem` | `itemTitle`을 title로, schedule의 dayOffset/date window를 기존 필드로 옮긴다. |
| detail·memo·source | `FlowItemDetail` | how 또는 links에 짧게 합치고, source URL은 공식/creator link type으로 보존한다. |
| 30일 챌린지 | `routine_duration_days=30` | day_offset 0~29를 쓰며 무기한 repeat를 만들지 않는다. |
| 행사·검사 기간 | `date_window` | 원문 라벨과 start/end offset을 함께 보존한다. |

새 runtime type은 필요 없다. 현재 JSON의 `sourceRowIds`, 점수, reviewRecords는 seed runtime에 넣지 않는다.

## 일정·반복 변환

- `day_offset`: 시작일 또는 행사일 anchor 기준 기존 `day_offset`으로 변환한다.
- `date_window`: 기존 `FlowItem.date_window`의 label, start_day_offset, end_day_offset으로 변환한다.
- 돌잔치의 4개월·2~3개월 표현은 현재 curated adapter 방식인 월 x 30일로 변환하되, 화면과 description에는 원문 월 라벨을 남긴다.
- 자동차 정기검사는 차종마다 주기가 달라 고정 `repeat_rule`을 넣지 않는다. 사용자가 실제 만료일을 입력하고 완료 후 다음 공식 만료일을 다시 저장한다.
- K-MOOC·사진·콘텐츠·반찬은 source week/day row만 배치한다. 쉬는 날이나 복습 Item을 추가하지 않는다.

## 사용자 화면에서 숨길 데이터

- `reviewRecords`, 모든 점수와 score comment
- candidate 판정, 보류·삭제 이유, rights review 메모
- `sourceTrace` 원문 위치의 내부 표기. 사용자에게는 source title과 링크만 보여준다.
- `firstCanary`, `secondWave`, `ready_*` 같은 내부 상태 문자열

## 사용자 화면에 남길 데이터

- Flow 제목, Step 제목, 최소 Item 제목
- 실행에 필요한 detail·memo
- source title과 원문 링크
- 사용자가 바꾸는 제목·시작일·행사일·신청일·만료일
- 완료 여부와 일반 메모

## 앱 구현 QA

- 10개 Bundle 중 승인된 wave만 registry/seed에 넣었는지 확인한다.
- Map의 child Flow가 서로 다른 primary source를 유지하는지 확인한다.
- 모든 Flow 카드에서 저장 후 생기는 첫 행동이 5초 안에 보이는지 확인한다.
- 30일 챌린지가 30일 뒤 멈추고 Item이 30개보다 늘어나지 않는지 확인한다.
- 반찬이 장보기 1 Item + 조리 세션 3 Item으로 보이는지 확인한다.
- K-MOOC가 15주, 아이 생일이 5개 시기, 자동차 검사가 2개 Item인지 확인한다.
- 메모에 수량·업체·링크·상태를 쓸 수 있고 별도 무거운 Field가 추가되지 않았는지 확인한다.
- source 링크가 새 창에서 열리고 official/creator 구분이 보이는지 확인한다.
- calendar/checklist/Markdown/sheet export에서 제목·날짜·메모·source link가 유지되는지 확인한다.
- 모바일 390px에서 Flow와 Step 접힘, 긴 한글·영문 제목, source link가 가로로 넘치지 않는지 확인한다.
- 사용자 surface에 점수·review·sourceRowIds·internal canary 문구가 노출되지 않는지 확인한다.

## 구현 금지

- 원문에 없는 일정·복습·기록·확인 Item 추가
- 과세유형, 신고면제, 차량 주기, 대리신청 자격을 앱이 대신 판단
- 건강·병원·행정 상세를 별도 record Field로 확장
- score가 높다는 이유만으로 second wave를 public에 바로 노출
