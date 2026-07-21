# P28 Cross-Surface Experience Reconstruction

- Date: 2026-07-22
- Branch: `codex/p28-program-plan`
- PR: [#144](https://github.com/knhbae/flowme2605/pull/144)
- Status: `Merged`, `Deployed`
- Implementation commit: `5809e6d7e69f857f1ab2d44ae5721d27adcc3a77`
- Merge commit: `9a839d02be5b03faf917903b09b07e7c0014210e`
- Production: <https://flowme2605.vercel.app>
- Deployment: `dpl_6wyYqhweXvJPDiFqCQLsNp18gHXQ` (`READY`)

## Why

Flow 찾기 저장 전 조정, 반복 Flow, My Flow, Calendar가 서로 다른 화면 문법을 사용했고, 많은 Flow와 긴 outline에서 정보 밀도가 커졌다. P28은 기존 source/personal/run/occurrence/export identity를 유지하면서 이 표면을 하나의 실행 문법으로 재구성했다.

## What Changed

- 비교 gate에서 Hybrid 구조를 선택했다: compact whole outline, actual-data result, contextual adjustment, save/export.
- item role과 destination eligibility를 하나의 projection contract로 고정했다.
- workout 전용 완료 문법을 제거하고 요일, 시간, 예상 시간, 종료 조건을 공용 routine definition으로 통일했다.
- My Flow는 모바일 drill-in과 wide rail/detail을 사용한다.
- Calendar는 저장된 Flow가 6개 이상이면 searchable multi-select picker를 사용한다.
- Flow execution, Calendar, Checklist, Sheet, Memo 다섯 형태를 실제 Flow row로 검증했다.

## Not Done

- observed-user validation, account sync, external Calendar/Todo OAuth, real AI/crawler
- 50개 이상 My Flow virtualization
- legacy full workbench 제거

## Decisions

- FlowMe는 fixed five-tab gallery나 heavy planner를 만들지 않는다.
- 각 Flow는 content-native primary result 하나와 의미 있는 secondary result 최대 두 개만 노출한다.
- resource/reference/warning은 읽을 맥락으로 유지하지만 완료 항목으로 투영하지 않는다.

## Important Files

- `components/flow/FlowArtifactDataPreview.tsx`
- `components/flow/RoutineScheduleEditor.tsx`
- `components/flow/CalendarFlowScopePicker.tsx`
- `lib/flow/flow-experience-projection.ts`
- `components/flow/AppClient.tsx`
- `docs/content-audit/2026-07-22-p28-final-review-package/`

## Verification

- pretest: `25 / 25`
- unit: `584 / 584`
- P28 Playwright: `7 / 7`
- full Playwright: `346 / 346`
- production build: `18 / 18`
- docs check: `14` required files, `2809` local links
- responsive screenshots: `19`
- representative horizontal overflow, console error, page error: `0`
- `git diff --check`: pass after evidence formatting normalization

## Risks And Follow-ups

- Automated and heuristic evidence does not prove that users understand the hierarchy.
- Owner and independent design review must classify the release as `keep`, `revise`, or `redesign` before opening P29.
- The 24-item disclosure, routine editor length, 50+ Flow scale, and legacy advanced disclosure remain review targets.

## Links

- [P28 final package](../content-audit/2026-07-22-p28-final-review-package/README.md)
- [P28 review board](../content-audit/2026-07-22-p28-final-review-package/review.html)
- [Production](https://flowme2605.vercel.app)
