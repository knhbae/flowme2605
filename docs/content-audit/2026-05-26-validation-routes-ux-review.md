# Validation Routes — UX Review (FlowMe2605)

**Date:** 2026-05-26
**Reviewer:** Claude (FlowMe 디자인 설계)
**Scope:** `docs/validation-sessions/TESTABLE_CONTENT.md`에 정의된 11개 라우트 (Priority A 3개 / B 4개 / C 4개)
**Method:** `lib/flow/seed-flows.ts` 컨텐츠, `docs/content-audit/*` 30+개 감사 문서, `docs/STATUS.md` 최근 변경 이력, `design.md` 원칙에 기반한 정적 검토.

> 한계: production URL(`flowme2605.vercel.app`)에 직접 접근하지 못해 픽셀 단위 검증은 못 했음. 본 문서의 “보일 것으로 추정” 표현은 source/audit 기반 추론.

---

## 0. 한 줄 요약

전반적인 방향(export-first · 출처/위험 분리 · “검증됨” 라벨 금지)은 잘 지켜지고 있다.
남은 문제는 **카피 단위의 추상화**, **anchor 모호함**, **stop-condition을 list 안에 묻어버리는 패턴**, **모바일 export CTA가 다시 추상어로 회귀한 점** 4가지에 집중되어 있다.

---

## A. 11개 라우트를 관통하는 문제 6개

### A1. 모바일 export CTA 카피 회귀 — “내 도구로 가져가기”
**증거.** `STATUS.md`에 “mobile sheets now use the clearer destination-oriented CTA `내 도구로 가져가기`” 기록.
**왜 문제인가.** “내 도구”는 사용자의 도구를 가리키지만, 결국 추상명사다. design.md §11에서 금지한 “내보내기/저장”과 같은 계열의 약함이다. 사용자는 이 버튼을 눌렀을 때 무엇이 자기 캘린더/시트/메모 중 어디로 가는지 사전에 알 수 없다.
**고침.** sticky sheet의 라벨을 현재 산출물 타입에 따라 동적으로 바꿔라.

| 산출물 타입 | 권장 라벨 |
|---|---|
| `calendar` primary | `캘린더에 넣기 · .ics` |
| `sheet` primary | `시트로 받기 · .xlsx` |
| `memo` primary | `메모로 복사` |
| `checklist` primary | `오늘 항목 복사` |
| `hybrid` | primary 1개만 표시, secondary는 안에서 |

코드 위치: 추정 — `components/flow/AppClient.tsx`의 모바일 sticky export sheet. `primary_destination` 필드가 이미 seed에 있으니 그대로 라우팅하면 됨.

### A2. anchor의 “라벨 vs 단위” 일관성 부재
**증거.** `studyExamD30Text`은 `@매일 60~90분` 헤더가 있지만 anchor는 `examDate`. 표제는 학습량, anchor는 시험일이라 사용자가 무엇을 입력해야 하는지 첫 화면에서 두 번 생각해야 한다. `dietHabitText`는 `@매일 관찰 @주 1회 메모`만 있고 anchor 라벨이 명시되어 있지 않다.
**고침.** anchor 입력칸의 라벨을 flow별 구체어로 고정.

| 라우트 | 현재(추정) | 권장 라벨 |
|---|---|---|
| `computer-skills-d30-study` | “기준 날짜” / “시험일” | **“시험일을 알려주세요”** + 보조문구 `이 날짜를 기준으로 D-30 학습표가 자동으로 채워져요` |
| `diet-habit-2week` | “시작일” | **“관찰 시작일”** + `2주간 식사·수면·활동을 같은 시트에 남길 수 있어요` |
| `new-car-delivery-check` | “기준 날짜” | **“인수 예정일”** + `이 날짜 전에 모든 점검과 사진을 끝낼 수 있게 일정을 잡아드려요` |
| `passport-renewal-docs` | “기준 날짜” | **“여행 출발일(있으면)”** + `없어도 됨 — 발급/수령 일정만 정리할 수 있어요` |
| `baby-food-menu-recipe` | “시작일” | **“이유식 시작일 / 아이 생년월일”** (둘 중 하나 선택) |

### A3. stop/consult condition이 list의 마지막 줄로 묻혀 있음
**증거.** `dietHabitText` 마지막 항목: `통증, 어지러움, 폭식 유발감이 반복되면 기록을 멈추고 상담 메모 남기기`. `workoutText` 마지막 항목: `통증 또는 어지러움 여부 기록하기`.
**왜 문제인가.** 이건 일반 체크 항목이 아니라 **결정 기준**이다. 다른 16개 항목과 같은 무게로 노출되면, 사용자는 단순 체크박스로 처리하고 넘어갈 가능성이 크다.
**고침.** stop/consult condition은 list에서 빼고 **artifact card 위쪽**에 별도 caution 패널로 분리.

```
┌───────────────────────────────────────┐
│ ⚠  중단 신호 (체크 항목 아님)             │
│   · 어지러움, 폭식 유발감이 반복되면         │
│     기록 중단하고 의료/영양 상담            │
└───────────────────────────────────────┘
[ 2주 관찰 시트 · primary ]
[ 식사 / 수면 / 활동 ··· ]
```

list 안엔 `오늘 컨디션 한 줄 메모` 같은 일반 관찰 행만 남긴다.

### A4. D-N과 절대 날짜의 분리 표기
**증거.** `studyExamD30Text` 섹션 헤더는 `## D-30 범위와 기준 잡기`인데, 같은 섹션 안의 마지막 항목이 `시험 당일 준비물과 이동 시간 확인하기 D-1`. 헤더는 D-30, 항목은 D-1이라 그룹핑 정합성이 깨진다.
**고침.** “D-1”은 자기 섹션(`## D-1 시험 전날 점검`)으로 빼고, D-30 헤더 안엔 D-30 항목만 둔다. 같은 패턴이 movingText에선 잘 지켜지고 있음(D-30 / D-10 / D-3 / D-1 / D-Day / D+1).

### A5. 출처 vs 경험 “한 카드 안 섞기” 원칙은 데이터엔 있으나 UI에서 약함
**증거.** `seed-flows.ts`의 itemDetails은 각 항목에 `source_type: 'reference' | 'official' | 'creator_experience'`를 명시. 그러나 list row가 단순히 텍스트 한 줄만 보여주면 사용자는 어느 항목이 공식이고 어느 항목이 경험인지 구분 못 함.
**고침.** row 우측 끝에 한 글자짜리 source badge를 항상 노출.

```
[ ] 단원별 헷갈리는 개념 표시하기      [경험]
[ ] 시험장 도착 목표 시간 확인하기     [공식]
```

`design.md` §10에서 “두 종류를 한 카드에 섞지 않는다”라고 했는데, 한 list 안엔 두 출처가 섞여 있어도 row 단위로 분리되면 원칙 위반이 아님. 단, **medical_sensitive 카테고리에선 섞이지 않게 두 list로 나눌 것** — baby-food, diet-habit이 해당.

### A6. checklist 라우트의 “계약 전 확인” vs “계약 전 보류 기준”
**증거.** `newCarDeliveryText`엔 4개 섹션(인수 전 준비 / 외관 확인 / 실내·기능 확인 / 인수 후 정리)이 있지만, **사인 보류 메모가 first-class artifact로 안 보임**. `2026-05-24-newcar-diet-guardrail-first-screen.md`은 “warning was not close enough to the comparison and memo fields → workbench 안에 `인수 전 보류 기준` 추가”라고 함. 즉 패치가 들어갔지만 source text 자체엔 반영되지 않았다.
**고침.** seed text를 다음처럼 보강.

```diff
+ ## 인수 보류 기준 (사인 전 확인)
+ - 차대번호와 계약 차량 차종/연식이 일치하지 않으면 보류하기
+ - 100km 이상 주행 또는 판금/도색 흔적이 의심되면 보류하기
+ - 옵션 누락이 발견되면 정정 합의 메모를 받을 때까지 사인 보류하기
+ - 보류 시 영업소에 “인수 보류 신청서” 요청 — 사인 후엔 보상 기준이 바뀜

  ## 인수 전 준비
  ...
```

동일한 패턴을 `used-car-buying-check`에도 적용 (`## 계약 보류 기준`).

---

## B. 라우트별 검토

### Priority A

#### B1. `computer-skills-d30-study` (Representative-eligible)

**잘된 점.**
- source-derived 행이 명확하고, 사용자가 편집할 필드(target date, status, memo, wrong-answer, retry date, weak area, score)가 정의되어 있음 (2026-05-24-study-progress-table-criteria.md).
- D-30 → D-21 → D-14 → D-7 4구간 구조가 깔끔.
- 항목별 `caution`/`how`/`why`/`completion_criteria`가 디테일하게 작성됨.

**문제.**
1. 위 A4 — `## D-7 실전 정리` 안에 `D-1` 항목이 섞임. 캘린더 export 시 D-7 그룹으로 잡히면 알람 타이밍이 어긋남.
2. 위 A2 — anchor 라벨이 “시험일”이 아니라 “기준 날짜”로 보일 가능성. 빈 상태에서 “기준 날짜를 입력하세요”는 약함.
3. `매일 60~90분`이라는 학습량 anchor와 `examDate` anchor가 동시에 존재. 한 화면에 둘 다 noun(명사)로 노출되면 사용자가 무엇을 먼저 입력해야 할지 혼란. **시험일은 anchor input, 학습량은 ‘제작자 권장’으로 strip 영역에 작게.**
4. 항목 설명이 너무 길다(`how`만 60~80자). 모바일 list에서 줄바꿈 3~4줄. **list view에선 title만, detail은 disclosure로 접고**, 시험장 도착 시간처럼 “당일에 봐야 하는 정보”만 펼침 기본값.

**구체 카피 수정안.**

```diff
- ## D-7 실전 정리
- - 실전처럼 모의고사 1회 풀기 D-7
- - 암기표와 오답노트만 남기기 D-7
- - 시험 당일 준비물과 이동 시간 확인하기 D-1
+
+ ## D-7 실전 정리
+ - 실전처럼 모의고사 1회 풀기 D-7
+ - 암기표와 오답노트만 남기기 D-7
+
+ ## D-1 시험 전날 점검
+ - 시험 당일 준비물과 이동 시간 확인하기 D-1
+ - 입실 마감 시간과 허용 준비물 한 번 더 확인하기 D-1
+ - 알람 2개와 예비 교통편 결정하기 D-1
```

빈 상태 카피:
- 현재(추정): `시험일을 넣으면 학습표가 채워집니다`
- 권장: **`시험일을 알려주세요 — D-30 학습표와 캘린더가 그 자리에서 채워져요`**

#### B2. `diet-habit-2week` (Public MVP w/ guardrails)

**잘된 점.**
- 명시적으로 “관찰 기록표”라고 reframing됨 (`docs/content-audit/2026-05-24-newcar-diet-guardrail-first-screen.md`).
- 무리한 제한·outcome claim 없음.

**문제.**
1. 위 A3 — stop condition이 list 마지막 항목. 첫 화면 상단으로 분리해야 함.
2. anchor 라벨이 없음. “관찰 시작일”로 명시.
3. `## 중단·상담 관찰` 섹션의 카피 `체중보다 식사·수면·활동 패턴을 먼저 보기`는 좋은 원칙이지만 list 항목으로 노출되면 사용자가 “체크할 행동”으로 오해. 이건 캡션/가이드 텍스트로.
4. 2주 = 14일 × 6개 행(아침/점심/저녁/수면/활동/메모) = 84칸. 모바일에서 한눈에 안 들어옴. 위 A1과 결합해 **모바일에선 “이번 주 요약 카드” + “시트로 받기” 패턴**으로 처리. 그 패턴은 이미 `2026-05-25-mobile-log-summary-card-pass` (STATUS.md)에 landed.

**구체 카피 수정안.**

```diff
- ## 중단·상담 관찰
- - 체중보다 식사·수면·활동 패턴을 먼저 보기
- - 무리한 제한으로 폭식 유발감이 생겼는지 확인하기
- - 통증, 어지러움, 폭식 유발감이 반복되면 기록을 멈추고 상담 메모 남기기
+
+ ## 관찰 원칙 (안내문, 체크 항목 아님)
+ - 체중 숫자가 아니라 식사·수면·활동 패턴을 봅니다.
+ - 무리한 제한은 다음 주 폭식으로 이어질 수 있어요. 강도 대신 지속을 봅니다.
+
+ ## 중단 신호 (해당되면 즉시 멈춤)
+ - 통증/어지러움이 24시간 이상 지속
+ - 폭식 유발감이 한 주에 2회 이상 반복
+ - 위 신호가 보이면 의료/영양 상담 후 재시작
```

이 두 섹션은 **list가 아니라 caution 패널** 두 개로 렌더되어야 한다.

#### B3. `new-car-delivery-check` (Public MVP w/ guardrails)

**잘된 점.**
- `2026-05-24-newcar-diet-guardrail-first-screen.md`에 따라 `인수 전 보류 기준`이 workbench 안에 들어감.
- evidence-sheet(증거 시트) + hold-memo(보류 메모) 패턴이 명시됨.

**문제.**
1. **seed text 자체엔 `인수 보류 기준` 섹션이 없음** (위 A6). UI 패치가 들어갔어도 export(.txt) 했을 때 보류 기준이 빠진 채 나갈 가능성. 사용자가 메모 앱에 붙여넣었을 때 “보류 기준”이 누락되면 보호 효과가 줄어든다.
2. `## 외관 확인` 안의 `유리, 휠, 타이어 손상 확인하기` — 손상 발견 시 어떻게 할지가 빠짐. completion criteria는 `유리, 휠, 타이어를 확인했고 손상 여부와 사진을 기록했다` 정도가 필요. **각 점검 항목이 “보류 사유 후보”인지 “기록만 하면 되는 항목”인지 명확하게 분류.**
3. 사진 파일명 규칙 (예: `door-scratch-4821.jpg`)이 audit 문서엔 시뮬레이션 input으로 있지만, 사용자에게 명시적으로 안내되는지 불명. **현장 점검 카드 위에 “사진 파일명 예시” 한 줄 추가:** `door-scratch-YYYYMMDD.jpg` 같은 규칙은 evidence sheet의 일관성에 직결.

**구체 카피 수정안.** A6의 “인수 보류 기준” 섹션을 첫 섹션으로 추가.

#### B4. ~~없음~~ (Priority A는 3개)

### Priority B

#### B5. `moving-d30-basic` (Density benchmark)

**잘된 점.**
- D-30 / D-10 / D-3 / D-1 / D-Day / D+1 구간이 일관됨.
- `2026-05-26-moving-desktop-right-rail-pass`에서 desktop 우측 레일에 source 분리됨 (STATUS.md).

**문제.**
1. `## D-30 큰 준비` 안의 `이사 방식 정하기` — `이사 방식`이 무엇을 가리키는지 모호함 (포장이사? 반포장? 직접이사?). list 항목으로는 너무 추상적. **`포장/반포장/직접 중 어느 방식으로 갈지 정하기`로 구체화.**
2. `## D-Day 이사 당일`의 `전입신고와 확정일자 확인하기 D-Day` — 전입신고는 D-Day가 아니라 보통 D+1~D+14. D-Day 항목으론 부정확. 이미 `## D+1 행정 마무리`에 `정부24 전입신고 처리 결과 확인하기 D+1`이 있으니 D-Day 행은 **`전입신고 준비물 챙기기 D-Day`로 바꾸고 신고는 D+1로 통합.**

#### B6. `baby-food-menu-recipe` (Sensitive)

**잘된 점.**
- 의료 sensitive 배너가 별도 (`2026-05-26-baby-food-sensitive-mobile-pass`).
- 알레르기 관찰 기간 3일 (`allergy_watch_days: 3`) 데이터에 명시.
- 6개 meal slot이 각각 새 재료 도입 일정으로 들어옴.

**문제.**
1. `babyWarning` 텍스트가 단일 문단(3~4문장). 모바일 sensitive 배너에 그대로 표시되면 너무 길어 사용자가 무시. **3개 bullet로 압축:**
   ```
   · 의료 권위 아님 — 의심 증상은 즉시 소아과
   · 새 재료는 3일 관찰 후 다음 추가
   · 꿀·생식·질식 위험 식품은 공식 안전 정보 우선
   ```
2. `new_ingredients` 배열에 `소고기`, `청경채`처럼 알레르기 위험 등급이 다른 재료가 같은 시각으로 보일 가능성. **재료별 위험 라벨이 필요:**
   - low: 쌀·찹쌀·애호박·단호박
   - medium: 청경채·시금치 (잎채소)
   - high (3일 관찰 필수 + visual emphasis): 소고기·계란·두부 등 단백질/대두/유제품
3. recipe의 `tool_note`/`storage_note`/`caution_note`가 좋지만 “보관 후 폐기 기준”이 보호자에게 떠넘겨져 있음 (`보호자가 공식 식품 안전 정보를 확인해 메모한다`). 이건 FlowMe 원칙엔 맞지만, 모바일 sensitive 카테고리에선 “2시간 이상 실온 보관 금지” 같은 **공식 권장 1줄을 인용 표시로 노출**하고 옆에 출처 링크 다는 것이 사용자 안전에 더 도움.

#### B7. `used-car-buying-check`

**잘된 점.**
- 비교표 → 메모 → 체크리스트 순서로 reframe됨.

**문제.**
1. `## 예산과 후보 정리`의 `사고 이력과 성능점검기록부 확인 기준 정하기` — “기준 정하기”가 너무 추상적. **`사고 이력 있는 차량의 허용 범위(예: 단순 교환 OK / 골격 손상 OUT) 정하기`로 구체화.**
2. A6과 동일 — `## 계약 보류 기준` 섹션 신설 필요. 현재 `## 계약 전 확인`의 항목들은 “확인하기”로 끝나서 사용자가 단순 체크로 처리하기 쉬움.
3. `자동차등록원부와 압류·저당 여부 확인하기` — 압류·저당 발견 시 행동이 빠짐. completion criteria에 **`발견 시 매도인에게 말소 증빙 요구 — 없으면 계약 보류`**가 들어가야 함.

#### B8. `passport-renewal-docs`

**잘된 점.**
- 첫 화면이 “제출 메모”로 reframe됨 (2026-05-24-passport-submission-memo-first-screen.md).

**문제.**
1. seed text는 여전히 6개 항목의 평범한 checklist 형태. 메모 카드는 itemDetails에서 합성한다고 추정되는데, **seed text에 명시적인 메모 슬롯이 없으면 export(.txt)했을 때 메모 형태로 안 나갈 수 있다.** 별도 `## 제출 메모 (복사용)` 섹션이 본문에 있어야 export 일관성 유지.
2. `## 신청 진행`의 `신청 후 접수 상태 확인하기` — “접수 상태”가 어디서 어떻게 확인되는지가 빠짐 (정부24 마이페이지? 영수증?). **`정부24 마이페이지에서 접수번호로 진행 상태 확인하기`처럼 구체화.**
3. 수령 일정이 항목으로 없음. 첫-화면 메모 패턴에 audit에서 언급한 `pickup=2026-06-20`이 있다면 list에도 `## 수령 일정` 섹션이 필요.

### Priority C (간단)

#### B9. `real-thankyou-bubu-home-workout-starter`

**문제.**
- 항목 `푸시업 10~15회`의 `caution`/`how`에 “손목·어깨 부담 시 무릎 푸시업/벽 푸시업으로 대체”가 있지만 **list row의 시각엔 안 보임**. 운동 list는 detail tap 비율이 낮을 가능성. **항목 옆에 `대체 가능` 배지 추가:**
  ```
  □ 푸시업 10~15회                [대체 가능]
  ```
- 운동 직후 기록 행이 일반 list 항목으로 들어 있음. routine 라우트는 **회차 기록표**가 별도 산출물로 있어야 한다 (FlowMe 분석문서 §3 참고).

#### B10. `real-fitvely-diet-record-routine`

**문제.**
- audit에 따르면 sheet-first로 reframe됨. 단, “기준 후보 → 적용 → 관찰 → 유지/중단” 4행 구조가 단일 행 표보다 좋다고 STATUS.md에 기록. 이 표 자체가 seed 컨텐츠에 있는지 확인 필요. 만약 itemDetails에만 있다면 export 시 빠지는 문제 동일.

#### B11. `vehicle-inspection-prep`

**문제.**
- audit: “evidence-first vehicle route is useful for artifact QA, but not a current representative/public MVP observed-session candidate”
- 검사 결과 → 정비 → 재검사로 이어지는 hybrid artifact (메모 카드 + 결과 시트)가 패턴. **단, “검사 결과 항목 중 어떤 것이 즉시 정비 대상인지”에 대한 분류 행이 필요** — 현재는 모든 결과 항목이 같은 무게.

#### B12. `real-mofa-overseas-travel-prep`

**문제.**
- overseasTravelText는 D-14 → D-Day까지 균형 잡힘.
- 단, MOFA 사이트는 국가별 안내가 다른데 seed text의 항목들은 generic. **flow에 `country` 필드가 있어야 함** — 사용자가 “베트남”을 선택하면 itemDetails의 링크가 베트남 페이지로 바뀌도록.
- emergency-card UX가 audit에 언급됨 (`2026-05-26-mofa-travel-emergency-card-pass`). seed text엔 `## 비상 연락` 섹션이 없음. 추가 권장:
  ```
  ## 비상 연락 카드 (한 장 메모로 복사)
  - 현지 대사관 / 영사 콜센터 번호
  - 여행자보험 24시간 연락처
  - 카드 분실 신고 (해외 송신용 번호)
  - 본인 여권번호와 발급일/만료일
  ```
  이 메모는 **여행 가방 안주머니에 출력해 넣을 수 있는** 한 장짜리 산출물로 export.

---

## C. 즉시 적용 가능한 작은 PR 5개 (의존도 순)

1. **모바일 sticky CTA 카피 동적화 (A1)**
   `primary_destination` 필드로 라우팅. 라벨 5종(`캘린더에 넣기 · .ics` / `시트로 받기 · .xlsx` / `메모로 복사` / `오늘 항목 복사` / `한 장으로 받기`).
   영향: 모든 라우트. 위험: 낮음.

2. **stop/consult condition을 list에서 분리 (A3)**
   `diet-habit-2week`, `real-thankyou-bubu-home-workout-starter`, `baby-food-menu-recipe` 3개 라우트의 list 마지막 항목을 caution 패널로 이동.
   영향: 3개. 위험: 낮음 (UI만).

3. **anchor 입력 라벨 flow별 구체어로 (A2)**
   `setup_anchor_label` 같은 필드를 flow schema에 추가. 5개 라우트.

4. **`인수 보류 기준` / `계약 보류 기준` 섹션 신설 (A6)**
   `new-car-delivery-check`, `used-car-buying-check` seed text에 추가. checklist 첫 섹션.

5. **베이비푸드 알레르기 위험 등급 시각화 (B6)**
   `meal_slot`에 `risk_grade: 'low' | 'medium' | 'high'` 추가. high 항목엔 빨간 배지.

---

## D. 픽셀 단위 검증이 필요한 항목 (스크린샷 주시면 짚어 드림)

- 데스크톱 `computer-skills-d30-study`의 항목 detail이 줄바꿈 몇 줄로 노출되는지
- 모바일 sticky export sheet의 현재 카피 (위 A1 검증)
- `diet-habit-2week` 모바일에서 stop condition이 어디에 위치하는지
- `new-car-delivery-check` workbench의 “보류 기준” 카드 위치
- `baby-food-menu-recipe` 모바일에서 알레르기 위험 재료(소고기·계란)가 시각적으로 구분되는지

---

## E. 변경하지 말아야 할 것

- **“검증됨” 라벨은 절대 추가하지 말 것.** observed-session 결과가 candidate signal 수준이라도 validation 라벨로 승격 금지 (`STATUS.md`의 “0 validated routes” 원칙).
- 전역 sticky export bar 추가 금지. export는 산출물 카드 내부 또는 모바일 sheet 안으로만.
- AI 자동 큐레이션·자동 progress-table 생성·로그인·결제 금지 (STATUS.md).
