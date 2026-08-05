# P35 Round 2 Pass 1 blind publication

- state: `INDEX_CONTENT_READY_EXTERNAL_LAUNCH_ENVELOPE_PENDING`
- product candidate: `c48911757fb529941d00efc2162338ffa8b7686a`
- build ID: `gdh4DIMGS69Kcn0GBTJtl`
- evidence asset SHA: `0af680a215d49e648dd10f97eeb7954e5c689297`
- index SHA: `EXTERNAL_LAUNCH_ENVELOPE_REQUIRED_AFTER_INDEX_COMMIT`
- review session IDs: `FREEZE_TIME_SESSION_IDS_RECORDED_AT_REVIEW_START`
- observed users: `0`

위 두 state는 누락값이 아니다. index commit B SHA는 외부 launch envelope에, fresh reviewer session ID는 각 검토 시작·freeze 시점에 기록한다.

coordinator는 [review/README-ko.md](./review/README-ko.md)를 역할별 전달 전 점검에만 사용한다. reviewer에게는 자기 전용 prompt와 allowlist의 commit-pinned B URL만 전달한다.
