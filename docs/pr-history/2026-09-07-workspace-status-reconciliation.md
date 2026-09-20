# Workspace Status Reconciliation

**Date:** 2026-09-07  
**Branch:** `codex/workspace-status-maintenance-20260829`  
**PR:** [#202](https://github.com/knhbae/flowme2605/pull/202)  
**Status:** Merged

## Why

PR #195 이후의 실제 출시 상태, 분리된 개발 워크트리, Text Authoring 후보, 보존 자료, UX 검토 자료가 여러 문서에 서로 다른 시점으로 남아 있었다. 다음 작업을 고르기 전에 현재 근거와 미결정 사항을 한 진입점에서 다시 찾을 수 있어야 했다.

## What Changed

- `STATUS`, `ROADMAP`, `PROJECT_CONTROL`, `specs/README`, `HISTORY`를 PR #195 출시 근거와 현재 분리 작업 기준으로 맞췄다.
- Flow Entry and Preview Clarity와 visual-only refresh의 오래된 미완료 표현을 실제 병합·배포 근거로 교정했다.
- 보존/워크트리 등록부와 2026-08-29 유지보수 인벤토리를 추가했다.
- PR #200의 원문·보안 검증 유지보수와 PR #201의 핵심 여정 자료 게시를 기능 출시와 구분해 반영했다.
- 사용자가 지금 볼 자료는 HTML 와이어프레임 링크로 올리고, K4-A1과 Text Authoring 선택은 별도 작업으로 남겼다.

## Not Done

- 기존 dirty worktree, 개인 공간 PoC, Text Authoring 브랜치, 로컬 보존 패키지를 수정하거나 정리하지 않았다.
- 새 제품 기능, Production 게이트, semantic version, 사용자 세그먼트를 확정하지 않았다.
- 배포나 자동 검증을 실제 사용자 관찰로 계산하지 않았다.

## Decisions

- 현재 기능 출시 기준은 PR #195로 유지한다.
- PR #200은 runtime verification maintenance, PR #201은 design evidence publication으로 구분한다.
- Personal Workspace K4-A1, 핵심 여정 검토, Text Authoring 기준본 선택은 서로 다른 후속 결정이다.

## Files Touched

- `docs/STATUS.md`
- `docs/ROADMAP.md`
- `docs/PROJECT_CONTROL.md`
- `docs/HISTORY.md`
- `docs/specs/README.md`와 관련 완료 spec 기록
- `docs/content-audit/2026-08-29-flowme-workspace-backlog-maintenance-inventory.md`
- `docs/content-audit/2026-09-07-flowme-preservation-and-work-register.md`
- 관련 `docs/pr-history/` 기록

## Verification

- `npm.cmd run docs:check`
- `git diff --check`
- `npm.cmd run verify`
- GitHub required checks and Vercel Preview before merge

## Risks

- 워크트리 수와 Draft PR 상태는 시점에 따라 달라질 수 있으므로 보존 등록부는 2026-09-07 캡처로 읽어야 한다.
- 관찰 사용자 수는 `0`이며, 게시된 와이어프레임의 이해도와 장기 사용성은 아직 검증되지 않았다.

## Follow-Ups

- Owner가 [핵심 여정 와이어프레임](../content-audit/2026-09-07-flowme-core-journey-wireframes/index.html)을 검토해 유지, 수정, 보류 중 하나를 정한다.
- Personal Workspace는 별도 지시가 없으면 기록된 K4-A1 범위를 유지한다.
- Text Authoring은 후보 비교와 실패 CI 진단 후에만 기준본을 고른다.

## Links

- [PR #202](https://github.com/knhbae/flowme2605/pull/202)
- [Project status](../STATUS.md)
- [Roadmap](../ROADMAP.md)
- [Preservation and work register](../content-audit/2026-09-07-flowme-preservation-and-work-register.md)
