export type StructureType = 'timeline' | 'phase' | 'routine' | 'checklist';

export type ContentType = 'default' | 'meal_plan';

export type AnchorType = 'start_date' | 'end_date' | 'baby_age_month' | 'none';

export type FlowStatus = 'draft' | 'published';

export type RiskLevel =
  | 'low'
  | 'medium'
  | 'medical_sensitive'
  | 'financial_sensitive';

export type SourceType = 'official' | 'creator_experience' | 'reference';

export type SourceStatus = 'real' | 'preview' | 'needs_review';

export type SourcePrecision = 'exact' | 'broad';

export type PrimaryDestination = 'calendar' | 'sheet' | 'memo' | 'internal_check' | 'hybrid';

export type FlowItemLinkType = 'official' | 'reference' | 'tool' | 'creator';

export type FlowUser = {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string;
  avatar_initial: string;
  specialty_tags: string[];
  is_current_user?: boolean;
  source_url?: string;
  channel_type?: 'creator' | 'official' | 'brand' | 'community' | 'curation';
  is_preview_channel?: boolean;
};

export type FlowHoldSection = {
  title: string;
  reasons: string[];
  consequence: string;
  memo_template: string;
};

export type Flow = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  category: string;
  structure_type: StructureType;
  content_type?: ContentType;
  anchor_type: AnchorType;
  status: FlowStatus;
  source_title?: string;
  source_url?: string;
  source_status?: SourceStatus;
  source_precision?: SourcePrecision;
  primary_destination?: PrimaryDestination;
  setup_anchor_label?: string;
  setup_anchor_hint?: string;
  stop_conditions?: string[];
  principles?: string[];
  hold_section?: FlowHoldSection;
  source_checked_at?: string;
  conversion_note?: string;
  risk_level?: RiskLevel;
  created_at: string;
  updated_at: string;
  warning?: string;
  raw_text?: string;
  owner_user_id?: string;
  creator_name?: string;
  creator_role?: string;
  creator_note?: string;
  usage_count?: number;
  copy_count?: number;
  tags?: string[];
};

export type FlowSection = {
  id: string;
  flow_id: string;
  title: string;
  description?: string;
  order: number;
};

export type FlowItem = {
  id: string;
  flow_id: string;
  section_id?: string;
  title: string;
  description?: string;
  type: 'todo' | 'calendar';
  day_offset?: number;
  duration_days?: number;
  repeat_rule?: string;
  source_type?: SourceType;
  risk_level?: RiskLevel;
  hold_eligible?: boolean;
  photo_filename_pattern?: string;
  status?: 'ok' | 'check' | 'hold';
  order: number;
};

export type FlowItemDetail = {
  item_id: string;
  why?: string;
  how?: string;
  completion_criteria?: string;
  caution?: string;
  links?: {
    label: string;
    url: string;
    type: FlowItemLinkType;
  }[];
};

export type FlowItemState = {
  skipped?: boolean;
  note?: string;
};

export type FlowComparisonCandidate = {
  id: string;
  name: string;
};

export type FlowComparisonState = {
  candidates: FlowComparisonCandidate[];
  notes: Record<string, Record<string, string>>;
};

export type FlowWorkbenchOccurrenceState = {
  done?: boolean;
  note?: string;
};

export type FlowWorkbenchLogRow = Record<string, string>;

export type FlowWorkbenchState = {
  occurrences: Record<string, FlowWorkbenchOccurrenceState>;
  logRows: Record<string, FlowWorkbenchLogRow>;
  memoCards: Record<string, string>;
  weeklyReview?: string;
};

export type MealSlot = {
  id: string;
  flow_id: string;
  section_id?: string;
  recipe_id: string;
  day_offset: number;
  duration_days: number;
  menu_title: string;
  new_ingredients: string[];
  allergy_watch_days?: number;
  order: number;
};

export type Recipe = {
  id: string;
  flow_id: string;
  title: string;
  description?: string;
  ingredients: {
    name: string;
    amount?: string;
    unit?: string;
    note?: string;
    is_new_for_baby?: boolean;
    allergy_watch?: boolean;
  }[];
  steps: {
    order: number;
    text: string;
  }[];
  texture_note?: string;
  ratio_note?: string;
  yield_note?: string;
  storage_note?: string;
  tool_note?: string;
  caution_note?: string;
  source_type: SourceType;
  risk_level: 'medical_sensitive';
};

export type FlowBundle = {
  flow: Flow;
  sections: FlowSection[];
  items: FlowItem[];
  itemDetails?: FlowItemDetail[];
  mealSlots?: MealSlot[];
  recipes?: Recipe[];
  repeatRules?: string[];
  warnings?: string[];
};

export type ReactionLog = {
  amount?: string;
  fedAt?: string;
  skin?: string;
  vomitingOrDiarrhea?: string;
  stool?: string;
  sleep?: string;
  preferenceNote?: string;
};
