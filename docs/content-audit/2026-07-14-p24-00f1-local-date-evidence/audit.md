# P24-00F1 Audit

## 원인

`formatDate(new Date())`가 `toISOString().slice(0, 10)`을 사용해 KST 00:00~08:59의 local day를 전날 UTC date로 만들었다. 같은 helper가 Today, Calendar 선택일, 개인 draft 날짜 기본값에 사용됐다.

## 변경 원칙

`formatDate`는 UTC/date serialization 용도로 유지했다. 현재 기기 달력 날짜를 만들 때만 `formatLocalDate`를 사용한다. 저장된 `YYYY-MM-DD`, anchor 계산, stable Item ID와 ICS UID는 변경하지 않았다.

## 실제 사용자 경로

1. 모바일 390px `/flows`
2. 등록되지 않은 URL로 miss 생성
3. 개인 draft를 My Flow에 저장
4. 사용자 할 일 추가
5. 상세 편집에서 `날짜 지정`
6. KST `2026-07-14 07:05`에 date input `2026-07-14` 확인

fixture 없이 UI로 도달했고 screenshot을 남겼다.

## 검증

- date unit: 5/5 pass
- P24 targeted E2E: 1/1 pass
- production build: pass, 18 routes
- source-backed date-only storage migration: 없음
