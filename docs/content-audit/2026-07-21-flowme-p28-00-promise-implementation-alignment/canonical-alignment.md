# P28-00 정본 요구사항 정합성

정본: `docs/content-audit/2026-07-21-p28-00-promise-delivery-reconciliation/prompt-ko.md`  
정본 main commit: `46e567ec09c5eba37ac703529b3d3eccc75e0dde`  
application source commit: `45b1f424a9e73a188750eb22691a756b86153231`  
누락 요구사항: `0`

## 정합성 판정 규칙

- 정본 prompt는 검토 요구사항의 source of truth다.
- current production interaction이 제품 동작의 최우선 근거다.
- 정본 package의 prior HTML과 screenshot은 `prior_design_artifact`다.
- P27 사용자 피드백 종합은 requirement provenance이며 current truth가 아니다.
- 자동화·heuristic·agent review는 실제 사용자 관찰이 아니다.

## 입력 자료 checklist

| 정본 입력 | 상태 | 사용 근거 |
| --- | --- | --- |
| production | complete | `production-journey-results.json`, current screenshots |
| GitHub main | complete | clean worktree `origin/main` `46e567e` |
| STATUS / ROADMAP / DECISIONS | complete | current source baseline review |
| P27 final package | complete | P27 완료 범위와 test counts 대조 |
| P27 production closeout | complete | production screenshot/evidence 경계 대조 |
| P27 사용자 피드백 종합 | complete | 과거 요구사항과 current P27 해소 여부 reconciliation |
| P27 reconciliation spec | complete | lifecycle·overlay·occurrence·export 계약 대조 |
| AppClient / ArtifactWorkbench | complete | current source capability matrix |
| `tests/e2e/p27-foundation.spec.ts` | complete | 정확한 canonical 경로 사용 |
| P28 handoff package | complete | prompt, summary, manifest, screenshots 확인 |
| prior artifact | complete | local/canonical SHA-256 일치 |
| Claude Design `(10).zip` | complete | 최신 관련 P26→P27 문서와 legacy root review 분리 |

## Prior artifact provenance

| 항목 | 값 |
| --- | --- |
| canonical path | `docs/content-audit/2026-07-21-p28-00-promise-delivery-reconciliation/prior-artifacts/flow-content-usage-preview-ko.html` |
| original path | `docs/content-audit/2026-07-19-flow-content-usage-preview-ko.html` |
| classification | `prior_design_artifact` |
| byte length | `77523` |
| SHA-256 | `7D608B993342AEF5F570AA7C967E3DF46A7BC1083BB3BCCA8C631473E451A6C0` |
| case count | `5` |
| destination count | `4` |
| observed users | `0` |
| local/canonical match | `true` |

## 15개 핵심 질문 coverage

| 번호 | 질문 | 산출물 evidence | 상태 |
| ---: | --- | --- | --- |
| 1 | 저장 전 전체 Flow | `promise-matrix.json` PR-01, audit H-01 | complete |
| 2 | 무엇이 저장되는지 예측 | PR-02 | complete |
| 3 | 제목·항목·날짜·순서·포함 조정 | PR-03 | complete |
| 4 | content-native 결과 우선 | PR-04 | complete |
| 5 | 4개 artifact 실데이터 비교 | PR-05 | complete |
| 6 | 의미 없는 결과 숨김 | PR-06 | complete |
| 7 | receipt/My Flow 문법 | PR-07 | complete |
| 8 | My Flow 탐색·전체 구조 | PR-08 | complete |
| 9 | recurrence period/series/occurrence | PR-09 | complete |
| 10 | Flow·Item 삭제·복구 | PR-10 | complete |
| 11 | confirmation/action/resource 구분 | PR-11 | complete |
| 12 | Calendar Flow filter | PR-12 | complete |
| 13 | same-date grouping | PR-13 | complete |
| 14 | whole/selected/item export | PR-14 | complete |
| 15 | 기존 도구 대비 저장 전 조정 | PR-15 | complete |

## 다섯 콘텐츠 simulation coverage

각 사례의 `입력/발견 -> 최소 입력 -> 전체 Flow -> primary -> secondary -> 조정 -> 저장/export -> receipt -> 재열기 -> 완료/수정/복구/재사용` 10단계를 `journey-step-matrix.json`에 기록했다.

| 사례 | 단계 | current 상태 | 권장 primary |
| --- | ---: | --- | --- |
| 이사 준비 | 10 | partial | Calendar |
| K-MOOC 14주 | 10 | blocked | Sheet/progress |
| 농작업 폭염 | 10 | blocked | safety guidance |
| 리모델링 계약 | 10 | blocked | comparison Sheet |
| 부모님 여행 | 10 | partial | Checklist에서 Calendar로 전환 |

각 단계에는 visible information, user decision, primary action, redundant copy, depth, block, current support, required change가 모두 있다.

## A/B/C coverage

`ux-alternative-comparison.json`에서 cold-start, 확장성, 모바일 밀도, 조정, destination 오해, source trust, 구현 복잡도, P27 호환성, 유지비를 비교했다. 권장안은 `C. Hybrid`이며 `/flows` empty의 작은 예시 뒤 실제 Flow에서는 `B. Artifact-first`로 전환한다. 전역 5개 Gallery를 영구 IA로 만들지 않는다.

## Codex 역할 coverage

| 요구 | 산출물 | 상태 |
| --- | --- | --- |
| 5개 사례 표현 계약 | `source-capability-matrix.json`, audit B-01 | complete |
| primary/secondary eligibility | audit H-02, P28-02 | complete |
| save-before whole projection | audit H-01, P28-01 | complete |
| pre/post save overlay reuse | source capability matrix | complete |
| identity boundaries | audit 데이터·회귀 section | complete |
| archive/restore | PR-10, P28-04 | complete |
| resource/subcheck | PR-11, P28-02 | complete |
| series/occurrence | PR-09, P28-05 | complete |
| Flow filter | PR-12, P28-05 | complete |
| export scope | PR-14, P28-05 | complete |
| P27 component reuse | P28-01/03 scope | complete |
| migration 필요성 | audit와 source capability matrix | complete |
| regression risk | audit risk table, 각 backlog acceptance | complete |

## EvidenceKind coverage

허용된 값만 사용한다.

- `current_production_interaction`
- `current_package_screenshot`
- `current_source`
- `prior_design_artifact`
- `reference_pattern`
- `heuristic_simulation`
- `inaccessible`

정본 reconciliation 이후 P27 E2E 경로는 accessible이므로 해당 항목에 `inaccessible`을 사용하지 않는다. 정본 prompt와 P27 synthesis는 입력 provenance로 표기하며 제품 동작 evidenceKind를 대신하지 않는다.

## 최종 결과 순서 coverage

| 정본 요구 순서 | 위치 | 상태 |
| ---: | --- | --- |
| 1. 전체 판정 | `audit.md` §1, `review.html` 첫 화면 | complete |
| 2. 약속 matrix | `promise-matrix.json`, review promise section | complete |
| 3. P27 완료 범위 | `audit.md` §4 | complete |
| 4. partial/missing | `audit.md` §5 | complete |
| 5. 다섯 journey | `audit.md` §6, two journey JSON files | complete |
| 6. A/B/C | `audit.md` §7, alternative JSON | complete |
| 7. 권장 UX | `audit.md` §8, interactive HTML | complete |
| 8. mobile/wide wireframe | `audit.md` §8, review proposed section | complete |
| 9. 데이터·migration·회귀 | `audit.md` §9, source matrix | complete |
| 10. P28 backlog | `p28-backlog.md` P28-01~07 | complete |
| 11. 관찰 전 gate | `audit.md` §11 | complete |
| 12. 사용자 질문 | `audit.md` §12 | complete |

## P28 backlog field coverage

P28-01~07 각각에 사용자 문제, route, 범위, 비범위, 데이터 영향, dependency, 390/1024 acceptance, 접근성, unit/E2E, screenshot marker, 완료 기준이 있다. 필수 순서는 `P28-01 -> P28-02 -> P28-03 -> P28-05 -> P28-07`이며 P28-04와 P28-06의 병렬 조건을 명시했다.

## 금지 범위 확인

- 앱 코드 수정: 없음
- migration 실행: 없음
- AI API/crawler: 없음
- 계정·DB·cloud sync: 없음
- OAuth: 없음
- 4탭 IA 변경: 없음
- Studio 5번째 탭: 없음
- heavy planner 전환: 없음
- P27 완료 선언 무비판 인용: 없음
- 자동화를 observed-user validation으로 표현: 없음

## 최종 정합 판정

`canonical_requirement_missing_count = 0` (`canonical-alignment-results.json`: `67 / 67`)

기존 판정 `structural_correction_required`, 권장 구조 `Hybrid`, P28-01~07 순서는 정본 추가 입력과 충돌하지 않는다. 첫 개발 slice는 [p28-development-handoff.md](./p28-development-handoff.md)의 P28-01이다.
