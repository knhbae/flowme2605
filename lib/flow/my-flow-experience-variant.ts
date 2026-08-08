export const MY_FLOW_EXPERIENCE_QUERY_KEY = 'myFlowExperience' as const;

export const MY_FLOW_CLASSIC_EXPERIENCE = 'classic' as const;
export const MY_FLOW_R3A_LAB_EXPERIENCE = 'r3a-lab' as const;

export type MyFlowExperienceVariant =
  | typeof MY_FLOW_CLASSIC_EXPERIENCE
  | typeof MY_FLOW_R3A_LAB_EXPERIENCE;

export function resolveMyFlowExperienceVariant(
  search: string,
): MyFlowExperienceVariant {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const requested = new URLSearchParams(query).get(MY_FLOW_EXPERIENCE_QUERY_KEY);
  return requested === MY_FLOW_R3A_LAB_EXPERIENCE
    ? MY_FLOW_R3A_LAB_EXPERIENCE
    : MY_FLOW_CLASSIC_EXPERIENCE;
}
