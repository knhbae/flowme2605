# P0-08 내부 브라우저 증거

이 폴더는 P0-08 저장 계획 library 중심 `/my`의 자동화·브라우저 화면 증거다. fresh local production build를 port `3114`에서 검사했으며, 실제 사용자 관찰이나 production 배포 증거가 아니다.

## 결과

- evidence capture spec: `7/7` PASS
- viewport: `390×844`, `1024×768`, `1440×1000`
- horizontal overflow: `0`
- unnamed interactive controls: `0`
- console errors: `0`
- page errors: `0`
- observed-user sessions: `0`

## 화면

| # | 상태 | 이미지 |
|---:|---|---|
| 1 | 저장 계획 0개, 발견 행동 1개 | [01-empty-library-390x844.png](./screenshots/01-empty-library-390x844.png) |
| 2 | 계획 1개, compact Today와 동일 identity | [02-compact-today-one-plan-390x844.png](./screenshots/02-compact-today-one-plan-390x844.png) |
| 3 | 계획 5개, 검색 없는 stable library | [03-five-plan-library-1024x768.png](./screenshots/03-five-plan-library-1024x768.png) |
| 4 | 계획 20개, query와 상태 filter | [04-searchable-twenty-plan-library-1440x1000.png](./screenshots/04-searchable-twenty-plan-library-1440x1000.png) |
| 5 | 선택한 저장 계획 상세 | [05-selected-plan-detail-1024x768.png](./screenshots/05-selected-plan-detail-1024x768.png) |
| 6 | 정확한 `savedPlanLibrary=off` legacy rollback | [06-exact-flag-off-legacy-390x844.png](./screenshots/06-exact-flag-off-legacy-390x844.png) |
| 7 | 실제 공개 저장 뒤 selected detail과 `24개` 1회 배너 | [07-real-save-detail-banner-390x844.png](./screenshots/07-real-save-detail-banner-390x844.png) |

자동 테스트는 route, DOM, storage bytes, Back/focus 복구를 재현하지만 처음 보는 사용자의 이해·선호·장기 사용성을 증명하지 않는다.
