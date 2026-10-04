# 단계 계획

1. A 마감 재확인: 소유27파일·build·source drift0·61/32 증거·현재 DEV/rollback을 읽기 대조한다. 중복 구현하지 않는다.
2. B 입력 인수: root가 전달하는 동일 요청 ID 콘텐츠·기획2 경로와 SHA를 기록한다. 기존 문법·재열기/Undo 계약을 확인하고 판정표를 고정한다.
3. 합성 실앱: fresh 격리 브라우저와 전용3115 GET만 사용한다. Auth/account/creator API는 합성 응답이며 공개·social·외부 API는 차단한다. 빈 계정에서 기존 제작 UI로 시작하고 개인 결과 문서를 선주입하지 않는다. fixture 단위 검사와 실제 UI 결과를 구별한다.
4. 정상 로그인: 지원되는 Chrome/CUA의 정상 로그인 화면을 사용한다. 사용자가 직접 시험 계정 로그인을 완료하면 승인된 가상 자료만 기존 UI로 다룬다. 자격증명 추출·다른 profile/session 우회는 하지 않는다.
5. 결함 수정·동결: 현재 계약 내 결함만 최소 수정하고 관련 회귀·npm/build·정확 후보 UI를 재검사한다. 제품 source가 안 바뀌면 기존 결과의 hash 연결과 새 B 실행을 구분한다.
6. DEV 반영: 현재 관리 방식과 보호 native 절차를 유지한 새 작업 binding을 독립 검토한다. 후보/rollback·현재 세대·정확 hash를 연결하고 실제 전환·복귀·최종 제공판을 확인한다. Task/manager/guard/Tunnel 방식 변경을 새 필수 과제로 늘리지 않는다.
7. 마감: 합성/실로그인/운영·실행/미실행·commit/push/PR/CI/main/Production을 분리하고 docs/closeout·소유 diff·원본 로컬 증거를 확인한다.

입력 또는 정상 로그인 대기 중에도 합성 runner·독립 코드 검토·안전한 운영 준비를 진행한다. 새 권한이 필요한 행위만 중단하며 도구 명시 거부를 다른 경로로 우회하지 않는다.

## 선별 게시 범위

부모의 2026-10-04 14:38UTC 구체 승인 대상은 기존 public `knhbae/flowme2605`의 `agent/alpha-date-detail-ux-20261004`다. 병합·공개 콘텐츠 발행·새 배포 대상·권한 설정 변경은 제외한다. 최종 allowlist는 [A 소유27경로](../2026-10-04-date-detail-ux/manifest.md)와 아래 B8경로, 합35개다. callback 수정·검사 종료 후 actual Git 펼친 경로와 SHA를 다시 고정한다. 단순 목록은 검사 성공을 뜻하지 않는다.

- `docs/specs/2026-10-04-private-flow-pilot/spec.md`
- `docs/specs/2026-10-04-private-flow-pilot/plan.md`
- `docs/specs/2026-10-04-private-flow-pilot/tasks.md`
- `docs/specs/2026-10-04-private-flow-pilot/qa.md`
- `scripts/personal-workspace-poc/private-pilot-browser-fixture-20261004.ts`
- `scripts/personal-workspace-poc/private-pilot-fixture.test.ts`
- `scripts/personal-workspace-poc/build-private-pilot-browser-fixture-20261004.mjs`
- `scripts/personal-workspace-poc/qa-private-pilot-app-20261004.js`

가상 파일럿 원문·기대표·실등록 ID·raw 결과·캡처·로그·인증정보·운영자료는 이 목록에 없고 로컬 비공개로 보존한다. 공개 문서의 로컬 근거 표시는 원본의 Git 포함이나 공개 링크 가용성을 뜻하지 않는다. 같은 source hash의 과거 QA와 새 commit/build/CI를 분리한다.
