# P24-U1 Inline Completion and Today Evidence

**Date:** 2026-07-14  
**Baseline:** `4179a50`  
**Evidence type:** automated browser and code inspection, not observed-user research

## Verdict

My Flow와 Calendar의 실행 행은 항목 또는 반복 회차 하나당 완료 체크박스 한 개를 갖는다. 행에서 상세를 펼쳐도 같은 완료 체크박스를 다시 만들지 않는다. 완료 직후에는 화면을 이동하지 않고 5초 동안 하단 스낵바에서 `실행 취소`를 제공한다. 완료 목록에서도 같은 체크박스를 한 번 눌러 다시 진행할 수 있다.

Today의 후속 큐는 실행 카드가 아닌 `다음 예정` 미리보기로 낮췄다. 미리보기 행에는 완료 체크박스가 없고, 상세를 명시적으로 열었을 때만 해당 상세가 독립 실행 문맥을 갖는다.

## Claude Design `(8)` 적용

- Mockup B: 완료 항목을 화면에서 잃지 않고 `완료 N`으로 모으며, 하단 스낵바에서 즉시 취소한다.
- Mockup F: 지금 실행할 행만 체크 가능하게 두고, 다음 항목은 완료 컨트롤이 없는 낮은 톤의 예고로 표시한다.
- 목업의 시각 형태를 그대로 복제하지 않고 FlowMe의 기존 4탭, Flow 색 마커, 접근성 이름을 유지했다.

## Files

- `components/flow/AppClient.tsx`
- `tests/e2e/p24-execution-trust.spec.ts`
- `tests/e2e/flow-mvp.spec.ts`
- `audit.md`
- `route-evidence.json`
- `screenshots/`

## Automated Evidence

- 일반 항목 완료, 스낵바 취소, 같은 행 복귀
- 완료 목록에서 한 번 눌러 다시 진행
- 반복 occurrence 완료, 스낵바 취소, stable occurrence ID 유지
- Today 후속 미리보기 완료 체크박스 0
- inline 상세의 중복 완료 체크박스 0
- 모바일 390px과 wide 1024px horizontal overflow 0

## Observation Still Required

- 5초 취소 시간이 실제 사용자에게 충분한지
- 완료 항목을 기본 접힘 상태로 두는 것이 자연스러운지
- Calendar overflow 안의 완료 행이 정렬 뒤로 이동해도 스낵바만으로 복구 경로를 이해하는지

