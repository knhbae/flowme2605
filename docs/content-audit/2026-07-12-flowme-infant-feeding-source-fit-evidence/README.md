# FlowMe 초기 이유식 source-fit 보류 evidence

2026-07-12 기준으로 `baby-food-map`의 민간 식단표와 현재 공식 이유식 안내를 다시 대조한 결과입니다. 최근에 링크를 확인했다는 `source_checked_at`만으로는 원문 자체의 노후나 현재 지침과의 의미 불일치를 판정할 수 없다는 문제도 함께 기록합니다.

## 결론

- 민간 식단표의 `150/160/170/180일 시작` 선택지는 새 저장·실행·내보내기를 보류합니다.
- 질병관리청 국가건강정보포털과 WHO는 이유기보충식을 대체로 생후 6개월 무렵 시작하도록 안내합니다.
- 원문과 내부 `sourceTrace`는 삭제하지 않습니다.
- `/flow-maps/baby-food-map`은 200 + noindex 검토 화면으로 유지합니다.
- 원문 URL을 `/flows`에 넣으면 `needs_review`로 판정하고 저장·export·draft 우회를 열지 않습니다.
- `/f/baby-150-start` 등 5개 직접 실행 route는 404로 차단합니다.
- 이미 저장한 사용자의 기록은 유지하되, 비해제 `시작 시기 확인 필요` 경고를 표시합니다.

## 수치

- 현재 freshness 감사: published 157, 정상 사용자 route 141, `current` 141
- freshness 감사가 놓친 수동 source-fit 미판정 정상 route: 27
- 이번 작업 전 수동 감사 없는 공개 실행 route: 16
- 이번 작업 후 수동 감사 없는 공개 실행 route: 11
- 이번 작업 후 수동 감사 없는 고위험 공개 실행 route: 1 (`curated-new-car-basic`)
- `baby-food-map`에서 차단한 의료 민감 실행 route: 5
- screenshot: 모바일 3장 + wide 1장
- 관찰 사용자 세션: 0

## 현재 원문

- [질병관리청 국가건강정보포털 이유기보충식](https://health.kdca.go.kr/healthinfo/biz/health/gnrlzHealthInfo/gnrlzHealthInfo/gnrlzHealthInfoView.do?cntnts_sn=5470)
- [WHO complementary feeding guideline](https://www.who.int/publications/i/item/9789240081864)
- [기존 민간 식단표 원문](https://blog.naver.com/01695258757/222768860919)

## 파일

- [review.html](./review.html): 390px/1024px 화면과 판정 수치를 한 화면에서 확인
- [audit.md](./audit.md): 원인, 정책, 남은 위험
- [route-evidence.json](./route-evidence.json): route·gate·우회 차단 marker
- [screenshots](./screenshots/): 실제 브라우저 캡처 4장

## 재현

```powershell
npx.cmd tsx --test lib/flow/source-backed-my-flow.test.ts lib/flow/url-first-lookup.test.ts
$env:FLOWME_INFANT_FEEDING_EVIDENCE_DIR='docs/content-audit/2026-07-12-flowme-infant-feeding-source-fit-evidence/screenshots'
npx.cmd playwright test tests/e2e/flow-mvp.spec.ts tests/e2e/url-first-user-surface.spec.ts --grep "creator infant-feeding" --workers=1
npm.cmd test
npm.cmd run docs:check
npm.cmd run build
```

자동 테스트와 screenshot은 실제 보호자·의료진 관찰을 대체하지 않습니다. 이 식단의 재승격은 현재 공식 안내와의 대조, 메뉴별 근거 검토, 아이별 상담 경계를 모두 닫은 뒤 별도 판단해야 합니다.
