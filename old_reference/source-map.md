# Source Map

## `claude_ver/files.zip`

최신 기준으로 삼은 문서 묶음이다.

- `00_INDEX.md`: ZIP 산출물 구성, 한계, 가장 시급한 Phase 0 리스크.
- `01_서비스기획_v3_최종.md`: 최종 비전, 한 줄 정의, 플레이어, 수익 모델, 해자.
- `02_기획_진화_이력.md`: v0.1 -> v0.2 -> v2 -> v3 변화, 카테고리/스택/버저닝 결정.
- `03_DB_스키마.md`: Supabase 기준 최신 DB 스키마와 Immutable Versioning.
- `04_기술스택_결정.md`: Next.js, Supabase, Vercel, GCP 제한 사용, Claude/Jina 결정.
- `05_데이터구조_분석.md`: timeline/phase/routine/checklist 구조 타입.
- `06_MVP_로드맵.md`: Phase 0~3, Gate, 만들지 말 것.
- `07_미결과제_리스크.md`: Phase 0 미실행, 제작자 섭외, OAuth, AI scraping 등 리스크.
- `08_데모_스펙.md`: 소실된 JSX 데모 구조와 재구현 권장 순서.

## `old/FlowMe260316`

2026년 3월 FlowMe 기획과 목업. 최신 기획과 충돌하지만 실행 관리 플랫폼 관점의 좋은 설계가 있다.

- `planning/flowme-vision-v2.md`: FlowMe 장기 비전, Cost/Reward, 실행 프로필, 플랫폼 정체성.
- `planning/phase1-decisions.md`: Phase 1 결정 추적, Next.js PWA, Supabase, Kakao login/alimtalk, Google Calendar 관련 이전 결정.
- `planning/user-scenarios.md`: 공개 상세, 홈, D-day 입력, 알림톡, URL 입력, 연쇄 조정 시나리오.
- `data_architecture/flowme-data-architecture.md`: DAG 의존성, EventLog, ContentSnapshot, Integration, shift_item 알고리즘.
- `mockups/*.html`: 모바일 우선 화면 흐름과 시각 패턴.
- `CLAUDE.md`: 레거시 agent 지침. 최신 `agent.md`에는 일부 원칙만 반영.

## `old/FlowMe251010web`

Next.js 웹 POC의 가장 많은 구현 산출물이 있는 폴더다.

- `agents.md`: 이전 Codex agent 운영 규칙.
- `docs/core/SYSTEM_ARCHITECTURE.md`: 웹 POC 기능 아키텍처.
- `docs/requirements/IMPLEMENTATION_REQUIREMENTS.md`: Flow Detail, Studio Edit, Subflow 구현 요건.
- `docs/plans/SUBFLOW_VS_COLLECTION_ANALYSIS.md`: Subflow와 Collection의 역할 분리.
- `src/types/*.ts`: FlowDoc, Step, RunDoc, Follow/Run, Progress, Routine 타입.
- `src/store/*.ts`: Zustand 기반 편집/실행/인증/팔로우 상태 관리.
- `src/app/api/**`: 로컬/POC API 라우트.
- `src/app/**`: Explore, Flow detail, Studio, Run, Dashboard 등 페이지 POC.

## `old/FlowMe251010web_clean`

정리된 웹 POC다.

- `DESIGN.md`: 디자인 시스템, 화면 우선순위, 컴포넌트 구조, 진행 상태.
- `DESIGN_REQUIREMENTS.md`: DB/API/상태/컴포넌트/성능/보안/테스트 설계 요구.
- `IMPLEMENTATION_REQUIREMENTS.md`: 구현 요구사항.
- `DEVELOPMENT_STATUS.md`: 개발 상태.
- `src/components/**`: Flow 카드, 에디터, 실행 컴포넌트.
- `src/lib/**`: 샘플 데이터, localStorage, flow 유틸.

## Flutter POC

- `old/FlowMe251004/flow_mvp`
- `old/FlowMeApp/flowme_app`
- `old/FlowMe251003*`
- `old/FlowMe251009*`

Flutter/Firebase/Riverpod 기반 앱 POC다. 현재 웹 우선 방향에서는 직접 기반으로 쓰지 않고, 도메인 모델과 실행/알림/캘린더 아이디어만 참고한다.

## 제외한 것

- `node_modules`, 빌드 산출물, 플랫폼별 Flutter runner 파일.
- lockfile과 generated 파일.
- 중복 백업 폴더는 최신/정리본과 충돌할 때 후순위로 처리.
