# URL-to-Flow 모델 비교 프로토콜 v1

## 비교 목적

동일한 원문 패킷에서 저비용 모델 등급과 고비용 모델 등급이 SourceRow 충실도, 올바른 보류, 구조 선택, 편집 부담에서 얼마나 다른지 본다. 이 세션은 외부 LLM API 과금·토큰 계측을 제공하지 않으므로 실제 원화 비용은 주장하지 않는다. 모델 등급, 출력 크기, 실행 시간, 사람이 고쳐야 할 필드 수를 비용 대리값으로 기록한다.

## 고정 입력

`deep-set-v1.json`의 다음 6개 사례만 사용한다.

1. `DS01` 농사로 온열질환 — 반복·안전·작업중지
2. `DS02` 오늘의집 계약 — 비교·권리·법률 위험
3. `DS03` Maily 아이디어 시스템 — 구독 잠금·올바른 보류
4. `DS05` 생활법령 이사 — 기준일 역산
5. `DS10` OSSU — 공개 라이선스·resource queue·자연 구간
6. `DS11` Wikivoyage — 공개 라이선스·source rows·현지화

입력으로 허용되는 필드는 각 사례의 `caseId`, `candidateId`, `sourceSnapshot`, `classification`, `sourceRows`, `gate`이다. 기준 답안인 `canonicalPackage`와 `review`는 모델에게 보여주지 않는다.

## 동일 프롬프트

당신은 URL 원문을 FlowMe 실행 콘텐츠로 바꾸는 변환기다. 입력에는 이미 확인된 SourceRow와 접근·권리·위험 gate가 있다. 다음 원칙을 지켜 6개 사례를 JSON 하나로 반환하라.

- 한 원문 → 한 사용자 job → 한 자연스러운 artifact → 최소 실행 UI.
- SourceRow에 없는 행동, 날짜, 사실, 반복 주기, 전문 판단을 만들지 않는다.
- Item은 상태를 바꿀 수 있는 최소 실행 단위이며 사례당 1~7개다.
- 모든 Item은 하나 이상의 `sourceRowRefs`와 관찰 가능한 `completionCriterion`을 가진다.
- 모든 SourceRow는 Item에 반영하거나 `unmappedSourceRows`에 이유와 함께 남긴다.
- 권리·위험 gate는 우회하지 않는다. 공개 불가면 내부 초안으로 잠근다.
- 원문이 불완전하면 완결 Flow를 꾸며내지 말고 `source_import_required`로 보류한다.
- 날짜는 원문 절대 날짜 또는 사용자가 제공할 anchor만 쓴다.
- ICS, checklist, sheet, memo는 canonical Item의 projection이지 원천 구조가 아니다.

반환 스키마:

```json
{
  "cases": [
    {
      "caseId": "DS01",
      "decision": "ready_internal | review_locked | source_import_required | reject",
      "reason": "짧은 근거",
      "artifact": "calendar | checklist | todo | sheet | memo | hybrid | none",
      "title": "Flow 제목 또는 null",
      "items": [
        {
          "title": "행동 제목",
          "sourceRowRefs": ["DS01-R01"],
          "completionCriterion": "완료 판단"
        }
      ],
      "unmappedSourceRows": [
        {"id": "DS01-R09", "reason": "이유"}
      ],
      "projection": "짧은 설명",
      "warnings": ["경고"]
    }
  ]
}
```

JSON 이외의 설명은 반환하지 않는다.

## 블라인드 채점

각 사례 100점:

- SourceRow accounting 25
- invented fact/date/action 0건 25
- gate/disposition 정답 20
- 자연 artifact와 1~7 Item 구조 15
- 완료 기준·projection 실행성 10
- 위험·권리 경고 보존 5

중대 감점:

- 불완전 원문을 완결 Flow로 생성: 해당 사례 최대 40점
- 권리 잠금을 공개 가능으로 변경: 해당 사례 최대 40점
- 안전·법률·입국 판단을 새로 생성: 해당 사례 최대 30점

## 비용 기록 경계

- `modelTier`: 실제 실행한 모델 등급
- `wallTimeSeconds`: 작업 발송부터 결과 수신까지의 경과 시간
- `outputCharacters`: 원문 결과 길이
- `estimatedTokens`: 공백 포함 문자 수를 4로 나눈 참고치; 청구 토큰이 아님
- `apiCurrencyCost`: `not_exposed_in_session`
- `repairFields`: 기준 계약에 맞추기 위해 사람이 수정해야 하는 필드 수
- `repairMinutesEstimate`: 동일한 수정 규칙으로 계산한 편집 시간 추정치

이 수치는 실제 API 벤치마크나 사용자 검증이 아니라 백엔드 실험 설계를 위한 사전 비교다.
