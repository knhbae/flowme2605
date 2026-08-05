# Cross-review synthesis template

> 작성 시점: Codex·Claude Design의 Pass 2 freeze 이후

## 1. Run identity

- product candidate SHA: `TBD`
- build ID: `TBD`
- blind evidence publication SHA: `TBD`
- informed evidence publication SHA: `TBD`
- Codex Pass 1/2 freeze SHA: `TBD / TBD`
- Claude Pass 1/2 freeze SHA: `TBD / TBD`
- contamination: `TBD`
- observed users: `0`
- performance: `NOT_ASSESSED` 또는 evidence-backed 결과

## 2. Root-question synthesis

| root question | current runtime/artifact fact | CX finding | CD finding | UF trace | agreement | disagreement | evidence gap | owner decision |
|---|---|---|---|---|---|---|---|---|
| RQ-01 | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` |

우선순위는 state truth → lifecycle → action ownership → artifact projection → IA → disclosure/safety → terminology/accessibility → polish다.

## 3. U01~U10 trace

| input | UF finding | Codex 판정 | Claude 판정 | 문제 확인 | 해법 판정 | counterevidence | owner action |
|---|---|---|---|---|---|---|---|
| U01 | UF-001 또는 NOT_CREATED | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` |

U01 evidence에는 반드시 S05를 포함한다.

## 4. Gate gaps

| gate | open issue | evidence | severity | owner | next action |
|---|---|---|---|---|---|
| P1-03 artifact fidelity | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` |
| P1-04 extremes/a11y | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` |

다음은 빠짐없이 별도 행으로 확인한다.

- public quick persistent write count 0
- TSV newline/tab/quote/UTF-8/CRLF
- emoji·특수문자
- timezone/DST/overdue
- reduced motion
- routine Item/series/VEVENT 단위
- transport/MIME/raw hash
- performance `NOT_ASSESSED` 여부

## 5. Finding namespace

- `UF-###`: informed input에서 확인된 문제 trace
- `CX-###`: Codex runtime/data/artifact finding
- `CD-###`: Claude Design static IA/visual/copy finding

generic `F-XX`를 새 finding ID로 재사용하지 않는다. 원문 안의 표현은 quote로만 유지한다.

## 6. Verdict

- internal runtime gate: `PASS | REVISE | BLOCKED`
- static design gate: `PASS | REVISE | BLOCKED`
- owner decision: `TBD`
- observed-user validation: `NOT_RUN — 0 users`
- publish/deploy state: `NOT_AUTHORIZED` 또는 별도 closeout evidence

## 7. 범위 밖

creator, text authoring, publishing, text-to-flow route debt는 이 verdict로 완료 처리하지 않는다. Todo/Today의 역할은 blind evidence와 informed 가설을 분리해 기록하고, 근거 없이 export 또는 실행 view로 확정하지 않는다.
