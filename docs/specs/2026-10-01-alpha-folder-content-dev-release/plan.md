# 단계별 계획

| 단계 | 진행 작업 | 완료 근거 |
| --- | --- | --- |
| 1 기준·소유 | 현재 Git·live build·피드백·PR206·자동 배포 연결 확인 | 명시 allowlist·보호hash·독립 검토 |
| 2 게시 준비 | 제품/테스트/HTML/문서 diff·출처/보안·비공개 경계 | hook 우회0·검사/실행 수·금지 경로0 |
| 3 게시·CI | 별도 branch commit/push·stacked Draft PR·비공개 CI 승인 | 정확한head·필수4결과·자동 배포0 |
| 4 마지막 build 검사 | source/build/commit 결합·합성 로컬5크기 | 폴더/Flow45·기존핵심·자산manifest |
| 5 개발계 반영 | 이전 PID 소유 확인·기존앱만 교체·외부5크기/HTTPS | 실행 build·외부/로컬 자산 일치·자료/설정 불변 |
| 6 마감 | 별도 깨끗한 문서 게시본·보고서·QA/복귀 절차 | 실행앱 build/install0·최종head CI·상태 분리 |

원본 증거는 로컬 output에 보존하고 요약만 게시한다. 검사 환경 부족/도구 오류는 제품 결함과 분리한다. 새로운 제품 문제가 확인되면 최소 수정과 그 영향 범위만 검증하며 unrelated 정책/공개/백업 작업을 추가하지 않는다.
