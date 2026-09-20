# FlowMe source freshness refresh evidence

2026-09-07 KST 기준으로 표준 검증의 90일 재검토 기한에 도달한 일반 사용자 경로 9개를 현재 원문과 다시 대조한 증거 패키지입니다. 링크 응답뿐 아니라 원문 제목, 핵심 행동, 일정·주기, 위험 경계와 현재 Flow 변환 범위를 확인했습니다.

## 결론

- 재검토 대상: 9개
- 원문과 변환 범위가 일치해 갱신: 6개
- 현재 원문 제목을 맞춘 뒤 갱신: 3개
- 전체 링크 감사에서 발견한 공식 URL 교체: 1개
- 실행 범위를 고치거나 노출 상태를 바꾼 경로: 0개
- 일반 사용자 실행 경로 135개의 고유 링크 156개 검사: 도달 148, 리디렉션 1, 접근 차단 1, 네트워크 오류 6
- 자동 판정 가능한 끊어진 링크: 0개, 수동 재확인 대상: 8개
- 사용자 관찰 검증: 0명

9개 원문과 초등 입학 보조 출처는 2026-09-07에 HTTP 200으로 응답했습니다. 전체 링크 감사 중 `ev-subsidy-apply`의 예전 공식 주소가 404로 바뀐 것을 확인해, 현재 보조금 지원 절차와 지자체별 지급현황 공식 주소로 교체했습니다. 플랭크 원문의 효능·식단 주장, 개인 블로그의 상품 추천과 가격처럼 Flow가 채택하지 않은 내용은 이번에도 실행 항목으로 넣지 않았습니다.

## 파일

- [audit.md](./audit.md): 판정 방법과 경로별 의미 검토
- [review-ledger.json](./review-ledger.json): 9개 판정의 기계 판독 원장
- [source-reachability.json](./source-reachability.json): 일반 사용자 실행 경로 전체의 원문·항목 링크 네트워크 검사

## 재현

```powershell
npm.cmd exec -- tsx scripts/content-audit/audit-flow-source-freshness.ts
npm.cmd exec -- tsx scripts/content-audit/audit-exposed-source-reachability.ts --strict --output docs/content-audit/2026-09-07-flow-source-freshness-refresh/source-reachability.json
npm.cmd exec -- tsx --test lib/flow/seed-flows.test.ts lib/flow/source-fit.test.ts lib/flow/natural-artifact-audit.test.ts
npm.cmd run security:audit
npm.cmd run verify
```

네트워크 도달 가능성은 의미상 최신성을 보장하지 않습니다. 자동 테스트는 실제 사용자가 콘텐츠를 이해하고 유용하게 쓰는지에 대한 관찰 증거가 아닙니다.
