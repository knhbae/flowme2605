# FlowMe 콘텐츠 포트폴리오 앱 직전 검토

작성일: 2026-07-11<br>
상태: 앱 코드·seed 변경 전, source-backed handoff 준비 완료

## 결론

기존 카탈로그의 가장 큰 공백이던 여행·식사·일/커리어·취미/반려를 실제 원문 row로 채웠다. 집·살림은 이사 편중을 에어컨 반복 관리로 넓혔고, 건강·운동은 영상 1개가 아닌 8주 프로그램을 추가했으며, 돈·서류·구매에는 정기 면허 갱신을 준비했다.

이번 결과는 앱 공개 승인이 아니다. `ready_for_internal_canary` 5개와 `ready_second_wave` 3개를 분리했고, 사용자용 데이터는 JSON의 `contentBundles`, 내부 판정과 점수 코멘트는 `reviewRecords`에 둔다.

## 산출물

- [정규화 데이터](./2026-07-11-content-portfolio-preapp-v1.json)
- [모바일 검토판](./2026-07-11-content-portfolio-preapp-board-ko.html)
- [앱 세션 handoff](./2026-07-11-content-portfolio-preapp-handoff-ko.md)

## 준비 결과

| 우선 | Bundle | 생활영역 | Flow / Step / Item | 판정 | 핵심 근거 |
|---:|---|---|---:|---|---|
| 1 | 해외여행 준비 | 여행·외출 | 2 / 4 / 25 | ready_for_internal_canary | 첫 canary 포함. 준비물과 공식 출국절차는 서로 다른 child Flow로 유지한다. |
| 2 | 친구와 부산 2박 3일 뚜벅이 여행 | 여행·외출 | 1 / 3 / 12 | ready_for_internal_canary | 첫 canary 포함. 여행 일정형과 제작자/사용자 공유 가능성을 함께 검증한다. |
| 3 | 직장인 일주일 도시락 | 식사·장보기 | 1 / 5 / 5 | ready_for_internal_canary | 첫 canary 포함. 메뉴 row를 일정으로 옮기는 식사 카테고리 기준점으로 사용한다. |
| 4 | 면접 전날 준비 | 일·커리어 | 1 / 6 / 6 | ready_for_internal_canary | 첫 canary 포함. 커리어 카테고리의 짧은 D-1 실행물로 검증한다. |
| 5 | 운전면허 갱신·적성검사 | 돈·서류·구매 | 2 / 6 / 6 | ready_second_wave | 두 번째 wave. 2026년 기간 변경과 70세 이상 분기를 앱 카피로 오인 없이 표현한 뒤 적용한다. |
| 6 | 에어컨 필터 4주 청소 | 집·살림 | 1 / 1 / 1 | ready_for_internal_canary | 첫 canary 포함. 반복 관리 Flow의 가장 단순하고 근거가 강한 기준점으로 사용한다. |
| 7 | 5km 대회 8주 준비 | 건강·운동 | 1 / 8 / 29 | ready_second_wave | 두 번째 wave. 29회 원문 프로그램을 유지하되 건강 민감 source 경계를 먼저 검토한다. |
| 8 | 새끼 고양이 맞이 첫 주 | 취미·반려 | 1 / 5 / 10 | ready_second_wave | 두 번째 wave. 반려 카테고리 대표 후보지만 브랜드·건강 경계와 공개 권리 검토가 필요하다. |

총계: 8 Bundle, 10 Flow, 38 Step, 94 Item, 101 source row.

## 이번에 보강한 기준

기존 Source-to-Flow Conversion Gate는 그대로 둔다. `flow-content-source-selection.md`에 아래 포트폴리오 승격 층만 추가했다.

1. `lifeArea`, `planningPattern`, `portfolioRole`을 서로 다른 내부 메타데이터로 관리한다.
2. 점수만 높다고 앱 직전 상태로 올리지 않는다.
3. source row 전수, Item/Field/Memo 경계, omission 사유, export 목적지, risk/rights, 점수별 코멘트, 모바일 검토판이 모두 있어야 `ready_for_internal_canary`다.
4. 앱 삽입, 내부 canary, 공개 노출, 실제 사용자 검증을 서로 다른 상태로 둔다.

## 현재 앱 타입 호환성

- runtime type 변경은 필요 없다.
- Bundle은 source-backed Map/registry, Flow는 FlowBundle, Step은 FlowSection, Item은 FlowItem으로 대응한다.
- 기존 2026-07-01 adapter처럼 Step 하나를 FlowItem 하나로 축약하지 않고 Step.items 배열을 전부 펼친다.
- 날짜는 day_offset, 주말 범위는 date_window, 에어컨 4주 반복은 repeat_rule로 변환한다.
- 원문에 정확한 날짜가 없는 새끼 고양이 '데려오기 전' 항목은 날짜 없는 todo로 유지한다.

## 콘텐츠별 핵심 판단

### 해외여행 준비

- 판정: `ready_for_internal_canary`
- 사용자 결과: 해외여행 짐 싸기 → checklist, 공항 출국 순서 → checklist
- 평균 품질: 4.75/5
- 앱 직전 준비도: 94/100 — 모든 row, sourceTrace, 최소 setup, export 목적지가 확정됐다. 공개 전 상업 원문 권리 검토만 남는다.
- 삭제/묶음: KKday 상품 카드·가격·예약 CTA는 사용자 Item에서 제외 / 짐싸기 팁 6개는 별도 체크 Item이 아니라 숙소 확인 Step 메모에 묶음 / 항공사별 수하물·액체류 세부 규정은 공식 원문 링크에서 확인

### 친구와 부산 2박 3일 뚜벅이 여행

- 판정: `ready_for_internal_canary`
- 사용자 결과: 부산 2박 3일 뚜벅이 코스 → calendar
- 평균 품질: 4.75/5
- 앱 직전 준비도: 97/100 — 12개 장소 row와 날짜 offset이 완성됐고 임의 방문 시간은 만들지 않는 경계도 명확하다.
- 삭제/묶음: 원문에 없는 방문 시각·체류시간·교통편은 생성하지 않음 / 장소 설명과 사진 전문은 복제하지 않고 원문 링크로 유지 / 광안리/민락수변공원과 다대포/고우니생태길은 원문 묶음 그대로 한 Item

### 직장인 일주일 도시락

- 판정: `ready_for_internal_canary`
- 사용자 결과: 월~금 도시락 식단 → calendar
- 평균 품질: 4.75/5
- 앱 직전 준비도: 93/100 — 5개 요일과 메뉴·재료 수준이 모두 확인됐다. 공개 시 레시피 저작권 경계를 지키면 된다.
- 삭제/묶음: 원문에 없는 장보기 목록·주말 일괄 조리·소분 Step은 생성하지 않음 / 월·화·금의 레시피 전문 대신 재료와 짧은 요약만 memo에 둠 / 수·목은 원문 수준대로 메뉴 설명만 제공

### 면접 전날 준비

- 판정: `ready_for_internal_canary`
- 사용자 결과: 면접 D-1 체크 → hybrid
- 평균 품질: 4.75/5
- 앱 직전 준비도: 95/100 — 모든 섹션과 하위 체크를 확인했고 홍보 CTA 제거와 D-1 export가 확정됐다.
- 삭제/묶음: 컨디션 관리와 당일 준비물을 전날 마무리 한 Item으로 묶음 / 캔디데이트 면접PT 서비스 CTA 제외 / 세부 예상 답변은 사용자가 memo에 적고 별도 입력 필드를 만들지 않음

### 운전면허 갱신·적성검사

- 판정: `ready_second_wave`
- 사용자 결과: 1종·70세 이상 2종 적성검사 → checklist, 2종 면허 갱신 → checklist
- 평균 품질: 4.50/5
- 앱 직전 준비도: 86/100 — source row는 완성됐지만 개인 기간 자동계산 금지와 연령 분기 copy를 앱 QA에서 반드시 확인해야 한다.
- 삭제/묶음: 개인 갱신기간 자동 계산 기능은 만들지 않음 / 시력 기준·75세 이상 세부 의료/교육 요건은 Item이 아니라 공식 원문 확인 대상 / 과태료·취소 정보는 경고 memo로만 두고 별도 기록 필드를 만들지 않음

### 에어컨 필터 4주 청소

- 판정: `ready_for_internal_canary`
- 사용자 결과: 극세 필터 4주 청소 → calendar
- 평균 품질: 5.00/5
- 앱 직전 준비도: 98/100 — 입력 1개, 반복 1개, Item 1개, 공식 방법 memo로 스키마가 가장 안정적이다.
- 삭제/묶음: 전문세척/일반세척 비교와 서비스 전화·판매 CTA 제외 / 진공청소·물세척·그늘 건조는 별도 Item이 아니라 방법 memo / 사용자 상태·사진·청소 증거 필드 없음

### 5km 대회 8주 준비

- 판정: `ready_second_wave`
- 사용자 결과: 5km 대회 8주 훈련표 → calendar
- 평균 품질: 4.63/5
- 앱 직전 준비도: 86/100 — 29회 row와 schedule은 완성됐다. creator 건강 프로그램이라 첫 batch 뒤에 넣는 것이 안전하다.
- 삭제/묶음: 워밍업·쿨다운·통증 중단 안내는 Flow memo 한 곳에만 둠 / 통증·어지러움 별도 필드 없음. 필요 시 사용자 memo에 기록 / 원문에 없는 페이스, 심박, 세트, 기록 목표는 생성하지 않음

### 새끼 고양이 맞이 첫 주

- 판정: `ready_second_wave`
- 사용자 결과: 새끼 고양이 첫 주 적응 → hybrid
- 평균 품질: 4.50/5
- 앱 직전 준비도: 81/100 — 행동 row와 묶음은 끝났지만 브랜드 source, 수의학 경계, 저작권을 첫 canary 뒤에 재검토해야 한다.
- 삭제/묶음: 맞춤 사료 찾기, 제품 CTA, 브랜드 영양 설명 제외 / 접종·구충·영양은 기록 필드가 아니라 수의사 방문 memo에만 둠 / 원문에 정확한 날짜가 없는 '며칠 뒤'는 임의 D+3 등으로 바꾸지 않음


## 첫 canary 권장

1. 에어컨 필터 4주 청소
2. 친구와 부산 2박 3일 뚜벅이 여행
3. 면접 전날 준비
4. 직장인 일주일 도시락
5. 해외여행 준비

이 다섯 개는 여행 일정, 여행 준비, 식단 표, D-1 체크, 고정 반복이라는 서로 다른 artifact를 검증한다. 면허·러닝·새끼 고양이는 데이터가 부족해서가 아니라 법/건강/브랜드 경계를 첫 batch보다 더 엄격히 확인해야 하므로 두 번째 wave다.

## 남은 판단

- creator/commercial 원문의 row 제목과 짧은 memo를 공개 서비스에서 사용하는 범위를 확인한다.
- 2026 면허 분기와 70세 이상 2종 안내가 사용자를 잘못된 Flow로 보내지 않는지 앱 copy QA를 한다.
- 러닝과 반려 Flow는 memo 이외의 건강 기록 필드를 추가하지 않는다.
- 앱 구현 후에도 실제 저장·export·check 관찰 전에는 validated라고 부르지 않는다.
