# P32 Canonical Production Smoke

실행일: 2026-07-24

evidence kind: `current_production_interaction`

production: <https://flowme2605.vercel.app>

release SHA: `30281a7a8ea9bea1194b4104b5a49b6211c07e3b`

Vercel status: `success`

observed-user count: `0`

## 결과

- scenarios: `7 / 7`
- HTTP 또는 assertion failure: `0`
- horizontal overflow: `0`
- fixed/sticky overlap: `0`
- unnamed focusable: `0`
- console error: `0`
- page error: `0`

검토한 상태:

1. 390 My Flow library
2. 390 My Flow library -> moving focused workspace와 keyboard focus 순서
3. 1024 My Flow focused rail/plan/inspector
4. 1440 My Flow focused workspace
5. 390 public `/f/moving-d30-basic`
6. 390 Calendar
7. 1024 Calendar

## 파일

- [구조화 결과](./results.json)
- [screenshots](./screenshots/)

이 smoke는 배포된 route, DOM marker, browser layout과 오류 상태를 확인한 자동화다. 실제 사용자 이해도나 반복 사용성을 검증하지 않는다.
