# FlowMe Claude Design UIUX 1차 적용 기록

작성일: 2026-07-03

## 기준 입력

- `D:\flowme2605\output\claude-design-proposal-2026-07-03\FlowMe Design Proposal.dc.html`
- 기존 4탭 IA: 홈 / Flow 찾기 / 캘린더 / 내 Flow
- 기존 seed/source-backed 콘텐츠 구조와 저장/실행/export 동선

## UX 감사 요약

| 영역 | 발견 | 1차 대응 |
| --- | --- | --- |
| 홈 | 대표 카드가 파란 안내 패널처럼 보여 실행 도구보다 설명 화면에 가까움 | 조용한 흰 카드, 입력/저장/결과만 남기고 CTA를 유지 |
| Flow 찾기 | 카드가 제목, 상태, 근거, 구조 정보를 같은 무게로 보여 3초 판단이 어려움 | 제목 -> 입력/결과 -> 먼저 확인할 일 -> 신뢰/상태 -> CTA 순서로 재정렬 |
| Flow Map 상세 | 상단에 흐름/단계 카운트가 내부 모델처럼 보임 | 사용자용 카운트는 묶음/할 일/체크로 표시 |
| 저장 직후 | 저장 완료가 끝 행동처럼 보일 수 있음 | 저장 완료는 작은 상태로 두고 다음 할 일을 먼저 여는 패널로 변경 |
| My Flow | 모바일 Flow 탭에서 저장 개수와 남은 개수가 먼저 보여 실행 우선순위가 약함 | 오늘/다음/밀림 칩을 먼저 노출 |
| Export | 복사/캘린더 결과 예측은 가능하지만 라벨이 다소 앱 내부 표현에 가까움 | 메모로 복사, 캘린더 파일 받기처럼 결과형 라벨 유지 |

## 적용 원칙

- 설명을 추가하지 않고 정보 위계를 낮춘다.
- 원문, memo, sourceTrace, detail은 삭제하지 않고 상세/접힘 영역에 둔다.
- seed에 없는 Step/Item/사실을 추가하지 않는다.
- 사용자 첫 화면에는 `review`, `audit`, `bundle`, `sourceTrace` 같은 내부 검토 단어를 노출하지 않는다.
- 9개 curated source-backed 콘텐츠와 기존 seed 콘텐츠는 `/flows`의 동일 목록 안에 유지한다.

## 구현 메모

- 디자인 토큰은 Claude 제안의 `#FAFAF8`, `#FFFFFF`, `#1B1A17`, `#6E6B64`, `#3654FF`, `#1F8A5B`, `#D6462E`, `#E7E4DD`를 화면 클래스에 우선 반영했다.
- 대규모 컴포넌트 추출은 하지 않았다. 1차 범위는 기존 컴포넌트의 정보 위계와 class 조정으로 제한했다.
- `Flow/Step/Item` 데이터 구조와 export 생성 로직은 유지했다.
- Public source-backed save CTA는 `전체 저장하고 시작`으로 변경했다.

## 검증 포인트

- 모바일 390px에서 `/`, `/flows`, `/flow-maps/[map]`, `/my?savedMap=...` 좌우 스크롤이 없어야 한다.
- `/flows`에서 기존 seed 콘텐츠와 9개 curated source-backed 콘텐츠가 통합 목록으로 보여야 한다.
- `/flow-maps/[map]`에서 source/detail/memo는 보조 영역 또는 접힘 영역에 남아야 한다.
- 저장 후 `/my?savedMap=...`에서 저장 완료보다 다음 할 일 CTA가 먼저 읽혀야 한다.
- My Flow 모바일 Flow 탭 요약에서 오늘/다음/밀림이 먼저 보여야 한다.
- `npm test`, `npm run docs:check`, `npm run build`, 필요한 Playwright targeted E2E, Vercel preview를 통과해야 한다.

## 남은 리스크

- 아직 전체 앱의 모든 레거시 public Flow 상세가 Claude 디자인 언어로 완전히 통일된 것은 아니다.
- `Flow`라는 브랜드/탭명은 유지한다. 사용자 첫 화면의 내부 모델 노출을 줄였지만, 제품명과 기존 IA 명칭까지 변경하지는 않았다.
- 실제 사용자 관찰 검증은 별도 과제다. 이번 문서는 코드 기준 시뮬레이션과 자동 검증 중심이다.
