# P23-02B1 Personal Draft Time Contract Evidence

P23-02A의 선택적 날짜 모델 위에 날짜 없음, 종일, 시간이 정해진 일정의 순수 계약을 추가했다. 실제 시간 UI와 Calendar/ICS consumer는 연결하지 않았다.

## 결과

- 날짜 없음, 종일, timed 상태가 별도 `allDay` boolean 없이 구분된다.
- timed 일정은 `HH:mm`, 5..1440분 duration, optional IANA timezone을 사용한다.
- legacy `time` record는 30분·floating local로 계속 읽힌다.
- invalid `24:00`은 Item을 잃지 않고 종일 일정으로 낮아진다.
- invalid duration은 timed 상태를 유지하고 30분으로 복구된다.
- invalid timezone은 timed 상태를 유지하고 floating local로 낮아진다.
- event identity seed는 saved copy와 stable Item ID만 사용해 시간·날짜·순서 수정에도 유지된다.
- pure Calendar 정렬은 날짜, 종일, 시작 시각, personal order 순이다.

## 연결 상태

| Surface | P23-02B1 상태 |
|---|---|
| structural persistence | additive contract 연결 |
| pure structural projection | schedule projection 연결 |
| Calendar 화면 timed 표시 | 미연결 |
| 실제 ICS duration/timezone/stable UID | 미연결 |
| 시간/종일 사용자 UI | 미연결 |

실제 consumer가 미연결인 상태를 기능 완료로 과장하지 않는다. P23-02B2에서 시간 UI, Calendar 표시, ICS 출력과 UID를 한 번에 연결한다.

## 파일

- [contract spec](../../specs/2026-07-13-personal-draft-time-all-day/spec.md)
- [audit.md](./audit.md)
- [schedule-fixtures.json](./schedule-fixtures.json)

## UI 무변경

`components/flow/AppClient.tsx`, `lib/flow/my-flow-step-export.ts`, `lib/flow/export.ts`는 수정하지 않았다. 따라서 사용자가 현재 도달 가능한 화면과 실제 Calendar/ICS 출력은 P23-02A 기준을 유지한다.

## 검증

- targeted structural/storage tests: 36 passed
- full unit suite: 456 passed
- P23-02A 날짜 지정·변경·제거 Playwright: 1 passed
- `npm.cmd run docs:check`: passed
- `npm.cmd run build`: passed
