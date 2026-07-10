아래 GitHub 소스, 문서, screenshot만 보고 FlowMe P21-01을 검토해주세요. Vercel preview는 볼 수 없다는 전제로 판단해주세요.

검토 대상:
1. URL-first miss/candidate 초안이 한 항목짜리 빈 골격이 아니라 3개 이상의 실제 제안 항목으로 펼쳐지는지
2. 제안 항목이 사용자가 쓴 제목과 메모에서 결정론적으로 만들어지고, 실제 AI가 생성한 것처럼 과장하지 않는지
3. 기준일을 넣으면 각 항목의 날짜가 순서대로 배치되는지
4. 저장 전에는 제안 목록만 확인하고, 저장 후 My Flow에서 포함 여부·제목·날짜·메모를 손보는지
5. 수정본이 Calendar와 export에 기존 모델로 반영되는지
6. Studio가 계속 보조 초안 선반이며 5번째 탭으로 승격되지 않았는지
7. P18~P20 기준선과 user-surface guardrail이 유지되는지

핵심 evidence 기대값:
- `urlFirstMissDraftSuggestedItemCount >= 3`
- `urlFirstMissDraftStepDatesFromAnchor: true`
- `urlFirstMissDraftImpliesLiveAi: false`
- `urlFirstMissDraftInternalHitCount: 0`
- `normalRouteStructuralDisplayHitCount: 0`
- `wideViewportStructuralDisplayHitCount: 0`
- `urlFirstVisibleMarkdownHitCount: 0`
- `urlFirstCandidateUserCopyInternalHitCount: 0`
- `draftFlowCalendarProjectionUpdated: true`
- `draftFlowExportProjectionUpdated: true`

출력 형식:
1. P21-01 닫힘 / 부분 미흡 / 미해결 판정
2. 사용자 여정상 남은 문제
3. P21-02~P21-05 실행 순서 재평가
4. 각 항목의 문제, 사용자 상황, route/screenshot, 권장 방향, 하지 말아야 할 것, 검증 기준
5. 다음 구현 목표 1개
