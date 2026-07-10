# Claude Design 검토 요청

아래 GitHub package만 보고 FlowMe P22-05 외부 도구 가져오기 검증을 평가해 주세요.

- `docs/content-audit/2026-07-11-claude-design-p22-05-external-import-evidence/review.html`
- `docs/content-audit/2026-07-11-claude-design-p22-05-external-import-evidence/audit.md`
- `docs/content-audit/2026-07-11-claude-design-p22-05-external-import-evidence/route-evidence.json`
- `docs/content-audit/2026-07-11-claude-design-p22-05-external-import-evidence/office-observation.json`
- `docs/content-audit/2026-07-11-claude-design-p22-05-external-import-evidence/calendar-parser-observation.json`
- `docs/content-audit/2026-07-11-claude-design-p22-05-external-import-evidence/fixture-manifest.json`
- Vercel preview: `https://flowme2605-7pe451s7j-flowme.vercel.app`

## 현재 판정

- Excel 실제 읽기 전용 열기 3/3 통과
- Word 실제 읽기 전용 열기 3/3 통과
- ical.js parser 대표 Flow 3/3 + 개인 항목 1/1 통과
- ICS UTF-8 75 bytes 초과 0
- 사용자-facing export 내부어 hit 0
- Outlook은 최소 표준 ICS도 거절해 로컬 MAPI profile 검증 불가
- provider 연동·양방향 sync는 구현하지 않음

## 요청할 판단

1. 이 상태를 `조건부 완료`로 두고 실제 Calendar 앱 수동 import 1회만 남기는 판단이 적절한가?
2. 캘린더·시트·메모의 중복 정책이 사용자가 이해할 수 있는 수준인가?
3. 실패 복구 문구를 다운로드 직후 UI에 노출해야 하는가, 실패 시 도움말로만 두어야 하는가?
4. Flow 전체 export와 개인 항목 export의 제목·날짜·메모 구조가 자연스러운가?
5. P22-06 완료 Flow 재사용·버전 갱신 정책으로 넘어가기 전에 막아야 할 Blocking 문제가 있는가?

## 출력 형식

다음 순서로 답해 주세요.

1. 출시 판단: `통과 / 조건부 통과 / 보류`
2. Blocking / High / Medium / Low findings
3. 실제 Calendar 앱 수동 검증 체크리스트 보정안
4. 중복·실패 복구 copy 권고안
5. P22-06 진행 여부와 다음 구현 slice

단순 UI polish 목록보다 **외부 도구에서 실제 실행 가능한가, 중복과 실패를 정직하게 다루는가**를 우선 평가해 주세요. 실제로 관찰하지 않은 Outlook 성공을 추정하지 마세요.
