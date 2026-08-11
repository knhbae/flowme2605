import type {
  AuthoringIssueOutcome,
  AuthoringIssueState,
  UnresolvedAuthoringIssue,
} from "./types";

const STRUCTURAL_ISSUE_TYPES = new Set<UnresolvedAuthoringIssue["type"]>([
  "unsupported_syntax",
  "unknown_property",
  "unsupported_nested_item",
  "ambiguous_role",
  "missing_parent",
]);

export function authoringIssueState(
  issue: UnresolvedAuthoringIssue,
): AuthoringIssueState {
  if (issue.decision) return issue.decision.state;
  return issue.resolution ? "resolved" : "open";
}

export function isAuthoringIssueOutstanding(
  issue: UnresolvedAuthoringIssue,
): boolean {
  if (
    !issue.decision &&
    issue.messageKey === "authoring.ambiguous_plain_sentence" &&
    !issue.blocking
  ) {
    return false;
  }
  return authoringIssueState(issue) !== "resolved";
}

export function authoringIssueBlocksDraft(
  issue: UnresolvedAuthoringIssue,
): boolean {
  return issue.blocking && isAuthoringIssueOutstanding(issue);
}

export function allowedAuthoringIssueOutcomes(
  issue: UnresolvedAuthoringIssue,
): AuthoringIssueOutcome[] {
  const state = authoringIssueState(issue);
  if (state === "resolved") return [];

  const outcomes: AuthoringIssueOutcome[] = [];
  if (STRUCTURAL_ISSUE_TYPES.has(issue.type)) {
    outcomes.push("keep_source_only");
    if (issue.options.includes("item")) outcomes.push("convert_to_item");
  }
  if (state === "open") outcomes.push("hold");
  return outcomes;
}
