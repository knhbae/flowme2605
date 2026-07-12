# FlowMe 가치 사슬·실행 표면 재설계 evidence

P20 이후 제품을 부분 guardrail만으로 평가하지 않고, 전체 가치 사슬을 열어 둔 상태에서 초기 사용자 가치가 실제 화면에 먼저 보이는지 검토한 패키지다.

## 제품 프레이밍

- 전체 가치 사슬: 원문·제작자 → 기준 Flow → 개인 수정본 → 실행·완료 → export → 리뷰·업데이트·성과 피드백
- 초기 우선순위: 콘텐츠를 신뢰 가능한 할 일과 일정으로 바꾸고, 사용자가 자기 상황에 맞게 수정해 실제로 끝내는 경험
- Studio/creator는 유지하지만 5번째 주 탭이나 마켓플레이스로 앞세우지 않는다.
- 실제 사용자 성과가 아닌 seed의 실행·복사 합계는 공개 creator profile에서 제거한다.

## 이번 변경 범위

1. 홈 추천 카드와 URL-first 진입을 원문 연결 중심으로 정돈
2. lookup 결과가 나온 뒤 전체 카탈로그를 보조 disclosure로 이동
3. canonical Flow Map의 카드 중첩 제거와 실행 순서 평면화
4. My Flow를 task-first 단일 실행 레인으로 정리
5. Calendar를 date-first 월간 개요 + 선택일 실행 구조로 정리
6. creator profile을 콘텐츠 재고·원문 확인 중심의 정직한 지표로 변경
7. public `/f`의 timeline/checklist/routine 시각 체계와 연결 확인

## 파일

- `audit.md`: 판단, 변경 이유, 남은 리스크
- `review.html`: 페르소나·사용자 여정별 시각 검토판
- `route-evidence.json`: 자동 판정 marker와 검증 결과
- `capture-metrics.json`: 캡처 당시 route·viewport·overflow·surface-role 원시 측정값
- `screenshots/`: 390px·1024px 시나리오 캡처 18장

## 검증

- Flow MVP 통합 E2E: 191개 시나리오 확인
  - 전체 실행 190/191 통과
  - 남은 1건은 Flow Lab의 오래된 내부 재고 수 assertion을 현재 값으로 정합화한 뒤 단독 재실행 통과
- URL-first/public share/workbench 핵심 회귀: 55/55 통과
- 단위 테스트: 437/437 통과
- TypeScript no-emit, production build, docs check, diff check 통과
- 최신 15개 자동 캡처의 horizontal overflow 0

## 재생성

프로덕션 빌드를 `3110`에서 실행한 뒤:

```powershell
node scripts/content-audit/capture-flowme-value-chain-redesign-evidence.mjs
```

다른 서버를 쓸 때는 `FLOWME_CAPTURE_BASE_URL`을 지정한다.
