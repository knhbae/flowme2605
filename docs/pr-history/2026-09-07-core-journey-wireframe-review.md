# Core Journey Wireframe Review Package

**Date:** 2026-09-07  
**Branch:** `codex/core-journey-wireframes-20260907`  
**PR:** [#201](https://github.com/knhbae/flowme2605/pull/201)  
**Status:** Merged
**Final head:** `f91e655c`

## Why

FlowMe의 개인 자유 기록과 공개 Flow 재사용이 각각 시작, 저장, 실행, 복귀까지 한 흐름으로 이해되는지 사용자가 직접 검토할 수 있는 자료가 필요했다.

## What Changed

- 두 핵심 여정을 한 독립 HTML 시뮬레이터로 묶었다.
- 구현 대조표, 검증 범위, 결과 JSON, 내보내기 예시, 반응형 화면과 기존 v4.1 기준 이미지를 함께 보존했다.
- 패키지 밖 상대 링크를 제거해 폴더만으로 열람할 수 있게 했다.

## Not Done

- 제품 코드를 바꾸거나 구현 방향을 승인하지 않았다.
- 실제 기기, 배포 환경, 외부 앱 왕복, 실제 사용자 관찰은 수행하지 않았다.
- 개인 공간, 공유 지식, 커뮤니티 방향 중 하나를 계정 모드나 필수 여정으로 확정하지 않았다.

## Decisions

- 자유 기록 원문, 개인 실행 상태, 공개 버전은 서로 다른 소유권으로 유지한다.
- export-first는 초기 검증 우선순위이며 FlowMe의 전체 장기 방향을 축소하는 규칙이 아니다.
- 자동 시뮬레이션과 캡처는 설계 검토 근거이며 관찰 사용자 검증으로 세지 않는다.

## Files Touched

- `docs/content-audit/2026-09-07-flowme-core-journey-wireframes/`
- `docs/pr-history/2026-09-07-core-journey-wireframe-review.md`

## Verification

- `npm.cmd run docs:check`
- `npm.cmd run verify`
- 패키지 Git blob 집계 SHA-256: `d6b1fc7b11eb0e100eeffc03bad16a13124df28277bd446d9212946de91796e2`
- 기존 패키지 시뮬레이션: `65/65` PASS, page/console errors `0`, 외부 요청 `0`

## Risks

- 시뮬레이터의 브라우저 저장과 다운로드는 제품 저장소나 외부 앱 연동을 검증하지 않는다.
- 화면 결과는 실제 사용자 이해도와 장기 사용성을 증명하지 않는다. 관찰 사용자 수는 `0`이다.

## Follow-Ups

- Owner가 두 여정을 직접 검토해 유지, 수정, 보류 중 하나를 선택한다.
- 선택 결과가 생겨도 별도 명세와 승인 전에는 Production 구현 게이트로 올리지 않는다.

## Links

- [PR #201](https://github.com/knhbae/flowme2605/pull/201)
- [패키지 안내](../content-audit/2026-09-07-flowme-core-journey-wireframes/README.md)
- [검증 결과](../content-audit/2026-09-07-flowme-core-journey-wireframes/qa.md)
- [와이어프레임](../content-audit/2026-09-07-flowme-core-journey-wireframes/index.html)
