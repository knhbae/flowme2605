# FlowMe 공식 일정 review-hold evidence

작성일: 2026-07-12

## 목적

일반 카탈로그에서 숨긴 `revise` 콘텐츠가 직접 URL과 정확한 출처 URL 조회에서는 여전히 정상 실행·저장 대상으로 열리던 문제를 닫는다. 이번 slice는 공식 일정 최신성이 다시 확인되지 않은 의료 콘텐츠 2종을 대상으로 한다.

## 적용 대상

- `/flow-maps/baby-health-schedule`
- `/flow-maps/curated-child-vaccination-schedule`
- 두 콘텐츠의 공식 출처 URL을 넣은 `/flows` URL-first 결과
- 이미 저장한 `baby-health-schedule` My Flow 기록

## 정책

- `directRouteEnabled`: 이전 저장본과 출처 링크를 깨뜨리지 않도록 직접 열람은 유지
- `publicExecutionEnabled: false`: 신규 저장, export, URL-first hit, 초안 우회를 중지
- 직접 route: `noindex, nofollow`, 일정 행 0, 저장 컨트롤 0, 공식 원문 링크 1
- URL-first: `needs_review + blocked`, 시작 패널 0, 후보/초안 요청 0
- 기존 저장본: 기록과 체크 상태는 유지하되 공식 일정 재확인 경고를 숨길 수 없게 표시

## 주요 결과

- review-hold route: `2`
- URL-first saveable hit: `0`
- 신규 save/export control: `0`
- 보류 화면의 일정 row: `0`
- noindex route: `2/2`
- 기존 저장본 Flow row: `2`
- 기존 저장본 공식 일정 경고: `1`
- 모바일/wide horizontal overflow: `0`
- 정상 대표 `moving-d30` 저장 경로: 유지

## 검증

- unit: `423/423`
- `tests/e2e/url-first-user-surface.spec.ts`: `9/9`
- `tests/e2e/public-share-cta-order.spec.ts` + `workbench-source-density.spec.ts`: `44/44`
- `tests/e2e/flow-mvp.spec.ts`: `181/181`
- `npm.cmd run docs:check`: pass
- `npm.cmd run build`: pass

이번 package는 2026-07-12 현재 production build에서 다시 캡처했다. 과거 Claude review screenshot이나 숨긴 카탈로그 화면을 현재 상태 근거로 재사용하지 않았다.

## 파일

- [audit.md](./audit.md)
- [review.html](./review.html)
- [route-evidence.json](./route-evidence.json)
- [screenshots/](./screenshots/)
