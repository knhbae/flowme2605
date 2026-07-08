FlowMe P5-01~P5-07 개선 루프를 다시 검토해줘.

전제:
- Vercel은 볼 수 없다고 가정하고 GitHub 소스/문서/screenshot만 보고 판단해줘.
- 단순 감상평이 아니라 다음 산출물을 만들어줘.
- P5-01~P5-07이 닫혔는지, 다시 열어야 하는지, 다음 P6 backlog가 필요한지 판단해줘.

먼저 볼 파일:
1. `flow-mvp/docs/content-audit/2026-07-04-claude-design-p5-final-review-package/review.html`
2. `flow-mvp/docs/content-audit/2026-07-04-claude-design-p5-final-review-package/audit.md`
3. `flow-mvp/docs/content-audit/2026-07-04-claude-design-p5-final-review-package/route-evidence.json`
4. `flow-mvp/docs/content-audit/2026-07-04-claude-design-p5-final-review-package/screenshots/`
5. `flow-mvp/docs/SERVICE_STRUCTURE.md`

검토 기준:
- 4탭 IA는 유지: 홈 / Flow 찾기 / 캘린더 / 내 Flow
- 공개 `/f/[slug]`는 공유 진입 shell 예외로 유지
- 저장 후에는 My Flow 실행 허브로 이어져야 함
- 사용자는 Flow/Step/Item/source-backed/review/audit 같은 내부 모델을 몰라도 돼야 함
- seed/source-backed 데이터와 저장/실행/export 스키마는 유지
- 화면은 설명형이 아니라 실행형 앱처럼 보여야 함
- 모바일 390px에서 좌우 스크롤, 하단 sticky 겹침, raw ISO 날짜, 중복 라벨이 없어야 함

특히 확인할 P5 항목:
1. P5-01 공유 `/f/[slug]` 입력/저장 CTA hierarchy
2. P5-02 sticky bottom clearance
3. P5-03 My Flow 상태 라벨 반복 제거
4. P5-04 `/flows` 카드 CTA 경량화
5. P5-05 날짜 입력 선택지/사용자용 날짜 포맷
6. P5-06 `...일정 지도`, `Mathbang`, `저장한 지도` 같은 내부어 표시 제거
7. P5-07 냉장고 workbench 빈 placeholder 정리

산출물:
1. P5-01~P5-07 각각의 Close / Reopen / Needs follow-up 판정
2. route별 UX/UI 문제 목록
3. Blocking / High / Medium / Low 우선순위
4. 바로 개발 가능한 P6 backlog
5. 유지해야 할 기준선
6. 화면별 구체 수정 지시
7. revised screen spec 또는 copy 제안이 필요하면 함께 작성

현재 evidence 요약:
- Screenshot: 41장
- Branch: `codex/flowme-uxui-second-loop`
- Commit: `7bf3bec`
- P5 표시어 scan hits: 0
- raw ISO visible text hits: 0
- trailing Flow title hits: 0
- horizontal overflow failures: 0
