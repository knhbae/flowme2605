# 다음 앱 구현 세션 Handoff - 콘텐츠 포트폴리오 canary

## 목표

`2026-07-11-content-portfolio-preapp-v1.json`의 사용자용 `contentBundles`를 기존 FlowMe registry/seed 타입에 매핑한다. 이 문서는 구현 범위를 설명하지만 현재 세션에서는 앱 코드를 수정하지 않는다.

## 반드시 읽을 파일

1. `docs/content-audit/2026-07-11-content-portfolio-preapp-v1.json`
2. `docs/content-audit/2026-07-11-content-portfolio-preapp-board-ko.html`
3. `docs/flow-rules/source-to-flow-conversion-gate.md`
4. `docs/flow-rules/flow-content-source-selection.md`
5. `docs/flow-rules/quality-gate.md`

## 첫 구현 범위

- `aircon-filter-4week` — 에어컨 필터 4주 청소
- `busan-friends-2n3d` — 친구와 부산 2박 3일 뚜벅이 여행
- `interview-day-before` — 면접 전날 준비
- `weekday-lunchbox-week` — 직장인 일주일 도시락
- `overseas-trip-prep-map` — 해외여행 준비

두 번째 wave는 처음부터 함께 노출하지 않는다.

- `driver-license-renewal-map` — 운전면허 갱신·적성검사
- `beginner-5k-8week` — 5km 대회 8주 준비
- `kitten-first-week` — 새끼 고양이 맞이 첫 주

## 데이터 매핑

- `contentBundles[]` → 앱의 source-backed Map/Bundle registry
- `flows[]` → 사용자가 선택·저장하는 Flow
- `steps[]` → 원문 기간·요일·단계·row group
- `steps[].items[]` → 실제 체크 또는 캘린더 이벤트
- `memo/detail` → 방법, 재료, 조건, 수량, 주의, source context
- `sourceRows[] + item.sourceRowIds[]` → 관리자/테스트 provenance
- `reviewRecords[]` → 내부 문서 전용. 사용자 UI나 seed copy에 넣지 않음

현재 lib/flow/types.ts의 FlowBundle / FlowSection / FlowItem / FlowItemDetail로 표현 가능하므로 runtime type을 추가하지 않는다. 다만 기존 2026-07-01 seed adapter처럼 Step 하나를 FlowItem 하나로 축약하면 안 된다. Step은 FlowSection, Step 안의 각 Item은 실제 FlowItem으로 펼친다. 각 Flow의 appTarget에 anchor, structure, destination, timing 대응이 들어 있다.

일정 변환에서는 `item.schedule`을 최종 기준으로 사용하고 `step.schedule`은 주차·기간을 묶는 메타데이터로만 사용한다. `sourceRowIds/sourceTrace`는 registry와 QA 추적에 보존하되 사용자 화면에는 유용한 detail과 원문 링크만 노출한다.

## 절대 하지 말 것

- 원문에 없는 Step/Item/방문 시간/장보기/운동 기록을 추가하지 않는다.
- 먹은 양, 통증, 이상반응, 견적, 사진 증거를 새 Field로 만들지 않는다.
- `ready_second_wave`를 첫 canary에 섞지 않는다.
- creator/commercial 상세 본문과 이미지를 복제하지 않는다.
- 면허 갱신기간을 FlowMe가 계산하거나 공식 판단처럼 표시하지 않는다.
- direct Calendar/Sheets OAuth 연동으로 범위를 넓히지 않는다. 기존 export만 사용한다.

## UI 원칙

- `/flows` 카드에서 저장 후 생기는 artifact를 5초 안에 알 수 있어야 한다.
- Map은 child Flow를 구분하고, 하나의 거대 완벽 가이드로 합치지 않는다.
- Step은 접을 수 있어야 하고 모바일에서 한 콘텐츠씩 집중해 볼 수 있어야 한다.
- Item을 먼저, memo/detail/source는 다음 깊이에 둔다.
- 내부 점수·sourceTrace·권리 검토 문구는 사용자 화면에 노출하지 않는다.

## Export 원칙

- calendar: `itemTitle`, `schedule`, `memo/detail`, `sourceUrl`
- checklist: Step 제목 아래 Item 순서를 보존
- sheet: bundle, flow, step, itemTitle, schedule, completion, memo, sourceUrl
- source link와 주의 문구는 export 설명에서도 유실되지 않아야 한다.

## 완료 QA

- 첫 canary 5개만 internal 상태로 보인다.
- 첫 canary 5개를 펼쳤을 때 총 49개 FlowItem이 보존된다.
- 각 Bundle의 Flow/Step/Item 수가 JSON `counts`와 일치한다.
- 모든 Item의 `sourceRowIds`가 실제 `sourceRows`에 존재한다.
- 모바일 390px에서 가로 스크롤, 제목 잘림, 카드 중첩, 버튼 겹침이 없다.
- 캘린더 반복: 에어컨 4주, 도시락 월~금, 부산 3일 offset이 정확하다.
- 여행 준비물 선택 항목과 공식 출국 절차가 한 Flow로 섞이지 않는다.
- source 링크가 새 탭에서 열리고 memo/detail에도 남는다.
- review 문구, 점수, permission note가 사용자용 카드에 나오지 않는다.
- `npm test`, `npm run build`, 관련 E2E와 모바일 브라우저 검증을 통과한다.
