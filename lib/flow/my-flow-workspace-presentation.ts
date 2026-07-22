export function selectMyFlowNextActionRow<TRow extends { date?: string }>(
  rows: TRow[],
  isCompleted: (row: TRow) => boolean,
  resolveDate: (row: TRow) => string | undefined,
): TRow | undefined {
  return rows
    .map((row, sourceIndex) => ({
      row,
      sourceIndex,
      effectiveDate: resolveDate(row),
    }))
    .filter(({ row }) => !isCompleted(row))
    .sort((left, right) => {
      if (left.effectiveDate && right.effectiveDate) {
        const dateOrder = left.effectiveDate.localeCompare(right.effectiveDate);
        if (dateOrder !== 0) return dateOrder;
      } else if (left.effectiveDate) {
        return -1;
      } else if (right.effectiveDate) {
        return 1;
      }
      return left.sourceIndex - right.sourceIndex;
    })
    .map(({ row, effectiveDate }) => ({ ...row, date: effectiveDate }))
    [0];
}
