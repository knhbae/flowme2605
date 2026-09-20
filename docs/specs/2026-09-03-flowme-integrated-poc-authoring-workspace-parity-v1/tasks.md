# FlowMe 통합 PoC 작성→개인공간 일치 v1 Tasks

> 정합화: 이 목록은 작성→개인공간 parity P0의 마감 기록이다. 네 saved-plan origin의
> 공통 Plan→Item UI와 제품형 shell은 후속 `2026-09-03-flowme-integrated-poc-product-ux-pass-v1`
> 범위다.

## 0. 기준선

- [x] 세션 시작 절차와 최신 `origin/main` 일치 확인
- [x] 격리 worktree와 dirty 원본 저장소의 소유권 분리
- [x] A0-4/A0-6 및 세 원천 정본 재확인
- [x] `seed-flows` 콘텐츠 신선도 실패 1건 재현, 제품 코드 변경 대상에서 제외

## 1. 요구·설계

- [x] React/standalone 화면·기능·저장 차이 감사
- [x] 한 editor·2-state·선택형 review 계약 확정
- [x] template/example/ghost와 no-write 계약 확정
- [x] stable identity와 state+draft recovery transaction 계약 확정
- [x] 반응형 geometry와 접근성 acceptance 확정

## 2. 테스트 우선

- [x] template scaffold/example byte parity 테스트
- [x] all-blank ghost와 presentation-only 무영향 테스트
- [x] standalone stable retry와 late failure rollback 테스트
- [x] standalone compact 2-state·선택형 review browser 테스트
- [x] editor/sticky CTA overlap과 first-screen context geometry 테스트

## 3. React

- [x] picker example label 노출
- [x] 인식된 모든 blank ghost 노출
- [x] `순수 텍스트` / `Flow 편집` / `입력 예시`와 결과 전환 카피 정렬
- [x] compact editor/CTA 간격과 template insertion scroll/focus 보정
- [x] 기존 저장·review·reload 회귀 유지

## 4. 독립 HTML

- [x] canonical 여섯 template bytes 일치
- [x] 강제 3단계와 일반 source confirmation 제거
- [x] compact 원문/결과 2-state와 desktop 병렬 적용
- [x] 전체 blank ghost toggle과 선택형 review 적용
- [x] standalone 수동 `templateEditHistory` 제거와 browser-owned Undo/Redo transaction 확인
- [x] stable source identity와 idempotent handoff 적용
- [x] state+draft recovery transaction과 rollback 적용
- [x] 두 single-file HTML 재생성 및 embedded asset parity 확인

## 5. 검증

- [x] personal-workspace focused model/component 테스트 (`256/256`)
- [x] standalone node 테스트 (`39/39`)
- [x] React authoring browser 시나리오 (`11/11`)
- [x] standalone authoring 전체 browser 시나리오 (`21/21`)
- [x] 작성→개인공간 상세→개인 편집→기간→reload end-to-end (`3/3`)
- [x] cross-surface authoring parity (`2/2`)
- [x] focused 시나리오의 허용 prefix 밖 writer 0, 운영 bytes byte-for-byte 동일
- [x] 320×700, 375×812, 390×844, 844×390, 1024×768, 1440×900
- [x] 200% 등가 reflow 자동 proxy (실제 browser 200% text zoom은 미실행)
- [x] 최종 standalone bytes 뒤 production build, docs check, diff check
- [x] 전체 `npm test`와 기존 freshness failure 분리 기록 (`1520/1521`, 기존 1건 실패·중단)

## 6. 산출물

- [x] 요구 추적 JSON과 HTML 재판정
- [x] 요구 추적 HTML Chromium 검증 (`2/2`)
- [x] 작성→개인공간 통합 검증 보고서와 화면 증거
- [ ] 조작형 HTML 사용 안내 갱신
- [x] 실제 기기·관찰 사용자·게시 상태 분리 보고

조작형 HTML 사용 안내에는 아직 “구조를 확인한 뒤”라는 강제 단계처럼 읽히는 문장이
남아 있다. 이 항목은 후속 제품형 UX 패스에서 `원문 → 결과, 필요할 때 항목 검토`로 고친다.

## 7. 범위 밖·미실행으로 남길 증거

- [ ] CreatorDraft library, Sheet/export 전체, recurrence runtime, source reverse edit
- [ ] 실제 Android Chrome
- [ ] 실제 iOS Safari
- [ ] screen reader 실기
- [ ] 관찰 사용자 검증
- [ ] commit·push·PR
- [ ] Preview·Production
