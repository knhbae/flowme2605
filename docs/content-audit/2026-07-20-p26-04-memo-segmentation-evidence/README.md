# P26-04 메모 분리·검토 evidence

## 판정

- 상태: `complete_internal_evidence`
- 기준 커밋: `2329f344c2b2dd3125d13144cd36979499fe09fd`
- 실제 관찰 사용자: `0`
- evidence: `current_source`, `current_command`, `current_browser`

P26-04는 사용자가 쓴 메모를 새 내용 생성 없이 실행 항목 후보로 나누고, 저장 전에 원문·결과·포함 여부·순서를 직접 검토하는 계약을 닫는다. 자동 브라우저와 screenshot은 실제 사용자 검증이 아니다.

## 대표 결과

입력:

> 8월 제주 여행 준비. 항공권 확인, 숙소 예약번호 정리, 렌터카 예약, 준비물 체크, 출발 전날 온라인 체크인

결과:

1. 항공권 확인하기
2. 숙소 예약번호 정리하기
3. 렌터카 예약하기
4. 준비물 체크하기
5. 출발 전날 온라인 체크인하기

`8월 제주 여행 준비`는 초안 제목 맥락으로 남고 실행 항목으로 중복 생성되지 않는다. 다섯 결과는 같은 source fragment ID를 공유하며 원문 한 조각과 1:N 관계를 유지한다.

## 저장 전 검토

- 포함/제외: 기존 체크를 유지한다.
- 제목: 각 결과를 바로 수정한다.
- 순서: 위/아래 버튼과 keyboard Enter로 변경한다.
- 나누기: 한 줄에 하나씩 직접 적어 적용한다.
- 합치기: 앞 결과와 합친 뒤 제목을 다시 확인한다.
- 원문: 390px에서는 fragment당 disclosure 하나, 1024px에서는 원문/결과 2열로 한 번만 표시한다.

## 핵심 수치

| marker | 결과 |
| --- | ---: |
| 제주 입력 action candidate | 5 |
| 물건 나열 오분리 | 0 |
| generic filler | 0 |
| visible source group | 1 |
| 저장 전 선택 | 4 / 5 |
| saved / receipt / reload / memo export | 4 / 4 / 4 / 4 |
| duplicate suggestion/item ID | 0 |
| source fragment mapping missing | 0 |
| horizontal overflow | 0 |
| console/page error | 0 |

전체 marker는 [route-evidence.json](./route-evidence.json), parser fixture는 [segmentation-fixtures.json](./segmentation-fixtures.json)에 있다.

## 화면

- [390px source disclosure와 5개 결과](./screenshots/01-memo-five-actions-review-mobile.png)
- [1024px 원문/결과 2열](./screenshots/02-memo-source-result-review-wide.png)
- [저장 후 Flow 전체 export 4개](./screenshots/03-memo-saved-export-mobile.png)

## 현재 실행 검증

- targeted segmentation unit: `21 / 21` pass
- full unit: `539 / 539` pass
- P26-04 Playwright: `1 / 1` pass
- save receipt Playwright: `3 / 3` pass
- existing plain-memo save Playwright: `1 / 1` pass
- URL-first user-surface regression: `19 / 19` pass
- public share/workbench regression: `44 / 44` pass
- docs check: pass, `2,578` local links
- production build: pass, 18 routes
- screenshot inspection: 390px/1024px horizontal overflow `0`, console/page error `0`

위 수치는 현재 clean P26 worktree의 자동 명령·브라우저 결과이며 실제 사용자 관찰을 뜻하지 않는다.

## 남은 위험

- 자연어 절 경계는 보수적 heuristic이다. 의미 생성·추천·AI 분할이 아니다.
- 쉼표가 행동 목록인지 목적어 목록인지 애매하면 하나로 유지하고 사용자가 직접 나눈다.
- 한국어 외 언어와 복잡한 괄호·인용문은 fixture가 부족하다.
- 실제 사용자가 `나누기/합치기`를 설명 없이 찾는지는 P26-19 이후 관찰 후보이며 현재 검증값이 아니다.
