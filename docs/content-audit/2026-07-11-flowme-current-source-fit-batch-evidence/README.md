# FlowMe current source-fit batch evidence

2026-07-11 기준, 공개 후보였지만 오래된 문구나 원문 불일치가 의심된 Flow 5개를 최신 원문과 다시 대조한 감사 패키지입니다. 링크가 열리는지만 보지 않고, 현재 원문이 실제 실행 항목을 지지하는지와 공개 저장·체크·내보내기를 허용해도 되는지를 따로 판단했습니다.

## 결론

- 공개 실행 유지: `first-passport-issue`, `closet-organize-1day`, `portfolio-4week`
- 원문은 최신화했지만 검토 전용 유지: `citizen-secretary-alerts`, `domestic-trip-d7`
- 공개 실행 가능 Flow: 52개
- 검토 전용 공개 번들: 565개
- source-fit 수동 감사: 95개 중 승인 21개, 재구성 64개, 미리보기 10개
- 다음 source review 대기열: 37개 (`audit_now` 23, `risk_review` 13, `source_replacement` 1)

승인된 3개 페이지는 실행판 하나만 노출합니다. 검토 전용 2개 페이지는 `noindex, nofollow`이며 저장, 완료 체크, 파일 내보내기를 열지 않습니다.

## 파일

- [review.html](./review.html): 승인/보류 판단과 모바일·wide 화면을 함께 보는 보드
- [audit.md](./audit.md): 원문별 교정 내용, 정책 판단, 남은 위험
- [route-evidence.json](./route-evidence.json): source-fit, 공개 게이트, visible-copy, viewport marker
- [source-reachability.json](./source-reachability.json): 공개 사용자 route의 원문·항목 링크 네트워크 점검
- [screenshots](./screenshots/): 390px 및 1024px 시나리오 캡처

## 재현

```powershell
npx.cmd tsx scripts/content-audit/capture-flow-current-source-fit-batch.ts
npx.cmd tsx scripts/content-audit/audit-exposed-source-reachability.ts --strict --output docs/content-audit/2026-07-11-flowme-current-source-fit-batch-evidence/source-reachability.json
npx.cmd tsx --test lib/flow/seed-flows.test.ts lib/flow/source-fit.test.ts lib/flow/source-review-priority.test.ts lib/flow/content-lab.test.ts lib/flow/artifact-plan.test.ts
npx.cmd playwright test tests/e2e/flow-mvp.spec.ts --grep "current-source audit batch"
npm.cmd test
npm.cmd run docs:check
npm.cmd run build
```

네트워크 도달 가능성은 의미상 최신성을 보장하지 않습니다. 현재 관찰 사용자 세션은 목표 15회 중 1회이므로, 자동 검증 통과를 실사용 검증 완료로 해석하지 않습니다.
