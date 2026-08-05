# Claude Design Pass 1 — blind static IA/visual/copy review

## 세션 조건

이 프롬프트를 **새 Claude Design 세션**의 첫 요청으로 사용하세요. inherited context, 메모리, 이전 대화, 다른 reviewer 결과를 사용하지 마세요. coordinator가 직접 제공한 이 prompt의 commit-pinned B URL, 게시 확정 단계에서 함께 생성되는 S17 제외 static evidence allowlist의 commit-pinned B URL, 그리고 두 문서가 직접 연결한 자료만 입력입니다. 공통 README나 Codex allowlist를 탐색하지 마세요. 조건을 지킬 수 없으면 `BLIND_CONTAMINATED`로 중단하세요.

## 접근 한계

Claude Design은 로컬 경로, localhost, terminal, source checkout, localStorage에 접근할 수 없습니다. coordinator가 제공한 불변 GitHub URL과 정적 evidence만 사용하세요. allowlist 행이 `TBD`/`NOT_RUNNABLE`이거나 링크가 열리지 않거나 SHA가 manifest와 다르면 해당 scenario를 `BLOCKED_BY_MISSING_EVIDENCE`로 두세요. 허용되지 않은 자료나 추정으로 채우지 마세요.

## 역할

당신은 FlowMe P35 Round 2의 독립 information architecture·visual hierarchy·interaction·copy 검토자입니다. 화면을 다시 그리는 것이 첫 임무가 아닙니다. 상태, 주 행동, 결과, 다음 단계가 정적 evidence만으로도 일관되게 읽히는지 반례를 찾으세요.

## storyboard evidence 계약

각 scenario의 정적 evidence는 다음 순서를 지켜야 합니다.

1. 시작 상태의 **전체 화면**
2. disclosure가 있다면 closed 상태 전체 화면
3. 같은 disclosure의 open 상태 전체 화면
4. 핵심 action 직전 전체 화면
5. action 직후 전체 화면
6. 최종/오류/복구 상태 전체 화면
7. 결과가 있는 경우 artifact preview HTML
8. 같은 결과의 raw 파일, MIME/transport, byte length, SHA-256 및 receipt 요약

crop은 보조 증거일 뿐이며 전체 화면을 대신할 수 없습니다. 정적 evidence로 storage·persistence·파일 동일성을 확인할 수 없으면 finding에 `CODEX_VERIFICATION_REQUEST`를 넣고 다음을 정확히 요청하세요.

```md
- scenario:
- claim needing runtime verification:
- exact action sequence:
- expected storage/artifact observation:
- required raw evidence:
```

S17은 Claude Design에서 `NOT_RUN — CODEX_ONLY`입니다. 이 scenario의 정적 비교 자료를 요구하거나 점수에 넣지 마세요.

실제 브라우저 200% zoom도 `NOT_ASSESSED`입니다. 제공된 720×500 reflow proxy는 viewport 재배치만 검토하고 실제 zoom 증거라고 해석하지 않으며, 이 하위 항목만 `NOT_RUN`으로 둡니다.

## 검토 순서

1. [중립 brief](./01-neutral-review-brief-ko.md), [시나리오 matrix](./04-neutral-scenario-matrix-ko.md), [evidence contract](./05-evidence-contract-ko.md), [scorecard](./06-scorecard-ko.md)를 읽습니다.
2. 각 첫 viewport를 5초 동안 보고 화면 종류, 현재 상태, 주 행동, 결과, 다음 단계를 기록합니다.
3. visible control, card, badge, heading, helper, status label을 inventory하고 다음 행동·오류 예방·필수 상태·복구 중 어느 것도 담당하지 않는 요소를 표시합니다.
4. public, saved, Item, result 상태의 시각 문법과 action 위치가 mutation scope에 맞게 일관되는지 확인합니다.
5. mobile/desktop의 정보 순서, bottom action, overlay, modal, focus target, overflow를 비교합니다.
6. help·condition·risk가 closed와 open 상태에서 각각 발견 가능하고 내용 우선순위가 맞는지 확인합니다.
7. 한 계획의 여러 결과가 별도 콘텐츠처럼 오해되지 않는지, 지원되지 않는 결과가 지원되는 것처럼 보이지 않는지 확인합니다.
8. empty/error/archive/retry 상태에서 복구 행동이 명확한지 확인합니다.
9. accessible name, focus order, target size, contrast는 증거로 확인 가능한 범위만 판정합니다.
10. S23에서 자유 탐색을 수행하고 matrix 밖의 root-cause 후보를 찾습니다.

## 반증 의무

최소 다섯 scenario에서 다음 중 하나를 깨뜨리려 시도하세요.

- 화면 종류와 저장 상태를 label 없이도 구분할 수 있다.
- primary action은 하나이고 보조 행동과 경쟁하지 않는다.
- CTA label만 보고 mutation과 다음 결과를 예측할 수 있다.
- Item과 plan의 편집·완료 범위가 시각적으로 구분된다.
- 결과 형식 선택이 plan 편집과 경쟁하지 않는다.
- material risk가 disclosure를 열기 전에도 최소한 존재를 알 수 있다.
- 모바일과 데스크톱이 같은 우선순위를 유지한다.

## finding 형식

```md
## CD-001 — 짧고 검증 가능한 제목

- severity: BLOCKING | HIGH | MEDIUM | LOW
- status: REPRODUCED | NOT_REPRODUCED | NOT_RUN | NEEDS_CODEX_VERIFICATION
- scenario / route / state / viewport:
- user task:
- observed fact:
- expected invariant:
- evidence IDs:
- hierarchy / interaction consequence:
- counterexample tested:
- CODEX_VERIFICATION_REQUEST: none | attached
- smallest correction boundary:
- not proven:
```

## 산출물

- `claude-pass1-findings.md`
- `claude-pass1-scorecard.md`
- `claude-counterevidence-log.md`
- `claude-pass1-freeze.json`

freeze에는 모든 입력·출력 URL과 SHA-256, 시작/종료 KST, contamination 상태 및 `PASS1_FROZEN` marker를 넣으세요. 제품을 수정하거나 배포했다고 표현하지 마세요.

Claude Design은 로컬 파일을 직접 저장할 수 없으므로 네 산출물을 각각 다운로드 가능한 파일 또는 한 개의 archive로 반환하세요. coordinator가 이를 제품 repository와 blind publication 밖의 external review output 영역에 보관합니다.
