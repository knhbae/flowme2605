# 엄선 원컨텐츠 9개 앱 적용 QA 체크리스트

## 데이터 로딩

- [ ] [2026-07-01-curated-source-app-seed-v1.json](./2026-07-01-curated-source-app-seed-v1.json)이 JSON 파싱된다.
- [ ] `contentBundles.length === 9`이다.
- [ ] 모든 bundle에 `bundleId`, `title`, `category`, `status`, `sourceUrls`, `recommendedFlowId`, `flows`가 있다.
- [ ] 모든 Flow에 Step이 1개 이상 있다.
- [ ] 모든 Step에 `itemTitle`, `memo`, `sourceTrace`가 있다.
- [ ] `memoHint` 필드가 없다.

## 9개 콘텐츠 노출

- [ ] 1. 펀맘 공부 루틴 카드가 보이고 권장 Flow `funmom-hangul-2w`가 열린다.
- [ ] 2. 오픽 모의고사 계획 카드가 보이고 권장 Flow `opic-2w`가 열린다.
- [ ] 3. 초기 이유식 식단표 카드가 보이고 권장 Flow `baby-150-start`가 열린다.
- [ ] 4. 독서 루틴 카드가 보이고 권장 Flow `reading-book-finish`가 열린다.
- [ ] 5. 신차 구매 카드가 보이고 권장 Flow `new-car-7-step`가 열린다.
- [ ] 6. 영유아 예방접종 카드가 보이고 권장 Flow `vaccination-official`가 열린다.
- [ ] 7. 이사 준비 카드가 보이고 권장 Flow `moving-dday`가 열린다.
- [ ] 8. 결혼 준비 카드가 보이고 권장 Flow `wedding-timeline`가 열린다.
- [ ] 9. Allblanc 홈트 루틴 카드가 보이고 권장 Flow `homefit-morning-2w`가 열린다.

## 모바일 확인

- [ ] 390px 폭에서 콘텐츠 카드가 좌우 스크롤 없이 보인다.
- [ ] Flow 상세에서 Step 제목, Item, memo/detail, source 링크가 한 화면 폭 안에서 줄바꿈된다.
- [ ] JSON 원문을 사용자가 직접 읽어야 하는 화면이 없다.
- [ ] 긴 source URL은 버튼 또는 줄바꿈 가능한 텍스트로 처리된다.
- [ ] Step 목록이 길어도 접기/펼치기 또는 섹션 이동으로 탐색할 수 있다.

## Item 과밀도 확인

- [ ] Item은 체크할 최소 행동만 담는다.
- [ ] 수량, 상태, 특이사항, 원문 제목, URL은 memo/detail에 있다.
- [ ] 먹은 양, 통증, 이상반응, 견적 세부를 별도 Field로 만들지 않았다.
- [ ] 한 Step에 Item이 너무 많으면 원문상 독립 체크가 맞는지 다시 본다.

## Memo / Detail 확인

- [ ] memo는 사용자에게 도움이 되는 원문 기반 정보만 담는다.
- [ ] generic fallback 문구가 반복되지 않는다.
- [ ] source row 제목과 URL이 필요한 콘텐츠는 memo/detail에서 확인 가능하다.
- [ ] 내부 review, 기획, audit 문구가 사용자용 memo에 섞이지 않는다.

## Source 링크 확인

- [ ] bundle source URL이 카드 또는 상세에 보인다.
- [ ] Step source URL이 있는 경우 Step에서 우선 노출된다.
- [ ] 링크 클릭 시 새 탭 또는 외부 브라우저로 열린다.
- [ ] sourceTrace는 관리자/검토용으로만 상세 노출된다.

## Export 구조 확인

- [ ] Calendar export는 Step 기준 날짜/반복과 `itemTitle`을 사용한다.
- [ ] Checklist export는 Flow > Step > Item 구조를 유지한다.
- [ ] Sheet export는 bundle, flow, step, itemTitle, memo, sourceUrl, sourceTrace, status를 포함한다.
- [ ] Export에도 review 문구와 generic memoHint가 들어가지 않는다.

## Regression 방지

- [ ] 기존 public `/f/[slug]` route가 깨지지 않는다.
- [ ] 기존 My Flow 저장/체크 동선이 깨지지 않는다.
- [ ] 기존 source-backed map 저장 로직과 storage key가 충돌하지 않는다.
- [ ] 기존 tests가 앱 seed 추가로 불필요하게 snapshot 변경되지 않는다.
- [ ] docs:check가 통과한다.

## 최종 승인 전 확인

- [ ] 사용자에게 “바로 시작 가능 / 일부 보강 후 시작 / 자료 보강 후 시작” 상태가 구분되어 보인다.
- [ ] 앱 화면에 내부 검토용 문구가 보이지 않는다.
- [ ] 앱 구현 세션 결과물은 이 handoff seed와 다른 내용을 임의로 추가하지 않았음을 설명할 수 있다.
