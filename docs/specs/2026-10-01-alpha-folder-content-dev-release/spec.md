# 폴더 입력·Flow 진입 UX의 개발계 반영

2026-10-01. 사용자 ‘다음 목표 잡고 ㄱㄱ’로 직전 마감에서 제안한 선별 게시·개발계 반영을 진행한다.

## 방향·기준

개인 텍스트 계획·공유 경험/지식·선택적 기여의 방향을 유지한다. UX 설계를 전면 재개하거나 새 정책을 확정하지 않는다. [직전 후보](../2026-10-01-alpha-folder-content-entry-ux/spec.md)의 24개 소유 파일과 이전 검증은 [결과](../2026-10-01-alpha-folder-content-entry-ux/results.md)·[QA](../2026-10-01-alpha-folder-content-entry-ux/qa.md)에 있다. 그 통과는 이전 실행이며 이번 게시/반영 검증으로 표시하지 않는다.

현재 작업본은 `flow-folder-content-ux-20261001`, branch `agent/flow-folder-content-ux-20261001`, HEAD `08aa8311c18249c34efd6663efdf44f8e53bc21f`다. 최신 origin/main은 `efd8b642`이며 현재 개발계/PR206의 기준 브랜치는 `agent/flow-ux-journey-20261001@08aa8311`이다. 그 위 stacked Draft PR로 새 변경만 검토하고 main 병합은 하지 않는다. 기존 실행 앱은 별도 `flow-ux-journey-20261001`의 build `zEY9jP0Mcmqs90L0HCPvB`·loopback3105이며 Tunnel은 유지한다.

## 이번 범위와 완료 조건

1. 소유 diff·최신 피드백·기존 PR와 중복·비공개 원문/설정/증거의 공개 경계와 자동 배포 연결을 읽기 확인한다.
2. 정확한 allowlist만 commit/push하고 새 stacked Draft PR·현재 commit의 필수4 CI를 확인한다. 기존 hook·검사 기준을 우회하지 않는다. 기존 승인된 비공개 카탈로그 CI만 사용하며 원시 자료/로그를 공개하지 않는다.
3. 실제 제품 소스·게시 commit·마지막 pre-push build를 결합해 동결하고 로컬 합성 브라우저로 확인한다. 새 시나리오가 기본 CI에 자동 포함되지 않는 점은 별도로 기록한다.
4. 기존 앱의 정확한 PID/부모/생성시각/절대 경로/포트 소유를 교체 직전에 검증한다. 기존3105 앱만 교체하고 실패하면 기존 build로 복귀한다. 노트북·Tunnel/DNS·계정 설정은 변경하지 않는다.
5. 반영 후 외부 HTTPS 보호·5크기 합성 시나리오·정적 자산의 정확한 path/hash와 로컬 build 파일을 대조한다. 실제 API/Auth는 전달하지 않고 공개 GET 문서/정적 파일만 확인한다.
6. 실행/복귀/판정·남은 범위를 새 HTML 보고서·QA·PR 이력·STATUS로 마감한다. 실행 앱 작업본에서는 반영 후 build/install/push hook을 돌리지 않는다.

## 게시 전 발견한 좁은 보완

합성 유효 상태에서 폴더 제안의 연결 transition이 공백을 정규화하거나 다른 문서의 참조 표기 `[X]`를 `[x]`로 바꾸는 사례를 재현했다. 직전 검사에서 이 예외를 덮었다고 주장하지 않는다. 제안의 현재 줄은 기존 serializer와 같은 형식에 한정하고 확정 결과의 모든 documents/flows 줄ID·text가 같지 않으면 적용 전에 거절한다. 직접 추가 메뉴의 기존 변환 동작·parser/vendor는 변경하지 않는다.

폴더100개·binding5,000개인 상태에서도 불가능한 제안이 보이는 경계를 함께 보완한다. 기존 모델 용량 규칙을 반영하는 것이며 용량 확대나 신규 정책 확정이 아니다. 보완 이후 새 source 동결값·검사 결과를 사용한다.

## 제외

main/기존 PR 병합, DB/Auth/migration·실제 계정 자료 수정, 설정/credential 복사·출력·수정, Tunnel/DNS/호스트 정책·자동 시작 변경, 신규5D 백업 활성화, Render/Vercel/Production·유료 서비스 변경, 다른 작업본 dirty/미추적 파일 수정·정리·게시, 실제 기기·OS IME·AT·관찰 사용자 시험.

하위 목록 전체의 폴더 전환·J13 제작→개인 실행 인계 새 end-to-end·Flow/Map 전수 충실도·복합 일정·공개 운영·장시간 탭 후속은 유지하며 이번 반영 선행으로 붙이지 않는다. 새 피드백 delta0/#20 실제 환경 미확인/#2 필터 정정은 그대로 보존한다.
