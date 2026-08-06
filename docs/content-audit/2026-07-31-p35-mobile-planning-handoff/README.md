# P35 모바일 기획·디자인 작업 패키지

이 폴더는 최근 Production 모바일 피드백을 다음 기획 세션과 Claude Design이 바로 이어서 다룰 수 있도록 만든 작업 입력물입니다. 여기서 결론을 미리 정하거나 제품을 수정하지 않습니다.

## 가장 먼저 볼 링크

- [Claude Design 1차 작업 시작](./00-claude-design-round1-start-here-ko.md)
- [기획 세션 시작 문서](./01-planning-session-brief-ko.md)
- [Production 화면 증거](./02-production-evidence-index-ko.md)
- [원격 검토용 구조 사실](./03-architecture-facts-ko.md)
- [화면 상태·차이 비교표](./04-screen-state-and-variant-matrix-ko.md)
- [Claude Design 1차 독립 검토 프롬프트](./05-claude-design-round1-prompt-ko.md)
- [사용자 피드백 정리본](./06-owner-feedback-normalized-ko.md)
- [Claude Design 2차 대조 프롬프트](./07-claude-design-round2-prompt-ko.md)
- [Codex 로컬 검토 프롬프트](./08-codex-local-review-prompt-ko.md)
- [새 기획 세션 시작 프롬프트](./09-planning-session-kickoff-prompt-ko.md)

## 기준 상태

- 기준일: 2026-07-31
- Production: <https://flowme2605.vercel.app>
- 코드 기준: `c09f859b30b854f6f897b8ec1eb781fd774fbeca`
- 화면 기준: 모바일 `390 × 844`, Production 직접 캡처
- 검토 대상: P35 Production의 Flow 찾기, 공개 Flow, 조정, 저장, 가져가기, My Flow
- 이번 범위 밖: Text-to-Flow, 사용자 관찰, 구현, 배포, 계정·동기화·협업 확장

## 권장 사용 순서

### 1. 새 기획 세션

`01`과 `06`을 참고 자료로 주고, `09`의 프롬프트로 시작합니다. 세션의 목표는 화면을 바로 고치는 것이 아니라 다음 구현에서 지킬 구조와 우선순위를 결정하는 것입니다.

### 2. Claude Design 1차 검토

Claude Design에는 `00-claude-design-round1-start-here-ko.md` GitHub 링크를 먼저 전달합니다. 그 문서에서 아래 다섯 자료로만 이동하게 합니다.

1. `01-planning-session-brief-ko.md`
2. `02-production-evidence-index-ko.md`
3. `03-architecture-facts-ko.md`
4. `04-screen-state-and-variant-matrix-ko.md`
5. `05-claude-design-round1-prompt-ko.md`

이 단계에서는 `06-owner-feedback-normalized-ko.md`를 주지 않습니다. 먼저 독립적인 문제 진단과 대안을 받기 위한 순서입니다.

### 3. Claude Design 2차 대조

1차 답변을 받은 뒤 `06`과 `07`을 제공합니다. 사용자 피드백에 단순히 동의하는지, 같은 현상을 다른 원인으로 보는지, 추가 발견이 있는지를 구분합니다.

### 4. Codex 로컬 검토

Codex에는 `08`을 사용합니다. Codex는 로컬 코드와 Production을 직접 확인하고, Claude Design의 화면 중심 제안과 코드 영향 범위를 연결합니다.

## 이 패키지가 답을 유도하지 않도록 한 장치

- 화면에서 보인 사실과 원인 가설을 분리했습니다.
- 화면 차이만 보고 콘텐츠별 하드코딩이라고 단정하지 않습니다.
- `새 화면`, `모달`, `통합` 같은 해결책을 미리 정하지 않습니다.
- 사용자 피드백은 독립 검토 뒤에 공개합니다.
- 전면 리팩토링 여부는 코드 근거와 영향 범위를 본 뒤 판단하게 합니다.

## 다음 결정 전에는 하지 않는 일

- 제품 코드 수정
- 공개 Flow나 My Flow의 화면 구조 확정
- Text-to-Flow 결합
- 배포
- 자동화 결과를 사용자 관찰로 표현
