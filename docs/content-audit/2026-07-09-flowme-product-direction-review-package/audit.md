# FlowMe P17-00 Product Direction Audit

## Purpose

P1~P16 동안 FlowMe는 4탭 IA, URL-first, public share 저장, My Flow 실행 허브, Calendar 실행 화면, creator/studio tier, internal/prototype guardrail을 계속 정리했다. 이번 P17-00은 더 많은 UI polish를 바로 진행하기 전에, 제품 방향 자체를 다시 보는 intake package다.

## Current Product Hypothesis

FlowMe는 당분간 "URL/메모를 실행 가능한 Flow로 바꾸고, My Flow와 Calendar로 이어주는 개인 실행 도구"로 판단한다. Studio/creator는 5번째 탭이 아니라 보조 표면이다.

## User Feedback Reflected

- 전체 흐름 `/` -> `/flows` -> `/my` -> `/calendar`는 이해된다.
- Calendar에서 다른 Flow가 색상/라벨로 충분히 구분되지 않는다. 동일 날짜에 여러 항목이 있을 때 판단이 어렵다.
- URL-first hit는 가치가 보인다. 다만 Step 제외보다 더 높은 item/event 수준 편집 자유도가 장기적으로 필요할 수 있다.
- URL-first miss는 요청 저장만으로 끝나기보다 AI 초안 만들기와 사용자 수정 흐름이 필요해 보인다.
- public `/f`는 Flow 단위 저장과 Step 단위 export/save 책임이 아직 모호하다.
- My Flow는 기능은 있으나 오늘 할 일을 확인/체크하기까지 depth가 깊어 보인다.
- Calendar는 콘텐츠 종류별 핵심 실행 화면이 될 수 있지만 현재는 부족하다.
- Studio는 지금 키울지, 기본 실행 화면을 먼저 다듬을지 결정해야 한다.

## Scenario Audit

### 처음 온 사용자

- Routes: `/`, `/flows`, `/my`, `/calendar`
- 판단 질문: URL/메모를 실행 가능한 Flow로 바꾸고 My Flow/Calendar로 이어지는 제품 문장이 즉시 읽히는가.
- 사용자 피드백: 첫 흐름은 이해되지만 Calendar에서 Flow 구분이 약하고 일정 라벨이 일반적이라는 피드백이 있었다.
- Evidence screenshots: `01-home-mobile`, `02-flows-mobile`, `pd-calendar-empty-mobile`, `32-home-wide`, `33-flows-wide`

### URL-first hit 사용자

- Routes: `/flows`
- 판단 질문: 이미 준비된 Flow를 찾고 시작하는 가치가 AI 데모가 아니라 실제 실행 시작으로 보이는가.
- 사용자 피드백: hit 자체는 잘 작동한다. 다만 Step 제외보다 더 높은 수정 자유도가 장기적으로 필요해 보인다.
- Evidence screenshots: `27-url-first-hit-mobile`, `28-url-first-custom-start-mobile`, `37-url-first-hit-wide`

### URL-first miss/candidate 사용자

- Routes: `/flows`
- 판단 질문: 준비된 Flow가 없을 때 요청 저장만으로 충분한가, AI 초안 만들기 흐름이 필요한가.
- 사용자 피드백: miss에서는 AI가 초안을 만들고 사용자가 손보는 과정이 필요해 보인다는 피드백이 있었다.
- Evidence screenshots: `29-url-first-miss-candidate-form-mobile`, `30-url-first-candidate-detail-mobile`, `pd-url-first-resolved-candidate-mobile`, `38-url-first-candidate-detail-wide`

### public /f 공유 진입 사용자

- Routes: `/f/vehicle-inspection-prep`, `/f/moving-d30-basic`
- 판단 질문: 공유받은 사용자가 Flow 단위 저장과 Step 단위 export를 혼동하지 않고 주 행동을 고를 수 있는가.
- 사용자 피드백: 현재 export가 Step 단위처럼 보이며 Flow 단위 저장/export와 Step 단위 export 책임을 다시 고민해야 한다.
- Evidence screenshots: `06-public-vehicle-mobile`, `pd-public-vehicle-export-mobile`, `pd-public-vehicle-bottom-mobile`, `07-public-moving-mobile`, `pd-public-moving-export-mobile`, `08-public-moving-bottom-mobile`, `35-public-vehicle-wide`

### My Flow 반복 사용자

- Routes: `/my?savedMap=moving-d30`, `/my?savedMap=middle-school-math-1`, `/my`
- 판단 질문: 저장 완료, 다음 할 일, 지난/오늘/다음 상태, 열기/체크가 설명보다 먼저 보이는가.
- 사용자 피드백: 기능은 있으나 오늘 할 일을 확인하고 체크하기까지 depth가 깊어 실서비스 느낌이 약하다는 피드백이 있었다.
- Evidence screenshots: `13-post-save-my-moving-mobile`, `15-post-save-my-math-mobile`, `16-my-multi-queue-mobile`, `pd-my-today-detail-mobile`, `18-my-long-list-top-mobile`, `36-post-save-my-moving-wide`

### Calendar-heavy 사용자

- Routes: `/calendar`
- 판단 질문: Calendar가 보관된 데이터가 아니라 오늘/선택일 실행 화면으로 보이고, 여러 Flow/동일 날짜가 구분되는가.
- 사용자 피드백: Calendar는 핵심 실행 화면인데 콘텐츠 종류와 동일 날짜 항목 구분이 부족하다는 피드백이 있었다.
- Evidence screenshots: `pd-calendar-empty-mobile`, `14-calendar-after-moving-save-mobile`, `pd-calendar-multi-flow-mobile`, `pd-calendar-multi-flow-wide`

### Creator / Studio 방향

- Routes: `/u/flow-curation-team`, `/u/my-flow-studio`, `/flow-lab/url-first-p0`, `/restart/moving-d30`
- 판단 질문: Studio/creator를 지금 키울 핵심 축으로 볼지, 개인 실행 도구의 보조 표면으로 둘지 판단한다.
- 사용자 피드백: Studio를 개념만 먼저 볼지, Calendar/My Flow/public export 같은 기본 실행면을 먼저 고칠지 결정이 필요하다.
- Evidence screenshots: `39-creator-profile-my-flow-studio-mobile`, `40-creator-profile-my-flow-studio-wide`, `41-creator-profile-flow-curation-team-mobile`, `42-creator-profile-flow-curation-team-wide`, `31-flow-lab-url-first-p0-mobile`, `21-restart-moving-top-mobile`


## Baseline Guardrails Kept

- Normal route internal/source/raw ISO guardrail hits remain 0.
- URL-first visible Markdown and export-mode Markdown hits remain 0.
- Candidate user copy output internal hits remain 0.
- Candidate card legacy status hits remain 0.
- Creator profile guardrail hits remain 0.
- `/flow-lab/url-first-p0` remains internal-console with user nav links 0.
- `/restart/moving-d30` remains release-preview with display-gate hits 0.
- Calendar/My Flow group repeated timing meta rows remain 0.

## What Claude Design Should Decide

1. P17의 첫 구현 slice를 Calendar 구분/실행성으로 잡을지.
2. My Flow 오늘 할 일 depth 축소를 Calendar보다 먼저 볼지.
3. public `/f`의 Flow-level save/export와 Step-level export 단위를 어떻게 나눌지.
4. URL-first miss AI draft와 hit item/event editing을 언제 spec으로 승격할지.
5. Studio/creator를 보조 표면으로 유지할지, creator platform 축으로 키울지.

## Evidence Limits

이 패키지는 localStorage fixture와 screenshot/evidence 기반이다. 실제 사용자 행동 데이터나 서버 계정 상태 검증은 아니다. Calendar 색/구분, My Flow 체크 depth, public export 단위 같은 문제는 Claude Design 평가 이후 별도 구현 목표로 분리해야 한다.
