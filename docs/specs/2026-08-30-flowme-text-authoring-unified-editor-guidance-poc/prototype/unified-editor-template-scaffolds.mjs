export const UNIFIED_EDITOR_EMPTY_SOURCE_FINGERPRINT = "raw-v1:0:0ztntfp";

const RECURRING_SCAFFOLD = "# \n- 기준일: \n\n## \n- [ ] \n  - 반복: \n  - 반복 종료: ";
const MOVING_SCAFFOLD = "# \n- 기준일: \n\n## \n- [ ] \n  - 상대 날짜: ";
const WEDDING_SCAFFOLD = `${MOVING_SCAFFOLD}\n  - 자료: `;
const TRAVEL_SCAFFOLD = "# \n- 기준일: \n\n## \n- [ ] \n  - 상대 날짜: \n\n## \n- [ ] \n  - 날짜: \n  - 시간: \n  - 시간대: \n  - 장소: ";
const EXAM_SCAFFOLD = "# \n- 기준일: \n\n- [ ] \n  - 반복: \n  - 반복 종료: \n  - 완료 기준: \n\n- [ ] \n  - 날짜: ";

function freezeHints(hints) {
  return Object.freeze(hints.map((hint) => Object.freeze({ ...hint })));
}

function freezeTemplate(option) {
  return Object.freeze({
    ...option,
    hints: freezeHints(option.hints),
  });
}

/**
 * Versioned successor-local snapshot of the six approved structural TXT
 * scaffolds. Example hints are presentation-only and never enter source bytes.
 */
export const UNIFIED_EDITOR_TEMPLATE_OPTIONS = Object.freeze([
  freezeTemplate({
    templateId: "exercise-phased-4w-v1",
    label: "단계별 반복",
    structureLabel: "단계마다 기간과 반복할 일이 달라요",
    description: "예: 4주 운동 적응",
    scaffold: RECURRING_SCAFFOLD,
    hints: [
      { line: 1, kind: "flow-title", text: "예: 나의 4주 운동" },
      { line: 4, kind: "step-title", text: "예: 1주차 적응" },
      { line: 5, kind: "item-title", text: "예: 가볍게 걷기" },
    ],
  }),
  freezeTemplate({
    templateId: "exercise-weekly-repeat-v1",
    label: "같은 일정 반복",
    structureLabel: "정한 기간 동안 같은 일정으로 반복해요",
    description: "예: 주간 운동 루틴",
    scaffold: RECURRING_SCAFFOLD,
    hints: [
      { line: 1, kind: "flow-title", text: "예: 주 3회 운동" },
      { line: 4, kind: "step-title", text: "예: 기본 루틴" },
      { line: 5, kind: "item-title", text: "예: 전신 운동" },
    ],
  }),
  freezeTemplate({
    templateId: "moving-dday-v1",
    label: "기준일 전후 준비",
    structureLabel: "한 날짜를 기준으로 앞뒤 할 일을 적어요",
    description: "예: 이사 준비",
    scaffold: MOVING_SCAFFOLD,
    hints: [
      { line: 1, kind: "flow-title", text: "예: 새집 이사 준비" },
      { line: 4, kind: "step-title", text: "예: 계약 전" },
      { line: 5, kind: "item-title", text: "예: 계약서 확인" },
    ],
  }),
  freezeTemplate({
    templateId: "wedding-dday-v1",
    label: "기준일 전후 준비 + 자료",
    structureLabel: "앞뒤 할 일과 참고 링크를 함께 적어요",
    description: "예: 결혼 준비",
    scaffold: WEDDING_SCAFFOLD,
    hints: [
      { line: 1, kind: "flow-title", text: "예: 우리 결혼 준비" },
      { line: 4, kind: "step-title", text: "예: 예식장 계약" },
      { line: 5, kind: "item-title", text: "예: 계약 조건 비교" },
      { line: 7, kind: "property-value", text: "예: https://example.com" },
    ],
  }),
  freezeTemplate({
    templateId: "travel-itinerary-prep-v1",
    label: "준비 + 날짜별 일정",
    structureLabel: "사전 준비와 날짜별 시간·장소를 함께 적어요",
    description: "예: 여행 준비와 날짜별 일정",
    scaffold: TRAVEL_SCAFFOLD,
    hints: [
      { line: 1, kind: "flow-title", text: "예: 첫 도쿄 여행" },
      { line: 4, kind: "step-title", text: "예: 출발 전 준비" },
      { line: 5, kind: "item-title", text: "예: 여권 확인" },
      { line: 8, kind: "step-title", text: "예: 첫째 날" },
      { line: 9, kind: "item-title", text: "예: 공항에서 숙소로 이동" },
      { line: 13, kind: "location", text: "예: 하네다공항" },
    ],
  }),
  freezeTemplate({
    templateId: "exam-dday-study-v1",
    label: "반복 준비 + 목표일",
    structureLabel: "반복할 일과 마지막 일정을 함께 적어요",
    description: "예: 시험 준비",
    scaffold: EXAM_SCAFFOLD,
    hints: [
      { line: 1, kind: "flow-title", text: "예: 자격시험 준비" },
      { line: 4, kind: "item-title", text: "예: 기출문제 풀기" },
      { line: 9, kind: "item-title", text: "예: 시험 응시" },
    ],
  }),
]);

const templateById = new Map(
  UNIFIED_EDITOR_TEMPLATE_OPTIONS.map((option) => [option.templateId, option]),
);

export function createUnifiedEditorTemplateDraft(templateId) {
  const option = templateById.get(String(templateId ?? ""));
  if (!option) {
    throw new RangeError(`Unknown unified-editor template: ${String(templateId ?? "")}`);
  }
  return Object.freeze({
    templateId: option.templateId,
    label: option.label,
    structureLabel: option.structureLabel,
    text: option.scaffold,
    hints: option.hints,
    sourceFingerprint: UNIFIED_EDITOR_EMPTY_SOURCE_FINGERPRINT,
  });
}
