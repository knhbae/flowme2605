# P28-03 Save-before Whole-Flow Workspace Evidence

**Date:** 2026-07-22
**Evidence kind:** current source, current browser, automated simulation
**Observed users:** 0

## Verdict

`/f/[slug]`의 저장 전 화면을 P28-01에서 선택한 Hybrid 문법으로 연결했다.

- 전체 Flow는 처음 5개와 한 번의 `전체 보기` disclosure로 모든 항목을 확인할 수 있다.
- primary 결과와 의미 있는 secondary 결과는 P28-02 공통 projection의 실제 row/count를 읽는다.
- outline의 각 실행 항목에서 제목·날짜·메모 수정으로 바로 진입한다.
- 전체 조정에서는 포함/제외와 순서를, 선택 항목 조정에서는 날짜와 제목·메모 한 항목만 표시한다.
- Flow 개인 이름은 additive saved record에 저장하며 source title은 변경하지 않는다.
- 기존 상세 workbench는 기본 접힘 `세부 결과와 가져가기`로 낮춰 첫 화면의 중복을 제거했다.
- `/flows` URL hit가 단일 준비 Flow를 찾으면 동일한 public save-before workspace로 연결한다. 기존 빠른 저장은 접힌 보조 경로로 유지한다.

## Current result

| Marker | Result |
| --- | --- |
| `saveBeforeArchitecture` | `hybrid` |
| `wholeOutlineItemCount` | 24 |
| `wholeOutlineInitialVisibleCount` | 5 |
| `wholeOutlineExpansionActionCount` | 1 |
| `actualDataProjectionConnected` | true |
| `eligibleShapeControlCount` | 2 |
| `contextualItemEditReachable` | true |
| `flowPersonalTitlePersisted` | true |
| `sourceTitleMutationCount` | 0 |
| `wideMajorPaneCount` | 2 |
| `duplicateExpandedWorkbenchCount` | 0 |
| `horizontalOverflowCount` | 0 |

## Verification

- `npm.cmd test`: 578 passed
- `npm.cmd run build`: passed
- `npx.cmd playwright test tests/e2e/p28-experience-reconstruction.spec.ts`: 3 passed
- `npx.cmd playwright test tests/e2e/p27-foundation.spec.ts`: 12 passed
- Browser inspection: 390x844 and 1024x768

자동화 결과는 실제 사용자 관찰로 계산하지 않았다.
