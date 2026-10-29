import { describe, expect, it } from 'vitest';
import { numberFontSize } from './numberSize';

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
