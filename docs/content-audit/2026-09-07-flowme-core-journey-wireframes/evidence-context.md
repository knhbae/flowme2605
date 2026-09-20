# 검토 당시 근거 보존 기록

2026-09-07 · 패키지만 옮겨도 읽을 수 있도록 남긴 요약. 최신 정책·개발 상태를 대신하는 정본은 아니다.

## 큰 방향

2026-09-06 방향 기록을 이 와이어프레임에 필요한 범위로 요약했다.

- 개인 텍스트 공간: 일정·할 일·메모를 자유롭게 적고 보관한다. Flow 변환·가져오기·공개 없이도 사용할 수 있어야 한다.
- 공유 지식: 경험을 Flow와 관련 지식으로 정리해 찾고 재사용하는 wiki형 공간을 지향한다.
- 참여: 질문·의견·개선 제안으로 경험을 나눈다. 개인 관리, 재사용·실행, 작성·공개, 기여, 탐색·참여는 목적별 검토 경로이지 계정 모드나 필수 순서가 아니다.
- export-first는 초기 구현·검증 우선순위다. 개인 공간이나 공유 지식·커뮤니티를 전체 방향에서 제외하는 규칙은 아니다.
- 선택적으로 공개한 Flow의 고정 버전은 개인 메모·날짜·완료·실행 이력과 분리한다. 개인 수정이 공개본을 자동으로 바꾸지 않는다.

실제 TXT 파일 저장·동기화, wiki 편집 권한, 공동 수정·실시간 협업, 커뮤니티 화면 형태는 이 방향만으로 확정하지 않는다. 이번 패키지의 줄 선택 연결·공개 첫 버튼 순서 역시 검토안이다.

원 기록: `D:/flowme2605/flow-mvp/docs/DECISIONS.md`의 `2026-09-06 - 큰 방향은 개인 텍스트 관리·공유 지식·참여를 함께 보존한다`, `2026-08-26 - 개인 Flow 사용과 선택적 공개는 한 사용자 경로를 쓴다`.

이전 보고서 식별 경로: `D:/flowme2605/flow-mvp/docs/content-audit/2026-09-06-flowme-vision-journey-gap-review-ko.html`. 이 패키지에서는 이전 보고서 전체를 복제하지 않고 위 방향 요약과 [기능 갭 대조](./implementation-map.md)를 제공한다.

## 개발3 대조 범위

[기능 갭 표](./implementation-map.md)는 2026-09-07에 코드와 진행 문서를 읽은 결과다. 개발 체크아웃 HEAD `6e4b44fe` 이후 미커밋 작업도 포함하므로 해당 커밋만으로 당시 소스를 완전히 재현할 수 있다는 뜻은 아니다. 제품 테스트·CI·배포 결과로 해석하지 않는다. 이 문서는 근거 경로와 해석 범위를 보존하며, 당시 전체 소스의 스냅샷은 아니다.

- 개발 체크아웃: `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901`
- 당시 진행 문서: `D:/flowme2605/flow-personal-workspace-v4-1-poc-20260901/docs/specs/2026-09-05-flowme-integrated-poc-gap-implementation-v1/progress.md`
- 표의 구성요소 경로 기준: 위 체크아웃의 `components/flow/personal-workspace-poc/`와 `lib/flow/`.

이 경로들은 기록용 텍스트이며 패키지의 실행·탐색 의존성이 아니다. 후속 구현 전에는 실제 체크아웃·미커밋 변경·진행 문서를 다시 확인한다. 기존 K4-A1 목표를 이 와이어프레임이 취소하거나 완료 처리하지 않는다.

## v4.1 기준 이미지

[보존 사본 열기](./reference-v4-1-desktop-month.png)

- 원 파일: `D:/flowme2605/flow-mvp/docs/content-audit/2026-09-01-flowme-personal-workspace-v4-1-assets/desktop-month.png`
- 이전 UI 식별 경로: `D:/flowme2605/flow-mvp/docs/content-audit/2026-09-01-flowme-personal-workspace-v4-1-ui-ko.html`
- 보존 방식: 원 파일을 수정하지 않고 이 패키지에 바이트 그대로 복사했다. 이전 UI 전체의 실행 사본이 아니라 시각 비교 기준 이미지다.
- 원본·사본 SHA-256: `1c9b296cfff66514e460e15eed0ad5bf4b25995540dc018d8167f97bcf6ec2c1`

이번 게시 준비는 링크와 근거 보존만 다룬다. 기존 미추적 보고서·개발 워크트리·정본 문서는 수정하지 않는다.
