# Existing FLOW Content Migration Plan

> 작성일: 2026-05-22  
> 연결 문서: [FLOW Execution Model Redesign Spec](./2026-05-22-flow-execution-model-redesign.md), [FLOW Execution Model Wireframes](./2026-05-22-flow-execution-model-wireframes.md)  
> 상태: 기존 콘텐츠 이관 기준 초안  
> 범위: 현재 seed/real/preview Flow 콘텐츠를 새 실행 모델에 맞게 분류하고 노출 정책을 정한다.  
> 제외: 원본 콘텐츠 저작권/라이선스 검토는 이번 범위에서 다루지 않는다.

## 1. 현재 콘텐츠 현황

`lib/flow/seed-flows.ts` 기준 현재 `seedBundles`는 총 511개다.

| 구분 | 개수 | 의미 |
| --- | ---: | --- |
| seed | 31 | 수동 작성 또는 초기 대표 후보 Flow |
| real | 40 | 실제 출처/채널 기반으로 만든 Flow |
| preview | 440 | 채널 탐색 규모를 보여주기 위한 preview 샘플 |

구조별 현황:

| structure | 개수 |
| --- | ---: |
| checklist | 219 |
| routine | 165 |
| timeline | 116 |
| phase | 11 |

해석:

- 현재 숫자는 데모 볼륨을 보여주기에는 좋지만, 전부 같은 품질의 public 대표 콘텐츠로 취급하면 안 된다.
- `preview` 440개는 채널 페이지의 풍성함을 보여주는 데 사용하되, 랜딩 대표 카드와 상세 UX 검증의 기준으로 쓰면 안 된다.
- `seed` 31개와 `real` 40개 중 타입별 대표 Flow를 먼저 새 실행 모델로 이관한다.

## 2. 콘텐츠 상태 등급

기존 콘텐츠는 삭제하지 않고 상태를 나눈다.

| 상태 | 의미 | 노출 위치 |
| --- | --- | --- |
| Representative | 새 UX 검증 기준으로 삼는 대표 Flow | 랜딩, 둘러보기 상단, 채널 대표, QA |
| Migration Candidate | 새 모델로 이관할 가치가 있으나 아직 화면/데이터가 부족한 Flow | 카테고리/채널 목록, 직접 URL |
| Catalog Preview | 채널 탐색 규모와 콘텐츠 방향을 보여주는 샘플 | 채널 페이지, preview 전용 섹션 |
| Legacy Accessible | 과거 포맷이 남아 있지만 URL 접근은 유지하는 Flow | 직접 URL, 내부 QA |
| Hidden | 품질/중복/위험 때문에 public 탐색에서 제외할 Flow | 직접 접근도 제한 가능 |

### 2.1 대표 Flow 선정 기준

대표 Flow는 아래 조건을 대부분 만족해야 한다.

- 타입이 명확하다.
- 첫 화면에 실행 리스트를 보여줄 수 있다.
- sample mode로 결과 preview가 가능하다.
- 내보내기 목적지가 분명하다.
- 항목별 완료 기준이 충분히 구체적이다.
- 민감 카테고리는 주의/출처 분리가 가능하다.
- 새 UX가 해결해야 하는 핵심 문제를 검증한다.

## 3. 전체 노출 정책

### 3.1 랜딩

랜딩에는 `Representative`만 노출한다.

이유:

- 첫 인상이 품질 기준이 된다.
- preview 샘플이나 레거시 Flow가 섞이면 "서비스 전체가 미완성"처럼 보인다.
- 랜딩 카드는 타입별 실행 결과를 보여주는 예시가 되어야 한다.

### 3.2 둘러보기

둘러보기에는 `Representative`와 `Migration Candidate`를 노출한다.

조건:

- 카드에 상태를 과하게 강조하지 않는다.
- 단, preview 샘플은 별도 필터나 채널 영역으로 분리한다.
- fake 실행/복사 수는 쓰지 않는다.

### 3.3 채널

채널 페이지에는 `Representative`, `Migration Candidate`, `Catalog Preview`를 모두 사용할 수 있다.

단:

- 채널 대표 Flow 3개는 가능한 한 `Representative` 또는 `Migration Candidate`에서 고른다.
- `Catalog Preview`는 "샘플" 또는 "미리보기" 맥락으로 보여준다.
- 내부 점수/검증 수치처럼 보이는 표현은 쓰지 않는다.

### 3.4 직접 URL

기존 slug는 최대한 유지한다.

- 기존 링크가 깨지지 않게 한다.
- `Legacy Accessible` Flow도 직접 접근은 유지한다.
- 단, 상세 화면에서는 "전환 중" 상태를 내부적으로 인식해 새 UI가 가능한 범위만 보여준다.

## 4. 타입별 마이그레이션 규칙

### 4.1 Timeline

목표:

- 기준 날짜 입력 전후로 리스트와 월별 달력이 모두 보인다.

필수 보강:

- sample anchor date.
- `day_offset`가 없는 항목 정리.
- section별 요약.
- 월별 달력 preview.
- export row: 날짜, 요일, D-day, 제목, 완료 조건, 메모.

### 4.2 Routine

목표:

- 반복 주기와 한 회차 행동 목록이 분리되어 보인다.

필수 보강:

- `repeat_rule`를 구조화한다. 예: `weekly:mon,wed,fri`, `daily`, `monthly:1`.
- single-action routine과 multi-action session을 구분한다.
- `occurrence` preview를 만든다.
- missed session 정책을 둔다.

### 4.3 Program

현재 `StructureType`에는 없지만 UX 타입으로는 필요하다.

대상:

- `running-5k-4week`
- `study-exam-d30-plan` 중 매일 공부 루틴과 결합되는 경우
- 일부 운동/학습 4주 플랜

처리:

- 데이터 구조는 당분간 `routine` 또는 `timeline`을 유지하되, UI target type을 `program`으로 별도 판정한다.
- 주차별 section, 회차별 date, session actions를 계산한다.

### 4.4 Checklist

목표:

- 날짜 없이도 긴 리스트가 즉시 보인다.
- 필요하면 비교표나 방문일만 추가한다.

필수 보강:

- section별 리스트 spine.
- 완료 기준.
- memo/skip.
- 엑셀/메모 preview.
- 날짜가 없는 경우 calendar view를 기본 노출하지 않는다.

### 4.5 Decision

현재 `StructureType`에는 없지만 UX 타입으로 필요하다.

대상:

- 중고차 구매
- 웨딩홀/업체 비교
- 이사 업체 견적 비교
- 세금/서류 후보 비교가 필요한 일부 Flow

처리:

- 데이터 구조는 checklist/timeline에 붙는 `decisionRows` 또는 export preview로 시작한다.
- 후보, 기준, 비용, 메모, 결정 상태를 표로 보여준다.

### 4.6 Phase / Meal Plan

목표:

- 날짜보다 단계/식단/레시피가 먼저 보인다.

필수 보강:

- 현재 단계 또는 시작일.
- 단계별 식단표.
- recipe detail.
- reaction log.
- 건강 민감 주의.

## 5. 대표 이관 대상

### 5.1 P0 대표 세트

이 세트는 새 UX를 검증하는 기준이다.

| slug | 현재 구조 | 목표 UX 타입 | 상태 | 필요한 작업 |
| --- | --- | --- | --- | --- |
| `moving-d30-basic` | timeline | Timeline | Representative | 월별 달력 preview 복구, 첫 화면 리스트 spine 강화, 24개 항목 export preview |
| `used-car-buying-check` | checklist | Checklist + Decision | Representative | 첫 화면 긴 체크리스트, 후보 비교표 preview, 날짜 없는 Flow의 calendar 비노출 |
| `running-5k-4week` | routine | Program + Routine | Representative | 주 3회 반복을 occurrence로 펼치기, 4주 프로그램 달력, 회차별 action set |
| `baby-food-menu-recipe` | phase + meal_plan | Phase + Meal Plan | Representative | 식단표/레시피/반응기록을 첫 화면에서 연결, 민감 주의 분리 |
| `overseas-travel-d14` | timeline | Timeline + Safety | Representative | 출국일 sample mode, 월별 달력, 공식 확인/주의 배너 |

### 5.2 P1 대표 후보

| slug | 현재 구조 | 목표 UX 타입 | 상태 | 필요한 작업 |
| --- | --- | --- | --- | --- |
| `wedding-d180-basic` | timeline | Timeline + Decision | Migration Candidate | 이사/여행 포맷으로 이관, 웨딩홀/예산 decision preview, 장기 월별 캘린더 |
| `study-exam-d30-plan` | timeline | Timeline + Routine | Migration Candidate | 시험일 역산 + 매일 공부 반복을 분리, 주간/월간 preview |
| `home-workout-20min` | routine | Routine | Migration Candidate | 주 3회 반복과 세트 반복을 분리, 한 회차 action set 정리 |
| `english-study-30day-routine` | routine | Routine | Migration Candidate | 매일 30분 + 주간 점검 calendar preview |
| `car-care-monthly-routine` | routine | Routine | Migration Candidate | 월 1회 + 장거리 전 추가 점검을 별도 trigger로 분리 |
| `national-health-checkup-d7` | timeline | Timeline + Safety | Migration Candidate | 검진일 기준 D-7, official/sensitive 주의 분리 |

### 5.3 P2 보강 후보

| slug | 현재 구조 | 목표 UX 타입 | 상태 | 필요한 작업 |
| --- | --- | --- | --- | --- |
| `passport-renewal-docs` | checklist | Checklist | Migration Candidate | 서류 checklist 대표 후보, calendar는 보조 |
| `year-end-tax-docs` | checklist | Checklist + Sheet | Migration Candidate | 엑셀/서류 묶음 preview 강화 |
| `job-change-risk-check` | checklist | Checklist + Decision | Migration Candidate | 회사 조건 비교표, 재정 안전 체크 |
| `new-car-delivery-check` | checklist | Checklist | Migration Candidate | 중고차 Flow와 중복 관계 정리 |
| `diet-habit-2week` | routine | Routine + Log | Migration Candidate | 의료 민감 주의와 기록형 루틴 분리 |

## 6. 실제 출처 기반 Flow 처리

`real` 40개는 품질이 균일하지 않다. 특히 exact video 1-action Flow와 5-action 채널 Flow는 다른 UX를 써야 한다.

### 6.1 Exact Video 1-Action Flow

예:

- `real-thankyou-bubu-video-daily-stretch-9min`
- `real-thankyou-bubu-video-full-body-no-jump`
- `real-fitvely-video-carb-reason`

목표:

- 긴 Flow처럼 보이지 않게 한다.
- "이 영상/콘텐츠를 오늘 한 번 실행 또는 반복 등록"하는 미니 Flow로 표현한다.

필요 화면:

```text
오늘 실행하기
반복 등록하기
메모로 기준 저장하기
원본 영상 열기
```

달력:

- 사용자가 반복 등록을 선택할 때만 occurrence를 만든다.
- 기본은 단일 실행 카드다.

상태:

- exact video Flow는 `Representative`가 아니라 `Catalog Preview` 또는 별도 `Mini Flow` 섹션으로 둔다.

### 6.2 Real 5-Action Flow

예:

- `real-thankyou-bubu-20min-routine`
- `real-fitvely-diet-record-routine`
- `real-qnet-application-examday-check`
- `real-gov24-moving-report-check`

목표:

- 대표 검증 세트에 일부 편입 가능하다.
- 특히 Q-Net, 정부24, 삼성 같은 official/brand 계열은 출처 신뢰 UX 검증에 좋다.

상태:

- P1 이후 `Migration Candidate`로 정리한다.
- 채널 대표 Flow에는 사용 가능하다.

## 7. Preview 440개 처리

Preview Flow는 버리지 않는다. 다만 역할을 바꾼다.

현재 역할:

- 채널별로 많은 Flow가 있는 것처럼 탐색 데모를 만든다.

문제:

- 실제 콘텐츠 품질과 다르게 public 카드에 섞이면 신뢰를 떨어뜨린다.
- 검색/랜딩에 섞이면 대표 UX가 흐려진다.

새 역할:

- `Catalog Preview` 상태.
- 채널 페이지에서 "이런 방향의 Flow를 만들 수 있다"는 샘플로만 사용.
- 상세 페이지 진입은 가능하되 preview 상태가 명확해야 한다.
- 랜딩 대표/추천에는 사용하지 않는다.

표시 문구:

```text
채널 샘플
이 Flow는 채널 확장 방향을 보여주는 preview입니다.
```

## 8. 어댑터 전략

모든 기존 Flow를 즉시 새 데이터 구조로 바꾸지 않는다. 먼저 normalize layer를 둔다.

```text
FlowBundle
  -> normalizeExecutionModel(bundle)
  -> FlowViewModel
  -> Detail UI / Card UI / Export Preview
```

### 8.1 FlowViewModel 초안

```ts
type FlowUxType =
  | 'timeline'
  | 'checklist'
  | 'routine'
  | 'program'
  | 'phase'
  | 'meal_plan'
  | 'decision'
  | 'mini_flow';

type FlowExposureStatus =
  | 'representative'
  | 'migration_candidate'
  | 'catalog_preview'
  | 'legacy_accessible'
  | 'hidden';

type FlowViewModel = {
  slug: string;
  title: string;
  uxType: FlowUxType;
  exposureStatus: FlowExposureStatus;
  sourceMode: 'seed' | 'real' | 'preview';
  inputRequirements: {
    anchorDate?: string;
    startDate?: string;
    repeatRule?: string;
    optionalFilters?: string[];
  };
  views: Array<'list' | 'agenda' | 'month_calendar' | 'routine_sessions' | 'comparison_table' | 'export_preview'>;
  exportTargets: Array<'memo' | 'sheet' | 'calendar' | 'todo'>;
  migrationGaps: string[];
};
```

### 8.2 판정 규칙

```text
source_status === 'preview'
  -> catalog_preview

content_type === 'meal_plan'
  -> meal_plan

slug === 'running-5k-4week'
  -> program

structure_type === 'routine' && items.length === 1 && source_status === 'real'
  -> mini_flow

structure_type === 'timeline'
  -> timeline

structure_type === 'checklist'
  -> checklist
```

예외는 명시적으로 override한다.

## 9. 구현 순서

### Step 1: 문서/데이터 판정

- 이 문서의 상태 등급을 코드의 explicit mapping으로 옮긴다.
- `normalizeExecutionModel()`을 만든다.
- 대표 Flow 5개가 올바른 UX 타입과 view set을 갖는지 테스트한다.

### Step 2: 대표 Flow 화면 이관

- Timeline: `moving-d30-basic`, `overseas-travel-d14`.
- Checklist/Decision: `used-car-buying-check`.
- Program/Routine: `running-5k-4week`.
- Phase/Meal Plan: `baby-food-menu-recipe`.

### Step 3: 랜딩/채널 노출 재정렬

- 랜딩은 Representative만.
- 채널은 Representative + Migration Candidate + Catalog Preview.
- preview 샘플은 샘플로 표시.

### Step 4: P1 후보 보강

- `wedding-d180-basic`
- `study-exam-d30-plan`
- `home-workout-20min`
- `english-study-30day-routine`
- `car-care-monthly-routine`

## 10. 완료 기준

마이그레이션 1차 완료 기준:

- 대표 Flow 5개가 새 와이어프레임 기준을 통과한다.
- 랜딩에 preview/legacy Flow가 대표 카드로 섞이지 않는다.
- 채널 탐색은 유지되며 preview 샘플은 역할이 명확하다.
- Timeline/Routine/Program에는 월별 달력 preview가 보인다.
- Checklist에는 긴 리스트가 먼저 보인다.
- Routine은 반복 주기와 한 회차 행동 목록이 분리되어 보인다.
- exact video 1-action Flow는 긴 checklist처럼 보이지 않는다.
- 기존 slug 직접 접근은 유지한다.

