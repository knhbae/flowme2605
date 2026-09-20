# K3-B — 편집 journal v2/v3 복구 경로

2026-09-05. S의 `journalFamily`는 version1만 editor로 분류한다. E2가 만든 유효한 raw Plan v2/source-bound Plan v3는 `unknown`이 되어 app의 `routeWorkspaceRecovery`에서 E2 복구 화면으로 전달되지 않는다. 새 저장 모델의 연결 결함이며 기존 HTML B14A의 실패라고 소급하지 않는다.

S는 version2의 `flowme-standalone-personal-plan-draft-v1`, version3의 `flowme-standalone-source-bound-personal-plan-draft-v1`와 고정 workspace target을 확인해 editor로 분류한다. 이 분류는 담당 decoder를 고르는 힌트다. 기록의 유효성이나 복구·삭제 권한을 발급하지 않는다. 실제 E2 `loadRecovery`가 정확 필드·snapshot·before/baseline/draft/candidate 재도출을 계속 검사한다.

기존 version1 분류와 action contract 분기는 유지한다. 알 수 없는 버전·계약·외부 target은 unknown이다. 알려진 계약의 손상 기록은 E2가 읽기 전용 blocked로 판정한다. S workspace는 모든 pending journal에서 계속 blocked이며 workspace 쓰기·reset·영구 삭제 preparation은 허용하지 않는다. source snapshot이 남아 있는 상태를 삭제 완료로 표시하지 않는다.

실제 E2 생성 v2/v3의 prepared/confirmed, 손상·외부 계약, pending 작업 잠금과 정상 cleanup 후 재개를 memory storage에서 먼저 검사한다. 자동 load의 쓰기0, source/운영 sentinel bytes 불변, 실제 API 호출을 분리해 기록한다. app 화면·file URL·실기기 검증은 별도다. 새 key·writer·TTL·자동 정리·제품 정책·배포 변경은 없다.
