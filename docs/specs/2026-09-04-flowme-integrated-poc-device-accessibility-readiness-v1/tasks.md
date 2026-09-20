# P3-G 작업 목록

## 기준·설계

- [x] P3-F gap 7과 실기 문턱 확인
- [x] E4 자동화 준비도와 E5-D 실제 기기 근거 분리
- [x] visual viewport·gesture cancel·keyboard·motion 계약 작성
- [x] 실제 기기 과업과 증거 형식 작성

## 구현

- [x] React visual viewport·가상 키보드 보강
- [x] React pointer cancel·focus·reduced-motion 보강
- [x] standalone visual viewport·가상 키보드 보강
- [x] standalone pointer cancel·focus·reduced-motion 보강
- [x] 단일 standalone HTML 재생성

## 검증

- [x] 대상 단위·컴포넌트 테스트
- [x] P3-G browser readiness 시나리오
- [x] 필수 5 viewport + 320·360·200% 등가 검사
- [x] 운영 저장 데이터 byte 불변 검사
- [x] 전체 `npm test`
- [x] production build
- [x] `docs:check`
- [x] scoped diff/closeout

## 실제 기기

- [ ] Android Chrome — `NOT_RUN`
- [ ] iOS Safari — `NOT_RUN`
- [ ] TalkBack — `NOT_RUN`
- [ ] VoiceOver — `NOT_RUN`
- [ ] OS 최대 글자 크기 — `NOT_RUN`
- [ ] 실제 browser 200% 확대 — `NOT_RUN`
- [ ] 실제 모바일 가상 키보드 — `NOT_RUN`
- [ ] 30분·핵심 과업 5회 — `NOT_RUN`

## 결과물

- [x] 요구사항 추적 자산 갱신
- [x] P3-G 검증 HTML 생성·브라우저 검사
- [x] QA와 handoff에 실제 실행 수 반영

실제 기기 체크박스는 자동화 결과로 닫지 않는다. 위 `NOT_RUN` 8개가 P3-G 뒤에도
남는 의도된 E5-D 과업이다.
