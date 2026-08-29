import assert from "node:assert/strict";
import test from "node:test";

import {
  PROPERTY_REENTRY_CATALOG,
  PROPERTY_REENTRY_GROUPS,
  deriveExistingPropertyPresentation,
  planRenderedPropertyReentry,
} from "./property-reentry-simplicity.mjs";

const CATALOG_LINES = Object.freeze({
  date: "날짜",
  time: "시간",
  place: "장소",
  completion: "완료 기준",
  relativeDate: "상대 날짜",
  duration: "소요 시간",
  repeat: "반복",
  detail: "설명",
  condition: "실행 조건",
  resource: "자료",
  guide: "안내",
  caution: "주의",
  source: "출처",
  timezone: "시간대",
  repeatEnd: "반복 종료",
});

test("catalog · 15개 property label tap은 모두 빈 값 시작점으로 진입한다", () => {
  assert.deepEqual(
    Object.fromEntries(PROPERTY_REENTRY_CATALOG.map(({ key, label }) => [key, label])),
    CATALOG_LINES,
  );
  for (const [key, label] of Object.entries(CATALOG_LINES)) {
    const source = `- [ ] 확인\n  - ${label}: `;
    const lineStart = source.indexOf(`  - ${label}`);
    const result = planRenderedPropertyReentry({
      documentText: source,
      lineStart,
      displayText: label,
      displayOffset: 0,
    });
    assert.equal(result.status, "select", key);
    assert.equal(result.key, key);
    assert.equal(result.from, source.length);
    assert.equal(result.to, source.length);
    assert.equal(source.slice(lineStart, result.from), `  - ${label}: `);
  }
});

test("existing · label tap은 실제 값만 선택하고 raw 값 tap은 정확한 caret을 보존한다", () => {
  const source = "- [ ] 숙소 예약\n  - 장소: 제주공항 1층";
  const lineStart = source.indexOf("  - 장소");
  const valueStart = source.indexOf("제주공항");
  const labelTap = planRenderedPropertyReentry({
    documentText: source,
    lineStart,
    displayText: "장소  제주공항 1층",
    displayOffset: 1,
  });
  assert.equal(labelTap.status, "select");
  assert.deepEqual({ from: labelTap.from, to: labelTap.to }, {
    from: valueStart,
    to: source.length,
  });

  const valueTap = planRenderedPropertyReentry({
    documentText: source,
    lineStart,
    rawOffset: valueStart + 2,
  });
  assert.equal(valueTap.status, "select");
  assert.deepEqual({ from: valueTap.from, to: valueTap.to }, {
    from: valueStart + 2,
    to: valueStart + 2,
  });
});

test("display mapping · 표시 값과 raw 값이 같을 때만 rendered 값 위치를 raw caret으로 옮긴다", () => {
  const source = "- [ ] 숙소 예약\n  - 장소: 제주공항 1층";
  const lineStart = source.indexOf("  - 장소");
  const valueStart = source.indexOf("제주공항");
  const exact = planRenderedPropertyReentry({
    documentText: source,
    lineStart,
    displayText: "장소  제주공항 1층",
    displayOffset: "장소  제주".length,
  });
  assert.equal(exact.status, "select");
  assert.equal(exact.from, valueStart + 2);
  assert.equal(exact.to, valueStart + 2);

  const markdown = "- [ ] 숙소 예약\n  - 자료: [예약 페이지](https://example.com)";
  const markdownValueStart = markdown.indexOf("[예약");
  const protectedMapping = planRenderedPropertyReentry({
    documentText: markdown,
    lineStart: markdown.indexOf("  - 자료"),
    displayText: "자료  예약 페이지",
    displayOffset: "자료  예약".length,
  });
  assert.equal(protectedMapping.status, "select");
  assert.deepEqual({ from: protectedMapping.from, to: protectedMapping.to }, {
    from: markdownValueStart,
    to: markdown.length,
  });
});

test("line ending · CRLF의 carriage return은 값 selection에 포함하지 않는다", () => {
  const source = "- [ ] 첫 일\r\n  - 장소: 서울역\r\n- [ ] 다음 일";
  const lineStart = source.indexOf("  - 장소");
  const result = planRenderedPropertyReentry({
    documentText: source,
    lineStart,
    displayText: "장소  서울역",
    displayOffset: 0,
  });
  assert.equal(result.status, "select");
  assert.equal(source.slice(result.from, result.to), "서울역");
});

test("safety · unknown property와 stale lineStart는 successor가 처리하지 않는다", () => {
  const source = "- [ ] 확인\n  - 사용자 필드: 값";
  assert.equal(planRenderedPropertyReentry({
    documentText: source,
    lineStart: source.indexOf("사용자") - 4,
  }).status, "ignore");
  assert.equal(planRenderedPropertyReentry({
    documentText: source,
    lineStart: source.length + 1,
  }).status, "ignore");
});

test("menu · actual value와 빈 existing slot을 고정 예시 없이 구분한다", () => {
  assert.deepEqual(
    deriveExistingPropertyPresentation({ key: "place", value: "제주공항 1층" }),
    { title: "장소 · 수정", syntax: "장소: 제주공항 1층", status: "입력됨" },
  );
  assert.deepEqual(
    deriveExistingPropertyPresentation({ key: "place", value: "" }),
    { title: "장소 · 입력", syntax: "장소: 입력 전", status: "입력 전" },
  );
});

test("menu · more 9종은 새 단계 없이 세 presentation group으로 완전 분할된다", () => {
  assert.deepEqual(PROPERTY_REENTRY_GROUPS, [
    { label: "일정", keys: ["relativeDate", "duration", "repeat"] },
    { label: "실행 내용", keys: ["detail", "condition"] },
    { label: "참고·출처", keys: ["resource", "guide", "caution", "source"] },
  ]);
  assert.deepEqual(
    PROPERTY_REENTRY_GROUPS.flatMap(({ keys }) => keys).sort(),
    ["relativeDate", "duration", "repeat", "detail", "condition", "resource", "guide", "caution", "source"].sort(),
  );
});
