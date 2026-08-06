# Informed evidence allowlist — reviewer-visible template

> release: `PASS2_INFORMED_ONLY`
>
> current status: `NOT_RUNNABLE`
>
> product candidate SHA: `TBD`
>
> build ID: `TBD`
>
> informed evidence publication SHA: `TBD`
>
> own Pass 1 freeze SHA-256: `TBD`

Reviewer는 이 allowlist의 direct URL만 사용한다. 모든 runtime·capture·artifact 행은 자신의 Pass 1 freeze와 동일한 `product_candidate_sha` 및 `build_id`에 묶여야 한다. Pass 1 freeze 뒤 rebuild가 있었다면 이 allowlist를 채우지 말고 Pass 1부터 새 candidate epoch으로 다시 실행한다.

## Informed document inputs

| input ID | direct URL | publication SHA | bytes | raw SHA-256 | MIME | transport | product SHA | build ID | status |
|---|---|---|---:|---|---|---|---|---|---|
| own-pass1-freeze | `TBD` | `TBD` | `TBD` | `TBD` | `application/json` | `https` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| latest-feedback-verbatim | `TBD` | `TBD` | `TBD` | `TBD` | `text/markdown` | `https` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| feedback-root-map | `TBD` | `TBD` | `TBD` | `TBD` | `text/markdown` | `https` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| informed-benchmark | `TBD` | `TBD` | `TBD` | `TBD` | `text/markdown` | `https` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| prior-archive-manifest | `TBD` | `TBD` | `TBD` | `TBD` | `text/markdown` | `https` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| prior-claude-round1 | `TBD` | `TBD` | `TBD` | `749B84BB49EA2199F9A9A5FA67B0D113A8AFC4CA06EF84ADDCA4BD0F433238E3` | `application/zip` | `https` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| prior-claude-round2 | `TBD` | `TBD` | `TBD` | `D78C9E2B560A7EB5C9ED78A1DD62CBEF3355468B9382BD3D0CE39DFD0FF35B2B` | `application/zip` | `https` | `TBD` | `TBD` | `NOT_RUNNABLE` |

## Current candidate evidence rows

- 실제 공개 전에는 각 placeholder를 `start`, `closed`, `open`, `before_action`, `after_action`, `final/error/recovery`, `artifact_preview`, `raw_artifact` 등 **scenario/state별 한 행**으로 확장한다.
- 모든 행에 direct URL, publication SHA, bytes, raw SHA-256, MIME, transport, product SHA, build ID가 있어야 한다.
- `TBD` 또는 `NOT_RUNNABLE` 행이 하나라도 있으면 Pass 2를 시작하지 않는다.

| scenario | state ID | direct URL | publication SHA | bytes | raw SHA-256 | MIME | transport | product SHA | build ID | status |
|---|---|---|---|---:|---|---|---|---|---|---|
| S01 | `TBD_STATES` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S02 | `TBD_STATES` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S03 | `TBD_STATES` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S04 | `TBD_STATES` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S05 | `TBD_STATES` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S06 | `TBD_STATES` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S07 | `TBD_STATES` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S08 | `TBD_STATES` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S09 | `TBD_STATES` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S10 | `TBD_STATES` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S11 | `TBD_STATES` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S12 | `TBD_STATES` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S13 | `TBD_STATES` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S14 | `TBD_STATES` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S15 | `TBD_STATES` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S16 | `TBD_STATES` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S17 | `TBD_CODEX_PASS1_FACT` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S18 | `TBD_STATES` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S19 | `TBD_STATES` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S20 | `TBD_STATES` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S21 | `TBD_STATES` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S22 | `TBD_OR_NOT_ASSESSED` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S23 | `TBD_REVIEWER_CHOSEN` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
