# FlowMe P26 Production — Independent Review (audit.md)

- reviewCycle: P26 → P27
- production: https://flowme2605.vercel.app (0a33dd8)
- evidence: independent SSR fetch of 5 routes on 2026-07-21 KST (`/`, `/flows`, `/my`, `/calendar`, `/flow-maps/moving-d30`) + current source cross-read + P26 release package + heuristic
- observed users: 0/15 (unchanged). Automation and persona simulation are NOT user observation.
- method note: P26 production smoke captures screenshots AFTER hydration, so it structurally cannot see server-document-layer shell/card defects. This review reads the server document itself.

## Overall verdict
P26's structural-correction program is real: discovery card grammar, save-before whole-Flow preview, 4-tab IA, Calendar date-first shell all render in the server document as the P26 spec intended; reversible completion, scope-first export, canonical projection are supported by P26 automated evidence (repo_evidence). BUT the server document for the two most important personal/discovery routes contradicts the P26 contracts. Blocking 0 · High 3 · Medium 7 · Low 2.

## Findings

### F-01 · HIGH · /my server document renders the 5-tab Creator Studio shell, not the 4-tab My Flow app
- route: /my · viewport: 390 + 1024
- repro: anonymous GET /my → nav = 탐색·제작자·내 Flow·Flow Lab·만들기 (5 items); body = "Creator Studio / 제작자 스튜디오 / 내 Flow 스튜디오 / 아직 내 Flow가 없습니다"; links to /creators, /flow-lab, /u/my-flow-studio
- expected: 4-tab shell (홈/Flow 찾기/캘린더/내 Flow) + My Flow 지금/Flow 목록/완료 (P26-08; SERVICE_STRUCTURE.md: studio is a secondary surface OUTSIDE the 4-tab IA)
- actual: studio shell + 5-item nav
- user impact: identity flip on first paint / no-JS / shared-link preview for the primary personal tab; violates evaluation Q12 (identity consistent per screen) and the "no 5th tab / do not promote Studio" P26 non-goals at the shell layer. Post-hydration smoke masks it.
- evidenceKind: production_ssr_fetch + current_source (app/my/page.tsx 280B thin; components/flow/AppClient.tsx studio branch)
- fix: /my SSR renders the canonical 4-tab shell + My Flow empty/populated state; studio chrome only at /u/my-flow-studio and /creators
- marker: myRouteSsrNavItemCount==4 · studioShellOnMy==0 · hydration parity
- reproduce-needed: live-browser hydration flash duration (static fetch cannot time the swap)

### F-02 · HIGH · /flows (primary discovery tab) has no SSR content — only "Flow를 불러오는 중입니다."
- route: /flows · viewport: 390 + 1024
- repro: anonymous GET /flows → entire body is the string "Flow를 불러오는 중입니다."; app/flows/page.tsx wraps a client component in a Suspense fallback (thin shell, 291B)
- expected: the same server-rendered card grammar Home uses (Home SSRs 2 cards fully)
- actual: catalog renders zero cards server-side; first-visitors on a slow line, bots, and SEO see only the loading string
- user impact: catalog blank first paint; the discovery tab is content-empty to search indexing; inconsistent with Home; directly weakens journey F (first visitor) discovery step
- evidenceKind: production_ssr_fetch + current_source
- fix: SSR at least the first N catalog cards via the shared card component Home already uses
- marker: flowsRouteSsrCardCount>=1

### F-03 · HIGH · Save-before decision surface is duplicated + one content = two routes
- route: /flow-maps/moving-d30 · viewport: 390 + 1024
- repro: SSR body save-family CTAs: top card [그대로 저장][조정하고 저장] → mid block [조정][그대로 저장] → detail section [바로 시작] (→ /f/source-backed-moving-d30). 그대로 저장 ×2 + 조정-family ×2 + 바로 시작 ×1
- expected: one primary CTA per screen; one start/adjust decision over the same artifact (P26-00C); one user-facing Flow object
- actual: >=2 save decision surfaces + the same moving content exists at both /flow-maps/moving-d30 and /f/source-backed-moving-d30 with different save grammar
- user impact: save-unit prediction confusion; violates "one Flow object" at the route layer; "바로 시작" and "그대로 저장" are different verbs placed adjacently (see F-12)
- evidenceKind: production_ssr_fetch + heuristic
- fix: collapse to one sticky start/adjust surface; remove mid-body duplicate and pre-save output entry; resolve the two routes to one canonical Flow URL (301 the rest, preserving query)
- marker: saveDecisionSurfaceCount==1 · oneContentRouteCount==1

### F-04 · MEDIUM · Calendar empty-state body repeats the page subtitle verbatim
- route: /calendar
- repro: subtitle "언제 할지 정해진 항목을 날짜별로 확인합니다." reappears verbatim as the empty-state body under "날짜가 있는 콘텐츠를 먼저 고르세요"
- expected: empty state teaches the placement PATH (pick items in My Flow → 날짜 정하기)
- actual: copy-as-filler; also says "콘텐츠" where the app term is "Flow"
- evidenceKind: production_ssr_fetch
- fix: distinct empty-state string + link "내 Flow에서 날짜 정하기" → /my; unify vocabulary to Flow
- marker: calendarEmptyStateDistinct==true

### F-05 · MEDIUM · Two global navs coexist in production
- routes: 4-tab on / , /calendar, /flow-maps/*; 5-tab studio nav on /my, /creators, /flow-lab
- expected: one primary nav contract; studio/lab are secondary (SERVICE_STRUCTURE.md)
- actual: same product ships two primary navigations; also repo tree shows dev/compare routes (/ia-compare, /flow-lab/p22-observation, /content-flows) present in the app router
- evidenceKind: production_ssr_fetch + repo_tree (public reachability of dev routes NOT confirmed this turn)
- fix: 4-tab as the only primary nav; studio/lab/compare routes secondary+noindex or excluded from production
- marker: primaryNavContractCount==1 · devRoutePublicCount==0

### F-06 · MEDIUM · Mobile batch editor concentrates selection/move/date/delete in one vertical mode (P26-carried)
- evidenceKind: repo_evidence (P26-19/final-review declared) + heuristic
- fix: prototype-first (left list / right action bar); confirm density preference before build
- marker: batchEditorPrototypeDecisionRecorded

### F-07 · MEDIUM · Long titles truncate in the wide undated rail (P26-carried)
- evidenceKind: repo_evidence + heuristic
- fix: prototype 2-line / tooltip / immediate detail
- marker: undatedRailTitlePrototypeDecisionRecorded

### F-08 · MEDIUM · Mobile Calendar tray + grid produces a long page (P26-carried; overflow 0)
- evidenceKind: repo_evidence + heuristic
- fix: prototype collapsed tray / anchored jump
- marker: mobileCalendarLengthPrototypeDecisionRecorded

### F-09 · MEDIUM · Recurring occurrence detail exposes state + memo + export at once (P26-carried)
- evidenceKind: repo_evidence + heuristic
- fix: prototype now-action-first / records collapsed
- marker: occurrenceDetailPrototypeDecisionRecorded

### F-10 · MEDIUM · Save-before body length — per-step memo + source link inline-repeat
- route: /flow-maps/moving-d30
- repro: 5 steps each with 체크3(collapsed) + memo + "이 단계 원문 보기", accumulating in one scroll
- evidenceKind: production_ssr_fetch
- fix: fold step memo+source under one disclosure per step
- marker: saveBeforeTextBlockCount reduced

### F-11 · LOW · Same source URL repeats as a per-step link (이 단계 원문 보기 ×4, gov.kr ×1)
- route: /flow-maps/moving-d30 · evidenceKind: production_ssr_fetch → folded into P27-07

### F-12 · LOW · "바로 시작" vs "그대로 저장" verb collision (save vs run meaning) → folded into P27-04

## Keep (verified in server document / supported by P26 evidence)
- Home discovery card grammar (SSR)
- Save-before whole-Flow preview (SSR)
- 4-tab IA on Home/Calendar/save-before
- scope→count→format→receipt export (P26-16); reversible completion (P26-12); series/occurrence split (P26-03); canonical projection identity (P26-05)

## Data-contract impact
Every P27 item is display / shell / route / copy layer. None rewrites the P26 identity/projection/completion/export data contracts. P27-05 needs only an additive URL alias map (not a schema change).
