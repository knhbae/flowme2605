# Claude Design 복붙용 프롬프트

아래 GitHub 경로와 시나리오별 screenshot/evidence만 보고 FlowMe의 P19 제품/UX 백로그를 산출해주세요. 단순 UI polish가 아니라 제품 방향과 실행 흐름을 함께 평가해주세요.

## 검토 대상

GitHub review package:

https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-09-claude-design-p18-to-p19-persona-review-package

핵심 파일:

- `README.md`
- `audit.md`
- `review.html`
- `screenshot-index.md`
- `screenshots/`

원본 P18 final evidence package:

https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-09-claude-design-p18-final-review-package

앱/테스트 참고:

- Source root: https://github.com/knhbae/flowme2605
- Capture script: `scripts/content-audit/capture-claude-p7-final-review-package.mjs`
- Main E2E: `tests/e2e/flow-mvp.spec.ts`
- URL-first E2E: `tests/e2e/url-first-user-surface.spec.ts`
- Public share E2E: `tests/e2e/public-share-cta-order.spec.ts`
- Workbench source density E2E: `tests/e2e/workbench-source-density.spec.ts`

## 현재 제품 가정

FlowMe는 "URL/메모를 실행 가능한 Flow로 바꾸고, 내 실행 공간과 캘린더/export로 이어주는 개인 실행 도구"를 중심축으로 보고 있습니다.

현재 유지하려는 구조:

- 4탭 IA: 홈 / Flow 찾기 / 캘린더 / 내 Flow
- `/flows`: URL-first hit/custom-start/miss/candidate/draft-gate
- `/my`: task-first 실행 허브
- `/calendar`: date-first 실행 화면
- public `/f/[slug]`: 공유받은 Flow 저장/export 진입
- `/u/*`: creator/studio 보조 표면
- `/restart/moving-d30`: release-preview
- `/flow-lab/url-first-p0`: internal-console

## P18에서 닫은 기준선

- Calendar 같은 날짜 다중 Flow 색/마커/그룹 구별
- My Flow 오늘 1프레임 / 1카운트 / inline 완료
- public `/f` Flow 단위 저장과 Flow 단위 export 위계
- Calendar는 날짜 우선, My Flow는 할 일 우선 역할 분리
- URL-first 개인 수정본 overlay: 제목 alias, 날짜 override, 사용자 메모
- 기준일/이사일 라벨과 Flow 기준일 수정入口
- URL-first miss AI draft gate: 실제 AI 생성처럼 과장하지 않고 초안 요청으로 표현

## 주요 evidence 수치

- normal route internal hit: 0
- URL-first visible Markdown hit: 0
- candidate user-copy internal hit: 0
- miss draft gate visible: true
- miss draft gate implies live AI: false
- Calendar same-date distinct Flow groups: 2
- Calendar agenda grouped by Flow: true
- My Flow today frame count: 1
- My Flow today remaining-count sources: 1
- My Flow inline complete controls: 5
- public sticky save/setup first actions: 9
- My Flow anchor edit entry visible: true
- wide horizontal overflow: 0

## 꼭 봐야 할 시나리오

1. 처음 온 사용자
   - `/`
   - `/flows`
   - 판단: 한 문장으로 "URL/메모 -> 실행 Flow -> My Flow/Calendar/export"가 이해되는가?

2. URL-first hit/custom-start 사용자
   - `27-url-first-hit-mobile.png`
   - `28-url-first-custom-start-mobile.png`
   - `28b-url-first-moving-custom-start-mobile.png`
   - 판단: 준비된 Flow를 찾고 가볍게 고쳐 시작하는 가치가 보이는가?
   - 특히 `이사일`/기준일, Step include/exclude, 저장 후 편집 모델을 봐주세요.

3. URL-first miss/candidate/draft 사용자
   - `29-url-first-miss-candidate-form-mobile.png`
   - `30-url-first-candidate-detail-mobile.png`
   - 판단: 실제 AI 생성 없이도 "초안 요청/준비"로 정직하게 읽히는가?
   - P19에서 첫 AI draft slice를 열어도 되는지 판단해주세요.

4. public `/f` 공유 진입 사용자
   - `06-public-vehicle-mobile.png`
   - `07-public-moving-mobile.png`
   - `08-public-moving-bottom-mobile.png`
   - `09~12-workbench-*.png`
   - 판단: Flow 단위 저장이 primary이고, export는 Flow 단위 secondary로 이해되는가?
   - item checkbox/detail이 개별 item export/save처럼 오해되지 않는지 봐주세요.

5. My Flow 반복 사용자
   - `13-post-save-my-moving-mobile.png`
   - `13b-my-moving-personal-anchor-settings-mobile.png`
   - `13c-my-moving-personal-step-date-override-mobile.png`
   - `15-post-save-my-math-mobile.png`
   - `16-my-multi-queue-mobile.png`
   - `17-my-multi-queue-overdue-sheet-mobile.png`
   - 판단: 오늘 할 일, inline 완료, 기준일 수정, 항목 날짜 수정, progress count가 이해되는가?
   - `1/5`, `2/5` 같은 진행 숫자가 row마다 필요한지 평가해주세요.

6. Calendar-heavy 사용자
   - `14-calendar-after-moving-save-mobile.png`
   - `43-calendar-same-date-multi-flow-mobile.png`
   - `44-calendar-same-date-multi-flow-wide.png`
   - 판단: 같은 날짜에 여러 Flow가 있어도 어느 Flow의 어떤 할 일인지 바로 알 수 있는가?
   - Calendar가 "보관 데이터"가 아니라 날짜별 실행 화면으로 보이는지 봐주세요.

7. Creator / Studio 방향
   - `39-creator-profile-my-flow-studio-mobile.png`
   - `40-creator-profile-my-flow-studio-wide.png`
   - `41-creator-profile-flow-curation-team-mobile.png`
   - `42-creator-profile-flow-curation-team-wide.png`
   - 판단: Studio를 지금 키울 축인지, 아니면 4탭 밖 보조 표면으로 유지해야 하는지 평가해주세요.
   - AI 연결이 필요하다면 "AI 제안 -> 사용자 확인/수정 -> My Flow 저장" 정도의 흐름으로 시작하는 게 맞는지도 봐주세요.

8. Prototype / Internal Gate
   - `/restart/moving-d30`
   - `/flow-lab/url-first-p0`
   - 판단: release-preview와 internal-console 분리가 맞는지, 정상 사용자 IA에 새지 않는지 확인해주세요.

## 사용자 피드백도 반영해서 봐주세요

사용자가 직접 확인하며 남긴 피드백:

- 이사 Flow에서 기준일이 처음에는 이사일인지 헷갈렸다. 현재는 `이사일`/기준일 수정入口를 넣었지만 충분한지 봐주세요.
- Calendar에서 여러 Flow 구분은 되지만 아직 깔끔하고 일관된 디자인인지 의문이다.
- Calendar/My Flow의 `1/5`, `2/5` progress가 무슨 의미인지 애매할 수 있다.
- My Flow에서 오늘 할 일은 잘 보이지만 completion control이 checkbox와 버튼처럼 섞여 보이면 혼란스러울 수 있다.
- public `/f`에서 export가 Flow 전체인지 개별 항목인지 아직 기획적으로 탄탄해야 한다.
- Studio는 AI 연결/제안 흐름이 있어야 의미가 있을 수 있다. 다만 지금 핵심으로 키울지 보조 표면으로 둘지 판단이 필요하다.

## 요청 산출물

다음 형식으로 P19 백로그를 작성해주세요.

1. 전체 제품 방향 판단
   - 지금 FlowMe의 중심축이 "개인 실행 도구"로 명확한지
   - Calendar/My Flow/public `/f`/URL-first/Studio 우선순위 판단

2. Persona별 평가
   - first-time user
   - URL-first hit user
   - URL-first miss/draft user
   - public share recipient
   - My Flow repeat user
   - Calendar-heavy user
   - Studio/creator reviewer

3. P19 백로그
   - Blocking
   - High
   - Medium
   - Low

각 백로그 항목마다 아래를 포함해주세요.

- 항목 ID 예: P19-01
- 우선순위
- 문제
- 근거 screenshot/evidence
- 영향 route
- 사용자 영향
- 권장 구현 범위
- 회귀 방지 기준
- 이 항목을 먼저/나중에 해야 하는 이유

4. 명확히 결정해줄 것
   - Calendar progress `1/5` 류 숫자는 유지/축소/상세로 이동 중 무엇이 맞는가?
   - My Flow inline completion control은 checkbox/버튼 중 어떤 일관성이 맞는가?
   - public `/f` export는 Flow-level secondary로 충분한가, 아니면 별도 unit model이 필요한가?
   - URL-first item editing은 저장 전으로 당겨야 하는가, 저장 후 My Flow 편집이 맞는가?
   - Studio/AI draft는 P19에서 열어야 하는가, 아니면 Calendar/My Flow/public 단위 명확화가 먼저인가?

단순한 문구 수정만 말하지 말고, 제품 방향과 사용자 실행 흐름 관점에서 판단해주세요.
