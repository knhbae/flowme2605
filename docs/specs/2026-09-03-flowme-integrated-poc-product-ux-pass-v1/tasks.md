# FlowMe 통합 PoC 제품형 UX 패스 v1 Tasks

## 0. 기준선·문서

- [x] 이전 parity 구현과 stale 상태 감사
- [x] 세 결과물의 정본과 연결 경계 재확인
- [x] 48개 gap을 다섯 실행 분류로 재정리
- [x] 이전 자동화와 이번 fresh 실행을 분리
- [x] 제품형 UX spec·plan·requirements·QA·design contract 작성

## 1. 테스트 우선

- [x] 작성 Flow와 네 saved-plan origin의 editor schema parity 테스트
- [x] 모든 opener의 동일 edit intent와 field order 테스트
- [x] staged draft·변경 요약·single commit·cancel·failure 테스트
- [x] 계획 날짜와 실행 날짜 owner invariant 테스트
- [x] 내부 구현 용어 0, 화면별 primary 1개 구조 검사
- [x] React·standalone copy·상태·핵심 흐름 parity 테스트

## 2. React 구현

- [x] 모바일 header를 한 층으로 정리
- [x] authoring 첫 행동과 결과 화면 primary action 정리
- [x] 네 origin과 authoring handoff를 공통 Plan→Item 상세로 연결
- [x] source read-only와 개인 수정 영역을 한 화면에서 구분
- [x] 계획 날짜 3상태와 실행 날짜 이동을 분리
- [x] staged 변경 요약·저장·취소·오류·retry 연결
- [x] 성공 Undo와 reload 복구 연결
- [x] 내부 용어·중복 설명·배지·카드·경쟁 CTA 감산

## 3. 단일 HTML

- [x] React와 header·간격·primary·상태 문구 맞춤
- [x] 공통 Plan→Item 필드 순서와 owner 표현 맞춤
- [x] fixture-only 경계와 no-live-origin 문구 유지
- [x] 사용 안내에서 강제 구조 확인 표현 제거
- [x] 일반·Android single-file 재생성
- [x] 두 single-file embedded asset·bytes parity 확인

## 4. 자동 검증

- [x] 순수 모델·identity·storage·transition 테스트
- [x] 관련 component 테스트
- [x] React 브라우저 핵심 여정
- [x] standalone 브라우저 핵심 여정
- [x] cross-surface parity
- [x] 작성 Flow + saved-plan 네 origin end-to-end
- [x] keyboard·Escape·focus return·비드래그 이동
- [x] 실패·retry·Undo·reload
- [x] 허용 prefix 밖 set/remove/clear 0
- [x] 운영 sentinel bytes 동일

## 5. 화면 검증

- [x] 320×700
- [x] 375×812
- [x] 390×844
- [x] 844×390
- [x] 1024×768
- [x] 1440×900
- [x] 가로 넘침·console error·page error·핵심 행동 가림 0
- [x] 전후 캡처와 세 정본의 UX 결정 비교

## 6. 보고·closeout

- [x] 요구 추적 최종 판정
- [x] 조작형 HTML 사용 안내 갱신
- [x] 통합 검증 보고서와 화면 증거 갱신
- [x] 관련 테스트 실제 실행 수 기록
- [x] 전체 `npm test` 결과 기록
- [x] production build
- [x] docs check와 diff check
- [x] 변경 파일·남은 결함·owner 결정 보고

## 7. 이번 목표에서 미실행으로 유지

- [ ] 실제 Android Chrome
- [ ] 실제 iOS Safari
- [ ] 실제 모바일 가상 키보드
- [ ] screen reader 실기
- [ ] 실제 browser 200% text zoom
- [ ] 관찰 사용자 검증
- [ ] commit·push·PR
- [ ] Preview·Production

위 체크박스는 누락된 구현 task가 아니라 이번 목표의 완료 주장에 포함하지 않을 외부 증거와
게시 상태다.

## 8. 후속 기능으로 유지

- [ ] Flow 휴지통 lifecycle
- [ ] Sheet·복사용 TXT 전체 결과
- [ ] 표·장문·source candidate
- [ ] full property catalog와 inline/native picker
- [ ] near-miss 문법 복구와 source reverse edit
- [ ] recursive StructureDraft/compiler
- [ ] CreatorDraft·public·AI·cloud·외부 동기화
- [ ] 운영 schema·migration·writer 연결
