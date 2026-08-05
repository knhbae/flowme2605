# Pass 1 evidence contract

Evidence는 세 등급으로 분류한다. 필수 evidence가 비어 있으면 주장으로 대체하지 않는다.

## REQUIRED_GLOBAL

모든 scenario가 공유하는 chain of custody다. 아래 값은 asset commit A와 candidate provenance에서 확정했다. reviewer 공통 문서에는 role 격리를 위해 full provenance·candidate manifest·seed contract URL을 싣지 않는다. Codex는 07 allowlist에서만 원본을 확인하고 Claude Design은 08 allowlist의 safe global만 사용한다.

| 필드 | 요구 사항 | 현재 값 |
|---|---|---|
| `product_candidate_sha` | 검토 대상 제품 commit SHA | `c48911757fb529941d00efc2162338ffa8b7686a` |
| `product_candidate_ref` | branch/tag 설명용 값; SHA를 대신하지 않음 | `codex/p35-round2-candidate-20260805 → origin/codex/p35-round2-candidate-20260805@c48911757fb529941d00efc2162338ffa8b7686a` |
| `product_clean_tree_proof` | candidate checkout의 git status --short --branch 원문 | [direct proof](https://raw.githubusercontent.com/knhbae/flowme2605/0af680a215d49e648dd10f97eeb7954e5c689297/evidence/candidate/git-status-short-branch.txt) · `## codex/p35-round2-candidate-20260805...origin/codex/p35-round2-candidate-20260805` |
| `product_clean_tree_proof_sha256` | 위 원문 파일 SHA-256 | `08411ee7d7ddd20c5f49af3c2d2a88c5cef9dc9202cf333436ee76519fc5a031` |
| `build_id` | candidate에서 생성된 runtime build identity | `gdh4DIMGS69Kcn0GBTJtl` |
| `build_command` | 정확한 명령과 exit code | `npm.cmd run build` · exit `0` |
| `build_log_sha256` | 전체 build log SHA-256 | [direct build log](https://raw.githubusercontent.com/knhbae/flowme2605/0af680a215d49e648dd10f97eeb7954e5c689297/evidence/candidate/build.log) · `3a2d2a7897db61584092a511fdd6e9163265bcd2fba6bdf8ea96d724097e1a26` |
| `runtime_build_identity` | served /flows HTML이 같은 BUILD_ID를 포함하는지 확인 | `PASS` · HTTP `200` · contains `true` · `7c200184dfbc0fdce7f45f97589df7d099291b008e4e71a6fc9d13ddcb5785b2` |
| `blind_evidence_publication_sha` | capture·raw artifact를 먼저 게시한 blind-only asset commit A SHA | `0af680a215d49e648dd10f97eeb7954e5c689297` |
| `blind_release_index_sha` | allowlist와 prompt를 게시할 blind-only index commit B SHA | `EXTERNAL_LAUNCH_ENVELOPE_REQUIRED_AFTER_INDEX_COMMIT` |
| `blind_publication_transport` | role별 allowlist의 file-level direct URL만 사용 | `0af680a215d49e648dd10f97eeb7954e5c689297` · verified via role-specific allowlist |
| `runtime_url` | Codex 전용 URL; Claude 입력이 아님 | `CODEX_ONLY_NOT_DISCLOSED` |
| `seed_reset_command` | fixture 초기화 명령과 결과 | `npm.cmd run evidence:p35-round2:rehearse` · `THREE_GROUP_MANIFESTS_CAPTURED` · `d330b15f7b66467fc7472e3391b029cf0e084676b361710aff467cd3a96c4d75` |
| `seed_manifest_sha256` | seed/fixture manifest SHA-256 | `d330b15f7b66467fc7472e3391b029cf0e084676b361710aff467cd3a96c4d75` |
| `captured_at_kst` | capture 시작/종료 시각 | `2026-08-05T15:08:06+09:00 → 2026-08-05T15:08:34+09:00` |
| `browser_os_versions` | browser, OS, locale | `chromium 150.0.7871.184 · Chromium 150.0.7871.184 · Windows_NT 10.0.26200 x64 · Windows_NT 10.0.26200 x64 · Node v24.17.0` |
| `timezone_locale` | timezone, locale, DST fixture 기준 | `timezone Asia/Seoul · locale ko-KR` |
| `review_session_ids` | fresh Codex/Claude session IDs | `FREEZE_TIME_SESSION_IDS_RECORDED_AT_REVIEW_START` |
| `observed_users` | 항상 실제 수치 | `0` |

`EXTERNAL_LAUNCH_ENVELOPE_REQUIRED_AFTER_INDEX_COMMIT`와 `FREEZE_TIME_SESSION_IDS_RECORDED_AT_REVIEW_START`는 evidence 미제공이나 미결 placeholder를 뜻하지 않는다. index commit B SHA는 commit 직후 외부 launch envelope에 기록한다. reviewer session ID는 사전 입력이 아니라 실제 fresh session 시작과 동시에 생성해 각 freeze record와 coordinator envelope에 기록한다. 두 lifecycle 값을 조작할 수 없으면 전달 또는 검토를 중단한다.

`product_candidate_sha`, `build_id`, `blind_evidence_publication_sha`, `blind_release_index_sha`는 서로 다른 identity다. product source, runtime build, asset commit A, index commit B를 각각 검증한다.

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
