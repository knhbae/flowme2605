# Text Authoring unified editor guidance PoC

- Date: 2026-08-30
- Branch: `agent/text-authoring-unified-editor-guidance-poc-20260830`
- Base: `agent/text-authoring-flow-view-hybrid-ux-poc-20260828`
- PR: `PENDING`
- Status: `Draft`
- Deploy: `Not requested`; source와 target feature branch의 Vercel deployment를 비활성화

## Why

작성 틀 때문에 기존 Text Authoring 편집 경험이 별도 폼으로 갈라지지 않도록 한다. 사용자는 기존 Flow 편집기에서 구조형 TXT 골격을 시작점으로 받고, 일부만 작성하거나 자유롭게 삭제·복사·붙여넣기할 수 있어야 한다.

## What Changed

- 구조 기준 작성 틀 6개를 successor-local versioned snapshot으로 고정
- 빈 Flow 편집기의 기존 `+`에서 같은 CodeMirror에 scaffold를 transaction 한 번으로 삽입
- blank scaffold는 source에 보존하되 canonical Step·Item·field·issue를 만들지 않음
- `다음 할 일 → 하위 확인/항목 정보 → 새 단계` 관계와 실제 문법을 함께 표시
- 작성 틀 여부와 무관한 editor-wide 입력 예시 보기/숨기기
- 원문·selection·clipboard·scroll·dispatch·undo를 바꾸지 않는 presentation-only ghost
- source·target feature branch의 Vercel deployment 비활성화

## Not Done

- main app 또는 production route/store/schema 통합
- Vercel Preview·Production 배포
- 실제 Android/iOS 기기 검증
- 관찰 사용자 검증

## Decisions

- 작성 틀은 별도 form/textarea/materialize CTA가 아니라 기존 편집기에 넣는 선택형 TXT 골격이다.
- 빈 골격은 incomplete source이며 canonical 결과나 blocking issue가 아니다.
- 주제명은 예시이고 picker의 주 이름은 반복·기준일·일정 같은 구조를 설명한다.
- 이 PR은 main이 아니라 기존 Text Authoring hybrid PoC branch에 쌓는다.

## Important Files

- `components/flow/text-authoring/FlowLiveEditor.tsx`
- `lib/flow/text-authoring/parser.ts`
- `lib/flow/text-authoring/flow-view-model.ts`
- `docs/specs/2026-08-30-flowme-text-authoring-unified-editor-guidance-poc/`
- `tests/e2e/text-authoring-unified-editor-guidance-poc.spec.ts`
- `docs/content-audit/2026-08-30-flowme-text-authoring-unified-editor-guidance-poc-results/`

## Verification

- controller 7/7
- parser/model 56/56
- shared Text Authoring 422/422
- successor + inherited browser 23/23
- build PASS
- docs:check PASS
- full repository test 623/624: 수정하지 않은 현재 날짜 민감 seed review test 1건 실패

## Risks And Rollback

- 실제 모바일 IME/visual viewport 차이는 자동화 proxy가 대체하지 못한다.
- rollback은 이 PR merge commit을 revert하며 기존 hybrid PoC branch와 predecessor artifact는 보존한다.

## Follow-ups

- 실제 모바일 기기 확인과 관찰 사용자 검증은 별도 승인한다.
- production 통합은 clean target·owned paths·release gate를 다시 정한 뒤 별도 PR로 진행한다.
