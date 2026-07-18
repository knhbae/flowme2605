# FlowMe Save -> Personalize -> Execute Journey Review

**Date:** 2026-07-18
**Status:** P24-J0 planning gate; app code unchanged
**Primary spec:** [Save, Personalize, Execute Journey Reset](../../specs/2026-07-18-save-personalize-execute-journey-reset/spec.md)

## Verdict

현재 문제는 긴 문구 몇 개가 아니라 저장 전 판단, 개인화, 저장 직후 확인, 일상 실행 화면이 서로 어긋난 **journey-frame 문제**다. 그렇다고 4탭 IA나 데이터 모델을 전면 재작성할 근거도 없다.

권장 방향은 다음과 같다.

> 4탭과 현재 execution/export 계약은 유지하고, `artifact-first preview -> optional lightweight adjust -> post-save full artifact -> returning Today -> dated Calendar`만 bounded reset한다.

기존 P24-00B 15세션 관찰은 바로 진행하지 않는다. 먼저 P24-J0 대안 와이어프레임과 2개의 짧은 prototype test로 화면 프레임을 선택한 뒤 P24-J1부터 구현한다. 이 보류는 사용자 검증을 포기하는 것이 아니라, 잘못된 프레임을 긴 관찰 프로토콜로 측정하지 않기 위한 순서 조정이다.

## Why This Review Exists

Owner feedback에서 다음 문제가 반복됐다.

- moving/public 화면의 설명이 실행 화면보다 강하다.
- 저장 직후 전체 Flow가 아니라 오늘 항목만 보여 저장 결과를 확인하기 어렵다.
- 전체 저장과 저장 전 조정 중 어느 흐름이 맞는지 불명확하다.
- My Flow 범위 선택과 Calendar의 날짜 없는 목록이 역할상 어색하다.
- 실행 보류 콘텐츠가 ordinary execution inventory에 섞인다.
- vehicle public journey는 기본 구조는 괜찮지만 여전히 길다.

## Existing Simulation Crosswalk

[2026-07-14 콘텐츠 편집·실행 시뮬레이션](../2026-07-14-flowme-content-edit-execution-simulation-ko.html)은 이미 다음 방향을 제안했다.

- Step 03: 저장 전 전체 5개 Step 확인
- Step 04: `그대로 시작`과 `조금 고쳐 시작` 비교
- Step 05: 시작 전 이름·기준일·포함 항목 조정
- Step 06: 저장 성공 문구가 아니라 실제 실행 목록 표시
- Step 07~10: 저장 후 전체/개별 수정과 projection 일치

현재 production은 이 계약의 일부 기능을 구현했지만, 첫 화면과 post-save landing이 그 계약을 충분히 보여주지 않는다. 따라서 새 기능 발명이 아니라 기존 방향과 현재 화면을 다시 연결하는 작업이다.

## Package

- [audit.md](./audit.md): current-state findings와 제품 판단
- [review.html](./review.html): current 화면과 검증할 journey-frame 가설을 나란히 보는 한국어 보드
- [reference-patterns.md](./reference-patterns.md): 인접 서비스에서 가져올 패턴과 가져오지 않을 것
- [backlog.md](./backlog.md): P24-J0~J5 단계와 gate
- [journey-evidence.json](./journey-evidence.json): current/prior/reference evidence 구분
- [prompt-ko.md](./prompt-ko.md): 다음 P24-J0 실행용 복붙 prompt
- `screenshots/`: current production과 Claude Design reference captures

## What Has Not Been Done

- production app code 수정 없음
- proposed wireframe의 owner approval 없음
- prototype participant session 없음
- P24-J1 implementation 없음
- structured observed-user session은 여전히 `0 / 15`
