# P26-07 Post-save Decision Hub evidence

## 판정

- 상태: `complete_internal_evidence`
- 기준 커밋: `47d1780`
- 실제 관찰 사용자: `0`
- evidence: `current_source`, `current_command`, `current_browser`

P26-07은 저장 직후 화면을 단순 성공 카드에서 one-time decision hub로 바꾼다. 사용자는 다른 탭에서 저장한 Flow를 다시 찾지 않고, 같은 effective item으로 계산한 영수증과 전체 항목을 확인한 뒤 첫 실행, 전체 Flow, Calendar, 가져가기 중 하나를 고를 수 있다.

## 화면 계약

### 영수증

- Flow 제목
- 전체 할 일 수
- 날짜 범위 또는 날짜 없음 수
- 단계 수
- 반복 series 수
- 영수증 수와 렌더링한 effective row 수의 일치

### 다음 행동

1. `첫 할 일 시작`: 저장한 Flow의 첫 실행 항목을 연다.
2. `전체 Flow 보기`: My Flow의 전체 Flow workspace를 연다.
3. `Calendar`: 날짜 우선 실행 화면으로 이동한다.
4. `가져가기`: 현재 저장 결과의 Flow 전체 export panel을 바로 연다.

둘 이상의 child Flow를 저장한 경우 전체 map export처럼 가장하지 않는다. `Flow별 가져가기`를 누르면 저장한 Flow와 항목 수를 먼저 고르고 해당 Flow 전체 export를 연다. multi-Flow aggregate export는 P26-16 범위다.

검토 보류 콘텐츠는 전체 artifact만 보여주고 실행, Calendar, export 행동을 노출하지 않는다.

## 브라우저 결과

- public 날짜 없음 Flow: `10`개 영수증, 4개 경로 visible
- 날짜형 이사 Flow: `5`개, `7월 16일 - 8월 15일`, 2단계
- multi-Flow 오픽: `2` Flow / `19`개, export 전에 Flow 2개 중 하나 선택
- 검토 보류 영유아 일정: 실행 행동 `0`
- reload 후 중복 saved run/record: `0`
- mobile/wide horizontal overflow: `0`
- console/page errors: `0`

화면:

- [public 날짜 없음 receipt 390px](./screenshots/01-public-post-save-receipt-mobile.png)
- [public export 진입 390px](./screenshots/01-public-undated-decision-hub-mobile.png)
- [이사 Flow receipt 1024px](./screenshots/02-moving-decision-hub-wide.png)
- [multi-Flow export scope 1024px](./screenshots/03-multi-flow-export-scope-wide.png)
- [URL-first hit receipt 1024px](./screenshots/03-url-first-hit-post-save-receipt-wide.png)
- [검토 보류 receipt 390px](./screenshots/04-held-receipt-mobile.png)
- [메모 draft receipt 390px](./screenshots/04-memo-draft-post-save-receipt-mobile.png)

## 현재 검증

- post-save hub + canonical receipt Playwright: `7 / 7` pass
- 접근성 중복 heading 수정 후 실패 시나리오 + hub 재검증: `5 / 5` pass
- public/URL-first/workbench/held 단일-worker 회귀: `46 / 46` pass
- 전체 Flow 회귀 1차: `195 / 196` pass; 실패 1건은 중복 heading이었고 수정 후 해당 시나리오 pass
- 수정 후 전체 Flow 회귀: 앞 구간 `179 / 196`까지 실패 0에서 명령 10분 제한 종료, 마지막 20개 분할 재실행 `20 / 20` pass
- full unit: `549 / 549` pass
- docs check: pass, `14` files / `2,599` links
- production build: pass, 18 routes
- `git diff --check`: 오류 0, 기존 line-ending 경고만 존재

병렬 교차 회귀 1차에서 4건의 navigation/click timeout과 5건의 P26-06 이전 preview-control assertion이 발생했다. timeout 시나리오와 변경된 public contract를 단일 worker로 다시 실행해 `46 / 46`을 확인했다. 수정 후 전체 Flow 시나리오는 실행 제한 때문에 두 묶음으로 완결했으며 제품 assertion 실패는 0건이다. 실제 사용자 관찰은 아직 하지 않았다.

## 남은 범위

- 19~24개 긴 Flow의 단계 접기와 content-shape별 outline은 P26-09다.
- 저장 직후 `조정`의 quick/advanced editor 연결은 P26-10/11이다.
- 둘 이상의 child Flow를 한 파일로 합치는 aggregate export는 P26-16이다.
- 자동화와 heuristic 캡처는 observed-user evidence가 아니다.
