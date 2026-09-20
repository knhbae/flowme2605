# P3-G 실행 계획

## 1. 기준 고정

1. P3-F의 gap 7과 E4/E5-D 경계를 재확인한다.
2. 현재 React·standalone의 viewport, gesture, focus, motion 처리를 코드와 테스트로 대조한다.
3. 운영 데이터 불변과 publish 제외 범위를 고정한다.

## 2. 런타임 보강

1. visual viewport 변경을 overlay·편집 화면에 전달한다.
2. 가상 키보드 위에서 입력과 취소·적용이 함께 보이도록 최대 높이와 scroll owner를 정리한다.
3. pointer·drag·long press의 cancel 신호를 하나의 no-write 경로로 수렴한다.
4. Escape 후 focus return과 reduced-motion 경로를 React·standalone에 맞춘다.

## 3. 자동화 검증

1. 순수/컴포넌트 테스트로 fallback, listener 정리, focus, mutation 0을 검사한다.
2. Playwright에서 visualViewport 축소·offset 변화, touch cancel, keyboard-only, reduced motion을 검사한다.
3. 필수 5개 viewport에 320·360·200% 등가 조건을 추가한다.
4. 각 시나리오 전후 운영 `flow:*` bytes를 비교한다.

## 4. 실제 기기 검증

1. Android Chrome에서 A1~A6을 실행한다.
2. iOS Safari에서 I1~I6을 실행한다.
3. TalkBack·VoiceOver·최대 글자와 기술 안정성 proxy에서 X1~X7을 실행한다.
4. 기기가 없거나 연결되지 않으면 NOT_RUN으로 남기고 자동화 결과로 대체하지 않는다.

## 5. 판정과 마감

1. 요구사항별 자동화 준비도와 E5-D를 별도 열에 기록한다.
2. 실제 근거가 없는 primary verdict는 유지한다.
3. 추적표·P3-G HTML 보고서·handoff를 갱신한다.
4. 전체 테스트, build, docs, browser, scoped diff를 확인한다.
