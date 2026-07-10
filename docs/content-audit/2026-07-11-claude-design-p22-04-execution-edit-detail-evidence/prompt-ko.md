# Claude Design 복붙용 검토 프롬프트

FlowMe P22-04 구현 결과를 검토해 주세요.

이번 검토 대상은 My Flow와 Calendar의 할 일 상세에서 **실행 상태와 편집 상태를 분리한 결과**입니다. 새 기능 제안보다 아래 경계가 실제 상용 서비스 UX로 충분한지 판단해 주세요.

## 제품 맥락

- FlowMe의 중심은 URL/메모로 찾거나 만든 Flow를 My Flow와 Calendar에서 실행하는 것입니다.
- 할 일 제목과 Flow 맥락은 바깥 행에 이미 보입니다.
- 기본 상세는 실행, 명시적 편집 상태는 제목·날짜·메모 수정에 집중해야 합니다.
- Studio를 5번째 탭이나 full-screen editor로 확장하지 않았습니다.

## 이번 변경

1. 기본 상세의 직접 행동을 완료 체크와 닫기 2개로 제한했습니다.
2. inline 상세의 중복 제목·날짜·Flow 메타를 제거했습니다.
3. 메모·일정을 펼쳐야 수정 입구가 나타납니다.
4. 원문·내 도구를 펼쳐야 source/export 행동이 나타납니다.
5. 편집 중에는 완료 체크, 실행 체크리스트, source/export를 숨깁니다.
6. 수정 취소는 상단, 변경 저장은 입력 끝에 둡니다.
7. 변경 전 저장은 disabled, 변경 후 enabled입니다.
8. My Flow/Calendar와 390px/1024px 모두 같은 규칙을 씁니다.

## 검토 자료

- README: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-11-claude-design-p22-04-execution-edit-detail-evidence/README.md
- Audit: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-11-claude-design-p22-04-execution-edit-detail-evidence/audit.md
- Review HTML: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-11-claude-design-p22-04-execution-edit-detail-evidence/review.html
- Route evidence: https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-11-claude-design-p22-04-execution-edit-detail-evidence/route-evidence.json
- Screenshots: https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-11-claude-design-p22-04-execution-edit-detail-evidence/screenshots
- 구현 commit: https://github.com/knhbae/flowme2605/commit/97c6250ca5d890d6ffd6434ca1c2341e2956efe9

## 꼭 답할 질문

1. 기본 상세가 실행 중심으로 충분히 단순해졌나요?
2. `메모·일정` 안의 수정 입구는 너무 숨겨져 있나요, 아니면 실행 집중에 적절한가요?
3. 편집 중 완료 체크와 원문/export를 숨긴 경계가 자연스러운가요?
4. 모바일 긴 편집 폼에서 저장을 필드 끝에 둔 것이 적절한가요?
5. Calendar group/행/상세의 정보 위계가 일관적인가요?
6. P22-04를 닫아도 되는 Blocking 문제가 남아 있나요?

## 출력 형식

다음 순서로 답해 주세요.

1. `P22-04 판정`: Close / Close with follow-up / Reopen
2. `Blocking`
3. `High`
4. `Medium`
5. `Low`
6. `유지해야 할 기준선`
7. `다음 구현 slice 1개`

각 finding에는 persona, route, viewport, screenshot id, 사용자 문제, 최소 수정, acceptance criteria를 적어 주세요. 전체 재설계나 추상적인 미감 평가는 피하고 현재 구조 안에서 판단해 주세요.

