# FlowMe P27 라이프사이클 작업공간 마감

작성일: 2026-07-21

판정: `released_to_canonical_production_automated_browser_green`

구현 기준: `118dec90de9ddcfea2150e2279cc57d6dda53e8b`

시작 기준: `origin/main` `63ea6416cf720d4e3015a48268a70aba8dfb4d0e`

실제 관찰 사용자: `0`

배포 기준: PR [#141](https://github.com/knhbae/flowme2605/pull/141), merge `2829b379ada96baa79f49dfe75049b81f8b6d1c5`, [production closeout](../2026-07-21-p27-production-closeout/README.md)

## 결론

P27은 같은 Flow가 저장 전, 저장 직후, My Flow, Calendar, export에서 서로 다른 제품처럼 보이던 문제를 하나의 라이프사이클 작업공간으로 정리했다. source, personal overlay, execution run, recurrence occurrence, export identity 계약은 다시 만들지 않았다.

현재 명령과 브라우저 기준으로 Blocking/High 회귀는 없다. 다만 검색 노출 임계값, `보관` 문구, 저장 전 첫 조정 모드의 선호는 실제 사용자 관찰이 없으므로 검증된 사용성으로 표현하지 않는다.

## 완료한 범위

| 범위 | 현재 동작 |
| --- | --- |
| Server document | `/flows`는 composer와 대표 Flow를, `/my`는 4탭 shell을 hydration 전 HTML에 제공한다. |
| Flow 라이프사이클 | 저장한 Flow는 기본 목록에서 `보관`하고 즉시 되돌리거나 보관 목록에서 복구한다. 실행 기록과 저장 원본은 유지한다. |
| Item 제거 | source Item은 `내 Flow에서 빼기`, user Item은 tombstone 제거를 사용하고 지속적인 복구 경로를 유지한다. |
| 반복 Flow | `미리보기 4주`와 `종료일 없음`을 분리하고 series 정의와 occurrence 실행을 구분한다. |
| 자료/확인 항목 | 영상·URL은 resource, 완료 판단용 문장은 subcheck로 분리한다. 개인 추가·수정·제외는 overlay에 저장한다. |
| 저장 전 조정 | 기본은 전체 결과를 읽고, 조정에서는 `항목 고르기 / 날짜 / 제목·메모 / 순서` 중 한 작업만 활성화한다. |
| My Flow | 1~4개는 바로 탐색하고 5개 이상은 검색을 제공한다. 검색 결과의 `가져가기`는 항목 상세가 아니라 해당 전체 Flow 작업공간을 연다. |
| Calendar | Flow scope, 날짜 없는 배치, 같은 날짜 grouping, 반복 marker와 named control을 유지한다. |
| 저장 결과/export | 저장 결과는 같은 전체 Flow 위의 compact receipt이고 export는 scope, count, destination, 손실 안내만 점진적으로 연다. |

## 현재 검증

- pretest: `24 / 24`
- unit: `571 / 571`
- production build: `18 routes`
- P27 targeted Playwright: `12 / 12`
- full Playwright, serial: `339 / 339`
- docs check: `14` required files, `2750` local links including this final package
- final browser captures: `8`
- review board render captures: `2`
- horizontal overflow: `0`
- console error: `0`
- page error: `0`
- unnamed visible focusable: `0`
- observed-user session: `0`

## 핵심 화면

- [저장 전 조정, mobile](./screenshots/public-adjustment-mobile.png)
- [반복 홈트 preview, mobile](./screenshots/workout-preview-mobile.png)
- [3개 Flow 보관함, mobile](./screenshots/my-flow-compact-library-mobile.png)
- [검색 결과에서 전체 Flow 열기, wide](./screenshots/my-flow-search-workspace-wide.png)
- [Calendar Flow scope와 routine marker, wide](./screenshots/calendar-routine-wide.png)
- [Flow 보관과 즉시 되돌리기, wide](./screenshots/archive-recovery-wide.png)
- [저장 결과와 전체 Flow, mobile](./screenshots/post-save-receipt-mobile.png)
- [compact export preflight, mobile](./screenshots/export-preflight-mobile.png)
- [review board, mobile](./screenshots/review-board-mobile.png)
- [review board, wide](./screenshots/review-board-wide.png)

## 남은 경계

1. 영구 삭제는 기본 제품 UI에 노출하지 않았다. 계정/DB가 없는 현재 환경에서 잘못 구현하면 실행 이력과 개인 overlay까지 잃을 수 있어 별도 data manager 정책이 선행돼야 한다.
2. 저장 전 resource 변경은 이번 picker에 넣지 않았다. source resource는 preview에서 확인하고 personal resource/subcheck 변경은 저장 후 contextual item editor에서 한다.
3. 검색 threshold `5`, 기본 조정 모드 `항목 고르기`, `보관` 용어는 자동화로 발견 가능성이나 선호를 증명할 수 없다.
4. 로컬 브라우저 저장소 기반이므로 cross-device continuity는 여전히 없다.
5. 실제 사용자 관찰, 실 Calendar 중복 import, cross-browser backup/restore는 실행하지 않았다.

## 파일

- [상세 감사](./audit.md)
- [통합 검토 보드](./review.html)
- [route evidence](./route-evidence.json)
- [브라우저 캡처 원본](./capture-results.json)
- [canonical production closeout](../2026-07-21-p27-production-closeout/README.md)
- [독립 재검토 프롬프트](./prompt-ko.md)
