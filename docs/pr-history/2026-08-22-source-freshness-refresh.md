# Source Freshness Refresh

- **Date:** 2026-08-22 KST
- **Branch:** `agent/source-freshness-refresh-20260822`
- **PR:** [#196](https://github.com/knhbae/flowme2605/pull/196)
- **Status:** Merged
- **Base:** `origin/main` at `a179eb8dbbdcf9ddd6ae3ce7f8fd2bf1bb04714a`
- **Final head:** `97c537ff8357b2989541facaac94711634594e4c`
- **Merge:** `8c0bfd8de9fb8877c4045b2c3f725b60ca236843`

## Why

PR #194와 #195의 기능 검증은 통과했지만 표준 코어 게이트가 현재 날짜 기준 source review 42건 때문에 실패했습니다. 날짜만 갱신하는 예외를 만들지 않고 실제 원문과 변환 결과를 다시 대조했습니다.

## What Changed

- 42개 게이트 후보와 archive 중복 2개, 기존 미리보기 3개를 현재 원문 기준으로 재검토했습니다.
- 20개는 의미 일치를 확인해 갱신하고 17개는 범위 밖 행동·제목·URL을 고친 뒤 갱신했습니다.
- 원문 대상 또는 핵심 구조가 다른 5개는 재검토일을 올리지 않고 `catalog_preview_only`로 전환했습니다.
- real-source의 공통 날짜를 올리지 않고 원문·변환 확인을 끝낸 일반 경로 28개와 archive 중복 2개만 명시적으로 갱신했습니다. 본문 미확인·의미 불일치 미리보기 3개는 기존 날짜를 유지했습니다.
- real-source source-fit 파생 기록이 각 원장의 실제 `checkedAt`을 사용하도록 하드코딩을 제거했습니다.
- 날짜를 제거한 Q-Net·외교부·출처 관찰형 영상은 화면 미리보기와 텍스트·표 내보내기에서도 달력·반복 조정 문구가 나오지 않도록 산출물 계약을 맞췄습니다. 공개 메타만 확인된 FITVELY 영양 영상 5개도 장기·주간 계획 대신 오늘 한 번 적용하는 관찰표와 유지·중단 메모로 좁혔습니다.
- 수정·보류 이유와 링크 도달성 결과를 별도 증거 패키지로 남겼습니다.

## Not Done

- 보류 5개의 새 공식 출처 확보나 전면 재구성은 하지 않았습니다.
- 사용자 저장 데이터, 스키마, 인증, 배포 설정은 변경하지 않았습니다.
- 이 작업은 관찰 사용자 검증이 아닙니다.

## Verification

- `npm.cmd exec -- tsx scripts/content-audit/audit-flow-source-freshness.ts` — 일반 사용자 경로 135개 최신, 검토 기한 초과 0, 누락 0
- `npm.cmd exec -- tsx scripts/content-audit/audit-exposed-source-reachability.ts --strict --output ...` — 고유 링크 155개, 명시적 끊어진 링크 0, 수동 재확인 9
- `npm.cmd exec -- tsx --test lib/flow/seed-flows.test.ts lib/flow/source-fit.test.ts lib/flow/natural-artifact-audit.test.ts lib/flow/content-lab.test.ts lib/flow/artifact-fields.test.ts lib/flow/artifact-plan.test.ts lib/flow/execution-model.test.ts lib/flow/export.test.ts components/flow/ArtifactWorkbench.test.tsx` — 225/225 통과
- `npm.cmd test` — 통과
- `npm.cmd exec -- playwright test --workers=2 --retries=0` — 612/612 통과, 실패·재시도·건너뜀 0
- `npm.cmd run docs:check` — 필수 문서 16개와 로컬 링크 4,564개 통과
- `npm.cmd run build` — Next.js Production build 통과
- `npm.cmd run security:audit` — high 이상 취약점 0

자동 검증은 원문 의미 검토와 코드 회귀를 확인한 것이며 관찰 사용자 검증을 뜻하지 않습니다.

## Rollback

이 유지보수 PR의 merge commit을 revert하면 이전 source metadata와 노출 결정을 복원할 수 있습니다. 데이터 migration이나 별도 복구 단계는 없습니다.

## Evidence

- [Source freshness evidence](../content-audit/2026-08-22-flow-source-freshness-refresh/README.md)
