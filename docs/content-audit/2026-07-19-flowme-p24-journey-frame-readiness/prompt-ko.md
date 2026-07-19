# P24 독립 검토 복붙용 프롬프트

```text
FlowMe P24의 최신 origin/main과 production을 독립적으로 검토해줘. 제품을 먼저 수정하지 말고 현재 실행 결과만 증거로 사용해줘.

공개 서비스:
https://flowme2605.vercel.app

먼저 볼 패키지:
docs/content-audit/2026-07-19-flowme-p24-journey-frame-readiness/
- README.md
- audit.md
- review.html
- route-evidence.json
- journey-results.json
- screenshots/

검토 목적:
P24가 저장 전 판단 -> 필요한 만큼 조정 -> 저장 직후 전체 Flow 확인 -> 재방문 My Flow 실행 -> Calendar 일정 배치로 자연스럽게 이어지는지 평가한다. 외부 사용자 관찰은 아직 요청하지 않았고 0/15이므로, 자동화나 시뮬레이션을 실제 사용자 검증으로 표현하지 않는다.

반드시 재현할 여정:
1. /flow-maps/moving-d30
   - 긴 설명보다 저장될 실제 할 일이 먼저 보이는가
   - 그대로 저장과 조정하고 저장의 차이가 예측 가능한가
   - 조정 후 저장된 전체 Flow가 즉시 보이는가
2. /f/vehicle-inspection-prep
   - compact preview, source/detail disclosure, whole-Flow save 위계가 분명한가
   - 저장 후 10개 전체 Flow 확인과 실제 완료 행동의 경계가 분명한가
3. /my
   - 첫 저장 확인과 재방문 실행 workspace가 구분되는가
   - 저장한 Flow selector가 Calendar 범위 필터처럼 보이지 않는가
4. /calendar
   - dated grid/agenda와 날짜 없는 할 일 tray의 역할이 분명한가
   - tray가 기본 접혀 있고 필요할 때 일정 배치가 가능한가
5. held/review content
   - ordinary My Flow/Calendar에서 실행 콘텐츠처럼 노출되지 않는가
   - 저장 데이터 자체는 보존되는가

회귀 확인:
- 완료/완료 취소
- 개인 제목/날짜/메모/구조 변경
- 반복 회차
- whole/selected/current export
- public preview -> post-save completion
- 4탭 IA와 source 보존
- 모바일 390x844, wide 1024x768
- keyboard, accessible name, horizontal overflow, fixed UI overlap, console error

결과 형식:
1. Findings를 Blocking / High / Medium / Low 순으로 먼저 작성
2. 각 finding에 route, viewport, 재현 단계, 기대/실제, evidenceKind 포함
3. P24-J0~J5별 pass/partial/fail 판정
4. automated_current / independent_agent / prior_artifact / observed_user를 구분
5. 실제 사용자에게 보여줄 준비가 됐는지 ready / not ready로 판정하되, observed-user 검증 완료라고 표현하지 않기
6. 문제가 없다면 남은 검증 공백과 owner가 확인할 질문을 기록
7. 앱 코드는 수정하지 않기
```
