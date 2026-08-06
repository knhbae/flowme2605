# Pass 2 informed release

> 상태: `INPUT_STRUCTURE_COMPLETE / EVIDENCE_INCOMPLETE / SEALED_UNTIL_BOTH_PASS1_FREEZES`
>
> 검토 성격: `INTERNAL SIMULATION ONLY`
>
> 관찰 사용자: `0명`

이 디렉터리는 informed **입력 구조와 template**를 갖춘 상태이며 실제 evidence URL·SHA는 아직 비어 있다. Codex와 Claude Design의 Pass 1 결과가 각각 동결된 뒤에만 공개한다. Pass 1 입력과 섞거나 먼저 게시하지 않는다.

## 새 세션 규칙

- Codex Pass 2와 Claude Design Pass 2는 각각 **새 세션**으로 시작한다.
- inherited context, 이전 대화, 메모리, 다른 reviewer 결과를 상속하지 않는다.
- 각 reviewer에게는 자신의 frozen Pass 1 산출물, 이 informed release, current immutable evidence만 제공한다.
- 서로의 Pass 1/2 결과는 두 Pass 2가 동결될 때까지 공개하지 않는다.

## 파일

1. [01-latest-feedback-verbatim-sealed-ko.md](./01-latest-feedback-verbatim-sealed-ko.md)
2. Codex 전용: [02-codex-pass2-prompt-ko.md](./02-codex-pass2-prompt-ko.md)
3. Claude Design 전용: [03-claude-pass2-prompt-ko.md](./03-claude-pass2-prompt-ko.md)
4. [04-feedback-root-question-map-ko.md](./04-feedback-root-question-map-ko.md)
5. [05-informed-benchmark-ko.md](./05-informed-benchmark-ko.md)
6. [06-prior-claude-archive-manifest-ko.md](./06-prior-claude-archive-manifest-ko.md)
7. [07-informed-evidence-allowlist-template.md](./07-informed-evidence-allowlist-template.md)

## 시작 gate

- Codex와 Claude Design 각자의 `PASS1_FROZEN` 파일 및 SHA-256
- `informed_evidence_publication_sha`
- `product_candidate_sha`와 `build_id`가 Pass 1 freeze의 값과 모두 동일하다는 확인
- completed informed evidence allowlist; 모든 required 행의 status가 `READY`
- Pass 2 evidence direct URL과 SHA-256
- informed material 공개 시각이 Pass 1 freeze 뒤라는 coordinator log

누락 시 `BLOCKED_BY_MISSING_INFORMED_INPUT`이다. Pass 1 freeze 이후 rebuild가 실행되면 같은 product SHA라도 새 review candidate epoch으로 보고 Pass 1부터 다시 동결한다. 이 release는 설계안 자동 채택 문서가 아니라, 진술된 문제와 제안된 해법을 분리해 반증하는 입력이다.

## ID 규칙

- 진술 추적/확인 finding: `UF-001`부터
- Codex finding: 기존 번호와 충돌하지 않는 `CX-###`
- Claude Design finding: 기존 번호와 충돌하지 않는 `CD-###`
- `U01~U10`은 입력 문단 ID이며 finding ID가 아니다.

제품 수정, commit, push, PR, merge, Preview 또는 Production 배포는 하지 않는다.
