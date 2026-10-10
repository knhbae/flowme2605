# 작업·승인·실행 체크

2026-10-04 작성. [목표](spec.md)와 [QA](qa.md)가 판정 정본이다. 과거 승인/게시/전환 결과를 이번 체크에 옮기지 않는다.

- [x] 직전 후보의 결과·26개 피드백 추적·미결 정책/NOT_RUN 인수
- [x] df0670f 기준 새 clean release worktree 생성 후 소유26파일 인수
- [x] 후보26 + 준비6 =32 manifest와 공개 제외·rollback 계획 작성
- [x] 구체 승인 질문 전달 상태 확인
- [x] 사용자 직접 ‘승인!’ 응답과 공개·CI·운영 협업·DEV/자동 시작/rollback/재시작 범위 기록
- [x] 원26/반영32의 raw SHA256·예상 Git blob·22파일 정규화/EOF 및 의도된 진입점4 delta 대조
- [ ] 게시 commit checkout의 SHA/bytes/blob와 승인 index 최종 대조
- [x] 새 release root의 Node v24.17.0·npm11.13·정상 postinstall·npm ci exit0 확인
- [x] 새 로컬 audit0·compatibility14/14·docs4/4/7739 links·expanded path32 일치 확인
- [x] 새6파일40/40(신규31 포함)·npm2261/2261·통합 typecheck10/10/588 entry 진단0 확인
- [x] fresh production build exit0·BUILD_ID UW5_mgsa6csV02xqUU40h 확인
- [x] 미게시 로컬 UW5 build의 실제 Chrome43/43·다섯 viewport·prefix/요청/오류 경계 확인
- [ ] compile/source/input·게시 checkout·runtime/QA/static 식별자 최종 대조
- [x] local release branch·fresh main/PR211 base·외부 Git 자동 배포 off 읽기 확인(설정 무변경)
- [ ] stage 직전 branch/base/head/main drift·공개 index·외부 배포 영향 재대조
- [ ] expanded allowlist32로 선별 stage·commit·push·Draft PR 생성/부착
- [ ] 새 정확 HEAD의 필수 CI 통과
- [ ] 게시 판본/build의 fresh 합성 앱43·다섯 viewport·보호값/요청 경계 통과
- [x] 운영 오프라인 준비 profile/gate/test 3파일·live 인계 전면 거절·순수 모의11/11 확인
- [ ] 승인 후 운영 실행자/reference·게시 HEAD/CI/exact QA를 최종 controller에 바인딩하고 실제 guard 검사
- [ ] fresh generation/process tree/native handle/port/manifest/rollback 입력 대조
- [ ] DEV 후보 전환과 로컬/외부 정확 GET 확인
- [ ] 기존 df0670f/h6dz 제공본으로 실제 rollback 확인
- [ ] 새 후보 최종 인계·자동 시작 앱대상/guard 최소 정렬
- [ ] 정확 앱 정상 재시작1회와 같은 후보 회복 receipt
- [ ] 최종 Git/CI/DEV/자동 시작·rollback·NOT_RUN/잔여·scoped closeout 보고

## 승인 확인과 실행 상태

작성 당시 미응답이던 구체 질문에 사용자가 직접 ‘승인!’으로 답했다. reference는 `user-20261004-memo-date-gaps-publish-dev`다. 승인된 운영 협업 준비 요청은 공식 경로로 전달했고 실제 수신·검토 결과는 별도 확인한다. 선별 게시부터 단계별로 진행하며 실제 stage·commit·push·CI·DEV 성공은 근거가 생긴 뒤 체크한다. 이미 허용된 범위의 정상 다음 단계마다 중복 승인을 요청하지 않는다.

예상 범위 밖 파일/서비스 변경이나 guard 완화가 필요하면 우선 안전한 기존 절차를 확인한다. 그 뒤에도 scope가 달라지면 실제 영향과 필요한 선택을 구체화해 사용자 방향을 받는다. 명시되지 않은 자동 승인·과거 다른 목표의 승인·침묵은 답으로 취급하지 않는다.

별도 결과 파일은 만들지 않고 작업 결과·실패/재시도·완료 여부를 [qa.md](qa.md)에 남긴다. 이 체크는 실행 계획이며 현재 모든 항목이 PASS라는 표가 아니다.
