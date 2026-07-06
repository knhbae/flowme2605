# FlowMe Post-P11 Claude Design Review Brief

- Review cycle: Post-P11 cleanup
- Next backlog request: P12
- Branch: `codex/flowme-uxui-second-loop`
- UI baseline commit: `fcd96e4`
- Package path: `docs/content-audit/2026-07-07-claude-design-post-p11-cleanup-review-package/`
- Viewport: mobile 390x844

## 목적

이 패키지는 P4~P11 UX/UI 개선 루프 이후 FlowMe가 다음 P12 작업을 정할 수 있는지 확인하기 위한 리뷰 인테이크입니다. 새 기능 검토가 아니라, 현재 기준선이 사용자 화면과 evidence에서 유지되는지, 그리고 다음에 실제로 개발해야 할 P12 backlog가 무엇인지 Claude Design에게 묻기 위한 자료입니다.

Claude Design은 Vercel preview를 볼 수 없다는 전제로 GitHub 소스, 문서, route evidence JSON, screenshots만 보고 판단해야 합니다.

## 이번 패키지에 포함된 것

- 기본 route evidence: `route-evidence.json`
- 기본 시나리오 screenshots: `screenshots/01` ~ `screenshots/26`
- URL-first/manual QA 보조 evidence: `url-first-supplement-evidence.json`
- URL-first/manual QA 보조 screenshots: `screenshots/27` ~ `screenshots/32`
- 사람이 읽는 리뷰 인덱스: `review-intake-ko.html`
- 복붙용 요청 프롬프트: `prompt-copy-ko.md`

## 핵심 기준선

- 4탭 IA 유지: 홈 / Flow 찾기 / 캘린더 / 내 Flow
- 공개 `/f/[slug]`는 공유 진입 shell 유지. 저장 전 primary path는 `내 Flow에 저장` 또는 입력/setup path
- `콘텐츠 더 보기`는 접근 가능하지만 primary 뒤의 보조 탐색이어야 함
- 저장/실행/export 스키마와 sourceUrl/sourceTrace/detail/memo 데이터 유지
- 사용자 화면 주요 문구에서 raw ISO, trailing `Flow`, 구조형 `...지도`, source slug, 내부 구조어 노출 0건 유지
- My Flow continuation은 설명-only 카드가 아니라 실제 `열기` 가능한 row/control이어야 함
- My Flow 지난 할 일과 Calendar agenda는 group header 중심으로 공통 메타를 1회만 보여야 함
- My Flow inventory row는 진행 지표를 중복 표시하지 않아야 함
- `/restart/moving-d30`는 prototype bucket으로 분리하고, 승격 전 표시 게이트를 통과해야 함
- URL-first는 AI 생성/크롤링이 아니라 canonical lookup 우선. hit는 기존 source-backed Flow로 연결되고, miss/needs_review는 non-executable local candidate로 남아야 함

## Evidence summary

기본 route evidence summary 기준:

- normal route internal/source/structural/raw ISO guardrail hit: 0
- normal route input raw ISO hit: 0
- normal route first task repetition hit: 0
- normal route continuation actionable count: 4
- continuation explanation-only count: 0
- agenda/status repeated meta row count: 0
- inventory duplicate progress metric count: 0
- inventory header large remaining count: 0
- public share secondary browse before-primary count: 0
- public share primary path visible/focusable count: 9 / 9
- restart prototype raw ISO, route slug, English weekday/UI verb, mixed export language hit: 0
- restart source/export and bottom frames distinct: true
- restart native date input ISO values are recorded as explicit technical exemptions

URL-first supplement 기준:

- supplement screenshot count: 6
- horizontal overflow in supplement screenshots: 0
- covered states: hit, lightweight custom start, miss candidate form, candidate handoff, internal lab, manual registration QA report

## Screenshot map

### First entry / discovery

- `01-home-mobile.png`: Home
- `02-flows-mobile.png`: Flow finding

### Flow Map save path

- `03-flow-map-moving-top-mobile.png`: moving-d30 top
- `04-flow-map-moving-bottom-mobile.png`: moving-d30 bottom
- `05-flow-map-math-mobile.png`: middle-school-math-1
- `13-post-save-my-moving-mobile.png`: My Flow after moving save
- `15-post-save-my-math-mobile.png`: My Flow after math save
- `14-calendar-after-moving-save-mobile.png`: Calendar after moving save

### Public `/f` share/workbench path

- `06-public-vehicle-mobile.png`: vehicle inspection public save
- `07-public-moving-mobile.png`: moving public save
- `08-public-moving-bottom-mobile.png`: moving public bottom clearance
- `09-workbench-fridge-mobile.png`: fridge workbench
- `10-workbench-washer-mobile.png`: washer workbench
- `11-workbench-new-car-mobile.png`: new car workbench
- `12-workbench-used-car-mobile.png`: used car workbench
- `25-workbench-new-car-open-details-mobile.png`: new car detail/source density
- `26-workbench-used-car-open-details-mobile.png`: used car detail/source density

### My Flow repeated user states

- `16-my-multi-queue-mobile.png`: today/overdue/next multi queue
- `17-my-multi-queue-overdue-sheet-mobile.png`: overdue status sheet group header
- `18-my-long-list-top-mobile.png`: saved 5+ list top
- `19-my-long-list-bottom-mobile.png`: saved 5+ list bottom
- `20-my-long-list-inventory-bottom-mobile.png`: inventory bottom/detail clearance

### Restart prototype gate

- `21-restart-moving-top-mobile.png`: restart top/date input
- `24-restart-moving-full-schedule-mobile.png`: restart full schedule/date distribution
- `22-restart-moving-source-export-mobile.png`: restart source/export middle frame
- `23-restart-moving-bottom-mobile.png`: restart true bottom

### URL-first and manual registration supplement

- `27-url-first-hit-mobile.png`: URL-first canonical hit
- `28-url-first-custom-start-mobile.png`: lightweight custom start
- `29-url-first-miss-candidate-form-mobile.png`: miss candidate form
- `30-url-first-candidate-handoff-mobile.png`: candidate handoff
- `31-url-first-p0-lab-mobile.png`: internal URL-first lab
- `32-source-backed-manual-registration-report-mobile.png`: source-backed manual registration QA report

## Claude에게 특히 봐달라고 할 질문

1. P4~P11에서 닫은 기준선 중 다시 열린 것이 있는가?
2. My Flow / Calendar / public `/f` / Flow finding / URL-first / restart prototype 중 다음 P12에서 가장 먼저 고쳐야 할 사용자 마찰은 무엇인가?
3. Evidence가 부족해서 UX 판단을 유보해야 하는 시나리오는 무엇인가?
4. 현재 guardrail이 실제 화면 품질을 충분히 대변하지 못하는 부분은 무엇인가?
5. P12 backlog를 Blocking / High / Medium / Low로 나누면 무엇부터 처리해야 하는가?

## 남은 리스크

- 이 패키지는 screenshot/evidence 기반 리뷰 자료이며 실제 사용자 행동 검증은 아니다.
- `/restart/moving-d30`는 계속 prototype bucket이다. 정상 사용자 route로 승격하려면 별도 gate를 통과해야 한다.
- URL-first candidate와 manual registration QA는 운영 정책/증거 경로 확인용이다. AI 생성, 자동 크롤링, 서버 영속화를 의미하지 않는다.
- 이전 작업에서 보류한 unrelated dirty docs/zip 파일은 이 review package 기준선에 포함하지 않는다.
