# Blind evidence allowlist — reviewer-visible template

> release: `PASS1_BLIND_ONLY`
>
> current status: `NOT_RUNNABLE`
>
> product candidate SHA: `TBD`
>
> build ID: `TBD`
>
> blind evidence publication SHA: `TBD`

Reviewer는 이 allowlist에 있는 direct URL만 열 수 있다. publication은 informed 파일이 존재하지 않는 물리적으로 분리된 blind-only repo/gist/archive 또는 publication commit이어야 한다. 상위 폴더 탐색이나 URL 추측은 금지한다.

## 행 규칙

- 실제 공개 전에는 각 scenario의 placeholder를 `start`, `closed`, `open`, `before_action`, `after_action`, `final/error/recovery`, `artifact_preview`, `raw_artifact` 등 **state별 한 행**으로 확장한다.
- 모든 행에 direct URL, publication SHA, bytes, raw SHA-256, MIME, transport, product SHA, build ID가 있어야 한다.
- `TBD` 또는 `NOT_RUNNABLE` 행이 하나라도 있으면 review를 시작하지 않는다.
- S17은 Codex runtime trace 전용이다. Claude Design은 `NOT_RUN — CODEX_ONLY`로 둔다.

| scenario | state ID | reviewer scope | direct URL | publication SHA | bytes | raw SHA-256 | MIME | transport | product SHA | build ID | status |
|---|---|---|---|---|---:|---|---|---|---|---|---|
| S01 | `TBD_STATES` | Codex+Claude | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S02 | `TBD_STATES` | Codex+Claude | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S03 | `TBD_STATES` | Codex+Claude | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S04 | `TBD_STATES` | Codex+Claude | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S05 | `TBD_STATES` | Codex+Claude | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S06 | `TBD_STATES` | Codex+Claude | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S07 | `TBD_STATES` | Codex+Claude | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S08 | `TBD_STATES` | Codex+Claude | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S09 | `TBD_STATES` | Codex+Claude | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S10 | `TBD_STATES` | Codex+Claude | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S11 | `TBD_STATES` | Codex+Claude | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S12 | `TBD_STATES` | Codex+Claude | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S13 | `TBD_STATES` | Codex+Claude | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S14 | `TBD_STATES` | Codex+Claude | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S15 | `TBD_STATES` | Codex+Claude | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S16 | `TBD_STATES` | Codex+Claude | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S17 | `TBD_RUNTIME_TRACE` | Codex only | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S18 | `TBD_STATES` | Codex+Claude artifact display | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S19 | `TBD_STATES` | Codex+Claude | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S20 | `TBD_STATES` | Codex+Claude | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S21 | `TBD_STATES` | Codex+Claude manifest/preview | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S22 | `TBD_OR_NOT_ASSESSED` | Codex+Claude | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
| S23 | `TBD_REVIEWER_CHOSEN` | Codex+Claude | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `NOT_RUNNABLE` |
