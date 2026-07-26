# FlowMe MECE UX Reset Claude Design Handoff

- 작성일: 2026-07-26
- 목적: Codex의 1차 설계안을 독립적으로 검토하고, 상용 수준의 alternative interactive wireflow를 제안
- 작업 유형: UX/UI 검토·비교·설계
- 앱 코드 변경: 금지
- 실제 관찰 사용자 수: 0명
- 현재 상태: local handoff, 아직 commit/push되지 않음

## 가장 빠른 사용법

Claude Design에는 GitHub 링크가 포함된 아래 파일 전체를 복사해 전달한다.

[claude-design-github-prompt-ko.md](./claude-design-github-prompt-ko.md)

같은 PC에서 Claude Code를 실행할 때는 아래 로컬 실행용 프롬프트를 사용할 수
있다.

[claude-design-launch-prompt-ko.md](./claude-design-launch-prompt-ko.md)

Claude가 같은 로컬 workspace를 읽을 수 있다면 launch prompt가 아래 정본을 참조한다.

[claude-design-master-prompt-ko.md](./claude-design-master-prompt-ko.md)

Claude가 로컬 workspace를 읽지 못한다면 업로드용 ZIP과 아래 프롬프트를 함께
전달한다.

[claude-design-upload-prompt-ko.md](./claude-design-upload-prompt-ko.md)

업로드용 ZIP:

`D:\flowme2605\flow-current-main\claude_work\FlowMe-MECE-UX-Reset-Claude-Design-Handoff-2026-07-26.zip`

## 이 패키지로 시킬 수 있는 일

1. 현재 production과 Codex 제안을 독립적으로 비교
2. Home, My Flow, Calendar의 MECE 역할 재판정
3. A/B/C 정보 구조와 UI tree 비교
4. 다섯 실제 콘텐츠의 15-session journey 재시뮬레이션
5. 390px·1024px·1440px interactive wireflow 제작
6. 저장 전, receipt, library, personal Flow, Calendar, export 화면 재설계
7. 공통 command grammar와 component anatomy 설계
8. 콘텐츠 shape별 renderer와 progressive disclosure 설계
9. 상용 앱 수준의 visual system과 responsive composition 설계
10. keyboard, focus, accessible name, recovery 검토
11. Codex 제안에 대한 red-team 반박
12. 개발자가 바로 사용할 수 있는 UXR-08/09 구현 handoff 작성

## 읽기 순서

1. [claude-design-github-prompt-ko.md](./claude-design-github-prompt-ko.md)
2. [claude-design-master-prompt-ko.md](./claude-design-master-prompt-ko.md)
3. [evidence-manifest.json](./evidence-manifest.json)
4. [journey-screen-contract-ko.md](./journey-screen-contract-ko.md)
5. [review-checklist-ko.md](./review-checklist-ko.md)
6. [response-template-ko.md](./response-template-ko.md)
7. [output-contract.json](./output-contract.json)
8. 필요할 때 [optional-followup-prompts-ko.md](./optional-followup-prompts-ko.md)

## 1차 Codex 설계 묶음

정본 위치:

`D:\flowme2605\flow-current-main\docs\content-audit\2026-07-26-flowme-mece-ux-reset\`

핵심 파일:

- `README.md`
- `review.html`
- `journey-scorecard.json`
- `screenshots/`
- `D:\flowme2605\flow-current-main\docs\specs\2026-07-26-flowme-mece-ux-reset\plan.md`
- `D:\flowme2605\flow-current-main\docs\specs\2026-07-26-flowme-mece-ux-reset\design-package.md`
- `D:\flowme2605\flow-current-main\docs\specs\2026-07-26-flowme-mece-ux-reset\simulation.md`

Codex 안은 비교 대상이지 정답이 아니다.

## Claude 결과 저장 권장 위치

```text
D:\flowme2605\flow-current-main\docs\content-audit\
  2026-07-26-flowme-mece-ux-reset-claude-design-proposal\
```

필수 결과:

```text
README.md
audit.md
review.html
decision-matrix.json
journey-scorecard.json
screen-message-contract.json
interaction-grammar.md
visual-system.md
implementation-handoff.md
screenshots/
```

## 중요한 evidence 경계

- Production은 현재 사용자 화면 근거다.
- GitHub current source는 현재 구현 계약 근거다.
- Codex `review.html`은 proposed design artifact다.
- Claude가 만든 HTML도 proposed design artifact다.
- screenshot, browser automation, heuristic simulation은 실제 사용자 검증이 아니다.
- observed-user count는 계속 0명이다.

## 작업 경계

다음은 수정하지 않는다.

- 앱 코드와 테스트
- 저장 데이터와 migration
- dependency와 lockfile
- `docs/STATUS.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`
- 기존 Codex 1차 설계 묶음
- pre-existing dirty paths

commit, push, PR, merge, deploy도 수행하지 않는다.
