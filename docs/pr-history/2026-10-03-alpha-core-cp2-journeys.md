# PR210 — 개인 실행·공개 활용·초안 복귀 연결

- Date: 2026-10-03
- Branch: `agent/ux-comparison-gaps-20261002`
- Base: `agent/alpha-core-journeys-cp1-20261003`
- PR: https://github.com/knhbae/flowme2605/pull/210
- Status: `Draft`
- 최초 제품 commit: `527814b69cbe719a85cce036c241d29706a82ea1`
- 최초 postcommit build: `xzyBRR06On2DVYqf11l8W`
- Deploy URL: 개발계 교체 미완료.

## Why

v4.1·개발1·개발2의 결과를 기능 목록만 합치지 않고 목적별 사용 여정으로 연결한다. 개인 작성/실행, 공개 자료 활용, 선택적 질문·기여를 의무 순서나 계정 모드로 강제하지 않는다.

## What Changed

CP1 위의30파일 차이로 개인 문서↔기간 실행↔원문 복귀, 필터·빈 결과, 초안의 실패 원인 해소·보관·복귀, 메뉴·계정 관리·복원 발견성, 공개 판본/사본/내 문서 복귀를 보완했다. 세 원천 요구 대조와 1~2명용 과제·피드백 양식을 추가했다. 게시 이력 후속은 문서만 변경한다.

## Not Done

새 HTTP 7시나리오×5크기=35개는 NOT_RUN이다. CI 전체 성공·CP2 개발계 교체/복귀·실기기/IME/AT·관찰 사용자0을 완료로 쓰지 않는다. PC01~06·대형5D/F6~F10·독립 HTML2·새 DB/Auth/schema/DNS/Tunnel·main merge/Production은 제외했다.

## Decisions

문서와 기간에서 같은 Item을 사용하고 일반 메모를 자동 승격하지 않는다. 실패 입력과 기준선을 보존하며 결과 불명과 확정 거절을 구분한다. 공개/개인 소유·선택 판본·원본/사본 계약은 유지한다. 제품 정책을 새로 확정하지 않았다.

## Files Touched

주요 파일은 AlphaWorkspace, ProgramSpace, ProgramDiscovery, ProgramCommunity, ProgramTextEditor, AlphaPreservationPanel과 관련 검사·HTTP scenario다. [manifest](../specs/2026-10-03-alpha-core-journeys-ready/manifest.md)가 정확 소유 범위이며 원본/설정·미소유 변경은 포함하지 않는다.

## Verification

- 최종 통합: 281파일/2,988실행/2,988PASS, fail/skip/cancel/todo0. CP1의2,960개와 합산하지 않는다.
- 표적 검사230/230 PASS, audit 취약점0·호환11/11 PASS, 타입581 entry/진단0.
- 최초 제품 commit의 정상 pre-push: 08:32:17.870~08:34:48.982 UTC, npm test2,258/2,258 PASS·docs4/4·build exit0·후크 우회0.
- exact proof: compile1,214/QA242/static82, drift0·root/head/build 일치. 이 증명은 후속 문서 commit의 head/build가 아니다. 그 판본도 정상 hook 뒤 새 증명을 만든다.
- source656 SHA `9e73afff6b9879535a6c5cc2fccd500497f724256af9f28c97f5f4164d467e22`·pack 전후 불변, 실제 자격정보 전달/설정 사본/raw 공개0.
- PR210을 실제 생성하고 현재 task에 연결했다. CI `37110241838`은 시작했으나 현재 전체 성공 근거가 아니다. 후속 commit의 새 CI와 혼용하지 않는다.

## Risks

공개 Git에는 코드·설계·테스트·요약만 포함한다. 비공개 출처 CI는 공개 저장소의 검토된 secret environment lane이며 저장소 전체가 private이라는 뜻이 아니다. 서버 기동 제한을 다른 도구/agent로 우회하지 않고 담당자의 정확 판본 Ready 이후 실제 화면과 자산을 검사한다.

## Follow-ups

최종 후속 판본의 정상 hook·exact proof·새 CI를 확인한 뒤 HTTP QA와 CP1→CP2 개발계 반영/복귀를 이어간다. 검증·동결된 CP1이 CP2의 복귀 대상이다. 접속·권한·자료 조건이 맞아야 시험 시작 가능으로 판정하며 실제 관찰 시험은 별도다.

## Links

[설계·QA 정본](../specs/2026-10-03-alpha-core-journeys-ready/spec.md) · [세 원천 대조](../specs/2026-10-03-alpha-core-journeys-ready/requirements-delta.md) · [시험 준비](../specs/2026-10-03-alpha-core-journeys-ready/trial-preparation.md) · [PR210](https://github.com/knhbae/flowme2605/pull/210)
