# P3-E 작업 목록

## 완료

- [x] 2026-07-11 canonical 계약 확인
- [x] 2026-06-26 Step-first 호환 계약과 충돌 확인
- [x] 2026-07-29 collaborative authoring 권고안의 미승인 상태 확인
- [x] P3-D canonical/ownership adapter와 source-update 경계 확인
- [x] versioned production-target planning contract 작성
- [x] operating schema·writer·migration 미소유 flag 고정
- [x] SourceRow→Item→Step→Flow→Bundle/Flow Map graph 작성
- [x] 여덟 계층 logical owner·mutability·derivation 작성
- [x] immutable version history와 personal/execution 보존 validator 작성
- [x] collision·dangling·mistyped edge·cycle·history tamper negative fixtures 작성
- [x] 제거된 Item의 개인 overlay·실행 이력 보존 fixture 작성
- [x] P3-E focused 24/24 실행
- [x] 기존 P3-D canonical과 결합 focused 35/35 실행
- [x] older pinned copy/run의 future Item 참조 차단
- [x] ExecutionRun이 content version에서 제거된 Item을 새 상태로 참조하는 경로 차단
- [x] published history 배열 순서 재작성 차단
- [x] standalone Flow와 선택적 Bundle/Flow Map grouping 허용
- [x] prototype 상속 unknown owner field 차단
- [x] 잔여 11개 gap의 데이터·디자인·실기 선행관계 문서화
- [x] P3-D D2-026.1~.5의 production 확대 해석 차단
- [x] 새 P3-E 문서 로컬 링크 16/16 검사

## 검증 완료

- [x] package script와 요구사항 trace에 P3-E focused run 연결
- [x] P3-E local production-readiness report 생성
- [x] P3-E 관련 scoped regression 24/24·35/35·121/121·37/37 실행
- [x] 전체 `npm test` 2,094/2,094 실행
- [x] production build 18/18 실행
- [x] `npm run docs:check` 필수 16개·로컬 링크 4,617개 실행
- [x] required viewport report·PoC browser 회귀 3/3 실행
- [x] PoC prefix 밖 set/remove/clear 0과 non-PoC bytes 불변 확인

## 제품 결정 대기

- [ ] `D2-002`: production stable identity 발급·보존 계약 승인
- [ ] 여러 content 문서 전역 identity uniqueness를 담당할 registry 범위 결정
- [ ] `D2-004`: 실제 owner·authority·retention·audit 계약 승인
- [ ] review 결정과 VersionResolution receipt schema·적용 권한 승인
- [ ] `V41-001` + `D2-007`: production shell과 teal/cobalt token 결정
- [ ] saved-plan 네 origin의 immutable Base 도입 여부 결정
- [ ] removed Item과 장기 execution history 보존기간 결정
- [ ] PublishedVersion·ExportSnapshot의 실제 owner 결정

## 실기 대기

- [ ] 실제 Android Chrome: `V41-062`, `V41-066`, `D2-038`, `D2-042`
- [ ] 실제 iOS Safari: `V41-063`, `V41-066`, `D2-038`, `D2-042`
- [ ] TalkBack·VoiceOver·OS 글자 확대·browser 200%: `V41-064`, `D2-061`
- [ ] 관찰 사용자 검증

## 전체 승격 hold

- [x] `dog-adoption-first-week:review_due:2026-06-04` source mismatch 감사
- [x] production 일반 실행 제외·`catalog_preview` disposition 기록
- [ ] 콘텐츠 owner의 refresh 또는 대체 source 승인
- [ ] 콘텐츠 변경 뒤 전체 회귀 재실행

## 명시적 제외

- [ ] 운영 SQL·RLS·API·migration 구현
- [ ] publish/export/provider sync writer 구현
- [ ] 기본 `/my` 또는 기존 운영 저장 schema 변경
- [ ] commit, push, PR, Preview, Production

체크되지 않은 제외 항목은 누락이 아니라 별도 승인 전 금지된 작업이다.
