FlowMe의 현재 화면을 페이지별로만 평가하지 말고, 아래 종단 사용자 여정 review package만 보고 여러 세션에 걸친 제품 흐름을 검토해 주세요.

중요한 전제:
- 이 package는 실제 사용자 조사 결과가 아니라 evidence 기반 가상 페르소나 시뮬레이션입니다.
- 현재 없는 기능을 있다고 가정하지 마세요.
- 확인할 수 없는 전환은 `evidence 부족`, 사용자 표면이 없으면 `미구현`으로 구분하세요.
- URL-first miss 초안은 실제 AI가 아니라 결정론적 제안입니다.
- Studio는 현재 5번째 탭이 아닌 보조 초안 선반입니다.

검토 자료:
- Review HTML: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-11-flowme-longitudinal-user-journey-review-package/review.html
- Journey evidence: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-11-flowme-longitudinal-user-journey-review-package/journey-evidence.json
- Audit: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-11-flowme-longitudinal-user-journey-review-package/audit.md
- Codex independent assessment: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-11-flowme-longitudinal-user-journey-review-package/codex-assessment.md
- Screenshots: https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-11-flowme-longitudinal-user-journey-review-package/screenshots
- Vercel: https://flowme2605.vercel.app

평가할 공통 lifecycle:
발견 → URL/메모를 Flow로 변환 → 저장 → 자기 상황에 맞게 수정 → My Flow/Calendar에서 실행 → 완료 체크 → 며칠 뒤 재방문 → 리뷰 → 수정 요청 → 재사용

6개 페르소나를 각각 세션 순서대로 검토하세요:
1. 이사 준비 사용자
2. 준비된 Flow가 없는 URL/메모 사용자
3. public 공유 Flow를 받은 사용자
4. 여러 Flow를 동시에 쓰는 직장인
5. 학습·워크시트 반복 사용자
6. 제작·수정에 관심 있는 Studio 사용자

각 페르소나에 대해 아래를 작성하세요:
- 사용자가 세션마다 기대하는 결과
- 실제 가능한 행동과 발견하기 어려운 기능
- 저장 상태와 수정본이 다음 화면으로 이어지는지
- 완료·완료 취소·실패·중복·오프라인·빈 상태의 복구 가능성
- 끊기는 전환과 그 원인: IA / copy / interaction / visual / product policy / missing capability / evidence gap
- 실제 사용자가 이탈할 가능성이 가장 높은 순간

특히 리뷰·수정 loop를 제품 수준으로 결정해 주세요:
- 완료 후 무엇을 물어야 하는가: 유용성, 정확성, 실행 결과, 빠진 항목
- 별점, 한줄 리뷰, 오류 신고, 수정 요청 중 첫 slice는 무엇인가
- 개인 overlay 수정과 원본/제작자 수정 요청을 어떻게 분리할 것인가
- 입구는 My Flow 완료 상태, 항목 detail, public /f, Studio 중 어디가 적합한가
- 커뮤니티를 크게 만들지 않고 가능한 최소 구현은 무엇인가
- source-backed 새 버전과 개인 수정본 충돌을 어떻게 다룰 것인가

최종 산출물:
1. 페르소나별 3세션 사용자 여정 평가
2. 전체 lifecycle coverage matrix
3. 이미 구현됐지만 발견성이 낮은 기능
4. 부분 지원·미구현·evidence 부족 전환
5. 리뷰→수정 요청→재사용 최소 제품 모델
6. 상용서비스 readiness: Ready / Conditional / Not Ready
7. 지금 집중할 핵심 종단 흐름 3개
8. 보류할 기능과 이유
9. 다음 review에 필요한 추가 screenshot/fixture
10. P22 backlog를 Blocking / High / Medium / Low로 작성
11. Codex 독립 평가에서 동의하는 항목, 반대하는 항목, 빠진 항목

각 P22 항목에는 ID, 대상 페르소나, 끊기는 전환, 현재 evidence, 최소 해결 범위, 하지 말아야 할 확장, acceptance criteria, 필요한 E2E/screenshot, 선행 의존성을 포함하세요.

유지할 기준선:
- 홈 / Flow 찾기 / 캘린더 / 내 Flow 4탭 IA
- public /f의 저장 우선 공유 shell
- My Flow는 할 일 중심, Calendar는 날짜 중심
- source 원본과 personal overlay 분리
- 완료 checkbox 한 종류
- 저장/실행/export 구조 유지
- 실제 AI·커뮤니티·발행 기능을 이미 있는 것처럼 평가하지 않기

결과는 한국어 HTML 또는 .dc.html로 작성하고, 가장 먼저 닫아야 할 종단 사용자 여정 하나를 최종 추천으로 명시해 주세요.
