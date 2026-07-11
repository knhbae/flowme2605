# FlowMe public content currentness evidence

2026-07-11 기준 공개 `/f/[slug]` 콘텐츠의 링크 도달성, source-fit 승인 상태, 검색 노출, 저장·내보내기 가능 경계를 함께 감사한 패키지입니다.

## 핵심 결론

- 공개 번들 617개 중 현재 승인된 49개만 검색 노출과 저장·내보내기를 허용합니다.
- 나머지 568개는 삭제하지 않되 `noindex, nofollow`와 읽기 전용 게이트를 적용합니다.
- 정상 사용자 route 155개의 대표 원문과 항목 상세 링크 156개를 검사했고, 즉시 수정해야 하는 404 링크는 0개입니다.
- `needs_review` 상태로 남아 있던 수동 승인 불일치는 0개로 정리했습니다.
- 링크가 열리는 것만으로 최신 의미가 보장되지는 않습니다. source-fit 승인이 없는 route는 원문이 열려도 실행 행동을 열지 않습니다.

## 파일

- [audit.md](./audit.md): 판단 근거, 변경 내용, 남은 위험
- [route-evidence.json](./route-evidence.json): 자동 판정용 요약과 시나리오 marker
- [source-reachability.json](./source-reachability.json): 156개 노출 URL 도달성 원본 결과
- [screenshots](./screenshots/): 승인/재검토 상태의 390px·1024px 캡처

## 재현

```powershell
npx.cmd tsx scripts/content-audit/audit-exposed-source-reachability.ts --strict --output docs/content-audit/2026-07-11-flowme-public-content-currentness-evidence/source-reachability.json
npm.cmd test
npx.cmd playwright test tests/e2e/url-first-user-surface.spec.ts
npx.cmd playwright test tests/e2e/public-share-cta-order.spec.ts
npx.cmd playwright test tests/e2e/workbench-source-density.spec.ts
npm.cmd run docs:check
npm.cmd run build
git diff --check
```

관찰 사용자 세션은 이 패키지의 범위가 아닙니다. P22 관찰 게이트의 완료 세션은 여전히 `0/15`입니다.
