# 변경 파일과 소유 경계

2026-10-04. 별도 clean detached 작업본에서 이번 목표가 생성·수정한 파일 30개다. 처음부터 있던 dirty 파일을 인수한 것이 아니며 원본/현재 제공본에는 쓰지 않았다. 아래 파일만 다음 선별 게시 후보이고, 실제 게시 승인은 아직 없다.

## 변경 파일

- [components/flow/integrated-poc/ProgramTextEditor.context.test.tsx](../../../components/flow/integrated-poc/ProgramTextEditor.context.test.tsx)
- [components/flow/integrated-poc/ProgramTextEditor.journey.test.tsx](../../../components/flow/integrated-poc/ProgramTextEditor.journey.test.tsx)
- [components/flow/integrated-poc/ProgramTextEditor.module.css](../../../components/flow/integrated-poc/ProgramTextEditor.module.css)
- [components/flow/integrated-poc/ProgramTextEditor.tsx](../../../components/flow/integrated-poc/ProgramTextEditor.tsx)
- [docs/IDEAS.md](../../../docs/IDEAS.md)
- [docs/PROJECT_CONTROL.md](../../../docs/PROJECT_CONTROL.md)
- [docs/ROADMAP.md](../../../docs/ROADMAP.md)
- [docs/STATUS.md](../../../docs/STATUS.md)
- [docs/content-audit/2026-10-04-flowme-memo-date-ux-assets/template.html](../../../docs/content-audit/2026-10-04-flowme-memo-date-ux-assets/template.html)
- [docs/content-audit/2026-10-04-flowme-memo-date-ux-ko.html](../../../docs/content-audit/2026-10-04-flowme-memo-date-ux-ko.html)
- [docs/specs/2026-10-04-personal-memo-date-ux/contract-audit.md](../../../docs/specs/2026-10-04-personal-memo-date-ux/contract-audit.md)
- [docs/specs/2026-10-04-personal-memo-date-ux/design.md](../../../docs/specs/2026-10-04-personal-memo-date-ux/design.md)
- [docs/specs/2026-10-04-personal-memo-date-ux/ownership.md](../../../docs/specs/2026-10-04-personal-memo-date-ux/ownership.md)
- [docs/specs/2026-10-04-personal-memo-date-ux/plan.md](../../../docs/specs/2026-10-04-personal-memo-date-ux/plan.md)
- [docs/specs/2026-10-04-personal-memo-date-ux/qa.md](../../../docs/specs/2026-10-04-personal-memo-date-ux/qa.md)
- [docs/specs/2026-10-04-personal-memo-date-ux/requirements.md](../../../docs/specs/2026-10-04-personal-memo-date-ux/requirements.md)
- [docs/specs/2026-10-04-personal-memo-date-ux/results.md](../../../docs/specs/2026-10-04-personal-memo-date-ux/results.md)
- [docs/specs/2026-10-04-personal-memo-date-ux/spec.md](../../../docs/specs/2026-10-04-personal-memo-date-ux/spec.md)
- [docs/specs/2026-10-04-personal-memo-date-ux/tasks.md](../../../docs/specs/2026-10-04-personal-memo-date-ux/tasks.md)
- [docs/specs/README.md](../../../docs/specs/README.md)
- [lib/flow/integrated-poc/text-context-presentation.test.ts](../../../lib/flow/integrated-poc/text-context-presentation.test.ts)
- [lib/flow/integrated-poc/text-context-presentation.ts](../../../lib/flow/integrated-poc/text-context-presentation.ts)
- [scripts/content-audit/build-memo-date-ux-20261004.mjs](../../../scripts/content-audit/build-memo-date-ux-20261004.mjs)
- [scripts/content-audit/build-memo-date-ux-20261004.test.mjs](../../../scripts/content-audit/build-memo-date-ux-20261004.test.mjs)
- [scripts/content-audit/qa-memo-date-html-20261004.js](../../../scripts/content-audit/qa-memo-date-html-20261004.js)
- [scripts/content-audit/serve-memo-date-ux-20261004.mjs](../../../scripts/content-audit/serve-memo-date-ux-20261004.mjs)
- [scripts/personal-workspace-poc/memo-date-browser-fixture-20261004.mjs](../../../scripts/personal-workspace-poc/memo-date-browser-fixture-20261004.mjs)
- [scripts/personal-workspace-poc/memo-date-browser-fixture-20261004.ts](../../../scripts/personal-workspace-poc/memo-date-browser-fixture-20261004.ts)
- [scripts/personal-workspace-poc/qa-memo-date-app-20261004.js](../../../scripts/personal-workspace-poc/qa-memo-date-app-20261004.js)
- [scripts/personal-workspace-poc/start-memo-date-qa-20261004.mjs](../../../scripts/personal-workspace-poc/start-memo-date-qa-20261004.mjs)

## 변경하지 않은 것

`package.json`/lockfile·vendor 모델·writer/API·Auth/DB/schema/migration·Flow/폴더 소속 정책·현재 DEV 작업본·자동 시작/Tunnel·main·Production은 변경하지 않았다. 설치는 이 worktree의 node_modules에서 수행했으며 인증 debug 패치는 로컬 dependency에만 적용했다. npm ignore-scripts 설치와 합성 설정이 실제 계정 연결이나 외부 writer 승인이 아니다.

원본 `D:/flowme2605/flow-mvp`의 dirty/untracked는 미소유다. 새 피드백 원문은 읽기만 했고 stage·삭제·정리·원본 이동을 하지 않았다. 현재 제공본 `D:/flowme2605/flow-ux-comparison-gaps-20261002`의 clean Git/build를 읽기만 확인했다.

## 근거 소유·검사 한계

모델/메모·날짜 계약, HTML 경계, 제품 표시/fixture를 분리해 독립 검토했다. root가 요구·구현·최종 검사 결과를 인수했다. 마지막 독립 검토는 파일을 바꾸거나 브라우저를 다시 실행한 검사가 아니며 재현된 결함을 찾지 못했다는 source/evidence 대조다.

`output/`, `.playwright-cli/`, `.next/`, `node_modules/`는 로컬 generated/ignored다. 화면·public JSON·합성 bundle 원본은 Git에 게시하지 않았고 [QA](qa.md)의 ‘로컬 전용 근거’ 범위로 남긴다. 원시 운영 자료·credentials·봉인 pack을 이 목록이나 Git에 복사하지 않았다.

scope reporter의 untracked 디렉터리 수는 실제 파일 수와 다르다. 이 파일 목록은 `git diff --name-only`와 `git ls-files --others --exclude-standard`를 개별 경로로 펼친 결과다. reporter의 scope 추천은 실제 runtime 검증을 대체하지 않는다.
