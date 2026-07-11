# Sensitive source freshness audit

## 판정 정책

1. 원문 URL의 생존, 현재 원문이 Flow 행을 지지하는지, 공개 실행을 허용할지를 별도로 판단한다.
2. 의료·재무·제도 route는 사용자 대신 자격·금액·의료 결론을 내리지 않는다.
3. 공식 원문이 현재 실행 순서를 직접 지지하고 개인 결과는 조회·상담에 남긴 경우에만 `keep_representative`로 둔다.
4. 출처가 살아 있어도 여러 제도·개인 조언·2차 해설을 한 Flow에 합치면 `reshape_before_featured`로 둔다.
5. 승인 외 route는 직접 URL에서도 `noindex`와 읽기 전용 게이트를 적용하고 저장·완료·파일 받기를 열지 않는다.
6. `source_checked_at`은 원문 확인일이고 `updated_at`은 이번 batch에서는 실제 콘텐츠 교정일로 같은 날짜를 사용한다.

## 대표 공개 실행 유지 11

| Flow | 현재 원문에 맞춘 범위 | 금지한 확장 |
|---|---|---|
| `ev-subsidy-apply` | 차종·지역 확인, 계약, 판매점 신청, 선정, 출고·등록, 정산 | 계약 전 지원확인서 필수, 고정 금액, 조기소진 단정 |
| `infant-health-checkup-schedule` | 일반검진 8회·구강검진 4회 가능기간 | 발달 결과 해석 |
| `national-scholarship-apply` | 신청기간, 본인 신청, 가구원 동의, 필요 서류 | 지원금·선정 가능성 보장 |
| `property-local-tax-pay` | 현재 부과내역 조회, 납부, 영수증 | 연납·공제율·절세 권고 |
| `safe-inheritance-onestop` | 1년 이내 신청, 재산·채무 조회, 상담 준비 | 상속 승인·포기 판단 |
| `unemployment-benefit-apply` | 고용24 신청 순서와 실업인정 일정 | 수급 가능성·금액 확정 |
| `jeonse-guarantee-apply` | HUG 대상·기한·서류·신청 경로 | 가입 가능·보증료 확정 |
| `job-seeker-allowance-apply` | 유형 확인, 신청, 상담, 취업활동계획 | 지원 유형·수당 확정 |
| `small-business-fund-check` | 현재 공고, 대상·제외업종·대출방식·자료 | 고정 인원수·교육 요건·승인 가능성 |
| `used-car-ownership-transfer` | 15일 기한, 자동차365 신청, 보험·세금 확인 | 2~3일·당일 처리 보장 |
| `adult-vaccine-schedule-check` | 이력 조회, 누락 문의, 의료진 상담, 예약·기록 | 개인 권장 일정·무료지원 판정 |

## 재구성 전 검토 전용 3

| Flow | 차단 이유 | 다음 콘텐츠 행동 |
|---|---|---|
| `housing-subscription-account` | 청약통장·세대·일반/특별공급 규칙이 공고마다 달라 청약홈 메인 하나로 대표할 수 없음 | 개별 공고 비교와 청약통장 기본 준비를 분리 |
| `monthly-household-budget` | 2차 민간 가이드의 50/30/20 예시가 개인 재무 기준처럼 읽힐 수 있음 | 공신력 있는 중립 기록 템플릿으로 재구성 |
| `payday-finance-routine` | 민간 금융 콘텐츠의 개인 사례와 금융상품 맥락이 대표 루틴에 섞임 | 목적별 기록 행동만 남기고 중립 원문 보강 |

## Evidence 결과

- 14개 모바일 route와 7개 wide route에서 decision mismatch 0, source URL mismatch 0, 콘텐츠 업데이트 날짜 mismatch 0.
- 승인 11개는 index/follow, 실행판 1개, 저장 행동을 유지한다.
- 재구성 3개는 noindex, `source_fit_review_required`, 실행판 0, 저장·파일 받기·완료 체크 0.
- 오래된 문구 hit 0, 현재 문구 누락 0, non-approved action leak 0.
- 21개 시나리오의 horizontal overflow와 mojibake hit는 모두 0.
- indexable 공개 Flow 77개 전체의 visible copy mojibake hit route는 0.
- 공개 원문 155개 URL 중 명시적 404는 0이다. 10개는 외부 차단·redirect·네트워크 오류로 수동 재확인이 필요하다.

## 남은 위험

- KDCA·NHIS는 자동 `fetch`가 실패해 브라우저 원문 확인과 공식 기관 상담 경계를 계속 유지해야 한다.
- 자동차365 이전등록은 로그인 화면으로 정상 redirect된다. 자동 검사는 redirect를 오류로 판정하지 않는다.
- 청약·가계부·월급날 route는 source-fit queue에서는 감사 완료됐지만 제품 콘텐츠는 아직 재구성 전이다. `queue 0`은 모든 route가 공개 승인됐다는 뜻이 아니다.
- 전체 617개 published bundle 중 540개는 review-only다. 장기적으로는 검토 전용 라이브러리의 축소·통합이 별도 포트폴리오 작업으로 남는다.
- 실제 사용자가 절차를 이해하고 성공적으로 수행했는지 관찰한 결과는 아니다.
