# FlowMe current source freshness audit evidence

2026-07-11 기준, 남아 있던 `audit_now` 23개 Flow의 원문 최신성과 콘텐츠 적합성을 다시 확인한 패키지입니다. 링크가 열리는지만 보지 않고, 현재 원문이 실제 실행 행을 지지하는지와 공개 저장·완료·내보내기를 허용해도 되는지를 분리해 판단했습니다.

## 결론

- 이번 감사: 23개 (`audit_now` 23 → 0)
- 공개 실행 유지: 14개
- 재구성 후 재검토: 6개
- 카탈로그 미리보기만 유지: 2개
- 공개 숨김: 1개
- 전체 수동 source-fit: 118개 중 승인 35, 재구성 70, 미리보기 12, 숨김 1
- 남은 source review: 14개 (`risk_review` 13, `source_replacement` 1)
- 캡처: 모바일 23장 + wide 7장
- 결정 불일치 0, 공개 게이트 불일치 0, 과거 문구 hit 0, 보류 route 실행 행동 누출 0
- 가로 overflow 0, 이번 30개 시나리오와 indexable 공개 Flow 66개 전체의 손상 문자열 hit 0
- 공개 원문 네트워크 검사: 151 route / 154 URL, 명시적 404 0, 수동 재확인 11

오래된 원문이라고 모두 폐기하지 않았습니다. 주간 식단처럼 원문 행이 고정되어 있고 현재 Flow가 그 행만 재현하는 경우는 출처 연도와 한계를 표시해 유지했습니다. 제도·의료·안전처럼 현재성 요구가 큰 영역은 공식 원문이 범위를 충분히 지지하지 않으면 `broad`, 재구성 또는 숨김으로 처리했습니다.

## 파일

- [review.html](./review.html): 23개 결정과 모바일·wide 30장 화면을 함께 보는 보드
- [audit.md](./audit.md): 최신성 정책, source별 판단, 수정 내용, 남은 위험
- [route-evidence.json](./route-evidence.json): decision, 공개 게이트, stale copy, viewport marker
- [source-reachability.json](./source-reachability.json): 공개 사용자 route의 원문·항목 링크 네트워크 검사
- [screenshots](./screenshots/): 390px 및 1024px 전체 캡처

## 재현

```powershell
$env:FLOWME_CAPTURE_BASE_URL='http://127.0.0.1:3016'
npm.cmd exec -- tsx scripts/content-audit/capture-flow-current-source-freshness-audit.ts
npm.cmd exec -- tsx scripts/content-audit/audit-exposed-source-reachability.ts --strict --output docs/content-audit/2026-07-11-flowme-current-source-freshness-audit-evidence/source-reachability.json
npm.cmd test
npm.cmd run docs:check
npm.cmd run build
```

네트워크 도달 가능성은 의미상 최신성을 보장하지 않습니다. 반대로 외부 차단·일시 네트워크 오류만으로 원문이 삭제됐다고 단정하지도 않습니다. 자동 검증과 화면 캡처는 실제 사용자 관찰을 대체하지 않습니다.
