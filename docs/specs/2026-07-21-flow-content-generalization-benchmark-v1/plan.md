# Plan

1. 현재 prompt, taxonomy, composer contract와 변환 gate의 hash를 기록하고 baseline을 동결한다.
2. 기존 실험 URL을 제외한 18개 source를 조사하고 manifest와 calibration/holdout split을 변환 전에 잠근다.
3. 실제 원문 범위와 SourceRow 역할을 gold contract로 작성한다.
4. rules, low-cost 역할, high-capability 역할이 서로의 결과와 gold를 보지 않고 변환한다.
5. Calibration에서 공통 defect class를 판정하고 revised rules를 한 차례 작성한다.
6. 필요한 calibration 재실행 후 final holdout을 한 번 열고 규칙을 봉인한다.
7. schema, validator, negative fixtures와 metrics compiler를 실행한다.
8. 실제 원문부터 Flow/projection까지 연결한 한국어 HTML을 만들고 1440×900/390×844에서 확인한다.

원문 접근 실패는 실패를 숨기지 않고 acquisition evidence로 남긴다. 검색 결과 제목이나 snippet은 SourceRow가 아니다.

## 실행 결과

- Calibration에서 retained state와 사용자 anchor를 먼저 고르는 공통 규칙을 한 차례 수정했다.
- revised rules와 split seal을 고정한 뒤 final holdout 6개를 rules, low-cost, high-capability로 열었다.
- final holdout을 본 뒤 rules와 gold는 변경하지 않았다.
- 18개 사례와 54개 run은 structural validator를 통과했다.
- 별도 agent-assisted internal adjudication 결과 final holdout은 11개 target 중 합산 3개만 통과해 일반화 준비 미달로 판정했다.
- 이 판정은 관찰 사용자 검증이 아니다.
