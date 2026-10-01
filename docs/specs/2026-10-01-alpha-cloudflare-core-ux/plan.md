# 실행 계획

1. 현재 source/build·포트·호스팅과 백업 off 계약을 읽기 조사하고 미소유 원본을 보호한다.
2. 905 기반 clean worktree에 Cloudflare 호스트 계약과 off-only 실행기를 새로 작성한다. legacy 백업의 활성 안전장치도 독립적으로 구현한다.
3. 순수 모델/호스트/백업 표적 검사, 전체 자동 검사, production build를 실행한다. 독립 검토로 ownership·입력/계정·secret·origin 경계를 확인한다.
4. 격리 QA 서버와 실제 production bundle을 브라우저로 검사한다. 합성 fixture가 모든 account/API 쓰기를 차단함을 확인한다.
5. rollback 준비와 현재 포트 소유권을 다시 확인하고 승인된 앱만 교체한다. 외부 HTTPS와 후보 build를 검사한다.
6. 실제 실행 수, 반영 경계, rollback, 미실행과 남은 작업을 [QA](./qa.md)에 기록하고 목표를 마감한다.
