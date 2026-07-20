# P26-06 감사 기록

## 원인

Home과 `/flows`에는 Flow와 Flow Map 카드가 서로 다른 promise, count, CTA를 사용했다. public `/f`는 입력 설명과 workbench가 분리돼 저장 결과를 먼저 확인하기 어려웠고, source-backed `/flow-maps`도 별도 저장 문법을 사용했다. 결과적으로 같은 콘텐츠가 route마다 다른 제품 객체처럼 보였다.

## 구현

### 공통 발견 카드

`components/flow/FlowDiscoveryCard.tsx`를 추가했다. Home 추천과 `/flows`의 일반/source-backed 카드는 title/source/representative items/input/result/count/action을 같은 순서로 표시한다. 전체 링크 하나를 사용하며 keyboard focus ring과 `{제목} Flow 열기` accessible name을 제공한다.

### 공통 저장 전 프레임

`components/flow/FlowSaveBeforeFrame.tsx`를 추가해 public Flow와 source-backed Flow Map의 상단을 통일했다. 대표 5개와 전체 수를 먼저 보여주고, 날짜·선택 입력과 `그대로 시작 / 내게 맞게 조정`을 같은 결정 영역에 둔다. 상세 workbench와 source/safety 근거는 아래 단계에 남긴다.

### 독립 진입

- 결혼: `curated-wedding-naver-timeline`, `curated-wedding-gongysd-atoz`
- 운동: `curated-allblanc-morning-workout`, `curated-allblanc-no-jump-cardio`

`/flows`에는 네 Flow가 직접 나타난다. 기존 parent map route는 이전 링크를 위한 no-save chooser fallback으로만 유지한다.

## copy 삭제/유지 기준

| 종류 | 처리 |
| --- | --- |
| 원문 이름과 링크 | 상단에 짧게 유지 |
| 대표 할 일과 전체 수 | 유지 |
| 필요한 날짜/선택 | 결정 영역에 유지 |
| 저장 후 결과 형식 | compact chip으로 유지 |
| `이사일만 넣으면 ...`식 장문 promise | 제거 |
| 내부 검토 상태와 source 변환 설명 | ordinary surface에서 제거 |
| 게시일·확인 기록·주의 | 접힌 상세로 이동 |
| 검증 인원·별점·인기 | 근거가 없어 미노출 |

## 시나리오

| route | viewport | 확인 | 결과 | evidenceKind |
| --- | --- | --- | --- | --- |
| `/` | 390x844 | URL/memo entry + 추천 카드 2개 | 통합 카드, 불필요한 높이 0 | `current_browser` |
| `/flows` | 390x844 | catalog 9개와 direct child entry | 통합 카드, 인기순 0 | `current_browser` |
| `/f/vehicle-inspection-prep` | 390x844 | whole Flow -> setup -> sticky action | 대표 5개, 긴 promise 0 | `current_browser` |
| `/flow-maps/moving-d30` | 390x844 | map save-before | 같은 artifact-first 문법 | `current_browser` |
| wedding parent fallback | 390x844 | child 선택 | 독립 링크 2개, save-all 0 | `current_browser` |
| `/f/vehicle-inspection-prep` | 1024x768 | preview/setup/workbench | preview와 setup 병렬, detail 아래 | `current_browser` |

## 발견해 함께 수정한 회귀

- opposite timezone SSR/client가 example date를 다르게 계산하던 hydration 오류를 제거했다. 첫 hydration은 날짜 없는 구조로 맞추고 client mount 후 local date를 투영한다.
- choose-child map 마지막 summary가 fixed mobile nav에 가리던 문제를 mobile bottom clearance로 해결했다.
- Home primary card의 `h-full`이 불필요한 빈 공간을 만들던 문제를 제거했다.

## 소유권 영향

- source content: 변경 없음
- personal overlay: 변경 없음
- execution run / recurrence / projection identity: 변경 없음
- save/export schema: 변경 없음
- discovery and save-before visual composition: 변경됨

## 현재 검증

- unit: `546 / 546`
- full Flow E2E: `196 / 196`
- P26-06 dedicated E2E: `4 / 4`
- 교차 회귀에서 이전 `저장` CTA와 interactive preview를 기대한 5건을 현재 `시작` CTA와 read-only whole-Flow preview 계약으로 갱신한 뒤 targeted `5 / 5`
- docs check: `14` required files, `2,591` local links
- production build: `18 / 18` routes
- horizontal overflow, console/page error, opposite-timezone hydration error: 모두 `0`
- 실제 관찰 사용자: `0`

## 다음

P26-07은 저장 후 receipt를 단순 확인 화면이 아니라 저장된 전체 Flow를 확인하고 `지금 실행 / 전체 보기 / 조정 / 가져가기`로 갈라지는 action hub로 정리한다. P26-06의 공통 card/frame을 다시 복제하지 않고 현재 canonical receipt와 effective item projection을 사용한다.
