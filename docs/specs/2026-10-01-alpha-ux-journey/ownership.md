# 소유·반영 경계

이번 작업은 처음 깨끗한 `D:/flowme2605/flow-ux-journey-20261001`의 `agent/flow-ux-journey-20261001`에서 시작했다. 기준 HEAD는 `1eb9be68835b71d234995e932d791b4058571fd5`다. 별도 사용자/UX worktree의 dirty·미추적 파일은 수정·복사·정리·stage·게시하지 않았다.

## 제품 변경

- [AlphaWorkspace CSS](../../../components/flow/integrated-poc/AlphaWorkspace.module.css): 관리 도구 강제 별도 행과 모바일 간격 축소.
- [ProgramTextEditor](../../../components/flow/integrated-poc/ProgramTextEditor.tsx) / [CSS](../../../components/flow/integrated-poc/ProgramTextEditor.module.css): 보조 도구 disclosure·대상 제목·기존 native source focus 등록.
- [ProgramSpace](../../../components/flow/integrated-poc/ProgramSpace.tsx): Alpha에서 retained editor의 정확한 원문 복귀. App checkpoint 복원과 분리.

ProgramApp·writer·API·Auth·schema·날짜/폴더/순서 전이·프로덕션 설정·기본 `/my`는 변경하지 않았다. 신규 route·권한 정책은 없다.

## 검사·근거

- Alpha layout, 두 journey 컴포넌트 검사, 기존 writing-navigation/writing-position 검사, Cloudflare host test의 타입 선언.
- 기존 cloudflare-release 브라우저의 toolbar 상태 선택자, 합성 접힘 fixture, 신규 ux-journey 브라우저와 설정.
- 독립 A/B HTML·요구/제안 처리/계획/QA·검토 보고서, 전용 서버와 검사 스크립트, STATUS/specs 색인.

현재 결과·실제 실행수와 로컬 원본 근거는 [QA](qa.md)를 따른다. `output/`의 로그·trace·PNG·상태 JSON은 로컬 검사 근거이며 공개 파일로 stage하지 않았다. 실제 계정 정보는 시험 입력이나 산출물에 사용하지 않았다.

## 반영 상태

commit 0 · push 0 · PR 0 · merge 0 · Preview 0 · Production 0 · Cloudflare 개발계 교체 0 · 원격 DB/Auth/설정 변경 0 · 관찰 사용자 0.

현재 공개 앱과 Tunnel은 기존 작업본에서 그대로 실행한다. 이번 구현은 격리 작업본 후보이며 공개 주소에서 새 기능이 보인다고 안내하지 않는다. 결과를 비교한 뒤 반영하려면 최종 고정 소스 전체 통합 검사와 별도 반영 승인이 필요하다.
