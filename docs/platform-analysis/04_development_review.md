# FLOW 리포지토리 개발 현황 및 소스 코드 아키텍처 검토

> **"구현된 파일의 아키텍처와 핵심 컴포넌트의 동작 구조를 짚어봄으로써, 플랫폼 설계 사상이 소스 코드 수준에서 어떻게 완벽히 구현되어 있는지 증명한다."**
> 이 문서는 리포지토리 루트에 존재하는 `flow-mvp` 프로젝트의 Next.js App Router 기반 아키텍처, 데이터 모델 맵핑, 그리고 핵심 UI 컴포넌트의 작동 상태를 정밀 분석합니다.

---

## 1. 프로젝트 기술 스택 및 아키텍처 개요

현재 활성화되어 개발이 진행 중인 `flow-mvp` 프로젝트는 현대적인 웹 기술 스택과 가볍고 빠른 동작 방식을 채택하고 있습니다.

*   **프레임워크:** Next.js (App Router, v15+ / React v19+)
*   **언어:** TypeScript (안정적인 정적 타입 검사)
*   **스타일링:** Tailwind CSS (일관되고 미려한 디자인 토큰 관리)
*   **E2E 테스트:** Playwright (실제 브라우저 환경에서의 작동 검증)
*   **단위 테스트:** Jest / npm test (날짜 변환, 내보내기, 파서 로직 검증)

### 📂 프로젝트 주요 디렉터리 구성

```text
flow-mvp/
├── app/                      # Next.js App Router (페이지 및 레이아웃)
│   ├── f/                    # 공개 공유용 플랜 상세 경로 (/f/[slug])
│   ├── flows/                # 에디터 및 플랜 관리 경로 (/flows, /flows/[id])
│   ├── flow-lab/             # 어드민/기획자용 내부 테스트 검증용 Lab 뷰
│   └── globals.css           # 글로벌 CSS 및 Tailwind 설정
├── components/
│   └── flow/                 # FLOW 전용 핵심 클라이언트 컴포넌트들
│       ├── AppClient.tsx     # 메인 클라이언트 앱 상태 조율기
│       ├── ArtifactWorkbench.tsx # 메인 실행판 워크벤치 렌더러 (89KB)
│       └── ContentLab.tsx    # 콘텐츠 수명주기 및 감사 관리 보드
├── lib/
│   └── flow/                 # 비즈니스 로직, 날짜 오프셋 계산, 내보내기 모듈
└── docs/                     # 제품 상세 스펙, 품질 루브릭, 에이전트 가이드
```

---

## 2. 핵심 컴포넌트 구현 상세 분석

### ① `ArtifactWorkbench.tsx` (핵심 변환 작업대)
이 파일은 FLOW가 추구하는 **"수출 우선(Export-First) 가치"**를 모바일과 데스크톱 화면에 맞게 구현하는 핵심 중추입니다.

*   **다형성 렌더링 (Polymorphic Rendering):**
    `bundle.flow.structure_type`에 따라 동적으로 최적의 작업대 하위 컴포넌트를 호출합니다.
    ```typescript
    {plan.primarySurface === 'decision_table' ? (
      <DecisionWorkbench ... />
    ) : plan.primarySurface === 'routine_calendar' ? (
      <RoutineWorkbench ... />
    ) : plan.primarySurface === 'spreadsheet_log' ? (
      <SpreadsheetWorkbench ... />
    ) : plan.primarySurface === 'meal_reaction_log' ? (
      <MealReactionWorkbench ... />
    ) : plan.primarySurface === 'timeline_calendar' ? (
      <TimelineWorkbench ... />
    ) : (
      <ChecklistWorkbench ... />
    )}
    ```
*   **내보내기 버튼 바 (`ArtifactExportButtons`):**
    *   **데스크톱 (`sm` 이상):** `메모/노션에 복사`, `엑셀로 받기`, `캘린더 받기` 등 다양한 포맷의 내보내기 버튼을 리스트와 그리드 영역 바로 옆에 가로로 나열하여 신속하게 조작할 수 있게 합니다.
    *   **모바일 (`sm` 미만):** 버튼 밀도를 대폭 줄이기 위해 개별 복사/다운로드 버튼을 숨기고, 대신 하단 고정형 **Sticky Export Bottom Sheet(내 도구로 가져가기 CTA)**로 우회 노출함으로써 화면이 정돈된 느낌을 유지합니다.
*   **접근성 최적화:**
    스크린 리더가 버튼의 정확한 역할(예: 어떤 파일의 어떤 포맷인지)을 인지할 수 있도록, 목적지 지향의 Accessible Label(`aria-label`)을 결합하여 렌더링합니다. (예: `aria-label="시트로 받기: 이유식 오늘 먹은 양 반응 기록"`).

### ② `AppClient.tsx` (글로벌 상태 조율)
*   **비로그인 로컬 상태 유지:** Supabase와 연동되는 계정 시스템이 구축되어 있으면서도, 가입이 필요 없는 Stage 0/1 사용자를 위해 사용자의 입력값(Anchor Date)과 체크 상태를 브라우저 로컬 스토리지에 안정적으로 동기화합니다.
*   **이벤트 추적 (Footprint Event Logging):**
    사용자가 이탈하지 않고 어디까지 액션을 완수했는지 검증하기 위해, `copy_clicked`, `xlsx_downloaded`, `item_checked`, `anchor_entered` 등 핵심 footprint 이벤트를 실시간으로 기록하고 전송하는 로그 파이프라인이 탑재되어 있습니다.

---

## 3. 데이터 모델(Data Model) 및 영속성 설계 원칙

`lib/flow/types.ts`와 `agent.md`에 명시된 데이터 모델은 데이터 결함이나 깨짐을 방지하기 위한 **불변 버저닝(Immutable Versioning) 규칙**을 고수합니다.

```typescript
type Plan = {
  id: string;
  creator_id: string;
  title: string;
  category: string;
  structure_type: 'timeline' | 'phase' | 'routine' | 'checklist';
  anchor_type: 'start_date' | 'end_date' | 'baby_age_month' | 'baby_birth_date' | 'none';
  version: number;
  is_public: boolean;
  parent_plan_id?: string;
  created_at: string;
  updated_at: string;
};

type Item = {
  id: string;
  plan_id: string;
  plan_version: number;
  phase_id?: string;
  type: 'calendar' | 'todo';
  title: string;
  description?: string;
  day_offset?: number;
  order: number;
  repeat_type: 'none' | 'daily' | 'weekly' | 'monthly';
  source_type?: 'official' | 'creator_experience' | 'user_custom';
  source_url?: string;
  risk_level?: 'low' | 'medium' | 'medical_sensitive' | 'legal_sensitive' | 'financial_sensitive';
  is_active: boolean;
};
```

### 🛡️ 변경 안정성 확보 규칙 (Quality & Safety Gates)
1.  **사용자 체크 기록 보존:**
    제작자가 플랜을 수정하거나 아이템 상세를 개편하더라도, 기존 사용자의 체크 상태(`user_item_checks`)가 절대 깨지거나 유실되지 않아야 합니다.
2.  **버전 이력 관리:**
    기존 행(Row)을 덮어쓰거나 직접 삭제하는 대신, 기존 행을 `is_active = false` 상태로 비활성화 처리하고 새로운 `plan_version`으로 새로운 행을 삽입하여 데이터 정합성을 항시 유지합니다.
3.  **검증된 깃발(Representative Eligible) 필터:**
    실제 사용자 테스트를 통과하고 정교한 오프라인 모의 시뮬레이션을 통과한 플랜(예: `computer-skills-d30-study`)만을 내부 감사 채널에서 **"대표 후보"**로 분류하고 있으며, 사용자 실제 전환 데이터가 쌓이기 전에는 어떤 플랜도 대시보드 외부에서 함부로 "검증됨(Validated)"이라 칭하지 않는 신중함을 보여줍니다.

---

## 4. 종합 평가

현재 이 폴더에 구축된 소스 코드는 **"지나친 과구축을 금지하고, 1개의 깃발(First Flag)을 통한 동작성 검증을 최우선으로 한다"**는 Stage 0 제품 철학을 정확히 관통하고 있습니다.

프론트엔드 UI 컴포넌트는 아름다운 Tailwind 테마와 함께, 기획자가 작성한 다양한 실전 템플릿(이사, 영유아 검진, 신차 체크, 공부 루틴 등)의 산출물 형태를 풍부하고 정교하게 출력하며, 모바일 화면에서의 인지 부하 감소를 위해 최상의 섬세함으로 레이아웃 밀도를 제어하고 있습니다.
