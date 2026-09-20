# B2 구조 표시 facade 첫 연결 검증

2026-09-06. 신규 표시 API 8개와 기존 PD 모델/actual app VM 33개를 함께 실행해 **41/41 PASS**다. 이후 app v4 UI 연결 후보에서 신규8+기존 app VM11을 다시 실행해 **19/19 PASS**다. 같은 검사를 고유 수에 다시 더하지 않는다. B2 브라우저/제품 전체 완료 판정은 아니다.

제품 변경은 `personal-plan-display.js`의 새 display-only API뿐이다. 기존 두 API 입력·출력과 ABI1은 유지했다. before는 `output/poc-gap-implementation/k3b/before-structure-display/personal-plan-display.js`, SHA `4453A1350EB5A468CBB27860B682F4BE58BB7699665D396EE340325896197458`에 exact 복사했다. 새 `personal-plan-structure-display.test.cjs` 8개와 설계/본 QA를 추가했다.

새 API는 exact checkpoint/source/epoch/Flow 입력을 검사하고 current 및 실제 C Undo-P에 기존 source gate를 적용한다. P source context는 내부에서만 사용하고 frozen 구조 view만 반환한다. editor inspector/planner 호출, 외부 context·candidate·저장권한 발급, storage/DOM 접근이 없다.

| 검사 | 실제 결과 |
| --- | --- |
| B2PD01 | no-P 실제 작성 구간의 frozen detached view, 자동 metadata 생성0 |
| B2PD02 | 별칭 및 A1/B1/A2 전체 순서, 원문 arrays·membership 불변 |
| B2PD03 | actual C Undo 복원, current no-P/Undo-P의 source 실패 차단 |
| B2PD04 | 기존 네 origin readonly 구간과 전체 refs, 권한 부여0 |
| B2PD05 | unknown/getter/foreign/corrupt metadata에서 구조 fallback0·getter0 |
| B2PD06 | no-P/P source 읽기 실패와 손상 raw를 empty로 오인하지 않음 |
| B2PD07 | core-only v1 및 명시 구조 reset 뒤 core 유지/기존 PD ABI |
| B2PD08 | actual UMD 정상·reader API 부재, editor/planner/ambient 호출0 |

첫 실행 명령은 잘못된 Node entry로 시험0/MODULE_NOT_FOUND였으며 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-display-red-2026-09-05T14-48-00-607Z.json`)를 보존했다. 이를 테스트 RED로 세지 않는다. 올바른 수정 전8개 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-display-red8-2026-09-05T14-48-48-336Z.json`)는 API 부재로0/8, 제품 연결 후 41개 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-display-first-2026-09-05T14-48-49-687Z.json`)는41/41, 새 app 후보 19개 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-app-interim-pd-2026-09-05T15-01-41-932Z.json`)는19/19다. 모두 skip/cancel/todo0이다.

실제 저장소 사용자 profile이나 물리 기기를 검사한 결과가 아니다. fixtures와 pure calls, 기존 app 함수 VM 경계만 검사했다. 새 UI의 실제 입력/포커스/저장/복구·5 viewport와 결과 reader는 별도 합동 gate에서 검증한다. 사용자 HTML은 아직 B1 FB17이며 이 결과를 그 HTML의 B2 완료로 소급하지 않는다. 실제 Android/iOS/보조기술 NOT_RUN, 관찰 사용자0, commit/push/PR/Preview/Production 없음.
