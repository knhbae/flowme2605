# Codex Pass 2 — informed challenge

## 세션 조건

이 프롬프트를 **새 Codex 세션**의 첫 요청으로 사용하세요. inherited context, 메모리, 이전 대화, Claude 결과를 사용하지 마세요. 입력은 다음으로 제한합니다.

- 자신의 frozen Pass 1 산출물과 freeze SHA-256
- 이 informed release
- [informed evidence allowlist](./07-informed-evidence-allowlist-template.md)
- 같은 `product_candidate_sha`의 current immutable evidence

Pass 1과 `product_candidate_sha` 또는 `build_id`가 다르거나 informed publication 시각이 freeze보다 빠르거나 allowlist에 `TBD`/`NOT_RUNNABLE` 행이 남아 있으면 `BLOCKED_BY_PROTOCOL_VIOLATION`으로 중단하세요. Pass 1 freeze 뒤 rebuild가 있었다면 같은 source SHA라도 Pass 1부터 다시 실행해야 합니다.

## 목표

U01~U10의 문제 진술과 제안된 해법을 분리하고, Pass 1 runtime·storage·artifact 증거로 근본 원인을 검증하세요. 동의문을 쓰는 것이 아니라 각 제안을 실패시키는 반례를 찾고, 더 작은 MVP correction boundary를 제시하세요.

## 수행

1. [원문](./01-latest-feedback-verbatim-sealed-ko.md)의 U01~U10을 [mapping](./04-feedback-root-question-map-ko.md)에 따라 자신의 CX finding과 연결합니다.
2. 문제가 current candidate에서 재현되면 `UF-001~UF-010` 중 해당 finding을 생성합니다. 재현되지 않으면 `NOT_CREATED`와 증거를 남깁니다.
3. 각 제안을 `채택 | 부분 채택·해법 수정 | 대안 채택 | 기각 | 증거 부족`으로 판정합니다.
4. U01은 반드시 S05를 primary evidence로 검토하고 S04/S21을 보조로 사용합니다.
5. U02/U05는 모든 정보를 접는 방향과 material risk를 inline으로 유지하는 방향을 각각 반증합니다.
6. U07/U09는 모든 형식 노출, capability 기반 노출, unavailable/held 표시를 실제 raw artifact와 비교합니다.
7. public quick 경로의 persistent write가 `0`인지 확인하고, 저장된 계획의 transfer와 state owner를 혼동하지 않습니다.
8. TSV newline/tab/quote/UTF-8/CRLF, emoji/special character, timezone/DST/overdue, routine Item/series/VEVENT 단위, MIME/transport/raw hash 증거를 P1-03 gap으로 재확인합니다.
9. keyboard/screen reader/focus/reduced motion 및 0/1/5/20 plans·1/8/24/50 Items를 P1-04 evidence로 확인합니다.
10. [benchmark](./05-informed-benchmark-ko.md)는 원칙의 반례로만 사용하고 제품 복제 근거로 쓰지 않습니다.
11. [prior Claude archive manifest](./06-prior-claude-archive-manifest-ko.md)는 regression/delta 확인에만 사용합니다.
12. 지정 항목 뒤 자유 탐색을 수행하고 informed input이 놓친 근본 문제를 찾습니다.

성능은 전용 trace/budget이 없으면 `NOT_ASSESSED`입니다. 실제 사용자 이해도는 관찰 사용자 0명인 상태에서 PASS로 판정하지 마세요.

## 반증 quota

- U01~U10 각각 evidence 또는 `UNKNOWN`
- 제안된 해법 최소 5개에 대한 구체적 counterexample
- 자신의 Pass 1 finding 최소 2개 재검토, 그중 1개는 기각을 시도
- current implementation 가정 최소 2개 실패 시도
- benchmark adopt 항목 최소 2개와 reject 항목 최소 2개를 FlowMe 증거로 재평가

## 산출물

- `codex-pass2-feedback-trace.md`
- `codex-pass2-findings.md` (`CX-###`, `UF-###` mapping 포함)
- `codex-pass2-counterevidence.md`
- `codex-pass2-verdict.md`
- `codex-pass2-freeze.json`

제품 코드·test·fixture·문서를 수정하거나 commit/push/deploy하지 마세요. Claude의 결과를 요청하지 마세요.
