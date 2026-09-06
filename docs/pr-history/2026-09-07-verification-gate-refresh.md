# Verification gate refresh

- **Date:** 2026-09-07 KST
- **Branch:** `codex/security-audit-refresh-20260907`
- **PR:** [#200](https://github.com/knhbae/flowme2605/pull/200)
- **Status:** Merged
- **Base:** `origin/main` at `db74a36c`
- **Final head:** `f095341b`

## Why

현재 날짜 기준으로 9개 일반 사용자 경로가 90일 원문 재검토 기한에 도달했고, 새로 설치한 잠금 파일에서는 high 보안 경고가 확인돼 표준 검증이 실패했습니다. 예외나 날짜 단독 갱신을 추가하지 않고 원문 의미 검토와 전이 의존성 잠금 갱신으로 게이트를 복구합니다.

## What Changed

- 9개 원문과 초등 입학 보조 출처를 다시 열어 현재 Flow의 행동·일정·위험 경계를 대조했습니다.
- 6개는 의미 변경 없이 재검토일을 갱신했습니다.
- 바나나 레시피, 강아지 입양, 교육부 초등 입학 3개는 실제 페이지 제목을 맞춘 뒤 재검토일을 갱신했습니다.
- 전체 링크 감사에서 발견한 전기차 보조금 공식 404 주소를 현재 지원 절차·지급현황 주소로 교체했습니다.
- source-fit 기록의 `checkedAt`도 같은 실제 검토일로 맞췄습니다.
- `package-lock.json`의 전이 의존성만 갱신해 `browserslist`와 `postcss-selector-parser` 보안 경고를 해소했습니다.
- 첫 GitHub 전체 회귀가 현재일 기준 31일 조회 범위를 벗어난 2026-07-27 반복 일정을 찾지 못해 실패했습니다. 같은 파일의 기존 `FIXED_CLOCK`을 해당 테스트에도 설치해 시간 경계를 고정했습니다.

## Not Done

- 제품 기능, 사용자 저장 데이터, 스키마, 인증, 배포 설정은 변경하지 않았습니다.
- 원문에 있는 상품 추천, 효능 주장, 법률·의료 판단을 Flow에 추가하지 않았습니다.
- 이 작업은 관찰 사용자 검증이 아닙니다.

## Verification

- [Source freshness evidence](../content-audit/2026-09-07-flow-source-freshness-refresh/README.md)
- `npm.cmd run security:audit` - 통과, 취약점 0개
- `npm.cmd exec -- tsx scripts/content-audit/audit-flow-source-freshness.ts` - 일반 사용자 경로 135개 최신, 검토 기한 초과·누락 0개
- `npm.cmd exec -- tsx scripts/content-audit/audit-exposed-source-reachability.ts --strict --output ...` - 고유 링크 156개, 자동 판정 끊어진 링크 0개, 수동 재확인 8개
- `npm.cmd exec -- playwright test tests/e2e/workbench-source-density.spec.ts --grep "corrected official routes expose current source and save actions" --workers=1 --retries=0` - 1/1 통과
- `npx.cmd playwright test tests/e2e/approved-plan-execution-ux.spec.ts --grep "legacy skipped recurrence"` - 1/1 통과
- `npm.cmd run verify` - 문서 검사, 전체 단위 테스트, 프로덕션 빌드 통과

## Rollback

이 유지보수 PR의 merge commit을 revert하면 이전 source metadata와 잠금 파일을 복원할 수 있습니다. 데이터 migration이나 별도 복구 단계는 없습니다.
