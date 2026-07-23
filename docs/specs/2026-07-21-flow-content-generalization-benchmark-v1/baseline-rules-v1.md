# Frozen baseline rules v1

동결 시점: 2026-07-21 · 새 benchmark URL 검색 전

## Source fingerprints

| Baseline source | SHA-256 |
| --- | --- |
| `generation-prompt-v2.3.md` | `f88d4e45f20bd6abef317e3a1363c770e67211daff9831608dc5316ff88a4eeb` |
| `output-envelope-v2.schema.json` | `bd3a7aa15f7d37f37688471c69956a0467356cd6bbbb88950fd61c2f0800c306` |
| `taxonomy-v1.1.json` | `5b910bab49d8c96cd160a52fb790af1585c4b2015d8e3fdd05df544ac8fb5d3c` |
| `input-composer-contract-v1.json` | `a3d457799a2c1a680a004290938fe0d5817f141ab601602b0d20ee468c80da83` |
| `source-to-flow-conversion-gate.md` | `b1a96608a498355a0b34a19a5a5eee5c8c5afcade7e7226b6f0dab62192e10fd` |

이 문서는 위 규칙의 benchmark용 합성본이다. 새 사례별 예외는 없다.

## 1. Source completeness와 disposition

- `complete`: bounded user job에 필요한 실행 행이 모두 확보됨.
- `partial`: 일부 행은 있으나 알려진 필수 경계가 빠짐.
- `metadata_only`: 제목·횟수·기간·phase 이름만 있고 실행 행이 없음.
- `missing`: usable SourceRow가 없음.

우선순위:

1. missing/unreadable/paywall + 0 rows → `source_import_required`, canonical 없음.
2. partial/metadata-only + plausible job → `source_import_required`, canonical 없음.
3. marketing/narrative metadata + executable job 없음 → `hold`, canonical 없음.
4. complete rows → internal proposal 가능. Rights/safety/locale/privacy는 public export를 막아도 source-backed internal draft를 삭제하지 않는다.

## 2. SourceRow 역할

모든 acquired row는 정확히 하나를 갖는다.

- `item`: 의도적으로 실행·결정·기록·소비하며 완료를 관찰할 수 있음.
- `field`: 일정·정렬·필터·projection 또는 retained state에 필요한 값.
- `memo`: 함께 보존해야 하는 맥락·근거·상세.
- `reference`: 규칙·주의·범위·설명처럼 참조하지만 완료하지 않는 사실.
- `conditional_response`: 명시된 trigger 때만 활성화되는 대응.
- `omission`: missing boundary 또는 의도적으로 제외한 행.

경고, 임계값, 제목, 범주명, 누락 표시를 일반 체크 Item으로 만들지 않는다.

## 3. Canonical Item

```text
Item = intent + action-first title + detail + observable completion
     + optional schedule/location/fields/conditions/sourceRefs
```

- `intent`: `action`, `decision`, `record`, `consume`.
- source-backed Item은 1개 이상의 SourceRow를 참조한다.
- source fact를 title 수를 늘리기 위해 쪼개지 않는다.
- 일정은 source가 정의하거나 사용자 anchor로 계산될 때만 둔다.
- 조건 발생은 날짜 반복이 아니다.

## 4. 네 분류 축

- `primaryLifeArea`: 사용자가 관리하는 삶의 대상.
- `sourceShape`: acquired row의 semantic anatomy.
- `primaryExecutionPattern`: 사용자가 유지해야 하는 state transition.
- `primaryArtifact`: 내일 다시 시작하는 데 필요한 한 가지 retained result.

각 축은 독립 판정한다. `hybrid`는 금지하고 secondaryArtifacts로 표현한다.

## 5. 최소 입력

- source에서 아는 값은 다시 묻지 않는다.
- 첫 useful preview 전 사용자 입력은 기본 0, 일반 최대 2.
- 허용: anchor/start date, source가 요구하는 owned object/phase, 실제 사용자 선택.
- source URL/file 자체는 creator/source acquisition payload이며 consumer personalization과 분리한다.
- 실행 status, memo, last position은 첫 preview 이후 overlay다.

## 6. Projection

- Calendar/ICS: 확정된 날짜·시간·기간·반복이 있는 Item만 event 1:1.
- Checklist: 한 번의 bounded unit에서 빠뜨리지 않을 source-derived check.
- Todo: 독립 next action 또는 비날짜 trigger action.
- Sheet: 많은 stable rows의 status/position/value가 세션 간 유지될 때.
- Memo: 비교 이유, 조건, 경고, 연락·근거·source context가 함께 남아야 할 때.
- 각 projection은 `primary`, `secondary`, `fallback`, `blocked`, `not_applicable` 중 하나다.
- blocked/not_applicable projection에 payload를 만들지 않는다.

## 7. 독립 gates

각 사례는 다음을 별도 기록한다.

- discovery/access와 acquired scope
- rights basis, allowed use, review status
- locale/applicability
- safety review
- privacy review
- freshness review
- public export allowed
- personal internal preview allowed

권리 제한과 source 부족을 같은 blocker로 합치지 않는다.

## 8. Calibration 수정 규칙

- Calibration 12건에서 가장 빈번하거나 위험한 공통 defect class 1개만 수정한다.
- 사례명, URL, provider명, topic명을 조건으로 쓰지 않는다.
- revised rules는 별도 파일과 hash로 보존한다.
- Final holdout packet을 연 뒤에는 prompt/rules/schema를 수정하지 않는다.
