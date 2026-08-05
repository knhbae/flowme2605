# P35 Round 2 Pass 1 blind publication

- state: `INDEX_CONTENT_READY_EXTERNAL_LAUNCH_ENVELOPE_PENDING`
- product candidate: `83c3a72629ba2bad634f117f1f8077de8aa0e045`
- build ID: `k7ouW_TvxXXQiPeyjALDo`
- evidence asset SHA: `3a924b931157a36204b7ddfaee83ca2991e2cce1`
- index SHA: `EXTERNAL_LAUNCH_ENVELOPE_REQUIRED_AFTER_INDEX_COMMIT`
- review session IDs: `FREEZE_TIME_SESSION_IDS_RECORDED_AT_REVIEW_START`
- observed users: `0`

위 두 state는 누락값이 아니다. index commit B SHA는 외부 launch envelope에, fresh reviewer session ID는 각 검토 시작·freeze 시점에 기록한다.

coordinator는 [review/README-ko.md](./review/README-ko.md)를 역할별 전달 전 점검에만 사용한다. reviewer에게는 자기 전용 prompt와 allowlist의 commit-pinned B URL만 전달한다.
