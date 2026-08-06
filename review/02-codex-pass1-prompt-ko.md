# Codex Pass 1 — blind local runtime/data/artifact review

## 세션 조건

이 프롬프트를 **새 Codex 세션**의 첫 요청으로 사용하세요. inherited context, 메모리, 이전 대화, 다른 reviewer의 산출물을 사용하지 마세요. coordinator가 제공한 commit-pinned B 문서·allowlist, 정확한 runtime URL, 그리고 그 문서가 직접 허용한 asset A URL만 입력입니다. 평소 product repository checkout, workspace 문서 검색, memory lookup은 입력이 아닙니다. 조건을 지킬 수 없으면 `BLIND_CONTAMINATED`로 중단하세요.

## 역할

당신은 FlowMe P35 Round 2의 독립 runtime·state·artifact 검토자입니다. 구현을 고치거나 기존 결론을 확인하는 역할이 아닙니다. 현재 candidate에서 사용자가 보는 상태와 실제 저장·출력 결과가 일치하는지 반례를 찾으세요.

## 시작 전 gate

[evidence contract](./05-evidence-contract-ko.md)의 `REQUIRED_GLOBAL`, [scorecard](./06-scorecard-ko.md), [blind evidence allowlist](./07-blind-evidence-allowlist-template.md)를 확인하세요.

1. commit-pinned clean proof의 `HEAD`와 upstream SHA가 `product_candidate_sha`와 정확히 일치하는지 확인합니다.
2. clean proof의 `git status --short`가 비어 있고 runtime identity가 같은 BUILD_ID를 증명하는지 확인합니다. 다르면 결과 첫 줄을 `NOT_READY_DIRTY_OR_MISMATCHED_PRODUCT`로 쓰고 중단합니다.
3. `build_id`는 candidate SHA와 별도 필드로 확인합니다.
4. 제공된 seed/reset 절차가 재현되는지 확인합니다.
5. `blind_evidence_publication_sha`와 product candidate SHA를 같은 값이라고 가정하지 않습니다.

제품 source가 꼭 필요한 반증만 coordinator가 별도 export한 source allowlist 안에서 확인할 수 있습니다. 그 export에는 사전 공개 피드백·기존 검토·정답 참고 자료가 물리적으로 없어야 합니다. 일반 checkout이나 allowlist 밖 경로를 열었다면 즉시 `BLIND_CONTAMINATED`로 중단합니다.

필수 값이 없거나 서로 다르거나 allowlist에 `NOT_RUNNABLE`/`TBD` 행이 남아 있으면 `BLOCKED_BY_MISSING_OR_MISMATCHED_INPUT`으로 중단합니다.

## 실행 지시

1. [중립 brief](./01-neutral-review-brief-ko.md)를 기준으로 [시나리오 S01~S23](./04-neutral-scenario-matrix-ko.md)을 순서대로 수행합니다.
2. 정상 경로 외에 empty, error, Back, reload, duplicate, retry, partial failure를 실제로 조작합니다.
3. 각 행동 전후의 URL, visible state, storage/payload 변화, 실제 artifact와 receipt를 기록합니다.
4. public quick 결과가 persistent product storage를 쓰지 않는 시나리오에서는 persistent write 수가 정확히 `0`인지 diff로 증명합니다.
5. preview→confirmation→actual artifact→receipt의 Item IDs, count, field set, version 및 raw SHA-256을 대조합니다.
6. Calendar·Checklist·Sheet·Memo 중 해당 capability를 실제 생성하고 parser로 읽습니다. 의미 없는 형식은 노출 여부와 unavailable/held 사유를 확인합니다.
7. TSV는 newline, tab, quote, UTF-8 encoding, CRLF round-trip을 각각 검증합니다. emoji와 특수문자를 포함합니다.
8. timezone, DST 경계, overdue, dated/undated/mixed 및 routine의 Item/series/VEVENT 단위를 구분해 기록합니다.
9. 390×844, 1024px, 1440×1000, 720×500 reflow proxy, keyboard-only, screen reader relation, focus return, reduced motion을 검증합니다. 실제 브라우저 200% zoom은 제공되지 않았으므로 proxy로 대체하지 말고 해당 하위 판정만 `NOT_RUN`으로 기록합니다.
10. S17은 Codex만 실행합니다. flag 전환의 runtime·storage 사실을 확인하되 비교 screenshot 묶음을 만들지 않습니다.
11. S23에서는 자유 탐색을 수행해 scenario matrix가 놓친 root-cause 후보를 찾습니다.

성능 전용 trace와 budget이 제공되지 않으면 performance는 `NOT_ASSESSED`로 기록하고 PASS/FAIL을 추정하지 않습니다.

## 반증 의무

다음 가설 각각을 최소 한 번 실패시키려 시도하세요.

- 편집 취소는 canonical plan과 source를 바꾸지 않는다.
- 저장 후 현재 plan detail로 연결된다.
- Item 완료는 plan 편집 저장과 다른 state mutation이다.
- 같은 범위·형식의 preview와 실제 artifact는 같은 Item 집합을 쓴다.
- duplicate/retry는 중복 저장이나 중복 receipt를 만들지 않는다.
- reload 뒤에도 saved와 unsaved 상태가 뒤섞이지 않는다.
- material risk는 해당 행동 전에 발견 가능하다.
- 날짜가 없는 Item은 임의의 calendar event가 되지 않는다.

## finding 형식

```md
## CX-001 — 짧고 검증 가능한 제목

- severity: BLOCKING | HIGH | MEDIUM | LOW
- status: REPRODUCED | NOT_REPRODUCED | NOT_RUN | NEEDS_STATIC_REVIEW
- scenario / route / state / viewport:
- user task:
- observed fact:
- expected invariant:
- reproduction:
- evidence IDs:
- storage / payload / artifact trace:
- alternative explanation tested:
- smallest correction boundary:
- not proven:
```

## 산출물

- `codex-pass1-findings.md`
- `codex-pass1-scorecard.md`
- `codex-counterevidence-log.md`
- `codex-pass1-freeze.json`

coordinator가 시작 전에 지정한 **제품 checkout과 blind publication 밖의 ignored/external review output 디렉터리**에만 위 파일을 저장하세요. 위치가 지정되지 않았으면 `BLOCKED_BY_OUTPUT_LOCATION`으로 중단합니다. freeze에는 입력·출력 파일 SHA-256, candidate SHA, build ID, 시작/종료 KST, contamination 상태와 `PASS1_FROZEN` marker를 넣습니다. 코드·test·fixture·문서를 수정하거나 commit/push/deploy하지 마세요.
