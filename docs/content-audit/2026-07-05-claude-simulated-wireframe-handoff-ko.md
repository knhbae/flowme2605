# 2026-07-05 Claude Design 사용자 시뮬레이션 와이어프레임 요청 패키지

## 목적

이번 요청은 Claude Design에게 새 앱을 상상해서 그리게 하는 것이 아니라, 현재 FlowMe 앱의 기본틀과 이미 들어간 컨텐츠를 기준으로 사용자가 실제로 어떻게 쓰는지 시뮬레이션형 와이어프레임을 만들게 하기 위한 handoff다.

핵심 요청은 `URL 입력 -> 기존 Flow 조회 -> 옵션 변경/얇은 수정 -> export -> My Flow 저장 -> Calendar 실행` 흐름을 실제 컨텐츠가 들어간 storyboard로 그려달라는 것이다. `memo-to-Flow`는 secondary entry로 같이 넣되, 같은 export/My Flow 구조로 수렴해야 한다.

## Claude에게 줄 파일

1. 복붙용 프롬프트: [2026-07-05-claude-simulated-wireframe-request-ko.txt](./2026-07-05-claude-simulated-wireframe-request-ko.txt)
2. 참조 그림: [2026-07-05-url-first-simulation-wireflow-ko.svg](./2026-07-05-url-first-simulation-wireflow-ko.svg)
3. 증거 zip: `D:\flowme2605\flow-mvp\claude_work\FlowMe 진입점 관련 고민 02.zip`

## Claude에게 반드시 확인시킬 입력

- `flow-mvp/docs/SERVICE_STRUCTURE.md`
- `flow-mvp/docs/content-audit/2026-07-04-productivity-connectivity-priority-research-ko.md`
- `flow-mvp/docs/content-audit/2026-07-02-flow-usage-entry-backlog-ko.md`
- `flow-mvp/components/flow/AppClient.tsx`
- `flow-mvp/components/flow/PlatformNav.tsx`
- `flow-mvp/components/flow/SourceBackedFlowMapPage.tsx`
- `flow-mvp/components/flow/ArtifactWorkbench.tsx`
- `flow-mvp/lib/flow/seed-flows.ts`
- `flow-mvp/lib/flow/source-backed-my-flow.ts`
- `flow-mvp/lib/flow/export.ts`
- `flow-mvp/lib/flow/my-flow-step-export.ts`

## 컨텐츠 전체 GitHub 위치

Claude에게 예시 몇 개만 보게 하지 말고, 아래 위치에서 전체 컨텐츠 인벤토리를 직접 확인하게 한다.

| 목적 | GitHub/repo 위치 | 비고 |
| --- | --- | --- |
| 대표/기본 single Flow | `flow-mvp/lib/flow/seed-flows.ts` | public `/f/[slug]` 컨텐츠의 핵심 원천 |
| source-backed Flow Map | `flow-mvp/lib/flow/source-backed-my-flow.ts` | `/flow-maps/[map]`, child Flow, My Flow 저장 row |
| curated source app seed 원본 | `flow-mvp/docs/content-audit/2026-07-01-curated-source-app-seed-v1.json` | 앱 표면으로 반영된 큐레이션 seed 데이터 |
| curated seed adapter | `flow-mvp/lib/flow/curated-source-app-seed.ts` | JSON을 런타임 `FlowBundle`/Flow Map으로 변환 |
| 원문 후보/검토 큐 | `flow-mvp/docs/content-audit/original-source-review/` | 아직 public UX에 바로 올릴 후보와 보류 후보 분리 |
| 큰 후보 큐 | `flow-mvp/docs/content-audit/original-source-review/2026-05-31-original-source-review-queue.json` | lookup miss/low-quality/park 시뮬레이션 참고 |
| 검토된 후보/추출본 | `flow-mvp/docs/content-audit/original-source-review/2026-05-31-resolved-original-candidates.json`, `2026-05-31-resolved-source-extracts.json` | source 확인과 후보 분류 참고 |

요청 프롬프트에는 Claude가 필수 예시 6개 외에 위 인벤토리에서 6~10개를 더 골라 총 12~16개 대표 컨텐츠를 표로 정리하게 했다. 단, 후보 큐에만 있는 URL은 public 화면에 노출하는 예시가 아니라 `lookup miss`, `low-quality`, `park` 상태를 설명하는 데 쓰도록 제한했다.

## 시뮬레이션에 넣을 실제 컨텐츠

| 상황 | 기존 route/content | 넣을 사용자 입력 | Claude가 그려야 할 핵심 |
| --- | --- | --- | --- |
| URL hit | `/flow-maps/moving-d30`, `원룸 이사 D-30 일정 지도` | 이사일 `2026-08-24` | 기존 변환 발견, 시작일 변경, export, My Flow/Calendar |
| 공유 Flow 저장 | `/f/vehicle-inspection-prep`, `자동차검사 D-14 준비` | 검사 예정일 | 공유 shell과 app shell의 경계, 저장 후 My Flow |
| 날짜 없는 컨텐츠 | `/flow-maps/middle-school-math-1` | 날짜 없음 | 진도표/checklist/sheet형 실행 |
| 특수 workbench | `/f/fridge-cleanout-weekly-plan`, `/f/baby-food-menu-recipe` | 시작일 | 일반 Flow와 같은 export-first 구조 |
| memo-to-Flow | 메모장 계획 | "8월 말 이사 예정..." | private draft, 기존 Flow 추천, Markdown/Calendar/Todo preview |
| low-quality/miss | 일반 블로그/유튜브 URL | URL만 입력 | 재사용/수정/AI fallback/Park 선택 |

## 기대 산출물

Claude Design의 결과물은 평가 문서가 아니라, 다음 개발 루프에 바로 넣을 수 있는 화면 설계여야 한다.

- 현재 앱 IA 요약
- 전체 사용자 wireflow
- 실제 컨텐츠가 들어간 모바일 우선 low-fidelity storyboard 10장 이상
- export panel 설계
- 비로그인 복사/다운로드와 로그인 후 My Flow 저장 경계
- source/trust/version 표시
- private draft/shareable Flow/source owner adoption loop
- P0/P1/P2 개발 백로그
- UX 리스크와 만들지 말아야 할 방향

## 검토 기준

- 기존 4-tab IA를 유지했는가.
- 기존 route/component/content를 근거로 삼았는가.
- 사용자가 5초 안에 URL을 넣거나 기존 컨텐츠를 가져갈 행동을 이해하는가.
- AI가 기본 경로로 보이지 않는가.
- export가 Calendar/Todo/Markdown/Sheet 기준선에 맞는가.
- `My Flow`와 `Calendar`가 저장 후 실제 실행 표면처럼 이어지는가.
- fake usage count나 과한 creator marketplace가 들어가지 않았는가.
- 빈 박스가 아니라 실제 컨텐츠 제목, 날짜, CTA, 상태 라벨이 들어갔는가.
