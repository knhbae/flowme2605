# Claude Design 재검토 요청 프롬프트

FlowMe Claude Design 3차 재검토 이후 P4-01~P4-05 개선 루프를 마감 감사한 최신 패키지를 검토해 주세요. Vercel은 보지 못한다는 전제로, GitHub 소스/문서/screenshot/evidence만 사용해 판단해 주세요.

## 먼저 볼 파일

1. `flow-mvp/docs/content-audit/2026-07-04-claude-design-p4-final-review-package/review.html`
2. `flow-mvp/docs/content-audit/2026-07-04-claude-design-p4-final-review-package/audit.md`
3. `flow-mvp/docs/content-audit/2026-07-04-claude-design-p4-final-review-package/route-evidence.json`
4. `flow-mvp/docs/content-audit/2026-07-04-claude-design-p4-final-review-package/screenshots/`
5. `flow-mvp/docs/content-audit/2026-07-03-claude-design-action-backlog-ko.md`

## 유지해야 할 기준선

- 4탭 IA는 유지: 홈 / Flow 찾기 / 캘린더 / 내 Flow
- 공개 `/f/[slug]`는 저장 전 공유 shell로 유지하고, 저장 후 `/my` app shell로 이어짐
- seed/source-backed 데이터 구조와 저장/실행/export 스키마는 변경하지 않음
- 사용자 화면에는 `review`, `audit`, `source-backed`, `Step`, `Item` 같은 내부 문구를 노출하지 않음
- 콘텐츠 제목의 끝 `Flow` 접미는 사용자 화면에서 제거하되 `Flow 찾기`, `내 Flow`, `FlowMe`는 유지
- 홈은 설명서가 아니라 콘텐츠 저장으로 들어가는 가벼운 입구
- export 라벨은 결과 중심: 캘린더 파일 받기 / 시트로 받기 / 메모로 복사 / 체크리스트 복사

## 검토할 route

- `/`
- `/flows`
- `/f/vehicle-inspection-prep`
- `/f/moving-d30-basic`
- `/f/computer-skills-d30-study`
- `/f/new-car-delivery-check`
- `/f/used-car-buying-check`
- `/f/baby-food-menu-recipe`
- `/f/real-thankyou-bubu-home-workout-starter`
- `/f/fridge-cleanout-weekly-plan`
- `/f/washer-tub-clean-monthly`
- `/flow-maps/moving-d30`
- `/flow-maps/middle-school-math-1`
- `/my?savedMap=moving-d30`
- `/calendar`

## 산출물

평가만 하지 말고 다음 산출물을 만들어 주세요.

1. P4-01~P4-05 각각의 닫힘/재오픈 판단
2. route별 UX/UI 문제 목록
3. Blocking / High / Medium / Low 우선순위
4. 바로 개발 가능한 P5 backlog
5. 유지해야 할 기준선
6. 화면별 구체 수정 지시
7. copy 또는 layout을 바꿔야 한다면 revised screen spec

## 특히 확인할 질문

- 공개 `/f/[slug]` 공유 shell이 저장 전 진입 화면으로 자연스러운가?
- 저장 후 My Flow와 Calendar screenshot이 충분히 실행형 앱처럼 보이는가?
- 특수 workbench route들이 하나의 FlowMe 앱처럼 보이는가?
- 홈과 Flow 찾기의 정보량이 상용 서비스 수준으로 충분히 낮아졌는가?
- 다음 루프를 한다면 어디부터 고쳐야 하는가?
