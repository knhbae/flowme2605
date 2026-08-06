# Pass 1 blind release

> 상태: `INPUT_STRUCTURE_COMPLETE / EVIDENCE_INCOMPLETE / DO_NOT_RUN`
>
> 검토 성격: `INTERNAL SIMULATION ONLY`
>
> 관찰 사용자: `0명`

이 디렉터리는 Pass 1 검토자가 받게 될 **완결된 입력 구조**다. evidence 값은 아직 `TBD`이므로 현재는 실행 가능한 입력 묶음이 아니다. 상위 디렉터리나 저장소의 다른 review 문서를 탐색하지 않는다. coordinator는 각 reviewer에게 blind-only publication의 commit-pinned 직접 링크만 제공한다.

## 세션 격리

- Codex와 Claude Design은 각각 **새 세션**에서 시작한다.
- 기존 대화, 메모리, 프로젝트 대화 요약, 다른 reviewer 결과를 상속하지 않는다.
- 세션을 새로 만들 수 없거나 의도하지 않은 맥락이 노출되면 `BLIND_CONTAMINATED`를 첫 줄에 기록하고 중단한다.
- 두 reviewer의 결과는 각각 동결될 때까지 교환하지 않는다.

## 전달 파일

1. [01-neutral-review-brief-ko.md](./01-neutral-review-brief-ko.md)
2. Codex 전용: [02-codex-pass1-prompt-ko.md](./02-codex-pass1-prompt-ko.md)
3. Claude Design 전용: [03-claude-pass1-prompt-ko.md](./03-claude-pass1-prompt-ko.md)
4. [04-neutral-scenario-matrix-ko.md](./04-neutral-scenario-matrix-ko.md)
5. [05-evidence-contract-ko.md](./05-evidence-contract-ko.md)
6. [06-scorecard-ko.md](./06-scorecard-ko.md)
7. [07-blind-evidence-allowlist-template.md](./07-blind-evidence-allowlist-template.md)

## 시작 gate

다음 값이 모두 채워져야 한다.

- `product_candidate_sha`
- `product_clean_tree_proof_sha256`
- `build_id`
- `blind_evidence_publication_sha`
- coordinator launch record의 `blind_release_index_sha`
- completed blind evidence allowlist; 모든 행의 status가 `READY`
- required evidence URL과 파일 SHA-256

`product_candidate_sha`를 얻은 product tree가 dirty이면 이 release는 `NOT_READY`다. build ID나 evidence publication SHA로 product candidate SHA를 대신하지 않는다. blind publication은 informed 파일이 존재하지 않는 별도 repo/gist/archive 또는 별도 publication commit이어야 한다. Asset commit A에는 capture/raw 파일을, index commit B에는 A에 고정된 URL·hash allowlist를 둔다. B SHA는 자기 파일 안이 아니라 coordinator launch record에서 검증한다.

## 산출물

- Codex finding: `CX-001`부터 연속 번호
- Claude Design finding: `CD-001`부터 연속 번호
- 시나리오 결과: `PASS | REVISE | BLOCKED | NOT_RUN`
- 실제로 실행하지 못한 항목은 추정하지 않고 `NOT_RUN`으로 둔다.
- 성능은 별도 측정 입력이 없으면 `NOT_ASSESSED`다.

제품 코드, fixture, test, 문서 또는 배포 상태를 수정하지 않는다.
