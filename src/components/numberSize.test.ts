import { describe, expect, it } from 'vitest';
import { numberFontSize, shrinkToFit } from './numberSize';

describe('numberFontSize', () => {
  it.each([
    ['', 36],
    ['226 555 0142', 36],
    ['+1 226 555 0142', 30],
    ['011 44 20 7946 0958', 24],
    ['sip:2001@test.mosaicvoice.net', 20],
  ])('"%s" renders at %ipx', (value, px) => {
    expect(numberFontSize(value)).toBe(px);
  });
});

describe('shrinkToFit', () => {
  it('keeps the size when it fits', () => {
    expect(shrinkToFit(36, () => true)).toBe(36);
  });

  it('steps down to the first size that fits', () => {
    expect(shrinkToFit(36, (size) => size <= 24)).toBe(24);
  });

  it('stops at the smallest size even if nothing fits', () => {
    expect(shrinkToFit(30, () => false)).toBe(20);
  });
});
