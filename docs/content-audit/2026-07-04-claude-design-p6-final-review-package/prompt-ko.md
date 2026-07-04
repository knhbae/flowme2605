FlowMe P6-01~P6-08 개선 루프를 다시 검토해줘.

전제:
- Vercel은 볼 수 없다고 가정하고 GitHub 소스/문서/screenshot만 보고 판단해줘.
- 단순 감상평이 아니라 다음 산출물을 만들어줘.
- P6-01~P6-08이 닫혔는지, 다시 열어야 하는지, 다음 P7 backlog가 필요한지 판단해줘.

먼저 볼 파일:
1. `flow-mvp/docs/content-audit/2026-07-04-claude-design-p6-final-review-package/review.html`
2. `flow-mvp/docs/content-audit/2026-07-04-claude-design-p6-final-review-package/audit.md`
3. `flow-mvp/docs/content-audit/2026-07-04-claude-design-p6-final-review-package/route-evidence.json`
4. `flow-mvp/docs/content-audit/2026-07-04-claude-design-p6-final-review-package/screenshots/`
5. `flow-mvp/docs/SERVICE_STRUCTURE.md`

검토 기준:
- 4탭 IA는 유지: 홈 / Flow 찾기 / 캘린더 / 내 Flow
- 공개 `/f/[slug]`는 공유 진입 shell 예외로 유지
- 저장 후에는 My Flow 실행 허브로 이어져야 함
- 사용자는 Flow/Step/Item/source-backed/review/audit 같은 내부 모델을 몰라도 돼야 함
- seed/source-backed 데이터와 저장/실행/export 스키마는 유지
- 화면은 설명형이 아니라 실행형 앱처럼 보여야 함
- 모바일 390px에서 좌우 스크롤, 하단 sticky 겹침, raw ISO 날짜, 중복 라벨, source brand slug가 없어야 함
- 단, `/restart/moving-d30`는 prototype route라 raw ISO residual이 별도 기록되어 있음. 일반 사용자 route의 P6 blocker가 아니라 P7 후보인지 판단해줘.

특히 확인할 P6 항목:
1. P6-01 My Flow 첫 할 일 제목/상태 라벨 반복 제거
2. P6-02 `/f`와 `/flow-maps` 하단 sticky clearance
3. P6-03 `/flow-maps` 저장 CTA + 4탭 nav 하단 조작 영역 통합감
4. P6-04 `열어보기` CTA 문구 통일
5. P6-05 `확인할 항목`/`확인 항목` 중복 라벨 정리
6. P6-06 홈 보조 링크 중복 완화
7. P6-07 workbench 중복 시작 CTA 제거
8. P6-08 `AJD`, `Mathbang` 같은 source brand/slug 표시 정리

산출물:
1. P6-01~P6-08 각각의 Close / Reopen / Needs follow-up 판정
2. route별 UX/UI 문제 목록
3. Blocking / High / Medium / Low 우선순위
4. 바로 개발 가능한 P7 backlog
5. 유지해야 할 기준선
6. 화면별 구체 수정 지시
7. revised screen spec 또는 copy 제안이 필요하면 함께 작성

현재 evidence 요약:
- Screenshot: 50장
- Branch: `codex/flowme-uxui-second-loop`
- Commit: `05a951a`
- P6 표시어 scan hits: 0
- raw ISO visible text hits outside `/restart`: 0
- `/restart/moving-d30` prototype raw ISO residual hits: 16
- trailing Flow title hits: 0
- horizontal overflow failures: 0
- repeated first-task title failures: 0
