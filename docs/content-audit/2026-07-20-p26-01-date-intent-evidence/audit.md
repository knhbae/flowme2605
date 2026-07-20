# P26-01 Date Intent Audit

## Root Cause

`PublicFlow`는 기본 `example` 모드에서 `getPreviewAnchor`로 예시 날짜를 계산했다. 저장 핸들러는 사용자가 입력한 `anchor`가 아니라 이 `displayAnchor`를 `saveFlowRecord`에 전달했다. 그 결과 미리보기 값이 execution anchor로 승격되고 My Flow, Calendar, ICS가 실제 사용자가 고른 날짜처럼 읽었다.

추가로 public anchor effect는 transient `example` 모드도 localStorage에 기록했다. 이 값은 단순 방문을 active progress처럼 만들고, 기존 example 저장본과 의도적으로 고른 날짜를 구분하기 어렵게 했다.

## Contract

| 상태 | preview | saved record | Calendar/ICS | list export |
| --- | --- | --- | --- | --- |
| `example` | 예시 날짜 표시 | `undated`, anchor 없음 | 제외 | 날짜 없이 포함 |
| `custom` + valid date | 선택 날짜 표시 | `custom`, anchor 저장 | 포함 | 선택 날짜 포함 |
| `custom` + blank/invalid | 없음 | 저장 차단 | 제외 | 실행 안 함 |
| `undated` | 날짜 없음 | `undated`, anchor 없음 | 제외 | 날짜 없이 포함 |
| source `anchor_type: none` | 날짜 없음 | `undated`, anchor 없음 | 제외 | 기존 결과 유지 |

SavedFlowRecord는 additive `dateIntent: custom | undated`를 정규화한다. legacy record는 anchor가 있으면 custom, 없으면 undated로 읽는다. `example`은 saved schema가 허용하지 않는다.

## Migration

legacy stored anchor가 `mode: example`이면 다음과 같이 처리한다.

1. 아직 저장하지 않은 transient preview는 anchor storage에서 제거한다.
2. saved record가 있으면 실제 anchor projection을 제거한다.
3. 이전 값은 `legacyExampleAnchor`에 보존한다.
4. saved/stored intent를 `undated`로 저장한다.

이 migration은 source data, checks, notes, structural overlay, run history를 변경하지 않는다.

## UX

- 세 상태를 접힌 `다른 방법` 안에 숨기지 않고 첫 설정 영역에 노출했다.
- 모바일·와이드 primary CTA가 저장 결과에 맞춰 바뀐다.
- 날짜 입력은 기존 native input과 route별 label을 유지한다.
- custom 상태 설명은 날짜와 가까운 일정 경고만 남겨 긴 설명을 줄였다.
- `날짜 저장 방식` group과 `검사일` input의 accessible name을 분리했다.

## Browser Replay

### Example -> undated save

- route: `/f/vehicle-inspection-prep`
- viewport: `390x844`
- evidenceKind: `current_browser`
- result: preview date visible, Calendar export action absent, saved `dateIntent=undated`, saved anchor absent, Calendar event `0`, undated placement tray reachable.

### Custom date

- route: `/f/vehicle-inspection-prep`
- viewport: `1024x768`
- evidenceKind: `current_browser`
- result: `2026-07-28` persisted, Calendar export action visible, Calendar row visible once.

### Explicit undated reload

- route: `/f/vehicle-inspection-prep`
- viewport: `390x844`
- evidenceKind: `current_browser`
- result: undated selection and CTA remain after reload.

### Legacy example migration

- route: `/f/vehicle-inspection-prep`
- fixture: legacy saved anchor `2026-08-03`, stored mode `example`
- evidenceKind: `current_browser`, `current_command`
- result: anchor removed from projection, preserved as migration metadata, undated mode active.

## Not Observed

자동화가 상태·접근성 이름·저장값·Calendar membership을 증명했다. 사용자가 세 선택지를 설명 없이 이해하는지는 실제 관찰 전까지 검증되지 않았다.
