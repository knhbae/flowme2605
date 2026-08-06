# Pass 1 blind release — coordinator index

> 상태: `INDEX_CONTENT_READY / EXTERNAL_LAUNCH_ENVELOPE_PENDING`
>
> 검토 성격: `INDEPENDENT BLIND REVIEW INPUT`
>
> 관찰 사용자: `0명`

이 디렉터리는 clean product candidate와 asset commit A에 결속된 Pass 1 입력을 coordinator가 점검하는 index다. evidence URL·bytes·SHA-256과 REQUIRED_GLOBAL은 완성됐다. 이 README 자체는 reviewer 시작 자료가 아니다. coordinator는 index commit B를 만든 뒤 그 SHA를 외부 launch envelope에 기록하고 reviewer별 prompt와 allowlist만 전달한다.

## 세션 격리와 lifecycle 기록

- Codex와 Claude Design은 각각 새 세션에서 시작한다.
- index commit B SHA는 자기 파일 안이 아니라 외부 launch envelope에 기록한다.
- reviewer session ID는 사전 evidence 입력이 아니다. fresh session 시작과 동시에 생성해 reviewer freeze와 coordinator envelope에 기록한다.
- 기존 대화·메모리·다른 reviewer 결과가 노출되면 `BLIND_CONTAMINATED`로 중단한다.

## reviewer별 입력

1. 공통: [중립 brief](./01-neutral-review-brief-ko.md), [scenario matrix](./04-neutral-scenario-matrix-ko.md), [evidence contract](./05-evidence-contract-ko.md), [scorecard](./06-scorecard-ko.md)
2. Codex: [Codex prompt](./02-codex-pass1-prompt-ko.md), [Codex·shared allowlist](./07-blind-evidence-allowlist-template.md)
3. Claude Design: [Claude prompt](./03-claude-pass1-prompt-ko.md), [S17 제외 static allowlist](./08-claude-static-evidence-allowlist.md)

S17은 `CODEX_ONLY_READY`이며 Claude allowlist에는 URL 자체가 없다. S22의 `NOT_ASSESSED_ALLOWED`는 performance budget/trace가 없는 의도적 예외다. S23의 `REVIEWER_ACTION_REQUIRED`는 정적 PASS가 아니라 reviewer가 직접 자유 탐색을 수행해야 하는 action state다.

## 시작 gate

- product candidate SHA·clean proof·BUILD_ID·build log·seed/reset manifest가 서로 일치한다.
- asset commit A의 direct URL이 열리고 allowlist hash와 일치한다.
- index commit B SHA가 외부 launch envelope에 기록됐다.
- reviewer는 자기 전용 prompt와 allowlist만 받는다.

## 산출물

- Codex finding: `CX-001`부터 연속 번호
- Claude Design finding: `CD-001`부터 연속 번호
- scenario 결과: `PASS | REVISE | BLOCKED | NOT_RUN`
- 성능은 별도 측정 입력이 없으므로 `NOT_ASSESSED`

제품 코드, fixture, test, 문서 또는 배포 상태를 수정하지 않는다.
