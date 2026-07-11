# FlowMe 고위험 콘텐츠 시점 의존 문구 evidence

작성일: 2026-07-11

## 목적

정상 사용자 route의 의료·행정·법률·금융 문구가 특정 연도의 신청일, 지원금, 세율, 한도를 고정해 두었다가 다음 공고에서 낡는 문제를 막는다. 원문과 내부 provenance는 보존하되, 앱 본문은 사용자가 현재 공식 화면에서 값을 확인하고 자기 일정·메모에 옮기는 행동 중심으로 유지한다.

## 결과

- 정상 사용자 route: 155개
- medium/medical/financial route: 109개
- 연도 고정 정책 문구 route: 8개 → 0개
- 연도 고정 정책 문구: 8개 → 0개
- 고위험 route의 `source_checked_at` 누락: 0개
- 추가 수동 숫자 검토 route: 9개
  - 공식 기한·사진 유효기간 등 실행에 필요한 값: 7개
  - 비율을 명시적으로 예시로 쓰는 재정 루틴: 2개

## 이번에 정리한 route

- `national-scholarship-apply`
- `housing-subscription-account`
- `jeonse-guarantee-apply`
- `job-seeker-allowance-apply`
- `customs-traveler-declare`
- `property-local-tax-pay`
- `childcare-fee-support-apply`
- `military-exam-prep`
- 추가 변동 수치 정리: `used-car-ownership-transfer`, `new-car-7-step`

## 산출물

- [감사 기록](./audit.md)
- [요약 판정 JSON](./route-evidence.json)
- [전체 문구 감사 JSON](./semantic-claim-audit.json)

## 화면 확인

- [국가장학금 모바일: 종료된 연도·신청일 제거](./screenshots/01-scholarship-evergreen-copy-mobile.png)
- [신차 구매 모바일: 펼친 상세의 내부 근거 문구 제거](./screenshots/02-new-car-source-trace-hidden-mobile.png)
- [국민취업지원 모바일: 변동 수치 대신 현재 공식 확인 행동](./screenshots/03-job-seeker-evergreen-copy-mobile.png)
- [국가장학금 wide: 레이아웃과 문구 회귀 확인](./screenshots/04-scholarship-evergreen-copy-wide.png)

모바일 3개와 wide 1개 화면에서 가로 넘침은 0건이었다. 신차 구매 화면은 모든 상세를 펼친 상태에서도 `sourceTrace`·`원문 근거:`와 폐기한 고정 견적 예시가 보이지 않았다.

## 검증

- semantic claim strict audit: 통과, 연도 고정 문구 0건
- 단위 테스트: 399/399
- targeted Playwright E2E: 54/54
- `npm.cmd run docs:check`: 통과
- `npm.cmd run build`: 통과
- `git diff --check`: 통과

## 재실행

```powershell
npx.cmd tsx scripts/content-audit/audit-exposed-source-claims.ts `
  --output docs/content-audit/2026-07-11-flowme-semantic-claim-freshness-evidence/semantic-claim-audit.json `
  --strict
```

`--strict`는 정상 사용자 route의 medium/medical/financial 사용자 문구에 `20xx년`, `20xx학년도`, `20xx년도`가 남거나 출처 확인일이 누락되면 실패한다. 출처 제목과 내부 provenance는 검사 대상 사용자 문구에서 분리한다.
