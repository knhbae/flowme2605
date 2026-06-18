# Validation Fix Batch — Implementation Spec

**Date:** 2026-05-26
**Scope:** 11개 testable_content.md 라우트의 첫 observed-session 대비 UX 정합화
**Companion docs:**
- `2026-05-26-validation-routes-ux-review.md` — 감사 보고서 (왜 고치는가)
- `design-ref/2026-05-26-validation-fix/flowme.html` — 인터랙티브 Before/After 캔버스

본 문서는 위 감사의 결론을 **엔지니어가 바로 작업할 수 있는 PR 단위**로 정리한 스펙이다. 모든 변경은 small PR로 머지하고, observed session 시작 전까지 PR-1·2·3·4 머지 완료를 목표로 한다.

---

## TL;DR — 누적 schema 변경

3개 라우트(CS-D30 · diet-habit-2week · new-car-delivery-check)의 Before/After 분석이 도출한 schema 변경의 합집합:

```ts
// lib/flow/types.ts (또는 동등 위치)
interface Flow {
  // ... 기존 필드
  setup_anchor_label?: string;       // 라우트별 anchor 입력 라벨 (PR-2)
  setup_anchor_hint?: string;        // 입력 후 노출되는 결과 메시지 (PR-2)
  primary_destination: 'calendar' | 'sheet' | 'memo' | 'checklist' | 'hybrid';
                                     // 이미 존재. PR-3에서 sticky CTA 라벨 라우팅에 사용
  stop_conditions?: string[];        // health-sensitive 라우트 (PR-4)
  principles?: string[];             // health-sensitive 라우트 (PR-4)
  hold_section?: HoldSection;        // money-at-risk 라우트 (PR-8)
}

interface FlowItem {
  // ... 기존 필드
  hold_eligible?: boolean;           // 보류 후보 항목 (PR-8)
  photo_filename_pattern?: string;   // evidence row (PR-9)
  status?: 'ok' | 'check' | 'hold';  // evidence row (PR-9)
}

interface HoldSection {
  title: string;                     // "인수 보류 기준"
  reasons: { id: string; label: string }[];
  consequence: string;               // "사인 후엔 보상 기준이 바뀝니다"
  memo_template: string;             // export 시 메모로 변환되는 템플릿
}
```

---

## PR-1 · seed text 정합화 (코드 변경 없음)

**파일:** `lib/flow/seed-flows.ts`
**라우트 영향:** `computer-skills-d30-study`, `diet-habit-2week`, `new-car-delivery-check`
**테스트:** `seed-flows.test.ts`에서 섹션 수·항목 수 갱신

### 1-1. `computer-skills-d30-study` — D-1 항목 자기 섹션으로 분리

```diff
  ## D-7 실전 정리
  - 실전처럼 모의고사 1회 풀기 D-7
  - 암기표와 오답노트만 남기기 D-7
- - 시험 당일 준비물과 이동 시간 확인하기 D-1
+
+ ## D-1 시험 전날 점검
+ - 시험 당일 준비물과 이동 시간 확인하기 D-1
+ - 입실 마감 시간과 허용 준비물 한 번 더 확인하기 D-1
+ - 알람 2개와 예비 교통편 결정하기 D-1
```

이유: 캘린더 export 시 D-7 그룹으로 6/15에 알람이 가지 않도록.

### 1-2. `diet-habit-2week` — 중단·상담 섹션 제거, stop/principles 필드로 이동

`diet-habit-2week` 영역에서:

```diff
  ## 활동·컨디션 관찰
  - 오늘 한 활동과 시간을 관찰표에 남기기
  - 무리한 운동 대신 가능했던 활동만 기록하기
  - 활동 후 피로도, 통증, 어지러움을 기록하기

- ## 중단·상담 관찰
- - 체중보다 식사·수면·활동 패턴을 먼저 보기
- - 무리한 제한으로 폭식 유발감이 생겼는지 확인하기
- - 통증, 어지러움, 폭식 유발감이 반복되면 기록을 멈추고 상담 메모 남기기
```

대신 flow metadata에:

```ts
{
  // ...
  setup_anchor_label: '관찰 시작일',
  setup_anchor_hint: '14일 관찰 시트가 만들어졌어요',
  primary_destination: 'sheet',
  principles: [
    '체중 숫자가 아니라 식사·수면·활동 패턴을 봅니다.',
    '무리한 제한은 다음 주 폭식으로 이어질 수 있어요. 강도 대신 지속을 봅니다.',
  ],
  stop_conditions: [
    '통증 또는 어지러움이 24시간 이상 지속',
    '폭식 유발감이 한 주에 2회 이상 반복',
    '위 신호가 보이면 의료/영양 상담 후 재시작',
  ],
}
```

### 1-3. `new-car-delivery-check` — 인수 보류 기준 섹션 신설

```diff
+ ## 인수 보류 기준
+ - 차대번호·차종·연식이 계약서와 불일치하면 사인 보류
+ - 주행거리 100km 이상이면 사인 보류
+ - 판금·도색 흔적이 의심되고 페인트 두께 측정이 거부되면 사인 보류
+ - 옵션 누락이 발견되고 정정 합의 메모가 없으면 사인 보류
+ - 보류 시 영업소에 "인수 보류 신청서" 요청 — 사인 후엔 보상 기준이 바뀝니다.

  ## 인수 전 준비
  ...
```

대신 flow metadata:

```ts
{
  setup_anchor_label: '인수 예정일',
  primary_destination: 'memo',
  hold_section: {
    title: '인수 보류 기준',
    reasons: [
      { id: 'vin',     label: '차대번호·차종·연식 불일치' },
      { id: 'mileage', label: '주행거리 100km 이상' },
      { id: 'paint',   label: '판금·도색 흔적 의심' },
      { id: 'option',  label: '옵션 누락 + 정정 합의 없음' },
    ],
    consequence: '사인 후엔 보상 기준이 바뀝니다',
    memo_template: '...',  // 보류 메모 export 템플릿
  },
}
```

---

## PR-2 · setup_anchor_label / setup_anchor_hint 필드

**스키마:** 위 TL;DR
**파일:** `lib/flow/types.ts`, `components/flow/AppClient.tsx` (anchor 입력 컴포넌트)
**라우트 영향:** 모든 라우트 (fallback: 기존 "기준 날짜")

### UI 변경

anchor 입력 카드의 라벨을 동적으로:

```tsx
<div className="anchor-label">
  {flow.setup_anchor_label ?? '기준 날짜'}
</div>
```

입력 직후 노출되는 메시지:

```tsx
{flow.anchored && flow.setup_anchor_hint && (
  <div className="anchor-hint">
    {flow.setup_anchor_hint} · {applied_summary}
  </div>
)}
```

### 라우트별 카피

| 라우트 | `setup_anchor_label` | `setup_anchor_hint` |
|---|---|---|
| `computer-skills-d30-study` | 시험일을 알려주세요 | 12개 학습 행이 갱신되었어요 |
| `moving-d30-basic` | 이사일 | 30일 일정이 캘린더로 들어갔어요 |
| `diet-habit-2week` | 관찰 시작일 | 14일 관찰 시트가 만들어졌어요 |
| `new-car-delivery-check` | 인수 예정일 | 점검 항목이 인수일 기준으로 준비됐어요 |
| `used-car-buying-check` | 계약 예정일 | 비교표와 점검 항목이 계약일 기준으로 준비됐어요 |
| `passport-renewal-docs` | 여행 출발일 (있으면) | 발급/수령 일정이 정리됐어요 |
| `baby-food-menu-recipe` | 이유식 시작일 (또는 생년월일) | 30일 메뉴 일정과 반응 기록표가 만들어졌어요 |
| `real-mofa-overseas-travel-prep` | 출국일 | D-14 일정과 비상 카드가 만들어졌어요 |
| `national-health-checkup-d7` | 검진 예정일 | D-7 준비 일정이 만들어졌어요 |
| `real-thankyou-bubu-home-workout-starter` | 루틴 시작일 | 4주 회차 그리드가 만들어졌어요 |
| `real-fitvely-diet-record-routine` | 관찰 시작일 | 사용된 기준이 적힌 관찰 시트가 만들어졌어요 |

---

## PR-3 · 모바일 sticky CTA 동적 라벨

**파일:** `components/flow/AppClient.tsx` (모바일 sticky export sheet)
**현재 라벨:** `내 도구로 가져가기`
**변경:** `primary_destination` 분기 + (있다면) hold_count 노출

```tsx
function StickyExportCTA({ flow, holdCount }: { flow: Flow; holdCount?: number }) {
  const label = (() => {
    if (flow.hold_section && holdCount && holdCount > 0) {
      return `보류 메모로 복사 (${holdCount}건)`;
    }
    switch (flow.primary_destination) {
      case 'calendar': return '캘린더에 넣기 · .ics';
      case 'sheet':    return '시트로 받기 · .xlsx';
      case 'memo':     return '메모로 복사';
      case 'checklist':return '오늘 항목 복사';
      case 'hybrid':   return '한 장으로 받기';
      default:         return '내 도구로 가져가기';
    }
  })();
  // ...
}
```

aria-label은 산출물명을 포함시켜야 함 (`2026-05-26-export-cta-accessibility-pass.md` 원칙 유지):

```tsx
aria-label={`${label} — ${flow.title} 산출물`}
```

서브 텍스트 한 줄:

| Destination | 보조문구 |
|---|---|
| calendar | 애플/구글 캘린더에서 열 수 있어요 |
| sheet    | 구글시트·노션·엑셀에서 열 수 있어요 |
| memo     | 메모 앱에 그대로 붙여넣을 수 있어요 |
| checklist| 오늘 할 항목만 복사돼요 |

---

## PR-4 · stop_conditions / principles 필드 + 자동 렌더

**스키마:** 위 TL;DR
**파일:** `lib/flow/types.ts`, 새 컴포넌트 `components/flow/StopConditionsBanner.tsx`, `components/flow/PrinciplesCaption.tsx`

### 렌더 위치

health-sensitive 라우트(`risk_level: 'medical_sensitive'`)에서:

- **데스크톱:** anchor row 바로 아래, primary artifact 위
- **모바일:** 페이지 최상단 (메타·제목보다도 위)

```tsx
// AppClient.tsx (Flow 페이지 본문)
{flow.stop_conditions?.length > 0 && (
  <StopConditionsBanner items={flow.stop_conditions} />
)}
{flow.principles?.length > 0 && (
  <PrinciplesCaption items={flow.principles} />
)}
```

### StopConditionsBanner 컴포넌트

```tsx
function StopConditionsBanner({ items }: { items: string[] }) {
  return (
    <aside role="note" aria-label="중단 신호" className="stop-banner">
      <div className="stop-banner-header">
        <Icon name="alert" />
        <span>중단 신호</span>
        <span className="stop-banner-sub">(체크 항목이 아닙니다 — 해당되면 즉시 멈춤)</span>
      </div>
      <ul>{items.map(t => <li key={t}>{t}</li>)}</ul>
    </aside>
  );
}
```

스타일: `background: #FCEAEA; border: 1px solid #F2C2C2; color: #7C2D2D;`
**체크박스 절대 노출 금지.** decision은 list가 아니다.

### PrinciplesCaption 컴포넌트

```tsx
function PrinciplesCaption({ items }: { items: string[] }) {
  return (
    <aside role="note" className="principles-caption">
      <Icon name="info" />
      <span><strong>관찰 원칙.</strong> {items.join(' ')}</span>
    </aside>
  );
}
```

스타일: `background: #FAFAF8; border: 1px dashed #E5E1D6; color: #6B7280;`
역시 체크박스 없음.

### Item list에서 제거

기존에 `## 중단·상담 관찰`을 list 항목으로 렌더하던 코드는 제거. PR-1과 함께 머지.

---

## PR-5 · 모바일 표 → 요약 카드 + 시트 패턴 일반화

**파일:** 표 렌더 컴포넌트들 (`ObservationSheet`, `ComparisonTable`, `EvidenceSheet` 등)
**라우트 영향:** `diet-habit-2week`, `new-car-delivery-check`, `vehicle-inspection-prep`, `baby-food-menu-recipe`

### 패턴

모든 표 컴포넌트는 모바일에서:
- 가로 스크롤 금지
- 대신 "이번 주 요약" 카드 (3-cell summary) 노출
- 전체 표는 sticky CTA "시트로 받기"로 우회

### 예시 — diet-habit-2week 요약 카드

```tsx
function ObservationSheetMobileSummary({ entries }: { entries: DailyEntry[] }) {
  return (
    <Card>
      <div className="summary-grid">
        <SummaryCell label="평균 수면" value={avgSleep(entries)} />
        <SummaryCell label="활동한 날" value={`${activeDays(entries)} / ${entries.length}`} />
        <SummaryCell label="폭식감"
          value={`${stressDays(entries)}회`}
          tone={stressDays(entries) >= 2 ? 'warn' : undefined}
        />
      </div>
      {stressDays(entries) >= 1 && (
        <div className="stress-note">
          {firstStressDay(entries)} 폭식감 1회 — 한 주 안에 반복되면 위쪽 중단 신호 다시 확인.
        </div>
      )}
    </Card>
  );
}
```

기존 `mobile-log-summary-card-pass`는 diet만 적용된 상태. 동일 패턴을 new-car evidence sheet, baby-food reaction log에도 확장.

---

## PR-6 · `## 인수 보류 기준` / `## 계약 보류 기준` 섹션 추가 (코드 변경 없음)

**파일:** `lib/flow/seed-flows.ts`
**라우트 영향:** `new-car-delivery-check` (PR-1-3과 동일), `used-car-buying-check`

`used-car-buying-check`도 같은 패턴:

```diff
+ ## 계약 보류 기준
+ - 자동차등록원부에 압류·저당이 있고 말소 증빙이 없으면 계약 보류
+ - 성능점검기록부의 사고 이력이 골격 손상까지 포함되면 계약 보류
+ - 시운전 중 제동·핸들·변속 이상이 1회라도 발생하면 계약 보류
+ - 계약서 특약에 합의된 정비 책임이 명시되지 않으면 계약 보류

  ## 예산과 후보 정리
  ...
```

---

## PR-7 · hold_section 필드 + HoldBanner / HoldMemoCard 컴포넌트

**스키마:** TL;DR의 `hold_section`
**파일:** 새 컴포넌트 `HoldBanner.tsx`, `HoldMemoCard.tsx`

### HoldBanner — 데스크톱 / 모바일 동일 위치 (anchor 바로 아래)

```tsx
function HoldBanner({ section, holdCount }: { section: HoldSection; holdCount: number }) {
  return (
    <aside role="note" aria-label={section.title} className="hold-banner">
      <div className="hold-banner-header">
        <Icon name="alert" />
        <h2>{section.title}</h2>
      </div>
      <div className="hold-reasons">
        {section.reasons.map((r, i) => (
          <div key={r.id} className="hold-reason">
            <span className="hold-reason-n">{i + 1}</span>
            {r.label}
          </div>
        ))}
      </div>
      <div className="hold-consequence">
        <strong>{section.consequence}.</strong>{' '}
        {holdCount > 0
          ? `현재 ${holdCount}건의 보류 후보가 기록됐어요.`
          : '의심 항목이 발견되면 영업소에 보류 신청서를 요청하세요.'}
      </div>
    </aside>
  );
}
```

스타일: 빨간 패널. 4개 보류 사유는 2x2 grid (데스크톱), 세로 list (모바일).

### HoldMemoCard

```tsx
function HoldMemoCard({ flow, holdEntries }: { flow: Flow; holdEntries: EvidenceRow[] }) {
  if (holdEntries.length === 0) return null;
  // memo_template을 채워서 미리보기 + 복사 버튼
}
```

복사 시 `flow.hold_section.memo_template`을 fill-in해서 클립보드로. 영업소 제출 형식 그대로.

---

## PR-8 · item의 hold_eligible + evidence row의 photo_filename + status

**스키마:** TL;DR의 `FlowItem` 확장
**파일:** `lib/flow/seed-flows.ts` (`new-car-delivery-check` evidence rows에 status 부여), evidence sheet 렌더 컴포넌트

### evidence row 데이터 예시 (new-car)

```ts
const NCD_EVIDENCE_ROWS = [
  { item: '주행거리 (계기판)', photo_filename: 'odometer-{date}.jpg', status: 'ok' },
  { item: '차대번호 vs 계약서', photo_filename: 'vin-{date}.jpg',     status: 'ok' },
  { item: '운전석 도어 도장',  photo_filename: 'door-scratch-{date}.jpg', status: 'hold' },
  { item: '본넷 도장',          photo_filename: 'hood-paint-{date}.jpg',  status: 'check' },
  { item: '플로어 매트',        photo_filename: '—',                       status: 'hold' },
  { item: '계기판 경고등',      photo_filename: 'dashboard-{date}.jpg',   status: 'ok' },
];
```

`{date}`는 인수 예정일 기반으로 자동 채움.

### 상태 배지

| status | 배지 | 행 배경 |
|---|---|---|
| `ok` | "기록" (green) | 흰색 |
| `check` | "측정 요청" (warn) | 연노랑 |
| `hold` | "보류 후보" (danger) | 연빨강 |

### 사진 파일명 헤더

evidence sheet 카드 헤더에 monospace로 노출:

```
사진 파일명 규칙: <항목>-YYYYMMDD.jpg · 예: door-scratch-20260614.jpg
```

---

## PR-9 · 보류 카운터를 sticky CTA에 노출

**파일:** `components/flow/AppClient.tsx`
**의존:** PR-3 (sticky CTA), PR-7 (HoldBanner의 holdCount), PR-8 (status='hold' 집계)

PR-3의 라벨 로직에 hold_count 분기 이미 들어가 있음. 데이터 흐름:

```tsx
const holdCount = useMemo(
  () => flow.evidence_rows?.filter(r => r.status === 'hold').length ?? 0,
  [flow.evidence_rows],
);

<StickyExportCTA flow={flow} holdCount={holdCount} />
```

`holdCount > 0`일 때만 라벨에 `(N건)` 노출, 아니면 일반 primary_destination 라벨로 fallback.

---

## PR-10 · 테스트 / E2E

**테스트 파일:**
- `seed-flows.test.ts` — PR-1, PR-6의 섹션 갱신 검증
- `export.test.ts` — PR-7, PR-9의 메모 템플릿이 hold 항목만 추출하는지
- 새 파일 `validation-fix.test.ts` — anchor label fallback, sticky CTA 라벨 분기, stop_conditions 렌더 위치
- Playwright E2E:
  - 시험일 입력 → "12개 행 갱신됨" 노출 확인
  - 모바일 sticky가 "캘린더에 넣기 · .ics"로 렌더
  - new-car에서 status='hold' 2건 → "보류 메모로 복사 (2건)" 카운터
  - diet-habit-2week에서 stop_conditions가 page header 위에 렌더

---

## 머지 순서

```
PR-1 (seed text 정합화)             [코드 변경 없음, 가장 안전]
  ↓
PR-2 (anchor 라벨 필드)             [PR-1 의존]
  ↓
PR-3 (sticky CTA 동적)             [PR-2와 독립, 어느 쪽 먼저든 OK]
  ↓
PR-4 (stop/principles 필드)        [diet 라우트 핵심]
  ↓
PR-5 (모바일 요약 카드)             [PR-4 후 visual 검증]
  ↓
PR-6 (보류 기준 섹션 추가)          [PR-1과 같이 머지 가능]
  ↓
PR-7 (hold_section + 배너)         [new-car 라우트 핵심]
  ↓
PR-8 (evidence row schema)         [PR-7 후]
  ↓
PR-9 (sticky CTA 카운터)            [PR-3 + PR-8 후]
  ↓
PR-10 (테스트)                      [상시 추가]
```

**Observed session 시작 전 최소 머지:** PR-1, PR-2, PR-3, PR-4
**Session 1 후 평가 결과 따라 머지:** PR-5~PR-10

---

## 절대 변경하지 않음

- `validated` / `검증됨` 라벨은 어떤 PR에서도 추가 금지. observed session 결과가 `candidate signal`이라도 validation으로 승격 금지.
- 전역 sticky export bar 신설 금지. 산출물 카드 내부 또는 모바일 sticky sheet 안 — 둘 중 하나만.
- 사용자 가입·로그인·결제·AI 자동 큐레이션·전역 progress bar 금지 (`STATUS.md`).
- health-sensitive 라우트에서 outcome 문구("2주 후 변화 예상", "건강한 식습관") 추가 금지.
- money-at-risk 라우트에서 사인 결정 명령("사인하세요", "사인하지 마세요") 금지. 보류 가능성 노출만.

---

## 참고

- 본 스펙은 [validation-routes-ux-review.md](./2026-05-26-validation-routes-ux-review.md)의 결론을 코드 단위로 옮긴 것.
- Visual reference: `design-ref/2026-05-26-validation-fix/flowme.html` — 모든 Before/After가 한 캔버스에 정리됨.
- Observed session 시작 시점에 본 스펙의 PR 진행률을 같은 폴더의 `status.md`에 갱신할 것.
