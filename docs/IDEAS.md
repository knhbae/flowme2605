# Deferred Ideas

This file preserves useful ideas and conversation context that are not yet committed to the roadmap.

Use this for:

- Good ideas discovered during implementation but outside the current scope.
- Follow-up work that needs more evidence before becoming a roadmap item.
- Product, UX, technical, or process notes worth revisiting later.
- Conversation context that future agents should not lose.
- Exploratory product directions raised in chat, such as "what if this page used X style?", when they are not yet approved implementation work.
- Deferred alternatives that were considered but held back because they need user evidence, product sequencing, or a clearer owner.

Do not use this for:

- Work already committed to a version plan. Put that in [ROADMAP.md](./ROADMAP.md).
- Settled product, UX, technical, or process decisions. Put those in [DECISIONS.md](./DECISIONS.md).
- Current health or active blockers. Put those in [STATUS.md](./STATUS.md).
- Released changes. Put those in [HISTORY.md](./HISTORY.md).
- Detailed approved designs or implementation plans. Put durable project specs under `docs/specs/`; keep tool-generated artifacts under `docs/superpowers/`.

## Capture Template

```markdown
### YYYY-MM-DD - Short title

**Idea:** One or two sentences.

**Why not now:** Scope, evidence, dependency, or risk.

**Revisit when:** Concrete signal or milestone.

**Source context:** User conversation, implementation task, QA finding, or file reference.
```

## Capture Rule

Capture the idea during the same session when it could influence future product direction but is not being implemented now. Do not leave ideas only in chat history. If the idea later becomes planned work, promote it into [specs/](./specs/) and link back to the original idea when useful.

## Ideas

### 2026-07-30 - 작성부터 제안·새 버전까지 하나로 이어지는 canonical 경로

**Idea:** 다음 UX 기획·개발이 `/flows/new`, 공개 Flow/Flow Map, My Flow, 원본 내용 알릴 점, 제작자 검토, 발행, 버전 업데이트 중 하나라도 건드리면 범위를 정하기 전에 이 항목을 반드시 다시 꺼낸다. 새 기능을 각각 만들기보다 안정적인 ID와 버전을 공유하는 `TextAuthoringDocument -> 발행 후보 -> 변경 불가능한 PublishedVersion -> UserFlowCopy -> ExecutionRun/내보내기 -> 범위가 제한된 ChangeProposal(J4) -> maintainer 검토와 새 PublishedVersion(J4.5) -> 기존 사용자 버전 검토(J5)` 경로로 연결한다. 현재 J5의 추가·변경·삭제 비교, 개인 수정 충돌 처리, 완료 이력 보존 UX는 재사용하고, 현재 J4의 전송 전 메모에는 근거 URL·확인 시각, 변경점 미리보기, 개인정보 제거, 실제 제출 상태, 검토 결과와 알림을 보완한다. 사용자 화면에서는 GitHub 용어를 그대로 노출하지 않는다.

**Current boundary:** 현재 main의 P35에는 J1~J3, 전송되지 않는 J4 메모 초안, 저장된 일부 FlowMap을 대상으로 하는 J5 버전 검토가 있다. Text Authoring은 별도 checkout의 로컬·미발행 구현이다. 따라서 전부 가설인 것도, 작성부터 업데이트까지 한 경로로 완성된 것도 아니다. 같은 시나리오로 끝까지 검증되지 않았고 이동 Flow도 작성 fixture 27개 항목과 production 24개 항목이 다르며, J5 E2E는 수학 FlowMap을 사용한다. 제작자 계정·서버 저장·제안 전송·검토 큐·실제 외부 Calendar/Todo 왕복도 아직 연결 근거가 없다.

**Why not now:** 이번 요청은 다음 작업에서 잊지 않도록 보존하는 백로그 등록이며 구현 승인이 아니다. 여러 checkout의 로컬 변경과 현재 main 계약을 한 번에 합치면 범위와 소유권이 불명확해진다. 먼저 하나의 실제 콘텐츠와 stable ID/version을 고정한 뒤 연결부 하나씩 검증해야 한다.

**Revisit when:** 위 화면이나 도메인을 다루는 UX 기획·개발 세션을 시작할 때, Text Authoring을 main 또는 발행 경로에 합치기 전, creator publishing·제안 검토 큐·계정 기반 저장·버전 업데이트 범위를 여는 시점에 재검토한다. 첫 승격 후보는 `(A) TextAuthoringDocument -> 발행 후보/immutable version -> 현재 공개·개인 복사·J5 계약` 또는 `(B) J4 제출 -> J4.5 maintainer 검토 -> 새 버전` 중 하나만 고르고, 스코프 문서에 이번에 연결하는 구간과 그대로 두는 구간을 함께 적는다. 콘텐츠 유형별 수정 경계는 이 연결부에 흩어 넣지 말고 이동·레시피·학습·공식/민감 콘텐츠를 아우르는 하나의 정책으로 확인한다.

**Source context:** 2026-07-30 전략 세션의 구현 대조와 사용자 요청. 상세 계약과 수치·서비스 근거는 [collaborative authoring/editability strategy spec](./specs/2026-07-29-collaborative-flow-authoring-editability-strategy-v1/spec.md) 및 [visual strategy report](./content-audit/2026-07-30-flowme-collaborative-authoring-visual-strategy-ceo-ko.html), 현재 J4·J5 근거는 [J4 unsent correction evidence](./content-audit/2026-07-11-claude-design-p22-01-completion-feedback-evidence/README.md)와 [J5 version review evidence](./content-audit/2026-07-11-claude-design-p22-06c-version-review-evidence/README.md)를 본다.

**Visual reference:** [FlowMe 경험 순환 사용자 저니](./content-audit/2026-08-04-flowme-experience-loop-user-journey-visual-ko.html)를 다음 전략·UX 세션에서 사용자에게 보이는 화면 기준안으로 다시 꺼낸다. `경험 작성 -> 경험 기반 Flow 선택 -> 내 상황에 맞춘 실행 -> 실행 중 수정 -> 선택적 개선 제안 -> 경험자 검토 -> 새 내용 공개 -> 다음 사용자의 시작`을 한 사례로 끝까지 연결하며, 가상 인물·반응·수치는 실제 이용 성과나 사용자 검증 근거로 사용하지 않는다.

### 2026-07-19 - Advanced planner interactions after the P25 workspace model

**Idea:** After P25 proves a coherent whole-Flow, Anytime, Calendar placement, personal adjustment, and export model, consider direct drag-and-drop scheduling, user-defined saved views, timezone controls, and one narrow external Calendar/Task integration. These may improve expert planning speed but must consume the same effective Flow projection and preserve source/personal/run ownership.

**Why not now:** The current product still needs to make basic undated work, whole-Flow inspection, progressive adjustment, recurrence parity, completion recovery, and export scope understandable. Adding full planner gestures, view builders, or direct sync now would hide rather than solve those problems and would pull FlowMe toward Notion/Calendar/Todo replacement behavior.

**Revisit when:** P25-08 reports internal Blocking/High zero, the owner explicitly reopens observation, and later evidence shows repeated demand for faster multi-item placement or one specific direct destination. Drag-and-drop must remain an accelerator, not the only accessible path.

**Source context:** 2026-07-19 owner/Codex/Claude P25 UX feedback reconciliation. See the [P25 foundation spec](./specs/2026-07-19-execution-workspace-foundation/spec.md).

### 2026-07-12 - 제작자 소유 원문을 실행 상품으로 바꾸는 양면 가치사슬

**Idea:** FlowMe의 초기 진입점을 사용자 혼자 URL을 변환하는 도구로만 보지 않고, 원문 권리를 가진 제작자가 자신의 글·영상·강의·가이드를 검토된 Flow로 만들어 원문에 `FlowMe로 실행하기` 링크를 붙이는 양면 구조로 본다. 사용자는 원문을 대체한 복제본이 아니라 출처·버전·제작자 표시가 유지되는 실행 동반물을 저장·개인화·내보내고, 제작자는 동의된 집계 범위에서 미리보기·시작·저장·내보내기·재방문·업데이트 수락 신호를 확인해 다음 버전을 고친다. 제작자 참여는 초기 콘텐츠 공급과 유통 단계부터 시작하되, 네이티브 결제·마켓플레이스·공개 랭킹은 검증 뒤로 둔다. 초기에는 `원문 권리자 = Flow 제작자`인 소수 파트너로 시작해 출처 권리와 수익 분배 문제를 단순화하고, 외부 결제·제휴·예약 링크의 기여 측정부터 수익 가능성을 본다.

**Why not now:** 현재 제작자 발행은 로컬 표시 수준이고 계정 기반 발행, 권리 계약, 집계 분석, 결제, 환불, 정산 기능이 없다. 또한 `.ics`·Markdown·체크리스트처럼 외부 도구로 자유롭게 내보낼수록 FlowMe가 실제 완료를 직접 관찰하기 어려워진다. 반대로 실행을 앱 안에 가두면 캘린더·할 일·노트 도구와 경쟁하고 사용자 휴대성을 훼손한다. 원문을 과도하게 요약·복제하면 제작자의 광고·제휴·구독 수익을 잠식할 수도 있으므로, 실행 동반물 범위와 원문 복귀·귀속 원칙이 먼저 필요하다.

**Revisit when:** 원문 권리를 가진 제작자 5~10명을 설계 파트너로 모집할 수 있을 때, 제작자 원문에서 Flow 미리보기로 들어오는 링크·임베드 실험을 설계할 때, 사용자 시작·저장·내보내기·재방문 사건을 계정과 동의 경계 안에서 측정할 수 있을 때, 또는 외부 결제·제휴 전환을 Flow 단위로 귀속할 수 있을 때 다시 본다. 첫 검증은 제작 시간, 제작자의 두 번째 Flow 발행, 원문 방문자 대비 Flow 시작, 시작 대비 저장·내보내기, 재방문, 제작자 수익 기여를 각각 분리해 측정한다.

**Source context:** 2026-07-12 전략 세션에서 사용자는 FlowMe가 사용자 측 콘텐츠-계획 전환뿐 아니라 제작자가 원본 콘텐츠를 더 잘 활용하고 추가 수익을 얻지 못하는 가치사슬의 약한 구간도 공략해야 한다고 제안했다. 공식 제품 비교에서는 YouTube·Patreon·Gumroad가 관심·구독·상품 판매를, Notion Marketplace가 템플릿 거래를, Teachable·Thinkific·Kajabi가 강의 안의 진도 분석을 지원하지만, 여러 원문을 사용자의 기존 실행 도구로 옮긴 뒤 제작자 업데이트와 연결하는 수평 구조는 별도 전략 공간으로 남는다는 가설을 도출했다. 상세 장표: [FlowMe 사용자·제작자 가치사슬 전략](./content-audit/2026-07-12-flowme-user-creator-value-chain-ceo-ko.html).

### 2026-07-12 - 여행 중심 초기 콘텐츠 유입 포트폴리오

**Idea:** 제품 구조는 여러 생활 영역에 공통으로 쓰되, 첫 공개 메시지는 날짜가 정해진 중요한 순간에 집중한다. 첫 콘텐츠군은 해외여행 짐 싸기, 공식 출국 순서, 원문 기반 2박 3일 일정으로 묶는다. 해외여행 짐 싸기는 같은 KKday 원문을 사용하는 기존 `travel-packing-list`를 기준본으로 삼아 신규 중복 ID를 만들지 않고 보강한다. 치앙마이 장기여행, 일본 eSIM, 기존 해외여행 D-14 계획은 이 기준본과 역할을 대조한 뒤 보강·대체·보류 상태를 정한다. 30일 사진 찍기·3일 반찬 만들기·면접 전날 준비·에어컨 필터 4주 청소는 반복, 원문 항목 묶기, 긴급성, 공식 주기를 확인하는 별도 내부 기준점으로 둔다.

**Why not now:** 이 안은 전략 추천이지 공개 카탈로그 승인안이 아니다. 현재 근거는 원문 항목, 내부 점수, 외부 템플릿 사용 행동까지이며 FlowMe의 실제 유입·저장·내보내기·완료·재사용 성과는 미측정이다. 현재 코드에도 실행 콘텐츠 153개 중 대표 유지 46개, 보강 필요 103개가 있어 신규 수급보다 중복·노출·출처 생애주기 정리가 먼저다. 제작자·상업 원문의 사용 권리와 최신성도 공개 전 관문으로 남아 있다.

**Revisit when:** CEO가 초기 콘텐츠 집중 방향을 승인하거나, 다음 콘텐츠 적용 세션에서 registry 묶음을 고르거나, 실제 사용자 관찰에서 다른 콘텐츠군의 저장·내보내기·재사용이 뚜렷하게 더 강하게 나타날 때 다시 본다.

**Source context:** 2026-07-12 전략 세션에서 초기 공략 기반으로 볼 콘텐츠를 여러 관점에서 정리해 달라는 요청. CEO 보고서: [FlowMe 초기 콘텐츠 공략 전략](./content-audit/2026-07-12-flowme-initial-content-entry-strategy-ceo-ko.html).

### 2026-07-12 - Direct URL-to-Flow ingress link

**Idea:** Let a user skip opening FlowMe and pasting a source manually by composing a FlowMe ingress URL with the source they want to turn into a Flow. The canonical form should be an encoded query such as `https://flowme.app/import?url=<encoded-source-url>` or an equivalent `/flows?url=...` contract, not a raw source URL appended to the path. Opening it should preserve the submitted URL, run the existing canonical hit/needs-review/miss lookup, and land directly on the same lightweight review, customization, export, or candidate-request surface used by `/flows`. The same contract could later power browser search keywords, bookmarks, share sheets, publisher buttons, and third-party links without creating separate conversion logic.

**Why not now:** The entry contract and abuse boundary are not settled. It must accept only supported `http`/`https` sources, encode nested URLs correctly, limit URL length, reject `javascript:`/`data:` and redirect abuse, avoid leaking sensitive query parameters through logs, analytics, referrers, or shared links, and preserve the current rule that a miss does not automatically crawl, call AI, publish, or become executable. It also needs an explicit UX decision on whether opening the link auto-runs lookup or first shows the detected source for confirmation.

**Revisit when:** Observed users repeatedly show friction in the current visit-then-paste flow, an external creator/publisher needs a `FlowMe로 바꾸기` link, a browser shortcut or share-target PoC is scoped, or URL-first acquisition is promoted beyond the current in-app entry. Start with one web deep-link contract before considering a browser extension or native share sheet.

**Source context:** User idea on 2026-07-12: combine the FlowMe URL with the source URL a user wants to transform so they can jump directly into conversion without first visiting the site and using the URL input.

### 2026-07-11 - Local source imports for hospital preparation and recurring contracts

**Idea:** Fill the next two remaining portfolio gaps with source import work rather than generated content. First, extract the image or downloadable rows from a Korean hospital or postpartum-care-center packing checklist so the strong 55-row foreign checklist can be replaced with locally applicable data. Second, find one Korean source that exposes actual renewal rows for utilities, insurance, subscriptions, leases, or other recurring household contracts instead of a generic money-management article.

**Why not now:** The current Korean hospital article keeps its core checklist inside images, and the foreign text checklist includes American insurance and cord-blood sales context. The recurring-contract search did not yet find one primary source with complete due-date rows across services, so creating a bundle now would require invented fields or user planning.

**Revisit when:** image/file extraction is available for the Korean hospital source, a hospital or public institution publishes a readable checklist, or a contract-management source exposes actual renewal date, notice window, cancellation, and document rows.

**Source context:** 2026-07-11 portfolio expansion Round 2. See [Round 2 review](./content-audit/2026-07-11-content-portfolio-expansion-round2-review-ko.md) and [candidate board](./content-audit/2026-07-11-content-portfolio-expansion-round2-board-ko.html).

### 2026-07-11 - Content expansion by life-area coverage portfolio

**Idea:** Keep the existing source-to-Flow gate and detailed category taxonomy, but add a portfolio layer that tracks `life area x planning pattern` coverage. Prioritize source-backed candidates that fill empty user jobs, starting with travel/outings, general meal planning, work/career, recurring administration, home maintenance, and staged exercise. Travel should be a Flow Map of separate source-owned child Flows such as packing, official departure procedure, destination entry setup, and a real day-by-day itinerary, rather than one blended complete-guide Flow.

**Why not now:** This review does not approve new catalog navigation, seed data, or broad app exposure. P22 still needs observed-user evidence, several candidate sources still need row extraction, and the proposed nine life-area labels have not been tested as user-facing browse categories.

**Revisit when:** Selecting the next 3-4 breadth canaries, extracting travel/meal/career source rows, redesigning `/flows` category discovery after the catalog grows, or deciding whether a proposed category is a visible shelf, search tag, or internal coverage dimension.

**Source context:** 2026-07-11 content-coverage review prompted by the gap between the earlier taxonomy/source scout and the current catalog, especially the absence of travel. See [content category coverage review](./content-audit/2026-07-11-flowme-content-category-coverage-review-ko.md) and [mobile review board](./content-audit/2026-07-11-flowme-content-category-coverage-board-ko.html).

**Prepared evidence:** Eight source-backed bundles are now staged before app implementation: five first-canary candidates for travel preparation, a Busan itinerary, weekday lunchboxes, interview D-1, and four-week air-conditioner filter care; plus second-wave license renewal, 5km training, and kitten first-week bundles. See the [pre-app normalized data](./content-audit/2026-07-11-content-portfolio-preapp-v1.json) and [full mobile review board](./content-audit/2026-07-11-content-portfolio-preapp-board-ko.html). This preparation does not approve app insertion or public exposure.

### 2026-07-09 - Post-P16 product direction review queue

**Idea:** Before continuing with more Claude Design polish cycles, run a scenario-based product-direction review around the current merged main. The review should separate first-time users, URL-first hit users, URL-first miss/candidate users, public `/f` share recipients, My Flow repeat users, Calendar-heavy users, and creator/studio explorers. The main open product questions are Calendar multi-Flow identity, My Flow today-action depth, public Flow-level versus Step-level save/export responsibility, URL-first item-level edit depth, URL-first miss-to-AI-draft flow, and whether Studio should remain a secondary surface until the execution hubs feel service-ready.

**Why not now:** These are product direction choices, not a single bug fix. Calendar color/grouping, My Flow inline execution, Flow-level versus Step-level export, and AI draft creation each affect user mental model and data/export shape. They should be reviewed with scenario evidence before implementation.

**Revisit when:** The P17 product-direction review package is generated and human/Claude Design review confirms the next priority. Expected first candidates are Calendar execution clarity and My Flow today-action depth, with Studio/creator held as a secondary surface unless review evidence says otherwise.

**Source context:** User feedback after P16 merge on 2026-07-09. Supporting planning artifacts: [FlowMe product direction feedback board](./content-audit/2026-07-09-flowme-product-direction-feedback-board-ko.html) and [intake plan](./content-audit/2026-07-09-flowme-product-direction-feedback-intake-plan-ko.md).

### 2026-07-09 - Canonical URL aliases for same-content URL variants

**Idea:** FLOW should eventually recognize cases where the same source content appears under slightly different URLs, such as tracking links, share links, tag/category query variants, mobile/desktop hosts, encoded paths, or publisher-specific aliases. The product should preserve the original submitted URL, but lookup should be able to group likely same-content URLs into a canonical source record with confidence, alias history, and a selected default Flow hit.

**Why not now:** The current URL-first production slice already strips obvious tracking parameters such as `utm_*`, `fbclid`, and `gclid`, and it keeps one default hit per canonical URL. Broadly stripping parameters like `tag`, `category`, `ref`, or publisher-specific query keys could incorrectly merge distinct content. This needs domain-aware rules, source title/body fingerprints, redirect resolution, alias confidence, and an operator review path before changing lookup behavior.

**Revisit when:** URL-first lookup sees repeated misses for URLs that differ only by non-content query params, manual registration QA starts flagging alias groups, source/version/trust ledger work begins, or account-backed candidate queues need server-side dedupe beyond exact canonical URL matching.

**Source context:** User asked on 2026-07-09 how to handle the same content when only the URL changes slightly, such as URLs whose trailing tag or query parameter differs.

### 2026-07-08 - Creator impact analytics for follower growth

**Idea:** A creator or Flow author could see how people who follow their Flow are progressing or growing over time. The useful view is not raw surveillance of individual users, but opt-in and aggregated impact signals such as completion patterns, repeated returns, common added Steps, self-reported gains, confidence changes, avoided mistakes, and where followers still get stuck.

**Why not now:** This needs account-backed usage records, consent boundaries, privacy-safe aggregation, event quality rules, creator/personal data separation, and careful wording so FLOW does not overclaim education, health, finance, emotional, or performance outcomes. It also depends on users first proving that they save, export, check, edit, and revisit Flows.

**Revisit when:** creator publishing becomes active, user-added Step suggestions create enough feedback loops, experience value data is designed, or FLOW has enough opt-in execution records to show creator impact without exposing private user journeys.

**Source context:** User idea on 2026-07-08: it would be valuable for someone who made or shared a Flow to understand how people following that Flow are growing.

### 2026-07-08 - User-suggested Step additions for forked or shared Flows

**Idea:** In planning-heavy categories such as travel, users often start from an existing plan and keep adding one missing checklist item or Step at a time. FLOW should let a user add those additions to a personal fork first, then optionally suggest the Step/Item back to the shared or original Flow. Thumbs-up, reuse, comments, source evidence, and creator/admin review can become promotion signals, but thumbs-up alone should not automatically change a canonical Flow.

**Why not now:** This depends on the URL-first reuse/fork model, thin edit UX, source/version/trust metadata, and moderation rules. Automatic promotion from likes alone could add unsafe, duplicated, source-less, or low-quality tasks to travel, health, finance, family, or legal-adjacent Flows.

**Revisit when:** designing edit/fork UX, community/creator loops, travel canary Flows, source/version/trust ledger, or a contribution review queue for user-added Steps and checklist Items.

**Source context:** User noted on 2026-07-08 while planning travel that real planning keeps evolving from an existing plan by adding useful checklist items or Steps, and suggested that forked or existing Flows should accept additions that can be promoted if they receive enough positive feedback.

### 2026-07-05 - Community and creator loop scoring for source research

**Idea:** Extend source research beyond demand and conversion fit by scoring whether a category can produce a user/community or creator growth loop. Candidate scoring should include `userCreationFit`, `forkRemixFit`, `discussionFit`, `creatorPromotionFit`, `communityLoopFit`, and `growthLoopType`, so FlowMe can distinguish utility/trust-anchor content from creator-promoted and community-remixed content.

**Why not now:** This is a research and prioritization lens, not an approved app implementation. Community editing, creator promotion surfaces, seed changes, and Flow/Step/Item data should wait until source/import rights, app-canary candidates, and the URL-first reuse/fork path are clearer.

**Revisit when:** running the next web-source community/creator loop validation pass, choosing the next 5-8 app canary contents, designing creator/share/fork UX, or deciding which categories should seed early user-generated Flow creation.

**Source context:** 2026-07-05 content expansion discussion after web source demand validation. The user emphasized that FlowMe needs categories where users are excited to make, revise, share, and discuss Flow content, and where creators have a reason to promote their Flow because it sends value back to the source.

### 2026-07-04 - Productivity-tool connectivity research backlog

**Idea:** Treat FLOW as an external-content-to-execution compiler before it becomes a full planner: URL canonical lookup and existing Flow reuse first, portable exports to calendar/todo/Markdown/sheets second, thin edit and source/version trust metadata around that loop, then My Flow continuation, AI fallback, memo-to-Flow, direct integrations, and automation connectors in later batches. Research board: [productivity connectivity priority research](./content-audit/2026-07-04-productivity-connectivity-priority-research-ko.md), with a readable HTML view at [productivity connectivity priority board](./content-audit/2026-07-04-productivity-connectivity-priority-research-ko.html).

**Why not now:** The research adds backlog candidates rather than approving implementation. Direct OAuth integrations, full auto-scheduling, creator marketplace, MCP/Zapier connectors, and memo-first planning should wait until URL lookup, portable export, source trust, and thin edit behavior prove repeated use.

**Revisit when:** a URL-first PoC is scoped, export destinations need to be ranked, direct integration work is proposed, or My Flow/memo-to-Flow is being reconsidered as the next retention loop after export-first evidence.

**Source context:** 2026-07-04 product discussion asked to re-check FLOW's major functions against external productivity-tool connectivity, current AI/calendar/note/automation trends, business importance, usability importance, and the user's stated preference to search/reuse first so AI cost stays low.

### 2026-07-02 - Flow usage entry backlog

**Idea:** Treat FLOW as a URL-first, multi-entry execution layer: users paste a source URL, reuse an existing Flow when the same URL was already converted, change options, edit/fork the Flow if it does not fit, continue execution in My Flow, export to existing tools, and later promote a personal draft or shared link into a broader Flow. Lightweight memo planning remains a second entry point for daily use. These entry points should converge into the same `Flow / Step / Item / Memo / Source / Export` model instead of becoming separate products. Detailed backlog: [Flow 활용 입구 백로그](./content-audit/2026-07-02-flow-usage-entry-backlog-ko.md), with a readable HTML board at [Flow 활용 입구 백로그 보드](./content-audit/2026-07-02-flow-usage-entry-backlog-ko.html).

**Why not now:** Stage 0 still needs to keep the current 4-tab IA and My Flow v2.1 baseline stable while proving representative source-backed content, export/check behavior, and honest trust signals. URL ingestion, duplicate-URL reuse, edit/fork UX, memo-to-Flow, sharing, versioning, and creator expansion should be sequenced as backlog items rather than implemented all at once.

**Revisit when:** a thin URL-first PoC is needed, representative content quality is strong enough for Home/Flow finding, users show repeated copy/export/check or saved-Flow return behavior, or a PoC is needed to compare URL conversion, duplicate URL reuse, edit/fork, and memo-based planning under one execution model.

**Source context:** 2026-07-02 product discussion: user clarified that external FlowMe links probably will not exist at first; a more realistic first loop is URL-to-Flow, reuse prior conversions for duplicate URLs, allow option changes or user edits, then let shared/comment links flow back toward the original content owner. The user also noted that easy editing UX matters because the current app is too fixed, and that lightweight memo-to-Flow remains important for daily use and spread.

### 2026-07-01 - Lightweight daily memo intake

**Idea:** Let users start from the lightweight daily memo behavior they already keep in a notes app: write and revise today's tasks in plain language, then let FLOW convert that memo into suggested times, missing checks, related Flows, reminders, and later experience records. The product should preserve the speed and low pressure of a scratchpad while adding tracking and guidance that a normal memo app cannot provide.

**Why not now:** Stage 0 still needs to avoid becoming a full daily planner or todo app before the content-to-action loop is proven. Daily memo intake also needs careful UX so FLOW does not make a light habit feel heavy with too many required fields, categories, or productivity judgments.

**Revisit when:** My Flow saved records become a stronger validation target, users repeatedly describe using external notes for daily planning, or a PoC needs a low-friction input path that does not depend on finding a source URL or creator-published Flow first.

**Source context:** User note on 2026-07-01: they currently organize daily tasks in a memo app because it is lightweight and easy to revise, but it does not track what was missed or suggest what to do, when to do it, or how it connects to FLOW's longer-term vision.

### 2026-06-29 - Experience value data and personal gain briefing

**Idea:** As FLOW collects experience data from plan content and real execution, it can also record what value each experience produced: knowledge gained, practical skill, emotional state, confidence, risk avoided, relationship progress, money/time saved, or other user-defined value. Over a day, week, project, or custom period, FLOW could summarize what the user gained, where they are strong or weak, what patterns keep repeating, and what next actions would produce the most useful growth.

**Why not now:** Current Stage 0 still needs to prove that users execute individual Flows, export/check artifacts, and leave reliable feedback. Value analysis also needs careful data design, privacy boundaries, self-assessment language, and evidence quality rules so the product does not overclaim psychological, educational, or performance insight from thin usage data.

**Revisit when:** FLOW has repeated saved Flow records, check/export events, user notes, reviews, or observed sessions across multiple days or experience categories, and users start asking what they learned, improved, avoided, or should do next.

**Source context:** User vision note on 2026-06-29: future FLOW should collect experience data from plan content and also capture what value the experience had, such as knowledge, experience, emotion, strengths, weaknesses, daily/periodic gains, and recommended next actions.

### 2026-06-06 - Living connected Flow experience map

**Idea:** Over time, individual Flows can connect to each other and form a living experience map. This should not be a static map of related checklists; it should accumulate real user execution, edits, reviews, corrections, creator updates, source notes, and branching follow-up Flows so the map keeps improving as people use it.

**Why not now:** Stage 0 still needs to prove that users open one Flow, enter an anchor, copy/export, check, and give feedback. Connecting Flows into a graph or map would add navigation, data-model, recommendation, and visualization complexity before single-Flow execution behavior is proven.

**Revisit when:** Users have multiple saved Flows, ask to connect one Flow's result to another, leave meaningful corrections/reviews after execution, or creator/source clusters make it useful to show next/related Flows without implying validation or fake social proof.

**Source context:** User idea thread on 2026-06-06: later, Flows can connect with each other into a large experience map, but the map should be alive through user use, edits, and reviews.

### 2026-06-04 - Confluence-style creator page

**Idea:** Explore a Confluence-style creator page for FLOW creators: a structured knowledge/workspace page that can organize a creator's Flows, source notes, update history, and shareable execution assets without feeling like a social profile feed.

**Why not now:** Creator pages are not the current Stage 0 validation path, and a Confluence-like surface could pull FLOW toward a broad workspace before copy/export/check behavior and creator publishing needs are proven.

**Revisit when:** Creator publishing becomes an active batch, users need a clearer home for multiple related Flows, or creator/source maintenance needs page-level organization beyond a simple profile and Flow list.

**Source context:** User idea thread on 2026-06-03/2026-06-04 asking whether the creator page could use a Confluence style.

### 2026-06-02 - Obsidian-like plan and checklist workspace

**Idea:** Let users manage their own plans and checklists inside FLOW with a familiar note/workspace feel, similar to Obsidian, and share selected plans or checklist views with others. The long-term version could support personal execution records, linked plans, lightweight editing, and shareable public/private artifacts without forcing every user into an external calendar or sheet.

**Why not now:** Stage 0 is still focused on proving the smaller export-first loop: open, anchor input, copy/export, check, and feedback. Building a full native workspace too early would make FLOW compete with note, task, and database tools before users have shown that they want to keep execution records inside FLOW.

**Revisit when:** Users repeatedly export/check Flows and ask to continue editing, organizing, or sharing the same execution record inside FLOW, or when My Flow saved-record usage becomes a core validation target after the first export-first evidence.

**Source context:** User idea thread on 2026-06-02: FLOW should eventually let users manage plans or checklists like Obsidian and share them.

### 2026-05-31 - FlowMe 실행 콘텐츠 카테고리 taxonomy

**Idea:** FlowMe 카테고리는 넓은 콘텐츠 주제가 아니라 사용자가 실제로 수행하려는 실행 영역 기준으로 묶는다. 초안 문서: [FlowMe 카테고리 taxonomy](./content-audit/2026-05-31-flowme-category-taxonomy.md).

**Why not now:** 이 문서는 탐색, seed 선정, IA를 위한 기획 taxonomy다. 강한 카테고리가 검증되기 전부터 큰 내비게이션 구조로 바로 확장하면 안 된다.

**Revisit when:** 다음 seed Flow 배치를 고르거나, 둘러보기/카테고리 내비게이션을 다시 설계하거나, 크리에이터 채널의 우선 발행 영역을 정할 때.

**Source context:** 사용자가 FlowMe의 원래 컨셉인 "따라 할 콘텐츠를 잘 메모하고 계획대로 실행하게 돕는 것"을 기준으로 저축, 육아, 여행, 반려동물/식물, 식단, 가전 관리 등 가능한 카테고리를 많이 정리해 문서화하자고 요청했다. 원 콘텐츠와 Flow 변환 결과를 함께 보는 검증 형식: [온라인 콘텐츠 검증 형식](./content-audit/2026-05-31-online-content-validation-format.md).

### 2026-05-28 - My Flow adaptive execution hub

**Idea:** Treat `My Flow` as an execution hub that adapts to saved Flow count and context, rather than one fixed set of repeated detailed cards. `Flow별` should help users scan active Flows and decide the next action; detailed management should appear after selecting a specific Flow. Durable spec: [My Flow Execution Hub](./specs/2026-05-28-my-flow-execution-hub/spec.md).

**Why not now:** The current batch is focused on correcting the immediate `My Flow` layout and demo UX. A full adaptive hub needs product decisions for empty state, single-Flow mode, compact multi-Flow rows, search/filter behavior, category grouping, and state priority without overbuilding before real repeated-use evidence.

**Revisit when:** Saved Flow management becomes the next product batch, or when test/demo scenarios cover 0, 1, 2-5, 6-20, and 20+ saved Flows.

**Source context:** My Flow UX review conversation on 2026-05-28. Important deferred decisions: 0 saved Flows should show start guidance; 1 Flow should behave like a single execution screen; 2-5 Flows can use compact operating cards; 6+ Flows need search, filters, and sorting; 20+ Flows need category/status grouping and collapsible sections. State priority should lead category: today, overdue, in progress, completed, stale, broken routine, and date-less checklist. Category colors should stay restrained, using chips or left borders rather than full-card color fills. Repeated destructive actions like delete should not appear on every all-Flow list card.

### 2026-05-21 - Separate idea memory from roadmap

**Idea:** Keep a dedicated `docs/IDEAS.md` file so agents can preserve good but unapplied ideas and important conversation context without bloating `docs/ROADMAP.md`.

**Why not now:** This is a process/documentation improvement rather than product behavior.

**Revisit when:** If ideas accumulate enough that they need prioritization, promote selected entries into `docs/ROADMAP.md` or a formal spec.

**Source context:** User asked whether the harness stores good ideas and unapplied conversation content; recommendation was to add `docs/IDEAS.md` first.

### 2026-05-21 - URL to executable experience plan

**Idea:** Let users paste a URL and have FLOW extract the useful experience from the page, then turn it into an executable checklist, schedule, or route. This can make the first strong use case "I found a useful article/video/post; make it actionable for me" instead of asking users to browse a platform.

**Why not now:** Stage 0 still needs to prove the simpler copy/export/check loop with curated seed flows. URL ingestion also introduces extraction reliability, copyright/source attribution, safety wording, and AI cost/latency questions.

**Revisit when:** Users show demand for turning external content into plans, or when curated flows produce enough copy/export/check behavior to justify testing an ingestion feature.

**Source context:** Product brainstorming conversation on 2026-05-21. User noted that if users paste a URL, they could experience the "turn experience into my checklist" function directly.

### 2026-05-21 - Cache repeated URL ingestion results

**Idea:** If multiple users submit the same URL, FLOW should avoid sending it through the LLM again and instead load the previously extracted/structured result, possibly with version metadata and a refresh option.

**Why not now:** This depends on the URL ingestion feature existing and requires decisions about canonical URL normalization, stale content refresh, source attribution, user-private edits, and whether cached results are shared globally or scoped by workspace/user.

**Revisit when:** URL ingestion moves from idea to prototype, especially before any paid LLM extraction path is exposed to users.

**Source context:** Product brainstorming conversation on 2026-05-21. User suggested that duplicate URLs should fetch stored results instead of re-running LLM processing.

### 2026-05-21 - Show active execution count per flow

**Idea:** Show how many users are currently or recently performing a flow so visitors can see live execution momentum, not just static content. This could appear as "12 people are following this route this week" or a recent footprint signal near the flow header.

**Why not now:** Stage 0 does not yet have reliable real usage data, and fake social proof would violate the product rule against calling things validated before evidence exists. It also requires defining what counts as "currently performing": copied, checked an item, exported, returned within N days, or created a personal copy.

**Revisit when:** FLOW has event logging or user plan copies with enough real activity to compute honest active-use signals.

**Source context:** Product brainstorming conversation on 2026-05-21. User suggested showing how many users are currently performing a flow.

### 2026-05-21 - Show similar-flow activity for cold start

**Idea:** When a specific flow has little or no activity, show aggregated execution signals from similar flows, such as "42 people are following related moving routes this month." Similarity can start with category, tags, structure type, and anchor type before introducing embeddings or behavioral similarity.

**Why not now:** This needs enough flows and event data to avoid misleading users. The UI must clearly distinguish exact flow activity from related-flow activity so it does not imply the current flow itself is proven.

**Revisit when:** There are multiple flows per category or tag, and active execution counts are available for at least one related cluster.

**Source context:** Product brainstorming conversation on 2026-05-21. User noted that early individual flows may have low usage, so showing activity from similar flows could provide useful trust context.

### 2026-05-21 - QR entry point for books and offline guides

**Idea:** Add QR codes to books, printed guides, PDFs, workshops, or offline materials so readers can jump from "read and follow this" instructions into an executable FLOW checklist or schedule. This makes FLOW the action layer attached to long-form expertise.

**Why not now:** It requires publisher/creator distribution or at least a printable/shareable flow link, and the current MVP still needs to validate basic copy/export/check behavior before pursuing external distribution channels.

**Revisit when:** FLOW has stable public flow URLs and at least one creator/publisher-style use case where readers are asked to follow multi-step instructions.

**Source context:** Product brainstorming conversation on 2026-05-21. User noted that many books tell readers to follow steps, and adding a QR code could bring those steps into FLOW.

### 2026-05-21 - Flow asset marketplace and exchange standards

**Idea:** Let FLOW content, derived data, templates, execution improvements, or related assets become tradeable with cash, credits, or tokens. This could support creators, curators, translators, validators, or users who improve flows.

**Why not now:** Trade requires standardizing what is being exchanged: the flow template, source extraction, localized version, execution evidence, improvement patch, dataset, or creator service. It also introduces quality control, IP rights, revenue sharing, refunds, fraud, tax/accounting, and token/regulatory risk. Early tokenization would conflict with the current "do not build before validation" rule.

**Revisit when:** FLOW has repeated evidence that users copy/export/check flows and creators want to publish or maintain flows. Before payments or tokens, define asset types, ownership, versioning, quality signals, and revenue splits.

**Source context:** Product brainstorming conversation on 2026-05-21. User wants FLOW-derived content/data/add-ons to be exchangeable with coins or cash but sees standardization as difficult.

### 2026-05-23 - Export-first now, native execution records later

**Idea:** Position FLOW first as an action compiler that turns outside content into a user's existing calendar, checklist, spreadsheet, or memo. Keep the long-term product direction open for users to save, continue, and record execution inside FLOW once export-first behavior proves repeat value.

**Why not now:** Pushing native record keeping too early would make FLOW look like a Notion, calendar, or task-app replacement before the simpler conversion loop is validated. It would also add screen complexity during Stage 0, when the product still needs to prove that users can open a Flow, add an anchor, export, check, and return.

**Revisit when:** Users repeatedly export, check, or modify Flows and ask to continue the same execution record inside FLOW instead of moving everything to external tools.

**Source context:** Product direction conversation on 2026-05-23. User clarified that the initial goal is moving content into existing tools, while the later goal is to let FLOW become the place where execution records accumulate.

### 2026-06-17 - Creator experience map above small Flow units

**Idea:** Add an experience-map layer above small Flow units so creators can define a larger journey, such as certification, school entry, moving, or career transition, and attach executable child Flows to each stage. Users should be able to save the whole map, save only a stage, or save an individual child Flow.

**Why not now:** The small Source-to-Flow conversion work has only shown that individual calendar/checklist/routine/bucket artifacts can be shaped. It has not yet proven that FLOW looks like a creator platform or experience-map service. Marketplace, payments, community, and automatic multi-URL generation would still be premature.

**Revisit when:** The next PoC needs to test whether FLOW can feel like a platform for creators, not only a collection of standalone Flow samples. A good first test is a certification-acquisition experience map with stages, date-based child Flows, repeated study routines, checklists, and source URLs.

**Source context:** 2026-06-17 platform-structure study comparing roadmap, course, creator-product, template-marketplace, project-template, docs, and route/list platforms. See `docs/content-audit/2026-06-17-experience-map-platform-structure-study-ko.html`.

### 2026-06-17 - Flow Pack as Flow of Flows

**Idea:** Treat Flow Pack as a flow of flows, not a flat bundle. A creator can publish a parent Flow such as a running routine collection, middle-school math curriculum, baby vaccination checklist, or baby meal-plan sequence. Under that parent Flow, sections and child Flows can represent levels, grades, units, vaccines, months, weeks, or specific routines. Each child Flow still produces executable calendar, sheet, checklist, memo, or routine artifacts.

**Why not now:** This needs a focused PoC that shows both the user-facing parent/child save experience and the creator-facing assembly experience. It should not jump directly into a marketplace, payments, community, or large roadmap UI.

**Revisit when:** The next UX/UI PoC moves beyond individual source-to-Flow samples. Good candidates are a running creator's routine collection, a study YouTuber's middle-school math curriculum with grade/unit child Flows, a baby vaccination checklist with vaccine-specific child Flows, and a baby meal-plan sequence with 6-month/12-month child Flows.

**Source context:** User clarified that Flow Pack means "flow of flows." The earlier flat-pack example was not the intended model. Corrected structure: creator channel -> parent Flow -> section/subgroup -> child Flow -> execution item. See `docs/content-audit/2026-06-17-flow-of-flows-structure-ko.html`.

### 2026-06-28 - Honest review and usage signals for Flow selection

**Idea:** Add real review, saved-count, active-use, or creator-maintenance signals to Flow and Flow Map cards so users can decide why a Flow is worth saving. Candidate signals include saved users, recent check/export activity, creator update date, short user review snippets, and source freshness.

**Why not now:** Current Stage 0 surfaces do not have reliable user behavior or review data. Adding fake counts or generic testimonials would make the service look more polished but would violate the evidence boundary. Until data exists, cards should use only source-backed signals such as generated artifact, input count, Step preview, source link, and update date.

**Revisit when:** event logging, saved Flow records, feedback forms, or observed sessions produce enough real signals to show on public cards without implying validation.

**Source context:** 2026-06-28 mobile feedback said representative cards show contents but lack detailed Items, reviews, and signs of real use, making selection harder.
