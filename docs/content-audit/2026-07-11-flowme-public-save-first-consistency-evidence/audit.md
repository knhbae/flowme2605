# Public 공유 save-first 일관성 Audit

## 원인 판단

기존 public `/f` shell은 저장 helper를 공통으로 갖고 있었지만, 첫 화면의 저장 CTA는 일부 대표 slug에만 적용됐다. exact-video와 일부 workbench는 모바일에서 작업판과 파일 export가 먼저 보이고, `내 Flow에 저장`은 520px 이상 스크롤한 뒤 진행률 bar 안에서 나타났다. 같은 공유 route인데 콘텐츠 종류에 따라 첫 행동이 달라지는 제품 계약 결함이었다.

## 수정

1. `moving-d30-basic`의 기존 export-first hero를 제외한 public Flow에 공통 save-first CTA를 적용했다.
2. 모바일은 fixed CTA, wide는 hero CTA만 사용해 첫 스크롤 전 visible 저장 행동을 1개로 제한했다.
3. 입력 없는 hero 카드 안에 있던 중복 저장 버튼을 제거했다.
4. 공통 save-first route에서는 스크롤 뒤 나타나던 진행률+저장 bar를 노출하지 않는다.
5. exact-video의 긴 실행 기준은 native `details`로 접고, 요약·원문·저장·export 접근은 유지했다.

## UX 판정

- 첫 행동: `내 Flow에 저장`
- 두 번째 행동: Flow 단위 캘린더/시트/메모 export
- 저장 전 checkbox: 완료가 아닌 preview 선택
- 저장 후 완료: My Flow/Calendar의 task checkbox
- 긴 원문 기준: 필요할 때 `실행 기준 보기`

## 자동·시각 evidence

- 8개 public route에서 첫 스크롤 전 visible save CTA는 정확히 1개다.
- 8개 route의 sticky primary는 저장 계열이며 export 문구가 섞이지 않는다.
- exact-video 2개 route를 포함해 Flow-level export secondary entry와 preview checkbox 정책이 유지된다.
- 390px exact-video/input-free와 1024px exact-video에서 horizontal overflow는 0이다.
- exact-video 긴 detail은 기본 닫힘이고 keyboard로 펼칠 수 있다.

## 제한

- 이는 저장 이해도를 관찰한 사용자 조사 결과가 아니다.
- public Flow 전체 slug를 모두 브라우저 순회한 결과가 아니라 구조 정본 변경과 대표 8개 route의 회귀 evidence다.
- export 파일을 실제 외부 앱에서 여는 P22-05 수동 gate는 그대로 남는다.
