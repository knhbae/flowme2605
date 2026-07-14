# P24-00F1 Local Date Boundary

## 목표

사용자 local calendar date와 UTC timestamp serialization을 분리한다. KST 00:00~08:59뿐 아니라 UTC-지역과 DST 경계에서도 Today, Calendar 기본 선택일, 새 개인 일정 기본 날짜가 사용자가 보는 오늘과 일치해야 한다.

## 구현 범위

1. `lib/flow/date.ts`에 date-only local formatter/parser 계약을 추가한다.
2. timestamp용 UTC ISO formatter는 그대로 유지한다.
3. `components/flow/AppClient.tsx`의 Today, Calendar 초기일, occurrence visible range, 새 일정 기본 날짜가 local date helper를 사용하게 한다.
4. 기존 저장된 `YYYY-MM-DD` 의미를 변경하지 않는다.
5. KST 오전, UTC-08, DST 전후 fixture 단위 테스트를 추가한다.
6. Playwright clock으로 KST 오전 07:00에 Today/Calendar/date input을 검증한다.

## 하지 않을 것

- date override summary parity
- anchor/reuse policy
- recurrence projection
- UI redesign
- timezone selector

## 완료 기준

- KST 오전 기본 날짜가 전날이 아님
- Today와 Calendar 기본 선택일 일치
- 기존 476 unit 및 date 관련 E2E 통과
- build 통과
- source/date-only serialization regression 0
