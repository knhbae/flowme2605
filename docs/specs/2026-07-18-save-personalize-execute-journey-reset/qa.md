# Save, Personalize, Execute Journey Reset QA

## Evidence Lanes

| Lane | Meaning |
| --- | --- |
| `current_browser` | 현재 production에서 직접 확인한 화면과 행동 |
| `current_repo` | 현재 worktree의 코드·문서 계약 |
| `prior_artifact` | 기존 시뮬레이션 또는 Claude 목업 |
| `official_reference` | 인접 서비스의 공식 도움말에 기록된 패턴 |
| `owner_review` | owner가 실제 화면 또는 wireframe을 따라가며 내린 제품 판단 |
| `independent_agent_review` | 별도 Codex/Claude가 current 화면을 재현해 기록한 heuristic·correctness 판정 |
| `observed_user` | production에서 실제 목적을 수행한 사용자 관찰 |

`prior_artifact`, 자동화, owner review, independent agent review, simulated persona는 `observed_user`로 집계하지 않는다. P24-J0~J5에서는 외부 사용자 관찰을 요청하지 않는다.

## P24-J0 Required Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Current production inventory | Captured | review package screenshots |
| Existing simulation comparison | Reviewed | 11-stage simulation crosswalk |
| Official reference pattern review | Reviewed | `reference-patterns.md` |
| App runtime code unchanged | Passed | scoped status contains documentation and evidence paths only |
| `npm.cmd run docs:check` | Passed | 14 required files, 2,384 local links |
| `npm.cmd test` | Passed | 518 / 518 |
| `npm.cmd run build` | Passed | Next.js 15.5.20, 18 static/dynamic route entries generated |
| `git diff --check` | Passed | no whitespace errors after normalization |

## Internal Review Questions

1. 설명을 읽지 않고 무엇이 저장되는지 말할 수 있는가?
2. `그대로 저장`과 `조정하고 저장`의 차이를 예측하는가?
3. 저장 직후 전체 Flow가 보였다고 느끼는가?
4. 오늘 실행과 Calendar의 역할을 구분하는가?
5. 날짜 없는 일을 어디서 일정에 넣을지 찾는가?
6. 출처와 주의 정보가 필요할 때 찾을 수 있는가?

## Stop Conditions

- 사용자가 저장되는 항목 수나 구조를 잘못 예측한다.
- 조정이 원본을 바꾸는 것으로 이해된다.
- 저장 직후 전체 결과를 찾지 못한다.
- Today와 Calendar를 같은 목록의 다른 필터로 이해한다.
- held 콘텐츠를 정상 실행 콘텐츠로 선택한다.
- 모바일에서 primary action이 긴 설명 아래로 밀린다.

## Implementation Regression Matrix

| Area | Must remain true |
| --- | --- |
| Completion | 완료와 완료 취소가 같은 Item identity를 유지한다. |
| Personal edits | 제목·날짜·메모·구조 변경이 source를 덮어쓰지 않는다. |
| Calendar | dated item만 grid/agenda에 나타나고 undated item은 보존된다. |
| Export | whole/selected/current 범위와 destination이 예측 가능하다. |
| Public | pre-save preview와 post-save completion 경계가 유지된다. |
| Routine | one occurrence, one completion control이 유지된다. |
| Accessibility | 완료·열기·수정·저장·조정 행동의 이름이 구분된다. |

## Final implementation checks

| Check | Current result | Evidence kind |
| --- | --- | --- |
| Unit | `518 / 518` | `current_command` |
| Production build | Passed, 18 route entries | `current_command` |
| Full Flow E2E | `194 / 194` before the final held-path hardening | `current_command` |
| Final journey-frame E2E | `6 / 6` after held-path hardening | `current_command` |
| P24/public/workbench affected accounting | `58 / 58`; one stale selector corrected and rerun | `current_command` |
| Mobile/wide overflow | `0 / 0` at 390x844 and 1024x768 | `current_browser` |
| Console errors | `0` | `current_browser` |
| Independent review | Blocking `0`, High `0` | `independent_agent_review` |
| Production deploy | `dpl_HSZz4qJM2MUqqoA9H4Xn5RtmoCx5` READY, merge `616025bf` | `deployment_record` |
| Production browser | moving `5` rows, vehicle `10` rows, mobile/wide overflow and console errors `0` | `current_browser` |
| Observed users | `0 / 15`, not scheduled | `observed_user` |

The full Flow E2E result predates one narrowly scoped legacy `savedFlow` held-eligibility hardening. The changed path is covered by the final `6 / 6` journey-frame E2E. This distinction prevents a bounded prior command from being presented as a later full-suite run.

## Review Notes

- Product constraint review: bounded journey reset; 4탭과 schema 유지.
- Source/risk review: 세부 출처·주의는 삭제하지 않고 접힌 정보로 유지.
- Browser review: selected artifact-first, optional-adjustment, first-save whole-Flow frame is implemented and captured at 390px and 1024px.
- Residual risk: owner feedback and independent reviews can guide implementation but are not structured observed-user evidence.
- Observation gate: external recruitment is explicitly deferred after P24-J5 and remains closed until the owner separately reopens P24-00B.
