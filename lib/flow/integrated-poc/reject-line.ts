/** The raw with a refused line put back, against the last accepted raw. A line the edit changed gets
 * its saved text again; a line the edit added goes away. When the refused line lies outside the edited
 * part (an untouched line refused because of an edit elsewhere), the whole edited part goes back.
 * Null when nothing would change. */
export function revertRefusedLine(accepted: string, refused: string, index: number): { raw: string; scope: 'line' | 'block' } | null {
  const before = accepted.split('\n'), after = refused.split('\n');
  if (!Number.isInteger(index) || index < 0 || index >= after.length) return null;
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let endBefore = before.length, endAfter = after.length;
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) { endBefore--; endAfter--; }
  let lines: string[], scope: 'line' | 'block';
  if (index >= start && index < endAfter) {
    lines = after.slice(); scope = 'line';
    const offset = index - start;
    if (offset < endBefore - start) lines[index] = before[start + offset]; else lines.splice(index, 1);
  } else {
    lines = [...after.slice(0, start), ...before.slice(start, endBefore), ...after.slice(endAfter)]; scope = 'block';
  }
  const raw = lines.join('\n');
  return raw === refused ? null : { raw, scope };
}
