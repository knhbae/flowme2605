# P27 Backlog (P27-01 ~ P27-14)

Severity: Blocking 0 · High (01·02·03·04·05) · Medium (06·07·08·09·10·11) · process/final (12·13·14)
All items are display/shell/route/copy layer. No P26 identity/projection/completion/export data contract is rewritten.

## STAGE 1 · SHELL / SSR 정합 (High)
### P27-01 /my canonical 4-tab shell SSR — F-01
- 목표: server document for /my renders the 4-tab shell + My Flow (지금/Flow 목록/완료), not the studio shell
- 범위: /my route render + shared nav/layout; move studio chrome to /u/my-flow-studio, /creators
- 비범위: deleting studio functionality; changing personal data model
- 완료: myRouteSsrNavItemCount==4; studioShellOnMy==0; hydration parity (no server/client markup mismatch)
- evidence marker: ssr:/my nav==4, studioShellOnMy==0
- 데이터 계약: none

### P27-02 /flows SSR cards — F-02
- 목표: server-render first N catalog cards using the Home card component
- 범위: app/flows/page.tsx Suspense->SSR; reuse card component
- 비범위: rewriting search/filter logic
- 완료: flowsRouteSsrCardCount>=1; SEO body present
- 데이터 계약: none (catalog uses existing data); parallel with 01

### P27-03 single global nav contract — F-05
- 목표: 4-tab as the only primary nav; studio/lab/compare routes secondary+noindex or excluded from production
- 완료: primaryNavContractCount==1; devRoutePublicCount==0
- 데이터 계약: none; after 01·02

## STAGE 2 · 저장 / ROUTE 통일 (High)
### P27-04 single save decision surface — F-03, F-12
- 목표: one sticky start/adjust surface; remove mid-body duplicate + pre-save output entry; align/remove "바로 시작" verb
- 완료: saveDecisionSurfaceCount==1; verbCollisionCount==0
- 데이터 계약: none

### P27-05 canonical Flow URL — F-03
- 목표: resolve /flow-maps/moving-d30 <-> /f/source-backed-moving-d30 to one canonical URL; 301 the rest, preserving ?savedFlow/?savedMap query
- 선행: additive URL alias map (not a schema change)
- 완료: oneContentRouteCount==1; deep-link regression 0

## STAGE 3 · 빈 상태 / 언어 (Medium; parallel with Stage 2)
### P27-06 Calendar empty-state + role language — F-04
- 목표: remove subtitle repeat; teach the placement PATH + link "내 Flow에서 날짜 정하기"; unify 콘텐츠->Flow
- 완료: calendarEmptyStateDistinct==true

### P27-07 save-before body compression — F-10, F-11
- 목표: fold step memo+source under one disclosure per step; dedupe repeated source link
- 비범위: deleting source content
- 완료: per-step inline source link <=1; text-block count reduced

## STAGE 4 · 밀도 PROTOTYPE (Medium; prototype-first)
### P27-08 mobile batch editor density — F-06 (prototype A/B before build)
### P27-09 wide undated rail long title — F-07 (prototype)
### P27-10 mobile Calendar length — F-08 (prototype)
### P27-11 recurring occurrence detail hierarchy — F-09 (prototype)
- 각 항목 완료: prototype decision recorded; build may wait for observation

## STAGE 5 · 검증 / 프로세스 / FINAL
### P27-12 SSR / no-JS smoke harness (process-defect fix; parallel from start)
- 목표: assert the SERVER DOCUMENT itself (not post-hydration): /my nav==4, /flows cards>=1, save surface==1. This closes the gap that let F-01/F-02 ship.
### P27-13 six-journey re-gate over unified shell/routes (+ dual TZ, multi-Flow)
### P27-14 P27 final review — close per §10 conditions; carry to P28; keep observed 0

## Dependency
Sequential: 01 -> 03 -> (04->05) -> 13 -> 14
Parallel: 02 (with 01), 06·07 (with Stage 2), 08~11 (after prototype gate, mutually parallel), 12 (from start)
Standing up P27-12 first lets 01/02 be proven by that harness immediately.
