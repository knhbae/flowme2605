# P3-B 작업표

## 요구·설계

- [x] D2-057 여섯 판정 단위와 현재 근거 재확인
- [x] 개발2의 추가 revision/history 요구를 별도 잔여로 분리
- [x] 개인 작성·제작자 초안·공개·실행 owner 경계 정의
- [x] versioned library·binding·transition·CAS·rollback 계약 정의
- [x] 모바일 3단계·데스크톱 보조 진입·평면 목록 UX 정의
- [x] 제목·원문 내 출처 검색과 replaceable sourceLabel 경계 정의

## 구현

- [x] 순수 CreatorDraft model과 validator
- [x] library storage와 two-key transaction/recovery
- [x] legacy-compatible working draft binding
- [x] React 저장·목록·검색·재진입·수정 저장
- [x] React 이름 변경·복제·보관·복원·Undo
- [x] standalone 동등 기능과 두 단일 HTML 재생성
- [x] package test entry와 route fail-closed 연결

## 검증·보고

- [x] focused unit/component/standalone 테스트
- [x] React·standalone 핵심 브라우저 시나리오
- [x] 다섯 viewport·키보드·overflow·console/page error 검사
- [x] stale·corrupt·storage failure·zero-write 검사
- [x] 운영 `flow:*` byte 불변·writer allowlist 검사
- [x] 개인공간 PoC suite, 전체 `npm test`, production build (`npm test`는 기존 날짜 seed 1건 FAIL, P3-B 실패 0과 tail 220/220을 분리 기록)
- [x] traceability·검증 HTML·QA·handoff 갱신
- [x] D2-057 부모와 `.2-.6` subcheck 승격을 fresh evidence 뒤에만 적용
- [x] D2-002·D2-004 부분 유지와 목표 집계 131/10/4/11/12·gap 14 확인

## 범위 밖

- [ ] 실제 Android Chrome
- [ ] 실제 iOS Safari
- [ ] screen reader와 실제 200% 확대
- [ ] 관찰 사용자 검증
- [ ] commit·push·PR·Preview·Production
