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

/** The sizes the number steps through, largest first. */
export const NUMBER_SIZES = [36, 30, 24, 20] as const;

/**
 * Starting from `size`, steps down through NUMBER_SIZES until `fits(size)` is
 * true, stopping at the smallest. Character counts only estimate width; this
 * is what makes a digit-only number actually fit the field.
 */
export function shrinkToFit(size: number, fits: (size: number) => boolean): number {
  let index = Math.max(0, NUMBER_SIZES.indexOf(size as (typeof NUMBER_SIZES)[number]));
  while (!fits(NUMBER_SIZES[index]) && index < NUMBER_SIZES.length - 1) index += 1;
  return NUMBER_SIZES[index];
}
