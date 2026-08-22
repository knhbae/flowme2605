# FlowMe source freshness refresh evidence

2026-08-22 KST 기준으로 일반 사용자 경로의 재검토 기한이 지난 42개 Flow를 실제 원문과 다시 대조한 증거 패키지입니다. 링크가 열리는지만 확인하지 않고, 현재 Flow의 제목·대상·행동·주기가 원문 범위 안에 있는지를 함께 판정했습니다.

## 결론

- 게이트 대상: 42개
- 원문과 일치해 갱신: 20개
- 콘텐츠를 고친 뒤 갱신: 17개
- 날짜를 갱신하지 않고 카탈로그 검토용으로 전환: 5개
- 추가 archive 확인: canonical 중복 2개는 현재 원문을 확인했지만 archive 유지
- 추가 미리보기 보류: 정부24 전입신고, FITVELY 주간 바디 체크, 일반 반려동물 병원 기록 3개는 본문 미확인 또는 의미 불일치로 기존 날짜 유지
- 일반 사용자 실행 경로 135개의 고유 링크 155개 검사: 도달 146, 리디렉션 1, 접근 차단 1, 서버 오류 1, 네트워크 오류 6
- 명시적 `404`/`410` 등 자동 판정 가능한 끊어진 링크: 0개; 수동 재확인 대상: 9개
- 사용자 관찰 검증: 0명

이직 1개, 일반건강검진 1개, 일반 성인용 다이어트 3개 Flow는 현재 원문보다 범위가 넓었습니다. 이 다섯 개는 `source_checked_at`을 올리지 않았고 저장·완료·내보내기가 가능한 일반 실행 경로에서도 제외했습니다.

## 파일

- [audit.md](./audit.md): 판정 방법, 수정·보류 이유, 안전 경계
- [review-ledger.json](./review-ledger.json): 게이트 42개와 비실행 경로 5개 확인 결과의 기계 판독 원장
- [source-reachability.json](./source-reachability.json): 일반 사용자 실행 경로의 원문·항목 링크 네트워크 검사

## 재현

```powershell
npm.cmd exec -- tsx scripts/content-audit/audit-flow-source-freshness.ts
npm.cmd exec -- tsx scripts/content-audit/audit-exposed-source-reachability.ts --strict --output docs/content-audit/2026-08-22-flow-source-freshness-refresh/source-reachability.json
npm.cmd exec -- tsx --test lib/flow/seed-flows.test.ts lib/flow/source-fit.test.ts lib/flow/natural-artifact-audit.test.ts lib/flow/content-lab.test.ts lib/flow/artifact-fields.test.ts lib/flow/artifact-plan.test.ts lib/flow/execution-model.test.ts lib/flow/export.test.ts components/flow/ArtifactWorkbench.test.tsx
npm.cmd test
npm.cmd run docs:check
npm.cmd run build
```

네트워크 도달 가능성은 의미상 최신성을 보장하지 않습니다. 자동 테스트와 화면 검사는 실제 사용자가 콘텐츠를 이해하고 유용하게 쓰는지에 대한 관찰 증거가 아닙니다.
