# P24-00F4 감사

## 재현 조건

### `/flows` hard navigation

1. production server의 `/flows`를 주소 직접 진입한다.
2. 모바일에서 같은 route를 5회 더 reload한다.
3. 매회 `Flow를 불러오는 중입니다.`가 사라지고 URL/메모 입력이 활성화되는지 확인한다.
4. 1024px로 바꾸고 한 번 더 reload한다.

결과: 7/7 성공, fallback 잔류 0, console error 0.

### public 저장 후 hydration

1. `/f/new-car-delivery-check`로 이동한다.
2. localStorage를 초기화하고 reload한다.
3. `내 Flow에 저장` 후 storage record가 생겼는지 확인한다.
4. `내 Flow에서 보기`로 이동한다.
5. 전체 탭에서 정확한 `new-car-delivery-check` 카드가 즉시 나타나는지 확인한다.
6. 위 과정을 5회 반복한다.

결과: 5/5 성공, 빈 상태 노출 0.

## 판단

현재 clean production baseline에서는 H1/H2를 재현하지 못했다. 따라서 추정성 앱 수정은 하지 않는다. 반복 regression을 유지하고, dependency upgrade 및 Vercel 공개 배포 후 동일 시나리오를 다시 실행한다.

## UX 관찰

기능은 안정적이지만 `/flows` 모바일은 콘텐츠 카드가 길게 이어지고, My Flow 저장 직후 화면도 요약 카드와 설명이 먼저 보인다. 이는 hydration 결함이 아니라 정보 위계 문제이며 Claude `(8)` 목업의 F 패턴인 “실행 가능한 한 행 + 낮춘 예고”와 후속 U1/U2에서 다룬다.

## 남은 운영 위험

- 현재 Vercel preview는 익명 접근 시 SSO로 이동하므로 외부 관찰에서는 아직 검증할 수 없다.
- dependency upgrade 후 production build와 hard navigation을 다시 확인해야 한다.
- 자동화 성공은 실제 사용자가 저장 직후 화면을 이해했다는 뜻이 아니다.
