# P28-00 promise-delivery reconciliation handoff

이 패키지는 Claude Design과 Codex가 같은 근거로 FlowMe의 다음 UX 프로그램을 검토하도록 만든 공개 handoff다. 앱 구현 결과가 아니라, 현재 production과 P27 구현을 과거 UX 프로토타입의 사용자 약속과 대조하기 위한 입력 자료다.

## 바로 사용할 파일

- [복붙용 통합 프롬프트](./prompt-ko.md)
- [이전 콘텐츠 사용 프로토타입](./prior-artifacts/flow-content-usage-preview-ko.html)
- [프로토타입 핵심 약속 요약](./artifact-summary.md)
- [원본 provenance와 SHA-256](./artifact-manifest.json)
- [Desktop 렌더링](./screenshots/prior-preview-desktop.png)
- [Mobile 렌더링](./screenshots/prior-preview-mobile.png)

## 해석 규칙

- `prior-artifacts/flow-content-usage-preview-ko.html`은 `prior_design_artifact`다. 현재 production 구현이나 실제 사용자 검증으로 해석하지 않는다.
- 현재 동작은 [production](https://flowme2605.vercel.app), 현재 source, P27 구조화 evidence 순으로 다시 확인한다.
- 프로토타입의 5개 사례와 4개 destination은 모두 구현하기로 확정된 기능 목록이 아니다. 다양한 콘텐츠가 필요한 최소 입력, 전체 결과 미리보기, 조정, 저장·외부 이동 계약을 검토하기 위한 대표군이다.
- 자동화, 에이전트 simulation, screenshot 검토는 실제 사용자 관찰로 계산하지 않는다.

## 공개 링크

- Package: <https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-21-p28-00-promise-delivery-reconciliation>
- Prompt: <https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-21-p28-00-promise-delivery-reconciliation/prompt-ko.md>
- Prior artifact: <https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-21-p28-00-promise-delivery-reconciliation/prior-artifacts/flow-content-usage-preview-ko.html>

## 권장 사용법

1. Claude Design과 Codex에 `prompt-ko.md`를 동일하게 전달한다.
2. 별도 로컬 첨부 대신 이 패키지의 GitHub 링크를 사용한다.
3. Claude Design은 current/proposed hierarchy와 wireframe을, Codex는 source/data/implementation feasibility를 맡는다.
4. 두 결과를 합친 뒤에만 P28 구현 slice를 확정한다.

스크린샷은 2026-07-21에 로컬 HTML을 Edge headless로 렌더링한 확인 자료다. 현재 production screenshot이 아니다.
