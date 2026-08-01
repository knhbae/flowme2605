# P35 프로덕션 모바일 수렴

**상태:** P35 프로덕션 모바일 P0의 로컬 구현과 내부 자동 검증 완료

**승인일:** 2026-08-01

**작업 시작 기준 commit:** `c09f859` (`v0.1.0`, P35 production)

**검증 대상:** 위 commit에서 분리한 `codex/p35-production-mobile-p0` branch와 Draft PR #165

**작업 위치:** `codex/p35-production-mobile-p0` 전용 worktree

**관찰 사용자 근거:** `0` — 이 프로그램의 범위에서 의도적으로 제외

이 프로그램은 owner가 전달한 모바일 피드백, Claude Design 1차 검토, Codex의
코드 기반 검토를 하나의 제한된 P0 수정으로 수렴한다. 핵심은 공개
미리보기에서 확인한 이름, 항목, 순서, 날짜, 메모가 저장 영수증, 내 Flow,
항목 상세, 내보내기로 이어질 때 다른 결과로 바뀌지 않게 하는 것이다.

## 이번 P0에서 구현한 것

- 공개 Flow와 내 Flow에 `EffectiveFlowSnapshot`을 적용했다. 저장 영수증,
  항목 상세, 저장한 Flow 내보내기도 같은 확정 결과 행을 사용한다.
- 날짜 의도를 `provisional`, `custom`, `undated`로 분리하고 CTA, 저장값,
  영수증, 내 Flow, 내보내기 간 결과를 맞췄다.
- Flow 이름과 항목 이름·설명·날짜·포함 여부·순서를 하나의 모바일 편집
  트랜잭션으로 다룬다. 적용 전까지는 저장하지 않고, 취소하면 전체 초안을
  되돌린다.
- 공개 화면은 저장을 유일한 기본 행동으로 두고, 편집과 내보내기를 각각
  한 단계의 전체 높이 화면으로 분리했다. 저장 후 영수증에서는 내보내기를
  제거하고 `내 Flow에서 이어하기`만 남겼다.
- 실행 가능한 결과형의 내 Flow 첫 진입은 진행률과 다음 1~3개 항목을 먼저
  보여주고 전체 계획은 접힌 상태로 둔다. 메모 결과형은 저장한 `memo` 결과
  유형을 유지하며 가짜 다음 행동이나 진행률을 만들지 않는다. 완료와 메모
  입력의 소유자는 항목 상세 한 곳이다.
- Flow Map은 기존 선택·여러 Flow 저장·검토 보류·호환 저장소를 유지하면서
  공통 행동/위험/원문/복구 계약과 원자적 전체 높이 편집기를 적용했다.

## 의도적으로 남긴 경계

Flow Map의 결과 행과 개수는 아직 하나의 `EffectiveFlowSnapshot`으로
합성하지 않는다. Map은 여러 하위 Flow와 선택·저장 컨트롤러를 가진 별도
합성 단위이므로, 이번 P0에서는 데이터 손실 위험이 없는 행동/복구 어댑터까지만
적용했다. 이를 단일 스냅샷으로 바꾸려면 선택, save-all, review hold, 기존
저장 레코드의 무손실 회귀 증거가 먼저 필요하다.

Text-to-Flow 연결과 실제 사용자 관찰은 이번 프로그램에 포함하지 않는다.
로컬 구현 결과를 그 둘의 완료나 검증으로 해석하지 않는다.

## 현재 검증 요약

| 검증 | 현재 근거 |
| --- | --- |
| P35 P0 계약 테스트 | `npm.cmd run test:p35-p0` — 40/40 통과 |
| 전체 단위/계약 테스트 | `npm.cmd test` — 597/597 통과 |
| 프로덕션 빌드 | `npm.cmd run build` — 통과 |
| 패키지 보안 감사 | `npm.cmd run security:audit` — 취약점 0개 |
| 문서 검사 | `npm.cmd run docs:check` — 14개 필수 문서/3,626개 로컬 링크 통과 |
| 목표 모바일 E2E | 390x844 모바일을 포함한 목표 경로 통과 |
| 전체 E2E | 최종 source와 production build 기준 57개 spec, 413/413 통과 |

세부 명령, 통과 범위, 남은 게이트는 [완료 감사](./completion-audit.md)에
기록한다.

## 게시 상태

- 로컬 수정: branch에 커밋, 전용 worktree clean
- commit: 구현 commit `1b669f9`
- push: `origin/codex/p35-production-mobile-p0`
- PR: Draft [#165](https://github.com/knhbae/flowme2605/pull/165)
- merge: 하지 않음
- Vercel Preview: [Ready](https://flowme2605-git-codex-p35-production-mobile-p0-flowme.vercel.app)
- Vercel Production: 하지 않음
- 관찰 사용자 검증: 하지 않음 (`0`)

## 문서

- [제품·아키텍처 계약](./spec.md)
- [소비자·입력 인벤토리](./consumer-inventory.md)
- [구현 계획과 현재 상태](./plan.md)
- [실행 체크리스트](./tasks.md)
- [QA 계약](./qa.md)
- [완료 감사](./completion-audit.md)
