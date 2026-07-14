# FLOW 에이전트/개발 운영 가이드

> **AI-agnostic root guide.** 이 문서는 Codex, Claude Code, Gemini CLI, Copilot CLI, Cursor, 또는 다른 AI 개발 도구가 공통으로 따라야 하는 운영 기준이다. 특정 벤더의 명령이나 파일명에 의존하지 않는다.
>
> **Project:** [README.md](./README.md) | **Status:** [docs/STATUS.md](./docs/STATUS.md) | **Roadmap:** [docs/ROADMAP.md](./docs/ROADMAP.md) | **Product Principles:** [docs/PRODUCT_PRINCIPLES.md](./docs/PRODUCT_PRINCIPLES.md) | **Decisions:** [docs/DECISIONS.md](./docs/DECISIONS.md) | **Ideas:** [docs/IDEAS.md](./docs/IDEAS.md) | **PR History:** [docs/pr-history/README.md](./docs/pr-history/README.md) | **History:** [docs/HISTORY.md](./docs/HISTORY.md) | **Harness:** [docs/harness/README.md](./docs/harness/README.md)

## 0) Agent Harness Rules

### Session Role
- 기본 역할은 **orchestrator**다. 먼저 문서와 코드를 읽고, 변경 범위와 검증 방법을 명확히 한다.
- 코드/문서 수정은 요청 범위에 맞게 최소화한다. 기존 사용자 변경을 되돌리지 않는다.
- 별도 subagent 기능이 있으면 구현자/리뷰어/브라우저 테스터 역할을 분리한다. subagent 기능이 없으면 같은 AI가 단계별로 컨텍스트를 분리해 수행하고, 리뷰 단계에서는 변경자 관점이 아니라 검토자 관점으로 본다.
- Claude 전용 `/plan`, `/qa` 같은 slash command가 없어도 같은 절차를 [docs/harness/SDLC.md](./docs/harness/SDLC.md)에 따라 수동 실행한다.

### User Input Interpretation Notice
- 사용자의 말은 현재 상황, 느낀 불편함, 바라는 방향을 드러내는 주장으로 우선 해석한다. 명시적으로 지시하지 않은 한 반드시 그대로 실행해야 하는 명령으로 보지 않는다.
- 사용자도 에이전트도 자동으로 옳지 않다. 제품 판단, 구현 판단, 우선순위 판단은 근거, 관찰된 사실, 명시한 가정, 객관적 tradeoff를 기준으로 정리한다.
- 계획 단계에서는 최고 수준의 reasoning을 적용하고, 필요한 경우 웹 검색/공식 문서/소스 코드/검증 로그를 함께 사용한다. 소프트웨어 엔지니어, 플랫폼 엔지니어, UX/제품 기획자 관점을 모두 동원하되, 최종 판단은 증거에 연결한다.
- 사용자가 직접 말하지 않은 개념, 원칙, 철학, 제약, 부작용도 계획 전에 식별한다. 단, 추정은 추정으로 표시하고, 확정된 요구사항처럼 다루지 않는다.
- 불편함을 들었을 때는 곧바로 해결책을 고정하지 말고, 문제가 실제로 어디에서 생기는지와 대안별 비용/효과를 먼저 분리한다.

### Required Reading Order
1. `agent.md`
2. `docs/STATUS.md`
3. `docs/ROADMAP.md`
4. `docs/DECISIONS.md`
5. `docs/IDEAS.md`
6. UX, 일정, 투두, 루틴, 건강/운동 실행 흐름과 관련된 작업이면 `docs/REFERENCE.md`
7. 변경 대상과 관련된 `design.md`, `docs/harness/*.md`, `docs/superpowers/*`, `old_reference/*`
8. 실제 코드와 테스트

### Development Commands
```powershell
npm install
npm run docs:check
npm test
npm run build
npm run test:e2e
npm run dev
```

### Service URLs
- Local app: `http://localhost:3000`
- Playwright app under test: `http://127.0.0.1:3104/flows`
- Deployment: Vercel, see `vercel.json`

### Quality Gates
- Documentation/config changes: run `npm run docs:check`.
- Pure logic changes: run `npm test`.
- App/runtime changes: run `npm test` and `npm run build`.
- User-facing flow changes: also run `npm run test:e2e` or document why it could not run.
- Visual/frontend changes: inspect in browser and capture screenshots when possible.
- Sensitive FLOW content must preserve source/risk separation and must not imply medical, legal, or financial certainty.
- Content/UX changes must use the FLOW quality system in [docs/flow-rules/README.md](./docs/flow-rules/README.md). Apply broad principles first, score the result with the rubric, then use pattern playbooks only as defaults with explicit exceptions.

### Documentation Memory
- `docs/STATUS.md`: current state and health.
- `docs/ROADMAP.md`: planned versions and backlog index.
- `docs/DECISIONS.md`: durable product, UX, technical, and process decisions that future agents should treat as settled unless reopened.
- `docs/IDEAS.md`: useful ideas, deferred work, unresolved conversation context, and revisit triggers that are not yet committed roadmap items.
- `docs/REFERENCE.md`: external UX/UI and productivity-method references for calendar, task, reminder, routine, health, and exercise execution flows.
- `docs/pr-history/`: PR-level implementation memory. Record the reason, major changes, not-done items, decisions, verification evidence, deploy links, risks, rollback notes, and follow-ups for each PR.
- `docs/HISTORY.md`: released changes only.
- `docs/harness/`: AI-agnostic process, roles, and verification rules.
- `docs/superpowers/`: detailed specs/plans produced by agent workflows.
- `docs/flow-rules/`: product-quality principles, rubric, pattern playbooks, UX copy rules, and review gates for FLOW content and UI.

### Policy and Idea Tracking
- When a conversation settles how a product surface, data model, UX rule, safety boundary, creator policy, or agent process should behave, record it in `docs/DECISIONS.md` before the session ends. Include the reason, affected surfaces, reopen trigger, and related docs.
- When a conversation raises a promising direction but it is not committed for current implementation, record it in `docs/IDEAS.md` before the session ends. Include why it is not now, the concrete revisit trigger, and the source conversation context.
- When an idea becomes planned user-facing work, promote it from `docs/IDEAS.md` into a `docs/specs/YYYY-MM-DD-short-topic/` spec instead of leaving it as chat memory.
- If a decision or idea is mentioned in the middle of implementation, capture it in the right document during the same turn or in the final handoff. Do not rely on the chat transcript as the only memory.
- If a user asks "what about X style/direction?" and the answer is not immediate implementation, treat it as either a pending idea or an explicit rejected/deferred decision and record it accordingly when the user confirms or the session direction is clear.
- If multiple documents could apply, use this order: settled rule in `DECISIONS`, uncommitted direction in `IDEAS`, committed multi-step work in `specs`, active health or current blocker in `STATUS`, release fact in `HISTORY`.

### Notion Operating Projection
- The repo document graph remains canonical. Notion is an optional human-facing operations view, not another place to duplicate full specs, decisions, research, test logs, or implementation detail.
- The active projection is [00 FlowMe 운영 홈](https://app.notion.com/p/39ac0d8f693f81339a34fdb75552bc27), backed by `collection://4946eb61-01b1-49e8-929e-82b118740310`. For non-trivial backlog or status work, establish the repo baseline first, then read this board when the connector is available.
- Map every projected work item to a durable product direction and keep a compact `사용자가 챙길 것` summary at the top of the operations home. It should connect the current human decision or action to FLOW's larger product loop, not show an undifferentiated task list. Also maintain a horizon map sourced from `docs/PRODUCT_PRINCIPLES.md` and `docs/IDEAS.md` that separates Now, Next, Expansion, and Long horizon; visibility there does not promote a deferred idea into the active backlog.
- Keep the operations home explicit about two different clocks: the current product-validation Stage and the implementation capability already built. Show the current baseline, completed/conditional/unstarted gates, and the evidence required for the next Stage or release-grade decision; implementation progress alone must not advance the validation Stage.
- After substantial strategy, research, UX, QA, or release work, decide whether the user owes a blocking decision, useful feedback, direct/external action, or only ongoing awareness. Put only those outcome-level items in the top feedback queue with the exact ask, recommendation, and next checkpoint; keep AI-owned follow-up separate and do not pin completed artifacts that require no user response.
- Every pinned review item must include a directly openable primary artifact link. Prefer the committed GitHub file URL. When the essential HTML or Markdown is still local and uncommitted, attach a dated Notion review snapshot and show the repo-local path, clearly state that the snapshot is not canonical, and refresh the canonical link after commit instead of leaving a broken link.
- When the FlowMe Notion board and connector are available, project only active human gates and high-level work packages: decisions or input the user owes, AI results awaiting review, direct human actions, blockers, next checkpoints, done-when conditions, and repo/evidence links.
- Keep AI work at outcome level in Notion. File changes, commands, subtasks, tests, and technical reasoning stay in the linked repo spec, plan, PR, or handoff.
- Update the repo first, then update only the Notion items touched by the task. If Notion is unavailable or conflicts with the repo, continue from the repo and mark/report the Notion projection as stale rather than blocking work.

### Repeatable Collaboration Workflows
- Use [Session Start](./docs/workflows/session-start.md) and `npm run workflow:session-start` before substantial new or resumed work, especially in a dirty worktree.
- Use [Request Interview](./docs/workflows/request-interview.md) only when ambiguity could materially change the outcome, product direction, scope, risk, or success evidence. Inspect repo evidence first, ask one round of 1-3 high-information questions, recommend a default, and skip the interview for clear low-risk requests.
- Use [Direction Capture](./docs/workflows/capture-direction.md) whenever a durable decision, deferred idea, approved spec, active blocker, route contract, or release fact emerges during conversation or implementation.
- Use [Work Closeout](./docs/workflows/work-closeout.md) and `npm run workflow:closeout` before claiming completion, handing off, committing, publishing, or reporting status.
- Workflow scripts are read-only evidence collectors. They do not decide product direction, run verification, update Notion, or authorize commit, push, merge, deploy, or destructive cleanup.

### Idea Capture
- 작업 중 좋은 아이디어가 나왔지만 이번 범위에 적용하지 않으면 `docs/IDEAS.md`에 기록한다.
- 기록 형식은 날짜, 아이디어, 왜 지금 안 하는지, 다시 볼 조건, 출처 대화/작업 맥락을 포함한다.
- 실행하기로 확정된 항목만 `docs/ROADMAP.md`로 승격한다.
- 중요한 기술/제품/UX/프로세스 판단은 아이디어가 아니라 `docs/DECISIONS.md`에 짧게 남기고, 구현 범위가 정해졌으면 관련 spec 또는 plan에도 연결한다.

### Conversation Memory Capture
- 아직 확정 전인 좋은 생각이나 나중에 다시 볼 맥락은 `docs/IDEAS.md`에 저장한다.
- 사용자와 함께 확정한 제품/UX/기술/운영 판단은 `docs/DECISIONS.md`에 저장한다.
- 구현하기로 정한 사용자-facing 흐름, 데이터 모델, 콘텐츠 변환, 운영 변경은 `docs/specs/YYYY-MM-DD-short-topic/`로 승격한다.
- 외부 콘텐츠 후보, source/risk 분석, Flow 변환 기준, 긴 세션 인수인계는 `docs/content-audit/`에 저장한다.
- 현재 상태, 최근 완료, 배포 전 주의점, active blocker는 `docs/STATUS.md`에 저장한다.
- PR 단위의 변경 이유, 검증, deploy link, rollback, follow-up은 `docs/pr-history/`에 저장한다.
- 대화가 길어지거나 방향이 바뀌면 세션 끝에서 주요 결정, 열린 질문, 다음 작업을 위 규칙에 맞게 저장한다.

### Safety Rules
- Never edit `.env`, credentials, API keys, or deployment secrets unless the user explicitly asks.
- Never modify `old/`, `claude_ver/`, or legacy source dumps unless explicitly asked.
- Do not call a route, feature, or plan "검증됨" before real user behavior data exists.
- Prefer explicit evidence: command output, test results, screenshots, or linked documents.

## 1) Project Identity
FLOW는 경험 콘텐츠와 사용자 도구 사이의 **실행 레이어**다. 블로그, 영상, 제작자 노하우, 실사용 경험을 구조화된 실행 플랜으로 변환해 사용자가 캘린더/할 일/시트/개인 도구로 복사·내보내기하고 즉시 실행하게 돕는다. FLOW는 단순 체크리스트 앱, Notion 템플릿 갤러리, 육아 버티컬 앱, Reddit형 커뮤니티, 범용 생산성 앱이 아니다. FLOW는 **실행형 경험 위키**, **실생활 루트 시스템**, **first-flag-first 제품**, **실행 발자국(footprint) 데이터 레이어**다.

### 내부 비전/카피
- 비전: **인간의 모든 경험을 실행 가능한 형태로 기록한다.**
- 사용자 카피: **해본 사람 경험, 복붙해서 바로 시작.**
- 제작자 카피: **당신의 경험, 누구나 실행할 수 있게.**

## 2) Current Strategic Priority
현재 최우선은 전체 플랫폼 구축이 아니라 **Stage 0 / First Flag 검증**이다.

> 목표: 초안 깃발 1개로 사용자의 복사/내보내기/공유/체크 행동이 실제로 발생하는지 검증한다.

### 우선 깃발 (권장)
- **아기 백신/영유아 검진 준비 체크리스트**
- 이유: 이유식 처방형 플랜보다 의료 책임이 낮고, 공식 정보와 부모 경험 팁 분리가 가능하며, 실제 실행 수요가 분명함.

### 차선 깃발 (대안)
- **이사 D-30 체크리스트**
- 이유: 타임라인 구조가 명확하고, 수익화 타이밍 가설이 좋으며, 법률/의료 리스크가 상대적으로 낮음.

**Stage 0 이전 과구축 금지.**

## 3) Non-Negotiable Product Principles
1. 전체 지도가 아니라 **한 개의 깃발**에서 시작한다.
2. 콘텐츠 소비보다 **사용자 실행 행동**을 우선한다.
3. 조회수보다 **복사/내보내기/체크**를 중시한다.
4. 공식 정보와 제작자 경험은 시각/구조적으로 분리한다.
5. 육아/건강/법률/재무 민감 영역에서 경험 팁을 공식 가이드처럼 제시하지 않는다.
6. 실제 사용 데이터 전에는 어떤 것도 “검증됨”이라 부르지 않는다.
7. 플랫폼 기능을 성급히 확장하지 않는다.
8. 예쁜 데모는 검증이 아니다.
9. 첫 측정 행동은 **open → anchor 입력 → copy/export → check → feedback** 이다.
10. 장기 해자는 콘텐츠 양이 아니라 **실행 footprint 데이터**다.

### FLOW Quality System
FLOW 품질 기준은 좁은 금지 규칙이 아니라 3층 구조로 운영한다.

1. **Principles:** 모든 카테고리에 적용되는 넓은 원칙. 사용자의 실제 니즈, 출처/위험 분리, 목적지 기반 실행, 적정 복잡도를 본다.
2. **Rubric:** `docs/flow-rules/quality-rubric.md`의 점수 기준으로 실행성, 원본 충실도, 휴대성, 인지부하, 문장 구체성, 접근성/안전을 평가한다.
3. **Pattern Playbooks:** `docs/flow-rules/content-conversion-playbooks.md`의 카테고리별 기본값을 사용하되, 원본 콘텐츠 구조와 사용자 목적이 다르면 예외를 명시한다.

작업자는 “운동 영상은 무조건 1개 action” 같은 절대 규칙을 만들지 않는다. 대신 “단일 운동 영상은 기본 1개 action, 프로그램/챌린지/재활 루틴은 다중 단계 허용”처럼 기본값과 예외를 함께 둔다.

## 4) Product Structure Types

> **Canonical note (2026-07-12):** The four names below remain legacy UI/seed compatibility shorthands, not the backend content schema. New conversion and storage use independent axes from [Canonical Flow Data Model v1](./docs/specs/2026-07-11-canonical-flow-data-model/spec.md): `planningPattern`, `primaryArtifact`, Item intent/facets, and Item schedule mode. Map `timeline -> date_preparation`, `phase -> phase_lifecycle`, `routine -> repeating_routine`, and `checklist -> a primary artifact/projection`. `Item` remains the minimum independently stateful execution/projection unit.

### `timeline`
D-Day 기반 플랜.
- 예: 이사, 결혼, 여행, 출산 준비, 시험 준비
- 핵심 로직:

```ts
actualDate = anchorDate + dayOffset
```

- 대표 `anchor_type`: `end_date`, `start_date`

### `phase`
단계 기반 플랜.
- 예: 이유식, 수면 훈련, 발달, 반려동물 훈련
- 대표 `anchor_type`: `baby_age_month`, `baby_birth_date`

### `routine`
반복 실행 플랜.
- 예: 운동, 공부 루틴, 언어 학습, 식단 관리
- 대표 `anchor_type`: `start_date`

### `checklist`
순서가 약하거나 비정렬 작업 중심 플랜.
- 예: 취업 준비, 프리랜서 세팅, 사업자 등록, 서류 준비
- 대표 `anchor_type`: `none`

## 5) Development Scope by Stage

### Stage 0 — Static Demo / Concierge MVP
- 목적: 개념 설명 + 초안 깃발 1개의 실제 행동 검증
- 허용: 정적 HTML/React 데모, Google Sheet, 수동 체크리스트, 복사 텍스트, CSV 내보내기, 피드백 폼, 수동 인터뷰
- 금지: 로그인, DB 대규모 구현, AI 자동화, Google Calendar/Sheets API, 결제, 토큰/코인, 풀 커뮤니티, 네이티브 앱

### Stage 1 — Web MVP
- 목적: 공개 플랜 페이지, 앵커 입력, 렌더링, 복사/내보내기, 간단 체크, 이벤트 로깅
- 핵심: `/p/[slug]`, 카테고리/structure_type 표시, anchor 입력, day_offset 계산, 체크리스트 렌더링, 로컬 체크 상태, 진행률, 클립보드 복사, CSV 다운로드, 기본 피드백, view/copy/export/check 이벤트 로깅
- 지양: 필수 가입, 고급 OAuth, AI 생성, 수익화, 커뮤니티 피드, 모바일 앱

### Stage 2 — Creator MVP
- 목적: 제작자 발행 의사 검증
- 핵심: 간단 로그인, 플랜 생성, 카테고리/구조 선택, 아이템 편집, day_offset 설정, 미리보기, 발행 링크, 기초 분석
- 에디터 흐름: **쓰기 → 다듬기 → 미리보기/발행**

### Stage 3 — Execution Data
- 목적: FLOW 내부에 사용자 footprint 저장
- 핵심: user plan copy, 항목 체크 기록, 비공개/공개 메모, “막혔어요”, 리뷰, 익명 통계, 제작자 분석

### Stage 4 — Category Expansion
한 깃발 검증 이후 확장.
1. 육아(백신/검진 또는 베이비 준비) — phase/checklist
2. 이사 — timeline
3. 운동 — routine
4. 취업 준비 — checklist
5. 자격증/시험 — timeline + routine

### Stage 5 — Integrations & AI
MVP 행동 검증 이후.
- 가능: iCal export, Google Calendar/Sheets, Jina Reader URL 추출, AI 초안 구조화, 제작자 검토 발행
- 원칙: AI는 **초안 생성만**. 민감 카테고리에서 AI 자동 발행 금지.

### Stage 6 — Monetization
사용자/제작자 행동 검증 이후.
- 가능: 유료 제작자 플랜, 매칭 수수료, 실행 시점 광고, 정산, 광고주 대시보드
- 금지: 초기 토큰/코인 도입

## 6) Data Model Principles
핵심 테이블:
- `users`, `plans`, `phases`, `items`, `user_plans`, `user_item_checks`, `plan_connections`, `plan_events`

핵심 타입:

```ts
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
  source_checked_at?: string;
  risk_level?: 'low' | 'medium' | 'medical_sensitive' | 'legal_sensitive' | 'financial_sensitive';
  disclaimer_type?: 'none' | 'official_info' | 'consult_doctor';
  is_active: boolean;
};
```

불변 버저닝 규칙:
- 기존 사용자 체크 기록을 깨뜨리는 방식으로 기존 아이템을 수정/삭제하지 않는다.
- 제작자 수정 시:
  - 기존 row는 `is_active = false`
  - 신규 `plan_version`으로 row 추가
  - 기존 사용자 기록 보존

## 7) Event / Footprint Tracking
제품 개념어로 **footprint**를 사용한다.

추적 이벤트:
- `plan_viewed`
- `anchor_entered`
- `copy_clicked`
- `csv_downloaded`
- `share_text_copied`
- `item_checked`
- `feedback_submitted`
- `creator_link_clicked`

해석:
- View: 사용자가 문제를 체감해 깃발을 열어봄
- Anchor entered: 사용자 개인화 시도
- Copy/Export: 사용자 도구로 이동
- Check: 실제 행동 발생
- Feedback: 루트 개선 신호

## 8) Safety and Risk Rules
육아/건강/법률/재무 카테고리 원칙:
- 공식 정보와 경험 정보 분리
- source type 표시
- source URL 표시(가능한 경우)
- last checked date 표시(가능한 경우)
- risk badge 표시
- 주의 문구 제공
- 필요 시 전문가 상담 권고
- 경험 팁을 확정적 의료/법률/재무 조언처럼 표현 금지

백신/영유아 검진 시나리오 프레이밍:

> 공식 일정은 공인 채널에서 확인하고, FLOW는 방문 준비와 가족 공유를 돕습니다.

## 9) Technical Stack Guidance
권장 스택:
- Next.js
- TypeScript
- Tailwind CSS
- Vercel
- Supabase PostgreSQL
- Supabase Auth
- (제한적) GCP: Google Calendar/Sheets API 연동 시
- AI provider API: 초안 생성(Claude, OpenAI, Gemini 등으로 교체 가능)
- Jina AI Reader: URL→텍스트 추출

초기에는 무거운 인프라 도입 금지.
Stage 1은 공개 링크 + 클립보드 복사 + CSV 내보내기 + 최소 Supabase 이벤트 로깅 중심.

## 10) What Not To Build Yet
아래는 선행 검증 전 구현 금지:
- 네이티브 앱
- 필수 회원가입
- 풀 커뮤니티
- AI 자동 발행
- 토큰/코인
- 결제
- 광고주 대시보드
- 복잡한 검색
- 추천 그래프
- 무거운 Google OAuth 플로우
- Notion 연동
- 멀티 카테고리 마켓플레이스

이유: 아직 초안 깃발 1개에서 복사/내보내기/체크 행동조차 실증되지 않음.

## 11) Tone for Future Agents
미래 에이전트는 낙관적 문구보다 **검증 중심의 비판적 태도**를 유지한다.

해야 할 것:
- 과구축 징후를 지적
- Stage 0 집중 보호
- 가설과 검증 사실을 분리
- 데모 확장보다 소규모 실제 테스트 우선
- 모호한 플랫폼 용어 대신 MVP 실행 언어 사용
- 측정 가능한 사용자 행동 우선

하지 말아야 할 것:
- 과도한 찬양
- 데이터 없는 “검증됨” 주장
- 투기적 플랫폼 기능 구현
- 공식 정보/경험 팁 경계 흐리기
- 사용 데이터 전 “검증된” 표현 사용

## 12) Legacy Context & Documentation Rules (기존 제약 보존)
기존 문서 제약 중 유효한 항목은 유지한다.

- 컨텍스트 우선순위: `old_reference/` → `claude_ver/files.zip` → `old/FlowMe260316` → `old/FlowMe251010web*`
- 최신 방향 충돌 시: Next.js + TypeScript + Tailwind + Supabase + Vercel + 작은 Phase 1 우선
- `old/` 및 `claude_ver/` 파일은 명시 요청 없으면 수정/삭제 금지
- 구형 시크릿/서비스 키 등 레거시 산출물은 신뢰하지 않음
- 문서는 신규 에이전트가 빠르게 읽을 수 있게 유지하되, Stage 0 핵심 가설/제약은 반드시 명시
