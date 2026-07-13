# Claude Design 복붙용 P23 검토 프롬프트

아래 GitHub review package를 기준으로 FlowMe의 **실행 라이프사이클 완전성**을 제품/UX 관점에서 검토해 주세요.

검토 대상:

- `docs/content-audit/2026-07-13-flowme-execution-lifecycle-completeness-review/README.md`
- `docs/content-audit/2026-07-13-flowme-execution-lifecycle-completeness-review/audit.md`
- `docs/content-audit/2026-07-13-flowme-execution-lifecycle-completeness-review/review.html`
- `docs/content-audit/2026-07-13-flowme-execution-lifecycle-completeness-review/capability-matrix.json`
- `docs/content-audit/2026-07-13-flowme-execution-lifecycle-completeness-review/state-transition-matrix.json`
- `docs/content-audit/2026-07-13-flowme-execution-lifecycle-completeness-review/export-projection-matrix.json`
- `docs/content-audit/2026-07-13-flowme-execution-lifecycle-completeness-review/scenario-evidence.json`
- `docs/content-audit/2026-07-13-flowme-execution-lifecycle-completeness-review/screenshots/`

이번 검토는 화면 polish 평가가 아니라 아래 lifecycle이 제품으로 완결되는지 판단하는 작업입니다.

```text
발견 → 저장 → 개인 수정 → 일정 배치 → 실행 → 완료 → 완료 취소
→ 건너뜀/제외 → 항목 추가 → 삭제/복구 → 순서 변경
→ Calendar/checklist/sheet/memo export → 전체 완료 → 회고 → 다시 쓰기 → 원본 업데이트
```

반드시 아래 6개 Flow 유형을 분리해 보세요.

1. 기준일 역산형: 이사 준비
2. 날짜 없는 체크리스트형: 여행/차량 점검
3. 반복 루틴형: 운동/영어 학습
4. 순서·일정 혼합형: 여행/프로젝트 준비
5. 기록·메모형: 냉장고 정리
6. 개인 초안형: URL-first miss draft

현재 감사의 핵심 가설은 다음과 같습니다.

- 완료와 완료 취소는 이미 지원된다.
- 개인 title/date/memo overlay와 완료 Flow 재사용도 상당 부분 지원된다.
- 하지만 날짜 없는 항목에 날짜를 추가하는 경로는 없다.
- 개인 항목 add/delete/restore/reorder는 없다.
- Flow Map direct save와 URL draft/personal copy의 기준일 설정 가능 범위가 다르다.
- full-flow export와 portable-step export가 완료/skip 상태를 같은 방식으로 읽지 않는다.
- source/personal overlay/execution run의 ownership contract는 문서에 있지만 runtime은 아직 여러 저장 키와 builder로 분산돼 있다.

요청하는 출력:

1. 감사의 supported / hidden / partial / missing / blocked 분류가 타당한지 반박 또는 승인
2. 사용자 여정에서 가장 치명적인 빈칸 5개
3. source / personal overlay / execution run / occurrence / version resolution의 권장 책임 경계
4. 완료·미완료·건너뜀·제외·삭제의 사용자 mental model과 visible copy 원칙
5. 날짜 없는 Item을 선택적으로 일정화하고 다시 날짜 없음으로 돌리는 최적 UX
6. add/delete/restore/reorder의 모바일 390px interaction pattern
7. Calendar/checklist/sheet/memo/ICS의 완료·skip·exclude·delete 포함 정책
8. 반복 Flow의 회차 완료와 Flow 종료를 구분하는 UX
9. source update 때 개인 item/tombstone/order를 보존하는 three-way review UX
10. 실제 사용자 관찰로만 확인할 수 있는 질문

P23 backlog는 단순 평가가 아니라 아래 형식으로 구체화해 주세요.

- **Blocking / High / Medium / Low**
- 각 항목의 사용자 문제
- 적용 route와 Flow 유형
- 상태 전이 before/after
- data ownership 및 schema 영향
- 모바일 390px / wide 1024px interaction
- My Flow / Calendar / export 영향
- 접근성·keyboard·undo 요구
- acceptance criteria
- 필요한 screenshot/E2E/evidence marker
- 선행/후행 의존성

특히 아래 권장 순서를 검토하고, 더 나은 순서가 있으면 수정해 주세요.

1. P23-01 personal structural overlay: user item, tombstone, restore, order
2. P23-02 optional scheduling: undated ↔ dated, time/repeat
3. P23-03 run status semantics: done/reopen/skip/held/exclude 분리
4. P23-04 unified effective projection
5. P23-05 reuse/version merge/history

주의:

- 자동화 screenshot을 실제 사용자 검증으로 표현하지 마세요.
- 현재 localStorage MVP 제약과 장기 canonical runtime 방향을 분리하세요.
- 새 AI 기능, 계정/DB, OAuth 연동을 이번 P23 핵심 해결책으로 앞세우지 마세요.
- Studio를 5번째 탭으로 제안하지 마세요.
- 내부 구현어를 사용자-facing copy로 제안하지 마세요.
- 예쁜 화면보다 상태 의미, 되돌리기, projection 일관성, 재사용 가능성을 우선하세요.

마지막에 **권장 P23 실행 순서 1개**와 **다음 `/goal`로 바로 쓸 수 있는 P23-01 상세 프롬프트**를 작성해 주세요.
