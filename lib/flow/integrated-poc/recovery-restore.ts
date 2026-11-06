/**
 * 복구함 › 새 문서로 복구 (P3, 11/7). Kept input can hold lines the writing grammar refuses to store as they are, such as an
 * unfinished '- [' (vendor text model: invalid-progress-token). Such input still goes into a new document with no
 * character changed: the whole text between fence lines, whose lines the grammar keeps as written. The fence is longer
 * than any backtick run that starts a line of the text, so no line of it can close the fence early. Nothing is fixed.
 */
export function programFencedRecoveryRaw(raw: string): string {
  const text = raw.replace(/\r\n?/g, '\n');
  const longest = Math.max(2, ...text.split('\n').map(line => /^ *(`+)/.exec(line)?.[1].length ?? 0));
  const fence = '`'.repeat(longest + 1);
  return `${fence}\n${text}\n${fence}`;
}
