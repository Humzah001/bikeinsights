/**
 * YAxis width for Recharts `layout="vertical"` category axis.
 * Short labels (e.g. bike codes) should not reserve a wide band — that pushes bars right on mobile.
 */
export function verticalBarCategoryAxisWidth(
  labels: string[],
  mobile: boolean,
  options?: { maxDisplayChars?: number }
): number {
  const maxDisplay = options?.maxDisplayChars ?? (mobile ? 18 : 28);
  const lengths = labels.map((s) => {
    const t = String(s ?? "").trim();
    if (t.length === 0) return 1;
    const shown = Math.min(t.length, maxDisplay);
    return t.length > maxDisplay ? shown + 1 : shown;
  });
  const longest = lengths.length ? Math.max(...lengths) : 0;
  const pxPerChar = mobile ? 6.5 : 7.5;
  const padding = mobile ? 8 : 14;
  const minW = mobile ? 26 : 68;
  const maxW = mobile ? 96 : 126;
  return Math.round(Math.min(maxW, Math.max(minW, longest * pxPerChar + padding)));
}
