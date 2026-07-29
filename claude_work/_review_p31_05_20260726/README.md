# FlowMe Cross-entry Canonical Flow — 독립 검토 패키지

이 프로젝트에는 두 개의 검토가 있다.

| 검토 | 대상 | 판정 | 읽을 파일 |
|---|---|---|---|
| **③ 실행 CRUD · 목표 UX 검토** (2026-07-25, 최신) | 일정·Todo·체크리스트·진행 관리 UX와 CRUD 완성도 @ `8c54992` | **`bounded_crud_revision`** · finding 12 (high 3) · 목표 관리 **A안** | `docs/content-audit/2026-07-25-p34-00-execution-crud-goal-ux-review-claude-design/` → `review.dc.html` · `current-proposed-wireframes.dc.html` · `audit.md` · JSON 3종 · `p34-backlog.md` |
| ② P33 Draft PR 검토 (2026-07-25) | PR #156 · `codex/p33-integrated-program-plan` @ `b4ba62e` | **`bounded_fix_before_publish`** · finding 11 (high 2) | `P33 PR Review.dc.html` → `p33-pr-review.md` → `p33-pr-findings.json` · `p33-pr-persona-matrix.json` · `evidence-p33/` |
| ① P33 제안 검토 (2026-07-24) | production P32 release | `bounded_cross_entry_alignment` → 대안 B | `review.dc.html` → `audit.md` → `decision-matrix.json` · `p33-recommendation.md` |

**③ 요약** — CRUD 98셀 중 supported 60 · **blocked 0**. 기능 부재가 아니라 **파괴적 조작과 반복 조작의 위치·이름**이 문제다: ① 열린 Flow에 삭제 계열 명령이 없음(목록 카드 메뉴에만), ② `이 기기에서 영구 삭제`가 docs에만 있고 E2E marker 0 · lifecycle 모듈 삭제 API 없음, ③ 반복은 완료만 회차 단위이고 `이번 회차만 수정`은 0건, ④ 빼기·삭제·제외·보류가 4어휘. 목표 관리는 **A(별도 Goal 객체 없음)** 추천 — 진행률·단계·재사용으로 이미 구현됨, C는 적용 금지. P33 Preview는 Vercel 인증 벽으로 `inaccessible`, `AppClient.tsx`(512KB+)는 열람 한도 밖. 앱 코드 변경 없음 · observed-user 0.

**② 요약** — alias 4개 → canonical 상세 1개, 저장 identity·receipt·My Flow·Calendar·export의 24개 정합, 기존 key 삭제 0·자동 병합 0·복구 가능·malformed 안전 낙하는 확인됨. 남은 것은 **URL 진입만 legacy 5개 세대의 미리보기·파일을 내보내는 문제(F1)**와 **사본 선택에 '따로 유지'가 없어 복구 시 결정이 반복 요구되는 문제(F2)**. publish 전 수정 4건(F1·F2·F4·F5), 이후 가능 6건. candidate preview는 Vercel 로그인 벽 뒤라 라이브 실측은 `inaccessible`이며 `AppClient.tsx`(512KB+)는 열람 한도 밖이다. 앱 코드 변경 없음 · merge 없음 · observed-user 0.

---

## ① P33 제안 검토 (2026-07-24, 보존)

**REVIEWER_ROLE** `claude_design` · **reviewedAt** 2026-07-24 KST
**production** https://flowme2605.vercel.app · **originMainSha** `e491d99` · **productionReleaseSha** `30281a7`
**overall verdict** `bounded_cross_entry_alignment` → **추천 대안 B** · **가설 6/6 재현** · **앱 코드 변경 없음** · **observed-user count 0**

FlowMe의 Home · Flow 찾기 · URL lookup · public 상세 · 저장 receipt · My Flow · Calendar가 같은 콘텐츠를 **하나의 사용자 Flow**로 이어주는지 독립 검토했다. 자동 simulation·screenshot·heuristic은 실제 사용자 검증이 아니며, 실제 관찰 사용자는 0명이다.

## 한 줄 결론

같은 AJD 이사 원문이 진입점에 따라 **24개 / 5개**, 별도 제목, 별도 저장 객체로 갈라진다. 이는 새 방향이 필요한 게 아니라 **이미 P26에서 확정된 "모든 표면 = 하나의 Flow object" 계약이 아직 구현되지 않은 격차**다. → 계약 재오픈이 아닌 **bounded alignment**(대안 B).

## 산출물

| 파일 | 내용 |
|---|---|
| `README.md` | 이 문서 |
| `audit.md` | 6 가설 재판정 + 추가 발견 + 24-cell 요약 + reference + integrity |
| `review.dc.html` | **인터랙티브 검토 문서** — current(실제 화면) ↔ 제안 wireframe(390/1024), A/B/C, reference, rollout. 결과-형태 토글은 실제 동작 데모 |
| `persona-journey-scorecard.json` | 8 personas × 3 sessions = **24 cells** (계약 필드 전체) |
| `cross-entry-invariant-matrix.json` | 7 invariant + moving source의 진입점별 current/proposed 15 필드 매트릭스 |
| `decision-matrix.json` | 판정 · A/B/C 점수 · P33 후보(계약 필드) · acceptance marker · observed-user 질문 |
| `p33-recommendation.md` | P33-00~05 프로그램(각 stage flag/rollback/acceptance) |
| `evidence-current/` | current production 화면 8장 (390px, cross-entry audit handoff 캡처) |
| `screenshots/` | 제안 B wireframe 캡처(review.dc.html에서) |
| `archive-p31/` | 이전 P31 My Flow 검토 패키지 (보존) |

## 6 가설 재판정 (요약)

| # | 가설 | 판정 |
|---|---|---|
| 1 | 같은 AJD 원문이 4 route(Home 24/Find 5/URL 5)로 분기 | **confirmed** (reframe: route 수가 아니라 route별 content 상이가 결함) |
| 2 | 두 entry 저장 시 My Flow 중복 객체 2개 | **confirmed** |
| 3 | Find catalog 9개 = legacy 5 + artifact-first 4 | **confirmed** |
| 4 | moving/vehicle artifact 버튼 죽음, wedding/workout 작동 | **confirmed** (reframe: category가 아니라 change-handler gate = false affordance) |
| 5 | Home 차량 generic checklist 약속 ≠ D-14 Calendar target | **confirmed** |
| 6 | undated workout My Flow에 raw RRULE 노출 | **confirmed** (경미 · display adapter 누락, 계산은 정상) |

추가 발견: Home vehicle 예시가 Find에서 재발견 불가(검색 0건, server fallback↔hydrated inventory 불일치).

## 24-cell 결과

supported **6** · partial **10** · missing **8** · hidden/blocked 0. wedding(positive control)·workout·단일객체 downstream은 초록, moving·vehicle·URL·duplicate의 **진입점 간 identity 연속성**은 붉은색. 상세는 `persona-journey-scorecard.json`.

## 읽는 순서

1. `review.dc.html` (시각 비교 — current↔제안, A/B/C)
2. `audit.md` (판정 근거)
3. `decision-matrix.json` / `p33-recommendation.md` (실행 계획)
4. `cross-entry-invariant-matrix.json` · `persona-journey-scorecard.json` (근거 데이터)

## 유지할 계약 (변경 금지)

source / personal overlay / execution run / occurrence / export identity · **P32 focused My Flow workspace** · Calendar engine · **4탭 IA** · public `/f` shell · 기존 localStorage schema.

## 한계

current 화면(8)·source·decision·reference는 신뢰 근거이나, 이 검토에서 **라이브 브라우저 조작·console·스크린리더·1024/1440 overflow 실측은 inaccessible**로 표기했다. 가짜 사용량·리뷰·평점 없음. 어떤 stage도 observed-user 게이트 통과 전엔 "검증됨"으로 표기하지 않는다.
