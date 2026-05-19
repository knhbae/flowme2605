# UX And POC Reference

## 최신 목업 흐름

`old/FlowMe260316/mockups`에는 모바일 우선 HTML 목업이 있다.

- `index.html`: 목업 네비게이터.
- `home-new.html`: 첫 진입 홈, URL 입력, 카테고리, 인기 플로우.
- `flow-detail.html`: 공개 플랜 상세, 스토리, 사회적 증거, 플로우 미리보기, 하단 CTA.
- `dday-setup.html`: D-day 입력 후 실제 날짜 미리보기.
- `home-active.html`: 진행 중인 플로우, 오늘 할 일, 지연 항목, 추천 플로우.
- `flow-run.html`: 실행 화면, 진행률, 지연 항목, 시작 가능 항목, 완료 항목, 잠긴 항목, 미루기 모달.

## 핵심 사용자 흐름

1. 외부 링크나 검색에서 공개 플랜 상세 페이지로 들어온다.
2. 사용자는 로그인 없이 스토리, 플랜 요약, 일부/전체 항목을 본다.
3. CTA를 눌러 시작한다.
4. 날짜 기준점, 예를 들어 출산 예정일이나 아기 생일을 입력한다.
5. 항목들이 실제 날짜로 변환된다.
6. Phase 1에서는 클립보드/CSV로 내보낸다.
7. 이후 실행 관리 앱으로 확장하면 홈과 Run Page에서 오늘 할 일, 지연 항목, 완료 항목을 관리한다.

## 공개 상세 페이지 원칙

공개 상세 페이지는 사실상 랜딩 페이지다.

포함 요소:

- 플랜 제목과 제작자/출처.
- AI 또는 제작자가 쓴 스토리.
- 총 항목 수, 예상 기간, 투자/보상 요약.
- D-day/phase 기반 미리보기.
- 통계/리뷰는 데이터가 있을 때만 노출한다.
- 하단 CTA는 모바일에서 고정한다.

통계 처리:

- 0명: 섹션 숨김.
- 1~9명: "여러 분들이 따라하고 있어요" 같은 정성 표현.
- 충분한 표본: 실제 숫자, 완주율, 평균 소요, 리뷰 노출.

## 실행 홈 원칙

로그인 후 홈은 탐색보다 실행이 우선이다.

- 진행 중인 플로우 카드.
- 오늘 할 수 있는 것.
- 지연된 항목.
- 다가오는 일정.
- 관련/다음 플로우 추천.

미결인 UX 판단:

- "오늘 할 수 있는 것"은 날짜 도달 기준인지, 선행 조건 완료 기준인지, 둘의 교집합인지 결정 필요.
- 여러 플로우 진행 중일 때 플로우별 분리와 날짜순 통합 중 어떤 표시가 나은지 검증 필요.

## 디자인 토큰

2026 목업 기준:

- Primary: `#4F46E5`.
- 모바일 우선.
- 카드: 흰 배경, 연한 gray border, shadow-sm, rounded-2xl.
- 상태색: 지연/주의는 amber 계열.
- 진행률: primary 색의 얇은 bar.
- 하단 CTA와 bottom navigation을 적극 사용.

2025 웹 POC 기준:

- Next.js/Tailwind/shadcn.
- 12-column layout.
- Base spacing 8px.
- Dark background `#0B0B0C`, surface `#121316`, primary `#5B8CFF`.
- Light background `#FCFCFD`, surface white, border `#E5E7EB`.
- Typography: Inter 또는 Pretendard.

둘이 충돌하면 현재 모바일 검증 MVP는 2026 목업의 간결한 모바일 패턴을 우선하고, 데스크톱 Studio/관리 화면은 2025 웹 POC 패턴을 참고한다.

## 웹 POC에서 참고할 컴포넌트

`old/FlowMe251010web_clean/src/components`와 `old/FlowMe251010web/src/components`에서 참고할 만한 컴포넌트:

- `FlowCard`
- `FlowHeader`
- `KpiChips`
- `StepPreviewList`
- `CtaCard`
- `RelatedGrid`
- `StudioHeader`
- `StepBlock`
- `BlockToolbar`
- `InspectorPanel`
- `SortableStepsList`
- `PublishDialog`
- `RunHeader`
- `StepAccordion`
- `StepControls`

## Subflow vs Collection

`old/FlowMe251010web/docs/plans/SUBFLOW_VS_COLLECTION_ANALYSIS.md`의 결론은 보존한다.

- Subflow: 상위 Flow 실행 중 호출되는 Flow in Flow.
- Collection: Maker가 폴더/앨범처럼 Flow들을 모은 것.
- 필수 단계는 `subflow` + `required: true`.
- 선택 단계는 `subflow` + `required: false`.
- 독립적으로 골라 실행하는 묶음은 `relatedFlows` 또는 Collection.

권장 타입:

```typescript
interface Step {
  type: 'subflow';
  subflowId: string;
  required?: boolean;
}

interface FlowDoc {
  steps: Step[];
  relatedFlows?: string[];
}
```

## 데모 재구현 판단

`claude_ver/08_데모_스펙.md`는 이전 JSX 데모가 모두 정적이었고 실제 사용자 검증이 없었다고 명시한다. 따라서 데모를 똑같이 복원하기보다 실제 Next.js + Supabase MVP 하나를 인터넷에 띄우는 쪽이 낫다.
