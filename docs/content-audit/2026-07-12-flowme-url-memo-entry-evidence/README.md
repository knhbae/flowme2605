# FlowMe URL·메모 진입 정합성 evidence

작성일: 2026-07-12

## 목적

홈은 `URL이나 메모로 Flow 찾기`를 약속했지만 기존 `/flows` 입력은 URL 전용 브라우저 검증을 사용해 메모를 제출할 수 없었다. 현재 런타임 코드와 공개 가능한 콘텐츠만 기준으로 이 불일치를 닫았다.

## 적용 범위

- `/flows` 입력을 `URL 또는 메모` 한 필드로 통합
- URL은 기존 canonical lookup의 hit / needs_review / miss 흐름 유지
- 메모는 사용자가 쓴 문장만 규칙으로 나눈 개인 초안 표시
- 제목과 선택 기준일을 확인한 뒤 My Flow에 저장
- 저장한 메모 원문은 개인 draft bundle에 보존
- 기존 My Flow, Calendar, Studio 초안 선반이 사용하는 `url-draft-*` 저장 경로 재사용

## 판정 결과

- 390px / 1024px 입력 above-fold: `2/2`
- 메모 초안 표시: `2/2`
- 메모 초안 My Flow 착지: `2/2`
- 사용자 표면 내부어 hit: `0`
- live AI 암시: `0`
- horizontal overflow: `0`
- 원본 메모 보존: `2/2`
- 390px 첫 추천 카드 시작점: `467px` (`< 480px` 기준 유지)

상세 수치는 [route-evidence.json](./route-evidence.json), 판단 근거는 [audit.md](./audit.md), 화면 비교는 [review.html](./review.html)에서 확인한다.

## 기준 정책

이 package는 오래된 리뷰 화면이나 review-gated 콘텐츠를 현재 서비스 근거로 사용하지 않는다. 2026-07-12 production build의 `/`, `/flows`, `/my`와 현재 indexable runtime 콘텐츠만 캡처했다.

## 검증

- URL-first lookup / supply queue unit tests
- `flow-mvp.spec.ts` 홈·Flow 찾기 관련 11개 시나리오
- `url-first-user-surface.spec.ts` 8개 시나리오
- production build
- 390px / 1024px browser capture
