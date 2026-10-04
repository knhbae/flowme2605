# 개인 문서 메모·날짜 사용 흐름 개선

2026-10-04. 사용자 ‘목표잡고 진행 고고’ 승인 범위. 직전 핵심 여정 CP2를 보존한 격리 후보다. 현재 목적은 UX·사용성 개선이며 사람 대상 사용 시험은 보류한다.

## 목표와 범위

PC01 메모 이어쓰기와 PC02 날짜 구획·개별 날짜·이동의 현행 의미를 v4.1·개발1·개발2 및 직접 피드백과 대조한다. 현행 동작을 실제로 조작할 수 있는 HTML과 제안 비교를 만들고, 새 제품 정책이 필요 없는 좁은 UX 개선을 구현·검증한다. PC03 이동/복제/반복, PC04 예정일/due는 의미 충돌을 확인하는 비교 사례이며 전체 구현 대상이 아니다.

일반 문장을 Item이나 메모 속성으로 자동 승격하지 않는다. 같은 Item의 원문·날짜·시간·메모·소속·완료·기록·Undo와 기존 writer/schema를 보존한다. 반복 메모 속성 Enter 및 날짜 이동 보호를 이미 구현되지 않은 기능으로 보고하지 않는다.

## 기준선과 권한

- 작업본: `D:/flowme2605/flow-personal-memo-date-20261004`, 시작 HEAD `58df6bff7c1de4af6c88b38ce15a78bf355fa5f6`. 최신 origin/main `efd8b642707b5c8e67b727f23169ae41c43cb5e8`의 25개 후속 commit인 CP2가 기준이다.
- 현재 개발계 `D:/flowme2605/flow-ux-comparison-gaps-20261002`는 정확 빌드 제공용으로 동결한다. 해당 소스·빌드·프로세스·운영 manifest를 변경하지 않는다.
- 원본 `D:/flowme2605/flow-mvp`의 dirty/untracked는 미소유이며 읽기만 한다.
- 앱 관리형 worktree 생성은 workspace root가 Git 저장소가 아니라 실패했다. 일반 Git의 별도 clean detached worktree를 만들었으며 관리형 attachment는 불가했다. 사용자 파일을 복사하거나 reset하지 않았다.
- 새 commit/push/PR/CI·개발계 교체는 후보 검증 뒤 별도 승인 범위다. main merge·Production·DB/Auth/DNS/Tunnel·실제 계정 writer 변경은 제외한다.

## 정본과 근거

- [직전 대표 요구 및 PC01~06](../2026-10-02-alpha-ux-comparison-gaps/requirements.md)
- [세 원천 연결](../2026-10-03-alpha-core-journeys-ready/requirements-delta.md)
- [v4.1 요구](../2026-09-05-flowme-integrated-poc-ux-audit-v1/v41-audit.md), [개발1](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d1-audit.md), [개발2](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d2-audit.md)
- 직접 피드백은 원본 worktree의 `docs/content-audit/2026-09-28-flowme-use-feedback-session-ko.md` 16·22~25 및 별도 dots 일정/자유 편집 README. 사람의 관찰·dots 관찰·현재 코드·제안을 따로 기록한다.
- 직전 CP2 개발계 완료는 제공본의 `.tmp/manual-core-journeys-release-20261003/execution-state.public.json` 및 10/4 마감 보고서다. tracked 문서의 교체 전 미완료 문구를 현재 새 결함으로 세지 않는다.

## 완료 기준

1. 각 핵심 시나리오가 원 요구/피드백→현재 함수/테스트→충족·갭·미결→후보 변경으로 이어진다.
2. HTML은 서버 없이 열리고 실제 입력·날짜 이동·Undo·취소를 조작한다. 현행과 제안을 구분하고, 계정·서버·기존 localStorage에는 쓰지 않는다.
3. 좁은 제품 변경은 기존 의미·transaction owner를 사용하며 정책 미결 기능은 구현하지 않는다.
4. 모델·컴포넌트·기존 회귀, npm test, production build와 해당 브라우저/HTML 시나리오를 비례하게 실행하고 실제 수를 기록한다.
5. 390×844·375×812·844×390·1024×768·1440×900의 넘침·오류·핵심 행동 가림을 확인한다. 실제 기기/IME/보조기술과 사람의 관찰 검증은 별도 NOT_RUN이다.
6. 결과·남은 결정·후속·게시/반영 상태를 나눈다. 새로운 문법/데이터 의미/영구 정책이 필요한 변경은 선택지와 영향만 제시하고 그 부분의 구현 승인을 기다린다.

## 제외

폴더 정책 전체·공개 소유자 부분채택·전체 Flow/Map 편집·대형 백업·실사용 시험·반복 생성·독립 due schema·과거 자료 migration·외부 연구/서비스 가입·배포는 제외한다. 필요한 경우 해당 항목만 후속으로 연결한다.
