# FlowMe 숫자·서비스 경계 source-fit evidence

작성일: 2026-07-11

## 목적

연도가 붙지 않았다는 이유만으로 숫자와 절차 문구를 안전하다고 보지 않는다. 민감한 정상 사용자 route에 남아 있던 기한·비율을 현재 1차 출처에 다시 대조하고, 사용자 행동에 필요한 공식 기한과 출처의 개인 예시를 분리한다.

## 결과

- 이전 수동 검토 route: 9개
- 현재 숫자 attention route: 8개
  - 현재 법령·공식 안내와 일치하는 실행 기한: 7개
  - 비교용 예시임을 명시한 가계 예산 방법: 1개
- 알려진 source contradiction: 3개 → 0개
- 연도 고정 정책 문구: 0개 유지
- 민감 route `source_checked_at` 누락: 0개 유지

## 바로잡은 문제

1. `payday-finance-routine`의 `40/40/20`은 현재 토스피드 원문과 맞지 않아 제거했다. 원문의 개인 배분 예시를 권장값으로 옮기지 않고 사용자가 실제 고정지출과 목표로 직접 정하게 했다.
2. `birth-registration-prep`은 출생신고와 정부24 행복출산 통합신청을 분리했다. 온라인 출생신고는 참여 병원 여부를 확인한 뒤 법원 전자가족관계등록시스템을 이용한다.
3. `safe-inheritance-onestop`의 `일부 재산은 6개월 내 조회가 유리`는 현재 정부24 안내에서 근거를 확인하지 못해 제거했다. 확인 가능한 `사망일이 속한 달 말일부터 1년 이내`만 유지했다.
4. `passport-renewal-docs`는 정부24 민원 URL 대신 현재 외교부 재발급 안내를 정본으로 사용한다.

## 산출물

- [상세 감사](./audit.md)
- [요약 판정 JSON](./route-evidence.json)
- [재실행 감사 JSON](./numeric-claim-audit.json)

## 화면 확인

- [출생신고와 행복출산 서비스 경계, 모바일](./screenshots/01-birth-service-boundary-mobile.png)
- [월급날 고정 비율 제거와 사용자 직접 설정, 모바일](./screenshots/02-payday-source-fit-mobile.png)
- [안심상속 공식 1년 기한과 6개월 문구 제거, 모바일](./screenshots/03-inheritance-source-fit-mobile.png)
- [외교부 여권 재발급 출처 전환, wide](./screenshots/04-passport-renewal-current-source-wide.png)

모바일 3개와 wide 1개 화면의 가로 넘침은 모두 0건이었다. 모든 상세를 펼친 DOM에서도 이번에 제거한 세 문구와 내부 provenance는 나타나지 않았다.

## 재실행

```powershell
npx.cmd tsx scripts/content-audit/audit-exposed-source-claims.ts `
  --output docs/content-audit/2026-07-11-flowme-numeric-claim-source-fit-evidence/numeric-claim-audit.json `
  --strict
```

`--strict`는 연도 고정 정책 문구, 민감 route의 확인일 누락, 이번에 확인한 source contradiction이 다시 나타나면 실패한다.

## 검증

- strict semantic/source contradiction audit: 통과
- targeted unit: 75/75
- 전체 단위 테스트: 401/401
- targeted Playwright E2E: 58/58
- 모바일 화면 확인: 3개
- wide 화면 확인: 1개
- 가로 넘침: 0건
- `npm.cmd run docs:check`: 통과
- `npm.cmd run build`: 통과
- `git diff --check`: 통과
