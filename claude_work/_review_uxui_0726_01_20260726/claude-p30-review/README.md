# FlowMe P30 Independent Design Review — claude_design

**판정:** `bounded_revision` (keep_p30 아키텍처 · structural_reopen 없음) · 확신도 4/5
**reviewerRole:** claude_design (시각·interaction·wireframe)
**production:** <https://flowme2605.vercel.app> · merge `b3c8500` (PR #148) · closeout `4c5bbb34` (PR #149) · deploy `5557201045`
**검토일:** 2026-07-23 · **실제 관찰 사용자:** 0명 · **앱 코드 수정:** false

## 한 문단 결론

P30은 P29 독립 검토가 남긴 모바일 correctness gap(export ↔ fixed layer 교차, /my·/calendar 초점 순서)과 밀도 Medium(save-before 행별 수정, My Flow secondary peer)을 **production에서 실제로 닫았고**, source/personal/run/occurrence/export 계약과 4탭 IA·public /f를 유지했다(계약 회귀 0). 따라서 아키텍처는 **keep**이다. 남은 것은 새 결함이 아니라 (a) P30이 명시적으로 미룬 `/f`(artifact-first)↔`/flow-maps`(legacy outline-first) **진입 문법 이원화**(H-1), (b) 대량·키보드 **발견성** Medium 3, (c) fixture로만 검증된 scale의 **관찰 공백**이다. 모두 composition/초점/표기 계층의 **bounded revision**이며 구조 재개봉이 아니다.

## 가장 중요한 단절 (top discontinuity)

같은 이사 콘텐츠가 진입 링크에 따라 **다른 첫 화면·다른 동사·다른 조정 모델**로 보인다. `/f`는 실제 결과를 먼저 보이고 primary가 `날짜 없이 시작`인 반면, `/flow-maps`는 번호 목록(1~5)을 먼저 보이고 `그대로 시작 / 내게 맞게 조정`이다. P30-07이 dead conditional은 제거했으나 `/flow-maps`는 active consumer라 legacy를 명시 보존했다 — 알려진 미결이지만, 사용자는 그 경계를 몰라 provenance·신뢰 사슬의 첫 접점이 흔들린다.

## Findings

- Blocking 0 · High 2 · Medium 8 · Low 3 — 검토 finding(H-1, M-1~M-4, L-1~3) + **소유자 production 모바일 walkthrough 보강**(H-2 shape 비일관, M-5 홈 IA, M-6 찾기 카드, M-7 My Flow 밀도, M-8 캘린더 상세 sheet, M-9 조작 어휘·어포던스 비일관, M-10 Flow 삭제 발견성)
- 상세: [audit.md](./audit.md) · 구조화: [route-evidence.json](./route-evidence.json)

## 24-cell persona scorecard

8 personas × 3 sessions. supported 3 · fixture 3 · partial 7 · not_tested 9 · blocked 2(gated) · missing 0. 여정을 막는(blocked-by-defect) cell은 0. [persona-journey-scorecard.json](./persona-journey-scorecard.json) · 세션 전환: [journey-discontinuity-matrix.json](./journey-discontinuity-matrix.json)

## 가장 약한 가치 사슬 3

1. **source 신뢰·provenance·correction** (가장 약함) — 진입별 원문 표기 상이(H-1) + correction 전송 gated
2. **재방문·재사용 이유** — 기능은 코드에 존재, 이유는 observed 0으로 미증명
3. **scale 발견성(20~60 Flow)** — 동명 합성 fixture로만 검증, varied-name 스캔 미관측

전문: [service-platform-assessment.md](./service-platform-assessment.md)

## P31 후보 (최대 5)

- P31-1 진입 문법 수렴(H-1) · P31-6 shape 공통 save-before 뼈대(H-2) · P31-2 저장 결정·동사(M-1·L-1) · P31-7 My Flow 한 초점(M-7) · P31-3 Calendar 키보드(M-3) · P31-4 월간 cell 색·개수(M-2·M-4) · P31-8 캘린더 상세 sheet(M-8) · P31-9 조작 사전+삭제 노출(M-9·M-10)
- 권장 top-5: P31-1 · P31-6 · P31-2 · P31-7 · P31-3
- P31-5(보류) source correction loop — gated, 관찰(Q7)로 수요 먼저 확인
- 전문: [p31-candidates.md](./p31-candidates.md)

## 근거와 한계

- `current_source`(P30 package 8종 + STATUS/ROADMAP/PRODUCT_PRINCIPLES) · `current_package_screenshot`(production smoke 13 + 구현 17) · `current_production_interaction`(focus trace) · `heuristic_simulation`
- 라이브 hydration 클릭·세션 reload persistence는 `inaccessible` → 실행 결과 **not_tested**로 분리
- package E2E/smoke 수치는 **인용**이며 재실행이 아니고, 구조·계약 증거이지 사용성 증거가 아니다

## 파일

1. [review.html](../FlowMe%20UX%20재검토%20P30%20production%20독립검토%20(claude_design%20·%20P31%20후보).dc.html) — persona journey · 현재/제안 · service/platform 평가
2. [audit.md](./audit.md) — severity findings
3. [persona-journey-scorecard.json](./persona-journey-scorecard.json) — 24 cells
4. [journey-discontinuity-matrix.json](./journey-discontinuity-matrix.json) — 세션 전환 단절·recovery
5. [route-evidence.json](./route-evidence.json) — route·viewport·marker·수치
6. [service-platform-assessment.md](./service-platform-assessment.md) — 10축 종합 + 약한 사슬 3
7. [p31-candidates.md](./p31-candidates.md) — 문제·dependency·non-goal·rollback·acceptance·marker
8. screenshots — production smoke 13 + 구현 17 (프로젝트 루트 `p30-production-*.png`, `p30-0*-*.png`)
