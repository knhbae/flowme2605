# P27 /goal prompts (copy-paste)

Guardrails for every prompt: do not add long explanatory copy, do not rewrite stable identity/projection/completion/export data contracts, do not add a 5th primary tab, do not promote Studio to the primary app, do not turn FlowMe into a heavy planner. Keep source/personal/run/occurrence/export ownership intact. Automation is not user observation.

## P27-01
/goal Make /my server-render the canonical 4-tab shell (홈/Flow 찾기/캘린더/내 Flow) and the My Flow room (지금/Flow 목록/완료), not the Creator Studio shell. Move studio chrome to /u/my-flow-studio and /creators. Assert myRouteSsrNavItemCount==4, studioShellOnMy==0, and server/client hydration parity. Shell/route layer only; no data-contract change.

## P27-02
/goal Server-render the first N Flow cards on /flows using the same card component Home already uses, replacing the "Flow를 불러오는 중입니다." Suspense-only body. Assert flowsRouteSsrCardCount>=1 and non-empty SEO body. Do not rewrite search/filter logic.

## P27-03
/goal Establish one global primary-nav contract: 4-tab everywhere; demote studio/Flow Lab/compare routes to secondary+noindex or exclude them from production. Assert primaryNavContractCount==1 and devRoutePublicCount==0.

## P27-04
/goal Collapse the save-before decision to one sticky start/adjust surface. Remove the mid-body duplicate save/adjust block and the pre-save output entry; align or remove the "바로 시작" verb so save vs run isn't ambiguous. Assert saveDecisionSurfaceCount==1, verbCollisionCount==0.

## P27-05
/goal Resolve the moving content's two routes (/flow-maps/moving-d30 and /f/source-backed-moving-d30) to one canonical Flow URL; 301 the others while preserving ?savedFlow/?savedMap query. Add an additive URL alias map only. Assert oneContentRouteCount==1 and zero deep-link regressions.

## P27-06
/goal Rewrite the Calendar empty state to teach the placement PATH ("내 Flow에서 할 일을 고르고 '날짜 정하기'를 누르면 여기 나타납니다") with a link to /my, remove the subtitle-repeat text, and unify '콘텐츠' to 'Flow'. Assert calendarEmptyStateDistinct==true.

## P27-07
/goal Compress the save-before body: fold each step's memo + source link under one disclosure per step and dedupe the repeated source URL. Do not delete source content. Reduce the text-block count and per-step inline source links to <=1.

## P27-08 / 09 / 10 / 11 (prototype-first)
/goal Build A/B comparison prototypes (no production change) for: mobile batch editor density (P27-08), wide undated-rail long titles (P27-09), mobile Calendar length (P27-10), recurring occurrence detail hierarchy (P27-11). Record a density/hierarchy decision per screen; defer the build to post-observation if needed.

## P27-12
/goal Add an SSR / no-JS smoke harness that asserts the SERVER DOCUMENT (not post-hydration screenshots): /my nav item count ==4, /flows card count >=1, save-before decision surface ==1. This closes the gate gap that let F-01/F-02 ship. Run it against 01/02 to prove them.

## P27-13
/goal Re-gate the six content-shape journeys over the unified shell and canonical routes, including dual-timezone and multi-Flow states. Keep automated Blocking/High at 0; record observed users as the true value (0).

## P27-14
/goal Produce the P27 final review package: 01~07 markers green, three SSR indicators asserted (/my 4-tab, /flows cards>=1, save surface==1), six-journey re-gate pass, prototype decisions recorded for 08~11, evidence boundaries preserved, observed users 0.
