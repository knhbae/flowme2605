# Claude Design 재검토 요청 프롬프트

FlowMe 앱의 Claude Design UX/UI 개선 루프 P0~P2 적용 후 상태를 재검토해 주세요.

## 참고할 파일

1. `docs/content-audit/2026-07-03-claude-design-p0-p2-final-audit-package/review.html`
2. `docs/content-audit/2026-07-03-claude-design-p0-p2-final-audit-package/audit.md`
3. `docs/content-audit/2026-07-03-claude-design-p0-p2-final-audit-package/route-evidence.json`
4. `docs/content-audit/2026-07-03-claude-design-action-backlog-ko.md`
5. 주요 소스:
   - `components/flow/AppClient.tsx`
   - `components/flow/PlatformNav.tsx`
   - `components/flow/ArtifactWorkbench.tsx`
   - `app/globals.css`
   - `tests/e2e/flow-mvp.spec.ts`

## 재검토 기준

- 새 기능 제안보다 현재 구현 화면의 UX/UI 품질을 먼저 평가해 주세요.
- FlowMe가 설명형 화면이 아니라 실행형 앱처럼 보이는지 평가해 주세요.
- 모바일 390px 기준으로 첫 화면에서 목적, 첫 행동, 저장 결과, 다음 할 일을 이해할 수 있는지 봐 주세요.
- 일반 사용자 화면에 내부 제작/검토 언어가 다시 새어 나오지 않는지 봐 주세요.
- export 버튼이 누르기 전에 결과를 예측할 수 있는지 봐 주세요.
- My Flow와 Calendar에서 저장 후 다음 행동이 목록/빈 상태보다 먼저 보이는지 봐 주세요.

## 산출물

1. Blocking / High / Medium / Low 이슈 목록
2. route별 평가
   - `/`
   - `/flows`
   - `/flow-maps/moving-d30`
   - `/flow-maps/middle-school-math-1`
   - `/f/vehicle-inspection-prep`
   - `/my`
   - `/my?savedMap=moving-d30`
   - `/calendar`
3. 다음 UX/UI 개선 루프에서 바로 개발 가능한 작업 목록
4. 유지해야 할 기준선
5. 바꾸면 안 되는 것
6. 필요한 경우 revised screen spec 또는 copy spec

## 특히 확인할 질문

- `/f/vehicle-inspection-prep` 같은 public single Flow detail에서 하단 4탭 nav가 없는 상태를 공유 화면 의도로 유지해도 되는가, 아니면 app shell 일관성을 위해 맞춰야 하는가?
- P0~P2 이후에도 카드/버튼/chip 밀도가 상용 실행 앱 대비 높은 route가 남아 있는가?
- My Flow와 Calendar가 반복 사용자에게 충분히 빠른 실행 허브로 보이는가?
- 다음 루프를 한다면 어디부터 고쳐야 하는가?
