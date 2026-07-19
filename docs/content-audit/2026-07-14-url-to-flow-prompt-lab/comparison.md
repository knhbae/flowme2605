# URL-to-FLOW Prompt Lab v1 비교 결과

Date: 2026-07-14<br>
Evidence: 기존 canonical 콘텐츠 10건 + negative gate 2건, 외부 API 없음

## 한 문장 결론

SourceRow-only 입력에서도 prompt v0.2는 12/12 구조 유효, SourceRow accounting 100%, negative gate 2/2를 달성했다. 양성 10건의 블라인드 proxy review 평균은 4.41/5이고 Item keep rate는 100%였다. 다만 사람 검토 시간, 실제 저가/고가 모델, latency, token, cost는 아직 측정하지 않았다.

## 첫 예시

`극세 필터는 4주에 한 번 청소` → `극세 필터 청소하기` → 완료 기준 `청소를 마쳤다` → Checklist와 Calendar 후보. 실제 시작일과 반복 규칙은 규칙 계층과 사람 review가 확정한다.

## 라운드 비교

| Round | Prompt | 유효 output | 유효 run | 해석 |
| --- | --- | ---: | ---: | --- |
| 1 | v0.1 | 1/12 | 0/3 | enum·nested shape가 prompt에 충분히 고정되지 않음 |
| 2 | v0.2 | 12/12 | 3/3 | exact enum과 필드 모양만 보강해 전건 통과 |
| 3 | v0.2 stability | 7/7 | 2/2 | 대표 5건 + negative 2건 구조 일치 6/7 |

Round 3에서 caseSetVersion 접두어를 빠뜨린 orchestration envelope 2건은 raw evidence로 보존하고, 같은 Round 안에서 독립 재실행한 batch F/G만 안정성 판정에 사용했다. 출력 자체는 유효했지만 run 증거 계약을 어겼으므로 제외했다.

안정성 1건의 차이는 case-05가 Round 3에서 `calendar:blocked` 설명을 추가한 것이다. status, primary artifact, Item 수, SourceRow 묶음, 실제 applicable 목적지는 같았고 exact projection plan만 달랐다. 따라서 exact 구조 일치율은 6/7(85.7%)로 종료 기준 80%를 넘지만, 완전 동일 7/7로 과장하지 않는다.

## 품질 gate

| 지표 | 결과 | 목표 | 판정 |
| --- | ---: | ---: | --- |
| Schema valid | 12/12 | 100% | PASS |
| SourceRow accounting | 100% | 100% | PASS |
| Unsupported action/date/fact 검출 | 0건 | 0건 | PASS (validator + proxy review 범위) |
| Negative gate | 2/2 | 2/2 | PASS |
| Item keep rate | 100% | 80%+ | PASS |
| 전체 품질 평균 | 4.41/5 | 3.5+ | PASS |
| 실행 명확성 평균 | 4/5 | 4.0+ | PASS |
| 원문 충실도 평균 | 4.9/5 | 4.0+ | PASS |
| 출처·안전 평균 | 4.4/5 | 4.0+ | PASS |
| 사례별 content quality gate | 8/10 | 80%+ | PASS |

사례 06과 09는 Item을 유지할 수 있지만 Execution Clarity가 3점이라 문구 수정 대상으로 남았다. 사람의 교정 시간은 측정하지 않았으므로 전체 `USABLE` 판정은 하지 않았다.

## 12개 사례

| Case | 원 콘텐츠 형태 | SourceRow | 교정 FLOW / gate | 평균 | 판정 |
| --- | --- | --- | --- | ---: | --- |
| case-01 | 건강검진 D-7 타임라인 | `row-checkup-booking` 검진 대상 및 예약 확인<br>`row-checkup-visit` 검진기관 방문 | 건강검진 대상·예약 확인과 기관 방문 | 4.29 | content_gate_pass |
| case-02 | 에어컨 필터 4주 청소 | `row-aircon-filter-4week` 극세 필터 4주에 한 번 청소 — 먼지 제거, 물세척, 그늘 건조 | 에어컨 극세 필터 4주 청소 | 4.57 | content_gate_pass |
| case-03 | 해외여행 준비물 체크리스트 | `row-pack-passport` 여권<br>`row-pack-connectivity` 데이터 유심 | 해외여행 준비물 챙기기 | 4.57 | content_gate_pass |
| case-04 | 고용24 취업지원 시작 절차 | `row-work24-register` 구직 신청 등록<br>`row-work24-apply` 취업지원 서비스 신청 | 고용24 취업지원 시작 절차 | 4.43 | content_gate_pass |
| case-05 | K-MOOC 15주 진도표 | `row-kmooc-week-01` 1주차 강의와 퀴즈<br>`row-kmooc-week-02` 2주차 강의와 퀴즈 | 제자백가 강좌 1-2주차 진도표 | 4.57 | content_gate_pass |
| case-06 | 레시피 영상 실행 메모 | `row-recipe-video-resource` 선택한 레시피 영상 | 선택한 레시피 영상 실행 메모 | 4 | revise |
| case-07 | 중고차 후보 결정·보류 | `row-used-car-decision` 차량 이력과 상태를 확인한 뒤 구매 판단 | 중고차 후보 구매·보류 판단 기록 | 4.71 | content_gate_pass |
| case-08 | 영유아 건강검진 준비 증빙·주의 | `row-infant-checkup-prep` 예약과 문진표 준비 | 영유아 건강검진 준비 상태 확인 | 4.57 | content_gate_pass |
| case-09 | 30일 사진 prompt queue · Day 1-2 contract sample | `row-photo-day-01` Day 1 prompt<br>`row-photo-day-02` Day 2 prompt | Canon 사진 챌린지 Day 1-2 | 4 | revise |
| case-10 | 자동차 정기검사 날짜 창 | `row-inspection-window` 정기검사 유효기간<br>`row-inspection-agency-phases` 검사기관 내부 검사 단계 | 자동차 정기검사 | 4.43 | revise |
| case-11 | 원문 row가 없는 파일 후보 | SourceRow 없음 | missing_source_rows / source_import_required | N/A | source_import_required |
| case-12 | 한국 적용성이 확인되지 않은 민감 출산 준비 | SourceRow 없음 | locale_applicability_unverified / hold | N/A | hold |

## 구조 해석

- Evidence minimum: `SourceRow`
- Execution minimum: 상태와 완료 기준을 가진 `Item`
- Optional grouping: `Step`
- Projection: Calendar/ICS, Checklist/Todo, Sheet, Memo
- LLM ownership: 사용자 일, Item 묶기, 제목, 완료 기준, 목적지 후보
- Rule ownership: ID, 상태, 날짜 해석, 반복 규칙, SourceRow accounting, export 생성

따라서 ICS나 checklist가 FLOW의 최소단위가 아니다. 둘은 같은 Item을 각 도구에 맞게 옮기는 projection이다.

## 아직 증명하지 않은 것

- production URL fetch/crawl/PDF·영상 추출
- 실제 cheap/premium 모델 품질·latency·token·cost 비교
- 사람 reviewer의 교정 시간과 실제 사용자 실행 성공률
- DB, 저장·발행, 계정·권한, 재처리 queue

## 다음 실험

동일한 cases v1, prompt v0.2, schema/validator v1을 잠근 뒤 실제 저가 모델과 고가 모델을 각 사례 3회 실행한다. provider-reported token, 외부 타이머 latency, 실행일 가격표 기반 계산 cost를 기록하고, 동일한 블라인드 리뷰 순서로 품질·keep rate·교정 시간을 비교한다.

## 산출물

- [슬라이드형 HTML](./report.html)
- [보고서 데이터](./report-data.json)
- [Prompt v0.2](../../specs/2026-07-14-url-to-flow-prompt-lab/prompt-v0.2.md)
- [리뷰 기준](../../specs/2026-07-14-url-to-flow-prompt-lab/review-rubric.md)
- [시험 cases](../../specs/2026-07-14-url-to-flow-prompt-lab/cases-v1.json)
