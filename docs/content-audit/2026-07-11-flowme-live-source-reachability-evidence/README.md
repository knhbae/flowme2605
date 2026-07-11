# FlowMe 정상 사용자 콘텐츠 출처 도달성 evidence

작성일: 2026-07-11

## 목적

정상 사용자 route에 노출되는 Flow가 삭제된 원문, 과거 deep link, 연도 고정 자료를 계속 가리키지 않게 한다. `catalog_preview`와 `hidden`은 공개 실행 후보와 분리하고, 자동 접근 차단은 404와 구분한다.

## 결과

- 정상 사용자 route: 161개 → 155개
- 고유 출처 URL: 140개 → 133개
- 자동 도달 성공: 120개 → 126개
- 과거 주소 redirect: 5개 → 0개
- 확정 404/410: 6개 → 0개
- access blocked: 2개
- 자동화 network error: 5개
- 수동 확인 대상: 20개 → 7개
- 공개에서 preview로 이동: 6개

## 처리 원칙

- 현재 공식 주소를 확인할 수 있는 출처는 canonical URL과 본문 링크를 함께 교체했다.
- 삭제됐거나 source row를 다시 확인할 수 없는 콘텐츠는 원본 이력을 지우지 않고 preview로 내렸다.
- `403`과 기관별 TLS/자동화 차단은 삭제로 판정하지 않았다. 7개는 별도 web open/search로 원문 생존과 주제 적합성을 확인했다.
- HTTP 200은 내용의 최신성이나 Flow 변환 충실도를 보장하지 않는다. 날짜 최신성 gate와 source-fit review를 별도로 유지한다.

## 산출물

- [감사 기록](./audit.md)
- [요약 판정 JSON](./route-evidence.json)
- [전체 URL 검사 JSON](./live-source-reachability.json)
- [중고차 현재 출처 모바일](./screenshots/01-used-car-current-source-mobile.png)
- [중고차 현재 출처 와이드](./screenshots/02-used-car-current-source-wide.png)
- [국가건강검진 현재 출처 모바일](./screenshots/03-health-check-current-source-mobile.png)
- [소상공인 정책자금 현재 출처 모바일](./screenshots/04-small-business-current-source-mobile.png)

## 검증

- unit: 397/397
- URL-first/public share/source density E2E: 53/53
- docs check: 통과
- production build: 통과
- 직접 확인한 390px 3개, 1024px 1개 화면의 horizontal overflow: 0

## 재실행

```powershell
npx.cmd tsx scripts/content-audit/audit-exposed-source-reachability.ts `
  --output docs/content-audit/2026-07-11-flowme-live-source-reachability-evidence/live-source-reachability.json `
  --strict
```

`--strict`는 정상 사용자 route에서 404/410이 하나라도 나오면 실패한다. redirect, 403, timeout, network error는 수동 확인 대상으로 분리한다.
