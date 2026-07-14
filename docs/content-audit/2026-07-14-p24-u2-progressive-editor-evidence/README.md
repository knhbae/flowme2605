# P24-U2 Progressive My Flow Editor Evidence

**Date:** 2026-07-14
**Baseline:** `74a78eb`
**Evidence type:** automated browser and code inspection, not observed-user research

## Verdict

My Flow 항목 수정은 제목, 날짜, 시간, 메모를 기본 화면에 남기고 장소, 반복, 소요시간, 결정, 기록을 한 개의 `세부 설정` 아래에 둔다. 저장된 고급값이 있는 항목은 다시 열 때 자동으로 펼쳐진다. 콘텐츠 의도를 판별할 때 Flow 전체 제목이나 일반적인 `메모` 표현을 사용하지 않으므로, 이사 견적 항목에 구매/보류/거절 또는 별도 기록 필드가 나타나지 않는다.

## Claude Design `(8)` 적용

- Mockup A의 기본 편집 필드와 `세부 설정 · 반복 · 소요시간` progressive disclosure를 적용했다.
- 기능을 삭제하지 않고 기본 화면의 필드 경쟁만 줄였다.
- 결정 필드는 실제 구매/보류/거절, 계약 중단, `hold_eligible` 신호가 있는 항목에만 제공한다.
- 저장된 장소, 반복, 소요시간, 결정, 기록 값은 재방문 시 숨기지 않는다.

## Files

- `components/flow/AppClient.tsx`
- `tests/e2e/p24-execution-trust.spec.ts`
- `tests/e2e/flow-mvp.spec.ts`
- `tests/e2e/url-first-user-surface.spec.ts`
- `audit.md`
- `route-evidence.json`
- `screenshots/`

## Automated Evidence

- 모바일 기본 편집의 고급 입력 control 0
- 이사 항목의 결정/기록 입력 control 0
- 고급 설정 한 번 열기로 장소와 반복 접근
- 장소와 반복 저장 후 새로고침 및 재방문 시 자동 펼침
- 구매 판단 항목에서만 결정 필드 접근
- 모바일 390px과 wide 1024px horizontal overflow 0
- source-backed 반복 회차가 원래 항목의 장소 설정을 상속하고 ICS에 유지

## Observation Still Required

- `세부 설정`이라는 이름만으로 장소와 반복을 충분히 예측하는지
- 저장된 고급값을 자동으로 펼치는 것이 재방문 편집에 유리한지
- 구매 판단 항목에서 결정 상태와 다음 확인일을 함께 두는 것이 과밀하지 않은지
