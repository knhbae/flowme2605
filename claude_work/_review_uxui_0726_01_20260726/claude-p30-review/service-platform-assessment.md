# Service / Platform Assessment (claude_design · P30)

10축 종합. 각 축: 현재 상태 · 근거 · 판정. observed users 0 — 사용성 결론이 아니라 화면·구조·source 근거의 종합.

| # | 축 | 판정 | 근거 요약 |
| --- | --- | --- | --- |
| 1 | 가치 제안 명확성 | 보통+ | /f artifact-first가 "이 콘텐츠가 어떤 실행 결과가 되는지" 먼저 답함. 단 /flow-maps는 목록 우선이라 진입별 상이(H-1) |
| 2 | source 신뢰·provenance | **약함** | 진입별 원문 표기 상이 + correction 전송 gated. "믿고 실행해도 되나" 미관측 |
| 3 | artifact 품질·destination 적합성 | 좋음 | export preflight가 범위·개수·손실·primary1+secondary≤2를 명확히. 캘린더/체크/시트/메모 대응 |
| 4 | 개인화 자유도↔복잡도 균형 | 좋음 | save-before 조정을 한 목적으로, 24항목은 명시 disclosure(P30-03). 결정영역 밀도만 잔존(M-1) |
| 5 | 실행·완료·복구 연속성 | 보통(미관측) | run/occurrence 분리·undo·reopen은 source·fixture green, 라이브 not_tested |
| 6 | My Flow/Calendar/export 정합성 | 좋음 | title/date/count/identity parity가 화면·source상 일치. receipt count parity 라이브 미검 |
| 7 | 재방문·재사용 이유 | **약함** | 기능(run registry·완료·재사용)은 코드 존재, 돌아올 이유는 observed 0 |
| 8 | creator/source correction loop | 미구현(gated) | correction 전송·moderation 없음 → P7 S2 blocked. 범위 밖 |
| 9 | 접근성·responsive operability | 보통+ | overflow0·focus trap/return·accessible name·본문 우선 확인. Calendar 키보드 깊이 ~76(M-3) |
| 10 | 20~60 Flow scale | 보통(fixture) | scope collapse·selected-day identity 구조상 scale, 동명 fixture 검증뿐 → 발견성 관찰공백(M-2·M-4) |

## 가장 약한 가치 사슬 3

### 1. source 신뢰 · provenance · correction (가장 약함)
FlowMe 전제는 "믿을 만한 외부 콘텐츠 → 실행 artifact". 신뢰의 절반(provenance 일관성·오류 정정)이 비어 있다: 진입 route별 원문/문법 상이(H-1), source 오류 정정 전송은 gated(P7 S2). "이 결과를 믿고 실행해도 되나"가 미관측.

### 2. 재방문·재사용 이유
export-first 원칙상 결과를 외부 도구로 가져간 뒤 왜 FlowMe로 돌아오는가? run registry·완료 기록·재사용은 코드로 존재하나(P7 S3 source), 돌아올 이유는 observed 0으로 미증명. My Flow는 좋은 라이브러리지만 재방문 유인(다음 회차·회고)은 관찰로만 닫힌다.

### 3. scale 발견성 (20~60 Flow)
scope collapse·selected-day identity는 구조적으로 scale된다. 그러나 검증이 동명 합성 fixture(이사 준비 Flow NN 62개)뿐이라 varied-name에서 검색 전 스캔(M-2·M-4)이 되는지 미관측. 월간 grid는 밀도가 오르면 축약 벽이 된다.

## 종합
구조·계약은 건강하고 P30 refinements는 production에 실재한다(keep_p30). 서비스로서 가장 약한 고리는 **화면 밀도가 아니라 신뢰·재방문·대량 발견성** — 앞의 둘은 관찰과 gated 작업, 세 번째는 P31-4 + 관찰로 닫는다.
