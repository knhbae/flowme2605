# URL-to-FLOW Prompt Lab v1 비교 결과

Date: 2026-07-15<br>
Evidence: 기존 canonical 콘텐츠 10건 + negative 2건, 외부 API 없음<br>
Input: Source metadata + SourceRows + canonical userJob

## 한 문장 결론

prompt v0.2는 Round 2에서 구조 12/12와 직접 블라인드 리뷰 품질 gate를 통과했지만, Round 3 핵심 결정 재현성은 3/7(42.9%)로 기준 6/7 이상에 미달했다. 따라서 Prompt Lab v1은 미완료이며 현재 Backend No-Go다.

## 첫 예시

“극세 필터는 4주에 한 번 청소” → “극세 필터 청소하기” → 완료 기준 “청소를 마쳤다” → Checklist와 Calendar 후보. 단, 실제 시작일과 반복 규칙은 원문 근거와 규칙 계층이 확정한다.

## 세 번의 반복

| Round | Prompt | 유효 output | 유효 run | 해석 |
| --- | --- | ---: | ---: | --- |
| 1 | v0.1 | 1/12 | 0/3 | exact enum·nested shape 계약이 불충분했다. 질적 리뷰 증거에서는 제외했다. |
| 2 | v0.2 | 12/12 | 3/3 | 같은 12건이 strict schema와 SourceRow accounting을 통과했다. |
| 3 | v0.2 stability | 7/7 | 2/2 | 대표 양성 5건 + negative 2건 중 핵심 결정 일치 3/7. |

batch-d/batch-e는 구 caseSet 식별자 url-to-flow-prompt-lab-cases-v1를 envelope에 기록했다. 현재 flowme-url-to-flow-prompt-lab-cases-v1.1과 불일치하고 필수 flowme- prefix도 빠져 run 계약상 제외했다. output 자체의 schema 유효성과 별개인 provenance 문제이며 raw evidence는 보존했다.

4건의 core-decision mismatch: case-01(primary artifact, projection applicability); case-05(Item source grouping/intent/completion/candidate presence); case-06(projection applicability); case-10(Item source grouping/intent/completion/candidate presence). 일치율은 3/7(42.9%)다. 이 signature는 status, disposition, artifact/pattern, Item의 SourceRow 묶음·intent·completion mode·candidate 존재 여부, omitted row, projection applicability만 비교하며 제목·완료 문구 같은 copy-level 또는 full semantic exact 일치를 뜻하지 않는다.

## 완료 gate

| 지표 | 결과 | 목표 | 판정 |
| --- | ---: | ---: | --- |
| Schema valid | 12/12 | 100% | PASS |
| SourceRow accounting | 100% | 100% | PASS |
| Unsupported action/date/repeat/fact | 0 signals | 0 | PASS |
| Negative disposition | 2/2 | 2/2 | PASS |
| Item keep rate | 100% | >=80% | PASS |
| Seven-axis average | 4.6/5 | >=3.5 | PASS |
| Execution Clarity | 4.1/5 | >=4.0 | PASS |
| Content Fidelity/Coverage | 4.7/5 | >=4.0 | PASS |
| Source/Safety Separation | 4.7/5 | >=4.0 | PASS |
| Positive case quality gates | 10/10 | >=80% | PASS |
| Round 3 core-decision stability | 3/7 (42.9%) | >=80% (at least 6/7) | FAIL |

완료 gate는 11개 중 10개가 통과했다. 실패 gate는 round_3_stability다. 양성 10건의 직접 블라인드 proxy review 평균은 4.6/5, Item keep rate는 100%다. 사람 검토 시간과 실제 cheap/premium 모델의 latency·token·cost는 측정하지 않았다.

## 12개 사례

| Case | 원 콘텐츠 형태 | SourceRow | 교정 FLOW / gate | 평균 | 판정 |
| --- | --- | --- | --- | ---: | --- |
| case-01 | 건강검진 D-7 타임라인 | `row-checkup-booking` 검진 대상 및 예약 확인<br>`row-checkup-visit` 검진기관 방문 | 건강검진 확인과 방문 | 4.57 | content_gate_pass |
| case-02 | 에어컨 필터 4주 청소 | `row-aircon-filter-4week` 극세 필터 4주에 한 번 청소 — 먼지 제거, 물세척, 그늘 건조 | 극세 필터 4주 청소 루틴 | 4.71 | content_gate_pass |
| case-03 | 해외여행 준비물 체크리스트 | `row-pack-passport` 여권<br>`row-pack-connectivity` 데이터 유심 | 해외여행 필수 준비물 챙기기 | 5 | content_gate_pass |
| case-04 | 고용24 취업지원 시작 절차 | `row-work24-register` 구직 신청 등록<br>`row-work24-apply` 취업지원 서비스 신청 | 고용24 구직 등록과 취업지원 신청 | 4.71 | content_gate_pass |
| case-05 | K-MOOC 15주 진도표 | `row-kmooc-week-01` 1주차 강의와 퀴즈<br>`row-kmooc-week-02` 2주차 강의와 퀴즈 | 제자백가 강좌 1·2주차 진도 기록 | 4.71 | content_gate_pass |
| case-06 | 레시피 영상 실행 메모 | `row-recipe-video-resource` 선택한 레시피 영상 | 선택한 레시피 영상 실행 | 4.43 | content_gate_pass |
| case-07 | 중고차 후보 결정·보류 | `row-used-car-decision` 차량 이력과 상태를 확인한 뒤 구매 판단 | 중고차 후보 구매 판단 | 4.29 | content_gate_pass |
| case-08 | 영유아 건강검진 준비 증빙·주의 | `row-infant-checkup-prep` 예약과 문진표 준비 | 영유아 건강검진 준비 확인 | 4.71 | content_gate_pass |
| case-09 | 30일 사진 prompt queue · Day 1-2 contract sample | `row-photo-day-01` Day 1 prompt<br>`row-photo-day-02` Day 2 prompt | Day 1·Day 2 사진 프롬프트 | 4.29 | content_gate_pass |
| case-10 | 자동차 정기검사 날짜 창 | `row-inspection-window` 정기검사 유효기간<br>`row-inspection-agency-phases` 검사기관 내부 검사 단계 | 자동차 정기검사 유효기간 확인 | 4.57 | content_gate_pass |
| case-11 | 원문 row가 없는 파일 후보 | SourceRow 없음 | missing_source_rows / source_import_required | N/A | source_import_required |
| case-12 | 한국 적용성이 확인되지 않은 민감 출산 준비 | SourceRow 없음 | locale_applicability_unverified / hold | N/A | hold |

## 데이터 구조 해석

- 입력 근거: Source metadata + SourceRows + canonical userJob
- 실행 최소단위: 상태와 완료 기준을 가진 Item
- 선택적 묶음: Step
- 목적지 표현: Calendar/ICS, Checklist/Todo, Sheet, Memo projection
- LLM 소유: Item 묶기, 제목, 완료 기준, 목적지 후보
- 규칙 소유: ID, 상태, 날짜 해석, 반복 규칙, SourceRow accounting, export 생성

따라서 ICS나 checklist가 FLOW의 최소단위가 아니다. 둘은 같은 Item을 각 도구 문법으로 옮기는 projection이다.

## 리뷰 증거 경계

- Round 1: 구조 실패를 보여 주는 raw validator 증거만 사용
- Round 2: 예상 정답과 모델 신원을 숨긴 fresh subagent 직접 리뷰 12건만 사용
- observed user나 human reviewer 증거는 없음
- 검증된 실제 provider/model identity, latency, token, cost는 not_available
- raw run의 provider/model 값은 비식별 orchestration label(codex-subagent-runtime · not_available · provider-neutral / codex-subagent-runtime · not_available)이며 실제 provider/model 증거로 취급하지 않음

## 아직 증명하지 않은 것

- production URL fetch/crawl/PDF·영상 추출
- 실제 cheap/premium 모델 품질·latency·token·cost 비교
- 사람 reviewer의 교정 시간과 실제 사용자 실행 성공률
- DB, 저장·발행, 계정·권한, 재처리 queue

## 다음 결정

세 번의 반복 한도를 모두 사용했으므로 v0.3이나 4회차를 이번 v1에 소급해 추가하지 않는다. 사용자가 Prompt Lab v2를 승인하면 deterministic tie-break 규칙을 추가하고, case-01·05·06·10과 unseen/metamorphic 사례로 한 번 더 안정성을 검증한다. 그 gate를 통과한 뒤에만 cheap/premium provider 비교와 backend 착수를 검토한다.

## 산출물

- [슬라이드형 HTML](./report.html)
- [보고서 데이터](./report-data.json)
- [Prompt v0.2](../../specs/2026-07-14-url-to-flow-prompt-lab/prompt-v0.2.md)
- [리뷰 기준](../../specs/2026-07-14-url-to-flow-prompt-lab/review-rubric.md)
- [시험 cases](../../specs/2026-07-14-url-to-flow-prompt-lab/cases-v1.json)
