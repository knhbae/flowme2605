# Plan

1. 기존 source-selection/admission 지식과 이전 benchmark를 읽기 전용으로 감사한다.
2. 기존 후보와 신규 직접 확인 URL을 합쳐 30~40개 pool을 만든다.
3. 가치 점수와 hard gate를 적용해 positive 12개와 boundary 6개를 선정한다.
4. admission·split·baseline rules/prompt를 hash와 함께 동결한다.
5. Gold source contract를 생성 담당과 분리해 작성한다.
6. rules, low-cost, high-capability 세 run을 독립 수행한다.
7. 자동 평가와 독립 adjudication으로 지표와 실패 원인을 계산한다.
8. schema·validator·테스트와 실제 결과 중심 HTML을 생성한다.
9. 1440×900, 390×844 브라우저 검증과 docs 검증을 수행한다.
10. scoped 변경과 남은 약점을 명확히 closeout한다.
