# FlowMe P35-R13 최종 내부 게이트

> 이 문서는 P35 publish 전 R13 내부 게이트의 역사적 snapshot이다. 이후 release
> 상태와 literal `/my`·`/my?experiment=off` 비-fixture 보강은
> [P35 release hardening](../2026-07-29-p35-release-hardening/README.md)을 따른다.

- 실행일: 2026-07-29
- 작업 branch: `codex/p35-mece-ux-reset`
- 기준 HEAD / `origin/main`: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- 사용자 승인안: `B안 + A안의 날짜별 묶음 + 낮은 행 명령 밀도 + 첫 진입만 전체 계획 펼침`
- observed-user count: `0`
- storage/schema migration: 없음
- commit, push, PR, merge, deploy: 이번 범위 밖

## 판정

`publish_ready_for_internal_review`

사용자 승인안의 화면 계약, R13 전용 테스트, P35 전체 테스트, unit, docs, build,
전체 E2E가 모두 통과했다. 이 판정은 내부 검토 준비 완료이며 실제 사용자 검증이나
production 배포 완료를 뜻하지 않는다.

## 채택한 화면 계약

1. 평소 `/my` 첫 화면은 여러 Flow의 실행 항목을 모은 `할 일`이다.
2. 기존 저장 Flow 탐색과 상세 workspace는 인접한 `Flow` 보기로 유지한다.
3. 실행 항목은 정확한 날짜 단위 rail로 묶는다.
4. 기본 행은 행 전체 열기와 오른쪽 완료 checkbox만 보인다.
5. 수정, 메모, export, 구조 관리는 Flow 상세의 문맥 명령으로 남긴다.
6. public 저장 직후 첫 진입에서만 모바일 전체 계획을 자동으로 펼친다.
7. reload, 목록 복귀, 재진입에서는 전체 계획을 접어 실행 우선 화면을 유지한다.
8. `experiment=off`는 publish 전 rollback 경계로 유지한다.

## 구현 결과

- `P35-R13-B-INTERNAL-TODO`
  - B안을 My Flow 기본 실행 화면으로 채택했다.
- `P35-R13-DATE-GROUPED-LOW-COMMAND-ROW`
  - A안의 날짜별 rail과 낮은 명령 밀도의 행 문법을 적용했다.
- `P35-R13-FIRST-ENTRY-WHOLE-PLAN`
  - 저장 영수증에서 처음 들어온 경우만 전체 계획을 펼친다.

## Evidence 경계

- `p35-r13-b-date-groups-*`: `demo=ux12` fixture 기반 브라우저 검증
- `p35-r13-first-entry-plan-open-390.png`: 실제 public Flow 저장 경로 기반 자동 브라우저 검증
- `p35-r13-return-plan-collapsed-390.png`: 같은 저장본의 reload/목록 재진입 자동 브라우저 검증
- R13 rollback 자동화도 `demo=ux12&experiment=off`를 사용했다. literal rollback
  경로는 후속 release hardening에서 실제 저장본으로 별도 검증한다.
- screenshot, Playwright, unit test는 실제 사용자 관찰이 아니다.

## 최종 검증

- focused unit: `13/13`
- all unit: `694/694`
- R13 E2E: `3/3`
- P35 E2E: `79/79`
- full E2E: `405/405`
  - Windows 장시간 단일 실행의 간섭을 피하기 위해 `workers=1`의 4개 shard로 순차 실행
  - shard 결과: `129/129`, `80/80`, `97/97`, `99/99`
- build: pass
- docs check: pass
- `git diff --check`: pass

## R13 실행 당시 Publish 경계

- 현재 변경은 intentionally dirty worktree에 남아 있다.
- commit, push, PR, merge, preview/production deploy는 수행하지 않았다.
- `experiment=off` rollback 경계는 publish 전까지 유지한다.
- observed-user count는 `0`이며 내부 자동 검증을 실제 사용자 검증으로 표현하지 않는다.

이 항목은 R13 실행 당시 상태다. 이후 PR, merge, CI, Production 상태는
[P35 release hardening](../2026-07-29-p35-release-hardening/README.md)에 현재 사실로
분리해 기록한다.
