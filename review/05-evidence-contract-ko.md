# Pass 1 evidence contract

Evidence는 세 등급으로 분류한다. 필수 evidence가 비어 있으면 주장으로 대체하지 않는다.

## REQUIRED_GLOBAL

모든 scenario가 공유하는 chain of custody다.

| 필드 | 요구 사항 | 현재 값 |
|---|---|---|
| `product_candidate_sha` | 검토 대상 제품 commit SHA | `TBD` |
| `product_candidate_ref` | branch/tag 설명용 값; SHA를 대신하지 않음 | `TBD` |
| `product_clean_tree_proof` | candidate checkout의 `git status --short --branch` 원문 | `TBD` |
| `product_clean_tree_proof_sha256` | 위 원문 파일 SHA-256 | `TBD` |
| `build_id` | candidate에서 생성된 runtime build identity | `TBD` |
| `build_command` | 정확한 명령과 exit code | `TBD` |
| `build_log_sha256` | 전체 build log SHA-256 | `TBD` |
| `blind_evidence_publication_sha` | capture·raw artifact를 먼저 게시한 blind-only asset commit A SHA | `TBD` |
| `blind_release_index_sha` | A의 direct URL·hash를 채운 allowlist와 prompt를 게시한 blind-only index commit B SHA; coordinator launch record에 외부 기록 | `TBD` |
| `blind_publication_base_url` | Claude가 열 수 있는 commit-pinned base URL | `TBD` |
| `runtime_url` | Codex 전용 URL; Claude 입력이 아님 | `TBD` |
| `seed_reset_command` | fixture 초기화 명령과 결과 | `TBD` |
| `seed_manifest_sha256` | seed/fixture manifest SHA-256 | `TBD` |
| `captured_at_kst` | capture 시작/종료 시각 | `TBD` |
| `browser_os_versions` | browser, OS, locale | `TBD` |
| `timezone_locale` | timezone, locale, DST fixture 기준 | `TBD` |
| `review_session_ids` | fresh Codex/Claude session IDs | `TBD` |
| `observed_users` | 항상 실제 수치 | `0` |

`product_candidate_sha`, `build_id`, `blind_evidence_publication_sha`, `blind_release_index_sha`는 서로 다른 identity다. 값이 우연히 같아도 각 생성 근거를 별도로 기록한다. product checkout이 dirty이면 `NOT_READY`; clean proof가 없으면 시작하지 않는다. Git commit은 자기 SHA를 자기 파일 내용에 포함할 수 없으므로 asset commit A를 먼저 만들고, index commit B의 allowlist가 A를 참조한다. B의 SHA는 B 밖의 coordinator launch record에 고정한다.

## REQUIRED_PER_SCENARIO

| 필드 | 설명 |
|---|---|
| `scenario_id` | S01~S23 |
| `seed_id` / `seed_sha256` | 재현 가능한 시작 상태 |
| `route_state` | route, query, public/saved/execution/result 상태 |
| `viewport_input` | width×height, zoom, DPR, motion preference |
| `ordered_state_ids` | `start → closed/open → before_action → after_action → final/error/recovery` |
| `full_screen_urls` | 각 state 전체 화면의 commit-pinned URL과 SHA-256 |
| `action_sequence` | exact control name, input, 예상 mutation scope |
| `runtime_trace` | Codex의 console/network/storage journal; 해당 없으면 이유 |
| `persistent_write_count` | 특히 public quick 경로에서 `0` 증명 |
| `effective_item_ids` | preview/actual/receipt 대조용 ordered IDs |
| `counts_with_units` | Item, series, VEVENT, row, line 등의 단위 포함 |
| `artifact_preview_html` | 결과 preview HTML URL·SHA-256 |
| `raw_artifacts` | 파일명, transport, MIME, charset/encoding, newline convention, byte length, SHA-256 |
| `parser_result` | Calendar/Checklist/Sheet/Memo parser와 round-trip 결과 |
| `receipt_identity` | operation ID, artifact ID, version/hash, retry/duplicate 관계 |
| `timezone_fields` | zone, local/UTC time, DST/overdue 판정 |
| `accessibility_trace` | name/role/relation, focus order/return, announcement, reduced motion |
| `console_network_status` | error/failed request와 분류 |
| `reviewer_status` | PASS/REVISE/BLOCKED/NOT_RUN |
| `evidence_gap` | 확인하지 못한 사실과 Codex 검증 요청 |

S18 raw TSV에는 최소 newline, tab, quote, UTF-8, CRLF, emoji fixture가 있어야 한다. S20은 `Item count`, `series count`, `VEVENT count`를 한 숫자로 합치지 않는다. S21은 화면 text가 아니라 실제 transport/MIME/raw hash를 요구한다.

## OPTIONAL

- 짧은 interaction recording
- DOM/accessibility tree snapshot
- pixel diff 및 crop annotation
- performance trace와 명시된 budget
- reviewer 음성 메모 또는 sketch

OPTIONAL evidence는 REQUIRED_GLOBAL 또는 REQUIRED_PER_SCENARIO의 누락을 메우지 못한다. performance trace와 budget이 없으면 `NOT_ASSESSED`다.

## 파일 manifest 행 template

```text
evidence_id | class | scenario_id | state_id | relative_path_or_url |
publication_sha | byte_length | sha256 | MIME | charset | transport |
newline | captured_at_kst | product_candidate_sha | build_id | notes
```

## 무결성·판정 규칙

- mutable branch URL, 로컬 절대 경로, screenshot만 있는 artifact 주장은 허용하지 않는다.
- full-screen과 raw 파일은 각각 hash한다.
- preview HTML과 raw artifact를 한 파일로 간주하지 않는다.
- capture의 product candidate/build가 다르면 해당 scenario는 `BLOCKED`다.
- evidence가 다른 scenario에서 재사용되면 두 scenario 모두에 이유와 동일 hash를 적는다.
- capture 이후 파일을 수정했으면 publication SHA와 manifest를 새로 만든다.
