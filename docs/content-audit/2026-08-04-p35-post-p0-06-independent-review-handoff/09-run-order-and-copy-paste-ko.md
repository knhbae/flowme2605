# 실행 순서와 복사해서 보낼 문구

## 0. 먼저 지킬 것

- Codex와 Claude Design을 동시에 또는 서로 결과를 보지 않는 순서로 시작한다.
- 1차는 패키지 작성·기획·이전 검토 맥락이 없는 새 Codex 세션과 새 Claude Design 대화에서 시작한다.
- 2차는 각자 자신의 1차 세션을 계속 쓰거나 자신의 잠긴 1차 결과만 새 세션에 첨부한다.
- 패키지 작성 세션·기획 세션·상대 검토 세션을 1차 또는 2차 검토자로 재사용하지 않는다.
- 한쪽 결과를 다른 쪽 프롬프트에 붙이지 않는다.
- 둘 다 끝난 뒤에만 기획 세션에서 종합한다.
- 이번 검토만으로 앱 코드나 Production을 바꾸지 않는다.

## 1. 1차 블라인드 검토

### 1-A. Codex에 보낼 문구

```text
이전 FlowMe 기획·UX 검토 맥락이 없는 새 Codex 세션입니다. D:\flowme2605\flow-p35-production-mobile-p0에서 아래 1차 블라인드 프롬프트만 읽고 근본 문제를 독립적으로 발견해줘.

docs/content-audit/2026-08-04-p35-post-p0-06-independent-review-handoff/05a-codex-blind-root-discovery-prompt-ko.md

이 단계에서는 00 해석 경계·README·01·02·03·04·05·07·두 JSON·승인 방향과 Claude 결과를 읽지 마. 00a 원문, 00b blind 증거, 실제 코드/runtime/storage/화면만 보고 결과를 작성하고 파일 SHA-256·고정 시각을 남겨줘. 구현·commit·push·deploy는 하지 말고 observed user는 0명으로 유지해줘.
```

### 1-B. Claude Design에 보낼 문구

아래 링크는 1차 패키지 commit에 고정되어 있다.

```text
이전 FlowMe 기획·디자인 검토 맥락이 없는 새 Claude Design 대화입니다. 아래 GitHub 1차 블라인드 프롬프트만 따라 FlowMe의 근본 UX/IA 문제를 독립적으로 발견해줘.

https://github.com/knhbae/flowme2605/blob/1e1d05720021553dabcd2badab91db751e70fcc3/docs/content-audit/2026-08-04-p35-post-p0-06-independent-review-handoff/06a-claude-design-blind-root-discovery-prompt-ko.md

이 단계에서는 00 해석 경계·README·01·02·03·04·05·06·07·두 JSON·승인 방향과 Codex 결과를 읽지 마. 00a 원문과 00b blind 증거만 사용해. Critical 입력이 열리지 않으면 누락을 알려주고 멈추고, Auxiliary 입력만 빠졌으면 PARTIAL_INPUT으로 계속해줘. 결과 파일명·고정 시각을 남기고 observed user는 0명, user understanding은 NOT_ASSESSED로 표시해줘.
```

## 2. 1차 결과를 잠그기

- Codex 결과 파일의 SHA-256과 생성 시각을 기록한다.
- Claude 반환물의 파일명·고정 시각과 가능하면 zip SHA-256을 기록한다.
- 어느 쪽도 아직 상대 결과를 보지 않는다.
- hash를 만들 수 없으면 이유를 기록하고 이후 단계는 `blind_independence = UNPROVEN`으로 표시한다.

Claude의 1차 반환물 예:

```text
D:\flowme2605\flow-mvp\claude_work\Claude 디자인 P0-06 이후 블라인드 검토_260804.zip
```

## 3. 2차 계약 반증 검토

### 3-A. Codex에 보낼 문구

```text
1차 blind 결과가 고정됐습니다. 이제 아래 2차 프롬프트로 기존 계약·승인 방향을 반증하고 S01~S13, D0~D6, U01~U10을 모두 검토해줘.

docs/content-audit/2026-08-04-p35-post-p0-06-independent-review-handoff/05-codex-local-post-p0-06-review-prompt-ko.md

1차 결과 hash를 입력 manifest에 적고, 1차 결론 중 유지·수정·기각된 것을 별도 delta로 남겨줘. Claude 결과는 아직 보지 마. 구현·commit·push·deploy는 하지 말고, 부족한 화면은 재현 정보·storage diff·manifest와 함께 캡처해줘.
```

### 3-B. Claude Design에 보낼 문구

아래 링크는 1차 패키지 commit에 고정되어 있다.

```text
1차 blind 결과가 고정됐습니다. 이제 아래 GitHub 2차 프롬프트로 기존 계약·승인 방향을 반증하고 S01~S13, D0~D6, U01~U10을 모두 검토해줘.

https://github.com/knhbae/flowme2605/blob/1e1d05720021553dabcd2badab91db751e70fcc3/docs/content-audit/2026-08-04-p35-post-p0-06-independent-review-handoff/06-claude-design-post-p0-06-review-prompt-ko.md

1차 결과 파일명·고정 시각·hash를 입력 manifest에 적고, 1차 결론 중 유지·수정·기각된 것을 별도 delta로 남겨줘. Codex 결과는 아직 보지 마. 제안 화면은 After가 아니라 Proposal로 표시하고, 화면 자료만으로 확인할 수 없는 runtime은 LOCAL_CONFIRMATION_REQUIRED로 남겨줘. observed user는 0명, user understanding은 NOT_ASSESSED로 유지해줘.
```

Claude의 최종 반환물 예:

```text
D:\flowme2605\flow-mvp\claude_work\Claude 디자인 P0-06 이후 2차 계약 반증 검토_260804.zip
```

## 4. 양쪽 결과가 끝났는지 확인

다음이 모두 있어야 다음 단계로 간다.

- Codex: 1차 hash·2차 delta, review manifest, D0~D6, S01~S13, U01~U10, 증거 index, verdict
- Claude: 1차 고정 정보·2차 delta, 입력 URL·commit, independence, D0~D6, S01~S13, U01~U10, Proposal 화면 명세, verdict
- 양쪽 모두 `observed_user_count: 0`
- 어느 쪽도 상대 결과를 먼저 보지 않았음

누락이 있으면 기획에서 대신 상상하지 말고 해당 검토자에게 보완을 요청한다.

## 5. 기획 세션에 보낼 문구

```text
Codex 로컬 독립 검토와 Claude Design 독립 검토가 모두 끝났습니다. 두 결과가 서로의 결론을 보기 전에 작성되었는지 먼저 확인하고, 아래 교차 종합 프롬프트로 현재 프로그램의 다음 gate를 정리해줘.

docs/content-audit/2026-08-04-p35-post-p0-06-independent-review-handoff/08-planning-reconciliation-prompt-ko.md

기획 세션: 019fac25-34bc-7ea1-9533-376776fac3c0

이번에는 코드 수정·commit·push·Vercel 배포를 하지 말고, 현재 구현·설계 coverage·사용자 이해를 분리해 U01~U10을 추적해줘. 결과는 KEEP_PROGRAM / BOUNDED_PROGRAM_DELTA / REOPEN_DECISION 중 하나로 끝내고, 다음 구현 단계와 acceptance를 한 가지로 고정해줘. Owner에게 물을 질문은 근거로 결정할 수 없는 것만 최대 3개로 제한해줘.
```

## 6. 그 다음에 할 일

기획 종합이 `KEEP_PROGRAM` 또는 `BOUNDED_PROGRAM_DELTA`로 닫힌 뒤에만 다음 미구현 단계부터 구현한다. 현재 순서는 P0-07 capability preview → P0-08 `/my` IA → P0-09 실제 옮기기·receipt다. `REOPEN_DECISION`이면 구현보다 Owner 결정을 먼저 받는다.

구현·QA가 끝나도 별도 승인 없이 commit·push·PR·Preview·Production 배포로 간주하지 않는다.
