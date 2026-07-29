# FlowMe 워크스페이스 통합 handoff

- 기준일: 2026-07-29
- 통합 branch: `codex/workspace-consolidation-20260729`
- 통합 기준: `origin/main` `2c95163`
- 상태: 통합·상태 동기화·검증 진행 중
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
| Research/planning consolidation | `archive/research-planning-consolidation-20260729` | `deccdd3` | 확정된 연구 package만 선별 통합 |
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

- production 기준선: P34
- 단일 제품 후보: P35
- P35 내부 판정: `publish_ready_for_internal_review`
- P35 자동 근거: focused unit `13 / 13`, all unit `694 / 694`,
  P35 Playwright `79 / 79`, full Playwright `405 / 405`, build/docs/diff green
- Text authoring: design complete, implementation not started
- Projection/full-corpus/benchmark/playbook: research evidence, runtime delivery 아님
- observed-user evidence: `0`
- external Calendar/VTODO round-trip: 미실행

## 남은 closeout

- [ ] 통합 branch docs, unit, build, targeted browser 검증
- [ ] concurrent research work를 별도 commit으로 원격 보존
- [ ] PR 생성, CI 확인, merge
- [ ] 실제 deployment 상태 확인
- [ ] `flow-mvp`를 최신 clean `main`으로 복구
- [ ] 최종 worktree와 root cache/source 분류 확인
- [ ] `STATUS.md`, `ROADMAP.md`, spec index, HTML 보드를 최종 publish truth로 갱신

자동화, screenshot, preview, deployment 성공은 관찰 사용자 검증으로 기록하지 않는다.
