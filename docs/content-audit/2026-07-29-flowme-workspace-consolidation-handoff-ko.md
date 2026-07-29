# FlowMe 워크스페이스 통합 handoff

- 기준일: 2026-07-29
- 통합 branch: `codex/workspace-consolidation-20260729`
- 통합 기준: `origin/main` `2c95163`
- 통합 결과: [PR #161](https://github.com/knhbae/flowme2605/pull/161) / merge `4a51b08ce9c5410f4ddf492562a5e885b0fda09c`
- 상태: P35 통합·CI·production 배포 완료, `flow-mvp`를 최신 clean `main`으로 복구 완료
- observed-user evidence: `0`

## 목적

분산된 구현, 설계, 연구, 독립 리뷰를 먼저 분류하고 원격에 보존한 뒤,
현재 제품에 필요한 변경만 `main` 후보로 통합한다. 작업 디렉터리를 줄이는 것보다
사용자 변경과 검토 근거를 잃지 않는 것이 우선이다.

## 보존한 작업

| 묶음 | 원격 branch | 보존 commit | 통합 판단 |
| --- | --- | --- | --- |
| P35 MECE UX reset 구현 | `codex/p35-mece-ux-reset` | `c880fbd` | 제품 후보로 통합 |
| Text authoring UX handoff | `codex/text-authoring-ux-design-handoff-20260728` | `4c8aeea`, `dc8d1c2` | 설계·prototype 근거로 통합 |
| Research/planning consolidation | `archive/research-planning-consolidation-20260729` | `deccdd3`, `70820e5`, `a8d977b` | 확정된 package만 선별 통합; 최종 semantic review·browser QA는 원격 archive 전용으로 유지 |
| P30 planning handoff | `archive/p30-planning-handoff-20260723` | `fbfb5c7` | 원격 archive 유지 |
| P30 independent review | `archive/p30-independent-review-20260723` | `387c87c` | 원격 archive 유지 |
| P31 independent review | `archive/p31-independent-review-20260724` | `c600ee2` | 원격 archive 유지 |
| P33 independent review | `archive/p33-independent-review-20260724` | `e7a8540` | 원격 archive 유지 |
| P34 Claude Design review | `archive/p34-claude-design-review-20260725` | `26a7be2` | 원격 archive 유지 |
| URL-to-Flow prompt research | `archive/url-to-flow-prompt-lab-research-20260729` | `aa0aa98` | 원격 archive 유지, production backend는 `hold` |
| 기존 main worktree 미커밋 자료 | `archive/flow-current-main-uncommitted-20260729` | `cb4a79d` | 중복 문서는 archive 유지 |

## 통합한 범위

1. P35 구현과 R13 내부 검증 근거
2. Text authoring UX v1 및 v1.1 design handoff
3. Adaptive lean agent harness
4. Creator supply/adoption evidence
5. Canonical projection, pacing, event corpus lab
6. Vertical execution-service benchmark
7. Research-to-product playbook
8. Full-corpus UI validation snapshot과 export hardening

## 의도적으로 통합하지 않은 범위

- 원시 Claude Design 입력 dump
- P30/P31/P33/P34 독립 리뷰의 중복 snapshot
- `flow-ux-subtract` 실험 skill
  - 제거 목표를 숫자로 선결하고 실패한 UI assertion 삭제를 기본으로 두어,
    현재 회귀 보호와 위험 기반 closeout 규칙보다 강하게 작동한다.
  - 원격 archive에는 보존했지만 canonical skill로 승격하지 않는다.
- URL-to-Flow 연구 branch의 오래된 `STATUS.md`, `DECISIONS.md`
  - 실험 결과는 보존하되 현재 product state를 과거 기준으로 되돌리지 않는다.
- root `.tmp`의 원시 review 자료
  - cache와 source evidence를 구분하기 전 일괄 삭제하지 않는다.

## 현재 제품 상태

- production 기준선: P35 / merge `4a51b08`
- 전역 진입: 상태 기반 `/` router와 `Flow 찾기 / 캘린더 / 내 Flow` 3개 primary destination
- 다음 구현 gate: 없음; owner의 production keep / bounded fix / block 결정 대기
- P35 자동 근거: focused unit `13 / 13`, all unit `694 / 694`,
  P35 Playwright `79 / 79`, full Playwright `405 / 405`, build/docs/diff green
- GitHub CI: Docs/Unit/Build 성공, Playwright E2E 성공
- Vercel production: 성공, <https://flowme2605.vercel.app>
- production smoke: PR #162 closeout에 390px/1024px 6개 시나리오와
  overflow/console/page error `0`으로 기록됐으나 원시 artifact 경로는 연결되지 않음
- Text authoring: design complete, implementation not started
- Projection/full-corpus/benchmark/playbook: research evidence, runtime delivery 아님
- Full-corpus archive QA: validator `61 / 61`, targeted tests `14 / 14`, desktop/tablet/mobile browser QA `PASS`; decision은 `DRAFT_PENDING_USER_REVIEW`
- observed-user evidence: `0`
- external Calendar/VTODO round-trip: 미실행

## 정리 결과

- 초기 worktree `24`개 중 비활성 `23`개를 merge, upstream,
  byte identity, 또는 remote archive 확인 후 제거했다.
- `.tmp/npm-cache-clean`, `.tmp/npm-tmp`, `.tmp/ms-playwright`,
  `.tmp/flowme-p24-next`에서 약 `501.7 MiB`의 명확한 cache/build output을 제거했다.
- 원시 Claude review, quarantine, 현재 연구 import 데이터는 보존했다.
  production smoke는 closeout 수치만 기록됐고 원시 artifact 경로는 열거되지 않았다.
- `flow-ux-subtract`는 archive에는 남겼지만 canonical skill로 승격하지 않았다.

## Closeout

- [x] 통합 branch docs, unit, build, targeted browser 검증
- [x] concurrent research WIP와 최종 browser-QA evidence를 `a8d977b`까지 원격 보존
- [x] PR 생성, CI 확인, merge
- [x] 실제 deployment 상태 확인
- [x] `flow-mvp`를 최신 clean `main`으로 복구
- [x] root cache/source 분류 확인
- [x] `STATUS.md`, `ROADMAP.md`, `SERVICE_STRUCTURE.md`, `HISTORY.md`, spec index, HTML 보드를 publish truth로 갱신

자동화, screenshot, preview, deployment 성공은 관찰 사용자 검증으로 기록하지 않는다.
