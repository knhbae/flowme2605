# URL-to-FLOW Prompt Lab v1 — SourceRow-only corrected result

**기간:** 2026-07-15–2026-07-18  
**결론:** Prompt Lab v1 **미완료**, production backend **No-Go**

## 30초 예시

- 성공 예시: `극세 필터 4주에 한 번 청소 / 먼지 제거, 물세척, 그늘 건조` 한 행은 한 실행 Item과 literal `4주에 한 번` schedule 후보로 안정적으로 옮길 수 있었다.
- 실패 예시: `여권 / 데이터 유심` 두 명사형 check 행을 모델이 `여행 준비`로 넓혔다. 실용적으로는 그럴듯하지만 SourceRow-only 근거 계약에서는 준비 행동과 날짜 준비 패턴이 추가된 것이다.
- 구조 결론: negative preflight는 2/2였지만 sparse SourceRow의 의미 분류·Item wording이 흔들렸고, generator에는 canonical case ID도 남아 입력 계약을 완전히 지키지 못했다.

## 오염된 preflight와 교정 lane

2026-07-14 rich-packet 결과는 positive 10/10에서 `userJob`이 hidden canonical user need와 같았고 full source metadata/semantic ID도 보였다. 따라서 schema·validator 사전실험으로만 보존하며 corrected completion 계산에서 제외한다.

교정 lane은 deterministic preflight 뒤 positive 10건에 SourceRow `rowType/title/detail/order`와 opaque provenance ID를 전달했다. 다만 generator-visible `caseId`는 canonical `case-01...10`으로 남았고, case-11/12만 모델을 호출하지 않았다.

## 라운드 결과

| Round | Schema | SourceRow | Negative | Item keep | Unsupported | 7축 평균 | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 · v1.0 | 2/12 | 16/16 | 2/2 | 미측정 | 미측정 | 미측정 | required output contract 결함 |
| 2 · v1.1 | 12/12 | 16/16 | 2/2 | 73.3% | 15 | 4.49 | keep/unsupported gate 실패 |
| 3 · v1.1 | 11/12 | 15/16 | 2/2 | 81.3% | 7 | 4.36 | protocol-deviating output comparison |

Round 2↔3 기록 출력의 core signature exact match는 전체 5/12 (41.7%), model-generated positive 3/10 (30.0%), deterministic negative 2/2다. 실행 로그에 packet hash와 fresh-context 증거가 없어 “같은 입력의 모델 안정성”으로 해석할 수 없다.

## 케이스별 요약

| Case | SourceRows | Round 2 artifact | Validator | Blind verdict | R2↔R3 |
| --- | --- | --- | --- | --- | --- |
| case-01 | 검진 대상 및 예약 확인 / 검진기관 방문 | checklist | PASS | keep | same |
| case-02 | 극세 필터 4주에 한 번 청소 | calendar | PASS | keep | changed |
| case-03 | 여권 / 데이터 유심 | checklist | PASS | edit | changed |
| case-04 | 구직 신청 등록 / 취업지원 서비스 신청 | checklist | PASS | keep | same |
| case-05 | 1주차 강의와 퀴즈 / 2주차 강의와 퀴즈 | sheet | PASS | keep | changed |
| case-06 | 선택한 레시피 영상 | memo | PASS | edit | changed |
| case-07 | 차량 이력과 상태를 확인한 뒤 구매 판단 | checklist | PASS | keep | changed |
| case-08 | 예약과 문진표 준비 | checklist | PASS | keep | changed |
| case-09 | Day 1 prompt / Day 2 prompt | checklist | PASS | edit | same |
| case-10 | 정기검사 유효기간 / 검사기관 내부 검사 단계 | todo | PASS | edit | changed |
| case-11 | preflight negative | - | PASS | keep | same |
| case-12 | preflight negative | - | PASS | keep | same |

## 완료 gate

통과: SourceRow semantic-field 경계, compact schema, bare validator equivalence, Round 2 schema/accounting/negative, 7축 평균과 Execution/Fidelity/Safety.  
실패: sourceRowOnlyInput, protocolConformance, round2ItemKeepRate, round2UnsupportedZero, round3Schema, round3SourceRowAccounting, round3Review.

## 실험 프로토콜 한계

- Round 1은 preregistered 4+4+4가 아니라 4+4+2+2 envelope로 저장됐다.
- Round 2가 모든 gate를 통과한 뒤에만 Round 3를 실행한다는 선행조건을 어겼다. protocol note가 이를 공개하지만 편차를 없애지는 않는다.
- generator-visible case ID가 opaque remap이 아니었고, Round 3 로그는 packet/prompt hash나 fresh context를 증명하지 않는다.
- prompt는 single resource에 `use_resource`를 허용하지만 case-06은 그 표현으로 edit, case-09는 keep 판정을 받아 Item keep 73.3%는 reviewer-policy에 민감하다. unsupported=15 실패는 이 재판정과 무관하다.

## 모델·비용 증거 경계

이번 실행은 현재 세션의 **unselected model-proxy** 증거다. provider/model/tier/token/cost/latency와 사람 리뷰는 측정되지 않았다. 따라서 저가/고가 모델 비교나 실제 API 비용 결론으로 사용할 수 없다. 동일 packet/prompt/schema hash를 모델 선택 세션에서 재사용해야 한다.

## 다음 데이터 구조 결정

1. deterministic preflight와 semantic generator를 계속 분리한다.
2. `lifeArea`처럼 sparse rows에서 확정 불가능한 분류는 `unknown/null + confidence/reason` 후보를 검토한다.
3. noun-only `check`와 generic `resource`의 action contract를 SourceRow extraction 단계에서 더 명시적으로 표현한다.
4. case-01/09/10처럼 canonical 의미가 행에 없는 fixture는 model 실패가 아니라 extraction sufficiency 경고로 분리한다.
5. v1.2/4회차를 즉흥 실행하지 말고 새 schema·source-row sufficiency 실험으로 별도 preregister한다.

## 산출물

- [한국어 PPT형 HTML](./report.html)
- [FLOW 초안 10건](./previews/index.html)
- [기계 판독 report data](./report-data.json)
- [완료 검증 결과](./completion-verification.json)
- [교정 spec](../../specs/2026-07-15-url-to-flow-prompt-lab-source-row-v1/spec.md)
- [QA](../../specs/2026-07-15-url-to-flow-prompt-lab-source-row-v1/qa.md)
