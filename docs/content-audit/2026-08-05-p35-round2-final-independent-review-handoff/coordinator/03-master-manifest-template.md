# Master evidence manifest template

## Run identity

```yaml
status: PREPARED_NOT_RUNNABLE
candidate_epoch: TBD
product_candidate_sha: TBD
product_candidate_ref: TBD
product_clean_tree_proof_path: TBD
product_clean_tree_proof_sha256: TBD
build_id: TBD
build_log_path: TBD
build_log_sha256: TBD
rebuild_since_pass1_freeze: NOT_APPLICABLE
blind_evidence_publication_sha: TBD
blind_release_index_sha: TBD_EXTERNAL_COORDINATOR_RECORD
blind_publication_base_url: TBD
informed_evidence_publication_sha: TBD
informed_release_index_sha: TBD_EXTERNAL_COORDINATOR_RECORD
informed_publication_base_url: TBD
codex_pass1_session_id: TBD
claude_pass1_session_id: TBD
codex_pass2_session_id: TBD
claude_pass2_session_id: TBD
observed_users: 0
performance: NOT_ASSESSED
```

`product_candidate_sha`, `build_id`, blind/informed asset SHA와 index SHA는 별도 chain-of-custody 행을 가져야 한다. `candidate_epoch`은 product SHA와 build ID의 조합이며 rebuild마다 새 값이 필요하다. Index commit SHA는 자기 파일 내용에 넣지 않고 coordinator launch record에서 외부 고정한다.

## REQUIRED_GLOBAL rows

| evidence_id | value/path | byte length | SHA-256 | product SHA | build ID | created KST | authority/source | status |
|---|---|---:|---|---|---|---|---|---|
| RG-001 product clean proof | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | git | `TBD` |
| RG-002 build log | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | build | `TBD` |
| RG-003 seed manifest | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | fixture owner | `TBD` |
| RG-004 blind publication tree | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | publish authority | `TBD` |
| RG-005 informed publication tree | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | publish authority | `TBD` |
| RG-006 environment manifest | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | coordinator | `TBD` |

## REQUIRED_PER_SCENARIO rows

| evidence_id | scenario | state/order | viewport | seed/hash | URL/path | publication SHA | product SHA | build ID | MIME/charset | transport | newline | bytes | raw SHA-256 | Item/series/VEVENT counts | persistent writes | status |
|---|---|---|---|---|---|---|---|---|---|---|---|---:|---|---|---:|---|
| RS-S01-001 | S01 | start 01 | 390×844 | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | image/png | https | n/a | `TBD` | `TBD` | n/a | `TBD` | `TBD` |

필수 상태 순서는 `start → closed/open(해당 시) → before_action → after_action → final/error/recovery`다. 전체 화면을 우선하고 crop은 OPTIONAL로만 추가한다.

## Artifact fidelity rows

| evidence_id | scenario | format | stage | artifact ID | effective Item IDs hash | unit counts | product SHA | build ID | filename | MIME | charset | transport | newline | byte length | raw SHA-256 | parser result | receipt hash |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---|---|---|
| AF-001 | `TBD` | Calendar/Checklist/Sheet/Memo | preview/actual/receipt | `TBD` | `TBD` | Item=`TBD`; series=`TBD`; VEVENT=`TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | LF/CRLF/n/a | `TBD` | `TBD` | `TBD` | `TBD` |

TSV row는 newline/tab/quote/UTF-8/CRLF/emoji fixture별 parser result를 남긴다. Calendar row는 timezone/DST/overdue와 undated 처리, routine row는 Item/series/VEVENT 단위를 각각 남긴다.

## Public quick storage journal

| scenario | before storage SHA | after storage SHA | persistent write count | clipboard/download calls | result |
|---|---|---|---:|---|---|
| `TBD` | `TBD` | `TBD` | **0 expected** | `TBD` | `TBD` |

## OPTIONAL rows

| evidence_id | scenario | kind | URL/path | SHA-256 | note |
|---|---|---|---|---|---|
| OP-001 | `TBD` | video/DOM tree/pixel diff/performance trace | `TBD` | `TBD` | `TBD` |

전용 performance trace와 사전 budget이 없으면 run-level performance는 `NOT_ASSESSED`로 유지한다.

## Prior archive rows — informed only

| evidence_id | archive | local SHA-256 | informed publication URL | publication SHA recheck | release |
|---|---|---|---|---|---|
| PA-001 | Claude Round 1 | `749B84BB49EA2199F9A9A5FA67B0D113A8AFC4CA06EF84ADDCA4BD0F433238E3` | `TBD` | `TBD` | informed only |
| PA-002 | Claude Round 2 | `D78C9E2B560A7EB5C9ED78A1DD62CBEF3355468B9382BD3D0CE39DFD0FF35B2B` | `TBD` | `TBD` | informed only |
