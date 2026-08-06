# Claude Design Pass 2 — informed design challenge

## 세션 조건

이 프롬프트를 **새 Claude Design 세션**의 첫 요청으로 사용하세요. inherited context, 메모리, 이전 대화, Codex 결과를 사용하지 마세요. 입력은 다음으로 제한합니다.

- 자신의 frozen Pass 1 산출물과 freeze SHA-256
- 이 informed release의 commit-pinned 직접 링크
- [informed evidence allowlist](./07-informed-evidence-allowlist-template.md)
- 같은 `product_candidate_sha`의 informed storyboard/artifact evidence

Pass 1과 `product_candidate_sha` 또는 `build_id`가 다르거나 링크가 mutable/누락이거나 allowlist에 `TBD`/`NOT_RUNNABLE` 행이 남아 있으면 `BLOCKED_BY_PROTOCOL_VIOLATION` 또는 `BLOCKED_BY_MISSING_EVIDENCE`로 중단하세요. Pass 1 freeze 뒤 rebuild가 있었다면 같은 source SHA라도 Pass 1부터 다시 실행해야 합니다.

## 접근 한계

로컬 경로, localhost, terminal, source checkout, localStorage를 열 수 있다고 가정하지 마세요. ordered full-screen states, disclosure closed/open, action 전/후, artifact preview HTML, raw files/MIME/transport/hashes가 모두 있어야 합니다. persistence·payload·실제 파일 판단이 필요하면 `CODEX_VERIFICATION_REQUEST`를 작성하고 직접 확인했다고 표현하지 마세요.

## 목표

U01~U10의 문제 진술과 해법을 분리하고, 자신의 blind IA/visual/copy finding을 current evidence로 다시 공격하세요. 새 wireframe을 먼저 그리지 말고, state truth·lifecycle·action ownership·artifact projection에서 가장 작은 MVP correction boundary를 찾으세요.

## 수행

1. [원문](./01-latest-feedback-verbatim-sealed-ko.md)의 U01~U10을 [mapping](./04-feedback-root-question-map-ko.md)의 root question과 연결합니다.
2. 각 입력을 `문제 확인 | 미확인 | 정적 증거로 불명`으로 판정하고, 확인된 항목에 `UF-###` trace를 연결합니다.
3. 제안된 UI 해법은 `채택 | 부분 채택·해법 수정 | 대안 채택 | 기각 | 증거 부족`으로 판정합니다.
4. U01은 S05 storyboard를 primary로 검토하고 결과 이동의 발견성·상태·다음 단계를 평가합니다.
5. U02/U05는 closed/open 상태 모두에서 정보 밀도와 material consequence 발견성을 비교합니다.
6. U03은 `/my`의 first viewport, 0/1/5/20 plans, Today 실행 렌즈, selected plan, mobile/desktop 순서를 검토합니다.
7. U04/U08은 같은 component 역할과 다른 transaction 의미를 구분합니다. 단순히 모양이 같다는 이유로 PASS하지 않습니다.
8. U07/U09는 format preview가 plan 편집과 경쟁하는지, capability 없는 형식이 빈 결과를 약속하는지 검토합니다.
9. U10은 브랜드, 첫 노출 사용자 용어, CTA 결과, source-authored text를 분리합니다. 관찰 사용자 없이 이해도를 확정하지 않습니다.
10. [benchmark](./05-informed-benchmark-ko.md)의 adopt/reject 경계를 반증하고 일반 목적 workspace로 범위가 커지지 않게 합니다.
11. [prior archive](./06-prior-claude-archive-manifest-ko.md)는 Pass 1 freeze 뒤에만 regression/delta 자료로 사용하고 current fact와 과거 proposal을 구분합니다.
12. 자유 탐색에서 informed input이 놓친 root-cause 후보를 추가합니다.

## CODEX verification request

```md
- request_id: CD-VR-001
- related finding: CD-### 또는 UF-###
- scenario:
- static ambiguity:
- exact action sequence to reproduce:
- storage/payload/artifact fact needed:
- required raw file/hash/MIME/transport evidence:
- decision that depends on it:
```

## 반증 quota

- U01~U10 각각 evidence 또는 `UNKNOWN`
- 제안된 해법 최소 5개 counterexample
- 자신의 blind finding 최소 2개 재검토, 그중 1개는 기각 시도
- proposed layout 최소 3개의 failure mode
- current layout 최소 2개의 보존할 점 또는 반례
- benchmark adopt 2개·reject 2개를 current evidence로 재평가

## 산출물

- `claude-pass2-feedback-trace.md`
- `claude-pass2-findings.md` (`CD-###`, `UF-###` mapping 포함)
- `claude-pass2-counterevidence.md`
- `claude-pass2-verdict.md`
- `claude-pass2-freeze.json`

성능은 별도 evidence가 없으면 `NOT_ASSESSED`입니다. 제품을 수정·배포했다고 표현하거나 Codex 결과를 요청하지 마세요.
