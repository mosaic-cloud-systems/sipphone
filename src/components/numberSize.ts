/**
 * Font size, in px, for the dialled number so it never wraps: the longer the
 * string, the smaller the type.
 */
export function numberFontSize(value: string): number {
  const length = value.length;
  if (length <= 12) return 36;
  if (length <= 16) return 30;
  if (length <= 22) return 24;
  return 20;
}
