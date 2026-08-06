# Two-pass isolation protocol

## 1. Release 구성

- Blind release: 중립 brief, Pass 1 reviewer별 prompt, scenario matrix, evidence contract, scorecard
- Informed release: 최신 원문, U01~U10 mapping, Pass 2 reviewer별 prompt, benchmark, prior archive manifest
- Coordinator: readiness, chain of custody, freeze, contamination, synthesis

Blind 파일에는 최신 진술, 제안 해법, 과거 결론, 과거 reviewer 결과, before/after 해설, default-vs-rollback screenshot 묶음을 넣지 않는다. S17 runtime rollback 검증은 Codex만 수행하고 Claude에는 `NOT_RUN — CODEX_ONLY`로 고정한다.

## 2. Pass 1

1. master manifest의 REQUIRED_GLOBAL을 채우고 hash한다.
2. clean product candidate와 build ID를 독립적으로 확인한다.
3. informed 파일이 존재하지 않는 물리적으로 분리된 blind-only tree에 capture/raw artifact를 asset commit A로 게시하고 `blind_evidence_publication_sha`를 고정한다.
4. A의 direct URL·bytes·hash를 채운 allowlist와 prompt를 index commit B로 게시한다. B의 SHA는 자기 tree 밖 coordinator launch record에 `blind_release_index_sha`로 고정한다.
5. Codex와 Claude Design에 각각 fresh session을 만든다. inherited context를 끈다.
6. 각자에게 B에 고정된 blind direct allowlist만 제공한다. 상위 폴더 링크는 주지 않는다.
7. 두 reviewer 결과를 서로 공개하지 않는다.
8. 결과 파일을 각각 hash하고 `PASS1_FROZEN`을 확인한다.

### Pass 1 freeze template

```json
{
  "reviewer": "codex | claude_design",
  "session_id": "TBD",
  "pass": "pass1_blind",
  "candidate_epoch": "TBD",
  "product_candidate_sha": "TBD",
  "build_id": "TBD",
  "blind_evidence_publication_sha": "TBD",
  "blind_release_index_sha": "TBD",
  "input_manifest_sha256": "TBD",
  "input_files": [],
  "output_files": [],
  "started_at_kst": "TBD",
  "frozen_at_kst": "TBD",
  "blind_contamination": "NONE | DETAILS",
  "marker": "PASS1_FROZEN"
}
```

## 3. Pass 2

1. 두 Pass 1 freeze의 marker, timestamp, hash를 확인한다.
2. 두 freeze의 `product_candidate_sha`와 `build_id`가 모두 같고 freeze 뒤 rebuild가 없음을 확인한다.
3. informed evidence도 asset commit A와 index commit B의 두 단계로 별도 게시하고 `informed_evidence_publication_sha`와 외부 coordinator record의 `informed_release_index_sha`를 고정한다.
4. reviewer별 fresh Pass 2 session을 만든다. 이전 대화와 inherited context를 쓰지 않는다.
5. reviewer에게 자신의 frozen Pass 1, informed direct allowlist, current evidence만 제공한다.
6. 다른 reviewer 결과는 제공하지 않는다.
7. 각 reviewer가 U01~U10 문제/해법을 분리하고 반증 quota를 채웠는지 확인한다.
8. 결과 파일을 hash하고 `PASS2_FROZEN`을 확인한다.

### Pass 2 freeze template

```json
{
  "reviewer": "codex | claude_design",
  "session_id": "TBD",
  "pass": "pass2_informed",
  "candidate_epoch": "TBD",
  "product_candidate_sha": "TBD",
  "build_id": "TBD",
  "own_pass1_freeze_sha256": "TBD",
  "informed_evidence_publication_sha": "TBD",
  "informed_release_index_sha": "TBD",
  "input_manifest_sha256": "TBD",
  "input_files": [],
  "output_files": [],
  "started_at_kst": "TBD",
  "frozen_at_kst": "TBD",
  "inherited_context": "NONE",
  "rebuild_since_pass1_freeze": false,
  "marker": "PASS2_FROZEN"
}
```

## 4. Contamination 처리

| 상황 | 처리 |
|---|---|
| Pass 1 reviewer가 informed 문서 또는 prior archive를 봄 | `BLIND_CONTAMINATED`; 새 세션·새 blind release로 재실행 |
| reviewer가 다른 reviewer 결과를 freeze 전에 봄 | 해당 pass 무효, 새 세션 재실행 |
| inherited context 존재 | 해당 pass 무효 |
| candidate/build/publication SHA mismatch | 해당 scenario가 아니라 전체 run `BLOCKED` |
| Pass 1 freeze 뒤 rebuild 실행 | 새 candidate epoch; blind evidence·두 Pass 1부터 재실행 |
| capture와 raw artifact hash mismatch | 해당 scenario `BLOCKED`, 재게시 |
| product tree dirty | 시작 금지 `NOT_READY` |
| 성능 evidence 없음 | `NOT_ASSESSED`; 추정 금지 |

## 5. 교차 종합

두 Pass 2가 동결된 뒤에만 Codex/Claude 결과를 교차한다. runtime/storage/artifact fact, static IA/visual finding, informed delta, disagreement, evidence gap, owner decision을 구분한다. 합의 자체는 증거가 아니다.
