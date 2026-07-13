# FlowMe P23 마감 이후 제품 검토 요청

아래 패키지만 보고 P24 방향을 검토해 주세요.

- review.html
- audit.md
- capability-matrix.json
- state-transition-matrix.json
- export-projection-matrix.json
- scenario-evidence.json
- route-evidence.json
- screenshots/

FlowMe의 현재 핵심 흐름은 URL/메모 또는 공개 Flow를 발견하고 저장한 뒤, 내 상황에 맞게 구조·일정·반복을 수정하고, My Flow와 Calendar에서 실행하며, 완료·완료 취소·건너뜀·보류·회고·다시 쓰기와 portable export로 이어지는 것입니다.

다음 관점으로 평가해 주세요.

1. 기능 존재 여부보다 첫 사용자가 설명 없이 수정 입구와 상태 의미를 발견하는가.
2. 기준일형, 날짜 없는 체크리스트형, 반복 루틴형, 순서·일정 혼합형, 기록·메모형, 개인 초안형에서 같은 mental model이 유지되는가.
3. 완료·완료 취소·제외·삭제·건너뜀·보류가 서로 다른 행동으로 읽히는가.
4. My Flow, Calendar, ICS, checklist, sheet, memo가 하나의 개인 수정본을 읽는다는 신뢰가 보이는가.
5. source-backed 구조 편집을 열기 전에 source v2 merge/orphan 정책이 충분한가.
6. 390px과 1024px에서 Calendar, 항목 편집, 과거 실행의 정보 밀도가 상용 서비스 수준인가.
7. localStorage 기반 현재 모델에서 계정·DB·다른 기기 복원이 언제 Blocking이 되는가.

반드시 구분해 주세요.

- 자동화로 증명된 operability
- screenshot으로만 추정한 UX
- 실제 사용자 관찰이 필요한 가정
- P24에서 구현할 것
- 구현하지 말고 먼저 관찰/정책 결정할 것

결과는 Blocking / High / Medium / Low로 제시하고, P24-01~P24-05를 의존성 순서로 작성해 주세요. 단순 UI polish 목록보다 사용자 여정 단절, 데이터 소유권, 되돌리기, projection 일관성, source update 위험을 우선해 주세요.
