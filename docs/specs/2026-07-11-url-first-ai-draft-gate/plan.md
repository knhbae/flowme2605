# URL-first AI Draft Gate Plan

## Files For A Future Implementation

| File/area | Responsibility |
| --- | --- |
| `lib/flow/url-first-supply-queue.ts` | P21-01 deterministic fallback 유지 |
| future provider-neutral service module | 생성 요청, timeout, validation, cancellation boundary |
| `components/flow/AppClient.tsx` | miss proposal review UI와 명시적 save gate |
| `lib/flow/storage.ts` | 기존 draft/personal overlay persistence 재사용 |
| `lib/flow/export.ts` | 사용자 검토 후 projection만 읽기 |
| `tests/e2e/url-first-user-surface.spec.ts` | proposal review, failure, fallback, no-auto-save E2E |
| `scripts/content-audit/capture-claude-p7-final-review-package.mjs` | 390/1024px AI gate evidence |

## Future Sequence

1. provider와 무관한 request/response runtime validator를 만든다.
2. fake provider fixture로 ready/generating/proposal/partial/failed 상태를 검증한다.
3. 사용자 검토 UI를 feature flag 뒤에 추가한다.
4. P21 personal overlay save adapter로 변환한다.
5. 민감 콘텐츠와 개인정보 gate를 검증한다.
6. 실제 provider는 마지막에 연결한다.
7. failure 시 P21-01 fallback으로 돌아가는지 broad E2E로 확인한다.

## Risk Controls

- provider SDK를 UI component에서 직접 호출하지 않는다.
- AI 전용 저장/실행/export schema를 만들지 않는다.
- 사용자 확인 전 persistence adapter를 호출하지 않는다.
- production flag가 꺼지면 P21-01만으로 모든 miss 흐름이 동작해야 한다.
- 실제 URL/memo를 provider에 보내기 전에 privacy와 retention을 검토한다.

## Current P21-02 Result

이번 slice는 spec만 작성한다. runtime, package dependency, 환경변수, API key, 사용자 UI는 변경하지 않는다.
